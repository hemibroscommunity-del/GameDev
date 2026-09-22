import React from 'react';
import { levelUpMedallionSrc, levelUpLabelFor } from './levelUpIcons.js';
import { portraitStore } from './mobile/sheet/portraitStore.js'; /* v2.3.2615: a character level wears the character */
import {
  LEVELUP_STRIP_SRC, LEVELUP_STRIP_W, LEVELUP_STRIP_H, LEVELUP_FRAMES,
  LEVELUP_HOLD_MS, LEVELUP_FADE_MS, LEVELUP_RUN_MS, LEVELUP_MAX_W, LEVELUP_MAX_H,
  LEVELUP_ICON_FILL, LEVELUP_TOTAL_MS, LEVELUP_PIN_Y_FRAC,
  LEVELUP_CAPTION_BOX_H, LEVELUP_CAPTION_GAP, levelUpFrameAt,
} from '../data/levelUpBurst.js';
import { BT_AUDIO } from '../data/index.js';

/* ═══ v2.3.2591: THE LEVEL-UP NOTIFICATION, REPLACED ═══
 *
 * Owner: "I want a new level up notification instead of the one that currently
 * exists upon leveling up both lifeskills and combat skills.  The first is an
 * audio that should play simultaneously with the level up display."  And:
 * "I also want the icon representing that combat skill or life skill anchored
 * in the middle circle of the level up art."
 *
 * INSTEAD OF, not alongside: this REPLACES the gold text banner for the two
 * kinds of message that mean "you levelled" — `combat` and `life`.  The same
 * `levelUpMsg` slot also carries zone-gate WARNINGS and the stat-increase
 * notices (combatHelpers.pushStatIncreaseNotice), and those keep the old
 * banner.  Branching on kind at the RENDER site rather than at the trigger
 * sites is deliberate and is what makes "both lifeskills and combat skills"
 * true without hunting: every level-up in the game — the four client paths in
 * levelCelebration.js, the worker's prog3_level and combat_credit, the legacy
 * client loop in gameEvents.js, and the seven crafting panels — already funnels
 * into this one React state.  Catch it here and none can be missed.
 *
 * ═══ HOW THE ICON STAYS IN THE CIRCLE ═══
 *
 * The medallion moves and scales across the eight frames (radius 17.5 -> 47.5
 * -> 40), so neither a fixed screen position nor "the centre of the frame"
 * would hold it.  What happens instead is the other way round: the measured
 * circle centre (src/data/levelUpBurst.js) is PINNED to one screen point and
 * each frame is offset so its own circle lands there.  The icon is drawn at
 * that point at the frame's own measured radius.  It cannot drift, because it
 * is not following the medallion — the medallion is placed around it.
 */

/* ═══ v2.3.2615: IT IS A COLUMN NOW, NOT THE SCREEN ═══
 *
 * Owner: "I'd rather them both play side by side."  A skill level and the
 * character level it produced arrive in the same tick and used to overwrite
 * each other in BroTown's single message slot; LevelUpBurstStack.jsx keeps up
 * to two live at once and hands each one a COLUMN.
 *
 * Everything below that used to solve against the viewport width now solves
 * against `colW` instead — the fit, the pin, and the caption plate's maximum.
 * With `cols: 1` colW IS the viewport and every number is what v2.3.2591
 * shipped, so a lone level-up is pixel-for-pixel unchanged; the two-column
 * case is the only new geometry.  That is deliberate: one burst is still by
 * far the common case and it should not pay for the rare one.
 *
 * `col` / `cols` rather than an x fraction because the caption has to be
 * clamped to the same column the art is centred in, and passing one number
 * that both derive from is what stops them disagreeing. */
export default function LevelUpBurst({ msg, col = 0, cols = 1, onDone }) {
  /* ═══ ITS OWN CLOCK, ON PURPOSE ═══
     The banner this replaces animated off a bare Date.now() read inside
     BroTown's render, which only advances when something ELSE re-renders that
     tree — fine for a slow opacity ramp, not fine for an eight-frame
     animation, which would stutter or freeze on whatever the rest of the HUD
     happened to be doing.  So the burst drives itself: one rAF loop, owned
     here, started on mount and cancelled on unmount.  Nothing outside this
     component can change how the art plays. */
  const [clockMs, setClockMs] = React.useState(0);
  const doneRef = React.useRef(onDone);
  doneRef.current = onDone;
  React.useEffect(() => {
    let raf = 0;
    const t0 = msg.ts || Date.now();
    const step = () => {
      const e = Date.now() - t0;
      setClockMs(e);
      if (e < LEVELUP_TOTAL_MS) { raf = requestAnimationFrame(step); return; }
      /* v2.3.2615: tell the stack the column is free.  Reported from the clock
         that owns the animation rather than from the render, because a render
         that returns null has not necessarily happened — BroTown's tree only
         re-renders when something else in it does, which is the whole reason
         this component drives itself.  Never while a rig has the animation
         frozen: a frozen burst is being photographed, not finishing. */
      if (typeof window !== 'undefined' && typeof window.__btLevelUpFreeze === 'number') return;
      if (typeof doneRef.current === 'function') doneRef.current();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [msg.ts]);

  /* The portrait is generated into portraitStore by BottomDashboard and can be
     rewritten mid-session (the player changes a cosmetic).  Subscribing keeps a
     character medallion showing the character they are actually playing — the
     v2.3.1835 lesson, which is that a missing subscription does not break the
     picture, it makes it stale, which is worse. */
  const [, forcePortrait] = React.useState(0);
  React.useEffect(() => portraitStore.subscribe(() => forcePortrait((v) => v + 1)), []);

  /* ═══ AN AUTOTEST HANDLE, BECAUSE THE FRAMES ARE 70ms LONG ═══
     window.__btLevelUpFreeze pins the animation to one instant so a rig can
     photograph a NAMED frame instead of racing it — the same autotest posture
     as window._uiPanels and window._gameState elsewhere in this tree.  Read
     by tools/qa/mp/shot-levelup.mjs, which walks all eight frames and asserts
     the icon's centre does not move between them.
     It is read, never written, by the game: undefined in every real session,
     so the live clock above is what a player ever sees.  A frozen-frame rig
     is the only way to prove the anchoring, and proving it by sleeping
     70ms at a time would prove nothing — the screenshot alone takes longer
     than the frame. */
  const frozen = (typeof window !== 'undefined' && typeof window.__btLevelUpFreeze === 'number')
    ? window.__btLevelUpFreeze : null;
  const elapsed = frozen == null ? clockMs : frozen;

  /* ═══ THE SOUND STARTS WITH FRAME 0 ═══
     A separate effect from the clock, keyed on the same msg.ts, so it fires
     on the commit that paints the first frame.  "Simultaneously" is the
     owner's word and it is a structural requirement, not a tolerance: a
     setTimeout, or a call at the trigger site, can drift from the art the
     moment anything else on the frame is slow.  This cannot — there is no
     clock between them. */
  React.useEffect(() => { playLevelUpSting(); }, [msg.ts]);

  /* ═══ v2.3.2643: THE CAPTION'S REAL HEIGHT, NOT AN ASSUMED LINE COUNT ═══
     The fit below reserves room for the caption plate so it cannot run under
     the dashboard tray.  That reservation used to be a constant picked per
     COLUMN COUNT -- 58px for one column, 1.75x for two -- which was true for
     as long as the caption's contents were fixed.  v2.3.2643 changed them:
     with the character burst gone, the one remaining burst carries the whole
     gains line ("+1.5 damage · +6 max HP · +3 Bow points · +3 shared
     points"), which wraps to two lines in one wide column and put the plate
     13px under the tray at 360 and 390 portrait.  The rig caught it
     (shot-levelup's captionBelowTray row), which is what that row is for.

     Estimating the wrap from string length and a guessed glyph width would
     be the same mistake with a longer fuse -- it would be right for today's
     four gains and wrong for the fifth.  So the plate is MEASURED, once, on
     the commit that mounts it, and the fit uses the real number from the next
     frame on.  The caption's text does not change during a burst, so this
     settles immediately and never thrashes.

     Frame 0 still uses the constant, for the one frame before the measurement
     lands.  That is invisible on purpose: at frame 0 the medallion is 24px of
     a 65px peak and still growing, so a scale correction there is inside the
     growth the art is already doing.

     ONCE, not every frame.  This component re-renders on every rAF tick, and
     a getBoundingClientRect after a render that has just changed
     backgroundSize forces a synchronous layout -- ~150 of them over one 2.6s
     burst, on a phone, for an answer that cannot change: the caption's text is
     fixed for the life of a burst.  So the read happens only while `capH` is
     0, and the 0 is re-armed only by something that could genuinely re-wrap
     the plate -- a new message, or a resize / rotation. */
  const capRef = React.useRef(null);
  /* No reset on msg.ts: the stack keys each burst by its slot seq
     (LevelUpBurstStack), so a new message is a new component instance and this
     already starts at 0.  Adding the reset anyway would make every mount
     measure, blank itself, and measure again. */
  const [capH, setCapH] = React.useState(0);
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const reArm = () => setCapH(0);
    window.addEventListener('resize', reArm);
    window.addEventListener('orientationchange', reArm);
    return () => {
      window.removeEventListener('resize', reArm);
      window.removeEventListener('orientationchange', reArm);
    };
  }, []);
  React.useLayoutEffect(() => {
    if (capH > 0) return;                    /* already measured for this layout */
    const el = capRef.current;
    if (!el) return;
    const h = Math.ceil(el.getBoundingClientRect().height);
    if (h > 0) setCapH(h);
  });

  /* Gone, not merely transparent, once it is over.  BroTown's own render
     guard would also drop it, but only on the next time something else
     re-renders that tree — and an invisible overlay that is still IN THE DOM
     is exactly what makes a later rig's "nothing on screen" control vacuous. */
  if (elapsed > LEVELUP_TOTAL_MS) return null;

  const fi = levelUpFrameAt(elapsed);
  const f = LEVELUP_FRAMES[fi];

  /* ═══ FIT ═══ solved against the LARGEST frame, not the current one, so the
     burst never overflows at its peak and the scale never changes mid-run
     (a changing backgroundSize would re-rasterize the strip every frame). */
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
  /* v2.3.2615: the burst owns a COLUMN.  With cols === 1 this is the viewport
     and the fill fraction is v2.3.2591's 0.86, so a single burst is unchanged.
     Two columns get 0.92 OF THE COLUMN rather than 0.86 — the gutter between
     them is already the full width of the art's transparent margins, and
     giving back that 6% is what keeps the medallion big enough to read the
     icon inside it at 360. */
  const nCols = Math.max(1, cols | 0);
  const colW = vw / nCols;
  const colFill = nCols === 1 ? 0.86 : 0.92;
  let k = Math.min((colW * colFill) / LEVELUP_MAX_W, (vh * 0.68) / LEVELUP_MAX_H);

  /* The one screen point the medallion's centre is pinned to.  0.40 rather
     than dead centre: the burst is taller below the medallion than above it
     (the banner unfurls downward), so centring the CIRCLE would put the whole
     composition low.  0.40 puts it back while clearing the zone header. */
  const pinX = colW * (Math.min(nCols - 1, Math.max(0, col | 0)) + 0.5);
  const pinY = vh * LEVELUP_PIN_Y_FRAC;

  /* ═══ THE BURST MAY OVERLAP THE BAND.  THE CAPTION MAY NOT. ═══
     The dashboard band is exactly 33dvh (LANTERN-SLATE hard lock), and a
     2.6s celebration drawn across the top of it is fine — that band is a
     quiet tray and the old banner sat over it too.  The CAPTION is different:
     it carries the only two things the art does not say, which skill and what
     level, and a clipped one is worse than none.  (Seen for real at 360x640:
     the plate ran under the tray and read "Woodcutting · Level 7" with the
     "(+2)" cut off.)  So the fit is solved a second time against the caption,
     and on a short screen it is the BURST that gives way.
     Landscape has no band — the controls go to the corners and the world runs
     full height — so the constraint simply does not bind there. */
  const worldBottom = vh >= vw ? vh * 0.67 : vh;
  const _settled = LEVELUP_FRAMES[LEVELUP_FRAMES.length - 1];
  const _belowCircle = _settled.sh - _settled.oy;
  /* v2.3.2615: a caption in half the width wraps to more lines, so the height
     the fit reserves for it has to grow with the column count or the second
     line lands under the tray — which is the exact clipping v2.3.2591 solved
     for one column and would have re-introduced for two.  1.75x covers the
     longest real caption ("Melee · Level 12" over a two-line gains list) at
     360 with a column 180px wide; measured, not guessed — see
     tools/qa/mp/shot-levelup.mjs, which fails the run if any caption plate
     crosses the tray. */
  /* v2.3.2643: the measured plate wins as soon as it exists; the constants
     remain the frame-0 fallback (and the floor -- a plate measured mid-fade
     is never allowed to reserve LESS than one that has settled). */
  const _capGuess = nCols === 1 ? LEVELUP_CAPTION_BOX_H : Math.round(LEVELUP_CAPTION_BOX_H * 1.75);
  const capBoxH = Math.max(_capGuess, capH);
  const kCaption = (worldBottom - 8 - capBoxH - LEVELUP_CAPTION_GAP - pinY) / _belowCircle;
  /* ...but not to the point of a medallion nobody can see: below this the
     caption is allowed to sit a little higher against the art instead. */
  k = Math.min(k, Math.max(kCaption, 0.32));

  /* Fade: in over the first frame, out at the end.  Nothing else moves — the
     art carries the motion, so a CSS transform on top of it would fight it. */
  /* 70ms = exactly frame 0's duration, so the spark is fully present by the
     time it becomes the second frame.  A longer ramp left the first frame a
     ghost, which reads as a dropped frame rather than as a fade. */
  const fadeIn = Math.min(1, elapsed / 70);
  const outAt = LEVELUP_RUN_MS + LEVELUP_HOLD_MS;
  const fadeOut = elapsed <= outAt ? 1 : Math.max(0, 1 - (elapsed - outAt) / LEVELUP_FADE_MS);
  const alpha = fadeIn * fadeOut;

  const iconR = f.r * k * LEVELUP_ICON_FILL;
  const label = levelUpLabelFor(msg);
  const lvl = msg.kind === 'life' ? msg.level : (msg.skillLevel != null ? msg.skillLevel : msg.level);
  /* v2.3.2615: the character's own bust for a character level, that skill's
     icon for a skill level.  S is read at use time the way the rest of this
     tree reads it — the store it goes through is the points panel's. */
  const _S = (typeof window !== 'undefined' && window._gameState) ? window._gameState.current : null;
  const medallionSrc = levelUpMedallionSrc(msg, _S);

  /* The caption sits at a FIXED y — below where the SETTLED frame ends, not
     below the current one — so it does not hop about while the art grows. */
  const capY = Math.min(pinY + _belowCircle * k + LEVELUP_CAPTION_GAP,
    worldBottom - 8 - capBoxH);

  return (
    <div
      data-levelup-kind={msg.kind}
      data-levelup-col={String(col)}
      style={{ position: 'absolute', inset: 0, zIndex: 70, pointerEvents: 'none', opacity: alpha }}
    >
      <div style={{ position: 'absolute', left: pinX, top: pinY }}>
        <div
          aria-hidden="true"
          /* data-levelup-* are autotest handles, the same posture as the
             data-tut / data-coach attributes the rest of the UI carries:
             tools/qa/mp/shot-levelup.mjs measures the icon's rect off the
             live DOM rather than trusting a screenshot, because a
             notification that silently failed to mount photographs exactly
             like the world behind it. */
          data-levelup-art=""
          style={{
            position: 'absolute',
            left: -f.ox * k,
            top: -f.oy * k,
            width: f.sw * k,
            height: f.sh * k,
            backgroundImage: `url(${LEVELUP_STRIP_SRC})`,
            backgroundPosition: `${-f.sx * k}px ${-f.sy * k}px`,
            backgroundSize: `${LEVELUP_STRIP_W * k}px ${LEVELUP_STRIP_H * k}px`,
            backgroundRepeat: 'no-repeat',
          }}
        />
        <img
          src={medallionSrc}
          alt=""
          draggable={false}
          data-levelup-icon=""
          style={{
            position: 'absolute',
            left: -iconR, top: -iconR,
            width: iconR * 2, height: iconR * 2,
            /* v2.3.2615: `cover` inside a circular clip for the PORTRAIT, which
               is a head-and-shoulders bust with its own rectangle and would sit
               in the medallion as a floating photo otherwise.  A skill icon is
               already a transparent glyph drawn to fill its own box, so it
               keeps `contain` and is not cropped. */
            objectFit: msg.kind === 'char' ? 'cover' : 'contain',
            borderRadius: msg.kind === 'char' ? '50%' : 0,
            /* a soft warm lift so the icon reads against the cream void
               without a plate, which Lantern Slate would not want here */
            filter: 'drop-shadow(0 1px 3px rgba(74,50,12,.45))',
          }}
        />
      </div>
      <div
        data-levelup-caption=""
        ref={capRef}                 /* v2.3.2643: measured, see the fit above */
        style={{
          /* ═══ v2.3.2615: THE CAPTION SPANS ITS COLUMN, NOT THE SCREEN ═══
             This was `left: 0; right: 0` with the plate centred inside it, and
             with one burst that is the same thing as centring on the column.
             With two it is not: both plates centred themselves on the VIEWPORT
             and sat on top of each other — measured at -166px of overlap at
             360 — while the art either side of them was correctly apart.  The
             medallion being in the right place is not the same claim as the
             words being in the right place, and only the second one was being
             checked.  (tools/qa/mp/shot-levelup.mjs floors the gap over every
             painted pair now, art AND caption, which is what caught it.) */
          position: 'absolute', left: colW * (nCols === 1 ? 0 : Math.min(nCols - 1, Math.max(0, col | 0))),
          width: colW, top: capY,
          display: 'flex', justifyContent: 'center',
          fontFamily: 'Source Sans 3,sans-serif',
          /* the caption arrives once the burst has settled — during the run
             the art is the event, and a line of text under a growing
             starburst is just something else moving */
          opacity: Math.max(0, Math.min(1, (elapsed - LEVELUP_RUN_MS + 120) / 260)),
        }}
      >
        {/* ═══ ON A PLATE, NOT ON A TEXT-SHADOW ═══
            The world is the brightest thing on screen (LANTERN-SLATE's north
            star) and a level-up can land anywhere in it — the first cut used
            white text with a drop shadow and the gains line washed out
            completely over town's pale sand.  So the caption gets the
            system's own panel surface underneath it: #202C32 at .88 with the
            standard hairline border.  Translucent-but-opaque-enough and NOT
            backdrop-filter, which the spec forbids outright on iOS Safari. */}
        <div style={{
          /* v2.3.2615: of the COLUMN, not of the screen — two plates each
             claiming 86% of the viewport would overlap in the middle, which is
             the "overlapping unreadably" the owner ruled out. */
          maxWidth: nCols === 1 ? '86%' : Math.max(120, colW - 14),
          padding: '7px 14px 8px',
          borderRadius: 10,
          background: 'rgba(32,44,50,.88)',
          border: '1px solid rgba(238,242,235,.14)',
          boxShadow: '0 6px 18px rgba(0,0,0,.45)',
          textAlign: 'center',
        }}>
          {/* ═══ "SKILL LEVEL", NOT "LEVEL", FOR A LIFE SKILL ═══
              v2.3.1915 gave a life skill the same PLACE on screen as a
              character level but deliberately not the same WEIGHT, "because a
              woodcutting level is not a character level and the celebration
              should not claim it is" — the old banner carried that in its
              headline (SKILL UP! vs LEVEL UP!).  The owner's art says LEVEL UP
              for both, by design: they asked for one notification covering
              both kinds.  So the distinction moves into the words, which is
              the only place left that can hold it.  The lighter TREATMENT is
              untouched — celebrateLifeSkillLevel still fires no screen shake
              and half the particles. */}
          <div style={{
            /* v2.3.2615: a two-column caption gets the smaller step of the
               type scale.  18px "Woodcutting · Skill Level 7" in a 166px column
               wraps to three lines and pushes the plate into the tray; 15px
               holds it to two.  One column keeps 18. */
            fontSize: nCols === 1 ? 18 : 15,
            fontWeight: 800, color: '#F7F2E7', letterSpacing: '.02em', lineHeight: 1.15,
          }}>
            {msg.kind === 'life'
              ? `${label || 'Skill'} · Skill Level ${lvl}${(msg.gained || 1) > 1 ? `  (+${msg.gained})` : ''}`
              /* ═══ v2.3.2615: SAY "CHARACTER", BECAUSE THAT IS THE CONFUSION ═══
                 The owner's report was that they had gained a combat level
                 without levelling a combat skill.  Character level IS the sum
                 of the three skill levels (prog3CharLevel), so the two really
                 are different numbers that both get called "level", and the
                 notification never said which one it meant.  It does now, and
                 the portrait in the medallion says it a second time. */
              : msg.kind === 'char'
                ? `Character · Level ${msg.level}`
                : (label ? `${label} · Level ${lvl}` : `Level ${lvl}`)}
          </div>
          {/* v2.3.1727's gains line, kept: "you got stronger" is a claim and
              "+1.5 damage · +8 max HP" is the reason the owner asked for the
              retune.  The art says LEVEL UP and the icon says which skill;
              this is the only part that says what it BOUGHT. */}
          {(msg.kind === 'combat' || msg.kind === 'char') && msg.gains ? (
            <div style={{ fontSize: nCols === 1 ? 12.5 : 11, color: '#B9C1BF', marginTop: 3, lineHeight: 1.25 }}>
              {msg.gains}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ═══ THE SOUND ═══
 * Fired from the overlay's own mount effect, keyed on msg.ts, so it starts on
 * the SAME render that paints frame 0.  The owner's word was "simultaneously"
 * and that is a structural requirement, not a tolerance: a setTimeout, or a
 * call at the trigger site, can drift from the art the moment anything else
 * on the frame is slow.  This cannot — there is no clock between them.
 *
 * It goes through BT_AUDIO.play, which is the door every other file-based SFX
 * in the game goes through: the sample is decoded up front from SFX_MANIFEST,
 * the AudioContext is the one the first user gesture already unlocked (which
 * is what makes it audible on iPhone Safari at all), and play() returns early
 * when BT_AUDIO.muted — the flag SettingsPanel's sound toggle writes.  No
 * second audio path, no second unlock to get wrong. */
/* ═══ TWO LEVELS IN QUICK SUCCESSION ═══
 * The overlay itself REPLACES (see the note at the BroTown render site): the
 * newest level is the truest state and the banner this succeeds was
 * replace-not-queue too, so a burst already on screen restarts on the new one.
 * The SOUND does not get to restart that freely — a Build-sheet spend can move
 * several skills inside a second and retriggering a 2.2s sting on each would
 * machine-gun.  So the art re-runs immediately and the sting re-fires only
 * once per 450ms; below that the burst that is already playing keeps its own.
 * pitchVar 0 on purpose: the per-play random detune every combat sample gets
 * exists to stop a flurry of hits sounding identical, and a fanfare that
 * wobbles in pitch between level-ups sounds broken rather than varied. */
let _lastSting = 0;
export function playLevelUpSting() {
  const t = Date.now();
  if (t - _lastSting < 450) return;
  _lastSting = t;
  try { BT_AUDIO.play('level-up', { vol: 0.55, pitchVar: 0 }); } catch (e) { void e; }
}
