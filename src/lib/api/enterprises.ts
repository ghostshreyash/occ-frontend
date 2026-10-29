/**
 * The enterprise endpoints.
 *
 *     GET    /api/v1/enterprises        list, paginated and filtered
 *     GET    /api/v1/enterprises/{id}   one enterprise with its plant tree
 *     POST   /api/v1/enterprises        the whole onboarding payload in one call
 *     PATCH  /api/v1/enterprises/{id}   enterprise profile fields only
 *     PATCH  /api/v1/plants/{id}        one plant
 *     PATCH  /api/v1/departments/{id}   one department or sub-department
 *
 * ## Names
 *
 * The backend and the console disagree on several field names, and the
 * backend's are the database's, so the translation lives here rather than being
 * spread through the screens:
 *
 * - `sectorType` is the API's `enterpriseType`
 * - `sector` is its `industry`
 * - `salutation` and `head` are `headTitle` and `headName`
 * - `phoneCode` + `phone` are one `headPhoneNumber`
 * - `timeZone` is `timezone`
 *
 * ## What the API has no room for
 *
 * These are collected by the wizard and cannot be stored — there is no column
 * for them (see `prisma/schema.prisma` in occ-backend). They are left out of
 * the payload rather than smuggled into another field, and read back blank:
 *
 * - the enterprise's access option (Monitoring Only / Monitoring and
 *   Management) and its scale (Large / Mid / Small)
 * - a plant's postal code, its logo, and its own login
 * - a department's location, and a sub-department's function — `function` is
 *   sent as the sub-department's `departmentType`, the nearest column and a
 *   field the API requires anyway
 * - every health and asset count the register used to show: the API serves no
 *   asset data at all yet
 *
 * ## Where the API is stricter than the form
 *
 * `shortName`, a plant's `code` and `plantType`, and a department's `code` and
 * `departmentType` are required by the API and optional on the form — Short
 * Name optional and Plant Type dropped were both client decisions. Rather than
 * fail the submit, each is filled from something the user did type (the
 * `fallback` helpers below) so nothing is invented out of nothing. The fix is
 * for the API to accept them as absent; until it does, this is the seam.
 */
import { dialCodes } from "@/data/master-data"
import { apiFetch } from "./client"
import { defined, emptyPagination, query, type Envelope, type Page, type Paged } from "./types"
import type {
  DepartmentEntry,
  DepartmentValues,
  OnboardingData,
  PlantEntry,
  SubDepartmentValues,
} from "@/pages/enterprise-onboarding/schemas"

/* ------------------------------------------------------------- API shapes -- */

/**
 * Spelt tolerantly: `null` for everything nullable, and a coordinate as a
 * string because Prisma serialises a `Decimal` to one. A field the backend
 * stops sending should leave the console blank, not throw.
 */
type ApiEnterprise = {
  id: string
  name: string
  shortName: string | null
  enterpriseType: string | null
  industry: string | null
  website: string | null
  status: string | null
  description: string | null
  companyLogo: string | null
  address: string | null
  postalCode: string | null
  country: string | null
  countryId: string | null
  state: string | null
  stateId: string | null
  city: string | null
  latitude: string | number | null
  longitude: string | number | null
  createdAt: string
  updatedAt: string
}

/** The plant summary the list endpoint nests under each enterprise */
type ApiPlantSummary = {
  id: string
  code: string | null
  name: string
  city: string | null
  state: string | null
  country: string | null
}

type ApiDepartment = {
  id: string
  code: string | null
  name: string
  departmentType: string | null
  headTitle: string | null
  headName: string | null
  headEmail: string | null
  headPhoneNumber: string | null
  locationId: string | null
  description: string | null
  /** Only on a top-level department; the API nests one level */
  subDepartments?: ApiDepartment[]
}

type ApiPlant = ApiPlantSummary & {
  plantType: string | null
  address: string | null
  latitude: string | number | null
  longitude: string | number | null
  headTitle: string | null
  headName: string | null
  headEmail: string | null
  headPhoneNumber: string | null
  commissioningDate: string | null
  capacity: string | number | null
  capacityUnit: string | null
  timezone: string | null
  notes: string | null
  departments?: ApiDepartment[]
}

type ApiEnterpriseListRow = ApiEnterprise & { plantCount: number; plants: ApiPlantSummary[] }
type ApiEnterpriseDetail = ApiEnterprise & { plants: ApiPlant[] }

/* --------------------------------------------------------------- the rows -- */

/** Whether the account may be used. Deactivation is the control; nothing is deleted. */
export type AccountStatus = "active" | "inactive"

/**
 * One row of the enterprise register.
 *
 * Only what the API actually answers. `assets` and `elpremars` were on the mock
 * row and are not here — there is no endpoint for either, and a
 * plausible-looking number is worse than an empty cell.
 */
export type EnterpriseRow = {
  /** The enterprise UUID — what every other call is keyed by */
  id: string
  name: string
  shortName: string
  /** "Industry" or "Retail" — the API calls it `enterpriseType` */
  sectorType: string
  /** The sector within that type — the API calls it `industry` */
  sector: string
  city: string
  state: string
  country: string
  plants: number
  status: AccountStatus
  /** DD-MM-YYYY, from `createdAt` — what the register displays and exports */
  onboarded: string
  /** The raw timestamp, so sorting does not go through the display format */
  createdAt: string
}

/** ISO timestamp as the DD-MM-YYYY the register and the exports use */
export const asDmy = (iso: string | null | undefined): string => {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
}

/** ISO timestamp as the YYYY-MM-DD a date input holds */
const asIsoDate = (iso: string | null | undefined): string => {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

/**
 * The API writes status in upper case (`ACTIVE`); the console matches on lower.
 * Anything not plainly inactive counts as active, so a status the console has
 * not seen before does not read as a disabled account.
 */
export const asAccountStatus = (status: string | null | undefined): AccountStatus =>
  String(status ?? "").toUpperCase() === "INACTIVE" ? "inactive" : "active"

const str = (v: string | number | null | undefined): string => (v === null || v === undefined ? "" : String(v))

const toRow = (e: ApiEnterpriseListRow): EnterpriseRow => ({
  id: e.id,
  name: e.name,
  shortName: str(e.shortName),
  sectorType: str(e.enterpriseType),
  sector: str(e.industry),
  /*
   * The register shows where the enterprise is. That is its head office; a
   * record without one falls back to its first plant, which is where its work
   * actually happens.
   */
  city: str(e.city) || str(e.plants?.[0]?.city),
  state: str(e.state) || str(e.plants?.[0]?.state),
  country: str(e.country) || str(e.plants?.[0]?.country),
  plants: e.plantCount ?? e.plants?.length ?? 0,
  status: asAccountStatus(e.status),
  onboarded: asDmy(e.createdAt),
  createdAt: e.createdAt,
})

/* ------------------------------------------------------------ the profile -- */

/**
 * The enterprise as the detail screen shows it: the sections the wizard
 * captured, read back. Mirrors `EnterpriseProfile` in `@/data/occ-tables` so
 * the page's forms are unchanged, with the API's ids added — a PATCH needs the
 * plant's and the department's own UUIDs, which the mock profile never had.
 */
export type ApiDepartmentProfile = {
  id: string
  name: string
  code: string
  type: string
  parent: string
  salutation: string
  head: string
  email: string
  phoneCode: string
  phone: string
  description: string
  subDepartments: { id: string; name: string; code: string; function: string; description?: string }[]
}

export type ApiPlantProfile = {
  id: string
  name: string
  type: string
  code: string
  city: string
  state: string
  country: string
  /** No column on the API; blank until there is one */
  pin: string
  latitude: string
  longitude: string
  salutation: string
  head: string
  email: string
  phoneCode: string
  phone: string
  capacity: string
  capacityUnit: string
  commissioningDate: string
  timeZone: string
  address: string
  notes: string
  departments: ApiDepartmentProfile[]
}

export type EnterpriseDetail = {
  id: string
  status: AccountStatus
  onboarded: string
  enterprise: {
    name: string
    shortName: string
    sectorType: string
    sector: string
    website: string
    description: string
    /** No column on the API — see the note at the top of this file */
    accessOption: string
  }
  location: {
    country: string
    countryId: string
    state: string
    stateId: string
    city: string
    pin: string
    address: string
  }
  plants: ApiPlantProfile[]
}

/**
 * Splits `headPhoneNumber` back into the dialling code and the number.
 *
 * The API stores one string. This client writes it as "+91 9876543210", but a
 * row the console did not create may hold anything, so a value with no
 * recognisable code is returned whole as the number with the code left blank —
 * never silently truncated.
 */
const splitPhone = (value: string | null | undefined): { phoneCode: string; phone: string } => {
  const raw = str(value).trim()
  if (!raw) return { phoneCode: "", phone: "" }

  const separated = /^(\+\d{1,4})[\s-]+(.*)$/.exec(raw)
  if (separated && separated[2]) {
    return { phoneCode: separated[1], phone: separated[2].replace(/\D/g, "") }
  }

  /*
   * No separator. A row written by this client always has one, but one written
   * anywhere else may read "+919876543210" - and leaving the code on the front
   * puts thirteen characters into a field the form requires to be ten digits,
   * which makes the plant unsaveable. Longest code first, so +91 cannot win
   * over +911 where both would match.
   */
  if (raw.startsWith("+")) {
    const code = dialCodes
      .map((d) => d.code)
      .sort((a, b) => b.length - a.length)
      .find((c) => raw.startsWith(c))
    if (code) return { phoneCode: code, phone: raw.slice(code.length).replace(/\D/g, "") }
  }

  return { phoneCode: "", phone: raw }
}

const toDepartmentProfile = (d: ApiDepartment, parentName = ""): ApiDepartmentProfile => ({
  id: d.id,
  name: d.name,
  code: str(d.code),
  type: str(d.departmentType),
  parent: parentName,
  salutation: str(d.headTitle),
  head: str(d.headName),
  email: str(d.headEmail),
  ...splitPhone(d.headPhoneNumber),
  description: str(d.description),
  subDepartments: (d.subDepartments ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    code: str(s.code),
    // The console's "function" is stored as the sub-department's own type
    function: str(s.departmentType),
    description: str(s.description) || undefined,
  })),
})

const toPlantProfile = (p: ApiPlant): ApiPlantProfile => ({
  id: p.id,
  name: p.name,
  type: str(p.plantType),
  code: str(p.code),
  city: str(p.city),
  state: str(p.state),
  country: str(p.country),
  pin: "",
  latitude: str(p.latitude),
  longitude: str(p.longitude),
  salutation: str(p.headTitle),
  head: str(p.headName),
  email: str(p.headEmail),
  ...splitPhone(p.headPhoneNumber),
  capacity: str(p.capacity),
  capacityUnit: str(p.capacityUnit),
  commissioningDate: asIsoDate(p.commissioningDate),
  timeZone: str(p.timezone),
  address: str(p.address),
  notes: str(p.notes),
  departments: (p.departments ?? []).map((d) => toDepartmentProfile(d)),
})

const toDetail = (e: ApiEnterpriseDetail): EnterpriseDetail => ({
  id: e.id,
  status: asAccountStatus(e.status),
  onboarded: asDmy(e.createdAt),
  enterprise: {
    name: e.name,
    shortName: str(e.shortName),
    sectorType: str(e.enterpriseType),
    sector: str(e.industry),
    website: str(e.website),
    description: str(e.description),
    accessOption: "",
  },
  location: {
    country: str(e.country),
    countryId: str(e.countryId),
    state: str(e.state),
    stateId: str(e.stateId),
    city: str(e.city),
    pin: str(e.postalCode),
    address: str(e.address),
  },
  plants: (e.plants ?? []).map(toPlantProfile),
})

/* ----------------------------------------------------------------- reads -- */

export type EnterpriseFilters = {
  search?: string
  /** `active` / `inactive` as the console spells it; sent upper-cased */
  status?: AccountStatus | "all"
  industry?: string
  country?: string
}

/** The most rows one request may ask for — the API's own ceiling */
const MAX_LIMIT = 100
/**
 * How many pages the register will walk. A hundred rows a page, so twenty pages
 * is two thousand enterprises — far beyond the register today, and a stop so a
 * backend that always says `hasNextPage` cannot spin forever.
 */
const MAX_PAGES = 20

/**
 * The whole register, paged through.
 *
 * The register filters, sorts, exports and counts across every enterprise at
 * once and the API caps a page at a hundred, so this walks the pages and hands
 * back the set. One request covers it until there are more than a hundred
 * enterprises; the KPI tiles and the CSV are then over everything rather than
 * over whichever page happened to be on screen.
 *
 * Server-side filtering is still used where the API supports it, so a search
 * narrows the walk rather than pulling everything and discarding most of it.
 */
export async function listEnterprises(filters: EnterpriseFilters = {}): Promise<Page<EnterpriseRow>> {
  const rows: EnterpriseRow[] = []
  let pagination = emptyPagination(MAX_LIMIT)

  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await apiFetch<Paged<ApiEnterpriseListRow>>(
      `/api/v1/enterprises${query({
        page,
        limit: MAX_LIMIT,
        search: filters.search?.trim(),
        status: filters.status && filters.status !== "all" ? filters.status.toUpperCase() : undefined,
        industry: filters.industry === "all" ? undefined : filters.industry,
        country: filters.country === "all" ? undefined : filters.country,
        sortBy: "name",
        sortOrder: "asc",
      })}`,
    )
    rows.push(...(body.data ?? []).map(toRow))
    pagination = body.pagination ?? pagination
    if (!body.pagination?.hasNextPage) return { rows, pagination }
  }

  console.warn(`[api] enterprise register stopped at ${MAX_PAGES} pages; ${pagination.total} rows exist.`)
  return { rows, pagination }
}

/** One enterprise, with every plant, department and sub-department under it */
export async function getEnterprise(id: string): Promise<EnterpriseDetail> {
  const body = await apiFetch<Envelope<ApiEnterpriseDetail>>(`/api/v1/enterprises/${id}`)
  return toDetail(body.data)
}

/* ---------------------------------------------------------------- writes -- */

/** Initials, for a code the user did not type */
const initials = (name: string, max = 4) =>
  name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, max)
    .toUpperCase()

/**
 * What goes in a field the API requires and the form left blank.
 *
 * Each is derived from something the user did type, so the record carries no
 * invented value: a missing short name becomes the enterprise's own name, and a
 * missing code becomes the entity's initials.
 */
const fallbackShortName = (name: string) => name.slice(0, 80)
const fallbackCode = (name: string, prefix: string) => {
  const stem = initials(name)
  return stem ? `${prefix}-${stem}` : prefix
}
/** The API requires a type; "Not specified" says so rather than guessing one */
const NOT_SPECIFIED = "Not specified"

/** A coordinate the form holds as text, as the number the API wants */
const asNumber = (v: string | undefined): number | null => {
  if (!v || v.trim() === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Optional text: an empty field is absent, not an empty string */
const orNull = (v: string | undefined): string | null => (v && v.trim() !== "" ? v.trim() : null)

/** The dialling code and the number as the one string the API stores */
const joinPhone = (code: string | undefined, phone: string | undefined): string | null =>
  orNull([code, phone].filter((p) => p && p.trim() !== "").join(" "))

/** A sub-department as a child department, which is how the API models it */
const subDepartmentBody = (s: SubDepartmentValues) => ({
  code: s.code?.trim() || fallbackCode(s.name ?? "", "SUB"),
  name: (s.name ?? "").trim(),
  // The console's "function" is the nearest thing to a type the form collects
  departmentType: s.function?.trim() || NOT_SPECIFIED,
  description: orNull(s.description),
})

const departmentBody = (d: DepartmentEntry | DepartmentValues) => ({
  code: d.code?.trim() || fallbackCode(d.name ?? "", "DEPT"),
  name: (d.name ?? "").trim(),
  departmentType: d.type?.trim() || NOT_SPECIFIED,
  headTitle: orNull(d.salutation),
  headName: orNull(d.head),
  headEmail: orNull(d.email),
  headPhoneNumber: joinPhone(d.phoneCode, d.phone),
  description: orNull(d.description),
  children: ("subDepartments" in d ? d.subDepartments : [])
    // A row the user opened and never filled has nothing to store
    .filter((s) => (s.name ?? "").trim() !== "")
    .map(subDepartmentBody),
})

const plantBody = (p: PlantEntry) => ({
  code: p.code?.trim() || fallbackCode(p.name, "PLANT"),
  name: p.name.trim(),
  plantType: p.type?.trim() || NOT_SPECIFIED,
  address: orNull(p.address),
  city: orNull(p.city),
  latitude: asNumber(p.latitude),
  longitude: asNumber(p.longitude),
  headTitle: orNull(p.salutation),
  headName: orNull(p.head),
  headEmail: orNull(p.email),
  headPhoneNumber: joinPhone(p.phoneCode, p.phone),
  commissioningDate: orNull(p.commissioningDate),
  capacity: asNumber(p.capacity),
  capacityUnit: orNull(p.capacityUnit),
  timezone: orNull(p.timeZone),
  notes: orNull(p.notes),
  departments: p.departments.filter((d) => (d.name ?? "").trim() !== "").map(departmentBody),
})

/**
 * The wizard's steps as the one body `POST /enterprises` takes.
 *
 * The form holds the country and state as names; the API wants the names and,
 * optionally, their UUIDs. The ids are passed through when the caller has
 * resolved them (`src/lib/api/locations.ts`) and left out otherwise — the names
 * are stored either way, so a location list the API cannot answer does not
 * block an onboarding.
 */
export function enterpriseCreateBody(
  data: OnboardingData,
  ids: { countryId?: string; stateId?: string } = {},
) {
  const e = data.enterprise
  const loc = data.location
  if (!e || !loc) throw new Error("The enterprise and its head office are both needed to submit.")

  return {
    enterprise: {
      name: e.name.trim(),
      // Required by the API, optional on the form — a client decision
      shortName: e.shortName?.trim() || fallbackShortName(e.name.trim()),
      enterpriseType: e.sectorType,
      industry: e.sector,
      status: "ACTIVE",
      description: orNull(e.description),
      // The API rejects an empty string here; absent is the way to say "none"
      ...(e.website?.trim() ? { website: e.website.trim() } : {}),
      address: orNull(loc.address),
      postalCode: orNull(loc.pin),
      country: orNull(loc.country),
      state: orNull(loc.state),
      city: orNull(loc.city),
      ...(ids.countryId ? { countryId: ids.countryId } : {}),
      ...(ids.stateId ? { stateId: ids.stateId } : {}),
    },
    plants: data.plants.map(plantBody),
  }
}

/** Creates the enterprise, its plants and their departments in one transaction */
export async function createEnterprise(
  data: OnboardingData,
  ids?: { countryId?: string; stateId?: string },
): Promise<EnterpriseDetail> {
  const body = await apiFetch<Envelope<ApiEnterpriseDetail>>("/api/v1/enterprises", {
    method: "POST",
    body: enterpriseCreateBody(data, ids),
  })
  return toDetail(body.data)
}

/**
 * The enterprise profile fields.
 *
 * `PATCH /enterprises/{id}` is `.strict()` on the backend: a plant or an
 * unknown key is a 400, not a silent no-op. Only these keys may be sent, so the
 * allowed set is spelt out rather than spread from a form.
 */
export type EnterprisePatch = {
  name?: string
  shortName?: string
  enterpriseType?: string
  industry?: string
  status?: string
  description?: string | null
  website?: string | null
  address?: string | null
  postalCode?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  countryId?: string | null
  stateId?: string | null
}

export async function updateEnterprise(id: string, patch: EnterprisePatch): Promise<void> {
  await apiFetch<Envelope<ApiEnterprise>>(`/api/v1/enterprises/${id}`, {
    method: "PATCH",
    body: defined(patch),
  })
}

/** Deactivating is how an enterprise is stopped — OCC never deletes a record */
export const setEnterpriseStatus = (id: string, status: AccountStatus) =>
  updateEnterprise(id, { status: status.toUpperCase() })

/** One plant. Its departments are patched separately, through their own route. */
export async function updatePlant(id: string, values: Partial<ApiPlantProfile>): Promise<void> {
  await apiFetch(`/api/v1/plants/${id}`, {
    method: "PATCH",
    body: defined({
      name: values.name?.trim(),
      code: values.code?.trim() || undefined,
      plantType: values.type?.trim() || undefined,
      address: values.address,
      city: values.city,
      latitude: values.latitude === undefined ? undefined : asNumber(values.latitude),
      longitude: values.longitude === undefined ? undefined : asNumber(values.longitude),
      headTitle: values.salutation,
      headName: values.head,
      headEmail: values.email,
      headPhoneNumber:
        values.phone === undefined && values.phoneCode === undefined
          ? undefined
          : joinPhone(values.phoneCode, values.phone),
      /* Present but blank means "clear it"; absent means "leave it alone" */
      commissioningDate:
        values.commissioningDate === undefined ? undefined : values.commissioningDate || null,
      capacity: values.capacity === undefined ? undefined : asNumber(values.capacity),
      capacityUnit: values.capacityUnit,
      timezone: values.timeZone,
      notes: values.notes,
    }),
  })
}

/** One department. A sub-department is a department to the API, so it uses this too. */
export async function updateDepartment(id: string, values: Partial<ApiDepartmentProfile>): Promise<void> {
  await apiFetch(`/api/v1/departments/${id}`, {
    method: "PATCH",
    body: defined({
      name: values.name?.trim(),
      code: values.code?.trim() || undefined,
      departmentType: values.type?.trim() || undefined,
      headTitle: values.salutation,
      headName: values.head,
      headEmail: values.email,
      headPhoneNumber:
        values.phone === undefined && values.phoneCode === undefined
          ? undefined
          : joinPhone(values.phoneCode, values.phone),
      description: values.description,
    }),
  })
}

/** A sub-department carries its `function` in the department type column */
export const updateSubDepartment = (
  id: string,
  values: { name?: string; code?: string; function?: string; description?: string },
) => updateDepartment(id, { ...values, type: values.function })
