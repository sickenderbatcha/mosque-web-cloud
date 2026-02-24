import { useState, useEffect } from "react";
import { Clock, MapPin, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/hooks/useAppSettings";
import { toast } from "@/hooks/use-toast";

interface PrayerTime {
  name: string;
  nameEn: string;
  time: string;
}

interface PrayerTimesData {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

const PrayerTimes = () => {
  const { settings, isLoading: settingsLoading } = useAppSettings([
    "prayer_fajr",
    "prayer_dhuhr",
    "prayer_asr",
    "prayer_maghrib",
    "prayer_isha",
    "mosque_name",
    "prayer_times_source",
    "mosque_latitude",
    "mosque_longitude",
  ]);

  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([
    { name: "ஃபஜ்ர்", nameEn: "Fajr", time: "--:--" },
    { name: "ளுஹர்", nameEn: "Dhuhr", time: "--:--" },
    { name: "அஸர்", nameEn: "Asr", time: "--:--" },
    { name: "மஃரிப்", nameEn: "Maghrib", time: "--:--" },
    { name: "இஷா", nameEn: "Isha", time: "--:--" },
  ]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [source, setSource] = useState<"manual" | "api">("manual");

  const formatTime = (time24: string): string => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const fetchApiPrayerTimes = async () => {
    const latitude = parseFloat(settings.mosque_latitude) || 9.5833;
    const longitude = parseFloat(settings.mosque_longitude) || 78.5333;
    
    setLoading(true);
    try {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${latitude}&longitude=${longitude}&method=1`
      );

      if (!response.ok) throw new Error("Failed to fetch prayer times");

      const data = await response.json();
      const timings: PrayerTimesData = data.data.timings;

      setPrayerTimes([
        { name: "ஃபஜ்ர்", nameEn: "Fajr", time: formatTime(timings.Fajr) },
        { name: "ளுஹர்", nameEn: "Dhuhr", time: formatTime(timings.Dhuhr) },
        { name: "அஸர்", nameEn: "Asr", time: formatTime(timings.Asr) },
        { name: "மஃரிப்", nameEn: "Maghrib", time: formatTime(timings.Maghrib) },
        { name: "இஷா", nameEn: "Isha", time: formatTime(timings.Isha) },
      ]);

      setLastUpdated(new Date());
      toast({
        title: "Prayer Times Updated",
        description: "Fetched latest times from Aladhan API.",
      });
    } catch (error) {
      console.error("Error fetching prayer times:", error);
      toast({
        title: "API Error",
        description: "Failed to fetch prayer times. Using manual times.",
        variant: "destructive",
      });
      // Fallback to manual times on error
      setManualPrayerTimes();
    } finally {
      setLoading(false);
    }
  };

  const setManualPrayerTimes = () => {
    setPrayerTimes([
      { name: "ஃபஜ்ர்", nameEn: "Fajr", time: settings.prayer_fajr || "5:30 AM" },
      { name: "ளுஹர்", nameEn: "Dhuhr", time: settings.prayer_dhuhr || "12:30 PM" },
      { name: "அஸர்", nameEn: "Asr", time: settings.prayer_asr || "4:00 PM" },
      { name: "மஃரிப்", nameEn: "Maghrib", time: settings.prayer_maghrib || "6:30 PM" },
      { name: "இஷா", nameEn: "Isha", time: settings.prayer_isha || "8:00 PM" },
    ]);
  };

  const handleRefresh = () => {
    if (source === "api") {
      fetchApiPrayerTimes();
    } else {
      setManualPrayerTimes();
      toast({
        title: "Prayer Times Refreshed",
        description: "Using manually configured times.",
      });
    }
  };

  useEffect(() => {
    if (!settingsLoading) {
      const configuredSource = settings.prayer_times_source === "api" ? "api" : "manual";
      setSource(configuredSource);

      if (configuredSource === "api") {
        fetchApiPrayerTimes();
      } else {
        setManualPrayerTimes();
      }
    }
  }, [settingsLoading, settings]);

  const isLoading = settingsLoading || loading;

  return (
    <section className="py-8 bg-primary">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-primary-foreground">
              <Clock className="h-5 w-5 text-secondary" />
              <span className="font-tamil font-semibold">தொழுகை நேரங்கள்:</span>
            </div>
            
            <div className="flex items-center gap-1 text-primary-foreground/70 text-sm">
              <MapPin className="h-4 w-4" />
              <span className="font-tamil truncate max-w-[200px]">
                {settings.mosque_name || "இளையான்குடி"}
              </span>
            </div>

            {source === "api" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 h-8 px-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Prayer Times Row */}
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
            {prayerTimes.map((prayer, index) => (
              <motion.div
                key={prayer.nameEn}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 text-primary-foreground/90 bg-primary-foreground/5 px-3 py-2 rounded-lg"
              >
                <div className="text-center">
                  <span className="font-tamil block text-sm">{prayer.name}</span>
                  <span className="text-xs text-primary-foreground/60">{prayer.nameEn}</span>
                </div>
                <span className="text-secondary font-bold text-lg">
                  {isLoading ? (
                    <span className="inline-block w-16 h-5 bg-primary-foreground/10 animate-pulse rounded" />
                  ) : (
                    prayer.time
                  )}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Info text */}
          <p className="text-center text-primary-foreground/50 text-xs font-tamil">
            {source === "api" ? (
              <>
                API நேரங்கள் • Aladhan API
                {lastUpdated && (
                  <span className="ml-2">
                    (Updated: {lastUpdated.toLocaleTimeString()})
                  </span>
                )}
              </>
            ) : (
              <>மசூதி நேரங்கள் • Mosque Prayer Times</>
            )}
          </p>
        </div>
      </div>
    </section>
  );
};

export default PrayerTimes;
