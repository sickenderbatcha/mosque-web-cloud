import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, X, Eye, Printer, Download, Loader2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { generateDeathCertificatePdf, printDeathCertificate } from "@/utils/deathCertificatePdf";
import { generateMarriageCertificatePdf, printMarriageCertificate } from "@/utils/marriageCertificatePdf";
import { generateOutsideMarriageCertificatePdf, printOutsideMarriageCertificate } from "@/utils/outsideMarriageCertificatePdf";
import { generateHeirCertificatePdf, printHeirCertificate } from "@/utils/heirCertificatePdf";
import { generateNocCertificatePdf, printNocCertificate } from "@/utils/nocCertificatePdf";

interface IssuedDocument {
  id: string;
  document_number: string | null;
  document_category: string;
  document_type: string;
  reference_id: string;
  member_id: string | null;
  applicant_name: string;
  applicant_phone: string | null;
  beneficiary_name: string | null;
  issued_date: string;
  issued_by: string | null;
  amount: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  death: "இறப்பு சான்றிதழ் (Death)",
  marriage: "திருமண சான்றிதழ் (Marriage)",
  outside_marriage: "வெளியூர் திருமணம் (Outside Marriage)",
  noc: "NOC சான்றிதழ் (NOC)",
  heir: "வாரிசு சான்றிதழ் (Heir)",
};

const PAGE_SIZE = 20;

const IssuedDocumentsTab = () => {
  const [documents, setDocuments] = useState<IssuedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("issued_documents")
        .select("*", { count: "exact" })
        .eq("document_category", "certificate")
        .order("issued_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (filterType !== "all") {
        query = query.eq("document_type", filterType);
      }
      if (dateFrom) {
        query = query.gte("issued_date", dateFrom);
      }
      if (dateTo) {
        query = query.lte("issued_date", dateTo);
      }
      if (searchText.trim()) {
        const term = searchText.trim();
        query = query.or(
          `document_number.ilike.%${term}%,applicant_name.ilike.%${term}%,beneficiary_name.ilike.%${term}%,member_id.ilike.%${term}%`
        );
      }

      const { data, count, error } = await query;

      if (error) {
        console.error("Error fetching issued documents:", error);
        toast({ title: "Error", description: "Failed to fetch documents", variant: "destructive" });
      } else {
        setDocuments((data as IssuedDocument[]) || []);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterType, dateFrom, dateTo, searchText]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [filterType, dateFrom, dateTo, searchText]);

  const clearFilters = () => {
    setSearchText("");
    setFilterType("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(0);
  };

  const hasActiveFilters = searchText || filterType !== "all" || dateFrom || dateTo;

  const handleView = (doc: IssuedDocument) => {
    const { document_type, reference_id } = doc;
    window.open(`/certificate-preview?type=${document_type}&id=${reference_id}`, "_blank");
  };

  const handlePrint = async (doc: IssuedDocument) => {
    setActionLoadingId(doc.id);
    try {
      const { document_type, reference_id } = doc;

      if (document_type === "death") {
        const { data } = await supabase.from("death_registers").select("*").eq("id", reference_id).single();
        if (data) await printDeathCertificate(data as any);
      } else if (document_type === "marriage") {
        const { data } = await supabase.from("marriage_registers").select("*").eq("id", reference_id).single();
        if (data) await printMarriageCertificate(data as any);
      } else if (document_type === "outside_marriage") {
        const { data } = await supabase.from("outside_marriage_registers").select("*").eq("id", reference_id).single();
        if (data) await printOutsideMarriageCertificate(data as any);
      } else if (document_type === "heir") {
        const { data } = await supabase.from("heir_certificates").select("*").eq("id", reference_id).single();
        if (data) await printHeirCertificate(data as any);
      } else if (document_type === "noc") {
        const { data } = await supabase.from("noc_certificates").select("*").eq("id", reference_id).single();
        if (data) await printNocCertificate(data as any);
      } else {
        toast({ title: "Info", description: "Print not available for this document type." });
      }
    } catch (err) {
      console.error("Print error:", err);
      toast({ title: "Error", description: "Failed to print document", variant: "destructive" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownload = async (doc: IssuedDocument) => {
    setActionLoadingId(doc.id);
    try {
      const { document_type, reference_id } = doc;

      if (document_type === "death") {
        const { data } = await supabase.from("death_registers").select("*").eq("id", reference_id).single();
        if (data) await generateDeathCertificatePdf(data as any);
      } else if (document_type === "marriage") {
        const { data } = await supabase.from("marriage_registers").select("*").eq("id", reference_id).single();
        if (data) await generateMarriageCertificatePdf(data as any);
      } else if (document_type === "outside_marriage") {
        const { data } = await supabase.from("outside_marriage_registers").select("*").eq("id", reference_id).single();
        if (data) await generateOutsideMarriageCertificatePdf(data as any);
      } else if (document_type === "heir") {
        const { data } = await supabase.from("heir_certificates").select("*").eq("id", reference_id).single();
        if (data) await generateHeirCertificatePdf(data as any);
      } else if (document_type === "noc") {
        const { data } = await supabase.from("noc_certificates").select("*").eq("id", reference_id).single();
        if (data) await generateNocCertificatePdf(data as any);
      } else {
        toast({ title: "Info", description: "Download not available for this document type." });
      }
    } catch (err) {
      console.error("Download error:", err);
      toast({ title: "Error", description: "Failed to download document", variant: "destructive" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "death": return "destructive";
      case "marriage": return "default";
      case "outside_marriage": return "secondary";
      case "noc": return "outline";
      case "heir": return "default";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-tamil">
          <FileText className="h-5 w-5" />
          வழங்கப்பட்ட சான்றிதழ்கள் (Issued Certificates)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Doc No / Name / Member ID..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Certificate Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="death">Death Certificate</SelectItem>
              <SelectItem value="marriage">Marriage Certificate</SelectItem>
              <SelectItem value="outside_marriage">Outside Marriage</SelectItem>
              <SelectItem value="noc">NOC Certificate</SelectItem>
              <SelectItem value="heir">Heir Certificate</SelectItem>
            </SelectContent>
          </Select>

          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground mb-3">
          {loading ? "Loading..." : `${totalCount} document(s) found`}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No documents found</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doc No.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Member ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-xs">
                        {doc.document_number || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(doc.document_type) as any} className="text-xs whitespace-nowrap">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-tamil">
                        <div>{doc.applicant_name}</div>
                        {doc.applicant_phone && (
                          <div className="text-xs text-muted-foreground">{doc.applicant_phone}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-tamil">
                        {doc.beneficiary_name || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {doc.member_id || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(doc.issued_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(doc)}
                            title="Preview"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrint(doc)}
                            disabled={actionLoadingId === doc.id}
                            title="Print"
                            className="h-8 w-8"
                          >
                            {actionLoadingId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Printer className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc)}
                            disabled={actionLoadingId === doc.id}
                            title="Download PDF"
                            className="h-8 w-8"
                          >
                            {actionLoadingId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default IssuedDocumentsTab;
