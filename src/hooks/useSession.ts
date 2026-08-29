import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { loadMyRoles, type AppRole } from "@/lib/tabito";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const apply = async (s: Session | null) => {
      if (!active) return;
      setSession(s);
      if (s?.user) {
        try {
          const r = await loadMyRoles(s.user.id);
          if (active) setRoles(r);
        } catch {
          if (active) setRoles([]);
        }
      } else {
        setRoles([]);
      }
      if (active) setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => void apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => void apply(s));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    isAdmin: roles.includes("admin"),
    isStaff: roles.includes("admin") || roles.includes("editor"),
  };
}
