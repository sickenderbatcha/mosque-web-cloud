import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/auditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

interface Grievance {
  id: string;
  ticket_number: string;
  complainant_name: string;
  complainant_phone: string;
  complainant_email: string | null;
  subject: string;
  description: string;
  category: string | null;
  status: "pending" | "in_progress" | "resolved" | "closed";
  admin_response: string | null;
  priority: string | null;
  created_at: string;
}

const GrievancesTab = () => {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");

  useEffect(() => {
    fetchGrievances();
  }, []);

  const fetchGrievances = async () => {
    const pageSize = 1000;
    let allGrievances: Grievance[] = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from("grievances")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error("Error fetching grievances:", error);
        break;
      }
      
      if (data && data.length > 0) {
        allGrievances = [...allGrievances, ...data];
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    setGrievances(allGrievances);
    setLoading(false);
  };

  const updateGrievance = async () => {
    if (!selectedGrievance) return;

    const updates: Record<string, string | null> = {};
    if (response) updates.admin_response = response;
    if (newStatus) updates.status = newStatus;
    if (newStatus === "resolved") updates.resolved_at = new Date().toISOString();

    const { error } = await supabase
      .from("grievances")
      .update(updates)
      .eq("id", selectedGrievance.id);

    if (error) {
      toast.error("Failed to update grievance");
    } else {
      // Send status update notification (email and/or SMS)
      if (newStatus) {
        supabase.functions.invoke("send-notification-email", {
          body: {
            type: "grievance_status_update",
            email: selectedGrievance.complainant_email || undefined,
            phone: selectedGrievance.complainant_phone,
            recipientName: selectedGrievance.complainant_name,
            data: {
              ticketNumber: selectedGrievance.ticket_number,
              subject: selectedGrievance.subject,
              status: newStatus,
              adminResponse: response,
            },
          },
        }).catch(console.error);
      }
      
      toast.success("Grievance updated");
      setSelectedGrievance(null);
      setResponse("");
      setNewStatus("");
      fetchGrievances();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      in_progress: "secondary",
      resolved: "default",
      closed: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace("_", " ")}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Grievances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grievances.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {grievances.filter((g) => g.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {grievances.filter((g) => g.status === "in_progress").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {grievances.filter((g) => g.status === "resolved").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Grievances</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Complainant</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grievances.map((grievance) => (
                <TableRow key={grievance.id}>
                  <TableCell className="font-mono text-sm">{grievance.ticket_number}</TableCell>
                  <TableCell>
                    <div className="font-medium">{grievance.complainant_name}</div>
                    <div className="text-sm text-muted-foreground">{grievance.complainant_phone}</div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{grievance.subject}</TableCell>
                  <TableCell>{grievance.category || "-"}</TableCell>
                  <TableCell>{getStatusBadge(grievance.status)}</TableCell>
                  <TableCell>{format(new Date(grievance.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedGrievance(grievance);
                            setResponse(grievance.admin_response || "");
                            setNewStatus(grievance.status);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Grievance Details - {grievance.ticket_number}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-1">Subject</h4>
                            <p>{grievance.subject}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">Description</h4>
                            <p className="text-muted-foreground">{grievance.description}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">Update Status</h4>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">Admin Response</h4>
                            <Textarea
                              value={response}
                              onChange={(e) => setResponse(e.target.value)}
                              placeholder="Enter your response..."
                              rows={4}
                            />
                          </div>
                          <Button onClick={updateGrievance} className="w-full">
                            Update Grievance
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {grievances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No grievances found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default GrievancesTab;
