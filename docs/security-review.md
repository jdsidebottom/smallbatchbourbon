# Security review — Validation MVP

PRD §18, item by item, with how each was checked. Dated 2026-08-23, against
commit `cb10602` and the live Supabase project.

Findings are marked **Met**, **Met with caveat**, or **Open**. Two items are
open and both are configuration rather than code.

---

## §18 checklist

### Deny-by-default Row Level Security — **Met**

Every table is created with `alter table … enable row level security` and no
policy, in `0001` and `0002`. Policies are added deliberately in `0003`. A table
added and forgotten is therefore unreadable rather than public.

`admin_users`, `sources`, `affiliate_clicks` and `audit_log` receive no policy
at all and are explicitly revoked. Supabase's linter reports these four as
"RLS enabled, no policy" at INFO level — that is the intended state, not a
finding.

### Public access limited to published records and safe fields — **Met**

Verified by executing queries as the `anon` role against the live database:

- Draft bottles and draft articles do not come back.
- `bottle_retailers.destination_url` is never granted, so an affiliate
  destination cannot be read and scraped.
- Editorial-internal columns (`updated_by`) are refused.
- A guide pick whose bottle is unpublished is dropped by RLS, which is why the
  publish gate refuses to ship such a guide.

**One real leak was found and fixed during this milestone.** `0003` granted
`select on guide_items` table-wide. A table-level grant covers every column the
table will ever have, and a later column-level `revoke` cannot claw it back — so
the `updated_by` column added in `0008` was readable by anonymous visitors,
despite an explicit revoke that applied without error. `0008` now revokes the
table-wide grant and re-grants named columns.

`tasting_profiles` and `bottle_relationships` still carry table-wide grants.
Every column in both is genuinely public today, so there is no current exposure,
but adding an editorial-internal column to either would repeat the bug. Noted in
`docs/operations.md`.

### Admin authorization enforced server-side — **Met**

All 22 exported server actions call `requireAdmin()` before touching the
database — enumerated mechanically, not by eye:

```
total actions: 22
without requireAdmin: none
```

Authorization does not depend on hidden UI. Admin routes are additionally
guarded by `proxy.ts` and each page calls `requireAdmin()` itself.

### Service-role and provider secrets never shipped to the browser — **Met**

`src/lib/supabase/admin.ts` imports `server-only`, making it a build error to
pull into a client component. Verified against the built output:

| Check | Result |
| --- | --- |
| Service-role key in `.next/static` (client bundles) | 0 occurrences |
| Service-role key anywhere in `.next` | 0 occurrences |
| Publishable key in client bundles | present, as intended |
| Client components importing `supabase/admin` | none |

The service-role key is read from the environment at runtime and never inlined
at build time. CI additionally fails on a tracked `.env` file or a
committed-key pattern.

### Separate local, preview and production configuration — **Met with caveat**

Documented in `docs/operations.md`, including the requirement that preview and
production use **separate Supabase projects**. The caveat: only one project
exists today, and it currently holds demo content. Before launch, stand up a
separate production project — or clear the demo seed from this one and point
preview at a new project.

### Input validation on every write endpoint — **Met**

Every server action parses its input with a Zod schema before writing, and
returns field-level errors rather than throwing. `/api/newsletter` validates
and `/api/search` bounds the query (minimum 2 characters, truncated at 120).
Money is parsed from strings to integer cents rather than floats.

### Rate limiting and bot protection on public write endpoints — **Met with caveat**

`/api/newsletter` — the only public write endpoint — carries a per-IP rate limit
and a honeypot field. The caveat is stated in the code: the limiter is
in-process, so it is per-instance and resets on deploy. Move it to a shared
store before running more than one instance.

### Strict allowlist for affiliate redirects — **Met**

`/go/{merchant}/{bottle}` resolves the destination from the database by slug.
There is no `?url=` parameter, so there is no open redirect; a crafted request
can at worst 404. Both merchant and bottle must be active and published.
Destinations are constrained to `https://` by a CHECK constraint. Click logging
records no IP, no user agent, and only a same-origin pathname.

### Safe rich content rendering — **Met**

Editorial body copy is parsed to a typed tree and rendered as React elements
(`src/lib/domain/richtext.ts`). There is no `dangerouslySetInnerHTML` on
editorial content anywhere, so stored XSS has no path even if an editor pastes
markup. `javascript:` and protocol-relative hrefs render as plain text rather
than becoming live links; tests assert this.

The one `dangerouslySetInnerHTML` on user-adjacent data is the JSON-LD block,
where `<` is escaped so a stray `</script>` in a title cannot close the element.

### Upload restrictions and safe filenames — **Met**

Enforced twice. The bucket (`0004`) declares `allowed_mime_types` and a 5 MB
`file_size_limit`; the upload action re-checks both server-side before calling
storage. The stored filename is generated from the bottle slug plus a random
UUID — never taken from the browser — so a crafted name cannot escape its
prefix or collide. Tests cover `../../etc/passwd` and similar.

Writes use the service role after authorization; no insert, update or delete
policy is granted to `anon` or `authenticated` on `storage.objects`.

### Secure headers including a CSP — **Met with caveat**

CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`
and `Permissions-Policy` are set in `next.config.ts`. HSTS and
`upgrade-insecure-requests` are production-only; `'unsafe-eval'` is dev-only.

The caveat is `'unsafe-inline'` on `script-src`, required by the pre-paint age
gate bootstrap and the analytics snippets. Move to a nonce- or hash-based policy
when the app takes on dynamic rendering.

### Admin MFA — **Open**

Supabase Auth supports TOTP MFA. It is **not enabled**. With one admin account
holding a role that can publish and delete editorial content, this is the single
highest-value remaining hardening step. Enable it in the Supabase dashboard
before launch.

Leaked-password protection (HaveIBeenPwned checks) is also currently disabled
and is a one-click change in the same area.

### Dependency and security scanning in CI — **Met**

`.github/workflows/ci.yml` runs `npm audit --omit=dev --audit-level=high` as a
blocking step, a non-blocking full audit, and a committed-secret check. Current
status: **0 vulnerabilities** in production dependencies.

### Backups and restore documented — **Met**

`docs/operations.md` §4 and §5, including the point that Storage objects are not
included in a database dump and must be backed up separately. Restore has not
yet been rehearsed — do that before launch.

### Audit logs for publishing and value-threshold changes — **Met**

`audit_log` records inserts, updates, deletes and publish/unpublish transitions
for bottles, prices, articles, retailers and guide items, with the changed field
names and the actor.

Attribution has been wrong twice and both were fixed: service-role writes carry
no `auth.uid()`, so the trigger reads `updated_by`, which the write path must
stamp. `0007` fixed it for bottles and prices; `0009` fixed it for guide
reordering, which was recording rank changes anonymously. **Any new write path
must stamp `updated_by`** or it will silently record an unattributed change.

---

## Summary

| Item | Status |
| --- | --- |
| Deny-by-default RLS | Met |
| Public access limited to published/safe fields | Met (one leak found and fixed) |
| Server-side admin authorization | Met (22/22 actions) |
| Secrets never in the browser | Met (verified against built output) |
| Separate environment configuration | Met with caveat — only one project exists |
| Input validation on writes | Met |
| Rate limiting on public writes | Met with caveat — in-process only |
| Affiliate redirect allowlist | Met |
| Safe rich content rendering | Met |
| Upload restrictions and safe filenames | Met |
| Secure headers and CSP | Met with caveat — `'unsafe-inline'` |
| Admin MFA | **Open** |
| Dependency scanning in CI | Met |
| Backup and restore documented | Met — not yet rehearsed |
| Audit logging | Met |

**Before launch:** enable admin MFA, stand up a separate production Supabase
project, clear the demo seed, and rehearse a restore once.
