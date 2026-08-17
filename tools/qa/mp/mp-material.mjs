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

const COPPER = 0xFFB253; /* the owner's swatch at full brightness (materialTints) */
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

  /* ── and it comes back off ── */
  await setGear(A, 'chest', 'steelplate');
  await setGear(A, 'legs', 'steelgreaves');
  await A.page.waitForTimeout(2000);
  const back = armour(await gearTints(A)).filter((s) => s.visible);
  rec.ok('unequipping the copper returns the sprite to native steel',
    back.length > 0 && back.every((s) => s.tint === NATIVE), back);

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
