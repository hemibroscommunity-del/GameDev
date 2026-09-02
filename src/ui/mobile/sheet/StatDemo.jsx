import React from 'react';
import { CharacterView } from './CharacterView.jsx';
import { VitalBar, VITAL_ICONS } from './VitalBar.jsx';
import { DMG_CRIT_COLOR } from '@/rendering/systems/effectsRenderer.js';
import { ELEMENTS } from '@/data/elements.js';

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
 *     is hit, the lunge when it shoots, and its orb).
 *   - The real health / energy bar (VitalBar) with its in-trough readout,
 *     for the stats that move one.
 *   - Hit numbers in the combat renderer's own dress: 21px white with the
 *     black stroke; a crit 38px in DMG_CRIT_COLOR with the crit mark beside
 *     it (v2.3.2211/2212); damage you take in the same red, with the heart,
 *     as monsterCombat pops it; 'Dodged!' in its green.
 *
 * It plays BEFORE -> AFTER: the scene runs once as things are, then a point
 * lands on the stat (the row's own icon, a brass +1), and the same scene
 * runs again with the stat's effect exaggerated -- the crit that used to be
 * one in four is one in two, the bar you just watched drain is half again
 * as long, the blow that took twenty takes eight.  No captions: the second
 * pass is read against the first, which is the comparison a definition
 * cannot carry.  The real per-point rate and the real numbers print under
 * the scene (InfoPopup rows), so nothing here is mistaken for arithmetic.
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
 * URLs are used here so the cache is what answers.  The stat icon is the
 * one the row is already showing. */

/* Slime strips: horizontal, 128px cells (slimeSprites.js), drawn at cell
   size so the blob (rows 29-86 of the cell) stands ~57px tall against the
   ~85px figure -- the proportion the world draws.  A strip's
   background-size is (frames * 128) x 128; the box hangs 33px below the
   stage so row 86 lands on the ground line (game.css .bt-sd-slime). */
const SLIME_PX = 128;
const SLIME = {
  idle:  { url: '/sprites/monsters/slime-idle-v5.png',  frames: 24 },
  hit:   { url: '/sprites/monsters/slime-hit-v1.png',   frames: 24 },
  shoot: { url: '/sprites/monsters/slime-shoot-v2.png', frames: 8 },
};
const ORB_URL = '/sprites/monsters/slime-projectile-v1.png';
/* The combat renderer's popup icons, at the URLs it fetches them from
   (_loadPopupIcon appends ?v=2.3.2201; hero/crit.webp is the Crit row's own
   icon and is cached under that row's URL). */
const ICON = {
  crit:   '/icons/ui/hero/crit.webp?v=2.3.1694',
  heart:  '/icons/popups/heart.webp?v=2.3.2201',
  shield: '/icons/popups/shield-defense.webp?v=2.3.2201',
};

/* The character: CharacterView composites a 256 square; cropped to its
   measured figure window (FIGURE_W_FRAC) so the scene holds the person, not
   the empty frame around them. */
const HERO_SIZE = 120;
const SCENE_H = 130;

/* ── the timeline ───────────────────────────────────────────────────────
   A scene is a list of {t, patch} beats; each patch is a function of the
   previous state.  `Script` collects them in order with a running clock so
   a scene reads as a story rather than as a table of milliseconds. */
class Script {
  constructor() { this.t = 0; this.steps = []; this.n = 0; }
  at(dt, patch) { this.t += dt; this.steps.push({ t: this.t, patch }); return this; }
  /* One combat number over the hero or the slime.  Removed after it has
     risen and faded (the CSS animation is 1.05s). */
  pop(side, text, kind, dx) {
    const id = ++this.n;
    this.at(0, (s) => ({ pops: s.pops.concat({ id, side, text, kind, dx: dx || 0 }) }));
    const t = this.t;
    this.steps.push({ t: t + 1100, patch: (s) => ({ pops: s.pops.filter((p) => p.id !== id) }) });
    return this;
  }
  /* The hero lunges; the slime squashes and a number comes off it. */
  strike(text, kind, dx, extra) {
    /* The lunge is a class toggled on, then off 340ms later (the length of
       its CSS animation) -- NOT a keyed remount: the wrapper holds the
       character's canvas, and a new key would repaint it every swing. */
    this.at(0, (s) => ({ hero: { kind: 'swing', n: s.hero.n + 1 } }));
    this.steps.push({ t: this.t + 340, patch: () => ({ hero: { kind: null, n: 0 } }) });
    this.at(160, (s) => ({ slime: { kind: 'hit', n: s.slime.n + 1 }, ...(extra ? extra(s) : null) }));
    this.pop('slime', text, kind, dx);
    this.steps.push({ t: this.t + 900, patch: () => ({ slime: { kind: 'idle', n: 0 } }) });
    return this;
  }
  /* The slime lunges and throws its orb; `land` is what happens when it
     arrives at the hero (~380ms of flight). */
  shoot(land) {
    this.at(0, (s) => ({ slime: { kind: 'shoot', n: s.slime.n + 1 } }));
    this.at(220, (s) => ({ orb: s.orb + 1 }));
    this.at(380, (s) => ({ orb: 0, slime: { kind: 'idle', n: 0 }, ...land(s) }));
    return this;
  }
  /* The point lands: the row's icon rises with a +1, and the bars refill. */
  point(reset) {
    this.at(500, (s) => ({ point: s.point + 1, ...(reset ? reset(s) : null) }));
    this.at(900, () => ({ point: 0 }));
    return this;
  }
}

const START = {
  pops: [], hero: { kind: null, n: 0 }, slime: { kind: 'idle', n: 0 },
  orb: 0, point: 0, shield: 0, bar: null,
};

/* Bars: `bar` is {kind, cur, max, base} where `base` is the max the trough
   was drawn at when the scene began -- the trough itself gets LONGER as the
   max rises, which is what "more HP" looks like rather than a fuller bar. */
const bar = (kind, cur, max, base) => ({ bar: { kind, cur, max, base: base || max } });
const hurt = (s, n) => ({ bar: { ...s.bar, cur: Math.max(0, s.bar.cur - n) } });

/* ── the scenes ─────────────────────────────────────────────────────────
   Each returns {script, still}: the timeline, and the AFTER end-state drawn
   for reduced motion.  The BEFORE half plays honest-looking numbers; the
   AFTER half exaggerates the stat's job.  Text matches what the renderer
   would print: plain numbers off the slime, '-N' off you. */
const SCENES = {
  dmg: () => {
    const sc = new Script();
    sc.at(400).strike('12', 'hit').at(900).strike('12', 'hit', 10);
    sc.point();
    sc.at(400).strike('24', 'hit').at(900).strike('24', 'hit', 10);
    sc.at(700);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '24', kind: 'hit' }] } };
  },
  crit: () => {
    /* One in four goes gold; then every other one does. */
    const sc = new Script();
    sc.at(400).strike('10', 'hit', -8).at(800).strike('10', 'hit', 8)
      .at(800).strike('10', 'hit', -8).at(800).strike('25', 'crit', 6);
    sc.point();
    sc.at(400).strike('10', 'hit', -8).at(800).strike('25', 'crit', 6)
      .at(800).strike('10', 'hit', -8).at(800).strike('25', 'crit', 6);
    sc.at(700);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '25', kind: 'crit' }] } };
  },
  critDmg: () => {
    const sc = new Script();
    sc.at(400).strike('25', 'crit').at(1000).strike('25', 'crit', 8);
    sc.point();
    sc.at(400).strike('60', 'crit').at(1000).strike('60', 'crit', 8);
    sc.at(700);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '60', kind: 'crit' }] } };
  },
  aspd: () => {
    /* Same numbers, twice as many of them in the same time. */
    const sc = new Script();
    sc.at(400);
    for (let i = 0; i < 3; i++) sc.strike('10', 'hit', (i % 2) * 14 - 7).at(1000);
    sc.point();
    sc.at(400);
    for (let i = 0; i < 6; i++) sc.strike('10', 'hit', (i % 3) * 12 - 12).at(480);
    sc.at(500);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '10', kind: 'hit', dx: -10 }, { id: 2, side: 'slime', text: '10', kind: 'hit', dx: 10 }] } };
  },
  def: () => {
    /* The same orb, twice; after the point the shield shows and it lands
       for less. */
    const sc = new Script();
    sc.at(0, () => bar('hp', 100, 100));
    for (let i = 0; i < 2; i++) {
      sc.at(500).shoot((s) => hurt(s, 20)).pop('hero', '-20', 'hurt', i * 10 - 5);
    }
    sc.point((s) => ({ bar: { ...s.bar, cur: s.bar.max } }));
    for (let i = 0; i < 2; i++) {
      sc.at(500).shoot((s) => ({ ...hurt(s, 8), shield: s.shield + 1 })).pop('hero', '-8', 'hurt', i * 10 - 5);
      sc.steps.push({ t: sc.t + 700, patch: () => ({ shield: 0 }) });
    }
    sc.at(800);
    return { script: sc, still: { ...bar('hp', 84, 100), shield: 1, pops: [{ id: 1, side: 'hero', text: '-8', kind: 'hurt' }] } };
  },
  hp: () => {
    /* The bar you watched drain is half again as long after the point. */
    const sc = new Script();
    sc.at(0, () => bar('hp', 100, 100));
    sc.at(500).shoot((s) => hurt(s, 40)).pop('hero', '-40', 'hurt');
    sc.at(700).shoot((s) => hurt(s, 40)).pop('hero', '-40', 'hurt', 8);
    sc.point(() => bar('hp', 160, 160, 100));
    sc.at(500).shoot((s) => hurt(s, 40)).pop('hero', '-40', 'hurt');
    sc.at(700).shoot((s) => hurt(s, 40)).pop('hero', '-40', 'hurt', 8);
    sc.at(1000);
    return { script: sc, still: { ...bar('hp', 80, 160, 100), pops: [{ id: 1, side: 'hero', text: '-40', kind: 'hurt' }] } };
  },
  dodge: () => {
    /* Before: it lands.  After: you are not there when it arrives. */
    const sc = new Script();
    sc.at(0, () => bar('hp', 100, 100));
    for (let i = 0; i < 2; i++) {
      sc.at(500).shoot((s) => hurt(s, 20)).pop('hero', '-20', 'hurt', i * 10 - 5);
    }
    sc.point((s) => ({ bar: { ...s.bar, cur: s.bar.max } }));
    for (let i = 0; i < 2; i++) {
      sc.at(500);
      sc.steps.push({ t: sc.t + 260, patch: (s) => ({ hero: { kind: 'dodge', n: s.hero.n + 1 } }) });
      sc.shoot(() => ({})).pop('hero', 'Dodged!', 'dodged', i * 8 - 4);
      sc.steps.push({ t: sc.t + 600, patch: () => ({ hero: { kind: null, n: 0 } }) });
    }
    sc.at(800);
    return { script: sc, still: { ...bar('hp', 100, 100), pops: [{ id: 1, side: 'hero', text: 'Dodged!', kind: 'dodged' }] } };
  },
  stam: () => {
    /* Three swings empty the bar; with the point it is longer and the same
       three leave half of it. */
    const sc = new Script();
    sc.at(0, () => bar('stamina', 90, 90));
    sc.at(400);
    for (let i = 0; i < 3; i++) sc.strike('10', 'hit', (i % 2) * 14 - 7, (s) => ({ bar: { ...s.bar, cur: Math.max(0, s.bar.cur - 30) } })).at(700);
    sc.point(() => bar('stamina', 180, 180, 90));
    sc.at(400);
    for (let i = 0; i < 3; i++) sc.strike('10', 'hit', (i % 2) * 14 - 7, (s) => ({ bar: { ...s.bar, cur: Math.max(0, s.bar.cur - 30) } })).at(700);
    sc.at(700);
    return { script: sc, still: { ...bar('stamina', 90, 180, 90), pops: [{ id: 1, side: 'slime', text: '10', kind: 'hit' }] } };
  },
  elem: () => {
    /* A hit, then the burn ticks it leaves; the point makes the ticks bite. */
    const sc = new Script();
    sc.at(400).strike('10', 'hit');
    for (let i = 0; i < 3; i++) sc.at(550).pop('slime', '2', 'burn', (i % 2) * 16 - 8);
    sc.point();
    sc.at(400).strike('10', 'hit');
    for (let i = 0; i < 3; i++) sc.at(550).pop('slime', '7', 'burn', (i % 2) * 16 - 8);
    sc.at(900);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '7', kind: 'burn' }] } };
  },
};

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
};
const Pop = ({ p }) => {
  const st = POP_STYLE[p.kind] || POP_STYLE.hit;
  const icon = st.icon && <img className="bt-sd-pop-ic" src={st.icon} alt="" draggable={false} style={{ height: st.iconH }} />;
  return (
    <span className={'bt-sd-pop bt-sd-pop--' + p.side} data-sd-pop={p.kind}
      style={{ color: st.color, fontSize: st.size, '--sd-dx': (p.dx || 0) + 'px' }}>
      {st.before && icon}<span>{p.text}</span>{!st.before && icon}
    </span>
  );
};

const Slime = ({ anim }) => {
  const sheet = SLIME[anim.kind] || SLIME.idle;
  return (
    <span key={anim.kind + ':' + anim.n} className={'bt-sd-slime bt-sd-slime--' + (SLIME[anim.kind] ? anim.kind : 'idle')}
      style={{
        backgroundImage: `url(${sheet.url})`,
        backgroundSize: `${sheet.frames * SLIME_PX}px ${SLIME_PX}px`,
        '--sd-frames': sheet.frames, '--sd-strip': -((sheet.frames - 1) * SLIME_PX) + 'px',
      }} />
  );
};

/* The real bar, in the compact vitals' own dress (v2.3.1922 readout), with
   the trough drawn at base width and stretched by max/base. */
const Bar = ({ b }) => (
  <div className="bt-sd-vital" data-sd-bar={b.kind}>
    <img src={VITAL_ICONS[b.kind]} alt="" draggable={false} className="bt-sd-vital-ic" />
    <div className="bt-sd-vital-w" style={{ width: Math.round(120 * (b.max / b.base)) }}>
      <VitalBar kind={b.kind} cur={b.cur} max={b.max} thick={14} inset={(
        <span className="bt-sd-vital-n">{Math.ceil(b.cur)}<span className="bt-sd-vital-s">/</span>{b.max}</span>
      )} />
    </div>
  </div>
);

const reducedMotion = () => {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (e) { return false; }
};

/** The scene for one spendable stat.  Unknown keys render nothing rather
 *  than a broken stage, so a new stat gets its description and its numbers
 *  on day one and its scene when somebody writes it. */
export const StatDemo = ({ stat, iconSrc, weapon, shield }) => {
  const make = SCENES[stat];
  const [s, setS] = React.useState(START);
  React.useEffect(() => {
    if (!make) return undefined;
    if (reducedMotion()) { setS({ ...START, ...make().still }); return undefined; }
    let timers = [];
    let alive = true;
    const run = () => {
      const { script } = make();
      setS(START);
      for (const step of script.steps) {
        timers.push(setTimeout(() => { if (alive) setS((prev) => ({ ...prev, ...(step.patch ? step.patch(prev) : null) })); }, step.t));
      }
      const end = script.steps.reduce((m, st) => Math.max(m, st.t), 0) + 400;
      timers.push(setTimeout(() => { if (alive) { timers = []; run(); } }, end));
    };
    run();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [stat]);
  if (!make) return null;
  return (
    <div className="bt-sd" data-stat-demo={stat} aria-hidden="true">
      <div className="bt-sd-stage" style={{ height: SCENE_H }}>
      <div className={'bt-sd-hero' + (s.hero.kind ? ' bt-sd-hero--' + s.hero.kind : '')}>
        <CharacterView size={HERO_SIZE} weapon={weapon} shield={shield} crop />
        {s.shield > 0 && <img key={'s' + s.shield} className="bt-sd-shield" src={ICON.shield} alt="" draggable={false} />}
      </div>
      <Slime anim={s.slime} />
      {s.orb > 0 && <i key={'o' + s.orb} className="bt-sd-orb" style={{ backgroundImage: `url(${ORB_URL})` }} />}
      {s.pops.map((p) => <Pop key={p.id} p={p} />)}
      {s.point > 0 && (
        <span key={'p' + s.point} className="bt-sd-point">
          <img src={iconSrc} alt="" draggable={false} /><b>+1</b>
        </span>
      )}
      </div>
      {/* The bar sits UNDER the stage, where the Equipment screen keeps the
          vitals under the figure -- and clear of the numbers rising off
          the hero's head. */}
      {s.bar && <Bar b={s.bar} />}
    </div>
  );
};

/** For QA: which stats have a scene. */
export const STAT_DEMO_KEYS = Object.keys(SCENES);
