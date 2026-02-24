import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type IsoDatePickerProps = {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

/**
 * UI date picker that stores values as ISO `yyyy-MM-dd` strings, but displays as `dd/MM/yyyy`.
 */
export function IsoDatePicker({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  disabled,
}: IsoDatePickerProps) {
  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Date | undefined>(selected);

  React.useEffect(() => {
    if (open) setDraft(selected);
  }, [open, selected]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={draft}
          onSelect={(d) => setDraft(d ?? undefined)}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
        <div className="flex items-center justify-end gap-2 border-t border-border p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
          >
            ரத்து
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onChange(draft ? format(draft, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
          >
            சரி
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
