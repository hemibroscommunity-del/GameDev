/* ═══ mp-propdepth — in front of a prop or behind it, and where you stop (v2.3.2734) ═══
 *
 * Owner, with four iPhone screenshots of the town: "Fix layer detection for
 * props. Right now it's really bad at detecting contact and when the player
 * should appropriately show in front or behind the layer. Jogging against a
 * prop seems to be some of the most problematic."
 *
 * Each screenshot is a case here, set up the way it happened:
 *   1. the forge's weapon rack drawn over your head while your feet were
 *      plainly south of it                              -> "forge rack"
 *   2. walking into the bench from behind: your feet came out the front of it
 *      and it was drawn over your chest                 -> "bench from behind"
 *   3. behind the lamp -- that one was right, and must stay right
 *   4. beside the auction house's left corner, drawn behind the whole
 *      building                                         -> "auction corner"
 *
 * Every layer assertion is checked against the OLD rule on the same frame
 * (window.__btDepthLegacy), so each case proves it tells the two apart rather
 * than passing on an arrangement both rules agree on.
 *
 * The two numbers underneath:
 *   - where the player touches the ground: their drawn FEET (__btPlayerGround),
 *     not S.player.y, which is the body's centre;
 *   - where a prop touches the ground at an x: __btPropGround(id, x), read off
 *     its art (propGround.js).
 *
 * `layer` is the prop's parent: 'entities' = drawn UNDER the player (the prop
 * is behind him), 'gatherNodesFront' = drawn OVER him.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const DIR = '/tmp/qa-propdepth';
const PHONE = { width: 390, height: 844 };
const BEHIND_PLAYER = 'entities';
const OVER_PLAYER = 'gatherNodesFront';
const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
      'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const d = {}; for (const k of l) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
};

const props = (P) => P.page.evaluate(() => (window.__btWorldProps ? window.__btWorldProps() : []) || []);
const layerOf = (P, id) => P.page.evaluate((i) => {
  const h = ((window.__btWorldProps ? window.__btWorldProps() : []) || []).find((p) => p.id === i);
  return h ? h.layer : null;
}, id);
const feet = (P) => P.page.evaluate(() => (window.__btPlayerGround ? window.__btPlayerGround() : null));
const propLine = (P, id, x) => P.page.evaluate(([i, px]) => (window.__btPropGround ? window.__btPropGround(i, px) : null), [id, x]);
const legacy = (P, on) => P.page.evaluate((v) => { if (window.__btDepthLegacy) window.__btDepthLegacy(v); }, on);
const frames = (P, n = 3) => P.page.evaluate((k) => new Promise((res) => {
  let i = 0; const f = () => { if (++i >= k) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f);
}), n);

/* Put the player so that his FEET land on (fx, fy): hop the body there, read
   back how far below it the feet are drawn, and correct once. */
async function standFeetAt(P, fx, fy) {
  const dy0 = await P.page.evaluate(() => {
    const g = window.__btPlayerGround && window.__btPlayerGround();
    const S = window._gameState.current;
    return g && Number.isFinite(g.y) ? g.y - S.player.y : 52;
  });
  await H.hopTo(P, fx, fy - dy0);
  await P.page.evaluate(() => { const S = window._gameState.current; S.player.vx = 0; S.player.vy = 0; });
  await frames(P, 4);
  const g = await feet(P);
  if (g && Math.abs(g.y - fy) > 1.5) {
    const S0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    await H.hopTo(P, fx, S0.y + (fy - g.y));
    await frames(P, 4);
  }
  return feet(P);
}

/* The layer this prop is in under the NEW rule and under the OLD one, same
   spot, same frame content. */
async function bothRules(P, id) {
  await legacy(P, false); await frames(P, 3);
  const now = await layerOf(P, id);
  await legacy(P, true); await frames(P, 3);
  const old = await layerOf(P, id);
  await legacy(P, false); await frames(P, 3);
  return { now, old };
}

/* Record, every drawn frame, the deepest the player's feet got into any
   footprint (positive = inside). */
const startPen = (P) => P.page.evaluate(() => {
  const list = ((window.__btWorldProps ? window.__btWorldProps() : []) || []).filter((p) => p.footprint);
  window.__pdPen = { max: -Infinity, at: null, run: true };
  const tick = () => {
    const st = window.__pdPen;
    if (!st || !st.run) return;
    const g = window.__btPlayerGround();
    for (const p of list) {
      const f = p.footprint;
      const d = Math.min(g.x - f.x0, f.x1 - g.x, g.y - f.y0, f.y1 - g.y);
      if (d > st.max) { st.max = d; st.at = { id: p.id, x: +g.x.toFixed(1), y: +g.y.toFixed(1) }; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const stopPen = (P) => P.page.evaluate(() => { const st = window.__pdPen; st.run = false; return { max: st.max, at: st.at }; });

async function shot(P, tag) {
  await frames(P, 3);
  await P.page.screenshot({ path: `${DIR}/${tag}.png` });
}

/* v2.3.2735: every page this scenario opens is closed when it ends, pass or
   throw.  A page left open keeps running the game at full frame rate on the
   shared software GPU, and every later scenario in the run pays for it. */
export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  mkdirSync(DIR, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Walker', wsPort, webPort, viewport: PHONE, dpr: 2, init: COACH_OFF });
  opened.push(A);
  await H.enterWorld(A);
  await A.page.waitForTimeout(2000);
  await H.clickText(A, 'CLOSE').catch(() => {});
  /* the town's shadows are part of the pictures, not of these checks */
  await A.page.evaluate(() => { if (window.__btLightFx) window.__btLightFx.set(false); });

  const list = await props(A);
  const byId = (id) => list.find((p) => p.id === id) || null;
  const bench = byId('bench-w'), forge = byId('forge'), ah = byId('auction-house');
  rec.ok('the bench, the forge and the auction house are drawn, with footprints (guard)',
    !!(bench && forge && ah && bench.footprint && forge.footprint && ah.footprint), list.map((p) => p.id));
  if (!(bench && forge && ah)) return;

  /* the profiles are read one prop per frame; give the town a moment */
  await H.waitFor(A, () => ['bench-w', 'forge', 'auction-house'].every((i) => {
    const g = window.__btPropGround && window.__btPropGround(i, 0);
    return !!(g && g.profiled);
  }), (v) => v, { timeout: 15000, label: 'prop profiles' }).catch(() => {});

  /* ── the feet, not the waist ── */
  const g0 = await feet(A);
  const y0 = await H.readState(A, (S) => S.player.y);
  const drop = g0 ? g0.y - y0 : NaN;
  console.log('    feet drop below S.player.y: ' + (drop === drop ? drop.toFixed(1) : 'n/a'));
  rec.ok('the depth pass pivots on the player\'s FEET, ~52 world px below S.player.y (the body\'s centre)',
    Number.isFinite(drop) && drop > 44 && drop < 60, { drop });

  /* ── 4. the auction house's left corner ── */
  const fpA = ah.footprint;
  const xc = fpA.x0 - 14;                         /* beside the footprint, at the left corner */
  const lineA = await propLine(A, 'auction-house', xc);
  console.log('    auction house: base ' + (lineA && lineA.base) + ', base at the left corner ' + (lineA && lineA.line && lineA.line.toFixed(1)));
  rec.ok('the auction house\'s base is read off its art: at the left corner it is well NORTH of the front step (the isometric diamond)',
    !!(lineA && lineA.profiled && lineA.line < lineA.base - 40), lineA);
  if (lineA && lineA.line) {
    await standFeetAt(A, xc, lineA.line + 26);
    const r1 = await bothRules(A, 'auction-house');
    await shot(A, 'corner-after');
    await legacy(A, true); await shot(A, 'corner-before'); await legacy(A, false);
    rec.ok('beside the auction house\'s left corner, feet in front of its wall: the building draws BEHIND you (screenshot 4)',
      r1.now === BEHIND_PLAYER, r1);
    rec.ok('...where the old rule drew the whole building over you (guard: the case tells the rules apart)',
      r1.old === OVER_PLAYER, r1);
    await standFeetAt(A, xc, lineA.line - 26);
    const r2 = await bothRules(A, 'auction-house');
    rec.ok('...and a step north of that wall, behind it, the building draws OVER you again',
      r2.now === OVER_PLAYER, r2);

    /* walk the line: the flip must happen AT the wall, not a body-length off */
    const steps = [];
    for (let d = 40; d >= -40; d -= 8) {
      const g = await standFeetAt(A, xc, lineA.line + d);
      steps.push({ d, feet: g && +(g.y - lineA.line).toFixed(1), layer: await layerOf(A, 'auction-house') });
    }
    const flips = steps.filter((s, i) => i > 0 && s.layer !== steps[i - 1].layer);
    const flipAt = flips.length ? flips[0] : null;
    console.log('    corner walk: ' + JSON.stringify(steps.map((s) => [s.d, s.layer === OVER_PLAYER ? 'over' : 'under'])));
    rec.ok('walking north past the corner, the building changes sides ONCE, at its wall (within 9 px)',
      flips.length === 1 && Math.abs(flipAt.feet) <= 9, { flips, steps });
  }

  /* ── 1. the forge's weapon rack ── */
  const fpF = forge.footprint;
  const xr = fpF.x1 + 13;                          /* beside the footprint, at the rack */
  const lineF = await propLine(A, 'forge', xr);
  console.log('    forge: base ' + (lineF && lineF.base) + ', base at the rack ' + (lineF && lineF.line && lineF.line.toFixed(1)));
  if (lineF) {
    /* feet south of the forge's own base, waist north of it: the exact
       arrangement in which the old rule put the rack over your head */
    await standFeetAt(A, xr, lineF.base + 22);
    const r3 = await bothRules(A, 'forge');
    await shot(A, 'rack-after');
    await legacy(A, true); await shot(A, 'rack-before'); await legacy(A, false);
    rec.ok('at the forge\'s weapon rack, feet south of the forge\'s base: the forge draws BEHIND you (screenshot 1)',
      r3.now === BEHIND_PLAYER, r3);
    rec.ok('...where the old rule, reading your waist, drew it over your head',
      r3.old === OVER_PLAYER, r3);
    await standFeetAt(A, xr, lineF.line - 20);
    const r4 = await bothRules(A, 'forge');
    rec.ok('...and standing behind the rack\'s own feet, the forge draws over you',
      r4.now === OVER_PLAYER, { ...r4, rackBase: lineF.line });
  }

  /* ── 2. walking into the bench from behind ── */
  const fpB = bench.footprint;
  await standFeetAt(A, (fpB.x0 + fpB.x1) / 2, fpB.y0 - 50);
  const before = await feet(A);
  await startPen(A);
  await H.nudge(A, 's', 1600);
  await frames(A, 4);
  const pen = await stopPen(A);
  const after = await feet(A);
  console.log('    bench walk: feet ' + (before && before.y.toFixed(1)) + ' -> ' + (after && after.y.toFixed(1))
    + ' (back edge ' + fpB.y0 + ', base ' + fpB.y1 + '), deepest ' + JSON.stringify(pen));
  rec.ok('walking south into the bench from behind actually moved the player (guard)',
    !!(before && after && after.y - before.y > 20), { before, after });
  rec.ok('...and his FEET stop at the bench\'s back edge, not 52 px later out of its front (screenshot 2)',
    !!(after && after.y <= fpB.y0 - 4 && after.y >= fpB.y0 - 20), { feetY: after && after.y, backEdge: fpB.y0 });
  rec.ok('...never once inside its footprint on the way',
    pen.max < 0, pen);
  const r5 = await bothRules(A, 'bench-w');
  await shot(A, 'bench-after');
  rec.ok('...so the bench, in front of him, draws OVER him',
    r5.now === OVER_PLAYER, r5);
  /* the old stop, for the picture: feet 52 px on, through the bench */
  await standFeetAt(A, (fpB.x0 + fpB.x1) / 2, fpB.y1 + 8);
  await legacy(A, true); await shot(A, 'bench-before'); await legacy(A, false);

  /* beside the bench, feet south of its base: in front of it */
  await standFeetAt(A, fpB.x1 + 14, fpB.y1 + 22);
  const r6 = await bothRules(A, 'bench-w');
  rec.ok('beside the bench, feet south of its base: the bench draws BEHIND you',
    r6.now === BEHIND_PLAYER, r6);
  rec.ok('...where the old rule, reading your waist, drew it over you',
    r6.old === OVER_PLAYER, r6);

  /* ── walking north into a building's front: never inside its footprint ── */
  await standFeetAt(A, forge.x, fpF.y1 + 120);
  await startPen(A);
  await H.nudge(A, 'w', 1800);
  const pen2 = await stopPen(A);
  const atFront = await feet(A);
  console.log('    forge front walk: feet stop at ' + (atFront && atFront.y.toFixed(1)) + ' (base ' + fpF.y1 + ')');
  rec.ok('walking north into the forge, the feet stay out of its footprint',
    pen2.max < 0, pen2);

  /* ── 3. behind the lamp stays behind ── */
  const lamp = byId('lamp-plaza-w');
  if (lamp && lamp.footprint) {
    await standFeetAt(A, lamp.x - 20, lamp.footprint.y0 - 12);
    const r7 = await bothRules(A, 'lamp-plaza-w');
    rec.ok('behind the lamp post, the lamp still draws over you (screenshot 3 was right; still is)',
      r7.now === OVER_PLAYER, r7);
  }

  /* ── an NPC walked into from behind ── */
  const npc = await A.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.npcs || []).find((q) => q && q.alive !== false && q.id === 'mayor_bro')
      || (S.npcs || []).find((q) => q && q.alive !== false);
    return n ? { id: n.id, x: n.x, y: n.y } : null;
  });
  if (npc) {
    await standFeetAt(A, npc.x, npc.y - 60);
    await H.nudge(A, 's', 1200);
    await frames(A, 4);
    const fN = await feet(A);
    const nNow = await A.page.evaluate((id) => {
      const S = window._gameState.current; const n = (S.npcs || []).find((q) => q.id === id); return n ? n.y : null;
    }, npc.id);
    const lay = await A.page.evaluate((id) => (window.__btDepthLayers ? window.__btDepthLayers() : {})['npc_' + id], npc.id);
    rec.ok('walking into an NPC from behind, your feet stop behind his and he draws over you',
      !!(fN && nNow != null && fN.y < nNow - 4 && lay === OVER_PLAYER), { feetY: fN && fN.y, npcY: nNow, layer: lay, npc: npc.id });
  }

  /* ── a peer sorts on their feet too ── */
  const B = await H.newPlayer(browser, { name: 'Bystander', wsPort, webPort, guest: true, viewport: PHONE, dpr: 2, init: COACH_OFF });
  opened.push(B);
  await H.enterWorld(B);
  await H.clickText(B, 'CLOSE').catch(() => {});
  await H.waitMutualSight(A, B).catch(() => {});
  const bId = await H.readState(B, (S) => S.myId);
  await standFeetAt(B, fpB.x1 + 14, fpB.y1 + 22);          /* in front of the bench, waist north of its base */
  await standFeetAt(A, (fpB.x0 + fpB.x1) / 2, fpB.y1 + 260); /* A well south: bench and B both behind A */
  /* Wait for B to be ON A's screen where B actually stands: a peer's position
     arrives over the relay and is eased in, and on a loaded box that has
     taken longer than a fixed pause (one run read A's scene before B was in
     it at all). */
  const bAt = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y }));
  let arrived = false;
  for (let i = 0; i < 40 && !arrived; i++) {
    arrived = await A.page.evaluate(([id, x, y]) => {
      const o = window._gameState.current.others && window._gameState.current.others[id];
      const drawn = (window.__btDepthOrder ? window.__btDepthOrder() : []).some((c) => c.label === 'other_' + id);
      const ry = o ? (typeof o.renderY === 'number' ? o.renderY : o.y) : NaN;
      return !!o && drawn && Math.abs(o.x - x) < 6 && Math.abs(ry - y) < 6;
    }, [bId, bAt.x, bAt.y]);
    if (!arrived) await A.page.waitForTimeout(500);
  }
  rec.ok('the other player is on your screen where they stand (guard)', arrived, { bAt });
  const order = await A.page.evaluate(() => (window.__btDepthOrder ? window.__btDepthOrder() : []) || []);
  const bench2 = order.find((c) => c.label === 'prop_bench-w');
  const peer2 = order.find((c) => c.label === 'other_' + bId);
  const peerAfter = !!(bench2 && peer2) && (peer2.rank > bench2.rank || (peer2.rank === bench2.rank && peer2.index > bench2.index));
  rec.ok('another player standing in front of the bench is drawn over it on your screen (sorted on their feet)',
    peerAfter, { peer: peer2, bench: bench2 });

  /* ── the rule holds across the whole entity layer ── */
  const layerOrder = await A.page.evaluate(() => (window.__btEntityDepth ? window.__btEntityDepth() : []) || []);
  const inv = [];
  for (let i = 1; i < layerOrder.length; i++) if (layerOrder[i].z < layerOrder[i - 1].z) inv.push([layerOrder[i - 1], layerOrder[i]]);
  rec.ok('the entity layer is in key order', inv.length === 0, inv);
  const off = layerOrder.filter((c) => !c.raised && Math.abs(c.z - c.y) > 1);
  rec.ok('...and every key is its object\'s ground line, except a figure raised over a building it stands in front of',
    off.length === 0, off);
  const badRaise = layerOrder.filter((c) => c.raised && !(c.z > c.y));
  rec.ok('...which is only ever raised, never lowered', badRaise.length === 0, badRaise);

  for (const P of [A, B]) {
    const errs = (P.logs || []).filter((l) => /pixi-render|depth sort threw|TypeError|ReferenceError/.test(l));
    rec.ok(`no depth-pass errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 4));
  }
}
