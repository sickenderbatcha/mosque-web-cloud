import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/auditLog";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TamilInput } from "@/components/ui/tamil-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Users, UserCheck, UserX, Download, KeyRound, Loader2, Upload, FileDown, ImagePlus, User, X, Trash2, Copy, Check } from "lucide-react";
import TablePagination from "@/components/admin/TablePagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import MemberFamilySection from "@/components/admin/MemberFamilySection";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Database } from "@/integrations/supabase/types";

type Member = Database["public"]["Tables"]["gb_members"]["Row"];
type BloodGroup = Database["public"]["Enums"]["blood_group"];

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const MembersTab = () => {
  const { isSuperAdmin } = useUserRole();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resetPasswordLoading, setResetPasswordLoading] = useState<string | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<{
    newRecords: any[];
    updateRecords: any[];
    errors: string[];
  } | null>(null);
  const [csvPreviewStep, setCsvPreviewStep] = useState<'upload' | 'preview'>('upload');
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [photoUploadStats, setPhotoUploadStats] = useState({ total: 0, success: 0, failed: 0 });
  const [singlePhotoUploading, setSinglePhotoUploading] = useState(false);
  const [newMemberPhoto, setNewMemberPhoto] = useState<File | null>(null);
  const [newMemberPhotoPreview, setNewMemberPhotoPreview] = useState<string | null>(null);
  const [memberIdError, setMemberIdError] = useState<string | null>(null);
  const [memberIdFormatError, setMemberIdFormatError] = useState<string | null>(null);
  const [memberIdChecking, setMemberIdChecking] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ name: string; password: string; notificationSent: boolean } | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    member_id: "",
    full_name: "",
    father_name: "",
    family_name: "",
    phone: "",
    email: "",
    address: "",
    occupation: "",
    blood_group: "" as BloodGroup | "",
    date_of_birth: "",
    date_of_marriage: "",
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    // Fetch all members with pagination to bypass the 1000-row limit
    const allMembers: Member[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("gb_members")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        toast({ title: "Error fetching members", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data) {
        allMembers.push(...(data as Member[]));
        hasMore = data.length === pageSize;
        from += pageSize;
      } else {
        hasMore = false;
      }
    }

    setMembers(allMembers);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      member_id: "",
      full_name: "",
      father_name: "",
      family_name: "",
      phone: "",
      email: "",
      address: "",
      occupation: "",
      blood_group: "",
      date_of_birth: "",
      date_of_marriage: "",
    });
    setEditingMember(null);
    setNewMemberPhoto(null);
    setNewMemberPhotoPreview(null);
    setMemberIdError(null);
    setMemberIdFormatError(null);
  };

  // Validate member_id format: 2-3 letters followed by exactly 4 digits
  const validateMemberIdFormat = (memberId: string): string | null => {
    if (!memberId.trim()) return null;
    const formatRegex = /^[A-Za-z]{2,3}\d{4}$/;
    if (!formatRegex.test(memberId.trim())) {
      return "Format: 2-3 letters + 4 digits (e.g., GB1234, ABC0001)";
    }
    return null;
  };

  // Debounced member_id validation (format + duplicate check)
  useEffect(() => {
    // Only validate for new members
    if (editingMember) {
      setMemberIdError(null);
      setMemberIdFormatError(null);
      return;
    }

    const memberId = formData.member_id.trim();
    if (!memberId) {
      setMemberIdError(null);
      setMemberIdFormatError(null);
      setMemberIdChecking(false);
      return;
    }

    // Check format immediately
    const formatError = validateMemberIdFormat(memberId);
    setMemberIdFormatError(formatError);

    // If format is invalid, don't check for duplicates
    if (formatError) {
      setMemberIdError(null);
      setMemberIdChecking(false);
      return;
    }

    setMemberIdChecking(true);
    
    const debounceTimer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("gb_members")
          .select("id, member_id")
          .eq("member_id", memberId)
          .maybeSingle();
        
        if (error) {
          console.error("Error checking member_id:", error);
          setMemberIdError(null);
          return;
        }
        
        if (data) {
          setMemberIdError(`Member ID "${memberId}" already exists`);
        } else {
          setMemberIdError(null);
        }
      } catch (err) {
        console.error("Error checking member_id:", err);
        setMemberIdError(null);
      } finally {
        setMemberIdChecking(false);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [formData.member_id, editingMember]);

  const openEditDialog = (member: Member) => {
    setEditingMember(member);
    setFormData({
      member_id: member.member_id,
      full_name: member.full_name,
      father_name: member.father_name || "",
      family_name: (member as any).family_name || "",
      phone: member.phone || "",
      email: member.email || "",
      address: member.address || "",
      occupation: member.occupation || "",
      blood_group: member.blood_group || "",
      date_of_birth: member.date_of_birth || "",
      date_of_marriage: (member as any).date_of_marriage || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission if member_id format is invalid or already exists (for new members only)
    if (!editingMember && memberIdFormatError) {
      toast({ title: "Invalid Member ID format", description: memberIdFormatError, variant: "destructive" });
      return;
    }
    if (!editingMember && memberIdError) {
      toast({ title: "Cannot add member", description: memberIdError, variant: "destructive" });
      return;
    }

    const memberData = {
      member_id: formData.member_id,
      full_name: formData.full_name,
      father_name: formData.father_name || null,
      family_name: formData.family_name,
      phone: formData.phone,
      email: formData.email || null,
      address: formData.address || null,
      occupation: formData.occupation || null,
      blood_group: formData.blood_group || null,
      date_of_birth: formData.date_of_birth || null,
      date_of_marriage: formData.date_of_marriage || null,
    };

    if (editingMember) {
      const { error } = await supabase
        .from("gb_members")
        .update(memberData)
        .eq("id", editingMember.id);

      if (error) {
        toast({ title: "Error updating member", description: error.message, variant: "destructive" });
      } else {
        logAdminAction({ action_type: "update_member", action_description: `Updated member: ${formData.full_name} (${formData.member_id})`, target_table: "gb_members", target_id: editingMember.id });
        toast({ title: "Member updated successfully" });
        fetchMembers();
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const { data, error } = await supabase.from("gb_members").insert(memberData).select().single();

      if (error) {
        toast({ title: "Error adding member", description: error.message, variant: "destructive" });
      } else {
        // Upload photo if one was selected for the new member
        let updatedMember = data;
        if (newMemberPhoto && data) {
          try {
            const fileExt = newMemberPhoto.name.split(".").pop()?.toLowerCase() || "jpg";
            const filePath = `${formData.member_id}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from("member-photos")
              .upload(filePath, newMemberPhoto, { upsert: true });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from("member-photos")
                .getPublicUrl(filePath);

              const { data: photoUpdatedMember } = await supabase
                .from("gb_members")
                .update({ photo_url: urlData.publicUrl })
                .eq("id", data.id)
                .select()
                .single();
              
              if (photoUpdatedMember) {
                updatedMember = photoUpdatedMember;
              }
            }
          } catch (photoError) {
            console.error("Failed to upload photo:", photoError);
          }
        }
        
        logAdminAction({ action_type: "create_member", action_description: `Added new member: ${formData.full_name} (${formData.member_id})`, target_table: "gb_members" });
        toast({ title: "Member added successfully. You can now add family members below." });
        fetchMembers();
        // Set the newly created member as editing member to show family section
        setEditingMember(updatedMember as Member);
        setNewMemberPhoto(null);
        setNewMemberPhotoPreview(null);
      }
    }
  };

  const handleNewMemberPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewMemberPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMemberPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearNewMemberPhoto = () => {
    setNewMemberPhoto(null);
    setNewMemberPhotoPreview(null);
  };

  const toggleMemberStatus = async (member: Member) => {
    const { error } = await supabase
      .from("gb_members")
      .update({ is_active: !member.is_active })
      .eq("id", member.id);

    if (error) {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    } else {
      logAdminAction({ action_type: member.is_active ? "deactivate_member" : "activate_member", action_description: `${member.is_active ? "Deactivated" : "Activated"} member ${member.full_name} (${member.member_id})`, target_table: "gb_members", target_id: member.id });
      toast({ title: `Member ${member.is_active ? "deactivated" : "activated"}` });
      fetchMembers();
    }
  };

  const handleResetPassword = async (member: Member) => {
    if (!member.auth_user_id) {
      toast({ 
        title: "Cannot reset password", 
        description: "This member does not have a user account.", 
        variant: "destructive" 
      });
      return;
    }

    if (!confirm(`Are you sure you want to reset the password for ${member.full_name}? A new password will be sent to their registered contact.`)) {
      return;
    }

    setResetPasswordLoading(member.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("admin-reset-password", {
        body: { memberId: member.member_id },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const newPassword = response.data?.newPassword;
      if (newPassword) {
        logAdminAction({ action_type: "reset_password", action_description: `Reset password for member ${member.full_name} (${member.member_id})`, target_table: "gb_members", target_id: member.id });
        setResetPasswordResult({
          name: member.full_name,
          password: newPassword,
          notificationSent: response.data?.notificationSent || false,
        });
        setPasswordCopied(false);
      } else {
        toast({ 
          title: "Password reset successful", 
          description: `New password has been sent to ${member.full_name}'s registered contact.`,
        });
      }
    } catch (error: any) {
      toast({ 
        title: "Error resetting password", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setResetPasswordLoading(null);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Hide SUPUSR member for non-superadmin users
      if (!isSuperAdmin && member.member_id?.toUpperCase().trim() === "SUPUSR") return false;
      
      const matchesSearch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.member_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.phone && member.phone.includes(searchQuery));
      const matchesBloodGroup = bloodGroupFilter === "all" || member.blood_group === bloodGroupFilter;
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && member.is_active) || 
        (statusFilter === "inactive" && !member.is_active);
      return matchesSearch && matchesBloodGroup && matchesStatus;
    });
  }, [members, searchQuery, bloodGroupFilter, statusFilter, isSuperAdmin]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, bloodGroupFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  const activeMembers = members.filter((m) => m.is_active);
  const inactiveMembers = members.filter((m) => !m.is_active);

  const exportToCSV = () => {
    const headers = ["Member ID", "Name", "Father's Name", "Phone", "Email", "Address", "Occupation", "Blood Group", "Date of Birth", "Status"];
    const rows = filteredMembers.map((m) => [
      m.member_id,
      m.full_name,
      m.father_name || "",
      m.phone,
      m.email || "",
      m.address || "",
      m.occupation || "",
      m.blood_group || "",
      m.date_of_birth || "",
      m.is_active ? "Active" : "Inactive",
    ]);
    
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `members_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported successfully" });
  };

  const downloadSampleCSV = () => {
    const link = document.createElement("a");
    link.href = "/samples/gb_members_sample.csv";
    link.download = "gb_members_sample.csv";
    link.click();
    toast({ title: "Sample CSV downloaded" });
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Parse dates from dd-mm-yyyy or dd/mm/yyyy to yyyy-mm-dd format with validation
  const parseDateDDMMYYYY = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    
    // Try dd-mm-yyyy or dd/mm/yyyy format
    let parts = trimmed.split('-');
    if (parts.length !== 3) {
      parts = trimmed.split('/');
    }
    
    let day: number, month: number, year: number;
    
    if (parts.length === 3) {
      if (parts[0].length <= 2 && parts[2].length === 4) {
        // dd-mm-yyyy or dd/mm/yyyy format
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      } else if (parts[0].length === 4) {
        // yyyy-mm-dd format
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else {
        return null;
      }
      
      // Validate the date components
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      if (year < 1900 || year > 2100) return null;
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;
      
      // Additional validation for days in month
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) return null;
      
      // Format as yyyy-mm-dd
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    return null;
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvUploading(true);
    
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV file must have at least a header row and one data row");
      }

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      const requiredHeaders = ["member_id", "full_name", "father_name"];
      
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);
      }

      const memberData: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || null;
        });

        // Validate required fields
        if (!row.member_id || !row.full_name || !row.father_name) {
          errors.push(`Row ${i + 1}: Missing required fields (member_id, full_name, father_name)`);
          continue;
        }

        // Validate blood group
        const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""];
        if (row.blood_group && !validBloodGroups.includes(row.blood_group)) {
          errors.push(`Row ${i + 1}: Invalid blood group "${row.blood_group}"`);
          continue;
        }

        // Parse is_active
        const isActiveValue = row.is_active?.toLowerCase?.();
        const isActive = isActiveValue === "true" || isActiveValue === "1" || isActiveValue === "yes" || isActiveValue === undefined || isActiveValue === "";

        const parsedDob = row.date_of_birth ? parseDateDDMMYYYY(row.date_of_birth) : null;
        const parsedDom = row.date_of_marriage ? parseDateDDMMYYYY(row.date_of_marriage) : null;

        if (row.date_of_birth && !parsedDob) {
          errors.push(`Row ${i + 1}: Invalid date_of_birth format. Use dd-mm-yyyy`);
          continue;
        }
        if (row.date_of_marriage && !parsedDom) {
          errors.push(`Row ${i + 1}: Invalid date_of_marriage format. Use dd-mm-yyyy`);
          continue;
        }

        memberData.push({
          member_id: row.member_id,
          full_name: row.full_name,
          father_name: row.father_name,
          family_name: row.family_name || null,
          phone: row.phone || null,
          email: row.email || null,
          address: row.address || null,
          occupation: row.occupation || null,
          blood_group: row.blood_group || null,
          date_of_birth: parsedDob,
          date_of_marriage: parsedDom,
          is_active: isActive,
        });
      }

      if (memberData.length === 0) {
        throw new Error("No valid records found in CSV");
      }

      // Separate new vs update records
      const existingMemberIds = new Set(members.map(m => m.member_id));
      const newRecords = memberData.filter(m => !existingMemberIds.has(m.member_id));
      const updateRecords = memberData.filter(m => existingMemberIds.has(m.member_id));

      // Store preview data and show preview step
      setCsvPreviewData({ newRecords, updateRecords, errors });
      setCsvPreviewStep('preview');
      
    } catch (error: any) {
      toast({ 
        title: "CSV Parse Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setCsvUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const confirmCSVImport = async () => {
    if (!csvPreviewData) return;

    setCsvUploading(true);
    
    try {
      const allRecords = [...csvPreviewData.newRecords, ...csvPreviewData.updateRecords];
      
      // Insert members using upsert (update if member_id exists)
      const { error } = await supabase
        .from("gb_members")
        .upsert(allRecords, { onConflict: "member_id" });

      if (error) {
        throw error;
      }

      fetchMembers();
      resetCsvDialog();
      
      const message = `${csvPreviewData.newRecords.length} new members added, ${csvPreviewData.updateRecords.length} members updated`;
      
      toast({ 
        title: "CSV Import Complete", 
        description: message 
      });
    } catch (error: any) {
      toast({ 
        title: "CSV Import Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setCsvUploading(false);
    }
  };

  const resetCsvDialog = () => {
    setCsvDialogOpen(false);
    setCsvPreviewData(null);
    setCsvPreviewStep('upload');
  };

  const handleBulkPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setPhotoUploading(true);
    setPhotoUploadProgress(0);
    setPhotoUploadStats({ total: files.length, success: 0, failed: 0 });

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;
      const memberId = fileName.replace(/\.[^/.]+$/, ""); // Remove extension to get member_id

      try {
        // Find member by member_id
        const member = members.find(m => m.member_id === memberId);
        if (!member) {
          results.failed++;
          results.errors.push(`${fileName}: Member ID "${memberId}" not found`);
          continue;
        }

        // Upload to storage
        const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${memberId}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("member-photos")
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          results.failed++;
          results.errors.push(`${fileName}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("member-photos")
          .getPublicUrl(filePath);

        // Update member record with photo URL
        const { error: updateError } = await supabase
          .from("gb_members")
          .update({ photo_url: urlData.publicUrl })
          .eq("id", member.id);

        if (updateError) {
          results.failed++;
          results.errors.push(`${fileName}: Failed to update member record`);
        } else {
          results.success++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${fileName}: ${error.message}`);
      }

      setPhotoUploadProgress(((i + 1) / files.length) * 100);
      setPhotoUploadStats({ total: files.length, success: results.success, failed: results.failed });
    }

    setPhotoUploading(false);
    fetchMembers();

    if (results.success > 0) {
      toast({
        title: "Photo Upload Complete",
        description: `${results.success} photos uploaded successfully${results.failed > 0 ? `, ${results.failed} failed` : ""}`,
      });
    }

    if (results.failed > 0 && results.errors.length > 0) {
      console.log("Photo upload errors:", results.errors);
      toast({
        title: "Some photos failed to upload",
        description: results.errors.slice(0, 3).join("; ") + (results.errors.length > 3 ? `... and ${results.errors.length - 3} more` : ""),
        variant: "destructive",
      });
    }

    // Reset file input
    event.target.value = "";
  };

  const handleSinglePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, member: Member) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSinglePhotoUploading(true);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${member.member_id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("member-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("member-photos")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("gb_members")
        .update({ photo_url: urlData.publicUrl })
        .eq("id", member.id);

      if (updateError) throw updateError;

      toast({ title: "Photo uploaded successfully" });
      fetchMembers();
      
      // Update editing member if we're editing
      if (editingMember?.id === member.id) {
        setEditingMember({ ...editingMember, photo_url: urlData.publicUrl });
      }
    } catch (error: any) {
      toast({ title: "Failed to upload photo", description: error.message, variant: "destructive" });
    } finally {
      setSinglePhotoUploading(false);
      event.target.value = "";
    }
  };

  const handleRemovePhoto = async (member: Member) => {
    if (!member.photo_url) return;
    
    if (!confirm("Are you sure you want to remove this photo?")) return;

    try {
      // Extract file path from URL
      const urlParts = member.photo_url.split("/member-photos/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("member-photos").remove([filePath]);
      }

      const { error } = await supabase
        .from("gb_members")
        .update({ photo_url: null })
        .eq("id", member.id);

      if (error) throw error;

      toast({ title: "Photo removed successfully" });
      fetchMembers();
      
      if (editingMember?.id === member.id) {
        setEditingMember({ ...editingMember, photo_url: null });
      }
    } catch (error: any) {
      toast({ title: "Failed to remove photo", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteMember = async (member: Member) => {
    setDeletingMemberId(member.id);
    
    try {
      // First, delete any family members associated with this member
      const { error: familyError } = await supabase
        .from("gb_family_members")
        .delete()
        .eq("member_id", member.id);
      
      if (familyError) {
        console.error("Error deleting family members:", familyError);
        // Continue even if family deletion fails
      }

      // Delete member's photo from storage if exists
      if (member.photo_url) {
        try {
          const urlParts = member.photo_url.split("/member-photos/");
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from("member-photos").remove([filePath]);
          }
        } catch (photoError) {
          console.error("Error deleting photo:", photoError);
          // Continue even if photo deletion fails
        }
      }

      // Delete the member record
      const { error } = await supabase
        .from("gb_members")
        .delete()
        .eq("id", member.id);

      if (error) throw error;

      toast({ 
        title: "Member deleted successfully", 
        description: `${member.full_name} (${member.member_id}) has been removed.` 
      });
      fetchMembers();
    } catch (error: any) {
      toast({ 
        title: "Failed to delete member", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setDeletingMemberId(null);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Members List", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, 14, 30);

    autoTable(doc, {
      startY: 35,
      head: [["ID", "Name", "Phone", "Blood Group", "Status"]],
      body: filteredMembers.map((m) => [
        m.member_id,
        m.full_name,
        m.phone,
        m.blood_group || "-",
        m.is_active ? "Active" : "Inactive",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`members_${new Date().toISOString().split("T")[0]}.pdf`);
    toast({ title: "PDF exported successfully" });
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive Members</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveMembers.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <CardTitle>Members List</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Dialog open={csvDialogOpen} onOpenChange={(open) => { if (!open) resetCsvDialog(); else setCsvDialogOpen(true); }}>
              <DialogTrigger asChild>
                <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import CSV</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {csvPreviewStep === 'upload' ? 'Import Members from CSV' : 'Preview Import'}
                  </DialogTitle>
                </DialogHeader>
                
                {csvPreviewStep === 'upload' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file to import members. Existing members with matching Member ID will be updated.
                    </p>
                    <div className="space-y-2">
                      <Label>Required Columns:</Label>
                      <p className="text-xs text-muted-foreground">
                        member_id, full_name, father_name
                      </p>
                      <Label>Optional Columns:</Label>
                      <p className="text-xs text-muted-foreground">
                        family_name, phone, email, address, occupation, blood_group, date_of_birth, date_of_marriage, is_active
                      </p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={downloadSampleCSV}>
                      <FileDown className="h-4 w-4 mr-2" />Download Sample CSV
                    </Button>
                    <div className="space-y-2">
                      <Label htmlFor="csv-upload">Select CSV File</Label>
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleCSVUpload}
                        disabled={csvUploading}
                      />
                    </div>
                    {csvUploading && (
                      <div className="flex items-center justify-center gap-2 py-4">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Parsing CSV...</span>
                      </div>
                    )}
                  </div>
                )}

                {csvPreviewStep === 'preview' && csvPreviewData && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-2xl font-bold text-green-600">{csvPreviewData.newRecords.length}</p>
                              <p className="text-sm text-muted-foreground">New members</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2">
                            <Edit className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="text-2xl font-bold text-blue-600">{csvPreviewData.updateRecords.length}</p>
                              <p className="text-sm text-muted-foreground">Updates</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Errors */}
                    {csvPreviewData.errors.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                        <p className="text-sm font-medium text-red-600 mb-2">
                          {csvPreviewData.errors.length} rows skipped due to errors:
                        </p>
                        <div className="max-h-24 overflow-y-auto text-xs text-red-500 space-y-1">
                          {csvPreviewData.errors.slice(0, 10).map((err, i) => (
                            <p key={i}>{err}</p>
                          ))}
                          {csvPreviewData.errors.length > 10 && (
                            <p>...and {csvPreviewData.errors.length - 10} more errors</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* New Records Preview */}
                    {csvPreviewData.newRecords.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">New</Badge>
                          Members to be added
                        </h4>
                        <div className="border rounded-md max-h-40 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Member ID</TableHead>
                                <TableHead className="text-xs">Name</TableHead>
                                <TableHead className="text-xs">Father's Name</TableHead>
                                <TableHead className="text-xs">Phone</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {csvPreviewData.newRecords.slice(0, 50).map((record, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-xs py-1">{record.member_id}</TableCell>
                                  <TableCell className="text-xs py-1">{record.full_name}</TableCell>
                                  <TableCell className="text-xs py-1">{record.father_name}</TableCell>
                                  <TableCell className="text-xs py-1">{record.phone || '-'}</TableCell>
                                </TableRow>
                              ))}
                              {csvPreviewData.newRecords.length > 50 && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-xs text-center text-muted-foreground py-1">
                                    ...and {csvPreviewData.newRecords.length - 50} more
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Update Records Preview */}
                    {csvPreviewData.updateRecords.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Update</Badge>
                          Members to be updated
                        </h4>
                        <div className="border rounded-md max-h-40 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Member ID</TableHead>
                                <TableHead className="text-xs">Name</TableHead>
                                <TableHead className="text-xs">Father's Name</TableHead>
                                <TableHead className="text-xs">Phone</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {csvPreviewData.updateRecords.slice(0, 50).map((record, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-xs py-1">{record.member_id}</TableCell>
                                  <TableCell className="text-xs py-1">{record.full_name}</TableCell>
                                  <TableCell className="text-xs py-1">{record.father_name}</TableCell>
                                  <TableCell className="text-xs py-1">{record.phone || '-'}</TableCell>
                                </TableRow>
                              ))}
                              {csvPreviewData.updateRecords.length > 50 && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-xs text-center text-muted-foreground py-1">
                                    ...and {csvPreviewData.updateRecords.length - 50} more
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={resetCsvDialog}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={confirmCSVImport} 
                        disabled={csvUploading || (csvPreviewData.newRecords.length === 0 && csvPreviewData.updateRecords.length === 0)}
                      >
                        {csvUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>Confirm Import</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><ImagePlus className="h-4 w-4 mr-2" />Upload Photos</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Member Photos</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload multiple member photos at once. Each photo file must be named with the member ID 
                    (e.g., <code className="bg-muted px-1 rounded">00001.jpg</code>, <code className="bg-muted px-1 rounded">00002.png</code>).
                  </p>
                  <div className="bg-muted/50 p-3 rounded-md text-sm space-y-2">
                    <p className="font-medium">Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Rename each photo to the member ID (e.g., 00001.jpg)</li>
                      <li>Select multiple photos to upload</li>
                      <li>Photos will be matched to members automatically</li>
                      <li>Existing photos will be replaced</li>
                    </ol>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: JPG, JPEG, PNG, WebP
                  </p>
                  
                  {photoUploading && (
                    <div className="space-y-2">
                      <Progress value={photoUploadProgress} className="w-full" />
                      <p className="text-sm text-center text-muted-foreground">
                        Uploading: {photoUploadStats.success} success, {photoUploadStats.failed} failed of {photoUploadStats.total}
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="photo-upload">Select Photos</Label>
                    <Input
                      id="photo-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      multiple
                      onChange={handleBulkPhotoUpload}
                      disabled={photoUploading}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Member</Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingMember ? "Edit Member" : "Add New Member"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Photo Upload Section */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage 
                        src={editingMember ? (editingMember.photo_url || undefined) : (newMemberPhotoPreview || undefined)} 
                        alt={editingMember ? editingMember.full_name : "New member"} 
                      />
                      <AvatarFallback className="text-lg">
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    {(editingMember?.photo_url || newMemberPhotoPreview) && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => editingMember ? handleRemovePhoto(editingMember) : clearNewMemberPhoto()}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>புகைப்படம் / Member Photo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => editingMember ? handleSinglePhotoUpload(e, editingMember) : handleNewMemberPhotoChange(e)}
                        disabled={singlePhotoUploading}
                        className="flex-1"
                      />
                      {singlePhotoUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supported: JPG, PNG, WebP
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="member_id">உறுப்பினர் எண் / Member ID *</Label>
                    <div className="relative">
                      <Input 
                        id="member_id" 
                        value={formData.member_id} 
                        onChange={(e) => setFormData({ ...formData, member_id: e.target.value.toUpperCase() })} 
                        required 
                        disabled={!!editingMember}
                        className={(memberIdError || memberIdFormatError) && !editingMember ? "border-destructive" : ""}
                        placeholder="e.g., GB1234, ABC0001"
                      />
                      {memberIdChecking && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {memberIdFormatError && !editingMember && (
                      <p className="text-sm text-destructive mt-1">{memberIdFormatError}</p>
                    )}
                    {memberIdError && !memberIdFormatError && !editingMember && (
                      <p className="text-sm text-destructive mt-1">{memberIdError}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="full_name">முழு பெயர் / Full Name *</Label>
                    <TamilInput name="full_name" value={formData.full_name} onChange={(value) => setFormData({ ...formData, full_name: value })} placeholder="Type in English, auto-converts to Tamil" />
                  </div>
                  <div>
                    <Label htmlFor="father_name">தந்தை பெயர் / Father's Name *</Label>
                    <TamilInput name="father_name" value={formData.father_name} onChange={(value) => setFormData({ ...formData, father_name: value })} placeholder="Type in English, auto-converts to Tamil" />
                  </div>
                  <div>
                    <Label htmlFor="family_name">வகையரா / Family Name *</Label>
                    <TamilInput name="family_name" value={formData.family_name} onChange={(value) => setFormData({ ...formData, family_name: value })} placeholder="Type in English, auto-converts to Tamil" />
                  </div>
                  <div>
                    <Label htmlFor="phone">தொலைபேசி / Phone *</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="email">மின்னஞ்சல் / Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="occupation">தொழில் / Occupation</Label>
                    <TamilInput name="occupation" value={formData.occupation} onChange={(value) => setFormData({ ...formData, occupation: value })} placeholder="Type in English, auto-converts to Tamil" />
                  </div>
                  <div>
                    <Label htmlFor="blood_group">இரத்த வகை / Blood Group</Label>
                    <Select value={formData.blood_group} onValueChange={(value) => setFormData({ ...formData, blood_group: value as BloodGroup })}>
                      <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map((bg) => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">பிறந்த தேதி / Date of Birth</Label>
                    <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="date_of_marriage">திருமணத் தேதி / Date of Marriage *</Label>
                    <Input id="date_of_marriage" type="date" value={formData.date_of_marriage} onChange={(e) => setFormData({ ...formData, date_of_marriage: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">முகவரி / Address</Label>
                  <Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit">{editingMember ? "Update" : "Add"} Member</Button>
                </div>
              </form>
              
              {/* Family Members Section - only show when editing an existing member */}
              {editingMember && (
                <MemberFamilySection 
                  memberId={editingMember.id} 
                  memberAddress={editingMember.address}
                />
              )}
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by name, ID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={bloodGroupFilter} onValueChange={setBloodGroupFilter}>
              <SelectTrigger className="sm:w-[150px]">
                <SelectValue placeholder="Blood Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blood Groups</SelectItem>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />PDF
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Photo</TableHead>
                <TableHead>Member ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                      <AvatarFallback className="text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{member.member_id}</TableCell>
                  <TableCell>{member.full_name}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>{member.blood_group || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={member.is_active ? "default" : "secondary"}>
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(member)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {member.auth_user_id && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleResetPassword(member)}
                          disabled={resetPasswordLoading === member.id}
                          title="Reset Password"
                        >
                          {resetPasswordLoading === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <KeyRound className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Switch checked={member.is_active ?? false} onCheckedChange={() => toggleMemberStatus(member)} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete Member"
                          >
                            {deletingMemberId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>உறுப்பினர் பதிவை நீக்கவா? / Delete Member Record?</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>
                                <strong>{member.full_name}</strong> ({member.member_id}) உறுப்பினர் பதிவை நிரந்தரமாக நீக்க விரும்புகிறீர்களா?
                              </p>
                              <p className="text-sm">
                                This will permanently delete the member record for <strong>{member.full_name}</strong> ({member.member_id}) and all associated family members.
                              </p>
                              <p className="text-destructive font-medium">
                                இந்த செயலை மீட்டெடுக்க முடியாது! / This action cannot be undone!
                              </p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ரத்து / Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteMember(member)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              நீக்கு / Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {members.length === 0 ? "No members found" : "No members match your filters"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredMembers.length}
            startIndex={startIndex}
            endIndex={endIndex}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
            itemLabel="members"
          />
        </CardContent>
      </Card>
      {/* Password Reset Result Dialog */}
      <Dialog open={!!resetPasswordResult} onOpenChange={(open) => { if (!open) setResetPasswordResult(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <div className="text-sm text-muted-foreground">
              New password for <strong>{resetPasswordResult?.name}</strong>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input 
                readOnly 
                value={resetPasswordResult?.password || ""} 
                className="font-mono text-lg tracking-wider text-center"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(resetPasswordResult?.password || "");
                  setPasswordCopied(true);
                  setTimeout(() => setPasswordCopied(false), 2000);
                }}
              >
                {passwordCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {resetPasswordResult?.notificationSent 
                ? "This password has also been sent to the member's registered contact."
                : "⚠️ Notification could not be sent. Please share this password manually."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersTab;
