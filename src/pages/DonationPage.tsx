import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, User, Phone, CreditCard, Loader2, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useUserRole } from "@/hooks/useUserRole";
import { z } from "zod";
import SubscriptionReceipt from "@/components/SubscriptionReceipt";
import DonationReceipt from "@/components/DonationReceipt";
import CashPaymentRequestDialog from "@/components/CashPaymentRequestDialog";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const MONTHS = [
  { value: "01", label: "January / ஜனவரி" },
  { value: "02", label: "February / பிப்ரவரி" },
  { value: "03", label: "March / மார்ச்" },
  { value: "04", label: "April / ஏப்ரல்" },
  { value: "05", label: "May / மே" },
  { value: "06", label: "June / ஜூன்" },
  { value: "07", label: "July / ஜூலை" },
  { value: "08", label: "August / ஆகஸ்ட்" },
  { value: "09", label: "September / செப்டம்பர்" },
  { value: "10", label: "October / அக்டோபர்" },
  { value: "11", label: "November / நவம்பர்" },
  { value: "12", label: "December / டிசம்பர்" },
];

// Predefined donation purposes in Tamil
const DONATION_PURPOSES = [
  { value: "Nonbu Kanji", label: "நோன்புக் கஞ்சி" },
  { value: "General Donation", label: "பொது நன்கொடை" },
  { value: "Zakat", label: "ஜக்காத்" },
  { value: "Sadaqah", label: "ஸதக்கா" },
  { value: "Fitrah", label: "ஃபித்ரா" },
  { value: "Mosque Maintenance", label: "பள்ளிவாசல் பராமரிப்பு" },
  { value: "Building Fund", label: "கட்டிட நிதி" },
  { value: "Mahal Construction", label: "மஹால் கட்டுமானம்" },
  { value: "Ramadan Fund", label: "ரமலான் நிதி" },
  { value: "Eid Fund", label: "பெருநாள் நிதி" },
  { value: "Education Fund", label: "கல்வி நிதி" },
  { value: "Orphan Support", label: "அநாதை உதவி" },
  { value: "Widow Support", label: "விதவை உதவி" },
  { value: "Medical Aid", label: "மருத்துவ உதவி" },
  { value: "Food Distribution", label: "உணவு விநியோகம்" },
  { value: "Imam Salary", label: "இமாம் சம்பளம்" },
  { value: "Muazzin Salary", label: "முஅத்தின் சம்பளம்" },
  { value: "Staff Salary", label: "ஊழியர் சம்பளம்" },
  { value: "Electricity Bill", label: "மின்சார கட்டணம்" },
  { value: "Quran Classes", label: "குர்ஆன் வகுப்புகள்" },
  { value: "Islamic Education", label: "இஸ்லாமிய கல்வி" },
  { value: "Funeral Expenses", label: "இறுதி சடங்கு செலவுகள்" },
  { value: "Marriage Support", label: "திருமண உதவி" },
  { value: "Renovation", label: "புனரமைப்பு" },
  { value: "Other", label: "மற்றவை" },
];

const createDonationSchema = (isAnonymous: boolean) => z.object({
  donorName: isAnonymous 
    ? z.string().optional() 
    : z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  donationAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be positive"),
});

const subscriptionSchema = z.object({
  subscriberName: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
});

const SubscriptionForm = () => {
  const { settings, isLoading: settingsLoading } = useAppSettings();
  const forcePendingEnabled = (settings?.force_pending_subscription || "false") === "true";
  const { isAdmin } = useUserRole();
  const [membershipNumber, setMembershipNumber] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberAddress, setMemberAddress] = useState("");
  const [memberFound, setMemberFound] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState("monthly");
  const [numberOfMonths, setNumberOfMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSubscription, setCompletedSubscription] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");
  const [paidMonthsWarning, setPaidMonthsWarning] = useState<string[]>([]);
  const [validatingMonths, setValidatingMonths] = useState(false);
  const [showCashRequestDialog, setShowCashRequestDialog] = useState(false);
  const [pendingMonths, setPendingMonths] = useState<{ year: number; month: number }[]>([]);
  const [pendingMonthsLoading, setPendingMonthsLoading] = useState(false);
  // hasForcedPending: only lock the form when config is ON and pending months exist
  const hasForcedPending = forcePendingEnabled && pendingMonths.length > 0;
  const [cashRequestData, setCashRequestData] = useState<{
    subscriptionId?: string;
    amount: number;
    failureReason?: string;
  } | null>(null);
  const [yearlyPaidMonths, setYearlyPaidMonths] = useState<number>(0);
  const [yearlyPaidAmount, setYearlyPaidAmount] = useState<number>(0);
  const [yearlyCheckLoading, setYearlyCheckLoading] = useState(false);
  
  // Period fields
  const currentDate = new Date();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
  const currentYear = currentDate.getFullYear();
  
  const [fromMonth, setFromMonth] = useState(currentMonth);
  const [fromYear, setFromYear] = useState(String(currentYear));
  const [subscriptionYear, setSubscriptionYear] = useState(String(currentYear));

  const monthlyAmount = parseFloat(settings?.subscription_monthly_amount || "100");
  const yearlyAmount = parseFloat(settings?.subscription_yearly_amount || "1000");

  const totalAmount = subscriptionType === "monthly" 
    ? monthlyAmount * numberOfMonths 
    : Math.max(0, yearlyAmount - yearlyPaidAmount);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Check already paid months when yearly subscription year changes
  useEffect(() => {
    const checkYearlyPaidMonths = async () => {
      if (!memberFound || !membershipNumber.trim() || subscriptionType !== "yearly") {
        setYearlyPaidMonths(0);
        setYearlyPaidAmount(0);
        return;
      }

      setYearlyCheckLoading(true);
      try {
        const year = parseInt(subscriptionYear);
        const { data: paidSlots, error } = await supabase
          .from("subscription_slots")
          .select("year, month, amount")
          .eq("member_id", membershipNumber.trim())
          .eq("is_paid", true)
          .eq("year", year);

        if (error) {
          console.error("Error checking yearly paid months:", error);
          setYearlyPaidMonths(0);
          setYearlyPaidAmount(0);
          return;
        }

        const paidCount = paidSlots?.length || 0;
        const paidTotal = paidCount * monthlyAmount;
        setYearlyPaidMonths(paidCount);
        setYearlyPaidAmount(paidTotal);
      } catch (error) {
        console.error("Error checking yearly paid months:", error);
        setYearlyPaidMonths(0);
        setYearlyPaidAmount(0);
      } finally {
        setYearlyCheckLoading(false);
      }
    };

    const timeoutId = setTimeout(checkYearlyPaidMonths, 300);
    return () => clearTimeout(timeoutId);
  }, [memberFound, membershipNumber, subscriptionYear, subscriptionType, monthlyAmount]);

  // Calculate end month/year based on from date and number of months
  const endPeriod = useMemo(() => {
    const startMonth = parseInt(fromMonth);
    const startYear = parseInt(fromYear);
    const endMonthTotal = startMonth + numberOfMonths - 1;
    const endMonth = ((endMonthTotal - 1) % 12) + 1;
    const endYear = startYear + Math.floor((endMonthTotal - 1) / 12);
    return {
      month: String(endMonth).padStart(2, "0"),
      year: String(endYear),
      label: `${MONTHS[endMonth - 1]?.label.split(" / ")[0]} ${endYear}`
    };
  }, [fromMonth, fromYear, numberOfMonths]);

  // Generate year options (current year - 1 to current year + 2)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
      years.push(String(y));
    }
    return years;
  }, [currentYear]);

  // Check if any months in the selected range are already paid
  const checkAlreadyPaidMonths = async (memberId: string): Promise<{ hasPaidMonths: boolean; paidMonths: string[]; paidCount?: number }> => {
    if (subscriptionType !== "monthly") {
      return { hasPaidMonths: false, paidMonths: [], paidCount: 0 };
    }

    const startMonth = parseInt(fromMonth);
    const startYear = parseInt(fromYear);
    const monthsToCheck: { year: number; month: number }[] = [];

    // Generate all months in the range
    for (let i = 0; i < numberOfMonths; i++) {
      const totalMonths = startMonth + i;
      const month = ((totalMonths - 1) % 12) + 1;
      const year = startYear + Math.floor((totalMonths - 1) / 12);
      monthsToCheck.push({ year, month });
    }

    // Query subscription_slots for these months
    const { data: paidSlots, error } = await supabase
      .from("subscription_slots")
      .select("year, month")
      .eq("member_id", memberId)
      .eq("is_paid", true)
      .in("year", [...new Set(monthsToCheck.map(m => m.year))])
      .in("month", [...new Set(monthsToCheck.map(m => m.month))]);

    if (error) {
      console.error("Error checking paid months:", error);
      return { hasPaidMonths: false, paidMonths: [] };
    }

    // Find which selected months are already paid
    const paidMonthsList: string[] = [];
    for (const slot of paidSlots || []) {
      const isInRange = monthsToCheck.some(m => m.year === slot.year && m.month === slot.month);
      if (isInRange) {
        const monthName = MONTHS[slot.month - 1]?.label.split(" / ")[0];
        paidMonthsList.push(`${monthName} ${slot.year}`);
      }
    }

    return { hasPaidMonths: paidMonthsList.length > 0, paidMonths: paidMonthsList };
  };

  // Real-time validation: check paid months when member/period changes
  useEffect(() => {
    const validateMonths = async () => {
      if (!memberFound || !membershipNumber.trim() || subscriptionType !== "monthly") {
        setPaidMonthsWarning([]);
        return;
      }

      setValidatingMonths(true);
      try {
        const { paidMonths } = await checkAlreadyPaidMonths(membershipNumber.trim());
        setPaidMonthsWarning(paidMonths);
      } catch (error) {
        console.error("Error validating months:", error);
        setPaidMonthsWarning([]);
      } finally {
        setValidatingMonths(false);
      }
    };

    // Debounce the validation
    const timeoutId = setTimeout(validateMonths, 300);
    return () => clearTimeout(timeoutId);
  }, [memberFound, membershipNumber, fromMonth, fromYear, numberOfMonths, subscriptionType]);

  // Check for pending (unpaid) months for a member
  const checkPendingMonths = async (memberId: string) => {
    setPendingMonthsLoading(true);
    try {
      const now = new Date();
      const curMonth = now.getMonth() + 1;
      const curYear = now.getFullYear();

      // Get subscription start config (default to Jan of current year if not set)
      const { data: startSettings } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["subscription_start_month", "subscription_start_year"]);

      let startMonth = 1;
      let startYear = curYear;
      if (startSettings) {
        for (const s of startSettings) {
          if (s.key === "subscription_start_month") startMonth = parseInt(s.value) || 1;
          if (s.key === "subscription_start_year") startYear = parseInt(s.value) || curYear;
        }
      }

      // Generate all months from start to current month
      const allMonths: { year: number; month: number }[] = [];
      let iterYear = startYear;
      let iterMonth = startMonth;
      while (iterYear < curYear || (iterYear === curYear && iterMonth <= curMonth)) {
        allMonths.push({ year: iterYear, month: iterMonth });
        iterMonth++;
        if (iterMonth > 12) {
          iterMonth = 1;
          iterYear++;
        }
      }

      if (allMonths.length === 0) {
        setPendingMonths([]);
        return;
      }

      // Fetch paid slots for the member
      const { data: paidSlots } = await supabase
        .from("subscription_slots")
        .select("year, month")
        .eq("member_id", memberId)
        .eq("is_paid", true);

      const paidSet = new Set(
        (paidSlots || []).map((s) => `${s.year}-${s.month}`)
      );

      const unpaid = allMonths.filter(
        (m) => !paidSet.has(`${m.year}-${m.month}`)
      );

      setPendingMonths(unpaid);

      // Auto-set form to pay pending months first (only if force setting is ON)
      if (forcePendingEnabled && unpaid.length > 0) {
        setFromMonth(String(unpaid[0].month).padStart(2, "0"));
        setFromYear(String(unpaid[0].year));
        setNumberOfMonths(unpaid.length);
        setSubscriptionType("monthly");
      }
    } catch (error) {
      console.error("Error checking pending months:", error);
      setPendingMonths([]);
    } finally {
      setPendingMonthsLoading(false);
    }
  };

  // Lookup member by membership number
  const handleMemberLookup = async () => {
    if (!membershipNumber.trim()) {
      toast({
        title: "பிழை / Error",
        description: "Please enter a membership number",
        variant: "destructive",
      });
      return;
    }

    setLookupLoading(true);
    setMemberFound(false);
    setMemberName("");
    setMemberPhone("");
    setMemberAddress("");
    setPendingMonths([]);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("validate-member", {
        body: { memberId: membershipNumber.trim() },
      });

      if (fnError) throw fnError;

      if (fnData?.found) {
        setMemberName(fnData.full_name);
        setMemberPhone(fnData.phone);
        setMemberAddress(fnData.address || "");
        setMemberFound(true);
        toast({
          title: "உறுப்பினர் கண்டறியப்பட்டது / Member Found",
          description: `Welcome, ${fnData.full_name}!`,
        });
        // Check for pending months after finding member
        await checkPendingMonths(membershipNumber.trim());
      } else {
        toast({
          title: "உறுப்பினர் கிடைக்கவில்லை / Member Not Found",
          description: "No active member found with this membership number",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "பிழை / Error",
        description: error.message || "Failed to lookup member",
        variant: "destructive",
      });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!memberFound) {
      toast({
        title: "பிழை / Validation Error",
        description: "Please enter a valid membership number and lookup member details first",
        variant: "destructive",
      });
      return;
    }

    // For cash payments, skip Razorpay check
    if (!(isAdmin && paymentMethod === "cash") && !razorpayLoaded) {
      toast({
        title: "பிழை / Error",
        description: "Payment gateway is loading. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    let createdSubscriptionId: string | undefined;

    try {
      // Check if any months are already paid in subscription_slots
      if (subscriptionType === "monthly") {
        const { hasPaidMonths, paidMonths } = await checkAlreadyPaidMonths(membershipNumber.trim());
        if (hasPaidMonths) {
          toast({
            title: "ஏற்கனவே செலுத்தப்பட்டது / Already Paid",
            description: `Subscription for the following month(s) is already paid: ${paidMonths.join(", ")}. Please select different months.`,
            variant: "destructive",
          });
          // Reset month selection to current month
          setFromMonth(currentMonth);
          setFromYear(String(currentYear));
          setNumberOfMonths(1);
          setLoading(false);
          return;
        }
      }

      const fromMonthNum = parseInt(fromMonth);
      const toMonthNum = parseInt(endPeriod.month);
      const fromYearNum = parseInt(fromYear);
      const toYearNum = parseInt(endPeriod.year);
      
      // For cash payments (admin only), record directly without Razorpay
      if (isAdmin && paymentMethod === "cash") {
        const { data: subscriptionData, error: insertError } = await supabase.from("subscriptions").insert({
          member_id: membershipNumber.trim(),
          member_name: memberName,
          member_phone: memberPhone,
          member_address: memberAddress || null,
          subscription_type: subscriptionType,
          amount: subscriptionType === "monthly" ? monthlyAmount : yearlyAmount,
          total_amount: totalAmount,
          from_month: subscriptionType === "monthly" ? fromMonthNum : null,
          from_year: subscriptionType === "monthly" ? fromYearNum : null,
          to_month: subscriptionType === "monthly" ? toMonthNum : null,
          to_year: subscriptionType === "monthly" ? toYearNum : null,
          number_of_months: subscriptionType === "monthly" ? numberOfMonths : null,
          subscription_year: subscriptionType === "yearly" ? parseInt(subscriptionYear) : null,
          payment_status: "completed",
          payment_method: "Cash",
          transaction_id: `CASH-${Date.now()}`,
        }).select().single();

        if (insertError) throw insertError;

        setCompletedSubscription(subscriptionData);
        setShowReceipt(true);

        const fromMonthName = MONTHS[fromMonthNum - 1]?.label.split(" / ")[0];
        const toMonthName = MONTHS[toMonthNum - 1]?.label.split(" / ")[0];

        toast({
          title: "சந்தா பதிவு செய்யப்பட்டது! / Subscription Recorded!",
          description: subscriptionType === "monthly"
            ? `Cash payment for ${fromMonthName} ${fromYear} to ${toMonthName} ${endPeriod.year} (₹${totalAmount}) recorded`
            : `Cash payment for yearly subscription ${subscriptionYear} (₹${totalAmount}) recorded`,
        });

        // Reset form
        setMembershipNumber("");
        setMemberName("");
        setMemberPhone("");
        setMemberAddress("");
        setMemberFound(false);
        setPendingMonths([]);
        setSubscriptionType("monthly");
        setNumberOfMonths(1);
        setFromMonth(currentMonth);
        setFromYear(String(currentYear));
        setSubscriptionYear(String(currentYear));
        setPaymentMethod("online");
        setLoading(false);
        return;
      }
      
      // First, create subscription record with pending status
      const { data: subscriptionData, error: insertError } = await supabase.from("subscriptions").insert({
        member_id: membershipNumber.trim(),
        member_name: memberName,
        member_phone: memberPhone,
        member_address: memberAddress || null,
        subscription_type: subscriptionType,
        amount: subscriptionType === "monthly" ? monthlyAmount : yearlyAmount,
        total_amount: totalAmount,
        from_month: subscriptionType === "monthly" ? fromMonthNum : null,
        from_year: subscriptionType === "monthly" ? fromYearNum : null,
        to_month: subscriptionType === "monthly" ? toMonthNum : null,
        to_year: subscriptionType === "monthly" ? toYearNum : null,
        number_of_months: subscriptionType === "monthly" ? numberOfMonths : null,
        subscription_year: subscriptionType === "yearly" ? parseInt(subscriptionYear) : null,
        payment_status: "pending",
        payment_method: "Online",
      }).select().single();

      if (insertError) throw insertError;
      createdSubscriptionId = subscriptionData.id;

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount: totalAmount,
          subscriptionId: subscriptionData.id,
          type: "subscription",
          notes: {
            subscriptionId: subscriptionData.id,
            memberName: memberName,
            memberPhone: memberPhone,
            subscriptionType: subscriptionType,
          },
        },
      });

      if (orderError || orderData?.error) {
        // Don't delete - keep for cash payment fallback
        const failReason = orderData?.error || orderError?.message || "Payment gateway unavailable";
        setCashRequestData({
          subscriptionId: subscriptionData.id,
          amount: totalAmount,
          failureReason: failReason,
        });
        setShowCashRequestDialog(true);
        setLoading(false);
        return;
      }

      const fromMonthName = MONTHS[fromMonthNum - 1]?.label.split(" / ")[0];
      const toMonthName = MONTHS[toMonthNum - 1]?.label.split(" / ")[0];
      const periodDescription = subscriptionType === "monthly"
        ? `${fromMonthName} ${fromYear} to ${toMonthName} ${endPeriod.year}`
        : `Year ${subscriptionYear}`;

      // Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: settings?.mosque_name_english || "Ilaiyankudi Pallivasal",
        description: `Subscription: ${periodDescription}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("create-razorpay-order?action=verify", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                subscriptionId: subscriptionData.id,
                type: "subscription",
              },
            });

            if (verifyError || !verifyData?.verified) {
              throw new Error("Payment verification failed");
            }

            // Fetch the updated subscription for receipt
            const { data: updatedSubscription } = await supabase
              .from("subscriptions")
              .select("*")
              .eq("id", subscriptionData.id)
              .single();

            if (updatedSubscription) {
              setCompletedSubscription(updatedSubscription);
              setShowReceipt(true);
            }

            toast({
              title: "பணம் செலுத்தப்பட்டது! / Payment Successful!",
              description: subscriptionType === "monthly"
                ? `Subscription from ${fromMonthName} ${fromYear} to ${toMonthName} ${endPeriod.year} (₹${totalAmount}) completed`
                : `Yearly subscription for ${subscriptionYear} (₹${totalAmount}) completed`,
            });

            // Reset form
            setMembershipNumber("");
            setMemberName("");
            setMemberPhone("");
            setMemberAddress("");
            setMemberFound(false);
            setPendingMonths([]);
            setSubscriptionType("monthly");
            setNumberOfMonths(1);
            setFromMonth(currentMonth);
            setFromYear(String(currentYear));
            setSubscriptionYear(String(currentYear));
          } catch (error: any) {
            toast({
              title: "பிழை / Error",
              description: error.message || "Payment verification failed",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: memberName,
          contact: memberPhone,
        },
        theme: {
          color: "#16a34a",
        },
        modal: {
          ondismiss: async function () {
            // Don't delete the subscription - keep it for cash payment request
            toast({
              title: "ரத்து செய்யப்பட்டது / Cancelled",
              description: "Payment was cancelled. You can request cash payment.",
              variant: "destructive",
            });
            // Offer cash payment request
            setCashRequestData({
              subscriptionId: subscriptionData.id,
              amount: totalAmount,
              failureReason: "Payment cancelled by user",
            });
            setShowCashRequestDialog(true);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        setCashRequestData({
          subscriptionId: subscriptionData.id,
          amount: totalAmount,
          failureReason: response.error?.description || response.error?.reason || "Payment failed",
        });
        setShowCashRequestDialog(true);
      });
      razorpay.open();
    } catch (error: any) {
      // Offer cash payment request on error
      setCashRequestData({
        subscriptionId: createdSubscriptionId,
        amount: totalAmount,
        failureReason: error.message || "Payment initiation failed",
      });
      setShowCashRequestDialog(true);
    } finally {
      setLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <Card className="shadow-medium">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {showReceipt && completedSubscription && (
        <SubscriptionReceipt
          subscription={completedSubscription}
          onClose={() => {
            setShowReceipt(false);
            setCompletedSubscription(null);
          }}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="font-tamil text-xl">
            மாத / வருட சந்தா
          </CardTitle>
          <CardDescription>
            Monthly / Yearly Subscription Payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubscriptionSubmit} className="space-y-6">
            {/* Membership Number Lookup - First Field */}
            <div className="space-y-3">
              <Label htmlFor="membership-number" className="font-tamil">உறுப்பினர் எண் * (Membership Number)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="membership-number"
                    placeholder="Enter Membership Number"
                    className="pl-10"
                    value={membershipNumber}
                    onChange={(e) => {
                      setMembershipNumber(e.target.value);
                      setMemberFound(false);
                      setMemberName("");
                      setMemberPhone("");
                      setMemberAddress("");
                      setPendingMonths([]);
                    }}
                    required
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleMemberLookup}
                  disabled={lookupLoading || !membershipNumber.trim()}
                >
                  {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
                </Button>
              </div>
            </div>

            {/* Member Details (Read-only) */}
            {memberFound && (
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 space-y-3">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                  <User className="h-4 w-4" />
                  <span className="font-tamil">உறுப்பினர் விவரங்கள் / Member Details</span>
                </div>
                <div className="grid gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">பெயர் / Name</Label>
                    <p className="font-medium">{memberName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">கைபேசி / Phone</Label>
                    <p className="font-medium">{memberPhone}</p>
                  </div>
                  {memberAddress && (
                    <div>
                      <Label className="text-xs text-muted-foreground">முகவரி / Address</Label>
                      <p className="font-medium">{memberAddress}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending Months Warning */}
            {memberFound && pendingMonthsLoading && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-tamil">நிலுவை மாதங்களை சரிபார்க்கிறது... / Checking pending months...</span>
              </div>
            )}
            {memberFound && !pendingMonthsLoading && pendingMonths.length > 0 && forcePendingEnabled && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300 font-tamil">
                      ⚠️ நிலுவை சந்தா உள்ளது / Pending Subscription
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 font-tamil">
                      முதலில் நிலுவை மாதங்களை செலுத்த வேண்டும். / You must pay pending months first.
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      <strong>Pending months ({pendingMonths.length}):</strong>{" "}
                      {pendingMonths.map(m => `${MONTHS[m.month - 1]?.label.split(" / ")[0]} ${m.year}`).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Type Selection */}
            <div className="space-y-3">
              <Label className="font-tamil">சந்தா வகை *</Label>
              <RadioGroup
                value={subscriptionType}
                onValueChange={(val) => {
                  if (hasForcedPending) return;
                  setSubscriptionType(val);
                  if (val === "yearly") setNumberOfMonths(1);
                }}
                className="grid grid-cols-2 gap-4"
                disabled={hasForcedPending}
              >
                <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${hasForcedPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${subscriptionType === "monthly" ? "border-primary bg-primary/5" : "border-muted"}`}>
                  <RadioGroupItem value="monthly" id="monthly" disabled={hasForcedPending} />
                  <Label htmlFor="monthly" className={`flex-1 ${hasForcedPending ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <div className="font-tamil font-medium">மாத சந்தா</div>
                    <div className="text-sm text-muted-foreground">Monthly</div>
                    <div className="text-lg font-bold text-primary mt-1">₹{monthlyAmount}/month</div>
                  </Label>
                </div>
                <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${hasForcedPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${subscriptionType === "yearly" ? "border-primary bg-primary/5" : "border-muted"}`}>
                  <RadioGroupItem value="yearly" id="yearly" disabled={hasForcedPending} />
                  <Label htmlFor="yearly" className={`flex-1 ${hasForcedPending ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <div className="font-tamil font-medium">வருட சந்தா</div>
                    <div className="text-sm text-muted-foreground">Yearly</div>
                    <div className="text-lg font-bold text-primary mt-1">₹{yearlyAmount}</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Monthly subscription period selection */}
            {subscriptionType === "monthly" && (
              <>
                {/* From Period */}
                <div className="space-y-3">
                  <Label className="font-tamil">
                    தொடக்க காலம் * (From Period)
                    {hasForcedPending && <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">(Auto-set to pending months)</span>}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={fromMonth} onValueChange={setFromMonth} disabled={hasForcedPending}>
                      <SelectTrigger className={hasForcedPending ? "opacity-60" : ""}>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={fromYear} onValueChange={setFromYear} disabled={hasForcedPending}>
                      <SelectTrigger className={hasForcedPending ? "opacity-60" : ""}>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Number of Months */}
                <div className="space-y-3">
                  <Label className="font-tamil">
                    மாதங்களின் எண்ணிக்கை * (Number of Months)
                    {hasForcedPending && <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">(Fixed to {pendingMonths.length} pending months)</span>}
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center border rounded-lg ${hasForcedPending ? "opacity-60" : ""}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNumberOfMonths(Math.max(1, numberOfMonths - 1))}
                        className="h-10 px-3"
                        disabled={hasForcedPending}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={numberOfMonths}
                        onChange={(e) => setNumberOfMonths(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                        className="w-16 text-center border-0 focus-visible:ring-0"
                        disabled={hasForcedPending}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNumberOfMonths(Math.min(12, numberOfMonths + 1))}
                        className="h-10 px-3"
                        disabled={hasForcedPending}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Period Summary */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground font-tamil">காலம் / Period</p>
                      <p className="font-medium">
                        {MONTHS[parseInt(fromMonth) - 1]?.label.split(" / ")[0]} {fromYear} → {endPeriod.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">₹{monthlyAmount} × {numberOfMonths}</p>
                      <p className="text-xl font-bold text-primary">₹{totalAmount}</p>
                    </div>
                  </div>
                </div>

                {/* Already Paid Warning */}
                {validatingMonths && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Checking payment status...</span>
                  </div>
                )}
                {!validatingMonths && paidMonthsWarning.length > 0 && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        <svg className="h-5 w-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-destructive font-tamil">
                          ஏற்கனவே செலுத்தப்பட்டது / Already Paid
                        </p>
                        <p className="text-sm text-destructive/80 mt-1">
                          The following month(s) are already paid: <strong>{paidMonthsWarning.join(", ")}</strong>
                        </p>
                        <p className="text-sm text-destructive/80 mt-1 font-tamil">
                          தயவுசெய்து வேறு மாதங்களைத் தேர்ந்தெடுக்கவும்.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Yearly subscription year selection */}
            {subscriptionType === "yearly" && (
              <div className="space-y-3">
                <Label className="font-tamil">வருடம் * (Year)</Label>
                <Select value={subscriptionYear} onValueChange={setSubscriptionYear}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {yearlyCheckLoading && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground font-tamil">ஏற்கனவே செலுத்திய மாதங்களை சரிபார்க்கிறது... / Checking paid months...</span>
                  </div>
                )}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground font-tamil">வருடம் / Year</p>
                        <p className="font-medium">{subscriptionYear}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">வருட சந்தா / Yearly</p>
                        <p className={`text-lg font-bold ${yearlyPaidMonths > 0 ? "line-through text-muted-foreground" : "text-primary"}`}>₹{yearlyAmount}</p>
                      </div>
                    </div>
                    {yearlyPaidMonths > 0 && (
                      <>
                        <div className="border-t border-primary/20 pt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground font-tamil">
                              ஏற்கனவே செலுத்தியது / Already Paid ({yearlyPaidMonths} month{yearlyPaidMonths > 1 ? "s" : ""})
                            </span>
                            <span className="text-muted-foreground">- ₹{yearlyPaidAmount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium font-tamil">இருப்பு / Balance</span>
                            <span className="text-xl font-bold text-primary">₹{totalAmount}</span>
                          </div>
                        </div>
                        {totalAmount === 0 && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                            <p className="text-sm text-green-700 dark:text-green-400 font-tamil">
                              ✅ இந்த வருடத்திற்கான சந்தா முழுமையாக செலுத்தப்பட்டுள்ளது / Subscription fully paid for this year.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {yearlyPaidMonths === 0 && !yearlyCheckLoading && (
                      <div className="flex justify-between items-center border-t border-primary/20 pt-3">
                        <span className="font-medium font-tamil">மொத்தம் / Total</span>
                        <span className="text-xl font-bold text-primary">₹{totalAmount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selector (Admin Only) */}
            {isAdmin && (
              <div className="p-4 bg-muted rounded-lg border-2 border-dashed border-primary/30">
                <Label className="font-tamil text-sm font-medium mb-3 block">
                  கட்டண முறை (Admin Only)
                </Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="subscriptionPaymentMethod"
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
                      name="subscriptionPaymentMethod"
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
                    Cash payments will be recorded directly without payment processing.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                type="submit" 
                variant="gold" 
                size="lg" 
                className="flex-1 min-w-0" 
                disabled={loading || !memberFound || (!(isAdmin && paymentMethod === "cash") && !razorpayLoaded) || (subscriptionType === "monthly" && paidMonthsWarning.length > 0) || validatingMonths}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2 shrink-0" />
                    <span className="font-tamil truncate">₹{totalAmount} செலுத்து / Pay</span>
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" size="lg" className="shrink-0" onClick={() => {
                setMembershipNumber("");
                setMemberName("");
                setMemberPhone("");
                setMemberAddress("");
                setMemberFound(false);
                setPendingMonths([]);
              }}>
                <span className="font-tamil">ரத்துசெய் / Cancel</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cash Payment Request Dialog for Subscription */}
      {cashRequestData && (
        <CashPaymentRequestDialog
          open={showCashRequestDialog}
          onOpenChange={setShowCashRequestDialog}
          serviceType="subscription"
          referenceId={cashRequestData.subscriptionId}
          amount={cashRequestData.amount}
          applicantName={memberName}
          applicantPhone={memberPhone}
          failureReason={cashRequestData.failureReason}
          serviceDetails={{
            memberId: membershipNumber,
            subscriptionType,
            numberOfMonths,
            fromMonth,
            fromYear,
            subscriptionYear,
          }}
          onSuccess={() => {
            setCashRequestData(null);
            setMembershipNumber("");
            setMemberName("");
            setMemberPhone("");
            setMemberAddress("");
            setMemberFound(false);
          }}
        />
      )}
    </motion.div>
    </>
  );
};

const DonationPage = () => {
  const { isAdmin } = useUserRole();
  const { settings, isLoading: settingsLoading } = useAppSettings();
  const [donorName, setDonorName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [showDonationReceipt, setShowDonationReceipt] = useState(false);
  const [donationReceiptData, setDonationReceiptData] = useState<{
    donorName: string;
    donorPhone: string;
    donorEmail?: string;
    amount: number;
    purpose: string;
    receiptNumber: string;
    paymentMethod: string;
    isAnonymous: boolean;
    createdAt: string;
  } | null>(null);
  const [showCashRequestDialog, setShowCashRequestDialog] = useState(false);
  const [cashRequestData, setCashRequestData] = useState<{
    donationId?: string;
    amount: number;
    failureReason?: string;
  } | null>(null);

  // Membership lookup states for donation form
  const [donationMembershipNumber, setDonationMembershipNumber] = useState("");
  const [donationMemberLookupLoading, setDonationMemberLookupLoading] = useState(false);
  const [donationMemberFound, setDonationMemberFound] = useState(false);

  // Nonbu Kanji sub-category states
  const [kanjiSaathak, setKanjiSaathak] = useState(false);
  const [kanjiSirappu, setKanjiSirappu] = useState(false);

  const saathakAmount = parseFloat(settings?.nonbu_kanji_saathak_amount || "500");
  const sirappuAmount = parseFloat(settings?.nonbu_kanji_sirappu_amount || "1000");

  const isNonbuKanji = purpose === "Nonbu Kanji";

  // Auto-calculate amount when kanji selections change
  useEffect(() => {
    if (isNonbuKanji) {
      let total = 0;
      if (kanjiSaathak) total += saathakAmount;
      if (kanjiSirappu) total += sirappuAmount;
      setDonationAmount(total > 0 ? String(total) : "");
    }
  }, [kanjiSaathak, kanjiSirappu, isNonbuKanji, saathakAmount, sirappuAmount]);

  // Reset kanji selections when purpose changes away from Nonbu Kanji
  useEffect(() => {
    if (!isNonbuKanji) {
      setKanjiSaathak(false);
      setKanjiSirappu(false);
    }
  }, [isNonbuKanji]);

  const handleDonationMemberLookup = async () => {
    if (!donationMembershipNumber.trim()) {
      toast({
        title: "பிழை / Error",
        description: "Please enter a membership number",
        variant: "destructive",
      });
      return;
    }

    setDonationMemberLookupLoading(true);
    setDonationMemberFound(false);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("validate-member", {
        body: { memberId: donationMembershipNumber.trim() },
      });

      if (fnError) throw fnError;

      if (fnData?.found) {
        setDonorName(fnData.full_name || "");
        setPhone(fnData.phone || "");
        setEmail(fnData.email || "");
        setAddress(fnData.address || "");
        setDonationMemberFound(true);
        toast({
          title: "உறுப்பினர் கண்டறியப்பட்டது / Member Found",
          description: `Details auto-filled for ${fnData.full_name}`,
        });
      } else {
        toast({
          title: "உறுப்பினர் கிடைக்கவில்லை / Member Not Found",
          description: "No active member found with this membership number",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "பிழை / Error",
        description: error.message || "Failed to lookup member",
        variant: "destructive",
      });
    } finally {
      setDonationMemberLookupLoading(false);
    }
  };

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const generateReceiptNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `DON-${dateStr}-${random}`;
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Nonbu Kanji selection
    if (isNonbuKanji && !kanjiSaathak && !kanjiSirappu) {
      toast({
        title: "பிழை / Validation Error",
        description: "Please select at least one kanji type (சாதாக் கஞ்சி or சிறப்புக் கஞ்சி)",
        variant: "destructive",
      });
      return;
    }

    // Validate
    const donationSchema = createDonationSchema(isAnonymous);
    const result = donationSchema.safeParse({ donorName: isAnonymous ? undefined : donorName, phone, donationAmount });
    if (!result.success) {
      toast({
        title: "பிழை / Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    // For cash payments, skip Razorpay check
    if (!(isAdmin && paymentMethod === "cash") && !razorpayLoaded) {
      toast({
        title: "பிழை / Error",
        description: "Payment gateway is loading. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const receiptNum = generateReceiptNumber();
      let donationPurpose = purpose || "General Donation";
      if (isNonbuKanji) {
        const types = [];
        if (kanjiSaathak) types.push("சாதாக் கஞ்சி");
        if (kanjiSirappu) types.push("சிறப்புக் கஞ்சி");
        donationPurpose = `Nonbu Kanji - ${types.join(" + ")}`;
      }
      const amount = parseFloat(donationAmount);

      // For cash payments (admin only), record directly without Razorpay
      if (isAdmin && paymentMethod === "cash") {
        const { error } = await supabase.from("donations").insert({
          donor_name: isAnonymous ? "Anonymous" : donorName,
          donor_phone: phone,
          donor_email: email || null,
          donor_address: address || null,
          amount: amount,
          purpose: donationPurpose,
          is_anonymous: isAnonymous,
          receipt_number: receiptNum,
          payment_method: "Cash",
          payment_status: "completed",
        });

        if (error) throw error;

        // Show receipt
        setDonationReceiptData({
          donorName: isAnonymous ? "Anonymous" : donorName,
          donorPhone: phone,
          donorEmail: email || undefined,
          amount: amount,
          purpose: donationPurpose,
          receiptNumber: receiptNum,
          paymentMethod: "Cash",
          isAnonymous,
          createdAt: new Date().toISOString(),
        });
        setShowDonationReceipt(true);

        toast({
          title: "நன்கொடை வெற்றி! / Donation Recorded!",
          description: `Cash donation of ₹${donationAmount} recorded successfully.`,
        });

        // Reset form
        setDonorName("");
        setAddress("");
        setPhone("");
        setEmail("");
        setDonationAmount("");
        setPurpose("");
        setIsAnonymous(false);
        setDonationMembershipNumber("");
        setDonationMemberFound(false);
        setKanjiSaathak(false);
        setKanjiSirappu(false);
        setPaymentMethod("online");
        setLoading(false);
        return;
      }

      // Online payment flow - First create donation with pending status
      const { data: donationData, error: insertError } = await supabase.from("donations").insert({
        donor_name: isAnonymous ? "Anonymous" : donorName,
        donor_phone: phone,
        donor_email: email || null,
        donor_address: address || null,
        amount: amount,
        purpose: donationPurpose,
        is_anonymous: isAnonymous,
        receipt_number: receiptNum,
        payment_method: "Online",
        payment_status: "pending",
      }).select().single();

      if (insertError) throw insertError;

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount: amount,
          donationId: donationData.id,
          type: "donation",
          notes: {
            donationId: donationData.id,
            donorName: isAnonymous ? "Anonymous" : donorName,
            donorPhone: phone,
            purpose: donationPurpose,
          },
        },
      });

      if (orderError || orderData?.error) {
        // Don't delete - keep for cash payment fallback
        const failReason = orderData?.error || orderError?.message || "Payment gateway unavailable";
        setCashRequestData({
          donationId: donationData.id,
          amount: amount,
          failureReason: failReason,
        });
        setShowCashRequestDialog(true);
        setLoading(false);
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: settings?.mosque_name_english || "Ilaiyankudi Pallivasal",
        description: `Donation: ${donationPurpose}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("create-razorpay-order?action=verify", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                donationId: donationData.id,
                type: "donation",
              },
            });

            if (verifyError || !verifyData?.verified) {
              throw new Error("Payment verification failed");
            }

            // Show receipt
            setDonationReceiptData({
              donorName: isAnonymous ? "Anonymous" : donorName,
              donorPhone: phone,
              donorEmail: email || undefined,
              amount: amount,
              purpose: donationPurpose,
              receiptNumber: receiptNum,
              paymentMethod: "Online",
              isAnonymous,
              createdAt: new Date().toISOString(),
            });
            setShowDonationReceipt(true);

            toast({
              title: "பணம் செலுத்தப்பட்டது! / Payment Successful!",
              description: `Thank you for your generous donation of ₹${donationAmount}`,
            });

            // Reset form
            setDonorName("");
            setAddress("");
            setPhone("");
            setEmail("");
            setDonationAmount("");
            setPurpose("");
            setIsAnonymous(false);
            setDonationMembershipNumber("");
            setDonationMemberFound(false);
            setKanjiSaathak(false);
            setKanjiSirappu(false);
          } catch (error: any) {
            toast({
              title: "பிழை / Error",
              description: error.message || "Payment verification failed",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: isAnonymous ? "" : donorName,
          contact: phone,
          email: email || undefined,
        },
        theme: {
          color: "#16a34a",
        },
        modal: {
          ondismiss: async function () {
            // Keep donation record for cash payment request
            toast({
              title: "ரத்து செய்யப்பட்டது / Cancelled",
              description: "Payment was cancelled. You can request cash payment.",
              variant: "destructive",
            });
            // Offer cash payment request
            setCashRequestData({
              donationId: donationData.id,
              amount: amount,
              failureReason: "Payment cancelled by user",
            });
            setShowCashRequestDialog(true);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        setCashRequestData({
          donationId: donationData.id,
          amount: amount,
          failureReason: response.error?.description || response.error?.reason || "Payment failed",
        });
        setShowCashRequestDialog(true);
      });
      razorpay.open();
    } catch (error: any) {
      // Offer cash payment request on any error
      const amount = parseFloat(donationAmount);
      if (!isNaN(amount) && amount > 0) {
        setCashRequestData({
          amount: amount,
          failureReason: error.message || "Payment initiation failed",
        });
        setShowCashRequestDialog(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showDonationReceipt && donationReceiptData && (
        <DonationReceipt
          donation={donationReceiptData}
          onClose={() => {
            setShowDonationReceipt(false);
            setDonationReceiptData(null);
          }}
        />
      )}
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Heart className="h-16 w-16 mx-auto mb-4 text-secondary" />
            <h1 className="text-3xl md:text-5xl font-bold font-tamil text-primary-foreground mb-4">
              நன்கொடை
            </h1>
            <p className="text-primary-foreground/80 font-display text-xl">
              Donation - Support Our Community
            </p>
          </motion.div>
        </div>
      </section>

      {/* Donation Forms Section */}
      <section className="py-16 bg-background islamic-pattern">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-auto p-1">
                <TabsTrigger value="general" className="font-tamil text-xs sm:text-sm py-3 px-2 whitespace-normal text-center leading-tight">
                  நோன்புக்கஞ்சி / பொது நன்கொடை
                </TabsTrigger>
                <TabsTrigger value="subscription" className="font-tamil text-xs sm:text-sm py-3 px-2 whitespace-normal text-center leading-tight">
                  சந்தா
                </TabsTrigger>
              </TabsList>

              {/* General Donation */}
              <TabsContent value="general">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="shadow-medium">
                    <CardHeader>
                      <CardTitle className="font-tamil text-xl">
                        நோன்புக்கஞ்சி / பொது நன்கொடை
                      </CardTitle>
                      <CardDescription>
                        General Donation / Iftar Kanji Donation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleDonationSubmit} className="space-y-6">
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <Checkbox
                            id="anonymous"
                            checked={isAnonymous}
                            onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                          />
                          <Label htmlFor="anonymous" className="font-tamil cursor-pointer">
                            அநாமதேய நன்கொடை (Anonymous Donation)
                          </Label>
                        </div>

                        {/* Optional Membership Lookup */}
                        {!isAnonymous && (
                          <div className="p-4 bg-muted/50 rounded-lg border border-dashed space-y-3">
                            <Label className="font-tamil text-sm">
                              உறுப்பினர் எண் (விருப்பம்) / Membership Number (Optional)
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Enter membership number"
                                value={donationMembershipNumber}
                                onChange={(e) => {
                                  setDonationMembershipNumber(e.target.value);
                                  if (donationMemberFound) setDonationMemberFound(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleDonationMemberLookup();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={handleDonationMemberLookup}
                                disabled={donationMemberLookupLoading}
                                className="shrink-0"
                              >
                                {donationMemberLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
                              </Button>
                            </div>
                            {donationMemberFound && (
                              <p className="text-xs text-green-600 dark:text-green-400">
                                ✓ Member details auto-filled below
                              </p>
                            )}
                          </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name" className="font-tamil">
                              பெயர் {!isAnonymous && "*"}
                            </Label>
                            <div className="relative mt-1">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="name"
                                placeholder="Name"
                                className="pl-10"
                                value={donorName}
                                onChange={(e) => setDonorName(e.target.value)}
                                required={!isAnonymous}
                                disabled={isAnonymous}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="phone" className="font-tamil">தொலைபேசி எண் *</Label>
                            <div className="relative mt-1">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="phone"
                                placeholder="Phone Number"
                                className="pl-10"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="email" className="font-tamil">மின்னஞ்சல்</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="Email (optional)"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="purpose" className="font-tamil">நோக்கம்</Label>
                            <Select value={purpose} onValueChange={setPurpose}>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="நோக்கத்தை தேர்வு செய்க" />
                              </SelectTrigger>
                              <SelectContent className="bg-background z-50">
                                {DONATION_PURPOSES.map((p) => (
                                  <SelectItem key={p.value} value={p.value}>
                                    {p.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Nonbu Kanji Sub-categories */}
                        {isNonbuKanji && (
                          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                            <Label className="font-tamil font-medium">
                              கஞ்சி வகையைத் தேர்வு செய்க * (Select Kanji Type)
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Select one or both types. Amount will be calculated automatically.
                            </p>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id="kanjiSaathak"
                                    checked={kanjiSaathak}
                                    onCheckedChange={(checked) => setKanjiSaathak(checked as boolean)}
                                  />
                                  <Label htmlFor="kanjiSaathak" className="font-tamil cursor-pointer">
                                    சாதாக் கஞ்சி
                                  </Label>
                                </div>
                                <span className="text-sm font-semibold text-primary">₹{saathakAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id="kanjiSirappu"
                                    checked={kanjiSirappu}
                                    onCheckedChange={(checked) => setKanjiSirappu(checked as boolean)}
                                  />
                                  <Label htmlFor="kanjiSirappu" className="font-tamil cursor-pointer">
                                    சிறப்புக் கஞ்சி
                                  </Label>
                                </div>
                                <span className="text-sm font-semibold text-primary">₹{sirappuAmount.toLocaleString()}</span>
                              </div>
                            </div>
                            {(kanjiSaathak || kanjiSirappu) && (
                              <div className="flex justify-between items-center pt-2 border-t">
                                <span className="font-tamil text-sm font-medium">மொத்தம் / Total</span>
                                <span className="text-lg font-bold text-primary">
                                  ₹{((kanjiSaathak ? saathakAmount : 0) + (kanjiSirappu ? sirappuAmount : 0)).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <Label htmlFor="address" className="font-tamil">முகவரி</Label>
                          <Textarea
                            id="address"
                            placeholder="Address (optional)"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="amount" className="font-tamil">நன்கொடை தொகை *</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input
                              id="amount"
                              type="number"
                              placeholder="Amount"
                              className="pl-8"
                              value={donationAmount}
                              onChange={(e) => setDonationAmount(e.target.value)}
                              required
                              min="1"
                              readOnly={isNonbuKanji}
                              disabled={isNonbuKanji}
                            />
                          </div>
                          {isNonbuKanji && (
                            <p className="text-xs text-muted-foreground mt-1 font-tamil">
                              தொகை கஞ்சி வகையின் அடிப்படையில் தானாக கணக்கிடப்படும்
                            </p>
                          )}
                        </div>

                        {/* Quick amount buttons - hidden for Nonbu Kanji */}
                        {!isNonbuKanji && (
                          <div className="flex flex-wrap gap-2">
                            {[100, 500, 1000, 5000].map((amount) => (
                              <Button
                                key={amount}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDonationAmount(String(amount))}
                                className={donationAmount === String(amount) ? "border-primary bg-primary/10" : ""}
                              >
                                ₹{amount}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Payment Method Selector (Admin Only) */}
                        {isAdmin && (
                          <div className="p-4 bg-muted rounded-lg border-2 border-dashed border-primary/30">
                            <Label className="font-tamil text-sm font-medium mb-3 block">
                              கட்டண முறை (Admin Only)
                            </Label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="paymentMethod"
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
                                  name="paymentMethod"
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
                                Cash donations will be recorded directly without payment processing.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                          <Button 
                            type="submit" 
                            variant="gold" 
                            size="lg" 
                            className="flex-1 min-w-0" 
                            disabled={loading || (!(isAdmin && paymentMethod === "cash") && !razorpayLoaded)}
                          >
                            {loading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <CreditCard className="h-5 w-5 mr-2 shrink-0" />
                                <span className="font-tamil truncate">நன்கொடை அளிக்க / Donate</span>
                              </>
                            )}
                          </Button>
                          <Button type="button" variant="outline" size="lg" className="shrink-0" onClick={() => {
                            setDonorName("");
                            setPhone("");
                            setEmail("");
                            setAddress("");
                            setDonationAmount("");
                            setPurpose("");
                            setDonationMembershipNumber("");
                            setDonationMemberFound(false);
                            setKanjiSaathak(false);
                            setKanjiSirappu(false);
                          }}>
                            <span className="font-tamil">ரத்துசெய் / Cancel</span>
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Subscription */}
              <TabsContent value="subscription">
                <SubscriptionForm />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Payment Methods Section */}
      <section className="py-12 bg-muted">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="font-tamil text-lg font-semibold mb-4">ஏற்றுக்கொள்ளப்படும் கட்டண முறைகள்</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {["Credit Card", "Debit Card", "UPI", "Net Banking", ...(isAdmin ? ["Cash"] : [])].map((method) => (
                <div key={method} className="px-4 py-2 bg-card rounded-lg shadow-soft">
                  <span className="text-sm text-muted-foreground">{method}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cash Payment Request Dialog for Donation */}
      {cashRequestData && (
        <CashPaymentRequestDialog
          open={showCashRequestDialog}
          onOpenChange={setShowCashRequestDialog}
          serviceType="donation"
          referenceId={cashRequestData.donationId}
          amount={cashRequestData.amount}
          applicantName={isAnonymous ? "Anonymous" : donorName}
          applicantPhone={phone}
          applicantEmail={email || undefined}
          failureReason={cashRequestData.failureReason}
          serviceDetails={{
            purpose,
            isAnonymous,
            donorAddress: address,
          }}
          onSuccess={() => {
            setCashRequestData(null);
            setDonorName("");
            setAddress("");
            setPhone("");
            setEmail("");
            setDonationAmount("");
            setPurpose("");
            setIsAnonymous(false);
            setDonationMembershipNumber("");
            setDonationMemberFound(false);
            setKanjiSaathak(false);
            setKanjiSirappu(false);
          }}
        />
      )}
    </div>
    </>
  );
};

export default DonationPage;
