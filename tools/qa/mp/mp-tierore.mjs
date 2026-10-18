/* ═══ v2.3.3345: EACH METAL ITS OWN ROCK, ON A PHONE ═══
 *
 * The owner's five ore rocks (game/tierOre.js, src/data/oreArt.js): copper on
 * the commons, then iron, black steel, titanium and obsidian out along one
 * land's spoke, each its own picture at its own size.  On a phone (390 x 844,
 * 3x) in the Wheel, with the pickaxe in the bag, walking out from BroTown to a
 * vein of every tier:
 *   1. it is drawn with ITS OWN picture (the file oreArt.js names), at its own
 *      size (half the picture's px: 2 a game px), untinted;
 *   2. its rock stands where tierOre.js says (`oreGeom`), and the depth line
 *      (`_groundDy`) is the rock's base;
 *   3. its name label hangs over its top, and held in a harvest the bar under
 *      its base, on the screen;
 *   4. seated to mine it, the rock baked into the miner's swing (the
 *      mine-south sheet's ground under his boots) is under the vein's solid
 *      pixels in every frame of the swing -- taken through the body sprite's
 *      own transform into the vein's picture, pixel by pixel -- and the
 *      miner's head stays over the rock;
 *   5. the rock stops you: from in front of it, walking north into it stops
 *      short of its middle;
 * and a REAL mine of the copper and the obsidian (a tap, the worker's hits,
 * the gesture) puts their ore in the bag, read from the worker.
 * Pictures: tools/qa/mp/out/tierore-<metal>.png and -<metal>-mine.png.
 *
 *   node tools/qa/mp/run.mjs tierore
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const PX = 0.5;
/* the mine-south sheet's 128 px frames: the rock baked under the boots fills
   its rows from here down (the legs end on 95; a strike's chips fly out
   beside it on rows 99-126) -- measured off public/sprites/player/mine-south.png */
const SHEET_FW = 128, BAKED_ROW = 97;
/* the swing's frames at rest (the raised pick and its return): the baked rock
   alone, no chips flying (frames 5-11 are the blow's) */
const REST_FRAMES = [0, 1, 2, 3, 4, 12, 13];
/* the miner, seated (MINE_SEAT_DY 86, drawn 8 px higher): his shoulders ~111
   world px over the vein's point and his head 114-136 (measured off the swing
   through the body's own transform: mp-tierore's first run) -- no rock is
   drawn higher than game/tierOre.js ORE_TOP_MAX_UP, under them */
const SHOULDERS_UP = 111;
/* tierOre.js's own geometry for a picked vein (its tier is `lvl` here, the
   node's gatherLvl in the game) */
const geo = (t) => oreGeom({ x: t.x, y: t.y, gatherLvl: t.lvl });
const METALS = [[1, 'copper'], [6, 'iron'], [11, 'blacksteel'], [16, 'titanium'], [21, 'obsidian']];

import { ORE_ART } from '../../../src/data/oreArt.js';
import { oreGeom } from '../../../src/game/tierOre.js';

/* mp-tiertrees' walk: H.hopTo's 100 px a hop, checked against the worker */
async function travel(P, wsPort, myId, tx, ty) {
  const worker = async () => {
    const a = await H.adminPlayer(wsPort, myId).catch(() => null);
    return (a && a.live) || {};
  };
  const here = () => H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const apart = (L, c) => typeof L.x === 'number' && Math.hypot(L.x - c.x, L.y - c.y) > 60;
  for (let leg = 0; leg < 400; leg++) {
    const L = await worker();
    const c = await here();
    if (leg % 10 === 0) console.log(`    travel leg ${leg}: here ${Math.round(c.x)},${Math.round(c.y)} -> ${Math.round(tx)},${Math.round(ty)} (${Math.round(Math.hypot(tx - c.x, ty - c.y))} px to go)`);
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

/* One vein as drawn, and where the renderer hangs its label and bar. */
const look = (P, id) => P.page.evaluate((nid) => {
  const S = window._gameState.current;
  const n = (S.gatherNodes || []).find((g) => g && g.id === nid);
  const sp = n && n._pixiSprite;
  if (!n || !sp || sp.destroyed) return { err: 'no sprite', alive: n && n.alive };
  const R = window._pixiRenderer;
  const marks = R && R.nodeMarksAt ? R.nodeMarksAt(S, n) : {};
  const lab = marks.label || null, bar = marks.bar || null;
  const src = sp.texture.source && sp.texture.source.resource;
  return {
    x: n.x, y: n.y, lvl: n.gatherLvl, url: (src && (src.src || src.currentSrc)) || null,
    texW: sp.texture.width, texH: sp.texture.height,
    w: +sp.width.toFixed(2), h: +sp.height.toFixed(2),
    ax: +sp.anchor.x.toFixed(4), ay: +sp.anchor.y.toFixed(4),
    sx: sp.x, sy: sp.y, groundDy: sp._groundDy, tint: sp.tint, visible: sp.visible,
    top: +(sp.y - sp.height * sp.anchor.y).toFixed(2), left: +(sp.x - sp.width * sp.anchor.x).toFixed(2),
    label: lab ? { x: +lab.x.toFixed(1), y: +lab.y.toFixed(1) } : null,
    bar: bar ? { y: +bar.y.toFixed(1), artBase: bar.artBase, cssY: +((bar.y - S.camera.y) * (S._worldScaleY || 1)).toFixed(1) } : null,
  };
}, id);

/* Seated at a vein as startExtraction seats you (MINE_SEAT_DX/DY), held in a
   harvest that never opens: the miner swings and nothing is sent */
const holdMine = (P, id) => P.page.evaluate((nid) => {
  const S = window._gameState.current;
  const node = (S.gatherNodes || []).find((n) => n && n.id === nid);
  if (!node) return false;
  S.player.x = node.x - 7; S.player.y = node.y - 86;
  S.player.vx = 0; S.player.vy = 0;
  const now = Date.now();
  S._extraction = { nodeId: node.id, nodeRef: node, skill: 'mining', startedAt: now,
    windowOpensAt: now + 600000, windowClosesAt: now + 600000 + 3000, status: 'waiting', swipeSamples: [] };
  return true;
}, id);

/* The rock baked into the swing, through the body sprite's own transform into
   the world and into the vein's picture: per frame, how many of its solid
   pixels there are, how many lie on the vein's solid pixels, and where it is
   (world px from the node); and the figure's own rows -- its crown and its
   boots, for every frame -- so the rock's top can be read against them. */
const bakedCover = (P, id) => P.page.evaluate(async ({ nid, FW, ROW, REST }) => {
  const S = window._gameState.current, R = window._pixiRenderer;
  const n = (S.gatherNodes || []).find((g) => g && g.id === nid);
  const vein = n && n._pixiSprite;
  const pd = R && R.playerDisplayRaw ? R.playerDisplayRaw() : null;
  const body = pd && pd._spriteBody;
  if (!vein || vein.destroyed || !body || !body.visible || pd._animPose !== 'mine') return { err: 'no vein, or the body is not mining', pose: pd && pd._animPose };
  const load = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const pix = (src) => {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0);
    return g.getImageData(0, 0, c.width, c.height).data;
  };
  const img = await load('/sprites/player/mine-south.png');
  const sheet = pix(img);
  const vsrc = vein.texture.source.resource;
  const vd = pix(vsrc);
  const VW = vsrc.width, VH = vsrc.height;
  const frames = Math.floor(img.width / FW);
  const tw = body.texture.width, th = body.texture.height, ax = body.anchor.x, ay = body.anchor.y;
  const k = tw / FW;
  const toWorld = (x, y) => vein.parent.toLocal(body.toGlobal({ x: (x + 0.5) * k - ax * tw, y: (y + 0.5) * k - ay * th }));
  const out = [];
  let crown = Infinity, boots = -Infinity;
  for (let f = 0; f < frames; f++) {
    let total = 0, under = 0, l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
    for (let y = 0; y < FW; y++) for (let x = 0; x < FW; x++) {
      if (sheet[(y * img.width + f * FW + x) * 4 + 3] < 128) continue;
      if (y < ROW) {
        /* the figure: its top row is the crown or the raised pick; its
           lowest above the rock is the boots */
        const w = toWorld(x, y);
        if (w.y - n.y < crown && x > 40 && x < 90) crown = w.y - n.y;
        if (w.y - n.y > boots) boots = w.y - n.y;
        continue;
      }
      total++;
      const w = toWorld(x, y);
      l = Math.min(l, w.x - n.x); r = Math.max(r, w.x - n.x); t = Math.min(t, w.y - n.y); b = Math.max(b, w.y - n.y);
      const vl = vein.toLocal(body.toGlobal({ x: (x + 0.5) * k - ax * tw, y: (y + 0.5) * k - ay * th }));
      const vx = Math.floor((vl.x + vein.anchor.x * vein.texture.width) * (VW / vein.texture.width));
      const vy = Math.floor((vl.y + vein.anchor.y * vein.texture.height) * (VH / vein.texture.height));
      if (vx >= 0 && vy >= 0 && vx < VW && vy < VH && vd[(vy * VW + vx) * 4 + 3] >= 128) under++;
    }
    out.push({ f, total, under, share: total ? +(under / total).toFixed(4) : 1,
      box: [Math.round(l), Math.round(t), Math.round(r), Math.round(b)] });
  }
  return { frames: out, crown: Math.round(crown), boots: Math.round(boots), bodyY: Math.round(pd.y - n.y), bodyX: Math.round(pd.x - n.x),
    worst: Math.min(...out.map((o) => o.share)), rest: Math.min(...out.filter((o) => REST.includes(o.f)).map((o) => o.share)),
    all: out.reduce((s, o) => s + o.total, 0), allUnder: out.reduce((s, o) => s + o.under, 0) };
}, { nid: id, FW: SHEET_FW, ROW: BAKED_ROW, REST: REST_FRAMES });

/* mp-tiertrees' walk north: put there in hops the worker agrees with, then
   hold W until the body is past `yEnd` or has stopped */
async function walkNorth(P, wsPort, myId, x0, y0, yEnd, maxMs = 25000) {
  await travel(P, wsPort, myId, x0, y0);
  await P.page.waitForTimeout(700);
  const start = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  await P.page.keyboard.down('w');
  const t0 = Date.now();
  let best = Infinity, still = 0, at = null;
  while (Date.now() - t0 < maxMs) {
    await P.page.waitForTimeout(500);
    at = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    if (at.y < yEnd) break;
    if (at.y >= best - 2) { if (++still >= 3) break; } else still = 0;
    best = Math.min(best, at.y);
  }
  await P.page.keyboard.up('w');
  await P.page.waitForTimeout(400);
  const end = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  return { start, end, moved: +(start.y - end.y).toFixed(1) };
}

const srvInv = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return (a && (a.inventory || (a.rpg && a.rpg.inventory) || (a.live && a.live.inventory))) || {};
};

/* A REAL mine of the vein: the tap from beside it (the seat snaps you in),
   the worker's hits at Mining 99, the gesture (mp-wheelnodes' pump, 16 ms a
   move in one run on the page's thread), the ore read from the worker -- and
   the rock breaking into pieces of itself, the crack heard */
async function mineIt(P, wsPort, myId, rec, metal, t) {
  await H.devOp(wsPort, 'lifeskill', myId, { skill: 'mining', level: 99 });
  await H.waitFor(P, (S) => (((S.rpg || {}).lifeSkills || {}).mining || {}).level || 0, (v) => v >= 99, { timeout: 10000, label: 'Mining 99' }).catch(() => null);
  await travel(P, wsPort, myId, t.x + 70, t.y + 20);
  await closeTalk(P);
  const invBefore = await srvInv(wsPort, myId);
  await P.page.evaluate(() => { const S = window._gameState.current; S._monstersStash = S.monsters; S.monsters = []; window.__btOreCracks = []; });
  let started = false;
  for (let i = 0; i < 6 && !started; i++) {
    await P.page.evaluate((nid) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.id === nid);
      if (!n) return;
      const cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
      const x = rc.left + (n.x - S.camera.x) * (S._worldScaleX || 1);
      const y = rc.top + (n.y - 50 - S.camera.y) * (S._worldScaleY || 1);
      const mk = (ty) => new TouchEvent(ty, { bubbles: true, cancelable: true,
        touches: ty === 'touchend' ? [] : [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })] });
      cv.dispatchEvent(mk('touchstart'));
      cv.dispatchEvent(mk('touchend'));
    }, t.id);
    await P.page.waitForTimeout(300);
    started = await H.readState(P, (S) => !!S._extraction && S._extraction.skill === 'mining');
  }
  rec.ok(`${metal}: tapping it starts a Mining harvest (guard)`, started === true);
  if (!started) return;
  const opened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
    { timeout: 60000, label: 'the hits land' }).catch(() => null);
  rec.ok(`${metal}: the worker's hits land and the gesture opens (guard)`, opened === 'ready', { opened });
  if (opened !== 'ready') return;
  const cue = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest().cue : null));
  const g = await P.page.evaluate(([cx, cy]) => {
    const S = window._gameState.current;
    const ev = (ty, x, y) => window.dispatchEvent(new PointerEvent(ty, { pointerId: 9, clientX: x, clientY: y,
      pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
    ev('pointerdown', cx, cy);
    const t0 = performance.now();
    let step = 0, lastProg = 0, next = t0;
    while (performance.now() - t0 < 12000) {
      while (performance.now() < next) { /* the phone's 16 ms */ }
      next += 16;
      const k = step % 12, v = k < 6 ? -26 + 52 * k / 6 : 26 - 52 * (k - 6) / 6;
      ev('pointermove', cx + Math.sin(step) * 3, cy + v);
      step++;
      const ex = S._extraction;
      if (ex) lastProg = ex.progress || 0;
      if (!ex || ex.status !== 'ready' || lastProg >= 1) break;
    }
    ev('pointerup', cx, cy);
    return { lastProg: +lastProg.toFixed(2), ms: Math.round(performance.now() - t0), moves: step };
  }, [cue ? cue.x : 200, cue ? cue.y : 700]);
  const ended = await H.waitFor(P, (S) => !S._extraction, (v) => v === true, { timeout: 8000, label: 'the harvest ends' }).catch(() => false);
  rec.ok(`${metal}: the gesture completes the harvest`, ended === true && g.lastProg >= 0.85, g);
  /* the rock breaks into pieces of its own picture, and cracks -- watched
     from the page itself, frame by frame, so the picture below is taken while
     the pieces fly (they lie ORE_BREAK_LIE_MS and fade in 1.2 s: a poll from
     here, on this box's slow frames, caught them gone) */
  const heap = await P.page.evaluate((nid) => new Promise((res) => {
    const t0 = performance.now();
    const look = () => {
      const R = window._pixiRenderer;
      const a = R && R.oreBreakProbe ? R.oreBreakProbe() : [];
      const h = a.find((q) => String(q.oi).indexOf('ore:' + nid + ':') === 0);
      if (h) return res(h);
      if (performance.now() - t0 > 8000) return res(null);
      requestAnimationFrame(look);
    };
    look();
  }), t.id);
  await P.page.waitForTimeout(150);
  const clip = await P.page.evaluate(({ x, y }) => {
    const S = window._gameState.current, cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
    const sx = rc.left + (x - S.camera.x) * (S._worldScaleX || 1), sy = rc.top + (y - S.camera.y) * (S._worldScaleY || 1);
    return { x: Math.max(0, sx - 120), y: Math.max(0, sy - 200), width: 240, height: 260 };
  }, t);
  await P.page.screenshot({ path: join(H.REPO, `tools/qa/mp/out/tierore-${metal}-break.png`), clip }).catch(() => {});
  rec.ok(`${metal}: mined out, the rock breaks into pieces of its own picture`, !!heap && heap.shards >= 6, heap);
  const cracks = await H.waitFor(P, () => window.__btOreCracks || [], (a) => a.length > 0, { timeout: 8000, label: 'the crack' }).catch(() => []);
  rec.ok(`${metal}: ...and it cracks, at your full voice`, cracks.length >= 1 && cracks[0].self === true, cracks);
  const gone = await H.waitFor(P, () => (window._pixiRenderer.oreBreakProbe() || []).filter((h) => String(h.oi).indexOf('ore:' + t.id + ':') === 0).length,
    (n) => n === 0, { timeout: 15000, label: 'the pieces fade' }).catch(() => null);
  rec.ok(`${metal}: ...its pieces fade away after`, gone === 0, { gone });
  let got = {};
  for (let i = 0; i < 20; i++) {
    const inv = await srvInv(wsPort, myId);
    got = {};
    for (const k of Object.keys(inv)) if (k.indexOf('ore_') === 0 && (inv[k] || 0) > (invBefore[k] || 0)) got[k] = inv[k] - (invBefore[k] || 0);
    if (Object.keys(got).length) break;
    await P.page.waitForTimeout(400);
  }
  const strike = ((await H.adminPlayer(wsPort, myId).catch(() => ({}))).live || {}).lastStrike || null;
  rec.ok(`${metal}: the worker pays its ore`, Object.keys(got).length > 0, { got, strike });
  await P.page.evaluate(() => { const S = window._gameState.current; if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; } });
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Pickbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 120000, label: 'into the Wheel, its nodes in' }).catch(() => null);
    rec.ok('in the Wheel, with its resources (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await H.grant(wsPort, myId, 'item', { invKey: 'mining_pickaxe', count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 40 });
    await H.waitFor(P, (S) => ((S.rpg || {}).inventory || {}).mining_pickaxe > 0, (v) => v, { timeout: 20000, label: 'the pickaxe' }).catch(() => null);
    await P.page.evaluate(() => { window._gameState.current.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    const tut = await H.waitFor(P, (S) => ((S.rpg || {})._quests || {}).tut_1 || null, (v) => v === 'active', { timeout: 10000, label: 'tut_1' }).catch(() => null);
    rec.ok('tut_1 taken, so the Mayor\'s gate lets you out (guard)', tut === 'active', { tut });
    await closeTalk(P);

    /* the veins to visit: the commons' copper nearest you, then one land's
       iron, black steel, titanium and obsidian, each the nearest to the last
       (a node's land is in its id, wn-<land>-<n>) */
    const picks = await P.page.evaluate((lvls) => {
      const S = window._gameState.current;
      const landOf = (n) => (/^wn-([a-z]+)-/.exec(String(n.id)) || [])[1] || null;
      const live = (S.gatherNodes || []).filter((n) => n && n.alive !== false && n.nodeType === 'oreVein');
      const out = [];
      let from = { x: S.player.x, y: S.player.y }, home = null;
      for (const lvl of lvls) {
        const of = live.filter((n) => (n.gatherLvl || 1) === lvl && (lvl === 1 || !home || landOf(n) === home));
        of.sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y));
        const t = of[0];
        if (!t) { out.push(null); continue; }
        if (lvl !== 1 && !home) home = landOf(t);
        out.push({ id: t.id, x: t.x, y: t.y, lvl, home: landOf(t) });
        from = t;
      }
      return out;
    }, METALS.map(([l]) => l));
    rec.ok('a vein of every tier to visit, four of them in one land (guard)', picks.every(Boolean), picks);

    /* QA_ORE_ONLY=copper,iron visits only those (a quick look) */
    const only = (process.env.QA_ORE_ONLY || '').split(',').filter(Boolean);
    for (const t of picks) {
      if (!t) continue;
      const metal = METALS.find(([l]) => l === t.lvl)[1];
      if (only.length && !only.includes(metal)) continue;
      const art = ORE_ART && ORE_ART[t.lvl];
      console.log(`  ${metal}: vein ${t.id} at ${Math.round(t.x)},${Math.round(t.y)} (${t.home})`);
      const there = await travel(P, wsPort, myId, t.x + 110, t.y + 40);
      rec.ok(`${metal}: walked to it, the worker agreeing (guard)`, there === true, { there, t });
      await P.page.waitForTimeout(700);
      const L = await look(P, t.id);
      console.log(`    look: ${JSON.stringify(L)}`);
      if (L.err) { rec.ok(`${metal}: drawn (guard)`, false, L); continue; }
      await P.page.screenshot({ path: join(OUT, `tierore-${metal}.png`) });
      if (art) {
        const g = geo(t);
        rec.ok(`${metal}: drawn with its own picture (${art.w} x ${art.h} px)`, L.texW === art.w && L.texH === art.h, L);
        rec.ok(`${metal}: at its own size, ${art.h * PX} world px tall (2 picture px a game px)`, Math.abs(L.h - art.h * PX) < 0.6 && Math.abs(L.w - art.w * PX) < 0.6, L);
        rec.ok(`${metal}: untinted (its own colours)`, L.tint === 0xffffff, L);
        rec.ok(`${metal}: its rock stands where tierOre.js says, the depth line its base`,
          Math.abs(L.top - g.top) < 0.6 && Math.abs(L.left - g.left) < 0.6 && Math.abs(L.sy + L.groundDy - g.footY) < 0.6, { L, g });
        rec.ok(`${metal}: its name label hangs over its top`, !!L.label && L.label.y < g.top && g.top - L.label.y < 30 && Math.abs(L.label.x - t.x) < 0.5, { label: L.label, top: g.top });
      }

      /* seated to mine it */
      await holdMine(P, t.id);
      let cov = null;
      for (let i = 0; i < 30; i++) {
        await P.page.waitForTimeout(150);
        cov = await bakedCover(P, t.id);
        if (!cov.err) break;
      }
      console.log(`    seated: ${JSON.stringify({ ...cov, frames: undefined })}`);
      if (cov && cov.frames) for (const fr of cov.frames) console.log(`      frame ${fr.f}: ${fr.under}/${fr.total} under the vein (${(fr.share * 100).toFixed(1)}%), the baked rock at ${fr.box}`);
      const L2 = await look(P, t.id);
      console.log(`    held: ${JSON.stringify({ top: L2.top, bar: L2.bar })}`);
      const clip = await P.page.evaluate(({ x, y }) => {
        const S = window._gameState.current, cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
        const sx = rc.left + (x - S.camera.x) * (S._worldScaleX || 1), sy = rc.top + (y - S.camera.y) * (S._worldScaleY || 1);
        return { x: Math.max(0, sx - 120), y: Math.max(0, sy - 200), width: 240, height: 260 };
      }, t);
      await P.page.screenshot({ path: join(OUT, `tierore-${metal}-mine.png`), clip }).catch(() => {});
      if (art) {
        const fr = cov && cov.frames ? cov.frames.map((f) => [f.f, f.share]) : null;
        rec.ok(`${metal}: seated to mine it, the rock baked into the swing is all under the vein at rest (${cov && cov.rest != null ? (cov.rest * 100).toFixed(1) : '?'}%; the old copper vein's: 67%)`,
          !!cov && !cov.err && cov.rest >= 0.999, { rest: cov && cov.rest, frames: fr });
        rec.ok(`${metal}: ...and at the blow, its chips flying, at least 97% of it (${cov && cov.worst != null ? (cov.worst * 100).toFixed(1) : '?'}%)`,
          !!cov && !cov.err && cov.worst >= 0.97, { worst: cov && cov.worst, frames: fr });
        const topUp = t.y - geo(t).top;
        rec.ok(`${metal}: the rock is ${Math.round(topUp)} px tall over the point, under the miner's shoulders (${SHOULDERS_UP}): his head and shoulders over it`,
          topUp <= SHOULDERS_UP && !!cov && !cov.err && cov.bodyY === -94, { topUp, bodyY: cov && cov.bodyY });
        rec.ok(`${metal}: the harvest's bar hangs under its base, on the screen`, !!L2.bar && L2.bar.artBase != null && Math.abs(L2.bar.artBase - geo(t).footY) < 0.6 && L2.bar.y > L2.bar.artBase && L2.bar.cssY < PHONE.height - 200, L2.bar);
      }
      await P.page.evaluate(() => { window._gameState.current._extraction = null; });
      await P.page.waitForTimeout(300);

      if (art && t.lvl === 1) {
        /* the rock stops you: from in front of it, walking north into it
           stops your boots short of its middle (the walk test at the feet) */
        const g = geo(t);
        const w = await walkNorth(P, wsPort, myId, t.x, g.footY + 60 - 52, g.top - 40);
        const feet = w.end.y + 52;
        rec.ok(`${metal}: walking north into it stops your boots short of its middle`, w.moved > 10 && feet > (g.top + g.footY) / 2, { w, feet, top: g.top, base: g.footY });
      }
      if (art && (t.lvl === 1 || t.lvl === 21)) await mineIt(P, wsPort, myId, rec, metal, t);
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
