import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/lib/store";
import { Shield, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      toast.success("Welcome to ANU Gate System");
      navigate("/admin");
    } else {
      toast.error("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      {/* Header bar */}
      <div className="w-full bg-secondary py-3 px-6 flex items-center gap-3 border-b border-secondary-foreground/10">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-heading text-lg font-bold text-primary">
            AFRICA NAZARENE UNIVERSITY
          </h1>
          <p className="text-xs text-secondary-foreground/70">
            Gate Security System
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-xl p-8 border border-border">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Admin Login
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Sign in to manage the gate system
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              <Button type="submit" className="w-full font-heading font-semibold">
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Default: admin / anu2024
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
