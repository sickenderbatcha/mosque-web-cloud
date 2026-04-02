import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/auditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, UserCheck, UserX, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PendingUser {
  id: string;
  member_id: string;
  full_name: string;
  phone: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const UserApprovalTab = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "delete" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    const pageSize = 1000;
    let allUsers: PendingUser[] = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from("pending_users")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error("Error fetching pending users:", error);
        toast({
          title: "Error",
          description: "Failed to load pending users",
          variant: "destructive",
        });
        break;
      }
      
      if (data && data.length > 0) {
        allUsers = [...allUsers, ...data];
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    setPendingUsers(allUsers);
    setLoading(false);
  };

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      if (actionType === "delete") {
        // Direct delete from pending_users table
        const { error } = await supabase
          .from("pending_users")
          .delete()
          .eq("id", selectedUser.id);

        if (error) throw error;

        toast({
          title: "Request Deleted",
          description: `Registration request for ${selectedUser.full_name} has been deleted.`,
        });
        logAdminAction({
          action_type: "delete_pending_user",
          action_description: `Deleted pending registration for ${selectedUser.full_name} (${selectedUser.member_id})`,
          target_table: "pending_users",
          target_id: selectedUser.id,
          target_details: { full_name: selectedUser.full_name, member_id: selectedUser.member_id },
        });
      } else {
        // Approve or reject via edge function
        const response = await supabase.functions.invoke("approve-user", {
          body: {
            pendingUserId: selectedUser.id,
            action: actionType,
            adminNotes,
          },
        });

        if (response.error) throw response.error;

        toast({
          title: actionType === "approve" ? "User Approved" : "User Rejected",
          description: `${selectedUser.full_name} has been ${actionType === "approve" ? "approved" : "rejected"}.`,
        });
        logAdminAction({
          action_type: actionType === "approve" ? "approve_user" : "reject_user",
          action_description: `${actionType === "approve" ? "Approved" : "Rejected"} user registration for ${selectedUser.full_name} (${selectedUser.member_id})`,
          target_table: "pending_users",
          target_id: selectedUser.id,
          target_details: { full_name: selectedUser.full_name, member_id: selectedUser.member_id, admin_notes: adminNotes },
        });
      }

      fetchPendingUsers();
      setSelectedUser(null);
      setActionType(null);
      setAdminNotes("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = pendingUsers.filter((user) => {
    if (filter === "all") return true;
    return user.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = pendingUsers.filter((u) => u.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("all")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pendingUsers.length}</div>
            <p className="text-sm text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${filter === "pending" ? "ring-2 ring-primary" : ""}`} onClick={() => setFilter("pending")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <p className="text-sm text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("approved")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{pendingUsers.filter((u) => u.status === "approved").length}</div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("rejected")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{pendingUsers.filter((u) => u.status === "rejected").length}</div>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            User Registration Requests
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount} pending</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No {filter === "all" ? "" : filter} registration requests found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.member_id}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{format(new Date(user.created_at), "dd/MM/yyyy, hh:mm a")}</TableCell>
                    <TableCell>
                      {user.status === "pending" ? (
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType("approve");
                            }}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType("reject");
                            }}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType("delete");
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {user.reviewed_at && format(new Date(user.reviewed_at), "dd/MM/yyyy")}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType("delete");
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedUser && !!actionType} onOpenChange={() => { setSelectedUser(null); setActionType(null); setAdminNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve User" : actionType === "reject" ? "Reject User" : "Delete Request"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `Are you sure you want to approve ${selectedUser?.full_name} (${selectedUser?.member_id})? An account will be created for them.`
                : actionType === "reject"
                ? `Are you sure you want to reject ${selectedUser?.full_name} (${selectedUser?.member_id})?`
                : `Are you sure you want to permanently delete the registration request for ${selectedUser?.full_name} (${selectedUser?.member_id})? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {actionType !== "delete" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea
                  placeholder="Add any notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedUser(null); setActionType(null); setAdminNotes(""); }}>
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {actionType === "approve" ? "Approve" : actionType === "reject" ? "Reject" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserApprovalTab;
