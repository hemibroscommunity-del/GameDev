/* ═══ v2.3.3411: THE GROUND UNDER OPEN SEA IS NOT DRAWN ═══
 *
 * The owner, 2026-10-18: "iterate on what best improves framerate without
 * loss of quality (or negligible loss) for phone gameplay (iPhone, android)".
 * A piece of open sea is covered whole by its moving water's quad at full
 * strength, so its ground sprite was drawn for nothing (wheelWater.js, the
 * v2.3.3411 header).  On a phone viewport, against a real worker, at the
 * Wind Dunes' first coast (mp-wheelwaves' spot: sand, the shallows and the
 * sea north of it):
 *   1. pieces of open sea are laid there and their ground is hidden while
 *      the water draws (guard: the open sea is in view);
 *   2. THE SAME FRAME: the game's frames held, the scene drawn with the ground
 *      hidden, drawn (the live switch), hidden again -- the same to the bit;
 *      and the ground hidden really is not drawn (with the water's quads put
 *      away too, the hidden pieces leave holes: the comparison is not of
 *      nothing);
 *   3. the water's live switch off shows every hidden piece the frame the
 *      quads go, and on hides them again;
 *   4. the ground's own check (__btUnderSame: the pieces alone over the
 *      overview) still sees every piece;
 *   5. what it saves here: this box draws in software, every px it is asked
 *      to, so the frame's time with the ground hidden and drawn says how much
 *      drawing was skipped (reported; a phone's chip has its own numbers);
 *   6. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const WHEELISH = (z) => z === 'worldview' || z === 'wheel';
const PHONE = { width: 390, height: 844 };
const SHIFT = (await H.wheelGeom()).shift;
/* the Wind Dunes' first coast (mp-wheelwaves): sand, then the shallows and
   the sea north of it -- a step north, so the sea fills the top of the view */
const COAST = { x: 25199 + SHIFT, y: 15874 + SHIFT - 120 };

const holdTitle = (P, ms) => P.page.evaluate(async (hold) => {
  const el = document.querySelector('.bt-zone-header__title');
  if (!el) return 'no title element';
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  await new Promise((res) => setTimeout(res, hold));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  return 'ok';
}, ms);
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);
const waitZone = async (P, want, n = 60, gap = 1000) => {
  let zone = null;
  for (let i = 0; i < n; i++) {
    zone = await H.readState(P, (S) => S.currentZone);
    if ((typeof want === 'function' ? want(zone) : zone === want) && !(await H.readState(P, (S) => !!S._zoneLoading))) return zone;
    await P.page.waitForTimeout(gap);
  }
  return zone;
};
/* into the Wheel past the Mayor's gate (mp-wheelwaves' way in): every quest
   finished from the test panel, then down town's stairs */
async function wayIn(P) {
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  for (let i = 0; i < 4 && !(await panelUp(P)); i++) {
    await holdTitle(P, 1500);
    for (let k = 0; k < 10 && !(await panelUp(P)); k++) await P.page.waitForTimeout(300);
  }
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1500);
  await tap(P, 'Finish all quests');
  await P.page.waitForTimeout(2000);
  await tap(P, 'Close');
  await P.page.waitForTimeout(600);
  const { TOWN_EXITS } = await import(H.REPO + '/src/data/effects.js');
  const door = TOWN_EXITS.find((e) => e.zoneId === 'worldview');
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  return waitZone(P, WHEELISH);
}
/* until every piece asked for is laid (or `ms` passes) */
const settle = async (P, ms = 30000) => {
  const t0 = Date.now();
  let s = null;
  while (Date.now() - t0 < ms) {
    s = await P.page.evaluate(() => { const st = window.__btWorldTrial.stats; return { loading: st.loading, downloading: st.downloading, short: st.short, resident: st.resident, under: st.under }; });
    if (s.loading === 0 && s.downloading === 0 && s.short === 0 && s.resident > 0) break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(1500);
  return s;
};
const probe = (P) => P.page.evaluate(() => window.__btWaves.probe());
/* the hidden pieces: how many, and whether every one is still hidden */
const hiddenNow = (P) => P.page.evaluate(() => {
  const root = window._pixiRenderer && window._pixiRenderer.app.stage;
  let pieces = null;
  const find = (c, d) => { if (pieces || !c || d > 10) return; if (c.label === 'wheelGroundPieces') { pieces = c; return; } for (const ch of (c.children || [])) find(ch, d + 1); };
  find(root, 0);
  if (!pieces) return null;
  let shown = 0, hidden = 0;
  for (const s of pieces.children) { if (s.visible) shown++; else hidden++; }
  return { shown, hidden };
});

/* the frame held and drawn three times, the ground under open sea hidden,
   drawn, hidden again; then with the water's quads put away, hidden and
   drawn (the holes); and the frame's cost each way, the same scene drawn
   over and over (this box: software, every px it is asked) */
const sameFrame = (P) => P.page.evaluate(async () => {
  const w = window;
  const app = w._pixiRenderer.app, R = app.renderer, gl = R.gl, Wv = w.__btWaves;
  w.__scHeld = [];
  w.__scRaf = w.requestAnimationFrame;
  w.requestAnimationFrame = (cb) => { w.__scHeld.push(cb); return 0; };
  await new Promise((r) => setTimeout(r, 700));
  const W = gl.drawingBufferWidth, Hh = gl.drawingBufferHeight;
  const grab = () => {
    R.render(app.stage);
    const px = new Uint8Array(W * Hh * 4); gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, px); return px;
  };
  const cmp = (a, b) => {
    let n = 0, maxd = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d) { n++; if (d > maxd) maxd = d; }
    }
    return { n, maxd };
  };
  /* the frame drawn `n` times: the median, in ms (readPixels waits for it) */
  const cost = (n) => {
    const t = [];
    const one = new Uint8Array(4);
    for (let i = 0; i < n; i++) {
      const t0 = performance.now();
      R.render(app.stage);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one);
      t.push(performance.now() - t0);
    }
    t.sort((a, b) => a - b);
    return +t[Math.floor(n / 2)].toFixed(1);
  };
  const out = { W, H: Hh };
  try {
    Wv.cover(true);
    const a1 = grab();
    out.coveredA = Wv.probe().covered;
    Wv.cover(false);
    const b = grab();
    out.coveredB = Wv.probe().covered;
    Wv.cover(true);
    const a2 = grab();
    out.same = cmp(a1, b);
    out.back = cmp(a1, a2);
    /* the holes: the water's quads put away, the ground hidden and drawn */
    let water = null;
    const find = (c, d) => { if (water || !c || d > 10) return; if (c.label === 'wheelWater') { water = c; return; } for (const ch of (c.children || [])) find(ch, d + 1); };
    find(app.stage, 0);
    if (water) {
      water.visible = false;
      const h1 = grab();
      Wv.cover(false);
      const h2 = grab();
      Wv.cover(true);
      water.visible = true;
      out.holes = cmp(h1, h2);
    }
    /* what each way costs this box (alternating rounds, the median) */
    const on = [], off = [];
    for (let r = 0; r < 3; r++) {
      Wv.cover(true); on.push(cost(7));
      Wv.cover(false); off.push(cost(7));
    }
    Wv.cover(true);
    on.sort((a, b) => a - b); off.sort((a, b) => a - b);
    out.ms = { hidden: on[1], drawn: off[1], rounds: { hidden: on, drawn: off } };
  } catch (e) {
    out.error = String((e && e.message) || e);
  } finally {
    Wv.cover(true);
    const held = w.__scHeld;
    w.requestAnimationFrame = w.__scRaf;
    w.__scHeld = null;
    held.forEach((cb) => w.requestAnimationFrame(cb));
  }
  return out;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Seawatch', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel' });
  const stopAlive = H.keepAlive(P, 15000);
  try {
    const zone = await wayIn(P);
    if (!WHEELISH(zone)) { rec.ok('in the Wheel (guard)', false, { zone }); return; }
    await H.hopTo(P, COAST.x, COAST.y, { tries: 120 });
    const st = await settle(P);

    /* ── 1. the open sea in view, its ground hidden ── */
    const p1 = await probe(P);
    const h1 = await hiddenNow(P);
    console.log('    probe ' + JSON.stringify(p1) + '; pieces ' + JSON.stringify(h1) + '; settled ' + JSON.stringify(st));
    rec.ok(`at the coast, pieces of open sea are laid and their ground hidden while the water draws (${p1.covered} of ${p1.uniform} open-sea quads, ${h1 && h1.hidden} pieces hidden, ${h1 && h1.shown} drawn) (guard)`,
      p1.ok === true && p1.on && p1.cover && p1.covered > 0 && !!h1 && h1.hidden === p1.covered, { p1, h1 });

    /* ── 2. the same frame ── */
    const f = await sameFrame(P);
    console.log('    frame ' + JSON.stringify(f));
    rec.ok(`the same frame with the ground under open sea hidden and drawn: ${f.same && f.same.n} px apart (most ${f.same && f.same.maxd}), hidden again ${f.back && f.back.n} (${f.W} x ${f.H})`,
      !f.error && f.coveredA > 0 && f.coveredB === 0 && f.same.n === 0 && f.back.n === 0, f);
    rec.ok(`...and the hidden ground really is not drawn: with the water's quads put away it leaves ${f.holes && f.holes.n} px of holes`,
      !f.error && !!f.holes && f.holes.n > 10000, f.holes);
    console.log(`    this box (software): a frame ${f.ms && f.ms.hidden} ms with the ground under open sea hidden, ${f.ms && f.ms.drawn} ms drawn (rounds ${JSON.stringify(f.ms && f.ms.rounds)})`);
    rec.ok(`what it saves here: a frame ${f.ms && f.ms.hidden} ms with the ground hidden, ${f.ms && f.ms.drawn} ms with it drawn (software; reported, not compared)`,
      !f.error && !!f.ms && f.ms.hidden > 0 && f.ms.drawn > 0, f.ms);

    /* ── 3. the water's live switch: the ground shown with the quads gone ── */
    await P.page.evaluate(() => window.__btWaves.off());
    await P.page.waitForTimeout(800);
    const off = await hiddenNow(P), pOff = await probe(P);
    await P.page.evaluate(() => window.__btWaves.on());
    await P.page.waitForTimeout(800);
    const on = await hiddenNow(P), pOn = await probe(P);
    rec.ok(`the water switched off shows every hidden piece (${off && off.hidden} hidden, the quads ${pOff.on ? 'on' : 'off'}), and on hides them again (${on && on.hidden})`,
      !!off && !!on && off.hidden === 0 && !pOff.on && on.hidden > 0 && on.hidden === pOn.covered, { off, on, pOff: pOff.covered, pOn: pOn.covered });

    /* ── 4. the ground's own check still sees every piece ── */
    const us = await P.page.evaluate(() => {
      const S = window._gameState.current;
      return window.__btUnderSame ? window.__btUnderSame(S.camera.x, S.camera.y, S._viewW, S._viewH, 0.5) : null;
    });
    const after = await hiddenNow(P);
    rec.ok(`the ground's own check (the pieces alone over the overview) still sees every piece (${us && us.diff} px apart), and the pieces are hidden again after it (${after && after.hidden})`,
      !!us && !us.error && us.diff === 0 && !!after && after.hidden === (on && on.hidden), { us, after });

    await P.page.screenshot({ path: join(OUT, 'seacover.png') });
    const errs = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    stopAlive();
    try { await P.ctx.close(); } catch { /* gone */ }
  }
}
