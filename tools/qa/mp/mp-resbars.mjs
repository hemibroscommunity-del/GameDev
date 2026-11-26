/* ═══ THE MANA AND ENERGY BARS ARE WHOLE, AND CAST NO SHADOW (v2.3.6206, card EN) ═══
 *
 * The owner, 2026-11-25, on their iPhone 14 Pro: "Resource bars like mana and
 * energy aren't displaying correctly. They look like they have holes in them
 * instead of a full pill shape like the original. Also remove the shadows they
 * cast on the game area."  Their picture: five SEPARATE blocks with the ground
 * between them, and a soft dark patch on the ground to the right of the row.
 * What the bars are (the owner, v2.3.2300): "5 blocks (with thick borders
 * between them but all connected inside a rectangle)".
 *
 * A phone in BroTown, the bars brought up by a spend (mana and energy set
 * part-full on the page: the bar shows on a drop), at each sharpness the game
 * draws (?res=1, 1.5 the phone's default, 2, 3) and in both sprite programs
 * (?onebatch=1, =0):
 *   1. every piece of the frame (left cap, middle, right cap) holds a picture
 *      of the sheet, and the blocks are drawn (the probe __btResBarBoxes);
 *   2. THE PIXELS: on the bar's middle rows, between the first block and the
 *      last, no pixel is the ground's.  The ground is the same place
 *      photographed with the bars away (a control: the blocks themselves must
 *      differ from it, or the photograph is not of the bar);
 *   3. no shadow of the bars: the sun casts as many pieces for your figure
 *      with the bars up as with them away (the shadow system's own count),
 *      and the bars are marked to cast none;
 *   4. a longer row (8 blocks, when the worker scales the blocks) is whole too;
 *   5. no page errors.
 * Pictures (BT_QA_SHOTS=1): docs/shots/resbars-<before|after>-res<r>-ob<n>.png,
 * mana (blue, over) and energy (gold, under) part-full, at 3 device pixels.
 * One sharpness or program alone: BT_QA_RESBARS_RES=1.5 BT_QA_RESBARS_OB=1. */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

/* the owner's phone: an iPhone 14 Pro, 430 x 775 of page at 3 device pixels */
const PHONE = { width: 430, height: 775 };
const DPR = 3;
const SHOTS = process.env.BT_QA_SHOTS === '1';
const SHOT_TAG = process.env.BT_QA_SHOT_TAG || 'after';   /* 'before' on main's code */
const RES = (process.env.BT_QA_RESBARS_RES || '1.5,1,2,3').split(',').map(Number);
const OB = (process.env.BT_QA_RESBARS_OB || '1,0').split(',').map(Number);

/* the bars up: a drop in the pool is a spend, and a spend shows the bar for a
   second (RES_HOLD_MS) before it fades */
const spend = (P, frac, blocks) => P.page.evaluate(({ frac, blocks }) => {
  const S = window._gameState.current;
  const R = S.rpg;
  if (!R) return false;
  /* HELD up: a drop re-arms the bar's second of hold, a rise is a refill
     (no reveal), so a pool stepping down a hair at a time keeps the bar up
     as long as the test looks, at the same blocks lit (a floor) */
  clearInterval(window.__qaResHold);
  let tick = 0;
  /* the rpg record is read again each tick: a state from the worker can
     replace it, and a held old one would let the bars fade */
  const set = () => {
    tick++;
    const r = window._gameState.current.rpg;
    if (!r) return;
    if (blocks) { r.manaBlocks = blocks; r.stamBlocks = blocks; }
    /* a step DOWN every tick (a reset up every 20th, a refill): any frame,
       however slow, sees a drop since the last one; 0.4 of a point at most,
       so the blocks lit stay put */
    const d = 0.02 * (tick % 20);
    r.mana = (r.maxMana || 100) * frac - d;
    r.stamina = (r.maxStamina || 100) * frac - d;
  };
  set();
  window.__qaResHold = setInterval(set, 120);
  return true;
}, { frac, blocks });
const refill = (P) => P.page.evaluate(() => {
  clearInterval(window.__qaResHold);
  const R = window._gameState.current.rpg;
  if (R) { R.mana = R.maxMana || 100; R.stamina = R.maxStamina || 100; }
});
const boxes = (P) => P.page.evaluate(() => {
  const b = window.__btResBarBoxes ? window.__btResBarBoxes() : null;
  const c = document.querySelector('canvas').getBoundingClientRect();
  return b ? JSON.parse(JSON.stringify(Object.assign(b, { cl: c.left, ct: c.top }))) : null;
});

const near = (a, b, t) => Math.abs(a[0] - b[0]) <= t && Math.abs(a[1] - b[1]) <= t && Math.abs(a[2] - b[2]) <= t;

/* one bar, read off the two photographs (bars up, bars away) of one window */
function readBar(bar, clip, up, away, k) {
  const cells = (bar.cells || []).slice().sort((a, b) => a.x - b.x);
  const out = { cells: cells.length, ground: 0, gutterPx: 0, blockDiff: 0, blockPx: 0 };
  if (cells.length < 2 || !bar.mid) return out;
  /* CSS px -> the photograph's pixels */
  const X = (x) => Math.round((x - clip.x) * k), Y = (y) => Math.round((y - clip.y) * k);
  const top = bar.mid.y, h = bar.mid.h;
  const y0 = Y(top + h * 0.3), y1 = Y(top + h * 0.7);
  for (let i = 0; i + 1 < cells.length; i++) {
    /* the gutter, a device pixel in from each block's edge (its soft edge) */
    const x0 = X(cells[i].x + cells[i].w) + 1, x1 = X(cells[i + 1].x) - 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      out.gutterPx++;
      if (near(up.at(x, y), away.at(x, y), 10)) out.ground++;
    }
  }
  /* the control: the blocks themselves differ from the ground */
  for (const c of cells) {
    for (let y = y0; y <= y1; y++) for (let x = X(c.x) + 2; x <= X(c.x + c.w) - 2; x++) {
      out.blockPx++;
      if (!near(up.at(x, y), away.at(x, y), 10)) out.blockDiff++;
    }
  }
  return out;
}

/* the shadow pieces the sun casts for your own figure this frame (the shadow
   system's own count, lightfx/shadows.js stats.self): the bars up must add
   none.  Read a few frames, the most often seen (a pose can blink a piece) */
const selfPieces = async (P, up) => {
  /* counted only on frames where both bars are fully up (or fully away): the
     probe's alphas are the same frame's (a slow page at sharpness 3 draws
     about a frame a second, so a bar can start to fade between two looks) */
  const seen = [];
  for (let i = 0; i < 24 && seen.length < 5; i++) {
    seen.push(await P.page.evaluate((up) => {
      const p = window.__btLightFx && window.__btLightFx.probe();
      const s = p && p.shadows && p.shadows.self;
      const r = window.__btResourceBars;
      const ok = r && (up ? (r.mp > 0.99 && r.en > 0.99) : (r.mp < 0.01 && r.en < 0.01));
      return s && !s.held && ok ? s.pieces : null;
    }, up));
    if (seen[seen.length - 1] == null) seen.pop();
    await P.page.waitForTimeout(150);
  }
  const n = Object.create(null);
  for (const v of seen) n[v] = (n[v] || 0) + 1;
  const best = Object.keys(n).sort((x, y) => n[y] - n[x])[0];
  return best == null ? null : +best;
};

async function onePhone(browser, { wsPort, webPort, rec, res, ob, errors, OUT }) {
  const tag = `res ${res}, ${ob ? 'one sprite program' : 'three sprite programs'}`;
  const P = await H.newPlayer(browser, { name: `Bars${String(res).replace('.', '')}${ob}`, wsPort, webPort,
    viewport: PHONE, touch: true, dpr: DPR, world: 'wheel', query: `res=${res}&onebatch=${ob}` });
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'wheel', { timeout: 60000, label: 'in the world' });
    await P.page.waitForTimeout(3000);
    /* the bars away: a full pool, and long enough for any earlier bar to fade */
    await refill(P);
    await P.page.waitForTimeout(2600);
    const rows = [{ n: 0 }];
    /* v2.3.6206: a longer row too, when the worker scales the blocks */
    rows.push({ n: 8 });
    for (const row of rows) {
      await refill(P);
      await P.page.waitForTimeout(2600);
      /* the window: the bars' place, found with them up (a spend), then
         photographed with them away first */
      if (!(await spend(P, 0.5, row.n))) { rec.ok(`${tag}: the page has a character`, false); return; }
      await P.page.waitForTimeout(600);
      let b = await boxes(P);
      if (!b || !b.mp || !b.mp.mid) { rec.ok(`${tag}: the bars' probe answers`, false, b); return; }
      const all = [b.mp, b.en].flatMap((bar) => [bar.capL, bar.mid, bar.capR, ...bar.cells]).filter(Boolean);
      const L = Math.min(...all.map((r) => r.x)), T = Math.min(...all.map((r) => r.y));
      const R = Math.max(...all.map((r) => r.x + r.w)), B = Math.max(...all.map((r) => r.y + r.h));
      const clip = { x: Math.max(0, Math.floor(b.cl + L - 40)), y: Math.max(0, Math.floor(b.ct + T - 12)) };
      clip.width = Math.min(PHONE.width - clip.x, Math.ceil(R - L + 80));
      clip.height = Math.min(PHONE.height - clip.y, Math.ceil(B - T + 24));
      /* the probe is on the stage; the photograph is the page */
      const onPage = (q) => (q ? Object.assign({}, q, { x: q.x + b.cl, y: q.y + b.ct }) : q);
      const fix = (bar) => bar && Object.assign({}, bar, { capL: onPage(bar.capL), mid: onPage(bar.mid), capR: onPage(bar.capR), cells: bar.cells.map(onPage) });
      await refill(P);
      await P.page.waitForTimeout(2600);
      const awayPieces = await selfPieces(P, false);
      const away = await H.screenshotPixels(P, clip);
      await spend(P, 0.5, row.n);
      /* the photograph only with the bars at full strength (a slow page at
         sharpness 3 draws a frame in a few hundred ms) */
      for (let i = 0; i < 40; i++) {
        await P.page.waitForTimeout(250);
        const a = await boxes(P);
        if (a && a.mp && a.en && a.mp.alpha > 0.99 && a.en.alpha > 0.99) break;
      }
      const up = await H.screenshotPixels(P, clip);
      const upPieces = await selfPieces(P, true);
      b = await boxes(P);
      const k = up.width / clip.width;
      const label = row.n ? `${tag}, a row of ${row.n}` : tag;
      if (SHOTS && !row.n) {
        const buf = await P.page.screenshot({ clip });
        writeFileSync(join(OUT, `resbars-${SHOT_TAG}-res${res}-ob${ob}.png`), buf);
      }
      for (const [key, name] of [['mp', 'mana'], ['en', 'energy']]) {
        const bar = fix(b[key]);
        if (!bar) { rec.ok(`${label}: the ${name} bar exists`, false); continue; }
        const pics = ['capL', 'mid', 'capR'].map((p) => (bar[p] && bar[p].pic ? p : `NO ${p}`));
        const want = row.n || 5;
        const drawn = bar.cells.length;
        if (row.n && drawn !== row.n) {
          /* the worker did not scale the blocks: the row stays five */
          rec.ok(`${label}: the ${name} row (${drawn} blocks: the worker keeps five, so a row of ${row.n} is not drawn here)`, drawn === 5);
          continue;
        }
        rec.ok(`${label}: the ${name} bar's frame holds its pictures (${pics.join(', ')}) and ${drawn} blocks are drawn`,
          bar.visible && pics.every((p) => !p.startsWith('NO')) && drawn === want, { alpha: bar.alpha });
        const r = readBar(bar, clip, up, away, k);
        rec.ok(`${label}: the ${name} bar is ONE object: on its middle rows, between the first block and the last, ${r.ground} of ${r.gutterPx} pixels are the ground's (the blocks differ from the ground at ${r.blockDiff} of ${r.blockPx}: the photograph is of the bar)`,
          r.gutterPx > 0 && r.ground === 0 && r.blockDiff > r.blockPx * 0.6, r);
        rec.ok(`${label}: the ${name} bar is marked to cast no shadow`, bar.noCast === true);
      }
      rec.ok(`${label}: no shadow of the bars: the sun casts ${upPieces} pieces for your figure with the bars fully up, ${awayPieces} with them away`,
        awayPieces > 0 && upPieces === awayPieces, { awayPieces, upPieces });
    }
  } finally { await P.ctx.close().catch(() => {}); }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'docs/shots');
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  for (const res of RES) {
    for (const ob of OB) await onePhone(browser, { wsPort, webPort, rec, res, ob, errors, OUT });
  }
  rec.ok('no page errors', errors.length === 0, errors);
}
