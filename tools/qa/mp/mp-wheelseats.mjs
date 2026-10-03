/* ═══ EVERY FISHING SEAT IS DRY GROUND (v2.3.3013) ═══
 *
 * The resources' bake (tools/world/bake-wheel-spawns.mjs bakeWheelNodes)
 * gives each fishing spot a seat for the angler, 52 px east of it, and its
 * rules were proven by a survey of every seat on the ground as the game
 * draws it -- once, by hand (v2.3.3012, docs/specs/wheel-resources.md
 * "Fishing spots": three pairs of boots on drawn water, one on a cell the
 * walk grid counts as water, before the rules were tightened).  Merging the
 * next stretches' monsters moved 84 of those 140 nodes: a resource keeps its
 * 300 px from every monster's place now, and the bake places the nodes one
 * after another, so one moved node moves the rest.  So the survey is a
 * scenario, to run after any re-bake.  For EVERY fishing spot in
 * WHEEL_NODES, walked to and looked at on the phone's own ground:
 *   - the spot and the circle its school swims are drawn water;
 *   - the seat is land in the plan and open to the walk test at the boots;
 *   - the boots themselves are on dry drawn ground (what the v2.3.3012
 *     survey counted: "every pair of boots dry"), and fewer than SWIM_IN of
 *     a swimmer's five looks round them are wet (wheelSwim.js SWIM_PROBES),
 *     so an angler who climbs out there stays out (back in only at four).
 * The stricter look -- at most SWIM_OUT of the five wet, and every point of
 * the school's circle in water, which mp-wheelnodes asks of its one spot --
 * is printed for every spot and counted, not asserted: the drawn shore
 * wanders a few px round the plan's cells by design, and where it brushes a
 * seat's edge or a school's rim that is a look, not a fault.  (Two of the
 * commons' spots, unchanged since v2.3.3012, show it: wn-commons-19's seat
 * has two of five looks on water, wn-commons-12's school one rim point on
 * the bank.)
 * The walker is a god (server/src/devtools.js): the deeper stretches have
 * monsters, and one dead surveyor is a survey of the respawn.
 */
import * as H from './harness.mjs';
import { SWIM_IN, SWIM_OUT } from '../../../src/game/wheelSwim.js';

const VIEW = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const { WHEEL_NODES } = await import(H.REPO + '/server/src/wheelspawns.js');
  const { WHEEL } = await import(H.REPO + '/server/src/wheelzone.js');
  const spots = [];
  for (const [area, list] of Object.entries(WHEEL_NODES)) {
    list.forEach((p, k) => { if (WHEEL.NODE_TYPES[p[0]] === 'fishSpot') spots.push({ id: 'wn-' + area + '-' + k, x: p[1], y: p[2] }); });
  }

  const P = await H.newPlayer(browser, { name: 'Surveyor', wsPort, webPort, world: 'wheel', viewport: VIEW });
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id);   /* past the Mayor's gate */
  await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
  /* real input on a loop: a page logs itself out after two minutes without
     any (Control does nothing in the game) */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  rec.ok(`setup: in the Wheel, ${spots.length} fishing spots to visit (guard)`, zone === 'wheel' && spots.length >= 30, { zone, n: spots.length });

  /* nearest first, from where the surveyor stands */
  let at = await P.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y }; });
  const left = spots.slice(), tour = [];
  while (left.length) {
    left.sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y));
    at = left.shift();
    tour.push(at);
  }

  const results = [];
  for (const spot of tour) {
    /* to the seat: the boots at (x + 52, y + 9), the body's centre 52 px above */
    const there = await H.hopTo(P, spot.x + 52, spot.y + 9 - 52, { step: 100, gap: 260, tries: 220 });
    /* the ground under the spot and the seat laid (null until its piece is) */
    let laid = false;
    for (let i = 0; i < 40 && !laid; i++) {
      laid = await P.page.evaluate(({ x, y }) => !!window.__btSwimAt && window.__btSwimAt(x, y).water != null
        && window.__btSwimAt(x + 52, y + 9).water != null, spot);
      if (!laid) await P.page.waitForTimeout(250);
    }
    const r = await P.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      const atW = (gx, gy) => window.__btSwimAt(gx, gy);
      /* the school's circle and a fish's half-length round it (wheelNodes.js
         SWIM_*): x-30 +/- 39, y +/- 31 -- as mp-wheelnodes reads it */
      const swim = [[-30, 0], [-69, 0], [9, 0], [-30, -31], [-30, 31], [-55, -16], [-55, 16], [-5, -16], [-5, 16]];
      const sx = x + 52, sy = y + 9;
      const looks = [[0, 0], [-9, 0], [9, 0], [0, -6], [0, 6]];
      const wet = looks.map(([dx, dy]) => atW(sx + dx, sy + dy).water === true);
      return {
        zone: S.currentZone,
        spot: atW(x, y).water,
        school: atW(x - 30, y).water,
        swimDry: swim.filter(([dx, dy]) => atW(x + dx, y + dy).water !== true).length,
        seatLand: atW(sx, sy).swim === false,
        seatOpen: window.__btIsSolid(sx, sy - 52) === false,
        bootsDry: !wet[0],
        seatWet: wet.filter(Boolean).length,
      };
    }, spot);
    const ok = there && laid && r.zone === 'wheel' && r.spot === true && r.school === true && r.seatLand && r.seatOpen
      && r.bootsDry && r.seatWet < SWIM_IN;
    const neat = ok && r.swimDry === 0 && r.seatWet <= SWIM_OUT;
    results.push({ id: spot.id, ok, neat, there, laid, ...r });
    console.log(`    ${ok ? (neat ? 'dry ' : 'edge') : 'WET '} ${spot.id} ${JSON.stringify(r)}`);
  }
  stopAlive = true;

  const visited = results.filter((q) => q.there && q.laid && q.zone === 'wheel');
  rec.ok(`the surveyor reached every spot, its ground laid (${visited.length} of ${spots.length})`, visited.length === spots.length,
    results.filter((q) => !(q.there && q.laid && q.zone === 'wheel')).slice(0, 6));
  const bad = results.filter((q) => !q.ok);
  const edges = results.filter((q) => q.ok && !q.neat).map((q) => ({ id: q.id, seatWet: q.seatWet, swimDry: q.swimDry }));
  rec.ok(`every spot and its school's middle are in drawn water, and every angler's seat is open land with the boots dry, an angler there out of the water (${results.length - bad.length} of ${results.length}; ${edges.length} where the drawn shore brushes a seat's edge or a school's rim: ${JSON.stringify(edges)})`,
    bad.length === 0, bad.slice(0, 8));
  const errs = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
