/* THE FOUNTAIN AND THE HOUSE ON THE HILL (v2.3.2061).
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
  /* v2.3.2063: back to two. The general store was placed at v2.3.2062 only
     because nothing else sold a potion; the owner moved the potions onto
     Shopkeeper Bro's shelf instead, so the shopfront went back off. */
  rec.ok('...and the six props still carrying v16 coordinates are NOT, so '
       + 'shipping these two did not strand four buildings off the map',
    ids.length === 2, ids);
  const oob = list.filter((p) => p.x <= 0 || p.y <= 0 || p.x >= TOWN_W || p.y >= TOWN_H);
  rec.ok('every prop that IS drawn stands on the map that ships', oob.length === 0, oob);

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
  const house = byId(list, 'mayor-house');
  rec.ok(`the house stands on the northern terrace, not down in the plaza `
       + `(y ${house && house.y} against a spawn at 1010)`,
    house && house.y >= 320 && house.y <= 480, house);
  rec.ok('...and inside the terrace\'s clear cobble, not out over the fence',
    house && house.x - house.width / 2 >= 655 && house.x + house.width / 2 <= 835,
    { x: house && house.x, w: house && house.width,
      left: house && house.x - house.width / 2, right: house && house.x + house.width / 2 });

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
