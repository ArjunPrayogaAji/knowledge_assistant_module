"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@ac.local");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch<{ user: { id: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white shadow-sm">
        <div className="p-6 border-b">
          <div className="text-lg font-semibold">Sign in</div>
          <div className="text-sm text-slate-600">Use the seeded demo users to access the dashboard.</div>
        </div>
        <form className="p-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="admin@ac.local"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              type="password"
              placeholder="password"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 text-white px-3 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <div className="text-xs text-slate-500">
            Demo: <span className="font-mono">admin@ac.local</span> / <span className="font-mono">password</span>
          </div>
        </form>
      </div>
    </div>
  );
}
