import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, Heart, Building2, FileText, Users, ChevronRight, IndianRupee, Receipt, Landmark, Globe, Home, Package } from "lucide-react";
import MuslimGraveIcon from "@/components/icons/MuslimGraveIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PrayerTimes from "@/components/PrayerTimes";
import JumuahCountdown from "@/components/JumuahCountdown";
import Announcements from "@/components/Announcements";
import IslamicCalendar from "@/components/IslamicCalendar";
import QuranVerseOfDay from "@/components/QuranVerseOfDay";

import { useHomepageHero } from "@/hooks/useHomepageHero";
import { useHomepageVideo } from "@/hooks/useHomepageVideo";
import { useLandingContent } from "@/hooks/useLandingContent";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useHomepageSectionOrder } from "@/hooks/useHomepageSectionOrder";
import { useMenuVisibility } from "@/hooks/useMenuVisibility";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserTabPermissions } from "@/hooks/useUserTabPermissions";

const HomePage = () => {
  const { heroUrl } = useHomepageHero();
  const { videoUrl } = useHomepageVideo();
  const { content, isLoading: contentLoading } = useLandingContent();
  const { getSetting } = useAppSettings(["hero_brightness", "hero_overlay_color", "show_backoffice_homepage"]);
  const { getEnabledSections } = useHomepageSectionOrder();
  const { isVisible } = useMenuVisibility();
  const { isAdmin } = useUserRole();
  const { canAccessTab } = useUserTabPermissions();
  
  const showBackoffice = getSetting("show_backoffice_homepage") !== "false";
  
  const heroBrightness = parseInt(getSetting("hero_brightness") || "100", 10);
  // Scale: 10% slider = 0.2 brightness, 100% slider = 2.0 brightness (200% = double brightness)
  const brightnessValue = heroBrightness * 2 / 100;
  const brightnessStyle = { filter: `brightness(${brightnessValue})` };
  const heroOverlayColor = getSetting("hero_overlay_color") || "155 82% 20%";
  const heroOverlayStyle = {
    background: `linear-gradient(180deg, hsl(${heroOverlayColor} / 0.95) 0%, hsl(${heroOverlayColor} / 0.85) 100%)`,
  };

  const allServices = [
    {
      key: "card_mahal" as const,
      icon: Building2,
      titleTamil: content.services.mahal_title || "மஹால் முன்பதிவு",
      titleEnglish: content.services.mahal_subtitle || "Mahal Booking",
      description: content.services.mahal_description || "திருமண மண்டபம் மற்றும் விருந்து வசதிகளை முன்பதிவு செய்யுங்கள்",
      path: "/mahal-booking",
    },
    {
      key: "card_donation" as const,
      icon: Heart,
      titleTamil: content.services.donation_title || "நன்கொடை",
      titleEnglish: content.services.donation_subtitle || "Donation",
      description: content.services.donation_description || "நோன்புக் கஞ்சி மற்றும் பொது நன்கொடைகள்",
      path: "/donation",
    },
    {
      key: "card_certificates" as const,
      icon: FileText,
      titleTamil: content.services.certificates_title || "சான்றிதழ்கள்",
      titleEnglish: content.services.certificates_subtitle || "Certificates",
      description: content.services.certificates_description || "திருமண சான்றிதழ், இறப்புச் சான்றிதழ், போனாஃபைட்",
      path: "/services",
    },
    {
      key: "card_events" as const,
      icon: Calendar,
      titleTamil: content.services.events_title || "நிகழ்வுகள்",
      titleEnglish: content.services.events_subtitle || "Events",
      description: content.services.events_description || "வரவிருக்கும் நிகழ்வுகள் மற்றும் அறிவிப்புகள்",
      path: "/events",
    },
    {
      key: "card_my_bookings" as const,
      icon: Users,
      titleTamil: content.services.bookings_title || "என் முன்பதிவுகள் / பணத்தை திரும்பப்பெறு",
      titleEnglish: content.services.bookings_subtitle || "My Bookings / Refunds",
      description: content.services.bookings_description || "உங்கள் முன்பதிவுகளை பார்க்கவும், பணத்தை திரும்பப்பெற கோரவும்",
      path: "/dashboard",
    },
  ];

  const services = allServices.filter((s) => isVisible(s.key));

  const allBackOfficeItems = [
    { icon: IndianRupee, titleTamil: "வருமானம் மேலாண்மை", titleEnglish: "Income Management", path: "/backoffice/income", visKey: "card_backoffice_income" as const, tabKey: "income" },
    { icon: Receipt, titleTamil: "செலவு மேலாண்மை", titleEnglish: "Expenses Management", path: "/backoffice/expenses", visKey: "card_backoffice_expenses" as const, tabKey: "expenses" },
    { icon: Landmark, titleTamil: "திருமணப் பதிவு", titleEnglish: "Marriage Register", path: "/backoffice/marriage", visKey: "card_backoffice_marriage" as const, tabKey: "marriage-register" },
    { icon: Globe, titleTamil: "வெளியூர் திருமணப் பதிவு", titleEnglish: "Outside Marriage", path: "/backoffice/outside-marriage", visKey: "card_backoffice_outside_marriage" as const, tabKey: "outside-marriage-register" },
    { icon: MuslimGraveIcon, titleTamil: "இறப்புப் பதிவு", titleEnglish: "Death Register", path: "/backoffice/death", visKey: "card_backoffice_death" as const, tabKey: "death-register" },
    { icon: Home, titleTamil: "வாடகை மேலாண்மை", titleEnglish: "Rent Management", path: "/backoffice/rental", visKey: "card_backoffice_rental" as const, tabKey: "rental-agreements" },
    { icon: Package, titleTamil: "சொத்து மேலாண்மை", titleEnglish: "Assets Management", path: "/backoffice/assets", visKey: "card_backoffice_assets" as const, tabKey: "asset-management" },
    { icon: FileSignature, titleTamil: "கடிதத் தலைப்பு", titleEnglish: "Letterhead", path: "/letterhead", visKey: "card_backoffice_letterhead" as const, tabKey: "letterhead" },
  ];
  const backOfficeItems = allBackOfficeItems.filter((item) => isVisible(item.visKey) && (isAdmin || canAccessTab(item.tabKey)));

  // Section components mapping
  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "hero":
        return (
          <section key="hero" className="relative min-h-[80vh] flex items-center justify-center">
            {/* Background Video/Image */}
            <div className="absolute inset-0 z-0">
              {videoUrl ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={brightnessStyle}
                  poster={heroUrl}
                >
                  <source src={videoUrl} type="video/mp4" />
                  <img
                    src={heroUrl}
                    alt="Mosque"
                    className="w-full h-full object-cover"
                    style={brightnessStyle}
                  />
                </video>
              ) : (
                <img
                  src={heroUrl}
                  alt="Mosque"
                  className="w-full h-full object-cover"
                  style={brightnessStyle}
                />
              )}
              <div className="absolute inset-0" style={heroOverlayStyle} />
            </div>

            {/* Hero Content */}
            <div className="relative z-10 container mx-auto px-4 text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-4xl mx-auto"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-secondary font-tamil text-lg md:text-xl mb-4"
                >
                  {content.hero.greeting || "அஸ்ஸலாமு அலைக்கும்"}
                </motion.p>
                
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl md:text-3xl lg:text-4xl font-bold font-tamil text-primary-foreground mb-6 leading-tight"
                >
                  {content.hero.title_line1 || "இளையான்குடி நெசவுப் பட்டடை"}
                  <br />
                  {content.hero.title_line2 || "தொழுகை மேடைப் பள்ளிவாசல்"}
                </motion.h1>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-lg md:text-xl text-primary-foreground/90 mb-8 font-display"
                >
                  <p>{content.hero.subtitle_en || content.hero.subtitle || "Ilayangudi Nesavu Pattadai Tholukai Medai Pallivasal"}</p>
                  {content.hero.subtitle_line2 && (
                    <p className="mt-1">{content.hero.subtitle_line2}</p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <Button asChild variant="gold" size="xl">
                    <Link to="/donation">
                      <Heart className="h-5 w-5" />
                      <span className="font-tamil">{content.hero.cta_primary || "நன்கொடை வழங்க"}</span>
                    </Link>
                  </Button>
                  <Button asChild variant="hero" size="xl" className="bg-primary-foreground/20 border border-primary-foreground/30 hover:bg-primary-foreground/30">
                    <Link to="/about">
                      <span className="font-tamil">{content.hero.cta_secondary || "மேலும் அறிய"}</span>
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-6 h-10 border-2 border-primary-foreground/50 rounded-full flex justify-center"
              >
                <motion.div className="w-1.5 h-3 bg-primary-foreground/70 rounded-full mt-2" />
              </motion.div>
            </motion.div>
          </section>
        );

      case "services":
        return (
          <section key="services" className="py-20 bg-background islamic-pattern">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground mb-4">
                  {content.services.title || "ஆன்லைன் சேவைகள்"}
                </h2>
                <p className="text-muted-foreground font-display text-lg">{content.services.subtitle || "Online Services"}</p>
                <div className="section-divider mt-6" />
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {services.map((service, index) => (
                  <motion.div
                    key={service.path}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={service.path}>
                      <Card className="h-full card-hover bg-gradient-card border-border/50 group cursor-pointer">
                        <CardHeader className="text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <service.icon className="h-8 w-8 text-primary" />
                          </div>
                          <CardTitle className="font-tamil text-xl text-foreground group-hover:text-primary transition-colors">
                            {service.titleTamil}
                          </CardTitle>
                          <CardDescription className="font-display">
                            {service.titleEnglish}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-center text-muted-foreground font-tamil text-sm">
                            {service.description}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        );

      case "backoffice":
        if (!showBackoffice || backOfficeItems.length === 0) return null;
        return (
          <section key="backoffice" className="py-20 bg-muted islamic-pattern">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground mb-4">
                  பின் அலுவலகப் பணிகள்
                </h2>
                <p className="text-muted-foreground font-display text-lg">Back Office Work</p>
                <div className="section-divider mt-6" />
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {backOfficeItems.map((item, index) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={item.path}>
                      <Card className="h-full card-hover bg-gradient-card border-border/50 group cursor-pointer">
                        <CardHeader className="text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                            <item.icon className="h-8 w-8 text-accent" />
                          </div>
                          <CardTitle className="font-tamil text-xl text-foreground group-hover:text-accent transition-colors">
                            {item.titleTamil}
                          </CardTitle>
                          <CardDescription className="font-display">
                            {item.titleEnglish}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        );

      case "announcements":
        return <Announcements key="announcements" />;

      case "jumuah":
        return <JumuahCountdown key="jumuah" />;

      case "prayer":
        return <PrayerTimes key="prayer" />;

      case "calendar":
        return (
          <section key="calendar" className="py-12 bg-muted overflow-x-hidden">
            <div className="container mx-auto px-4 max-w-full overflow-x-hidden">
              <div className="grid md:grid-cols-2 gap-6 min-w-0 overflow-x-hidden">
                <IslamicCalendar />
                <QuranVerseOfDay />
              </div>
            </div>
          </section>
        );

      case "about":
        return (
          <section key="about" className="py-20 bg-muted">
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground mb-6">
                    {content.about.title || "தொழுகை மேடை பள்ளிவாசல் பற்றி"}
                  </h2>
                  <div className="section-divider !mx-0 mb-6" />
                  <p className="text-muted-foreground font-tamil leading-relaxed mb-6">
                    {content.about.paragraph1 || "இளையான்குடி நெசவுப் பட்டடை தொழுகை மேடைப் பள்ளிவாசல் என்பது நெசவாளர்களின் சமூகத்தால் நிறுவப்பட்ட ஒரு புனித வழிபாட்டுத் தலமாகும். இது சமூக சேவை, கல்வி மற்றும் ஆன்மீக வழிகாட்டுதலுக்கான மையமாக செயல்படுகிறது."}
                  </p>
                  <p className="text-muted-foreground font-tamil leading-relaxed mb-8">
                    {content.about.paragraph2 || "எங்கள் பள்ளிவாசல் திருமண பதிவு, மரண பதிவு, மற்றும் பல்வேறு சான்றிதழ் சேவைகளை வழங்குகிறது. மேலும், திருமண மண்டப முன்பதிவு மற்றும் நன்கொடை சேகரிப்பு போன்ற சேவைகளும் உள்ளன."}
                  </p>
                  <Button asChild variant="default" size="lg">
                    <Link to="/about">
                      <span className="font-tamil">{content.hero.cta_secondary || "மேலும் அறிய"}</span>
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-6 text-center bg-card shadow-medium">
                      <Users className="h-10 w-10 mx-auto mb-3 text-primary" />
                      <p className="text-3xl font-bold text-primary">{content.about.stat_members || "500+"}</p>
                      <p className="text-sm text-muted-foreground font-tamil">{content.about.stat_members_label || "உறுப்பினர்கள்"}</p>
                    </Card>
                    <Card className="p-6 text-center bg-card shadow-medium">
                      <Calendar className="h-10 w-10 mx-auto mb-3 text-secondary" />
                      <p className="text-3xl font-bold text-secondary">{content.about.stat_years || "50+"}</p>
                      <p className="text-sm text-muted-foreground font-tamil">{content.about.stat_years_label || "ஆண்டுகள்"}</p>
                    </Card>
                    <Card className="p-6 text-center bg-card shadow-medium col-span-2">
                      <Heart className="h-10 w-10 mx-auto mb-3 text-accent" />
                      <p className="text-3xl font-bold text-accent">{content.about.stat_marriages || "1000+"}</p>
                      <p className="text-sm text-muted-foreground font-tamil">{content.about.stat_marriages_label || "திருமணங்கள் நடத்தப்பட்டன"}</p>
                    </Card>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        );

      case "cta":
        return (
          <section key="cta" className="py-16 bg-primary">
            <div className="container mx-auto px-4 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-xl md:text-2xl font-bold font-tamil text-primary-foreground mb-4">
                  {content.cta.title || "சமூகத்தின் ஒரு பகுதியாக இருங்கள்"}
                </h2>
                <p className="text-primary-foreground/80 mb-8 font-display max-w-2xl mx-auto">
                  {content.cta.subtitle || "Join our community and stay connected with the mosque's activities and services."}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild variant="gold" size="lg">
                    <Link to="/login">
                      <span className="font-tamil">{content.cta.button_login || "உள்நுழைக"}</span>
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30 hover:bg-primary-foreground/30">
                    <Link to="/grievances">
                      <span className="font-tamil">{content.cta.button_grievance || "புகார் அளிக்க"}</span>
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  const enabledSections = getEnabledSections();

  return (
    <div className="overflow-hidden">
      {enabledSections.map((section) => renderSection(section.id))}
    </div>
  );
};

export default HomePage;
