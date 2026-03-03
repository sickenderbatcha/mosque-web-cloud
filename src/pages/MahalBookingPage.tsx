import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Building2, Users, Clock, CreditCard, AlertCircle, Loader2, Phone, Mail, IndianRupee, Check, Banknote } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { Link } from "react-router-dom";
import BookingReceipt from "@/components/BookingReceipt";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { useAppSettings } from "@/hooks/useAppSettings";
import CashPaymentRequestDialog from "@/components/CashPaymentRequestDialog";
import OTPVerificationDialog from "@/components/OTPVerificationDialog";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const bookingSchema = z.object({
  applicantName: z.string().min(2, "Name must be at least 2 characters").max(100),
  applicantPhone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  eventType: z.string().min(2, "Event type is required"),
  eventDate: z.string().min(1, "Event date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

import { useUserRole } from "@/hooks/useUserRole";

const MahalBookingPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useUserRole();
  const { settings: bookingSettings, isLoading: settingsLoading } = useAppSettings([
    "booking_rate_nikkah_book",
    "booking_rate_hall",
    "booking_rate_food_facility",
    "booking_otp_required",
    "booking_alert_message",
  ]);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");
  const [formData, setFormData] = useState({
    applicantName: "",
    applicantPhone: "",
    applicantEmail: "",
    eventType: "Nikkah",
    eventDate: "",
    startTime: "09:00",
    endTime: "15:00",
    expectedGuests: "",
    specialRequirements: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [startTimeOpen, setStartTimeOpen] = useState(false);
  const [endTimeOpen, setEndTimeOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    applicantName: string;
    applicantPhone: string;
    applicantEmail?: string;
    eventType: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    expectedGuests?: string;
    amount: number;
    transactionId: string;
    services: { name: string; rate: number }[];
    razorpayPaymentId?: string;
    bookingId?: string;
  } | null>(null);

  const [showCashRequestDialog, setShowCashRequestDialog] = useState(false);
  const [cashRequestData, setCashRequestData] = useState<{
    bookingId?: string;
    amount: number;
    failureReason?: string;
    pendingFormData?: typeof formData;
    pendingServices?: typeof selectedServices;
  } | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [isAdminOverride, setIsAdminOverride] = useState(false);

  const [selectedServices, setSelectedServices] = useState({
    nikkahBook: false,
    hall: false,
    food: false,
  });

  const validateField = (field: string, value: string) => {
    let error = "";
    switch (field) {
      case "applicantName":
        if (!value.trim()) error = "Name is required";
        else if (value.length < 2) error = "Name must be at least 2 characters";
        break;
      case "applicantPhone":
        if (!value.trim()) error = "Phone number is required";
        else if (value.length < 10) error = "Phone must be at least 10 digits";
        break;
      case "eventDate":
        if (!value) error = "Event date is required";
        break;
      case "startTime":
        if (!value) error = "Start time is required";
        break;
      case "endTime":
        if (!value) error = "End time is required";
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      validateField(field, value);
    }
  };

  const handleFieldBlur = (field: string, value: string) => {
    validateField(field, value);
  };

  // Load Razorpay script and set page ready
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setPageLoading(false);
    document.body.appendChild(script);
    
    // Fallback in case script loads instantly or fails
    const timeout = setTimeout(() => setPageLoading(false), 1000);
    
    return () => {
      clearTimeout(timeout);
      document.body.removeChild(script);
    };
  }, []);

  // Dynamic services with rates from settings
  const services = useMemo(() => [
    { 
      id: "nikkahBook", 
      labelTamil: "நிக்காஹ் புத்தகம்", 
      labelEnglish: "Nikkah Book", 
      rate: parseInt(bookingSettings.booking_rate_nikkah_book) || 3000 
    },
    { 
      id: "hall", 
      labelTamil: "மண்டபம்", 
      labelEnglish: "Hall", 
      rate: parseInt(bookingSettings.booking_rate_hall) || 15000 
    },
    { 
      id: "food", 
      labelTamil: "உணவு இட வசதி", 
      labelEnglish: "Dining Hall", 
      rate: parseInt(bookingSettings.booking_rate_food_facility) || 7000 
    },
  ], [bookingSettings]);

  const eventTypes = [
    { value: "Wedding", labelTamil: "திருமணம்" },
    { value: "Nikkah", labelTamil: "நிக்காஹ்" },
    { value: "Walima", labelTamil: "வலீமா" },
    { value: "Engagement", labelTamil: "நிச்சயதார்த்தம்" },
    { value: "Other", labelTamil: "மற்றவை" },
  ];

  const calculateTotal = () => {
    return services.reduce((total, service) => {
      return selectedServices[service.id as keyof typeof selectedServices] 
        ? total + service.rate 
        : total;
    }, 0);
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId as keyof typeof selectedServices]
    }));
  };

  const initiatePayment = async (amount: number) => {
    setPaymentLoading(true);
    
    try {
      // Create Razorpay order WITHOUT a bookingId – booking is deferred
      let orderData: any = null;
      let orderError: any = null;
      
      try {
        const result = await supabase.functions.invoke(
          "create-razorpay-order",
          {
            body: {
              amount,
              notes: {
                eventType: formData.eventType,
                eventDate: formData.eventDate,
              },
            },
          }
        );
        orderData = result.data;
        orderError = result.error;
      } catch (invokeError: any) {
        console.error("Edge function invoke threw:", invokeError);
        throw new Error("Payment gateway unavailable. Please use cash payment.");
      }

      if (orderError || !orderData?.orderId) {
        console.error("Order creation failed:", { orderError, orderData });
        throw new Error("Failed to create payment order");
      }

      // Capture form state at this moment so closures below use the correct values
      const capturedFormData = { ...formData };
      const capturedServices = { ...selectedServices };
      const capturedIsAdminOverride = isAdminOverride;

      // Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "இளையான்குடி பள்ளிவாசல்",
        description: `Mahal Booking - ${capturedFormData.eventType}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          // Payment succeeded – NOW create the booking
          try {
            const rpcName = capturedIsAdminOverride ? "create_mahal_booking_admin_override" : "create_mahal_booking";
            const { data: bookingId, error: bookingError } = await supabase.rpc(rpcName, {
              _applicant_name: capturedFormData.applicantName,
              _applicant_phone: capturedFormData.applicantPhone,
              _applicant_email: capturedFormData.applicantEmail || null,
              _event_type: capturedFormData.eventType,
              _event_date: capturedFormData.eventDate,
              _start_time: capturedFormData.startTime,
              _end_time: capturedFormData.endTime,
              _expected_guests: capturedFormData.expectedGuests ? parseInt(capturedFormData.expectedGuests) : null,
              _special_requirements: capturedFormData.specialRequirements || null,
              _booking_amount: amount,
            });

            if (bookingError) throw bookingError;

            // Verify payment with the new bookingId
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "create-razorpay-order?action=verify",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingId,
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
              description: "Your booking has been confirmed with payment.",
            });

            // Prepare selected services for notification
            const selectedServicesList = services
              .filter(s => capturedServices[s.id as keyof typeof capturedServices])
              .map(s => ({ name: `${s.labelTamil} (${s.labelEnglish})`, rate: s.rate }));

            // Send payment success notification
            supabase.functions.invoke("send-notification-email", {
              body: {
                type: "payment_success",
                email: capturedFormData.applicantEmail || undefined,
                phone: capturedFormData.applicantPhone,
                recipientName: capturedFormData.applicantName,
                data: {
                  amount,
                  transactionId: response.razorpay_payment_id,
                  eventType: capturedFormData.eventType,
                  eventDate: capturedFormData.eventDate,
                  startTime: capturedFormData.startTime,
                  endTime: capturedFormData.endTime,
                  expectedGuests: capturedFormData.expectedGuests || undefined,
                  services: selectedServicesList,
                },
              },
            }).catch(console.error);

            // Set receipt data
            setReceiptData({
              applicantName: capturedFormData.applicantName,
              applicantPhone: capturedFormData.applicantPhone,
              applicantEmail: capturedFormData.applicantEmail || undefined,
              eventType: capturedFormData.eventType,
              eventDate: capturedFormData.eventDate,
              startTime: capturedFormData.startTime,
              endTime: capturedFormData.endTime,
              expectedGuests: capturedFormData.expectedGuests || undefined,
              amount,
              transactionId: bookingId ? String(bookingId).substring(0, 8).toUpperCase() : response.razorpay_payment_id,
              services: selectedServicesList,
              razorpayPaymentId: response.razorpay_payment_id,
              bookingId: bookingId ? String(bookingId) : undefined,
            });
            setShowReceipt(true);

            // Reset form
            setFormData({
              applicantName: "",
              applicantPhone: "",
              applicantEmail: "",
              eventType: "Nikkah",
              eventDate: "",
              startTime: "09:00",
              endTime: "15:00",
              expectedGuests: "",
              specialRequirements: "",
            });
            setSelectedServices({ nikkahBook: false, hall: false, food: false });
          } catch (err: any) {
            console.error("Booking creation after payment error:", err);
            toast({
              title: "முன்பதிவு பிழை / Booking Error",
              description: "Payment was successful but booking creation failed. Please contact admin with your payment ID: " + response.razorpay_payment_id,
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: capturedFormData.applicantName,
          email: capturedFormData.applicantEmail,
          contact: capturedFormData.applicantPhone,
        },
        theme: {
          color: "#1a5f4a",
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "பணம் செலுத்தல் ரத்து செய்யப்பட்டது / Payment Cancelled",
              description: "You can request cash payment below.",
            });
            // No booking created yet – set pending data for cash request dialog
            setCashRequestData({
              amount,
              failureReason: "Payment cancelled by user",
              pendingFormData: capturedFormData,
              pendingServices: capturedServices,
            });
            setShowCashRequestDialog(true);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        // No booking created yet – set pending data for cash request dialog
        setCashRequestData({
          amount,
          failureReason: response.error?.description || response.error?.reason || "Payment failed",
          pendingFormData: capturedFormData,
          pendingServices: capturedServices,
        });
        setShowCashRequestDialog(true);
      });
      razorpay.open();
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      // Silently fall back to cash payment dialog instead of showing an error toast
      setCashRequestData({
        amount,
        failureReason: error.message || "Payment initiation failed",
        pendingFormData: { ...formData },
        pendingServices: { ...selectedServices },
      });
      setShowCashRequestDialog(true);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleFormValidation = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const fieldsToValidate = ["applicantName", "applicantPhone", "eventDate", "startTime", "endTime"];
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fieldsToValidate.forEach(field => {
      const value = formData[field as keyof typeof formData];
      if (!validateField(field, value)) {
        isValid = false;
      }
    });

    const result = bookingSchema.safeParse({
      applicantName: formData.applicantName,
      applicantPhone: formData.applicantPhone,
      eventType: formData.eventType,
      eventDate: formData.eventDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
    });

    if (!result.success) {
      const fieldNames: Record<string, string> = {
        applicantName: "பெயர் (Name)",
        applicantPhone: "தொலைபேசி (Phone)",
        eventDate: "தேதி (Date)",
        startTime: "தொடக்க நேரம் (Start Time)",
        endTime: "முடிவு நேரம் (End Time)",
      };
      
      const errorMessages: string[] = [];
      result.error.errors.forEach(err => {
        const field = err.path[0] as string;
        newErrors[field] = err.message;
        if (fieldNames[field]) {
          errorMessages.push(fieldNames[field]);
        }
      });
      setErrors(prev => ({ ...prev, ...newErrors }));
      
      // Show specific fields that need attention
      toast({
        title: "பிழை / Validation Error",
        description: `Please fill: ${errorMessages.join(", ")}`,
        variant: "destructive",
      });
      
      // Auto-scroll to first error field
      const firstErrorField = result.error.errors[0]?.path[0] as string;
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField) || 
                        document.querySelector(`[aria-describedby="${firstErrorField}-error"]`);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      toast({
        title: "சேவை தேர்ந்தெடுக்கவும் / Select Services",
        description: "Please select at least one service.",
        variant: "destructive",
      });
      return;
    }

    // Check for booking conflicts using security-definer function
    setLoading(true);
    let adminOverrideNeeded = false;
    try {
      const { data: conflictData, error: conflictError } = await supabase.rpc(
        "check_mahal_booking_conflict",
        { _event_date: formData.eventDate }
      );

      if (conflictError) {
        console.error("Error checking conflicts:", conflictError);
      }

      if (conflictData && conflictData.length > 0 && conflictData[0].has_conflict) {
        if (isAdmin) {
          // Admin gets a soft warning but can proceed
          adminOverrideNeeded = true;
          setIsAdminOverride(true);
        } else {
          const hasApproved = conflictData[0].has_approved;
          setErrors(prev => ({ ...prev, eventDate: "This date is already booked" }));
          toast({
            title: "தேதி கிடைக்கவில்லை / Date Not Available",
            description: hasApproved 
              ? "This date has already been booked for another event."
              : "This date has a pending booking request. Please choose another date.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } else {
        setIsAdminOverride(false);
      }
    } catch (error) {
      console.error("Error checking booking conflicts:", error);
    }
    setLoading(false);

    // Check if OTP verification is required from settings
    const otpRequired = bookingSettings.booking_otp_required === "true";

    // Skip OTP for admin cash payments OR when OTP is not required
    if ((isAdmin && paymentMethod === "cash") || !otpRequired) {
      setShowConfirmDialog(true);
      return;
    }

    // Show OTP verification dialog when OTP is required
    setOtpVerified(false);
    setShowOTPDialog(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    const totalAmount = calculateTotal();

    try {
      // For cash payments (admin only), create booking immediately and mark as paid
      if (isAdmin && paymentMethod === "cash") {
        // Use admin override RPC if date is already taken
        const rpcName = isAdminOverride ? "create_mahal_booking_admin_override" : "create_mahal_booking";
        const { data: bookingId, error } = await supabase.rpc(rpcName, {
          _applicant_name: formData.applicantName,
          _applicant_phone: formData.applicantPhone,
          _applicant_email: formData.applicantEmail || null,
          _event_type: formData.eventType,
          _event_date: formData.eventDate,
          _start_time: formData.startTime,
          _end_time: formData.endTime,
          _expected_guests: formData.expectedGuests ? parseInt(formData.expectedGuests) : null,
          _special_requirements: formData.specialRequirements || null,
          _booking_amount: totalAmount,
        });

        if (error) {
          if (error.message?.includes("DATE_NOT_AVAILABLE")) {
            setErrors(prev => ({ ...prev, eventDate: "This date is already booked" }));
            toast({
              title: "தேதி கிடைக்கவில்லை / Date Not Available",
              description: "This date has already been booked. Please choose another date.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          throw error;
        }

        // Update booking status to approved with cash payment
        await supabase
          .from("mahal_bookings")
          .update({
            status: "approved",
            payment_status: "paid",
            admin_notes: "Cash payment received by admin",
          })
          .eq("id", bookingId);

        const selectedServicesList = services
          .filter(s => selectedServices[s.id as keyof typeof selectedServices])
          .map(s => ({ name: `${s.labelTamil} (${s.labelEnglish})`, rate: s.rate }));

        toast({
          title: "முன்பதிவு உறுதிசெய்யப்பட்டது! / Booking Confirmed!",
          description: `Cash payment of ₹${totalAmount} recorded successfully.`,
        });

        setReceiptData({
          applicantName: formData.applicantName,
          applicantPhone: formData.applicantPhone,
          applicantEmail: formData.applicantEmail || undefined,
          eventType: formData.eventType,
          eventDate: formData.eventDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          expectedGuests: formData.expectedGuests || undefined,
          amount: totalAmount,
          transactionId: `CASH-${Date.now()}`,
          services: selectedServicesList,
          bookingId: bookingId || undefined,
        });
        setShowReceipt(true);

        // Reset form
        setFormData({
          applicantName: "",
          applicantPhone: "",
          applicantEmail: "",
           eventType: "Nikkah",
          eventDate: "",
          startTime: "09:00",
          endTime: "15:00",
          expectedGuests: "",
          specialRequirements: "",
        });
        setSelectedServices({ nikkahBook: false, hall: false, food: false });
        setPaymentMethod("online");
        setIsAdminOverride(false);
        setLoading(false);
        return;
      }

      // For online payment: DO NOT create booking yet.
      // Booking will be created ONLY after successful Razorpay payment
      // or when the user submits a cash payment request via the dialog.
      await initiatePayment(totalAmount);

    } catch (error: any) {
      console.error("handleConfirmedSubmit error:", error);
      // Fallback: if initiatePayment somehow didn't catch, open cash dialog
      if (!showCashRequestDialog) {
        setCashRequestData({
          amount: totalAmount,
          failureReason: error.message || "Payment initiation failed",
          pendingFormData: { ...formData },
          pendingServices: { ...selectedServices },
        });
        setShowCashRequestDialog(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading || authLoading || settingsLoading) {
    return (
      <div className="min-h-screen">
        {/* Hero Skeleton */}
        <section className="py-20 bg-primary">
          <div className="container mx-auto px-4 text-center">
            <Skeleton className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary-foreground/20" />
            <Skeleton className="h-10 w-64 mx-auto mb-4 bg-primary-foreground/20" />
            <Skeleton className="h-6 w-80 mx-auto bg-primary-foreground/20" />
          </div>
        </section>

        {/* Form Skeleton */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="shadow-medium">
                <CardHeader>
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-5 w-80" />
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Services Skeleton */}
                  <div>
                    <Skeleton className="h-6 w-48 mb-4" />
                    <div className="grid md:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                      ))}
                    </div>
                  </div>

                  {/* Form Fields Skeleton */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>

                  {/* Button Skeleton */}
                  <div className="flex gap-4 pt-4">
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-12 w-32" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      {/* Booking Receipt Modal */}
      <AnimatePresence>
        {showReceipt && receiptData && (
          <BookingReceipt
            booking={receiptData}
            requireAction
            onClose={() => {
              setShowReceipt(false);
              setReceiptData(null);
            }}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Building2 className="h-16 w-16 mx-auto mb-4 text-secondary" />
            <h1 className="text-3xl md:text-5xl font-bold font-tamil text-primary-foreground mb-4">
              மஹால் முன்பதிவு
            </h1>
            <p className="text-primary-foreground/80 font-display text-xl">
              Mahal Booking - Wedding Hall Reservation
            </p>
          </motion.div>
        </div>
      </section>

      {/* Booking Form Section */}
      <section className="py-8 md:py-16 bg-background islamic-pattern overflow-hidden">
        <div className="container mx-auto px-3 sm:px-4 max-w-full overflow-hidden">
          <div className="max-w-6xl mx-auto w-full overflow-hidden">

            <div className="grid lg:grid-cols-3 gap-4 md:gap-8 overflow-hidden">
              {/* Main Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 min-w-0"
              >
              <Card className="shadow-medium w-full max-w-full overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="font-tamil text-lg sm:text-xl md:text-2xl break-words">
                    திருமண மண்டப முன்பதிவு
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Book our wedding hall for your special occasion
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <form onSubmit={handleFormValidation} className="space-y-8">
                    {/* Services Selection */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      <Label className="font-tamil text-sm sm:text-base md:text-lg font-semibold mb-4 block">
                        சேவைகளைத் தேர்ந்தெடுக்கவும்
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4" role="group" aria-labelledby="services-label">
                        {services.map((service, index) => {
                          const isChecked = selectedServices[service.id as keyof typeof selectedServices];
                          return (
                            <motion.label
                              key={service.id}
                              htmlFor={`service-${service.id}`}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden ${
                                isChecked
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <div className="flex items-start gap-2 sm:gap-3">
                                <input
                                  type="checkbox"
                                  id={`service-${service.id}`}
                                  checked={isChecked}
                                  onChange={() => handleServiceToggle(service.id)}
                                  className="sr-only"
                                  aria-describedby={`service-${service.id}-desc`}
                                />
                                <motion.div
                                  animate={isChecked ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                  className={`mt-1 h-4 w-4 shrink-0 rounded-sm border ring-offset-background flex items-center justify-center transition-colors ${
                                    isChecked
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "bg-background border-primary/40"
                                  }`}
                                  aria-hidden="true"
                                >
                                  {isChecked && <Check className="h-3 w-3" />}
                                </motion.div>
                                <div id={`service-${service.id}-desc`} className="min-w-0">
                                  <p className="font-tamil font-semibold text-sm sm:text-base">{service.labelTamil}</p>
                                  <p className="text-xs sm:text-sm text-muted-foreground">{service.labelEnglish}</p>
                                  <p className="text-primary font-semibold mt-1 text-sm sm:text-base">₹{service.rate.toLocaleString()}</p>
                                </div>
                              </div>
                            </motion.label>
                          );
                        })}
                      </div>
                    </motion.div>

                    {/* Applicant Details */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
                    >
                      <div>
                        <Label htmlFor="applicantName" className="font-tamil">விண்ணப்பதாரர் பெயர் *</Label>
                        <Input
                          id="applicantName"
                          placeholder="Applicant Name"
                          value={formData.applicantName}
                          onChange={(e) => handleFieldChange("applicantName", e.target.value)}
                          onBlur={(e) => handleFieldBlur("applicantName", e.target.value)}
                          className={errors.applicantName ? "border-destructive" : ""}
                          aria-invalid={!!errors.applicantName}
                          aria-describedby={errors.applicantName ? "applicantName-error" : undefined}
                        />
                        {errors.applicantName && (
                          <p id="applicantName-error" className="text-sm text-destructive mt-1">{errors.applicantName}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="applicantPhone" className="font-tamil">தொலைபேசி எண் *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="applicantPhone"
                            placeholder="Phone Number"
                            className={cn("pl-10", errors.applicantPhone && "border-destructive")}
                            value={formData.applicantPhone}
                            onChange={(e) => handleFieldChange("applicantPhone", e.target.value)}
                            onBlur={(e) => handleFieldBlur("applicantPhone", e.target.value)}
                            aria-invalid={!!errors.applicantPhone}
                            aria-describedby={errors.applicantPhone ? "applicantPhone-error" : undefined}
                          />
                        </div>
                        {errors.applicantPhone && (
                          <p id="applicantPhone-error" className="text-sm text-destructive mt-1">{errors.applicantPhone}</p>
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
                    >
                      <div>
                        <Label htmlFor="applicantEmail" className="font-tamil">மின்னஞ்சல்</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="applicantEmail"
                            type="email"
                            placeholder="Email (optional)"
                            className="pl-10"
                            value={formData.applicantEmail}
                            onChange={(e) => setFormData({ ...formData, applicantEmail: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="eventType" className="font-tamil">நிகழ்வு வகை *</Label>
                        <select
                          id="eventType"
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={formData.eventType}
                          onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                          required
                        >
                          {eventTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.labelTamil} ({type.value})
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>

                    {/* Mobile Availability Calendar - Only visible on mobile/tablet */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.45 }}
                      className="lg:hidden"
                    >
                      <AvailabilityCalendar 
                        selectedDate={formData.eventDate}
                        onDateSelect={(date) => handleFieldChange("eventDate", format(date, "yyyy-MM-dd"))}
                        refreshKey={calendarRefreshKey}
                        isAdmin={isAdmin}
                      />
                    </motion.div>

                    {/* Event Details */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 }}
                      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6"
                    >
                      <div>
                        <Label className="font-tamil">நிகழ்வு தேதி *</Label>
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.eventDate && "text-muted-foreground",
                                errors.eventDate && "border-destructive"
                              )}
                              aria-invalid={!!errors.eventDate}
                              aria-describedby={errors.eventDate ? "eventDate-error" : undefined}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.eventDate ? format(new Date(formData.eventDate), "dd/MM/yyyy") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.eventDate ? new Date(formData.eventDate) : undefined}
                              onSelect={(date) => {
                                const value = date ? format(date, "yyyy-MM-dd") : "";
                                handleFieldChange("eventDate", value);
                                setDatePickerOpen(false);
                              }}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.eventDate && (
                          <p id="eventDate-error" className="text-sm text-destructive mt-1">{errors.eventDate}</p>
                        )}
                      </div>
                      <div>
                        <Label className="font-tamil">தொடக்க நேரம் *</Label>
                        <Popover open={startTimeOpen} onOpenChange={setStartTimeOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.startTime && "text-muted-foreground",
                                errors.startTime && "border-destructive"
                              )}
                              aria-invalid={!!errors.startTime}
                              aria-describedby={errors.startTime ? "startTime-error" : undefined}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              {formData.startTime ? formData.startTime : <span>Select time</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2" align="start">
                            <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto pointer-events-auto">
                              {Array.from({ length: 24 }, (_, hour) => 
                                ["00", "30"].map((minute) => {
                                  const time = `${hour.toString().padStart(2, "0")}:${minute}`;
                                  return (
                                    <Button
                                      key={time}
                                      variant={formData.startTime === time ? "default" : "ghost"}
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => {
                                        handleFieldChange("startTime", time);
                                        setStartTimeOpen(false);
                                      }}
                                    >
                                      {time}
                                    </Button>
                                  );
                                })
                              ).flat()}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {errors.startTime && (
                          <p id="startTime-error" className="text-sm text-destructive mt-1">{errors.startTime}</p>
                        )}
                      </div>
                      <div>
                        <Label className="font-tamil">முடிவு நேரம் *</Label>
                        <Popover open={endTimeOpen} onOpenChange={setEndTimeOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.endTime && "text-muted-foreground",
                                errors.endTime && "border-destructive"
                              )}
                              aria-invalid={!!errors.endTime}
                              aria-describedby={errors.endTime ? "endTime-error" : undefined}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              {formData.endTime ? formData.endTime : <span>Select time</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2" align="start">
                            <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto pointer-events-auto">
                              {Array.from({ length: 24 }, (_, hour) => 
                                ["00", "30"].map((minute) => {
                                  const time = `${hour.toString().padStart(2, "0")}:${minute}`;
                                  return (
                                    <Button
                                      key={time}
                                      variant={formData.endTime === time ? "default" : "ghost"}
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => {
                                        handleFieldChange("endTime", time);
                                        setEndTimeOpen(false);
                                      }}
                                    >
                                      {time}
                                    </Button>
                                  );
                                })
                              ).flat()}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {errors.endTime && (
                          <p id="endTime-error" className="text-sm text-destructive mt-1">{errors.endTime}</p>
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.6 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
                    >
                      <div>
                        <Label htmlFor="expectedGuests" className="font-tamil">எதிர்பார்க்கப்படும் விருந்தினர்கள்</Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="expectedGuests"
                            type="number"
                            placeholder="Number of guests"
                            className="pl-10"
                            value={formData.expectedGuests}
                            onChange={(e) => setFormData({ ...formData, expectedGuests: e.target.value })}
                          />
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.7 }}
                    >
                      <Label htmlFor="specialRequirements" className="font-tamil">சிறப்பு தேவைகள்</Label>
                      <Textarea
                        id="specialRequirements"
                        placeholder="Any special requirements or notes..."
                        value={formData.specialRequirements}
                        onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                      />
                    </motion.div>

                    {/* Total Amount */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.8 }}
                    >
                      {calculateTotal() > 0 && (
                        <motion.div 
                          className="p-6 bg-primary/5 rounded-xl"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-tamil text-lg">கணக்கிடப்பட்ட தொகை:</span>
                            <motion.span 
                              key={calculateTotal()}
                              initial={{ scale: 1.3 }}
                              animate={{ scale: 1 }}
                              className="text-3xl font-bold text-primary"
                            >
                              ₹{calculateTotal().toLocaleString()}
                            </motion.span>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Alert */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.9 }}
                    >
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="font-tamil">
                          {bookingSettings.booking_alert_message || "தேதி கிடைக்கிறதா என்பது நிர்வாகத்தால் சரிபார்க்கப்படும். உங்கள் முன்பதிவு நிலை குறித்து தொலைபேசி வழியாக அறிவிக்கப்படும்."}
                        </AlertDescription>
                      </Alert>
                    </motion.div>

                    {/* Payment Method Selector (Admin Only) */}
                    {isAdmin && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.95 }}
                      >
                        <div className="p-4 bg-muted rounded-lg border-2 border-dashed border-primary/30">
                          <Label className="font-tamil text-sm font-medium mb-3 block">
                            கட்டண முறை (Admin Only)
                          </Label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="bookingPaymentMethod"
                                value="online"
                                checked={paymentMethod === "online"}
                                onChange={() => setPaymentMethod("online")}
                                className="w-4 h-4 text-primary"
                              />
                              <span className="text-sm">Online Payment</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="bookingPaymentMethod"
                                value="cash"
                                checked={paymentMethod === "cash"}
                                onChange={() => setPaymentMethod("cash")}
                                className="w-4 h-4 text-primary"
                              />
                              <span className="text-sm">Cash Payment</span>
                            </label>
                          </div>
                          {paymentMethod === "cash" && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Cash payments will be recorded directly and booking will be auto-approved.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Action Buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 1.0 }}
                      className="flex flex-col gap-4 pt-4"
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button 
                          type="submit" 
                          variant="gold" 
                          size="lg" 
                          className="flex-1" 
                          disabled={loading || paymentLoading || calculateTotal() <= 0}
                        >
                          {loading || paymentLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <IndianRupee className="h-5 w-5 mr-2" />
                              <span className="font-tamil">பணம் செலுத்தி முன்பதிவு செய்</span>
                            </>
                          )}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="lg" 
                          onClick={() => {
                            setFormData({
                              applicantName: "",
                              applicantPhone: "",
                              applicantEmail: "",
                              eventType: "Nikkah",
                              eventDate: "",
                              startTime: "09:00",
                              endTime: "15:00",
                              expectedGuests: "",
                              specialRequirements: "",
                            });
                            setSelectedServices({ nikkahBook: false, hall: false, food: false });
                            setErrors({});
                            setIsAdminOverride(false);
                          }}
                        >
                          <span className="font-tamil">ரத்துசெய்</span>
                        </Button>
                      </div>
                      
                      {/* Cash Payment Request Button for Normal Users */}
                      {!isAdmin && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="lg"
                          className="w-full flex-wrap h-auto py-3 gap-1"
                          disabled={loading || paymentLoading || calculateTotal() <= 0}
                          onClick={async () => {
                            // Validate form first
                            const fieldsToValidate = ["applicantName", "applicantPhone", "eventDate", "startTime", "endTime"];
                            let isValid = true;
                            fieldsToValidate.forEach(field => {
                              const value = formData[field as keyof typeof formData];
                              if (!validateField(field, value)) {
                                isValid = false;
                              }
                            });
                            
                            if (!isValid) {
                              toast({
                                title: "பிழை / Validation Error",
                                description: "Please fill all required fields",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            const totalAmount = calculateTotal();
                            if (totalAmount <= 0) {
                              toast({
                                title: "சேவை தேர்ந்தெடுக்கவும் / Select Services",
                                description: "Please select at least one service.",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            setLoading(true);
                            
                            try {
                              // Check for booking conflicts first
                              const { data: conflictData } = await supabase.rpc("check_mahal_booking_conflict", {
                                _event_date: formData.eventDate,
                              });
                              
                              if (conflictData && conflictData.length > 0 && conflictData[0].has_conflict) {
                                toast({
                                  title: "தேதி கிடைக்கவில்லை / Date Not Available",
                                  description: conflictData[0].has_approved 
                                    ? "This date has already been booked."
                                    : "This date has a pending booking request.",
                                  variant: "destructive",
                                });
                                setLoading(false);
                                return;
                              }
                              
                              // DO NOT create booking here - just open dialog with form data
                              // Booking will be created when user actually submits the cash request
                              setCashRequestData({
                                amount: totalAmount,
                                failureReason: "User requested cash payment",
                                pendingFormData: { ...formData },
                                pendingServices: { ...selectedServices },
                              });
                              setShowCashRequestDialog(true);
                              
                            } catch (error: any) {
                              toast({
                                title: "பிழை / Error",
                                description: error.message || "Failed to check availability.",
                                variant: "destructive",
                              });
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          <Banknote className="h-5 w-5 shrink-0" />
                          <span className="font-tamil text-sm sm:text-base">ரொக்க செலுத்துதல் கோரிக்கை</span>
                          <span className="text-xs text-muted-foreground">(Cash Request)</span>
                        </Button>
                      )}
                    </motion.div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

              {/* Booking Summary Sidebar - Hidden on mobile to prevent overlap */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="hidden lg:block lg:col-span-1 w-full max-w-full min-w-0 overflow-hidden"
              >
                <div className="sticky top-24 space-y-4 sm:space-y-6 w-full overflow-hidden z-10">
                  {/* Availability Calendar */}
                  <AvailabilityCalendar 
                    selectedDate={formData.eventDate}
                    onDateSelect={(date) => handleFieldChange("eventDate", format(date, "yyyy-MM-dd"))}
                    refreshKey={calendarRefreshKey}
                    isAdmin={isAdmin}
                  />

                  <Card className="shadow-medium border-2 border-primary/20 w-full">
                    <CardHeader className="bg-primary/5 border-b">
                      <CardTitle className="font-tamil text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        முன்பதிவு சுருக்கம்
                      </CardTitle>
                      <CardDescription>Booking Summary</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {/* Selected Services */}
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">தேர்ந்தெடுக்கப்பட்ட சேவைகள் / Selected Services</h4>
                        {services.filter(s => selectedServices[s.id as keyof typeof selectedServices]).length > 0 ? (
                          <div className="space-y-2">
                            {services.filter(s => selectedServices[s.id as keyof typeof selectedServices]).map(service => (
                              <div key={service.id} className="flex justify-between items-center py-2 border-b border-dashed last:border-0">
                                <div>
                                  <p className="font-tamil text-sm">{service.labelTamil}</p>
                                  <p className="text-xs text-muted-foreground">{service.labelEnglish}</p>
                                </div>
                                <span className="font-semibold text-primary">₹{service.rate.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No services selected</p>
                        )}
                      </div>

                      {/* Event Details Summary */}
                      {(formData.applicantName || formData.eventDate || formData.eventType !== "Nikkah") && (
                        <div className="border-t pt-4">
                          <h4 className="font-semibold text-sm text-muted-foreground mb-2">நிகழ்வு விவரங்கள் / Event Details</h4>
                          <div className="space-y-2 text-sm">
                            {formData.applicantName && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">பெயர்:</span>
                                <span className="font-medium truncate ml-2 max-w-[120px]">{formData.applicantName}</span>
                              </div>
                            )}
                            {formData.eventType && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">நிகழ்வு:</span>
                                <span className="font-medium">{eventTypes.find(t => t.value === formData.eventType)?.labelTamil || formData.eventType}</span>
                              </div>
                            )}
                            {formData.eventDate && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">தேதி:</span>
                                <span className="font-medium">{format(new Date(formData.eventDate), "dd/MM/yyyy")}</span>
                              </div>
                            )}
                            {formData.startTime && formData.endTime && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">நேரம்:</span>
                                <span className="font-medium">{formData.startTime} - {formData.endTime}</span>
                              </div>
                            )}
                            {formData.expectedGuests && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">விருந்தினர்:</span>
                                <span className="font-medium">{formData.expectedGuests}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Total Amount */}
                      <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between items-center">
                          <span className="font-tamil font-semibold">மொத்தம்:</span>
                          <motion.span 
                            key={calculateTotal()}
                            initial={{ scale: 1.2, color: "hsl(var(--primary))" }}
                            animate={{ scale: 1 }}
                            className="text-2xl font-bold text-primary"
                          >
                            ₹{calculateTotal().toLocaleString()}
                          </motion.span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Total Amount</p>
                      </div>

                      {/* Quick Status */}
                      <div className="bg-muted/50 rounded-lg p-3 mt-4">
                        <div className="flex items-center gap-2 text-sm">
                          {calculateTotal() > 0 ? (
                            <>
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="text-green-700">Ready to book</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                              <span className="text-amber-700">Select services to continue</span>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-muted relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[ 
              { icon: Building2, title: "அழகான மண்டபம்", desc: "Beautiful Hall" },
              { icon: Users, title: "500+ இருக்கைகள்", desc: "500+ Seating Capacity" },
              { icon: CalendarIcon, title: "எளிய முன்பதிவு", desc: "Easy Booking" },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="text-center p-6 bg-card">
                  <feature.icon className="h-10 w-10 mx-auto mb-3 text-primary" />
                  <h3 className="font-tamil font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-tamil text-xl">முன்பதிவை உறுதிப்படுத்தவும்</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm">
                {isAdminOverride && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-400">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold font-tamil">⚠️ நிர்வாக மேலெழுதல் / Admin Override</p>
                      <p className="text-xs mt-1">
                        இந்த தேதியில் ஏற்கனவே முன்பதிவு உள்ளது. நிர்வாகியாக நீங்கள் மீறி முன்பதிவு செய்யலாம்.
                      </p>
                      <p className="text-xs mt-0.5">
                        This date already has an existing booking. As admin, you are overriding the availability.
                      </p>
                    </div>
                  </div>
                )}
                <p className="font-tamil">பணம் செலுத்துவதற்கு முன் உங்கள் முன்பதிவு விவரங்களை சரிபார்க்கவும்:</p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-tamil">பெயர்:</span>
                    <span className="font-medium">{formData.applicantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-tamil">தொலைபேசி:</span>
                    <span className="font-medium">{formData.applicantPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-tamil">நிகழ்வு வகை:</span>
                    <span className="font-medium font-tamil">{eventTypes.find(t => t.value === formData.eventType)?.labelTamil || formData.eventType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-tamil">தேதி:</span>
                    <span className="font-medium">{formData.eventDate ? format(new Date(formData.eventDate), "dd/MM/yyyy") : ""}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-tamil">நேரம்:</span>
                    <span className="font-medium">{formData.startTime} - {formData.endTime}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-muted-foreground font-semibold font-tamil">மொத்த தொகை:</span>
                    <span className="font-bold text-primary">₹{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" className="font-tamil">ரத்துசெய்</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={handleConfirmedSubmit} className="font-tamil">
              பணம் செலுத்து
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cash Payment Request Dialog */}
      {cashRequestData && (
        <CashPaymentRequestDialog
          open={showCashRequestDialog}
          onOpenChange={(open) => {
            if (!open) {
              // User cancelled dialog - no booking was created, just clear state
              setCashRequestData(null);
            }
            setShowCashRequestDialog(open);
          }}
          serviceType="booking"
          referenceId={cashRequestData.bookingId}
          amount={cashRequestData.amount}
          applicantName={cashRequestData.pendingFormData?.applicantName || formData.applicantName}
          applicantPhone={cashRequestData.pendingFormData?.applicantPhone || formData.applicantPhone}
          applicantEmail={(cashRequestData.pendingFormData?.applicantEmail || formData.applicantEmail) || undefined}
          failureReason={cashRequestData.failureReason}
          serviceDetails={{
            eventType: cashRequestData.pendingFormData?.eventType || formData.eventType,
            eventDate: cashRequestData.pendingFormData?.eventDate || formData.eventDate,
            startTime: cashRequestData.pendingFormData?.startTime || formData.startTime,
            endTime: cashRequestData.pendingFormData?.endTime || formData.endTime,
            expectedGuests: cashRequestData.pendingFormData?.expectedGuests || formData.expectedGuests,
            specialRequirements: cashRequestData.pendingFormData?.specialRequirements || formData.specialRequirements,
            selectedServices: Object.entries(cashRequestData.pendingServices || selectedServices)
              .filter(([_, v]) => v)
              .map(([k]) => k),
          }}
          onBeforeSubmit={async () => {
            // Create booking only when user actually submits the cash request
            const fd = cashRequestData.pendingFormData || formData;
            const ss = cashRequestData.pendingServices || selectedServices;
            const totalAmount = services.reduce((total, service) => {
              return ss[service.id as keyof typeof ss] ? total + service.rate : total;
            }, 0);
            
            const rpcName = isAdminOverride ? "create_mahal_booking_admin_override" : "create_mahal_booking";
            const { data: bookingId, error } = await supabase.rpc(rpcName, {
              _applicant_name: fd.applicantName,
              _applicant_phone: fd.applicantPhone,
              _applicant_email: fd.applicantEmail || null,
              _event_type: fd.eventType,
              _event_date: fd.eventDate,
              _start_time: fd.startTime,
              _end_time: fd.endTime,
              _expected_guests: fd.expectedGuests ? parseInt(fd.expectedGuests) : null,
              _special_requirements: fd.specialRequirements || null,
              _booking_amount: totalAmount,
            });
            
            if (error) {
              throw error;
            }
            
            // Update cashRequestData with the new booking ID
            setCashRequestData(prev => prev ? { ...prev, bookingId: bookingId || "" } : null);
            
            return bookingId || "";
          }}
          onSuccess={() => {
            setCashRequestData(null);
            // Scroll to top and reload page to refresh all data including availability calendar
            window.scrollTo(0, 0);
            if ('scrollRestoration' in history) {
              history.scrollRestoration = 'manual';
            }
            window.location.reload();
          }}
        />
      )}

      {/* OTP Verification Dialog */}
      <OTPVerificationDialog
        open={showOTPDialog}
        onClose={() => {
          setShowOTPDialog(false);
          setOtpVerified(false);
        }}
        onVerified={() => {
          setShowOTPDialog(false);
          setOtpVerified(true);
          // After OTP verification, show confirmation dialog
          setShowConfirmDialog(true);
        }}
        phone={formData.applicantPhone}
        email={formData.applicantEmail || undefined}
        recipientName={formData.applicantName}
      />
    </div>
    </>
  );
};


export default MahalBookingPage;
