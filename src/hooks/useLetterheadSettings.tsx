import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LetterheadSettings,
  DEFAULT_LETTERHEAD_SETTINGS,
  LETTERHEAD_SETTING_KEYS,
  LETTERHEAD_KEY_TO_FIELD,
} from "@/lib/letterheadSettings";

const KEYS = Object.values(LETTERHEAD_SETTING_KEYS) as string[];

// Fallback: if a letterhead key is not set yet, use the receipt header value
const RECEIPT_FALLBACK_KEYS: Record<string, keyof LetterheadSettings> = {
  receipt_header_org_name_ta: "orgNameTa",
  receipt_header_org_name_en: "orgNameEn",
  receipt_header_address_1: "addressLine1",
  receipt_header_address_2: "addressLine2",
  receipt_header_phone: "phone",
};

const ALL_KEYS = [...KEYS, ...Object.keys(RECEIPT_FALLBACK_KEYS)];

export const useLetterheadSettings = () => {
  const [settings, setSettings] = useState<LetterheadSettings>(DEFAULT_LETTERHEAD_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ALL_KEYS);

      if (error) {
        console.error("Error fetching letterhead settings:", error);
        return;
      }

      const result: LetterheadSettings = { ...DEFAULT_LETTERHEAD_SETTINGS };

      // Receipt header values first (fallback), then letterhead-specific values override
      data?.forEach((item) => {
        const field = RECEIPT_FALLBACK_KEYS[item.key];
        if (field && item.value) result[field] = item.value;
      });
      data?.forEach((item) => {
        const field = LETTERHEAD_KEY_TO_FIELD[item.key];
        if (field && item.value) result[field] = item.value;
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
          if (changedKey && ALL_KEYS.includes(changedKey)) fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return { settings, isLoading };
};
