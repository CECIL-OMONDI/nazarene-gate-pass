import { Navigate } from "react-router-dom";
import { useAuth, usePrimaryRole } from "@/hooks/useAuth";

export default function RoleRouter() {
  const { user, loading, roles } = useAuth();
  const role = usePrimaryRole();
  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">No role assigned</h1>
          <p className="text-muted-foreground">Please contact your administrator.</p>
        </div>
      </div>
    );
  }
  switch (role) {
    case "admin":
    case "engineer": return <Navigate to="/admin" replace />;
    case "yard_storekeeper": return <Navigate to="/yard" replace />;
    case "site_storekeeper": return <Navigate to="/sitekeeper" replace />;
    case "contractor": return <Navigate to="/contractor" replace />;
    default: return <Navigate to="/login" replace />;
  }
}
