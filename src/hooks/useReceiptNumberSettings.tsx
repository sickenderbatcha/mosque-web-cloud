import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ReceiptNumberSettings,
  DEFAULT_RECEIPT_NUMBER_SETTINGS,
  formatReceiptNumber,
  lookupReceiptNumberByType,
  ReceiptType,
} from "@/lib/receiptNumberSettings";

const RECEIPT_NUMBER_KEYS = [
  "receipt_num_prefix_booking",
  "receipt_num_prefix_donation",
  "receipt_num_prefix_subscription",
  "receipt_num_prefix_cash_payment",
  "receipt_num_prefix_cert_noc",
  "receipt_num_prefix_cert_heir",
  "receipt_num_prefix_cert_general",
];

export const useReceiptNumberSettings = () => {
  const [settings, setSettings] = useState<ReceiptNumberSettings>(DEFAULT_RECEIPT_NUMBER_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", RECEIPT_NUMBER_KEYS);

      if (error) {
        console.error("Error fetching receipt number settings:", error);
        return;
      }

      const result: ReceiptNumberSettings = { ...DEFAULT_RECEIPT_NUMBER_SETTINGS };

      if (data && data.length > 0) {
        const keyToField: Record<string, keyof ReceiptNumberSettings> = {
          receipt_num_prefix_booking: "booking_prefix",
          receipt_num_prefix_donation: "donation_prefix",
          receipt_num_prefix_subscription: "subscription_prefix",
          receipt_num_prefix_cash_payment: "cash_payment_prefix",
          receipt_num_prefix_cert_noc: "certificate_noc_prefix",
          receipt_num_prefix_cert_heir: "certificate_heir_prefix",
          receipt_num_prefix_cert_general: "certificate_general_prefix",
        };

        data.forEach((item) => {
          const field = keyToField[item.key];
          if (field && item.value) {
            result[field] = item.value;
          }
        });
      }

      setSettings(result);
    } catch (error) {
      console.error("Error fetching receipt number settings:", error);
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
      .channel("receipt_number_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
        },
        (payload) => {
          const changedKey = (payload.new as any)?.key || (payload.old as any)?.key;
          if (changedKey && RECEIPT_NUMBER_KEYS.includes(changedKey)) {
            fetchSettings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  /**
   * Get a receipt number using local prefix + uniqueId (fallback format).
   * Use this when the sequential number from DB is not available.
   */
  const getReceiptNumber = (type: ReceiptType, uniqueId: string) => {
    return formatReceiptNumber(type, uniqueId, settings);
  };

  /**
   * Look up the sequential receipt number from the income table.
   * Returns the DB-assigned sequential number (e.g., BK-2026-0001),
   * or falls back to prefix+uniqueId if not found.
   */
  const getSequentialReceiptNumber = async (
    type: ReceiptType,
    referenceId: string,
    fallbackUniqueId?: string
  ): Promise<string> => {
    const dbNumber = await lookupReceiptNumberByType(type, referenceId);
    if (dbNumber) return dbNumber;
    // Fallback to old format
    return formatReceiptNumber(type, fallbackUniqueId || referenceId.slice(0, 8).toUpperCase(), settings);
  };

  return { settings, isLoading, getReceiptNumber, getSequentialReceiptNumber };
};
