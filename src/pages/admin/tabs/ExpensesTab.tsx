import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import TableFilter from "@/components/admin/TableFilter";

interface Expense {
  id: string;
  amount: number;
  category: string;
  vendor_name: string | null;
  description: string | null;
  expense_date: string;
  payment_method: string | null;
  receipt_number: string | null;
  invoice_number: string | null;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  "மின்சாரம் (Electricity)",
  "தண்ணீர் (Water)",
  "பராமரிப்பு (Maintenance)",
  "சம்பளம் (Salary)",
  "நிகழ்வு செலவுகள் (Event Expenses)",
  "அலுவலக பொருட்கள் (Office Supplies)",
  "பயண செலவுகள் (Travel)",
  "தொலைபேசி/இணையம் (Phone/Internet)",
  "வாடகை (Rent)",
  "இதர செலவுகள் (Other Expenses)",
];

const PAYMENT_METHODS = [
  "ரொக்கம் (Cash)",
  "UPI",
  "வங்கி பரிமாற்றம் (Bank Transfer)",
  "காசோலை (Cheque)",
];

const ExpensesTab = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    vendor_name: "",
    description: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "",
    receipt_number: "",
    invoice_number: "",
  });

  // Filter states
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    const pageSize = 1000;
    let allExpenses: Expense[] = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        toast.error("Failed to fetch expense records");
        break;
      }
      
      if (data && data.length > 0) {
        allExpenses = [...allExpenses, ...data];
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    setExpenses(allExpenses);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const expenseData = {
      amount: parseFloat(formData.amount),
      category: formData.category,
      vendor_name: formData.vendor_name || null,
      description: formData.description || null,
      expense_date: formData.expense_date,
      payment_method: formData.payment_method || null,
      receipt_number: formData.receipt_number || null,
      invoice_number: formData.invoice_number || null,
    };

    if (editingExpense) {
      const { error } = await supabase
        .from("expenses")
        .update(expenseData)
        .eq("id", editingExpense.id);

      if (error) {
        toast.error("Failed to update expense");
      } else {
        toast.success("Expense updated successfully");
        fetchExpenses();
      }
    } else {
      const { error } = await supabase.from("expenses").insert(expenseData);

      if (error) {
        toast.error("Failed to add expense");
      } else {
        toast.success("Expense added successfully");
        fetchExpenses();
      }
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      category: expense.category,
      vendor_name: expense.vendor_name || "",
      description: expense.description || "",
      expense_date: expense.expense_date,
      payment_method: expense.payment_method || "",
      receipt_number: expense.receipt_number || "",
      invoice_number: expense.invoice_number || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete expense");
    } else {
      toast.success("Expense deleted successfully");
      fetchExpenses();
    }
  };

  const resetForm = () => {
    setFormData({
      amount: "",
      category: "",
      vendor_name: "",
      description: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "",
      receipt_number: "",
      invoice_number: "",
    });
    setEditingExpense(null);
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const searchLower = searchValue.toLowerCase();
      const matchesSearch = !searchValue ||
        expense.vendor_name?.toLowerCase().includes(searchLower) ||
        expense.category.toLowerCase().includes(searchLower) ||
        expense.receipt_number?.toLowerCase().includes(searchLower) ||
        expense.invoice_number?.toLowerCase().includes(searchLower) ||
        expense.description?.toLowerCase().includes(searchLower);

      const matchesCategory = !filterValues.category || filterValues.category === "all" ||
        expense.category === filterValues.category;

      const matchesPaymentMethod = !filterValues.payment_method || filterValues.payment_method === "all" ||
        expense.payment_method === filterValues.payment_method;

      return matchesSearch && matchesCategory && matchesPaymentMethod;
    });
  }, [expenses, searchValue, filterValues]);

  // Use predefined categories and payment methods so all options are always visible
  const categories = useMemo(() => {
    return EXPENSE_CATEGORIES.map(c => ({ label: c, value: c }));
  }, []);

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
        <h2 className="text-2xl font-bold">செலவு மேலாண்மை (Expenses Management)</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              புதிய செலவு (Add Expense)
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "செலவை திருத்து (Edit Expense)" : "புதிய செலவு (New Expense)"}
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
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="வகையை தேர்வு செய்க" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>விற்பனையாளர் (Vendor Name)</Label>
                <Input
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder="விற்பனையாளர் / நிறுவனம் பெயர்"
                />
              </div>
              <div>
                <Label>தேதி (Date) *</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ரசீது எண் (Receipt No.)</Label>
                  <Input
                    value={formData.receipt_number}
                    onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>விலைப்பட்டியல் எண் (Invoice No.)</Label>
                  <Input
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  />
                </div>
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
                {editingExpense ? "புதுப்பி (Update)" : "சேர் (Add)"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            மொத்த செலவுகள் (Total Expenses)
          </CardTitle>
          <span className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString("en-IN")}</span>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-4">
          <TableFilter
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Search by vendor, category, receipt..."
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
                <TableHead>விற்பனையாளர் (Vendor)</TableHead>
                <TableHead>கட்டண முறை (Payment)</TableHead>
                <TableHead>ரசீது/விலைப்பட்டியல்</TableHead>
                <TableHead className="text-right">தொகை (Amount)</TableHead>
                <TableHead>செயல்கள் (Actions)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    செலவு பதிவுகள் இல்லை (No expense records found)
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.expense_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{expense.vendor_name || "-"}</TableCell>
                    <TableCell>{expense.payment_method || "-"}</TableCell>
                    <TableCell>
                      {expense.receipt_number || expense.invoice_number 
                        ? `${expense.receipt_number || ""} ${expense.invoice_number ? `/ ${expense.invoice_number}` : ""}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      ₹{Number(expense.amount).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

export default ExpensesTab;
