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

const RECEIPT_SEQUENCE_PATTERN = /-\d{4}-\d{4,}$/;

export const isSequentialReceiptNumber = (value?: string | null): value is string => {
  if (!value) return false;
  return RECEIPT_SEQUENCE_PATTERN.test(value.trim());
};

interface ReceiptRow {
  reference_id: string | null;
  receipt_number: string | null;
  created_at: string;
}

export async function getLatestSequentialReceiptMap(params: {
  referenceIds: string[];
  referenceTypes: string[];
  retries?: number;
  retryDelayMs?: number;
}): Promise<Record<string, string>> {
  const {
    referenceIds,
    referenceTypes,
    retries = 5,
    retryDelayMs = 1000,
  } = params;

  if (!referenceIds.length || !referenceTypes.length) return {};

  const uniqueReferenceIds = Array.from(new Set(referenceIds));
  const uniqueReferenceTypes = Array.from(new Set(referenceTypes));

  for (let attempt = 0; attempt < retries; attempt++) {
    const { data, error } = await supabase
      .from("income")
      .select("receipt_number, reference_id, created_at")
      .in("reference_id", uniqueReferenceIds)
      .in("reference_type", uniqueReferenceTypes)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const map: Record<string, string> = {};
    (data as ReceiptRow[] | null)?.forEach((row) => {
      if (!row.reference_id || map[row.reference_id]) return;
      if (isSequentialReceiptNumber(row.receipt_number)) {
        map[row.reference_id] = row.receipt_number;
      }
    });

    const unresolvedCount = uniqueReferenceIds.filter((id) => !map[id]).length;
    if (unresolvedCount === 0 || attempt === retries - 1) {
      return map;
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }

  return {};
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

