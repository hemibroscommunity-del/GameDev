/* ═══ v2.3.6683: A SCREEN'S ROW OF ACTIONS (card UI2-bro, the build's step 3) ═══
 * The specification's 1.2.3 ("Preserve predictable positions for common
 * actions") and 14 Q83 ("retain the relevant action in its predictable
 * location in a visibly disabled state, with a short adjacent explanation";
 * "Never rely on color alone").  Each action keeps its slot whether its
 * neighbours are there or not; one that is off stays, disabled, with its
 * reason under it, the reason being its own rule's answer
 * (src/game/screenZones.js screenActions).  `marks[id]`: 'out' (the pending
 * spinner, the press refused) or 'unknown' ("Not confirmed yet", the press
 * still refused) from src/game/pending.js pendingMark; never a success. */
import React from 'react';
import { screenActions, WHY_NO_RULE } from '@/game/screenZones.js';
import { Ui2Action } from './Action.jsx';
import { SAY } from '@/data/say/ui2Kit.js';
import { say } from '@/game/say.js';

/**
 * actions  [{ id, slot, cost, check, label, c, onPress }] (screenZones.js's action, with its face)
 * marks    { [id]: 'free' | 'out' | 'unknown' }
 * whyWord  (why) => words for a reason key (default: the reason as it is)
 */
export function Ui2Actions({ actions, marks, whyWord }) {
  const cells = screenActions(actions);
  if (!cells.length) return null;
  const byId = Object.create(null);
  for (const a of actions || []) if (a && a.id != null) byId[String(a.id)] = a;
  return (
    <div className="u2-actions" data-u2-actions={cells.length} style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
      {cells.map((cell, i) => {
        if (!cell) return <span key={'gap' + i} className="u2-actcell is-gap" data-u2-slot={i} aria-hidden="true" />;
        const a = byId[cell.id];
        const m = (marks && marks[cell.id]) || 'free';
        const held = m === 'out' || m === 'unknown';
        const note = !cell.on ? (cell.why === WHY_NO_RULE ? say(SAY, 'ui2Kit.noRule') : whyWord ? whyWord(cell.why) : cell.why) : m === 'unknown' ? say(SAY, 'ui2Kit.unknown') : null;
        return (
          <span key={cell.id} className="u2-actcell" data-u2-slot={i} data-u2-action={cell.id} data-u2-mark={m}>
            <Ui2Action c={a.c || 'gold'} label={a.label} pending={m === 'out'} disabled={!cell.on || m === 'unknown'}
              aria-describedby={note ? 'u2why-' + cell.id : undefined}
              onClick={cell.on && !held && a.onPress ? () => a.onPress(cell) : undefined} />
            {note ? <span id={'u2why-' + cell.id} className="u2-why" data-u2-why={cell.on ? 'unknown' : cell.why}>{note}</span> : null}
          </span>
        );
      })}
    </div>
  );
}
