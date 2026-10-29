/**
 * The ELPREMAR endpoints.
 *
 *     GET    /api/v1/elpremars        the register, paginated and filtered
 *     GET    /api/v1/elpremars/{id}   one profile, by UUID or by employee ID
 *     POST   /api/v1/elpremars        onboarding, as the wizard's four steps
 *     PATCH  /api/v1/elpremars/{id}   one or more of those four sections
 *
 * The API was written against these screens, so the profile comes back already
 * divided into `basic` / `work` / `posting` / `certifications` / `account` — the
 * same sections the detail page edits, and the same ones a PATCH accepts. Very
 * little translation is needed as a result, and what there is, is here.
 *
 * ## Names
 *
 * - **Roles.** The console writes a stream as "ELPREMAR – EVITA Field
 *   Inspection"; the API stores the bare "EVITA Field Inspection" and rejects
 *   anything that is not one of its three. `roleStream` strips the prefix on the
 *   way out and `roleLabel` restores it on the way in, so an unprefixed role in
 *   the database still reaches the screens looking like the console's own.
 * - **Experience.** A number on the API, a string on the form.
 * - **The employee ID is issued by the API**, from a database sequence. It is
 *   neither sent on a create nor accepted on a patch, and the wizard no longer
 *   previews one — a "next free ID" computed in the browser would hand the same
 *   one to two people onboarded at the same moment.
 *
 * ## What is collected and cannot be stored
 *
 * - **The reporting supervisor.** `POST` resolves a supervisor to a *platform
 *   user*, by name or email. The console's value is a plant or department head
 *   taken from the enterprise tree, and such a person usually has no login at
 *   all — sending it would 404 an otherwise valid onboarding. It is left out of
 *   the create and only sent on a PATCH, where the API treats an unmatched name
 *   as nothing to change rather than as an error.
 * - **The password, the access toggles and the welcome email.** The API creates
 *   the Cognito account itself and does not take a password; `webAccess` and
 *   `mobileAccess` are read back as `true` whatever is sent. Until it accepts
 *   them, Step 4 of the wizard is collecting more than can be saved.
 * - **KYC documents** and **sub-department**: no column for either.
 */
import { elpremarRoles, roleStream } from "@/data/master-data"
import { salutations } from "@/data/mock"
import { apiFetch } from "./client"
import { asDmy, type AccountStatus } from "./enterprises"
import { emptyPagination, query, type Envelope, type Page, type Paged } from "./types"
import type { ElpremarDraft } from "@/pages/elpremar-onboarding/schemas"

/* ------------------------------------------------------------- API shapes -- */

type ApiElpremarRow = {
  id: string
  name: string | null
  employeeId: string | null
  profilePic: string | null
  designation: string | null
  roles: string[] | null
  location: { city: string | null; state: string | null; country: string | null } | null
  experienceYears: number | null
  joinedAt: string | null
  status: string | null
}

type ApiCertificate = {
  id: string
  name: string | null
  number: string | null
  issuer: string | null
  /** Already formatted by the API, e.g. "02 Jan 2026" */
  issued: string | null
  validTill: string | null
  status: string | null
  documentUrl: string | null
  documents: number | null
}

type ApiElpremarDetail = {
  id: string
  employeeId: string | null
  name: string | null
  salutation: string | null
  status: string | null
  profilePic: string | null
  basic: {
    salutation: string | null
    name: string | null
    fullName: string | null
    employeeId: string | null
    dob: string | null
    gender: string | null
    phoneCode: string | null
    phone: string | null
    email: string | null
    joined: string | null
    postalCode: string | null
    district: string | null
    city: string | null
    state: string | null
    addressLine1: string | null
    addressLine2: string | null
    address: string | null
    profilePic: string | null
  } | null
  work: { designation: string | null; roles: string[] | null; experience: number | null } | null
  posting: {
    enterprise: string | null
    plant: string | null
    department: string | null
    subDepartment: string | null
    supervisor: string | null
    effectiveFrom: string | null
    city: string | null
    country: string | null
  } | null
  certifications: ApiCertificate[] | null
  account: {
    email: string | null
    role: string | null
    webAccess: boolean | null
    mobileAccess: boolean | null
    lastLogin: string | null
  } | null
}

/* ----------------------------------------------------------------- roles -- */

/**
 * A stream role as the console spells it.
 *
 * Matched through `roleStream` so "EVITA Field Inspection" from the database
 * finds "ELPREMAR – EVITA Field Inspection"; a role the console does not list
 * passes through unchanged rather than being dropped.
 */
export const roleLabel = (role: string): string =>
  elpremarRoles.find((r) => roleStream(r).toLowerCase() === roleStream(role).toLowerCase()) ?? role

const str = (v: string | number | null | undefined): string => (v === null || v === undefined ? "" : String(v))

/**
 * Splits a leading salutation off a full name.
 *
 * The list endpoint sends one `name` with the salutation in it, while the
 * detail endpoint sends the two apart. The register renders them as two, so
 * this does the same split — matching the console's own list, which is also
 * what the wizard offered when the name was typed.
 */
const splitName = (full: string): { salutation: string; name: string } => {
  const trimmed = full.trim()
  const prefix = salutations.find((s) => trimmed.toLowerCase().startsWith(s.toLowerCase() + " "))
  return prefix
    ? { salutation: prefix, name: trimmed.slice(prefix.length).trim() }
    : { salutation: "", name: trimmed }
}

/**
 * A date the API has already formatted ("02 Jan 2026") as the DD-MM-YYYY the
 * register and the expiry pill use. Anything unparseable is passed through, so
 * a format this does not know still reaches the screen instead of vanishing.
 */
const fromApiDate = (value: string | null | undefined): string => {
  const raw = str(value).trim()
  if (!raw || raw === "Never") return raw
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? raw : asDmy(parsed.toISOString())
}

/** The API writes status upper case; the console matches on lower */
const asStatus = (status: string | null | undefined): AccountStatus =>
  String(status ?? "").toUpperCase() === "INACTIVE" ? "inactive" : "active"

/* --------------------------------------------------------------- the rows -- */

/** One row of the ELPREMAR register. Exactly what the list endpoint answers. */
export type ElpremarRow = {
  /** The user UUID — what the detail route and every write is keyed by */
  id: string
  employeeId: string
  name: string
  salutation: string
  profilePic: string
  designation: string
  roles: string[]
  city: string
  state: string
  country: string
  experience: number
  /** DD-MM-YYYY */
  joined: string
  status: AccountStatus
}

const toRow = (e: ApiElpremarRow): ElpremarRow => ({
  id: e.id,
  employeeId: str(e.employeeId),
  ...splitName(str(e.name)),
  profilePic: str(e.profilePic),
  designation: str(e.designation),
  roles: (e.roles ?? []).map(roleLabel),
  city: str(e.location?.city),
  state: str(e.location?.state),
  country: str(e.location?.country),
  experience: e.experienceYears ?? 0,
  joined: asDmy(e.joinedAt),
  status: asStatus(e.status),
})

/* ------------------------------------------------------------ the profile -- */

export type ElpremarCertificate = {
  id: string
  name: string
  number: string
  issuer: string
  issued: string
  validTill: string
  /** How many scans are held against it */
  documents: number
  /** Where the scan is served from, when there is one */
  documentUrl: string
}

/**
 * The profile the detail screen shows, section by section.
 *
 * Mirrors `ElpremarProfile` in `@/data/elpremar-data` so the page's four forms
 * need no reshaping, with the record-level fields the header needs alongside.
 */
export type ElpremarProfileData = {
  id: string
  employeeId: string
  status: AccountStatus
  joined: string
  profilePic: string
  basic: {
    name: string
    salutation: string
    employeeId: string
    dob: string
    gender: string
    postalCode: string
    district: string
    city: string
    state: string
    addressLine1: string
    addressLine2: string
    phoneCode: string
    phone: string
    email: string
  }
  posting: {
    enterprise: string
    plant: string
    city: string
    country: string
    department: string
    subDepartment: string
    supervisor: string
    effectiveFrom: string
  }
  work: { roles: string[]; designation: string; experience: string }
  certifications: ElpremarCertificate[]
  account: { email: string; role: string; webAccess: boolean; mobileAccess: boolean; lastLogin: string }
}

const toProfile = (e: ApiElpremarDetail): ElpremarProfileData => {
  const b = e.basic
  /* The API splits the salutation out; a row it could not split is split here */
  const fallbackName = splitName(str(e.name ?? b?.fullName))

  return {
    id: e.id,
    employeeId: str(e.employeeId ?? b?.employeeId),
    status: asStatus(e.status),
    joined: fromApiDate(b?.joined),
    profilePic: str(e.profilePic ?? b?.profilePic),
    basic: {
      name: str(b?.name) || fallbackName.name,
      salutation: str(e.salutation ?? b?.salutation) || fallbackName.salutation,
      employeeId: str(e.employeeId ?? b?.employeeId),
      dob: str(b?.dob),
      gender: str(b?.gender),
      postalCode: str(b?.postalCode),
      district: str(b?.district),
      city: str(b?.city),
      state: str(b?.state),
      addressLine1: str(b?.addressLine1),
      addressLine2: str(b?.addressLine2),
      phoneCode: str(b?.phoneCode) || "+91",
      phone: str(b?.phone),
      email: str(b?.email),
    },
    posting: {
      enterprise: str(e.posting?.enterprise),
      plant: str(e.posting?.plant),
      city: str(e.posting?.city),
      country: str(e.posting?.country),
      department: str(e.posting?.department),
      subDepartment: str(e.posting?.subDepartment),
      supervisor: str(e.posting?.supervisor),
      effectiveFrom: str(e.posting?.effectiveFrom),
    },
    work: {
      roles: (e.work?.roles ?? []).map(roleLabel),
      designation: str(e.work?.designation),
      // The form validates years as digits, so a null reads as "0", not ""
      experience: String(e.work?.experience ?? 0),
    },
    certifications: (e.certifications ?? []).map((c) => ({
      id: c.id,
      name: str(c.name),
      number: str(c.number),
      issuer: str(c.issuer),
      issued: fromApiDate(c.issued),
      validTill: fromApiDate(c.validTill),
      documents: c.documents ?? (c.documentUrl ? 1 : 0),
      documentUrl: str(c.documentUrl),
    })),
    account: {
      email: str(e.account?.email ?? b?.email),
      role: str(e.account?.role) || "ELPREMAR",
      webAccess: e.account?.webAccess ?? true,
      mobileAccess: e.account?.mobileAccess ?? true,
      lastLogin: fromApiDate(e.account?.lastLogin) || "Never",
    },
  }
}

/* ----------------------------------------------------------------- reads -- */

export type ElpremarFilters = {
  search?: string
  /** A stream role, with or without the console's prefix */
  roles?: string[]
  status?: AccountStatus | "all"
  /** A city, state or country name */
  location?: string
}

const MAX_LIMIT = 100
const MAX_PAGES = 20

/**
 * The whole register, paged through.
 *
 * Same reasoning as the enterprise register: the screen filters, sorts, counts
 * and exports across every ELPREMAR at once, and the API caps a page at a
 * hundred. One request covers the workforce today, and the KPI tiles are then
 * over everyone rather than over one page.
 */
export async function listElpremars(filters: ElpremarFilters = {}): Promise<Page<ElpremarRow>> {
  const rows: ElpremarRow[] = []
  let pagination = emptyPagination(MAX_LIMIT)

  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await apiFetch<Paged<ApiElpremarRow>>(
      `/api/v1/elpremars${query({
        page,
        limit: MAX_LIMIT,
        search: filters.search?.trim(),
        // The API knows the bare stream names only
        roles: filters.roles?.map(roleStream),
        status: filters.status && filters.status !== "all" ? filters.status.toUpperCase() : undefined,
        location: filters.location,
        sortBy: "joinedAt",
        sortOrder: "desc",
      })}`,
    )
    rows.push(...(body.data ?? []).map(toRow))
    pagination = body.pagination ?? pagination
    if (!body.pagination?.hasNextPage) return { rows, pagination }
  }

  console.warn(`[api] ELPREMAR register stopped at ${MAX_PAGES} pages; ${pagination.total} rows exist.`)
  return { rows, pagination }
}

/** One profile. The API accepts the user UUID or the employee ID. */
export async function getElpremar(id: string): Promise<ElpremarProfileData> {
  const body = await apiFetch<Envelope<ApiElpremarDetail>>(`/api/v1/elpremars/${encodeURIComponent(id)}`)
  return toProfile(body.data)
}

/* ---------------------------------------------------------------- writes -- */

/** Optional text: an empty field is absent, not an empty string */
const orNull = (v: string | undefined): string | null => (v && v.trim() !== "" ? v.trim() : null)

/**
 * The wizard's four steps as the body `POST /elpremars` takes.
 *
 * Sent in the API's own nested form, which is a step-for-step match: the
 * endpoint flattens `basic` / `work` / `posting` / `account` itself, so nothing
 * has to be rearranged here.
 *
 * The address is sent **both** ways — field by field and joined into one line.
 * The API stores a single `address` string, and its reader parses that back
 * into the lines the screen shows, so sending the parts is what lets a postal
 * code and a city survive the round trip.
 */
export function elpremarCreateBody(draft: ElpremarDraft) {
  const { basic, work, assignment, credentials } = draft
  if (!basic || !work || !assignment) {
    throw new Error("Basic details, work and the posting are all needed to submit.")
  }

  return {
    basic: {
      fullName: basic.fullName.trim(),
      dob: basic.dob,
      gender: basic.gender,
      phoneCode: basic.mobileCode ?? "+91",
      mobile: basic.mobile,
      email: basic.email.trim(),
      postalCode: orNull(basic.postalCode),
      district: orNull(basic.district),
      city: orNull(basic.city),
      state: orNull(basic.state),
      addressLine1: orNull(basic.addressLine1),
      addressLine2: orNull(basic.addressLine2),
    },
    work: {
      designation: work.designation,
      experienceYears: Number(work.experience),
      // The API's three official stream names, not the console's prefixed ones
      roles: work.roles.map(roleStream),
      /*
       * Certificates are left out on create. The endpoint requires an uploaded
       * document object for each one, which means a multipart submit; the
       * wizard already holds the files, so this is the next thing to wire.
       */
    },
    posting: {
      // Resolved by name on the API, which is what the step collects
      enterpriseId: assignment.enterprise,
      plantId: assignment.plant,
      departmentId: orNull(assignment.department),
      // Supervisor deliberately omitted — see the note at the top of this file
    },
    account: {
      email: (credentials?.email ?? basic.email).trim(),
      status: "ACTIVE",
    },
  }
}

export async function createElpremar(draft: ElpremarDraft): Promise<ElpremarProfileData> {
  const body = await apiFetch<Envelope<ApiElpremarDetail>>("/api/v1/elpremars", {
    method: "POST",
    body: elpremarCreateBody(draft),
  })
  return toProfile(body.data)
}

/**
 * One section of a profile.
 *
 * The API takes the sections by the same names the detail page edits them
 * under, so a save sends `{ basic: values }` and nothing else — a field the
 * user did not touch is not in the body and is left alone.
 */
export type ElpremarPatch = {
  /** `employeeId` is not editable: the API issues it and does not accept it back */
  basic?: Partial<Omit<ElpremarProfileData["basic"], "employeeId">>
  work?: { designation?: string; experience?: number; roles?: string[] }
  posting?: Partial<ElpremarProfileData["posting"]>
  account?: { email?: string; role?: string; webAccess?: boolean; mobileAccess?: boolean; status?: string }
}

export async function updateElpremar(id: string, patch: ElpremarPatch): Promise<ElpremarProfileData> {
  const body = await apiFetch<Envelope<ApiElpremarDetail>>(`/api/v1/elpremars/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  })
  return toProfile(body.data)
}

/**
 * The basic section as the API takes it.
 *
 * `employeeId` is dropped: it is read-only on the form and the endpoint neither
 * accepts nor would honour it.
 */
export const basicPatch = ({
  employeeId: _employeeId,
  ...rest
}: ElpremarProfileData["basic"]): ElpremarPatch => ({ basic: rest })

/** The work section, with the console's role labels and string years converted */
export const workPatch = (values: { roles: string[]; designation: string; experience: string }): ElpremarPatch => ({
  work: {
    designation: values.designation,
    experience: Number(values.experience),
    roles: values.roles.map(roleStream),
  },
})

/** Deactivating is how an ELPREMAR is stopped — nothing is deleted */
export const setElpremarStatus = (id: string, status: AccountStatus) =>
  updateElpremar(id, { account: { status: status.toUpperCase() } })
