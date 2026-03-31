import { useState } from "react";
import { Shield, Globe, Database, Settings, TableProperties, BarChart3, KeyRound, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataManagementTab from "./tabs/DataManagementTab";
import LandingContentTab from "./tabs/LandingContentTab";
import SuperAdminSettingsTab from "./tabs/SuperAdminSettingsTab";
import DatabaseManagerTab from "./tabs/DatabaseManagerTab";
import VisitorAnalyticsTab from "./tabs/VisitorAnalyticsTab";
import TabPermissionsTab from "./tabs/TabPermissionsTab";
import DirectUserCreationTab from "./tabs/DirectUserCreationTab";

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("landing-content");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-destructive" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">Restricted access - Content management, settings & data operations</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} activationMode="manual" className="space-y-6">
          <TabsList className="flex flex-wrap w-full gap-1 h-auto lg:w-auto lg:inline-flex">
            <TabsTrigger value="landing-content" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>Landing Content</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
            <TabsTrigger value="data-management" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Data Management</span>
            </TabsTrigger>
            <TabsTrigger value="database-manager" className="flex items-center gap-2">
              <TableProperties className="h-4 w-4" />
              <span>Database</span>
            </TabsTrigger>
            <TabsTrigger value="visitor-analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Visitors</span>
            </TabsTrigger>
            <TabsTrigger value="tab-permissions" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              <span>Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="create-user" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span>Create User</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="landing-content">
            <LandingContentTab />
          </TabsContent>

          <TabsContent value="settings">
            <SuperAdminSettingsTab />
          </TabsContent>

          <TabsContent value="data-management">
            <DataManagementTab />
          </TabsContent>

          <TabsContent value="database-manager">
            <DatabaseManagerTab />
          </TabsContent>

          <TabsContent value="visitor-analytics">
            <VisitorAnalyticsTab />
          </TabsContent>

          <TabsContent value="tab-permissions">
            <TabPermissionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
