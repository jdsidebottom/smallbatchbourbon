#!/usr/bin/env node
/**
 * Builds the "What We'd Pay" block for a Proof & Perspective issue.
 *
 *   node newsletter/build-wwp.mjs 002
 *   node newsletter/build-wwp.mjs newsletter/issues/002.wwp.json
 *   node newsletter/build-wwp.mjs 002 > block.html
 *
 * The database is the default, never the authority. Every field in the
 * sidecar's `overrides` wins; every field left out is pulled live. The
 * provenance report on stderr says which was which, so a stale override
 * cannot sit in an issue unnoticed.
 *
 * Reads go through the publishable key, so RLS decides what comes back —
 * an unpublished bottle is simply not found. This script never writes to
 * the database: a number typed for one issue must not become the site's
 * number.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

// ---------------------------------------------------------------- reporting --

const notes = [];
const warnings = [];
const provenance = [];

/** Set from the sidecar before any merging, so the report can distinguish a
 *  field that was read from the database from one that was simply never set. */
let MODE = "merge";

const record = (field, origin, value) => provenance.push({ field, origin, value });
const warn = (msg) => warnings.push(msg);

function die(msg) {
  console.error(`\n  ERROR  ${msg}\n`);
  process.exit(1);
}

// ------------------------------------------------------------------- env ----

/** Minimal .env.local reader. Avoids adding dotenv for a build-time script. */
function loadEnvLocal() {
  const path = join(REPO, ".env.local");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// ------------------------------------------------------------- formatting ---

function money(cents) {
  if (cents === null || cents === undefined) return null;
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** "100 proof · 7 year · Kentucky Straight Bourbon" — omits what we don't know. */
function buildSubline(bottle) {
  const parts = [];
  if (bottle.proof != null) parts.push(`${Number(bottle.proof)} proof`);
  if (bottle.has_age_statement && bottle.age_years != null) {
    parts.push(`${Number(bottle.age_years)} year`);
  } else if (bottle.has_age_statement === false) {
    parts.push("no age statement");
  }
  if (bottle.classification) parts.push(bottle.classification);
  return parts.join(" &middot; ");
}

function formatVerifiedDate(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ------------------------------------------------------------------ input ---

function resolveSidecarPath(arg) {
  if (!arg) {
    die(
      "No issue given.\n         Usage: node newsletter/build-wwp.mjs 002\n" +
        "                node newsletter/build-wwp.mjs newsletter/issues/002.wwp.json",
    );
  }
  const direct = resolve(process.cwd(), arg);
  if (existsSync(direct)) return direct;
  const byNumber = join(HERE, "issues", `${arg}.wwp.json`);
  if (existsSync(byNumber)) return byNumber;
  die(`No sidecar found. Looked for:\n           ${direct}\n           ${byNumber}`);
}

function readSidecar(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    die(`Sidecar is not valid JSON:\n           ${path}\n           ${error.message}`);
  }
  const overrides = parsed.overrides ?? {};
  const mode = parsed.mode ?? (parsed.slug ? "merge" : "manual");
  if (mode !== "manual" && mode !== "merge") {
    die(`Unknown mode "${mode}". Use "merge" (default) or "manual".`);
  }
  if (mode === "merge" && !parsed.slug) {
    die('Sidecar has no "slug". Add one, or set "mode": "manual" to write the block by hand.');
  }
  return { ...parsed, mode, overrides };
}

// --------------------------------------------------------------- database ---

const BOTTLE_QUERY = `
  slug, name, classification, proof, has_age_statement, age_years,
  brands ( name ),
  bottle_prices (
    msrp_cents, msrp_source_url, msrp_verified_at,
    steal_max_cents, buy_max_cents, fair_max_cents, maybe_max_cents,
    editorial_note
  )
`;

async function fetchBottle(slug) {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    die(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set.\n" +
        "         Add them to .env.local, or run with mode \"manual\".",
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("bottles")
    .select(BOTTLE_QUERY)
    .eq("slug", slug)
    .maybeSingle();

  if (error) die(`Supabase read failed: ${error.message}`);
  if (!data) {
    die(
      `No published bottle with slug "${slug}".\n` +
        "         Reads use the publishable key, so a draft bottle is invisible here.\n" +
        "         Publish it, fix the slug, or use \"mode\": \"manual\".",
    );
  }

  // Embedded one-to-one relations come back as an object or a single-element array
  // depending on how PostgREST infers the relationship. Normalise both.
  const price = Array.isArray(data.bottle_prices) ? data.bottle_prices[0] : data.bottle_prices;
  const brand = Array.isArray(data.brands) ? data.brands[0] : data.brands;
  if (!price) {
    warn(
      `"${slug}" has no row in bottle_prices — there is no What We'd Pay figure to pull. ` +
        "Every number below must come from overrides.",
    );
  }
  return { ...data, brand, price: price ?? null };
}

// ----------------------------------------------------------------- merge ----

/**
 * Database value is the default; an override wins and is reported as such.
 * When both exist and disagree, that is drift worth surfacing — the admin may
 * have moved underneath an override written weeks ago.
 */
function pick(field, overrideValue, dbValue, { compareLabel } = {}) {
  const hasOverride = overrideValue !== undefined && overrideValue !== null && overrideValue !== "";
  if (!hasOverride) {
    record(field, MODE === "manual" ? "unset" : "pulled", dbValue ?? "—");
    return dbValue ?? null;
  }
  if (dbValue !== null && dbValue !== undefined && String(overrideValue) !== String(dbValue)) {
    warn(
      `DRIFT — ${field}: you override "${overrideValue}", the database now says ` +
        `"${dbValue}"${compareLabel ? ` (${compareLabel})` : ""}. Your override is being used.`,
    );
  }
  record(field, "overridden", overrideValue);
  return overrideValue;
}

function buildModel(sidecar, bottle) {
  const o = sidecar.overrides;
  const price = bottle?.price ?? null;

  // Brand + bottle name, unless the bottle name already carries the brand
  // ("Buffalo Trace" + "Buffalo Trace Kentucky Straight"). Editorial naming is
  // inconsistent enough that this only catches the obvious case — `headline` is
  // overridable precisely because no rule gets every bottle right.
  const brandName = bottle?.brand?.name ?? null;
  const dbName = bottle
    ? brandName && !bottle.name.toLowerCase().startsWith(brandName.toLowerCase())
      ? `${brandName} ${bottle.name}`.trim()
      : bottle.name
    : null;

  const headline = pick("headline", o.headline, dbName);
  const subline = pick("subline", o.subline, bottle ? buildSubline(bottle) : null);
  const msrp = pick("msrp", o.msrp, money(price?.msrp_cents ?? null));
  const steal = pick("stealUnder", o.stealUnder, money(price?.steal_max_cents ?? null));
  const wedPay = pick(
    "wedPay",
    o.wedPay,
    money(price?.buy_max_cents ?? null),
    { compareLabel: "buy_max_cents — the site's What We'd Pay figure" },
  );
  const fair = pick("fairUnder", o.fairUnder, money(price?.fair_max_cents ?? null));
  const maybe = pick("maybeUnder", o.maybeUnder, money(price?.maybe_max_cents ?? null));
  const note = pick("note", o.note, price?.editorial_note ?? null);

  // Provenance for MSRP. The schema (bottle_prices_msrp_sourced) refuses an
  // MSRP without a source and a verified date, so a pulled figure always has
  // one. An overridden figure describes a different number, and the database's
  // source no longer applies to it.
  let msrpNote;
  if (o.msrp) {
    if (o.msrpSource) {
      msrpNote = pick("msrpSource", o.msrpSource, null);
    } else {
      msrpNote = "source not recorded";
      warn(
        "UNSOURCED — you override msrp but gave no msrpSource. The database's source " +
          "describes its number, not yours. Add \"msrpSource\" or cut the MSRP line.",
      );
    }
  } else {
    const verified = formatVerifiedDate(price?.msrp_verified_at);
    msrpNote = verified ? `verified ${verified}` : null;
    record("msrpSource", MODE === "manual" ? "unset" : "pulled", msrpNote ?? "—");
  }

  const url = pick(
    "url",
    o.url,
    bottle ? `https://smallbatchbourbon.com/bottles/${bottle.slug}` : null,
  );

  if (!wedPay) {
    warn("No What We'd Pay figure — set \"wedPay\" in overrides or the block will read \"—\".");
  }

  return { headline, subline, msrp, msrpNote, steal, wedPay, fair, maybe, note, url };
}

// ------------------------------------------------------------------ render --

function renderLadder(m) {
  const rungs = [
    m.steal ? `Steal &le;&nbsp;${escapeHtml(m.steal)}` : null,
    m.wedPay ? `Buy &le;&nbsp;${escapeHtml(m.wedPay)}` : null,
    m.fair ? `Fair &le;&nbsp;${escapeHtml(m.fair)}` : null,
    m.maybe ? `Maybe &le;&nbsp;${escapeHtml(m.maybe)}` : null,
  ].filter(Boolean);
  if (rungs.length === 0) return "";
  return `${rungs.join(" &nbsp;&middot;&nbsp; ")} &nbsp;&middot;&nbsp; above that, walk away`;
}

function render(m) {
  const dash = "&mdash;";
  const ladder = renderLadder(m);

  // Palette and type follow newsletter/BRAND_GUIDE.md. Bourbon Amber #B0642E
  // carries only the large price figure and rules — it fails AA at body sizes
  // on both grounds. See README, "Palette, and where the brand amber cannot go".
  return `<!-- What We'd Pay — generated by newsletter/build-wwp.mjs. Edit the sidecar, not this. -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0E0E0E;border-radius:4px;">
  <tr>
    <td style="padding:24px 26px 18px;">
      <div style="font-family:Oswald,'Arial Narrow',Arial,Helvetica,sans-serif;font-size:12px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#8E9190;padding-bottom:10px;">What We&rsquo;d Pay</div>
      <div style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:26px;line-height:32px;color:#F4EFE5;font-weight:600;">${escapeHtml(m.headline ?? dash)}</div>
      <div style="font-family:Inter,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#8E9190;padding-top:4px;">${m.subline ?? ""}</div>
    </td>
  </tr>
  <tr>
    <td style="padding:0 26px 6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="sbb-price-cell" width="50%" style="font-family:Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#8E9190;padding:12px 0 4px;border-top:1px solid #2A2A2A;">MSRP</td>
          <td class="sbb-price-cell" width="50%" style="font-family:Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#8E9190;padding:12px 0 4px;border-top:1px solid #2A2A2A;">We&rsquo;d pay up to</td>
        </tr>
        <tr>
          <td class="sbb-price-cell" valign="top" style="font-family:Oswald,'Arial Narrow',Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;color:#F4EFE5;font-weight:700;padding-bottom:4px;">${escapeHtml(m.msrp ?? dash)}</td>
          <td class="sbb-price-cell" valign="top" style="font-family:Oswald,'Arial Narrow',Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;color:#B0642E;font-weight:700;padding-bottom:4px;">${escapeHtml(m.wedPay ?? dash)}</td>
        </tr>
        <tr>
          <td class="sbb-price-cell" style="font-family:Inter,Helvetica,Arial,sans-serif;font-size:11px;line-height:17px;color:#8E9190;padding-bottom:14px;">${m.msrpNote ? escapeHtml(m.msrpNote) : ""}</td>
          <td class="sbb-price-cell" style="font-family:Inter,Helvetica,Arial,sans-serif;font-size:11px;line-height:17px;color:#8E9190;padding-bottom:14px;">top of our Buy band</td>
        </tr>
      </table>
    </td>
  </tr>${
    ladder
      ? `
  <tr>
    <td style="padding:0 26px 4px;">
      <div style="font-family:Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:20px;color:#8E9190;border-top:1px solid #2A2A2A;padding-top:12px;">${ladder}</div>
    </td>
  </tr>`
      : ""
  }
  <tr>
    <td style="padding:14px 26px 24px;">
      <div style="font-family:Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:25px;color:#D8D3C9;">${m.note ? escapeHtml(m.note) : ""}</div>${
        m.url
          ? `
      <div style="padding-top:14px;"><a href="${escapeHtml(m.url)}" style="font-family:Inter,Helvetica,Arial,sans-serif;font-size:14px;color:#F4EFE5;text-decoration:underline;">See the full breakdown &rarr;</a></div>`
          : ""
      }
    </td>
  </tr>
</table>`;
}

// ------------------------------------------------------------------- main ---

function printReport(sidecarPath, sidecar) {
  const w = (s) => process.stderr.write(`${s}\n`);
  w("");
  w(`  Proof & Perspective — What We'd Pay`);
  w(`  sidecar  ${sidecarPath}`);
  w(`  mode     ${sidecar.mode}${sidecar.slug ? `  (slug: ${sidecar.slug})` : ""}`);
  w("");
  const width = Math.max(...provenance.map((p) => p.field.length), 8);
  const TAG = { overridden: "OVERRIDDEN", pulled: "pulled    ", unset: "unset     " };
  for (const { field, origin, value } of provenance) {
    const tag = TAG[origin];
    const shown = String(value).length > 58 ? `${String(value).slice(0, 55)}...` : value;
    w(`  ${field.padEnd(width)}  ${tag}  ${shown}`);
  }
  if (notes.length) {
    w("");
    for (const n of notes) w(`  note   ${n}`);
  }
  if (warnings.length) {
    w("");
    for (const warning of warnings) w(`  !  ${warning}`);
  }
  w("");
}

async function main() {
  const sidecarPath = resolveSidecarPath(process.argv[2]);
  const sidecar = readSidecar(sidecarPath);
  MODE = sidecar.mode;

  let bottle = null;
  if (sidecar.mode === "merge") {
    bottle = await fetchBottle(sidecar.slug);
  } else {
    notes.push("mode is \"manual\" — nothing was read from the database.");
  }

  const model = buildModel(sidecar, bottle);
  printReport(sidecarPath, sidecar);
  process.stdout.write(`${render(model)}\n`);
}

main().catch((error) => die(error?.stack ?? String(error)));
