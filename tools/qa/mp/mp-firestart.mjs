/* ═══ v2.3.3666: THE FIRE CATCHES IN CODE, AND THE BRO STAYS PUT ═══
 *
 * The owner, 2026-10-27: "work on the fire starting animation to replace the
 * log and flame in the animation with actual log art and code drawn smoke and
 * flames (actual lit fire is code drawn)", and "It might be better to just
 * remove the log and flame all together".
 *
 * The fire-lighter's strip has its painted fire taken out
 * (tools/build_fire_clean.py); the light's fire is the campfire's own
 * (campfireFx.js), catching on the strip's log from the strike; and each frame
 * is placed so the bro and his log stay put (effectsRenderer _fireFrameShift).
 * In the world, upright on a phone:
 *
 *   1. the bro photographed alone, standing and in all eight frames of the
 *      light: the standing frames' head where the walking body's is (it was 14
 *      world px to the side), and the log's bottom and left end on the same
 *      pixel row and column in every frame (frames 4-7 sat ~7 world px higher);
 *   2. the light's fire: none before the strike; from it a flame on the log,
 *      growing 0 -> 1 -> 2, no logs of its own; when the light ends the
 *      campfire is THAT fire (the same one, its flame where it was), its logs
 *      under it, at full height a beat later -- and only one fire;
 *   3. a watcher sees the same: a peer's light catches on their log, and their
 *      campfire takes that fire over;
 *   4. pictures: out/firestart/ (the light as drawn, and the bro alone).
 *
 *   node tools/qa/mp/run.mjs firestart
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const PHONE = { width: 390, height: 844 };
const DPR = 2;
const OUT = `${H.REPO}/tools/qa/mp/out/firestart`;
const FRAME_MS = 67;
const BG = [13, 11, 24];   /* pixiApp.js CANVAS_BG: what shows where nothing is drawn */

const INIT = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}`;

/* the figure alone: every world layer hidden but the ones a bro is drawn in,
   and in those everything that stood there before the light (mp-ghostaudit's
   tools); and the page's clock held where a frame is wanted */
const TOOLS = () => {
  if (window.__qaFire) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  const world = app && app.stage.children.find((c) => c.label === 'world');
  if (!world) return false;
  const G = window.__qaFire = {
    renders: 0, on: false,
    keep: new Set(['entities', 'player', 'gatherNodesBack', 'gatherNodes', 'gatherNodesFront', 'gestureFront']),
    foreign: new Set(), hid: new Set(), realNow: Date.now, held: null,
  };
  G.hold = (t) => { G.held = t; Date.now = () => (G.held += 0.0005); };
  G.free = () => { Date.now = G.realNow; G.held = null; };
  const rend = app.renderer;
  const orig = rend.render.bind(rend);
  rend.render = function (...a) {
    try {
      if (G.on) {
        for (const layer of world.children) {
          if (!G.keep.has(layer.label)) { if (layer.visible) { layer.visible = false; G.hid.add(layer); } continue; }
          for (const c of layer.children) if (G.foreign.has(c) && c.visible) { c.visible = false; G.hid.add(c); }
        }
        const me = R.playerDisplayRaw();
        if (me && me._uiLayer && me._uiLayer.visible) { me._uiLayer.visible = false; G.hid.add(me._uiLayer); }
      }
    } catch (e) { /* the frame still draws */ }
    G.renders++;
    return orig(...a);
  };
  G.markForeign = () => {
    G.foreign.clear();
    const me = R.playerDisplayRaw();
    for (const layer of world.children) {
      if (!G.keep.has(layer.label)) continue;
      for (const c of layer.children) if (c !== me && c.visible) G.foreign.add(c);
    }
    return G.foreign.size;
  };
  G.isolate = (on) => {
    G.on = !!on;
    if (!on) { for (const o of G.hid) o.visible = true; G.hid.clear(); }
  };
  return true;
};

const renders = (P) => P.page.evaluate(() => (window.__qaFire ? window.__qaFire.renders : -1));
async function drawn(P, n = 2) {
  const r0 = await renders(P);
  for (let i = 0; i < 250; i++) {
    await P.page.waitForTimeout(40);
    if (await renders(P) >= r0 + n) return true;
  }
  return false;
}

/* the photograph's window, CSS px, round where you stand */
const clipAt = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const r = document.querySelector('canvas').getBoundingClientRect();
  const k = S._worldScaleX || 1;
  const x = r.left + (S.player.x - S.camera.x) * k, y = r.top + (S.player.y - S.camera.y) * k;
  return { x: Math.round(x - 90), y: Math.round(y - 80), width: 180, height: 150, k };
});

/* what of the bro is in a photograph: the drawn pixels' box, the head's
   middle (its top rows) and the lowest row's and the leftmost low column */
function measure(img) {
  const { width: W, height: Hh } = img;
  /* the clear colour is exact in a photograph of the canvas; the bro's black
     outline differs from it by 11-24, so the line is low */
  const on = (x, y) => { const [r, g, b] = img.at(x, y); return Math.abs(r - BG[0]) > 6 || Math.abs(g - BG[1]) > 6 || Math.abs(b - BG[2]) > 6; };
  let top = -1, bottom = -1;
  const rowN = [];
  for (let y = 0; y < Hh; y++) {
    let n = 0;
    for (let x = 0; x < W; x++) if (on(x, y)) n++;
    rowN.push(n);
    if (n >= 3) { if (top < 0) top = y; bottom = y; }
  }
  if (top < 0) return null;
  let hx = 0, hn = 0;
  for (let y = top; y < Math.min(Hh, top + 24); y++) for (let x = 0; x < W; x++) if (on(x, y)) { hx += x; hn++; }
  let left = W;
  for (let y = Math.max(0, bottom - 20); y <= bottom; y++) for (let x = 0; x < W; x++) if (on(x, y)) { left = Math.min(left, x); break; }
  return { top, bottom, headX: hn ? +(hx / hn).toFixed(1) : null, left };
}

const fireProbe = (P) => P.page.evaluate(() => (window.__btCampfire ? window.__btCampfire() : null));

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const notes = {};
  /* ── 1-2: your own light ── */
  const P = await H.newPlayer(browser, { name: 'Firelight', wsPort, webPort, viewport: PHONE, touch: true, dpr: DPR, init: INIT, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(2500);
    /* the coach and the welcome plate sit over the middle of a phone screen, where the bro is photographed */
    await P.page.addStyleTag({ content: '[data-coach],[data-coach-card],[data-coach-ring],[data-quest-banner]{display:none!important}' });
    await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
    await P.page.evaluate(() => (window.__btStandInMake ? window.__btStandInMake('fire') : null)).catch(() => {});
    const ready = await H.waitFor(P, () => window.__btStandIns && window.__btStandIns().fire, (v) => v && v.state === 'ready', { timeout: 40000, label: 'the fire-lighter' }).catch(() => null);
    rec.ok('the fire-lighter is made (guard)', !!ready, ready);
    const tools = await P.page.evaluate(TOOLS);
    rec.ok('the page can be held still and the bro photographed alone (guard)', !!tools);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S.monsters = []; S.lockedTarget = null; S.autoAttack = false; S._facing = 'down';
      S.__wdEverLit = true; S.__wdNext = 1e15; S.__wdDark = 0;   /* the watchdog never reads a held page as dark */
      window.__btCampfireHide && window.__btCampfireHide(true);
    });
    await P.page.waitForTimeout(600);

    /* ── 1: the bro alone ── */
    const T = await P.page.evaluate(() => { const G = window.__qaFire; G.markForeign(); G.isolate(true); const t = Date.now(); G.hold(t); return t; });
    await drawn(P, 3);
    const clip = await clipAt(P);
    const shoot = async (name) => {
      const img = await H.screenshotPixels(P, clip);
      const buf = await P.page.screenshot({ clip }).catch(() => null);
      if (buf) writeFileSync(`${OUT}/${name}.png`, buf);
      return measure(img);
    };
    const walk0 = await shoot('alone-walking-before');
    const frames = [];
    for (let k = 0; k < 8; k++) {
      await P.page.evaluate(({ T, k }) => {
        const S = window._gameState.current;
        window.__qaFire.hold(T + 1000 + k * 67 + 30);
        S._campfire = null;
        S._firemaking = { startedAt: T + 1000, doneAt: T + 1000 + 600000, x: S.player.x, y: S.player.y + 6 };
      }, { T, k });
      await drawn(P, 2);
      const m = await shoot(`alone-frame-${k}`);
      const fig = await P.page.evaluate(() => (window.__btFireFigure ? window.__btFireFigure() : null));
      frames.push({ k, m, fi: fig && fig.fi });
    }
    /* the photographs' light let go, and its fire burned out (it dies down
       over ~4 s of the held clock) before the next light */
    await P.page.evaluate(({ T }) => { const S = window._gameState.current; S._firemaking = null; S._campfire = null; window.__qaFire.hold(T + 6000); }, { T });
    await drawn(P, 3);
    await P.page.evaluate(({ T }) => window.__qaFire.hold(T + 16000), { T });
    await drawn(P, 3);
    const walk1 = await shoot('alone-walking-after');
    notes.alone = { walk0, frames, walk1, clip };
    const px = (v) => +(v / (clip.k * DPR)).toFixed(2);   /* screenshot px -> world px */
    rec.ok(`every frame drawn and photographed (frames ${frames.map((f) => f.fi).join(',')}) (guard)`,
      frames.every((f, i) => f.fi === i && f.m) && !!walk0 && !!walk1, frames);
    if (walk0 && frames[0].m && frames[7].m) {
      const d0 = px(frames[0].m.headX - walk0.headX), d7 = px(frames[7].m.headX - walk1.headX);
      rec.ok(`1. standing to light, the bro is where you stand: his head ${d0} world px from the walking body's (it was 14)`, Math.abs(d0) <= 2.5, { walk0, f0: frames[0].m });
      rec.ok(`...and standing beside the fire at the end, ${d7} world px (it was ~15)`, Math.abs(d7) <= 2.5, { walk1, f7: frames[7].m });
    }
    const bottoms = frames.filter((f) => f.m).map((f) => f.m.bottom), lefts = frames.filter((f) => f.m).map((f) => f.m.left);
    const spanB = px(Math.max(...bottoms) - Math.min(...bottoms)), spanL = px(Math.max(...lefts) - Math.min(...lefts));
    rec.ok(`1b. the log stays on the ground: its bottom edge within ${spanB} world px over the eight frames (frames 4-7 sat ~7 higher)`, spanB <= 1.5, bottoms);
    rec.ok(`1c. ...and does not slide: its left end within ${spanL} world px`, spanL <= 2.5, lefts);

    /* ── 2: the light's fire ── */
    await P.page.evaluate(() => { const G = window.__qaFire; G.isolate(false); window.__btCampfireHide && window.__btCampfireHide(false); });
    const L = await P.page.evaluate(() => { const t = Date.now(); window.__qaFire.hold(t);
      const S = window._gameState.current; S._campfire = null;
      S._firemaking = { startedAt: t, doneAt: t + 700, x: S.player.x, y: S.player.y + 6 };
      return { t, px: S.player.x, py: S.player.y }; });
    const at = async (ms, name) => {
      await P.page.evaluate((t) => window.__qaFire.hold(t), L.t + ms);
      await drawn(P, 2);
      if (name) {
        const c = await clipAt(P);
        const buf = await P.page.screenshot({ clip: { x: c.x - 20, y: c.y - 30, width: c.width + 40, height: c.height + 40 } }).catch(() => null);
        if (buf) writeFileSync(`${OUT}/${name}.png`, buf);
      }
      return fireProbe(P);
    };
    const pre = await at(120, 'light-0120-before-strike');
    const lightOf = (pr) => (pr && pr.fires || []).find((f) => f.key === 'light') || null;
    const p0 = lightOf(pre);
    rec.ok(`2. before the strike the light's fire is there but unlit (${p0 ? `flame ${p0.flameOn}, glow ${p0.glowAlpha}` : 'none'})`, !!(p0 && !p0.flameOn && p0.glowAlpha < 0.01 && p0.lighting), pre);
    const s1 = lightOf(await at(240, 'light-0240-strike'));
    const s2 = lightOf(await at(390, 'light-0390-growing'));
    const s3 = lightOf(await at(560, 'light-0560-settling'));
    rec.ok(`2b. from the strike it catches and grows on the log: size ${s1 && s1.size} -> ${s2 && s2.size} -> ${s3 && s3.size}, sparks ${s1 && s1.embers}`,
      !!(s1 && s2 && s3 && s1.flameOn && s1.size === 0 && s2.size === 1 && s3.size === 2 && s1.embers > 0), { s1, s2, s3 });
    rec.ok(`2c. ...with no logs of its own (the strip's log is its bed) and smoke rising (${s3 && s3.smoke} puffs)`,
      !!(s1 && s3 && !s1.logsOn && !s3.logsOn && s3.smoke > 0), { s1, s3 });
    const fig = await P.page.evaluate(() => (window.__btFireFigure ? window.__btFireFigure() : null));
    rec.ok(`2d. ...at the campfire's spot, a stride to your left at your boots (${s3 && (s3.x - L.px).toFixed(1)} px)`,
      !!(s3 && s3.x < L.px - 20 && fig && Math.abs(s3.y - fig.bootsY) < 8), { s3, fig, L });
    const h0 = await at(705, 'light-0705-campfire');
    const self0 = (h0 && h0.fires || []).find((f) => f.key === 'self');
    rec.ok(`2e. the campfire IS the light's fire: the same one (serial ${s3 && s3.serial} -> ${self0 && self0.serial}), its flame where it was (${self0 && s3 ? Math.hypot(self0.flameX - s3.flameX, self0.flameY - s3.flameY).toFixed(2) : '?'} px)`,
      !!(self0 && s3 && self0.serial === s3.serial && Math.hypot(self0.flameX - s3.flameX, self0.flameY - s3.flameY) < 1.5), { s3, self0 });
    rec.ok(`2f. ...its logs under it now, and one fire, not two (${(h0 && h0.fires || []).length})`,
      !!(self0 && self0.logsOn && !self0.lighting && h0.fires.length === 1), h0);
    const h1 = await at(1100, 'light-1100-burning');
    const self1 = (h1 && h1.fires || []).find((f) => f.key === 'self');
    rec.ok(`2g. ...and at full height a beat later (size ${self1 && self1.size})`, !!(self1 && self1.size === 3 && self1.serial === (s3 && s3.serial)), self1);
    notes.light = { pre, s1, s2, s3, h0, h1 };
    await P.page.evaluate(() => { window.__qaFire.free(); const S = window._gameState.current; S._campfire = null; });
    rec.ok('no page errors (your light)', errors.length === 0, errors.slice(0, 4));
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ── 3: a watcher ── */
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Lighter', nameB: 'Watcher', init: INIT, world: 'wheel' });
  try {
    for (const Q of [A, B]) {
      await Q.page.evaluate(() => (window.__btStandInMake ? window.__btStandInMake('fire') : null)).catch(() => {});
      await H.waitFor(Q, () => window.__btStandIns && window.__btStandIns().fire, (v) => v && v.state === 'ready', { timeout: 40000, label: 'the fire-lighter' }).catch(() => null);
    }
    const aId = await H.readState(A, (S) => S.myId);
    await A.page.evaluate(() => { const S = window._gameState.current; const t = Date.now();
      S._campfire = null; S._firemaking = { startedAt: t, doneAt: t + 700, x: S.player.x, y: S.player.y + 6 }; });
    const seen = await B.page.evaluate(async (id) => {
      const out = [];
      const t0 = performance.now();
      while (performance.now() - t0 < 6000) {
        const pr = window.__btCampfire ? window.__btCampfire() : null;
        for (const f of (pr && pr.fires) || []) {
          if (f.key === 'pl:' + id || f.key === 'p:' + id) out.push({ t: Math.round(performance.now() - t0), key: f.key, serial: f.serial, lighting: f.lighting, flameOn: f.flameOn, logsOn: f.logsOn, n: pr.fires.length });
        }
        await new Promise((r) => setTimeout(r, 60));
      }
      return out;
    }, String(aId));
    const pl = seen.filter((s) => s.key === 'pl:' + aId), pc = seen.filter((s) => s.key === 'p:' + aId);
    rec.ok(`3. the watcher sees their light catch on their log (${pl.length} looks, lit ${pl.some((s) => s.flameOn && !s.logsOn)})`, pl.some((s) => s.flameOn && !s.logsOn), seen.slice(0, 6));
    rec.ok(`3b. ...and their campfire takes that fire over: the same one (${pl.length ? pl[0].serial : '?'} -> ${pc.length ? pc[0].serial : '?'}), one fire`,
      !!(pl.length && pc.length && pc[0].serial === pl[pl.length - 1].serial && pc.every((s) => s.n === 1)), { pl: pl.slice(-2), pc: pc.slice(0, 2) });
    notes.watcher = { seen: seen.slice(0, 40) };
  } finally {
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
  writeFileSync(`${OUT}/notes.json`, JSON.stringify(notes, null, 1));
}
