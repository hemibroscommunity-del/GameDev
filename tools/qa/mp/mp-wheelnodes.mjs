/* ═══ THE WHEEL'S RESOURCES, ON A PHONE (v2.3.3012) ═══
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
 *      everywhere they swim is water as the ground is DRAWN, and the
 *      angler's seat is dry ground -- the ground the player sees, not the
 *      bake's own idea of it -- and (v2.3.3003's swimming came in beside
 *      this) a swimmer who taps the spot climbs out onto that seat to fish;
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
 * And, v2.3.3012's follow-ups (owner: "Make the black steel black.  Show
 * nodes on minimap."): the minimap marks every live resource in its reach
 * once the tools are in the bag (and none before), and a black steel blade is
 * drawn in the Black Steel metal.  And no chop from the water: a tree tapped
 * while swimming is refused, "Swimming!", like a swing.
 * Pictures: tools/qa/mp/out/wheelnodes-{fish,fish-close,minimap,blacksteel,
 * iron,iron-close}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
/* where the body's centre stands to work each kind (mp-gatherhits' STAND):
   north of a vein, and the angler's own seat for a fishing spot
   (FISH_SEAT_DX/DY, 52/-43).  Not mp-gatherhits' (50, -40): 3 px lower puts
   the boots on the line to the cell below the seat, which the bake does not
   promise is dry. */
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [52, -43] };
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
  const P = await H.newPlayer(browser, { name: 'Angler', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel', query: 'wayback' /* v2.3.3025: its way back up to town, step 7 */ });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  /* v2.3.3016: real input on a loop.  The walker moves by writing its
     position, which no input listener hears, and a page logs itself out
     after two minutes without a tap or a key (BroTown.jsx IDLE_LOGOUT_MS):
     the worker forgot the angler mid-walk and never paid the minnow -- every
     step after it waiting on a player who was gone.  Control does nothing in
     the game (mp-wheelseats' keep-alive). */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await body({ P, wsPort, rec, OUT, errors });
  } finally {
    stopAlive = true;
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
    mini: window.__btMinimap ? window.__btMinimap.nodes : null,
    tools: ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].filter((k) => ((window._gameState.current.rpg || {}).inventory || {})[k] > 0) }));
  rec.ok('with no tools in the bag, no node of the Wheel\'s is drawn -- nor marked on the minimap', bare.tools.length === 0 && !!bare.wn && bare.wn.total > 100 && bare.wn.drawn === 0 && bare.fish === 0 && bare.mini === 0, bare);

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
  /* v2.3.3038: `workable` -- only a node this player's level can harvest
     (GATHER_REQ_LVL: softwood asks Woodcutting 5), as the quest's road and a
     tap now both go by it */
  const nearest = (type, workable) => P.page.evaluate(([t, w]) => {
    const S = window._gameState.current, p = S.player;
    const lv = (sk) => (((S.rpg || {}).lifeSkills || {})[sk] || {}).level || 1;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== t || !n.alive) continue;
      if (w && S._serverCaps && S._serverCaps.gatherreq && (n.reqLvl || 1) > lv(n.skill)) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y, tier: n.gatherLvl, d: Math.round(dd) }; }
    }
    return best;
  }, [type, !!workable]);
  const road1 = await H.waitFor(P, () => (window.__btMinimap && window.__btMinimap.quest) || null, (q) => !!q && typeof q.x === 'number', { timeout: 10000, label: 'the road' }).catch(() => null);
  const spot = await nearest('fishSpot');
  rec.ok('the gold road of "Learn a Trade" leads to the nearest fishing spot',
    !!road1 && !!spot && road1.x === Math.round(spot.x) && road1.y === Math.round(spot.y), { road1, spot });
  rec.ok('...one of the safe ground\'s, a minnow pond (tier 1, the commons)', !!spot && spot.tier === 1 && /^wn-commons-/.test(spot.id), spot);
  if (!spot) return;

  /* ── 3. the fish, in the water ── */
  const sx = spot.x + STAND.fishSpot[0], sy = spot.y + STAND.fishSpot[1];
  await travel(P, wsPort, myId, sx, sy);
  const fish = await H.waitFor(P, () => window.__btWheelFish || [], (a) => Array.isArray(a) && a.length > 0, { timeout: 8000, label: 'fish drawn' }).catch(() => []);
  const mine = (fish || []).find((f) => f.id === spot.id);
  rec.ok('at the spot there are fish: a school of six minnows', !!mine && mine.fish === 6, { mine, fish });
  /* the ground under the spot laid (null until its piece is) */
  for (let i = 0; i < 40; i++) {
    const laid = await P.page.evaluate(({ x, y }) => window.__btSwimAt && window.__btSwimAt(x, y).water != null && window.__btSwimAt(x + 52, y + 9).water != null, spot);
    if (laid) break;
    await P.page.waitForTimeout(250);
  }
  const water = await P.page.evaluate(({ x, y }) => {
    /* v2.3.3012, after v2.3.3003: the walk test OPENS the water you can swim
       in now, so "water" is the ground DRAWN there (__btSwimAt's `water`,
       what a swimmer's head sinks by), and the seat is ground you stand on:
       its plan cell land (`swim` false), open to the walk test at the boots
       (__btIsSolid takes a body's centre, the boots 52 px below), and no
       more than SWIM_OUT (1) of a swimmer's five looks round the boots
       (wheelSwim.js SWIM_PROBES) drawn wet -- so one who climbs out there
       is out, not still swimming on the bank */
    const at = (gx, gy) => window.__btSwimAt(gx, gy);
    /* the school's circle and a fish's half-length round it (wheelNodes.js
       SWIM_*): x-30 +/- 39, y +/- 31 */
    const swim = [[-30, 0], [-69, 0], [9, 0], [-30, -31], [-30, 31], [-55, -16], [-55, 16], [-5, -16], [-5, 16]];
    const sx = x + 52, sy = y + 9;
    const looks = [[0, 0], [-9, 0], [9, 0], [0, -6], [0, 6]];
    return {
      spot: at(x, y).water,
      swim: swim.map(([dx, dy]) => at(x + dx, y + dy).water),
      seatLand: at(sx, sy).swim === false,
      seatOpen: window.__btIsSolid(sx, sy - 52) === false,
      seatWet: looks.filter(([dx, dy]) => at(sx + dx, sy + dy).water === true).length,
    };
  }, spot);
  console.log(`    water at ${spot.id}: ${JSON.stringify(water)}`);
  rec.ok('...where they swim is drawn as water, and the angler\'s seat is dry ground to stand on (at most one of a swimmer\'s five looks wet)',
    water.spot === true && water.swim.every((w) => w === true) && water.seatLand && water.seatOpen && water.seatWet <= 1, water);
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

  /* ── v2.3.3012 + v2.3.3003: a swimmer who taps the spot climbs out onto its
     bank to fish (startExtraction SEATS the angler, and every Wheel seat is
     baked dry) -- in the spot's own patch of water, west of it, boots
     (-50, +10) off it: the patch is four cells west of the spot and a cell
     either side ── */
  const feetDy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null; return g ? g.y - S.player.y : 52; });
  await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; },
    { x: spot.x - 50, y: spot.y + 10 - feetDy });
  const wading = await H.waitFor(P, (S) => !!(S._wheelSwim && S._wheelSwim.on), (v) => v === true, { timeout: 6000, label: 'swimming by the spot' }).catch(() => false);
  rec.ok('in the water beside the spot you swim (guard)', wading === true, { feetDy });
  if (wading === true) {
    const started = await tapNode(P, spot.id, (S) => !!S._extraction);
    await P.page.waitForTimeout(900);
    const out = await P.page.evaluate(({ x, y }) => {
      const S = window._gameState.current, ex = S._extraction;
      return { skill: ex ? ex.skill : null, swimming: !!(S._wheelSwim && S._wheelSwim.on),
        dx: Math.round(S.player.x - x), dy: Math.round(S.player.y - y) };
    }, spot);
    rec.ok('...and tapping it climbs you out onto its bank: fishing from the dry seat, swimming no more',
      started && out.skill === 'fishing' && !out.swimming && out.dx === 52 && out.dy === -43, out);
    await P.page.evaluate(() => { window._gameState.current._extraction = null; });
  }

  /* ── v2.3.3012: the resources on the minimap (owner: "Show nodes on minimap") ── */
  const mini = await P.page.evaluate(() => {
    const S = window._gameState.current, M = window.__btMinimap, P = S.player;
    const reach = (M && M.window ? M.window : 3200) * 0.6;
    const want = (S.gatherNodes || []).filter((n) => n.alive && Math.abs(n.x - P.x) <= reach && Math.abs(n.y - P.y) <= reach).length;
    return { marked: M ? M.nodes : null, want, rect: window.__btWheelMini || null };
  });
  rec.ok(`the minimap marks the resources round you (${mini.marked} of the ${mini.want} in its reach)`, mini.marked > 0 && mini.marked === mini.want, mini);
  if (mini.rect) await P.page.screenshot({ path: join(OUT, 'wheelnodes-minimap.png'), clip: { x: mini.rect.left - 4, y: mini.rect.top - 4, width: mini.rect.w + 8, height: mini.rect.h + 44 } }).catch(() => {});

  /* ── v2.3.3012: black steel is black (owner: "Make the black steel black") --
     a black steel greatsword (the forge's `steel` tier) in the hand, set on
     this page only: the forge needs smithing 16 and the ore, and what is
     checked is how the renderer draws the metal ── */
  const bs = await P.page.evaluate(async () => {
    const S = window._gameState.current, R = S.rpg;
    const keep = { weapon: R.weapon, slot: R.activeSlot };
    R.weapon = { type: 'greatsword', gearBase: 'steel', tierMult: 1.4, name: 'Black Steel Greatsword' };
    R.activeSlot = 'melee';
    await new Promise((res) => setTimeout(res, 1200));
    const out = { material: window.__btWeaponMaterial('greatsword', 'steel'), tint: window.__btWeaponTint().local,
      copper: window.__btWeaponMaterial('greatsword', 'copper'), keep: !!keep.weapon };
    window.__qaKeepWeapon = keep;
    return out;
  });
  rec.ok('a black steel blade is drawn in the Black Steel metal, a blued near-black (73, 78, 97)', bs.material === 'blacksteel' && bs.tint === 0x494e61 && bs.copper === 'copper', bs);
  const heroClip = await P.page.evaluate(() => {
    const S = window._gameState.current, cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
    const sx = rc.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), sy = rc.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1);
    return { x: Math.max(0, sx - 90), y: Math.max(0, sy - 110), width: 180, height: 180 };
  });
  await P.page.screenshot({ path: join(OUT, 'wheelnodes-blacksteel.png'), clip: heroClip }).catch(() => {});
  await P.page.evaluate(() => {
    const S = window._gameState.current, k = window.__qaKeepWeapon;
    if (k) { S.rpg.weapon = k.weapon; S.rpg.activeSlot = k.slot; }
  });

  /* ── 4. fish it ── */
  const fished = await harvest(P, wsPort, myId, rec, 'fishSpot', spot);
  if (fished) {
    const after = await P.page.evaluate((id) => ({ alive: ((window._gameState.current.gatherNodes || []).find((n) => n.id === id) || {}).alive,
      fishHere: (window.__btWheelFish || []).some((f) => f.id === id) }), spot.id);
    rec.ok('fished out, its fish are gone until it comes back', after.alive === false && after.fishHere === false, after);
    /* the road stops within 160 px of the node it leads to (questRoute.js
       GATHER_HERE_R: "you are there"), and a pond's bank may have its tree
       that close -- so step back from it first, if need be */
    let tree = await nearest('tree', true);
    if (tree && tree.d < 220) {
      const away = await P.page.evaluate(({ x, y }) => {
        const S = window._gameState.current, p = S.player, dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
        return { x: x + (dx / d) * 260, y: y + (dy / d) * 260 };
      }, tree);
      await travel(P, wsPort, myId, away.x, away.y);
      tree = await nearest('tree', true);
    }
    const road2 = await H.waitFor(P, () => (window.__btMinimap && window.__btMinimap.quest) || null, (q) => !!q && typeof q.x === 'number', { timeout: 8000, label: 'the road on' }).catch(() => null);
    rec.ok('with a fish in the bag, the road moves on to the nearest tree the player can chop (the quest\'s next step)',
      !!road2 && !!tree && road2.x === Math.round(tree.x) && road2.y === Math.round(tree.y), { road2, tree });
    /* v2.3.3012: no chop from the water -- a woodcutter has no seat to climb
       out to, and only your head is out of it.  Trees grow 72 px clear of
       water, so a bank whose tree is in reach of a swimmer is rare: the
       swim is switched on here, on this page, held (its clock set ahead so
       the frame's own look does not flip it back), and the tree tapped. */
    if (tree) {
      await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; },
        { x: tree.x + STAND.tree[0], y: tree.y + STAND.tree[1] });
      await P.page.waitForTimeout(500);
      const n0 = await P.page.evaluate(() => {
        const S = window._gameState.current;
        S._wheelSwim = Object.assign(S._wheelSwim || {}, { on: true, at: Date.now() + 60000, noteAt: 0 });
        return S.dmgNumbers.filter((p) => p.text === 'Swimming!').length;
      });
      const chopped = await tapNode(P, tree.id, (S) => !!S._extraction, 2);
      const said = await P.page.evaluate((k) => {
        const S = window._gameState.current;
        const n = S.dmgNumbers.filter((p) => p.text === 'Swimming!').length - k;
        if (S._wheelSwim) { S._wheelSwim.on = false; S._wheelSwim.at = 0; }
        return n;
      }, n0);
      /* the control: the same tap out of the water starts the chop -- so the
         one above reached the tree and was refused there, not lost on the way */
      await P.page.waitForTimeout(400);
      const control = await tapNode(P, tree.id, (S) => !!S._extraction, 3);
      const skill = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
      await P.page.evaluate(() => { window._gameState.current._extraction = null; });
      rec.ok('a tree tapped while swimming is not chopped: "Swimming!", as a swing is -- and the same tap on dry land chops it',
        chopped === false && said >= 1 && control === true && skill === 'woodcutting', { chopped, said, control, skill });
    }
  }

  /* ── 5. only the nodes near the view are drawn ── */
  const cull = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const cx = S.camera.x + S._viewW / 2, cy = S.camera.y + S._viewH / 2;
    const reach = Math.hypot(S._viewW, S._viewH) / 2 + 320 + 400;
    const all = S.gatherNodes || [];
    /* v2.3.3040: a Wheel fishing spot has no sprite; what it holds now is its
       label (nodeLabels.js), which replaced the old tier dot (_pixiTier) */
    const held = all.filter((n) => (n._pixiSprite && !n._pixiSprite.destroyed) || (n._pixiLabel && !n._pixiLabel.destroyed));
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
    const there = await travel(P, wsPort, myId, iron.x + 90, iron.y + 20);
    rec.ok('to the iron vein, the worker agreeing where you are (guard)', there === true, { there });
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

  /* ── 7. up to town: the Wheel's nodes go at the flip ──
     v2.3.3025: the marker back to today's town is QA's only (`?wayback`,
     worldTrial.js wheelWayBack) -- this scenario asks for it below */
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

/* A long walk the way mp-gatherhits walks, H.hopTo's 100 px a hop, but
   checked against the worker every four hops.  Two hops can reach the worker
   in one burst, the second inside its move bound's 80 px (movement.js: 500 px
   a second since the last move, + 80) and refused; past ~110 px behind it can
   never catch up while the hops go on, and the 1 s idle keepalive keeps its
   clock short after -- the strike then lands "out-of-range" from where the
   worker last let you be (the first run on these places: 1,941 px).  So when
   it falls behind, step back to where it has you, as its broadcast would put
   a real client, and go on from there.
   v2.3.3016: ...but only to a place the worker still holds a beat later.  On
   this box's ~400 ms frames the last hop often has not gone out when the
   worker is asked, so a worker merely a hop BEHIND read as one that had
   refused it -- and the step back went out after the hop did: the worker
   took the hop, then the step back, and the two chased each other 200 px
   each way, leg after leg (measured on main and on this branch alike), until
   the page's two idle minutes logged the angler out mid-walk. */
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
      /* a beat (two of this box's frames) for the last hop to arrive */
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

/* A finger's tap on the node's picture, as a player taps a resource, up to
   `tries` times until `done(S)` -- whether it ever was (mp-gatherhits' tap). */
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
  await tapNode(P, node.id, (S) => !!S._extraction);
  const started = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
  rec.ok(`${skill}: tapping the Wheel's ${type} starts the harvest (guard)`, started === skill, { started, node });
  if (started !== skill) return false;
  const opened = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
    { timeout: 70000, label: 'the window opens' }).catch(() => null);
  rec.ok(`${skill}: the hits run down and the gesture window opens (guard)`, opened === 'ready', { opened });
  if (opened !== 'ready') return false;
  /* v2.3.3035, owner: "I want resource harvesting bar to be green and to
     appear above the resource, not the player head.  It should also list the
     numbers on the bar" -- over the top of the resource's art, green, at your
     HP bar's size (v2.3.3027), "0/<HP>" now the hits are done; your name
     plate and HP bar still put away while you gather */
  const band = await P.page.evaluate(async () => {
    await new Promise((res) => requestAnimationFrame(res));
    await new Promise((res) => requestAnimationFrame(res));
    const S = window._gameState.current;
    const ex = S._extraction;
    const b = window.__btNodeHpBar ? Object.assign({}, window.__btNodeHpBar) : {};
    return { bar: b, nodeX: ex && ex.nodeRef ? ex.nodeRef.x : null, hp: ex && ex.hits ? ex.hits.maxHp : null,
      plate: window.__btResourceBars ? window.__btResourceBars.plateVisible : null,
      hpA: window.__btHpReads ? window.__btHpReads.barA : null };
  });
  {
    const b = band.bar || {};
    const clear = b.artTop != null ? b.artTop - (b.y + b.h / 2) : NaN;
    /* the owner: "For mining you can put the bar beneath the ore" --
       the rock's hangs under its ground line, clear of the miner behind it */
    const below = b.artBase != null ? (b.y - b.h / 2) - b.artBase : NaN;
    rec.ok(`${skill}: while you gather its bar is ${type === 'oreVein' ? 'under the rock' : type === 'tree' ? 'over the tree' : 'over the spot'} (${b.under ? 'its top ' + Math.round(below) + ' world px under the rock\'s ground line, clear of the miner behind it' : 'its bottom ' + Math.round(clear) + ' world px over the art\'s top'}), green, as large as your HP bar (${b.w} x ${b.h}), reading "${b.text}", and your name plate and HP bar are put away`,
      b.show === true && b.big === true && Math.abs(b.w - 76 * b.scale) < 0.6 && Math.abs(b.h - 22 * b.scale) < 0.6
        /* a Wheel fishing spot is its school, swimming 30 px west of the
           spot's anchor (wheelNodes.js SWIM_DX): the bar is over the fish */
        && (type === 'oreVein' ? b.under === true && below > 0 && below < 16 : clear > 0 && clear < 12) && Math.abs(b.x - (band.nodeX + (type === 'fishSpot' ? -30 : 0))) < 1
        && b.green === true && b.text === '0/' + band.hp
        && band.plate === false && band.hpA === 0,
      { bar: b, clear, below, nodeX: band.nodeX, hp: band.hp, plate: band.plate, hpA: band.hpA });
    if (type === 'oreVein') await P.page.screenshot({ path: join(H.REPO, 'tools/qa/mp/out/wheelnodes-gatherbar.png') }).catch(() => {});
  }
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
  /* the worker's own word on the strike when it did not pay (admin.js
     lastStrike: 'paid', or the gate that refused it) */
  const why = got > 0 ? null : await H.adminPlayer(wsPort, myId).then((a) => { const L = (a && a.live) || {}; return { lastStrike: L.lastStrike || (a && a.lastStrike) || null, at: { zone: L.zone, x: L.x, y: L.y, dead: L.dead }, hitPlan: L.hitPlan || null, ex: L.ex || null }; }).catch(() => null);
  rec.ok(`${skill}: the worker pays ${want || RES[type] + '*'} for the Wheel's node`, got > 0,
    { got, want, keys: Object.keys(inv || {}).filter((k) => k.indexOf(RES[type]) === 0), node: { id: node.id, x: node.x, y: node.y }, why });
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; }
  });
  return got > 0;
}
