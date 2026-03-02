import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TamilInput } from "@/components/ui/tamil-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, TrendingUp, Link } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import TableFilter from "@/components/admin/TableFilter";

interface Income {
  id: string;
  amount: number;
  category: string;
  source: string;
  description: string | null;
  income_date: string;
  payment_method: string | null;
  receipt_number: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

const DEFAULT_INCOME_CATEGORIES = [
  "நன்கொடை (Donation)",
  "சந்தா (Subscription)",
  "மஹால் முன்பதிவு (Mahal Booking)",
  "மஹால் வாடகை (Hall Rent)",
  "நிகழ்வு வருமானம் (Event Income)",
  "இதர வருமானம் (Other Income)",
];

const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Cheque",
  "Online",
];

const IncomeTab = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INCOME_CATEGORIES);
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    source: "",
    description: "",
    income_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "",
    receipt_number: "",
  });
  
  // Filter states
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const fetchIncomeCategories = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "income_categories")
        .maybeSingle();
      if (data?.value) {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIncomeCategories(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to fetch income categories:", err);
    }
  }, []);

  useEffect(() => {
    fetchIncomes();
    fetchIncomeCategories();
  }, []);

  const fetchIncomes = async () => {
    setLoading(true);
    const pageSize = 1000;
    let allIncomes: Income[] = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from("income")
        .select("*")
        .order("income_date", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        toast.error("Failed to fetch income records");
        break;
      }
      
      if (data && data.length > 0) {
        allIncomes = [...allIncomes, ...data];
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    setIncomes(allIncomes);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    const incomeData = {
      amount: parseFloat(formData.amount),
      category: formData.category,
      source: formData.source,
      description: formData.description || null,
      income_date: formData.income_date,
      payment_method: formData.payment_method || null,
      receipt_number: formData.receipt_number || null,
    };

    if (editingIncome) {
      const { error } = await supabase
        .from("income")
        .update(incomeData)
        .eq("id", editingIncome.id);

      if (error) {
        toast.error("Failed to update income");
      } else {
        toast.success("Income updated successfully");
        fetchIncomes();
      }
    } else {
      const { error } = await supabase.from("income").insert(incomeData);

      if (error) {
        toast.error("Failed to add income");
      } else {
        toast.success("Income added successfully");
        fetchIncomes();
      }
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setFormData({
      amount: income.amount.toString(),
      category: income.category,
      source: income.source,
      description: income.description || "",
      income_date: income.income_date,
      payment_method: income.payment_method || "",
      receipt_number: income.receipt_number || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, referenceType: string | null) => {
    if (referenceType) {
      toast.error("Cannot delete auto-generated income from " + referenceType);
      return;
    }
    if (!confirm("Are you sure you want to delete this income record?")) return;

    const { error } = await supabase.from("income").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete income");
    } else {
      toast.success("Income deleted successfully");
      fetchIncomes();
    }
  };

  const resetForm = () => {
    setFormData({
      amount: "",
      category: "",
      source: "",
      description: "",
      income_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "",
      receipt_number: "",
    });
    setEditingIncome(null);
  };

  const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

  // Filtered incomes
  const filteredIncomes = useMemo(() => {
    return incomes.filter((income) => {
      const searchLower = searchValue.toLowerCase();
      const matchesSearch = !searchValue ||
        income.source.toLowerCase().includes(searchLower) ||
        income.category.toLowerCase().includes(searchLower) ||
        income.receipt_number?.toLowerCase().includes(searchLower) ||
        income.description?.toLowerCase().includes(searchLower);

      const matchesCategory = !filterValues.category || filterValues.category === "all" ||
        income.category === filterValues.category;

      const matchesPaymentMethod = !filterValues.payment_method || filterValues.payment_method === "all" ||
        income.payment_method === filterValues.payment_method;

      return matchesSearch && matchesCategory && matchesPaymentMethod;
    });
  }, [incomes, searchValue, filterValues]);

  // Get unique categories and payment methods
  const categories = useMemo(() => {
    const cats = [...new Set(incomes.map(i => i.category))];
    return cats.map(c => ({ label: c, value: c }));
  }, [incomes]);

  // Use predefined payment methods so all options are always visible in filter
  const paymentMethods = useMemo(() => {
    return PAYMENT_METHODS.map(m => ({ label: m, value: m }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">வருமான மேலாண்மை (Income Management)</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              புதிய வருமானம் (Add Income)
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingIncome ? "வருமானத்தை திருத்து (Edit Income)" : "புதிய வருமானம் (New Income)"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>தொகை (Amount) *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label>வகை (Category) *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="வகையை தேர்வு செய்க" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {incomeCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ஆதாரம் (Source) *</Label>
                <TamilInput
                  value={formData.source}
                  onChange={(value) => setFormData({ ...formData, source: value })}
                  placeholder="Type in English, auto-converts to Tamil"
                />
              </div>
              <div>
                <Label>தேதி (Date) *</Label>
                <Input
                  type="date"
                  value={formData.income_date}
                  onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>கட்டண முறை (Payment Method)</Label>
                <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="கட்டண முறையை தேர்வு செய்க" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ரசீது எண் (Receipt Number)</Label>
                <Input
                  value={formData.receipt_number}
                  onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                />
              </div>
              <div>
                <Label>விவரம் (Description)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingIncome ? "புதுப்பி (Update)" : "சேர் (Add)"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            மொத்த வருமானம் (Total Income)
          </CardTitle>
          <span className="text-2xl font-bold text-green-600">₹{totalIncome.toLocaleString("en-IN")}</span>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-4">
          <TableFilter
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Search by source, category, receipt..."
            filters={[
              { label: "Category", value: "category", options: categories },
              { label: "Payment Method", value: "payment_method", options: paymentMethods },
            ]}
            filterValues={filterValues}
            onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
            onClearFilters={() => { setSearchValue(""); setFilterValues({}); }}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>தேதி (Date)</TableHead>
                <TableHead>வகை (Category)</TableHead>
                <TableHead>ஆதாரம் (Source)</TableHead>
                <TableHead>கட்டண முறை (Payment)</TableHead>
                <TableHead>ரசீது எண் (Receipt)</TableHead>
                <TableHead className="text-right">தொகை (Amount)</TableHead>
                <TableHead>செயல்கள் (Actions)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncomes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    வருமான பதிவுகள் இல்லை (No income records found)
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>{format(new Date(income.income_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {income.category}
                        {income.reference_type && (
                          <Badge variant="outline" className="text-xs">
                            <Link className="h-3 w-3 mr-1" />
                            {income.reference_type}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{income.source}</TableCell>
                    <TableCell>{income.payment_method || "-"}</TableCell>
                    <TableCell>{income.receipt_number || "-"}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ₹{Number(income.amount).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(income)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(income.id, income.reference_type)}
                          disabled={!!income.reference_type}
                          title={income.reference_type ? "Cannot delete auto-generated income" : "Delete"}
                        >
                          <Trash2 className={`h-4 w-4 ${income.reference_type ? 'text-muted-foreground' : 'text-destructive'}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeTab;
