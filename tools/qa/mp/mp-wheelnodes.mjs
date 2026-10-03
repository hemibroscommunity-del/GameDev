/* ═══ THE WHEEL'S RESOURCES, ON A PHONE (v2.3.3007) ═══
 *
 * Owner: "Add harvestable resources back to the wheel", and of their tiers:
 * "Copper can be in the safe areas around town ... Iron can be in lvl 1
 * monster areas ... 'black steel' in like level 10+ areas ... Same principle
 * for fishing and wood cutting too."  And earlier: "fishing could be bodies of
 * water close to town with active fishing areas showing fish swimming around
 * in the water".
 *
 * server/test/wheelzone.test.mjs pins the worker's half against a mocked room
 * (the baked places, tiers by band, names, shards, the wire, the kill
 * switch).  This is the half only a real client can show, on a phone, in the
 * Wheel, against a real worker:
 *   1. the worker advertises caps.wheelnodes and the Wheel's zone_state brings
 *      every node -- but with no tools in the bag none is drawn (v2.3.1680's
 *      rule, unchanged);
 *   2. the gold road of "Learn a Trade" (life_1) leads to the NEAREST fishing
 *      spot (it led nowhere in the Wheel before);
 *   3. at a fishing spot by town there are FISH, in the water: the spot and
 *      everywhere they swim is water by the game's own walk test, and the
 *      angler's seat is dry ground -- the ground the player sees, not the
 *      bake's own idea of it;
 *   4. tapping the spot fishes it, the worker pays a minnow, the spot's fish
 *      are gone while it is fished out -- and the road moves on to a tree;
 *   5. only the nodes near the view are drawn (~130 over the Wheel): the far
 *      ones hold no sprite and no text;
 *   6. a level 1-10 vein is IRON, drawn with its own picture (418 px, not the
 *      copper one's 627), a softwood tree with its tint -- and mining it pays
 *      iron ore;
 *   7. walking up to town drops the Wheel's nodes at the flip, not when town's
 *      snapshot comes in;
 *   8. no page errors.
 * Pictures: tools/qa/mp/out/wheelnodes-{fish,iron}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
/* where the body's centre stands to work each kind (mp-gatherhits' STAND):
   east of a pond, north of a vein */
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [50, -40] };
const SKILL = { oreVein: 'mining', tree: 'woodcutting', fishSpot: 'fishing' };
const RES = { oreVein: 'ore_', tree: 'wood_', fishSpot: 'fish_' };

const srvInv = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return (a && (a.inventory || (a.rpg && a.rpg.inventory) || (a.live && a.live.inventory))) || {};
};
const sumPrefix = (inv, pre) => Object.keys(inv || {}).filter((k) => k.indexOf(pre) === 0)
  .reduce((n, k) => n + (inv[k] || 0), 0);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Angler', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await body({ P, wsPort, rec, OUT, errors });
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

async function body({ P, wsPort, rec, OUT, errors }) {
  await H.enterWorld(P);
  await P.page.evaluate(() => { window.__btProbe = true; });
  const myId = await H.readState(P, (S) => S.myId);
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
    (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 90000, label: 'into the Wheel, its nodes in' }).catch(() => null);
  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.wheelnodes === true));
  rec.ok('the worker advertises caps.wheelnodes (guard)', caps === true, { caps });
  rec.ok(`in the Wheel, with its nodes (${inWheel ? inWheel.n : 0}) (guard)`, !!inWheel && inWheel.n > 100, inWheel);
  if (!inWheel) return;
  await P.page.addStyleTag({ content:
    '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

  /* ── 1. no tools, nothing drawn ── */
  await P.page.waitForTimeout(800);
  const bare = await P.page.evaluate(() => ({ wn: window.__btWheelNodes || null, fish: (window.__btWheelFish || []).length,
    tools: ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((window._gameState.current.rpg || {}).inventory || {})[k] > 0) }));
  rec.ok('with no tools in the bag, no node of the Wheel\'s is drawn', bare.tools.length === 0 && !!bare.wn && bare.wn.total > 100 && bare.wn.drawn === 0 && bare.fish === 0, bare);

  /* ── the tools, the way a player gets them: life_1 hands you the axe and
     the pole; the pickaxe is life_1's REWARD, so it is granted.  life_1 ALONE
     for now: a quest that names a land (tut_1's) wins the road over an "any
     zone" one (questTargetZone), and the commons' spot is inside the Mayor's
     gate anyway ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.channel.send({ type: 'quest_accept', payload: { questId: 'life_1' } });
  });
  await H.grant(wsPort, myId, 'item', { invKey: 'mining_pickaxe', count: 1 }).catch(() => {});
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 15 });
  const tools = await H.waitFor(P, (S) => ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
    (n) => n === 3, { timeout: 20000, label: 'the tools reach the bag' }).catch(() => 0);
  rec.ok('the axe, the pole and the pickaxe are in the bag (guard)', tools === 3, { tools });
  await closeTalk(P);
  /* how heavy a frame is here: a gesture's moves are timed on the page's own
     thread (activeMs counts gaps under 200 ms), so a slow software renderer
     is worth knowing about when one does not finish */
  const frame = await P.page.evaluate(() => new Promise((res) => {
    const t = []; const f = (now) => { t.push(now); if (t.length < 31) requestAnimationFrame(f); else res(Math.round((t[30] - t[0]) / 30)); };
    requestAnimationFrame(f);
  }));
  console.log(`    frame: ~${frame} ms in the Wheel on this box`);

  /* ── 2. the road leads to the nearest fishing spot ── */
  const nearest = (type) => P.page.evaluate((t) => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== t || !n.alive) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, tier: n.gatherLvl, d: Math.round(dd) }; }
    }
    return best;
  }, type);
  const road1 = await H.waitFor(P, () => (window.__btMinimap && window.__btMinimap.quest) || null, (q) => !!q && typeof q.x === 'number', { timeout: 10000, label: 'the road' }).catch(() => null);
  const spot = await nearest('fishSpot');
  rec.ok('the gold road of "Learn a Trade" leads to the nearest fishing spot',
    !!road1 && !!spot && road1.x === Math.round(spot.x) && road1.y === Math.round(spot.y), { road1, spot });
  rec.ok('...one of the safe ground\'s, a minnow pond (tier 1, the commons)', !!spot && spot.tier === 1 && /^wn-commons-/.test(spot.id), spot);
  if (!spot) return;

  /* ── 3. the fish, in the water ── */
  const sx = spot.x + STAND.fishSpot[0], sy = spot.y + STAND.fishSpot[1];
  await H.hopTo(P, sx, sy, { tries: 200 });
  const fish = await H.waitFor(P, () => window.__btWheelFish || [], (a) => Array.isArray(a) && a.length > 0, { timeout: 8000, label: 'fish drawn' }).catch(() => []);
  const mine = (fish || []).find((f) => f.id === spot.id);
  rec.ok('at the spot there are fish: a school of six minnows', !!mine && mine.fish === 6, { mine, fish });
  const water = await P.page.evaluate(({ x, y }) => {
    /* __btIsSolid takes a body's centre and reads the ground at its boots,
       52 px below (mp-wheelshore) -- so ask about a ground point g with g-52 */
    const at = (gx, gy) => window.__btIsSolid(gx, gy - 52);
    /* the school's circle and a fish's half-length round it (wheelNodes.js
       SWIM_*): x-18 +/- 45, y +/- 33 */
    const swim = [[-18, 0], [-63, 0], [27, 0], [-18, -33], [-18, 33], [-50, -20], [-50, 20], [10, -20], [10, 20]];
    return {
      spot: at(x, y),
      swim: swim.map(([dx, dy]) => at(x + dx, y + dy)),
      seat: at(x + 52, y + 9),
    };
  }, spot);
  rec.ok('...where they swim is water by the game\'s own walk test, and the angler\'s seat is dry ground',
    water.spot === true && water.swim.every(Boolean) && water.seat === false, water);
  await closeTalk(P);
  await P.page.waitForTimeout(600);
  await P.page.screenshot({ path: join(OUT, 'wheelnodes-fish.png') });
  /* and close up, round the spot, for a human to judge the fish */
  const clip = await P.page.evaluate(({ x, y }) => {
    const S = window._gameState.current, cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
    const sx = rc.left + (x - S.camera.x) * (S._worldScaleX || 1), sy = rc.top + (y - S.camera.y) * (S._worldScaleY || 1);
    return { x: Math.max(0, sx - 130), y: Math.max(0, sy - 110), width: 260, height: 200 };
  }, spot);
  await P.page.screenshot({ path: join(OUT, 'wheelnodes-fish-close.png'), clip }).catch(() => {});

  /* ── 4. fish it ── */
  const fished = await harvest(P, wsPort, myId, rec, 'fishSpot', spot);
  if (fished) {
    const after = await P.page.evaluate((id) => ({ alive: ((window._gameState.current.gatherNodes || []).find((n) => n.id === id) || {}).alive,
      fishHere: (window.__btWheelFish || []).some((f) => f.id === id) }), spot.id);
    rec.ok('fished out, its fish are gone until it comes back', after.alive === false && after.fishHere === false, after);
    const road2 = await H.waitFor(P, () => (window.__btMinimap && window.__btMinimap.quest) || null, (q) => !!q && typeof q.x === 'number', { timeout: 8000, label: 'the road on' }).catch(() => null);
    const tree = await nearest('tree');
    rec.ok('with a fish in the bag, the road moves on to the nearest tree (the quest\'s next step)',
      !!road2 && !!tree && road2.x === Math.round(tree.x) && road2.y === Math.round(tree.y), { road2, tree });
  }

  /* ── 5. only the nodes near the view are drawn ── */
  const cull = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const cx = S.camera.x + S._viewW / 2, cy = S.camera.y + S._viewH / 2;
    const reach = Math.hypot(S._viewW, S._viewH) / 2 + 320 + 400;
    const all = S.gatherNodes || [];
    const held = all.filter((n) => (n._pixiSprite && !n._pixiSprite.destroyed) || (n._pixiTier && !n._pixiTier.destroyed));
    return { total: all.length, held: held.length, far: held.filter((n) => Math.hypot(n.x - cx, n.y - cy) > reach).length, wn: window.__btWheelNodes };
  });
  rec.ok(`only the nodes near the view hold a display (${cull.held} of ${cull.total})`, cull.total > 100 && cull.held > 0 && cull.held < 30 && cull.far === 0, cull);

  /* ── 6. iron, in a land's levels 1-10 ── */
  const iron = await P.page.evaluate(() => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== 'oreVein' || n.gatherLvl !== 6 || !n.alive) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, name: n.name }; }
    }
    return best;
  });
  rec.ok('a land\'s levels 1-10 grow iron (guard)', !!iron && iron.name === 'Iron Ore', iron);
  /* out past the Mayor's gate now: tut_1 arms you and opens it */
  await P.page.evaluate(() => { window._gameState.current.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
  await H.waitFor(P, (S) => ((S.rpg || {})._quests || {}).tut_1 || null, (v) => v === 'active', { timeout: 10000, label: 'tut_1' }).catch(() => null);
  await closeTalk(P);
  if (iron) {
    /* to the vein's side, so the picture shows it beside the bro rather than
       under him (he stands on its north edge to mine, as everywhere) */
    await H.hopTo(P, iron.x + 90, iron.y + 20, { tries: 260 });
    await P.page.waitForTimeout(900);
    const look = await P.page.evaluate((id) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.id === id);
      const sp = n && n._pixiSprite;
      const trees = (S.gatherNodes || []).filter((g) => g.nodeType === 'tree' && g._pixiSprite && !g._pixiSprite.destroyed)
        .map((g) => ({ tier: g.gatherLvl, tint: g._pixiSprite.tint }));
      return { texH: sp && sp.texture ? sp.texture.height : null, trees };
    }, iron.id);
    rec.ok('the iron vein is drawn with its own picture (418 px tall; copper\'s is 627)', look.texH === 418, look);
    const soft = look.trees.find((t) => t.tier === 6);
    if (soft) rec.ok('a softwood tree near it takes the softwood tint', soft.tint === 0xd8e88a, soft);
    await closeTalk(P);
    await P.page.screenshot({ path: join(OUT, 'wheelnodes-iron.png') });
    const clip = await P.page.evaluate(({ x, y }) => {
      const S = window._gameState.current, cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
      const sx = rc.left + (x - S.camera.x) * (S._worldScaleX || 1), sy = rc.top + (y - S.camera.y) * (S._worldScaleY || 1);
      return { x: Math.max(0, sx - 110), y: Math.max(0, sy - 170), width: 260, height: 220 };
    }, iron);
    await P.page.screenshot({ path: join(OUT, 'wheelnodes-iron-close.png'), clip }).catch(() => {});
    await harvest(P, wsPort, myId, rec, 'oreVein', iron, 'ore_iron_ore');
  }

  /* ── 7. up to town: the Wheel's nodes go at the flip ── */
  await P.page.evaluate(() => {
    window.__qaFlip = null;
    const tick = () => {
      const S = window._gameState.current;
      if (S.currentZone === 'town') { window.__qaFlip = { nodes: (S.gatherNodes || []).length }; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const exit = await P.page.evaluate(() => {
    const S = window._gameState.current;
    for (let y = 0; y < S.map.length; y++) { const row = S.map[y]; const x = row.indexOf(8); if (x >= 0) return { tx: x, ty: y }; }
    return null;
  });
  if (exit) {
    await H.hopTo(P, exit.tx * 32 + 16 + 200, exit.ty * 32 + 16, { step: 200, tries: 260 });
    await H.hopTo(P, exit.tx * 32 + 16 + 40, exit.ty * 32 + 16, { tries: 20 });
  }
  const flip = await H.waitFor(P, () => window.__qaFlip, (v) => !!v && typeof v.nodes === 'number', { timeout: 30000, label: 'up to town' }).catch(() => null);
  rec.ok('walking up to town, the Wheel\'s nodes are dropped on the frame the zone flips', !!flip && flip.nodes === 0, { exit, flip });

  rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
}

/* A quest accepted from here can open Mayor Bro's talk over the whole screen
   (it is what a player sees on accepting at his side); a real player closes
   it, and a gesture under it never reaches the game. */
async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    /* an offer (tut_1's, the Mayor's welcome to a new bro beside him) is
       dismissed by its backdrop, as a player taps away from it */
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

/* Tap the node from where a player stands to work it, play the gesture, and
   ask the worker what it paid.  mp-gatherhits' tap and gesture, unchanged.
   `want` is the inventory key expected (else any of the kind's prefix). */
async function harvest(P, wsPort, myId, rec, type, node, want) {
  const skill = SKILL[type];
  await closeTalk(P);
  const invBefore = await srvInv(wsPort, myId);
  await P.page.evaluate(({ x, y }) => {
    const S = window._gameState.current;
    S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0;
    S._monstersStash = S.monsters; S.monsters = [];
  }, { x: node.x + STAND[type][0], y: node.y + STAND[type][1] });
  let started = null;
  for (let i = 0; i < 6 && started !== skill; i++) {
    await P.page.evaluate((id) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.id === id);
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
    }, node.id);
    await P.page.waitForTimeout(300);
    started = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
  }
  rec.ok(`${skill}: tapping the Wheel's ${type} starts the harvest (guard)`, started === skill, { started, node });
  if (started !== skill) return false;
  const opened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
    { timeout: 70000, label: 'the window opens' }).catch(() => null);
  rec.ok(`${skill}: the hits run down and the gesture window opens (guard)`, opened === 'ready', { opened });
  if (opened !== 'ready') return false;
  const cue = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest().cue : null));
  /* The gesture's moves 16 ms apart, in ONE uninterrupted run on the page's
     thread.  The meter's clock counts only gaps under 200 ms between moves
     (ExtractionSwipeLayer activeMs, "a thumb that rests is not working"), and
     a frame of the Wheel takes ~200 ms on this box's software renderer -- so
     moves that yield to the page between them (mp-gatherhits' sleep(16))
     land a frame apart and the meter barely moves: 0.28 in 60 s, measured.
     A phone draws a frame in ~16 ms; holding the thread for the stroke is
     the phone's cadence, not a shortcut through the gesture. */
  const g = await P.page.evaluate(([sk, cx, cy]) => {
    const S = window._gameState.current;
    const ev = (t, x, y) => window.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y,
      pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
    ev('pointerdown', cx, cy);
    const t0 = performance.now();
    let step = 0, lastProg = 0, next = t0;
    while (performance.now() - t0 < 12000) {
      while (performance.now() < next) { /* the phone's 16 ms */ }
      next += 16;
      let x = cx, y = cy;
      if (sk === 'fishing') {
        const a = step * (Math.PI / 6);
        x = cx + Math.cos(a) * 28; y = cy + Math.sin(a) * 28;
      } else {
        const k = step % 12, v = k < 6 ? -26 + 52 * k / 6 : 26 - 52 * (k - 6) / 6;
        if (sk === 'woodcutting') { x = cx + v; y = cy + Math.sin(step) * 3; } else { y = cy + v; x = cx + Math.sin(step) * 3; }
      }
      ev('pointermove', x, y);
      step++;
      const ex = S._extraction;
      if (ex) lastProg = ex.progress || 0;
      if (!ex || ex.status !== 'ready' || lastProg >= 1) break;
    }
    ev('pointerup', cx, cy);
    return { lastProg: +lastProg.toFixed(2), ms: Math.round(performance.now() - t0), moves: step };
  }, [skill, cue ? cue.x : 200, cue ? cue.y : 700]);
  /* the harvest ends on the game's next frames */
  const ended = await H.waitFor(P, (S) => !S._extraction, (v) => v === true, { timeout: 8000, label: 'the harvest ends' }).catch(() => false);
  g.done = ended === true && g.lastProg >= 0.85;
  rec.ok(`${skill}: the gesture completes the harvest`, g.done === true, g);
  let got = 0, inv = null;
  for (let i = 0; i < 20; i++) {
    inv = await srvInv(wsPort, myId);
    got = want ? (inv[want] || 0) - (invBefore[want] || 0) : sumPrefix(inv, RES[type]) - sumPrefix(invBefore, RES[type]);
    if (got > 0) break;
    await P.page.waitForTimeout(400);
  }
  rec.ok(`${skill}: the worker pays ${want || RES[type] + '*'} for the Wheel's node`, got > 0,
    { got, want, keys: Object.keys(inv || {}).filter((k) => k.indexOf(RES[type]) === 0) });
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; }
  });
  return got > 0;
}
