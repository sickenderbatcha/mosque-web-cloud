
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { IsoDatePicker } from "@/components/forms/IsoDatePicker";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Home, IndianRupee, History } from "lucide-react";
import TableFilter from "@/components/admin/TableFilter";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import RentCollectionDialog from "@/components/admin/RentCollectionDialog";
import RentalPaymentHistoryDialog from "@/components/admin/RentalPaymentHistoryDialog";

interface RentalAgreement {
  id: string;
  tenant_name: string;
  father_name: string;
  address: string;
  shop_premises: string | null;
  shop_number: string | null;
  shop_address: string | null;
  category: string;
  rent_type: string;
  rent_amount: number;
  advance_amount: number | null;
  agreement_start_date: string;
  agreement_end_date: string | null;
  rent_increase_period: string | null;
  increase_percentage: number | null;
  agreement_status: string;
  status_change_date: string | null;
  rent_calculate_from: string | null;
  created_at: string;
}

const emptyForm = {
  tenant_name: "",
  father_name: "",
  address: "",
  shop_premises: "",
  shop_number: "",
  shop_address: "",
  category: "shop",
  rent_type: "monthly",
  rent_amount: "" as any,
  advance_amount: "" as any,
  agreement_start_date: "",
  agreement_end_date: "",
  rent_increase_period: "",
  increase_percentage: "" as any,
  agreement_status: "active",
  status_change_date: "",
  rent_calculate_from: "",
};

const RentalAgreementsTab = () => {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState<RentalAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [collectRentAgreement, setCollectRentAgreement] = useState<any>(null);
  const [historyAgreement, setHistoryAgreement] = useState<any>(null);
  const [premisesList, setPremisesList] = useState<{ name: string; address: string }[]>([]);

  const fetchPremises = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "rental_premises")
        .maybeSingle();
      if (data?.value) {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) {
          const migrated = parsed.map((p: any) =>
            typeof p === "string" ? { name: p, address: "" } : p
          );
          setPremisesList(migrated);
        }
      }
    } catch (err) {
      console.error("Failed to fetch premises:", err);
    }
  }, []);

  useEffect(() => {
    fetchAgreements();
    fetchPremises();
  }, []);

  const fetchAgreements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rental_agreements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load rental agreements");
      console.error(error);
    } else {
      setAgreements((data as any) || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.tenant_name || !form.father_name || !form.address || !form.agreement_start_date) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    const payload: any = {
      tenant_name: form.tenant_name.trim(),
      father_name: form.father_name.trim(),
      address: form.address.trim(),
      shop_premises: form.shop_premises?.trim() || null,
      shop_number: form.shop_number?.trim() || null,
      shop_address: form.shop_address?.trim() || null,
      category: form.category,
      rent_type: form.rent_type,
      rent_amount: Number(form.rent_amount) || 0,
      advance_amount: Number(form.advance_amount) || 0,
      agreement_start_date: form.agreement_start_date,
      agreement_end_date: form.agreement_end_date || null,
      rent_increase_period: form.rent_increase_period?.trim() || null,
      increase_percentage: Number(form.increase_percentage) || 0,
      agreement_status: form.agreement_status,
      status_change_date: form.status_change_date || null,
      rent_calculate_from: form.rent_calculate_from?.trim() || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("rental_agreements").update(payload).eq("id", editingId) as any);
    } else {
      payload.created_by = user?.id || null;
      ({ error } = await supabase.from("rental_agreements").insert(payload) as any);
    }

    if (error) {
      toast.error("Failed to save agreement");
      console.error(error);
    } else {
      toast.success(editingId ? "Agreement updated" : "Agreement created");
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchAgreements();
    }
    setSaving(false);
  };

  const handleEdit = (a: RentalAgreement) => {
    setEditingId(a.id);
    setForm({
      tenant_name: a.tenant_name,
      father_name: a.father_name,
      address: a.address,
      shop_premises: a.shop_premises || "",
      shop_number: a.shop_number || "",
      shop_address: a.shop_address || "",
      category: a.category,
      rent_type: a.rent_type,
      rent_amount: a.rent_amount,
      advance_amount: a.advance_amount || 0,
      agreement_start_date: a.agreement_start_date,
      agreement_end_date: a.agreement_end_date || "",
      rent_increase_period: a.rent_increase_period || "",
      increase_percentage: a.increase_percentage || 0,
      agreement_status: a.agreement_status,
      status_change_date: a.status_change_date || "",
      rent_calculate_from: a.rent_calculate_from || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agreement?")) return;
    const { error } = await supabase.from("rental_agreements").delete().eq("id", id) as any;
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Agreement deleted");
      fetchAgreements();
    }
  };

  const filtered = agreements.filter((a) => {
    const search = searchValue.toLowerCase();
    const matchesSearch =
      !search ||
      a.tenant_name.toLowerCase().includes(search) ||
      a.father_name.toLowerCase().includes(search) ||
      (a.shop_number || "").toLowerCase().includes(search);

    const matchesCategory =
      !filterValues.category || filterValues.category === "all" || a.category === filterValues.category;
    const matchesStatus =
      !filterValues.status || filterValues.status === "all" || a.agreement_status === filterValues.status;
    const matchesRentType =
      !filterValues.rent_type || filterValues.rent_type === "all" || a.rent_type === filterValues.rent_type;

    return matchesSearch && matchesCategory && matchesStatus && matchesRentType;
  });

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      expired: "destructive",
      terminated: "destructive",
      renewed: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          வாடகை ஒப்பந்தம் மேலாண்மை (Rental Agreement)
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { setEditingId(null); setForm(emptyForm); }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Agreement</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "New"} Rental Agreement</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>வாடகைதாரர் பெயர் (Tenant Name) *</Label>
                <Input value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>தந்தை பெயர் (Father Name) *</Label>
                <Input value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>முகவரி (Address) *</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>வளாகம் (Premises)</Label>
                <Select value={form.shop_premises} onValueChange={(v) => {
                  const selected = premisesList.find((p) => p.name === v);
                  setForm({ ...form, shop_premises: v, shop_address: selected?.address || form.shop_address });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select premises" /></SelectTrigger>
                  <SelectContent>
                    {premisesList.map((p) => (
                      <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>கடை எண் (Shop Number)</Label>
                <Input value={form.shop_number} onChange={(e) => setForm({ ...form, shop_number: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>கடை முகவரி (Shop Address)</Label>
                <Input value={form.shop_address} onChange={(e) => setForm({ ...form, shop_address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>வகை (Category)</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shop">கடை</SelectItem>
                    <SelectItem value="house">வீடு</SelectItem>
                    <SelectItem value="tharai">தரை</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>வாடகை முறை (Rent Type)</Label>
                <Select value={form.rent_type} onValueChange={(v) => setForm({ ...form, rent_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">மாதம்</SelectItem>
                    <SelectItem value="lease">லீஸ்</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>வாடகை தொகை (Rent Amount)</Label>
                <Input type="number" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>முன்பணம் (Advance)</Label>
                <Input type="number" value={form.advance_amount} onChange={(e) => setForm({ ...form, advance_amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>ஒப்பந்தம் ஆரம்ப தேதி (Start Date) *</Label>
                <IsoDatePicker value={form.agreement_start_date} onChange={(v) => setForm({ ...form, agreement_start_date: v })} />
              </div>
              <div className="space-y-2">
                <Label>ஒப்பந்தம் முடிவு தேதி (End Date)</Label>
                <IsoDatePicker value={form.agreement_end_date} onChange={(v) => setForm({ ...form, agreement_end_date: v })} />
              </div>
              <div className="space-y-2">
                <Label>வாடகை உயர்வு காலம் (Increase Period)</Label>
                <Input value={form.rent_increase_period} onChange={(e) => setForm({ ...form, rent_increase_period: e.target.value })} placeholder="e.g. 1 year" />
              </div>
              <div className="space-y-2">
                <Label>உயர்வு சதவீதம் (Increase %)</Label>
                <Input type="number" value={form.increase_percentage} onChange={(e) => setForm({ ...form, increase_percentage: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>ஒப்பந்த நிலை (Status)</Label>
                <Select value={form.agreement_status} onValueChange={(v) => setForm({ ...form, agreement_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                    <SelectItem value="renewed">Renewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>நிலை மாற்றிய தேதி (Status Change Date)</Label>
                <IsoDatePicker value={form.status_change_date} onChange={(v) => setForm({ ...form, status_change_date: v })} />
              </div>
              <div className="space-y-2">
                <Label>வாடகை கணக்கிட (Rent Calculate From)</Label>
                <Input value={form.rent_calculate_from} onChange={(e) => setForm({ ...form, rent_calculate_from: e.target.value })} placeholder="e.g. 012026" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : editingId ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <TableFilter
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search tenant name, father name, shop number..."
          filters={[
            { label: "Category", value: "category", options: [{ label: "கடை", value: "shop" }, { label: "வீடு", value: "house" }, { label: "தரை", value: "tharai" }] },
            { label: "Status", value: "status", options: [{ label: "Active", value: "active" }, { label: "Expired", value: "expired" }, { label: "Terminated", value: "terminated" }, { label: "Renewed", value: "renewed" }] },
            { label: "Rent Type", value: "rent_type", options: [{ label: "மாதம்", value: "monthly" }, { label: "லீஸ்", value: "lease" }] },
          ]}
          filterValues={filterValues}
          onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
          onClearFilters={() => { setSearchValue(""); setFilterValues({}); }}
        />

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No rental agreements found</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>வாடகை தாரர்</TableHead>
                  <TableHead>தந்தை</TableHead>
                  <TableHead>எண்</TableHead>
                  <TableHead>வகை</TableHead>
                  <TableHead>வாடகை முறை</TableHead>
                  <TableHead>தொகை</TableHead>
                  <TableHead>ஆரம்பம்</TableHead>
                  <TableHead>முடிவு</TableHead>
                  <TableHead>நிலை</TableHead>
                  <TableHead>செயல்</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.tenant_name}</TableCell>
                    <TableCell>{a.father_name}</TableCell>
                    <TableCell>{a.shop_number || "-"}</TableCell>
                    <TableCell className="capitalize">{a.category}</TableCell>
                    <TableCell className="capitalize">{a.rent_type}</TableCell>
                    <TableCell>₹{a.rent_amount.toLocaleString()}</TableCell>
                    <TableCell>{a.agreement_start_date}</TableCell>
                    <TableCell>{a.agreement_end_date || "-"}</TableCell>
                    <TableCell>{statusBadge(a.agreement_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" title="வாடகை பெறு" onClick={() => setCollectRentAgreement(a)}><IndianRupee className="h-4 w-4 text-primary" /></Button>
                        <Button size="sm" variant="ghost" title="வாடகை வரலாறு / மறு அச்சிடு" onClick={() => setHistoryAgreement(a)}><History className="h-4 w-4 text-primary" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <RentCollectionDialog
        agreement={collectRentAgreement}
        open={!!collectRentAgreement}
        onOpenChange={(open) => { if (!open) setCollectRentAgreement(null); }}
      />
      <RentalPaymentHistoryDialog
        agreement={historyAgreement}
        open={!!historyAgreement}
        onOpenChange={(open) => { if (!open) setHistoryAgreement(null); }}
      />
    </Card>
  );
};

export default RentalAgreementsTab;
