#!/usr/bin/env node
/**
 * Pulls every feed in sources.json, scores what came back against
 * keywords.json, and writes one run file:
 *
 *   node newsletter/news/fetch.mjs
 *   node newsletter/news/fetch.mjs --days 14        # widen the window
 *   node newsletter/news/fetch.mjs --all            # include stories seen before
 *   node newsletter/news/fetch.mjs --day 2026-09-01 # re-run into a given file
 *
 * Then read it:  node newsletter/news/review.mjs
 *
 * A story is new exactly once. Anything whose canonical URL appears in an
 * earlier run is dropped, so a Monday run and a Thursday run don't hand you
 * the same five links twice.
 *
 * Re-running the same day is safe: your keeps, angles and pasted direct URLs
 * survive, and only genuinely new items are added.
 */

import {
  loadSources, loadKeywords, parseFeed, fetchFeed, scoreItem, collapseDuplicates,
  seenBefore, runPath, readRun, writeRun, isoDay, daysAgo, hostOf, die, w,
} from "./lib.mjs";
import { existsSync } from "node:fs";

// ------------------------------------------------------------------- args ---

function parseArgs(argv) {
  const opts = { days: 10, all: false, day: isoDay() };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--all") opts.all = true;
    else if (arg === "--days") opts.days = Number(argv[++i]);
    else if (arg === "--day") opts.day = argv[++i];
    else if (arg.startsWith("--days=")) opts.days = Number(arg.slice(7));
    else if (arg.startsWith("--day=")) opts.day = arg.slice(6);
    else die(`Unknown argument "${arg}".`);
  }
  if (!Number.isFinite(opts.days) || opts.days < 1) die("--days needs a positive number.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.day)) die("--day needs a YYYY-MM-DD date.");
  return opts;
}

/** Stable short id from the canonical URL, so re-runs keep your marks attached. */
function idFor(canonical) {
  let h = 5381;
  for (let i = 0; i < canonical.length; i += 1) h = ((h * 33) ^ canonical.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// ------------------------------------------------------------------- main ---

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { sources } = loadSources();
  const keywords = loadKeywords();
  const active = sources.filter((s) => s.enabled !== false);
  if (!active.length) die("Every source in sources.json is disabled.");

  w();
  w(`  Proof & Perspective — news fetch  (${opts.day}, last ${opts.days} days)`);
  w();

  const results = await Promise.all(
    active.map(async (source) => ({ source, result: await fetchFeed(source) })),
  );

  const raw = [];
  const failures = [];
  for (const { source, result } of results) {
    if (!result.ok) {
      failures.push({ name: source.name, error: result.error });
      w(`  ${"FAILED".padEnd(8)} ${source.name} — ${result.error}`);
      continue;
    }
    const items = parseFeed(result.xml, source);
    const fresh = items.filter((item) => {
      const age = daysAgo(item.published);
      return age === null || age <= opts.days; // undated feeds get the benefit of the doubt
    });
    raw.push(...fresh);
    w(`  ${String(fresh.length).padStart(3)} in  ${source.name}${
      items.length !== fresh.length ? `  (${items.length - fresh.length} older than the window)` : ""
    }`);
  }

  if (!raw.length && failures.length === results.length) {
    die("Every feed failed. Check the network before trusting an empty week.");
  }

  // Score first: a muted item shouldn't win a duplicate contest.
  const scored = [];
  let muted = 0;
  for (const item of raw) {
    const { score, reasons, muted: isMuted } = scoreItem(item, keywords);
    if (isMuted) { muted += 1; continue; }
    scored.push({ ...item, score, reasons });
  }

  scored.sort((a, b) => b.score - a.score);
  const collapsed = collapseDuplicates(scored);

  const path = runPath(opts.day);
  const previous = existsSync(path) ? readRun(path) : null;
  const marks = new Map(
    (previous?.items ?? []).map((i) => [i.id, { keep: i.keep, angle: i.angle, directUrl: i.directUrl }]),
  );
  const seen = opts.all ? new Map() : seenBefore(path);

  const items = [];
  let repeats = 0;
  for (const item of collapsed) {
    const id = idFor(item.canonical);
    if (!marks.has(id) && seen.has(item.canonical)) { repeats += 1; continue; }
    const mark = marks.get(id) ?? {};
    items.push({
      id,
      title: item.title,
      url: item.url,
      canonical: item.canonical,
      source: item.source,
      publisher: item.publisher,
      host: hostOf(item.url),
      published: item.published,
      summary: item.summary,
      score: item.score,
      reasons: item.reasons,
      alsoIn: item.alsoIn ?? [],
      needsDirectLink: item.needsDirectLink === true,
      keep: mark.keep === true,
      angle: mark.angle ?? "",
      directUrl: mark.directUrl ?? "",
    });
  }

  // Anything you already marked stays in the file even if the feed dropped it.
  for (const old of previous?.items ?? []) {
    if ((old.keep || old.angle) && !items.some((i) => i.id === old.id)) items.push(old);
  }

  items.sort((a, b) => b.score - a.score);

  writeRun(path, {
    day: opts.day,
    generated: new Date().toISOString(),
    window: { days: opts.days },
    sources: active.map((s) => s.name),
    failures,
    items,
  });

  const kept = items.filter((i) => i.keep).length;
  w();
  w(`  ${raw.length} fetched  ·  ${muted} muted  ·  ${repeats} already filed  ·  ${
    collapsed.length - items.length + repeats
  } collapsed as duplicates`);
  w(`  ${items.length} in the run${kept ? `  (${kept} already marked keep)` : ""}`);
  w();
  for (const item of items.slice(0, 5)) {
    w(`  ${String(item.score).padStart(3)}  ${item.title.slice(0, 68)}`);
    w(`       ${item.source}${item.reasons.length ? ` — ${item.reasons.slice(0, 3).join(", ")}` : ""}`);
  }
  if (failures.length) {
    w();
    for (const f of failures) w(`  !  ${f.name} did not answer (${f.error}) — nothing from it this week.`);
  }
  w();
  w(`  ${path}`);
  w(`  Review it:  node newsletter/news/review.mjs`);
  w();
}

main().catch((error) => die(error?.stack ?? String(error)));
