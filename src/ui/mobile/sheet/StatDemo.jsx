import React from 'react';
import { CharacterView } from './CharacterView.jsx';
import { VitalBar, VITAL_ICONS } from './VitalBar.jsx';
import { DMG_CRIT_COLOR } from '@/rendering/systems/effectsRenderer.js';
import { ELEMENTS } from '@/data/elements.js';
import { prog3CatFor } from '@/data/prog3.js';   /* v2.3.2231: weapon type -> combat lane */
import { SLIME, SLIME_PX, ORB_URL, SHOT, ICON } from '@/data/statDemoAssets.js';   /* v2.3.2616: shared with the preloader */

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
/* ═══ v2.3.2616: THE ASSET LIST MOVED OUT ═══
   SLIME / ORB_URL / SHOT / ICON now live in src/data/statDemoAssets.js, with
   the notes on why each URL carries the ?v= it does.  They moved because the
   PRELOADER needs the same list and must not import this component to get it
   (statDemoPreload.js).  One list, two readers — a scene that adds an asset
   adds it there and is warmed on the loading screen for free. */

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
  constructor(shot) { this.t = 0; this.steps = []; this.n = 0; this.shot = shot || null; }
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
  /* The hero attacks; the slime squashes and a number comes off it.
     MELEE lunges.  RANGED looses a shot that crosses the gap and lands --
     the flight IS the tell, so the impact beat is what it always was and
     every scene's rhythm is unchanged (v2.3.2231).  `this.shot` is the
     scene's weapon category, set by StatDemo before the script is built. */
  strike(text, kind, dx, extra) {
    /* The motion is a class toggled on, then off after its CSS animation --
       NOT a keyed remount: the wrapper holds the character's canvas, and a
       new key would repaint it every swing. */
    const ranged = !!(this.shot && SHOT[this.shot]);
    this.at(0, (s) => ({
      hero: { kind: ranged ? 'loose' : 'swing', n: s.hero.n + 1 },
      ...(ranged ? { shot: s.shot + 1 } : null),
    }));
    this.steps.push({ t: this.t + (ranged ? 260 : 340), patch: () => ({ hero: { kind: null, n: 0 } }) });
    this.at(ranged ? 200 : 160, (s) => ({
      slime: { kind: 'hit', n: s.slime.n + 1 },
      ...(ranged ? { shot: 0 } : null),
      ...(extra ? extra(s) : null),
    }));
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
  /* ═══ v2.3.2616: THE ATTACK THAT DOES NOT GET THERE ═══
     Range's whole claim is reach, so the BEFORE half has to visibly fall
     short.  Same loose, same lunge, same rhythm as strike() — what differs is
     that the shot stops in the gap and fades, the slime is never touched, and
     no damage number comes off it.  The grey "Short!" is the non-damage event
     in the dress 'Dodged!' already established. */
  fallShort() {
    const ranged = !!(this.shot && SHOT[this.shot]);
    this.at(0, (s) => ({
      hero: { kind: ranged ? 'loose' : 'short', n: s.hero.n + 1 },
      ...(ranged ? { shot: s.shot + 1, shotShort: 1 } : null),
    }));
    this.steps.push({ t: this.t + (ranged ? 260 : 340), patch: () => ({ hero: { kind: null, n: 0 } }) });
    this.at(ranged ? 340 : 240, () => (ranged ? { shot: 0, shotShort: 0 } : {}));
    this.pop('slime', 'Short!', 'miss');
    return this;
  }
  /* ═══ v2.3.2616: GROUND COVERED ═══
     Move Speed is read the way aspd reads attack speed — same span of time,
     more of it done.  One round trip before the point, two after.  `fast` is
     not a different path, only a shorter one in time, so what the eye compares
     is distance per second and nothing else. */
  trek(fast) {
    this.at(0, (s) => ({ hero: { kind: fast ? 'trekfast' : 'trek', n: s.hero.n + 1 } }));
    this.steps.push({ t: this.t + (fast ? 1200 : 2400), patch: () => ({ hero: { kind: null, n: 0 } }) });
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
  orb: 0, shot: 0, shotShort: 0, point: 0, shield: 0, bar: null,
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
  dmg: (shot) => {
    const sc = new Script(shot);
    sc.at(400).strike('12', 'hit').at(900).strike('12', 'hit', 10);
    sc.point();
    sc.at(400).strike('24', 'hit').at(900).strike('24', 'hit', 10);
    sc.at(700);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '24', kind: 'hit' }] } };
  },
  crit: (shot) => {
    /* One in four goes gold; then every other one does. */
    const sc = new Script(shot);
    sc.at(400).strike('10', 'hit', -8).at(800).strike('10', 'hit', 8)
      .at(800).strike('10', 'hit', -8).at(800).strike('25', 'crit', 6);
    sc.point();
    sc.at(400).strike('10', 'hit', -8).at(800).strike('25', 'crit', 6)
      .at(800).strike('10', 'hit', -8).at(800).strike('25', 'crit', 6);
    sc.at(700);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '25', kind: 'crit' }] } };
  },
  critDmg: (shot) => {
    const sc = new Script(shot);
    sc.at(400).strike('25', 'crit').at(1000).strike('25', 'crit', 8);
    sc.point();
    sc.at(400).strike('60', 'crit').at(1000).strike('60', 'crit', 8);
    sc.at(700);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '60', kind: 'crit' }] } };
  },
  /* ═══ v2.3.2592: LUCK — both halves of a crit in one scene ═══
     Before: one hit in four goes gold.  After the point: one in two does,
     AND the gold ones land harder — the two things a Luck point buys,
     read against each other rather than captioned. */
  luck: (shot) => {
    const sc = new Script(shot);
    sc.at(400).strike('10', 'hit', -8).at(800).strike('10', 'hit', 8)
      .at(800).strike('10', 'hit', -8).at(800).strike('25', 'crit', 6);
    sc.point();
    sc.at(400).strike('10', 'hit', -8).at(800).strike('40', 'crit', 6)
      .at(800).strike('10', 'hit', -8).at(800).strike('40', 'crit', 6);
    sc.at(700);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '40', kind: 'crit' }] } };
  },
  /* ═══ v2.3.2592: SPECIAL — the big hit is the one that grows ═══
     An ordinary hit and then the special, twice; after the point the
     ordinary hit is unchanged and the special is half again as large,
     which is the whole claim the stat makes. */
  special: (shot) => {
    const sc = new Script(shot);
    sc.at(400).strike('10', 'hit', -8).at(900).strike('30', 'hit', 8);
    sc.point();
    sc.at(400).strike('10', 'hit', -8).at(900).strike('55', 'hit', 8);
    sc.at(700);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '55', kind: 'hit' }] } };
  },
  aspd: (shot) => {
    /* Same numbers, twice as many of them in the same time. */
    const sc = new Script(shot);
    sc.at(400);
    for (let i = 0; i < 3; i++) sc.strike('10', 'hit', (i % 2) * 14 - 7).at(1000);
    sc.point();
    sc.at(400);
    for (let i = 0; i < 6; i++) sc.strike('10', 'hit', (i % 3) * 12 - 12).at(480);
    sc.at(500);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '10', kind: 'hit', dx: -10 }, { id: 2, side: 'slime', text: '10', kind: 'hit', dx: 10 }] } };
  },
  def: (shot) => {
    /* The same orb, twice; after the point the shield shows and it lands
       for less. */
    const sc = new Script(shot);
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
  hp: (shot) => {
    /* The bar you watched drain is half again as long after the point. */
    const sc = new Script(shot);
    sc.at(0, () => bar('hp', 100, 100));
    sc.at(500).shoot((s) => hurt(s, 40)).pop('hero', '-40', 'hurt');
    sc.at(700).shoot((s) => hurt(s, 40)).pop('hero', '-40', 'hurt', 8);
    sc.point(() => bar('hp', 160, 160, 100));
    sc.at(500).shoot((s) => hurt(s, 40)).pop('hero', '-40', 'hurt');
    sc.at(700).shoot((s) => hurt(s, 40)).pop('hero', '-40', 'hurt', 8);
    sc.at(1000);
    return { script: sc, still: { ...bar('hp', 80, 160, 100), pops: [{ id: 1, side: 'hero', text: '-40', kind: 'hurt' }] } };
  },
  dodge: (shot) => {
    /* Before: it lands.  After: you are not there when it arrives. */
    const sc = new Script(shot);
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
  /* ═══ v2.3.2616: STAMINA IS WHAT YOU BLOCK AND DODGE WITH ═══
     Owner: "Change stamina info animation from shooting an orb to using
     shield block or/and dodging."
     The old scene had the hero swinging three times to drain the bar, and
     strike() looses a projectile for a ranged weapon — so with a staff in hand
     it was literally a man throwing orbs, which is what they saw.
     It is also the wrong idea twice over. Stamina in this game pays for shield
     bash (30% of the pool, and it needs a held shield) and for the contextual
     dodge — server/src/abilities.js STAM_ABILITIES. So the scene now shows the
     pool doing its actual job, and both of the moves the owner named.
     BEFORE: three orbs come in. Block, dodge — and the pool is empty, so the
     third one simply lands on you.
     AFTER: the same three orbs against a pool half again as long, and there is
     enough left to answer all three. The bar is the star of this scene; the
     trough itself grows, which is what "more stamina" looks like. */
  stam: (shot) => {
    const sc = new Script(shot);
    const spend = (n) => (s) => ({ bar: { ...s.bar, cur: Math.max(0, s.bar.cur - n) } });
    const guard = (s) => ({ ...spend(30)(s), shield: s.shield + 1 });
    sc.at(0, () => bar('stamina', 60, 60));
    sc.at(400).shoot(guard).pop('hero', 'Blocked!', 'dodged', -6);
    sc.steps.push({ t: sc.t + 700, patch: () => ({ shield: 0 }) });
    sc.at(700);
    sc.steps.push({ t: sc.t + 260, patch: (s) => ({ hero: { kind: 'dodge', n: s.hero.n + 1 } }) });
    sc.shoot(spend(30)).pop('hero', 'Dodged!', 'dodged', 6);
    sc.steps.push({ t: sc.t + 600, patch: () => ({ hero: { kind: null, n: 0 } }) });
    /* Nothing left to spend, so the third one is simply taken. */
    sc.at(700).shoot((s) => hurt(s, 0)).pop('hero', '-20', 'hurt');
    sc.point(() => bar('stamina', 120, 120, 60));
    sc.at(400).shoot(guard).pop('hero', 'Blocked!', 'dodged', -6);
    sc.steps.push({ t: sc.t + 700, patch: () => ({ shield: 0 }) });
    sc.at(700);
    sc.steps.push({ t: sc.t + 260, patch: (s) => ({ hero: { kind: 'dodge', n: s.hero.n + 1 } }) });
    sc.shoot(spend(30)).pop('hero', 'Dodged!', 'dodged', 6);
    sc.steps.push({ t: sc.t + 600, patch: () => ({ hero: { kind: null, n: 0 } }) });
    sc.at(700).shoot(guard).pop('hero', 'Blocked!', 'dodged', 0);
    sc.steps.push({ t: sc.t + 700, patch: () => ({ shield: 0 }) });
    sc.at(800);
    return { script: sc, still: { ...bar('stamina', 30, 120, 60), shield: 1, pops: [{ id: 1, side: 'hero', text: 'Blocked!', kind: 'dodged' }] } };
  },
  elem: (shot) => {
    /* A hit, then the burn ticks it leaves; the point makes the ticks bite. */
    const sc = new Script(shot);
    sc.at(400).strike('10', 'hit');
    for (let i = 0; i < 3; i++) sc.at(550).pop('slime', '2', 'burn', (i % 2) * 16 - 8);
    sc.point();
    sc.at(400).strike('10', 'hit');
    for (let i = 0; i < 3; i++) sc.at(550).pop('slime', '7', 'burn', (i % 2) * 16 - 8);
    sc.at(900);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '7', kind: 'burn' }] } };
  },
  /* ═══ v2.3.2616: RANGE — REACH, NOT DAMAGE ═══
     prog3.js says so in its own words (dpsNote: 'reach, not damage'), so the
     number must NOT grow across the point or the scene teaches the wrong
     thing. The same attack falls short twice, then the point lands, then the
     same attack covers the gap and does the damage it always did.
     It reads for every lane without a special case: a bow's arrow and a
     staff's bolt stop in the air and fade, and bare hands / a sword lunge
     visibly less far, because fallShort() branches exactly where strike()
     does. */
  range: (shot) => {
    const sc = new Script(shot);
    sc.at(400).fallShort().at(900).fallShort();
    sc.point();
    sc.at(400).strike('12', 'hit').at(900).strike('12', 'hit', 10);
    sc.at(700);
    return { script: sc, still: { pops: [{ id: 1, side: 'slime', text: '12', kind: 'hit' }] } };
  },
  /* ═══ v2.3.2616: MOVE SPEED — GROUND COVERED IN THE SAME TIME ═══
     Read the way aspd reads attack speed, which is the idiom this file already
     has: the span does not change, the amount done in it does. One trip out
     and back before the point; two after. Nothing is captioned, and no damage
     number appears at all — prog3.js calls this 'movement, not damage'. */
  move: (shot) => {
    const sc = new Script(shot);
    sc.at(300).trek(false);
    sc.at(2500);
    sc.point();
    sc.at(300).trek(true);
    sc.at(1300).trek(true);
    sc.at(1400);
    return { script: sc, still: { hero: { kind: null, n: 0 } } };
  },
  /* ═══ v2.3.2616: ELEM RESIST — THE BURN SHRINKS, THE HIT DOES NOT ═══
     "−0.4% elemental damage taken", and the word that matters is ELEMENTAL.
     So the orb's own impact is the SAME -10 on both halves and only the burn
     ticks after it fall, from -8 to -2. A scene that shrank both would be
     claiming a flat damage reduction, which is a different stat.
     It is the elem scene read from the other side: there the burn is something
     you inflict and it grows, here it is something taken and it shrinks. */
  eres: (shot) => {
    const sc = new Script(shot);
    /* 620ms apart and spread across 36px: a pop lives 1100ms, so two are on
       screen at once and at the ±7 the other scenes use they land on top of
       each other. Measured off the strip, not guessed. */
    const tick = (n, i) => { sc.at(620, (s) => hurt(s, n)); sc.pop('hero', '-' + n, 'burn', (i - 1) * 18); };
    sc.at(0, () => bar('hp', 100, 100));
    sc.at(500).shoot((s) => hurt(s, 10)).pop('hero', '-10', 'hurt');
    for (let i = 0; i < 3; i++) tick(8, i);
    sc.point((s) => ({ bar: { ...s.bar, cur: s.bar.max } }));
    sc.at(500).shoot((s) => hurt(s, 10)).pop('hero', '-10', 'hurt');
    for (let i = 0; i < 3; i++) tick(2, i);
    sc.at(900);
    return { script: sc, still: { ...bar('hp', 84, 100), pops: [{ id: 1, side: 'hero', text: '-2', kind: 'burn' }] } };
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
  /* v2.3.2616: a non-damage event, in 'Dodged!'s dress but muted — nothing
     happened TO anybody, which is the whole point of the beat. */
  miss:   { color: '#9AA7AC', size: 19 },
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

/* The projectile the hero looses, in flight.  Keyed by the shot counter so
   each loose is a fresh element and therefore a fresh run of the CSS
   flight; the bolt additionally steps its 4-cel strip the way the slime
   steps its own (v2.3.2231). */
const Shot = ({ cat, n, short: isShort }) => {
  const a = SHOT[cat];
  if (!a) return null;
  return (
    /* v2.3.2616: `short` flies a fraction of the way and fades, for Range's
       before half.  A modifier class, not a second component — same sheet,
       same stepping, only the flight differs. */
    <i key={'sh' + n} className={'bt-sd-shot bt-sd-shot--' + cat + (isShort ? ' bt-sd-shot--short' : '')}
      style={{
        backgroundImage: `url(${a.url})`,
        width: a.w, height: a.h,
        backgroundSize: `${a.frames * a.w}px ${a.h}px`,
        /* the same two knobs bt-sd-strip reads for the slime: how many cels
           and how far to walk.  A 1-cel sheet walks 0px, so the arrow's
           strip animation is a no-op rather than a special case. */
        '--sd-frames': a.frames, '--sd-strip': -((a.frames - 1) * a.w) + 'px',
      }} />
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
/* v2.3.2696: `n` is the confirm window's stepper count -- the brass badge that
   lands between the two passes says "+3" when three points are about to go
   in.  Only the badge follows it: the scene is an exaggeration by design
   (above), so scaling its numbers by n would dress it up as arithmetic. */
export const StatDemo = ({ stat, iconSrc, weapon, shield, n }) => {
  const make = SCENES[stat];
  /* v2.3.2231: the attack this scene plays, read off the weapon in the
     figure's hands.  prog3CatFor is the game's own mapping (greatsword
     counts as sword), so the scene cannot disagree with the lane the points
     are actually being spent in.  `sword` and no weapon both mean the
     lunge, which is why only bow/staff have a SHOT entry. */
  const shot = weapon && weapon.type ? prog3CatFor(weapon.type) : null;
  const [s, setS] = React.useState(START);
  React.useEffect(() => {
    if (!make) return undefined;
    if (reducedMotion()) { setS({ ...START, ...make(shot).still }); return undefined; }
    let timers = [];
    let alive = true;
    const run = () => {
      const { script } = make(shot);
      setS(START);
      for (const step of script.steps) {
        timers.push(setTimeout(() => { if (alive) setS((prev) => ({ ...prev, ...(step.patch ? step.patch(prev) : null) })); }, step.t));
      }
      const end = script.steps.reduce((m, st) => Math.max(m, st.t), 0) + 400;
      timers.push(setTimeout(() => { if (alive) { timers = []; run(); } }, end));
    };
    run();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [stat, shot]);   /* v2.3.2231: a scene built for a bow must be rebuilt when the lane changes */
  if (!make) return null;
  return (
    <div className="bt-sd" data-stat-demo={stat} aria-hidden="true">
      <div className="bt-sd-stage" style={{ height: SCENE_H }}>
      <div className={'bt-sd-hero' + (s.hero.kind ? ' bt-sd-hero--' + s.hero.kind : '')}>
        {/* v2.3.2230 (owner: "the character preview is facing the wrong way"):
            southEAST, so he faces the slime.  The scene stands him on the
            left and the slime on the right, and CharacterView's default
            southwest turned his back on it. */}
        <CharacterView size={HERO_SIZE} weapon={weapon} shield={shield} crop dir="southeast" />
        {s.shield > 0 && <img key={'s' + s.shield} className="bt-sd-shield" src={ICON.shield} alt="" draggable={false} />}
      </div>
      <Slime anim={s.slime} />
      {s.orb > 0 && <i key={'o' + s.orb} className="bt-sd-orb" style={{ backgroundImage: `url(${ORB_URL})` }} />}
      {s.shot > 0 && <Shot cat={shot} n={s.shot} short={s.shotShort > 0} />}
      {s.pops.map((p) => <Pop key={p.id} p={p} />)}
      {s.point > 0 && (
        <span key={'p' + s.point} className="bt-sd-point">
          <img src={iconSrc} alt="" draggable={false} /><b>+{Math.max(1, n || 1)}</b>
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
