#!/usr/bin/env node
/**
 * The review screen. Opens the latest run in a browser so marking keepers is
 * clicking a box, not editing JSON.
 *
 *   node newsletter/news/review.mjs
 *   node newsletter/news/review.mjs --day 2026-09-01
 *   node newsletter/news/review.mjs --port 4400 --no-open
 *
 * Every click writes straight back to the run file — there is no save button
 * and nothing is held in memory. Close the tab when you're done, then:
 *
 *   node newsletter/news/proof.mjs 002 > proof-block.html
 *
 * Binds 127.0.0.1 only. Nothing here is reachable from the network, and the
 * server writes to exactly one file: the run you opened.
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readRun, writeRun, runPath, latestRunPath, escapeHtml, shortDate, die, w } from "./lib.mjs";
import { discoverFeed, evaluateFeed, readSources, writeSources } from "./discover.mjs";

// ------------------------------------------------------------------- args ---

const opts = { port: 4317, open: true, path: null };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (arg === "--no-open") opts.open = false;
  else if (arg === "--port") opts.port = Number(argv[++i]);
  else if (arg.startsWith("--port=")) opts.port = Number(arg.slice(7));
  else if (arg === "--day") opts.path = runPath(argv[++i]);
  else if (arg.startsWith("--day=")) opts.path = runPath(arg.slice(6));
  else die(`Unknown argument "${arg}".`);
}
if (!Number.isFinite(opts.port)) die("--port needs a number.");
if (opts.path && !existsSync(opts.path)) die(`No run file for that day:\n         ${opts.path}`);

const RUN_PATH = opts.path ?? latestRunPath();

// ------------------------------------------------------------------- page ---

const PALETTE = `
  :root{
    --ink:#f5efe4; --muted:#9b9184; --dim:#6f665b;
    --bg:#141414; --card:#1c1a18; --line:#2b241b; --gold:#e0a33c;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:16px/1.55 Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif}
  a{color:var(--gold)}
  header{position:sticky;top:0;z-index:5;background:rgba(20,20,20,.96);
    border-bottom:1px solid var(--line);padding:18px 26px 14px;backdrop-filter:blur(6px)}
  h1{font-family:Georgia,'Playfair Display',serif;font-size:20px;margin:0 0 4px;letter-spacing:.01em}
  .sub{color:var(--muted);font-size:13px}
  .bar{display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap}
  input[type=search]{flex:1;min-width:200px;background:var(--card);border:1px solid var(--line);
    color:var(--ink);border-radius:4px;padding:8px 11px;font-size:14px}
  button{background:var(--card);border:1px solid var(--line);color:var(--muted);
    border-radius:4px;padding:8px 13px;font-size:13px;cursor:pointer}
  button.on{border-color:var(--gold);color:var(--gold)}
  main{padding:22px 26px 120px;max-width:960px;margin:0 auto}
  .item{background:var(--card);border:1px solid var(--line);border-radius:5px;
    padding:16px 18px;margin-bottom:12px;display:grid;grid-template-columns:52px 1fr;gap:14px}
  .item.kept{border-color:var(--gold)}
  .item.hidden{display:none}
  .score{font-size:19px;font-weight:700;color:var(--gold);text-align:center;
    font-variant-numeric:tabular-nums;padding-top:2px}
  .score small{display:block;font-size:10px;color:var(--dim);font-weight:400;
    letter-spacing:.12em;text-transform:uppercase}
  .title{font-size:17px;line-height:1.4;font-weight:600;margin:0 0 5px}
  .title a{text-decoration:none;color:var(--ink)}
  .title a:hover{color:var(--gold)}
  .meta{font-size:12.5px;color:var(--muted);margin-bottom:8px}
  .summary{font-size:14px;color:#cdc3b4;margin:0 0 10px}
  .chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}
  .chip{font-size:11px;color:var(--dim);border:1px solid var(--line);
    border-radius:99px;padding:2px 9px}
  .also{font-size:12px;color:var(--dim);margin-bottom:10px}
  .controls{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;
    border-top:1px solid var(--line);padding-top:11px}
  label.keep{display:flex;gap:7px;align-items:center;font-size:13.5px;
    color:var(--muted);cursor:pointer;user-select:none;white-space:nowrap}
  label.keep input{width:17px;height:17px;accent-color:var(--gold);cursor:pointer}
  .fields{flex:1;min-width:260px;display:flex;flex-direction:column;gap:7px}
  .fields input{width:100%;background:#141210;border:1px solid var(--line);
    color:var(--ink);border-radius:4px;padding:7px 10px;font-size:13.5px}
  .fields input::placeholder{color:var(--dim)}
  .flag{border-color:#7a4a12 !important}
  .warn{font-size:12px;color:#d08a2c;margin-top:2px}
  footer{position:fixed;left:0;right:0;bottom:0;background:rgba(20,20,20,.97);
    border-top:1px solid var(--line);padding:13px 26px;display:flex;
    justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;font-size:13px}
  code{background:#0e0d0c;border:1px solid var(--line);border-radius:3px;
    padding:3px 8px;color:var(--gold);font-size:12.5px}
  .count{color:var(--muted)}
  .saved{color:var(--dim);font-size:12px}

  /* --- Add a feed panel --- */
  details.sources{background:var(--card);border:1px solid var(--line);border-radius:5px;
    margin-bottom:18px}
  details.sources summary{padding:13px 18px;cursor:pointer;font-size:14px;color:var(--muted);
    list-style:none;display:flex;justify-content:space-between;gap:12px;align-items:center}
  details.sources summary::-webkit-details-marker{display:none}
  details.sources summary:hover{color:var(--ink)}
  details.sources[open] summary{border-bottom:1px solid var(--line)}
  .panel{padding:16px 18px}
  .addrow{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
  .addrow input[type=text]{flex:1;min-width:220px;background:#141210;border:1px solid var(--line);
    color:var(--ink);border-radius:4px;padding:9px 11px;font-size:14px}
  .addrow input.narrow{flex:0 0 170px;min-width:120px}
  .addrow select{background:#141210;border:1px solid var(--line);color:var(--ink);
    border-radius:4px;padding:9px 8px;font-size:13px}
  .addrow button.go{border-color:var(--gold);color:var(--gold)}
  .hint{font-size:12px;color:var(--dim);margin-top:9px}
  .report{margin-top:14px;border-top:1px solid var(--line);padding-top:13px;font-size:13.5px;
    display:none}
  .report.show{display:block}
  .report dl{display:grid;grid-template-columns:88px 1fr;gap:3px 12px;margin:0 0 11px}
  .report dt{color:var(--dim);font-size:12.5px}
  .report dd{margin:0;color:var(--ink);word-break:break-word}
  .report .sample{color:#cdc3b4;font-size:13px;padding:2px 0}
  .report .sample b{color:var(--gold);font-variant-numeric:tabular-nums;
    display:inline-block;min-width:34px}
  .report .problem{color:#d08a2c;margin-top:8px}
  .report .good{color:#7fbf7f;margin-top:8px}
  .steps{font-size:12px;color:var(--dim);margin-top:8px;white-space:pre-wrap}
  table.srcs{width:100%;border-collapse:collapse;margin-top:6px;font-size:13px}
  table.srcs td{padding:5px 8px 5px 0;border-bottom:1px solid var(--line);color:var(--muted);
    vertical-align:top}
  table.srcs td.w{color:var(--dim);width:34px;text-align:right}
  table.srcs td.n{color:var(--ink)}
  table.srcs tr.off td.n{color:var(--dim);text-decoration:line-through}
  table.srcs input{accent-color:var(--gold);cursor:pointer}

  /* Triaging on a laptop half-screen or a phone: one column, nothing clipped. */
  @media (max-width:700px){
    header,main,footer{padding-left:14px;padding-right:14px}
    .item{grid-template-columns:1fr;gap:8px;padding:14px}
    .score{text-align:left;padding-top:0}
    .score small{display:inline;margin-left:6px}
    .fields{min-width:0}
    .controls{flex-direction:column;gap:9px}
    footer{font-size:12px;gap:8px}
    footer code{word-break:break-all;white-space:normal}
  }
`;

function renderItem(item) {
  const date = shortDate(item.published);
  const outlet =
    item.publisher && item.publisher !== item.source
      ? `${escapeHtml(item.source)} &middot; ${escapeHtml(item.publisher)}`
      : escapeHtml(item.source);

  const chips = (item.reasons ?? [])
    .slice(0, 6)
    .map((r) => `<span class="chip">${escapeHtml(r)}</span>`)
    .join("");

  const also = (item.alsoIn ?? []).length
    ? `<div class="also">Also covered by ${item.alsoIn
        .map((a) => `<a href="${escapeHtml(a.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(a.source)}</a>`)
        .join(", ")}</div>`
    : "";

  const direct = item.needsDirectLink
    ? `<input class="flag" data-field="directUrl" placeholder="Publisher's own URL — Google's redirect link can't go in an issue"
        value="${escapeHtml(item.directUrl ?? "")}">
       <div class="warn">Aggregator link. Paste the source's real URL or proof.mjs will refuse this one.</div>`
    : "";

  return `
  <article class="item${item.keep ? " kept" : ""}" data-id="${escapeHtml(item.id)}"
    data-text="${escapeHtml(`${item.title} ${item.source} ${item.publisher ?? ""}`.toLowerCase())}">
    <div class="score">${item.score}<small>score</small></div>
    <div>
      <p class="title"><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(item.title)}</a></p>
      <div class="meta">${outlet}${date ? ` &middot; ${date}` : " &middot; undated"}${
        item.host && item.host !== (item.publisher ?? "") ? ` &middot; ${escapeHtml(item.host)}` : ""
      }</div>
      ${item.summary ? `<p class="summary">${escapeHtml(item.summary.slice(0, 260))}${item.summary.length > 260 ? "&hellip;" : ""}</p>` : ""}
      ${chips ? `<div class="chips">${chips}</div>` : ""}
      ${also}
      <div class="controls">
        <label class="keep"><input type="checkbox" data-field="keep" ${item.keep ? "checked" : ""}> Keep</label>
        <div class="fields">
          <input data-field="angle" placeholder="Your angle — the consequence you'll write up. Shorthand is fine."
            value="${escapeHtml(item.angle ?? "")}">
          ${direct}
        </div>
      </div>
    </div>
  </article>`;
}

function renderSourcesPanel() {
  const { sources } = readSources();
  const rows = sources
    .map(
      (s) => `<tr class="${s.enabled === false ? "off" : ""}" data-url="${escapeHtml(s.url)}">
        <td><input type="checkbox" data-src-toggle ${s.enabled === false ? "" : "checked"}></td>
        <td class="w">${s.weight ?? 1}</td>
        <td class="n">${escapeHtml(s.name)}<br><span style="font-size:11.5px;color:var(--dim)">${escapeHtml(s.url)}</span></td>
      </tr>`,
    )
    .join("");

  return `
  <details class="sources">
    <summary><span>Feeds &mdash; ${sources.length} configured</span><span style="color:var(--dim)">add one, or switch one off</span></summary>
    <div class="panel">
      <div class="addrow">
        <input type="text" id="feedUrl" placeholder="https://somedistillery.com  &mdash;  a feed URL or just the site">
        <input type="text" class="narrow" id="feedName" placeholder="Name (optional)">
        <select id="feedWeight">
          <option value="1">weight 1</option>
          <option value="2" selected>weight 2</option>
          <option value="3">weight 3</option>
        </select>
        <button id="checkFeed">Check</button>
        <button id="addFeed" class="go">Add</button>
      </div>
      <div class="hint">Paste a feed, or a plain site address and it will find the feed the way a
        browser does. Check first if you want to see what is in it. A feed with nothing published
        in six months is refused &mdash; most distillery feeds are abandoned.</div>
      <div class="report" id="feedReport"></div>

      <table class="srcs">${rows}</table>
      <div class="hint">Unticking a feed sets <code style="font-size:11.5px">"enabled": false</code>
        in sources.json &mdash; it stops being fetched, the URL is kept. Changes here apply to the
        next fetch, not to the run you are reading.</div>
    </div>
  </details>`;
}

function renderPage(run) {
  const kept = run.items.filter((i) => i.keep).length;
  const failures = (run.failures ?? []).length
    ? `<div class="sub" style="color:#d08a2c">${run.failures
        .map((f) => `${escapeHtml(f.name)} did not answer (${escapeHtml(f.error)})`)
        .join(" &middot; ")}</div>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>News review — ${escapeHtml(run.day)}</title>
<style>${PALETTE}</style>
</head><body>
<header>
  <h1>Proof &amp; Perspective &mdash; news review</h1>
  <div class="sub">${escapeHtml(run.day)} &middot; ${run.items.length} items &middot; ${run.sources?.length ?? 0} sources</div>
  ${failures}
  <div class="bar">
    <input type="search" id="q" placeholder="Filter by headline or outlet&hellip;">
    <button id="keptOnly">Kept only</button>
    <button id="flagged">Needs a direct link</button>
  </div>
</header>
<main>
  ${renderSourcesPanel()}
  <div id="list">
    ${run.items.map(renderItem).join("")}
    ${run.items.length ? "" : '<p class="sub">Nothing in this run. Widen the window: <code>node newsletter/news/fetch.mjs --days 21</code></p>'}
  </div>
</main>
<footer>
  <span class="count"><b id="kept">${kept}</b> kept &mdash; the section budget is 3&ndash;5 Proof bullets</span>
  <span class="saved" id="saved"></span>
  <span>Then: <code>node newsletter/news/proof.mjs 002 &gt; proof-block.html</code></span>
</footer>
<script>
(function () {
  var savedEl = document.getElementById('saved');
  var keptEl = document.getElementById('kept');
  var timers = {};

  function flash(text) {
    savedEl.textContent = text;
    clearTimeout(timers._flash);
    timers._flash = setTimeout(function () { savedEl.textContent = ''; }, 1600);
  }

  function send(id, field, value, article) {
    var body = { id: id };
    body[field] = value;
    fetch('/api/mark', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (!data.ok) { flash('NOT SAVED: ' + (data.error || 'unknown error')); return; }
      keptEl.textContent = data.kept;
      if (field === 'keep') article.classList.toggle('kept', value === true);
      flash('saved');
    }).catch(function (e) { flash('NOT SAVED: ' + e.message); });
  }

  document.getElementById('list').addEventListener('change', function (e) {
    var input = e.target;
    if (input.dataset.field !== 'keep') return;
    var article = input.closest('.item');
    send(article.dataset.id, 'keep', input.checked, article);
  });

  document.getElementById('list').addEventListener('input', function (e) {
    var input = e.target;
    var field = input.dataset.field;
    if (field !== 'angle' && field !== 'directUrl') return;
    var article = input.closest('.item');
    var key = article.dataset.id + field;
    clearTimeout(timers[key]);
    timers[key] = setTimeout(function () {
      send(article.dataset.id, field, input.value, article);
    }, 450);
  });

  // ---- Add a feed panel

  var reportEl = document.getElementById('feedReport');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderReport(data, mode) {
    var html = '';
    if (data.steps && data.steps.length) {
      // Joined with a <br>, not a newline: a "\\n" written here would be
      // consumed by this file's own template literal before the browser sees it.
      html += '<div class="steps">' + data.steps.map(esc).join('<br>') + '</div>';
    }
    if (!data.ok) {
      html += '<div class="problem">' + esc(data.error) + '</div>';
      reportEl.innerHTML = html;
      reportEl.classList.add('show');
      return;
    }
    var r = data.report;
    html += '<dl>' +
      '<dt>feed</dt><dd>' + esc(r.url) + '</dd>' +
      '<dt>name</dt><dd>' + esc(r.name) + (r.nameFromFeed ? ' <span style="color:var(--dim)">(the feed&rsquo;s own title)</span>' : '') + '</dd>' +
      '<dt>items</dt><dd>' + r.total + '</dd>' +
      '<dt>newest</dt><dd>' + (r.newestDays === null ? 'undated' : r.newestDays + ' days ago') + '</dd>' +
      '<dt>on topic</dt><dd>' + r.onTopic + ' of ' + r.total + ' pass the require gate</dd>' +
      '</dl>';
    for (var i = 0; i < r.samples.length; i++) {
      var s = r.samples[i];
      html += '<div class="sample"><b>' + (s.score === null ? '--' : s.score) + '</b> ' + esc(s.title) + '</div>';
    }
    for (var j = 0; j < r.problems.length; j++) {
      html += '<div class="problem">' + esc(r.problems[j]) + '</div>';
    }
    if (data.added) {
      html += '<div class="good">Added. Run <code>node newsletter/news/fetch.mjs</code> to pull it in.</div>';
    } else if (mode === 'add' && r.problems.length) {
      html += '<div class="problem">Not added. Add it anyway from the command line with --force.</div>';
    } else if (mode === 'check' && r.problems.length) {
      html += '<div class="hint">Nothing written. Add will refuse this one — override from the command line with --force.</div>';
    } else if (mode === 'check') {
      html += '<div class="hint">Nothing written — press Add to keep it.</div>';
    }
    reportEl.innerHTML = html;
    reportEl.classList.add('show');
  }

  function submitFeed(mode) {
    var url = document.getElementById('feedUrl').value.trim();
    if (!url) { return; }
    reportEl.innerHTML = '<div class="steps">checking ' + esc(url) + '...</div>';
    reportEl.classList.add('show');
    fetch('/api/source/' + mode, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: url,
        name: document.getElementById('feedName').value.trim(),
        weight: Number(document.getElementById('feedWeight').value)
      })
    }).then(function (r) { return r.json(); }).then(function (data) {
      renderReport(data, mode);
      if (data.added) { flash('feed added'); }
    }).catch(function (e) {
      renderReport({ ok: false, error: e.message }, mode);
    });
  }

  document.getElementById('checkFeed').addEventListener('click', function () { submitFeed('check'); });
  document.getElementById('addFeed').addEventListener('click', function () { submitFeed('add'); });
  document.getElementById('feedUrl').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { submitFeed('check'); }
  });

  document.querySelector('table.srcs').addEventListener('change', function (e) {
    var box = e.target;
    if (!box.hasAttribute('data-src-toggle')) return;
    var row = box.closest('tr');
    fetch('/api/source/toggle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: row.dataset.url, enabled: box.checked })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (!data.ok) { flash('NOT SAVED: ' + data.error); box.checked = !box.checked; return; }
      row.classList.toggle('off', !box.checked);
      flash(box.checked ? 'feed on' : 'feed off');
    }).catch(function (e) { flash('NOT SAVED: ' + e.message); });
  });

  var q = document.getElementById('q');
  var keptBtn = document.getElementById('keptOnly');
  var flagBtn = document.getElementById('flagged');
  var onlyKept = false, onlyFlagged = false;

  function applyFilters() {
    var needle = q.value.trim().toLowerCase();
    var items = document.querySelectorAll('.item');
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var hit = !needle || el.dataset.text.indexOf(needle) !== -1;
      if (onlyKept && !el.classList.contains('kept')) hit = false;
      if (onlyFlagged && !el.querySelector('[data-field="directUrl"]')) hit = false;
      el.classList.toggle('hidden', !hit);
    }
  }

  q.addEventListener('input', applyFilters);
  keptBtn.addEventListener('click', function () {
    onlyKept = !onlyKept; keptBtn.classList.toggle('on', onlyKept); applyFilters();
  });
  flagBtn.addEventListener('click', function () {
    onlyFlagged = !onlyFlagged; flagBtn.classList.toggle('on', onlyFlagged); applyFilters();
  });
})();
</script>
</body></html>`;
}

// ----------------------------------------------------------------- server ---

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e6) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const send = (code, type, body) => {
    res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
    res.end(body);
  };

  if (req.method === "GET" && (req.url === "/" || req.url.startsWith("/?"))) {
    return send(200, "text/html; charset=utf-8", renderPage(readRun(RUN_PATH)));
  }

  if (req.method === "POST" && req.url === "/api/mark") {
    try {
      const patch = JSON.parse(await readBody(req));
      const run = readRun(RUN_PATH);
      const item = run.items.find((i) => i.id === patch.id);
      if (!item) return send(404, "application/json", JSON.stringify({ ok: false, error: "no such item" }));

      if ("keep" in patch) item.keep = patch.keep === true;
      if ("angle" in patch) item.angle = String(patch.angle).slice(0, 500);
      if ("directUrl" in patch) item.directUrl = String(patch.directUrl).trim().slice(0, 500);

      // Read-modify-write on every keystroke-batch. One reviewer, one file —
      // the cost is a few KB of I/O and the payoff is no unsaved state.
      writeRun(RUN_PATH, run);
      const kept = run.items.filter((i) => i.keep).length;
      return send(200, "application/json", JSON.stringify({ ok: true, kept }));
    } catch (error) {
      return send(400, "application/json", JSON.stringify({ ok: false, error: error.message }));
    }
  }

  // Add a feed: /api/source/check inspects, /api/source/add inspects and keeps.
  // Same discover.mjs the command uses, so the two cannot disagree.
  if (req.method === "POST" && (req.url === "/api/source/check" || req.url === "/api/source/add")) {
    const mode = req.url.endsWith("/add") ? "add" : "check";
    const steps = [];
    try {
      const body = JSON.parse(await readBody(req));
      const url = String(body.url ?? "").trim();
      if (!url) return send(400, "application/json", JSON.stringify({ ok: false, error: "No URL given.", steps }));

      const weight = [1, 2, 3].includes(Number(body.weight)) ? Number(body.weight) : 2;
      const name = String(body.name ?? "").trim() || null;

      const feed = await discoverFeed(url, (step) => steps.push(step));
      if (!feed) {
        return send(200, "application/json", JSON.stringify({
          ok: false, steps,
          error:
            "No feed found. Tried the URL itself, any <link rel=\"alternate\"> it declares, " +
            "and the usual paths. Plenty of sites have none — Buffalo Trace, Heaven Hill, " +
            "Four Roses and Maker's Mark included. Those brands announce on PR Newswire.",
        }));
      }

      const config = readSources();
      const existing = config.sources.find((s) => s.url === feed.url);
      if (existing) {
        return send(200, "application/json", JSON.stringify({
          ok: false, steps, error: `Already a source: "${existing.name}"`,
        }));
      }

      const report = evaluateFeed(feed, { name });
      let added = false;
      if (mode === "add" && !report.problems.length) {
        config.sources.push({ name: report.name, url: report.url, weight });
        writeSources(config);
        added = true;
      }
      return send(200, "application/json", JSON.stringify({ ok: true, steps, report, added }));
    } catch (error) {
      return send(400, "application/json", JSON.stringify({ ok: false, steps, error: error.message }));
    }
  }

  if (req.method === "POST" && req.url === "/api/source/toggle") {
    try {
      const body = JSON.parse(await readBody(req));
      const config = readSources();
      const source = config.sources.find((s) => s.url === body.url);
      if (!source) return send(404, "application/json", JSON.stringify({ ok: false, error: "no such source" }));
      if (body.enabled === true) delete source.enabled;
      else source.enabled = false;
      writeSources(config);
      return send(200, "application/json", JSON.stringify({ ok: true }));
    } catch (error) {
      return send(400, "application/json", JSON.stringify({ ok: false, error: error.message }));
    }
  }

  send(404, "text/plain", "not found");
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    die(`Port ${opts.port} is busy — another review server is probably already open.\n` +
        `         Close it, or: node newsletter/news/review.mjs --port ${opts.port + 1}`);
  }
  die(error.message);
});

server.listen(opts.port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${opts.port}/`;
  const run = readRun(RUN_PATH);
  w();
  w(`  Reviewing ${run.day} — ${run.items.length} items, ${run.items.filter((i) => i.keep).length} kept`);
  w(`  ${RUN_PATH}`);
  w();
  w(`  ${url}`);
  w(`  Marks save as you click. Ctrl-C when you're done.`);
  w();

  if (opts.open) {
    const cmd = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin" ? ["open", [url]]
      : ["xdg-open", [url]];
    try {
      spawn(cmd[0], cmd[1], { stdio: "ignore", detached: true }).unref();
    } catch {
      /* the URL is printed above; opening a browser is a convenience, not the feature */
    }
  }
});
