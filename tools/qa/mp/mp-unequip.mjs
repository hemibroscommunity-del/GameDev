/* Taking armour OFF (v2.3.1762).
 *
 * Owner: "Unequipping the copper torso plate armor doesn't remove it from the
 * equipped status on character chest piece and also still keeps the mitigation
 * percentage of wearing the plate active."
 *
 * Three separate facts have to move together when a piece comes off, and the
 * report says at least two did not:
 *   - the CLIENT's worn field (R.armor) clears,
 *   - the WORKER's copy clears, because that is what reduces damage
 *     (_armorDrMult) and what the next snapshot echoes back,
 *   - the loadout cell stops reading as equipped.
 * A test that checked only the first would pass while the player still takes
 * reduced damage and still sees a plate in the cell.
 *
 * Driven through the real bag UI, because the unequip button is the thing
 * under suspicion.
 */
import * as H from './harness.mjs';

const facts = async (P, wsPort, id) => {
  const client = await H.readState(P, (S) => ({
    armor: S.rpg && S.rpg.armor ? S.rpg.armor.name : null,
    stash: (S.rpg && S.rpg.armorStash || []).map((a) => a && a.name),
  }));
  const layer = await P.page.evaluate(() => {
    const g = window._gameFns && window._gameFns.getEquip;
    return g ? g('chest') : null;
  });
  const srv = await H.adminPlayer(wsPort, id).catch(() => null);
  return {
    client: client.armor, stash: client.stash, layer,
    server: srv && srv.rpg && srv.rpg.armor ? srv.rpg.armor.name : null,
  };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Stripper', wsPort, webPort });
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);
  await P.page.waitForTimeout(1500);

  const send = (msg) => P.page.evaluate((m) => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send(m);
  }, msg);

  /* Earn the torso the way the game pays it out. */
  await send({ type: 'quest_accept', payload: { questId: 'life_1' } });
  await P.page.waitForTimeout(900);
  await H.grant(wsPort, myId, 'item', { invKey: 'cooked_fish_trout', count: 2 });
  await P.page.waitForTimeout(1000);
  await send({ type: 'quest_turn_in', payload: { questId: 'life_1', xpCat: 'sword' } });
  await P.page.waitForTimeout(1400);
  await send({ type: 'quest_accept', payload: { questId: 'life_2' } });
  await P.page.waitForTimeout(900);
  await H.grant(wsPort, myId, 'item', { invKey: 'ore_copper_ore', count: 5 });
  await P.page.waitForTimeout(1000);
  await send({ type: 'quest_turn_in', payload: { questId: 'life_2', xpCat: 'sword' } });
  await P.page.waitForTimeout(2500);

  const bagged = await facts(P, wsPort, myId);
  rec.ok('the quest torso is in the bag to start with',
    bagged.stash.includes('Copper Torso') && !bagged.client, bagged);

  /* ── EQUIP through the bag ── */
  await H.openDest(P, 'Dashboard').catch(() => {});
  await P.page.waitForTimeout(900);
  const tappedOn = await P.page.locator('[title="Copper Torso"]').first()
    .click({ timeout: 8000 }).then(() => true).catch(() => false);
  rec.ok('the torso can be opened from the bag', tappedOn);
  await P.page.waitForTimeout(700);
  await H.clickText(P, 'Equip').catch(() => {});
  await P.page.waitForTimeout(2200);

  const worn = await facts(P, wsPort, myId);
  rec.ok('equipping puts it on the player', worn.client === 'Copper Torso', worn);
  rec.ok('...and the WORKER knows, which is what reduces damage',
    worn.server === 'Copper Torso', worn);
  rec.ok('...and the character wears the copper art', worn.layer === 'copperplate', worn);

  /* ── UNEQUIP the way a player does: tap the CHEST cell in the loadout ──
     A worn piece is not in the bag any more, so the cell is the only handle
     the game offers. */
  await P.page.keyboard.press('Escape').catch(() => {});
  await P.page.waitForTimeout(500);
  await H.openDest(P, 'Character').catch(() => {});
  await P.page.waitForTimeout(1200);
  const tappedOff = await P.page.locator('[aria-label="Chest"]').first()
    .click({ timeout: 8000 }).then(() => true).catch(() => false);
  rec.ok('the worn chest cell can be opened', tappedOff, await H.buttonTexts(P));
  await P.page.waitForTimeout(900);
  /* Selecting the cell reveals CHANGE, which opens the slot's picker — that is
     where a worn piece can be taken off. */
  const changed = await H.clickText(P, 'CHANGE').then(() => true).catch(() => false);
  rec.ok('the selected chest cell offers CHANGE', changed, await H.buttonTexts(P));
  await P.page.waitForTimeout(1200);
  const offered = await H.buttonTexts(P);
  const sawUnequip = await H.clickText(P, 'Unequip').then(() => true).catch(() => false);
  rec.ok('the chest picker offers Unequip', sawUnequip, offered);
  await P.page.waitForTimeout(2500);

  const off = await facts(P, wsPort, myId);
  rec.ok('unequipping clears the worn piece on the client', off.client === null, off);
  /* THE ONE THE OWNER FELT: the worker still applying the mitigation. */
  rec.ok('unequipping clears it on the WORKER too (no phantom mitigation)',
    off.server === null, off);
  rec.ok('...and the plate comes off the character', off.layer === 'none', off);
  rec.ok('...and the piece is back in the bag, not destroyed',
    off.stash.includes('Copper Torso'), off);

  /* And it must STAY off: the worker owns this field and re-sends it, so a
     failed clear reappears a second later rather than immediately. */
  await P.page.waitForTimeout(3000);
  const stayed = await facts(P, wsPort, myId);
  rec.ok('...and it stays off after the next snapshot',
    stayed.client === null && stayed.server === null && stayed.layer === 'none', stayed);

  await P.ctx.close().catch(() => {});
}
