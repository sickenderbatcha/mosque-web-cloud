import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Upload, Search, FileText, Download, Eye, Printer, Trash2, Loader2, Plus, X, File, Monitor } from "lucide-react";
import { format } from "date-fns";

interface PdfDocument {
  id: string;
  document_type: string;
  document_name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

const DOCUMENT_TYPES = [
  { value: "financial_report", label: "நிதி அறிக்கை (Financial Report)" },
  { value: "meeting_minutes", label: "கூட்ட நடவடிக்கைகள் (Meeting Minutes)" },
  { value: "audit_report", label: "தணிக்கை அறிக்கை (Audit Report)" },
  { value: "government_letter", label: "அரசு கடிதம் (Government Letter)" },
  { value: "trust_deed", label: "அறக்கட்டளை ஆவணம் (Trust Deed)" },
  { value: "legal_document", label: "சட்ட ஆவணம் (Legal Document)" },
  { value: "circular", label: "சுற்றறிக்கை (Circular)" },
  { value: "policy", label: "கொள்கை (Policy)" },
  { value: "agreement", label: "ஒப்பந்தம் (Agreement)" },
  { value: "other", label: "பிற (Other)" },
];

const DOCUMENT_TYPE_LABELS: Record<string, string> = DOCUMENT_TYPES.reduce((acc, dt) => {
  acc[dt.value] = dt.label;
  return acc;
}, {} as Record<string, string>);

interface PdfDocumentsTabProps {
  onUploadDialogChange?: (open: boolean) => void;
  onRequestFileUpload?: () => void;
  pendingFile?: File | null;
  onPendingFileConsumed?: () => void;
}

const PdfDocumentsTab = ({ onUploadDialogChange, onRequestFileUpload, pendingFile, onPendingFileConsumed }: PdfDocumentsTabProps) => {
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [metadataDialogOpen, setMetadataDialogOpenInternal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<PdfDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Upload form state
  const [uploadDocType, setUploadDocType] = useState("");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Wrapper to notify parent of dialog state changes
  const setMetadataDialogOpen = (open: boolean) => {
    setMetadataDialogOpenInternal(open);
    onUploadDialogChange?.(open);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // When parent passes a pending file (from the file input outside Tabs), consume it
  useEffect(() => {
    if (pendingFile) {
      // Validate the file
      const isValidType = pendingFile.type === "application/pdf" || pendingFile.type.startsWith("image/");
      if (!isValidType) {
        toast({
          title: "Invalid File Type",
          description: "Only PDF and image files are accepted.",
          variant: "destructive",
        });
        onPendingFileConsumed?.();
        return;
      }

      if (pendingFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 10MB.",
          variant: "destructive",
        });
        onPendingFileConsumed?.();
        return;
      }

      // File is valid — open metadata dialog
      setSelectedFile(pendingFile);
      setUploadDocName(pendingFile.name.replace(/\.(pdf|png|jpe?g|gif|webp|svg)$/i, ""));
      setMetadataDialogOpen(true);
      onPendingFileConsumed?.();
    }
  }, [pendingFile]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_pdf_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments((data as PdfDocument[]) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch documents.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // User clicks "Upload Document" → triggers parent's file input (OUTSIDE Tabs)
  const handleUploadClick = () => {
    if (onRequestFileUpload) {
      onRequestFileUpload();
    } else {
      // Fallback: use local file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    }
  };

  // Step 2: File selected → validate → open metadata modal
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isValidType = file.type === "application/pdf" || file.type.startsWith("image/");
    if (!isValidType) {
      toast({
        title: "Invalid File Type",
        description: "Only PDF and image files are accepted.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 10MB.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // File is valid — save it and THEN open the metadata dialog
    setSelectedFile(file);
    setUploadDocName(file.name.replace(/\.pdf$/i, ""));
    setMetadataDialogOpen(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadDocType || !uploadDocName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in document type and name.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const timestamp = Date.now();
      const filePath = `${uploadDocType}/${timestamp}-${uploadDocName.replace(/[^a-zA-Z0-9]/g, "_")}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("admin-documents")
        .upload(filePath, selectedFile, { upsert: false });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("admin_pdf_documents")
        .insert({
          document_type: uploadDocType,
          document_name: uploadDocName.trim(),
          description: uploadDescription.trim() || null,
          file_path: filePath,
          file_size: selectedFile.size,
          uploaded_by: user?.id || null,
        });

      if (dbError) {
        await supabase.storage.from("admin-documents").remove([filePath]);
        throw dbError;
      }

      toast({
        title: "ஆவணம் பதிவேற்றப்பட்டது (Document Uploaded)",
        description: `"${uploadDocName}" successfully uploaded.`,
      });

      resetUploadForm();
      setMetadataDialogOpen(false);
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadDocType("");
    setUploadDocName("");
    setUploadDescription("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("admin-documents")
      .createSignedUrl(filePath, 300);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to generate document URL.",
        variant: "destructive",
      });
      return null;
    }
    return data.signedUrl;
  };

  const handleView = async (doc: PdfDocument) => {
    const url = await getSignedUrl(doc.file_path);
    if (url) window.open(url, "_blank");
  };

  const handleDownload = async (doc: PdfDocument) => {
    const { data, error } = await supabase.storage
      .from("admin-documents")
      .download(doc.file_path);

    if (error) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download document.",
        variant: "destructive",
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.document_name}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = async (doc: PdfDocument) => {
    const url = await getSignedUrl(doc.file_path);
    if (!url) return;

    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.print();
      });
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    setDeleting(true);
    try {
      const { error: storageError } = await supabase.storage
        .from("admin-documents")
        .remove([documentToDelete.file_path]);

      if (storageError) console.error("Storage delete error:", storageError);

      const { error: dbError } = await supabase
        .from("admin_pdf_documents")
        .delete()
        .eq("id", documentToDelete.id);

      if (dbError) throw dbError;

      toast({
        title: "ஆவணம் நீக்கப்பட்டது (Document Deleted)",
        description: `"${documentToDelete.document_name}" has been deleted.`,
      });

      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete document.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.document_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || doc.document_type === filterType;

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fallback hidden file input — only used if parent doesn't provide onRequestFileUpload */}
      {!onRequestFileUpload && (
        <input
          type="file"
          accept=".pdf,application/pdf"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PDF ஆவண சேமிப்பகம் (PDF Document Storage)
              </CardTitle>
              <CardDescription>
                Upload, search, view and download PDF documents. Total: {documents.length} documents
              </CardDescription>
            </div>
            {isMobile ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                <Monitor className="h-4 w-4 shrink-0" />
                <span>Upload available on desktop only</span>
              </div>
            ) : (
              <Button onClick={handleUploadClick} className="gap-2">
                <Plus className="h-4 w-4" />
                Upload Document
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, description, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DOCUMENT_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {searchQuery || filterType !== "all"
                  ? "No documents match your search"
                  : "No documents uploaded yet"}
              </p>
              <p className="text-sm mt-1">
                {searchQuery || filterType !== "all"
                  ? "Try adjusting your search or filter"
                  : "Click 'Upload Document' to add your first PDF"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="hidden sm:table-cell">Size</TableHead>
                    <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-destructive shrink-0" />
                          <span className="font-medium truncate max-w-[200px]">{doc.document_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground truncate block max-w-[250px]">
                          {doc.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {format(new Date(doc.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleView(doc)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrint(doc)} title="Print">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDocumentToDelete(doc);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata Modal - Opens ONLY AFTER file is already selected (no file picker conflict) */}
      {metadataDialogOpen && createPortal(
        <>
          <div className="fixed inset-0 z-50 bg-black/80" />
          <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border bg-background p-6 shadow-lg sm:rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
              <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                <Upload className="h-5 w-5" />
                PDF ஆவணம் பதிவேற்றம் (Upload PDF Document)
              </h3>
              <p className="text-sm text-muted-foreground">
                File selected. Please provide details about the document.
              </p>
            </div>

            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              onClick={() => {
                if (!uploading) {
                  resetUploadForm();
                  setMetadataDialogOpen(false);
                }
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>

            {/* Show selected file info */}
            {selectedFile && (
              <div className="mb-4 p-3 rounded-md bg-muted flex items-center gap-2">
                <FileText className="h-5 w-5 text-destructive shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc-type">Document Type *</Label>
                <Select value={uploadDocType} onValueChange={setUploadDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-name">Document Name *</Label>
                <Input
                  id="doc-name"
                  placeholder="Enter document name"
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-desc">Additional Information</Label>
                <Textarea
                  id="doc-desc"
                  placeholder="Enter any additional details about this document..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6">
              <Button variant="outline" onClick={() => {
                resetUploadForm();
                setMetadataDialogOpen(false);
              }} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !selectedFile || !uploadDocType || !uploadDocName.trim()}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ஆவணத்தை நீக்கவா? (Delete Document?)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.document_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PdfDocumentsTab;
