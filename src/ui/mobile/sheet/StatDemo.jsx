import React from 'react';
import { CharacterView, cropShift, cropWidth } from './CharacterView.jsx';
import { captureAttack, capturePose, captureFilm } from '@/rendering/fighterCapture.js';   /* v2.3.2986: the world's own swing / shot, photographed; v2.3.2987 + his roll and jog; v2.3.2991 + the effects round a hit */
import { loadSlimePins, slimePinsReady, slimePinsFrom, pinAnimation, PIN_V } from './slimePins.js';   /* v2.3.2991: arrows ride the slime */
import { STAFF_BIG_BOLT_BLAST_PX, staffAoeMult } from '@/data/gameSystems.js';   /* v2.3.2991: the big bolt's blast reach */
import { SLIME_BASE_ROW } from '@/rendering/slimeSprites.js';   /* v2.3.2991: the row the blob stands on */
import { dodgeWindowMs } from '@/game/dodge.js';   /* v2.3.2987: how long YOUR roll lasts, the world's one formula */
import { staffCastPose } from '@/rendering/staffCastFx.js';      /* v2.3.2986: the staff's cast kick, the world's angles */
import { VitalBar, VITAL_ICONS } from './VitalBar.jsx';
import { DMG_CRIT_COLOR } from '@/rendering/systems/effectsRenderer.js';
import { ELEMENTS } from '@/data/elements.js';
import { prog3CatFor } from '@/data/prog3.js';   /* v2.3.2231: weapon type -> combat lane */
import { toDisplayHp } from '@/data/gameSystems.js';
import { SLIME, SLIME_PX, ORB_URL, SHOT, ICON, blueSlimeSheet } from '@/data/statDemoAssets.js';   /* v2.3.2616: shared with the preloader */
import { prepareStatScene, newSceneSeed, SIM_STATS, SLIME_THROW, SLIME_SWING, SLIME_DEATH_MS } from './statSim.js';   /* v2.3.2979 */

/* ═══ v2.3.2222: WHAT A STAT IS FOR, SHOWN WITH THE GAME'S OWN PIECES ═══
 *
 * Owner, on the Points screen: "Small information ℹ️ next to the name.
 * Tapping it launches into a new window that describes its effect.  It also
 * has a preview of what the effect does (exaggerated)."  And on the first
 * cut of this file (two CSS panes of bouncing stat icons and captions):
 * "Looks a little amateurish and goofy."  The owner's pick for the redo:
 * rebuild it from the game's own art.
 *
 * So this is ONE scene, and every piece in it is something the player has
 * already seen in play:
 *   - YOUR character, drawn by CharacterView -- the same figure the
 *     Equipment screen shows, with whatever you are holding and wearing.
 *   - A slime, off its real sprite sheets (idle bounce, the squash when it
 *     is hit, the lunge when it shoots, its orb, and its death splat).
 *   - The real health / energy bar (VitalBar) with its in-trough readout,
 *     for the stats that move one.
 *   - Hit numbers in the combat renderer's own dress: 21px white with the
 *     black stroke; a crit 38px in DMG_CRIT_COLOR with the crit mark beside
 *     it (v2.3.2211/2212); damage you take in the same red, with the heart,
 *     as monsterCombat pops it; 'Dodged!' in its green.
 *
 * It plays BEFORE -> AFTER: the scene runs once as things are, then a point
 * lands on the stat (the row's own icon, a brass +n), and the same scene
 * runs again with the points in.
 * v2.3.3002: ...and now both at ONCE (owner: "show live side by side
 * simulations of the before and after ... instead of the sequence"): "Now"
 * in a lane on top, "+n" in a lane under it, the same fight on one clock --
 * see loopSteps.
 *
 * ═══ v2.3.2979: ...AND NOW IT IS A FIGHT, NOT A STORYBOARD ═══
 * Owner: "Make it so the preview of the combat skills stat allocation
 * confirmation window shows real simulation of the hits against a slime
 * monster.  These previews were made under a worse model."
 *
 * Until now each stat had a hand-written storyboard -- '12' then '24' for
 * Power, a '25' crit every fourth swing for Luck, a burn shrinking from 8 to
 * 2 for Resist -- the same numbers for every character, exaggerated on
 * purpose.  None of it was anything YOUR character would do, and two scenes
 * showed mechanics slimes do not have.  The storyboards are gone.  Every beat
 * now comes out of statSim.js, which fights the Starting Meadow's real slime
 * with your real build through the worker's own damage arithmetic (and a
 * server suite, statsim.test.mjs, holds that arithmetic to the worker roll
 * for roll):
 *   - the numbers are what the world would pop over that slime, crits and
 *     the killing blow included, and its HP bar drains to them;
 *   - the swings come at your real cadence, so Speed is time you can see;
 *   - both halves read ONE set of dice, so whatever changes between them is
 *     the points and nothing else -- and the dice are fresh every loop, so a
 *     few loops show the real spread;
 *   - a VERDICT line under the stage says what the long run comes to ("Slime
 *     down in 2.8 hits · 1.68s -> 2.4 hits · 1.43s"), because one point of a
 *     curve stat is honestly small and a single fight can hide it.
 * Where the honest answer is "nothing changes" -- Element on a weapon with no
 * element, Power against a slime you already one-shot -- the scene shows
 * exactly that, and a line says why.
 *
 * TIMING IS A LIST OF TIMEOUTS, NOT A rAF LOOP.  CharacterView documents
 * why it draws once and sits still (v2.3.1815: a per-frame canvas repaint
 * over the WebGL world is the slowdown v2.3.1808 removed).  This scene
 * repaints nothing per frame: each beat is one setState, and the motion in
 * between is CSS (the slime's steps() through its strip, a number rising,
 * the figure's lunge).  The character canvas is painted exactly once per
 * open.  Under prefers-reduced-motion the timeline does not run at all --
 * the AFTER end-state is drawn still, with one number on it.
 * v2.3.2987: ONE exception, the Move Speed walk -- seconds of jog stride at
 * the world's ~31 frames a second would be thirty setStates a second, so the
 * Fighter plays it on requestAnimationFrame, blitting one small photographed
 * frame into one small canvas.  The portrait is still painted once.
 *
 * ASSETS: the slime strips, its orb and the popup icons are the world's
 * own (preloadWorldAnimations / effectsRenderer load them before the intro
 * lifts), so by the time this window can open they are in cache; the same
 * URLs are used here so the cache is what answers.  The blue slime is baked
 * on the same gate (statDemoPreload.js).  The stat icon is the one the row is
 * already showing. */

/* The character: CharacterView composites a 256 square; cropped to its
   measured figure window (FIGURE_W_FRAC) so the scene holds the person, not
   the empty frame around them. */
const HERO_SIZE = 120;
/* v2.3.2979: 130 -> 140.  The slime wears its HP bar now, and the world's
   rule is that the numbers rise ABOVE the bar (entityRenderer v2.3.1638), so
   the pops start ten px higher and need the room to finish rising. */
const SCENE_H = 140;
/* The point lands on the "+n" lane's hero: the badge rises for 900 ms.
   v2.3.3002: as the loop begins -- the halves play together now, so there
   is no gap between them to land in. */
const POINT_MS = 900;
/* v2.3.2991: a hit's spray.  The pieces land in its first second, as the
   world's do; the world then keeps the marks to 5.4s (hitMaterialFx
   BURST_MS), but this stage meets a fresh slime on the same spot every second
   or two, and five seconds of marks would bury it -- so they hold a second
   and fade */
const GUNK_MS = 3000;
const GUNK_FADE_MS = 900;

const START = {
  pops: [], hero: { kind: null, n: 0, ms: 0 }, slime: { kind: 'idle', n: 0, ms: 0 },
  slimeBar: null, orb: 0, shots: [], point: 0, shield: 0, guard: false,
  bar: null, phase: 0, blue: false,
  atk: null, kick: null,   /* v2.3.2986: an attack frame on screen, the staff's turn */
  mv: null, walk: null,    /* v2.3.2987: a roll frame on screen; the trek under way */
  films: [], stuck: [],    /* v2.3.2991: the effects round a hit; the arrows in the slime */
};

/* ── the timeline ───────────────────────────────────────────────────────
   statSim hands back each half as a list of beats ({t, k, ...}, ms from the
   start of the half).  These turn them into {t, patch} steps on one clock.
   Every animation a beat starts carries its own id, taken here while the
   steps are built, so the step that ends it can tell whether something newer
   has replaced it in the meantime -- a hit's squash must not snap a slime
   that has since died back to idle. */
const hpBar = (hp, max) => ({ cur: toDisplayHp(hp), max: Math.max(1, toDisplayHp(max)) });

function passSteps(pass, off, phase, ctx) {
  const steps = [];
  const at = (t, patch) => steps.push({ t: off + t, patch });
  const hero = (t, kind, dur, ms) => {
    const id = ++ctx.heroN;
    at(t, () => ({ hero: { kind, n: id, ms: ms || 0 } }));
    at(t + dur, (s) => (s.hero.n === id ? { hero: { kind: null, n: id, ms: 0 } } : {}));
  };
  /* v2.3.2991: + t0, the wall clock as the strip starts -- what an arrow in
     the slime resumes its wound's film from when the slime's span remounts */
  const slime = (t, kind, back, ms) => {
    const id = ++ctx.slimeN;
    at(t, () => ({ slime: { kind, n: id, ms: ms || 0, t0: Date.now() } }));
    if (back) at(t + back, (s) => (s.slime.n === id ? { slime: { kind: 'idle', n: id, ms: 0, t0: Date.now() } } : {}));
  };
  const pop = (t, side, text, kind, dx, color) => {
    const id = ++ctx.popN;
    at(t, (s) => ({ pops: s.pops.concat({ id, side, text, kind, dx: dx || 0, color }) }));
    at(t + 1100, (s) => ({ pops: s.pops.filter((p) => p.id !== id) }));
  };
  const shot = (t, spec, life) => {
    const id = ++ctx.shotN;
    at(t, (s) => ({ shots: s.shots.concat({ id, ...spec }) }));
    at(t + life, (s) => ({ shots: s.shots.filter((x) => x.id !== id) }));
  };
  /* ═══ v2.3.2991: WHAT A HIT LEAVES ═══
     Owner: "make it so the slime shows the hit effect (green gunk coming out
     after getting hit) ... make sure arrows stick in the monster too."
     ctx.fx is what the world filmed for this window (fighterCapture
     .captureFilm): the slime's material thrown by this weapon, the stuck
     shaft and its wound, the white-hot special and its smoulder, the staff's
     crash.  A projectile flies in on one of a few fixed lines (slimePins'
     PIN_V), each fresh slime's shots taking them in turn from the first --
     the line is taken when the shot leaves and handed back when it lands, so
     the arrow that sticks is pinned where that shot went in. */
  const line = () => {
    const vi = (ctx.onSlime++) % PIN_V.length;
    ctx.lines.push(vi);
    return vi;
  };
  const film = (t, kind, vi, life) => {
    const F = ctx.fx && ctx.fx[kind];
    if (!F) return;
    const id = ++ctx.fxN;
    at(t, (s) => ({ films: s.films.concat({ id, kind, vi }) }));
    at(t + life, (s) => ({ films: s.films.filter((x) => x.id !== id) }));
  };
  const stick = (t, vi, hot) => {
    const F = ctx.fx && (hot ? ctx.fx.hotStuck : ctx.fx.stuck);
    if (!F || vi < 0) return;
    const id = ++ctx.fxN;
    /* t0 on the wall clock, taken as it lands: when the slime's next strip
       remounts it, the wound's film resumes where it was, not from the start */
    at(t, (s) => ({ stuck: s.stuck.concat({ id, vi, hot: !!hot, t0: Date.now() }) }));
    /* the special's shaft burns out and is gone, as on the map */
    if (hot) at(t + F.ms, (s) => ({ stuck: s.stuck.filter((x) => x.id !== id) }));
  };
  const hitFx = (b) => {
    const F = ctx.fx;
    if (!F) return;
    const lane = ctx.lane;
    const ranged = lane === 'bow' || lane === 'staff';
    const vi = ranged ? (ctx.lines.length ? ctx.lines.shift() : 0) : -1;
    /* the gunk: two takes of the world's spray, in turn, so hit after hit is
       not the one splash; its marks hold a moment and fade (GUNK_MS) */
    film(b.t, (ctx.gunkN++ % 2 && F.gunk2) ? 'gunk2' : 'gunk', vi, GUNK_MS);
    if (lane === 'staff') {
      const big = !!b.special && F.crashBig;
      film(b.t, big ? 'crashBig' : 'crash', vi, ((big ? F.crashBig : F.crash) || { ms: 500 }).ms + 60);
    }
    if (lane === 'bow') stick(b.t, vi, !!b.special && !!F.hotStuck);
  };
  /* ═══ v2.3.2986: THE HERO ATTACKS WITH HIS OWN ANIMATION ═══
     Owner: "play the animation for attacking as if the player and slime were
     in that little window having a fight.  Right now it's just the static
     character standing and getting nudged to the right and back."
     ctx.attack is what the world gave this window (fighterCapture): a sword
     swing or a bow shot photographed off the world's own stand-ins, frame i
     shown from times[i] -- the world's clock -- or the staff's cast kick
     (staffCastPose, the world's angles at its own 12 fps steps).  Returns the
     moment a bow LOOSES (the release frame -- the arrow cannot leave before
     the string does), 0 when the attack lands from its first moment, or null
     when there is nothing to play and the caller falls back to the old
     nudge. */
  const play = (t, big) => {
    /* v2.3.2991: the special swing has its own take -- the crescent and all */
    const SP = big && ctx.fx && ctx.fx.special && ctx.fx.special.frames ? ctx.fx.special : null;
    const A = SP || ctx.attack;
    if (A && A.frames) {
      const id = ++ctx.atkN;
      A.times.forEach((ft, i) => at(t + ft, () => ({ atk: { frame: i, id, sp: !!SP } })));
      at(t + A.dur, (s) => (s.atk && s.atk.id === id ? { atk: null } : {}));
      return A.release || 0;
    }
    if (A && A.kick) {
      const id = ++ctx.atkN;
      const steps = staffKick(big);
      steps.forEach((k) => at(t + k.t, () => ({ kick: { rot: k.rot, id } })));
      at(t + steps[steps.length - 1].t + 1, (s) => (s.kick && s.kick.id === id ? { kick: null } : {}));
      return 0;
    }
    return null;
  };
  /* a bow's arrow leaves at the release and still lands on the simulated
     impact, so it crosses in whatever is left of the 200ms */
  const flight = (rel, ms) => (rel ? { ms: Math.max(60, ms - rel) } : null);
  /* ═══ v2.3.2987: HE ROLLS AND HE WALKS, WITH HIS OWN ANIMATIONS ═══
     Owner: "Yes do dodges and walking too."  ctx.moves is what the world gave
     (fighterCapture.capturePose): the dodge roll and the jog, photographed
     off his own figure.  A roll is the world's nine frames spread evenly over
     HIS roll window (dodgeWindowMs -- Endurance and Reflexes stretch it, and
     the world's tumble stretches with it), the last frame the stand it hands
     back to; centred on the moment the attack arrives, so it meets him curled
     up.  He rolls where he stands: the stage is a few of his widths across,
     and the world's roll carries him a hundred px or more.  Returns false
     when there are no frames, and the caller keeps the old sidestep. */
  const roll = (t) => {
    const D = ctx.moves && ctx.moves.dodge;
    if (!D) return false;
    const id = ++ctx.mvN;
    const n = D.frames.length, ms = ctx.rollMs;
    for (let i = 0; i < n; i++) at(t + i * ms / n, () => ({ mv: { frame: i, id } }));
    at(t + ms, (s) => (s.mv && s.mv.id === id ? { mv: null } : {}));
    return true;
  };
  const cat = ctx.shot;
  ctx.onSlime = 0;   /* v2.3.2991 */
  /* the half begins on a fresh slime and full bars */
  at(0, () => ({
    phase, blue: !!pass.blue, guard: false, orb: 0, shots: [], stuck: [],   /* v2.3.2991: a fresh slime has no arrows in it */
    slime: { kind: 'idle', n: ++ctx.slimeN, ms: 0, t0: Date.now() },
    slimeBar: pass.slime ? hpBar(pass.slime.hp, pass.slime.max) : null,
    bar: pass.bar ? { ...pass.bar, base: ctx.barBase || pass.bar.max } : null,
  }));
  for (const b of pass.beats) {
    switch (b.k) {
      case 'atk': {
        const rel = play(b.t, false);
        if (b.ranged && cat) {
          if (rel === null) hero(b.t, 'loose', 260);
          shot(b.t + (rel || 0), { cat, vi: line(), ...flight(rel, 200) }, 200 - (rel || 0));
        } else if (rel === null) hero(b.t, 'swing', 340);
        break;
      }
      case 'special':
        if (b.ranged && cat) {
          /* every arrow of a volley is its own draw and loose, as on the map */
          for (let j = 0; j < (b.shots || 1); j++) {
            const tj = b.t + j * (b.gapMs || 0);
            const rel = play(tj, !!b.big);
            if (rel === null && j === 0) hero(b.t, 'loose', 260);
            /* v2.3.2991: the bow's volley flies white-hot, as on the map */
            shot(tj + (rel || 0), { cat, big: !!b.big, hot: cat === 'bow' && !!(ctx.fx && ctx.fx.hot), vi: line(), ...flight(rel, 200) }, 200 - (rel || 0));
          }
        } else if (play(b.t, true) === null) hero(b.t, 'special', 420);
        break;
      case 'short': {
        const rel = play(b.t, false);
        if (b.ranged && cat) {
          if (rel === null) hero(b.t, 'loose', 260);
          shot(b.t + (rel || 0), { cat, short: true, frac: b.frac, ...flight(rel, 340) }, 420 - (rel || 0));
        } else if (rel === null) hero(b.t, 'short', 340);
        break;
      }
      case 'hit':
        if (!b.kill) slime(b.t, 'hit', 800);
        at(b.t, () => ({ slimeBar: hpBar(b.hp, b.max) }));
        pop(b.t, 'slime', b.text, b.crit ? 'crit' : 'hit', b.dx || 0);
        hitFx(b);   /* v2.3.2991 */
        break;
      case 'tick':
      case 'recoil':
        at(b.t, () => ({ slimeBar: hpBar(b.hp, b.max) }));
        pop(b.t, 'slime', b.text, 'burn', 0, (ELEMENTS[b.element] || {}).color);
        break;
      case 'death':
      case 'burst':
        slime(b.t, 'death', 0);
        /* v2.3.2991: a dead slime drops its arrows (the world's rule since
           v2.3.2891, "Arrows stuck in monsters persist even after death"),
           and the next one's shots start on the first line again */
        at(b.t, () => ({ stuck: [] }));
        ctx.onSlime = 0;
        if (b.k === 'death') at(b.t, (s) => (s.slimeBar ? { slimeBar: { ...s.slimeBar, cur: 0 } } : {}));
        break;
      case 'spawn':
        slime(b.t, 'spawn', 320);
        at(b.t, () => ({ stuck: [] }));
        ctx.onSlime = 0;
        at(b.t, () => ({ slimeBar: hpBar(b.hp, b.max) }));
        break;
      case 'miss':
        pop(b.t, 'slime', b.text, 'miss');
        break;
      case 'swell':
        slime(b.t, 'swell', 0, b.ms);
        break;
      case 'throw':
        /* the arm goes back, then the ball leaves -- the worker's own split
           (BASIC_WINDUP.THROW_MS, then travelMs in the air) */
        slime(b.t, 'shoot', 420);
        at(b.t + SLIME_THROW.WINDUP_MS, (s) => ({ orb: s.orb + 1 }));
        break;
      case 'swing':
        /* v2.3.2979: at arm's length the slime swings instead -- no ball and
           no attack strip, the throb the world plays through the wind-up
           (entityRenderer _windupFx), then the hit lands on the hero */
        slime(b.t, 'windup', SLIME_SWING.WINDUP_MS, SLIME_SWING.WINDUP_MS);
        break;
      case 'land':
        at(b.t, () => ({ orb: 0 }));
        if (b.kind === 'dodged' && !roll(b.t - ctx.rollMs / 2)) hero(b.t - 150, 'dodge', 600);
        if (b.kind === 'blocked') at(b.t, (s) => ({ shield: s.shield + 1 }));
        if (b.text) pop(b.t, 'hero', b.text, b.kind === 'dodged' || b.kind === 'blocked' ? 'dodged' : 'hurt', 0);
        if (typeof b.hp === 'number') at(b.t, (s) => (s.bar ? { bar: { ...s.bar, cur: b.hp } } : {}));
        if (typeof b.stam === 'number') at(b.t, (s) => (s.bar ? { bar: { ...s.bar, cur: b.stam } } : {}));
        break;
      case 'guard':
        at(b.t, () => ({ guard: !!b.on }));
        break;
      case 'stam':
        at(b.t, (s) => (s.bar ? { bar: { ...s.bar, cur: b.cur } } : {}));
        break;
      /* v2.3.3008: Max MP's scene -- a block off the bar as each special
         goes, and the word when it cannot pay for the next (statSim
         manaPass) */
      case 'mana':
        at(b.t, (s) => (s.bar ? { bar: { ...s.bar, cur: b.cur } } : {}));
        break;
      case 'nomana':
        pop(b.t, 'hero', b.text, 'miss', 0);
        break;
      case 'roll':
        /* the stamina goes as the roll starts -- the sim puts that half his
           roll window before the attack lands (prepareStatScene's rollMs) */
        if (!roll(b.t)) hero(b.t, 'dodge', 600);
        at(b.t, (s) => (s.bar ? { bar: { ...s.bar, cur: b.stam } } : {}));
        break;
      case 'trek':
        /* v2.3.2987: jogging out and back, the world's stride on the world's
           cadence -- the Fighter runs the frames; the step only says when */
        if (ctx.moves && ctx.moves.jog) {
          const id = ++ctx.mvN;
          at(b.t, () => ({ walk: { id, ms: b.ms, px: b.px || 64 } }));
          at(b.t + b.ms, (s) => (s.walk && s.walk.id === id ? { walk: null } : {}));
        } else hero(b.t, 'trek', b.ms, b.ms);
        break;
      default: break;
    }
  }
  return steps;
}

/* ═══ v2.3.3002: ONE LOOP -- BOTH FIGHTS AT ONCE, ONE ABOVE THE OTHER ═══
   Owner: "I was thinking it would be better to show live side by side
   simulations of the before and after effects of what allocating the points
   would do in the previews instead of the sequence of showing the before
   first and then after afterwards."  Asked how, on a phone the window is
   ~290px wide: stacked -- "Now" on top, "+n" underneath, both full size.
   So a loop is the two halves on ONE clock, each in its own lane (`ln` on
   every step): the same dice (statSim reads one seed for both, slime by
   slime), the same number of slimes (fightPair), started together -- so
   whatever the points change shows as the two fights drifting apart, the
   "+n" slime falling first, its number bigger, its bar holding.  The lane
   that finishes first stands where it ended until the other does; then both
   go again on fresh dice.  The point still lands on HIS head (the owner's
   v2.3.2230 ask), as the loop begins, on the lane that has it.  A stat at
   its cap has no after half: one lane, looping, and the window's own "at
   its cap" line says why. */
function newCtx(passes, shot, attack, moves, rollMs, fx, lane) {
  return { heroN: 0, slimeN: 0, popN: 0, shotN: 0, atkN: 0, mvN: 0, fxN: 0, onSlime: 0, gunkN: 0, lines: [], shot, attack: attack || null, moves: moves || null, rollMs: rollMs || 300, fx: fx || null, lane: lane || null, barBase: passes[0] && passes[0].bar ? passes[0].bar.max : 0 };
}
function loopSteps(prep, passes, shot, attack, moves, rollMs, fx, lane) {
  const steps = passSteps(passes[0], 0, 0, newCtx(passes, shot, attack, moves, rollMs, fx, lane)).map((st) => ({ ...st, ln: 0 }));
  let end = passes[0].end;
  if (passes[1]) {
    steps.push({ t: 0, ln: 1, patch: (s) => ({ point: s.point + 1 }) });
    steps.push({ t: POINT_MS, ln: 1, patch: () => ({ point: 0 }) });
    steps.push(...passSteps(passes[1], 0, 1, newCtx(passes, shot, attack, moves, rollMs, fx, lane)).map((st) => ({ ...st, ln: 1 })));
    end = Math.max(end, passes[1].end);
  }
  return { steps, end, lanes: passes[1] ? 2 : 1 };
}
/* a lane's patch, applied to that lane only */
const patchLane = (lanes, step) => lanes.map((ls, i) => (i === step.ln ? { ...ls, ...step.patch(ls) } : ls));

/* Reduced motion: each lane's closing frame, drawn still, with its last
   number on it. */
function stillOf(prep, shot) {
  const passes = prep.play(1);
  if (!passes || !passes[0]) return [START];
  return passes.filter(Boolean).map((p, i) => {
    let s = { ...START };
    const steps = passSteps(p, 0, i, newCtx(passes, shot, null, null, 300, null, null)).sort((a, b) => a.t - b.t);
    for (const st of steps) s = { ...s, ...st.patch(s) };
    const last = [...p.beats].reverse().find((b) => b.text);
    return {
      ...s, hero: { kind: null, n: 0, ms: 0 }, shots: [], orb: 0, point: 0, atk: null, kick: null, mv: null, walk: null, films: [], stuck: [],
      slime: s.slime.kind === 'death' ? s.slime : { kind: 'idle', n: 0, ms: 0 },
      pops: last ? [{ id: 1, side: (last.k === 'land') ? 'hero' : 'slime', text: last.text,
        kind: last.k === 'land' ? (last.kind === 'hurt' || last.kind === 'burst' ? 'hurt' : 'dodged') : (last.crit ? 'crit' : (last.k === 'tick' || last.k === 'recoil') ? 'burn' : last.k === 'miss' ? 'miss' : 'hit'),
        color: (last.k === 'tick' || last.k === 'recoil') ? (ELEMENTS[last.element] || {}).color : undefined }] : [],
    };
  });
}

/* ── the pieces ───────────────────────────────────────────────────────── */

/* One combat number, in the renderer's dress (DMG_STYLE: Source Sans 3,
   800, white, 3px black stroke; crit 38px in DMG_CRIT_COLOR with the crit
   mark at 1.15x the font; the heart at the font size on damage taken). */
const POP_STYLE = {
  hit:    { color: '#ffffff', size: 21 },
  crit:   { color: DMG_CRIT_COLOR, size: 38, icon: ICON.crit, iconH: Math.round(38 * 1.15) },
  hurt:   { color: '#ff5e6c', size: 21, icon: ICON.heart, iconH: 21, before: true },
  dodged: { color: '#3dd497', size: 21 },
  burn:   { color: ELEMENTS.flame.color, size: 21 },
  /* v2.3.2616: a non-damage event, in 'Dodged!'s dress but muted — nothing
     happened TO anybody, which is the whole point of the beat. */
  miss:   { color: '#9AA7AC', size: 19 },
};
const Pop = ({ p }) => {
  const st = POP_STYLE[p.kind] || POP_STYLE.hit;
  const icon = st.icon && <img className="bt-sd-pop-ic" src={st.icon} alt="" draggable={false} style={{ height: st.iconH }} />;
  return (
    <span className={'bt-sd-pop bt-sd-pop--' + p.side} data-sd-pop={p.kind}
      style={{ color: p.color || st.color, fontSize: st.size, '--sd-dx': (p.dx || 0) + 'px' }}>
      {st.before && icon}<span>{p.text}</span>{!st.before && icon}
    </span>
  );
};

/* The projectile the hero looses, in flight.  Each is its own element with
   its own id, so the bow's three-arrow special can have three in the air;
   the bolt additionally steps its 4-cel strip the way the slime steps its
   own (v2.3.2231). */
const Shot = ({ s, aim }) => {
  /* v2.3.2991: the bow's special flies white-hot -- the world's own arrow,
     filmed (aim.hot) -- in place of the plain pine arrow */
  const hot = s.hot && aim && aim.hot ? aim.hot : null;
  /* v2.3.2991: and a plain arrow at the WORLD's size for the man who shot it
     (the bow take's arrowLen: the world's arrow, 128x32 art, at his scale) --
     it was 30px, about two thirds of that, and the arrow that flies is the
     arrow that sticks */
  const L = s.cat === 'bow' && aim && aim.arrowLen ? aim.arrowLen : 0;
  const a = hot ? { url: hot.strips[0], w: hot.w, h: hot.h, frames: hot.frames }
    : L ? { ...SHOT.bow, w: L, h: L / 4 } : SHOT[s.cat];
  if (!a || !a.url) return null;
  /* ═══ v2.3.2991: AIMED -- FROM THE BOW TO WHERE IT GOES IN ═══
     The shots used to fly a fixed 120px along a fixed line, which at most
     widths passed over the resting slime or stopped short of it -- harmless
     while a shot simply vanished on arrival, not once an arrow STICKS.  With
     the stage measured (aim) the shot leaves the release point (the bow's
     grip, off the world's own bow frames) and arrives at the point its line
     goes into the slime (slimePins), its point leading: rotated to its line,
     about its tip.  Unmeasured, or falling short (Range's before half), it
     flies the old way. */
  const end = aim && !s.short && s.vi != null ? aim.pin(s.vi) : null;
  const start = end ? aim.start(s.cat) : null;
  let aimed = null;
  if (start && end) {
    let dx = end[0] - start[0], dy = end[1] - start[1];
    /* off the grip, the point leaves `lead` ahead of it along the line: the
       world looses an arrow with its pivot on the grip */
    const d = Math.hypot(dx, dy) || 1;
    const lead = aim.grip && s.cat === 'bow' ? Math.max(0, Math.min(d - 2, hot ? hot.tip : (aim.arrowLead || 0))) : 0;
    const sx = start[0] + (dx / d) * lead, sy = start[1] + (dy / d) * lead;
    dx = end[0] - sx; dy = end[1] - sy;
    /* the point: a plain arrow's and a bolt's is their right edge; the hot
       film's is `tip` ahead of its pivot (origin) */
    const ax = hot ? hot.origin[0] + hot.tip : a.w, ay = hot ? hot.origin[1] : a.h / 2;
    aimed = {
      left: sx - ax, top: sy - ay, bottom: 'auto',
      transformOrigin: ax + 'px ' + ay + 'px',
      '--sd-dx': dx.toFixed(1) + 'px', '--sd-dy': dy.toFixed(1) + 'px', '--sd-ang': Math.atan2(dy, dx).toFixed(4) + 'rad',
    };
  }
  return (
    /* v2.3.2616: `short` flies part of the way and fades, for Range's before
       half.  v2.3.2979: and exactly the part its real reach covers (--sd-short,
       statSim's frac of the gap).  `big` is the staff's big bolt. */
    <i className={'bt-sd-shot bt-sd-shot--' + s.cat + (s.short ? ' bt-sd-shot--short' : '') + (s.big ? ' bt-sd-shot--big' : '') + (aimed ? ' bt-sd-shot--aim' : '') + (hot ? ' bt-sd-shot--hot' : '')}
      data-sd-hot={hot ? '1' : undefined} data-sd-line={aimed ? s.vi : undefined}
      style={{
        backgroundImage: `url(${a.url})`,
        width: a.w, height: a.h,
        backgroundSize: `${a.frames * a.w}px ${a.h}px`,
        /* the same two knobs bt-sd-strip reads for the slime: how many cels
           and how far to walk.  A 1-cel sheet walks 0px, so the arrow's
           strip animation is a no-op rather than a special case.
           v2.3.2979: ...but only if it counts at least 2 steps.
           steps(1, jump-none) is INVALID (jump-none needs n >= 2), and
           through var() that voids the WHOLE animation shorthand at
           computed-value time -- the flight included -- so every bow arrow
           since v2.3.2231 sat in the hero's hand and never crossed (Chromium
           computes animation-name: none; reviewer-found).  Two steps over a
           0px walk is still a no-op, and the arrow flies. */
        '--sd-frames': Math.max(2, a.frames), '--sd-strip': -((a.frames - 1) * a.w) + 'px',
        ...(s.short ? { '--sd-short': Math.round(120 * Math.max(0, Math.min(1, s.frac == null ? 0.45 : s.frac))) + 'px' } : null),
        /* v2.3.2986: a bow's arrow leaves at the release frame, so it crosses
           in what is left of the flight (passSteps' `flight`) */
        ...(s.ms ? { animationDuration: s.ms + 'ms' } : null),
        ...aimed,
      }} />
  );
};

/* ═══ v2.3.2991: A FILM -- ONE LAYER OF A WORLD EFFECT, ON THE STAGE ═══
   The gunk and the staff's crash, each two layers (behind the slime, in
   front of it): a strip stepped by bt-sd-strip like the slime's own, played
   once and held, then faded.  Placed by its origin: the slime's feet for the
   gunk (its burst point is in the film), the shot's point of entry for the
   crash. */
const Film = ({ f, F, layer, at }) => {
  const url = F && F.strips && F.strips[layer];
  if (!url || !at) return null;
  const gunk = f.kind === 'gunk' || f.kind === 'gunk2';
  /* the crash is pixel art; the gunk the slime's own (soft) art */
  return (
    <i className={'bt-sd-film' + (gunk ? '' : ' bt-sd-film--px')} data-sd-film={f.kind} data-sd-layer={layer}
      style={{
        left: at[0] - F.origin[0], top: at[1] - F.origin[1], width: F.w, height: F.h,
        backgroundImage: `url(${url})`, backgroundSize: `${F.frames * F.w}px ${F.h}px`,
        '--sd-frames': Math.max(2, F.frames), '--sd-strip': -((F.frames - 1) * F.w) + 'px',
        '--sd-film-ms': F.ms + 'ms',
        /* the gunk's marks hold a moment and fade (GUNK_MS); a crash is gone as it ends */
        '--sd-fade-at': (gunk ? GUNK_MS - GUNK_FADE_MS : F.ms + 60) + 'ms',
        '--sd-fade-ms': (gunk ? GUNK_FADE_MS : 400) + 'ms',
      }} />
  );
};

const Slime = ({ anim, blue, stuck, fx, pins }) => {
  const kind = SLIME[anim.kind] ? anim.kind : (anim.kind === 'death' ? 'death' : 'idle');
  const sheet = SLIME[kind] || SLIME.idle;
  /* v2.3.2979: the blue slime (Resist's scene) wears the preloader's baked
     retint; the green sheet stands in if the bake did not happen. */
  const url = (blue && blueSlimeSheet(kind)) || sheet.url;
  /* ═══ v2.3.2991: THE ARROWS IN IT ═══
     Children of the span, so they mount WITH it: every strip change is a new
     span (its key), and an arrow's pin keyframes (slimePins) start on the same
     style pass as the strip they follow -- in step by construction.  Each is
     the world's stuck shaft and wound, filmed (or the white-hot special's
     smoulder), its film resumed where it was by a negative delay: the age it
     had as this strip began (anim.t0) -- fixed for the life of the span, so a
     re-render mid-strip does not move it. */
  const set = stuck && stuck.length && fx ? pins : null;
  return (
    <span key={anim.kind + ':' + anim.n}
      className={'bt-sd-slime bt-sd-slime--' + (anim.kind === 'spawn' || anim.kind === 'swell' || anim.kind === 'windup' ? anim.kind : kind)}
      style={{
        backgroundImage: `url(${url})`,
        backgroundSize: `${sheet.frames * SLIME_PX}px ${SLIME_PX}px`,
        '--sd-frames': sheet.frames, '--sd-strip': -((sheet.frames - 1) * SLIME_PX) + 'px',
        ...(anim.kind === 'death' ? { '--sd-death-ms': SLIME_DEATH_MS + 'ms' } : null),
        ...(anim.kind === 'swell' ? { '--sd-swell-ms': (anim.ms || 1600) + 'ms' } : null),
        ...(anim.kind === 'windup' ? { '--sd-windup-ms': (anim.ms || 500) + 'ms' } : null),
      }}>
      {set && stuck.map((a) => {
        const F = a.hot ? fx.hotStuck : fx.stuck;
        const run = pinAnimation(set, a.vi, anim.kind);
        if (!F || !F.strips[0] || !run) return null;
        const age = Math.max(0, Math.min(F.ms, (anim.t0 || 0) - a.t0));
        return (
          <i key={a.id} className="bt-sd-pin" data-sd-stuck={a.hot ? 'hot' : 'shaft'} style={{ animation: run }}>
            <i className="bt-sd-stuck"
              style={{
                left: -F.entry[0], top: -F.entry[1], width: F.w, height: F.h,
                backgroundImage: `url(${F.strips[0]})`, backgroundSize: `${F.frames * F.w}px ${F.h}px`,
                '--sd-frames': Math.max(2, F.frames), '--sd-strip': -((F.frames - 1) * F.w) + 'px',
                '--sd-film-ms': F.ms + 'ms', animationDelay: -age + 'ms',
              }} />
          </i>
        );
      })}
    </span>
  );
};

/* v2.3.2979: the slime's HP, over its head -- the world's monster band, in
   the menu's own bar construction.  The number is its displayed HP, so the
   pops rising above it add up to it exactly the way they do in play
   (toDisplayHitDamage's consistency rule). */
const SlimeBar = ({ b }) => (
  <div className="bt-sd-mhp" data-sd-slime-hp={b.cur}>
    <VitalBar kind="hp" cur={b.cur} max={b.max} thick={12} inset={(
      <span className="bt-sd-mhp-n">{b.cur}</span>
    )} />
  </div>
);

/* The real bar, in the compact vitals' own dress (v2.3.1922 readout), with
   the trough drawn at base width and stretched by max/base. */
const Bar = ({ b }) => (
  <div className="bt-sd-vital" data-sd-bar={b.kind}>
    <img src={VITAL_ICONS[b.kind]} alt="" draggable={false} className="bt-sd-vital-ic" />
    <div className="bt-sd-vital-w" style={{ width: Math.round(120 * (b.max / (b.base || b.max))) }}>
      <VitalBar kind={b.kind} cur={b.cur} max={b.max} thick={14} inset={(
        <span className="bt-sd-vital-n">{Math.ceil(b.cur)}<span className="bt-sd-vital-s">/</span>{b.max}</span>
      )} />
    </div>
  </div>
);

/* v2.3.2979: the long run, in one line -- the same now → after dress the
   window's own rows use, so it reads as one more of them. */
const Verdict = ({ v, capped, second }) => (
  <div className="bt-sd-verdict" {...(second ? { 'data-sd-verdict2': '' } : { 'data-sd-verdict': '' })}>
    <span className="bt-sd-verdict-l">{v.label}</span>
    <span className="bt-sd-verdict-v">
      {v.now}
      {!capped && v.after != null && <> → <b>{v.after}</b></>}
    </span>
  </div>
);

/* ═══ v2.3.2986: THE FIGHTER ═══
   The hero stands as his portrait (CharacterView -- the same figure the
   Equipment screen draws), side-on to the slime: EAST, the facing the
   world's attack sheets are drawn in, so standing and swinging are the same
   man from the same side.  When he attacks, the world's own frames play over
   him (see `play` in passSteps), planted on the portrait's feet at the
   portrait's height -- drawCharacterPortrait reports both (__btFigure) and
   the capture is sized off them exactly as the world sizes its stand-ins off
   the standing body.  A staff kicks as its own layer, turned about the grip
   the portrait reports for it (__btWeaponPlace). */

/* The staff's cast kick, as the world turns it: staffCastPose sampled until
   it settles, kept where the angle changes -- its own 12 fps steps, in
   radians, the sign it uses for a cast due east (toward the slime). */
const _kicks = {};
function staffKick(big) {
  const key = big ? 'big' : 'cast';
  if (_kicks[key]) return _kicks[key];
  const out = [];
  let last = null;
  for (let t = 0; t <= 1200; t += 4) {
    let r = 0;
    try { r = staffCastPose(1e6 + t, 1e6, 0, 0, 0, false, true, !!big) || 0; } catch (e) { r = 0; }
    if (last === null || Math.abs(r - last) > 1e-6) { out.push({ t, rot: r }); last = r; }
  }
  if (!out.length || out[out.length - 1].rot !== 0) out.push({ t: 1200, rot: 0 });
  return (_kicks[key] = out);
}

/* 2D affine matrices as [a, b, c, d, e, f] -- canvas getTransform()'s and CSS
   matrix()'s own order (x' = a x + c y + e). */
const mmul = (M, N) => [
  M[0] * N[0] + M[2] * N[1], M[1] * N[0] + M[3] * N[1],
  M[0] * N[2] + M[2] * N[3], M[1] * N[2] + M[3] * N[3],
  M[0] * N[4] + M[2] * N[5] + M[4], M[1] * N[4] + M[3] * N[5] + M[5],
];
const mrot = (r) => [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];

/* The hero box is the figure's crop window (CharacterView's measured one, so
   everything laid against it -- the held shield, the numbers over his head --
   stays put), but the portrait is drawn UNCROPPED inside it, slid left by the
   crop's own shift: side-on, the sword is held out in front, and the window
   (measured on the three-quarter pose) would cut it off.  The stage clips. */
const HERO_SHIFT = cropShift(HERO_SIZE);
const HERO_W = cropWidth(HERO_SIZE);

/* one photographed frame into a canvas, resized only when it has to be */
const blit = (c, f) => {
  if (!c || !f) return;
  if (c.width !== f.width || c.height !== f.height) { c.width = f.width; c.height = f.height; }
  const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  x.drawImage(f, 0, 0);
};

const Fighter = ({ weapon, shield, staff, atk: atkLive, kick: kickLive, mv: mvLive, walk, attack, special, moves, fig, onDrawn }) => {
  /* QA, for pictures (mp-statdemo): window.__btFighterHold = { frame } pins an
     attack frame (-1: standing), { kick } (degrees) the staff's turn -- a 27ms
     frame cannot be caught by a screenshot that lands 50ms after it was asked
     for.  v2.3.2987: { roll } pins a roll frame, { walk } (0..1) a point on
     the trek, out and home.  v2.3.2991: { frame, sp: true } a frame of the
     special swing. */
  const hold = (typeof window !== 'undefined' && window.__btFighterHold) || null;
  const atk = hold && hold.frame != null ? (hold.frame < 0 ? null : { frame: hold.frame, id: -1, sp: !!hold.sp }) : atkLive;
  const kick = hold && hold.kick != null ? { rot: hold.kick * Math.PI / 180, id: -1 } : kickLive;
  const mv = hold && hold.roll != null ? { frame: hold.roll, id: -1 } : mvLive;
  const walkAt = hold && hold.walk != null ? Math.max(0, Math.min(1, +hold.walk || 0)) : null;
  const atkRef = React.useRef(null);
  const spRef = React.useRef(null);   /* v2.3.2991: the special swing's take */
  const rollRef = React.useRef(null);
  const walkRef = React.useRef(null);
  const staffRef = React.useRef(null);
  const place = staff && fig ? fig.place : null;
  const dodge = moves && moves.dodge;
  const jog = moves && moves.jog;
  /* the staff, drawn once per placement into its own canvas; CSS turns it */
  React.useEffect(() => {
    const c = staffRef.current;
    if (!c || !place || !place.layer) return;
    const lw = place.layer.naturalWidth || place.layer.width, lh = place.layer.naturalHeight || place.layer.height;
    if (!(lw > 0 && lh > 0)) return;
    c.width = lw; c.height = lh;
    const x = c.getContext('2d');
    x.clearRect(0, 0, lw, lh);
    x.drawImage(place.layer, 0, 0, lw, lh);
  }, [place]);
  /* the attack frame on screen, blitted when it changes -- from the special
     swing's own take when the step says so (v2.3.2991) */
  const take = atk && atk.sp && special && special.frames ? special : attack;
  React.useEffect(() => {
    if (!atk || !take || !take.frames) return;
    blit(take === special ? spRef.current : atkRef.current, take.frames[atk.frame]);
  }, [atk, take, special]);
  /* v2.3.2987: the roll frame on screen, the same way */
  React.useEffect(() => {
    if (!mv || !dodge) return;
    blit(rollRef.current, dodge.frames[mv.frame]);
  }, [mv, dodge]);
  /* ═══ v2.3.2987: THE WALK RUNS ON ITS OWN CLOCK ═══
     A trek is seconds of stride at the world's ~31 frames a second, and the
     timeline is a list of setStates -- one per frame would re-render the whole
     scene thirty times a second for the length of the walk.  So the step says
     only that a walk began (s.walk), and this effect plays it: each animation
     frame it picks the jog frame off the world's cadence (the capture's own
     clock, as _updatePlayer picks it), blits it when it changes, and slides
     ONE small canvas.  Nothing else repaints -- the portrait is still drawn
     once per open (the v2.3.1815 rule the header states), and the loop stops
     when the walk does.  Out facing the slime (east); home on the world's own
     west-facing stride, which is not a mirrored picture of the east one (the
     weapon changes hands -- capturePoseFrames' note). */
  const walking = !!(jog && moves.jogBack && fig && (walk || walkAt != null));
  React.useEffect(() => {
    const c = walkRef.current;
    if (!c || !walking) return undefined;
    const ms = walk ? walk.ms : 1000, px = walk ? walk.px : 64;
    let raf = 0, last = null;
    const paint = (p, el) => {
      const home = p >= 0.5;
      const J = home ? moves.jogBack : jog;
      const n = J.frames.length;
      const fi = Math.floor((el / J.dur) * n) % n;
      const f = J.frames[fi];
      if (f !== last) {
        blit(c, f);
        c.style.left = (fig.feet[0] - J.feet[0]) + 'px';
        c.style.top = (fig.feet[1] - J.feet[1]) + 'px';
        c.style.width = J.w + 'px';
        c.style.height = J.h + 'px';
        c.setAttribute('data-sd-stride', (home ? 'home:' : 'out:') + fi);
        last = f;
      }
      c.style.transform = 'translateX(' + (px * (home ? 2 - 2 * p : 2 * p)).toFixed(2) + 'px)';
    };
    if (walkAt != null) { paint(walkAt, walkAt * ms); return undefined; }
    const t0 = performance.now();
    const tick = () => {
      const el = performance.now() - t0;
      const p = Math.min(1, el / ms);
      paint(p, el);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [walking, walk, walkAt, jog, moves, fig]);
  /* one figure at a time: walking, else rolling (a roll owns the body, as in
     the world -- _updatePlayer's pose ladder puts 'dodge' over everything but
     a pickup), else attacking, else standing */
  const showRoll = !walking && !!(mv && dodge && fig);
  const showAtk = !walking && !showRoll && !!(atk && take && take.frames && fig);
  const showSp = showAtk && take === special;
  const busy = walking || showRoll || showAtk;
  /* the staff's matrix: hero box <- canvas (slid by HERO_SHIFT, scaled to
     CSS) <- the portrait's grip matrix <- the kick about the grip <- the
     layer's own box in grip space */
  let staffTf = null;
  if (place) {
    const M = mmul(mmul(mmul([fig.k, 0, 0, fig.k, -HERO_SHIFT, 0], place.m), mrot(kick ? kick.rot : 0)), [1, 0, 0, 1, place.x, place.y]);
    staffTf = 'matrix(' + M.map((v) => +v.toFixed(5)).join(',') + ')';
  }
  return (
    <div className="bt-sd-fig" style={{ width: HERO_W, height: HERO_SIZE }}>
      <div className="bt-sd-figure" style={{ left: -HERO_SHIFT, visibility: busy ? 'hidden' : 'visible' }}>
        <CharacterView size={HERO_SIZE} weapon={weapon} shield={shield} dir="east" weaponOut={staff} onDrawn={onDrawn} />
      </div>
      {place && (
        <canvas ref={staffRef} className="bt-sd-staff" data-sd-kick={kick ? Math.round(kick.rot * 180 / Math.PI) : 0}
          style={{ width: place.w, height: place.h, transform: staffTf, visibility: busy ? 'hidden' : 'visible' }} />
      )}
      {attack && attack.frames && fig && (
        <canvas ref={atkRef} className="bt-sd-atk" data-sd-atk={showAtk && !showSp ? atk.frame : -1}
          style={{ left: fig.feet[0] - attack.feet[0], top: fig.feet[1] - attack.feet[1], width: attack.w, height: attack.h, visibility: showAtk && !showSp ? 'visible' : 'hidden' }} />
      )}
      {special && special.frames && fig && (
        <canvas ref={spRef} className="bt-sd-atk" data-sd-special={showSp ? atk.frame : -1}
          style={{ left: fig.feet[0] - special.feet[0], top: fig.feet[1] - special.feet[1], width: special.w, height: special.h, visibility: showSp ? 'visible' : 'hidden' }} />
      )}
      {dodge && fig && (
        <canvas ref={rollRef} className="bt-sd-atk" data-sd-roll={showRoll ? mv.frame : -1}
          style={{ left: fig.feet[0] - dodge.feet[0], top: fig.feet[1] - dodge.feet[1], width: dodge.w, height: dodge.h, visibility: showRoll ? 'visible' : 'hidden' }} />
      )}
      {jog && fig && (
        <canvas ref={walkRef} className="bt-sd-atk" data-sd-walk={walking ? 'on' : ''}
          style={{ left: fig.feet[0] - jog.feet[0], top: fig.feet[1] - jog.feet[1], width: jog.w, height: jog.h, visibility: walking ? 'visible' : 'hidden' }} />
      )}
    </div>
  );
};

const reducedMotion = () => {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (e) { return false; }
};
/* The character and the worker's caps, when the window did not hand them in. */
const liveState = () => {
  try { return (window._gameState && window._gameState.current) || null; } catch (e) { return null; }
};

/** The scene for one spendable stat.  Unknown keys render nothing rather
 *  than a broken stage, so a new stat gets its description and its numbers
 *  on day one and its scene when somebody writes it. */
/* v2.3.2696: `n` is the confirm window's stepper count -- the brass badge that
   lands between the two passes says "+3" when three points are about to go
   in.  v2.3.2979: and now the second half FIGHTS with all three: the scene is
   a simulation, so the stepper is how you see what a batch buys.
   `rpg` / `cat` are the character and the lane the window is about; both fall
   back to the live game state for a caller that does not pass them. */
export const StatDemo = ({ stat, iconSrc, weapon, shield, n, rpg, cat }) => {
  const has = SIM_STATS.includes(stat);
  const pts = Math.max(1, Math.floor(Number(n) || 1));
  /* v2.3.2231: the attack this scene plays, read off the weapon in the
     figure's hands.  prog3CatFor is the game's own mapping (greatsword
     counts as sword), so the scene cannot disagree with the lane the points
     are actually being spent in.  `sword` and no weapon both mean the
     lunge, which is why only bow/staff have a SHOT entry. */
  const shot = weapon && weapon.type ? prog3CatFor(weapon.type) : null;
  const shotCat = shot && SHOT[shot] ? shot : null;
  /* v2.3.2987: how long HIS roll lasts -- the world's one formula (Endurance
     and Reflexes stretch it), so the tumble the scene plays is his length, and
     the sim can start a stamina roll half of it before the attack lands */
  const rollMs = React.useMemo(() => {
    const S = liveState();
    try { return dodgeWindowMs(rpg || (S && S.rpg)) || 300; } catch (e) { return 300; }
  }, [rpg]);
  const prep = React.useMemo(() => {
    if (!has) return null;
    const S = liveState();
    const R = rpg || (S && S.rpg);
    if (!R) return null;
    try {
      return prepareStatScene(R, stat, cat || shot || 'sword', pts, weapon || null, !!shield, (S && S._serverCaps) || {}, rollMs);
    } catch (e) { return null; }
  }, [has, stat, cat, shot, pts, weapon, shield, rpg, rollMs]);
  /* v2.3.3002: one state per lane -- "Now", and "+n" under it while the
     stat can still take the points.  Seeded with the lanes the window will
     show, so it opens at its full height rather than growing a lane on the
     first loop. */
  const laneCount = prep && prep.kind !== 'empty' && !prep.capped ? 2 : 1;
  const [lanes, setLanes] = React.useState(() => (laneCount === 2 ? [START, START] : [START]));
  /* ═══ v2.3.2986: HIS OWN ATTACK ═══
     `fig` is where the portrait put his feet and how tall it drew him (in the
     hero box's px); `attack` is what the world gave for the weapon in hand --
     the sword swing or bow shot photographed off its own stand-ins at exactly
     that height, or the staff's kick.  Re-taken whenever the portrait redraws
     (a new look, weapon or shield), never per loop. */
  const [fig, setFig] = React.useState(null);
  const onDrawn = React.useCallback((cv) => {
    const f = cv && cv.__btFigure;
    if (!f || !(f.px > 0)) return;
    const k = HERO_SIZE / f.px;
    setFig({ k, feet: [f.feet[0] * k - HERO_SHIFT, f.feet[1] * k], bodyH: f.bodyPx * k, place: cv.__btWeaponPlace || null });
  }, []);
  const [attack, setAttack] = React.useState(null);
  const attackRef = React.useRef(null);
  /* v2.3.2986: the slime's ball flies to HIM.  It leaves from a slime placed
     off the stage's right edge toward a hero placed off its left, so the
     distance is the stage's width less both -- measured, and re-measured if
     the window is resized. */
  const stageRef = React.useRef(null);
  const heroRef = React.useRef(null);
  const [geo, setGeo] = React.useState(null);
  React.useLayoutEffect(() => {
    const st = stageRef.current, he = heroRef.current;
    if (!st || !he) return undefined;
    const measure = () => setGeo({ w: st.clientWidth || 0, heroX: he.offsetLeft || 0 });
    measure();
    let ro = null;
    try { ro = new ResizeObserver(measure); ro.observe(st); } catch (e) { ro = null; }
    return () => { try { if (ro) ro.disconnect(); } catch (e) { /* gone */ } };
  }, [has]);
  /* the ball's centre starts 99px in from the right (right:88px, 22px wide)
     and lands just in front of his chest */
  const orbDx = geo && geo.w > 0 ? Math.max(40, (geo.w - 99) - (geo.heroX + (fig ? fig.feet[0] : HERO_W / 2) + 10)) : null;
  React.useEffect(() => {
    /* v2.3.2991: false once it has been tried and there is nothing to play,
       null until then (no figure yet) -- the shots wait for the bow's take,
       which says where the arrow leaves */
    let a = fig ? false : null;
    /* v2.3.2987: reduced motion draws the scene still -- nothing to play, so
       nothing to photograph */
    if (reducedMotion()) { attackRef.current = null; setAttack(null); return; }
    if (fig && shot === 'staff') a = fig.place ? { kick: true } : false;
    else if (fig && (shot === 'sword' || shot === 'bow')) {
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      const cap = captureAttack(shot, { bodyH: fig.bodyH, res: Math.min(2, dpr), weapon, shield: !!shield });
      if (cap) a = { ...cap, release: shot === 'bow' ? cap.times[cap.times.length - 1] : 0 };
    }
    attackRef.current = a;
    setAttack(a);
  }, [fig, shot, weapon && weapon.type, weapon && weapon.gearBase, !!shield]);   /* keyed on the weapon's identity, not the object -- the CharacterView rule */
  /* ═══ v2.3.2987: HIS ROLL AND HIS STRIDE ═══
     Taken only for a scene that plays them -- the roll where the slime
     attacks and your Dodge can answer (prep.rolls), the jog for Move Speed's
     trek, out and home -- off the same figure the attack is taken off.  The
     roll lasts YOUR roll window, worked out by the world's own formula. */
  const wantRoll = !!(prep && prep.rolls);
  const wantWalk = !!(prep && prep.kind === 'trek');
  const [moves, setMoves] = React.useState(null);
  const movesRef = React.useRef(null);
  React.useEffect(() => {
    let m = null;
    if (fig && (wantRoll || wantWalk) && !reducedMotion()) {
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      const o = { bodyH: fig.bodyH, res: Math.min(2, dpr), weapon: weapon || null, shield: !!shield };
      const dodge = wantRoll ? capturePose('dodge', o) : null;
      let jog = wantWalk ? capturePose('jog', o) : null;
      const jogBack = jog ? capturePose('jog', { ...o, west: true }) : null;
      if (!jogBack) jog = null;   /* both legs of the trip, or the old slide */
      if (dodge || jog) m = { dodge, jog, jogBack: jog ? jogBack : null };
    }
    movesRef.current = m;
    setMoves(m);
  }, [fig, wantRoll, wantWalk, weapon && weapon.type, weapon && weapon.gearBase, !!shield]);
  /* ═══ v2.3.2991: THE SPECIAL, AND WHAT A HIT LEAVES ═══
     Owner: "Also special attacks need to animate ... make it so the slime
     shows the hit effect (green gunk coming out after getting hit) ... make
     sure arrows stick in the monster too."  Filmed off the world once per
     window, for a scene where he lands hits on the slime: the slime's
     material thrown by this lane's weapon (a blade's sheet, an arrow's jet, a
     bolt's blast -- two takes, played in turn), the stuck shaft and its wound
     (bow), the staff's crash; and for the Special scene, the special itself --
     the sword's crescent swing, the bow's white-hot volley and its smoulder,
     the big bolt's explosion.

     WHERE THINGS ARE ON THE STAGE.  The slime is placed off the stage's right
     edge (game.css: right 16px, bottom -33px, 128 square, one px a texel),
     the hero off its left; the stage is measured (geo).  A shot leaves the
     bow's grip on the release frame (the bow take's `grip`) -- or, without
     one, the old launch point -- and flies a straight line into the slime
     (slimePins: where each line goes in, from that point); the gunk stands
     on the slime's feet; a crash is where its bolt went in.  So a projectile
     lane waits for the slime's pins, and the bow for its take, before the
     films are taken: the stuck shaft is filmed at the angle its arrow flies. */
  /* v2.3.3008: Max MP's scene ('mana') is specials too, so it takes the
     special's frames and the slime's pins the same way */
  const hitsScene = !!(prep && (prep.kind === 'fight' || prep.kind === 'special' || prep.kind === 'range' || prep.kind === 'mana'));
  const specialScene = !!(prep && (prep.kind === 'special' || prep.kind === 'mana'));
  const ranged = shot === 'bow' || shot === 'staff';
  const [pinsIn, setPinsIn] = React.useState(() => slimePinsReady());
  React.useEffect(() => {
    if (!hitsScene || !ranged || slimePinsReady()) return undefined;
    let live = true;
    loadSlimePins().then((ok) => { if (live && ok) setPinsIn(true); });
    return () => { live = false; };
  }, [hitsScene, ranged]);
  const slimeX = geo && geo.w > 0 ? geo.w - 16 - SLIME_PX : null;
  const slimeY = SCENE_H + 33 - SLIME_PX;
  const launch = React.useMemo(() => {
    if (slimeX == null || !ranged) return null;
    if (shot === 'bow' && attack === null) return null;   /* the take is not in yet */
    const take = attack && attack.frames ? attack : null;
    if (shot === 'bow' && take && take.grip && fig) {
      const heroTop = SCENE_H + 4 - HERO_SIZE;
      return [geo.heroX + fig.feet[0] - take.feet[0] + take.grip[0], heroTop + fig.feet[1] - take.feet[1] + take.grip[1]];
    }
    const a = SHOT[shot] || SHOT.bow;
    return [geo.heroX + 42 + a.w, SCENE_H - 56 - a.h / 2];   /* the old launch point (game.css .bt-sd-shot) */
  }, [slimeX, ranged, shot, attack, fig, geo]);
  const pinSet = React.useMemo(() => (pinsIn && launch && slimeX != null
    ? slimePinsFrom([launch[0] - slimeX, launch[1] - slimeY]) : null), [pinsIn, launch, slimeX, slimeY]);
  /* the arrow: the world's, at his size (the bow take's), or the old 30px */
  const arrowLen = (attack && attack.arrowLen) || SHOT.bow.w;
  const [fx, setFx] = React.useState(null);
  const fxRef = React.useRef(null);
  React.useEffect(() => {
    const jobs = [];
    if (fig && hitsScene && shot && !reducedMotion() && (!ranged || pinSet)) {
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      const res = Math.min(2, dpr);
      const S = liveState();
      const R = rpg || (S && S.rpg) || {};
      /* where the first line goes in, in the slime's texels: the gunk's burst point */
      const p0 = pinSet ? pinSet.pins[0] : null;
      const elem = (weapon && weapon.element1) || null;
      const color = (elem && ELEMENTS[elem] && ELEMENTS[elem].color) || '#a855f7';
      /* the gunk at 1x: its pieces are cut from the slime, which the stage
         draws one px a texel -- the resolution it has.  `lift`: they land on
         the stage's few px of ground, not past its edge (the note in
         _filmGunk).  The crash is pixel art, at 1x and shown crisp. */
      const gunk = { weapon: shot === 'bow' ? 'arrow' : shot === 'staff' ? 'bolt' : 'sword', res: 1, texelPx: 1, lift: 9, at: p0 ? [p0.u, p0.v] : undefined };
      jobs.push(['gunk', () => captureFilm('gunk', { ...gunk, take: 1 })]);
      jobs.push(['gunk2', () => captureFilm('gunk', { ...gunk, take: 2 })]);
      if (shot === 'bow') jobs.push(['stuck', () => captureFilm('stuck', { res, texelPx: 1, ang: pinSet.ang, arrowLen })]);
      if (shot === 'staff') jobs.push(['crash', () => captureFilm('crash', { res: 1, texelPx: 1, color, elem })]);
      if (specialScene) {
        if (shot === 'sword') jobs.push(['special', () => captureAttack('sword', { bodyH: fig.bodyH, res, weapon, shield: !!shield, special: true })]);
        if (shot === 'bow') {
          jobs.push(['hot', () => captureFilm('hotArrow', { res, arrowLen, warm: 40 })]);   /* loosed a stride away: little tracer yet */
          jobs.push(['hotStuck', () => captureFilm('hotStuck', { res, ang: pinSet.ang, arrowLen })]);
        }
        if (shot === 'staff') jobs.push(['crashBig', () => captureFilm('crash', { res: 1, texelPx: 1, big: true, color, elem, blastR: STAFF_BIG_BOLT_BLAST_PX * staffAoeMult(R) })]);
      }
    }
    /* one film a task, so the window keeps painting while they are taken
       (each is a GPU readback; a phone would otherwise stall for all of
       them at once as the window opens) -- a film already taken comes back
       at once (fighterCapture keeps them) */
    fxRef.current = null;
    setFx(null);
    if (!jobs.length) return undefined;
    let live = true;
    const f = {};
    const next = () => {
      if (!live) return;
      const job = jobs.shift();
      if (job) {
        try { f[job[0]] = job[1](); } catch (e) { f[job[0]] = null; }
        setTimeout(next, 0);
        return;
      }
      fxRef.current = f;
      setFx(f);
    };
    const t = setTimeout(next, 0);
    return () => { live = false; clearTimeout(t); };
  }, [fig, hitsScene, specialScene, shot, ranged, pinSet && pinSet.key, pinSet && pinSet.ang, arrowLen, weapon && weapon.type, weapon && weapon.gearBase, weapon && weapon.element1, !!shield, rpg]);
  React.useEffect(() => {
    if (!prep || prep.kind === 'empty') { setLanes([START]); return undefined; }
    if (reducedMotion()) { setLanes(stillOf(prep, shotCat)); return undefined; }
    let timers = [];
    let alive = true;
    const run = () => {
      let passes;
      const seed = newSceneSeed();
      try { passes = prep.play(seed); } catch (e) { return; }
      if (!passes || !passes[0]) return;
      /* For QA (mp-statdemo): this loop's dice and every number it will pop,
         so a rig can hold what is drawn to what was simulated. */
      try {
        window.__btStatScene = {
          stat, seed, kind: prep.kind, verdict: prep.verdict,
          verdict2: prep.verdict2 || null,   /* v2.3.3008 */
          bars: passes.map((p) => (p && p.bar ? { kind: p.bar.kind, max: p.bar.max } : null)),   /* v2.3.3008: each lane's bar, its max */
          lanes: passes[1] ? 2 : 1,   /* v2.3.3002: both halves at once, one lane each */
          texts: passes.map((p) => (p ? p.beats.filter((b) => b.text).map((b) => (b.k === 'land' || b.k === 'nomana' ? 'hero:' : 'slime:') + b.text) : null)),
          /* v2.3.2986: what the hero attacks WITH: the frame count of the
             world's swing / shot, 'staff' for the kick, null for the nudge */
          fighter: attackRef.current ? (attackRef.current.kick ? 'staff' : attackRef.current.frames.length) : null,
          /* v2.3.2987: and how he moves: frame counts of the roll and of the
             two legs of the trek (null where the old CSS motion plays), and
             the roll window his frames are spread over */
          /* v2.3.2991: what the world filmed for this window (frame counts) */
          fx: fxRef.current ? Object.fromEntries(Object.entries(fxRef.current).map(([k, v]) => [k, v ? (v.frames && v.frames.length != null ? v.frames.length : v.frames) : null])) : null,
          moves: movesRef.current ? {
            dodge: movesRef.current.dodge ? movesRef.current.dodge.frames.length : null,
            jog: movesRef.current.jog ? movesRef.current.jog.frames.length : null,
            home: movesRef.current.jogBack ? movesRef.current.jogBack.frames.length : null,
            rollMs,
          } : null,
        };
      } catch (e) { /* no window: nothing to report to */ }
      const { steps, end, lanes: n } = loopSteps(prep, passes, shotCat, attackRef.current, movesRef.current, rollMs, fxRef.current, shot);
      /* v2.3.2979: the t=0 steps (the fresh slime, both bars) go in WITH the
         reset, not a setTimeout(0) after it.  START has no bars, and the vital
         row under the stage sits in normal flow, so a frame painted between
         the two dropped the row and jumped everything below it ~26px -- every
         loop, and (the stepper re-prepares the scene) every press of [+]
         (reviewer-found).  Applied in the order their timers would have run.
         v2.3.3002: per lane -- each step patches its own (`ln`). */
      let first = Array.from({ length: n }, () => START);
      for (const step of steps) if (step.t <= 0) first = patchLane(first, step);
      setLanes(first);
      for (const step of steps) {
        if (step.t <= 0) continue;
        timers.push(setTimeout(() => { if (alive) setLanes((prev) => patchLane(prev, step)); }, step.t));
      }
      timers.push(setTimeout(() => { if (alive) { timers = []; run(); } }, end + 300));
    };
    run();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [prep, shotCat, attack, moves, rollMs, fx]);   /* v2.3.2979: a new window, lane or stepper count is a new fight; v2.3.2986: so is the hero's own attack arriving; v2.3.2987: and his roll and stride; v2.3.2991: and the effects round a hit */
  const aim = React.useMemo(() => {
    if (slimeX == null) return null;
    return {
      hot: fx && fx.hot,
      arrowLen: attack && attack.arrowLen ? attack.arrowLen : 0,
      arrowLead: attack && attack.arrowLead ? attack.arrowLead : 0,
      grip: !!(shot === 'bow' && attack && attack.frames && attack.grip && fig),
      feet: [slimeX + SLIME_PX / 2, slimeY + SLIME_BASE_ROW.hit],
      pin: (vi) => {
        const n = pinSet ? pinSet.pins.length : 0;
        const p = n ? pinSet.pins[((vi % n) + n) % n] : null;
        return p ? [slimeX + p.u + 0.5, slimeY + p.v + 0.5] : null;
      },
      start: () => launch,
    };
  }, [slimeX, slimeY, pinSet, launch, fx, attack, shot, fig]);
  const filmAt = (f) => (f.kind === 'gunk' || f.kind === 'gunk2' ? (aim && aim.feet) : (aim && (aim.pin(f.vi) || aim.feet)));
  if (!has) return null;
  /* ═══ v2.3.3002: ONE LANE PER HALF ═══
     "Now" on top, "+n" under it, each its own stage with its own hero,
     slime, numbers and bar, on one clock (loopSteps).  Everything measured
     (the stage, the hero's spot, the slime's pins, the films) is the same in
     both lanes, so it is measured once, in the first. */
  const lane = (s, i) => {
    const tag = i === 1 ? '+' + pts : 'Now';
    return (
      <div key={i} className={'bt-sd-lane' + (i === 1 ? ' bt-sd-lane--after' : '')} data-sd-lane={i}>
      <div className="bt-sd-stage" ref={i === 0 ? stageRef : undefined} style={{ height: SCENE_H }}>
      <div ref={i === 0 ? heroRef : undefined} className={'bt-sd-hero' + (s.hero.kind ? ' bt-sd-hero--' + s.hero.kind : '')}
        style={s.hero.kind === 'trek' && s.hero.ms ? { animationDuration: s.hero.ms + 'ms' } : undefined}>
        {/* v2.3.2230 (owner: "the character preview is facing the wrong way"):
            he faces the slime.  v2.3.2986: side-on (east) rather than the
            three-quarter southeast, because east is the facing the world's
            attack sheets are drawn in -- and he now attacks with them. */}
        <Fighter weapon={weapon} shield={shield} staff={shot === 'staff'} atk={s.atk} kick={s.kick}
          mv={s.mv} walk={s.walk} attack={attack} special={fx && fx.special} moves={moves} fig={fig} onDrawn={i === 0 ? onDrawn : undefined} />
        {s.guard && <img className="bt-sd-shield bt-sd-shield--held" src={ICON.shield} alt="" draggable={false} />}
        {s.shield > 0 && <img key={'s' + s.shield} className="bt-sd-shield" src={ICON.shield} alt="" draggable={false} />}
      </div>
      {/* v2.3.2991: what a hit throws BEHIND the slime, then the slime with its
          arrows in it, then what is thrown in front */}
      {fx && s.films.map((f) => <Film key={'fb' + f.id} f={f} F={fx[f.kind]} layer={0} at={filmAt(f)} />)}
      <Slime anim={s.slime} blue={s.blue} stuck={s.stuck} fx={fx} pins={pinSet} />
      {fx && s.films.map((f) => <Film key={'ff' + f.id} f={f} F={fx[f.kind]} layer={1} at={filmAt(f)} />)}
      {s.slimeBar && s.slime.kind !== 'death' && <SlimeBar b={s.slimeBar} />}
      {s.orb > 0 && <i key={'o' + s.orb} className="bt-sd-orb"
        style={{ backgroundImage: `url(${ORB_URL})`, animationDuration: SLIME_THROW.FLIGHT_MS + 'ms', ...(orbDx ? { '--sd-orb-dx': orbDx + 'px' } : null) }} />}
      {s.shots.map((x) => <Shot key={'sh' + x.id} s={x} aim={aim} />)}
      {s.pops.map((p) => <Pop key={p.id} p={p} />)}
      {s.point > 0 && (
        <span key={'p' + s.point} className="bt-sd-point">
          <img src={iconSrc} alt="" draggable={false} /><b>+{pts}</b>
        </span>
      )}
      {/* v2.3.2979: which half this is -- "Now", or the brass "+n".
          v2.3.3002: one per lane, both on screen at once. */}
      {prep && prep.kind !== 'empty' && (
        <span className={'bt-sd-tag' + (i === 1 ? ' bt-sd-tag--after' : '')} data-sd-phase={i}>{tag}</span>
      )}
      </div>
      {/* The bar sits UNDER the stage, where the Equipment screen keeps the
          vitals under the figure -- and clear of the numbers rising off
          the hero's head.  v2.3.3002: each lane's under its own fight. */}
      {s.bar && <Bar b={s.bar} />}
      </div>
    );
  };
  return (
    <div className="bt-sd" data-stat-demo={stat} data-sd-kind={prep ? prep.kind : ''} data-sd-lanes={lanes.length} aria-hidden="true">
      {lanes.map(lane)}
      {prep && prep.verdict && <Verdict v={prep.verdict} capped={prep.capped} />}
      {/* v2.3.3008: a second line where one stat buys two things (Max MP: the
          bar, and the casts it pays for) */}
      {prep && prep.verdict2 && <Verdict v={prep.verdict2} capped={prep.capped} second />}
      {prep && prep.note && <div className="bt-sd-note" data-sd-note="">{prep.note}</div>}
    </div>
  );
};

/** For QA, and for the window deciding whether to reserve room: which stats
 *  have a scene. */
export const STAT_DEMO_KEYS = SIM_STATS;
