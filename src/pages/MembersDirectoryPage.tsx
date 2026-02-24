import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Search, Phone, Mail, MapPin, Briefcase, Droplet, Loader2, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface GBMember {
  id: string;
  member_id: string;
  full_name: string;
  father_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  occupation: string | null;
  blood_group: string | null;
  photo_url: string | null;
  joined_at: string | null;
}

const MembersDirectoryPage = () => {
  const { isAdmin } = useUserRole();
  const [members, setMembers] = useState<GBMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>("all");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const allMembers: GBMember[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("gb_members")
          .select("id, member_id, full_name, father_name, phone, email, address, occupation, blood_group, photo_url, joined_at")
          .eq("is_active", true)
          .order("member_id")
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allMembers.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      setMembers(allMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const filteredMembers = useMemo(() => {
    const rawQuery = searchQuery.trim();
    const query = rawQuery.toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        query === "" ||
        member.full_name.toLowerCase().includes(query) ||
        member.member_id.toLowerCase().includes(query) ||
        (member.phone ?? "").includes(rawQuery) ||
        (member.occupation?.toLowerCase().includes(query) ?? false) ||
        (member.address?.toLowerCase().includes(query) ?? false);

      const matchesBloodGroup = bloodGroupFilter === "all" || member.blood_group === bloodGroupFilter;

      return matchesSearch && matchesBloodGroup;
    });
  }, [members, searchQuery, bloodGroupFilter]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getBloodGroupColor = (bloodGroup: string | null) => {
    if (!bloodGroup) return "bg-muted text-muted-foreground";
    const colors: Record<string, string> = {
      "A+": "bg-red-100 text-red-700",
      "A-": "bg-red-200 text-red-800",
      "B+": "bg-blue-100 text-blue-700",
      "B-": "bg-blue-200 text-blue-800",
      "AB+": "bg-purple-100 text-purple-700",
      "AB-": "bg-purple-200 text-purple-800",
      "O+": "bg-green-100 text-green-700",
      "O-": "bg-green-200 text-green-800",
    };
    return colors[bloodGroup] || "bg-muted text-muted-foreground";
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(26, 95, 74);
    doc.rect(0, 0, pageWidth, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("GB Members Directory", pageWidth / 2, 18, { align: "center" });
    
    // Subtitle
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 40, { align: "center" });
    doc.text(`Total Members: ${filteredMembers.length}`, pageWidth / 2, 46, { align: "center" });

    // Table data
    const tableData = filteredMembers.map((member, index) => [
      index + 1,
      member.member_id,
      member.full_name,
      member.father_name || "-",
      member.phone || "-",
      member.blood_group || "-",
      member.occupation || "-",
      member.address || "-",
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["#", "ID", "Name", "Father Name", "Phone", "Blood", "Occupation", "Address"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 95, 74], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 22 },
        5: { cellWidth: 12 },
        6: { cellWidth: 25 },
        7: { cellWidth: 'auto' },
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`GB_Members_Directory_${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "PDF Downloaded",
      description: `Exported ${filteredMembers.length} members to PDF.`,
    });
  };

  const exportToExcel = () => {
    const excelData = filteredMembers.map((member, index) => ({
      "S.No": index + 1,
      "Member ID": member.member_id,
      "Full Name": member.full_name,
      "Father Name": member.father_name || "",
      "Phone": member.phone || "",
      "Email": member.email || "",
      "Blood Group": member.blood_group || "",
      "Occupation": member.occupation || "",
      "Address": member.address || "",
      "Joined Date": member.joined_at ? new Date(member.joined_at).toLocaleDateString() : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Members");

    // Auto-size columns
    const colWidths = [
      { wch: 6 },  // S.No
      { wch: 15 }, // Member ID
      { wch: 25 }, // Full Name
      { wch: 20 }, // Father Name
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 10 }, // Blood Group
      { wch: 20 }, // Occupation
      { wch: 40 }, // Address
      { wch: 12 }, // Joined Date
    ];
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, `GB_Members_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Excel Downloaded",
      description: `Exported ${filteredMembers.length} members to Excel.`,
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Users className="h-14 w-14 mx-auto mb-4 text-secondary" />
            <h1 className="text-3xl md:text-4xl font-bold font-tamil text-primary-foreground mb-2">
              உறுப்பினர் அடைவு
            </h1>
            <p className="text-primary-foreground/80 font-display text-lg">
              GB Members Directory
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="py-8 bg-muted/50 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, ID, phone, occupation, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={bloodGroupFilter} onValueChange={setBloodGroupFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Droplet className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Blood Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blood Groups</SelectItem>
                {bloodGroups.map((bg) => (
                  <SelectItem key={bg} value={bg}>
                    {bg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Export Dropdown - Admin Only */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={filteredMembers.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={exportToPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </section>

      {/* Members Grid */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-20">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Members Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || bloodGroupFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "No active members in the directory"}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <p className="text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filteredMembers.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{members.length}</span> members
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMembers.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                          <Avatar className="h-20 w-20 mb-4">
                            <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>

                          <h3 className="font-semibold text-lg mb-1">{member.full_name}</h3>
                          {member.father_name && (
                            <p className="text-sm text-muted-foreground mb-2">S/o {member.father_name}</p>
                          )}
                          <Badge variant="outline" className="mb-3">
                            {member.member_id}
                          </Badge>

                          {member.blood_group && (
                            <Badge className={`mb-4 ${getBloodGroupColor(member.blood_group)}`}>
                              <Droplet className="h-3 w-3 mr-1" />
                              {member.blood_group}
                            </Badge>
                          )}

                          <div className="w-full space-y-2 text-sm text-left">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                              {member.phone ? (
                                <a href={`tel:${member.phone}`} className="hover:text-primary truncate">
                                  {member.phone}
                                </a>
                              ) : (
                                <span className="truncate">-</span>
                              )}
                            </div>

                            {member.email && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                <a href={`mailto:${member.email}`} className="hover:text-primary truncate">
                                  {member.email}
                                </a>
                              </div>
                            )}

                            {member.occupation && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{member.occupation}</span>
                              </div>
                            )}

                            {member.address && (
                              <div className="flex items-start gap-2 text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{member.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default MembersDirectoryPage;
