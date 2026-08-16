import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Search, Trash2, X, FileDown, RefreshCw, History } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IsoDatePicker } from "@/components/forms/IsoDatePicker";
import { supabase } from "@/integrations/supabase/client";
import type { LetterheadFields, LetterheadLayout } from "@/lib/letterheadHtml";
import { DEFAULT_LETTERHEAD_LAYOUT, EMPTY_LETTERHEAD_FIELDS } from "@/lib/letterheadHtml";
import { diffLetterheadFields, logLetterheadAudit } from "@/lib/letterheadAudit";
import LetterheadHistoryDialog from "./LetterheadHistoryDialog";


interface SavedLetterheadRow {
  id: string;
  reference_number: string | null;
  letter_date: string | null;
  recipient_name: string | null;
  recipient_address: string | null;
  subject: string | null;
  salutation: string | null;
  body: string | null;
  closing: string | null;
  signatory_name: string | null;
  designation: string | null;
  layout: any;
  created_at: string;
}

interface SavedLetterheadsProps {
  fields: LetterheadFields;
  layout: LetterheadLayout;
  currentId: string | null;
  onLoad: (fields: LetterheadFields, layout: LetterheadLayout, id: string) => void;
  onNew: () => void;
  onSaved?: () => void;
}

const displayDate = (iso: string | null) => {
  if (!iso) return "—";
  const parsed = parse(iso, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy") : iso;
};

const rowToFields = (row: SavedLetterheadRow): LetterheadFields => ({
  referenceNumber: row.reference_number ?? "",
  date: row.letter_date ?? "",
  recipientName: row.recipient_name ?? "",
  recipientAddress: row.recipient_address ?? "",
  subject: row.subject ?? "",
  salutation: row.salutation ?? "",
  body: row.body ?? "",
  closing: row.closing ?? "",
  signatoryName: row.signatory_name ?? "",
  designation: row.designation ?? "",
});

const rowToLayout = (row: SavedLetterheadRow): LetterheadLayout => {
  const l = row.layout && typeof row.layout === "object" ? row.layout : {};
  return {
    topMarginMm: Number(l.topMarginMm ?? DEFAULT_LETTERHEAD_LAYOUT.topMarginMm),
    bottomMarginMm: Number(l.bottomMarginMm ?? DEFAULT_LETTERHEAD_LAYOUT.bottomMarginMm),
    bodyFontPx: Number(l.bodyFontPx ?? DEFAULT_LETTERHEAD_LAYOUT.bodyFontPx),
  };
};

const SavedLetterheads = ({ fields, layout, currentId, onLoad, onNew }: SavedLetterheadsProps) => {
  const [rows, setRows] = useState<SavedLetterheadRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("letterheads")
        .select(
          "id, reference_number, letter_date, recipient_name, recipient_address, subject, salutation, body, closing, signatory_name, designation, layout, created_at"
        )
        .order("letter_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (nameQuery.trim()) query = query.ilike("recipient_name", `%${nameQuery.trim()}%`);
      if (fromDate) query = query.gte("letter_date", fromDate);
      if (toDate) query = query.lte("letter_date", toDate);

      const { data, error } = await query;
      if (error) throw error;
      setRows((data as SavedLetterheadRow[]) ?? []);
    } catch (error: any) {
      console.error("Error fetching saved letters:", error);
      toast.error("சேமித்த கடிதங்களை பெற முடியவில்லை / Could not load saved letters");
    } finally {
      setIsLoading(false);
    }
  }, [nameQuery, fromDate, toDate]);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payload = () => ({
    reference_number: fields.referenceNumber || null,
    letter_date: fields.date || null,
    recipient_name: fields.recipientName || null,
    recipient_address: fields.recipientAddress || null,
    subject: fields.subject || null,
    salutation: fields.salutation || null,
    body: fields.body || null,
    closing: fields.closing || null,
    signatory_name: fields.signatoryName || null,
    designation: fields.designation || null,
    layout: layout as unknown as Record<string, number>,
  });

  const handleSave = async (mode: "insert" | "update") => {
    if (!fields.body.trim() && !fields.subject.trim()) {
      toast.error("பொருள் அல்லது உள்ளடக்கம் தேவை / Add a subject or body before saving");
      return;
    }
    setIsSaving(true);
    try {
      if (mode === "update" && currentId) {
        const { error } = await supabase
          .from("letterheads")
          .update({ ...payload(), updated_at: new Date().toISOString() })
          .eq("id", currentId);
        if (error) throw error;
        toast.success("கடிதம் புதுப்பிக்கப்பட்டது / Letter updated");
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("letterheads")
          .insert({ ...payload(), created_by: userData.user?.id ?? null })
          .select("id")
          .single();
        if (error) throw error;
        toast.success("கடிதம் சேமிக்கப்பட்டது / Letter saved");
        if (data?.id) onLoad(fields, layout, data.id);
      }
      await fetchRows();
    } catch (error: any) {
      console.error("Error saving letter:", error);
      toast.error("சேமிக்க முடியவில்லை / Could not save the letter", {
        description: error?.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("letterheads").delete().eq("id", id);
      if (error) throw error;
      toast.success("கடிதம் நீக்கப்பட்டது / Letter deleted");
      if (currentId === id) onNew();
      await fetchRows();
    } catch (error: any) {
      console.error("Error deleting letter:", error);
      toast.error("நீக்க முடியவில்லை / Could not delete the letter");
    }
  };

  const clearFilters = () => {
    setNameQuery("");
    setFromDate("");
    setToDate("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          சேமித்த கடிதங்கள்{" "}
          <span className="text-sm font-normal text-muted-foreground">/ Saved letters</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Save actions */}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => handleSave("insert")} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            சேமி / Save as new
          </Button>
          {currentId && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSave("update")}
              disabled={isSaving}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              புதுப்பி / Update
            </Button>
          )}
          {currentId && (
            <Button type="button" variant="ghost" onClick={onNew}>
              <X className="mr-2 h-4 w-4" />
              புதிய கடிதம் / New letter
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="search-name">
              பெறுநர் பெயர் <span className="text-xs text-muted-foreground">/ Recipient</span>
            </Label>
            <Input
              id="search-name"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchRows()}
              placeholder="Search by name"
            />
          </div>
          <div className="space-y-2">
            <Label>
              தேதி முதல் <span className="text-xs text-muted-foreground">/ From</span>
            </Label>
            <IsoDatePicker value={fromDate} onChange={setFromDate} />
          </div>
          <div className="space-y-2">
            <Label>
              தேதி வரை <span className="text-xs text-muted-foreground">/ To</span>
            </Label>
            <IsoDatePicker value={toDate} onChange={setToDate} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={fetchRows} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            தேடு / Search
          </Button>
          {(nameQuery || fromDate || toDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                clearFilters();
                setTimeout(fetchRows, 0);
              }}
            >
              <X className="mr-2 h-4 w-4" />
              அழி / Clear
            </Button>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            கடிதங்கள் இல்லை / No saved letters found.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`flex flex-wrap items-center gap-3 p-3 ${
                  currentId === row.id ? "bg-muted/60" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.recipient_name || "—"}
                    {row.subject ? <span className="text-muted-foreground"> · {row.subject}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {displayDate(row.letter_date)}
                    {row.reference_number ? ` · ${row.reference_number}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onLoad(rowToFields(row), rowToLayout(row), row.id)}
                  >
                    <FileDown className="mr-1 h-4 w-4" />
                    ஏற்று / Load
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(row.id)}
                    aria-label="Delete letter"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export { EMPTY_LETTERHEAD_FIELDS };
export default SavedLetterheads;
