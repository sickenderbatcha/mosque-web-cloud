import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserTabPermissions } from "@/hooks/useUserTabPermissions";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TamilInput } from "@/components/ui/tamil-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, IndianRupee, Send, Printer, Banknote, CreditCard, AlertCircle, X } from "lucide-react";
import CashPaymentRequestDialog from "@/components/CashPaymentRequestDialog";
import CertificateReceipt, { CertificateReceiptData } from "@/components/CertificateReceipt";
import { useAppSettings } from "@/hooks/useAppSettings";
import HeirCertificatePreview from "@/components/HeirCertificatePreview";
import { generateHeirCertificatePdf, printHeirCertificate, HeirRecord } from "@/utils/heirCertificatePdf";
import HeirSpreadsheetTable, { Heir } from "@/components/HeirSpreadsheetTable";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const heirSchema = z.object({
  name: z.string().min(1, "பெயர் தேவை"),
  relationship: z.string().min(1, "உறவுமுறை தேவை"),
  age: z.string().min(1, "வயது தேவை"),
  marriage_eligibility: z.string().min(1, "திருமண தகுதி தேவை"),
});

const formSchema = z.object({
  applicant_name: z.string().min(1, "மனுதாரர் பெயர் தேவை"),
  applicant_phone: z.string().min(10, "சரியான தொலைபேசி எண் உள்ளிடவும்"),
  applicant_email: z.string().email("சரியான மின்னஞ்சல் முகவரி உள்ளிடவும்").optional().or(z.literal("")),
  applicant_relationship: z.string().min(1, "உறவுமுறை தேவை"),
  deceased_member_id: z.string().optional(),
  deceased_name: z.string().min(1, "இறந்தவர் பெயர் தேவை"),
  deceased_father_name: z.string().min(1, "இறந்தவர் தந்தை பெயர் தேவை"),
  deceased_address: z.string().min(1, "முகவரி தேவை"),
  heirs: z.array(heirSchema).min(1, "குறைந்தது ஒரு வாரிசு தேவை"),
});

type FormData = z.infer<typeof formSchema>;

const RELATIONSHIP_OPTIONS = [
  "மகன்",
  "மகள்",
  "மனைவி",
  "கணவன்",
  "தந்தை",
  "தாய்",
  "சகோதரன்",
  "சகோதரி",
  "பேரன்",
  "பேத்தி",
  "மருமகன்",
  "மருமகள்",
];

export default function HeirCertificatePage() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { canAccessTab } = useUserTabPermissions();
  const { getSetting } = useAppSettings();

  const heirCertOnlineDisabled = getSetting("heir_cert_online_disabled") === "true";
  const canBypassHeirOnlineDisable = isAdmin || canAccessTab("heir-certificates");
  const isHeirOnlineDisabledForUser = heirCertOnlineDisabled && !canBypassHeirOnlineDisable;
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [fetchingMember, setFetchingMember] = useState(false);
  
  // Payment & Status
  const [isPaid, setIsPaid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [heirRecordId, setHeirRecordId] = useState<string | null>(null);
  const [heirRecord, setHeirRecord] = useState<HeirRecord | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Cash payment request state
  const [showCashRequestDialog, setShowCashRequestDialog] = useState(false);
  const [cashRequestData, setCashRequestData] = useState<{
    referenceId: string;
    amount: number;
    failureReason?: string;
  } | null>(null);
  const [showCertReceipt, setShowCertReceipt] = useState<CertificateReceiptData | null>(null);

  // Heirs state managed separately for spreadsheet
  const [heirs, setHeirs] = useState<Heir[]>([
    { name: "", relationship: "", age: "", marriage_eligibility: "" }
  ]);

  const certificateFee = Number(getSetting("certificate_fee_heir") || getSetting("certificate_fee") || "100");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      applicant_name: "",
      applicant_phone: "",
      applicant_email: "",
      applicant_relationship: "",
      deceased_member_id: "",
      deceased_name: "",
      deceased_father_name: "",
      deceased_address: "",
      heirs: [{ name: "", relationship: "", age: "", marriage_eligibility: "" }],
    },
  });
  
  // Sync heirs state with form - filter out empty rows
  useEffect(() => {
    // Only include heirs with at least a name filled
    const validHeirs = heirs.filter(h => h.name.trim() !== "");
    // If no valid heirs, keep the original array for form UI purposes
    form.setValue("heirs", validHeirs.length > 0 ? validHeirs : heirs);
  }, [heirs, form]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Fetch deceased member by membership number
  const fetchDeceasedMember = async (memberId: string) => {
    if (!memberId || memberId.length < 2) return;
    
    setFetchingMember(true);
    try {
      const { data, error } = await supabase
        .rpc("get_member_public_info", { _member_id: memberId })
        .maybeSingle();

      if (!error && data) {
        form.setValue("deceased_name", data.full_name);
        form.setValue("deceased_father_name", data.father_name || "");
        form.setValue("deceased_address", data.address || "");
        toast.success("உறுப்பினர் விவரங்கள் கண்டறியப்பட்டன");
      }
    } catch (err) {
      console.error("Error fetching deceased member:", err);
    } finally {
      setFetchingMember(false);
    }
  };

  const handlePayment = async () => {
    // Filter out empty heirs before validation
    const filledHeirs = heirs.filter(h => h.name.trim() !== "");
    
    if (filledHeirs.length === 0) {
      toast.error("குறைந்தது ஒரு வாரிசு தேவை / At least one heir is required");
      return;
    }
    
    // Check if all filled heirs have complete data
    const incompleteHeirs = filledHeirs.filter(
      h => !h.relationship || !h.age || !h.marriage_eligibility
    );
    
    if (incompleteHeirs.length > 0) {
      toast.error("அனைத்து வாரிசுகளின் விவரங்களையும் நிரப்பவும் / Please fill all heir details");
      return;
    }
    
    // Update form with only filled heirs before validation
    form.setValue("heirs", filledHeirs);
    
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("அனைத்து தேவையான புலங்களையும் நிரப்பவும்");
      return;
    }

    if (!razorpayLoaded) {
      toast.error("பணம் செலுத்தும் சேவை ஏற்றப்படவில்லை");
      return;
    }

    setLoading(true);
    try {
      const formData = form.getValues();

      // Create heir certificate record
      const { data: heirData, error: heirError } = await supabase
        .from("heir_certificates")
        .insert([{
          applicant_name: formData.applicant_name,
          applicant_phone: formData.applicant_phone,
          applicant_email: formData.applicant_email || null,
          applicant_relationship: formData.applicant_relationship,
          deceased_member_id: formData.deceased_member_id || null,
          deceased_name: formData.deceased_name,
          deceased_father_name: formData.deceased_father_name,
          deceased_address: formData.deceased_address,
          heirs: formData.heirs,
          status: "payment_pending",
          payment_status: "pending",
          user_id: user?.id || null,
        }])
        .select()
        .single();

      if (heirError) throw heirError;

      setHeirRecordId(heirData.id);

      // Create certificate payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from("certificate_payments")
        .insert({
          certificate_type: "heir",
          reference_id: heirData.id,
          applicant_name: formData.applicant_name,
          applicant_phone: formData.applicant_phone,
          applicant_email: formData.applicant_email || null,
          amount: certificateFee,
          payment_status: "pending",
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            amount: certificateFee,
            certificatePaymentId: paymentData.id,
            type: "certificate",
          },
        }
      );

      if (orderError) throw orderError;

      // Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "I.N.P.T ஜமாத்",
        description: "Heir Certificate Fee",
        handler: async function (response: any) {
          try {
            // Verify payment
            const { error: verifyError } = await supabase.functions.invoke(
              "create-razorpay-order?action=verify",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  certificatePaymentId: paymentData.id,
                  type: "certificate",
                },
              }
            );

            if (verifyError) {
              toast.error("பணம் செலுத்துதல் சரிபார்ப்பு தோல்வியுற்றது");
              return;
            }

            // Update heir certificate status
            await supabase
              .from("heir_certificates")
              .update({
                status: "pending",
                payment_status: "completed",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
              })
              .eq("id", heirData.id);

            setIsPaid(true);
            setHeirRecord({
              ...heirData,
              payment_status: "completed",
            } as unknown as HeirRecord);
            toast.success("பணம் வெற்றிகரமாக செலுத்தப்பட்டது!");
            // Show receipt with enforcement
            setShowCertReceipt({
              certificateType: "heir",
              applicantName: heirData.applicant_name,
              applicantPhone: heirData.applicant_phone || undefined,
              applicantEmail: heirData.applicant_email || undefined,
              subjectName: heirData.deceased_name,
              amount: certificateFee,
              receiptNumber: "",
              referenceId: paymentData.id,
              referenceType: "certificate_payment",
              paymentMethod: "online",
              transactionId: response.razorpay_payment_id,
              createdAt: heirData.created_at,
              additionalInfo: {
                "இறந்தவர் தந்தை பெயர்": heirData.deceased_father_name,
              },
            });
          } catch (err) {
            console.error("Payment verification error:", err);
            toast.error("பணம் செலுத்துதல் சரிபார்ப்பு பிழை");
          }
        },
        modal: {
          ondismiss: function () {
            toast.info("பணம் செலுத்துதல் ரத்து செய்யப்பட்டது");
            // Show cash payment request dialog on cancellation
            setCashRequestData({
              referenceId: heirData.id,
              amount: certificateFee,
              failureReason: "Payment cancelled by user",
            });
            setShowCashRequestDialog(true);
          },
        },
        theme: {
          color: "#059669",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        setCashRequestData({
          referenceId: heirData.id,
          amount: certificateFee,
          failureReason: response.error?.description || response.error?.reason || "Payment failed",
        });
        setShowCashRequestDialog(true);
      });
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error("பணம் செலுத்துதல் பிழை: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Cash Payment (Admin only)
  const handleCashPayment = async () => {
    // Filter out empty heirs before validation
    const filledHeirs = heirs.filter(h => h.name.trim() !== "");
    
    if (filledHeirs.length === 0) {
      toast.error("குறைந்தது ஒரு வாரிசு தேவை / At least one heir is required");
      return;
    }
    
    // Check if all filled heirs have complete data
    const incompleteHeirs = filledHeirs.filter(
      h => !h.relationship || !h.age || !h.marriage_eligibility
    );
    
    if (incompleteHeirs.length > 0) {
      toast.error("அனைத்து வாரிசுகளின் விவரங்களையும் நிரப்பவும் / Please fill all heir details");
      return;
    }
    
    // Update form with only filled heirs before validation
    form.setValue("heirs", filledHeirs);
    
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("அனைத்து தேவையான புலங்களையும் நிரப்பவும்");
      return;
    }

    setLoading(true);
    try {
      const formData = form.getValues();

      // Create heir certificate record with cash payment
      const { data: heirData, error: heirError } = await supabase
        .from("heir_certificates")
        .insert([{
          applicant_name: formData.applicant_name,
          applicant_phone: formData.applicant_phone,
          applicant_email: formData.applicant_email || null,
          applicant_relationship: formData.applicant_relationship,
          deceased_member_id: formData.deceased_member_id || null,
          deceased_name: formData.deceased_name,
          deceased_father_name: formData.deceased_father_name,
          deceased_address: formData.deceased_address,
          heirs: formData.heirs,
          status: "pending",
          payment_status: "completed",
          user_id: user?.id || null,
        }])
        .select()
        .single();

      if (heirError) throw heirError;

      setHeirRecordId(heirData.id);

      // Create certificate payment record with cash payment
      const { error: paymentError } = await supabase
        .from("certificate_payments")
        .insert({
          certificate_type: "heir",
          reference_id: heirData.id,
          applicant_name: formData.applicant_name,
          applicant_phone: formData.applicant_phone,
          applicant_email: formData.applicant_email || null,
          amount: certificateFee,
          payment_status: "completed",
          payment_method: "cash",
          user_id: user?.id || null,
        });

      if (paymentError) throw paymentError;

      setIsPaid(true);
      setHeirRecord({
        ...heirData,
        payment_status: "completed",
      } as unknown as HeirRecord);
      toast.success("ரொக்க பணம் பதிவு செய்யப்பட்டது!");
    } catch (error: any) {
      console.error("Cash payment error:", error);
      toast.error("ரொக்க பணம் பதிவு பிழை: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!heirRecordId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("heir_certificates")
        .update({ status: "submitted" })
        .eq("id", heirRecordId);

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("சான்றிதழ் கோரிக்கை நிர்வாகிக்கு அனுப்பப்பட்டது!");
    } catch (error: any) {
      toast.error("அனுப்புதல் பிழை: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (heirRecordId) {
      await supabase.from("heir_certificates").delete().eq("id", heirRecordId);
    }
    form.reset();
    setHeirs([{ name: "", relationship: "", age: "", marriage_eligibility: "" }]);
    setIsPaid(false);
    setIsSubmitted(false);
    setIsApproved(false);
    setHeirRecordId(null);
    setHeirRecord(null);
    setShowPreview(false);
  };

  const handlePrint = async () => {
    if (!heirRecord) return;
    await printHeirCertificate(heirRecord);
  };

  const handleDownload = async () => {
    if (!heirRecord) return;
    await generateHeirCertificatePdf(heirRecord);
  };

  // Check existing heir record status
  useEffect(() => {
    if (!heirRecordId) return;

    const checkStatus = async () => {
      const { data, error } = await supabase
        .from("heir_certificates")
        .select("*")
        .eq("id", heirRecordId)
        .single();

      if (!error && data) {
        setHeirRecord(data as unknown as HeirRecord);
        setIsPaid(data.payment_status === "completed");
        setIsSubmitted(data.status === "submitted" || data.status === "approved");
        setIsApproved(data.status === "approved");
      }
    };

    checkStatus();
  }, [heirRecordId]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-tamil text-xl md:text-2xl">
              <FileText className="h-6 w-6" />
              வாரிசு சான்றிதழ்
            </CardTitle>
            <CardDescription className="font-tamil">
              சட்ட வாரிசு சான்றிதழ் கோரிக்கை படிவம்
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                {/* Applicant Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold font-tamil border-b pb-2">
                    மனுதாரர் விவரங்கள்
                  </h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="applicant_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">மனுதாரர் பெயர் *</FormLabel>
                          <FormControl>
                            <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" disabled={isPaid} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="applicant_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">தொலைபேசி எண் *</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" disabled={isPaid} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="applicant_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">மின்னஞ்சல்</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" disabled={isPaid} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="applicant_relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">இறந்தவருடன் உறவுமுறை *</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isPaid}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="உறவுமுறை தேர்வு செய்யவும்" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RELATIONSHIP_OPTIONS.map((rel) => (
                                <SelectItem key={rel} value={rel}>
                                  {rel}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Deceased Member Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold font-tamil border-b pb-2">
                    இறந்தவர் விவரங்கள்
                  </h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="deceased_member_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">உறுப்பினர் எண் (தேடல்)</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                placeholder="உறுப்பினர் எண்" 
                                disabled={isPaid}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fetchDeceasedMember(field.value || "")}
                              disabled={fetchingMember || isPaid}
                            >
                              {fetchingMember ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "தேடு"
                              )}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deceased_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">இறந்தவர் பெயர் *</FormLabel>
                          <FormControl>
                            <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" disabled={isPaid} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deceased_father_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">இறந்தவர் தந்தை பெயர் *</FormLabel>
                          <FormControl>
                            <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" disabled={isPaid} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deceased_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">தெரு / முகவரி *</FormLabel>
                          <FormControl>
                            <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" disabled={isPaid} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Heirs Details - Spreadsheet Table */}
                <HeirSpreadsheetTable
                  heirs={heirs}
                  onChange={setHeirs}
                  memberId={form.watch("deceased_member_id")}
                  disabled={isPaid}
                />

                {/* Payment Section */}
                {!isPaid && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
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
                    
                    <div className="flex flex-wrap gap-3">
                      {!isHeirOnlineDisabledForUser && (
                        <Button
                          type="button"
                          onClick={handlePayment}
                          disabled={loading}
                          className="flex-1 min-w-0 h-auto py-2"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4 mr-2" />
                          )}
                          <span className="font-tamil break-words">ஆன்லைன் செலுத்து</span>
                        </Button>
                      )}
                      
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCashPayment}
                          disabled={loading}
                          className="flex-1 min-w-0 h-auto py-2"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Banknote className="h-4 w-4 mr-2" />
                          )}
                          <span className="font-tamil break-words">ரொக்கம் செலுத்து</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={async () => {
                            const filledHeirs = heirs.filter(h => h.name.trim() !== "");
                            if (filledHeirs.length === 0) {
                              toast.error("குறைந்தது ஒரு வாரிசு தேவை");
                              return;
                            }
                            form.setValue("heirs", filledHeirs);
                            const isValid = await form.trigger();
                            if (!isValid) {
                              toast.error("அனைத்து தேவையான புலங்களையும் நிரப்பவும்");
                              return;
                            }
                            setCashRequestData({
                              referenceId: "",
                              amount: certificateFee,
                              failureReason: "User requested cash payment",
                            });
                            setShowCashRequestDialog(true);
                          }}
                          disabled={loading}
                          className="flex-1 min-w-0 h-auto py-2"
                        >
                          <Banknote className="h-4 w-4 mr-2" />
                          <span className="font-tamil break-words">ரொக்க கோரிக்கை</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* After Payment - Submit or Preview */}
                {isPaid && !isSubmitted && (
                  <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-2 text-green-600">
                      <FileText className="h-5 w-5" />
                      <span className="font-tamil font-medium">பணம் செலுத்தப்பட்டது!</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        variant="outline"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="font-tamil">முன்னோட்டம்</span>
                      </Button>
                      
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        <span className="font-tamil">நிர்வாகிக்கு அனுப்பு</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* After Submission */}
                {isSubmitted && (
                  <div className="space-y-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Send className="h-5 w-5" />
                      <span className="font-tamil font-medium">
                        {isApproved 
                          ? "சான்றிதழ் அங்கீகரிக்கப்பட்டது!" 
                          : "கோரிக்கை அனுப்பப்பட்டது - ஒப்புதலுக்காக காத்திருக்கிறது"}
                      </span>
                    </div>
                    
                    {isApproved && heirRecord && (
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          onClick={() => setShowPreview(true)}
                          variant="outline"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          <span className="font-tamil">முன்னோட்டம்</span>
                        </Button>
                        
                        <Button
                          type="button"
                          onClick={handlePrint}
                          variant="outline"
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          <span className="font-tamil">அச்சிடு</span>
                        </Button>
                        
                        <Button
                          type="button"
                          onClick={handleDownload}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          <span className="font-tamil">PDF பதிவிறக்கு</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* New Request Button */}
                {(isPaid || isSubmitted) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancel}
                    className="w-full"
                  >
                    <span className="font-tamil">புதிய கோரிக்கை</span>
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Preview Modal */}
        {showPreview && heirRecord && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-auto">
            <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
                <h2 className="font-tamil font-semibold">சான்றிதழ் முன்னோட்டம்</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                  ✕
                </Button>
              </div>
              <div className="p-4">
                <HeirCertificatePreview record={heirRecord} />
              </div>
              <div className="sticky bottom-0 bg-background border-t p-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  <span className="font-tamil">மூடு</span>
                </Button>
                {isApproved && (
                  <>
                    <Button variant="outline" onClick={handlePrint}>
                      <Printer className="h-4 w-4 mr-2" />
                      <span className="font-tamil">அச்சிடு</span>
                    </Button>
                    <Button onClick={handleDownload}>
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="font-tamil">PDF</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Cash Payment Request Dialog */}
        {cashRequestData && (
          <CashPaymentRequestDialog
            open={showCashRequestDialog}
            onOpenChange={setShowCashRequestDialog}
            serviceType="heir"
            referenceId={cashRequestData.referenceId || undefined}
            amount={cashRequestData.amount}
            applicantName={form.getValues("applicant_name")}
            applicantPhone={form.getValues("applicant_phone")}
            applicantEmail={form.getValues("applicant_email") || undefined}
            failureReason={cashRequestData.failureReason}
            serviceDetails={{
              deceasedName: form.getValues("deceased_name"),
              deceasedFatherName: form.getValues("deceased_father_name"),
              applicantRelationship: form.getValues("applicant_relationship"),
              heirsCount: heirs.filter(h => h.name.trim() !== "").length,
            }}
            onSuccess={() => {
              setCashRequestData(null);
              form.reset();
              setHeirs([{ name: "", relationship: "", age: "", marriage_eligibility: "" }]);
            }}
          />
        )}

        {/* Certificate Receipt Modal */}
        {showCertReceipt && (
          <CertificateReceipt data={showCertReceipt} requireAction onClose={() => setShowCertReceipt(null)} />
        )}
      </div>
    </Layout>
  );
}
