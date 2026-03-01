import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { IndianRupee, Search, CreditCard, CheckCircle, Clock } from "lucide-react";

interface OnlinePayment {
  id: string;
  service_type: string;
  applicant_name: string;
  amount: number;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  payment_status: string;
  created_at: string;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  booking: "மஹால் முன்பதிவு (Booking)",
  donation: "நன்கொடை (Donation)",
  certificate: "சான்றிதழ் (Certificate)",
  subscription: "சந்தா (Subscription)",
  noc: "NOC சான்றிதழ் (NOC)",
  heir: "வாரிசு சான்றிதழ் (Heir)",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
};

const OnlinePaymentsTab = () => {
  const [filterService, setFilterService] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["online-payments", filterService],
    queryFn: async () => {
      const results: OnlinePayment[] = [];

      // Fetch bookings with online payments
      const { data: bookings } = await supabase
        .from("mahal_bookings")
        .select("id, applicant_name, booking_amount, payment_status, created_at, admin_notes")
        .eq("payment_status", "completed")
        .not("admin_notes", "is", null)
        .ilike("admin_notes", "%Payment ID%")
        .order("created_at", { ascending: false });

      if (bookings && (filterService === "all" || filterService === "booking")) {
        bookings.forEach((b) => {
          const paymentIdMatch = b.admin_notes?.match(/Payment ID: ([^,]+)/);
          const orderIdMatch = b.admin_notes?.match(/Order ID: ([^,\s]+)/);
          results.push({
            id: b.id,
            service_type: "booking",
            applicant_name: b.applicant_name,
            amount: b.booking_amount || 0,
            razorpay_payment_id: paymentIdMatch?.[1] || null,
            razorpay_order_id: orderIdMatch?.[1] || null,
            payment_status: b.payment_status || "completed",
            created_at: b.created_at,
          });
        });
      }

      // Fetch donations with online payments
      if (filterService === "all" || filterService === "donation") {
        const { data: donations } = await supabase
          .from("donations")
          .select("id, donor_name, amount, payment_status, razorpay_payment_id, razorpay_order_id, created_at")
          .not("razorpay_payment_id", "is", null)
          .order("created_at", { ascending: false });

        donations?.forEach((d) => {
          results.push({
            id: d.id,
            service_type: "donation",
            applicant_name: d.donor_name,
            amount: d.amount,
            razorpay_payment_id: d.razorpay_payment_id,
            razorpay_order_id: d.razorpay_order_id,
            payment_status: d.payment_status || "completed",
            created_at: d.created_at,
          });
        });
      }

      // Fetch certificate payments with online payments
      if (filterService === "all" || filterService === "certificate") {
        const { data: certs } = await supabase
          .from("certificate_payments")
          .select("id, applicant_name, amount, payment_status, razorpay_payment_id, razorpay_order_id, created_at, certificate_type")
          .not("razorpay_payment_id", "is", null)
          .order("created_at", { ascending: false });

        certs?.forEach((c) => {
          results.push({
            id: c.id,
            service_type: "certificate",
            applicant_name: c.applicant_name,
            amount: c.amount,
            razorpay_payment_id: c.razorpay_payment_id,
            razorpay_order_id: c.razorpay_order_id,
            payment_status: c.payment_status,
            created_at: c.created_at,
          });
        });
      }

      // Fetch subscription payments with online payments
      if (filterService === "all" || filterService === "subscription") {
        const { data: subs } = await supabase
          .from("subscriptions")
          .select("id, member_name, total_amount, payment_status, razorpay_payment_id, razorpay_order_id, created_at")
          .not("razorpay_payment_id", "is", null)
          .order("created_at", { ascending: false });

        subs?.forEach((s) => {
          results.push({
            id: s.id,
            service_type: "subscription",
            applicant_name: s.member_name,
            amount: s.total_amount,
            razorpay_payment_id: s.razorpay_payment_id,
            razorpay_order_id: s.razorpay_order_id,
            payment_status: s.payment_status,
            created_at: s.created_at,
          });
        });
      }

      // Fetch NOC payments with online payments
      if (filterService === "all" || filterService === "noc") {
        const { data: nocs } = await supabase
          .from("noc_certificates")
          .select("id, applicant_name, payment_status, razorpay_payment_id, razorpay_order_id, created_at")
          .not("razorpay_payment_id", "is", null)
          .order("created_at", { ascending: false });

        nocs?.forEach((n) => {
          results.push({
            id: n.id,
            service_type: "noc",
            applicant_name: n.applicant_name,
            amount: 0, // NOC fee from settings
            razorpay_payment_id: n.razorpay_payment_id,
            razorpay_order_id: n.razorpay_order_id,
            payment_status: n.payment_status || "completed",
            created_at: n.created_at,
          });
        });
      }

      // Fetch Heir certificate payments with online payments
      if (filterService === "all" || filterService === "heir") {
        const { data: heirs } = await supabase
          .from("heir_certificates")
          .select("id, applicant_name, payment_status, razorpay_payment_id, razorpay_order_id, created_at")
          .not("razorpay_payment_id", "is", null)
          .order("created_at", { ascending: false });

        heirs?.forEach((h) => {
          results.push({
            id: h.id,
            service_type: "heir",
            applicant_name: h.applicant_name,
            amount: 0,
            razorpay_payment_id: h.razorpay_payment_id,
            razorpay_order_id: h.razorpay_order_id,
            payment_status: h.payment_status || "completed",
            created_at: h.created_at,
          });
        });
      }

      // Sort all results by date descending
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return results;
    },
  });

  const filteredPayments = payments.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.applicant_name.toLowerCase().includes(q) ||
      p.razorpay_payment_id?.toLowerCase().includes(q) ||
      p.razorpay_order_id?.toLowerCase().includes(q)
    );
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const completedCount = filteredPayments.filter(
    (p) => p.payment_status === "completed" || p.payment_status === "paid"
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">மொத்த ஆன்லைன் பணம் (Total Online)</p>
                <p className="text-2xl font-bold">₹{totalAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">வெற்றிகரமான பரிவர்த்தனைகள் (Successful)</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <IndianRupee className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">மொத்த பரிவர்த்தனைகள் (Total Transactions)</p>
                <p className="text-2xl font-bold">{filteredPayments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            ஆன்லைன் பணம் செலுத்துதல்கள் (Online Payments)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="பெயர் / Payment ID தேடவும்..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="சேவை வகை" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">அனைத்து சேவைகள் (All)</SelectItem>
                <SelectItem value="booking">முன்பதிவு (Booking)</SelectItem>
                <SelectItem value="donation">நன்கொடை (Donation)</SelectItem>
                <SelectItem value="certificate">சான்றிதழ் (Certificate)</SelectItem>
                <SelectItem value="subscription">சந்தா (Subscription)</SelectItem>
                <SelectItem value="noc">NOC</SelectItem>
                <SelectItem value="heir">வாரிசு (Heir)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ஆன்லைன் பணம் செலுத்துதல்கள் இல்லை (No online payments found)
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>தேதி (Date)</TableHead>
                    <TableHead>பெயர் (Name)</TableHead>
                    <TableHead>சேவை (Service)</TableHead>
                    <TableHead className="text-right">தொகை (Amount)</TableHead>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>நிலை (Status)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={`${payment.service_type}-${payment.id}`}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">{payment.applicant_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {SERVICE_TYPE_LABELS[payment.service_type] || payment.service_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {payment.amount > 0 ? `₹${payment.amount.toLocaleString("en-IN")}` : "-"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {payment.razorpay_payment_id || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {payment.razorpay_order_id || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            STATUS_COLORS[payment.payment_status] || "bg-gray-100 text-gray-800"
                          }
                        >
                          {payment.payment_status === "completed" || payment.payment_status === "paid"
                            ? "✅ Success"
                            : payment.payment_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnlinePaymentsTab;
