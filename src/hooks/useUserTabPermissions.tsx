import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";

export const useUserTabPermissions = () => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (roleLoading) return;

      // Admins and superadmins have access to all tabs
      if (isAdmin || isSuperAdmin) {
        setAllowedTabs([]);
        setLoading(false);
        return;
      }

      if (!user) {
        setAllowedTabs([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_tab_permissions")
          .select("tab_key")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching tab permissions:", error);
          setAllowedTabs([]);
        } else {
          setAllowedTabs(data?.map((d) => d.tab_key) || []);
        }
      } catch (err) {
        console.error("Failed to fetch tab permissions:", err);
        setAllowedTabs([]);
      }
      setLoading(false);
    };

    fetchPermissions();
  }, [user, isAdmin, isSuperAdmin, roleLoading]);

  // If admin/superadmin, hasFullAccess = true (show all tabs)
  // If regular user with permissions, hasFullAccess = false, use allowedTabs
  const hasFullAccess = isAdmin || isSuperAdmin;
  const hasAnyAccess = hasFullAccess || allowedTabs.length > 0;

  const canAccessTab = (tabKey: string) => {
    if (hasFullAccess) return true;
    return allowedTabs.includes(tabKey);
  };

  return { allowedTabs, hasFullAccess, hasAnyAccess, canAccessTab, loading: loading || roleLoading };
};
