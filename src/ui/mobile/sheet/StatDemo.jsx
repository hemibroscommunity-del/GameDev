import React from 'react';
import { CharacterView } from './CharacterView.jsx';
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
/* The point lands between the halves: the badge rises for 900 ms, and the
   second half starts a beat after it has gone. */
const POINT_MS = 900;
const POINT_GAP_MS = 1100;

const START = {
  pops: [], hero: { kind: null, n: 0, ms: 0 }, slime: { kind: 'idle', n: 0, ms: 0 },
  slimeBar: null, orb: 0, shots: [], point: 0, shield: 0, guard: false,
  bar: null, phase: 0, blue: false,
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
  const slime = (t, kind, back, ms) => {
    const id = ++ctx.slimeN;
    at(t, () => ({ slime: { kind, n: id, ms: ms || 0 } }));
    if (back) at(t + back, (s) => (s.slime.n === id ? { slime: { kind: 'idle', n: id, ms: 0 } } : {}));
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
  const cat = ctx.shot;
  /* the half begins on a fresh slime and full bars */
  at(0, () => ({
    phase, blue: !!pass.blue, guard: false, orb: 0, shots: [],
    slime: { kind: 'idle', n: ++ctx.slimeN, ms: 0 },
    slimeBar: pass.slime ? hpBar(pass.slime.hp, pass.slime.max) : null,
    bar: pass.bar ? { ...pass.bar, base: ctx.barBase || pass.bar.max } : null,
  }));
  for (const b of pass.beats) {
    switch (b.k) {
      case 'atk':
        if (b.ranged && cat) { hero(b.t, 'loose', 260); shot(b.t, { cat }, 200); }
        else hero(b.t, 'swing', 340);
        break;
      case 'special':
        if (b.ranged && cat) {
          hero(b.t, 'loose', 260);
          for (let j = 0; j < (b.shots || 1); j++) shot(b.t + j * (b.gapMs || 0), { cat, big: !!b.big }, 200);
        } else hero(b.t, 'special', 420);
        break;
      case 'short':
        if (b.ranged && cat) { hero(b.t, 'loose', 260); shot(b.t, { cat, short: true, frac: b.frac }, 420); }
        else hero(b.t, 'short', 340);
        break;
      case 'hit':
        if (!b.kill) slime(b.t, 'hit', 800);
        at(b.t, () => ({ slimeBar: hpBar(b.hp, b.max) }));
        pop(b.t, 'slime', b.text, b.crit ? 'crit' : 'hit', b.dx || 0);
        break;
      case 'tick':
      case 'recoil':
        at(b.t, () => ({ slimeBar: hpBar(b.hp, b.max) }));
        pop(b.t, 'slime', b.text, 'burn', 0, (ELEMENTS[b.element] || {}).color);
        break;
      case 'death':
      case 'burst':
        slime(b.t, 'death', 0);
        if (b.k === 'death') at(b.t, (s) => (s.slimeBar ? { slimeBar: { ...s.slimeBar, cur: 0 } } : {}));
        break;
      case 'spawn':
        slime(b.t, 'spawn', 320);
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
        if (b.kind === 'dodged') hero(b.t - 150, 'dodge', 600);
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
      case 'roll':
        hero(b.t, 'dodge', 600);
        at(b.t, (s) => (s.bar ? { bar: { ...s.bar, cur: b.stam } } : {}));
        break;
      case 'trek':
        hero(b.t, 'trek', b.ms, b.ms);
        break;
      default: break;
    }
  }
  return steps;
}

/* One loop: the before half, the point, the after half.  A stat at its cap
   has no after half -- the before half simply loops, and the window's own
   "at its cap" line says why. */
function loopSteps(prep, passes, shot) {
  const ctx = { heroN: 0, slimeN: 0, popN: 0, shotN: 0, shot, barBase: passes[0] && passes[0].bar ? passes[0].bar.max : 0 };
  const steps = passSteps(passes[0], 0, 0, ctx);
  let end = passes[0].end;
  if (passes[1]) {
    const T0 = passes[0].end;
    steps.push({ t: T0, patch: (s) => ({ point: s.point + 1 }) });
    steps.push({ t: T0 + POINT_MS, patch: () => ({ point: 0 }) });
    const T1 = T0 + POINT_GAP_MS;
    steps.push(...passSteps(passes[1], T1, 1, ctx));
    end = T1 + passes[1].end;
  }
  return { steps, end };
}

/* Reduced motion: the last half's closing frame, drawn still, with its last
   number on it. */
function stillOf(prep, shot) {
  const passes = prep.play(1);
  const p = passes[1] || passes[0];
  if (!p) return START;
  const ctx = { heroN: 0, slimeN: 0, popN: 0, shotN: 0, shot, barBase: passes[0] && passes[0].bar ? passes[0].bar.max : 0 };
  let s = { ...START };
  const steps = passSteps(p, 0, passes[1] ? 1 : 0, ctx).sort((a, b) => a.t - b.t);
  for (const st of steps) s = { ...s, ...st.patch(s) };
  const last = [...p.beats].reverse().find((b) => b.text);
  return {
    ...s, hero: { kind: null, n: 0, ms: 0 }, shots: [], orb: 0, point: 0,
    slime: s.slime.kind === 'death' ? s.slime : { kind: 'idle', n: 0, ms: 0 },
    pops: last ? [{ id: 1, side: (last.k === 'land') ? 'hero' : 'slime', text: last.text,
      kind: last.k === 'land' ? (last.kind === 'hurt' || last.kind === 'burst' ? 'hurt' : 'dodged') : (last.crit ? 'crit' : (last.k === 'tick' || last.k === 'recoil') ? 'burn' : last.k === 'miss' ? 'miss' : 'hit'),
      color: (last.k === 'tick' || last.k === 'recoil') ? (ELEMENTS[last.element] || {}).color : undefined }] : [],
  };
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
const Shot = ({ s }) => {
  const a = SHOT[s.cat];
  if (!a) return null;
  return (
    /* v2.3.2616: `short` flies part of the way and fades, for Range's before
       half.  v2.3.2979: and exactly the part its real reach covers (--sd-short,
       statSim's frac of the gap).  `big` is the staff's big bolt. */
    <i className={'bt-sd-shot bt-sd-shot--' + s.cat + (s.short ? ' bt-sd-shot--short' : '') + (s.big ? ' bt-sd-shot--big' : '')}
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
      }} />
  );
};

const Slime = ({ anim, blue }) => {
  const kind = SLIME[anim.kind] ? anim.kind : (anim.kind === 'death' ? 'death' : 'idle');
  const sheet = SLIME[kind] || SLIME.idle;
  /* v2.3.2979: the blue slime (Resist's scene) wears the preloader's baked
     retint; the green sheet stands in if the bake did not happen. */
  const url = (blue && blueSlimeSheet(kind)) || sheet.url;
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
      }} />
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
const Verdict = ({ v, capped }) => (
  <div className="bt-sd-verdict" data-sd-verdict="">
    <span className="bt-sd-verdict-l">{v.label}</span>
    <span className="bt-sd-verdict-v">
      {v.now}
      {!capped && v.after != null && <> → <b>{v.after}</b></>}
    </span>
  </div>
);

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
  const prep = React.useMemo(() => {
    if (!has) return null;
    const S = liveState();
    const R = rpg || (S && S.rpg);
    if (!R) return null;
    try {
      return prepareStatScene(R, stat, cat || shot || 'sword', pts, weapon || null, !!shield, (S && S._serverCaps) || {});
    } catch (e) { return null; }
  }, [has, stat, cat, shot, pts, weapon, shield, rpg]);
  const [s, setS] = React.useState(START);
  React.useEffect(() => {
    if (!prep || prep.kind === 'empty') { setS(START); return undefined; }
    if (reducedMotion()) { setS(stillOf(prep, shotCat)); return undefined; }
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
          texts: passes.map((p) => (p ? p.beats.filter((b) => b.text).map((b) => (b.k === 'land' ? 'hero:' : 'slime:') + b.text) : null)),
        };
      } catch (e) { /* no window: nothing to report to */ }
      const { steps, end } = loopSteps(prep, passes, shotCat);
      /* v2.3.2979: the t=0 steps (the fresh slime, both bars) go in WITH the
         reset, not a setTimeout(0) after it.  START has no bars, and the vital
         row under the stage sits in normal flow, so a frame painted between
         the two dropped the row and jumped everything below it ~26px -- every
         loop, and (the stepper re-prepares the scene) every press of [+]
         (reviewer-found).  Applied in the order their timers would have run. */
      let first = START;
      for (const step of steps) if (step.t <= 0) first = { ...first, ...step.patch(first) };
      setS(first);
      for (const step of steps) {
        if (step.t <= 0) continue;
        timers.push(setTimeout(() => { if (alive) setS((prev) => ({ ...prev, ...step.patch(prev) })); }, step.t));
      }
      timers.push(setTimeout(() => { if (alive) { timers = []; run(); } }, end + 300));
    };
    run();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [prep, shotCat]);   /* v2.3.2979: a new window, lane or stepper count is a new fight */
  if (!has) return null;
  const tag = s.phase === 1 ? '+' + pts : 'Now';
  return (
    <div className="bt-sd" data-stat-demo={stat} data-sd-kind={prep ? prep.kind : ''} aria-hidden="true">
      <div className="bt-sd-stage" style={{ height: SCENE_H }}>
      <div className={'bt-sd-hero' + (s.hero.kind ? ' bt-sd-hero--' + s.hero.kind : '')}
        style={s.hero.kind === 'trek' && s.hero.ms ? { animationDuration: s.hero.ms + 'ms' } : undefined}>
        {/* v2.3.2230 (owner: "the character preview is facing the wrong way"):
            southEAST, so he faces the slime.  The scene stands him on the
            left and the slime on the right, and CharacterView's default
            southwest turned his back on it. */}
        <CharacterView size={HERO_SIZE} weapon={weapon} shield={shield} crop dir="southeast" />
        {s.guard && <img className="bt-sd-shield bt-sd-shield--held" src={ICON.shield} alt="" draggable={false} />}
        {s.shield > 0 && <img key={'s' + s.shield} className="bt-sd-shield" src={ICON.shield} alt="" draggable={false} />}
      </div>
      <Slime anim={s.slime} blue={s.blue} />
      {s.slimeBar && s.slime.kind !== 'death' && <SlimeBar b={s.slimeBar} />}
      {s.orb > 0 && <i key={'o' + s.orb} className="bt-sd-orb"
        style={{ backgroundImage: `url(${ORB_URL})`, animationDuration: SLIME_THROW.FLIGHT_MS + 'ms' }} />}
      {s.shots.map((x) => <Shot key={'sh' + x.id} s={x} />)}
      {s.pops.map((p) => <Pop key={p.id} p={p} />)}
      {s.point > 0 && (
        <span key={'p' + s.point} className="bt-sd-point">
          <img src={iconSrc} alt="" draggable={false} /><b>+{pts}</b>
        </span>
      )}
      {/* v2.3.2979: which half is playing.  The badge marks the moment the
          points go in; this says which side of it you are watching, which a
          real (and so often small) difference needs. */}
      {prep && prep.kind !== 'empty' && (
        <span className={'bt-sd-tag' + (s.phase === 1 ? ' bt-sd-tag--after' : '')} data-sd-phase={s.phase}>{tag}</span>
      )}
      </div>
      {/* The bar sits UNDER the stage, where the Equipment screen keeps the
          vitals under the figure -- and clear of the numbers rising off
          the hero's head. */}
      {s.bar && <Bar b={s.bar} />}
      {prep && prep.verdict && <Verdict v={prep.verdict} capped={prep.capped} />}
      {prep && prep.note && <div className="bt-sd-note" data-sd-note="">{prep.note}</div>}
    </div>
  );
};

/** For QA, and for the window deciding whether to reserve room: which stats
 *  have a scene. */
export const STAT_DEMO_KEYS = SIM_STATS;
