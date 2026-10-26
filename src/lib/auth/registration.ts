/**
 * The parts of a registration Cognito has no attribute for.
 *
 * `signUp` carries e-mail, phone, name and `custom:user_role`. Organisation and
 * the stated reason are OCC's own, so they go to the backend — unauthenticated,
 * because the applicant has no session yet and will not have one until they have
 * confirmed the e-mail and signed in.
 *
 * The call is deliberately best-effort. The account exists in Cognito by the
 * time this runs, so failing the sign-up over a bookkeeping write would leave
 * the user with an account they were told they did not get.
 */
import { ApiError, apiFetch } from "@/lib/api/client"

export type RegistrationProfile = {
  fullName: string
  email: string
  mobile: string
  organisation: string
  role: string
  reason: string
}

export async function submitRegistrationProfile(input: RegistrationProfile): Promise<void> {
  try {
    await apiFetch("/api/v1/auth/register-profile", {
      method: "POST",
      auth: false,
      // No password and no code: the backend reads identity from Cognito later
      body: {
        email: input.email.trim().toLowerCase(),
        fullName: input.fullName.trim(),
        organisation: input.organisation.trim(),
        role: input.role,
        reason: input.reason.trim(),
      },
    })
  } catch (e) {
    /*
     * 404 while the endpoint does not exist yet, 0 while the API is not running.
     * Both are expected during local work and neither invalidates the account.
     */
    const status = e instanceof ApiError ? e.status : undefined
    console.warn(`[auth] register-profile not stored (status ${status ?? "?"}).`, e)
  }
}
