import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, RotateCcw, Hash } from "lucide-react";

const DEFAULT_FORMAT = "HEIR/YYYY/NNN";
const DEFAULT_SEQUENCE = "1";

// Helper to get heir certificate number settings
export const getHeirCertificateNumberSettings = async () => {
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["heir_certificate_number_format", "heir_certificate_sequence"]);

  let format = DEFAULT_FORMAT;
  let sequence = 1;

  if (data) {
    const formatSetting = data.find(d => d.key === "heir_certificate_number_format");
    const sequenceSetting = data.find(d => d.key === "heir_certificate_sequence");
    
    if (formatSetting?.value) format = formatSetting.value;
    if (sequenceSetting?.value) {
      const parsed = parseInt(sequenceSetting.value, 10);
      if (!isNaN(parsed) && parsed > 0) sequence = parsed;
    }
  }

  return { format, sequence };
};

// Generate the certificate number based on format and sequence
export const generateHeirCertificateNumber = async () => {
  const { format, sequence } = await getHeirCertificateNumberSettings();
  const year = new Date().getFullYear().toString();
  
  // Replace placeholders - handle N+ pattern carefully to avoid conflicts
  // with "N" in words like "HEIR" 
  let certNumber = format;
  
  // Find and replace N+ pattern (must be standalone, not part of a word)
  const nMatch = certNumber.match(/(?:^|[^A-Za-z])(N+)(?:[^A-Za-z]|$)/);
  if (nMatch && nMatch[1]) {
    const padding = nMatch[1].length;
    const paddedSeq = sequence.toString().padStart(padding, "0");
    certNumber = certNumber.replace(nMatch[1], paddedSeq);
  }
  
  // Replace year placeholders
  certNumber = certNumber
    .replace("YYYY", year)
    .replace("YY", year.slice(-2));
  
  return certNumber;
};

// Increment the sequence after generating a certificate
export const incrementHeirCertificateSequence = async () => {
  const { sequence } = await getHeirCertificateNumberSettings();
  const newSequence = sequence + 1;
  
  const { data: existing } = await supabase
    .from("app_settings")
    .select("id")
    .eq("key", "heir_certificate_sequence")
    .single();

  if (existing) {
    await supabase
      .from("app_settings")
      .update({ value: newSequence.toString(), updated_at: new Date().toISOString() })
      .eq("key", "heir_certificate_sequence");
  } else {
    await supabase
      .from("app_settings")
      .insert({
        key: "heir_certificate_sequence",
        value: newSequence.toString(),
        description: "Current sequence number for heir certificates",
      });
  }
  
  return newSequence;
};

const HeirCertificateNumberSettings = () => {
  const [format, setFormat] = useState(DEFAULT_FORMAT);
  const [sequence, setSequence] = useState(DEFAULT_SEQUENCE);
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
        .in("key", ["heir_certificate_number_format", "heir_certificate_sequence"]);

      if (error) throw error;

      if (data) {
        const formatSetting = data.find(d => d.key === "heir_certificate_number_format");
        const sequenceSetting = data.find(d => d.key === "heir_certificate_sequence");
        
        if (formatSetting?.value) setFormat(formatSetting.value);
        if (sequenceSetting?.value) setSequence(sequenceSetting.value);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch certificate number settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save format
      const { data: formatExisting } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "heir_certificate_number_format")
        .single();

      if (formatExisting) {
        await supabase
          .from("app_settings")
          .update({ value: format, updated_at: new Date().toISOString() })
          .eq("key", "heir_certificate_number_format");
      } else {
        await supabase
          .from("app_settings")
          .insert({
            key: "heir_certificate_number_format",
            value: format,
            description: "Format for heir certificate numbers (use YYYY for year, NNN for sequence)",
          });
      }

      // Save sequence
      const { data: seqExisting } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "heir_certificate_sequence")
        .single();

      if (seqExisting) {
        await supabase
          .from("app_settings")
          .update({ value: sequence, updated_at: new Date().toISOString() })
          .eq("key", "heir_certificate_sequence");
      } else {
        await supabase
          .from("app_settings")
          .insert({
            key: "heir_certificate_sequence",
            value: sequence,
            description: "Current sequence number for heir certificates",
          });
      }

      toast({
        title: "Settings Saved",
        description: "Heir certificate number settings have been updated.",
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
    setFormat(DEFAULT_FORMAT);
    setSequence(DEFAULT_SEQUENCE);
  };

  // Generate preview of what the certificate number will look like
  const getPreview = () => {
    const year = new Date().getFullYear().toString();
    let preview = format;
    
    // Find and replace N+ pattern (must be standalone, not part of a word)
    const nMatch = preview.match(/(?:^|[^A-Za-z])(N+)(?:[^A-Za-z]|$)/);
    if (nMatch && nMatch[1]) {
      const padding = nMatch[1].length;
      const paddedSeq = sequence.toString().padStart(padding, "0");
      preview = preview.replace(nMatch[1], paddedSeq);
    }
    
    // Replace year placeholders
    preview = preview
      .replace("YYYY", year)
      .replace("YY", year.slice(-2));
    
    return preview;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Heir Certificate Number Settings
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
          வாரிசு சான்றிதழ் எண் (Heir Certificate Number)
        </CardTitle>
        <CardDescription>
          Configure the format and sequence for heir certificate numbers. Use YYYY for year, NNN for 3-digit sequence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="format">Format Pattern</Label>
            <Input
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="HEIR/YYYY/NNN"
            />
            <p className="text-xs text-muted-foreground">
              YYYY = year, YY = 2-digit year, NNN = sequence (adjust N count for padding)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sequence">Next Sequence Number</Label>
            <Input
              id="sequence"
              type="number"
              min="1"
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Will be incremented automatically after each certificate
            </p>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Preview of next certificate number:</p>
          <p className="text-lg font-bold font-mono">{getPreview()}</p>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
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

export default HeirCertificateNumberSettings;
