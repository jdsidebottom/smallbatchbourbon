#!/usr/bin/env node
/**
 * Assembles a whole issue: runs both generators, fills the template, and tells
 * you what is still missing.
 *
 *   node newsletter/build-issue.mjs 002
 *   node newsletter/build-issue.mjs 002 > newsletter/issues/002.html
 *   node newsletter/build-issue.mjs 002 --skip-wwp     # database down, or no bottle this week
 *   node newsletter/build-issue.mjs 002 --day 2026-09-01
 *
 * Report to stderr, HTML to stdout — same split as build-wwp.mjs and proof.mjs,
 * so redirecting gives you a clean file while you still read the report.
 *
 * What it does NOT do is write copy. The Perspective argument, the Pour, and
 * every {{WHY_IT_MATTERS_n}} consequence stay yours; a script that produced
 * them would be inventing bourbon facts, which the PRD forbids outright. The
 * exit code is 1 while any of them is unfilled, so "it built" never gets
 * mistaken for "it is ready to send".
 *
 * Reads:
 *   template.html            the shell, with BUILD: markers
 *   issue.config.json        the seven values that never change
 *   issues/<n>.issue.json    this issue's hand-written copy
 *   issues/<n>.wwp.json      the What We'd Pay sidecar (build-wwp.mjs owns it)
 *   news/runs/<day>.json     the keeps (proof.mjs owns it)
 *
 * Writes nothing. Prints.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const w = (s = "") => process.stderr.write(`${s}\n`);

function die(msg) {
  w(`\n  ERROR  ${msg}\n`);
  process.exit(1);
}

// ------------------------------------------------------------------- args ---

const opts = { issue: null, day: null, skipWwp: false, skipProof: false };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (arg === "--skip-wwp") opts.skipWwp = true;
  else if (arg === "--skip-proof") opts.skipProof = true;
  else if (arg === "--day") opts.day = argv[++i];
  else if (arg.startsWith("--day=")) opts.day = arg.slice(6);
  else if (!arg.startsWith("--") && !opts.issue) opts.issue = arg;
  else die(`Unknown argument "${arg}".`);
}
if (!opts.issue) die("No issue given.\n         Usage: node newsletter/build-issue.mjs 002");

// ------------------------------------------------------------------ input ---

function loadJson(path, label) {
  if (!existsSync(path)) die(`No ${label} at\n         ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    die(`${label} is not valid JSON.\n         ${error.message}`);
  }
}

const templatePath = join(HERE, "template.html");
if (!existsSync(templatePath)) die(`No template.html at\n         ${templatePath}`);
let html = readFileSync(templatePath, "utf8");

const config = loadJson(join(HERE, "issue.config.json"), "issue.config.json");
const issuePath = join(HERE, "issues", `${opts.issue}.issue.json`);
const issue = loadJson(issuePath, `issue file for ${opts.issue}`);

// ------------------------------------------------------------- generators ---

/**
 * Runs a sibling generator and keeps its two streams apart. A generator that
 * fails is reported and its region left untouched — a database outage should
 * cost you one block, not the whole draft.
 */
function runGenerator(label, script, args) {
  const result = spawnSync(process.execPath, [join(HERE, script), ...args], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.error) return { ok: false, report: `${label} could not run: ${result.error.message}` };
  if (result.status !== 0) return { ok: false, report: (result.stderr || "").trimEnd() };
  return { ok: true, html: (result.stdout || "").trimEnd(), report: (result.stderr || "").trimEnd() };
}

const dayArgs = opts.day ? ["--day", opts.day] : [];

const proof = opts.skipProof
  ? { ok: false, skipped: true, report: "skipped with --skip-proof" }
  : runGenerator("proof.mjs", join("news", "proof.mjs"), [opts.issue, ...dayArgs]);

const wwp = opts.skipWwp
  ? { ok: false, skipped: true, report: "skipped with --skip-wwp" }
  : runGenerator("build-wwp.mjs", "build-wwp.mjs", [opts.issue]);

// ------------------------------------------------------------- assembling ---

/** Replaces everything between a BUILD marker pair, keeping the markers. */
function replaceRegion(source, name, replacement) {
  const openAt = source.indexOf(`<!-- BUILD:${name}`);
  const closeTag = `<!-- /BUILD:${name} -->`;
  const closeAt = source.indexOf(closeTag);
  if (openAt < 0 || closeAt < 0 || closeAt < openAt) {
    die(`template.html has no BUILD:${name} marker pair. Re-add the markers.`);
  }
  const openEnd = source.indexOf("-->", openAt) + 3;
  return source.slice(0, openEnd) + "\n" + replacement + "\n      " + source.slice(closeAt);
}

if (proof.ok) html = replaceRegion(html, "PROOF", proof.html);
if (wwp.ok) html = replaceRegion(html, "WWP", wwp.html);

// The Shelf Report is hand-collected from replies, so it is repeated here
// rather than generated. Reader credit is first name + city, per the README.
const shelf = Array.isArray(issue.shelf) ? issue.shelf : [];
if (shelf.length > 0) {
  const rows = shelf
    .map(
      (row) =>
        `      <div style="padding:7px 0;border-bottom:1px solid #DCD5C7;">
        <strong style="color:#0E0E0E;">${row.bottle ?? ""}</strong> &mdash; ${row.price ?? ""} &middot; <span class="sbb-muted" style="color:#686B6B;">${row.place ?? ""} &middot; via ${row.reader ?? ""}</span>
      </div>`,
    )
    .join("\n");
  html = replaceRegion(html, "SHELF", rows);
}

// Perspective body: paragraphs in, <p> out, so the issue file holds prose
// rather than markup.
const perspectiveBody = Array.isArray(issue.PERSPECTIVE_BODY)
  ? issue.PERSPECTIVE_BODY.map((para) => `<p style="margin:0 0 18px;">${para}</p>`).join("\n      ")
  : (issue.PERSPECTIVE_BODY ?? "");

const values = {
  ...config,
  ...issue,
  PERSPECTIVE_BODY: perspectiveBody,
  ISSUE_NO: issue.ISSUE_NO ?? opts.issue,
};

for (const [key, value] of Object.entries(values)) {
  if (key.startsWith("_") || key === "shelf") continue;
  if (typeof value !== "string") continue;
  html = html.split(`{{${key}}}`).join(value);
}

// --------------------------------------------------------------- checking ---

const remaining = [...html.matchAll(/\{\{([A-Z_0-9]+)\}\}/g)].map((m) => m[1]);
const unique = [...new Set(remaining)];

// Beehiiv's own merge fields are lowercase and are meant to survive.
const outstanding = unique.filter((k) => !/^[a-z_]+$/.test(k));
const consequences = outstanding.filter((k) => k.startsWith("WHY_IT_MATTERS_"));
const other = outstanding.filter((k) => !k.startsWith("WHY_IT_MATTERS_"));

const blockers = [];
const notes = [];

if (!proof.ok) (proof.skipped ? notes : blockers).push(`Proof block not generated — ${proof.report.split("\n")[0].trim()}`);
if (!wwp.ok) (wwp.skipped ? notes : blockers).push(`What We'd Pay not generated — ${wwp.report.split("\n")[0].trim()}`);
if (shelf.length === 0) notes.push("No shelf reports in the issue file — the section will still show its placeholder.");
else if (shelf.length < 4 || shelf.length > 6) notes.push(`${shelf.length} shelf reports — the budget is 4-6.`);

if (consequences.length > 0) {
  blockers.push(`${consequences.length} consequence${consequences.length > 1 ? "s" : ""} unwritten: ${consequences.join(", ")}`);
}
if (other.length > 0) blockers.push(`Unfilled: ${other.map((k) => `{{${k}}}`).join(" ")}`);

// The pre-send checklist from README.md, checked mechanically instead of
// remembered. These are the ones a script can actually see.
const compliance = [];
const hasBeehiivFooter = html.includes("{{unsubscribe_url}}") || html.includes("{{preferences_url}}");
if (!config.MAILING_ADDRESS && !hasBeehiivFooter) {
  compliance.push("No postal address and no Beehiiv merge footer — CAN-SPAM requires one of the two.");
}
if (!config.LOGO_URL) compliance.push("LOGO_URL is empty — the masthead will render as alt text.");
else if (!/^https:\/\//.test(config.LOGO_URL)) compliance.push("LOGO_URL is not an absolute https URL — it will break in every client.");
if (!/21\+/.test(html)) compliance.push("No 21+ line found in the footer.");
if (!html.includes("affiliate")) compliance.push("No affiliate disclosure found — FTC wants it above the fold, not only in the footer.");

// ----------------------------------------------------------------- report ---

const wordCount = html
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<[^>]*>/g, " ")
  .replace(/&[a-z]+;/gi, " ")
  .split(/\s+/)
  .filter(Boolean).length;

w();
w(`  Proof & Perspective — issue ${opts.issue}`);
w();
w(`   Proof            ${proof.ok ? "generated" : `NOT generated (${proof.skipped ? "skipped" : "failed"})`}`);
w(`   What We'd Pay    ${wwp.ok ? "generated" : `NOT generated (${wwp.skipped ? "skipped" : "failed"})`}`);
w(`   Shelf Report     ${shelf.length} row${shelf.length === 1 ? "" : "s"}`);
w(`   Body             ~${wordCount} words  (target 800-1,200)`);

if (wordCount < 800 || wordCount > 1200) {
  notes.push(`~${wordCount} words is outside the 800-1,200 budget.`);
}

if (compliance.length > 0) {
  w();
  w("   Compliance");
  for (const item of compliance) w(`     !  ${item}`);
}

if (notes.length > 0) {
  w();
  w("   Notes");
  for (const item of notes) w(`     -  ${item}`);
}

if (blockers.length > 0) {
  w();
  w("   Not ready to send");
  for (const item of blockers) w(`     x  ${item}`);
}

// Nested reports last, so the summary above stays readable.
for (const [label, gen] of [["proof.mjs", proof], ["build-wwp.mjs", wwp]]) {
  if (gen.report && !gen.skipped) {
    w();
    w(`   ---- ${label} ----`);
    for (const line of gen.report.split("\n")) w(`   ${line}`);
  }
}

w();
if (blockers.length === 0 && compliance.length === 0) {
  w("  Ready. Paste into Beehiiv as a Custom HTML block.");
} else {
  w("  Draft only. Fix the above before sending.");
}
w();

process.stdout.write(`${html}\n`);
process.exit(blockers.length > 0 || compliance.length > 0 ? 1 : 0);
