import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReceiptHeaderSettings, DEFAULT_RECEIPT_HEADER } from "@/lib/receiptHeaderSettings";

const RECEIPT_HEADER_KEYS = [
  "receipt_header_org_name_ta",
  "receipt_header_org_name_en",
  "receipt_header_address_1",
  "receipt_header_address_2",
  "receipt_header_phone",
  "receipt_header_footer_ta",
  "receipt_header_footer_en",
];

export const useReceiptHeaderSettings = () => {
  const [settings, setSettings] = useState<ReceiptHeaderSettings>(DEFAULT_RECEIPT_HEADER);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", RECEIPT_HEADER_KEYS);

      if (error) {
        console.error("Error fetching receipt header settings:", error);
        return;
      }

      const result: ReceiptHeaderSettings = { ...DEFAULT_RECEIPT_HEADER };

      if (data && data.length > 0) {
        data.forEach((item) => {
          switch (item.key) {
            case "receipt_header_org_name_ta":
              if (item.value) result.organizationNameTa = item.value;
              break;
            case "receipt_header_org_name_en":
              if (item.value) result.organizationNameEn = item.value;
              break;
            case "receipt_header_address_1":
              if (item.value) result.addressLine1 = item.value;
              break;
            case "receipt_header_address_2":
              if (item.value) result.addressLine2 = item.value;
              break;
            case "receipt_header_phone":
              if (item.value) result.phone = item.value;
              break;
            case "receipt_header_footer_ta":
              if (item.value) result.footerMessage = item.value;
              break;
            case "receipt_header_footer_en":
              if (item.value) result.footerMessageEn = item.value;
              break;
          }
        });
      }

      setSettings(result);
    } catch (error) {
      console.error("Error fetching receipt header settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("receipt_header_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
        },
        (payload) => {
          const changedKey = (payload.new as any)?.key || (payload.old as any)?.key;
          if (changedKey && RECEIPT_HEADER_KEYS.includes(changedKey)) {
            fetchSettings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return { settings, isLoading };
};
