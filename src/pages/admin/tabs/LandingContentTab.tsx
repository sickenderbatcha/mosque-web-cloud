import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, RotateCcw, Edit2, Check, X, Globe, Type } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MosquePhotoUpload from "@/components/admin/MosquePhotoUpload";


interface ContentItem {
  id: string;
  section: string;
  content_key: string;
  content_value: string;
  content_type: string;
  language: string;
  display_order: number;
  is_active: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  hero: "முகப்பு பேனர் (Hero Section)",
  about: "எங்களைப் பற்றி (About Section)",
  services: "சேவைகள் (Services Section)",
  cta: "செயல் அழைப்பு (CTA Section)",
  disclaimer: "பொறுப்புத் துறப்பு (Disclaimer)",
  about_hero: "பற்றி பேனர் (About Hero)",
  about_history: "வரலாறு (History)",
  about_mosques: "பள்ளிவாசல்கள் (Mosques)",
  about_wakf: "வக்ஃப் (Wakf Assets)",
  about_management: "நிர்வாகம் (Management)",
};

const CONTENT_KEY_LABELS: Record<string, string> = {
  greeting: "வாழ்த்து (Greeting)",
  title_line1: "தலைப்பு வரி 1",
  title_line2: "தலைப்பு வரி 2",
  subtitle: "உபதலைப்பு வரி 1 (Subtitle Line 1)",
  subtitle_line2: "உபதலைப்பு வரி 2 (Subtitle Line 2)",
  cta_primary: "முதன்மை பட்டன் (Primary Button)",
  cta_secondary: "இரண்டாம் பட்டன் (Secondary Button)",
  title: "தலைப்பு (Title)",
  paragraph1: "பத்தி 1 (Paragraph 1)",
  paragraph2: "பத்தி 2 (Paragraph 2)",
  stat_members: "உறுப்பினர் எண்ணிக்கை",
  stat_members_label: "உறுப்பினர் லேபிள்",
  stat_years: "ஆண்டுகள் எண்ணிக்கை",
  stat_years_label: "ஆண்டுகள் லேபிள்",
  stat_marriages: "திருமணங்கள் எண்ணிக்கை",
  stat_marriages_label: "திருமணங்கள் லேபிள்",
  mahal_title: "மஹால் தலைப்பு",
  mahal_subtitle: "மஹால் உபதலைப்பு",
  mahal_description: "மஹால் விளக்கம்",
  donation_title: "நன்கொடை தலைப்பு",
  donation_subtitle: "நன்கொடை உபதலைப்பு",
  donation_description: "நன்கொடை விளக்கம்",
  certificates_title: "சான்றிதழ் தலைப்பு",
  certificates_subtitle: "சான்றிதழ் உபதலைப்பு",
  certificates_description: "சான்றிதழ் விளக்கம்",
  events_title: "நிகழ்வுகள் தலைப்பு",
  events_subtitle: "நிகழ்வுகள் உபதலைப்பு",
  events_description: "நிகழ்வுகள் விளக்கம்",
  button_login: "உள்நுழை பட்டன்",
  button_grievance: "புகார் பட்டன்",
  // Disclaimer keys
  text: "உரை (Text)",
  // About page keys
  heading: "தலைப்பு (Heading)",
  heading_en: "தலைப்பு ஆங்கிலம் (Heading English)",
  description: "விளக்கம் (Description)",
  mosque1_title: "பள்ளி 1 தலைப்பு",
  mosque1_description: "பள்ளி 1 விளக்கம்",
  mosque2_title: "பள்ளி 2 தலைப்பு",
  mosque2_description: "பள்ளி 2 விளக்கம்",
  asset1: "சொத்து 1",
  asset2: "சொத்து 2",
  asset3: "சொத்து 3",
};

const LandingContentTab = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("landing_page_content")
        .select("*")
        .order("section")
        .order("display_order");

      if (error) throw error;
      setContent(data || []);
    } catch (error: any) {
      toast({
        title: "பிழை",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setEditValue(item.content_value);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSave = async (item: ContentItem) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("landing_page_content")
        .update({ content_value: editValue })
        .eq("id", item.id);

      if (error) throw error;

      setContent((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, content_value: editValue } : c))
      );
      // Realtime subscription will auto-refresh landing content
      setEditingId(null);
      setEditValue("");

      toast({
        title: "வெற்றி",
        description: "உள்ளடக்கம் சேமிக்கப்பட்டது",
      });
    } catch (error: any) {
      toast({
        title: "பிழை",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("இயல்புநிலைக்கு மீட்டமைக்க விரும்புகிறீர்களா? (Reset to default?)")) return;

    setIsSaving(true);
    try {
      // Delete all and re-insert defaults
      await supabase.from("landing_page_content").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Re-insert defaults via raw SQL migration would be better, but for now just refetch
      toast({
        title: "மீட்டமைப்பு",
        description: "இயல்புநிலை மதிப்புகளை மீட்டமைக்க மேம்படுத்தல் தேவை",
      });
      await fetchContent();
    } catch (error: any) {
      toast({
        title: "பிழை",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getSectionContent = (section: string) => {
    return content.filter((c) => c.section === section);
  };

  const renderContentItem = (item: ContentItem) => {
    const isEditing = editingId === item.id;
    const isLongText = item.content_value.length > 100;
    const label = CONTENT_KEY_LABELS[item.content_key] || item.content_key;

    return (
      <div
        key={item.id}
        className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow"
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Type className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{label}</span>
              <Badge variant="outline" className="text-xs">
                {item.language === "ta" ? "தமிழ்" : "English"}
              </Badge>
            </div>
            <code className="text-xs text-muted-foreground">{item.content_key}</code>
          </div>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(item)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            {isLongText ? (
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={4}
                className="font-tamil"
              />
            ) : (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="font-tamil"
              />
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleSave(item)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                சேமி
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
                ரத்து
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground font-tamil bg-muted/50 p-2 rounded">
            {item.content_value}
          </p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Landing Page Content
            </CardTitle>
            <CardDescription>
              முகப்பு பக்க உள்ளடக்கத்தை திருத்தவும் (Edit landing page content)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 mb-6">
            <TabsTrigger value="hero" className="text-xs">Hero</TabsTrigger>
            <TabsTrigger value="about" className="text-xs">About</TabsTrigger>
            <TabsTrigger value="services" className="text-xs">Services</TabsTrigger>
            <TabsTrigger value="cta" className="text-xs">CTA</TabsTrigger>
            <TabsTrigger value="disclaimer" className="text-xs">Disclaimer</TabsTrigger>
            <TabsTrigger value="about_hero" className="text-xs">About Hero</TabsTrigger>
            <TabsTrigger value="about_history" className="text-xs">History</TabsTrigger>
            <TabsTrigger value="about_mosques" className="text-xs">Mosques</TabsTrigger>
            <TabsTrigger value="about_wakf" className="text-xs">Wakf</TabsTrigger>
            <TabsTrigger value="about_management" className="text-xs">Management</TabsTrigger>
          </TabsList>

          {["hero", "about", "services", "cta", "disclaimer", "about_hero", "about_history", "about_mosques", "about_wakf", "about_management"].map((section) => (
            <TabsContent key={section} value={section}>
              <div className="mb-4">
                <h3 className="text-lg font-semibold font-tamil">
                  {SECTION_LABELS[section]}
                </h3>
              </div>
              {section === "about_mosques" && (
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <MosquePhotoUpload mosqueKey="mosque1" label="பள்ளிவாசல் 1 (Mosque 1)" />
                  <MosquePhotoUpload mosqueKey="mosque2" label="பள்ளிவாசல் 2 (Mosque 2)" />
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {getSectionContent(section).map(renderContentItem)}
              </div>
              {getSectionContent(section).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  இந்தப் பிரிவில் உள்ளடக்கம் இல்லை
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LandingContentTab;
