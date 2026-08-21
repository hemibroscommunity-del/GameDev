/* The unarmed start and the town gate (v2.3.1676).
 *
 * Owner: "You'll need to start the game without a weapon and not be allowed
 * to leave town without speaking to mayor bro first.  He'll give you the
 * sword and shield."
 *
 * Three separate things can silently undo this, which is why it is tested in
 * a real browser rather than by reading the defaults:
 *   1. createDefaultRpg could still mint a loadout,
 *   2. a LOAD-TIME MIGRATION could hand it back (three of them did — they
 *      re-granted any empty weapon slot, so the change would have survived
 *      exactly until the first reload),
 *   3. the gate could be armed but bypassable.
 * Only walking a real player into a real exit proves the last one.
 */
import * as H from './harness.mjs';

/* Town has exactly ONE exit — the south path to the World View
   (src/data/effects.js TOWN_EXITS).  Hardcoded rather than read from the app:
   the coordinates are not exposed on window, and adding an export purely so a
   test can reach them would widen the app's surface for the harness's
   convenience.  If the marker ever moves, this test fails loudly with the
   player still standing in town — which is the correct way to find out. */
/* v2.3.1693: ty 44 -> 41, tracking the marker's move 3 tiles up off the
   bottom edge (it was rendering under the dashboard).
   v2.3.1777: (24,41) -> (56,28) for the clifftop town, which is 96x30 tiles —
   ty 41 was off the bottom of the zone entirely.  Note how it failed: the
   player stood on a non-existent tile, no transition ran, and "the gate blocks
   an unarmed player" PASSED because they were still in town.  Only "and says
   why" caught it.  That is the shape the comment above promised, and it is
   worth knowing the first assertion alone would have hidden this. */
const TOWN_EXIT = { tx: 25, ty: 48, zoneId: 'worldview' };   /* v2.3.1813: town_v17 is 52x55 — tx 56 is off the new zone entirely */

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Rookie', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(800);

  const start = await H.readState(P, (S) => ({
    weapon: S.rpg && S.rpg.weapon, ranged: S.rpg && S.rpg.rangedWeapon,
    staff: S.rpg && S.rpg.staffWeapon, shield: S.rpg && S.rpg.shield,
    zone: S.currentZone,
  }));
  /* ═══ v2.3.1698: THE CLIENT AND THE WORKER AGREE ABOUT HP ═══
     Found by playtest: a brand-new character stood in town reading 100/106
     while the worker's blob said 106/106 — and since the worker thought it
     was full, it never regenerated and never sent another player_state, so
     the six HP were gone for good.  Cause: the join player_state applied
     the server's hp, and then `if (_armorChanged) recalcDerived()` — which
     runs BEFORE `rpg.prog3` is adopted from the same payload — took
     recalcDerived's LEGACY branch and clamped hp to calcMaxHp(1, 0) = 100.
     The clamp target is that CONSTANT, so this was not a 6-HP rounding
     nit: any prog3 character with a real maxHp above 100 joined at 100.
     Asserted against the WORKER, not against 106, because the number is
     derived (100 + level*2) and a balance change to HP_PER_LEVEL must not
     fail this test — what is under test is that the two sides agree. */
  const svrVitals = await H.adminPlayer(wsPort, await H.readState(P, (S) => S.myId))
    .then((a) => (a && a.rpg) || {}).catch(() => ({}));
  const cliVitals = await H.readState(P, (S) => ({ hp: S.rpg.hp, maxHp: S.rpg.maxHp }));
  rec.ok('the client\'s HP is the worker\'s HP, not a locally re-derived one',
    cliVitals.hp === svrVitals.hp && cliVitals.maxHp === svrVitals.maxHp,
    { client: cliVitals, worker: { hp: svrVitals.hp, maxHp: svrVitals.maxHp } });
  rec.ok('...and a character who has never been hit is at FULL health',
    cliVitals.hp === cliVitals.maxHp, cliVitals);

  rec.ok('a fresh character starts with NO melee weapon', !start.weapon, start.weapon);
  rec.ok('...no bow and no staff', !start.ranged && !start.staff, { r: start.ranged, s: start.staff });
  rec.ok('...and no shield', !start.shield, start.shield);
  rec.ok('and starts in town', start.zone === 'town', start.zone);

  /* Walk onto a real town exit marker and let the transition logic run. */
  const walked = await P.page.evaluate((ex) => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return false;
    S.player.x = ex.tx * 32 + 16;
    S.player.y = ex.ty * 32 + 16;
    return true;
  }, TOWN_EXIT);
  rec.ok('the player could be placed on the exit marker', walked);
  await P.page.waitForTimeout(2500);
  const after = await H.readState(P, (S) => S.currentZone);
  rec.ok('the gate blocks an unarmed player from leaving town',
    after === 'town', { stillIn: after, triedToEnter: TOWN_EXIT.zoneId });
  rec.ok('...and says why', await H.seesText(P, 'Speak to Mayor Bro'));

  /* v2.3.1682 — the unarmed TAP.  The auto-attack loop has refused to fire
     on an empty slot since v2.3.212, but the manual tap handler never
     checked, so a weaponless character got exactly one free swing before the
     loop took over the follow-ups.  Tap twice with a gap wider than the
     600ms cooldown so a passing result can't just be the cooldown talking. */
  await H.callFn(P, 'swingAttack');
  const swungUnarmed = await H.readState(P, (S) => ({
    swinging: !!S.isSwinging, timer: S.swingTimer || 0,
  }));
  rec.ok('an unarmed tap does not start a swing', !swungUnarmed.swinging, swungUnarmed);
  await P.page.waitForTimeout(800);
  await H.callFn(P, 'swingAttack');
  rec.ok('...not on a second tap past the cooldown either',
    !(await H.readState(P, (S) => !!S.isSwinging)));

  /* Accept the first quest — the moment the mayor arms you. */
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(900);
  await H.clickText(P, 'Available').catch(() => {});
  await P.page.waitForTimeout(500);
  await H.clickText(P, 'Cold Reception').catch(() => {});
  await P.page.waitForTimeout(700);
  await H.clickText(P, 'Accept').catch(() => {});
  await P.page.waitForTimeout(2200);

  const armed = await H.readState(P, (S) => ({
    weapon: S.rpg && S.rpg.weapon && S.rpg.weapon.type,
    stash: (S.rpg && S.rpg.weaponStash || []).map((w) => w && w.type + ':' + w.name),
    shield: S.rpg && S.rpg.shield && S.rpg.shield.name,
    shieldBag: (S.rpg && S.rpg.shieldStash || []).map((sh) => sh && sh.name),
    quest: S.rpg && S.rpg._quests && S.rpg._quests.tut_1,
  }));
  /* v2.3.1681: 'greatsword', not 'sword'.  weaponType 'sword' at wood tier is
     the BAMBOO STICK — that is its icon and its in-hand sprite — so the grant
     was changed rather than just its picture (owner: "it needs to be the great
     sword").  Both types gate on the same trained skill, so nothing about the
     unarmed-start rule moves.
     v2.3.1683 (owner: "I want it to be received in inventory first not
     automatically equipped"): both arrive in the BAG now.  Asserting the
     empty hand as well as the full bag is the point — "granted" and
     "equipped" were the same fact until this version and this is what
     separates them. */
  rec.ok('accepting his first quest grants a real SWORD, not the bamboo stick',
    armed.stash.includes("greatsword:Copper Great Sword"), armed);
  rec.ok('...into the BAG, with the hand still empty', !armed.weapon, armed);
  rec.ok('...and a shield, also in the bag rather than on the arm',
    armed.shieldBag.includes("Pine Shield") && !armed.shield, armed);
  /* v2.3.1684: this used to be labelled "active server-side" while reading
     S.rpg._quests — a map the CLIENT writes on accept, so it said 'active'
     whether or not the worker ever heard about it. That mislabel is how the
     v2.3.1683 grant shipped looking verified while the in-world accept path
     was silently mute. The stash assertions above are the server-side proof;
     this one only claims what it can see. */
  rec.ok('the quest reads active on the client', armed.quest === 'active', armed);

  /* v2.3.1683: an unequipped sword is still no sword — the tap must stay
     dead until the player actually equips it. */
  await H.callFn(P, 'swingAttack');
  rec.ok('a sword sitting in the bag does NOT re-enable the tap',
    !(await H.readState(P, (S) => !!S.isSwinging)));

  /* v2.3.1683 — EQUIP IT THE WAY A PLAYER DOES.  Owner: "you should be able
     to choose to equip the weapon from that character menu if you tap on the
     weapon or shield slot to select equip".  An empty slot opens its picker
     on the first tap (InventoryPanel: `sl.ghost ? openModal : select-then-
     open`), and the picker builds its rows from weaponStash/shieldStash —
     which is exactly what the grant now fills.  Driven through the real DOM
     rather than a synthesised equip_request, because "the item is in the
     array" and "the player can reach it" are different claims and only the
     second one is the feature. */
  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(1000);
  /* Two taps, by design: the slot tile SELECTS (HeroExpanded's eqCell, which
     deliberately allows selecting an EMPTY slot) and the CHANGE button next
     to the contextual header opens the picker. */
  const openSlotPicker = async (label) => {
    await P.page.locator(`[title="${label}"]`).first().click({ timeout: 6000 });
    await P.page.waitForTimeout(600);
    await P.page.locator('button:has-text("CHANGE")').first().click({ timeout: 6000 });
    await P.page.waitForTimeout(900);
  };

  await openSlotPicker('Weapon');
  rec.ok('the empty Weapon slot in the character menu offers the granted sword',
    await H.seesText(P, "Copper Great Sword"));
  /* The popup names the item and offers a single Equip action — the item
     name itself is label text, not the control. */
  await H.clickText(P, 'Equip');
  await P.page.waitForTimeout(1200);
  rec.ok('...and Equip puts it in your hand',
    await H.readState(P, (S) => !!(S.rpg.weapon && S.rpg.weapon.type === 'greatsword')));

  await openSlotPicker('Shield');
  rec.ok('the empty Shield slot offers the granted shield',
    await H.seesText(P, "Pine Shield"));
  await H.clickText(P, 'Equip');
  await P.page.waitForTimeout(1000);
  rec.ok('...and Equip straps that on too',
    await H.readState(P, (S) => !!(S.rpg.shield && S.rpg.shield.name === "Pine Shield")));
  await H.callFn(P, 'swingAttack');
  rec.ok('once EQUIPPED from the bag, the same tap DOES swing',
    await H.readState(P, (S) => !!S.isSwinging));

  /* ═══ v2.3.1698: THE EQUIP CARD DIES WITH ITS PANEL ═══
     The Shield picker above is still open right now — equipping flips its
     button to Unequip and leaves the card up.  In a playtest it then
     survived leaving the Character panel, TWO zone changes, and came back
     to town still floating mid-screen, where it covered Mayor Bro's
     "Turn In Quest" button and made the first quest impossible to hand in.
     Its scrim also eats the tap that would dismiss it, so the player's
     next tap anywhere is spent on a ghost.  Driven through openDest —
     the real nav path — rather than by poking the bus, so this fails if
     the card outlives a destination change for any reason. */
  rec.ok('the equip card is on screen before we navigate away',
    await P.page.evaluate(() => !!(window._itemDetailBus && window._itemDetailBus.state.open)));
  await H.openDest(P, 'Bag').catch(() => {});
  await P.page.waitForTimeout(900);
  rec.ok('leaving the panel that opened it closes the equip card',
    !(await P.page.evaluate(() => !!(window._itemDetailBus && window._itemDetailBus.state.open))));
  rec.ok('...and nothing of it is left painted over the world',
    !(await H.seesText(P, 'Unequip')));

  /* ═══ v2.3.1687: THE EQUIP HAS TO REACH THE WORKER ═══
     Owner: "Every time you turn in a quest it unequips all your weapons."
     Nothing unequipped anything — the equip had never left the browser. The
     character menu's sync was gated on `_serverMonsters`, false in town, so
     the client wore the sword and the worker still had it in the stash. The
     next time anything made the worker restate the loadout — a quest turn-in
     does — the client adopted the worker's empty slots and the sword "came
     off".
     Reading the client here would have said "equipped" the whole time, which
     is exactly why the v2.3.1683 version of this test passed while the bug
     shipped. Ask the WORKER. */
  const svrLoadout = await H.adminPlayer(wsPort, await H.readState(P, (S) => S.myId))
    .then((a) => (a && a.rpg) || null).catch(() => null);
  rec.ok('the worker agrees the sword is equipped (not still in its stash)',
    !!svrLoadout && !!svrLoadout.weapon && svrLoadout.weapon.type === 'greatsword'
    && !(svrLoadout.weaponStash || []).some((w) => w && w.type === 'greatsword'),
    svrLoadout && { weapon: svrLoadout.weapon, stash: svrLoadout.weaponStash });

  /* v2.3.1683 — THE RECONNECT.  The server re-reports the shield it knows you
     own in the FULL player_state every join (deltas only carry it when it
     changes), so the client's "put a granted shield in the bag" rule has to
     recognise a shield it already holds or it hands out a fresh copy on every
     reload.  Only a real reload proves it: this is the one path that replays
     a full snapshot at a client that already has the item. */
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  const _needsCc = await P.page.waitForSelector('input.bt-cc-name', { timeout: 8000 })
    .then(() => true).catch(() => false);
  if (_needsCc) {
    await P.page.fill('input.bt-cc-name', 'Rookie');
    await P.page.click('button.bt-cc-play');
  }
  await P.page.waitForFunction(() => {
    const S = window._gameState && window._gameState.current;
    return !!(S && S.myId && S.currentZone);
  }, null, { timeout: 90000, polling: 500 });
  await P.page.waitForTimeout(2500);   /* let a few player_state frames land */
  const after2 = await H.readState(P, (S) => ({
    shieldBag: (S.rpg && S.rpg.shieldStash || []).map((sh) => sh && sh.name),
    shield: S.rpg && S.rpg.shield && S.rpg.shield.name,
  }));
  /* Count EVERYWHERE it could be, not just the bag: by this point the test
     has equipped it, so the copy lives on the arm and a re-grant would show
     up as a spare in the bag. */
  const _shieldsHeld = after2.shieldBag.filter((n) => n === "Pine Shield").length
    + (after2.shield === "Pine Shield" ? 1 : 0);
  rec.ok('reconnecting does not hand out a SECOND shield', _shieldsHeld === 1, after2);
  rec.ok('...and the one you equipped is still equipped',
    after2.shield === "Pine Shield", after2);

  await P.ctx.close().catch(() => {});
}
