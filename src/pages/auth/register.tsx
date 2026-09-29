import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "react-router"
import { ArrowLeft, ArrowRight, LogIn, Mail, Phone, TriangleAlert, UserRound, UserRoundPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { SelectField, TextField, TextareaField } from "@/components/form/fields"
import { AuthCard, AuthNotice, AuthScreen, AuthSubmit } from "@/components/auth/auth-screen"
import { AuthResult } from "@/components/auth/auth-result"
import { useBrand } from "@/lib/brand"
import { AuthSteps } from "@/components/auth/auth-steps"
import { OtpForm } from "@/components/auth/otp-form"
import { completeAccessRequest, startAccessRequest } from "@/lib/auth/auth-service"
import { AuthError, type OtpChallenge } from "@/lib/auth/types"
import { ACCESS_ROLES, accessRequestSchema, type AccessRequestValues } from "./schemas"

const STEPS = ["Your details", "Verify mobile", "Submitted"]

/**
 * "Request access".
 *
 * Accounts are created by an OLIVINE administrator, so this raises a request
 * rather than creating one. The applicant's mobile is verified first, using the
 * same one-time-code step as signing in.
 */
export function RegisterPage() {
  const brand = useBrand()
  const [step, setStep] = useState(0)
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null)
  const [reference, setReference] = useState("")
  const [error, setError] = useState<string | null>(null)

  const form = useForm<AccessRequestValues>({
    resolver: zodResolver(accessRequestSchema),
    defaultValues: { fullName: "", email: "", mobile: "", organisation: "", role: "", reason: "" },
  })

  async function onSubmit(values: AccessRequestValues) {
    setError(null)
    try {
      setChallenge(await startAccessRequest(values))
      setStep(1)
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "We could not submit your request. Please try again.")
    }
  }

  if (step === 2) {
    return (
      <AuthScreen brand={brand}>
        <AuthCard title="Request submitted" above={<AuthSteps steps={STEPS} current={2} />}>
          <AuthResult
            tone="pending"
            title="Your request is with the OLIVINE team"
            description="An administrator will review it and set up your account."
            reference={reference}
            referenceLabel="Request reference"
            notes={[
              "You will receive an e-mail once your request is approved.",
              "Your login credentials will be sent to your registered e-mail address.",
              "Quote the reference above when following up with the helpdesk.",
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
          title="Verify your mobile"
          description="Confirm the number so the team can reach you about this request."
          above={<AuthSteps steps={STEPS} current={1} />}
        >
          <OtpForm
            challenge={challenge}
            onChallengeChange={setChallenge}
            verifyLabel="Verify & submit request"
            recoveryHref={null}
            onVerify={async (code) => {
              const { reference: ref } = await completeAccessRequest(challenge, code)
              setReference(ref)
              setStep(2)
              window.scrollTo({ top: 0 })
            }}
          />
        </AuthCard>

        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setStep(0)}>
            <ArrowLeft /> Edit my details
          </Button>
        </div>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen brand={brand}>
      <AuthCard
        title="Request access"
        description="Tell us who you are and an OLIVINE administrator will set up your account."
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
              options={ACCESS_ROLES}
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
          </div>

          <AuthSubmit busy={form.formState.isSubmitting} className="mt-5">
            {form.formState.isSubmitting ? <Spinner /> : <UserRoundPlus />} Continue <ArrowRight />
          </AuthSubmit>
        </form>
      </AuthCard>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in instead
        </Link>
      </div>
    </AuthScreen>
  )
}
