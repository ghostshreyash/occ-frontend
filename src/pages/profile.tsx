import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Camera, Check, Loader2, Mail, Pencil, Phone, ShieldCheck, Trash2, UserRound, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"

import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { Detail } from "@/components/common/detail-view"
import { PhoneField, TextField } from "@/components/form/fields"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { dialCodes } from "@/data/master-data"
import { useAuth } from "@/lib/auth/context"
import { control } from "@/lib/data-table"
import { required } from "@/lib/validation"

const schema = z.object({
  name: required("Name"),
  mobileCode: z.string().optional(),
  // Ten digits exactly - the dialling code is held separately in mobileCode
  mobile: z.string().regex(/^\d{10}$/, "Enter a 10-digit phone number"),
  // Also the sign-in identity, so a change here changes how you log in
  email: z.email("Enter a valid email address"),
})
type ProfileValues = z.infer<typeof schema>

/*
 * The session stores one string ("+91 98200 11223") because that is what every
 * other screen renders. The form needs the two halves apart, so split on the
 * longest dialling code that matches - "+971" has to win over "+9".
 */
const codesByLength = [...dialCodes].sort((a, b) => b.code.length - a.code.length)

/** How many digits the number itself carries, once the dialling code is split off */
const MOBILE_DIGITS = 10

function splitMobile(value: string) {
  const trimmed = (value ?? "").trim()
  const match = codesByLength.find((d) => trimmed.startsWith(d.code))
  const local = match ? trimmed.slice(match.code.length) : trimmed
  // Seeded numbers are grouped ("99887 66554"); the field holds bare digits
  return { mobileCode: match?.code ?? "+91", mobile: local.replace(/\D/g, "").slice(0, MOBILE_DIGITS) }
}

const joinMobile = (code: string | undefined, local: string) => [code?.trim(), local.trim()].filter(Boolean).join(" ")

/** Longest edge of a stored avatar. Big enough for a retina 96px frame. */
const AVATAR_PX = 256
const MAX_UPLOAD = 5 * 1024 * 1024

/**
 * Re-encode the chosen picture to a small square-ish JPEG data URL.
 *
 * The session is persisted to web storage, which holds a few megabytes in
 * total, so an untouched camera image would either blow the quota or evict the
 * session. Downscaling first keeps a photo well under 100 KB.
 */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, AVATAR_PX / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas is unavailable")
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return canvas.toDataURL("image/jpeg", 0.85)
}

/** The photo, with its own edit affordance sat on the corner of the frame. */
function AvatarEditor({
  src,
  initials,
  onPick,
  onRemove,
  busy,
}: {
  src?: string
  initials: string
  onPick: (file: File) => void
  onRemove: () => void
  busy: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar className="size-24 ring-2 ring-background shadow-sm outline outline-foreground/10">
          {src ? <AvatarImage src={src} alt="" /> : null}
          <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>

        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </span>
        ) : null}

        {/* Sits on the frame rather than beside it, so the control is unmistakably the photo's */}
        <Button
          type="button"
          size="icon"
          disabled={busy}
          aria-label={src ? "Change profile photo" : "Upload profile photo"}
          title={src ? "Change photo" : "Upload photo"}
          onClick={() => inputRef.current?.click()}
          className="absolute -right-0.5 -bottom-0.5 size-8 rounded-full border-2 border-background shadow-sm"
        >
          <Camera className="size-4" />
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            // Reset first, so picking the same file twice still fires a change
            e.target.value = ""
            if (file) onPick(file)
          }}
        />
      </div>

      {src ? (
        <Button type="button" variant="ghost" size="sm" className={cn(control, "text-muted-foreground")} onClick={onRemove}>
          <Trash2 className="size-3.5" /> Remove photo
        </Button>
      ) : (
        <p className="max-w-36 text-center text-[0.65rem] text-muted-foreground">JPG, PNG or WebP, up to 5 MB</p>
      )}
    </div>
  )
}

/** My Profile: the signed-in user's photo and contact details, editable in place. */
export function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "", ...splitMobile(user?.mobile ?? "") },
  })
  const { control: formControl, reset } = form

  // Signing in as someone else while this page is mounted must not keep the old values
  useEffect(() => {
    reset({ name: user?.name ?? "", email: user?.email ?? "", ...splitMobile(user?.mobile ?? "") })
  }, [user?.id, user?.name, user?.mobile, user?.email, reset])

  if (!user) return null

  const pickPhoto = async (file: File) => {
    if (file.size > MAX_UPLOAD) {
      toast.error("That image is over 5 MB", { description: "Choose a smaller photo." })
      return
    }
    setUploading(true)
    try {
      updateUser({ avatar: await toAvatarDataUrl(file) })
      toast.success("Profile photo updated")
    } catch {
      toast.error("That image could not be read", { description: "Try a different JPG, PNG or WebP file." })
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = () => {
    updateUser({ avatar: undefined })
    toast.success("Profile photo removed")
  }

  const save = form.handleSubmit((values) => {
    const name = values.name.trim()
    updateUser({
      name,
      email: values.email.trim(),
      mobile: joinMobile(values.mobileCode, values.mobile),
      // The monogram is the fallback for the photo, so it has to follow the name
      initials: name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    })
    setEditing(false)
    toast.success("Profile updated")
  })

  const cancel = () => {
    reset({ name: user.name, email: user.email, ...splitMobile(user.mobile) })
    setEditing(false)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="My Profile" breadcrumbs={[{ label: "My Profile" }]} />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        {/* ---------- Photo and identity ---------- */}
        <SectionCard title="Profile Photo" icon={<UserRound className="size-4 text-primary" />} hoverable={false}>
          <div className="flex flex-col items-center gap-3 py-1">
            <AvatarEditor
              src={user.avatar}
              initials={user.initials}
              onPick={pickPhoto}
              onRemove={removePhoto}
              busy={uploading}
            />
            <div className="text-center">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
          </div>
        </SectionCard>

        {/* ---------- Contact details ---------- */}
        <SectionCard
          title="Personal Information"
          icon={<ShieldCheck className="size-4 text-primary" />}
          hoverable={false}
          actions={
            editing ? (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={cancel}>
                  <X className="size-3.5" /> Cancel
                </Button>
                <Button size="sm" className={control} onClick={save}>
                  <Check className="size-3.5" /> Save Changes
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            )
          }
        >
          {editing ? (
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
              <TextField control={formControl} name="name" label="Name" required startIcon={<UserRound />} />
              <PhoneField control={formControl} codeName="mobileCode" name="mobile" label="Phone Number" required digits={MOBILE_DIGITS} />

              <TextField
                control={formControl}
                name="email"
                label="Email Address"
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                startIcon={<Mail />}
                description="This is also your sign-in ID — changing it changes how you log in."
                className="sm:col-span-2"
              />
            </form>
          ) : (
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Name">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <UserRound className="size-3.5 text-muted-foreground" />
                  {user.name}
                </span>
              </Detail>
              <Detail label="Phone Number">
                <span className="flex items-center gap-1.5 text-sm tabular-nums">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {user.mobile}
                </span>
              </Detail>
              <Detail label="Email Address" className="sm:col-span-2">
                <span className="flex flex-wrap items-center gap-1.5 text-sm">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-all">{user.email}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                    Sign-in ID
                  </span>
                </span>
              </Detail>
              <Detail label="Role" className="sm:col-span-2">
                <span className="text-sm">{user.role}</span>
              </Detail>
            </dl>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
