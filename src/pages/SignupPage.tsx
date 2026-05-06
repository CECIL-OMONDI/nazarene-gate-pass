import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", role: "contractor", password: "", confirm: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error("Passwords don't match");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("signup-request", {
        body: {
          full_name: form.full_name, phone: form.phone,
          email: form.email || null, role: form.role, password: form.password,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDone(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Request submitted</CardTitle>
            <CardDescription>
              Your account is awaiting administrator approval. You'll be able to sign in once an admin approves your request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => nav("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building2 className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Your dream house is our design</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div><Label>Phone Number *</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                     required placeholder="e.g. 0700604263" />
            </div>
            <div><Label>Email (optional)</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                     placeholder="Used for password reset" />
            </div>
            <div><Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineer">Engineer</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="yard_storekeeper">Yard Storekeeper</SelectItem>
                  <SelectItem value="site_storekeeper">Site Storekeeper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Password *</Label>
              <Input type="password" minLength={8} value={form.password}
                     onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div><Label>Confirm Password *</Label>
              <Input type="password" minLength={8} value={form.confirm}
                     onChange={e => setForm({ ...form, confirm: e.target.value })} required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Submitting…" : "Request Account"}
            </Button>
            <div className="text-center text-sm text-muted-foreground border-t pt-3">
              Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
