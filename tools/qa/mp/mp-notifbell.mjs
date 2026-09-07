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
/* ═══ v2.3.2325: AND IT REPORTS WHAT IT ACTUALLY TOUCHED ═══
   The two failures below cost an afternoon to name, and the reason is that
   this helper reported nothing at all: it dispatched a touch at a point and
   left you to guess what was under it.  It was the QuestCoach card, sitting
   at zIndex 31 OUTSIDE .brotown-wrap with pointerEvents:'auto' since
   v2.3.2312, covering the open header's top 20 of 28px -- which is exactly
   why the first tap (on the bell, 143px lower) worked and the second did
   not.  Nothing about the failure said so.
   So the reading is taken at the tap point, up front, and printed.  A tap
   that lands on something other than this button is a fact this file should
   state, not a mystery it should leave for the next reader. */
const fingerTap = async (P, drift = 4) => {
  const a = await P.page.evaluate(() => {
    const e = document.querySelector('[data-world-chat-toggle]');
    const r = e.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(Math.round(x), Math.round(y));
    const path = (el) => { const out = []; for (let n = el; n && out.length < 4; n = n.parentElement) {
      out.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '')
        + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : '')); }
      return out.join(' < '); };
    return { x, y,
      onToggle: !!(hit && hit.closest && hit.closest('[data-world-chat-toggle]')),
      over: hit ? path(hit) : '(nothing)' };
  });
  if (!a.onToggle) {
    console.log(`    !! the tap at ${Math.round(a.x)},${Math.round(a.y)} lands on `
      + `${a.over} -- NOT the chat toggle`);
  }
  await touchAt(P, a.x, a.y, drift);
};

/* v2.3.2325: the same real touch, at a point of your choosing.  fingerTap
   always aimed at the toggle; the tap-anywhere-to-close behaviour has to be
   measured on a MESSAGE, which is not a button and cannot be clicked. */
const touchAt = async (P, x, y, drift = 4) => {
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await new Promise((r) => setTimeout(r, 40));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + drift, y: y + drift - 1 }] });
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
  /* ═══ v2.3.2325: THIS LINE NEVER CLEARED ANYTHING ═══
     It called .click(), and the coach's dismiss is bound to onPointerUp and
     nothing else (QuestCoach.jsx:1063, and the card body beside it at :1031).
     A synthesised click is not a pointerup, so React heard nothing: the card
     stayed exactly where it was for every version this comment claimed it was
     being cleared.  That is why the committed notifbell-open.png shows the
     "Drag to move." card parked over the header -- the screenshot this block
     exists to prevent -- and why the two assertions after it fail: the card
     is at zIndex 31 OUTSIDE .brotown-wrap with pointerEvents:'auto', its
     bottom edge lands 6px past the open header's centre, and the second tap
     hits the card instead of the button.  The first tap works because the
     SHUT bell sits 143px lower, clear of it.

     Real pointer events, then, and then WAIT for the card to actually be
     gone rather than sleeping a flat 500ms and hoping -- a fixed sleep is
     how this went unnoticed once already.

     Dismissing one lesson can promote the NEXT one onto the screen -- the
     handler marks this view done and the coach re-picks -- so this presses
     until the overlay is gone rather than once, bounded so a coach that
     refuses to leave fails here loudly instead of hanging. */
  let coachGone = false;
  for (let i = 0; i < 8 && !coachGone; i++) {
    await P.page.evaluate(() => {
      for (const b of document.querySelectorAll('[data-coach-dismiss]')) {
        const r = b.getBoundingClientRect();
        const o = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
          clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
        try {
          b.dispatchEvent(new PointerEvent('pointerdown', o));
          b.dispatchEvent(new PointerEvent('pointerup', o));
        } catch (e) { b.click(); }   /* a browser with no PointerEvent ctor */
      }
    });
    await P.page.waitForTimeout(220);
    coachGone = await P.page.evaluate(() => !document.querySelector('[data-coach]'));
  }
  rec.ok('the coach card can be dismissed, so it is not parked over the header (guard)',
    coachGone === true, { coachGone });
  await P.page.waitForTimeout(300);
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

  /* ═══ v2.3.2325: THE CHEVRON IS GONE, AND WORDS TOOK ITS PLACE ═══
     v2.3.2275 pinned the arrow's DIRECTION here, because the owner had
     reported it pointing the wrong way ("the down arrow makes me think it
     expands it") and one character at WorldChatFeed's transform could
     re-invert it.  He has now asked for the arrow itself to go -- the whole
     panel folds on a tap, so a 10px glyph aimed at one header strip was
     pointing at a target that had stopped being special.
     What replaces the assertion is the thing that replaced the glyph: the
     open header has to SAY the gesture, because a panel that closes when you
     touch it is not a convention a player can guess.  And it has to say it
     WHOLE -- the header is 226px on this phone and the label, the badge and
     this hint share it, so a hint clipped to an ellipsis would read as a
     passing test and a broken sentence. */
  const hint = await P.page.evaluate(() => {
    const h = document.querySelector('[data-world-chat-hint]');
    if (!h) return { present: false, svgs: document.querySelectorAll('[data-world-chat-toggle] svg').length };
    const r = h.getBoundingClientRect();
    return { present: true, text: (h.textContent || '').trim(),
      w: Math.round(r.width), sw: h.scrollWidth,
      svgs: document.querySelectorAll('[data-world-chat-toggle] svg').length };
  });
  console.log('    open-header hint: ' + JSON.stringify(hint));
  rec.ok('the open header says how to close it, in words', hint.present === true
    && /tap to close/i.test(hint.text || ''), hint);
  rec.ok('...and the sentence fits the header rather than being cut short',
    hint.present === true && hint.sw <= hint.w + 1, hint);
  rec.ok('...and the chevron it replaced is gone, not merely hidden',
    hint.svgs === 0, hint);

  await fingerTap(P);                                   /* v2.3.2175 */
  await P.page.waitForTimeout(700);
  const reshut = await look(P);
  rec.ok('tapping it again folds it back to the bell',
    reshut.expanded === 'false' && reshut.list === null, reshut);
  rec.ok('...at the same little size it started', !!reshut.bell && reshut.bell.w <= 40, reshut.bell);

  /* ═══ v2.3.2325: AND THE MESSAGES THEMSELVES FOLD IT ═══
     The owner's actual sentence was "touching the world chat window once just
     closes it", not "touching the header".  That is the half a header test
     cannot see, and it is the half with the trap in it: the message list is
     pointerEvents:'none' and MUST STAY THAT WAY (v2.3.2123 -- an interactive
     list over the lower-left kills the joystick outright), so the tap is
     classified at the window instead of handled by the list.  Which means
     this can only be measured by putting a real finger on a message and
     watching the panel fold.  Landing point taken from the LIST's own box,
     30px below its top edge -- on a line, not on the header above it. */
  await fingerTap(P);
  await P.page.waitForTimeout(700);
  const reopened = await look(P);
  rec.ok('it opens again (guard)', reopened.expanded === 'true', reopened);
  if (reopened.expanded === 'true' && reopened.list && reopened.list.h > 40) {
    const onLine = { x: reopened.list.x + reopened.list.w / 2, y: reopened.list.y + 30 };
    const overLine = await P.page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(Math.round(x), Math.round(y));
      return { inChat: !!(el && el.closest && el.closest('[data-world-chat]')),
        tag: el ? el.tagName.toLowerCase() : '(nothing)' };
    }, onLine);
    /* The list must NOT answer the hit-test -- that is the joystick property
       this feature was not allowed to spend.  Asserted here so a future
       "just make the list tappable" cannot pass this file. */
    rec.ok('the message the finger lands on is still invisible to hit-testing '
         + '(the joystick keeps the corner)', overLine.inChat === false, overLine);
    await touchAt(P, onLine.x, onLine.y);
    await P.page.waitForTimeout(700);
    const folded = await look(P);
    rec.ok('tapping a MESSAGE — not the header — folds the feed to the bell',
      folded.expanded === 'false' && folded.list === null, folded);
  } else {
    rec.ok('tapping a MESSAGE — not the header — folds the feed to the bell',
      false, { why: 'the feed never reopened with a list to tap', reopened });
  }
}
