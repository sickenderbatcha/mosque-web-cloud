import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/auditLog";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, Shield, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const ADMIN_TABS = [
  { key: "donations", label: "Donations" },
  { key: "income", label: "Income" },
  { key: "expenses", label: "Expenses" },
  { key: "bookings", label: "Bookings" },
  { key: "refunds", label: "Refunds" },
  { key: "grievances", label: "Grievances" },
  { key: "events", label: "Events" },
  { key: "members", label: "Members" },
  { key: "gallery", label: "Gallery" },
  { key: "about-gallery", label: "About Gallery" },
  { key: "announcements", label: "Announcements" },
  { key: "user-approval", label: "User Approval" },
  { key: "user-management", label: "User Management" },
  { key: "notifications", label: "Notifications" },
  { key: "marriage-register", label: "Marriage Register" },
  { key: "outside-marriage-register", label: "Outside Marriage Register" },
  { key: "death-register", label: "Death Register" },
  { key: "certificate-payments", label: "Certificate Payments" },
  { key: "noc-certificates", label: "NOC Certificates" },
  { key: "heir-certificates", label: "Heir Certificates" },
  { key: "subscription-slots", label: "Subscriptions" },
  { key: "cash-requests", label: "Cash Requests" },
  { key: "online-payments", label: "Online Payments" },
  { key: "issued-documents", label: "Issued Documents" },
  { key: "pdf-documents", label: "PDF Documents" },
  { key: "committee", label: "Committee" },
  { key: "rental-agreements", label: "Rental Agreements" },
  { key: "asset-management", label: "Asset Management" },
  { key: "backup-restore", label: "Backup & Restore" },
  { key: "settings", label: "Settings" },
];

interface UserOption {
  id: string;
  full_name: string;
  member_id: string;
  role: string;
}

const TabPermissionsTab = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserPermissions(selectedUserId);
    } else {
      setSelectedTabs([]);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get members with linked auth accounts and their roles
      const { data: members, error: membersError } = await supabase
        .from("gb_members")
        .select("auth_user_id, member_id, full_name")
        .not("auth_user_id", "is", null);

      if (membersError) throw membersError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      const userList: UserOption[] = (members || [])
        .filter((m) => {
          const role = roleMap.get(m.auth_user_id!) || "user";
          // Don't show admins/superadmins (they already have full access)
          return role !== "admin" && role !== "superadmin";
        })
        .map((m) => ({
          id: m.auth_user_id!,
          full_name: m.full_name || "Unknown",
          member_id: m.member_id || "-",
          role: (roleMap.get(m.auth_user_id!) as string) || "user",
        }));

      setUsers(userList);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
    setLoadingUsers(false);
  };

  const fetchUserPermissions = async (userId: string) => {
    setLoadingPerms(true);
    try {
      const { data, error } = await supabase
        .from("user_tab_permissions")
        .select("tab_key")
        .eq("user_id", userId);

      if (error) throw error;
      setSelectedTabs(data?.map((d) => d.tab_key) || []);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      setSelectedTabs([]);
    }
    setLoadingPerms(false);
  };

  const handleSave = async () => {
    if (!selectedUserId || !user) return;
    setSaving(true);

    try {
      // Delete existing permissions for this user
      const { error: deleteError } = await supabase
        .from("user_tab_permissions")
        .delete()
        .eq("user_id", selectedUserId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (selectedTabs.length > 0) {
        const rows = selectedTabs.map((tab) => ({
          user_id: selectedUserId,
          tab_key: tab,
          granted_by: user.id,
        }));

        const { error: insertError } = await supabase
          .from("user_tab_permissions")
          .insert(rows);

        if (insertError) throw insertError;
      }

      const selectedUserObj = users.find((u) => u.id === selectedUserId);
      toast({
        title: "Permissions saved",
        description: `${selectedTabs.length} tab(s) assigned successfully.`,
      });
      logAdminAction({
        action_type: selectedTabs.length > 0 ? "grant_permission" : "revoke_permission",
        action_description: `Updated tab permissions for ${selectedUserObj?.full_name || "user"}: ${selectedTabs.length > 0 ? selectedTabs.join(", ") : "all removed"}`,
        target_table: "user_tab_permissions",
        target_id: selectedUserId,
        target_details: { tabs: selectedTabs, user_name: selectedUserObj?.full_name },
      });
    } catch (err: any) {
      console.error("Error saving permissions:", err);
      toast({
        title: "Error saving permissions",
        description: err.message,
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const toggleTab = (tabKey: string) => {
    setSelectedTabs((prev) =>
      prev.includes(tabKey) ? prev.filter((t) => t !== tabKey) : [...prev, tabKey]
    );
  };

  const selectAll = () => setSelectedTabs(ADMIN_TABS.map((t) => t.key));
  const deselectAll = () => setSelectedTabs([]);

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.member_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Tab Permissions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Assign specific admin dashboard tabs to users. Admin and Super Admin users already have full access.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select User</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading users...</span>
            </div>
          ) : (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user to assign permissions" />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name} ({u.member_id}) - {u.role}
                  </SelectItem>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No users found
                  </div>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Selected user info */}
        {selectedUser && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <span className="text-sm font-medium">{selectedUser.full_name}</span>
            <Badge variant="outline">{selectedUser.member_id}</Badge>
            <Badge variant="secondary">{selectedUser.role}</Badge>
            {selectedTabs.length > 0 && (
              <Badge className="ml-auto">{selectedTabs.length} tabs assigned</Badge>
            )}
          </div>
        )}

        {/* Tab Permissions */}
        {selectedUserId && (
          <>
            {loadingPerms ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading permissions...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ADMIN_TABS.map((tab) => (
                    <label
                      key={tab.key}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedTabs.includes(tab.key)}
                        onCheckedChange={() => toggleTab(tab.key)}
                      />
                      <span className="text-sm">{tab.label}</span>
                    </label>
                  ))}
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Permissions
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TabPermissionsTab;
