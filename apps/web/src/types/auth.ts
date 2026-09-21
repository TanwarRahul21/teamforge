export type SignupRequest = {
  email: string;
  password: string;
  displayName: string;
};

export type SignupUser = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
};

export type SignupResponse = {
  user: SignupUser;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginUser = {
  id: string;
  email: string;
  display_name: string;
};

export type LoginResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: LoginUser;
};

export type CurrentUser = {
  id: string;
  sessionId: string;
};

export type MeResponse = {
  user: CurrentUser;
};

export type RefreshRequest = {
  refreshToken: string;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export type LogoutRequest = {
  refreshToken: string;
};

export type LogoutResponse = {
  message: string;
  revoked: boolean;
};
