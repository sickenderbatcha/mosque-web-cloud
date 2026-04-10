import { useAppSettings } from "@/hooks/useAppSettings";

/**
 * Hook to check if online payment is enabled globally.
 * Controlled by the super admin via the `online_payment_enabled` app_setting.
 * Defaults to true (enabled) if no setting exists.
 */
export const useOnlinePaymentEnabled = () => {
  const { getSetting, isLoading } = useAppSettings(["online_payment_enabled"]);
  const raw = getSetting("online_payment_enabled");
  // Default to enabled if no setting is found
  const isEnabled = raw === "" || raw === "true";
  return { isOnlinePaymentEnabled: isEnabled, isLoading };
};
