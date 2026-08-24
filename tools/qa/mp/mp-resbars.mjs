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
  const slide = await P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState.current;
    const seen = [];
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
      if (performance.now() - t0 < 500) requestAnimationFrame(tick);
      else res(seen);
    };
    requestAnimationFrame(tick);
  }));
  console.log(`    slide samples: ${slide.length}, x ${slide.length ? slide[0].x + ' -> ' + slide[slide.length - 1].x : 'n/a'}`);
  rec.ok('the spent chunk is drawn at all', slide.length >= 3, { n: slide.length });
  rec.ok('...and it SLIDES RIGHT (x strictly increases)',
    slide.length >= 3 && slide[slide.length - 1].x > slide[0].x + 2,
    { first: slide[0], last: slide[slide.length - 1] });
  rec.ok('...keeping its width — it is the amount spent, not a shrinking wipe',
    slide.length >= 3 && Math.abs(slide[slide.length - 1].w - slide[0].w) < 0.5,
    { first: slide[0], last: slide[slide.length - 1] });

  await P.ctx.close().catch(() => {});
}
