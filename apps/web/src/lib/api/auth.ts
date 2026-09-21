import { AUTH_ENDPOINTS } from "@/lib/api/config";
import { apiRequest } from "@/lib/api/client";
import type {
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  MeResponse,
  RefreshRequest,
  RefreshResponse,
  SignupRequest,
  SignupResponse,
} from "@/types/auth";

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  return apiRequest<SignupResponse>(AUTH_ENDPOINTS.signup, {
    method: "POST",
    body: payload,
  });
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(AUTH_ENDPOINTS.login, {
    method: "POST",
    body: payload,
  });
}

export async function me(headers?: Record<string, string>): Promise<MeResponse> {
  return apiRequest<MeResponse>(AUTH_ENDPOINTS.me, {
    method: "GET",
    headers,
  });
}

export async function refresh(payload: RefreshRequest): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>(AUTH_ENDPOINTS.refresh, {
    method: "POST",
    body: payload,
  });
}

export async function logout(payload: LogoutRequest): Promise<LogoutResponse> {
  return apiRequest<LogoutResponse>(AUTH_ENDPOINTS.logout, {
    method: "POST",
    body: payload,
  });
}
