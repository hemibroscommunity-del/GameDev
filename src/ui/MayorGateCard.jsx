import React from 'react';
import { deskWords } from '@/game/deskWords.js';

/* ═══ v2.3.3839: "SPEAK TO MAYOR BRO FIRST", WHILE YOU LEAN ON THE GATE ═══
 *
 * The owner, on a laptop with a new character: "It just has an invisible wall
 * up if you're on skateboard and try to go into no man's land."  The wall is
 * the Mayor gate (game/wheelHome.js wheelCommonsGate, the owner's v2.3.1676
 * rule: no leaving town before you have spoken to Mayor Bro), and it stays.
 * Its reason was the red "DANGER" banner, which a quick computer drew almost
 * clear (TimedBanner.jsx) and which came and went every 2.5 s.
 *
 * Now a plain card in the coach card's look, at the top of the world: shown
 * while you lean on the gate (on foot or on the board: the board is allowed
 * in town, so a rider is not put off) and for HOLD_MS after, so it never
 * flickers between pushes.  Its words go through deskWords (a computer reads
 * "click").  It takes no taps.  Read from the game's state 5 times a second;
 * nothing to draw, nothing kept, while you are not at the gate. */
const HOLD_MS = 1500;
const POLL_MS = 200;
const INK = 'rgba(13,21,26,.92)';   /* the coach card's (QuestCoach.jsx) */

export function mayorGateCardUp(S, now) {
  return !!(S && S.currentZone === 'wheel' && typeof S._mayorGateLeanAt === 'number'
    && now - S._mayorGateLeanAt < HOLD_MS);
}

export default function MayorGateCard({ stateRef }) {
  const [up, setUp] = React.useState(false);
  React.useEffect(() => {
    const id = setInterval(() => {
      const v = mayorGateCardUp(stateRef && stateRef.current, Date.now());
      setUp((o) => (o === v ? o : v));
    }, POLL_MS);
    return () => clearInterval(id);
  }, [stateRef]);
  if (!up) return null;
  return React.createElement('div', {
    'data-mayor-gate-card': '',
    role: 'status',
    style: {
      position: 'absolute', left: '50%', top: '22%', transform: 'translateX(-50%)',
      zIndex: 70, pointerEvents: 'none',
      width: 'max-content', maxWidth: 'min(300px, calc(100% - 32px))', boxSizing: 'border-box',
      background: INK, border: '1px solid rgba(216,170,88,.45)', borderRadius: 12,
      padding: '9px 14px 10px', boxShadow: '0 10px 24px rgba(3,8,10,.45)',
      fontFamily: 'Source Sans 3,sans-serif', textAlign: 'center',
    },
  },
    React.createElement('div', { style: { color: '#F2D58A', fontSize: 16, fontWeight: 800 } }, 'Speak to Mayor Bro first'),
    React.createElement('div', { style: { color: '#EAE2CF', fontSize: 13, fontWeight: 600, marginTop: 3 } },
      deskWords("He's beside the Town Hall: he'll arm you")));
}
