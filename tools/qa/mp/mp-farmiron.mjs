/* ═══ v2.3.3624: THE FARMER'S IRON IS THE WALKING IRON ═══
 *
 * The owner's list of 2026-10-26: "The armor while performing farming
 * gestures is noticeably different color (iron). Try to make it match more
 * exactly."
 *
 * v2.3.3472 graded the farmer's plate and greaves to the walking sheets' greys
 * and gave them the same metal tint and shine.  What was left is the LIGHT: the
 * walking figure is form-shaded (formShade.js, v2.3.2767) -- one gradient over
 * the whole figure, as painted at the head and a cool shade at the boots (x0.72
 * red, x0.75 green, x0.90 blue) -- and the farmer, drawn as stand-in sprites in
 * the gesture layer, was not shaded at all: iron a quarter brighter and warmer
 * at the boots than the same iron a moment before.
 *
 * Measured as a player sees it, on a phone, on the farm, in a full iron set:
 * every world layer's other children hidden so the figure stands on the
 * canvas's own colour, a picture of the bro standing by bed 0, then one of him
 * at the same spot holding the hoe (the dig's rest frame, held).  In each, the
 * armour's pixels (grey and bluish: not the skin, hair, cap or tool) in three
 * bands from the boots up; each band's median colour, farmer over walker:
 *   - each channel within FIT of the walker's from the boots to the chest
 *     (before this version the boots' red and green were 15% and 13% over: no
 *     form shade, and steel graded to the jog's darker greaves); the head and
 *     shoulders within FIT_TOP (his arms cross his chest there);
 *   - the farmer's armour carries the walking figure's own shade at its height
 *     (the probe: his sprites' gradient, read at his boots and his crown,
 *     against the walking figure's at the same heights).
 *
 *   node tools/qa/mp/run.mjs farmiron
 *   BT_FARMIRON_SHADE=0  runs it with ?shade=0 (no form shading anywhere): the
 *                        two figures must match then too
 *   BT_FARMIRON_QUERY=x  adds x to the address (sheen=0: the metal's shine off)
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FARM_BEDS } from '../../../src/data/farmLayout.js';
import { FARM_STEP_ANIM, FARM_ANIM_TURN, FARM_WORK_MS } from '../../../src/game/farmWork.js';

const PHONE = { width: 390, height: 844 };
const FOOT_DY = 52;   /* a body's middle to its boots on the farm (mp-farmanim) */
const FIT = 0.08;     /* the boots' and middle bands' channels within 8% of the walker's (two poses: the hoe's rest frame against the standing figure; the code before this version: boots 15%, the chest 9% over) */
const FIT_TOP = 0.14; /* the head and shoulders': his arms cross his chest there (the art's own top third 11% darker) */
const WALK_H = 105.7; /* the walking figure, top of the head to the boots, world px (mp-farmanim) */

const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', 'deep');
  localStorage.setItem('bt-hair', 'flat-top');
  localStorage.setItem('bt-haircolor', 'blonde');
  localStorage.setItem('bt-headwear', 'red-cap');
} catch (e) {}`;

/* the ms into a step at which it shows `frame` of its first turn (mp-farmanim) */
function frameMid(step, frame, total) {
  const turn = FARM_ANIM_TURN[FARM_STEP_ANIM[step]];
  const T = turn.reduce((a, b) => a + b, 0);
  const n = Math.max(1, Math.round(total / T));
  const k = (n * T) / total;
  let at = 0;
  for (let f = 0; f < frame; f++) at += turn[f];
  return (at + turn[frame] / 2) / k;
}

/* the armour's pixels in a picture: in the figure's own box (`box`: its
   boots' row, its crown's row and its middle, in the picture's px), not the
   canvas's own colour, grey or bluish (saturation under 0.22), neither the
   outline nor the whites of the eyes -- in three bands from the boots up to
   the crown; each band's median r, g, b */
function bands(png, box) {
  const W = png.width, Hh = png.height, ch = png.channels, d = png.data;
  const half = (box.feet - box.crown) * 0.38;
  const out = [];
  let n = 0;
  for (let k = 0; k < 3; k++) {
    /* band 0 the boots' third, band 2 the head and shoulders' */
    const lo = box.feet - (box.feet - box.crown) * (k + 1) / 3, hi = box.feet - (box.feet - box.crown) * k / 3;
    const ps = [];
    for (let y = Math.max(0, Math.ceil(lo)); y <= Math.min(Hh - 1, Math.floor(hi)); y++) {
      for (let x = Math.max(0, Math.round(box.mid - half)); x <= Math.min(W - 1, Math.round(box.mid + half)); x++) {
        const i = (y * W + x) * ch;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (Math.abs(r - 13) + Math.abs(g - 11) + Math.abs(b - 24) < 18) continue;   /* CANVAS_BG */
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const L = 0.299 * r + 0.587 * g + 0.114 * b;
        if (L < 40 || L > 215 || (mx - mn) / Math.max(1, mx) > 0.22 || b < r - 8) continue;
        ps.push([r, g, b]);
      }
    }
    n += ps.length;
    const med = (j) => { const v = ps.map((p) => p[j]).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; };
    out.push({ n: ps.length, rgb: [med(0), med(1), med(2)] });
  }
  return { n, box, bands: out.every((b) => b.n >= 20) ? out : null };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shadeOff = process.env.BT_FARMIRON_SHADE === '0';
  const P = await H.newPlayer(browser, { name: 'Ironbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', init: LOOK,
    query: [shadeOff ? 'shade=0' : '', process.env.BT_FARMIRON_QUERY || ''].filter(Boolean).join('&') || undefined });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const until = async (fn, pred, ms = 8000) => {
    let v = null;
    for (let t0 = Date.now(); Date.now() - t0 < ms;) { v = await fn(); if (pred(v)) return v; await P.page.waitForTimeout(150); }
    return v;
  };
  /* every world layer's children hidden but `keep`'s: the figure on the
     canvas's own colour; `null` puts them all back */
  const isolate = (which) => P.page.evaluate((which) => {
    const R = window._pixiRenderer;
    const world = R && R.app && R.app.stage.children.find((c) => c.label === 'world');
    if (!world) return false;
    if (!which) {
      for (const [c, v] of (window.__isoWas || [])) c.visible = v;
      window.__isoWas = null;
      return true;
    }
    const me = R.playerDisplayRaw();
    /* the farmer without his hoe (its blade is grey too) */
    const FARM = new Set(['farmBody', 'farmLegs', 'farmShirt', 'farmChest']);
    const keep = (c) => (which === 'walk' ? c === me : (FARM.has(c.label)));
    const was = [];
    for (const layer of world.children) {
      for (const c of layer.children || []) {
        if (keep(c)) continue;
        was.push([c, c.visible]);
        c.visible = false;
      }
    }
    /* ...and the walker without his name plate */
    if (which === 'walk' && me && me._uiLayer) { was.push([me._uiLayer, me._uiLayer.visible]); me._uiLayer.visible = false; }
    window.__isoWas = was;
    return true;
  }, which);
  /* a picture round the boots, 120 x 150 CSS px over them */
  const shot = async (name, feet) => {
    const c = await P.page.evaluate((f) => {
      const S = window._gameState.current;
      const r = document.querySelector('canvas').getBoundingClientRect();
      return { x: r.left + (f.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (f.y - S.camera.y) * (S._worldScaleY || 1) };
    }, feet);
    const W = 120, Hh = 150;
    const clip = { x: Math.max(0, Math.round(c.x - W / 2)), y: Math.max(0, Math.round(c.y - 125)), width: W, height: Hh };
    const file = join(OUT, `farmiron-${name}.png`);
    await P.page.screenshot({ path: file, clip });
    return { file, clip, at: c };
  };
  /* a figure's box in its picture's px (dpr 2): its boots' row, its crown's
     row (world y), its middle */
  const boxIn = (sh, feetY, crownY, k) => ({ feet: (sh.at.y - sh.clip.y) * 2, crown: (sh.at.y - sh.clip.y - (feetY - crownY) * k) * 2, mid: (sh.at.x - sh.clip.x) * 2 });
  const report = {};
  try {
    await H.enterWorld(P);
    const wa = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok('the player is in the world (guard)', !!wa, wa);
    if (!wa) return;
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.evaluate(() => { window.__btGearSet('shirt', 'none'); window.__btGearSet('chest', 'ironplate'); window.__btGearSet('legs', 'irongreaves'); });

    /* onto the farm */
    await P.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
    const visit = await until(() => P.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }), (v) => !!v, 8000);
    if (visit) await P.page.touchscreen.tap(visit.x, visit.y);
    const onFarm = await until(() => H.readState(P, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') })),
      (v) => v.zone === 'farm_home' && !v.hold && !v.veil, 25000);
    rec.ok('onto the farm in a full iron set (guard)', !!onFarm && onFarm.zone === 'farm_home', onFarm);
    if (!onFarm || onFarm.zone !== 'farm_home') return;
    const B0 = FARM_BEDS[0];
    await H.hopTo(P, B0.x + B0.w / 2, B0.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    await until(() => P.page.evaluate(() => (window.__btFarmWalk() || {}).near), (n) => n && n.i === 0 && n.step === 'dig', 6000);
    await P.page.waitForTimeout(1500);

    /* ── 1. the walking figure, standing by the bed ── */
    const walk = await P.page.evaluate(() => {
      const S = window._gameState.current, d = window._pixiRenderer.playerDisplayRaw();
      const t = window.__btGearTints ? window.__btGearTints() : null;
      const of = (slot) => { const r = t && t.slots.find((x) => x.slot === slot); return r && r.visible ? r.tint : null; };
      return { pose: d && d._animPose, x: S.player.x, feetY: S.player.y + 52, chest: of('chest'), legs: of('legs'), k: S._worldScaleY || 1 };
    });
    await isolate('walk');
    await P.page.waitForTimeout(500);
    const shW = await shot('walk', { x: walk.x, y: walk.feetY });
    await isolate(null);
    /* his height: the walking figure's, crown to boots (mp-farmanim's WALK_H)
       -- not bodyFigureProbe's, which reads the body's picture, and under
       armour that is mostly erased (the masked bake) */
    const bw = bands(H.decodePng(readFileSync(shW.file)), boxIn(shW, walk.feetY, walk.feetY - WALK_H, walk.k));
    report.walk = { ...walk, bands: bw };
    rec.ok(`the walking figure stands by the bed in iron (pose ${walk.pose}; plate ${walk.chest}, greaves ${walk.legs}; ${bw.n} armour px)`,
      walk.pose === 'stand' && walk.chest != null && walk.chest !== 0xffffff && !!bw.bands, report.walk);

    /* ── 2. the farmer at the same spot, the hoe's rest frame held ── */
    const step = 'dig', T = FARM_WORK_MS[step];
    await P.page.evaluate(({ mid, T }) => {
      window.__btFarmHoldFrame = 0;
      const S0 = window._gameState.current;
      let cur = S0._farmWork;
      const pin = () => { const w = cur; if (!w || w.step !== 'dig') return; const n = Date.now(); w.startedAt = n - mid; w.doneAt = w.startedAt + T * 100; };
      Object.defineProperty(S0, '_farmWork', { configurable: true, enumerable: true, get() { return cur; }, set(v) { cur = v; pin(); } });
      window.__pinT = setInterval(pin, 10);
    }, { mid: frameMid(step, 0, T), T });
    await P.page.keyboard.press('e');
    const F = await until(() => P.page.evaluate(() => (window.__btFarmFigure ? window.__btFarmFigure() : null)), (v) => v && v.visible && v.frame === 0, 5000);
    rec.ok('the farmer works the bed with the hoe, its rest frame held (guard)', !!F && F.visible && F.frame === 0, F && { frame: F.frame, anim: F.anim });
    if (!F || !F.visible) return;
    await P.page.waitForTimeout(400);
    const fShade = F.shade || null;
    await isolate('farm');
    await P.page.waitForTimeout(500);
    const shF = await shot('farm', F.foot);
    await isolate(null);
    const bf = bands(H.decodePng(readFileSync(shF.file)), boxIn(shF, F.foot.y, F.crown.y, walk.k));
    report.farm = { foot: F.foot, tints: F.tints || null, shade: fShade, bands: bf };
    await P.page.evaluate(() => { clearInterval(window.__pinT); window.__btFarmHoldFrame = null; const w = window._gameState.current._farmWork; if (w) { w.startedAt = Date.now() - 50; w.doneAt = Date.now() + 120; } });

    /* ── 3. the iron, band by band ── */
    const ratio = [];
    let ok = !!bw.bands && !!bf.bands, okTop = ok;
    if (ok) {
      for (let k = 0; k < 3; k++) {
        const a = bw.bands[k].rgb, b = bf.bands[k].rgb;
        const q = [0, 1, 2].map((j) => (a[j] && b[j] ? +(b[j] / a[j]).toFixed(3) : null));
        ratio.push(q);
        const bad = q.some((x) => x == null || Math.abs(x - 1) > (k < 2 ? FIT : FIT_TOP));
        if (bad) { if (k < 2) ok = false; else okTop = false; }
      }
    }
    report.ratio = ratio;
    const names = ['boots', 'middle', 'head and shoulders'];
    rec.ok(`the farmer's iron is the walking iron from his boots to his chest (farmer over walker, r/g/b: ${ratio.slice(0, 2).map((q, k) => names[k] + ' ' + q.join('/')).join(', ')}; within ${Math.round(FIT * 100)}%; before this version boots 1.15/1.13/1.00)${shadeOff ? ' [shade=0]' : ''}`,
      ok, { walk: bw, farm: bf, ratio });
    rec.ok(`...and up to his head (${ratio[2] ? ratio[2].join('/') : '?'}; within ${Math.round(FIT_TOP * 100)}%: his steel forearms cross his chest holding the hoe, drawn darker than the standing figure's pauldrons -- the art's own top third is 11% darker whatever it is graded to)`,
      okTop, ratio[2]);
    if (!shadeOff) {
      /* the probe: his sprites carry the walking figure's shade at his height */
      const fit = fShade && fShade.boots && fShade.walkBoots
        && [0, 1, 2].every((j) => Math.abs(fShade.boots[j] - fShade.walkBoots[j]) < 0.01 && Math.abs(fShade.crown[j] - fShade.walkCrown[j]) < 0.01);
      rec.ok(`...and he carries the walking figure's own shade at his height: at his boots ${fShade && JSON.stringify(fShade.boots)}, at his crown ${fShade && JSON.stringify(fShade.crown)} (the walker's ${fShade && JSON.stringify(fShade.walkBoots)}, ${fShade && JSON.stringify(fShade.walkCrown)})`,
        !!fit, fShade);
    }
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    writeFileSync(join(OUT, 'farmiron.json'), JSON.stringify(report, null, 2));
    await P.ctx.close().catch(() => {});
  }
}
