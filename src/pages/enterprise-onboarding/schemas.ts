import { z } from "zod"

import { optionalEmail, password, required, username } from "@/lib/validation"

const optionalText = z.string().optional()
/** Required coordinate, bounded to a real value. Filled automatically by the map picker. */
const coordinate = (label: string, limit: number) =>
  required(label).refine((v) => {
    const n = Number(v)
    return Number.isFinite(n) && Math.abs(n) <= limit
  }, `Enter a ${label.toLowerCase()} between -${limit} and ${limit}`)

export const enterpriseSchema = z.object({
  name: required("Enterprise name"),
  type: required("Enterprise type"),
  shortName: required("Short name"),
  sector: required("Industry sector"),
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
  latitude: coordinate("Latitude", 90),
  longitude: coordinate("Longitude", 180),
})

export const plantSchema = z.object({
  name: required("Plant name"),
  type: required("Plant type"),
  code: optionalText,
  address: required("Plant address"),
  salutation: required("Salutation"),
  head: required("Plant head"),
  email: optionalEmail,
  phone: optionalText,
  capacity: optionalText,
  commissioningYear: optionalText,
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
  head: optionalText,
  email: optionalEmail,
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
    username,
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
