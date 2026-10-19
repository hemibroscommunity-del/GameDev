import React from 'react';
import { trapButtonView, armTrap, trapProbe } from '@/game/trapping.js';
import { TRAP_ICON_URL } from '@/rendering/controlsPreload.js';   /* warmed on the loading screen */

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
 * it).  Grey, it says what stops it -- "Requires Trapping 18", "No box traps"
 * -- and a tap only repeats that, sending nothing (as a resource above your
 * level does, v2.3.3059).
 *
 * ON THE CLICK, the last event of a tap (v2.3.2617, the door's reasoning): a
 * touchstart handler would let the tap's compatibility mouse events fall
 * through to whatever is underneath once the prompt changes.  Its own clock
 * (POLL_MS), re-rendering only when what it shows changes. */
const POLL_MS = 120;
/* ═══ v2.3.3486: A TAP WHILE YOU JOG ═══
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

export function TrapButton({ stateRef }) {
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
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (Date.now() - lastTouchEndRef.current < GHOST_MS) return;   /* v2.3.3486: a touch's echo */
        act();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        const t = e.changedTouches && e.changedTouches[0];
        touchRef.current = t ? { x: t.clientX, y: t.clientY, at: Date.now(), id: t.identifier } : null;
      }}
      onTouchMove={(e) => { e.stopPropagation(); }}
      onTouchEnd={(e) => {
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
      }}
      onTouchCancel={(e) => { e.stopPropagation(); touchRef.current = null; }}
      style={{
        left: 'calc(50% - 10px)',
        bottom: 'calc(var(--sheet-h, var(--dash-h)) + ' + (raised ? 76 : 24) + 'px + var(--nml-lift, 0px))',
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px 5px 6px',
        lineHeight: 1.1, textAlign: 'left', minHeight: 44,
        background: bg, color: fg, border: '1px solid ' + rim,
        animation: grey || armed || pending ? 'none' : undefined,
        opacity: pending ? 0.8 : 1,
      }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, background: grey ? 'rgba(255,255,255,.06)' : 'rgba(17,30,35,.35)',
        display: 'grid', placeItems: 'center', flex: 'none' }}>
        <img src={TRAP_ICON_URL} alt="" draggable={false}
          style={{ width: 24, height: 24, objectFit: 'contain', filter: grey ? 'grayscale(1) opacity(.6)' : 'none' }} />
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
