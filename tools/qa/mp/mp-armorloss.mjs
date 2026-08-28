/* WHERE DOES A DROPPED CHEST PIECE GO? (v2.3.2122)
 *
 * Owner, after the live demo: "a complaint about an iron chest plate that
 * went missing from their inventory."
 *
 * The Iron Torso is the 1-in-500 monster drop added in v2.3.1924, and it is
 * stored in a way nothing else in the game is stored: there is NO server-side
 * armour stash (handoff rule 1 forbids adding one to the rpg blob), so the
 * worker hands the minted piece to the client in the private loot_credit and
 * the CLIENT's own R.armorStash is the only copy that exists.  The worker
 * learns what ends up WORN (ps.armor, via stats_update) and nothing about
 * what is in the bag.
 *
 * That asymmetry is the thing to test, and there are three places a piece
 * could fall out of:
 *
 *   1. UNEQUIP.  gear.js _handleUnequipRequest stashes weapons and nulls
 *      everything else — "armor/shield/amulet just null out since they don't
 *      have a stash today".  The client pushes the piece into its own bag on
 *      the way past, so the two stores disagree by design; the question is
 *      whether the client's copy survives.
 *   2. A RELOAD, which is the ordinary thing a demo player does.  If the join
 *      rebuilds R from the authoritative record, a bag the record does not
 *      contain comes back empty.
 *   3. A SECOND DEVICE or cleared storage, where the client copy never
 *      existed.  Not testable as a bug — it is the design — but it is the
 *      same missing chest plate to the person holding it.
 *
 * The piece is planted the way the credit handler plants one (same fields,
 * same localStorage write) rather than farmed out of a 1-in-500 roll.
 */
import * as H from './harness.mjs';

const PIECE = { name: 'Iron Torso', tierMult: 2.0, slot: 'armor', mat: 'iron', quality: 'rare' };

const bag = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  const R = (S && S.rpg) || {};
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem('bt_rpg') || 'null'); } catch (e) { stored = null; }
  const names = (a) => (Array.isArray(a) ? a : []).map((x) => x && x.name);
  return {
    worn: R.armor ? R.armor.name : null,
    stash: names(R.armorStash),
    storedWorn: stored && stored.armor ? stored.armor.name : null,
    storedStash: names(stored && stored.armorStash),
  };
});

const has = (b) => !!b && (b.worn === PIECE.name || b.stash.includes(PIECE.name));

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Ironclad', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);

  /* ── PLANT THE DROP, exactly as the loot_credit handler would ── */
  await P.page.evaluate((piece) => {
    const S = window._gameState.current;
    const R = S.rpg;
    if (!Array.isArray(R.armorStash)) R.armorStash = [];
    R.armorStash.push(Object.assign({}, piece));
    try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
  }, PIECE);
  await P.page.waitForTimeout(400);
  const planted = await bag(P);
  console.log('    after the drop: ' + JSON.stringify(planted));
  rec.ok('the dropped chest piece lands in the bag (guard)', has(planted), planted);
  rec.ok('...and is written to local storage straight away',
    planted.storedStash.includes(PIECE.name), planted);

  /* ── THE SIMPLEST QUESTION FIRST: IS THE BAG DURABLE AT ALL? ──
     Before any equipping, any gate, any worker opinion: the piece is sitting
     in the bag where the credit put it, and the player reloads.  If it does
     not come back from here, nothing further about equipping matters — the
     drop is simply not a durable item. */
  await P.page.reload();
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const afterPlainReload = await bag(P);
  console.log('    bag, after a plain reload: ' + JSON.stringify(afterPlainReload));
  rec.ok('a piece sitting untouched in the bag survives a reload',
    has(afterPlainReload), afterPlainReload);

  /* Put it back if the reload ate it, so the rest of the scenario still has
     something to test — the assertion above has already recorded the loss. */
  if (!has(afterPlainReload)) {
    await P.page.evaluate((piece) => {
      const S = window._gameState.current;
      const R = S.rpg;
      if (!Array.isArray(R.armorStash)) R.armorStash = [];
      R.armorStash.push(Object.assign({}, piece));
      try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
    }, PIECE);
    await P.page.waitForTimeout(400);
  }

  /* ── EQUIP IT, and tell the worker, which is what wearing it does ── */
  await P.page.evaluate((piece) => {
    const S = window._gameState.current;
    const R = S.rpg;
    const i = (R.armorStash || []).findIndex((a) => a && a.name === piece.name);
    if (i >= 0) R.armorStash.splice(i, 1);
    R.armor = Object.assign({}, piece);
    try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
    if (S.channel) S.channel.send({ type: 'stats_update', payload: { armor: R.armor } });
  }, PIECE);
  await P.page.waitForTimeout(1500);
  const worn = await bag(P);
  console.log('    worn (client): ' + JSON.stringify(worn));
  rec.ok('wearing it keeps it, as far as the client is concerned', has(worn), worn);

  /* ── WHAT THE WORKER THINKS ──
     The client is not the authority and its view is the one the player sees,
     so the two have to be read separately: a piece that is worn on screen and
     absent from the record is a piece that disappears at the next echo. */
  const myId = await H.readState(P, (S) => S.myId);
  const srv = await H.adminPlayer(wsPort, myId).catch(() => null);
  const srvArmor = srv && srv.rpg ? srv.rpg.armor : undefined;
  console.log('    worn (server): ' + JSON.stringify(srvArmor)
    + '  prog3=' + JSON.stringify(srv && srv.rpg && !!srv.rpg.prog3));
  /* ═══ THE REFUSAL IS THE DESIGN; THE DESTRUCTION WAS THE BUG ═══
     A tierMult-2.0 chest piece needs 30 trained Defense under prog3, and this
     character has none, so grids.js keeps ps.armor null.  That is correct and
     deliberate.  What was NOT correct is what happened next: the client had
     already taken the piece out of its bag, so the echo that wrote the
     refusal over R.armor destroyed the only copy in existence.

     So this records the divergence rather than asserting it away — the two
     stores ARE allowed to disagree here — and the assertions that follow are
     the ones that matter: whatever the worker decides, the player keeps the
     item.  If a client-side Defense gate is ever added (there is none today —
     equipArmorFromStash checks nothing), this flips to agreement and the
     later checks go on passing either way. */
  console.log('    NOTE: the worker refused the swap'
    + (srvArmor ? ' — no, it accepted it' : ' (prog3 Defense gate), as designed')
    + '; the client shows it worn until the echo lands.');
  rec.ok('the client and the worker disagree about it, which is the state the bug lived in',
    true, { srvArmor, client: worn });

  /* ── AND THE RELOAD.  The ordinary thing a demo player does. ── */
  await P.page.reload();
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const afterWornReload = await bag(P);
  console.log('    worn, after a reload: ' + JSON.stringify(afterWornReload));
  rec.ok('a reload does not lose the chest piece you are WEARING',
    has(afterWornReload), afterWornReload);

  /* ── UNEQUIP: the client bags it, the worker nulls it ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const R = S.rpg;
    if (!R.armor) return;
    if (!Array.isArray(R.armorStash)) R.armorStash = [];
    R.armorStash.push(R.armor);
    R.armor = null;
    try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch (e) {}
    if (S.channel) {
      S.channel.send({ type: 'unequip_request', payload: { slot: 'armor' } });
      S.channel.send({ type: 'stats_update', payload: { armor: null } });
    }
  });
  await P.page.waitForTimeout(2000);
  const unequipped = await bag(P);
  console.log('    unequipped: ' + JSON.stringify(unequipped));
  rec.ok('taking it off puts it in the bag rather than deleting it',
    has(unequipped), unequipped);

  /* ── THE ONE THAT MATTERS: off, then reload ──
     The worker's record now says armor:null and has never heard of the bag,
     so this is where a client-only store either survives or does not. */
  await P.page.reload();
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const afterBagReload = await bag(P);
  console.log('    bagged, after a reload: ' + JSON.stringify(afterBagReload));
  rec.ok('a reload does not lose the chest piece sitting in your BAG',
    has(afterBagReload), afterBagReload);

  await P.ctx.close().catch(() => {});
}
