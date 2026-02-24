import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isBefore, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface BookedDate {
  event_date: string;
  event_type: string;
  status: string;
}

interface AvailabilityCalendarProps {
  onDateSelect?: (date: Date) => void;
  selectedDate?: string;
  refreshKey?: number;
  isAdmin?: boolean;
}

const AvailabilityCalendar = ({ onDateSelect, selectedDate, refreshKey, isAdmin }: AvailabilityCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookedDates, setBookedDates] = useState<BookedDate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookedDates();
  }, [currentMonth, refreshKey]);

  const fetchBookedDates = async () => {
    setLoading(true);
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(addMonths(currentMonth, 2)); // Fetch 3 months ahead

    // Use security-definer function for public availability data
    const { data, error } = await supabase.rpc("get_mahal_availability", {
      _start: format(start, "yyyy-MM-dd"),
      _end: format(end, "yyyy-MM-dd"),
    });

    if (!error && data) {
      setBookedDates(data);
    }
    setLoading(false);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getDateStatus = (date: Date): "available" | "booked" | "pending" | "past" | "multiple" => {
    if (isBefore(date, startOfDay(new Date()))) {
      return "past";
    }
    
    const dateStr = format(date, "yyyy-MM-dd");
    const bookingsForDate = bookedDates.filter(b => b.event_date === dateStr);
    
    if (bookingsForDate.length > 1) {
      return "multiple";
    }
    
    if (bookingsForDate.length === 1) {
      return bookingsForDate[0].status === "approved" ? "booked" : "pending";
    }
    return "available";
  };

  // For admins, booked/pending dates are clickable (shown as override)
  const isDateClickable = (status: "available" | "booked" | "pending" | "past" | "multiple") => {
    if (status === "available") return true;
    if (isAdmin && (status === "booked" || status === "pending" || status === "multiple")) return true;
    return false;
  };

  const getDateStyles = (status: "available" | "booked" | "pending" | "past" | "multiple", isSelected: boolean) => {
    const base =
      "relative h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all cursor-pointer";

    if (isSelected) {
      return cn(base, "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2");
    }

    switch (status) {
      case "multiple":
        return cn(base, isAdmin
          ? "bg-orange-500/30 text-orange-800 dark:text-orange-300 hover:bg-orange-500/40 cursor-pointer border-2 border-orange-500 ring-1 ring-orange-400/50"
          : "bg-orange-500/30 text-orange-800 dark:text-orange-300 cursor-not-allowed border-2 border-orange-500");
      case "booked":
        return cn(base, isAdmin 
          ? "bg-destructive/20 text-destructive hover:bg-orange-500/30 hover:text-orange-700 cursor-pointer border border-dashed border-orange-400" 
          : "bg-destructive/20 text-destructive cursor-not-allowed");
      case "pending":
        return cn(base, isAdmin 
          ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-orange-500/30 hover:text-orange-700 cursor-pointer border border-dashed border-orange-400" 
          : "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 cursor-not-allowed");
      case "past":
        return cn(base, "text-muted-foreground/40 cursor-not-allowed");
      default:
        return cn(base, "hover:bg-primary/10 text-foreground");
    }
  };

  const handleDateClick = (date: Date) => {
    const status = getDateStatus(date);
    if (isDateClickable(status) && onDateSelect) {
      onDateSelect(date);
    }
  };

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  return (
    <Card className="shadow-medium">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-tamil text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            கிடைக்கும் நாட்கள்
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[96px] sm:min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="h-7 sm:h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the first day of month */}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`empty-${index}`} className="h-8 sm:h-10" />
              ))}

              {/* Actual days */}
              {days.map((day) => {
                const status = getDateStatus(day);
                const isSelected = selectedDate === format(day, "yyyy-MM-dd");
                const dayIsToday = isToday(day);
                const dateStr = format(day, "yyyy-MM-dd");
                const bookingsForDay = bookedDates.filter(b => b.event_date === dateStr);

                const dateButton = (
                  <motion.button
                    key={day.toISOString()}
                    type="button"
                    whileHover={isDateClickable(status) ? { scale: 1.1 } : {}}
                    whileTap={isDateClickable(status) ? { scale: 0.95 } : {}}
                    className={getDateStyles(status, isSelected)}
                    onClick={() => handleDateClick(day)}
                    disabled={!isDateClickable(status)}
                    title={
                      status === "multiple"
                        ? (isAdmin ? "Multiple bookings - Admin can add more" : "Multiple bookings")
                        : status === "booked"
                        ? (isAdmin ? "Booked - Admin can override" : "Booked")
                        : status === "pending"
                        ? (isAdmin ? "Pending - Admin can override" : "Pending approval")
                        : status === "past"
                        ? "Past date"
                        : "Available"
                    }
                  >
                    {format(day, "d")}
                    {dayIsToday && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                    {status === "multiple" && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 flex items-center justify-center text-[6px] text-white font-bold">
                        {bookingsForDay.length}
                      </span>
                    )}
                    {status === "booked" && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />
                    )}
                    {status === "pending" && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-500" />
                    )}
                  </motion.button>
                );

                if (status === "multiple") {
                  return (
                    <HoverCard key={day.toISOString()} openDelay={200} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        {dateButton}
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto min-w-[180px] p-3" side="top" align="center">
                        <p className="text-xs font-semibold mb-2">
                          {format(day, "MMM d, yyyy")} — {bookingsForDay.length} Bookings
                        </p>
                        <div className="space-y-1.5">
                          {bookingsForDay.map((b, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  b.status === "approved" ? "bg-destructive" : "bg-yellow-500"
                                )}
                              />
                              <span className="truncate">{b.event_type}</span>
                              <Badge
                                variant={b.status === "approved" ? "default" : "secondary"}
                                className="text-[10px] px-1 py-0 h-4 ml-auto"
                              >
                                {b.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                }

                return dateButton;
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary/20 border border-primary" />
                <span className="text-muted-foreground font-tamil">கிடைக்கும்</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/20 border border-destructive" />
                <span className="text-muted-foreground font-tamil">முன்பதிவு செய்யப்பட்டது</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500" />
                <span className="text-muted-foreground font-tamil">நிலுவையில்</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500/30 border-2 border-orange-500" />
                <span className="text-muted-foreground font-tamil">பல முன்பதிவுகள்</span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500/20 border border-dashed border-orange-500" />
                  <span className="text-muted-foreground font-tamil">நிர்வாகி மேலெழுதல்</span>
                </div>
              )}
            </div>

            {/* Upcoming booked dates */}
            {bookedDates.filter(b => b.status === "approved").length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Upcoming Booked Dates:
                </p>
                <div className="flex flex-wrap gap-2">
                  {bookedDates
                    .filter(b => b.status === "approved" && !isBefore(new Date(b.event_date), startOfDay(new Date())))
                    .slice(0, 5)
                    .map((booking, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {format(new Date(booking.event_date), "MMM d")} - {booking.event_type}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailabilityCalendar;
