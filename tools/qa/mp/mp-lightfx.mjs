/* LIGHT AND SHINE (v2.3.2710).
 *
 * Owner: "I'm wondering if you can enhance the art in the game just using your
 * code abilities.  Maybe subtle shadowing to make things pop, adding
 * material-specific textures or shine" -- then "go ahead, build 1 and 2":
 *
 *   1. shadows cast by each map's own sun (rendering/lightfx/shadows.js), and
 *   2. metal that catches the light, by grade (rendering/lightfx/glint.js).
 *
 * Behind a switch (?lightfx=0 turns it off on a device), on for everyone from
 * v2.3.2711 -- the owner saw it and said "Push it to main with the switch on".
 * The first claims are about the switch: on by default, and off draws nothing
 * and costs nothing.  Then the claims that make it a shadow
 * rather than a blob: it hangs off the FEET (the slime's was "way beneath the
 * monster", v2.3.1704), it falls the way the town painting's shadows fall, it
 * lies under everything that stands on the ground, and it survives a sword
 * swing (the body is swapped for a stand-in figure then, and a shadow that
 * blinked off every attack would be worse than none).  Then the glint, then
 * another zone's light, then a zone with no sun at all.
 *
 * Before/after pictures of the same moment go to /tmp/qa-lightfx/ for the
 * owner -- the verdict on how it LOOKS is theirs, and the pictures are what
 * they judge it from.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const DIR = '/tmp/qa-lightfx';
const PHONE = { width: 390, height: 844 };
/* The coach tips cover the lower half of a phone screen, which is exactly
   where a lower-right shadow falls -- same init mp-ahshot uses for pictures. */
const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
      'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const d = {}; for (const k of l) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
};

const probe = (P) => P.page.evaluate(() => (window.__btLightFx ? window.__btLightFx.probe() : null));
const setFx = (P, on) => P.page.evaluate((v) => { if (window.__btLightFx) window.__btLightFx.set(v); }, on);
const glintAt = (P, p) => P.page.evaluate((v) => { if (window.__btLightFx) window.__btLightFx.glint(v); }, p);

/* World point -> page CSS px, asked of the scene graph itself (the world
   container's own transform, camera and zoom included) rather than rebuilt
   from S.camera -- the first cut rebuilt it and measured the wrong patch. */
const toScreen = (P, wx, wy) => P.page.evaluate(({ wx, wy }) => {
  const R = window._pixiRenderer;
  const find = (n, label) => { if (n.label === label) return n; for (const c of (n.children || [])) { const f = find(c, label); if (f) return f; } return null; };
  const tiles = find(R.app.stage, 'tiles');
  const world = tiles && tiles.parent;
  const g = world.toGlobal({ x: wx, y: wy });
  const g2 = world.toGlobal({ x: wx + 100, y: wy });
  const r = document.querySelector('canvas').getBoundingClientRect();
  return { x: r.left + g.x, y: r.top + g.y, k: (g2.x - g.x) / 100 };
}, { wx, wy });

/* Where the local figure's feet REALLY are: render the figure alone (no name
   plate, no bars, no weapon) and find its lowest opaque row.  The row order of
   the read-back is established first on a 1x4 probe with only its TOP row
   opaque -- a GL read-back can come back bottom-up, and a figure that happens
   to sit centred in its frame measures the same either way, which is how a
   wrong answer can pass (one did, while this was being written). */
const measureFeet = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer;
  const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
  if (!d || !R.app) return null;
  const any = d._spriteBody;
  const SpriteC = any.constructor, TextureC = any.texture.constructor;
  const cv = document.createElement('canvas'); cv.width = 1; cv.height = 4;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1, 1);
  const pt = new SpriteC(TextureC.from(cv));
  const pp = R.app.renderer.extract.pixels({ target: pt, resolution: 1 });
  const topDown = pp.pixels[3] > 128;           /* row 0 of the buffer is the top */
  pt.destroy();
  const ui = d._uiLayer, wc = d._weaponContainer;
  const uiV = ui ? ui.visible : null, wcV = wc ? wc.visible : null;
  if (ui) ui.visible = false;
  if (wc) wc.visible = false;
  let out = null;
  try {
    const lb = d.getLocalBounds();
    const { pixels, width, height } = R.app.renderer.extract.pixels({ target: d, frame: lb.rectangle, resolution: 1 });
    const rowOpaque = (r) => { for (let x = 0; x < width; x++) if (pixels[(r * width + x) * 4 + 3] > 128) return true; return false; };
    let low = -1;   /* lowest opaque row, in top-down terms */
    for (let i = 0; i < height && low < 0; i++) {
      const bufRow = topDown ? height - 1 - i : i;   /* scan from the visual bottom up */
      if (rowOpaque(bufRow)) low = height - 1 - i;
    }
    const localBottom = lb.y + low + 1;
    out = { topDown, localBottom, displayY: d.y, scaleY: d.scale.y, feetY: d.y + localBottom * d.scale.y };
  } catch (e) { out = { err: String(e) }; }
  if (ui) ui.visible = uiV;
  if (wc) wc.visible = wcV;
  return out;
});

/* A STANDING NPC's true feet, read straight off its picture: the lowest opaque
   row of the frame, placed through the sprite's anchor and scale.  Walking NPCs
   are left out on purpose -- their strides lift the feet off the ground line
   by up to ten world px (lil-bro-walk-south, measured), and the shadow is
   right to stay on the ground while they do. */
const npcTrueFeet = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer; const stage = R.app.stage;
  const find = (n, pred, out) => { if (pred(n)) out.push(n); for (const c of (n.children || [])) find(c, pred, out); return out; };
  const figs = find(stage, (n) => n._fig && n._figSrc && n.visible && n._figSrc.indexOf('-walk') < 0, []);
  const cv = document.createElement('canvas'); const cx = cv.getContext('2d', { willReadFrequently: true });
  return figs.map((d) => {
    const f = d._fig, t = f.texture, fr = t.frame, res = t.source && t.source.resource;
    let low = -1;
    try {
      cv.width = fr.width; cv.height = fr.height; cx.clearRect(0, 0, fr.width, fr.height);
      cx.drawImage(res, fr.x, fr.y, fr.width, fr.height, 0, 0, fr.width, fr.height);
      const px = cx.getImageData(0, 0, fr.width, fr.height).data;
      for (let y = fr.height - 1; y >= 0 && low < 0; y--) for (let x = 0; x < fr.width; x++) if (px[(y * fr.width + x) * 4 + 3] > 128) { low = y; break; }
    } catch (e) { return null; }
    return { x: d.x, src: d._figSrc, feetY: d.y + ((low + 1) - f.anchor.y * fr.height) * f.scale.y * d.scale.y };
  }).filter(Boolean);
});

/* Mean luminance of a CSS-px box in a full-page PNG taken at dpr 2.  Read
   through the decoder's own at(): a screenshot is opaque, so it decodes as
   THREE channels, and indexing it as RGBA reads the wrong bytes (the first cut
   did, and measured no shadow under a shadow that was plainly there). */
function meanLum(img, box) {
  const s = 2;
  let sum = 0, n = 0;
  for (let y = Math.max(0, Math.round(box.y * s)); y < Math.min(img.height, Math.round((box.y + box.h) * s)); y++) {
    for (let x = Math.max(0, Math.round(box.x * s)); x < Math.min(img.width, Math.round((box.x + box.w) * s)); x++) {
      const [r, g, b] = img.at(x, y);
      sum += 0.299 * r + 0.587 * g + 0.114 * b; n++;
    }
  }
  return n ? sum / n : 0;
}

async function pictures(P, tag) {
  await setFx(P, false);
  await P.page.waitForTimeout(350);
  const off = await P.page.screenshot({ path: `${DIR}/${tag}-off.png` });
  await setFx(P, true);
  await P.page.waitForTimeout(350);
  const on = await P.page.screenshot({ path: `${DIR}/${tag}-on.png` });
  return { off: H.decodePng(off), on: H.decodePng(on) };
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(DIR, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Sunny', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, init: COACH_OFF });
  await H.enterWorld(A);
  await A.page.waitForTimeout(2000);
  /* a copper greatsword in hand (the dev kit's), so the swing uses the real
     stand-in figure and the glint has metal to catch */
  const myId = await H.readState(A, (S) => S.myId);
  await H.devOp(wsPort, 'kit', myId, { what: 'weapons' });
  await A.page.waitForTimeout(1200);
  await H.equipWeapon(A, 'greatsword', 'weapon', 'melee');
  await A.page.waitForTimeout(1200);
  /* open cobble a step from the Mayor, so the picture has a player and an
     NPC side by side and nothing standing on the patch the shadow falls on */
  await H.hopTo(A, 1105, 1085).catch(() => {});
  await A.page.waitForTimeout(1500);
  /* the dashboard sheet covers the bottom third of a phone -- close it for
     the pictures */
  await H.clickText(A, 'CLOSE').catch(() => {});
  await A.page.waitForTimeout(600);

  /* ── 0. the switch ── */
  const p0 = await probe(A);
  rec.ok('the light-and-shine probe is present (guard)', !!p0, p0);
  /* v2.3.2711: owner, having seen it -- "Push it to main with the switch on". */
  rec.ok('the switch is ON by default: a fresh device gets light and shine', !!p0 && p0.on === true, p0 && p0.on);
  await setFx(A, false);
  await A.page.waitForTimeout(300);
  const pOff = await probe(A);
  rec.ok('...and switched off it draws nothing: no shadow pieces, no filter pass, no glint',
    !!pOff && !pOff.on && pOff.shadows && pOff.shadows.pieces === 0 && !pOff.shadows.filtered && pOff.glint.lit === 0, pOff);

  const order = await A.page.evaluate(() => window.__btLayerOrder || []);
  const iS = order.indexOf('shadows');
  rec.ok('the shadow layer lies ON the ground: over the map, footprints and splatter',
    iS > order.indexOf('tiles') && iS > order.indexOf('groundDetails') && iS > order.indexOf('groundSplatter'), order);
  rec.ok('...and UNDER everything that stands on it, and under the loot and attack rings a player must read',
    iS >= 0 && iS < order.indexOf('groundLoot') && iS < order.indexOf('telegraphs')
      && iS < order.indexOf('entities') && iS < order.indexOf('player'), order);

  /* ── 1. town: on ── */
  const town = await pictures(A, 'town');
  const p1 = await probe(A);
  console.log('    town, on: ' + JSON.stringify({ ...p1, shadows: { ...p1.shadows, list: undefined } }));
  rec.ok('switched on in town, the player casts a shadow through ONE filter pass',
    !!p1 && p1.on && p1.shadows.casters >= 1 && p1.shadows.pieces >= 2 && p1.shadows.filtered && !!p1.shadows.self,
    p1 && p1.shadows);
  rec.ok('...and so do the townsfolk',
    !!p1 && p1.shadows.list.some((c) => c.key.indexOf('n:') === 0), p1 && p1.shadows.list.map((c) => c.key));
  rec.ok('every stand-in sprite the shadow reads off the effects renderer still exists by that name',
    !!p1 && Array.isArray(p1.missingStandIns) && p1.missingStandIns.length === 0, p1 && p1.missingStandIns);
  rec.ok('...in the town painting\'s light: sun upper-left, shadow falling lower-right',
    !!(p1 && p1.light && p1.light.lx > 0 && p1.light.ly > 0), p1 && p1.light);

  /* it hangs off the feet */
  const feet = await measureFeet(A);
  const piv = p1 && p1.shadows.self;
  console.log('    feet: ' + JSON.stringify(feet) + ' pivot: ' + JSON.stringify(piv));
  rec.ok('the player\'s shadow hangs off his FEET: within 3 world px of the lowest drawn pixel',
    !!(feet && piv && Number.isFinite(feet.feetY) && Math.abs(piv.py - feet.feetY) <= 3),
    { pivotY: piv && piv.py, feetY: feet && feet.feetY, displayY: feet && feet.displayY, topDown: feet && feet.topDown });
  const npcFeet = await npcTrueFeet(A);
  const npcPivots = p1.shadows.list.filter((c) => c.key.indexOf('n:') === 0);
  const pairs = npcFeet.map((t) => {
    const c = npcPivots.reduce((b, q) => (!b || Math.abs(q.px - t.x) < Math.abs(b.px - t.x) ? q : b), null);
    return c ? { src: t.src, gap: +Math.abs(t.feetY - c.py).toFixed(2) } : null;
  }).filter(Boolean);
  const worstNpc = pairs.reduce((w, q) => Math.max(w, q.gap), 0);
  rec.ok('...and each standing NPC\'s off its own feet (within 4 world px, read off the NPC\'s picture)',
    pairs.length > 0 && worstNpc <= 4, pairs);

  /* it falls the way the light says: darker below-right of the feet than
     above-left, measured on the same frame with the switch off and on */
  if (piv) {
    const f = await toScreen(A, piv.px, piv.py);
    const k = f.k;
    const lr = { x: f.x + 6 * k, y: f.y + 2 * k, w: 22 * k, h: 14 * k };
    const ul = { x: f.x - 28 * k, y: f.y - 16 * k, w: 22 * k, h: 14 * k };
    const dLR = meanLum(town.off, lr) - meanLum(town.on, lr);
    const dUL = meanLum(town.off, ul) - meanLum(town.on, ul);
    console.log('    darkening lower-right ' + dLR.toFixed(1) + ', upper-left ' + dUL.toFixed(1));
    rec.ok('the shadow darkens the ground below-right of the feet, and not above-left',
      dLR > 6 && dLR > dUL + 4, { lowerRight: +dLR.toFixed(1), upperLeft: +dUL.toFixed(1) });
  }

  /* ── 2. a swing: the body is replaced by a stand-in, the shadow stays ── */
  const swing = await A.page.evaluate(() => new Promise((res) => {
    const S = window._gameState.current;
    S.lockedTarget = null;
    if (S.player) { S.player.vx = 0; S.player.vy = 0; }
    S.isSwinging = true; S.swingTimer = Date.now(); S._swingAng = 0;
    setTimeout(() => {
      const R = window._pixiRenderer;
      const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
      res({ bodyHidden: !!(d && !d.visible), p: window.__btLightFx.probe() });
    }, 120);
  }));
  console.log('    mid-swing: ' + JSON.stringify({ bodyHidden: swing.bodyHidden, self: swing.p.shadows.self }));
  rec.ok('mid-swing the shadow is still there, cast by the swing figure itself (not a held copy)',
    !!(swing.p.shadows.self && swing.p.shadows.self.pieces > 0 && swing.p.shadows.self.held === false
      && swing.p.shadows.self.standIns > 0),
    { self: swing.p.shadows.self });
  await A.page.waitForTimeout(800);

  /* ── 3. the glint ── */
  const wpn = await A.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    return { active: R.activeSlot, type: R.weapon && R.weapon.type, base: R.weapon && R.weapon.gearBase, quality: R.weapon && R.weapon.quality };
  });
  console.log('    weapon: ' + JSON.stringify(wpn));
  const pg = await probe(A);
  const metal = /^(sword|greatsword)$/.test(wpn.type || '') && ['copper', 'iron', 'steel'].indexOf(wpn.base) >= 0;
  if (metal && (wpn.active || 'melee') === 'melee') {
    rec.ok('a metal sword in hand is a glint target', pg.glint.targets >= 1, pg.glint);
    await glintAt(A, 0.5);
    await A.page.waitForTimeout(250);
    const pl = await probe(A);
    rec.ok('...and mid-sweep it carries the glint filter', pl.glint.lit >= 1, pl.glint);
    const bw = await H.figureBox(A, { pad: 40 });
    if (bw) await A.page.screenshot({ path: `${DIR}/glint-on.png`, clip: bw });
    /* the same moment at the best grade, for the picture -- a RENDER test:
       the grade is set on this client only, the worker never sees it */
    await A.page.evaluate(() => { window._gameState.current.rpg.weapon.quality = 'godly'; });
    await A.page.waitForTimeout(250);
    if (bw) await A.page.screenshot({ path: `${DIR}/glint-godly.png`, clip: bw });
    await glintAt(A, null);
    await A.page.evaluate((q) => { window._gameState.current.rpg.weapon.quality = q; }, wpn.quality || undefined);
    await setFx(A, false);
    await A.page.waitForTimeout(250);
    if (bw) await A.page.screenshot({ path: `${DIR}/glint-off.png`, clip: bw });
    await setFx(A, true);
    await A.page.waitForTimeout(250);
  } else {
    rec.ok('a starting weapon that is not metal is not a glint target', pg.glint.targets === 0, { wpn, glint: pg.glint });
  }

  /* ── 4. the cost, with the switch on in a town full of people ── */
  const cost = await A.page.evaluate(() => new Promise((res) => {
    const xs = []; let n = 0;
    const tick = () => { const p = window.__btLightFx.probe(); xs.push(p.ms); if (++n < 60) requestAnimationFrame(tick); else res(xs); };
    requestAnimationFrame(tick);
  }));
  const avg = cost.reduce((a, b) => a + b, 0) / Math.max(1, cost.length);
  console.log('    lightFx ms/frame: avg ' + avg.toFixed(3) + ' max ' + Math.max(...cost).toFixed(3));
  rec.ok('the per-frame JS cost is small (avg under 1.5 ms on the QA box)', avg < 1.5, { avg: +avg.toFixed(3) });

  /* ── 5. another painting, its own light ──
     Wind Dunes: the hardest sun in the game, so the longest, darkest shadow.
     (Frost Ridge was the first choice and its snowmen make every picture a
     fight scene.)  The photographer is made unkillable and stood on the open
     sand in the middle of the map (read off the painting). */
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 });
  await H.warpToZone(A, { wsPort, label: 'Wind Dunes', zoneId: 'sky' });
  await A.page.waitForTimeout(1500);
  await H.hopTo(A, 560, 560).catch(() => {});
  await A.page.waitForTimeout(1500);
  if ((await H.readState(A, (S) => S.currentZone)) !== 'sky') {
    await H.warpToZone(A, { wsPort, label: 'Wind Dunes', zoneId: 'sky' });   /* walked out: back in, stay at the gate */
  }
  await H.clickText(A, 'CLOSE').catch(() => {});
  await A.page.waitForTimeout(400);
  await pictures(A, 'dunes');
  const pm = await probe(A);
  rec.ok('in the Wind Dunes the shadow follows the DESERT\'s light: longer and darker than town\'s',
    !!pm && pm.zone === 'sky' && !!pm.light && pm.light.lx > 0.5 && pm.light.alpha > 0.38 && pm.shadows.pieces > 0,
    pm && { zone: pm.zone, light: pm.light, pieces: pm.shadows.pieces });

  /* ── 6. a zone with no sun: nothing drawn, no pass ── */
  await H.warpToZone(A, { wsPort, label: 'Flame Fields', zoneId: 'ember' });
  await A.page.waitForTimeout(1200);
  const ph = await probe(A);
  rec.ok('in the Flame Fields, lit by lava rather than a sun, nothing casts and the filter pass is gone',
    !!ph && ph.zone === 'ember' && ph.light === null && ph.shadows.pieces === 0 && !ph.shadows.filtered,
    ph && { zone: ph.zone, light: ph.light, shadows: ph.shadows });

  /* ── 7. and off again means off ── */
  await setFx(A, false);
  await A.page.waitForTimeout(300);
  const pz = await probe(A);
  rec.ok('switched back off, everything is gone again',
    !!pz && !pz.on && pz.shadows.pieces === 0 && !pz.shadows.filtered && pz.glint.lit === 0, pz);

  await A.ctx.close();
}
