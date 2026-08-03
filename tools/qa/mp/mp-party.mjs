/* Parties through the real UI.
 *
 * The party HUD is a pure renderer of the server's party_state snapshot, so
 * the assertions read the roster both sides actually hold — an invite that
 * only lit up one screen would be a broken party, not a working one.  The
 * leave path matters as much as the join path: a party that cannot be left
 * strands both players in a roster they never agreed to keep.
 */
import * as H from './harness.mjs';

const party = (P) => H.readState(P, (S) => {
  const p = S._party;
  if (!p) return null;
  return { state: p.state, members: p.members ? p.members.length : 0, ids: p.members ? p.members.map((m) => m.id) : [] };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Leader', nameB: 'Member' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.party));
  rec.ok('the worker advertises the party capability', caps);

  /* ── invite ── */
  await H.openInspect(A, bId);
  const btns = await H.buttonTexts(A);
  rec.ok('the inspect card offers a party invite', btns.some((t) => /Invite to Party/.test(t)), btns);
  await H.clickText(A, 'Invite to Party');

  /* ── B sees the invite card and joins ── */
  const invited = await H.waitUi(B, () => /Party Invite/.test(document.body.innerText)
    && [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Join'),
  { label: 'B sees the party invite', timeout: 20000 }).then(() => true).catch(() => false);
  rec.ok('the invite reaches the other player', invited);
  if (!invited) { await A.ctx.close(); await B.ctx.close(); return; }
  await H.clickText(B, 'Join');
  await B.page.waitForTimeout(2500);

  /* ── both hold the same two-member roster ── */
  const [pa, pb] = await Promise.all([party(A), party(B)]);
  rec.ok('the inviter holds a 2-member party', !!pa && pa.members === 2, pa);
  rec.ok('the joiner holds a 2-member party', !!pb && pb.members === 2, pb);
  rec.ok('both rosters name the same two players',
    !!pa && !!pb && [...pa.ids].sort().join() === [aId, bId].sort().join()
      && [...pb.ids].sort().join() === [aId, bId].sort().join(), { pa, pb });

  /* ── party chat: "/p <msg>" is party-only, and the server validates it ──
     Its own narrow cap (partyChat), separate from caps.party, so a worker
     with parties but no party chat still works — the reason it gets its own
     check rather than riding on the roster assertions above. */
  const pchat = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.partyChat));
  rec.ok('the worker advertises party chat', pchat);
  if (pchat) {
    await A.page.evaluate(() => window.__broLegacyUI && window.__broLegacyUI.chat());
    await A.page.waitForFunction(() =>
      [...document.querySelectorAll('button')].some((b) => b.offsetParent && b.textContent.trim() === 'Send'),
    null, { timeout: 8000 }).catch(() => {});
    await A.page.locator('button:has-text("Send")').locator('xpath=preceding-sibling::input[1]')
      .first().fill('/p party line');
    await H.clickText(A, 'Send');
    const gotP = await H.waitFor(B, (S) => (S.chatLog || []).map((c) => c.text),
      (l) => l.some((t) => /party line/.test(t)), { timeout: 15000, label: 'party chat' })
      .then(() => true).catch(() => false);
    rec.ok('a /p message reaches the party', gotP,
      await H.readState(B, (S) => (S.chatLog || []).slice(-3)));
  }

  /* ── the HUD shows it ── */
  const hud = await H.waitUi(A, () => /PARTY/i.test(document.body.innerText),
    { label: 'party HUD', timeout: 10000 }).then(() => true).catch(() => false);
  rec.ok('the party HUD renders for the inviter', hud);

  /* ── leaving clears it on BOTH sides ── */
  /* NOTE for the owner: leaving is a bare ✖ whose only label is a `title`
     tooltip — and tooltips do not exist on touch, which is the primary
     platform.  The test therefore selects on the title, which is the only
     stable handle the markup offers. */
  const left = await B.page.locator('button[title="Leave party"]').first()
    .click({ timeout: 8000 }).then(() => true).catch(() => false);
  rec.ok('the party HUD offers a way to leave', left);
  if (left) {
    await B.page.waitForTimeout(2500);
    const [pa2, pb2] = await Promise.all([party(A), party(B)]);
    rec.ok('leaving clears the party for the leaver', !pb2 || pb2.members < 2, pb2);
    rec.ok('leaving clears the party for the other member too', !pa2 || pa2.members < 2, pa2);
  }

  await A.ctx.close(); await B.ctx.close();
}
