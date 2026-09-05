# News aggregator — Proof, sourced

Three commands. Fetch pulls the feeds, review is where you mark keepers, proof
turns the keepers into the issue's Proof block.

```
node newsletter/news/fetch.mjs                    # pull and score
node newsletter/news/review.mjs                   # tick boxes at 127.0.0.1:4317
node newsletter/news/proof.mjs 002 > block.html   # generate the bullets
node newsletter/news/add.mjs <url>                # add a feed you found
```

Feeds can also be added, and switched on and off, from the review screen itself
— see **Adding a feed you found** below.

Nothing here touches the database and nothing is published. The whole tool is
six scripts, two config files and a folder of run files — no dependencies
beyond Node 20+, for the same reason `build-wwp.mjs` reads `.env.local` by hand
rather than adding dotenv.

## The weekly loop

**1. Fetch.** Every feed in `sources.json` is read, parsed, scored against
`keywords.json`, deduplicated, and written to `runs/YYYY-MM-DD.json`. A failed
feed is reported by name and the run continues — one outlet going down should
not cost you the week.

A story is new exactly once. Anything whose canonical URL appears in an earlier
run is dropped, so a Monday run and a Thursday run don't hand you the same links
twice. `--all` overrides that; `--days 21` widens the window from the default 10.

Re-running the same day is safe. Your keeps, angles and pasted URLs survive, and
only genuinely new items get added.

**2. Review.** `review.mjs` opens a local page listing the run highest-score
first. Tick **Keep** on what belongs in the issue, and type your angle — the
consequence you'll write up — in the box beside it. Every click writes straight
to the run file; there is no save button and nothing is held in memory. The
server binds 127.0.0.1 and writes to exactly one file, the run you opened.

Filter by headline or outlet, or narrow to what you've kept. Close the tab when
you're done.

**3. Proof.** `proof.mjs <issue>` reads the keeps and prints the Proof block in
`template.html`'s markup, ready to drop in. Report to stderr, HTML to stdout —
same split as `build-wwp.mjs`, so redirecting gives you a clean file to paste
while you still see the report. `--check` fetches every link first and tells you
which ones no longer resolve.

## What the generator deliberately won't do

Each bullet arrives with the claim, the outlet, the date and the link wired up,
and the consequence left as `{{WHY_IT_MATTERS_n}}`.

The section budget is one claim, one consequence, one source link. The claim and
the link belong to the source. The consequence is the argument — the reason
anyone subscribes — and a script that generated it would be inventing bourbon
facts, which is the one thing the PRD forbids outright. Your angle from the
review screen rides along as an HTML comment above each bullet so you're not
writing it from memory, but it is a note to yourself, not copy.

The report also warns when you're outside the 3–5 bullet budget, when an item is
more than two weeks old, when three or more bullets come from one outlet, and
when a kept item has no angle noted.

## Aggregator links are refused

The two Google News rows in `sources.json` are queries, not outlets — they catch
a local paper reporting a distillery expansion that no whiskey publication runs.
But their links point at Google's redirector, which is not a citation and rots.

Those items are flagged in the review screen with a field for the publisher's
own URL, and `proof.mjs` refuses to emit until you fill it in. `--allow-redirects`
overrides that; the sourcing rule says don't.

## Tuning what it surfaces

`keywords.json` is the whole editorial filter, and it's meant to be edited.

- **`require`** — an item must contain at least one of these words or it's
  dropped as off-topic. This is what keeps tequila, watches and travel out of
  the general spirits feeds.
- **`weights`** — a phrase in the headline counts double. Money, supply and
  verifiable facts score high because "Drink Smarter. Ignore the Noise." is a
  claim about price and value. The negative numbers matter as much: tasting
  reviews sink to the bottom rather than being muted, because now and then one
  carries a price or proof change worth a bullet.
- **`mute`** — dropped outright, never scored.

Scores are relative. The number only decides what order you read things in.

`sources.json` takes a `weight` of 1–3 per feed, used as a tiebreaker before
keywords, and `"enabled": false` to mute a feed without losing the URL. When the
same story runs at several outlets it collapses to one item, the
highest-weighted source wins, and the rest appear as "Also covered by" — that a
story got picked up widely is itself a signal.

Every feed in `sources.json` was verified on 2026-09-01. **Breaking Bourbon has
no feed of any kind** — `/feed`, `/rss.xml` and Squarespace's `?format=rss` all
404 — so it stays a manual check each week.

## The wire

**PR Newswire** is where the brands file their own releases — the same source
the `bourbon-media` skill pulls press photos from. A release lands there before
any outlet rewrites it, carrying the brand's own dates and numbers, which makes
it the best citation available for what was announced.

It is a primary source for what a brand said, and for what it says a bottle
costs. It is not a source for whether that price is worth paying. That verdict
is the site's job.

Only two of its category feeds are worth polling: beers-wines-and-spirits and
product-recalls. The others, food-beverages included, silently fall back to
all-industry news — checked on 2026-09-01, and they came back full of bank
earnings.

### A limit worth knowing

Duplicate collapsing matches on canonical URL and close headline similarity. A
press release and an outlet's differently-worded write-up of it will often both
appear — on the first run, Four Roses' own release and Whiskey Raiders' take on
it came through as two items.

That is not ideal, but the fix is worse: a looser threshold starts merging
genuinely different stories about the same brand, and a wrongly-merged story
disappears entirely. Two entries you can see and choose between beats one
entry that silently swallowed the other. When both show up, cite the wire.

## Adding a feed you found

Two ways in, one implementation behind them (`discover.mjs`) — a feed the panel
accepts and the command rejects would be a bug nobody notices for months.

### In the review screen

Open **Feeds** at the top of the page. Paste a feed URL, or just a site address,
and press **Check** to see what is in it or **Add** to keep it. The report shows
the feed it found, the name it will use, how old the newest post is, how many
items pass the require gate, and the first five headlines with the scores they
would get.

Below the form is every configured feed. Unticking one writes
`"enabled": false` into `sources.json` — it stops being fetched and the URL is
kept. Changes there apply to the next fetch, not to the run you are reading.

### On the command line

```
node newsletter/news/add.mjs https://example.com/feed/
node newsletter/news/add.mjs https://somedistillery.com          # finds the feed
node newsletter/news/add.mjs <url> --name "Some Distillery" --weight 2
node newsletter/news/add.mjs <url> --check                       # look, don't write
```

Either way, point it at a feed or at a plain site. Given a site it discovers the
feed the way a browser would — the `<link rel="alternate">` the page declares, then the
usual paths (`/feed`, `/rss.xml`, `/news/feed`, Squarespace's `?format=rss`).

Before writing anything it reports what is actually in there: item count, how
old the newest post is, how many items pass the require gate, and the first five
headlines with the scores they would get. Then it appends to `sources.json`,
taking the feed's own title as the name unless you pass `--name`.

It refuses a feed that is empty, unparseable, or dead — nothing published in six
months — and refuses one where no item passes the require gate. `--force`
overrides; `--check` looks without writing.

## Most distilleries have no feed

Checked on 2026-09-01, fourteen distillery sites:

| Feed | Distillery | Newest post |
|---|---|---|
| none | Buffalo Trace, Heaven Hill, Four Roses, Maker's Mark, Jim Beam, Willett, Castle & Key, KY Distillers Assoc | — |
| yes | Wild Turkey | Jul 2022 |
| yes | Woodford Reserve | Mar 2023 |
| yes | Old Forester | Feb 2024 |
| yes | Michter's | Feb 2025 |
| yes | New Riff | Apr 2026 |
| yes | Bardstown Bourbon Co | Aug 2026 |

Eight have none at all. Four more have one nobody has posted to in over a year —
Wild Turkey's newest item is 1,510 days old. Of the two that are genuinely
current, both publish brand explainers ("What Makes Bourbon, Bourbon?") rather
than news.

So distillery feeds are not a news source, and none are in `sources.json`. This
is exactly why **PR Newswire earns its weight of 3**: it is where these brands
actually announce, including the ones with no website feed at all. Four Roses
publishes nothing to a feed of its own and filed its 2026 Limited Edition launch
on the wire.

If a brand you care about starts a real feed, `add.mjs` will tell you inside a
few seconds whether it is worth having — the staleness check exists because of
this table.

## Run files

`runs/*.json` are committed. They are the dedupe memory (a story is new once)
and the record of what you saw and passed over. Deleting one makes its stories
eligible to reappear.

## Scheduling it

Nothing here needs a server. If you want the fetch to happen without you
remembering, a GitHub Action running `node newsletter/news/fetch.mjs` and
committing the run file is enough — review still happens locally, because
marking keepers is a judgement call and the whole point is that it's yours.
