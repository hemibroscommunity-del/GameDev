/* OTHER BROS WEAR THEIR SHIELD ON THEIR BACK TOO (v2.3.1790).
 *
 * v2.3.1782 built the slung shield for the local player and said outright that
 * remote players still rendered without it.  This is that gap closed, and it is
 * tested with TWO REAL CLIENTS rather than by poking one client's own state —
 * because the interesting half is the wire: the observer has to learn that the
 * other bro owns a shield at all.
 *
 * It learns it from `rpgData.shield`, which the presence payload already
 * carried for the inspect card.  So there is NO protocol change here, and
 * nothing to sequence across a deploy in either direction: an old client shows
 * a new client's shield, and a new client shows an old one's.
 *
 * MEASURED BASELINE (observer's view of the other bro, pine shield equipped):
 *     facing north      front clone drawn, loIdx 0 < bodyIdx
 *     facing south      behind clone drawn
 *     no shield         neither clone drawn
 */
import * as H from './harness.mjs';

async function peerView(P) {
  return P.page.evaluate(() => {
    const m = window.__btPeerShield || {};
    const ids = Object.keys(m);
    return ids.length ? Object.assign({ id: ids[0], peers: ids.length }, m[ids[0]]) : null;
  });
}

async function setFacing(P, idx) {
  await P.page.evaluate((i) => {
    const S = window._gameState.current;
    S._facingAngle = i * Math.PI / 4; S._aimAngle = i * Math.PI / 4; S.lockedTarget = null;
  }, idx);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Bearer', wsPort, webPort });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, guest: true });
  await H.enterWorld(B);
  await B.page.waitForTimeout(2500);

  /* Put them beside each other so the observer definitely has the bearer in
     its zone entity list. */
  for (const [P, x] of [[A, 1050], [B, 1090]]) {
    await P.page.evaluate((px) => {
      const S = window._gameState.current;
      S.player.x = px; S.player.y = 720;
    }, x);
  }
  await B.page.waitForTimeout(1500);

  /* NO SHIELD YET — the negative case first, so a build that draws the clones
     unconditionally cannot pass this file. */
  await setFacing(A, 6);
  await B.page.waitForTimeout(2500);
  const bare = await peerView(B);
  rec.ok('the observer can see the other bro at all (guard)', !!bare, { probe: bare });
  if (!bare) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }
  rec.ok('with no shield owned, no shield is drawn on him',
    bare.on === false && bare.hasShield === false, { probe: bare });

  /* EQUIP ONE, and let the presence broadcast carry it across. */
  await A.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.shield = { name: 'Pine Shield', type: 'shield', gearBase: 'pine' };
  });
  await B.page.waitForTimeout(4000);

  const north = await peerView(B);
  console.log('    north', JSON.stringify(north));
  rec.ok('the shield reaches the observer over the wire', !!(north && north.hasShield),
    { probe: north });
  rec.ok('...and it is drawn on his back', !!(north && north.on), { probe: north });
  rec.ok('facing away from the camera it draws in FRONT of him',
    !!(north && north.front && !north.behind), { behind: north && north.behind, front: north && north.front });
  rec.ok('the behind-clone can never reach over the body',
    !!(north && north.loIdx < north.bodyIdx), { loIdx: north && north.loIdx, bodyIdx: north && north.bodyIdx });
  rec.ok('the front-clone is above the body',
    !!(north && north.hiIdx > north.bodyIdx), { hiIdx: north && north.hiIdx, bodyIdx: north && north.bodyIdx });

  /* TURN HIM ROUND — the side of the body flips, which is the whole rule. */
  await setFacing(A, 2);
  await B.page.waitForTimeout(2500);
  const south = await peerView(B);
  console.log('    south', JSON.stringify(south));
  rec.ok('facing the camera it draws BEHIND him',
    !!(south && south.behind && !south.front), { behind: south && south.behind, front: south && south.front });
  /* GUARD: the observer really did re-read a changed facing, rather than this
     pair of assertions agreeing on one stale frame. */
  rec.ok('the observer tracked the turn (guard)',
    !!(north && south && north.facing !== south.facing),
    { northFacing: north && north.facing, southFacing: south && south.facing });

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
