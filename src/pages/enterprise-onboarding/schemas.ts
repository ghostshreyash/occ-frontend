import { z } from "zod"

import { optionalEmail, password, phone, required } from "@/lib/validation"
import { timeZones } from "@/data/mock"

const optionalText = z.string().optional()

/** A postal code is never demanded, but a typo in one that was typed is caught */
const postalCode = z
  .string()
  .optional()
  .refine((v) => !v || v.trim() === "" || /^[A-Za-z0-9 -]{4,10}$/.test(v.trim()), "Enter a valid postal code")
/**
 * Optional coordinate - the map picker fills these in, so they are not required,
 * but anything typed still has to be a real value in range.
 */
const coordinate = (label: string, limit: number) =>
  z
    .string()
    .optional()
    .refine((v) => {
      if (!v || v.trim() === "") return true
      const n = Number(v)
      return Number.isFinite(n) && Math.abs(n) <= limit
    }, `Enter a ${label.toLowerCase()} between -${limit} and ${limit}`)

export const enterpriseSchema = z.object({
  name: required("Enterprise name"),
  /* Optional - two companies under one group may share a prefix anyway */
  shortName: z.string().optional(),
  /** Industry or Retail - drives which sector list applies */
  sectorType: required("Sector"),
  /** The specific sector, from the list for the chosen sector type */
  sector: required("Sector value"),
  website: z.union([z.literal(""), z.url("Enter a valid URL")]).optional(),
  logo: z.instanceof(File).optional(),
  description: optionalText,
})

export const locationSchema = z.object({
  country: required("Country"),
  state: required("State"),
  city: required("City"),
  address: required("Address"),
  /*
   * Optional: an ELPREMAR onboarding in the field does not always have the head
   * office postal code to hand. Anything entered still has to look like one.
   */
  pin: postalCode,
})

export const plantSchema = z.object({
  name: required("Plant name"),
  /* Not mandatory: nothing in onboarding depends on it, and it is editable later */
  type: optionalText,
  code: optionalText,
  address: required("Plant address"),
  /*
   * The plant's own location, not the head office's. Work is dispatched here,
   * so these coordinates are the ones that matter.
   */
  /* Resolved from the postal code rather than typed */
  city: optionalText,
  pin: required("Postal code"),
  latitude: coordinate("Latitude", 90),
  longitude: coordinate("Longitude", 180),
  salutation: required("Salutation"),
  head: required("Plant head"),
  email: z.email("Enter a valid email address"),
  phoneCode: optionalText,
  phone,
  capacity: optionalText,
  capacityUnit: optionalText,
  commissioningDate: optionalText,
  timeZone: optionalText,
  logo: z.instanceof(File).optional(),
  notes: optionalText,
})

/*
 * Onboarding asks for the enterprise and its head office together, in one step.
 * They are still stored apart, because the location is edited on its own from
 * the enterprise page.
 */
export const enterpriseDetailsSchema = enterpriseSchema.extend(locationSchema.shape)

/** Department is optional: an enterprise can be onboarded without one */
export const departmentSchema = z.object({
  name: optionalText,
  code: optionalText,
  type: optionalText,
  parent: optionalText,
  salutation: optionalText,
  head: optionalText,
  email: optionalEmail,
  phoneCode: optionalText,
  phone: optionalText,
  location: optionalText,
  description: optionalText,
})

/** Sub-departments are optional - the whole section can be skipped */
export const subDepartmentSchema = z.object({
  name: optionalText,
  code: optionalText,
  function: optionalText,
  description: optionalText,
})

export const accountSchema = z
  .object({
    email: z.email("Enter a valid email address"),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type EnterpriseValues = z.infer<typeof enterpriseSchema>
export type EnterpriseDetailsValues = z.infer<typeof enterpriseDetailsSchema>
export type LocationValues = z.infer<typeof locationSchema>
export type PlantValues = z.infer<typeof plantSchema>
export type DepartmentValues = z.infer<typeof departmentSchema>
export type SubDepartmentValues = z.infer<typeof subDepartmentSchema>
export type AccountValues = z.infer<typeof accountSchema>

/** A department as captured during onboarding, with the sub-departments under it */
export type DepartmentEntry = DepartmentValues & { subDepartments: SubDepartmentValues[] }

/** A plant as captured during onboarding, with the departments under it */
export type PlantEntry = PlantValues & { departments: DepartmentEntry[] }

/*
 * An enterprise has many plants, each with many departments, each with many
 * sub-departments - the same shape as EnterpriseProfile, so the payload the
 * wizard builds is the one the API will be handed.
 */
export type OnboardingData = {
  enterprise?: EnterpriseValues
  location?: LocationValues
  plants: PlantEntry[]
  account?: AccountValues
}

/*
 * An empty form for each entity. Shared so that adding a plant to an existing
 * enterprise starts from exactly the same blank form as onboarding one does.
 */
export const blankPlant: PlantValues = {
  name: "", type: "", code: "", address: "", salutation: "Mr.", head: "", email: "", phoneCode: "+91", phone: "",
  capacity: "", capacityUnit: "", commissioningDate: "", timeZone: timeZones[0], notes: "",
  city: "", pin: "", latitude: "", longitude: "",
}
export const blankDepartment: DepartmentValues = {
  name: "", code: "", type: "", parent: "", salutation: "Mr.", head: "", email: "", phoneCode: "+91", phone: "",
  location: "", description: "",
}
export const blankSubDepartment: SubDepartmentValues = { name: "", code: "", function: "", description: "" }

/** Splits the combined step back into the two records the rest of the app stores */
export const splitEnterpriseDetails = (v: EnterpriseDetailsValues) => ({
  enterprise: {
    name: v.name,
    shortName: v.shortName,
    sectorType: v.sectorType,
    sector: v.sector,
    website: v.website,
    logo: v.logo,
    description: v.description,
  },
  location: { country: v.country, state: v.state, city: v.city, address: v.address, pin: v.pin },
})
