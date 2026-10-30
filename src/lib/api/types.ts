/**
 * The envelope every OCC endpoint answers in.
 *
 * `{ status, statusCode, message }` wraps the payload, which is `data` on the
 * single-record endpoints and `data` + `pagination` on the lists. `apiFetch`
 * returns the parsed body as-is, so callers unwrap it here rather than each
 * module inventing its own shape.
 */
export type Envelope<T> = {
  status: "ok" | "error"
  statusCode: number
  message: string
  data: T
}

/** A list endpoint: the rows, and where in the set they sit */
export type Paged<T> = Envelope<T[]> & { pagination: Pagination }

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/** What a list reader hands back: the rows plus the page they came from */
export type Page<T> = { rows: T[]; pagination: Pagination }

/** The pagination a failed or empty read reports, so callers never see undefined */
export const emptyPagination = (limit = 10): Pagination => ({
  page: 1,
  limit,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
})

/**
 * A query string from the parameters that have a value.
 *
 * Only `undefined` and the empty string are dropped. A filter menu's unset
 * value - `"all"` in this console - is the caller's business to turn into
 * `undefined`: dropping it here would also drop a search for the word "all",
 * which would quietly return the whole register instead of nothing.
 */
export function query(params: Record<string, string | number | string[] | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    // The list filters that take several values send them comma-separated
    search.set(key, Array.isArray(value) ? value.join(",") : String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

/** Drops the keys a PATCH should not carry, so an untouched field is left alone */
export function defined<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<T>
}
