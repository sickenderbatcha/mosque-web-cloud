import { useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Moon, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import HijriCalendarGrid from "./HijriCalendarGrid";
import { diffDays, findNextHijriOccurrence, getHijriParts } from "@/lib/hijri";

interface ImportantDate {
  name: string;
  nameTamil: string;
  hijriMonth: number;
  hijriDay: number;
  type: "celebration" | "fasting" | "holy";
}

const importantDates: ImportantDate[] = [
  { name: "Islamic New Year", nameTamil: "இஸ்லாமிய புத்தாண்டு", hijriMonth: 1, hijriDay: 1, type: "celebration" },
  { name: "Ashura", nameTamil: "ஆஷுரா", hijriMonth: 1, hijriDay: 10, type: "fasting" },
  { name: "Mawlid al-Nabi", nameTamil: "மீலாத் அன்-நபி", hijriMonth: 3, hijriDay: 12, type: "celebration" },
  { name: "Isra and Mi'raj", nameTamil: "இஸ்ரா மிஃராஜ்", hijriMonth: 7, hijriDay: 27, type: "holy" },
  { name: "Shab-e-Barat", nameTamil: "ஷப்-எ-பராத்", hijriMonth: 8, hijriDay: 15, type: "holy" },
  { name: "Ramadan Begins", nameTamil: "ரமலான் தொடக்கம்", hijriMonth: 9, hijriDay: 1, type: "fasting" },
  { name: "Laylat al-Qadr", nameTamil: "லைலத்துல் கத்ர்", hijriMonth: 9, hijriDay: 27, type: "holy" },
  { name: "Eid ul-Fitr", nameTamil: "ஈத் அல்-ஃபித்ர்", hijriMonth: 10, hijriDay: 1, type: "celebration" },
  { name: "Eid ul-Adha", nameTamil: "ஈத் அல்-அத்ஹா", hijriMonth: 12, hijriDay: 10, type: "celebration" },
];

const hijriMonthNames = [
  { en: "Muharram", ar: "محرم", tamil: "முஹர்ரம்" },
  { en: "Safar", ar: "صفر", tamil: "சஃபர்" },
  { en: "Rabi' al-Awwal", ar: "ربيع الأول", tamil: "ரபீஉல் அவ்வல்" },
  { en: "Rabi' al-Thani", ar: "ربيع الثاني", tamil: "ரபீஉல் ஆஃகிர்" },
  { en: "Jumada al-Awwal", ar: "جمادى الأولى", tamil: "ஜுமாதல் அவ்வல்" },
  { en: "Jumada al-Thani", ar: "جمادى الثانية", tamil: "ஜுமாதல் ஆஃகிரா" },
  { en: "Rajab", ar: "رجب", tamil: "ரஜப்" },
  { en: "Sha'ban", ar: "شعبان", tamil: "ஷஃபான்" },
  { en: "Ramadan", ar: "رمضان", tamil: "ரமலான்" },
  { en: "Shawwal", ar: "شوال", tamil: "ஷவ்வால்" },
  { en: "Dhu al-Qi'dah", ar: "ذو القعدة", tamil: "துல்கஅதா" },
  { en: "Dhu al-Hijjah", ar: "ذو الحجة", tamil: "துல்ஹஜ்" },
];

function getTypeStyles(type: ImportantDate["type"]) {
  // Map categories to existing semantic tokens
  switch (type) {
    case "celebration":
      return "bg-secondary/10 text-secondary border-secondary/30";
    case "fasting":
      return "bg-accent/10 text-accent border-accent/30";
    case "holy":
      return "bg-primary/10 text-primary border-primary/30";
  }
}

function getTypeLabel(type: ImportantDate["type"]) {
  switch (type) {
    case "celebration":
      return "கொண்டாட்டம்";
    case "fasting":
      return "நோன்பு";
    case "holy":
      return "புனித";
  }
}

export default function IslamicCalendar() {
  const today = useMemo(() => new Date(), []);
  const hijriToday = useMemo(() => getHijriParts(today), [today]);

  const upcomingDates = useMemo(() => {
    const upcoming = importantDates
      .map((d) => {
        const next = findNextHijriOccurrence({
          from: today,
          hijriMonth: d.hijriMonth,
          hijriDay: d.hijriDay,
        });

        const daysUntil = next ? diffDays(today, next) : 9999;
        return { ...d, daysUntil };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 4);

    return upcoming;
  }, [today]);

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="w-full min-w-0 overflow-x-hidden"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Moon className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Hijri Calendar</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground">இஸ்லாமிய நாட்காட்டி</h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="bg-primary/20 rounded-xl p-3 shrink-0">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Today</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-bold text-primary">{hijriToday.day}</span>
                    <span className="text-lg font-semibold text-foreground">
                      {hijriMonthNames[hijriToday.month - 1]?.tamil}
                    </span>
                    <span className="text-lg text-muted-foreground">{hijriToday.year} AH</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {hijriMonthNames[hijriToday.month - 1]?.en}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2 min-w-0 overflow-x-hidden w-full"
          >
            <Card className="h-full overflow-x-hidden w-full">
              <CardContent className="p-4 sm:p-6 overflow-x-hidden">
                <HijriCalendarGrid currentGregorianDate={today} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="min-w-0 overflow-x-hidden w-full"
          >
            <Card className="h-full overflow-x-hidden w-full">
              <CardContent className="p-4 sm:p-6 overflow-x-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 text-secondary shrink-0" />
                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">வரவிருக்கும் முக்கிய நாட்கள்</h3>
                </div>

                <div className="space-y-3">
                  {upcomingDates.map((date, index) => (
                    <motion.div
                      key={date.name}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-2 sm:p-3 rounded-lg border overflow-x-hidden ${getTypeStyles(date.type)}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="font-semibold font-tamil text-sm sm:text-base truncate">{date.nameTamil}</p>
                          <p className="text-xs sm:text-sm opacity-80 truncate">{date.name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {getTypeLabel(date.type)}
                          </Badge>
                          <p className="text-xs mt-1 opacity-70 whitespace-nowrap">
                            {date.daysUntil === 0
                              ? "Today!"
                              : date.daysUntil === 1
                                ? "Tomorrow"
                                : `~${date.daysUntil} days`}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
