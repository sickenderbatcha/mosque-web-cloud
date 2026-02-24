import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useHomepageVideo = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHeroVideo = useCallback(async () => {
    try {
      const { data: videoData } = await supabase.storage
        .from("certificate-assets")
        .list("", { search: "homepage-hero-video" });

      const videoFile = videoData?.find((f) =>
        f.name.toLowerCase().startsWith("homepage-hero-video.")
      );

      if (videoFile) {
        const { data: videoUrlData } = supabase.storage
          .from("certificate-assets")
          .getPublicUrl(videoFile.name);

        setVideoUrl(`${videoUrlData.publicUrl}?t=${Date.now()}`);
      } else {
        setVideoUrl(null);
      }
    } catch (error) {
      console.error("Error fetching homepage hero video:", error);
      setVideoUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeroVideo();
  }, [fetchHeroVideo]);

  return { videoUrl, isLoading };
};

// Keep export for backward compatibility but it's now a no-op
export const clearHomepageVideoCache = () => {};
