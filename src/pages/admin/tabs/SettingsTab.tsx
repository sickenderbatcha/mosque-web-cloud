import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { upsertAppSetting } from "@/lib/appSettingsUtils";
import { clearCertificateImagesCache } from "@/lib/certificateImages";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TamilInput } from "@/components/ui/tamil-input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, IndianRupee, Building2, FileText, Upload, Image, ShieldCheck, List, Plus, X, Pencil } from "lucide-react";
import MahalPhotoManager from "@/components/admin/MahalPhotoManager";
import { Clock } from "lucide-react";
import ReceiptNumberSettings from "@/components/admin/ReceiptNumberSettings";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface AppSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const BOOKING_RATE_KEYS = {
  nikkah_book: { key: "booking_rate_nikkah_book", label: "Nikkah Book", labelTamil: "நிக்காஹ் புத்தகம்", default: "3000" },
  hall: { key: "booking_rate_hall", label: "Hall", labelTamil: "மண்டபம்", default: "15000" },
  food_facility: { key: "booking_rate_food_facility", label: "Dining Hall", labelTamil: "உணவு இட வசதி", default: "7000" },
};

const SettingsTab = () => {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<"monthly" | "yearly">("monthly");
  const [subscriptionAmount, setSubscriptionAmount] = useState("");
  const [bookingRateDialogOpen, setBookingRateDialogOpen] = useState(false);
  const [bookingRateType, setBookingRateType] = useState<"nikkah_book" | "hall" | "food_facility">("nikkah_book");
  const [bookingRateAmount, setBookingRateAmount] = useState("");
  const [certificateFeeDialogOpen, setCertificateFeeDialogOpen] = useState(false);
  const [certificateFeeDialogType, setCertificateFeeDialogType] = useState<"regular" | "outside_marriage">("regular");
  const [certificateFeeAmount, setCertificateFeeAmount] = useState("");
  const [trusteeDialogOpen, setTrusteeDialogOpen] = useState(false);
  const [trusteeName, setTrusteeName] = useState("");
  const [trusteeQualification, setTrusteeQualification] = useState("");
  const [serialFormatDialogOpen, setSerialFormatDialogOpen] = useState(false);
  const [serialFormat, setSerialFormat] = useState("");
  const [subscriptionStartDialogOpen, setSubscriptionStartDialogOpen] = useState(false);
  const [subscriptionStartMonth, setSubscriptionStartMonth] = useState("1");
  const [subscriptionStartYear, setSubscriptionStartYear] = useState(new Date().getFullYear().toString());
  const [saving, setSaving] = useState(false);

  // Kanji amount settings
  const [kanjiAmountDialogOpen, setKanjiAmountDialogOpen] = useState(false);
  const [kanjiAmountType, setKanjiAmountType] = useState<"saathak" | "sirappu">("saathak");
  const [kanjiAmount, setKanjiAmount] = useState("");
  
  // Booking timeout state
  const [bookingTimeoutHours, setBookingTimeoutHours] = useState<number>(24);
  const [savingTimeout, setSavingTimeout] = useState(false);

  // Force pending subscription toggle
  const [forcePendingSubscription, setForcePendingSubscription] = useState(false);
  const [savingForcePending, setSavingForcePending] = useState(false);

  // OTP verification toggle state
  const [otpRequired, setOtpRequired] = useState(true);
  const [savingOtpSetting, setSavingOtpSetting] = useState(false);

  // Booking alert message state
  const [bookingAlertMessage, setBookingAlertMessage] = useState("தேதி கிடைக்கிறதா என்பது நிர்வாகத்தால் சரிபார்க்கப்படும். உங்கள் முன்பதிவு நிலை குறித்து தொலைபேசி வழியாக அறிவிக்கப்படும்.");
  const [savingAlertMessage, setSavingAlertMessage] = useState(false);

  // Income categories state
  const [incomeCategoriesDialogOpen, setIncomeCategoriesDialogOpen] = useState(false);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([
    "நன்கொடை (Donation)",
    "சந்தா (Subscription)",
    "மஹால் முன்பதிவு (Mahal Booking)",
    "மஹால் வாடகை (Hall Rent)",
    "நிகழ்வு வருமானம் (Event Income)",
    "இதர வருமானம் (Other Income)",
  ]);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [savingCategories, setSavingCategories] = useState(false);

  // Rental premises state
  const [rentalPremisesDialogOpen, setRentalPremisesDialogOpen] = useState(false);
  const [rentalPremises, setRentalPremises] = useState<{ name: string; address: string }[]>([]);
  const [newPremisesInput, setNewPremisesInput] = useState("");
  const [newPremisesAddress, setNewPremisesAddress] = useState("");
  const [editingPremiseIndex, setEditingPremiseIndex] = useState<number | null>(null);
  const [savingPremises, setSavingPremises] = useState(false);

  // Expense categories state
  const [expenseCategoriesDialogOpen, setExpenseCategoriesDialogOpen] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    "மின்சாரம் (Electricity)",
    "தண்ணீர் (Water)",
    "பராமரிப்பு (Maintenance)",
    "சம்பளம் (Salary)",
    "நிகழ்வு செலவுகள் (Event Expenses)",
    "அலுவலக பொருட்கள் (Office Supplies)",
    "பயண செலவுகள் (Travel)",
    "தொலைபேசி/இணையம் (Phone/Internet)",
    "வாடகை (Rent)",
    "இதர செலவுகள் (Other Expenses)",
  ]);
  const [newExpenseCategoryInput, setNewExpenseCategoryInput] = useState("");
  const [savingExpenseCategories, setSavingExpenseCategories] = useState(false);

  // Asset categories state
  const [assetCategoriesDialogOpen, setAssetCategoriesDialogOpen] = useState(false);
  const [assetCategories, setAssetCategories] = useState<string[]>([
    "Electronics", "Furniture", "Maintenance", "Kitchen Equipment",
    "Sound System", "Carpets", "AC Units", "PA System",
    "Library Books", "Stationery", "Filing Cabinets", "Other"
  ]);
  const [newAssetCategoryInput, setNewAssetCategoryInput] = useState("");
  const [savingAssetCategories, setSavingAssetCategories] = useState(false);

  // Shared editing state for category dialogs
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");

  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [sealUrl, setSealUrl] = useState<string | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingSeal, setUploadingSeal] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchCertificateImages();
    fetchBookingTimeout();
    fetchOtpSetting();
    fetchBookingAlertMessage();
    fetchForcePendingSetting();
    fetchIncomeCategories();
    fetchExpenseCategories();
    fetchAssetCategories();
    fetchRentalPremises();
  }, []);

  const fetchIncomeCategories = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "income_categories")
        .maybeSingle();
      if (data?.value) {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIncomeCategories(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to fetch income categories:", err);
    }
  };

  const addIncomeCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;

    const isDuplicate = incomeCategories.some(
      (category) => category.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      toast({ title: "Duplicate", description: "This category already exists.", variant: "destructive" });
      return;
    }

    setIncomeCategories((prev) => [...prev, trimmed]);
    setNewCategoryInput("");
  };

  const removeIncomeCategory = (index: number) => {
    setIncomeCategories(incomeCategories.filter((_, i) => i !== index));
  };

  const saveIncomeCategories = async () => {
    setSavingCategories(true);

    const pendingCategory = newCategoryInput.trim();
    const hasPendingCategory = pendingCategory.length > 0;
    const isPendingDuplicate =
      hasPendingCategory &&
      incomeCategories.some(
        (category) => category.trim().toLowerCase() === pendingCategory.toLowerCase()
      );

    const categoriesToSave =
      hasPendingCategory && !isPendingDuplicate
        ? [...incomeCategories, pendingCategory]
        : incomeCategories;

    try {
      await upsertAppSetting(
        "income_categories",
        JSON.stringify(categoriesToSave),
        "Configurable income categories for income management"
      );
      setIncomeCategories(categoriesToSave);
      setNewCategoryInput("");
      toast({ title: "Categories Saved", description: "Income categories updated successfully." });
      setIncomeCategoriesDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save categories.", variant: "destructive" });
    } finally {
      setSavingCategories(false);
    }
  };

  // Rental premises functions
  const fetchRentalPremises = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "rental_premises")
        .maybeSingle();
      if (data?.value) {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migrate old string[] format to {name, address}[]
          const migrated = parsed.map((p: any) =>
            typeof p === "string" ? { name: p, address: "" } : p
          );
          setRentalPremises(migrated);
        }
      }
    } catch (err) {
      console.error("Failed to fetch rental premises:", err);
    }
  };

  const addRentalPremise = () => {
    const trimmed = newPremisesInput.trim();
    if (!trimmed) return;
    if (editingPremiseIndex !== null) {
      // Update existing
      setRentalPremises((prev) =>
        prev.map((p, i) => i === editingPremiseIndex ? { name: trimmed, address: newPremisesAddress.trim() } : p)
      );
      setEditingPremiseIndex(null);
    } else {
      if (rentalPremises.some((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase())) {
        toast({ title: "Duplicate", description: "This premise already exists.", variant: "destructive" });
        return;
      }
      setRentalPremises((prev) => [...prev, { name: trimmed, address: newPremisesAddress.trim() }]);
    }
    setNewPremisesInput("");
    setNewPremisesAddress("");
  };

  const editRentalPremise = (index: number) => {
    setEditingPremiseIndex(index);
    setNewPremisesInput(rentalPremises[index].name);
    setNewPremisesAddress(rentalPremises[index].address);
  };

  const removeRentalPremise = (index: number) => {
    setRentalPremises(rentalPremises.filter((_, i) => i !== index));
    if (editingPremiseIndex === index) {
      setEditingPremiseIndex(null);
      setNewPremisesInput("");
      setNewPremisesAddress("");
    }
  };

  const saveRentalPremises = async () => {
    setSavingPremises(true);
    const pending = newPremisesInput.trim();
    let toSave = [...rentalPremises];

    if (pending.length > 0) {
      if (editingPremiseIndex !== null) {
        // Apply pending edit before saving
        toSave = toSave.map((p, i) =>
          i === editingPremiseIndex ? { name: pending, address: newPremisesAddress.trim() } : p
        );
      } else {
        const isDup = toSave.some((p) => p.name.trim().toLowerCase() === pending.toLowerCase());
        if (!isDup) {
          toSave = [...toSave, { name: pending, address: newPremisesAddress.trim() }];
        }
      }
    }

    try {
      await upsertAppSetting("rental_premises", JSON.stringify(toSave), "Configurable rental premises list with addresses");
      setRentalPremises(toSave);
      setNewPremisesInput("");
      setNewPremisesAddress("");
      setEditingPremiseIndex(null);
      toast({ title: "Saved", description: "Rental premises updated successfully." });
      setRentalPremisesDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save.", variant: "destructive" });
    } finally {
      setSavingPremises(false);
    }
  };

  const fetchExpenseCategories = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "expense_categories")
        .maybeSingle();
      if (data?.value) {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setExpenseCategories(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to fetch expense categories:", err);
    }
  };

  const addExpenseCategory = () => {
    const trimmed = newExpenseCategoryInput.trim();
    if (!trimmed) return;
    if (expenseCategories.includes(trimmed)) {
      toast({ title: "Duplicate", description: "This category already exists.", variant: "destructive" });
      return;
    }
    setExpenseCategories([...expenseCategories, trimmed]);
    setNewExpenseCategoryInput("");
  };

  const removeExpenseCategory = (index: number) => {
    setExpenseCategories(expenseCategories.filter((_, i) => i !== index));
  };

  const saveExpenseCategories = async () => {
    setSavingExpenseCategories(true);
    try {
      await upsertAppSetting("expense_categories", JSON.stringify(expenseCategories), "Configurable expense categories for expense management");
      toast({ title: "Categories Saved", description: "Expense categories updated successfully." });
      setExpenseCategoriesDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save categories.", variant: "destructive" });
    } finally {
      setSavingExpenseCategories(false);
    }
  };

  const fetchAssetCategories = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "asset_categories")
        .maybeSingle();
      if (data?.value) {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssetCategories(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to fetch asset categories:", err);
    }
  };

  const addAssetCategory = () => {
    const trimmed = newAssetCategoryInput.trim();
    if (!trimmed) return;
    if (assetCategories.some(c => c.trim().toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Duplicate", description: "This category already exists.", variant: "destructive" });
      return;
    }
    setAssetCategories([...assetCategories, trimmed]);
    setNewAssetCategoryInput("");
  };

  const removeAssetCategory = (index: number) => {
    setAssetCategories(assetCategories.filter((_, i) => i !== index));
  };

  const saveAssetCategories = async () => {
    setSavingAssetCategories(true);
    const pendingCategory = newAssetCategoryInput.trim();
    const hasPendingCategory = pendingCategory.length > 0;
    const isPendingDuplicate = hasPendingCategory && assetCategories.some(c => c.trim().toLowerCase() === pendingCategory.toLowerCase());
    const categoriesToSave = hasPendingCategory && !isPendingDuplicate ? [...assetCategories, pendingCategory] : assetCategories;
    try {
      await upsertAppSetting("asset_categories", JSON.stringify(categoriesToSave), "Configurable asset categories for asset management");
      setAssetCategories(categoriesToSave);
      setNewAssetCategoryInput("");
      toast({ title: "Categories Saved", description: "Asset categories updated successfully." });
      setAssetCategoriesDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save categories.", variant: "destructive" });
    } finally {
      setSavingAssetCategories(false);
    }
  };

   const fetchBookingTimeout = async () => {
     try {
       const { data, error } = await supabase
         .from("app_settings")
         .select("value")
         .eq("key", "booking_payment_timeout_hours")
         .single();
       
       if (data && !error) {
         const hours = parseInt(data.value, 10);
         if (!isNaN(hours) && hours >= 1 && hours <= 168) {
           setBookingTimeoutHours(hours);
         }
       }
     } catch (error) {
       console.error("Error fetching booking timeout:", error);
     }
   };
 
   const saveBookingTimeout = async (value: number) => {
     setSavingTimeout(true);
     try {
      await upsertAppSetting("booking_payment_timeout_hours", value.toString(), "Hours before unpaid booking cash payment requests are auto-cancelled (1-168 hours)");
 
       toast({
         title: "Timeout Updated",
         description: `Booking payment timeout set to ${value} hours`,
       });
     } catch (error: any) {
       toast({
         title: "Error",
         description: error.message || "Failed to save timeout setting.",
         variant: "destructive",
       });
     } finally {
      setSavingTimeout(false);
    }
  };

  const fetchOtpSetting = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "booking_otp_required")
        .single();
      
      if (data && !error) {
        setOtpRequired(data.value === "true" || data.value === "yes");
      }
    } catch (error) {
      console.error("Error fetching OTP setting:", error);
    }
  };

  const saveOtpSetting = async (value: boolean) => {
    setSavingOtpSetting(true);
    try {
      await upsertAppSetting("booking_otp_required", value ? "true" : "false", "Whether OTP verification is required for Mahal bookings");

      setOtpRequired(value);
      toast({
        title: "OTP Setting Updated",
        description: value 
          ? "OTP verification is now required for bookings" 
          : "OTP verification is now disabled for bookings",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save OTP setting.",
        variant: "destructive",
      });
    } finally {
      setSavingOtpSetting(false);
    }
   };
 
  const fetchForcePendingSetting = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "force_pending_subscription")
        .maybeSingle();
      if (data && !error) {
        setForcePendingSubscription(data.value === "true" || data.value === "yes");
      }
    } catch (error) {
      console.error("Error fetching force pending setting:", error);
    }
  };

  const saveForcePendingSetting = async (value: boolean) => {
    setSavingForcePending(true);
    try {
      await upsertAppSetting("force_pending_subscription", value ? "true" : "false", "Force members to pay pending subscription months first before paying for other months");
      setForcePendingSubscription(value);
      toast({
        title: "Setting Updated",
        description: value
          ? "Members must now clear pending subscriptions first"
          : "Members can pay for any subscription month freely",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save setting.",
        variant: "destructive",
      });
    } finally {
      setSavingForcePending(false);
    }
  };

   const fetchBookingAlertMessage = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "booking_alert_message")
        .single();
      if (data && !error) {
        setBookingAlertMessage(data.value);
      }
    } catch (error) {
      console.error("Error fetching booking alert message:", error);
    }
  };

  const saveBookingAlertMessage = async () => {
    setSavingAlertMessage(true);
    try {
      await upsertAppSetting("booking_alert_message", bookingAlertMessage, "Alert message displayed on Mahal booking form");

      toast({
        title: "Alert Message Updated",
        description: "Booking alert message has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save alert message.",
        variant: "destructive",
      });
    } finally {
      setSavingAlertMessage(false);
    }
  };

  const fetchCertificateImages = async () => {
    try {
      const { data: signatureData } = await supabase.storage
        .from("certificate-assets")
        .list("", { search: "trustee-signature" });
      
      if (signatureData && signatureData.length > 0) {
        const { data: signatureUrlData } = supabase.storage
          .from("certificate-assets")
          .getPublicUrl(signatureData[0].name);
        setSignatureUrl(signatureUrlData.publicUrl + "?t=" + Date.now());
      }

      const { data: sealData } = await supabase.storage
        .from("certificate-assets")
        .list("", { search: "mosque-seal" });
      
      if (sealData && sealData.length > 0) {
        const { data: sealUrlData } = supabase.storage
          .from("certificate-assets")
          .getPublicUrl(sealData[0].name);
        setSealUrl(sealUrlData.publicUrl + "?t=" + Date.now());
      }
    } catch (error) {
      console.error("Error fetching certificate images:", error);
    }
  };

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploadingSignature(true);
    try {
      const { data: existingFiles } = await supabase.storage
        .from("certificate-assets")
        .list("", { search: "trustee-signature" });
      
      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from("certificate-assets")
          .remove(existingFiles.map(f => f.name));
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `trustee-signature.${fileExt}`;
      
      const { error } = await supabase.storage
        .from("certificate-assets")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("certificate-assets")
        .getPublicUrl(fileName);
      
      clearCertificateImagesCache();
      setSignatureUrl(urlData.publicUrl + "?t=" + Date.now());

      toast({
        title: "Signature Uploaded",
        description: "Trustee signature has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload signature.",
        variant: "destructive",
      });
    } finally {
      setUploadingSignature(false);
      if (signatureInputRef.current) {
        signatureInputRef.current.value = "";
      }
    }
  };

  const handleSealUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploadingSeal(true);
    try {
      const { data: existingFiles } = await supabase.storage
        .from("certificate-assets")
        .list("", { search: "mosque-seal" });
      
      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from("certificate-assets")
          .remove(existingFiles.map(f => f.name));
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `mosque-seal.${fileExt}`;
      
      const { error } = await supabase.storage
        .from("certificate-assets")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("certificate-assets")
        .getPublicUrl(fileName);
      
      clearCertificateImagesCache();
      setSealUrl(urlData.publicUrl + "?t=" + Date.now());

      toast({
        title: "Seal Uploaded",
        description: "Mosque seal has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload seal.",
        variant: "destructive",
      });
    } finally {
      setUploadingSeal(false);
      if (sealInputRef.current) {
        sealInputRef.current.value = "";
      }
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .order("key", { ascending: true });

      if (error) throw error;
      setSettings((data as AppSetting[]) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Subscription settings helpers
  const getSubscriptionSetting = (type: "monthly" | "yearly") => {
    const key = type === "monthly" ? "subscription_monthly_amount" : "subscription_yearly_amount";
    return settings.find((s) => s.key === key);
  };

  const openSubscriptionDialog = (type: "monthly" | "yearly") => {
    setSubscriptionType(type);
    const setting = getSubscriptionSetting(type);
    setSubscriptionAmount(setting?.value || (type === "monthly" ? "100" : "1000"));
    setSubscriptionDialogOpen(true);
  };

  const saveSubscriptionAmount = async () => {
    const key = subscriptionType === "monthly" ? "subscription_monthly_amount" : "subscription_yearly_amount";
    const existingSetting = getSubscriptionSetting(subscriptionType);

    setSaving(true);
    try {
      if (existingSetting) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: subscriptionAmount })
          .eq("id", existingSetting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert({
            key,
            value: subscriptionAmount,
            description: subscriptionType === "monthly" ? "Monthly subscription amount" : "Yearly subscription amount",
          });
        if (error) throw error;
      }

      toast({
        title: "Amount Updated",
        description: `${subscriptionType === "monthly" ? "Monthly" : "Yearly"} subscription amount updated to ₹${subscriptionAmount}`,
      });
      setSubscriptionDialogOpen(false);
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription amount.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Subscription start month/year helpers
  const getSubscriptionStartSetting = (type: "month" | "year") => {
    const key = type === "month" ? "subscription_start_month" : "subscription_start_year";
    return settings.find((s) => s.key === key);
  };

  const openSubscriptionStartDialog = () => {
    const monthSetting = getSubscriptionStartSetting("month");
    const yearSetting = getSubscriptionStartSetting("year");
    setSubscriptionStartMonth(monthSetting?.value || "1");
    setSubscriptionStartYear(yearSetting?.value || new Date().getFullYear().toString());
    setSubscriptionStartDialogOpen(true);
  };

  const saveSubscriptionStart = async () => {
    setSaving(true);
    try {
      const monthSetting = getSubscriptionStartSetting("month");
      const yearSetting = getSubscriptionStartSetting("year");

      if (monthSetting) {
        await supabase
          .from("app_settings")
          .update({ value: subscriptionStartMonth })
          .eq("id", monthSetting.id);
      } else {
        await supabase
          .from("app_settings")
          .insert({
            key: "subscription_start_month",
            value: subscriptionStartMonth,
            description: "Subscription heatmap start month",
          });
      }

      if (yearSetting) {
        await supabase
          .from("app_settings")
          .update({ value: subscriptionStartYear })
          .eq("id", yearSetting.id);
      } else {
        await supabase
          .from("app_settings")
          .insert({
            key: "subscription_start_year",
            value: subscriptionStartYear,
            description: "Subscription heatmap start year",
          });
      }

      toast({
        title: "Subscription Start Updated",
        description: `Start date set to ${MONTHS_FULL[parseInt(subscriptionStartMonth) - 1]} ${subscriptionStartYear}`,
      });
      setSubscriptionStartDialogOpen(false);
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription start.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Booking rate settings helpers
  const getBookingRateSetting = (type: "nikkah_book" | "hall" | "food_facility") => {
    const key = BOOKING_RATE_KEYS[type].key;
    return settings.find((s) => s.key === key);
  };

  const openBookingRateDialog = (type: "nikkah_book" | "hall" | "food_facility") => {
    setBookingRateType(type);
    const setting = getBookingRateSetting(type);
    setBookingRateAmount(setting?.value || BOOKING_RATE_KEYS[type].default);
    setBookingRateDialogOpen(true);
  };

  const saveBookingRate = async () => {
    const config = BOOKING_RATE_KEYS[bookingRateType];
    const existingSetting = getBookingRateSetting(bookingRateType);

    setSaving(true);
    try {
      if (existingSetting) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: bookingRateAmount })
          .eq("id", existingSetting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert({
            key: config.key,
            value: bookingRateAmount,
            description: `Booking rate for ${config.label} (${config.labelTamil})`,
          });
        if (error) throw error;
      }

      toast({
        title: "Rate Updated",
        description: `${config.label} rate updated to ₹${bookingRateAmount}`,
      });
      setBookingRateDialogOpen(false);
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking rate.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Certificate fee helpers
  const getCertificateFeeSetting = () => {
    return settings.find((s) => s.key === "certificate_fee");
  };

  const openCertificateFeeDialog = () => {
    const setting = getCertificateFeeSetting();
    setCertificateFeeAmount(setting?.value || "100");
    setCertificateFeeDialogType("regular");
    setCertificateFeeDialogOpen(true);
  };

  const saveCertificateFee = async () => {
    const isOutsideMarriage = certificateFeeDialogType === "outside_marriage";
    const key = isOutsideMarriage ? "certificate_fee_outside_marriage" : "certificate_fee";
    const existingSetting = settings.find((s) => s.key === key);

    setSaving(true);
    try {
      if (existingSetting) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: certificateFeeAmount })
          .eq("id", existingSetting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert({
            key,
            value: certificateFeeAmount,
            description: isOutsideMarriage ? "Fee for outside marriage certificates in INR" : "Fee for marriage/death certificates in INR",
          });
        if (error) throw error;
      }

      toast({
        title: "Fee Updated",
        description: `Certificate fee updated to ₹${certificateFeeAmount}`,
      });
      setCertificateFeeDialogOpen(false);
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update certificate fee.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Trustee settings helpers
  const getTrusteeSetting = (key: "certificate_trustee_name" | "certificate_trustee_qualification") => {
    return settings.find((s) => s.key === key);
  };

  const openTrusteeDialog = () => {
    const nameSetting = getTrusteeSetting("certificate_trustee_name");
    const qualSetting = getTrusteeSetting("certificate_trustee_qualification");
    setTrusteeName(nameSetting?.value || "");
    setTrusteeQualification(qualSetting?.value || "");
    setTrusteeDialogOpen(true);
  };

  const saveTrusteeSettings = async () => {
    setSaving(true);
    try {
      const nameExisting = getTrusteeSetting("certificate_trustee_name");
      const qualExisting = getTrusteeSetting("certificate_trustee_qualification");

      if (nameExisting) {
        await supabase.from("app_settings").update({ value: trusteeName }).eq("id", nameExisting.id);
      } else if (trusteeName.trim()) {
        await supabase.from("app_settings").insert({
          key: "certificate_trustee_name",
          value: trusteeName.trim(),
          description: "Managing Trustee name for certificates",
        });
      }

      if (qualExisting) {
        await supabase.from("app_settings").update({ value: trusteeQualification }).eq("id", qualExisting.id);
      } else if (trusteeQualification.trim()) {
        await supabase.from("app_settings").insert({
          key: "certificate_trustee_qualification",
          value: trusteeQualification.trim(),
          description: "Managing Trustee qualification for certificates",
        });
      }

      toast({
        title: "Settings Updated",
        description: "Trustee details updated successfully.",
      });
      setTrusteeDialogOpen(false);
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update trustee settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Serial number format helpers
  const getSerialFormatSetting = () => {
    return settings.find((s) => s.key === "certificate_serial_format");
  };

  const openSerialFormatDialog = () => {
    const setting = getSerialFormatSetting();
    setSerialFormat(setting?.value || "YYYY/NNN");
    setSerialFormatDialogOpen(true);
  };

  const saveSerialFormat = async () => {
    const existingSetting = getSerialFormatSetting();

    setSaving(true);
    try {
      if (existingSetting) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: serialFormat })
          .eq("id", existingSetting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert({
            key: "certificate_serial_format",
            value: serialFormat,
            description: "Serial number format for certificates (e.g., YYYY/NNN)",
          });
        if (error) throw error;
      }

      toast({
        title: "Format Updated",
        description: `Certificate serial format updated to ${serialFormat}`,
      });
      setSerialFormatDialogOpen(false);
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update serial format.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Subscription Settings (சந்தா)
          </CardTitle>
          <CardDescription>
            Configure monthly and yearly subscription amounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Amount</p>
                <p className="text-2xl font-bold">
                  ₹{getSubscriptionSetting("monthly")?.value || "100"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openSubscriptionDialog("monthly")}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Yearly Amount</p>
                <p className="text-2xl font-bold">
                  ₹{getSubscriptionSetting("yearly")?.value || "1000"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openSubscriptionDialog("yearly")}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Heatmap Start (தொடக்கம்)</p>
                <p className="text-lg font-bold">
                  {MONTHS_FULL[parseInt(getSubscriptionStartSetting("month")?.value || "1") - 1]} {getSubscriptionStartSetting("year")?.value || new Date().getFullYear()}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={openSubscriptionStartDialog}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>

          {/* Force Pending Subscription Toggle */}
          <div className="mt-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-medium">Force Pending Subscription (நிலுவை சந்தா கட்டாயம்)</h4>
                  <p className="text-sm text-muted-foreground">
                    Force members to pay pending months first before paying for other months
                  </p>
                  <p className="text-xs text-muted-foreground font-tamil mt-1">
                    மற்ற மாதங்களுக்கு செலுத்துவதற்கு முன் நிலுவை மாதங்களை முதலில் செலுத்த வேண்டும்
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${forcePendingSubscription ? 'text-primary' : 'text-muted-foreground'}`}>
                  {forcePendingSubscription ? 'Yes' : 'No'}
                </span>
                <Switch
                  checked={forcePendingSubscription}
                  onCheckedChange={(checked) => saveForcePendingSetting(checked)}
                  disabled={savingForcePending}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Categories Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Income Categories (வருமான வகைகள்)
          </CardTitle>
          <CardDescription>
            Configure income categories shown in the Income tab dropdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {incomeCategories.map((cat, i) => (
              <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                {cat}
              </Badge>
            ))}
          </div>
          <Button variant="outline" onClick={() => setIncomeCategoriesDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
        </CardContent>
      </Card>

      {/* Expense Categories Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Expense Categories (செலவு வகைகள்)
          </CardTitle>
          <CardDescription>
            Configure expense categories shown in the Expenses tab dropdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {expenseCategories.map((cat, i) => (
              <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                {cat}
              </Badge>
            ))}
          </div>
          <Button variant="outline" onClick={() => setExpenseCategoriesDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
        </CardContent>
      </Card>

      {/* Asset Categories Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Asset Categories (சொத்து வகைகள்)
          </CardTitle>
          <CardDescription>
            Configure asset categories shown in the Asset Management dropdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {assetCategories.map((cat, i) => (
              <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                {cat}
              </Badge>
            ))}
          </div>
          <Button variant="outline" onClick={() => setAssetCategoriesDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Rental Premises (வாடகை வளாகங்கள்)
          </CardTitle>
          <CardDescription>
            Configure premises options shown in the Rental Agreement form dropdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {rentalPremises.length === 0 ? (
              <span className="text-sm text-muted-foreground">No premises configured yet</span>
            ) : rentalPremises.map((p, i) => (
              <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                {p.name}{p.address ? ` — ${p.address}` : ""}
              </Badge>
            ))}
          </div>
          <Button variant="outline" onClick={() => setRentalPremisesDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Manage Premises
          </Button>
        </CardContent>
      </Card>

      {/* Nonbu Kanji Donation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Nonbu Kanji Settings (நோன்புக்கஞ்சி கட்டணம்)
          </CardTitle>
          <CardDescription>
            Configure amounts for சாதாக் கஞ்சி and சிறப்புக் கஞ்சி donation types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">சாதாக் கஞ்சி (Saathak Kanji)</p>
                <p className="text-2xl font-bold">
                  ₹{settings.find((s) => s.key === "nonbu_kanji_saathak_amount")?.value || "500"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                setKanjiAmountType("saathak");
                setKanjiAmount(settings.find((s) => s.key === "nonbu_kanji_saathak_amount")?.value || "500");
                setKanjiAmountDialogOpen(true);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">சிறப்புக் கஞ்சி (Sirappu Kanji)</p>
                <p className="text-2xl font-bold">
                  ₹{settings.find((s) => s.key === "nonbu_kanji_sirappu_amount")?.value || "1000"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                setKanjiAmountType("sirappu");
                setKanjiAmount(settings.find((s) => s.key === "nonbu_kanji_sirappu_amount")?.value || "1000");
                setKanjiAmountDialogOpen(true);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Rates Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Mahal Booking Rates (மண்டப கட்டணம்)
          </CardTitle>
          <CardDescription>
            Configure booking rates for hall, food facility, and nikkah book
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Nikkah Book (நிக்காஹ் புத்தகம்)</p>
                <p className="text-2xl font-bold">
                  ₹{getBookingRateSetting("nikkah_book")?.value || "3000"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openBookingRateDialog("nikkah_book")}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Hall (மண்டபம்)</p>
                <p className="text-2xl font-bold">
                  ₹{getBookingRateSetting("hall")?.value || "15000"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openBookingRateDialog("hall")}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Dining Hall (உணவு இட வசதி)</p>
                <p className="text-2xl font-bold">
                  ₹{getBookingRateSetting("food_facility")?.value || "7000"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openBookingRateDialog("food_facility")}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mahal Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Mahal Photos (மண்டப புகைப்படங்கள்)
          </CardTitle>
          <CardDescription>
            Upload and manage photos displayed on the Mahal booking page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MahalPhotoManager />
        </CardContent>
      </Card>

       {/* Booking Payment Timeout Settings */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Clock className="h-5 w-5" />
             Booking Settings (முன்பதிவு அமைப்புகள்)
           </CardTitle>
           <CardDescription>
             Configure booking payment timeout and auto-cancellation settings
           </CardDescription>
         </CardHeader>
          <CardContent className="space-y-6">
            {/* OTP Verification Toggle */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-medium">OTP Verification (OTP சரிபார்ப்பு)</h4>
                    <p className="text-sm text-muted-foreground">
                      Require phone/email OTP verification before booking
                    </p>
                    <p className="text-xs text-muted-foreground font-tamil mt-1">
                      முன்பதிவுக்கு முன் தொலைபேசி/மின்னஞ்சல் OTP சரிபார்ப்பு தேவை
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${otpRequired ? 'text-primary' : 'text-muted-foreground'}`}>
                    {otpRequired ? 'Required' : 'Not Required'}
                  </span>
                  <Switch
                    checked={otpRequired}
                    onCheckedChange={(checked) => saveOtpSetting(checked)}
                    disabled={savingOtpSetting}
                  />
                </div>
              </div>
            </div>

            {/* Booking Alert Message */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Booking Alert Message (முன்பதிவு எச்சரிக்கை செய்தி)
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                This message is displayed on the Mahal booking form as an alert to users.
              </p>
              <textarea
                className="w-full min-h-[80px] p-3 border rounded-md text-sm font-tamil bg-background resize-y"
                value={bookingAlertMessage}
                onChange={(e) => setBookingAlertMessage(e.target.value)}
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={saveBookingAlertMessage}
                  disabled={savingAlertMessage}
                >
                  {savingAlertMessage ? "Saving..." : "Save Message"}
                </Button>
              </div>
            </div>

            {/* Payment Timeout */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Payment Timeout (கட்டண காலாவதி)
              </h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-16">1 hour</span>
                  <Slider
                    value={[bookingTimeoutHours]}
                    onValueChange={(values) => setBookingTimeoutHours(values[0])}
                    min={1}
                    max={168}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-20 text-right">168 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Current: {bookingTimeoutHours} hours ({Math.floor(bookingTimeoutHours / 24)} days {bookingTimeoutHours % 24} hours)
                  </span>
                  <Button 
                    size="sm" 
                    onClick={() => saveBookingTimeout(bookingTimeoutHours)}
                    disabled={savingTimeout}
                  >
                    {savingTimeout ? "Saving..." : "Save Timeout"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cash payment requests for bookings that are not approved within this time will be automatically cancelled, 
                  and the applicant will receive an SMS notification. The booked date will be released and made available again.
                </p>
                <p className="text-xs text-muted-foreground font-tamil">
                  இந்த நேரத்திற்குள் பணம் செலுத்தப்படாத முன்பதிவுகள் தானியங்கியாக ரத்து செய்யப்படும், 
                  விண்ணப்பதாரருக்கு SMS அறிவிப்பு அனுப்பப்படும்.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
 
      {/* Certificate Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Certificate Settings (சான்றிதழ் அமைப்புகள்)
          </CardTitle>
          <CardDescription>
            Configure certificate fee and managing trustee details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Certificate Fee</p>
                <p className="text-2xl font-bold">
                  ₹{getCertificateFeeSetting()?.value || "100"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={openCertificateFeeDialog}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Serial Format</p>
                <p className="text-lg font-bold font-mono">
                  {getSerialFormatSetting()?.value || "YYYY/NNN"}
                </p>
                <p className="text-xs text-muted-foreground">e.g., 2026/001</p>
              </div>
              <Button variant="outline" size="sm" onClick={openSerialFormatDialog}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Managing Trustee</p>
                <p className="text-lg font-bold truncate max-w-[200px]">
                  {getTrusteeSetting("certificate_trustee_name")?.value || "Not set"}
                </p>
                {getTrusteeSetting("certificate_trustee_qualification")?.value && (
                  <p className="text-xs text-muted-foreground">
                    {getTrusteeSetting("certificate_trustee_qualification")?.value}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={openTrusteeDialog}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Images Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Certificate Images (சான்றிதழ் படங்கள்)
          </CardTitle>
          <CardDescription>
            Upload trustee signature and mosque seal for certificates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Trustee Signature */}
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium mb-3">Trustee Signature (கையொப்பம்)</p>
              <div className="flex flex-col items-center gap-4">
                {signatureUrl ? (
                  <div className="relative">
                    <img 
                      src={signatureUrl} 
                      alt="Trustee Signature" 
                      className="h-20 object-contain border rounded bg-white p-2"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-40 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-sm">
                    No signature uploaded
                  </div>
                )}
                <input
                  type="file"
                  ref={signatureInputRef}
                  onChange={handleSignatureUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => signatureInputRef.current?.click()}
                  disabled={uploadingSignature}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingSignature ? "Uploading..." : signatureUrl ? "Change Signature" : "Upload Signature"}
                </Button>
              </div>
            </div>

            {/* Mosque Seal */}
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium mb-3">Mosque Seal (முத்திரை)</p>
              <div className="flex flex-col items-center gap-4">
                {sealUrl ? (
                  <div className="relative">
                    <img 
                      src={sealUrl} 
                      alt="Mosque Seal" 
                      className="h-20 w-20 object-cover border rounded bg-white p-1"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 border-2 border-dashed rounded-full flex items-center justify-center text-muted-foreground text-sm text-center">
                    No seal
                  </div>
                )}
                <input
                  type="file"
                  ref={sealInputRef}
                  onChange={handleSealUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => sealInputRef.current?.click()}
                  disabled={uploadingSeal}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingSeal ? "Uploading..." : sealUrl ? "Change Seal" : "Upload Seal"}
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Note: These images will be used in Marriage, Death, and NOC certificates. Upload high-quality images for best results.
          </p>
        </CardContent>
      </Card>

      {/* Kanji Amount Edit Dialog */}
      <Dialog open={kanjiAmountDialogOpen} onOpenChange={setKanjiAmountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {kanjiAmountType === "saathak" ? "சாதாக் கஞ்சி (Saathak Kanji)" : "சிறப்புக் கஞ்சி (Sirappu Kanji)"} Amount
            </DialogTitle>
            <DialogDescription>
              Set the fixed donation amount for {kanjiAmountType === "saathak" ? "Saathak Kanji" : "Sirappu Kanji"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kanjiAmount">Amount (₹)</Label>
              <Input
                id="kanjiAmount"
                type="number"
                value={kanjiAmount}
                onChange={(e) => setKanjiAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKanjiAmountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              setSaving(true);
              try {
                const key = kanjiAmountType === "saathak" ? "nonbu_kanji_saathak_amount" : "nonbu_kanji_sirappu_amount";
                const desc = kanjiAmountType === "saathak" ? "Saathak Kanji donation amount" : "Sirappu Kanji donation amount";
                await upsertAppSetting(key, kanjiAmount, desc);
                toast({ title: "Amount Updated", description: `${kanjiAmountType === "saathak" ? "சாதாக் கஞ்சி" : "சிறப்புக் கஞ்சி"} amount updated to ₹${kanjiAmount}` });
                setKanjiAmountDialogOpen(false);
                fetchSettings();
              } catch (error: any) {
                toast({ title: "Error", description: error.message || "Failed to update amount.", variant: "destructive" });
              } finally {
                setSaving(false);
              }
            }} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Amount Edit Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {subscriptionType === "monthly" ? "Monthly" : "Yearly"} Subscription Amount
            </DialogTitle>
            <DialogDescription>
              Set the amount for {subscriptionType} subscriptions (சந்தா)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subscriptionAmount">Amount (₹)</Label>
              <Input
                id="subscriptionAmount"
                type="number"
                value={subscriptionAmount}
                onChange={(e) => setSubscriptionAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSubscriptionAmount} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Rate Edit Dialog */}
      <Dialog open={bookingRateDialogOpen} onOpenChange={setBookingRateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {BOOKING_RATE_KEYS[bookingRateType].label} Rate
            </DialogTitle>
            <DialogDescription>
              Set the rate for {BOOKING_RATE_KEYS[bookingRateType].label} ({BOOKING_RATE_KEYS[bookingRateType].labelTamil})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bookingRateAmount">Amount (₹)</Label>
              <Input
                id="bookingRateAmount"
                type="number"
                value={bookingRateAmount}
                onChange={(e) => setBookingRateAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingRateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveBookingRate} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Fee Edit Dialog */}
      <Dialog open={certificateFeeDialogOpen} onOpenChange={setCertificateFeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {certificateFeeDialogType === "outside_marriage" ? "Edit Outside Marriage Certificate Fee" : "Edit Certificate Fee"}
            </DialogTitle>
            <DialogDescription>
              {certificateFeeDialogType === "outside_marriage" 
                ? "Set the fee for outside marriage certificates (வெளியூர் திருமணச் சான்றிதழ் கட்டணம்)"
                : "Set the fee for marriage/death certificates (சான்றிதழ் கட்டணம்)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="certificateFeeAmount">Amount (₹)</Label>
              <Input
                id="certificateFeeAmount"
                type="number"
                value={certificateFeeAmount}
                onChange={(e) => setCertificateFeeAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertificateFeeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCertificateFee} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trustee Settings Dialog */}
      <Dialog open={trusteeDialogOpen} onOpenChange={setTrusteeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Managing Trustee Details</DialogTitle>
            <DialogDescription>
              Set the managing trustee name and qualification for certificates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="trusteeName">Trustee Name (சான்றிதழில் காட்ட)</Label>
              <Input
                id="trusteeName"
                value={trusteeName}
                onChange={(e) => setTrusteeName(e.target.value)}
                placeholder="e.g., A. ABDUL RASHEED"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trusteeQualification">Qualification (optional)</Label>
              <Input
                id="trusteeQualification"
                value={trusteeQualification}
                onChange={(e) => setTrusteeQualification(e.target.value)}
                placeholder="e.g., B.A., B.L."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrusteeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTrusteeSettings} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Serial Number Format Dialog */}
      <Dialog open={serialFormatDialogOpen} onOpenChange={setSerialFormatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Certificate Serial Format</DialogTitle>
            <DialogDescription>
              Configure the serial number format for certificates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serialFormat">Format Pattern</Label>
              <Input
                id="serialFormat"
                value={serialFormat}
                onChange={(e) => setSerialFormat(e.target.value)}
                placeholder="e.g., YYYY/NNN"
              />
              <p className="text-xs text-muted-foreground">
                Use YYYY for year, NNN for 3-digit number (e.g., YYYY/NNN → 2026/001)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSerialFormatDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSerialFormat} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Outside Marriage Certificate Fee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Outside Marriage Certificate Fee (வெளியூர் திருமணச் சான்றிதழ் கட்டணம்)
          </CardTitle>
          <CardDescription>
            Configure the fee for outside marriage certificates (separately from regular certificates)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg max-w-sm">
            <div>
              <p className="text-sm text-muted-foreground">Outside Marriage Fee</p>
              <p className="text-2xl font-bold">
                ₹{settings.find((s) => s.key === "certificate_fee_outside_marriage")?.value || "100"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              setCertificateFeeAmount(settings.find((s) => s.key === "certificate_fee_outside_marriage")?.value || "100");
              setCertificateFeeDialogType("outside_marriage");
              setCertificateFeeDialogOpen(true);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Number Settings */}
      <ReceiptNumberSettings />

      {/* Subscription Start Month/Year Dialog */}
      <Dialog open={subscriptionStartDialogOpen} onOpenChange={setSubscriptionStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Subscription Start</DialogTitle>
            <DialogDescription>
              Set the start month and year for the subscription heatmap display
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startMonth">Start Month (தொடக்க மாதம்)</Label>
              <select
                id="startMonth"
                value={subscriptionStartMonth}
                onChange={(e) => setSubscriptionStartMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {MONTHS_FULL.map((month, idx) => (
                  <option key={idx} value={(idx + 1).toString()}>{month}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startYear">Start Year (தொடக்க ஆண்டு)</Label>
              <Input
                id="startYear"
                type="number"
                min="2020"
                max="2030"
                value={subscriptionStartYear}
                onChange={(e) => setSubscriptionStartYear(e.target.value)}
                placeholder="Enter year"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionStartDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSubscriptionStart} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Income Categories Dialog */}
      <Dialog open={incomeCategoriesDialogOpen} onOpenChange={(open) => { setIncomeCategoriesDialogOpen(open); if (!open) setEditingCategoryIndex(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Income Categories (வருமான வகைகள்)</DialogTitle>
            <DialogDescription>Add or remove income categories used in the Income tab.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <TamilInput
                value={newCategoryInput}
                onChange={(value) => setNewCategoryInput(value)}
                placeholder="Type in English, auto-converts to Tamil"
              />
              <Button size="sm" onClick={addIncomeCategory}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {incomeCategories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded gap-2">
                  {editingCategoryIndex === i ? (
                    <>
                      <TamilInput
                        value={editingCategoryValue}
                        onChange={(value) => setEditingCategoryValue(value)}
                        placeholder="Edit category"
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                        const trimmed = editingCategoryValue.trim();
                        if (trimmed && !incomeCategories.some((c, idx) => idx !== i && c.trim().toLowerCase() === trimmed.toLowerCase())) {
                          setIncomeCategories(prev => prev.map((c, idx) => idx === i ? trimmed : c));
                        }
                        setEditingCategoryIndex(null);
                      }}>
                        <ShieldCheck className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingCategoryIndex(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm flex-1">{cat}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingCategoryIndex(i); setEditingCategoryValue(cat); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeIncomeCategory(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIncomeCategoriesDialogOpen(false); fetchIncomeCategories(); }}>
              Cancel
            </Button>
            <Button onClick={saveIncomeCategories} disabled={savingCategories}>
              {savingCategories ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Categories Dialog */}
      <Dialog open={expenseCategoriesDialogOpen} onOpenChange={(open) => { setExpenseCategoriesDialogOpen(open); if (!open) setEditingCategoryIndex(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Expense Categories (செலவு வகைகள்)</DialogTitle>
            <DialogDescription>Add or remove expense categories used in the Expenses tab.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <TamilInput
                value={newExpenseCategoryInput}
                onChange={(value) => setNewExpenseCategoryInput(value)}
                placeholder="Type in English, auto-converts to Tamil"
              />
              <Button size="sm" onClick={addExpenseCategory}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {expenseCategories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded gap-2">
                  {editingCategoryIndex === i ? (
                    <>
                      <TamilInput
                        value={editingCategoryValue}
                        onChange={(value) => setEditingCategoryValue(value)}
                        placeholder="Edit category"
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                        const trimmed = editingCategoryValue.trim();
                        if (trimmed && !expenseCategories.some((c, idx) => idx !== i && c.trim().toLowerCase() === trimmed.toLowerCase())) {
                          setExpenseCategories(prev => prev.map((c, idx) => idx === i ? trimmed : c));
                        }
                        setEditingCategoryIndex(null);
                      }}>
                        <ShieldCheck className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingCategoryIndex(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm flex-1">{cat}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingCategoryIndex(i); setEditingCategoryValue(cat); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeExpenseCategory(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setExpenseCategoriesDialogOpen(false); fetchExpenseCategories(); }}>
              Cancel
            </Button>
            <Button onClick={saveExpenseCategories} disabled={savingExpenseCategories}>
              {savingExpenseCategories ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Categories Dialog */}
      <Dialog open={assetCategoriesDialogOpen} onOpenChange={(open) => { setAssetCategoriesDialogOpen(open); if (!open) setEditingCategoryIndex(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Asset Categories (சொத்து வகைகள்)</DialogTitle>
            <DialogDescription>Add or remove asset categories used in the Asset Management tab.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <TamilInput
                value={newAssetCategoryInput}
                onChange={(val) => setNewAssetCategoryInput(val)}
                placeholder="Enter category name"
              />
              <Button size="sm" onClick={addAssetCategory}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {assetCategories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded gap-2">
                  {editingCategoryIndex === i ? (
                    <>
                      <TamilInput
                        value={editingCategoryValue}
                        onChange={(val) => setEditingCategoryValue(val)}
                        placeholder="Edit category"
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                        const trimmed = editingCategoryValue.trim();
                        if (trimmed && !assetCategories.some((c, idx) => idx !== i && c.trim().toLowerCase() === trimmed.toLowerCase())) {
                          setAssetCategories(prev => prev.map((c, idx) => idx === i ? trimmed : c));
                        }
                        setEditingCategoryIndex(null);
                      }}>
                        <ShieldCheck className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingCategoryIndex(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm flex-1">{cat}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingCategoryIndex(i); setEditingCategoryValue(cat); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAssetCategory(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssetCategoriesDialogOpen(false); fetchAssetCategories(); }}>
              Cancel
            </Button>
            <Button onClick={saveAssetCategories} disabled={savingAssetCategories}>
              {savingAssetCategories ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rentalPremisesDialogOpen} onOpenChange={(open) => {
        setRentalPremisesDialogOpen(open);
        if (!open) { setEditingPremiseIndex(null); setNewPremisesInput(""); setNewPremisesAddress(""); }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Rental Premises (வாடகை வளாகங்கள்)</DialogTitle>
            <DialogDescription>Add premises with their addresses. The address will auto-fill in the Rental Agreement form.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex gap-2">
                <TamilInput
                  value={newPremisesInput}
                  onChange={(value) => setNewPremisesInput(value)}
                  placeholder="Premise name (வளாகம் பெயர்)"
                />
                <Button size="sm" onClick={addRentalPremise}>
                  {editingPremiseIndex !== null ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              <TamilInput
                value={newPremisesAddress}
                onChange={(value) => setNewPremisesAddress(value)}
                placeholder="Premise address (வளாகம் முகவரி)"
              />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {rentalPremises.map((p, i) => (
                <div key={i} className={`flex items-center justify-between p-2 border rounded ${editingPremiseIndex === i ? 'border-primary bg-primary/5' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{p.name}</span>
                    {p.address && <p className="text-xs text-muted-foreground truncate">{p.address}</p>}
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => editRentalPremise(i)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRentalPremise(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRentalPremisesDialogOpen(false); fetchRentalPremises(); }}>
              Cancel
            </Button>
            <Button onClick={saveRentalPremises} disabled={savingPremises}>
              {savingPremises ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsTab;
