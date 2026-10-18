/* ═══ v2.3.3424: YOUR DRAWINGS ON THE FARMER ═══
 *
 * The farmer's three moves (the hoe, the can, the kneel) are the owner's own
 * sheets, baked in your skin, trousers and boots -- and, since this, your
 * drawings: the face, chest and arm drawings stamped where
 * tools/make_farm_anims.py measured each on each frame (FARM_ANIMS[a].ink,
 * the shape of the hand-fitted tables in standInInk.js).  On a phone, a bro
 * whose face drawing is its LEFT half in blue, whose chest drawing is green
 * and whose arm drawing is pink goes to his farm, and this reads every frame
 * of all three moves as the game baked it (window.__btFarmFrames), against the
 * same frame of the strip as shipped:
 *   1. the face drawing on every frame, inside the face's box only, and on
 *      its left half (the way it was drawn: he is never drawn flipped);
 *   2. the chest drawing on every frame, inside the chest's box only;
 *   3. the arm drawing on every frame, on BOTH arms -- on the hoe's strike
 *      both hands hold the handle and his arms are one piece of skin, cut in
 *      two at the hands (`armCuts`), and nothing is drawn in that cut;
 *   4. every drawn pixel on his skin;
 *   5. a drawing changed on the farm is baked again: the face drawing redrawn
 *      on its RIGHT half shows on the right on every frame;
 *   6. with greaves on, the body cut for them carries the drawings too;
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/farmink-<move>.png, every frame as baked, 3x.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FARM_ANIMS } from '../../../src/data/farmAnims.js';

const PHONE = { width: 390, height: 844 };
const LEFT_BLUE = Array.from({ length: 256 }, (_, i) => ((i % 16) < 8 ? '8' : '0')).join('');
const RIGHT_BLUE = Array.from({ length: 256 }, (_, i) => ((i % 16) >= 8 ? '8' : '0')).join('');
const ALL_GREEN = '6'.repeat(256);
const ALL_PINK = 'b'.repeat(256);

/* Into storage BEFORE the character exists, so the creator's join carries them
   into the saved record (v2.3.2746).  `__btTrimVerify` keeps the baked
   canvases readable (they are let go of once on the GPU otherwise). */
const SEED = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-facetattoo', ${JSON.stringify(LEFT_BLUE)});
  localStorage.setItem('bt-tattooart', ${JSON.stringify(ALL_GREEN)});
  localStorage.setItem('bt-armtattoo', ${JSON.stringify(ALL_PINK)});
} catch (e) {}
window.__btTrimVerify = true;`;

/* what the reader needs of each move, frame px */
const INK = {};
for (const a of Object.keys(FARM_ANIMS)) {
  const A = FARM_ANIMS[a];
  INK[a] = { url: A.url, under: A.under, fw: A.fw, fh: A.fh, n: A.n, face: A.ink.face, torso: A.ink.torso,
    cuts: A.ink.armCuts, mid: A.crowns.map((c) => c[0]) };
}

/* Every frame of every move as the game baked it, measured against the same
   frame of the shipped strip (the body's, or the one cut for greaves). */
const readFarm = (P, under) => P.page.evaluate(async ({ INK, under, Z }) => {
  const frames = window.__btFarmFrames ? window.__btFarmFrames() : null;
  if (!frames) return { err: 'no farm frames' };
  const load = (url) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
  const isBlue = (d, o) => d[o + 3] > 60 && d[o + 2] > d[o] + 40 && d[o + 2] > d[o + 1] + 20;
  const isGreen = (d, o) => d[o + 3] > 60 && d[o + 1] > d[o] + 30 && d[o + 1] > d[o + 2] + 20;
  const isPink = (d, o) => d[o + 3] > 60 && d[o + 2] > d[o + 1] + 24 && d[o] > 110 && d[o] >= d[o + 2];
  const isSkin = (d, o) => { const r = d[o], g = d[o + 1], b = d[o + 2];
    return d[o + 3] > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25; };
  const out = { moves: {}, pictures: {} };
  for (const a of Object.keys(INK)) {
    const I = INK[a];
    const arr = frames[a];
    if (!Array.isArray(arr) || arr.length !== I.n) { out.moves[a] = { err: 'frames ' + (arr && arr.length) }; continue; }
    const sheet = await load(under ? I.under : I.url);
    if (!sheet) { out.moves[a] = { err: 'the shipped strip did not load' }; continue; }
    const W = I.fw, Hh = I.fh;
    const pic = document.createElement('canvas');
    pic.width = W * I.n * Z; pic.height = Hh * Z;
    const pg = pic.getContext('2d');
    pg.imageSmoothingEnabled = false;
    const rows = [];
    for (let f = 0; f < I.n; f++) {
      const tex = arr[f];
      if (!tex || !tex.source || !tex.source.resource) { rows.push({ f, err: 'no texture' }); continue; }
      const fr = tex.frame, trim = tex.trim || null;
      const draw = (res, sx, sy, sw, sh, dx, dy) => {
        const c = document.createElement('canvas'); c.width = W; c.height = Hh;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.imageSmoothingEnabled = false;
        g.drawImage(res, sx, sy, sw, sh, dx, dy, sw, sh);
        return { c, d: g.getImageData(0, 0, W, Hh).data };
      };
      let got;
      try { got = draw(tex.source.resource, fr.x, fr.y, fr.width, fr.height, trim ? trim.x : 0, trim ? trim.y : 0); }
      catch (e) { rows.push({ f, err: 'unreadable: ' + e.message }); continue; }
      const raw = draw(sheet, f * W, 0, W, Hh, 0, 0).d;
      pg.drawImage(got.c, 0, 0, W, Hh, f * W * Z, 0, W * Z, Hh * Z);
      const fb = I.face[f], tb = I.torso[f], mid = I.mid[f];
      const cut = new Set();
      for (const [x, y0, y1] of (I.cuts[f] || [])) for (let y = y0; y <= y1; y++) cut.add(y * W + x);
      const r = { f, blue: 0, blueOut: 0, blueX: 0, green: 0, greenOut: 0, pinkL: 0, pinkR: 0, inCut: 0, offSkin: 0 };
      const d = got.d;
      for (let o = 0, p = 0; o < d.length; o += 4, p++) {
        const x = p % W, y = (p / W) | 0;
        const b = isBlue(d, o) && !isBlue(raw, o);
        const g = isGreen(d, o) && !isGreen(raw, o);
        const k = isPink(d, o) && !isPink(raw, o);
        if (!b && !g && !k) continue;
        if (!isSkin(raw, o)) r.offSkin++;
        if (b) {
          if (x >= fb[0] && x <= fb[1] && y >= fb[2] && y <= fb[3]) { r.blue++; r.blueX += x; } else r.blueOut++;
        }
        if (g) {
          if (x >= tb[0] && x <= tb[1] && y >= tb[2] && y <= tb[3]) r.green++; else r.greenOut++;
        }
        if (k) {
          if (x < mid) r.pinkL++; else r.pinkR++;
          if (cut.has(p)) r.inCut++;
        }
      }
      /* where the face drawing sits across its box: -1 the left edge, +1 the right */
      const cx = (fb[0] + fb[1]) / 2, hw = (fb[1] - fb[0]) / 2;
      r.side = r.blue ? +(((r.blueX / r.blue) - cx) / hw).toFixed(2) : null;
      delete r.blueX;
      r.cut = (I.cuts[f] || []).length;
      rows.push(r);
    }
    out.moves[a] = { rows };
    out.pictures[a] = pic.toDataURL('image/png');
  }
  return out;
}, { INK, under: !!under, Z: 3 });

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Inkfarmer', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: SEED });
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
  const save = (got, tag) => {
    for (const a of Object.keys(got.pictures || {})) {
      const b64 = String(got.pictures[a]).split(',')[1];
      if (b64) writeFileSync(join(OUT, `farmink-${a}${tag}.png`), Buffer.from(b64, 'base64'));
    }
  };
  const fmt = (rows) => rows.map((r) => (r.err ? `${r.f}:${r.err}` : `${r.f}:${r.blue}/${r.green}/${r.pinkL}+${r.pinkR}`)).join(' ');
  try {
    await H.enterWorld(P);
    const wa = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('the player is in the Wheel (guard)', !!wa, wa);
    if (!wa) return;
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    const art = await P.page.evaluate(() => ({ face: localStorage.getItem('bt-facetattoo'), chest: localStorage.getItem('bt-tattooart'), arm: localStorage.getItem('bt-armtattoo') }));
    rec.ok('he has his three drawings (guard)', art.face === LEFT_BLUE && art.chest === ALL_GREEN && art.arm === ALL_PINK,
      { face: !!art.face, chest: !!art.chest, arm: !!art.arm });

    /* onto the farm: its loading screen bakes the moves */
    await P.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
    const visit = await until(() => P.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }), (v) => !!v, 8000);
    if (visit) await P.page.touchscreen.tap(visit.x, visit.y);
    const onFarm = await until(() => H.readState(P, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') })),
      (v) => v.zone === 'farm_home' && !v.hold && !v.veil, 25000);
    rec.ok('onto the farm (guard)', !!onFarm && onFarm.zone === 'farm_home', onFarm);
    if (!onFarm || onFarm.zone !== 'farm_home') return;
    await until(() => P.page.evaluate(() => !!(window.__btFarmFrames && window.__btFarmFrames())), (v) => v, 8000);

    /* ── 1-4: every frame of the three moves ── */
    const got = await readFarm(P, false);
    rec.ok('the farmer\'s frames can be read (guard)', !got.err && Object.keys(got.moves).length === 3, got.err || Object.keys(got.moves));
    if (got.err) return;
    save(got, '');
    for (const a of Object.keys(FARM_ANIMS)) {
      const m = got.moves[a] || {};
      const rows = (m.rows || []).filter((r) => !r.err);
      console.log(`    ${a}, frame:face/chest/armL+armR: ${fmt(m.rows || [])}`);
      rec.ok(`the ${a}: every frame read (guard)`, rows.length === FARM_ANIMS[a].n, m.err || (m.rows || []).filter((r) => r.err));
      rec.ok(`...his FACE drawing on every frame, inside the face's box only, on its left half as drawn`,
        rows.length > 0 && rows.every((r) => r.blue >= 20 && r.blueOut === 0 && r.side != null && r.side < -0.15),
        rows.map((r) => [r.f, r.blue, r.blueOut, r.side]));
      rec.ok(`...his CHEST drawing on every frame, inside the chest's box only`,
        rows.length > 0 && rows.every((r) => r.green >= 20 && r.greenOut === 0), rows.map((r) => [r.f, r.green, r.greenOut]));
      rec.ok(`...his ARM drawing on every frame, on both arms`,
        rows.length > 0 && rows.every((r) => r.pinkL >= 8 && r.pinkR >= 8), rows.map((r) => [r.f, r.pinkL, r.pinkR]));
      if (rows.some((r) => r.cut)) {
        rec.ok(`...and where both hands hold the hoe, his arms cut apart at the hands, with nothing drawn in the cut (frames ${rows.filter((r) => r.cut).map((r) => r.f).join(', ')})`,
          rows.filter((r) => r.cut).every((r) => r.inCut === 0 && r.pinkL >= 8 && r.pinkR >= 8), rows.filter((r) => r.cut).map((r) => [r.f, r.inCut, r.pinkL, r.pinkR]));
      }
      rec.ok(`...every drawn pixel on his skin`, rows.length > 0 && rows.every((r) => r.offSkin === 0), rows.map((r) => [r.f, r.offSkin]));
    }

    /* ── 5. a drawing changed on the farm ── */
    const seq0 = await P.page.evaluate(() => (window.__btFarmBody || {}).seq || 0);
    await P.page.evaluate((s) => window.__btSetArt('tattooFace', s), RIGHT_BLUE);
    const rebaked = await until(() => P.page.evaluate(() => (window.__btFarmBody || {}).seq || 0), (s) => s > seq0, 8000);
    await P.page.waitForTimeout(300);
    const got2 = await readFarm(P, false);
    const rows2 = Object.keys(FARM_ANIMS).flatMap((a) => ((got2.moves || {})[a] || {}).rows || []).filter((r) => !r.err);
    rec.ok(`his face drawing redrawn on its RIGHT half on the farm: baked again (${seq0} -> ${rebaked}), the right half on every frame of all three moves`,
      rebaked > seq0 && rows2.length === 24 && rows2.every((r) => r.blue >= 20 && r.blueOut === 0 && r.side != null && r.side > 0.15),
      rows2.map((r) => [r.f, r.blue, r.side]));

    /* ── 6. with greaves: the body cut for them carries them too ── */
    await P.page.evaluate(() => window.__btSetGear('legs', 'coppergreaves'));
    const under = await until(() => P.page.evaluate(() => (window.__btFarmBody || {}).under), (u) => u === true, 10000);
    await P.page.waitForTimeout(300);
    const got3 = await readFarm(P, true);
    save(got3, '-greaves');
    const rows3 = Object.keys(FARM_ANIMS).flatMap((a) => ((got3.moves || {})[a] || {}).rows || []).filter((r) => !r.err);
    console.log(`    under greaves, frame:face/chest/armL+armR: ${fmt(rows3)}`);
    rec.ok('with greaves on, the body cut for them carries his drawings: face, chest and both arms on every frame, each in its box',
      under === true && rows3.length === 24 && rows3.every((r) => r.blue >= 20 && r.blueOut === 0 && r.green >= 20 && r.greenOut === 0
        && r.pinkL >= 8 && r.pinkR >= 8 && r.offSkin === 0),
      rows3.map((r) => [r.f, r.blue, r.blueOut, r.green, r.greenOut, r.pinkL, r.pinkR, r.offSkin]));
  } finally {
    stopAlive = true;
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 4));
    await P.ctx.close().catch(() => {});
  }
}
