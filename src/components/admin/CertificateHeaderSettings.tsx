import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, RotateCcw } from "lucide-react";
import {
  CERTIFICATE_HEADER_SETTING_KEYS,
  DEFAULT_CERTIFICATE_HEADER,
  clearCertificateHeaderCache,
} from "@/lib/certificateHeaderSettings";

interface HeaderFormData {
  bismillah: string;
  titleTa: string;
  titleEn: string;
  addressTa: string;
  addressEn: string;
  officeAddressTa: string;
  officeAddressEn: string;
}

const CertificateHeaderSettings = () => {
  const [formData, setFormData] = useState<HeaderFormData>({
    bismillah: DEFAULT_CERTIFICATE_HEADER.bismillah,
    titleTa: DEFAULT_CERTIFICATE_HEADER.titleTa,
    titleEn: DEFAULT_CERTIFICATE_HEADER.titleEn,
    addressTa: DEFAULT_CERTIFICATE_HEADER.addressTa,
    addressEn: DEFAULT_CERTIFICATE_HEADER.addressEn,
    officeAddressTa: DEFAULT_CERTIFICATE_HEADER.officeAddressTa.join("\n"),
    officeAddressEn: DEFAULT_CERTIFICATE_HEADER.officeAddressEn.join("\n"),
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
        .in("key", Object.values(CERTIFICATE_HEADER_SETTING_KEYS));

      if (error) throw error;

      const newFormData: HeaderFormData = {
        bismillah: DEFAULT_CERTIFICATE_HEADER.bismillah,
        titleTa: DEFAULT_CERTIFICATE_HEADER.titleTa,
        titleEn: DEFAULT_CERTIFICATE_HEADER.titleEn,
        addressTa: DEFAULT_CERTIFICATE_HEADER.addressTa,
        addressEn: DEFAULT_CERTIFICATE_HEADER.addressEn,
        officeAddressTa: DEFAULT_CERTIFICATE_HEADER.officeAddressTa.join("\n"),
        officeAddressEn: DEFAULT_CERTIFICATE_HEADER.officeAddressEn.join("\n"),
      };

      if (data) {
        data.forEach((item) => {
          switch (item.key) {
            case CERTIFICATE_HEADER_SETTING_KEYS.bismillah:
              if (item.value) newFormData.bismillah = item.value;
              break;
            case CERTIFICATE_HEADER_SETTING_KEYS.titleTa:
              if (item.value) newFormData.titleTa = item.value;
              break;
            case CERTIFICATE_HEADER_SETTING_KEYS.titleEn:
              if (item.value) newFormData.titleEn = item.value;
              break;
            case CERTIFICATE_HEADER_SETTING_KEYS.addressTa:
              if (item.value) newFormData.addressTa = item.value;
              break;
            case CERTIFICATE_HEADER_SETTING_KEYS.addressEn:
              if (item.value) newFormData.addressEn = item.value;
              break;
            case CERTIFICATE_HEADER_SETTING_KEYS.officeAddressTa:
              if (item.value) {
                try {
                  const parsed = JSON.parse(item.value);
                  if (Array.isArray(parsed)) newFormData.officeAddressTa = parsed.join("\n");
                } catch {}
              }
              break;
            case CERTIFICATE_HEADER_SETTING_KEYS.officeAddressEn:
              if (item.value) {
                try {
                  const parsed = JSON.parse(item.value);
                  if (Array.isArray(parsed)) newFormData.officeAddressEn = parsed.join("\n");
                } catch {}
              }
              break;
          }
        });
      }

      setFormData(newFormData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch header settings.",
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
        { key: CERTIFICATE_HEADER_SETTING_KEYS.bismillah, value: formData.bismillah, description: "Certificate header - Bismillah (Arabic)" },
        { key: CERTIFICATE_HEADER_SETTING_KEYS.titleTa, value: formData.titleTa, description: "Certificate header - Title (Tamil)" },
        { key: CERTIFICATE_HEADER_SETTING_KEYS.titleEn, value: formData.titleEn, description: "Certificate header - Title (English)" },
        { key: CERTIFICATE_HEADER_SETTING_KEYS.addressTa, value: formData.addressTa, description: "Certificate header - Address (Tamil)" },
        { key: CERTIFICATE_HEADER_SETTING_KEYS.addressEn, value: formData.addressEn, description: "Certificate header - Address (English)" },
        {
          key: CERTIFICATE_HEADER_SETTING_KEYS.officeAddressTa,
          value: JSON.stringify(formData.officeAddressTa.split("\n").filter((line) => line.trim())),
          description: "Certificate header - Office Address (Tamil) - JSON array",
        },
        {
          key: CERTIFICATE_HEADER_SETTING_KEYS.officeAddressEn,
          value: JSON.stringify(formData.officeAddressEn.split("\n").filter((line) => line.trim())),
          description: "Certificate header - Office Address (English) - JSON array",
        },
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
      clearCertificateHeaderCache();

      toast({
        title: "Settings Saved",
        description: "Certificate header settings have been updated.",
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
      bismillah: DEFAULT_CERTIFICATE_HEADER.bismillah,
      titleTa: DEFAULT_CERTIFICATE_HEADER.titleTa,
      titleEn: DEFAULT_CERTIFICATE_HEADER.titleEn,
      addressTa: DEFAULT_CERTIFICATE_HEADER.addressTa,
      addressEn: DEFAULT_CERTIFICATE_HEADER.addressEn,
      officeAddressTa: DEFAULT_CERTIFICATE_HEADER.officeAddressTa.join("\n"),
      officeAddressEn: DEFAULT_CERTIFICATE_HEADER.officeAddressEn.join("\n"),
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Certificate Header Settings
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
          <FileText className="h-5 w-5" />
          சான்றிதழ் தலைப்பு அமைப்புகள் (Certificate Header Settings)
        </CardTitle>
        <CardDescription>
          Configure the header content for all certificates (Marriage, Death, NOC, Heir). Changes apply to all certificate types.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bismillah */}
        <div className="space-y-2">
          <Label htmlFor="bismillah" className="text-sm font-medium">
            பிஸ்மில்லாஹ் (Bismillah - Arabic)
          </Label>
          <Input
            id="bismillah"
            value={formData.bismillah}
            onChange={(e) => handleChange("bismillah", e.target.value)}
            className="font-arabic text-lg"
            dir="rtl"
          />
        </div>

        {/* Title Tamil */}
        <div className="space-y-2">
          <Label htmlFor="titleTa" className="text-sm font-medium">
            தலைப்பு - தமிழ் (Header Title - Tamil)
          </Label>
          <Input
            id="titleTa"
            value={formData.titleTa}
            onChange={(e) => handleChange("titleTa", e.target.value)}
          />
        </div>

        {/* Title English */}
        <div className="space-y-2">
          <Label htmlFor="titleEn" className="text-sm font-medium">
            தலைப்பு - ஆங்கிலம் (Header Title - English)
          </Label>
          <Input
            id="titleEn"
            value={formData.titleEn}
            onChange={(e) => handleChange("titleEn", e.target.value)}
          />
        </div>

        {/* Header Address Tamil */}
        <div className="space-y-2">
          <Label htmlFor="addressTa" className="text-sm font-medium">
            தலைப்பு முகவரி - தமிழ் (Header Address - Tamil)
          </Label>
          <Input
            id="addressTa"
            value={formData.addressTa}
            onChange={(e) => handleChange("addressTa", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Displayed below the title in the certificate header
          </p>
        </div>

        {/* Header Address English */}
        <div className="space-y-2">
          <Label htmlFor="addressEn" className="text-sm font-medium">
            தலைப்பு முகவரி - ஆங்கிலம் (Header Address - English)
          </Label>
          <Input
            id="addressEn"
            value={formData.addressEn}
            onChange={(e) => handleChange("addressEn", e.target.value)}
          />
        </div>

        {/* Office Address Tamil */}
        <div className="space-y-2">
          <Label htmlFor="officeAddressTa" className="text-sm font-medium">
            அலுவலக முகவரி - தமிழ் (Office Address - Tamil)
          </Label>
          <Textarea
            id="officeAddressTa"
            value={formData.officeAddressTa}
            onChange={(e) => handleChange("officeAddressTa", e.target.value)}
            rows={5}
            placeholder="Enter each line separately"
          />
          <p className="text-xs text-muted-foreground">
            Enter one line per row. First line should be the label (e.g., "அலுவலகம் :")
          </p>
        </div>

        {/* Office Address English */}
        <div className="space-y-2">
          <Label htmlFor="officeAddressEn" className="text-sm font-medium">
            அலுவலக முகவரி - ஆங்கிலம் (Office Address - English)
          </Label>
          <Textarea
            id="officeAddressEn"
            value={formData.officeAddressEn}
            onChange={(e) => handleChange("officeAddressEn", e.target.value)}
            rows={5}
            placeholder="Enter each line separately"
          />
          <p className="text-xs text-muted-foreground">
            Enter one line per row. First line should be the label (e.g., "Office :")
          </p>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Header Settings"}
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

export default CertificateHeaderSettings;
