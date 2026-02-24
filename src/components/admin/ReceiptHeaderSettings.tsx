import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Save, RotateCcw } from "lucide-react";
import {
  RECEIPT_HEADER_SETTING_KEYS,
  DEFAULT_RECEIPT_HEADER,
  clearReceiptHeaderCache,
} from "@/lib/receiptHeaderSettings";

interface HeaderFormData {
  organizationNameTa: string;
  organizationNameEn: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  footerMessage: string;
  footerMessageEn: string;
}

const ReceiptHeaderSettings = () => {
  const [formData, setFormData] = useState<HeaderFormData>({
    organizationNameTa: DEFAULT_RECEIPT_HEADER.organizationNameTa,
    organizationNameEn: DEFAULT_RECEIPT_HEADER.organizationNameEn,
    addressLine1: DEFAULT_RECEIPT_HEADER.addressLine1,
    addressLine2: DEFAULT_RECEIPT_HEADER.addressLine2,
    phone: DEFAULT_RECEIPT_HEADER.phone,
    footerMessage: DEFAULT_RECEIPT_HEADER.footerMessage,
    footerMessageEn: DEFAULT_RECEIPT_HEADER.footerMessageEn,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", Object.values(RECEIPT_HEADER_SETTING_KEYS));

      if (error) throw error;

      const newFormData: HeaderFormData = {
        organizationNameTa: DEFAULT_RECEIPT_HEADER.organizationNameTa,
        organizationNameEn: DEFAULT_RECEIPT_HEADER.organizationNameEn,
        addressLine1: DEFAULT_RECEIPT_HEADER.addressLine1,
        addressLine2: DEFAULT_RECEIPT_HEADER.addressLine2,
        phone: DEFAULT_RECEIPT_HEADER.phone,
        footerMessage: DEFAULT_RECEIPT_HEADER.footerMessage,
        footerMessageEn: DEFAULT_RECEIPT_HEADER.footerMessageEn,
      };

      if (data) {
        data.forEach((item) => {
          switch (item.key) {
            case RECEIPT_HEADER_SETTING_KEYS.organizationNameTa:
              if (item.value) newFormData.organizationNameTa = item.value;
              break;
            case RECEIPT_HEADER_SETTING_KEYS.organizationNameEn:
              if (item.value) newFormData.organizationNameEn = item.value;
              break;
            case RECEIPT_HEADER_SETTING_KEYS.addressLine1:
              if (item.value) newFormData.addressLine1 = item.value;
              break;
            case RECEIPT_HEADER_SETTING_KEYS.addressLine2:
              if (item.value) newFormData.addressLine2 = item.value;
              break;
            case RECEIPT_HEADER_SETTING_KEYS.phone:
              if (item.value) newFormData.phone = item.value;
              break;
            case RECEIPT_HEADER_SETTING_KEYS.footerMessage:
              if (item.value) newFormData.footerMessage = item.value;
              break;
            case RECEIPT_HEADER_SETTING_KEYS.footerMessageEn:
              if (item.value) newFormData.footerMessageEn = item.value;
              break;
          }
        });
      }

      setFormData(newFormData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch receipt header settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof HeaderFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { key: RECEIPT_HEADER_SETTING_KEYS.organizationNameTa, value: formData.organizationNameTa, description: "Receipt header - Organization name (Tamil)" },
        { key: RECEIPT_HEADER_SETTING_KEYS.organizationNameEn, value: formData.organizationNameEn, description: "Receipt header - Organization name (English)" },
        { key: RECEIPT_HEADER_SETTING_KEYS.addressLine1, value: formData.addressLine1, description: "Receipt header - Address line 1" },
        { key: RECEIPT_HEADER_SETTING_KEYS.addressLine2, value: formData.addressLine2, description: "Receipt header - Address line 2" },
        { key: RECEIPT_HEADER_SETTING_KEYS.phone, value: formData.phone, description: "Receipt header - Phone number" },
        { key: RECEIPT_HEADER_SETTING_KEYS.footerMessage, value: formData.footerMessage, description: "Receipt header - Footer message (Tamil)" },
        { key: RECEIPT_HEADER_SETTING_KEYS.footerMessageEn, value: formData.footerMessageEn, description: "Receipt header - Footer message (English)" },
      ];

      for (const setting of settingsToSave) {
        const { data: existing } = await supabase
          .from("app_settings")
          .select("id")
          .eq("key", setting.key)
          .single();

        if (existing) {
          await supabase
            .from("app_settings")
            .update({ value: setting.value, updated_at: new Date().toISOString() })
            .eq("key", setting.key);
        } else {
          await supabase.from("app_settings").insert({
            key: setting.key,
            value: setting.value,
            description: setting.description,
          });
        }
      }

      // Clear cache
      clearReceiptHeaderCache();

      toast({
        title: "Settings Saved",
        description: "Receipt header settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      organizationNameTa: DEFAULT_RECEIPT_HEADER.organizationNameTa,
      organizationNameEn: DEFAULT_RECEIPT_HEADER.organizationNameEn,
      addressLine1: DEFAULT_RECEIPT_HEADER.addressLine1,
      addressLine2: DEFAULT_RECEIPT_HEADER.addressLine2,
      phone: DEFAULT_RECEIPT_HEADER.phone,
      footerMessage: DEFAULT_RECEIPT_HEADER.footerMessage,
      footerMessageEn: DEFAULT_RECEIPT_HEADER.footerMessageEn,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Receipt Header Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          ரசீது தலைப்பு அமைப்புகள் (Receipt Header Settings)
        </CardTitle>
        <CardDescription>
          Configure the header content for all receipts (Booking, Donation, Subscription, Certificate). Changes apply to all receipt types.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Organization Name Tamil */}
        <div className="space-y-2">
          <Label htmlFor="orgNameTa" className="text-sm font-medium">
            நிறுவனப் பெயர் - தமிழ் (Organization Name - Tamil)
          </Label>
          <Input
            id="orgNameTa"
            value={formData.organizationNameTa}
            onChange={(e) => handleChange("organizationNameTa", e.target.value)}
          />
        </div>

        {/* Organization Name English */}
        <div className="space-y-2">
          <Label htmlFor="orgNameEn" className="text-sm font-medium">
            நிறுவனப் பெயர் - ஆங்கிலம் (Organization Name - English)
          </Label>
          <Input
            id="orgNameEn"
            value={formData.organizationNameEn}
            onChange={(e) => handleChange("organizationNameEn", e.target.value)}
          />
        </div>

        {/* Address Line 1 */}
        <div className="space-y-2">
          <Label htmlFor="addressLine1" className="text-sm font-medium">
            முகவரி வரி 1 (Address Line 1)
          </Label>
          <Input
            id="addressLine1"
            value={formData.addressLine1}
            onChange={(e) => handleChange("addressLine1", e.target.value)}
          />
        </div>

        {/* Address Line 2 */}
        <div className="space-y-2">
          <Label htmlFor="addressLine2" className="text-sm font-medium">
            முகவரி வரி 2 (Address Line 2)
          </Label>
          <Input
            id="addressLine2"
            value={formData.addressLine2}
            onChange={(e) => handleChange("addressLine2", e.target.value)}
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">
            தொலைபேசி எண் (Phone Number)
          </Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>

        {/* Footer Message Tamil */}
        <div className="space-y-2">
          <Label htmlFor="footerMessage" className="text-sm font-medium">
            அடிக்குறிப்பு செய்தி - தமிழ் (Footer Message - Tamil)
          </Label>
          <Textarea
            id="footerMessage"
            value={formData.footerMessage}
            onChange={(e) => handleChange("footerMessage", e.target.value)}
            rows={2}
          />
        </div>

        {/* Footer Message English */}
        <div className="space-y-2">
          <Label htmlFor="footerMessageEn" className="text-sm font-medium">
            அடிக்குறிப்பு செய்தி - ஆங்கிலம் (Footer Message - English)
          </Label>
          <Textarea
            id="footerMessageEn"
            value={formData.footerMessageEn}
            onChange={(e) => handleChange("footerMessageEn", e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Receipt Header Settings"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceiptHeaderSettings;
