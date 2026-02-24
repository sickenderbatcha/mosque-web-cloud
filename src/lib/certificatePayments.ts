import { supabase } from "@/integrations/supabase/client";

export type CertificateType = "marriage" | "death" | "bonafide" | "noc" | "outside_marriage" | (string & {});

export interface CertificatePaymentLite {
  id: string;
  payment_status: string;
  transaction_id: string | null;
  created_at?: string;
}

export interface CertificateAccessStatus {
  isPaid: boolean;
  /**
   * Status we should display/act on. If any completed payment exists, this will be "completed".
   * Otherwise it's the latest known status (or null if no payment record exists).
   */
  paymentStatus: string | null;
  /** Latest completed payment record (if exists) */
  completedPayment: CertificatePaymentLite | null;
}

export async function getCertificateAccessStatus(params: {
  referenceId: string;
  certificateType: CertificateType;
}): Promise<CertificateAccessStatus> {
  const { referenceId, certificateType } = params;

  const [completedRes, latestRes] = await Promise.all([
    supabase
      .from("certificate_payments")
      .select("id, payment_status, transaction_id, created_at")
      .eq("reference_id", referenceId)
      .eq("certificate_type", certificateType)
      .eq("payment_status", "completed")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("certificate_payments")
      .select("payment_status, created_at")
      .eq("reference_id", referenceId)
      .eq("certificate_type", certificateType)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const completedPayment = (completedRes.data?.[0] as CertificatePaymentLite | undefined) ?? null;
  const latestStatus = (latestRes.data?.[0] as { payment_status: string } | undefined)?.payment_status ?? null;

  return {
    isPaid: !!completedPayment,
    paymentStatus: completedPayment ? "completed" : latestStatus,
    completedPayment,
  };
}
