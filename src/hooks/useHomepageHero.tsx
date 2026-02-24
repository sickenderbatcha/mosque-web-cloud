import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultHeroImage from "@/assets/mosque-hero.jpg";

export const useHomepageHero = () => {
  const [heroUrl, setHeroUrl] = useState<string>(defaultHeroImage);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHeroImage = useCallback(async () => {
    try {
      const { data: heroData } = await supabase.storage
        .from("certificate-assets")
        .list("", { search: "homepage-hero" });

      const heroFile = heroData?.find((f) =>
        f.name.toLowerCase().startsWith("homepage-hero.")
      );

      if (heroFile) {
        const { data: heroUrlData } = supabase.storage
          .from("certificate-assets")
          .getPublicUrl(heroFile.name);

        setHeroUrl(`${heroUrlData.publicUrl}?t=${Date.now()}`);
      } else {
        setHeroUrl(defaultHeroImage);
      }
    } catch (error) {
      console.error("Error fetching homepage hero image:", error);
      setHeroUrl(defaultHeroImage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeroImage();
  }, [fetchHeroImage]);

  return { heroUrl, isLoading };
};

// Keep export for backward compatibility but it's now a no-op
export const clearHomepageHeroCache = () => {};
