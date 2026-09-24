/* THE ROCKS ROUND TOWN ARE A WALL (v2.3.2896)
 *
 * Owner: "can you make it so the player can't walk over the giant gray rocks
 * surrounding the town?  Watch the borders for detecting walkability since
 * there have been issues before with that."
 *
 * tools/dev/check-town-rim.mjs proves the outline on paper -- everything that
 * has to be reachable is, the rocks are outside.  This proves it on the real
 * client: a real player, real keys, real collision, and a picture of where he
 * stopped.  From a start near each stretch of the ring he walks straight at
 * it for a few seconds, and the stop must be:
 *
 *   ON THE GROUND -- his BOOTS inside the outline (the body centre is 52 px
 *     above them; stopping the centre instead is the v2.3.2748 bug again),
 *   AT THE EDGE   -- within a stride of the outline, so the wall is where
 *     the rock is and not some way short of it (an over-blocking wall is the
 *     "issues before"),
 *   AFTER A WALK  -- he actually moved to get there, so "stopped at the edge"
 *     is not "never left the start".
 *
 * And the one gap in the ring has to still be a gap: walking down the stairs
 * takes you to the World View, as it always has.
 */
import * as H from './harness.mjs';
import { TOWN_RIM, TOWN_RIM_HOLES, townRimInside } from '../../../src/data/townRim.js';

/* Distance from a point to the outline (and the outcrop), world px. */
function rimDist(x, y) {
  let best = Infinity;
  for (const pts of [TOWN_RIM].concat(TOWN_RIM_HOLES)) {
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [ax, ay] = pts[j], [bx, by] = pts[i];
      const dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
    }
  }
  return best;
}

/* Start (body centre), keys, and what lies ahead. */
const WALKS = [
  { id: 'north',     from: [520, 820],   keys: ['w'],      what: 'up through the north-west pines to the foot of the cliff' },
  { id: 'west',      from: [420, 1230],  keys: ['a'],      what: 'west across the plaza into the west wall' },
  /* south of the auction house: hopTo ignores collision, and a start inside
     its footprint wedges the body on the footprint's own edge */
  { id: 'east',      from: [1880, 1400], keys: ['d'],      what: 'east across the plaza into the east wall' },
  { id: 'northeast', from: [1650, 860],  keys: ['w', 'd'], what: 'up the north-east path into the cliff' },
  { id: 'south',     from: [700, 1760],  keys: ['s'],      what: 'south to the lip of the column tops' },
  { id: 'southeast', from: [1500, 1650], keys: ['s', 'd'], what: 'down-right to the south-east lip' },
  { id: 'southwest', from: [420, 1500],  keys: ['s', 'a'], what: 'down-left to the south-west lip' },
];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Rimwalk', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await P.page.mouse.click(500, 400).catch(() => {});   /* keys reach the game loop */

  /* ── the grid the game built ── */
  const g = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const solid = window.__btIsSolid;
    return {
      zone: S.currentZone,
      feetDy: S._bodyFootY - S.player.y,
      /* body CENTRES: standing on the plaza, and on the rocks all round */
      spawn: solid(S.player.x, S.player.y),
      rocks: [[760, 90], [2100, 1100], [120, 1050], [520, 1870], [1500, 1900], [1360, 350]].map(([x, y]) => solid(x, y)),
    };
  });
  console.log('    grid: ' + JSON.stringify(g));
  rec.ok('in town (guard)', g.zone === 'town', g);
  rec.ok('the boots are ~52 px below the body centre, as the rim assumes', Math.abs(g.feetDy - 52) < 3, g);
  rec.ok('the spawn is open ground', g.spawn === false, g);
  rec.ok('the rocks all round the ring are solid now (they were all walkable)', g.rocks.every(Boolean), g.rocks);

  /* ── walk into it from every side ── */
  for (const w of WALKS) {
    await H.hopTo(P, w.from[0], w.from[1]);
    await P.page.waitForTimeout(300);
    /* TRAPS §35's sprint lane: a start inside a solid cell gets isSolid's
       never-trap hatch -- every step allowed -- and the walk proves nothing
       about the wall.  So the start has to be open ground by the game's own
       answer, all four corners of the body box. */
    const startOpen = await P.page.evaluate(([x, y]) => [[-10, -10], [10, -10], [-10, 10], [10, 10]]
      .every(([dx, dy]) => !window.__btIsSolid(x + dx, y + dy)), w.from);
    rec.ok(`${w.id}: the walk starts on open ground (guard: TRAPS §35)`, startOpen, { from: w.from });
    const s0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    for (const k of w.keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(2600);
    for (const k of w.keys) await P.page.keyboard.up(k);
    await P.page.waitForTimeout(250);
    const s1 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, zone: S.currentZone, fdy: S._bodyFootY - S.player.y }));
    const fx = s1.x, fy = s1.y + (s1.fdy || 52);
    const moved = Math.hypot(s1.x - s0.x, s1.y - s0.y);
    const dist = rimDist(fx, fy);
    const r = { from: w.from, stop: [Math.round(s1.x), Math.round(s1.y)], feet: [Math.round(fx), Math.round(fy)],
      moved: Math.round(moved), toRim: Math.round(dist), zone: s1.zone };
    console.log(`    ${w.id}: ${JSON.stringify(r)}`);
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/townrim-${w.id}.png` });
    rec.ok(`${w.id}: walking ${w.what} -- he walked there (guard)`, moved >= 40 && s1.zone === 'town', r);
    rec.ok(`${w.id}: ...and stopped with his boots on the ground, not on the rock`, townRimInside(fx, fy), r);
    rec.ok(`${w.id}: ...at the edge of the rock, not short of it`, dist <= 40, r);
  }

  /* ── the one way out is still a way out ──
     Two halves, because a brand-new bro is LOCKED in town until he has spoken
     to Mayor Bro (zoneTransitions v2.3.1676): at the trigger the gate shoves
     him two tiles back.  So first, unlocked or not, the stairs must still
     REACH the trigger -- the gate firing is the proof -- and then, once he has
     taken the mayor's first quest, the same walk must take him out. */
  /* The gate stamp is cleared before EACH walk: left set from the first one,
     it satisfied the second walk's wait on its first poll and the key came
     up before he had taken a step. */
  const downStairs = async () => {
    await H.readState(P, (S) => { S._mayorGateAt = 0; return true; });
    await H.hopTo(P, 1000, 1830);
    await P.page.waitForTimeout(300);
    await P.page.keyboard.down('s');
    const r = await H.waitFor(P, (S) => ({ zone: S.currentZone, gate: S._mayorGateAt || 0 }),
      (v) => v.zone === 'worldview' || v.gate > 0, { timeout: 9000, label: 'down the stairs' })
      .catch(() => null);
    await P.page.keyboard.up('s');
    return r;
  };
  const gated = await downStairs();
  rec.ok('the stairs still reach the exit trigger (a new bro is turned back by the mayor gate, AT the trigger)',
    !!gated && gated.gate > 0, gated);

  rec.ok('walking up to Mayor Bro opens his dialogue (guard)', await H.approachNpc(P, 'mayor_bro'), {});
  await H.advanceNpcDialogue(P);
  await H.confirmQuestOffer(P);
  await P.page.waitForTimeout(2200);
  await H.leaveNpc(P, 'mayor_bro');
  const tut = await H.readState(P, (S) => !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1));
  rec.ok('...and his first quest is taken (guard)', tut);
  const out = await downStairs();
  rec.ok('then walking down the stairs takes you to the World View', !!out && out.zone === 'worldview',
    await H.readState(P, (S) => ({ zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y) })));

  await P.ctx.close().catch(() => {});
}
