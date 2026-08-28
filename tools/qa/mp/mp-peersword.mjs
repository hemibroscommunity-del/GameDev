/* OTHER BROS CARRY THEIR SWORD THE WAY YOU CARRY YOURS (v2.3.1791).
 *
 * The owner reported the carried sword being buried under the shirt on SW, SE
 * and E.  v2.3.1787 fixed it — in _updatePlayer only.  The remote render is a
 * separate implementation of the same thing, so every OTHER bro kept the bug.
 *
 * That is the third defect in this file that had to be fixed twice for the
 * same reason (v2.3.1786's ReferenceError landed in the wrong one of the two
 * blocks; v2.3.1790's slung shield was local-only).  Hence this file: it
 * asserts the peer render directly, with two real clients, so the next fix to
 * one half has something that fails when the other half is forgotten.
 *
 * Both halves of v2.3.1787 are checked:
 *   - "in front" is measured against the topmost VISIBLE worn layer, not the
 *     invisible oSpriteBody reference.  Bare this is unobservable (the default
 *     shirt is baked into the body sheet), so the armoured case is the one that
 *     matters and it is here deliberately.
 *   - SW joins the in-front set for held weapons.
 *
 * MEASURED BASELINE (observer's view, peer holding a greatsword):
 *     E / SE / S / SW / NE   weapon in front
 *     W / NW / N             weapon behind
 *     armoured               wcIdx > gearChestIdx
 */
import * as H from './harness.mjs';

const FRONT = new Set(['east', 'southeast', 'south', 'southwest', 'northeast']);
const ORDER = [['east', 0], ['southeast', 1], ['south', 2], ['southwest', 3],
               ['west', 4], ['northwest', 5], ['north', 6], ['northeast', 7]];

async function peerSword(P) {
  return P.page.evaluate(() => {
    const m = window.__btPeerSword || {};
    const ids = Object.keys(m);
    return ids.length ? Object.assign({ id: ids[0] }, m[ids[0]]) : null;
  });
}

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Carrier', wsPort, webPort });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Onlooker', wsPort, webPort, guest: true });
  await H.enterWorld(B);
  await B.page.waitForTimeout(2500);
  for (const [P, x] of [[A, 1050], [B, 1090]]) {
    await P.page.evaluate((px) => {
      const S = window._gameState.current;
      S.player.x = px; S.player.y = 720;
    }, x);
  }
  await A.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'melee';
    S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' };
  });
  await B.page.waitForTimeout(3500);

  const first = await peerSword(B);
  rec.ok('the observer sees the other bro carrying something', !!first, { probe: first });
  if (!first) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }
  /* GUARD: the peer's weapon TYPE crossed the wire.  The SW rule is scoped to
     held types, so without this the facing assertions could pass for the wrong
     reason. */
  rec.ok('the peer\'s weapon type reached the observer (guard)',
    first.wpnType === 'greatsword', { wpnType: first.wpnType });

  const seen = [];
  for (const [name, idx] of ORDER) {
    await A.page.evaluate((i) => {
      const S = window._gameState.current;
      S._facingAngle = i * Math.PI / 4; S._aimAngle = i * Math.PI / 4; S.lockedTarget = null;
      S.rpg.activeSlot = 'melee';
      S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' };
    }, idx);
    await B.page.waitForTimeout(900);
    const m = await peerSword(B);
    seen.push({ f: name, saw: m && m.facing, inFront: m && m.inFront, wc: m && m.wcIdx, body: m && m.bodyIdx });
    if (!m || m.facing !== name) continue;   /* the turn had not arrived yet; the guard below covers it */
    rec.ok(`${name}: the peer's blade is ${FRONT.has(name) ? 'in front of' : 'behind'} his body`,
      (m.wcIdx > m.bodyIdx) === FRONT.has(name),
      { wcIdx: m.wcIdx, bodyIdx: m.bodyIdx, expectedInFront: FRONT.has(name) });
  }
  console.log('    facings', JSON.stringify(seen));
  /* GUARD: the observer actually tracked the turns rather than every reading
     being one stale frame. */
  const distinct = new Set(seen.map((s) => s.saw).filter(Boolean));
  rec.ok('the observer tracked the peer turning (guard)', distinct.size >= 4,
    { distinctFacings: [...distinct] });

  /* THE ARMOURED CASE — the half a bare test cannot see, because bare the
     shirt is baked into the body sheet and nothing sits above the reference. */
  await A.page.evaluate(() => {
    const S = window._gameState.current;
    S._facingAngle = 0; S._aimAngle = 0;
    try { window.__btSetGear('chest', 'copperplate'); } catch (e) {}
  });
  await B.page.waitForTimeout(4000);
  const armoured = await peerSword(B);
  console.log('    armoured', JSON.stringify(armoured));
  if (armoured && armoured.gearChestVis) {
    rec.ok('with a chest plate on, the peer\'s blade still clears it',
      armoured.wcIdx > armoured.gearChestIdx,
      { wcIdx: armoured.wcIdx, gearChestIdx: armoured.gearChestIdx });
  } else {
    rec.ok('the peer\'s chest plate reached the observer (guard for the check above)',
      false, { gearChestVis: armoured && armoured.gearChestVis });
  }

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
