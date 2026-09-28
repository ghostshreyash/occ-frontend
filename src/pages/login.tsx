import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { OlivineEmblem } from "@/components/layout/olivine-logo"
import { PasswordField, TextField } from "@/components/form/fields"

const schema = z.object({
  email: z.email("Enter a valid e-mail address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean(),
})

type LoginValues = z.infer<typeof schema>

/** OCC login (mockup page 1): navy background, gold accents */
export function LoginPage() {
  const navigate = useNavigate()
  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: false },
  })

  // TODO: replace with POST /auth/login + OTP step once the API is ready
  const onSubmit = () => navigate("/")

  return (
    <div className="flex min-h-svh flex-col bg-brand-navy text-brand-navy-foreground">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <h1 className="mb-8 text-center font-serif text-3xl font-semibold text-brand-gold sm:text-4xl">
          Log in to Olivine Command Centre
        </h1>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full max-w-md rounded-xl border border-brand-gold/60 bg-white/[0.03] p-8 shadow-2xl"
          noValidate
        >
          <div className="mb-8 flex flex-col items-center">
            <OlivineEmblem className="size-48" />
          </div>

          {/* Dark-surface overrides so the shared fields read well on navy */}
          <div className="space-y-4 [&_[data-slot=field-label]]:text-xs [&_[data-slot=field-label]]:tracking-wider [&_[data-slot=field-label]]:text-brand-navy-foreground/85 [&_input]:border-brand-gold/50 [&_input]:bg-white/5 [&_input]:text-brand-navy-foreground">
            <TextField control={form.control} name="email" label="E-MAIL ADDRESS" type="email" autoComplete="email" />
            <PasswordField control={form.control} name="password" label="PASSWORD" />
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={form.watch("remember")}
                onCheckedChange={(v) => form.setValue("remember", v === true)}
                className="border-brand-gold/60"
              />
              <Label htmlFor="remember" className="font-normal text-brand-navy-foreground">Remember Me</Label>
            </div>
            <a href="#" className="text-brand-gold underline underline-offset-4 hover:text-brand-gold/80">
              Forgot Password
            </a>
          </div>

          <Button type="submit" variant="brand" size="lg" className="mt-6 h-11 w-full rounded-full text-base font-bold tracking-wide">
            LOG IN
          </Button>

          <div className="mt-4 text-center">
            <a href="#" className="text-sm text-brand-gold underline underline-offset-4 hover:text-brand-gold/80">
              REGISTER NOW
            </a>
          </div>
        </form>
      </main>

      <footer className="border-t border-brand-gold/30 py-3 text-center text-xs tracking-widest text-brand-navy-foreground/80">
        OLIVINE GLOBAL. EST. 2024
      </footer>
    </div>
  )
}
