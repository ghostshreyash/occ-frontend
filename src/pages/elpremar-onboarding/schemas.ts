import { z } from "zod"

import { password, phone, required } from "@/lib/validation"

export const basicSchema = z.object({
  photo: z.instanceof(File).optional(),
  fullName: required("Full name"),
  employeeId: required("Employee / ID number"),
  dob: required("Date of birth"),
  gender: z.enum(["Male", "Female", "Other"], "Select gender"),
  mobileCode: z.string().optional(),
  mobile: phone,
  email: z.email("Enter a valid email address"),
  /* Address is captured field-wise - the physical location drives dispatch */
  postalCode: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
})

/**
 * Assigning an ELPREMAR to an enterprise that already exists - this step picks
 * from the hierarchy, it never creates one.
 */
export const assignmentSchema = z.object({
  enterprise: required("Enterprise"),
  plant: required("Plant"),
  /* Retail enterprises do not share the industrial department structure */
  department: z.string().optional(),
  subDepartment: z.string().optional(),
  /* A supervisor has nobody above them to record */
  supervisor: z.string().optional(),
  effectiveFrom: required("Effective from"),
})

export const certificationSchema = z.object({
  name: required("Certificate name"),
  /** The number the issuing body printed on the certificate */
  number: required("Certificate number"),
  organisation: required("Issuing organisation"),
  certificateId: z.string().optional(),
  validTill: required("Valid till"),
  /** Scans of the certificate; more than one may be held */
  documents: z.array(z.instanceof(File)),
})

export const workSchema = z.object({
  /** One person can cover more than one stream */
  roles: z.array(z.string()).min(1, "Select at least one role"),
  designation: required("Designation"),
  experience: z.string().regex(/^\d{1,2}$/, "Enter years of experience"),
  certifications: z.array(certificationSchema),
  /** Identity documents - more than one may be held */
  kycDocuments: z.array(z.instanceof(File)),
})

export const credentialsSchema = z
  .object({
    // The ELPREMAR signs in with their email, carried over from Basic Details
    email: z.email("Enter a valid email address"),
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
export type AssignmentValues = z.infer<typeof assignmentSchema>
export type WorkValues = z.infer<typeof workSchema>
export type CredentialsValues = z.infer<typeof credentialsSchema>
export type CertificationValues = z.infer<typeof certificationSchema>

export type ElpremarDraft = {
  basic?: BasicValues
  work?: WorkValues
  assignment?: AssignmentValues
  credentials?: CredentialsValues
}
