/* THE ANVIL, THE STALL AND THE MAN AT IT (v2.3.1775).
 *
 * Owner: "Add these and size them appropriately in the world.  This anvil
 * belongs near the blacksmith.  The other is a sprite sheet of a 'storekeeper'
 * and the next image is of his stall."
 *
 * v2.3.2091: the storekeeper is out of the town (owner: "Remove the other
 * shopkeeper NPC") and Diego stands at the stall instead, so the vendor half
 * of this file measures him.  The props and the sizing rule are untouched --
 * the ask above was about scenery and scenery is still here.
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
  /* v2.3.2091: Diego, not the storekeeper.  The owner removed the second
     shopkeeper ("Remove the other shopkeeper NPC") -- two men did one job and
     only Diego had any stock -- so the vendor-at-his-pitch property is
     measured on the man who is still there.  His pitch is the market stall
     (v2.3.2080), which also makes that prop stop being scenery. */
  const keeper = (npcs || []).find((n) => n.id === 'shopkeeper_bro');

  rec.ok('the anvil and the stall are both drawn in town', !!anvil && !!stall, props);
  rec.ok('Diego spawned', !!keeper, npcs && npcs.map((n) => n.id));
  rec.ok('...and the storekeeper did NOT — he was removed, not just hidden',
    !(npcs || []).some((n) => n.id === 'storekeeper_bro'),
    npcs && npcs.map((n) => n.id));
  if (!anvil || !stall || !keeper) { await P.ctx.close().catch(() => {}); return; }

  /* ═══ v2.3.2091: NOBODY IS DRAWN AT PERSON_H ANY MORE ═══
     This asserted the blacksmith came out within 2px of 120, which was true
     while every NPC rendered off one shared constant.  v2.3.2081 gave each
     figure its own NPC_SCALE_MULT after the owner asked for the town's adults
     to be measured against each other -- the blacksmith is 1.14, so he draws
     at 136.8 and this guard failed on a size the owner asked for.

     PERSON_H stays as the yardstick below, because that is what it always
     was: the NOMINAL person, NPC_SPRITE_SCALE x the 200px band every figure
     is imported into.  What the guard should say is that the figure it is
     standing next to really is person-scaled -- an anvil "well under a
     person" means nothing if the person turned out to be a mouse -- so it is
     a band wide enough for the whole mult table (0.78 for the kid, 1.30 for
     Diego) and tight enough to catch a figure drawn at nothing like a
     person's size. */
  rec.ok('an NPC figure is drawn at person scale, so PERSON_H is a fair '
       + 'yardstick (guard)',
    !!smith && smith.height > PERSON_H * 0.7 && smith.height < PERSON_H * 1.45,
    { drawn: smith && Math.round(smith.height), nominal: PERSON_H });

  rec.ok('the anvil is anvil-sized — well under a person',
    anvil.height > 20 && anvil.height < PERSON_H * 0.6,
    { anvil: Math.round(anvil.height), person: PERSON_H });
  rec.ok('the stall is stall-sized — taller than a person, and wide',
    stall.height > PERSON_H * 1.2 && stall.width > PERSON_H * 1.4,
    { h: Math.round(stall.height), w: Math.round(stall.width), person: PERSON_H });

  /* ═══ v2.3.2091: THE SMITH LEFT THIS ANVIL ═══
     "The anvil is beside the blacksmith, where it belongs" was v2.3.1775's
     reading of the owner's "this anvil belongs near the blacksmith", and it
     held until v2.3.2089, when the owner said "move blacksmith bro next to
     the OTHER anvil by his building".  There are two: this PROP, out on the
     plaza cobble, and a bigger one painted into the forge art in the work
     yard.  He was already standing at this one, so "the other" could only
     mean the painted one -- and he now stands at it, 345px from here.  The
     assertion measured a pairing the owner deliberately broke.

     What is still true, and is the half of the original ask that survives, is
     that the anvil is in the FORGE'S yard rather than dumped somewhere else
     in town: inside the building's x-span, just off its south face.  Whether
     a second, unattended anvil should stay on the plaza at all is an open
     question with the owner -- so this asserts where it is, not that it is
     right, and it will fail honestly the day it moves. */
  const forge = (props || []).find((p) => p.id === 'forge');
  rec.ok('the forge is drawn to place the anvil against (guard)', !!forge, forge);
  if (forge) {
    const dx = Math.abs(anvil.x - forge.x), dy = anvil.y - forge.y;
    rec.ok('the anvil stands in the forge yard — inside the building\'s x-span '
         + 'and just off its south face',
      dx < forge.width / 2 && dy > 0 && dy < 140,
      { dx: Math.round(dx), dy: Math.round(dy), halfW: Math.round(forge.width / 2),
        anvil: { x: anvil.x, y: anvil.y }, forge: { x: forge.x, y: forge.y } });
  }
  const d = Math.hypot(anvil.x - smith.x, anvil.y - smith.y);
  rec.ok('...and the blacksmith is at the OTHER one, the painted one in his '
       + 'yard — so he is not standing on this prop (v2.3.2089)',
    d > 140, { dist: Math.round(d), anvil: { x: anvil.x, y: anvil.y },
      smith: { x: smith.x, y: smith.y } });

  /* ═══ v2.3.2091: THE VENDOR IS AT THE MARKET STALL ═══
     This has now been re-pointed twice and the history is the point.  v2.3.2078
     moved it OFF the market stall, because the storekeeper's pitch was the
     general store and the stall was explicitly scenery -- worldProps called it
     "a painted front, there is nobody behind it".  v2.3.2080 then put Diego
     behind that front, and v2.3.2091 removed the storekeeper entirely, so the
     stall is a manned pitch again and the general store is the empty one.
     Same property throughout: the man who sells things stands where the art
     says things are sold. */
  const shop = (props || []).find((p) => p.id === 'market-stall');
  rec.ok('the market stall is drawn for him to stand at (guard)', !!shop, shop);
  if (shop) {
    const sd = Math.hypot(keeper.x - shop.x, keeper.y - shop.y);
    rec.ok('Diego is at his stall', sd < 260,
      { dist: Math.round(sd), keeper: { x: keeper.x, y: keeper.y }, shop: { x: shop.x, y: shop.y } });
    rec.ok('...and stands in FRONT of it, so the stall does not swallow him',
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
