import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/auditLog";
import { toast } from "sonner";
import { incrementHeirCertificateSequence } from "@/components/admin/HeirCertificateNumberSettings";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, Check, X, FileText, Printer, Download, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import HeirCertificatePreview from "@/components/HeirCertificatePreview";
import { generateHeirCertificatePdf, printHeirCertificate, HeirRecord, parseHeirs } from "@/utils/heirCertificatePdf";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function HeirCertificatesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewRecord, setViewRecord] = useState<HeirRecord | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  
  const { getSetting } = useAppSettings(["certificate_fee_heir"]);
  const heirFee = parseFloat(getSetting("certificate_fee_heir")) || 100;

  const { data: heirRecords, isLoading } = useQuery({
    queryKey: ["heir-certificates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heir_certificates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as HeirRecord[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes, record }: { id: string; status: string; notes?: string; record: HeirRecord }) => {
      const updateData: Record<string, unknown> = {
        status,
        admin_notes: notes || null,
      };

      if (status === "approved") {
        updateData.approved_by = user?.id;
        updateData.approved_at = new Date().toISOString();
        updateData.certificate_date = new Date().toISOString().split("T")[0];
      }

      const { error } = await supabase
        .from("heir_certificates")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;

      // Send notification to user
      try {
        let email: string | null = record.applicant_email || null;
        let phone: string | null = record.applicant_phone || null;

        if (email || phone) {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              type: "heir_status_update",
              email: email || undefined,
              phone: phone || undefined,
              recipientName: record.applicant_name,
              data: {
                status,
                applicantName: record.applicant_name,
                deceasedName: record.deceased_name,
                adminNotes: notes,
              },
            },
          });
        }
      } catch (notificationError) {
        console.error("Failed to send heir certificate notification:", notificationError);
      }
    },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["heir-certificates"] });
      toast.success("நிலை புதுப்பிக்கப்பட்டது");
      setViewRecord(null);
      if (variables.status === "approved") {
        await incrementHeirCertificateSequence();
      }
    },
    onError: (error) => {
      toast.error("பிழை: " + error.message);
    },
  });

  const markCashPaymentMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("heir_certificates")
        .update({
          payment_status: "completed",
          status: "submitted",
        })
        .eq("id", id);
      if (error) throw error;

      // Record income for cash payment
      const { data: record } = await supabase
        .from("heir_certificates")
        .select("applicant_name, deceased_name")
        .eq("id", id)
        .single();

      if (record) {
        await supabase.from("income").insert({
          amount: heirFee,
          category: "வாரிசு சான்றிதழ் (Heir Certificate)",
          source: record.applicant_name,
          description: `வாரிசு சான்றிதழ் - ${record.deceased_name}`,
          income_date: new Date().toISOString().split("T")[0],
          payment_method: "Cash",
          reference_id: id,
          reference_type: "heir_certificate",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heir-certificates"] });
      toast.success("ரொக்க பணம் பதிவு செய்யப்பட்டது");
    },
    onError: (error) => {
      toast.error("பிழை: " + error.message);
    },
  });

  const filteredRecords = heirRecords?.filter((record) => {
    const matchesSearch =
      record.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.deceased_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.deceased_father_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">ஒப்புதல்</Badge>;
      case "submitted":
        return <Badge className="bg-yellow-500">சமர்ப்பிக்கப்பட்டது</Badge>;
      case "rejected":
        return <Badge variant="destructive">நிராகரிக்கப்பட்டது</Badge>;
      case "pending":
      case "payment_pending":
        return <Badge variant="secondary">கட்டணம் நிலுவை</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApprove = (record: HeirRecord) => {
    updateStatusMutation.mutate({
      id: record.id,
      status: "approved",
      notes: adminNotes || "Approved by admin",
      record,
    });
  };

  const handleReject = (record: HeirRecord) => {
    updateStatusMutation.mutate({
      id: record.id,
      status: "rejected",
      notes: adminNotes || "Rejected by admin",
      record,
    });
  };

  const handleCashPayment = (record: HeirRecord) => {
    markCashPaymentMutation.mutate({ id: record.id });
  };

  const handlePrint = async (record: HeirRecord) => {
    await printHeirCertificate(record);
  };

  const handleDownload = async (record: HeirRecord) => {
    await generateHeirCertificatePdf(record);
  };

  const pendingCount = heirRecords?.filter((r) => r.status === "submitted").length || 0;
  const approvedCount = heirRecords?.filter((r) => r.status === "approved").length || 0;
  const paymentPendingCount = heirRecords?.filter((r) => r.status === "pending" || r.payment_status === "pending").length || 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-tamil">
              மொத்த கோரிக்கைகள்
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{heirRecords?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-tamil">
              கட்டணம் நிலுவை
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{paymentPendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-tamil">
              ஒப்புதலுக்கு காத்திருப்பவை
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-tamil">
              ஒப்புதல் அளிக்கப்பட்டவை
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-tamil">
            <FileText className="h-5 w-5" />
            வாரிசு சான்றிதழ் (Heir Certificate)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="பெயர் மூலம் தேடு..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="நிலை" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">அனைத்தும்</SelectItem>
                <SelectItem value="pending">கட்டணம் நிலுவை</SelectItem>
                <SelectItem value="submitted">சமர்ப்பிக்கப்பட்டவை</SelectItem>
                <SelectItem value="approved">ஒப்புதல்</SelectItem>
                <SelectItem value="rejected">நிராகரிக்கப்பட்டவை</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">ஏற்றுகிறது...</div>
          ) : filteredRecords?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground font-tamil">
              கோரிக்கைகள் எதுவும் இல்லை
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-tamil">தேதி</TableHead>
                    <TableHead className="font-tamil">மனுதாரர்</TableHead>
                    <TableHead className="font-tamil">இறந்தவர்</TableHead>
                    <TableHead className="font-tamil">தந்தை பெயர்</TableHead>
                    <TableHead className="font-tamil">வாரிசுகள்</TableHead>
                    <TableHead className="font-tamil">நிலை</TableHead>
                    <TableHead className="font-tamil">செயல்கள்</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords?.map((record) => {
                    const heirs = parseHeirs(record.heirs);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap">
                          {record.created_at
                            ? format(new Date(record.created_at), "dd/MM/yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell className="font-tamil font-medium">
                          {record.applicant_name}
                          <div className="text-xs text-muted-foreground">
                            {record.applicant_relationship}
                          </div>
                        </TableCell>
                        <TableCell className="font-tamil">{record.deceased_name}</TableCell>
                        <TableCell className="font-tamil">{record.deceased_father_name}</TableCell>
                        <TableCell className="font-tamil text-sm">
                          {heirs.length} வாரிசுகள்
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setViewRecord(record);
                                setAdminNotes("");
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(record.status === "pending" || record.payment_status === "pending") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700"
                                title="ரொக்கம் செலுத்து"
                                onClick={() => handleCashPayment(record)}
                                disabled={markCashPaymentMutation.isPending}
                              >
                                <IndianRupee className="h-4 w-4" />
                              </Button>
                            )}
                            {record.status === "approved" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePrint(record)}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownload(record)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {record.status === "submitted" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleApprove(record)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleReject(record)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View/Edit Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-tamil">வாரிசு சான்றிதழ் விவரங்கள்</DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-6">
              {/* Preview */}
              <HeirCertificatePreview record={viewRecord} />

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label className="font-tamil">நிர்வாக குறிப்புகள்</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="குறிப்புகள் சேர்க்கவும்..."
                />
              </div>

              {/* Cash Payment Button for pending payments */}
              {(viewRecord.status === "pending" || viewRecord.payment_status === "pending") && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleCashPayment(viewRecord)}
                  disabled={markCashPaymentMutation.isPending}
                >
                  <IndianRupee className="h-4 w-4 mr-2" />
                  ரொக்கம் செலுத்து (₹{heirFee})
                </Button>
              )}

              {/* Action Buttons */}
              {viewRecord.status === "submitted" && (
                <div className="flex gap-4">
                  <Button
                    className="flex-1"
                    onClick={() => handleApprove(viewRecord)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    ஒப்புதல் அளி
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(viewRecord)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    நிராகரி
                  </Button>
                </div>
              )}

              {viewRecord.status === "approved" && (
                <div className="flex gap-4">
                  <Button className="flex-1" onClick={() => handlePrint(viewRecord)}>
                    <Printer className="h-4 w-4 mr-2" />
                    அச்சிடு
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(viewRecord)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF பதிவிறக்கம்
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
