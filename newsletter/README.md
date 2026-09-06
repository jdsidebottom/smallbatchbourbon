# Proof & Perspective — newsletter kit

Weekly email for Small Batch Bourbon. What is here:

- `build-issue.mjs` — assembles a whole issue. Start here; it drives the
  other two.
- `template.html` — the reusable issue shell, with `{{PLACEHOLDER}}` slots and
  `<!-- BUILD:* -->` markers marking the three generated regions.
- `issue.config.json` — the seven values identical in every issue.
- `issues/*.issue.json` — one per issue: the hand-written copy.
- `welcome-email.html` — the double opt-in welcome, sent once on subscribe.
- `issue-001-sample.html` — the template filled in, to show voice, length and rhythm.
- `build-wwp.mjs` — generates the What We'd Pay block from the database, with
  per-field manual override. See below.
- `issues/*.wwp.json` — one sidecar per issue, driving that generator.
- `news/` — the news aggregator that fills the Proof section: pulls the feeds,
  gives you a screen to mark keepers, and generates the bullets. See
  `news/README.md`.

> **The sample contains no real bourbon facts.** Every distillery, bottle, price,
> store and reader name in it is fictional placeholder copy, consistent with the
> PRD rule against inventing bourbon facts, MSRP, verdicts, tasting notes or
> availability. Do not send it. Do not lift its numbers.

## Building an issue

```
node newsletter/build-issue.mjs 002 > newsletter/issues/002.html
```

That runs `news/proof.mjs` and `build-wwp.mjs`, drops both blocks into
`template.html`, repeats the Shelf Report rows, and fills everything in
`issue.config.json` and `issues/002.issue.json`. Report to stderr, HTML to
stdout, same as the other two.

**It exits non-zero until the issue is actually finished.** The report separates
three things:

| | |
|---|---|
| **Compliance** | postal address or Beehiiv footer, absolute `LOGO_URL`, 21+ line, affiliate disclosure |
| **Not ready** | unwritten `{{WHY_IT_MATTERS_n}}`, any unfilled placeholder, a generator that failed |
| **Notes** | word count outside 800–1,200, shelf rows outside 4–6 |

A failed generator costs you one block, not the draft — the region is left
untouched and flagged, so a Supabase outage or an empty news run still gives you
something to work in. `--skip-wwp` and `--skip-proof` say so deliberately.

Lowercase `{{unsubscribe_url}}`-style tokens are Beehiiv's and are left alone;
only uppercase ones count as unfilled.

What it will never do is write the consequence lines. The claim and the link
belong to the source; the consequence is the argument, and generating it would
be inventing bourbon facts. Same rule as `proof.mjs`.

## The sourcing rule

Every price, proof, age statement, release date or availability claim needs
either a link to a primary source, or a dated first-hand sighting with a
location. No exceptions, including in the Shelf Report — "via Dana, Columbus OH,
Sept 8" is a citation; "someone said" is not.

This is the same guardrail the site runs on, and it is what "Ignore the Noise"
means operationally.

## Section budget

| Section | Target | Notes |
|---|---|---|
| The Pour | 2–3 sentences | Dateline + what this issue is about |
| Proof | 3–5 bullets | One claim, one consequence, one source link each |
| Perspective | 400–600 words | One argument. This is the product. |
| What We'd Pay | ~150 words | One bottle, links to its site page |
| The Shelf Report | 4–6 lines | Reader-submitted, credited by first name + city |
| One ask | 1 line + 1 button | Never two CTAs |

Whole issue: 800–1,200 words, 4–6 minute read. If a week is thin, cut Proof to
three bullets. Never cut Perspective — it is the reason people subscribe.

## What We'd Pay — generated, overridable

Don't type this block by hand. Build it:

```
node newsletter/build-wwp.mjs 002        # newsletter/issues/002.wwp.json
node newsletter/build-wwp.mjs 002 > block.html
```

The provenance report goes to stderr, the HTML block to stdout, so redirecting
gives you a clean file to paste into Beehiiv while still seeing the report.

**The database is the default, never the authority.** Every field in the
sidecar's `overrides` wins; every field left out is pulled live from
`bottles` + `bottle_prices` through the publishable key, so RLS applies and a
draft bottle is simply not found.

| Sidecar | Behaviour |
|---|---|
| `slug` only, no `overrides` | fully automatic |
| `slug` + some `overrides` | those fields yours, the rest pulled |
| `"mode": "manual"`, no `slug` | fully hand-written, nothing read |

Overridable fields: `headline`, `subline`, `msrp`, `msrpSource`, `stealUnder`,
`wedPay`, `fairUnder`, `maybeUnder`, `note`, `url`.

### What the report tells you

- **`pulled` / `OVERRIDDEN` / `unset`** per field, so a stale override can't sit
  in an issue for six weeks unnoticed.
- **`DRIFT`** — you override a field and the database now disagrees. Your
  override is still used; you decide which is right.
- **`UNSOURCED`** — you override `msrp` without an `msrpSource`. The schema
  constraint `bottle_prices_msrp_sourced` guarantees a *pulled* MSRP has a source
  and a verified date; your number doesn't inherit it.

The script never writes to the database. A number typed for one issue must not
become the site's number.

### Why there is no "street price"

There is no street-price field to pull. `bottle_retailers.verified_price_cents`
exists but its own comment reads *"Reserved for future verified pricing. Null
means we do not claim to know."* The block shows the band ladder instead —
`whatWedPayCents()` (`src/lib/domain/verdict.ts:31`) defines What We'd Pay as
the top of the Buy band, and a *verdict* is a function of a shelf price
(`evaluateVerdict()`), not a property of a bottle. Don't put a verdict pill in
the email; there is no price in an email to evaluate against.

## Beehiiv setup

1. Beehiiv → **Design → Custom HTML** (or paste into a Custom HTML block in the
   editor). Paste the whole file.
2. Swap the merge fields Beehiiv owns:
   - `{{UNSUBSCRIBE_URL}}` → `{{unsubscribe_url}}`
   - `{{PREFERENCES_URL}}` → `{{preferences_url}}`
   - `{{MAILING_ADDRESS}}` → leave the literal address, or delete the line if
     Beehiiv's own compliance footer is enabled (it appends address +
     unsubscribe automatically). **Do not ship with neither.**
3. Set the preview text in Beehiiv's own field *and* keep the hidden preheader
   div — clients disagree about which they read.
4. `{{PREVIEW_TEXT}}`, `{{ISSUE_NO}}`, `{{ISSUE_DATE}}` etc. are ours, not
   Beehiiv's — fill them in by hand or with find-and-replace.
5. Send a seed test to Gmail (web + iOS), Outlook desktop, and Apple Mail with
   dark mode on before every send for the first month.

## Brand

The governing document is `BRAND_GUIDE.md` (copied from *Proof & Perspective
Complete Brand Kit v1.0*). Read it before any design change. Logos live in
`assets/`; the full kit — icons, podcast covers, fonts, reference boards — is the
zip in `G:\My Drive\sbb\`.

### Typography

| Role | Face | Fallback stack in the email |
|---|---|---|
| "Proof" section label | Cormorant Garamond Light 300 | `Georgia, 'Times New Roman', serif` |
| "Perspective" / section labels | Oswald Bold 700 | `'Arial Narrow', Arial, Helvetica, sans-serif` |
| Prices, dateline | Oswald | same |
| Article headlines, bottle names | Cormorant Garamond 600 | same serif stack |
| Body, UI, tagline | Inter 400/500 | `-apple-system, 'Segoe UI', Helvetica, Arial` |

The two section labels deliberately mirror the wordmark's two halves — Proof in
Cormorant Light, Perspective in Oswald Bold. Web fonts load in Apple Mail and
little else, so check the Georgia/Arial Narrow fallback before calling an issue
done.

**Interpretation, not guide:** the guide specifies the wordmark and body copy but
not article headlines. Cormorant Garamond 600 at 32px is my choice for the
Perspective headline. Overrule it if you'd rather they were Oswald.

### Palette, and where the brand amber cannot go

| Token | Hex | Use in email |
|---|---|---|
| Onyx Black | `#0E0E0E` | Masthead band, What We'd Pay card, body ink on ivory |
| Warm Ivory | `#F4EFE5` | Email ground, ink on onyx |
| Bourbon Amber | `#B0642E` | Rules, bullets, the large price figure — **never body-size text** |
| Whiskey Slate | `#686B6B` | Muted copy on ivory |
| Pure White | `#FFFFFF` | Label on the CTA button |
| *Amber Deep* | `#9A5528` | **Derived.** Body links on ivory, CTA button fill |
| *Slate Light* | `#8E9190` | **Derived.** Muted copy on onyx |

Bourbon Amber is a mid-tone and fails WCAG AA for normal-size text on both
brand grounds — 4.33:1 on Onyx, 3.89:1 on Warm Ivory, against the 4.5:1 body
threshold. It clears AA Large, so it carries the 26px bold price figure, rules
and bullets, and nothing smaller. That matches the guide, which already scopes
amber to "ampersand, whisky, rules, accents."

The two derived tokens exist because the kit has no colour that works in those
slots: Whiskey Slate on Onyx is 3.59:1 (fails), and no palette colour reaches
4.5:1 against Bourbon Amber, so an amber button can't carry an accessible label.
Both derivatives stay within the amber/slate families. **Don't swap them back to
the pure brand values to be "more on-brand" — that trades a real accessibility
failure for a nominal consistency win.** Raise it with whoever owns the guide
instead; a slightly darker Bourbon Amber would fix it at the source.

### Logo

The wordmark is a locked lockup. **Never set "Proof & Perspective" as live
text** — use the image. `assets/pp-signature-glass-dark-512.png` (512×132) sits
on the onyx masthead at 260px wide; the sample references it locally so it
renders offline, but it must be an **absolute https URL** before any send —
upload it to Beehiiv and paste that URL into `{{LOGO_URL}}`. Always keep the alt
text, since a third of clients block images by default.

Use `Clean_Drop` instead where space is tight or the layout already has whisky
imagery. Minimum widths and clear space are in `BRAND_GUIDE.md`.

**Section icons:** the kit ships 25 of them in three styles. I did not build them
into the template — each is another hosted asset, and blocked images would leave
gaps in every section header. The email is deliberately text-forward. Add them if
you want the richer look, but host them alongside the logo and keep alt text.

## Why this email is ivory and the site is not

The site is charcoal-grounded by deliberate decision (see the project README,
"Brand"). Warm Ivory is the identity's own editorial light ground, so the email
using it is on-brand, not a deviation — but the reason it *must* be light is
technical: Apple Mail, Outlook and Gmail all auto-invert dark email grounds with
no reliable opt-out, and an onyx email renders as muddy grey with unreadable
amber in roughly a third of clients. Onyx stays for the masthead band and the
What We'd Pay card, where it is a contained block rather than the page ground.

The `@media (prefers-color-scheme:dark)` and `[data-ogsc]` blocks in the `<style>`
exist to pin that down. Don't remove them.

Web fonts do not load in Outlook or most mobile clients. Playfair Display falls
back to Georgia and Inter to system sans — both stacks are already in every
`font-family` declaration. Check the Georgia fallback looks right before you
decide the email is done.

## Weekly cadence

- **Mon (30 min)** — source sweep into a running capture doc. TTB COLA filings,
  state ABC announcements, distillery newsrooms, reader replies.
- **Tue** — draft Perspective first, then Proof.
- **Wed** — fact-check pass against the sourcing rule. Every claim gets its link
  or gets cut.
- **Thu 7–8am** — send. Same slot every week.

Keep three evergreen Perspective pieces in the bank so a quiet news week never
breaks the streak.

## Before the first real send

- [ ] Physical mailing address in the footer (CAN-SPAM) or Beehiiv footer enabled
- [ ] Affiliate disclosure at the top, not only the footer (FTC position)
- [ ] 21+ line present
- [ ] Legal copy reviewed by counsel — same open item as the site's legal pages
- [ ] Beehiiv credentials set (still outstanding per project README)
- [ ] Demo bottles cleared from the database before linking to any bottle page
      (`demo_guide_teardown.sql`, then `demo_bottle_teardown.sql`)
