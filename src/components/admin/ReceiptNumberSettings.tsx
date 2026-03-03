import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Hash, Save, RotateCcw } from "lucide-react";
import {
  RECEIPT_NUMBER_SETTING_KEYS,
  DEFAULT_RECEIPT_NUMBER_SETTINGS,
  clearReceiptNumberCache,
  ReceiptNumberSettings as ReceiptNumberSettingsType,
} from "@/lib/receiptNumberSettings";

const RECEIPT_TYPE_LABELS: { key: keyof ReceiptNumberSettingsType; label: string; example: string }[] = [
  { key: "booking_prefix", label: "முன்பதிவு ரசீது (Booking Receipt)", example: "BK-" },
  { key: "donation_prefix", label: "நன்கொடை ரசீது (Donation Receipt)", example: "DON-" },
  { key: "subscription_prefix", label: "சந்தா ரசீது (Subscription Receipt)", example: "SUB-" },
  { key: "cash_payment_prefix", label: "ரொக்க ரசீது (Cash Payment Receipt)", example: "CASH-" },
  { key: "certificate_noc_prefix", label: "NOC சான்றிதழ் ரசீது (NOC Certificate Receipt)", example: "NOC-" },
  { key: "certificate_heir_prefix", label: "வாரிசு சான்றிதழ் ரசீது (Heir Certificate Receipt)", example: "HEIR-" },
  { key: "certificate_general_prefix", label: "பொது சான்றிதழ் ரசீது (General Certificate Receipt)", example: "CERT-" },
];

const ReceiptNumberSettings = () => {
  const [formData, setFormData] = useState<ReceiptNumberSettingsType>({ ...DEFAULT_RECEIPT_NUMBER_SETTINGS });
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
        .in("key", Object.values(RECEIPT_NUMBER_SETTING_KEYS));

      if (error) throw error;

      const newFormData: ReceiptNumberSettingsType = { ...DEFAULT_RECEIPT_NUMBER_SETTINGS };

      if (data) {
        data.forEach((item) => {
          const settingKey = Object.entries(RECEIPT_NUMBER_SETTING_KEYS).find(
            ([, v]) => v === item.key
          )?.[0] as keyof ReceiptNumberSettingsType | undefined;
          if (settingKey && item.value) {
            newFormData[settingKey] = item.value;
          }
        });
      }

      setFormData(newFormData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch receipt number settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ReceiptNumberSettingsType, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsToSave = RECEIPT_TYPE_LABELS.map(({ key }) => ({
        key: RECEIPT_NUMBER_SETTING_KEYS[key],
        value: formData[key],
        description: `Receipt number prefix for ${key.replace(/_prefix$/, "").replace(/_/g, " ")}`,
      }));

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

      clearReceiptNumberCache();

      toast({
        title: "Settings Saved",
        description: "Receipt number settings have been updated.",
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
    setFormData({ ...DEFAULT_RECEIPT_NUMBER_SETTINGS });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Receipt Number Settings
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
          <Hash className="h-5 w-5" />
          ரசீது எண் அமைப்புகள் (Receipt Number Settings)
        </CardTitle>
        <CardDescription>
          Configure the prefix/format for each receipt type. The prefix will appear before the unique identifier.
          <br />
          <span className="text-xs text-muted-foreground">
            Example: If prefix is "INPT/BK/" and year is 2026, the receipt number will be "INPT/BK/2026-0001"
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {RECEIPT_TYPE_LABELS.map(({ key, label, example }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key} className="text-sm font-medium">
              {label}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={key}
                value={formData[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={example}
                className="max-w-xs"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Preview: <code className="bg-muted px-1.5 py-0.5 rounded">{formData[key]}2026-0001</code>
              </span>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving} className="h-auto whitespace-normal">
            <Save className="h-4 w-4 mr-2 shrink-0" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          <Button variant="outline" onClick={handleReset} className="h-auto whitespace-normal">
            <RotateCcw className="h-4 w-4 mr-2 shrink-0" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceiptNumberSettings;
