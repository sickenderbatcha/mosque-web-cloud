import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, Info, PartyPopper, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  title_tamil: string | null;
  content: string;
  content_tamil: string | null;
  type: string | null;
}

const typeConfig: Record<string, { icon: typeof Bell; bgClass: string; borderClass: string; textClass: string; label: string }> = {
  info: {
    icon: Info,
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    textClass: "text-blue-600",
    label: "தகவல்",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-yellow-500/10",
    borderClass: "border-yellow-500/30",
    textClass: "text-yellow-600",
    label: "எச்சரிக்கை",
  },
  urgent: {
    icon: Bell,
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/30",
    textClass: "text-red-600",
    label: "அவசரம்",
  },
  celebration: {
    icon: PartyPopper,
    bgClass: "bg-green-500/10",
    borderClass: "border-green-500/30",
    textClass: "text-green-600",
    label: "கொண்டாட்டம்",
  },
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, title_tamil, content, content_tamil, type")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const visibleAnnouncements = announcements.filter((a) => !dismissed.has(a.id));

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    if (currentIndex >= visibleAnnouncements.length - 1) {
      setCurrentIndex(Math.max(0, visibleAnnouncements.length - 2));
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? visibleAnnouncements.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === visibleAnnouncements.length - 1 ? 0 : prev + 1));
  };

  // Auto-rotate announcements
  useEffect(() => {
    if (visibleAnnouncements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === visibleAnnouncements.length - 1 ? 0 : prev + 1));
    }, 8000);

    return () => clearInterval(interval);
  }, [visibleAnnouncements.length]);

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  const currentAnnouncement = visibleAnnouncements[currentIndex];
  if (!currentAnnouncement) return null;

  const config = typeConfig[currentAnnouncement.type || "info"];
  const Icon = config.icon;

  return (
    <section className="py-4 bg-muted/30">
      <div className="container mx-auto px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAnnouncement.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`${config.bgClass} ${config.borderClass} border-2 relative overflow-hidden`}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 p-2 rounded-full ${config.bgClass}`}>
                    <Icon className={`h-5 w-5 ${config.textClass}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`${config.textClass} border-current text-xs`}>
                        {config.label}
                      </Badge>
                      {visibleAnnouncements.length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          {currentIndex + 1} / {visibleAnnouncements.length}
                        </span>
                      )}
                    </div>
                    
                    <h4 className={`font-bold font-tamil text-lg ${config.textClass}`}>
                      {currentAnnouncement.title_tamil || currentAnnouncement.title}
                    </h4>
                    
                    {currentAnnouncement.title_tamil && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {currentAnnouncement.title}
                      </p>
                    )}
                    
                    <p className="text-foreground/80 font-tamil mt-2">
                      {currentAnnouncement.content_tamil || currentAnnouncement.content}
                    </p>
                    
                    {currentAnnouncement.content_tamil && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentAnnouncement.content}
                      </p>
                    )}
                  </div>

                  {/* Navigation & Dismiss */}
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDismiss(currentAnnouncement.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    {visibleAnnouncements.length > 1 && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={goToPrevious}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={goToNext}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress dots */}
                {visibleAnnouncements.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-4">
                    {visibleAnnouncements.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentIndex
                            ? `w-6 ${config.textClass.replace("text-", "bg-")}`
                            : "w-1.5 bg-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Announcements;