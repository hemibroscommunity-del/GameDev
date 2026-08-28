/* Two-sided trade test (v2.3.1132, PR16, handoff item H).  The gift
 * trade (trade.js) stays; this is the both-stage-both-confirm window:
 * mutual open, staged offers, anti-switch confirm reset, ATOMIC swap
 * validated at commit.  Checks:
 *   1. caps.trade2 advertised.
 *   2. Open handshake: A's open invites B (trade2_invite + 'invited'
 *      echo); B opening back goes live for both; self-target dropped;
 *      third parties get 'busy'.
 *   3. trade2_set sanitizes + echoes; ANY change resets BOTH confirms.
 *   4. Single confirm does not swap; both confirms swap ATOMICALLY
 *      (gold-for-items both directions verified on coins + inventory),
 *      session ends 'done' + settled to both.
 *   5. Commit-time shortfall cancels with NO partial application.
 *   6. Confirms/sets from non-members are ignored.
 *   7. Cancel notifies both; disconnect cancels; TTL sweep expires
 *      idle sessions; expired invites do not complete.
 *   8. Forged trade2_state / trade2_invite are not rebroadcast.
 *
 * v2.3.1213 (item E, weapon lane): weapons use escrow-at-STAGE (storage-
 * backed, unlike the memory-only item/gold path).  Checks:
 *   9. Staging escrows a stash weapon into a storage-backed record +
 *      resets confirms; unstage refunds it; commit swaps escrowed
 *      weapons to the other side + clears records; cancel/disconnect/
 *      deploy-orphan-sweep all refund to the owner; the sweep never
 *      re-refunds a delivered weapon (rule 6); a refund into a full
 *      stash parks the weapon in the inbox, never destroyed (rule 3);
 *      caps.trade2Weapons advertised.
 */
import { GameRoom } from '../src/index.js';
import { TRADE2 } from '../src/trade2.js';

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
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }
const lastState = (ws) => { const r = msgsOfType(ws, 'trade2_state'); return r[r.length - 1] && r[r.length - 1].payload; };

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, name) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: name || 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const P = (n) => 'bp_t2_' + n;
const cmd = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));

const wss = {};
for (const n of ['a', 'b', 'c']) {
  wss[n] = fakeWs(n);
  await join(wss[n], P(n), n.toUpperCase());
  room.playerState[P(n)].coins = 1000;
  room.playerState[P(n)].inventory = {};
}
const psA = room.playerState[P('a')], psB = room.playerState[P('b')];
psA.inventory = { fish_minnow: 10 };
psB.inventory = { ore_iron_ore: 4 };

// ── 1. caps ──
const sync = wss.a.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.trade2', sync && sync.caps && sync.caps.trade2 === true, sync && sync.caps);

// ── 2. open handshake ──
await cmd(wss.a, 'trade2_open', { target: P('a') });
check('self-target dropped', !room._t2Invites || !room._t2Invites.has(P('a') + '>' + P('a')));
wss.a.sent.length = 0; wss.b.sent.length = 0;
await cmd(wss.a, 'trade2_open', { target: P('b') });
check("A's open invites B + echoes 'invited'", msgsOfType(wss.b, 'trade2_invite').length === 1 && lastState(wss.a).state === 'invited');
await cmd(wss.b, 'trade2_open', { target: P('a') });
const sA = lastState(wss.a), sB = lastState(wss.b);
check('mutual open goes live for both', sA && sA.state === 'open' && sB && sB.state === 'open' && sA.id === sB.id, { sA: sA && sA.state, sB: sB && sB.state });
wss.c.sent.length = 0;
await cmd(wss.c, 'trade2_open', { target: P('a') });
check("third party gets 'busy'", lastState(wss.c).reason === 'busy');

/* ═══ v2.3.1754: THE TWO-STAGE HANDSHAKE ═══
   Owner (quoting the RuneScape/WoW lineage): "once both ready up, show a
   second, stripped-down screen ... Both must accept again."
   A confirm is now only valid once BOTH sides are ready and the accept
   cooldown since the last edit has elapsed, so every settlement below goes
   through the same door a player does.  The cooldown is rolled back rather
   than slept through — the rule under test is "the server refuses an early
   accept", and the tests for that assert it directly. */
const bothReady = async () => {
  await cmd(wss.a, 'trade2_ready', { ready: true });
  await cmd(wss.b, 'trade2_ready', { ready: true });
  for (const s2 of room._trades2.values()) s2.changedAt = Date.now() - 999999;
};

// ── 3. staging + anti-switch ──
wss.a.sent.length = 0; wss.b.sent.length = 0;
await cmd(wss.a, 'trade2_set', { offer: { fish_minnow: 5, _gold: -50, junk: 'x' } });
let st = lastState(wss.b);
check('set sanitizes and echoes to both', st.offers[P('a')].fish_minnow === 5 && st.offers[P('a')]._gold === undefined, st.offers[P('a')]);
/* v2.3.1754: a confirm before both sides are ready is refused outright — the
   review screen is the only place an accept can come from. */
await cmd(wss.a, 'trade2_confirm');
check('a confirm outside the review stage is refused', lastState(wss.a).confirmed[P('a')] === false && lastState(wss.a).reason === 'not-ready', lastState(wss.a).reason);
await bothReady();
check('both ready puts the pair on the review stage', lastState(wss.a).stage === 'review', lastState(wss.a).stage);
await cmd(wss.a, 'trade2_confirm');
check('single confirm marks but does not swap', lastState(wss.a).confirmed[P('a')] === true && psA.inventory.fish_minnow === 10);
await cmd(wss.b, 'trade2_set', { offer: { _gold: 200 } });
st = lastState(wss.a);
check("B's change resets BOTH confirms (anti-switch)", st.confirmed[P('a')] === false && st.confirmed[P('b')] === false);
/* v2.3.1754: ...and both READIES, dropping the pair back to the offer stage.
   Resetting only `confirmed` would leave two players on a review screen
   describing a trade that no longer exists — the exact misread the second
   screen exists to prevent. */
check("...and both READIES, back to the offer stage", st.ready[P('a')] === false && st.ready[P('b')] === false && st.stage === 'offer', { ready: st.ready, stage: st.stage });
/* the accept cooldown starts from that edit */
await cmd(wss.a, 'trade2_ready', { ready: true });
await cmd(wss.b, 'trade2_ready', { ready: true });
await cmd(wss.a, 'trade2_confirm');
check('an accept inside the cooldown is refused (last-second swap)', lastState(wss.a).confirmed[P('a')] === false && lastState(wss.a).reason === 'cooling', lastState(wss.a).reason);
/* and backing out of the review screen is not an edit — it just un-readies */
for (const s2 of room._trades2.values()) s2.changedAt = Date.now() - 999999;
await cmd(wss.a, 'trade2_ready', { ready: false });
check('Back on the review screen un-readies without touching the offer',
  lastState(wss.a).ready[P('a')] === false && lastState(wss.a).offers[P('a')].fish_minnow === 5, lastState(wss.a).ready);

// ── 6. non-member noise ignored ──
await cmd(wss.c, 'trade2_confirm');
await cmd(wss.c, 'trade2_set', { offer: { _gold: 999 } });
st = lastState(wss.a);
check('non-member confirm/set ignored', st.confirmed[P('a')] === false && !st.offers[P('c')]);

// ── 4. atomic swap ──
wss.a.sent.length = 0; wss.b.sent.length = 0;
await bothReady();
await cmd(wss.a, 'trade2_confirm');
await cmd(wss.b, 'trade2_confirm');
st = lastState(wss.a);
check('both confirms settle: A gave 5 fish, got 200g', psA.inventory.fish_minnow === 5 && psA.coins === 1200, { inv: psA.inventory, coins: psA.coins });
check('B gave 200g, got 5 fish', psB.coins === 800 && psB.inventory.fish_minnow === 5 && psB.inventory.ore_iron_ore === 4, { inv: psB.inventory, coins: psB.coins });
check("both sides told 'done' + settled, session gone", st.state === 'done' && st.settled === true && lastState(wss.b).state === 'done' && room._trades2.size === 0);

// ── 5. commit-time shortfall = clean cancel ──
await cmd(wss.a, 'trade2_open', { target: P('b') });
await cmd(wss.b, 'trade2_open', { target: P('a') });
await cmd(wss.a, 'trade2_set', { offer: { fish_minnow: 5 } });
await cmd(wss.b, 'trade2_set', { offer: { _gold: 500 } });
await bothReady();
await cmd(wss.a, 'trade2_confirm');
psB.coins = 100; // B spent their gold mid-trade (the classic scam window)
const aInvPre = JSON.stringify(psA.inventory), aCoinsPre = psA.coins;
wss.a.sent.length = 0;
await cmd(wss.b, 'trade2_confirm');
st = lastState(wss.a);
check('shortfall at commit cancels with NO partial application', st.state === 'cancelled' && st.reason === 'insufficient:' + P('b') && JSON.stringify(psA.inventory) === aInvPre && psA.coins === aCoinsPre && psB.coins === 100 && room._trades2.size === 0, st && st.reason);

// ── 7. cancel / disconnect / TTLs ──
psB.coins = 1000;
await cmd(wss.a, 'trade2_open', { target: P('b') });
await cmd(wss.b, 'trade2_open', { target: P('a') });
wss.b.sent.length = 0;
await cmd(wss.a, 'trade2_cancel');
check('unilateral cancel notifies the other side', lastState(wss.b).state === 'cancelled' && room._trades2.size === 0);
await cmd(wss.a, 'trade2_open', { target: P('b') });
await cmd(wss.b, 'trade2_open', { target: P('a') });
room._trade2OnDisconnect(P('a'));
check('disconnect cancels the session', room._trades2.size === 0);
await cmd(wss.a, 'trade2_open', { target: P('b') });
await cmd(wss.b, 'trade2_open', { target: P('a') });
const live = room._t2SessionFor(P('a'));
live.ts = Date.now() - TRADE2.SESSION_TTL - 1000;
room._tickTrades2(Date.now());
check('idle session swept by the tick', room._trades2.size === 0);
await cmd(wss.a, 'trade2_open', { target: P('b') });
room._t2Invites.set(P('a') + '>' + P('b'), Date.now() - TRADE2.INVITE_TTL - 1000);
wss.b.sent.length = 0;
await cmd(wss.b, 'trade2_open', { target: P('a') });
check('expired invite does not complete (fresh invite instead)', room._trades2.size === 0 && lastState(wss.b).state === 'invited');
await cmd(wss.b, 'trade2_cancel');

// ── 8. deny-list ──
room.eventBuffer.length = 0;
await cmd(wss.c, 'trade2_state', { state: 'done', settled: true });
await cmd(wss.c, 'trade2_invite', { from: P('c') });
check('forged trade2_state / trade2_invite dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'trade2_state' || e.type === 'trade2_invite').length === 0, room.eventBuffer.map((e) => e.type));

// ── 9. v2.3.1213 weapon lane (item E): escrow-at-stage custody ──
{
  const mkW = (name) => ({ type: 'sword', gearBase: 'iron', tier: 'common', tierMult: 1, name });
  check('state_sync advertises caps.trade2Weapons', sync.caps.trade2Weapons === true, sync.caps);

  // fresh session; stage/unstage/commit flow
  psA.weaponStash = [mkW('A-blade')]; psB.weaponStash = [mkW('B-bow')];
  await cmd(wss.a, 'trade2_open', { target: P('b') });
  await cmd(wss.b, 'trade2_open', { target: P('a') });

  /* v2.3.1754: ready+confirm first, so the reset below has something real to
     clear — a bare confirm is refused outside the review stage now. */
  await cmd(wss.a, 'trade2_ready', { ready: true });
  await cmd(wss.b, 'trade2_ready', { ready: true });
  for (const s2 of room._trades2.values()) s2.changedAt = Date.now() - 999999;
  await cmd(wss.a, 'trade2_confirm');
  await cmd(wss.a, 'trade2_stage_weapon', { stashIdx: 0 });
  let st9 = lastState(wss.b);
  const aSeq = st9.weapons[P('a')][0] && st9.weapons[P('a')][0].seq;
  check('stage escrows the weapon out of the stash',
    psA.weaponStash.length === 0 && st9.weapons[P('a')].length === 1 && st9.weapons[P('a')][0].weapon.name === 'A-blade',
    { stash: psA.weaponStash.length, staged: st9.weapons[P('a')] });
  check('escrow record is storage-backed (survives a deploy)', !!state._store.get('trade2wpn:' + P('a') + ':' + aSeq));
  check('staging resets both confirms (anti-switch)', st9.confirmed[P('a')] === false && st9.confirmed[P('b')] === false);

  await cmd(wss.a, 'trade2_unstage_weapon', { seq: aSeq });
  check('unstage refunds to the stash + clears the record',
    psA.weaponStash.length === 1 && psA.weaponStash[0].name === 'A-blade'
    && !state._store.get('trade2wpn:' + P('a') + ':' + aSeq) && lastState(wss.a).weapons[P('a')].length === 0,
    psA.weaponStash.map((w) => w.name));

  // stage BOTH, commit -> weapons swap sides
  await cmd(wss.a, 'trade2_stage_weapon', { stashIdx: 0 }); // A-blade
  await cmd(wss.b, 'trade2_stage_weapon', { stashIdx: 0 }); // B-bow
  const aSeq2 = lastState(wss.a).weapons[P('a')][0].seq;
  const bSeq2 = lastState(wss.b).weapons[P('b')][0].seq;
  await bothReady(); /* v2.3.1754 */
  await cmd(wss.a, 'trade2_confirm');
  await cmd(wss.b, 'trade2_confirm');
  check('commit swaps the escrowed weapons to the other side',
    psB.weaponStash.some((w) => w.name === 'A-blade') && psA.weaponStash.some((w) => w.name === 'B-bow'),
    { a: psA.weaponStash.map((w) => w.name), b: psB.weaponStash.map((w) => w.name) });
  check('commit clears both escrow records',
    !state._store.get('trade2wpn:' + P('a') + ':' + aSeq2) && !state._store.get('trade2wpn:' + P('b') + ':' + bSeq2));

  // cancel refunds the staged weapon
  psA.weaponStash = [mkW('A2')]; psB.weaponStash = [];
  await cmd(wss.a, 'trade2_open', { target: P('b') });
  await cmd(wss.b, 'trade2_open', { target: P('a') });
  await cmd(wss.a, 'trade2_stage_weapon', { stashIdx: 0 });
  const cSeq = lastState(wss.a).weapons[P('a')][0].seq;
  check('weapon staged out of the stash', psA.weaponStash.length === 0);
  await cmd(wss.a, 'trade2_cancel');
  await new Promise((r) => setTimeout(r, 10)); // fire-and-forget refund
  check('cancel refunds the escrowed weapon to the owner',
    psA.weaponStash.some((w) => w.name === 'A2') && !state._store.get('trade2wpn:' + P('a') + ':' + cSeq),
    psA.weaponStash.map((w) => w.name));

  // disconnect refunds
  psA.weaponStash = [mkW('A3')]; psB.weaponStash = [];
  await cmd(wss.a, 'trade2_open', { target: P('b') });
  await cmd(wss.b, 'trade2_open', { target: P('a') });
  await cmd(wss.a, 'trade2_stage_weapon', { stashIdx: 0 });
  const dSeq = lastState(wss.a).weapons[P('a')][0].seq;
  room._trade2OnDisconnect(P('a'));
  await new Promise((r) => setTimeout(r, 10));
  check('disconnect refunds the escrowed weapon', psA.weaponStash.some((w) => w.name === 'A3') && !state._store.get('trade2wpn:' + P('a') + ':' + dSeq));

  // deploy orphan sweep: an escrow with no live session refunds to the owner
  psA.weaponStash = [];
  await state.storage.put('trade2wpn:' + P('a') + ':9999', { pid: P('a'), sid: 'dead', seq: 9999, weapon: mkW('OrphanBlade'), ts: Date.now() });
  room._lastT2WpnSweep = 0;
  await room._trade2WpnSweep();
  check('deploy sweep refunds an orphaned escrow',
    psA.weaponStash.some((w) => w.name === 'OrphanBlade') && !state._store.get('trade2wpn:' + P('a') + ':9999'));

  // rule 6: sweep never re-refunds a DELIVERED weapon (crash before delete)
  psA.weaponStash = [];
  await room._opStamp('trade2:dead2:wpndeliver:' + P('a') + ':8888');
  await state.storage.put('trade2wpn:' + P('a') + ':8888', { pid: P('a'), sid: 'dead2', seq: 8888, weapon: mkW('DeliveredBlade'), ts: Date.now() });
  room._lastT2WpnSweep = 0;
  await room._trade2WpnSweep();
  check('sweep does NOT re-refund a delivered weapon (rule 6)',
    !psA.weaponStash.some((w) => w.name === 'DeliveredBlade') && !state._store.get('trade2wpn:' + P('a') + ':8888'));

  // rule 3: a refund into a FULL stash parks the weapon in the inbox, never destroyed
  psA.weaponStash = [mkW('f1'), mkW('f2'), mkW('f3'), mkW('f4'), mkW('f5'), mkW('f6'), mkW('f7'), mkW('f8')];
  await state.storage.put('trade2wpn:' + P('a') + ':7777', { pid: P('a'), sid: 'dead3', seq: 7777, weapon: mkW('OverflowBlade'), ts: Date.now() });
  room._lastT2WpnSweep = 0;
  await room._trade2WpnSweep();
  const inboxA = state._store.get('inbox:' + P('a')) || [];
  check('a refund into a full stash parks the weapon in the inbox (rule 3)',
    psA.weaponStash.length === 8 && inboxA.some((e) => e.kind === 'weapon' && e.payload && e.payload.weapon && e.payload.weapon.name === 'OverflowBlade'),
    { stash: psA.weaponStash.length, inbox: inboxA.length });
}

/* ═══ v2.3.1971: THE LIVE LANE, ATTACKED WITH Object.prototype ═══
   trade2 is the trade a player can actually reach (the inspect card's
   Trade button routes here whenever caps.trade2 is set, which is always
   against this worker), so the crafted-key hole was reachable in one
   `trade2_set` from a modified client.  Reproduced end to end before the
   fix: A stages {constructor: 7}, both ready, both confirm, and the
   commit's `(inv[k] || 0) < v` gate passes on goods A does not hold --
   leaving `inventory.constructor = NaN` in A's saved blob and
   `"function Object() { [native code] }7"` in B's.  Both sides, every
   time, persisted by _saveRpg.  Asserted on both halves of the swap and
   on the conservation of the REAL item riding alongside it. */
{
  psA.inventory = { fish_minnow: 6 };
  psB.inventory = { ore_iron_ore: 2 };
  psA.coins = 500; psB.coins = 500;
  const coins0 = psA.coins + psB.coins;
  const fish0 = psA.inventory.fish_minnow;

  await cmd(wss.a, 'trade2_cancel');
  await cmd(wss.b, 'trade2_cancel');
  await cmd(wss.a, 'trade2_open', { target: P('b') });
  await cmd(wss.b, 'trade2_open', { target: P('a') });
  await cmd(wss.a, 'trade2_set', { offer: { constructor: 7, toString: 3, hasOwnProperty: 2, fish_minnow: 2 } });
  await cmd(wss.b, 'trade2_set', { offer: { valueOf: 4, ore_iron_ore: 1 } });

  const live = room._t2SessionFor(P('a'));
  check('a staged offer carries no Object.prototype key across the wire',
    Object.keys(live.offers[P('a')]).join(',') === 'fish_minnow'
      && Object.keys(live.offers[P('b')]).join(',') === 'ore_iron_ore',
    { a: live.offers[P('a')], b: live.offers[P('b')] });

  await bothReady();
  await cmd(wss.a, 'trade2_confirm');
  await cmd(wss.b, 'trade2_confirm');

  check('the swap still settles the REAL items either way',
    psA.inventory.fish_minnow === fish0 - 2 && psB.inventory.fish_minnow === 2
      && psB.inventory.ore_iron_ore === 1 && psA.inventory.ore_iron_ore === 1,
    { a: psA.inventory, b: psB.inventory });
  check('...and neither blob gained a prototype key',
    !Object.prototype.hasOwnProperty.call(psA.inventory, 'constructor')
      && !Object.prototype.hasOwnProperty.call(psA.inventory, 'toString')
      && !Object.prototype.hasOwnProperty.call(psB.inventory, 'constructor')
      && !Object.prototype.hasOwnProperty.call(psB.inventory, 'valueOf'),
    { a: Object.keys(psA.inventory), b: Object.keys(psB.inventory) });
  check('...and every count is still a finite number, not NaN or a string',
    [...Object.values(psA.inventory), ...Object.values(psB.inventory)]
      .every((n) => typeof n === 'number' && Number.isFinite(n)),
    { a: psA.inventory, b: psB.inventory });
  check('coins are conserved across the swap', psA.coins + psB.coins === coins0,
    { a: psA.coins, b: psB.coins, coins0 });
  /* And `toString` shadowed by a string is the crash this really guards:
     anything that stringifies the bag would throw on a poisoned blob. */
  check('the bag still stringifies (a shadowed toString would throw here)',
    (() => { try { return typeof String(psB.inventory) === 'string'; } catch (e) { return false; } })());
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
