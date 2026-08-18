import { useState } from "react";
import { Loader2, Upload, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SignedImg } from "@/components/SignedImage";

interface MarriagePhotoUploadProps {
  label: string;
  photoUrl: string;
  onPhotoChange: (url: string) => void;
  folder?: string;
}

export default function MarriagePhotoUpload({
  label,
  photoUrl,
  onPhotoChange,
  folder = "photos",
}: MarriagePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("படக் கோப்பை மட்டும் தேர்வு செய்யவும்");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("கோப்பு 5MB-க்கு குறைவாக இருக்க வேண்டும்");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("marriage-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("marriage-photos")
        .getPublicUrl(fileName);

      onPhotoChange(publicUrl);
      toast.success("புகைப்படம் பதிவேற்றப்பட்டது");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("பதிவேற்றம் தோல்வியடைந்தது");
    } finally {
      setIsUploading(false);
    }
  };

  const inputId = `photo-upload-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {photoUrl ? (
        <div className="relative w-32 h-40 rounded-lg overflow-hidden border border-border">
          <SignedImg
            src={photoUrl}
            alt={label}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={() => onPhotoChange("")}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="w-32 h-40 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            id={inputId}
          />
          <Label htmlFor={inputId} className="cursor-pointer flex flex-col items-center gap-1 p-2">
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <User className="h-6 w-6 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground text-center">
              {isUploading ? "பதிவேற்றுகிறது..." : "புகைப்படம் பதிவேற்று"}
            </span>
          </Label>
        </div>
      )}
    </div>
  );
}
