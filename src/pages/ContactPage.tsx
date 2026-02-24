import { useState } from "react";
import { MapPin, Phone, Mail, Globe, MessageCircle, Send, Clock } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().min(10, "Phone must be at least 10 digits").max(15, "Phone must be less than 15 digits"),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
});

const ContactPage = () => {
  const { settings } = useAppSettings([
    "mosque_contact_number",
    "whatsapp_number",
    "website_url",
    "admin_email",
    "mosque_name",
    "mosque_address",
    "mosque_address_english",
    "office_hours",
    "office_hours_english",
    "jumuah_time",
    "jumuah_khutbah_time",
  ]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleWhatsAppClick = () => {
    if (settings.whatsapp_number) {
      const cleanNumber = settings.whatsapp_number.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${cleanNumber}`, "_blank");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-form", {
        body: result.data,
      });

      if (error) throw error;

      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We will get back to you soon.",
      });
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-tamil text-primary-foreground mb-4">
            தொடர்பு கொள்ளுங்கள்
          </h1>
          <p className="text-lg text-primary-foreground/90 font-display">
            Contact Us
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-tamil text-xl">தொடர்பு தகவல்கள்</CardTitle>
                <CardDescription>Contact Information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <MapPin className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Address</h3>
                    <p className="text-muted-foreground font-tamil">
                      {settings.mosque_name || "இளையான்குடி நெசவுப் பட்டடை தொழுகை மேடைப் பள்ளிவாசல்"}
                    </p>
                    <p className="text-muted-foreground font-tamil text-sm">
                      {settings.mosque_address || "இளையான்குடி, சிவகங்கை மாவட்டம், தமிழ்நாடு"}
                    </p>
                  </div>
                </div>

                {settings.mosque_contact_number && (
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <Phone className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Phone</h3>
                      <a 
                        href={`tel:${settings.mosque_contact_number}`}
                        className="text-primary hover:underline"
                      >
                        {settings.mosque_contact_number}
                      </a>
                    </div>
                  </div>
                )}

                {settings.whatsapp_number && (
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <MessageCircle className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">WhatsApp</h3>
                      <button 
                        onClick={handleWhatsAppClick}
                        className="text-primary hover:underline"
                      >
                        {settings.whatsapp_number}
                      </button>
                    </div>
                  </div>
                )}

                {settings.admin_email && (
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <Mail className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <a 
                        href={`mailto:${settings.admin_email}`}
                        className="text-primary hover:underline"
                      >
                        {settings.admin_email}
                      </a>
                    </div>
                  </div>
                )}

                {settings.website_url && (
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <Globe className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Website</h3>
                      <a 
                        href={settings.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {settings.website_url.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <Clock className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Office Hours</h3>
                    <p className="text-muted-foreground font-tamil text-sm">
                      {settings.office_hours || "தினசரி - ஃபஜ்ர் முதல் இஷா வரை"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {settings.office_hours_english || "Daily - After Fajr to After Isha"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-secondary/10 rounded-lg border border-secondary/30">
                  <div className="h-6 w-6 text-secondary shrink-0 mt-1 flex items-center justify-center font-bold text-lg">🕌</div>
                  <div>
                    <h3 className="font-semibold mb-1 text-secondary">Jumu'ah Prayer</h3>
                    <p className="text-muted-foreground text-sm">
                      <span className="font-medium">Khutbah:</span> {settings.jumuah_khutbah_time || "12:00 PM"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      <span className="font-medium">Prayer:</span> {settings.jumuah_time || "12:30 PM"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick WhatsApp Button */}
            {settings.whatsapp_number && (
              <Button 
                onClick={handleWhatsAppClick}
                className="w-full gap-2"
                size="lg"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="font-tamil">வாட்ஸ்அப்பில் தொடர்பு கொள்ளுங்கள்</span>
              </Button>
            )}
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="font-tamil text-xl">செய்தி அனுப்புங்கள்</CardTitle>
              <CardDescription>Send us a message</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name / பெயர் *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email / மின்னஞ்சல் *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone / தொலைபேசி *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject / தலைப்பு *</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Enter subject"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message / செய்தி *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Enter your message"
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span className="font-tamil">அனுப்பு</span>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Map Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="font-tamil text-xl">இருப்பிடம்</CardTitle>
            <CardDescription>Location</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3932.7!2d78.5!3d9.8!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwNDgnMDAuMCJOIDc4wrAzMCcwMC4wIkU!5e0!3m2!1sen!2sin!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: "0.5rem", minHeight: "300px" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mosque Location"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContactPage;
