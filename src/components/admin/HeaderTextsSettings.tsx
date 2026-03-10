import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Type, Save, RotateCcw, Smartphone, Monitor } from "lucide-react";
import { useHeaderSettings } from "@/hooks/useHeaderSettings";
import { upsertAppSetting } from "@/lib/appSettingsUtils";
import {
  HEADER_SETTING_DESCRIPTIONS,
  HEADER_SETTING_KEYS,
  HEADER_SETTINGS_DEFAULTS,
  type HeaderSettings,
} from "@/lib/headerSettings";

const HeaderTextsSettings = () => {
  const { settings, isLoading, applySettings } = useHeaderSettings();
  const [formData, setFormData] = useState<HeaderSettings>(HEADER_SETTINGS_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading) {
      setFormData(settings);
    }
  }, [isLoading, settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        HEADER_SETTING_KEYS.map((key) =>
          upsertAppSetting(key, formData[key], HEADER_SETTING_DESCRIPTIONS[key]),
        ),
      );
      applySettings(formData);
      toast({ title: "Settings Saved", description: "Header texts and font sizes have been updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setFormData(HEADER_SETTINGS_DEFAULTS);

  const FontSizeSlider = ({ label, icon: Icon, settingKey, min = 10, max = 60 }: { label: string; icon: typeof Smartphone; settingKey: keyof HeaderSettings; min?: number; max?: number }) => (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <Slider
        value={[parseInt(formData[settingKey]) || 14]}
        onValueChange={([v]) => setFormData((p) => ({ ...p, [settingKey]: v.toString() }))}
        min={min}
        max={max}
        step={1}
        className="flex-1"
      />
      <span className="text-xs font-mono w-10 text-right">{formData[settingKey]}px</span>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Type className="h-5 w-5" />Header Texts</CardTitle>
        </CardHeader>
        <CardContent><p className="text-muted-foreground">Loading...</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="h-5 w-5" />
          தலைப்பு உரைகள் (Header Texts)
        </CardTitle>
        <CardDescription>
          Configure header texts and their font sizes for mobile and desktop. Changes sync in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bismillah */}
        <div className="space-y-3 p-4 rounded-lg border border-border">
          <Label htmlFor="header_bismillah" className="font-semibold">பிஸ்மில்லாஹ் (Bismillah - Arabic)</Label>
          <Input
            id="header_bismillah"
            value={formData.header_bismillah}
            onChange={(e) => setFormData((p) => ({ ...p, header_bismillah: e.target.value }))}
            className="font-arabic text-lg"
            dir="rtl"
          />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Font Size</p>
            <FontSizeSlider label="Mobile" icon={Smartphone} settingKey="header_font_bismillah_mobile" min={8} max={30} />
            <FontSizeSlider label="Desktop" icon={Monitor} settingKey="header_font_bismillah_desktop" min={8} max={30} />
          </div>
        </div>

        {/* Tamil Title */}
        <div className="space-y-3 p-4 rounded-lg border border-border">
          <Label htmlFor="header_title_ta" className="font-semibold">தலைப்பு - தமிழ் (Title - Tamil)</Label>
          <Input
            id="header_title_ta"
            value={formData.header_title_ta}
            onChange={(e) => setFormData((p) => ({ ...p, header_title_ta: e.target.value }))}
          />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Font Size</p>
            <FontSizeSlider label="Mobile" icon={Smartphone} settingKey="header_font_ta_mobile" min={14} max={60} />
            <FontSizeSlider label="Desktop" icon={Monitor} settingKey="header_font_ta_desktop" min={14} max={60} />
          </div>
        </div>

        {/* English Title */}
        <div className="space-y-3 p-4 rounded-lg border border-border">
          <Label htmlFor="header_title_en" className="font-semibold">தலைப்பு - ஆங்கிலம் (Title - English)</Label>
          <Input
            id="header_title_en"
            value={formData.header_title_en}
            onChange={(e) => setFormData((p) => ({ ...p, header_title_en: e.target.value }))}
          />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Font Size</p>
            <FontSizeSlider label="Mobile" icon={Smartphone} settingKey="header_font_en_mobile" min={10} max={30} />
            <FontSizeSlider label="Desktop" icon={Monitor} settingKey="header_font_en_desktop" min={10} max={30} />
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Preview (Desktop sizes shown)</p>
          <p
            className="font-semibold bg-gradient-to-r from-amber-600 via-emerald-600 to-amber-600 bg-clip-text text-transparent"
            dir="rtl"
            style={{ fontSize: `${formData.header_font_bismillah_desktop}px` }}
          >
            {formData.header_bismillah}
          </p>
          <p className="font-bold font-tamil text-primary" style={{ fontSize: `${formData.header_font_ta_desktop}px`, lineHeight: 1.3 }}>
            {formData.header_title_ta}
          </p>
          <p className="text-muted-foreground font-display" style={{ fontSize: `${formData.header_font_en_desktop}px` }}>
            {formData.header_title_en}
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Header Texts"}
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

export default HeaderTextsSettings;
