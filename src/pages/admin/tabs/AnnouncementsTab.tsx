import { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Loader2, Bell, AlertTriangle, Info, PartyPopper, Eye, EyeOff, Mail, MessageSquare, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TamilInput } from "@/components/ui/tamil-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  title_tamil: string | null;
  content: string;
  content_tamil: string | null;
  type: string | null;
  is_active: boolean | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const typeOptions = [
  { id: "info", label: "Information", icon: Info, color: "bg-blue-500" },
  { id: "warning", label: "Warning", icon: AlertTriangle, color: "bg-yellow-500" },
  { id: "urgent", label: "Urgent", icon: Bell, color: "bg-red-500" },
  { id: "celebration", label: "Celebration", icon: PartyPopper, color: "bg-green-500" },
];

const AnnouncementsTab = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    title_tamil: "",
    content: "",
    content_tamil: "",
    type: "info",
    is_active: true,
    start_date: "",
    end_date: "",
    send_email: false,
    send_sms: false,
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast({
        title: "Error",
        description: "Failed to fetch announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        title_tamil: formData.title_tamil.trim() || null,
        content: formData.content.trim(),
        content_tamil: formData.content_tamil.trim() || null,
        type: formData.type,
        is_active: formData.is_active,
        start_date: formData.start_date || new Date().toISOString(),
        end_date: formData.end_date || null,
      };

      let announcementId: string | null = null;

      if (editingAnnouncement) {
        const { error } = await supabase
          .from("announcements")
          .update(payload)
          .eq("id", editingAnnouncement.id);

        if (error) throw error;
        announcementId = editingAnnouncement.id;
        toast({ title: "Success", description: "Announcement updated successfully" });
      } else {
        const { data, error } = await supabase
          .from("announcements")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        announcementId = data?.id;
        toast({ title: "Success", description: "Announcement created successfully" });
      }

      // Send notifications if requested (only for new announcements or if explicitly requested)
      if (announcementId && (formData.send_email || formData.send_sms) && !editingAnnouncement) {
        try {
          toast({
            title: "Sending Notifications",
            description: "Sending notifications to subscribed members...",
          });

          const { data: notifResult, error: notifError } = await supabase.functions.invoke(
            "send-announcement-notification",
            {
              body: {
                announcement_id: announcementId,
                title: formData.title.trim(),
                title_tamil: formData.title_tamil.trim() || null,
                content: formData.content.trim(),
                content_tamil: formData.content_tamil.trim() || null,
                type: formData.type,
                send_email: formData.send_email,
                send_sms: formData.send_sms,
              },
            }
          );

          if (notifError) {
            console.error("Notification error:", notifError);
            toast({
              title: "Notification Warning",
              description: "Announcement saved but some notifications may have failed",
              variant: "destructive",
            });
          } else {
            const emailCount = notifResult?.email?.success || 0;
            const smsCount = notifResult?.sms?.success || 0;
            toast({
              title: "Notifications Sent",
              description: `Sent ${emailCount} emails and ${smsCount} SMS messages`,
            });
          }
        } catch (notifError) {
          console.error("Notification error:", notifError);
        }
      }

      resetForm();
      setIsDialogOpen(false);
      fetchAnnouncements();
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: "Failed to save announcement",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      title_tamil: announcement.title_tamil || "",
      content: announcement.content,
      content_tamil: announcement.content_tamil || "",
      type: announcement.type || "info",
      is_active: announcement.is_active ?? true,
      start_date: announcement.start_date ? announcement.start_date.split("T")[0] : "",
      end_date: announcement.end_date ? announcement.end_date.split("T")[0] : "",
      send_email: false,
      send_sms: false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast({ title: "Success", description: "Announcement deleted successfully" });
      fetchAnnouncements();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .update({ is_active: !announcement.is_active })
        .eq("id", announcement.id);

      if (error) throw error;
      fetchAnnouncements();
      toast({
        title: "Success",
        description: announcement.is_active ? "Announcement hidden" : "Announcement visible",
      });
    } catch (error) {
      console.error("Toggle error:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      title_tamil: "",
      content: "",
      content_tamil: "",
      type: "info",
      is_active: true,
      start_date: "",
      end_date: "",
      send_email: false,
      send_sms: false,
    });
    setEditingAnnouncement(null);
  };

  const getTypeConfig = (type: string | null) => {
    return typeOptions.find((t) => t.id === type) || typeOptions[0];
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle>Announcements</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Add Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? "Edit Announcement" : "New Announcement"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title (English) *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title_tamil">Title (Tamil)</Label>
                <TamilInput
                  name="title_tamil"
                  value={formData.title_tamil}
                  onChange={(value) => setFormData({ ...formData, title_tamil: value })}
                  placeholder="Type in English, auto-converts to Tamil"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content (English) *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter announcement content"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_tamil">Content (Tamil)</Label>
                <Textarea
                  id="content_tamil"
                  value={formData.content_tamil}
                  onChange={(e) => setFormData({ ...formData, content_tamil: e.target.value })}
                  placeholder="உள்ளடக்கத்தை உள்ளிடவும்"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active (visible on homepage)</Label>
              </div>

              {/* Notification Options - only for new announcements */}
              {!editingAnnouncement && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Send className="h-4 w-4" />
                    Send Notifications
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="send_email"
                        checked={formData.send_email}
                        onCheckedChange={(checked) => setFormData({ ...formData, send_email: checked })}
                      />
                      <Label htmlFor="send_email" className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="send_sms"
                        checked={formData.send_sms}
                        onCheckedChange={(checked) => setFormData({ ...formData, send_sms: checked })}
                      />
                      <Label htmlFor="send_sms" className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        SMS
                      </Label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Notifications will be sent to members who have enabled them in their profile.
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingAnnouncement ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No announcements yet. Create your first announcement!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => {
                  const typeConfig = getTypeConfig(announcement.type);
                  return (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <Badge className={`${typeConfig.color} text-white`}>
                          <typeConfig.icon className="h-3 w-3 mr-1" />
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{announcement.title}</p>
                          {announcement.title_tamil && (
                            <p className="text-sm text-muted-foreground font-tamil">
                              {announcement.title_tamil}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(announcement)}
                          className={announcement.is_active ? "text-green-600" : "text-muted-foreground"}
                        >
                          {announcement.is_active ? (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4 mr-1" />
                              Hidden
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>From: {announcement.start_date ? format(new Date(announcement.start_date), "dd/MM/yyyy") : "Now"}</p>
                          {announcement.end_date && (
                            <p className="text-muted-foreground">
                              To: {format(new Date(announcement.end_date), "dd/MM/yyyy")}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(announcement)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => setDeleteId(announcement.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The announcement will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AnnouncementsTab;