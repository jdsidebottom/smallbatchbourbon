# Operations

Deployment, migrations, backup, restore and rollback for SmallBatchBourbon.com.

PRD §18 requires backups and a restore procedure documented *before* material
production data accumulates, and §27 requires documented deployment, migration,
backup and rollback procedures. This is that document.

---

## 1. Environments

The promotion path is fixed by PRD §23 and must not be short-circuited:

```
LOCAL / DEVELOPMENT  →  PREVIEW / BETA  →  PRODUCTION
```

| Environment | Supabase project | Deploys from | Who can reach it |
| --- | --- | --- | --- |
| Local | your own project, or the preview project | `npm run dev` | you |
| Preview | preview project (separate from production) | any pull request | anyone with the link |
| Production | production project | the protected `main` workflow only | the public |

**Each environment gets its own Supabase project and its own keys.** Sharing a
project between preview and production means a preview deploy can publish, edit
or delete real editorial content, and a seeded demo bottle can end up in
production search results.

### Environment variables

Copy `.env.example` and fill it in. The three that must be right everywhere:

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Also drives the CSP `connect-src`/`img-src` and the `next/image` allowlist. A wrong value here breaks admin login with an opaque "Failed to fetch". |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Safe in the browser. Always subject to RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Bypasses RLS entirely.** Server-only. Never in a `NEXT_PUBLIC_*` name, never pasted into chat, a ticket or a screenshot. |

`NEXT_PUBLIC_SITE_URL` must be the real public origin in production, or canonical
URLs, Open Graph tags and the sitemap will all point at the wrong host.

---

## 2. Deployment

1. Open a pull request. CI runs typecheck, lint, tests, a build with **no**
   Supabase credentials, a dependency audit and a committed-secret check.
2. Review the preview deployment against the milestone's exit criteria.
3. Merge to `main`. Production deploys from the protected workflow only.

The build deliberately does not need database credentials. If it ever starts
requiring them, something has begun reading the database at build time instead
of at request time — fix that rather than adding the secret to CI.

---

## 3. Migrations

Migrations live in `supabase/migrations/` and are numbered in order. They are
applied in that order and are **never edited once applied** to any shared
environment — write a new migration instead.

### Applying

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Apply to preview first, exercise the affected screens, then production.

### Rules that have already caught real bugs here

- **A table gets RLS enabled and no policy by default.** Policies are added
  explicitly in `0003_rls_policies.sql`. A new table with no entry there is
  unreadable by the public — which is the correct failure direction.
- **Grant columns, not tables.** `grant select on <table>` covers every column
  the table will *ever* have, and a later column-level `revoke` **cannot** claw
  it back. This shipped a real leak: `guide_items.updated_by` was readable by
  anonymous visitors until `0008` replaced the table-wide grant with named
  columns. `tasting_profiles` and `bottle_relationships` still carry table-wide
  grants — adding an editorial-internal column to either repeats the bug.
- **Service-role writes have no `auth.uid()`.** Audit triggers read the actor
  from `updated_by`, so any new write path must stamp it or the change is
  recorded anonymously. This has been missed twice (migrations `0007`, `0009`).

### Verifying after a migration

```bash
psql "$DATABASE_URL" -f supabase/tests/rls_probe.sql
```

Run it against preview, never production — it seeds and rolls back.

---

## 4. Backup

Supabase takes automated daily backups on paid plans; confirm the retention
window on the project's Database → Backups page and **do not rely on it alone**
for editorial content you cannot recreate.

### Manual logical backup

```bash
supabase db dump --project-ref <project-ref> -f backup-$(date +%F).sql
```

Storage objects (bottle photography) are **not** in a database dump. Back the
bucket up separately:

```bash
supabase storage download --project-ref <project-ref> --recursive ss:///bottle-media ./media-backup
```

### What to back up, and how often

| Data | Where | Cadence |
| --- | --- | --- |
| Editorial tables (bottles, prices, reviews, articles, guide_items, sources) | Postgres | before every migration, and weekly |
| `audit_log` | Postgres | with the above — it is the record of who changed what |
| Bottle images | Storage `bottle-media` | whenever images are added |
| Auth users / `admin_users` | Postgres | with the above |

Take a fresh dump **immediately before every production migration**. That dump
is what makes section 5 possible.

---

## 5. Restore and rollback

### Rolling back a bad deploy (no schema change)

Redeploy the previous commit. The database is untouched, so nothing else is
needed.

### Rolling back a bad migration

There is no `down` migration. The procedure is:

1. **Stop writes.** Take the admin offline or tell editors to stop, so no new
   content is written that a restore would discard.
2. Assess: can a *forward* migration fix it? A new migration that corrects the
   mistake is almost always safer than a restore, because a restore discards
   every edit made since the dump.
3. If a restore is genuinely required:

```bash
# against the target project
psql "$DATABASE_URL" -f backup-<date>.sql
```

4. Redeploy the application commit that matches that schema.
5. Re-apply any editorial changes made after the dump — the `audit_log` in the
   restored dump tells you what was changed and by whom up to that point, and
   the production audit log (if still readable) tells you what happened after.

### Restoring a deleted image

Storage deletes are immediate and permanent. Re-upload from `media-backup`
through the admin's bottle image form, which regenerates a safe filename; then
confirm the bottle page renders it.

### Practise it

Restore a production dump into the preview project at least once before launch,
and after any significant schema change. A backup that has never been restored
is a hypothesis, not a backup.

---

## 6. Incident: a leaked service-role key

Treat any exposure — a screenshot, a commit, a pasted message, a shared
terminal recording — as a full database compromise, because that key bypasses
RLS on every table.

1. Rotate it: Supabase → Project Settings → API → roll the `service_role` key.
2. Update the secret in the deployment platform and redeploy.
3. Review `audit_log` for writes you cannot account for.
4. Review Storage for objects you did not upload.
5. If the key was in a git commit, rotating is sufficient — but the commit still
   contains it, so also purge the history or treat the repository as burned.

CI checks for the shape of a committed key on every push. That check is a
backstop, not a substitute for never putting one in a file that git can see.
