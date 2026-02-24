import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Check, X, Eye, Clock, IndianRupee, AlertCircle, Printer } from "lucide-react";
import CashPaymentReceipt from "@/components/CashPaymentReceipt";

// Helper to format service details labels
const SERVICE_DETAIL_LABELS: Record<string, string> = {
  purpose: "நோக்கம் (Purpose)",
  event_date: "நிகழ்வு தேதி (Event Date)",
  event_type: "நிகழ்வு வகை (Event Type)",
  expected_guests: "எதிர்பார்க்கப்படும் விருந்தினர்கள் (Expected Guests)",
  start_time: "தொடக்க நேரம் (Start Time)",
  end_time: "முடிவு நேரம் (End Time)",
  special_requirements: "சிறப்புத் தேவைகள் (Special Requirements)",
  donor_address: "நன்கொடையாளர் முகவரி (Donor Address)",
  is_anonymous: "அநாமதேயம் (Anonymous)",
  certificate_type: "சான்றிதழ் வகை (Certificate Type)",
  member_id: "உறுப்பினர் எண் (Member ID)",
  member_name: "உறுப்பினர் பெயர் (Member Name)",
  subscription_type: "சந்தா வகை (Subscription Type)",
  subscription_year: "சந்தா ஆண்டு (Subscription Year)",
  from_month: "தொடக்க மாதம் (From Month)",
  to_month: "முடிவு மாதம் (To Month)",
  number_of_months: "மாதங்களின் எண்ணிக்கை (Number of Months)",
  deceased_name: "இறந்தவர் பெயர் (Deceased Name)",
  father_name: "தந்தை பெயர் (Father Name)",
  family_name: "குடும்பப் பெயர் (Family Name)",
  mosque_to_submit: "சமர்ப்பிக்கும் மசூதி (Mosque)",
  address_to_submit: "சமர்ப்பிக்கும் முகவரி (Address)",
};

// Helper to format value for display
const formatDetailValue = (key: string, value: any): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "ஆம் (Yes)" : "இல்லை (No)";
  if (key.includes("date") && typeof value === "string") {
    try {
      return format(new Date(value), "dd/MM/yyyy");
    } catch {
      return value;
    }
  }
  return String(value);
};

interface CashPaymentRequest {
  id: string;
  service_type: string;
  reference_id: string | null;
  amount: number;
  applicant_name: string;
  applicant_phone: string;
  applicant_email: string | null;
  failure_reason: string | null;
  user_notes: string | null;
  service_details: Record<string, any> | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  booking: "மஹால் முன்பதிவு (Mahal Booking)",
  donation: "நன்கொடை (Donation)",
  certificate: "சான்றிதழ் (Certificate)",
  subscription: "சந்தா (Subscription)",
  noc: "ஆட்சேபனையின்மை சான்றிதழ் (NOC)",
  heir: "வாரிசு சான்றிதழ் (Heir)",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
   paid: "bg-blue-100 text-blue-800",
};

const CashPaymentRequestsTab = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<CashPaymentRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterService, setFilterService] = useState<string>("all");
  const [receiptRequest, setReceiptRequest] = useState<CashPaymentRequest | null>(null);
  const [confirmPrintRequest, setConfirmPrintRequest] = useState<CashPaymentRequest | null>(null);

   const markAsPaidMutation = useMutation({
     mutationFn: async (id: string) => {
       // First get the request to check service type and reference_id
       const { data: request, error: fetchError } = await supabase
         .from("cash_payment_requests")
         .select("service_type, reference_id")
         .eq("id", id)
         .single();
       
       if (fetchError) throw fetchError;

       // Update the cash payment request status to paid
       const { error } = await supabase
         .from("cash_payment_requests")
         .update({
           status: "paid",
           processed_at: new Date().toISOString(),
         })
         .eq("id", id);
 
       if (error) throw error;

       // If it's a booking, also update the booking payment_status to paid
       if (request?.service_type === "booking" && request?.reference_id) {
         await supabase
           .from("mahal_bookings")
           .update({ 
             payment_status: "paid",
             admin_notes: "Cash payment received" 
           })
           .eq("id", request.reference_id);
       }
     },
     onSuccess: () => {
       toast.success("ரசீது அச்சிடப்பட்டது, நிலை புதுப்பிக்கப்பட்டது (Receipt printed, status updated to paid)");
       queryClient.invalidateQueries({ queryKey: ["cash-payment-requests"] });
       queryClient.invalidateQueries({ queryKey: ["cash-payment-requests-stats"] });
     },
     onError: (error) => {
       console.error("Error marking as paid:", error);
       toast.error("நிலை புதுப்பிக்கத்தில் பிழை (Error updating status)");
     },
   });
 
   const handleReceiptPrinted = (requestId: string) => {
     markAsPaidMutation.mutate(requestId);
   };
 
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["cash-payment-requests", filterStatus, filterService],
    queryFn: async () => {
      let query = supabase
        .from("cash_payment_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }
      if (filterService !== "all") {
        query = query.eq("service_type", filterService);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CashPaymentRequest[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["cash-payment-requests-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_payment_requests")
        .select("status, amount");
      if (error) throw error;

      const pending = data.filter((r) => r.status === "pending");
      const approved = data.filter((r) => r.status === "approved");
      
      return {
        pendingCount: pending.length,
        pendingAmount: pending.reduce((sum, r) => sum + Number(r.amount), 0),
        approvedCount: approved.length,
        approvedAmount: approved.reduce((sum, r) => sum + Number(r.amount), 0),
        totalCount: data.length,
      };
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("cash_payment_requests")
        .update({
          status,
          admin_notes: notes,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // If approved, update the related service payment status
      if (status === "approved" && selectedRequest) {
        await updateServicePaymentStatus(selectedRequest);
      }
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === "approved"
          ? "கோரிக்கை அங்கீகரிக்கப்பட்டது (Request approved)"
          : "கோரிக்கை நிராகரிக்கப்பட்டது (Request rejected)"
      );
      queryClient.invalidateQueries({ queryKey: ["cash-payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["cash-payment-requests-stats"] });
      setSelectedRequest(null);
      setAdminNotes("");
    },
    onError: (error) => {
      console.error("Error processing request:", error);
      toast.error("செயலாக்கத்தில் பிழை (Error processing request)");
    },
  });

  const updateServicePaymentStatus = async (request: CashPaymentRequest) => {
    const { service_type, reference_id, service_details, applicant_name, applicant_phone, applicant_email, amount } = request;

    try {
      switch (service_type) {
        case "booking":
          if (reference_id) {
            // Only approve the booking, payment stays pending until receipt is printed
            await supabase
              .from("mahal_bookings")
              .update({ 
                status: "approved", 
                admin_notes: "Cash payment approved - awaiting receipt" 
              })
              .eq("id", reference_id);
          }
          break;

        case "donation":
          // For donations, we might need to create a new donation record
          if (reference_id) {
            await supabase
              .from("donations")
              .update({ payment_status: "completed", payment_method: "cash" })
              .eq("id", reference_id);
          } else if (service_details) {
            // Create new donation if no reference
            await supabase.from("donations").insert({
              donor_name: applicant_name,
              donor_phone: applicant_phone,
              donor_email: applicant_email,
              amount: amount,
              purpose: service_details.purpose || "General Donation",
              payment_status: "completed",
              payment_method: "cash",
              is_anonymous: service_details.is_anonymous || false,
              donor_address: service_details.donor_address,
              donated_at: new Date().toISOString(),
            });
          }
          break;

        case "subscription":
          if (reference_id) {
            await supabase
              .from("subscriptions")
              .update({ payment_status: "completed", payment_method: "Cash" })
              .eq("id", reference_id);
          }
          break;

        case "certificate":
          if (reference_id) {
            await supabase
              .from("certificate_payments")
              .update({ payment_status: "completed", payment_method: "cash" })
              .eq("id", reference_id);
          }
          break;

        case "noc":
          if (reference_id) {
            await supabase
              .from("noc_certificates")
              .update({ payment_status: "completed" })
              .eq("id", reference_id);
          }
          break;

        case "heir":
          if (reference_id) {
            await supabase
              .from("heir_certificates")
              .update({ payment_status: "completed" })
              .eq("id", reference_id);
          }
          break;
      }
    } catch (error) {
      console.error("Error updating service payment status:", error);
    }
  };

  const handleProcess = (status: "approved" | "rejected") => {
    if (!selectedRequest) return;
    processMutation.mutate({
      id: selectedRequest.id,
      status,
      notes: adminNotes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">நிலுவையில் உள்ளது (Pending)</p>
                <p className="text-2xl font-bold">{stats?.pendingCount || 0}</p>
                <p className="text-sm text-muted-foreground">₹{stats?.pendingAmount?.toLocaleString() || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">அங்கீகரிக்கப்பட்டது (Approved)</p>
                <p className="text-2xl font-bold">{stats?.approvedCount || 0}</p>
                <p className="text-sm text-muted-foreground">₹{stats?.approvedAmount?.toLocaleString() || 0}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">மொத்தம் (Total)</p>
                <p className="text-2xl font-bold">{stats?.totalCount || 0}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>ரொக்க செலுத்துதல் கோரிக்கைகள் (Cash Payment Requests)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="நிலை வடிகட்டு" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">அனைத்தும் (All)</SelectItem>
                <SelectItem value="pending">நிலுவையில் (Pending)</SelectItem>
                <SelectItem value="approved">அங்கீகரிக்கப்பட்டது (Approved)</SelectItem>
                 <SelectItem value="paid">ரொக்கம் பெறப்பட்டது (Paid)</SelectItem>
                <SelectItem value="rejected">நிராகரிக்கப்பட்டது (Rejected)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="சேவை வடிகட்டு" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">அனைத்து சேவைகள் (All Services)</SelectItem>
                <SelectItem value="booking">மஹால் முன்பதிவு</SelectItem>
                <SelectItem value="donation">நன்கொடை</SelectItem>
                <SelectItem value="subscription">சந்தா</SelectItem>
                <SelectItem value="certificate">சான்றிதழ்</SelectItem>
                <SelectItem value="noc">NOC</SelectItem>
                <SelectItem value="heir">வாரிசு சான்றிதழ்</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              கோரிக்கைகள் இல்லை (No requests found)
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>தேதி (Date)</TableHead>
                  <TableHead>சேவை (Service)</TableHead>
                  <TableHead>விண்ணப்பதாரர் (Applicant)</TableHead>
                  <TableHead>தொகை (Amount)</TableHead>
                  <TableHead>நிலை (Status)</TableHead>
                  <TableHead>செயல் (Action)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {format(new Date(request.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {SERVICE_TYPE_LABELS[request.service_type] || request.service_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.applicant_name}</p>
                        <p className="text-sm text-muted-foreground">{request.applicant_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">₹{request.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[request.status]}>
                        {request.status === "pending" && "நிலுவையில்"}
                        {request.status === "approved" && "அங்கீகரிக்கப்பட்டது"}
                         {request.status === "paid" && "ரொக்கம் பெறப்பட்டது"}
                        {request.status === "rejected" && "நிராகரிக்கப்பட்டது"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setAdminNotes(request.admin_notes || "");
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          விவரங்கள்
                        </Button>
                         {(request.status === "approved" || request.status === "paid") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmPrintRequest(request)}
                            title="ரசீது / Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>கோரிக்கை விவரங்கள் (Request Details)</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">சேவை வகை (Service Type)</p>
                  <p className="font-medium">{SERVICE_TYPE_LABELS[selectedRequest.service_type]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">தொகை (Amount)</p>
                  <p className="font-medium text-lg">₹{selectedRequest.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">விண்ணப்பதாரர் (Applicant)</p>
                  <p className="font-medium">{selectedRequest.applicant_name}</p>
                  <p className="text-sm">{selectedRequest.applicant_phone}</p>
                  {selectedRequest.applicant_email && (
                    <p className="text-sm">{selectedRequest.applicant_email}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">கோரிக்கை தேதி (Request Date)</p>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>

              {selectedRequest.failure_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">தோல்வி காரணம் (Failure Reason)</p>
                      <p className="text-sm text-red-700">{selectedRequest.failure_reason}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedRequest.user_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800">பயனர் குறிப்புகள் (User Notes)</p>
                  <p className="text-sm text-blue-700">{selectedRequest.user_notes}</p>
                </div>
              )}

              {selectedRequest.service_details && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">சேவை விவரங்கள் (Service Details)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(selectedRequest.service_details).map(([key, value]) => (
                      <div key={key} className="bg-white p-2 rounded border">
                        <p className="text-xs text-muted-foreground">
                          {SERVICE_DETAIL_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </p>
                        <p className="text-sm font-medium">{formatDetailValue(key, value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.status === "pending" && (
                <div className="bg-muted/30 border border-border rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">நிர்வாக குறிப்புகள் (Admin Notes)</p>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="குறிப்புகளை இங்கே உள்ளிடவும்..."
                    rows={3}
                    className="bg-background"
                  />
                </div>
              )}

              {selectedRequest.status !== "pending" && selectedRequest.admin_notes && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-medium">நிர்வாக குறிப்புகள் (Admin Notes)</p>
                  <p className="text-sm">{selectedRequest.admin_notes}</p>
                  {selectedRequest.processed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      செயலாக்கப்பட்டது: {format(new Date(selectedRequest.processed_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t mt-4 shrink-0">
             {(selectedRequest?.status === "approved" || selectedRequest?.status === "paid") && (
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmPrintRequest(selectedRequest);
                  setSelectedRequest(null);
                }}
                className="w-full sm:w-auto"
              >
                <Printer className="h-4 w-4 mr-2" />
                ரசீது / Receipt
              </Button>
            )}
            {selectedRequest?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleProcess("rejected")}
                  disabled={processMutation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  நிராகரி (Reject)
                </Button>
                <Button
                  onClick={() => handleProcess("approved")}
                  disabled={processMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  அங்கீகரி (Approve)
                </Button>
              </>
            )}
            {selectedRequest?.status !== "pending" && (
              null
            )}
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              மூடு (Close)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Confirmation Dialog */}
      <AlertDialog open={!!confirmPrintRequest} onOpenChange={() => setConfirmPrintRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ரசீது அச்சிட / Print Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPrintRequest?.status === "approved" 
                ? "ரசீது அச்சிட்ட பிறகு, நிலை 'ரொக்கம் பெறப்பட்டது' என மாற்றப்படும். தொடரவா? (After printing, the status will be changed to 'Paid'. Continue?)"
                : "ரசீதை அச்சிட வேண்டுமா? (Do you want to print the receipt?)"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ரத்து (Cancel)</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setReceiptRequest(confirmPrintRequest);
              setConfirmPrintRequest(null);
            }}>
              <Printer className="h-4 w-4 mr-2" />
              தொடர் (Continue)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Modal */}
      {receiptRequest && (
        <CashPaymentReceipt
          request={receiptRequest}
          onClose={() => setReceiptRequest(null)}
           onPrinted={handleReceiptPrinted}
        />
      )}
    </div>
  );
};

export default CashPaymentRequestsTab;
