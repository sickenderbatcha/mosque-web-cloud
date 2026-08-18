import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/auditLog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { incrementMarriageCertificateSequence } from "@/components/admin/MarriageCertificateNumberSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TamilInput } from "@/components/ui/tamil-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Eye,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  FileDown,
  Printer,
  Pencil,
  MonitorPlay,
  CreditCard,
  AlertCircle,
  Banknote,
  IndianRupee,
} from "lucide-react";
import { generateMarriageCertificatePdf, printMarriageCertificate } from "@/utils/marriageCertificatePdf";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import MarriageCertificatePreview from "@/components/MarriageCertificatePreview";
import { getCertificateAccessStatus } from "@/lib/certificatePayments";
import CashPaymentRequestDialog from "@/components/CashPaymentRequestDialog";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserTabPermissions } from "@/hooks/useUserTabPermissions";
import MarriagePhotoUpload from "@/components/admin/MarriagePhotoUpload";
import { SignedImg } from "@/components/SignedImage";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const islamicMonths = [
  "முஹர்ரம்",
  "சஃபர்",
  "ரபீஉல் அவ்வல்",
  "ரபீஉஸ் ஸானி",
  "ஜமாதில் அவ்வல்",
  "ஜமாதிஸ் ஸானி",
  "ரஜப்",
  "ஷஅபான்",
  "ரமழான்",
  "ஷவ்வால்",
  "துல்கஅதா",
  "துல்ஹஜ்",
];

const englishMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dayNames = [
  "ஞாயிறு",
  "திங்கள்",
  "செவ்வாய்",
  "புதன்",
  "வியாழன்",
  "வெள்ளி",
  "சனி",
];

const dayNamesEnglish = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const formSchema = z.object({
  member_id: z.string().optional().default(""),
  hijri_year: z.coerce.number().min(1400).max(1500),
  hijri_month: z.string().min(1, "தேவை"),
  hijri_day: z.coerce.number().min(1).max(30),
  gregorian_year: z.coerce.number().min(2000).max(2100),
  gregorian_month: z.string().min(1, "தேவை"),
  gregorian_day: z.coerce.number().min(1).max(31),
  day_name: z.string().min(1, "தேவை"),
  day_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  day_night: z.enum(["பகல்", "இரவு"], { required_error: "தேவை" }),
  time_of_event: z.string().min(1, "தேவை"),
  place_of_marriage: z.string().min(1, "தேவை"),
  place_of_marriage_en: z.preprocess(emptyToUndefined, z.string().optional()),

  groom_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  groom_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  groom_father_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  groom_father_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  groom_category: z.preprocess(emptyToUndefined, z.string().max(10, "அதிகபட்சம் 10 எழுத்துகள்").optional()),
  groom_address: z.string().min(1, "தேவை"),
  groom_age: z.coerce.number().min(18).max(100),
  groom_madhab: z.preprocess(emptyToUndefined, z.string().max(5, "அதிகபட்சம் 5 எழுத்துகள்").optional()),

  bride_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  bride_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  bride_father_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  bride_father_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  bride_category: z.preprocess(emptyToUndefined, z.string().max(10, "அதிகபட்சம் 10 எழுத்துகள்").optional()),
  bride_address: z.string().min(1, "தேவை"),
  bride_age: z.coerce.number().min(18).max(100),
  bride_madhab: z.preprocess(emptyToUndefined, z.string().max(5, "அதிகபட்சம் 5 எழுத்துகள்").optional()),

  wali_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  wali_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  wali_father_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  mahr: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  mahr_en: z.preprocess(emptyToUndefined, z.string().optional()),
  witness1_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  witness1_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  witness1_father_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  witness1_father_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  witness2_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  witness2_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  witness2_father_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  witness2_father_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  kathib_thaib_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  kathib_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  kathib_thaib_father_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  registrar_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  registrar_father_name: z.string().min(1, "தேவை").max(50, "அதிகபட்சம் 50 எழுத்துகள்"),
  register_page_number: z.preprocess(emptyToUndefined, z.string().optional()),
});

type FormData = z.infer<typeof formSchema>;

interface MemberDetails {
  member_id: string;
  full_name: string;
  father_name: string;
  address: string;
  phone: string;
  family_name: string;
  date_of_birth: string;
}

export default function MarriageRegisterTab() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { canAccessTab } = useUserTabPermissions();
  const { getSetting } = useAppSettings(["certificate_fee_marriage", "marriage_cert_online_disabled"]);
  const marriageCertOnlineDisabled = getSetting("marriage_cert_online_disabled") === "true";
  const canBypassOnlineDisable = isAdmin || canAccessTab("certificate-payments");
  const isOnlineDisabledForUser = marriageCertOnlineDisabled && !canBypassOnlineDisable;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [previewRecord, setPreviewRecord] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [memberIdInput, setMemberIdInput] = useState("");
  const [memberDetails, setMemberDetails] = useState<MemberDetails | null>(null);
  const [memberLookupStatus, setMemberLookupStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [groomPhotoUrl, setGroomPhotoUrl] = useState("");
  const [bridePhotoUrl, setBridePhotoUrl] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Cash payment request state
  const [showCashRequestDialog, setShowCashRequestDialog] = useState(false);
  const [cashRequestData, setCashRequestData] = useState<{
    referenceId: string;
    amount: number;
    failureReason?: string;
    groomName: string;
    brideName: string;
    applicantPhone: string;
  } | null>(null);

  const certificateFee = Number(getSetting("certificate_fee_marriage") || "100");

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

  // Check payment status when viewing/previewing a record.
  // IMPORTANT: once any completed payment exists for this certificate, allow print/download forever.
  useEffect(() => {
    const checkPaymentStatus = async () => {
      const recordId = viewRecord?.id || previewRecord?.id;
      if (!recordId) {
        setPaymentStatus(null);
        return;
      }

      setPaymentLoading(true);
      try {
        const access = await getCertificateAccessStatus({
          referenceId: recordId,
          certificateType: "marriage",
        });
        setPaymentStatus(access.paymentStatus);
      } finally {
        setPaymentLoading(false);
      }
    };

    checkPaymentStatus();
  }, [viewRecord?.id, previewRecord?.id]);

  const isPaymentCompleted = paymentStatus === "completed";

  // Handle Razorpay payment for marriage certificate
  const handleRazorpayPayment = async (record: any) => {
    // If online payment is disabled for this user, redirect to cash payment request
    if (isOnlineDisabledForUser) {
      setCashRequestData({
        referenceId: record.id,
        amount: certificateFee,
        failureReason: "Online payment disabled by admin",
        groomName: record.groom_name,
        brideName: record.bride_name,
        applicantPhone: "தொடர்புக்கு: நிர்வாகி",
      });
      setShowCashRequestDialog(true);
      return;
    }

    if (!razorpayLoaded) {
      toast.error("பணம் செலுத்தும் சேவை ஏற்றப்படவில்லை");
      return;
    }

    setPaymentProcessing(true);
    try {
      // Create certificate payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from("certificate_payments")
        .insert({
          certificate_type: "marriage",
          reference_id: record.id,
          applicant_name: record.groom_name,
          applicant_phone: record.groom_address?.split(",")[0] || "N/A", // Using address as fallback
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
        description: "Marriage Certificate Fee",
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

            setPaymentStatus("completed");
            toast.success("பணம் வெற்றிகரமாக செலுத்தப்பட்டது!");
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
              referenceId: record.id,
              amount: certificateFee,
              failureReason: "Payment cancelled by user",
              groomName: record.groom_name,
              brideName: record.bride_name,
              applicantPhone: "தொடர்புக்கு: நிர்வாகி",
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
          referenceId: record.id,
          amount: certificateFee,
          failureReason: response.error?.description || response.error?.reason || "Payment failed",
          groomName: record.groom_name,
          brideName: record.bride_name,
              applicantPhone: "தொடர்புக்கு: நிர்வாகி",
        });
        setShowCashRequestDialog(true);
      });
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error("பணம் செலுத்துதல் பிழை: " + error.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Handle Cash Payment (Admin only) - mark as paid directly
  const handleCashPayment = async (record: any) => {
    setPaymentProcessing(true);
    try {
      // Create certificate payment record with cash payment
      const { error: paymentError } = await supabase
        .from("certificate_payments")
        .insert({
          certificate_type: "marriage",
          reference_id: record.id,
          applicant_name: record.groom_name,
          applicant_phone: "தொடர்புக்கு: நிர்வாகி",
          amount: certificateFee,
          payment_status: "completed",
          payment_method: "cash",
          user_id: user?.id || null,
        });

      if (paymentError) throw paymentError;

      setPaymentStatus("completed");
      toast.success("ரொக்க பணம் பதிவு செய்யப்பட்டது!");
    } catch (error: any) {
      console.error("Cash payment error:", error);
      toast.error("ரொக்க பணம் பதிவு பிழை: " + error.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Manual cash request (for users who want to pay later)
  const handleManualCashRequest = (record: any) => {
    setCashRequestData({
      referenceId: record.id,
      amount: certificateFee,
      groomName: record.groom_name,
      brideName: record.bride_name,
      applicantPhone: "தொடர்புக்கு: நிர்வாகி",
    });
    setShowCashRequestDialog(true);
  };

  const initialFormValues = useMemo<FormData>(() => {
    const now = new Date();

    return {
      member_id: "",
      hijri_year: now.getFullYear() - 579,
      hijri_month: islamicMonths[0],
      gregorian_year: now.getFullYear(),
      gregorian_month: englishMonths[now.getMonth()],
      hijri_day: 1,
      gregorian_day: now.getDate(),
      day_name: dayNames[now.getDay()],
      day_name_en: dayNamesEnglish[now.getDay()],
      day_night: "பகல்",
      time_of_event: "",
      place_of_marriage: "",
      place_of_marriage_en: "",
      groom_name: "",
      groom_name_en: "",
      groom_father_name: "",
      groom_father_name_en: "",
      groom_category: "",
      groom_address: "",
      groom_age: 18,
      groom_madhab: "",
      bride_name: "",
      bride_name_en: "",
      bride_father_name: "",
      bride_father_name_en: "",
      bride_category: "",
      bride_address: "",
      bride_age: 18,
      bride_madhab: "",
      wali_name: "",
      wali_name_en: "",
      wali_father_name: "",
      mahr: "",
      mahr_en: "",
      witness1_name: "",
      witness1_name_en: "",
      witness1_father_name: "",
      witness1_father_name_en: "",
      witness2_name: "",
      witness2_name_en: "",
      witness2_father_name: "",
      witness2_father_name_en: "",
      kathib_thaib_name: "",
      kathib_name_en: "",
      kathib_thaib_father_name: "",
      registrar_name: "",
      registrar_father_name: "",
      register_page_number: "",
    };
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialFormValues,
  });

  const resetToInitial = () => {
    // RHF reset(values) updates defaultValues by default; keepDefaultValues prevents
    // "edit" values from becoming the new defaults.
    form.reset(initialFormValues, { keepDefaultValues: true });
  };

  const lookupMember = async () => {
    if (!memberIdInput.trim()) {
      toast.error("உறுப்பினர் எண் உள்ளிடவும்");
      return;
    }

    setMemberLookupStatus("loading");
    
    const { data, error } = await supabase
      .from("gb_members")
      .select("member_id, full_name, father_name, address, phone, family_name, date_of_birth")
      .eq("member_id", memberIdInput.trim())
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      toast.error("பிழை: " + error.message);
      setMemberLookupStatus("idle");
      return;
    }

    if (data) {
      setMemberDetails(data);
      setMemberLookupStatus("found");
      form.setValue("member_id", data.member_id);
      toast.success("உறுப்பினர் கண்டுபிடிக்கப்பட்டது");
    } else {
      setMemberDetails(null);
      setMemberLookupStatus("not_found");
      toast.error("உறுப்பினர் கண்டுபிடிக்கப்படவில்லை");
    }
  };

  const clearMemberLookup = () => {
    setMemberIdInput("");
    setMemberDetails(null);
    setMemberLookupStatus("idle");
    form.setValue("member_id", "");
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const autoFillFromMember = () => {
    if (!memberDetails) return;
    
    const age = calculateAge(memberDetails.date_of_birth);
    
    // Always fill groom details as all members are males
    form.setValue("groom_name", memberDetails.full_name.substring(0, 50));
    form.setValue("groom_father_name", memberDetails.father_name.substring(0, 50));
    form.setValue("groom_address", memberDetails.address);
    form.setValue("groom_age", age);
    toast.success("மணமகன் விவரங்கள் நிரப்பப்பட்டது");
  };

  const { data: records, isLoading } = useQuery({
    queryKey: ["marriage-registers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marriage_registers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from("marriage_registers").insert({
        member_id: data.member_id || null,
        hijri_year: data.hijri_year,
        hijri_month: data.hijri_month,
        hijri_day: data.hijri_day,
        gregorian_year: data.gregorian_year,
        gregorian_month: data.gregorian_month,
        gregorian_day: data.gregorian_day,
        day_name: data.day_name,
        day_name_en: data.day_name_en || null,
        day_night: data.day_night,
        time_of_event: data.time_of_event,
        place_of_marriage: data.place_of_marriage || null,
        place_of_marriage_en: data.place_of_marriage_en || null,
        groom_name: data.groom_name,
        groom_name_en: data.groom_name_en || null,
        groom_father_name: data.groom_father_name,
        groom_father_name_en: data.groom_father_name_en || null,
        groom_category: data.groom_category || null,
        groom_address: data.groom_address,
        groom_age: data.groom_age,
        groom_madhab: data.groom_madhab || null,
        groom_photo_url: groomPhotoUrl || null,
        bride_name: data.bride_name,
        bride_name_en: data.bride_name_en || null,
        bride_father_name: data.bride_father_name,
        bride_father_name_en: data.bride_father_name_en || null,
        bride_category: data.bride_category || null,
        bride_address: data.bride_address,
        bride_age: data.bride_age,
        bride_madhab: data.bride_madhab || null,
        bride_photo_url: bridePhotoUrl || null,
        wali_name: data.wali_name,
        wali_name_en: data.wali_name_en || null,
        wali_father_name: data.wali_father_name,
        mahr: data.mahr,
        mahr_en: data.mahr_en || null,
        witness1_name: data.witness1_name,
        witness1_name_en: data.witness1_name_en || null,
        witness1_father_name: data.witness1_father_name,
        witness1_father_name_en: data.witness1_father_name_en || null,
        witness2_name: data.witness2_name,
        witness2_name_en: data.witness2_name_en || null,
        witness2_father_name: data.witness2_father_name,
        witness2_father_name_en: data.witness2_father_name_en || null,
        kathib_thaib_name: data.kathib_thaib_name,
        kathib_name_en: data.kathib_name_en || null,
        kathib_thaib_father_name: data.kathib_thaib_father_name,
        registrar_name: data.registrar_name,
        registrar_father_name: data.registrar_father_name,
        register_page_number: data.register_page_number || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["marriage-registers"] });
      logAdminAction({ action_type: "create_marriage_register", action_description: `Added marriage register entry`, target_table: "marriage_registers" });
      toast.success("திருமண பதிவு வெற்றிகரமாக சேர்க்கப்பட்டது");
      setIsDialogOpen(false);
      clearMemberLookup();
      setGroomPhotoUrl("");
      setBridePhotoUrl("");
      resetToInitial();
      // Increment certificate number sequence
      await incrementMarriageCertificateSequence();
    },
    onError: (error) => {
      toast.error("பிழை: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marriage_registers")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marriage-registers"] });
      logAdminAction({ action_type: "delete_marriage_register", action_description: `Deleted marriage register entry`, target_table: "marriage_registers" });
      toast.success("பதிவு நீக்கப்பட்டது");
    },
    onError: (error) => {
      toast.error("பிழை: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const { error } = await supabase
        .from("marriage_registers")
        .update({
          member_id: data.member_id || null,
          hijri_year: data.hijri_year,
          hijri_month: data.hijri_month,
          hijri_day: data.hijri_day,
          gregorian_year: data.gregorian_year,
          gregorian_month: data.gregorian_month,
          gregorian_day: data.gregorian_day,
          day_name: data.day_name,
          day_name_en: data.day_name_en || null,
          day_night: data.day_night,
          time_of_event: data.time_of_event,
          place_of_marriage: data.place_of_marriage || null,
          place_of_marriage_en: data.place_of_marriage_en || null,
          groom_name: data.groom_name,
          groom_name_en: data.groom_name_en || null,
          groom_father_name: data.groom_father_name,
          groom_father_name_en: data.groom_father_name_en || null,
          groom_category: data.groom_category || null,
          groom_address: data.groom_address,
          groom_age: data.groom_age,
          groom_madhab: data.groom_madhab || null,
          groom_photo_url: groomPhotoUrl || null,
          bride_name: data.bride_name,
          bride_name_en: data.bride_name_en || null,
          bride_father_name: data.bride_father_name,
          bride_father_name_en: data.bride_father_name_en || null,
          bride_category: data.bride_category || null,
          bride_address: data.bride_address,
          bride_age: data.bride_age,
          bride_madhab: data.bride_madhab || null,
          bride_photo_url: bridePhotoUrl || null,
          wali_name: data.wali_name,
          wali_name_en: data.wali_name_en || null,
          wali_father_name: data.wali_father_name,
          mahr: data.mahr,
          mahr_en: data.mahr_en || null,
          witness1_name: data.witness1_name,
          witness1_name_en: data.witness1_name_en || null,
          witness1_father_name: data.witness1_father_name,
          witness1_father_name_en: data.witness1_father_name_en || null,
          witness2_name: data.witness2_name,
          witness2_name_en: data.witness2_name_en || null,
          witness2_father_name: data.witness2_father_name,
          witness2_father_name_en: data.witness2_father_name_en || null,
          kathib_thaib_name: data.kathib_thaib_name,
          kathib_name_en: data.kathib_name_en || null,
          kathib_thaib_father_name: data.kathib_thaib_father_name,
          registrar_name: data.registrar_name,
          registrar_father_name: data.registrar_father_name,
          register_page_number: data.register_page_number || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marriage-registers"] });
      logAdminAction({ action_type: "update_marriage_register", action_description: `Updated marriage register entry`, target_table: "marriage_registers" });
      toast.success("திருமண பதிவு வெற்றிகரமாக புதுப்பிக்கப்பட்டது");
      setIsDialogOpen(false);
      setEditRecord(null);
      clearMemberLookup();
      setGroomPhotoUrl("");
      setBridePhotoUrl("");
      resetToInitial();
    },
    onError: (error) => {
      toast.error("பிழை: " + error.message);
    },
  });

  const onSubmit = (data: FormData) => {
    if (editRecord) {
      updateMutation.mutate({ id: editRecord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false);
      clearMemberLookup();
      resetToInitial();
      setEditRecord(null);
      setGroomPhotoUrl("");
      setBridePhotoUrl("");
    } else {
      setIsDialogOpen(true);
    }
  };

  const openNewEntryDialog = () => {
    setEditRecord(null);
    clearMemberLookup();
    resetToInitial();
    setGroomPhotoUrl("");
    setBridePhotoUrl("");
    setIsDialogOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditRecord(record);
    setMemberIdInput(record.member_id || "");
    setGroomPhotoUrl(record.groom_photo_url || "");
    setBridePhotoUrl(record.bride_photo_url || "");
    form.reset(
      {
        member_id: record.member_id || "",
        hijri_year: record.hijri_year,
        hijri_month: record.hijri_month,
        hijri_day: record.hijri_day,
        gregorian_year: record.gregorian_year,
        gregorian_month: record.gregorian_month,
        gregorian_day: record.gregorian_day,
        day_name: record.day_name,
        day_name_en: record.day_name_en || "",
        day_night: record.day_night,
        time_of_event: record.time_of_event,
        place_of_marriage: record.place_of_marriage || "",
        place_of_marriage_en: record.place_of_marriage_en || "",
        groom_name: record.groom_name,
        groom_name_en: record.groom_name_en || "",
        groom_father_name: record.groom_father_name,
        groom_father_name_en: record.groom_father_name_en || "",
        groom_category: record.groom_category || "",
        groom_address: record.groom_address,
        groom_age: record.groom_age,
        groom_madhab: record.groom_madhab || "",
        bride_name: record.bride_name,
        bride_name_en: record.bride_name_en || "",
        bride_father_name: record.bride_father_name,
        bride_father_name_en: record.bride_father_name_en || "",
        bride_category: record.bride_category || "",
        bride_address: record.bride_address,
        bride_age: record.bride_age,
        bride_madhab: record.bride_madhab || "",
        wali_name: record.wali_name,
        wali_name_en: record.wali_name_en || "",
        wali_father_name: record.wali_father_name,
        mahr: record.mahr,
        mahr_en: record.mahr_en || "",
        witness1_name: record.witness1_name,
        witness1_name_en: record.witness1_name_en || "",
        witness1_father_name: record.witness1_father_name,
        witness1_father_name_en: record.witness1_father_name_en || "",
        witness2_name: record.witness2_name,
        witness2_name_en: record.witness2_name_en || "",
        witness2_father_name: record.witness2_father_name,
        witness2_father_name_en: record.witness2_father_name_en || "",
        kathib_thaib_name: record.kathib_thaib_name || "",
        kathib_name_en: record.kathib_name_en || "",
        kathib_thaib_father_name: record.kathib_thaib_father_name || "",
        registrar_name: record.registrar_name,
        registrar_father_name: record.registrar_father_name,
        register_page_number: record.register_page_number || "",
      },
      { keepDefaultValues: true }
    );
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">திருமண / நிக்காஹ் பதிவேடு</h2>
          <p className="text-muted-foreground">திருமண பதிவுகளை நிர்வகிக்கவும்</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <Button onClick={openNewEntryDialog}>
            <Plus className="h-4 w-4 mr-2" />
            புதிய பதிவு
          </Button>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{editRecord ? "திருமண பதிவை திருத்து" : "திருமண / நிக்காஹ் பதிவேடு"}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh]">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pr-4">
                  {/* Member Lookup Section */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-lg">உறுப்பினர் சரிபார்ப்பு (மணமகன்)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="memberIdLookup">உறுப்பினர் எண்</Label>
                        <div className="flex flex-col sm:flex-row gap-2 mt-1">
                          <Input
                            id="memberIdLookup"
                            placeholder="உறுப்பினர் எண் உள்ளிடவும்"
                            value={memberIdInput}
                            onChange={(e) => setMemberIdInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookupMember())}
                          />
                          <Button
                            type="button"
                            onClick={lookupMember}
                            disabled={memberLookupStatus === "loading"}
                          >
                            <Search className="h-4 w-4 mr-2" />
                            {memberLookupStatus === "loading" ? "தேடுகிறது..." : "தேடு"}
                          </Button>
                        </div>
                      </div>

                      {memberLookupStatus === "found" && memberDetails && (
                        <div className="rounded-lg border bg-background p-4 space-y-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                உறுப்பினர் சரிபார்க்கப்பட்டது
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                type="button" 
                                onClick={autoFillFromMember}
                                size="sm"
                              >
                                மணமகன் விவரங்களை நிரப்பு
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={clearMemberLookup}>
                                அழி
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">உறுப்பினர் எண்:</span>
                              <p className="font-medium">{memberDetails.member_id}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">பெயர்:</span>
                              <p className="font-medium">{memberDetails.full_name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">தந்தை பெயர்:</span>
                              <p className="font-medium">{memberDetails.father_name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">குடும்பப் பெயர்:</span>
                              <p className="font-medium">{memberDetails.family_name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">தொலைபேசி:</span>
                              <p className="font-medium">{memberDetails.phone}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">வயது:</span>
                              <p className="font-medium">{calculateAge(memberDetails.date_of_birth)} ஆண்டுகள்</p>
                            </div>
                            <div className="col-span-2 md:col-span-3">
                              <span className="text-muted-foreground">முகவரி:</span>
                              <p className="font-medium">{memberDetails.address}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {memberLookupStatus === "not_found" && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-destructive" />
                            <span className="text-destructive font-medium">
                              உறுப்பினர் கண்டுபிடிக்கப்படவில்லை. சரியான உறுப்பினர் எண் உள்ளிடவும்.
                            </span>
                          </div>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="register_page_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>பதிவேட்டில் பக்க எண்</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="எ.கா: 45" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Date and Time Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">தேதி மற்றும் நேரம்</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="hijri_year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ஹிஜ்ரி ஆண்டு</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hijri_month"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ஹிஜ்ரி மாதம்</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="மாதம் தேர்வு செய்க" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {islamicMonths.map((month) => (
                                  <SelectItem key={month} value={month}>
                                    {month}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hijri_day"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ஹிஜ்ரி நாள்</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} max={30} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gregorian_year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>கி. பி. ஆண்டு</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gregorian_month"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>கி. பி. மாதம்</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="மாதம் தேர்வு செய்க" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {englishMonths.map((month) => (
                                  <SelectItem key={month} value={month}>
                                    {month}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gregorian_day"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>கி. பி. நாள்</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} max={31} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="day_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>கிழமை</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Auto-fill English day name
                                const index = dayNames.indexOf(value);
                                if (index !== -1) {
                                  form.setValue("day_name_en", dayNamesEnglish[index]);
                                }
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="கிழமை தேர்வு செய்க" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {dayNames.map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {day}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="day_night"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>பகல்/இரவு</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="தேர்வு செய்க" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="பகல்">பகல்</SelectItem>
                                <SelectItem value="இரவு">இரவு</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="time_of_event"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>நேரம்</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="place_of_marriage"
                        render={({ field }) => (
                          <FormItem className="md:col-span-3">
                            <FormLabel>திருமண நிகழ்விடம் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput 
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                name={field.name}
                                placeholder="Type in English, auto-converts to Tamil"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="place_of_marriage_en"
                        render={({ field }) => (
                          <FormItem className="md:col-span-3">
                            <FormLabel>Place of Marriage (English - for certificate)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Marriage venue address in English" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Groom Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">மணமகன் விவரங்கள் / Groom Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <MarriagePhotoUpload
                        label="மணமகன் புகைப்படம் / Groom Photo"
                        photoUrl={groomPhotoUrl}
                        onPhotoChange={setGroomPhotoUrl}
                        folder="groom"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="groom_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>மணமகன் பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="groom_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Groom Name (English)</FormLabel>
                            <FormControl>
                              <Input maxLength={50} placeholder="For certificate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="groom_father_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>மணமகன் தந்தை பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="groom_father_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Groom Father Name (English)</FormLabel>
                            <FormControl>
                              <Input maxLength={50} placeholder="For certificate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="groom_category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>மணமகன் வகையரா</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="groom_age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>மணமகன் வயது</FormLabel>
                            <FormControl>
                              <Input type="number" min={18} max={100} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="groom_madhab"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>மணமகன் மத்ஹப்</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="groom_address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>மணமகன் முகவரி</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bride Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">மணமகள் விவரங்கள் / Bride Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <MarriagePhotoUpload
                        label="மணமகள் புகைப்படம் / Bride Photo"
                        photoUrl={bridePhotoUrl}
                        onPhotoChange={setBridePhotoUrl}
                        folder="bride"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bride_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>மணமகள் பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bride_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bride Name (English)</FormLabel>
                            <FormControl>
                              <Input maxLength={50} placeholder="For certificate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bride_father_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>மணமகள் தந்தை பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bride_father_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bride Father Name (English)</FormLabel>
                            <FormControl>
                              <Input maxLength={50} placeholder="For certificate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bride_category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>மணமகள் வகையரா</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bride_age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>மணமகள் வயது</FormLabel>
                            <FormControl>
                              <Input type="number" min={18} max={100} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bride_madhab"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>மணமகள் மத்ஹப்</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bride_address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>மணமகள் முகவரி</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">ஒலி/வக்கீல் மற்றும் மகர் / Wali & Mahr</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="wali_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ஒலி/வக்கீல் பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="wali_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wali Name (English)</FormLabel>
                            <FormControl>
                              <Input maxLength={50} placeholder="For certificate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="wali_father_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ஒலி/வக்கீல் தந்தை பெயர்</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="mahr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>மகர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="mahr_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mahr (English)</FormLabel>
                            <FormControl>
                              <Input maxLength={50} placeholder="e.g. 16 Grms Gold chain" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Witnesses */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">சாட்சிகள் மற்றும் கத்திப் / Witnesses & Kathib</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="witness1_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>சாட்சி-1 பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="witness1_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Witness 1 Name (English)</FormLabel>
                            <FormControl>
                              <Input maxLength={50} placeholder="For certificate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="witness1_father_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>சாட்சி-1 தந்தை பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="witness1_father_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Witness 1 Father Name (English)</FormLabel>
                            <FormControl>
                              <Input maxLength={50} placeholder="For certificate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="witness2_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>சாட்சி-2 பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="witness2_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Witness 2 Name (English)</FormLabel>
                            <FormControl>
                              <Input maxLength={50} placeholder="For certificate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="witness2_father_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>சாட்சி-2 தந்தை பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="witness2_father_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Witness 2 Father Name (English)</FormLabel>
                            <FormControl>
                              <Input maxLength={50} placeholder="For certificate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="kathib_thaib_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>கத்திப்/தாயிப் பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="kathib_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kathib Name (English)</FormLabel>
                            <FormControl>
                              <Input maxLength={50} placeholder="For certificate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="kathib_thaib_father_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>கத்திப்/தாயிப் தந்தை பெயர்</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Registrar */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">பதிவு செய்தவர்</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="registrar_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>பதிவு செய்தவரின் பெயர்</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registrar_father_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>பதிவு செய்தவரின் தந்தை பெயர்</FormLabel>
                            <FormControl>
                              <TamilInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} placeholder="Type in English, auto-converts to Tamil" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      ரத்து செய்
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {(createMutation.isPending || updateMutation.isPending) ? "சேமிக்கிறது..." : editRecord ? "புதுப்பி" : "சேமி"}
                    </Button>
                  </div>
                </form>
              </Form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Record Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-4 sm:p-6 flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <DialogTitle>திருமண பதிவு விவரங்கள்</DialogTitle>
                {!paymentLoading && (
                  isPaymentCompleted ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      பணம் செலுத்தப்பட்டது
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      பணம் நிலுவையில்
                    </Badge>
                  )
                )}
              </div>
              {viewRecord && (
                <div className="flex flex-wrap gap-2">
                  {isPaymentCompleted ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewRecord(viewRecord)}
                        disabled={paymentLoading}
                      >
                        <MonitorPlay className="h-4 w-4 mr-2" />
                        முன்னோட்டம்
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => await generateMarriageCertificatePdf(viewRecord)}
                        disabled={paymentLoading}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await printMarriageCertificate(viewRecord);
                        }}
                        disabled={paymentLoading}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        அச்சிடு
                      </Button>
                    </>
                  ) : (
                    <>
                      {isOnlineDisabledForUser ? (
                        <Button
                          size="sm"
                          onClick={() => handleRazorpayPayment(viewRecord)}
                          disabled={paymentLoading || paymentProcessing}
                        >
                          <IndianRupee className="h-4 w-4 mr-2" />
                          பணம் செலுத்து (₹{certificateFee})
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleRazorpayPayment(viewRecord)}
                            disabled={paymentLoading || paymentProcessing || !razorpayLoaded}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            ஆன்லைன் பணம் (₹{certificateFee})
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCashPayment(viewRecord)}
                            disabled={paymentLoading || paymentProcessing}
                          >
                            <Banknote className="h-4 w-4 mr-2" />
                            ரொக்க பணம்
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleManualCashRequest(viewRecord)}
                            disabled={paymentLoading || paymentProcessing}
                          >
                            <IndianRupee className="h-4 w-4 mr-2" />
                            கோரிக்கை அனுப்பு
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-4">
            {viewRecord && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">தேதி மற்றும் நேரம்</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>ஹிஜ்ரி:</strong> {viewRecord.hijri_day} {viewRecord.hijri_month} {viewRecord.hijri_year}</div>
                    <div><strong>கி.பி.:</strong> {viewRecord.gregorian_day} {viewRecord.gregorian_month} {viewRecord.gregorian_year}</div>
                    <div><strong>கிழமை:</strong> {viewRecord.day_name}</div>
                    <div><strong>நேரம்:</strong> {viewRecord.day_night} {viewRecord.time_of_event}</div>
                    <div className="col-span-2"><strong>இடம்:</strong> {viewRecord.place_of_marriage || "-"}</div>
                    {viewRecord.place_of_marriage_en && (
                      <div className="col-span-2"><strong>Place (EN):</strong> {viewRecord.place_of_marriage_en}</div>
                    )}
                  </CardContent>
                </Card>
                {/* Groom & Bride Photos + Details */}
                {(viewRecord.groom_photo_url || viewRecord.bride_photo_url) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">புகைப்படங்கள் / Photos</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-6 justify-center">
                      {viewRecord.groom_photo_url && (
                        <div className="text-center space-y-2">
                          <SignedImg
                            src={viewRecord.groom_photo_url}
                            alt="மணமகன்"
                            className="w-32 h-40 object-cover rounded-lg border border-border shadow-sm"
                            loading="lazy"
                          />
                          <p className="text-xs text-muted-foreground font-medium">மணமகன் / Groom</p>
                        </div>
                      )}
                      {viewRecord.bride_photo_url && (
                        <div className="text-center space-y-2">
                          <SignedImg
                            src={viewRecord.bride_photo_url}
                            alt="மணமகள்"
                            className="w-32 h-40 object-cover rounded-lg border border-border shadow-sm"
                            loading="lazy"
                          />
                          <p className="text-xs text-muted-foreground font-medium">மணமகள் / Bride</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">மணமகன் / Groom</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>பெயர்:</strong> {viewRecord.groom_name}</div>
                    <div><strong>Name (EN):</strong> {viewRecord.groom_name_en || "-"}</div>
                    <div><strong>தந்தை:</strong> {viewRecord.groom_father_name}</div>
                    <div><strong>Father (EN):</strong> {viewRecord.groom_father_name_en || "-"}</div>
                    <div><strong>வகையரா:</strong> {viewRecord.groom_category || "-"}</div>
                    <div><strong>வயது:</strong> {viewRecord.groom_age}</div>
                    <div><strong>மத்ஹப்:</strong> {viewRecord.groom_madhab || "-"}</div>
                    <div className="col-span-2"><strong>முகவரி:</strong> {viewRecord.groom_address}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">மணமகள் / Bride</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>பெயர்:</strong> {viewRecord.bride_name}</div>
                    <div><strong>Name (EN):</strong> {viewRecord.bride_name_en || "-"}</div>
                    <div><strong>தந்தை:</strong> {viewRecord.bride_father_name}</div>
                    <div><strong>Father (EN):</strong> {viewRecord.bride_father_name_en || "-"}</div>
                    <div><strong>வகையரா:</strong> {viewRecord.bride_category || "-"}</div>
                    <div><strong>வயது:</strong> {viewRecord.bride_age}</div>
                    <div><strong>மத்ஹப்:</strong> {viewRecord.bride_madhab || "-"}</div>
                    <div className="col-span-2"><strong>முகவரி:</strong> {viewRecord.bride_address}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ஒலி/வக்கீல் மற்றும் மகர்</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>ஒலி/வக்கீல்:</strong> {viewRecord.wali_name}</div>
                    <div><strong>Wali (EN):</strong> {viewRecord.wali_name_en || "-"}</div>
                    <div><strong>தந்தை:</strong> {viewRecord.wali_father_name}</div>
                    <div><strong>மகர்:</strong> {viewRecord.mahr}</div>
                    <div><strong>Mahr (EN):</strong> {viewRecord.mahr_en || "-"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">சாட்சிகள் மற்றும் பதிவாளர்</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>சாட்சி-1:</strong> {viewRecord.witness1_name} S/O {viewRecord.witness1_father_name}</div>
                    <div><strong>Witness 1 (EN):</strong> {viewRecord.witness1_name_en || "-"} S/O {viewRecord.witness1_father_name_en || "-"}</div>
                    <div><strong>சாட்சி-2:</strong> {viewRecord.witness2_name} S/O {viewRecord.witness2_father_name}</div>
                    <div><strong>Witness 2 (EN):</strong> {viewRecord.witness2_name_en || "-"} S/O {viewRecord.witness2_father_name_en || "-"}</div>
                    <div><strong>கத்திப்:</strong> {viewRecord.kathib_thaib_name || "-"}</div>
                    <div><strong>Kathib (EN):</strong> {viewRecord.kathib_name_en || "-"}</div>
                    <div className="col-span-2"><strong>பதிவாளர்:</strong> {viewRecord.registrar_name} S/O {viewRecord.registrar_father_name}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Records Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center py-4">ஏற்றுகிறது...</p>
          ) : records && records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>தேதி</TableHead>
                  <TableHead>மணமகன்</TableHead>
                  <TableHead>மணமகள்</TableHead>
                  <TableHead>மகர்</TableHead>
                  <TableHead className="text-right">செயல்கள்</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="text-sm">
                        {record.hijri_day} {record.hijri_month} {record.hijri_year}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {record.gregorian_day} {record.gregorian_month} {record.gregorian_year}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{record.groom_name}</div>
                      <div className="text-xs text-muted-foreground">S/O {record.groom_father_name}</div>
                    </TableCell>
                    <TableCell>
                      <div>{record.bride_name}</div>
                      <div className="text-xs text-muted-foreground">D/O {record.bride_father_name}</div>
                    </TableCell>
                    <TableCell>{record.mahr}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewRecord(record)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(record)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteRecordId(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-4 text-muted-foreground">பதிவுகள் எதுவும் இல்லை</p>
          )}
        </CardContent>
      </Card>

      {/* Certificate Preview Dialog */}
      <Dialog open={!!previewRecord} onOpenChange={() => setPreviewRecord(null)}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] p-4 sm:p-6">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <DialogTitle>சான்றிதழ் முன்னோட்டம் / Certificate Preview</DialogTitle>
                {!paymentLoading && (
                  isPaymentCompleted ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Paid
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Unpaid
                    </Badge>
                  )
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (previewRecord) await generateMarriageCertificatePdf(previewRecord);
                  }}
                  disabled={!isPaymentCompleted || paymentLoading}
                  title={!isPaymentCompleted ? "PDF download available after payment" : ""}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF பதிவிறக்கம்
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (previewRecord) await printMarriageCertificate(previewRecord);
                  }}
                  disabled={!isPaymentCompleted || paymentLoading}
                  title={!isPaymentCompleted ? "Print available after payment" : ""}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  அச்சிடு
                </Button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh]">
            {previewRecord && <MarriageCertificatePreview record={previewRecord} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>பதிவை நீக்க உறுதிப்படுத்தவும்</AlertDialogTitle>
            <AlertDialogDescription>
              இந்த திருமண பதிவை நீக்க விரும்புகிறீர்களா? இந்த செயலை மாற்ற முடியாது.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ரத்து செய்</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteRecordId) {
                  deleteMutation.mutate(deleteRecordId);
                  setDeleteRecordId(null);
                }
              }}
            >
              நீக்கு
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cash Payment Request Dialog */}
      {cashRequestData && (
        <CashPaymentRequestDialog
          open={showCashRequestDialog}
          onOpenChange={setShowCashRequestDialog}
          serviceType="certificate"
          referenceId={cashRequestData.referenceId}
          amount={cashRequestData.amount}
          applicantName={`${cashRequestData.groomName} & ${cashRequestData.brideName}`}
          applicantPhone={cashRequestData.applicantPhone}
          failureReason={cashRequestData.failureReason}
          serviceDetails={{
            certificateType: "marriage",
            groomName: cashRequestData.groomName,
            brideName: cashRequestData.brideName,
          }}
          onSuccess={() => {
            setCashRequestData(null);
            toast.success("ரொக்க செலுத்துதல் கோரிக்கை அனுப்பப்பட்டது");
          }}
        />
      )}
    </div>
  );
}
