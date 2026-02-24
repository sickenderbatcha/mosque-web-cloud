import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, Database, RefreshCw, FileCode } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TableInfo {
  name: string;
  displayName: string;
  count: number;
}

const AVAILABLE_TABLES = [
  { name: "admin_notifications", displayName: "Admin Notifications" },
  { name: "admin_pdf_documents", displayName: "PDF Documents" },
  { name: "announcements", displayName: "Announcements" },
  { name: "app_settings", displayName: "App Settings" },
  { name: "booking_otp_tokens", displayName: "Booking OTP Tokens" },
  { name: "cash_payment_requests", displayName: "Cash Payment Requests" },
  { name: "certificate_payments", displayName: "Certificate Payments" },
  { name: "death_registers", displayName: "Death Registers" },
  { name: "donations", displayName: "Donations" },
  { name: "event_registrations", displayName: "Event Registrations" },
  { name: "events", displayName: "Events" },
  { name: "expenses", displayName: "Expenses" },
  { name: "gallery_images", displayName: "Gallery Images" },
  { name: "gb_family_members", displayName: "Family Members" },
  { name: "gb_members", displayName: "Members" },
  { name: "grievances", displayName: "Grievances" },
  { name: "heir_certificates", displayName: "Heir Certificates" },
  { name: "income", displayName: "Income" },
  { name: "issued_documents", displayName: "Issued Documents" },
  { name: "landing_page_content", displayName: "Landing Page Content" },
  { name: "mahal_bookings", displayName: "Mahal Bookings" },
  { name: "management_committee", displayName: "Management Committee" },
  { name: "marriage_registers", displayName: "Marriage Registers" },
  { name: "noc_certificates", displayName: "NOC Certificates" },
  { name: "outside_marriage_registers", displayName: "Outside Marriage Registers" },
  { name: "page_visits", displayName: "Page Visits" },
  { name: "password_reset_tokens", displayName: "Password Reset Tokens" },
  { name: "pending_users", displayName: "Pending Users" },
  { name: "profiles", displayName: "Profiles" },
  { name: "quran_bookmarks", displayName: "Quran Bookmarks" },
  { name: "refund_requests", displayName: "Refund Requests" },
  { name: "subscription_slots", displayName: "Subscription Slots" },
  { name: "subscriptions", displayName: "Subscriptions" },
  { name: "user_roles", displayName: "User Roles" },
];

const SqlExportCard = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchTableCounts();
  }, []);

  const fetchTableCounts = async () => {
    setLoading(true);
    const tableInfos: TableInfo[] = [];
    for (const table of AVAILABLE_TABLES) {
      try {
        const { count, error } = await supabase
          .from(table.name as any)
          .select("*", { count: "exact", head: true });
        tableInfos.push({ ...table, count: error ? 0 : (count || 0) });
      } catch {
        tableInfos.push({ ...table, count: 0 });
      }
    }
    setTables(tableInfos);
    setLoading(false);
  };

  const handleSelectAll = () => {
    setSelectedTables(prev =>
      prev.length === tables.length ? [] : tables.map(t => t.name)
    );
  };

  const handleTableSelect = (name: string) => {
    setSelectedTables(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  };

  const escapeSQL = (val: any): string => {
    if (val === null || val === undefined) return "NULL";
    if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
    if (typeof val === "number") return String(val);
    if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const handleExportSql = async () => {
    if (selectedTables.length === 0) {
      toast.error("Please select at least one table.");
      return;
    }

    setExporting(true);
    try {
      const sqlParts: string[] = [
        `-- SQL Export generated on ${new Date().toISOString()}`,
        `-- Tables: ${selectedTables.join(", ")}`,
        "",
      ];

      for (const tableName of selectedTables) {
        const { data, error } = await supabase.from(tableName as any).select("*");

        if (error) {
          sqlParts.push(`-- ERROR exporting ${tableName}: ${error.message}`);
          continue;
        }
        if (!data || data.length === 0) {
          sqlParts.push(`-- ${tableName}: No records`, "");
          continue;
        }

        sqlParts.push(`-- ${tableName}: ${data.length} records`);
        const columns = Object.keys(data[0]);
        const colList = columns.map(c => `"${c}"`).join(", ");

        for (const row of data) {
          const values = columns.map(col => escapeSQL(row[col])).join(", ");
          sqlParts.push(
            `INSERT INTO public."${tableName}" (${colList}) VALUES (${values}) ON CONFLICT ("id") DO UPDATE SET ${columns
              .filter(c => c !== "id")
              .map(c => `"${c}" = EXCLUDED."${c}"`)
              .join(", ")};`
          );
        }
        sqlParts.push("");
      }

      const sqlContent = sqlParts.join("\n");
      const blob = new Blob([sqlContent], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `masjid-export-${dateStr}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${selectedTables.length} table(s) as SQL file.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to export SQL.");
    } finally {
      setExporting(false);
    }
  };

  const selectedRecords = tables
    .filter(t => selectedTables.includes(t.name))
    .reduce((sum, t) => sum + t.count, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <FileCode className="h-5 w-5 text-primary flex-shrink-0" />
          <span>Export as SQL</span>
        </CardTitle>
        <CardDescription>
          Select tables and export their data as SQL INSERT statements for manual restoration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {selectedTables.length === tables.length ? "Deselect All" : "Select All"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchTableCounts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleExportSql}
            disabled={selectedTables.length === 0 || exporting}
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : `Export SQL (${selectedTables.length})`}
          </Button>
          {selectedTables.length > 0 && (
            <Badge variant="secondary">{selectedRecords.toLocaleString()} records</Badge>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {tables.map(table => (
              <div
                key={table.name}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedTables.includes(table.name)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => handleTableSelect(table.name)}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedTables.includes(table.name)}
                    onCheckedChange={() => handleTableSelect(table.name)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{table.displayName}</p>
                    <p className="text-xs text-muted-foreground">{table.count} records</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SqlExportCard;
