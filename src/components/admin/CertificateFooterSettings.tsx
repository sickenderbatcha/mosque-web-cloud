import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, RotateCcw } from "lucide-react";
import {
  CERTIFICATE_FOOTER_TYPES,
  DEFAULT_CERTIFICATE_FOOTERS,
  certificateFooterKey,
  getCertificateFooterSettings,
  type CertificateFooterSettings as FooterSettings,
  type CertificateFooterType,
} from "@/lib/certificateFooterSettings";

const CertificateFooterSettings = () => {
  const [formData, setFormData] = useState<FooterSettings>(DEFAULT_CERTIFICATE_FOOTERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getCertificateFooterSettings()
      .then(setFormData)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (type: CertificateFooterType, lang: "ta" | "en", value: string) =>
    setFormData((prev) => ({ ...prev, [type]: { ...prev[type], [lang]: value } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = CERTIFICATE_FOOTER_TYPES.flatMap(({ type, labelEn }) => [
        {
          key: certificateFooterKey(type, "ta"),
          value: formData[type].ta,
          description: `${labelEn} - Footer text (Tamil)`,
        },
        {
          key: certificateFooterKey(type, "en"),
          value: formData[type].en,
          description: `${labelEn} - Footer text (English)`,
        },
      ]);

      const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Certificate footers have been updated.",
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
            <FileText className="h-5 w-5" />
            Certificate Footer Settings
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
          சான்றிதழ் அடிக்குறிப்பு (Certificate Footer Settings)
        </CardTitle>
        <CardDescription>
          Configure the footer text printed at the bottom of each certificate. Leave a field blank to
          hide that footer line.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {CERTIFICATE_FOOTER_TYPES.map(({ type, labelEn, labelTa }) => (
          <div key={type} className="space-y-3 border-b pb-6 last:border-b-0 last:pb-0">
            <h3 className="text-sm font-semibold font-tamil">
              {labelTa} ({labelEn})
            </h3>
            <div className="space-y-2">
              <Label htmlFor={`footer-${type}-ta`} className="text-xs font-medium">
                அடிக்குறிப்பு - தமிழ் (Footer - Tamil)
              </Label>
              <Textarea
                id={`footer-${type}-ta`}
                rows={2}
                value={formData[type].ta}
                onChange={(e) => handleChange(type, "ta", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`footer-${type}-en`} className="text-xs font-medium">
                அடிக்குறிப்பு - ஆங்கிலம் (Footer - English)
              </Label>
              <Textarea
                id={`footer-${type}-en`}
                rows={2}
                value={formData[type].en}
                onChange={(e) => handleChange(type, "en", e.target.value)}
              />
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Certificate Footers"}
          </Button>
          <Button variant="outline" onClick={() => setFormData(DEFAULT_CERTIFICATE_FOOTERS)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CertificateFooterSettings;
