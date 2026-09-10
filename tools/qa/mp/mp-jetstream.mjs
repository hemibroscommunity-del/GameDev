/* ═══ THE BOW'S SIGHT STREAM IS BACK, AT THE ARROW'S RANGE (v2.3.2448) ═══
 *
 * Owner: "changing the bow back to the old stream but lengthen it to how far
 * the arrow shoots.  Disable the new jet stream effect."
 *
 * THIS FILE ONCE ASSERTED THE EXACT OPPOSITE, and it is rewritten rather than
 * deleted for the reason mp-aimpath gives about the same line: a test that
 * once claimed the reverse is the clearest record that a MOVE was made, and
 * this line has now moved four times.  In order:
 *
 *   v2.3.2258  off for bow AND staff -- "too much of an advantage";
 *   v2.3.2320  back for the bow, while ATTACKING only;
 *   v2.3.2398  off again, replaced by a jet stream trailing each arrow;
 *   v2.3.2448  the jet stream off, the stream back, and now as long as the
 *              arrow actually flies.
 *
 * WHAT THE FOUR CLAIMS ARE NOW:
 *
 *   1. NO ARROW CARRIES A STREAK and the renderer draws none -- asserted while
 *      a volley is in the air, not on an idle bow, so it cannot pass by the
 *      player simply not shooting;
 *   2. THE STREAM IS DRAWN WHILE FIRING.  Same hard case, opposite verdict to
 *      the block this replaced;
 *   3. AND ONLY WHILE FIRING.  v2.3.2320's gate ("while attacking, not while
 *      aiming") survives the reversal, so releasing the control puts it out;
 *   4. IT REACHES AS FAR AS THE ARROW SHOOTS.  This is the owner's actual ask
 *      and the one number that decides whether it worked.  Measured against a
 *      LIVE ARROW's own range multiplier rather than against a constant this
 *      file also writes down: beam length must equal 675 * that arrow's
 *      _rangeMult, which is the plant cap projectiles.js enforces.  The old
 *      280 px beam fails this by a factor of 2.4.
 *
 * MAGIC STILL GETS NOTHING, as since v2.3.2258 -- the owner has taken a sight
 * aid off magic twice, and a reversal for the bow is exactly the edit that
 * could hand it back by accident.
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
      /* v2.3.2448: the arrow's OWN cap multiplier, so the length claim is made
         against the shot rather than against a second copy of the number. */
      rangeMult: a._rangeMult == null ? null : +a._rangeMult.toFixed(4),
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

    /* ── 1. NOTHING TRAILS THE ARROWS ANY MORE ────────────────────────── */
    rec.ok(`${vp.height}: the renderer reports the jet stream disabled`,
      probed.every((s) => s.probe.enabled === false), probed[0].probe);
    const flying = samples.filter((s) => s.arrows.some((a) => !a.stuck && a.pathX != null));
    rec.ok(`${vp.height}: there are airborne arrows to check (guard)`, flying.length > 0,
      { frames: flying.length, of: samples.length });
    rec.ok(`${vp.height}: no airborne arrow carries a streak`,
      flying.every((s) => s.arrows.every((a) => a.jet == null)),
      flying.find((s) => s.arrows.some((a) => a.jet)) || { checked: flying.length });
    rec.ok(`${vp.height}: ...and the renderer is drawing none at all`,
      probed.every((s) => s.probe.n === 0),
      probed.find((s) => s.probe.n !== 0) || { checked: probed.length });

    /* ── 2. THE STREAM IS DRAWN WHILE FIRING ──────────────────────────── */
    const beamOn = samples.filter((s) => s.beam && s.beam.firing);
    rec.ok(`${vp.height}: the renderer agrees the bow is firing (guard)`, beamOn.length > 2,
      { firingFrames: beamOn.length, of: samples.length });
    rec.ok(`${vp.height}: the sight stream is drawn through the volley`,
      beamOn.length > 0 && beamOn.every((s) => s.beam.visible === true),
      beamOn.find((s) => s.beam.visible !== true) || { checked: beamOn.length });
    rec.ok(`${vp.height}: ...pointing down the aim the shots are taking`,
      beamOn.every((s) => s.beam.angle != null && wrap(s.beam.angle - AIM) < 0.02),
      beamOn.find((s) => s.beam.angle == null || wrap(s.beam.angle - AIM) >= 0.02) || { checked: beamOn.length });

    /* ── 3. IT REACHES AS FAR AS THE ARROW SHOOTS ─────────────────────── */
    /* Against a LIVE arrow's own multiplier -- projectiles.js plants at
       BOW_RANGE_PX * _rangeMult and the renderer draws BOW_RANGE_PX *
       bowRangeMult(rpg), so this compares the two ends of the shared constant.
       NOT against the distance an arrow travels on screen: a phone viewport is
       844 px tall and an arrow plants at the screen EDGE long before its own
       cap, which would measure the window rather than the weapon. */
    const withArrow = samples.find((s) => s.beam && s.beam.len != null
      && s.arrows.some((a) => a.rangeMult != null));
    rec.ok(`${vp.height}: a live arrow published its range multiplier (guard)`, !!withArrow,
      { sample: samples.find((s) => s.arrows.length) || null });
    if (withArrow) {
      const mult = withArrow.arrows.find((a) => a.rangeMult != null).rangeMult;
      const want = 675 * mult;
      rec.ok(`${vp.height}: the stream is exactly the arrow's own reach (${withArrow.beam.len.toFixed(0)} px vs ${want.toFixed(0)} px)`,
        Math.abs(withArrow.beam.len - want) < 0.5, { beam: withArrow.beam.len, want, mult });
      /* The number this replaced, written down so a silent revert is loud:
         280 px was under half the arrow's reach. */
      rec.ok(`${vp.height}: ...which is far past the old 280 px stub`,
        withArrow.beam.len > 600, { len: withArrow.beam.len });
    }
    await shoot(P, out, `${tag}-volley-stream`);

    /* ── 4. AND ONLY WHILE FIRING ─────────────────────────────────────── */
    /* v2.3.2320's gate survives the reversal: aiming is not attacking.  The
       wait clears the BOW_SHOT_MS tail that keeps the line from strobing
       between shots in a volley. */
    await hold(P, false);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S.autoAttack = false; S._bowShotAt = 0; S.arrows = [];
    });
    await P.page.waitForTimeout(700);
    const idle = await snap(P);
    rec.ok(`${vp.height}: releasing the fire control puts the stream out`,
      idle.beam && idle.beam.visible === false && idle.beam.firing === false, idle.beam);
    rec.ok(`${vp.height}: ...and no streak was left behind to linger`,
      idle.probe.n === 0, idle.probe);

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
    rec.ok(`${vp.height}: MAGIC gets no sight stream either — the reversal is bow-only`,
      magicFlew.every((s) => s.beam && s.beam.visible === false),
      magicFlew.find((s) => !s.beam || s.beam.visible !== false) || { checked: magicFlew.length });
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
