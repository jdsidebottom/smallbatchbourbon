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
- [ ] Subscribe again with the same address. **Note: Beehiiv does not return 409
      here.** Tested against the live API 2026-09-05 — a repeat signup comes back
      as success, so the form says "You're in" rather than "You're already on the
      list", and the `duplicate` branch in `src/lib/newsletter.ts` never fires.
      Harmless, but it is dead code and this document previously claimed
      otherwise.
- [ ] **The welcome email does not currently send.** Tested 2026-09-05: three
      subscribes with `send_welcome_email: true` produced no email at all, in
      inbox or spam. Either no welcome email is authored in the publication (a
      free dashboard fix — the API flag cannot send an email that does not exist)
      or Launch tier will not send one (a Scale-tier upgrade). The API returns
      200 either way, so this only shows up if you look.
- [ ] **Double opt-in confirmation does send, and lands well.** Tested
      2026-09-05: arrived in 17 seconds, in the inbox rather than spam, from
      `proofandperspective@mail.beehiiv.com`.
- [ ] **Consider an authenticated sending domain.** Confirmations currently send
      from `mail.beehiiv.com`, not from `proofandperspective.com` — a domain you
      already own and have sent from. A shared provider subdomain is fine at
      launch, but your own authenticated domain is better for deliverability and
      is the thing a reader recognises in a From line.
- [ ] Delete the test subscribers before real content goes in.

## 4. Wire it up in Vercel

- [ ] Add both variables in Settings → Environment Variables.
- [ ] **Server-only. No `NEXT_PUBLIC_` prefix** — that prefix compiles the value
      into the JavaScript every visitor downloads.
- [ ] Scope them to **Production** only, unless you have a separate Beehiiv
      publication for previews. Otherwise every pull-request preview writes to
      your real list.
- [ ] Redeploy, then subscribe once from the live site to confirm.

## 5. Turn on Turnstile before the keys go live

Until the Beehiiv keys are set, the endpoint returns `not_configured` and a bot
can achieve nothing. **The moment they are live, abusive traffic becomes real API
calls against your subscriber list.**

Two things that look like protection are not:

- The rate limit in `src/app/api/newsletter/route.ts` is an in-process counter.
  On Vercel each request may hit a fresh instance with an empty counter, so it
  degrades to almost nothing.
- The Cloudflare rate-limiting rule `newsletter-signup-flood` only works while
  traffic is proxied. Under the grey-cloud DNS plan it goes inert the moment the
  domain points at Vercel.

Neither ever stopped the attack that matters: a flood of *unique* addresses,
which looks like ordinary traffic to a per-IP counter but pads the list with
unreachable subscribers and drags deliverability down for the real ones.
Cloudflare Turnstile is wired into the form and the route for exactly this. It
is free and unmetered, and unlike the firewall rule it keeps working after the
DNS cutover.

### Create the widget

- [ ] Cloudflare dashboard → Turnstile → Add widget.
- [ ] Hostnames: `smallbatchbourbon.com` **and** `localhost` (localhost lets you
      test locally against the real widget rather than the test keys).
- [ ] Widget mode: **Managed**.
- [ ] **Leave Pre-Clearance off.** This is Cloudflare's default and it must stay
      that way. With pre-clearance on, Turnstile issues a `cf_clearance` cookie,
      which breaks the site's "exactly one cookie" statement in the privacy
      policy and would require a consent banner on top of the 21+ gate. With it
      off, Turnstile issues a one-time token and sets nothing.
- [ ] Copy the **site key** and the **secret key**.

### Wire it up

- [ ] Add to `.env.local`:
      ```
      NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...
      TURNSTILE_SECRET_KEY=0x...
      ```
- [ ] Add both in Vercel → Settings → Environment Variables. The site key is
      public by design and needs the `NEXT_PUBLIC_` prefix; **the secret key must
      never have it.**
- [ ] **Set both or neither.** Leave both unset and verification is skipped
      entirely, which is what keeps local development and CI frictionless. Set
      only the secret and every real signup is rejected, because no widget exists
      to mint a token.

### Behaviour worth knowing before it surprises you

- The widget is invisible in normal use (`appearance: "interaction-only"`). It
  only draws a checkbox when Cloudflare actually wants one.
- Tokens are single-use and expire after five minutes. The form resets the
  widget after every submit; without that a second attempt fails as
  `timeout-or-duplicate` and looks like the visitor's fault.
- **If Cloudflare's siteverify is unreachable, the route fails open** and logs
  `turnstile unavailable, failing open`. A Cloudflare incident should not become
  a signup outage. Grep for that string if signups spike oddly.
- A rejection logs `turnstile rejected a submission` with the error code, and
  the visitor sees a generic retryable message.

### Test it with Cloudflare's test keys

These are documented, public, and safe to commit to a scratch file — never to
`.env.local` long-term:

| Purpose | Site key | Secret key |
| --- | --- | --- |
| Always passes | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` |
| Always blocks | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` |

- [ ] With the passing pair, submit the form. You should reach the Beehiiv layer
      — a 503 `not_configured` before the keys are set, a real subscribe after.
- [ ] With the blocking secret, submit again. Expect **403** and
      `verification_failed`.
- [ ] Turning on double opt-in in step 1 reduces the damage of anything that
      still gets through.

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
- [ ] Confirm the postal address renders in a real send. **The double opt-in
      confirmation email carries neither**, which is correct — it is transactional,
      not commercial — so it proves nothing about compliance. These two checks
      have to be done against an actual issue.
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
| Form says "could not verify" every time | Site key and secret are from different widgets, or the hostname is not on the widget's allow-list |
| Widget never appears and signups still work | Expected — interaction-only mode stays invisible unless Cloudflare wants an interaction |
| Signups suddenly bypass Turnstile | `TURNSTILE_SECRET_KEY` is unset in that environment; verification is skipped by design |

In development the API's real error message is surfaced in the form. In
production the message is deliberately generic, so use the server logs.
