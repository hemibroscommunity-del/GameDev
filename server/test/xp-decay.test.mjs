/* XP FADES FOR WHAT IS WELL BELOW YOU (v2.3.3251) — the rule, and the fight.
 *
 * Owner, 2026-10-14: "Yes adjust the xp.  Also make xp decay if you're trying
 * to harvest lower level things.  This also applies to combat.  Xp should
 * begin decaying starting at 5 levels below your current level.  It should
 * always be most efficient to harvest or fight things within your current
 * level."
 *
 * server/src/xpdecay.js: up to 4 levels below you, full XP; 5 below, a third;
 * 15% less for each level past that.  The harvest half (the tier XP, a
 * strike's pay, the rule held over the dice at every level) is gather-hits
 * §13.  This suite:
 *   1. the rule itself: every gap, the owner's "starting at 5 levels below",
 *      junk levels, the bound, the whole-number helper;
 *   2. a SWING: trained XP per credited damage against monsters at, above,
 *      4 below, 5 below and 10 below the sword's level, through the real
 *      monster_damage handler;
 *   3. the yardstick is the TRAINED SKILL that earns the XP, never the
 *      character level (the sum of three);
 *   4. the other four damage sources that pay trained XP, each monster faded
 *      by its own level: the lunge, the staff's splash, the Element Burst and
 *      the arrow blast;
 *   5. what never fades: a quest's flat XP;
 *   6. the kill switch, its cap and its name.
 */
import { GameRoom } from '../src/index.js';
import { XP_DECAY, xpDecayMult, xpAfterDecay } from '../src/xpdecay.js';
import { PROG3 } from '../src/prog3.js';
import { LUNGE } from '../src/abilities.js';
import { ARROW_BLAST } from '../src/arrowblast.js';
import { LIVEOPS } from '../src/liveops.js';

function makeState(liveflags) {
  const store = new Map();
  if (liveflags) store.set('liveflags', liveflags);
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
  };
}
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
const third = 1 / 3;

/* A joined fighter in the meadow with the trained levels asked for, and the
   zone's monsters replaced by the ones each case places. */
async function setup(liveflags, levels) {
  const room = new GameRoom(makeState(liveflags), env);
  const ws = fakeWs('f');
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id: 'bp_xd', name: 'Fader', phrase: 'p-xd', protocolVersion: 2,
    data: { x: 500, y: 500, z: 'meadow' },
  }));
  const ps = room.playerState.bp_xd;
  ps.z = 'meadow'; ps.x = 500; ps.y = 500;
  for (const [cat, lvl] of Object.entries(levels || {})) { ps.prog3.sk[cat].level = lvl; ps.prog3.sk[cat].xp = 0; }
  room._prog3Recompute(ps);
  ps.hp = ps.maxHp;
  const session = room.sessions.get(ws);
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  return { room, ws, ps, session, caps: sync && sync.caps };
}
/* Monsters with a level each, standing where asked: hp big enough that
   nothing dies (no overkill clamp to muddy the per-damage rate). */
function place(room, spots) {
  room.monsters.meadow = spots.map((s, i) => ({
    id: 'xd' + i, x: s.x, y: s.y, spawnX: s.x, spawnY: s.y, hp: 100000, maxHp: 100000, alive: true,
    archetype: 'slime', type: 'slime', level: s.level, dmgByPlayer: null, statuses: {}, atkCd: Date.now() + 1e9,
  }));
  return room.monsters.meadow;
}
const xpOf = (ps, cat) => ps.prog3.sk[cat].xp + 1e6 * ps.prog3.sk[cat].level;   /* a level-up still reads as a gain */

// ── 1. the rule ──
{
  let fullOk = true, fadeOk = true, downOk = true;
  for (let L = 1; L <= 100; L++) {
    for (let g = -60; g <= 4; g++) if (xpDecayMult(L, L - g) !== 1) fullOk = false;
    let prev = 1;
    for (let g = 5; g <= 95; g++) {
      const m = xpDecayMult(L + g, L);
      if (!near(m, third * Math.pow(0.85, g - 5))) fadeOk = false;
      if (!(m < prev && m > 0)) downOk = false;
      prev = m;
    }
  }
  check('rule: full XP for anything up to 4 levels below you, at your level, or above you', fullOk);
  check('rule: 5 below is a third, then 15% less for each level past it (gaps 5-95, levels 1-100)', fadeOk);
  check('rule: ...always falling and never zero', downOk);
  check('rule: the owner\'s "begin decaying starting at 5 levels below": 4 below full, 5 below not',
    xpDecayMult(10, 6) === 1 && xpDecayMult(10, 5) === third, [xpDecayMult(10, 6), xpDecayMult(10, 5)]);
  const pct = [5, 6, 7, 8, 9, 10, 15, 20].map((g) => +(100 * xpDecayMult(20 + g, 20)).toFixed(1));
  check('rule: the printed table -- 33.3, 28.3, 24.1, 20.5, 17.4, 14.8, 6.6, 2.9 %',
    JSON.stringify(pct) === JSON.stringify([33.3, 28.3, 24.1, 20.5, 17.4, 14.8, 6.6, 2.9]), pct);
  check('rule: the constants (FULL_GAP 4, START 1/3, STEP 0.85)',
    XP_DECAY.FULL_GAP === 4 && XP_DECAY.START === third && XP_DECAY.STEP === 0.85, XP_DECAY);
  const junk = [
    xpDecayMult(null, 1) === 1, xpDecayMult(30, undefined) === 1, xpDecayMult(NaN, 1) === 1, xpDecayMult(30, 'x') === 1,
    xpDecayMult(Infinity, 1) === 1, xpDecayMult(30, -Infinity) === 1, xpDecayMult('12', '7') === third,
    xpDecayMult(12.9, 7.2) === third, xpDecayMult(12, 7.9) === third,
  ];
  check('rule: a missing or junk level is full XP; levels read as whole numbers', junk.every(Boolean), junk);
  const far = xpDecayMult(1e9, 1);
  check('rule: a gap past GAP_MAX reads as GAP_MAX (bounded work, still above zero)',
    far === xpDecayMult(1 + XP_DECAY.GAP_MAX, 1) && far > 0, far);
  const whole = [
    xpAfterDecay(163, 1) === 163, xpAfterDecay(163, third) === 54, xpAfterDecay(978, third * 0.85) === 277,
    xpAfterDecay(1, 0.01) === 1, xpAfterDecay(2608, 0.0287) === 75, xpAfterDecay(10.5, 1) === 10.5,
  ];
  check('rule: a harvest\'s award is rounded and never below 1; a full one untouched', whole.every(Boolean), whole);
}

// ── 2. a swing ──
{
  const { room, ps, session } = await setup(null, { sword: 12 });
  const levels = [12, 30, 8, 7, 2, undefined];
  const mons = place(room, levels.map((level) => ({ x: ps.x, y: ps.y, level })));
  const rate = {};
  for (const m of mons) {
    ps._monHitCad = new Map();
    const hp0 = m.hp, xp0 = xpOf(ps, 'sword');
    room._handleMonsterDamage(session, { monsterId: m.id, zone: 'meadow', slot: 'melee' });
    const dmg = hp0 - m.hp;
    rate[String(m.level)] = dmg > 0 ? (xpOf(ps, 'sword') - xp0) / dmg : null;
  }
  const per = PROG3.XP_PER_DMG;
  check('swing: every hit landed (guard)', Object.values(rate).every((r) => r !== null), rate);
  check('swing: a monster at your Melee level pays XP_PER_DMG a point of damage', near(rate['12'], per), rate);
  check('swing: ...as does one above you and one 4 below (full XP)', near(rate['30'], per) && near(rate['8'], per), rate);
  check('swing: 5 below (Lv 7 at Melee 12) pays a third', near(rate['7'], per * third), rate);
  check('swing: 10 below (Lv 2) pays a third x 0.85^5 (~15%)', near(rate['2'], per * third * Math.pow(0.85, 5)), rate);
  check('swing: a monster with no level is full XP', near(rate['undefined'], per), rate);
}

// ── 3. the yardstick: the trained skill, never the character level ──
{
  const { room, ps, session } = await setup(null, { sword: 12, bow: 40, staff: 40 });
  check('yardstick: setup -- Melee 12, Bow 40, Magic 40 is character level 92 (guard)', ps.level === 92, ps.level);
  const [m] = place(room, [{ x: ps.x, y: ps.y, level: 12 }]);
  ps._monHitCad = new Map();
  const hp0 = m.hp, xp0 = xpOf(ps, 'sword');
  room._handleMonsterDamage(session, { monsterId: m.id, zone: 'meadow', slot: 'melee' });
  check('yardstick: a Lv 12 monster pays a Melee-12 sword in full, character level 92 or not',
    near((xpOf(ps, 'sword') - xp0) / (hp0 - m.hp), PROG3.XP_PER_DMG), { xp: xpOf(ps, 'sword') - xp0, dmg: hp0 - m.hp });
  check('yardstick: ...and each lane fades by its own level', room._combatXpDecay(ps, 'sword', 12) === 1
    && room._combatXpDecay(ps, 'bow', 12) === xpDecayMult(40, 12) && room._combatXpDecay(ps, 'staff', 35) === third,
    [room._combatXpDecay(ps, 'sword', 12), room._combatXpDecay(ps, 'bow', 12), room._combatXpDecay(ps, 'staff', 35)]);
  const junk = [
    room._combatXpDecay(ps, '__proto__', 1) === 1, room._combatXpDecay(ps, 'axe', 1) === 1, room._combatXpDecay(ps, null, 1) === 1,
    room._combatXpDecay({}, 'sword', 1) === 1, room._combatXpDecay(null, 'sword', 1) === 1, room._combatXpDecay(ps, 'sword', null) === 1,
  ];
  check('yardstick: an unknown lane, a player with no trained skills, or a monster with no level -> full', junk.every(Boolean), junk);
}

// ── 4. the other damage sources, each monster by its own level ──
{
  /* THE LUNGE (abilities.js _abilityStrikeMonster) */
  const { room, ps } = await setup(null, { sword: 12 });
  const [lo, hi] = place(room, [{ x: ps.x, y: ps.y, level: 7 }, { x: ps.x, y: ps.y, level: 12 }]);
  const rateOn = (m) => {
    const hp0 = m.hp, xp0 = xpOf(ps, 'sword');
    room._abilityStrikeMonster('meadow', m, 'bp_xd', ps, 'lunge', LUNGE);
    return (xpOf(ps, 'sword') - xp0) / (hp0 - m.hp);
  };
  const rLo = rateOn(lo), rHi = rateOn(hi);
  check('lunge: a Lv 12 pays in full and a Lv 7 a third, at Melee 12',
    near(rHi, PROG3.XP_PER_DMG) && near(rLo, PROG3.XP_PER_DMG * third), { rLo, rHi });
}
{
  /* THE STAFF'S SPLASH (combat.js _staffSplash): two neighbours, one at your
     Magic level and one 10 below, paid as one sum of their own rates */
  const { room, ps } = await setup(null, { staff: 12 });
  const [primary, a, b] = place(room, [{ x: ps.x + 400, y: ps.y, level: 12 }, { x: ps.x + 60, y: ps.y, level: 12 }, { x: ps.x + 60, y: ps.y + 10, level: 2 }]);
  const xp0 = xpOf(ps, 'staff'), ha = a.hp, hb = b.hp;
  room._staffSplash('meadow', primary, ps.x + 60, ps.y, 'bp_xd', ps, 200);
  const da = ha - a.hp, db = hb - b.hp;
  const want = PROG3.XP_PER_DMG * (da + db * xpDecayMult(12, 2));
  check('staff splash: both neighbours hit (guard)', da > 0 && db > 0, { da, db });
  check('staff splash: Magic earns each neighbour\'s damage at its own level\'s share (Lv 12 full, Lv 2 ~15%)',
    near(xpOf(ps, 'staff') - xp0, want), { got: xpOf(ps, 'staff') - xp0, want });
}
{
  /* THE ELEMENT BURST (burst.js), from a flame sword */
  const { room, ps, session } = await setup(null, { sword: 12 });
  ps.weapon = { type: 'sword', tierMult: 1, element1: 'flame' };
  ps.activeSlot = 'melee';
  ps.mana = ps.maxMana; ps._burstCdUntil = 0;
  const [a, b] = place(room, [{ x: ps.x + 20, y: ps.y, level: 12 }, { x: ps.x - 20, y: ps.y, level: 7 }]);
  const xp0 = xpOf(ps, 'sword'), ha = a.hp, hb = b.hp;
  room._handleElementBurst(session);
  const da = ha - a.hp, db = hb - b.hp;
  check('burst: both monsters hit (guard)', da > 0 && db > 0, { da, db, rej: room.eventBuffer.filter((e) => e.type === 'element_nova').length });
  check('burst: Melee earns the Lv 12\'s damage in full and the Lv 7\'s at a third',
    near(xpOf(ps, 'sword') - xp0, PROG3.XP_PER_DMG * (da + db * third)), { got: xpOf(ps, 'sword') - xp0, da, db });
}
{
  /* THE ARROW BLAST (arrowblast.js), where it still exists: bowvolley off */
  const { room, ps, session } = await setup({ bowvolley: false }, { bow: 20 });
  ps.rangedWeapon = { name: 'Pine Bow', type: 'bow', gearBase: 'ww_pine', quality: 'normal', tierMult: 1 };
  ps.activeSlot = 'ranged';
  const bx = ps.x + 200, by = ps.y;
  const [a, b] = place(room, [{ x: bx + 30, y: by, level: 20 }, { x: bx, y: by + 30, level: 5 }]);
  const xp0 = xpOf(ps, 'bow'), ha = a.hp, hb = b.hp;
  room._handleArrowBlast(session, { zone: 'meadow', x: bx, y: by });
  const da = ha - a.hp, db = hb - b.hp;
  check('arrow blast: both monsters caught (guard)', da > 0 && db > 0, { da, db, why: room._arrowBlastRejectsFor('bp_xd') });
  check('arrow blast: Bow earns the Lv 20\'s damage in full and the Lv 5\'s (15 below) at ~6.6%',
    near(xpOf(ps, 'bow') - xp0, PROG3.XP_PER_DMG * (da + db * xpDecayMult(20, 5))), { got: xpOf(ps, 'bow') - xp0, da, db });
  check('arrow blast: radius sanity (guard)', Math.hypot(30, 0) < ARROW_BLAST.RADIUS);
}

// ── 5. what never fades ──
{
  const { room, ps } = await setup(null, { sword: 40 });
  const xp0 = ps.prog3.sk.sword.xp;
  room._prog3AwardXp('bp_xd', ps, 'sword', 100, { flat: true });
  check('flat: a quest\'s flat XP (and the dev kit\'s) is paid whole -- the fade lives at the damage sources, never in _prog3AwardXp',
    near(ps.prog3.sk.sword.xp - xp0, 100), ps.prog3.sk.sword.xp - xp0);
}

// ── 6. the kill switch, its cap and its name ──
{
  const on = await setup(null, { sword: 12 });
  check('cap: a fresh room advertises xpdecay', !!on.caps && on.caps.xpdecay === true, on.caps && on.caps.xpdecay);
  const { room, ps, session, caps } = await setup({ xpdecay: false }, { sword: 12 });
  check('kill switch: xpdecay:false un-advertises it', !!caps && caps.xpdecay === false, caps && caps.xpdecay);
  const [m] = place(room, [{ x: ps.x, y: ps.y, level: 2 }]);
  ps._monHitCad = new Map();
  const hp0 = m.hp, xp0 = xpOf(ps, 'sword');
  room._handleMonsterDamage(session, { monsterId: m.id, zone: 'meadow', slot: 'melee' });
  check('kill switch: ...and a Lv 2 pays a Melee-12 sword in full again',
    hp0 > m.hp && near((xpOf(ps, 'sword') - xp0) / (hp0 - m.hp), PROG3.XP_PER_DMG), { dmg: hp0 - m.hp, xp: xpOf(ps, 'sword') - xp0 });
  check('kill switch: its name is one the admin flags route accepts (TRAPS §117)', LIVEOPS.FLAG_NAME_RE.test('xpdecay'));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
