/* ═══ v2.3.5812 (card RV PR 12, SEC-F2): A JOIN'S SHIELD AND COSMETIC CLAIMS,
 * ONLY WHAT THE LEDGER BACKS ═══
 * (server/src/gearstash.js "A JOIN'S SHIELD AND COSMETIC CLAIMS")
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), SEC-F2: gearheld (v2.3.5715) closed the
 * join's armour and legs claims; the shield and cosmetic lists were still
 * merged from whatever the phone claimed, so a modified phone could hand a
 * character on file a shield the worker never gave it.  Every honest road
 * that hands out a shield leaves it on the worker (shieldwear.js, v2.3.3091),
 * so now a claim is merged only when it resolves to the player's own ledger.
 *
 *   1. a forged shield claim (no id) is not merged; a forged id is not either;
 *   2. a shield this player's ledger minted, claimed back, is merged, rebuilt
 *      from the ledger's copy (the claim's inflated fields thrown away);
 *   3. a claim of the shield already worn is not merged (no wearable twin);
 *   4. a cosmetic claim is not merged; what is on file stays, shields and
 *      cosmetics alike;
 *   5. `shieldclaim: false`: the forged shield and the cosmetic merged, as
 *      before.
 *
 * Red on main before this change: checks 1a, 1b, 3, 4a and 4b fail.
 * Not a phone test: node, the shared test room (testroom.mjs). */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { RPG_SCHEMA_VERSION } from '../src/migrations.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const ECON = { v: 1, g: { m: 0, b: 0 }, i: {} };
const record = (extra) => ({ _v: RPG_SCHEMA_VERSION, coins: 10, inventory: {}, level: 20, hp: 100, maxHp: 100, _econ: ECON,
  armorStash: [], legsStash: [], shieldStash: [], gearStash: [], amuletStash: [], gearStashCaptured: true, ...(extra || {}) });
const forged = () => ({ name: 'Godly Aegis', gearBase: 'mithril', tierMult: 8, tier: 't8', quality: 'elite' });
const honestOld = () => ({ name: 'Oak Shield', gearBase: 'oak', tierMult: 2, tier: 't2' });
const cosmetic = () => ({ slot: 'hat', gearId: 'hat_crown', name: 'Crown' });

async function quiet(fn) {
  const back = [console.warn, console.error]; console.warn = () => {}; console.error = () => {};
  try { return await fn(); } finally { [console.warn, console.error] = back; }
}
async function joinWith(st, pid, flags, claims) {
  const room = await openRoom(st, flags);
  const ws = fakeWs(pid);
  await quiet(() => join(room, ws, pid, { loginTaken: true, data: { x: 100, y: 100, z: 'town', ...(claims || {}) } }));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  return { room, ws, ps: room.playerState[pid] };
}
/* a shield the worker hands out (the quest's road: minted into the ledger) */
async function mintShield(st, pid) {
  const { room } = await joinWith(st, pid, null, {});
  const piece = { name: 'Pine Shield', gearBase: 'wood', tierMult: 1, tier: 'common' };
  room._gearProvRecord(pid, 'shield', piece, 'quest');
  for (let i = 0; i < 4; i++) await settle();
  return piece;
}

async function run(flags) {
  const out = {};
  {
    const pid = 'bp_rvsc_forg1';
    const st = makeStorage(new Map([['rpg:' + pid, record({ shieldStash: [honestOld()] })]]));
    const { ps } = await joinWith(st, pid, flags, { rpgShieldStash: [forged(), { ...forged(), name: 'Forged Id', gid: 'g_madeup_0001' }], rpgGearStash: [cosmetic()] });
    out.names = ps.shieldStash.map((g) => g.name);
    out.cosm = ps.gearStash.length;
  }
  {
    const pid = 'bp_rvsc_mint1';
    const st = makeStorage(new Map([['rpg:' + pid, record()]]));
    const minted = await mintShield(st, pid);
    const { ps } = await joinWith(st, pid, flags, { rpgShieldStash: [{ ...minted, tierMult: 8, name: 'Pine Shield' }] });
    out.minted = { gid: minted.gid, list: ps.shieldStash.map((g) => ({ gid: g.gid, tierMult: g.tierMult, prov: g.prov })) };
  }
  {
    const pid = 'bp_rvsc_worn1';
    const st = makeStorage(new Map([['rpg:' + pid, record()]]));
    const minted = await mintShield(st, pid);
    const rec = JSON.parse(JSON.stringify(st._store.get('rpg:' + pid) || record()));
    rec.shield = { ...minted };
    rec.shieldStash = [];
    st._store.set('rpg:' + pid, rec);
    const { ps } = await joinWith(st, pid, flags, { rpgShieldStash: [{ ...minted }] });
    out.worn = { shield: ps.shield && ps.shield.gid, stash: ps.shieldStash.length };
  }
  return out;
}

const on = await run(null);
check('1a. a forged shield claim (no id) is not merged', !on.names.includes('Godly Aegis'), on.names);
check('1b. ...nor one with an id this player\'s ledger never minted', !on.names.includes('Forged Id'), on.names);
check('2a. (setup) the minted shield has its ledger id', typeof on.minted.gid === 'string', on.minted);
check('2b. a shield the ledger minted, claimed back, is merged', on.minted.list.length === 1 && on.minted.list[0].gid === on.minted.gid && on.minted.list[0].prov === 'minted', on.minted);
check('2c. ...rebuilt from the ledger\'s copy (the claim\'s tierMult 8 thrown away)', on.minted.list[0] && on.minted.list[0].tierMult === 1, on.minted);
check('3. a claim of the shield already worn is not merged (no wearable twin)', on.worn.shield && on.worn.stash === 0, on.worn);
check('4a. a cosmetic claim is not merged', on.cosm === 0, on.cosm);
check('4b. what is on file stays (the honest old shield)', on.names.length === 1 && on.names[0] === 'Oak Shield', on.names);

const off = await run({ shieldclaim: false });
check('5. `shieldclaim: false`: the forged shield and the cosmetic merged, as before', off.names.includes('Godly Aegis') && off.cosm === 1, off);

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
