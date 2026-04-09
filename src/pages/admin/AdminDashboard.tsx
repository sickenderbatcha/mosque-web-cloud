import { useState, useEffect, useRef, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Calendar, Users, AlertCircle, UserPlus, Image, Bell, RotateCcw, Settings, UserCheck, TrendingUp, TrendingDown, Heart, FileText, Skull, FileCheck, UserCog, CreditCard, Info, Activity, ScrollText, Banknote, Archive, FilePlus2, DatabaseBackup, Package, Wallet, Home } from "lucide-react";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserTabPermissions } from "@/hooks/useUserTabPermissions";
import DonationsTab from "./tabs/DonationsTab";
import BookingsTab from "./tabs/BookingsTab";
import GrievancesTab from "./tabs/GrievancesTab";
import EventsTab from "./tabs/EventsTab";
import MembersTab from "./tabs/MembersTab";
import GalleryTab from "./tabs/GalleryTab";
import AboutGalleryTab from "./tabs/AboutGalleryTab";
import AnnouncementsTab from "./tabs/AnnouncementsTab";
import RefundsTab from "./tabs/RefundsTab";
import SettingsTab from "./tabs/SettingsTab";
import UserApprovalTab from "./tabs/UserApprovalTab";
import UserManagementTab from "./tabs/UserManagementTab";
import NotificationsTab from "./tabs/NotificationsTab";
import IncomeTab from "./tabs/IncomeTab";
import ExpensesTab from "./tabs/ExpensesTab";
import MarriageRegisterTab from "./tabs/MarriageRegisterTab";
import DeathRegisterTab from "./tabs/DeathRegisterTab";
import CertificatePaymentsTab from "./tabs/CertificatePaymentsTab";
import NocCertificatesTab from "./tabs/NocCertificatesTab";
import HeirCertificatesTab from "./tabs/HeirCertificatesTab";
import SubscriptionSlotsTab from "./tabs/SubscriptionSlotsTab";
import CashPaymentRequestsTab from "./tabs/CashPaymentRequestsTab";
import OutsideMarriageRegisterTab from "./tabs/OutsideMarriageRegisterTab";
import IssuedDocumentsTab from "./tabs/IssuedDocumentsTab";
import PdfDocumentsTab from "./tabs/PdfDocumentsTab";
import BackupRestoreTab from "./tabs/BackupRestoreTab";
import AssetManagementTab from "./tabs/AssetManagementTab";
import OnlinePaymentsTab from "./tabs/OnlinePaymentsTab";
import CommitteeTab from "./tabs/CommitteeTab";
import RentalAgreementsTab from "./tabs/RentalAgreementsTab";
import PrayerTimesTab from "./tabs/PrayerTimesTab";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [pendingBackupFile, setPendingBackupFile] = useState<File | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const { stats: visitorStats } = useVisitorTracking();
  const { hasFullAccess, canAccessTab } = useUserTabPermissions();

  // Set default active tab to the first accessible tab
  useEffect(() => {
    if (!activeTab) {
      const allTabs = ["donations","income","expenses","bookings","refunds","grievances","events","members","gallery","about-gallery","announcements","user-approval","user-management","notifications","marriage-register","outside-marriage-register","death-register","certificate-payments","noc-certificates","heir-certificates","subscription-slots","cash-requests","online-payments","issued-documents","pdf-documents","committee","rental-agreements","asset-management","prayer-times","backup-restore","settings"];
      const firstAccessible = allTabs.find((t) => canAccessTab(t)) || "donations";
      setActiveTab(firstAccessible);
    }
  }, [hasFullAccess, activeTab, canAccessTab]);

  const handleTabChange = (value: string) => {
    if (isUploadDialogOpen) {
      console.log('[AdminDashboard] Tab change BLOCKED while upload dialog open. Attempted:', value);
      return;
    }
    setActiveTab(value);
  };

  // Called by PdfDocumentsTab when user clicks "Upload Document"
  const handlePdfUploadRequest = useCallback(() => {
    if (pdfFileInputRef.current) {
      pdfFileInputRef.current.value = "";
      pdfFileInputRef.current.click();
    }
  }, []);

  // Called by BackupRestoreTab when user clicks "Select Backup File"
  const handleBackupFileRequest = useCallback(() => {
    if (backupFileInputRef.current) {
      backupFileInputRef.current.value = "";
      backupFileInputRef.current.click();
    }
  }, []);

  // File selected from the picker — force back to pdf-documents tab and pass file down
  const handlePdfFileSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    console.log('[AdminDashboard] PDF file selected:', file.name);
    setActiveTab("pdf-documents");
    setPendingPdfFile(file);
  }, []);

  // Backup file selected from the picker — force back to backup-restore tab
  const handleBackupFileSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    console.log('[AdminDashboard] Backup file selected:', file.name);
    setActiveTab("backup-restore");
    setPendingBackupFile(file);
  }, []);

  useEffect(() => {
    fetchCounts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("admin-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pending_users" },
        () => fetchCounts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCounts = async () => {
    const [pendingResult, notificationsResult] = await Promise.all([
      supabase.from("pending_users").select("id", { count: "exact" }).eq("status", "pending"),
      supabase.from("admin_notifications").select("id", { count: "exact" }).eq("is_read", false),
    ]);

    setPendingCount(pendingResult.count || 0);
    setUnreadNotifications(notificationsResult.count || 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage donations, bookings, grievances, and events</p>
          </div>
          
          {/* Visitor Stats */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <Users className="h-4 w-4 text-primary" />
              <div className="text-left">
                <p className="text-lg font-bold text-foreground leading-none">{visitorStats.totalVisitors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Visitors</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/10 border border-secondary/20">
              <Calendar className="h-4 w-4 text-secondary" />
              <div className="text-left">
                <p className="text-lg font-bold text-foreground leading-none">{visitorStats.todayVisitors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="relative">
                <Activity className="h-4 w-4 text-green-600" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-foreground leading-none">{visitorStats.liveVisitors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Live Now</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden PDF file input — OUTSIDE the Tabs system so it survives tab changes on mobile */}
        <input
          type="file"
          accept=".pdf,application/pdf"
          ref={pdfFileInputRef}
          onChange={handlePdfFileSelected}
          className="hidden"
          aria-hidden="true"
        />
        {/* Hidden Backup file input — OUTSIDE the Tabs system so it survives tab changes on mobile */}
        <input
          type="file"
          accept=".json"
          ref={backupFileInputRef}
          onChange={handleBackupFileSelected}
          className="hidden"
          aria-hidden="true"
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} activationMode="manual" className="space-y-6">
          <TabsList className={`flex flex-wrap w-full gap-1 h-auto lg:w-auto lg:inline-flex ${isUploadDialogOpen ? 'pointer-events-none opacity-50' : ''}`}>
            {canAccessTab("donations") && <TabsTrigger value="donations" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Donations</span>
            </TabsTrigger>}
            {canAccessTab("income") && <TabsTrigger value="income" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Income</span>
            </TabsTrigger>}
            {canAccessTab("expenses") && <TabsTrigger value="expenses" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              <span className="hidden sm:inline">Expenses</span>
            </TabsTrigger>}
            {canAccessTab("bookings") && <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>}
            {canAccessTab("refunds") && <TabsTrigger value="refunds" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Refunds</span>
            </TabsTrigger>}
            {canAccessTab("grievances") && <TabsTrigger value="grievances" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Grievances</span>
            </TabsTrigger>}
            {canAccessTab("events") && <TabsTrigger value="events" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>}
            {canAccessTab("members") && <TabsTrigger value="members" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
            </TabsTrigger>}
            {canAccessTab("gallery") && <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Gallery</span>
            </TabsTrigger>}
            {canAccessTab("about-gallery") && <TabsTrigger value="about-gallery" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">About</span>
            </TabsTrigger>}
            {canAccessTab("announcements") && <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Announce</span>
            </TabsTrigger>}
            {canAccessTab("user-approval") && <TabsTrigger value="user-approval" className="flex items-center gap-2 relative">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Approve</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>}
            {canAccessTab("user-management") && <TabsTrigger value="user-management" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>}
            {canAccessTab("notifications") && <TabsTrigger value="notifications" className="flex items-center gap-2 relative">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notify</span>
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadNotifications}
                </Badge>
              )}
            </TabsTrigger>}
            {canAccessTab("marriage-register") && <TabsTrigger value="marriage-register" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Marriage</span>
            </TabsTrigger>}
            {canAccessTab("outside-marriage-register") && <TabsTrigger value="outside-marriage-register" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Outside Marriage</span>
            </TabsTrigger>}
            {canAccessTab("death-register") && <TabsTrigger value="death-register" className="flex items-center gap-2">
              <Skull className="h-4 w-4" />
              <span className="hidden sm:inline">Death</span>
            </TabsTrigger>}
            {canAccessTab("certificate-payments") && <TabsTrigger value="certificate-payments" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Certificates</span>
            </TabsTrigger>}
            {canAccessTab("noc-certificates") && <TabsTrigger value="noc-certificates" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">NOC</span>
            </TabsTrigger>}
            {canAccessTab("heir-certificates") && <TabsTrigger value="heir-certificates" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              <span className="hidden sm:inline">Heir</span>
            </TabsTrigger>}
            {canAccessTab("subscription-slots") && <TabsTrigger value="subscription-slots" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Subscriptions</span>
            </TabsTrigger>}
            {canAccessTab("cash-requests") && <TabsTrigger value="cash-requests" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              <span className="hidden sm:inline">Cash Requests</span>
            </TabsTrigger>}
            {canAccessTab("online-payments") && <TabsTrigger value="online-payments" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Online Payments</span>
            </TabsTrigger>}
            {canAccessTab("issued-documents") && <TabsTrigger value="issued-documents" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Issued Docs</span>
            </TabsTrigger>}
            {canAccessTab("pdf-documents") && <TabsTrigger value="pdf-documents" className="flex items-center gap-2">
              <FilePlus2 className="h-4 w-4" />
              <span className="hidden sm:inline">PDF Docs</span>
            </TabsTrigger>}
            {canAccessTab("committee") && <TabsTrigger value="committee" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Committee</span>
            </TabsTrigger>}
            {canAccessTab("rental-agreements") && <TabsTrigger value="rental-agreements" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Rental</span>
            </TabsTrigger>}
            {canAccessTab("asset-management") && <TabsTrigger value="asset-management" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Assets</span>
            </TabsTrigger>}
            {canAccessTab("prayer-times") && <TabsTrigger value="prayer-times" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Prayer Times</span>
            </TabsTrigger>}
            {canAccessTab("backup-restore") && <TabsTrigger value="backup-restore" className="flex items-center gap-2">
              <DatabaseBackup className="h-4 w-4" />
              <span className="hidden sm:inline">Backup</span>
            </TabsTrigger>}
            {canAccessTab("settings") && <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>}
          </TabsList>

          {canAccessTab("donations") && <TabsContent value="donations">
            <DonationsTab />
          </TabsContent>}

          {canAccessTab("income") && <TabsContent value="income">
            <IncomeTab />
          </TabsContent>}

          {canAccessTab("expenses") && <TabsContent value="expenses">
            <ExpensesTab />
          </TabsContent>}

          {canAccessTab("bookings") && <TabsContent value="bookings">
            <BookingsTab />
          </TabsContent>}

          {canAccessTab("refunds") && <TabsContent value="refunds">
            <RefundsTab />
          </TabsContent>}

          {canAccessTab("grievances") && <TabsContent value="grievances">
            <GrievancesTab />
          </TabsContent>}

          {canAccessTab("events") && <TabsContent value="events">
            <EventsTab />
          </TabsContent>}

          {canAccessTab("members") && <TabsContent value="members">
            <MembersTab />
          </TabsContent>}

          {canAccessTab("gallery") && <TabsContent value="gallery">
            <GalleryTab />
          </TabsContent>}

          {canAccessTab("about-gallery") && <TabsContent value="about-gallery">
            <AboutGalleryTab />
          </TabsContent>}

          {canAccessTab("announcements") && <TabsContent value="announcements">
            <AnnouncementsTab />
          </TabsContent>}

          {canAccessTab("user-approval") && <TabsContent value="user-approval">
            <UserApprovalTab />
          </TabsContent>}

          {canAccessTab("user-management") && <TabsContent value="user-management">
            <UserManagementTab />
          </TabsContent>}

          {canAccessTab("notifications") && <TabsContent value="notifications">
            <NotificationsTab />
          </TabsContent>}

          {canAccessTab("marriage-register") && <TabsContent value="marriage-register">
            <MarriageRegisterTab />
          </TabsContent>}

          {canAccessTab("outside-marriage-register") && <TabsContent value="outside-marriage-register">
            <OutsideMarriageRegisterTab />
          </TabsContent>}

          {canAccessTab("death-register") && <TabsContent value="death-register">
            <DeathRegisterTab />
          </TabsContent>}

          {canAccessTab("certificate-payments") && <TabsContent value="certificate-payments">
            <CertificatePaymentsTab />
          </TabsContent>}

          {canAccessTab("noc-certificates") && <TabsContent value="noc-certificates">
            <NocCertificatesTab />
          </TabsContent>}

          {canAccessTab("heir-certificates") && <TabsContent value="heir-certificates">
            <HeirCertificatesTab />
          </TabsContent>}

          {canAccessTab("subscription-slots") && <TabsContent value="subscription-slots">
            <SubscriptionSlotsTab />
          </TabsContent>}

          {canAccessTab("cash-requests") && <TabsContent value="cash-requests">
            <CashPaymentRequestsTab />
          </TabsContent>}

          {canAccessTab("online-payments") && <TabsContent value="online-payments">
            <OnlinePaymentsTab />
          </TabsContent>}

          {canAccessTab("issued-documents") && <TabsContent value="issued-documents">
            <IssuedDocumentsTab />
          </TabsContent>}

          {canAccessTab("pdf-documents") && <TabsContent value="pdf-documents" forceMount className="data-[state=inactive]:hidden">
            <PdfDocumentsTab 
              onUploadDialogChange={setIsUploadDialogOpen}
              onRequestFileUpload={handlePdfUploadRequest}
              pendingFile={pendingPdfFile}
              onPendingFileConsumed={() => setPendingPdfFile(null)}
            />
          </TabsContent>}

          {canAccessTab("committee") && <TabsContent value="committee">
            <CommitteeTab />
          </TabsContent>}

          {canAccessTab("rental-agreements") && <TabsContent value="rental-agreements">
            <RentalAgreementsTab />
          </TabsContent>}

          {canAccessTab("asset-management") && <TabsContent value="asset-management">
            <AssetManagementTab />
          </TabsContent>}

          {canAccessTab("prayer-times") && <TabsContent value="prayer-times">
            <PrayerTimesTab />
          </TabsContent>}

          {canAccessTab("backup-restore") && <TabsContent value="backup-restore" forceMount className="data-[state=inactive]:hidden">
            <BackupRestoreTab 
              onRequestFileUpload={handleBackupFileRequest}
              pendingFile={pendingBackupFile}
              onPendingFileConsumed={() => setPendingBackupFile(null)}
            />
          </TabsContent>}

          {canAccessTab("settings") && <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
