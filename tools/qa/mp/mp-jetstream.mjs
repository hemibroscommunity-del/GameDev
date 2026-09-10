/* ═══ THE BOW'S JET STREAM IS THE AIM LINE NOW (v2.3.2398) ═══
 *
 * Owner: "Instead of the aim tool (curvy line) for the bow I want to try to add
 * a jet stream to each arrow. ... so that way the player can use it as a visual
 * guide to aim each successive arrow (like making a line out of it to aim
 * better).  I need just the jet stream effect (should be thin and long) to
 * almost connect each successive arrow."
 *
 * FOUR CLAIMS, and the middle two are the ones with teeth:
 *
 *   1. a flying bow arrow lays a streak, and magic lays none — the owner has
 *      taken a sight aid off magic twice (v2.3.2258, and again by asking for
 *      this one on the bow alone), so it is asserted rather than assumed;
 *   2. THE STREAK LIES ON THE ARROW'S REAL FLIGHT LINE.  This is v2.3.2320's
 *      property ("it points where the ARROW goes") moved to the feature that
 *      does the job now: a guide that disagrees with the shot is worse than no
 *      guide.  Checked against the simulation's OWN frozen launch point, not
 *      against a second copy of the aim ladder;
 *   3. IT OUTLIVES ITS ARROW.  An arrow crosses its range in ~1.4 s; a trail
 *      that died with it could never be sighted along, so this is not polish,
 *      it is the request.  Asserted by deleting every arrow outright and
 *      demanding the streaks stay, hold still, and fade;
 *   4. SUCCESSIVE STREAKS ALMOST CONNECT.  "Almost connect each successive
 *      arrow" is a measurable claim about a distance, and it is the one number
 *      that decides whether the feature works: cadence 450 ms x 480 px/s puts
 *      consecutive arrows ~216 px apart, so a 190 px streak leaves a ~26 px
 *      gap.  Shorten JET_LEN_PX and this goes red — which is the point.
 *
 * AND THE THING IT REPLACED IS DARK.  The sight beam stayed on for the bow
 * while attacking (v2.3.2320); "instead of" means it stops, and the assertion
 * is deliberately made WHILE FIRING so it cannot pass by the player merely not
 * shooting.
 *
 * A CAMERA TOO.  The owner judges this by eye, so the same volley is shot at
 * both iPhone viewports.  BT_JET_SHOT names the run (before/after).
 */
import * as H from './harness.mjs';

const PHONES = [{ width: 390, height: 844 }, { width: 390, height: 664 }];
/* Up and slightly right.  UP because a phone is tall: an arrow plants the
   moment it nears the screen EDGE (projectiles.js), so a horizontal volley on a
   390px-wide viewport dies after about one arrow-pitch and there would be no
   second streak to almost-connect to.  SLIGHTLY, so the angle is not cardinal —
   a cardinal aim passes on the axis-locked fire paths v2.3.2260 fixed. */
const AIM = -Math.PI / 2 + 0.18;

const armBow = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const t = ((F.WOODWORKING_TIERS || {}).pine) || { tierMult: 1 };
  R.rangedWeapon = { type: 'bow', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Bow', tier: 'common' };
  R.activeSlot = 'ranged';
  S.lockedTarget = null;
  S.monsters = [];
  S._serverMonsters = false;
  S.arrows = [];
  S._shieldUp = false;
  return { slot: R.activeSlot, wpn: R.rangedWeapon.type };
});

const armStaff = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const t = ((F.WOODWORKING_TIERS || {}).pine) || { tierMult: 1 };
  R.staffWeapon = { type: 'staff', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Staff', tier: 'common' };
  R.activeSlot = 'staff';
  R.mana = R.maxMana = 500;
  S.lockedTarget = null;
  S.monsters = [];
  S.arrows = [];
  return { slot: R.activeSlot, wpn: R.staffWeapon.type };
});

/* Hold the fire control down along a fixed aim.  Re-stamped every sample
   because monsterCombat and the input layer both write these fields. */
const hold = (P, on) => P.page.evaluate(({ ang, on }) => {
  const S = window._gameState.current;
  S._aimAngle = ang;
  S._lastAimAngle = ang;
  S._aiming = true;
  S.autoAttack = !!on;
  if (!on) S._aiming = false;
  return { aim: S._aimAngle, auto: !!S.autoAttack };
}, { ang: AIM, on });

/* One tick that reads the arrows AND the renderer's streak list together.
   Two reads separated by a wait compare two different frames — the mistake
   mp-aimpath records having made twice (its phantom and grip blocks). */
const snap = (P) => P.page.evaluate(() => new Promise((resolve) => {
  requestAnimationFrame(() => {
   try {
    const S = window._gameState.current;
    const probe = window.__btJetStream ? window.__btJetStream() : null;
    const beam = window.__btSightBeam ? window.__btSightBeam() : null;
    const arrows = (S.arrows || []).map((a) => ({
      pathX: a._pathX == null ? null : +a._pathX.toFixed(2),
      pathY: a._pathY == null ? null : +a._pathY.toFixed(2),
      rx: a._renderX == null ? null : +a._renderX.toFixed(2),
      ry: a._renderY == null ? null : +a._renderY.toFixed(2),
      ang: +a.ang.toFixed(4),
      dist: +a.dist.toFixed(2),
      staff: !!(a.isStaff || a._isStaffProj || a.ice),
      stuck: !!(a.planted || a.planting || a.stuckIn),
      /* THE PAIRING IS EXACT, not matched by proximity: the renderer hangs the
         streak it is feeding on the arrow itself, so this is the same object
         the probe reports and there is no nearest-neighbour guess to get
         wrong. */
      jet: a._jet ? { x: +a._jet.x.toFixed(2), y: +a._jet.y.toFixed(2),
        ang: +a._jet.ang.toFixed(4), len: +a._jet.len.toFixed(2),
        spent: !!a._jet.spent, dead: !!a._jet.dead } : null,
    }));
    resolve({ probe, beam, arrows, px: S.player.x, py: S.player.y });
   } catch (e) {
    /* A SCENARIO MUST NOT TAKE THE PAGE DOWN.  This body runs inside a
       requestAnimationFrame callback, so a throw here is UNCAUGHT: it never
       reaches the promise, the app's own crash handler reloads the page, and
       every later step dies with "Execution context was destroyed" pointing at
       nothing.  That is exactly how a one-line typo in the renderer probe
       (Pixi 7's `worldAlpha`, which Pixi 8 does not have) read as six
       consecutive navigation failures.  Report it instead. */
    resolve({ error: String((e && e.stack) || e) });
   }
  });
}));

const shoot = async (P, out, tag) => {
  try {
    const cdp = await P.page.context().newCDPSession(P.page);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    (await import('node:fs')).writeFileSync(`${out}/${tag}.png`, Buffer.from(shot.data, 'base64'));
    await cdp.detach();
    console.log(`    photo: ${out}/${tag}.png`);
  } catch (e) { console.log('    photo skipped: ' + e); }
};

/* Perpendicular distance from a point to the infinite line through (ax,ay) at
   heading `ang` — how far OFF the arrow's flight line the streak sits. */
const offLine = (ax, ay, ang, px, py) =>
  Math.abs(-Math.sin(ang) * (px - ax) + Math.cos(ang) * (py - ay));

const wrap = (d) => Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));

export async function run({ browser, wsPort, webPort, rec }) {
  const fs = await import('node:fs');
  const out = `${H.REPO}/tools/qa/mp/out/jetstream`;
  fs.mkdirSync(out, { recursive: true });
  const runTag = process.env.BT_JET_SHOT || 'after';

  for (const vp of PHONES) {
    const tag = `${runTag}-${vp.width}x${vp.height}`;
    const P = await H.newPlayer(browser, { name: 'Jet', wsPort, webPort, viewport: vp, touch: true, dpr: 2 });
    await H.enterWorld(P);
    await P.page.waitForTimeout(2200);
    await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
    /* Fold the dash panel, or the camera photographs the inventory: it covers
       the bottom half of the screen, which is where a volley fired UP starts. */
    await H.closeDest(P).catch(() => {});
    await P.page.waitForTimeout(400);

    const armed = await armBow(P);
    rec.ok(`${vp.height}: a pine bow is in hand, no lock, no monsters (guard)`,
      armed.wpn === 'bow' && armed.slot === 'ranged', armed);

    /* ── HOLD THE VOLLEY ──────────────────────────────────────────────── */
    await hold(P, true);
    /* Long enough for three shots at the 450 ms cadence, so there is a line to
       look at rather than one streak. */
    const samples = [];
    for (let i = 0; i < 26; i++) {
      await hold(P, true);
      samples.push(await snap(P));
      /* THE PHOTOGRAPH GOES HERE, INSIDE THE VOLLEY.  Shot after the loop it
         caught an empty sky: the arrows had planted and their streaks faded
         while the assertions above were being computed, and the camera proved
         the feature invisible.  Fourteen samples in is about three shots -- a
         line, which is the thing being judged. */
      if (i === 14) await shoot(P, out, `${tag}-volley`);
      await P.page.waitForTimeout(60);
    }
    const probed = samples.filter((s) => s.probe);
    rec.ok(`${vp.height}: the renderer publishes its jet-stream geometry (guard)`,
      probed.length === samples.length,
      { probed: probed.length, of: samples.length,
        error: (samples.find((x) => x.error) || {}).error || null });
    if (!probed.length) { await P.ctx.close().catch(() => {}); continue; }
    rec.ok(`${vp.height}: the streak texture is on the preload gate, not loaded on first shot`,
      probed.every((s) => s.probe.tex === true), probed[0].probe);

    const fired = samples.filter((s) => s.arrows.length > 0);
    rec.ok(`${vp.height}: holding the attack actually put arrows in the air (guard)`,
      fired.length > 3, { framesWithArrows: fired.length, of: samples.length });

    /* ── 1. A FLYING BOW ARROW LAYS A STREAK ──────────────────────────── */
    const flying = samples.filter((s) => s.arrows.some((a) => !a.stuck && a.pathX != null));
    rec.ok(`${vp.height}: every airborne arrow carries a streak`,
      flying.length > 0 && flying.every((s) =>
        s.arrows.filter((a) => !a.stuck && a.pathX != null && a.dist > 2)
          .every((a) => a.jet && !a.jet.dead)),
      { frames: flying.length, worst: flying.find((s) =>
        s.arrows.some((a) => !a.stuck && a.pathX != null && a.dist > 2 && !a.jet)) || null });

    /* ── 2. AND IT LIES ON THE ARROW'S REAL FLIGHT LINE ───────────────── */
    const geo = [];
    for (const s of samples) {
      for (const a of s.arrows) {
        if (!a.jet || a.stuck || a.pathX == null || a.dist < 40) continue;
        const pathAng = Math.atan2(a.ry - a.pathY, a.rx - a.pathX);
        geo.push({
          dAng: wrap(a.jet.ang - pathAng),
          off: offLine(a.pathX, a.pathY, pathAng, a.jet.x, a.jet.y),
          /* The head sits one arrow-tail-inset behind the drawn arrow, so the
             vapour starts where the shaft ends instead of painting over it. */
          behind: Math.hypot(a.rx - a.jet.x, a.ry - a.jet.y),
          len: a.jet.len,
          travelled: Math.hypot(a.rx - a.pathX, a.ry - a.pathY),
        });
      }
    }
    rec.ok(`${vp.height}: there are mid-flight samples to measure (guard)`, geo.length > 4, { n: geo.length });
    if (geo.length) {
      const worstAng = Math.max(...geo.map((g) => g.dAng));
      const worstOff = Math.max(...geo.map((g) => g.off));
      rec.ok(`${vp.height}: the streak points down the arrow's own path (worst ${worstAng.toFixed(4)} rad)`,
        worstAng < 0.01, { worstAng, n: geo.length });
      rec.ok(`${vp.height}: ...and sits ON that path, not parallel to it (worst ${worstOff.toFixed(2)} px off)`,
        worstOff < 1.0, { worstOff, n: geo.length });
      /* ARROW_PINE.lenPx 52.5 * anchor.x 0.457 = 24.0 px, and it is expressed
         as that product in the renderer so a resized arrow carries it. */
      const behind = geo.map((g) => g.behind);
      rec.ok(`${vp.height}: it starts at the arrow's TAIL, not over its shaft (${Math.min(...behind).toFixed(1)}-${Math.max(...behind).toFixed(1)} px behind)`,
        behind.every((b) => b > 20 && b < 28), { min: Math.min(...behind), max: Math.max(...behind) });
      /* ── 3. THIN AND LONG, AND CAPPED ─────────────────────────────── */
      const cap = probed[0].probe.lenCap;
      rec.ok(`${vp.height}: no streak is longer than the ${cap}px cap`,
        geo.every((g) => g.len <= cap + 0.5), { cap, worst: Math.max(...geo.map((g) => g.len)) });
      const grown = geo.filter((g) => g.travelled > cap + 30);
      rec.ok(`${vp.height}: past ${cap}px of flight it trails at full length rather than spanning the whole shot`,
        grown.length > 0 && grown.every((g) => Math.abs(g.len - cap) < 0.5),
        { n: grown.length, sample: grown[0] || null });
    }

    /* ── 4. SUCCESSIVE STREAKS ALMOST CONNECT ─────────────────────────── */
    /* Projected onto the aim ray from the player, each streak is the interval
       [head - len, head].  The claim is about the GAP between one interval and
       the next, which is the distance the eye has to jump to read them as one
       line. */
    const gapsPerFrame = samples.map((s) => {
      const st = (s.probe && s.probe.streaks) || [];
      if (st.length < 2) return null;
      const ux = Math.cos(AIM), uy = Math.sin(AIM);
      const spans = st.map((k) => {
        const d = (k.x - s.px) * ux + (k.y - s.py) * uy;
        return [d - k.len, d];
      }).sort((p, q) => q[1] - p[1]);      /* furthest first */
      const gaps = [];
      for (let i = 1; i < spans.length; i++) gaps.push(spans[i - 1][0] - spans[i][1]);
      return Math.max(...gaps);
    }).filter((g) => g != null);
    rec.ok(`${vp.height}: a held volley has two or more streaks down the line at once (guard)`,
      gapsPerFrame.length > 2, { frames: gapsPerFrame.length });
    if (gapsPerFrame.length) {
      /* The arithmetic says ~26 px (216 px pitch less a 190 px streak), and a
         trained character fires faster than base so the pitch is tighter still.
         MEASURED, shipped: -22 px at 844, +50 px at 664 — the streaks overlap or
         very nearly touch.  MEASURED, mutated to JET_LEN_PX = 60: 84 px and
         108 px, both red.  The bound is 80: loose enough that a slow sample
         cannot fail it, tight enough that a streak which has stopped reaching
         the arrow behind it does.  Those four numbers are the headroom, written
         down so the next person retuning JET_LEN_PX knows what this costs. */
      const worst = Math.max(...gapsPerFrame);
      rec.ok(`${vp.height}: consecutive streaks ALMOST CONNECT (worst gap ${worst.toFixed(1)} px)`,
        worst < 80, { worst, gaps: gapsPerFrame.map((g) => +g.toFixed(1)) });
    }

    /* ── 5. THE BEAM IT REPLACED IS DARK, WHILE FIRING ────────────────── */
    const beamOn = samples.filter((s) => s.beam && s.beam.firing);
    rec.ok(`${vp.height}: the renderer agrees the bow is firing (guard)`, beamOn.length > 2,
      { firingFrames: beamOn.length, of: samples.length });
    rec.ok(`${vp.height}: the old sight beam stays dark even mid-volley — the arrows draw the line now`,
      beamOn.length > 0 && beamOn.every((s) => s.beam.visible === false),
      beamOn.find((s) => s.beam.visible !== false) || { checked: beamOn.length });

    /* ── 6. IT OUTLIVES ITS ARROW ─────────────────────────────────────── */
    /* Every arrow is deleted outright.  A trail hung off the arrow record (the
       way _updateProjectileTrail hangs _trail) vanishes on this line; the whole
       request is that this one does not. */
    await hold(P, false);
    const killed = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const had = (S.arrows || []).length;
      S.arrows = [];
      S.autoAttack = false;
      return { had };
    });
    rec.ok(`${vp.height}: there were arrows to take away (guard)`, killed.had > 0, killed);
    const after0 = await snap(P);
    rec.ok(`${vp.height}: the streaks survive their arrows being deleted`,
      after0.probe.n > 0 && after0.arrows.length === 0,
      { streaks: after0.probe.n, arrows: after0.arrows.length });
    await P.page.waitForTimeout(220);
    const after1 = await snap(P);
    /* ═══ FOLLOW ONE STREAK, NOT ONE INDEX ═══
       Read as streaks[0] this compared two DIFFERENT streaks: the list compacts
       as they expire, so slot 0 gets younger over time.  It reported a streak
       getting BRIGHTER (0.164 -> 0.316) and the geometry check beside it passed
       on a coincidence -- consecutive arrows all plant at the same screen edge,
       so two different streaks really did share an x, y and length. */
    const sameId = after0.probe.streaks.map((k) => k.id)
      .filter((id) => after1.probe.streaks.some((k) => k.id === id));
    rec.ok(`${vp.height}: a streak from before the arrows died is still listed (guard)`,
      sameId.length > 0, { before: after0.probe.streaks.map((k) => k.id), after: after1.probe.streaks.map((k) => k.id) });
    if (sameId.length) {
      const a0 = after0.probe.streaks.find((k) => k.id === sameId[0]);
      const a1 = after1.probe.streaks.find((k) => k.id === sameId[0]);
      rec.ok(`${vp.height}: ...and hold still where they were laid, rather than drifting`,
        Math.abs(a0.x - a1.x) < 0.01 && Math.abs(a0.y - a1.y) < 0.01
        && Math.abs(a0.len - a1.len) < 0.01, { a0, a1 });
      rec.ok(`${vp.height}: ...fading as they go (${a0.alpha.toFixed(3)} -> ${a1.alpha.toFixed(3)})`,
        a1.alpha < a0.alpha && a1.spent === true, { a0, a1 });
    }
    await shoot(P, out, `${tag}-linger`);
    /* And they do go.  A guide that never cleared would be a permanent smear
       down every line the player has ever fired along. */
    await P.page.waitForTimeout(probed[0].probe.lingerMs + 400);
    const gone = await snap(P);
    rec.ok(`${vp.height}: they clear after the ${probed[0].probe.lingerMs}ms linger, rather than piling up`,
      gone.probe.n === 0, gone.probe);

    /* ── 7. POOLED, NOT ALLOCATED PER FRAME ───────────────────────────── */
    const pooled = probed.map((s) => s.probe.pooled);
    const lit = probed.map((s) => s.probe.sprites);
    /* The pool is a HIGH-WATER MARK across every frame, and a sample only sees
       the frames it lands on -- so it can legitimately sit one above the
       busiest LIT count observed here (measured: 7 pooled, 6 seen lit).  What
       is worth pinning is that it stays small: a volley is a handful of
       streaks, so a pool in the dozens would mean something is minting a sprite
       per shot instead of reusing one. */
    rec.ok(`${vp.height}: the sprite pool stays small — ${Math.max(...pooled)} sprites for ${Math.max(...lit)} lit`,
      Math.max(...pooled) <= 12 && Math.max(...pooled) >= Math.max(...lit),
      { pooled: Math.max(...pooled), lit: Math.max(...lit) });
    rec.ok(`${vp.height}: ...and it never shrinks or churns between frames`,
      pooled.every((p, i) => i === 0 || p >= pooled[i - 1]), { pooled });

    /* ── 8. MAGIC LAYS NOTHING ────────────────────────────────────────── */
    const staffArmed = await armStaff(P);
    rec.ok(`${vp.height}: a pine staff is in hand (guard)`, staffArmed.wpn === 'staff', staffArmed);
    await P.page.waitForTimeout(1500);   /* let the bow's streaks expire first */
    await hold(P, true);
    const magic = [];
    for (let i = 0; i < 14; i++) {
      await hold(P, true);
      magic.push(await snap(P));
      await P.page.waitForTimeout(60);
    }
    await hold(P, false);
    const magicFlew = magic.filter((s) => s.arrows.length > 0);
    rec.ok(`${vp.height}: the staff actually cast (guard)`, magicFlew.length > 2,
      { frames: magicFlew.length, of: magic.length });
    rec.ok(`${vp.height}: MAGIC gets no jet stream — no bolt carries one`,
      magic.every((s) => s.arrows.every((a) => a.jet == null)),
      magic.find((s) => s.arrows.some((a) => a.jet)) || { checked: magic.length });
    rec.ok(`${vp.height}: ...and the renderer is drawing none at all`,
      magicFlew.every((s) => s.probe.n === 0),
      magicFlew.find((s) => s.probe.n !== 0) || { checked: magicFlew.length });

    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S.autoAttack = false; S._aiming = false; S.arrows = [];
    });
    await P.ctx.close().catch(() => {});
  }
}
