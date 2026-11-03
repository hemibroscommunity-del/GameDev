/* ═══ v2.3.4013: THE RARE FISH, WEIGHED, WITH RECORDS ═══
 * (server/src/fishlog.js; spec docs/specs/fish-variants.md)
 *
 *   1. CAPS AND THE JOIN: caps.fishvariants and caps.fishweigh advertised; the
 *      fish log read at the join.
 *   2. THE ROLLS, WITH HELD DICE: 0.1% large, else 1% albino, else plain --
 *      never both; a real strike at a Wheel fish spot pays the variant's own
 *      key and says it on harvest_credit; the kill switch rolls none.
 *   3. NO STACKING: a variant is its own key, never the plain fish's stack.
 *   4. COOKING KEEPS THE SUFFIX: cook_request turns fish_trout_albino into
 *      cooked_fish_trout_albino.
 *   5. A LARGE FISH HEALS DOUBLE; an albino heals as its species.
 *   6. THE POINTS, ONCE EACH: the first albino of a species eaten +5 AP, the
 *      first large +10, never again; a bought one counts.
 *   7. WEIGH ONCE PER CATCH: a catch weighs once, in its species' range (a
 *      large 3-5x the plain biggest); a fish not caught has nothing to weigh;
 *      a cooked fish weighs its raw catch; the weigh-in is written at once.
 *   8. THE BOARDS: the top ten a species, one row a player, a weigh-in that
 *      beats the tenth enters, fish_board answers; a locked board is never
 *      written.
 *   9. THE RECORD: catches written at most once a SAVE_MS and on close; a
 *      newer record is locked; normalizeFishlog drops what it does not know
 *      (`__proto__` included); a restart forgets it.
 *  10. DENY BY DEFAULT AND THE SWITCHES: an unknown key is answered with
 *      nothing; `fishweigh: false` weighs and counts nothing.
 *  11. DIEGO: an albino x5, a large one x10 the plain fish.
 *  12. THE LEVER: /dev/fish next and give.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { FISHLOG, FISHLOG_KEY, fishKeyInfo, rollFishVariant, rollFishWeight, normalizeFishlog, normalizeFishBoard } from '../src/fishlog.js';
import { FISH_HEAL } from '../src/data.js';

function makeState() {
  const store = new Map();
  let failGet = null;
  const writes = [];
  return {
    storage: {
      get: async (k) => { if (failGet && failGet(k)) throw new Error('read failed'); return store.get(k); },
      put: async (k, v) => {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { writes.push(kk); store.set(kk, JSON.parse(JSON.stringify(vv))); } return; }
        writes.push(k); store.set(k, JSON.parse(JSON.stringify(v)));
      },
      list: async (opts) => {
        const out = new Map();
        for (const k of [...store.keys()].filter((x) => !opts?.prefix || x.startsWith(opts.prefix)).sort()) out.set(k, store.get(k));
        return out;
      },
      delete: async (k) => { if (Array.isArray(k)) { for (const x of k) store.delete(x); return k.length; } return store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
    writes,
    failReads(fn) { failGet = fn; },
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);
const last = (ws, type) => { const r = msgsOfType(ws, type); return r.length ? r[r.length - 1].payload : null; };

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail).slice(0, 700)); }
}

/* the dice, held: a queue of numbers, then Math.random's own */
function hold(room, seq) {
  const q = seq.slice();
  room._fishDice = () => (q.length ? q.shift() : 0.5);
  return q;
}

/* dice that roll a plain fish (and a middling weight), where a suite
   section is not about the variant */
const PLAIN = () => 0.5;
const state = makeState();
const room = new GameRoom(state, mockEnv);
room._liveFlags = {};
room._fishDice = PLAIN;
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, name) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: name || id, phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  return room.playerState[id];
}
const send = (ws, m) => room.webSocketMessage(ws, JSON.stringify(m));
const stored = (id) => state._store.get(FISHLOG_KEY(id));
const bookOf = (id) => room._fishlogOf(id);

// ── 1. CAPS AND THE JOIN ─────────────────────────────────────────────────────
const wsA = fakeWs('A');
const A = await join(wsA, 'bp_fv_a', 'Angler');
{
  const sync = wsA.sent.find((m) => m.type === 'state_sync');
  check('1a caps: fishvariants and fishweigh advertised', sync && sync.caps && sync.caps.fishvariants === true && sync.caps.fishweigh === true, sync && sync.caps && [sync.caps.fishvariants, sync.caps.fishweigh]);
  const b = bookOf('bp_fv_a');
  check('1b the fish log is read at the join: nothing to weigh yet', !!b && !b.locked && Object.keys(b.rec.u).length === 0 && Object.keys(b.rec.b).length === 0, b);
}

// ── 2. THE ROLLS ─────────────────────────────────────────────────────────────
{
  check('2a held dice: under 0.1% is large', rollFishVariant(() => 0.0009) === 'large');
  const q = [0.5, 0.009];
  check('2b ...over it, then under 1%, albino (two rolls)', rollFishVariant(() => q.shift()) === 'albino');
  const q2 = [0.001, 0.01];
  check('2c ...0.1% and 1% exactly are plain (strictly under)', rollFishVariant(() => q2.shift()) === null);
  let calls = 0;
  check('2d ...a large fish rolls once: never both', rollFishVariant(() => { calls++; return 0; }) === 'large' && calls === 1);
  /* the odds over many rolls, Math.random's own: ~0.1% and ~1% */
  let L = 0, Al = 0;
  const N = 200000;
  for (let i = 0; i < N; i++) { const v = rollFishVariant(); if (v === 'large') L++; else if (v === 'albino') Al++; }
  check('2e over 200,000 catches: about 0.1% large and 1% albino', L / N > 0.0006 && L / N < 0.0014 && Al / N > 0.0085 && Al / N < 0.0115, { L, Al });

  /* a REAL strike at a Wheel fish spot */
  A.inventory = Object.assign(A.inventory || {}, { fishing_pole: 1 });
  room._ensureZoneNodes && room._ensureZoneNodes(WHEEL_ZONE);
  const spots = (room.nodes[WHEEL_ZONE] || []).filter((n) => n && n.nodeType === 'fishSpot' && (n.tierLvl || 1) <= 1);
  check('2f (guard) the Wheel has a first-tier fish spot', spots.length > 0, { n: (room.nodes[WHEEL_ZONE] || []).length });
  const strike = async (n) => {
    n.alive = true; n.respawnAt = 0;
    A.z = WHEEL_ZONE; A.x = n.x + 10; A.y = n.y + 10; A.dead = false; A.dying = false; A.lastMoveAt = undefined;
    A._lastHarvestAt = 0; A._harvestPerfectHistory = [];
    /* a strike with no start of its own is a recovery strike, one a
       RECOVER_MS (gathering.js HARVEST_PROOF): this suite is not about that */
    if (room._harvestRecoverAt && room._harvestRecoverAt.clear) room._harvestRecoverAt.clear();
    wsA.sent.length = 0;
    await send(wsA, { type: 'node_strike', payload: { id: n.id, zone: WHEEL_ZONE, accuracy: 'good' } });
    return last(wsA, 'harvest_credit');
  };
  const spot = spots[0];
  const plain = 'fish_minnow';
  hold(room, [0.0005]);
  const c1 = await strike(spot);
  check('2g a strike that rolls under 0.1% pays a LARGE minnow, its own key, and says so', !!c1 && c1.fish && c1.fish.key === 'fish_minnow_large' && c1.fish.v === 'large' && c1.fish.sp === 'minnow'
    && A.inventory.fish_minnow_large === 1, { c1, inv: A.inventory });
  hold(room, [0.5, 0.005]);
  const c2 = await strike(spot);
  check('2h ...over it and under 1%: an albino', !!c2 && c2.fish && c2.fish.key === 'fish_minnow_albino' && A.inventory.fish_minnow_albino === 1, c2);
  hold(room, [0.5, 0.5]);
  const before = A.inventory[plain] || 0;
  const c3 = await strike(spot);
  check('2i ...else the plain fish, v null', !!c3 && c3.fish && c3.fish.key === plain && c3.fish.v === null && A.inventory[plain] === before + 1, c3);
  check('2j each catch counted to weigh, by its key', bookOf('bp_fv_a').rec.u.fish_minnow_large === 1 && bookOf('bp_fv_a').rec.u.fish_minnow_albino === 1 && bookOf('bp_fv_a').rec.u.fish_minnow === 1, bookOf('bp_fv_a').rec.u);
  /* the kill switch: every fish plain */
  room._liveFlags = { fishvariants: false };
  hold(room, [0, 0]);
  const c4 = await strike(spot);
  check('2k `fishvariants: false`: dice that would roll large pay the plain fish', !!c4 && c4.fish && c4.fish.key === plain && c4.fish.v === null, c4);
  room._liveFlags = {};
  room._fishDice = PLAIN;
}

// ── 3. NO STACKING ───────────────────────────────────────────────────────────
{
  const ps = A;
  ps.inventory = { fish_trout: 3 };
  room._fishCatch('bp_fv_a', ps, 'fish_trout', 1);
  hold(room, [0.0001]);
  room._fishCatch('bp_fv_a', ps, 'fish_trout', 1);
  hold(room, [0.9, 0.0001]);
  room._fishCatch('bp_fv_a', ps, 'fish_trout', 1);
  room._fishDice = PLAIN;
  check('3a three keys, three stacks: the plain trout, a large one, an albino', ps.inventory.fish_trout >= 3 && ps.inventory.fish_trout_large === 1 && ps.inventory.fish_trout_albino === 1, ps.inventory);
  check('3b fishKeyInfo reads each, raw and cooked; nothing else', fishKeyInfo('fish_trout_large').v === 'large' && fishKeyInfo('cooked_fish_pike_albino').raw === 'fish_pike_albino'
    && fishKeyInfo('cooked_fish_pike_albino').cooked && fishKeyInfo('fish_trout').v === null && fishKeyInfo('fish_nonesuch') === null && fishKeyInfo('fish_trout_golden') === null && fishKeyInfo('__proto__') === null);
}

// ── 4. COOKING KEEPS THE SUFFIX ──────────────────────────────────────────────
{
  A.inventory = { fish_trout_albino: 1, fish_salmon_large: 1 };
  A._lastCookAt = 0; A._cookHistory = [];
  await send(wsA, { type: 'cook_request', payload: { fishKey: 'fish_trout_albino', kind: 'cooked' } });
  A._lastCookAt = 0;
  await send(wsA, { type: 'cook_request', payload: { fishKey: 'fish_salmon_large', kind: 'cooked' } });
  check('4a a cooked albino trout is cooked_fish_trout_albino, a cooked large salmon cooked_fish_salmon_large',
    A.inventory.cooked_fish_trout_albino === 1 && A.inventory.cooked_fish_salmon_large === 1 && !A.inventory.fish_trout_albino && !A.inventory.cooked_fish_trout, A.inventory);
}

// ── 5. A LARGE FISH HEALS DOUBLE ─────────────────────────────────────────────
{
  check('5a large: double its species\' heal, raw or cooked', room._fishHealAmount('cooked_fish_pike_large') === FISH_HEAL.pike * 2 && room._fishHealAmount('fish_minnow_large') === FISH_HEAL.minnow * 2);
  check('5b albino: its species\' heal', room._fishHealAmount('cooked_fish_trout_albino') === FISH_HEAL.trout);
  room._liveFlags = { fishheal: false };
  check('5c ...on the old ladder too', room._fishHealAmount('cooked_fish_trout_large') === 2 * Math.ceil(92 + 11 * 8));
  room._liveFlags = {};
  A.maxHp = 5000; A.hp = 1000;
  A.inventory = { cooked_fish_salmon_large: 1 };
  A._lastInstantHealAt = 0;
  await send(wsA, { type: 'eat_request', payload: { invKey: 'cooked_fish_salmon_large' } });
  check('5d eating a cooked large salmon heals twice a salmon', A.hp === 1000 + FISH_HEAL.salmon * 2 && !A.inventory.cooked_fish_salmon_large, { hp: A.hp });
}

// ── 6. THE POINTS, ONCE EACH ─────────────────────────────────────────────────
{
  const wsB = fakeWs('B');
  const B = await join(wsB, 'bp_fv_b', 'Biter');
  const ap = () => Math.floor(Number(B.achievementPoints) || 0);
  B.maxHp = 9000; B.hp = 10;
  const eat = async (k) => { B.inventory = Object.assign(B.inventory || {}, { [k]: (B.inventory && B.inventory[k] || 0) + 1 }); room._pvpHealClocks && room._pvpHealClocks.clear && room._pvpHealClocks.clear(); await send(wsB, { type: 'eat_request', payload: { invKey: k } }); };
  const ap0 = ap();
  await eat('cooked_fish_trout_albino');
  const s1 = last(wsB, 'achv_state');
  check('6a the first albino trout eaten: Albino Trout, +5 AP, told as new', ap() === ap0 + 5 && s1 && s1.new && s1.new[0] === 'albino_trout' && s1.got.albino_trout > 0, { ap: ap(), s1 });
  await eat('cooked_fish_trout_albino');
  check('6b ...a second pays nothing', ap() === ap0 + 5);
  await eat('cooked_fish_trout_large');
  check('6c the first large trout eaten: Large Trout, +10 AP', ap() === ap0 + 15 && last(wsB, 'achv_state').new[0] === 'large_trout');
  await eat('cooked_fish_trout_large');
  check('6d ...once', ap() === ap0 + 15);
  await eat('cooked_fish_pike_albino');
  check('6e each species its own: an albino pike +5 more', ap() === ap0 + 20);
  await eat('cooked_fish_trout');
  check('6f a plain trout pays nothing', ap() === ap0 + 20);
  const rec = state._store.get('achv:bp_fv_b');
  check('6g the record is written with the points (got is the stamp)', rec && rec.got.albino_trout > 0 && rec.got.large_trout > 0 && rec.got.albino_pike > 0, rec);
  /* a fish bought or traded counts: B never caught any of these */
  check('6h ...none of these were caught: what is paid for is eating one', !(bookOf('bp_fv_b').rec.u.fish_trout_albino));
  room._liveFlags = { achievements: false };
  await eat('cooked_fish_salmon_albino');
  check('6i `achievements: false`: no grant', ap() === ap0 + 20);
  room._liveFlags = {};
}

// ── 7. WEIGH ONCE PER CATCH ──────────────────────────────────────────────────
const wsC = fakeWs('C');
const C = await join(wsC, 'bp_fv_c', 'Carl');
{
  C.inventory = {};
  room._fishDice = () => 0.5;
  room._fishCatch('bp_fv_c', C, 'fish_trout', 1);
  room._fishCatch('bp_fv_c', C, 'fish_trout', 1);
  room._fishDice = PLAIN;
  check('7a (guard) two plain trout caught, two to weigh', C.inventory.fish_trout === 2 && bookOf('bp_fv_c').rec.u.fish_trout === 2, bookOf('bp_fv_c').rec.u);
  const w0 = state.writes.length;
  hold(room, [0.5]);
  await send(wsC, { type: 'fish_inspect', payload: { key: 'fish_trout' } });
  const r1 = last(wsC, 'fish_weight');
  check('7b Inspect weighs one: in the trout\'s range (0.5-3 kg), one left', !!r1 && r1.sp === 'trout' && r1.g === 1750 && r1.left === 1 && r1.newBest === true && r1.best === 1750 && r1.rank === 1, r1);
  check('7c ...written at once, before its answer (the log, and the board it entered)', state.writes.slice(w0).includes(FISHLOG_KEY('bp_fv_c')) && state.writes.slice(w0).includes(FISHLOG.BOARD_KEY)
    && stored('bp_fv_c').u.fish_trout === 1 && stored('bp_fv_c').b.trout === 1750, state.writes.slice(w0));
  hold(room, [0.1]);
  await send(wsC, { type: 'fish_inspect', payload: { key: 'fish_trout' } });
  const r2 = last(wsC, 'fish_weight');
  check('7d the second: lighter, not a new best, nothing left; the best stays', r2.g === 750 && r2.newBest === false && r2.best === 1750 && r2.left === 0 && r2.rank === 0, r2);
  const w1 = state.writes.length;
  await send(wsC, { type: 'fish_inspect', payload: { key: 'fish_trout' } });
  const r3 = last(wsC, 'fish_weight');
  check('7e a third: "You\'ve weighed all your Trout" (none), and nothing written', r3.none === true && r3.sp === 'trout' && state.writes.length === w1, r3);
  /* a fish not caught */
  C.inventory.fish_salmon = 4;
  await send(wsC, { type: 'fish_inspect', payload: { key: 'fish_salmon' } });
  check('7f a bought salmon has no catch to weigh', last(wsC, 'fish_weight').none === true && last(wsC, 'fish_weight').sp === 'salmon');
  /* a catch, with nothing of it in the bag */
  room._fishCatch('bp_fv_c', C, 'fish_pike', 1);
  delete C.inventory.fish_pike;
  await send(wsC, { type: 'fish_inspect', payload: { key: 'fish_pike' } });
  check('7g a catch no longer in the bag (sold, eaten) cannot be weighed through it', last(wsC, 'fish_weight').none === true && bookOf('bp_fv_c').rec.u.fish_pike === 1);
  /* a cooked fish weighs its raw catch */
  C.inventory.cooked_fish_pike = 1;
  hold(room, [1]);
  await send(wsC, { type: 'fish_inspect', payload: { key: 'cooked_fish_pike' } });
  const r4 = last(wsC, 'fish_weight');
  check('7h a cooked pike weighs its raw catch: up to 12 kg', r4.g === 12000 && r4.sp === 'pike' && !bookOf('bp_fv_c').rec.u.fish_pike, r4);
  /* a large one: 3 to 5 times the plain biggest */
  hold(room, [0.00001]);
  room._fishCatch('bp_fv_c', C, 'fish_minnow', 1);
  hold(room, [0]);
  await send(wsC, { type: 'fish_inspect', payload: { key: 'fish_minnow_large' } });
  const r5 = last(wsC, 'fish_weight');
  check('7i a large minnow weighs 3x-5x a plain one\'s biggest (0.6-1 kg) and says large', r5.g === 600 && r5.v === 'large', r5);
  let lo = Infinity, hi = 0;
  for (let i = 0; i < 2000; i++) { const g = rollFishWeight('pike', 'large'); lo = Math.min(lo, g); hi = Math.max(hi, g); }
  check('7j a large pike: 36 to 60 kg', lo >= 36000 && hi <= 60000 && hi > 55000, { lo, hi });
  let alo = Infinity, ahi = 0;
  for (let i = 0; i < 2000; i++) { const g = rollFishWeight('minnow', 'albino'); alo = Math.min(alo, g); ahi = Math.max(ahi, g); }
  check('7k an albino minnow: the plain range, 0.05-0.2 kg', alo >= 50 && ahi <= 200, { alo, ahi });
  room._fishDice = PLAIN;
}

// ── 8. THE BOARDS ────────────────────────────────────────────────────────────
{
  /* twelve anglers weigh a trout each: 1 kg, 1.1 kg, ... -- the board keeps ten */
  const anglers = [];
  for (let i = 0; i < 12; i++) {
    const ws = fakeWs('T' + i);
    const ps = await join(ws, 'bp_fv_t' + i, 'Tee' + i);
    ps.inventory = {};
    room._fishCatch('bp_fv_t' + i, ps, 'fish_trout', 1);
    anglers.push({ ws, ps, id: 'bp_fv_t' + i });
  }
  room._fishDice = PLAIN;
  for (let i = 0; i < 12; i++) {
    /* g = 500 + 2500 r: r for 1000 + 100 i grams */
    hold(room, [(1000 + 100 * i - 500) / 2500]);
    await send(anglers[i].ws, { type: 'fish_inspect', payload: { key: 'fish_trout' } });
  }
  room._fishDice = PLAIN;
  await send(wsC, { type: 'fish_board_request' });
  const fb = last(wsC, 'fish_board');
  const trout = fb && fb.boards && fb.boards.trout;
  check('8a fish_board: the trout board holds ten, heaviest first', Array.isArray(trout) && trout.length === 10 && trout.every((e, i) => i === 0 || e.g <= trout[i - 1].g), trout && trout.map((e) => e.g));
  check('8b ...Carl\'s 1.75 kg among them and the two lightest newcomers (1.0, 1.1 kg) left off', trout.some((e) => e.pid === 'bp_fv_c' && e.g === 1750 && e.name === 'Carl') && !trout.some((e) => e.g < 1300), trout.map((e) => [e.name, e.g]));
  check('8c every species has its board', FISHLOG.SPECIES.every((sp) => Array.isArray(fb.boards[sp])) && fb.boards.pike[0].g === 12000 && fb.boards.minnow[0].v === 'large', fb.boards);
  /* one row a player: a heavier one replaces their own, a lighter one does not enter */
  const t11 = anglers[11];
  room._fishCatch(t11.id, t11.ps, 'fish_trout', 1);
  room._fishCatch(t11.id, t11.ps, 'fish_trout', 1);
  hold(room, [1]);
  await send(t11.ws, { type: 'fish_inspect', payload: { key: 'fish_trout' } });
  const rk = last(t11.ws, 'fish_weight');
  hold(room, [0]);
  await send(t11.ws, { type: 'fish_inspect', payload: { key: 'fish_trout' } });
  room._fishDice = PLAIN;
  const board = state._store.get(FISHLOG.BOARD_KEY).b.trout;
  check('8d a heavier weigh-in moves the angler to the top, once (one row a player)', rk.rank === 1 && board[0].pid === t11.id && board[0].g === 3000 && board.filter((e) => e.pid === t11.id).length === 1, board.map((e) => [e.pid, e.g]));
  check('8e ...and a lighter one later leaves their row as it was', last(t11.ws, 'fish_weight').rank === 0 && board.length === 10);
  /* a tie keeps the earlier row above */
  const n = normalizeFishBoard({ v: 1, b: { trout: [{ pid: 'x', name: 'X', g: 900, at: 5 }, { pid: 'y', name: 'Y', g: 900, at: 3 }, { pid: 'y', name: 'dup', g: 100, at: 1 }, { pid: '__proto__', name: 'P', g: 1, at: 0 }, null, { pid: 'z', g: 'nope' }] } });
  check('8f normalizeFishBoard: a tie keeps the earlier above, one row a player, bad rows dropped', n.boards.trout.map((e) => e.pid).join() === 'y,x,__proto__' && n.boards.trout[2].g === 1, n.boards.trout);
  check('8g a newer board is locked', normalizeFishBoard({ v: FISHLOG.BOARD_V + 1 }).locked === true);
  /* a locked board is shown as read, never written */
  const s2 = makeState();
  s2._store.set(FISHLOG.BOARD_KEY, { v: FISHLOG.BOARD_V + 1, b: {} });
  const r2 = new GameRoom(s2, mockEnv);
  r2._liveFlags = {};
  r2._fishDice = PLAIN;
  const ws2 = fakeWs('L');
  r2.sessions.set(ws2, baseSession());
  await r2.webSocketMessage(ws2, JSON.stringify({ type: 'join', id: 'bp_fv_l', name: 'L', phrase: 'p', protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  const L = r2.playerState.bp_fv_l;
  L.inventory = {};
  r2._fishCatch('bp_fv_l', L, 'fish_trout', 1);
  await r2.webSocketMessage(ws2, JSON.stringify({ type: 'fish_inspect', payload: { key: 'fish_trout' } }));
  check('8h a newer board: the weigh-in still weighs, the board is never written', last(ws2, 'fish_weight').g > 0 && s2._store.get(FISHLOG.BOARD_KEY).v === FISHLOG.BOARD_V + 1 && !s2.writes.includes(FISHLOG.BOARD_KEY));
  await r2.webSocketMessage(ws2, JSON.stringify({ type: 'fish_board_request' }));
  check('8i ...and asked for, it says unavailable', last(ws2, 'fish_board').unavailable === true);
}

// ── 9. THE RECORD ────────────────────────────────────────────────────────────
{
  const s3 = makeState();
  const r3 = new GameRoom(s3, mockEnv);
  r3._liveFlags = {};
  r3._fishDice = PLAIN;
  let T = 1_800_000_000_000;
  const realNow = Date.now;
  Date.now = () => T;
  const ws3 = fakeWs('R');
  r3.sessions.set(ws3, baseSession());
  await r3.webSocketMessage(ws3, JSON.stringify({ type: 'join', id: 'bp_fv_r', name: 'R', phrase: 'p', protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  const R = r3.playerState.bp_fv_r;
  R.inventory = {};
  const rows = () => s3.writes.filter((k) => k === FISHLOG_KEY('bp_fv_r')).length;
  T += FISHLOG.SAVE_MS + 1;
  for (let i = 0; i < 30; i++) { T += 2000; r3._fishCatch('bp_fv_r', R, 'fish_minnow', 1); }
  check('9a thirty catches in a minute write the log at most twice (once a SAVE_MS)', rows() <= 2 && rows() >= 1, rows());
  await r3.webSocketClose(ws3, 1000, 'bye', true);
  const st = s3._store.get(FISHLOG_KEY('bp_fv_r'));
  check('9b ...and leaving writes what was only in memory', st && st.u.fish_minnow >= 29, st);
  Date.now = realNow;
  check('9c normalizeFishlog keeps only the game\'s fish and species', (() => {
    const n = normalizeFishlog({ v: 1, u: { fish_trout: 2, fish_trout_large: '3', fish_gold: 9, __proto__: { x: 1 }, fish_trout_albino: -1 }, b: { trout: 1200.7, kraken: 5 } });
    return !n.locked && Object.keys(n.rec.u).sort().join() === 'fish_trout,fish_trout_large' && n.rec.u.fish_trout_large === 3 && n.rec.b.trout === 1200 && !('kraken' in n.rec.b) && Object.getPrototypeOf(n.rec.u) === null;
  })());
  check('9d a newer record is locked', normalizeFishlog({ v: FISHLOG.V + 1 }).locked === true);
  /* a read that failed: locked, never counted into or written */
  const s4 = makeState();
  s4.failReads((k) => k === FISHLOG_KEY('bp_fv_f'));
  const r4 = new GameRoom(s4, mockEnv);
  r4._liveFlags = {};
  r4._fishDice = PLAIN;
  const ws4 = fakeWs('F');
  r4.sessions.set(ws4, baseSession());
  await r4.webSocketMessage(ws4, JSON.stringify({ type: 'join', id: 'bp_fv_f', name: 'F', phrase: 'p', protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  const F = r4.playerState.bp_fv_f;
  if (F) {
    F.inventory = {};
    r4._fishCatch('bp_fv_f', F, 'fish_trout', 1);
    await r4.webSocketMessage(ws4, JSON.stringify({ type: 'fish_inspect', payload: { key: 'fish_trout' } }));
    check('9e a log whose read failed is locked: the fish is still caught, nothing counted or written, the weigh-in unavailable',
      F.inventory.fish_trout === 1 && !s4.writes.includes(FISHLOG_KEY('bp_fv_f')) && last(ws4, 'fish_weight').unavailable === true, last(ws4, 'fish_weight'));
  } else check('9e (guard) the join went through', false);
  /* a restart forgets it */
  state._store.set(FISHLOG_KEY('bp_fv_c'), { v: 1, u: { fish_trout: 1 }, b: {} });
  await room._resetCharacterData('bp_fv_c');
  check('9f a character restart deletes the log', !state._store.has(FISHLOG_KEY('bp_fv_c')) && !room._fishlogOf('bp_fv_c'));
}

// ── 10. DENY BY DEFAULT AND THE SWITCHES ─────────────────────────────────────
{
  const wsD = fakeWs('D');
  const D = await join(wsD, 'bp_fv_d', 'Dee');
  D.inventory = { ore_copper_ore: 3, fish_trout: 1 };
  wsD.sent.length = 0;
  for (const key of ['ore_copper_ore', '__proto__', 'fish_kraken', 'fish_trout_golden', null, 7, 'x'.repeat(200)]) {
    await send(wsD, { type: 'fish_inspect', payload: { key } });
  }
  check('10a anything not one of the game\'s fish is answered with nothing', msgsOfType(wsD, 'fish_weight').length === 0, wsD.sent.map((m) => m.type));
  room._liveFlags = { fishweigh: false };
  room._fishCatch('bp_fv_d', D, 'fish_trout', 1);
  check('10b `fishweigh: false`: a catch is not counted to weigh', !bookOf('bp_fv_d').rec.u.fish_trout);
  await send(wsD, { type: 'fish_inspect', payload: { key: 'fish_trout' } });
  check('10c ...an Inspect is told the scales are off', last(wsD, 'fish_weight').off === true);
  await send(wsD, { type: 'fish_board_request' });
  check('10d ...and the boards too', last(wsD, 'fish_board').off === true);
  const sync = await (async () => { const w = fakeWs('E'); await join(w, 'bp_fv_e', 'E'); return w.sent.find((m) => m.type === 'state_sync'); })();
  check('10e ...and a join\'s caps say so', sync.caps.fishweigh === false && sync.caps.fishvariants === true);
  room._liveFlags = {};
}

// ── 11. DIEGO ────────────────────────────────────────────────────────────────
{
  const base = room._shopBaseValue('fish_trout');
  check('11a an albino trout is worth 5 trout to Diego, a large one 10', room._shopBaseValue('fish_trout_albino') === base * 5 && room._shopBaseValue('fish_pike_large') === base * 10 && base === 28,
    { base, albino: room._shopBaseValue('fish_trout_albino'), large: room._shopBaseValue('fish_pike_large') });
  check('11b ...he pays half and charges the whole: a flip is a loss', room._shopBuyPrice('fish_trout_large', 0) < room._shopSellPrice('fish_trout_large'));
}

// ── 12. THE LEVER ────────────────────────────────────────────────────────────
{
  const r = room._fishDev('bp_fv_a', { next: 'albino' });
  A.inventory = {};
  hold(room, [0.0001]);   /* dice that would roll large: the lever wins */
  room._fishCatch('bp_fv_a', A, 'fish_salmon', 1);
  room._fishCatch('bp_fv_a', A, 'fish_salmon', 1);
  room._fishDice = PLAIN;
  check('12a /dev/fish next albino: the next fish is albino, once', r.ok && A.inventory.fish_salmon_albino === 1 && A.inventory.fish_salmon_large === 1, A.inventory);
  const g = room._fishDev('bp_fv_a', { give: 'fish_pike_large', n: 3 });
  check('12b give: three large pike in the bag, each a catch to weigh', g.ok && A.inventory.fish_pike_large === 3 && bookOf('bp_fv_a').rec.u.fish_pike_large === 3);
  check('12c a bad lever is refused', room._fishDev('bp_fv_a', { next: 'gold' }).ok === false && room._fishDev('bp_fv_a', { give: 'ore_x' }).ok === false && room._fishDev('nobody', { next: 'large' }).ok === false);
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log(failures + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
