/* CAN A THUMB REACH THE INSPECT CARD'S BUTTONS ON A PHONE? (v2.3.2078)
 *
 * mp-rehearsal — the only scenario that runs on the primary platform's
 * viewport, 390x844 with touch — fails EVERY action on the inspect card:
 * Add Friend, Invite to Party, Trade and Duel. The card itself opens. The
 * same four work in mp-duel, mp-social and mp-friends, which run at the
 * default desktop viewport.
 *
 * That pattern is the v2.3.1706 shape: a control that is rendered, visible
 * and enabled, and has the bottom dashboard painted over it, so a real
 * finger lands on the dashboard instead. Playwright refuses such a click
 * ("element intercepts pointer events") — which is the correct answer for a
 * user, and is why the harness sees it at all.
 *
 * So this measures the thing directly: on the phone viewport, for each of
 * the card's actions, what does the browser say is on top at the middle of
 * that button?
 */
import * as H from './harness.mjs';

const ACTIONS = ['Trade', 'Duel', 'Add Friend', 'Invite to Party'];

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Phone', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  const B = await H.newPlayer(browser, { name: 'Peer', wsPort, webPort, guest: true });
  await H.enterWorld(A);
  await H.enterWorld(B);
  await H.waitMutualSight(A, B).catch(() => {});
  const bId = await H.readState(B, (S) => S.myId);

  await H.openInspect(A, bId);
  rec.ok('the inspect card opens on a phone viewport (guard)',
    await A.page.$('.bt-inspect-card') !== null);

  const probe = await A.page.evaluate(async (names) => {
    const out = [];
    const btns = [...document.querySelectorAll('button')];
    for (const want of names) {
      const b = btns.find((x) => (x.textContent || '').includes(want));
      if (!b) { out.push({ want, found: false }); continue; }
      /* v2.3.2078: SCROLL IT INTO VIEW FIRST, then ask what is on top.
         Add Friend and Mute live below the fold on a short phone ON PURPOSE
         (InspectPlayerPanel says so), so a raw elementFromPoint at their
         rect finds the pinned Trade/Duel row painted at the same screen
         coordinates and reports a covered button that is merely scrolled
         away. The bug worth catching is a control that CANNOT be reached
         after scrolling to it, which is what the shop drawer did. */
      b.scrollIntoView({ block: 'center' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const r = b.getBoundingClientRect();
      const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
      const top = document.elementFromPoint(cx, cy);
      /* is the element under the finger the button, or inside it? */
      const reaches = !!top && (top === b || b.contains(top));
      out.push({ want, found: true,
        box: { x: Math.round(r.left), y: Math.round(r.top),
          w: Math.round(r.width), h: Math.round(r.height) },
        onScreen: r.top >= 0 && r.bottom <= innerHeight && r.width > 0 && r.height > 0,
        reaches,
        coveredBy: reaches ? null : (() => {
          if (!top) return 'nothing';
          const chain = [];
          for (let n = top; n && chain.length < 5; n = n.parentElement) {
            const cs = getComputedStyle(n);
            chain.push(n.tagName + (n.className ? '.' + String(n.className).slice(0, 30) : '')
              + ' z=' + cs.zIndex + ' pos=' + cs.position
              + (n.getAttribute && n.getAttribute('data-tut') ? ' tut=' + n.getAttribute('data-tut') : ''));
          }
          return chain;
        })(),
        tall: Math.round(r.height) >= 44 });
    }
    return { out, vh: innerHeight, vw: innerWidth,
      shopDrawer: !!document.querySelector('[data-shop-panel]'),
      chatOpen: !!document.querySelector('[data-chat-input]'),
      nearNpc: (() => { const S = window._gameState && window._gameState.current;
        if (!S || !S.player) return null;
        return (S.npcs || []).map((n) => ({ id: n.id,
          d: Math.round(Math.hypot(n.x - S.player.x, n.y - S.player.y)) }))
          .sort((a, b) => a.d - b.d).slice(0, 3); })(),
      at: (() => { const S = window._gameState.current;
        return { x: Math.round(S.player.x), y: Math.round(S.player.y) }; })() };
  }, ACTIONS);

  console.log('   CTX', JSON.stringify({ shopDrawer: probe.shopDrawer, chatOpen: probe.chatOpen, nearNpc: probe.nearNpc, at: probe.at }));
  for (const a of probe.out) {
    rec.ok(`the card offers "${a.want}"`, a.found, a);
    if (!a.found) continue;
    rec.ok(`..."${a.want}" is inside the phone's screen`, a.onScreen, { ...a, vh: probe.vh });
    rec.ok(`...a finger on "${a.want}" lands on the button, not on something over it`,
      a.reaches, a);
    rec.ok(`..."${a.want}" meets the 44px touch floor`, a.tall, a);
  }

  /* ── AND WITH THE SHOP DRAWER UP ──
     Moving the spawn stopped players ARRIVING inside Diego's ring; it does
     not stop them walking into it. Standing at the shop and then tapping
     someone is an ordinary thing to do, and the drawer is position:fixed —
     scrolling the card does not move it out of the way. So the card has to
     put the drawer away when it opens (BroTown.jsx v2.3.2078), and this is
     the check that it does. */
  await A.page.keyboard.press('Escape').catch(() => {});
  await A.page.waitForTimeout(400);
  const walkedUp = await (async () => {
    const npc = await H.readState(A, (S) => {
      const n = (S.npcs || []).find((q) => q.shop);
      return n ? { x: n.x, y: n.y, id: n.id } : null;
    });
    if (!npc) return null;
    await H.hopTo(A, npc.x + 40, npc.y + 40);
    await A.page.waitForTimeout(1200);
    return { npc, drawer: await A.page.evaluate(() => !!document.querySelector('[data-shop-panel]')) };
  })();
  rec.ok('walking up to the shopkeeper opens his drawer (guard — this is the '
       + 'state the card has to survive)',
    !!walkedUp && walkedUp.drawer === true, walkedUp);
  if (walkedUp && walkedUp.drawer) {
    await H.openInspect(A, bId);
    await A.page.waitForTimeout(500);
    const after = await A.page.evaluate((names) => {
      const drawer = !!document.querySelector('[data-shop-panel]');
      const btns = [...document.querySelectorAll('button')];
      const blocked = [];
      for (const want of names) {
        const b = btns.find((x) => (x.textContent || '').includes(want));
        if (!b) continue;
        b.scrollIntoView({ block: 'center' });
        const r = b.getBoundingClientRect();
        const top = document.elementFromPoint(Math.round(r.left + r.width / 2),
          Math.round(r.top + r.height / 2));
        if (!(top && (top === b || b.contains(top)))) blocked.push(want);
      }
      return { drawer, blocked };
    }, ACTIONS);
    rec.ok('opening the inspect card puts the shop drawer away',
      after.drawer === false, after);
    rec.ok('...so every action on the card is still reachable at the shop',
      after.blocked.length === 0, after);
  }

  /* ── AND FOR THE BOTTOM SHEET'S DESTINATIONS ──
     The inspect card was the case the sweep caught; the drawer covers every
     panel that opens over the same ground. mp-social could not press "Add
     Friend" and mp-clan could not press "Create Clan (500g)" — both reported
     as visible, enabled and stable, then un-clickable, which is what a
     covered control looks like from outside. */
  await A.page.keyboard.press('Escape').catch(() => {});
  await A.page.waitForTimeout(300);
  /* Re-arm the drawer through the real path: the proximity latch holds it
     shut while you are still standing next to him, and only releases past
     NPC_PROX_CLEAR (125px). So walk away and come back, which is also the
     only way a player gets it back. */
  if (walkedUp && walkedUp.npc) {
    await H.hopTo(A, walkedUp.npc.x + 260, walkedUp.npc.y + 40);
    await A.page.waitForTimeout(700);
    await H.hopTo(A, walkedUp.npc.x + 40, walkedUp.npc.y + 40);
    await A.page.waitForTimeout(1200);
  }
  const reopened = await A.page.evaluate(() => !!document.querySelector('[data-shop-panel]'));
  if (reopened) {
    const sheet = await A.page.evaluate(() => {
      window.__broDashPanelBus.open('more');
      return true;
    });
    await A.page.waitForTimeout(600);
    const gone = await A.page.evaluate(() => ({
      drawer: !!document.querySelector('[data-shop-panel]'),
      mode: window.__broDashPanelBus.state.mode,
    }));
    rec.ok('opening a dashboard destination puts the shop drawer away too',
      sheet && gone.drawer === false, gone);
    await A.page.evaluate(() => window.__broDashPanelBus.clear());
  } else {
    rec.skip('opening a dashboard destination puts the shop drawer away too',
      'the drawer did not re-open after the card closed, so there was nothing to cover with');
  }

  const errs = A.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors while the card was open', errs.length === 0, errs.slice(0, 3));

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
