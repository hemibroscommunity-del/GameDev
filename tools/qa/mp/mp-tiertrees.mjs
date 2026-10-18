/* ═══ v2.3.3343: EACH WOOD ITS OWN TREE, ON A PHONE ═══
 *
 * The owner's five trees (game/tierTrees.js, src/data/treeArt.js): pine on
 * the commons, then softwood (a willow), hardwood, cedar and maple out along
 * one land's spoke, each its own picture at its own size.  On a phone (390 x
 * 844, 3x) in the Wheel, with the axe in the bag, walking out from BroTown to
 * a tree of every tier:
 *   1. it is drawn with ITS OWN picture (the texture treeArt.js names), at its
 *      own size (half the picture's px: 2 a game px), untinted;
 *   2. its trunk's foot stands 27 world px north of the node's point, where
 *      the old pine's base stood (the depth line, `_groundDy`, is that foot);
 *   3. its name label hangs over its OWN crown, not the old pine's;
 *   4. held in a chop, the lumberjack stands off by its own trunk's width
 *      (59 - 60% of the half-width, 15 at most) and the bar hangs over the
 *      crown;
 * and at the pine: the trunk stops you walking north into it, while beside
 * the trunk you walk on under the crown; and behind the maple, its crown over
 * you, the tree eases to see-through (0.42) and back when you step out.
 * Pictures: tools/qa/mp/out/tiertrees-<wood>.png and -<wood>-chop.png.
 *
 *   node tools/qa/mp/run.mjs tiertrees
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { TREE_ART } from '../../../src/data/treeArt.js';

const PHONE = { width: 390, height: 844 };
/* game/tierTrees.js: 2 picture px a game px, the foot 27 north of the node,
   the label and bar over the crown but never more than 300 px over the foot */
const PX = 0.5, FOOT_DY = 27, MARK_MAX_UP = 300;
const chopOffset = (lvl) => 59 - Math.min(15, TREE_ART[lvl].trunk * PX * 0.6);
/* The QA phone's top cards (the top bar and the pinned quest under it) end
   ~100 CSS px down: a bar above this is under them (measured off
   tiertrees-maple-chop.png before the cap: the maple's bar was hidden). */
const TOP_CARDS_CSS = 110;

/* mp-harvestbar's walk: H.hopTo's 100 px a hop, checked against the worker */
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
    if (leg % 10 === 0) console.log(`    travel leg ${leg}: here ${Math.round(c.x)},${Math.round(c.y)} worker ${Math.round(L.x)},${Math.round(L.y)} -> ${Math.round(tx)},${Math.round(ty)} (${Math.round(Math.hypot(tx - c.x, ty - c.y))} px to go)`);
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

/* mp-unseenwall's walk, north: put there in hops the worker agrees with,
   then hold W until the body is past `yEnd` or has stopped (no ground gained
   for three looks).  This box draws a frame every few hundred ms, so a walk
   is timed by its result, not the clock. */
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

/* One tree as drawn, and where the renderer hangs its label and bar. */
const look = (P, id) => P.page.evaluate((nid) => {
  const S = window._gameState.current;
  const n = (S.gatherNodes || []).find((g) => g && g.id === nid);
  const sp = n && n._pixiSprite;
  if (!n || !sp || sp.destroyed) return { err: 'no sprite', alive: n && n.alive };
  const R = window._pixiRenderer;
  const marks = R && R.nodeMarksAt ? R.nodeMarksAt(S, n) : {};
  const lab = marks.label || null, bar = marks.bar || null;
  return {
    x: n.x, y: n.y, lvl: n.gatherLvl,
    texW: sp.texture.width, texH: sp.texture.height,
    w: +sp.width.toFixed(2), h: +sp.height.toFixed(2),
    ax: +sp.anchor.x.toFixed(4), ay: +sp.anchor.y.toFixed(4),
    sx: sp.x, sy: sp.y, groundDy: sp._groundDy, tint: sp.tint, alpha: +sp.alpha.toFixed(3), visible: sp.visible,
    top: +(sp.y - sp.height * sp.anchor.y).toFixed(2),
    label: lab ? { x: +lab.x.toFixed(1), y: +lab.y.toFixed(1) } : null,
    bar: bar ? { y: +bar.y.toFixed(1), artTop: bar.artTop, cssY: +((bar.y - S.camera.y) * (S._worldScaleY || 1)).toFixed(1) } : null,
  };
}, id);

const holdChop = (P, id) => P.page.evaluate((nid) => {
  const S = window._gameState.current;
  const node = (S.gatherNodes || []).find((n) => n && n.id === nid);
  if (!node) return false;
  if (S.player) { S.player.vx = 0; S.player.vy = 0; }
  const now = Date.now();
  S._extraction = { nodeId: node.id, nodeRef: node, skill: 'woodcutting', startedAt: now,
    windowOpensAt: now + 600000, windowClosesAt: now + 600000 + 3000, status: 'waiting', swipeSamples: [] };
  return true;
}, id);
const chopFigure = (P, node) => P.page.evaluate((n) => {
  const R = window._pixiRenderer;
  const sp = R && R.chopSpriteRaw ? R.chopSpriteRaw(null) : null;
  if (!sp || !sp.visible) return null;
  return { dx: +(sp.x - n.x).toFixed(2), dy: +(sp.y - n.y).toFixed(2), sign: sp.scale.x < 0 ? -1 : 1 };
}, node);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Timbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
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
    await H.grant(wsPort, myId, 'item', { invKey: 'woodcutting_axe', count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 40 });
    await H.waitFor(P, (S) => ((S.rpg || {}).inventory || {}).woodcutting_axe > 0, (v) => v, { timeout: 20000, label: 'the axe' }).catch(() => null);
    /* out past the Mayor's gate: until tut_1 a new bro is held on the safe
       commons (wheelCommonsGate), and the land's first trees stand past it
       (mp-wheelnodes' way) */
    await P.page.evaluate(() => { window._gameState.current.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    const tut = await H.waitFor(P, (S) => ((S.rpg || {})._quests || {}).tut_1 || null, (v) => v === 'active', { timeout: 10000, label: 'tut_1' }).catch(() => null);
    rec.ok('tut_1 taken, so the Mayor\'s gate lets you out (guard)', tut === 'active', { tut });
    await closeTalk(P);

    /* the trees to visit: the commons' pine nearest you, then one land's
       softwood, hardwood, cedar and maple, each the nearest to the last */
    const picks = await P.page.evaluate((lvls) => {
      const S = window._gameState.current;
      const live = (S.gatherNodes || []).filter((n) => n && n.alive !== false && n.nodeType === 'tree');
      const out = [];
      let from = { x: S.player.x, y: S.player.y }, home = null;
      for (const lvl of lvls) {
        const of = live.filter((n) => (n.gatherLvl || 1) === lvl && (lvl === 1 || !home || n.home === home));
        of.sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y));
        const t = of[0];
        if (!t) { out.push(null); continue; }
        if (lvl !== 1 && !home) home = t.home || null;
        out.push({ id: t.id, x: t.x, y: t.y, lvl, home: t.home || null });
        from = t;
      }
      return out;
    }, [1, 6, 11, 16, 21]);
    rec.ok('a tree of every tier to visit, four of them in one land (guard)', picks.every(Boolean), picks);

    for (const t of picks) {
      if (!t) continue;
      const art = TREE_ART[t.lvl];
      const wood = art.name;
      /* in front of it and to its east, so the picture shows the whole tree */
      console.log(`  ${wood}: tree ${t.id} at ${Math.round(t.x)},${Math.round(t.y)} (${t.home || 'commons'})`);
      const there = await travel(P, wsPort, myId, t.x + Math.max(60, art.trunk * PX + 50), t.y + 50);
      rec.ok(`${wood}: walked to it, the worker agreeing (guard)`, there === true, { there, t });
      await P.page.waitForTimeout(700);
      const L = await look(P, t.id);
      if (L.err) { rec.ok(`${wood}: drawn (guard)`, false, L); continue; }
      rec.ok(`${wood}: drawn with its own picture (${art.w} x ${art.h} px)`, L.texW === art.w && L.texH === art.h, L);
      rec.ok(`${wood}: at its own size, ${art.h * PX} world px tall (2 picture px a game px)`, Math.abs(L.h - art.h * PX) < 0.6 && Math.abs(L.w - art.w * PX) < 0.6, L);
      rec.ok(`${wood}: untinted (its bark is its log's colour)`, L.tint === 0xffffff, L);
      const footY = L.sy + L.groundDy;
      rec.ok(`${wood}: its trunk's foot stands 27 px north of the node's point, and the depth line is that foot`,
        Math.abs(footY - (t.y - FOOT_DY)) < 0.01 && Math.abs(L.top + art.foot[1] * PX - footY) < 0.6, { footY, nodeY: t.y, top: L.top });
      /* over the crown, or in a big one's (the maple's top is under the
         phone's top cards): never more than 300 px over the foot */
      const markY = Math.max(L.top, footY - MARK_MAX_UP);
      rec.ok(`${wood}: its name label hangs over its own crown${markY > L.top + 0.5 ? ` (in it: ${Math.round(markY - L.top)} px down from its top)` : ''}`,
        !!L.label && L.label.y < markY && markY - L.label.y < 30 && Math.abs(L.label.x - t.x) < 0.5, { label: L.label, top: L.top, markY });
      await P.page.screenshot({ path: join(OUT, `tiertrees-${wood}.png`) });

      /* held in a chop: the lumberjack beside its trunk, the bar over its crown */
      await holdChop(P, t.id);
      let fig = null;
      for (let i = 0; i < 30 && !fig; i++) { await P.page.waitForTimeout(120); fig = await chopFigure(P, t); }
      const want = chopOffset(t.lvl);
      rec.ok(`${wood}: the lumberjack stands ${want.toFixed(1)} px off its trunk (its own width)`,
        !!fig && Math.abs(Math.abs(fig.dx) - want) < 0.6, { fig, want });
      const L2 = await look(P, t.id);
      rec.ok(`${wood}: the harvest's bar hangs over its own crown`, !!L2.bar && L2.bar.artTop != null && Math.abs(L2.bar.artTop - markY) < 0.6 && L2.bar.y < markY, { bar: L2.bar, markY });
      rec.ok(`${wood}: ...and on the screen, under the top cards (you can see your chop)`, !!L2.bar && L2.bar.cssY > TOP_CARDS_CSS, L2.bar);
      await P.page.waitForTimeout(500);
      await P.page.screenshot({ path: join(OUT, `tiertrees-${wood}-chop.png`) });
      await P.page.evaluate(() => { window._gameState.current._extraction = null; });
      await P.page.waitForTimeout(300);

      if (t.lvl === 1) {
        /* the trunk is solid, the crown walk-under: from 60 px south of the
           foot, walking north stops at the trunk; 40 px clear of the trunk's
           side, the same walk goes on north past the foot, under the crown.
           (The walk is the game's own, keys held, the walk test on.) */
        const a = await walkNorth(P, wsPort, myId, t.x, footY + 60, footY - 80);
        rec.ok('the pine\'s trunk stops you walking north into it (you walked, then stopped short of its foot)',
          a.moved > 10 && a.end.y > footY - 40, { a, footY });
        const side = art.trunk * PX + 40;
        const b = await walkNorth(P, wsPort, myId, t.x + side, footY + 60, footY - 80);
        rec.ok('beside the trunk you walk on north past its foot, under its crown', b.end.y < footY - 40, { b, footY });
      }

      if (t.lvl === 21) {
        /* behind the maple, its crown over you: see-through; out: solid.
           Well behind its foot -- just behind the trunk your head is below
           its leaves, and it rightly stays solid there */
        await travel(P, wsPort, myId, t.x + 30, footY - art.foot[1] * PX * 0.6);
        await P.page.waitForTimeout(600);
        const behind = await look(P, t.id);
        rec.ok('behind the maple, its crown over you, it is seen through (0.42)', Math.abs(behind.alpha - 0.42) < 0.02, { alpha: behind.alpha });
        await P.page.screenshot({ path: join(OUT, 'tiertrees-maple-behind.png') });
        await travel(P, wsPort, myId, t.x + 30, t.y + 60);
        await P.page.waitForTimeout(600);
        const out = await look(P, t.id);
        rec.ok('...and solid again when you step out in front', out.alpha === 1, { alpha: out.alpha });
      }
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
