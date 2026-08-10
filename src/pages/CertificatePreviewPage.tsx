import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCertificateAccessStatus } from "@/lib/certificatePayments";
import DeathCertificatePreview from "@/components/DeathCertificatePreview";
import MarriageCertificatePreview from "@/components/MarriageCertificatePreview";
import HeirCertificatePreview from "@/components/HeirCertificatePreview";
import OutsideMarriageCertificatePreview from "@/components/OutsideMarriageCertificatePreview";
import NocCertificatePreview from "@/components/NocCertificatePreview";
import { DeathRecord } from "@/utils/deathCertificatePdf";
import { MarriageRecord } from "@/utils/marriageCertificatePdf";
import { OutsideMarriageRecord, generateOutsideMarriageCertificatePdf, printOutsideMarriageCertificate } from "@/utils/outsideMarriageCertificatePdf";
import { HeirRecord, generateHeirCertificatePdf, printHeirCertificate } from "@/utils/heirCertificatePdf";
import { NocRecord, generateNocCertificatePdf, printNocCertificate } from "@/utils/nocCertificatePdf";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Loader2, Lock } from "lucide-react";
import { generateDeathCertificatePdf, printDeathCertificate } from "@/utils/deathCertificatePdf";
import { generateMarriageCertificatePdf, printMarriageCertificate } from "@/utils/marriageCertificatePdf";
import { useUserRole } from "@/hooks/useUserRole";

type CertificateType = "death" | "marriage" | "heir" | "outside_marriage" | "noc";

export default function CertificatePreviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get("type") as CertificateType | null;
  const id = searchParams.get("id");

  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [deathRecord, setDeathRecord] = useState<DeathRecord | null>(null);
  const [marriageRecord, setMarriageRecord] = useState<MarriageRecord | null>(null);
  const [heirRecord, setHeirRecord] = useState<HeirRecord | null>(null);
  const [outsideMarriageRecord, setOutsideMarriageRecord] = useState<OutsideMarriageRecord | null>(null);
  const [nocRecord, setNocRecord] = useState<NocRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentChecked, setPaymentChecked] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!type || !id) {
        setLoading(false);
        setPaymentChecked(true);
        setIsPaid(false);
        return;
      }

      setLoading(true);
      setPaymentChecked(false);

      try {
        let paid = false;

        if (type === "death") {
          const [{ data: rows }, access] = await Promise.all([
            supabase.rpc("get_death_register", { _id: id }),
            getCertificateAccessStatus({ referenceId: id, certificateType: type }),
          ]);
          const data = rows?.[0];
          if (data) setDeathRecord(data as DeathRecord);
          paid = access.isPaid;
        } else if (type === "marriage") {
          const [{ data }, access] = await Promise.all([
            supabase.from("marriage_registers").select("*").eq("id", id).single(),
            getCertificateAccessStatus({ referenceId: id, certificateType: type }),
          ]);
          if (data) setMarriageRecord(data as MarriageRecord);
          paid = access.isPaid;
        } else if (type === "outside_marriage") {
          const [{ data }, access] = await Promise.all([
            supabase.from("outside_marriage_registers").select("*").eq("id", id).single(),
            getCertificateAccessStatus({ referenceId: id, certificateType: "outside_marriage" }),
          ]);
          if (data) setOutsideMarriageRecord(data as OutsideMarriageRecord);
          paid = access.isPaid;
        } else if (type === "heir") {
          // Heir certificates track payment in their own table
          const { data, error } = await supabase
            .from("heir_certificates")
            .select("*")
            .eq("id", id)
            .single();

          if (!error && data) {
            setHeirRecord(data as unknown as HeirRecord);
            paid = data.payment_status === "completed";
          }
        } else if (type === "noc") {
          const { data, error } = await supabase
            .from("noc_certificates")
            .select("*")
            .eq("id", id)
            .single();

          if (!error && data) {
            setNocRecord(data as unknown as NocRecord);
            // Admins can always access; otherwise check payment
            paid = isAdmin || data.payment_status === "completed";
          }
        }

        setIsPaid(paid);
        setPaymentChecked(true);
      } catch (err) {
        console.error("Failed to fetch record/payment:", err);
        setIsPaid(false);
        setPaymentChecked(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [type, id]);

  const handlePrint = async () => {
    if (!isPaid) return;

    setActionLoading(true);
    try {
      if (type === "death" && deathRecord) {
        await printDeathCertificate(deathRecord);
      } else if (type === "marriage" && marriageRecord) {
        await printMarriageCertificate(marriageRecord);
      } else if (type === "outside_marriage" && outsideMarriageRecord) {
        await printOutsideMarriageCertificate(outsideMarriageRecord);
      } else if (type === "heir" && heirRecord) {
        await printHeirCertificate(heirRecord);
      } else if (type === "noc" && nocRecord) {
        await printNocCertificate(nocRecord);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!isPaid) return;

    setActionLoading(true);
    try {
      if (type === "death" && deathRecord) {
        await generateDeathCertificatePdf(deathRecord);
      } else if (type === "marriage" && marriageRecord) {
        await generateMarriageCertificatePdf(marriageRecord);
      } else if (type === "outside_marriage" && outsideMarriageRecord) {
        await generateOutsideMarriageCertificatePdf(outsideMarriageRecord);
      } else if (type === "heir" && heirRecord) {
        await generateHeirCertificatePdf(heirRecord);
      } else if (type === "noc" && nocRecord) {
        await generateNocCertificatePdf(nocRecord);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!type || !id || (type === "death" && !deathRecord) || (type === "marriage" && !marriageRecord) || (type === "outside_marriage" && !outsideMarriageRecord) || (type === "heir" && !heirRecord) || (type === "noc" && !nocRecord)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
        <p className="text-lg text-muted-foreground mb-4">Certificate not found or invalid parameters.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const title = type === "death" 
    ? "இறப்புச்சான்றிதழ் - Death Certificate" 
    : type === "marriage" 
    ? "திருமணச்சான்றிதழ் - Marriage Certificate"
    : type === "outside_marriage"
    ? "வெளியூர் திருமணச்சான்றிதழ் - Marriage Certificate"
    : type === "noc"
    ? "ஆட்சேபனையின்மை சான்றிதழ் - NOC"
    : "வாரிசு சான்றிதழ் - Heir Certificate";

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Toolbar - hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            பின்செல் / Back
          </Button>
          <h1 className="text-lg font-semibold font-tamil hidden sm:block">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={actionLoading || !paymentChecked || !isPaid}>
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : !isPaid ? (
              <Lock className="h-4 w-4 mr-2" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Print
          </Button>
          <Button onClick={handleDownload} disabled={actionLoading || !paymentChecked || !isPaid}>
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : !isPaid ? (
              <Lock className="h-4 w-4 mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Certificate Preview */}
      <div className="p-4 md:p-8 print:p-0">
        {type === "death" && deathRecord && (
          <DeathCertificatePreview record={deathRecord} />
        )}
        {type === "marriage" && marriageRecord && (
          <MarriageCertificatePreview record={marriageRecord} />
        )}
        {type === "outside_marriage" && outsideMarriageRecord && (
          <OutsideMarriageCertificatePreview record={outsideMarriageRecord} />
        )}
        {type === "heir" && heirRecord && (
          <HeirCertificatePreview record={heirRecord} />
        )}
        {type === "noc" && nocRecord && (
          <NocCertificatePreview record={nocRecord} />
        )}
      </div>
    </div>
  );
}
