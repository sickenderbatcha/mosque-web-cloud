import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, X, Printer, Ban } from "lucide-react";
import BookingReceipt from "@/components/BookingReceipt";
import TableFilter from "@/components/admin/TableFilter";
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

interface Booking {
  id: string;
  applicant_name: string;
  applicant_phone: string;
  applicant_email: string | null;
  event_type: string;
  event_date: string;
  start_time: string;
  end_time: string;
  expected_guests: number | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  booking_amount: number | null;
  payment_status: string | null;
  created_at: string;
  user_id: string | null;
}

const BookingsTab = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  
  // Filter states
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Cancel dialog states
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const pageSize = 1000;
    let allBookings: Booking[] = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from("mahal_bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error("Error fetching bookings:", error);
        break;
      }
      
      if (data && data.length > 0) {
        allBookings = [...allBookings, ...data];
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    setBookings(allBookings);
    setLoading(false);
  };

  const updateBookingStatus = async (id: string, status: "approved" | "rejected") => {
    const booking = bookings.find((b) => b.id === id);
    
    const { error } = await supabase
      .from("mahal_bookings")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update booking status");
    } else {
      if (booking) {
        supabase.functions.invoke("send-notification-email", {
          body: {
            type: "booking_status_update",
            email: booking.applicant_email || undefined,
            phone: booking.applicant_phone,
            recipientName: booking.applicant_name,
            data: {
              status,
              eventType: booking.event_type,
              eventDate: booking.event_date,
            },
          },
        }).catch(console.error);
      }
      
      toast.success(`Booking ${status}`);
      fetchBookings();
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelBooking) return;
    setIsCancelling(true);

    try {
      const wasPaid = cancelBooking.payment_status === "paid" || cancelBooking.payment_status === "completed";

      // 1. Update booking status to cancelled, payment_status to refunded if paid
      const bookingUpdate: Record<string, any> = {
        status: "cancelled",
        admin_notes: cancelReason ? `ரத்து காரணம்: ${cancelReason}` : "நிர்வாகியால் ரத்து செய்யப்பட்டது (Cancelled by admin)",
      };
      if (wasPaid) {
        bookingUpdate.payment_status = "refunded";
      }

      const { error: bookingError } = await supabase
        .from("mahal_bookings")
        .update(bookingUpdate)
        .eq("id", cancelBooking.id);

      if (bookingError) throw bookingError;

      // 2. Cancel associated cash payment requests
      const { error: cashError } = await supabase
        .from("cash_payment_requests")
        .update({
          status: "cancelled",
          admin_notes: cancelReason ? `முன்பதிவு ரத்து: ${cancelReason}` : "முன்பதிவு ரத்து செய்யப்பட்டது (Booking cancelled)",
          processed_at: new Date().toISOString(),
        })
        .eq("reference_id", cancelBooking.id)
        .eq("service_type", "booking")
        .in("status", ["pending", "approved", "paid"]);

      if (cashError) console.error("Error cancelling cash payment requests:", cashError);

      // 3. Auto-create refund request for paid bookings
      if (wasPaid && cancelBooking.booking_amount && cancelBooking.booking_amount > 0) {
        const { error: refundError } = await supabase
          .from("refund_requests")
          .insert({
            booking_id: cancelBooking.id,
            user_id: cancelBooking.user_id || "00000000-0000-0000-0000-000000000000",
            amount: cancelBooking.booking_amount,
            reason: cancelReason || "முன்பதிவு நிர்வாகியால் ரத்து செய்யப்பட்டது (Booking cancelled by admin)",
            status: "pending",
          });

        if (refundError) console.error("Error creating refund request:", refundError);
      }

      toast.success("முன்பதிவு ரத்து செய்யப்பட்டது (Booking cancelled)");
      setCancelBooking(null);
      setCancelReason("");
      fetchBookings();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("ரத்து செய்வதில் பிழை (Error cancelling booking)");
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrintReceipt = (booking: Booking) => {
    if (booking.payment_status !== "paid" && booking.payment_status !== "completed") {
      toast.error("Receipt can only be printed for paid bookings");
      return;
    }
    setSelectedBooking(booking);
    setShowReceipt(true);
  };

  const getServicesFromAmount = (amount: number): { name: string; rate: number }[] => {
    const services: { name: string; rate: number }[] = [];
    let remaining = amount;
    
    if (remaining >= 15000) {
      services.push({ name: "மண்டபம் (Hall)", rate: 15000 });
      remaining -= 15000;
    }
    if (remaining >= 10000) {
      services.push({ name: "உணவு இட வசதி (Dining Hall)", rate: 10000 });
      remaining -= 10000;
    }
    if (remaining >= 500) {
      services.push({ name: "நிக்காஹ் புத்தகம் (Nikkah Book)", rate: 500 });
      remaining -= 500;
    }
    
    if (services.length === 0) {
      services.push({ name: "Booking Services", rate: amount });
    }
    
    return services;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      rejected: "destructive",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getPaymentBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Pending</Badge>;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "outline",
      refunded: "secondary",
      completed: "default",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const searchLower = searchValue.toLowerCase();
      const matchesSearch = !searchValue ||
        booking.applicant_name.toLowerCase().includes(searchLower) ||
        booking.applicant_phone.toLowerCase().includes(searchLower) ||
        booking.applicant_email?.toLowerCase().includes(searchLower) ||
        booking.event_type.toLowerCase().includes(searchLower) ||
        booking.id.toLowerCase().includes(searchLower);

      const matchesStatus = !filterValues.status || filterValues.status === "all" ||
        booking.status === filterValues.status;

      const matchesPayment = !filterValues.payment_status || filterValues.payment_status === "all" ||
        booking.payment_status === filterValues.payment_status;

      const matchesEventType = !filterValues.event_type || filterValues.event_type === "all" ||
        booking.event_type === filterValues.event_type;

      return matchesSearch && matchesStatus && matchesPayment && matchesEventType;
    });
  }, [bookings, searchValue, filterValues]);

  const eventTypes = useMemo(() => {
    const types = [...new Set(bookings.map(b => b.event_type))];
    return types.map(t => ({ label: t, value: t }));
  }, [bookings]);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <>
      {showReceipt && selectedBooking && (
        <BookingReceipt
          booking={{
            applicantName: selectedBooking.applicant_name,
            applicantPhone: selectedBooking.applicant_phone,
            applicantEmail: selectedBooking.applicant_email || undefined,
            eventType: selectedBooking.event_type,
            eventDate: selectedBooking.event_date,
            startTime: selectedBooking.start_time,
            endTime: selectedBooking.end_time,
            expectedGuests: selectedBooking.expected_guests?.toString(),
            amount: Number(selectedBooking.booking_amount || 0),
            bookingId: selectedBooking.id,
            services: getServicesFromAmount(Number(selectedBooking.booking_amount || 0)),
            paymentMethod: selectedBooking.payment_status === "completed" ? "online" : selectedBooking.payment_status === "paid" ? "cash" : undefined,
          }}
          onClose={() => {
            setShowReceipt(false);
            setSelectedBooking(null);
          }}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelBooking} onOpenChange={() => { setCancelBooking(null); setCancelReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>முன்பதிவை ரத்து செய்ய வேண்டுமா? (Cancel Booking?)</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  <strong>{cancelBooking?.applicant_name}</strong> அவர்களின் <strong>{cancelBooking?.event_type}</strong> முன்பதிவு ({cancelBooking?.event_date}) ரத்து செய்யப்படும்.
                </p>
                {(cancelBooking?.payment_status === "paid" || cancelBooking?.payment_status === "completed") && (
                  <p className="text-destructive font-medium">
                    ⚠ இந்த முன்பதிவுக்கு பணம் செலுத்தப்பட்டுள்ளது. பணத்திரும்ப கோரிக்கை தானாக உருவாக்கப்படும். (Payment was received. A refund request will be auto-created.)
                  </p>
                )}
                <div>
                  <label className="text-sm font-medium">ரத்து காரணம் (Cancellation Reason - Optional)</label>
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="ரத்து காரணத்தை உள்ளிடவும்... (Enter cancellation reason...)"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>வேண்டாம் (No)</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCancelBooking(); }}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "ரத்து செய்கிறது..." : "ஆம், ரத்து செய் (Yes, Cancel)"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {bookings.filter((b) => b.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {bookings.filter((b) => b.status === "approved").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ₹{bookings
                  .filter((b) => b.payment_status === "paid")
                  .reduce((sum, b) => sum + Number(b.booking_amount || 0), 0)
                  .toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <TableFilter
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Search by name, phone, email, event type..."
              filters={[
                { label: "Status", value: "status", options: [
                  { label: "Pending", value: "pending" },
                  { label: "Approved", value: "approved" },
                  { label: "Rejected", value: "rejected" },
                  { label: "Cancelled", value: "cancelled" },
                ]},
                { label: "Payment", value: "payment_status", options: [
                  { label: "Paid", value: "paid" },
                  { label: "Pending", value: "pending" },
                  { label: "Refunded", value: "refunded" },
                ]},
                { label: "Event Type", value: "event_type", options: eventTypes },
              ]}
              filterValues={filterValues}
              onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
              onClearFilters={() => { setSearchValue(""); setFilterValues({}); }}
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="font-medium">{booking.applicant_name}</div>
                      <div className="text-sm text-muted-foreground">{booking.applicant_phone}</div>
                    </TableCell>
                    <TableCell>{booking.event_type}</TableCell>
                    <TableCell>
                      <div>{format(new Date(booking.event_date), "dd/MM/yyyy")}</div>
                      <div className="text-sm text-muted-foreground">
                        {booking.start_time} - {booking.end_time}
                      </div>
                    </TableCell>
                    <TableCell>{booking.expected_guests || "-"}</TableCell>
                    <TableCell>₹{Number(booking.booking_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>{getPaymentBadge(booking.payment_status)}</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {booking.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => updateBookingStatus(booking.id, "approved")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => updateBookingStatus(booking.id, "rejected")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {(booking.status === "pending" || booking.status === "approved") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => setCancelBooking(booking)}
                            title="ரத்து செய் (Cancel)"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {(booking.payment_status === "paid" || booking.payment_status === "completed") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintReceipt(booking)}
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No bookings found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default BookingsTab;
