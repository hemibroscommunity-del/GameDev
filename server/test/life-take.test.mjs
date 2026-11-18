/* ═══ v2.3.5920: THE DEAD TAKE NOTHING (card V3 PR 1, TRAPS §150) ═══
 *
 * TRAPS §150: "A new value-moving handler copies the full preamble its
 * siblings have" -- a dying player bought at Diego's counter, and the
 * respawn wiped the purchase.  V2's guard (tools/guards/traps-money.test.mjs)
 * found nine handlers that take from a player and read no life phase on the
 * way.  Each now asks the life door (`lifeOf(ps)`, life.js) and refuses in
 * the dying seconds, answered as its client already knows.  This holds, for
 * each, through its real message:
 *
 *   1. the switch: `deadtake` is on with no flag, off only with `false`;
 *   2. cooking: a dying cook keeps the fish (the bag sent again); alive cooks;
 *   3. the armour grid: a dying armour swap is refused, the stash keeps the
 *      piece (the worn pieces sent again); alive it goes on;
 *   4. the farm: a dying plant, buy and delivery each answered `dead`,
 *      nothing taken (they refused before, in silence: not behind the
 *      switch); alive each takes;
 *   5. salvage and essence: the same; alive each works;
 *   6. a shield put on: nothing moves (`dead`), the shield sent again; alive
 *      it leaves the bag list;
 *   7. the pet house: `not-now`, no gold taken; alive it buys;
 *   8. `deadtake: false`: a dying pet house buy takes the gold, as before;
 *      a dying farm buy is still refused (it was before the card). */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { ARMOR_FORGE } from '../src/armorforge.js';
import { FARM } from '../src/farm.js';
import { PETBOOK, petHousePrice } from '../src/petbook.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}

async function setup(flags, pid) {
  /* `cookstart: false`: a cook's result needs no started cook here (its own
     suite, cookstart-on, holds that); the life read runs before it */
  const room = await openRoom(makeStorage(), Object.assign({ cookstart: false }, flags || {}));
  const ws = fakeWs('d');
  const PID = pid || 'bp_deadtake';
  await join(room, ws, PID, { loginTaken: true });
  const ps = room.playerState[PID];
  const session = room.sessions.get(ws);
  const send = async (type, payload) => { ws.sent.length = 0; await room.webSocketMessage(ws, JSON.stringify({ type, payload })); await settle(); };
  const last = (type) => { const m = ws.sent.filter((x) => x.type === type); return m.length ? m[m.length - 1].payload : null; };
  const die = () => room._lifeTo(ps, 'dying', 'death');
  const live = () => room._lifeTo(ps, 'alive', 'respawn');
  const level = (skill, lvl) => { if (!ps.lifeSkills) ps.lifeSkills = {}; ps.lifeSkills[skill] = { level: lvl, xp: 0 }; };
  return { room, ws, ps, session, PID, send, last, die, live, level };
}

const t = await setup();
const { room, ps } = t;
const inv = () => ps.inventory;
const sentState = () => t.ws.sent.some((m) => m.type === 'player_state');

/* a piece of armour the worker minted (the ledger's), the real route */
room._rollWeaponQuality = () => 'normal';
const forge = async (recipe) => {
  const r = ARMOR_FORGE.RECIPES[recipe];
  t.level('blacksmithing', Math.max(r.minLvl, 10));
  inv()[r.bar] = (inv()[r.bar] || 0) + r.bars;
  await t.send('forge_armor', { recipe });
  const m = t.last('forge_armor_result');
  return m ? m.piece : null;
};

// ── 1. the switch ──
{
  const off = await setup({ deadtake: false }, 'bp_deadtake_off');
  check('1. `deadtake` is on with no flag', room._deadTakeOn() === true);
  check('1. ...off with `deadtake: false`', off.room._deadTakeOn() === false);
}

// ── 2. cooking ──
{
  inv().fish_minnow = 5;
  t.level('cooking', 1);
  ps._cookHistory = []; ps._lastCookAt = 0;
  t.die();
  await t.send('cook_request', { fishKey: 'fish_minnow', kind: 'cooked', taps: [] });
  check('2. a dying cook: the fish stays, nothing cooked', inv().fish_minnow === 5 && !(inv().cooked_fish_minnow > 0), inv());
  check('2. ...answered: the bag sent again', sentState(), t.ws.sent.map((m) => m.type));
  t.live();
  inv().fish_minnow = 5;
  ps._cookHistory = []; ps._lastCookAt = 0;
  await t.send('cook_request', { fishKey: 'fish_minnow', kind: 'cooked', taps: [] });
  check('2. alive, the same cook takes the fish', inv().fish_minnow === 4, inv());
}

// ── 3. the armour grid (stats_update's armour swap) ──
{
  const piece = await forge('copper_torso');
  check('3. a copper torso forged (the piece to put on)', !!piece && !!piece.gid, piece);
  ps.armor = null;
  ps.armorStash = [{ ...piece }];
  t.die();
  await t.send('stats_update', { armorRef: piece.gid });
  check('3. a dying armour swap is refused: nothing worn, the stash keeps it', !ps.armor && ps.armorStash.length === 1, { armor: ps.armor, stash: ps.armorStash });
  check('3. ...answered: the worn pieces sent again', sentState(), t.ws.sent.map((m) => m.type));
  t.live();
  ps.armor = null;
  ps.armorStash = [{ ...piece }];
  await t.send('stats_update', { armorRef: piece.gid });
  check('3. alive, it goes on and leaves the stash', !!ps.armor && ps.armor.gid === piece.gid && ps.armorStash.length === 0, { armor: ps.armor, stash: ps.armorStash });
}

// ── 4. the farm ──
{
  t.level('farming', 1); t.level('cooking', 1);
  await t.send('farm_open', {});
  await t.send('farm_act', { op: 'dig', beds: [0, 1] });
  const crop = FARM.CROPS.carrot;
  inv()[crop.seed] = 3;
  const farmState = () => t.last('farm_state');

  t.die();
  await t.send('farm_act', { op: 'plant', beds: [0], crop: 'carrot' });
  let fs = farmState();
  check('4. a dying plant: answered `dead`, the seeds kept', !!fs && fs.err === 'dead' && fs.did && fs.did.n === 0 && inv()[crop.seed] === 3, { fs, seeds: inv()[crop.seed] });
  t.live();
  await t.send('farm_act', { op: 'plant', beds: [0], crop: 'carrot' });
  fs = farmState();
  check('4. alive, the seed is planted', !!fs && !fs.err && inv()[crop.seed] === 2, { fs, seeds: inv()[crop.seed] });

  ps.coins = 100;
  t.die();
  await t.send('farm_buy', { item: crop.seed, count: 1 });
  fs = farmState();
  check('4. a dying farm buy: answered `dead`, no gold taken, no seed', !!fs && fs.err === 'dead' && ps.coins === 100 && inv()[crop.seed] === 2, { fs, coins: ps.coins });
  t.live();
  await t.send('farm_buy', { item: crop.seed, count: 1 });
  check('4. alive, it buys', ps.coins === 100 - crop.price && inv()[crop.seed] === 3, { coins: ps.coins, seeds: inv()[crop.seed] });

  await t.send('farm_open', {});
  const board = farmState() && farmState().orders;
  check('4. today\'s order board is open', !!board && Array.isArray(board.list) && board.list.length > 0, board);
  if (board && board.list.length) {
    const o = board.list[0];
    inv()[o.key] = o.n;
    t.die();
    await t.send('farm_order', { slot: 0, day: board.day, id: o.id });
    fs = farmState();
    check('4. a dying delivery: answered `dead`, the goods kept', !!fs && fs.err === 'dead' && inv()[o.key] === o.n, { fs, have: inv()[o.key] });
    t.live();
    await t.send('farm_order', { slot: 0, day: board.day, id: o.id });
    check('4. alive, the order takes them', (inv()[o.key] || 0) === 0, { fs: farmState(), have: inv()[o.key] });
  }
}

// ── 5. salvage and essence ──
{
  const piece = await forge('copper_torso');
  ps.armorStash = [{ ...piece }];
  ps._lastSalvageAt = 0;
  t.die();
  await t.send('smith_salvage', { field: 'armorStash', gid: piece.gid });
  let r = t.last('smith_salvage_result');
  check('5. a dying salvage: answered `dead`, the piece kept', !!r && r.ok === false && r.reason === 'dead' && ps.armorStash.length === 1, r);
  t.live();
  ps._lastSalvageAt = 0;
  await t.send('smith_salvage', { field: 'armorStash', gid: piece.gid });
  r = t.last('smith_salvage_result');
  check('5. alive, it salvages', !!r && r.ok === true && ps.armorStash.length === 0, r);

  const p2 = await forge('copper_torso');
  ps.armorStash = [{ ...p2 }];
  inv().essence_rare_copper = 1;
  ps._lastSalvageAt = 0;
  t.die();
  await t.send('essence_apply', { essence: 'essence_rare_copper', field: 'armorStash', gid: p2.gid });
  r = t.last('essence_result');
  check('5. a dying essence: answered `dead`, the essence kept', !!r && r.ok === false && r.reason === 'dead' && inv().essence_rare_copper === 1, r);
  t.live();
  ps._lastSalvageAt = 0;
  await t.send('essence_apply', { essence: 'essence_rare_copper', field: 'armorStash', gid: p2.gid });
  r = t.last('essence_result');
  check('5. alive, it is used', !!r && r.ok === true && !(inv().essence_rare_copper > 0), r);

  const off = await setup({ deadtake: false }, 'bp_deadtake_off5');
  off.ps._lastSalvageAt = 0;
  off.die();
  await off.send('smith_salvage', { field: 'armorStash', gid: 'nope' });
  r = off.last('smith_salvage_result');
  check('5. ...refused with `deadtake: false` too (it refused before the card)', !!r && r.ok === false && r.reason === 'dead', r);
}

// ── 6. a shield put on ──
{
  const shield = { name: 'Iron Shield', gearBase: 'iron', tierMult: 1, tier: 2 };
  const sig = [shield.name, shield.gearBase, shield.tierMult, shield.tier].join('|');
  ps.shield = null;
  ps.shieldStash = [{ ...shield }];
  t.die();
  t.ws.sent.length = 0;
  const a = room._handleShieldWear(t.session, { sig });
  check('6. a dying shield put on: nothing moves', a === 'dead' && !ps.shield && ps.shieldStash.length === 1, { a, shield: ps.shield, stash: ps.shieldStash });
  check('6. ...answered: the shield sent again', sentState(), t.ws.sent.map((m) => m.type));
  t.live();
  ps.shield = null;
  ps.shieldStash = [{ ...shield }];
  const b = room._handleShieldWear(t.session, { sig });
  check('6. alive, it leaves the bag list for the arm', b === 'worn' && !!ps.shield && ps.shieldStash.length === 0, { b, shield: ps.shield, stash: ps.shieldStash });
}

// ── 7. the pet house ──
{
  const book = room._petbookOf(t.PID);
  check('7. the pet book is loaded', !!book && !!book.rec, book);
  if (book && book.rec) {
    book.rec.cap = PETBOOK.CAP;
    book.acts = [];
    const price = petHousePrice(PETBOOK.CAP);
    ps.coins = price + 10;
    t.die();
    await t.send('pet_house_buy', { cap: PETBOOK.CAP, confirm: true });
    let r = t.last('pets_state');
    check('7. a dying pet house buy: `not-now`, no gold taken', !!r && r.error === 'not-now' && ps.coins === price + 10 && book.rec.cap === PETBOOK.CAP, { r, coins: ps.coins });
    t.live();
    book.rec.cap = PETBOOK.CAP;
    book.acts = [];
    ps.coins = price + 10;
    await t.send('pet_house_buy', { cap: PETBOOK.CAP, confirm: true });
    r = t.last('pets_state');
    check('7. alive, it buys', !!r && !r.error && ps.coins === 10 && book.rec.cap > PETBOOK.CAP, { r, coins: ps.coins });
  }
}

// ── 8. `deadtake: false`: as before ──
{
  const off = await setup({ deadtake: false }, 'bp_deadtake_off8');
  const book = off.room._petbookOf(off.PID);
  if (book && book.rec) {
    book.rec.cap = PETBOOK.CAP;
    book.acts = [];
    const price = petHousePrice(PETBOOK.CAP);
    off.ps.coins = price;
    off.die();
    await off.send('pet_house_buy', { cap: PETBOOK.CAP, confirm: true });
    check('8. `deadtake: false`: a dying pet house buy takes the gold, as before', off.ps.coins === 0 && book.rec.cap > PETBOOK.CAP, { coins: off.ps.coins, cap: book.rec.cap });
  } else check('8. the pet book is loaded', false);
  off.level('farming', 1);
  off.ps.coins = 100;
  await off.send('farm_buy', { item: FARM.CROPS.carrot.seed, count: 1 });
  const fs = off.last('farm_state');
  check('8. ...a dying farm buy is still refused (it was before the card), now answered', off.ps.coins === 100 && !!fs && fs.err === 'dead', { coins: off.ps.coins, fs });
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
