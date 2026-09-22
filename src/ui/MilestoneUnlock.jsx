import React from 'react';
import { tapDismiss, TAP_DISMISS_STYLE } from './tapDismiss.js';
import {
  getMilestone, subscribeMilestone, clearMilestone,
  MILESTONE_HOLD_MS, MILESTONE_FADE_MS,
} from './milestoneUnlock.js';

/* ═══ v2.3.2645: THE MILESTONE CARD ═══
 *
 * Owner: "Yes give milestone unlocks their own notification."
 *
 * See src/ui/milestoneUnlock.js for WHEN this opens and WHICH rungs open it.
 * This file is the presentation, and it has three jobs the level-up caption
 * could not do:
 *
 *   BIG ENOUGH TO READ.  The line this replaces was 12.5px under a moving
 *   burst; "way too tiny to read anyway" is the owner's verdict on it and it
 *   is the whole reason this component exists.  22px name, 14px effect, on a
 *   still card.  If it is not legible at arm's length on a 360px phone, it has
 *   failed at the one thing it is for.
 *
 *   ON ITS OWN.  It opens as the level-up burst finishes, so nothing else is
 *   on screen competing with it.
 *
 *   SAYS WHAT YOU GOT.  "Element Burst" alone is a name; "A new ability button
 *   is live on your HUD" is the sentence that stops the player discovering the
 *   button by accident three fights later.
 *
 * ═══ NO NEW ART, DELIBERATELY ═══
 *
 * Type and the Lantern Slate surface, no image.  CLAUDE.md's preloading law is
 * absolute -- every animation/sprite asset loads at the gate, and a lazy
 * first-use texture load is a REGRESSION -- so a milestone icon would have to
 * be registered in preloadWorldAnimations() in this same change.  A milestone
 * fires five times in a character's life, which is the worst possible ratio of
 * startup cost to use.  If the owner wants art here it is a deliberate
 * follow-up with a proper manifest entry, not a quiet Assets.load.
 *
 * ═══ TAPPABLE ═══
 *
 * tapDismiss (v2.3.2284, the owner's "allow the user to just tap on the
 * messages to dismiss it").  It is the opt-IN helper, used here on purpose: a
 * card centred over the play area during a fight must be clearable, and
 * dismissing on CLICK rather than pointerdown is what stops the dismiss tap
 * falling through to the world and locking a monster.
 */

/* Lantern Slate (docs/LANTERN-SLATE-SPEC.md): the same overlay surface the
   dashboard's own coach cards use -- opaque enough to read over town's pale
   sand, and NOT backdrop-filter, which the spec forbids over WebGL on iOS. */
const COL = {
  bg:     'rgba(13,22,27,0.94)',
  border: 'rgba(229,237,233,0.20)',
  edge:   'rgba(216,170,88,0.55)',   /* lantern brass, the accent */
  accent: '#D8AA58',
  text:   '#F4F0E7',
  text2:  '#B6C1BE',
};

export default function MilestoneUnlock() {
  const [slot, setSlot] = React.useState(getMilestone);
  /* The card's own clock.  `null` = not open yet (we are still inside the
     level-up burst's run); a number = ms since it opened. */
  const [elapsed, setElapsed] = React.useState(null);

  React.useEffect(() => subscribeMilestone(() => {
    setSlot(getMilestone());
    setElapsed(null);
  }), []);

  const seq = slot && slot.seq;
  const openAt = slot && slot.openAt;

  React.useEffect(() => {
    if (!slot) return undefined;
    let raf = 0, opened = 0;
    /* One rAF loop rather than two timers: the open moment and the fade are
       the same clock, and a setTimeout pair can drift apart if the tab is
       throttled mid-celebration -- which would leave a card that never
       closes. */
    const tick = () => {
      const now = Date.now();
      if (!opened) {
        if (now < openAt) { raf = requestAnimationFrame(tick); return; }
        opened = now;
      }
      const e = now - opened;
      setElapsed(e);
      if (e >= MILESTONE_HOLD_MS + MILESTONE_FADE_MS) { clearMilestone(seq); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [seq, openAt, slot]);

  if (!slot || elapsed == null) return null;

  /* In over 180ms, out over the fade.  The card does not move -- it is a thing
     to READ, and text that slides while you start reading it is slower to read,
     not livelier. */
  const fadeIn = Math.min(1, elapsed / 180);
  const out = elapsed - MILESTONE_HOLD_MS;
  const fadeOut = out <= 0 ? 1 : Math.max(0, 1 - out / MILESTONE_FADE_MS);
  const alpha = fadeIn * fadeOut;
  /* A whisper of a rise on entry, finished before the text is legible. */
  const lift = (1 - fadeIn) * 8;

  return (
    <div
      data-milestone-card={String(slot.level)}
      style={{
        position: 'absolute',
        left: 0, right: 0,
        /* Above the middle, clear of the dashboard band in portrait and of the
           thumb in landscape.  The level-up burst pins its medallion at 0.40
           of the viewport; this opens after that has gone, in the same
           neighbourhood, so the eye does not have to travel. */
        top: '34%',
        display: 'flex', justifyContent: 'center',
        /* v2.3.2645: 72.  The burst is 70 and the QUEST ACCEPTED banner is 71
           (BroTown), so this takes the next rung -- see src/ui/zLayers.js.
           They are sequenced and should never coexist, but if a timing ever
           slips, the rare thing wins and stays readable. */
        zIndex: 72,
        opacity: alpha,
        transform: `translateY(${lift.toFixed(2)}px)`,
        padding: '0 16px',
      }}
    >
      <div
        /* v2.3.2645: the PLATE, tagged separately from the full-width wrapper
           above it.  A rig measuring the wrapper measures the viewport and
           learns nothing about whether the card fits -- which is exactly the
           first thing mp-milestone got wrong. */
        data-milestone-plate=""
        {...tapDismiss(() => clearMilestone(slot.seq))}
        style={{
          ...TAP_DISMISS_STYLE,
          maxWidth: 320,
          boxSizing: 'border-box',
          padding: '14px 18px 16px',
          borderRadius: 14,
          background: COL.bg,
          border: `1px solid ${COL.border}`,
          borderTop: `2px solid ${COL.edge}`,
          boxShadow: '0 16px 40px rgba(3,8,10,0.45)',
          textAlign: 'center',
          pointerEvents: 'auto',
        }}
      >
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: COL.accent, lineHeight: 1.2,
          fontFamily: 'Source Sans 3, system-ui, sans-serif',
        }}>Milestone</div>
        <div
          data-milestone-name=""
          style={{
            fontSize: 22, fontWeight: 800, color: COL.text,
            lineHeight: 1.18, marginTop: 5,
            fontFamily: 'Source Sans 3, system-ui, sans-serif',
          }}
        >{slot.name}</div>
        {slot.gives ? (
          <div
            data-milestone-gives=""
            style={{
              fontSize: 14, color: COL.text2, lineHeight: 1.35, marginTop: 6,
              fontFamily: 'Source Sans 3, system-ui, sans-serif',
            }}
          >{slot.gives}</div>
        ) : null}
      </div>
    </div>
  );
}
