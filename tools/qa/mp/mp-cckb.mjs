/* ═══ THE KEYBOARD STOPS SHOVING THE CREATOR (v2.3.2391) ═══
 *
 * Owner: "Can you make it so the name input doesn't shift the screen down to
 * the keyboard when you put the cursor there (this is an IOS issue)."
 *
 * ── WHAT THIS CAN AND CANNOT PROVE ──
 * It CANNOT reproduce the bug.  Headless Chromium has no software keyboard and
 * no iOS, so the visual-viewport pan that the owner sees cannot happen here.
 * Saying otherwise would be the whole value of this file spent on a lie.
 *
 * What it CAN do is measure the two things the pan depends on, both of which
 * are ordinary layout and fully reproducible:
 *
 *   1. WHETHER SAFARI HAS ANY REASON TO PAN.  It pans only to reveal a focused
 *      field it has just covered.  So the question is arithmetic: with the
 *      keyboard's height reserved, does the name field's bottom edge sit above
 *      the keyboard line?  Measured at rest it did not -- 446px against a 409
 *      line on a 390x745 Safari tab -- and the v2.3.1307 reservation only
 *      moved it to 428, still under.  That 18px was the whole bug.
 *
 *      AND THE COMPONENT'S OWN HANDLER MUST BE WHAT DOES IT.  The first cut of
 *      this file set `paddingBottom` and `data-kb` with its own hands and then
 *      measured the result -- which is a test of the stylesheet that cannot
 *      fail, because deleting NameModal's visualViewport effect outright left
 *      every assertion green.  It now installs the keyboard stub mp-firstrun
 *      uses (visualViewport.height shrinks while a text field holds focus, and
 *      a `resize` is dispatched), FOCUSES the field for real, and lets the
 *      component do the work.  Mutation-checked: with the effect's body
 *      short-circuited the file goes red.
 *
 *   2. WHETHER A FOCUS CAN SHOVE THE SCREEN DIRECTLY.  This one IS reproducible
 *      and it is a real, separate defect: .bt-name-modal is overflow:hidden,
 *      and an overflow:hidden box whose content stops fitting becomes a genuine
 *      scroll container.  Shrink it -- which is exactly what a home-screen
 *      install does, because iOS resizes the layout viewport there -- and a
 *      plain .focus() on a below-the-fold control scrolls the entire creator
 *      off the top, logo to -218px, with no way back: the same rule sets
 *      touch-action:none and overscroll-behavior:none.
 *
 * The keyboard heights below are the published iOS portrait figures including
 * the QuickType bar (~336pt on a 390-wide phone, ~260pt on an SE).  They are
 * the input to the arithmetic, not something this file measures.
 */
import * as H from './harness.mjs';

const CASES = [
  { w: 390, h: 745, kb: 336, tag: 'Safari tab, URL bar showing' },
  { w: 390, h: 844, kb: 336, tag: 'full height / home-screen install' },
  { w: 375, h: 553, kb: 260, tag: 'iPhone SE, toolbars showing' },
];

/* ═══ A PHONE KEYBOARD, WHICH PLAYWRIGHT DOES NOT EMULATE ═══
   Lifted from mp-firstrun (v2.3.1998), which established the shape: on iOS the
   keyboard shrinks visualViewport.height while innerHeight stays put, and that
   GAP is the keyboard.  Tying it to "is a text field focused" makes it open
   when the player taps the name box and close when they leave, and dispatching
   `resize` on the visualViewport is how the app hears about it -- which is
   precisely the event NameModal's effect subscribes to. */
/* A STRING, not a function, because the harness's `init` hook forwards a single
   argument-less script and each viewport needs its own keyboard height baked
   in.  This is the use `init` is documented for -- "stand in for a BROWSER API
   the sandbox cannot provide" -- and visualViewport's response to a soft
   keyboard is exactly that.  It stubs a platform API, never our own code. */
const keyboardStub = (kb) => `
  (() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const typing = () => {
      const a = document.activeElement;
      return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable));
    };
    try {
      Object.defineProperty(vv, 'height', {
        get: () => window.innerHeight - (typing() ? ${kb} : 0),
        configurable: true,
      });
    } catch (e) { return; }
    const kick = () => { try { vv.dispatchEvent(new Event('resize')); } catch (e) {} };
    document.addEventListener('focusin', () => setTimeout(kick, 16), true);
    document.addEventListener('focusout', () => setTimeout(kick, 16), true);
  })();
`;

export async function run({ browser, wsPort, webPort, rec }) {
  for (const c of CASES) {
    const P = await H.newPlayer(browser, { name: 'Kb', wsPort, webPort,
      viewport: { width: c.w, height: c.h }, touch: true, dpr: 3,
      init: keyboardStub(c.kb) });
    await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
    await P.page.click('[data-tut="login-create"]');
    await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
    await P.page.waitForTimeout(1200);

    const read = () => P.page.evaluate(() => {
      const col = document.querySelector('.bt-name-box.bt-cc-col-left');
      const title = document.querySelector('.bt-cc-title');
      return {
        bottom: Math.round(document.querySelector('input.bt-cc-name').getBoundingClientRect().bottom),
        stageLayoutH: document.querySelector('.bt-cc-stage').offsetHeight,
        dataKb: col.getAttribute('data-kb'),
        pad: Math.round(parseFloat(getComputedStyle(col).paddingBottom) || 0),
        titleShown: !!(title && getComputedStyle(title).display !== 'none'),
        vvGap: Math.round(window.innerHeight - window.visualViewport.height),
      };
    });

    const rest = await read();
    /* A REAL tap on the field, which raises the stubbed keyboard, which fires
       the resize NameModal listens for.  Nothing here touches the styles. */
    await P.page.click('input.bt-cc-name');
    await P.page.waitForTimeout(700);
    const typing = await read();

    const line = c.h - c.kb;
    const m = { rest: rest.bottom, fixed: typing.bottom, ...typing };
    console.log(`    ${c.tag}: line ${line}, field ${rest.bottom} -> ${typing.bottom}, gap ${typing.vvGap}, pad ${typing.pad}`);

    rec.ok(`${c.tag}: the stubbed keyboard really came up (guard: ${typing.vvGap}px gap)`,
      typing.vvGap === c.kb, typing);
    /* The COMPONENT reacted -- not this file.  If NameModal's visualViewport
       effect is gone or broken, this is the assertion that says so. */
    rec.ok(`${c.tag}: ...and NameModal's own handler reserved room for it (pad ${typing.pad}px)`,
      typing.dataKb === '1' && typing.pad >= c.kb - 1, typing);
    rec.ok(`${c.tag}: the field was BELOW the keyboard before this (guard: ${rest.bottom} > ${line})`,
      rest.bottom > line, m);
    rec.ok(`${c.tag}: the name field now clears the keyboard (${typing.bottom} <= ${line})`,
      typing.bottom <= line, { ...m, line });
    /* The stage yields, but is not annihilated: it collapsed to ZERO in an
       earlier cut of the CSS, which is not "the bro makes room", it is the bro
       disappearing.  96px of layout is ~192px painted (the stage carries
       scale(2)), so he is smaller, not gone. */
    rec.ok(`${c.tag}: ...and the bro shrinks rather than vanishing (stage ${m.stageLayoutH}px)`,
      m.stageLayoutH >= 90, m);
    rec.ok(`${c.tag}: ...with the title standing down to pay for it`, m.titleShown === false, m);

    /* ── the reproducible one ──
       Run with the field BLURRED and anchored on the trait picker, not on the
       title.  Both matter: while the name field holds focus the keyboard is up,
       which is exactly when the title is display:none, so anchoring there
       measures the title coming BACK and calls it a scroll.  It did, and the
       assertion failed with the property under test perfectly intact
       (scrollTop 0, anchor 0 -> 10).  .bt-cc-panel is on screen in every
       state this screen has. */
    await P.page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await P.page.waitForTimeout(500);
    const mover = await P.page.evaluate(() => {
      const mo = document.querySelector('.bt-name-modal');
      const anchor = document.querySelector('.bt-cc-panel');
      mo.style.height = '400px';
      void mo.offsetHeight;
      const overflowing = mo.scrollHeight - mo.clientHeight;
      const before = Math.round(anchor.getBoundingClientRect().top);
      document.querySelector('button.bt-cc-play').focus();
      return new Promise((r) => setTimeout(() => {
        const out = { overflowing, before,
          after: Math.round(anchor.getBoundingClientRect().top),
          scrollTop: mo.scrollTop, overflowY: getComputedStyle(mo).overflowY };
        mo.style.height = '';
        r(out);
      }, 300));
    });
    console.log(`    ${c.tag}: MOVER B overflow=${mover.overflowY} overflowing=${mover.overflowing}px scrollTop=${mover.scrollTop} anchor ${mover.before}->${mover.after}`);
    rec.ok(`${c.tag}: the shrunken modal really does overflow (guard: ${mover.overflowing}px of it)`,
      mover.overflowing > 50, mover);
    rec.ok(`${c.tag}: ...but focusing a below-fold control cannot scroll it`,
      mover.scrollTop === 0, mover);
    rec.ok(`${c.tag}: ...so the screen does not move`,
      Math.abs(mover.after - mover.before) <= 2, mover);

    await P.ctx.close().catch(() => {});
  }

  /* ═══ AND THE DESKTOP MUST STILL BE ABLE TO REACH ITS OWN BUTTON ═══
     v2.3.2391 closed the focus-shove by making .bt-name-modal overflow:clip
     for everyone.  On the DESKTOP layout the creator column legitimately
     overflows -- 919px of content in a 780px modal at 1000x780 -- and ENTER
     BRO TOWN sits at y 812, eighty-eight pixels below the fold, reachable only
     because overflow:hidden still scrolls to a wheel.  clip took that away and
     the button became unclickable.  Nothing in the creator suite noticed: every
     scenario in it runs on a phone viewport where the column fits.  mp-questline
     found it, in CI, after the push.

     So this asserts the property directly, at the viewport where it broke, by
     CLICKING the thing.  A geometry check would not do: the button was visible,
     enabled and stable throughout -- what it had stopped being was hittable. */
  const D = await H.newPlayer(browser, { name: 'Desk', wsPort, webPort });
  await D.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await D.page.click('[data-tut="login-create"]');
  await D.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await D.page.fill('input.bt-cc-name', 'Desker');
  await D.page.waitForTimeout(900);
  const geo = await D.page.evaluate(() => {
    const b = document.querySelector('button.bt-cc-play').getBoundingClientRect();
    const m = document.querySelector('.bt-name-modal');
    return { playTop: Math.round(b.top), vh: window.innerHeight,
      overflowY: getComputedStyle(m).overflowY,
      overflowing: m.scrollHeight - m.clientHeight };
  });
  console.log('    desktop: ' + JSON.stringify(geo));
  rec.ok(`desktop: ENTER really is below the fold here (guard: top ${geo.playTop} vs ${geo.vh}px tall)`,
    geo.playTop > geo.vh, geo);
  let clicked = true;
  try {
    await D.page.click('button.bt-cc-play', { timeout: 8000 });
  } catch (e) { clicked = false; }
  rec.ok('desktop: ...and it can still be clicked anyway', clicked, geo);
  await D.ctx.close().catch(() => {});
}
