import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type BackupSchedule = "disabled" | "daily" | "weekly" | "monthly";

interface BackupFile {
  name: string;
  created_at: string;
  size: number;
}

export const useBackupSchedule = () => {
  const [schedule, setSchedule] = useState<BackupSchedule>("disabled");
  const [retentionCount, setRetentionCount] = useState(10);
  const [lastAutoBackup, setLastAutoBackup] = useState<string | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["backup_schedule", "backup_retention_count", "last_auto_backup"]);

      if (data) {
        for (const setting of data) {
          if (setting.key === "backup_schedule") {
            setSchedule(setting.value as BackupSchedule);
          } else if (setting.key === "backup_retention_count") {
            setRetentionCount(parseInt(setting.value, 10) || 10);
          } else if (setting.key === "last_auto_backup") {
            setLastAutoBackup(setting.value);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch backup settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBackupFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.storage
        .from("database-backups")
        .list("", { sortBy: { column: "created_at", order: "desc" }, limit: 50 });

      if (error) {
        console.error("Failed to list backup files:", error);
        return;
      }

      setBackupFiles(
        (data || [])
          .filter((f) => f.name.endsWith(".json"))
          .map((f) => ({
            name: f.name,
            created_at: f.created_at,
            size: f.metadata?.size || 0,
          }))
      );
    } catch (error) {
      console.error("Failed to fetch backup files:", error);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchBackupFiles();
  }, [fetchSettings, fetchBackupFiles]);

  const saveSchedule = async (newSchedule: BackupSchedule) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          {
            key: "backup_schedule",
            value: newSchedule,
            description: "Automated backup schedule: disabled, daily, weekly, or monthly",
          },
          { onConflict: "key" }
        );

      if (error) throw error;

      setSchedule(newSchedule);
      toast.success(`Backup schedule set to ${newSchedule}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to save schedule");
    } finally {
      setIsSaving(false);
    }
  };

  const saveRetention = async (count: number) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          {
            key: "backup_retention_count",
            value: count.toString(),
            description: "Number of automated backups to retain",
          },
          { onConflict: "key" }
        );

      if (error) throw error;

      setRetentionCount(count);
      toast.success(`Retention set to ${count} backups`);
    } catch (error: any) {
      toast.error(error.message || "Failed to save retention");
    } finally {
      setIsSaving(false);
    }
  };

  const downloadBackupFile = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("database-backups")
        .download(fileName);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Backup downloaded");
    } catch (error: any) {
      toast.error(error.message || "Failed to download backup");
    }
  };

  const deleteBackupFile = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from("database-backups")
        .remove([fileName]);

      if (error) throw error;

      setBackupFiles((prev) => prev.filter((f) => f.name !== fileName));
      toast.success("Backup deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete backup");
    }
  };

  const triggerManualAutoBackup = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login first");
        return;
      }

      const response = await supabase.functions.invoke("auto-backup", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);

      if (response.data?.status === "completed") {
        toast.success(`Auto-backup completed: ${response.data.total_records} records`);
        fetchBackupFiles();
        fetchSettings();
      } else if (response.data?.status === "skipped") {
        toast.info(response.data.reason);
      }

      return response.data;
    } catch (error: any) {
      toast.error(error.message || "Auto-backup failed");
      throw error;
    }
  };

  return {
    schedule,
    retentionCount,
    lastAutoBackup,
    backupFiles,
    isLoading,
    isSaving,
    isLoadingFiles,
    saveSchedule,
    saveRetention,
    downloadBackupFile,
    deleteBackupFile,
    triggerManualAutoBackup,
    refreshFiles: fetchBackupFiles,
  };
};
