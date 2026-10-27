/* ═══ v2.3.2996: A MONSTER'S ELEMENT ON YOU, IN THE HUD ═══
 * (On a dark backing, unlike the buff chips beside it: the Wheel's ground is
 * bright sand and snow, and a see-through chip on it was hard to read.)
 *
 * The snowman's chill, the fire goblin's burn and the blue slime's hold
 * (game/elemHits.js), each a chip with its own icon -- the snowflake, the
 * flame, the slime -- and the seconds left; since v2.3.3014 the rock
 * monster's daze, the fishman's soak and the Mire's poison too, and since
 * v2.3.3264 a player's slow, fracture and thorns.  The gust is
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
import { cue } from '@/game/eventSounds.js'; /* v2.3.3343: a status heard wearing off */

const ROWS = [
  { key: '_chillUntil', img: ELEM_ICON_SRC['elem-frost'], label: 'Chilled', color: '#9fd8ff' },
  { key: '_burnUntil', img: ELEM_ICON_SRC['elem-flame'], label: 'Burning', color: '#ff9a3c' },
  { key: '_stuckUntil', img: ELEM_ICON_SRC['elem-flora'], label: 'Stuck', color: '#8cc4ff' },   /* v2.3.3044: the leaf, not the slime's splat; v2.3.3675: its words the goo's blue (effectsRenderer GOO_HOLD) */
  /* v2.3.3014: the rock monster's daze, the fishman's soak, the Mire's
     poison (the storm's crackle is over before a chip could say so, as the
     gust's shove is: its icon rides the number) */
  { key: '_dazeUntil', img: ELEM_ICON_SRC['elem-stone'], label: 'Dazed', color: '#e9d27a' },
  /* v2.3.3620: the snowman's freeze, the rock monster's wobble after its daze */
  { key: '_frozenUntil', img: ELEM_ICON_SRC['elem-frost'], label: 'Frozen', color: '#d8f2ff' },
  /* v2.3.3635: from its own start (`from`): the daze's hit sets both, the
     wobble beginning as the daze ends, and "Wobbly 2s" sat beside "Dazed 1s"
     for the whole daze while nothing wobbled yet */
  { key: '_wobbleUntil', from: '_wobbleFrom', img: ELEM_ICON_SRC['elem-stone'], label: 'Wobbly', color: '#e9d27a' },
  { key: '_soakUntil', img: ELEM_ICON_SRC['elem-water'], label: 'Soaked', color: '#5fb8ff' },
  { key: '_poisonUntil', img: ELEM_ICON_SRC['elem-venom'], label: 'Poisoned', color: '#a6e24a' },
  /* v2.3.3264: what a PLAYER'S gem puts on you that no monster's hit does
     (server pvpextras.js): a wind gem's slow, a stone gem's fracture (its
     stacks, +6% damage taken each), a flora gem's thorns */
  { key: '_slowUntil', img: ELEM_ICON_SRC['elem-wind'], label: 'Slowed', color: '#e6edf3' },
  { key: '_fractureUntil', img: ELEM_ICON_SRC['elem-stone'], label: 'Fractured', color: '#c9b48a', stacks: '_fractureStacks' },
  { key: '_thornUntil', img: ELEM_ICON_SRC['elem-flora'], label: 'Thorned', color: '#8be36a' },
];

function readChips(S, now) {
  const out = [];
  if (!S) return out;
  for (const r of ROWS) {
    const u = S[r.key];
    if (r.from && now < (S[r.from] || 0)) continue;
    if (u && now < u) out.push({ r, s: Math.ceil((u - now) / 1000), n: r.stacks ? Math.max(0, Math.floor(S[r.stacks]) || 0) : 0 });
  }
  return out;
}

/* v2.3.3343: a status that has worn off is heard, softly (it ended in
   silence; SOUND-GAPS) -- only one that was on you a while, so a half-second
   daze or hold is not followed by a second sound */
const WORE_OFF_AFTER_MS = 1500;

export default function ElemStatusChips({ stateRef }) {
  const [chips, setChips] = useState([]);
  useEffect(() => {
    let last = '';
    const since = new Map();   /* a chip's key -> when it was first seen */
    const id = setInterval(() => {
      const S = stateRef && stateRef.current;
      const now = Date.now();
      const c = readChips(S, now);
      const on = new Set(c.map((x) => x.r.key));
      for (const k of on) if (!since.has(k)) since.set(k, now);
      for (const [k, t] of since) {
        if (on.has(k)) continue;
        since.delete(k);
        if (now - t >= WORE_OFF_AFTER_MS && S && !S._dying && !(S.rpg && S.rpg.hp <= 0)) cue('statusEnd');
      }
      const sig = c.map((x) => x.r.key + x.s + '/' + x.n).join();
      if (sig !== last) { last = sig; setChips(c); }
    }, 150);
    return () => clearInterval(id);
  }, [stateRef]);
  if (!chips.length) return null;
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }} data-elem-chips="">
      {chips.map(({ r, s, n }) => (
        <div key={r.key} title={r.label} data-chip={r.label}
          style={{ padding: '1px 5px 1px 3px', borderRadius: 4, background: 'rgba(12,16,24,.72)', border: '1px solid ' + r.color + 'aa',
            fontSize: 11, color: r.color, display: 'flex', gap: 3, alignItems: 'center' }}>
          <img src={r.img} alt={r.label} style={{ width: 14, height: 14, display: 'block' }} />
          <span>{(n > 1 ? '\u00d7' + n + ' ' : '') + s + 's'}</span>
        </div>
      ))}
    </div>
  );
}
