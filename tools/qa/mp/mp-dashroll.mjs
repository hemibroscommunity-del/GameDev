/* DOES THE SWORD DASH TUMBLE, AND DOES IT TUMBLE WITHOUT STANDING UP? (v2.3.2462)
 *
 * ── WHAT THIS EXISTS FOR ──
 * Owner: "For sword dash instead of just showing the standing character zoom
 * to the enemy can you play the dodge roll animation until the character
 * reaches the monster?"
 *
 * The dash moves the player by writing x/y directly, exactly as the dodge roll
 * does, so the renderer's isMoving test (which reads vx/vy) never saw it and
 * the body held 'stand' for the whole travel. The fix borrows the roll's pose.
 *
 * ── THE TWO ASSERTIONS THAT ARE THE WHOLE POINT ──
 * The first cut of the fix looked right and was not, in two ways that no
 * screenshot and no "is the pose 'dodge'" check would have caught. Both are
 * asserted here, because both are silent:
 *
 *   1. THE STAND FRAME. public/sprites/player/dodge-*.png is NOT a loop.
 *      playerSprites.js says it outright: "frame 9 IS the stand pose, so the
 *      roll hands back to `stand` without a pop." The first cut ran a modulo
 *      over all nine, so the UPRIGHT STANDING FRAME cycled into the middle of
 *      the dash -- the exact glide the change exists to remove, served by the
 *      code meant to remove it. `pose` reads 'dodge' the entire time it is
 *      happening. Only the FRAME INDEX can tell you.
 *
 *   2. THE ANCHOR. The first cut drove the phase off a free-running
 *      Date.now(), so the tumble opened on whatever frame the wall clock
 *      happened to be on (measured: frame 6 of 9). And the ordinary dash is
 *      SHORTER than one cycle -- an auto-lock sits inside 220px, ~112ms
 *      against a 300ms cycle -- so the player saw an arbitrary mid-tumble
 *      slice and never the crouch that makes it read as a roll.
 *
 * ── AND THE ONE THAT GUARDS THE GAMEPLAY ──
 * The dash borrows the roll's LOOK and must not borrow its i-frames:
 * S._dodgeRoll carries invulnerability (dodge.js) and the damage-dodge test
 * (monsterCombat.js). effectsRenderer feeds the blue afterimage off that same
 * flag, so `__btDodgeTrails().mine` staying 0 through a whole dash is a direct,
 * unambiguous read on "the dash did not become a dodge".
 *
 * ── SAMPLING IS DONE IN-PAGE, DELIBERATELY ──
 * The strip is ~33ms per frame. Polling over the CDP bridge costs 33-45ms a
 * round trip, so it skips indices and would make "frame 8 never appears" a
 * coin flip. The sampler runs inside the page on requestAnimationFrame and
 * returns the whole trace at once.
 *
 *   node tools/qa/mp/run.mjs dashroll
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Dasher', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(600);

  const probeReady = await P.page.evaluate(() =>
    !!(window._pixiRenderer && window._pixiRenderer.playerDisplayRaw
       && window.__btMaybeSwordDash && window.__btIsSolid && window._gameFns));
  rec.ok('the render + dash probes this scenario reads are all present', probeReady);
  if (!probeReady) { await P.ctx.close().catch(() => {}); return; }

  /* ── Fire a dash and sample every rendered frame of it, in-page ── */
  const trace = await P.page.evaluate(async (spot) => {
    const S = window._gameState.current, R = S.rpg;
    S.player.x = spot.x; S.player.y = spot.y;

    /* Find the longest clear lane by asking the game's own collision rather
       than hard-coding a direction: a dash into geometry ends early
       (`if (!_moved) _endDash(true)`) and would cut the trace short. */
    let lane = { a: 0, d: 0 };
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      let d = 0;
      for (; d <= 760; d += 16) {
        const x = S.player.x + Math.cos(a) * d, y = S.player.y + Math.sin(a) * d;
        if (window.__btIsSolid(x - 12, y - 12) || window.__btIsSolid(x + 12, y + 12)) break;
      }
      if (d > lane.d) lane = { a, d };
    }
    /* Stop short of the lane end so the dash ends on ARRIVAL, which is the
       case the owner described, rather than on the ~869ms clock backstop. */
    const gap = Math.max(160, Math.min(300, lane.d - 60));
    const mx = S.player.x + Math.cos(lane.a) * gap;
    const my = S.player.y + Math.sin(lane.a) * gap;

    R.activeSlot = 'melee';
    if (!R.weapon) R.weapon = { name: 'QA Sword', type: 'sword', gearBase: 'ws_iron', quality: 'normal', tierMult: 1 };
    R.stamina = R.maxStamina || 100;
    S._shieldUp = false; S._abilCd = null; S._serverMonsters = false;
    /* statuses:{} is not optional — combat reads m.statuses.freeze every frame
       and a bare stub throws inside the loop's own catch, killing the frame
       before anything this test looks at runs. */
    S.monsters = [{ id: 'qa_dash_1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: mx, y: my, renderX: mx, renderY: my, hp: 9000, curHp: 9000, maxHp: 9000,
      dmg: 0, level: 1, gold: 0, spd: 0, vx: 0, vy: 0, alive: true, statuses: {},
      _hitThisSwing: false, _atkCd: 0, _stunUntil: 0, respawnAt: 0, moveTimer: 0, _stuckArrows: [] }];
    S.lockedTarget = { type: 'monster', id: 'qa_dash_1', ref: S.monsters[0], src: 'tap' };

    const status = window.__btAbilityStatus ? window.__btAbilityStatus('sworddash') : null;
    const fired = window.__btMaybeSwordDash();

    /* Frame count from the ART, not a literal: the bound texture's sheet width
       over one frame width. If the strip is ever re-authored this follows it. */
    const frameCountOf = () => {
      const d = window._pixiRenderer.playerDisplayRaw();
      const t = d && d._spriteBody && d._spriteBody.texture;
      if (!t || !t.baseTexture || !t.frame || !t.frame.width) return 0;
      return Math.max(1, Math.round(t.baseTexture.width / t.frame.width));
    };

    const samples = [];
    let fc = 0;
    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        const d = window._pixiRenderer.playerDisplayRaw();
        const tr = window.__btDodgeTrails ? window.__btDodgeTrails() : null;
        const dashing = !!S._bashDash;
        if (dashing && !fc) fc = frameCountOf();
        samples.push({
          t: Math.round(performance.now() - t0),
          pose: d && d._animPose, dir: d && d._animDir, f: d && d._animFrame,
          dash: dashing, roll: !!S._dodgeRoll,
          trail: tr ? tr.mine : -1, rolling: tr ? !!tr.rolling : false,
        });
        const prev = samples[samples.length - 2];
        const done = performance.now() - t0 > 2000
          || (samples.length > 4 && !dashing && prev && !prev.dash);
        if (done) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { fired, status, gap, lane, samples, fc };
  }, H.TOWN_CLEAN_SPOT);

  rec.ok('the sword dash actually fired', trace.fired === true,
    { fired: trace.fired, status: trace.status, gap: trace.gap });

  const during = trace.samples.filter((s) => s.dash);
  rec.ok('the dash lasted long enough to animate (>=3 rendered frames)',
    during.length >= 3, { during: during.length, total: trace.samples.length });

  /* ── 1. IT TUMBLES ── */
  const rolled = during.filter((s) => s.pose === 'dodge');
  rec.ok('the body plays the ROLL for the whole dash, not a standing glide',
    during.length > 0 && rolled.length === during.length,
    { during: during.length, rolled: rolled.length, poses: [...new Set(during.map((s) => s.pose))] });

  /* ── 2. IT NEVER STANDS UP MID-TUMBLE ──
     The regression guard for the modulo-over-all-9 bug. fc-1 is the authored
     stand handoff; a dash must never show it. */
  const fc = trace.fc || 9;
  const standFrames = during.filter((s) => s.f === fc - 1);
  rec.ok(`the upright stand frame (index ${fc - 1} of ${fc}) never appears mid-dash`,
    standFrames.length === 0,
    { hits: standFrames.length, frames: during.map((s) => s.f) });

  /* ── 3. IT STARTS AT THE START ──
     The regression guard for the un-anchored wall-clock phase. Frame dwell is
     ~33ms and rAF is ~16ms, so the first sample should land on frame 0; allow
     1 for scheduling jitter but nothing beyond it.
     HONEST ABOUT ITS OWN STRENGTH: with the anchor in place this is
     deterministic and will hold every run. Against the OLD bug it only fires
     ~8 times in 9, because a free-running clock lands on frame 0 by luck
     sometimes -- measured: a run against the reverted build passed this and
     failed assertion 2. Assertion 2 is the deterministic discriminator (a dash
     of any length sweeps the whole strip); this one is the direct statement of
     what the fix is for. Keep both. */
  const firstF = during.length ? during[0].f : null;
  rec.ok('the tumble opens at the START of the roll, not a wall-clock-arbitrary frame',
    firstF === 0 || firstF === 1,
    { firstFrame: firstF, frames: during.map((s) => s.f) });

  /* ── 4. IT IS NOT SECRETLY A DODGE ──
     S._dodgeRoll carries i-frames and the damage-dodge test. The afterimage is
     fed off that same flag, so an empty trail through the whole dash is the
     direct read that the dash did not co-opt it. */
  const leaked = during.filter((s) => s.roll || s.trail > 0 || s.rolling);
  rec.ok('the dash borrows the LOOK and not the i-frames (no _dodgeRoll, no trail)',
    leaked.length === 0,
    { leaked: leaked.length, sample: leaked.slice(0, 2) });

  /* ── 5. THE CONTROL: AN ORDINARY DODGE STILL CLAMPS ──
     The dash loops; the dodge must still one-shot and settle. If this ever
     wraps, the dash branch has swallowed the dodge branch. */
  await P.page.waitForTimeout(900);
  const roll = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    window._gameFns.contextualDodge(0);
    const samples = [];
    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        const d = window._pixiRenderer.playerDisplayRaw();
        samples.push({ t: Math.round(performance.now() - t0), pose: d && d._animPose,
          f: d && d._animFrame, roll: !!S._dodgeRoll });
        if (performance.now() - t0 > 900) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return samples;
  });
  const rollFrames = roll.filter((s) => s.roll && s.pose === 'dodge').map((s) => s.f);
  let wrapped = false;
  for (let i = 1; i < rollFrames.length; i++) if (rollFrames[i] < rollFrames[i - 1]) wrapped = true;
  rec.ok('an ordinary dodge roll still plays once and settles (no wrap)',
    rollFrames.length > 0 && !wrapped, { frames: rollFrames });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));

  await P.ctx.close().catch(() => {});
}
