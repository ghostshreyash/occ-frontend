# occ-frontend

**OLIVINE Command Centre (OCC)**: the Tier III web console used by OLIVINE to onboard enterprises and ELPREMARs, monitor asset health across all customers, and manage alerts.

Built with React 19, Vite, TypeScript, Tailwind CSS v4 and shadcn/ui. Screens follow the approved mockups in `EVITA_WORKFLOW.pdf` (OCC pages 1–13).

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build to dist/
npm run lint
```

### Deploying to Vercel

Import the repository in Vercel; `vercel.json` sets the Vite build (`npm run build` → `dist/`) and rewrites every route to `index.html` so deep links such as `/customer-map` work on refresh. Static files (`/brand`, `/geo`, `/assets`) are served before the rewrite applies.

The app currently runs on mock data (`src/data/mock.ts`); API calls will replace it. Places to connect the backend are marked `TODO`.

## Screens

| Route | Screen |
|---|---|
| `/welcome` | Platform overview — the three systems, each linking to its sign-in |
| `/login` | Sign in (step 1 of 2) — brand chosen by hostname |
| `/login/verify` | Two-step verification — one-time code |
| `/forgot-password` → `/forgot-password/verify` → `/reset-password` | Password reset |
| `/register` | Request access → verify mobile → pending approval |
| `/account-recovery` | Recovery when the mobile and e-mail are unreachable |
| `/` | OCC Global Dashboard |
| `/customer-map` | India / Global Customer Map |
| `/enterprise-onboarding` | Enterprise Onboarding (5 steps) |
| `/elpremars` | ELPREMAR Activity & Availability |
| `/elpremars/onboard` | ELPREMAR Onboarding (4 steps) |
| `/critical-alerts` | Critical Alerts |
| `/theme-preview` | Colour token reference |

Other sidebar entries show a placeholder until their designs are approved.

## Authentication

Everything under the app shell is behind `RequireAuth`; signed-out visitors go to
`/login`, with the page they asked for in `next` so verification can hand them
back to it.

### One sign-in, three hostnames

The hostname decides which sign-in a visitor sees:

| Host | Brand | For |
|---|---|---|
| `olivine.*` (and anything unrecognised, including localhost) | Olivine Command Centre | OLIVINE operations |
| `emmse.*` | EMMS-E | Enterprise administrators |
| `evita.*` | EVITA | ELPREMARs in the field |

`src/lib/brand.ts` resolves it and `src/config/brands.ts` holds everything that
differs — wordmark, story panel, feature list, field labels, access notice. One
screen (`src/pages/auth/login.tsx`) renders all three, and the one-time-code step
renders in the same card so the two steps read as one flow. Adding a role is a
config entry, not a new page.

`/welcome` is an overview of the three systems for anyone unsure which they
need — reached from the logo or from the link under the sign-in card, never a
gate in front of it. Each card links to that system's own deployment once
`origin` is set in `src/config/brands.ts`; until then it links to this one with a
`?brand=` preview.

For demos only, `?brand=emmse` or `?brand=evita` on any auth route previews
another brand; production is decided by the host alone.

### Two-step verification

The password is checked first, then a one-time code goes to the registered
mobile. If the SMS does not arrive the user can resend it, **fall back to
e-mail**, or switch to a voice call — and, if neither contact is reachable, raise
a recovery request with the helpdesk.

**The OTP is not implemented in this repository.** Codes are issued, delivered
and verified by AWS (Cognito user pools, SNS for SMS/voice, SES for e-mail).
`src/lib/auth/auth-service.ts` holds one placeholder per call, each marked
`TODO(aws)` with the API it maps to. Attempt limits, lockouts and expiry are
Cognito policies, not client-side rules — the screens render whatever the backend
returns. Until AWS is wired in the placeholders accept any credentials and any
6-digit code, so the whole flow can be walked end to end.

```
src/config/brands.ts        per-hostname brand data
src/lib/brand.ts            hostname → brand, useBrand()
src/lib/auth/
  auth-service.ts           integration points (TODO(aws) on each)
  auth-context.tsx          <AuthProvider> — session, challenge, reset context
  context.ts                useAuth()
src/components/auth/
  auth-screen.tsx           the shared light shell, card, notices, submit
  brand-story.tsx           the panel beside the form
  otp-form.tsx              the one-time-code step
  require-auth.tsx          route guards
```

Sessions live in `sessionStorage`, or `localStorage` when "Remember me" is
ticked. Pending challenges are kept in memory only, so a refresh mid-flow
restarts the step rather than leaving a dead code on screen.

### Motion

The sign-in screens use slow ambient gradients, a staggered entrance and a few
accents (health ring, resend states, OTP slots). All of it is defined in
`src/index.css` and disabled under `prefers-reduced-motion`.

## Project structure

```
src/
  config/navigation.ts     sidebar items
  config/brands.ts         per-hostname sign-in brands
  layouts/                 app shell (sidebar + top bar + footer)
  pages/                   one file or folder per screen
  components/
    ui/                    shadcn/ui components
    layout/                sidebar, top bar, logo
    common/                page header, stat cards, charts, maps, wizard
    form/                  React Hook Form field wrappers
  lib/
    brand.ts               hostname → brand
    status.ts              health / alert / work status → colours and labels
    validation.ts          shared Zod rules (password policy, phone…)
    maplibre.ts            MapLibre setup (worker registration)
  data/mock.ts             mock data
public/
  brand/                   OLIVINE logo, emblem, sign-in photography
  geo/                     world countries GeoJSON, plus India outline and state boundaries
```

## Theming

All colours are CSS variables in `src/index.css`, exposed as Tailwind classes. Use tokens, never hex values:

- Brand: `brand-navy`, `brand-gold`
- Asset health: `healthy`, `attention`, `critical`, `offline`, each with `-foreground`, `-soft` and `-soft-foreground` variants
- Status: `success`, `warning`, `info`, `neutral`, `highlight`
- Layout: `sidebar-*`, `topbar`, `chart-1` … `chart-8`

Use `src/lib/status.ts` for anything status-related so badges, charts and map markers stay consistent.

## Notes before production

- **Brand images**: EMMS-E's scene in `public/brand/` was composed from the mockups and is soft at large sizes. EVITA loads a full-resolution photograph from the Pexels CDN (`photoUrl` in `src/config/brands.ts`), with the local plate as an `onError` fallback. Replace both with OLIVINE's own licensed photography on its own CDN before launch — a third-party hotlink is a availability and licensing risk in production.
- **Hostnames** for each brand are assumed (`olivine.*`, `emmse.*`, `evita.*`); confirm them and update `hosts` in `src/config/brands.ts`.
- **Location picker map** uses OpenStreetMap tiles, which are for development only. Switch to a licensed provider (e.g. MapTiler).
- **Authentication** runs on the placeholders in `src/lib/auth/auth-service.ts`. Connect them to AWS Cognito (and SNS/SES for delivery) before any real use — until then every credential and every 6-digit code is accepted.
- **Access and recovery requests** are not delivered anywhere yet; point them at the OCC API and the support desk.
