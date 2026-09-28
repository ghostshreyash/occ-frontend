import { useState } from "react"
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form"
import { Eye, EyeOff, UploadCloud } from "lucide-react"
import { cn } from "cn"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

type BaseProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: string
  required?: boolean
  optional?: boolean
  description?: string
  className?: string
}

function FieldTitle({ label, required, optional, htmlFor }: { label: string; required?: boolean; optional?: boolean; htmlFor: string }) {
  return (
    <FieldLabel htmlFor={htmlFor} className="gap-1">
      {label}
      {required ? <span className="text-critical">*</span> : null}
      {optional ? <span className="font-normal text-muted-foreground">(Optional)</span> : null}
    </FieldLabel>
  )
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  optional,
  description,
  className,
  ...inputProps
}: BaseProps<T> & Omit<React.ComponentProps<typeof Input>, "name">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldTitle label={label} required={required} optional={optional} htmlFor={name} />
          <Input id={name} aria-invalid={fieldState.invalid} {...inputProps} {...field} value={field.value ?? ""} />
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export function PasswordField<T extends FieldValues>(props: BaseProps<T> & { placeholder?: string }) {
  const [visible, setVisible] = useState(false)
  const { control, name, label, required, description, className, placeholder } = props
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldTitle label={label} required={required} htmlFor={name} />
          <div className="relative">
            <Input
              id={name}
              type={visible ? "text" : "password"}
              placeholder={placeholder}
              aria-invalid={fieldState.invalid}
              className="pr-10"
              {...field}
              value={field.value ?? ""}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
            >
              {visible ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  optional,
  className,
  maxLength = 500,
  rows = 4,
  placeholder,
}: BaseProps<T> & { maxLength?: number; rows?: number; placeholder?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldTitle label={label} required={required} optional={optional} htmlFor={name} />
          <Textarea
            id={name}
            rows={rows}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            {...field}
            value={field.value ?? ""}
          />
          <div className="text-right text-xs text-muted-foreground">
            {(field.value ?? "").length}/{maxLength}
          </div>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  optional,
  className,
  options,
  placeholder = "Select",
}: BaseProps<T> & { options: readonly string[]; placeholder?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldTitle label={label} required={required} optional={optional} htmlFor={name} />
          <Select value={field.value ?? ""} onValueChange={field.onChange}>
            <SelectTrigger id={name} aria-invalid={fieldState.invalid} className="w-full" onBlur={field.onBlur}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

/** Drag-and-drop style file picker (PNG/JPG logos, photos). Keeps the chosen File in form state. */
export function FileDropField<T extends FieldValues>({
  control,
  name,
  label,
  optional,
  className,
  hint = "PNG, JPG (Max 2 MB)",
  accept = "image/png,image/jpeg",
}: BaseProps<T> & { hint?: string; accept?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const file = field.value as File | undefined
        return (
          <Field className={className}>
            <FieldTitle label={label} optional={optional} htmlFor={name} />
            <label
              htmlFor={name}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input bg-muted/40 p-5 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-accent"
              )}
            >
              <UploadCloud className="size-8 text-primary" />
              {file ? (
                <span className="font-medium text-foreground">{file.name}</span>
              ) : (
                <>
                  <span>Drag &amp; drop file here</span>
                  <span className="text-xs">or</span>
                  <span className="rounded-md border bg-card px-3 py-1 font-medium text-foreground">Choose File</span>
                </>
              )}
              <input
                id={name}
                type="file"
                accept={accept}
                className="sr-only"
                onChange={(e) => field.onChange(e.target.files?.[0])}
              />
            </label>
            <FieldDescription className="text-xs">{hint}</FieldDescription>
          </Field>
        )
      }}
    />
  )
}
