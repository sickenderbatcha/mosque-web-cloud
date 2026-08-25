import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Save, RotateCcw } from "lucide-react";
import {
  DEFAULT_LETTERHEAD_SETTINGS,
  LETTERHEAD_SETTING_KEYS,
  LETTERHEAD_KEY_TO_FIELD,
  type LetterheadSettings,
} from "@/lib/letterheadSettings";

const DESCRIPTIONS: Record<keyof LetterheadSettings, string> = {
  orgNameTa: "Letterhead - Organization name (Tamil)",
  orgNameEn: "Letterhead - Organization name (English)",
  addressLine1: "Letterhead - Address line 1",
  addressLine2: "Letterhead - Address line 2",
  phone: "Letterhead - Phone number",
  footerTa: "Letterhead - Footer text (Tamil)",
  footerEn: "Letterhead - Footer text (English)",
};

const LetterheadFooterSettings = () => {
  const [formData, setFormData] = useState<LetterheadSettings>(DEFAULT_LETTERHEAD_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("key, value")
          .in("key", Object.values(LETTERHEAD_SETTING_KEYS));

        if (error) throw error;

        const next: LetterheadSettings = { ...DEFAULT_LETTERHEAD_SETTINGS };
        data?.forEach((item) => {
          const field = LETTERHEAD_KEY_TO_FIELD[item.key];
          if (field && item.value) next[field] = item.value;
        });
        setFormData(next);
      } catch (error: any) {
        console.error("Error fetching letterhead settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field: keyof LetterheadSettings, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = (Object.keys(LETTERHEAD_SETTING_KEYS) as (keyof LetterheadSettings)[]).map(
        (field) => ({
          key: LETTERHEAD_SETTING_KEYS[field],
          value: formData[field] ?? "",
          description: DESCRIPTIONS[field],
        })
      );

      const { error } = await supabase
        .from("app_settings")
        .upsert(rows, { onConflict: "key" });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Letterhead header and footer have been updated.",
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Letterhead Header &amp; Footer Settings
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
          <FileSignature className="h-5 w-5" />
          கடிதத் தலைப்பு &amp; அடிக்குறிப்பு அமைப்புகள் (Letterhead Header &amp; Footer)
        </CardTitle>
        <CardDescription>
          Configure the header and footer printed on the letterhead. Independent of receipt settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="lhOrgTa" className="text-sm font-medium">
            நிறுவனப் பெயர் - தமிழ் (Organization Name - Tamil)
          </Label>
          <Input
            id="lhOrgTa"
            value={formData.orgNameTa}
            onChange={(e) => handleChange("orgNameTa", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lhOrgEn" className="text-sm font-medium">
            நிறுவனப் பெயர் - ஆங்கிலம் (Organization Name - English)
          </Label>
          <Input
            id="lhOrgEn"
            value={formData.orgNameEn}
            onChange={(e) => handleChange("orgNameEn", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lhAddr1" className="text-sm font-medium">
            முகவரி வரி 1 (Address Line 1)
          </Label>
          <Input
            id="lhAddr1"
            value={formData.addressLine1}
            onChange={(e) => handleChange("addressLine1", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lhAddr2" className="text-sm font-medium">
            முகவரி வரி 2 (Address Line 2)
          </Label>
          <Input
            id="lhAddr2"
            value={formData.addressLine2}
            onChange={(e) => handleChange("addressLine2", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lhPhone" className="text-sm font-medium">
            தொலைபேசி எண் (Phone Number)
          </Label>
          <Input
            id="lhPhone"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="letterheadFooterTa" className="text-sm font-medium">
            அடிக்குறிப்பு - தமிழ் (Footer - Tamil)
          </Label>
          <Textarea
            id="letterheadFooterTa"
            rows={2}
            value={formData.footerTa}
            onChange={(e) => handleChange("footerTa", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="letterheadFooterEn" className="text-sm font-medium">
            அடிக்குறிப்பு - ஆங்கிலம் (Footer - English)
          </Label>
          <Textarea
            id="letterheadFooterEn"
            rows={2}
            value={formData.footerEn}
            onChange={(e) => handleChange("footerEn", e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Letterhead Settings"}
          </Button>
          <Button variant="outline" onClick={() => setFormData(DEFAULT_LETTERHEAD_SETTINGS)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LetterheadFooterSettings;
