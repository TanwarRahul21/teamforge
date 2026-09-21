import { getApiBaseUrl } from "@/lib/api/config";
import { ApiError, NetworkError } from "@/lib/api/errors";

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  headers?: HeadersInit;
};

type ErrorPayload = {
  error?: string;
  message?: string;
  errors?: Record<string, string | string[] | undefined>;
  fieldErrors?: Record<string, string | string[] | undefined>;
};

function normalizeFieldErrors(input: unknown): Record<string, string[]> {
  if (!input || typeof input !== "object") {
    return {};
  }

  const entries = Object.entries(input as Record<string, unknown>);

  return entries.reduce<Record<string, string[]>>((acc, [key, value]) => {
    if (Array.isArray(value)) {
      acc[key] = value.filter((entry): entry is string => typeof entry === "string");
      return acc;
    }

    if (typeof value === "string") {
      acc[key] = [value];
      return acc;
    }

    return acc;
  }, {});
}

function parseErrorBody(response: Response, bodyText: string): ApiError {
  const fallbackMessage = `Request failed (${response.status})`;

  if (!bodyText) {
    return new ApiError({ status: response.status, message: fallbackMessage });
  }

  try {
    const payload = JSON.parse(bodyText) as ErrorPayload;
    const code = payload.error ?? undefined;
    const message = typeof payload.message === "string" && payload.message.trim().length > 0
      ? payload.message
      : fallbackMessage;
    const fieldErrors = normalizeFieldErrors(payload.errors ?? payload.fieldErrors);

    return new ApiError({
      status: response.status,
      code,
      message,
      fieldErrors,
    });
  } catch {
    return new ApiError({
      status: response.status,
      message: fallbackMessage,
    });
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = new URL(path, `${getApiBaseUrl()}/`);
  const headers = new Headers(options.headers ?? {});
  const hasBody = options.body !== undefined;

  headers.set("Accept", "application/json");

  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      body: hasBody ? JSON.stringify(options.body) : undefined,
      headers,
      signal: options.signal,
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw parseErrorBody(response, bodyText);
    }

    if (response.status === 204) {
      // Trusted boundary: callers select the expected response shape from the API contract.
      return undefined as T;
    }

    const text = await response.text();

    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError({
        status: response.status,
        message: `Request failed (${response.status})`,
      });
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError || error instanceof Error) {
      throw new NetworkError("Network request failed.", error);
    }

    throw new NetworkError("Network request failed.");
  }
}
