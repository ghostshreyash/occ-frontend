/**
 * Countries and states.
 *
 *     GET /api/v1/locations/countries
 *     GET /api/v1/locations/states?countryId=
 *
 * The enterprise and plant records store a country and state **by name** and
 * optionally by id. The forms collect names, so the only thing the console
 * needs these lists for is resolving the ids that go alongside — which is why
 * `resolveLocationIds` returns what it found rather than throwing: the names
 * are stored either way, and a lookup the API cannot answer must not stop an
 * onboarding.
 */
import { apiFetch } from "./client"
import { query, type Envelope } from "./types"

export type Country = {
  id: string
  name: string
  iso2: string | null
  iso3: string | null
  isdCode: string | null
}

export type State = {
  id: string
  countryId: string
  name: string
  code: string | null
}

export const listCountries = async (): Promise<Country[]> =>
  (await apiFetch<Envelope<Country[]>>("/api/v1/locations/countries")).data ?? []

export const listStates = async (countryId?: string): Promise<State[]> =>
  (await apiFetch<Envelope<State[]>>(`/api/v1/locations/states${query({ countryId })}`)).data ?? []

/** Case- and space-insensitive, so "united arab emirates" matches the stored name */
const sameName = (a: string | null | undefined, b: string) =>
  String(a ?? "").trim().toLowerCase() === b.trim().toLowerCase()

/**
 * The UUIDs for a country and state the user picked by name.
 *
 * Best effort by design: a name the API does not list comes back undefined and
 * the caller sends the names alone. Failures are logged rather than thrown for
 * the same reason — this is an enrichment, not a precondition.
 */
export async function resolveLocationIds(
  countryName?: string,
  stateName?: string,
): Promise<{ countryId?: string; stateId?: string }> {
  if (!countryName) return {}
  try {
    const countries = await listCountries()
    const country = countries.find((c) => sameName(c.name, countryName))
    if (!country) return {}
    if (!stateName) return { countryId: country.id }

    const states = await listStates(country.id)
    const state = states.find((s) => sameName(s.name, stateName))
    return { countryId: country.id, ...(state ? { stateId: state.id } : {}) }
  } catch (e) {
    console.warn("[api] could not resolve the country/state ids; sending names only.", e)
    return {}
  }
}
