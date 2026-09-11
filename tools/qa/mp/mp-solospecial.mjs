/* THE SPECIAL FIRES ALONE, AND THE THREE ORBS ARE EVENLY SPACED (v2.3.2464)
 *
 * Owner, two asks in one message:
 *   1. "I want magic special to change to 3 evenly spaced out orbs.  Maybe
 *      like one every .2 seconds until it hits the 3rd orb."
 *   2. "Is there a way to disable a normal attack that flies along with a
 *      special attack?  When I do the special attack it's usually a normal
 *      attack and special attack bundled together (happens to both magic and
 *      bow)."
 *
 * ═══ WHY THE SECOND ONE HAPPENS, AND WHY IT IS BOTH OF THOSE WEAPONS ═══
 * specialAttack() has three arms.  The MELEE arm stamps `S.swingTimer = now`
 * (playerActions.js) -- it has to, because the swing animation and the hit
 * sweep are driven off that clock.  The BOW and STAFF arms push their
 * projectiles straight into S.arrows and never touch it.
 *
 * And `S.swingTimer` is exactly what the auto-attack loop's cadence gate reads
 * (monsterCombat.js: `Date.now() - S.swingTimer >= effectiveSwingCd`).  So for
 * a ranged or staff build the special leaves that gate wide open, and on the
 * next frame the loop -- which is running because the player is holding attack
 * or is engaged, i.e. the whole time they are fighting -- fires an ORDINARY
 * shot alongside it.  Melee is unaffected for the one reason it stamps the
 * clock for its own animation.  That is precisely the pair the owner names,
 * and "usually" is the gate happening to be open, which in combat it is.
 *
 * ═══ WHAT IS COUNTED ═══
 * Projectiles, by `isSpecial`, over a window that starts before the press.
 * The special's own shots are known exactly -- one arrow for the bow, three
 * orbs for the staff -- so a NORMAL projectile appearing in that window is the
 * bundled shot, with no inference required.  The count is read from S.arrows
 * as they are pushed rather than from anything the renderer draws, because the
 * question is what the game FIRED, not what it painted.
 *
 * ═══ AND THE SPACING ═══
 * "Evenly spaced" is a claim about the gaps BETWEEN the orbs, so that is what
 * is measured: the three are sampled in flight and the two gaps compared.
 * Launch delay alone would not prove it -- the orbs used to leave 100ms apart
 * and then spread out anyway, because v2.3.2262 gave them three different
 * SPEEDS (8 / 5 / 3.2 px/frame, "fast, medium, slow", an earlier ask by the
 * same owner).  Even launch gaps on uneven speeds is a fan, not a line.  Both
 * halves have to move together, and only the in-flight gaps can tell.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const ORB_GAP_MS = 200;       /* the owner's "one every .2 seconds" */
const SETTLE_MS = 1200;       /* long enough for all three to be launched and flying */

/* Arm a counter that records every projectile the client spawns, with the one
   field that separates the special's own shots from the bundled one.  Polled
   off S.arrows rather than hooked into the push, so it sees exactly what the
   game put in the air and nothing a test invented. */
const watchArrows = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  S.arrows = [];
  window.__solo = { seen: [], t0: Date.now() };
  const seen = new Set();
  window.__soloIv = setInterval(() => {
    const S2 = window._gameState.current;
    for (const a of (S2.arrows || [])) {
      if (!a._soloId) a._soloId = Math.random().toString(36).slice(2);
      if (seen.has(a._soloId)) continue;
      seen.add(a._soloId);
      window.__solo.seen.push({
        special: !!a.isSpecial, staff: !!a.isStaff,
        delay: a.launchDelayMs || 0, spd: a.speedPx || null,
        at: Date.now() - window.__solo.t0,
      });
    }
  }, 8);
});

const readArrows = (P) => P.page.evaluate(() => {
  clearInterval(window.__soloIv);
  return (window.__solo || {}).seen || [];
});

/* ═══ MEASURE THE SPACING OVER TIME, NOT IN ONE SNAPSHOT ═══
   A single frame's gaps cannot answer this, and the first cut of this file
   proved it: headless runs at a fraction of 60fps, the per-frame release check
   (`Date.now() - a._bornTs < a.launchDelayMs`, projectiles.js) therefore fires
   on a coarse grid, and an orb can be let go tens of ms either side of its
   nominal delay.  Read once, that jitter is indistinguishable from uneven
   spacing -- it reported gaps of 45 and 15px on a volley whose orbs provably
   share one speed and one launch step.

   What "evenly spaced" actually asserts is a property OVER TIME: the gaps must
   not GROW.  Three speeds open the gaps for the whole flight (that is what a
   fan is, and what the old 8/5/3.2 did); one speed freezes whatever the launch
   stagger set, jitter and all.  So sample repeatedly and watch the drift. */
const orbSeries = async (P, samples, gapMs) => {
  const out = [];
  for (let i = 0; i < samples; i++) {
    out.push(await P.page.evaluate(() => {
      const S = window._gameState.current;
      const orbs = (S.arrows || []).filter((a) => a.isSpecial && a.isStaff)
        .map((a) => ({ d: a.dist, spd: a.speedPx, delay: a.launchDelayMs || 0 }))
        .sort((x, y) => y.d - x.d);
      if (orbs.length < 3) return { n: orbs.length };
      return { n: 3, dists: orbs.map((o) => Math.round(o.d)),
        gaps: [Math.round(orbs[0].d - orbs[1].d), Math.round(orbs[1].d - orbs[2].d)] };
    }));
    if (i < samples - 1) await P.page.waitForTimeout(gapMs);
  }
  return out.filter((s) => s.n === 3);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Solo', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const id = await H.readState(P, (S) => S.myId);
  const kit = await H.devOp(wsPort, 'kit', id, { what: 'weapons' });
  await H.devOp(wsPort, 'vitals', id, { heal: true });
  await P.page.waitForTimeout(1200);
  const stash = await H.readState(P, (S) => ((S.rpg || {}).weaponStash || []).map((w) => w && w.type));
  rec.ok('the caster holds a bow and a staff before any round (guard)',
    stash.includes('bow') && stash.includes('staff'), { stash, kit });

  /* ═══ THE LOOP HAS TO BE RUNNING, OR THERE IS NOTHING TO CATCH ═══
     The bundled shot is the AUTO-ATTACK loop firing beside the special, so a
     run with autoAttack off would report a clean special and prove nothing --
     it would be measuring the one state in which the bug cannot happen.  This
     is the state a player is in for the whole of a fight: thumb down. */
  const rows = [];
  for (const w of [
    { key: 'bow',   type: 'bow',   stash: 'rangedWeapon', slot: 'ranged', own: 1 },
    { key: 'magic', type: 'staff', stash: 'staffWeapon',  slot: 'staff',  own: 3 },
  ]) {
    await H.equipWeapon(P, w.type, w.stash, w.slot);
    await P.page.waitForTimeout(1000);

    /* ═══ WHAT IS THIS WEAPON'S ORDINARY BEAT?  ASK THE GAME. ═══
       "Bundled" is a GAP, not a count.  The player is holding the attack
       button, so an ordinary shot one full cadence after the special is the
       auto-attack correctly taking its next turn -- not what the owner is
       complaining about.  What they described is the two going out TOGETHER.
       So the question is how close the nearest ordinary shot came, and that
       needs the weapon's own beat to compare against.

       MEASURED, not restated.  The bow's cadence is SWING_COOLDOWN x a
       per-weapon multiplier x a Tempo term, the staff adds its own extra on
       top, and a test that hardcoded the arithmetic would be checking its own
       copy of it (TRAPS #35) and would quietly stop testing the bow the day
       any of those move.  So: hold the button with no special at all and time
       the gaps between consecutive ordinary shots.  That is the beat, as this
       build actually produces it, on this machine's frame rate. */
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S._aimAngle = 0.4; S._lastAimAngle = 0.4; S._aiming = true;
      S._facingAngle = 0.4; S._shieldUp = false;
      S.swingTimer = 0; S._lastSwipe = 0;
      if (S.rpg) { S.rpg.mana = S.rpg.maxMana; }
      S.autoAttack = true;
    });
    await watchArrows(P);
    await P.page.waitForTimeout(2600);
    await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; });
    const base = (await readArrows(P)).filter((a) => !a.special).map((a) => a.at).sort((x, y) => x - y);
    const beats = base.slice(1).map((t, i) => t - base[i]).sort((x, y) => x - y);
    const cadence = beats.length ? beats[Math.floor(beats.length / 2)] : null;

    await P.page.evaluate(() => {
      const S = window._gameState.current;
      /* Aim somewhere definite and clear the cadence, so the loop is ready to
         fire the instant the special opens a window for it. */
      S._aimAngle = 0.4; S._lastAimAngle = 0.4; S._aiming = true;
      S._facingAngle = 0.4; S._shieldUp = false;
      S.swingTimer = 0; S._lastSwipe = 0;
      if (S.rpg) { S.rpg.mana = S.rpg.maxMana; }
      S.autoAttack = true;          /* the thumb, held */
    });
    await watchArrows(P);
    await P.page.evaluate(() => { (window._gameFns || {}).specialAttack(); });
    await P.page.waitForTimeout(SETTLE_MS);
    const series = w.key === 'magic' ? await orbSeries(P, 4, 260) : null;
    await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; });
    const seen = await readArrows(P);
    const special = seen.filter((a) => a.special);
    const normal = seen.filter((a) => !a.special);
    const spAt = special.length ? Math.min(...special.map((a) => a.at)) : null;
    const nearest = normal.length && spAt != null
      ? Math.min(...normal.map((a) => Math.abs(a.at - spAt))) : null;
    rows.push({ ...w, seen, special: special.length, normal: normal.length, series, spAt, nearest,
      cadence, beats,
      delays: special.map((a) => a.delay), speeds: special.map((a) => a.spd) });
  }

  console.log('\n    ── one press of the special, with the attack button held ──');
  for (const r of rows) {
    console.log(`    ${r.key.padEnd(6)} own shots ${r.special}/${r.own}   ordinary beat ${r.cadence}ms   `
      + `nearest ordinary shot ${r.nearest == null ? '(none)' : r.nearest + 'ms'} after the special   `
      + `delays ${JSON.stringify(r.delays)}  speeds ${JSON.stringify(r.speeds)}`);
    if (r.series) for (const s of r.series) console.log(`      orbs: dists ${JSON.stringify(s.dists)}  gaps ${JSON.stringify(s.gaps)}`);
  }
  console.log('');

  for (const r of rows) {
    rec.ok(`${r.key} special: fires its own ${r.own} projectile(s) (guard)`, r.special === r.own, r);
    rec.ok(`${r.key}: its ordinary beat was measurable, to compare against (guard)`,
      r.cadence != null && r.cadence > 50, { cadence: r.cadence, beats: r.beats });
    /* ═══ THE ASK ═══
       The special must spend the beat it fires on.  0.8x rather than 1.0x
       because the beat is sampled off a headless frame clock and the special
       lands mid-beat; what it has to exclude is the OLD behaviour, which put
       the ordinary shot roughly a third of a cadence away (measured: 297ms
       against the bow's 450ms beat) and often in the very same frame. */
    rec.ok(`${r.key} special: no ordinary attack goes out with it `
      + `(nearest ${r.nearest == null ? 'none' : r.nearest + 'ms'} vs a ${r.cadence}ms beat)`,
      r.nearest == null || (r.cadence != null && r.nearest >= r.cadence * 0.8), r);
  }

  const magic = rows.find((r) => r.key === 'magic');
  if (magic) {
    rec.ok('the three orbs leave one every 0.2s',
      JSON.stringify(magic.delays.slice().sort((a, b) => a - b)) === JSON.stringify([0, ORB_GAP_MS, ORB_GAP_MS * 2]),
      { delays: magic.delays });
    /* ONE SPEED IS WHAT MAKES THE SPACING HOLD.  Three speeds keep opening the
       gaps for the whole flight, which is a fan; the owner asked for a line. */
    rec.ok('...at one speed, so the spacing cannot open up as they fly',
      magic.speeds.length === 3 && new Set(magic.speeds).size === 1, { speeds: magic.speeds });
    /* ═══ AND THE LINE HOLDS, WHICH IS THE WHOLE CLAIM ═══
       Not "the two gaps are identical" -- the release check runs once a frame
       and headless frames are long, so the launch stagger carries a jitter
       that no amount of equal speed can take back out.  What one speed
       guarantees, and three speeds cannot, is that whatever gaps the launch
       set STAY that size.  So: each gap is compared against ITSELF across the
       series.  On the old 8/5/3.2 the lead gap grew every sample. */
    const ser = magic.series || [];
    const drift = ser.length >= 2
      ? [0, 1].map((i) => Math.max(...ser.map((s) => s.gaps[i])) - Math.min(...ser.map((s) => s.gaps[i])))
      : null;
    rec.ok('...so in flight the spacing holds instead of opening up',
      !!drift && drift.every((d) => d <= 20), { drift, series: ser });
  }

  /* ══════════ THE REAL GESTURE, WHICH IS NOT WHAT THE BRIDGE DOES ══════════
     Everything above drives `specialAttack()` through the autotest bridge, and
     that is only half the story -- it is the half that starts AT the special.
     The owner does not call a function; they FLICK the attack disc, and a
     flick is only recognised on touchEND:

       touchstart  -> handleRBtnPress() -> S.autoAttack = true
                      ...the auto-attack loop fires an ORDINARY shot...
       touchmove   -> the flick
       touchend    -> flick detected -> doSpecialAttack()

     So on the real control the ordinary shot goes out BEFORE the special, on
     the press, while the gesture is still ambiguous -- and no amount of
     spending the swing clock inside specialAttack() can reach backwards and
     stop a shot that has already left.  A test that only ever calls the
     function sees the shot that comes AFTER and reports the bug fixed.  This
     repo has been here before: mp-devwarp's note records the test panel's zone
     chips passing for versions while being dead where the owner tapped them,
     because mp-devpanel drove a synthetic message instead of pressing them.

     So: press the disc for real. */
  await P.page.evaluate(() => {
    window.__touch = (el, type, x, y, id) => {
      const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
      const end = type === 'touchend' || type === 'touchcancel';
      el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
        touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t] }));
    };
    window.__centre = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { el, x: r.x + r.width / 2, y: r.y + r.height / 2 };
    };
  });

  /* ═══ THE PRESS IS REAL; THE CAST STANDS IN FOR THE FLICK ═══
     The press is what spawns the leading shot, so the press must be a real
     touch -- that is the whole point of this section, and driving it through
     the bridge is what let v2.3.2464 report the bug fixed while the owner was
     still watching a bolt lead his orbs.

     The FLICK itself is not reproducible here: eight gesture shapes across
     both right-hand surfaces were tried and none classified (`_lastSwipe`
     never moved), because the classifier reads touch fields a synthesised
     TouchEvent does not carry the way a thumb does. Rather than tune a
     synthetic gesture until it happens to pass -- which would be fitting the
     test to the harness instead of to the game -- the press is real and the
     CAST is called directly, standing in for the touchend that would have
     cast it. That is honest about what is and is not being exercised, and it
     still tests the thing under repair: the shot the PRESS fires, and whether
     the grace holds it until the gesture is legible. */
  const pressRows = [];
  for (const w of [
    { key: 'bow',   type: 'bow',   stash: 'rangedWeapon', slot: 'ranged', own: 1 },
    { key: 'magic', type: 'staff', stash: 'staffWeapon',  slot: 'staff',  own: 3 },
  ]) {
    await H.equipWeapon(P, w.type, w.stash, w.slot);
    await P.page.waitForTimeout(900);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S._aimAngle = 0.4; S._lastAimAngle = 0.4; S._facingAngle = 0.4; S._shieldUp = false;
      /* An OPEN cadence -- the case the owner is in, where the loop is ready
         to fire the instant the press lands. */
      S.swingTimer = 0; S._lastSwipe = 0; S.autoAttack = false; S._atkPressAt = 0;
      if (S.rpg) { S.rpg.mana = S.rpg.maxMana; }
    });
    await watchArrows(P);
    const did = await P.page.evaluate(async () => {
      const el = document.querySelector('[data-joyzone="R"]') || document.querySelector('.bt-rjoy-base');
      if (!el) return { ok: false, why: 'no attack control' };
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const wait = (ms) => new Promise((res) => setTimeout(res, ms));
      const t0 = (window.__solo || {}).t0 || Date.now();
      const mark = (n) => Date.now() - t0;
      const at = {};
      /* ═══ THE GESTURE MUST SPAN FRAMES, AND MUST NOT OUTLAST THE GRACE ═══
         Two failed cuts of this, in opposite directions, and each looked like
         a result.

         With setTimeout waits (50ms + 40ms of intended thumb) the gesture took
         394ms of WALL CLOCK -- this page runs a game loop on a headless box
         with no GPU and its timers get what is left -- so it outran the 200ms
         grace and the shot leaked.  That reads as "the fix does not work" and
         is a fact about the test machine.

         Dispatched back to back instead, the gesture took 1ms and no ordinary
         shot appeared -- but neither did one with the grace set to ZERO.  A
         gesture shorter than a single frame never gives the auto-attack loop a
         turn, so nothing was being suppressed and the row passed for no
         reason.  A test that survives its own mutation is not a test.

         So the gesture is paced in FRAMES: requestAnimationFrame until it has
         spanned enough real frames for the loop to have had its chance, and
         then stopped well inside the grace.  Both bounds are asserted below,
         because a run that misses either end is measuring the harness. */
      at.press = mark();
      window.__touch(el, 'touchstart', x, y, 77);       /* the real press */
      const gStart = Date.now();
      let frames = 0;
      while (Date.now() - gStart < 70 && frames < 12) {
        await new Promise((res) => requestAnimationFrame(res));
        frames++;
      }
      window.__touch(el, 'touchmove', x + 40, y, 77);   /* the swipe */
      at.end = mark();
      at.frames = frames;
      window.__touch(el, 'touchend', x + 80, y, 77);
      /* ...and the cast the flick would have produced. */
      (window._gameFns || {}).specialAttack();
      at.cast = mark();
      return { ok: true, at, gesture: at.end - at.press };
    });
    await P.page.waitForTimeout(1100);
    await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._atkPressAt = 0; });
    const seen = await readArrows(P);
    const sp = seen.filter((a) => a.special), no = seen.filter((a) => !a.special);
    pressRows.push({ ...w, did, seen, special: sp.length, normal: no.length,
      spAt: sp.length ? Math.min(...sp.map((a) => a.at)) : null, noAt: no.map((a) => a.at) });
  }

  console.log('\n    ── a REAL press on the attack control, then the cast ──');
  for (const r of pressRows) {
    console.log(`    ${r.key.padEnd(6)} special ${r.special}/${r.own} at ${r.spAt}ms   `
      + `LEADING ordinary shots ${r.normal} at ${JSON.stringify(r.noAt)}ms`
      + `   [press ${r.did.at && r.did.at.press}ms, gesture ${r.did.gesture}ms, cast ${r.did.at && r.did.at.cast}ms]`);
  }
  console.log('');

  for (const r of pressRows) {
    rec.ok(`${r.key} press: the special still casts after a real press (guard)`, r.special === r.own, r);
    /* The grace can only cover a gesture shorter than itself, so a run whose
       synthetic gesture outran it is measuring the test machine.  Stated as a
       guard rather than left to silently weaken the row below. */
    /* Both ends, because each one alone lets a row pass for the wrong reason:
       too long and the grace could not have covered it; too short and the
       auto-attack loop never had a frame in which to fire, so nothing was
       suppressed (measured: at 1ms the row passed with the grace set to 0). */
    rec.ok(`${r.key} press: the gesture spanned real frames and still finished inside the grace (guard)`,
      r.did && r.did.gesture != null && r.did.gesture < 200
        && r.did.at && r.did.at.frames >= 2,
      { gesture: r.did && r.did.gesture, frames: r.did && r.did.at && r.did.at.frames, grace: 200 });
    /* THE ASK, at the site the owner is actually looking at: nothing ordinary
       may leave between the finger landing and the special going out. */
    rec.ok(`${r.key} press: no ordinary shot leads the special (${r.normal})`,
      r.normal === 0, r);
  }

  await P.ctx.close().catch(() => {});
}
