import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "cn"

import { passwordRules } from "@/lib/validation"

/** Live checklist + strength bar shown next to password fields */
export function PasswordRequirements({ value }: { value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3 text-xs">
      <div className="mb-2 font-semibold">Password Requirements</div>
      <ul className="space-y-1.5">
        {passwordRules.map((r) => {
          const ok = r.test(value)
          return (
            <li key={r.label} className={cn("flex items-center gap-2", ok ? "text-foreground" : "text-muted-foreground")}>
              {ok ? <CheckCircle2 className="size-4 text-healthy" /> : <Circle className="size-4" />}
              {r.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function PasswordStrength({ value }: { value: string }) {
  const passed = passwordRules.filter((r) => r.test(value)).length
  const levels = ["", "Weak", "Fair", "Good", "Strong"]
  const color = passed <= 1 ? "bg-critical" : passed === 2 ? "bg-attention" : passed === 3 ? "bg-info" : "bg-healthy"
  if (!value) return null
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full transition-all", color)} style={{ width: `${(passed / 4) * 100}%` }} />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{levels[passed]}</span>
    </div>
  )
}
