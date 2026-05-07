import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, usePrimaryRole } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  engineer: "Engineer",
  yard_storekeeper: "Yard Storekeeper",
  contractor: "Contractor",
  site_storekeeper: "Site Storekeeper",
};

export default function AppShell({ children, title, backTo }: { children: ReactNode; title: string; backTo?: string }) {
  const { user } = useAuth();
  const role = usePrimaryRole();
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.full_name ?? user.email?.split("@")[0] ?? ""));
  }, [user]);

  const handleLogout = async () => { await signOut(); nav("/"); };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="container mx-auto flex items-center justify-between gap-2 py-3 px-3 sm:px-4">
          <Link to="/app" className="flex items-center gap-2 min-w-0">
            <Building2 className="h-6 w-6 shrink-0 text-primary" />
            <span className="font-semibold text-sm sm:text-base truncate">Mbingo Construction</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium truncate max-w-[160px]">{displayName}</div>
              <div className="text-xs text-muted-foreground">{role ? ROLE_LABEL[role] : ""}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="px-2">
              <LogOut className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full container mx-auto p-3 sm:p-4">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
          {backTo && (
            <Button variant="outline" size="sm" asChild>
              <Link to={backTo}><ArrowLeft className="h-4 w-4 mr-1" />Back to Admin</Link>
            </Button>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
