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

/* ═══ v2.3.2473: A BOW NEEDS SOMETHING ON ITS LINE BEFORE IT WILL FIRE ═══
 * monsterCombat's sight gate looses an arrow only when a ray from the grip
 * along the aim crosses a live hit circle (owner, backlog §2.5).  Two things
 * in this file run straight into that: it measures the bow's ordinary BEAT by
 * holding the attack and timing the gaps between shots -- which over an empty
 * sky is now zero shots and no beat -- and it casts the special through
 * _gameFns, which for a bow with an empty line is QUEUED rather than launched.
 * Neither is a regression in what this file is about; both are the gate doing
 * its job to a fixture written before it existed.
 *
 * So the bow rows stand a target a long way down the aim they already use.
 * FAR (620px, inside the 675px plant cap) for two reasons: the arrows have to
 * stay in the air long enough for the 8ms poll above to see them, and a
 * monster close enough to stop the volley on arrival would be measuring impact
 * rather than cadence.
 *
 * AND IT MAKES THE PRESS ROWS MEAN SOMETHING FOR THE FIRST TIME.  "No ordinary
 * shot leads the special" was unfalsifiable for the bow over an empty sky
 * before the gate existed either -- there were no ordinary shots to lead with,
 * for a different reason.  Now the loop genuinely could fire one and is held
 * off by the grace, which is the claim.
 *
 * THE MAGIC ROWS ARE LEFT EXACTLY AS THEY WERE.  The staff is not gated -- its
 * bolts splash and home, and no part of the owner's ask is about magic -- so a
 * monster in front of them would change what the orb-spacing assertions
 * measure for no reason at all.
 */
const seedBowTarget = (P, on) => P.page.evaluate((a) => {
  const S = window._gameState.current, F = window._gameFns || {};
  if (!a.on) { S.monsters = []; S.lockedTarget = null; return { cleared: true }; }
  S._serverMonsters = false;
  const m = F.createMonster('solo-line', 'fodder', 2,
    S.player.x + Math.cos(a.ang) * a.d, S.player.y + Math.sin(a.ang) * a.d, null);
  m.alive = true; m.curHp = m.maxHp = 9000000; m.spd = 0; m.vx = 0; m.vy = 0; m.dmg = 0;
  m.renderX = m.x; m.renderY = m.y;
  S.monsters = [m];
  S.lockedTarget = null;      /* a bow acquires nothing by itself -- the aim stays the fixture's */
  return { mx: Math.round(m.x), my: Math.round(m.y) };
}, { on: !!on, ang: 0.4, d: 620 });

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
    /* v2.3.2473: a target on the bow's line; nothing at all for the staff. */
    const _tgtBeat = await seedBowTarget(P, w.slot === 'ranged');
    console.log(`    ${w.key} beat target: ${JSON.stringify(_tgtBeat)}`);

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
    /* v2.3.2473: a target on the bow's line; nothing at all for the staff. */
    const _tgtPress = await seedBowTarget(P, w.slot === 'ranged');
    console.log(`    ${w.key} press target: ${JSON.stringify(_tgtPress)}`);
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

  /* ══════════ AND THE SAME PRESS, ON THE SPECIAL BUTTON (v2.3.2542) ══════════
     Owner, after playing the merged build: "Move the Special attack button to
     orbit the RIGHT joystick, not the left ... Make sure a tap on the Special
     button does not also fire the attack disc beneath it."

     THIS IS THE STRONGEST FORM OF THAT CLAIM, which is why it is here rather
     than only in mp-rbutton: the surrounding file counts PROJECTILES, so "the
     disc also fired" is a thing that can be seen leaving the bow rather than
     inferred from a flag.  The whole hazard of the move is that this button now
     sits on the attack side, over `[data-joyzone="R"]`, next to a disc that
     fires on touchDOWN -- so a leak would put an ordinary shot in the air
     alongside the special, which is exactly the defect this file exists for,
     arriving through a new door.

     Driven with page.touchscreen at the button's real coordinates: a dispatched
     event would prove nothing here, because it never hit-tests and so could not
     distinguish a button that swallows its touch from one that does not
     (TRAPS §67).  And it needs no synthetic flick -- the button IS the second
     trigger, so for once the real gesture is fully reproducible. */
  const btnRows = [];
  for (const w of [
    { key: 'bow',   type: 'bow',   stash: 'rangedWeapon', slot: 'ranged', own: 1 },
    { key: 'magic', type: 'staff', stash: 'staffWeapon',  slot: 'staff',  own: 3 },
  ]) {
    await H.equipWeapon(P, w.type, w.stash, w.slot);
    await P.page.waitForTimeout(900);
    const _tgtBtn = await seedBowTarget(P, w.slot === 'ranged');
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S._aimAngle = 0.4; S._lastAimAngle = 0.4; S._facingAngle = 0.4; S._shieldUp = false;
      S.swingTimer = 0; S._lastSwipe = 0; S.autoAttack = false; S._atkPressAt = 0;
      if (S.rpg) { S.rpg.mana = S.rpg.maxMana; }
      /* specialButtonLive wants a fight ON.  The bow's target sits 620px out --
         far outside the 220px perimeter, deliberately, so the arrows stay in
         the air long enough to be counted -- and a bow holds no automatic lock,
         so the honest way to say "a fight is happening" here is the one the
         predicate already offers: damage taken a moment ago. */
      S.lastDamageTaken = Date.now();
    });
    await P.page.waitForTimeout(400);
    const box = await P.page.evaluate(() => {
      const el = document.querySelector('[data-special]');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const disc = document.querySelector('.bt-rjoy-base');
      const d = disc ? disc.getBoundingClientRect() : null;
      return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2),
        shown: cs.display !== 'none' && Number(cs.opacity) > 0.05,
        onDisc: !!(d && b.right > d.left && b.left < d.right && b.bottom > d.top && b.top < d.bottom) };
    });
    await watchArrows(P);
    if (box && box.shown) await P.page.touchscreen.tap(box.x, box.y);
    await P.page.waitForTimeout(1100);
    const after = await P.page.evaluate(() => {
      const S = window._gameState.current;
      return { auto: !!S.autoAttack, lastSwipe: S._lastSwipe || 0 };
    });
    await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._atkPressAt = 0; });
    const seen = await readArrows(P);
    const sp = seen.filter((a) => a.special), no = seen.filter((a) => !a.special);
    btnRows.push({ ...w, box, after, tgt: _tgtBtn, special: sp.length, normal: no.length,
      noAt: no.map((a) => a.at) });
  }

  console.log('\n    ── a REAL tap on the Special BUTTON ──');
  for (const r of btnRows) {
    console.log(`    ${r.key.padEnd(6)} special ${r.special}/${r.own}   ordinary shots ${r.normal} at `
      + `${JSON.stringify(r.noAt)}ms   [button ${JSON.stringify(r.box)}, autoAttack after ${r.after.auto}]`);
  }
  console.log('');

  for (const r of btnRows) {
    rec.ok(`${r.key} button: the Special button is on screen to be tapped (guard)`,
      !!(r.box && r.box.shown), r.box);
    rec.ok(`${r.key} button: ...and it does not sit on top of the attack disc (guard)`,
      !!(r.box && r.box.onDisc === false), r.box);
    rec.ok(`${r.key} button: a real tap on it casts the special`, r.special === r.own, r);
    /* THE ASK: the disc beneath must not have fired.  Two independent tells --
       no ordinary projectile left the bow, and the press did not leave the
       auto-attack held down the way a press on the disc or the zone would. */
    rec.ok(`${r.key} button: ...and the attack disc beneath it fires NOTHING (${r.normal} ordinary shot(s))`,
      r.normal === 0, r);
    rec.ok(`${r.key} button: ...and the press is not left holding the attack either`,
      r.after.auto === false, r.after);
  }

  await P.ctx.close().catch(() => {});
}
