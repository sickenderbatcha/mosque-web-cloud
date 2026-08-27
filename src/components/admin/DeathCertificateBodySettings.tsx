import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { upsertAppSetting } from "@/lib/appSettingsUtils";
import {
  DEATH_CERT_BODY_SETTING_KEY,
  DEATH_CERT_FIELDS,
  DEFAULT_DEATH_CERT_BODY,
  getDeathCertificateBodyTemplate,
} from "@/lib/deathCertificateBody";

const DeathCertificateBodySettings = () => {
  const { toast } = useToast();
  const [template, setTemplate] = useState(DEFAULT_DEATH_CERT_BODY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDeathCertificateBodyTemplate()
      .then(setTemplate)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertAppSetting(
        DEATH_CERT_BODY_SETTING_KEY,
        template,
        "Death certificate body text template using @F<serial> field tokens"
      );
      toast({ title: "Saved", description: "Death certificate body text updated." });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save body text.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const insertToken = (serial: number) => {
    setTemplate((prev) => `${prev}${prev.endsWith(" ") || prev === "" ? "" : " "}@F${serial}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-tamil">
          இறப்புச் சான்றிதழ் உரை / Death Certificate Body Text
        </CardTitle>
        <CardDescription>
          Use <code>@F1</code>, <code>@F2</code> … tokens to insert death register field values. Each
          line becomes one line on the certificate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Body text</Label>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={7}
                className="font-tamil"
              />
            </div>

            <div className="space-y-2">
              <Label>Available fields</Label>
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2 w-16">No.</th>
                      <th className="text-left p-2 w-20">Token</th>
                      <th className="text-left p-2">Field</th>
                      <th className="p-2 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEATH_CERT_FIELDS.map((field) => (
                      <tr key={field.serial} className="border-t">
                        <td className="p-2">{field.serial}</td>
                        <td className="p-2 font-mono">@F{field.serial}</td>
                        <td className="p-2 font-tamil">{field.label}</td>
                        <td className="p-2 text-right">
                          <Button type="button" size="sm" variant="ghost" onClick={() => insertToken(field.serial)}>
                            Insert
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
              <Button variant="outline" onClick={() => setTemplate(DEFAULT_DEATH_CERT_BODY)} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to default
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DeathCertificateBodySettings;
