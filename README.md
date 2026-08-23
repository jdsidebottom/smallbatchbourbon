# Small Batch Bourbon — smallbatchbourbon.com

Milestone 1 of the Validation MVP: the production landing page, design system,
21+ compliance shell, Weekly Pour capture, analytics conventions and SEO
foundation described in `SmallBatchBourbon_Validation_MVP_PRD.pdf`.

**Drink Smarter. Ignore the Noise.**

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · deployed on Vercel.
Supabase, the admin CMS and the bottle data model arrive in Milestone 2.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The site runs at http://localhost:3000 (this repo's checked-in preview config
uses port 3100 to stay clear of other local projects).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical URLs, Open Graph, sitemap |
| `BEEHIIV_API_KEY` | For live signup | Newsletter provider auth |
| `BEEHIIV_PUBLICATION_ID` | For live signup | Target publication |
| `NEXT_PUBLIC_GA_ID` | No | GA4; script only loads when set |
| `NEXT_PUBLIC_CLARITY_ID` | No | Microsoft Clarity; only loads when set |

Without the Beehiiv credentials the signup endpoint returns an honest provider
error rather than pretending a subscription succeeded. Nothing silently drops a
subscriber.

## Architecture notes

- **Age gate** — `src/components/AgeGate.tsx` plus a pre-paint bootstrap script
  (`src/lib/age-gate.ts`) inlined in `<head>`. The gate markup ships in the HTML
  and is dismissed before first paint for returning visitors, so every page stays
  statically generated and there is no flash of the gate. Acknowledgement lives in
  a first-party `sbb_age_ok` cookie for 365 days. The gate is audience screening
  only — licensed retailers remain responsible for transactional age verification.
- **Newsletter** — the provider is isolated behind `src/lib/newsletter.ts`. Swap
  Beehiiv without touching routes or components. `/api/newsletter` validates
  input, rate-limits per IP, and carries a honeypot field.
- **Analytics** — `track()` in `src/lib/analytics.ts` emits the PRD §21.1 business
  event names to the GA4 dataLayer. Events are named in one place so Milestones
  2–6 extend rather than reinvent them.
- **Design tokens** — `src/app/globals.css`. The palette, type scale and verdict
  ladder colors are the foundation for the whole application, not just this page.
- **Security headers** — `next.config.ts`. HSTS and `upgrade-insecure-requests`
  apply in production only; `'unsafe-eval'` is dev-only.

## Known follow-ups before public launch

1. **Legal copy needs review.** The policy pages are complete, accurate drafts
   written against what the site actually does — have counsel review them for the
   jurisdictions and affiliate programs you actually use before promoting.
2. **Replace the demo bottle.** The What We'd Pay preview on the landing page uses
   a deliberately fictional "Example Bourbon", labeled *Example only / Not live
   data*. Swap in a real published bottle record after Milestone 3. Never publish
   an invented MSRP or verdict for a real product.
3. **Newsletter credentials.** Create the Beehiiv publication, add the keys, and
   confirm a live subscription lands with the right source tag.
4. **Logo and hero imagery.** The wordmark in `src/components/Wordmark.tsx` is a
   typographic placeholder. Hero treatment is currently CSS-only — no stock
   photography has been invented or licensed.
5. **CSP hardening.** Move to nonce- or hash-based `script-src` when the app takes
   on dynamic rendering.
6. **Rate limiting** is in-process. Move to a shared store before running on more
   than one instance.

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```
