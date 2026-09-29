import { useLocation } from "react-router"

import { brands, type Brand, type BrandKey } from "@/config/brands"

/**
 * Which sign-in a visitor sees is decided by the hostname:
 *
 *   olivine.example.com → Command Centre
 *   emmse.example.com   → enterprise administrators
 *   evita.example.com   → ELPREMARs in the field
 *
 * Anything unrecognised (including localhost and preview deployments) falls
 * back to the Command Centre, which is what `/` serves today.
 *
 * TODO: confirm the production hostnames and add any aliases to `hosts` in
 * `src/config/brands.ts`.
 */
export const DEFAULT_BRAND: BrandKey = "occ"

export function resolveBrand(hostname: string, search?: string): Brand {
  // `?brand=evita` is a preview aid for demos and screenshots, never a route
  // real users reach — production is decided by the host alone.
  const preview = search ? new URLSearchParams(search).get("brand") : null
  if (preview && preview in brands) return brands[preview as BrandKey]

  const label = hostname.split(".")[0]?.toLowerCase() ?? ""
  const match = Object.values(brands).find((brand) => brand.hosts.includes(label))
  return match ?? brands[DEFAULT_BRAND]
}

/** The brand for the current hostname, re-resolved when `?brand=` changes. */
export function useBrand(): Brand {
  const { search } = useLocation()
  return resolveBrand(window.location.hostname, search)
}

/**
 * Where the overview should send someone for a given brand: its own deployment
 * when that is configured, this deployment's sign-in when it is already the
 * brand for this host, and otherwise a `?brand=` preview of it.
 */
export function brandLoginHref(brand: Brand, current: Brand) {
  if (brand.key === current.key) return "/login"
  return brand.origin ? `${brand.origin}/login` : `/login?brand=${brand.key}`
}
