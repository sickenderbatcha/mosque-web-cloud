import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LayoutDashboard, Calendar as CalendarIcon, MessageSquare, Building2, Clock, Loader2, CreditCard, Receipt, IndianRupee, Download, Settings, Mail, Phone, CalendarDays, X, User, Pencil, RotateCcw, FileCheck, Plus, Printer, Eye, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { generateNocCertificatePdf, printNocCertificate, NocRecord } from "@/utils/nocCertificatePdf";
import NocCertificatePreview from "@/components/NocCertificatePreview";
import { generateHeirCertificatePdf, printHeirCertificate, HeirRecord as HeirRecordType } from "@/utils/heirCertificatePdf";
import HeirCertificatePreview from "@/components/HeirCertificatePreview";
import { ScrollText, FileText } from "lucide-react";
import CertificateReceipt, { CertificateReceiptData } from "@/components/CertificateReceipt";
import BookingReceipt from "@/components/BookingReceipt";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserTabPermissions } from "@/hooks/useUserTabPermissions";
import { useOnlinePaymentAvailability } from "@/hooks/useOnlinePaymentAvailability";
import { getLatestSequentialReceiptMap } from "@/lib/certificatePayments";
import { generateDeathCertificatePdf, printDeathCertificate, DeathRecord } from "@/utils/deathCertificatePdf";
import { generateMarriageCertificatePdf, printMarriageCertificate, MarriageRecord } from "@/utils/marriageCertificatePdf";
import { generateOutsideMarriageCertificatePdf, printOutsideMarriageCertificate, OutsideMarriageRecord } from "@/utils/outsideMarriageCertificatePdf";
import DeathCertificatePreview from "@/components/DeathCertificatePreview";
import MarriageCertificatePreview from "@/components/MarriageCertificatePreview";
import OutsideMarriageCertificatePreview from "@/components/OutsideMarriageCertificatePreview";

interface Booking {
  id: string;
  event_type: string;
  event_date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  booking_amount: number | null;
  payment_status: string | null;
  applicant_name: string;
  applicant_phone: string;
  applicant_email: string | null;
}

interface Grievance {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  created_at: string;
  category: string | null;
}

interface EventRegistration {
  id: string;
  participant_name: string;
  registered_at: string;
  events: {
    id: string;
    title: string;
    event_date: string;
    venue: string | null;
    status: string | null;
  } | null;
}

interface RefundRequest {
  id: string;
  booking_id: string;
  amount: number;
  reason: string | null;
  status: string;
  created_at: string;
  admin_notes: string | null;
}

interface NocRequest {
  id: string;
  applicant_name: string;
  applicant_email: string | null;
  applicant_phone: string | null;
  applicant_membership_number: string | null;
  applicant_relationship: string;
  father_name: string;
  father_membership_number: string;
  family_name: string;
  partner_name: string;
  partner_father_name: string;
  partner_category: string;
  partner_applicant_relationship: string | null;
  mosque_to_submit: string;
  address_to_submit: string;
  status: string;
  payment_status: string | null;
  created_at: string;
}

interface HeirRequest {
  id: string;
  applicant_name: string;
  applicant_email: string | null;
  applicant_phone: string | null;
  applicant_relationship: string;
  deceased_member_id: string | null;
  deceased_name: string;
  deceased_father_name: string;
  deceased_address: string;
  register_number: string | null;
  certificate_date: string | null;
  heirs: any;
  status: string;
  payment_status: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface CertificatePayment {
  id: string;
  certificate_type: string;
  reference_id: string;
  applicant_name: string;
  applicant_phone: string;
  applicant_email: string | null;
  amount: number;
  payment_status: string;
  payment_method: string | null;
  transaction_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
}

const UserDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [nocRequests, setNocRequests] = useState<NocRequest[]>([]);
  const [heirRequests, setHeirRequests] = useState<HeirRequest[]>([]);
  const [certificatePayments, setCertificatePayments] = useState<CertificatePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    sms: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [profile, setProfile] = useState({ full_name: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editBookingData, setEditBookingData] = useState({
    event_date: undefined as Date | undefined,
    start_time: "",
    end_time: "",
  });
  const [savingBookingEdit, setSavingBookingEdit] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bookedDatesForEdit, setBookedDatesForEdit] = useState<string[]>([]);
  const [editDatePopoverOpen, setEditDatePopoverOpen] = useState(false);
  const [editDateDraft, setEditDateDraft] = useState<Date | undefined>(undefined);
  
  // Refund request state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
  const [refundStatusFilter, setRefundStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [refundPaymentMethod, setRefundPaymentMethod] = useState<"bank" | "upi" | "cash">("upi");
  const [refundFormData, setRefundFormData] = useState({
    reason: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    upi_id: "",
  });
  const [submittingRefund, setSubmittingRefund] = useState(false);
  
  // NOC preview state
  const [previewNocRecord, setPreviewNocRecord] = useState<NocRecord | null>(null);
  const [nocPreviewOpen, setNocPreviewOpen] = useState(false);
  const [submittingNocId, setSubmittingNocId] = useState<string | null>(null);
  
  // Heir preview state
  const [previewHeirRecord, setPreviewHeirRecord] = useState<HeirRecordType | null>(null);
  const [heirPreviewOpen, setHeirPreviewOpen] = useState(false);

  // Certificate preview state (for marriage/death/outside_marriage)
  const [certPreviewData, setCertPreviewData] = useState<{
    type: "death" | "marriage" | "outside_marriage";
    record: any;
  } | null>(null);
  const [certPreviewOpen, setCertPreviewOpen] = useState(false);
  const [certPreviewLoading, setCertPreviewLoading] = useState<string | null>(null);

  // Certificate receipt state
  const [showCertReceipt, setShowCertReceipt] = useState<CertificateReceiptData | null>(null);
  
  // Receipt number map for certificates (from income table)
  const [certReceiptNumberMap, setCertReceiptNumberMap] = useState<Record<string, string>>({});
  // Payment method map for NOC/Heir certificates (cert.id → payment_method)
  const [certPaymentMethodMap, setCertPaymentMethodMap] = useState<Record<string, string>>({});

  // Booking receipt state
  const [showBookingReceipt, setShowBookingReceipt] = useState<{
    applicantName: string;
    applicantPhone: string;
    applicantEmail?: string;
    eventType: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    expectedGuests?: string;
    amount: number;
    bookingId: string;
    services: { name: string; rate: number }[];
    razorpayPaymentId?: string;
    paymentMethod?: string;
  } | null>(null);
  const [bookingReceiptRequireAction, setBookingReceiptRequireAction] = useState(false);
  const [resolvedBookingReceiptNumber, setResolvedBookingReceiptNumber] = useState<string | null>(null);

  // Fetch certificate fees from app_settings
  const { settings: certificateFees } = useAppSettings(["certificate_fee_noc", "certificate_fee_heir", "certificate_fee_marriage", "certificate_fee_death", "certificate_fee_outside_marriage"]);
  const nocFee = parseFloat(certificateFees.certificate_fee_noc) || 100;
  const heirFee = parseFloat(certificateFees.certificate_fee_heir) || 100;

  // Respect the global kill switch + the "disable online payment for mahal booking" toggle
  const { isAdmin } = useUserRole();
  const { canAccessTab } = useUserTabPermissions();
  const canBypassOnlineDisable = isAdmin || canAccessTab("bookings");
  const { disabled: bookingOnlineDisabled, isLoading: paymentToggleLoading } =
    useOnlinePaymentAvailability("mahal_booking_online_disabled", canBypassOnlineDisable);
  // Fail closed while settings are still loading
  const isBookingOnlinePaymentDisabled =
    bookingOnlineDisabled || (paymentToggleLoading && !canBypassOnlineDisable);


  const timeSlots = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
    "20:00", "21:00", "22:00"
  ];

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchNotificationPrefs();
    }
  }, [user]);

  const fetchNotificationPrefs = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("notification_email, notification_sms, full_name, phone")
      .eq("id", user.id)
      .maybeSingle();
    
    if (!error && data) {
      setNotificationPrefs({
        email: data.notification_email ?? true,
        sms: data.notification_sms ?? true,
      });
      setProfile({
        full_name: data.full_name || "",
        phone: data.phone || "",
      });
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name.trim(),
          phone: profile.phone.trim(),
        })
        .eq("id", user.id);
      
      if (error) throw error;
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveNotificationPrefs = async () => {
    if (!user) return;
    
    setSavingPrefs(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          notification_email: notificationPrefs.email,
          notification_sms: notificationPrefs.sms,
        })
        .eq("id", user.id);
      
      if (error) throw error;
      
      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences.",
        variant: "destructive",
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [bookingsRes, grievancesRes, registrationsRes, refundRes, nocRes, heirRes, certPaymentsRes] = await Promise.all([
        supabase
          .from("mahal_bookings")
          .select("id, event_type, event_date, start_time, end_time, status, created_at, booking_amount, payment_status, applicant_name, applicant_phone, applicant_email")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("grievances")
          .select("id, ticket_number, subject, status, created_at, category")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("event_registrations")
          .select("id, participant_name, registered_at, events(id, title, event_date, venue, status)")
          .eq("user_id", user.id)
          .order("registered_at", { ascending: false }),
        supabase
          .from("refund_requests")
          .select("id, booking_id, amount, reason, status, created_at, admin_notes")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("noc_certificates")
          .select("id, applicant_name, applicant_email, applicant_phone, applicant_membership_number, applicant_relationship, father_name, father_membership_number, family_name, partner_name, partner_father_name, partner_category, partner_applicant_relationship, mosque_to_submit, address_to_submit, status, payment_status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("heir_certificates")
          .select("id, applicant_name, applicant_email, applicant_phone, applicant_relationship, deceased_member_id, deceased_name, deceased_father_name, deceased_address, register_number, certificate_date, heirs, status, payment_status, admin_notes, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("certificate_payments")
          .select("id, certificate_type, reference_id, applicant_name, applicant_phone, applicant_email, amount, payment_status, payment_method, transaction_id, razorpay_payment_id, created_at")
          .eq("user_id", user.id)
          .in("certificate_type", ["marriage", "death", "outside_marriage"])
          .order("created_at", { ascending: false }),
      ]);

      setBookings(bookingsRes.data || []);
      setGrievances(grievancesRes.data || []);
      setRegistrations(registrationsRes.data || []);
      setRefundRequests((refundRes.data as RefundRequest[]) || []);
      setNocRequests((nocRes.data as NocRequest[]) || []);
      setHeirRequests((heirRes.data as HeirRequest[]) || []);
      setCertificatePayments((certPaymentsRes.data as CertificatePayment[]) || []);

      // Fetch receipt numbers from income table for all completed certificates (sequential only)
      // For NOC/Heir: income may reference certificate_payments.id (new flow) or cert.id (legacy flow)
      const completedNocIds = (nocRes.data || []).filter((n: any) => n.payment_status === "completed" || n.payment_status === "paid").map((n: any) => n.id);
      const completedHeirIds = (heirRes.data || []).filter((h: any) => h.payment_status === "completed" || h.payment_status === "paid").map((h: any) => h.id);
      const completedCertPaymentIds = (certPaymentsRes.data || []).filter((c: any) => c.payment_status === "completed").map((c: any) => c.id);

      const normalizePaymentMethod = (method?: string | null): string | null => {
        if (!method) return null;
        const normalized = method.trim().toLowerCase();
        if (!normalized) return null;
        if (normalized === "cash") return "cash";
        if (normalized === "online") return "online";
        return normalized;
      };

      // Fetch certificate_payments linked to NOC/Heir certificates to get payment IDs and payment method
      const nocHeirCertIds = Array.from(new Set([...completedNocIds, ...completedHeirIds]));
      let nocHeirPaymentMap: Record<string, string> = {}; // payment.id → cert.id (noc/heir)
      let nocHeirPaymentMethodMap: Record<string, string> = {}; // cert.id → payment_method
      let nocHeirPaymentIds: string[] = [];

      if (nocHeirCertIds.length > 0) {
        const { data: nocHeirPayments } = await supabase
          .from("certificate_payments")
          .select("id, reference_id, payment_method")
          .in("reference_id", nocHeirCertIds)
          .in("payment_status", ["completed", "paid"]);

        if (nocHeirPayments) {
          nocHeirPayments.forEach((p: any) => {
            nocHeirPaymentMap[p.id] = p.reference_id;
            nocHeirPaymentIds.push(p.id);

            const normalizedMethod = normalizePaymentMethod(p.payment_method);
            if (normalizedMethod) {
              nocHeirPaymentMethodMap[p.reference_id] = normalizedMethod;
            }
          });
        }

        // Fallback: for certs without payment_method on certificate_payments, check cash_payment_requests
        const unmappedCertIds = nocHeirCertIds.filter((id) => !nocHeirPaymentMethodMap[id]);
        if (unmappedCertIds.length > 0) {
          const { data: cashRequests } = await supabase
            .from("cash_payment_requests")
            .select("reference_id")
            .in("reference_id", unmappedCertIds)
            .in("service_type", ["noc", "heir"])
            .in("status", ["approved", "paid", "completed"]);

          if (cashRequests) {
            cashRequests.forEach((cr: any) => {
              if (cr.reference_id && !nocHeirPaymentMethodMap[cr.reference_id]) {
                nocHeirPaymentMethodMap[cr.reference_id] = "cash";
              }
            });
          }
        }
      }

      const allLookupIds = Array.from(new Set([
        ...nocHeirPaymentIds,
        ...completedCertPaymentIds,
      ]));

      const [rawReceiptMap, legacyNocHeirReceiptMap] = await Promise.all([
        allLookupIds.length
          ? getLatestSequentialReceiptMap({
              referenceIds: allLookupIds,
              referenceTypes: ["certificate_payment", "noc_certificate", "heir_certificate"],
            })
          : Promise.resolve({} as Record<string, string>),
        nocHeirCertIds.length
          ? getLatestSequentialReceiptMap({
              referenceIds: nocHeirCertIds,
              referenceTypes: ["noc_certificate", "heir_certificate", "certificate_payment"],
            })
          : Promise.resolve({} as Record<string, string>),
      ]);

      // Remap: for NOC/Heir, map receipt from payment ID back to cert ID
      const finalMap: Record<string, string> = {};
      for (const [paymentId, receiptNum] of Object.entries(rawReceiptMap)) {
        if (nocHeirPaymentMap[paymentId]) {
          finalMap[nocHeirPaymentMap[paymentId]] = receiptNum;
        } else {
          finalMap[paymentId] = receiptNum;
        }
      }

      // Legacy fallback: if receipt was recorded directly against certificate id
      nocHeirCertIds.forEach((certId) => {
        if (!finalMap[certId] && legacyNocHeirReceiptMap[certId]) {
          finalMap[certId] = legacyNocHeirReceiptMap[certId];
        }
      });

      console.log("[Dashboard Receipt Debug]", {
        completedNocIds,
        completedHeirIds,
        completedCertPaymentIds,
        nocHeirCertIds,
        nocHeirPaymentIds,
        nocHeirPaymentMap,
        allLookupIds,
        rawReceiptMap,
        legacyNocHeirReceiptMap,
        finalMap,
        nocHeirPaymentMethodMap,
      });

      setCertReceiptNumberMap(finalMap);
      setCertPaymentMethodMap(nocHeirPaymentMethodMap);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const eventTypeTamil: Record<string, string> = {
    "Wedding": "திருமணம்",
    "Nikkah": "நிக்காஹ்",
    "Walima": "வலீமா",
    "Engagement": "நிச்சயதார்த்தம்",
    "Reception": "வரவேற்பு",
    "Meeting": "கூட்டம்",
    "Other": "மற்றவை",
  };

  const getEventTypeTamil = (type: string) => eventTypeTamil[type] || type;

  const openBookingReceipt = (
    booking: Booking,
    options?: { requireAction?: boolean; razorpayPaymentId?: string }
  ) => {
    setBookingReceiptRequireAction(!!options?.requireAction);
    setShowBookingReceipt({
      applicantName: booking.applicant_name,
      applicantPhone: booking.applicant_phone,
      applicantEmail: booking.applicant_email || undefined,
      eventType: booking.event_type,
      eventDate: booking.event_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      amount: booking.booking_amount || 0,
      bookingId: booking.id,
      services: [{ name: "Hall", rate: booking.booking_amount || 0 }],
      razorpayPaymentId: options?.razorpayPaymentId,
      paymentMethod:
        booking.payment_status === "completed"
          ? "online"
          : booking.payment_status === "paid"
            ? "cash"
            : undefined,
    });
  };

  const cancelBooking = async (bookingId: string) => {
    setCancellingBookingId(bookingId);
    try {
      // Find the booking to get details for notification
      const bookingToCancel = bookings.find(b => b.id === bookingId);
      
      const { error } = await supabase
        .from("mahal_bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);
      
      if (error) throw error;
      
      // Immediately update local state to reflect the cancellation
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status: "cancelled" as const } : b
      ));
      
      // Send cancellation notification
      if (bookingToCancel) {
        supabase.functions.invoke("send-notification-email", {
          body: {
            type: "booking_cancelled",
            email: bookingToCancel.applicant_email || undefined,
            phone: bookingToCancel.applicant_phone,
            recipientName: bookingToCancel.applicant_name,
            data: {
              eventType: bookingToCancel.event_type,
              eventDate: bookingToCancel.event_date,
              startTime: bookingToCancel.start_time,
              endTime: bookingToCancel.end_time,
              amount: bookingToCancel.booking_amount,
            },
          },
        }).catch(console.error);
      }
      
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled successfully.",
      });
      
      // Also refresh from server to ensure sync
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel booking.",
        variant: "destructive",
      });
    } finally {
      setCancellingBookingId(null);
    }
  };

  const openEditBookingDialog = async (booking: Booking) => {
    setEditingBooking(booking);
    setEditBookingData({
      event_date: new Date(booking.event_date),
      start_time: booking.start_time,
      end_time: booking.end_time,
    });
    setEditDialogOpen(true);

    // Fetch booked dates to block in calendar
    const { data } = await supabase.rpc("get_mahal_availability", {
      _start: format(new Date(), "yyyy-MM-dd"),
      _end: format(new Date(new Date().getFullYear() + 1, 11, 31), "yyyy-MM-dd"),
    });
    if (data) {
      // Exclude the current booking's own date so user can keep it
      const blocked = (data as { event_date: string; event_type: string; status: string }[])
        .filter((b) => b.event_date !== booking.event_date)
        .map((b) => b.event_date);
      setBookedDatesForEdit([...new Set(blocked)]);
    }
  };

  const saveBookingEdit = async () => {
    if (!editingBooking || !editBookingData.event_date) return;
    
    setSavingBookingEdit(true);
    try {
      const formattedDate = format(editBookingData.event_date, "yyyy-MM-dd");
      
      // Check for conflicts before saving
      const { data: conflict } = await supabase.rpc("check_mahal_booking_conflict", {
        _event_date: formattedDate,
      });
      
      // Allow if same date as original booking, otherwise block
      if (conflict && conflict[0] && conflict[0].has_conflict && formattedDate !== editingBooking.event_date) {
        toast({
          title: "தேதி ஏற்கனவே முன்பதிவு செய்யப்பட்டுள்ளது",
          description: "இந்த தேதியில் ஏற்கனவே முன்பதிவு உள்ளது. வேறு தேதியைத் தேர்ந்தெடுக்கவும்.",
          variant: "destructive",
        });
        setSavingBookingEdit(false);
        return;
      }

      const { error } = await supabase
        .from("mahal_bookings")
        .update({
          event_date: formattedDate,
          start_time: editBookingData.start_time,
          end_time: editBookingData.end_time,
        })
        .eq("id", editingBooking.id);
      
      if (error) throw error;
      
      toast({
        title: "Booking Updated",
        description: "Your booking details have been updated successfully.",
      });
      
      setEditDialogOpen(false);
      setEditingBooking(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking.",
        variant: "destructive",
      });
    } finally {
      setSavingBookingEdit(false);
    }
  };

  const openRefundDialog = (booking: Booking) => {
    setRefundBooking(booking);
    // Default to cash if original payment was cash (payment_status = "paid"), else UPI
    const wasCashPayment = booking.payment_status === "paid";
    setRefundPaymentMethod(wasCashPayment ? "cash" : "upi");
    setRefundFormData({
      reason: "",
      bank_account_name: "",
      bank_account_number: "",
      bank_ifsc: "",
      upi_id: "",
    });
    setRefundDialogOpen(true);
  };
  
  // Check if booking was paid via cash
  const isBookingPaidViaCash = (booking: Booking) => {
    return booking.payment_status === "paid";
  };

  const hasExistingRefundRequest = (bookingId: string) => {
    return refundRequests.some(r => r.booking_id === bookingId);
  };

  const getRefundRequestStatus = (bookingId: string) => {
    const request = refundRequests.find(r => r.booking_id === bookingId);
    return request?.status;
  };

  const submitRefundRequest = async () => {
    if (!refundBooking || !user) return;

    setSubmittingRefund(true);
    try {
      const { error } = await supabase
        .from("refund_requests")
        .insert({
          booking_id: refundBooking.id,
          user_id: user.id,
          amount: refundBooking.booking_amount || 0,
          reason: refundFormData.reason || null,
          bank_account_name: refundFormData.bank_account_name || null,
          bank_account_number: refundFormData.bank_account_number || null,
          bank_ifsc: refundFormData.bank_ifsc || null,
          upi_id: refundFormData.upi_id || null,
        });

      if (error) throw error;

      // Send admin notification email (email fetched from app_settings)
      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            type: "admin_refund_request",
            recipientName: "Admin",
            data: {
              applicantName: refundBooking.applicant_name,
              applicantPhone: refundBooking.applicant_phone,
              applicantEmail: refundBooking.applicant_email,
              eventType: refundBooking.event_type,
              eventDate: formatDate(refundBooking.event_date),
              amount: refundBooking.booking_amount,
              reason: refundFormData.reason,
              upiId: refundFormData.upi_id,
              bankAccountName: refundFormData.bank_account_name,
              bankAccountNumber: refundFormData.bank_account_number,
              bankIfsc: refundFormData.bank_ifsc,
            },
          },
        });
      } catch (notificationError) {
        console.error("Failed to send admin notification:", notificationError);
        // Don't fail the refund request if notification fails
      }

      toast({
        title: "Refund Request Submitted",
        description: "Your refund request has been submitted. We will process it within 5-7 business days.",
      });

      setRefundDialogOpen(false);
      setRefundBooking(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit refund request.",
        variant: "destructive",
      });
    } finally {
      setSubmittingRefund(false);
    }
  };

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-700">அங்கீகரிக்கப்பட்டது</Badge>;
      case "rejected":
        return <Badge variant="destructive">நிராகரிக்கப்பட்டது</Badge>;
      case "cancelled":
        return <Badge variant="outline">ரத்து செய்யப்பட்டது</Badge>;
      default:
        return <Badge variant="secondary">நிலுவையில்</Badge>;
    }
  };

  const getGrievanceStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-500/20 text-green-700">தீர்க்கப்பட்டது</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500/20 text-yellow-700">பரிசீலனையில்</Badge>;
      case "closed":
        return <Badge variant="outline">மூடப்பட்டது</Badge>;
      default:
        return <Badge variant="secondary">நிலுவையில்</Badge>;
    }
  };

  const getNocStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-700">அங்கீகரிக்கப்பட்டது</Badge>;
      case "rejected":
        return <Badge variant="destructive">நிராகரிக்கப்பட்டது</Badge>;
      case "submitted":
        return <Badge className="bg-blue-500/20 text-blue-700">சமர்ப்பிக்கப்பட்டது</Badge>;
      default:
        return <Badge variant="secondary">நிலுவையில்</Badge>;
    }
  };

  const getHeirStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-700">அங்கீகரிக்கப்பட்டது</Badge>;
      case "rejected":
        return <Badge variant="destructive">நிராகரிக்கப்பட்டது</Badge>;
      case "submitted":
      case "pending":
        return <Badge className="bg-blue-500/20 text-blue-700">நிலுவையில்</Badge>;
      case "payment_pending":
        return <Badge variant="secondary">பணம் நிலுவையில்</Badge>;
      default:
        return <Badge variant="secondary">நிலுவையில்</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const initiatePayment = async (booking: Booking) => {
    if (!booking.booking_amount) return;

    if (isBookingOnlinePaymentDisabled) {
      toast({
        title: "ஆன்லைன் பணம் செலுத்துதல் முடக்கப்பட்டுள்ளது / Online payment disabled",
        description: "தயவுசெய்து அலுவலகத்தில் ரொக்கமாக செலுத்தவும். Please pay in cash at the office.",
        variant: "destructive",
      });
      return;
    }
    
    setPayingBookingId(booking.id);
    
    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            amount: booking.booking_amount,
            bookingId: booking.id,
            notes: {
              bookingId: booking.id,
              eventType: booking.event_type,
              eventDate: booking.event_date,
            },
          },
        }
      );

      if (orderError || !orderData?.orderId) {
        throw new Error(orderError?.message || "Failed to create payment order");
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "இளையான்குடி பள்ளிவாசல்",
        description: `Mahal Booking - ${booking.event_type}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
            "create-razorpay-order?action=verify",
            {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: booking.id,
              },
            }
          );

          if (verifyError || !verifyData?.verified) {
            toast({
              title: "பணம் செலுத்தல் சரிபார்ப்பு தோல்வி / Payment Verification Failed",
              description: "Please contact support if amount was deducted.",
              variant: "destructive",
            });
            return;
          }

          toast({
            title: "பணம் செலுத்தப்பட்டது! / Payment Successful!",
            description: "Your booking payment has been confirmed.",
          });

          // Send payment success notification
          supabase.functions.invoke("send-notification-email", {
            body: {
              type: "payment_success",
              email: booking.applicant_email || undefined,
              phone: booking.applicant_phone,
              recipientName: booking.applicant_name,
              data: {
                amount: booking.booking_amount,
                transactionId: response.razorpay_payment_id,
                eventType: booking.event_type,
                eventDate: booking.event_date,
                startTime: booking.start_time,
                endTime: booking.end_time,
              },
            },
          }).catch(console.error);

          // Show receipt with enforcement immediately after online payment
          await openBookingReceipt(booking, {
            requireAction: true,
            razorpayPaymentId: response.razorpay_payment_id || undefined,
          });

          // Refresh bookings data
          fetchData();
        },
        prefill: {
          name: booking.applicant_name,
          email: booking.applicant_email || "",
          contact: booking.applicant_phone,
        },
        theme: {
          color: "#1a5f4a",
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "பணம் செலுத்தல் ரத்து செய்யப்பட்டது / Payment Cancelled",
              description: "You can try again anytime.",
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "பணம் செலுத்தல் பிழை / Payment Error",
        description: error.message || "Failed to initiate payment.",
        variant: "destructive",
      });
    } finally {
      setPayingBookingId(null);
    }
  };

  const submitNocForApproval = async (nocId: string) => {
    setSubmittingNocId(nocId);
    try {
      const { error } = await supabase
        .from("noc_certificates")
        .update({ status: "submitted" })
        .eq("id", nocId)
        .eq("user_id", user?.id);

      if (error) throw error;

      setNocRequests(prev =>
        prev.map(n => n.id === nocId ? { ...n, status: "submitted" } : n)
      );
      toast({
        title: "சமர்ப்பிக்கப்பட்டது",
        description: "NOC கோரிக்கை நிர்வாகிக்கு அனுப்பப்பட்டது",
      });
    } catch (err: any) {
      toast({
        title: "பிழை",
        description: err.message || "சமர்ப்பிக்க இயலவில்லை",
        variant: "destructive",
      });
    } finally {
      setSubmittingNocId(null);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <LayoutDashboard className="h-14 w-14 mx-auto mb-4 text-secondary" />
            <h1 className="text-3xl md:text-4xl font-bold font-tamil text-primary-foreground mb-2">
              எனது டாஷ்போர்டு
            </h1>
            <p className="text-primary-foreground/80 font-display text-lg">
              My Dashboard
            </p>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto relative">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 relative z-20 isolate">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{bookings.length}</p>
                      <p className="text-sm text-muted-foreground font-tamil">முன்பதிவுகள்</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-500/10">
                      <IndianRupee className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{bookings.filter(b => b.payment_status === 'paid').length}</p>
                      <p className="text-sm text-muted-foreground font-tamil">பணம் செலுத்தியது</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{grievances.length}</p>
                      <p className="text-sm text-muted-foreground font-tamil">புகார்கள்</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <CalendarIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{registrations.length}</p>
                      <p className="text-sm text-muted-foreground font-tamil">நிகழ்வு பதிவுகள்</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="bookings" className="w-full relative">
              <TabsList className="!flex flex-wrap w-full !h-auto gap-1 mb-6 justify-start">
                <TabsTrigger value="bookings" className="font-tamil text-xs sm:text-sm px-2 py-2">
                  <Building2 className="h-4 w-4 mr-1 shrink-0" />
                  <span className="hidden lg:inline">முன்பதிவுகள்</span>
                  <span className="lg:hidden">Bookings</span>
                </TabsTrigger>
                <TabsTrigger value="calendar" className="font-tamil text-xs sm:text-sm px-2 py-2">
                  <CalendarDays className="h-4 w-4 mr-1 shrink-0" />
                  <span className="hidden lg:inline">காலண்டர்</span>
                  <span className="lg:hidden">Calendar</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="font-tamil text-xs sm:text-sm px-2 py-2">
                  <Receipt className="h-4 w-4 mr-1 shrink-0" />
                  <span className="hidden lg:inline">பணம்</span>
                  <span className="lg:hidden">Payments</span>
                </TabsTrigger>
                <TabsTrigger value="noc" className="font-tamil text-xs sm:text-sm px-2 py-2">
                  <FileCheck className="h-4 w-4 mr-1 shrink-0" />
                  <span>NOC</span>
                </TabsTrigger>
                <TabsTrigger value="heir" className="font-tamil text-xs sm:text-sm px-2 py-2">
                  <ScrollText className="h-4 w-4 mr-1 shrink-0" />
                  <span className="hidden lg:inline">வாரிசு</span>
                  <span className="lg:hidden">Heir</span>
                </TabsTrigger>
                <TabsTrigger value="certificates" className="font-tamil text-xs sm:text-sm px-2 py-2">
                  <FileText className="h-4 w-4 mr-1 shrink-0" />
                  <span className="hidden lg:inline">சான்றிதழ்கள்</span>
                  <span className="lg:hidden">Certs</span>
                </TabsTrigger>
                <TabsTrigger value="grievances" className="font-tamil text-xs sm:text-sm px-2 py-2">
                  <MessageSquare className="h-4 w-4 mr-1 shrink-0" />
                  <span className="hidden lg:inline">புகார்கள்</span>
                  <span className="lg:hidden">Issues</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="font-tamil text-xs sm:text-sm px-2 py-2">
                  <CalendarIcon className="h-4 w-4 mr-1 shrink-0" />
                  <span className="hidden lg:inline">நிகழ்வுகள்</span>
                  <span className="lg:hidden">Events</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="font-tamil text-xs sm:text-sm px-2 py-2">
                  <Settings className="h-4 w-4 mr-1 shrink-0" />
                  <span className="hidden lg:inline">அமைப்புகள்</span>
                  <span className="lg:hidden">Settings</span>
                </TabsTrigger>
              </TabsList>

              {/* Bookings Tab */}
              <TabsContent value="bookings" className="relative z-10">
                <Card className="relative bg-card">
                  <CardHeader>
                    <CardTitle className="font-tamil">மஹால் முன்பதிவுகள்</CardTitle>
                    <CardDescription>Your hall booking requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bookings.length === 0 ? (
                      <div className="text-center py-8">
                        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground font-tamil">முன்பதிவுகள் இல்லை</p>
                        <p className="text-sm text-muted-foreground">No bookings yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {bookings.map((booking) => (
                          <div
                            key={booking.id}
                            className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors overflow-hidden"
                          >
                            {/* Header row with event type and badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-semibold break-words">{booking.event_type}</span>
                              {getBookingStatusBadge(booking.status)}
                              {booking.payment_status === "paid" && (
                                <Badge className="bg-green-500/20 text-green-700 shrink-0">Paid</Badge>
                              )}
                            </div>
                            
                            {/* Date, time and amount row */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-3">
                              <span className="flex items-center gap-1 shrink-0">
                                <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                                {formatDate(booking.event_date)}
                              </span>
                              <span className="flex items-center gap-1 shrink-0">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                {booking.start_time} - {booking.end_time}
                              </span>
                              {booking.booking_amount && (
                                <span className="text-base font-semibold text-primary ml-auto">
                                  ₹{booking.booking_amount.toLocaleString()}
                                </span>
                              )}
                            </div>
                            
                            {/* Action buttons - fully wrapped */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Receipt button for cash-paid bookings only (online payment receipts are shown at payment time) */}
                              {booking.payment_status === "paid" && booking.booking_amount && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-auto py-1.5 px-2 text-xs sm:text-sm"
                                  onClick={() => void openBookingReceipt(booking)}
                                >
                                  <Receipt className="h-3.5 w-3.5 mr-1 shrink-0" />
                                  Receipt
                                </Button>
                              )}
                              {booking.status === "pending" && booking.payment_status === "pending" && booking.booking_amount && (
                                isBookingOnlinePaymentDisabled ? (
                                  <p className="text-xs text-muted-foreground w-full">
                                    <span className="font-tamil">ஆன்லைன் பணம் செலுத்துதல் தற்போது கிடைக்கவில்லை. அலுவலகத்தில் ரொக்கமாக செலுத்தவும்.</span>
                                    <br />
                                    Online payment is currently unavailable. Please pay in cash at the office.
                                  </p>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-auto py-1.5 px-2 text-xs sm:text-sm"
                                    onClick={() => initiatePayment(booking)}
                                    disabled={payingBookingId === booking.id}
                                  >
                                    {payingBookingId === booking.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1 shrink-0" />
                                    ) : (
                                      <CreditCard className="h-3.5 w-3.5 mr-1 shrink-0" />
                                    )}
                                    Pay Now
                                  </Button>
                                )
                              )}
                              {/* Edit button - only for unpaid bookings */}
                              {(booking.status === "pending" || (booking.status === "approved" && booking.payment_status === "pending")) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-auto py-1.5 px-2 text-xs sm:text-sm"
                                  onClick={() => openEditBookingDialog(booking)}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1 shrink-0" />
                                  Edit
                                </Button>
                              )}
                              {/* Cancel button - for pending, approved unpaid, or approved paid bookings */}
                              {(booking.status === "pending" || booking.status === "approved") && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive border-destructive/50 hover:bg-destructive/10 h-auto py-1.5 px-2 text-xs sm:text-sm"
                                      disabled={cancellingBookingId === booking.id}
                                    >
                                      {cancellingBookingId === booking.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1 shrink-0" />
                                      ) : (
                                        <X className="h-3.5 w-3.5 mr-1 shrink-0" />
                                      )}
                                      Cancel
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Cancel Booking? / முன்பதிவை ரத்து செய்யவா?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        <span className="block mb-1">
                                          Are you sure you want to cancel this booking for{" "}
                                          <strong>{booking.event_type}</strong> on{" "}
                                          <strong>{formatDate(booking.event_date)}</strong>?
                                          This action cannot be undone.
                                        </span>
                                        <span className="block text-sm">
                                          <strong>{getEventTypeTamil(booking.event_type)}</strong> நிகழ்வுக்கான{" "}
                                          <strong>{formatDate(booking.event_date)}</strong> தேதியில் உள்ள முன்பதிவை ரத்து செய்ய விரும்புகிறீர்களா?
                                          இந்த செயலை மீண்டும் மாற்ற இயலாது.
                                        </span>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Keep Booking / முன்பதிவை வைத்திரு</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => cancelBooking(booking.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Yes, Cancel / ஆம், ரத்து செய்
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              {/* Refund Request Button for cancelled/rejected paid bookings */}
                              {(booking.status === "cancelled" || booking.status === "rejected") && 
                               (booking.payment_status === "paid" || booking.payment_status === "completed") && 
                               booking.booking_amount && (
                                hasExistingRefundRequest(booking.id) ? (
                                  <Badge 
                                    variant={getRefundRequestStatus(booking.id) === "approved" ? "default" : 
                                             getRefundRequestStatus(booking.id) === "rejected" ? "destructive" : "secondary"}
                                    className="text-xs"
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1 shrink-0" />
                                    Refund {getRefundRequestStatus(booking.id)}
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-amber-600 border-amber-600/50 hover:bg-amber-50 h-auto py-1.5 px-2 text-xs sm:text-sm"
                                    onClick={() => openRefundDialog(booking)}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 mr-1 shrink-0" />
                                    Request Refund
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Refund History Section within Bookings */}
              {refundRequests.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="font-tamil flex items-center gap-2">
                          <RotateCcw className="h-5 w-5" />
                          திருப்பி செலுத்துதல் வரலாறு
                        </CardTitle>
                        <CardDescription>Your refund request history</CardDescription>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant={refundStatusFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setRefundStatusFilter("all")}
                        >
                          All ({refundRequests.length})
                        </Button>
                        <Button
                          variant={refundStatusFilter === "pending" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setRefundStatusFilter("pending")}
                        >
                          Pending ({refundRequests.filter(r => r.status === "pending").length})
                        </Button>
                        <Button
                          variant={refundStatusFilter === "approved" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setRefundStatusFilter("approved")}
                          className={refundStatusFilter === "approved" ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          Approved ({refundRequests.filter(r => r.status === "approved").length})
                        </Button>
                        <Button
                          variant={refundStatusFilter === "rejected" ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => setRefundStatusFilter("rejected")}
                        >
                          Rejected ({refundRequests.filter(r => r.status === "rejected").length})
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {refundRequests.filter(r => refundStatusFilter === "all" || r.status === refundStatusFilter).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No {refundStatusFilter !== "all" ? refundStatusFilter : ""} refund requests found.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {refundRequests
                          .filter(r => refundStatusFilter === "all" || r.status === refundStatusFilter)
                          .map((refund) => {
                            const relatedBooking = bookings.find(b => b.id === refund.booking_id);
                            return (
                              <div
                                key={refund.id}
                                className="flex items-center justify-between p-4 rounded-lg border bg-card"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="font-semibold">
                                      {relatedBooking?.event_type || "Booking"}
                                    </span>
                                    <Badge
                                      variant={
                                        refund.status === "approved" ? "default" :
                                        refund.status === "rejected" ? "destructive" : "secondary"
                                      }
                                    >
                                      {refund.status === "approved" ? "அங்கீகரிக்கப்பட்டது" :
                                       refund.status === "rejected" ? "நிராகரிக்கப்பட்டது" : "நிலுவையில்"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <IndianRupee className="h-3.5 w-3.5" />
                                      ₹{refund.amount.toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <CalendarIcon className="h-3.5 w-3.5" />
                                      Requested: {formatDate(refund.created_at)}
                                    </span>
                                  </div>
                                  {refund.reason && (
                                    <p className="text-sm text-muted-foreground mt-2 italic">
                                      "{refund.reason}"
                                    </p>
                                  )}
                                  {refund.admin_notes && refund.status !== "pending" && (
                                    <div className={`mt-2 p-2 rounded text-sm ${
                                      refund.status === "approved" 
                                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" 
                                        : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                                    }`}>
                                      <strong>Admin:</strong> {refund.admin_notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              </TabsContent>

              {/* Calendar Tab */}
              <TabsContent value="calendar" className="relative z-10">
                <Card className="relative bg-card">
                  <CardHeader>
                    <CardTitle className="font-tamil">காலண்டர் காட்சி</CardTitle>
                    <CardDescription>View your upcoming bookings and events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* Calendar */}
                      <div className="flex justify-center">
                        <Calendar
                          mode="single"
                          selected={selectedCalendarDate}
                          onSelect={setSelectedCalendarDate}
                          className="rounded-md border pointer-events-auto"
                          modifiers={{
                            booking: bookings.map(b => new Date(b.event_date)),
                            event: registrations
                              .filter(r => r.events?.event_date)
                              .map(r => new Date(r.events!.event_date)),
                          }}
                          modifiersStyles={{
                            booking: {
                              backgroundColor: "hsl(var(--primary) / 0.2)",
                              color: "hsl(var(--primary))",
                              fontWeight: "bold",
                            },
                            event: {
                              backgroundColor: "hsl(var(--secondary) / 0.3)",
                              color: "hsl(var(--secondary-foreground))",
                              fontWeight: "bold",
                            },
                          }}
                        />
                      </div>

                      {/* Selected Date Details */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">
                          {selectedCalendarDate 
                            ? format(selectedCalendarDate, "EEEE, MMMM d, yyyy")
                            : "Select a date to view details"
                          }
                        </h3>
                        
                        {selectedCalendarDate && (
                          <>
                            {/* Bookings on selected date */}
                            {bookings.filter(b => 
                              format(new Date(b.event_date), "yyyy-MM-dd") === 
                              format(selectedCalendarDate, "yyyy-MM-dd")
                            ).length > 0 ? (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  Bookings
                                </h4>
                                {bookings
                                  .filter(b => 
                                    format(new Date(b.event_date), "yyyy-MM-dd") === 
                                    format(selectedCalendarDate, "yyyy-MM-dd")
                                  )
                                  .map(booking => (
                                    <div 
                                      key={booking.id} 
                                      className="p-3 rounded-lg bg-primary/5 border border-primary/20"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium">{booking.event_type}</span>
                                        <Badge variant={booking.status === "approved" ? "default" : "secondary"}>
                                          {booking.status}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" />
                                        {booking.start_time} - {booking.end_time}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : null}

                            {/* Events on selected date */}
                            {registrations.filter(r => 
                              r.events?.event_date && 
                              format(new Date(r.events.event_date), "yyyy-MM-dd") === 
                              format(selectedCalendarDate, "yyyy-MM-dd")
                            ).length > 0 ? (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4" />
                                  Registered Events
                                </h4>
                                {registrations
                                  .filter(r => 
                                    r.events?.event_date && 
                                    format(new Date(r.events.event_date), "yyyy-MM-dd") === 
                                    format(selectedCalendarDate, "yyyy-MM-dd")
                                  )
                                  .map(reg => (
                                    <div 
                                      key={reg.id} 
                                      className="p-3 rounded-lg bg-secondary/10 border border-secondary/20"
                                    >
                                      <span className="font-medium">{reg.events?.title}</span>
                                      {reg.events?.venue && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                          📍 {reg.events.venue}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            ) : null}

                            {/* No items on selected date */}
                            {bookings.filter(b => 
                              format(new Date(b.event_date), "yyyy-MM-dd") === 
                              format(selectedCalendarDate, "yyyy-MM-dd")
                            ).length === 0 && 
                            registrations.filter(r => 
                              r.events?.event_date && 
                              format(new Date(r.events.event_date), "yyyy-MM-dd") === 
                              format(selectedCalendarDate, "yyyy-MM-dd")
                            ).length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p>No bookings or events on this date</p>
                              </div>
                            )}
                          </>
                        )}

                        {!selectedCalendarDate && (
                          <div className="text-center py-8 text-muted-foreground">
                            <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>Click on a date to see details</p>
                          </div>
                        )}

                        {/* Legend */}
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium mb-2">Legend</h4>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-primary/20"></div>
                              <span>Booking</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-secondary/30"></div>
                              <span>Event</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment History Tab */}
              <TabsContent value="payments" className="relative z-10">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-tamil">பணம் செலுத்தல் வரலாறு</CardTitle>
                    <CardDescription>Your payment history and receipts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bookings.filter(b => b.payment_status === 'paid' || b.payment_status === 'completed').length === 0 ? (
                      <div className="text-center py-8">
                        <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground font-tamil">பணம் செலுத்தல் இல்லை</p>
                        <p className="text-sm text-muted-foreground">No payment history yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {bookings
                          .filter(b => b.payment_status === 'paid' || b.payment_status === 'completed')
                          .map((booking) => (
                            <div
                              key={booking.id}
                              className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-full bg-green-500/10">
                                    <IndianRupee className="h-4 w-4 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold">{booking.event_type}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {booking.payment_status === "completed" ? "Online Payment" : "Cash Payment"}
                                    </p>
                                  </div>
                                </div>
                                <Badge className="bg-green-500/20 text-green-700">Paid</Badge>
                              </div>
                              
                              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Amount</span>
                                  <span className="font-semibold text-primary">
                                    ₹{booking.booking_amount?.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Event Date</span>
                                  <span>{formatDate(booking.event_date)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Time</span>
                                  <span>{booking.start_time} - {booking.end_time}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Booked On</span>
                                  <span>{formatDate(booking.created_at)}</span>
                                </div>
                              </div>

                              <div className="mt-3 pt-3 border-t flex items-center justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void openBookingReceipt(booking)}
                                  className="gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View Receipt
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Grievances Tab */}
              <TabsContent value="grievances" className="relative z-10">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-tamil">புகார்கள்</CardTitle>
                    <CardDescription>Your submitted grievances</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {grievances.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground font-tamil">புகார்கள் இல்லை</p>
                        <p className="text-sm text-muted-foreground">No grievances submitted</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {grievances.map((grievance) => (
                          <div
                            key={grievance.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {grievance.ticket_number}
                                </Badge>
                                {getGrievanceStatusBadge(grievance.status)}
                              </div>
                              <p className="font-medium">{grievance.subject}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatDate(grievance.created_at)}
                                </span>
                                {grievance.category && (
                                  <Badge variant="secondary" className="text-xs">
                                    {grievance.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Event Registrations Tab */}
              <TabsContent value="events" className="relative z-10">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-tamil">நிகழ்வு பதிவுகள்</CardTitle>
                    <CardDescription>Your event registrations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {registrations.length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground font-tamil">நிகழ்வு பதிவுகள் இல்லை</p>
                        <p className="text-sm text-muted-foreground">No event registrations</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {registrations.map((reg) => (
                          <div
                            key={reg.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="font-semibold mb-2">
                                {reg.events?.title || "Event"}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {reg.events?.event_date && (
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    {formatDate(reg.events.event_date)}
                                  </span>
                                )}
                                {reg.events?.venue && (
                                  <span>{reg.events.venue}</span>
                                )}
                              </div>
                            </div>
                            {reg.events?.status && (
                              <Badge variant="outline">{reg.events.status}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* NOC Requests Tab */}
              <TabsContent value="noc" className="relative z-10">
                <Card className="relative bg-card">
                   <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="font-tamil break-words">NOC சான்றிதழ் கோரிக்கைகள்</CardTitle>
                      <CardDescription>Your No Objection Certificate requests</CardDescription>
                    </div>
                    <Button asChild className="shrink-0 h-auto py-2">
                      <Link to="/noc-certificate">
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="font-tamil">புதிய கோரிக்கை</span>
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {nocRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground font-tamil">NOC கோரிக்கைகள் இல்லை</p>
                        <p className="text-sm text-muted-foreground">No NOC requests yet</p>
                        <Button asChild className="mt-4 h-auto py-2 whitespace-normal">
                          <Link to="/noc-certificate">
                            <Plus className="h-4 w-4 mr-2 shrink-0" />
                            <span className="font-tamil">NOC சான்றிதழுக்கு விண்ணப்பிக்கவும்</span>
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {nocRequests.map((noc) => {
                          const canPrintDownload = (noc.payment_status === "completed" || noc.payment_status === "paid") && noc.status === "approved";
                          const nocRecord: NocRecord = {
                            id: noc.id,
                            applicant_name: noc.applicant_name,
                            applicant_email: noc.applicant_email,
                            applicant_phone: noc.applicant_phone,
                            applicant_membership_number: noc.applicant_membership_number || undefined,
                            applicant_relationship: noc.applicant_relationship,
                            father_name: noc.father_name,
                            father_membership_number: noc.father_membership_number,
                            family_name: noc.family_name,
                            partner_name: noc.partner_name,
                            partner_father_name: noc.partner_father_name,
                            partner_category: noc.partner_category,
                            partner_applicant_relationship: noc.partner_applicant_relationship || undefined,
                            mosque_to_submit: noc.mosque_to_submit,
                            address_to_submit: noc.address_to_submit,
                            status: noc.status,
                            payment_status: noc.payment_status || undefined,
                            created_at: noc.created_at,
                          };
                          
                          return (
                            <div
                              key={noc.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-4"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <span className="font-semibold">{noc.applicant_name}</span>
                                  {getNocStatusBadge(noc.status)}
                                  {(noc.payment_status === "completed" || noc.payment_status === "paid") && (
                                    <Badge className="bg-green-500/20 text-green-700">Paid</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                  <span>தந்தை: {noc.father_name}</span>
                                  <span>துணை: {noc.partner_name}</span>
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    {formatDate(noc.created_at)}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  <span>சமர்ப்பிக்கும் பள்ளிவாசல்: {noc.mosque_to_submit}</span>
                                </div>
                                {certReceiptNumberMap[noc.id] && (
                                  <div className="text-xs font-mono font-semibold text-primary mt-1">
                                    ரசீது எண்: {certReceiptNumberMap[noc.id]}
                                  </div>
                                )}
                              </div>
                              
                              {/* Preview/Print/Download Actions */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {(noc.payment_status === "completed" || noc.payment_status === "paid") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCertReceipt({
                                      certificateType: "noc",
                                      applicantName: noc.applicant_name,
                                      applicantPhone: noc.applicant_phone || undefined,
                                      applicantEmail: noc.applicant_email || undefined,
                                      subjectName: noc.partner_name,
                                      amount: nocFee,
                                      receiptNumber: certReceiptNumberMap[noc.id] || "",
                                      referenceId: noc.id,
                                      referenceType: "noc_certificate",
                                      paymentMethod: certPaymentMethodMap[noc.id] || (noc.payment_status === "paid" ? "cash" : "online"),
                                      createdAt: noc.created_at,
                                      additionalInfo: {
                                        "தந்தை பெயர்": noc.father_name,
                                        "பள்ளிவாசல்": noc.mosque_to_submit,
                                      },
                                    })}
                                  >
                                    <Receipt className="h-4 w-4 mr-1" />
                                    Receipt
                                  </Button>
                                )}
                                {canPrintDownload ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setPreviewNocRecord(nocRecord);
                                        setNocPreviewOpen(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      Preview
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => printNocCertificate(nocRecord)}
                                    >
                                      <Printer className="h-4 w-4 mr-1" />
                                      Print
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => generateNocCertificatePdf(nocRecord)}
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      Download
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    {(noc.status === "pending" || noc.status === "payment_pending") && noc.payment_status === "completed" && (
                                      <Button
                                        size="sm"
                                        onClick={() => submitNocForApproval(noc.id)}
                                        disabled={submittingNocId === noc.id}
                                      >
                                        {submittingNocId === noc.id ? (
                                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        ) : (
                                          <FileCheck className="h-4 w-4 mr-1" />
                                        )}
                                        <span className="font-tamil">அனுமதிக்கு சமர்ப்பி</span>
                                      </Button>
                                    )}
                                    <span className="text-xs text-muted-foreground italic">
                                      {noc.payment_status !== "completed" 
                                        ? "Payment required" 
                                        : noc.status === "submitted"
                                          ? "Awaiting approval"
                                          : (noc.status === "pending" || noc.status === "payment_pending")
                                            ? "Submit for approval"
                                            : ""}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* NOC Certificate Preview Dialog */}
              <Dialog open={nocPreviewOpen} onOpenChange={setNocPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setNocPreviewOpen(false)}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <DialogTitle className="font-tamil">
                        தடையின்மை சான்றிதழ் - NOC Certificate
                      </DialogTitle>
                    </div>
                  </DialogHeader>
                  
                  {previewNocRecord && (
                    <>
                      <NocCertificatePreview record={previewNocRecord} />
                      
                      <DialogFooter className="flex-row gap-2 sm:justify-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            printNocCertificate(previewNocRecord);
                          }}
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </Button>
                        <Button
                          onClick={() => {
                            generateNocCertificatePdf(previewNocRecord);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>

              {/* Heir Certificate Requests Tab */}
              <TabsContent value="heir" className="relative z-10">
                <Card className="relative bg-card">
                   <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="font-tamil break-words">வாரிசு சான்றிதழ் கோரிக்கைகள்</CardTitle>
                      <CardDescription>Your Heir Certificate requests</CardDescription>
                    </div>
                    <Button asChild className="shrink-0 h-auto py-2">
                      <Link to="/heir-certificate">
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="font-tamil">புதிய கோரிக்கை</span>
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {heirRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <ScrollText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground font-tamil">வாரிசு சான்றிதழ் கோரிக்கைகள் இல்லை</p>
                        <p className="text-sm text-muted-foreground">No heir certificate requests yet</p>
                        <Button asChild className="mt-4">
                          <Link to="/heir-certificate">
                            <Plus className="h-4 w-4 mr-2" />
                            <span className="font-tamil">வாரிசு சான்றிதழுக்கு விண்ணப்பிக்கவும்</span>
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {heirRequests.map((heir) => {
                          const canPrintDownload = (heir.payment_status === "completed" || heir.payment_status === "paid") && heir.status === "approved";
                          const heirRecord: HeirRecordType = {
                            id: heir.id,
                            applicant_name: heir.applicant_name,
                            applicant_email: heir.applicant_email,
                            applicant_phone: heir.applicant_phone,
                            applicant_relationship: heir.applicant_relationship,
                            deceased_member_id: heir.deceased_member_id || undefined,
                            deceased_name: heir.deceased_name,
                            deceased_father_name: heir.deceased_father_name,
                            deceased_address: heir.deceased_address,
                            register_number: heir.register_number || undefined,
                            certificate_date: heir.certificate_date || undefined,
                            heirs: heir.heirs || [],
                            status: heir.status,
                            payment_status: heir.payment_status || undefined,
                            admin_notes: heir.admin_notes || undefined,
                            created_at: heir.created_at,
                          };
                          
                          return (
                            <div
                              key={heir.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-4"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <span className="font-semibold">{heir.deceased_name}</span>
                                  {getHeirStatusBadge(heir.status)}
                                  {(heir.payment_status === "completed" || heir.payment_status === "paid") && (
                                    <Badge className="bg-green-500/20 text-green-700">Paid</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                  <span>தந்தை: {heir.deceased_father_name}</span>
                                  <span>முகவரி: {heir.deceased_address}</span>
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    {formatDate(heir.created_at)}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  <span>மனுதாரர்: {heir.applicant_name} ({heir.applicant_relationship})</span>
                                </div>
                                {certReceiptNumberMap[heir.id] && (
                                  <div className="text-xs font-mono font-semibold text-primary mt-1">
                                    ரசீது எண்: {certReceiptNumberMap[heir.id]}
                                  </div>
                                )}
                              </div>
                              
                              {/* Preview/Print/Download Actions */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {(heir.payment_status === "completed" || heir.payment_status === "paid") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCertReceipt({
                                      certificateType: "heir",
                                      applicantName: heir.applicant_name,
                                      applicantPhone: heir.applicant_phone || undefined,
                                      applicantEmail: heir.applicant_email || undefined,
                                      subjectName: heir.deceased_name,
                                      amount: heirFee,
                                      receiptNumber: certReceiptNumberMap[heir.id] || "",
                                      referenceId: heir.id,
                                      referenceType: "heir_certificate",
                                      paymentMethod: certPaymentMethodMap[heir.id] || (heir.payment_status === "paid" ? "cash" : "online"),
                                      createdAt: heir.created_at,
                                      additionalInfo: {
                                        "இறந்தவர் தந்தை": heir.deceased_father_name,
                                        "முகவரி": heir.deceased_address,
                                      },
                                    })}
                                  >
                                    <Receipt className="h-4 w-4 mr-1" />
                                    Receipt
                                  </Button>
                                )}
                                {canPrintDownload ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setPreviewHeirRecord(heirRecord);
                                        setHeirPreviewOpen(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      Preview
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => printHeirCertificate(heirRecord)}
                                    >
                                      <Printer className="h-4 w-4 mr-1" />
                                      Print
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => generateHeirCertificatePdf(heirRecord)}
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      Download
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    {heir.payment_status !== "completed" 
                                      ? "Payment required" 
                                      : heir.status !== "approved" 
                                        ? "Awaiting approval" 
                                        : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Heir Certificate Preview Dialog */}
              <Dialog open={heirPreviewOpen} onOpenChange={setHeirPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setHeirPreviewOpen(false)}
                      type="button"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="font-tamil text-lg font-semibold">
                      வாரிசு சான்றிதழ் - Heir Certificate
                    </h2>
                  </div>
                  
                  {previewHeirRecord && (
                    <>
                      <div className="overflow-x-auto">
                        <HeirCertificatePreview record={previewHeirRecord} />
                      </div>
                      
                      <div className="flex flex-row gap-2 justify-end mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => printHeirCertificate(previewHeirRecord)}
                          type="button"
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </Button>
                        <Button
                          onClick={() => generateHeirCertificatePdf(previewHeirRecord)}
                          type="button"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>

              {/* Certificates Tab (Marriage, Death, Outside Marriage) */}
              <TabsContent value="certificates" className="relative z-10">
                <Card className="relative bg-card">
                  <CardHeader>
                    <div className="min-w-0">
                      <CardTitle className="font-tamil break-words">சான்றிதழ் பணம் செலுத்தல்கள்</CardTitle>
                      <CardDescription>Your marriage, death & outside marriage certificate payments</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {certificatePayments.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground font-tamil">சான்றிதழ் பணம் செலுத்தல்கள் இல்லை</p>
                        <p className="text-sm text-muted-foreground">No certificate payments yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {certificatePayments.map((cp) => {
                          const isPaid = cp.payment_status === "completed";
                          const certTypeLabel = cp.certificate_type === "marriage" 
                            ? "திருமணச்சான்றிதழ் (Marriage)" 
                            : cp.certificate_type === "death" 
                            ? "இறப்புச்சான்றிதழ் (Death)" 
                            : "வெளியூர் திருமணச்சான்றிதழ் (Outside Marriage)";
                          
                          return (
                            <div
                              key={cp.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-4"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <span className="font-semibold font-tamil">{certTypeLabel}</span>
                                  {isPaid ? (
                                    <Badge className="bg-green-500/20 text-green-700">Paid</Badge>
                                  ) : (
                                    <Badge variant="secondary">நிலுவையில்</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                  <span>மனுதாரர்: {cp.applicant_name}</span>
                                  <span className="font-semibold text-primary">₹{cp.amount}</span>
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    {formatDate(cp.created_at)}
                                  </span>
                                </div>
                                {certReceiptNumberMap[cp.id] && (
                                  <div className="text-xs font-mono font-semibold text-primary mt-1">
                                    ரசீது எண்: {certReceiptNumberMap[cp.id]}
                                  </div>
                                )}
                                {cp.razorpay_payment_id && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Ref: {cp.razorpay_payment_id}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                {isPaid && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCertReceipt({
                                      certificateType: cp.certificate_type as "marriage" | "death" | "outside_marriage",
                                      applicantName: cp.applicant_name,
                                      applicantPhone: cp.applicant_phone || undefined,
                                      applicantEmail: cp.applicant_email || undefined,
                                      subjectName: cp.applicant_name,
                                      amount: cp.amount,
                                      receiptNumber: certReceiptNumberMap[cp.id] || "",
                                      referenceId: cp.id,
                                      referenceType: "certificate_payment",
                                      paymentMethod: cp.payment_method || "online",
                                      transactionId: cp.razorpay_payment_id || cp.transaction_id || undefined,
                                      createdAt: cp.created_at,
                                    })}
                                  >
                                    <Receipt className="h-4 w-4 mr-1" />
                                    Receipt
                                  </Button>
                                )}
                                {isPaid && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={certPreviewLoading === cp.id}
                                      onClick={async () => {
                                        setCertPreviewLoading(cp.id);
                                        try {
                                          const table = cp.certificate_type === "marriage" 
                                            ? "marriage_registers" 
                                            : cp.certificate_type === "death" 
                                            ? "death_registers" 
                                            : "outside_marriage_registers";
                                          const { data } = await supabase
                                            .from(table)
                                            .select("*")
                                            .eq("id", cp.reference_id)
                                            .single();
                                          if (data) {
                                            setCertPreviewData({
                                              type: cp.certificate_type as "death" | "marriage" | "outside_marriage",
                                              record: data,
                                            });
                                            setCertPreviewOpen(true);
                                          } else {
                                            toast({ title: "Error", description: "Certificate record not found", variant: "destructive" });
                                          }
                                        } catch {
                                          toast({ title: "Error", description: "Failed to load certificate", variant: "destructive" });
                                        } finally {
                                          setCertPreviewLoading(null);
                                        }
                                      }}
                                    >
                                      {certPreviewLoading === cp.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                      ) : (
                                        <Eye className="h-4 w-4 mr-1" />
                                      )}
                                      Preview
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        const table = cp.certificate_type === "marriage" 
                                          ? "marriage_registers" 
                                          : cp.certificate_type === "death" 
                                          ? "death_registers" 
                                          : "outside_marriage_registers";
                                        const { data } = await supabase
                                          .from(table)
                                          .select("*")
                                          .eq("id", cp.reference_id)
                                          .single();
                                        if (data) {
                                          if (cp.certificate_type === "death") await printDeathCertificate(data as DeathRecord);
                                          else if (cp.certificate_type === "marriage") await printMarriageCertificate(data as MarriageRecord);
                                          else await printOutsideMarriageCertificate(data as OutsideMarriageRecord);
                                        }
                                      }}
                                    >
                                      <Printer className="h-4 w-4 mr-1" />
                                      Print
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        const table = cp.certificate_type === "marriage" 
                                          ? "marriage_registers" 
                                          : cp.certificate_type === "death" 
                                          ? "death_registers" 
                                          : "outside_marriage_registers";
                                        const { data } = await supabase
                                          .from(table)
                                          .select("*")
                                          .eq("id", cp.reference_id)
                                          .single();
                                        if (data) {
                                          if (cp.certificate_type === "death") await generateDeathCertificatePdf(data as DeathRecord);
                                          else if (cp.certificate_type === "marriage") await generateMarriageCertificatePdf(data as MarriageRecord);
                                          else await generateOutsideMarriageCertificatePdf(data as OutsideMarriageRecord);
                                        }
                                      }}
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      Download
                                    </Button>
                                  </>
                                )}
                                {!isPaid && (
                                  <span className="text-xs text-muted-foreground italic">Payment pending</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Certificate Preview Dialog (Marriage/Death/Outside Marriage) */}
              <Dialog open={certPreviewOpen} onOpenChange={setCertPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setCertPreviewOpen(false)}
                      type="button"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="font-tamil text-lg font-semibold">
                      {certPreviewData?.type === "death" 
                        ? "இறப்புச்சான்றிதழ் - Death Certificate"
                        : certPreviewData?.type === "marriage"
                        ? "திருமணச்சான்றிதழ் - Marriage Certificate"
                        : "வெளியூர் திருமணச்சான்றிதழ் - Outside Marriage Certificate"}
                    </h2>
                  </div>
                  
                  {certPreviewData && (
                    <>
                      <div className="overflow-x-auto">
                        {certPreviewData.type === "death" && (
                          <DeathCertificatePreview record={certPreviewData.record as DeathRecord} />
                        )}
                        {certPreviewData.type === "marriage" && (
                          <MarriageCertificatePreview record={certPreviewData.record as MarriageRecord} />
                        )}
                        {certPreviewData.type === "outside_marriage" && (
                          <OutsideMarriageCertificatePreview record={certPreviewData.record as OutsideMarriageRecord} />
                        )}
                      </div>
                      
                      <div className="flex flex-row gap-2 justify-end mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (certPreviewData.type === "death") await printDeathCertificate(certPreviewData.record as DeathRecord);
                            else if (certPreviewData.type === "marriage") await printMarriageCertificate(certPreviewData.record as MarriageRecord);
                            else await printOutsideMarriageCertificate(certPreviewData.record as OutsideMarriageRecord);
                          }}
                          type="button"
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </Button>
                        <Button
                          onClick={async () => {
                            if (certPreviewData.type === "death") await generateDeathCertificatePdf(certPreviewData.record as DeathRecord);
                            else if (certPreviewData.type === "marriage") await generateMarriageCertificatePdf(certPreviewData.record as MarriageRecord);
                            else await generateOutsideMarriageCertificatePdf(certPreviewData.record as OutsideMarriageRecord);
                          }}
                          type="button"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>

              {/* Settings Tab */}
              <TabsContent value="settings" className="relative z-10">
                <div className="space-y-6">
                  {/* Profile Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-tamil flex items-center gap-2">
                        <User className="h-5 w-5" />
                        சுயவிவரம்
                      </CardTitle>
                      <CardDescription>Update your personal information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Full Name</Label>
                          <Input
                            id="full_name"
                            placeholder="Enter your full name"
                            value={profile.full_name}
                            onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            placeholder="Enter your phone number"
                            value={profile.phone}
                            onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{user?.email}</span>
                        <Badge variant="outline" className="text-xs">Email cannot be changed</Badge>
                      </div>
                      <Button 
                        onClick={saveProfile} 
                        disabled={savingProfile}
                        className="w-full sm:w-auto"
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Profile"
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Notification Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-tamil">அறிவிப்பு அமைப்புகள்</CardTitle>
                      <CardDescription>Manage your notification preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Notification Channels
                        </h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <Mail className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <Label htmlFor="email-notifications" className="font-medium">
                                Email Notifications
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Receive booking confirmations and updates via email
                              </p>
                            </div>
                          </div>
                          <Switch
                            id="email-notifications"
                            checked={notificationPrefs.email}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, email: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <Phone className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <Label htmlFor="sms-notifications" className="font-medium">
                                SMS Notifications
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Receive important updates via SMS
                              </p>
                            </div>
                          </div>
                          <Switch
                            id="sms-notifications"
                            checked={notificationPrefs.sms}
                            onCheckedChange={(checked) => 
                              setNotificationPrefs(prev => ({ ...prev, sms: checked }))
                            }
                          />
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button 
                          onClick={saveNotificationPrefs} 
                          disabled={savingPrefs}
                          className="w-full sm:w-auto"
                        >
                          {savingPrefs ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Preferences"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Edit Booking Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-tamil">முன்பதிவை திருத்து</DialogTitle>
            <DialogDescription>
              Modify the date and time for your pending booking
            </DialogDescription>
          </DialogHeader>
          
          {editingBooking && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Event Type</p>
                <p className="text-muted-foreground">{editingBooking.event_type}</p>
              </div>
              
              <div className="space-y-2">
                <Label>New Event Date</Label>
                <Popover modal={true} open={editDatePopoverOpen} onOpenChange={(open) => {
                  setEditDatePopoverOpen(open);
                  if (open) setEditDateDraft(editBookingData.event_date);
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editBookingData.event_date ? (
                        format(editBookingData.event_date, "dd/MM/yyyy")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={editDateDraft}
                      onSelect={(date) => {
                        if (date && bookedDatesForEdit.includes(format(date, "yyyy-MM-dd"))) {
                          toast({
                            title: "தேதி கிடைக்கவில்லை",
                            description: "இந்த தேதி ஏற்கனவே முன்பதிவு செய்யப்பட்டுள்ளது. வேறு தேதியைத் தேர்ந்தெடுக்கவும்.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setEditDateDraft(date ?? undefined);
                      }}
                      disabled={(date) =>
                        date < new Date() ||
                        bookedDatesForEdit.includes(format(date, "yyyy-MM-dd"))
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                    <div className="flex items-center justify-end gap-2 border-t border-border p-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditDatePopoverOpen(false)}
                      >
                        ரத்து
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setEditBookingData(prev => ({ ...prev, event_date: editDateDraft }));
                          setEditDatePopoverOpen(false);
                        }}
                      >
                        சரி
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Select
                    value={editBookingData.start_time}
                    onValueChange={(value) => setEditBookingData(prev => ({ ...prev, start_time: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Select
                    value={editBookingData.end_time}
                    onValueChange={(value) => setEditBookingData(prev => ({ ...prev, end_time: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="End time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveBookingEdit}
              disabled={savingBookingEdit || !editBookingData.event_date}
            >
              {savingBookingEdit ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Request Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
            <DialogDescription>
              Submit a refund request for your cancelled booking. Refunds are processed within 5-7 business days.
            </DialogDescription>
          </DialogHeader>
          
          {refundBooking && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{refundBooking.event_type}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(refundBooking.event_date)} • {refundBooking.start_time} - {refundBooking.end_time}
                </div>
                <div className="text-lg font-semibold text-primary mt-2">
                  Refund Amount: ₹{refundBooking.booking_amount?.toLocaleString()}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="refund-reason">Reason for Refund (Optional)</Label>
                <Textarea
                  id="refund-reason"
                  placeholder="Please provide a reason for the refund..."
                  value={refundFormData.reason}
                  onChange={(e) => setRefundFormData(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Payment Method for Refund</h4>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Show Cash option only for cash-paid bookings */}
                  {refundBooking && isBookingPaidViaCash(refundBooking) && (
                    <Button
                      type="button"
                      variant={refundPaymentMethod === "cash" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRefundPaymentMethod("cash")}
                      className="flex-1"
                    >
                      ரொக்கம் (Cash)
                    </Button>
                  )}
                  {/* UPI and Bank Transfer always shown for cash-paid, only options for non-cash */}
                  <Button
                    type="button"
                    variant={refundPaymentMethod === "upi" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRefundPaymentMethod("upi")}
                    className="flex-1"
                  >
                    UPI
                  </Button>
                  <Button
                    type="button"
                    variant={refundPaymentMethod === "bank" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRefundPaymentMethod("bank")}
                    className="flex-1"
                  >
                    Bank Transfer
                  </Button>
                </div>
                
                {refundPaymentMethod === "cash" ? (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      நேரில் வந்து ரொக்கமாக பெற்றுக்கொள்ளவும். நிர்வாகி அங்கீகரித்த பிறகு, மஸ்ஜித் அலுவலகத்தில் பணத்தைப் பெறலாம்.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Cash refund will be processed in person. After admin approval, you can collect the refund from the Masjid office.
                    </p>
                  </div>
                ) : refundPaymentMethod === "upi" ? (
                  <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI ID <span className="text-destructive">*</span></Label>
                    <Input
                      id="upi-id"
                      placeholder="yourname@upi or 9876543210@paytm"
                      value={refundFormData.upi_id}
                      onChange={(e) => setRefundFormData(prev => ({ ...prev, upi_id: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your UPI ID (e.g., name@okaxis, phone@paytm)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="bank-name">Account Holder Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="bank-name"
                        placeholder="Name as per bank account"
                        value={refundFormData.bank_account_name}
                        onChange={(e) => setRefundFormData(prev => ({ ...prev, bank_account_name: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bank-account">Account Number <span className="text-destructive">*</span></Label>
                      <Input
                        id="bank-account"
                        placeholder="Enter account number"
                        value={refundFormData.bank_account_number}
                        onChange={(e) => setRefundFormData(prev => ({ ...prev, bank_account_number: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bank-ifsc">IFSC Code <span className="text-destructive">*</span></Label>
                      <Input
                        id="bank-ifsc"
                        placeholder="e.g., SBIN0001234"
                        value={refundFormData.bank_ifsc}
                        onChange={(e) => setRefundFormData(prev => ({ ...prev, bank_ifsc: e.target.value.toUpperCase() }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={submitRefundRequest}
              disabled={
                submittingRefund || 
                (refundPaymentMethod === "upi" && !refundFormData.upi_id.trim()) ||
                (refundPaymentMethod === "bank" && (!refundFormData.bank_account_name.trim() || !refundFormData.bank_account_number.trim() || !refundFormData.bank_ifsc.trim())) ||
                false // cash requires no additional fields
              }
            >
              {submittingRefund ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Payment Receipt Modal */}
      {showCertReceipt && (
        <CertificateReceipt data={showCertReceipt} onClose={() => setShowCertReceipt(null)} />
      )}

      {/* Booking Receipt Modal */}
      {showBookingReceipt && (
        <BookingReceipt
          booking={showBookingReceipt}
          requireAction={bookingReceiptRequireAction}
          onClose={() => {
            setShowBookingReceipt(null);
            setBookingReceiptRequireAction(false);
          }}
        />
      )}
    </div>
  );
};

export default UserDashboard;
