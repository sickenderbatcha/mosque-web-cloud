import { supabase } from "@/integrations/supabase/client";

export type LetterheadAuditAction = "created" | "updated" | "deleted";

export const LETTERHEAD_FIELD_LABELS: Record<string, string> = {
  reference_number: "Reference number",
  letter_date: "Date",
  recipient_name: "Recipient name",
  recipient_address: "Recipient address",
  subject: "Subject",
  salutation: "Salutation",
  body: "Body",
  closing: "Closing",
  signatory_name: "Signatory",
  designation: "Designation",
  layout: "Print layout",
};

const normalise = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const diffLetterheadFields = (
  previous: Record<string, unknown> | null,
  next: Record<string, unknown>
): string[] => {
  if (!previous) return Object.keys(next);
  return Object.keys(next).filter((key) => normalise(previous[key]) !== normalise(next[key]));
};

export const logLetterheadAudit = async (
  letterheadId: string,
  action: LetterheadAuditAction,
  changedFields: string[],
  snapshot: Record<string, unknown>
) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    let name = (user.user_metadata?.full_name as string | undefined) ?? null;
    if (!name) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      name = profile?.full_name ?? user.email ?? null;
    }

    await supabase.from("letterhead_audit_logs").insert({
      letterhead_id: letterheadId,
      action,
      changed_fields: changedFields,
      performed_by: user.id,
      performed_by_name: name,
      snapshot: snapshot as never,
    });
  } catch (err) {
    console.error("Failed to write letterhead audit log:", err);
  }
};
