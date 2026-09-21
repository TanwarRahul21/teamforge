export const API_PREFIX = "/auth" as const;

export const AUTH_ENDPOINTS = {
  signup: `${API_PREFIX}/signup`,
  login: `${API_PREFIX}/login`,
  me: `${API_PREFIX}/me`,
  refresh: `${API_PREFIX}/refresh`,
  logout: `${API_PREFIX}/logout`,
} as const;

export function getApiBaseUrl(): string {
  const rawValue = process.env.NEXT_PUBLIC_API_URL;

  if (!rawValue) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_URL. Set it to the API origin, for example https://api.example.com.",
    );
  }

  const value = rawValue.trim().replace(/\/+$/, "");

  try {
    const parsed = new URL(value);

    if (parsed.pathname !== "/") {
      throw new Error("NEXT_PUBLIC_API_URL must be an origin only; do not include a path prefix.");
    }

    return parsed.origin;
  } catch {
    throw new Error(
      "NEXT_PUBLIC_API_URL must be a valid absolute URL, for example https://api.example.com.",
    );
  }
}
