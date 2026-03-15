import { useState } from "react";
import { Shield, Globe, Database, Settings, TableProperties, Landmark } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataManagementTab from "./tabs/DataManagementTab";
import LandingContentTab from "./tabs/LandingContentTab";
import SuperAdminSettingsTab from "./tabs/SuperAdminSettingsTab";
import DatabaseManagerTab from "./tabs/DatabaseManagerTab";
import BelongToUsTab from "./tabs/BelongToUsTab";

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
            <TabsTrigger value="belong-to-us" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              <span>Belong To Us</span>
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
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
