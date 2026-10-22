import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "react-router"
import { ArrowLeft, ArrowRight, LogIn, Mail, Phone, TriangleAlert, UserRound, UserRoundPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { PasswordField, SelectField, TextField, TextareaField } from "@/components/form/fields"
import { PasswordStrength } from "@/components/form/password-requirements"
import { AuthAside, AuthCard, AuthNotice, AuthScreen, AuthSubmit } from "@/components/auth/auth-screen"
import { AuthResult } from "@/components/auth/auth-result"
import { useBrand } from "@/lib/brand"
import { AuthSteps } from "@/components/auth/auth-steps"
import { OtpForm } from "@/components/auth/otp-form"
import { confirmRegistration, registerUser } from "@/lib/auth/auth-service"
import { submitRegistrationProfile } from "@/lib/auth/registration"
import { AuthError, type OtpChallenge } from "@/lib/auth/types"
import { ACCESS_ROLES, accessRequestSchema, type AccessRequestValues } from "./schemas"

const STEPS = ["Your details", "Verify e-mail", "Done"]

/**
 * Registration.
 *
 * Creates the Cognito account directly — `signUp` stores the attributes and
 * e-mails a confirmation code, `confirmSignUp` activates the account. The OCC
 * database row is created on first sign-in by `/auth/sync`, which reads the
 * attributes back off the verified token.
 *
 * The fields Cognito has no attribute for (organisation, reason) are posted to
 * the backend separately, and that post is not allowed to fail the sign-up.
 */
export function RegisterPage() {
  const brand = useBrand()
  const [step, setStep] = useState(0)
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null)
  const [reference, setReference] = useState("")
  const [error, setError] = useState<string | null>(null)

  const form = useForm<AccessRequestValues>({
    resolver: zodResolver(accessRequestSchema),
    defaultValues: {
      fullName: "", email: "", mobile: "", organisation: "", role: "", reason: "",
      password: "", confirmPassword: "",
    },
  })

  async function onSubmit(values: AccessRequestValues) {
    setError(null)
    try {
      // Cognito first: if it rejects the account, nothing else should have run
      const next = await registerUser(values)
      // Bookkeeping only — a backend that is down must not lose the account
      await submitRegistrationProfile(values)
      setChallenge(next)
      setStep(1)
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "We could not create your account. Please try again.")
    }
  }

  if (step === 2) {
    return (
      <AuthScreen brand={brand}>
        <AuthCard brand={brand} emblem={false} title="Account created" above={<AuthSteps steps={STEPS} current={2} />}>
          <AuthResult
            tone="success"
            title="Your account is ready"
            description="Your e-mail address is confirmed. You can sign in now."
            reference={reference}
            referenceLabel="Registered e-mail"
            notes={[
              "Signing in sends a one-time code to this address.",
              "An administrator assigns your console access; some areas stay hidden until they do.",
            ]}
          >
            <Button size="lg" asChild className="h-11 w-full text-base font-semibold">
              <Link to="/login">
                <LogIn /> Back to sign in
              </Link>
            </Button>
          </AuthResult>
        </AuthCard>
      </AuthScreen>
    )
  }

  if (step === 1 && challenge) {
    return (
      <AuthScreen brand={brand}>
        <AuthCard
          brand={brand}
          emblem={false}
          title="Verify your e-mail"
          description="Enter the code we sent so we can activate your account."
          above={<AuthSteps steps={STEPS} current={1} />}
        >
          <OtpForm
            challenge={challenge}
            onChallengeChange={setChallenge}
            verifyLabel="Verify & activate account"
            recoveryHref={null}
            onVerify={async (code) => {
              await confirmRegistration(challenge, code)
              setReference(form.getValues("email"))
              setStep(2)
              window.scrollTo({ top: 0 })
            }}
          />
        </AuthCard>

        <AuthAside>
          <button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-1.5 hover:text-brand-gold">
            <ArrowLeft className="size-4" /> Edit my details
          </button>
        </AuthAside>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen brand={brand} width="wide">
      <AuthCard
        brand={brand}
        emblem={false}
        title="Create your account"
        description="Register for the OLIVINE console. Your access level is assigned by an administrator."
        above={<AuthSteps steps={STEPS} current={0} />}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          {error ? <AuthNotice icon={<TriangleAlert className="size-4" />}>{error}</AuthNotice> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="fullName"
              label="Full name"
              required
              autoComplete="name"
              startIcon={<UserRound />}
              placeholder="e.g. Rahul Mehta"
            />
            <TextField
              control={form.control}
              name="organisation"
              label="Organisation"
              required
              placeholder="e.g. Olivine Global Systems"
            />
            <TextField
              control={form.control}
              name="email"
              label="Official e-mail"
              type="email"
              required
              autoComplete="email"
              startIcon={<Mail />}
              placeholder="you@company.com"
            />
            <TextField
              control={form.control}
              name="mobile"
              label="Mobile number"
              type="tel"
              required
              autoComplete="tel"
              startIcon={<Phone />}
              placeholder="+91 98765 43210"
              description="The one-time code is sent here."
            />
            <SelectField
              control={form.control}
              name="role"
              label="Role requested"
              required
              options={[...ACCESS_ROLES]}
              placeholder="Select the access you need"
              className="sm:col-span-2"
            />
            <TextareaField
              control={form.control}
              name="reason"
              label="Reason for access"
              required
              rows={3}
              className="sm:col-span-2"
              placeholder="Briefly describe why you need access."
            />

            {/* The account is created in Cognito now, so it needs a password */}
            <div className="space-y-2">
              <PasswordField control={form.control} name="password" label="Password" required />
              <PasswordStrength value={form.watch("password")} />
            </div>
            <PasswordField control={form.control} name="confirmPassword" label="Confirm password" required />
          </div>

          <AuthSubmit busy={form.formState.isSubmitting} className="mt-5">
            {form.formState.isSubmitting ? <Spinner /> : <UserRoundPlus />} Continue <ArrowRight />
          </AuthSubmit>
        </form>
      </AuthCard>

      <AuthAside>
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-gold underline-offset-4 hover:underline">
          Sign in instead
        </Link>
      </AuthAside>
    </AuthScreen>
  )
}
