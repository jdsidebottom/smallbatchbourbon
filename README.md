# Small Batch Bourbon — smallbatchbourbon.com

Mobile-first bourbon discovery, value intelligence and commerce platform, built
to `SmallBatchBourbon_Validation_MVP_PRD.pdf`.

**Drink Smarter. Ignore the Noise.**

| Milestone | Scope | Status |
| --- | --- | --- |
| M1 | Design system, 21+ gate, landing page, Weekly Pour, legal shell, analytics, SEO | Done |
| M2 | Supabase schema/RLS, admin auth, bottle CRUD, media, sources, What We'd Pay thresholds, completeness | Done |
| M3 | Public bottle pages, search, alternatives, affiliate redirect infrastructure | Done |
| M4 | `/what-wed-pay` search and Liquor Store Mode | Done |
| M5 | Buying-guide builder, guide pages, Gear/Learn article types, internal linking | Done |
| M6 | Performance, accessibility, security review, analytics QA, backup/restore docs | Done |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth,
Storage) · Vercel.

## Getting started

```bash
npm install
```

Then copy `.env.example` to `.env.local` and fill it in (see below), and:

```bash
npm run dev
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical URLs, Open Graph, sitemap |
| `NEXT_PUBLIC_SUPABASE_URL` | For admin | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | For admin | Browser-safe key; always subject to RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin | Server-only. Bypasses RLS |
| `BEEHIIV_API_KEY` | For live signup | Newsletter provider auth |
| `BEEHIIV_PUBLICATION_ID` | For live signup | Target publication |
| `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` | No | Cloudflare Web Analytics; no beacon is injected without it |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | No | Search Console meta tag; prefer a DNS TXT record instead |

The service-role key bypasses Row Level Security. It must never appear in a
`NEXT_PUBLIC_` variable and never reach the browser. `src/lib/supabase/admin.ts`
imports `server-only`, so pulling it into a client component is a build error
rather than a silent leak.

Without the Beehiiv credentials the signup endpoint returns an honest provider
error rather than pretending a subscription succeeded. Without Supabase, `/admin`
explains what is missing instead of throwing.

## Database

Migrations in `supabase/migrations` are version controlled and applied in order.

```bash
supabase db push
```

### Granting editorial access

The application has no sign-up path by design. Create the account in the Supabase
dashboard (Authentication → Users → Add user), then grant it a role:

```bash
psql "$DATABASE_URL" -v email="'you@example.com'" -f supabase/seed/promote_admin.sql
```

Roles are `admin`, `editor` and `contributor`, checked server-side on every
request by `requireAdmin()` in `src/lib/auth.ts`.

### Demo seed

`supabase/seed/demo_bottle.sql` creates a set of **fictional** bottles, a
retailer and a draft record, for exercising the bottle page, search,
alternatives and the affiliate redirect locally. It exists so that no real
product ever gets an invented price or verdict. Local and preview only — remove
it with `demo_bottle_teardown.sql`.

`supabase/seed/demo_guide.sql` adds a demonstration buying guide and Learn page
on top of those bottles. The guide deliberately mixes a fully-populated pick with
a sparse one, so the "no verified reference price means no verdict" path is
exercised rather than assumed. Remove it with `demo_guide_teardown.sql`.

### Security tests

```bash
psql "$DATABASE_URL" -f supabase/tests/rls_probe.sql
```

Seeds a published bottle, a draft, and an affiliate destination, then asserts
that the `anon` role cannot see drafts, cannot read `destination_url`, `sources`,
`audit_log` or `admin_users`, and cannot insert, update or delete editorial data.
The script rolls back, so it leaves nothing behind. Run it against a
non-production database.

## Architecture notes

- **Age gate** — `src/components/AgeGate.tsx` plus a pre-paint bootstrap script
  (`src/lib/age-gate.ts`) inlined in `<head>`. The gate markup ships in the HTML
  and is dismissed before first paint for returning visitors, so public pages
  stay statically generated with no flash of the gate. Acknowledgement lives in a
  first-party `sbb_age_ok` cookie for 365 days. Audience screening only —
  licensed retailers remain responsible for transactional age verification.
- **RLS** — deny by default. Anonymous access is limited to published rows by
  policy, and to safe columns by explicit `GRANT`, because RLS gates rows and not
  columns. `bottle_retailers.destination_url` is deliberately never granted: the
  public site links to an internal redirect route and the real destination is
  resolved server-side, so an affiliate URL can never be supplied or rewritten by
  a client.
- **Authorization** — `requireAdmin()` runs server-side on every admin page and
  action, reading the role from the database rather than a JWT claim, so revoking
  access takes effect immediately. Hiding a UI control is not authorization.
- **Completeness gating** — `src/lib/domain/completeness.ts` blocks publishing a
  bottle that cannot be published honestly (no price ladder, no verdict
  explanation, no cited source, an image without alt text). Facts a producer
  refuses to disclose are never counted as missing data.
- **Money** — integer cents throughout. `dollarsToCents` shifts the decimal on
  the string rather than multiplying, because `1.005 * 100` is 100.4999… in
  IEEE 754 and would round to the wrong cent.
- **Newsletter** — provider isolated behind `src/lib/newsletter.ts`.
  `/api/newsletter` validates input, rate-limits per IP, and carries a honeypot.
- **Affiliate redirects** — `/go/{merchant}/{bottle}` resolves the destination
  from the database by slug. There is no `?url=` parameter, so there is no open
  redirect; the worst a crafted request can do is 404. Both merchant and bottle
  must be active and published, so deactivating a merchant kills its links
  site-wide at once. Click logging records no IP, no user agent, and only a
  same-origin pathname.
- **Liquor Store Mode** — `/at-the-store`. The full price ladder ships with each
  search result, so the verdict is computed on the device the instant the
  shopper stops typing rather than costing a round trip in an aisle with one bar
  of signal. Alternatives are fetched lazily and shown only when the verdict is
  Fair or worse.
- **Editorial content** — one `articles` table across buying guides,
  alternatives, Learn and Gear; the type picks the route prefix (`/best`,
  `/alternatives`, `/learn`, `/gear`) and slugs are unique site-wide, so
  retyping an article moves its URL without risking a collision. A guide's
  `guide_items` store only rank, label and rationale: proof, reference price,
  the price ladder, the verdict, the flavour profile and Best for / Skip if all
  render from the canonical bottle record on every request, so correcting a
  bottle corrects every guide that features it. Publication is gated on the same
  kind of completeness report bottles use — a guide whose pick points at an
  unpublished bottle is refused rather than shipping with a hole where a card
  should be.
- **Article body copy** — a small markdown subset (`src/lib/domain/richtext.ts`)
  parsed to a typed tree and rendered as React elements. No markdown dependency,
  no `dangerouslySetInnerHTML`, and no path by which editorial copy can inject
  markup; `javascript:` and protocol-relative hrefs render as plain text.
- **Search** — a trigger-maintained tsvector (which includes the brand name, so
  "Weller" finds every Weller bottle) plus a trigram index on the name for
  prefix and near-miss autocomplete.
- **Analytics, and why there is no cookie banner** — measurement runs on Vercel
  Web Analytics (page views plus the eleven PRD §21.1 business events) with
  Cloudflare Web Analytics optionally alongside for an independent traffic
  count. Both are cookieless and store no personal data, so no prior consent is
  required and a first-time reader meets one interstitial — the 21+ gate — rather
  than two. GA4 and Clarity were dropped for exactly that reason: session
  recording and advertising cookies would have required a consent dialog.
  Google Search Console needs nothing in the app; it reports on our own search
  performance and sets nothing on a visitor's device.

  The provider sits behind a single `track()` in `src/lib/analytics.ts`. Swapping
  GA4 and Clarity out for Vercel touched that one file — no component knows who
  collects the data. Keep it that way, and **do not add a provider that sets
  cookies without also adding consent.**
- **Security headers** — `next.config.ts`. HSTS and `upgrade-insecure-requests`
  apply in production only; `'unsafe-eval'` is dev-only.
- **Media** — bottle photography is uploaded through the admin, validated for
  MIME type and size on the server as well as by the bucket, and stored under a
  generated filename. It renders through `next/image` in a fixed 3:4 box, so a
  slow image shifts nothing below it.
- **Hydration budget** — a card that only needs to fire an analytics event stays
  a server component; `TrackedLink` isolates the click so the markup around it
  never ships as JavaScript. Compressed transfer is ~188 KB on the home page and
  ~250 KB on a bottle or guide page, most of it the shared React runtime.
- **The age gate is a compliance control, not a banner.** While it is up the
  rest of the page is `inert`, so a keyboard visitor cannot Tab past it into
  alcohol content.

## Known follow-ups before public launch

1. **Legal copy needs review.** The policy pages are complete, accurate drafts
   written against what the site actually does — have counsel review them for the
   jurisdictions and affiliate programs you actually use.
2. **Replace the demo bottle.** The What We'd Pay preview on the landing page uses
   a deliberately fictional "Example Bourbon", labeled *Example only / Not live
   data*. Swap in a real published bottle record once M3 ships. Never publish an
   invented MSRP or verdict for a real product.
3. **Newsletter credentials.** Create the Beehiiv publication, add the keys, and
   confirm a live subscription lands with the right source tag.
4. **Logo and hero imagery.** The wordmark in `src/components/Wordmark.tsx` is a
   typographic placeholder. Hero treatment is CSS-only — no stock photography has
   been invented or licensed.
5. **CSP hardening.** Move to nonce- or hash-based `script-src` when the app takes
   on dynamic rendering.
6. **Rate limiting** is in-process. Move to a shared store before running on more
   than one instance.
7. **Backup and restore** procedure needs documenting before material production
   editorial data accumulates (M6).
8. **Supabase advisor warnings.** `pg_trgm` is installed in the `public` schema,
   and leaked-password protection is disabled on Auth. Neither is exploitable as
   configured; both are M6 hardening items.
9. **Guide pick titles are ~26px tall** on a single line. The card heading link
   clears WCAG 2.5.8 (24×24) but not the AAA 44×44 target; each card carries a
   full-height "Full review" link to the same destination, and the remaining
   sub-44px targets are all inline links inside sentences, which 2.5.8 exempts.
10. **Enable admin MFA.** Supabase Auth supports TOTP and it is currently off.
    With one account able to publish and delete editorial content this is the
    highest-value remaining hardening step. Leaked-password protection is off
    too, and is the same one-click area.
11. **Stand up a separate production Supabase project.** Preview and production
    must not share one (PRD §23). Only one project exists today, and it holds
    demo content.
12. **Rehearse a restore** into the preview project once. A backup that has
    never been restored is a hypothesis. See `docs/operations.md` §5.
13. **Cross-browser pass on real devices.** Everything here was verified in a
    Chromium engine. PRD §22 asks for current iOS Safari and Android Chrome,
    which needs real hardware.

## Operations and security

- [`docs/operations.md`](docs/operations.md) — environments, deployment,
  migrations, backup, restore and rollback, plus the schema traps that have
  already caused real bugs here.
- [`docs/security-review.md`](docs/security-review.md) — PRD §18 item by item,
  with how each was checked and what remains open.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests, a build with no
Supabase credentials, a blocking production dependency audit, and a
committed-secret check.

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
npm run test    # vitest
```
