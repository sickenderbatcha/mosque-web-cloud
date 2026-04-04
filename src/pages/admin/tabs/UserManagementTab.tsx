import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/auditLog";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Loader2,
  Search,
  KeyRound,
  Trash2,
  UserX,
  Shield,
  ShieldOff,
  Users,
  UserCheck,
  AlertTriangle,
  Unlink,
  Copy,
  Check,
} from "lucide-react";
import TablePagination from "@/components/admin/TablePagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface UserWithMember {
  id: string;
  member_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  auth_user_id: string | null;
  is_active: boolean;
  created_at: string;
  role?: string;
}

const UserManagementTab = () => {
  const { isSuperAdmin } = useUserRole();
  const [users, setUsers] = useState<UserWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "with_account" | "without_account">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithMember | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ name: string; password: string; notificationSent: boolean } | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all members with auth accounts
      const allUsers: UserWithMember[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("gb_members")
          .select("id, member_id, full_name, phone, email, auth_user_id, is_active, created_at")
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;

        if (data) {
          allUsers.push(...data);
          hasMore = data.length === pageSize;
          from += pageSize;
        } else {
          hasMore = false;
        }
      }

      // Fetch user roles for those with accounts
      const usersWithAccounts = allUsers.filter(u => u.auth_user_id);
      if (usersWithAccounts.length > 0) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", usersWithAccounts.map(u => u.auth_user_id));

        if (rolesData) {
          const roleMap = new Map(rolesData.map(r => [r.user_id, r.role]));
          allUsers.forEach(user => {
            if (user.auth_user_id && roleMap.has(user.auth_user_id)) {
              user.role = roleMap.get(user.auth_user_id);
            }
          });
        }
      }

      setUsers(allUsers);
    } catch (error: any) {
      toast({
        title: "Error fetching users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: UserWithMember) => {
    if (!user.auth_user_id) {
      toast({
        title: "Cannot reset password",
        description: "This member does not have a user account.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(user.id);
    try {
      const response = await supabase.functions.invoke("admin-reset-password", {
        body: { memberId: user.member_id },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      const newPassword = response.data?.newPassword;
      if (newPassword) {
        setResetPasswordResult({
          name: user.full_name,
          password: newPassword,
          notificationSent: response.data?.notificationSent || false,
        });
        setPasswordCopied(false);
      } else {
        toast({
          title: "Password reset successful",
          description: `New password has been sent to ${user.full_name}'s registered contact.`,
        });
      }
      logAdminAction({
        action_type: "reset_password",
        action_description: `Reset password for ${user.full_name} (${user.member_id})`,
        target_table: "gb_members",
        target_id: user.member_id,
        target_details: { full_name: user.full_name, member_id: user.member_id },
      });
    } catch (error: any) {
      toast({
        title: "Error resetting password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser?.auth_user_id) return;

    setActionLoading(selectedUser.id);
    try {
      const response = await supabase.functions.invoke("admin-delete-user", {
        body: { memberId: selectedUser.member_id },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: "User account deleted",
        description: `Account for ${selectedUser.full_name} has been deleted. The member record is preserved.`,
      });
      logAdminAction({
        action_type: "delete_user",
        action_description: `Deleted user account for ${selectedUser.full_name} (${selectedUser.member_id})`,
        target_table: "gb_members",
        target_id: selectedUser.member_id,
        target_details: { full_name: selectedUser.full_name, member_id: selectedUser.member_id },
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleUnlinkAccount = async () => {
    if (!selectedUser?.auth_user_id) return;

    setActionLoading(selectedUser.id);
    try {
      // Unlink auth_user_id from member record
      const { error } = await supabase
        .from("gb_members")
        .update({ auth_user_id: null })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Account unlinked",
        description: `Account has been unlinked from ${selectedUser.full_name}'s member record.`,
      });
      logAdminAction({
        action_type: "unlink_account",
        action_description: `Unlinked user account from ${selectedUser.full_name} (${selectedUser.member_id})`,
        target_table: "gb_members",
        target_id: selectedUser.member_id,
        target_details: { full_name: selectedUser.full_name, member_id: selectedUser.member_id },
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error unlinking account",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setUnlinkDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser?.auth_user_id || !selectedRole) return;

    setActionLoading(selectedUser.id);
    try {
      // Delete existing role
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.auth_user_id);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: selectedUser.auth_user_id, role: selectedRole as any });

      if (insertError) throw insertError;

      toast({
        title: "Role updated",
        description: `${selectedUser.full_name}'s role changed to ${selectedRole}.`,
      });
      logAdminAction({
        action_type: "change_role",
        action_description: `Changed role for ${selectedUser.full_name} (${selectedUser.member_id}) to ${selectedRole}`,
        target_table: "user_roles",
        target_id: selectedUser.auth_user_id,
        target_details: { full_name: selectedUser.full_name, member_id: selectedUser.member_id, new_role: selectedRole },
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error changing role",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setRoleChangeDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("");
    }
  };

  const toggleMemberStatus = async (user: UserWithMember) => {
    setActionLoading(user.id);
    try {
      const { error } = await supabase
        .from("gb_members")
        .update({ is_active: !user.is_active })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: `Member ${user.is_active ? "deactivated" : "activated"}`,
      });
      logAdminAction({
        action_type: user.is_active ? "deactivate_member" : "activate_member",
        action_description: `${user.is_active ? "Deactivated" : "Activated"} member ${user.full_name} (${user.member_id})`,
        target_table: "gb_members",
        target_id: user.member_id,
        target_details: { full_name: user.full_name, member_id: user.member_id },
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Hide SUPUSR member for non-superadmin users
      if (!isSuperAdmin && user.member_id?.toUpperCase().trim() === "SUPUSR") return false;

      const matchesSearch =
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.member_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone && user.phone.includes(searchQuery)) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "with_account" && user.auth_user_id) ||
        (statusFilter === "without_account" && !user.auth_user_id);

      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, statusFilter, isSuperAdmin]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Stats
  const totalWithAccounts = users.filter((u) => u.auth_user_id).length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalActive = users.filter((u) => u.is_active).length;

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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === "with_account" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "with_account" ? "all" : "with_account")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{totalWithAccounts}</div>
                <p className="text-sm text-muted-foreground">With Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <div>
                <div className="text-2xl font-bold text-amber-600">{totalAdmins}</div>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalActive}</div>
                <p className="text-sm text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, member ID, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="with_account">With Account</SelectItem>
                <SelectItem value="without_account">Without Account</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.member_id}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.phone && <div>{user.phone}</div>}
                          {user.email && <div className="text-muted-foreground">{user.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.auth_user_id ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Has Account
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                            <UserX className="h-3 w-3 mr-1" />
                            No Account
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        ) : user.auth_user_id ? (
                          <Badge variant="secondary">User</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={actionLoading === user.id}>
                              {actionLoading === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleMemberStatus(user)}>
                              {user.is_active ? (
                                <>
                                  <ShieldOff className="h-4 w-4 mr-2" />
                                  Deactivate Member
                                </>
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Activate Member
                                </>
                              )}
                            </DropdownMenuItem>

                                {user.auth_user_id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                  <KeyRound className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                                {isSuperAdmin && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setSelectedRole(user.role || "user");
                                      setRoleChangeDialogOpen(true);
                                    }}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Change Role
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setUnlinkDialogOpen(true);
                                  }}
                                >
                                  <Unlink className="h-4 w-4 mr-2" />
                                  Unlink Account
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Account
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            startIndex={startIndex}
            endIndex={endIndex}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
            itemLabel="users"
          />
        </CardContent>
      </Card>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the account for{" "}
              <strong>{selectedUser?.full_name}</strong> ({selectedUser?.member_id})?
              <br />
              <br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Permanently delete their authentication account</li>
                <li>Remove their login ability</li>
                <li>Preserve their member record in the system</li>
              </ul>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteUser}
              disabled={actionLoading === selectedUser?.id}
            >
              {actionLoading === selectedUser?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlink Account Dialog */}
      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Unlink className="h-5 w-5" />
              Unlink User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink the account from{" "}
              <strong>{selectedUser?.full_name}</strong> ({selectedUser?.member_id})?
              <br />
              <br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Disconnect the authentication account from this member</li>
                <li>Allow another member to claim this account or create a new one</li>
                <li>The user can request a new account registration</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlinkAccount} disabled={actionLoading === selectedUser?.id}>
              {actionLoading === selectedUser?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlink className="h-4 w-4 mr-2" />
              )}
              Unlink Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Result Dialog */}
      <Dialog open={!!resetPasswordResult} onOpenChange={(open) => { if (!open) setResetPasswordResult(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <DialogDescription>
              New password for <strong>{resetPasswordResult?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input 
                readOnly 
                value={resetPasswordResult?.password || ""} 
                className="font-mono text-lg tracking-wider text-center"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(resetPasswordResult?.password || "");
                  setPasswordCopied(true);
                  setTimeout(() => setPasswordCopied(false), 2000);
                }}
              >
                {passwordCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {resetPasswordResult?.notificationSent 
                ? "This password has also been sent to the member's registered contact."
                : "⚠️ Notification could not be sent. Please share this password manually."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
      {/* Role Change Dialog */}
      <Dialog open={roleChangeDialogOpen} onOpenChange={(open) => { if (!open) { setRoleChangeDialogOpen(false); setSelectedUser(null); setSelectedRole(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Change User Role
            </DialogTitle>
            <DialogDescription>
              Change the role for <strong>{selectedUser?.full_name}</strong> ({selectedUser?.member_id})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRoleChangeDialogOpen(false); setSelectedUser(null); setSelectedRole(""); }}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={!selectedRole || actionLoading === selectedUser?.id}>
              {actionLoading === selectedUser?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementTab;
