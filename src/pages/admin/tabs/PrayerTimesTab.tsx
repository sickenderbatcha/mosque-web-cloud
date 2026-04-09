import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Save, Loader2, MapPin } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { upsertAppSetting } from "@/lib/appSettingsUtils";
import { toast } from "@/hooks/use-toast";

const PRAYER_KEYS = [
  "prayer_fajr",
  "prayer_dhuhr",
  "prayer_asr",
  "prayer_maghrib",
  "prayer_isha",
  "jumuah_time",
  "jumuah_khutbah_time",
  "prayer_times_source",
  "mosque_latitude",
  "mosque_longitude",
  "mosque_name",
] as const;

const PrayerTimesTab = () => {
  const { settings, isLoading } = useAppSettings([...PRAYER_KEYS]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    prayer_fajr: "",
    prayer_dhuhr: "",
    prayer_asr: "",
    prayer_maghrib: "",
    prayer_isha: "",
    jumuah_time: "",
    jumuah_khutbah_time: "",
    prayer_times_source: "manual",
    mosque_latitude: "",
    mosque_longitude: "",
    mosque_name: "",
  });

  useEffect(() => {
    if (!isLoading) {
      setForm({
        prayer_fajr: settings.prayer_fajr || "5:30 AM",
        prayer_dhuhr: settings.prayer_dhuhr || "12:30 PM",
        prayer_asr: settings.prayer_asr || "4:00 PM",
        prayer_maghrib: settings.prayer_maghrib || "6:30 PM",
        prayer_isha: settings.prayer_isha || "8:00 PM",
        jumuah_time: settings.jumuah_time || "1:00 PM",
        jumuah_khutbah_time: settings.jumuah_khutbah_time || "12:30 PM",
        prayer_times_source: settings.prayer_times_source || "manual",
        mosque_latitude: settings.mosque_latitude || "",
        mosque_longitude: settings.mosque_longitude || "",
        mosque_name: settings.mosque_name || "",
      });
    }
  }, [isLoading, settings]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(form);
      for (const [key, value] of entries) {
        await upsertAppSetting(key, value);
      }
      toast({ title: "Prayer Times Saved", description: "All prayer and Jumuah times have been updated successfully." });
    } catch (error: any) {
      console.error("Error saving prayer times:", error);
      toast({ title: "Save Failed", description: error.message || "Failed to save prayer times.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const prayerFields = [
    { key: "prayer_fajr", label: "ஃபஜ்ர் (Fajr)", icon: "🌅" },
    { key: "prayer_dhuhr", label: "ளுஹர் (Dhuhr)", icon: "☀️" },
    { key: "prayer_asr", label: "அஸர் (Asr)", icon: "🌤️" },
    { key: "prayer_maghrib", label: "மஃரிப் (Maghrib)", icon: "🌇" },
    { key: "prayer_isha", label: "இஷா (Isha)", icon: "🌙" },
  ];

  return (
    <div className="space-y-6">
      {/* Daily Prayer Times */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Daily Prayer Times / தினசரி தொழுகை நேரங்கள்
          </CardTitle>
          <CardDescription>
            Set the prayer times displayed on the homepage. Use format like "5:30 AM" or "12:30 PM".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prayerFields.map(({ key, label, icon }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="flex items-center gap-2">
                  <span>{icon}</span>
                  {label}
                </Label>
                <Input
                  id={key}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder="e.g. 5:30 AM"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Jumuah Times */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🕌 Jumuah Prayer Times / ஜுமுஆ தொழுகை நேரங்கள்
          </CardTitle>
          <CardDescription>
            Set the Jumuah (Friday) prayer and Khutbah times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jumuah_khutbah_time">Khutbah Time / குத்பா நேரம்</Label>
              <Input
                id="jumuah_khutbah_time"
                value={form.jumuah_khutbah_time}
                onChange={(e) => handleChange("jumuah_khutbah_time", e.target.value)}
                placeholder="e.g. 12:30 PM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jumuah_time">Jumuah Prayer Time / ஜுமுஆ தொழுகை நேரம்</Label>
              <Input
                id="jumuah_time"
                value={form.jumuah_time}
                onChange={(e) => handleChange("jumuah_time", e.target.value)}
                placeholder="e.g. 1:00 PM"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source & Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Prayer Times Source & Location
          </CardTitle>
          <CardDescription>
            Choose whether to use manually entered times or fetch from Aladhan API. Configure location for API mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Source / மூலம்</Label>
            <Select value={form.prayer_times_source} onValueChange={(v) => handleChange("prayer_times_source", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual (Admin enters times)</SelectItem>
                <SelectItem value="api">API (Aladhan - auto fetch)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mosque_name">Mosque Name / மசூதி பெயர்</Label>
            <Input
              id="mosque_name"
              value={form.mosque_name}
              onChange={(e) => handleChange("mosque_name", e.target.value)}
              placeholder="e.g. இளையான்குடி"
            />
          </div>

          {form.prayer_times_source === "api" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mosque_latitude">Latitude</Label>
                <Input
                  id="mosque_latitude"
                  value={form.mosque_latitude}
                  onChange={(e) => handleChange("mosque_latitude", e.target.value)}
                  placeholder="e.g. 9.5833"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mosque_longitude">Longitude</Label>
                <Input
                  id="mosque_longitude"
                  value={form.mosque_longitude}
                  onChange={(e) => handleChange("mosque_longitude", e.target.value)}
                  placeholder="e.g. 78.5333"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Prayer Times
        </Button>
      </div>
    </div>
  );
};

export default PrayerTimesTab;
