/* ═══ THE BUTTON SAYS WHY IT WILL NOT GO, AND THE RAIL IS GONE (v2.3.2388) ═══
 *
 * Owner, in one message with a screenshot of the creator:
 *   "Remove this diamond separator thing"
 *   "Also if someone tries to press the shared 'join brotown button' make it
 *    give the reason it can't join (need name first) etc"
 *
 * ── WHY NO EXISTING SCENARIO COULD SEE THE SECOND ONE ──
 * mp-ccbuttons already reads `button.bt-cc-play` and mp-ccload already checks
 * the name field takes focus. Both were green throughout, because both ask
 * what the button LOOKS like and neither presses it. The defect was that
 * pressing it did nothing observable at all -- the native `disabled` attribute
 * means the click event never fires, so there was no moment for the screen to
 * answer in. A test that never clicks cannot tell a button that explains
 * itself from one that swallows the press.
 *
 * So the assertions here are all PRESS-THEN-READ, and the press is real touch
 * input at real coordinates rather than a dispatched event, because "can a
 * finger get an answer out of this" is the question.  See tapPlay below for
 * why it cannot be page.click().
 *
 * ── AND THE RAIL ──
 * Asserted as the absence of a background IMAGE on the row that carried it,
 * while the row's padding survives: that padding is the validation line's slot
 * (v2.3.2378), so "the rail is gone" and "the message still has somewhere to
 * live" are one trade and have to be checked together. Dropping the padding
 * with the picture is the plausible-but-wrong version of this change, and it
 * would put the message on top of the buttons.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const readMsg = (P) => P.page.evaluate(() => {
  const el = document.querySelector('.bt-cc-namemsg');
  const cluster = document.querySelector('.bt-cc-cluster');
  const btn = document.querySelector('button.bt-cc-play');
  return {
    text: el ? (el.textContent || '').trim() : null,
    color: el ? getComputedStyle(el).color : null,
    live: el ? el.getAttribute('aria-live') : null,
    dataMsg: cluster ? cluster.getAttribute('data-msg') : null,
    ariaDisabled: btn ? btn.getAttribute('aria-disabled') : null,
    nativeDisabled: btn ? btn.disabled : null,
    focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
  };
});

/* A REAL FINGER ON THE GOLD PLATE.
 *
 * NOT page.click(): Playwright's actionability check treats aria-disabled="true"
 * on a button as "not enabled" and refuses to click it, timing out after 30s.
 * That refusal is the automation harness's own policy, not the browser's -- an
 * ARIA attribute is an ANNOUNCEMENT, and no engine stops a fingertip on account
 * of one.  Which is the entire premise of this change: the button must keep
 * telling assistive tech it is unavailable while still receiving the press it
 * needs in order to say why.  If the test used page.click it could only ever
 * test buttons that were already clickable, and would have declared this
 * feature untestable rather than untested.
 *
 * page.touchscreen.tap() dispatches real touch input at real coordinates,
 * through the page's own hit-testing -- so a pointer-events:none or an
 * overlapping element would still fail it, which is what we want it to catch. */
const tapPlay = async (P) => {
  const box = await P.page.evaluate(() => {
    const b = document.querySelector('button.bt-cc-play');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!box) throw new Error('no ENTER BRO TOWN button to press');
  await P.page.touchscreen.tap(box.x, box.y);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Gatekeep', wsPort, webPort,
    viewport: PHONE, touch: true, dpr: 2 });
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await P.page.waitForTimeout(1200);

  /* ════════════ 1. THE DIAMOND RAIL IS GONE ════════════ */
  const row = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-cc-cluster > .bt-cc-actions');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { bgImage: cs.backgroundImage, padTop: parseFloat(cs.paddingTop) };
  });
  rec.ok('the actions row exists (guard)', !!row, row);
  rec.ok('the divider rail is gone -- no background image on the row that wore it',
    !!row && (row.bgImage === 'none' || !/cc-frame-rule/.test(row.bgImage)), row);
  /* THE OTHER HALF OF THE SAME TRADE.  The padding is the validation line's
     slot; removing it with the art would drop the message onto the buttons. */
  rec.ok('...but its SLOT survives, because the validation line lives in it',
    !!row && row.padTop > 12, row);
  const msgBox = await P.page.evaluate(() => {
    const m = document.querySelector('.bt-cc-namemsg');
    const a = document.querySelector('.bt-cc-cluster > .bt-cc-actions');
    if (!m || !a) return null;
    const mr = m.getBoundingClientRect(), ar = a.getBoundingClientRect();
    return { msgBottom: Math.round(mr.bottom), actionsTop: Math.round(ar.top),
      firstBtnTop: Math.round((a.querySelector('button') || a).getBoundingClientRect().top) };
  });
  rec.ok('...and the message sits ABOVE the buttons, not across them',
    !!msgBox && msgBox.msgBottom <= msgBox.firstBtnTop + 1, msgBox);

  /* ════════════ 2. PRESSING IT WITH AN EMPTY FIELD ════════════
     The exact state the screen opens in, and the one the owner pressed in:
     before this the validation line printed '' and the button ate the click,
     so NOTHING on screen said anything. */
  const before = await readMsg(P);
  console.log('    before the press: ' + JSON.stringify(before));
  rec.ok('with an empty field the screen starts quiet (guard)', before.text === '', before);
  /* The mechanism: a natively disabled button cannot be clicked at all. */
  rec.ok('the button is no longer natively disabled, so a press can be answered',
    before.nativeDisabled === false, before);
  rec.ok('...and it still announces itself as disabled to a screen reader',
    before.ariaDisabled === 'true', before);
  /* THE COST OF DROPPING THE NATIVE ATTRIBUTE, PAID.  The ENTER label breathes
     as a readiness cue and ONLY as one -- v2.3.1577 gated the animation on
     :not(:disabled) precisely so a dead button would never pulse "you're good,
     go" at a player who cannot go.  Removing `disabled` silently un-gates that
     selector, so the cue inverts unless the CSS moves with the attribute.  A
     test that only read the message text would have shipped it inverted. */
  const breath = () => P.page.evaluate(() => {
    const el = document.querySelector('.bt-cc-play-label');
    return el ? getComputedStyle(el).animationName : null;
  });
  rec.ok('a blocked button does not breathe "ready" at the player',
    (await breath()) === 'none', await breath());

  await tapPlay(P);
  await P.page.waitForTimeout(400);
  const pressed = await readMsg(P);
  console.log('    after the press: ' + JSON.stringify(pressed));
  rec.ok('pressing ENTER BRO TOWN with no name gives a REASON',
    !!pressed.text && /name/i.test(pressed.text), pressed);
  rec.ok('...phrased as the next action rather than a complaint',
    !!pressed.text && !/invalid|error|forbidden/i.test(pressed.text), pressed);
  rec.ok('...announced assertively, since it answers a press',
    pressed.live === 'assertive', pressed);
  rec.ok('...and the cluster claims the slot for it (data-msg)',
    pressed.dataMsg === '1', pressed);
  /* The answer AND the means to act on it: focusing the field also raises the
     keyboard on a phone. */
  rec.ok('...and it puts the cursor in the name field, where the fix is',
    pressed.focused === 'bt-cc-name-input', pressed);
  rec.ok('...still without entering the world', await P.page.evaluate(
    () => !!document.querySelector('input.bt-cc-name')), {});

  /* ════════════ 3. A TOO-SHORT NAME IS A DIFFERENT REASON ════════════
     Two rules, two answers -- a single generic "can't join" would pass a
     weaker version of this test and teach the player nothing. */
  await P.page.fill('input.bt-cc-name', 'B');
  await P.page.waitForTimeout(250);
  await tapPlay(P);
  await P.page.waitForTimeout(400);
  const short = await readMsg(P);
  console.log('    one character: ' + JSON.stringify(short));
  rec.ok('a one-character name gives its OWN reason, not the empty-field one',
    !!short.text && /short|2 letters|least/i.test(short.text)
      && short.text !== pressed.text, { short: short.text, empty: pressed.text });

  /* ════════════ 4. AND IT GETS OUT OF THE WAY ════════════
     A refusal that outlives the thing it refused is worse than none: it would
     sit under a filled field telling the player to do what they just did. */
  await P.page.fill('input.bt-cc-name', 'Brodin');
  await P.page.waitForTimeout(350);
  const ok = await readMsg(P);
  console.log('    valid name: ' + JSON.stringify(ok));
  rec.ok('typing a valid name clears the refusal',
    ok.text === '✓ Ready to go', ok);
  rec.ok('...and the button stops calling itself disabled',
    ok.ariaDisabled === null || ok.ariaDisabled === undefined, ok);
  rec.ok('...and NOW the label breathes, which is what the breath is for',
    (await breath()) === 'bt-cc-breathe', await breath());

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/ccjoin.png` }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
