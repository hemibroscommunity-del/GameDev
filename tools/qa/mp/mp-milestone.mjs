/* ═══ v2.3.2645: THE MILESTONE CARD, DRIVEN BY A REAL SOCKET FRAME ═══
   Owner: "Yes give milestone unlocks their own notification."

   Four ways this can be wrong, and none of them is visible to lint or to the
   build:

   1. IT NEVER OPENS.  The whole feature is "the player finds out"; a card
      wired to a handler that does not fire is the v2.3.2637 bug again (a tick
      on a function with no callers).  So the frame goes in through the REAL
      onmessage and the DOM is asked whether a card exists.

   2. IT OPENS ON AN EMPTY RUNG.  Rungs 4 and 8 give NOTHING -- their `kind`
      was deleted twice for exactly this reason (v2.3.2252, v2.3.2327: the
      celebration was announcing a move the player had owned since level 1).
      A bigger, louder notification makes that bug worse, so silence on those
      two is a TESTED property, not a hope.

   3. IT OPENS BESIDE THE BURST.  A milestone always arrives on the same
      prog3_level as the skill level that crossed it, and v2.3.2643 removed
      simultaneous celebrations on the owner's word.  This asserts the
      SEQUENCE: the burst alone first, the card alone after.

   4. IT LIES ABOUT WHAT YOU GOT.  "+25% max stamina" is derived from the
      ladder's stamMult; a retune that left the sentence behind would be a
      notification confidently stating the wrong number. */
import * as H from './harness.mjs';

/* Shaped as server/src/prog3.js emits it.  `milestone` is the server's own
   label and is what the client gates on -- see the wsClient note. */
const frameFor = (charLevel, label, bonusPoints) => ({
  type: 'prog3_level',
  payload: {
    skill: 'bow', level: 7, charLevel, shared: 3,
    milestone: label,
    ...(bonusPoints ? { bonusPoints } : {}),
  },
});

const probe = (page) => page.evaluate(() => {
  const el = document.querySelector('[data-milestone-card]');
  if (!el) return { open: false };
  const name = el.querySelector('[data-milestone-name]');
  const gives = el.querySelector('[data-milestone-gives]');
  /* The PLATE, not the wrapper.  The wrapper is left:0/right:0 and is exactly
     the viewport wide, so measuring it would assert nothing at all. */
  const plate = el.querySelector('[data-milestone-plate]') || el;
  const r = plate.getBoundingClientRect();
  const cs = name ? window.getComputedStyle(name) : null;
  return {
    open: true,
    level: el.getAttribute('data-milestone-card'),
    name: name ? name.textContent : '',
    gives: gives ? gives.textContent : '',
    nameFontPx: cs ? parseFloat(cs.fontSize) : 0,
    box: { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height },
    /* Read from the page, never assumed: the harness's window is not a phone
       and a hard-coded 390 makes this row fail for the wrong reason. */
    vw: window.innerWidth, vh: window.innerHeight,
  };
});

const burstCount = (page) => page.evaluate(() =>
  document.querySelectorAll('[data-levelup-kind]').length);

const reset = (page) => page.evaluate(() => {
  if (window.__btResetMilestone) window.__btResetMilestone();
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Rung', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  rec.ok('the milestone bus exposes its reset for testing (guard)',
    await P.page.evaluate(() => typeof window.__btResetMilestone === 'function'), null);
  rec.ok('the socket seam is reachable (guard)',
    await P.page.evaluate(() => typeof window.__btWsEvent === 'function'), null);

  const delay = await P.page.evaluate(() => window.__btMilestoneDelayMs || 0);
  rec.ok('the card is scheduled AFTER the burst, not beside it',
    delay >= 2000 && delay <= 4000, { delayMs: delay });

  /* ─── 1. THE SEQUENCE ─── */
  await reset(P.page);
  await P.page.evaluate((f) => window.__btWsEvent(f), frameFor(6, 'Element Burst'));
  /* Mid-burst: the burst is up and the card is NOT. */
  await P.page.waitForTimeout(600);
  const during = { bursts: await burstCount(P.page), card: await probe(P.page) };
  rec.ok('while the level-up burst plays, the milestone card is NOT on screen',
    during.bursts >= 1 && during.card.open === false, during);

  /* After the burst's run: the card is up. */
  await P.page.waitForTimeout(2600);
  const after = { bursts: await burstCount(P.page), card: await probe(P.page) };
  rec.ok('...and once the burst has gone, the card IS',
    after.card.open === true, after);
  rec.ok('...with the burst no longer on screen beside it',
    after.bursts === 0, { bursts: after.bursts });

  /* ─── 2. WHAT IT SAYS ─── */
  rec.ok('it names the milestone', after.card.name === 'Element Burst', after.card);
  rec.ok('...and says what it GAVE you, not just its name',
    /new ability/i.test(after.card.gives || ''), after.card);
  /* The reason this component exists at all. */
  rec.ok('...at a size a person can actually read (>= 18px)',
    after.card.nameFontPx >= 18, { px: after.card.nameFontPx });
  rec.ok('...and the plate sits wholly inside the viewport',
    after.card.box.l >= 0 && after.card.box.r <= after.card.vw
    && after.card.box.t >= 0 && after.card.box.b <= after.card.vh,
    { box: after.card.box, vw: after.card.vw, vh: after.card.vh });

  /* ─── 3. IT CLOSES ON ITS OWN ─── */
  await P.page.waitForTimeout(4400);
  const gone = await probe(P.page);
  rec.ok('it closes itself rather than sitting on the world',
    gone.open === false, gone);

  /* ─── 4. THE EMPTY RUNGS STAY SILENT ───
     Rung 4 and rung 8 give nothing.  A card for either is the v2.3.2252 /
     v2.3.2327 bug made louder. */
  for (const [lvl, label] of [[4, 'Sturdy Arm'], [8, 'Storm Footing']]) {
    await reset(P.page);
    await P.page.evaluate((f) => window.__btWsEvent(f), frameFor(lvl, label));
    await P.page.waitForTimeout(3400);
    const p = await probe(P.page);
    rec.ok(`rung ${lvl} ("${label}") gives nothing, so it announces nothing`,
      p.open === false, p);
  }

  /* ─── 5. THE OTHER TWO REAL RUNGS, AND THEIR NUMBERS ─── */
  await reset(P.page);
  await P.page.evaluate((f) => window.__btWsEvent(f), frameFor(5, 'Bonus stat point', 1));
  await P.page.waitForTimeout(3400);
  const pts = await probe(P.page);
  rec.ok('rung 5 announces the bonus point, counted',
    pts.open === true && /\+1 point/i.test(pts.gives || ''), pts);

  await reset(P.page);
  await P.page.evaluate((f) => window.__btWsEvent(f), frameFor(10, 'Second Wind'));
  await P.page.waitForTimeout(3400);
  const stam = await probe(P.page);
  /* DERIVED from the ladder's stamMult (1.25), not typed into the component --
     so a retune moves this number instead of leaving the sentence lying. */
  rec.ok('rung 10 announces the stamina bonus, derived from the ladder (+25%)',
    stam.open === true && /\+25% max stamina/i.test(stam.gives || ''), stam);

  /* ─── 6. A RUNG THIS CLIENT HAS NEVER HEARD OF ───
     A newer worker may add one.  Silence would hide a real unlock, so an
     unknown rung is announced on the worker's own label. */
  await reset(P.page);
  await P.page.evaluate((f) => window.__btWsEvent(f), frameFor(12, 'Iron Lungs'));
  await P.page.waitForTimeout(3400);
  const unknown = await probe(P.page);
  rec.ok('an unknown rung is still announced, on the worker\'s own label',
    unknown.open === true && unknown.name === 'Iron Lungs', unknown);

  /* ─── 7. ONE UNLOCK, ONE CARD ───
     prog3_level can reach the bus twice for one event (a reconnect replay). */
  await reset(P.page);
  const twice = await P.page.evaluate(async (f) => {
    window.__btWsEvent(f);
    window.__btWsEvent(f);
    await new Promise((r) => setTimeout(r, 3600));
    return document.querySelectorAll('[data-milestone-card]').length;
  }, frameFor(6, 'Element Burst'));
  rec.ok('the same unlock arriving twice opens ONE card',
    twice === 1, { cards: twice });

  await P.ctx.close().catch(() => {});
}
