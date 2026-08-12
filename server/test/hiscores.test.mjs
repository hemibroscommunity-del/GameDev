/* ═══ HISCORES — the per-skill leaderboard (v2.3.1671) ═══
 *
 * Owner: "a traditional high scores system that ranks each skill... I want
 * all of the lifeskills to be added on the high scores too."
 *
 * What this suite is really guarding is HONESTY.  Before v2.3.1671 every
 * leaderboard column except `level` was read out of `rpgData` — a blob the
 * CLIENT sends.  Any client could claim 40,000 kills, and the board would
 * print it.  The new categories read `series`, which the GameRoom computes
 * from server state (`ps.prog3`, `ps.lifeSkills`, `ps.svKills`) and which is
 * the same object the on-chain attestation signs.  So the two surfaces are
 * computed once and cannot tell different stories.
 *
 * The tests below therefore care about three things: that a new category
 * ranks correctly, that it reads the SERVER series and not the client blob,
 * and that `combat` stays the sum of its three parts rather than a fourth
 * number that could drift away from them.
 */
import { Leaderboard } from '../src/leaderboard.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(store),
      delete: async (k) => { store.delete(k); },
    },
  };
}

const mk = () => new Leaderboard(makeState(), {});

async function seed(lb, rows) {
  for (const r of rows) await lb.updatePlayer({ ts: Date.now(), ...r });
}

// ── 1. Per-skill ranking ──
{
  const lb = mk();
  await seed(lb, [
    { playerId: 'bp_a', name: 'Ann', level: 40, series: { melee: 30, bow: 5, magic: 5, fishing: 12, kills: 900 } },
    { playerId: 'bp_b', name: 'Bo', level: 30, series: { melee: 5, bow: 20, magic: 5, fishing: 70, kills: 40 } },
    { playerId: 'bp_c', name: 'Cy', level: 12, series: { melee: 4, bow: 4, magic: 4, kills: 12 } },
  ]);

  const bow = await lb.getTop('bow', 50);
  check('bow ranks by bow level, not by character level',
    bow[0].name === 'Bo' && bow[1].name === 'Ann', bow.map((p) => p.name));

  const fish = await lb.getTop('fishing', 50);
  check('a life skill gets its own board', fish[0].name === 'Bo' && fish[0].value === 70,
    fish.map((p) => [p.name, p.value]));
  check('a player with no fishing is dropped, not listed at zero',
    fish.length === 2 && !fish.some((p) => p.name === 'Cy'), fish.map((p) => p.name));

  const melee = await lb.getTop('melee', 50);
  check('melee ranks independently of bow',
    melee[0].name === 'Ann' && melee[0].value === 30, melee.map((p) => [p.name, p.value]));

  check('each row carries the value it was ranked on', bow[0].value === 20, bow[0].value);

  const capped = await lb.getTop('melee', 2);
  check('the limit is honoured', capped.length === 2, capped.length);
}

// ── 2. `combat` is DERIVED, never a fourth stored number ──
{
  const lb = mk();
  await seed(lb, [
    /* `level` here is deliberately a LIE — 999 — to prove the combat board
       does not read it.  Character level is the sum of the trained skills by
       definition (prog3), so deriving it is the only way it cannot drift
       away from the three numbers it is made of. */
    { playerId: 'bp_x', name: 'Liar', level: 999, series: { melee: 3, bow: 3, magic: 3 } },
    { playerId: 'bp_y', name: 'Real', level: 4, series: { melee: 20, bow: 10, magic: 5 } },
  ]);
  const combat = await lb.getTop('combat', 50);
  check('combat = melee + bow + magic', combat[0].name === 'Real' && combat[0].value === 35,
    combat.map((p) => [p.name, p.value]));
  check('a stored level cannot inflate the combat board',
    combat[1].name === 'Liar' && combat[1].value === 9, combat[1] && combat[1].value);
}

// ── 3. The new categories cannot be forged from the client blob ──
{
  const lb = mk();
  await seed(lb, [
    /* rpgData is the CLIENT's claim.  It reaches `kills` on the old row and
       must reach nothing on the new boards. */
    { playerId: 'bp_f', name: 'Forger', level: 1, rpgData: { kills: 999999, lifeTotal: 999999 }, series: { melee: 1 } },
    { playerId: 'bp_h', name: 'Honest', level: 9, series: { melee: 3, kills: 25 } },
  ]);
  const kills = await lb.getTop('kills', 50);
  check('kills now reads the SERVER series, not the client claim',
    kills[0].name === 'Honest' && kills[0].value === 25, kills.map((p) => [p.name, p.value]));
  check('the client-claimed 999999 kills does not appear at all',
    !kills.some((p) => p.value === 999999), kills.map((p) => p.value));
}

// ── 4. Legacy categories still work (the old desktop panel reads them) ──
{
  const lb = mk();
  await seed(lb, [
    { playerId: 'bp_1', name: 'One', level: 5, rpgData: { goldEarned: 10 } },
    { playerId: 'bp_2', name: 'Two', level: 50, rpgData: { goldEarned: 900 } },
  ]);
  const lvl = await lb.getTop('level', 50);
  check('legacy `level` category is unchanged', lvl[0].name === 'Two', lvl.map((p) => p.name));
  const gold = await lb.getTop('gold', 50);
  check('legacy `gold` category is unchanged', gold[0].name === 'Two', gold.map((p) => p.name));
  const junk = await lb.getTop('not-a-category', 50);
  check('an unknown category falls back to level rather than throwing',
    junk[0].name === 'Two', junk.map((p) => p.name));
}

// ── 5. Rows written before the series existed must not crash a new board ──
{
  const lb = mk();
  await seed(lb, [{ playerId: 'bp_old', name: 'Old', level: 20 }]);   // no `series`
  const melee = await lb.getTop('melee', 50);
  check('a pre-series row is simply absent from a skill board, not an error',
    Array.isArray(melee) && melee.length === 0, melee);
  const combat = await lb.getTop('combat', 50);
  check('a pre-series row scores 0 on the derived combat board',
    combat.length === 0, combat);
}

// ── 6. Every life skill the game tracks has a board ──
{
  const LIFE = ['woodcutting', 'fishing', 'mining', 'farming', 'cooking',
    'blacksmithing', 'woodworking', 'gemCutting', 'enchanting', 'trapping'];
  const missing = LIFE.filter((k) => !Object.prototype.hasOwnProperty.call(Leaderboard.SERIES_CATEGORIES, k));
  check('all ten life skills are rankable categories', missing.length === 0, missing);
  const combatCats = ['combat', 'melee', 'bow', 'magic', 'kills']
    .filter((k) => !Object.prototype.hasOwnProperty.call(Leaderboard.SERIES_CATEGORIES, k));
  check('combat, the three trained skills and kills are rankable', combatCats.length === 0, combatCats);
}

console.log(failures === 0 ? '\nhiscores: ALL PASS' : `\nhiscores: ${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
