import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LetterheadSettings,
  DEFAULT_LETTERHEAD_SETTINGS,
  LETTERHEAD_SETTING_KEYS,
} from "@/lib/letterheadSettings";

const KEYS = Object.values(LETTERHEAD_SETTING_KEYS) as string[];

export const useLetterheadSettings = () => {
  const [settings, setSettings] = useState<LetterheadSettings>(DEFAULT_LETTERHEAD_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", KEYS);

      if (error) {
        console.error("Error fetching letterhead settings:", error);
        return;
      }

      const result: LetterheadSettings = { ...DEFAULT_LETTERHEAD_SETTINGS };
      data?.forEach((item) => {
        if (item.key === LETTERHEAD_SETTING_KEYS.footerTa && item.value) result.footerTa = item.value;
        if (item.key === LETTERHEAD_SETTING_KEYS.footerEn && item.value) result.footerEn = item.value;
      });

      setSettings(result);
    } catch (error) {
      console.error("Error fetching letterhead settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const channel = supabase
      .channel("letterhead_settings_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload) => {
          const changedKey = (payload.new as any)?.key || (payload.old as any)?.key;
          if (changedKey && KEYS.includes(changedKey)) fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return { settings, isLoading };
};
