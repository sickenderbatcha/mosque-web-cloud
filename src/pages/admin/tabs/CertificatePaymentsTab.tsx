import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Eye, Check, X, IndianRupee, FileText, Receipt } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import CertificateReceipt, { CertificateReceiptData } from "@/components/CertificateReceipt";

interface CertificatePayment {
  id: string;
  certificate_type: string;
  reference_id: string;
  applicant_name: string;
  applicant_phone: string;
  applicant_email: string | null;
  amount: number;
  payment_status: string;
  payment_method: string | null;
  transaction_id: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function CertificatePaymentsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewPayment, setViewPayment] = useState<CertificatePayment | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [showReceipt, setShowReceipt] = useState<CertificateReceiptData | null>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["certificate-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificate_payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CertificatePayment[];
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updateData: any = {
        payment_status: status,
        admin_notes: notes || null,
      };
      
      if (status === "completed") {
        updateData.payment_method = "cash";
        updateData.processed_by = user?.id;
        updateData.transaction_id = "CASH-" + id.substring(0, 8).toUpperCase();
      }

      const { error } = await supabase
        .from("certificate_payments")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-payments"] });
      toast.success("Payment updated successfully");
      setViewPayment(null);
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });

  const filteredPayments = payments?.filter((payment) => {
    const matchesSearch =
      payment.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.applicant_phone.includes(searchTerm) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || payment.payment_status === statusFilter;
    const matchesType = typeFilter === "all" || payment.certificate_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "marriage":
        return <Badge variant="outline" className="border-pink-500 text-pink-600">Marriage</Badge>;
      case "death":
        return <Badge variant="outline" className="border-gray-500 text-gray-600">Death</Badge>;
      case "bonafide":
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Bonafide</Badge>;
      case "noc":
        return <Badge variant="outline" className="border-purple-500 text-purple-600">NOC</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const totalAmount = filteredPayments?.reduce((sum, p) => 
    p.payment_status === "completed" ? sum + Number(p.amount) : sum, 0
  ) || 0;

  const pendingCount = payments?.filter(p => p.payment_status === "pending").length || 0;
  const completedCount = payments?.filter(p => p.payment_status === "completed").length || 0;

  const handleMarkAsPaid = (payment: CertificatePayment) => {
    updatePaymentMutation.mutate({
      id: payment.id,
      status: "completed",
      notes: adminNotes || "Marked as paid by admin",
    });
  };

  const handleMarkAsFailed = (payment: CertificatePayment) => {
    updatePaymentMutation.mutate({
      id: payment.id,
      status: "failed",
      notes: adminNotes || "Marked as failed by admin",
    });
  };

  const openReceipt = (payment: CertificatePayment) => {
    const certificateType = payment.certificate_type as "marriage" | "death" | "noc" | "heir";
    setShowReceipt({
      certificateType,
      applicantName: payment.applicant_name,
      applicantPhone: payment.applicant_phone,
      applicantEmail: payment.applicant_email || undefined,
      amount: payment.amount,
      receiptNumber: payment.transaction_id || payment.id.substring(0, 8).toUpperCase(),
      paymentMethod: payment.payment_method || "cash",
      transactionId: payment.transaction_id || undefined,
      createdAt: payment.created_at,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <IndianRupee className="h-5 w-5" />
              {totalAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Certificate Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="marriage">Marriage</SelectItem>
                <SelectItem value="death">Death</SelectItem>
                <SelectItem value="bonafide">Bonafide</SelectItem>
                <SelectItem value="noc">NOC</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredPayments?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No certificate payments found
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments?.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(payment.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{getTypeBadge(payment.certificate_type)}</TableCell>
                      <TableCell className="font-medium">{payment.applicant_name}</TableCell>
                      <TableCell>{payment.applicant_phone}</TableCell>
                      <TableCell className="flex items-center">
                        <IndianRupee className="h-3 w-3" />
                        {payment.amount}
                      </TableCell>
                      <TableCell>
                        {payment.payment_method ? (
                          <Badge variant="outline">{payment.payment_method}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {payment.transaction_id || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setViewPayment(payment);
                              setAdminNotes(payment.admin_notes || "");
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payment.payment_status === "completed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:text-primary/80"
                              onClick={() => openReceipt(payment)}
                              title="View Receipt"
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                          )}
                          {payment.payment_status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleMarkAsPaid(payment)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleMarkAsFailed(payment)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View/Edit Dialog */}
      <Dialog open={!!viewPayment} onOpenChange={() => setViewPayment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Certificate Payment Details</DialogTitle>
          </DialogHeader>
          {viewPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Certificate Type</Label>
                  <p className="font-medium capitalize">{viewPayment.certificate_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(viewPayment.payment_status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Applicant Name</Label>
                  <p className="font-medium">{viewPayment.applicant_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{viewPayment.applicant_phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{viewPayment.applicant_email || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="font-medium flex items-center">
                    <IndianRupee className="h-4 w-4" />
                    {viewPayment.amount}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium">{viewPayment.payment_method || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Transaction ID</Label>
                  <p className="font-medium text-xs font-mono">
                    {viewPayment.transaction_id || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="font-medium">
                    {format(new Date(viewPayment.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reference ID</Label>
                  <p className="font-medium text-xs font-mono">
                    {viewPayment.reference_id.substring(0, 8)}...
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add admin notes..."
                  className="mt-1"
                />
              </div>

              {viewPayment.payment_status === "pending" && (
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={() => handleMarkAsPaid(viewPayment)}
                    disabled={updatePaymentMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark as Paid (Cash)
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleMarkAsFailed(viewPayment)}
                    disabled={updatePaymentMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Mark as Failed
                  </Button>
                </div>
              )}

              {viewPayment.payment_status === "completed" && (
                <div className="pt-4">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      openReceipt(viewPayment);
                      setViewPayment(null);
                    }}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    View Receipt / ரசீது பார்க்க
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Certificate Receipt Modal */}
      {showReceipt && (
        <CertificateReceipt data={showReceipt} onClose={() => setShowReceipt(null)} />
      )}
    </div>
  );
}