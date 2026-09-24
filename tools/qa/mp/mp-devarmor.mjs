/* The admin kit hands out armour (v2.3.2875).
 *
 * Owner: "add armor to the admin button (in the give weapons) so I can
 * actually test it."
 *
 * The Test panel's "Give weapons + armor + levels" calls /api/admin/dev/kit.
 * This drives that endpoint against a real worker and checks the pieces land
 * where the player can use them:
 *   - two chest pieces in armorStash and two legs pieces in legsStash (the
 *     slot decides the bag -- v2.3.1701's "greaves on the chest" bug),
 *   - each with its metal (it picks the art) and a server gid,
 *   - and a copper set, put on the way equipActions does (stat piece ->
 *     syncArmorLayers), is drawn as copper on the character.
 */
import * as H from './harness.mjs';

const bags = (P) => P.page.evaluate(() => {
  const R = window._gameState && window._gameState.current && window._gameState.current.rpg;
  const pick = (a) => (Array.isArray(a) ? a.map((p) => ({ name: p.name, mat: p.mat, slot: p.slot, gid: p.gid })) : null);
  return R ? { chest: pick(R.armorStash), legs: pick(R.legsStash) } : null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tester', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  const myId = await H.readState(P, (S) => S.myId);
  const res = await H.devOp(wsPort, 'kit', myId, { what: 'armor' });
  rec.ok('the kit answers and counts four armour pieces', !!(res && res.ok && res.armor === 4), res);
  await P.page.waitForTimeout(1500);
  const b = await bags(P);
  const chest = (b && b.chest) || [], legs = (b && b.legs) || [];
  rec.ok('two chest pieces land in the chest bag', chest.filter((p) => /Torso/.test(p.name)).length === 2, b);
  rec.ok('two legs pieces land in the legs bag', legs.filter((p) => /Greaves/.test(p.name)).length === 2, b);
  rec.ok('each carries its metal and a server gid',
    [...chest, ...legs].every((p) => (p.mat === 'copper' || p.mat === 'iron') && typeof p.gid === 'string' && p.gid), b);
  const worn = await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    const c = R.armorStash.find((p) => p.mat === 'copper'), l = R.legsStash.find((p) => p.mat === 'copper');
    R.armor = c; R.legsArmor = l;
    window.__btSyncArmorLayers(R);
    return { chest: window.__btGetGear('chest'), legs: window.__btGetGear('legs') };
  });
  rec.ok('the copper set, put on, is drawn as copper armour', worn.chest === 'copperplate' && worn.legs === 'coppergreaves', worn);
  await P.ctx.close().catch(() => {});
}
