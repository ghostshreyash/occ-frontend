import { Navigate, useLocation, useNavigate } from "react-router"
import { ArrowLeft, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AuthBadge, AuthCard, AuthScreen } from "@/components/auth/auth-screen"
import { BrandStory } from "@/components/auth/brand-story"
import { OtpForm } from "@/components/auth/otp-form"
import { useBrand } from "@/lib/brand"
import { useAuth } from "@/lib/auth/context"
import { otpDestinations, verifyOtp } from "@/lib/auth/auth-service"

/**
 * Sign in — step 2 of 2.
 *
 * The same screen as the password step: same brand panel, same card in the same
 * place, with the code replacing the credentials. Reached only with a live
 * challenge, so a refresh returns to step 1 rather than stranding the visitor
 * on a code that no longer exists.
 */
export function VerifyOtpPage() {
  const brand = useBrand()
  const navigate = useNavigate()
  const location = useLocation()
  const { challenge, setChallenge, signIn } = useAuth()
  const brandQuery = brand.key === "occ" ? "" : `?brand=${brand.key}`

  if (!challenge || challenge.purpose !== "login") return <Navigate to="/login" replace />

  const remember = (location.state as { remember?: boolean } | null)?.remember ?? false

  return (
    <AuthScreen brand={brand} story={<BrandStory brand={brand} />}>
      <AuthCard
        brand={brand}
        badge={
          brand.key === "occ" || brand.visual.kind === "photo" ? undefined : (
            <AuthBadge>
              <ShieldCheck className="size-3.5" /> Step 2 of 2
            </AuthBadge>
          )
        }
        title="Two-step verification"
        description="One more step to keep your account secure."
      >
        <OtpForm
          challenge={challenge}
          onChallengeChange={setChallenge}
          destinations={otpDestinations()}
          verifyLabel="Verify & continue"
          onVerify={async (code) => {
            const user = await verifyOtp(challenge, code)
            signIn(user, remember)
            navigate(challenge.next ?? "/", { replace: true })
          }}
        />
      </AuthCard>

      <div className="mt-4 text-center">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate(`/login${brandQuery}`)}>
          <ArrowLeft /> Back to sign in
        </Button>
      </div>
    </AuthScreen>
  )
}
