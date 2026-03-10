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

const APP_SETTINGS_CACHE_KEY = "app_settings_cache_v1";
let inMemorySettingsCache: Record<string, string> | null = null;

const getCacheStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const loadCachedSettings = (): Record<string, string> => {
  if (inMemorySettingsCache) {
    return inMemorySettingsCache;
  }

  const storage = getCacheStorage();
  if (!storage) {
    inMemorySettingsCache = {};
    return inMemorySettingsCache;
  }

  try {
    const rawCache = storage.getItem(APP_SETTINGS_CACHE_KEY);
    if (!rawCache) {
      inMemorySettingsCache = {};
      return inMemorySettingsCache;
    }

    const parsedCache = JSON.parse(rawCache);
    if (parsedCache && typeof parsedCache === "object" && !Array.isArray(parsedCache)) {
      const sanitizedCache: Record<string, string> = {};

      Object.entries(parsedCache).forEach(([key, value]) => {
        if (typeof value === "string") {
          sanitizedCache[key] = value;
        }
      });

      inMemorySettingsCache = sanitizedCache;
      return inMemorySettingsCache;
    }
  } catch (error) {
    console.warn("Failed to read app settings cache:", error);
  }

  inMemorySettingsCache = {};
  return inMemorySettingsCache;
};

const persistCachedSettings = (nextSettings: Record<string, string>) => {
  const mergedSettings = {
    ...loadCachedSettings(),
    ...nextSettings,
  };

  inMemorySettingsCache = mergedSettings;

  const storage = getCacheStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(APP_SETTINGS_CACHE_KEY, JSON.stringify(mergedSettings));
  } catch (error) {
    console.warn("Failed to persist app settings cache:", error);
  }
};

const getInitialSettings = (keys?: string[]) => {
  const cachedSettings = loadCachedSettings();
  const initialSettings: AppSettings = { ...defaultSettings };

  if (!keys || keys.length === 0) {
    return {
      ...initialSettings,
      ...cachedSettings,
    };
  }

  keys.forEach((key) => {
    if (typeof cachedSettings[key] === "string") {
      initialSettings[key] = cachedSettings[key];
    }
  });

  return initialSettings;
};

const hasUsableSettingValue = (value: string | undefined) => {
  return typeof value === "string" && value.trim().length > 0;
};

const hasCachedSettings = (keys?: string[]) => {
  const cachedSettings = loadCachedSettings();

  if (!keys || keys.length === 0) {
    return Object.keys(cachedSettings).length > 0;
  }

  return keys.every((key) => hasUsableSettingValue(cachedSettings[key]));
};

export const useAppSettings = (keys?: string[]) => {
  const [settings, setSettings] = useState<AppSettings>(() => getInitialSettings(keys));
  const [isLoading, setIsLoading] = useState(() => !hasCachedSettings(keys));
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

      const settingsMap = getInitialSettings(currentKeys);
      const freshSettings: Record<string, string> = {};

      if (data && data.length > 0) {
        data.forEach((item) => {
          settingsMap[item.key] = item.value;
          freshSettings[item.key] = item.value;
        });
      }

      if (Object.keys(freshSettings).length > 0) {
        persistCachedSettings(freshSettings);
      }

      setError(null);
      setSettings(settingsMap);
    } catch (err) {
      console.error("useAppSettings catch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch settings");
    } finally {
      setIsLoading(false);
    }
  }, [keysKey]);

  useEffect(() => {
    setSettings(getInitialSettings(keysRef.current));
    setIsLoading(!hasCachedSettings(keysRef.current));
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
          const currentKeys = keysRef.current;

          if (currentKeys && currentKeys.length > 0) {
            const changedKey =
              (payload.new as any)?.key || (payload.old as any)?.key;
            if (changedKey && !currentKeys.includes(changedKey)) {
              return;
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
