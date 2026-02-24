import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { DollarSign, Printer, CreditCard } from "lucide-react";
import DonationReceipt from "@/components/DonationReceipt";
import SubscriptionReceipt from "@/components/SubscriptionReceipt";
import TableFilter from "@/components/admin/TableFilter";

interface Donation {
  id: string;
  donor_name: string;
  donor_email: string | null;
  donor_phone: string | null;
  amount: number;
  purpose: string | null;
  payment_method: string | null;
  receipt_number: string | null;
  is_anonymous: boolean | null;
  created_at: string;
}

interface Subscription {
  id: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  member_address: string | null;
  subscription_type: string;
  amount: number;
  total_amount: number;
  from_month: number | null;
  from_year: number | null;
  to_month: number | null;
  to_year: number | null;
  number_of_months: number | null;
  subscription_year: number | null;
  payment_status: string | null;
  payment_method: string | null;
  razorpay_payment_id: string | null;
  transaction_id: string | null;
  created_at: string;
}

const DonationsTab = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDonations, setTotalDonations] = useState(0);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  
  // Filter states
  const [donationSearch, setDonationSearch] = useState("");
  const [donationFilters, setDonationFilters] = useState<Record<string, string>>({});
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [subscriptionFilters, setSubscriptionFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const pageSize = 1000;
    
    // Fetch all donations with pagination
    let allDonations: Donation[] = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        console.error("Error fetching donations:", error);
        break;
      }
      
      if (data && data.length > 0) {
        allDonations = [...allDonations, ...data];
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    setDonations(allDonations);
    setTotalDonations(allDonations.reduce((sum, d) => sum + Number(d.amount), 0));
    
    // Fetch all subscriptions with pagination
    let allSubscriptions: Subscription[] = [];
    page = 0;
    hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("payment_status", "completed")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        console.error("Error fetching subscriptions:", error);
        break;
      }
      
      if (data && data.length > 0) {
        allSubscriptions = [...allSubscriptions, ...data];
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    setSubscriptions(allSubscriptions);
    setTotalSubscriptions(allSubscriptions.reduce((sum, s) => sum + Number(s.total_amount), 0));
    
    setLoading(false);
  };

  const handlePrintDonationReceipt = (donation: Donation) => {
    setSelectedDonation(donation);
  };

  const handlePrintSubscriptionReceipt = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
  };

  // Filter donations
  const filteredDonations = useMemo(() => {
    return donations.filter((donation) => {
      const searchLower = donationSearch.toLowerCase();
      const matchesSearch = !donationSearch || 
        donation.donor_name.toLowerCase().includes(searchLower) ||
        donation.donor_phone?.toLowerCase().includes(searchLower) ||
        donation.donor_email?.toLowerCase().includes(searchLower) ||
        donation.receipt_number?.toLowerCase().includes(searchLower) ||
        donation.purpose?.toLowerCase().includes(searchLower);

      const matchesPaymentMethod = !donationFilters.payment_method || donationFilters.payment_method === "all" ||
        donation.payment_method === donationFilters.payment_method;

      return matchesSearch && matchesPaymentMethod;
    });
  }, [donations, donationSearch, donationFilters]);

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => {
      const searchLower = subscriptionSearch.toLowerCase();
      const matchesSearch = !subscriptionSearch ||
        subscription.member_name.toLowerCase().includes(searchLower) ||
        subscription.member_phone?.toLowerCase().includes(searchLower) ||
        subscription.member_id?.toLowerCase().includes(searchLower);

      const matchesType = !subscriptionFilters.subscription_type || subscriptionFilters.subscription_type === "all" ||
        subscription.subscription_type === subscriptionFilters.subscription_type;

      const matchesPaymentMethod = !subscriptionFilters.payment_method || subscriptionFilters.payment_method === "all" ||
        subscription.payment_method === subscriptionFilters.payment_method;

      return matchesSearch && matchesType && matchesPaymentMethod;
    });
  }, [subscriptions, subscriptionSearch, subscriptionFilters]);

  // Get unique payment methods from donations
  const donationPaymentMethods = useMemo(() => {
    const methods = [...new Set(donations.map(d => d.payment_method).filter(Boolean))];
    return methods.map(m => ({ label: m!, value: m! }));
  }, [donations]);

  // Get unique payment methods and types from subscriptions
  const subscriptionPaymentMethods = useMemo(() => {
    const methods = [...new Set(subscriptions.map(s => s.payment_method).filter(Boolean))];
    return methods.map(m => ({ label: m!, value: m! }));
  }, [subscriptions]);

  const subscriptionTypes = useMemo(() => {
    const types = [...new Set(subscriptions.map(s => s.subscription_type))];
    return types.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }));
  }, [subscriptions]);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <>
      {selectedDonation && (
        <DonationReceipt
          donation={{
            donorName: selectedDonation.donor_name,
            donorPhone: selectedDonation.donor_phone || "",
            donorEmail: selectedDonation.donor_email || undefined,
            amount: Number(selectedDonation.amount),
            purpose: selectedDonation.purpose || "General Donation",
            receiptNumber: selectedDonation.receipt_number || selectedDonation.id.slice(0, 8).toUpperCase(),
            paymentMethod: selectedDonation.payment_method || "Online",
            isAnonymous: selectedDonation.is_anonymous || false,
            createdAt: selectedDonation.created_at,
          }}
          onClose={() => setSelectedDonation(null)}
        />
      )}

      {selectedSubscription && (
        <SubscriptionReceipt
          subscription={selectedSubscription}
          onClose={() => setSelectedSubscription(null)}
        />
      )}

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalDonations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{donations.length} donors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalSubscriptions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{subscriptions.length} payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grand Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">₹{(totalDonations + totalSubscriptions).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="donations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="donations">Donations ({donations.length})</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions ({subscriptions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="donations">
            <Card>
              <CardHeader>
                <CardTitle>Recent Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <TableFilter
                  searchValue={donationSearch}
                  onSearchChange={setDonationSearch}
                  searchPlaceholder="Search by name, phone, email, receipt..."
                  filters={[
                    { label: "Payment Method", value: "payment_method", options: donationPaymentMethods },
                  ]}
                  filterValues={donationFilters}
                  onFilterChange={(key, value) => setDonationFilters(prev => ({ ...prev, [key]: value }))}
                  onClearFilters={() => { setDonationSearch(""); setDonationFilters({}); }}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Donor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDonations.map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell className="font-mono text-sm">{donation.receipt_number || "-"}</TableCell>
                        <TableCell>
                          {donation.is_anonymous ? (
                            <span className="text-muted-foreground italic">Anonymous</span>
                          ) : (
                            <div>
                              <div className="font-medium">{donation.donor_name}</div>
                              <div className="text-sm text-muted-foreground">{donation.donor_phone}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">₹{Number(donation.amount).toLocaleString()}</TableCell>
                        <TableCell>{donation.purpose || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{donation.payment_method || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(donation.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintDonationReceipt(donation)}
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredDonations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No donations found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <TableFilter
                  searchValue={subscriptionSearch}
                  onSearchChange={setSubscriptionSearch}
                  searchPlaceholder="Search by name, phone, member ID..."
                  filters={[
                    { label: "Type", value: "subscription_type", options: subscriptionTypes },
                    { label: "Payment Method", value: "payment_method", options: subscriptionPaymentMethods },
                  ]}
                  filterValues={subscriptionFilters}
                  onFilterChange={(key, value) => setSubscriptionFilters(prev => ({ ...prev, [key]: value }))}
                  onClearFilters={() => { setSubscriptionSearch(""); setSubscriptionFilters({}); }}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member ID</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((subscription) => {
                      const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      let period = "";
                      if (subscription.subscription_type === "yearly") {
                        period = `Year ${subscription.subscription_year}`;
                      } else if (subscription.from_month && subscription.to_month) {
                        period = `${MONTHS[subscription.from_month - 1]} ${subscription.from_year} - ${MONTHS[subscription.to_month - 1]} ${subscription.to_year}`;
                      }

                      return (
                        <TableRow key={subscription.id}>
                          <TableCell className="font-mono text-sm">{subscription.member_id}</TableCell>
                          <TableCell>
                            <div className="font-medium">{subscription.member_name}</div>
                            <div className="text-sm text-muted-foreground">{subscription.member_phone}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">{subscription.subscription_type}</Badge>
                          </TableCell>
                          <TableCell>{period}</TableCell>
                          <TableCell className="font-semibold">₹{Number(subscription.total_amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{subscription.payment_method || "Online"}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(subscription.created_at), "dd MMM yyyy")}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintSubscriptionReceipt(subscription)}
                              title="Print Receipt"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredSubscriptions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No subscriptions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default DonationsTab;