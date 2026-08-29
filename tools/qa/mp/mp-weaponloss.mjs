/* DOES A WEAPON SURVIVE A FULL STASH? (v2.3.2123)
 *
 * From the demo's in-game chat, in Tee's screenshot:
 *   Alix:    "Just lost my magic stick"
 *   Alix:    "Changed to the bow and cant find it back again"
 *   Mudokan: "It's not in inventory or in weapon equip character slot?"
 *   Alix:    "Nop sir i verify."
 *
 * The stash caps at 8 (WEAPON_STASH_MAX) and the client writes the same shape
 * in three places -- ForgePanel, WoodworkPanel and the pet-loot pickup:
 *
 *     if (R.weaponStash.length < WEAPON_STASH_MAX) R.weaponStash.push(current);
 *     R[wpnKey] = newWeapon;        // <-- unguarded
 *
 * The push is guarded and the overwrite is not, so at cap the old weapon is
 * dropped on the floor client-side.  unequipWeaponSlot has the mirror problem
 * from the other end: it pushes UNCONDITIONALLY, so the client stash can pass
 * the cap the worker enforces.
 *
 * WHETHER ANY OF THAT IS PERMANENT is the real question, and it is not
 * answerable by reading: player_state echoes weaponStash and the client adopts
 * it wholesale, so the worker is authoritative here (unlike armour, whose bag
 * it has never heard of -- see mp-armorloss).  A client-side drop that the
 * next echo undoes is a flicker; one the worker agrees with is a lost item.
 *
 * So this fills the stash to the cap and drives each path, checking BOTH
 * stores every time.  A weapon is "safe" if it is in a slot or a stash on
 * EITHER side; it is lost only when neither has it.
 */
import * as H from './harness.mjs';

const CAP = 8;

/* Everything the player could point at and call "my weapons", both sides. */
const inventory = async (P, wsPort, myId) => {
  const client = await P.page.evaluate(() => {
    const R = (window._gameState.current || {}).rpg || {};
    const nm = (w) => (w && (w.name || w.type)) || null;
    return {
      weapon: nm(R.weapon), ranged: nm(R.rangedWeapon), staff: nm(R.staffWeapon),
      stash: (R.weaponStash || []).map(nm),
    };
  });
  const srv = await H.adminPlayer(wsPort, myId).catch(() => null);
  const r = (srv && srv.rpg) || {};
  const nm = (w) => (w && (w.name || w.type)) || null;
  return {
    client,
    server: {
      weapon: nm(r.weapon), ranged: nm(r.rangedWeapon), staff: nm(r.staffWeapon),
      stash: (r.weaponStash || []).map(nm),
    },
  };
};

const holds = (side, name) => side.weapon === name || side.ranged === name
  || side.staff === name || side.stash.includes(name);
const anywhere = (inv, name) => holds(inv.client, name) || holds(inv.server, name);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Smith', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);
  const myId = await H.readState(P, (S) => S.myId);

  /* Fill the stash to the cap through the WORKER, so both sides agree it is
     full before anything interesting happens.  A client-only fill would test
     a state the server never had. */
  await P.page.evaluate((cap) => {
    const S = window._gameState.current;
    const R = S.rpg;
    R.weaponStash = [];
    for (let i = 0; i < cap; i++) {
      R.weaponStash.push({ type: 'sword', tier: 'common', tierMult: 1, name: 'Filler ' + i,
        gearBase: 'wood', quality: 'normal', hardness: 0, temper: 0 });
    }
    R.staffWeapon = { type: 'staff', tier: 'common', tierMult: 1, name: 'Magic Stick',
      gearBase: 'pine', quality: 'normal', hardness: 0, temper: 0 };
    try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
    if (S.channel) S.channel.send({ type: 'stats_update', payload: { weaponStash: R.weaponStash } });
  }, CAP);
  await P.page.waitForTimeout(1800);

  const start = await inventory(P, wsPort, myId);
  console.log('    start: ' + JSON.stringify(start));
  rec.ok('the stash is at its cap to begin with (guard)',
    start.client.stash.length >= CAP, start);
  rec.ok('...and the staff is held (guard)', anywhere(start, 'Magic Stick'), start);

  /* ── UNEQUIP AT A FULL STASH, THROUGH THE REAL FLOW ──
     unequipWeaponSlot is what the Equipped pane's button calls, so this is
     the path a player takes.  The worker refuses this request at the cap and
     always has; the question is whether the CLIENT does the same, or empties
     the slot into a stash the worker will not accept and loses the weapon at
     the next echo. */
  const refused = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const before = { staff: S.rpg.staffWeapon ? S.rpg.staffWeapon.name : null,
      stash: (S.rpg.weaponStash || []).length };
    const fns = window._gameFns || {};
    if (typeof fns.unequipWeaponSlot === 'function') fns.unequipWeaponSlot('staff');
    else return { err: 'unequipWeaponSlot not on the bridge' };
    return { before, after: { staff: S.rpg.staffWeapon ? S.rpg.staffWeapon.name : null,
      stash: (S.rpg.weaponStash || []).length } };
  });
  console.log('    unequip at cap: ' + JSON.stringify(refused));
  if (refused.err) {
    rec.skip('the client refuses an unequip that would overflow the bag', refused.err);
  } else {
    /* ═══ THE REGRESSION THIS SCENARIO EXISTS FOR ═══
       Refusing is the correct answer and the one the worker already gives.
       The bug was proceeding: slot emptied, stash grown to nine, and the next
       player_state adopting the worker's eight — taking the ninth with it. */
    rec.ok('the client refuses to unequip into a full bag, as the worker does',
      refused.after.staff === refused.before.staff
      && refused.after.stash === refused.before.stash, refused);
  }
  await P.page.waitForTimeout(1500);
  const afterUnequip = await inventory(P, wsPort, myId);
  console.log('    after unequip at cap: ' + JSON.stringify(afterUnequip));
  rec.ok('the weapon is still held after the refusal',
    anywhere(afterUnequip, 'Magic Stick'), afterUnequip);

  /* ── AND THE CLIENT NEVER GETS AHEAD OF THE WORKER'S CAP ──
     The state the old code created — a client stash longer than the cap the
     worker enforces — is the one the echo resolves by deletion.  It must not
     be reachable through the flows a player has. */
  const over = await P.page.evaluate((cap) => {
    const R = window._gameState.current.rpg;
    return { len: (R.weaponStash || []).length, cap };
  }, CAP);
  console.log('    stash vs cap: ' + JSON.stringify(over));
  rec.ok('the client stash never exceeds the cap the worker enforces',
    over.len <= over.cap, over);

  await P.ctx.close().catch(() => {});
}
