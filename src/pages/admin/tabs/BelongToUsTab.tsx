import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Upload, X, GripVertical, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BelongItem {
  id: string;
  title: string;
  title_tamil: string | null;
  description: string | null;
  description_tamil: string | null;
  image_url: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

const BelongToUsTab = () => {
  const [items, setItems] = useState<BelongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BelongItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    title_tamil: "",
    description: "",
    description_tamil: "",
    image_url: "",
    is_active: true,
  });

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("belong_to_us_items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching items:", error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setFormData({ title: "", title_tamil: "", description: "", description_tamil: "", image_url: "", is_active: true });
    setEditingItem(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (item: BelongItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      title_tamil: item.title_tamil || "",
      description: item.description || "",
      description_tamil: item.description_tamil || "",
      image_url: item.image_url || "",
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
      const fileName = `belong-to-us/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("gallery").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("gallery").getPublicUrl(fileName);
      setFormData((prev) => ({ ...prev, image_url: publicUrl }));
      toast({ title: "Image uploaded" });
    } catch (error: any) {
      console.error("Belong to us upload error:", error?.message || error?.statusCode || JSON.stringify(error));
      toast({ title: "Upload failed", description: error?.message || "Could not upload image", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        title_tamil: formData.title_tamil.trim() || null,
        description: formData.description.trim() || null,
        description_tamil: formData.description_tamil.trim() || null,
        image_url: formData.image_url || null,
        is_active: formData.is_active,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("belong_to_us_items")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Item updated successfully" });
      } else {
        const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order || 0)) : 0;
        const { error } = await supabase
          .from("belong_to_us_items")
          .insert({ ...payload, sort_order: maxOrder + 1 });
        if (error) throw error;
        toast({ title: "Item added successfully" });
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
    if (!confirm("Are you sure you want to delete this item?")) return;
    const { error } = await supabase.from("belong_to_us_items").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Item deleted" });
      fetchItems();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("belong_to_us_items").update({ is_active: !current }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
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
          <h2 className="text-xl font-bold text-foreground">எங்களுக்கு பாத்தியப்பட்டவைகள்</h2>
          <p className="text-sm text-muted-foreground">Belong To Us - Manage items shown on the About page</p>
        </div>
        <Button type="button" onClick={openAdd} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No items added yet. Click "Add Item" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id} className={`${!item.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-4 flex gap-4 items-start">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      {item.title_tamil && (
                        <p className="text-sm text-muted-foreground font-tamil">{item.title_tamil}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={item.is_active ?? true}
                        onCheckedChange={() => toggleActive(item.id, item.is_active ?? true)}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && isUploading) return; setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onFocusOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => { if (isUploading) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item" : "Add New Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image</Label>
              {formData.image_url ? (
                <div className="relative">
                  <img src={formData.image_url} alt="Preview" className="w-full h-48 object-cover rounded-lg" loading="lazy" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => setFormData((p) => ({ ...p, image_url: "" }))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} className="hidden" id="belong-image-upload" />
                  <Label htmlFor="belong-image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{isUploading ? "Uploading..." : "Click to upload"}</span>
                  </Label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Title (English) *</Label>
              <Input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} placeholder="Enter title" required />
            </div>

            <div className="space-y-2">
              <Label>Title (Tamil)</Label>
              <Input value={formData.title_tamil} onChange={(e) => setFormData((p) => ({ ...p, title_tamil: e.target.value }))} placeholder="தலைப்பை உள்ளிடவும்" />
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
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting || isUploading}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BelongToUsTab;
