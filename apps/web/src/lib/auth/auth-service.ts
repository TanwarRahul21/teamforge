import {
  login as loginRequest,
  logout as logoutRequest,
  me as meRequest,
  refresh as refreshRequest,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import type { LoginRequest, LoginUser } from "@/types/auth";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: LoginUser;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;
let currentUser: LoginUser | null = null;
let inFlightRefresh: Promise<AuthSession | null> | null = null;

function readSession(): AuthSession | null {
  if (!accessToken || !refreshToken || !currentUser) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    user: currentUser,
  };
}

function setSession(session: { accessToken: string; refreshToken: string; user?: LoginUser | null }) {
  accessToken = session.accessToken;
  refreshToken = session.refreshToken;

  if (session.user) {
    currentUser = session.user;
  }
}

function clearSession() {
  accessToken = null;
  refreshToken = null;
  currentUser = null;
}

async function verifyCurrentSession(): Promise<boolean> {
  if (!accessToken) {
    return false;
  }

  try {
    await meRequest({
      Authorization: `Bearer ${accessToken}`,
    });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return false;
    }

    throw error;
  }
}

export function getSessionSnapshot(): AuthSession | null {
  return readSession();
}

export function hasSession(): boolean {
  return readSession() !== null;
}

export function getAuthenticatedUser(): LoginUser | null {
  return currentUser;
}

export function resetSession(): void {
  clearSession();
}

export async function login(credentials: LoginRequest): Promise<AuthSession> {
  const response = await loginRequest(credentials);

  setSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
  });

  return readSession() as AuthSession;
}

export async function restoreSession(): Promise<AuthSession | null> {
  const session = readSession();

  if (!session) {
    return null;
  }

  try {
    if (await verifyCurrentSession()) {
      return session;
    }
  } catch (error) {
    clearSession();

    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }

  if (!refreshToken) {
    clearSession();
    return null;
  }

  try {
    const rotated = await refreshRequest({
      refreshToken,
    });

    setSession({
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
    });

    if (await verifyCurrentSession()) {
      return readSession();
    }

    clearSession();
    return null;
  } catch (error) {
    clearSession();

    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function refresh(): Promise<AuthSession | null> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  const session = readSession();

  if (!session) {
    return null;
  }

  const refreshPromise = (async () => {
    try {
      const rotated = await refreshRequest({
        refreshToken: session.refreshToken,
      });

      setSession({
        accessToken: rotated.accessToken,
        refreshToken: rotated.refreshToken,
      });

      await meRequest({
        Authorization: `Bearer ${rotated.accessToken}`,
      });

      return readSession();
    } catch (error) {
      clearSession();

      if (error instanceof ApiError && error.status === 401) {
        return null;
      }

      throw error;
    }
  })();

  inFlightRefresh = refreshPromise;

  try {
    return await refreshPromise;
  } finally {
    inFlightRefresh = null;
  }
}

export async function logout(): Promise<void> {
  const currentRefreshToken = refreshToken;

  clearSession();

  if (!currentRefreshToken) {
    return;
  }

  try {
    await logoutRequest({
      refreshToken: currentRefreshToken,
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 401)) {
      return;
    }

    throw error;
  }
}
