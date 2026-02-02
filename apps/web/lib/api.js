const DEFAULT_API_URL = "http://localhost:4000";

function getApiBaseUrl() {
  return (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API_URL
  );
}

export async function apiFetch(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  const headers = {
    "x-user-role": "admin",
    ...(options.headers || {})
  };
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    ...options,
    headers
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "API request failed");
  }

  return response.json();
}
