import { apiRequest } from "@/lib/api/client";
import { AUTH_ENDPOINTS } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";
import type { CurrentUser, LoginRequest, RefreshResponse } from "@/types/auth";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let inFlightRefresh: Promise<RefreshResponse> | null = null;

export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  accessToken = token;
}

export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  refreshToken = token;
}

export async function login(credentials: LoginRequest): Promise<CurrentUser | null> {
  const loginPayload = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; display_name: string };
  }>(AUTH_ENDPOINTS.login, {
    method: "POST",
    body: credentials,
  });

  if (typeof window !== "undefined") {
    accessToken = loginPayload.accessToken;
    refreshToken = loginPayload.refreshToken;
  }

  return {
    id: loginPayload.user.id,
    sessionId: "",
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    if (typeof window !== "undefined" && accessToken) {
      const response = await apiRequest<{ user: CurrentUser }>(AUTH_ENDPOINTS.me, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.user;
    }

    return null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function refresh(): Promise<RefreshResponse> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  const promise = apiRequest<RefreshResponse>(AUTH_ENDPOINTS.refresh, {
    method: "POST",
    body: {
      refreshToken: refreshToken ?? "",
    },
  });

  inFlightRefresh = promise;

  try {
    const response = await promise;

    if (typeof window !== "undefined") {
      accessToken = response.accessToken;
      refreshToken = response.refreshToken;
    }

    return response;
  } finally {
    inFlightRefresh = null;
  }
}

export async function logout(): Promise<void> {
  const currentRefreshToken = refreshToken;

  if (typeof window !== "undefined") {
    accessToken = null;
    refreshToken = null;
  }

  if (!currentRefreshToken) {
    return;
  }

  try {
    await apiRequest<{ message: string; revoked: boolean }>(AUTH_ENDPOINTS.logout, {
      method: "POST",
      body: {
        refreshToken: currentRefreshToken,
      },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      return;
    }

    throw error;
  }
}
