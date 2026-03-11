import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Search, Printer, Download, CreditCard, Loader2, IndianRupee, Check, Lock, ExternalLink } from "lucide-react";
import { IsoDatePicker } from "@/components/forms/IsoDatePicker";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { getCertificateAccessStatus } from "@/lib/certificatePayments";
import { generateMarriageCertificatePdf, printMarriageCertificate, MarriageRecord } from "@/utils/marriageCertificatePdf";
import { generateDeathCertificatePdf, printDeathCertificate, DeathRecord } from "@/utils/deathCertificatePdf";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { useAppSettings } from "@/hooks/useAppSettings";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface MarriageSearchResult {
  id: string;
  groom_name: string;
  bride_name: string;
  gregorian_day: number;
  gregorian_month: string;
  gregorian_year: number;
}

interface DeathSearchResult {
  id: string;
  deceased_name: string;
  deceased_father_name: string;
  gregorian_day: number;
  gregorian_month: string;
  gregorian_year: number;
  death_date: string;
}

interface CertificatePayment {
  id: string;
  payment_status: string;
  transaction_id: string | null;
}

const ServicesPage = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { settings, isLoading: settingsLoading } = useAppSettings(["certificate_fee"]);
  const certificateFee = parseInt(settings.certificate_fee) || 100;

  const [activeCertificateType, setActiveCertificateType] = useState<
    "marriage" | "death" | "bonafide" | "noc" | "heir"
  >("marriage");

  const [searchDate, setSearchDate] = useState("");
  const [membershipNo, setMembershipNo] = useState("");
  const [selectedRecord, setSelectedRecord] = useState("");
  const [marriageRecords, setMarriageRecords] = useState<MarriageSearchResult[]>([]);
  const [fullMarriageRecord, setFullMarriageRecord] = useState<MarriageRecord | null>(null);
  const [deathRecords, setDeathRecords] = useState<DeathSearchResult[]>([]);
  const [fullDeathRecord, setFullDeathRecord] = useState<DeathRecord | null>(null);
  const [deathSearchDate, setDeathSearchDate] = useState("");

  const [isSearching, setIsSearching] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");

  const [certificatePayment, setCertificatePayment] = useState<CertificatePayment | null>(null);
  const [paymentStatusLoading, setPaymentStatusLoading] = useState(false);

  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");

  const [memberDetails, setMemberDetails] = useState({
    name: "",
    fatherName: "",
    phone: "",
    address: "",
  });
  const [memberUuid, setMemberUuid] = useState<string | null>(null);

  const currentReferenceId = (() => {
    if (activeCertificateType === "bonafide" || activeCertificateType === "noc") {
      return memberUuid || "";
    }
    return selectedRecord;
  })();

  const isPaid = certificatePayment?.payment_status === "completed";
  const canPrintOrDownload = !!currentReferenceId && !paymentStatusLoading && isPaid;


  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Clear form when switching to NOC or Bonafide tabs
  useEffect(() => {
    if (activeCertificateType === "bonafide" || activeCertificateType === "noc") {
      setMembershipNo("");
      setMemberDetails({ name: "", fatherName: "", phone: "", address: "" });
      setMemberUuid(null);
      setCertificatePayment(null);
      setApplicantName("");
      setApplicantPhone("");
      setPaymentMethod("online");
    }
  }, [activeCertificateType]);

  const handleMarriageSearch = async () => {
    if (!searchDate) {
      toast({
        title: "தேதி தேவை",
        description: "Please select a date to search",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setMarriageRecords([]);
    setSelectedRecord("");
    setFullMarriageRecord(null);
    setCertificatePayment(null);

    try {
      const dateObj = new Date(searchDate);
      const day = dateObj.getDate();
      const year = dateObj.getFullYear();
      const monthNames = ["January", "February", "March", "April", "May", "June", 
                          "July", "August", "September", "October", "November", "December"];
      const month = monthNames[dateObj.getMonth()];

      const { data, error } = await supabase
        .from("marriage_registers")
        .select("id, groom_name, bride_name, gregorian_day, gregorian_month, gregorian_year")
        .eq("gregorian_day", day)
        .eq("gregorian_month", month)
        .eq("gregorian_year", year);

      if (error) throw error;

      if (data && data.length > 0) {
        setMarriageRecords(data);
        toast({
          title: "தேடல் முடிவுகள்",
          description: `${data.length} பதிவுகள் கண்டறியப்பட்டன`,
        });
      } else {
        toast({
          title: "பதிவுகள் இல்லை",
          description: "No records found for the selected date",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "பிழை",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleRecordSelect = async (recordId: string) => {
    // Marriage & Death tabs both reuse selectedRecord.
    setSelectedRecord(recordId);
    setCertificatePayment(null);

    // Fetch full record for marriage printing
    if (activeCertificateType === "marriage") {
      const { data, error } = await supabase
        .from("marriage_registers")
        .select("*")
        .eq("id", recordId)
        .single();

      if (!error && data) {
        setFullMarriageRecord(data as MarriageRecord);
        // Auto-fill applicant name from groom name
        setApplicantName(data.groom_name || data.groom_name_en || "");
        // Reset phone to prompt user to enter
        if (!applicantPhone) {
          setApplicantPhone("");
        }
      }
    }

    // Fetch full record for death certificate printing
    if (activeCertificateType === "death") {
      const { data, error } = await supabase
        .from("death_registers")
        .select("*")
        .eq("id", recordId)
        .single();

      if (!error && data) {
        setFullDeathRecord(data as DeathRecord);
        // Auto-fill applicant name from informant name
        setApplicantName(data.informant_name || data.informant_name_en || "");
        if (data.informant_phone) {
          setApplicantPhone(data.informant_phone);
        } else if (!applicantPhone) {
          setApplicantPhone("");
        }
      }
    }
  };

  const handleDeathSearch = async () => {
    if (!deathSearchDate) {
      toast({
        title: "தேதி தேவை",
        description: "Please select a date to search",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setDeathRecords([]);
    setSelectedRecord("");
    setFullDeathRecord(null);
    setCertificatePayment(null);

    try {
      const dateObj = new Date(deathSearchDate);
      const day = dateObj.getDate();
      const year = dateObj.getFullYear();
      const monthNames = ["January", "February", "March", "April", "May", "June", 
                          "July", "August", "September", "October", "November", "December"];
      const month = monthNames[dateObj.getMonth()];

      const { data, error } = await supabase
        .from("death_registers")
        .select("id, deceased_name, deceased_father_name, gregorian_day, gregorian_month, gregorian_year, death_date")
        .eq("gregorian_day", day)
        .eq("gregorian_month", month)
        .eq("gregorian_year", year);

      if (error) throw error;

      if (data && data.length > 0) {
        setDeathRecords(data);
        toast({
          title: "தேடல் முடிவுகள்",
          description: `${data.length} பதிவுகள் கண்டறியப்பட்டன`,
        });
      } else {
        toast({
          title: "பதிவுகள் இல்லை",
          description: "No death records found for the selected date",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "பிழை",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeathPrint = async () => {
    if (!fullDeathRecord) return;
    if (!isPaid) {
      toast({
        title: "கட்டணம் தேவை",
        description: "Please complete payment first",
        variant: "destructive",
      });
      return;
    }

    setIsPrinting(true);
    try {
      await printDeathCertificate(fullDeathRecord);
    } catch (error: any) {
      toast({
        title: "பிழை",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDeathDownload = async () => {
    if (!fullDeathRecord) return;
    if (!isPaid) {
      toast({
        title: "கட்டணம் தேவை",
        description: "Please complete payment first",
        variant: "destructive",
      });
      return;
    }

    setIsPrinting(true);
    try {
      await generateDeathCertificatePdf(fullDeathRecord);
      toast({
        title: "வெற்றி",
        description: "Certificate downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "பிழை",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  useEffect(() => {
    const syncPaymentStatus = async () => {
      if (!currentReferenceId) {
        setCertificatePayment(null);
        return;
      }

      setPaymentStatusLoading(true);
      try {
        const access = await getCertificateAccessStatus({
          referenceId: currentReferenceId,
          certificateType: activeCertificateType,
        });

        if (access.completedPayment) {
          setCertificatePayment({
            id: access.completedPayment.id,
            payment_status: "completed",
            transaction_id: access.completedPayment.transaction_id ?? null,
          });
        } else {
          setCertificatePayment(null);
        }
      } finally {
        setPaymentStatusLoading(false);
      }
    };

    syncPaymentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCertificateType, currentReferenceId]);

  const initiatePayment = async () => {
    if (!currentReferenceId || !applicantName || !applicantPhone) {
      toast({
        title: "விவரங்கள் தேவை",
        description: "Please select a record and fill applicant name & phone number",
        variant: "destructive",
      });
      return;
    }

    setIsPaymentLoading(true);

    try {
      // Create certificate payment record
      const { data: paymentRecord, error: insertError } = await supabase
        .from("certificate_payments")
        .insert({
          certificate_type: activeCertificateType,
          reference_id: currentReferenceId,
          user_id: user?.id || null,
          applicant_name: applicantName,
          applicant_phone: applicantPhone,
          amount: certificateFee,
          payment_status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // For cash payments (admin only)
      if (isAdmin && paymentMethod === "cash") {
        const { error: updateError } = await supabase
          .from("certificate_payments")
          .update({
            payment_status: "completed",
            payment_method: "cash",
            admin_notes: "Cash payment received by admin",
            processed_by: user?.id,
          })
          .eq("id", paymentRecord.id);

        if (updateError) throw updateError;

        setCertificatePayment({
          id: paymentRecord.id,
          payment_status: "completed",
          transaction_id: "CASH-" + paymentRecord.id.substring(0, 8).toUpperCase(),
        });

        toast({
          title: "பணம் பெறப்பட்டது!",
          description: "Cash payment recorded. Certificate is ready to print/download.",
        });
        setIsPaymentLoading(false);
        return;
      }

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            amount: certificateFee,
            certificatePaymentId: paymentRecord.id,
            type: "certificate",
            notes: {
              certificatePaymentId: paymentRecord.id,
              certificateType: activeCertificateType,
              referenceId: currentReferenceId,
            },
          },
        }
      );

      if (orderError || !orderData?.orderId) {
        throw new Error(orderError?.message || "Failed to create payment order");
      }

      const descriptionByType: Record<string, string> = {
        marriage: "Marriage Certificate Fee",
        death: "Death Certificate Fee",
        bonafide: "Bonafide Certificate Fee",
        noc: "No Objection Certificate Fee",
      };

      // Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "இளையான்குடி பள்ளிவாசல்",
        description: descriptionByType[activeCertificateType] ?? "Certificate Fee",
        order_id: orderData.orderId,
        handler: async (response: any) => {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
            "create-razorpay-order?action=verify",
            {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                certificatePaymentId: paymentRecord.id,
                type: "certificate",
              },
            }
          );

          if (verifyError || !verifyData?.verified) {
            toast({
              title: "பணம் செலுத்தல் சரிபார்ப்பு தோல்வி",
              description: "Payment verification failed. Please contact support.",
              variant: "destructive",
            });
            return;
          }

          setCertificatePayment({
            id: paymentRecord.id,
            payment_status: "completed",
            transaction_id: response.razorpay_payment_id,
          });

          toast({
            title: "பணம் செலுத்தப்பட்டது!",
            description: "Payment successful. Certificate is ready to print/download.",
          });
        },
        prefill: {
          name: applicantName,
          contact: applicantPhone,
        },
        theme: {
          color: "#1a5f4a",
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "பணம் செலுத்தல் ரத்து",
              description: "Payment was cancelled.",
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "பணம் செலுத்தல் பிழை",
        description: error.message || "Failed to initiate payment.",
        variant: "destructive",
      });
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleMarriagePrint = async () => {
    if (!fullMarriageRecord) return;
    if (!isPaid) {
      toast({
        title: "கட்டணம் தேவை",
        description: "Please complete payment first",
        variant: "destructive",
      });
      return;
    }

    setIsPrinting(true);
    try {
      await printMarriageCertificate(fullMarriageRecord);
    } catch (error: any) {
      toast({
        title: "பிழை",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleMarriageDownload = async () => {
    if (!fullMarriageRecord) return;
    if (!isPaid) {
      toast({
        title: "கட்டணம் தேவை",
        description: "Please complete payment first",
        variant: "destructive",
      });
      return;
    }

    setIsPrinting(true);
    try {
      await generateMarriageCertificatePdf(fullMarriageRecord);
      toast({
        title: "வெற்றி",
        description: "Certificate downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "பிழை",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const [isMemberSearching, setIsMemberSearching] = useState(false);

  const handleMemberLookup = async () => {
    if (!membershipNo.trim()) {
      toast({
        title: "உறுப்பினர் எண் தேவை",
        description: "Please enter a membership number",
        variant: "destructive",
      });
      return;
    }

    setIsMemberSearching(true);
    setMemberDetails({ name: "", fatherName: "", phone: "", address: "" });
    setMemberUuid(null);

    try {
      const { data, error } = await supabase
        .from("gb_members")
        .select("id, full_name, father_name, phone, address")
        .eq("member_id", membershipNo.trim())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast({
          title: "உறுப்பினர் கிடைக்கவில்லை",
          description: "No active member found with this membership number",
          variant: "destructive",
        });
        return;
      }

      setMemberUuid(data.id);
      setMemberDetails({
        name: data.full_name || "",
        fatherName: data.father_name || "",
        phone: data.phone || "",
        address: data.address || "",
      });
      setApplicantName(data.full_name || "");
      setApplicantPhone(data.phone || "");

      toast({
        title: "உறுப்பினர் கண்டறியப்பட்டது",
        description: "Member details loaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "பிழை",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsMemberSearching(false);
    }
  };

  const handlePrint = () => {
    if (!canPrintOrDownload) {
      toast({
        title: "கட்டணம் தேவை",
        description: "Please complete payment first",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "அச்சிடுகிறது",
      description: "Opening print dialog...",
    });
    window.print();
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <FileText className="h-16 w-16 mx-auto mb-4 text-secondary" />
            <h1 className="text-3xl md:text-5xl font-bold font-tamil text-primary-foreground mb-4">
              சான்றிதழ்கள்
            </h1>
            <p className="text-primary-foreground/80 font-display text-xl">
              Services - Certificates & Documents
            </p>
          </motion.div>
        </div>
      </section>

      {/* Auth Notice */}
      <section className="py-4 bg-secondary/20">
        <div className="container mx-auto px-4">
          <Alert className="border-secondary bg-secondary/10">
            <Lock className="h-4 w-4" />
            <AlertDescription className="font-tamil">
              இந்த சேவைகள் உறுப்பினர்களுக்கு மட்டுமே. தயவுசெய்து உள்நுழைந்து பயன்படுத்தவும்.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-background islamic-pattern">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Tabs
              defaultValue="marriage"
              className="w-full"
              onValueChange={(v) => {
                const next = v as "marriage" | "death" | "bonafide" | "noc" | "heir";
                setActiveCertificateType(next);
                setCertificatePayment(null);
                setIsPrinting(false);
              }}
            >
              {/* NOTE: TabsList base component uses `inline-flex h-10`; we override with !grid/!h-auto to avoid cut-off on mobile */}
              <TabsList className="!grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 !h-auto mb-8">
                <TabsTrigger value="marriage" className="font-tamil text-xs sm:text-sm !whitespace-normal text-center leading-tight px-2 py-2">
                  திருமண சான்றிதழ்
                </TabsTrigger>
                <TabsTrigger value="death" className="font-tamil text-xs sm:text-sm !whitespace-normal text-center leading-tight px-2 py-2">
                  இறப்புச் சான்றிதழ்
                </TabsTrigger>
                <TabsTrigger value="bonafide" className="font-tamil text-xs sm:text-sm !whitespace-normal text-center leading-tight px-2 py-2">
                  போனாஃபைட்
                </TabsTrigger>
                <TabsTrigger value="noc" className="font-tamil text-xs sm:text-sm !whitespace-normal text-center leading-tight px-2 py-2">
                  ஆட்சேபனையின்மை
                </TabsTrigger>
                <TabsTrigger value="heir" className="font-tamil text-xs sm:text-sm !whitespace-normal text-center leading-tight px-2 py-2">
                  வாரிசு சான்றிதழ்
                </TabsTrigger>
              </TabsList>

              {/* Marriage Certificate */}
              <TabsContent value="marriage">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="shadow-medium">
                    <CardHeader>
                      <CardTitle className="font-tamil text-xl">
                        திருமண சான்றிதழ்
                      </CardTitle>
                      <CardDescription>
                        Marriage Certificate Request
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <Label htmlFor="marriageDate" className="font-tamil">திருமண தேதி</Label>
                          <IsoDatePicker
                            value={searchDate}
                            onChange={(val) => setSearchDate(val)}
                            placeholder="dd/mm/yyyy"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button variant="secondary" onClick={handleMarriageSearch} disabled={isSearching}>
                            {isSearching ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4 mr-2" />
                            )}
                            தேடு
                          </Button>
                        </div>
                      </div>

                      {marriageRecords.length > 0 && (
                        <div className="space-y-4">
                          <Label className="font-tamil">பதிவுகளைத் தேர்ந்தெடுக்கவும்:</Label>
                          <RadioGroup value={selectedRecord} onValueChange={handleRecordSelect}>
                            {marriageRecords.map((marriage) => (
                              <div
                                key={marriage.id}
                                className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted transition-colors"
                              >
                                <RadioGroupItem value={marriage.id} id={marriage.id} />
                                <Label htmlFor={marriage.id} className="flex-1 cursor-pointer">
                                  <span className="font-tamil">
                                    மாப்பிள்ளை: {marriage.groom_name} | மணப்பெண்: {marriage.bride_name}
                                  </span>
                                  <span className="block text-sm text-muted-foreground">
                                    {marriage.gregorian_day}.{marriage.gregorian_month}.{marriage.gregorian_year}
                                  </span>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>

                          {/* Payment Section */}
                          {selectedRecord && fullMarriageRecord && (
                            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                              {isPaid ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <Check className="h-5 w-5" />
                                  <span className="font-tamil font-medium">கட்டணம் செலுத்தப்பட்டது</span>
                                  {certificatePayment?.transaction_id && (
                                    <Badge variant="outline" className="ml-2">
                                      {certificatePayment.transaction_id}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-tamil font-medium">சான்றிதழ் கட்டணம்</p>
                                      <p className="text-sm text-muted-foreground">Certificate Fee</p>
                                    </div>
                                    <div className="flex items-center text-xl font-bold text-primary">
                                      <IndianRupee className="h-5 w-5" />
                                      {certificateFee}
                                    </div>
                                  </div>

                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                      <Label htmlFor="applicantName" className="font-tamil">விண்ணப்பதாரர் பெயர்</Label>
                                      <Input
                                        id="applicantName"
                                        value={applicantName}
                                        onChange={(e) => setApplicantName(e.target.value)}
                                        placeholder="Applicant Name"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="applicantPhone" className="font-tamil">தொலைபேசி எண்</Label>
                                      <Input
                                        id="applicantPhone"
                                        value={applicantPhone}
                                        onChange={(e) => setApplicantPhone(e.target.value)}
                                        placeholder="Phone Number"
                                      />
                                    </div>
                                  </div>

                                  {/* Admin cash payment option */}
                                  {isAdmin && (
                                    <div className="flex gap-4 items-center p-3 bg-secondary/20 rounded-lg">
                                      <Label className="font-tamil">கட்டண முறை:</Label>
                                      <RadioGroup
                                        value={paymentMethod}
                                        onValueChange={(v) => setPaymentMethod(v as "online" | "cash")}
                                        className="flex gap-4"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="online" id="online" />
                                          <Label htmlFor="online">Online</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="cash" id="cash" />
                                          <Label htmlFor="cash">Cash (Admin)</Label>
                                        </div>
                                      </RadioGroup>
                                    </div>
                                  )}

                                  <Button
                                    variant="gold"
                                    size="lg"
                                    className="w-full"
                                    onClick={initiatePayment}
                                    disabled={isPaymentLoading || !applicantName.trim() || !applicantPhone.trim()}
                                  >
                                    {isPaymentLoading ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <CreditCard className="h-4 w-4 mr-2" />
                                    )}
                                    <span className="font-tamil">
                                      {isAdmin && paymentMethod === "cash" ? "பணம் பெறப்பட்டது" : "கட்டணம் செலுத்து"}
                                    </span>
                                  </Button>
                                  {(!applicantName.trim() || !applicantPhone.trim()) && (
                                    <p className="text-sm text-amber-600 font-tamil">
                                      * பெயர் மற்றும் தொலைபேசி எண் தேவை
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* Print/Download buttons - locked until paid */}
                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="gold"
                              className="flex-1 min-w-0"
                              disabled={!selectedRecord || isPrinting || !isPaid}
                              onClick={handleMarriagePrint}
                            >
                              {isPrinting ? (
                                <Loader2 className="h-4 w-4 mr-1 shrink-0 animate-spin" />
                              ) : !isPaid ? (
                                <Lock className="h-4 w-4 mr-1 shrink-0" />
                              ) : (
                                <Printer className="h-4 w-4 mr-1 shrink-0" />
                              )}
                              <span className="font-tamil truncate">அச்சிடு</span>
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 min-w-0"
                              disabled={!selectedRecord || isPrinting || !isPaid}
                              onClick={handleMarriageDownload}
                            >
                              {!isPaid ? (
                                <Lock className="h-4 w-4 mr-1 shrink-0" />
                              ) : (
                                <Download className="h-4 w-4 mr-1 shrink-0" />
                              )}
                              <span className="font-tamil truncate">பதிவிறக்கு</span>
                            </Button>
                          </div>

                          {!isPaid && selectedRecord && (
                            <p className="text-sm text-muted-foreground font-tamil">
                              * அச்சிட/பதிவிறக்க கட்டணம் செலுத்த வேண்டும்
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Death Certificate */}
              <TabsContent value="death">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="shadow-medium">
                    <CardHeader>
                      <CardTitle className="font-tamil text-xl">
                        இறப்புச் சான்றிதழ்
                      </CardTitle>
                      <CardDescription>
                        Death Certificate Request
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <Label htmlFor="deathDate" className="font-tamil">இறப்பு தேதி</Label>
                          <IsoDatePicker
                            value={deathSearchDate}
                            onChange={(val) => setDeathSearchDate(val)}
                            placeholder="dd/mm/yyyy"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button variant="secondary" onClick={handleDeathSearch} disabled={isSearching}>
                            {isSearching ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4 mr-2" />
                            )}
                            தேடு
                          </Button>
                        </div>
                      </div>

                      {deathRecords.length > 0 && (
                        <div className="space-y-4">
                          <Label className="font-tamil">பதிவுகளைத் தேர்ந்தெடுக்கவும்:</Label>
                          <RadioGroup value={selectedRecord} onValueChange={handleRecordSelect}>
                            {deathRecords.map((death) => (
                              <div
                                key={death.id}
                                className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted transition-colors"
                              >
                                <RadioGroupItem value={death.id} id={death.id} />
                                <Label htmlFor={death.id} className="flex-1 cursor-pointer">
                                  <span className="font-tamil">
                                    இறந்தவர்: {death.deceased_name} | தந்தை: {death.deceased_father_name}
                                  </span>
                                  <span className="block text-sm text-muted-foreground">
                                    {death.gregorian_day}.{death.gregorian_month}.{death.gregorian_year}
                                  </span>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>

                          {/* Payment Section */}
                          {selectedRecord && fullDeathRecord && (
                            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                              {isPaid ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <Check className="h-5 w-5" />
                                  <span className="font-tamil font-medium">கட்டணம் செலுத்தப்பட்டது</span>
                                  {certificatePayment?.transaction_id && (
                                    <Badge variant="outline" className="ml-2">
                                      {certificatePayment.transaction_id}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-tamil font-medium">சான்றிதழ் கட்டணம்</p>
                                      <p className="text-sm text-muted-foreground">Certificate Fee</p>
                                    </div>
                                    <div className="flex items-center text-xl font-bold text-primary">
                                      <IndianRupee className="h-5 w-5" />
                                      {certificateFee}
                                    </div>
                                  </div>

                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                      <Label htmlFor="deathApplicantName" className="font-tamil">விண்ணப்பதாரர் பெயர்</Label>
                                      <Input
                                        id="deathApplicantName"
                                        value={applicantName}
                                        onChange={(e) => setApplicantName(e.target.value)}
                                        placeholder="Applicant Name"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="deathApplicantPhone" className="font-tamil">தொலைபேசி எண்</Label>
                                      <Input
                                        id="deathApplicantPhone"
                                        value={applicantPhone}
                                        onChange={(e) => setApplicantPhone(e.target.value)}
                                        placeholder="Phone Number"
                                      />
                                    </div>
                                  </div>

                                  {/* Admin cash payment option */}
                                  {isAdmin && (
                                    <div className="flex gap-4 items-center p-3 bg-secondary/20 rounded-lg">
                                      <Label className="font-tamil">கட்டண முறை:</Label>
                                      <RadioGroup
                                        value={paymentMethod}
                                        onValueChange={(v) => setPaymentMethod(v as "online" | "cash")}
                                        className="flex gap-4"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="online" id="death-online" />
                                          <Label htmlFor="death-online">Online</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="cash" id="death-cash" />
                                          <Label htmlFor="death-cash">Cash (Admin)</Label>
                                        </div>
                                      </RadioGroup>
                                    </div>
                                  )}

                                  <Button
                                    variant="gold"
                                    size="lg"
                                    className="w-full"
                                    onClick={initiatePayment}
                                    disabled={isPaymentLoading || !applicantName.trim() || !applicantPhone.trim()}
                                  >
                                    {isPaymentLoading ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <CreditCard className="h-4 w-4 mr-2" />
                                    )}
                                    <span className="font-tamil">
                                      {isAdmin && paymentMethod === "cash" ? "பணம் பெறப்பட்டது" : "கட்டணம் செலுத்து"}
                                    </span>
                                  </Button>
                                  {(!applicantName.trim() || !applicantPhone.trim()) && (
                                    <p className="text-sm text-amber-600 font-tamil">
                                      * பெயர் மற்றும் தொலைபேசி எண் தேவை
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* Print/Download buttons - locked until paid */}
                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="gold"
                              className="flex-1 min-w-0"
                              disabled={!selectedRecord || isPrinting || !isPaid}
                              onClick={handleDeathPrint}
                            >
                              {isPrinting ? (
                                <Loader2 className="h-4 w-4 mr-1 shrink-0 animate-spin" />
                              ) : !isPaid ? (
                                <Lock className="h-4 w-4 mr-1 shrink-0" />
                              ) : (
                                <Printer className="h-4 w-4 mr-1 shrink-0" />
                              )}
                              <span className="font-tamil truncate">அச்சிடு</span>
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 min-w-0"
                              disabled={!selectedRecord || isPrinting || !isPaid}
                              onClick={handleDeathDownload}
                            >
                              {!isPaid ? (
                                <Lock className="h-4 w-4 mr-1 shrink-0" />
                              ) : (
                                <Download className="h-4 w-4 mr-1 shrink-0" />
                              )}
                              <span className="font-tamil truncate">பதிவிறக்கு</span>
                            </Button>
                          </div>

                          {!isPaid && selectedRecord && (
                            <p className="text-sm text-muted-foreground font-tamil">
                              * அச்சிட/பதிவிறக்க கட்டணம் செலுத்த வேண்டும்
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Bonafide Certificate */}
              <TabsContent value="bonafide">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="shadow-medium">
                    <CardHeader>
                      <CardTitle className="font-tamil text-xl">
                        போனாஃபைட் சான்றிதழ்
                      </CardTitle>
                      <CardDescription>
                        Bonafide Certificate Request
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Label htmlFor="bonafideMemberNo" className="font-tamil">
                            உறுப்பினர் எண்
                          </Label>
                          <Input
                            id="bonafideMemberNo"
                            placeholder="Membership Number"
                            value={membershipNo}
                            onChange={(e) => setMembershipNo(e.target.value)}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button variant="secondary" onClick={handleMemberLookup} disabled={isMemberSearching}>
                            {isMemberSearching ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4 mr-2" />
                            )}
                            தேடு
                          </Button>
                        </div>
                      </div>

                      {memberDetails.name && (
                        <div className="space-y-4 p-4 bg-muted rounded-lg">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label className="font-tamil text-sm text-muted-foreground">பெயர்</Label>
                              <Input value={memberDetails.name} onChange={(e) => setMemberDetails({...memberDetails, name: e.target.value})} />
                            </div>
                            <div>
                              <Label className="font-tamil text-sm text-muted-foreground">தந்தை பெயர்</Label>
                              <Input value={memberDetails.fatherName} onChange={(e) => setMemberDetails({...memberDetails, fatherName: e.target.value})} />
                            </div>
                            <div>
                              <Label className="font-tamil text-sm text-muted-foreground">தொலைபேசி</Label>
                              <Input value={memberDetails.phone} onChange={(e) => setMemberDetails({...memberDetails, phone: e.target.value})} />
                            </div>
                            <div>
                              <Label className="font-tamil text-sm text-muted-foreground">முகவரி</Label>
                              <Input value={memberDetails.address} onChange={(e) => setMemberDetails({...memberDetails, address: e.target.value})} />
                            </div>
                          </div>

                          {/* Payment section for bonafide */}
                          {!isPaid && (
                            <div className="space-y-4 p-4 border border-secondary rounded-lg bg-secondary/5">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-secondary" />
                                <span className="font-tamil font-medium">கட்டணம்: ₹{certificateFee}</span>
                                {paymentStatusLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="font-tamil">விண்ணப்பதாரர் பெயர்</Label>
                                  <Input
                                    value={applicantName}
                                    onChange={(e) => setApplicantName(e.target.value)}
                                    placeholder="Applicant Name"
                                  />
                                </div>
                                <div>
                                  <Label className="font-tamil">தொலைபேசி எண்</Label>
                                  <Input
                                    value={applicantPhone}
                                    onChange={(e) => setApplicantPhone(e.target.value)}
                                    placeholder="Phone Number"
                                  />
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-4 items-center p-3 bg-secondary/20 rounded-lg">
                                  <Label className="font-tamil">கட்டண முறை:</Label>
                                  <RadioGroup
                                    value={paymentMethod}
                                    onValueChange={(v) => setPaymentMethod(v as "online" | "cash")}
                                    className="flex gap-4"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="online" id="bonafide-online" />
                                      <Label htmlFor="bonafide-online">Online</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="cash" id="bonafide-cash" />
                                      <Label htmlFor="bonafide-cash">Cash (Admin)</Label>
                                    </div>
                                  </RadioGroup>
                                </div>
                              )}
                              <Button
                                variant="gold"
                                size="lg"
                                className="w-full"
                                onClick={initiatePayment}
                                disabled={isPaymentLoading || !applicantName.trim() || !applicantPhone.trim()}
                              >
                                {isPaymentLoading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CreditCard className="h-4 w-4 mr-2" />
                                )}
                                <span className="font-tamil">
                                  {isAdmin && paymentMethod === "cash" ? "பணம் பெறப்பட்டது" : "கட்டணம் செலுத்து"}
                                </span>
                              </Button>
                              {(!applicantName.trim() || !applicantPhone.trim()) && (
                                <p className="text-sm text-amber-600 font-tamil">
                                  * பெயர் மற்றும் தொலைபேசி எண் தேவை
                                </p>
                              )}
                            </div>
                          )}

                          {isPaid && (
                            <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                              <Check className="h-5 w-5 text-green-600" />
                              <span className="font-tamil text-green-700 dark:text-green-400">பணம் செலுத்தப்பட்டது</span>
                            </div>
                          )}

                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="gold"
                              className="flex-1 min-w-0"
                              disabled={!canPrintOrDownload || isPrinting}
                              onClick={handlePrint}
                            >
                              {isPrinting ? (
                                <Loader2 className="h-4 w-4 mr-1 shrink-0 animate-spin" />
                              ) : !canPrintOrDownload ? (
                                <Lock className="h-4 w-4 mr-1 shrink-0" />
                              ) : (
                                <Printer className="h-4 w-4 mr-1 shrink-0" />
                              )}
                              <span className="font-tamil truncate">அச்சிடு</span>
                            </Button>
                            <Button variant="outline" className="flex-1 min-w-0">
                              <span className="font-tamil truncate">ரத்துசெய்</span>
                            </Button>
                          </div>
                          {!canPrintOrDownload && (
                            <p className="text-sm text-muted-foreground font-tamil">
                              * அச்சிட கட்டணம் செலுத்த வேண்டும்
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* No Objection Certificate */}
              <TabsContent value="noc">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="shadow-medium">
                    <CardHeader>
                      <CardTitle className="font-tamil text-xl">
                        ஆட்சேபனையின்மை சான்றிதழ்
                      </CardTitle>
                      <CardDescription>
                        No Objection Certificate Request
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="text-center py-8">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-primary/60" />
                        <p className="font-tamil text-lg mb-4">
                          திருமணத்திற்கான ஆட்சேபனையின்மை சான்றிதழ் (NOC) பெற
                        </p>
                        <p className="text-muted-foreground mb-6">
                          புதிய படிவத்தைப் பயன்படுத்தி சான்றிதழ் கோரிக்கை சமர்ப்பிக்கவும்
                        </p>
                        <Button asChild size="lg" className="gap-2">
                          <Link to="/noc-certificate">
                            <ExternalLink className="h-4 w-4" />
                            <span className="font-tamil">NOC படிவத்திற்கு செல்</span>
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Heir Certificate */}
              <TabsContent value="heir">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="shadow-medium">
                    <CardHeader>
                      <CardTitle className="font-tamil text-xl">
                        வாரிசு சான்றிதழ்
                      </CardTitle>
                      <CardDescription>
                        Heir Certificate Request
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="font-tamil text-muted-foreground">
                        இறந்த உறுப்பினரின் சட்ட வாரிசுகளை அறிவிக்கும் சான்றிதழ்.
                      </p>
                      <Link to="/heir-certificate">
                        <Button className="w-full font-tamil">
                          <FileText className="h-4 w-4 mr-2" />
                          வாரிசு சான்றிதழ் கோரிக்கை
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Payment Info */}
      <section className="py-8 bg-muted">
        <div className="container mx-auto px-4 text-center">
          <p className="font-tamil text-muted-foreground">
            <CreditCard className="inline h-4 w-4 mr-2" />
            அனைத்து சான்றிதழ்களுக்கும் பணம் செலுத்திய பின் அச்சிடலாம் மற்றும் பதிவிறக்கம் செய்யலாம்
          </p>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
