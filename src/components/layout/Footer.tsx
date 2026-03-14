import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Globe, MessageCircle, Languages } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useLandingContent } from "@/hooks/useLandingContent";
import { Button } from "@/components/ui/button";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { content } = useLandingContent();
  const [disclaimerLang, setDisclaimerLang] = useState<"ta" | "en">("ta");

  // Disclaimer content for both languages
  const disclaimerContent = {
    ta: {
      title: content.disclaimer?.title || "பொறுப்புத் துறப்பு",
      text: content.disclaimer?.text || "இந்த இணையதளத்தில் வழங்கப்படும் தகவல்கள் பொது தகவல் நோக்கங்களுக்காக மட்டுமே.",
    },
    en: {
      title: content.disclaimer?.title_en || "Disclaimer",
      text: content.disclaimer?.text_en || "The information provided on this website is for general informational purposes only.",
    },
  };
  const { settings } = useAppSettings([
    "mosque_contact_number",
    "whatsapp_number",
    "website_url",
    "admin_email",
    "mosque_name",
    "mosque_name_english",
    "mosque_address",
    "footer_credit_text",
    "footer_credit_thumbnail",
    // Prayer times (manual settings)
    "prayer_fajr",
    "prayer_dhuhr",
    "prayer_asr",
    "prayer_maghrib",
    "prayer_isha",
  ]);

  const handleWhatsAppClick = () => {
    if (settings.whatsapp_number) {
      const cleanNumber = settings.whatsapp_number.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${cleanNumber}`, "_blank");
    }
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-tamil text-lg font-semibold mb-4 text-secondary">
              எங்களைப் பற்றி
            </h3>
            <p className="font-tamil text-sm leading-relaxed opacity-90">
              {settings.mosque_name || "இளையான்குடி நெசவுப் பட்டடை தொழுகை மேடைப் பள்ளிவாசல்"} - 
              சமூக சேவை மற்றும் ஆன்மீக வழிகாட்டுதலுக்கான மையம்.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-tamil text-lg font-semibold mb-4 text-secondary">
              விரைவு இணைப்புகள்
            </h3>
            <ul className="space-y-2">
              {[
                { path: "/about", label: "ஐ.என்.பி பற்றி" },
                { path: "/events", label: "நிகழ்வுகள்" },
                { path: "/donation", label: "நன்கொடை" },
                { path: "/grievances", label: "புகார்கள்" },
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="font-tamil text-sm opacity-90 hover:opacity-100 hover:text-secondary transition-all"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-tamil text-lg font-semibold mb-4 text-secondary">
              தொடர்பு கொள்ள
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5 text-secondary shrink-0" />
                <span className="font-tamil text-sm opacity-90">
                  {settings.mosque_address || "இளையான்குடி, சிவகங்கை மாவட்டம், தமிழ்நாடு"}
                </span>
              </li>
              {settings.mosque_contact_number && (
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-secondary shrink-0" />
                  <a 
                    href={`tel:${settings.mosque_contact_number}`}
                    className="text-sm opacity-90 hover:opacity-100 hover:text-secondary transition-all"
                  >
                    {settings.mosque_contact_number}
                  </a>
                </li>
              )}
              {settings.whatsapp_number && (
                <li className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-secondary shrink-0" />
                  <button 
                    onClick={handleWhatsAppClick}
                    className="text-sm opacity-90 hover:opacity-100 hover:text-secondary transition-all"
                  >
                    WhatsApp: {settings.whatsapp_number}
                  </button>
                </li>
              )}
              {settings.admin_email && (
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-secondary shrink-0" />
                  <a 
                    href={`mailto:${settings.admin_email}`}
                    className="text-sm opacity-90 hover:opacity-100 hover:text-secondary transition-all"
                  >
                    {settings.admin_email}
                  </a>
                </li>
              )}
              {settings.website_url && (
                <li className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-secondary shrink-0" />
                  <a 
                    href={settings.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm opacity-90 hover:opacity-100 hover:text-secondary transition-all"
                  >
                    {settings.website_url.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Prayer Times */}
          <div>
            <h3 className="font-tamil text-lg font-semibold mb-4 text-secondary">
              தொழுகை நேரங்கள்
            </h3>
            <ul className="space-y-2">
              {[
                { name: "ஃபஜ்ர்", time: settings.prayer_fajr || "5:00 AM" },
                { name: "ளுஹர்", time: settings.prayer_dhuhr || "12:30 PM" },
                { name: "அஸர்", time: settings.prayer_asr || "4:00 PM" },
                { name: "மஃரிப்", time: settings.prayer_maghrib || "6:30 PM" },
                { name: "இஷா", time: settings.prayer_isha || "8:00 PM" },
              ].map((prayer) => (
                <li key={prayer.name} className="flex justify-between items-center">
                  <span className="font-tamil text-sm opacity-90">{prayer.name}</span>
                  <span className="text-sm font-medium">{prayer.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Disclaimer Section */}
      <div className="border-t border-primary-foreground/20">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h4 className={`text-xs font-semibold opacity-80 ${disclaimerLang === "ta" ? "font-tamil" : ""}`}>
                {disclaimerContent[disclaimerLang].title}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDisclaimerLang(disclaimerLang === "ta" ? "en" : "ta")}
                className="h-6 px-2 text-xs opacity-70 hover:opacity-100 hover:bg-primary-foreground/10"
              >
                <Languages className="h-3 w-3 mr-1" />
                {disclaimerLang === "ta" ? "EN" : "தமிழ்"}
              </Button>
            </div>
            <p className={`text-xs opacity-60 leading-relaxed ${disclaimerLang === "ta" ? "font-tamil" : ""}`}>
              {disclaimerContent[disclaimerLang].text}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-sm opacity-80">
            <p className="font-tamil text-center md:text-left">
              © {currentYear} {settings.mosque_name || "இளையான்குடி நெசவுப் பட்டடை தொழுகை மேடைப் பள்ளிவாசல்"}. 
              அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.
            </p>
            <p className="text-center md:text-right">
              {settings.footer_credit_text || "Developed by Panduvan Batcha for the Masjid Administration"}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
