import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate, useSearchParams } from "react-router"
import { ArrowRight, Building2, Info, KeyRound, Lock, Mail, ShieldAlert, TriangleAlert, UserRound } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { PasswordField, TextField } from "@/components/form/fields"
import { AuthBadge, AuthCard, AuthNotice, AuthScreen, AuthSubmit } from "@/components/auth/auth-screen"
import { BrandStory } from "@/components/auth/brand-story"
import { useBrand } from "@/lib/brand"
import { useAuth } from "@/lib/auth/context"
import { signIn } from "@/lib/auth/auth-service"
import { AuthError } from "@/lib/auth/types"
import { portalLoginSchema, type PortalLoginValues } from "./schemas"

/** Why the visitor was sent back here, set by the guard or by signing out. */
const reasons: Record<string, string> = {
  expired: "Your session has expired. Please sign in again.",
  "signed-out": "You have been signed out.",
  reset: "Password updated. Sign in with your new password.",
}

/**
 * Sign in — step 1 of 2.
 *
 * One screen serves all three hostnames: the brand resolved from the host
 * supplies the wordmark, the story panel and the field labels, while the
 * credentials, the one-time code that follows and the session are shared.
 */
export function LoginPage() {
  const brand = useBrand()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { setChallenge } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const next = params.get("next") ?? undefined
  const reason = reasons[params.get("reason") ?? ""]
  const { login } = brand
  const brandQuery = brand.key === "occ" ? "" : `?brand=${brand.key}`

  const form = useForm<PortalLoginValues>({
    resolver: zodResolver(portalLoginSchema),
    defaultValues: { identifier: "", password: "", remember: false },
  })

  async function onSubmit(values: PortalLoginValues) {
    setError(null)
    try {
      setChallenge(await signIn(values.identifier, values.password, next))
      navigate(`/login/verify${brandQuery}`, { state: { remember: values.remember } })
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Sign in failed. Please try again.")
    }
  }

  return (
    <AuthScreen brand={brand} story={<BrandStory brand={brand} />}>
      <AuthCard
        brand={brand}
        badge={brand.key === "occ" || brand.visual.kind === "photo" ? undefined : <AuthBadge><KeyRound className="size-3.5" /> Step 1 of 2</AuthBadge>}
        title={login.heading}
        description={login.description}
        footer={
          login.footnote && brand.cardAlign === "center" ? (
            <div className="flex items-start gap-3 rounded-lg bg-info-soft px-4 py-3 text-sm">
              <Building2 className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <span className="block font-semibold text-brand-navy dark:text-foreground">
                  {login.footnote.title}
                </span>
                <span className="text-muted-foreground">{login.footnote.body}</span>
                <Link
                  to={login.footnote.to}
                  className="mt-0.5 block font-medium text-primary underline-offset-4 hover:underline"
                >
                  {login.footnote.linkLabel} →
                </Link>
              </span>
            </div>
          ) : undefined
        }
      >
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          {error ? (
            <AuthNotice icon={<TriangleAlert className="size-4" />}>{error}</AuthNotice>
          ) : reason ? (
            <AuthNotice variant="info" icon={<Info className="size-4" />}>
              {reason}
            </AuthNotice>
          ) : null}

          <div className="space-y-4">
            <TextField
              control={form.control}
              name="identifier"
              label={login.identifierLabel}
              required
              type={login.identifierType}
              autoComplete="username"
              placeholder={login.identifierPlaceholder}
              startIcon={login.identifierIcon === "user" ? <UserRound /> : <Mail />}
              clearable
              inputClassName="h-11"
            />
            <PasswordField
              control={form.control}
              name="password"
              label="Password"
              required
              startIcon={<Lock />}
              placeholder="Enter your password"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={form.watch("remember")}
                onCheckedChange={(v) => form.setValue("remember", v === true)}
              />
              <Label htmlFor="remember" className="font-normal">
                Remember me
              </Label>
            </div>
            <Link to="/forgot-password" className="text-primary underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>

          <AuthSubmit
            busy={form.formState.isSubmitting}
            className={
              brand.key === "occ"
                ? "mt-5 bg-brand-gold text-brand-navy hover:bg-brand-gold/90"
                : brand.key === "emmse"
                  ? "mt-5 h-12 bg-brand-navy text-brand-navy-foreground hover:bg-brand-navy/90"
                  : "mt-5"
            }
          >
            {form.formState.isSubmitting ? <Spinner /> : null}
            {login.submitLabel}
            {form.formState.isSubmitting ? null : <ArrowRight />}
          </AuthSubmit>

          {login.notice ? (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-info-soft px-3 py-2.5 text-xs text-info-soft-foreground">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block font-semibold">{login.notice.title}</span>
                {login.notice.body}
              </span>
            </div>
          ) : null}

          <p className={brand.key === "evita" ? "hidden" : "mt-5 text-center text-xs text-muted-foreground"}>
            Protected by two-step verification ·{" "}
            <Link to="/account-recovery" className="underline-offset-4 hover:underline">
              Can&apos;t sign in?
            </Link>
          </p>
        </form>
      </AuthCard>

      {login.footnote && brand.cardAlign !== "center" ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border bg-card/70 px-4 py-3 text-sm backdrop-blur-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            <span className="font-semibold text-brand-navy dark:text-foreground">{login.footnote.title}</span>{" "}
            <span className="text-muted-foreground">{login.footnote.body}</span>{" "}
            <Link to={login.footnote.to} className="font-medium text-primary underline-offset-4 hover:underline">
              {login.footnote.linkLabel} →
            </Link>
          </span>
        </div>
      ) : null}
      {/* <p
        className={
          brand.key === "evita" || brand.cardAlign === "center"
            ? "hidden"
            : "mt-4 text-center text-sm text-muted-foreground"
        }
      >
        Looking for a different system?{" "}
        <Link to="/welcome" className="font-medium text-primary underline-offset-4 hover:underline">
          See all Olivine systems →
        </Link>
      </p> */}
    </AuthScreen>
  )
}
