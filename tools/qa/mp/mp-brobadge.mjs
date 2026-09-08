/* THE VERIFIED-BRO BADGE HAS ART IN IT (v2.3.2345)
 *
 * From v2.3.1576 the name plate reserved room for a verified-Hemi-Bro badge
 * and lit its sprite `visible` -- and the sprite was empty every single time.
 * The renderer fetched the icon with Texture.from(url), whose comment assumed
 * that started a load; in Pixi 8 it is Cache.get(id), a lookup, and nothing
 * in the client ever loaded that URL.  So every badged player's plate showed
 * a blank gap where the badge should be, and the console filled with
 * "[Assets] Asset id /icons/ui/verified-bro-small.webp was not found in the
 * Cache" until Pixi stopped reporting.
 *
 * Asserted off the SPRITE, not off the flag: `visible` was already true on the
 * broken build, which is exactly why nobody's test caught it.  The badge has
 * to carry a texture that is not Texture.EMPTY, the preload manifest has to
 * report the icon settled, and the warning must not be logged.
 *
 * HOW THE PEER BECOMES A BRO.  `bro` is server-owned (broverify.js is its only
 * writer, behind a wallet signature) and there is no dev route that sets it,
 * so it is STUBBED on the receiving client: A writes `bro` onto its own
 * S.others entry for B.  That is the same field the server's tick and roster
 * would fill (tick.js playerWire / join.js state_sync.players), read by the
 * same renderer path -- the render side of the feature is what is under test,
 * and the wire side of `bro` is not stubbed away, it is bypassed one field
 * upstream of the thing being measured.
 */
import * as H from './harness.mjs';

const WARN_SIG = '[Assets] Asset id /icons/ui/verified-bro-small';

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Viewer', nameB: 'Verified' });
  /* The harness records console ERRORS only; Pixi's cache miss is a WARN.
     Captured from here on -- the miss can only fire once a badged plate is
     built, which is after the stub below, so nothing is missed. */
  const warns = [];
  A.page.on('console', (m) => {
    if (m.type() === 'warning' || m.type() === 'warn') warns.push(m.text().slice(0, 200));
  });

  /* Preload report: the icon is registered in the global manifest and settled
     before the intro overlay lifted. */
  const report = await A.page.evaluate(() => window.__btPreloadReport || null);
  rec.ok('the preload manifest ran and reported (guard)', !!report, report);
  rec.ok('...and the bro badge is a registered, fulfilled entry in it',
    !!(report && report.broBadge === 'fulfilled'), report && { broBadge: report.broBadge });

  const bId = await H.readState(A, (S) => Object.keys(S.others)[0] || null);
  rec.ok('A sees B (guard)', !!bId, { bId });
  if (!bId) { await A.ctx.close(); await B.ctx.close(); return; }

  /* Mark B as a verified bro on A's client and let the plate rebuild. */
  await A.page.evaluate((id) => {
    const S = window._gameState.current;
    if (S.others[id]) S.others[id].bro = 'qa-stub-bro';
  }, bId);

  let badge = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    badge = await A.page.evaluate((id) => {
      const S = window._gameState.current;
      /* re-assert in case a roster message re-seeded the entry */
      if (S.others[id] && !S.others[id].bro) S.others[id].bro = 'qa-stub-bro';
      return (window.__btPeerBadge && window.__btPeerBadge[id]) || null;
    }, bId);
    if (badge && badge.bro && badge.visible && !badge.empty) break;
    await A.page.waitForTimeout(250);
  }
  rec.ok('the renderer built a plate for the bro peer and showed its badge slot (guard)',
    !!(badge && badge.bro && badge.visible), badge);
  rec.ok('the badge sprite carries the icon, not Texture.EMPTY',
    !!(badge && !badge.empty && badge.texW > 1), badge);

  /* Give any late warning a moment to land, then read the log. */
  await A.page.waitForTimeout(600);
  const misses = warns.filter((w) => w.includes(WARN_SIG));
  rec.ok('no "[Assets] Asset id /icons/ui/verified-bro-small ... not found in the Cache" warning was logged',
    misses.length === 0, misses.slice(0, 3));

  const errs = A.logs.concat(B.logs).filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await A.ctx.close();
  await B.ctx.close();
}
