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

export async function run({ browser, wsPort, webPort, rec }) {
  for (const c of CASES) {
    const P = await H.newPlayer(browser, { name: 'Kb', wsPort, webPort,
      viewport: { width: c.w, height: c.h }, touch: true, dpr: 3 });
    await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
    await P.page.click('[data-tut="login-create"]');
    await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
    await P.page.waitForTimeout(1200);

    /* Apply exactly what the component applies when visualViewport reports a
       keyboard: the v2.3.1307 padding, and the v2.3.2391 flag beside it.  The
       React state drives nothing else, so this is the real rendered state and
       not a mock of it. */
    const m = await P.page.evaluate((kb) => {
      const col = document.querySelector('.bt-name-box.bt-cc-col-left');
      const bot = () => Math.round(document.querySelector('input.bt-cc-name').getBoundingClientRect().bottom);
      const stage = () => document.querySelector('.bt-cc-stage');
      const rest = bot();
      col.style.paddingBottom = kb + 'px';
      void col.offsetHeight;
      const padOnly = bot();
      col.setAttribute('data-kb', '1');
      void col.offsetHeight;
      return {
        rest, padOnly, fixed: bot(),
        stageLayoutH: stage().offsetHeight,
        titleShown: !!(document.querySelector('.bt-cc-title')
          && getComputedStyle(document.querySelector('.bt-cc-title')).display !== 'none'),
      };
    }, c.kb);
    const line = c.h - c.kb;
    console.log(`    ${c.tag}: line ${line}, field ${m.rest} -> ${m.padOnly} (pad) -> ${m.fixed} (v2.3.2391)`);

    rec.ok(`${c.tag}: the field was BELOW the keyboard before this (guard: ${m.rest} > ${line})`,
      m.rest > line, m);
    rec.ok(`${c.tag}: the name field now clears the keyboard (${m.fixed} <= ${line})`,
      m.fixed <= line, { ...m, line });
    /* The stage yields, but is not annihilated: it collapsed to ZERO in an
       earlier cut of the CSS, which is not "the bro makes room", it is the bro
       disappearing.  96px of layout is ~192px painted (the stage carries
       scale(2)), so he is smaller, not gone. */
    rec.ok(`${c.tag}: ...and the bro shrinks rather than vanishing (stage ${m.stageLayoutH}px)`,
      m.stageLayoutH >= 90, m);
    rec.ok(`${c.tag}: ...with the title standing down to pay for it`, m.titleShown === false, m);

    /* ── the reproducible one ── */
    const mover = await P.page.evaluate(() => {
      const mo = document.querySelector('.bt-name-modal');
      const anchor = document.querySelector('.bt-cc-logo') || document.querySelector('.bt-cc-title');
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
}
