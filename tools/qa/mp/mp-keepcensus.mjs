/* ═══ v2.3.6740: WHICH OF THE GAME'S REQUESTS CARRY A VERSION (card KEEP, PR 1) ═══
 *
 * The owner, 2026-11-26: "Keeping pictures a long time or indefinitely will
 * be a big boost how do I do that" -- "Yes do it".  A folder may be kept a
 * year (public/_headers, `immutable`) only once NOTHING asks for a file in it
 * without the version made from its bytes (the card's rule 2: else a changed
 * picture would be kept, old, for a year).  This is the count that rule reads.
 *
 * A phone (390 x 844, dpr 3, touch) in the world's BroTown makes ONE load
 * (recorded from the navigation: the page is reloaded once the listener is
 * on, mp-coldload's way) and ONE short tour:
 *   load     the loading screen, into BroTown, the ground quiet;
 *   land     a walk out to the Flame Fields' first spawn (the monsters' looks
 *            load as you walk: wheelMonsterArt.js);
 *   fight    swings at the nearest monster there;
 *   home     the walk back to where it arrived;
 *   windows  three windows opened and closed (gear, the bro's page, quests).
 * Every request the browser makes for a file of tools/assets/shipped.json
 * (and the sprite bot's .webp twins) is read by tools/assets/versions.mjs
 * classify():
 *   table  its v= is the version made from the file's bytes (none today);
 *   hand   any other query: a hand-kept key (GEAR_VERSION, TRAIT_VER, a
 *          `?v=2.3.1224` written out), the ground's manifest date;
 *   bare   no query: the browser cannot tell a changed file from an old one.
 * A request for no file of the table (the build's own hashed scripts under
 * /assets/, the page, the server, a missing twin's 404) is counted apart.
 *
 * Requests from the page's workers are counted too: the context's own
 * request event (Playwright reports a dedicated worker's fetches there; the
 * ground's pictures, which only the ground worker asks for, are in the list).  A
 * picture asked for twice in one page and handed back from the page's memory
 * is not a request, and is not counted (it costs nothing either way).
 *
 * It is a CENSUS: it fails only when it could not take the count (no world,
 * the tour did not reach the fight, nothing recorded).  The counts are written
 * to docs/plan/census/KEEP-requests.md (KEEP_CENSUS_MD=0 writes none) and
 * tools/qa/mp/out/keepcensus.json (every request).  Later PRs of the card read
 * a folder's `bare` + `hand` falling to 0 here before its `_headers` block.
 *
 *   npm run build && node tools/qa/mp/run.mjs keepcensus
 *
 * Not measured here: what a SECOND load asks of the server.  This box's
 * static server (harness.mjs serveDist) keeps only /world/ground/ as the real
 * host does; the second-load count is honest only once it reads
 * public/_headers (a later part of the card).
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { versionTable, readRows, addressOf, classify, folderOf, KINDS, NONE } from '../../assets/versions.mjs';

export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const FIGHT_MS = 15000;
const LOOKS_MS = 45000;
const REACH_PX = 400;
const SETTLE_MS = 4000;
/* the folders the card keeps (its "Stop after"), first in the table */
const KEPT_FIRST = ['/sprites', '/ui', '/sfx', '/icons', '/world/objects'];
const STAGES = ['load', 'land', 'fight', 'home', 'windows'];

/* the ground quiet: nothing in flight and no piece back for 5 s (mp-membudget's waitGroundQuiet) */
async function waitGroundQuiet(P, ms = 30000) {
  const t0 = Date.now();
  for (;;) {
    const q = await P.page.evaluate(() => {
      const w = window.__btWorldTrial && window.__btWorldTrial.stats;
      return w ? { loading: w.loading, quietMs: w.lastPieceAt ? Math.round(performance.now() - w.lastPieceAt) : null } : null;
    }).catch(() => null);
    if (!q || (q.loading === 0 && (q.quietMs == null || q.quietMs >= 5000)) || Date.now() - t0 >= ms) return Date.now() - t0;
    await P.page.waitForTimeout(500);
  }
}

/* the Wheel's monster looks (__btWheelArt) passing `ok`, at most `ms` (mp-membudget's waitLooks) */
async function waitLooks(P, ok, ms) {
  const t0 = Date.now();
  let a = null;
  while (Date.now() - t0 < ms) {
    a = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null)).catch(() => null);
    if (!a || ok(a)) return a;
    await P.page.waitForTimeout(500);
  }
  return a;
}

const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S || !S.player) return null;
  let m = null, d = Infinity;
  for (const x of S.monsters || []) {
    if (!x || x.alive === false || x.dead) continue;
    const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y);
    if (dd < d) { d = dd; m = { x: x.x, y: x.y, d: dd }; }
  }
  return { px: S.player.x, py: S.player.y, m };
});

/* a finger on an element: touchstart, then touchend (mp-membudget's tapSel) */
const tapSel = (P, sel, id, fx = 0.5, fy = 0.5) => P.page.evaluate(({ sel, id, fx, fy }) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const b = el.getBoundingClientRect(), x = b.left + b.width * fx, y = b.top + b.height * fy;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart'));
  el.dispatchEvent(mk('touchend'));
  return true;
}, { sel, id, fx, fy });

async function stepToward(P, dx, dy, ms) {
  const keys = [];
  if (dy < -12) keys.push('w'); else if (dy > 12) keys.push('s');
  if (dx < -12) keys.push('a'); else if (dx > 12) keys.push('d');
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  for (const k of keys) await P.page.keyboard.up(k);
}

async function fight(P, ms) {
  const t0 = Date.now();
  let swings = 0;
  while (Date.now() - t0 < ms) {
    const s = await near(P).catch(() => null);
    if (!s || !s.m || s.m.d > 900) { await P.page.waitForTimeout(400); continue; }
    if (s.m.d > 70) await stepToward(P, s.m.x - s.px, s.m.y - s.py, Math.min(450, 60 + s.m.d * 1.2));
    else {
      if (await tapSel(P, '[data-joyzone="R"]', 52, 0.5, 0.4)) swings++;
      await P.page.waitForTimeout(220);
    }
  }
  return swings;
}

/* ── the count ── */
function tally(reqs, table, familyOf) {
  const blank = () => ({ n: 0, table: 0, hand: 0, bare: 0, files: new Set() });
  const byFolder = new Map(), byFamily = new Map(), none = new Map(), byStage = new Map();
  const handKeys = new Map(), elsewhere = new Map(), missing = new Map();
  for (const r of reqs) {
    /* another site (the fonts, the catalogue): not the game's to keep */
    if (!r.own) { elsewhere.set(r.host, (elsewhere.get(r.host) || 0) + 1); continue; }
    const c = classify(r.url, table);
    if (!c) continue;
    r.address = c.address; r.kind = c.kind;
    const st = byStage.get(r.stage) || Object.fromEntries([...KINDS, NONE].map((k) => [k, 0]));
    st[c.kind]++;
    byStage.set(r.stage, st);
    if (c.kind === NONE) {
      /* a file that does not ship, answered by the page's fallback (or a 404) */
      const f = folderOf(c.address);
      if (r.missing) { const d = c.address.replace(/[^/]+$/, '*'); missing.set(d, (missing.get(d) || 0) + 1); }
      else none.set(f, (none.get(f) || 0) + 1);
      continue;
    }
    const f = folderOf(c.address);
    const e = byFolder.get(f) || blank();
    e.n++; e[c.kind]++; e.files.add(c.address);
    byFolder.set(f, e);
    const fam = familyOf.get(c.address) || '(a sprite bot twin)';
    const g = byFamily.get(fam) || { ...blank(), folder: f };
    g.n++; g[c.kind]++; g.files.add(c.address);
    byFamily.set(fam, g);
    if (c.kind === 'hand') {
      /* v2.3.6741: the whole query (a stamped address a loader then joined
         its own key to reads 'v=<its own>?v=<key>': the card's PR 3) */
      const q = r.url.includes('?') ? r.url.slice(r.url.indexOf('?') + 1).split('#')[0] : '';
      /* the key's shape, its digits kept only when they name a release */
      const shape = q.replace(/(^|&)lane=[^&]*/, '').replace(new RegExp(`^v=${c.want}\\?`), 'v=<its own>?')
        .replace(/=[0-9a-f]{10}\b(?![.\d])/g, '=<10 hex>');
      const hk = `${f}  ?${shape}`;
      handKeys.set(hk, (handKeys.get(hk) || 0) + 1);
    }
  }
  return { byFolder, byFamily, none, byStage, handKeys, elsewhere, missing };
}

function markdown({ t, reqs, sha, when, swings, reach }) {
  const order = (m) => [...m].sort((a, b) => {
    const ka = KEPT_FIRST.indexOf(a[0]), kb = KEPT_FIRST.indexOf(b[0]);
    if (ka !== kb) return (ka < 0 ? 99 : ka) - (kb < 0 ? 99 : kb);
    return b[1].n - a[1].n;
  });
  const sum = (k) => [...t.byFolder.values()].reduce((s, e) => s + e[k], 0);
  const L = [];
  L.push('# KEEP: which of the game\'s requests carry a version (the census, tag 6740)');
  L.push('');
  L.push(`Card KEEP PR 1 (\`docs/plan/cards/KEEP.md\`). Made by \`tools/qa/mp/mp-keepcensus.mjs\` on ${when}, the build of ${sha}, `
    + 'on the test box (a headless Chromium, a phone 390 x 844 at dpr 3, touch), against this repository\'s own worker and build. '
    + 'Not measured on a phone; the counts are the page\'s requests, which do not depend on the device.');
  L.push('');
  L.push('**The tour:** one load (from the navigation), into BroTown; a walk to the Flame Fields\' first spawn; '
    + `a fight there (${swings} swings, ${reach} px from the spot); home; three windows (gear, the bro's page, quests).`);
  L.push('');
  L.push('**The columns** (`tools/assets/versions.mjs classify`): **table** asks with `v=` equal to the first 10 characters of the file\'s '
    + 'SHA-256 in `tools/assets/shipped.json` (the version this card gives every file); **hand** with any other query (a hand-kept key: '
    + '`GEAR_VERSION`, `TRAIT_VER`, a `?v=2.3.1224` written out, a manifest\'s date); **bare** with none. '
    + 'A folder is kept a year only when its hand + bare is 0 (the card\'s rule 2). "Files" counts distinct addresses.');
  L.push('');
  L.push(`## By folder (${sum('n')} requests for ${[...t.byFolder.values()].reduce((s, e) => s + e.files.size, 0)} files of the table)`);
  L.push('');
  L.push('| folder | requests | files | table | hand | bare | kept by this card |');
  L.push('|---|---:|---:|---:|---:|---:|---|');
  for (const [f, e] of order(t.byFolder)) {
    L.push(`| \`${f}\` | ${e.n} | ${e.files.size} | ${e.table} | ${e.hand} | ${e.bare} | ${KEPT_FIRST.includes(f) ? 'yes' : 'only if easy'} |`);
  }
  L.push(`| **all** | **${sum('n')}** | | **${sum('table')}** | **${sum('hand')}** | **${sum('bare')}** | |`);
  L.push('');
  L.push('## By family (the ranking for PR 3: a family a PR, biggest first)');
  L.push('');
  L.push('The family is the file\'s row in `tools/assets/shipped.json` (`tools/assets/families.mjs`). Sorted by hand + bare.');
  L.push('');
  L.push('| family | folder | requests | files | table | hand | bare |');
  L.push('|---|---|---:|---:|---:|---:|---:|');
  for (const [fam, e] of [...t.byFamily].sort((a, b) => (b[1].hand + b[1].bare) - (a[1].hand + a[1].bare) || b[1].n - a[1].n)) {
    L.push(`| ${fam} | \`${e.folder}\` | ${e.n} | ${e.files.size} | ${e.table} | ${e.hand} | ${e.bare} |`);
  }
  L.push('');
  L.push('## By stage of the tour');
  L.push('');
  L.push('| stage | table | hand | bare | not a file of the table |');
  L.push('|---|---:|---:|---:|---:|');
  for (const s of STAGES) {
    const e = t.byStage.get(s) || {};
    L.push(`| ${s} | ${e.table || 0} | ${e.hand || 0} | ${e.bare || 0} | ${e[NONE] || 0} |`);
  }
  L.push('');
  L.push('## The hand-kept keys seen (the query\'s shape, by folder)');
  L.push('');
  L.push('A `<10 hex>` is a value the shape of this card\'s version that is not the file\'s own. '
    + '`v=<its own>?v=<key>` (v2.3.6741) is an address the build stamped (PR 2) to which a loader then joined its own hand key: '
    + 'that loader is the card\'s PR 3.');
  L.push('');
  L.push('| folder and query | requests |');
  L.push('|---|---:|');
  for (const [k, n] of [...t.handKeys].sort((a, b) => b[1] - a[1]).slice(0, 40)) L.push(`| \`${k.replace(/\|/g, '\\|')}\` | ${n} |`);
  if (t.handKeys.size > 40) L.push(`| (${t.handKeys.size - 40} more shapes) | |`);
  L.push('');
  L.push('## Requests for no file of the table');
  L.push('');
  L.push('The build\'s own scripts and styles (`/assets/`, already named by Vite with their hash and kept a year), the page, '
    + 'the world\'s code under `/tools/` (the ground worker\'s modules), the server\'s `/api/`.');
  L.push('');
  L.push('| folder | requests |');
  L.push('|---|---:|');
  for (const [f, n] of [...t.none].sort((a, b) => b[1] - a[1])) L.push(`| \`${f}\` | ${n} |`);
  L.push('');
  L.push('### Asked for, and not shipped');
  L.push('');
  L.push('Requests for a file that is not in the build: the page\'s fallback (`index.html`) or a 404 answered. '
    + 'A cost on every load, outside this card (its status file\'s Found).');
  L.push('');
  L.push('| folder | requests |');
  L.push('|---|---:|');
  for (const [d, n] of [...t.missing].sort((a, b) => b[1] - a[1])) L.push(`| \`${d}\` | ${n} |`);
  if (!t.missing.size) L.push('| (none) | 0 |');
  L.push('');
  L.push('### Other sites');
  L.push('');
  L.push('Not the game\'s files, not this card\'s (this box reaches no outside site, so they fail here).');
  L.push('');
  L.push('| host | requests |');
  L.push('|---|---:|');
  for (const [h, n] of [...t.elsewhere].sort((a, b) => b[1] - a[1])) L.push(`| ${h} | ${n} |`);
  if (!t.elsewhere.size) L.push('| (none) | 0 |');
  L.push('');
  L.push(`Every request: \`tools/qa/mp/out/keepcensus.json\` (not in the repository; ${reqs.length} rows).`);
  L.push('');
  return L.join('\n');
}

export async function run({ browser, wsPort, webPort, rec }) {
  const table = versionTable();
  const familyOf = new Map(readRows().map((r) => [addressOf(r.path), r.family]));
  const P = await H.newPlayer(browser, { name: 'keepcensus', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  let stage = 'load';
  const reqs = [];
  const byReq = new Map();
  P.ctx.on('request', (q) => {
    const url = q.url();
    const m = /^https?:\/\/([^/]+)/i.exec(url);
    if (!m) return;
    const r = { url: url.slice(m[0].length) || '/', host: m[1], own: /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(m[1]), stage };   /* the build's server and the worker's */
    reqs.push(r);
    byReq.set(q, r);
  });
  /* a file that does not ship: harness.mjs serveDist answers it with index.html (as Pages does), or a 404 */
  P.ctx.on('response', (res) => {
    const r = byReq.get(res.request());
    if (!r) return;
    const type = String(res.headers()['content-type'] || '');
    r.status = res.status();
    r.missing = r.status === 404 || (/text\/html/.test(type) && !/^\/(?:index\.html)?(?:\?|$)/.test(r.url));
  });
  let stopAlive = false;
  try {
    await P.page.reload({ waitUntil: 'domcontentloaded' });
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the world\'s BroTown (guard)', !!ok, ok);
    if (!ok) return;
    const quiet = await waitGroundQuiet(P);
    console.log(`    the ground quiet after ${quiet} ms; ${reqs.length} requests so far`);
    const myId = await H.readState(P, (S) => S.myId);
    /* past the Mayor's gate and untouchable at the fight (mp-membudget's way, v2.3.3644/3656) */
    await H.devOp(wsPort, 'quests', myId).catch(() => null);
    await P.page.evaluate(() => {
      const keep = () => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return;
        if (!R._quests || typeof R._quests !== 'object') R._quests = {};
        if (!R._quests.tut_1) R._quests.tut_1 = true;
      };
      keep();
      window.__kcGateOpen = setInterval(keep, 100);
    });
    (async () => {
      while (!stopAlive) {
        await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 8 }).catch(() => null);
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 4 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    await P.page.waitForTimeout(1500);

    stage = 'land';
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.ember.points[0];
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    await H.glideTo(P, at[0], at[1] + 40);
    const looks = await waitLooks(P, (a) => a.ready > 0 && a.loading === 0, LOOKS_MS);
    const reach = await P.page.evaluate((a) => {
      const S = window._gameState.current;
      return Math.round(Math.hypot(S.player.x - a[0], S.player.y - a[1]));
    }, [at[0], at[1] + 40]);

    stage = 'fight';
    const swings = await fight(P, FIGHT_MS);
    rec.ok(`the tour reached the fight (${reach} px from the Flame Fields' spot, at most ${REACH_PX}; ${looks ? looks.ready : '?'} looks in; ${swings} swings)`,
      reach <= REACH_PX && swings > 0, { reach, swings, looks });

    stage = 'home';
    await H.glideTo(P, home.x, home.y);
    await waitGroundQuiet(P);

    stage = 'windows';
    const opened = [];
    for (const id of ['gear', 'hero', 'quests']) {
      const did = await H.dashOpen(P, id).then(() => true).catch(() => false);
      await P.page.waitForTimeout(SETTLE_MS);
      opened.push(`${id} ${did ? 'opened' : 'NOT opened'}`);
      await H.closeDest(P).catch(() => {});
      await P.page.waitForTimeout(800);
    }
    rec.ok(`three windows opened (${opened.join(', ')})`, opened.every((s) => / opened$/.test(s)), opened);
    await P.page.waitForTimeout(SETTLE_MS);
    stopAlive = true;

    /* ── the count ── */
    const t = tally(reqs, table, familyOf);
    const counted = [...t.byFolder.values()].reduce((s, e) => s + e.n, 0);
    rec.ok(`requests recorded (${reqs.length}; ${counted} for files of the table)`, counted > 0, { reqs: reqs.length });
    console.log('\n    folder                requests  files  table   hand   bare');
    for (const [f, e] of [...t.byFolder].sort((a, b) => b[1].n - a[1].n)) {
      console.log(`    ${f.padEnd(20)} ${String(e.n).padStart(9)} ${String(e.files.size).padStart(6)} ${String(e.table).padStart(6)} ${String(e.hand).padStart(6)} ${String(e.bare).padStart(6)}`);
    }
    const OUT = join(H.REPO, 'tools/qa/mp/out');
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'keepcensus.json'), JSON.stringify({ swings, reach, reqs }, null, 1));
    if (process.env.KEEP_CENSUS_MD !== '0') {
      let sha = '?';
      try { sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: H.REPO, encoding: 'utf8' }).trim(); } catch { /* no git: '?' */ }
      const md = markdown({ t, reqs, sha, when: new Date().toISOString().slice(0, 10), swings, reach });
      writeFileSync(join(H.REPO, 'docs/plan/census/KEEP-requests.md'), md);
      console.log('    written: docs/plan/census/KEEP-requests.md');
    }
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
