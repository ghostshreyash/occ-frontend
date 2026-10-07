import { z } from "zod"

import { optionalEmail, password, phone, required } from "@/lib/validation"

const optionalText = z.string().optional()
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
  pin: z.string().trim().regex(/^[A-Za-z0-9 -]{4,10}$/, "Enter a valid postal code"),
})

export const plantSchema = z.object({
  name: required("Plant name"),
  type: required("Plant type"),
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
export type LocationValues = z.infer<typeof locationSchema>
export type PlantValues = z.infer<typeof plantSchema>
export type DepartmentValues = z.infer<typeof departmentSchema>
export type SubDepartmentValues = z.infer<typeof subDepartmentSchema>
export type AccountValues = z.infer<typeof accountSchema>

export type OnboardingData = {
  enterprise?: EnterpriseValues
  location?: LocationValues
  plant?: PlantValues
  department?: DepartmentValues
  subDepartments: SubDepartmentValues[]
  account?: AccountValues
}
