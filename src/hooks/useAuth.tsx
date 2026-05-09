import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "engineer" | "yard_storekeeper" | "contractor" | "site_storekeeper";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  refreshRoles: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null, session: null, roles: [], loading: true, refreshRoles: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        // defer to avoid deadlock per Supabase guidance
        setTimeout(() => {
          loadRoles(s.user.id);
          if (event === "SIGNED_IN") {
            supabase.rpc("touch_last_login" as any).then(() => {});
          }
        }, 0);
      } else {
        setRoles([]);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadRoles(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshRoles = async () => {
    if (session?.user) await loadRoles(session.user.id);
  };

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, roles, loading, refreshRoles }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
export const usePrimaryRole = (): AppRole | null => {
  const { roles } = useAuth();
  const order: AppRole[] = ["admin", "engineer", "yard_storekeeper", "site_storekeeper", "contractor"];
  for (const r of order) if (roles.includes(r)) return r;
  return null;
};
