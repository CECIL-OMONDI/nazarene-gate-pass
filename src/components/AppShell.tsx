import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, LogOut, ArrowLeft, Sun, Moon, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, usePrimaryRole } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  engineer: "Engineer",
  yard_storekeeper: "Yard Storekeeper",
  contractor: "Contractor",
  site_storekeeper: "Site Storekeeper",
};

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    (localStorage.getItem("theme") as "light" | "dark") || "light");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}

export default function AppShell({ children, title, backTo }: { children: ReactNode; title: string; backTo?: string }) {
  const { user } = useAuth();
  const role = usePrimaryRole();
  const nav = useNavigate();
  const { theme, toggle } = useTheme();
  const [profile, setProfile] = useState<{ full_name: string; last_login_at: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,last_login_at").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data as any));
  }, [user]);

  const handleLogout = async () => { await signOut(); nav("/"); };
  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="container mx-auto flex items-center justify-between gap-2 py-3 px-3 sm:px-4">
          <Link to="/app" className="flex items-center gap-2 min-w-0">
            <Building2 className="h-6 w-6 shrink-0 text-primary" />
            <span className="font-semibold text-sm sm:text-base truncate">Mbingo Construction</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={toggle} title="Toggle theme" className="h-9 w-9">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2">
                  <span className="hidden sm:inline truncate max-w-[140px]">{displayName}</span>
                  <span className="sm:hidden">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <div className="font-semibold truncate">{displayName}</div>
                  <div className="text-xs text-muted-foreground">{role ? ROLE_LABEL[role] : ""}</div>
                  {profile?.last_login_at && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Last login: {new Date(profile.last_login_at).toLocaleString()}
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/change-password"><KeyRound className="h-4 w-4 mr-2"/>Change Password</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2"/>Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
