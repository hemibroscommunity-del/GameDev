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

  /* ── v2.3.1743: the party action is at the TOP, and the body still scrolls ──
     Owner: "party should be moved to the top part of the modal".  It used to
     sit inside the scroll body under Equipment / Stats / Record — below the
     fold on a phone.
     Measured on the PHONE viewport because that is the platform where being
     below the fold actually costs you the button.  The second assertion is
     the one that earns its keep: the card is a CSS grid whose rows are
     assigned by child ORDER, so inserting a row mis-assigns `minmax(0, 1fr)`
     and the body silently stops being the scrolling part — which is exactly
     what the first cut of this change did (the button drew itself on top of
     the Equipment section).  A "is it near the top" check alone passes
     happily through that bug. */
  await A.page.setViewportSize({ width: 390, height: 844 });
  await A.page.waitForTimeout(900);
  const geom = await A.page.evaluate(() => {
    const card = document.querySelector('.bt-inspect-card');
    const body = document.querySelector('.ls-scrollbody');
    const btn = [...document.querySelectorAll('.bt-inspect-card button')]
      .find((b) => /Invite to Party/.test(b.textContent || ''));
    const row = [...document.querySelectorAll('.bt-inspect-card .bt-inspect-tp')]
      .map((b) => b.getBoundingClientRect()).pop();
    if (!card || !body || !btn) return null;
    const c = card.getBoundingClientRect(), bo = body.getBoundingClientRect(), bt = btn.getBoundingClientRect();
    return {
      aboveBody: bt.bottom <= bo.top + 2,
      insideCard: bt.top >= c.top - 1 && bt.bottom <= c.bottom + 1,
      bodyScrolls: body.scrollHeight > body.clientHeight + 4,
      /* the pinned TP/Trade/Duel row must still be fully inside the card */
      rowPinned: !!row && row.bottom <= c.bottom + 1,
      /* and nothing may overlap the button (the grid bug drew it over the
         Equipment block, where Playwright could see it but not click it) */
      topmostAtCentre: (() => {
        const el = document.elementFromPoint((bt.left + bt.right) / 2, (bt.top + bt.bottom) / 2);
        return !!el && (el === btn || btn.contains(el));
      })(),
    };
  });
  rec.ok('the party action sits above the scrolling stats (no hunting for it)',
    !!geom && geom.aboveBody && geom.insideCard, geom);
  rec.ok('...and the body is still the part that scrolls (the new row did not steal 1fr)',
    !!geom && geom.bodyScrolls && geom.rowPinned, geom);
  rec.ok('...and nothing is drawn on top of it', !!geom && geom.topmostAtCentre, geom);
  await A.page.setViewportSize({ width: 1000, height: 780 });
  await A.page.waitForTimeout(600);

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

  /* ── v2.3.1743: someone already on your roster is not invitable ──
     Tapping a teammate opens this card (v2.3.1742), and offering "Invite to
     Party" to someone already in it just earns an 'already partied' error
     from the worker. */
  await H.openInspect(A, bId);
  await A.page.waitForTimeout(500);
  const mateCard = await H.bodyText(A);
  const mateBtns = await H.buttonTexts(A);
  rec.ok('an existing party member reads "In your party", with no invite offered',
    /In your party/.test(mateCard) && !mateBtns.some((t) => /Invite to Party/.test(t)), mateBtns);
  await A.page.keyboard.press('Escape').catch(() => {});
  await A.page.waitForTimeout(400);

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
    /* v2.3.2078: `[data-chat-input]`, not the input before Send — the
       composer became a <textarea> on its own row at v2.3.2039 and that
       xpath has matched nothing since (TRAPS §29). */
    await A.page.locator('[data-chat-input]').first().fill('/p party line');
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

    /* ═══ v2.3.1970: THE CONTROL MOVED, BECAUSE THE RULE DID ═══
       This used to tap the SAME player after the party broke up and assert
       the tap DID lock them — the control that made "no lock while partied"
       mean something rather than "the click missed".  v2.3.1917 then took
       player lock-on away from everyone (owner: "Also remove the option to
       kill other players for now"; BroTown.jsx only aims at a live duel
       opponent now), so that control had been failing ever since — asserting
       a behaviour the game deliberately no longer has.

       The tap still needs a control or the party check is worthless, and
       there already is one: `mate.card` above. The inspect card OPENING is
       proof the coordinates landed on the player, and it does not depend on
       aiming at anybody. So what this now pins is the v2.3.1917 rule itself —
       a tap on a non-duel player inspects and never aims, in or out of a
       party — with the card as the evidence the tap connected. */
    await A.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S) S.lockedTarget = null;
    });
    const ex = await tapPeer();
    if (ex.hit) {
      rec.ok('the same tap still lands on them once they leave the party (control)',
        !!ex.card, ex);
      rec.ok('...and STILL does not aim at them — v2.3.1917 took player lock-on away',
        !(ex.lock && ex.lock.type === 'player'), ex.lock);
    } else {
      rec.skip('the same tap still lands on them once they leave the party (control)',
        'the ex-member was no longer on screen');
    }
  }

  await A.ctx.close(); await B.ctx.close();
}
