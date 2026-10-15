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

  /* Mark B as a verified bro on A's client and let the plate rebuild.
     v2.3.3255: a NUMBER, as the worker sends it (tick.js `bro`, the worn Bro's
     id) -- the checkmark's rule (broWallet.js broBadgeOf) takes nothing else,
     and a full tick entry now rewrites it from the wire, so it is re-asserted
     below. */
  await A.page.evaluate((id) => {
    const S = window._gameState.current;
    if (S.others[id]) S.others[id].bro = 4242;
  }, bId);

  let badge = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    badge = await A.page.evaluate((id) => {
      const S = window._gameState.current;
      /* re-assert in case a roster message re-seeded the entry */
      if (S.others[id] && !S.others[id].bro) S.others[id].bro = 4242;
      return (window.__btPeerBadge && window.__btPeerBadge[id]) || null;
    }, bId);
    if (badge && badge.bro && badge.visible && !badge.empty) break;
    await A.page.waitForTimeout(250);
  }
  rec.ok('the renderer built a plate for the bro peer and showed its badge slot (guard)',
    !!(badge && badge.bro && badge.visible), badge);
  rec.ok('the badge sprite carries the icon, not Texture.EMPTY',
    !!(badge && !badge.empty && badge.texW > 1), badge);

  /* ═══ v2.3.3255: THE COUNT ALONE WEARS THE CHECKMARK, AND THE PROFILE SAYS HOW MANY ═══
     The owner: "a 'verified' checkmark for people who own 1 hemi bro or more
     ... list the number of hemi bros owned somewhere on their profile".  The
     worker's `brn` (tick.js; broverify.js reads the wallet's balanceOf) with no
     worn Bro verified.  Stubbed one field upstream as `bro` is above -- this
     worker cannot reach Hemi -- and re-asserted every poll, since a full tick
     entry rewrites both fields from the wire (wsClient.js). */
  const stub = (id, bro, brn) => A.page.evaluate(([i, b, n]) => {
    const o = window._gameState.current.others[i];
    if (o) { o.bro = b; o.brn = n; }
    return (window.__btPeerBadge && window.__btPeerBadge[i]) || null;
  }, [id, bro, brn]);
  let cnt = null;
  const t1 = Date.now();
  while (Date.now() - t1 < 15000) {
    cnt = await stub(bId, null, 3);
    if (cnt && cnt.bro && cnt.visible && !cnt.empty) break;
    await A.page.waitForTimeout(250);
  }
  rec.ok('a wallet holding 3 Hemi Bros, no worn Bro verified: the name plate wears the checkmark',
    !!(cnt && cnt.bro && cnt.visible && !cnt.empty), cnt);

  await H.openInspect(A, bId);
  await H.clickAct(A, 'profile');
  const readProfile = () => A.page.evaluate(() => {
    const el = document.querySelector('[data-profile="player"]');
    if (!el) return null;
    const c = el.querySelector('[data-stat="hemibros"]');
    return { count: c ? (c.innerText || '').replace(/\s+/g, ' ').trim() : null, badge: !!el.querySelector('.bt-pin-bro') };
  });
  let prof = null;
  const t2 = Date.now();
  while (Date.now() - t2 < 8000) {
    await stub(bId, null, 3);
    prof = await readProfile();
    if (prof && prof.count) break;
    await A.page.waitForTimeout(400);   /* the card re-reads its profile each second */
  }
  rec.ok('...and their profile says how many, "3 Hemi Bros", beside the checkmark',
    !!prof && prof.count === '3 Hemi Bros' && prof.badge, prof);
  /* the picture, for a person to look at (tools/qa/mp/out/, not committed) */
  try {
    await stub(bId, null, 3);
    await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/brobadge-profile.png` });
  } catch (e) { /* a picture is not a check */ }

  let off = null, profOff = null;
  const t3 = Date.now();
  while (Date.now() - t3 < 8000) {
    off = await stub(bId, null, 0);
    profOff = await readProfile();
    if (off && !off.bro && !off.visible && profOff && !profOff.count && !profOff.badge) break;
    await A.page.waitForTimeout(400);
  }
  rec.ok('a wallet holding none: no checkmark on the plate, no count or badge on the profile',
    !!off && !off.bro && !off.visible && !!profOff && !profOff.count && !profOff.badge, { off, profOff });

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
