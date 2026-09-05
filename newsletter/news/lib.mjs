/**
 * Shared helpers for the bourbon news aggregator.
 *
 * No dependencies on purpose. This runs before an issue exists, on a laptop,
 * and must keep working when the site's package tree changes — same reasoning
 * as build-wwp.mjs avoiding dotenv.
 *
 * Nothing here touches the database or the network except fetchFeed().
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const RUNS_DIR = join(HERE, "runs");

export function die(msg) {
  process.stderr.write(`\n  ERROR  ${msg}\n\n`);
  process.exit(1);
}

/** stderr, so stdout stays a clean pipe for generated HTML. */
export const w = (s = "") => process.stderr.write(`${s}\n`);

// ------------------------------------------------------------------ dates ---

/** YYYY-MM-DD in UTC. Run files are named by this, so they sort lexically. */
export function isoDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((Date.now() - then.getTime()) / 86_400_000);
}

export function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// -------------------------------------------------------------------- xml ---

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
  mdash: "—", ndash: "–", hellip: "…", middot: "·",
};

export function decodeEntities(input) {
  return String(input)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole);
}

export function stripTags(input) {
  // CDATA must be unwrapped first: `<![CDATA[...]]>` ends in `>`, so a tag
  // stripper run ahead of it swallows the whole payload and returns "".
  const unwrapped = String(input).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  let out = decodeEntities(
    unwrapped.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]*>/g, " "),
  );
  // The newswires double-escape, so one pass leaves "&amp;" sitting in a
  // headline. Two passes at most: more would start eating literal text that
  // happens to look like an entity.
  if (/&(amp|lt|gt|quot|apos|#\d+);/i.test(out)) out = decodeEntities(out);
  return out.replace(/\s+/g, " ").trim();
}

/** First matching tag's inner content, tried in order. */
function pickTag(block, names) {
  for (const name of names) {
    const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
    if (m && m[1].trim()) return m[1];
  }
  return null;
}

/**
 * Parses RSS 2.0 and Atom without a parser dependency. Feeds in the wild are
 * inconsistent enough that a strict parser tends to throw on one outlet and
 * take the whole run down with it; this reads the four fields we need and
 * ignores everything else.
 */
export function parseFeed(xml, source) {
  const items = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];

  for (const block of blocks) {
    const title = stripTags(pickTag(block, ["title"]) ?? "");
    if (!title) continue;

    let link = null;
    const rss = pickTag(block, ["link"])?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
    // An RSS <link> holds the URL as text; an Atom <link> is an empty element
    // carrying href, and pickTag returns nothing useful for it.
    if (rss && !rss.startsWith("<")) link = decodeEntities(rss).trim();
    if (!link) {
      // Atom: prefer rel="alternate" (or no rel at all) over rel="self".
      const hrefs = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
      const best =
        hrefs.find((a) => /rel=["']alternate["']/i.test(a)) ??
        hrefs.find((a) => !/rel=/i.test(a)) ??
        hrefs[0];
      const href = best?.match(/href=["']([^"']+)["']/i);
      if (href) link = decodeEntities(href[1]).trim();
    }
    if (!link) continue;

    const rawDate = stripTags(pickTag(block, ["pubDate", "published", "updated", "dc:date"]) ?? "");
    const parsed = rawDate ? new Date(rawDate) : null;
    const published = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;

    const summary = stripTags(
      pickTag(block, ["description", "summary", "content:encoded", "content"]) ?? "",
    ).slice(0, 400);

    // Google News wraps every link in its own redirector and names the real
    // outlet in <source url="...">. The wrapper is not a citation, so the item
    // is flagged and proof.mjs refuses to publish it until you paste the direct
    // URL in the review screen.
    const src = block.match(/<source\b[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
    // Only a genuine <source> element names a different outlet. Falling back to
    // the host would make "thedailypour.com" the byline on a Whiskey Raiders story.
    const publisher = src ? stripTags(src[2]) : null;
    const needsDirectLink = hostOf(link) === "news.google.com";

    items.push({
      title,
      url: link,
      canonical: canonicalUrl(link),
      source: source.name,
      sourceWeight: source.weight ?? 1,
      publisher,
      published,
      summary,
      needsDirectLink,
    });
  }
  return items;
}

// ------------------------------------------------------------------- urls ---

const TRACKING = /^(utm_|fbclid|gclid|mc_cid|mc_eid|ref|ref_src|igshid|s_cid|_hsenc|_hsmi)/i;

/** Strips tracking noise so the same story from a newsletter and a feed collapse. */
export function canonicalUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.host = u.host.toLowerCase().replace(/^www\./, "");
    u.protocol = "https:";
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING.test(key)) u.searchParams.delete(key);
    }
    let out = u.toString();
    if (out.endsWith("/") && u.pathname !== "/") out = out.slice(0, -1);
    return out;
  } catch {
    return String(raw).trim();
  }
}

/** "breakingbourbon.com" — shown in the review UI so an unfamiliar feed is obvious. */
export function hostOf(raw) {
  try {
    return new URL(raw).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// -------------------------------------------------------------- near-dupes --

const STOPWORDS = new Set(
  ("a an the and or of for to in on at by with from as is are was were be been it its this that " +
    "new now has have will would could says said after before more most just about into over")
    .split(" "),
);

export function titleTokens(title) {
  return new Set(
    String(title)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
  );
}

export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/**
 * Collapses the same story rewritten by several outlets. The highest-weighted
 * source wins and carries the rest as `alsoIn`, so you can see a story was
 * picked up widely — that itself is a signal — without five bullets for it.
 */
export function collapseDuplicates(items, threshold = 0.62) {
  const kept = [];
  for (const item of items) {
    const tokens = titleTokens(item.title);
    const twin = kept.find(
      (k) => k.canonical === item.canonical || jaccard(titleTokens(k.title), tokens) >= threshold,
    );
    if (!twin) {
      kept.push({ ...item, alsoIn: [] });
      continue;
    }
    const loser = twin.sourceWeight >= item.sourceWeight ? item : twin;
    const winner = loser === item ? twin : item;
    if (winner !== twin) {
      Object.assign(twin, winner, { alsoIn: twin.alsoIn });
    }
    if (!twin.alsoIn.some((a) => a.url === loser.url)) {
      twin.alsoIn.push({ source: loser.source, url: loser.url });
    }
  }
  return kept;
}

// ---------------------------------------------------------------- scoring ---

/**
 * Keyword weights, doubled in the headline. A muted phrase zeroes the item
 * outright — that is how cocktail recipes and sweepstakes stay out of a
 * newsletter about what bourbon costs.
 */
export function scoreItem(item, keywords) {
  const title = item.title.toLowerCase();
  const body = `${item.title} ${item.summary}`.toLowerCase();
  const reasons = [];

  for (const phrase of keywords.mute ?? []) {
    if (body.includes(phrase.toLowerCase())) {
      return { score: 0, reasons: [`muted: "${phrase}"`], muted: true };
    }
  }

  // General spirits feeds carry a lot of tequila, watches and travel. An item
  // that never says one of these words is not about our subject at all.
  const require = keywords.require ?? [];
  if (require.length && !require.some((phrase) => body.includes(phrase.toLowerCase()))) {
    return { score: 0, reasons: ["off-topic"], muted: true };
  }

  let score = (item.sourceWeight ?? 1) * 3;

  for (const [phrase, weight] of Object.entries(keywords.weights ?? {})) {
    const needle = phrase.toLowerCase();
    if (title.includes(needle)) {
      score += weight * 2;
      reasons.push(`${phrase} (headline)`);
    } else if (body.includes(needle)) {
      score += weight;
      reasons.push(phrase);
    }
  }

  const age = daysAgo(item.published);
  if (age !== null && age <= 3) score += 3;
  else if (age !== null && age <= 7) score += 1;

  return { score, reasons, muted: false };
}

// ------------------------------------------------------------------ files ---

export function loadJson(path, label) {
  if (!existsSync(path)) die(`${label} is missing:\n         ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    die(`${label} is not valid JSON:\n         ${path}\n         ${error.message}`);
  }
}

export const loadSources = () => loadJson(join(HERE, "sources.json"), "sources.json");
export const loadKeywords = () => loadJson(join(HERE, "keywords.json"), "keywords.json");

export function runPath(day) {
  return join(RUNS_DIR, `${day}.json`);
}

export function listRuns() {
  if (!existsSync(RUNS_DIR)) return [];
  return readdirSync(RUNS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
}

export function latestRunPath() {
  const runs = listRuns();
  if (!runs.length) {
    die('No runs yet. Fetch one first:\n         node newsletter/news/fetch.mjs');
  }
  return join(RUNS_DIR, runs[runs.length - 1]);
}

export function readRun(path) {
  return loadJson(path, "run file");
}

export function writeRun(path, run) {
  mkdirSync(RUNS_DIR, { recursive: true });
  writeFileSync(path, `${JSON.stringify(run, null, 2)}\n`, "utf8");
}

/** Every canonical URL we have already filed, so a story is new exactly once. */
export function seenBefore(exceptPath = null) {
  const seen = new Map();
  for (const file of listRuns()) {
    const path = join(RUNS_DIR, file);
    if (path === exceptPath) continue;
    const run = readRun(path);
    for (const item of run.items ?? []) {
      if (!seen.has(item.canonical)) seen.set(item.canonical, run.day ?? file.slice(0, 10));
    }
  }
  return seen;
}

// ------------------------------------------------------------------- html ---

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ------------------------------------------------------------------ fetch ---

export async function fetchFeed(source, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        // Some feeds 403 a bare fetch. Identify honestly rather than spoofing.
        "user-agent": "SmallBatchBourbon-news/1.0 (+https://smallbatchbourbon.com)",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, xml: await res.text() };
  } catch (error) {
    return { ok: false, error: error.name === "AbortError" ? "timed out" : error.message };
  } finally {
    clearTimeout(timer);
  }
}
