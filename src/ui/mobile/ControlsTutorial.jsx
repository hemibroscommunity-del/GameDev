import React, { useEffect, useState } from 'react';
import { controlsTutorialBus } from './controlsTutorialBus.js';
import { dashboardPanelBus } from './dashboardPanelBus.js';

/* v2.3.1205: REBUILT as live DOM-anchored annotations (previously a
   frozen screenshot with eyeballed coordinates that every HUD change
   silently made lie).  We getBoundingClientRect() the REAL controls
   via class/data-tut anchors; targets not in the DOM are skipped, so
   HUD changes degrade to fewer callouts instead of wrong ones.

   v2.3.1235: REWORKED from seven simultaneous callouts (an overlapping
   "callout explosion" on small screens) to a FIVE-STEP guided tour —
   one spotlight + one coach card at a time, Back/Next driven (owner
   design correction, §7 Controls tutorial).  Tapping the dim backdrop
   no longer closes it; the card's ✕ or Done does.

   Bus API unchanged: controlsTutorialBus.open()/close(); overlay z
   stays 9300 (see src/ui/zLayers.js ladder). */

/* v2.3.1235: Step registry — sels are live-DOM selectors.  A step with
   multiple sels highlights the UNION of their rects (rounded rect);
   shape 'circle' rings a single round control.  sels: null is a
   target-less step (coach card centered mid-screen).  A step whose
   sels all fail to measure is dropped for this open, so navigation
   simply advances past it. */
const STEPS = [
  { key: 'move', shape: 'circle', sels: ['.bt-joystick-zone'],
    label: 'Move', body: 'Drag the left joystick to move.' },
  /* v2.3.1667: this said "hold for special", and it was WRONG — there is
     no hold gesture.  The special fires on a FLICK: BroTown.jsx's right-
     stick release handler measures the release speed and triggers when it
     clears ~0.15 px/ms over 8px in under 400ms.  Holding does nothing, so
     the one line of onboarding that mentions the special was teaching a
     control that does not exist.  (Double-tap-and-hold is the SHIELD,
     which the ring covers separately.) */
  /* v2.3.2242: the right stick is a BUTTON now (docs/specs/control-redesign.md).
     Hold = auto-attack the nearest enemy; a quick swipe on it = special. */
  { key: 'attack', shape: 'circle', sels: ['.bt-rjoy-base'],
    label: 'Attack', body: 'Hold the Attack button to fight the nearest enemy. A quick swipe on it is your special.' },
  /* v2.3.2242: the shield left the stick.  Its own button, under Attack,
     that only shows once there is something to block. */
  { key: 'shield', shape: 'circle', sels: ['[data-shield]'],
    label: 'Shield', body: 'Tap to raise your shield. It drops after one block, or when you dodge.' },
  /* v2.3.2243: only on screen while two or more monsters are in range --
     a step whose anchor is absent is dropped for that open, by design. */
  { key: 'target', shape: 'circle', sels: ['[data-target="next"]'],
    label: 'Switch target', body: 'Two enemies close? These arrows switch which one you are fighting.' },
  /* v2.3.1285: the 3-panel row is retired — the home view is the Bag
     compact grid (equipped row over recent items). */
  /* ═══ v2.3.1803: THIS STEP HAD BEEN DROPPING ITSELF ═══
     It listed [data-tut="dash-bag"] and .bt-dashboard-nav-button, and NEITHER
     is in the DOM: nothing passes BottomDashboard's `tut` prop (so no element
     ever carries data-tut), and the destinations moved to .bt-navrail.  A step
     whose anchors all miss is dropped by design (v2.3.1205, so a HUD change
     degrades to fewer callouts rather than wrong ones) — which is the right
     default and the reason nobody noticed the five-step tour running as three.
     The PREMISE was stale too, not just the selector: v2.3.1350 said this
     "rings the toolbar Bag button", and there is no Bag destination any more.
     The rail is Dashboard / Character / Quests / Skills / More, and the bag
     grid IS the Dashboard home view — so the step rings Dashboard and says
     what is actually behind it.  Anchored on the grid first, because that is
     the thing being described; the rail button is the fallback for when the
     player is on some other panel and the grid is not up. */
  { key: 'dashboard', shape: 'rect',
    sels: ['[data-tut="coach-gear"]', '.bt-navrail [aria-label="Dashboard"]'],
    label: 'Bag', body: 'Your items and gear live here. Tap one to equip it.' },
  /* v2.3.1287: Chat left the toolbar — the composer opens by tapping
     your own character; the step teaches that instead. */
  /* v2.3.1803: same fault, worse — [data-tut="dash-more"] was its ONLY
     anchor, so this step has never had a fallback to fall back to. */
  { key: 'toolbar', shape: 'rect',
    sels: ['.bt-navrail [aria-label="More"]', '[data-tut="dash-more"]'],
    label: 'Toolbar', body: 'Menus live down here. Tap your character to chat.' },
  { key: 'dodge', shape: null, sels: null,
    label: 'Swipe / Dodge', body: 'Swipe anywhere in the world to dodge-roll.' },
];

/* v2.3.1235: Lantern Slate tokens (docs/LANTERN-SLATE-SPEC.md) — sheet
   surface, hairline border, brass accent, warm-white text ladder. */
const COL = {
  dim:      'rgba(4,9,12,0.52)',
  ring:     '#D8AA58',
  card:     '#1E2E34',
  border:   'rgba(229,237,233,0.20)',
  accent:   '#D8AA58',
  text:     '#F4F0E7',
  muted:    '#8D9B98',
  btnSurf:  '#293B41',
  goldText: '#172126',
  goldBg:   'linear-gradient(180deg,#E2B765,#D2A14D)',
  goldEdge: '#EAC675',
};

/* Measure one element; null for missing / zero-size (e.g. joysticks on
   desktop, or a mid-transition dashboard) — never guessed at. */
function measureEl(sel) {
  let el = null;
  try { el = document.querySelector(sel); } catch (_e) {}
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r || r.width < 2 || r.height < 2) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/* v2.3.1235: Measure every step.  Multi-sel steps get the union of
   whichever anchors are present; a step with no live anchor at all is
   dropped (target-less steps always survive with rect: null). */
function measureSteps() {
  const out = [];
  for (const s of STEPS) {
    if (!s.sels) { out.push({ ...s, rect: null }); continue; }
    let u = null;
    for (const sel of s.sels) {
      const r = measureEl(sel);
      if (!r) continue;
      if (!u) { u = { ...r }; continue; }
      const right = Math.max(u.left + u.width, r.left + r.width);
      const bottom = Math.max(u.top + u.height, r.top + r.height);
      u.left = Math.min(u.left, r.left);
      u.top = Math.min(u.top, r.top);
      u.width = right - u.left;
      u.height = bottom - u.top;
    }
    if (!u) continue;
    out.push({ ...s, rect: u });
  }
  /* v2.3.1803: publish what survived.  A dropped step is invisible by
     construction — that is the whole point of the degrade — so without this
     there is no way for a test to tell a four-step tour from a five-step one,
     and two steps went missing for long enough to prove it. */
  try {
    const live = out.map((o) => o.key);
    const rects = Object.create(null);
    for (const o of out) if (o.rect) rects[o.key] = o.rect;
    window.__btCtlTutSteps = () => ({
      all: STEPS.map((x) => x.key),
      live,
      dropped: STEPS.map((x) => x.key).filter((k) => !live.includes(k)),
      rects,
    });
  } catch (_e) {}
  return out;
}

export const ControlsTutorial = () => {
  const [, setV] = useState(0);
  const [steps, setSteps] = useState([]);
  const [step, setStep] = useState(0); /* v2.3.1235: current step index */
  useEffect(() => controlsTutorialBus.subscribe(() => setV(v => v + 1)), []);
  const open = controlsTutorialBus.isOpen();

  /* On open: reset to step 1, pop the dashboard back to its idle
     3-column view (the tutorial is launched from the More panel, which
     unmounts the columns it needs to highlight), then measure on the
     next frame + two settle retries.  Re-measure on resize /
     orientationchange; all listeners cleaned up on close/unmount. */
  useEffect(() => {
    if (!open) return undefined;
    setStep(0); /* v2.3.1235: every (re)open starts the tour over */
    try { dashboardPanelBus.clear(); } catch (_e) {}
    const measure = () => setSteps(measureSteps());
    const raf = requestAnimationFrame(measure);
    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 400);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [open]);

  if (!open || steps.length === 0) return null;

  const onClose = () => controlsTutorialBus.close();
  const total = steps.length;
  const idx = Math.max(0, Math.min(step, total - 1));
  const cur = steps[idx];
  const isFirst = idx === 0;
  const isLast = idx === total - 1;
  const vh = window.innerHeight || 1;
  const PAD = 6; // breathing room between element edge and cutout

  /* v2.3.1235: coach card sits opposite the spotlight — target in the
     bottom half → card at ~20% height; top half → ~60%; target-less
     step → dead center. */
  let cardTop, cardTransform;
  if (!cur.rect) {
    cardTop = '50%';
    cardTransform = 'translate(-50%, -50%)';
  } else if (cur.rect.top + cur.rect.height / 2 > vh / 2) {
    cardTop = '20%';
    cardTransform = 'translateX(-50%)';
  } else {
    cardTop = '60%';
    cardTransform = 'translateX(-50%)';
  }

  const btnBase = {
    minHeight: 44,
    padding: '0 18px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'Source Sans 3, system-ui, sans-serif',
    cursor: 'pointer',
    touchAction: 'manipulation',
  };

  return (
    <div
      /* v2.3.1235: backdrop tap no longer closes — buttons drive the
         tour.  The overlay still swallows all pointer input.
         v2.3.1235: Checkpoint B — pointerEvents 'auto' made EXPLICIT:
         this root is the shield that blocks taps from reaching the game
         beneath; the SVG dim stays pointerEvents 'none' so only the
         card's buttons are interactive. */
      style={{
        position: 'fixed', inset: 0, zIndex: 9300,
        fontFamily: 'Source Sans 3, system-ui, sans-serif',
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
    >
      {/* Dim backdrop with ONE spotlight cutout (SVG mask) + a single
          brass ring so the current control pops. */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <defs>
          <mask id="bt-tut-cutouts">
            <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
            {cur.rect && (cur.shape === 'circle' ? (
              <circle
                cx={cur.rect.left + cur.rect.width / 2}
                cy={cur.rect.top + cur.rect.height / 2}
                r={Math.max(cur.rect.width, cur.rect.height) / 2 + PAD}
                fill="#000" />
            ) : (
              <rect
                x={cur.rect.left - PAD} y={cur.rect.top - PAD}
                width={cur.rect.width + PAD * 2} height={cur.rect.height + PAD * 2}
                rx={10} fill="#000" />
            ))}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%"
          fill={COL.dim} mask="url(#bt-tut-cutouts)" />
        {cur.rect && (cur.shape === 'circle' ? (
          <circle
            cx={cur.rect.left + cur.rect.width / 2}
            cy={cur.rect.top + cur.rect.height / 2}
            r={Math.max(cur.rect.width, cur.rect.height) / 2 + PAD}
            fill="none" stroke={COL.ring} strokeWidth="2" />
        ) : (
          <rect
            x={cur.rect.left - PAD} y={cur.rect.top - PAD}
            width={cur.rect.width + PAD * 2} height={cur.rect.height + PAD * 2}
            rx={10} fill="none" stroke={COL.ring} strokeWidth="2" />
        ))}
      </svg>

      {/* Coach card — one per step, positioned opposite the spotlight. */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: cardTop,
          left: '50%',
          transform: cardTransform,
          /* v2.3.1235: Checkpoint B — content-driven height, exactly
             16px padding all around, maxWidth 336 (was 300). */
          width: 'min(88vw, 336px)',
          maxWidth: 336,
          background: COL.card,
          border: `1px solid ${COL.border}`,
          borderRadius: 14,
          padding: 16,
          color: COL.text,
          boxShadow: '0 14px 36px rgba(3,8,10,0.30)',
        }}
      >
        {/* ✕ close — 44px touch target, top-right of the card. */}
        <button
          onClick={onClose}
          aria-label="Close tutorial"
          style={{
            position: 'absolute',
            top: 0, right: 0,
            width: 44, height: 44,
            background: 'transparent',
            border: 'none',
            color: COL.muted,
            fontSize: 15,
            fontFamily: 'Source Sans 3, system-ui, sans-serif',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >✕</button>

        <div style={{
          fontSize: 11, fontWeight: 700,
          color: COL.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', lineHeight: 1.2,
          paddingRight: 32,
        }}>{cur.label}</div>
        <div style={{
          fontSize: 13, color: COL.text,
          marginTop: 6, lineHeight: 1.4,
        }}>{cur.body}</div>

        {/* v2.3.1235: Checkpoint B — ONE footer flex row:
            [Step text] [spacer] [Back?] [Next].  Progress text sits
            bottom-left; the gold Next/Done is bottom-right at exactly
            88×44; Back (secondary) appears left of Next. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <div style={{
            fontSize: 11, color: COL.muted, whiteSpace: 'nowrap',
          }}>{`Step ${idx + 1} of ${total}`}</div>
          <div style={{ flex: 1 }} />
          {!isFirst && (
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              style={{
                ...btnBase,
                background: COL.btnSurf,
                border: `1px solid ${COL.border}`,
                color: COL.text,
              }}
            >Back</button>
          )}
          <button
            onClick={() => (isLast ? onClose() : setStep(s => Math.min(total - 1, s + 1)))}
            style={{
              ...btnBase,
              width: 88,
              height: 44,
              padding: 0,
              flexShrink: 0,
              background: COL.goldBg,
              border: `1px solid ${COL.goldEdge}`,
              color: COL.goldText,
            }}
          >{isLast ? 'Done' : 'Next'}</button>
        </div>
      </div>
    </div>
  );
};
