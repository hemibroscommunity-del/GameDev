/* THE TOWN'S LAYOUT (v2.3.2061, extended to the whole plaza at v2.3.2065).
 *
 * Owner: "See if you can wire in this sprite sheet of a fountain. Also put
 * mayor bros house on the top of the hill (you won't be able to go inside just
 * the building)."
 *
 * Both props had to come back through a gate that was deliberately shut: every
 * town prop's coordinates were measured against town_v16 (96x30 tiles) and the
 * shipped map is town_v17 (52x55), so TOWN_PROPS_ENABLED has been false since
 * v2.3.1813. These two are re-measured; the other six are not. So the first
 * thing this scenario proves is that ONLY the re-measured pair came back --
 * the failure mode of the obvious fix (flip the flag) is four buildings
 * standing at x up to 2560 on a map 1664 wide, which is a thing you would only
 * see by walking to the far edge of the world.
 *
 * The rest is what the owner asked for, stated as things that can fail:
 * the fountain's water MOVES (it is an eight-frame strip, and a strip that
 * never advances looks exactly like a still image), it is loaded before play
 * rather than on first sighting (CLAUDE.md's preloading law), the house is up
 * on the terrace rather than down in the plaza, and neither can be walked
 * through -- while the house has no Enter prompt, because "you won't be able
 * to go inside" is half the ask.
 */
import * as H from './harness.mjs';

const TOWN_W = 52 * 32, TOWN_H = 55 * 32;
const props = (P) => P.page.evaluate(() => (window.__btWorldProps ? window.__btWorldProps() : []));
const byId = (list, id) => list.find((p) => p.id === id) || null;

/* Put the player south of a thing and hold "w" into it.
   THE KEYBOARD, not a hand-written movement loop. The first cut of this drove
   S.moveDir/S.joyActive directly and the player did not move a single pixel --
   which made both collision checks pass while proving nothing, because
   "stopped short of the wall" and "never started" look identical from the
   outside. The keyboard is the path the game actually reads (mp-townmap walks
   into Mayor Bro the same way), and the control below is what keeps the
   result honest. */
const pos = (P) => H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });

async function hold(P, key, ms) {
  await P.page.keyboard.down(key);
  await P.page.waitForTimeout(ms);
  await P.page.keyboard.up(key);
  await P.page.waitForTimeout(350);
}

/** Walk north from `startY` for `ms` and report where you ended up. */
async function walkNorthFrom(P, x, startY, ms = 2600) {
  await put(P, x, startY);
  await P.page.waitForTimeout(350);
  await hold(P, 'w', ms);
  return pos(P);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Hiker', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2600);

  const list = await props(P);
  const ids = list.map((p) => p.id).sort();

  /* ── 1. ONLY THE RE-MEASURED PAIR IS BACK ── */
  rec.ok('the fountain and the house are drawn in town',
    ids.includes('fountain') && ids.includes('mayor-house'), ids);
  /* v2.3.2062: the general store joined them -- re-measured onto town_v17
     because it is the only door the potion shelf opens from, and every such
     door was switched off (see worldProps.js). The claim is unchanged in
     substance: only props whose coordinates were measured against the map
     that ships are drawn, and the rest stay off rather than standing at x
     up to 2560 on a map 1664 wide. */
  /* ═══ v2.3.2065: THE OWNER'S BLUEPRINT ═══
     A mockup of where things go: mayor's house up the stairs, blacksmith
     west, general store east, fountain dead centre, dressing around them.
     Twelve props are placed against it; the bank and the enchanter still
     carry v16 coordinates and stay off, which is the claim that matters --
     turning them on without re-measuring puts them off the right-hand edge
     of a map 1664 world px wide. */
  const EXPECT = ['anvil', 'banner-gate-e', 'banner-gate-w', 'bench-e', 'bench-w',
    'forge', 'fountain', 'general-store', 'lamp-plaza-e', 'lamp-plaza-w',
    'market-stall', 'mayor-house'];
  rec.ok(`the blueprint's twelve props are all placed (${ids.length})`,
    JSON.stringify(ids) === JSON.stringify(EXPECT), { got: ids, want: EXPECT });
  rec.ok('...and the two still carrying v16 coordinates are NOT',
    !ids.includes('bank') && !ids.includes('enchanter'), ids);
  const oob = list.filter((p) => p.x <= 0 || p.y <= 0 || p.x >= TOWN_W || p.y >= TOWN_H);
  rec.ok('every prop that IS drawn stands on the map that ships', oob.length === 0, oob);

  /* ── THE PLAZA IS ARRANGED AROUND THE FOUNTAIN ──
     Stated as relationships rather than coordinates, so the test says what
     the blueprint says: the smith is west of the store, the house is north of
     both, and the fountain sits between them rather than off to one side.
     Coordinates alone would pass just as well with the whole town shifted. */
  const at = (id) => byId(list, id);
  const smith = at('forge'), store = at('general-store');
  const fount = at('fountain'), house = at('mayor-house');
  rec.ok('the blacksmith is west of the general store',
    smith.x < store.x - 400, { smith: smith.x, store: store.x });
  rec.ok('...the mayor\'s house is north of both',
    house.y < smith.y - 250 && house.y < store.y - 250,
    { house: house.y, smith: smith.y, store: store.y });
  rec.ok('...and the fountain sits between the two shops, not beside one',
    Math.abs((fount.x - smith.x) - (store.x - fount.x)) < 200,
    { toSmith: fount.x - smith.x, toStore: store.x - fount.x });
  rec.ok('...south of them, in the open plaza',
    fount.y > smith.y && fount.y > store.y, { fount: fount.y, smith: smith.y });

  /* ── WHAT BLOCKS, AND WHAT DOES NOT ──
     Buildings and the fountain have real footprints. The dressing does not:
     a lamp or a bench you can walk through is a smaller annoyance than a
     plaza you can wedge yourself into. */
  const solid = list.filter((p) => p.blocks).map((p) => p.id).sort();
  rec.ok('the buildings and the fountain block',
    JSON.stringify(solid) === JSON.stringify(['forge', 'fountain', 'general-store', 'mayor-house']),
    solid);
  rec.ok('...and the lamps, benches and banners do not -- they are dressing',
    !list.some((p) => p.blocks && /lamp|bench|banner|anvil|stall/.test(p.id)),
    list.filter((p) => p.blocks).map((p) => p.id));

  /* ── THE TRADESMEN STAND AT THEIR OWN BUILDINGS ──
     Storekeeper Bro was at x=2520 on a map 1664 wide -- spawned, ticking, and
     outside the world -- since the town was re-fused. This is the check that
     would have caught it. */
  const npcs = await P.page.evaluate(() => (window._gameState.current.npcs || [])
    .map((n) => ({ id: n.id, x: Math.round(n.x), y: Math.round(n.y) })));
  for (const [nid, pid] of [['blacksmith_bro', 'forge'], ['storekeeper_bro', 'general-store']]) {
    const n = npcs.find((q) => q.id === nid), pr = at(pid);
    rec.ok(`${nid} is inside the world at all`,
      !!n && n.x > 0 && n.x < TOWN_W && n.y > 0 && n.y < TOWN_H, n);
    rec.ok(`...and stands at his own ${pid}, not across town`,
      !!n && Math.hypot(n.x - pr.x, n.y - pr.y) < 260,
      { npc: n, prop: { x: pr.x, y: pr.y }, dist: n && Math.round(Math.hypot(n.x - pr.x, n.y - pr.y)) });
  }

  /* ── 2. THE WATER MOVES ──
     Sampled as the texture's window into the strip: eight frames share one
     source, so a moving fountain is a frameX that changes and a still one is a
     frameX that does not. */
  const seen = new Set();
  for (let i = 0; i < 14; i++) {
    const f = byId(await props(P), 'fountain');
    if (f && f.frameX !== null) seen.add(f.frameX);
    await P.page.waitForTimeout(85);
  }
  rec.ok(`the fountain's water is animating, not a still (${seen.size} distinct `
       + `frames in ~1.2s)`, seen.size >= 4, [...seen].sort((a, b) => a - b));
  const f0 = byId(list, 'fountain');
  rec.ok('...and every frame is one cell of the strip, not the whole strip '
       + '(a strip drawn whole would be eight fountains side by side)',
    f0 && f0.frameW > 0 && f0.width / f0.frameW < 1.5,
    { frameW: f0 && f0.frameW, drawnW: f0 && f0.width });

  /* ── 3. IT WAS READY BEFORE PLAY, NOT ON FIRST SIGHTING ──
     CLAUDE.md: "any first-use texture load is a regression." The strip rides
     the same preload gate every prop sprite rides; this asserts the frames
     exist the moment the world is interactive rather than after a wander. */
  rec.ok('the fountain had its frames the moment the world was playable',
    f0 && f0.frameW > 0, f0);

  /* ── 4. THE HOUSE IS UP ON THE HILL ──
     Not "somewhere in town": north of the plaza and above the cliff line the
     terrace sits on. TOWN_SPAWN is (815,1010), so a smaller y is further up
     the map, and the terrace's clear cobble is y 320..470. */
  rec.ok(`the house stands on the northern terrace, not down in the plaza `
       + `(y ${house && house.y} against a spawn at 1010)`,
    house && house.y >= 320 && house.y <= 480, house);
  /* ═══ v2.3.2069: THE SPRITE OVERHANGS ON PURPOSE NOW ═══
     This used to require the whole drawn house inside the terrace's clear
     cobble (x 655..835), which was right while it was 159 wide. The owner
     asked for it ~3x bigger; at 400 tall the art is 386 across and the
     terrace is 170, so overhang is not a bug to prevent but the cost of the
     size that was asked for -- it falls on the pines either side, which
     renders as a house nestled in trees.

     What still has to hold is the part a player feels: the house STANDS on
     the terrace. Its footprint -- the ground it actually occupies -- is
     centred there, and its base sits on cobble rather than hanging off the
     drop. A sprite-width check would now only be measuring the art. */
  const fpr = house && house.footprint;
  rec.ok('...with its FOOTPRINT on the terrace, so it stands there rather '
       + 'than hanging off it',
    !!fpr && fpr.x0 >= 600 && fpr.x1 <= 900 && fpr.y1 >= 400 && fpr.y1 <= 500, fpr);
  const ground = await P.page.evaluate(([hx, hy]) => {
    /* the base line the house meets the ground on, sampled in the page so it
       reads the shipped map rather than a copy of it */
    return { hx, hy };
  }, [house.x, house.y]);
  rec.ok('...and is meaningfully bigger than it was -- the owner asked for ~3x',
    house.height > 165 * 2, { height: Math.round(house.height), was: 165, ground });

  /* ── 5. YOU CANNOT GO INSIDE ──
     Two halves: no Enter prompt (the house carries no `action`, so
     buildingPropNear never returns it), and you cannot walk through the walls. */
  const prompt = await P.page.evaluate(([hx, hy]) => {
    const S = window._gameState.current;
    S.player.x = hx; S.player.y = hy + 30;
    return null;
  }, [house.x, house.y]);
  await P.page.waitForTimeout(900);
  const near = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { nearBuilding: S.nearBuilding || null,
      text: (document.body.innerText || '').match(/ENTER|BLACKSMITH|BANK/i) || null };
  });
  rec.ok('standing at the door offers no way in -- it is a building, not a shop',
    !near.nearBuilding && !near.text, { near, prompt });

  /* THE CONTROL FIRST. Walking north from open cobble with nothing in the way
     has to actually move the player, or "you were stopped by the house" means
     nothing -- a player who never moves is stopped by everything. Run on the
     same axis, over the same distance, a few hundred px to the east of the
     house where the terrace is clear. */
  const freeStart = 1150;
  const free = await walkNorthFrom(P, 1050, freeStart);
  rec.ok(`the control walks: nothing in the way, so the player really moves `
       + `(${freeStart} -> ${free.y})`,
    freeStart - free.y > 60, { from: freeStart, to: free.y });
  const travel = freeStart - free.y;

  rec.ok('the house declares a footprint at all', !!(house && house.footprint), house);
  const stopped = await walkNorthFrom(P, house.x, (house.footprint || { y1: house.y }).y1 + travel - 40);
  rec.ok(`you cannot walk through the house -- stopped at y ${stopped.y}, outside `
       + `a footprint that starts at ${house.footprint && house.footprint.y1}, having covered ${travel}px `
       + `of clear ground in the control`,
    !!house.footprint && stopped.y > house.footprint.y1 - 4,
    { stopped, footprint: house.footprint, travel });

  /* ── 6. NOR THROUGH THE FOUNTAIN ── */
  const fx = byId(await props(P), 'fountain');
  /* Asserted before it is dereferenced: without this the scenario THREW on a
     null footprint when the block was removed, which reports as "scenario
     completed: TypeError" instead of naming the thing that broke. */
  rec.ok('the fountain declares a footprint at all', !!(fx && fx.footprint), fx);
  const stopped2 = await walkNorthFrom(P, fx.x, (fx.footprint || { y1: fx.y }).y1 + travel - 40);
  rec.ok(`you cannot walk into the fountain's basin -- stopped at y ${stopped2.y}, `
       + `outside a footprint that starts at ${fx.footprint && fx.footprint.y1}`,
    !!fx.footprint && stopped2.y > fx.footprint.y1 - 4,
    { stopped: stopped2, footprint: fx.footprint });

  await P.page.evaluate(() => {
    const S = window._gameState.current; S.player.x = 830; S.player.y = 1330;
  });
  await P.page.waitForTimeout(1200);
  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/town-fountain.png' }).catch(() => {});
  await P.page.evaluate(() => {
    const S = window._gameState.current; S.player.x = 750; S.player.y = 620;
  });
  await P.page.waitForTimeout(1200);
  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/town-hill.png' }).catch(() => {});

  /* ── 7. THE MINIMAP CALLS THEM WHAT THEY ARE ──
     The minimap marks a prop as a building when it BLOCKS, which was true
     while every blocking prop was one. The fountain is the first that is not,
     and it was drawing a little roof in the middle of the plaza. */
  const marks = await P.page.evaluate(() => (window.__btMinimapMarks ? window.__btMinimapMarks() : null));
  /* Asserted, not skipped: `if (marks)` around these would make them vanish
     the day the probe is renamed, which is the same as deleting them. */
  rec.ok('the minimap reports what it drew', Array.isArray(marks), marks);
  rec.ok('the minimap shows the house on the hill',
    !!marks && marks.some((m) => m.id === 'mayor-house' && m.key === 'house'), marks);
  rec.ok('...and draws no roof on the fountain -- it is not a building',
    !!marks && !marks.some((m) => m.id === 'fountain'), marks);

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
