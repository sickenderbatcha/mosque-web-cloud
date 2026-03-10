import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  admin_email: string;
  mosque_contact_number: string;
  whatsapp_number: string;
  website_url: string;
  [key: string]: string;
}

const defaultSettings: AppSettings = {
  admin_email: "",
  mosque_contact_number: "",
  whatsapp_number: "",
  website_url: "",
};

export const useAppSettings = (keys?: string[]) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const keysKey = keys?.join(",") || "";
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const channelIdRef = useRef(`app_settings_${Math.random().toString(36).slice(2, 9)}`);

  const fetchSettings = useCallback(async () => {
    try {
      const currentKeys = keysRef.current;
      let query = supabase.from("app_settings").select("key, value");

      if (currentKeys && currentKeys.length > 0) {
        query = query.in("key", currentKeys);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("useAppSettings fetch error:", fetchError);
        setError(fetchError.message);
        return;
      }

      const settingsMap: AppSettings = { ...defaultSettings };
      if (data && data.length > 0) {
        data.forEach((item) => {
          settingsMap[item.key] = item.value;
        });
      }
      setSettings(settingsMap);
    } catch (err) {
      console.error("useAppSettings catch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch settings");
    } finally {
      setIsLoading(false);
    }
  }, [keysKey]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchSettings();
  }, [fetchSettings]);

  // Subscribe to realtime changes on app_settings
  useEffect(() => {
    const channel = supabase
      .channel(channelIdRef.current)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
        },
        (payload) => {
          // If we're filtering by keys, only refetch if the changed key is relevant
          if (keys && keys.length > 0) {
            const changedKey =
              (payload.new as any)?.key || (payload.old as any)?.key;
            if (changedKey && !keys.includes(changedKey)) {
              return; // Not a key we care about
            }
          }
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings, keysKey]);

  const getSetting = (key: string): string => {
    return settings[key] || "";
  };

  return { settings, isLoading, error, getSetting };
};
