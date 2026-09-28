import { z } from "zod"

import { password, phone, required, username } from "@/lib/validation"

export const basicSchema = z.object({
  photo: z.instanceof(File).optional(),
  fullName: required("Full name"),
  employeeId: required("Employee / ID number"),
  dob: required("Date of birth"),
  gender: z.enum(["Male", "Female", "Other"], "Select gender"),
  mobile: phone,
  email: z.email("Enter a valid email address"),
  location: required("Location"),
  plant: required("Plant"),
  department: required("Department"),
  supervisor: z.string().optional(),
  address: z.string().optional(),
})

export const certificationSchema = z.object({
  name: required("Certificate name"),
  organisation: required("Issuing organisation"),
  validTill: required("Valid till"),
})

export const workSchema = z.object({
  designation: required("Role / designation"),
  experience: z.string().regex(/^\d{1,2}$/, "Enter years of experience"),
  shift: required("Shift preference"),
  supervisor: required("Reporting supervisor"),
  skills: z.array(z.string()).min(1, "Select at least one skill"),
  certifications: z.array(certificationSchema),
})

export const credentialsSchema = z
  .object({
    username,
    role: required("User role"),
    password,
    confirmPassword: z.string(),
    webAccess: z.boolean(),
    mobileAccess: z.boolean(),
    sendWelcomeEmail: z.boolean(),
  })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] })
  .refine((v) => v.webAccess || v.mobileAccess, { message: "Allow at least one type of login access", path: ["webAccess"] })

export type BasicValues = z.infer<typeof basicSchema>
export type WorkValues = z.infer<typeof workSchema>
export type CredentialsValues = z.infer<typeof credentialsSchema>
export type CertificationValues = z.infer<typeof certificationSchema>

export type ElpremarDraft = {
  basic?: BasicValues
  work?: WorkValues
  credentials?: CredentialsValues
}
