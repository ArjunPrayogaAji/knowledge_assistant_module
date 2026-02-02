"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/apiClient";

export type MeUser = { id: string; email: string; name: string; role: "admin" | "member" };

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await apiFetch<{ user: MeUser }>("/auth/me");
        if (!mounted) return;
        setReady(true);
      } catch {
        if (!mounted) return;
        router.replace("/login");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-sm text-slate-600">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
