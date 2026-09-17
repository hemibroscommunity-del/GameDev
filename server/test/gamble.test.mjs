/* Server-settled gambling test (v2.3.1124, Wave 2 PR8).
 * The roll used to be the player's own Math.random() with a local 2x
 * self-credit (GamblePanel.jsx:111-119).  The server now rolls and
 * settles in ONE mutation on live state (no escrow, no crash window --
 * see ARCHITECTURE-HANDOFF.md rule 8).  Checks:
 *   1. caps.gamble advertised in state_sync.
 *   2. A win pays +wager (net) and a loss pays -wager; exactly one
 *      gamble_result per request; result reports payout = 2x wager on
 *      wins, 0 on losses.  (Outcome forced by stubbing Math.random.)
 *   3. Wager clamps: below 10, above 10000, non-numeric, and
 *      insufficient-coins requests are ignored (no coins change, no
 *      result event).
 *   4. Rate limit: a second request inside 2s is ignored.
 *   5. Dead players can't gamble.
 *   6. A forged client 'gamble_result' is NOT rebroadcast (deny-list).
 *
 * v2.3.2618 adds Ace's coin flip (same mixin, different numbers):
 *   7. caps.aceFlip advertised in state_sync.
 *   8. A win pays +3x the stake, a loss takes -3x; one ace_flip_result each.
 *   9. THE BOUND IS THE LOSS, not the stake: 3*stake must be affordable.
 *      A stake the player could cover but not lose 3x of is refused, and
 *      the maximum legal stake (exactly coins/3) is accepted and can be
 *      lost to exactly zero -- never below it.
 *  10. Stake clamps: under the minimum, non-numeric, zero, negative.
 *  11. Rate limit, 12. dead players, 13. forged result not rebroadcast.
 *
 * v2.3.2619 adds the item wager and the hall of fame:
 *  14. caps.aceItems advertised.
 *  15. An item wager DOUBLES every staked stack on a win and removes it on a
 *      loss; the result names what was actually staked.
 *  16. THE STAKE IS THE SERVER'S BAG, NOT THE REQUEST (rule 16): asking for
 *      more than is held stakes only what is held, and a key the player does
 *      not have is ignored entirely.
 *  17. PROTO SAFETY (rule 4): a wager naming '__proto__' / 'constructor' /
 *      'prototype' is refused and cannot poison the inventory map.
 *  18. The board records the biggest single win and loss, keeps ONE row per
 *      player (their best), sorts descending, and carries a `look` for the pfp.
 */
import { GameRoom } from '../src/index.js';

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

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const roll = (ws, wager) => room.webSocketMessage(ws, JSON.stringify({ type: 'gamble_request', payload: { wager } }));

const ws = fakeWs('g');
await join(ws, 'bp_gamble_p');
const ps = room.playerState['bp_gamble_p'];
ps.coins = 1000;

// ── 1. caps ──
const sync = ws.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.gamble', sync && sync.caps && sync.caps.gamble === true, sync && sync.caps);

// ── 2. forced win, forced loss ──
const realRandom = Math.random;
Math.random = () => 0.0; // < 0.40 => win
ws.sent.length = 0;
await roll(ws, 100);
let res = msgsOfType(ws, 'gamble_result');
check('forced win nets +wager and reports 2x payout', ps.coins === 1100 && res.length === 1 && res[0].payload.won === true && res[0].payload.payout === 200, { coins: ps.coins, res: res.map((r) => r.payload) });

ps._lastGambleAt = 0; // bypass rate limit between test sections
Math.random = () => 0.99; // >= 0.40 => loss
ws.sent.length = 0;
await roll(ws, 100);
res = msgsOfType(ws, 'gamble_result');
check('forced loss nets -wager and reports payout 0', ps.coins === 1000 && res.length === 1 && res[0].payload.won === false && res[0].payload.payout === 0, { coins: ps.coins, res: res.map((r) => r.payload) });
Math.random = realRandom;

// ── 3. clamps + insufficient funds ──
for (const bad of [5, 10001, 'lol', -50, 0]) {
  ps._lastGambleAt = 0;
  ws.sent.length = 0;
  await roll(ws, bad);
  if (ps.coins !== 1000 || msgsOfType(ws, 'gamble_result').length !== 0) {
    check('bad wager ignored: ' + bad, false, { coins: ps.coins });
  }
}
check('all bad wagers ignored (no delta, no result)', ps.coins === 1000);
ps._lastGambleAt = 0;
ps.coins = 50;
ws.sent.length = 0;
await roll(ws, 100);
check('insufficient coins ignored', ps.coins === 50 && msgsOfType(ws, 'gamble_result').length === 0, ps.coins);

// ── 4. rate limit ──
ps.coins = 1000;
ps._lastGambleAt = 0;
Math.random = () => 0.99; // deterministic losses
await roll(ws, 10);
ws.sent.length = 0;
await roll(ws, 10); // inside 2s window
check('second roll inside 2s ignored', ps.coins === 990 && msgsOfType(ws, 'gamble_result').length === 0, ps.coins);
Math.random = realRandom;

// ── 5. dead players can't gamble ──
ps._lastGambleAt = 0;
ps.dying = true;
ws.sent.length = 0;
await roll(ws, 100);
check('dead player roll ignored', ps.coins === 990 && msgsOfType(ws, 'gamble_result').length === 0);
ps.dying = false;

// ── 6. forged gamble_result not rebroadcast ──
const ws2 = fakeWs('peer');
await join(ws2, 'bp_gamble_peer');
room.eventBuffer.length = 0;
await room.webSocketMessage(ws2, JSON.stringify({ type: 'gamble_result', payload: { won: true, wager: 9999, payout: 19998 } }));
check('forged gamble_result dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'gamble_result').length === 0, room.eventBuffer.map((e) => e.type));

/* ═══ v2.3.2618: ACE'S COIN FLIP ═══ */
const flip = (w, stake) => room.webSocketMessage(w, JSON.stringify({ type: 'ace_flip_request', payload: { stake } }));
const aws = fakeWs('ace');
await join(aws, 'bp_ace_p');
const aps = room.playerState['bp_ace_p'];
aps.coins = 900;

// ── 7. caps ──
const async_ = aws.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.aceFlip', async_ && async_.caps && async_.caps.aceFlip === true, async_ && async_.caps);

// ── 8. forced win / forced loss pay 3x ──
Math.random = () => 0.0; // < 0.45 => player wins
aws.sent.length = 0;
await flip(aws, 100);
let ares = msgsOfType(aws, 'ace_flip_result');
check('forced win pays +3x stake', aps.coins === 1200 && ares.length === 1 && ares[0].payload.won === true && ares[0].payload.delta === 300, { coins: aps.coins, res: ares.map((r) => r.payload) });

aps._lastAceFlipAt = 0;
Math.random = () => 0.99; // >= 0.45 => Ace wins
aws.sent.length = 0;
await flip(aws, 100);
ares = msgsOfType(aws, 'ace_flip_result');
check('forced loss takes -3x stake', aps.coins === 900 && ares.length === 1 && ares[0].payload.won === false && ares[0].payload.delta === -300, { coins: aps.coins, res: ares.map((r) => r.payload) });

// ── 9. THE BOUND IS THE LOSS, NOT THE STAKE ──
// 400 is affordable as a stake against 900 coins but 3x it (1200) is not.
// A handler that gated on `stake > coins` would accept this and owe 300.
aps._lastAceFlipAt = 0;
aws.sent.length = 0;
await flip(aws, 400);
check('stake whose 3x loss is unaffordable is refused', aps.coins === 900 && msgsOfType(aws, 'ace_flip_result').length === 0, aps.coins);

// exactly coins/3 IS legal, and losing it lands on exactly zero
aps._lastAceFlipAt = 0;
Math.random = () => 0.99;
aws.sent.length = 0;
await flip(aws, 300);
check('max legal stake (coins/3) loses to exactly zero, never below', aps.coins === 0 && msgsOfType(aws, 'ace_flip_result').length === 1, aps.coins);
Math.random = realRandom;

// ── 10. stake clamps ──
aps.coins = 900;
for (const bad of [5, 0, -50, 'lol', null]) {
  aps._lastAceFlipAt = 0;
  aws.sent.length = 0;
  await flip(aws, bad);
  if (aps.coins !== 900 || msgsOfType(aws, 'ace_flip_result').length !== 0) {
    check('bad stake ignored: ' + bad, false, { coins: aps.coins });
  }
}
check('all bad stakes ignored (no delta, no result)', aps.coins === 900);

// ── 11. rate limit ──
aps._lastAceFlipAt = 0;
Math.random = () => 0.99;
await flip(aws, 10);
aws.sent.length = 0;
await flip(aws, 10); // inside the 2s window
check('second flip inside 2s ignored', aps.coins === 870 && msgsOfType(aws, 'ace_flip_result').length === 0, aps.coins);
Math.random = realRandom;

// ── 12. dead players can't flip ──
aps._lastAceFlipAt = 0;
aps.dying = true;
aws.sent.length = 0;
await flip(aws, 100);
check('dead player flip ignored', aps.coins === 870 && msgsOfType(aws, 'ace_flip_result').length === 0);
aps.dying = false;

// ── 13. forged ace_flip_result not rebroadcast ──
room.eventBuffer.length = 0;
await room.webSocketMessage(ws2, JSON.stringify({ type: 'ace_flip_result', payload: { won: true, stake: 9999, delta: 29997 } }));
check('forged ace_flip_result dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'ace_flip_result').length === 0, room.eventBuffer.map((e) => e.type));

/* ═══ v2.3.2619: ITEM WAGER + HALL OF FAME ═══ */
const iflip = (w, items) => room.webSocketMessage(w, JSON.stringify({ type: 'ace_item_flip_request', payload: { items } }));
const iws = fakeWs('items');
await join(iws, 'bp_ace_items');
const ips = room.playerState['bp_ace_items'];

// ── 14. caps ──
const isync = iws.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.aceItems', isync && isync.caps && isync.caps.aceItems === true, isync && isync.caps);

// ── 15. win doubles, loss removes ──
ips.inventory = { wood_oak: 4, fish_bass: 2 };
ips._lastAceFlipAt = 0;
Math.random = () => 0.0;   // player wins
iws.sent.length = 0;
await iflip(iws, { wood_oak: 4, fish_bass: 2 });
let ires = msgsOfType(iws, 'ace_item_flip_result');
check('item win doubles every staked stack', ips.inventory.wood_oak === 8 && ips.inventory.fish_bass === 4 && ires.length === 1 && ires[0].payload.won === true && ires[0].payload.total === 6, { inv: ips.inventory, res: ires.map((r) => r.payload) });

ips.inventory = { wood_oak: 4, fish_bass: 2 };
ips._lastAceFlipAt = 0;
Math.random = () => 0.99;  // Ace wins
iws.sent.length = 0;
await iflip(iws, { wood_oak: 4, fish_bass: 2 });
check('item loss removes the staked stacks entirely', ips.inventory.wood_oak === undefined && ips.inventory.fish_bass === undefined, ips.inventory);

// a PARTIAL loss leaves the remainder
ips.inventory = { wood_oak: 10 };
ips._lastAceFlipAt = 0;
await iflip(iws, { wood_oak: 4 });
check('partial item loss leaves the rest of the stack', ips.inventory.wood_oak === 6, ips.inventory);
Math.random = realRandom;

// ── 16. the stake is the server's bag, not the request ──
ips.inventory = { wood_oak: 3 };
ips._lastAceFlipAt = 0;
Math.random = () => 0.0;
iws.sent.length = 0;
await iflip(iws, { wood_oak: 999, ghost_item: 50 });
ires = msgsOfType(iws, 'ace_item_flip_result');
check('over-ask is clamped to what is held; an unheld key is ignored', ips.inventory.wood_oak === 6 && ips.inventory.ghost_item === undefined && ires[0].payload.total === 3, { inv: ips.inventory, res: ires[0] && ires[0].payload });

// ── 17. proto safety (rule 4) ──
ips.inventory = { wood_oak: 2 };
ips._lastAceFlipAt = 0;
iws.sent.length = 0;
await iflip(iws, { __proto__: 5, constructor: 5, prototype: 5 });
const protoClean = ips.inventory.wood_oak === 2
  && msgsOfType(iws, 'ace_item_flip_result').length === 0
  && ({}).polluted === undefined
  && Object.prototype.polluted === undefined;
check('proto keys refused and the prototype is unpolluted', protoClean, { inv: ips.inventory });
Math.random = realRandom;

// ── 18. the hall of fame ──
const bps = room.playerState['bp_ace_p'];
await room.state.storage.put('char:bp_ace_p', { name: 'Acey', look: { skin: 'tan', hair: 'mop' } });
await room.state.storage.delete('ace_board');
bps.coins = 3000; bps._lastAceFlipAt = 0; bps.dying = false;
Math.random = () => 0.0;   // win 3x100 = 300
aws.sent.length = 0;
await flip(aws, 100);
bps._lastAceFlipAt = 0;
await flip(aws, 300);      // a BIGGER win, 900 -- should replace, not stack
let board = await room.state.storage.get('ace_board');
check('board records the win, one row per player, best kept', board && board.wins.length === 1 && board.wins[0].amount === 900 && board.wins[0].pid === 'bp_ace_p', board && board.wins);
check('board row carries the name and the look for the pfp', board && board.wins[0].name === 'Acey' && board.wins[0].look && board.wins[0].look.skin === 'tan', board && board.wins[0]);

bps._lastAceFlipAt = 0;
Math.random = () => 0.99;  // a loss
await flip(aws, 200);      // -600
board = await room.state.storage.get('ace_board');
check('losses land on their own board as a positive amount', board && board.losses.length === 1 && board.losses[0].amount === 600, board && board.losses);
Math.random = realRandom;

// the board is pushed to the asking client
aws.sent.length = 0;
await room.webSocketMessage(aws, JSON.stringify({ type: 'ace_board_request', payload: {} }));
await new Promise((r) => setTimeout(r, 10));
check('ace_board_request answers with the board', msgsOfType(aws, 'ace_board').length === 1, aws.sent.map((m) => m.type));

// ── forged board / item result not rebroadcast ──
room.eventBuffer.length = 0;
await room.webSocketMessage(ws2, JSON.stringify({ type: 'ace_board', payload: { wins: [{ name: 'HACKER', amount: 99999 }] } }));
await room.webSocketMessage(ws2, JSON.stringify({ type: 'ace_item_flip_result', payload: { won: true } }));
check('forged ace_board / ace_item_flip_result dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'ace_board' || e.type === 'ace_item_flip_result').length === 0, room.eventBuffer.map((e) => e.type));

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
