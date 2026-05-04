import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, usePrimaryRole } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  yard_storekeeper: "Yard Storekeeper",
  contractor: "Contractor",
  site_storekeeper: "Site Storekeeper",
};

export default function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { user } = useAuth();
  const role = usePrimaryRole();
  const nav = useNavigate();
  const handleLogout = async () => {
    await signOut();
    nav("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <Link to="/app" className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-semibold">Mbingo Construction</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{user?.email?.split("@")[0]}</div>
              <div className="text-xs text-muted-foreground">{role ? ROLE_LABEL[role] : ""}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-4">{title}</h1>
        {children}
      </main>
    </div>
  );
}
