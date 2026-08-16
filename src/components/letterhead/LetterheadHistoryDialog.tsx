import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LETTERHEAD_FIELD_LABELS } from "@/lib/letterheadAudit";

interface AuditRow {
  id: string;
  action: string;
  changed_fields: string[] | null;
  performed_by_name: string | null;
  created_at: string;
}

interface Props {
  letterheadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_LABEL: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
};

const formatStamp = (iso: string) => {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
};

const LetterheadHistoryDialog = ({ letterheadId, open, onOpenChange }: Props) => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !letterheadId) return;
    let active = true;
    setIsLoading(true);
    supabase
      .from("letterhead_audit_logs")
      .select("id, action, changed_fields, performed_by_name, created_at")
      .eq("letterhead_id", letterheadId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error loading letter history:", error);
          toast.error("வரலாற்றை பெற முடியவில்லை / Could not load history");
        } else {
          setRows((data as AuditRow[]) ?? []);
        }
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, letterheadId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            மாற்ற வரலாறு <span className="text-sm font-normal text-muted-foreground">/ Change history</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            வரலாறு இல்லை / No history recorded yet.
          </p>
        ) : (
          <ul className="max-h-[60vh] space-y-3 overflow-y-auto">
            {rows.map((row) => (
              <li key={row.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={row.action === "deleted" ? "destructive" : "secondary"}>
                    {ACTION_LABEL[row.action] ?? row.action}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">
                    {row.performed_by_name || "Unknown user"}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatStamp(row.created_at)}
                  </span>
                </div>
                {row.action === "updated" && row.changed_fields?.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Changed:{" "}
                    {row.changed_fields
                      .map((f) => LETTERHEAD_FIELD_LABELS[f] ?? f)
                      .join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LetterheadHistoryDialog;
