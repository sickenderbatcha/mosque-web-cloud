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
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        key,
        value,
        description: description || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  if (error) throw error;
};
