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
 * BREAK PROOF (rule 8), tried by hand 2026-11-14: `CLAIMS_PLANT=reach node
 * test/claims-gain.test.mjs` loosens the sword's judge in the reach liar's
 * room (`room.PVE_MELEE_RANGE = 800`, the reach doubled): the liar claims
 * from 799 px, its gain rises from 2.96 to 5.08, past its line and spread:
 * FAIL (and only the reach: each run has its own seed).
 *
 * About 25 s: a gain run is GAIN_MIN simulated minutes (the cook's a whole
 * hour, to meet its hourly cap), a disturbance run DIST_S seconds; the
 * fights tick every 22 ms, as the worker does.  Seeded: the same every run. */
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { seededClock, DISTURBANCES } from './testroom.mjs';
import * as B from './claimbots.mjs';

const BAR = 1.5;
/* today's gains (main 82fb78d, the default seed): a line only falls */
const LINES = {
  reach: 2.96, bowlabel: 3.76, guard: 1.37, move: 4.35, harvest: 1.86, cook: 1.59, quest: 1, sale: 1, local: 1,
};
/* each gain's spread over five other seeds (CLAIMS_SEED=a..e, --gains:
   the highest less the lowest, rounded up), measured 2026-11-14.  A gain
   fails only past its line by more than its spread, so a change elsewhere in
   the room that moves the dice does not; a judge loosened moves it far more
   (the break proof: the reach doubled, 2.96 to 5.08) */
const SPREAD = {
  reach: 0.56, bowlabel: 0.23, guard: 0.49, move: 0.01, harvest: 0.32, cook: 0.02, quest: 0, sale: 0, local: 0,
};
const GAIN_MIN = 4;
const DIST_S = 30;
const WRITE = process.argv.includes('--write');
const GAINS_ONLY = process.argv.includes('--gains');   /* the gains alone, no disturbance runs (to read a seed's spread) */
const SEED = process.env.CLAIMS_SEED || '';             /* another seed for every run: the spread the margin below is measured from */
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
const PHONE_MIX = { perfect: 0.45, good: 0.44 };   /* the bot lab's assumption: no measured data on real grades */
const CLAIMS = [
  { id: 'reach', what: 'the sword\'s reach', judge: 'a melee hit is taken from `PVE_MELEE_RANGE` (400 px, index.js; combat.js _handleMonsterDamage), and a miss never reaches the worker',
    take: 'kills', world: COMBAT,
    honest: [['the honest sword: in to 90 px, a swing every 600 ms', B.honestSword]],
    liar: ['every monster within 399 px, each every 210 ms (its lane), unshoved (`noKb`)', B.liarSword],
    plant: PLANT === 'reach' ? (room) => { room.PVE_MELEE_RANGE = 800; } : null },
  { id: 'bowlabel', what: 'a sword\'s claim labelled a bow\'s (TRAPS §329)', judge: '`slot: \'ranged\'` with a bow worn takes the bow\'s reach (1,490 px, hitproof.js) and five claims a second, and never lowers the guard',
    take: 'kills', world: COMBAT,
    honest: [['the honest archer: in to 600 px, a shot every 495 ms, each claim when its arrow lands', B.honestBow], ['the honest sword', B.honestSword]],
    liar: ['standing, five `ranged` claims a second over everything in the bow\'s reach', B.liarBowLabel] },
  { id: 'guard', what: 'the guard beyond #1530\'s limits', judge: '`blocking` is believed with no shield worn (movement.js), and a guard sent with each swing stays up through it (moveclaims.js)',
    take: 'hurt', less: true, world: COMBAT,
    honest: [['the honest sword, its guard down while it swings', B.honestSword]],
    liar: ['each swing sent with a raised guard pointed at its target, no shield', B.liarGuard] },
  { id: 'move', what: 'the move', judge: '`MOVE_BUDGET`: 500 px a second and a 3 s burst (movement.js), the sprint mark (sprint.js), and no walls on the worker',
    take: 'px', world: { tickMs: 200 },
    honest: [['the honest walker: 150 px a second, point to point', B.mover, { speed: B.WALK }]],
    liar: ['point to point at 660 px a second, every other step marked a sprint', B.mover, { speed: 660, sprintHole: true }] },
  { id: 'harvest', what: 'the harvest\'s grade', judge: 'the phone\'s `accuracy` on `node_strike` (gathering.js), believed when its swipe looks a person\'s (botfp.js); a perfect pays 2 ore',
    take: 'ore', world: { tickMs: 200, recs: () => ({ bp_bench_h: B.harvestRec() }) },
    honest: [['a phone\'s grades (45% perfect, 44% good: the bot lab\'s guess)', B.harvester, { mix: PHONE_MIX }], ['a computer holding E (never perfect)', B.harvester, { mix: { perfect: 0, good: 1 } }]],
    liar: ['every strike perfect, at the earliest the worker takes it', B.harvester, { liar: true }] },
  { id: 'cook', what: 'the cook\'s result', judge: 'the phone\'s `kind` on `cook_request` (cooking.js): no fire, no start and no gesture are asked of it, only 45 a minute and 2,400 an hour',
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
  { id: 'cookshield', what: 'the cooking shield beyond #1530\'s limits', why: 'a liar can claim `ex: \'cook\'` at its own fire with no fish (moveclaims.js _cookShieldHolds), but the shield needs 3 s with no attack and holds 120 px from where the cook began, so its take is time out of the fight: no gold, ore or experience. It can be reached in node; its bot (one that fights in bursts by a fire it lit) is not built in this PR, and is card K\'s Next, its line beside the guard\'s.' },
];

/* one bot's run: its world, its phone (on a disturbance), its take */
const blank = () => ({ kills: 0, xp: 0, ore: 0, cooked: 0, gold: 0, px: 0, points: 0, hurt: 0 });
async function runBot(c, [who, bot, opts], { d = null, ms, plant = null } = {}) {
  const w = c.world || {};
  const clock = seededClock({ seed: seedOf(SEED + c.id + '|' + who + '|' + (d ? d.id : 'gain')) }).install();
  try { return await runIn(clock, c, w, bot, opts, { d, ms, plant }); } finally { clock.restore(); }
}
async function runIn(clock, c, w, bot, opts, { d, ms, plant }) {
  const W = await B.makeWorld(clock, { tickMs: w.tickMs || 200, prep: w.prep || null, recs: w.recs ? w.recs() : {}, plant });
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
const valueOf = (c, take) => (c.take === 'gold+xp+kills' ? take.gold + take.xp + take.kills : take[c.take]);
const perHour = (c, v, ms) => (c.whole ? v : ms > 0 ? (v * 3600000) / ms : 0);

const t0 = performance.now();
const rows = [];
for (const c of CLAIMS) {
  const ms = (c.minutes || GAIN_MIN) * B.MIN;
  const hon = [];
  for (const h of c.honest) { const r = await runBot(c, h, { ms }); hon.push({ who: h[0], v: perHour(c, valueOf(c, r.take), r.ms), refusals: r.refusals }); }
  const lr = await runBot(c, c.liar, { ms, plant: c.plant || null });
  const liar = { who: c.liar[0], v: perHour(c, valueOf(c, lr.take), lr.ms) };
  const best = c.less ? hon.reduce((a, b) => (b.v < a.v ? b : a)) : hon.reduce((a, b) => (b.v > a.v ? b : a));
  let gain;
  if (c.less) gain = best.v / Math.max(liar.v, 1);
  else if (best.v === 0 && liar.v === 0) gain = 1;
  else gain = liar.v / Math.max(best.v, 1e-9);
  rows.push({ c, hon, liar, best, gain: Math.round(gain * 100) / 100 });
}

/* the honest bots on every disturbance (each claim's first honest bot, and a
   second where it plays another way) */
const dist = [];
for (const c of GAINS_ONLY ? [] : CLAIMS) {
  for (const h of c.honest) {
    if (h[1] === B.honestSword && c.id !== 'reach') continue;   /* the same bot as the reach's: run once */
    for (const d of DISTURBANCES) {
      const r = await runBot(c, h, { d, ms: DIST_S * 1000 });
      dist.push({ claim: c.id, who: h[0], d: d.id, refusals: r.refusals });
    }
  }
}
const secs = ((performance.now() - t0) / 1000).toFixed(1);

/* ══════════ THE CHECKS ══════════ */
check(`1: every claim of step 4.2 has its number (${CLAIMS.length}) or its why (${UNREACHED.length})`, CLAIMS.length + UNREACHED.length === 11);
const refused = dist.filter((x) => x.refusals.length);
check(`2: the honest bots meet no refusal on any disturbance (${dist.length} runs, ${DISTURBANCES.length} disturbances)`, refused.length === 0,
  refused.map((x) => x.claim + ' / ' + x.d + ': ' + x.refusals[0] + (x.refusals.length > 1 ? ' (+' + (x.refusals.length - 1) + ')' : '')));
const gainRuns = rows.flatMap((r) => r.hon.filter((h) => h.refusals.length).map((h) => r.c.id + ': ' + h.refusals[0]));
check('2: ...nor on the gain runs', gainRuns.length === 0, gainRuns);
for (const r of rows) {
  const line = LINES[r.c.id];
  check(`3: ${r.c.id}: its gain ${r.gain} is within its line ${line} and its spread ${SPREAD[r.c.id]} (${r.gain <= BAR ? 'under' : 'over'} the bar ${BAR})`, r.gain <= line + SPREAD[r.c.id] + 1e-9, { honest: Math.round(r.best.v), liar: Math.round(r.liar.v) });
  if (r.gain < line - SPREAD[r.c.id] - 0.005) console.log(`NOTE ${r.c.id}'s gain fell to ${r.gain} (line ${line}): lower its line in this suite, and the census with --write`);
}
console.log(`     ${rows.length} claims measured, ${dist.length} disturbance runs, in ${secs} s`);

/* ══════════ THE CENSUS ══════════ */
if (WRITE) {
  const n0 = (v) => Math.round(v).toLocaleString('en-US');
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  const takeWord = { kills: 'kills an hour', hurt: 'damage taken an hour', px: 'px of ground an hour', ore: 'ore an hour', cooked: 'fish cooked an hour', gold: 'gold (the run\'s whole take)', 'gold+xp+kills': 'gold, experience and kills' };
  const L = [
    '# The claims\' gains (card K PR 6, v2.3.5186)',
    '',
    'Made by `node test/claims-gain.test.mjs --write` (from `server/`). Grand',
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
    `On main 82fb78d, seeded, ${GAIN_MIN} simulated minutes a run (the cook's an hour).`,
    '',
    '## The gains',
    '',
    '| Claim | The judge | The take | Honest | Liar | Gain | Its spread | Over 1.5 |',
    '|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${esc(r.c.what)} (\`${r.c.id}\`) | ${esc(r.c.judge)} | ${takeWord[r.c.take]} | ${n0(r.best.v)} (${esc(r.best.who)}) | ${n0(r.liar.v)} (${esc(r.liar.who)}) | **${r.gain}** | ${SPREAD[r.c.id]} | ${r.gain > BAR ? 'yes' : 'no'} |`),
    '',
    'The spread is the gain\'s highest less its lowest over five other seeds (`CLAIMS_SEED=a` to `e`, `--gains`): the suite fails a gain past its line by more than it.',
    '',
    '### The other honest ways',
    '',
    ...rows.filter((r) => r.hon.length > 1).flatMap((r) => r.hon.filter((h) => h !== r.best).map((h) => `- \`${r.c.id}\`: ${esc(h.who)}: ${n0(h.v)}; the liar over it: **${(r.c.less ? h.v / Math.max(r.liar.v, 1) : r.liar.v / Math.max(h.v, 1e-9)).toFixed(2)}**.`)),
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
    '- **The guard\'s liar raises its guard with every swing**; one that times each raise to a blow\'s wind-up (a parry: free, 10 stamina back, the monster staggered) is not built, so the guard\'s gain is a floor.',
    '- **An honest archer stands still while an arrow flies.** One that steps closer between two shots can land both on one monster inside its 210 ms lane, and the worker drops the second (`combat.js` `_handleMonsterDamage`): today\'s rule refusing honest play, written under Found in card K\'s status, not a claim\'s gain.',
    '- **The Wheel\'s far monsters** are left out of the fights\' rooms (claimbots.mjs `nearField`): they never meet a bot.',
    '',
  ];
  writeFileSync(CENSUS, L.join('\n'));
  console.log('     wrote docs/plan/census/claims.md');
}
for (const r of rows) console.log(`     ${r.c.id.padEnd(9)} honest ${Math.round(r.best.v)}  liar ${Math.round(r.liar.v)}  gain ${r.gain}`);
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
