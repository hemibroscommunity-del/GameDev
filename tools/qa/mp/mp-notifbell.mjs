/* THE CORNER RESTS AS A BELL (v2.3.2155).
 *
 * Owner: "collapse all notifications (chat, special events, etc, into a little
 * notification bell on the bottom left corner above the dashboard)."
 *
 * WHY THIS CORNER IS THE DANGEROUS ONE, and why the scenario spends most of
 * its assertions on geometry rather than on the bell being pretty:
 * [data-joyzone="L"] is an invisible pad covering the whole LEFT HALF of the
 * screen at z-index 6, and it receives every movement drag. The feed sits on
 * top of it at z-index 25. Anything here that opts back into pointer events
 * takes that patch of screen away from movement -- which is what made the
 * v2.3.2145 silence chip unshippable three times, and what four demo
 * reviewers reported in v2.3.2123 ("unable to move jotstick").
 *
 * So the property under test is not "there is a bell". It is that the bell
 * costs the joystick LESS than the full-width header it replaces, and that the
 * disc is still reachable. mp-chatjoy owns the disc's own coverage; this owns
 * the footprint and the fold.
 */
import * as H from './harness.mjs';

const look = (P) => P.page.evaluate(() => {
  const shell = document.querySelector('[data-world-chat]');
  const bell = document.querySelector('[data-world-chat-toggle]');
  const list = document.querySelector('[data-world-chat-lines]');
  const badge = document.querySelector('[data-world-chat-unread]');
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top),
      w: Math.round(r.width), h: Math.round(r.height) };
  };
  /* The footprint that actually costs movement: every descendant the browser
     will hand a touch to. The shell itself is pointerEvents:'none' by design,
     so counting IT would report the same number either way. */
  let solidArea = 0;
  const solids = [];
  if (shell) {
    for (const el of shell.querySelectorAll('*')) {
      if (getComputedStyle(el).pointerEvents === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      /* Descendants of an opaque node are already covered by it -- counting
         a badge inside the bell would double-charge the same pixels. */
      if (solids.some((s) => s.el.contains(el))) continue;
      solids.push({ el, r });
      solidArea += r.width * r.height;
    }
  }
  const disc = document.querySelector('.bt-joystick-base')
    || document.querySelector('.bt-joystick-zone');
  let discStolen = null;
  if (disc) {
    const d = disc.getBoundingClientRect();
    const at = document.elementFromPoint(d.left + d.width / 2, d.top + d.height / 2);
    discStolen = !!(at && at.closest && at.closest('[data-world-chat]'));
  }
  return {
    hasShell: !!shell, bell: box(bell), list: box(list),
    badge: badge ? Number(badge.getAttribute('data-world-chat-unread')) : null,
    expanded: bell ? bell.getAttribute('aria-expanded') : null,
    solidArea: Math.round(solidArea),
    solidCount: solids.length,
    discStolen,
  };
});


/* ═══ v2.3.2175: A REAL FINGER, NOT page.click() ═══
   The taps below drove page.click(), which SYNTHESISES a click whatever the
   touch did -- so this scenario proved the handler worked while proving
   nothing about whether a finger can reach it.  This corner sits on the
   movement pad, under a global non-passive touchmove guard, and every real
   tap drifts a few pixels; that is the path worth testing.  CDP touch events
   are the only way to produce it faithfully (page.tap() sends a clean tap
   with no drift, which is the easy case). */
const fingerTap = async (P, drift = 4) => {
  const a = await P.page.evaluate(() => {
    const e = document.querySelector('[data-world-chat-toggle]');
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
  await new Promise((r) => setTimeout(r, 40));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + drift, y: a.y + drift - 1 }] });
  await new Promise((r) => setTimeout(r, 40));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
};


/* ═══ v2.3.2275: CROPS, BECAUSE THE OWNER ASKED TO SEE THE CONTROL ═══
 * Owner: "can you show me a preview of what the 'hide alerts' button looks
 * like now (for chat that minimizes into the notification bell)".
 * A 390x844 full-viewport shot answers "where is it" and not "what does it
 * look like" -- the control is 36x36 shut and 226x28 open, i.e. under 2% of
 * that frame.  Written against H.REPO rather than a bare relative path so the
 * files land in the same place whatever the working directory is (the two
 * shots below predate that and are fixed here too). */
const crop = async (P, name, sel, pad) => {
  const r = await P.page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  }, sel);
  if (!r || r.width < 2) { console.log('    (no crop for ' + sel + ')'); return null; }
  const path = `${H.REPO}/tools/qa/mp/out/${name}.png`;
  await P.page.screenshot({ path, clip: {
    x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad),
    width: Math.min(r.width + pad * 2, 4000), height: Math.min(r.height + pad * 2, 4000),
  } });
  console.log('    wrote ' + path + '  (' + Math.round(r.width) + 'x' + Math.round(r.height) + ' CSS)');
  return path;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Bellringer', wsPort, webPort,
    touch: true, viewport: { width: 390, height: 844 }, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* The corner renders nothing at all when empty (its "quiet when empty"
     rule), so an idle room would pass every assertion below by having no
     corner to measure. Fill it the way a busy room does -- through the BUS,
     because a silent push to the array leaves the feed drawing what it already
     had (the trap mp-chatjoy records). */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S) return;
    S.chatLog = S.chatLog || [];
    for (let i = 0; i < 12; i++) {
      S.chatLog.push({ name: 'Crowd' + (i % 4),
        text: 'this is what a real world chat line looks like when someone is talking ' + i,
        ts: Date.now() + i });
    }
    try { window.__broChatLogBus && window.__broChatLogBus.bump(); } catch (e) {}
  });
  await P.page.waitForTimeout(1200);

  /* ── 1. IT RESTS SHUT, AS A BELL ── */
  const shut = await look(P);
  rec.ok('the corner is on screen with chat in it (guard)', shut.hasShell, shut);
  rec.ok('it rests SHUT -- a first session gets the bell, not the list',
    shut.expanded === 'false', shut);
  rec.ok('there is no message list while shut', shut.list === null, shut);
  rec.ok(`the bell is little (${shut.bell && shut.bell.w}x${shut.bell && shut.bell.h})`,
    !!shut.bell && shut.bell.w <= 40 && shut.bell.h <= 40, shut.bell);
  rec.ok(`...and it carries the unread count (${shut.badge})`,
    shut.badge >= 1, shut);

  /* ── 2. IT SITS ABOVE THE DASHBOARD, IN THE BOTTOM-LEFT ──
     Named in the request, and the one thing a CSS var could silently move. */
  const frame = await P.page.evaluate(() => ({
    vh: window.innerHeight, vw: window.innerWidth,
    dash: (document.querySelector('.bt-navrail') || document.querySelector('[data-dash]') || {})
      .getBoundingClientRect ? (document.querySelector('.bt-navrail')
        || document.querySelector('[data-dash]')).getBoundingClientRect().top : null,
  }));
  rec.ok('the bell is in the LEFT half of the screen',
    !!shut.bell && shut.bell.x + shut.bell.w < frame.vw / 2, { bell: shut.bell, frame });
  rec.ok('...and in the bottom third, above the dashboard',
    !!shut.bell && shut.bell.y > frame.vh * 0.6
      && (frame.dash === null || shut.bell.y + shut.bell.h <= frame.dash + 1),
    { bell: shut.bell, frame });

  /* ── 3. THE POINT: IT COSTS THE JOYSTICK LESS THAN WHAT IT REPLACES ──
     The header this bell replaces was width:100% of the shell at 28px tall.
     MEASURED on this viewport by running the control -- 226x28 = 6328px of the
     movement pad, opaque to touch. (The shell's 260px cap only bites on a
     wider screen; quoting 7280 here would be quoting the cap, not this
     phone.) */
  rec.ok(`the shut corner steals ${shut.solidArea}px of the movement pad, `
       + `against the 6328 the old header took on this viewport`,
    shut.solidArea > 0 && shut.solidArea < 2500, shut);
  rec.ok('and the joystick disc itself is not covered', shut.discStolen === false, shut);

  /* Clear the coach card first, or it parks "MOVE / Drag to move." over the
     header in the open shot -- which is what the committed notifbell-open.png
     shows today, and it is the header the owner wants to look at. */
  await P.page.evaluate(() => {
    try { document.querySelectorAll('[data-coach-dismiss]').forEach((b) => b.click()); } catch (e) {}
  });
  await P.page.waitForTimeout(500);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/notifbell-shut.png` });
  await crop(P, 'notifbell-crop-shut', '[data-world-chat-toggle]', 40);

  /* ── 4. THE BELL OPENS AND CLOSES ── */
  await fingerTap(P);                                   /* v2.3.2175 */
  await P.page.waitForTimeout(700);
  const open = await look(P);
  rec.ok('a REAL finger tap (with drift) opens the notifications', open.expanded === 'true', open);
  rec.ok('...and the messages are there', !!open.list && open.list.h > 0, open);
  rec.ok('...and opening clears the unread badge', open.badge === null, open);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/notifbell-open.png` });
  /* The header alone -- the crop that actually answers the question. */
  await crop(P, 'notifbell-crop-header', '[data-world-chat-toggle]', 6);
  /* ...and in context, sitting on its own message list. */
  await crop(P, 'notifbell-crop-open', '[data-world-chat]', 8);

  /* v2.3.2275: pin the chevron's DIRECTION, since that is the thing the owner
     reported ("the down arrow makes me think it expands it") and a one-
     character edit at WorldChatFeed's transform is all it takes to re-invert
     it.  matrix(-1,0,0,-1,0,0) IS rotate(180deg). */
  const chev = await P.page.evaluate(() => {
    const svgs = document.querySelectorAll('[data-world-chat-toggle] svg');
    const last = svgs[svgs.length - 1];
    return last ? { transform: getComputedStyle(last).transform, count: svgs.length } : null;
  });
  console.log('    open-header chevron: ' + JSON.stringify(chev));
  rec.ok('the open header\'s chevron points UP (it collapses; a down arrow read as "expands")',
    !!chev && chev.transform === 'matrix(-1, 0, 0, -1, 0, 0)', chev);

  await fingerTap(P);                                   /* v2.3.2175 */
  await P.page.waitForTimeout(700);
  const reshut = await look(P);
  rec.ok('tapping it again folds it back to the bell',
    reshut.expanded === 'false' && reshut.list === null, reshut);
  rec.ok('...at the same little size it started', !!reshut.bell && reshut.bell.w <= 40, reshut.bell);
}
