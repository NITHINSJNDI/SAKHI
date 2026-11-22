import { clearAccessToken, getAccessToken } from "./secure-store";

/**
 * EXPO_PUBLIC_API_URL must be statically referenced for Expo to inline it.
 * Do not replace this with process.env["EXPO_PUBLIC_API_URL"].
 */
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL || "https://sakhi1.vercel.app";

export const API_BASE_URL = (configuredApiUrl ?? "").replace(/\/+$/, "");

export type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/** AuthProvider registers this so any 401 clears the native session. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  auth?: boolean;
}

function buildUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new ApiError(
      "EXPO_PUBLIC_API_URL is not configured. Add it to mobile/.env and restart Expo.",
      0,
      null,
    );
  }
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function getErrorMessage(payload: unknown, status: number): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }
  return `Request failed (${status}).`;
}

/**
 * Typed fetch wrapper for the existing Next.js routes.
 * It attaches a bearer token when one exists and clears the session on 401.
 */
export async function apiFetch<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { auth = true, headers: inputHeaders, body, ...requestOptions } = options;
  const headers = new Headers(inputHeaders);

  headers.set("Accept", "application/json");
  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = await getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  const targetUrl = buildUrl(path);
  try {
    response = await fetch(targetUrl, {
      ...requestOptions,
      body,
      headers,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ApiError(
      `Network error connecting to ${targetUrl} (${detail}). Check your internet connection and API URL.`,
      0,
      detail,
    );
  }

  if (response.status === 401) {
    await clearAccessToken();
    unauthorizedHandler?.();
  }

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload, response.status), response.status, payload);
  }

  return payload as TResponse;
}
