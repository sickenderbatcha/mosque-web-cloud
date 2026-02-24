import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, Clock, User, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { z } from "zod";

const grievanceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  details: z.string().min(10, "Details must be at least 10 characters").max(2000),
});

interface Grievance {
  id: string;
  ticket_number: string;
  complainant_name: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
}

const GrievancesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingGrievances, setLoadingGrievances] = useState(true);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    subject: "",
    details: "",
    category: "General",
  });

  const [showForm, setShowForm] = useState(false);

  const categories = [
    { value: "General", labelTamil: "பொது" },
    { value: "Maintenance", labelTamil: "பராமரிப்பு" },
    { value: "Services", labelTamil: "சேவைகள்" },
    { value: "Management", labelTamil: "நிர்வாகம்" },
    { value: "Other", labelTamil: "மற்றவை" },
  ];

  const generateTicketNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `GRV-${dateStr}-${random}`;
  };

  const fetchGrievances = async () => {
    if (!user) {
      setLoadingGrievances(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("grievances")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setGrievances(data || []);
    } catch (error) {
      console.error("Error fetching grievances:", error);
    } finally {
      setLoadingGrievances(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "உள்நுழைவு தேவை / Login Required",
        description: "Please login to submit a grievance.",
        variant: "destructive",
      });
      return;
    }

    // Validate
    const result = grievanceSchema.safeParse(formData);
    if (!result.success) {
      toast({
        title: "பிழை / Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const ticketNumber = generateTicketNumber();
      
      const { error } = await supabase.from("grievances").insert({
        user_id: user.id,
        ticket_number: ticketNumber,
        complainant_name: formData.name,
        complainant_phone: formData.phone,
        complainant_email: formData.email || null,
        subject: formData.subject,
        description: formData.details,
        category: formData.category,
        status: "pending",
      });

      if (error) throw error;

      // Send confirmation notification (email and/or SMS)
      supabase.functions.invoke("send-notification-email", {
        body: {
          type: "grievance_confirmation",
          email: formData.email || undefined,
          phone: formData.phone,
          recipientName: formData.name,
          data: {
            ticketNumber,
            subject: formData.subject,
            category: formData.category,
          },
        },
      }).catch(console.error);

      toast({
        title: "புகார் சமர்ப்பிக்கப்பட்டது / Grievance Submitted!",
        description: "Your grievance has been recorded. We will respond soon.",
      });

      // Reset form and refresh list
      setFormData({ name: "", phone: "", email: "", subject: "", details: "", category: "General" });
      setShowForm(false);
      fetchGrievances();
    } catch (error: any) {
      toast({
        title: "பிழை / Error",
        description: error.message || "Failed to submit grievance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ta-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge variant="default" className="font-tamil">தீர்க்கப்பட்டது</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="font-tamil bg-yellow-500/20 text-yellow-700">பரிசீலனையில்</Badge>;
      case "closed":
        return <Badge variant="outline" className="font-tamil">மூடப்பட்டது</Badge>;
      default:
        return <Badge variant="secondary" className="font-tamil">நிலுவையில்</Badge>;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-secondary" />
            <h1 className="text-3xl md:text-5xl font-bold font-tamil text-primary-foreground mb-4">
              புகார்கள்
            </h1>
            <p className="text-primary-foreground/80 font-display text-xl">
              Grievances - Share Your Concerns
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-background islamic-pattern">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-tamil">
                    புகார் சமர்ப்பிக்க{" "}
                    <Link to="/login" className="text-primary underline">
                      உள்நுழைக
                    </Link>{" "}
                    அல்லது{" "}
                    <Link to="/login" className="text-primary underline">
                      பதிவு செய்க
                    </Link>
                    . Please login or sign up to submit a grievance.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Submit Button */}
            {!showForm && user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <Button
                  onClick={() => setShowForm(true)}
                  variant="gold"
                  size="xl"
                  className="animate-pulse-glow"
                >
                  <Send className="h-5 w-5 mr-2" />
                  <span className="font-tamil">புகார் அளிக்க</span>
                </Button>
              </motion.div>
            )}

            {/* Submit Form */}
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <Card className="shadow-medium">
                  <CardHeader>
                    <CardTitle className="font-tamil text-xl">
                      புதிய புகார் சமர்ப்பிக்க
                    </CardTitle>
                    <CardDescription>
                      Submit a New Grievance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name" className="font-tamil">பெயர் *</Label>
                          <Input
                            id="name"
                            placeholder="Your Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone" className="font-tamil">தொலைபேசி எண் *</Label>
                          <Input
                            id="phone"
                            placeholder="Phone Number"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email" className="font-tamil">மின்னஞ்சல்</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Email (optional)"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="category" className="font-tamil">வகை</Label>
                          <select
                            id="category"
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          >
                            {categories.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.labelTamil} ({cat.value})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="subject" className="font-tamil">தலைப்பு *</Label>
                        <Input
                          id="subject"
                          placeholder="Subject of your grievance"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="details" className="font-tamil">புகார் விவரங்கள் *</Label>
                        <Textarea
                          id="details"
                          placeholder="Please describe your grievance in detail..."
                          rows={5}
                          value={formData.details}
                          onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                          required
                        />
                      </div>

                      <div className="flex gap-4">
                        <Button type="submit" variant="default" size="lg" disabled={loading}>
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              <span className="font-tamil">சமர்ப்பி</span>
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          onClick={() => setShowForm(false)}
                        >
                          <span className="font-tamil">ரத்துசெய்</span>
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Grievances List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold font-tamil text-foreground mb-2">
                  {user ? "உங்கள் புகார்கள்" : "சமீபத்திய புகார்கள்"}
                </h2>
                <p className="text-muted-foreground font-display">
                  {user ? "Your Grievances" : "Recent Grievances"}
                </p>
                <div className="section-divider mt-4" />
              </div>

              {loadingGrievances ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </div>
              ) : grievances.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-tamil text-muted-foreground">
                    {user ? "இதுவரை புகார்கள் இல்லை" : "உள்நுழைந்து உங்கள் புகார்களைக் காணுங்கள்"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {user ? "No grievances submitted yet" : "Login to view your grievances"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {grievances.map((grievance, index) => (
                    <motion.div
                      key={grievance.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="shadow-soft hover:shadow-medium transition-shadow">
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {grievance.ticket_number}
                                </Badge>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>{formatDate(grievance.created_at)}</span>
                                </div>
                              </div>
                              <h4 className="font-semibold text-foreground mb-1">
                                {grievance.subject}
                              </h4>
                              <p className="font-tamil text-muted-foreground text-sm line-clamp-2">
                                {grievance.description}
                              </p>
                            </div>
                            {getStatusBadge(grievance.status)}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GrievancesPage;
