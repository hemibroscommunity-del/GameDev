/* YOU HAVE TO EARN IT. v2.3.1750.
 *
 * Owner: "one fix still needed is that you can access iron torso and iron
 * graves through the character equip menu even before completing the quest
 * that gives you these.  They still gave a 0% armor bonus but remove them from
 * the game until they get the quest reward for it."
 *
 * Two separate sources handed them out, and both are closed here:
 *
 *   1. GameApp seeded EVERY new session with a mock inventory — a rarity
 *      showcase, twenty random items and a Steel Plate + Greaves.  mockItems.js
 *      says in its first line that it is throwaway development scaffolding
 *      "until the live state binding lands"; the binding landed long ago.
 *      Those items have no server-side existence, which is exactly the "0%
 *      armor bonus" — the cosmetic layer was on, the stat-bearing piece the
 *      worker knows about was not.
 *   2. The loadout picker offered EVERY catalog piece unconditionally
 *      (v2.3.1413 hardening, so a save-shape bug could never strand a plate
 *      you owned).  That is now gated on actually owning one.
 *
 * The second assertion is the one that keeps this honest: the hardening
 * v2.3.1413 added must still work for a player who HAS earned the piece, so
 * the run grants the stat-bearing torso and checks the art comes back.
 */
import * as H from './harness.mjs';

/* Opens the real loadout picker for a slot and returns the row labels it
   offers.  `{ kind: 'loadout', slot }` is the shape ItemDetailPopup handles
   (see its target.kind === 'loadout' branch) — driven through the bus the UI
   itself uses rather than by clicking through the dashboard, so the check is
   about WHAT IS OFFERED and not about how many taps reach it. */
const pickerRows = async (P, slot) => {
  const ok = await P.page.evaluate((s) => {
    const bus = window._itemDetailBus;
    if (!bus || typeof bus.open !== 'function') return false;
    bus.open({ kind: 'loadout', slot: s });
    return true;
  }, slot);
  if (!ok) return 'no-bus';
  await P.page.waitForTimeout(600);
  /* Read the CARD's text, not its buttons.  The first cut collected
     `document.querySelectorAll('button')` and found only the nav rail's
     emoji — the loadout rows are divs — so "no Greaves offered" passed
     while the popup was showing the rows perfectly well.  The card is the
     smallest element whose text starts with the slot heading. */
  return P.page.evaluate((s) => {
    const want = s.toUpperCase();
    /* The LONGEST match under a sane cap is the card; the shortest is its
       title bar.  Taking the shortest read "LEGS✕" once rows existed, which
       looked like an empty picker when it was a full one. */
    let best = null;
    document.querySelectorAll('div').forEach((e) => {
      const t = (e.textContent || '').trim();
      if (!t.startsWith(want) || t.length > 600) return;
      if (!best || t.length > best.length) best = t;
    });
    return best === null ? 'no-card' : best;
  }, slot);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Earner', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);
  const myId = await H.readState(P, (S) => S.myId);

  /* ── 1. a brand-new character owns nothing they were not given ── */
  const bag = await H.readState(P, (S) => ({
    armor: S.rpg && S.rpg.armor ? S.rpg.armor.name : null,
    legsArmor: S.rpg && S.rpg.legsArmor ? S.rpg.legsArmor.name : null,
    armorStash: (S.rpg && S.rpg.armorStash || []).length,
    legsStash: (S.rpg && S.rpg.legsStash || []).length,
    gearStash: (S.rpg && S.rpg.gearStash || []).length,
  }));
  rec.ok('a fresh character holds no armour at all',
    !bag.armor && !bag.legsArmor && bag.armorStash === 0 && bag.legsStash === 0, bag);

  /* The mock seed was the other source — it filled the INVENTORY surface with
     generated items that exist nowhere on the worker. */
  const inv = await P.page.evaluate(() => {
    const b = window._inventoryBus;
    const items = (b && b.state && b.state.items) || [];
    return { n: items.length, mock: items.filter((i) => i && String(i.id).startsWith('mock_')).length };
  });
  rec.ok('...and no mock/placeholder items were seeded into their bag',
    inv.n === 0 || inv.mock === 0, inv);

  /* ── 2. the loadout picker offers nothing for a slot they have not earned ── */
  const before = await pickerRows(P, 'legs');
  /* Guard: the card must have actually rendered, or "no Greaves in it" is a
     statement about an empty screen. */
  rec.ok('the legs loadout picker actually opened',
    before !== 'no-bus' && before !== 'no-card', before);
  rec.ok('an unearned Greaves is NOT offered in the legs picker',
    typeof before === 'string' && !/Greaves/i.test(before), before);
  await P.page.keyboard.press('Escape').catch(() => {});
  await P.page.waitForTimeout(400);

  /* ── 3. ...but a player who EARNED the piece can still get its art back ──
     This is the v2.3.1413 hardening the gate must not break: it exists so a
     save-shape bug can never strand a plate the player owns. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg) return;
    /* v2.3.1758: deliberately the PRE-copper record shape — old name, no
       material.  That is what a save written before the tier rename holds, and
       the picker must still offer its art (steel, which is what a piece with
       no material renders as). */
    S.rpg.legsStash = [{ name: 'Iron Greaves', tierMult: 1, slot: 'legsArmor' }];
  });
  await P.page.waitForTimeout(400);
  const after = await pickerRows(P, 'legs');
  rec.ok('a player holding the quest piece IS offered its art again',
    typeof after === 'string' && /Greaves/i.test(after), after);

  await P.ctx.close().catch(() => {});
}
