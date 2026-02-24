import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, AlertTriangle, Database, RefreshCw, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface TableInfo {
  name: string;
  displayName: string;
  displayNameTamil: string;
  count: number;
  description: string;
}

const AVAILABLE_TABLES: Omit<TableInfo, "count">[] = [
  { name: "donations", displayName: "Donations", displayNameTamil: "நன்கொடைகள்", description: "All donation records" },
  { name: "mahal_bookings", displayName: "Mahal Bookings", displayNameTamil: "மஹால் முன்பதிவுகள்", description: "Hall booking records" },
  { name: "grievances", displayName: "Grievances", displayNameTamil: "புகார்கள்", description: "Community grievances" },
  { name: "events", displayName: "Events", displayNameTamil: "நிகழ்வுகள்", description: "Community events" },
  { name: "event_registrations", displayName: "Event Registrations", displayNameTamil: "நிகழ்வு பதிவுகள்", description: "Event registration records" },
  { name: "gb_members", displayName: "Members", displayNameTamil: "உறுப்பினர்கள்", description: "Community members" },
  { name: "gb_family_members", displayName: "Family Members", displayNameTamil: "குடும்ப உறுப்பினர்கள்", description: "Member family records" },
  { name: "gallery_images", displayName: "Gallery Images", displayNameTamil: "படக்காட்சி", description: "Photo gallery images" },
  { name: "announcements", displayName: "Announcements", displayNameTamil: "அறிவிப்புகள்", description: "Community announcements" },
  { name: "income", displayName: "Income", displayNameTamil: "வருமானம்", description: "Income records" },
  { name: "expenses", displayName: "Expenses", displayNameTamil: "செலவுகள்", description: "Expense records" },
  { name: "subscriptions", displayName: "Subscriptions", displayNameTamil: "சந்தாக்கள்", description: "Member subscriptions" },
  { name: "subscription_slots", displayName: "Subscription Slots", displayNameTamil: "சந்தா இடங்கள்", description: "Monthly subscription slots" },
  { name: "marriage_registers", displayName: "Marriage Registers", displayNameTamil: "திருமண பதிவேடுகள்", description: "Marriage registration records" },
  { name: "death_registers", displayName: "Death Registers", displayNameTamil: "இறப்பு பதிவேடுகள்", description: "Death registration records" },
  { name: "heir_certificates", displayName: "Heir Certificates", displayNameTamil: "வாரிசு சான்றிதழ்கள்", description: "Heir certificate requests" },
  { name: "noc_certificates", displayName: "NOC Certificates", displayNameTamil: "NOC சான்றிதழ்கள்", description: "NOC certificate requests" },
  { name: "certificate_payments", displayName: "Certificate Payments", displayNameTamil: "சான்றிதழ் கட்டணங்கள்", description: "Certificate payment records" },
  { name: "refund_requests", displayName: "Refund Requests", displayNameTamil: "பணம் திரும்ப கோரிக்கைகள்", description: "Refund request records" },
  { name: "admin_notifications", displayName: "Admin Notifications", displayNameTamil: "நிர்வாக அறிவிப்புகள்", description: "Admin notification records" },
  { name: "page_visits", displayName: "Page Visits", displayNameTamil: "பக்க வருகைகள்", description: "Website visitor analytics" },
  { name: "pending_users", displayName: "Pending Users", displayNameTamil: "நிலுவையில் உள்ள பயனர்கள்", description: "Pending user registrations" },
  { name: "quran_bookmarks", displayName: "Quran Bookmarks", displayNameTamil: "குர்ஆன் புக்மார்க்குகள்", description: "User Quran bookmarks" },
  { name: "landing_page_content", displayName: "Landing Page Content", displayNameTamil: "முகப்பு பக்க உள்ளடக்கம்", description: "Homepage content" },
  { name: "management_committee", displayName: "Management Committee", displayNameTamil: "நிர்வாகக் குழு", description: "Committee members" },
];

const DataManagementTab = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
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

        if (!error) {
          tableInfos.push({
            ...table,
            count: count || 0,
          });
        }
      } catch {
        tableInfos.push({
          ...table,
          count: 0,
        });
      }
    }

    setTables(tableInfos);
    setLoading(false);
  };

  const handleSelectAll = () => {
    if (selectedTables.length === tables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(tables.map((t) => t.name));
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableName)
        ? prev.filter((t) => t !== tableName)
        : [...prev, tableName]
    );
  };

  const handleDeleteClick = () => {
    if (selectedTables.length === 0) {
      toast({
        title: "தேர்வு இல்லை (No Selection)",
        description: "Please select at least one table to delete records from.",
        variant: "destructive",
      });
      return;
    }
    setConfirmText("");
    setShowConfirmDialog(true);
  };

  const executeDelete = async () => {
    if (confirmText !== "DELETE") {
      toast({
        title: "உறுதிப்படுத்தல் தேவை (Confirmation Required)",
        description: "Please type DELETE to confirm.",
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const tableName of selectedTables) {
      try {
        // Delete all records from the table
        const { error } = await supabase
          .from(tableName as any)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000"); // This condition matches all UUIDs

        if (error) {
          console.error(`Error deleting from ${tableName}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error deleting from ${tableName}:`, error);
        errorCount++;
      }
    }

    setDeleting(false);
    setShowConfirmDialog(false);
    setSelectedTables([]);
    setConfirmText("");

    if (successCount > 0) {
      toast({
        title: "நீக்கம் வெற்றி (Deletion Successful)",
        description: `Successfully deleted records from ${successCount} table(s).${errorCount > 0 ? ` Failed for ${errorCount} table(s).` : ""}`,
      });
    } else {
      toast({
        title: "நீக்கம் தோல்வி (Deletion Failed)",
        description: "Failed to delete records. Please try again.",
        variant: "destructive",
      });
    }

    // Refresh counts
    fetchTableCounts();
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
      toast({ title: "No Selection", description: "Please select at least one table.", variant: "destructive" });
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
        const { data, error } = await supabase
          .from(tableName as any)
          .select("*");

        if (error) {
          sqlParts.push(`-- ERROR exporting ${tableName}: ${error.message}`);
          continue;
        }

        if (!data || data.length === 0) {
          sqlParts.push(`-- ${tableName}: No records`);
          sqlParts.push("");
          continue;
        }

        sqlParts.push(`-- ${tableName}: ${data.length} records`);

        const columns = Object.keys(data[0]);
        const colList = columns.map((c) => `"${c}"`).join(", ");

        for (const row of data) {
          const values = columns.map((col) => escapeSQL(row[col])).join(", ");
          sqlParts.push(
            `INSERT INTO public."${tableName}" (${colList}) VALUES (${values}) ON CONFLICT ("id") DO UPDATE SET ${columns
              .filter((c) => c !== "id")
              .map((c) => `"${c}" = EXCLUDED."${c}"`)
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

      toast({ title: "SQL Exported", description: `Exported ${selectedTables.length} table(s) as SQL file.` });
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message || "Failed to export SQL.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const totalRecords = tables.reduce((sum, t) => sum + t.count, 0);
  const selectedRecords = tables
    .filter((t) => selectedTables.includes(t.name))
    .reduce((sum, t) => sum + t.count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
            <div>
              <h3 className="font-semibold text-destructive text-lg">
                எச்சரிக்கை: தரவு நீக்கம் (Warning: Data Deletion)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                This feature permanently deletes ALL records from selected tables. 
                This action cannot be undone. Please ensure you have a backup before proceeding.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{tables.length}</div>
                <p className="text-sm text-muted-foreground">Available Tables</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Trash2 className="h-8 w-8 text-amber-600" />
              <div>
                <div className="text-2xl font-bold text-amber-600">{selectedTables.length}</div>
                <p className="text-sm text-muted-foreground">Selected Tables</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold text-destructive">{selectedRecords.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Records to Delete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={handleSelectAll}>
          {selectedTables.length === tables.length ? "Deselect All" : "Select All"}
        </Button>
        <Button variant="outline" onClick={fetchTableCounts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Counts
        </Button>
        <Button
          variant="secondary"
          onClick={handleExportSql}
          disabled={selectedTables.length === 0 || exporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exporting..." : `Export SQL (${selectedTables.length})`}
        </Button>
        <Button
          variant="destructive"
          onClick={handleDeleteClick}
          disabled={selectedTables.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Selected ({selectedTables.length})
        </Button>
      </div>

      {/* Table List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Tables
          </CardTitle>
          <CardDescription>
            Select tables to delete all records. Total records: {totalRecords.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedTables.includes(table.name)
                      ? "border-destructive bg-destructive/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => handleTableSelect(table.name)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedTables.includes(table.name)}
                      onCheckedChange={() => handleTableSelect(table.name)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{table.displayName}</h4>
                        <Badge variant="secondary" className="font-tamil">
                          {table.displayNameTamil}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{table.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={table.count > 0 ? "default" : "outline"}>
                          {table.count.toLocaleString()} records
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              உறுதிப்படுத்தவும் (Confirm Deletion)
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                You are about to permanently delete <strong>{selectedRecords.toLocaleString()}</strong> records 
                from <strong>{selectedTables.length}</strong> table(s):
              </p>
              <div className="max-h-32 overflow-y-auto">
                <ul className="list-disc list-inside text-sm space-y-1">
                  {selectedTables.map((tableName) => {
                    const table = tables.find((t) => t.name === tableName);
                    return (
                      <li key={tableName}>
                        {table?.displayName} ({table?.count.toLocaleString()} records)
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="pt-4">
                <p className="font-medium text-destructive mb-2">
                  Type "DELETE" to confirm this action:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE"
                  className="border-destructive"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={confirmText !== "DELETE" || deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Records
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DataManagementTab;
