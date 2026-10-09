import { z } from "zod"

/** Shared validation rules, matching the password requirements shown in the mockups */
export const required = (label = "This field") => z.string().trim().min(1, `${label} is required`)

export const optionalEmail = z.union([z.literal(""), z.email("Enter a valid email address")]).optional()

/**
 * A postal code is exactly six digits - the Indian PIN format. Kept in one
 * place so every form that asks for one agrees on what a valid one looks like.
 */
const PIN = /^\d{6}$/
export const POSTAL_CODE_LENGTH = 6

export const postalCode = z.string().trim().regex(PIN, "Enter a 6-digit postal code")

/** The same rule where the field may be left blank */
export const optionalPostalCode = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || PIN.test(v), "Enter a 6-digit postal code")

/**
 * Exactly ten digits. The dialling code is picked separately, so the number
 * itself carries no country prefix.
 */
const TEN_DIGITS = /^\d{10}$/
export const PHONE_LENGTH = 10

export const phone = z.string().trim().regex(TEN_DIGITS, "Enter a 10-digit phone number")

/** The same rule where the number may be left blank */
export const optionalPhone = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || TEN_DIGITS.test(v), "Enter a 10-digit phone number")

export const passwordRules = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "Include uppercase and lowercase letters", test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: "Include at least one number", test: (v: string) => /\d/.test(v) },
  { label: "Include at least one special character (e.g. @ # $ % ^ &)", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
]

export const password = z
  .string()
  .refine((v) => passwordRules.every((r) => r.test(v)), "Password does not meet the requirements")

export const username = z
  .string()
  .trim()
  .min(6, "Username must be at least 6 characters")
  .regex(/^[a-z0-9._]+$/i, "Use letters, numbers, dots or underscores only")

/** Today as yyyy-MM-dd, the value a date input expects */
export const today = () => {
  const d = new Date()
  return isoDate(d)
}

const isoDate = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * The latest date of birth that still clears a minimum age today. Doubles as
 * the `max` a date input accepts, so the picker cannot offer a date that the
 * schema would then reject.
 */
export const latestBirthDate = (minAge: number) => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - minAge)
  return isoDate(d)
}

/**
 * A date of birth: in the past, and old enough. Dates are held as yyyy-MM-dd,
 * which compares correctly as text, so no parsing is needed.
 */
export const dateOfBirth = (minAge: number) =>
  required("Date of birth")
    .refine((v) => v <= today(), "Date of birth cannot be in the future")
    .refine((v) => v <= latestBirthDate(minAge), `The ELPREMAR must be at least ${minAge} years old`)
