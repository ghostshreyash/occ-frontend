import { z } from "zod"

import { optionalEmail, password, required, username } from "@/lib/validation"

const optionalText = z.string().optional()
const optionalNumber = z.string().regex(/^-?\d*\.?\d*$/, "Enter a number").optional()

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
  latitude: optionalNumber,
  longitude: optionalNumber,
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

export const departmentSchema = z.object({
  name: required("Department name"),
  code: required("Department code"),
  type: required("Department type"),
  parent: optionalText,
  head: optionalText,
  email: optionalEmail,
  phone: optionalText,
  location: optionalText,
  description: optionalText,
})

export const subDepartmentSchema = z.object({
  name: required("Sub-department name"),
  code: required("Sub-department code"),
  function: required("Function / Area"),
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
}
