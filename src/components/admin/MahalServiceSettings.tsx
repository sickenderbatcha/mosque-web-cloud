import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { upsertAppSetting } from "@/lib/appSettingsUtils";
import {
  MAHAL_SERVICES_KEY,
  LEGACY_MAHAL_RATE_KEYS,
  MahalService,
  generateMahalServiceId,
  resolveMahalServices,
  serializeMahalServices,
} from "@/lib/mahalServiceSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TamilInput } from "@/components/ui/tamil-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowDown, ArrowUp, Pencil, Plus, Save, Trash2 } from "lucide-react";

const MahalServiceSettings = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<MahalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTamil, setFormTamil] = useState("");
  const [formEnglish, setFormEnglish] = useState("");
  const [formRate, setFormRate] = useState("");

  const loadServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [MAHAL_SERVICES_KEY, ...LEGACY_MAHAL_RATE_KEYS]);
      if (error) throw error;

      const map: Record<string, string> = {};
      (data || []).forEach((row) => {
        map[row.key] = row.value;
      });
      setServices(resolveMahalServices(map[MAHAL_SERVICES_KEY], map));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load booking services.",
        variant: "destructive",
      });
      setServices(resolveMahalServices(null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddDialog = () => {
    setEditingId(null);
    setFormTamil("");
    setFormEnglish("");
    setFormRate("");
    setDialogOpen(true);
  };

  const openEditDialog = (service: MahalService) => {
    setEditingId(service.id);
    setFormTamil(service.nameTamil);
    setFormEnglish(service.nameEnglish);
    setFormRate(String(service.rate));
    setDialogOpen(true);
  };

  const applyDialog = () => {
    const rate = Number(formRate);
    if (!formTamil.trim() && !formEnglish.trim()) {
      toast({
        title: "Name required",
        description: "Enter at least a Tamil or English service name.",
        variant: "destructive",
      });
      return;
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      toast({
        title: "Invalid rate",
        description: "Rate must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    setServices((prev) => {
      if (editingId) {
        return prev.map((s) =>
          s.id === editingId
            ? { ...s, nameTamil: formTamil.trim(), nameEnglish: formEnglish.trim(), rate }
            : s
        );
      }
      return [
        ...prev,
        {
          id: generateMahalServiceId(),
          nameTamil: formTamil.trim(),
          nameEnglish: formEnglish.trim(),
          rate,
          sortOrder: prev.length,
        },
      ];
    });
    setDialogOpen(false);
  };

  const removeService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const moveService = (index: number, direction: -1 | 1) => {
    setServices((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, sortOrder: i }));
    });
  };

  const saveServices = async () => {
    if (services.length === 0) {
      toast({
        title: "At least one service required",
        description: "Add a service before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await upsertAppSetting(
        MAHAL_SERVICES_KEY,
        serializeMahalServices(services),
        "Mahal booking services (names and rates)"
      );
      toast({
        title: "Saved",
        description: "Mahal booking services updated.",
      });
      loadServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save booking services.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading services...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {services.map((service, index) => (
          <div
            key={service.id}
            className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium break-words">{service.nameTamil || "—"}</p>
              <p className="text-sm text-muted-foreground break-words">
                {service.nameEnglish || "—"}
              </p>
              <p className="text-xl font-bold mt-1">₹{service.rate}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => moveService(index, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Move down"
                disabled={index === services.length - 1}
                onClick={() => moveService(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => openEditDialog(service)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => removeService(service.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <p className="text-sm text-muted-foreground">No services configured yet.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
        <Button onClick={saveServices} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Services"}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>
              Set the Tamil name, English name and rate shown on the Mahal booking page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="serviceNameTamil">Tamil Name (தமிழ் பெயர்)</Label>
              <TamilInput
                id="serviceNameTamil"
                value={formTamil}
                onChange={(value) => setFormTamil(value)}
                placeholder="மண்டபம்"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceNameEnglish">English Name</Label>
              <Input
                id="serviceNameEnglish"
                value={formEnglish}
                onChange={(e) => setFormEnglish(e.target.value)}
                placeholder="Hall"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceRate">Rate (₹)</Label>
              <Input
                id="serviceRate"
                type="number"
                min="0"
                value={formRate}
                onChange={(e) => setFormRate(e.target.value)}
                placeholder="15000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyDialog}>{editingId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MahalServiceSettings;
