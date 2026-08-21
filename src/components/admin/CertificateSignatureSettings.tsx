import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PenLine, Save, RotateCcw } from "lucide-react";
import { upsertAppSetting } from "@/lib/appSettingsUtils";
import {
  CERTIFICATE_SIGNATURE_SETTING_KEYS,
  DEFAULT_CERTIFICATE_SIGNATURE,
} from "@/lib/certificateSignatureSettings";

interface SignatureFormData {
  designationTa: string;
  designationEn: string;
  linesTa: string;
  linesEn: string;
}

const toForm = (
  designationTa: string,
  designationEn: string,
  linesTa: string[],
  linesEn: string[]
): SignatureFormData => ({
  designationTa,
  designationEn,
  linesTa: linesTa.join("\n"),
  linesEn: linesEn.join("\n"),
});

const CertificateSignatureSettings = () => {
  const [formData, setFormData] = useState<SignatureFormData>(
    toForm(
      DEFAULT_CERTIFICATE_SIGNATURE.designationTa,
      DEFAULT_CERTIFICATE_SIGNATURE.designationEn,
      DEFAULT_CERTIFICATE_SIGNATURE.linesTa,
      DEFAULT_CERTIFICATE_SIGNATURE.linesEn
    )
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("key, value")
          .in("key", Object.values(CERTIFICATE_SIGNATURE_SETTING_KEYS));
        if (error) throw error;

        const next = { ...formData };
        (data || []).forEach((item) => {
          if (item.value === null || item.value === undefined) return;
          switch (item.key) {
            case CERTIFICATE_SIGNATURE_SETTING_KEYS.designationTa:
              next.designationTa = item.value;
              break;
            case CERTIFICATE_SIGNATURE_SETTING_KEYS.designationEn:
              next.designationEn = item.value;
              break;
            case CERTIFICATE_SIGNATURE_SETTING_KEYS.linesTa:
            case CERTIFICATE_SIGNATURE_SETTING_KEYS.linesEn: {
              try {
                const parsed = JSON.parse(item.value);
                if (Array.isArray(parsed)) {
                  const joined = parsed.join("\n");
                  if (item.key === CERTIFICATE_SIGNATURE_SETTING_KEYS.linesTa) next.linesTa = joined;
                  else next.linesEn = joined;
                }
              } catch {
                // keep default
              }
              break;
            }
          }
        });
        setFormData(next);
      } catch (error) {
        console.error("Error loading certificate signature settings:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field: keyof SignatureFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const splitLines = (v: string) =>
        JSON.stringify(v.split("\n").map((l) => l.trim()).filter(Boolean));

      await upsertAppSetting(
        CERTIFICATE_SIGNATURE_SETTING_KEYS.designationTa,
        formData.designationTa,
        "Certificate signature block - Designation (Tamil)"
      );
      await upsertAppSetting(
        CERTIFICATE_SIGNATURE_SETTING_KEYS.designationEn,
        formData.designationEn,
        "Certificate signature block - Designation (English)"
      );
      await upsertAppSetting(
        CERTIFICATE_SIGNATURE_SETTING_KEYS.linesTa,
        splitLines(formData.linesTa),
        "Certificate signature block - Extra lines (Tamil) - JSON array"
      );
      await upsertAppSetting(
        CERTIFICATE_SIGNATURE_SETTING_KEYS.linesEn,
        splitLines(formData.linesEn),
        "Certificate signature block - Extra lines (English) - JSON array"
      );

      toast({
        title: "Settings Saved",
        description: "Certificate signature block has been updated.",
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
    setFormData(
      toForm(
        DEFAULT_CERTIFICATE_SIGNATURE.designationTa,
        DEFAULT_CERTIFICATE_SIGNATURE.designationEn,
        DEFAULT_CERTIFICATE_SIGNATURE.linesTa,
        DEFAULT_CERTIFICATE_SIGNATURE.linesEn
      )
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Certificate Signature Block
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
          <PenLine className="h-5 w-5" />
          கையொப்ப விவரங்கள் (Certificate Signature Block)
        </CardTitle>
        <CardDescription>
          Configure the designation and address lines printed under the signature on all certificates
          (Marriage, Death, NOC, Heir) - both previews and PDFs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="designationTa" className="text-sm font-medium">
            பதவி (Designation - Tamil)
          </Label>
          <Input
            id="designationTa"
            value={formData.designationTa}
            onChange={(e) => handleChange("designationTa", e.target.value)}
            className="font-tamil"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="designationEn" className="text-sm font-medium">
            Designation (English)
          </Label>
          <Input
            id="designationEn"
            value={formData.designationEn}
            onChange={(e) => handleChange("designationEn", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="linesTa" className="text-sm font-medium">
            கூடுதல் வரிகள் (Extra Lines - Tamil, one per line)
          </Label>
          <Textarea
            id="linesTa"
            value={formData.linesTa}
            onChange={(e) => handleChange("linesTa", e.target.value)}
            rows={4}
            className="font-tamil"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="linesEn" className="text-sm font-medium">
            Extra Lines (English, one per line)
          </Label>
          <Textarea
            id="linesEn"
            value={formData.linesEn}
            onChange={(e) => handleChange("linesEn", e.target.value)}
            rows={4}
            placeholder="Leave empty to print only the designation on English certificates"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CertificateSignatureSettings;
