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

/* v2.3.2631: READ, not repeated.  These were literal 52 and 55, so when town
   grew to 68x72 (v2.3.2628) the in-bounds checks below started rejecting the
   south half of the map -- shopkeeper_bro at y 1778 read as "outside the
   world" on a map 2304 tall.  Third file to be caught by the same literal
   after harness.doorOf and mp-townmap; this one is off the CI path, which is
   why it stayed red longer. */
const { ZONES } = await import(H.REPO + '/src/data/zones.js');
const TOWN_W = ZONES.town.w * 32, TOWN_H = ZONES.town.h * 32;
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
  /* v2.3.2062: the auction house joined them -- re-measured onto town_v17
     because it is the only door the potion shelf opens from, and every such
     door was switched off (see worldProps.js). The claim is unchanged in
     substance: only props whose coordinates were measured against the map
     that ships are drawn, and the rest stay off rather than standing at x
     up to 2560 on a map 1664 wide. */
  /* ═══ v2.3.2065: THE OWNER'S BLUEPRINT ═══
     A mockup of where things go: mayor's house up the stairs, blacksmith
     west, auction house east, fountain dead centre, dressing around them.

     v2.3.2086: FOURTEEN NOW.  This used to assert that the bank and the
     enchanter were NOT placed, and that was the right assertion while it was
     true: they carried v16 coordinates (x 1810 and x 2130) and turning them
     on without re-measuring would have put them off the right-hand edge of a
     map 1664 world px wide.  worldProps said what to do about it -- "re-
     measure against the current art, mark them mapV 17, and they come back" --
     and v2.3.2086 did exactly that, so the claim inverts.

     It matters more than two props: twelve building PANELS are written and
     working, and before this only TWO had a door on the current map.  These
     two are the cheapest of the missing ten, because only the coordinates
     were stale.  The `oob` check below is the part that must never relax --
     it is what would have caught a careless re-enable. */
  /* v2.3.2088 (owner: "Remove the banners and bench-e"): eleven now.
     v2.3.2626: re-sorted.  This list is compared against a SORTED read of the
     live props, and it was written alphabetically when the shop's id was
     'general-store' -- sorting between 'fountain' and 'lamp-plaza-e'.
     v2.3.2624 renamed it to 'auction-house', which sorts first, so the list
     stopped matching itself while the game was entirely correct.  Renaming an
     id moves it in every sorted list that names it. */
  /* v2.3.2630: the enchanter's prop is gone at the owner's request.
     v2.3.2631: and lamp-plaza-e, which stood on the walk to the exit. */
  const EXPECT = ['anvil', 'auction-house', 'bank', 'bench-w',
    'forge', 'fountain', 'lamp-plaza-w', 'market-stall', 'mayor-house'];
  rec.ok(`the blueprint's props are all placed (${ids.length})`,
    JSON.stringify(ids) === JSON.stringify(EXPECT), { got: ids, want: EXPECT });
  /* The two that came back are DOORS, not scenery: their whole point is the
     panel behind them, so the action is asserted rather than just the id. */
  const acts = Object.fromEntries(list.filter((p) => p.action).map((p) => [p.id, p.action]));
  /* v2.3.2630: the enchanter was the other half of this claim.  Its prop is
     gone, so what is asserted now is the set of doors the town HAS -- three,
     which is exactly what mayor_1 (needsDoor 3, unlocks 'zone_exits') needs.
     Stated as the whole set rather than one id, because the risk removal
     introduced is the COUNT, not the bank. */
  rec.ok('...and the three doors the world unlocks on are all present',
    acts.bank === 'bank' && acts.forge === 'forge'
      && acts['auction-house'] === 'auctionhouse'
      && Object.keys(acts).length === 3, acts);
  const oob = list.filter((p) => p.x <= 0 || p.y <= 0 || p.x >= TOWN_W || p.y >= TOWN_H);
  rec.ok('every prop that IS drawn stands on the map that ships', oob.length === 0, oob);

  /* ── THE PLAZA IS ARRANGED AROUND THE FOUNTAIN ──
     Stated as relationships rather than coordinates, so the test says what
     the blueprint says: the smith is west of the store, the house is north of
     both, and the fountain sits between them rather than off to one side.
     Coordinates alone would pass just as well with the whole town shifted. */
  const at = (id) => byId(list, id);
  const smith = at('forge'), store = at('auction-house');
  const fount = at('fountain'), house = at('mayor-house');
  rec.ok('the blacksmith is west of the auction house',
    smith.x < store.x - 400, { smith: smith.x, store: store.x });
  rec.ok('...the mayor\'s house is north of both',
    house.y < smith.y - 250 && house.y < store.y - 250,
    { house: house.y, smith: smith.y, store: store.y });
  /* v2.3.2631: a SHARE of the span, not a pixel tolerance.  This was
     "the two gaps differ by under 200px", tuned when the plaza was 1664 wide
     and the shops 620px apart.  v2.3.2628 spread them to 1110px apart, so the
     same layout -- fountain plainly between them, nearer the forge -- failed a
     bar that had quietly become 18% of the span instead of 32%.  "Not beside
     one" is a proportion, so it is measured as one: neither gap may be under a
     third of the distance between the shops. */
  const span = store.x - smith.x;
  const gapW = fount.x - smith.x, gapE = store.x - fount.x;
  rec.ok('...and the fountain sits between the two shops, not beside one',
    gapW > span / 3 && gapE > span / 3,
    { toSmith: gapW, toStore: gapE, span, floor: Math.round(span / 3) });
  rec.ok('...south of them, in the open plaza',
    fount.y > smith.y && fount.y > store.y, { fount: fount.y, smith: smith.y });

  /* ── EVERYTHING BLOCKS ──
     v2.3.2073, owner: "It should be obvious but make sure the objects are
     unwalkable."  This used to assert the OPPOSITE -- that exactly the four
     buildings blocked and that "the lamps, benches and banners do not, they
     are dressing" -- which was the shipped rule and is now the bug.  Kept as
     an ALLOWLIST OF NONE rather than deleted: the failure it guards against
     has flipped direction, so a prop added later without a footprint is
     caught by the same line that used to insist on one being absent. */
  /* ── v2.3.2088: AND THE ALLOWLIST IS EMPTY AGAIN ──
     v2.3.2078 had to except the two gate banners, because banner-gate-e stood
     at x 810 on the stone staircase that is the town's only way out and
     TOWN_EXITS puts the World View trail-head on it at world x 800..832 — with
     a footprint it stamped a wall across the steps and a player could not
     leave town on foot at all.  The owner has now removed the banner art
     entirely, so the exception goes with it and every prop in town is solid.
     Still a LIST rather than a count, for the reason above: a prop losing its
     footprint later fails here rather than passing on a smaller total. */
  const walkThrough = list.filter((p) => !p.blocks).map((p) => p.id);
  rec.ok(`every prop in town is solid, with no exceptions `
       + `(${list.length - walkThrough.length} of ${list.length} block)`,
    walkThrough.length === 0, { walkThrough });
  rec.ok('...and no gate banner is left standing on the stairs',
    !list.some((p) => String(p.id).startsWith('banner-gate')),
    { ids: list.map((p) => p.id) });

  /* ── THE TRADESMEN STAND AT THEIR OWN BUILDINGS ──
     Storekeeper Bro was at x=2520 on a map 1664 wide -- spawned, ticking, and
     outside the world -- since the town was re-fused. This is the check that
     would have caught it.
     v2.3.2091: he is gone (owner: "Remove the other shopkeeper NPC"), so the
     pair is Diego at the market stall instead. The property is the one that
     caught the original bug and it does not care which men it is applied to:
     a tradesman must be inside the world and at his own pitch. */
  const npcs = await P.page.evaluate(() => (window._gameState.current.npcs || [])
    .map((n) => ({ id: n.id, x: Math.round(n.x), y: Math.round(n.y) })));
  for (const [nid, pid] of [['blacksmith_bro', 'forge'], ['shopkeeper_bro', 'market-stall']]) {
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
  /* v2.3.2631: FRACTIONS of the map, not pixels.  320..480 was the terrace's
     band on a 1760-tall town; v2.3.2628 made it 2304 tall and the same terrace
     moved to y 622, outside a window that had not moved with it.  The terrace
     is a feature of the ART, so its band is a share of the art's height and
     survives the next resize the way the relationship checks above do. */
  const terraceY0 = TOWN_H * 0.15, terraceY1 = TOWN_H * 0.32;
  rec.ok(`the house stands on the northern terrace, not down in the plaza `
       + `(y ${house && house.y}, terrace ${Math.round(terraceY0)}..${Math.round(terraceY1)})`,
    house && house.y >= terraceY0 && house.y <= terraceY1, house);
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
  /* v2.3.2073: the footprint grew with the unwalkable pass -- it was a
     230 px strip of a 386 px-wide house, so two thirds of the building was
     solid and the wings were air.  It is the ground floor now (330), which no
     longer fits inside the terrace's 170 px of clear cobble.
     So the claim is restated as what it was always FOR: the house stands ON
     the terrace, meaning its footprint is CENTRED there and its base line is
     the terrace's ground -- not that a box sized for the old narrow block
     fits inside another box.  Where the wings overhang, they overhang the
     pines, and blocking there is right: a projecting wall you can walk
     through is the thing being fixed. */
  const fpr = house && house.footprint;
  const fpMid = fpr && (fpr.x0 + fpr.x1) / 2;
  rec.ok('...with its FOOTPRINT centred on the terrace, so it stands there '
       + 'rather than hanging off it',
    !!fpr && fpMid >= TOWN_W * 0.38 && fpMid <= TOWN_W * 0.52
      && fpr.y1 >= TOWN_H * 0.22 && fpr.y1 <= TOWN_H * 0.32,
    { fpr, mid: fpMid, wantX: [Math.round(TOWN_W * 0.38), Math.round(TOWN_W * 0.52)],
      wantY: [Math.round(TOWN_H * 0.22), Math.round(TOWN_H * 0.32)] });
  rec.ok('...and covering the ground floor, not a strip of it',
    !!fpr && (fpr.x1 - fpr.x0) > house.width * 0.7,
    { fpW: fpr && fpr.x1 - fpr.x0, drawnW: Math.round(house.width) });
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
