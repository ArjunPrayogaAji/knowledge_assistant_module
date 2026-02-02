export type ApiOk<T> = { data: T };
export type ApiErr = { error: { code: string; message: string } };

export function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as ApiOk<T> | ApiErr) : null;

  if (!res.ok) {
    const msg = (json as any)?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return (json as ApiOk<T>).data;
}
