import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Result = { ok: boolean; message: string };

const AdminSetupPage = () => {
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState<"admin" | "superadmin" | null>(null);
  const [adminResult, setAdminResult] = useState<Result | null>(null);
  const [superadminResult, setSuperadminResult] = useState<Result | null>(null);

  const trimmedKey = useMemo(() => secretKey.trim(), [secretKey]);

  const run = async (which: "admin" | "superadmin") => {
    if (!trimmedKey) {
      toast.error("Secret key required", { description: "Please paste the setup secret key and try again." });
      return;
    }

    setLoading(which);
    try {
      const fnName = which === "admin" ? "setup-admin" : "setup-superadmin";
      const res = await supabase.functions.invoke(fnName, {
        body: { secretKey: trimmedKey },
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      const message = (res.data?.message as string) || "Success";
      const ok = !!res.data?.success;

      const result: Result = { ok, message };
      if (which === "admin") setAdminResult(result);
      else setSuperadminResult(result);

      toast.success("Completed", { description: message });
    } catch (e: any) {
      const msg = e?.message || "Failed";
      const result: Result = { ok: false, message: msg };
      if (which === "admin") setAdminResult(result);
      else setSuperadminResult(result);

      toast.error("Setup failed", { description: msg });
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Admin Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Use this page to (re)create/reset the ADMIN and SUPUSR accounts using your setup secret keys.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Setup Secret Key</CardTitle>
          <CardDescription>
            Paste the setup secret key you saved in the backend secrets. This is required to run the setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="secretKey">Secret key</Label>
            <Input
              id="secretKey"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Paste secret key"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Tip: You can run Admin first, then Superadmin.
            </p>
          </div>

          <Separator />

          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-medium">Create/Reset ADMIN</h2>
                <p className="text-sm text-muted-foreground">Resets password if the account already exists.</p>
              </div>
              <Button onClick={() => run("admin")} disabled={loading !== null}>
                {loading === "admin" ? "Working…" : "Run setup-admin"}
              </Button>
            </div>
            {adminResult && (
              <div className={adminResult.ok ? "text-sm" : "text-sm text-destructive"}>
                {adminResult.message}
              </div>
            )}
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-medium">Create/Reset SUPUSR</h2>
                <p className="text-sm text-muted-foreground">Resets password if the account already exists.</p>
              </div>
              <Button onClick={() => run("superadmin")} disabled={loading !== null} variant="secondary">
                {loading === "superadmin" ? "Working…" : "Run setup-superadmin"}
              </Button>
            </div>
            {superadminResult && (
              <div className={superadminResult.ok ? "text-sm" : "text-sm text-destructive"}>
                {superadminResult.message}
              </div>
            )}
          </section>

          <Separator />

          <div className="text-sm text-muted-foreground">
            After running setup, go to <Link className="underline" to="/login">Login</Link> and sign in using the membership number
            (e.g. <span className="font-medium">ADMIN</span> or <span className="font-medium">SUPUSR</span>) and the password shown above.
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default AdminSetupPage;
