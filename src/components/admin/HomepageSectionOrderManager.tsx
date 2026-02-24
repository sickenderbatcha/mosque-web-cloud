import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, ArrowUp, ArrowDown, LayoutDashboard, Save, RotateCcw, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  HomepageSection, 
  DEFAULT_SECTIONS, 
  saveSectionOrder, 
  clearHomepageSectionOrderCache 
} from "@/hooks/useHomepageSectionOrder";

const HomepageSectionOrderManager = () => {
  const [sections, setSections] = useState<HomepageSection[]>(DEFAULT_SECTIONS);
  const [originalSections, setOriginalSections] = useState<HomepageSection[]>(DEFAULT_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSectionOrder();
  }, []);

  useEffect(() => {
    // Check if there are changes
    const changed = JSON.stringify(sections) !== JSON.stringify(originalSections);
    setHasChanges(changed);
  }, [sections, originalSections]);

  const fetchSectionOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "homepage_section_order")
        .single();

      if (data && !error) {
        try {
          const parsed = JSON.parse(data.value) as HomepageSection[];
          // Merge with defaults
          const mergedSections = DEFAULT_SECTIONS.map((defaultSection) => {
            const savedSection = parsed.find((s) => s.id === defaultSection.id);
            if (savedSection) {
              return { ...defaultSection, ...savedSection };
            }
            return defaultSection;
          });
          mergedSections.sort((a, b) => a.order - b.order);
          setSections(mergedSections);
          setOriginalSections(mergedSections);
        } catch {
          setSections(DEFAULT_SECTIONS);
          setOriginalSections(DEFAULT_SECTIONS);
        }
      } else {
        setSections(DEFAULT_SECTIONS);
        setOriginalSections(DEFAULT_SECTIONS);
      }
    } catch (error) {
      console.error("Error fetching section order:", error);
      setSections(DEFAULT_SECTIONS);
      setOriginalSections(DEFAULT_SECTIONS);
    } finally {
      setLoading(false);
    }
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    
    // Swap positions
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    // Update order values
    newSections.forEach((section, idx) => {
      section.order = idx;
    });
    
    setSections(newSections);
  };

  const toggleSection = (index: number) => {
    const newSections = [...sections];
    // Hero section cannot be disabled
    if (newSections[index].id === "hero") {
      toast({
        title: "Cannot disable Hero",
        description: "The Hero section is required and cannot be disabled.",
        variant: "destructive",
      });
      return;
    }
    newSections[index] = { ...newSections[index], enabled: !newSections[index].enabled };
    setSections(newSections);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveSectionOrder(sections);
      if (result.success) {
        setOriginalSections(sections);
        clearHomepageSectionOrderCache();
        toast({
          title: "Settings Saved",
          description: "Homepage section order has been updated. Refresh the homepage to see changes.",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save section order.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSections([...originalSections]);
  };

  const handleResetToDefault = async () => {
    setSaving(true);
    try {
      // Delete the setting to reset to defaults
      await supabase
        .from("app_settings")
        .delete()
        .eq("key", "homepage_section_order");
      
      clearHomepageSectionOrderCache();
      setSections(DEFAULT_SECTIONS);
      setOriginalSections(DEFAULT_SECTIONS);
      
      toast({
        title: "Reset Complete",
        description: "Homepage section order has been reset to defaults.",
      });
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset section order.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Homepage Section Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5" />
          Homepage Section Order (முகப்பு பிரிவு வரிசை)
        </CardTitle>
        <CardDescription>
          Arrange sections by moving them up or down. Toggle visibility for each section.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section List */}
        <div className="space-y-2">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                section.enabled ? "bg-card" : "bg-muted/50 opacity-60"
              }`}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{section.label}</span>
                  <span className="text-sm text-muted-foreground">({section.labelTamil})</span>
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center gap-2">
                {section.enabled ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch
                  checked={section.enabled}
                  onCheckedChange={() => toggleSection(index)}
                  disabled={section.id === "hero"}
                  aria-label={`Toggle ${section.label}`}
                />
              </div>

              {/* Move Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveSection(index, "up")}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveSection(index, "down")}
                  disabled={index === sections.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Discard Changes
          </Button>

          <Button
            variant="ghost"
            onClick={handleResetToDefault}
            disabled={saving}
            className="flex items-center gap-2 text-muted-foreground"
          >
            Reset to Default
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Note: The Hero section is always required and cannot be disabled or moved below other sections.
        </p>
      </CardContent>
    </Card>
  );
};

export default HomepageSectionOrderManager;
