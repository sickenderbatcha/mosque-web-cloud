import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Eye,
  Trash2,
  Search,
  FileDown,
  Printer,
  Pencil,
} from "lucide-react";
import { generateDeathCertificatePdf, printDeathCertificate, DeathRecord } from "@/utils/deathCertificatePdf";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IsoDatePicker } from "@/components/forms/IsoDatePicker";
import { getCertificateAccessStatus } from "@/lib/certificatePayments";
import DeathCertificatePreview from "@/components/DeathCertificatePreview";

const islamicMonths = [
  "முஹர்ரம்",
  "சஃபர்",
  "ரபீஉல் அவ்வல்",
  "ரபீஉஸ் ஸானி",
  "ஜமாதில் அவ்வல்",
  "ஜமாதிஸ் ஸானி",
  "ரஜப்",
  "ஷஅபான்",
  "ரமழான்",
  "ஷவ்வால்",
  "துல்கஅதா",
  "துல்ஹஜ்",
];

const englishMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dayNames = [
  "ஞாயிறு",
  "திங்கள்",
  "செவ்வாய்",
  "புதன்",
  "வியாழன்",
  "வெள்ளி",
  "சனி",
];

// Helper to format date as dd/mm/yyyy from components
const formatDateDDMMYYYY = (day: number, month: string, year: number) => {
  const monthIndex = englishMonths.indexOf(month) + 1;
  const dd = String(day).padStart(2, '0');
  const mm = String(monthIndex).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
};

// Helper to format ISO date (YYYY-MM-DD) to dd/mm/yyyy
const formatISODateToDDMMYYYY = (isoDate: string | null) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const formSchema = z.object({
  member_id: z.preprocess(emptyToUndefined, z.string().optional()),
  // Keep these fields for database compatibility but make them optional
  hijri_year: z.coerce.number().optional().default(1446),
  hijri_month: z.string().optional().default("முஹர்ரம்"),
  hijri_day: z.coerce.number().optional().default(1),
  gregorian_year: z.coerce.number().optional().default(new Date().getFullYear()),
  gregorian_month: z.string().optional().default("January"),
  gregorian_day: z.coerce.number().optional().default(1),
  day_name: z.string().optional().default("ஞாயிறு"),
  
  deceased_name: z.string().min(1, "தேவை").max(100),
  deceased_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  deceased_father_name: z.string().min(1, "தேவை").max(100),
  deceased_father_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  deceased_husband_name: z.preprocess(emptyToUndefined, z.string().optional()),
  deceased_husband_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  deceased_age: z.coerce.number().min(0).max(150),
  deceased_gender: z.enum(["Male", "Female"]),
  deceased_address: z.string().min(1, "தேவை"),
  deceased_occupation: z.preprocess(emptyToUndefined, z.string().optional()),
  
  death_date: z.string().min(1, "தேவை"),
  death_time: z.preprocess(emptyToUndefined, z.string().optional()),
  place_of_death: z.string().min(1, "தேவை"),
  cause_of_death: z.preprocess(emptyToUndefined, z.string().optional()),
  
  burial_date: z.preprocess(emptyToUndefined, z.string().optional()),
  burial_time: z.preprocess(emptyToUndefined, z.string().optional()),
  burial_place: z.preprocess(emptyToUndefined, z.string().optional()),
  burial_place_en: z.preprocess(emptyToUndefined, z.string().optional()),
  
  informant_name: z.string().min(1, "தேவை").max(100),
  informant_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  informant_relationship: z.string().min(1, "தேவை"),
  informant_phone: z.preprocess(emptyToUndefined, z.string().optional()),
  informant_address: z.preprocess(emptyToUndefined, z.string().optional()),
  
  witness1_name: z.preprocess(emptyToUndefined, z.string().optional()),
  witness1_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  witness1_father_name: z.preprocess(emptyToUndefined, z.string().optional()),
  witness2_name: z.preprocess(emptyToUndefined, z.string().optional()),
  witness2_name_en: z.preprocess(emptyToUndefined, z.string().optional()),
  witness2_father_name: z.preprocess(emptyToUndefined, z.string().optional()),
  
  registrar_name: z.string().min(1, "தேவை").max(100),
  registrar_father_name: z.preprocess(emptyToUndefined, z.string().optional()),
  register_page_number: z.preprocess(emptyToUndefined, z.string().optional()),
});

type FormData = z.infer<typeof formSchema>;

export default function DeathRegisterTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<DeathRecord | null>(null);
  const [editRecord, setEditRecord] = useState<DeathRecord | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const recordId = viewRecord?.id;
      if (!recordId) {
        setPaymentStatus(null);
        return;
      }

      setPaymentLoading(true);
      try {
        const access = await getCertificateAccessStatus({
          referenceId: recordId,
          certificateType: "death",
        });
        setPaymentStatus(access.paymentStatus);
      } finally {
        setPaymentLoading(false);
      }
    };

    checkPaymentStatus();
  }, [viewRecord?.id]);

  const isPaymentCompleted = paymentStatus === "completed";

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      member_id: "",
      hijri_year: new Date().getFullYear() - 579,
      hijri_month: islamicMonths[0],
      gregorian_year: new Date().getFullYear(),
      gregorian_month: englishMonths[new Date().getMonth()],
      hijri_day: 1,
      gregorian_day: new Date().getDate(),
      day_name: dayNames[new Date().getDay()],
      deceased_name: "",
      deceased_name_en: "",
      deceased_father_name: "",
      deceased_father_name_en: "",
      deceased_husband_name: "",
      deceased_husband_name_en: "",
      deceased_age: 0,
      deceased_gender: "Male",
      deceased_address: "",
      deceased_occupation: "",
      death_date: new Date().toISOString().split("T")[0],
      death_time: "",
      place_of_death: "",
      cause_of_death: "",
      burial_date: "",
      burial_time: "",
      burial_place: "",
      burial_place_en: "",
      informant_name: "",
      informant_name_en: "",
      informant_relationship: "",
      informant_phone: "",
      informant_address: "",
      witness1_name: "",
      witness1_name_en: "",
      witness1_father_name: "",
      witness2_name: "",
      witness2_name_en: "",
      witness2_father_name: "",
      registrar_name: "",
      registrar_father_name: "",
      register_page_number: "",
    },
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["death-registers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("death_registers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DeathRecord[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Parse death_date to populate date fields for database
      const deathDateObj = new Date(data.death_date);
      const gregorianDay = deathDateObj.getDate();
      const gregorianMonth = englishMonths[deathDateObj.getMonth()];
      const gregorianYear = deathDateObj.getFullYear();
      const dayName = dayNames[deathDateObj.getDay()];
      
      const { error } = await supabase.from("death_registers").insert({
        member_id: data.member_id || null,
        hijri_year: data.hijri_year || 1446,
        hijri_month: data.hijri_month || "முஹர்ரம்",
        hijri_day: data.hijri_day || 1,
        gregorian_year: gregorianYear,
        gregorian_month: gregorianMonth,
        gregorian_day: gregorianDay,
        day_name: dayName,
        deceased_name: data.deceased_name,
        deceased_name_en: data.deceased_name_en || null,
        deceased_father_name: data.deceased_father_name,
        deceased_father_name_en: data.deceased_father_name_en || null,
        deceased_husband_name: data.deceased_husband_name || null,
        deceased_husband_name_en: data.deceased_husband_name_en || null,
        deceased_age: data.deceased_age,
        deceased_gender: data.deceased_gender,
        deceased_address: data.deceased_address,
        deceased_occupation: data.deceased_occupation || null,
        death_date: data.death_date,
        death_time: data.death_time || null,
        place_of_death: data.place_of_death,
        cause_of_death: data.cause_of_death || null,
        burial_date: data.burial_date || null,
        burial_time: data.burial_time || null,
        burial_place: data.burial_place || null,
        burial_place_en: data.burial_place_en || null,
        informant_name: data.informant_name,
        informant_name_en: data.informant_name_en || null,
        informant_relationship: data.informant_relationship,
        informant_phone: data.informant_phone || null,
        informant_address: data.informant_address || null,
        witness1_name: data.witness1_name || null,
        witness1_name_en: data.witness1_name_en || null,
        witness1_father_name: data.witness1_father_name || null,
        witness2_name: data.witness2_name || null,
        witness2_name_en: data.witness2_name_en || null,
        witness2_father_name: data.witness2_father_name || null,
        registrar_name: data.registrar_name,
        registrar_father_name: data.registrar_father_name || null,
        register_page_number: data.register_page_number || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["death-registers"] });
      toast.success("இறப்பு பதிவு வெற்றிகரமாக சேர்க்கப்பட்டது");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error("பிழை: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      // Parse death_date to populate date fields for database
      const deathDateObj = new Date(data.death_date);
      const gregorianDay = deathDateObj.getDate();
      const gregorianMonth = englishMonths[deathDateObj.getMonth()];
      const gregorianYear = deathDateObj.getFullYear();
      const dayName = dayNames[deathDateObj.getDay()];
      
      const { error } = await supabase
        .from("death_registers")
        .update({
          member_id: data.member_id || null,
          hijri_year: data.hijri_year || 1446,
          hijri_month: data.hijri_month || "முஹர்ரம்",
          hijri_day: data.hijri_day || 1,
          gregorian_year: gregorianYear,
          gregorian_month: gregorianMonth,
          gregorian_day: gregorianDay,
          day_name: dayName,
          deceased_name: data.deceased_name,
          deceased_name_en: data.deceased_name_en || null,
          deceased_father_name: data.deceased_father_name,
          deceased_father_name_en: data.deceased_father_name_en || null,
          deceased_husband_name: data.deceased_husband_name || null,
          deceased_husband_name_en: data.deceased_husband_name_en || null,
          deceased_age: data.deceased_age,
          deceased_gender: data.deceased_gender,
          deceased_address: data.deceased_address,
          deceased_occupation: data.deceased_occupation || null,
          death_date: data.death_date,
          death_time: data.death_time || null,
          place_of_death: data.place_of_death,
          cause_of_death: data.cause_of_death || null,
          burial_date: data.burial_date || null,
          burial_time: data.burial_time || null,
          burial_place: data.burial_place || null,
          burial_place_en: data.burial_place_en || null,
          informant_name: data.informant_name,
          informant_name_en: data.informant_name_en || null,
          informant_relationship: data.informant_relationship,
          informant_phone: data.informant_phone || null,
          informant_address: data.informant_address || null,
          witness1_name: data.witness1_name || null,
          witness1_name_en: data.witness1_name_en || null,
          witness1_father_name: data.witness1_father_name || null,
          witness2_name: data.witness2_name || null,
          witness2_name_en: data.witness2_name_en || null,
          witness2_father_name: data.witness2_father_name || null,
          registrar_name: data.registrar_name,
          registrar_father_name: data.registrar_father_name || null,
          register_page_number: data.register_page_number || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["death-registers"] });
      toast.success("பதிவு புதுப்பிக்கப்பட்டது");
      setEditRecord(null);
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error("பிழை: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("death_registers")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["death-registers"] });
      toast.success("பதிவு நீக்கப்பட்டது");
    },
    onError: (error) => {
      toast.error("பிழை: " + error.message);
    },
  });

  const onSubmit = (data: FormData) => {
    if (editRecord) {
      updateMutation.mutate({ id: editRecord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (record: DeathRecord) => {
    setEditRecord(record);
    form.reset({
      member_id: record.member_id || "",
      hijri_year: record.hijri_year,
      hijri_month: record.hijri_month,
      hijri_day: record.hijri_day,
      gregorian_year: record.gregorian_year,
      gregorian_month: record.gregorian_month,
      gregorian_day: record.gregorian_day,
      day_name: record.day_name,
      deceased_name: record.deceased_name,
      deceased_name_en: record.deceased_name_en || "",
      deceased_father_name: record.deceased_father_name,
      deceased_father_name_en: record.deceased_father_name_en || "",
      deceased_husband_name: (record as any).deceased_husband_name || "",
      deceased_husband_name_en: (record as any).deceased_husband_name_en || "",
      deceased_age: record.deceased_age,
      deceased_gender: record.deceased_gender as "Male" | "Female",
      deceased_address: record.deceased_address,
      deceased_occupation: record.deceased_occupation || "",
      death_date: record.death_date,
      death_time: record.death_time || "",
      place_of_death: record.place_of_death,
      cause_of_death: record.cause_of_death || "",
      burial_date: record.burial_date || "",
      burial_time: record.burial_time || "",
      burial_place: record.burial_place || "",
      burial_place_en: record.burial_place_en || "",
      informant_name: record.informant_name,
      informant_name_en: record.informant_name_en || "",
      informant_relationship: record.informant_relationship,
      informant_phone: record.informant_phone || "",
      informant_address: record.informant_address || "",
      witness1_name: record.witness1_name || "",
      witness1_name_en: record.witness1_name_en || "",
      witness1_father_name: record.witness1_father_name || "",
      witness2_name: record.witness2_name || "",
      witness2_name_en: record.witness2_name_en || "",
      witness2_father_name: record.witness2_father_name || "",
      registrar_name: record.registrar_name,
      registrar_father_name: record.registrar_father_name || "",
      register_page_number: record.register_page_number || "",
    });
    setIsDialogOpen(true);
  };

  const filteredRecords = records?.filter(
    (r) =>
      r.deceased_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.deceased_father_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.member_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-tamil">இறப்பு பதிவேடு</CardTitle>
        <Button
          onClick={() => {
            setEditRecord(null);
            form.reset();
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          புதிய பதிவு
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="பெயர் அல்லது உறுப்பினர் எண் தேடு..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-center py-8">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-tamil">இறந்தவர் பெயர்</TableHead>
                  <TableHead className="font-tamil">தந்தை பெயர்</TableHead>
                  <TableHead className="font-tamil">இறப்பு தேதி</TableHead>
                  <TableHead className="font-tamil">வயது</TableHead>
                  <TableHead className="font-tamil">தெரிவித்தவர்</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-tamil">{record.deceased_name}</TableCell>
                    <TableCell className="font-tamil">{record.deceased_father_name}</TableCell>
                    <TableCell>
                      {formatISODateToDDMMYYYY(record.death_date)}
                    </TableCell>
                    <TableCell>{record.deceased_age}</TableCell>
                    <TableCell className="font-tamil">{record.informant_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewRecord(record)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(record)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteRecordId(record.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="font-tamil">
                {editRecord ? "பதிவை திருத்து" : "புதிய இறப்பு பதிவு"}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Date Section - Simplified to single date field */}
                  <div className="space-y-4">
                    <h3 className="font-tamil font-semibold text-lg border-b pb-2">தேதி விவரங்கள்</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="death_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">தேதி (Date)</FormLabel>
                            <FormControl>
                              <IsoDatePicker
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Deceased Details */}
                  <div className="space-y-4">
                    <h3 className="font-tamil font-semibold text-lg border-b pb-2">இறந்தவர் விவரங்கள்</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="deceased_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">இறந்தவர் பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="இறந்தவர் பெயர்" className="font-tamil text-lg md:text-base h-12 md:h-10 placeholder:text-lg md:placeholder:text-base" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deceased_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name (English)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deceased_father_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">தந்தை பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deceased_father_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Father's Name (English)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deceased_husband_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">கணவர் பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="திருமணமான பெண்களுக்கு மட்டும்" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deceased_husband_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Husband's Name (English)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="For married women only" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deceased_age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">வயது</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deceased_gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">பாலினம்</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Male">ஆண்</SelectItem>
                                <SelectItem value="Female">பெண்</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deceased_address"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="font-tamil">முகவரி</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deceased_occupation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">தொழில்</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="member_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">உறுப்பினர் எண்</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Death Details */}
                  <div className="space-y-4">
                    <h3 className="font-tamil font-semibold text-lg border-b pb-2">இறப்பு விவரங்கள்</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="death_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">இறப்பு தேதி</FormLabel>
                            <FormControl>
                              <IsoDatePicker value={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="death_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">இறப்பு நேரம்</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="place_of_death"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">இறப்பு இடம்</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cause_of_death"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">இறப்பு காரணம்</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Burial Details */}
                  <div className="space-y-4">
                    <h3 className="font-tamil font-semibold text-lg border-b pb-2">அடக்க விவரங்கள்</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="burial_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">அடக்க தேதி</FormLabel>
                            <FormControl>
                              <IsoDatePicker value={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="burial_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">அடக்க நேரம்</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="burial_place"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">அடக்க இடம் (தமிழ்)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="burial_place_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Burial Place (English)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Informant Details */}
                  <div className="space-y-4">
                    <h3 className="font-tamil font-semibold text-lg border-b pb-2">தெரிவிப்பவர் விவரங்கள்</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="informant_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">தெரிவிப்பவர் பெயர் (தமிழ்)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="informant_name_en"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Informant Name (English)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="informant_relationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">உறவுமுறை</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="மகன் / மகள் / மனைவி / ..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="informant_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">தொலைபேசி</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Registrar */}
                  <div className="space-y-4">
                    <h3 className="font-tamil font-semibold text-lg border-b pb-2">பதிவாளர்</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="registrar_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">பதிவாளர் பெயர்</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registrar_father_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">பதிவாளர் தந்தை பெயர்</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="register_page_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-tamil">பதிவேடு பக்க எண்</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editRecord ? "புதுப்பி" : "சேர்"}
                  </Button>
                </form>
              </Form>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="font-tamil">இறப்பு பதிவு விவரங்கள்</DialogTitle>
            </DialogHeader>
            {viewRecord && (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details" className="font-tamil">விவரங்கள்</TabsTrigger>
                  <TabsTrigger value="preview" className="font-tamil">சான்றிதழ் முன்னோட்டம்</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details">
                  <ScrollArea className="max-h-[55vh] pr-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground font-tamil">இறந்தவர் பெயர்</Label>
                          <p className="font-tamil font-medium">{viewRecord.deceased_name}</p>
                          {viewRecord.deceased_name_en && <p className="text-sm">{viewRecord.deceased_name_en}</p>}
                        </div>
                        <div>
                          <Label className="text-muted-foreground font-tamil">தந்தை பெயர்</Label>
                          <p className="font-tamil font-medium">{viewRecord.deceased_father_name}</p>
                        </div>
                        {(viewRecord as any).deceased_husband_name && (
                          <div>
                            <Label className="text-muted-foreground font-tamil">கணவர் பெயர்</Label>
                            <p className="font-tamil font-medium">{(viewRecord as any).deceased_husband_name}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-muted-foreground font-tamil">வயது</Label>
                          <p className="font-medium">{viewRecord.deceased_age}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground font-tamil">பாலினம்</Label>
                          <p className="font-medium">{viewRecord.deceased_gender === "Male" ? "ஆண்" : "பெண்"}</p>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-muted-foreground font-tamil">முகவரி</Label>
                          <p className="font-tamil">{viewRecord.deceased_address}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground font-tamil">இறப்பு தேதி</Label>
                          <p>{formatISODateToDDMMYYYY(viewRecord.death_date)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground font-tamil">இறப்பு இடம்</Label>
                          <p className="font-tamil">{viewRecord.place_of_death}</p>
                        </div>
                        {viewRecord.burial_date && (
                          <div>
                            <Label className="text-muted-foreground font-tamil">அடக்க தேதி</Label>
                            <p>{formatISODateToDDMMYYYY(viewRecord.burial_date)}</p>
                          </div>
                        )}
                        {viewRecord.burial_place && (
                          <div>
                            <Label className="text-muted-foreground font-tamil">அடக்க இடம்</Label>
                            <p className="font-tamil">{viewRecord.burial_place}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-muted-foreground font-tamil">தெரிவிப்பவர்</Label>
                          <p className="font-tamil">{viewRecord.informant_name} ({viewRecord.informant_relationship})</p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="preview">
                  <ScrollArea className="max-h-[55vh]">
                    <DeathCertificatePreview record={viewRecord} />
                  </ScrollArea>
                </TabsContent>
                
                <div className="flex gap-2 pt-4 border-t mt-4">
                  <Button
                    onClick={() => printDeathCertificate(viewRecord)}
                    disabled={paymentLoading || !isPaymentCompleted}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    அச்சிடு
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => generateDeathCertificatePdf(viewRecord)}
                    disabled={paymentLoading || !isPaymentCompleted}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    பதிவிறக்கு
                  </Button>
                </div>
                {!isPaymentCompleted && (
                  <p className="text-sm text-amber-600 font-tamil mt-2">
                    * சான்றிதழ் அச்சிட/பதிவிறக்க கட்டணம் செலுத்த வேண்டும்
                  </p>
                )}
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>பதிவை நீக்க உறுதிப்படுத்தவும்</AlertDialogTitle>
              <AlertDialogDescription>
                இந்த இறப்பு பதிவை நீக்க விரும்புகிறீர்களா? இந்த செயலை மாற்ற முடியாது.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ரத்து செய்</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteRecordId) {
                    deleteMutation.mutate(deleteRecordId);
                    setDeleteRecordId(null);
                  }
                }}
              >
                நீக்கு
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
