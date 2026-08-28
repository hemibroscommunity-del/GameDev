/* THE ANVIL, THE STALL AND THE STOREKEEPER (v2.3.1775).
 *
 * Owner: "Add these and size them appropriately in the world.  This anvil
 * belongs near the blacksmith.  The other is a sprite sheet of a 'storekeeper'
 * and the next image is of his stall."
 *
 * "Sized appropriately" is the whole of the ask that a test can get wrong, so
 * it is measured against the only scale the world actually has: a person.  The
 * renderer draws every NPC figure at 120 world px, so an anvil must come out
 * clearly SHORTER than that and a market stall clearly TALLER — pinning the
 * declared numbers instead would only prove the data file says what it says.
 *
 * Read through __btWorldProps, which reports the live sprites' drawn size, so
 * a prop whose texture never resolved (the failure mode that leaves scenery
 * invisible rather than wrong) cannot pass by having good data behind it.
 */
import * as H from './harness.mjs';

const PERSON_H = 120;      /* NPC_SPRITE_SCALE * (223 - 23) — a person, in world px */
/* v2.3.2078: the blacksmith's position was `{ x: 1400, y: 640 }`, copied out
   of the v16 town.  Read from the NPC list now — the same lesson mp-blacksmith
   learned in this version, and for the same reason: a coordinate copied out of
   the game stops being the game's coordinate the moment anything moves. */

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tourist', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  /* ═══ v2.3.2078: THIS SCENARIO HAD SILENTLY STOPPED RUNNING ═══
     v2.3.1813 gated the whole file on TOWN_PROPS_ENABLED, which was then a
     true blanket: the owner had asked for the buildings and NPCs out while
     the town was re-fused, and nothing was drawn.

     v2.3.2061 changed what that flag means and this file was not told.
     Props now declare `mapV`, and propIsPlaced draws anything measured
     against the CURRENT map "regardless of the blanket switch" — the flag
     only holds back the four buildings still carrying town_v16 numbers.
     TOWN_PROPS_ENABLED is still false, so this scenario kept reporting
     "switched off by directive — skipped" while TWELVE props were on screen
     and mp-townhill and mp-plazaplate were measuring them. Every check below
     — anvil and stall sizes against a person, who stands where, and whether
     scenery paints over characters — has been dark since.

     The gate is now what the file is actually about: are there props drawn
     in town. Still a real skip and not an empty pass, because "the town has
     no props by directive" and "the props stopped drawing" must not look the
     same from out here — the DIRECTIVE case is the one where every town prop
     is held back, which is what the flag being false and the list being
     empty means together. */
  const props = await P.page.evaluate(() => (window.__btWorldProps ? window.__btWorldProps() : null));
  const propsOn = await P.page.evaluate(
    () => (window.__btTownPropsEnabled ? window.__btTownPropsEnabled() : true));
  if (!propsOn && !(props || []).length) {
    rec.ok('town props are switched off by directive and none are placed — scenario skipped',
      true, { flag: 'TOWN_PROPS_ENABLED=false', drawn: 0, see: 'src/data/worldProps.js' });
    await P.ctx.close().catch(() => {});
    return;
  }
  rec.ok('town has props drawn to measure', (props || []).length > 0,
    { drawn: (props || []).length, flag: propsOn });
  const npcs = await P.page.evaluate(() => (window.__btNpcSprites ? window.__btNpcSprites() : null));
  const anvil = (props || []).find((p) => p.id === 'anvil');
  const stall = (props || []).find((p) => p.id === 'market-stall');
  const smith = (npcs || []).find((n) => n.id === 'blacksmith_bro');
  const keeper = (npcs || []).find((n) => n.id === 'storekeeper_bro');

  rec.ok('the anvil and the stall are both drawn in town', !!anvil && !!stall, props);
  rec.ok('the storekeeper spawned', !!keeper, npcs && npcs.map((n) => n.id));
  if (!anvil || !stall || !keeper) { await P.ctx.close().catch(() => {}); return; }

  /* GUARD: a person really is the height this scenario measures against. */
  rec.ok('an NPC figure is drawn at the expected person height (guard)',
    !!smith && Math.abs(smith.height - PERSON_H) < 2, smith);

  rec.ok('the anvil is anvil-sized — well under a person',
    anvil.height > 20 && anvil.height < PERSON_H * 0.6,
    { anvil: Math.round(anvil.height), person: PERSON_H });
  rec.ok('the stall is stall-sized — taller than a person, and wide',
    stall.height > PERSON_H * 1.2 && stall.width > PERSON_H * 1.4,
    { h: Math.round(stall.height), w: Math.round(stall.width), person: PERSON_H });

  const d = Math.hypot(anvil.x - smith.x, anvil.y - smith.y);
  rec.ok('the anvil is beside the blacksmith, where it belongs',
    d < 140, { dist: Math.round(d), anvil: { x: anvil.x, y: anvil.y },
      smith: { x: smith.x, y: smith.y } });

  /* v2.3.2078: HIS PITCH IS THE GENERAL STORE, NOT THE MARKET STALL.
     This measured the keeper against the market-stall, which was his post in
     the v16 town. He is paired with the general-store now (mp-townhill asserts
     the same pairing) and the stall is explicitly scenery — worldProps calls
     it "a painted front, there is nobody behind it". Measuring him against it
     was measuring a relationship the game no longer has. */
  const shop = (props || []).find((p) => p.id === 'general-store');
  rec.ok('the general store is drawn for him to stand at (guard)', !!shop, shop);
  if (shop) {
    const sd = Math.hypot(keeper.x - shop.x, keeper.y - shop.y);
    rec.ok('the storekeeper is at his shop', sd < 260,
      { dist: Math.round(sd), keeper: { x: keeper.x, y: keeper.y }, shop: { x: shop.x, y: shop.y } });
    rec.ok('...and stands in FRONT of it, so the building does not swallow him',
      keeper.y > shop.y, { keeperY: keeper.y, shopY: shop.y });
  }

  /* Scenery must not paint over the characters standing among it.  Pixi paints
     in child order, so this is the property itself rather than a proxy for it:
     both props are added before any NPC display. */
  const order = await P.page.evaluate(() => (window.__btEntityOrder ? window.__btEntityOrder() : null));
  const lastProp = Math.max(order.indexOf('prop_anvil'), order.indexOf('prop_market-stall'));
  const firstNpc = order.findIndex((l) => /^npc_/.test(l));
  rec.ok('the props are painted BEHIND the characters, not over them',
    lastProp >= 0 && firstNpc >= 0 && lastProp < firstNpc, { order, lastProp, firstNpc });

  rec.ok('every prop resolved a texture (not an invisible placeholder)',
    props.every((p) => p.width > 0 && p.height > 0), props);

  await P.ctx.close().catch(() => {});
}
