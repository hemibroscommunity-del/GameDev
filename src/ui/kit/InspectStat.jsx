/* ═══ v2.3.6840: THE STAT YOU CAN INSPECT (card UI4 PR 1, the owner's V17) ═══
 * V17:40, "Inspection: Recessed, restrained contrasting border, chevron or
 * explicit Details" (a damage calculation, an item, an earned achievement's
 * details).  A stat that ALWAYS opens: it asks for its handler (a stat with
 * nothing behind it is Ui2Stat with intent "info").  Today's look is the
 * kit's stat that opens (sunk, the large number, the chevron: Group.jsx);
 * `details` writes the word as well as the chevron.  PR 2 gives it V17's
 * border. */
import React from 'react';
import { Ui2Stat } from './Group.jsx';
import { SAY } from '@/data/say/ui2Kit.js';
import { say } from '@/game/say.js';

export function Ui2InspectStat({ v, k, art, size, state, selected, details, onClick, className, ...rest }) {
  const words = details ? (k ? k + ' · ' : '') + say(SAY, 'ui2Kit.details') : k;
  return <Ui2Stat intent="inspect" v={v} k={words} art={art} size={size} state={state} selected={selected}
    onClick={onClick} className={'u2-inspect' + (className ? ' ' + className : '')} {...rest} />;
}
