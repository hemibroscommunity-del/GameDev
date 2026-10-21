/* THE FREE POINTS RESET -- v2.3.3541 (docs/specs/points-reset.md).
 *
 * The owner: "I value SIMPLICITY and INTELLIGIBILITY" -- the after-review
 * list's second item: "Today, points you spend are spent for good.  After the
 * change one button gives them back, so you can try a different build."
 * (server/src/pointsreset.js):
 *
 *   1. A player with points placed by the real spend path (shared stats and
 *      two weapons' offense) resets: every placed point back, each weapon's
 *      lane and the shared pool what the levels give, the max HP its points
 *      bought gone, levels and XP untouched; saved (one row), echoed (prog3),
 *      answered points_reset_result {ok, pool, poolBy, shared}.
 *   2. The points spend again after it, by the same path.
 *   3. Refused, each answered and nothing changed or written: a blow dealt or
 *      taken in the last 10 s ('fight'), a second reset within a minute
 *      ('soon', with the wait), nothing placed ('none'); a dead player is
 *      answered nothing.
 *   4. Worn armour stays worn.
 *   5. `pointsreset: false`: answered 'off', nothing reset, and
 *      caps.pointsreset false at the next join (true otherwise);
 *      `onelevel: false`: the shared pool dealt by the old sum.
 *   6. The wire: points_reset is routed (not relayed), points_reset_result is
 *      privileged.
 *   7. The page (src/game/pointsReset.js): the button only against a worker
 *      that resets and with a point placed, the worker's count of placed
 *      points, one ask at a time, the answer in words. */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { POINTS_RESET, pointsPlaced } from '../src/pointsreset.js';
import { PROG3, prog3RespecPoints } from '../src/prog3.js';
import * as PR from '../../src/game/pointsReset.js';
import { readFileSync } from 'fs';

function makeState() {
  const store = new Map();
  let puts = 0;
  return {
    _store: store,
    _puts: () => puts,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => {
        if (typeof k === 'string' && k.startsWith('rpg:')) puts++;
        store.set(k, JSON.parse(JSON.stringify(v)));
      },
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
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const settle = () => new Promise((r) => setTimeout(r, 10));
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });

async function makeRoom(flags) {
  const state = makeState();
  const room = new GameRoom(state, mockEnv);
  if (flags) room._liveFlags = flags;
  return { room, state };
}
async function join(room, ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
  return room.sessions.get(ws);
}
async function send(room, ws, type, payload) {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  await settle();
}
const answerOf = (ws) => (ws.sent.find((m) => m.type === 'points_reset_result') || {}).payload || null;

/* a trained player, out of every fight, points dealt by the levels: Melee 6,
   Bow 3, Magic 1 (one level: level 6, 15 Melee and 6 Bow points, 15 shared) */
function trained(room, P) {
  P.dead = false; P.dying = false;
  P.lastDamageAt = 0; P._lastDealtAt = 0; P._pointsResetAt = 0;
  P.prog3.sk.sword.level = 6; P.prog3.sk.bow.level = 3; P.prog3.sk.staff.level = 1;
  prog3RespecPoints(P.prog3, false);
  room._prog3Recompute(P);
}
/* points placed through the game's own spend path */
async function place(room, ws, stat, n, cat) {
  for (let i = 0; i < n; i++) await room.webSocketMessage(ws, JSON.stringify({ type: 'prog3_allocate', payload: cat ? { stat, cat } : { stat } }));
  await settle();
}
const pools = (p3) => ({ pool: p3.pool, sword: p3.poolBy.sword, bow: p3.poolBy.bow, staff: p3.poolBy.staff, shared: p3.shared });

const { room, state } = await makeRoom();
const ws = fakeWs();
await join(room, ws, 'bp_pr_a');
const P = room.playerState.bp_pr_a;

// ── 1. a reset ──
{
  trained(room, P);
  const dealt = pools(P.prog3);
  check('1: the guard: Melee 6 / Bow 3 / Magic 1 is level 6, dealt 15 Melee, 6 Bow, 0 Magic and 15 shared points',
    P.level === 6 && dealt.sword === 15 && dealt.bow === 6 && dealt.staff === 0 && dealt.shared === 15 && dealt.pool === 21, { level: P.level, dealt });
  const hp0 = P.maxHp;
  await place(room, ws, 'hp', 3);
  await place(room, ws, 'def', 2);
  await place(room, ws, 'luck', 4, 'sword');
  await place(room, ws, 'aspd', 1, 'bow');
  check('1: ...ten points placed by the real spend path (3 Max HP, 2 Defense, 4 Melee Luck, 1 Bow Speed), the max HP they bought on the bar',
    pointsPlaced(P.prog3) === 10 && P.prog3.alloc.hp === 3 && P.prog3.alloc.def === 2 && P.prog3.atk.sword.luck === 4 && P.prog3.atk.bow.aspd === 1
      && P.prog3.shared === 10 && P.prog3.poolBy.sword === 11 && P.prog3.poolBy.bow === 5 && P.maxHp > hp0,
    { placed: pointsPlaced(P.prog3), pools: pools(P.prog3), hp0, hp: P.maxHp });
  const xp0 = { sword: P.prog3.sk.sword.xp, bow: P.prog3.sk.bow.xp };
  const puts0 = state._puts();
  await send(room, ws, 'points_reset', {});
  const a = answerOf(ws);
  check('1: a reset gives every placed point back: nothing placed, each lane and the shared pool what the levels give',
    pointsPlaced(P.prog3) === 0 && JSON.stringify(pools(P.prog3)) === JSON.stringify(dealt), pools(P.prog3));
  check('1: ...the max HP the points bought gone, levels and XP untouched',
    P.maxHp === hp0 && P.level === 6 && P.prog3.sk.sword.level === 6 && P.prog3.sk.bow.level === 3
      && P.prog3.sk.sword.xp === xp0.sword && P.prog3.sk.bow.xp === xp0.bow, { hp: P.maxHp, hp0 });
  check('1: ...answered points_reset_result {ok, pool, poolBy, shared}',
    !!a && a.ok === true && a.pool === dealt.pool && a.poolBy.sword === 15 && a.poolBy.bow === 6 && a.shared === 15, a);
  const echo = ws.sent.find((m) => m.type === 'player_state');
  check('1: ...the new points echoed (player_state prog3)',
    !!echo && !!echo.payload.prog3 && echo.payload.prog3.shared === 15 && echo.payload.prog3.alloc.hp === 0, echo && echo.payload.prog3 && echo.payload.prog3.alloc);
  const saved = state._store.get('rpg:bp_pr_a');
  check('1: ...saved, one row, and the in-memory clock never saved',
    state._puts() - puts0 === 1 && !!saved && saved.prog3 && saved.prog3.alloc.hp === 0 && !('_pointsResetAt' in saved), { puts: state._puts() - puts0 });
}

// ── 2. the points spend again ──
{
  await place(room, ws, 'dodge', 2);
  await place(room, ws, 'dmg', 3, 'sword');
  check('2: the points spend again after it, by the same path',
    P.prog3.alloc.dodge === 2 && P.prog3.atk.sword.dmg === 3 && P.prog3.shared === 13 && P.prog3.poolBy.sword === 12, pools(P.prog3));
}

// ── 3. refused ──
{
  const before = JSON.stringify(P.prog3);
  const puts0 = state._puts();
  await send(room, ws, 'points_reset', {});
  const a = answerOf(ws);
  check('3: a second reset within the minute is refused, with the wait, nothing changed or written',
    !!a && a.ok === false && a.err === 'soon' && a.wait > 0 && a.wait <= POINTS_RESET.GAP_MS && JSON.stringify(P.prog3) === before && state._puts() === puts0, a);
  P._pointsResetAt = Date.now() - POINTS_RESET.GAP_MS - 1;
  P.lastDamageAt = Date.now() - 3000;
  await send(room, ws, 'points_reset', {});
  const f = answerOf(ws);
  check('3: ...a blow taken in the last 10 s: refused, \'fight\'', !!f && f.ok === false && f.err === 'fight' && JSON.stringify(P.prog3) === before && state._puts() === puts0, f);
  P.lastDamageAt = 0; P._lastDealtAt = Date.now() - 2000;
  await send(room, ws, 'points_reset', {});
  const f2 = answerOf(ws);
  check('3: ...a blow dealt in the last 10 s: refused, \'fight\'', !!f2 && f2.err === 'fight' && JSON.stringify(P.prog3) === before, f2);
  P._lastDealtAt = Date.now() - 11000;
  P.dead = true;
  await send(room, ws, 'points_reset', {});
  check('3: ...a dead player is answered nothing, nothing changed', !answerOf(ws) && JSON.stringify(P.prog3) === before);
  P.dead = false;
  await send(room, ws, 'points_reset', {});
  const ok = answerOf(ws);
  check('3: ...out of the fight a minute on: reset', !!ok && ok.ok === true && pointsPlaced(P.prog3) === 0, ok);
  P._pointsResetAt = 0;
  const puts1 = state._puts();
  await send(room, ws, 'points_reset', {});
  const none = answerOf(ws);
  check('3: ...nothing placed: refused, \'none\', nothing written', !!none && none.ok === false && none.err === 'none' && state._puts() === puts1, none);
}

// ── 4. worn armour stays worn ──
{
  P._pointsResetAt = 0;
  await place(room, ws, 'def', 5);
  P.armor = { name: 'Black Steel Torso', mat: 'steel', slot: 'armor', tierMult: 3, quality: 'normal' };
  await send(room, ws, 'points_reset', {});
  check('4: a reset leaves worn armour on (a requirement is asked when a piece goes on)',
    (answerOf(ws) || {}).ok === true && P.prog3.alloc.def === 0 && !!P.armor && P.armor.name === 'Black Steel Torso', P.armor);
  P.armor = null;
}

// ── 5. the switches ──
{
  const { room: r2 } = await makeRoom();
  const w2 = fakeWs();
  r2.sessions.set(w2, baseSession());
  await r2.webSocketMessage(w2, JSON.stringify({ type: 'join', id: 'bp_pr_b', name: 'T', phrase: 'p-b', protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
  const ss = w2.sent.find((m) => m.type === 'state_sync');
  check('5: state_sync advertises caps.pointsreset', !!ss && ss.caps && ss.caps.pointsreset === true, ss && ss.caps && ss.caps.pointsreset);
  const P2 = r2.playerState.bp_pr_b;
  trained(r2, P2);
  await place(r2, w2, 'hp', 2);
  r2._liveFlags = { pointsreset: false };
  await send(r2, w2, 'points_reset', {});
  const off = answerOf(w2);
  check('5: `pointsreset: false`: answered \'off\', nothing reset', !!off && off.ok === false && off.err === 'off' && P2.prog3.alloc.hp === 2, off);
  const w3 = fakeWs();
  r2.sessions.set(w3, baseSession());
  await r2.webSocketMessage(w3, JSON.stringify({ type: 'join', id: 'bp_pr_c', name: 'T', phrase: 'p-c', protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
  const s3 = w3.sent.find((m) => m.type === 'state_sync');
  check('5: ...and caps.pointsreset false at the next join', !!s3 && s3.caps && s3.caps.pointsreset === false, s3 && s3.caps && s3.caps.pointsreset);
  r2._liveFlags = { onelevel: false };
  P2._pointsResetAt = 0;
  await send(r2, w2, 'points_reset', {});
  check('5: `onelevel: false`: the shared pool dealt by the old sum (3 a skill level past 1, the three added: 3 x (5 + 2 + 0))',
    (answerOf(w2) || {}).ok === true && P2.prog3.shared === 21 && P2.prog3.poolBy.sword === 15, pools(P2.prog3));
}

// ── 6. the wire ──
{
  check('6: points_reset_result is server-only (PRIVILEGED_EVENTS)',
    PRIVILEGED_EVENTS.has ? PRIVILEGED_EVENTS.has('points_reset_result') : PRIVILEGED_EVENTS.includes('points_reset_result'));
  const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  check('6: ...and points_reset is routed to its handler (never relayed)', /case 'points_reset':\s*\n\s*this\._handlePointsReset\(session\);/.test(src));
  const relay = readFileSync(new URL('../src/relay.js', import.meta.url), 'utf8');
  check('6: ...nor on the relay\'s list', !/['"]points_reset['"]/.test(relay));
  const cli = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
  check('6: the page sends it (the channel\'s allowlist names it) and takes the answer from the worker only',
    /msg\.type === 'points_reset'\)/.test(cli) && /case 'points_reset_result':[\s\S]{0,600}if \(!msg\.from\)/.test(cli));
}

// ── 7. the page ──
{
  check('7: the page counts the weapon skills the worker does', JSON.stringify(PR.POINTS_RESET_SKILLS) === JSON.stringify(PROG3.SKILLS));
  const p3 = { alloc: { hp: 2, def: 1 }, atk: { sword: { luck: 3 }, bow: { aspd: 1 }, staff: {} } };
  check('7: ...and counts placed points as the worker does', PR.placedPoints(p3) === 7 && pointsPlaced(p3) === 7 && PR.placedPoints(null) === 0 && PR.placedPoints({ alloc: { hp: -3 } }) === 0);
  const sent = [];
  const S = { _serverCaps: { pointsreset: true }, rpg: { prog3: p3 }, channel: { send: (m) => sent.push(m) } };
  check('7: the button shows against a worker that resets, with a point placed',
    PR.showPointsReset(S) && !PR.showPointsReset({ _serverCaps: {}, rpg: { prog3: p3 } }) && !PR.showPointsReset({ _serverCaps: { pointsreset: true }, rpg: { prog3: { alloc: { hp: 0 } } } }));
  const t = 1000000;
  check('7: one ask at a time', PR.requestPointsReset(S, t) === true && PR.requestPointsReset(S, t + 1000) === false && sent.length === 1 && sent[0].type === 'points_reset');
  check('7: ...never to a worker that does not reset', PR.requestPointsReset({ _serverCaps: {}, channel: { send: () => {} } }, t) === false);
  const said = [], sounds = [];
  PR.onPointsResetResult(S, { ok: true, poolBy: { sword: 15, bow: 6, staff: 0 }, shared: 15 }, { say: (l) => said.push(l), sound: (n) => sounds.push(n) });
  check('7: the answer in words: "Points reset!" and how many to spend, and the ask cleared',
    said[0] === 'Points reset!' && said[1] === '36 points to spend' && sounds[0] === 'pointsSpent' && !S._pointsResetAskedAt, { said, sounds });
  const r = (err) => PR.pointsResetLines({ ok: false, err })[0];
  check('7: ...and every refusal in plain words', r('fight') === "Can't reset in a fight" && r('soon') === 'You just reset your points'
    && r('none') === 'No points to give back' && r('off') === "Can't reset right now" && r('__proto__') === "Can't reset right now");
}

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\npoints-reset: all passed');
