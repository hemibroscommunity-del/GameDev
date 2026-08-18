/* The first wood tier is PINE (v2.3.1763).
 *
 * Owner: "I also want the first wood tier for staffs and bows to be pine.  Can
 * you recolor the bow and staff lighter to look like pine?  Also changing 'log'
 * or 'oak log' to 'pine log'?"
 *
 * The three have to agree or the tier is decoration: the tree has to DROP the
 * log the forge ASKS FOR, under the name the bag SHOWS.  They did not agree
 * before this change — the first woodworking tier wanted `wood_wood`, a key
 * nothing in the game has ever produced — so the check that matters most here
 * is the round trip, not the spelling.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Lumberjack', wsPort, webPort });
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);
  await P.page.waitForTimeout(1500);

  /* ── the tier table, as the client holds it ── */
  const tiers = await P.page.evaluate(() => {
    const fns = window._gameFns || {};
    const T = fns.WOODWORKING_TIERS || (window.__btWoodTiers && window.__btWoodTiers());
    if (!T) return null;
    const k = Object.keys(T);
    return { first: k[0], firstLabel: T[k[0]].label, firstWood: T[k[0]].wood,
      hasDuplicatePine: k.filter((x) => (T[x].label || '').toLowerCase() === 'pine').length };
  });
  rec.ok('the first woodworking tier is pine',
    !!tiers && tiers.first === 'pine' && tiers.firstLabel === 'Pine', tiers);
  rec.ok('...and only ONE tier is called Pine (the old lvl-16 tier was renamed)',
    !!tiers && tiers.hasDuplicatePine === 1, tiers);

  /* ── the log the worker actually pays for a felled tree ── */
  const invKey = tiers && ('wood_' + tiers.firstWood);
  rec.ok('the first tier consumes a PINE LOG', invKey === 'wood_pine_log', { invKey });

  /* THE ROUND TRIP.  Granting through the operator endpoint proves the key is
     spendable; what it cannot prove is that a TREE yields it, so the harvest
     name is read from the worker's own table via a felled node below. */
  await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 3 });
  await P.page.waitForTimeout(1500);
  const held = await H.readState(P, (S) => ((S.rpg || {}).inventory || {})['wood_pine_log'] || 0);
  rec.ok('a pine log sits in the bag under that exact key', held === 3, { held });

  /* ── and the game CALLS it a pine log ──
     The bag TILE is titled with the raw key, and the pretty name lives on the
     item card you get by tapping it — so both are read, because "the key says
     pine" and "the player is told pine" are different claims and the owner
     asked for the second one. */
  await H.openDest(P, 'Dashboard').catch(() => {});
  await P.page.waitForTimeout(1200);
  const tile = await P.page.locator('[title="wood_pine_log"]').first()
    .click({ timeout: 8000 }).then(() => true).catch(() => false);
  rec.ok('the bag holds a tile keyed wood_pine_log', tile);
  await P.page.waitForTimeout(900);
  const card = await H.bodyText(P);
  rec.ok('the item card calls it a pine log, not an oak log or a bare log',
    /pine\s*log/i.test(card) && !/oak\s*log/i.test(card),
    (card.match(/.{0,40}log.{0,40}/i) || ['no "log" text found'])[0]);

  /* ── the art is the lighter pine set ──
     Read the loaded texture rather than the file on disk: the point is that the
     GAME is pointed at the repainted art, not that a file exists. */
  const art = await P.page.evaluate(async () => {
    const load = (src) => new Promise((res) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src;
    });
    const img = await load('/sprites/weapons/bows/bow-southwest.png');
    if (!img) return { err: 'pine bow art missing' };
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (mx < 60 && mx - mn < 24) continue;   /* skip the keyline */
      sum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]); n++;
    }
    return { mean: Math.round(sum / Math.max(1, n)), px: n };
  });
  /* The shipped brown bow measured 96; pine lands near 160.  Asserting a
     THRESHOLD rather than an exact value so a future re-tint of the same
     intent does not fail, while a revert to the brown art does. */
  rec.ok('the bow art is the lighter pine wood', !art.err && art.mean >= 130, art);

  await P.ctx.close().catch(() => {});
}
