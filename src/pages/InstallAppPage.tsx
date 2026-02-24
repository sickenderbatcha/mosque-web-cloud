import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor, Check, Share, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallAppPage = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkStandalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(checkStandalone);
    
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-display text-emerald-800">
              App Already Installed!
            </CardTitle>
            <CardDescription>
              You're already using the installed version of INPT Masjid app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-display text-emerald-800">
              Installation Successful!
            </CardTitle>
            <CardDescription>
              INPT Masjid app has been added to your home screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Continue to App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-3xl font-bold text-white font-tamil">ஜ</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-emerald-800 mb-2">
            Install INPT Masjid App
          </h1>
          <p className="text-muted-foreground">
            Get quick access to all masjid services right from your home screen
          </p>
        </div>

        {/* Features */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Why Install?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium">Quick Access</h3>
                <p className="text-sm text-muted-foreground">
                  Launch the app instantly from your home screen
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Monitor className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium">Full Screen Experience</h3>
                <p className="text-sm text-muted-foreground">
                  No browser bars - enjoy the app in full screen
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium">Works Offline</h3>
                <p className="text-sm text-muted-foreground">
                  Access cached content even without internet
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Install Instructions */}
        {isIOS ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">How to Install on iPhone/iPad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  1
                </div>
                <div className="flex items-center gap-2">
                  <p>Tap the Share button</p>
                  <Share className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  2
                </div>
                <p>Scroll down and tap "Add to Home Screen"</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  3
                </div>
                <p>Tap "Add" to confirm</p>
              </div>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Ready to Install</CardTitle>
              <CardDescription>
                Click the button below to add the app to your device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleInstallClick} 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="lg"
              >
                <Download className="w-5 h-5 mr-2" />
                Install App
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">How to Install</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  1
                </div>
                <div className="flex items-center gap-2">
                  <p>Tap the menu button</p>
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  2
                </div>
                <p>Select "Install app" or "Add to Home screen"</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  3
                </div>
                <p>Follow the prompts to install</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <div className="text-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallAppPage;
