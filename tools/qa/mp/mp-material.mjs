/* The material recolor pipeline (v2.3.1757).
 *
 * Owner: "recolor the iron torso and iron legs to make it copper ... architect
 * it the way it would work best performance wise."  The performance claim IS
 * the design — one art set, tinted — so these assertions are about the claim
 * and not only about the colour:
 *
 *   - a copper piece is drawn with the copper tint, read off the live sprite
 *   - it loads NO new sheet: the copper textures are the steel textures
 *   - steel stays on the native no-op white (the recolor cannot regress it)
 *   - the tint clears on unequip, so a sprite recycled from a copper wearer
 *     does not leave the next pose in copper
 *
 * Read through __btGearTints, which walks the sprites the renderer is holding
 * rather than the state we asked it for — the difference matters, because a
 * tint clobbered later in the frame would still satisfy a state check.
 */
import * as H from './harness.mjs';

const COPPER = 0xFF7C33; /* materialTints copper at full brightness (v2.3.1759) */
const NATIVE = 0xFFFFFF;

const gearTints = (P) => P.page.evaluate(() => (window.__btGearTints ? window.__btGearTints() : null));
const sheetKeys = (P) => P.page.evaluate(() => (window.__btGearSheets ? window.__btGearSheets() : null));
const setGear = (P, slot, id) => P.page.evaluate(({ s, i }) => {
  if (!window.__btSetGear) return 'missing';
  window.__btSetGear(s, i);
  return 'ok';
}, { s: slot, i: id });

/* The armour slots only — the shirt carries the player's shirt colour on the
   same tint channel by design, so including it would make "everything is
   native white" false for reasons that have nothing to do with metals. */
const armour = (t) => (t && t.slots ? t.slots.filter((s) => s.slot === 'chest' || s.slot === 'legs') : []);

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Smith', nameB: 'Onlooker' });

  const table = await A.page.evaluate(() => (window.__btMaterials ? window.__btMaterials() : null));
  rec.ok('the metals table derives copper from the owner-picked swatch',
    !!table && !!table.copper && table.copper.tint === COPPER
    && !!table.steel && table.steel.tint === NATIVE, table);

  /* ── steel: the control ── */
  rec.ok('the test can drive the equip store', (await setGear(A, 'chest', 'steelplate')) === 'ok');
  await setGear(A, 'legs', 'steelgreaves');
  await A.page.waitForTimeout(2000);
  const steel = await gearTints(A);
  const steelWorn = armour(steel).filter((s) => s.visible);
  rec.ok('the steel set is actually on screen (guard: nothing below means anything otherwise)',
    steelWorn.length === 2, steel);
  rec.ok('steel draws on the native no-op tint',
    steelWorn.length > 0 && steelWorn.every((s) => s.tint === NATIVE), steel);
  const steelSheets = await sheetKeys(A);
  const steelSrc = steelWorn.map((s) => s.src).join(',');

  /* ── copper ── */
  await setGear(A, 'chest', 'copperplate');
  await setGear(A, 'legs', 'coppergreaves');
  await A.page.waitForTimeout(2000);
  const copper = await gearTints(A);
  const copperWorn = armour(copper).filter((s) => s.visible);
  rec.ok('the copper set is on screen', copperWorn.length === 2, copper);
  rec.ok('copper draws with the copper tint',
    copperWorn.length > 0 && copperWorn.every((s) => s.tint === COPPER), copper);

  /* THE PERFORMANCE CLAIM, stated two ways.  Baked art would show up as extra
     sheets AND as different texture sources; sharing the source is the property
     that makes a metal free. */
  const copperSheets = await sheetKeys(A);
  /* Compare the KEYS, not the count: the count also grows when the player
     simply turns and a new direction's steel sheet builds, which would make a
     count check fail for a reason that has nothing to do with the recolor.
     What must be true is that no key names a copper piece. */
  const copperKeys = (copperSheets || []).filter((k) => /copper/i.test(k));
  const added = (copperSheets || []).filter((k) => !(steelSheets || []).includes(k));
  rec.ok('...without building a single sheet for the copper set',
    copperKeys.length === 0, { copperKeys, added });
  rec.ok('...off the very same texture the steel set draws from',
    copperWorn.length > 0 && copperWorn.map((s) => s.src).join(',') === steelSrc,
    { steelSrc, copperSrc: copperWorn.map((s) => s.src).join(',') });

  /* ── v2.3.1759: MIXED SETS ──
     Owner: "it's possible to wear different combination of armor like copper
     legs with iron torso right?"  Yes, and it falls out of the design rather
     than needing support: chest and legs are separate slots, each carrying its
     own material, and the tint is per SPRITE.  Proven here with copper legs
     under a steel torso — two metals on one character at the same time. */
  await setGear(A, 'chest', 'steelplate');
  await setGear(A, 'legs', 'coppergreaves');
  await A.page.waitForTimeout(2000);
  const mixed = armour(await gearTints(A)).filter((x) => x.visible);
  const mChest = mixed.find((x) => x.slot === 'chest');
  const mLegs = mixed.find((x) => x.slot === 'legs');
  rec.ok('two different metals can be worn at once',
    !!mChest && !!mLegs && mChest.tint === NATIVE && mLegs.tint === COPPER, mixed);

  /* ── and it comes back off ── */
  await setGear(A, 'chest', 'steelplate');
  await setGear(A, 'legs', 'steelgreaves');
  await A.page.waitForTimeout(2000);
  const back = armour(await gearTints(A)).filter((s) => s.visible);
  rec.ok('unequipping the copper returns the sprite to native steel',
    back.length > 0 && back.every((s) => s.tint === NATIVE), back);

  /* ═══ v2.3.1758: COPPER AS A REAL TIER, NOT A DEV COMMAND ═══
     Everything above drives the equip store directly, which proves the
     RENDERER.  It says nothing about whether a player can ever obtain the
     stuff.  This half walks the actual reward: the worker grants the tier-one
     piece, it lands in the bag carrying its material, wearing it puts copper
     art on the character, and — the part no single-client test can see — the
     OTHER player's screen shows copper too. */
  await setGear(A, 'chest', 'none');
  await setGear(A, 'legs', 'none');
  await A.page.waitForTimeout(600);

  const aId = await H.readState(A, (S) => S.myId);
  const send = (P, msg) => P.page.evaluate((m) => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send(m);
  }, msg);
  /* life_2 pays the tier-one TORSO for five ore — the copper-ore quest the
     owner named ("you mine copper ore"). */
  await send(A, { type: 'quest_accept', payload: { questId: 'life_1' } });
  await A.page.waitForTimeout(900);
  await H.grant(wsPort, aId, 'item', { invKey: 'cooked_fish_trout', count: 2 });
  await A.page.waitForTimeout(1000);
  await send(A, { type: 'quest_turn_in', payload: { questId: 'life_1', xpCat: 'sword' } });
  await A.page.waitForTimeout(1400);
  await send(A, { type: 'quest_accept', payload: { questId: 'life_2' } });
  await A.page.waitForTimeout(900);
  await H.grant(wsPort, aId, 'item', { invKey: 'ore_copper_ore', count: 5 });
  await A.page.waitForTimeout(1000);
  await send(A, { type: 'quest_turn_in', payload: { questId: 'life_2', xpCat: 'sword' } });
  await A.page.waitForTimeout(2000);

  const stash = await H.readState(A, (S) => (S.rpg.armorStash || [])
    .map((a) => ({ name: a && a.name, mat: a && a.mat })));
  rec.ok('the mining quest pays a COPPER torso',
    stash.some((a) => a.name === 'Copper Torso'), stash);
  rec.ok('...and the piece carries its material into the bag (the art depends on it)',
    stash.some((a) => a.name === 'Copper Torso' && a.mat === 'copper'), stash);

  /* Wear it the way the player does — through the equip action, not by poking
     the cosmetic store. */
  const wore = await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (!R || !Array.isArray(R.armorStash) || !R.armorStash.length) return 'no piece';
    const i = R.armorStash.findIndex((a) => a && a.name === 'Copper Torso');
    if (i < 0) return 'not found';
    R.armor = R.armorStash.splice(i, 1)[0];
    if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
    return 'worn';
  });
  rec.ok('the quest piece can be worn', wore === 'worn', wore);
  await A.page.waitForTimeout(1800);
  const wornTint = armour(await gearTints(A)).find((x) => x.slot === 'chest');
  rec.ok('a worn quest torso renders in COPPER, from its material alone',
    !!wornTint && wornTint.visible && wornTint.tint === COPPER, wornTint);

  /* ── and the other player sees it ──
     The equip id is what crosses the wire, so this is the whole remote story:
     if B's copy of A's equipment says copperplate, B's renderer resolves the
     same art and the same tint A's does. */
  const seen = await H.waitFor(B, (S) => {
    const o = S.others && S.others[Object.keys(S.others || {})[0]];
    return o && o.equip ? o.equip.chest : null;
  }, (v) => v === 'copperplate', { timeout: 15000, label: 'B sees copper on A' })
    .then(() => true).catch(() => false);
  rec.ok('the other player sees the copper piece, not the steel one', seen,
    await H.readState(B, (S) => {
      const o = S.others && S.others[Object.keys(S.others || {})[0]];
      return o ? o.equip : null;
    }));

  /* ── the body sprite is not left wearing the metal ──
     The fullset knight figure is armour art assigned onto the BODY sprite, so
     its colour has to be cleared the moment the figure is not in play or an
     unarmoured player jogs around copper. */
  await setGear(A, 'chest', 'none');
  await setGear(A, 'legs', 'none');
  await A.page.waitForTimeout(2000);
  const bare = await gearTints(A);
  rec.ok('a bare body is never left tinted', !!bare && bare.bodyTint === NATIVE, bare);

  await A.ctx.close(); await B.ctx.close();
}
