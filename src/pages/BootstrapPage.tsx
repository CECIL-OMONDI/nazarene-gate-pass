import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BootstrapPage() {
  const nav = useNavigate();
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [n, setN] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
        body: { username: u, password: p, full_name: n },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Admin account created. You can now log in.");
      nav("/login");
    } catch (err) {
      toast.error((err as Error).message || "Bootstrap failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create First Admin</CardTitle>
          <CardDescription>This page only works once — when no admin exists yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label>Full name</Label><Input value={n} onChange={e => setN(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Username</Label><Input value={u} onChange={e => setU(e.target.value)} required placeholder="e.g. admin" /></div>
            <div className="space-y-2"><Label>Password (min 8)</Label><Input type="password" value={p} onChange={e => setP(e.target.value)} required minLength={8} /></div>
            <Button className="w-full" disabled={busy}>{busy ? "Creating…" : "Create Admin"}</Button>
            <div className="text-center text-sm"><Link to="/login" className="text-muted-foreground hover:text-primary">Back to login</Link></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
