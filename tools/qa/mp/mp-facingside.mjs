/* FRONT IS NOT BACK: THE FACE TATTOO AND THE SHIRT PRINT WHEN YOU TURN ROUND
 * (v2.3.2042).
 *
 * Owner: "face tattoos don't revolve around to your back nor do front shirt
 * designs revolve to back, they're separate."
 *
 * TWO CLAIMS, ONE ALREADY TRUE AND ONE NOT.
 *
 * The SHIRT was already right and this file guards it: there are two canvases
 * (bt-shirtart / bt-shirtart-back) and entityRenderer picks between them with
 * `_L.art[sideForDir(dir)]`, so the front drawing shows from the front and the
 * back drawing from behind. Worth a test precisely BECAUSE it already works --
 * it is one `sideForDir` call away from silently reverting, and nothing was
 * watching it.
 *
 * The FACE was not. The stamp fires whenever a face tattoo exists, with no
 * idea which way the character points, and `north`/`northeast` are real
 * back-view sheets -- so a drawing meant for a face was landing on the back of
 * a head. v2.3.2042 resolves the facing before the bake.
 *
 * ── WHY THREE COLOURS ──
 * Pink on the face, green on the shirt FRONT, blue on the shirt BACK. One
 * colour could not tell "the back print is showing" from "the front print
 * revolved round", which is the entire question. Three make every outcome
 * distinguishable, including the one that would look correct by accident.
 *
 * ── WHY THERE IS NO HEAD CROP ──
 * The first cut split the figure into a head box and a torso box, so that an
 * ARM tattoo could not answer a question about the face. It measured bare
 * ground: the sprite does not sit where that split assumed, and the run
 * reported zero pink FACING FORWARD -- which also made "the tattoo is gone
 * when you turn away" pass while measuring nothing at all. That is the failure
 * mode this file is supposed to catch, so it is worth being explicit that the
 * first version of it had exactly that bug.
 * The crop is gone rather than re-tuned. This scenario seeds ONLY the face
 * tattoo -- no arm ink, no torso ink -- so pink anywhere on the figure is the
 * face tattoo by construction, and no coordinate has to be right for the
 * measurement to mean what it says. The control below is what makes that
 * claim safe: with no art at all, the same box must read zero.
 */
import * as H from './harness.mjs';

const SHOTS = H.REPO + '/tools/qa/mp/out';

const ALL = (ch) => ch.repeat(256);
const PINK = ALL('b');   /* 11 #d76ba8 -- the FACE tattoo */
const GREEN = ALL('6');  /* 6  #5aa84f -- the shirt FRONT print */
const BLUE = ALL('8');   /* 8  #3f7fd0 -- the shirt BACK print */
/* v2.3.2043: 3 #c8402f -- the BACK OF THE HEAD. A fourth colour rather than
   reusing pink, for the same reason there are three already: pink on the back
   of a head could be the new canvas working OR the face revolving round, and
   those are opposite outcomes.
   RED, after amber (#f2c94c) was tried and rejected -- it is the colour of the
   town's golden cobblestones, and the control caught it immediately by
   reporting 28,419 "back of head" pixels on a character with no drawings at
   all. Which is what the control is for. */
const RED = ALL('3');

/* `r > b` is not decoration. Without it the BLUE back-print's lighter pixels
   satisfy the pink test -- a lit blue like (150,160,200) clears both `b > g+24`
   and `r > 110` -- and the run reported 49 pink on a back that had no face
   tattoo on it at all, which reads as the fix having failed when what had
   failed was the measurement. Pink (215,107,168) has r above b; blue
   (63,127,208) has b above r. One comparison separates them for good. */
const isPink  = (r, g, b) => b > g + 24 && r > 110 && r >= b;
const isGreen = (r, g, b) => g > r + 20 && g > b + 20 && g > 70;
const isBlue  = (r, g, b) => b > r + 34 && b > g + 22 && b > 80;
/* Red (200,64,47): strong red with BOTH other channels far below it. The two
   margins are what keep it off the ground (a gold cobble is ~(230,190,90) --
   high red, but green nowhere near 90 below it) and off skin (~(205,134,75),
   same reason). */
const isRed = (r, g, b) => r > 140 && r - g > 90 && r - b > 100;

/* The figure, and only the figure.  v2.3.2078: this used to be a local copy
   of an 88x104 box that was about twice the character — see H.figureBox for
   what the fountain did to its control reading, and where the tighter numbers
   come from.  One copy now, shared with mp-cosmpose and mp-skinworld.
   (`S.facing` in the old fallback chain does not exist in src/; `S._facing`
   does, and is what figureBox reports.) */
async function boxes(P) {
  const b = await H.figureBox(P);
  return b ? { facing: b.facing, figure: b } : null;
}

/** Turn to face a direction and come to a stop, so the pose is `stand` and the
 *  facing is the one just walked in. Held briefly after the key is released:
 *  reading mid-step would sample a jog frame, which is a different sheet. */
async function face(P, key, ms = 900) {
  await P.page.keyboard.down(key);
  await P.page.waitForTimeout(ms);
  await P.page.keyboard.up(key);
  await P.page.waitForTimeout(400);
  /* v2.3.2078: walk back to the colour-clean patch before reading.
     Turning means WALKING ~380px, and from the plaza spawn that lands the
     figure beside the fountain — whose water put 4455 blue pixels in the
     control frame and failed four assertions that have nothing to do with
     the shirt print they name.  The facing is set by the walk and survives
     being repositioned (_facingAngle is not recomputed while stopped), so
     coming back costs the measurement nothing. */
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y);
  await P.page.waitForTimeout(1000);
}

async function read(P, tag) {
  const b = await boxes(P);
  if (!b) return null;
  const px = await H.screenshotPixels(P, b.figure);
  if (tag) await P.page.screenshot({ path: `${SHOTS}/facingside-${tag}.png`, clip: b.figure }).catch(() => {});
  return {
    facing: b.facing,
    pink: px.count(isPink),     /* the FACE tattoo */
    green: px.count(isGreen),   /* the shirt FRONT print */
    blue: px.count(isBlue),     /* the shirt BACK print */
    red: px.count(isRed),       /* the BACK OF THE HEAD drawing */
  };
}

/* ═══ v2.3.2746: DRAWN BEFORE THE CHARACTER EXISTS ═══
   v2.3.2690 (#706) made a character's look its STORED RECORD, written once at
   the creator's join: a drawing a returning client has in localStorage but the
   record lacks is blank, on the relay and on the client alike.  This scenario
   used to draw a plain character, then seed the four drawings into storage and
   reload -- which is now, correctly, the look of a DIFFERENT, undrawn
   character, and every "is the tattoo on him" check measured a blank bro.
   So the drawings are in storage before the page's first script runs (an init
   script), and the creator's join carries them into the record, the way a
   player who drew in the creator arrives.  The control is a separate, plain
   character, because this one is never plain. */
const SEED = `try {
  localStorage.setItem('bt-facetattoo', ${JSON.stringify(PINK)});
  localStorage.setItem('bt-shirtart', ${JSON.stringify(GREEN)});
  localStorage.setItem('bt-shirtart-back', ${JSON.stringify(BLUE)});
  localStorage.setItem('bt-headbackart', ${JSON.stringify(RED)});
} catch (e) {}`;

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── THE CONTROL, FIRST ──
     A plain character, with no drawing anywhere. If these are not ~0 then the
     four colours are being found in the scenery and every assertion below is
     measuring the ground. This is also what stops the "gone when turned away"
     check passing vacuously -- which is exactly how the first version of this
     scenario reported a green run while its crop sat on bare cobblestones. */
  const C = await H.newPlayer(browser, { name: 'Plain', wsPort, webPort, dpr: 2 });
  await H.enterWorld(C);
  await C.page.waitForTimeout(2500);
  await H.hopTo(C, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y);
  await face(C, 's');
  const plain = await read(C, '00-control');
  rec.ok('a plain character can be located (guard)', !!plain, plain);
  rec.ok('with no drawings at all, none of the four colours appears on him — '
       + 'so the measure reads art, not scenery',
    !!plain && plain.pink < 10 && plain.green < 10 && plain.blue < 10
    && plain.red < 10, plain);
  await C.ctx.close();

  const P = await H.newPlayer(browser, { name: 'TwoSided', wsPort, webPort, dpr: 2, init: SEED });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y);

  /* the drawings the game holds for him -- the exact strings, because a blank
     canvas is 256 characters too and a length check passed on one */
  const seeded = await P.page.evaluate(([f, g, b, h]) => ({
    face: localStorage.getItem('bt-facetattoo') === f,
    front: localStorage.getItem('bt-shirtart') === g,
    back: localStorage.getItem('bt-shirtart-back') === b,
    head: localStorage.getItem('bt-headbackart') === h,
  }), [PINK, GREEN, BLUE, RED]);
  rec.ok('all four drawings are this character\'s own (guard)',
    seeded.face && seeded.front && seeded.back && seeded.head, seeded);

  /* ── FACING THE CAMERA ── */
  await face(P, 's');
  const front = await read(P, 'front');
  rec.ok('the character can be located and measured facing forward (guard)',
    !!front, front);
  rec.ok('facing forward, the face tattoo is on his face',
    !!front && front.pink >= 10, front);
  rec.ok('...and the FRONT shirt print is on his chest',
    !!front && front.green >= 10, front);
  rec.ok('...and the BACK print is nowhere on him',
    !!front && front.blue < 10, front);
  rec.ok('...and neither is the back-of-head drawing',
    !!front && front.red < 10, front);

  /* ── TURNED AWAY ── */
  await face(P, 'w');
  const back = await read(P, 'back');
  rec.ok('the character can be located and measured facing away (guard)',
    !!back, back);
  rec.ok('turned away, the face tattoo is GONE — a face does not revolve round '
       + 'to the back of a head',
    !!back && back.pink < 10, back);
  rec.ok('...the BACK shirt print is showing instead',
    !!back && back.blue >= 10, back);
  rec.ok('...and the FRONT print has gone with the front',
    !!back && back.green < 10, back);
  /* v2.3.2043: the head is not merely BLANK from behind any more -- it carries
     its own drawing. Asserted as a separate colour from the face precisely so
     "the back canvas is showing" cannot be confused with "the face revolved". */
  rec.ok('...and the BACK OF THE HEAD carries its own drawing',
    !!back && back.red >= 10, back);

  /* ── AND BACK AGAIN ──
     A one-way check would pass on a build that simply stopped drawing the face
     tattoo after the first turn. The sheets are cached per facing, so this is
     also the assertion that the two cache entries are genuinely different
     rather than one entry being overwritten. */
  await face(P, 's');
  const again = await read(P, 'again');
  rec.ok('turning back to the camera brings the face tattoo back',
    !!again && again.pink >= 10, again);
  rec.ok('...and the front print with it',
    !!again && again.green >= 10, again);
  /* ═══ v2.3.2249: AGAINST ITS OWN CONTROL, NOT AN ABSOLUTE ═══
     `red < 10` and the `red >= 10` that proves the drawing IS showing were the
     same number, which only worked while the figure was one fixed size: at
     v2.3.2249's town scale the bro is 0.675x his old linear size, the whole
     count collapses toward the threshold from both directions, and 17 stray
     antialiased pixels beside a 314-pixel face tattoo read as "the back of his
     head is showing" -- 17 being simultaneously above the bar that proves it IS
     there.  A discriminator whose two sides meet is not discriminating.
     The claim is comparative and is now written that way: turned to the camera,
     there must be far less back-of-head ink than there was turned away.  Scale
     cancels, so this survives the next zoom change; the old absolute stays as a
     floor so it cannot pass by everything being zero. */
  rec.ok('...and the back-of-head drawing goes away again (vs what it measured turned away)',
    !!again && !!back && again.red < Math.max(10, back.red * 0.3),
    { ...again, awayRed: back && back.red, bar: Math.max(10, (back && back.red || 0) * 0.3) });

  /* ── AND ANOTHER PLAYER SEES THE SAME TWO SIDES ──
     v2.3.2043 added a wire key, and a drawing key has to clear TWO server
     gates -- the join sanitiser and the `track` handler. v2.3.1939 shipped one
     into the first and not the second, and the symptom was a drawing that
     appeared when a peer joined and vanished on the first two-second relay. So
     this watches a peer through a relay, not just the join frame. */
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, guest: true, dpr: 2 });
  await H.enterWorld(B);
  await H.waitMutualSight(P, B).catch(() => {});
  await B.page.waitForTimeout(5000);   /* past the two-second relay */
  const pid = await H.readState(P, (S) => S.myId);
  const peer = await B.page.evaluate(([id, f, g, b, h]) => {
    const o = ((window._gameState.current || {}).others || {})[id];
    if (!o) return null;
    return { face: o.faceTattooArt === f, front: o.shirtArtFront === g,
             back: o.shirtArtBack === b, head: o.headBackTattooArt === h };
  }, [pid, PINK, GREEN, BLUE, RED]);
  rec.ok('another player receives all four drawings, exactly, AFTER the '
       + 'relay has run — both server gates pass the new key',
    !!peer && peer.face && peer.front && peer.back && peer.head, peer);

  for (const C of [P, B]) {
    const errs = C.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${C.name}'s client while turning around`,
      errs.length === 0, errs.slice(0, 3));
  }
  await B.ctx.close();
  await P.ctx.close();
}
