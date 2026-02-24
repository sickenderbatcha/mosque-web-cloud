import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Type, Save, RotateCcw } from "lucide-react";

interface FontSizeConfig {
  key: string;
  label: string;
  labelTamil: string;
  default: number;
}

const FONT_SIZE_CONFIGS: FontSizeConfig[] = [
  { key: "heir_pdf_fs_bismillah", label: "Bismillah", labelTamil: "பிஸ்மில்லாஹ்", default: 9 },
  { key: "heir_pdf_fs_header_ta", label: "Header (Tamil)", labelTamil: "தலைப்பு (தமிழ்)", default: 10 },
  { key: "heir_pdf_fs_header_en", label: "Header (English)", labelTamil: "தலைப்பு (ஆங்கிலம்)", default: 9 },
  { key: "heir_pdf_fs_header_spacing", label: "Header Spacing (mm)", labelTamil: "தலைப்பு இடைவெளி", default: 10 },
  { key: "heir_pdf_fs_header_address_ta", label: "Header Address (Tamil)", labelTamil: "தலைப்பு முகவரி (தமிழ்)", default: 7 },
  { key: "heir_pdf_fs_header_address_en", label: "Header Address (English)", labelTamil: "தலைப்பு முகவரி (ஆங்கிலம்)", default: 7 },
  { key: "heir_pdf_fs_office_address_ta", label: "Office Address (Tamil)", labelTamil: "அலுவலக முகவரி (தமிழ்)", default: 7 },
  { key: "heir_pdf_fs_office_address_en", label: "Office Address (English)", labelTamil: "அலுவலக முகவரி (ஆங்கிலம்)", default: 7 },
  { key: "heir_pdf_fs_office_address_line_spacing", label: "Office Address Line Spacing (mm)", labelTamil: "அலுவலக முகவரி வரி இடைவெளி", default: 4.3 },
  { key: "heir_pdf_fs_reg_row", label: "Reg No & Date", labelTamil: "பதிவு எண் & தேதி", default: 8 },
  { key: "heir_pdf_fs_title", label: "Title", labelTamil: "சான்றிதழ் தலைப்பு", default: 11 },
  { key: "heir_pdf_fs_body", label: "Body Text", labelTamil: "உள்ளடக்கம்", default: 9 },
  { key: "heir_pdf_fs_table_header", label: "Table Header", labelTamil: "அட்டவணை தலைப்பு", default: 8 },
  { key: "heir_pdf_fs_table_cell", label: "Table Cell", labelTamil: "அட்டவணை செல்", default: 7 },
  { key: "heir_pdf_fs_signature", label: "Signature Area", labelTamil: "கையொப்பம்", default: 9 },
];

export const getHeirCertificateFontSizes = async () => {
  const keys = FONT_SIZE_CONFIGS.map(c => c.key);
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", keys);
  
  const defaults: Record<string, number> = {};
  FONT_SIZE_CONFIGS.forEach(c => {
    defaults[c.key] = c.default;
  });
  
  if (data) {
    data.forEach(item => {
      const parsed = parseInt(item.value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        defaults[item.key] = parsed;
      }
    });
  }
  
  return {
    bismillah: defaults["heir_pdf_fs_bismillah"],
    headerTa: defaults["heir_pdf_fs_header_ta"],
    headerEn: defaults["heir_pdf_fs_header_en"],
    headerSpacing: defaults["heir_pdf_fs_header_spacing"],
    headerAddressTa: defaults["heir_pdf_fs_header_address_ta"],
    headerAddressEn: defaults["heir_pdf_fs_header_address_en"],
    officeAddressTa: defaults["heir_pdf_fs_office_address_ta"],
    officeAddressEn: defaults["heir_pdf_fs_office_address_en"],
    officeAddressLineSpacing: defaults["heir_pdf_fs_office_address_line_spacing"],
    regRow: defaults["heir_pdf_fs_reg_row"],
    title: defaults["heir_pdf_fs_title"],
    body: defaults["heir_pdf_fs_body"],
    tableHeader: defaults["heir_pdf_fs_table_header"],
    tableCell: defaults["heir_pdf_fs_table_cell"],
    signature: defaults["heir_pdf_fs_signature"],
  };
};

const HeirCertificateFontSettings = () => {
  const [fontSizes, setFontSizes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFontSizes();
  }, []);

  const fetchFontSizes = async () => {
    setLoading(true);
    try {
      const keys = FONT_SIZE_CONFIGS.map(c => c.key);
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", keys);

      if (error) throw error;

      const sizeMap: Record<string, string> = {};
      FONT_SIZE_CONFIGS.forEach(c => {
        sizeMap[c.key] = c.default.toString();
      });

      if (data) {
        data.forEach(item => {
          sizeMap[item.key] = item.value;
        });
      }

      setFontSizes(sizeMap);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch font sizes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFontSizes(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const config of FONT_SIZE_CONFIGS) {
        const value = fontSizes[config.key] || config.default.toString();
        
        // Check if setting exists
        const { data: existing } = await supabase
          .from("app_settings")
          .select("id")
          .eq("key", config.key)
          .single();

        if (existing) {
          await supabase
            .from("app_settings")
            .update({ value, updated_at: new Date().toISOString() })
            .eq("key", config.key);
        } else {
          await supabase
            .from("app_settings")
            .insert({
              key: config.key,
              value,
              description: `Heir certificate PDF font size - ${config.label}`,
            });
        }
      }

      toast({
        title: "Font Sizes Saved",
        description: "Heir certificate PDF font sizes have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save font sizes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultSizes: Record<string, string> = {};
    FONT_SIZE_CONFIGS.forEach(c => {
      defaultSizes[c.key] = c.default.toString();
    });
    setFontSizes(defaultSizes);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Heir Certificate Font Sizes
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
          <Type className="h-5 w-5" />
          வாரிசு சான்றிதழ் எழுத்து அளவு (Heir Certificate Font Sizes)
        </CardTitle>
        <CardDescription>
          Configure font sizes (in points) for the heir certificate PDF. Lower values = smaller text.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {FONT_SIZE_CONFIGS.map((config) => (
            <div key={config.key} className="space-y-1.5">
              <Label htmlFor={config.key} className="text-sm">
                {config.labelTamil}
                <span className="text-xs text-muted-foreground block">{config.label}</span>
              </Label>
              <Input
                id={config.key}
                type="number"
                min="4"
                max="24"
                value={fontSizes[config.key] || config.default}
                onChange={(e) => handleChange(config.key, e.target.value)}
                className="h-9"
              />
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Font Sizes"}
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

export default HeirCertificateFontSettings;
