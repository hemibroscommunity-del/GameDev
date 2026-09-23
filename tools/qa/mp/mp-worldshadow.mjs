/* ═══ mp-worldshadow — the world casts shadows too (v2.3.2749) ═══
 *
 * Owner: "Add shadows to props and monsters."
 *
 * v2.3.2710 gave every FIGURE a shadow along its map's light -- you, other
 * players, townsfolk, monsters.  This adds the world: props (the town's
 * buildings, benches and lamps, frost's pines and rocks) and gather nodes
 * (trees, ore).  And it proves the monster half zone by zone, because a
 * monster that draws its body some other way than `_spriteBody` would cast
 * nothing and nobody would notice until it stood next to one that did.
 *
 * Per sunlit zone the player can reach: every monster, prop and tree ON
 * SCREEN must be in the shadow pass's caster list (window.__btLightFx
 * .probe().shadows.keys).  A sunless zone casts nothing by design (mp-lightfx
 * covers that).  Pictures of each zone, off and on, go to /tmp/qa-worldshadow/.
 *
 * And the one thing a shadow must never do: fall on the LIT side.  In town
 * the sun is upper-left, so a building's shadow darkens the cobble to its
 * lower right and leaves its lower left alone -- measured beside the auction
 * house, on the same frame with the switch off and on.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const DIR = '/tmp/qa-worldshadow';
const PHONE = { width: 390, height: 844 };
const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
      'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const d = {}; for (const k of l) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
};

const probe = (P) => P.page.evaluate(() => (window.__btLightFx ? window.__btLightFx.probe() : null));
const frames = (P, n = 3) => P.page.evaluate((k) => new Promise((res) => {
  let i = 0; const f = () => { if (++i >= k) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f);
}), n);

/* Everything that should cast and is on screen right now: monsters by
   display, props by the props probe, trees/ore by their sprites. */
const onScreen = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer;
  const S = window._gameState.current;
  const cv = document.querySelector('canvas').getBoundingClientRect();
  const inView = (d) => {
    const g = d.getGlobalPosition ? d.getGlobalPosition() : null;
    return !!g && g.x > -20 && g.y > -20 && g.x < cv.width + 20 && g.y < cv.height + 60;
  };
  const found = [];
  const walk = (n) => {
    if (!n || n.visible === false) return;
    const L = n.label || '';
    if (L.indexOf('monster_') === 0) {
      const b = n._spriteBody;
      const tex = b && b.texture;
      const drawn = !!(b && b.visible && tex && tex.source && tex.width > 2);
      if (drawn && inView(n)) found.push({ kind: 'm', id: L.slice(8), type: (n._monster && (n._monster.archetype || n._monster.type)) || null });
      return;
    }
    for (const c of (n.children || [])) walk(c);
  };
  walk(R.app.stage);
  for (const p of ((window.__btWorldProps ? window.__btWorldProps() : []) || [])) {
    found.push({ kind: 'prop', id: p.id });
  }
  for (const nd of (S.gatherNodes || [])) {
    const s = nd && nd._pixiSprite;
    if (s && !s.destroyed && s.visible && s._groundDy && inView(s)) found.push({ kind: 'node', id: String(nd.id), type: nd.nodeType });
  }
  return found;
});

/* The game logs an idle character out after two minutes without a real
   touch or key (IDLE_LOGOUT_MS, v2.3.1913), and hopTo moves the player
   WITHOUT one.  This scenario spends longer than that looking at the town,
   and the first run of the longer version was logged out before its warp.
   A real key press, the way a player's thumb would, before each step. */
const keepAlive = (P) => P.page.keyboard.press('Shift').catch(() => {});

const keyOf = (f) => (f.kind === 'm' ? 'm:' + f.id : f.kind === 'prop' ? 'prop:' + f.id : 'node:' + f.id);

/* Before and after, one frame apart: "before" is the game as it was -- the
   figures casting, the props and trees not -- so the difference between the
   two pictures is exactly the world's shadows. */
const setWorld = (P, on) => P.page.evaluate((v) => { if (window.__btLightFx && window.__btLightFx.world) window.__btLightFx.world(v); }, on);
async function pictures(P, tag) {
  await setWorld(P, false); await frames(P, 4);
  const off = await P.page.screenshot({ path: `${DIR}/${tag}-off.png` });
  await setWorld(P, true); await frames(P, 4);
  const on = await P.page.screenshot({ path: `${DIR}/${tag}-on.png` });
  return { off: H.decodePng(off), on: H.decodePng(on) };
}

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

/* Check every caster-worthy thing on screen is in the caster list. */
async function everyoneCasts(P, rec, zone) {
  await frames(P, 4);
  const want = await onScreen(P);
  const p = await probe(P);
  const keys = new Set((p && p.shadows && p.shadows.keys) || []);
  const miss = want.filter((f) => !keys.has(keyOf(f)));
  const mons = want.filter((f) => f.kind === 'm');
  const types = [...new Set(mons.map((m) => m.type))];
  console.log(`    ${zone}: on screen ${JSON.stringify({ monsters: mons.length, types, props: want.filter((f) => f.kind === 'prop').length, nodes: want.filter((f) => f.kind === 'node').length })}`);
  return { want, miss, mons, types, p };
}

/* ═══ A HOP THAT DOES NOT WALK OUT OF THE ZONE ═══
   In a combat zone, coming within two tiles of a return marker (map tile 9)
   sends you back to the hub (zoneTransitions, v2.3.823) -- and hopTo moves
   in a straight line, so a hop to a monster beyond the entry could cross the
   exit on the way: one run's Frost Ridge checks all read the World View.
   So the route is searched on the zone's tile grid (8-way, breadth first)
   around every tile within three of a marker -- the trigger's two plus one
   of margin -- and hopped waypoint by waypoint.  The start tile is exempt:
   the player is standing there and was not sent out.  Null if there is no
   such route (the target itself is by an exit). */
async function safeHop(P, tx, ty) {
  const route = await P.page.evaluate(([x, y]) => {
    const S = window._gameState.current;
    const T = 32;
    const map = S.map || [];
    const Hh = map.length, W = map[0] ? map[0].length : 0;
    if (!W) return [];
    const marks = [];
    for (let r = 0; r < Hh; r++) for (let c = 0; c < W; c++) if (map[r] && map[r][c] === 9) marks.push([c, r]);
    const bad = (c, r) => marks.some(([mc, mr]) => Math.abs(mc - c) + Math.abs(mr - r) <= 3);
    const clampT = (v, n) => Math.max(0, Math.min(n - 1, v));
    const sc = clampT(Math.floor(S.player.x / T), W), sr = clampT(Math.floor(S.player.y / T), Hh);
    const tc = clampT(Math.floor(x / T), W), tr = clampT(Math.floor(y / T), Hh);
    window.__wsHopWhy = { from: [sc, sr], to: [tc, tr], marks: marks.length, grid: [W, Hh] };
    if (bad(tc, tr)) return null;
    const prev = new Int32Array(W * Hh).fill(-2);
    const q = [sr * W + sc];
    prev[sr * W + sc] = -1;
    while (q.length) {
      const i = q.shift();
      if (i === tr * W + tc) break;
      const c = i % W, r = (i - c) / W;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nc = c + dc, nr = r + dr;
        if ((!dc && !dr) || nc < 0 || nr < 0 || nc >= W || nr >= Hh) continue;
        const j = nr * W + nc;
        if (prev[j] !== -2 || bad(nc, nr)) continue;
        prev[j] = i;
        q.push(j);
      }
    }
    if (prev[tr * W + tc] === -2) return null;
    const path = [];
    for (let i = tr * W + tc; i !== -1; i = prev[i]) path.push(i);
    path.reverse();
    const pts = [];
    for (let k = 3; k < path.length - 1; k += 3) {
      const c = path[k] % W, r = (path[k] - c) / W;
      pts.push([c * T + T / 2, r * T + T / 2]);
    }
    return pts;
  }, [tx, ty]);
  if (!route) return false;
  for (const [x, y] of route) await H.hopTo(P, x, y);
  await H.hopTo(P, tx, ty);
  return true;
}

/* Stand where some monsters are: the nearest one that can be reached
   without passing an exit, from the south. */
async function nearMonsters(P) {
  await keepAlive(P);
  const ms = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return (S.monsters || []).filter((q) => q && q.alive)
      .map((q) => ({ x: q.x, y: q.y, d: Math.hypot(q.x - S.player.x, q.y - S.player.y) }))
      .sort((a, b) => a.d - b.d);
  });
  for (const m of ms) {
    if (await safeHop(P, m.x, m.y + 170)) { await P.page.waitForTimeout(1200); return m; }
  }
  await P.page.waitForTimeout(1200);
  return null;
}

/* v2.3.2749: every page this scenario opens is closed when it ends, pass or
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
  const A = await H.newPlayer(browser, { name: 'Sundial', wsPort, webPort, viewport: PHONE, dpr: 2, init: COACH_OFF });
  opened.push(A);
  await H.enterWorld(A);
  await A.page.waitForTimeout(2000);
  await H.clickText(A, 'CLOSE').catch(() => {});
  const myId = await H.readState(A, (S) => S.myId);
  /* A tree or an ore rock is only DRAWN for a player carrying the tool that
     gathers it (effectsRenderer: hasGatherTool) -- a fresh character sees
     neither, so the node checks below need an axe and a pickaxe first. */
  for (const invKey of ['woodcutting_axe', 'mining_pickaxe']) {
    await H.grant(wsPort, myId, 'item', { invKey, count: 1 }).catch(() => {});
  }
  await A.page.waitForTimeout(800);

  /* ── town: the buildings ── */
  const ah = ((await A.page.evaluate(() => (window.__btWorldProps ? window.__btWorldProps() : []))) || [])
    .find((p) => p.id === 'auction-house');
  rec.ok('the auction house is drawn in town (guard)', !!ah);
  if (ah) {
    await H.hopTo(A, ah.x - 60, ah.y + 150);
    await frames(A, 6);
    const t = await everyoneCasts(A, rec, 'town');
    rec.ok('in town, every prop casts a shadow', t.miss.filter((f) => f.kind === 'prop').length === 0,
      { missing: t.miss.filter((f) => f.kind === 'prop') });
    await pictures(A, 'town-auction');
    /* THE SUN'S SIDE AND THE SHADE'S SIDE, each measured with the player
       standing beside it so it is on screen.  Shaded: the cobble right of the
       right-hand corner, where the building model lays its roof and sign
       (shadows.js placeDepth).  Sunlit: the cobble in front of the LEFT wall
       -- exactly where the first cut, one pivot for the whole building, put
       the back-left tower's shadow. */
    const fp = ah.footprint;
    const darkening = async (standAt, box, tag) => {
      await keepAlive(A);
      await H.hopTo(A, standAt.x, standAt.y);
      await frames(A, 6);
      const pic = await pictures(A, tag);
      const a = await toScreen(A, box.x0, box.y0);
      const b = await toScreen(A, box.x1, box.y1);
      const r = { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
      return meanLum(pic.off, r) - meanLum(pic.on, r);
    };
    const dR = await darkening({ x: fp.x1 + 150, y: ah.y + 40 },
      { x0: fp.x1 + 90, y0: ah.y - 110, x1: fp.x1 + 210, y1: ah.y - 60 }, 'town-auction-shade');
    const dL = await darkening({ x: fp.x0 - 30, y: ah.y + 60 },
      { x0: fp.x0 - 10, y0: ah.y - 55, x1: fp.x0 + 70, y1: ah.y - 5 }, 'town-auction-sun');
    console.log(`    auction house: darkening on its shaded side ${dR.toFixed(1)}, in front of its sunlit wall ${dL.toFixed(1)}`);
    rec.ok('the auction house\'s shadow falls on its SHADED side (right of it), not in front of its sunlit left wall',
      dR > 6 && dL < 3, { shaded: +dR.toFixed(1), sunlit: +dL.toFixed(1) });
    const forge = ((await A.page.evaluate(() => window.__btWorldProps())) || []).find((p) => p.id === 'forge');
    if (forge) {
      await keepAlive(A);
      await H.hopTo(A, forge.x + 120, forge.y + 170);
      await frames(A, 6);
      await pictures(A, 'town-forge');
    }
  }

  await H.devOp(wsPort, 'vitals', myId, { god: true });

  /* ── the sunlit zones with monsters in them ── */
  const zones = [
    { label: 'Frost Ridge', id: 'frost' },
    { label: 'Wind Dunes', id: 'sky' },
    { label: 'Verdant Wilds', id: 'verdant' },
  ];
  const typesSeen = {};
  for (const z of zones) {
    await keepAlive(A);
    try {
      await H.warpToZone(A, { wsPort, label: z.label, zoneId: z.id });
    } catch (e) {
      rec.ok(`${z.label}: reachable (guard)`, false, String(e).slice(0, 200));
      continue;
    }
    await H.devOp(wsPort, 'vitals', myId, { god: true });
    await H.clickText(A, 'CLOSE').catch(() => {});
    let r = null;
    for (let tries = 0; tries < 4; tries++) {
      await nearMonsters(A);
      r = await everyoneCasts(A, rec, z.id);
      if (r.mons.length) break;
    }
    typesSeen[z.id] = r ? r.types : [];
    rec.ok(`${z.label}: there are monsters on screen to check (guard)`, !!r && r.mons.length > 0, r && r.want);
    if (r) {
      rec.ok(`${z.label}: every monster on screen casts a shadow (${r.types.join(', ') || 'none'})`,
        r.mons.length > 0 && r.miss.filter((f) => f.kind === 'm').length === 0,
        { missing: r.miss.filter((f) => f.kind === 'm'), onScreen: r.mons.length });
      const others = r.miss.filter((f) => f.kind !== 'm');
      rec.ok(`${z.label}: ...and so does every prop and tree on screen`, others.length === 0, { missing: others });
    }
    await pictures(A, z.id);

    /* every zone has one tree and one ore rock, placed at random (server
       gathering.js) -- go and stand by each */
    const nodes = await A.page.evaluate(() => (window._gameState.current.gatherNodes || [])
      .filter((n) => n && n.alive !== false && (n.nodeType === 'tree' || n.nodeType === 'oreVein'))
      .map((n) => ({ id: String(n.id), x: n.x, y: n.y, type: n.nodeType })));
    for (const n of nodes) {
      await keepAlive(A);
      const went = await safeHop(A, n.x - 40, n.y + 140);
      if (!went) {
        const why = await A.page.evaluate(() => window.__wsHopWhy || null);
        rec.ok(`${z.label}: the ${n.type === 'tree' ? 'tree' : 'ore rock'} can be reached without passing an exit (guard)`, false, { node: n, why });
        continue;
      }
      await frames(A, 6);
      const p = await probe(A);
      const keys = new Set((p && p.shadows && p.shadows.keys) || []);
      const vis = await A.page.evaluate((id) => {
        const q = (window._gameState.current.gatherNodes || []).find((m) => String(m.id) === id);
        const sp = q && q._pixiSprite;
        return !!(sp && !sp.destroyed && sp.visible);
      }, n.id);
      rec.ok(`${z.label}: the ${n.type === 'tree' ? 'tree' : 'ore rock'} casts a shadow, from its drawn base`,
        vis && keys.has('node:' + n.id), { node: n, visible: vis, cast: keys.has('node:' + n.id) });
      if (n.type === 'tree') await pictures(A, z.id + '-tree');
    }
  }
  console.log('    monster types checked: ' + JSON.stringify(typesSeen));

  const errs = (A.logs || []).filter((l) => /lightFx threw|depth sort threw|TypeError|ReferenceError/.test(l));
  rec.ok('no light or depth errors on the client', errs.length === 0, errs.slice(0, 4));
}
