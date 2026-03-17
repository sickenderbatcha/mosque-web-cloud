import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TamilInput } from "@/components/ui/tamil-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, X, Download, Package, IndianRupee, MapPin, Wrench, Trash2, Edit, History } from "lucide-react";
import TableFilter from "@/components/admin/TableFilter";
import { useAppSettings } from "@/hooks/useAppSettings";

const DEFAULT_CATEGORIES = [
  "Electronics", "Furniture", "Maintenance", "Kitchen Equipment",
  "Sound System", "Carpets", "AC Units", "PA System",
  "Library Books", "Stationery", "Filing Cabinets", "Other"
];

const STATUSES = [
  { value: "active", label: "Active / செயலில்", color: "bg-green-100 text-green-800" },
  { value: "under_repair", label: "Under Repair / பழுதுபார்ப்பில்", color: "bg-yellow-100 text-yellow-800" },
  { value: "disposed", label: "Disposed / அகற்றப்பட்டது", color: "bg-red-100 text-red-800" },
];

const MAINTENANCE_TYPES = ["Repair", "Cleaning", "Replacement", "Inspection", "Other"];

const AssetManagementTab = () => {
  const [locations, setLocations] = useState<AssetLocation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({
    name: "", category: "Electronics", serial_number: "", location_id: "",
    purchase_date: "", value: "", status: "active", warranty_expiry_date: "", notes: ""
  });

  // Maintenance dialog
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_type: "Repair", description: "", cost: "", performed_by: "", maintenance_date: new Date().toISOString().split("T")[0]
  });
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    const { data } = await supabase.from("asset_locations").select("*").order("name");
    if (data) setLocations(data as AssetLocation[]);
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("assets").select("*, asset_locations(id, name, name_tamil)").order("created_at", { ascending: false });
    if (filterLocation !== "all") query = query.eq("location_id", filterLocation);
    if (filterCategory !== "all") query = query.eq("category", filterCategory);
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    const { data, error } = await query;
    if (error) { toast.error("Failed to fetch assets"); }
    else setAssets((data || []) as Asset[]);
    setLoading(false);
  }, [filterLocation, filterCategory, filterStatus]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);
  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const filteredAssets = assets.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalAssets = assets.length;
  const totalValue = assets.reduce((sum, a) => sum + (a.value || 0), 0);
  const locationBreakdown = locations.map(loc => ({
    ...loc,
    count: assets.filter(a => a.location_id === loc.id).length,
    value: assets.filter(a => a.location_id === loc.id).reduce((s, a) => s + (a.value || 0), 0),
  }));

  const resetForm = () => {
    setForm({ name: "", category: "Electronics", serial_number: "", location_id: locations[0]?.id || "", purchase_date: "", value: "", status: "active", warranty_expiry_date: "", notes: "" });
    setEditingAsset(null);
  };

  const openAddSheet = () => { resetForm(); setForm(f => ({ ...f, location_id: locations[0]?.id || "" })); setSheetOpen(true); };

  const openEditSheet = (asset: Asset) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name, category: asset.category, serial_number: asset.serial_number || "",
      location_id: asset.location_id, purchase_date: asset.purchase_date || "",
      value: String(asset.value || ""), status: asset.status,
      warranty_expiry_date: asset.warranty_expiry_date || "", notes: asset.notes || ""
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.location_id) { toast.error("Name and Location are required"); return; }
    const payload = {
      name: form.name.trim(), category: form.category, serial_number: form.serial_number.trim() || null,
      location_id: form.location_id, purchase_date: form.purchase_date || null,
      value: parseFloat(form.value) || 0, status: form.status,
      warranty_expiry_date: form.warranty_expiry_date || null, notes: form.notes.trim() || null,
    };

    if (editingAsset) {
      const { error } = await supabase.from("assets").update(payload).eq("id", editingAsset.id);
      if (error) toast.error("Update failed"); else { toast.success("Asset updated / சொத்து புதுப்பிக்கப்பட்டது"); setSheetOpen(false); fetchAssets(); }
    } else {
      const { error } = await supabase.from("assets").insert(payload);
      if (error) toast.error("Failed to add asset"); else { toast.success("Asset added / சொத்து சேர்க்கப்பட்டது"); setSheetOpen(false); fetchAssets(); }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) toast.error("Delete failed"); else { toast.success("Asset deleted / சொத்து நீக்கப்பட்டது"); setDeletingId(null); fetchAssets(); }
  };

  // Maintenance
  const openMaintenanceDialog = async (asset: Asset) => {
    setSelectedAsset(asset);
    setShowAddMaintenance(false);
    setMaintenanceForm({ maintenance_type: "Repair", description: "", cost: "", performed_by: "", maintenance_date: new Date().toISOString().split("T")[0] });
    setMaintenanceDialogOpen(true);
    const { data } = await supabase.from("asset_maintenance_logs").select("*").eq("asset_id", asset.id).order("maintenance_date", { ascending: false });
    setMaintenanceLogs((data || []) as MaintenanceLog[]);
  };

  const handleAddMaintenance = async () => {
    if (!selectedAsset || !maintenanceForm.maintenance_type) return;
    const { error } = await supabase.from("asset_maintenance_logs").insert({
      asset_id: selectedAsset.id, maintenance_type: maintenanceForm.maintenance_type,
      description: maintenanceForm.description || null, cost: parseFloat(maintenanceForm.cost) || 0,
      performed_by: maintenanceForm.performed_by || null, maintenance_date: maintenanceForm.maintenance_date,
    });
    if (error) toast.error("Failed to add log"); else {
      toast.success("Maintenance log added / பராமரிப்பு பதிவு சேர்க்கப்பட்டது");
      setShowAddMaintenance(false);
      const { data } = await supabase.from("asset_maintenance_logs").select("*").eq("asset_id", selectedAsset.id).order("maintenance_date", { ascending: false });
      setMaintenanceLogs((data || []) as MaintenanceLog[]);
    }
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ["Name", "Category", "Serial Number", "Location", "Purchase Date", "Value (₹)", "Status", "Warranty Expiry"];
    const rows = filteredAssets.map(a => [
      a.name, a.category, a.serial_number || "", a.asset_locations?.name || "", a.purchase_date || "",
      String(a.value || 0), a.status, a.warranty_expiry_date || ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `assets_report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click(); URL.revokeObjectURL(url);
    toast.success("Report exported / அறிக்கை ஏற்றுமதி செய்யப்பட்டது");
  };

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find(st => st.value === status);
    return <Badge className={s?.color || ""}>{s?.label || status}</Badge>;
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB") : "—";
  const formatCurrency = (v: number) => `₹${v.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assets / மொத்த சொத்துகள்</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalAssets}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Value / மொத்த மதிப்பு</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalValue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Locations / இடங்கள்</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{locations.length}</div></CardContent>
        </Card>
      </div>

      {/* Location Breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Location Breakdown / இட வாரியாக</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {locationBreakdown.map(loc => (
              <div key={loc.id} className="p-3 rounded-lg border bg-muted/30">
                <p className="font-medium text-sm">{loc.name}</p>
                {loc.name_tamil && <p className="text-xs text-muted-foreground">{loc.name_tamil}</p>}
                <div className="mt-2 flex justify-between text-sm">
                  <span>{loc.count} items</span>
                  <span className="font-semibold">{formatCurrency(loc.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || filterLocation !== "all" || filterCategory !== "all" || filterStatus !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterLocation("all"); setFilterCategory("all"); setFilterStatus("all"); }}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
          <Button onClick={openAddSheet}><Plus className="h-4 w-4 mr-2" /> Quick Add</Button>
        </div>
      </div>

      {/* Assets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / பெயர்</TableHead>
                <TableHead>Category / வகை</TableHead>
                <TableHead>Location / இடம்</TableHead>
                <TableHead>Serial No</TableHead>
                <TableHead>Value / மதிப்பு</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Status / நிலை</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filteredAssets.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No assets found / சொத்துகள் எதுவும் இல்லை</TableCell></TableRow>
              ) : (
                filteredAssets.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.category}</TableCell>
                    <TableCell>{asset.asset_locations?.name || "—"}</TableCell>
                    <TableCell className="text-xs">{asset.serial_number || "—"}</TableCell>
                    <TableCell>{formatCurrency(asset.value || 0)}</TableCell>
                    <TableCell>{formatDate(asset.purchase_date)}</TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell>{formatDate(asset.warranty_expiry_date)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openMaintenanceDialog(asset)} title="Maintenance Log"><History className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEditSheet(asset)} title="Edit"><Edit className="h-4 w-4" /></Button>
                        {deletingId === asset.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(asset.id)}>Confirm</Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" onClick={() => setDeletingId(asset.id)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-full sm:w-full">
          <SheetHeader>
            <SheetTitle>{editingAsset ? "Edit Asset / சொத்தை திருத்து" : "Add New Asset / புதிய சொத்து சேர்"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div><Label>Name / பெயர் *</Label><TamilInput value={form.name} onChange={value => setForm(f => ({ ...f, name: value }))} placeholder="Type in English, auto-converts to Tamil" /></div>
            <div><Label>Category / வகை *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Location / இடம் *</Label>
              <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name} {l.name_tamil ? `(${l.name_tamil})` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Serial Number / வரிசை எண்</Label><Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
            <div><Label>Purchase Date / வாங்கிய தேதி</Label><Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} /></div>
            <div><Label>Value (₹) / மதிப்பு</Label><Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div><Label>Status / நிலை</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Warranty Expiry / உத்தரவாத காலாவதி</Label><Input type="date" value={form.warranty_expiry_date} onChange={e => setForm(f => ({ ...f, warranty_expiry_date: e.target.value }))} /></div>
            <div><Label>Notes / குறிப்புகள்</Label><TamilInput value={form.notes || ""} onChange={value => setForm(f => ({ ...f, notes: value }))} placeholder="Type in English, auto-converts to Tamil" /></div>
            <Button className="w-full" onClick={handleSave}>{editingAsset ? "Update Asset / புதுப்பி" : "Add Asset / சேர்"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Maintenance Log Dialog */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Maintenance Log / பராமரிப்பு பதிவு — {selectedAsset?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button size="sm" onClick={() => setShowAddMaintenance(!showAddMaintenance)}>
              <Plus className="h-4 w-4 mr-1" /> {showAddMaintenance ? "Cancel" : "Add Entry / பதிவு சேர்"}
            </Button>

            {showAddMaintenance && (
              <Card className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type / வகை</Label>
                    <Select value={maintenanceForm.maintenance_type} onValueChange={v => setMaintenanceForm(f => ({ ...f, maintenance_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{MAINTENANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date / தேதி</Label><Input type="date" value={maintenanceForm.maintenance_date} onChange={e => setMaintenanceForm(f => ({ ...f, maintenance_date: e.target.value }))} /></div>
                  <div><Label>Cost (₹)</Label><Input type="number" value={maintenanceForm.cost} onChange={e => setMaintenanceForm(f => ({ ...f, cost: e.target.value }))} /></div>
                  <div><Label>Performed By / செய்தவர்</Label><TamilInput value={maintenanceForm.performed_by || ""} onChange={value => setMaintenanceForm(f => ({ ...f, performed_by: value }))} placeholder="Type in English, auto-converts to Tamil" /></div>
                </div>
                <div><Label>Description / விவரம்</Label><Textarea value={maintenanceForm.description} onChange={e => setMaintenanceForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
                <Button size="sm" onClick={handleAddMaintenance}>Save / சேமி</Button>
              </Card>
            )}

            {maintenanceLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No maintenance records / பராமரிப்பு பதிவுகள் இல்லை</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.maintenance_date)}</TableCell>
                      <TableCell><Badge variant="outline">{log.maintenance_type}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.description || "—"}</TableCell>
                      <TableCell>{formatCurrency(log.cost || 0)}</TableCell>
                      <TableCell>{log.performed_by || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetManagementTab;
