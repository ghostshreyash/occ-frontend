import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, KeyRound } from "lucide-react"
import { cn } from "cn"

import { PasswordField } from "@/components/form/fields"
import { PasswordStrength } from "@/components/form/password-requirements"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { control } from "@/lib/data-table"
import { password } from "@/lib/validation"

const passwordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] })

type PasswordValues = z.infer<typeof passwordSchema>

/**
 * Sets a new password for someone else's account.
 *
 * Shared by the console-user screen and the ELPREMAR profile, which ask for the
 * same thing and used to be one dialog and one unimplemented copy of it. The
 * value is handed to `onSave` and never held here: nothing in this app stores a
 * password, and the API forwards it straight to Cognito.
 *
 * `onSave` may be async - the dialog stays open and disabled until it settles.
 * Throw from it to report failure: the dialog keeps the typed value on screen
 * to retry rather than closing over a request that did not land.
 */
export function ChangePasswordDialog({
  open,
  onOpenChange,
  userName,
  description,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  userName: string
  /** Overrides the default line when the consequence differs. */
  description?: string
  onSave: (password: string) => void | Promise<void>
}) {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })
  const pwd = form.watch("password")
  const saving = form.formState.isSubmitting

  const submit = form.handleSubmit(async (values) => {
    /*
     * A throwing `onSave` means "did not save": the dialog stays open with the
     * typed value so it can be retried. Caught here rather than left to reject,
     * which would surface as an unhandled rejection from the click handler.
     * The caller is responsible for telling the user why.
     */
    try {
      await onSave(values.password)
    } catch {
      return
    }
    form.reset()
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={(v) => (saving ? undefined : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <KeyRound className="size-4 text-primary" /> Change Password
          </DialogTitle>
          <DialogDescription>
            {description
              ?? `Sets a new password for ${userName}. They are asked to replace it the next time they sign in.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="space-y-2">
            <PasswordField control={form.control} name="password" label="New Password" required />
            <PasswordStrength value={pwd} />
          </div>
          <PasswordField control={form.control} name="confirmPassword" label="Confirm Password" required />
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className={cn(control, "bg-card")}
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button size="sm" className={control} onClick={submit} disabled={saving}>
            <Check className="size-3.5" /> {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
