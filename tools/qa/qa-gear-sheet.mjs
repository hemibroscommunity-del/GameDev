/* ═══ QA: paper-doll gear contact-sheet generator (v2.3.1195) ═══
 *
 * NOT a pass/fail gate — a human-review tool for hand-authored armor art.
 * Boots the game like qa-smoke.mjs, iterates every equippable piece in
 * GEAR_CATALOG (src/rendering/gearCatalog.js — the single source of truth,
 * nothing hardcoded here), drives the local player through every
 * pose x facing the renderer supports, screenshots a tight crop around the
 * player for each combo, and composites the crops into one labeled PNG
 * contact sheet per gear config.  A cell showing the BARE body is itself
 * signal: that (pose, facing) has no gear sheet on disk yet.
 *
 * Usage:
 *   npm run build && npm run preview          # client at :4173
 *   cd server && npx wrangler dev --port 8787 # local worker (optional; the
 *                                             # default is the prod worker)
 *   QA_WS_URL=ws://127.0.0.1:8787 node tools/qa/qa-gear-sheet.mjs
 *   (or: npm run qa:gear-sheet)
 *
 * Output:  tools/qa/out/gear-sheets/<n>-<config>.png   (one per gear config)
 *
 * Flags:
 *   --dry-run             list planned configs/poses/shot count, no browser
 *                         (works without node_modules — playwright-core is
 *                         lazy-imported only when actually capturing)
 *   --include-variants    include catalog items flagged as color variants
 *                         (item.variant / item.variantOf); skipped by default
 *                         to keep runtime bounded as the catalog grows
 *   --max-configs=N       hard cap on gear configs (default 12)
 *   --slots=chest,legs    only solo-piece configs for these slots
 *   --poses=idle,jog,...  subset of idle,jog,sword,bow,fish,mine
 *   --crop=WxH            crop size around the player (default 200x240)
 *   --keep-crops          also write each raw crop PNG next to the sheets
 *   --url=...             client URL (default http://localhost:4173/)
 *
 * Env (same as the other harnesses): QA_WS_URL points the client at a local
 * worker; QA_CHROME overrides the browser binary (fallback order: QA_CHROME >
 * /tmp chrome-headless-shell > /opt/pw-browsers/chromium > playwright-managed).
 *
 * Deliberately NOT wired into CI or run-all.mjs (excluded there) — output
 * needs human eyes, and a full run is ~30 shots per gear config.
 *
 * How poses are forged (all client-render-side state, no combat triggered;
 * mirrors qa-fishing.mjs / qa-mining.mjs which forge S._extraction the same
 * way):
 *   idle   S._facingAngle = <sector angle>, player parked        (8 facings)
 *   jog    real keyboard hold (w/a/s/d + diagonals), qa-smoke's
 *          input path; facing derives from velocity              (8 facings)
 *   sword  S.isSwinging + S.swingTimer pinned mid-swing via
 *          setInterval so the 300ms window never lapses;
 *          sheet picked by dominant axis of S._aimAngle          (4 facings)
 *   bow    S._bowShotAt/_bowShotAng pinned mid-shot (360ms win)  (8 facings)
 *   fish   forged S._extraction {skill:'fishing'} + node         (south only)
 *   mine   forged S._extraction {skill:'mining'} + ore node,
 *          player offset per qa-mining so the vein overdraws
 *          the sheet's baked rock                                (south only)
 *
 * Compositing is zero-dependency: crops are embedded as data-URL <img>s in a
 * generated HTML grid page rendered in the SAME browser and screenshotted
 * fullPage (node-canvas is not available in this repo's toolchain).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GEAR_CATALOG, GEAR_SLOTS } from '../../src/rendering/gearCatalog.js';

const VERSION = 'v2.3.1195';
const HERE = dirname(fileURLToPath(import.meta.url));

/* ── CLI ─────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const flag = (name) => argv.includes('--' + name);
const opt = (name, def) => {
  const hit = argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.split('=').slice(1).join('=') : def;
};
const DRY = flag('dry-run');
const INCLUDE_VARIANTS = flag('include-variants');
const KEEP_CROPS = flag('keep-crops');
const MAX_CONFIGS = Math.max(1, parseInt(opt('max-configs', '12'), 10) || 12);
const SLOT_FILTER = opt('slots', '') ? opt('slots', '').split(',') : null;
const POSE_FILTER = opt('poses', '') ? opt('poses', '').split(',') : null;
const [CROP_W, CROP_H] = (opt('crop', '200x240').match(/^(\d+)x(\d+)$/) || [0, 200, 240]).slice(1).map(Number);
const URL = opt('url', 'http://localhost:4173/');
const OUT_DIR = opt('out', join(HERE, 'out', 'gear-sheets'));

/* ── facing/pose tables (must mirror entityRenderer.js SECTORS: index i is
      angle i*45deg with +y = down/south) ──────────────────────────────── */
const SECTORS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
const ANGLE = Object.fromEntries(SECTORS.map((f, i) => [f, i * (Math.PI / 4)]));
const FACINGS8 = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
/* jog keys — same real input path qa-smoke drives */
const KEYS = {
  north: ['w'], northeast: ['w', 'd'], east: ['d'], southeast: ['s', 'd'],
  south: ['s'], southwest: ['s', 'a'], west: ['a'], northwest: ['w', 'a'],
};
const POSES = [
  { id: 'idle',  label: 'Idle (stand)',       facings: FACINGS8 },
  { id: 'jog',   label: 'Walk / jog',         facings: FACINGS8 },
  /* sword-swing sheets are picked by DOMINANT AXIS (entityRenderer v2.3.936):
     4 sheets cover all aims, so 4 cells is full coverage. */
  { id: 'sword', label: 'Sword swing',        facings: ['north', 'east', 'south', 'west'] },
  { id: 'bow',   label: 'Bow shot',           facings: FACINGS8 },
  /* fishing + mining lock facing south (entityRenderer v2.3.843/854). */
  { id: 'fish',  label: 'Fishing',            facings: ['south'] },
  { id: 'mine',  label: 'Mining',             facings: ['south'] },
].filter((p) => !POSE_FILTER || POSE_FILTER.includes(p.id));

/* ── gear configs from the live catalog (grows automatically) ─────────── */
/* Color variants: skipped unless --include-variants.  A catalog item is a
   variant when it carries `variant` or `variantOf` (the convention new
   recolors should adopt; base pieces carry neither). */
const isVariant = (item) => !!(item.variant || item.variantOf);
function buildConfigs() {
  const noneAll = Object.fromEntries(GEAR_SLOTS.map((s) => [s, 'none']));
  const configs = [{ name: 'bare', label: 'Bare body (no gear)', equips: { ...noneAll } }];
  const firstPer = {};
  let skippedVariants = 0;
  for (const slot of GEAR_SLOTS) {
    if (SLOT_FILTER && !SLOT_FILTER.includes(slot)) continue;
    for (const item of GEAR_CATALOG[slot] || []) {
      if (item.id === 'none') continue;
      if (!INCLUDE_VARIANTS && isVariant(item)) { skippedVariants++; continue; }
      configs.push({
        name: slot + '-' + item.id,
        label: `${item.name} — ${slot}/${item.id}`,
        equips: { ...noneAll, [slot]: item.id },
      });
      if (!firstPer[slot]) firstPer[slot] = item.id;
    }
  }
  if (Object.keys(firstPer).length >= 2) {
    configs.push({
      name: 'full-set',
      label: 'Full set (' + Object.entries(firstPer).map(([s, i]) => s + ':' + i).join(', ') + ')',
      equips: { ...noneAll, ...firstPer },
    });
  }
  let truncated = 0;
  if (configs.length > MAX_CONFIGS) { truncated = configs.length - MAX_CONFIGS; configs.length = MAX_CONFIGS; }
  return { configs, skippedVariants, truncated };
}

const { configs, skippedVariants, truncated } = buildConfigs();
const shotsPerConfig = POSES.reduce((n, p) => n + p.facings.length, 0);
console.log(`[gear-sheet ${VERSION}] ${configs.length} gear config(s) x ${shotsPerConfig} shots = ${configs.length * shotsPerConfig} crops`);
if (skippedVariants) console.log(`  (skipped ${skippedVariants} color variant(s); pass --include-variants to add them)`);
if (truncated) console.log(`  (TRUNCATED ${truncated} config(s) by --max-configs=${MAX_CONFIGS})`);
for (const c of configs) console.log('  -', c.name.padEnd(24), Object.entries(c.equips).filter(([, v]) => v !== 'none').map(([s, v]) => s + '=' + v).join(' ') || '(all none)');
console.log('  poses:', POSES.map((p) => `${p.id}(${p.facings.length})`).join(' '));
if (DRY) { console.log('dry-run: no browser launched.'); process.exit(0); }

/* ── browser boot (same pattern as qa-smoke.mjs) ─────────────────────── */
const { chromium } = await import('playwright-core');
const { legacyLogin } = await import('./legacy-login.mjs');
const SHELL = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const PWCHROME = '/opt/pw-browsers/chromium';
const EXE = process.env.QA_CHROME || (existsSync(SHELL) ? SHELL : (existsSync(PWCHROME) ? PWCHROME : undefined));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEW = { width: 844, height: 390 }; // iPhone-ish landscape, like qa-smoke

const browser = await chromium.launch({
  executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio', '--ignore-certificate-errors'],
});
const page = await browser.newPage({ viewport: VIEW });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e.message).slice(0, 160)));
if (process.env.QA_WS_URL) {
  await page.addInitScript(`window.BROTOWN_WS_URL = ${JSON.stringify(process.env.QA_WS_URL)};`);
}
/* nodebug=1 keeps the floating debug button out of frame (window.debug —
   which carries the `gear` equip command — is exposed unconditionally). */
await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'noresume=1&nodebug=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(7000);
/* v2.3.1964: the splash has no name box — it has a login door.
   legacyLogin takes the same route a player takes (see
   tools/qa/legacy-login.mjs for what broke and when). */
try {
  await legacyLogin(page, 'GearQA');
} catch (e) { console.log('login flow issue:', e.message); }

let joined = false;
for (let i = 0; i < 60 && !joined; i++) {
  joined = await page.evaluate(() => !!(window._gameState?.current?.player?.x != null)).catch(() => false);
  if (!joined) await sleep(1000);
}
if (!joined) { console.error('FAILED TO JOIN — is the preview server (and worker) up?'); await browser.close(); process.exit(1); }
await sleep(2500);
try { await page.locator('canvas').first().click({ position: { x: 420, y: 195 }, timeout: 2000 }); } catch (e) { /* unlock tap best-effort */ }
console.log('joined; capturing…');

/* ── in-page pose helpers ────────────────────────────────────────────── */
/* Park the player at the zone centre and zero motion (qa-camera pattern —
   client position is what the local renderer draws; 768,768 = centre of the
   48x32px-tile town map). */
const recenter = () => page.evaluate(() => {
  const S = window._gameState.current;
  S.player.x = 768; S.player.y = 768; S.player.vx = 0; S.player.vy = 0;
  S.stickX = 0; S.stickY = 0;
});
const setFacing = (ang) => page.evaluate((a) => {
  const S = window._gameState.current;
  S._facingAngle = a; S._aimAngle = null; S._lastAimAngle = null;
}, ang);
/* Pin a timestamp-windowed pose (sword 300ms / bow 360ms) mid-window every
   40ms so it holds however long the sheet fetch + screenshot take. */
const pinPose = (kind, ang) => page.evaluate(({ kind, ang }) => {
  const S = window._gameState.current;
  if (window.__qaPosePin) clearInterval(window.__qaPosePin);
  S._facingAngle = ang;
  window.__qaPosePin = setInterval(() => {
    if (kind === 'sword') {
      S.isSwinging = true; S.swingTimer = Date.now() - 150;
      S._aimAngle = ang; S._lastAimAngle = ang;
    } else {
      S._bowShotAt = Date.now() - 180; S._bowShotAng = ang;
      S._aimAngle = ang; S._lastAimAngle = ang;
    }
  }, 40);
}, { kind, ang });
const unpinPose = () => page.evaluate(() => {
  const S = window._gameState.current;
  if (window.__qaPosePin) { clearInterval(window.__qaPosePin); window.__qaPosePin = null; }
  S.isSwinging = false; S.swingTimer = 0;
  S._bowShotAt = 0; S._bowShotAng = null;
  S._aimAngle = null; S._lastAimAngle = null;
});
/* Forged extraction — verbatim node shapes from qa-fishing.mjs / qa-mining.mjs. */
const startExtraction = (skill) => page.evaluate((sk) => {
  const S = window._gameState.current;
  const P = S.player;
  const node = sk === 'fishing'
    ? { id: 'qa-fish', x: P.x, y: P.y + 10, alive: true, nodeType: 'fishSpot', skill: 'fishing', gatherLvl: 1, hp: 2, maxHp: 2, respawnTime: 30000, name: 'QA Pool', resourceType: 'fish' }
    : { id: 'qa-ore', x: P.x, y: P.y, alive: true, nodeType: 'oreVein', skill: 'mining', gatherLvl: 1, hp: 3, maxHp: 3, respawnTime: 30000, name: 'V', baseName: 'Copper Ore', resourceType: 'ore', color: '#b08050', _tier: { streakColor: '#b08050' }, _tierIdx: 0 };
  S.gatherNodes = [node];
  if (sk === 'mining') { P.x = node.x - 7; P.y = node.y - 86; P.vx = 0; P.vy = 0; }
  const now = Date.now();
  S._extraction = { nodeId: node.id, nodeRef: node, skill: sk, startedAt: now, windowOpensAt: now - 100, windowClosesAt: now + 9e9, status: 'ready', progress: 0, reps: 0, repsTarget: 3, swipeSamples: [] };
}, skill);
const stopExtraction = () => page.evaluate(() => {
  const S = window._gameState.current;
  S._extraction = null; S.gatherNodes = [];
});

/* Tight crop around the player, computed from live state at shot time
   (S.camera = viewport top-left in world coords, 1 world px = 1 CSS px —
   see qa-camera.mjs). */
async function cropShot() {
  const p = await page.evaluate(() => {
    const S = window._gameState.current;
    const r = document.querySelector('canvas').getBoundingClientRect();
    return { x: r.left + (S.player.x - S.camera.x), y: r.top + (S.player.y - S.camera.y) };
  });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const clip = {
    x: clamp(Math.round(p.x - CROP_W / 2), 0, VIEW.width - CROP_W),
    /* bias the window upward: heads/weapons extend above the anchor more
       than feet extend below */
    y: clamp(Math.round(p.y - CROP_H * 0.6), 0, VIEW.height - CROP_H),
    width: CROP_W, height: CROP_H,
  };
  return page.screenshot({ clip });
}

/* ── equip a gear config via the same debug command the in-game console
      uses (GameApp.jsx `gear` cmd -> gearCatalog.setEquip; the renderer
      lazy-loads the new sheets on the next frame) ─────────────────────── */
async function applyEquips(equips) {
  const applied = await page.evaluate((eq) => {
    for (const [slot, id] of Object.entries(eq)) window.debug.runCmd('gear ' + slot + ' ' + id);
    const out = {};
    for (const slot of Object.keys(eq)) out[slot] = localStorage.getItem('bt-gear-v2-' + slot);
    return out;
  }, equips);
  for (const [slot, want] of Object.entries(equips)) {
    if ((applied[slot] || 'none') !== want && !(want === 'none' && applied[slot] == null)) {
      console.log(`  WARN equip ${slot}=${want} did not stick (store says ${applied[slot]})`);
    }
  }
  await sleep(1200); // let the lazy gear-sheet fetches land
}

/* ── capture one (pose, facing) ──────────────────────────────────────── */
async function capture(poseId, facing) {
  const ang = ANGLE[facing];
  await recenter();
  if (poseId === 'idle') {
    await setFacing(ang);
    await sleep(450);
    return cropShot();
  }
  if (poseId === 'jog') {
    for (const k of KEYS[facing]) await page.keyboard.down(k);
    await sleep(500);
    const buf = await cropShot();
    for (const k of KEYS[facing]) await page.keyboard.up(k);
    await sleep(250);
    return buf;
  }
  if (poseId === 'sword' || poseId === 'bow') {
    await pinPose(poseId, ang);
    await sleep(700); // first hit per gear config also covers the sheet fetch
    const buf = await cropShot();
    await unpinPose();
    await sleep(150);
    return buf;
  }
  // fish / mine
  await startExtraction(poseId === 'fish' ? 'fishing' : 'mining');
  await sleep(900);
  const buf = await cropShot();
  await stopExtraction();
  await sleep(250);
  return buf;
}

/* ── contact-sheet HTML (rendered + screenshotted in the same browser) ── */
function sheetHtml(config, rows) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body = rows.map(({ pose, cells }) => `
    <h2>${esc(pose.label)}</h2>
    <div class="row">${cells.map((c) => `
      <figure>${c.b64
        ? `<img src="data:image/png;base64,${c.b64}" width="${CROP_W}" height="${CROP_H}">`
        : `<div class="miss" style="width:${CROP_W}px;height:${CROP_H}px">capture failed</div>`}
        <figcaption>${esc(c.facing)}</figcaption>
      </figure>`).join('')}
    </div>`).join('\n');
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:24px;background:#14161c;color:#e8e8ee;font:14px/1.4 -apple-system,Segoe UI,sans-serif}
    h1{font-size:20px;margin:0 0 2px} .sub{color:#9aa0ae;margin:0 0 14px;font-size:12px}
    h2{font-size:14px;margin:16px 0 6px;color:#c8cdd8;text-transform:uppercase;letter-spacing:.06em}
    .row{display:flex;flex-wrap:wrap;gap:8px}
    figure{margin:0;background:#1d2129;border:1px solid #2c3140;border-radius:6px;padding:4px}
    img{display:block;image-rendering:pixelated;background:#0c0e12;border-radius:3px}
    .miss{display:flex;align-items:center;justify-content:center;color:#b3475b;background:#0c0e12;border-radius:3px}
    figcaption{text-align:center;font-size:11px;color:#9aa0ae;padding-top:3px}
  </style>
  <h1>BroTown gear: ${esc(config.label)}</h1>
  <p class="sub">qa-gear-sheet ${VERSION} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} ·
    equips: ${esc(Object.entries(config.equips).map(([s, v]) => s + '=' + v).join('  '))}</p>
  ${body}`;
}

mkdirSync(OUT_DIR, { recursive: true });
const maxCols = Math.max(...POSES.map((p) => p.facings.length));
const sheetPage = await browser.newPage({ viewport: { width: Math.min(maxCols * (CROP_W + 18) + 60, 2600), height: 900 } });

/* ── main loop ───────────────────────────────────────────────────────── */
let written = 0, failedShots = 0;
for (let ci = 0; ci < configs.length; ci++) {
  const config = configs[ci];
  console.log(`[${ci + 1}/${configs.length}] ${config.name}`);
  await applyEquips(config.equips);
  const rows = [];
  for (const pose of POSES) {
    const cells = [];
    for (const facing of pose.facings) {
      let b64 = null;
      try {
        const buf = await capture(pose.id, facing);
        b64 = buf.toString('base64');
        if (KEEP_CROPS) {
          const d = join(OUT_DIR, 'crops', config.name);
          mkdirSync(d, { recursive: true });
          writeFileSync(join(d, `${pose.id}-${facing}.png`), buf);
        }
      } catch (e) {
        failedShots++;
        console.log(`  FAIL ${pose.id}/${facing}: ${String(e.message).slice(0, 120)}`);
        try { await unpinPose(); await stopExtraction(); } catch (e2) { /* best-effort cleanup */ }
      }
      cells.push({ facing, b64 });
    }
    rows.push({ pose, cells });
  }
  await sheetPage.setContent(sheetHtml(config, rows), { waitUntil: 'load' });
  const sheet = await sheetPage.screenshot({ fullPage: true });
  const file = join(OUT_DIR, `${String(ci + 1).padStart(2, '0')}-${config.name}.png`);
  writeFileSync(file, sheet);
  written++;
  console.log('  wrote', file);
}

await browser.close();
console.log(`done: ${written} sheet(s) in ${OUT_DIR}${failedShots ? `, ${failedShots} failed shot(s)` : ''}`);
process.exit(written > 0 ? 0 : 1);
