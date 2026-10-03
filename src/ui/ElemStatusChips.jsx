/* ═══ v2.3.2996: A MONSTER'S ELEMENT ON YOU, IN THE HUD ═══
 * (On a dark backing, unlike the buff chips beside it: the Wheel's ground is
 * bright sand and snow, and a see-through chip on it was hard to read.)
 *
 * The snowman's chill, the fire goblin's burn and the blue slime's hold
 * (game/elemHits.js), each a chip with its own icon -- the snowflake, the
 * flame, the slime -- and the seconds left; since v2.3.3013 the rock
 * monster's daze, the fishman's soak and the Mire's poison too.  The gust is
 * a shove, over before a chip could say so; its icon rides the hit's number
 * instead.
 *
 * ITS OWN CLOCK, which is why it is a component and not three more rows in
 * BroTown's buff chips: that row redraws only when BroTown does, which is
 * often in a fight but not on any schedule, so a one-second chill could sit
 * there saying "1s" long after it ended.  This polls the game state every
 * 150 ms and re-renders only when what it shows has changed (a chip comes or
 * goes, or its whole seconds tick), so a calm HUD costs a string compare.
 */
import React, { useEffect, useState } from 'react';
import { ELEM_ICON_SRC } from '@/game/elemHits.js';

const ROWS = [
  { key: '_chillUntil', img: ELEM_ICON_SRC['elem-frost'], label: 'Chilled', color: '#9fd8ff' },
  { key: '_burnUntil', img: ELEM_ICON_SRC['elem-flame'], label: 'Burning', color: '#ff9a3c' },
  { key: '_stuckUntil', img: ELEM_ICON_SRC.slime, label: 'Stuck', color: '#8be36a' },
  /* v2.3.3013: the rock monster's daze, the fishman's soak, the Mire's
     poison (the storm's crackle is over before a chip could say so, as the
     gust's shove is: its icon rides the number) */
  { key: '_dazeUntil', img: ELEM_ICON_SRC['elem-stone'], label: 'Dazed', color: '#e9d27a' },
  { key: '_soakUntil', img: ELEM_ICON_SRC['elem-water'], label: 'Soaked', color: '#5fb8ff' },
  { key: '_poisonUntil', img: ELEM_ICON_SRC['elem-venom'], label: 'Poisoned', color: '#a6e24a' },
];

function readChips(S, now) {
  const out = [];
  if (!S) return out;
  for (const r of ROWS) {
    const u = S[r.key];
    if (u && now < u) out.push({ r, s: Math.ceil((u - now) / 1000) });
  }
  return out;
}

export default function ElemStatusChips({ stateRef }) {
  const [chips, setChips] = useState([]);
  useEffect(() => {
    let last = '';
    const id = setInterval(() => {
      const c = readChips(stateRef && stateRef.current, Date.now());
      const sig = c.map((x) => x.r.key + x.s).join();
      if (sig !== last) { last = sig; setChips(c); }
    }, 150);
    return () => clearInterval(id);
  }, [stateRef]);
  if (!chips.length) return null;
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }} data-elem-chips="">
      {chips.map(({ r, s }) => (
        <div key={r.key} title={r.label}
          style={{ padding: '1px 5px 1px 3px', borderRadius: 4, background: 'rgba(12,16,24,.72)', border: '1px solid ' + r.color + 'aa',
            fontSize: 11, color: r.color, display: 'flex', gap: 3, alignItems: 'center' }}>
          <img src={r.img} alt={r.label} style={{ width: 14, height: 14, display: 'block' }} />
          <span>{s + 's'}</span>
        </div>
      ))}
    </div>
  );
}
