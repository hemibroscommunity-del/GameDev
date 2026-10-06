/* Pet trapping -- v2.3.3120 (server/src/trapping.js, server/src/petbook.js).
 * Plan: docs/PET-TRAPPING-PLAN.md.  Spec: docs/specs/trapping.md.
 *
 * The owner, 2026-10-06: "your trapping level governs what level monster you
 * can capture.  Catching a pet is a rare activity with very little success
 * rate.  The best success rate for the lowest tier monster should be about
 * 1%.  And each trap should cost at least 1 wood to make."  And: "leave the
 * odds exactly the same for everyone".
 *
 *   1. CAPS: trapping, trapcraft and petbook advertised; pets_state at join.
 *   2. A FIRST CONNECT brings no pets and no Trapping level from the browser.
 *   3. MAKING TRAPS: one log each, any log; the count clamped to 1-50 and to
 *      the logs held; a forged log ('__proto__', 'constructor', ore) refused
 *      and costing nothing; a little Woodworking XP; the switch.
 *   4. THE ARM: every refusal costs nothing and marks nothing -- no monster,
 *      '__proto__', another zone (a dungeon's included), the safe ground, too
 *      far, a level above yours (equal allowed, one above refused), no trap,
 *      a full collection, the hour's catch cap, too fast, the switch.
 *   5. THE ROLL: at a kill by the armer; at a kill landed by someone else;
 *      the 5% rule at its edge; one trap a roll, caught or not; the mark run
 *      out keeps the trap; the kill's own payouts unchanged.
 *   6. A CATCH: the pet is the monster's kind, at its level, written to
 *      pets:<pid> at once, out with you if it is your first; the catch XP.
 *   7. THE SLIME'S DEFERRED DEATH: judged at the killing blow, not the blast.
 *   8. THE ODDS: the table at every stretch; unchanged after a long run of
 *      misses; four checks at the fourth root (the shakes' split, stubbed and
 *      sampled); nothing else moves them.
 *   9. XP: every roll pays, deeper pays more, far below pays less; a broken
 *      Trapping shape never throws.
 *  10. THE PETS PAGE: set active (and put away), name (an emoji, too long,
 *      empty refused), release (only with confirm); '__proto__' as an id;
 *      the rate limit; the switch leaves pets where they are.
 *  11. OLD PETS MOVE IN ONCE, from the STORED blob, as legacy, capped at the
 *      Trapping level; an old basic_trap is a box trap.
 *  12. A NEWER RECORD (a rollback) is left whole and touched by nothing.
 *  13. A miss counted in memory is written on disconnect; a character restart
 *      deletes the record; a respawn clears the marks.
 *  14. The retired pet_capture touches nothing; forged server events are not
 *      relayed.
 *  15. The test kit's lever.
 *  16. v2.3.3121 PET XP: a tenth of each kill's combat XP to the pet out with
 *      you, the fraction kept, never past the owner's Trapping level (nothing
 *      builds up there), told on combat_credit, written on a level-up, at most
 *      once a minute otherwise and on disconnect; no pet or the switch, none.
 *  17. v2.3.3121 BEASTMASTER BRO'S QUESTS: traps made (only once accepted, a
 *      request of many counting each), traps SPRUNG (an arm alone is nothing),
 *      the Trapping level at the hand-in, a catch; gold and box traps, no XP
 *      choice; an unknown objective type never paid; '__proto__' as a quest.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';
import { RPG_SCHEMA_VERSION } from '../src/migrations.js';
import {
  TRAPPING, trapChance, trapStretch, trapBestChance, trapShakes, trapRollXp, trapCatchXp, trapXpBase,
} from '../src/trapping.js';
import { PETBOOK, PET_KINDS, petKindOf, cleanPetName, normalizePetbook } from '../src/petbook.js';

/* ── a movable clock ── */
const realNow = Date.now;
let clock = realNow();
Date.now = () => clock;
const tick = (ms) => { clock += ms; };

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);
const last = (ws, type) => { const r = msgsOfType(ws, type); return r.length ? r[r.length - 1].payload : null; };

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, data) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: Object.assign({ x: 0, y: 0, z: 'town' }, data || {}) }));
}
const send = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));

const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
/* the first stretch's monsters of a land, held at level 1 for the tests */
const firstStretch = (home) => wheel.filter((m) => m.home === home && !m.tier).map((m) => { m.level = 1; return m; });
function standBy(ps, m, dx = 60) { ps.z = WHEEL_ZONE; ps.x = m.x + dx; ps.y = m.y; ps.dead = false; ps.dying = false; ps.disconnected = false; }
function revive(m) {
  m.alive = true; m.hp = m.maxHp; m.respawnAt = 0;
  m._burstDone = false; m._burstUntil = 0; m._burstKiller = null; m._armedBy = null; m._trapJudgeAt = 0;
  m.dmgByPlayer = Object.create(null);
}
/* A kill, as the damage paths make one: the contributions, then the kill. */
function kill(m, contribs, killerId) {
  m.dmgByPlayer = Object.create(null);
  for (const [pid, d] of Object.entries(contribs)) m.dmgByPlayer[pid] = d;
  m.hp = 0;
  room._resolveMonsterKill(WHEEL_ZONE, m, killerId, room.playerState[killerId], 'melee');
}
/* The trap's own dice (trapping.js `_trapRng`): the kill path rolls loot,
   shards and drops with Math.random first, so stubbing that would be eaten. */
function setRandom(seq) {
  let i = 0;
  room._trapRng = () => (i < seq.length ? seq[i++] : 0.999999);
}
const clearRandom = () => { room._trapRng = null; };

// ── 1. CAPS + pets_state at join ─────────────────────────────────────────────
const wsA = fakeWs('A');
await join(wsA, 'bp_trap_a', {
  /* 2. a forged first connect: Trapping 99 and a pet list */
  rpgLifeSkills: { trapping: { level: 99, xp: 0 }, pets: [{ archetype: 'brute', element: 'flame', level: 100 }], activePet: 0 },
});
const A = room.playerState['bp_trap_a'];
{
  const sync = wsA.sent.find((m) => m.type === 'state_sync');
  check('caps: trapping, trapcraft and petbook advertised',
    sync && sync.caps && sync.caps.trapping === true && sync.caps.trapcraft === true && sync.caps.petbook === true, sync && sync.caps);
  const ps0 = last(wsA, 'pets_state');
  const iSync = wsA.sent.findIndex((m) => m.type === 'state_sync');
  const iPets = wsA.sent.findIndex((m) => m.type === 'pets_state');
  check('join: pets_state sent after state_sync, an empty collection of 30', ps0 && Array.isArray(ps0.list) && ps0.list.length === 0
    && ps0.cap === PETBOOK.CAP && ps0.active === null && iPets > iSync, { ps0, iSync, iPets });
  // ── 2. ──
  check('first connect: the browser\'s Trapping 99 is level 1', A.lifeSkills.trapping && A.lifeSkills.trapping.level === 1, A.lifeSkills.trapping);
  check('first connect: the browser\'s pets moved into nothing', !(A.lifeSkills.pets && A.lifeSkills.pets.length) && room._petbookOf('bp_trap_a').rec.list.length === 0,
    { pets: A.lifeSkills.pets, list: room._petbookOf('bp_trap_a').rec.list });
}

// ── 3. MAKING TRAPS ───────────────────────────────────────────────────────────
{
  A.inventory = { wood_pine_log: 3, wood_maple_wood: 60, ore_copper_ore: 9 };
  A.lifeSkills.woodworking = { level: 1, xp: 0 };
  const snap = () => JSON.stringify(A.inventory) + '|' + A.lifeSkills.woodworking.xp;
  const before = snap();
  for (const log of ['__proto__', 'constructor', 'ore_copper_ore', 'toString', '']) {
    await send(wsA, 'make_traps', { log, count: 5 });
    check(`make_traps: a forged log ${JSON.stringify(log)} is refused and costs nothing`, last(wsA, 'make_traps_result').error === 'bad-log' && snap() === before, last(wsA, 'make_traps_result'));
  }
  await send(wsA, 'make_traps', { log: 'wood_softwood', count: 2 });
  check('make_traps: a log you hold none of: no-logs, nothing taken', last(wsA, 'make_traps_result').error === 'no-logs' && snap() === before);
  await send(wsA, 'make_traps', { log: 'wood_pine_log', count: 99 });
  let r = last(wsA, 'make_traps_result');
  check('make_traps: 99 asked, 3 logs held -> 3 traps, the logs gone', r.made === 3 && !A.inventory.wood_pine_log && A.inventory.trap_box === 3, { r, inv: A.inventory });
  check('make_traps: a little Woodworking XP a trap', r.xp === 3 * TRAPPING.MAKE_XP && A.lifeSkills.woodworking.xp === 3 * TRAPPING.MAKE_XP, { r, ww: A.lifeSkills.woodworking });
  await send(wsA, 'make_traps', { log: 'wood_maple_wood', count: 500 });
  r = last(wsA, 'make_traps_result');
  check('make_traps: at most 50 a press, from any log', r.made === TRAPPING.MAX_PER_REQUEST && A.inventory.wood_maple_wood === 10 && A.inventory.trap_box === 53, { r, inv: A.inventory });
  await send(wsA, 'make_traps', { log: 'wood_maple_wood', count: -4 });
  r = last(wsA, 'make_traps_result');
  check('make_traps: a count under 1 is 1', r.made === 1 && A.inventory.wood_maple_wood === 9 && A.inventory.trap_box === 54, { r, inv: A.inventory });
  room._liveFlags = { trapcraft: false };
  const b2 = snap();
  await send(wsA, 'make_traps', { log: 'wood_maple_wood', count: 2 });
  check('make_traps: `trapcraft: false` refuses, nothing taken', last(wsA, 'make_traps_result').error === 'off' && snap() === b2);
  room._liveFlags = {};
  A.inventory.trap_box = 5;
}

// ── 4. THE ARM: refusals cost nothing ────────────────────────────────────────
const gob = firstStretch('ember')[0];
check('setup: a level-1 Flame Fields monster to trap', !!gob && gob.level === 1, gob && { id: gob.id, level: gob.level });
{
  const lastArm = () => last(wsA, 'trap_armed');
  const arm = (id) => send(wsA, 'trap_arm', { monsterId: id });
  const traps = () => A.inventory.trap_box;
  const refusedClean = (name, code, extra) => {
    const p = lastArm();
    check(`arm: ${name} -> '${code}', no trap spent, nothing marked`, p && p.error === code && traps() === 5
      && !(gob._armedBy instanceof Map && gob._armedBy.size) && (!extra || extra(p)), p);
  };
  standBy(A, gob);
  A.lifeSkills.trapping = { level: 1, xp: 0 };
  await arm('wm-nobody-1'); refusedClean('no such monster', 'no-monster');
  await arm('__proto__'); refusedClean('\'__proto__\' as a monster id', 'no-monster');
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'trap_arm', payload: { monsterId: { toString: 1 } } }));
  refusedClean('an object as a monster id', 'no-monster');
  A.z = 'meadow';
  await arm(gob.id); refusedClean('in another zone', 'not-here');
  A.z = 'dungeon:abc';
  await arm(gob.id); refusedClean('in a dungeon', 'not-here');
  standBy(A, gob);
  const [mx, my] = [gob.x, gob.y];
  A.x = WHEEL_CENTRE[0]; A.y = WHEEL_CENTRE[1];
  gob.x = WHEEL_CENTRE[0] + 40; gob.y = WHEEL_CENTRE[1];
  await arm(gob.id); refusedClean('both on the safe ground', 'safe-ground');
  gob.x = mx; gob.y = my;
  await arm(gob.id); refusedClean('you on the safe ground', 'safe-ground');
  standBy(A, gob, TRAPPING.ARM_RANGE + 30);
  await arm(gob.id); refusedClean('too far', 'too-far');
  standBy(A, gob);
  gob.level = 2;
  await arm(gob.id); refusedClean('a monster one level above your Trapping', 'level', (p) => p.need === 2 && p.have === 1);
  gob.level = 1;
  const savedTraps = A.inventory.trap_box;
  delete A.inventory.trap_box;
  await arm(gob.id);
  check('arm: no trap in the bag -> \'no-trap\'', lastArm().error === 'no-trap' && !(gob._armedBy instanceof Map && gob._armedBy.size));
  A.inventory.trap_box = savedTraps;
  const book = room._petbookOf('bp_trap_a');
  const realList = book.rec.list;
  book.rec.list = new Array(PETBOOK.CAP).fill(0).map((_, i) => ({ id: 'p_full' + String(i).padStart(4, '0') }));
  await arm(gob.id); refusedClean('a full collection', 'pets-full', (p) => p.cap === PETBOOK.CAP);
  book.rec.list = realList;
  const rt = room._trapRt('bp_trap_a');
  rt.catches = new Array(TRAPPING.CATCH_PER_HOUR).fill(clock - 1000);
  await arm(gob.id); refusedClean('the hour\'s catch cap', 'catch-cap');
  rt.catches = [clock - 3600001];   /* an hour and a bit ago: gone */
  room._liveFlags = { trapping: false };
  await arm(gob.id); refusedClean('`trapping: false`', 'off');
  room._liveFlags = {};
  gob.hp = 0;
  await arm(gob.id); refusedClean('a monster at 0 hp (swelling, dying)', 'no-monster');
  gob.hp = gob.maxHp;

  // the boundary: equal is allowed
  await arm(gob.id);
  const ok = lastArm();
  check('arm: a monster AT your Trapping level is allowed, and the button\'s odds are the table\'s',
    ok && !ok.error && ok.monsterId === gob.id && ok.ms === TRAPPING.MARK_MS && ok.chance === trapChance(1, 1) && ok.traps === 5
      && gob._armedBy instanceof Map && gob._armedBy.get('bp_trap_a') === clock + TRAPPING.MARK_MS, ok);
  check('arm: arming spends nothing', traps() === 5);
  check('arm: the old catch times past the hour were dropped', rt.catches.length === 0, rt.catches);

  // too fast: ARMS_PER_MIN in a minute, then refused
  rt.arms = [];
  for (let i = 0; i < TRAPPING.ARMS_PER_MIN; i++) await arm(gob.id);
  await arm(gob.id);
  check(`arm: the ${TRAPPING.ARMS_PER_MIN + 1}th arm in a minute -> 'too-fast'`, lastArm().error === 'too-fast', lastArm());
  rt.arms = [];

  // one armed monster at a time: arming another MOVES the mark
  const gob2 = firstStretch('ember')[1];
  standBy(A, gob2);
  await arm(gob2.id);
  check('arm: arming a second monster moves your one mark to it',
    gob2._armedBy && gob2._armedBy.has('bp_trap_a') && !gob._armedBy.has('bp_trap_a') && rt.mark && rt.mark.monsterId === gob2.id,
    { g1: gob._armedBy && [...gob._armedBy.keys()], g2: gob2._armedBy && [...gob2._armedBy.keys()] });
  gob2._armedBy = null; rt.mark = null;
}

// ── 5 + 6. THE ROLL AND A CATCH ───────────────────────────────────────────────
const wsB = fakeWs('B');
await join(wsB, 'bp_trap_b');
const B = room.playerState['bp_trap_b'];
{
  standBy(A, gob); standBy(B, gob, -60);
  A.lifeSkills.trapping = { level: 1, xp: 0 };
  A.inventory.trap_box = 5;

  // control: an unarmed kill's payouts
  revive(gob);
  wsA.sent.length = 0;
  room.eventBuffer.length = 0;
  kill(gob, { bp_trap_a: 60, bp_trap_b: 40 }, 'bp_trap_a');
  const ctrlXp = last(wsA, 'combat_credit');
  const ctrlLoot = room.eventBuffer.filter((e) => e.type === 'loot_drop').length;
  check('control: an unarmed kill rolls nothing and spends nothing', !last(wsA, 'trap_result') && A.inventory.trap_box === 5);

  // the armer kills it; a forced miss
  revive(gob);
  await send(wsA, 'trap_arm', { monsterId: gob.id });
  wsA.sent.length = 0;
  room.eventBuffer.length = 0;
  setRandom([0.5]);   /* the first check fails: 0 shakes */
  const xpBefore = A.lifeSkills.trapping.xp;
  kill(gob, { bp_trap_a: 60, bp_trap_b: 40 }, 'bp_trap_a');
  clearRandom();
  let res = last(wsA, 'trap_result');
  check('roll: the armer\'s kill springs the trap -- one trap used, a miss, 0 shakes',
    res && res.sprung === true && res.caught === false && res.shakes === 0 && A.inventory.trap_box === 4, res);
  check('roll: a miss pays the roll\'s Trapping XP', res.xp === trapRollXp(1, 0) && A.lifeSkills.trapping.xp === xpBefore + trapRollXp(1, 0),
    { res, xp: A.lifeSkills.trapping });
  check('roll: and counts the try', res.tries === 1 && room._petbookOf('bp_trap_a').rec.journal['gobling.1'].tries === 1, res);
  const armedXp = last(wsA, 'combat_credit');
  check('roll: the kill\'s own payouts are unchanged (XP to the armer, the loot pile)',
    armedXp && ctrlXp && armedXp.xpAmt === ctrlXp.xpAmt && room.eventBuffer.filter((e) => e.type === 'loot_drop').length === ctrlLoot
      && room.eventBuffer.some((e) => e.type === 'monster_kill' && e.payload.monsterId === gob.id),
    { armedXp, ctrlXp });
  check('roll: the mark is gone with the kill', gob._armedBy === null && !room._trapRt('bp_trap_a').mark);

  // a kill landed by SOMEONE ELSE, the armer having done >= 5%
  revive(gob);
  await send(wsA, 'trap_arm', { monsterId: gob.id });
  wsA.sent.length = 0; wsB.sent.length = 0;
  setRandom([0, 0, 0.5]);   /* two checks pass, the third fails: 2 shakes */
  kill(gob, { bp_trap_a: 5, bp_trap_b: 95 }, 'bp_trap_b');
  clearRandom();
  res = last(wsA, 'trap_result');
  check('roll: a kill landed by someone else still rolls for the armer (5% exactly), 2 shakes',
    res && res.sprung && !res.caught && res.shakes === 2 && A.inventory.trap_box === 3, res);
  check('roll: ...and the killer, who armed nothing, is told nothing', !last(wsB, 'trap_result'));

  // under 5%: no roll, the trap kept
  revive(gob);
  await send(wsA, 'trap_arm', { monsterId: gob.id });
  wsA.sent.length = 0;
  kill(gob, { bp_trap_a: 4.9, bp_trap_b: 95.1 }, 'bp_trap_b');
  res = last(wsA, 'trap_result');
  check('roll: under 5% of the damage, no roll and the trap kept', res && res.sprung === false && res.why === 'share' && A.inventory.trap_box === 3, res);

  // killed before you hit it at all
  revive(gob);
  await send(wsA, 'trap_arm', { monsterId: gob.id });
  wsA.sent.length = 0;
  kill(gob, { bp_trap_b: 100 }, 'bp_trap_b');
  res = last(wsA, 'trap_result');
  check('roll: killed before you hit it: you keep your trap', res && res.sprung === false && res.why === 'share' && A.inventory.trap_box === 3, res);

  // the mark runs out first
  revive(gob);
  await send(wsA, 'trap_arm', { monsterId: gob.id });
  tick(TRAPPING.MARK_MS + 1);
  wsA.sent.length = 0;
  kill(gob, { bp_trap_a: 100 }, 'bp_trap_a');
  check('roll: a mark that ran out before the kill rolls nothing and keeps the trap', !last(wsA, 'trap_result') && A.inventory.trap_box === 3);

  // a forced CATCH
  revive(gob);
  await send(wsA, 'trap_arm', { monsterId: gob.id });
  wsA.sent.length = 0;
  setRandom([0, 0, 0, 0]);
  const xp0 = A.lifeSkills.trapping.xp, lvl0 = A.lifeSkills.trapping.level;
  kill(gob, { bp_trap_a: 100 }, 'bp_trap_a');
  clearRandom();
  res = last(wsA, 'trap_result');
  const book = room._petbookOf('bp_trap_a').rec;
  const pet = res && res.pet;
  check('catch: four checks passed -> caught, three shakes then the snap', res && res.caught === true && res.shakes === 3 && A.inventory.trap_box === 2, res);
  check('catch: the pet is the monster\'s kind, at its level, with a server id',
    pet && pet.kind === 'gobling' && pet.look === 'fireGoblin' && pet.home === 'ember' && pet.stage === 1 && pet.lv === 1
      && /^p_[a-z0-9]+$/.test(pet.id) && pet.caughtBy === 'bp_trap_a' && pet.owners === 1 && pet.tradeAfter === clock + PETBOOK.TRADE_HOLD_MS, pet);
  check('catch: it is in the record and out with you (your first)', book.list.length === 1 && book.list[0].id === pet.id && book.active === pet.id);
  const stored = state._store.get('pets:bp_trap_a');
  check('catch: written to pets:<pid> at once', stored && stored.list && stored.list.some((p) => p.id === pet.id) && stored.active === pet.id, stored);
  check('catch: the journal counts the try and the catch', book.journal['gobling.1'].tries === 3 && book.journal['gobling.1'].n === 1, book.journal);
  const wantXp = trapRollXp(1, 0) + trapCatchXp(1);
  check('catch: the roll\'s XP plus the catch\'s', res.xp === wantXp && (A.lifeSkills.trapping.level > lvl0 || A.lifeSkills.trapping.xp === xp0 + wantXp), { res, sk: A.lifeSkills.trapping });
  check('catch: pets_state follows with the new pet', (last(wsA, 'pets_state') || {}).list && last(wsA, 'pets_state').list.some((p) => p.id === pet.id));
  check('catch: counted toward the hour\'s cap', room._trapRt('bp_trap_a').catches.length === 1);
}

// ── 7. THE SLIME'S DEFERRED DEATH ────────────────────────────────────────────
{
  const slime = firstStretch('verdant')[0];
  check('setup: a level-1 Verdant blue slime, which bursts on death', !!slime && room._burstsOnDeath(slime), slime && slime.variant);
  revive(slime);
  standBy(A, slime, 200);   /* outside the blast */
  A.inventory.trap_box = 2;
  await send(wsA, 'trap_arm', { monsterId: slime.id });
  tick(TRAPPING.MARK_MS - 100);   /* the blow lands 0.1 s before the mark would run out */
  wsA.sent.length = 0;
  kill(slime, { bp_trap_a: 100 }, 'bp_trap_a');
  check('slime: the kill is deferred by the swell -- no roll yet', slime.alive === true && slime._burstUntil > 0 && !last(wsA, 'trap_result'));
  tick(2000);   /* the swell ends 1.9 s after the mark would have */
  setRandom([0.9]);
  room._resolveSlimeBurst(WHEEL_ZONE, slime, clock);
  clearRandom();
  const res = last(wsA, 'trap_result');
  check('slime: the blast rolls the trap -- judged at the killing blow, not the blast', res && res.sprung === true && A.inventory.trap_box === 1, res);
  revive(slime);
}

// ── 8. THE ODDS ───────────────────────────────────────────────────────────────
{
  const close = (a, b) => Math.abs(a - b) < 1e-12;
  const plan = [1, 0.8, 0.64, 0.512, 0.4096, 0.32768, 0.262144, 0.2097152].map((p) => p / 100);
  for (let s = 1; s <= 8; s++) {
    const M = 1 + 5 * (s - 1);
    check(`odds: stretch ${s} (levels ${M}-${M + 4}): best ${(plan[s - 1] * 100).toFixed(2)}% at +20, half on unlocking`,
      close(trapBestChance(s), plan[s - 1]) && close(trapChance(M + 20, M), plan[s - 1]) && close(trapChance(M, M), plan[s - 1] / 2)
        && close(trapChance(M + 4 + 20, M + 4), plan[s - 1]) && trapStretch(M) === s && trapStretch(M + 4) === s,
      { s, best: trapBestChance(s), at20: trapChance(M + 20, M), at0: trapChance(M, M) });
  }
  check('odds: rises evenly -- 10 levels above is three quarters of the best', close(trapChance(11, 1), 0.0075));
  check('odds: never above the best, however far above', close(trapChance(999, 1), 0.01));
  check('odds: one level above your Trapping is 0', trapChance(5, 6) === 0 && trapChance(1, 2) === 0);
  check('odds: nothing but the two levels goes in (the table is pure)', trapChance('7', '3') === trapChance(7, 3) && trapChance(7.9, 3.2) === trapChance(7, 3));

  // unchanged after a long run of misses
  const gob = firstStretch('ember')[2];
  standBy(A, gob);
  A.inventory.trap_box = 200;
  A.lifeSkills.trapping = { level: 1, xp: 0 };
  room._trapRt('bp_trap_a').arms = [];
  revive(gob);
  await send(wsA, 'trap_arm', { monsterId: gob.id });
  const first = last(wsA, 'trap_armed').chance;
  for (let i = 0; i < 60; i++) {
    room._trapRt('bp_trap_a').arms = [];
    revive(gob);
    await send(wsA, 'trap_arm', { monsterId: gob.id });
    room._trapRng = () => 0.999;
    kill(gob, { bp_trap_a: 100 }, 'bp_trap_a');
    clearRandom();
    A.lifeSkills.trapping = { level: 1, xp: 0 };   /* hold the level still: only luck may vary */
  }
  revive(gob);
  room._trapRt('bp_trap_a').arms = [];
  await send(wsA, 'trap_arm', { monsterId: gob.id });
  const after = last(wsA, 'trap_armed').chance;
  check('odds: after 60 misses in a row the chance is exactly what it was', after === first && first === trapChance(1, 1), { first, after });
  gob._armedBy = null; room._trapRt('bp_trap_a').mark = null;

  // the shakes
  const seq = [0.1, 0.2, 0.5]; let si = 0;
  check('shakes: two checks pass, the third fails -> 2 shakes', JSON.stringify(trapShakes(0.01, () => seq[si++])) === '{"caught":false,"shakes":2}');
  check('shakes: a chance of 0 never catches', trapShakes(0, () => 0).caught === false);
  /* a seeded sample: P(catch) is the chance, and the near misses are Pokémon's split */
  let seed = 12345;
  const rng = () => { seed = (seed + 0x6D2B79F5) | 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const N = 400000;
  const counts = [0, 0, 0, 0]; let caught = 0;
  for (let i = 0; i < N; i++) { const r = trapShakes(0.01, rng); if (r.caught) caught++; else counts[r.shakes]++; }
  const b = Math.pow(0.01, 0.25);
  check(`shakes: 400,000 rolls at 1% catch ~1% (${(caught / N * 100).toFixed(3)}%)`, Math.abs(caught / N - 0.01) < 0.0007);
  check(`shakes: ~68% break at once, ~22% one shake, ~7% two, ~2% three (${counts.map((c) => (c / N * 100).toFixed(1)).join('/')})`,
    Math.abs(counts[0] / N - (1 - b)) < 0.004 && Math.abs(counts[1] / N - b * (1 - b)) < 0.004
      && Math.abs(counts[2] / N - b * b * (1 - b)) < 0.003 && Math.abs(counts[3] / N - b * b * b * (1 - b)) < 0.002, counts);
}

// ── 9. XP ─────────────────────────────────────────────────────────────────────
{
  check('xp: a roll pays a tree of its stretch (163, 350, 538 ...)', trapXpBase(1) === 163 && trapXpBase(2) === 350 && trapXpBase(3) === 538);
  check('xp: full up to 20 levels above, then less, never under a quarter',
    trapRollXp(1, 20) === 163 && trapRollXp(1, 21) < 163 && trapRollXp(1, 30) === Math.round(163 * 0.7) && trapRollXp(1, 999) === Math.round(163 * 0.25));
  check('xp: a catch pays ten rolls more', trapCatchXp(4) === trapXpBase(4) * 10);
  // a broken Trapping shape never throws
  const gob = firstStretch('ember')[3];
  revive(gob); standBy(A, gob);
  A.inventory.trap_box = 3;
  A.lifeSkills.trapping = 7;   /* a number, as old browser payloads stored it */
  room._trapRt('bp_trap_a').arms = [];
  await send(wsA, 'trap_arm', { monsterId: gob.id });
  wsA.sent.length = 0;
  room._trapRng = () => 0.999;
  let threw = null;
  try { kill(gob, { bp_trap_a: 100 }, 'bp_trap_a'); } catch (e) { threw = String(e); }
  clearRandom();
  const res = last(wsA, 'trap_result');
  check('xp: a Trapping skill stored as a number reads as level 1 and the roll still pays', !threw && res && res.sprung
    && A.lifeSkills.trapping && typeof A.lifeSkills.trapping === 'object' && A.lifeSkills.trapping.xp === trapRollXp(1, 0), { threw, res, sk: A.lifeSkills.trapping });
}

// ── 10. THE PETS PAGE ──────────────────────────────────────────────────────────
{
  const rec = () => room._petbookOf('bp_trap_a').rec;
  const pid = rec().list[0].id;
  const lastPets = () => last(wsA, 'pets_state');
  await send(wsA, 'pet_active', { id: null });
  check('pets: {id: null} puts your pet away', rec().active === null && lastPets().op === 'active' && lastPets().active === null);
  await send(wsA, 'pet_active', { id: pid });
  check('pets: set active', rec().active === pid && state._store.get('pets:bp_trap_a').active === pid);
  await send(wsA, 'pet_active', { id: '__proto__' });
  check('pets: \'__proto__\' as a pet id is no pet', lastPets().error === 'no-pet' && rec().active === pid);
  await send(wsA, 'pet_name', { id: pid, name: '  Sir   Sparks ' });
  check('pets: a name, spaces collapsed and trimmed', rec().list[0].name === 'Sir Sparks' && lastPets().list[0].name === 'Sir Sparks');
  for (const bad of ['🔥Blaze', 'x', 'A name far too long!!', '', '   ', '--', 'Zap‍', 42, null]) {
    await send(wsA, 'pet_name', { id: pid, name: bad });
    check(`pets: the name ${JSON.stringify(bad)} is refused`, lastPets().error === 'bad-name' && rec().list[0].name === 'Sir Sparks', lastPets());
  }
  check('pets: letters of any alphabet are letters', cleanPetName('Zoë') === 'Zoë' && cleanPetName("O'Neil-2") === "O'Neil-2" && cleanPetName('ポチ') === 'ポチ');
  await send(wsA, 'pet_release', { id: pid });
  check('pets: release without confirm is a no-op', lastPets().error === 'confirm' && rec().list.length === 1);
  room._liveFlags = { petbook: false };
  await send(wsA, 'pet_release', { id: pid, confirm: true });
  check('pets: `petbook: false` stops the page -- the pet stays', lastPets().error === 'off' && rec().list.length === 1 && rec().active === pid);
  check('pets: ...and an active pet still counts for the loot vacuum', !!room._petbookActive('bp_trap_a'));
  room._liveFlags = {};
  await send(wsA, 'pet_release', { id: pid, confirm: true });
  check('pets: release with confirm -- gone for good, nothing out with you', rec().list.length === 0 && rec().active === null
    && state._store.get('pets:bp_trap_a').list.length === 0);
  room._petbookOf('bp_trap_a').acts = [];
  for (let i = 0; i < PETBOOK.ACTIONS_PER_MIN; i++) await send(wsA, 'pet_active', { id: null });
  await send(wsA, 'pet_active', { id: null });
  check(`pets: the ${PETBOOK.ACTIONS_PER_MIN + 1}th action in a minute -> 'too-fast'`, lastPets().error === 'too-fast', lastPets());
  room._petbookOf('bp_trap_a').acts = [];
}

// ── 11. OLD PETS MOVE IN ONCE ─────────────────────────────────────────────────
{
  state._store.set('rpg:bp_trap_old', {
    _v: RPG_SCHEMA_VERSION, coins: 10, level: 3, xp: 0,
    inventory: { basic_trap: 3, trap_box: 1 },
    lifeSkills: {
      trapping: { level: 5, xp: 0 },
      pets: [
        { id: 'pet-1', archetype: 'fodder', element: 'flame', name: 'Nibbles', level: 50, captured_at: clock - 86400000 },
        { id: 'pet-2', archetype: 'brute', element: 'venom', name: '🔥', level: 2 },
        { id: 'pet-3', archetype: 'fodder', element: null, name: 'Gloop', level: 9 },
      ],
      activePet: 1,
    },
  });
  const wsO = fakeWs('old');
  await join(wsO, 'bp_trap_old');
  const O = room.playerState['bp_trap_old'];
  const rec = room._petbookOf('bp_trap_old').rec;
  check('old pets: all three moved in, each a legacy pet of its likely kind',
    rec.list.length === 3 && rec.list.every((p) => p.legacy === true && /^p_/.test(p.id))
      && rec.list[0].kind === 'gobling' && rec.list[1].kind === 'lurkling' && rec.list[2].kind === 'dewdrop', rec.list);
  check('old pets: levels capped at the Trapping level (5)', rec.list[0].lv === 5 && rec.list[1].lv === 2 && rec.list[2].lv === 5, rec.list.map((p) => p.lv));
  check('old pets: names kept when they pass the rule, an emoji name dropped', rec.list[0].name === 'Nibbles' && rec.list[1].name === null && rec.list[2].name === 'Gloop');
  check('old pets: the one that was out is still out', rec.active === rec.list[1].id);
  check('old pets: the old fields are empty now', Array.isArray(O.lifeSkills.pets) && O.lifeSkills.pets.length === 0 && O.lifeSkills.activePet === null);
  check('old pets: the record is stamped moved and written', rec.moved === true && state._store.get('pets:bp_trap_old') && state._store.get('pets:bp_trap_old').moved === true);
  check('old traps: three basic_traps are three more box traps', O.inventory.trap_box === 4 && !('basic_trap' in O.inventory), O.inventory);
  // a rejoin does not move them twice, even if the blob still carried them
  room._saveRpg('bp_trap_old', O);
  const blob = state._store.get('rpg:bp_trap_old');
  blob.lifeSkills.pets = [{ archetype: 'snowman', element: 'frost', level: 1 }];
  await room.webSocketClose(wsO);
  const wsO2 = fakeWs('old2');
  await join(wsO2, 'bp_trap_old');
  check('old pets: moved ONCE -- a rejoin adds nothing', room._petbookOf('bp_trap_old').rec.list.length === 3, room._petbookOf('bp_trap_old').rec.list.length);
  room._resetCharacterData('bp_trap_old');
}

// ── 12. A NEWER RECORD IS LEFT WHOLE ────────────────────────────────────────────
{
  const newer = { v: PETBOOK.V + 1, cap: 50, list: [{ id: 'p_future1', kind: 'gryphon' }], active: 'p_future1', moved: true, extra: 'x' };
  state._store.set('pets:bp_trap_new', newer);
  const wsN = fakeWs('new');
  await join(wsN, 'bp_trap_new');
  const N = room.playerState['bp_trap_new'];
  const g = firstStretch('frost')[0];
  revive(g); standBy(N, g);
  N.inventory = { trap_box: 3 };
  await send(wsN, 'trap_arm', { monsterId: g.id });
  check('newer record: arming refused \'pets-unavailable\'', last(wsN, 'trap_armed').error === 'pets-unavailable');
  await send(wsN, 'pet_active', { id: 'p_future1' });
  await send(wsN, 'pet_release', { id: 'p_future1', confirm: true });
  check('newer record: the page is refused and the stored record is untouched',
    last(wsN, 'pets_state').unavailable === true && state._store.get('pets:bp_trap_new') === newer && JSON.stringify(newer.list) === '[{"id":"p_future1","kind":"gryphon"}]');
  check('newer record: normalizePetbook says locked', normalizePetbook(newer).locked === true);
}

// ── 13. DISCONNECT, RESTART, RESPAWN ───────────────────────────────────────────
{
  const wsC = fakeWs('C');
  await join(wsC, 'bp_trap_c');
  const C = room.playerState['bp_trap_c'];
  const g = firstStretch('frost')[1];
  revive(g); standBy(C, g);
  C.inventory = { trap_box: 3 };
  await send(wsC, 'trap_arm', { monsterId: g.id });
  tick(1000);
  room._trapRng = () => 0.999;
  kill(g, { bp_trap_c: 100 }, 'bp_trap_c');
  clearRandom();
  const inStore = () => { const s = state._store.get('pets:bp_trap_c'); return s && s.journal && s.journal['snowling.1'] ? s.journal['snowling.1'].tries : 0; };
  /* the record was written at join (moved), so a miss within SAVE_MS of it stays in memory */
  check('miss: counted in memory, not written per kill', room._petbookOf('bp_trap_c').rec.journal['snowling.1'].tries === 1 && inStore() === 0, inStore());
  await room.webSocketClose(wsC);
  check('miss: written on disconnect', inStore() === 1 && !room._petbookOf('bp_trap_c'), inStore());

  // a respawn clears the marks
  const g2 = firstStretch('frost')[2];
  revive(g2);
  standBy(A, g2);
  A.inventory.trap_box = 3;
  A.lifeSkills.trapping = { level: 1, xp: 0 };
  room._trapRt('bp_trap_a').arms = [];
  await send(wsA, 'trap_arm', { monsterId: g2.id });
  check('respawn: setup -- armed', g2._armedBy instanceof Map && g2._armedBy.has('bp_trap_a'));
  g2.alive = false; g2.respawnAt = clock - 1;
  room._tickMonsters();
  check('respawn: a respawned monster carries no marks', g2.alive === true && g2._armedBy === null, { alive: g2.alive, armed: g2._armedBy });

  // a character restart deletes the record
  await room._resetCharacterData('bp_trap_a');
  check('restart: pets:<pid> deleted and the cache dropped', !state._store.has('pets:bp_trap_a') && !room._petbookOf('bp_trap_a') && !(room._trapRuntime && room._trapRuntime.has('bp_trap_a')));
}

// ── 14. THE RETIRED CAPTURE, AND FORGED EVENTS ─────────────────────────────────
{
  const wsD = fakeWs('D');
  await join(wsD, 'bp_trap_d');
  const D = room.playerState['bp_trap_d'];
  const g = firstStretch('sky')[0];
  revive(g); standBy(D, g); g.hp = 1;
  D.inventory = { basic_trap: 2, trap_box: 2 };
  await send(wsD, 'pet_capture', { monsterId: g.id });
  check('pet_capture: retired -- nothing spent, the monster lives', (last(wsD, 'pet_capture_result') || {}).error === 'retired'
    && D.inventory.trap_box === 2 && D.inventory.basic_trap === 2 && g.alive === true);
  room.eventBuffer.length = 0;
  for (const t of ['trap_result', 'trap_armed', 'pets_state', 'make_traps_result']) {
    await room.webSocketMessage(wsD, JSON.stringify({ type: t, payload: { caught: true, pet: { name: 'Hax' }, list: [{ id: 'p_hax000' }] } }));
  }
  check('forged: none of the four server events is relayed', room.eventBuffer.filter((e) => ['trap_result', 'trap_armed', 'pets_state', 'make_traps_result'].includes(e.type)).length === 0,
    room.eventBuffer.map((e) => e.type));
  check('kinds: every land\'s monsters become a kind', wheel.every((m) => !!petKindOf(m)) && new Set(wheel.map((m) => petKindOf(m))).size === Object.keys(PET_KINDS).length,
    [...new Set(wheel.map((m) => petKindOf(m)))]);
  check('kinds: a monster with no land becomes nothing', petKindOf({ arch: 'fodder' }) === null && petKindOf({ home: '__proto__' }) === null);
}

// ── 15. THE TEST KIT'S LEVER (devtools.js /dev/trapping) ─────────────────────
{
  const wsE = fakeWs('E');
  await join(wsE, 'bp_trap_e');
  const E = room.playerState['bp_trap_e'];
  const g = firstStretch('thunder')[0];
  revive(g); standBy(E, g);
  const r1 = room._devTrapping('bp_trap_e', { level: 7, traps: 4, logs: 9, next: 'catch' });
  check('dev: sets Trapping, traps and logs', r1.ok && E.lifeSkills.trapping.level === 7 && E.inventory.trap_box === 4 && E.inventory.wood_pine_log === 9, r1);
  await send(wsE, 'trap_arm', { monsterId: g.id });
  wsE.sent.length = 0;
  const r2 = room._devTrapping('bp_trap_e', { kill: g.id });
  const res = last(wsE, 'trap_result');
  check('dev: `next: catch` + `kill` -- the real kill path springs the trap and it catches',
    r2.ok && r2.killed === g.id && res && res.caught === true && res.pet && res.pet.kind === 'sparklet' && E.inventory.trap_box === 3, { r2, res });
  check('dev: the forced roll is spent (one roll only)', !(room._trapForced && room._trapForced.has('bp_trap_e')));
  check('dev: a dead or foreign monster id is refused', room._devTrapping('bp_trap_e', { kill: g.id }).ok === false
    && room._devTrapping('bp_trap_e', { kill: '__proto__' }).ok === false);
}

// ── 16. PET XP (v2.3.3121, Phase 2) ─────────────────────────────────────────────
{
  const wsF = fakeWs('F');
  await join(wsF, 'bp_trap_f');
  const F = room.playerState['bp_trap_f'];
  const book = room._petbookOf('bp_trap_f');
  const sync = wsF.sent.find((m) => m.type === 'state_sync');
  check('pet XP: caps.petlevels and caps.beastmaster advertised', sync && sync.caps.petlevels === true && sync.caps.beastmaster === true, sync && sync.caps);
  /* a pet to raise: the test kit's lever catches one */
  const g = firstStretch('frost')[0];
  revive(g); standBy(F, g);
  room._devTrapping('bp_trap_f', { level: 10, traps: 2, next: 'catch' });
  await send(wsF, 'trap_arm', { monsterId: g.id });
  room._devTrapping('bp_trap_f', { kill: g.id });
  const pet = book.rec.list[0];
  check('pet XP: setup -- a Lv 1 pet out with a Trapping 10 owner', !!pet && book.rec.active === pet.id && pet.lv === 1 && pet.xp === 0, pet);

  let petPuts = 0;
  const realPut = state.storage.put;
  state.storage.put = async (k, v) => { if (k === 'pets:bp_trap_f') petPuts++; return realPut(k, v); };
  const foe = firstStretch('frost')[3];
  const fight = (xp, contribs) => {
    revive(foe); standBy(F, foe); foe.xp = xp;
    wsF.sent.length = 0;
    kill(foe, contribs || { bp_trap_f: 100 }, 'bp_trap_f');
    return last(wsF, 'combat_credit');
  };
  tick(1000);
  const c1 = fight(100);
  check('pet XP: a kill pays the pet out with you a tenth of its combat XP (100 -> 10)', pet.xp === 10 && pet.lv === 1, { lv: pet.lv, xp: pet.xp });
  check('pet XP: ...told on that kill\'s combat_credit', c1 && c1.xpAmt === 100 && c1.pet && c1.pet.id === pet.id && c1.pet.xp === 10 && c1.pet.gain === 10
    && c1.pet.leveled === 0 && c1.pet.cap === 10, c1);
  check('pet XP: ...kept in memory, never written per kill', petPuts === 0 && book.dirty === true, { petPuts, dirty: book.dirty });
  fight(100);
  const c3 = fight(100);
  check('pet XP: 25 for Lv 2 -- 30 XP is Lv 2 with 5 over', pet.lv === 2 && pet.xp === 5 && c3.pet.leveled === 1 && c3.pet.lv === 2, { lv: pet.lv, xp: pet.xp, c3: c3.pet });
  check('pet XP: a level-up is written at once', petPuts === 1 && state._store.get('pets:bp_trap_f').list[0].lv === 2, petPuts);

  /* the cap: never past the owner's Trapping level, and nothing builds up there */
  F.lifeSkills.trapping = { level: 2, xp: 0 };
  const c4 = fight(500);
  check('pet XP: at its owner\'s Trapping level it earns nothing, and holds no XP', pet.lv === 2 && pet.xp === 5 && !('pet' in c4), { lv: pet.lv, xp: pet.xp, c4 });
  F.lifeSkills.trapping = { level: 3, xp: 0 };
  const c5 = fight(10000);
  check('pet XP: a big kill levels it only to the cap, its XP 0 there', pet.lv === 3 && pet.xp === 0 && c5.pet.leveled === 1 && c5.pet.cap === 3, { lv: pet.lv, xp: pet.xp, c5: c5.pet });

  /* a share: the part under 1 XP is kept for the next kill */
  F.lifeSkills.trapping = { level: 30, xp: 0 };
  book.xpFrac = 0;
  const x0 = pet.xp;
  fight(15);
  const x1 = pet.xp;
  fight(15);
  check('pet XP: 1.5 a kill is 1, then 2 (the half kept)', x1 - x0 === 1 && pet.xp - x0 === 3, { x0, x1, x2: pet.xp });
  const share = fight(40, { bp_trap_f: 25, bp_trap_zz: 75 });
  check('pet XP: a party share pays the pet a tenth of the SHARE', share && share.xpAmt === 10 && share.pet && share.pet.gain === 1, share);

  /* no pet out, or the switch: nothing */
  const keepActive = book.rec.active;
  book.rec.active = null;
  const xa = pet.xp;
  const c6 = fight(100);
  check('pet XP: no pet out with you -- nothing, and combat_credit as it always was', pet.xp === xa && c6 && !('pet' in c6), c6);
  book.rec.active = keepActive;
  room._liveFlags = { petlevels: false };
  const c7 = fight(100);
  check('pet XP: `petlevels: false` -- no pet earns anything', pet.xp === xa && !('pet' in c7));
  const sync2 = (() => { const w = fakeWs('F2'); return w; })();
  room._liveFlags = {};

  /* written at most once a minute, and on disconnect */
  const before = petPuts;
  tick(PETBOOK.SAVE_MS + 1000);
  fight(20);
  check('pet XP: a minute on, the next kill writes the record once', petPuts === before + 1 && state._store.get('pets:bp_trap_f').list[0].xp === pet.xp, { petPuts, before });
  fight(20);
  check('pet XP: ...and the kill after does not', petPuts === before + 1);
  const xpLeft = pet.xp;
  await room.webSocketClose(wsF);
  check('pet XP: written on disconnect', state._store.get('pets:bp_trap_f').list[0].xp === xpLeft, { stored: state._store.get('pets:bp_trap_f').list[0].xp, xpLeft });
  state.storage.put = realPut;
  void sync2;
}

// ── 17. BEASTMASTER BRO'S QUESTS (v2.3.3121, Phase 2) ─────────────────────────
{
  const wsG = fakeWs('G');
  await join(wsG, 'bp_trap_g');
  const G = room.playerState['bp_trap_g'];
  G.inventory = {};
  G._quests = Object.create(null);
  G._questKills = Object.create(null);
  const coins0 = () => G.coins || 0;

  /* traps made BEFORE the quest do not count */
  G.inventory.wood_pine_log = 2;
  await send(wsG, 'make_traps', { log: 'wood_pine_log', count: 2 });
  check('beast_1: traps made before the quest count for nothing', !(G._questKills.beast_1) && G.inventory.trap_box === 2, G._questKills);

  await send(wsG, 'quest_accept', { questId: 'beast_1' });
  check('beast_1: accepted, and its three pine logs handed over', G._quests.beast_1 === 'active' && G.inventory.wood_pine_log === 3, { q: G._quests.beast_1, inv: G.inventory });
  await send(wsG, 'quest_turn_in', { questId: 'beast_1' });
  check('beast_1: refused before three traps are made', G._quests.beast_1 === 'active');
  await send(wsG, 'make_traps', { log: 'wood_pine_log', count: 1 });
  await send(wsG, 'make_traps', { log: 'wood_pine_log', count: 2 });
  check('beast_1: one request or two, every trap counts (1 + 2 = 3)', G._questKills.beast_1 === 3, G._questKills);
  const c0 = coins0();
  const traps0 = G.inventory.trap_box;
  await send(wsG, 'quest_turn_in', { questId: 'beast_1' });
  check('beast_1: handed in -- 40 gold and 2 box traps, no Melee/Bow/Magic asked (xp 0)', G._quests.beast_1 === 'turnedIn'
    && coins0() === c0 + 40 && G.inventory.trap_box === traps0 + 2 && G._quests.beast_2 === 'available', { coins: coins0() - c0, traps: G.inventory.trap_box - traps0, q: G._quests });

  /* beast_2: SPRUNG traps, not arms */
  await send(wsG, 'quest_accept', { questId: 'beast_2' });
  G.lifeSkills.trapping = { level: 10, xp: 0 };
  G.inventory.trap_box = 20;
  const fs = firstStretch('ember');
  const mark = fs[0];
  revive(mark); standBy(G, mark);
  room._trapRt('bp_trap_g').arms = [];
  await send(wsG, 'trap_arm', { monsterId: mark.id });
  tick(TRAPPING.MARK_MS + 1000);
  revive(mark);
  kill(mark, { bp_trap_g: 100 }, 'bp_trap_g');
  check('beast_2: an arm that ran out springs nothing and counts nothing', !(G._questKills.beast_2), G._questKills);
  room._trapRng = () => 0.999;
  for (let i = 0; i < 5; i++) {
    const m = fs[i % fs.length];
    revive(m); standBy(G, m);
    room._trapRt('bp_trap_g').arms = [];
    await send(wsG, 'trap_arm', { monsterId: m.id });
    tick(500);
    kill(m, { bp_trap_g: 100 }, 'bp_trap_g');
    tick(4000);
  }
  clearRandom();
  check('beast_2: five traps sprung (all broke) are five', G._questKills.beast_2 === 5, G._questKills);
  await send(wsG, 'quest_turn_in', { questId: 'beast_2' });
  check('beast_2: handed in, beast_3 offered', G._quests.beast_2 === 'turnedIn' && G._quests.beast_3 === 'available');

  /* beast_3: the Trapping level, read at the hand-in */
  await send(wsG, 'quest_accept', { questId: 'beast_3' });
  G.lifeSkills.trapping = { level: 5, xp: 0 };
  await send(wsG, 'quest_turn_in', { questId: 'beast_3' });
  check('beast_3: refused at Trapping 5', G._quests.beast_3 === 'active');
  G.lifeSkills.trapping = { level: 6, xp: 0 };
  const t3 = G.inventory.trap_box;
  await send(wsG, 'quest_turn_in', { questId: 'beast_3' });
  check('beast_3: paid at Trapping 6 (10 box traps)', G._quests.beast_3 === 'turnedIn' && G.inventory.trap_box === t3 + 10);

  /* beast_4: a catch */
  await send(wsG, 'quest_accept', { questId: 'beast_4' });
  G.lifeSkills.trapping = { level: 10, xp: 0 };
  const m4 = fs[1];
  revive(m4); standBy(G, m4);
  room._trapRt('bp_trap_g').arms = [];
  room._trapRng = () => 0.999;
  await send(wsG, 'trap_arm', { monsterId: m4.id });
  kill(m4, { bp_trap_g: 100 }, 'bp_trap_g');
  check('beast_4: a miss is no catch', !(G._questKills.beast_4));
  await send(wsG, 'quest_turn_in', { questId: 'beast_4' });
  check('beast_4: refused before a catch', G._quests.beast_4 === 'active');
  revive(m4); standBy(G, m4);
  room._trapRt('bp_trap_g').arms = [];
  room._trapRng = () => 0;
  tick(4000);
  await send(wsG, 'trap_arm', { monsterId: m4.id });
  kill(m4, { bp_trap_g: 100 }, 'bp_trap_g');
  clearRandom();
  check('beast_4: a catch counts', G._questKills.beast_4 === 1 && room._petbookOf('bp_trap_g').rec.list.length === 1, G._questKills);
  const t4 = G.inventory.trap_box, c4 = coins0();
  await send(wsG, 'quest_turn_in', { questId: 'beast_4' });
  check('beast_4: paid -- 500 gold and 15 box traps, the line done', G._quests.beast_4 === 'turnedIn' && G.inventory.trap_box === t4 + 15 && coins0() === c4 + 500);

  /* a counter type nothing asks for counts nothing; an unknown type is never paid */
  room._creditQuestObjective('bp_trap_g', 'trap_roll');
  check('quests: a signal with no active quest of its kind writes no counter', Object.keys(G._questKills).every((k) => /^beast_[1-4]$/.test(k)), G._questKills);
  check('quests: an unknown objective type is never met (a table typo refuses, never pays)', room._questObjectiveMet(G, 'x', { type: 'visit', count: 1 }) === false
    && room._questObjectiveMet(G, 'x', null) === true);
  check('quests: `skill` reads an own property only', room._questObjectiveMet({ lifeSkills: Object.create({ trapping: { level: 99 } }) }, 'x', { type: 'skill', skill: 'trapping', level: 6 }) === false);
  G._quests['__proto__'] = 'active';
  room._creditQuestObjective('bp_trap_g', 'kill', null, null, 1e9);
  check('quests: a forged quest id in _quests is no counter, and a huge amount is clamped', !Object.prototype.hasOwnProperty.call(G._questKills, '__proto__'));
}

Date.now = realNow;
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
