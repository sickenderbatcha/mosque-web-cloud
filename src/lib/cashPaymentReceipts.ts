import { supabase } from "@/integrations/supabase/client";

export interface CashRequestLike {
  id: string;
  service_type: string;
  reference_id: string | null;
  amount: number;
  applicant_name: string;
  applicant_phone: string;
  applicant_email: string | null;
  user_id?: string | null;
  service_details?: Record<string, any> | null;
}

/** Service types whose income/receipt is tracked through certificate_payments */
export const CERTIFICATE_SERVICE_TYPES = [
  "certificate",
  "noc",
  "heir",
  "outside_marriage_certificate",
];

export const resolveCertificateType = (request: CashRequestLike): string => {
  switch (request.service_type) {
    case "noc":
      return "noc";
    case "heir":
      return "heir";
    case "outside_marriage_certificate":
      return "outside_marriage";
    default: {
      const details = request.service_details || {};
      const fromDetails =
        details.certificateType || details.certificate_type || details.type;
      return typeof fromDetails === "string" && fromDetails.trim()
        ? fromDetails.trim()
        : "bonafide";
    }
  }
};

/**
 * Ensures a completed cash certificate_payments row exists for the request.
 * The DB trigger on certificate_payments issues the running receipt number
 * into the income ledger once the row becomes completed.
 * Idempotent: reuses an existing row for the same reference_id + certificate_type.
 * Returns the certificate_payments id (income reference_id) or null.
 */
export async function ensureCompletedCashCertificatePayment(
  request: CashRequestLike,
  certificateTypeOverride?: string
): Promise<string | null> {
  if (!request.reference_id) return null;

  const certificateType = certificateTypeOverride || resolveCertificateType(request);
  const transactionId = `CASH-${request.id.slice(0, 8).toUpperCase()}`;

  const { data: existingPayments, error: existingError } = await supabase
    .from("certificate_payments")
    .select("id, payment_status, payment_method")
    .eq("reference_id", request.reference_id)
    .eq("certificate_type", certificateType)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) throw existingError;

  const existingPayment = existingPayments?.[0];

  if (existingPayment) {
    if (
      existingPayment.payment_status !== "completed" ||
      existingPayment.payment_method !== "cash"
    ) {
      const { error: updateError } = await supabase
        .from("certificate_payments")
        .update({
          payment_status: "completed",
          payment_method: "cash",
          amount: request.amount,
          applicant_name: request.applicant_name,
          applicant_phone: request.applicant_phone,
          applicant_email: request.applicant_email,
          user_id: request.user_id ?? null,
          transaction_id: transactionId,
        })
        .eq("id", existingPayment.id);

      if (updateError) throw updateError;
    }

    return existingPayment.id;
  }

  const { data: createdPayment, error: createError } = await supabase
    .from("certificate_payments")
    .insert({
      reference_id: request.reference_id,
      certificate_type: certificateType,
      applicant_name: request.applicant_name,
      applicant_phone: request.applicant_phone,
      applicant_email: request.applicant_email,
      user_id: request.user_id ?? null,
      amount: request.amount,
      payment_status: "pending",
      payment_method: "cash",
      transaction_id: transactionId,
    })
    .select("id")
    .single();

  if (createError) throw createError;

  const { error: finalizeError } = await supabase
    .from("certificate_payments")
    .update({ payment_status: "completed", payment_method: "cash" })
    .eq("id", createdPayment.id);

  if (finalizeError) throw finalizeError;

  return createdPayment.id;
}
