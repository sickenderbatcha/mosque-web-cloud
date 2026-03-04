import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
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
import { Loader2, FileText, IndianRupee, X, Send, Printer, Mail, Phone, Banknote, CreditCard, AlertCircle } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { getCertificateAccessStatus } from "@/lib/certificatePayments";
import CertificateReceipt, { CertificateReceiptData } from "@/components/CertificateReceipt";
import NocCertificatePreview from "@/components/NocCertificatePreview";
import { generateNocCertificatePdf, printNocCertificate, NocRecord } from "@/utils/nocCertificatePdf";
import CashPaymentRequestDialog from "@/components/CashPaymentRequestDialog";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const formSchema = z.object({
  applicant_membership_number: z.string().optional(),
  applicant_name: z.string().min(1, "மனுதாரர் பெயர் தேவை"),
  applicant_email: z.string().email("சரியான மின்னஞ்சல் முகவரி உள்ளிடவும்").optional().or(z.literal("")),
  applicant_phone: z.string().min(10, "சரியான தொலைபேசி எண் உள்ளிடவும் (குறைந்தது 10 இலக்கங்கள்)"),
  father_membership_number: z.string().min(1, "தந்தை உறுப்பினர் எண் தேவை"),
  father_name: z.string().min(1, "தந்தை பெயர் தேவை"),
  family_name: z.string().min(1, "வகையரா தேவை"),
  applicant_relationship: z.enum(["மகன்", "மகள்"], {
    required_error: "உறவு முறை தேர்வு செய்யவும்",
  }),
  partner_name: z.string().min(1, "துணை பெயர் தேவை"),
  partner_father_name: z.string().min(1, "துணை தந்தை பெயர் தேவை"),
  partner_category: z.enum(["மணமகனுக்கும்", "மணமகளுக்கும்"], {
    required_error: "துணை வகை தேர்வு செய்யவும்",
  }),
  partner_applicant_relationship: z.enum(["மகன்", "மகள்"], {
    required_error: "துணை உறவு முறை தேர்வு செய்யவும்",
  }),
  mosque_to_submit: z.string().min(1, "சமர்ப்பிக்கும் பள்ளிவாசல் தேவை"),
  address_to_submit: z.string().min(1, "சமர்ப்பிக்கும் முகவரி தேவை"),
});

type FormData = z.infer<typeof formSchema>;

export default function NocCertificatePage() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { getSetting } = useAppSettings();
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [fetchingMember, setFetchingMember] = useState(false);
  const [fetchingFather, setFetchingFather] = useState(false);
  
  // Payment & Status
  const [isPaid, setIsPaid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [nocRecordId, setNocRecordId] = useState<string | null>(null);
  const [nocRecord, setNocRecord] = useState<NocRecord | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Cash payment request state
  const [showCashRequestDialog, setShowCashRequestDialog] = useState(false);
  const [cashRequestData, setCashRequestData] = useState<{
    referenceId: string;
    amount: number;
    failureReason?: string;
  } | null>(null);
  const [showCertReceipt, setShowCertReceipt] = useState<CertificateReceiptData | null>(null);

  const certificateFee = Number(getSetting("certificate_fee_noc") || "100");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      applicant_membership_number: "",
      applicant_name: "",
      applicant_email: "",
      applicant_phone: "",
      father_membership_number: "",
      father_name: "",
      family_name: "",
      applicant_relationship: undefined,
      partner_name: "",
      partner_father_name: "",
      partner_category: undefined,
      partner_applicant_relationship: undefined,
      mosque_to_submit: "",
      address_to_submit: "",
    },
  });

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

  // Fetch member by applicant membership number
  const fetchApplicantMember = async (memberId: string) => {
    if (!memberId || memberId.length < 2) return;
    
    setFetchingMember(true);
    try {
      const { data, error } = await supabase
        .from("gb_members")
        .select("full_name, father_name, family_name")
        .eq("member_id", memberId)
        .eq("is_active", true)
        .single();

      if (!error && data) {
        form.setValue("applicant_name", data.full_name);
      }
    } catch (err) {
      console.error("Error fetching applicant member:", err);
    } finally {
      setFetchingMember(false);
    }
  };

  // Fetch member by father membership number
  const fetchFatherMember = async (memberId: string) => {
    if (!memberId || memberId.length < 2) return;
    
    setFetchingFather(true);
    try {
      const { data, error } = await supabase
        .from("gb_members")
        .select("full_name, father_name, family_name")
        .eq("member_id", memberId)
        .eq("is_active", true)
        .single();

      if (!error && data) {
        form.setValue("father_name", data.full_name);
        form.setValue("family_name", data.family_name || "");
      }
    } catch (err) {
      console.error("Error fetching father member:", err);
    } finally {
      setFetchingFather(false);
    }
  };

  const handlePayment = async () => {
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

      // First create NOC record
      const { data: nocData, error: nocError } = await supabase
        .from("noc_certificates")
        .insert([{
          applicant_membership_number: formData.applicant_membership_number || null,
          applicant_name: formData.applicant_name,
          applicant_email: formData.applicant_email || null,
          applicant_phone: formData.applicant_phone,
          father_membership_number: formData.father_membership_number,
          father_name: formData.father_name,
          family_name: formData.family_name,
          applicant_relationship: formData.applicant_relationship,
          partner_name: formData.partner_name,
          partner_father_name: formData.partner_father_name,
          partner_category: formData.partner_category,
          partner_applicant_relationship: formData.partner_applicant_relationship,
          mosque_to_submit: formData.mosque_to_submit,
          address_to_submit: formData.address_to_submit,
          status: "payment_pending",
          payment_status: "pending",
          user_id: user?.id || null,
        }])
        .select()
        .single();

      if (nocError) throw nocError;

      setNocRecordId(nocData.id);

      // Create certificate payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from("certificate_payments")
        .insert({
          certificate_type: "noc",
          reference_id: nocData.id,
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
        description: "NOC Certificate Fee",
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

            // Update NOC status
            await supabase
              .from("noc_certificates")
              .update({
                status: "payment_pending",
                payment_status: "completed",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
              })
              .eq("id", nocData.id);

            setIsPaid(true);
            setNocRecord({
              ...nocData,
              payment_status: "completed",
            } as NocRecord);
            toast.success("பணம் வெற்றிகரமாக செலுத்தப்பட்டது!");
            // Show receipt with enforcement
            setShowCertReceipt({
              certificateType: "noc",
              applicantName: nocData.applicant_name,
              applicantPhone: nocData.applicant_phone || undefined,
              applicantEmail: nocData.applicant_email || undefined,
              subjectName: nocData.partner_name,
              amount: certificateFee,
              receiptNumber: "",
              referenceId: nocData.id,
              referenceType: "noc_certificate",
              paymentMethod: "online",
              transactionId: response.razorpay_payment_id,
              createdAt: nocData.created_at,
              additionalInfo: {
                "தந்தை பெயர்": nocData.father_name,
                "பள்ளிவாசல்": nocData.mosque_to_submit,
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
              referenceId: nocData.id,
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
          referenceId: nocData.id,
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
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("அனைத்து தேவையான புலங்களையும் நிரப்பவும்");
      return;
    }

    setLoading(true);
    try {
      const formData = form.getValues();

      // Create NOC record with cash payment
      const { data: nocData, error: nocError } = await supabase
        .from("noc_certificates")
        .insert([{
          applicant_membership_number: formData.applicant_membership_number || null,
          applicant_name: formData.applicant_name,
          applicant_email: formData.applicant_email || null,
          applicant_phone: formData.applicant_phone,
          father_membership_number: formData.father_membership_number,
          father_name: formData.father_name,
          family_name: formData.family_name,
          applicant_relationship: formData.applicant_relationship,
          partner_name: formData.partner_name,
          partner_father_name: formData.partner_father_name,
          partner_category: formData.partner_category,
          partner_applicant_relationship: formData.partner_applicant_relationship,
          mosque_to_submit: formData.mosque_to_submit,
          address_to_submit: formData.address_to_submit,
          status: "payment_pending",
          payment_status: "completed",
          user_id: user?.id || null,
        }])
        .select()
        .single();

      if (nocError) throw nocError;

      setNocRecordId(nocData.id);

      // Create certificate payment record with cash payment
      const { error: paymentError } = await supabase
        .from("certificate_payments")
        .insert({
          certificate_type: "noc",
          reference_id: nocData.id,
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
      setNocRecord({
        ...nocData,
        payment_status: "completed",
      } as NocRecord);
      toast.success("ரொக்க பணம் பதிவு செய்யப்பட்டது!");
    } catch (error: any) {
      console.error("Cash payment error:", error);
      toast.error("ரொக்க பணம் பதிவு பிழை: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!nocRecordId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("noc_certificates")
        .update({ status: "submitted" })
        .eq("id", nocRecordId);

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
    if (nocRecordId) {
      await supabase.from("noc_certificates").delete().eq("id", nocRecordId);
    }
    form.reset();
    setIsPaid(false);
    setIsSubmitted(false);
    setIsApproved(false);
    setNocRecordId(null);
    setNocRecord(null);
    setShowPreview(false);
  };

  const handlePrint = async () => {
    if (!nocRecord) return;
    await printNocCertificate(nocRecord);
  };

  const handleDownload = async () => {
    if (!nocRecord) return;
    await generateNocCertificatePdf(nocRecord);
  };

  // Check existing NOC record status
  useEffect(() => {
    if (!nocRecordId) return;

    const checkStatus = async () => {
      const { data, error } = await supabase
        .from("noc_certificates")
        .select("*")
        .eq("id", nocRecordId)
        .single();

      if (!error && data) {
        setNocRecord(data as NocRecord);
        setIsPaid(data.payment_status === "completed");
        setIsSubmitted(data.status === "submitted" || data.status === "approved");
        setIsApproved(data.status === "approved");
      }
    };

    checkStatus();
  }, [nocRecordId]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-tamil text-xl md:text-2xl">
              <FileText className="h-6 w-6" />
              ஆட்சேபனையின்மை சான்றிதழ் (NOC)
            </CardTitle>
            <CardDescription className="font-tamil">
              திருமணத்திற்கான ஆட்சேபனையின்மை சான்றிதழ் கோரிக்கை படிவம்
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
                      name="applicant_membership_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">
                            மனுதாரர் உறுப்பினர் எண் (விருப்பம்)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="உறுப்பினர் எண்"
                              onBlur={() => fetchApplicantMember(field.value || "")}
                              disabled={isPaid}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="applicant_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">மனுதாரர் பெயர் *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <TamilInput
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                name={field.name}
                                placeholder="Type in English, auto-converts to Tamil"
                                disabled={isPaid}
                              />
                              {fetchingMember && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="applicant_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">
                            <Phone className="inline-block h-4 w-4 mr-1" />
                            தொலைபேசி எண் *
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              placeholder="தொலைபேசி எண்"
                              disabled={isPaid}
                            />
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
                          <FormLabel className="font-tamil">
                            <Mail className="inline-block h-4 w-4 mr-1" />
                            மின்னஞ்சல் (விருப்பம்)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="email@example.com"
                              disabled={isPaid}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="father_membership_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">தந்தை உறுப்பினர் எண் *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="தந்தை உறுப்பினர் எண்"
                              onBlur={() => fetchFatherMember(field.value)}
                              disabled={isPaid}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="father_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">தந்தை பெயர் *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <TamilInput
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                name={field.name}
                                placeholder="Type in English, auto-converts to Tamil"
                                disabled={isPaid}
                              />
                              {fetchingFather && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="family_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">வகையரா *</FormLabel>
                          <FormControl>
                            <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" disabled={isPaid} />
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
                          <FormLabel className="font-tamil">உறவு முறை *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isPaid}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="தேர்வு செய்யவும்" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="மகன்">மகன்</SelectItem>
                              <SelectItem value="மகள்">மகள்</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Partner Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold font-tamil border-b pb-2">
                    துணை விவரங்கள்
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="partner_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">துணை பெயர் *</FormLabel>
                          <FormControl>
                            <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" disabled={isPaid} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="partner_father_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">துணை தந்தை பெயர் *</FormLabel>
                          <FormControl>
                            <TamilInput
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              placeholder="Type in English, auto-converts to Tamil"
                              disabled={isPaid}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="partner_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">துணை வகை *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isPaid}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="தேர்வு செய்யவும்" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="மணமகனுக்கும்">மணமகனுக்கும்</SelectItem>
                              <SelectItem value="மணமகளுக்கும்">மணமகளுக்கும்</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="partner_applicant_relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-tamil">துணை உறவு முறை *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isPaid}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="தேர்வு செய்யவும்" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="மகன்">மகன்</SelectItem>
                              <SelectItem value="மகள்">மகள்</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Submission Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold font-tamil border-b pb-2">
                    சமர்ப்பிக்கும் விவரங்கள்
                  </h3>

                  <FormField
                    control={form.control}
                    name="mosque_to_submit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-tamil">சமர்ப்பிக்கும் பள்ளிவாசல் *</FormLabel>
                        <FormControl>
                          <TamilInput
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            placeholder="Type in English, auto-converts to Tamil"
                            disabled={isPaid}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address_to_submit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-tamil">சமர்ப்பிக்கும் முகவரி *</FormLabel>
                        <FormControl>
                          <TamilInput
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            placeholder="Type in English, auto-converts to Tamil"
                            disabled={isPaid}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Fee Display */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-tamil font-medium">சான்றிதழ் கட்டணம்:</span>
                    <span className="flex items-center text-lg font-bold">
                      <IndianRupee className="h-5 w-5" />
                      {certificateFee}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row md:flex-wrap items-stretch gap-3 pt-4">
                  {!isPaid ? (
                    isAdmin ? (
                      <>
                        <Button
                          type="button"
                          onClick={handleCashPayment}
                          disabled={loading}
                          className="w-full md:flex-1 md:min-w-[170px] min-w-0 h-auto py-2 px-3"
                          variant="default"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" />
                          ) : (
                            <Banknote className="h-4 w-4 mr-2 shrink-0" />
                          )}
                          <span className="font-tamil block min-w-0 truncate">ரொக்கம் செலுத்து</span>
                        </Button>
                        <Button
                          type="button"
                          onClick={handlePayment}
                          disabled={loading || !razorpayLoaded}
                          variant="outline"
                          className="w-full md:flex-1 md:min-w-[170px] min-w-0 h-auto py-2 px-3"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" />
                          ) : (
                            <CreditCard className="h-4 w-4 mr-2 shrink-0" />
                          )}
                          <span className="font-tamil block min-w-0 truncate">ஆன்லைன் செலுத்து</span>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          onClick={handlePayment}
                          disabled={loading || !razorpayLoaded}
                          className="w-full md:flex-1 md:min-w-[170px] min-w-0 h-auto py-2 px-3"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" />
                          ) : (
                            <CreditCard className="h-4 w-4 mr-2 shrink-0" />
                          )}
                          <span className="font-tamil block min-w-0 truncate">ஆன்லைன் செலுத்து</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={async () => {
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
                          className="w-full md:flex-1 md:min-w-[170px] min-w-0 h-auto py-2 px-3"
                        >
                          <Banknote className="h-4 w-4 mr-2 shrink-0" />
                          <span className="font-tamil block min-w-0 truncate">ரொக்க கோரிக்கை</span>
                        </Button>
                      </>
                    )
                  ) : !isSubmitted ? (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      className="w-full md:flex-1 md:min-w-[170px] min-w-0 h-auto py-2 px-3"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" />
                      ) : (
                        <Send className="h-4 w-4 mr-2 shrink-0" />
                      )}
                      <span className="font-tamil block min-w-0 truncate">அனுப்பு</span>
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrint}
                    disabled={!isPaid || !isApproved || loading}
                    className="w-full md:flex-1 md:min-w-[170px] min-w-0 h-auto py-2 px-3"
                  >
                    <Printer className="h-4 w-4 mr-2 shrink-0" />
                    <span className="font-tamil block min-w-0 truncate">அச்சிடு</span>
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleCancel}
                    disabled={loading}
                    className="w-full md:flex-1 md:min-w-[170px] min-w-0 h-auto py-2 px-3"
                  >
                    <X className="h-4 w-4 mr-2 shrink-0" />
                    <span className="font-tamil block min-w-0 truncate">ரத்து செய்</span>
                  </Button>
                </div>

                {/* Status Messages */}
                {isPaid && !isSubmitted && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <p className="text-green-700 font-tamil text-center">
                      ✓ பணம் வெற்றிகரமாக செலுத்தப்பட்டது. தயவுசெய்து "அனுப்பு" பொத்தானை அழுத்தி
                      நிர்வாகிக்கு சமர்ப்பிக்கவும்.
                    </p>
                  </div>
                )}

                {isSubmitted && !isApproved && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-yellow-700 font-tamil text-center">
                      ⏳ உங்கள் கோரிக்கை நிர்வாகி ஒப்புதலுக்காக காத்திருக்கிறது.
                    </p>
                  </div>
                )}

                {isApproved && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <p className="text-green-700 font-tamil text-center">
                      ✓ உங்கள் சான்றிதழ் ஒப்புதல் அளிக்கப்பட்டது. இப்போது அச்சிடலாம்.
                    </p>
                  </div>
                )}

                {/* Preview */}
                {nocRecord && showPreview && (
                  <div className="mt-6">
                    <NocCertificatePreview record={nocRecord} />
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Cash Payment Request Dialog */}
        {cashRequestData && (
          <CashPaymentRequestDialog
            open={showCashRequestDialog}
            onOpenChange={setShowCashRequestDialog}
            serviceType="noc"
            referenceId={cashRequestData.referenceId || undefined}
            amount={cashRequestData.amount}
            applicantName={form.getValues("applicant_name")}
            applicantPhone={form.getValues("applicant_phone")}
            applicantEmail={form.getValues("applicant_email") || undefined}
            failureReason={cashRequestData.failureReason}
            serviceDetails={{
              fatherName: form.getValues("father_name"),
              familyName: form.getValues("family_name"),
              partnerName: form.getValues("partner_name"),
              mosqueToSubmit: form.getValues("mosque_to_submit"),
            }}
            onBeforeSubmit={
              !cashRequestData.referenceId
                ? async () => {
                    const formData = form.getValues();
                    const { data: nocData, error: nocError } = await supabase
                      .from("noc_certificates")
                      .insert([{
                        applicant_membership_number: formData.applicant_membership_number || null,
                        applicant_name: formData.applicant_name,
                        applicant_email: formData.applicant_email || null,
                        applicant_phone: formData.applicant_phone,
                        father_membership_number: formData.father_membership_number,
                        father_name: formData.father_name,
                        family_name: formData.family_name,
                        applicant_relationship: formData.applicant_relationship,
                        partner_name: formData.partner_name,
                        partner_father_name: formData.partner_father_name,
                        partner_category: formData.partner_category,
                        partner_applicant_relationship: formData.partner_applicant_relationship,
                        mosque_to_submit: formData.mosque_to_submit,
                        address_to_submit: formData.address_to_submit,
                        status: "payment_pending",
                        payment_status: "pending",
                        user_id: user?.id || null,
                      }])
                      .select()
                      .single();

                    if (nocError) throw nocError;
                    setNocRecordId(nocData.id);
                    return nocData.id;
                  }
                : undefined
            }
            onSuccess={() => {
              setCashRequestData(null);
              form.reset();
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