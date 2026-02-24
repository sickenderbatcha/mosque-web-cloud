import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type AppRole = "admin" | "member" | "user" | "superadmin";

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset loading when user changes to prevent showing stale role state
    setLoading(true);
    
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole("user");
        } else {
          setRole((data?.role as AppRole) || "user");
        }
      } catch (err) {
        console.error("Failed to fetch user role:", err);
        setRole("user");
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const isSuperAdmin = role === "superadmin";
  const isAdmin = role === "admin" || role === "superadmin";
  const isMember = role === "member" || role === "admin" || role === "superadmin";

  return { role, isSuperAdmin, isAdmin, isMember, loading };
};
