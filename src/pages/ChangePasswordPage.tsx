import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [pw, setPw] = useState(""); const [c, setC] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav("/login"); }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== c) return toast.error("Passwords don't match");
    if (pw.length < 8) return toast.error("Min 8 characters");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("change-password", { body: { password: pw } });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error(error?.message || (data as any).error);
    toast.success("Password changed"); setPw(""); setC("");
    nav("/app");
  };

  return (
    <AppShell title="Change Password">
      <Card className="max-w-md">
        <CardHeader><CardTitle>Update your password</CardTitle>
          <CardDescription>Choose a new password (at least 8 characters).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>New Password</Label><Input type="password" minLength={8} value={pw} onChange={e=>setPw(e.target.value)} required /></div>
            <div><Label>Confirm</Label><Input type="password" minLength={8} value={c} onChange={e=>setC(e.target.value)} required /></div>
            <Button className="w-full" disabled={busy}>{busy?"Saving…":"Change Password"}</Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
