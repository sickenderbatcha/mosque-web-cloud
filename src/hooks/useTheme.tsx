import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeColor = 
  | "emerald" // Default Islamic Green
  | "ocean" // Blue theme
  | "sunset" // Orange/warm theme
  | "royal" // Purple theme
  | "midnight" // Dark blue theme
  | "rose" // Pink/rose theme
  | "crimson" // Deep red theme
  | "teal" // Teal/cyan theme
  | "amber" // Warm amber theme
  | "slate"; // Cool gray theme

export type DarkMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
  darkMode: DarkMode;
  setDarkMode: (mode: DarkMode) => void;
  isDark: boolean;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeStyles: Record<ThemeColor, Record<string, string>> = {
  emerald: {
    "--primary": "155 82% 27%",
    "--primary-foreground": "45 30% 97%",
    "--accent": "170 50% 35%",
    "--accent-foreground": "45 30% 97%",
    "--emerald": "155 82% 27%",
    "--emerald-light": "155 60% 45%",
    "--emerald-dark": "155 82% 20%",
    "--gold": "43 70% 47%",
    "--gold-light": "43 80% 65%",
    "--gold-dark": "43 70% 35%",
    "--ring": "155 82% 27%",
    "--sidebar-primary": "155 82% 27%",
    "--sidebar-ring": "155 82% 27%",
  },
  ocean: {
    "--primary": "200 80% 35%",
    "--primary-foreground": "200 20% 98%",
    "--accent": "180 60% 40%",
    "--accent-foreground": "200 20% 98%",
    "--emerald": "200 80% 35%",
    "--emerald-light": "200 70% 50%",
    "--emerald-dark": "200 85% 25%",
    "--gold": "45 85% 55%",
    "--gold-light": "45 90% 70%",
    "--gold-dark": "45 80% 40%",
    "--ring": "200 80% 35%",
    "--sidebar-primary": "200 80% 35%",
    "--sidebar-ring": "200 80% 35%",
  },
  sunset: {
    "--primary": "25 90% 45%",
    "--primary-foreground": "25 20% 98%",
    "--accent": "35 85% 50%",
    "--accent-foreground": "25 20% 98%",
    "--emerald": "25 90% 45%",
    "--emerald-light": "30 85% 55%",
    "--emerald-dark": "20 90% 35%",
    "--gold": "45 90% 50%",
    "--gold-light": "50 95% 65%",
    "--gold-dark": "40 85% 40%",
    "--ring": "25 90% 45%",
    "--sidebar-primary": "25 90% 45%",
    "--sidebar-ring": "25 90% 45%",
  },
  royal: {
    "--primary": "270 60% 45%",
    "--primary-foreground": "270 20% 98%",
    "--accent": "280 50% 55%",
    "--accent-foreground": "270 20% 98%",
    "--emerald": "270 60% 45%",
    "--emerald-light": "270 55% 60%",
    "--emerald-dark": "270 65% 35%",
    "--gold": "45 80% 50%",
    "--gold-light": "48 85% 65%",
    "--gold-dark": "42 75% 40%",
    "--ring": "270 60% 45%",
    "--sidebar-primary": "270 60% 45%",
    "--sidebar-ring": "270 60% 45%",
  },
  midnight: {
    "--primary": "220 70% 40%",
    "--primary-foreground": "220 20% 98%",
    "--accent": "210 60% 50%",
    "--accent-foreground": "220 20% 98%",
    "--emerald": "220 70% 40%",
    "--emerald-light": "220 65% 55%",
    "--emerald-dark": "220 75% 30%",
    "--gold": "45 85% 55%",
    "--gold-light": "48 90% 68%",
    "--gold-dark": "42 80% 42%",
    "--ring": "220 70% 40%",
    "--sidebar-primary": "220 70% 40%",
    "--sidebar-ring": "220 70% 40%",
  },
  rose: {
    "--primary": "340 75% 50%",
    "--primary-foreground": "340 20% 98%",
    "--accent": "350 65% 55%",
    "--accent-foreground": "340 20% 98%",
    "--emerald": "340 75% 50%",
    "--emerald-light": "340 70% 60%",
    "--emerald-dark": "340 80% 40%",
    "--gold": "35 85% 55%",
    "--gold-light": "38 90% 68%",
    "--gold-dark": "32 80% 42%",
    "--ring": "340 75% 50%",
    "--sidebar-primary": "340 75% 50%",
    "--sidebar-ring": "340 75% 50%",
  },
  crimson: {
    "--primary": "0 72% 45%",
    "--primary-foreground": "0 20% 98%",
    "--accent": "10 65% 50%",
    "--accent-foreground": "0 20% 98%",
    "--emerald": "0 72% 45%",
    "--emerald-light": "0 65% 58%",
    "--emerald-dark": "0 78% 35%",
    "--gold": "40 85% 52%",
    "--gold-light": "43 90% 66%",
    "--gold-dark": "37 80% 40%",
    "--ring": "0 72% 45%",
    "--sidebar-primary": "0 72% 45%",
    "--sidebar-ring": "0 72% 45%",
  },
  teal: {
    "--primary": "175 70% 35%",
    "--primary-foreground": "175 20% 98%",
    "--accent": "185 60% 42%",
    "--accent-foreground": "175 20% 98%",
    "--emerald": "175 70% 35%",
    "--emerald-light": "175 60% 48%",
    "--emerald-dark": "175 75% 25%",
    "--gold": "45 85% 55%",
    "--gold-light": "48 90% 68%",
    "--gold-dark": "42 80% 42%",
    "--ring": "175 70% 35%",
    "--sidebar-primary": "175 70% 35%",
    "--sidebar-ring": "175 70% 35%",
  },
  amber: {
    "--primary": "38 92% 45%",
    "--primary-foreground": "38 20% 98%",
    "--accent": "45 85% 50%",
    "--accent-foreground": "38 20% 10%",
    "--emerald": "38 92% 45%",
    "--emerald-light": "40 88% 58%",
    "--emerald-dark": "35 95% 35%",
    "--gold": "28 90% 48%",
    "--gold-light": "32 92% 62%",
    "--gold-dark": "25 88% 38%",
    "--ring": "38 92% 45%",
    "--sidebar-primary": "38 92% 45%",
    "--sidebar-ring": "38 92% 45%",
  },
  slate: {
    "--primary": "215 20% 40%",
    "--primary-foreground": "215 15% 98%",
    "--accent": "210 15% 50%",
    "--accent-foreground": "215 15% 98%",
    "--emerald": "215 20% 40%",
    "--emerald-light": "215 18% 55%",
    "--emerald-dark": "215 25% 30%",
    "--gold": "45 60% 52%",
    "--gold-light": "48 65% 66%",
    "--gold-dark": "42 55% 40%",
    "--ring": "215 20% 40%",
    "--sidebar-primary": "215 20% 40%",
    "--sidebar-ring": "215 20% 40%",
  },
};

export const themeInfo: Record<ThemeColor, { name: string; description: string; preview: string }> = {
  emerald: {
    name: "Islamic Green",
    description: "Traditional green & gold theme",
    preview: "hsl(155 82% 27%)",
  },
  ocean: {
    name: "Ocean Blue",
    description: "Calm blue tones",
    preview: "hsl(200 80% 35%)",
  },
  sunset: {
    name: "Sunset",
    description: "Warm orange & amber",
    preview: "hsl(25 90% 45%)",
  },
  royal: {
    name: "Royal Purple",
    description: "Rich purple accent",
    preview: "hsl(270 60% 45%)",
  },
  midnight: {
    name: "Midnight",
    description: "Deep navy blue",
    preview: "hsl(220 70% 40%)",
  },
  rose: {
    name: "Rose",
    description: "Elegant rose pink",
    preview: "hsl(340 75% 50%)",
  },
  crimson: {
    name: "Crimson",
    description: "Bold deep red",
    preview: "hsl(0 72% 45%)",
  },
  teal: {
    name: "Teal",
    description: "Fresh teal cyan",
    preview: "hsl(175 70% 35%)",
  },
  amber: {
    name: "Amber",
    description: "Warm golden amber",
    preview: "hsl(38 92% 45%)",
  },
  slate: {
    name: "Slate",
    description: "Professional cool gray",
    preview: "hsl(215 20% 40%)",
  },
};

function applyTheme(theme: ThemeColor) {
  const root = document.documentElement;
  const styles = themeStyles[theme];
  
  Object.entries(styles).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

function applyDarkMode(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function getSystemPreference(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeColor>("emerald");
  const [darkMode, setDarkModeState] = useState<DarkMode>("light");
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Compute actual dark state based on mode
  useEffect(() => {
    const computeDark = () => {
      if (darkMode === "system") {
        return getSystemPreference();
      }
      return darkMode === "dark";
    };
    
    const newIsDark = computeDark();
    setIsDark(newIsDark);
    applyDarkMode(newIsDark);

    // Listen for system preference changes
    if (darkMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
        applyDarkMode(e.matches);
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [darkMode]);

  const fetchTheme = useCallback(async () => {
    try {
      const { data: themeData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "color_theme")
        .single();

      if (themeData) {
        const savedTheme = themeData.value as ThemeColor;
        if (themeStyles[savedTheme]) {
          setThemeState(savedTheme);
          applyTheme(savedTheme);
        }
      }

      // Load dark mode from localStorage (user preference)
      const savedDarkMode = localStorage.getItem("dark_mode") as DarkMode;
      if (savedDarkMode && ["light", "dark", "system"].includes(savedDarkMode)) {
        setDarkModeState(savedDarkMode);
      }
    } catch (error) {
      console.error("Error fetching theme:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  // Subscribe to realtime changes for color_theme
  useEffect(() => {
    const channel = supabase
      .channel("theme_settings_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
        },
        (payload) => {
          const changedKey = (payload.new as any)?.key;
          if (changedKey === "color_theme") {
            const newTheme = (payload.new as any)?.value as ThemeColor;
            if (newTheme && themeStyles[newTheme]) {
              setThemeState(newTheme);
              applyTheme(newTheme);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setTheme = (newTheme: ThemeColor) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  const setDarkMode = (mode: DarkMode) => {
    setDarkModeState(mode);
    localStorage.setItem("dark_mode", mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, darkMode, setDarkMode, isDark, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
