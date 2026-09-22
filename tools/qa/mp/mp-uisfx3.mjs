/* ═══ v2.3.2658: THE CLICK GOES WHERE THE OWNER PUT IT, AND NOWHERE ELSE ═══
   Owner: "Use the click sound for navigating through the menus (tapping the
   dashboard buttons or any of the buttons in any of those menus).  Use the
   close sound for closing the dialog window that appear in game (like for
   quests and tutorials pop ups and stuff like that)."

   Three ways this feature can be wrong, and mp-uisfx / mp-uisfx2 catch none
   of them -- one proves the FILES decode, the other proves ONE control fires:

   1. THE ROUTING. A close cross that plays the click, or a menu button that
      plays the close, is the whole feature backwards. The delegate decides
      this from markup, so the decision is driven here against the markup the
      repo actually writes (.bt-inspect-close, data-qa="dlg-close",
      aria-label="Close ...", a bare ✕) rather than against a fixture.
   2. THE DOUBLE. Every equip and close control is ALSO a button, so the
      delegate offers a click on the same tap that already has a named sound.
      "Multiple of the same sound at the same time" is the exact complaint
      v2.3.2639 was filed for; this asserts one gesture, one sound.
   3. THE SPILL. The joystick and the attack button are NOT menus. The
      delegate is supposed to be unable to reach them (they are plain divs)
      and the element burst opts out; a regression that widened the selector
      would put a menu click over a fight, and nothing else would notice. */
import * as H from './harness.mjs';

/* Count what the game ASKS to play, not what a speaker emits -- the
   mp-uisfx2 idiom. */
const arm = (P) => P.page.evaluate(() => {
  const A = window.BT_AUDIO;
  window.__sfxCalls = [];
  if (!A.__origPlay3) A.__origPlay3 = A.play.bind(A);
  A.play = function (key, opts) { window.__sfxCalls.push(key); return A.__origPlay3(key, opts); };
  return true;
});
const drain = (P) => P.page.evaluate(() => {
  const out = (window.__sfxCalls || []).slice();
  window.__sfxCalls.length = 0;
  return out;
});

/* The routing decision, asked of the REAL resolver the delegate uses, on
   REAL markup built in the page. No pointer synthesis: this is the pure
   half, and it is where a mis-sorted control shows up unambiguously. */
async function routeOf(P, html) {
  return P.page.evaluate((markup) => {
    const host = document.createElement('div');
    host.id = '__sfxprobe';
    host.innerHTML = markup;
    document.body.appendChild(host);
    const target = host.querySelector('[data-probe]') || host.firstElementChild;
    const key = window.__uiSfxResolve ? window.__uiSfxResolve(target) : 'NO-RESOLVER';
    host.remove();
    return key;
  }, html);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Clicker', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  await arm(P);

  rec.ok('the play() counter is armed (guard)',
    await P.page.evaluate(() => Array.isArray(window.__sfxCalls)), null);
  rec.ok('the delegate exposes its resolver for testing (guard)',
    await P.page.evaluate(() => typeof window.__uiSfxResolve === 'function'), null);

  /* ─── 1. ROUTING, against the markup this repo really writes ─── */
  const CASES = [
    ['a plain menu button', '<button data-probe>Accept</button>', 'ui-click'],
    ['a div control (role=button)', '<div role="button" data-probe>Sell</div>', 'ui-click'],
    ['the shared close cross (.bt-inspect-close)',
      '<button class="bt-inspect-close" data-probe>✕</button>', 'ui-close'],
    ['the dialog close the quest pop-ups use (data-qa)',
      '<button data-qa="dlg-close" aria-label="Close. Your reward stays waiting for you." data-probe><svg></svg></button>', 'ui-close'],
    ['a close named by aria-label',
      '<button aria-label="Close tutorial" data-probe>✕</button>', 'ui-close'],
    ['a bare cross with no label at all',
      '<button data-probe>×</button>', 'ui-close'],
    /* The one that keeps this heuristic honest: the trade window draws a ✕
       to REMOVE an item from an offer.  That is not closing a window. */
    ['a ✕ that is a REMOVE, not a close',
      '<button aria-label="Remove Bronze Sword" data-probe>✕</button>', 'ui-click'],
    ['an explicit data-uisfx="close"',
      '<button data-uisfx="close" data-probe>Done</button>', 'ui-close'],
    ['an opted-out control makes no sound',
      '<div role="button" data-uisfx="off" aria-label="Element Burst" data-probe></div>', null],
    ['a disabled button makes no sound',
      '<button disabled data-probe>Buy</button>', null],
    ['plain text in a panel is not a button',
      '<div data-probe>Strength 12</div>', null],
  ];
  for (const [what, html, want] of CASES) {
    const got = await routeOf(P, html);
    rec.ok(`routing: ${what} -> ${want === null ? 'silence' : want}`,
      got === want, { got, want, html });
  }

  /* ─── 2. ONE GESTURE, ONE SOUND ───
     The named sound must WIN, and the delegate's offer must not also land.
     Driven through the real entry points in the real order a tap produces:
     the delegate sees pointerup first and defers; the panel's own handler
     runs on the click that follows. */
  await drain(P);
  const both = await P.page.evaluate(async () => {
    const A = window.BT_AUDIO;
    A.uiClick();                    /* what the delegate offers on pointerup */
    A.uiTick('ui-close', 0.5);      /* what the panel's onClick then does */
    await new Promise((r) => setTimeout(r, A.UI_CLICK_DEFER_MS + 120));
    return (window.__sfxCalls || []).slice();
  });
  rec.ok('a close control makes ONE sound, and it is the close',
    both.length === 1 && both[0] === 'ui-close', { calls: both });

  /* Same for equip, which fires from the server echo rather than the click --
     i.e. potentially AFTER the delegate's deferred click would have played.
     The yield window, not the cancel, is what has to cover this one. */
  await P.page.waitForTimeout(400);
  await drain(P);
  const equip = await P.page.evaluate(async () => {
    const A = window.BT_AUDIO;
    A.uiTick('ui-equip', 0.55);     /* handler ticks first this time */
    A.uiClick();
    await new Promise((r) => setTimeout(r, A.UI_CLICK_DEFER_MS + 120));
    return (window.__sfxCalls || []).slice();
  });
  rec.ok('an equip control makes ONE sound, and it is the equip',
    equip.length === 1 && equip[0] === 'ui-equip', { calls: equip });

  /* ...and an ordinary menu button, with no named sound anywhere near it,
     still gets its click. The suppression must be a yield, not a mute. */
  await P.page.waitForTimeout(400);
  await drain(P);
  const plain = await P.page.evaluate(async () => {
    const A = window.BT_AUDIO;
    A.uiClick();
    await new Promise((r) => setTimeout(r, A.UI_CLICK_DEFER_MS + 120));
    return (window.__sfxCalls || []).slice();
  });
  rec.ok('an ordinary menu button DOES get the click (the yield is not a mute)',
    plain.length === 1 && plain[0] === 'ui-click', { calls: plain });

  /* ═══ THE NEXT TAP IS NOT THE LAST ONE ═══
     The yield used to be "was there a named sound in the last 350ms", and that
     is wrong in the one direction a fixed window is always wrong: a person
     closing a window and then reaching for the next button does it in about
     that long, so the perfectly ordinary tap AFTER a close came out silent.
     The delegate passes the timestamp its gesture began instead, so this asks
     for a close and then, a quarter of a second later -- inside any window
     wide enough to have covered a slow press -- a click belonging to a NEW
     gesture.  Both must sound. */
  await P.page.waitForTimeout(400);
  await drain(P);
  const sequence = await P.page.evaluate(async () => {
    const A = window.BT_AUDIO;
    A.uiTick('ui-close', 0.5);                     /* gesture 1: shut a window */
    await new Promise((r) => setTimeout(r, 250));
    const gesture2 = A._now();                     /* gesture 2 begins HERE */
    A.uiClick(undefined, gesture2);
    await new Promise((r) => setTimeout(r, A.UI_CLICK_DEFER_MS + 120));
    return (window.__sfxCalls || []).slice();
  });
  rec.ok('the tap AFTER a close still clicks (the yield is per gesture, not a window)',
    sequence.length === 2 && sequence[0] === 'ui-close' && sequence[1] === 'ui-click',
    { calls: sequence });

  /* ...and the same gesture is still covered backwards: a handler that ticks
     on POINTERDOWN fires before the listener ever sees the pointerup. */
  await P.page.waitForTimeout(400);
  await drain(P);
  const backwards = await P.page.evaluate(async () => {
    const A = window.BT_AUDIO;
    const gesture = A._now();                      /* finger lands */
    A.uiTick('ui-equip', 0.55);                    /* a pointerdown handler */
    await new Promise((r) => setTimeout(r, 300));  /* a slow press */
    A.uiClick(undefined, gesture);                 /* finger lifts */
    await new Promise((r) => setTimeout(r, A.UI_CLICK_DEFER_MS + 120));
    return (window.__sfxCalls || []).slice();
  });
  rec.ok('a slow press whose handler ticked on pointerdown still makes ONE sound',
    backwards.length === 1 && backwards[0] === 'ui-equip', { calls: backwards });

  /* ─── 3. A REAL TAP ON A REAL DASHBOARD TAB ───
     The control the owner has already reported silent once. */
  await P.page.waitForTimeout(400);
  await drain(P);
  const ids = await P.page.$$eval('[data-nav]', (els) => els.map((e) => e.getAttribute('data-nav')));
  rec.ok('the dashboard nav rail is on screen (guard)', ids.length > 0, { ids });
  if (ids.length) {
    await P.page.click('[data-nav="' + ids[ids.length - 1] + '"]', { force: true }).catch(() => {});
    await P.page.waitForTimeout(350);
    const calls = await drain(P);
    rec.ok('a real tap on a real dashboard tab plays the click, once',
      calls.filter((k) => k === 'ui-click').length === 1
      && calls.filter((k) => k === 'ui-close').length === 0, { calls, tab: ids[ids.length - 1] });
  }

  /* ─── 4. COVERAGE: "ANY of the buttons in ANY of those menus" ───
     The owner's words are a claim about EVERY control, and the delegate's
     whole justification is that it does not have to be re-visited when a
     panel is added.  Both are only true if something measures it, so this
     walks each dashboard destination, asks REACT which elements actually
     carry a tap handler (the fiber props -- a styling div and a live control
     are indistinguishable from the markup alone), and requires the delegate
     to have a sound for each one.

     Measured when this landed: 8-24 live controls per destination and
     exactly TWO misses on every screen, both correct --
       .bt-dashboard      the panel SURFACE, whose handler suppresses stray
                          swipes.  Tapping empty panel background is not
                          pressing a button and must stay silent.
       [data-zone-title]  a LONG-PRESS handle (holdStart/holdEnd).  A short
                          tap does nothing at all, so a click would be a
                          sound for a non-event.
     They are named rather than counted, so a THIRD miss -- a new panel
     shipping a div-with-onClick that nobody gave role="button" -- fails here
     with the element printed, and the author picks: make it a button, or say
     here why it is not one.  That is the pressure this feature needs and the
     one a hand-wired sound could never have. */
  const SILENT_BY_DESIGN = ['.bt-dashboard', '[data-zone-title]'];
  for (const id of ids) {
    await P.page.click('[data-nav="' + id + '"]', { force: true }).catch(() => {});
    await P.page.waitForTimeout(450);
    const cov = await P.page.evaluate((allow) => {
      const taps = ['onClick', 'onPointerUp', 'onPointerDown', 'onMouseDown', 'onTouchStart'];
      const out = { hit: 0, missed: [] };
      for (const el of document.querySelectorAll('.bt-dashboard, .bt-dashboard *, .bt-land-sheet, .bt-land-sheet *')) {
        const k = Object.keys(el).find((x) => x.startsWith('__reactProps$'));
        if (!k) continue;
        const p = el[k];
        if (!p || !taps.some((t) => typeof p[t] === 'function')) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;          /* not on screen */
        if (allow.some((sel) => el.matches(sel))) continue;  /* silent by design */
        if (window.__uiSfxResolve(el)) { out.hit++; continue; }
        out.missed.push({
          tag: el.tagName.toLowerCase(),
          cls: String((el.className && el.className.baseVal) || el.className || '').slice(0, 40),
          txt: (el.textContent || '').trim().slice(0, 30),
        });
      }
      return out;
    }, SILENT_BY_DESIGN);
    rec.ok(`coverage: every live control in the "${id}" panel has a sound`,
      cov.missed.length === 0 && cov.hit > 0, cov);
  }

  /* ─── 5. THE SPILL TEST: the world controls are out of reach ───
     Not "we did not wire them" -- the delegate physically cannot match them,
     because they are not buttons. Asserted against the live DOM so that
     giving the joystick a role="button" one day fails HERE. */
  await P.page.waitForTimeout(400);
  const world = await P.page.evaluate(() => {
    /* The real markers, read out of the components: TouchControls draws the
       joystick zones and knobs, SpecialButton/ShieldButton tag themselves with
       data attributes, and the element burst is the one role="button" of the
       set (it opts out by data-uisfx). */
    const sel = ['.bt-joystick-zone', '.bt-joystick-base', '.bt-joystick-knob',
      '.bt-rjoy-zone', '.bt-rjoy-base', '[data-joyzone]',
      '[data-special]', '[data-shield]', '.bt-burst-btn'];
    const out = [];
    for (const s of sel) {
      for (const el of document.querySelectorAll(s)) {
        out.push({ sel: s, key: window.__uiSfxResolve ? window.__uiSfxResolve(el) : 'NO-RESOLVER' });
      }
    }
    return out;
  });
  const noisy = world.filter((w) => w.key !== null);
  rec.ok('no world control resolves to a menu sound',
    noisy.length === 0, { checked: world.length, noisy });

  await P.ctx.close().catch(() => {});
}
