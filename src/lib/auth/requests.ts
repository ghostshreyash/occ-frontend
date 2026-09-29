/** Payloads for the two request forms that are queued for a human to approve. */

export type AccessRequestInput = {
  fullName: string
  email: string
  mobile: string
  organisation: string
  role: string
  reason: string
}

export type RecoveryRequestInput = {
  fullName: string
  employeeId: string
  registeredEmail: string
  alternateContact: string
  reason: string
}
