import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VisitorStats {
  totalVisitors: number;
  todayVisitors: number;
  liveVisitors: number;
}

// Generate or retrieve a unique visitor ID
const getVisitorId = (): string => {
  const STORAGE_KEY = "visitor_id";
  let visitorId = localStorage.getItem(STORAGE_KEY);
  
  if (!visitorId) {
    visitorId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(STORAGE_KEY, visitorId);
  }
  
  return visitorId;
};

export const useVisitorTracking = () => {
  const [stats, setStats] = useState<VisitorStats>({
    totalVisitors: 0,
    todayVisitors: 0,
    liveVisitors: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const hasTracked = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const visitorId = getVisitorId();

    // Track the visit (only once per session)
    const trackVisit = async () => {
      if (hasTracked.current) return;
      hasTracked.current = true;

      try {
        await supabase.from("page_visits").insert({
          visitor_id: visitorId,
          page_path: window.location.pathname,
          user_agent: navigator.userAgent,
        });
      } catch (error) {
        console.error("Error tracking visit:", error);
      }
    };

    // Fetch aggregated stats using raw query on the view
    const fetchStats = async () => {
      try {
        // Query the view using rpc-like approach for views not in types
        const { data, error } = await supabase
          .rpc("get_visitor_stats" as never)
          .single();

        if (error) {
          // Fallback: Try direct fetch from view via REST API
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/visitor_stats?select=*`,
            {
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
            }
          );
          
          if (response.ok) {
            const viewData = await response.json();
            if (viewData && viewData.length > 0) {
              setStats((prev) => ({
                ...prev,
                totalVisitors: Number(viewData[0].total_visitors) || 0,
                todayVisitors: Number(viewData[0].today_visitors) || 0,
              }));
            }
          }
        } else if (data) {
          const statsData = data as { total_visitors: number; today_visitors: number };
          setStats((prev) => ({
            ...prev,
            totalVisitors: Number(statsData.total_visitors) || 0,
            todayVisitors: Number(statsData.today_visitors) || 0,
          }));
        }
      } catch (error) {
        console.error("Error fetching visitor stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Subscribe to realtime for live visitor count
    const subscribeToRealtime = () => {
      channelRef.current = supabase
        .channel("live-visitors")
        .on("presence", { event: "sync" }, () => {
          const state = channelRef.current?.presenceState();
          const liveCount = state ? Object.keys(state).length : 1;
          setStats((prev) => ({ ...prev, liveVisitors: liveCount }));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channelRef.current?.track({
              visitor_id: visitorId,
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    trackVisit();
    fetchStats();
    subscribeToRealtime();

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return { stats, isLoading };
};
