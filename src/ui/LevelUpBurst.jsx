import React from 'react';
import { levelUpIconFor, levelUpLabelFor } from './levelUpIcons.js';
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

export default function LevelUpBurst({ msg }) {
  /* ═══ ITS OWN CLOCK, ON PURPOSE ═══
     The banner this replaces animated off a bare Date.now() read inside
     BroTown's render, which only advances when something ELSE re-renders that
     tree — fine for a slow opacity ramp, not fine for an eight-frame
     animation, which would stutter or freeze on whatever the rest of the HUD
     happened to be doing.  So the burst drives itself: one rAF loop, owned
     here, started on mount and cancelled on unmount.  Nothing outside this
     component can change how the art plays. */
  const [clockMs, setClockMs] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const t0 = msg.ts || Date.now();
    const step = () => {
      const e = Date.now() - t0;
      setClockMs(e);
      if (e < LEVELUP_TOTAL_MS) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [msg.ts]);

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
  let k = Math.min((vw * 0.86) / LEVELUP_MAX_W, (vh * 0.68) / LEVELUP_MAX_H);

  /* The one screen point the medallion's centre is pinned to.  0.40 rather
     than dead centre: the burst is taller below the medallion than above it
     (the banner unfurls downward), so centring the CIRCLE would put the whole
     composition low.  0.40 puts it back while clearing the zone header. */
  const pinX = vw / 2;
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
  const kCaption = (worldBottom - 8 - LEVELUP_CAPTION_BOX_H - LEVELUP_CAPTION_GAP - pinY) / _belowCircle;
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

  /* The caption sits at a FIXED y — below where the SETTLED frame ends, not
     below the current one — so it does not hop about while the art grows. */
  const capY = Math.min(pinY + _belowCircle * k + LEVELUP_CAPTION_GAP,
    worldBottom - 8 - LEVELUP_CAPTION_BOX_H);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, pointerEvents: 'none', opacity: alpha }}>
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
          src={levelUpIconFor(msg.skill)}
          alt=""
          draggable={false}
          data-levelup-icon=""
          style={{
            position: 'absolute',
            left: -iconR, top: -iconR,
            width: iconR * 2, height: iconR * 2,
            objectFit: 'contain',
            /* a soft warm lift so the icon reads against the cream void
               without a plate, which Lantern Slate would not want here */
            filter: 'drop-shadow(0 1px 3px rgba(74,50,12,.45))',
          }}
        />
      </div>
      <div
        data-levelup-caption=""
        style={{
          position: 'absolute', left: 0, right: 0, top: capY,
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
          maxWidth: '86%',
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
          <div style={{ fontSize: 18, fontWeight: 800, color: '#F7F2E7', letterSpacing: '.02em', lineHeight: 1.15 }}>
            {msg.kind === 'life'
              ? `${label || 'Skill'} · Skill Level ${lvl}${(msg.gained || 1) > 1 ? `  (+${msg.gained})` : ''}`
              : (label ? `${label} · Level ${lvl}` : `Level ${lvl}`)}
          </div>
          {/* v2.3.1727's gains line, kept: "you got stronger" is a claim and
              "+1.5 damage · +8 max HP" is the reason the owner asked for the
              retune.  The art says LEVEL UP and the icon says which skill;
              this is the only part that says what it BOUGHT. */}
          {msg.kind === 'combat' && msg.gains ? (
            <div style={{ fontSize: 12.5, color: '#B9C1BF', marginTop: 3, lineHeight: 1.25 }}>
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
