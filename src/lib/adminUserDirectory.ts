import { supabase } from "@/integrations/supabase/client";

export type AdminDirectoryRole = "user" | "member" | "admin" | "superadmin";

export interface AdminDirectoryUser {
  id: string;
  member_record_id: string | null;
  auth_user_id: string | null;
  member_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  role: AdminDirectoryRole;
  has_member_record: boolean;
  is_direct_user: boolean;
}

export const fetchAdminUserDirectory = async (): Promise<AdminDirectoryUser[]> => {
  const { data, error } = await supabase.functions.invoke("admin-user-directory");

  if (error) {
    throw new Error(error.message || "Failed to load user directory");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return ((data?.users as AdminDirectoryUser[] | undefined) ?? []).map((user) => ({
    ...user,
    role: user.role || "user",
    member_id: user.member_id || "—",
    full_name: user.full_name || "Unknown User",
  }));
};