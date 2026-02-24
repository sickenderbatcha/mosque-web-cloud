import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, Shield, AlertTriangle, CheckCircle2, XCircle, FileJson, Clock, Database, CloudUpload, RefreshCw, Server } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BackupScheduleConfig from "@/components/admin/BackupScheduleConfig";
import SqlExportCard from "@/components/admin/SqlExportCard";

interface RestoreResult {
  status: string;
  restored_by: string;
  restored_at: string;
  total_success: number;
  total_errors: number;
  details: Record<string, { success: number; errors: number; message?: string }>;
}

interface BackupMeta {
  version: string;
  created_at: string;
  created_by: string;
  table_count: number;
  record_counts: Record<string, number>;
}

interface BackupRestoreTabProps {
  onRequestFileUpload: () => void;
  pendingFile: File | null;
  onPendingFileConsumed: () => void;
}

const BackupRestoreTab = ({ onRequestFileUpload, pendingFile, onPendingFileConsumed }: BackupRestoreTabProps) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupMeta | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [lastBackupInfo, setLastBackupInfo] = useState<{ date: string; size: string } | null>(null);
  
  // Backend restore states
  const [storedBackups, setStoredBackups] = useState<Array<{ name: string; created_at: string; size: number }>>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isUploadingToBackend, setIsUploadingToBackend] = useState(false);
  const [isRestoringFromBackend, setIsRestoringFromBackend] = useState(false);
  const [backendRestoreConfirm, setBackendRestoreConfirm] = useState("");
  const [selectedBackendBackup, setSelectedBackendBackup] = useState<string | null>(null);
  const [backendRestoreResult, setBackendRestoreResult] = useState<RestoreResult | null>(null);

  const [isBackingUpToCloud, setIsBackingUpToCloud] = useState(false);

  const performBackup = async (): Promise<any> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to perform backup");
      return null;
    }

    const response = await supabase.functions.invoke("database-backup", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) {
      throw new Error(response.error.message || "Backup failed");
    }

    return response.data;
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const backupData = await performBackup();
      if (!backupData) return;

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `masjid-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const sizeKB = (blob.size / 1024).toFixed(1);
      const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      const sizeStr = blob.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

      setLastBackupInfo({ date: now.toLocaleString("en-IN"), size: sizeStr });
      toast.success(`Backup downloaded successfully (${sizeStr})`);
    } catch (error: any) {
      console.error("Backup error:", error);
      toast.error(error.message || "Failed to create backup");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleBackupToCloud = async () => {
    setIsBackingUpToCloud(true);
    try {
      const backupData = await performBackup();
      if (!backupData) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const uploadFileName = `masjid-backup-${dateStr}.json`;

      const response = await supabase.functions.invoke("restore-from-storage", {
        body: { action: "upload", backupJson: backupData, uploadFileName },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      toast.success("Backup saved to cloud storage successfully!");
      await fetchStoredBackups();
    } catch (error: any) {
      console.error("Cloud backup error:", error);
      toast.error(error.message || "Failed to backup to cloud");
    } finally {
      setIsBackingUpToCloud(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".json")) {
      toast.error("Please select a valid JSON backup file");
      return;
    }

    setSelectedFile(file);
    setRestoreResult(null);
    setRestoreConfirmText("");

    // Parse and preview the backup
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.data || !data.version) {
          toast.error("Invalid backup file format");
          setSelectedFile(null);
          return;
        }
        setBackupPreview({
          version: data.version,
          created_at: data.created_at,
          created_by: data.created_by,
          table_count: data.table_count,
          record_counts: data.record_counts || {},
        });
      } catch {
        toast.error("Failed to parse backup file");
        setSelectedFile(null);
      }
    };
    reader.readAsText(file);
  };

  // Handle file from parent via props
  useEffect(() => {
    if (pendingFile) {
      processFile(pendingFile);
      onPendingFileConsumed();
    }
  }, [pendingFile]);

  const handleRestore = async () => {
    if (restoreConfirmText !== "RESTORE") {
      toast.error('Please type "RESTORE" to confirm');
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a backup file first");
      return;
    }

    setIsRestoring(true);
    setRestoreResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to perform restore");
        return;
      }

      const text = await selectedFile.text();
      const backupData = JSON.parse(text);

      if (!backupData.data || typeof backupData.data !== "object") {
        toast.error("Invalid backup file format");
        return;
      }

      const tables = Object.keys(backupData.data);
      const results: Record<string, { success: number; errors: number; message?: string }> = {};
      let totalSuccess = 0;
      let totalErrors = 0;

      // Process each table one at a time to avoid payload size issues
      for (const table of tables) {
        const rows = backupData.data[table];
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
          results[table] = { success: 0, errors: 0, message: "No data in backup" };
          continue;
        }

        try {
          const response = await supabase.functions.invoke("database-restore", {
            body: { table, rows },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          if (response.error) {
            results[table] = { success: 0, errors: rows.length, message: response.error.message };
            totalErrors += rows.length;
          } else {
            results[table] = {
              success: response.data.success || 0,
              errors: response.data.errors || 0,
              message: response.data.message,
            };
            totalSuccess += response.data.success || 0;
            totalErrors += response.data.errors || 0;
          }
        } catch (e: any) {
          results[table] = { success: 0, errors: rows.length, message: e.message };
          totalErrors += rows.length;
        }

        // Small delay between tables
        await new Promise((r) => setTimeout(r, 100));
      }

      const result: RestoreResult = {
        status: totalErrors === 0 ? "success" : "partial",
        restored_by: session.user.email || session.user.id,
        restored_at: new Date().toISOString(),
        total_success: totalSuccess,
        total_errors: totalErrors,
        details: results,
      };

      setRestoreResult(result);

      if (totalErrors === 0) {
        toast.success(`Restore completed: ${totalSuccess} records restored`);
      } else {
        toast.warning(
          `Restore partial: ${totalSuccess} succeeded, ${totalErrors} errors`
        );
      }
    } catch (error: any) {
      console.error("Restore error:", error);
      toast.error(error.message || "Failed to restore backup");
    } finally {
      setIsRestoring(false);
      setRestoreConfirmText("");
    }
  };

  const resetRestore = () => {
    setSelectedFile(null);
    setBackupPreview(null);
    setRestoreResult(null);
    setRestoreConfirmText("");
    // reset handled by parent
  };

  const totalRecords = backupPreview
    ? Object.values(backupPreview.record_counts).reduce((s, c) => s + c, 0)
    : 0;

  // Backend restore functions
  const fetchStoredBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please login"); return; }

      const response = await supabase.functions.invoke("restore-from-storage", {
        body: { action: "list" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      setStoredBackups(response.data?.backups || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch backups");
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleUploadToBackend = async () => {
    if (!selectedFile) return;
    setIsUploadingToBackend(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please login"); return; }

      const text = await selectedFile.text();
      const backupJson = JSON.parse(text);
      const uploadFileName = selectedFile.name;

      const response = await supabase.functions.invoke("restore-from-storage", {
        body: { action: "upload", backupJson, uploadFileName },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      toast.success("Backup uploaded to backend storage successfully!");
      resetRestore();
      await fetchStoredBackups();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload backup");
    } finally {
      setIsUploadingToBackend(false);
    }
  };

  const handleRestoreFromBackend = async () => {
    if (backendRestoreConfirm !== "RESTORE" || !selectedBackendBackup) return;
    setIsRestoringFromBackend(true);
    setBackendRestoreResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please login"); return; }

      const response = await supabase.functions.invoke("restore-from-storage", {
        body: { action: "restore", fileName: selectedBackendBackup },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      setBackendRestoreResult(response.data);

      if (response.data.total_errors === 0) {
        toast.success(`Restore completed: ${response.data.total_success} records restored`);
      } else {
        toast.warning(`Restore partial: ${response.data.total_success} succeeded, ${response.data.total_errors} errors`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to restore from backend");
    } finally {
      setIsRestoringFromBackend(false);
      setBackendRestoreConfirm("");
    }
  };

  // Auto-fetch stored backups on mount
  useEffect(() => {
    fetchStoredBackups();
  }, []);

  return (
    <div className="space-y-6">
      {/* Automated Backup Schedule */}
      <BackupScheduleConfig />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Download className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Database Backup</span>
          </CardTitle>
          <CardDescription>
            Download a complete backup of all database tables as a JSON file. Storage files (images, PDFs) are not included.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertTitle>Backup Contents</AlertTitle>
            <AlertDescription>
              All 32 database tables will be backed up. Storage files (images, PDFs) are not included.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
            <Button
              onClick={handleBackup}
              disabled={isBackingUp || isBackingUpToCloud}
              size="lg"
              className="gap-2 h-auto py-2 px-4 text-left whitespace-normal"
            >
              <Download className="h-4 w-4 flex-shrink-0" />
              <span>{isBackingUp ? "Backing up..." : "Download Backup"}</span>
            </Button>

            <Button
              onClick={handleBackupToCloud}
              disabled={isBackingUp || isBackingUpToCloud}
              size="lg"
              variant="secondary"
              className="gap-2 h-auto py-2 px-4 text-left whitespace-normal"
            >
              <CloudUpload className="h-4 w-4 flex-shrink-0" />
              <span>{isBackingUpToCloud ? "Saving to Cloud..." : "Backup to Cloud"}</span>
            </Button>

            {lastBackupInfo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Last backup: {lastBackupInfo.date} ({lastBackupInfo.size})
                </span>
              </div>
            )}
          </div>

          {isBackingUp && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Fetching data from all tables...</p>
              <Progress value={undefined} className="animate-pulse" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Upload className="h-5 w-5 text-destructive flex-shrink-0" />
            <span>Database Restore</span>
          </CardTitle>
          <CardDescription>
            Restore data from a previous backup file. Existing records will be updated (upsert).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Restore will overwrite existing data. Take a fresh backup before performing this action.
            </AlertDescription>
          </Alert>

          {/* File selection */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={onRequestFileUpload}
                disabled={isRestoring}
                className="gap-2 h-auto py-2 px-4"
              >
                <FileJson className="h-4 w-4 flex-shrink-0" />
                <span>Select Backup File</span>
              </Button>
              {selectedFile && (
                <Button variant="ghost" onClick={resetRestore} disabled={isRestoring}>
                  Clear
                </Button>
              )}
            </div>

            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Backup Preview */}
          {backupPreview && (
            <Card className="bg-muted/50">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base">Backup File Preview</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Version</p>
                    <p className="font-medium">{backupPreview.version}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(backupPreview.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tables</p>
                    <p className="font-medium">{backupPreview.table_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Records</p>
                    <p className="font-medium">{totalRecords.toLocaleString()}</p>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table</TableHead>
                        <TableHead className="text-right">Records</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(backupPreview.record_counts)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([table, count]) => (
                          <TableRow key={table}>
                            <TableCell className="font-mono text-xs">{table}</TableCell>
                            <TableCell className="text-right">{count.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Restore confirmation */}
          {backupPreview && !restoreResult && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Shield className="h-4 w-4 text-destructive flex-shrink-0" />
                <span className="text-sm font-medium">
                  Type "RESTORE" to confirm
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 max-w-sm">
                <Input
                  value={restoreConfirmText}
                  onChange={(e) => setRestoreConfirmText(e.target.value.toUpperCase())}
                  placeholder='Type "RESTORE"'
                  disabled={isRestoring}
                  className="font-mono"
                />
                <Button
                  variant="destructive"
                  onClick={handleRestore}
                  disabled={isRestoring || restoreConfirmText !== "RESTORE"}
                  className="gap-2 h-auto py-2 px-4 whitespace-nowrap"
                >
                  <Upload className="h-4 w-4 flex-shrink-0" />
                  <span>{isRestoring ? "Restoring..." : "Restore"}</span>
                </Button>
              </div>
            </div>
          )}

          {isRestoring && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Restoring data to database tables...</p>
              <Progress value={undefined} className="animate-pulse" />
            </div>
          )}

          {/* Restore Results */}
          {restoreResult && (
            <Card className={restoreResult.total_errors === 0 ? "border-primary/50" : "border-destructive/50"}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  {restoreResult.total_errors === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                  Restore Results
                  <Badge variant={restoreResult.total_errors === 0 ? "default" : "destructive"}>
                    {restoreResult.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Records Restored</p>
                    <p className="font-medium text-primary">
                      {restoreResult.total_success.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Errors</p>
                    <p className={`font-medium ${restoreResult.total_errors > 0 ? "text-destructive" : ""}`}>
                      {restoreResult.total_errors.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table</TableHead>
                        <TableHead className="text-right">Success</TableHead>
                        <TableHead className="text-right">Errors</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(restoreResult.details)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([table, detail]) => (
                          <TableRow key={table}>
                            <TableCell className="font-mono text-xs">{table}</TableCell>
                            <TableCell className="text-right">{detail.success}</TableCell>
                            <TableCell className="text-right">
                              {detail.errors > 0 ? (
                                <span className="text-destructive">{detail.errors}</span>
                              ) : (
                                detail.errors
                              )}
                            </TableCell>
                            <TableCell>
                              {detail.errors === 0 && detail.success > 0 ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              ) : detail.errors > 0 ? (
                                <XCircle className="h-4 w-4 text-destructive" />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Backend Restore Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Server className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Restore from Backend Storage</span>
          </CardTitle>
          <CardDescription>
            Restore from backups saved to cloud storage. Use the "Backup to Cloud" button above to save backups first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* List & Restore from stored backups */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h4 className="text-sm font-semibold">Select & Restore from Cloud</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchStoredBackups}
                disabled={isLoadingBackups}
                className="gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingBackups ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {storedBackups.length === 0 && !isLoadingBackups && (
              <p className="text-sm text-muted-foreground">No backups found in cloud storage. Use the "Backup to Cloud" button above to save one first.</p>
            )}

            {storedBackups.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Backup File</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storedBackups.map((backup) => (
                      <TableRow key={backup.name}>
                        <TableCell className="font-mono text-xs">
                          {backup.name}
                          <br />
                          <span className="text-muted-foreground">
                            {new Date(backup.created_at).toLocaleString("en-IN")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {backup.size > 1024 * 1024
                            ? (backup.size / (1024 * 1024)).toFixed(2) + " MB"
                            : (backup.size / 1024).toFixed(1) + " KB"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={selectedBackendBackup === backup.name ? "default" : "outline"}
                            onClick={() => {
                              setSelectedBackendBackup(backup.name);
                              setBackendRestoreConfirm("");
                              setBackendRestoreResult(null);
                            }}
                          >
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedBackendBackup && !backendRestoreResult && (
              <div className="space-y-3 pt-2">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Confirm Restore</AlertTitle>
                  <AlertDescription>
                    Restoring <strong>{selectedBackendBackup}</strong> will overwrite existing data.
                  </AlertDescription>
                </Alert>
                <div className="flex items-center gap-2 flex-wrap">
                  <Shield className="h-4 w-4 text-destructive flex-shrink-0" />
                  <span className="text-sm font-medium">Type "RESTORE" to confirm</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 max-w-sm">
                  <Input
                    value={backendRestoreConfirm}
                    onChange={(e) => setBackendRestoreConfirm(e.target.value.toUpperCase())}
                    placeholder='Type "RESTORE"'
                    disabled={isRestoringFromBackend}
                    className="font-mono"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleRestoreFromBackend}
                    disabled={isRestoringFromBackend || backendRestoreConfirm !== "RESTORE"}
                    className="gap-2 h-auto py-2 px-4 whitespace-nowrap"
                  >
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span>{isRestoringFromBackend ? "Restoring..." : "Restore from Backend"}</span>
                  </Button>
                </div>
              </div>
            )}

            {isRestoringFromBackend && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Restoring all tables from backend... This may take a minute.</p>
                <Progress value={undefined} className="animate-pulse" />
              </div>
            )}

            {/* Backend Restore Results */}
            {backendRestoreResult && (
              <Card className={backendRestoreResult.total_errors === 0 ? "border-primary/50" : "border-destructive/50"}>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    {backendRestoreResult.total_errors === 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                    Restore Results
                    <Badge variant={backendRestoreResult.total_errors === 0 ? "default" : "destructive"}>
                      {backendRestoreResult.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Records Restored</p>
                      <p className="font-medium text-primary">
                        {backendRestoreResult.total_success.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Errors</p>
                      <p className={`font-medium ${backendRestoreResult.total_errors > 0 ? "text-destructive" : ""}`}>
                        {backendRestoreResult.total_errors.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {backendRestoreResult.details && (
                    <div className="max-h-64 overflow-y-auto rounded border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Table</TableHead>
                            <TableHead className="text-right">Success</TableHead>
                            <TableHead className="text-right">Errors</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(backendRestoreResult.details).map(([table, detail]) => (
                            <TableRow key={table}>
                              <TableCell className="font-mono text-xs">{table}</TableCell>
                              <TableCell className="text-right">{detail.success}</TableCell>
                              <TableCell className="text-right">{detail.errors}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
      {/* SQL Export */}
      <SqlExportCard />
    </div>
  );
};

export default BackupRestoreTab;
