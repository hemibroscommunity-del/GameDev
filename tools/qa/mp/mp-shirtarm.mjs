/* THE T-SHIRT WHILE JOGGING EAST (v2.3.1984).
 *
 * Owner, twice now: "The bare arm showing while jogging east wearing t shirt
 * is still an issue."
 *
 * ── WHY THIS IS A SCREENSHOT SCENARIO ──
 * Reading the sprite sheets does not settle it. The shirt sheet's coverage
 * legitimately shrinks on the frames where the near arm swings across the
 * chest (the artist cuts the crossing arm out of the tee so the arm draws in
 * front — tools/gear/seal-shirt-edges.mjs says so), and a pixel count cannot
 * tell that intended cut-out from a missing sleeve. What the owner is
 * reporting is what the composite LOOKS like in motion, so the honest probe
 * is to run east in a real client and photograph the character.
 *
 * Captures a strip of the character across a full stride, cropped to the
 * figure and zoomed, so the frames can be compared side by side.
 *
 * ── STATUS: CLOSED (v2.3.2066) — see the v2.3.2066 section below ──
 * ── the history from here down is kept because two attempts failed on it ──
 *
 * ── WAS OPEN, v2.3.1990 ──
 * v2.3.1986 attempted a fix and was REVERTED the same night: its "crossing
 * arm" detector picked the jaw-and-neck mass on frames 9-11 (the head, neck,
 * torso and arms are one connected skin region, so a horizontal neck cut does
 * not sever the head) and painted a shirt-coloured blob on the character's
 * FACE. The owner caught it in play. See docs/TRAPS.md for the full postmortem
 * and the rules it leaves. The diagnosis below stands; only the fix was wrong.
 *
 * ── v2.3.1999: THE DIAGNOSIS BELOW IS WRONG ABOUT WHICH ARM ──
 * Re-measured from the sheets, and then looked at. The claim below is that
 * the sleeve goes missing on frames 8-11, where the near arm crosses the
 * chest. It does not. Counting bare skin in the top 8 rows of the shirt's own
 * band, with neck columns excluded, over one 14-frame cycle of jog-east:
 *
 *     frame   0  1  2  3  4  5  6  7  8  9 10 11 12 13
 *     bare    4  8  6  4  6  3  3  0  0  2  0  0  0  1
 *     armRow  5  3  4  4  4  5  3  8 10  5 11  8  8  7
 *
 * `armRow` is how far down the shirt's band the outer arm first shows bare.
 * The frames the old note accuses (7-12) are the BEST ones — the arm stays
 * covered to row 8-11 and nothing bare reaches the shoulder. The frames that
 * are wrong are 0-6, and it is the TRAILING arm, the one swinging behind,
 * not the one crossing in front: it is bare from the shoulder joint down,
 * while the leading arm on the same frame carries a correct white sleeve.
 * Rendered at 20x, frames 1-4, that is unmistakable.
 *
 * This matters beyond bookkeeping. v2.3.1986 built a "crossing arm" detector
 * to fix frames it had no business touching, and that detector is what found
 * the jaw and painted the face. The wrong target came first; the wrong
 * mechanism followed it.
 *
 * One measured consequence for whoever fixes it: most of the bare trailing
 * arm lies OUTSIDE the shirt's own bounding box (that is why the counts above
 * are single digits — they only see inside it). So this cannot be closed by a
 * fill rule that grows the shirt within its silhouette, the way the v2.3.1995
 * keyline work did. It needs the shoulder EXTENDED over the arm, which is new
 * art, which is the direction that adds pixels — the dangerous one. Whatever
 * does it must hold the invariant v2.3.1986 lacked: never write above the
 * shirt's own topmost row in that frame, and never on a column whose skin
 * continues up out of the collar. Both are cheap to assert per frame.
 *
 * ── v2.3.2066: CLOSED, AND NOW MEASURED RATHER THAN PHOTOGRAPHED ──
 * The sleeve is drawn.  tools/gear/draw-trailing-sleeve.mjs re-bakes
 * shirt/tshirt/jog-east.png with a band cut PERPENDICULAR TO THE ARM'S AXIS
 * (the thing §30 below says is required) at the body's own alpha, so the
 * character's silhouette does not change and the fringe cannot turn to pips.
 * Read that file's header for why the first two attempts failed and what in
 * this one is scar tissue from them.
 *
 * This scenario stops being a photograph and starts being a NUMBER, because a
 * photograph is exactly how a bare arm survived four owner reports:
 *
 *   bareShoulder(f) = body-skin pixels that are uncovered by the shirt, lie
 *   BEHIND the shirt's rear edge on their own row, and sit in the 8 rows below
 *   the shirt's topmost row, with head/neck columns excluded.
 *
 * That is v2.3.1999's window widened past the shirt's bounding box, which is
 * where the bare arm actually is (v2.3.1999 measured single digits precisely
 * because it clipped at the box).  Over one 14-frame cycle of jog-east:
 *
 *     frame     0   1   2   3   4   5   6  |  7  8  9 10 11 12 13   total
 *     before   13  28  30  39  22  19  14  |  0  3  0  0  0  2  6     176
 *     after     0   1   0  13   0   0   2  |  0  3  0  0  0  0  0      19
 *
 * The before column reproduces v2.3.1999's frames-0-6 split independently, so
 * the metric is measuring the reported defect and not the fix's own shape.
 * Frame 3's residual is real and is the bicep BELOW the hem: its shoulder sits
 * high enough that the 8-row window reaches past a correct short sleeve.
 *
 * It is read through the CLIENT's own sheet URL, ?v=GEAR_VERSION and all, so a
 * sheet that shipped without its cache bust fails here rather than in play.
 *
 * The other facings are REPORTED, not gated.  Measured at the same window they
 * come out northeast 100, southwest 130, north 35, south 4 — and rendered at
 * 14x, southwest is FINE: on a three-quarter view the window also catches the
 * raised fist, which is bare skin the tee is supposed to leave bare.  The
 * number only means "bare shoulder" on a profile.  Printed so the next session
 * starts from that rather than from the number.
 *
 * ── v2.3.2133: THE METRIC ABOVE IS THE REASON THIS KEEPS COMING BACK ──
 * Owner, a sixth time: "East shoulder is still bare during jog."
 *
 * The bareShoulder number the v2.3.2066 section defines is honest about the
 * TRAILING arm and actively misleading about everything else, and two sessions
 * have now closed this bug on the strength of it. Read body-only beside
 * body+tee at 13x for frame 3 and frame 10 and the defect is plain: frame 3
 * reads as a t-shirt, frame 10 reads as a bare chest with a white strip down
 * the back of it. What is over the chest on 10 is the NEAR ARM, swung up
 * across it, which the artist cut the tee away from so it draws in front.
 *
 * Two things make the metric miss that, and both are worth knowing before
 * trusting any area count on this sheet:
 *
 *   1. THE FIGURE SHRINKS. The torso turns away through 7-13, so the whole
 *      character is 1483-1829 px there against 1873-1958 on 0-6. Less of
 *      everything, the bare part included.
 *   2. MOST OF THE COUNT IS SUPPOSED TO BE BARE. Forearm, fist and neck are
 *      inside every window anyone has drawn here, and a tee leaves them bare.
 *
 * Net: bare skin in the chest band comes out 259,281,261,282,263,282,277 on
 * frames 0-6 against 245,211,185,135,180,218,244 on 7-13. The BAD frames score
 * better, on every one of them. v2.3.2093 ran five independent measurements
 * off this shape and concluded the frames were fine; they are not, the metric
 * was. Anything new here should be judged on a render first and a number
 * second -- which is what this file's own v2.3.1984 header said before the
 * v2.3.2066 section talked it out of it.
 *
 * ── AND WHY NO TOOL COULD REACH IT (v2.3.2133) ──
 * draw-trailing-sleeve.mjs already carries an `o.back` sign, so pointing it at
 * the FRONT edge is a one-character change. It writes exactly zero pixels on
 * every frame. The reason is its invariant (b): it excludes any COLUMN with
 * body above the shirt's topmost row, the cheap head test it was given after
 * v2.3.1986 painted a shirt-coloured blob on the character's FACE. On an east
 * profile the head sits directly above the chest, so that test deletes the
 * whole front region -- 54 px down to 4 on frame 10, 217 down to 64 on frame 3
 * -- and the limb never reaches the 12-pixel floor. The invariant that keeps
 * the tool off the face is the same one that forbids this fix.
 *
 * tools/gear/draw-crossing-sleeve.mjs unblocks that with v2.3.2093's per-pixel
 * head CEILING (strictly safer than a column test, and far safer than the
 * nothing v2.3.1986 had) and then applies draw-trailing-sleeve's rule to the
 * limb in front. It is NOT shipped and the sheet is unchanged: it reads right
 * on frames 0-10 and puts a hard white bar down the arm on 11-13, where the
 * uncovered region merges arm with chest and no axis derived from it -- PCA or
 * distal, both tried and both recorded in that file -- is the arm's. That is
 * v2.3.2016's wall again, and its conclusion still stands: this needs the
 * arm's own axis, or seven frames drawn by hand.
 *
 * ── v2.3.2016: A GENERATED SLEEVE WAS TRIED AND REJECTED ──
 * The diagnosis above is right, and the fix it asks for — extend the shoulder
 * over the trailing arm — was built and measured before being thrown away.
 * Recorded so the next session does not rebuild it.
 *
 * The method, which is sound as far as it goes: breadth-first distance from
 * the shirt's own edge ALONG the arm (not a row band — the trailing arm runs
 * diagonally), fill to depth 4-5, black hem at full depth. It satisfied both
 * invariants this file demands, and satisfied them by CONSTRUCTION rather
 * than by luck: never writing above the shirt's top row, and never on a
 * column with body pixels above that row. That second test is what separates
 * arm from head without a flood fill — on frame 1 the trailing arm occupies
 * columns 44-56 and not one has skin above row 44, while every column the
 * head sits in does. It never went near the face. It also left the body's own
 * black keyline pixels alone (10 of the 42 it covered on frame 1), so it did
 * not strip the arm's outline the way the pine bow lost its ink (v2.3.2010).
 *
 * It still has to be thrown away, because IT LOOKS WORSE THAN THE BUG. At
 * depth 4 and depth 5, and with the preserved ink limited to the true outer
 * silhouette, all three variants read as a ragged, spiky left edge on the
 * shirt with detached white pips out on the arm's antialiased fringe — not as
 * a sleeve. The reason is geometric and is the thing to beat: a sleeve on an
 * arm swung back-and-down is a band running PERPENDICULAR TO THE ARM'S AXIS,
 * and every cheap rule available here (dilate the shirt leftward, grow a
 * geodesic cap from the shoulder) produces a band that is roughly vertical
 * instead. On the good frames the arm is near-vertical, which is exactly why
 * the artist's own sleeve reads correctly there and why a rule tuned on those
 * frames flatters itself.
 *
 * So whatever closes this needs the arm's AXIS, not just its silhouette — or
 * it needs to be drawn by hand, which for seven frames on one facing is
 * probably the cheaper honest answer. Until then the bare arm stays: it is a
 * coherent silhouette, and the generated sleeve is not.
 *
 * ── WHAT THE v2.3.1986 SESSION BELIEVED (kept for the record) ──
 * v2.3.1986 diagnosed it. The tee's coverage is PROPORTIONALLY constant across
 * the cycle (0.63-0.71 of the torso band, both halves), so the shirt was never
 * shrinking and the near arm crossing the chest for half the stride is correct
 * animation. What was missing was the SLEEVE: on frames 8-11 the arm tucks in
 * front of the torso and the artist's deliberate cut-out took the sleeve with
 * it, leaving the arm bare from the shoulder JOINT down — the character read
 * as wearing a tank top for those four frames.
 * So in this strip, the figures whose near arm tucks in front of the torso
 * still show that arm bare to the shoulder joint. That is the open bug. When
 * it is fixed, they should show white at the shoulder — and the fix must
 * assert it never touches the head, which is exactly what v2.3.1986 did not do.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Jogger', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  /* A plain white tee and nothing over it — the loadout the report is about. */
  const armed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (!S) return null;
    /* v2.3.2078: this used to write `S._equip` (no such field anywhere in
       src/) and equip through `window.__btGear.setEquip` (no such handle —
       the real one is `window.__btGearSet(slot, id)`, gearCatalog.js).  The
       try/catch swallowed the TypeError, so the character wore whatever it
       spawned in and the "loadout" line below reported an empty object the
       test had just created itself. */
    try {
      if (window.__btGearSet) { window.__btGearSet('shirt', 'tshirt'); window.__btGearSet('chest', 'none'); }
    } catch (e) { /* fall through to the wardrobe read below */ }
    /* HAIR ON, and it is not a detail: the hair is a separate trait sprite
       composited over the run, so a bald probe cannot see anything the hair
       does wrong. The v2.3.1990 hunt for a reported "blob on the face" in all
       jog directions ran bald first and found nothing, which is exactly the
       false negative this line removes. Afro because it is the tallest and
       widest of the eight and the one the owner tests with. */
    try { if (window.__btSetHair) window.__btSetHair('afro'); } catch (e) { /* bald is still a run */ }
    return { shirt: S.myShirt || null,
      equip: (window.__btWardrobe ? window.__btWardrobe() : null),
      gearVer: (window.__btGearVersion ? window.__btGearVersion() : null) };
  });
  rec.ok('the client is up and reports its loadout (guard)', armed !== null, armed);
  rec.ok('the tee is really on the character, through the real gear store',
    !!(armed && armed.equip && armed.equip.gearShirt === 'tshirt'),
    armed && armed.equip);
  rec.ok('the client hands back the gear cache-bust it is asking for',
    !!(armed && armed.gearVer), armed && armed.gearVer);

  /* ── THE MEASUREMENT ──
     Composite the body sheet and the tee sheet the way the game does (the tee
     draws straight over the body, 1:1, same frame size) and count bare skin
     where the trailing sleeve belongs.  Fetched through the CLIENT's own gear
     URL — ?v=GEAR_VERSION included — so a re-baked sheet that shipped without
     its cache bust fails here instead of in play. */
  const measure = await P.page.evaluate(async (o) => {
    const load = async (src) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      const ok = await new Promise((r) => { i.onload = () => r(true); i.onerror = () => r(false); i.src = src; });
      if (!ok) return null;
      const c = document.createElement('canvas');
      c.width = i.width; c.height = i.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(i, 0, 0);
      return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
    };
    const out = {};
    for (const dir of Object.keys(o.dirs)) {
      const back = o.dirs[dir];
      const B = await load(`/sprites/player/jog-${dir}.png`);
      const S = await load(`/sprites/gear/shirt/tshirt/jog-${dir}.png?v=${o.gearVer}`);
      if (!B || !S) { out[dir] = { error: 'sheet did not load', body: !!B, shirt: !!S }; continue; }
      if (B.w !== S.w || B.h !== S.h) { out[dir] = { error: `size ${B.w}x${B.h} vs ${S.w}x${S.h}` }; continue; }
      const W = B.w, F = B.h, nF = Math.round(W / F);
      const per = [];
      let shirtInBand = 0, overhang = 0;
      for (let f = 0; f < nF; f++) {
        const I = (x, y) => (y * W + f * F + x) * 4;
        const isShirt = (x, y) => S.d[I(x, y) + 3] > 24;
        const isBody = (x, y) => B.d[I(x, y) + 3] > 24;
        let top = F;
        const edge = new Int32Array(F).fill(-1);
        for (let y = 0; y < F; y++) {
          let e = -1;
          for (let x = 0; x < F; x++) if (isShirt(x, y)) { if (e < 0 || (back < 0 ? x < e : x > e)) e = x; }
          edge[y] = e;
          if (e >= 0 && y < top) top = y;
        }
        if (top === F) { per.push(0); continue; }
        const headCol = new Uint8Array(F);
        for (let x = 0; x < F; x++) for (let y = 0; y < top; y++) if (isBody(x, y)) { headCol[x] = 1; break; }
        let bare = 0;
        /* two controls, tallied over the WHOLE shoulder band rather than just
           its trailing half.  shirtInBand closes the hole that would otherwise
           make every gate below pass on a sheet that failed to load: with no
           shirt pixels anywhere there is nothing to be uncovered by, and bare
           comes out 0.  overhang is the property that separates this fix from
           v2.3.2016's — the sleeve is written at the BODY's own alpha, so the
           shirt must never cover a pixel where the body is transparent, and the
           character's silhouette cannot have grown.  0 on the artist's sheet
           and 0 after the re-bake. */
        for (let y = top; y <= Math.min(F - 1, top + 7); y++) {
          for (let x = 0; x < F; x++) {
            if (!isShirt(x, y)) continue;
            shirtInBand++;
            if (!isBody(x, y)) overhang++;
          }
        }
        for (let y = top; y <= Math.min(F - 1, top + 7); y++) {
          const e = edge[y];
          if (e < 0) continue;
          for (let x = 0; x < F; x++) {
            if (back < 0 ? x >= e : x <= e) continue;
            if (headCol[x] || !isBody(x, y)) continue;
            const i = I(x, y);
            if (isShirt(x, y)) continue;
            const lum = 0.299 * B.d[i] + 0.587 * B.d[i + 1] + 0.114 * B.d[i + 2];
            if (lum < 70) continue;                    /* the body's own keyline */
            if (B.d[i + 1] > B.d[i]) continue;         /* trousers */
            bare++;
          }
        }
        per.push(bare);
      }
      const cyc = per.slice(0, 14);
      out[dir] = { per: cyc, total: cyc.reduce((a, b) => a + b, 0), worst: Math.max(...cyc),
        shirtInBand, overhang };
    }
    return out;
  }, { gearVer: (armed && armed.gearVer) || '2.3.2066', dirs: { east: -1, northeast: -1, southwest: 1, north: -1, south: -1 } });

  const east = measure.east || {};
  rec.ok('both jog-east sheets loaded through the client\'s own gear URL', !east.error, east.error || 'ok');

  /* The gate.  176 before the v2.3.2066 re-bake; 19 after, all but 6 of it on
     frame 3's bicep below the hem.  40 leaves room for a re-seal moving a
     pixel or two and still fails hard if the sleeve ever comes off again. */
  rec.ok('the trailing arm is not bare at the shoulder on jog-east (was 176 px over the cycle)',
    east.total !== undefined && east.total <= 40, { total: east.total, perFrame: east.per });

  /* No single frame may go back to reading as a tank top.  Worst before was
     frame 3 at 39; worst after is the same frame at 13. */
  rec.ok('no single jog-east frame carries a bare shoulder (worst was 39 px, on frame 3)',
    east.worst !== undefined && east.worst <= 20, { worst: east.worst, perFrame: east.per });

  /* Control 1: there IS a shirt on the wire.  Without this both gates above
     also pass on a sheet that failed to load — nothing to be uncovered by. */
  rec.ok('there is a tee in the shoulder band at all (guard against an empty sheet)',
    east.shirtInBand > 1000, { shirtInBand: east.shirtInBand });

  /* Control 2, and the one that says HOW the sleeve was drawn: it is written at
     the body's own alpha, so the tee must never cover a transparent body pixel.
     The character's silhouette is what it was.  This is exactly the property
     v2.3.2016's fill lacked, which is why it grew pips on the arm's fringe. */
  rec.ok('the sleeve never grew the character — no tee pixel over a transparent body',
    east.overhang === 0, { overhang: east.overhang });

  /* An AUDIT, not a gate — see the header.  On a three-quarter view this window
     also catches the raised fist, which a tee is supposed to leave bare, so a
     number here is a starting point for a look, not a verdict. */
  const audit = {};
  for (const d of ['northeast', 'southwest', 'north', 'south']) audit[d] = measure[d] && measure[d].total;
  rec.ok('the other jog facings are measured, and reported rather than gated (audit)',
    Object.values(audit).every((v) => typeof v === 'number'), audit);

  /* Run in EVERY direction and photograph each stride. The canvas is
     camera-centred on the player, so the crop is the middle of the play area.
     All four because the owner's follow-up on the v2.3.1986 regression was
     "Looks like it's all jog directions" — a probe that only ever looks east
     cannot answer that, and answering it was what showed the shirt sheets were
     clean and sent the hunt somewhere else. */
  const DIRS = [['d', 'east'], ['a', 'west'], ['s', 'south'], ['w', 'north']];
  const shots = [];
  for (const [key] of DIRS) {
    await P.page.keyboard.down(key);
    for (let i = 0; i < 8; i++) {
      await P.page.waitForTimeout(110);
      const b = await P.page.evaluate(() => {
        const c = document.querySelector('canvas');
        const r = c.getBoundingClientRect();
        return { x: Math.round(r.x + r.width / 2 - 32), y: Math.round(r.y + r.height / 2 - 62), width: 64, height: 78 };
      });
      shots.push(await P.page.screenshot({ clip: b }));
    }
    await P.page.keyboard.up(key);
    await P.page.waitForTimeout(200);
  }

  rec.ok(`photographed a stride in all ${DIRS.length} directions`, shots.length === DIRS.length * 8,
    { shots: shots.length });

  /* Stitched into one strip so a human can compare the stride at a glance. */
  const strip = await P.page.evaluate(async (pngs) => {
    const imgs = await Promise.all(pngs.map((b64) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null);
      im.src = 'data:image/png;base64,' + b64;
    })));
    const ok = imgs.filter(Boolean);
    if (!ok.length) return null;
    const S = 6;
    const cv = document.createElement('canvas');
    cv.width = ok.length * ok[0].width * S; cv.height = ok[0].height * S;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#14202a'; g.fillRect(0, 0, cv.width, cv.height);
    ok.forEach((im, i) => g.drawImage(im, i * im.width * S, 0, im.width * S, im.height * S));
    return cv.toDataURL('image/png');
  }, shots.map((b) => b.toString('base64')));

  if (strip) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(H.REPO + '/tools/qa/mp/.last-shirtarm.png',
      Buffer.from(strip.split(',')[1], 'base64'));
  }
  rec.ok('a stride strip was captured to look at', !!strip, { shots: shots.length });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
