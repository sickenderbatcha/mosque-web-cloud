import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Upload, X, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TrusteeItem {
  id: string;
  name: string;
  name_tamil: string | null;
  description: string | null;
  description_tamil: string | null;
  photo_url: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

const ExManagingTrusteesTab = () => {
  const [items, setItems] = useState<TrusteeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TrusteeItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    name_tamil: "",
    description: "",
    description_tamil: "",
    photo_url: "",
    is_active: true,
  });

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ex_managing_trustees")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching trustees:", error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setFormData({ name: "", name_tamil: "", description: "", description_tamil: "", photo_url: "", is_active: true });
    setEditingItem(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (item: TrusteeItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      name_tamil: item.name_tamil || "",
      description: item.description || "",
      description_tamil: item.description_tamil || "",
      photo_url: item.photo_url || "",
      is_active: item.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `ex-trustees/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("gallery").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("gallery").getPublicUrl(fileName);
      setFormData((prev) => ({ ...prev, photo_url: publicUrl }));
      toast({ title: "Photo uploaded" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        name_tamil: formData.name_tamil.trim() || null,
        description: formData.description.trim() || null,
        description_tamil: formData.description_tamil.trim() || null,
        photo_url: formData.photo_url || null,
        is_active: formData.is_active,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("ex_managing_trustees")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Trustee updated successfully" });
      } else {
        const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order || 0)) : 0;
        const { error } = await supabase
          .from("ex_managing_trustees")
          .insert({ ...payload, sort_order: maxOrder + 1 });
        if (error) throw error;
        toast({ title: "Trustee added successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error) {
      console.error("Submit error:", error);
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trustee?")) return;
    const { error } = await supabase.from("ex_managing_trustees").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Trustee deleted" });
      fetchItems();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("ex_managing_trustees").update({ is_active: !current }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } else {
      fetchItems();
    }
  };

  const moveItem = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;

    const currentItem = items[index];
    const swapItem = items[swapIndex];

    const { error: e1 } = await supabase
      .from("ex_managing_trustees")
      .update({ sort_order: swapItem.sort_order })
      .eq("id", currentItem.id);
    const { error: e2 } = await supabase
      .from("ex_managing_trustees")
      .update({ sort_order: currentItem.sort_order })
      .eq("id", swapItem.id);

    if (e1 || e2) {
      toast({ title: "Failed to reorder", variant: "destructive" });
    } else {
      fetchItems();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">முன்னாள் நிர்வாகத் தலைவர்கள்</h2>
          <p className="text-sm text-muted-foreground">Ex Managing Trustees - Manage former trustees shown on the About page</p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Trustee
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No trustees added yet. Click "Add Trustee" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item, index) => (
            <Card key={item.id} className={`${!item.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-4 flex gap-4 items-start">
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => moveItem(index, "up")}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === items.length - 1} onClick={() => moveItem(index, "down")}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                {item.photo_url && (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      {item.name_tamil && (
                        <p className="text-sm text-muted-foreground font-tamil">{item.name_tamil}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={item.is_active ?? true}
                        onCheckedChange={() => toggleActive(item.id, item.is_active ?? true)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Trustee" : "Add New Trustee"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Photo</Label>
              {formData.photo_url ? (
                <div className="relative">
                  <img src={formData.photo_url} alt="Preview" className="w-full h-48 object-cover rounded-lg" loading="lazy" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => setFormData((p) => ({ ...p, photo_url: "" }))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} className="hidden" id="trustee-photo-upload" />
                  <Label htmlFor="trustee-photo-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{isUploading ? "Uploading..." : "Click to upload photo"}</span>
                  </Label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Name (English) *</Label>
              <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Enter name" required />
            </div>

            <div className="space-y-2">
              <Label>Name (Tamil)</Label>
              <Input value={formData.name_tamil} onChange={(e) => setFormData((p) => ({ ...p, name_tamil: e.target.value }))} placeholder="பெயரை உள்ளிடவும்" />
            </div>

            <div className="space-y-2">
              <Label>Description (English)</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="Enter description" rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Description (Tamil)</Label>
              <Textarea value={formData.description_tamil} onChange={(e) => setFormData((p) => ({ ...p, description_tamil: e.target.value }))} placeholder="விளக்கத்தை உள்ளிடவும்" rows={3} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData((p) => ({ ...p, is_active: v }))} />
              <Label>Active</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExManagingTrusteesTab;
