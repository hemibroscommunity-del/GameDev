/* A WEAPON NAMED BY ITS ID, NEVER BY ITS PLACE -- v2.3.5196 (server/src/
 * gidnames.js; grand plan step 11.3, step 3; card K PR 11; docs/specs/
 * gid-names.md).
 *   1. BY ITS ID: the stash moved under the tap (the weapon at the place sent
 *      is another now): the request with the id is refused, not the next
 *      weapon sold; the id alone sells the weapon it names.  BREAK PROOF: the
 *      same request with no id (an older phone) sells the weapon now at that
 *      place.
 *   2. ID AND PLACE DISAGREE: the weapon is still there but the place sent is
 *      another weapon's -- refused, nothing sold; an id no weapon has --
 *      refused.
 *   3. THE OTHERS read it the same way: equip, the market's sell order, the
 *      store's listing, salvage (one each through the real handler).
 *   4. THE CAP: caps.gidnames, gone with `gidnames: false`; and the action
 *      door adds the id of the weapon at the place it sends (GID_PLACE).
 *   5. THE SWITCH: `gidnames: false` -- the place alone, as before.
 */
import { readFileSync } from 'node:fs';
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail).slice(0, 400)); }
}
const W = (n, gid) => ({ name: 'Axe ' + n, tierMult: 1, dmg: 5, gid });
const msg = async (room, ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload })); await settle(); };
const names = (P) => P.weaponStash.map((w) => w.name);

async function player(flags, pid) {
  const room = await openRoom(makeStorage(), flags);
  const ws = fakeWs(pid); await join(room, ws, pid);
  const P = room.playerState[pid];
  P.weaponStash = [W(1, 'ga1.k.0001'), W(2, 'ga2.k.0002'), W(3, 'ga3.k.0003')];
  P.coins = 0;
  return { room, ws, P };
}

/* ── 1. by its id ── */
{
  const { room, ws, P } = await player(null, 'bp_gid_a');
  /* the tap was drawn when Axe 2 sat at place 1; then Axe 1 left, so place 1 is Axe 3 now */
  P.weaponStash.splice(0, 1);
  await msg(room, ws, 'sell_weapon', { stashIdx: 1, gid: 'ga2.k.0002' });
  check('1: the stash moved under the tap: the request with the id is refused -- not the next weapon', JSON.stringify(names(P)) === JSON.stringify(['Axe 2', 'Axe 3']) && P.coins === 0, names(P));
  await msg(room, ws, 'sell_weapon', { gid: 'ga2.k.0002' });
  check('1: the id alone sells the weapon it names, wherever it is', JSON.stringify(names(P)) === JSON.stringify(['Axe 3']) && P.coins > 0, names(P));
  const b = await player(null, 'bp_gid_b');
  b.P.weaponStash.splice(0, 1);
  await msg(b.room, b.ws, 'sell_weapon', { stashIdx: 1 });
  check('1: BREAK PROOF: with no id (an older phone) the weapon now at that place goes: the next one', JSON.stringify(names(b.P)) === JSON.stringify(['Axe 2']), names(b.P));
}

/* ── 2. id and place disagree ── */
{
  const { room, ws, P } = await player(null, 'bp_gid_c');
  await msg(room, ws, 'sell_weapon', { stashIdx: 0, gid: 'ga2.k.0002' });
  check('2: the id names a weapon the place does not: refused, nothing sold', P.weaponStash.length === 3 && P.coins === 0, names(P));
  await msg(room, ws, 'sell_weapon', { stashIdx: 0, gid: 'gzz.k.9999' });
  check('2: an id no weapon has: refused', P.weaponStash.length === 3 && P.coins === 0, names(P));
}

/* ── 3. the others ── */
{
  const { room, ws, P } = await player(null, 'bp_gid_d');
  P.weaponStash.splice(0, 1);   /* Axe 2 at 0, Axe 3 at 1 */
  await msg(room, ws, 'equip_request', { stashIdx: 0, gid: 'ga3.k.0003', slot: 'weapon' });
  check('3: equip by an id whose place moved: refused, nothing equipped from the wrong place', P.weaponStash.length === 2 && JSON.stringify(names(P)) === JSON.stringify(['Axe 2', 'Axe 3']), names(P));
  await room._mktEnsureIndex();
  const place = await room._mktPlaceOrder({ type: 'sell', category: 'weapon', subtype: 'axe', tierKey: 'mythic', price: 300, playerId: 'bp_gid_d', stashIndex: 0, gid: 'ga3.k.0003' });
  check('3: the market\'s sell order by an id at another place: "Item not in stash", nothing escrowed', place && place.ok === false && P.weaponStash.length === 2, place);
  const place2 = await room._mktPlaceOrder({ type: 'sell', category: 'weapon', subtype: 'axe', tierKey: 'mythic', price: 300, playerId: 'bp_gid_d', stashIndex: 1, gid: 'ga3.k.0003' });
  check('3: ...and at its own place, the weapon it names is escrowed', place2 && place2.ok === true && JSON.stringify(names(P)) === JSON.stringify(['Axe 2']), { place2: place2 && place2.ok, stash: names(P) });
  const at = room._salvageWeaponAt(P, { idx: 5, gid: 'ga2.k.0002', sig: 'x' });
  check('3: salvage finds the weapon by its id when no place agrees (`idx` past the end): refused', at && !at.w, at);
}

/* ── 4. the cap, and the door ── */
{
  const r1 = await openRoom(makeStorage());
  const w1 = fakeWs('c1'); await join(r1, w1, 'bp_gid_cap');
  const r2 = await openRoom(makeStorage(), { gidnames: false });
  const w2 = fakeWs('c2'); await join(r2, w2, 'bp_gid_cap2');
  const c1 = (w1.sent.find((m) => m.type === 'state_sync') || {}).caps || {};
  const c2 = (w2.sent.find((m) => m.type === 'state_sync') || {}).caps || {};
  check('4: caps.gidnames says the worker reads the id; `gidnames: false` takes it away', c1.gidnames === 1 && c2.gidnames === undefined, { a: c1.gidnames, b: c2.gidnames });
  const { act, setActionTransport, GID_PLACE } = await import('../../src/game/actions.js');
  const sent = [];
  const stash = [W(1, 'gp1.k.0001'), W(2, 'gp2.k.0002')];
  setActionTransport({ send: (m) => { sent.push(m); return true; }, token: () => null, weaponGid: (i) => (stash[i] && stash[i].gid) || null });
  act('sell_weapon', { stashIdx: 1 });
  act('equip_request', { stashIdx: 0, slot: 'weapon', gid: 'gp9.k.0009' });   /* the caller's own id (it took it before its stash moved) */
  act('smith_salvage', { field: 'weaponStash', idx: 0, sig: 's' });
  act('smith_salvage', { field: 'chest', gid: 'gear-1', sig: 's' });
  setActionTransport(null);
  const p = sent.map((m) => m.payload);
  check('4: the action door adds the id of the weapon at the place it sends, and only for a stash weapon', p[0].gid === 'gp2.k.0002' && p[2].gid === 'gp1.k.0001' && p[3].gid === 'gear-1' && Object.keys(GID_PLACE).length === 9, p);
  check('4: (sitting 30) an id the caller gives is kept, never looked up again', p[1].gid === 'gp9.k.0009', p[1]);
  /* the three equips move the page's stash BEFORE they send (the swap is drawn at once): each takes the id from the weapon itself */
  const eq = ['src/ui/mobile/dash/equipActions.js', 'src/ui/mobile/dash/ItemDetailPopup.jsx', 'src/ui/panels/InventoryPanel.jsx'].map((f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8'));
  check('4: (sitting 30) every equip that moves its stash first sends the id it took from the weapon', /equip_request', payload: \{ stashIdx: idx, slot, \.\.\.\(live && typeof live\.gid/.test(eq[0]) && /equip_request', payload: \{ stashIdx: i, slot: destProp, \.\.\.\(live && typeof live\.gid/.test(eq[1]) && /act\('equip_request', \{ stashIdx: si, slot: [^}]*\.\.\.\(swapWpn && typeof swapWpn\.gid/.test(eq[2]));
}

/* ── 5. the switch ── */
{
  const { room, ws, P } = await player({ gidnames: false }, 'bp_gid_e');
  P.weaponStash.splice(0, 1);
  await msg(room, ws, 'sell_weapon', { stashIdx: 1, gid: 'ga2.k.0002' });
  check('5: `gidnames: false`: the place alone, as before (the next one goes)', JSON.stringify(names(P)) === JSON.stringify(['Axe 2']), names(P));
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
