import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HomepageSection {
  id: string;
  name: string;
  label: string;
  labelTamil: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_SECTIONS: HomepageSection[] = [
  { id: "hero", name: "hero", label: "Hero", labelTamil: "ஹீரோ", enabled: true, order: 0 },
  { id: "committee", name: "committee", label: "Management Committee", labelTamil: "நிர்வாகக் குழு உறுப்பினர்கள்", enabled: true, order: 1 },
  { id: "announcements", name: "announcements", label: "Announcements", labelTamil: "அறிவிப்புகள்", enabled: true, order: 2 },
  { id: "jumuah", name: "jumuah", label: "Jumu'ah Countdown", labelTamil: "ஜுமுஆ கவுன்ட்டவுன்", enabled: true, order: 3 },
  { id: "services", name: "services", label: "Online Services", labelTamil: "ஆன்லைன் சேவைகள்", enabled: true, order: 4 },
  { id: "backoffice", name: "backoffice", label: "Back Office", labelTamil: "பின் அலுவலகப் பணிகள்", enabled: true, order: 5 },
  { id: "prayer", name: "prayer", label: "Prayer Times", labelTamil: "தொழுகை நேரங்கள்", enabled: true, order: 6 },
  { id: "calendar", name: "calendar", label: "Islamic Calendar", labelTamil: "இஸ்லாமிய நாட்காட்டி", enabled: true, order: 7 },
  { id: "about", name: "about", label: "About Preview", labelTamil: "எங்களை பற்றி", enabled: true, order: 8 },
  { id: "cta", name: "cta", label: "Call to Action", labelTamil: "அழைப்பு", enabled: true, order: 9 },
];


// Simple session cache (expires on page reload)
let sessionCache: { sections: HomepageSection[]; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds TTL

export const clearHomepageSectionOrderCache = () => {
  sessionCache = null;
};

export const useHomepageSectionOrder = () => {
  const [sections, setSections] = useState<HomepageSection[]>(DEFAULT_SECTIONS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSectionOrder = useCallback(async () => {
    // Check if cache is valid
    if (sessionCache && Date.now() - sessionCache.timestamp < CACHE_TTL) {
      setSections(sessionCache.sections);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "homepage_section_order")
        .single();

      if (data && !error) {
        try {
          const parsed = JSON.parse(data.value) as HomepageSection[];
          // Merge with defaults to ensure new sections are included
          const mergedSections = DEFAULT_SECTIONS.map((defaultSection) => {
            const savedSection = parsed.find((s) => s.id === defaultSection.id);
            if (savedSection) {
              return { ...defaultSection, ...savedSection };
            }
            return defaultSection;
          });
          // Sort by order
          mergedSections.sort((a, b) => a.order - b.order);
          sessionCache = { sections: mergedSections, timestamp: Date.now() };
          setSections(mergedSections);
        } catch (parseError) {
          console.error("Error parsing section order:", parseError);
          setSections(DEFAULT_SECTIONS);
        }
      } else {
        setSections(DEFAULT_SECTIONS);
      }
    } catch (error) {
      console.error("Error fetching section order:", error);
      setSections(DEFAULT_SECTIONS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSectionOrder();

    // Subscribe to realtime updates for instant sync
    const channel = supabase
      .channel("homepage-section-order")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
          filter: "key=eq.homepage_section_order",
        },
        () => {
          // Clear cache and refetch on any change
          clearHomepageSectionOrderCache();
          fetchSectionOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSectionOrder]);

  const getEnabledSections = useCallback(() => {
    return sections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  }, [sections]);

  return { sections, isLoading, getEnabledSections };
};

export const saveSectionOrder = async (sections: HomepageSection[]) => {
  try {
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("key", "homepage_section_order")
      .single();

    const value = JSON.stringify(sections);

    if (existing) {
      await supabase
        .from("app_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", "homepage_section_order");
    } else {
      await supabase.from("app_settings").insert({
        key: "homepage_section_order",
        value,
        description: "Homepage section order and visibility settings",
      });
    }

    // Clear cache to force refetch
    clearHomepageSectionOrderCache();
    return { success: true };
  } catch (error: any) {
    console.error("Error saving section order:", error);
    return { success: false, error: error.message };
  }
};

export { DEFAULT_SECTIONS };
