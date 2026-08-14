import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Save, RotateCcw } from "lucide-react";
import {
  DEFAULT_LETTERHEAD_SETTINGS,
  LETTERHEAD_SETTING_KEYS,
  type LetterheadSettings,
} from "@/lib/letterheadSettings";

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
          if (item.key === LETTERHEAD_SETTING_KEYS.footerTa && item.value) next.footerTa = item.value;
          if (item.key === LETTERHEAD_SETTING_KEYS.footerEn && item.value) next.footerEn = item.value;
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
      const rows = [
        {
          key: LETTERHEAD_SETTING_KEYS.footerTa,
          value: formData.footerTa,
          description: "Letterhead - Footer text (Tamil)",
        },
        {
          key: LETTERHEAD_SETTING_KEYS.footerEn,
          value: formData.footerEn,
          description: "Letterhead - Footer text (English)",
        },
      ];

      const { error } = await supabase
        .from("app_settings")
        .upsert(rows, { onConflict: "key" });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Letterhead footer has been updated.",
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
            Letterhead Footer Settings
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
          கடித அடிக்குறிப்பு அமைப்புகள் (Letterhead Footer Settings)
        </CardTitle>
        <CardDescription>
          Configure the footer text printed at the bottom of the letterhead. Independent of receipt settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            {saving ? "Saving..." : "Save Letterhead Footer"}
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
