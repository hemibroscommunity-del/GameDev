/* THE NEW MONSTER DROPS, ON THE GLASS (v2.3.1924).
 *
 * Owner: "monsters now have a 1 in 500 chance to drop an iron chest and 1 in
 * 500 of dropping iron legs.  Add a 1 in 200 chance to drop a rare gem."
 *
 * server/test/drops.test.mjs proves the WORKER half — the rates, that the two
 * pieces roll independently, that the claims do not eat each other, and what
 * the credit carries.  None of that says the player ever sees any of it, and
 * the two halves fail differently:
 *
 *   - the gem is a plain stackable, so its risk is presentation.  A key with
 *     no thumbnail falls back to a generic glyph, which is what "I got
 *     something but I don't know what" looks like.  Granted here through the
 *     REAL operator endpoint so the whole path (worker inventory -> echo ->
 *     bag tile) is the one under test, not a value typed into the page.
 *   - the armour is the opposite: there is no server armour stash (handoff
 *     rule 1), so the ONLY place a dropped piece can land is the client's own
 *     armourStash / legsStash, written by _applyLootCredit.  If that routing
 *     is wrong the piece is simply gone, and no server test can see it.
 *
 * WHY THE CREDIT IS DRIVEN THROUGH A SEAM.  A 1-in-500 drop cannot be waited
 * for; the alternative is a test that kills monsters for an hour and usually
 * proves nothing.  window.__btLootCredit (wsClient.js) hands the real handler
 * the real payload, and the payload's SHAPE is pinned separately by the server
 * suite — so the two together cover the join that neither covers alone.  That
 * seam is the one thing here that is not a player's road, and it is stated
 * rather than hidden.
 */
import * as H from './harness.mjs';

/* Exactly what the worker sends for a pickup that claimed both pieces plus
   the gem (server/src/index.js _handleLootPickup). */
const CREDIT = {
  lootId: 'mk-test', zone: 'town', coins: 0, skull: null, shard: null,
  gem: 'rare_gem',
  armor: [
    { name: 'Iron Torso', mat: 'iron', slot: 'armor', tierMult: 1.25 },
    { name: 'Iron Greaves', mat: 'iron', slot: 'legsArmor', tierMult: 1.25 },
  ],
  weapon: null, weaponStashed: false, weaponSoldFor: null, viaPet: false,
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Looter', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const seam = await P.page.evaluate(() => typeof window.__btLootCredit === 'function');
  rec.ok('the loot-credit seam is wired (guard)', seam === true, {});
  if (!seam) { await P.ctx.close().catch(() => {}); return; }

  /* ── the armour lands in the bag ──────────────────────────────────────── */
  const after = await P.page.evaluate((credit) => {
    window.__btLootCredit(credit);
    const R = window._gameState.current.rpg;
    return {
      armorStash: (R.armorStash || []).map((a) => ({ n: a.name, m: a.mat, s: a.slot, t: a.tierMult })),
      legsStash: (R.legsStash || []).map((a) => ({ n: a.name, m: a.mat, s: a.slot, t: a.tierMult })),
    };
  }, CREDIT);
  console.log('    stashes after the credit', JSON.stringify(after));

  const torso = after.armorStash.find((a) => a.n === 'Iron Torso');
  const greaves = after.legsStash.find((a) => a.n === 'Iron Greaves');
  rec.ok('the chest piece lands in the CHEST stash', !!torso, after);
  /* v2.3.1701's bug, in this new lane: a legs piece filed under armorStash
     equips to the torso and mitigates nothing. */
  rec.ok('the legs piece lands in the LEGS stash, not the chest one',
    !!greaves && !after.armorStash.some((a) => a.n === 'Iron Greaves'), after);
  /* v2.3.1758's bug, in this new lane: without `mat` the piece renders as
     steel on the character and in the bag, whatever its name says. */
  rec.ok('...both carrying the metal that picks their art and icon',
    !!torso && torso.m === 'iron' && !!greaves && greaves.m === 'iron', { torso, greaves });
  /* tierMult is what getArmorPieceDr turns into damage reduction — a piece
     that arrives at 1 is cosmetic iron over copper stats. */
  rec.ok('...and iron’s tier multiplier, so they actually mitigate more',
    !!torso && torso.t === 1.25 && !!greaves && greaves.t === 1.25, { torso, greaves });

  /* A resend must not mint a second copy — a reconnect replays credits. */
  const twice = await P.page.evaluate((credit) => {
    window.__btLootCredit(credit);
    const R = window._gameState.current.rpg;
    return { chest: (R.armorStash || []).filter((a) => a.name === 'Iron Torso').length,
      legs: (R.legsStash || []).filter((a) => a.name === 'Iron Greaves').length };
  }, CREDIT);
  rec.ok('the same credit arriving twice does not duplicate the pieces',
    twice.chest === 1 && twice.legs === 1, twice);

  /* ── the gem, granted for real and read off the bag ───────────────────── */
  const myId = await P.page.evaluate(() => window._gameState.current.myId);
  /* invKey/count is the operator surface's own shape (inbox.js) — not the
     loot pile's {key, qty}, which is a different lane. */
  const granted = await H.grant(wsPort, myId, 'item', { invKey: 'rare_gem', count: 1 });
  rec.ok('the operator grant was accepted (guard)', !!(granted && granted.ok), granted);
  await P.page.waitForTimeout(1500);

  const bag = await P.page.evaluate(() => {
    try { window.__broDashPanelBus.open('bag'); } catch (e) {}
    return null;
  });
  await P.page.waitForTimeout(1400);
  const tile = await P.page.evaluate(() => {
    const R = window._gameState.current.rpg || {};
    const held = (R.inventory || {}).rare_gem || 0;
    /* The rendered tile, not the data: a key with no thumbnail still counts
       in the inventory and still draws — as a fallback glyph. */
    const img = [...document.querySelectorAll('img[alt="rare_gem"]')]
      .find((el) => el.getBoundingClientRect().width > 0);
    return { held, drawn: !!img, src: img ? img.getAttribute('src') : null };
  });
  console.log('    gem in the bag', JSON.stringify(tile), String(bag));

  rec.ok('the granted gem is in the authoritative inventory', tile.held >= 1, tile);
  rec.ok('...and the bag draws it as a picture, not a fallback glyph', tile.drawn === true, tile);
  rec.ok('...using the gem art', !!tile.src && /cur-gem\.webp/.test(tile.src), tile.src);
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/drops-bag.png' });

  await P.ctx.close().catch(() => {});
}
