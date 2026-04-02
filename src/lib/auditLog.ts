import { supabase } from "@/integrations/supabase/client";

interface AuditLogEntry {
  action_type: string;
  action_description: string;
  target_table?: string;
  target_id?: string;
  target_details?: Record<string, unknown>;
}

export const logAdminAction = async (entry: AuditLogEntry) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("admin_audit_logs").insert({
      performed_by: user.id,
      action_type: entry.action_type,
      action_description: entry.action_description,
      target_table: entry.target_table || null,
      target_id: entry.target_id || null,
      target_details: entry.target_details || {},
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
};
