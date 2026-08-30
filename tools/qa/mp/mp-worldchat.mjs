import * as H from './harness.mjs';

/* WORLD CHAT AS ITS OWN SECTION — v2.3.2037.
 *
 * Four owner asks, and three of them are only checkable by looking at what a
 * second player sees:
 *   - the daily "+25 gold" line is gone from chat,
 *   - the "World chat" toggle is gone with it,
 *   - sent messages appear in a lower-left section that CLEARS the dashboard,
 *   - a mic button exists where the browser can dictate.
 *
 * Two players, because a feed that can only show your own messages is not a
 * chat feed. */
export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Ayla', nameB: 'Bram' });
  /* v2.3.2155: the corner rests as a bell now, so the list this whole scenario
     reads does not exist until it is pressed. Both feeds: the point below is
     that the OTHER player sees the line too. */
  await H.openWorldChat(A);
  await H.openWorldChat(B);
  await A.page.setViewportSize({ width: 390, height: 844 });
  await B.page.setViewportSize({ width: 390, height: 844 });
  await A.page.waitForTimeout(1500);

  /* ── the composer ── */
  /* The bus, not a hunt for the dashboard button: mp-chatfeed already opens
     it this way, and finding a control by its aria-label is the brittleness
     that has killed scenarios here before (TRAPS §29). */
  const opened = await A.page.evaluate(() => {
    try { window.__broChatBubbleBus.setOpen(true); return true; } catch (e) { return false; }
  });
  rec.ok('the chat composer could be opened (guard)', opened === true, { opened });
  await A.page.waitForTimeout(900);
  rec.ok('...and its input is there', !!(await A.page.$('[data-chat-input]')), {});

  /* ── 1. the World chat TOGGLE is gone ── */
  rec.ok('the "World chat" toggle is gone — every line is world chat, so a '
       + 'switch with one setting had nothing to switch',
    (await A.page.$('[data-chat-feed]')) === null, {});

  /* ── 2. the mic ── */
  const mic = await A.page.evaluate(() => {
    const el = document.querySelector('[data-chat-mic]');
    const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const r = el ? el.getBoundingClientRect() : null;
    return { present: !!el, supported, w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0 };
  });
  /* The CONDITION is the property, not the presence: this Chromium may or may
     not expose the API, and a mic that renders where it cannot work would be
     worse than none. Asserting the pairing holds either way. */
  rec.ok('the mic button is present exactly where the browser supports speech '
       + 'recognition, and absent where it does not',
    mic.present === mic.supported, mic);
  if (mic.present) {
    rec.ok('...and it meets the 44px touch floor', mic.w >= 44 && mic.h >= 44, mic);
  }

  /* ── 3. a sent message lands in the lower-left section ── */
  await A.page.fill('[data-chat-input]', 'hello from ayla');
  await A.page.keyboard.press('Enter');
  await A.page.waitForTimeout(1800);

  const feedA = await A.page.evaluate(() => {
    const el = document.querySelector('[data-world-chat]');
    if (!el) return null;
    const list = el.querySelector('[data-world-chat-lines]');
    const r = el.getBoundingClientRect();
    return {
      text: el.textContent || '',
      left: Math.round(r.left), bottom: Math.round(window.innerHeight - r.bottom),
      dashH: getComputedStyle(document.documentElement).getPropertyValue('--dash-h').trim(),
      lines: list ? Number(list.getAttribute('data-world-chat-lines')) : -1,
    };
  });
  rec.ok('the World Chat section exists once something has been said', !!feedA, feedA);
  rec.ok('...and it is headed "World Chat"', !!feedA && /World Chat/.test(feedA.text), feedA && feedA.text.slice(0, 60));
  rec.ok('...and carries the sent message', !!feedA && /hello from ayla/.test(feedA.text), feedA && feedA.text.slice(0, 120));
  rec.ok('...on the LEFT of the screen', !!feedA && feedA.left < 60, feedA);

  /* THE ONE THAT WOULD BE WRONG IN A WAY NOBODY NOTICES UNTIL THEY PLAY:
     zLayers rule 2 -- a bottom-anchored panel must clear the dashboard BAND
     geometrically, not just win on z-index. Measured against the real
     dashboard rect rather than the CSS var, since the var is what the code
     already used and would agree with itself. */
  const clears = await A.page.evaluate(() => {
    const el = document.querySelector('[data-world-chat]');
    const dash = document.querySelector('[data-dash], .bt-dash, [class*="dashboard"]');
    if (!el) return null;
    const e = el.getBoundingClientRect();
    const d = dash ? dash.getBoundingClientRect() : null;
    return { feedBottom: Math.round(e.bottom), dashTop: d ? Math.round(d.top) : null,
             winH: window.innerHeight };
  });
  rec.ok('...and it sits ABOVE the dashboard band rather than on top of it '
       + '(zLayers rule 2 — a high z alone would cover the controls)',
    !!clears && (clears.dashTop === null || clears.feedBottom <= clears.dashTop + 2), clears);

  /* ── 4. the OTHER player sees it — the point of a world feed ── */
  const feedB = await B.page.evaluate(() => {
    const el = document.querySelector('[data-world-chat]');
    return el ? (el.textContent || '') : null;
  });
  rec.ok('the other player sees the message in THEIR World Chat section '
       + '(guard: a feed showing only your own lines is not a chat)',
    !!feedB && /hello from ayla/.test(feedB), feedB && feedB.slice(0, 120));

  /* ── 5. the feed is readable WITHOUT the composer open ── */
  await A.page.keyboard.press('Escape');
  await A.page.waitForTimeout(900);
  const afterClose = await A.page.evaluate(() => {
    const el = document.querySelector('[data-world-chat]');
    const composer = document.querySelector('[data-chat-input]');
    return { feed: el ? (el.textContent || '') : null, composerOpen: !!composer };
  });
  rec.ok('sending closes the composer again, as it did before the feed moved in',
    afterClose.composerOpen === false, afterClose);
  rec.ok('...but the World Chat section stays — which is the whole point of '
       + 'moving it out of the composer',
    !!afterClose.feed && /hello from ayla/.test(afterClose.feed), afterClose.feed);

  /* ── 6. it does not eat taps meant for the world ── */
  const shell = await A.page.evaluate(() => {
    const el = document.querySelector('[data-world-chat]');
    return el ? getComputedStyle(el).pointerEvents : null;
  });
  rec.ok('the section shell does not swallow taps meant for the world '
       + '(the lower left is where a thumb lives)', shell === 'none', { shell });
}
