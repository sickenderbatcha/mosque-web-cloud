import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, X, Eye, Loader2, Search, Filter, Printer, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useReceiptHeaderSettings } from "@/hooks/useReceiptHeaderSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RefundRequest {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  reason: string | null;
  status: string;
  admin_notes: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  upi_id: string | null;
  created_at: string;
  processed_at: string | null;
  mahal_bookings: {
    event_type: string;
    event_date: string;
    applicant_name: string;
    applicant_phone: string;
    applicant_email: string | null;
  } | null;
}

const RefundsTab = () => {
  const { user } = useAuth();
  const { settings: headerSettings } = useReceiptHeaderSettings();
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    fetchRefundRequests();
  }, []);

  const fetchRefundRequests = async () => {
    const { data, error } = await supabase
      .from("refund_requests")
      .select(`
        *,
        mahal_bookings (
          event_type,
          event_date,
          applicant_name,
          applicant_phone,
          applicant_email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching refund requests:", error);
    } else {
      setRefundRequests((data as RefundRequest[]) || []);
    }
    setLoading(false);
  };

  // Filtered refund requests
  const filteredRequests = useMemo(() => {
    return refundRequests.filter((refund) => {
      const matchesStatus = statusFilter === "all" || refund.status === statusFilter;
      
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        refund.mahal_bookings?.applicant_name?.toLowerCase().includes(searchLower) ||
        refund.mahal_bookings?.applicant_phone?.toLowerCase().includes(searchLower) ||
        refund.mahal_bookings?.event_type?.toLowerCase().includes(searchLower) ||
        refund.id.toLowerCase().includes(searchLower);
      
      return matchesStatus && matchesSearch;
    });
  }, [refundRequests, statusFilter, searchQuery]);

  const openDetailsDialog = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setDetailsDialogOpen(true);
  };

  const openActionDialog = (refund: RefundRequest, action: "approve" | "reject") => {
    setSelectedRefund(refund);
    setActionType(action);
    setAdminNotes(refund.admin_notes || "");
    setActionDialogOpen(true);
  };

  const processRefund = async () => {
    if (!selectedRefund || !actionType || !user) return;

    setProcessing(true);
    try {
      const newStatus = actionType === "approve" ? "approved" : "rejected";
      
      const { error } = await supabase
        .from("refund_requests")
        .update({
          status: newStatus,
          admin_notes: adminNotes || null,
          processed_at: new Date().toISOString(),
          processed_by: user.id,
        })
        .eq("id", selectedRefund.id);

      if (error) throw error;

      // Update booking status to refunded if approved
      if (actionType === "approve") {
        await supabase
          .from("mahal_bookings")
          .update({ payment_status: "refunded" })
          .eq("id", selectedRefund.booking_id);
      }

      // Send notification to user
      if (selectedRefund.mahal_bookings) {
        supabase.functions.invoke("send-notification-email", {
          body: {
            type: "refund_status_update",
            email: selectedRefund.mahal_bookings.applicant_email || undefined,
            phone: selectedRefund.mahal_bookings.applicant_phone,
            recipientName: selectedRefund.mahal_bookings.applicant_name,
            data: {
              status: newStatus,
              amount: selectedRefund.amount,
              eventType: selectedRefund.mahal_bookings.event_type,
              adminNotes: adminNotes || undefined,
            },
          },
        }).catch(console.error);
      }

      toast.success(`Refund request ${newStatus}`);
      setActionDialogOpen(false);
      fetchRefundRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to process refund request");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      rejected: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "நிலுவையில் (Pending)",
      approved: "அங்கீகரிக்கப்பட்டது (Approved)",
      rejected: "நிராகரிக்கப்பட்டது (Rejected)",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const getPaymentMethod = (refund: RefundRequest) => {
    // Check if no payment details provided - means cash refund
    if (!refund.upi_id && !refund.bank_account_number) {
      return { type: "ரொக்கம் (Cash)", value: "In person at Masjid office" };
    }
    if (refund.upi_id) {
      return { type: "UPI", value: refund.upi_id };
    }
    if (refund.bank_account_number) {
      return { 
        type: "Bank", 
        value: `${refund.bank_account_name || ""} - ****${refund.bank_account_number.slice(-4)}` 
      };
    }
    return { type: "Not provided", value: "-" };
  };

  const buildVoucherHTML = async (refund: RefundRequest, autoPrint = false) => {
    let regularBase64 = "";
    let boldBase64 = "";
    try {
      const [regResp, boldResp] = await Promise.all([
        fetch("/fonts/NotoSansTamil-Regular.ttf"),
        fetch("/fonts/NotoSansTamil-Bold.ttf"),
      ]);
      const [regBuf, boldBuf] = await Promise.all([regResp.arrayBuffer(), boldResp.arrayBuffer()]);
      const toBase64 = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf);
        let binary = "";
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        return btoa(binary);
      };
      regularBase64 = toBase64(regBuf);
      boldBase64 = toBase64(boldBuf);
    } catch (e) {
      console.error("Failed to load Tamil fonts:", e);
    }

    const paymentMethod = getPaymentMethod(refund);
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Refund Voucher</title>
<style>
  @font-face {
    font-family: 'NotoSansTamil';
    src: url(data:font/truetype;base64,${regularBase64}) format('truetype');
    font-weight: 400;
  }
  @font-face {
    font-family: 'NotoSansTamil';
    src: url(data:font/truetype;base64,${boldBase64}) format('truetype');
    font-weight: 700;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'NotoSansTamil', 'Noto Sans Tamil', sans-serif; padding: 30px; color: #111; }
  .voucher { border: 2px solid #333; padding: 24px; max-width: 700px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 16px; }
  .org-name-ta { font-size: 20px; font-weight: 700; }
  .org-name-en { font-size: 16px; font-weight: 700; margin-top: 2px; }
  .org-address { font-size: 12px; color: #444; margin-top: 4px; }
  .voucher-title { font-size: 18px; font-weight: 700; text-align: center; margin: 16px 0; text-decoration: underline; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
  .info-row .label { font-weight: 700; min-width: 180px; }
  .details-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .details-table th, .details-table td { border: 1px solid #666; padding: 8px 12px; text-align: left; font-size: 13px; }
  .details-table th { background: #f0f0f0; font-weight: 700; }
  .amount-highlight { font-size: 18px; font-weight: 700; }
  .received-by { margin-top: 48px; display: flex; justify-content: space-between; align-items: flex-end; }
  .received-by .sign-block { text-align: center; }
  .received-by .sign-line { border-top: 1px solid #333; width: 200px; margin-top: 40px; padding-top: 4px; }
  .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
  @media print { body { padding: 0; } .voucher { border: 2px solid #333; } }
</style>
</head>
<body>
<div class="voucher">
  <div class="header">
    <div class="org-name-ta">${headerSettings.organizationNameTa}</div>
    <div class="org-name-en">${headerSettings.organizationNameEn}</div>
    <div class="org-address">${headerSettings.addressLine1}${headerSettings.addressLine2 ? ", " + headerSettings.addressLine2 : ""}</div>
    ${headerSettings.phone ? `<div class="org-address">Phone: ${headerSettings.phone}</div>` : ""}
  </div>

  <div class="voucher-title">பணத்திரும்ப வவுச்சர்</div>

  <div class="info-row">
    <span><span class="label">வவுச்சர் எண்:</span> REF-${refund.id.substring(0, 8).toUpperCase()}</span>
    <span><span class="label">தேதி:</span> ${format(new Date(), "dd/MM/yyyy")}</span>
  </div>

  <table class="details-table">
    <tr><th>விவரம்</th><th>தகவல்</th></tr>
    <tr><td>விண்ணப்பதாரர் பெயர்</td><td>${refund.mahal_bookings?.applicant_name || "N/A"}</td></tr>
    <tr><td>தொலைபேசி எண்</td><td>${refund.mahal_bookings?.applicant_phone || "N/A"}</td></tr>
    <tr><td>நிகழ்வு வகை</td><td>${refund.mahal_bookings?.event_type || "N/A"}</td></tr>
    <tr><td>நிகழ்வு தேதி</td><td>${refund.mahal_bookings?.event_date ? format(new Date(refund.mahal_bookings.event_date), "dd/MM/yyyy") : "-"}</td></tr>
    <tr><td>திரும்ப பெறும் காரணம்</td><td>${refund.reason || "N/A"}</td></tr>
    <tr><td>திரும்ப பெறும் தொகை</td><td class="amount-highlight">₹${Number(refund.amount).toLocaleString()}</td></tr>
    <tr><td>பணம் செலுத்தும் முறை</td><td>${paymentMethod.type}</td></tr>
    <tr><td>பணம் செலுத்தும் விவரம்</td><td>${refund.upi_id ? "UPI: " + refund.upi_id : refund.bank_account_number ? "வங்கி: " + (refund.bank_account_name || "") + " - " + refund.bank_account_number + (refund.bank_ifsc ? " (IFSC: " + refund.bank_ifsc + ")" : "") : "ரொக்கம்"}</td></tr>
    <tr><td>கோரிக்கை தேதி</td><td>${format(new Date(refund.created_at), "dd/MM/yyyy")}</td></tr>
    <tr><td>செயல்படுத்திய தேதி</td><td>${refund.processed_at ? format(new Date(refund.processed_at), "dd/MM/yyyy, hh:mm a") : "-"}</td></tr>
    ${refund.admin_notes ? `<tr><td>நிர்வாக குறிப்புகள்</td><td>${refund.admin_notes}</td></tr>` : ""}
  </table>

  <div class="received-by">
    <div class="sign-block">
      <div class="sign-line">பெறுநர் கையொப்பம்</div>
    </div>
    <div class="sign-block">
      <div class="sign-line">அங்கீகரிக்கப்பட்ட கையொப்பம்</div>
    </div>
  </div>

  <div class="footer">
    <div>${headerSettings.footerMessage}</div>
    <div>${headerSettings.footerMessageEn}</div>
  </div>
</div>
${autoPrint ? `<script>window.onload = function() { window.print(); }</script>` : ""}
</body>
</html>`;
  };

  const printRefundVoucher = async (refund: RefundRequest) => {
    const html = await buildVoucherHTML(refund, true);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const downloadRefundVoucher = async (refund: RefundRequest) => {
    const html = await buildVoucherHTML(refund, false);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `refund-voucher-REF-${refund.id.substring(0, 8).toUpperCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{refundRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {refundRequests.filter((r) => r.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {refundRequests.filter((r) => r.status === "approved").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Refunded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ₹{refundRequests
                .filter((r) => r.status === "approved")
                .reduce((sum, r) => sum + r.amount, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>பணத்திரும்ப கோரிக்கைகள் (Refund Requests)</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Requested On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((refund) => {
                const paymentMethod = getPaymentMethod(refund);
                return (
                  <TableRow key={refund.id}>
                    <TableCell>
                      <div className="font-medium">{refund.mahal_bookings?.applicant_name || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">
                        {refund.mahal_bookings?.applicant_phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{refund.mahal_bookings?.event_type || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">
                        {refund.mahal_bookings?.event_date
                          ? format(new Date(refund.mahal_bookings.event_date), "dd/MM/yyyy")
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      ₹{Number(refund.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <Badge variant="outline" className="mb-1">{paymentMethod.type}</Badge>
                        <div className="text-muted-foreground truncate max-w-[120px]" title={paymentMethod.value}>
                          {paymentMethod.value}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(refund.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{getStatusBadge(refund.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailsDialog(refund)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {refund.status === "approved" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => printRefundVoucher(refund)}
                              title="அச்சிடு"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadRefundVoucher(refund)}
                              title="பதிவிறக்கம்"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {refund.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => openActionDialog(refund, "approve")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => openActionDialog(refund, "reject")}
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
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {searchQuery || statusFilter !== "all" 
                      ? "No refund requests match your filters" 
                      : "No refund requests found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Refund Request Details</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Applicant</Label>
                  <p className="font-medium">{selectedRefund.mahal_bookings?.applicant_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedRefund.mahal_bookings?.applicant_phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Event Type</Label>
                  <p className="font-medium">{selectedRefund.mahal_bookings?.event_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Refund Amount</Label>
                  <p className="font-semibold text-primary">₹{selectedRefund.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Event Date</Label>
                  <p className="font-medium">
                    {selectedRefund.mahal_bookings?.event_date 
                      ? format(new Date(selectedRefund.mahal_bookings.event_date), "dd/MM/yyyy")
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRefund.status)}</div>
                </div>
              </div>

              {selectedRefund.reason && (
                <div>
                  <Label className="text-muted-foreground">Reason for Refund</Label>
                  <p className="mt-1 p-2 bg-muted rounded">{selectedRefund.reason}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Payment Details for Refund</h4>
                {selectedRefund.upi_id ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-muted-foreground">UPI ID</Label>
                    <p className="font-medium text-lg">{selectedRefund.upi_id}</p>
                  </div>
                ) : selectedRefund.bank_account_number ? (
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                    <div>
                      <Label className="text-muted-foreground">Account Name</Label>
                      <p className="font-medium">{selectedRefund.bank_account_name || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Account Number</Label>
                      <p className="font-medium">{selectedRefund.bank_account_number}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">IFSC Code</Label>
                      <p className="font-medium">{selectedRefund.bank_ifsc || "-"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No payment details provided</p>
                )}
              </div>

              {selectedRefund.admin_notes && (
                <div>
                  <Label className="text-muted-foreground">Admin Notes</Label>
                  <p className="mt-1 p-2 bg-muted rounded">{selectedRefund.admin_notes}</p>
                </div>
              )}

              {selectedRefund.processed_at && (
                <div className="text-sm text-muted-foreground">
                  Processed on: {format(new Date(selectedRefund.processed_at), "dd/MM/yyyy, hh:mm a")}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Refund" : "Reject Refund"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Confirm that you have processed the refund payment. The booking will be marked as refunded."
                : "Provide a reason for rejecting this refund request."}
            </DialogDescription>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{selectedRefund.mahal_bookings?.applicant_name}</div>
                <div className="text-lg font-semibold text-primary">
                  ₹{selectedRefund.amount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {selectedRefund.upi_id 
                    ? `UPI: ${selectedRefund.upi_id}` 
                    : selectedRefund.bank_account_number 
                      ? `Bank: ****${selectedRefund.bank_account_number.slice(-4)}` 
                      : "No payment details"}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes {actionType === "reject" && <span className="text-destructive">*</span>}</Label>
                <Textarea
                  placeholder={
                    actionType === "approve"
                      ? "Optional: Add transaction ID or reference number..."
                      : "Provide reason for rejection..."
                  }
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={processRefund}
              disabled={processing || (actionType === "reject" && !adminNotes.trim())}
              className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : actionType === "approve" ? (
                "Confirm Approval"
              ) : (
                "Reject Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RefundsTab;