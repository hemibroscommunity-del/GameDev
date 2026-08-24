/* THE MP / ENERGY SPEND BARS UNDER THE CHARACTER (v2.3.1895).
 *
 * Owner: "have the mp bar below the character (name plate will disappear when
 * mp is used).  The amount of mp used will slide right.  The resource bar
 * will begin fading after 1 second and disappear after 2 seconds if no further
 * mp is used.  Do the same thing for energy but beneath the mp bar.  Reserve
 * the space ... (they stay in those positions)."
 *
 * Five separable claims, so five checks — a test that only asked "did a bar
 * appear" would pass with four of them broken.
 */
import * as H from './harness.mjs';

const probe = (P) => P.page.evaluate(() => window.__btResourceBars || null);
const spend = (P, field, amount) => P.page.evaluate(({ f, a }) => {
  const S = window._gameState.current;
  S.rpg[f] = Math.max(0, (S.rpg[f] || 0) - a);
}, { f: field, a: amount });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Caster', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* ── 0. THE CONTROL: at rest, nothing is drawn ──
     Not a formality. Every check below is about a bar that only this version
     draws, so if they were up at rest the rest would pass against a HUD that
     never hides. */
  await P.page.waitForTimeout(2500);
  const rest = await probe(P);
  rec.ok('at rest, neither bar is drawn (control)',
    !!rest && rest.mp <= 0.01 && rest.en <= 0.01, rest);
  rec.ok('...and the name plate is therefore shown', !!rest && rest.plateHidden === false, rest);

  /* ── 1. spending MP reveals the bar and hides the plate ── */
  await spend(P, 'mana', 30);
  await P.page.waitForTimeout(250);
  const spent = await probe(P);
  rec.ok('spending MP reveals the MP bar', !!spent && spent.mp > 0.9, spent);
  rec.ok('...and the name plate disappears', !!spent && spent.plateHidden === true, spent);
  rec.ok('...while the ENERGY bar stays hidden (they are independent)',
    !!spent && spent.en <= 0.01, spent);

  /* ── 2. the timing: full for ~1s, fading by 1.5s, gone by 2s ── */
  await P.page.waitForTimeout(600);        /* ~0.85s since the spend */
  const atHold = await probe(P);
  rec.ok('still at full alpha within the first second', !!atHold && atHold.mp > 0.9, atHold);
  await P.page.waitForTimeout(700);        /* ~1.55s */
  const midFade = await probe(P);
  rec.ok('fading between 1s and 2s', !!midFade && midFade.mp > 0.05 && midFade.mp < 0.9, midFade);
  await P.page.waitForTimeout(800);        /* ~2.35s */
  const gone = await probe(P);
  rec.ok('gone after 2 seconds', !!gone && gone.mp <= 0.01, gone);
  rec.ok('...and the name plate comes back', !!gone && gone.plateHidden === false, gone);

  /* ── 3. a second spend re-arms the hold rather than letting it fade out ── */
  await spend(P, 'mana', 10);
  await P.page.waitForTimeout(700);
  await spend(P, 'mana', 10);
  await P.page.waitForTimeout(700);        /* 1.4s after the FIRST spend */
  const rearmed = await probe(P);
  rec.ok('a further spend re-arms the hold (still full at 1.4s from the first)',
    !!rearmed && rearmed.mp > 0.9, rearmed);

  /* ── 4. energy behaves the same, and sits BELOW mp ── */
  await P.page.waitForTimeout(2500);
  await spend(P, 'stamina', 25);
  await P.page.waitForTimeout(250);
  const en = await probe(P);
  rec.ok('spending energy reveals the energy bar', !!en && en.en > 0.9, en);
  rec.ok('...and it is positioned BELOW the mp bar', !!en && en.enY > en.mpY, en);

  /* ── 5. the positions are RESERVED — energy does not move up when mp is
         hidden, which is the whole point of "they stay in those positions" ── */
  rec.ok('energy keeps its y with MP hidden (space is reserved)',
    !!en && en.en > 0.9 && en.mp <= 0.01 && en.enY === rest.enY, { en, rest });

  /* ── 6. THE SLIDE ──
     Sampled INSIDE one page evaluation on animation frames.  A harness
     round-trip costs 50-150ms and the slide lasts 420, so sampling across the
     wire would read two settled frames and call a working slide broken (the
     same mistake that misread the screenshots of this feature first time). */
  await P.page.waitForTimeout(2500);
  const sampled = await P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState.current;
    const seen = [];
    const num = [];
    /* PIN the spent value for the sample window.  Mana is server-authoritative:
       a bare local subtraction is overwritten by the next player_state delta,
       mana pops back up, and the chunk correctly collapses — which is the
       right behaviour and the wrong fixture.  Pinning measures the animation
       instead of the round-trip. */
    const target = Math.max(0, (S.rpg.mana || 0) - 40);
    S.rpg.mana = target;
    const t0 = performance.now();
    const tick = () => {
      const s2 = window._gameState.current;
      if (s2 && s2.rpg) s2.rpg.mana = target;
      const b = window.__btResourceBars;
      if (b && b.mpGhostX != null) seen.push({ t: Math.round(performance.now() - t0), x: +b.mpGhostX.toFixed(2), w: +b.mpGhostW.toFixed(2) });
      /* v2.3.1897: the "-N" rides the same sample window as the chunk — one
         evaluation, so the two readings describe the same frames and cannot
         be blamed on each other's timing. */
      if (b && b.mpSpentX != null) num.push({ t: Math.round(performance.now() - t0), x: b.mpSpentX, txt: b.mpSpentText, amt: b.mpSpent, right: b.barRight, a: b.mpSpentA, barA: b.mp });
      /* v2.3.1898: 2200ms, not 500 — the number now drifts across the bar's
         whole hold+fade, and a 500ms window would sample the first quarter of
         it and call a 26px drift a 6px one.  The chunk's own samples simply
         stop arriving after 420ms (mpGhostX goes null), which is correct. */
      if (performance.now() - t0 < 2200) requestAnimationFrame(tick);
      else res({ seen, num });
    };
    requestAnimationFrame(tick);
  }));
  const slide = sampled.seen;
  const num = sampled.num;
  console.log(`    slide samples: ${slide.length}, x ${slide.length ? slide[0].x + ' -> ' + slide[slide.length - 1].x : 'n/a'}`);
  rec.ok('the spent chunk is drawn at all', slide.length >= 3, { n: slide.length });
  rec.ok('...and it SLIDES RIGHT (x strictly increases)',
    slide.length >= 3 && slide[slide.length - 1].x > slide[0].x + 2,
    { first: slide[0], last: slide[slide.length - 1] });
  rec.ok('...keeping its width — it is the amount spent, not a shrinking wipe',
    slide.length >= 3 && Math.abs(slide[slide.length - 1].w - slide[0].w) < 0.5,
    { first: slide[0], last: slide[slide.length - 1] });

  /* ── 7. THE SPENT NUMBER (v2.3.1897) ──
     Owner: "I want the resource number spent to glide to the right of the
     resource bar (as a negative number)".  Three separate claims, so three
     separate assertions: it is a NEGATIVE number, it is RIGHT OF the bar, and
     it GLIDES.  Asserting only that a text node exists would pass on a "-0"
     parked on top of the bar. */
  console.log(`    spent-number samples: ${num.length}, ${num.length ? num[0].txt + ' x ' + num[0].x + ' -> ' + num[num.length - 1].x + ' (bar right edge ' + num[0].right + ')' : 'n/a'}`);
  rec.ok('the spent NUMBER is drawn', num.length >= 3, { n: num.length });
  rec.ok('...reading as a negative number of the amount spent',
    num.length >= 3 && /^-\d+$/.test(num[0].txt) && num[0].txt === '-40',
    { txt: num.length ? num[0].txt : null, amt: num.length ? num[0].amt : null });
  rec.ok('...positioned to the RIGHT of the bar, clear of its border',
    num.length >= 3 && num.every((s2) => s2.x > s2.right),
    { first: num[0], right: num[0] && num[0].right });
  /* v2.3.1898, owner: "I saw the number appear but not gliding.  I want the
     numbers to slowly move right then fade."  Two failure modes to exclude,
     and "x went up" excludes neither on its own:
       - it barely moves (the old 13px/420ms, which read as parked), so
         require most of the travel to actually happen; and
       - it moves in one jump and then sits, so require it to be STILL MOVING
         in the back half — that is the difference between a glide and a pop. */
  const mid = num[Math.floor(num.length / 2)];
  rec.ok('...and it GLIDES right, covering real ground',
    num.length >= 8 && num[num.length - 1].x - num[0].x > 18,
    { first: num[0], last: num[num.length - 1], travelled: num.length ? +(num[num.length - 1].x - num[0].x).toFixed(2) : null });
  rec.ok('...still moving in the SECOND half (a glide, not a pop-and-park)',
    num.length >= 8 && num[num.length - 1].x - mid.x > 4,
    { mid, last: num[num.length - 1] });
  rec.ok('...never drifting so far it leaves the character behind',
    num.length >= 3 && num[num.length - 1].x < num[0].right + 60,
    { last: num[num.length - 1], right: num[0] && num[0].right });

  /* v2.3.1898, owner: "the glide numbers need to match the same timing as the
     resource bars for appearing and fading."  Asserted as an IDENTITY on every
     sampled frame rather than by checking two timestamps: same alpha, always,
     is the only form of this that cannot drift when the fade is retuned. */
  const drift = num.filter((s2) => Math.abs(s2.a - s2.barA) > 0.02);
  rec.ok('...sharing the BAR\'s alpha exactly, frame for frame',
    num.length >= 8 && drift.length === 0,
    { samples: num.length, mismatched: drift.slice(0, 3) });
  /* And that alpha is genuinely a fade, not a constant 1 the identity above
     would also satisfy — the vacuous-pass trap this file keeps hitting. */
  const faded = num.filter((s2) => s2.a < 0.9);
  rec.ok('...and that shared alpha really does fade within the window',
    faded.length >= 2 && num[0].a > 0.9,
    { first: num[0] && num[0].a, last: num[num.length - 1] && num[num.length - 1].a, fadingSamples: faded.length });

  /* ── 8. A BURST OF SPENDS (v2.3.1899) ──
     Owner: "The spent energy numbers glide and fade correctly but not the mp
     numbers.  It's still the quick still pop up."

     Both bars run identical code, so the fault was in the DATA, not the
     drawing: mana gets spent REPEATEDLY (town regen pays 10% of max every
     ~670ms, so you can cast again immediately), and every further spend used
     to snap the number back to its origin — it restarted before it had
     travelled far enough to read as motion.  Energy only looked right
     because it was being spent once.

     Sections 6-7 above spend ONCE and would pass with this fully broken,
     which is exactly how it shipped.  This drives three spends and a
     fractional regen dip through one rAF window. */
  /* Refill the pool FIRST.  The sections above spend mana repeatedly and the
     idle harness character barely regenerates, so by here the pool was empty
     — every step below then clamped at 0, no drop was ever detected, and the
     accumulation check measured nothing.  (It failed loudly rather than
     passing vacuously only because it asserts a RISE; "amt > 0" would have
     sailed through on a stuck value.)  A rise is a refill, not a spend, so
     this reveals no bar. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.rpg) S.rpg.mana = S.rpg.maxMana || 100;
  });
  await P.page.waitForTimeout(2500);
  const burst = await P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState.current;
    const seen = [];
    const floor0 = 0;
    let pin = Math.max(floor0, (S.rpg.mana || 0) - 20);
    const t0 = performance.now();
    /* Each step is a further spend landing while the bar is still up, except
       the 0.4 dip — that is the shape town regen actually delivers (mana
       arrives fractional: 77 -> 77.1 -> 90 -> 90.1), and a sub-half-unit dip
       used to round to an amount of 0 and BLANK a live number mid-glide. */
    const steps = [{ at: 600, d: 15 }, { at: 1100, d: 0.4 }, { at: 1500, d: 12 }];
    let next = 0;
    const tick = () => {
      const el = performance.now() - t0;
      if (next < steps.length && el >= steps[next].at) { pin = Math.max(floor0, pin - steps[next].d); next++; }
      const s2 = window._gameState.current;
      if (s2 && s2.rpg) s2.rpg.mana = pin;
      const b = window.__btResourceBars;
      if (b && b.mp > 0.01) seen.push({ t: Math.round(el), x: b.mpSpentX, amt: b.mpSpent, a: b.mpSpentA, barA: b.mp, mana: Math.round((s2.rpg.mana || 0) * 10) / 10, pin: Math.round(pin * 10) / 10 });
      if (el < 2400) requestAnimationFrame(tick); else res(seen);
    };
    requestAnimationFrame(tick);
  }));
  const backwards = burst.filter((f, i) => i > 0 && f.x != null && burst[i - 1].x != null && f.x < burst[i - 1].x - 0.01);
  const blanked = burst.filter((f) => f.barA > 0.01 && (f.x == null || !f.amt));
  console.log(`    burst samples: ${burst.length}, amt ${burst.length ? burst[0].amt + ' -> ' + burst[burst.length - 1].amt : 'n/a'}, x ${burst.length ? burst[0].x + ' -> ' + burst[burst.length - 1].x : 'n/a'}`);
  rec.ok('the pool actually had mana to spend (fixture guard)',
    burst.length > 0 && burst[0].pin > 5, { first: burst[0] });
  rec.ok('a burst of spends keeps the number on screen throughout',
    burst.length >= 12, { n: burst.length });
  rec.ok('...and it NEVER snaps back to the origin (the reported "still pop up")',
    burst.length >= 12 && backwards.length === 0,
    { jumps: backwards.slice(0, 3) });
  rec.ok('...still covering ground across the whole burst',
    burst.length >= 12 && burst[burst.length - 1].x - burst[0].x > 12,
    { first: burst[0], last: burst[burst.length - 1] });
  /* v2.3.1900, owner: "Successive expenditures of mp and energy are treated
     cumulatively (numbers keep adding up the more you spend) I just want the
     expended amount."  The fixture spends 20, then 15, then a 0.4 regen dip,
     then 12 — so the distinct amounts the number shows must be exactly
     [20, 15, 12]: each spend on its own, the dip changing nothing.  Asserting
     the whole sequence rather than just the last value is what separates
     "per-spend" from "accumulating" AND from "stuck on the first". */
  const amts = burst.map((f) => f.amt).filter((a, i, arr) => i === 0 || a !== arr[i - 1]);
  rec.ok('...showing THIS spend, not a running total',
    JSON.stringify(amts) === JSON.stringify([20, 15, 12]), { amts });
  rec.ok('...and a fractional regen dip never BLANKS a live number',
    blanked.length === 0, { blanked: blanked.slice(0, 3) });
  /* The dip is the reason the amount is not overwritten blindly: it rounds to
     0.  Prove the fixture actually delivered one, or the guard above is
     testing nothing. */
  rec.ok('...(the fixture really did deliver a sub-unit dip)',
    burst.some((f, i) => i > 0 && f.mana < burst[i - 1].mana - 0.01 && f.mana > burst[i - 1].mana - 1),
    { manas: burst.map((f) => f.mana).slice(0, 24) });

  await P.ctx.close().catch(() => {});
}
