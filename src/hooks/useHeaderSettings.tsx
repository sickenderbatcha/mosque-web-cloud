import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  HEADER_SETTING_KEYS,
  HEADER_SETTINGS_CACHE_KEY,
  HEADER_SETTINGS_DEFAULTS,
  sanitizeHeaderSettings,
  type HeaderSettingKey,
  type HeaderSettings,
} from "@/lib/headerSettings";

interface HeaderSettingsContextValue {
  settings: HeaderSettings;
  isLoading: boolean;
  isResolved: boolean;
  applySettings: (nextSettings: Partial<HeaderSettings>) => void;
  refreshSettings: () => Promise<void>;
}

const HeaderSettingsContext = createContext<HeaderSettingsContextValue | undefined>(undefined);

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const readCachedHeaderSettings = (): Partial<HeaderSettings> => {
  const storage = getStorage();
  if (!storage) {
    return {};
  }

  try {
    const rawCache = storage.getItem(HEADER_SETTINGS_CACHE_KEY);
    if (!rawCache) {
      return {};
    }

    const parsedCache = JSON.parse(rawCache);
    if (!parsedCache || typeof parsedCache !== "object" || Array.isArray(parsedCache)) {
      return {};
    }

    return sanitizeHeaderSettings(parsedCache as Partial<Record<string, unknown>>);
  } catch (error) {
    console.warn("Failed to read header settings cache:", error);
    return {};
  }
};

const writeCachedHeaderSettings = (nextSettings: Partial<HeaderSettings>) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    const mergedSettings = {
      ...readCachedHeaderSettings(),
      ...sanitizeHeaderSettings(nextSettings),
    };

    storage.setItem(HEADER_SETTINGS_CACHE_KEY, JSON.stringify(mergedSettings));
  } catch (error) {
    console.warn("Failed to persist header settings cache:", error);
  }
};

const createHeaderSettingsState = (cachedSettings: Partial<HeaderSettings>): HeaderSettings => ({
  ...HEADER_SETTINGS_DEFAULTS,
  ...cachedSettings,
});

export const HeaderSettingsProvider = ({ children }: { children: ReactNode }) => {
  const cachedSettings = useMemo(() => readCachedHeaderSettings(), []);
  const hasCachedSettings = Object.keys(cachedSettings).length > 0;

  const [settings, setSettings] = useState<HeaderSettings>(() => createHeaderSettingsState(cachedSettings));
  const [isLoading, setIsLoading] = useState(() => !hasCachedSettings);
  const [isResolved, setIsResolved] = useState(() => hasCachedSettings);

  const applySettings = useCallback((nextSettings: Partial<HeaderSettings>) => {
    const sanitizedSettings = sanitizeHeaderSettings(nextSettings);
    if (Object.keys(sanitizedSettings).length === 0) {
      return;
    }

    setSettings((currentSettings) => ({
      ...currentSettings,
      ...sanitizedSettings,
    }));
    writeCachedHeaderSettings(sanitizedSettings);
    setIsResolved(true);
  }, []);

  const refreshSettings = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [...HEADER_SETTING_KEYS]);

      if (error) {
        throw error;
      }

      const fetchedSettings: Partial<HeaderSettings> = {};

      data?.forEach((item) => {
        const key = item.key as HeaderSettingKey;
        if (HEADER_SETTING_KEYS.includes(key)) {
          fetchedSettings[key] = item.value;
        }
      });

      const nextSettings = createHeaderSettingsState(fetchedSettings);
      setSettings(nextSettings);
      writeCachedHeaderSettings(nextSettings);
      setIsResolved(true);
    } catch (error) {
      console.error("Failed to load header settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    const channel = supabase
      .channel("header_settings_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
        },
        (payload) => {
          const changedKey =
            (payload.new as { key?: string } | null)?.key ??
            (payload.old as { key?: string } | null)?.key;

          if (changedKey && HEADER_SETTING_KEYS.includes(changedKey as HeaderSettingKey)) {
            void refreshSettings();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshSettings]);

  const value = useMemo<HeaderSettingsContextValue>(
    () => ({
      settings,
      isLoading,
      isResolved,
      applySettings,
      refreshSettings,
    }),
    [settings, isLoading, isResolved, applySettings, refreshSettings],
  );

  return (
    <HeaderSettingsContext.Provider value={value}>
      {children}
    </HeaderSettingsContext.Provider>
  );
};

export const useHeaderSettings = () => {
  const context = useContext(HeaderSettingsContext);

  if (!context) {
    throw new Error("useHeaderSettings must be used within HeaderSettingsProvider");
  }

  return context;
};
