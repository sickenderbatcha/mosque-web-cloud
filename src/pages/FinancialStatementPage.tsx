import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Download, Loader2, FileText, List, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// No jsPDF/canvas approach needed - using browser print for perfect Tamil rendering

interface TrialBalanceItem {
  account: string;
  debit: number;
  credit: number;
}

interface TrialBalanceData {
  income: TrialBalanceItem[];
  expenses: TrialBalanceItem[];
}

interface DetailedTransaction {
  date: string;
  description: string;
  category: string;
  type: "income" | "expense";
  amount: number;
  source?: string;
}

type ReportType = "summary" | "detail";

const FinancialStatementPage = () => {
  const { isAdmin } = useUserRole();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("summary");
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData>({
    income: [],
    expenses: [],
  });
  const [detailedTransactions, setDetailedTransactions] = useState<DetailedTransaction[]>([]);

  const fetchSummaryReport = async () => {
    setLoading(true);
    try {
      // Fetch income grouped by category
      const { data: incomeData, error: incomeError } = await supabase
        .from("income")
        .select("category, amount, income_date")
        .gte("income_date", startDate)
        .lte("income_date", endDate);

      if (incomeError) throw incomeError;

      // Fetch expenses grouped by category
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select("category, amount, expense_date")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate);

      if (expenseError) throw expenseError;

      // Group income by category
      const incomeByCategory: Record<string, number> = {};
      incomeData?.forEach((item) => {
        const category = item.category || "Other Income";
        incomeByCategory[category] = (incomeByCategory[category] || 0) + Number(item.amount);
      });

      // Group expenses by category
      const expensesByCategory: Record<string, number> = {};
      expenseData?.forEach((item) => {
        const category = item.category || "Other Expenses";
        expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(item.amount);
      });

      // Convert to trial balance format
      const incomeItems: TrialBalanceItem[] = Object.entries(incomeByCategory).map(
        ([account, amount]) => ({
          account,
          debit: 0,
          credit: amount,
        })
      );

      const expenseItems: TrialBalanceItem[] = Object.entries(expensesByCategory).map(
        ([account, amount]) => ({
          account,
          debit: amount,
          credit: 0,
        })
      );

      setTrialBalance({
        income: incomeItems.sort((a, b) => b.credit - a.credit),
        expenses: expenseItems.sort((a, b) => b.debit - a.debit),
      });

      setReportType("summary");
      setShowReport(true);
      setShowReportDialog(false);
      toast({
        title: "அறிக்கை உருவாக்கப்பட்டது",
        description: "Summary report generated successfully",
      });
    } catch (error) {
      console.error("Error fetching summary report:", error);
      toast({
        title: "பிழை",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedReport = async () => {
    setLoading(true);
    try {
      // Fetch detailed income records
      const { data: incomeData, error: incomeError } = await supabase
        .from("income")
        .select("income_date, category, amount, source, description")
        .gte("income_date", startDate)
        .lte("income_date", endDate)
        .order("income_date", { ascending: true });

      if (incomeError) throw incomeError;

      // Fetch detailed expense records
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select("expense_date, category, amount, vendor_name, description")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: true });

      if (expenseError) throw expenseError;

      // Combine into transactions
      const transactions: DetailedTransaction[] = [];

      incomeData?.forEach((item) => {
        transactions.push({
          date: item.income_date,
          description: item.description || item.source || "Income",
          category: item.category || "Other Income",
          type: "income",
          amount: Number(item.amount),
          source: item.source || undefined,
        });
      });

      expenseData?.forEach((item) => {
        transactions.push({
          date: item.expense_date,
          description: item.description || item.vendor_name || "Expense",
          category: item.category || "Other Expenses",
          type: "expense",
          amount: Number(item.amount),
          source: item.vendor_name || undefined,
        });
      });

      // Sort by date
      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setDetailedTransactions(transactions);
      setReportType("detail");
      setShowReport(true);
      setShowReportDialog(false);
      toast({
        title: "அறிக்கை உருவாக்கப்பட்டது",
        description: "Detailed report generated successfully",
      });
    } catch (error) {
      console.error("Error fetching detailed report:", error);
      toast({
        title: "பிழை",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = reportType === "summary" 
    ? trialBalance.income.reduce((sum, item) => sum + item.credit, 0)
    : detailedTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = reportType === "summary"
    ? trialBalance.expenses.reduce((sum, item) => sum + item.debit, 0)
    : detailedTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  
  const netBalance = totalIncome - totalExpenses;

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast({
        title: "பிழை",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }
    setShowReportDialog(true);
  };

  const handleReportTypeSelect = (type: ReportType) => {
    if (type === "summary") {
      fetchSummaryReport();
    } else {
      fetchDetailedReport();
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "பிழை",
        description: "Please allow popups to print the report",
        variant: "destructive",
      });
      return;
    }

    const generateSummaryHTML = () => {
      const incomeRowsHTML = trialBalance.income.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.account}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">-</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #16a34a;">₹${item.credit.toLocaleString()}</td>
        </tr>
      `).join('');

      const expenseRowsHTML = trialBalance.expenses.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.account}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #dc2626;">₹${item.debit.toLocaleString()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">-</td>
        </tr>
      `).join('');

      return `
        <h2 style="margin-top: 20px; color: #16a34a;">வருமானம் / Income</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #16a34a; color: white;">
              <th style="padding: 10px; text-align: left;">கணக்கு / Account</th>
              <th style="padding: 10px; text-align: right;">பற்று / Debit (₹)</th>
              <th style="padding: 10px; text-align: right;">வரவு / Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${incomeRowsHTML}
            <tr style="background-color: #dcfce7; font-weight: bold;">
              <td style="padding: 10px;">மொத்த வருமானம் / Total Income</td>
              <td style="padding: 10px; text-align: right;">-</td>
              <td style="padding: 10px; text-align: right; color: #16a34a;">₹${totalIncome.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <h2 style="margin-top: 30px; color: #dc2626;">செலவுகள் / Expenses</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #dc2626; color: white;">
              <th style="padding: 10px; text-align: left;">கணக்கு / Account</th>
              <th style="padding: 10px; text-align: right;">பற்று / Debit (₹)</th>
              <th style="padding: 10px; text-align: right;">வரவு / Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRowsHTML}
            <tr style="background-color: #fee2e2; font-weight: bold;">
              <td style="padding: 10px;">மொத்த செலவு / Total Expenses</td>
              <td style="padding: 10px; text-align: right; color: #dc2626;">₹${totalExpenses.toLocaleString()}</td>
              <td style="padding: 10px; text-align: right;">-</td>
            </tr>
          </tbody>
        </table>
      `;
    };

    const generateDetailHTML = () => {
      const incomeTransactions = detailedTransactions.filter(t => t.type === "income");
      const expenseTransactions = detailedTransactions.filter(t => t.type === "expense");

      const incomeRowsHTML = incomeTransactions.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(item.date).toLocaleDateString("en-GB")}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.category}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #16a34a;">₹${item.amount.toLocaleString()}</td>
        </tr>
      `).join('');

      const expenseRowsHTML = expenseTransactions.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(item.date).toLocaleDateString("en-GB")}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.category}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #dc2626;">₹${item.amount.toLocaleString()}</td>
        </tr>
      `).join('');

      return `
        ${incomeTransactions.length > 0 ? `
          <h2 style="margin-top: 20px; color: #16a34a;">வருமானம் / Income</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #16a34a; color: white;">
                <th style="padding: 10px; text-align: left;">தேதி / Date</th>
                <th style="padding: 10px; text-align: left;">வகை / Category</th>
                <th style="padding: 10px; text-align: left;">விவரம் / Description</th>
                <th style="padding: 10px; text-align: right;">தொகை / Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${incomeRowsHTML}
              <tr style="background-color: #dcfce7; font-weight: bold;">
                <td colspan="3" style="padding: 10px;">மொத்த வருமானம் / Total Income</td>
                <td style="padding: 10px; text-align: right; color: #16a34a;">₹${totalIncome.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        ${expenseTransactions.length > 0 ? `
          <h2 style="margin-top: 30px; color: #dc2626;">செலவுகள் / Expenses</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #dc2626; color: white;">
                <th style="padding: 10px; text-align: left;">தேதி / Date</th>
                <th style="padding: 10px; text-align: left;">வகை / Category</th>
                <th style="padding: 10px; text-align: left;">விவரம் / Description</th>
                <th style="padding: 10px; text-align: right;">தொகை / Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${expenseRowsHTML}
              <tr style="background-color: #fee2e2; font-weight: bold;">
                <td colspan="3" style="padding: 10px;">மொத்த செலவு / Total Expenses</td>
                <td style="padding: 10px; text-align: right; color: #dc2626;">₹${totalExpenses.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}
      `;
    };

    const title = reportType === "summary" 
      ? "சோதனை இருப்புநிலை / Trial Balance Summary"
      : "விரிவான பரிவர்த்தனைகள் / Detailed Transactions";

    const contentHTML = reportType === "summary" ? generateSummaryHTML() : generateDetailHTML();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ta">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            font-family: 'Noto Sans Tamil', 'Tamil Sangam MN', 'Latha', sans-serif;
          }
          body {
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
            color: #333;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
          }
          h1 {
            text-align: center;
            color: #1a365d;
            margin-bottom: 5px;
          }
          .period {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
          }
          .summary-box {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-top: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
          }
          .summary-item {
            text-align: center;
            flex: 1;
          }
          .summary-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }
          .summary-value {
            font-size: 24px;
            font-weight: bold;
          }
          .income { color: #16a34a; }
          .expense { color: #dc2626; }
          .balance { color: ${netBalance >= 0 ? '#2563eb' : '#ea580c'}; }
          .print-btn {
            display: block;
            margin: 20px auto;
            padding: 12px 30px;
            background: #1a365d;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
          }
          .print-btn:hover {
            background: #2d4a7c;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <button class="print-btn no-print" onclick="window.print()">🖨️ Print / PDF பதிவிறக்கம்</button>
        
        <h1>${title}</h1>
        <p class="period">காலம் / Period: ${startDate} முதல் ${endDate} வரை</p>
        
        ${contentHTML}

        <div class="summary-box">
          <div class="summary-item">
            <div class="summary-label">மொத்த வருமானம் / Total Income</div>
            <div class="summary-value income">₹${totalIncome.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">மொத்த செலவு / Total Expenses</div>
            <div class="summary-value expense">₹${totalExpenses.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">நிகர இருப்பு / Net Balance</div>
            <div class="summary-value balance">₹${netBalance.toLocaleString()} ${netBalance >= 0 ? '(Surplus)' : '(Deficit)'}</div>
          </div>
        </div>

        <div class="footer">
          அறிக்கை உருவாக்கப்பட்ட நேரம் / Report Generated: ${new Date().toLocaleString('ta-IN')}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    toast({
      title: "அறிக்கை திறக்கப்பட்டது",
      description: "Print/Save as PDF using the browser",
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-secondary" />
            <h1 className="text-3xl md:text-5xl font-bold font-tamil text-primary-foreground mb-4">
              நிதிநிலை அறிக்கை
            </h1>
            <p className="text-primary-foreground/80 font-display text-xl">
              Financial Statement - Trial Balance
            </p>
          </motion.div>
        </div>
      </section>

      {/* Auth Notice */}
      <section className="py-4 bg-secondary/20">
        <div className="container mx-auto px-4">
          <Alert className="border-secondary bg-secondary/10">
            <Lock className="h-4 w-4" />
            <AlertDescription className="font-tamil">
              இந்த பக்கம் உறுப்பினர்களுக்கு மட்டுமே அணுகக்கூடியது.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Report Generator */}
      <section className="py-16 bg-background islamic-pattern">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="shadow-medium mb-8">
                <CardHeader>
                  <CardTitle className="font-tamil text-xl">
                    காலகட்டத்தைத் தேர்ந்தெடுக்கவும்
                  </CardTitle>
                  <CardDescription>
                    Select the period for Trial Balance report
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleGenerateReport} className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="startDate" className="font-tamil">தொடக்க தேதி</Label>
                      <div className="relative mt-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="startDate"
                          type="date"
                          className="pl-10"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="endDate" className="font-tamil">முடிவு தேதி</Label>
                      <div className="relative mt-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="endDate"
                          type="date"
                          className="pl-10"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" variant="default" size="lg" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            <span className="font-tamil">உருவாக்குகிறது...</span>
                          </>
                        ) : (
                          <span className="font-tamil">அறிக்கை உருவாக்கு</span>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Report Type Selection Dialog */}
              <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-tamil text-center">அறிக்கை வகையைத் தேர்ந்தெடுக்கவும்</DialogTitle>
                    <DialogDescription className="text-center">
                      Select report type / அறிக்கை வகையை தேர்வு செய்யவும்
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <Button
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5"
                      onClick={() => handleReportTypeSelect("summary")}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                      ) : (
                        <>
                          <FileText className="h-10 w-10 text-primary" />
                          <div className="text-center">
                            <p className="font-tamil font-semibold">சுருக்கம்</p>
                            <p className="text-xs text-muted-foreground">Summary</p>
                          </div>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5"
                      onClick={() => handleReportTypeSelect("detail")}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                      ) : (
                        <>
                          <List className="h-10 w-10 text-primary" />
                          <div className="text-center">
                            <p className="font-tamil font-semibold">விரிவானது</p>
                            <p className="text-xs text-muted-foreground">Detailed</p>
                          </div>
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Trial Balance Report */}
              {showReport && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="shadow-medium">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="font-tamil text-xl">
                          சோதனை இருப்புநிலை
                        </CardTitle>
                        <CardDescription>
                          Trial Balance: {startDate} to {endDate}
                        </CardDescription>
                      </div>
                      <Button 
                        variant="secondary" 
                        onClick={handlePrintReport}
                        disabled={!isAdmin}
                        title={!isAdmin ? "Only admins can print/download" : undefined}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print / PDF
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {reportType === "summary" ? (
                        // Summary View
                        trialBalance.income.length === 0 && trialBalance.expenses.length === 0 ? (
                          <Alert>
                            <AlertDescription className="font-tamil">
                              தேர்ந்தெடுக்கப்பட்ட காலகட்டத்தில் தரவு இல்லை. / No data found for the selected period.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="font-tamil">கணக்கு பெயர் / Account</TableHead>
                                  <TableHead className="text-right font-tamil">பற்று / Debit (₹)</TableHead>
                                  <TableHead className="text-right font-tamil">வரவு / Credit (₹)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {/* Income */}
                                {trialBalance.income.length > 0 && (
                                  <>
                                    <TableRow className="bg-secondary/10">
                                      <TableCell colSpan={3} className="font-tamil font-semibold">
                                        வருமானம் (Income)
                                      </TableCell>
                                    </TableRow>
                                    {trialBalance.income.map((item, index) => (
                                      <TableRow key={`income-${index}`}>
                                        <TableCell className="font-tamil pl-8">{item.account}</TableCell>
                                        <TableCell className="text-right">{item.debit || "-"}</TableCell>
                                        <TableCell className="text-right text-green-600">
                                          {item.credit.toLocaleString()}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow className="bg-green-50 dark:bg-green-900/20">
                                      <TableCell className="font-tamil font-semibold pl-8">
                                        மொத்த வருமானம் / Total Income
                                      </TableCell>
                                      <TableCell className="text-right">-</TableCell>
                                      <TableCell className="text-right font-bold text-green-600">
                                        {totalIncome.toLocaleString()}
                                      </TableCell>
                                    </TableRow>
                                  </>
                                )}

                                {/* Expenses */}
                                {trialBalance.expenses.length > 0 && (
                                  <>
                                    <TableRow className="bg-destructive/10">
                                      <TableCell colSpan={3} className="font-tamil font-semibold">
                                        செலவுகள் (Expenses)
                                      </TableCell>
                                    </TableRow>
                                    {trialBalance.expenses.map((item, index) => (
                                      <TableRow key={`expense-${index}`}>
                                        <TableCell className="font-tamil pl-8">{item.account}</TableCell>
                                        <TableCell className="text-right text-red-600">
                                          {item.debit.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">{item.credit || "-"}</TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow className="bg-red-50 dark:bg-red-900/20">
                                      <TableCell className="font-tamil font-semibold pl-8">
                                        மொத்த செலவு / Total Expenses
                                      </TableCell>
                                      <TableCell className="text-right font-bold text-red-600">
                                        {totalExpenses.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-right">-</TableCell>
                                    </TableRow>
                                  </>
                                )}

                                {/* Net Balance */}
                                <TableRow className="border-t-2 font-bold bg-primary/10">
                                  <TableCell className="font-tamil text-lg">
                                    நிகர இருப்பு / Net Balance
                                  </TableCell>
                                  <TableCell colSpan={2} className={`text-right text-lg ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ₹{netBalance.toLocaleString()}
                                    {netBalance >= 0 ? ' (Surplus)' : ' (Deficit)'}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>

                          {/* Summary Cards */}
                          <div className="mt-6 grid md:grid-cols-3 gap-4">
                            <Card className="bg-green-50 dark:bg-green-900/20 p-4">
                              <div className="flex items-center gap-3">
                                <TrendingUp className="h-8 w-8 text-green-600" />
                                <div>
                                  <p className="text-sm text-muted-foreground font-tamil">மொத்த வருமானம்</p>
                                  <p className="text-2xl font-bold text-green-600">
                                    ₹{totalIncome.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </Card>
                            <Card className="bg-red-50 dark:bg-red-900/20 p-4">
                              <div className="flex items-center gap-3">
                                <TrendingDown className="h-8 w-8 text-red-600" />
                                <div>
                                  <p className="text-sm text-muted-foreground font-tamil">மொத்த செலவு</p>
                                  <p className="text-2xl font-bold text-red-600">
                                    ₹{totalExpenses.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </Card>
                            <Card className={`p-4 ${netBalance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                              <div className="flex items-center gap-3">
                                <Scale className={`h-8 w-8 ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                                <div>
                                  <p className="text-sm text-muted-foreground font-tamil">நிகர இருப்பு</p>
                                  <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    ₹{netBalance.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          </div>
                        </>
                      )
                      ) : (
                        // Detailed View
                        detailedTransactions.length === 0 ? (
                          <Alert>
                            <AlertDescription className="font-tamil">
                              தேர்ந்தெடுக்கப்பட்ட காலகட்டத்தில் தரவு இல்லை. / No data found for the selected period.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="font-tamil">தேதி / Date</TableHead>
                                    <TableHead className="font-tamil">வகை / Category</TableHead>
                                    <TableHead className="font-tamil">விவரம் / Description</TableHead>
                                    <TableHead className="text-right font-tamil">வருமானம் / Income (₹)</TableHead>
                                    <TableHead className="text-right font-tamil">செலவு / Expense (₹)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {detailedTransactions.map((transaction, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        {new Date(transaction.date).toLocaleDateString("en-GB")}
                                      </TableCell>
                                      <TableCell className="font-tamil">{transaction.category}</TableCell>
                                      <TableCell>
                                        <div>
                                          <span className="font-tamil">{transaction.description}</span>
                                          {transaction.source && (
                                            <span className="block text-xs text-muted-foreground">
                                              {transaction.source}
                                            </span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {transaction.type === "income" ? (
                                          <span className="text-green-600 font-medium">
                                            {transaction.amount.toLocaleString()}
                                          </span>
                                        ) : (
                                          "-"
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {transaction.type === "expense" ? (
                                          <span className="text-red-600 font-medium">
                                            {transaction.amount.toLocaleString()}
                                          </span>
                                        ) : (
                                          "-"
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  {/* Totals Row */}
                                  <TableRow className="border-t-2 font-bold bg-muted/50">
                                    <TableCell colSpan={3} className="font-tamil">
                                      மொத்தம் / Total
                                    </TableCell>
                                    <TableCell className="text-right text-green-600">
                                      {totalIncome.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-red-600">
                                      {totalExpenses.toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                  {/* Net Balance Row */}
                                  <TableRow className="font-bold bg-primary/10">
                                    <TableCell colSpan={3} className="font-tamil text-lg">
                                      நிகர இருப்பு / Net Balance
                                    </TableCell>
                                    <TableCell colSpan={2} className={`text-right text-lg ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ₹{netBalance.toLocaleString()}
                                      {netBalance >= 0 ? ' (Surplus)' : ' (Deficit)'}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>

                            {/* Summary Cards for Detail View */}
                            <div className="mt-6 grid md:grid-cols-3 gap-4">
                              <Card className="bg-green-50 dark:bg-green-900/20 p-4">
                                <div className="flex items-center gap-3">
                                  <TrendingUp className="h-8 w-8 text-green-600" />
                                  <div>
                                    <p className="text-sm text-muted-foreground font-tamil">மொத்த வருமானம்</p>
                                    <p className="text-2xl font-bold text-green-600">
                                      ₹{totalIncome.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </Card>
                              <Card className="bg-red-50 dark:bg-red-900/20 p-4">
                                <div className="flex items-center gap-3">
                                  <TrendingDown className="h-8 w-8 text-red-600" />
                                  <div>
                                    <p className="text-sm text-muted-foreground font-tamil">மொத்த செலவு</p>
                                    <p className="text-2xl font-bold text-red-600">
                                      ₹{totalExpenses.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </Card>
                              <Card className={`p-4 ${netBalance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                                <div className="flex items-center gap-3">
                                  <Scale className={`h-8 w-8 ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                                  <div>
                                    <p className="text-sm text-muted-foreground font-tamil">நிகர இருப்பு</p>
                                    <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                      ₹{netBalance.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </Card>
                            </div>
                          </>
                        )
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FinancialStatementPage;
