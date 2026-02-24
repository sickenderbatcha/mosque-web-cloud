import { supabase } from "@/integrations/supabase/client";

/**
 * Upsert an app_settings key with proper error checking.
 * This prevents silent save failures by throwing on database errors.
 */
export const upsertAppSetting = async (
  key: string,
  value: string,
  description?: string
): Promise<void> => {
  const { data: existing } = await supabase
    .from("app_settings")
    .select("id")
    .eq("key", key)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("app_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("app_settings")
      .insert({ key, value, description: description || null });
    if (error) throw error;
  }
};
