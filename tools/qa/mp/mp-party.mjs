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
    /* __broLegacyUI.chat() TOGGLES, so opening it blind can close it — drive
       it until the Send button is actually there. */
    const chatOpen = () => A.page.evaluate(() =>
      [...document.querySelectorAll('button')].some((b) => b.offsetParent && b.textContent.trim() === 'Send'));
    for (let i = 0; i < 3 && !(await chatOpen()); i++) {
      await A.page.evaluate(() => window.__broLegacyUI && window.__broLegacyUI.chat());
      await A.page.waitForTimeout(600);
    }
    rec.ok('the chat bar opens', await chatOpen());
    await A.page.locator('button:has-text("Send")').locator('xpath=preceding-sibling::input[1]')
      .first().fill('/p party line');
    await H.clickText(A, 'Send');
    /* and close it again so it cannot sit over the party HUD checks below */
    await A.page.waitForTimeout(400);
    if (await chatOpen()) await A.page.evaluate(() => window.__broLegacyUI && window.__broLegacyUI.chat());
    const gotP = await H.waitFor(B, (S) => (S.chatLog || []).map((c) => c.text),
      (l) => l.some((t) => /party line/.test(t)), { timeout: 15000, label: 'party chat' })
      .then(() => true).catch(() => false);
    rec.ok('a /p message reaches the party', gotP,
      await H.readState(B, (S) => (S.chatLog || []).slice(-3)));
  }

  /* ── v2.3.1742: a teammate is not a target ──
     Owner: "party mode looks like it needs fixed.  It auto targeted my
     teammate and looked like my attacks were damaging them."  A tap within
     25px of another player combat-locks them, and a player lock is exactly
     what makes the client start sending PvP swings — which the server then
     resolves as a CONE, hitting every player in the arc.  So the tap must
     still INSPECT a teammate (useful, harmless) and must no longer AIM at
     one.
     The same tap AFTER the party breaks up is the control, and it is the
     point of doing this through the real click rather than a state poke: it
     proves the coordinates actually land on the player, so "no lock while
     partied" reads as the rule working instead of the click missing. */
  const tapPeer = async () => {
    const pt = await A.page.evaluate((bid) => {
      const S = window._gameState && window._gameState.current;
      const o = S && S.others && S.others[bid];
      const el = document.querySelector('canvas.brotown-canvas');
      if (!o || !el || !S.camera) return null;
      const r = el.getBoundingClientRect();
      /* Same forward transform the tap handler uses (world -> CSS via the
         renderer's published scale), then back into viewport coords. */
      const sx = ((o.renderX != null ? o.renderX : o.x) - S.camera.x) * (S._worldScaleX || 1);
      const sy = ((o.renderY != null ? o.renderY : o.y) - S.camera.y) * (S._worldScaleY || 1);
      return { x: r.left + sx, y: r.top + sy, on: sx > 2 && sy > 2 && sx < r.width - 2 && sy < r.height - 2 };
    }, bId);
    if (!pt || !pt.on) return { hit: false, pt };
    await A.page.mouse.click(pt.x, pt.y);
    await A.page.waitForTimeout(700);
    const lock = await H.readState(A, (S) => (S.lockedTarget
      ? { type: S.lockedTarget.type, id: S.lockedTarget.id } : null));
    const card = await A.page.locator('.bt-inspect-card').first()
      .isVisible({ timeout: 2000 }).catch(() => false);
    await A.page.keyboard.press('Escape').catch(() => {});
    await A.page.waitForTimeout(300);
    return { hit: true, lock, card };
  };

  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S) S.lockedTarget = null;
  });
  const mate = await tapPeer();
  rec.ok('the teammate is on screen and tappable (guard: a missed tap proves nothing)',
    mate.hit && mate.card, mate);
  if (mate.hit) {
    rec.ok('tapping a party member does NOT combat-lock them',
      !(mate.lock && mate.lock.type === 'player'), mate.lock);
  }

  /* ── the HUD shows it ── */
  /* textContent, not innerText: innerText depends on layout and has come back
     empty here under load, which reads as "the HUD never rendered". */
  const hud = await H.waitUi(A, () => /PARTY/i.test(document.body.textContent || ''),
    { label: 'party HUD', timeout: 15000 }).then(() => true).catch(() => false);
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

    /* The control for the check above: the identical tap, on the identical
       player, once they are no longer a teammate.  If this one does not
       lock either, the earlier pass was a missed click and means nothing. */
    await A.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S) S.lockedTarget = null;
    });
    const ex = await tapPeer();
    if (ex.hit) {
      rec.ok('...and the same tap DOES lock them once they leave the party',
        !!(ex.lock && ex.lock.type === 'player' && ex.lock.id === bId), ex.lock);
    } else {
      rec.skip('...and the same tap DOES lock them once they leave the party',
        'the ex-member was no longer on screen');
    }
  }

  await A.ctx.close(); await B.ctx.close();
}
