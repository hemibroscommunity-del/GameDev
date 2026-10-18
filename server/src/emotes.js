/* ═══ v2.3.3345: AN EMOTE IS ONE OF THE LISTED EMOTES (docs/specs/emotes.md) ═══
 *
 * The phone's `emote` relay (src/game/interactions.js sendEmote) carried
 * `{id, emoji}` with `emoji` any string at all: the default branch rebuilt the
 * relay in the sender's name (relay.js) and passed the rest through, bounded
 * only by the 16 KB frame gate.  Harmless while no phone drew an emote --
 * none did -- but from v2.3.3345 an emoji pops over the sender's head and a
 * quick line is their speech bubble (src/game/emotes.js), so an unchecked
 * string would be free text over a head, past everything the chat does to a
 * line (index.js _sanitizeChatRelay) and in front of every player near them.
 *
 * So the worker relays an emote only when it is on these lists, the phone's
 * own (src/data/gameDisplay.js EMOTES / TEXT_EMOTES; mirror-audit.test.mjs
 * holds the two copies equal, byte for byte -- several of these carry a
 * variation selector), and rebuilds the payload as exactly `{id, emoji}`.
 * The phone draws only listed ones too, so either side may deploy first.
 *
 * WHERE IT GOES: since v2.3.3345 an emote is PLACED (eventplace.js
 * RELAY_PLACED): the phones near the sender hear it, not the whole room.  An
 * emote is a moment -- an emoji held 2.6 s, a bubble 5 s -- so a phone that
 * was too far away to see it has nothing to miss (TRAPS §176 is about events
 * a phone keeps).  A muted speaker's emote is still dropped per recipient
 * (chatmod.js MUTABLE_RELAY_TYPES), after the placing.
 *
 * Kill switch: `emotes: false` in the live flags relays none, and
 * `caps.emotes` false shuts the picker's doors on the phone at its next join.
 * Nothing is stored.
 */

export const EMOTE = Object.freeze({
  /* src/data/gameDisplay.js EMOTES, in its order */
  EMOJI: Object.freeze(['👋', '😂', '🔥', '💎', '🎉', '👀', '💪', '🕺', '🫡', '🤝', '💀', '😤', '🧘', '🎭', '❤️', '👏', '🏆', '🎣', '😴', '🤙', '6️⃣', '7️⃣', '🤷', '🙏', '😎', '🥶', '💃', '🪩', '🎤', '🫶']),
  /* src/data/gameDisplay.js TEXT_EMOTES, in its order */
  LINES: Object.freeze(['67', 'GG', 'RIP', 'Bruh', 'EZ', 'F', 'Lets go', 'Wow', 'Gritty', 'gg ez', 'Champion', 'Salute']),
});

const LISTED = new Set([...EMOTE.EMOJI, ...EMOTE.LINES]);

/* Whether `e` is an emote the worker relays (a Set: no prototype lookups). */
export function emoteListed(e) {
  return typeof e === 'string' && LISTED.has(e);
}

export const emoteMethods = {
  /* `emotes: false` in the live flags: no emote is relayed */
  _emotesOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'emotes') && !f.emotes);
  },

  /* The default relay branch's check for an `emote` (index.js, beside
     _sanitizeChatRelay): false drops it; true leaves `msg.payload` as exactly
     { id: <the sender's session id>, emoji } */
  _sanitizeEmoteRelay(session, msg) {
    if (this._emotesOff()) return false;
    const p = msg && msg.payload;
    const e = p && typeof p === 'object' ? p.emoji : null;
    if (!emoteListed(e)) return false;
    msg.payload = { id: session.id, emoji: e };
    return true;
  },
};
