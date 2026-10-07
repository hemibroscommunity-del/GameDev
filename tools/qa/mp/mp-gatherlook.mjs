/* ═══ v2.3.3145: THE BRO LOOKS LIKE HIMSELF WHILE HE GATHERS ═══
 *
 * The owner, 2026-10-07: "The character's appearance changes during resource
 * gathering activities.  It needs to stay consistent."
 *
 * On a phone (390 x 844, 3x) in the Wheel, a bro dressed before he exists --
 * deep skin, blonde flat-top under a red cap, a blonde beard, a green tee,
 * BLUE trousers and RED boots -- standing, then at each gathering activity:
 *   1. MINING and FISHING keep the cap and the beard sized to the head: drawn
 *      1.116x (mining) and 1.07x (fishing) their standing size against the
 *      body -- the head's own ratio -- where they were 1.21x and 0.88x;
 *   2. FISHING wears his colours: the frame drawn, read where the shipped
 *      fish sheet paints skin, trousers and boots, matches the standing
 *      frame's read the same way (it was the sheet's orange skin, olive
 *      trousers and grey boots) -- and the fishing LINE is still grey, the
 *      ROD still wood;
 *   3. the LUMBERJACK, the COOK and the FIRE-LIGHTER wear his trousers and
 *      boots: the bake's own reading (window.__btStandInClothes) is blue legs
 *      and red boots on each;
 *   4. no page errors.
 * Pictures: tools/qa/mp/out/gatherlook-*.png (standing, before, mid-swing,
 * at the ready and after each harvest; the fire; the cook).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [52, -43] };

const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', 'deep');
  localStorage.setItem('bt-hair', 'flat-top');
  localStorage.setItem('bt-haircolor', 'blonde');
  localStorage.setItem('bt-headwear', 'red-cap');
  localStorage.setItem('bt-facialhair', 'beard');
  localStorage.setItem('bt-beardcolor', 'blonde');
  localStorage.setItem('bt-shirt', 'tshirt');
  localStorage.setItem('bt-shirtcolor', 'green');
  localStorage.setItem('bt-pants', 'blue');
  localStorage.setItem('bt-shoes', 'red');
} catch (e) {}`;

/* mp-harvestbar's walk: H.hopTo's hops, checked against the worker */
async function travel(P, wsPort, myId, tx, ty) {
  const worker = async () => {
    const a = await H.adminPlayer(wsPort, myId).catch(() => null);
    return (a && a.live) || {};
  };
  const here = () => H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const apart = (L, c) => typeof L.x === 'number' && Math.hypot(L.x - c.x, L.y - c.y) > 60;
  for (let leg = 0; leg < 300; leg++) {
    const L = await worker();
    const c = await here();
    if (apart(L, c)) {
      await P.page.waitForTimeout(900);
      const L2 = await worker();
      const c2 = await here();
      if (apart(L2, c2) && Math.hypot(L2.x - L.x, L2.y - L.y) < 2) {
        await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; }, { x: L2.x, y: L2.y });
        await P.page.waitForTimeout(500);
      }
      continue;
    }
    if (Math.hypot(tx - c.x, ty - c.y) < 6) return true;
    await H.hopTo(P, tx, ty, { tries: 4 });
  }
  return false;
}

async function tapNode(P, id, done, tries = 6) {
  for (let i = 0; i < tries; i++) {
    await P.page.evaluate((nid) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.id === nid);
      if (!n) return;
      const cv = document.querySelector('canvas');
      const rc = cv.getBoundingClientRect();
      const x = rc.left + (n.x - S.camera.x) * (S._worldScaleX || 1);
      const y = rc.top + (n.y - 24 - S.camera.y) * (S._worldScaleY || 1);
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })] });
      cv.dispatchEvent(mk('touchstart'));
      cv.dispatchEvent(mk('touchend'));
    }, id);
    await P.page.waitForTimeout(300);
    if (await H.readState(P, done)) return true;
  }
  return false;
}

async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) {
      await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {});
      continue;
    }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it']) {
      const btn = P.page.locator('button:visible', { hasText: t }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) return;
  }
}

const nearestNode = (P, type) => P.page.evaluate((t) => {
  const S = window._gameState.current, p = S.player;
  let best = null, d = Infinity;
  for (const n of S.gatherNodes || []) {
    if (n.nodeType !== t || !n.alive || (n.gatherLvl || 1) !== 1) continue;
    const dd = Math.hypot(n.x - p.x, n.y - p.y);
    if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, d: Math.round(dd) }; }
  }
  return best;
}, type);

/* the cap's and the beard's scale against the body's this frame (v2.3.3145:
   entityRenderer publishes the body scale the traits were placed against) */
const traitSize = (P) => P.page.evaluate(() => {
  const pd = window._pixiRenderer && window._pixiRenderer.playerDisplayRaw ? window._pixiRenderer.playerDisplayRaw() : null;
  if (!pd || !(pd._bodyScale > 0)) return null;
  const k = (s) => (s && s.visible ? +(Math.abs(s.scale.y) / pd._bodyScale).toFixed(4) : null);
  return { pose: pd._animPose || null, hat: k(pd._headwearSprite), beard: k(pd._facialHairSprite) };
});
/* the commonest reading of `pose` over a few frames */
async function traitSizeIn(P, pose, n = 8) {
  const got = [];
  for (let i = 0; i < n * 3 && got.length < n; i++) {
    const t = await traitSize(P);
    if (t && t.pose === pose && t.hat && t.beard) got.push(t);
    await P.page.waitForTimeout(120);
  }
  if (!got.length) return null;
  got.sort((a, b) => a.hat - b.hat);
  return got[Math.floor(got.length / 2)];
}

/* The body frame drawn this frame, read where the SHIPPED sheet (the pose and
   facing it is drawn as, entityRenderer's _lastPoseKey/_lastFacingKey; square
   frames, one row) paints skin, trousers and boots -- the body pipeline's own tests
   (playerSkins _isSkin/_isPants, the boots' flat grey under the trousers) --
   and, on the fish sheet, its line (boot-grey in the frame's left quarter)
   and its rod (the magenta tool key).  The drawn frame is rebuilt whole from
   its crop (v2.3.2791), as mp-harvestink does. */
const readBody = (P) => P.page.evaluate(async () => {
  const pd = window._pixiRenderer && window._pixiRenderer.playerDisplayRaw ? window._pixiRenderer.playerDisplayRaw() : null;
  const sb = pd && pd._spriteBody, tex = sb && sb.texture;
  if (!pd || !tex || !tex.source || !tex.source.resource) return { err: 'no body texture' };
  const src = `/sprites/player/${pd._lastPoseKey}-${pd._lastFacingKey}.png`;
  const idx = pd._animFrame;
  window.__qaSheets = window.__qaSheets || {};
  let sheet = window.__qaSheets[src];
  if (!sheet) {
    sheet = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    window.__qaSheets[src] = sheet;
  }
  if (!sheet) return { err: 'sheet' };
  const f = tex.frame, o = tex.orig || f, tr = tex.trim || null;
  const W = Math.round(o.width), Hh = Math.round(o.height);
  const draw = (res, sx, sy, sw, sh, dx, dy, dw, dh) => {
    const c = document.createElement('canvas'); c.width = W; c.height = Hh;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(res, sx, sy, sw, sh, dx, dy, dw, dh);
    return g.getImageData(0, 0, W, Hh).data;
  };
  let got;
  try {
    got = draw(tex.source.resource, f.x, f.y, f.width, f.height, tr ? tr.x : 0, tr ? tr.y : 0, tr ? f.width : W, tr ? f.height : Hh);
  } catch (e) { return { err: 'unreadable' }; }
  const sfw = sheet.naturalHeight;
  const raw = draw(sheet, ((typeof idx === 'number' ? idx : 0) * sfw) % (sheet.naturalWidth || sfw), 0, sfw, sfw, 0, 0, W, Hh);
  const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
  const isPants = (r, g, b, a) => a > 180 && g >= r - 10 && g > b + 8 && r < 150;
  const isGrey = (r, g, b, a) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return a > 180 && (mx - mn) < 28 && mx >= 45 && mx < 140; };
  const isKey = (r, g, b, a) => {
    if (a < 77) return false;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 46 || mx - mn < mx * 0.4) return false;
    let h;
    if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4);
    if (h < 0) h += 360;
    return h >= 315 && h <= 350;
  };
  /* the trousers' columns and top, for the boots */
  let lx0 = W, lx1 = -1, ly0 = Hh;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const q = (y * W + x) * 4;
    if (isPants(raw[q], raw[q + 1], raw[q + 2], raw[q + 3])) { if (x < lx0) lx0 = x; if (x > lx1) lx1 = x; if (y < ly0) ly0 = y; }
  }
  const toe = Math.round(W / 16);
  const acc = { skin: [0, 0, 0, 0], pants: [0, 0, 0, 0], boots: [0, 0, 0, 0] };
  let line = 0, lineGrey = 0, rod = 0, rodWood = 0;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const q = (y * W + x) * 4;
    const r = raw[q], g = raw[q + 1], b = raw[q + 2], a = raw[q + 3];
    const R = got[q], G = got[q + 1], B = got[q + 2], A = got[q + 3];
    if (A < 200) continue;
    let k = null;
    if (isSkin(r, g, b, a)) k = 'skin';
    else if (isPants(r, g, b, a)) k = 'pants';
    else if (isGrey(r, g, b, a)) {
      if (x < W / 4) { line++; if (Math.abs(R - G) < 14 && Math.abs(G - B) < 14) lineGrey++; continue; }
      if (y >= ly0 && x >= lx0 - toe && x <= lx1 + toe) k = 'boots';
    } else if (isKey(r, g, b, a)) { rod++; if (R >= G && G >= B) rodWood++; continue; }
    if (!k) continue;
    const s = acc[k]; s[0]++; s[1] += R; s[2] += G; s[3] += B;
  }
  const mean = (s) => (s[0] ? { n: s[0], rgb: [Math.round(s[1] / s[0]), Math.round(s[2] / s[0]), Math.round(s[3] / s[0])] } : { n: 0 });
  return { pose: pd._animPose, sheet: src, frame: idx, skin: mean(acc.skin), pants: mean(acc.pants), boots: mean(acc.boots),
    line: { n: line, grey: line ? +(lineGrey / line).toFixed(3) : null }, rod: { n: rod, wood: rod ? +(rodWood / rod).toFixed(3) : null } };
});
const near = (a, b, tol) => !!a && !!b && a.n > 20 && b.n > 20 && a.rgb.every((v, i) => Math.abs(v - b.rgb[i]) <= tol);
const isBlue = (c) => !!c && c.n > 200 && c.rgb[2] > c.rgb[0] + 40 && c.rgb[2] > c.rgb[1] + 20;
const isRed = (c) => !!c && c.n > 100 && c.rgb[0] > c.rgb[1] + 40 && c.rgb[0] > c.rgb[2] + 40;

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Lookbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: LOOK });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  /* a picture round the bro: 150 x 170 CSS px over his feet -- or over the
     lumberjack's, the cook's or the fire-lighter's, who stand where their
     work is (the trunk, beside the fire), bottom-anchored */
  const shot = async (name) => {
    const c = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const r = document.querySelector('canvas').getBoundingClientRect();
      const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
      let wx = d ? d.x : S.player.x, wy = d ? d.footY : S.player.y;
      if (S._standInBody === true) {
        for (const k of ['__btChopFigure', '__btCookFigure', '__btFireFigure']) {
          const f = window[k] ? window[k]() : null;
          if (f && f.visible) { wx = f.x; wy = f.y; break; }
        }
      }
      return { x: r.left + (wx - S.camera.x) * (S._worldScaleX || 1), y: r.top + (wy - S.camera.y) * (S._worldScaleY || 1),
        pose: (() => { const pd = window._pixiRenderer && window._pixiRenderer.playerDisplayRaw ? window._pixiRenderer.playerDisplayRaw() : null; return pd ? pd._animPose || null : null; })(),
        hid: S._standInBody === true };
    });
    const W = 150, Hh = 170;
    const clip = { x: Math.max(0, Math.min(PHONE.width - W, Math.round(c.x - W / 2))), y: Math.max(0, Math.min(PHONE.height - Hh, Math.round(c.y - 125))), width: W, height: Hh };
    await P.page.screenshot({ path: join(OUT, `gatherlook-${name}.png`), clip }).catch(() => {});
    console.log(`    shot ${name}: pose ${c.pose} standInBody ${c.hid}`);
  };
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 120000, label: 'into the Wheel, its nodes in' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]), [data-coach],[data-coach-card],[data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
    for (const k of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await H.waitFor(P, (S) => ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
      (n) => n === 3, { timeout: 20000, label: 'the tools' }).catch(() => 0);
    await closeTalk(P);
    await P.page.waitForTimeout(1500);
    await shot('0-stand');
    await P.page.evaluate(() => { window.__btProbe = true; });
    const standT = await traitSizeIn(P, 'stand');
    const standB = await readBody(P);
    rec.ok('standing: his cap and beard, his skin, blue trousers and red boots read off the frame drawn (guard)',
      !!standT && isBlue(standB.pants) && isRed(standB.boots) && standB.skin.n > 200, { standT, standB });

    /* one harvest of `type` at the nearest tier-1 node: a picture before, four
       mid-swing, one at the ready (the gesture's pose) and one after */
    let treeAt = null;
    const work = async (type) => {
      const n = await nearestNode(P, type);
      if (!n) { console.log(`    no ${type}`); return; }
      if (type === 'tree') treeAt = n;
      await travel(P, wsPort, myId, n.x + STAND[type][0], n.y + STAND[type][1]);
      await closeTalk(P);
      await P.page.waitForTimeout(800);
      await shot(`1-${type}-before`);
      await P.page.evaluate(() => { const S = window._gameState.current; S._monstersStash = S.monsters; S.monsters = []; });
      const ok = await tapNode(P, n.id, (S) => !!S._extraction);
      console.log(`    ${type}: started ${ok}`);
      for (let k = 0; k < 4; k++) {
        await P.page.waitForTimeout(450);
        await shot(`2-${type}-${k}`);
      }
      if (type === 'oreVein' || type === 'fishSpot') {
        const pose = type === 'oreVein' ? 'mine' : 'fish', want = type === 'oreVein' ? 1.116 : 1.07;
        const t = await traitSizeIn(P, pose);
        const hatK = t && standT ? t.hat / standT.hat : null, beardK = t && standT ? t.beard / standT.beard : null;
        rec.ok(`${type === 'oreVein' ? 'mining' : 'fishing'}: the cap and the beard drawn ${hatK && hatK.toFixed(3)}x / ${beardK && beardK.toFixed(3)}x their standing size against the body -- the head's own ${want} (was ${type === 'oreVein' ? '1.21' : '0.88'})`,
          !!hatK && Math.abs(hatK - want) < 0.01 && Math.abs(beardK - want) < 0.01, { t, standT });
        if (type === 'fishSpot') {
          const fishB = await readBody(P);
          rec.ok(`fishing wears his colours: skin ${fishB.skin && fishB.skin.rgb} (standing ${standB.skin.rgb}), trousers ${fishB.pants && fishB.pants.rgb} (${standB.pants.rgb}), boots ${fishB.boots && fishB.boots.rgb} (${standB.boots.rgb}) -- not the sheet's orange, olive and grey`,
            fishB.pose === 'fish' && near(fishB.skin, standB.skin, 30) && isBlue(fishB.pants) && near(fishB.pants, standB.pants, 35) && isRed(fishB.boots) && near(fishB.boots, standB.boots, 35), { fishB, standB });
          const pct = (v) => (v == null ? '-' : Math.round(v * 100) + '%');
          rec.ok(`...the fishing line still grey (${pct(fishB.line && fishB.line.grey)} of its ${fishB.line && fishB.line.n} px) and the rod still wood (${pct(fishB.rod && fishB.rod.wood)} of its ${fishB.rod && fishB.rod.n})`,
            !!fishB.line && fishB.line.n > 20 && fishB.line.grey >= 0.95 && !!fishB.rod && fishB.rod.n > 50 && fishB.rod.wood >= 0.9, fishB);
        }
      }
      if (type === 'tree') {
        const c = await P.page.evaluate(() => (window.__btStandInClothes || {}).chop || null);
        rec.ok(`the lumberjack wears his trousers and boots: legs ${c && c.legs.rgb}, boots ${c && c.boots.rgb} (the bake's reading)`,
          !!c && isBlue(c.legs) && isRed(c.boots), c);
      }
      const ready = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
        { timeout: 40000, label: 'ready' }).catch(() => null);
      if (ready) { await P.page.waitForTimeout(400); await shot(`3-${type}-ready`); }
      await P.page.evaluate(() => { const S = window._gameState.current; S._extraction = null;
        if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; } });
      await P.page.waitForTimeout(800);
      await shot(`4-${type}-after`);
    };
    await work('oreVein');
    await work('tree');

    /* a fire, then a cook -- on dry ground, south of the tree's chopping spot
       (mp-gatherposes' place: a tap on the fire is not a tap on the tree) */
    await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 2 }).catch(() => {});
    await H.grant(wsPort, myId, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => {});
    await H.waitFor(P, () => window.__btStandIns && window.__btStandIns().fire, (v) => v && v.state === 'ready', { timeout: 30000, label: 'fire-lighter' }).catch(() => null);
    if (treeAt) await travel(P, wsPort, myId, treeAt.x + STAND.tree[0], treeAt.y + STAND.tree[1] + 240);
    await H.waitFor(P, (S) => !S._firemaking, (v) => v, { timeout: 5000, label: 'no light under way' }).catch(() => {});
    await P.page.evaluate(() => {
      const bus = window._itemDetailBus;
      const S = window._gameState && window._gameState.current;
      if (bus && S && S.rpg) bus.open({ kind: 'inventory', key: 'wood_pine_log', count: (S.rpg.inventory || {}).wood_pine_log || 0 });
    });
    await P.page.locator('button:visible', { hasText: 'Light fire' }).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await P.page.waitForTimeout(1500);
    const lit = await P.page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /Light fire/.test(x.textContent || '') && x.offsetParent);
      if (b) b.click();
      return !!b;
    });
    console.log(`    light fire: ${lit}`);
    for (let k = 0; k < 2; k++) { await P.page.waitForTimeout(220); await shot(`5-fire-${k}`); }
    const fc = await H.waitFor(P, () => (window.__btStandInClothes || {}).fire || null, (v) => !!v, { timeout: 15000, label: 'the fire-lighter baked' }).catch(() => null);
    rec.ok(`the fire-lighter wears his trousers and boots: legs ${fc && fc.legs.rgb}, boots ${fc && fc.boots.rgb} (the bake's reading)`,
      !!fc && isBlue(fc.legs) && isRed(fc.boots), fc);
    await P.page.keyboard.press('Escape').catch(() => {});
    const camp = await H.waitFor(P, (S) => ({ fire: !!S._campfire, lighting: !!S._firemaking, cook: window.__btStandIns().cook }),
      (v) => v.fire && !v.lighting && v.cook.state === 'ready', { timeout: 20000, label: 'a campfire, and the cook made' }).catch(() => null);
    console.log(`    campfire: ${JSON.stringify(camp)}`);
    if (camp) {
      const at = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const n = S._campfire;
        if (!n) return null;
        const r = document.querySelector('canvas').getBoundingClientRect();
        return { x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) };
      });
      await P.page.waitForTimeout(400);
      if (at) await P.page.touchscreen.tap(at.x, at.y);
      const cooking = await H.waitFor(P, (S) => (S._extraction ? S._extraction.skill : null), (v) => v === 'cooking',
        { timeout: 6000, label: 'a cook' }).catch(() => null);
      console.log(`    cooking: ${cooking}`);
      for (let k = 0; k < 3; k++) { await P.page.waitForTimeout(450); await shot(`6-cook-${k}`); }
      const cc = await P.page.evaluate(() => (window.__btStandInClothes || {}).cook || null);
      rec.ok(`the cook wears his trousers and boots: legs ${cc && cc.legs.rgb}, boots ${cc && cc.boots.rgb} (the bake's reading)`,
        !!cc && isBlue(cc.legs) && isRed(cc.boots), cc);
      await P.page.evaluate(() => { const S = window._gameState.current; S._extraction = null; });
    }

    /* fishing last: its seat is by the water, and the walk away from it can
       end in the river */
    await work('fishSpot');
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}
