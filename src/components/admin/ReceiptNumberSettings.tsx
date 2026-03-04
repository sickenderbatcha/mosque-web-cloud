import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Hash, Save, RotateCcw, RefreshCw } from "lucide-react";
import { upsertAppSetting } from "@/lib/appSettingsUtils";

interface ReceiptTypeConfig {
  key: string; // receipt_type key in receipt_sequences table
  label: string;
  prefixSettingKey: string;
  formatSettingKey: string;
  defaultPrefix: string;
  defaultFormat: string;
}

const RECEIPT_TYPES: ReceiptTypeConfig[] = [
  {
    key: "booking",
    label: "முன்பதிவு ரசீது (Booking Receipt)",
    prefixSettingKey: "receipt_num_prefix_booking",
    formatSettingKey: "receipt_num_format_booking",
    defaultPrefix: "BK-",
    defaultFormat: "",
  },
  {
    key: "donation",
    label: "நன்கொடை ரசீது (Donation Receipt)",
    prefixSettingKey: "receipt_num_prefix_donation",
    formatSettingKey: "receipt_num_format_donation",
    defaultPrefix: "DON-",
    defaultFormat: "",
  },
  {
    key: "subscription",
    label: "சந்தா ரசீது (Subscription Receipt)",
    prefixSettingKey: "receipt_num_prefix_subscription",
    formatSettingKey: "receipt_num_format_subscription",
    defaultPrefix: "SUB-",
    defaultFormat: "",
  },
  {
    key: "cash_payment",
    label: "ரொக்க ரசீது (Cash Payment Receipt)",
    prefixSettingKey: "receipt_num_prefix_cash_payment",
    formatSettingKey: "receipt_num_format_cash_payment",
    defaultPrefix: "CASH-",
    defaultFormat: "",
  },
  {
    key: "certificate_noc",
    label: "NOC சான்றிதழ் ரசீது (NOC Certificate Receipt)",
    prefixSettingKey: "receipt_num_prefix_cert_noc",
    formatSettingKey: "receipt_num_format_certificate_noc",
    defaultPrefix: "NOC-",
    defaultFormat: "",
  },
  {
    key: "certificate_heir",
    label: "வாரிசு சான்றிதழ் ரசீது (Heir Certificate Receipt)",
    prefixSettingKey: "receipt_num_prefix_cert_heir",
    formatSettingKey: "receipt_num_format_certificate_heir",
    defaultPrefix: "HEIR-",
    defaultFormat: "",
  },
  {
    key: "certificate_general",
    label: "பொது சான்றிதழ் ரசீது (General Certificate Receipt)",
    prefixSettingKey: "receipt_num_prefix_cert_general",
    formatSettingKey: "receipt_num_format_certificate_general",
    defaultPrefix: "CERT-",
    defaultFormat: "",
  },
  {
    key: "certificate_death",
    label: "இறப்புச் சான்றிதழ் ரசீது (Death Certificate Receipt)",
    prefixSettingKey: "receipt_num_prefix_cert_death",
    formatSettingKey: "receipt_num_format_certificate_death",
    defaultPrefix: "DEATH-",
    defaultFormat: "",
  },
];

interface ReceiptFormState {
  prefix: string;
  format: string;
  sequence: string;
}

const ReceiptNumberSettings = () => {
  const [formData, setFormData] = useState<Record<string, ReceiptFormState>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch all relevant app_settings keys
      const allKeys = RECEIPT_TYPES.flatMap((rt) => [rt.prefixSettingKey, rt.formatSettingKey]);
      const { data: settingsData, error: settingsError } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", allKeys);

      if (settingsError) throw settingsError;

      // Fetch current sequences for current year
      const { data: seqData, error: seqError } = await supabase
        .from("receipt_sequences")
        .select("receipt_type, last_number, year")
        .eq("year", currentYear);

      if (seqError) throw seqError;

      const settingsMap: Record<string, string> = {};
      settingsData?.forEach((item) => {
        settingsMap[item.key] = item.value;
      });

      const seqMap: Record<string, number> = {};
      seqData?.forEach((item: any) => {
        seqMap[item.receipt_type] = item.last_number;
      });

      const newFormData: Record<string, ReceiptFormState> = {};
      RECEIPT_TYPES.forEach((rt) => {
        newFormData[rt.key] = {
          prefix: settingsMap[rt.prefixSettingKey] ?? rt.defaultPrefix,
          format: settingsMap[rt.formatSettingKey] ?? rt.defaultFormat,
          sequence: ((seqMap[rt.key] ?? 0) + 1).toString(),
        };
      });

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

  const handleChange = (receiptKey: string, field: keyof ReceiptFormState, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [receiptKey]: { ...prev[receiptKey], [field]: value },
    }));
  };

  const getPreview = (receiptKey: string): string => {
    const state = formData[receiptKey];
    if (!state) return "";

    const year = currentYear.toString();
    const seq = parseInt(state.sequence, 10) || 1;

    if (state.format && state.format.trim() !== "") {
      let preview = state.format;
      preview = preview.replace("YYYY", year).replace("YY", year.slice(-2));

      if (preview.includes("NNNN")) {
        preview = preview.replace("NNNN", seq.toString().padStart(4, "0"));
      } else if (preview.includes("NNN")) {
        preview = preview.replace("NNN", seq.toString().padStart(3, "0"));
      } else if (preview.includes("NN")) {
        preview = preview.replace("NN", seq.toString().padStart(2, "0"));
      } else if (preview.includes("N")) {
        preview = preview.replace("N", seq.toString());
      } else {
        preview += seq.toString().padStart(4, "0");
      }
      return preview;
    }

    // Default format: PREFIX + YEAR + '-' + PADDED
    return `${state.prefix}${year}-${seq.toString().padStart(4, "0")}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const rt of RECEIPT_TYPES) {
        const state = formData[rt.key];
        if (!state) continue;

        // Save prefix
        await upsertAppSetting(rt.prefixSettingKey, state.prefix, `Receipt number prefix for ${rt.key}`);

        // Save format (empty string means use default prefix-based format)
        await upsertAppSetting(rt.formatSettingKey, state.format, `Receipt number format pattern for ${rt.key}`);

        // Update sequence in receipt_sequences table
        const seqNum = parseInt(state.sequence, 10);
        if (!isNaN(seqNum) && seqNum >= 1) {
          // We store last_number = next - 1 since the function increments before returning
          const lastNumber = seqNum - 1;
          
          const { data: existing } = await supabase
            .from("receipt_sequences")
            .select("id")
            .eq("receipt_type", rt.key)
            .eq("year", currentYear)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("receipt_sequences")
              .update({ last_number: lastNumber, updated_at: new Date().toISOString() })
              .eq("receipt_type", rt.key)
              .eq("year", currentYear);
          } else {
            await supabase
              .from("receipt_sequences")
              .insert({
                receipt_type: rt.key,
                year: currentYear,
                last_number: lastNumber,
              });
          }
        }
      }

      toast({
        title: "Settings Saved",
        description: "Receipt number format and sequence settings have been updated.",
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
    const newFormData: Record<string, ReceiptFormState> = {};
    RECEIPT_TYPES.forEach((rt) => {
      newFormData[rt.key] = {
        prefix: rt.defaultPrefix,
        format: rt.defaultFormat,
        sequence: "1",
      };
    });
    setFormData(newFormData);
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
          ரசீது எண் வடிவமைப்பு & வரிசை (Receipt Number Format & Sequence)
        </CardTitle>
        <CardDescription>
          Configure the format pattern and sequence for each receipt type. Similar to certificate number settings.
          <br />
          <span className="text-xs text-muted-foreground">
            <strong>Default mode:</strong> Leave "Format Pattern" empty to use prefix-based format (e.g., BK-2026-0001).
            <br />
            <strong>Custom format:</strong> Use YYYY for year, YY for 2-digit year, NNNN/NNN for padded sequence.
            <br />
            Example: <code className="bg-muted px-1 py-0.5 rounded">INPT/BK/YYYY/NNNN</code> → <code className="bg-muted px-1 py-0.5 rounded">INPT/BK/2026/0001</code>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {RECEIPT_TYPES.map((rt) => {
          const state = formData[rt.key];
          if (!state) return null;

          return (
            <div key={rt.key} className="space-y-3 p-4 border rounded-lg">
              <Label className="text-sm font-semibold">{rt.label}</Label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${rt.key}-prefix`} className="text-xs text-muted-foreground">
                    Prefix (default mode)
                  </Label>
                  <Input
                    id={`${rt.key}-prefix`}
                    value={state.prefix}
                    onChange={(e) => handleChange(rt.key, "prefix", e.target.value)}
                    placeholder={rt.defaultPrefix}
                    disabled={!!state.format.trim()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${rt.key}-format`} className="text-xs text-muted-foreground">
                    Format Pattern (optional)
                  </Label>
                  <Input
                    id={`${rt.key}-format`}
                    value={state.format}
                    onChange={(e) => handleChange(rt.key, "format", e.target.value)}
                    placeholder="e.g. INPT/BK/YYYY/NNNN"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${rt.key}-seq`} className="text-xs text-muted-foreground">
                    Next Sequence ({currentYear})
                  </Label>
                  <Input
                    id={`${rt.key}-seq`}
                    type="number"
                    min="1"
                    value={state.sequence}
                    onChange={(e) => handleChange(rt.key, "sequence", e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">Preview of next receipt number:</p>
                <p className="text-sm font-bold font-mono">{getPreview(rt.key)}</p>
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving} className="h-auto whitespace-normal">
            <Save className="h-4 w-4 mr-2 shrink-0" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          <Button variant="outline" onClick={handleReset} className="h-auto whitespace-normal">
            <RotateCcw className="h-4 w-4 mr-2 shrink-0" />
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={fetchSettings} className="h-auto whitespace-normal">
            <RefreshCw className="h-4 w-4 mr-2 shrink-0" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceiptNumberSettings;
