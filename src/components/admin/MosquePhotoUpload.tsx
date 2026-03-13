import { useState, useEffect } from "react";
import { Loader2, Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MosquePhotoUploadProps {
  mosqueKey: string;
  label: string;
}

const MosquePhotoUpload = ({ mosqueKey, label }: MosquePhotoUploadProps) => {
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const settingKey = `${mosqueKey}_photo_url`;

  useEffect(() => {
    const fetchPhoto = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", settingKey)
        .maybeSingle();
      if (data?.value) setPhotoUrl(data.value);
      setIsLoading(false);
    };
    fetchPhoto();
  }, [settingKey]);

  const savePhotoUrl = async (url: string) => {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: settingKey, value: url, description: `${label} photo URL` }, { onConflict: "key" });

    if (error) {
      toast.error("சேமிப்பில் பிழை");
      return;
    }
    setPhotoUrl(url);
    toast.success("புகைப்படம் சேமிக்கப்பட்டது");
  };

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
      const fileName = `mosque-photos/${mosqueKey}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("gallery")
        .getPublicUrl(fileName);

      await savePhotoUrl(publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("பதிவேற்றம் தோல்வியடைந்தது");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    await savePhotoUrl("");
  };

  const inputId = `mosque-photo-${mosqueKey}`;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Image className="h-4 w-4" />
          {label} - புகைப்படம்
        </CardTitle>
      </CardHeader>
      <CardContent>
        {photoUrl ? (
          <div className="relative">
            <img
              src={photoUrl}
              alt={label}
              className="w-full h-48 object-cover rounded-lg"
              loading="lazy"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id={inputId}
            />
            <Label htmlFor={inputId} className="cursor-pointer flex flex-col items-center gap-2">
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {isUploading ? "பதிவேற்றுகிறது..." : "புகைப்படம் பதிவேற்று"}
              </span>
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MosquePhotoUpload;
