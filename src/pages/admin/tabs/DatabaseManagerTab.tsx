import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Database, RefreshCw, Plus, Trash2, Save, FileCode, Play, Download,
  ChevronLeft, ChevronRight, Loader2, Search, AlertTriangle
} from "lucide-react";

interface TableMeta {
  table_name: string;
  row_count: number;
}

interface ColumnMeta {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  is_primary_key: boolean;
}

const DatabaseManagerTab = () => {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [columns, setColumns] = useState<ColumnMeta[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [editedCells, setEditedCells] = useState<Record<string, Record<string, any>>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sqlInput, setSqlInput] = useState("");
  const [sqlResult, setSqlResult] = useState<string>("");
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [newRows, setNewRows] = useState<any[]>([]);

  const callEdgeFunction = useCallback(async (action: string, extraData: any = {}) => {
    const { data, error } = await supabase.functions.invoke("admin-database-manager", {
      body: { action, ...extraData },
    });
    if (error) throw new Error(error.message || "Edge function error");
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const fetchTables = useCallback(async () => {
    setTableLoading(true);
    try {
      const data = await callEdgeFunction("list_tables");
      setTables(data.tables || []);
    } catch (err: any) {
      toast.error("Failed to load tables: " + err.message);
    } finally {
      setTableLoading(false);
    }
  }, [callEdgeFunction]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const fetchColumns = useCallback(async (table: string) => {
    try {
      const data = await callEdgeFunction("get_columns", { table });
      setColumns(data.columns || []);
    } catch (err: any) {
      toast.error("Failed to load columns: " + err.message);
    }
  }, [callEdgeFunction]);

  const fetchRows = useCallback(async (table: string, pg: number) => {
    setLoading(true);
    try {
      const data = await callEdgeFunction("fetch_rows", { table, page: pg, pageSize });
      setRows(data.rows || []);
      setTotalRows(data.total || 0);
    } catch (err: any) {
      toast.error("Failed to load rows: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [callEdgeFunction, pageSize]);

  const handleTableSelect = async (table: string) => {
    setSelectedTable(table);
    setPage(1);
    setEditedCells({});
    setSelectedIds(new Set());
    setNewRows([]);
    setEditingCell(null);
    await Promise.all([fetchColumns(table), fetchRows(table, 1)]);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchRows(selectedTable, newPage);
  };

  const handleCellEdit = (rowId: string, col: string, value: any) => {
    setEditedCells(prev => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), [col]: value },
    }));
  };

  const handleNewRowChange = (index: number, col: string, value: any) => {
    setNewRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [col]: value };
      return updated;
    });
  };

  const handleAddRow = () => {
    const emptyRow: any = { _isNew: true, _tempId: `new-${Date.now()}` };
    columns.forEach(c => {
      if (c.column_name === "id") emptyRow[c.column_name] = "";
      else emptyRow[c.column_name] = "";
    });
    setNewRows(prev => [...prev, emptyRow]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    // Separate new rows from existing rows
    const newRowIds = ids.filter(id => id.startsWith("new-"));
    const existingIds = ids.filter(id => !id.startsWith("new-"));

    if (newRowIds.length > 0) {
      setNewRows(prev => prev.filter(r => !newRowIds.includes(r._tempId)));
    }

    if (existingIds.length > 0) {
      try {
        await callEdgeFunction("delete_rows", { table: selectedTable, ids: existingIds });
        toast.success(`Deleted ${existingIds.length} row(s)`);
        fetchRows(selectedTable, page);
      } catch (err: any) {
        toast.error("Delete failed: " + err.message);
      }
    }
    setSelectedIds(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save edited rows
      const editPromises = Object.entries(editedCells).map(([id, data]) =>
        callEdgeFunction("update_row", { table: selectedTable, id, data })
      );

      // Save new rows
      const insertPromises = newRows
        .filter(r => {
          // Only insert if at least one field has a value
          return columns.some(c => r[c.column_name] && r[c.column_name] !== "");
        })
        .map(r => {
          const cleanData: any = {};
          columns.forEach(c => {
            const val = r[c.column_name];
            if (val !== "" && val !== undefined && val !== null) {
              cleanData[c.column_name] = val;
            }
          });
          return callEdgeFunction("insert_row", { table: selectedTable, data: cleanData });
        });

      await Promise.all([...editPromises, ...insertPromises]);
      toast.success("Changes saved successfully");
      setEditedCells({});
      setNewRows([]);
      fetchRows(selectedTable, page);
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRunSql = async () => {
    if (!sqlInput.trim()) return;
    setSqlResult("Running...");
    try {
      const data = await callEdgeFunction("run_sql", { sql: sqlInput });
      const resultText = data.rows?.length
        ? `Affected ${data.rowCount ?? 0} row(s).\n\n${JSON.stringify(data.rows, null, 2)}`
        : `Success. Affected ${data.rowCount ?? 0} row(s).`;
      setSqlResult(resultText);
      toast.success("SQL executed successfully");
      if (selectedTable) fetchRows(selectedTable, page);
    } catch (err: any) {
      setSqlResult("Error: " + err.message);
      toast.error("SQL error: " + err.message);
    }
  };

  const handleExportSql = async () => {
    if (!selectedTable) return;
    try {
      const data = await callEdgeFunction("export_sql", { table: selectedTable });
      const blob = new Blob([data.sql], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedTable}-export-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("SQL exported successfully");
    } catch (err: any) {
      toast.error("Export failed: " + err.message);
    }
  };

  const getCellValue = (row: any, col: string) => {
    const rowId = row.id;
    if (editedCells[rowId]?.[col] !== undefined) return editedCells[rowId][col];
    return row[col];
  };

  const formatCellDisplay = (value: any): string => {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
  };

  const toggleSelectAll = () => {
    const allIds = [
      ...rows.map(r => r.id),
      ...newRows.map(r => r._tempId),
    ];
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPages = Math.ceil(totalRows / pageSize);
  const hasChanges = Object.keys(editedCells).length > 0 || newRows.length > 0;
  const filteredTables = tables.filter(t =>
    t.table_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleColumns = columns.filter(c => c.column_name !== "id");
  const idColumn = columns.find(c => c.column_name === "id");

  if (tableLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading tables...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Database Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 max-w-xs">
              <Select value={selectedTable} onValueChange={handleTableSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a table..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Search tables..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                  <ScrollArea className="h-[300px]">
                    {filteredTables.map(t => (
                      <SelectItem key={t.table_name} value={t.table_name}>
                        <span className="flex items-center gap-2">
                          {t.table_name}
                          <Badge variant="secondary" className="text-xs ml-1">
                            {t.row_count ?? 0}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            
            {selectedTable && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchRows(selectedTable, page)}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleAddRow}>
                  <Plus className="h-4 w-4 mr-1" /> Add Row
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete ({selectedIds.size})
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                {hasChanges && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditedCells({});
                      setNewRows([]);
                      setEditingCell(null);
                      toast.info("Changes discarded");
                    }}
                  >
                    Discard
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExportSql}>
                  <Download className="h-4 w-4 mr-1" /> Export SQL
                </Button>
                <Dialog open={sqlDialogOpen} onOpenChange={setSqlDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4 mr-1" /> Run SQL
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FileCode className="h-5 w-5" /> SQL Runner
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Warning: SQL runs directly on the database. Use with caution.</span>
                      </div>
                      <Textarea
                        value={sqlInput}
                        onChange={e => setSqlInput(e.target.value)}
                        placeholder="Enter SQL statement..."
                        className="font-mono text-sm min-h-[120px]"
                      />
                      {sqlResult && (
                        <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                          {sqlResult}
                        </pre>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSqlDialogOpen(false)}>Close</Button>
                      <Button onClick={handleRunSql} disabled={!sqlInput.trim()}>
                        <Play className="h-4 w-4 mr-1" /> Execute
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {selectedTable && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="overflow-auto max-h-[70vh]">
                  <div className="min-w-max">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={selectedIds.size > 0 && selectedIds.size === rows.length + newRows.length}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          {idColumn && (
                            <TableHead className="text-xs font-semibold max-w-[120px]">
                              id
                              <span className="block text-[10px] text-muted-foreground font-normal">PK</span>
                            </TableHead>
                          )}
                          {visibleColumns.map(col => (
                            <TableHead key={col.column_name} className="text-xs font-semibold">
                              {col.column_name}
                              <span className="block text-[10px] text-muted-foreground font-normal">
                                {col.data_type}
                              </span>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map(row => (
                          <TableRow key={row.id} className={editedCells[row.id] ? "bg-primary/5" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(row.id)}
                                onCheckedChange={() => toggleSelect(row.id)}
                              />
                            </TableCell>
                            {idColumn && (
                              <TableCell className="text-xs font-mono text-muted-foreground max-w-[120px] truncate">
                                {String(row.id).slice(0, 8)}...
                              </TableCell>
                            )}
                            {visibleColumns.map(col => {
                              const isEditing = editingCell?.rowId === row.id && editingCell?.col === col.column_name;
                              const cellVal = getCellValue(row, col.column_name);
                              return (
                                <TableCell
                                  key={col.column_name}
                                  className="p-1 max-w-[200px]"
                                  onDoubleClick={() =>
                                    setEditingCell({ rowId: row.id, col: col.column_name })
                                  }
                                >
                                  {isEditing ? (
                                    <Input
                                      value={cellVal === null ? "" : String(cellVal)}
                                      onChange={e => handleCellEdit(row.id, col.column_name, e.target.value || null)}
                                      onBlur={() => setEditingCell(null)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") setEditingCell(null);
                                        if (e.key === "Escape") {
                                          // Revert
                                          setEditedCells(prev => {
                                            const next = { ...prev };
                                            if (next[row.id]) {
                                              delete next[row.id][col.column_name];
                                              if (Object.keys(next[row.id]).length === 0) delete next[row.id];
                                            }
                                            return next;
                                          });
                                          setEditingCell(null);
                                        }
                                      }}
                                      autoFocus
                                      className="h-7 text-xs"
                                    />
                                  ) : (
                                    <span
                                      className={`text-xs truncate block cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded ${
                                        editedCells[row.id]?.[col.column_name] !== undefined
                                          ? "bg-yellow-100 dark:bg-yellow-900/30"
                                          : ""
                                      } ${cellVal === null ? "text-muted-foreground italic" : ""}`}
                                      title={formatCellDisplay(cellVal)}
                                    >
                                      {formatCellDisplay(cellVal)}
                                    </span>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}

                        {/* New rows */}
                        {newRows.map((row, idx) => (
                          <TableRow key={row._tempId} className="bg-primary/5">
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(row._tempId)}
                                onCheckedChange={() => toggleSelect(row._tempId)}
                              />
                            </TableCell>
                            {idColumn && (
                              <TableCell className="text-xs text-muted-foreground italic">
                                auto
                              </TableCell>
                            )}
                            {visibleColumns.map(col => (
                              <TableCell key={col.column_name} className="p-1">
                                <Input
                                  value={row[col.column_name] || ""}
                                  onChange={e => handleNewRowChange(idx, col.column_name, e.target.value)}
                                  placeholder={col.column_default ? "default" : col.is_nullable === "YES" ? "null" : "required"}
                                  className="h-7 text-xs"
                                />
                              </TableCell>
                            ))}
                            
                          </TableRow>
                        ))}

                        {rows.length === 0 && newRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={visibleColumns.length + 3} className="text-center py-8 text-muted-foreground">
                              No records found in this table
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      Page {page} of {totalPages} · {totalRows} total rows
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Column Info */}
      {selectedTable && columns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Column Schema ({columns.length} columns)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {columns.map(col => (
                <Badge
                  key={col.column_name}
                  variant={col.is_primary_key ? "default" : "outline"}
                  className="text-xs"
                >
                  {col.column_name}
                  <span className="ml-1 opacity-60">{col.data_type}</span>
                  {col.is_nullable === "NO" && <span className="ml-1 text-destructive">*</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DatabaseManagerTab;
