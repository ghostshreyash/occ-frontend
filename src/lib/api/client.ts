/**
 * The OCC API client.
 *
 * Every call carries the Cognito access token as a bearer. Amplify refreshes
 * that token when it is close to expiry, so `accessToken()` is read per request
 * rather than captured once — a long-lived page would otherwise send a stale one.
 *
 * Nothing here sends a password, an OTP, the Cognito sub or a database id: the
 * backend reads identity from the verified token, and anything the client
 * asserted about itself would not be trustworthy anyway.
 */
import { accessToken } from "@/lib/auth/auth-service"

const BASE = import.meta.env.VITE_API_URL

/** A non-2xx response, carrying the status so callers can branch on 404 vs 401 */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  /** False for endpoints reachable before sign-in, e.g. registration */
  auth?: boolean
}

/**
 * Fetch against the OCC API with the bearer token attached.
 *
 * Throws `ApiError` on a non-2xx so callers can branch on `status`; a network
 * failure throws status 0, which is how "backend not running" shows up.
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!BASE) throw new ApiError(0, "VITE_API_URL is not set for this environment.")

  const { body, headers, auth = true, ...rest } = options

  let token: string | null = null
  if (auth) {
    token = await accessToken()
    if (!token) throw new ApiError(401, "Not signed in.")
  }
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch (e) {
    throw new ApiError(0, e instanceof Error ? e.message : "Could not reach the API.")
  }

  // 204 and friends have nothing to parse
  const text = await response.text()
  const parsed: unknown = text ? safeJson(text) : null

  if (!response.ok) {
    const message =
      (parsed as { message?: string })?.message ?? `${response.status} ${response.statusText}`
    throw new ApiError(response.status, message, parsed)
  }

  return parsed as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
