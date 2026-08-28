/* DOES YOUR OWN DODGE LEAVE A TRAIL? (v2.3.2078)
 *
 * ── THE BUG THIS EXISTS FOR ──
 * effectsRenderer has drawn a blue afterimage smear behind a dodge since the
 * feature shipped. It reads `S._dodgeTrail`, ages each ghost over 200ms and
 * splices the dead ones out — and NOTHING in the client has ever pushed a
 * ghost into it. The local list was empty on every frame, so your own roll
 * drew nothing at all.
 *
 * What made it look finished is the block twenty lines below it: the REMOTE
 * half, added in v2.3.1011, does push (into `other._dodgeTrail`, off the
 * `player_dodge` broadcast) and its comment calls itself "MP parity". The
 * parity was backwards. A peer rolling past you smeared blue; you rolled and
 * the screen stayed still. Nobody notices their own missing effect when
 * every other player's works.
 *
 * ── WHAT IS ASSERTED, AND WHY IT IS COUNTS AND NOT PIXELS ──
 * The ghosts are Graphics circles drawn into the shared effects layer, over
 * a town that is already blue in places (the fountain — see TRAPS §34), at
 * alpha 0.3 fading to 0 across 200ms. Counting blue pixels there would be a
 * race against a fade, measured over scenery of the same colour: a test that
 * fails for the weather.
 *
 * What the game owns is the LIST. `__btDodgeTrails` reports whether a roll
 * is live, how many ghosts are in the local trail and how many across every
 * peer's. Empty-vs-fed is exactly the defect, and it is unambiguous.
 *
 * ── THE PARITY IS THE POINT, SO IT IS ASSERTED AS PARITY ──
 * A second client rolls too, and the run ends by checking that the local
 * trail and the peer trail are both non-empty in the same session. That is
 * the assertion the v2.3.1011 comment always claimed and never made.
 */
import * as H from './harness.mjs';

const probe = (P) => P.page.evaluate(() =>
  (window.__btDodgeTrails ? window.__btDodgeTrails() : 'no-probe'));

/* Poll rather than sleep: the trail is fed once per rendered frame and aged
   out 200ms later, so a fixed wait either lands before the first push or
   after the last ghost expired (TRAPS: mp-drops v2.3.2078 learned this). */
async function peakTrail(P, ms = 900) {
  const t0 = Date.now();
  let peak = { rolling: false, mine: 0, peer: 0 };
  while (Date.now() - t0 < ms) {
    const t = await probe(P);
    if (t && t !== 'no-probe') {
      if (t.mine > peak.mine) peak = { ...peak, mine: t.mine };
      if (t.peer > peak.peer) peak = { ...peak, peer: t.peer };
      if (t.rolling) peak.rolling = true;
    }
  }
  return peak;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Roller', nameB: 'Watcher' });
  await H.waitMutualSight(A, B).catch(() => {});
  await A.page.waitForTimeout(800);

  const first = await probe(A);
  rec.ok('the renderer offers a dodge-trail probe at all (guard)', first !== 'no-probe', first);
  rec.ok('standing still, there is no trail behind anybody',
    !!first && first.mine === 0 && first.peer === 0 && first.rolling === false, first);

  /* ── YOUR OWN ROLL ──
     Through the game's own entry point (triggerContextualDodge, the same
     function the swipe and the desktop key both call), not by writing
     _dodgeRoll by hand — a renderer fed from a field the game does not set
     is the whole bug, so the field has to be set by the game. */
  await H.callFn(A, 'contextualDodge', 0).catch(() => {});
  const mine = await peakTrail(A, 900);
  rec.ok('the roll actually started (guard)', mine.rolling === true, mine);
  rec.ok('THE REGRESSION: your own dodge leaves an afterimage trail',
    mine.mine > 0, mine);
  rec.ok('...more than a single ghost, so it reads as a smear and not a dot',
    mine.mine >= 3, mine);

  /* ── AND IT CLEARS ──
     Every ghost is aged out over 200ms; a trail that grew forever would be a
     leak that also smeared the screen permanently. */
  await A.page.waitForTimeout(1400);
  const after = await probe(A);
  rec.ok('the trail ages out once the roll is over',
    !!after && after.mine === 0 && after.rolling === false, after);

  /* ── THE PARITY THE REMOTE HALF CLAIMED ──
     B rolls; A should see a trail behind B, from the player_dodge broadcast. */
  await H.callFn(B, 'contextualDodge', Math.PI).catch(() => {});
  const seen = await peakTrail(A, 1200);
  rec.ok("a peer's dodge still smears on your screen (the half that worked)",
    seen.peer > 0, seen);

  /* Both halves, in one session — which is what "MP parity" has to mean. */
  await A.page.waitForTimeout(1200);
  await H.callFn(A, 'contextualDodge', Math.PI / 2).catch(() => {});
  await H.callFn(B, 'contextualDodge', -Math.PI / 2).catch(() => {});
  const both = await peakTrail(A, 1200);
  rec.ok('both trails are drawn in the same session, which is the parity the '
       + 'v2.3.1011 comment claimed', both.mine > 0 && both.peer > 0, both);

  for (const P of [A, B]) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client`, errs.length === 0, errs.slice(0, 3));
  }

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
