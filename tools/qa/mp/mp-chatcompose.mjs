/* THE CHAT COMPOSER: SELECTION, THE DICTATION WAIT, AND SEEING YOUR MESSAGE
 * (v2.3.2039)
 *
 * Owner, three reports in one message:
 *   "make the chat window shell not selectable (if I long press on it the
 *    whole game area highlights)"
 *   "show a spinning icon while the game processes your speech to text.
 *    There's a little delay."
 *   "it's tricky to see your full message before sending because it gets cut
 *    off"
 *
 * ── WHY THE MIC HALF NEEDS A FAKE RECOGNISER ──
 * The state being tested is the WAIT between the browser hearing the last
 * word and deciding what it was. A real `webkitSpeechRecognition` will not
 * hold still there -- headless Chromium has no microphone, no speech to
 * recognise and no network permission to send it over, so it goes start ->
 * error -> end in a few milliseconds and the thinking state, if it appears at
 * all, appears for less than a frame. Installing a stub whose events fire
 * only when this test says so is the only way to look at that state; what it
 * replaces is a browser API, not any of our code, and the sequence it emits
 * (audiostart, speechend/audioend, result, end) is the one the spec defines
 * and the one the real object emits in the same order.
 *
 * The stub is installed with addInitScript BEFORE the page loads, because
 * `SpeechRec` is resolved at module scope -- a stub installed after the
 * bundle has run would be looked up too late and the button would not render.
 *
 * ── THE SELECTION HALF IS ABOUT AN ANCESTOR THAT ISN'T THERE ──
 * `.brotown-wrap` sets user-select:none, so it is easy to assume everything
 * over the world inherits it. ChatBubble is a SIBLING of <BroTown>, not a
 * descendant, and never has. The assertion reads the COMPUTED style, which is
 * the only thing that settles inheritance, and then drives a real long press
 * and checks the document ends up with no selection.
 */
import * as H from './harness.mjs';

/* A recogniser whose lifecycle this test drives by hand. Mirrors the shape
   ChatBubble uses: lang/interimResults/continuous/maxAlternatives, the four
   handlers, start() and stop(). */
const STUB = `
window.__recs = [];
class FakeRec {
  constructor() { this.lang=''; this.interimResults=false; this.continuous=false; this.maxAlternatives=1;
    this.onresult=null; this.onend=null; this.onerror=null; this.onspeechend=null; this.onaudioend=null;
    window.__recs.push(this); window.__lastRec = this; }
  start() { this.started = true; }
  stop()  { this.stopped = true; }
  abort() { this.aborted = true; if (this.onend) this.onend(); }
}
window.SpeechRecognition = FakeRec;
window.webkitSpeechRecognition = FakeRec;
`;

const micState = (P) => P.page.evaluate(() => {
  const b = document.querySelector('[data-chat-mic]');
  if (!b) return null;
  return {
    state: b.getAttribute('data-chat-mic'),
    busy: b.getAttribute('aria-busy'),
    label: b.getAttribute('aria-label'),
    spinner: !!b.querySelector('[data-chat-mic-spin]'),
    /* An element with a spin animation declared but not RUNNING is the
       failure this would otherwise miss -- a missing keyframe leaves the
       animation named and static. */
    spinning: (() => {
      const el = b.querySelector('[data-chat-mic-spin]');
      if (!el) return false;
      const cs = getComputedStyle(el);
      return cs.animationName === 'bt-exit-spin' && cs.animationDuration !== '0s';
    })(),
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, {
    name: 'Composer', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true,
    init: STUB,
  });
  await H.enterWorld(A);
  await A.page.waitForTimeout(1200);
  await A.page.evaluate(() => window.__broChatBubbleBus.setOpen(true));
  await A.page.waitForSelector('[data-chat-input]', { timeout: 10000 });
  await A.page.waitForTimeout(300);

  /* ── 1. THE SHELL DOES NOT SELECT ── */
  const sel = await A.page.evaluate(() => {
    const card = document.querySelector('[data-chat-input]').closest('.bt-chat-noselect');
    const dismiss = [...document.querySelectorAll('.bt-chat-noselect')].length;
    const cs = card ? getComputedStyle(card) : null;
    const ta = getComputedStyle(document.querySelector('[data-chat-input]'));
    return {
      cardFound: !!card,
      shells: dismiss,
      shell: cs && (cs.webkitUserSelect || cs.userSelect),
      textarea: ta.webkitUserSelect || ta.userSelect,
      sheets: [...document.styleSheets].map(x => x.href).filter(Boolean),
    };
  });

  /* ── THE CALLOUT: READ THE SHIPPED CSS, NOT THE BROWSER ──
     `-webkit-touch-callout` is an iOS property. Desktop Chromium does not
     implement it, and it does not merely report it as unset -- it DROPS the
     declaration while parsing, so it is absent from getComputedStyle and from
     the CSSOM rule alike. Neither can distinguish "we never wrote it" from
     "this browser discarded it", which is the distinction the assertion is
     for.
     The stylesheet TEXT can. Fetching the served file checks the one thing
     that matters and is knowable from here: that the declaration survives the
     build and is delivered to the phone that will honour it. (It is a real
     risk, not a hypothetical -- a minifier dropping a property it does not
     recognise would look exactly like this and break nothing in CI.) */
  const cssText = await A.page.evaluate(async (hrefs) => {
    for (const h of hrefs) {
      try {
        const t = await (await fetch(h)).text();
        const m = t.match(/\.bt-chat-noselect\{[^}]*\}/);
        if (m) return m[0];
      } catch (e) { /* try the next sheet */ }
    }
    return null;
  }, sel.sheets);
  rec.ok('the chat card carries the no-select shell', sel.cardFound, sel);
  rec.ok('...and so does the layer over the play area, not just the card',
    sel.shells === 2, sel);
  rec.ok('the chat card refuses text selection', sel.shell === 'none', sel);
  rec.ok('...and the iOS long-press callout suppression survives the build '
       + 'and reaches the phone, even though Chromium discards it here',
    !!cssText && /-webkit-touch-callout:\s*none/.test(cssText), { cssText });
  rec.ok('...but the message box itself stays selectable, or it would be '
       + 'uneditable on iOS', sel.textarea === 'text', sel);

  /* A real long press on the card, then: is anything selected? */
  const bb = await A.page.evaluate(() => {
    const r = document.querySelector('[data-chat-online]').getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await A.page.mouse.move(bb.x, bb.y);
  await A.page.mouse.down();
  await A.page.waitForTimeout(900);
  await A.page.mouse.move(bb.x + 120, bb.y + 40);
  await A.page.mouse.up();
  const selected = await A.page.evaluate(() => String(document.getSelection() || '').length);
  rec.ok('a long press and drag across the card selects nothing',
    selected === 0, { selectedChars: selected });

  /* ── 2. THE MESSAGE IS READABLE BEFORE IT IS SENT ── */
  const LONG = 'we should all meet by the forge at the north gate before the '
             + 'boss spawns tonight ok everyone bring potions';
  await A.page.fill('[data-chat-input]', LONG.slice(0, 120));
  await A.page.waitForTimeout(350);
  const box = await A.page.evaluate(() => {
    const el = document.querySelector('[data-chat-input]');
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      w: Math.round(r.width), h: Math.round(r.height),
      scrollH: el.scrollHeight,
      /* The whole point: no hidden text. A single-line input reports a
         scrollWidth far past its width; a wrapping box does not. */
      hiddenRight: Math.max(0, el.scrollWidth - Math.ceil(r.width)),
      chars: el.value.length,
    };
  });
  rec.ok('the composer wraps rather than scrolling sideways',
    box.tag === 'TEXTAREA', box);
  rec.ok('...so a full-length message has nothing hidden off to the right',
    box.hiddenRight === 0, box);
  rec.ok('...and it grew taller to show it (a one-line box could not)',
    box.h > 44, box);
  rec.ok('...but not without limit — it stops at four lines, which is all the '
       + 'card can afford above a bottom edge pinned at 25% of the viewport',
    box.h <= 106, box);
  /* ── THE OWNER'S CLAIM, AS A MEASUREMENT ──
     "It gets cut off" is about a real message, so the test uses one: 120
     characters -- the input's own limit -- of ordinary words. That has to be
     visible in one piece, with nothing scrolled out of sight.

     What is deliberately NOT asserted is the pathological case (120 unbroken
     characters of the widest glyph, which wraps to five lines). The card
     cannot hold five: its bottom edge is pinned at 25% of the viewport so the
     tail sits above the player's head, and a fifth line puts the top under
     the notch. That string scrolls instead, which is checked below -- claiming
     it fits would mean either a permanently red assertion or a card that
     runs off the screen for a message nobody types. */
  const setVal = (v) => A.page.evaluate((text) => {
    const el = document.querySelector('[data-chat-input]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    set.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  const readBox = () => A.page.evaluate(() => {
    const el = document.querySelector('[data-chat-input]');
    return {
      h: Math.round(el.getBoundingClientRect().height), need: el.scrollHeight,
      width: Math.round(el.getBoundingClientRect().width),
      overflow: getComputedStyle(el).overflowY,
      cardTop: Math.round(el.closest('.bt-chat-noselect').getBoundingClientRect().top),
      chars: el.value.length,
    };
  });

  /* Padded past 120 and sliced, so this stays exactly at the limit if anyone
     edits the wording -- the first version of this line was 117 characters
     and quietly tested a shorter message than it claimed to. */
  const FULL = ('we should all meet by the forge at the north gate before the '
              + 'boss spawns tonight so bring potions and spare arrows ok now '
              + 'please').slice(0, 120);
  await setVal(FULL);
  await A.page.waitForTimeout(300);
  const w = await readBox();
  rec.ok('a 120-character message — the input\'s own limit — is visible in '
       + 'one piece, with nothing scrolled out of sight',
    w.chars === 120 && w.h >= w.need, w);
  rec.ok('...on a composer that is really the card\'s width, not the 220px '
       + 'floor it used to shrink-wrap to', w.width > 300, w);
  rec.ok('...and the card still clears the top of the screen',
    w.cardTop >= 20, w);

  /* The pathological string: no spaces, widest glyph. It must SCROLL, not
     clip -- an overflow:hidden box would hide the tail of it with no way to
     reach it, which is the original bug in a new shape. */
  await setVal('w'.repeat(120));
  await A.page.waitForTimeout(300);
  const path = await readBox();
  rec.ok('an unbroken 120-character run is scrollable rather than clipped',
    path.overflow === 'auto' && path.need > path.h, path);
  rec.ok('...and even that does not push the card off the top of the screen',
    path.cardTop >= 20, path);

  const empty = await A.page.evaluate(() => {
    const el = document.querySelector('[data-chat-input]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    set.call(el, '');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return null;
  });
  await A.page.waitForTimeout(300);
  const shrunk = await A.page.evaluate(() =>
    Math.round(document.querySelector('[data-chat-input]').getBoundingClientRect().height));
  rec.ok('...and it shrinks back when the message is deleted, so an empty '
       + 'composer is the size it always was', shrunk === 44, { shrunk, empty });

  /* ── 3. THE DICTATION WAIT IS DRAWN ── */
  let m = await micState(A);
  rec.ok('the mic button renders where speech recognition exists',
    !!m && m.state === 'idle', m);

  await A.page.click('[data-chat-mic]');
  await A.page.waitForTimeout(200);
  m = await micState(A);
  rec.ok('tapping it starts listening, and the button says so',
    m.state === 'listening', m);
  rec.ok('...with no spinner yet — nothing is being processed', !m.spinner, m);

  /* The recogniser stops HEARING. The words have not arrived. */
  await A.page.evaluate(() => window.__lastRec.onspeechend());
  await A.page.waitForTimeout(200);
  m = await micState(A);
  rec.ok('when you stop talking the button switches to thinking',
    m.state === 'thinking', m);
  rec.ok('...and shows a spinner that is actually turning', m.spinning, m);
  rec.ok('...and tells a screen reader it is busy', m.busy === 'true', m);
  rec.ok('...and no longer claims the mic is open',
    !/Stop dictating/.test(m.label || ''), m);

  /* It stays there. This is the delay the owner saw: nothing arrives yet. */
  await A.page.waitForTimeout(1200);
  m = await micState(A);
  rec.ok('the spinner persists for the whole wait, however long it is',
    m.state === 'thinking' && m.spinning, m);

  /* Tapping during the wait must not start a SECOND recogniser -- on iOS that
     ends the first one and loses the sentence. */
  await A.page.click('[data-chat-mic]');
  await A.page.waitForTimeout(150);
  const nRecs = await A.page.evaluate(() => window.__recs.length);
  rec.ok('tapping during the wait does not start a second recogniser',
    nRecs === 1, { recognisers: nRecs });

  /* The words arrive. */
  await A.page.evaluate(() => {
    window.__lastRec.onresult({ results: [[{ transcript: 'meet me at the forge' }]] });
    window.__lastRec.onend();
  });
  await A.page.waitForTimeout(300);
  m = await micState(A);
  rec.ok('the spinner stops when the words arrive',
    m.state === 'idle' && !m.spinner, m);
  const typed = await A.page.inputValue('[data-chat-input]');
  rec.ok('...and the words land in the box, not straight into the room',
    typed === 'meet me at the forge', { typed });

  /* `end` with no result at all -- silence, refused permission, dead network.
     Spinning forever there would be worse than the flat button this replaced. */
  await A.page.click('[data-chat-mic]');
  await A.page.waitForTimeout(150);
  await A.page.evaluate(() => { window.__lastRec.onaudioend(); });
  await A.page.waitForTimeout(150);
  rec.ok('a recogniser that heard nothing still shows the wait',
    (await micState(A)).state === 'thinking');
  await A.page.evaluate(() => { window.__lastRec.onend(); });
  await A.page.waitForTimeout(250);
  m = await micState(A);
  rec.ok('...and stops spinning when it gives up, rather than turning forever',
    m.state === 'idle' && !m.spinner, m);

  await A.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-chatcompose.png' }).catch(() => {});
  const errs = A.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors in the composer', errs.length === 0, errs.slice(0, 3));
  await A.ctx.close();
}
