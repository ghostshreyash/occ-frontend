/**
 * Reading an API endpoint from a component.
 *
 * The console has no data-fetching library, and adding one for the first
 * handful of endpoints would be a bigger change than the integration itself.
 * This is the part of one the screens actually use: read on mount, read again
 * when what it depends on changes, and expose `{ data, error, loading, reload }`.
 *
 * Two things it does deliberately:
 *
 * - **Keeps the last good data while reloading.** A filter change would
 *   otherwise blank the table and jump the page. `loading` says a request is in
 *   flight; the rows on screen stay until the new ones arrive. `loading` is
 *   derived from which read has settled rather than held in state, so a reload
 *   needs no render of its own to begin.
 * - **Drops a stale answer.** Typing in a search box starts a request per
 *   keystroke and they can land out of order, so each run is numbered and only
 *   the newest is allowed to write.
 *
 * ## The one rule for callers
 *
 * `read` is the identity of the request: it is re-run whenever the function
 * changes. **Wrap it in `useCallback`** with everything it closes over, the way
 * a query key lists what it varies by:
 *
 * ```tsx
 * const read = useCallback(() => listEnterprises({ search, status }), [search, status])
 * const { data, error, loading, reload } = useResource(read)
 * ```
 *
 * A `read` built fresh on every render is a new identity every render, and the
 * hook would fetch in a loop.
 */
import { useCallback, useEffect, useRef, useState } from "react"

import { ApiError } from "./client"

export type Resource<T> = {
  data: T | undefined
  /** The message to show the user; undefined while things are fine */
  error: string | undefined
  /** True while a request is in flight, including a reload over existing data */
  loading: boolean
  /** Run the read again — after a save, or from a Retry button */
  reload: () => void
}

/** What a finished read left behind, and which read it was */
type Settled<T> = {
  read: unknown
  attempt: number
  data?: T
  error?: string
}

export function useResource<T>(read: () => Promise<T>): Resource<T> {
  /** Bumped by `reload` so the same `read` can be run again */
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T>>()
  /** Which run may write. Incremented as each new one starts. */
  const run = useRef(0)

  useEffect(() => {
    const id = ++run.current
    read()
      .then((data) => {
        if (run.current === id) setSettled({ read, attempt, data })
      })
      .catch((e: unknown) => {
        if (run.current === id) setSettled({ read, attempt, error: messageFor(e) })
      })
  }, [read, attempt])

  /*
   * In flight whenever the settled answer belongs to a different read, which
   * covers the first render, a changed filter and a reload alike.
   */
  const loading = settled?.read !== read || settled.attempt !== attempt

  return {
    data: settled?.data,
    error: settled?.error,
    loading,
    reload: useCallback(() => setAttempt((n) => n + 1), []),
  }
}

/**
 * An API failure in words the user can act on.
 *
 * Status 0 is how `apiFetch` reports "could not reach the API" — the common
 * case in local work when the backend is not running — so it gets its own
 * wording rather than the fetch layer's. A 401 is already handled centrally
 * (the client refreshes the token, then signs the user out), so repeating
 * "signed out" here would be noise; it is reported as a plain failure.
 */
export function messageFor(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return "Could not reach the API. Check that the backend is running."
    if (e.status === 403) return "You do not have access to this."
    if (e.status === 404) return "Not found."
    return e.message
  }
  return e instanceof Error ? e.message : "Something went wrong."
}
