import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, X, User, Save, Plus, Trash2, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CommitteeMember {
  id: string;
  name: string;
  position: string;
  father_name: string | null;
  qualification: string | null;
  photo_url: string | null;
  sort_order: number | null;
  is_current: boolean | null;
  phone: string | null;
  address: string | null;
}

const CommitteeTab = () => {
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    position: "",
    father_name: "",
    qualification: "",
    photo_url: "",
    sort_order: 0,
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("management_committee")
        .select("*")
        .eq("is_current", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching committee:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (file: File, memberId?: string) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed", variant: "destructive" });
      return null;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("committee-photos")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("committee-photos")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleInlinePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, member: CommitteeMember) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(member.id);
    try {
      const url = await handlePhotoUpload(file);
      if (!url) return;

      const { error } = await supabase
        .from("management_committee")
        .update({ photo_url: url })
        .eq("id", member.id);

      if (error) throw error;

      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, photo_url: url } : m));
      toast({ title: "புகைப்படம் பதிவேற்றப்பட்டது", description: "Photo uploaded successfully" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleRemovePhoto = async (member: CommitteeMember) => {
    try {
      const { error } = await supabase
        .from("management_committee")
        .update({ photo_url: null })
        .eq("id", member.id);

      if (error) throw error;

      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, photo_url: null } : m));
      toast({ title: "Photo removed" });
    } catch (error) {
      console.error("Remove error:", error);
      toast({ title: "Failed to remove photo", variant: "destructive" });
    }
  };

  const openAddDialog = () => {
    setEditingMember(null);
    setForm({ name: "", position: "", father_name: "", qualification: "", photo_url: "", sort_order: members.length });
    setDialogOpen(true);
  };

  const openEditDialog = (member: CommitteeMember) => {
    setEditingMember(member);
    setForm({
      name: member.name,
      position: member.position,
      father_name: member.father_name || "",
      qualification: member.qualification || "",
      photo_url: member.photo_url || "",
      sort_order: member.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const handleFormPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const url = await handlePhotoUpload(file);
      if (url) setForm(prev => ({ ...prev, photo_url: url }));
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.position.trim()) {
      toast({ title: "Name and Position are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        position: form.position.trim(),
        father_name: form.father_name.trim() || null,
        qualification: form.qualification.trim() || null,
        photo_url: form.photo_url || null,
        sort_order: form.sort_order,
        is_current: true,
      };

      if (editingMember) {
        const { error } = await supabase
          .from("management_committee")
          .update(payload)
          .eq("id", editingMember.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("management_committee")
          .insert(payload);
        if (error) throw error;
      }

      toast({ title: "Saved successfully" });
      setDialogOpen(false);
      fetchMembers();
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this committee member?")) return;

    try {
      const { error } = await supabase
        .from("management_committee")
        .delete()
        .eq("id", id);
      if (error) throw error;

      toast({ title: "Deleted successfully" });
      fetchMembers();
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-tamil">நிர்வாகக் குழு உறுப்பினர்கள்</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Management Committee Members</p>
          </div>
          <Button onClick={openAddDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No committee members added yet</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {members.map((member) => (
                <Card key={member.id} className="relative group">
                  <CardContent className="p-4 text-center space-y-3">
                    {/* Photo */}
                    <div className="relative w-24 h-24 mx-auto">
                      {member.photo_url ? (
                        <div className="relative w-full h-full">
                          <img
                            src={member.photo_url}
                            alt={member.name}
                            className="w-full h-full rounded-full object-cover border-2 border-primary/20"
                            loading="lazy"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-1 -right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemovePhoto(member)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="w-full h-full rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors border-2 border-dashed border-muted-foreground/30">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleInlinePhotoUpload(e, member)}
                            disabled={uploadingPhoto === member.id}
                          />
                          {uploadingPhoto === member.id ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          ) : (
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          )}
                        </label>
                      )}
                    </div>

                    {/* Info */}
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{member.name}</h4>
                      <p className="text-xs text-primary font-medium">{member.position}</p>
                      {member.father_name && (
                        <p className="text-xs text-muted-foreground">S/o {member.father_name}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 justify-center">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(member)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(member.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Edit Committee Member" : "Add Committee Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name / பெயர் *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="உறுப்பினர் பெயர்"
              />
            </div>
            <div className="space-y-2">
              <Label>Position / பதவி *</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm(prev => ({ ...prev, position: e.target.value }))}
                placeholder="e.g. தலைவர்"
              />
            </div>
            <div className="space-y-2">
              <Label>Father's Name / தந்தை பெயர்</Label>
              <Input
                value={form.father_name}
                onChange={(e) => setForm(prev => ({ ...prev, father_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Qualification / தகுதி</Label>
              <Input
                value={form.qualification}
                onChange={(e) => setForm(prev => ({ ...prev, qualification: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Photo / புகைப்படம்</Label>
              {form.photo_url ? (
                <div className="relative w-24 h-24">
                  <img src={form.photo_url} alt="Preview" className="w-full h-full rounded-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-6 w-6"
                    onClick={() => setForm(prev => ({ ...prev, photo_url: "" }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Input type="file" accept="image/*" onChange={handleFormPhotoUpload} disabled={saving} />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommitteeTab;
