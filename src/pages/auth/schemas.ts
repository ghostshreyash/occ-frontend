import { z } from "zod"

import { password, phone, required } from "@/lib/validation"

export const loginSchema = z.object({
  email: z.email("Enter a valid e-mail address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean(),
})
export type LoginValues = z.infer<typeof loginSchema>

/** EMMS-E / EVITA sign in: the identifier may be a username, not an e-mail. */
export const portalLoginSchema = z.object({
  identifier: required("This field"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean(),
})
export type PortalLoginValues = z.infer<typeof portalLoginSchema>

/** Account recovery starts from either the registered e-mail or mobile number. */
export const identifySchema = z.object({
  method: z.enum(["mobile", "email"]),
  identifier: required("This field"),
})
  .refine(
    (v) => (v.method === "email" ? z.email().safeParse(v.identifier).success : phone.safeParse(v.identifier).success),
    { path: ["identifier"], message: "Enter the registered mobile number or e-mail address" }
  )
export type IdentifyValues = z.infer<typeof identifySchema>

export const newPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
export type NewPasswordValues = z.infer<typeof newPasswordSchema>

export const accessRequestSchema = z.object({
  fullName: required("Full name"),
  email: z.email("Enter your official e-mail address"),
  mobile: phone,
  organisation: required("Organisation"),
  role: required("Role"),
  reason: required("Reason").max(500),
})
export type AccessRequestValues = z.infer<typeof accessRequestSchema>

export const recoverySchema = z.object({
  fullName: required("Full name"),
  employeeId: required("Employee / User ID"),
  registeredEmail: z.email("Enter the e-mail address on your OCC account"),
  alternateContact: required("Alternate contact"),
  reason: required("Details").max(500),
})
export type RecoveryValues = z.infer<typeof recoverySchema>

export const ACCESS_ROLES = [
  "OCC Operator",
  "OCC Supervisor",
  "OLIVINE Admin",
  "Enterprise Coordinator",
  "Support / Helpdesk",
] as const

/** Step labels for the password-reset flow, shared by its three screens. */
export const RESET_STEPS = ["Identify", "Verify", "New password", "Done"]
