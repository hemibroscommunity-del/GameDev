/* ═══ v2.3.3353: EMOTES YOU CAN SEE (docs/specs/emotes.md) ═══
 *
 * The 30 emoji and 12 quick lines (EMOTES / TEXT_EMOTES, data/gameDisplay.js)
 * have been in the game since the prototype, but their only button sat in the
 * bottom toolbar hidden since v14 (MenuBar.jsx), and an emote that did go out
 * only beeped: nothing drew `S.emote` or a peer's `.emote`.  Found by the fun &
 * social plan's check of the code (docs/FUN-SOCIAL-PLAN.md, Phase 0).
 *
 * Now an emoji pops over your head for the players near you
 * (effectsRenderer `_updateEmotePops`), a quick line ("GG", "Bruh") is your
 * speech bubble, and the picker opens from the chat box (tap your bro, then
 * the smiley) or B on a keyboard.
 *
 * ONLY WHAT IS ON THE LIST IS EVER DRAWN.  The relay carried `emoji` as any
 * string up to the 16 KB frame gate, harmless while nothing drew it; drawn,
 * it would be free text over your head past the chat's own sanitising.  The
 * worker keeps only listed emotes now (server/src/emotes.js, mirror-audit
 * holds the two lists together), and this side draws only listed ones too, so
 * a new phone is safe against an old worker as well.
 *
 * No imports but the lists, so the rules can be read in node. */
import { EMOTES, TEXT_EMOTES } from '../data/gameDisplay.js';

/* How long an emoji stays over a head: popped in, held, faded out at the end */
export const EMOTE_POP_MS = 2600;
/* One emote a second from this phone: the relay allowance it spends (8 at
   once, 4 a second, index.js RELAY_BURST) is the same one your swings and
   arrows spend, so the picker never empties it on its own. */
export const EMOTE_COOLDOWN_MS = 1000;

const EMOJI = new Set(EMOTES);
const LINES = new Set(TEXT_EMOTES);

/* 'emoji' (drawn over the head), 'line' (said as a speech bubble), or null for
   anything not on the lists -- which is never drawn, sent or heard */
export function emoteKind(x) {
  if (typeof x !== 'string' || !x) return null;
  if (EMOJI.has(x)) return 'emoji';
  if (LINES.has(x)) return 'line';
  return null;
}

/* The picker's doors (the chat box's smiley, B) stay shut when the worker says
   `emotes: false` (its kill switch); an older worker that says nothing is fine:
   this side still draws only what is listed. */
export function emotesLive(S) {
  /* read as `_serverCaps.emotes`, the form caps-audit.test.mjs finds */
  return !(S && S._serverCaps && S._serverCaps.emotes === false);
}
