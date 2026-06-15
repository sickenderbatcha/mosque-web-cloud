import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { HeaderSettingsProvider } from "./hooks/useHeaderSettings";
import ScrollToTop from "./components/ScrollToTop";
import { useOverflowDebug } from "./hooks/useOverflowDebug";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import DonationPage from "./pages/DonationPage";
import MahalBookingPage from "./pages/MahalBookingPage";
import EventsPage from "./pages/EventsPage";
import GrievancesPage from "./pages/GrievancesPage";
import LoginPage from "./pages/LoginPage";

import ServicesPage from "./pages/ServicesPage";
import FinancialStatementPage from "./pages/FinancialStatementPage";
import ProfilePage from "./pages/ProfilePage";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import MembersDirectoryPage from "./pages/MembersDirectoryPage";
import BloodDonorFinderPage from "./pages/BloodDonorFinderPage";
import PhotoGalleryPage from "./pages/PhotoGalleryPage";
import BookmarkedVersesPage from "./pages/BookmarkedVersesPage";
import ContactPage from "./pages/ContactPage";
import CertificatePreviewPage from "./pages/CertificatePreviewPage";
import NocCertificatePage from "./pages/NocCertificatePage";
import HeirCertificatePage from "./pages/HeirCertificatePage";
import InstallAppPage from "./pages/InstallAppPage";
import NotFound from "./pages/NotFound";
import AdminSetupPage from "./pages/AdminSetupPage";
import BackOfficeIncomePage from "./pages/backoffice/BackOfficeIncomePage";
import BackOfficeExpensesPage from "./pages/backoffice/BackOfficeExpensesPage";
import BackOfficeMarriagePage from "./pages/backoffice/BackOfficeMarriagePage";
import BackOfficeOutsideMarriagePage from "./pages/backoffice/BackOfficeOutsideMarriagePage";
import BackOfficeDeathPage from "./pages/backoffice/BackOfficeDeathPage";
import BackOfficeRentalPage from "./pages/backoffice/BackOfficeRentalPage";
import BackOfficeAssetsPage from "./pages/backoffice/BackOfficeAssetsPage";

const queryClient = new QueryClient();

// Wrapper component to use the overflow debug hook
const AppContent = () => {
  const { search } = useLocation();
  const overflowDebugEnabled =
    import.meta.env.DEV && new URLSearchParams(search).has("overflowDebug");

  // Enable only when URL contains ?overflowDebug
  useOverflowDebug(overflowDebugEnabled);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin-setup" element={<AdminSetupPage />} />
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/about" element={<Layout><AboutPage /></Layout>} />
      <Route path="/donation" element={<Layout><DonationPage /></Layout>} />
      <Route path="/mahal-booking" element={<Layout><MahalBookingPage /></Layout>} />
      <Route path="/events" element={<Layout><EventsPage /></Layout>} />
      <Route path="/grievances" element={<Layout><GrievancesPage /></Layout>} />
      <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
      <Route path="/services" element={<Layout><ProtectedRoute><ServicesPage /></ProtectedRoute></Layout>} />
      <Route path="/financial-statement" element={<Layout><ProtectedRoute><FinancialStatementPage /></ProtectedRoute></Layout>} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/dashboard" element={<Layout><ProtectedRoute><UserDashboard /></ProtectedRoute></Layout>} />
      <Route path="/members" element={<Layout><ProtectedRoute><MembersDirectoryPage /></ProtectedRoute></Layout>} />
      <Route path="/blood-donors" element={<Layout><ProtectedRoute><BloodDonorFinderPage /></ProtectedRoute></Layout>} />
      <Route path="/gallery" element={<Layout><PhotoGalleryPage /></Layout>} />
      <Route path="/bookmarked-verses" element={<Layout><ProtectedRoute><BookmarkedVersesPage /></ProtectedRoute></Layout>} />
      <Route path="/admin" element={<Layout><AdminRoute><AdminDashboard /></AdminRoute></Layout>} />
      <Route path="/superadmin" element={<Layout><SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute></Layout>} />
      <Route path="/certificate-preview" element={<ProtectedRoute><CertificatePreviewPage /></ProtectedRoute>} />
      <Route path="/noc-certificate" element={<ProtectedRoute><NocCertificatePage /></ProtectedRoute>} />
      <Route path="/heir-certificate" element={<ProtectedRoute><HeirCertificatePage /></ProtectedRoute>} />
      <Route path="/install" element={<InstallAppPage />} />
      {/* Back Office Routes - Admin/SuperAdmin only */}
      <Route path="/backoffice/income" element={<Layout><AdminRoute><BackOfficeIncomePage /></AdminRoute></Layout>} />
      <Route path="/backoffice/expenses" element={<Layout><AdminRoute><BackOfficeExpensesPage /></AdminRoute></Layout>} />
      <Route path="/backoffice/marriage" element={<Layout><AdminRoute><BackOfficeMarriagePage /></AdminRoute></Layout>} />
      <Route path="/backoffice/outside-marriage" element={<Layout><AdminRoute><BackOfficeOutsideMarriagePage /></AdminRoute></Layout>} />
      <Route path="/backoffice/death" element={<Layout><AdminRoute><BackOfficeDeathPage /></AdminRoute></Layout>} />
      <Route path="/backoffice/rental" element={<Layout><AdminRoute><BackOfficeRentalPage /></AdminRoute></Layout>} />
      <Route path="/backoffice/assets" element={<Layout><AdminRoute><BackOfficeAssetsPage /></AdminRoute></Layout>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <HeaderSettingsProvider>
            <AuthProvider>
              <ScrollToTop />
              <AppContent />
            </AuthProvider>
          </HeaderSettingsProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
