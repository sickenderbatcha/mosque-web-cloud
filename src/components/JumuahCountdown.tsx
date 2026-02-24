import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSettings } from "@/hooks/useAppSettings";

const JumuahCountdown = () => {
  const { settings, isLoading } = useAppSettings(["jumuah_time"]);
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isJumuahDay, setIsJumuahDay] = useState(false);
  const [isJumuahTime, setIsJumuahTime] = useState(false);

  // Parse Jumu'ah time from settings (format: "12:30 PM" or "1:00 PM")
  const { jumuahHour, jumuahMinute, displayTime } = useMemo(() => {
    const timeStr = settings.jumuah_time || "1:00 PM";
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    
    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const period = match[3]?.toUpperCase();
      
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      
      return { jumuahHour: hour, jumuahMinute: minute, displayTime: timeStr };
    }
    
    return { jumuahHour: 13, jumuahMinute: 0, displayTime: "1:00 PM" };
  }, [settings.jumuah_time]);

  const getNextJumuah = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 5 = Friday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let daysUntilFriday = (5 - currentDay + 7) % 7;
    
    // If it's Friday
    if (currentDay === 5) {
      // If Jumu'ah hasn't happened yet today
      if (currentHour < jumuahHour || (currentHour === jumuahHour && currentMinute < jumuahMinute)) {
        daysUntilFriday = 0;
      } else {
        // Jumu'ah already passed, next Friday
        daysUntilFriday = 7;
      }
    }

    const nextJumuah = new Date(now);
    nextJumuah.setDate(now.getDate() + daysUntilFriday);
    nextJumuah.setHours(jumuahHour, jumuahMinute, 0, 0);

    return nextJumuah;
  };

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextJumuah = getNextJumuah();
      const diff = nextJumuah.getTime() - now.getTime();

      // Check if it's Friday
      const isFriday = now.getDay() === 5;
      setIsJumuahDay(isFriday);

      // Check if it's currently Jumu'ah time (during the prayer hour on Friday)
      const currentHour = now.getHours();
      setIsJumuahTime(isFriday && currentHour >= jumuahHour && currentHour < jumuahHour + 1);

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    if (!isLoading) {
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [isLoading, jumuahHour, jumuahMinute]);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  return (
    <section className="py-8 bg-gradient-to-r from-primary via-primary/95 to-primary">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left side - Title and info */}
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-secondary" />
                    <span className="text-secondary font-medium text-sm">
                      {isJumuahDay ? "Today is Friday!" : "Every Friday"}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold font-tamil text-primary-foreground mb-1">
                    ஜுமுஆ தொழுகை
                  </h3>
                  <p className="text-primary-foreground/80 font-display">
                    Jumu'ah Prayer - {displayTime}
                  </p>
                  {isJumuahTime && (
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="mt-3 inline-flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-2 rounded-full"
                    >
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                      </span>
                      <span className="font-tamil font-semibold">தொழுகை நேரம்!</span>
                    </motion.div>
                  )}
                </div>

                {/* Right side - Countdown */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
                  <div className="text-center">
                    <div className="bg-primary-foreground/20 rounded-xl px-3 sm:px-4 py-2 sm:py-3 min-w-[52px] sm:min-w-[60px] md:min-w-[70px]">
                      <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground font-mono">
                        {formatNumber(timeLeft.days)}
                      </span>
                    </div>
                    <p className="text-xs text-primary-foreground/70 mt-1 font-tamil">நாட்கள்</p>
                  </div>

                  <span className="text-xl sm:text-2xl text-primary-foreground/50 font-bold">:</span>

                  <div className="text-center">
                    <div className="bg-primary-foreground/20 rounded-xl px-3 sm:px-4 py-2 sm:py-3 min-w-[52px] sm:min-w-[60px] md:min-w-[70px]">
                      <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground font-mono">
                        {formatNumber(timeLeft.hours)}
                      </span>
                    </div>
                    <p className="text-xs text-primary-foreground/70 mt-1 font-tamil">மணி</p>
                  </div>

                  <span className="text-xl sm:text-2xl text-primary-foreground/50 font-bold">:</span>

                  <div className="text-center">
                    <div className="bg-primary-foreground/20 rounded-xl px-3 sm:px-4 py-2 sm:py-3 min-w-[52px] sm:min-w-[60px] md:min-w-[70px]">
                      <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground font-mono">
                        {formatNumber(timeLeft.minutes)}
                      </span>
                    </div>
                    <p className="text-xs text-primary-foreground/70 mt-1 font-tamil">நிமிடம்</p>
                  </div>

                  <span className="text-xl sm:text-2xl text-primary-foreground/50 font-bold">:</span>

                  <div className="text-center">
                    <motion.div
                      key={timeLeft.seconds}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className="bg-secondary/30 rounded-xl px-3 sm:px-4 py-2 sm:py-3 min-w-[52px] sm:min-w-[60px] md:min-w-[70px]"
                    >
                      <span className="text-xl sm:text-2xl md:text-3xl font-bold text-secondary font-mono">
                        {formatNumber(timeLeft.seconds)}
                      </span>
                    </motion.div>
                    <p className="text-xs text-primary-foreground/70 mt-1 font-tamil">விநாடி</p>
                  </div>
                </div>
              </div>

              {/* Bottom message for Friday */}
              {isJumuahDay && !isJumuahTime && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 pt-4 border-t border-primary-foreground/20 text-center"
                >
                  <p className="text-primary-foreground/90 font-tamil">
                    🕌 இன்று வெள்ளிக்கிழமை! ஜுமுஆ தொழுகைக்கு வருக
                  </p>
                  <p className="text-primary-foreground/70 text-sm mt-1">
                    Join us for Jumu'ah prayers today at the mosque
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default JumuahCountdown;