/* The monster codex -- v2.3.3189 (server/src/codex.js; spec
 * docs/specs/monster-codex.md).
 *
 *   1. CAPS AND THE FIRST LOOK: caps.codex advertised; codex_state at join,
 *      empty for a new character.
 *   2. A KILL TEACHES: a Wheel monster's kill counts its kind for the killer,
 *      on the kill's own combat_credit (`cx`), and the first kill (a
 *      threshold) reaches storage at once.
 *   3. COUNTING IS COALESCED: a kill that crosses no threshold waits for the
 *      next write (SAVE_MS, or the next threshold), so a fight does not write
 *      a row a kill; the thresholds 3, 10 and 25 are written at once.
 *   4. THE KINDS: the Poison Forest's two looks apart; a party's kill teaches
 *      every player it pays; the second stage (past level 20) counted on its
 *      own and its first kill written at once; a monster with no land counts
 *      for nothing.
 *   5. DISCONNECT AND REJOIN: counting only in memory is written on close; the
 *      next join sends it back.
 *   6. LOCKED: a record a newer worker wrote is never counted into or
 *      overwritten, and neither is one whose read failed -- the phone is told
 *      `unavailable`.
 *   7. THE KILL SWITCH: `codex: false` un-advertises and stops the counting;
 *      what was learned is still sent.
 *   8. A RESTART forgets it; the dev lever sets it; normalizeCodex drops what
 *      it does not know (a `__proto__` kind included).
 *   9. THE DROP TABLE'S ODDS ARE THE ONES ROLLED: a kill's weapon drops just
 *      under data.js monsterWeaponDropOdds and not just over it, and its
 *      element on the same thresholds; the shard on SHARD_MONSTER_DROP.  (The
 *      codex page's copy of them is held by mirror-audit.)
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { CODEX, CODEX_KEY, normalizeCodex, codexCrossed } from '../src/codex.js';
import { monsterWeaponDropOdds, SHARD_MONSTER_DROP } from '../src/data.js';   /* §9 */

function makeState() {
  const store = new Map();
  let failGet = null;
  return {
    storage: {
      get: async (k) => { if (failGet && failGet(k)) throw new Error('read failed'); return store.get(k); },
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const k of [...store.keys()].filter((x) => !opts?.prefix || x.startsWith(opts.prefix)).sort()) out.set(k, store.get(k));
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
    failReads(fn) { failGet = fn; },
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);
const last = (ws, type) => { const r = msgsOfType(ws, type); return r.length ? r[r.length - 1].payload : null; };

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'C', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  return room.playerState[id];
}
const stored = (id) => state._store.get(CODEX_KEY(id));
const flush = () => new Promise((r) => setTimeout(r, 0));

const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
const ofHome = (home, pred) => wheel.find((m) => m.home === home && (!pred || pred(m)));
function standBy(ps, m) { ps.z = WHEEL_ZONE; ps.x = m.x + 60; ps.y = m.y; ps.dead = false; ps.dying = false; ps.disconnected = false; }
function revive(m) {
  m.alive = true; m.hp = m.maxHp; m.respawnAt = 0;
  m._burstDone = true; m._burstUntil = 0; m._burstKiller = null; m._armedBy = null; m._trapJudgeAt = 0;
  m.dmgByPlayer = Object.create(null);
}
/* A kill, as the damage paths make one: the contributions, then the kill.
   `_burstDone` set, so a blue slime does not swell and defer it. */
function kill(m, contribs, killerId) {
  revive(m);
  for (const [pid, d] of Object.entries(contribs)) m.dmgByPlayer[pid] = d;
  m.hp = 0;
  room._resolveMonsterKill(WHEEL_ZONE, m, killerId, room.playerState[killerId], 'melee');
}
const credit = (ws) => last(ws, 'combat_credit');

// ── 1. CAPS AND THE FIRST LOOK ───────────────────────────────────────────────
const wsA = fakeWs('A');
const A = await join(wsA, 'bp_cx_a');
{
  const sync = wsA.sent.find((m) => m.type === 'state_sync');
  check('caps: codex advertised', sync && sync.caps && sync.caps.codex === true, sync && sync.caps && sync.caps.codex);
  const cs = last(wsA, 'codex_state');
  check('codex_state at join: a new character knows nothing', !!cs && cs.v === CODEX.V && cs.k && Object.keys(cs.k).length === 0, cs);
  const order = wsA.sent.map((m) => m.type);
  check('...sent after state_sync and the pets record', order.indexOf('codex_state') > order.indexOf('state_sync') && order.indexOf('codex_state') > order.indexOf('pets_state'), order.slice(-8));
}

// ── 2. A KILL TEACHES ───────────────────────────────────────────────────────
const snow = ofHome('frost', (m) => !m.tier);
snow.level = 1;
standBy(A, snow);
kill(snow, { bp_cx_a: snow.maxHp }, 'bp_cx_a');
await flush();
{
  const c = credit(wsA);
  check('a frost monster\'s kill: combat_credit carries the codex count (snowling 1, none past 20)',
    !!c && c.cx && c.cx.k === 'snowling' && c.cx.n === 1 && c.cx.n2 === 0, c);
  const s = stored('bp_cx_a');
  check('...and the first kill (a new fact) is written at once', !!s && s.v === CODEX.V && Array.isArray(s.k.snowling) && s.k.snowling[0] === 1, s);
}

// ── 3. COUNTING IS COALESCED ────────────────────────────────────────────────
{
  standBy(A, snow);
  kill(snow, { bp_cx_a: snow.maxHp }, 'bp_cx_a');
  await flush();
  const c = credit(wsA);
  const s = stored('bp_cx_a');
  check('the second kill is counted and told (2) ...', c && c.cx && c.cx.n === 2, c);
  check('...but not written yet (no new fact, inside SAVE_MS)', s.k.snowling[0] === 1 && room._codexOf('bp_cx_a').dirty === true, { s, dirty: room._codexOf('bp_cx_a').dirty });
  kill(snow, { bp_cx_a: snow.maxHp }, 'bp_cx_a');
  await flush();
  check('the third (a threshold: its element) is written at once', stored('bp_cx_a').k.snowling[0] === 3 && room._codexOf('bp_cx_a').dirty === false, stored('bp_cx_a'));
  kill(snow, { bp_cx_a: snow.maxHp }, 'bp_cx_a');
  await flush();
  check('the fourth waits again', stored('bp_cx_a').k.snowling[0] === 3, stored('bp_cx_a'));
  room._codexOf('bp_cx_a').savedAt -= CODEX.SAVE_MS + 1;
  kill(snow, { bp_cx_a: snow.maxHp }, 'bp_cx_a');
  await flush();
  check('...and SAVE_MS after the last write, the next kill writes all of it (5)', stored('bp_cx_a').k.snowling[0] === 5, stored('bp_cx_a'));
  check('codexCrossed: 2->3, 9->10 and 24->25 are facts; 3->4 is not', codexCrossed(2, 3) && codexCrossed(9, 10) && codexCrossed(24, 25) && !codexCrossed(3, 4) && codexCrossed(0, 1));
}

// ── 4. THE KINDS ────────────────────────────────────────────────────────────
const wsB = fakeWs('B');
const B = await join(wsB, 'bp_cx_b');
{
  const wisp = ofHome('mist', (m) => !m.tier && (m.spawnVariant || m.variant) === 'mireWisp');
  const lurk = ofHome('mist', (m) => !m.tier && (m.spawnVariant || m.variant) === 'bogLurker');
  check('setup: the Poison Forest has a wisp and a lurker', !!wisp && !!lurk, { wisp: !!wisp, lurk: !!lurk });
  if (wisp && lurk) {
    standBy(A, wisp); standBy(B, wisp);
    kill(wisp, { bp_cx_a: wisp.maxHp * 0.6, bp_cx_b: wisp.maxHp * 0.4 }, 'bp_cx_a');
    await flush();
    const ca = credit(wsA), cb = credit(wsB);
    check('a party\'s kill of a wisp teaches both players it pays (wisplet 1 each)',
      ca && ca.cx && ca.cx.k === 'wisplet' && ca.cx.n === 1 && cb && cb.cx && cb.cx.k === 'wisplet' && cb.cx.n === 1, { ca: ca && ca.cx, cb: cb && cb.cx });
    standBy(A, lurk);
    kill(lurk, { bp_cx_a: lurk.maxHp }, 'bp_cx_a');
    await flush();
    const cl = credit(wsA);
    check('...and a bog lurker is its own kind (lurkling)', cl && cl.cx && cl.cx.k === 'lurkling' && cl.cx.n === 1, cl && cl.cx);
  }
  /* the second stage: a level-25 golem */
  const golem = ofHome('hollows', (m) => !m.tier);
  const lvWas = golem.level;
  golem.level = 25;
  standBy(A, golem);
  kill(golem, { bp_cx_a: golem.maxHp }, 'bp_cx_a');
  await flush();
  const cg = credit(wsA);
  check('a level-25 golem counts for its kind AND its second stage (pebbling 1, 1)', cg && cg.cx && cg.cx.k === 'pebbling' && cg.cx.n === 1 && cg.cx.n2 === 1, cg && cg.cx);
  check('...written at once (its elder form is a new fact)', stored('bp_cx_a').k.pebbling && stored('bp_cx_a').k.pebbling[1] === 1, stored('bp_cx_a'));
  golem.level = 1;
  standBy(A, golem);
  kill(golem, { bp_cx_a: golem.maxHp }, 'bp_cx_a');
  await flush();
  const cg2 = credit(wsA);
  check('a level-1 golem after it: the kind 2, the second stage still 1', cg2 && cg2.cx && cg2.cx.n === 2 && cg2.cx.n2 === 1, cg2 && cg2.cx);
  golem.level = lvWas;
  /* no land: a monster of the old zones */
  const before = JSON.stringify(room._codexOf('bp_cx_a').rec.k);
  const bit = room._codexOnKill('bp_cx_a', { id: 'x', arch: 'fodder', level: 3, home: null }, Date.now());
  check('a monster with no land teaches nothing', bit === null && JSON.stringify(room._codexOf('bp_cx_a').rec.k) === before, bit);
  const bad = room._codexOnKill('bp_cx_a', { id: 'y', arch: 'fodder', level: 3, home: '__proto__' }, Date.now());
  check('...and neither does a land named __proto__', bad === null, bad);
}

// ── 5. DISCONNECT AND REJOIN ────────────────────────────────────────────────
{
  standBy(A, snow);
  kill(snow, { bp_cx_a: snow.maxHp }, 'bp_cx_a');   /* snowling 6: no fact, only in memory */
  await flush();
  check('setup: the sixth snowman is only in memory', stored('bp_cx_a').k.snowling[0] === 5 && room._codexOf('bp_cx_a').dirty, stored('bp_cx_a'));
  await room.webSocketClose(wsA);
  check('on disconnect the counting is written (6), and the cache goes', stored('bp_cx_a').k.snowling[0] === 6 && !room._codexOf('bp_cx_a'), { s: stored('bp_cx_a'), cached: !!room._codexOf('bp_cx_a') });
  const wsA2 = fakeWs('A2');
  await join(wsA2, 'bp_cx_a');
  const cs = last(wsA2, 'codex_state');
  check('the next join sends it back: snowling 6, wisplet 1, lurkling 1, pebbling 2 (1 past 20)',
    cs && cs.k && cs.k.snowling[0] === 6 && cs.k.wisplet[0] === 1 && cs.k.lurkling[0] === 1 && cs.k.pebbling[0] === 2 && cs.k.pebbling[1] === 1, cs);
}

// ── 6. LOCKED ───────────────────────────────────────────────────────────────
{
  const newer = { v: CODEX.V + 1, k: { snowling: [40, 2] }, extra: 'a field this worker never heard of' };
  state._store.set(CODEX_KEY('bp_cx_new'), JSON.parse(JSON.stringify(newer)));
  const wsN = fakeWs('N');
  const N = await join(wsN, 'bp_cx_new');
  const cs = last(wsN, 'codex_state');
  check('a newer worker\'s record: the phone is told it is unavailable', cs && cs.unavailable === true, cs);
  standBy(N, snow);
  kill(snow, { bp_cx_new: snow.maxHp }, 'bp_cx_new');
  await flush();
  const c = credit(wsN);
  check('...a kill counts nothing (no cx on its credit)', !!c && !c.cx, c);
  await room.webSocketClose(wsN);
  check('...and it is left exactly as it was, after a kill and a disconnect', JSON.stringify(state._store.get(CODEX_KEY('bp_cx_new'))) === JSON.stringify(newer), state._store.get(CODEX_KEY('bp_cx_new')));

  state._store.set(CODEX_KEY('bp_cx_fail'), { v: 1, k: { gobling: [30, 0] } });
  state.failReads((k) => k === CODEX_KEY('bp_cx_fail'));
  const wsF = fakeWs('F');
  const F = await join(wsF, 'bp_cx_fail');
  state.failReads(null);
  const csF = last(wsF, 'codex_state');
  check('a failed read: unavailable, never a fresh record', csF && csF.unavailable === true, csF);
  const gob = ofHome('ember', (m) => !m.tier);
  gob.level = 1;
  standBy(F, gob);
  kill(gob, { bp_cx_fail: gob.maxHp }, 'bp_cx_fail');
  await flush();
  await room.webSocketClose(wsF);
  const sf = state._store.get(CODEX_KEY('bp_cx_fail'));
  check('...the real record (30 goblins) is never overwritten by a count from zero', sf && sf.k && sf.k.gobling[0] === 30, sf);
}

// ── 7. THE KILL SWITCH ──────────────────────────────────────────────────────
{
  room._liveFlags = { codex: false };
  check('`codex: false` reads as off', room._codexOff() === true);
  const wsS = fakeWs('S');
  room.sessions.set(wsS, baseSession());
  await room.webSocketMessage(wsS, JSON.stringify({ type: 'join', id: 'bp_cx_a', name: 'C', phrase: 'p-bp_cx_a', protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  const sync = wsS.sent.find((m) => m.type === 'state_sync');
  check('...the join un-advertises it', sync && sync.caps && sync.caps.codex === false, sync && sync.caps && sync.caps.codex);
  const cs = last(wsS, 'codex_state');
  check('...what was learned is still sent (snowling 6)', cs && cs.k && cs.k.snowling && cs.k.snowling[0] === 6, cs);
  const S = room.playerState.bp_cx_a;
  standBy(S, snow);
  kill(snow, { bp_cx_a: snow.maxHp }, 'bp_cx_a');
  await flush();
  const c = credit(wsS);
  check('...and a kill counts nothing', !!c && !c.cx && room._codexOf('bp_cx_a').rec.k.snowling[0] === 6, { c, k: room._codexOf('bp_cx_a').rec.k });
  room._liveFlags = {};
  kill(snow, { bp_cx_a: snow.maxHp }, 'bp_cx_a');
  await flush();
  check('on again: the next kill counts (7)', credit(wsS).cx && credit(wsS).cx.n === 7, credit(wsS));
}

// ── 8. RESTART, THE DEV LEVER, NORMALIZE ────────────────────────────────────
{
  const r = room._codexDevSet('bp_cx_b', { all: true, n: 25, n2: 1 });
  check('dev lever: every kind at 25 kills, one past 20', r.ok && CODEX.KINDS.every((k) => {
    const p = room._codexOf('bp_cx_b').rec.k[k]; return p && p[0] === 25 && p[1] === 1;
  }) && stored('bp_cx_b') && stored('bp_cx_b').k.dewdrop[0] === 25, r);
  check('...and the phone is told', last(wsB, 'codex_state') && last(wsB, 'codex_state').k.dewdrop[0] === 25, last(wsB, 'codex_state'));
  const r0 = room._codexDevSet('bp_cx_b', { kind: 'gobling', n: 0 });
  check('...n 0 forgets one kind', r0.ok && !room._codexOf('bp_cx_b').rec.k.gobling, room._codexOf('bp_cx_b').rec.k);
  const rx = room._codexDevSet('bp_cx_b', { kind: 'dragon', n: 5 });
  check('...an unknown kind is refused', rx.ok === false, rx);

  await room._resetCharacterData('bp_cx_b');
  check('a character restart deletes the record and its cache', !stored('bp_cx_b') && !room._codexOf('bp_cx_b'), { s: stored('bp_cx_b') });

  const raw = JSON.parse('{"v":1,"k":{"snowling":[12,40],"gobling":["7","x"],"dragon":[9,9],"__proto__":[5,5],"mumling":[-3,0],"pebbling":[1e12,2]}}');
  const n = normalizeCodex(raw);
  check('normalizeCodex: second-stage kills never more than the kind\'s', n.rec.k.snowling[0] === 12 && n.rec.k.snowling[1] === 12, n.rec.k);
  check('...numbers read as numbers, a bad one as none', n.rec.k.gobling[0] === 7 && n.rec.k.gobling[1] === 0, n.rec.k.gobling);
  check('...unknown kinds, __proto__ and negatives dropped', !('dragon' in n.rec.k) && !Object.prototype.hasOwnProperty.call(n.rec.k, '__proto__') && !('mumling' in n.rec.k), Object.keys(n.rec.k));
  check('...and a count clamped to MAX', n.rec.k.pebbling[0] === CODEX.MAX, n.rec.k.pebbling);
  check('normalizeCodex: nothing stored is an empty record, not locked', normalizeCodex(undefined).locked === false && Object.keys(normalizeCodex(undefined).rec.k).length === 0);
  check('CODEX: the nine kinds are the pets\' nine, and the thresholds rise', CODEX.KINDS.length === 9 && CODEX.TIERS.every((t, i) => i === 0 || t > CODEX.TIERS[i - 1]), { kinds: CODEX.KINDS, tiers: CODEX.TIERS });
}

// ── 9. THE DROP TABLE'S ODDS ARE THE ONES ROLLED ────────────────────────────
{
  /* Math.random answered from a list, so a roll can be put exactly on either
     side of its line: the drop check, the element roll, the weapon type, its
     grade -- the order _rollWeaponDropForKill asks in */
  const realRandom = Math.random;
  const rolls = (list) => { let i = 0; Math.random = () => (i < list.length ? list[i++] : 0.5); };
  try {
    const m = { level: 40, home: 'frost' };
    const o = monsterWeaponDropOdds(40);
    const eps = 1e-9;
    rolls([o.drop - eps, 0.9, 0.1, 0.5]);
    const w = room._rollWeaponDropForKill('frost', m);
    rolls([o.drop + eps]);
    const none = room._rollWeaponDropForKill('frost', m);
    check(`a Lv 40 kill's weapon drops just under the codex's chance (${(o.drop * 100).toFixed(3)}%) and not just over it`, !!w && none === null, { w, none });
    rolls([0, o.shift + o.fusion + o.elemental - eps, 0.1, 0.5]);
    const el = room._rollWeaponDropForKill('frost', m);
    rolls([0, o.shift + o.fusion + o.elemental + eps, 0.1, 0.5]);
    const plain = room._rollWeaponDropForKill('frost', m);
    check('...and it is of its land\'s element just under the codex\'s element chance, plain just over it',
      el && el.tier === 'elemental' && el.element1 === 'frost' && plain && plain.tier === 'common', { el, plain });
    const o1 = monsterWeaponDropOdds(1);
    rolls([o1.drop - eps, 0.9, 0.1, 0.5]);
    const w1 = room._rollWeaponDropForKill('frost', { level: 1 });
    rolls([o1.drop + eps]);
    check('...and at Lv 1 on its own line too (1 in 2,000)', !!w1 && room._rollWeaponDropForKill('frost', { level: 1 }) === null && Math.abs(1 / o1.drop - 2000) < 1);
    rolls([SHARD_MONSTER_DROP - eps]);
    const sh = room._rollShardForKill('frost');
    rolls([SHARD_MONSTER_DROP + eps]);
    check('a kill\'s shard drops on the codex\'s 1 in 10, of its land', sh === 'shard_frost' && room._rollShardForKill('frost') === null && SHARD_MONSTER_DROP === 0.10, { sh });
  } finally {
    Math.random = realRandom;
  }
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CODEX CHECKS PASSED');
process.exit(failures ? 1 : 0);
