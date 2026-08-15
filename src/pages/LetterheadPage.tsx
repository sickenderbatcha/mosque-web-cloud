import { useEffect, useMemo, useState } from "react";
import { Printer, RotateCcw, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { IsoDatePicker } from "@/components/forms/IsoDatePicker";
import SavedLetterheads from "@/components/letterhead/SavedLetterheads";
import { useReceiptHeaderSettings } from "@/hooks/useReceiptHeaderSettings";
import { useLetterheadSettings } from "@/hooks/useLetterheadSettings";
import {
  buildLetterheadHtml,
  printLetterheadHtml,
  DEFAULT_LETTERHEAD_LAYOUT,
  EMPTY_LETTERHEAD_FIELDS,
  type LetterheadFields,
  type LetterheadLayout,
} from "@/lib/letterheadHtml";

const PAGE_TITLE = "Letterhead Generator | INPT - Ilayangudi Nesavu Pattadai Webportal";
const PAGE_DESCRIPTION =
  "Compose, preview and print official mosque letters on the INPT Jamaat Masjid letterhead.";

const useDocumentHead = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = PAGE_TITLE;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", PAGE_DESCRIPTION);

    return () => {
      document.title = previousTitle;
      if (previousDescription !== null) meta?.setAttribute("content", previousDescription);
    };
  }, []);
};

const clampNumber = (raw: string, min: number, max: number, fallback: number) => {
  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const LetterheadPage = () => {
  useDocumentHead();

  const { settings, isLoading } = useReceiptHeaderSettings();
  const { settings: letterheadSettings, isLoading: isLoadingLetterhead } = useLetterheadSettings();
  const [fields, setFields] = useState<LetterheadFields>(EMPTY_LETTERHEAD_FIELDS);
  const [layout, setLayout] = useState<LetterheadLayout>(DEFAULT_LETTERHEAD_LAYOUT);

  const setField = (key: keyof LetterheadFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const html = useMemo(
    () =>
      buildLetterheadHtml(
        {
          organizationNameTa: settings.organizationNameTa,
          organizationNameEn: settings.organizationNameEn,
          addressLine1: settings.addressLine1,
          addressLine2: settings.addressLine2,
          phone: settings.phone,
          footerTagline: letterheadSettings.footerTa,
          footerTaglineEn: letterheadSettings.footerEn,
        },
        fields,
        layout
      ),
    [settings, letterheadSettings, fields, layout]
  );

  const handlePrint = () => {
    const opened = printLetterheadHtml(html);
    if (!opened) {
      toast.error("அச்சு சாளரம் திறக்கவில்லை / Could not open the print window", {
        description: "Please allow pop-ups for this site and try again.",
      });
    }
  };

  if (isLoading || isLoadingLetterhead) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          கடித தலைப்பு உருவாக்கி
        </h1>
        <p className="text-muted-foreground">Letterhead Generator</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              கடித விவரங்கள் <span className="text-sm font-normal text-muted-foreground">/ Letter details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ref">
                  குறிப்பு எண் <span className="text-xs text-muted-foreground">/ Reference number</span>
                </Label>
                <Input
                  id="ref"
                  value={fields.referenceNumber}
                  onChange={(e) => setField("referenceNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  தேதி <span className="text-xs text-muted-foreground">/ Date</span>
                </Label>
                <IsoDatePicker value={fields.date} onChange={(v) => setField("date", v)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-name">
                பெறுநர் பெயர் <span className="text-xs text-muted-foreground">/ Recipient name</span>
              </Label>
              <Input
                id="recipient-name"
                value={fields.recipientName}
                onChange={(e) => setField("recipientName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-address">
                பெறுநர் முகவரி <span className="text-xs text-muted-foreground">/ Recipient address</span>
              </Label>
              <Textarea
                id="recipient-address"
                rows={3}
                value={fields.recipientAddress}
                onChange={(e) => setField("recipientAddress", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">
                பொருள் <span className="text-xs text-muted-foreground">/ Subject</span>
              </Label>
              <Input
                id="subject"
                value={fields.subject}
                onChange={(e) => setField("subject", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salutation">
                வணக்க வரி <span className="text-xs text-muted-foreground">/ Salutation</span>
              </Label>
              <Input
                id="salutation"
                placeholder="Dear Sir,"
                value={fields.salutation}
                onChange={(e) => setField("salutation", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">
                கடித உள்ளடக்கம் <span className="text-xs text-muted-foreground">/ Body</span>
              </Label>
              <Textarea
                id="body"
                rows={10}
                value={fields.body}
                onChange={(e) => setField("body", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="closing">
                நிறைவு வரி <span className="text-xs text-muted-foreground">/ Closing</span>
              </Label>
              <Input
                id="closing"
                placeholder="Yours faithfully,"
                value={fields.closing}
                onChange={(e) => setField("closing", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signatory">
                  கையொப்பமிடுபவர் <span className="text-xs text-muted-foreground">/ Signatory name</span>
                </Label>
                <Input
                  id="signatory"
                  value={fields.signatoryName}
                  onChange={(e) => setField("signatoryName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">
                  பதவி <span className="text-xs text-muted-foreground">/ Designation</span>
                </Label>
                <Input
                  id="designation"
                  value={fields.designation}
                  onChange={(e) => setField("designation", e.target.value)}
                />
              </div>
            </div>

            {/* Print layout */}
            <fieldset className="rounded-lg border border-border p-4 space-y-4">
              <legend className="px-2 text-sm font-semibold text-foreground">
                அச்சு அமைப்பு <span className="text-xs font-normal text-muted-foreground">/ Print layout</span>
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="top-margin">Top margin (mm)</Label>
                  <Input
                    id="top-margin"
                    type="number"
                    min={0}
                    max={40}
                    step={1}
                    value={layout.topMarginMm}
                    onChange={(e) =>
                      setLayout((p) => ({ ...p, topMarginMm: clampNumber(e.target.value, 0, 40, p.topMarginMm) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bottom-margin">Bottom margin (mm)</Label>
                  <Input
                    id="bottom-margin"
                    type="number"
                    min={0}
                    max={40}
                    step={1}
                    value={layout.bottomMarginMm}
                    onChange={(e) =>
                      setLayout((p) => ({
                        ...p,
                        bottomMarginMm: clampNumber(e.target.value, 0, 40, p.bottomMarginMm),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body-font">Body font size (px)</Label>
                  <Input
                    id="body-font"
                    type="number"
                    min={9}
                    max={20}
                    step={0.5}
                    value={layout.bodyFontPx}
                    onChange={(e) =>
                      setLayout((p) => ({ ...p, bodyFontPx: clampNumber(e.target.value, 9, 20, p.bodyFontPx) }))
                    }
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLayout(DEFAULT_LETTERHEAD_LAYOUT)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </fieldset>

            <Button type="button" className="w-full" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              அச்சிடு / Print
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:sticky lg:top-24 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">
              நேரலை முன்னோட்டம் <span className="text-sm font-normal text-muted-foreground">/ Live preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              title="Letterhead preview"
              srcDoc={html}
              className="w-full rounded-md border border-border bg-muted"
              style={{ aspectRatio: "210 / 297" }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LetterheadPage;
