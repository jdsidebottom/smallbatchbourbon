#!/usr/bin/env node
/**
 * Adds a feed to sources.json, after checking it is worth having.
 *
 *   node newsletter/news/add.mjs https://example.com/feed/
 *   node newsletter/news/add.mjs https://somedistillery.com        # finds the feed
 *   node newsletter/news/add.mjs <url> --name "Some Distillery" --weight 2
 *   node newsletter/news/add.mjs <url> --check                     # look, don't write
 *
 * The same thing is available in the review screen's "Add a feed" panel, on the
 * same code — see discover.mjs. Use whichever is in front of you.
 *
 * It refuses a feed that is empty, unparseable, or dead — nothing published in
 * six months. That last check is the important one. Most distillery "news"
 * feeds are abandoned: as of 2026-09-01 Wild Turkey's newest post was from
 * 2022 and Woodford Reserve's from 2023. A dead feed costs a request a week and
 * silently contributes nothing. Override with --force if you know better.
 */

import { discoverFeed, evaluateFeed, readSources, writeSources } from "./discover.mjs";
import { shortDate, die, w } from "./lib.mjs";

// ------------------------------------------------------------------- args ---

const opts = { url: null, name: null, weight: 2, check: false, force: false };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (arg === "--check") opts.check = true;
  else if (arg === "--force") opts.force = true;
  else if (arg === "--name") opts.name = argv[++i];
  else if (arg.startsWith("--name=")) opts.name = arg.slice(7);
  else if (arg === "--weight") opts.weight = Number(argv[++i]);
  else if (arg.startsWith("--weight=")) opts.weight = Number(arg.slice(9));
  else if (!arg.startsWith("--") && !opts.url) opts.url = arg;
  else die(`Unknown argument "${arg}".`);
}
if (!opts.url) {
  die("No URL given.\n         Usage: node newsletter/news/add.mjs https://example.com/feed/");
}
if (![1, 2, 3].includes(opts.weight)) die("--weight must be 1, 2 or 3.");

// ------------------------------------------------------------------- main ---

async function main() {
  w();
  w(`  Checking ${opts.url}`);
  w();

  const feed = await discoverFeed(opts.url, (step) => w(`  ${step}`));
  if (!feed) {
    die(
      `No feed found at ${opts.url}.\n` +
        '         Tried the URL itself, any <link rel="alternate"> it declares, and\n' +
        "         the usual paths (/feed, /rss.xml, /news/feed, ?format=rss...).\n\n" +
        "         Plenty of sites simply have none — Buffalo Trace, Heaven Hill,\n" +
        "         Four Roses and Maker's Mark are all in that group. Those brands\n" +
        "         announce on PR Newswire instead, which is already a source.",
    );
  }

  const config = readSources();
  const already = config.sources.find((s) => s.url === feed.url);
  if (already) die(`Already a source: "${already.name}"\n         ${feed.url}`);

  const report = evaluateFeed(feed, { name: opts.name });

  w(`  feed     ${report.url}`);
  w(`  name     ${report.name}${report.nameFromFeed ? "   (from the feed's own title — override with --name)" : ""}`);
  w(`  items    ${report.total}`);
  w(
    `  newest   ${
      report.newestDays === null
        ? "undated"
        : `${shortDate(report.newestPublished)}, ${report.newestDays} days ago`
    }`,
  );
  w(`  on topic ${report.onTopic} of ${report.total} pass the require gate`);
  w();
  for (const sample of report.samples) {
    w(`   ${sample.score === null ? "  --" : String(sample.score).padStart(4)}  ${sample.title.slice(0, 64)}`);
  }
  w();

  if (report.problems.length && !opts.force) {
    die(
      `Not adding it:\n${report.problems.map((p) => `           - ${p}`).join("\n")}\n\n` +
        "         Add it anyway with --force, or look at it again with --check.",
    );
  }
  if (report.problems.length) {
    for (const problem of report.problems) w(`  !  ${problem} — adding anyway (--force)`);
    w();
  }

  if (opts.check) {
    w("  --check: nothing written.");
    w();
    return;
  }

  config.sources.push({ name: report.name, url: report.url, weight: opts.weight });
  writeSources(config);

  w(`  Added "${report.name}" at weight ${opts.weight}. ${config.sources.length} sources now.`);
  w(`  Next fetch picks it up:  node newsletter/news/fetch.mjs`);
  w();
}

main().catch((error) => die(error?.stack ?? String(error)));
