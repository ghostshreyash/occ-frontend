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
| `/login` | Login |
| `/` | OCC Global Dashboard |
| `/customer-map` | India / Global Customer Map |
| `/enterprise-onboarding` | Enterprise Onboarding (5 steps) |
| `/elpremars` | ELPREMAR Activity & Availability |
| `/elpremars/onboard` | ELPREMAR Onboarding (4 steps) |
| `/critical-alerts` | Critical Alerts |
| `/theme-preview` | Colour token reference |

Other sidebar entries show a placeholder until their designs are approved.

## Project structure

```
src/
  config/navigation.ts     sidebar items
  layouts/                 app shell (sidebar + top bar + footer)
  pages/                   one file or folder per screen
  components/
    ui/                    shadcn/ui components
    layout/                sidebar, top bar, logo
    common/                page header, stat cards, charts, maps, wizard
    form/                  React Hook Form field wrappers
  lib/
    status.ts              health / alert / work status → colours and labels
    validation.ts          shared Zod rules (password policy, phone…)
    maplibre.ts            MapLibre setup (worker registration)
  data/mock.ts             mock data
public/
  brand/                   OLIVINE logo, emblem, sidebar artwork
  geo/                     world countries GeoJSON for the maps
```

## Theming

All colours are CSS variables in `src/index.css`, exposed as Tailwind classes. Use tokens, never hex values:

- Brand: `brand-navy`, `brand-gold`
- Asset health: `healthy`, `attention`, `critical`, `offline`, each with `-foreground`, `-soft` and `-soft-foreground` variants
- Status: `success`, `warning`, `info`, `neutral`, `highlight`
- Layout: `sidebar-*`, `topbar`, `chart-1` … `chart-8`

Use `src/lib/status.ts` for anything status-related so badges, charts and map markers stay consistent.

## Notes before production

- **Brand images** in `public/brand/` were extracted from the mockups; replace them with the original artwork.
- **Location picker map** uses OpenStreetMap tiles, which are for development only. Switch to a licensed provider (e.g. MapTiler).
- **Login** does not call an API yet; OTP/MFA is still to be added.
