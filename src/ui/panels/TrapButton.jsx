import React from 'react';
import { trapButtonView, armTrap, trapProbe } from '@/game/trapping.js';
import { TRAP_ICON_URL } from '@/rendering/controlsPreload.js';   /* warmed on the loading screen */

/* ═══ v2.3.3111: THE TRAP POP-UP ═══
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

export function TrapButton({ stateRef }) {
  const [, setTick] = React.useState(0);
  const keyRef = React.useRef('');

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
      aria-label={v.text + ' ' + v.sub}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const s = stateRef && stateRef.current;
        if (!s) return;
        if (v.kind === 'ready' || v.kind === 'grey') armTrap(s);
        keyRef.current = '';
        setTick((x) => (x + 1) % 1000000);
      }}
      onTouchStart={(e) => { e.stopPropagation(); }}
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
