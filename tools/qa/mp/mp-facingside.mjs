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

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'TwoSided', wsPort, webPort, dpr: 2 });

  /* ── THE CONTROL, FIRST ──
     A plain character, before any drawing exists. If these are not ~0 then the
     three colours are being found in the scenery and every assertion below is
     measuring the ground. This is also what stops the "gone when turned away"
     check passing vacuously -- which is exactly how the first version of this
     scenario reported a green run while its crop sat on bare cobblestones. */
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y);
  await face(P, 's');
  const plain = await read(P, '00-control');
  rec.ok('a plain character can be located (guard)', !!plain, plain);
  rec.ok('with no drawings at all, none of the four colours appears on him — '
       + 'so the measure reads art, not scenery',
    !!plain && plain.pink < 10 && plain.green < 10 && plain.blue < 10
    && plain.red < 10, plain);

  /* Seeded before the world, the way a returning player arrives: the art store
     reads once at module load and the creator sends it in the join frame. */
  await P.page.evaluate(([f, g, b, h]) => {
    localStorage.setItem('bt-facetattoo', f);
    localStorage.setItem('bt-shirtart', g);
    localStorage.setItem('bt-shirtart-back', b);
    localStorage.setItem('bt-headbackart', h);   /* v2.3.2043 */
  }, [PINK, GREEN, BLUE, RED]);
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const seeded = await P.page.evaluate(() => ({
    face: (localStorage.getItem('bt-facetattoo') || '').length,
    front: (localStorage.getItem('bt-shirtart') || '').length,
    back: (localStorage.getItem('bt-shirtart-back') || '').length,
    head: (localStorage.getItem('bt-headbackart') || '').length,
  }));
  rec.ok('all four drawings survived the reload (guard)',
    seeded.face === 256 && seeded.front === 256 && seeded.back === 256
    && seeded.head === 256, seeded);

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
  rec.ok('...and the back-of-head drawing goes away again',
    !!again && again.red < 10, again);

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
  const peer = await B.page.evaluate((id) => {
    const o = ((window._gameState.current || {}).others || {})[id];
    if (!o) return null;
    const len = (v) => (typeof v === 'string' ? v.length : null);
    return { face: len(o.faceTattooArt), front: len(o.shirtArtFront),
             back: len(o.shirtArtBack), head: len(o.headBackTattooArt) };
  }, pid);
  rec.ok('another player receives all four drawings, at full length, AFTER the '
       + 'relay has run — both server gates pass the new key',
    !!peer && peer.face === 256 && peer.front === 256
    && peer.back === 256 && peer.head === 256, peer);

  for (const C of [P, B]) {
    const errs = C.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${C.name}'s client while turning around`,
      errs.length === 0, errs.slice(0, 3));
  }
  await B.ctx.close();
  await P.ctx.close();
}
