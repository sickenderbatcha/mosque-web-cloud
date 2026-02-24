import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LandingContent {
  [key: string]: string;
}

interface LandingContentBySection {
  hero: LandingContent;
  about: LandingContent;
  services: LandingContent;
  cta: LandingContent;
  disclaimer: LandingContent;
  about_hero: LandingContent;
  about_history: LandingContent;
  about_mosques: LandingContent;
  about_wakf: LandingContent;
  about_management: LandingContent;
  [key: string]: LandingContent;
}

const emptyContent: LandingContentBySection = {
  hero: {},
  about: {},
  services: {},
  cta: {},
  disclaimer: {},
  about_hero: {},
  about_history: {},
  about_mosques: {},
  about_wakf: {},
  about_management: {},
};

export const useLandingContent = () => {
  const [content, setContent] = useState<LandingContentBySection>({ ...emptyContent });
  const [isLoading, setIsLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("landing_page_content")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;

      const organized: LandingContentBySection = { ...emptyContent };

      data?.forEach((item: any) => {
        const section = item.section as string;
        const language = item.language as string;
        if (!organized[section]) {
          organized[section] = {};
        }
        // Store with language suffix for non-Tamil content
        const key = language === "ta" ? item.content_key : `${item.content_key}_${language}`;
        organized[section][key] = item.content_value;
      });

      setContent(organized);
    } catch (error) {
      console.error("Error fetching landing content:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Subscribe to realtime changes on landing_page_content
  useEffect(() => {
    const channel = supabase
      .channel("landing_content_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "landing_page_content",
        },
        () => {
          fetchContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchContent]);

  const getContent = useCallback(
    (section: string, key: string): string => {
      return content[section]?.[key] || "";
    },
    [content]
  );

  return { content, isLoading, getContent };
};
