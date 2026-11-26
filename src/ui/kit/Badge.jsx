/* ═══ v2.3.6680: THE BADGE (card UI2) ═══
 * A count for real countable things waiting (10 px, the badge's floor), a
 * dot for a general update.  The rare warm light is the tile's `glow`. */
import React from 'react';
import { SAY } from '@/data/say/ui2Kit.js';   /* the kit's words, in the one table */
import { say } from '@/game/say.js';

export function Ui2Badge({ count, dot }) {
  if (count > 0) return <span className="u2-badge" data-u2-badge={count} aria-label={say(SAY, 'ui2Kit.waiting', { n: count })}>{count > 99 ? '99+' : count}</span>;
  if (dot) return <span className="u2-dot" data-u2-dot="" aria-label={say(SAY, 'ui2Kit.new')} />;
  return null;
}
