/* ═══ v2.3.5710: A PLAYER'S RESTORE SAYS WHAT IT WOULD COPY (card SEC PR 11) ═══
 * (server/src/playerrestore.js "WHAT MOVED SINCE THE COPY"; docs/OPERATIONS.md's restore steps)
 *
 * With `fullsnap` off a copy carries the character only, so restoring one
 * player gave back what they banked since the copy (the vault is never
 * rewound) and what they traded or gifted away; the dry run showed the new
 * total and not why.  Now the answer, dry and real, carries `moved`:
 *   1. the vault NOW when the copy does not carry it, and the ledger's
 *      `xfer:` rows from the copy's day on that name the player as the giver
 *      (not a row from before the copy, not one where they received);
 *   2. the same in the real restore's answer;
 *   3. nothing moved (the copy carries the vault, no row gives): no `moved`
 *      field, the answer as before;
 *   4. the copy's day read from its key (a daily copy's, a prereset-'s).
 * The sitting 38 review's three:
 *   5. what the player PAID as the row's other side (`price`: a trade
 *      window's side b, a market's buyer) is named too;
 *   6. ids handed over (a pet, a weapon) are named, not dropped;
 *   7. rows before the copy's own time (the same day) are not "since": a
 *      prereset- copy's time from its key, a daily copy's from
 *      `rpgsnap_at:` when it is that day's (else the day's start, exact
 *      false).
 * Reads only: nothing written by the dry run.
 *
 * BREAK PROOF (rule 8), tried by hand: main's playerrestore.js -> FAIL 1, 2.
 * Not a phone test: node, the shared test room (testroom.mjs). */
import { GameRoom } from '../src/index.js';
import * as PR from '../src/playerrestore.js';
import { makeStorage, mockEnv } from './testroom.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const P = 'bp_rm_p', Q = 'bp_rm_q';
const SNAP = 'rpgsnap:' + P + ':20261101';
const ECON = { v: 1, g: { m: 0, b: 0 }, i: {} };
const THEN = { _v: 22, coins: 500, inventory: { wood_oak: 2 }, level: 5, hp: 100, maxHp: 100, _econ: ECON };
const NOW_REC = { _v: 22, coins: 1000, inventory: { wood_oak: 1 }, level: 6, hp: 100, maxHp: 100, _econ: ECON };
const VAULT = { _v: 1, gold: 700, items: [{ key: 'wood_oak', n: 5 }], ops: [] };
const row = (day, id, from, to, gold, goods, more) => ['xfer:' + day + ':' + id, { v: 1, at: Date.UTC(2026, 10, Number(day.slice(6))), day, road: 'trade_window', from, to, gold, goods: goods || {}, ids: [], price: { gold: 0, goods: {}, ids: [] }, ...(more || {}) }];
function seed(extra) {
  return new Map([
    ['rpg:' + P, NOW_REC], ['bank:' + P, VAULT], [SNAP, THEN],
    row('20261031', 't0', P, Q, 50),             /* before the copy: not moved since */
    row('20261102', 't1', P, Q, 300, { fish_minnow: 2 }),
    row('20261103', 't2', Q, P, 40),             /* P received: not given */
    ...(extra || []),
  ]);
}

/* 1. the dry run */
{
  const st = makeStorage(seed());
  const room = new GameRoom(st, mockEnv);
  const b0 = st.batches();
  const dry = await PR.playerRestore(room, { playerId: P, snapKey: SNAP, dry: true }, 1_800_000_000_000);
  check('1. the dry run answers ok and writes nothing', dry.status === 200 && dry.ok && dry.dry && st.batches() === b0, { status: dry.status, b: st.batches() - b0 });
  const m = dry.moved || {};
  check('1. moved.vault: the vault now (700 gold, 5 oak), as the copy carries none', m.vault && m.vault.gold === 700 && m.vault.items.length === 1 && m.vault.items[0].key === 'wood_oak' && m.vault.items[0].n === 5, m);
  check('1. moved.given: the gift since the copy (300 gold and 2 minnows to Q), not the one before it nor the one received',
    Array.isArray(m.given) && m.given.length === 1 && m.given[0].key === 'xfer:20261102:t1' && m.given[0].to === Q && m.given[0].gold === 300 && m.given[0].goods.fish_minnow === 2, m.given);
}

/* 2. the real restore */
{
  const st = makeStorage(seed());
  const room = new GameRoom(st, mockEnv);
  const real = await PR.playerRestore(room, { playerId: P, snapKey: SNAP }, 1_800_000_000_000);
  check('2. the real restore\'s answer carries the same moved', real.status === 200 && !real.dry && real.moved && real.moved.vault && real.moved.vault.gold === 700 && real.moved.given && real.moved.given.length === 1, real.moved);
  check('2. ...and the restore itself as before (the purse the copy\'s, the vault untouched)', st._store.get('rpg:' + P).coins === 500 && st._store.get('bank:' + P).gold === 700);
}

/* 3. nothing moved */
{
  const withVault = { ...THEN, _with: { 'bank:': VAULT, 'pets:': null } };
  const st = makeStorage(new Map([['rpg:' + P, NOW_REC], ['bank:' + P, VAULT], [SNAP, withVault]]));
  const room = new GameRoom(st, mockEnv);
  const dry = await PR.playerRestore(room, { playerId: P, snapKey: SNAP, dry: true }, 1_800_000_000_000);
  check('3. nothing moved (the copy carries the vault, no row gives): no moved field', dry.ok && !('moved' in dry), dry.moved);
}

/* 4. the copy's day */
{
  const cd = PR.copyDay || (() => 'missing');
  check('4. the copy\'s day from its key', cd(SNAP) === '20261101' && cd('rpgsnap:' + P + ':prereset-' + Date.UTC(2026, 10, 5, 3)) === '20261105' && cd('rpgsnap:' + P + ':odd') === null);
}

/* 5 + 6. the paying side, and ids */
{
  const extra = [
    row('20261104', 't3', Q, P, 0, { fish_minnow: 1 }, { price: { gold: 300, goods: {}, ids: ['pet:p_owl'] } }),   /* P as side b paid 300 and a pet */
    row('20261105', 't4', P, Q, 0, {}, { road: 'gift_trade', ids: ['pet:p_cat'] }),                                /* P gifted a pet */
  ];
  const st = makeStorage(seed(extra));
  const room = new GameRoom(st, mockEnv);
  const dry = await PR.playerRestore(room, { playerId: P, snapKey: SNAP, dry: true }, 1_800_000_000_000);
  const g = (dry.moved && dry.moved.given) || [];
  const paid = g.find((x) => x.key === 'xfer:20261104:t3');
  check('5. what P PAID as the other side (300 gold and a pet, to Q) is named', !!paid && paid.to === Q && paid.gold === 300 && paid.ids.includes('pet:p_owl') && !paid.goods.fish_minnow, paid);
  check('5. ...and a row where P only received is still not (t2)', !g.some((x) => x.key === 'xfer:20261103:t2'), g.map((x) => x.key));
  const gift = g.find((x) => x.key === 'xfer:20261105:t4');
  check('6. a gifted pet is named by its id', !!gift && gift.road === 'gift_trade' && Array.isArray(gift.ids) && gift.ids.length === 1 && gift.ids[0] === 'pet:p_cat', gift);
}

/* 7. the copy's own time */
{
  const copyAt = Date.UTC(2026, 10, 2, 15);
  const PRE = 'rpgsnap:' + P + ':prereset-' + copyAt;
  const at = (h) => ({ at: Date.UTC(2026, 10, 2, h) });
  const s1 = makeStorage(new Map([['rpg:' + P, NOW_REC], ['bank:' + P, VAULT], [PRE, THEN],
    row('20261102', 'm10', P, Q, 11, {}, at(10)), row('20261102', 'm16', P, Q, 16, {}, at(16))]));
  const d1 = await PR.playerRestore(new GameRoom(s1, mockEnv), { playerId: P, snapKey: PRE, dry: true }, 1_800_000_000_000);
  const k1 = ((d1.moved && d1.moved.given) || []).map((x) => x.key);
  check('7. a prereset- copy at 15:00: the 10:00 trade that day is not since, the 16:00 one is', k1.length === 1 && k1[0] === 'xfer:20261102:m16' && d1.moved.givenSince.at === copyAt && d1.moved.givenSince.exact === true, d1.moved);
  const DAILY = 'rpgsnap:' + P + ':20261102';
  const s2 = makeStorage(new Map([['rpg:' + P, NOW_REC], ['bank:' + P, VAULT], [DAILY, THEN], ['rpgsnap_at:' + P, copyAt],
    row('20261102', 'm10', P, Q, 11, {}, at(10)), row('20261102', 'm16', P, Q, 16, {}, at(16))]));
  const d2 = await PR.playerRestore(new GameRoom(s2, mockEnv), { playerId: P, snapKey: DAILY, dry: true }, 1_800_000_000_000);
  const k2 = ((d2.moved && d2.moved.given) || []).map((x) => x.key);
  check('7. a daily copy whose time `rpgsnap_at:` holds: the same', k2.length === 1 && k2[0] === 'xfer:20261102:m16' && d2.moved.givenSince.exact === true, d2.moved);
  const s3 = makeStorage(new Map([['rpg:' + P, NOW_REC], ['bank:' + P, VAULT], [DAILY, THEN], ['rpgsnap_at:' + P, Date.UTC(2026, 10, 9, 8)],
    row('20261102', 'm10', P, Q, 11, {}, at(10))]));
  const d3 = await PR.playerRestore(new GameRoom(s3, mockEnv), { playerId: P, snapKey: DAILY, dry: true }, 1_800_000_000_000);
  check('7. an older daily copy: from its day\'s start, and the answer says it is not exact', d3.moved && d3.moved.given.length === 1 && d3.moved.givenSince.exact === false && d3.moved.givenSince.at === Date.UTC(2026, 10, 2), d3.moved);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
