import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  addDays,
  getHijriMonthGregorianDays,
  getHijriParts,
  isSameHijriDay,
  startOfDay,
} from "@/lib/hijri";

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
  { en: "Muharram", tamil: "முஹர்ரம்" },
  { en: "Safar", tamil: "சஃபர்" },
  { en: "Rabi' al-Awwal", tamil: "ரபீஉல் அவ்வல்" },
  { en: "Rabi' al-Thani", tamil: "ரபீஉல் ஆஃகிர்" },
  { en: "Jumada al-Awwal", tamil: "ஜுமாதல் அவ்வல்" },
  { en: "Jumada al-Thani", tamil: "ஜுமாதல் ஆஃகிரா" },
  { en: "Rajab", tamil: "ரஜப்" },
  { en: "Sha'ban", tamil: "ஷஃபான்" },
  { en: "Ramadan", tamil: "ரமலான்" },
  { en: "Shawwal", tamil: "ஷவ்வால்" },
  { en: "Dhu al-Qi'dah", tamil: "துல்கஅதா" },
  { en: "Dhu al-Hijjah", tamil: "துல்ஹஜ்" },
];

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekDaysTamil = ["ஞா", "தி", "செ", "பு", "வி", "வெ", "ச"];

interface HijriCalendarGridProps {
  currentGregorianDate: Date;
}

type DayCell = {
  hijriDay: number;
  gregorianDate: Date;
  isToday: boolean;
  importantDate?: ImportantDate;
};

function getTypeDot(type: ImportantDate["type"]) {
  switch (type) {
    case "celebration":
      return "bg-secondary";
    case "fasting":
      return "bg-accent";
    case "holy":
      return "bg-primary";
  }
}

function getTypeCell(type: ImportantDate["type"]) {
  switch (type) {
    case "celebration":
      return "bg-secondary/10 border-secondary/30";
    case "fasting":
      return "bg-accent/10 border-accent/30";
    case "holy":
      return "bg-primary/10 border-primary/30";
  }
}

export default function HijriCalendarGrid({ currentGregorianDate }: HijriCalendarGridProps) {
  // We keep a pivot Gregorian date that is always inside the currently displayed Hijri month.
  const [pivotGregorianDate, setPivotGregorianDate] = useState<Date>(() => startOfDay(currentGregorianDate));

  useEffect(() => {
    setPivotGregorianDate(startOfDay(currentGregorianDate));
  }, [currentGregorianDate]);

  const todayHijri = useMemo(() => getHijriParts(currentGregorianDate), [currentGregorianDate]);
  const todayG = useMemo(() => startOfDay(currentGregorianDate), [currentGregorianDate]);

  const monthData = useMemo(() => getHijriMonthGregorianDays(pivotGregorianDate), [pivotGregorianDate]);
  const displayMonth = monthData.hijriMonth.month;
  const displayYear = monthData.hijriMonth.year;

  const firstDow = monthData.firstGregorianDate.getDay();

  const dayCells: (DayCell | null)[] = useMemo(() => {
    const cells: (DayCell | null)[] = [];

    // leading blanks
    for (let i = 0; i < firstDow; i++) cells.push(null);

    for (const d of monthData.days) {
      const importantDate = importantDates.find(
        (x) => x.hijriMonth === displayMonth && x.hijriDay === d.hijriDay
      );

      cells.push({
        hijriDay: d.hijriDay,
        gregorianDate: d.gregorianDate,
        isToday: isSameHijriDay(getHijriParts(d.gregorianDate), todayHijri),
        importantDate,
      });
    }

    // trailing blanks to complete weeks (nice grid)
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const toAdd = 7 - remainder;
      for (let i = 0; i < toAdd; i++) cells.push(null);
    }

    return cells;
  }, [displayMonth, firstDow, monthData.days, todayHijri]);

  const gregorianRange = useMemo(() => {
    const first = monthData.days[0]?.gregorianDate;
    const last = monthData.days[monthData.days.length - 1]?.gregorianDate;
    if (!first || !last) return "";

    const fmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
    const fmtNoYear = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

    const sameYear = first.getFullYear() === last.getFullYear();
    return sameYear
      ? `${fmtNoYear.format(first)} - ${fmt.format(last)}`
      : `${fmt.format(first)} - ${fmt.format(last)}`;
  }, [monthData.days]);

  const goToPreviousMonth = () => {
    // Step back ~29 days and then we will naturally render the Hijri month containing that date.
    setPivotGregorianDate((d) => addDays(d, -29));
  };

  const goToNextMonth = () => {
    setPivotGregorianDate((d) => addDays(d, 29));
  };

  const goToToday = () => {
    setPivotGregorianDate(todayG);
  };

  const monthImportantDates = useMemo(
    () => importantDates.filter((d) => d.hijriMonth === displayMonth),
    [displayMonth]
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            {hijriMonthNames[displayMonth - 1]?.tamil} {displayYear}
          </h3>
          <p className="text-sm text-muted-foreground">
            {hijriMonthNames[displayMonth - 1]?.en} • {gregorianRange}
          </p>
        </div>

        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {(displayMonth !== todayHijri.month || displayYear !== todayHijri.year) && (
        <div className="text-center mb-3">
          <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
            Go to Today
          </Button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "text-center text-xs font-medium py-1",
              index === 5 ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{weekDaysTamil[index]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayCells.map((day, idx) => (
          <div key={idx} className="aspect-square">
            {day ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "h-full w-full rounded-md border flex flex-col items-center justify-center relative cursor-default transition-colors",
                      day.isToday
                        ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30"
                        : day.importantDate
                          ? getTypeCell(day.importantDate.type)
                          : "border-border hover:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm sm:text-base font-semibold",
                        day.isToday ? "text-primary-foreground" : "text-foreground"
                      )}
                    >
                      {day.hijriDay}
                    </span>

                    <span
                      className={cn(
                        "text-[10px] sm:text-xs",
                        day.isToday ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {day.gregorianDate.getDate()}
                    </span>

                    {day.importantDate && (
                      <div
                        className={cn(
                          "absolute top-0.5 right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                          getTypeDot(day.importantDate.type)
                        )}
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p className="font-semibold">
                    {day.hijriDay} {hijriMonthNames[displayMonth - 1]?.en} {displayYear} AH
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {day.gregorianDate.toLocaleDateString("en-GB")}
                  </p>
                  {day.importantDate && (
                    <div className="mt-1 pt-1 border-t">
                      <p className="text-xs font-medium">{day.importantDate.nameTamil}</p>
                      <p className="text-xs text-muted-foreground">{day.importantDate.name}</p>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        ))}
      </div>

      {monthImportantDates.length > 0 && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-secondary" />
            <span className="text-sm font-medium">Important Days This Month</span>
          </div>
          <div className="space-y-1">
            {monthImportantDates.map((date) => (
              <div key={date.name} className="flex items-center gap-2 text-xs">
                <div className={cn("w-2 h-2 rounded-full", getTypeDot(date.type))} />
                <span className="font-medium">{date.hijriDay}</span>
                <span className="text-muted-foreground">-</span>
                <span className="font-tamil">{date.nameTamil}</span>
                <span className="text-muted-foreground">({date.name})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3 justify-center text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-secondary" />
          <span>கொண்டாட்டம்</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span>நோன்பு</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>புனித</span>
        </div>
      </div>
    </div>
  );
}

