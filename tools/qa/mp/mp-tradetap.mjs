/* ═══ CAN YOU ACTUALLY TAP THE TRADE WINDOW? (v2.3.2145) ═══
 *
 * Owner: "during trade make the world notifications (chat, etc) UNDER those
 * panels. I couldn't accept any trades because notifications blocked it."
 *
 * mp-trade already drives a whole two-sided trade to completion and passes,
 * which is exactly why it could not see this: it never opens the chat
 * composer, and the composer is the blocker. While it is open, ChatBubble
 * mounts a transparent tap catcher over the entire play area at z-index 95 to
 * close itself on the next tap anywhere; the trade window is `.bt-inspect` at
 * z-index 32. Every tap aimed at a trade button was spent closing the chat box
 * forty layers above it.
 *
 * So this scenario asks the one question mp-trade does not: with the chat
 * composer open, is the trade window's button the thing under your finger?
 * It is checked by hit-testing the real document at the button's own centre
 * (elementFromPoint), which is what a tap does, rather than by clicking and
 * hoping -- a click that lands on the catcher still "succeeds", it just does
 * the wrong thing, and that is precisely the failure being tested for.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Tapper', nameB: 'Tappee' });
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  await H.grant(wsPort, aId, 'gold', { amount: 500 });
  await H.grant(wsPort, bId, 'gold', { amount: 300 });
  await A.page.waitForTimeout(1200);

  /* ── open a real trade window, the way mp-trade does ── */
  await H.openInspect(A, bId);
  await H.clickText(A, 'Trade');
  const gotInvite = await H.waitUi(B, () => [...document.querySelectorAll('button')]
    .some((b) => b.textContent.includes('Open trade')), { label: 'B trade invite', timeout: 20000 })
    .then(() => true).catch(() => false);
  rec.ok('B receives the trade invite (guard)', gotInvite);
  if (!gotInvite) { await A.ctx.close(); await B.ctx.close(); return; }
  await H.clickText(B, 'Open trade');
  const live = await H.waitUi(A, () => [...document.querySelectorAll('button')]
    .some((b) => /Confirm trade|Ready to trade|Add an item or gold/.test(b.textContent)),
  { label: 'live trade window', timeout: 20000 }).then(() => true).catch(() => false);
  rec.ok('the trade window is open on A (guard: nothing below means anything '
    + 'without it)', live);
  if (!live) { await A.ctx.close(); await B.ctx.close(); return; }

  /* What sits under the trade button's own centre? */
  const hitTest = () => A.page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find((b) => /Confirm trade|Ready to trade|Add an item or gold/.test(b.textContent));
    if (!btn) return { found: false };
    const r = btn.getBoundingClientRect();
    const el = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    return {
      found: true,
      label: btn.textContent.trim().slice(0, 30),
      hitsButton: !!(el && (el === btn || btn.contains(el))),
      /* What DID catch it, when it is not the button. */
      blockedBy: el ? `${el.tagName.toLowerCase()}.${(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || ''}`.slice(0, 60) : null,
      blockerZ: el ? getComputedStyle(el).zIndex : null,
      guard: window.__btModalGuard ? window.__btModalGuard() : null,
    };
  });

  const clean = await hitTest();
  rec.ok('with nothing else open, the trade button is what your finger lands on '
    + '(guard: if this fails the test is measuring the wrong thing)',
    clean.found && clean.hitsButton === true, clean);

  /* ── now the owner's situation: the chat composer is open ── */
  /* setOpen, NOT `bus.open = true`. The first cut of this assigned the field
     directly; the bus only notifies its listeners from setOpen, so React never
     re-rendered, the tap catcher was never mounted, and the whole scenario was
     vacuous -- it passed identically with the fix reverted, which is how it was
     caught. */
  const opened = await A.page.evaluate(() => {
    const bus = window.__broChatBubbleBus;
    if (!bus || typeof bus.setOpen !== 'function') return { ok: false, why: 'no chat bus' };
    bus.setOpen(true);
    return { ok: bus.open === true };
  });
  await A.page.waitForTimeout(800);
  rec.ok('the chat composer was really asked to open, through the bus that '
    + 'notifies React (guard: setting the flag by hand mounts nothing and '
    + 'makes every check below vacuous)', !!(opened && opened.ok), opened);

  const withChat = await hitTest();
  rec.ok('...and the trade button is STILL what your finger lands on -- the '
    + "owner's report: \"I couldn't accept any trades because notifications "
    + 'blocked it"',
    withChat.found && withChat.hitsButton === true, withChat);

  rec.ok('the guard registered that a decision panel owns the screen (so the '
    + 'pass above is the fix working, not the composer failing to open)',
    !!(withChat.guard && withChat.guard.depth > 0), withChat.guard);

  await A.ctx.close();
  await B.ctx.close();
  void aId;
}
