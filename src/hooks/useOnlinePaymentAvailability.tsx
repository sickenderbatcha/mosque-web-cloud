import { useAppSettings } from "@/hooks/useAppSettings";

/**
 * Resolves whether online payment is available for a given service.
 *
 * Online payment is unavailable when either:
 *  - the global kill switch `online_payment_enabled` is set to "false", or
 *  - the service specific toggle (e.g. `mahal_booking_online_disabled`) is "true".
 *
 * Admins / users with the relevant tab permission can be exempted by passing
 * `canBypass`.
 */
export const useOnlinePaymentAvailability = (
  serviceKey?: string,
  canBypass: boolean = false
) => {
  const keys = serviceKey
    ? ["online_payment_enabled", serviceKey]
    : ["online_payment_enabled"];
  const { settings, isLoading } = useAppSettings(keys);

  // Missing key => treat online payments as enabled (backwards compatible)
  const globalDisabled = settings.online_payment_enabled === "false";
  const serviceDisabled = serviceKey
    ? settings[serviceKey] === "true"
    : false;

  const disabled = !canBypass && (globalDisabled || serviceDisabled);

  return { disabled, isLoading, globalDisabled, serviceDisabled };
};
