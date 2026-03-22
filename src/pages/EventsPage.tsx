import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, ChevronRight, Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  title_tamil: string | null;
  description: string | null;
  description_tamil: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  is_featured: boolean | null;
  registration_required: boolean | null;
  max_participants: number | null;
}

const registrationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Phone must be 10 digits"),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
});

const EventsPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);

  const upcomingEvents = events.filter(
    (e) => new Date(e.event_date) > yesterday && e.status !== "cancelled"
  );
  const pastEvents = events.filter(
    (e) => new Date(e.event_date) <= yesterday || e.status === "cancelled"
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy");
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const openRegistrationDialog = (event: Event) => {
    setSelectedEvent(event);
    setFormData({
      name: user?.user_metadata?.full_name || "",
      phone: "",
      email: user?.email || "",
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleRegister = async () => {
    if (!selectedEvent) return;

    const result = registrationSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setRegistering(true);
    setErrors({});

    const { error } = await supabase.from("event_registrations").insert({
      event_id: selectedEvent.id,
      participant_name: formData.name.trim(),
      participant_phone: formData.phone.trim(),
      participant_email: formData.email.trim() || null,
      user_id: user?.id || null,
    });

    if (error) {
      console.error("Registration error:", error);
      toast.error("Registration failed. Please try again.");
    } else {
      toast.success("Registration successful!");
      setIsDialogOpen(false);
      setFormData({ name: "", phone: "", email: "" });
    }
    setRegistering(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Calendar className="h-16 w-16 mx-auto mb-4 text-secondary" />
            <h1 className="text-3xl md:text-5xl font-bold font-tamil text-primary-foreground mb-4">
              நிகழ்வுகள்
            </h1>
            <p className="text-primary-foreground/80 font-display text-xl">
              Events & Announcements
            </p>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-16 bg-background islamic-pattern">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground mb-4">
              வரவிருக்கும் நிகழ்வுகள்
            </h2>
            <p className="text-muted-foreground font-display">Upcoming Events</p>
            <div className="section-divider mt-6" />
          </motion.div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-tamil">தற்போது நிகழ்வுகள் இல்லை</p>
              <p className="text-sm text-muted-foreground">No upcoming events at the moment</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full shadow-medium hover:shadow-strong transition-shadow group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex gap-2 mb-2">
                            <Badge className="bg-secondary text-secondary-foreground">
                              {event.status === "ongoing" ? "நடைபெறுகிறது" : "வரவிருக்கிறது"}
                            </Badge>
                            {event.is_featured && (
                              <Badge variant="outline" className="border-primary text-primary">
                                சிறப்பு
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="font-tamil text-xl group-hover:text-primary transition-colors">
                            {event.title_tamil || event.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground font-display">
                            {event.title}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-tamil text-muted-foreground mb-4">
                        {event.description_tamil || event.description || "விவரம் இல்லை"}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{formatDate(event.event_date)}</span>
                        </div>
                        {event.start_time && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 text-primary" />
                            <span>
                              {formatTime(event.start_time)}
                              {event.end_time && ` - ${formatTime(event.end_time)}`}
                            </span>
                          </div>
                        )}
                        {event.venue && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-tamil">{event.venue}</span>
                          </div>
                        )}
                        {event.max_participants && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4 text-primary" />
                            <span>Max: {event.max_participants}</span>
                          </div>
                        )}
                      </div>
                      {event.registration_required && (
                        <Button
                          onClick={() => openRegistrationDialog(event)}
                          className="w-full"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          <span className="font-tamil">பதிவு செய்ய</span>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Past Events Section */}
      {pastEvents.length > 0 && (
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground mb-4">
                கடந்த நிகழ்வுகள்
              </h2>
              <p className="text-muted-foreground font-display">Past Events</p>
              <div className="section-divider mt-6" />
            </motion.div>

            <div className="max-w-3xl mx-auto">
              {pastEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="mb-4 bg-card/50 hover:bg-card transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-tamil font-semibold">
                            {event.title_tamil || event.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(event.event_date)}
                            </span>
                            {event.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.venue}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={event.status === "cancelled" ? "destructive" : "secondary"}
                          className="font-tamil"
                        >
                          {event.status === "cancelled" ? "ரத்து" : "முடிவடைந்தது"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Registration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-tamil">நிகழ்வு பதிவு</DialogTitle>
            <DialogDescription>
              {selectedEvent?.title_tamil || selectedEvent?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="font-tamil">
                பெயர் <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your name"
                maxLength={100}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone" className="font-tamil">
                தொலைபேசி எண் <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                }
                placeholder="10 digit phone number"
                maxLength={10}
              />
              {errors.phone && (
                <p className="text-sm text-destructive mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email" className="font-tamil">
                மின்னஞ்சல் (விரும்பினால்)
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                maxLength={255}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>
            <Button
              onClick={handleRegister}
              disabled={registering}
              className="w-full"
            >
              {registering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  பதிவு செய்கிறது...
                </>
              ) : (
                <span className="font-tamil">பதிவு செய்</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsPage;
