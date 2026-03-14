import { useState, useEffect } from "react";
import { Loader2, Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MahalPhoto {
  name: string;
  url: string;
}

const MahalPhotoManager = () => {
  const [photos, setPhotos] = useState<MahalPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("mahal-photos")
        .list("", { sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;

      const photoList = (data || [])
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((file) => ({
          name: file.name,
          url: supabase.storage.from("mahal-photos").getPublicUrl(file.name).data.publicUrl,
        }));

      setPhotos(photoList);
    } catch (error) {
      console.error("Error fetching mahal photos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `mahal-${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("mahal-photos")
        .upload(fileName, file);

      if (error) throw error;

      toast({ title: "Success", description: "Mahal photo uploaded successfully" });
      fetchPhotos();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: error.message || "Failed to upload photo", variant: "destructive" });
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from("mahal-photos")
        .remove([fileName]);

      if (error) throw error;

      toast({ title: "Deleted", description: "Photo removed successfully" });
      setPhotos((prev) => prev.filter((p) => p.name !== fileName));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete photo", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          <div>
            <h4 className="font-medium">Mahal Photos (மண்டப புகைப்படங்கள்)</h4>
            <p className="text-sm text-muted-foreground">
              Upload photos to display on the booking page
            </p>
          </div>
        </div>
        <div>
          <Input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
            id="mahal-photo-upload"
          />
          <Label htmlFor="mahal-photo-upload">
            <Button asChild variant="outline" size="sm" disabled={isUploading}>
              <span>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading ? "Uploading..." : "Upload Photo"}
              </span>
            </Button>
          </Label>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : photos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No photos uploaded yet. Upload photos to showcase the mahal on the booking page.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.name} className="relative group rounded-lg overflow-hidden border">
              <img
                src={photo.url}
                alt="Mahal"
                className="w-full h-24 sm:h-32 object-cover"
                loading="lazy"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(photo.name)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MahalPhotoManager;
