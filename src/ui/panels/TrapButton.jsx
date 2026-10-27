import React from 'react';
import { trapButtonView, armTrap, trapProbe } from '@/game/trapping.js';
import { TRAP_ICON_URL } from '@/rendering/controlsPreload.js';   /* warmed on the loading screen */
import { ctlColumn, ctlBottom, CTL_SLOT, leftCluster, LCTL_SLOT } from '@/ui/panels/ShieldButton.jsx';   /* v2.3.3617: upright, a round button in the column */
import { Skin } from '@/ui/panels/controlSkin.jsx';

/* ═══ v2.3.3120: THE TRAP POP-UP ═══
 * Plan: docs/PET-TRAPPING-PLAN.md, "Arming, and the kill".  When you have a
 * monster of the Wheel targeted, a small TRAP button pops up with your TRUE
 * odds on it ("0.5%") and the box traps you carry.  Tap it, and the worker
 * hangs a mark over the monster for 15 s; kill it in that time and the trap
 * springs (game/trapping.js, trapFx.js).
 *
 * A POP-UP, NOT A FIXED BUTTON: the fixed control slots are full, so it takes
 * the door's prompt slot -- the free stretch between the bell and the jump
 * button (the Wheel's doors are in town, on the safe ground, where no trap
 * can be set; a dungeon mouth's prompt sits beside it and this one rises over
 * it).  Grey, it says what stops it -- "Requires Trapping 18", "Get closer"
 * -- and a tap only repeats that, sending nothing (as a resource above your
 * level does, v2.3.3059).  With no box trap in the bag it is not there at all
 * (v2.3.3626, the owner: "don't show the trap message for monsters unless you
 * have a trap in your inventory to use"; trapButtonView).
 *
 * ON THE CLICK, the last event of a tap (v2.3.2617, the door's reasoning): a
 * touchstart handler would let the tap's compatibility mouse events fall
 * through to whatever is underneath once the prompt changes.  Its own clock
 * (POLL_MS), re-rendering only when what it shows changes. */
const POLL_MS = 120;
/* ═══ v2.3.3499: A TAP WHILE YOU JOG ═══
   The owner: "Make it so you can place a trap while jogging."  The worker
   never minded (trapping.js _handleTrapArm has no standing-still rule); the
   button did.  It acted on the click alone, and iPhone Safari makes no click
   for a tap while another finger is down -- the left thumb on the move stick
   -- so TRAP did nothing for anyone on the move (the canvas's own taps learnt
   this long ago: BroTown's "the canvas onClick is unreliable on multitouch").
   So a touch is its own tap, the sprint button's way (SprintButton.jsx): the
   same finger lifted within TAP_SLOP_PX of where it went down, inside
   TAP_MAX_MS, arms it, and the touchend's preventDefault takes the tap's
   compatibility mouse events with it, so nothing falls through to whatever
   is under the button once it changes -- the reason it was on the click (the
   door's reasoning, v2.3.2617).  A mouse still clicks; a click that is the
   echo of a touch already taken (GHOST_MS) is ignored. */
const TAP_SLOP_PX = 14;
const TAP_MAX_MS = 600;
const GHOST_MS = 700;

/* ═══ v2.3.3617: UPRIGHT, A ROUND BUTTON BESIDE THE ATTACK DISC ═══
   The owner, 2026-10-26: "The trap monster message appears over other UI
   elements sometimes. Where else can you place it?"  On an upright phone the
   pop-up sat at the bottom middle, and the Block button (ShieldButton.jsx
   blockAnchor, left of the attack disc and below it) is up exactly when a
   monster is targeted: it lay over the pop-up's left half.  Upright, TRAP is
   now a round button of the controls' own skin in the column left of the
   attack disc, one slot above Shield Bash (CTL_SLOT.trap, ctlColumn): what
   it says -- your traps and the true odds, or why it is grey -- in a small tag
   beside it, toward the middle, that takes no touch.  Sideways nothing lies
   there (the Block button is far right) and a computer shows no Block button,
   so both keep the pop-up where it was. */
export function TrapButton({ stateRef, isLandscape }) {
  const [, setTick] = React.useState(0);
  const keyRef = React.useRef('');
  const touchRef = React.useRef(null);
  const lastTouchEndRef = React.useRef(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      const S = stateRef && stateRef.current;
      const v = S ? trapButtonView(S) : null;
      const k = v ? v.key : '';
      if (k !== keyRef.current) { keyRef.current = k; setTick((x) => (x + 1) % 1000000); }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [stateRef]);

  if (typeof window !== 'undefined') {
    /* QA probe (house style): what the button and the trap think */
    window.__btTrap = () => {
      const S = stateRef && stateRef.current;
      return S ? trapProbe(S) : null;
    };
  }
  const S = stateRef && stateRef.current;
  const v = S ? trapButtonView(S) : null;
  if (!v) return null;

  /* the press itself: arm it, or (grey) say again what stops it */
  const act = () => {
    const s = stateRef && stateRef.current;
    if (!s) return;
    const now = s ? trapButtonView(s) : null;
    if (now && (now.kind === 'ready' || now.kind === 'grey')) armTrap(s);
    keyRef.current = '';
    setTick((x) => (x + 1) % 1000000);
  };
  const grey = v.kind === 'grey';
  const armed = v.kind === 'armed';
  const pending = v.kind === 'pending';
  const raised = !!(S && S._nearWheelDoor);
  const bg = grey ? 'rgba(17,30,35,.92)' : armed ? 'rgba(28,74,52,.94)' : 'linear-gradient(180deg,#E2B765,#C9923E)';
  const fg = grey ? '#B6C1BE' : armed ? '#CFF5DC' : '#172126';
  const rim = grey ? 'rgba(229,237,233,.22)' : armed ? 'rgba(126,224,168,.7)' : '#EAC675';
  /* the press, shared by both faces */
  const handlers = {
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (Date.now() - lastTouchEndRef.current < GHOST_MS) return;   /* v2.3.3499: a touch's echo */
      act();
    },
    onTouchStart: (e) => {
      e.stopPropagation();
      const t = e.changedTouches && e.changedTouches[0];
      touchRef.current = t ? { x: t.clientX, y: t.clientY, at: Date.now(), id: t.identifier } : null;
    },
    onTouchMove: (e) => { e.stopPropagation(); },
    onTouchEnd: (e) => {
      e.stopPropagation();
      const st = touchRef.current;
      touchRef.current = null;
      if (!st) return;
      let t = null;
      const list = e.changedTouches || [];
      for (let i = 0; i < list.length; i++) if (list[i].identifier === st.id) t = list[i];
      if (!t) return;
      e.preventDefault();
      lastTouchEndRef.current = Date.now();
      const dx = t.clientX - st.x, dy = t.clientY - st.y;
      if (dx * dx + dy * dy <= TAP_SLOP_PX * TAP_SLOP_PX && Date.now() - st.at <= TAP_MAX_MS) act();
    },
    onTouchCancel: (e) => { e.stopPropagation(); touchRef.current = null; },
  };
  const fine = typeof matchMedia === 'function' && matchMedia('(pointer:fine)').matches;
  if (!fine && !isLandscape) {
    const col = ctlColumn(false);
    const size = col.size;
    /* v2.3.3635: the tag's room, from the button's left edge to Element
       Burst's right (over the movement disc, level with this button): on a
       360-375 px phone the one-line "Requires Trapping 12" reached across
       Burst's face (found by the review of v2.3.3617).  The tag wraps at its
       spaces within that room, never smaller type; 72 px at the least
       (one word a line). */
    const vw = (typeof window !== 'undefined' && window.innerWidth) || 390;
    const lc = leftCluster(false);
    const tagRoom = Math.max(72, Math.round((vw - col.right - size - 6) - (lc.leftPx(LCTL_SLOT.burst) + lc.size + 6)));
    return (
      <div
        className="bt-desktop-hide"
        data-trap-button={v.kind}
        data-trap-monster={v.monsterId}
        data-trap-odds={v.chance}
        data-trap-round="1"
        role="button"
        aria-label={v.text + ' ' + v.sub}
        {...handlers}
        style={{
          position: 'fixed', right: col.right, bottom: ctlBottom(col.bottomPx(CTL_SLOT.trap)),
          width: size, height: size, borderRadius: '50%', zIndex: 31, pointerEvents: 'auto',
          touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none',
        }}>
        <Skin size={size} tone="slate" state={grey ? 'disabled' : armed ? 'on' : pending ? 'cooldown' : 'normal'}>
          {/* v2.3.3635: grey by OPACITY, never a CSS filter over the game's
              canvas (TRAPS §42, the iOS grain; the controls beside it do the
              same) */}
          <img src={TRAP_ICON_URL} alt="" draggable={false}
            style={{ width: Math.round(size * 0.64), height: Math.round(size * 0.64), objectFit: 'contain', opacity: grey ? 0.5 : 1 }} />
        </Skin>
        {/* what it says, beside it toward the middle: takes no touch */}
        <span data-trap-tag="1" style={{
          position: 'absolute', right: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', whiteSpace: 'normal', overflowWrap: 'normal', maxWidth: tagRoom, width: 'max-content', textAlign: 'right',
          padding: '3px 8px 4px', borderRadius: 8, lineHeight: 1.15,
          background: 'rgba(12,16,20,.82)', border: '1px solid ' + rim, color: grey ? '#B6C1BE' : armed ? '#CFF5DC' : '#F4E7C8',
          font: '800 11px/1.15 "Source Sans 3", sans-serif',
        }}>
          <span style={{ display: 'block', letterSpacing: '.08em', fontWeight: 900 }}>
            {v.text}{!grey && !armed ? <span style={{ fontWeight: 700, opacity: .8, marginLeft: 5, letterSpacing: 0 }}>×{v.traps}</span> : null}
          </span>
          <span data-trap-sub="1" style={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}>{v.sub}</span>
        </span>
      </div>
    );
  }
  return (
    <button
      className="bt-interact-prompt"
      data-trap-button={v.kind}
      data-trap-monster={v.monsterId}
      data-trap-odds={v.chance}
      /* v2.3.3407: T is its click on a computer (desktopControls: arms it,
         or grey, says why), and it says so after its words -- not while it is
         set or on its way, when neither does anything */
      data-key={v.kind === 'ready' || grey ? 'T' : undefined}
      data-key-at="inline"
      aria-label={v.text + ' ' + v.sub}
      {...handlers}
      style={{
        left: 'calc(50% - 10px)',
        bottom: 'calc(var(--sheet-h, var(--dash-h)) + ' + (raised ? 76 : 24) + 'px)',
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px 5px 6px',
        lineHeight: 1.1, textAlign: 'left', minHeight: 44,
        background: bg, color: fg, border: '1px solid ' + rim,
        animation: grey || armed || pending ? 'none' : undefined,
        opacity: pending ? 0.8 : 1,
      }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, background: grey ? 'rgba(255,255,255,.06)' : 'rgba(17,30,35,.35)',
        display: 'grid', placeItems: 'center', flex: 'none' }}>
        <img src={TRAP_ICON_URL} alt="" draggable={false}
          style={{ width: 24, height: 24, objectFit: 'contain', opacity: grey ? 0.5 : 1 }} />
      </span>
      <span style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 900, letterSpacing: '.08em' }}>
          {v.text}{!grey && !armed ? <span style={{ fontWeight: 700, opacity: .75, marginLeft: 6, letterSpacing: 0 }}>×{v.traps}</span> : null}
        </span>
        <span data-trap-sub="1" style={{ display: 'block', fontSize: 12, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{v.sub}</span>
      </span>
    </button>
  );
}

export default TrapButton;
