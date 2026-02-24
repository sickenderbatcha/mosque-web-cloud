import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, CheckCircle, XCircle, Users, AlertTriangle, Mail, Loader2, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Member {
  id: string;
  member_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

interface SubscriptionSlot {
  id: string;
  member_id: string;
  year: number;
  month: number;
  is_paid: boolean;
  payment_date: string | null;
  amount: number;
  payment_method: string | null;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SubscriptionSlotsTab = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [slots, setSlots] = useState<SubscriptionSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeView, setActiveView] = useState<"heatmap" | "delinquency">("heatmap");
  
  // Subscription start settings from app_settings
  const [subscriptionStartMonth, setSubscriptionStartMonth] = useState(1);
  const [subscriptionStartYear, setSubscriptionStartYear] = useState(new Date().getFullYear());
  
  // Search and Pagination for heatmap
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const membersPerPage = 20;
  
  // Payment dialog
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("100");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Unpaid confirmation dialog
  const [unpaidDialog, setUnpaidDialog] = useState(false);
  
  // Bulk payment dialog
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkStartMonth, setBulkStartMonth] = useState(1);
  const [bulkTotalMonths, setBulkTotalMonths] = useState(12);
  const [bulkMember, setBulkMember] = useState<Member | null>(null);
  
  // Delinquency tracker
  const [delinquencyMonth, setDelinquencyMonth] = useState(new Date().getMonth() + 1);
  const [delinquencyYear, setDelinquencyYear] = useState(new Date().getFullYear());

  // Fetch subscription start settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("key, value")
          .in("key", ["subscription_start_month", "subscription_start_year"]);
        
        if (data) {
          const monthSetting = data.find(s => s.key === "subscription_start_month");
          const yearSetting = data.find(s => s.key === "subscription_start_year");
          if (monthSetting) setSubscriptionStartMonth(parseInt(monthSetting.value) || 1);
          if (yearSetting) setSubscriptionStartYear(parseInt(yearSetting.value) || new Date().getFullYear());
        }
      } catch (error) {
        console.error("Failed to fetch subscription settings:", error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all active members with pagination to overcome 1000 row limit
      let allMembers: Member[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: membersData, error: membersError } = await supabase
          .from("gb_members")
          .select("id, member_id, full_name, phone, email, is_active")
          .eq("is_active", true)
          .order("member_id")
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (membersError) throw membersError;
        
        if (membersData && membersData.length > 0) {
          allMembers = [...allMembers, ...membersData];
          hasMore = membersData.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      setMembers(allMembers);

      // Fetch subscription slots for selected year with pagination
      let allSlots: SubscriptionSlot[] = [];
      page = 0;
      hasMore = true;

      while (hasMore) {
        const { data: slotsData, error: slotsError } = await supabase
          .from("subscription_slots")
          .select("*")
          .eq("year", selectedYear)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (slotsError) throw slotsError;
        
        if (slotsData && slotsData.length > 0) {
          allSlots = [...allSlots, ...slotsData];
          hasMore = slotsData.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      setSlots(allSlots);
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a map of member_id -> month -> slot for quick lookup
  const slotMap = useMemo(() => {
    const map = new Map<string, Map<number, SubscriptionSlot>>();
    slots.forEach((slot) => {
      if (!map.has(slot.member_id)) {
        map.set(slot.member_id, new Map());
      }
      map.get(slot.member_id)!.set(slot.month, slot);
    });
    return map;
  }, [slots]);

  const getSlotStatus = (memberId: string, month: number): SubscriptionSlot | null => {
    return slotMap.get(memberId)?.get(month) || null;
  };

  const handleCellClick = (member: Member, month: number) => {
    const existingSlot = getSlotStatus(member.member_id, month);
    setSelectedMember(member);
    setSelectedMonth(month);
    
    if (existingSlot?.is_paid) {
      // Already paid - open unpaid confirmation dialog
      setUnpaidDialog(true);
    } else {
      // Not paid - open payment dialog
      setPaymentDialog(true);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedMember || selectedMonth === null) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("subscription_slots").upsert({
        member_id: selectedMember.member_id,
        year: selectedYear,
        month: selectedMonth,
        is_paid: true,
        payment_date: new Date().toISOString().split('T')[0],
        amount: parseFloat(paymentAmount) || 100,
        payment_method: paymentMethod,
      }, {
        onConflict: 'member_id,year,month'
      });

      if (error) throw error;

      toast.success(`Payment recorded for ${selectedMember.full_name} - ${MONTHS_FULL[selectedMonth - 1]} ${selectedYear}`);
      setPaymentDialog(false);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to record payment: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsUnpaid = async () => {
    if (!selectedMember || selectedMonth === null) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("subscription_slots")
        .update({
          is_paid: false,
          payment_date: null,
          amount: null,
          payment_method: null,
        })
        .eq("member_id", selectedMember.member_id)
        .eq("year", selectedYear)
        .eq("month", selectedMonth);

      if (error) throw error;

      toast.success(`Payment removed for ${selectedMember.full_name} - ${MONTHS_FULL[selectedMonth - 1]} ${selectedYear}`);
      setUnpaidDialog(false);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to mark as unpaid: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkPayment = async () => {
    if (!bulkMember) return;
    
    setIsSubmitting(true);
    try {
      const slotsToInsert = [];
      let currentMonth = bulkStartMonth;
      let currentYear = selectedYear;

      for (let i = 0; i < bulkTotalMonths; i++) {
        slotsToInsert.push({
          member_id: bulkMember.member_id,
          year: currentYear,
          month: currentMonth,
          is_paid: true,
          payment_date: new Date().toISOString().split('T')[0],
          amount: parseFloat(paymentAmount) || 100,
          payment_method: paymentMethod,
        });

        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }

      const { error } = await supabase.from("subscription_slots").upsert(slotsToInsert, {
        onConflict: 'member_id,year,month'
      });

      if (error) throw error;

      toast.success(`Bulk payment recorded for ${bulkMember.full_name} - ${bulkTotalMonths} months`);
      setBulkDialog(false);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to record bulk payment: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get delinquent members (those who haven't paid for the selected month/year)
  const delinquentMembers = useMemo(() => {
    // Don't show delinquency for months before subscription start
    const isBeforeStart = delinquencyYear < subscriptionStartYear || 
      (delinquencyYear === subscriptionStartYear && delinquencyMonth < subscriptionStartMonth);
    if (isBeforeStart) return [];
    
    return members.filter((member) => {
      const slot = getSlotStatus(member.member_id, delinquencyMonth);
      // Check if slot exists for delinquency year
      const yearSlots = slots.filter(s => s.member_id === member.member_id && s.year === delinquencyYear && s.month === delinquencyMonth);
      return yearSlots.length === 0 || !yearSlots[0].is_paid;
    });
  }, [members, slots, delinquencyMonth, delinquencyYear, subscriptionStartMonth, subscriptionStartYear]);

  // Calculate statistics (only count months from start date onwards)
  const stats = useMemo(() => {
    const totalMembers = members.length;
    
    // Calculate applicable months for the selected year
    let applicableMonths = 12;
    if (selectedYear === subscriptionStartYear) {
      applicableMonths = 13 - subscriptionStartMonth; // Months from start month to December
    } else if (selectedYear < subscriptionStartYear) {
      applicableMonths = 0;
    }
    
    // Filter slots to only count those from start date onwards
    const validSlots = slots.filter(s => {
      if (s.year < subscriptionStartYear) return false;
      if (s.year === subscriptionStartYear && s.month < subscriptionStartMonth) return false;
      return true;
    });
    
    const paidSlots = validSlots.filter(s => s.is_paid).length;
    const totalPossibleSlots = totalMembers * applicableMonths;
    const unpaidSlots = totalPossibleSlots - paidSlots;
    const collectionRate = totalPossibleSlots > 0 ? ((paidSlots / totalPossibleSlots) * 100).toFixed(1) : "0";
    const totalCollected = validSlots.filter(s => s.is_paid).reduce((sum, s) => sum + (s.amount || 0), 0);

    return { totalMembers, paidSlots, unpaidSlots, collectionRate, totalCollected };
  }, [members, slots, selectedYear, subscriptionStartMonth, subscriptionStartYear]);

  // Filtered members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase().trim();
    return members.filter((member) =>
      member.member_id.toLowerCase().includes(query) ||
      member.full_name.toLowerCase().includes(query) ||
      (member.phone && member.phone.includes(query))
    );
  }, [members, searchQuery]);

  // Paginated members from filtered list
  const paginatedMembers = useMemo(() => {
    const start = currentPage * membersPerPage;
    return filteredMembers.slice(start, start + membersPerPage);
  }, [filteredMembers, currentPage]);

  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  // Generate years from subscription start year to current year + 5
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = subscriptionStartYear;
    const endYear = currentYear + 5;
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  }, [subscriptionStartYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.totalMembers}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid Slots ({selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{stats.paidSlots}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.collectionRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">₹{stats.totalCollected.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Year Selector */}
      <div className="flex items-center gap-4">
        <Label>Year:</Label>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs for Heatmap and Delinquency */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "heatmap" | "delinquency")}>
        <TabsList>
          <TabsTrigger value="heatmap" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Subscription Heatmap
          </TabsTrigger>
          <TabsTrigger value="delinquency" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Delinquency Tracker
          </TabsTrigger>
        </TabsList>

        {/* Heatmap View */}
        <TabsContent value="heatmap" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Subscription Heatmap - {selectedYear}</CardTitle>
                  <CardDescription>
                    Click on any cell to toggle payment status. Green = Paid, Grey = Unpaid
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tracking from: {MONTHS_FULL[subscriptionStartMonth - 1]} {subscriptionStartYear}
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, name, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Found {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </p>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-[900px]">
                  {/* Header Row */}
                  <div className="grid grid-cols-[200px_repeat(12,1fr)] gap-1 mb-2">
                    <div className="font-semibold text-sm p-2 bg-muted rounded">Member</div>
                    {MONTHS.map((month, idx) => {
                      const monthNum = idx + 1;
                      const isBeforeStart = selectedYear < subscriptionStartYear || 
                        (selectedYear === subscriptionStartYear && monthNum < subscriptionStartMonth);
                      return (
                        <div 
                          key={month} 
                          className={`font-semibold text-sm p-2 text-center rounded ${
                            isBeforeStart ? "bg-muted/30 text-muted-foreground/50" : "bg-muted"
                          }`}
                        >
                          {month}
                        </div>
                      );
                    })}
                  </div>

                  {/* Member Rows */}
                  {paginatedMembers.map((member) => (
                    <div key={member.id} className="grid grid-cols-[200px_repeat(12,1fr)] gap-1 mb-1">
                      <div 
                        className="text-sm p-2 bg-muted/50 rounded truncate cursor-pointer hover:bg-muted transition-colors"
                        title={`${member.full_name} (${member.member_id})`}
                        onClick={() => {
                          setBulkMember(member);
                          setBulkDialog(true);
                        }}
                      >
                        <span className="font-medium">{member.member_id}</span>
                        <span className="text-muted-foreground ml-1 text-xs">- {member.full_name}</span>
                      </div>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                        const isBeforeStart = selectedYear < subscriptionStartYear || 
                          (selectedYear === subscriptionStartYear && month < subscriptionStartMonth);
                        
                        if (isBeforeStart) {
                          return (
                            <div
                              key={month}
                              className="h-10 rounded bg-muted/20 cursor-not-allowed"
                              title="Before subscription start date"
                            />
                          );
                        }
                        
                        const slot = getSlotStatus(member.member_id, month);
                        const isPaid = slot?.is_paid || false;
                        return (
                          <button
                            key={month}
                            onClick={() => handleCellClick(member, month)}
                            className={`h-10 rounded transition-all hover:scale-105 ${
                              isPaid 
                                ? "bg-emerald-500 hover:bg-emerald-600" 
                                : "bg-muted hover:bg-muted-foreground/20"
                            }`}
                            title={isPaid ? `Paid on ${slot?.payment_date}` : `Click to mark as paid`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delinquency Tracker View */}
        <TabsContent value="delinquency" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Delinquency Tracker
                  </CardTitle>
                  <CardDescription>
                    Members who have not paid for the selected month
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={delinquencyMonth.toString()} onValueChange={(v) => setDelinquencyMonth(parseInt(v))}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS_FULL.map((month, idx) => (
                        <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={delinquencyYear.toString()} onValueChange={(v) => setDelinquencyYear(parseInt(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <Badge variant="destructive" className="text-sm">
                  {delinquentMembers.length} Pending Payments
                </Badge>
              </div>

              {delinquentMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                  <p>All members have paid for {MONTHS_FULL[delinquencyMonth - 1]} {delinquencyYear}!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {delinquentMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {member.member_id} | {member.phone || "No phone"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMember(member);
                            setSelectedMonth(delinquencyMonth);
                            setPaymentDialog(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Paid
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Single Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Mark payment for {selectedMember?.full_name} - {selectedMonth && MONTHS_FULL[selectedMonth - 1]} {selectedYear}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handleMarkAsPaid} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Dialog */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Payment</DialogTitle>
            <DialogDescription>
              Record multiple months of payment for {bulkMember?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Start Month</Label>
              <Select value={bulkStartMonth.toString()} onValueChange={(v) => setBulkStartMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_FULL.map((month, idx) => (
                    <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Months</Label>
              <Select value={bulkTotalMonths.toString()} onValueChange={(v) => setBulkTotalMonths(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <SelectItem key={num} value={num.toString()}>{num} month{num > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount per Month (₹)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Summary</p>
              <p className="text-sm text-muted-foreground">
                From: {MONTHS_FULL[bulkStartMonth - 1]} {selectedYear}
              </p>
              <p className="text-sm text-muted-foreground">
                To: {MONTHS_FULL[(bulkStartMonth + bulkTotalMonths - 2) % 12]} {selectedYear + Math.floor((bulkStartMonth + bulkTotalMonths - 2) / 12)}
              </p>
              <p className="text-sm font-medium mt-2">
                Total: ₹{(parseFloat(paymentAmount) || 100) * bulkTotalMonths}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkPayment} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Record Bulk Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Unpaid Confirmation Dialog */}
      <Dialog open={unpaidDialog} onOpenChange={setUnpaidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Unpaid</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark {selectedMember?.full_name}'s payment for {selectedMonth && MONTHS_FULL[selectedMonth - 1]} {selectedYear} as unpaid? This will remove the payment record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnpaidDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleMarkAsUnpaid} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Mark as Unpaid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionSlotsTab;
