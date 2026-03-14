import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { upsertAppSetting } from "@/lib/appSettingsUtils";
import { clearHomepageHeroCache } from "@/hooks/useHomepageHero";
import { clearHomepageVideoCache } from "@/hooks/useHomepageVideo";
import { useTheme, themeInfo, ThemeColor } from "@/hooks/useTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings, Edit, Plus, Trash2, RefreshCw, Mail, Key, Calendar, FileText, Upload, Image, Home, Video, X, Palette, Check, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useMenuVisibility, defaultMenuVisibility, type MenuVisibilityConfig } from "@/hooks/useMenuVisibility";
import { Clock } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import HomepageSectionOrderManager from "@/components/admin/HomepageSectionOrderManager";
import CertificateHeaderSettings from "@/components/admin/CertificateHeaderSettings";
import ReceiptHeaderSettings from "@/components/admin/ReceiptHeaderSettings";
import HeaderTextsSettings from "@/components/admin/HeaderTextsSettings";
import ReceiptNumberSettings from "@/components/admin/ReceiptNumberSettings";
import ReceiptSequenceResetSettings from "@/components/admin/ReceiptSequenceResetSettings";
import HeirCertificateFontSettings from "@/components/admin/HeirCertificateFontSettings";
import DeathCertificateFontSettings from "@/components/admin/DeathCertificateFontSettings";
import HeirCertificateNumberSettings from "@/components/admin/HeirCertificateNumberSettings";
import NocCertificateNumberSettings from "@/components/admin/NocCertificateNumberSettings";
import MarriageCertificateNumberSettings from "@/components/admin/MarriageCertificateNumberSettings";
import DeathCertificateNumberSettings from "@/components/admin/DeathCertificateNumberSettings";
import OutsideMarriageCertificateNumberSettings from "@/components/admin/OutsideMarriageCertificateNumberSettings";

interface AppSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const SuperAdminSettingsTab = () => {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<AppSetting | null>(null);
  const [formData, setFormData] = useState({
    key: "",
    value: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  
  // Hero states
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null);
  const [heroBrightness, setHeroBrightness] = useState<number>(100);
  const [savingBrightness, setSavingBrightness] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingHeroVideo, setUploadingHeroVideo] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const heroVideoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { theme: currentTheme, setTheme } = useTheme();

  // Booking timeout state
  const [bookingTimeoutHours, setBookingTimeoutHours] = useState<number>(24);
  const [savingTimeout, setSavingTimeout] = useState(false);

  // OTP verification toggle state
  const [otpRequired, setOtpRequired] = useState(true);
  const [savingOtpSetting, setSavingOtpSetting] = useState(false);

  // Booking alert message state
  const [bookingAlertMessage, setBookingAlertMessage] = useState("தேதி கிடைக்கிறதா என்பது நிர்வாகத்தால் சரிபார்க்கப்படும். உங்கள் முன்பதிவு நிலை குறித்து தொலைபேசி வழியாக அறிவிக்கப்படும்.");
  const [savingAlertMessage, setSavingAlertMessage] = useState(false);

  // Footer credit text state
  const [footerCreditText, setFooterCreditText] = useState("Developed by Panduvan Batcha for the Masjid Administration");
  const [savingFooterCredit, setSavingFooterCredit] = useState(false);
  const [footerCreditThumbnail, setFooterCreditThumbnail] = useState("");
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Hero overlay color state
  const [heroOverlayColor, setHeroOverlayColor] = useState("155 82% 20%");
  const [savingOverlayColor, setSavingOverlayColor] = useState(false);

  // Menu & Card Visibility state
  const { visibility: liveVisibility } = useMenuVisibility();
  const [menuVisibility, setMenuVisibility] = useState<MenuVisibilityConfig>(defaultMenuVisibility);
  const [savingVisibility, setSavingVisibility] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchHeroImage();
    fetchHeroVideo();
    fetchHeroBrightness();
    fetchBookingTimeout();
    fetchOtpSetting();
    fetchBookingAlertMessage();
    fetchFooterCreditText();
    fetchHeroOverlayColor();
  }, []);

  // Sync live visibility into local edit state when it loads
  useEffect(() => {
    setMenuVisibility(liveVisibility);
  }, [JSON.stringify(liveVisibility)]);

  const fetchOtpSetting = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "booking_otp_required")
        .maybeSingle();

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

  const fetchBookingAlertMessage = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "booking_alert_message")
        .maybeSingle();
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

  const fetchFooterCreditText = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["footer_credit_text", "footer_credit_thumbnail"]);
      if (error) {
        console.error("Error fetching footer credit settings:", error);
        return;
      }
      if (data) {
        data.forEach((item) => {
          if (item.key === "footer_credit_text") setFooterCreditText(item.value);
          if (item.key === "footer_credit_thumbnail") setFooterCreditThumbnail(item.value);
        });
      }
    } catch (error) {
      console.error("Error fetching footer credit settings:", error);
    }
  };

  const saveFooterCreditText = async () => {
    setSavingFooterCredit(true);
    try {
      await upsertAppSetting("footer_credit_text", footerCreditText, "Credit text displayed in the website footer");

      toast({
        title: "Footer Credit Updated",
        description: "Footer credit text has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save footer credit text.",
        variant: "destructive",
      });
    } finally {
      setSavingFooterCredit(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB allowed.", variant: "destructive" });
      return;
    }
    setUploadingThumbnail(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `footer-credit-thumbnail.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("certificate-assets")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("certificate-assets").getPublicUrl(fileName);
      const url = urlData.publicUrl + "?t=" + Date.now();
      await upsertAppSetting("footer_credit_thumbnail", url, "Thumbnail photo next to footer credit text");
      setFooterCreditThumbnail(url);
      toast({ title: "Thumbnail Uploaded", description: "Footer credit thumbnail saved." });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const removeThumbnail = async () => {
    try {
      await upsertAppSetting("footer_credit_thumbnail", "", "Thumbnail photo next to footer credit text");
      setFooterCreditThumbnail("");
      toast({ title: "Thumbnail Removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const heroOverlayPresets = [
    { label: "Deep Green", value: "155 82% 20%", preview: "hsl(155 82% 20%)" },
    { label: "Dark Blue", value: "220 70% 20%", preview: "hsl(220 70% 20%)" },
    { label: "Dark Teal", value: "180 60% 18%", preview: "hsl(180 60% 18%)" },
    { label: "Dark Purple", value: "270 60% 25%", preview: "hsl(270 60% 25%)" },
    { label: "Dark Rose", value: "340 75% 25%", preview: "hsl(340 75% 25%)" },
    { label: "Black", value: "0 0% 5%", preview: "hsl(0 0% 5%)" },
  ];

  const fetchHeroOverlayColor = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "hero_overlay_color")
        .maybeSingle();
      if (data && !error) {
        setHeroOverlayColor(data.value);
      }
    } catch (error) {
      console.error("Error fetching hero overlay color:", error);
    }
  };

  const saveHeroOverlayColor = async (value: string) => {
    setSavingOverlayColor(true);
    try {
      await upsertAppSetting("hero_overlay_color", value, "Hero section overlay gradient color (HSL values)");

      setHeroOverlayColor(value);
      toast({
        title: "Hero Overlay Color Updated",
        description: "The hero section overlay color has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save hero overlay color.",
        variant: "destructive",
      });
    } finally {
      setSavingOverlayColor(false);
    }
  };

  const fetchBookingTimeout = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "booking_payment_timeout_hours")
        .maybeSingle();
      
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

  const fetchHeroBrightness = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "hero_brightness")
        .maybeSingle();
      
      if (data && !error) {
        const brightness = parseInt(data.value, 10);
        if (!isNaN(brightness) && brightness >= 0 && brightness <= 100) {
          setHeroBrightness(brightness);
        }
      }
    } catch (error) {
      console.error("Error fetching hero brightness:", error);
    }
  };

  const saveHeroBrightness = async (value: number) => {
    setSavingBrightness(true);
    try {
      await upsertAppSetting("hero_brightness", value.toString(), "Hero background image brightness level (0-100)");

      toast({
        title: "Brightness Updated",
        description: `Hero background brightness set to ${value}%`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save brightness setting.",
        variant: "destructive",
      });
    } finally {
      setSavingBrightness(false);
    }
  };

  const saveColorTheme = async (themeValue: ThemeColor) => {
    setSavingTheme(true);
    try {
      await upsertAppSetting("color_theme", themeValue, "Website color theme");

      setTheme(themeValue);

      toast({
        title: "Theme Updated",
        description: `Color theme changed to ${themeInfo[themeValue].name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save theme setting.",
        variant: "destructive",
      });
    } finally {
      setSavingTheme(false);
    }
  };

  const fetchHeroImage = async () => {
    try {
      const { data: heroData } = await supabase.storage
        .from("certificate-assets")
        .list("", { search: "homepage-hero" });
      
      if (heroData && heroData.length > 0) {
        const heroFile = heroData.find((f) =>
          f.name.toLowerCase().startsWith("homepage-hero.")
        );
        if (heroFile) {
          const { data: heroUrlData } = supabase.storage
            .from("certificate-assets")
            .getPublicUrl(heroFile.name);
          setHeroImageUrl(heroUrlData.publicUrl + "?t=" + Date.now());
        }
      }
    } catch (error) {
      console.error("Error fetching hero image:", error);
    }
  };

  const fetchHeroVideo = async () => {
    try {
      const { data: videoData } = await supabase.storage
        .from("certificate-assets")
        .list("", { search: "homepage-hero-video" });
      
      if (videoData && videoData.length > 0) {
        const videoFile = videoData.find((f) =>
          f.name.toLowerCase().startsWith("homepage-hero-video.")
        );
        if (videoFile) {
          const { data: videoUrlData } = supabase.storage
            .from("certificate-assets")
            .getPublicUrl(videoFile.name);
          setHeroVideoUrl(videoUrlData.publicUrl + "?t=" + Date.now());
        }
      }
    } catch (error) {
      console.error("Error fetching hero video:", error);
    }
  };

  const handleHeroUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingHero(true);
    try {
      const { data: existingFiles } = await supabase.storage
        .from("certificate-assets")
        .list("", { search: "homepage-hero" });
      
      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from("certificate-assets")
          .remove(existingFiles.map(f => f.name));
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `homepage-hero.${fileExt}`;
      
      const { error } = await supabase.storage
        .from("certificate-assets")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("certificate-assets")
        .getPublicUrl(fileName);
      
      clearHomepageHeroCache();
      setHeroImageUrl(urlData.publicUrl + "?t=" + Date.now());

      toast({
        title: "Hero Image Uploaded",
        description: "Homepage background image has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload hero image.",
        variant: "destructive",
      });
    } finally {
      setUploadingHero(false);
      if (heroInputRef.current) {
        heroInputRef.current.value = "";
      }
    }
  };

  const handleHeroVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid File",
        description: "Please upload a video file (MP4, WebM, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Video file must be less than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingHeroVideo(true);
    try {
      const { data: existingFiles } = await supabase.storage
        .from("certificate-assets")
        .list("", { search: "homepage-hero-video" });
      
      if (existingFiles && existingFiles.length > 0) {
        const videoFiles = existingFiles.filter(f => f.name.startsWith("homepage-hero-video"));
        if (videoFiles.length > 0) {
          await supabase.storage
            .from("certificate-assets")
            .remove(videoFiles.map(f => f.name));
        }
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `homepage-hero-video.${fileExt}`;
      
      const { error } = await supabase.storage
        .from("certificate-assets")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("certificate-assets")
        .getPublicUrl(fileName);
      
      clearHomepageVideoCache();
      setHeroVideoUrl(urlData.publicUrl + "?t=" + Date.now());

      toast({
        title: "Hero Video Uploaded",
        description: "Homepage background video has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload hero video.",
        variant: "destructive",
      });
    } finally {
      setUploadingHeroVideo(false);
      if (heroVideoInputRef.current) {
        heroVideoInputRef.current.value = "";
      }
    }
  };

  const handleDeleteHeroVideo = async () => {
    try {
      const { data: existingFiles } = await supabase.storage
        .from("certificate-assets")
        .list("", { search: "homepage-hero-video" });
      
      if (existingFiles && existingFiles.length > 0) {
        const videoFiles = existingFiles.filter(f => f.name.startsWith("homepage-hero-video"));
        if (videoFiles.length > 0) {
          await supabase.storage
            .from("certificate-assets")
            .remove(videoFiles.map(f => f.name));
        }
      }

      clearHomepageVideoCache();
      setHeroVideoUrl(null);

      toast({
        title: "Video Removed",
        description: "Homepage will now show the hero image instead of video.",
      });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete hero video.",
        variant: "destructive",
      });
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
      setSettings(data || []);
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

  const openAddDialog = () => {
    setSelectedSetting(null);
    setFormData({ key: "", value: "", description: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (setting: AppSetting) => {
    setSelectedSetting(setting);
    setFormData({
      key: setting.key,
      value: setting.value,
      description: setting.description || "",
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (setting: AppSetting) => {
    setSelectedSetting(setting);
    setDeleteDialogOpen(true);
  };

  const saveSetting = async () => {
    if (!formData.key.trim() || !formData.value.trim()) {
      toast({
        title: "Error",
        description: "Key and value are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const formattedKey = formData.key.toLowerCase().replace(/\s+/g, "_");

      if (selectedSetting) {
        const { error } = await supabase
          .from("app_settings")
          .update({
            value: formData.value,
            description: formData.description || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedSetting.id);

        if (error) throw error;
        toast({
          title: "Setting Updated",
          description: `"${formattedKey}" has been updated successfully.`,
        });
      } else {
        const { data: existing } = await supabase
          .from("app_settings")
          .select("id")
          .eq("key", formattedKey)
          .maybeSingle();

        if (existing) {
          toast({
            title: "Error",
            description: `A setting with key "${formattedKey}" already exists.`,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }

        const { error } = await supabase.from("app_settings").insert({
          key: formattedKey,
          value: formData.value,
          description: formData.description || null,
        });

        if (error) throw error;
        toast({
          title: "Setting Created",
          description: `"${formattedKey}" has been created successfully.`,
        });
      }

      setDialogOpen(false);
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save setting.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteSetting = async () => {
    if (!selectedSetting) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .delete()
        .eq("id", selectedSetting.id);

      if (error) throw error;

      toast({
        title: "Setting Deleted",
        description: `"${selectedSetting.key}" has been deleted.`,
      });
      setDeleteDialogOpen(false);
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete setting.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSettingIcon = (key: string) => {
    if (key.includes("email")) return <Mail className="h-4 w-4 text-blue-500" />;
    if (key.includes("subscription")) return <Calendar className="h-4 w-4 text-emerald-500" />;
    if (key.includes("certificate") || key.includes("trustee")) return <FileText className="h-4 w-4 text-purple-500" />;
    return <Key className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Homepage Hero Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Hero Settings (ஹீரோ அமைப்புகள்)
          </CardTitle>
          <CardDescription>
            Configure the homepage hero section background and display settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hero Image Section */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Image className="h-4 w-4" />
              Background Image (Fallback)
            </h4>
            <div className="flex flex-col items-center gap-4">
              {heroImageUrl ? (
                <div className="relative w-full max-w-md">
                  <img 
                    src={heroImageUrl} 
                    alt="Homepage Hero" 
                    className="w-full h-40 object-cover border rounded"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full max-w-md h-40 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-sm">
                  No custom hero image uploaded (using default)
                </div>
              )}
              <input
                type="file"
                ref={heroInputRef}
                onChange={handleHeroUpload}
                accept="image/*"
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => heroInputRef.current?.click()}
                disabled={uploadingHero}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingHero ? "Uploading..." : heroImageUrl ? "Change Hero Image" : "Upload Hero Image"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This image is used as a fallback if no video is uploaded, or on mobile devices.
            </p>
          </div>

          {/* Hero Video Section */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Video className="h-4 w-4" />
              Background Video (Optional)
            </h4>
            <div className="flex flex-col items-center gap-4">
              {heroVideoUrl ? (
                <div className="relative w-full max-w-md">
                  <video 
                    src={heroVideoUrl} 
                    className="w-full h-40 object-cover border rounded"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={handleDeleteHeroVideo}
                    title="Remove video"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-full max-w-md h-40 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-sm">
                  No hero video uploaded (showing image)
                </div>
              )}
              <input
                type="file"
                ref={heroVideoInputRef}
                onChange={handleHeroVideoUpload}
                accept="video/*"
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => heroVideoInputRef.current?.click()}
                disabled={uploadingHeroVideo}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingHeroVideo ? "Uploading..." : heroVideoUrl ? "Change Hero Video" : "Upload Hero Video"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Maximum file size: 50MB. MP4 format recommended. Video will autoplay on loop.
            </p>
          </div>

          {/* Hero Brightness Section */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Image className="h-4 w-4" />
              Background Brightness
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-12">Dark</span>
                <Slider
                  value={[heroBrightness]}
                  onValueChange={(values) => setHeroBrightness(values[0])}
                  min={10}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-12 text-right">Bright</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Current: {heroBrightness}%</span>
                <Button 
                  size="sm" 
                  onClick={() => saveHeroBrightness(heroBrightness)}
                  disabled={savingBrightness}
                >
                  {savingBrightness ? "Saving..." : "Save Brightness"}
                </Button>
              </div>
              
              {/* Live Preview */}
              <div 
                className="relative w-full h-24 rounded overflow-hidden border"
                style={{
                  backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : undefined,
                  backgroundColor: !heroImageUrl ? '#1a1a2e' : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    backgroundColor: `rgba(0, 0, 0, ${1 - (heroBrightness / 100)})`,
                  }}
                >
                  <span className="text-white font-semibold text-lg drop-shadow-lg">Preview Text</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Lower brightness makes the background darker, improving text readability.
              </p>
            </div>
          </div>

          {/* Hero Overlay Color Section */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Overlay Color (ஹீரோ மேலடுக்கு நிறம்)
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              Choose the color of the gradient overlay on the hero section. This affects the tint over the background image/video.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
              {heroOverlayPresets.map((preset) => {
                const isSelected = heroOverlayColor === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => setHeroOverlayColor(preset.value)}
                    className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute -mt-1 -mr-1 self-end">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div
                      className="w-10 h-10 rounded-full mb-1 shadow-inner"
                      style={{ backgroundColor: preset.preview }}
                    />
                    <span className="text-xs text-center">{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom HSL Input */}
            <div className="flex items-center gap-3 mb-4">
              <Label htmlFor="customOverlayColor" className="text-sm whitespace-nowrap">Custom HSL:</Label>
              <Input
                id="customOverlayColor"
                value={heroOverlayColor}
                onChange={(e) => setHeroOverlayColor(e.target.value)}
                placeholder="e.g., 155 82% 20%"
                className="max-w-xs"
              />
              <div
                className="w-8 h-8 rounded-full border shrink-0"
                style={{ backgroundColor: `hsl(${heroOverlayColor})` }}
              />
            </div>

            {/* Live Preview */}
            <div 
              className="relative w-full h-24 rounded overflow-hidden border mb-3"
              style={{
                backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : undefined,
                backgroundColor: !heroImageUrl ? '#1a1a2e' : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `linear-gradient(180deg, hsl(${heroOverlayColor} / 0.95) 0%, hsl(${heroOverlayColor} / 0.85) 100%)`,
                }}
              >
                <span className="text-white font-semibold text-lg drop-shadow-lg">Overlay Preview</span>
              </div>
            </div>

            <Button 
              size="sm" 
              onClick={() => saveHeroOverlayColor(heroOverlayColor)}
              disabled={savingOverlayColor}
            >
              {savingOverlayColor ? "Saving..." : "Save Overlay Color"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Color Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Theme
          </CardTitle>
          <CardDescription>
            Choose a color theme for your website. Current theme: <span className="font-semibold text-primary">{themeInfo[currentTheme].name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {(Object.keys(themeInfo) as ThemeColor[]).map((themeKey) => {
              const info = themeInfo[themeKey];
              const isSelected = currentTheme === themeKey;
              return (
                <button
                  key={themeKey}
                  onClick={() => saveColorTheme(themeKey)}
                  disabled={savingTheme}
                  className={`relative flex flex-col items-center p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className="w-12 h-12 rounded-full mb-2 shadow-inner"
                    style={{ backgroundColor: info.preview }}
                  />
                  <span className="text-sm font-medium">{info.name}</span>
                  <span className="text-xs text-muted-foreground text-center">
                    {info.description}
                  </span>
                </button>
              );
            })}
          </div>
          {savingTheme && (
            <p className="text-sm text-muted-foreground mt-4 text-center">Applying theme...</p>
          )}
        </CardContent>
      </Card>

      {/* Booking Settings */}
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
                <span
                  className={
                    otpRequired
                      ? "text-sm font-medium text-primary"
                      : "text-sm font-medium text-muted-foreground"
                  }
                >
                  {otpRequired ? "Required" : "Not Required"}
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

      {/* Homepage Section Order */}
      <HomepageSectionOrderManager />

      {/* Menu & Card Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Menu & Card Visibility (மெனு தெரிவுநிலை)
          </CardTitle>
          <CardDescription>
            Toggle which navigation items and homepage service cards are visible to all users. Changes apply instantly via realtime sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nav Items */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium text-sm mb-2">Navigation Menu Items</h4>
            {[
              { key: "nav_home" as const, label: "முகப்பு / Home" },
              { key: "nav_about" as const, label: "ஐ.என்.பி பற்றி / About I.N.P." },
              { key: "nav_members" as const, label: "உறுப்பினர்கள் / Members" },
              { key: "nav_blood_donors" as const, label: "இரத்த தானம் / Blood Donors" },
              { key: "nav_gallery" as const, label: "புகைப்படங்கள் / Gallery" },
              { key: "nav_financial_statement" as const, label: "நிதிநிலை அறிக்கை / Financial Statement" },
              { key: "nav_events" as const, label: "நிகழ்வுகள் / Events" },
              { key: "nav_grievances" as const, label: "புகார்கள் / Grievances" },
              { key: "nav_contact" as const, label: "தொடர்பு / Contact" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm font-tamil">{label}</span>
                <Switch
                  checked={menuVisibility[key]}
                  onCheckedChange={(val) => setMenuVisibility((prev) => ({ ...prev, [key]: val }))}
                />
              </div>
            ))}
          </div>

          {/* Online Services Dropdown Items */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium text-sm mb-2">Online Services Dropdown Items</h4>
            {[
              { key: "nav_service_mahal" as const, label: "மஹால் முன்பதிவு / Mahal Booking" },
              { key: "nav_service_donation" as const, label: "நன்கொடை / Donation" },
              { key: "nav_service_certificates" as const, label: "சான்றிதழ்கள் / Certificates" },
              { key: "nav_service_my_bookings" as const, label: "என் முன்பதிவுகள் / My Bookings & Refunds" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm font-tamil">{label}</span>
                <Switch
                  checked={menuVisibility[key]}
                  onCheckedChange={(val) => setMenuVisibility((prev) => ({ ...prev, [key]: val }))}
                />
              </div>
            ))}
          </div>

          {/* Homepage Service Cards */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium text-sm mb-2">Homepage Service Cards</h4>
            {[
              { key: "card_mahal" as const, label: "மஹால் முன்பதிவு / Mahal Booking Card" },
              { key: "card_donation" as const, label: "நன்கொடை / Donation Card" },
              { key: "card_certificates" as const, label: "சான்றிதழ்கள் / Certificates Card" },
              { key: "card_events" as const, label: "நிகழ்வுகள் / Events Card" },
              { key: "card_my_bookings" as const, label: "என் முன்பதிவுகள் / My Bookings Card" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm font-tamil">{label}</span>
                <Switch
                  checked={menuVisibility[key]}
                  onCheckedChange={(val) => setMenuVisibility((prev) => ({ ...prev, [key]: val }))}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={async () => {
                setSavingVisibility(true);
                try {
                  await upsertAppSetting("menu_visibility", JSON.stringify(menuVisibility), "Controls which nav items and homepage service cards are visible to users");
                  toast({ title: "Visibility Updated", description: "Menu and card visibility settings saved and applied to all users." });
                } catch (err: any) {
                  toast({ title: "Error", description: err.message || "Failed to save visibility settings.", variant: "destructive" });
                } finally {
                  setSavingVisibility(false);
                }
              }}
              disabled={savingVisibility}
            >
              {savingVisibility ? "Saving..." : "Save Visibility Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header Texts Settings - Bismillah, Tamil & English titles */}
      <HeaderTextsSettings />

      {/* Certificate Header Settings - applies to all certificates */}
      <CertificateHeaderSettings />

      {/* Receipt Header Settings - applies to all receipts */}
      <ReceiptHeaderSettings />

      {/* Receipt Number Settings - configurable prefixes for each receipt type */}
      <ReceiptNumberSettings />

      {/* Receipt Sequence Reset - reset/override sequential counters */}
      <ReceiptSequenceResetSettings />

      {/* Footer Credit Text Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Footer Credit Text (அடிக்குறிப்பு உரை)
          </CardTitle>
          <CardDescription>
            Configure the developer/credit text displayed in the website footer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <Label htmlFor="footerCreditText" className="text-sm font-medium mb-2 block">
              Credit Text
            </Label>
            <Input
              id="footerCreditText"
              value={footerCreditText}
              onChange={(e) => setFooterCreditText(e.target.value)}
              placeholder="e.g., Developed by Panduvan Batcha for the Masjid Administration"
            />
            <p className="text-xs text-muted-foreground mt-2">
              This text appears at the bottom of every page in the footer.
            </p>
            <div className="flex justify-end mt-3">
              <Button
                size="sm"
                onClick={saveFooterCreditText}
                disabled={savingFooterCredit}
              >
                {savingFooterCredit ? "Saving..." : "Save Footer Text"}
              </Button>
            </div>
          </div>
          <div className="p-4 border rounded-lg">
            <Label className="text-sm font-medium mb-2 block">
              Credit Thumbnail Photo
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Upload a small photo/logo to display next to the credit text in the footer. Max 2MB.
            </p>
            {footerCreditThumbnail ? (
              <div className="flex items-center gap-4">
                <img
                  src={footerCreditThumbnail}
                  alt="Credit thumbnail"
                  className="h-12 w-12 rounded-full object-cover border"
                />
                <div className="flex gap-2">
                  <Label htmlFor="thumbnail-replace" className="cursor-pointer">
                    <Button size="sm" variant="outline" asChild>
                      <span><Upload className="h-3 w-3 mr-1" />Replace</span>
                    </Button>
                  </Label>
                  <input
                    id="thumbnail-replace"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailUpload}
                  />
                  <Button size="sm" variant="destructive" onClick={removeThumbnail}>
                    <Trash2 className="h-3 w-3 mr-1" />Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="thumbnail-upload" className="cursor-pointer">
                  <Button size="sm" variant="outline" asChild disabled={uploadingThumbnail}>
                    <span><Upload className="h-3 w-3 mr-1" />{uploadingThumbnail ? "Uploading..." : "Upload Thumbnail"}</span>
                  </Button>
                </Label>
                <input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailUpload}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Heir Certificate Font Settings */}
      <HeirCertificateFontSettings />

      {/* Death Certificate Font Settings */}
      <DeathCertificateFontSettings />

      {/* Heir Certificate Number Settings */}
      <HeirCertificateNumberSettings />

      {/* NOC Certificate Number Settings */}
      <NocCertificateNumberSettings />

      {/* Marriage Certificate Number Settings */}
      <MarriageCertificateNumberSettings />

      {/* Outside Marriage Certificate Number Settings */}
      <OutsideMarriageCertificateNumberSettings />

      {/* Death Certificate Number Settings */}
      <DeathCertificateNumberSettings />

      {/* App Settings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                App Settings
              </CardTitle>
              <CardDescription>
                Manage application configuration settings
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Setting
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
          ) : settings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No settings configured yet. Click "Add Setting" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="hidden sm:table-cell">Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getSettingIcon(setting.key)}
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">
                          {setting.key}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {setting.value}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {setting.description || "-"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {format(new Date(setting.updated_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(setting)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(setting)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSetting ? "Edit Setting" : "Add New Setting"}
            </DialogTitle>
            <DialogDescription>
              {selectedSetting
                ? "Update the value and description for this setting."
                : "Create a new application setting. The key will be converted to lowercase with underscores."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="e.g., admin_email"
                disabled={!!selectedSetting}
              />
              {!selectedSetting && (
                <p className="text-xs text-muted-foreground">
                  Will be formatted as: {formData.key.toLowerCase().replace(/\s+/g, "_") || "setting_key"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Setting value"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what this setting controls"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSetting} disabled={saving}>
              {saving ? "Saving..." : selectedSetting ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Setting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the setting "{selectedSetting?.key}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteSetting} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminSettingsTab;
