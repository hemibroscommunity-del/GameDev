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
const BLACKSMITH = { x: 1400, y: 640 };  /* v2.3.1778: outside his forge */

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tourist', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  /* ═══ v2.3.1813: TOWN'S PROPS ARE SWITCHED OFF ═══
     Owner, sending the re-fused BroTown map: "You can just keep the buildings
     and NPCS removed for now."  worldProps.js TOWN_PROPS_ENABLED is the switch.

     Skipped rather than deleted, and gated on the FLAG rather than on an empty
     prop list — those look identical from out here, so a list-based guard would
     turn a genuine drawing regression into a green run.  The moment the flag
     goes back to true this whole file runs again, which is exactly when it
     needs to: the props still carry their v16 positions and will need
     re-measuring against the new map. */
  const propsOn = await P.page.evaluate(
    () => (window.__btTownPropsEnabled ? window.__btTownPropsEnabled() : true));
  if (!propsOn) {
    rec.ok('town props are switched off by directive — scenario skipped', true,
      { flag: 'TOWN_PROPS_ENABLED=false', see: 'src/data/worldProps.js' });
    await P.ctx.close().catch(() => {});
    return;
  }

  const props = await P.page.evaluate(() => (window.__btWorldProps ? window.__btWorldProps() : null));
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

  const d = Math.hypot(anvil.x - BLACKSMITH.x, anvil.y - BLACKSMITH.y);
  rec.ok('the anvil is beside the blacksmith, where it belongs',
    d < 140, { dist: Math.round(d), anvil: { x: anvil.x, y: anvil.y }, smith: BLACKSMITH });

  /* The storekeeper works his own pitch: close to the stall, and not buried
     inside it (the first placement stood him on the stall's ground line and
     the goods hid him completely). */
  const sd = Math.hypot(keeper.x - stall.x, keeper.y - stall.y);
  rec.ok('the storekeeper is at his stall', sd < 200,
    { dist: Math.round(sd), keeper: { x: keeper.x, y: keeper.y }, stall: { x: stall.x, y: stall.y } });
  rec.ok('...and stands in FRONT of it, so the goods do not swallow him',
    keeper.y > stall.y, { keeperY: keeper.y, stallY: stall.y });

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
