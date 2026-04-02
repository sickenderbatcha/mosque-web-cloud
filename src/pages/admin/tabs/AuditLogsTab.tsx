import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, ClipboardList, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import TablePagination from "@/components/admin/TablePagination";

interface AuditLog {
  id: string;
  performed_by: string;
  action_type: string;
  action_description: string;
  target_table: string | null;
  target_id: string | null;
  target_details: Record<string, unknown> | null;
  created_at: string;
  admin_name?: string;
}

const ACTION_TYPE_COLORS: Record<string, string> = {
  approve_user: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  reject_user: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  delete_user: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  reset_password: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  promote_admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  demote_admin: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  create_user: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  update_member: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  add_member: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  delete_member: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  approve_booking: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  reject_booking: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  approve_certificate: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update_settings: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  grant_permission: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  revoke_permission: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  unlink_account: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const AuditLogsTab = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data: logsData, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch admin names from gb_members
      const performerIds = [...new Set((logsData || []).map((l) => l.performed_by))];
      const { data: members } = await supabase
        .from("gb_members")
        .select("auth_user_id, full_name")
        .in("auth_user_id", performerIds);

      const nameMap = new Map<string, string>();
      (members || []).forEach((m) => {
        if (m.auth_user_id) nameMap.set(m.auth_user_id, m.full_name);
      });

      const enriched = (logsData || []).map((log) => ({
        ...log,
        target_details: log.target_details as Record<string, unknown> | null,
        admin_name: nameMap.get(log.performed_by) || "Unknown Admin",
      }));

      setLogs(enriched);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actionTypes = [...new Set(logs.map((l) => l.action_type))].sort();

  const filtered = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.action_description.toLowerCase().includes(search.toLowerCase()) ||
      log.admin_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.action_type.toLowerCase().includes(search.toLowerCase()) ||
      (log.target_id && log.target_id.toLowerCase().includes(search.toLowerCase()));
    const matchesAction = actionFilter === "all" || log.action_type === actionFilter;
    return matchesSearch && matchesAction;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatActionType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Admin Audit Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actionTypes.map((t) => (
                <SelectItem key={t} value={t}>{formatActionType(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No audit logs found.</div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Date & Time</TableHead>
                    <TableHead className="w-[140px]">Admin</TableHead>
                    <TableHead className="w-[140px]">Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Table</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{log.admin_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={ACTION_TYPE_COLORS[log.action_type] || ""}
                        >
                          {formatActionType(log.action_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate" title={log.action_description}>
                        {log.action_description}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.target_table || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filtered.length}
              itemsPerPage={pageSize}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditLogsTab;
