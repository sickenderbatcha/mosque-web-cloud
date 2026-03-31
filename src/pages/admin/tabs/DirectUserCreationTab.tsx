import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserPlus, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FormValues {
  fullName: string;
  memberId: string;
  phone: string;
}

const DirectUserCreationTab = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tempPassword: string; memberId: string; fullName: string } | null>(null);

  const form = useForm<FormValues>({
    defaultValues: { fullName: "", memberId: "", phone: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("create-direct-user", {
        body: values,
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setResult({
        tempPassword: response.data.tempPassword,
        memberId: response.data.memberId,
        fullName: response.data.fullName,
      });
      toast.success("User created successfully");
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create User Directly
          </CardTitle>
          <CardDescription>
            Create a new user account without requiring a matching record in the members table. 
            A temporary password will be generated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
              <FormField
                control={form.control}
                name="fullName"
                rules={{ required: "Full name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memberId"
                rules={{ required: "Member ID / Username is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member ID / Username</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. BACKOFFICE1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                rules={{ required: "Phone number is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create User"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {result && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700 dark:text-green-400">User Created Successfully</AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between bg-background rounded p-2 border">
                <span><strong>Name:</strong> {result.fullName}</span>
              </div>
              <div className="flex items-center justify-between bg-background rounded p-2 border">
                <span><strong>Login ID:</strong> {result.memberId}</span>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(result.memberId)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center justify-between bg-background rounded p-2 border">
                <span><strong>Temp Password:</strong> {result.tempPassword}</span>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(result.tempPassword)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Save these credentials now. The temporary password will not be shown again.
              </AlertDescription>
            </Alert>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default DirectUserCreationTab;
