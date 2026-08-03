/* Clans: found one, invite the other player, and have them accept.
 *
 * Worth its own scenario because clan JOINING was impossible for a while —
 * clan_invite broadcasts went nowhere, since no client handler existed
 * (fixed in v2.3.1125).  A test that only checked "the invite button sends a
 * message" would have passed throughout that outage.  So the assertion is the
 * roster: after accepting, BOTH players have to be members of the same clan.
 */
import * as H from './harness.mjs';

const clan = (P) => H.readState(P, (S) => {
  const c = S._clanData;
  if (!c) return null;
  return { name: c.name, tag: c.tag, members: c.members ? c.members.length : 0 };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Founder', nameB: 'Recruit' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  /* founding costs 500g */
  await H.grant(wsPort, aId, 'gold', { amount: 900 });
  await A.page.waitForTimeout(1500);

  /* ── found a clan through the panel ── */
  await A.page.evaluate(() => window.__broLegacyUI && window.__broLegacyUI.clan());
  const opened = await H.waitUi(A, () => [...document.querySelectorAll('button')]
    .some((b) => /Create Clan/.test(b.textContent)), { label: 'clan panel', timeout: 10000 })
    .then(() => true).catch(() => false);
  rec.ok('the clan panel opens and offers "Create Clan"', opened);
  if (!opened) { await A.ctx.close(); await B.ctx.close(); return; }

  await H.clickText(A, 'Create Clan');
  await A.page.waitForSelector('input[placeholder="My Awesome Clan"]', { timeout: 8000 });
  await A.page.fill('input[placeholder="My Awesome Clan"]', 'Harness Crew');
  await A.page.fill('input[placeholder="CLAN"]', 'HQA');
  /* the form's submit is "Create (500g)" — a different button from the
     "Create Clan (500g)" that opened the form */
  await H.clickText(A, 'Create (');
  const founded = await H.waitFor(A, (S) => (S._clanData ? S._clanData.tag : null), (t) => t === 'HQA',
    { timeout: 20000, label: 'clan founded' }).then(() => true).catch(() => false);
  rec.ok('the clan is founded server-side', founded, await clan(A));
  if (!founded) { await A.ctx.close(); await B.ctx.close(); return; }

  const aCoins = await H.readState(A, (S) => (S.rpg || {}).coins);
  rec.ok('founding debits the 500g fee', aCoins != null && aCoins < 900, { aCoins });

  /* THE UI HAS TO KNOW.  Asserting only S._clanData would have passed all the
     way through the v2.3.1611 bug, where the clan existed and was paid for
     while every screen still said "Create Clan" and offered no way to invite
     anyone.  So check what the founder can actually see. */
  await A.page.waitForTimeout(1500);
  const stillOffering = await A.page.evaluate(() =>
    [...document.querySelectorAll('button')].some((b) => b.offsetParent && /Create Clan/.test(b.textContent)));
  rec.ok('the clan panel stops offering "Create Clan" once you have one', !stillOffering,
    await H.buttonTexts(A));
  const panelText = await H.bodyText(A);
  rec.ok('the clan panel shows the clan you just founded',
    /\[HQA\]/.test(panelText) && /Harness Crew/.test(panelText), panelText.slice(0, 200));

  /* ── invite ──
     Close the panel first: __broLegacyUI.clan() TOGGLES, so calling it blind
     can just as easily re-open it.  Drive it until the owned-clan view is
     actually gone. */
  for (let i = 0; i < 3; i++) {
    const open = await A.page.evaluate(() =>
      [...document.querySelectorAll('button')].some((b) => b.offsetParent && /Logo Editor/.test(b.textContent)));
    if (!open) break;
    await A.page.evaluate(() => window.__broLegacyUI && window.__broLegacyUI.clan());
    await A.page.waitForTimeout(700);
  }
  await H.openInspect(A, bId);
  const btns = await H.buttonTexts(A);
  rec.ok('a clan member can invite from the inspect card',
    btns.some((t) => /Invite to \[HQA\]/.test(t)), btns);
  await H.clickText(A, 'Invite to [HQA]');

  /* ── B accepts from their clan panel ── */
  const parked = await H.waitFor(B, (S) => (S._pendingClanInvite ? S._pendingClanInvite.clanTag : null),
    (t) => t === 'HQA', { timeout: 20000, label: 'invite parked on B' }).then(() => true).catch(() => false);
  rec.ok('the invite reaches the other player', parked);
  if (parked) {
    await B.page.evaluate(() => window.__broLegacyUI && window.__broLegacyUI.clan());
    const acceptable = await H.waitUi(B, () => [...document.querySelectorAll('button')]
      .some((b) => /Accept invite/.test(b.textContent)), { label: 'accept button', timeout: 10000 })
      .then(() => true).catch(() => false);
    rec.ok('the clan panel shows the invite to accept', acceptable);
    if (acceptable) {
      await H.clickText(B, 'Accept invite');
      const joined = await H.waitFor(B, (S) => (S._clanData ? S._clanData.tag : null), (t) => t === 'HQA',
        { timeout: 20000, label: 'B joins the clan' }).then(() => true).catch(() => false);
      rec.ok('accepting actually joins the clan', joined, await clan(B));

      await A.page.waitForTimeout(2500);
      const ca = await clan(A), cb = await clan(B);
      rec.ok('the founder sees a 2-member roster', !!ca && ca.members === 2, ca);
      rec.ok('the recruit sees the same clan', !!cb && cb.tag === 'HQA' && cb.name === 'Harness Crew', cb);
    }
  }

  await A.ctx.close(); await B.ctx.close();
}
