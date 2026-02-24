import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MenuVisibilityConfig {
  // Nav menu items
  nav_home: boolean;
  nav_about: boolean;
  nav_members: boolean;
  nav_blood_donors: boolean;
  nav_gallery: boolean;
  nav_financial_statement: boolean;
  nav_events: boolean;
  nav_grievances: boolean;
  nav_contact: boolean;
  // Online services dropdown items
  nav_service_mahal: boolean;
  nav_service_donation: boolean;
  nav_service_certificates: boolean;
  nav_service_my_bookings: boolean;
  // Homepage service cards
  card_mahal: boolean;
  card_donation: boolean;
  card_certificates: boolean;
  card_events: boolean;
  card_my_bookings: boolean;
}

export const defaultMenuVisibility: MenuVisibilityConfig = {
  nav_home: true,
  nav_about: true,
  nav_members: true,
  nav_blood_donors: true,
  nav_gallery: true,
  nav_financial_statement: true,
  nav_events: true,
  nav_grievances: true,
  nav_contact: true,
  nav_service_mahal: true,
  nav_service_donation: true,
  nav_service_certificates: true,
  nav_service_my_bookings: true,
  card_mahal: true,
  card_donation: true,
  card_certificates: true,
  card_events: true,
  card_my_bookings: true,
};

const SETTINGS_KEY = "menu_visibility";
const channelName = "menu_visibility_channel";

export const useMenuVisibility = () => {
  const [visibility, setVisibility] = useState<MenuVisibilityConfig>(defaultMenuVisibility);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchVisibility = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();

      if (!error && data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          setVisibility({ ...defaultMenuVisibility, ...parsed });
        } catch {
          setVisibility(defaultMenuVisibility);
        }
      }
    } catch (err) {
      console.error("useMenuVisibility fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisibility();
  }, [fetchVisibility]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`${channelName}_${Math.random().toString(36).slice(2, 7)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload) => {
          const changedKey = (payload.new as any)?.key || (payload.old as any)?.key;
          if (changedKey === SETTINGS_KEY) {
            fetchVisibility();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVisibility]);

  const isVisible = (key: keyof MenuVisibilityConfig): boolean => {
    return visibility[key] ?? true;
  };

  return { visibility, isLoading, isVisible };
};
