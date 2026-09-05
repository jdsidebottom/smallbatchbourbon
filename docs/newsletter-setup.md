# Proof and Perspective — Beehiiv setup

What to do after creating a Beehiiv account, in order. Written against the
integration in `src/lib/newsletter.ts`, which calls exactly one endpoint:
`POST /v2/publications/{id}/subscriptions`.

**Plan:** Launch (free, up to 2,500 subscribers) is enough. It includes API
access excluding the Send API, and this integration does not use the Send API.
Custom fields — which is how signups are segmented here — are on every tier.
Automations are not on Launch; that is the main reason you would upgrade.

---

## 1. Create the publication

- [ ] Create the publication and name it **Proof and Perspective**.
- [ ] Set the sending name and reply-to address. Use a real, monitored address —
      a no-reply address hurts deliverability and is a bad look for a brand whose
      whole promise is being straight with people.
- [ ] Set the publication description, and upload the logo from `public/logo.png`.
- [ ] Set the physical mailing address. **This is not optional** — CAN-SPAM
      requires a real postal address in every commercial email, and Beehiiv will
      put it in the footer for you. A PO box is fine.
- [ ] Decide on **double opt-in**. Recommended on: it costs you some raw signup
      numbers and buys you a list that actually opens. It also blunts the abuse
      problem below, since a bot signup that never confirms never becomes a
      subscriber.

## 2. Get the credentials

- [ ] Settings → API. Create an API key.
- [ ] Copy the **publication ID** (starts with `pub_`).
- [ ] Note that the API key is a secret with write access to your subscriber
      list. It never goes in a `NEXT_PUBLIC_*` variable, a commit, a screenshot,
      or a chat message.

## 3. Wire it up locally and prove it works

- [ ] Add to `.env.local`:
      ```
      BEEHIIV_API_KEY=...
      BEEHIIV_PUBLICATION_ID=pub_...
      ```
- [ ] Restart the dev server. These are server-only, so a restart is enough —
      no rebuild needed.
- [ ] Subscribe with your own address from the home page.
- [ ] Confirm the subscriber appears in Beehiiv within a few seconds.
- [ ] Confirm the `signup_source` custom field on that subscriber reads
      `landing_proof_and_perspective`.
- [ ] Subscribe again with the same address. The form should say you are already
      subscribed rather than erroring — the API returns 409 and the code handles
      it deliberately.
- [ ] **Check whether a welcome email arrives.** The code sends
      `send_welcome_email: true`, but Beehiiv's built-in welcome email and its
      automations builder are different features and Launch excludes automations.
      If nothing arrives and you want one, that is a Scale-tier upgrade. The API
      will not error either way, so this only shows up if you look.

## 4. Wire it up in Vercel

- [ ] Add both variables in Settings → Environment Variables.
- [ ] **Server-only. No `NEXT_PUBLIC_` prefix** — that prefix compiles the value
      into the JavaScript every visitor downloads.
- [ ] Scope them to **Production** only, unless you have a separate Beehiiv
      publication for previews. Otherwise every pull-request preview writes to
      your real list.
- [ ] Redeploy, then subscribe once from the live site to confirm.

## 5. Deal with abuse before you rely on it

Until the keys are set, the endpoint returns `not_configured` and a bot can
achieve nothing. **The moment they are live, abusive traffic becomes real API
calls against your subscriber list.**

The rate limit in `src/app/api/newsletter/route.ts` is an in-process counter:
five per minute per IP, held in memory. On Vercel's serverless runtime each
request may hit a fresh instance with an empty counter, so it degrades to
almost nothing. The honeypot still catches naive bots; neither stops someone
generating unique addresses.

**Decided 2026-09-05: a Cloudflare rate-limiting rule, plus double opt-in.**
Not Upstash, and not Turnstile for now.

The domain is already proxied through Cloudflare — `cf-cache-status: DYNAMIC`
on the live site, so HTML passes through to Vercel and only the edge sees the
request first. A rule therefore blocks a flood before it reaches your compute,
costs nothing on the free plan, and needs no code. An Upstash counter would
solve the same problem one layer later while adding a dependency and a network
round trip to every signup, so the two are alternatives, not partners.

Turnstile is a different axis — it asks whether the visitor is a person, which
no rate limit can answer — but it puts a challenge in front of real readers.
Hold it in reserve for actual observed abuse rather than paying that cost for a
list that does not exist yet.

- [ ] **Cloudflare → Security → WAF → Rate limiting rules → Create rule.**
      Match `URI Path equals /api/newsletter`. Set the threshold to mirror the
      in-process limiter — 5 requests per minute per IP — or the nearest period
      the plan offers. Action: Block. Counting is per IP on the free plan, which
      is what you want here.
- [ ] **Beehiiv → double opt-in on.** It costs some raw signup numbers and buys
      a list that opens. It is also the only thing on this page that limits the
      damage of a flood that gets through: an address that never confirms never
      becomes a subscriber.
- [ ] Leave the in-process counter in `src/app/api/newsletter/route.ts` alone.
      It is nearly free and catches trivial same-instance bursts. Do not count
      it as protection — on serverless each request may land on a fresh
      instance with an empty map.

### What double opt-in changes in the app

Nothing structural, but the copy has to match. `NewsletterForm`'s default
success message already says "Check your inbox to confirm." The Find My Next
Pour block on the home page overrode it with "You're on the early-access list",
which stops being true the moment double opt-in is on — that person is not on
any list until they click the link. Fixed alongside this note.

If you ever turn double opt-in **off**, both messages need revisiting.

What it costs you if you skip this: a list padded with fake addresses, a
collapsing open rate, and — if enough of them bounce — worse deliverability for
the real subscribers.

## 6. Segments worth creating on day one

Every signup carries a `signup_source` custom field. Four values exist:

| Value | Where it comes from |
| --- | --- |
| `landing_hero` | hero signup |
| `landing_proof_and_perspective` | the main Proof and Perspective block |
| `find_my_next_pour` | the Find My Next Pour teaser |
| `footer` | footer signup |

- [ ] Create a segment for `signup_source = find_my_next_pour`.

That one matters more than the others. Those people asked to hear about a
feature that **does not exist yet**. When it ships they need to be reachable as
a group, and if it never ships you owe them the courtesy of not pretending
otherwise. PRD §7.2 asks for exactly this.

## 7. Compliance

- [ ] Confirm the unsubscribe link is in the footer of every send. Beehiiv does
      this by default — check rather than assume.
- [ ] Confirm the postal address renders in a real send.
- [ ] The site's privacy policy already says the email address and signup source
      go to the email provider. If you start collecting anything else, that copy
      needs updating to match.
- [ ] Nothing here sets a cookie, so the newsletter does not change the
      no-consent-banner position. **Adding a Beehiiv tracking pixel or embed to
      the site would.** Use the API integration that already exists rather than
      pasting in an embed form.

## 8. Confirm it end-to-end

- [ ] `newsletter_signup_attempt` and `newsletter_signup_success` both appear in
      Vercel Analytics. Until the keys were set, success could never fire —
      seeing it is the proof the whole path works.
- [ ] Send yourself a test issue and read it on a phone.
- [ ] Check the archive/web version renders, since guides will link to it.

---

## If something breaks

| Symptom | Cause |
| --- | --- |
| Form says "not configured" | Env vars missing, or the server was not restarted |
| 401 from Beehiiv | API key wrong, revoked, or from a different account |
| 404 from Beehiiv | Publication ID wrong — it starts with `pub_` |
| Subscriber appears with no source | `custom_fields` not enabled on the publication |
| Success event never fires | The request is failing before Beehiiv returns 2xx; check the route's server logs |

In development the API's real error message is surfaced in the form. In
production the message is deliberately generic, so use the server logs.
