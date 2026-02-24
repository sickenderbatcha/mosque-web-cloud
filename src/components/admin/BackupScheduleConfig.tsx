import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Timer, Download, Trash2, RefreshCw, HardDrive, CalendarClock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BackupSchedule, useBackupSchedule } from "@/hooks/useBackupSchedule";
import { useState } from "react";

const SCHEDULE_LABELS: Record<BackupSchedule, string> = {
  disabled: "Disabled",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const RETENTION_OPTIONS = [5, 7, 10, 15, 20, 30];

const BackupScheduleConfig = () => {
  const {
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
    refreshFiles,
  } = useBackupSchedule();

  const [isRunning, setIsRunning] = useState(false);

  const handleRunNow = async () => {
    setIsRunning(true);
    try {
      await triggerManualAutoBackup();
    } finally {
      setIsRunning(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "—";
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <CalendarClock className="h-5 w-5 text-primary flex-shrink-0" />
            <span>Automated Backup Schedule</span>
            <Badge variant={schedule === "disabled" ? "secondary" : "default"}>
              {SCHEDULE_LABELS[schedule]}
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure automatic database backups. Backups are stored securely and old ones are automatically cleaned up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Backup Frequency</label>
              <Select
                value={schedule}
                onValueChange={(val) => saveSchedule(val as BackupSchedule)}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Keep Last N Backups</label>
              <Select
                value={retentionCount.toString()}
                onValueChange={(val) => saveRetention(parseInt(val, 10))}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Retention count" />
                </SelectTrigger>
                <SelectContent>
                  {RETENTION_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} backups
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {lastAutoBackup && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>Last auto-backup: {formatDate(lastAutoBackup)}</span>
              </div>
            )}

            {schedule !== "disabled" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunNow}
                disabled={isRunning}
                className="gap-2"
              >
                <Timer className="h-4 w-4" />
                {isRunning ? "Running..." : "Run Now"}
              </Button>
            )}
          </div>

          {schedule !== "disabled" && (
            <Alert>
              <CalendarClock className="h-4 w-4" />
              <AlertDescription>
                Backups run automatically on a {schedule} schedule. Only database records are included — storage files (images, PDFs) are not backed up.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary flex-shrink-0" />
              <span>Backup History</span>
              <Badge variant="outline">{backupFiles.length} files</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={refreshFiles} disabled={isLoadingFiles} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoadingFiles ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <CardDescription>
            Download or delete previous automated backups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingFiles ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : backupFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No automated backups found. Enable a schedule above to start.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupFiles.map((file) => (
                    <TableRow key={file.name}>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {file.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(file.created_at)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatFileSize(file.size)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadBackupFile(file.name)}
                            className="h-8 w-8 p-0"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBackupFile(file.name)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupScheduleConfig;
