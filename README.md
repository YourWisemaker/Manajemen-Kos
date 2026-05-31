# KosKita

SaaS multi-tenant untuk manajemen kos di Indonesia. Repo ini berisi **frontend (Phase 1)** yang dibangun di atas data mock, sehingga tampilan dan alur bisa direview sebelum backend dikerjakan.

## Tech Stack

- **Next.js (App Router)** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** yang di-skin ulang (identitas "Rumah modern Indonesia")
- **React Hook Form + Zod** untuk validasi form
- **Vitest + React Testing Library + fast-check** untuk unit & property-based testing
- **Playwright** untuk E2E smoke test
- **Biome** untuk lint & format

## Identitas Visual

Sengaja menghindari tampilan "SaaS generik": tanpa ungu/indigo, tanpa Inter di mana-mana, tanpa glassmorphism. Palet hangat botani (pandan hijau + kunyit + terracotta), tipografi Bricolage Grotesque / Plus Jakarta Sans / JetBrains Mono, dan motif anyaman halus.

## Menjalankan

```bash
npm install
npm run dev        # server pengembangan di http://localhost:3000
```

## Skrip

```bash
npm run build      # build produksi
npm test           # unit & property test (Vitest)
npm run test:e2e   # E2E (Playwright)
npm run lint       # Biome check
npm run format     # Biome format
```

## Struktur

```
src/
  app/            # route groups: (marketing) (auth) (onboarding) (dashboard) (public-pay) (super-admin)
  components/     # ui/ (shadcn re-skin), brand/, shells/
  lib/            # locale/ (Rupiah, Asia-Jakarta, copy id), mock/ (DataSource), schemas/ (Zod)
  styles/         # globals.css (design token OKLCH)
```

Semua data pada Phase 1 berasal dari mock `DataSource` (`src/lib/mock`) di balik satu antarmuka bertipe, agar penggantian ke API nyata nanti terisolasi.
