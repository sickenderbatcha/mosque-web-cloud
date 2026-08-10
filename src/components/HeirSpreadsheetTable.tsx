import { useState } from "react";
import { differenceInYears, parse, isValid } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Users, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export interface Heir {
  name: string;
  relationship: string;
  age: string;
  marriage_eligibility: string;
}

interface HeirSpreadsheetTableProps {
  heirs: Heir[];
  onChange: (heirs: Heir[]) => void;
  memberId?: string;
  disabled?: boolean;
}

const RELATIONSHIP_OPTIONS = [
  "மகன்",
  "மகள்",
  "மனைவி",
  "கணவன்",
  "தந்தை",
  "தாய்",
  "சகோதரன்",
  "சகோதரி",
  "பேரன்",
  "பேத்தி",
  "மருமகன்",
  "மருமகள்",
];

const MARRIAGE_ELIGIBILITY_OPTIONS = [
  "திருமணமானவர்",
  "திருமணமாகாதவர்",
  "விதவை",
  "விவாகரத்து",
  "சிறுவர்",
];

// Map family relationship enum to heir relationship options
const FAMILY_RELATIONSHIP_MAP: Record<string, string> = {
  "கணவன்": "கணவன்",
  "மனைவி": "மனைவி",
  "மகன்": "மகன்",
  "மகள்": "மகள்",
};

// Map marital status enum to marriage eligibility options
const MARITAL_STATUS_MAP: Record<string, string> = {
  "திருமணமாகாதவர்": "திருமணமாகாதவர்",
  "திருமணமானவர்": "திருமணமானவர்",
  "விவாகரத்தானவர்": "விவாகரத்து",
  "விதவை/விதுரர்": "விதவை",
};

export default function HeirSpreadsheetTable({
  heirs,
  onChange,
  memberId,
  disabled = false,
}: HeirSpreadsheetTableProps) {
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [familyLoaded, setFamilyLoaded] = useState(false);

  const updateHeir = (index: number, field: keyof Heir, value: string) => {
    const updated = [...heirs];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addHeir = () => {
    if (heirs.length >= 10) {
      toast.warning("அதிகபட்சம் 10 வாரிசுகள் மட்டுமே சேர்க்க முடியும்");
      return;
    }
    onChange([...heirs, { name: "", relationship: "", age: "", marriage_eligibility: "" }]);
  };

  const removeHeir = (index: number) => {
    if (heirs.length <= 1) {
      toast.warning("குறைந்தது ஒரு வாரிசு தேவை");
      return;
    }
    const updated = heirs.filter((_, i) => i !== index);
    onChange(updated);
  };

  const resetHeirs = () => {
    onChange([{ name: "", relationship: "", age: "", marriage_eligibility: "" }]);
    setFamilyLoaded(false);
    toast.info("வாரிசுகள் விவரங்கள் அழிக்கப்பட்டன");
  };

  const loadFamilyMembers = async () => {
    if (!memberId) {
      toast.error("உறுப்பினர் எண் உள்ளிடவும்");
      return;
    }

    setLoadingFamily(true);
    try {
      // First get the member's UUID from member_id string
      const { data: familyRows, error } = await supabase.rpc("get_member_family", {
        _member_id: memberId,
      });

      if (!error && (!familyRows || familyRows.length === 0)) {
        toast.error("உறுப்பினர் கண்டறியப்படவில்லை");
        return;
      }

      const member = familyRows?.[0]
        ? { id: familyRows[0].member_uuid, full_name: familyRows[0].member_full_name }
        : null;
      const familyMembers = (familyRows || []).filter((r) => r.name);

      if (error) {
        console.error("Error fetching family members:", error);
        toast.error("குடும்ப உறுப்பினர்களை பெறுவதில் பிழை");
        return;
      }

      if (!familyMembers || familyMembers.length === 0) {
        toast.info("குடும்ப உறுப்பினர்கள் எதுவும் பதிவாகவில்லை");
        return;
      }

      // Helper function to calculate age from date_of_birth
      const calculateAge = (dob: string | null): string => {
        if (!dob) return "";
        const parsedDate = parse(dob, "yyyy-MM-dd", new Date());
        if (!isValid(parsedDate)) return "";
        return differenceInYears(new Date(), parsedDate).toString();
      };

      // Convert family members to heirs format
      const newHeirs: Heir[] = familyMembers.map((fm) => ({
        name: fm.name,
        relationship: FAMILY_RELATIONSHIP_MAP[fm.relationship] || fm.relationship,
        age: calculateAge(fm.date_of_birth), // Auto-calculate age from DOB
        marriage_eligibility: fm.marital_status 
          ? MARITAL_STATUS_MAP[fm.marital_status] || "திருமணமாகாதவர்" 
          : "திருமணமாகாதவர்",
      }));

      // Merge with existing heirs that have data, or replace empty ones
      const existingWithData = heirs.filter(h => h.name.trim() !== "");
      const merged = [...existingWithData, ...newHeirs].slice(0, 10);
      
      if (merged.length === 0) {
        merged.push({ name: "", relationship: "", age: "", marriage_eligibility: "" });
      }

      onChange(merged);
      setFamilyLoaded(true);
      toast.success(`${newHeirs.length} குடும்ப உறுப்பினர்கள் சேர்க்கப்பட்டனர்`);
    } catch (err) {
      console.error("Error loading family members:", err);
      toast.error("குடும்ப உறுப்பினர்களை பெறுவதில் பிழை");
    } finally {
      setLoadingFamily(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-lg font-semibold font-tamil">வாரிசுகள் விவரங்கள்</h3>
        <div className="flex flex-wrap gap-2">
          {!disabled && memberId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadFamilyMembers}
              disabled={loadingFamily || familyLoaded}
              className="flex-1 sm:flex-none"
            >
              {loadingFamily ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Users className="h-4 w-4 mr-1" />
              )}
              குடும்ப உறுப்பினர்களை பெறு
            </Button>
          )}
          {!disabled && familyLoaded && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetHeirs}
              className="flex-1 sm:flex-none text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              மீட்டமை
            </Button>
          )}
          {!disabled && heirs.length < 10 && (
            <Button type="button" variant="outline" size="sm" onClick={addHeir} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-1" />
              வாரிசு சேர்
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-tamil w-10 text-center">#</TableHead>
              <TableHead className="font-tamil min-w-[180px]">பெயர் *</TableHead>
              <TableHead className="font-tamil min-w-[140px]">உறவுமுறை *</TableHead>
              <TableHead className="font-tamil w-24">வயது *</TableHead>
              <TableHead className="font-tamil min-w-[150px]">திருமண தகுதி *</TableHead>
              {!disabled && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {heirs.map((heir, index) => (
              <TableRow key={index} className="hover:bg-muted/30">
                <TableCell className="text-center font-medium text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    value={heir.name}
                    onChange={(e) => updateHeir(index, "name", e.target.value)}
                    disabled={disabled}
                    placeholder="பெயர்"
                    className="h-9"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Select
                    value={heir.relationship}
                    onValueChange={(value) => updateHeir(index, "relationship", value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="தேர்வு" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map((rel) => (
                        <SelectItem key={rel} value={rel}>
                          {rel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    value={heir.age}
                    onChange={(e) => updateHeir(index, "age", e.target.value)}
                    disabled={disabled}
                    placeholder="வயது"
                    className="h-9"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Select
                    value={heir.marriage_eligibility}
                    onValueChange={(value) => updateHeir(index, "marriage_eligibility", value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="தேர்வு" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARRIAGE_ELIGIBILITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                {!disabled && (
                  <TableCell className="p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHeir(index)}
                      disabled={heirs.length <= 1}
                      className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {heirs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 font-tamil">
          வாரிசுகளை சேர்க்க "வாரிசு சேர்" பொத்தானை அழுத்தவும்
        </p>
      )}

      <p className="text-xs text-muted-foreground font-tamil">
        * உறுப்பினர் எண் உள்ளிட்டு தேடினால், "குடும்ப உறுப்பினர்களை பெறு" பொத்தானை அழுத்தி 
        பதிவு செய்யப்பட்ட குடும்ப உறுப்பினர்களை வாரிசுகளாக சேர்க்கலாம்.
      </p>
    </div>
  );
}
