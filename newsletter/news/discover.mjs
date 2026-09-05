/**
 * Feed discovery and vetting, shared by `add.mjs` (the command) and the Add a
 * feed panel in `review.mjs` (the screen).
 *
 * One implementation on purpose: a feed the panel accepts and the command
 * rejects — or the reverse — would be a bug nobody notices for months.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HERE, parseFeed, fetchFeed, scoreItem, loadKeywords, daysAgo, hostOf, stripTags } from "./lib.mjs";

export const SOURCES_PATH = join(HERE, "sources.json");

const CANDIDATE_PATHS = [
  "feed/", "feed", "rss", "rss.xml", "index.xml", "atom.xml",
  "news/feed/", "blog/feed/", "?format=rss",
];

/** Six months of silence. Wild Turkey's feed was 1,510 days stale when checked. */
export const STALE_DAYS = 180;

export function readSources() {
  return JSON.parse(readFileSync(SOURCES_PATH, "utf8"));
}

export function writeSources(config) {
  writeFileSync(SOURCES_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

/** Does this URL answer with something that parses as a feed? */
async function tryFeed(url) {
  const res = await fetchFeed({ name: "candidate", url });
  if (!res.ok) return null;
  const items = parseFeed(res.xml, { name: "candidate", weight: 1 });
  if (!items.length) return null;
  // The channel <title> is the feed's own name. Run it through stripTags so
  // "Michter&#039;s Distillery" does not become the source name.
  const title = res.xml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  return { url, items, feedTitle: stripTags(title) };
}

/**
 * Takes a feed URL or a plain site URL. Given a site, looks the way a browser
 * would: the <link rel="alternate"> the page declares, then the usual paths.
 * `onStep` reports progress so the command can narrate and the panel can too.
 */
export async function discoverFeed(startUrl, onStep = () => {}) {
  let url = String(startUrl).trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const direct = await tryFeed(url);
  if (direct) return direct;

  onStep(`${url} is not a feed itself — looking for one...`);

  const page = await fetchFeed({ name: "page", url });
  if (page.ok) {
    const declared = [...page.xml.matchAll(/<link\b[^>]*>/gi)]
      .map((m) => m[0])
      .filter((tag) => /type=["']application\/(rss|atom)\+xml["']/i.test(tag))
      .map((tag) => tag.match(/href=["']([^"']+)["']/i)?.[1])
      .filter(Boolean);
    for (const href of declared) {
      const abs = new URL(href, url).toString();
      onStep(`declared: ${abs}`);
      const found = await tryFeed(abs);
      if (found) return found;
    }
  }

  for (const path of CANDIDATE_PATHS) {
    const abs = new URL(path, url.endsWith("/") ? url : `${url}/`).toString();
    const found = await tryFeed(abs);
    if (found) {
      onStep(`found at the usual path: ${abs}`);
      return found;
    }
  }
  return null;
}

/** What is actually in the feed, and any reason not to take it. */
export function evaluateFeed(feed, { name } = {}) {
  const keywords = loadKeywords();
  const dated = feed.items.filter((i) => i.published);
  const newestDays = dated.length ? Math.min(...dated.map((i) => daysAgo(i.published))) : null;
  const newestItem = dated.find((i) => daysAgo(i.published) === newestDays) ?? null;

  const scored = feed.items.map((item) => ({ item, ...scoreItem(item, keywords) }));
  const onTopic = scored.filter((s) => !s.muted);

  const problems = [];
  if (newestDays !== null && newestDays > STALE_DAYS) {
    problems.push(`the newest post is ${newestDays} days old — this feed is abandoned`);
  }
  if (!onTopic.length) {
    problems.push("nothing in it passes the require gate in keywords.json — it is not about our subject");
  }

  return {
    url: feed.url,
    name: name || feed.feedTitle || hostOf(feed.url),
    nameFromFeed: !name,
    total: feed.items.length,
    newestDays,
    newestPublished: newestItem?.published ?? null,
    onTopic: onTopic.length,
    samples: scored.slice(0, 5).map((s) => ({
      title: s.item.title,
      score: s.muted ? null : s.score,
    })),
    problems,
  };
}

/** The whole check in one call, for callers that just want the verdict. */
export async function inspectUrl(url, { name, onStep } = {}) {
  const feed = await discoverFeed(url, onStep);
  if (!feed) return { found: false };
  const config = readSources();
  const existing = config.sources.find((s) => s.url === feed.url);
  return { found: true, existing: existing ?? null, report: evaluateFeed(feed, { name }) };
}
