/* ═══ v2.3.4038: THE TOWNSFOLK'S DAY, A FRAME AT A TIME ═══
 *
 * The why, and the loops: game/townsfolkWalk.js.  This is the game loop's
 * side of it (BroTown.jsx, the NPC pass): once a frame, townsfolkFrame works
 * out where each townsperson of the Wheel's BroTown should be on his loop
 * and who of them may walk; then, for each, townsfolkStep moves him there --
 * or holds him, facing you, when he gives quests and you are near, or a
 * window you opened is up and he is near you, or he would walk into you or
 * into something the walk test says is solid.
 *
 * What it writes on a townsperson (entityRenderer _drawFolk reads the last
 * two; the tap, the map pins and the quest star read his x and y, so they
 * follow him):
 *   x, y        his feet, as before;
 *   _folkWork   the work pose he is at ('mine', 'fish', 'pickup') or null;
 *   _folkFace   which way he faces while he stands (one of the eight), or
 *               null to keep the way he walked.
 *
 * Only an import of the pure loops, so node can test it
 * (server/test/townsfolk-walk.test.mjs). */
import { folkStops, folkSeed, folkAt, folkStep, folkFacing, folkGroundBlocked, folkWalkersAllowed,
  FOLK_GIVER_NEAR, FOLK_TALK_NEAR, FOLK_BUMP_PX, FOLK_MAX_WALKERS, FOLK_WALK_PX_S } from './townsfolkWalk.js';

/* past the view's half-diagonal by this much he is far from the screen (the
   renderer's FOLK_FAR_MARGIN: there he has no figure) */
const NEAR_MARGIN = 300;

const _off = (() => { try { return /(^|[?&])folkwalk=0(&|$)/.test(window.location.search || ''); } catch (e) { return false; } })();
/** `?folkwalk=0`: they stand at their spots on this phone. */
export function folkWalkWanted() { return !_off; }

let _givers = null;
let _giverSrc = null;
/** The names that give quests (QUEST_CHAINS[].npc), worked out once a table. */
function giversOf(chains) {
  if (_givers && _giverSrc === chains) return _givers;
  const out = new Set();
  if (chains) for (const k in chains) { const q = chains[k]; if (q && typeof q.npc === 'string') out.add(q.npc); }
  _givers = out; _giverSrc = chains;
  return out;
}

/* the last frame's work, for the probe and the step */
const _frame = { on: false, at: 0, allowed: null, near: 0, walkers: 0, held: 0 };   /* walkers: moved this frame near the screen */

/**
 * Once a frame, before the NPC pass.  ctx:
 *   on        the townsfolk walk here this frame (the Wheel's BroTown, drawn
 *             live, folkWalkWanted)
 *   chains    QUEST_CHAINS (who gives quests)
 *   feetX/Y   your feet (S.player plus playerGroundDy)
 *   talking   a window or dialogue of yours is up
 *   grid, worldW, worldH, boxes   the walk test's (townsfolkWalk.folkGroundBlocked)
 */
export function townsfolkFrame(S, now, ctx) {
  _frame.on = !!(ctx && ctx.on);
  _frame.at = now;
  _frame.ctx = ctx || null;
  _frame.walkers = 0; _frame.held = 0; _frame.near = 0;
  const npcs = (S && S.npcs) || null;
  if (!_frame.on || !npcs) { _frame.allowed = null; return; }
  const givers = giversOf(ctx.chains);
  const cam = S.camera, vw = S._viewW, vh = S._viewH;
  const hasView = !!(cam && vw > 0 && vh > 0);
  const mx = hasView ? cam.x + vw / 2 : 0, my = hasView ? cam.y + vh / 2 : 0;
  const nearR = hasView ? Math.hypot(vw, vh) / 2 + NEAR_MARGIN : Infinity;
  const walkers = [];
  for (const npc of npcs) {
    if (!npc || !npc.alive) continue;
    const giver = givers.has(npc.name);
    const stops = folkStops(npc.name, giver);
    if (!stops) { npc._folkDay = null; continue; }
    if (!npc._folkHome) npc._folkHome = { x: npc.spawnX, y: npc.spawnY };
    const at = folkAt(stops, folkSeed(npc.name), now);
    const d = hasView ? Math.hypot(npc.x - mx, npc.y - my) : 0;
    const near = d < nearR;
    npc._folkDay = { tx: npc._folkHome.x + at.dx, ty: npc._folkHome.y + at.dy, walking: at.walking, work: at.work, giver, near };
    if (near) _frame.near++;
    /* walking near the screen: his leg, or catching up with it */
    if (near && (at.walking || Math.hypot(npc._folkDay.tx - npc.x, npc._folkDay.ty - npc.y) > 2)) walkers.push({ id: String(npc.id), d });
  }
  _frame.allowed = folkWalkersAllowed(walkers, FOLK_MAX_WALKERS);
}

/**
 * For each townsperson in the NPC pass (after the race's), `dtMs` the
 * frame's.  True when his day moved him (the old wander must not), false
 * when he has none here (that code runs as before).
 */
export function townsfolkStep(S, npc, dtMs) {
  const day = npc && npc._folkDay;
  if (!_frame.on || !day) {
    if (npc && (npc._folkWork || npc._folkFace)) { npc._folkWork = null; npc._folkFace = null; }
    return false;
  }
  const ctx = _frame.ctx || {};
  const fdx = (ctx.feetX != null ? ctx.feetX : NaN) - npc.x, fdy = (ctx.feetY != null ? ctx.feetY : NaN) - npc.y;
  const toYou = Math.hypot(fdx, fdy);
  /* a giver stops for you, and anyone near stops while you talk */
  const attend = (day.giver && toYou < FOLK_GIVER_NEAR) || (!!ctx.talking && toYou < FOLK_TALK_NEAR);
  if (attend) {
    npc._folkWork = null;
    npc._folkFace = folkFacing(fdx, fdy);
    _frame.held++;
    return true;
  }
  const togo = Math.hypot(day.tx - npc.x, day.ty - npc.y);
  const mayWalk = !day.near || !_frame.allowed || _frame.allowed.has(String(npc.id));
  if (togo > 0.5 && !mayWalk) {
    /* the cap: he stands where he is till a walker near the screen stops */
    npc._folkWork = null; npc._folkFace = null;
    _frame.held++;
    return true;
  }
  if (togo > 0.5) {
    const ox = npc.x, oy = npc.y;
    folkStep(npc, day.tx, day.ty, dtMs);
    /* near the screen, never into you or into what the walk test says is
       solid (the loops are clear by the plan: this is what is placed) */
    const moved = npc.x !== ox || npc.y !== oy;
    if (moved && day.near && Math.hypot(npc.x - ox, npc.y - oy) < FOLK_WALK_PX_S) {
      const bump = Math.hypot((ctx.feetX != null ? ctx.feetX : Infinity) - npc.x, (ctx.feetY != null ? ctx.feetY : Infinity) - npc.y) < FOLK_BUMP_PX;
      /* never trapped: a step out of somewhere solid (he was put there) is let be */
      const solid = (x, y) => folkGroundBlocked(ctx.grid, ctx.worldW, ctx.worldH, ctx.boxes, x, y);
      if (bump || (solid(npc.x, npc.y) && !solid(ox, oy))) {
        npc.x = ox; npc.y = oy;
        npc._folkWork = null; npc._folkFace = null;
        _frame.held++;
        return true;
      }
    }
    if (moved && day.near) _frame.walkers++;   /* the cap's count: near the screen (far off he has no figure) */
    npc._folkWork = null;
    npc._folkFace = null;
    return true;
  }
  /* at his stop: working, or standing facing the street */
  npc._folkWork = day.walking ? null : day.work;
  npc._folkFace = day.walking ? null : 'south';
  return true;
}

if (typeof window !== 'undefined') {
  /* the probe (mp-folkwalk): the frame's numbers, and each townsperson's day */
  window.__btFolkWalk = (S) => {
    const st = S || (window._gameState && window._gameState.current);
    const npcs = (st && st.npcs) || [];
    return {
      on: _frame.on, wanted: !_off, near: _frame.near, walkers: _frame.walkers, held: _frame.held, max: FOLK_MAX_WALKERS,
      folk: npcs.filter((n) => n && n._folkDay).map((n) => ({ id: n.id, name: n.name, x: Math.round(n.x), y: Math.round(n.y),
        home: n._folkHome ? [Math.round(n._folkHome.x), Math.round(n._folkHome.y)] : null,
        walking: !!n._folkDay.walking, work: n._folkWork || null, face: n._folkFace || null, giver: !!n._folkDay.giver, near: !!n._folkDay.near })),
    };
  };
}
