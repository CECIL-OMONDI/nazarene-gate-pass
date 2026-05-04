import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";

export default function RoleGuard({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { user, roles, loading } = useAuth();
  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.some((r) => allow.includes(r))) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
