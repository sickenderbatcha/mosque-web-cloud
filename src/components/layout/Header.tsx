import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, ChevronDown, LogOut, Loader2, Shield, LayoutDashboard, Sun, Moon, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useTheme, DarkMode } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import { useMenuVisibility } from "@/hooks/useMenuVisibility";
import { useHeaderSettings } from "@/hooks/useHeaderSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { HEADER_SETTINGS_DEFAULTS } from "@/lib/headerSettings";

const allMenuItems = [
{ path: "/", labelTamil: "முகப்பு", labelEnglish: "Home", visKey: "nav_home" as const, access: "public" },
{ path: "/about", labelTamil: "ஐ.என்.பி பற்றி", labelEnglish: "About I.N.P.", visKey: "nav_about" as const, access: "public" },
{ path: "/members", labelTamil: "உறுப்பினர்கள்", labelEnglish: "Members", visKey: "nav_members" as const, access: "public" },
{ path: "/blood-donors", labelTamil: "இரத்த தானம்", labelEnglish: "Blood Donors", visKey: "nav_blood_donors" as const, access: "public" },
{ path: "/gallery", labelTamil: "புகைப்படங்கள்", labelEnglish: "Gallery", visKey: "nav_gallery" as const, access: "public" },
{ path: "/financial-statement", labelTamil: "நிதிநிலை அறிக்கை", labelEnglish: "Financial Statement", visKey: "nav_financial_statement" as const, access: "members" },
{ path: "/events", labelTamil: "நிகழ்வுகள்", labelEnglish: "Events", visKey: "nav_events" as const, access: "public" },
{ path: "/grievances", labelTamil: "புகார்கள்", labelEnglish: "Grievances", visKey: "nav_grievances" as const, access: "public" },
{ path: "/contact", labelTamil: "தொடர்பு", labelEnglish: "Contact", visKey: "nav_contact" as const, access: "public" }];


const allOnlineServicesItems = [
{ path: "/mahal-booking", labelTamil: "மஹால் முன்பதிவு", labelEnglish: "Mahal Booking", visKey: "nav_service_mahal" as const },
{ path: "/donation", labelTamil: "நன்கொடை", labelEnglish: "Donation", visKey: "nav_service_donation" as const },
{ path: "/services", labelTamil: "சான்றிதழ்கள்", labelEnglish: "Certificates", visKey: "nav_service_certificates" as const },
{ path: "/dashboard", labelTamil: "என் முன்பதிவுகள் / பணத்தை திரும்பப்பெறு", labelEnglish: "My Bookings / Refunds", visKey: "nav_service_my_bookings" as const }];

const backOfficeItems = [
  { path: "/backoffice/income", labelTamil: "வரவு மேலாண்மை", labelEnglish: "Income Management" },
  { path: "/backoffice/expenses", labelTamil: "செலவு மேலாண்மை", labelEnglish: "Expenses Management" },
{ path: "/backoffice/marriage", labelTamil: "திருமணப் பதிவு", labelEnglish: "Marriage Register" },
{ path: "/backoffice/outside-marriage", labelTamil: "வெளி திருமணப் பதிவு", labelEnglish: "Outside Marriage" },
{ path: "/backoffice/death", labelTamil: "இறப்புப் பதிவு", labelEnglish: "Death Register" },
{ path: "/backoffice/rental", labelTamil: "வாடகை ஒப்பந்தம்", labelEnglish: "Rental" },
{ path: "/backoffice/assets", labelTamil: "சொத்து மேலாண்மை", labelEnglish: "Assets" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const { darkMode, setDarkMode, isDark } = useTheme();
  const { isVisible } = useMenuVisibility();
  const isMobile = useIsMobile();
  const { settings: headerSettings, isResolved: headerSettingsResolved } = useHeaderSettings();

  const getBismillahSize = () => `${isMobile ? headerSettings.header_font_bismillah_mobile || "14" : headerSettings.header_font_bismillah_desktop || "14"}px`;
  const getTamilSize = () => `${isMobile ? headerSettings.header_font_ta_mobile || "24" : headerSettings.header_font_ta_desktop || "36"}px`;
  const getEnglishSize = () => `${isMobile ? headerSettings.header_font_en_mobile || "14" : headerSettings.header_font_en_desktop || "16"}px`;

  const resolveHeaderText = (value: string | undefined, fallback: string) => {
    const normalizedValue = value?.trim();
    if (normalizedValue) {
      return normalizedValue;
    }

    return headerSettingsResolved ? fallback : "";
  };

  const headerBismillah = resolveHeaderText(
    headerSettings.header_bismillah,
    HEADER_SETTINGS_DEFAULTS.header_bismillah,
  );
  const headerTitleTa = resolveHeaderText(
    headerSettings.header_title_ta,
    HEADER_SETTINGS_DEFAULTS.header_title_ta,
  );
  const headerTitleEn = resolveHeaderText(
    headerSettings.header_title_en,
    HEADER_SETTINGS_DEFAULTS.header_title_en,
  );

  const menuItems = allMenuItems.filter((item) => isVisible(item.visKey));
  const onlineServicesItems = allOnlineServicesItems.filter((item) => isVisible(item.visKey));

  const darkModeOptions: {mode: DarkMode;icon: typeof Sun;label: string;}[] = [
  { mode: "light", icon: Sun, label: "Light" },
  { mode: "dark", icon: Moon, label: "Dark" },
  { mode: "system", icon: Monitor, label: "System" }];


  const currentDarkModeIcon = darkMode === "dark" ? Moon : darkMode === "system" ? Monitor : Sun;

  const isActive = (path: string) => location.pathname === path;

  // Always close mobile menu after navigation
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "வெளியேற்றம் வெற்றி / Signed Out",
        description: "You have been signed out successfully."
      });
    } catch (error) {
      toast({
        title: "பிழை / Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const AuthButton = () => {
    if (loading) {
      return (
        <Button variant="ghost" size="sm" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>);

    }

    if (user) {
      return (
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                <span className="font-tamil text-xs max-w-24 truncate">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard" className="cursor-pointer">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  <span className="font-tamil">டாஷ்போர்டு</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  <span className="font-tamil">சுயவிவரம்</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            <span className="font-tamil text-xs">வெளியேறு</span>
          </Button>
        </div>);

    }

    return (
      <Button asChild variant="default" size="sm" className="gap-2">
        <Link to="/login">
          <User className="h-4 w-4" />
          <span className="font-tamil">உள்நுழை</span>
        </Link>
      </Button>);

  };

  const MobileAuthButton = () => {
    if (loading) {
      return (
        <Button variant="ghost" size="sm" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>);

    }

    if (user) {
      return (
        <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          <span className="font-tamil text-xs">வெளியேறு</span>
        </Button>);

    }

    return (
      <Button asChild variant="default" size="sm" className="gap-2">
        <Link to="/login">
          <User className="h-4 w-4" />
          <span className="font-tamil text-xs">உள்நுழை</span>
        </Link>
      </Button>);

  };

  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-md border-b border-border shadow-soft">
      {/* Bismillah */}
      <div className="w-full bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-1.5 text-center">
          <span
            className="font-semibold bg-gradient-to-r from-amber-600 via-emerald-600 to-amber-600 bg-clip-text text-transparent drop-shadow-sm text-lg"
            dir="rtl"
            style={{ fontSize: getBismillahSize() }}>

            {headerBismillah}
          </span>
      </div>
      
      {/* Main header */}
      <div className="container mx-auto px-4">
        {/* Title section */}
        <div className="py-4 text-center border-b border-border/50">
          <Link to="/" className="inline-block">
            <h1 className="font-bold font-tamil text-primary leading-tight" style={{ fontSize: getTamilSize() }}>
              {headerTitleTa}
            </h1>
            <p className="text-muted-foreground mt-1 font-display text-3xl" style={{ fontSize: getEnglishSize() }}>
              {headerTitleEn}
            </p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="py-3">
          <div className="flex items-center justify-between">
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              {menuItems.map((item) =>
              <Link
                key={item.path}
                to={item.path}
                className={`px-1.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                isActive(item.path) ?
                "bg-primary text-primary-foreground" :
                "text-foreground hover:bg-muted hover:text-primary"}`
                }>

                  <span className="font-tamil block text-xs">{item.labelTamil}</span>
                  <span className="text-[10px] opacity-80">{item.labelEnglish}</span>
                </Link>
              )}
              
              {/* Online Services Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`px-1.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                    onlineServicesItems.some((item) => isActive(item.path)) ?
                    "bg-primary text-primary-foreground" :
                    "text-foreground hover:bg-muted hover:text-primary"}`
                    }>

                    <div>
                      <span className="font-tamil block text-xs">ஆன்லைன் சேவைகள்</span>
                      <span className="text-[10px] opacity-80">Online Services</span>
                    </div>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {onlineServicesItems.map((item) =>
                  <DropdownMenuItem key={item.path} asChild>
                      <Link to={item.path} className="cursor-pointer">
                        <div>
                          <span className="font-tamil block">{item.labelTamil}</span>
                          <span className="text-xs opacity-70">{item.labelEnglish}</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Back Office Dropdown - visible to all, pages restricted to admin */}
              {(
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`px-1.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                      backOfficeItems.some((item) => isActive(item.path)) ?
                      "bg-primary text-primary-foreground" :
                      "text-foreground hover:bg-muted hover:text-primary"}`
                      }>
                      <div>
                        <span className="font-tamil block text-xs">பின் அலுவலகப் பணிகள்</span>
                        <span className="text-[10px] opacity-80">Back Office</span>
                      </div>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    {backOfficeItems.map((item) =>
                    <DropdownMenuItem key={item.path} asChild>
                        <Link to={item.path} className="cursor-pointer">
                          <div>
                            <span className="font-tamil block">{item.labelTamil}</span>
                            <span className="text-xs opacity-70">{item.labelEnglish}</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Dark Mode Toggle & Admin dropdown & Login - Desktop */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0 ml-2">

              {/* Dark Mode Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    <span className="sr-only">Toggle dark mode</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {darkModeOptions.map(({ mode, icon: Icon, label }) =>
                  <DropdownMenuItem
                    key={mode}
                    onClick={() => setDarkMode(mode)}
                    className={darkMode === mode ? "bg-accent" : ""}>

                      <Icon className="h-4 w-4 mr-2" />
                      {label}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {isSuperAdmin &&
              <Button asChild variant="destructive" size="sm" className="gap-2">
                  <Link to="/superadmin">
                    <Shield className="h-4 w-4" />
                    <span className="font-tamil text-xs">சூப்பர் நிர்வாகி</span>
                  </Link>
                </Button>
              }

              {isAdmin &&
              <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to="/admin">
                    <Shield className="h-4 w-4" />
                    <span className="font-tamil text-xs">நிர்வாக பலகை</span>
                  </Link>
                </Button>
              }

              <AuthButton />
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-2">
                {/* Welcome message for logged in users - Mobile */}
                {user && !loading &&
                <span className="text-xs text-muted-foreground font-tamil truncate max-w-[120px]">
                    நல்வரவு, <span className="font-medium text-foreground">{user.user_metadata?.full_name || user.email?.split("@")[0]}</span>
                  </span>
                }
                
                {/* Mobile Dark Mode Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    const modes: DarkMode[] = ["light", "dark", "system"];
                    const currentIndex = modes.indexOf(darkMode);
                    const nextIndex = (currentIndex + 1) % modes.length;
                    setDarkMode(modes[nextIndex]);
                  }}>

                  {darkMode === "dark" ?
                  <Moon className="h-4 w-4" /> :
                  darkMode === "system" ?
                  <Monitor className="h-4 w-4" /> :

                  <Sun className="h-4 w-4" />
                  }
                </Button>
                <MobileAuthButton />
              </div>
              
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Toggle menu">

                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {isMenuOpen &&
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden">

                <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
                  {menuItems.map((item, index) =>
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}>

                      <Link
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition-all ${
                    isActive(item.path) ?
                    "bg-primary text-primary-foreground" :
                    "hover:bg-muted"}`
                    }>

                        <span className="font-tamil block">{item.labelTamil}</span>
                        <span className="text-xs opacity-70">{item.labelEnglish}</span>
                      </Link>
                    </motion.div>
                )}
                  
                  {/* Online Services Section - Mobile */}
                  <div className="pt-4 border-t border-border">
                    <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      ஆன்லைன் சேவைகள் / Online Services
                    </p>
                    {onlineServicesItems.map((item, index) =>
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (menuItems.length + index) * 0.05 }}>

                        <Link
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block px-4 py-3 rounded-lg transition-all ${
                      isActive(item.path) ?
                      "bg-primary text-primary-foreground" :
                      "hover:bg-muted"}`
                      }>

                          <span className="font-tamil block">{item.labelTamil}</span>
                          <span className="text-xs opacity-70">{item.labelEnglish}</span>
                        </Link>
                      </motion.div>
                  )}
                  </div>

                  {/* Back Office Section - Mobile, visible to all */}
                  {(
                    <div className="pt-4 border-t border-border">
                      <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        பின் அலுவலகப் பணிகள் / Back Office
                      </p>
                      {backOfficeItems.map((item, index) =>
                        <motion.div
                          key={item.path}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (menuItems.length + onlineServicesItems.length + index) * 0.05 }}>
                          <Link
                            to={item.path}
                            onClick={() => setIsMenuOpen(false)}
                            className={`block px-4 py-3 rounded-lg transition-all ${
                              isActive(item.path) ?
                              "bg-primary text-primary-foreground" :
                              "hover:bg-muted"}`}>
                            <span className="font-tamil block">{item.labelTamil}</span>
                            <span className="text-xs opacity-70">{item.labelEnglish}</span>
                          </Link>
                        </motion.div>
                      )}
                    </div>
                  )}
                  
                  {/* User Dashboard in mobile */}
                  {user &&
                <div className="pt-4 border-t border-border">
                      <Link
                    to="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 hover:bg-muted rounded-lg font-tamil">

                        <LayoutDashboard className="h-4 w-4" />
                        டாஷ்போர்டு (My Dashboard)
                      </Link>
                    </div>
                }
                  
                  {/* Superadmin section in mobile */}
                  {isSuperAdmin &&
                <div className="pt-2">
                      <Link
                    to="/superadmin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 bg-destructive/10 text-destructive rounded-lg font-tamil">

                        <Shield className="h-4 w-4" />
                        சூப்பர் நிர்வாகி (Super Admin)
                      </Link>
                    </div>
                }

                  {/* Admin section in mobile */}
                  {isAdmin &&
                <div className="pt-2">
                      <Link
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-lg font-tamil">

                        <Shield className="h-4 w-4" />
                        நிர்வாக பலகை (Admin Dashboard)
                      </Link>
                    </div>
                }
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </nav>
      </div>
    </header>);

};

export default Header;