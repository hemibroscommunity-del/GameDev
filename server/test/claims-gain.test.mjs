/* ═══ v2.3.5186: EACH CLAIM'S GAIN, MEASURED (grand plan step 4.2, step 1; card K PR 6) ═══
 *
 * "No claims" can be met by calling a loose check a judge.  So each claim the
 * worker believes inside a bound carries its GAIN: the take of a maximal liar
 * (it sends the most the judge accepts) an hour, over the take of an honest
 * player (it plays as a phone does), measured by house bots written for it
 * (claimbots.mjs beside this file).  The take is what the claim earns:
 * kills, ore, cooked fish, gold, ground covered; for the guard, the damage
 * it keeps off (there the gain is the honest player's damage over the
 * liar's).  Where there are two honest ways to play (a phone's grades and a
 * computer's held key; a sword and a bow) the better honest take is the one
 * the liar is held to.
 *
 * TWO RULES, and the census:
 *   1. THE HONEST BOTS MEET NO REFUSAL, on any of card E's DISTURBANCES (a
 *      deploy, a hidden tab, 60, 30, 20 and 4 frames a second, a slow line,
 *      a lost socket, each lane): strict from the start.  A tightening that
 *      refuses an honest phone anywhere fails here, whatever it saves.
 *   2. EACH GAIN IS A LINE THAT ONLY FALLS (the plan's rule 3): LINES below
 *      is today's, and a gain over its line fails.  1.5 is the bar at which a
 *      claim's box in step 4.2 is ticked (BAR); a gain under its line prints
 *      a note to lower it.
 *   The census: docs/plan/census/claims.md (`node test/claims-gain.test.mjs
 *   --write`), each claim's honest and liar takes, its gain, and what each
 *   bot met on each disturbance; a claim no bot can reach in node says why.
 *
 * v2.3.6462 (card BK PR 3): THE 1.5 BAR, HONESTLY.  3b judges each claim's
 * WORST gain over the seeds run against BAR.  A claim over it whose number
 * is known is a row of KNOWN, a row that only falls: the suite prints
 * "KNOWN", never PASS, for it, and fails it past its row.  A claim over the
 * bar and not in KNOWN fails.  Whether a KNOWN claim's judge is tightened
 * (the sword's reach: a player would feel a shorter sword) is the owner's
 * call (docs/plan/finish.md part 9, call 5); this suite only says the number.
 *
 * TWO RUNS (v2.3.6462; card CK's rule: a check moves to where it is paid
 * once, nothing is dropped):
 *   `node test/claims-gain.test.mjs`          a PR's: one seed (CLAIMS_SEED,
 *       default ''), the gains alone (2a, 3, 3b): about 20 s;
 *   `node test/claims-gain.test.mjs --whole`  the gatekeeper's rehearsal
 *       (tools/dev/gatekeeper.mjs, step `claims`): the six seeds ('' and a
 *       to e), 3b judging the worst of them, and every disturbance run and
 *       judge's check (1, 2b to 2j): about 4 minutes.
 *   `--gains` is the first, as it was (kept so an old command still runs).
 *
 * BREAK PROOF (rule 8; v2.3.6462: the old plant set `PVE_MELEE_RANGE`,
 * which nothing reads with `swordswing` ON, and stayed green):
 * `CLAIMS_PLANT=reach` doubles the reach the worker reads today
 * (`room._swordReach`, SWORD_SWING.REACH_PX 150 -> 300: shape-books.md's
 * plant C1) in the reach and free-swing liars' rooms: 3b FAILS on one seed
 * and on six (the numbers are in the PR's words and KNOWN's comment).
 *
 * A gain run is GAIN_MIN simulated minutes (the cook's a whole hour, to meet
 * its hourly cap), a disturbance run DIST_S seconds; the fights tick every
 * 22 ms, as the worker does.  Seeded: the same every run. */
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { seededClock, DISTURBANCES } from './testroom.mjs';
import * as B from './claimbots.mjs';

const BAR = 1.5;
/* today's gains (main 82fb78d, the default seed): a line only falls */
const LINES = {
  reach: 1.42, bowlabel: 1.2, guard: 1.37, cookshield: 0.67, move: 1.17, harvest: 1.46, cook: 0, quest: 1, sale: 1, local: 1, freeswing: 1.74, staff: 2.97,
};   /* v2.3.6462: freeswing and staff, new rows (card BK PR 3), the default seed; v2.3.5906: bowlabel 1.4 -> 1.2 and harvest 1.86 -> 1.46 (`bowpath` and `harvestgrade` ON by default, each row's liar the maximal one under them: card K4 PR 7, the owner's "Go recommended"); v2.3.5905: bowlabel 1.55 -> 1.4 (the honest archers' arrows at the real 1,440 px a second, not 480: card K4 PR 6); v2.3.5901: bowlabel 1.6 -> 1.55 (`bowreach` ON: a claim held to its arrow's flight from where it left; card K4 PR 2, decided for the owner while away, 2026-11-18); v2.3.5727: bowlabel 3.3 -> 1.6 (`bowshot` ON) and cook 1.59 -> 0 (`cookstart` ON), card K2 PR 8: decided for the owner while away, 2026-11-17; v2.3.5551: reach 2.96 -> 1.42 (`swordswing` ON), move 2.56 -> 1.17 (`movetop` ON): the owner's yes, 2026-11-17; v2.3.5550: bowlabel 3.76 -> 3.3 (the flicking archer, an honest way the free-swing trial plays); v2.3.5541: move 4.35 -> 2.56 (the sprint mark, ON: the run goes on through the grace, and the sprint's bound only for what is billed; review-z16) */
/* each gain's spread over five other seeds (CLAIMS_SEED=a..e, --gains:
   the highest less the lowest, rounded up), measured 2026-11-14.  A gain
   fails only past its line by more than its spread, so a change elsewhere in
   the room that moves the dice does not; a judge loosened moves it far more
   (the break proof: the reach doubled, 2.96 to 5.08) */
const SPREAD = {
  reach: 0.56, bowlabel: 0.23, guard: 0.49, cookshield: 0.29, move: 0.01, harvest: 0.32, cook: 0.02, quest: 0, sale: 0, local: 0, freeswing: 0.67, staff: 0.18,   /* v2.3.6462: the new rows' spreads, measured 2026-11-24 */
};
/* v2.3.5900: the harvest's liar with `harvestgrade: true` (2i): a line that
   only falls, as LINES */
const HARVESTGRADE_LINE = 1.46;
/* v2.3.5901: the bow's own claim with `bowreach` (2g, its liar at an honest
   walk): 1.55 on the default seed (1.40 to 1.58 over seeds and any origin
   slack from 50 to 250 px).  Over the bar: what is left is not the reach
   but the claim naming its monster when it lands (no arrow is ever wasted
   in flight) -- the arrow's line and flight time, a later judge (K4's
   status, Found).  A line that only falls */
const BOWREACH_LINE = 1.40;   /* v2.3.5905: 1.55 -> 1.40, the honest archers' arrows at their real speed (under the bar now) */
/* v2.3.5904: the bow's liar with `bowpath: true` (2j): 1.33 on the default
   seed (1.30 to 1.40 over seeds and run names).  A line that only falls */
const BOWPATH_LINE = 1.20;   /* v2.3.5905: 1.33 -> 1.20, the same */
const BOWPATH_LIAR = 'the path\'s liar: each relay aimed at a monster that still needs arrows, each claim when its arrow could have landed, on its line';
const GRADED = 'the graded liar: perfect at the gesture\'s floor while its 15 in 20 last, else good at once';
/* v2.3.5906: the liars each judge was first measured against, by name (the
   main rows now carry the maximal liar under the defaults) */
const SHOTS_LIAR = ['standing, an arrow\'s relay and a `ranged` claim on everything in reach, five a second (the bow\'s rate holds it)', B.liarBowLabel, { shots: true }];
const PLAIN_HARVEST_LIAR = ['every strike perfect, at the earliest the worker takes it', B.harvester, { liar: true }];
const GAIN_MIN = 4;
const DIST_S = 30;
const WRITE = process.argv.includes('--write');
/* v2.3.6462: the whole run is the gatekeeper's (`--whole`); by default the
   gains alone on one seed, a PR's share (`--gains` was this and still is) */
const WHOLE = process.argv.includes('--whole');
const GAINS_ONLY = !WHOLE;
const SEED = process.env.CLAIMS_SEED || '';             /* the one seed a PR's run plays (and every disturbance run's) */
const SEEDS = WHOLE ? ['', 'a', 'b', 'c', 'd', 'e'] : [SEED];   /* v2.3.6462: 3b judges the worst of these */
/* v2.3.6462: THE CLAIMS OVER THE BAR, KNOWN: each its worst gain over the six
   seeds (`--whole`), measured on main e5342063, 2026-11-24.  A row that only
   falls: lower it when --whole prints a NOTE, remove it when the claim is
   under the bar.  Never raise one to pass, and never shrink a liar to pass. */
const KNOWN = {
  /* seeds '' a b c d e: 1.42 1.46 1.55 1.57 1.92 1.46.  The sword's swing
     (swordswing.js: 150 px from the worker's copy, a token bucket of 2):
     the liar claims from 149 px what the honest sword walks in to 90 for.
     Tightening it is the owner's call 5 (finish.md part 9) */
  reach: 1.92,
  /* seeds '' a b c d e: 1.46 1.33 1.41 1.36 1.57 1.37.  The graded liar
     under `harvestgrade` (harvestgrade.js: 15 perfects in any 20, no sooner
     than an honest gesture) over a phone's guessed grades (the bot lab's
     45% perfect): the grade is still the phone's word inside that limit */
  harvest: 1.57,
  /* seeds '' a b c d e: 1.74 1.32 1.17 1.08 1.21 1.75.  The reach liar on
     the free-swing trial: its swings skip the swing's count (combat.js
     `_freeSwingFor`), the trial's prorating holds their rate, and the reach
     is the sword's 150 px, as `reach` */
  freeswing: 1.75,
  /* seeds '' a b c d e: 2.97 2.63 2.73 2.76 2.68 2.81.  The staff's judge
     (hitproof.js) allows 2 claims a second, the quickest build's bolt (200
     + 300 ms), and a reach of 675 x Range + 250 + 0.3 s of the run from
     where it stands; a new character's honest caster looses one every 900
     ms and walks in to 600 px.  The judge, not the bench: a later card's */
  staff: 2.97,
};
const KNOWN_WHY = {
  reach: 'the sword\'s 150 px swing reach against an honest 90 px: the owner\'s call 5 (finish.md part 9)',
  harvest: 'the phone\'s grade inside harvestgrade\'s 15-in-20 limit, over a guessed honest mix',
  freeswing: 'the sword\'s reach as `reach`, on the trial\'s prorated swings',
  staff: 'the staff\'s rate at the quickest build\'s (2 a second) and its reach from where it stands, against a new character\'s 900 ms bolt',
};
const PLANT = process.env.CLAIMS_PLANT || '';
const CENSUS = new URL('../../docs/plan/census/claims.md', import.meta.url);

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500)));
};
/* each run its own clock and dice, seeded by its name: a run's number
   depends on that run alone, never on the runs before it */
const seedOf = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };

const COMBAT = { tickMs: 22, prep: B.nearField };
/* v2.3.6462: the break proof, at the reach the worker reads (combat.js
   `this._swordReach()`: SWORD_SWING.REACH_PX with `swordswing` ON, else
   PVE_MELEE_RANGE), doubled; the liar reads the same (claimbots.mjs) */
const REACH_PLANT = (room) => { const r0 = room._swordReach.bind(room); room._swordReach = () => 2 * r0(); };
const STEPPER = 'the stepping archer: a shot every 495 ms, running in (250 px a second) while its arrows fly';
const PHONE_MIX = { perfect: 0.45, good: 0.44 };   /* the bot lab's assumption: no measured data on real grades */
const CLAIMS = [
  { id: 'reach', what: 'the sword\'s reach', judge: 'a melee hit is taken from the worker\'s copy within `_swordReach()` (150 px, SWORD_SWING.REACH_PX with `swordswing` ON; v2.3.6462: it said PVE_MELEE_RANGE\'s 400, read only with it off), one counted swing at the sword\'s rate (swordswing.js), and a miss never reaches the worker',
    take: 'kills', world: COMBAT,
    honest: [['the honest sword: in to 90 px, a swing every 600 ms', B.honestSword]],
    liar: ['every monster within the judge\'s reach (149 px), each every 210 ms (its lane), unshoved (`noKb`)', B.liarSword],
    plant: PLANT === 'reach' ? REACH_PLANT : null },
  /* v2.3.6462 (card BK PR 3): the reach liar whose join says `fs: 1` (the
     free-swing trial, join.js): its swings skip the swing's count
     (combat.js `_freeSwingFor`) and keep the trial's own floor and share
     (freeswing.js) -- shape-books.md's probe, now a row */
  { id: 'freeswing', what: 'the sword\'s reach on the free-swing trial (a join that says `fs: 1`)', judge: 'the sword\'s reach (swordswing.js, 150 px); the swing\'s count is skipped for a phone on the trial (combat.js `_freeSwingFor`), its swings prorated by time instead (freeswing.js)',
    take: 'kills', world: COMBAT,
    honest: [['the honest sword', B.honestSword], ['the honest sword on the trial (its join says `fs: 1`)', B.honestSword, { fs: 1 }]],
    liar: ['the reach liar, its join saying `fs: 1`', B.liarSword, { fs: 1 }],
    plant: PLANT === 'reach' ? REACH_PLANT : null },
  /* v2.3.6462 (card BK PR 3): the staff, which had no row */
  { id: 'staff', what: 'a staff\'s claim', judge: '`slot: \'staff\'` with a staff worn (hitproof.js): from the worker\'s copy within 675 px x Range + 250 + 0.3 s of the run, 2 claims a second across every monster (3 s of them may wait), each monster on its 210 ms lane',
    take: 'kills', world: COMBAT,
    honest: [['the honest caster: in to 600 px, a bolt every 900 ms, each claim when its bolt lands', B.honestStaff], ['the honest sword', B.honestSword]],
    liar: ['standing at the staff\'s whole reach, a claim on each monster in it whenever the rate holds one, unshoved', B.liarStaff] },
  { id: 'bowlabel', what: 'a sword\'s claim labelled a bow\'s (TRAPS §329)', judge: '`slot: \'ranged\'` with a bow worn: five claims a second (hitproof.js), each on an arrow the worker saw leave at the bow\'s rate (`bowshot`), within the arrow\'s flight of where it left (`bowreach`, 1,075 px for a new character; with no arrow seen, the hit test\'s 1,490 px for one claim in 3 s), near its line and after its flight (`bowpath`, ON since v2.3.5906), and never lowers the guard',
    take: 'kills', world: COMBAT,
    honest: [['the honest archer: in to 600 px, a shot every 495 ms, each claim when its arrow lands', B.honestBow], ['the honest sword', B.honestSword],
      /* v2.3.5540: the archer who steps in between shots (combat.js's archer's lane, `arrowlane`) */
      [STEPPER, B.honestBow, { stepIn: true }],
      /* v2.3.5550: the free-swing trial's flicked bow (freeswing.js _pfBowCycleMs: 371 ms for a new character), an honest way the trial's phones play */
      ['the flicking archer: in to 600 px, a shot every 371 ms (the free-swing trial\'s flicked bow)', B.honestBow, { gap: 371 }]],
    /* v2.3.5901: the liar the bow's reach meets (`bowreach`, ON): an arrow's relay before each claim, standing at the arrow's flight; without relays it keeps the old reach for one claim in 3 s (2g) */
    /* v2.3.5906: with `bowpath` ON by default the maximal liar is the path's (2j); the relay-and-claim liar is SHOTS_LIAR (2f, 2g) */
    liar: [BOWPATH_LIAR, B.liarBowPath, {}] },
  { id: 'guard', what: 'the guard beyond #1530\'s limits', judge: '`blocking` is believed with no shield worn (movement.js), and a guard sent with each swing stays up through it (moveclaims.js)',
    take: 'hurt', less: true, world: COMBAT,
    honest: [['the honest sword, its guard down while it swings', B.honestSword]],
    liar: ['each swing sent with a raised guard pointed at its target, no shield', B.liarGuard] },
  { id: 'cookshield', what: 'the cooking shield beyond #1530\'s limits', judge: '`ex: \'cook\'` is believed at a fire the worker saw lit, with no fish (moveclaims.js _cookShieldHolds): 3 s after any attack, 120 px from where it began',
    take: 'hurtPerKill', less: true, whole: true, world: COMBAT,
    honest: [['the honest sword, its guard down while it swings', B.honestSword]],
    liar: ['its own fire by the field; after each kill `ex: \'cook\'` with no fish, the 3 s re-arm waited out', B.liarCookShield] },
  { id: 'move', what: 'the move', judge: '`MOVE_BUDGET`: 500 px a second and a 3 s burst (movement.js), the sprint mark (sprint.js), and no walls on the worker',
    /* v2.3.5541: measured with the sprint mark ON (`sprintmark: true`), which lands OFF until the owner's yes: the line is what the yes gives */
    take: 'px', world: { tickMs: 200, flags: { sprintmark: true } },
    honest: [['the honest walker: 150 px a second, point to point', B.mover, { speed: B.WALK }],
      /* v2.3.5541: the sprint mark's honest bot (sprint.js, `sprintmark`) */
      ['the honest sprinter: 3 s sprinting (every move marked), 0.8 s walking, again', B.mover, { speed: B.WALK, sprinter: true }]],
    liar: ['point to point at 660 px a second, every other step marked a sprint', B.mover, { speed: 660, sprintHole: true }] },
  { id: 'harvest', what: 'the harvest\'s grade', judge: 'the phone\'s `accuracy` on `node_strike` (gathering.js), believed when its swipe looks a person\'s (botfp.js) and, with `harvestgrade` (ON since v2.3.5906), no sooner than an honest gesture and at most 15 in any 20 strikes; a perfect pays 2 ore',
    take: 'ore', world: { tickMs: 200, recs: () => ({ bp_bench_h: B.harvestRec() }) },
    honest: [['a phone\'s grades (45% perfect, 44% good: the bot lab\'s guess)', B.harvester, { mix: PHONE_MIX }], ['a computer holding E (never perfect)', B.harvester, { mix: { perfect: 0, good: 1 } }]],
    /* v2.3.5906: with `harvestgrade` ON by default the maximal liar is the graded one (2i); the plain one is PLAIN_HARVEST_LIAR */
    liar: [GRADED, B.harvester, { liar: true, graded: true }] },
  { id: 'cook', what: 'the cook\'s result', judge: 'the phone\'s `kind` on `cook_request` (cooking.js): with `cookstart` (ON since v2.3.5727) only on the plan its start rolled, once, no sooner than its hits and the gesture; 45 a minute and 2,400 an hour',
    take: 'cooked', world: { tickMs: 1000, recs: () => ({ bp_bench_c: B.cookRec() }) }, minutes: 60,
    honest: [['the honest cook: a fire, the start, its hits and the gesture', B.cook, {}]],
    liar: ['`cook_request` alone, at 45 a minute', B.cook, { liar: true }] },
  { id: 'quest', what: 'the quest hand-in', judge: 'each objective is read on the worker\'s own record (quests.js _questObjectiveMet), and a quest pays once',
    take: 'gold', whole: true, world: { tickMs: 1000, recs: () => ({ bp_bench_q: B.questRec() }) },
    honest: [['the honest hand-in of a quest it holds', B.quests, {}]],
    liar: ['every quest the game has, twenty times', B.quests, { liar: true }] },
  { id: 'sale', what: 'the weapon sale with no take-back', judge: 'the worker sells its own weapon at its own price (gear.js _weaponSellValue); the only claim is the place in the stash',
    take: 'gold', whole: true, world: { tickMs: 1000, recs: () => ({ bp_bench_w: B.saleRec() }) },
    honest: [['the honest sale of its five weapons', B.sales, {}]],
    liar: ['places out of form and repeats, ten rounds', B.sales, { liar: true }] },
  { id: 'local', what: 'the local-monster mode', judge: '`monster_dmg_at` and `player_hurt_by_monster` are relays: the worker passes them on and writes nothing',
    take: 'gold+xp+kills', whole: true, world: { tickMs: 1000 },
    honest: [['an honest phone in the world sends none', B.localMonsters, {}]],
    liar: ['six hundred of each, a kill and a heal in every one', B.localMonsters, { liar: true }] },
];
const UNREACHED = [
  { id: 'pagegold', what: 'gold taken on the page in two panels', why: 'FurniturePanel.jsx and DungeonCreatorPanel.jsx lower the gold on the page and send no message: the worker has no furniture or pack record and takes and pays nothing, so an honest phone and a liar keep the same purse. Nothing reaches the worker for a bot to send: the bench cannot reach it in node (the panels\' own fix is the page\'s).' },
];

/* one bot's run: its world, its phone (on a disturbance), its take */
const blank = () => ({ kills: 0, xp: 0, ore: 0, cooked: 0, gold: 0, px: 0, points: 0, hurt: 0 });
async function runBot(c, [who, bot, opts], { d = null, ms, plant = null, flags = undefined, seed = SEED } = {}) {
  const w = c.world || {};
  const clock = seededClock({ seed: seedOf(seed + c.id + '|' + who + '|' + (d ? d.id : 'gain')) }).install();
  try { return await runIn(clock, c, w, bot, opts, { d, ms, plant, flags }); } finally { clock.restore(); }
}
async function runIn(clock, c, w, bot, opts, { d, ms, plant, flags }) {
  const W = await B.makeWorld(clock, { tickMs: w.tickMs || 200, prep: w.prep || null, recs: w.recs ? w.recs() : {}, plant, fs: (opts && opts.fs) || 0, ...((flags || w.flags) ? { flags: flags || w.flags } : {}) });
  const ph = new B.Phone(W, null, d, ms);
  const take = blank();
  const quiet = { l: console.log, w: console.warn, e: console.error };
  console.log = () => {}; console.warn = () => {}; console.error = () => {};
  try { await bot(W, ph, take, opts || {}); }
  catch (e) { ph.refuse('the bot threw: ' + ((e && e.message) || e)); }
  finally { console.log = quiet.l; console.warn = quiet.w; console.error = quiet.e; }
  take.hurt = W.hurt;
  return { take, refusals: ph.refusals, ms: W.clock.now() - ph.t0 };
}
const valueOf = (c, take) => (c.take === 'gold+xp+kills' ? take.gold + take.xp + take.kills : c.take === 'hurtPerKill' ? take.hurt / Math.max(1, take.kills) : take[c.take]);
const perHour = (c, v, ms) => (c.whole ? v : ms > 0 ? (v * 3600000) / ms : 0);

const t0 = performance.now();
/* v2.3.6462: every claim on each seed of SEEDS; `rows` is the first seed's
   (the census's, the lines' and the disturbances' seed) */
const bySeed = Object.create(null);
for (const seed of SEEDS) {
const rows = bySeed[seed] = [];
for (const c of CLAIMS) {
  const ms = (c.minutes || GAIN_MIN) * B.MIN;
  const hon = [];
  for (const h of c.honest) { const r = await runBot(c, h, { ms, seed }); hon.push({ who: h[0], v: perHour(c, valueOf(c, r.take), r.ms), refusals: r.refusals }); }
  const lr = await runBot(c, c.liar, { ms, plant: c.plant || null, seed });
  const liar = { who: c.liar[0], v: perHour(c, valueOf(c, lr.take), lr.ms) };
  const best = c.less ? hon.reduce((a, b) => (b.v < a.v ? b : a)) : hon.reduce((a, b) => (b.v > a.v ? b : a));
  let gain;
  if (c.less) gain = best.v / Math.max(liar.v, 1);
  else if (best.v === 0 && liar.v === 0) gain = 1;
  else gain = liar.v / Math.max(best.v, 1e-9);
  rows.push({ c, hon, liar, best, gain: Math.round(gain * 100) / 100 });
}
}
const rows = bySeed[SEEDS[0]];

/* the honest bots on every disturbance (each claim's first honest bot, and a
   second where it plays another way) */
const dist = [];
for (const c of GAINS_ONLY ? [] : CLAIMS) {
  for (const h of c.honest) {
    if (h[1] === B.honestSword && !h[2] && c.id !== 'reach') continue;   /* the same bot as the reach's: run once (v2.3.6462: a sword with its own opts, `fs: 1`, is another) */
    for (const d of DISTURBANCES) {
      const r = await runBot(c, h, { d, ms: DIST_S * 1000 });
      dist.push({ claim: c.id, who: h[0], d: d.id, refusals: r.refusals });
    }
  }
}
const secs = ((performance.now() - t0) / 1000).toFixed(1);

/* ══════════ THE CHECKS ══════════ */
check(`1: every claim of step 4.2 has its number (${CLAIMS.length}) or its why (${UNREACHED.length})`, CLAIMS.length + UNREACHED.length === 13);   /* v2.3.6462: 11 -> 13, the free-swing reach and the staff */
const refused = dist.filter((x) => x.refusals.length);
check(`2: the honest bots meet no refusal on any disturbance (${dist.length} runs, ${DISTURBANCES.length} disturbances)`, refused.length === 0,
  refused.map((x) => x.claim + ' / ' + x.d + ': ' + x.refusals[0] + (x.refusals.length > 1 ? ' (+' + (x.refusals.length - 1) + ')' : '')));
const gainRuns = SEEDS.flatMap((s) => bySeed[s]).flatMap((r) => r.hon.filter((h) => h.refusals.length).map((h) => r.c.id + ': ' + h.refusals[0]));
check('2: ...nor on the gain runs', gainRuns.length === 0, gainRuns);
/* v2.3.5540 (card K, step 4.2): THE ARCHER'S LANE.  The stepping archer
   keeps every arrow (2, above: its gain run and every disturbance), and with
   the lane's switch thrown (`arrowlane: false`, the plan's rule 4) it loses
   some to the plain 210 ms floor: what the mend gives back. */
/* v2.3.5905: at the arrow's real 1,440 px a second the stepping archer's
   arrows no longer land bunched, so the lane's own case is a SLOW arrow (480
   px a second, as the bench flew every arrow until then: a volley's own
   speedPx is slower still) -- with it on it keeps every one, off it loses some */
const stepOff = GAINS_ONLY ? null : await runBot(CLAIMS.find((c) => c.id === 'bowlabel'), [STEPPER, B.honestBow, { stepIn: true, arrowPx: 480 }], { ms: GAIN_MIN * B.MIN, flags: { arrowlane: false } });
const stepOn = GAINS_ONLY ? null : await runBot(CLAIMS.find((c) => c.id === 'bowlabel'), [STEPPER, B.honestBow, { stepIn: true, arrowPx: 480 }], { ms: GAIN_MIN * B.MIN });
if (stepOn) check('2b: ...the slow-arrow stepping archer keeps every arrow with the lane on', !stepOn.refusals.length, stepOn.refusals.slice(0, 3));
if (stepOff) check(`2b: the stepping archer keeps every arrow; with \`arrowlane: false\` it loses ${stepOff.refusals.length} in ${GAIN_MIN} minutes`, stepOff.refusals.length > 0 && stepOff.refusals.every((x) => /arrow in reach did not land/.test(x)), stepOff.refusals.slice(0, 3));
/* v2.3.5541 (card K, step 4.2): THE SPRINT MARK.  The move's liar marks
   every other step a sprint; with the run going on through the grace
   (sprint.js, `sprintmark: true`: the move's world above) it pays for its
   sprint and takes less ground; with the switch as it lands, OFF (the
   owner's yes waits), it takes what it took. */
{
  const mc = CLAIMS.find((c) => c.id === 'move');
  const onRun = GAINS_ONLY ? null : await runBot(mc, mc.liar, { ms: GAIN_MIN * B.MIN, flags: { sprintmark: true, movetop: false } });
  const on = onRun && { liar: { v: perHour(mc, valueOf(mc, onRun.take), onRun.ms) } };
  const off = GAINS_ONLY ? null : await runBot(mc, mc.liar, { ms: GAIN_MIN * B.MIN, flags: { movetop: false } });   /* v2.3.5551: the sprint mark alone, the move's top off on both sides */
  if (off && on) {
    const offV = perHour(mc, valueOf(mc, off.take), off.ms);
    check(`2c: the sprint mark: the move's liar takes ${Math.round(on.liar.v)} px an hour with \`sprintmark: true\`, and ${Math.round(offV)} as it lands (off)`, offV > on.liar.v * 1.1, { on: on.liar.v, off: offV });
  }
}
/* v2.3.5548 (card K, step 4.2): THE SWORD'S SWING (swordswing.js; an
   opt-in, `swordswing: true`, the owner's to turn on).  With it on, the
   honest sword takes exactly what it took and meets no refusal on any
   disturbance; and the sword's own claim -- its liar at an honest walk, the
   move's claim (its 480 px a second) apart -- falls under the bar. */
if (!GAINS_ONLY) {
  const rc = CLAIMS.find((c) => c.id === 'reach');
  const ms = GAIN_MIN * B.MIN;
  const ON = { swordswing: true };
  /* v2.3.5551: ON by default now: its off side explicit (`swordswing: false`) */
  const OFF = { swordswing: false };
  const hOffRun = await runBot(rc, rc.honest[0], { ms, flags: OFF });
  const hOff = { v: perHour(rc, valueOf(rc, hOffRun.take), hOffRun.ms) };
  const hOn = await runBot(rc, rc.honest[0], { ms, flags: ON });
  const hOnV = perHour(rc, valueOf(rc, hOn.take), hOn.ms);
  const ssDist = [];
  for (const d of DISTURBANCES) { const r = await runBot(rc, rc.honest[0], { d, ms: DIST_S * 1000, flags: ON }); if (r.refusals.length) ssDist.push(d.id + ': ' + r.refusals[0]); }
  check(`2d: \`swordswing: true\`: the honest sword takes what it took (${Math.round(hOnV)} kills an hour, off ${Math.round(hOff.v)}) and meets no refusal on any disturbance`, Math.round(hOnV) === Math.round(hOff.v) && !hOn.refusals.length && !ssDist.length, { on: hOnV, off: hOff.v, refused: [...hOn.refusals.slice(0, 2), ...ssDist] });
  const walk = ['every monster in reach at an honest walk (150 px a second)', B.liarSword, { speed: B.WALK }];
  const lOff = await runBot(rc, walk, { ms, flags: OFF });
  const lOn = await runBot(rc, walk, { ms, flags: ON });
  const gOff = perHour(rc, valueOf(rc, lOff.take), lOff.ms) / Math.max(hOff.v, 1e-9);
  const gOn = perHour(rc, valueOf(rc, lOn.take), lOn.ms) / Math.max(hOnV, 1e-9);
  check(`2d: the sword's own claim (its liar at an honest walk): gain ${gOff.toFixed(2)} off, ${gOn.toFixed(2)} with \`swordswing: true\` (the bar ${BAR})`, gOn <= BAR && gOff > gOn, { off: gOff, on: gOn });
  /* the whole liar (its walk at the move's bound) with it on: what is left is the move's claim (the next judge) */
  const fOn = await runBot(rc, rc.liar, { ms, flags: ON });
  const fOff = await runBot(rc, rc.liar, { ms, flags: { ...OFF, movetop: false } });
  console.log(`     2d: the whole liar with \`swordswing: true\`: gain ${(perHour(rc, valueOf(rc, fOn.take), fOn.ms) / Math.max(hOnV, 1e-9)).toFixed(2)} (both off: ${(perHour(rc, valueOf(rc, fOff.take), fOff.ms) / Math.max(hOff.v, 1e-9)).toFixed(2)})`);
}
/* v2.3.5549 (card K, step 4.2): THE MOVE'S TOP (movement.js MOVE_TOP; an
   opt-in, `movetop: true`, the owner's to turn on).  With it on, the honest
   walker and sprinter take exactly what they took and meet no refusal on
   any disturbance; the liar's gain falls under the bar. */
if (!GAINS_ONLY) {
  const mc = CLAIMS.find((c) => c.id === 'move');
  const mr = rows.find((r) => r.c.id === 'move');
  const ms = GAIN_MIN * B.MIN;
  const ON = { ...(mc.world.flags || {}), movetop: true };
  const MOFF = { ...(mc.world.flags || {}), movetop: false };   /* v2.3.5551: ON by default now: its off side explicit */
  const same = [], refused = [];
  let bestOn = 0, bestOff = 0;
  for (const h of mc.honest) {
    const offRun = await runBot(mc, h, { ms, flags: MOFF });
    const off = { v: perHour(mc, valueOf(mc, offRun.take), offRun.ms) };
    bestOff = Math.max(bestOff, off.v);
    const r = await runBot(mc, h, { ms, flags: ON });
    const v = perHour(mc, valueOf(mc, r.take), r.ms);
    bestOn = Math.max(bestOn, v);
    if (Math.round(v) !== Math.round(off.v)) same.push(h[0] + ': ' + Math.round(off.v) + ' -> ' + Math.round(v));
    refused.push(...r.refusals.slice(0, 1));
    for (const d of DISTURBANCES) { const x = await runBot(mc, h, { d, ms: DIST_S * 1000, flags: ON }); if (x.refusals.length) refused.push(h[0] + ' / ' + d.id + ': ' + x.refusals[0]); }
  }
  check(`2e: \`movetop: true\`: the honest walker and sprinter take what they took and meet no refusal on any disturbance`, !same.length && !refused.length, { same, refused: refused.slice(0, 4) });
  const lOn = await runBot(mc, mc.liar, { ms, flags: ON });
  const gOn = perHour(mc, valueOf(mc, lOn.take), lOn.ms) / Math.max(bestOn, 1e-9);
  const lOff = await runBot(mc, mc.liar, { ms, flags: MOFF });
  const gOff = perHour(mc, valueOf(mc, lOff.take), lOff.ms) / Math.max(bestOff, 1e-9);
  check(`2e: the move's liar: gain ${gOff.toFixed(2)} with \`movetop: false\`, ${gOn.toFixed(2)} on (the bar ${BAR})`, gOn <= BAR && gOn < gOff, { on: gOn, off: gOff });
}
/* v2.3.5550 (card K, step 4.2): A BOW'S CLAIM IS AN ARROW SEEN (bowshot.js).
   ON since v2.3.5727 (card K2 PR 8), so its off side is explicit here
   (`bowshot: false`), as 2e's `movetop`.  With it on, the honest archers
   (and the stepping one) take exactly what they took with it off and meet
   no refusal on any disturbance; the liar -- sending an arrow's relay
   before every claim, the most the judge then accepts -- falls from its
   gain off. */
if (!GAINS_ONLY) {
  const bc = CLAIMS.find((c) => c.id === 'bowlabel');
  const ms = GAIN_MIN * B.MIN;
  const ON = { bowshot: true, bowpath: false }, OFF = { bowshot: false };   /* v2.3.5906: bowshot and its reach alone, the path pinned off */
  const same = [], refused = [];
  let bestOn = 0, bestOff = 0;
  for (const h of bc.honest) {
    const offRun = await runBot(bc, h, { ms, flags: OFF });
    const off = { v: perHour(bc, valueOf(bc, offRun.take), offRun.ms) };
    bestOff = Math.max(bestOff, off.v);
    const r = await runBot(bc, h, { ms, flags: ON });
    const v = perHour(bc, valueOf(bc, r.take), r.ms);
    bestOn = Math.max(bestOn, v);
    if (Math.round(v) !== Math.round(off.v)) same.push(h[0] + ': ' + Math.round(off.v) + ' -> ' + Math.round(v));
    refused.push(...r.refusals.slice(0, 1));
    if (h[1] !== B.honestBow) continue;
    for (const d of DISTURBANCES) { const x = await runBot(bc, h, { d, ms: DIST_S * 1000, flags: ON }); if (x.refusals.length) refused.push(h[0] + ' / ' + d.id + ': ' + x.refusals[0]); }
  }
  check(`2f: \`bowshot: true\`: the honest archers take what they took and meet no refusal on any disturbance`, !same.length && !refused.length, { same, refused: refused.slice(0, 4) });
  const lOn = await runBot(bc, ['the liar, an arrow\'s relay before each claim', B.liarBowLabel, { shots: true }], { ms, flags: ON });
  const gOn = perHour(bc, valueOf(bc, lOn.take), lOn.ms) / Math.max(bestOn, 1e-9);
  const lOff = await runBot(bc, ['the liar, an arrow\'s relay before each claim', B.liarBowLabel, { shots: true }], { ms, flags: OFF });
  const gOff = perHour(bc, valueOf(bc, lOff.take), lOff.ms) / Math.max(bestOff, 1e-9);
  const br = { gain: gOff.toFixed(2) };
  /* 1.60 on main ea7df6b0 (the default seed): over the bar by what is left
     of the bow's REACH -- 1,490 px, its run allowance a second at the flat
     500 px a second (hitproof.js _hitReach), so the liar stands back and
     never walks.  A line that only falls; the reach is the next judge.
     v2.3.5901: that judge (`bowreach`, ON, 2g) runs here too: this liar
     now stands at its arrow's flight (1.62 on its seed, within the line's
     spread; the default seed's main row 1.55) */
  const BOWSHOT_LINE = 1.46;   /* v2.3.5905: 1.60 -> 1.46, the honest archers' arrows at their real speed */
  check(`2f: the bow's liar: gain ${br.gain} off, ${gOn.toFixed(2)} with \`bowshot: true\` (its line ${BOWSHOT_LINE}, the bar ${BAR}; with \`bowreach\` ON since v2.3.5901: 2g)`, gOn <= BOWSHOT_LINE + SPREAD.bowlabel && gOn < gOff, { on: gOn, off: gOff });
}
/* v2.3.5901 (card K4 PR 2, step 4.2): THE BOW'S REACH, FROM WHERE THE ARROW
   LEFT (bowshot.js, `bowreach`, ON; `bowreach: false` its kill switch).
   With it on, the honest archers (the stepping one too) take exactly what
   they took with it off and meet no refusal on any disturbance; the bow's
   own claim -- its liar at an honest walk, the move's claim (its 480 px a
   second) apart, as 2d's sword -- falls from its gain off to its line
   (BOWREACH_LINE: over the bar, see there); the whole liar falls from its
   gain off; and the liar that sends no relays (keeping the hit test's
   reach) gets one claim in 3 s.
   BREAK PROOF (rule 8), tried by hand 2026-11-18: `bowreach: false` is the
   off side measured here (1.60, past the line: FAIL were it the default). */
let bowReach = null;
if (!GAINS_ONLY) {
  const bc = CLAIMS.find((c) => c.id === 'bowlabel');
  const ms = GAIN_MIN * B.MIN;
  const OFF = { bowreach: false, bowpath: false };
  const G_ON = { bowpath: false };   /* v2.3.5906: the reach alone, the path (ON by default) pinned off */
  const same = [], refused = [];
  let bestOn = 0, bestOff = 0;
  for (const h of bc.honest) {
    const offRun = await runBot(bc, h, { ms, flags: OFF });
    const off = perHour(bc, valueOf(bc, offRun.take), offRun.ms);
    bestOff = Math.max(bestOff, off);
    const r = await runBot(bc, h, { ms, flags: G_ON });
    const v = perHour(bc, valueOf(bc, r.take), r.ms);
    bestOn = Math.max(bestOn, v);
    if (Math.round(v) !== Math.round(off)) same.push(h[0] + ': ' + Math.round(off) + ' -> ' + Math.round(v));
    refused.push(...r.refusals.slice(0, 1));
    if (h[1] !== B.honestBow) continue;
    for (const d of DISTURBANCES) { const x = await runBot(bc, h, { d, ms: DIST_S * 1000, flags: G_ON }); if (x.refusals.length) refused.push(h[0] + ' / ' + d.id + ': ' + x.refusals[0]); }
  }
  check(`2g: \`bowreach\` (ON): the honest archers take what they took with it off and meet no refusal on any disturbance`, !same.length && !refused.length, { same, refused: refused.slice(0, 4) });
  const g = (r, best) => perHour(bc, valueOf(bc, r.take), r.ms) / Math.max(best, 1e-9);
  const walk = ['the liar at an honest walk (150 px a second), an arrow\'s relay before each claim', B.liarBowLabel, { shots: true, speed: B.WALK }];
  const wOn = g(await runBot(bc, walk, { ms, flags: G_ON }), bestOn);
  const wOff = g(await runBot(bc, walk, { ms, flags: OFF }), bestOff);
  const fOn = g(await runBot(bc, SHOTS_LIAR, { ms, flags: G_ON }), bestOn);
  const fOff = g(await runBot(bc, SHOTS_LIAR, { ms, flags: OFF }), bestOff);
  const bare = g(await runBot(bc, ['the liar sending no relays', B.liarBowLabel, {}], { ms, flags: G_ON }), bestOn);
  bowReach = { walkOn: wOn, walkOff: wOff, on: fOn, off: fOff, bare };
  check(`2g: the bow's own claim (its liar at an honest walk): gain ${wOff.toFixed(2)} with \`bowreach: false\`, ${wOn.toFixed(2)} on (its line ${BOWREACH_LINE}, the bar ${BAR})`, wOn <= BOWREACH_LINE + 0.005 && wOn < wOff, bowReach);
  check(`2g: the whole liar (its walk at 480 px a second, the move's claim): ${fOff.toFixed(2)} off, ${fOn.toFixed(2)} on; with no relays ${bare.toFixed(2)}`, fOn < fOff && bare < 0.5, bowReach);
}
/* v2.3.5904 (card K4 PR 5, step 4.2): THE BOW'S PATH (bowshot.js; an
   `bowpath`, OFF as merged at v2.3.5904, ON by default since v2.3.5906:
   `bowpath: false` its kill switch).  With it
   on, every honest archer (the stepping one and the flicking one too) takes
   exactly what it took with it off and meets no refusal on any disturbance;
   the liar it meets (claimbots.mjs liarBowPath: each relay aimed at a
   monster that still needs arrows, each claim when its arrow could have
   landed, on its monster or another on its line) falls under the bar, and
   the liar 2g measures (a relay and a claim at once) under 1.
   BREAK PROOF (rule 8), tried by hand 2026-11-18: with the switch off the
   relay-and-claim liar is 1.55 (2g), past the line: FAIL. */
let bowPath = null;
if (!GAINS_ONLY) {
  const bc = CLAIMS.find((c) => c.id === 'bowlabel');
  const ms = GAIN_MIN * B.MIN;
  const ON = { bowpath: true };
  const same = [], refused = [];
  let bestOn = 0;
  for (const h of bc.honest) {
    const offRun = await runBot(bc, h, { ms, flags: { bowpath: false } });   /* v2.3.5906: its off side explicit (ON by default) */
    const off = perHour(bc, valueOf(bc, offRun.take), offRun.ms);
    const r = await runBot(bc, h, { ms, flags: ON });
    const v = perHour(bc, valueOf(bc, r.take), r.ms);
    bestOn = Math.max(bestOn, v);
    if (Math.round(v) !== Math.round(off)) same.push(h[0] + ': ' + Math.round(off) + ' -> ' + Math.round(v));
    refused.push(...r.refusals.slice(0, 1));
    if (h[1] !== B.honestBow) continue;
    for (const d of DISTURBANCES) { const x = await runBot(bc, h, { d, ms: DIST_S * 1000, flags: ON }); if (x.refusals.length) refused.push(h[0] + ' / ' + d.id + ': ' + x.refusals[0]); }
  }
  check(`2j: \`bowpath: true\`: every honest archer takes what it took and meets no refusal on any disturbance`, !same.length && !refused.length, { same, refused: refused.slice(0, 4) });
  const g = (r) => perHour(bc, valueOf(bc, r.take), r.ms) / Math.max(bestOn, 1e-9);
  const path = g(await runBot(bc, [BOWPATH_LIAR, B.liarBowPath, {}], { ms, flags: ON }));
  const shots = g(await runBot(bc, SHOTS_LIAR, { ms, flags: ON }));
  bowPath = { path, shots };
  check(`2j: with \`bowpath: true\` the path's liar ${path.toFixed(2)} (its line ${BOWPATH_LINE}, the bar ${BAR}), the relay-and-claim liar ${shots.toFixed(2)}`, path <= BAR && path <= BOWPATH_LINE + 0.005 && shots < 1, bowPath);
}
/* v2.3.5553 (card K, step 4.2): A COOK IS A COOK THE WORKER STARTED
   (cooking.js _cookStartOk / _cookStartTake).  ON since v2.3.5727 (card K2
   PR 8; the owner, 2026-11-17: "Go recommended on all"), so its off side is
   explicit here (`cookstart: false`), as 2f's `bowshot`.  With it on, the
   honest cook takes what it took off and meets no refusal on any
   disturbance; the liar it meets -- the start, then the result at the plan's
   quickest, no fire and no gesture -- and its gain. */
if (!GAINS_ONLY) {
  const cc = CLAIMS.find((c) => c.id === 'cook');
  const ms = (cc.minutes || GAIN_MIN) * B.MIN;
  const ON = { cookstart: true }, OFF = { cookstart: false };
  const h = cc.honest[0];
  const offRun = await runBot(cc, h, { ms, flags: OFF });
  const vOff = perHour(cc, valueOf(cc, offRun.take), offRun.ms);
  const r = await runBot(cc, h, { ms, flags: ON });
  const v = perHour(cc, valueOf(cc, r.take), r.ms);
  const refused = [...r.refusals.slice(0, 1)];
  for (const d of DISTURBANCES) { const x = await runBot(cc, h, { d, ms: DIST_S * 1000, flags: ON }); if (x.refusals.length) refused.push(d.id + ': ' + x.refusals[0]); }
  check(`2h: \`cookstart: true\`: the honest cook takes what it took (${Math.round(v)} an hour, off ${Math.round(vOff)}) and meets no refusal on any disturbance`, Math.round(v) === Math.round(vOff) && !refused.length, { refused: refused.slice(0, 4) });
  const bareOff = await runBot(cc, cc.liar, { ms, flags: OFF });
  const gOff = perHour(cc, valueOf(cc, bareOff.take), bareOff.ms) / Math.max(vOff, 1e-9);
  const bare = await runBot(cc, cc.liar, { ms, flags: ON });
  const lOn = await runBot(cc, ['the liar, a start before each result, at the plan\'s quickest', B.cook, { liar: true, start: true }], { ms, flags: ON });
  const gBare = perHour(cc, valueOf(cc, bare.take), bare.ms) / Math.max(v, 1e-9);
  const gOn = perHour(cc, valueOf(cc, lOn.take), lOn.ms) / Math.max(v, 1e-9);
  check(`2h: the cook's liar: gain ${gOff.toFixed(2)} with \`cookstart: false\`; with it on the bare request ${gBare.toFixed(2)}, the started one ${gOn.toFixed(2)} (the bar ${BAR})`, gOn <= BAR && gBare < 0.05 && gOff > gBare, { bare: gBare, on: gOn, off: gOff });
}
/* v2.3.5900 (card K4 PR 1, step 4.2): THE HARVEST'S GRADE, JUDGED
   (harvestgrade.js; OFF as merged at v2.3.5900, ON by default since
   v2.3.5906: `harvestgrade: false` its kill switch).  With it on, both honest harvesters (the phone's
   grades, the computer's held key) take exactly what they took with it off
   and meet no refusal on any disturbance -- a perfect of theirs paid as good
   is one (claimbots.mjs harvester) -- and the maximal liar falls under the
   bar: the better of the plain liar (every strike perfect at the earliest,
   all now paid good) and the graded one (claimbots.mjs `graded`: it waits
   for the gesture's floor while a perfect would be believed, and strikes at
   once when its 15 in 20 are spent).
   BREAK PROOF (rule 8), tried by hand 2026-11-17: HARVEST_GRADE.SHARE_MAX
   = 20 (the share off, the time alone) takes the graded liar from 1.46 to
   1.57: FAIL. */
let harvestGradeOn = null;
if (!GAINS_ONLY) {
  const hc = CLAIMS.find((c) => c.id === 'harvest');
  const ms = GAIN_MIN * B.MIN;
  const ON = { harvestgrade: true };
  const same = [], refused = [];
  let bestOn = 0, bestOff = 0;
  for (const h of hc.honest) {
    const offRun = await runBot(hc, h, { ms, flags: { harvestgrade: false } });   /* v2.3.5906: its off side explicit (ON by default) */
    const off = perHour(hc, valueOf(hc, offRun.take), offRun.ms);
    bestOff = Math.max(bestOff, off);
    const r = await runBot(hc, h, { ms, flags: ON });
    const v = perHour(hc, valueOf(hc, r.take), r.ms);
    bestOn = Math.max(bestOn, v);
    if (Math.round(v) !== Math.round(off)) same.push(h[0] + ': ' + Math.round(off) + ' -> ' + Math.round(v));
    refused.push(...r.refusals.slice(0, 1));
    for (const d of DISTURBANCES) { const x = await runBot(hc, h, { d, ms: DIST_S * 1000, flags: ON }); if (x.refusals.length) refused.push(h[0] + ' / ' + d.id + ': ' + x.refusals[0]); }
  }
  check(`2i: \`harvestgrade: true\`: the honest harvesters take what they took and meet no refusal on any disturbance`, !same.length && !refused.length, { same, refused: refused.slice(0, 4) });
  const lOff = await runBot(hc, PLAIN_HARVEST_LIAR, { ms, flags: { harvestgrade: false } });
  const gOff = perHour(hc, valueOf(hc, lOff.take), lOff.ms) / Math.max(bestOff, 1e-9);
  const plain = await runBot(hc, PLAIN_HARVEST_LIAR, { ms, flags: ON });
  const graded = await runBot(hc, [GRADED, B.harvester, { liar: true, graded: true }], { ms, flags: ON });
  const gPlain = perHour(hc, valueOf(hc, plain.take), plain.ms) / Math.max(bestOn, 1e-9);
  const gGraded = perHour(hc, valueOf(hc, graded.take), graded.ms) / Math.max(bestOn, 1e-9);
  const gOn = Math.max(gPlain, gGraded);
  harvestGradeOn = { off: gOff, plain: gPlain, graded: gGraded, on: gOn, liar: perHour(hc, valueOf(hc, graded.take), graded.ms) };
  /* 1.46 on main fcd1ae9 (the default seed; 1.33 to 1.58 over seeds a to e,
     the honest phone's own luck over its twenty strikes) */
  check(`2i: the harvest's liar: gain ${gOff.toFixed(2)} with \`harvestgrade: false\`; with \`harvestgrade: true\` the plain liar ${gPlain.toFixed(2)}, the graded one ${gGraded.toFixed(2)} (its line ${HARVESTGRADE_LINE}, the bar ${BAR})`, gOn <= BAR && gOn <= HARVESTGRADE_LINE + 0.005 && gOn < gOff, harvestGradeOn);
}
/* 3: each seed's gain within its line and its spread (the line a dice
   margin over the default seed's; v2.3.6462: on every seed run, which the
   spread was measured to hold) */
for (const seed of SEEDS) for (const r of bySeed[seed]) {
  const line = LINES[r.c.id];
  check(`3: ${r.c.id}${SEEDS.length > 1 ? ` (seed '${seed}')` : ''}: its gain ${r.gain} is within its line ${line} and its spread ${SPREAD[r.c.id]}`, r.gain <= line + SPREAD[r.c.id] + 1e-9, { honest: Math.round(r.best.v), liar: Math.round(r.liar.v) });
  if (seed === SEEDS[0] && r.gain < line - SPREAD[r.c.id] - 0.005) console.log(`NOTE ${r.c.id}'s gain fell to ${r.gain} (line ${line}): lower its line in this suite, and the census with --write`);
}
/* 3b (v2.3.6462): THE BAR.  Each claim's worst gain over the seeds run: under
   BAR passes; over it, a KNOWN row at or above it prints KNOWN (never PASS),
   else it fails.  A KNOWN row prints KNOWN on a seed under the bar too: its
   worst is over it, and a PR's one seed must not read as the claim met */
const worstOf = (id) => SEEDS.map((seed) => ({ seed, gain: bySeed[seed].find((r) => r.c.id === id).gain })).reduce((a, b) => (b.gain > a.gain ? b : a));
for (const c of CLAIMS) {
  const w = worstOf(c.id), k = KNOWN[c.id];
  const where = SEEDS.length > 1 ? `the worst of ${SEEDS.length} seeds, ${w.gain} (seed '${w.seed}')` : `${w.gain} on seed '${w.seed}'`;
  if (k === undefined) check(`3b: ${c.id}: ${where}, ${w.gain <= BAR ? 'under' : 'OVER'} the bar ${BAR}${w.gain <= BAR ? '' : ' and not a KNOWN row'}`, w.gain <= BAR);
  else if (w.gain > k + 1e-9) check(`3b: ${c.id}: ${where}, over its KNOWN row ${k} (the bar ${BAR})`, false);
  else {
    console.log(`KNOWN 3b: ${c.id} ${k}, over the bar ${BAR}, known (${where}${SEEDS.length > 1 ? '' : `; ${k} the worst of six, --whole`}): ${KNOWN_WHY[c.id]}`);
    if (WHOLE && w.gain <= BAR) console.log(`NOTE ${c.id} is under the bar on every seed: remove its KNOWN row`);
    else if (WHOLE && w.gain < k - 0.005) console.log(`NOTE ${c.id}'s worst fell to ${w.gain} (KNOWN ${k}): lower its row`);
  }
}
for (const id of Object.keys(KNOWN)) if (!CLAIMS.some((c) => c.id === id)) check(`3b: KNOWN's row ${id} is a claim measured here`, false);
console.log(`     ${rows.length} claims measured, ${dist.length} disturbance runs, in ${secs} s`);

/* ══════════ THE CENSUS ══════════ */
if (WRITE) {
  const n0 = (v) => Math.round(v).toLocaleString('en-US');
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  const takeWord = { hurtPerKill: 'damage taken a kill', kills: 'kills an hour', hurt: 'damage taken an hour', px: 'px of ground an hour', ore: 'ore an hour', cooked: 'fish cooked an hour', gold: 'gold (the run\'s whole take)', 'gold+xp+kills': 'gold, experience and kills' };
  const L = [
    '# The claims\' gains (card K PR 6, v2.3.5186)',
    '',
    'Made by `node test/claims-gain.test.mjs --whole --write` (from `server/`). Grand',
    'plan step 4.2, step 1: each claim the worker believes inside a bound, its',
    'gain measured by house bots (`server/test/claimbots.mjs`) on card E\'s test',
    'room: the take of a maximal liar (it sends the most the judge accepts) an',
    'hour, over an honest player\'s (it plays as a phone does). For the guard the',
    'take is the damage kept off, so its gain is the honest damage over the',
    'liar\'s. Where two honest ways exist the better one is the bar the liar is',
    'held to. 1.5 is the bar at which step 4.2 ticks a claim; each gain is a line',
    'that only falls (the suite\'s `LINES`). Nothing here tightens a judge: step',
    '4.2\'s tightenings (card K\'s second block) each come behind its own live flag,',
    'and this bench is how each is measured.',
    '',
    `On main e5342063 (v2.3.6462), seeded, ${GAIN_MIN} simulated minutes a run (the cook's an hour).`,
    '',
    '## The gains',
    '',
    '| Claim | The judge | The take | Honest | Liar | Gain | Its spread | Worst of the seeds | Over 1.5 |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${esc(r.c.what)} (\`${r.c.id}\`) | ${esc(r.c.judge)} | ${takeWord[r.c.take]} | ${n0(r.best.v)} (${esc(r.best.who)}) | ${n0(r.liar.v)} (${esc(r.liar.who)}) | **${r.gain}** | ${SPREAD[r.c.id]} | ${worstOf(r.c.id).gain} (seed '${worstOf(r.c.id).seed}') | ${KNOWN[r.c.id] !== undefined ? '**KNOWN**' : worstOf(r.c.id).gain > BAR ? 'yes' : 'no'} |`),
    '',
    'The spread is the gain\'s highest less its lowest over five other seeds (`CLAIMS_SEED=a` to `e`, `--gains`): the suite fails a gain past its line by more than it.',
    '',
    '### The other honest ways',
    '',
    ...rows.filter((r) => r.hon.length > 1).flatMap((r) => r.hon.filter((h) => h !== r.best).map((h) => `- \`${r.c.id}\`: ${esc(h.who)}: ${n0(h.v)}; the liar over it: **${(r.c.less ? h.v / Math.max(r.liar.v, 1) : r.liar.v / Math.max(h.v, 1e-9)).toFixed(2)}**.`)),
    '',
    ...(harvestGradeOn ? [
      '## The harvest\'s grade, judged (`harvestgrade`, ON since v2.3.5906)',
      '',
      `v2.3.5900 (card K4 PR 1; \`server/src/harvestgrade.js\`): with \`harvestgrade: true\` a perfect is believed only at or after the earliest an honest gesture could make it (the plan's hits, the settle and the 1.2 s gesture floor) and at most 15 in any 20 strikes; a perfect refused is paid as good. The honest harvesters take what they took with it off and meet no refusal on any disturbance (a perfect of theirs paid as good counts as one). The liar: **${harvestGradeOn.off.toFixed(2)}** as merged; with it on, the plain liar (every strike perfect at the earliest) **${harvestGradeOn.plain.toFixed(2)}**, the graded one (perfect at the gesture's floor while its 15 in 20 last, else good at once) **${harvestGradeOn.graded.toFixed(2)}**, ${n0(harvestGradeOn.liar)} ore an hour. Its line, \`HARVESTGRADE_LINE\`, only falls. The share changes what a player whose every gesture is perfect is paid (three in four: 1.75 ore a strike for 2). ON by default since v2.3.5906 (the owner's "Go recommended"); \`harvestgrade: false\` turns it off.`,
      '',
    ] : []),
    ...(bowReach ? [
      '## The bow\'s reach, from where the arrow left (`bowreach`, ON)',
      '',
      `v2.3.5901 (card K4 PR 2; \`server/src/bowshot.js\`): a claim on an arrow the worker saw leave lands only with the monster within the arrow's own flight of where the archer stood at its relay (675 px x Range, and 400 px of slack: 1,075 px for a new character), not the hit test's 1,490 px from where the archer stands now; a claim with no arrow seen gets 3, and one more every 3 s. The honest archers take what they took with it off and meet no refusal on any disturbance. The bow's own claim (its liar at an honest walk): **${bowReach.walkOff.toFixed(2)}** off, **${bowReach.walkOn.toFixed(2)}** on; the whole liar (walking at 480 px a second, the move's claim) **${bowReach.off.toFixed(2)}** off, **${bowReach.on.toFixed(2)}** on; the liar sending no relays **${bowReach.bare.toFixed(2)}**. What is left is not the reach but the claim naming its monster when it lands, so no arrow is ever wasted in flight: the bow's path below (\`bowpath\`). (v2.3.5905: the honest archers' arrows fly the real 1,440 px a second here, not 480.)`,
      '',
    ] : []),
    ...(bowPath ? [
      '## The bow\'s path (`bowpath`, ON since v2.3.5906)',
      '',
      `v2.3.5904 (card K4 PR 5; \`server/src/bowshot.js\`): with \`bowpath: true\` a claim on an arrow seen lands only for a monster near that arrow's line (its relay's x, y and angle -- since v2.3.5905 the relay goes at release, with the line the arrow flies, against a worker advertising caps.bowPath: 200 px beside it measured to the monster's body, its feet up 130 px, a boss's 260, and the landing's 8 degree turn) and no sooner than the arrow could have flown there (1,440 px a second x Range, less 300 ms). Every honest archer takes what it took with it off and meets no refusal on any disturbance. The bow's liar with it on: the path's liar (each relay aimed at a monster that still needs arrows, each claim when its arrow could have landed, on its line) **${bowPath.path.toFixed(2)}**; the relay-and-claim liar **${bowPath.shots.toFixed(2)}**. Its line, \`BOWPATH_LINE\`, only falls. ON by default since v2.3.5906 (the owner's "Go recommended"); \`bowpath: false\` turns it off.`,
      '',
    ] : []),
    '## Over the bar, known (`KNOWN`, v2.3.6462)',
    '',
    `The suite judges each claim's worst gain over the seeds run (${SEEDS.map((x) => `'${x}'`).join(', ')}) against the bar ${BAR} (check 3b). These are over it, and say so: a row that only falls, never raised to pass. Tightening a judge is not this suite's: the sword's reach is the owner's call 5 (\`docs/plan/finish.md\` part 9).`,
    '',
    ...Object.keys(KNOWN).map((id) => `- \`${id}\`: **${KNOWN[id]}** (this run's worst ${worstOf(id).gain}, seed '${worstOf(id).seed}'): ${esc(KNOWN_WHY[id])}`),
    '',
    '## Claims with no number yet, and why',
    '',
    ...UNREACHED.map((u) => `- **${esc(u.what)}** (\`${u.id}\`): ${esc(u.why)}`),
    '',
    '## The honest bots on each disturbance',
    '',
    `Each run ${DIST_S} simulated seconds (card E's \`DISTURBANCES\`; a hidden tab's minute is added to its run). A refusal is what the worker did not take of what an honest phone sent: a hit in reach that did not land, a strike not paid, a cook not cooked, a step not taken.`,
    '',
    '| Bot | ' + DISTURBANCES.map((d) => '`' + d.id + '`').join(' | ') + ' |',
    '|---|' + DISTURBANCES.map(() => '---').join('|') + '|',
    ...[...new Set(dist.map((x) => x.claim + '\u0000' + x.who))].map((k) => {
      const [claim, who] = k.split('\u0000');
      return `| \`${claim}\`: ${esc(who)} | ` + DISTURBANCES.map((d) => { const x = dist.find((y) => y.claim === claim && y.who === who && y.d === d.id); return x ? (x.refusals.length ? x.refusals.length + ' refused' : '0') : ''; }).join(' | ') + ' |';
    }),
    '',
    '## What the bench leaves out, said once',
    '',
    '- **The honest grades are a guess.** Nothing records the grades real thumbs get; the phone\'s mix is the bot lab\'s assumption, and the computer\'s held key (never perfect) is the other end. Both are listed.',
    '- **Walls.** The worker has no map, so both walkers go in straight lines. An honest walker\'s way round a wall or the sea only lengthens its route, so the move\'s gain is a floor.',
    '- **A join is a second door for a place** (lastplace.js): a reconnect is judged with no cap on the time it waited, and a join after a deploy is taken where it says. Not in the move\'s liar; its own line when its judge is tightened.',
    '- **The healer.** In every fight the bots\' health is put back after each blow, so a run measures its claim and never a death and the long walk back. The guard counts what the healer put back.',
    '- **The cooking shield guards no swing**: the first attack ends it, and it comes back only 3 s after the last. Its liar is kept from blows only while it waits, among the monsters, so it is hurt more a kill than the honest sword: its gain is under 1, and the shield\'s worth is time out of a fight (no gold, ore or experience).',
    '- **The guard\'s liar raises its guard with every swing**; one that times each raise to a blow\'s wind-up (a parry: free, 10 stamina back, the monster staggered) is not built, so the guard\'s gain is a floor.',
    '- **The archer who steps in between shots** (the bow\'s third honest bot) lands two arrows on one monster closer together than it shot them. Until v2.3.5540 the 210 ms lane dropped the second (`combat.js` `_handleMonsterDamage`); the archer\'s lane (`arrowlane`) lets one in early, the same claims a minute: it keeps every arrow, and with the switch thrown it loses some (2b).',
    '- **The Wheel\'s far monsters** are left out of the fights\' rooms (claimbots.mjs `nearField`): they never meet a bot.',
    '',
  ];
  writeFileSync(CENSUS, L.join('\n'));
  console.log('     wrote docs/plan/census/claims.md');
}
/* v2.3.6462: every seed run, each honest bot's take (the best one first) */
for (const seed of SEEDS) for (const r of bySeed[seed]) console.log(`     ${SEEDS.length > 1 ? `'${seed}' ` : ''}${r.c.id.padEnd(9)} honest ${[r.best, ...r.hon.filter((h) => h !== r.best)].map((h) => Math.round(h.v)).join(' / ')}  liar ${Math.round(r.liar.v)}  gain ${r.gain}`);
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
