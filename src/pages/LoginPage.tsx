import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { signInWithPhone } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export default function LoginPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav("/app"); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInWithPhone(phone, password);
      nav("/app");
    } catch (err) {
      toast.error((err as Error).message || "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building2 className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle>Mbingo Staff Portal</CardTitle>
          <CardDescription>Your dream house is our design</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required autoFocus
                     autoComplete="tel" placeholder="e.g. 0700604263" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                     autoComplete="current-password" minLength={8} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign In"}</Button>
            <div className="flex justify-between text-sm">
              <Link to="/signup" className="text-primary hover:underline">Create account</Link>
              <Link to="/forgot-password" className="text-muted-foreground hover:text-primary">Forgot password?</Link>
            </div>
            <div className="text-center text-sm text-muted-foreground border-t pt-3">
              <Link to="/" className="hover:text-primary">← Back to website</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
