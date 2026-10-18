/* ═══ v2.3.3396: CHAT GUARDRAILS -- its own allowance, no repeats, clean text ═══
 *
 * docs/specs/chat-guard.md.  The fun & social plan (Phase 1, the owner's "Go
 * recommended") found three guardrails the chat still did not have:
 *
 *   1. A SOCIAL ALLOWANCE APART FROM COMBAT'S.  Room chat and emotes ride the
 *      router's default branch, and every relay there spent ONE bucket per
 *      connection (index.js RELAY_BURST 8, RELAY_REFILL_PER_S 4) -- the same
 *      one the player's own swings, arrows, rolls and jumps spend.  So a burst
 *      of chat or emotes emptied it, and the next swing the others should have
 *      seen was dropped: a dance party ate the messages a fight needs.  Now
 *      `chat` and `emote` spend their own (SOCIAL: five at once, then one every
 *      2 s -- five lines in ten seconds) and never the relay bucket; every
 *      other relay spends the relay bucket exactly as before.
 *   2. A REPEAT FILTER for the typed lines everyone can read: the same
 *      room-chat or area-chat line from the same player inside REPEAT_MS
 *      (30 s) is said once.  Compared lower case, its spaces collapsed, after
 *      the cleaning below -- so an invisible character or one more "o" does not
 *      make it a new line.  Whispers, party chat, friend DMs and the auction
 *      house's threads are private and are not filtered.  Emotes are not
 *      either: an emote is one of the listed emoji or quick lines, and "GG"
 *      twice is a cheer, not spam.
 *   3. CLEAN TEXT on every chat lane -- room, area, whisper, party, friend DM,
 *      and the auction house's threads, the one lane the plan's list missed --
 *      applied after each lane's own clamp (cleanChatText):
 *        - at most MARKS_MAX (2) combining marks after one letter: the
 *          stacked accents ("Zalgo") that draw a line over the lines above it;
 *        - the invisible and direction-changing characters removed (INVISIBLE:
 *          zero-width spaces, the overrides that print a line backwards, soft
 *          hyphens, word joiners, fillers that make a blank bubble, and the C1
 *          controls the lanes' own strip -- C0 and DEL only -- lets through).
 *          The zero-width JOINER (U+200D) and the variation selector (U+FE0F)
 *          stay where they join or dress something: a family emoji and a red
 *          heart are made of them;
 *        - at most EMOJI_MAX (6) emoji a line; the ones past it go, with the
 *          joiners, selectors and skin tones that belonged to them;
 *        - a run of one character longer than RUN_MAX (6) cut to 6: a wall of
 *          one key goes, "Broooooooooo" stays a very long "Broooooo" (the plan
 *          said 3, which would cut BroTown's own joke) -- never in a number:
 *          "selling for 10000000" is ten million, and cut to 6 it would say one;
 *        - every run of spaces one space; a line with nothing visible left in
 *          it is not sent, as an empty line never was.
 *
 * `chatguard: false` in the live flags (a kill switch) turns all three off:
 * chat and emotes spend the relay bucket again, nothing is filtered or
 * cleaned -- the room exactly as it was.  Nothing is stored and nothing new
 * goes on the wire: a line the guard stops is dropped silently, the router's
 * posture since v2.3.1134 (a refusal is both a signal to a flooder and one
 * more message to fan out).  The allowance and the repeat memory live on the
 * connection (`session.chatGuard`) and go with it, as the relay bucket always
 * has (rule 11: a deploy that wipes them loses nothing of value).
 */

export const SOCIAL = Object.freeze({
  /* the relays this allowance pays for, in place of the relay bucket */
  TYPES: Object.freeze(new Set(['chat', 'emote'])),
  BURST: 5,          // lines (or emotes) at once...
  REFILL_MS: 2000,   // ...then one more every 2 s: five in ten seconds
});

export const CHAT_GUARD = Object.freeze({
  REPEAT_MS: 30000,  // the same typed line goes out at most once in this long
  /* Lines remembered per connection for the repeat filter.  Bounded by time
     (nothing older than REPEAT_MS is kept) and by count: 24 is more than
     either lane lets a player say in REPEAT_MS at its steady rate (room chat
     15, a line every 2 s; area chat 20, its lane's one every 1.5 s), so
     cycling through more distinct lines than are remembered never gets one
     repeated inside the window.  At most 24 x 200 characters a connection. */
  REPEAT_KEEP: 24,
  MARKS_MAX: 2,      // combining marks after one base character
  EMOJI_MAX: 6,      // emoji in one line
  RUN_MAX: 6,        // the same character, one after another
});

/* Invisible and direction-changing characters, by code (never as literals: a
   reviewer cannot see them).  The owner's list -- U+200B, U+200C, U+200E,
   U+200F, U+202A-U+202E, U+2060-U+2064, U+2066-U+2069, U+FEFF, U+00AD, U+061C,
   U+180E -- and from Unicode's own "default ignorable" set, the deprecated
   format controls U+206A-U+206F and the four Hangul fillers (U+115F, U+1160,
   U+3164, U+FFA0: the classic blank-name, blank-bubble character; every
   keyboard types Korean as whole syllables), plus the C1 controls
   U+0080-U+009F, which the lanes' own strip ([\x00-\x1f\x7f]) never reached.
   NOT U+200D (the zero-width joiner) or U+FE0F (the emoji variation selector):
   emoji are made of them, and the tidy steps below take away only the ones
   that join or dress nothing. */
const INVISIBLE = /[\u0080-\u009F\u00AD\u061C\u115F\u1160\u180E\u200B\u200C\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\u3164\uFEFF\uFFA0]/g;
/* half of an emoji -- a clamp at 200 code units can cut one in two */
const LONE_SURROGATE = /\p{Cs}/gu;
/* more than MARKS_MAX combining marks in a row: keep the first MARKS_MAX */
const STACKED_MARKS = new RegExp('(\\p{M}{' + CHAT_GUARD.MARKS_MAX + '})\\p{M}+', 'gu');
/* one character (not a digit) more than RUN_MAX times in a row */
const LONG_RUN = new RegExp('(\\P{Nd})\\1{' + CHAT_GUARD.RUN_MAX + ',}', 'gu');
const PICT = /\p{Extended_Pictographic}/u;
const MARK = /\p{M}/u;
/* a joiner with nothing to join on one side: at either end, beside a space or
   beside another joiner */
const LOOSE_JOINER = /(?<![^\s\u200D])\u200D|\u200D(?![^\s\u200D])/gu;
/* something you can see: not a space, a combining mark or a format character */
const VISIBLE = /[^\s\p{M}\p{Cf}]/u;

const ZWJ = '\u200D';
const VS16 = '\uFE0F';
const KEYCAP = 0x20E3;

/* What belongs to the emoji before it: a joiner (and so whatever it joins), a
   skin tone, the tag letters of a region's flag, and any combining mark -- the
   variation selectors and the keycap's frame are marks too. */
function attachedToEmoji(ch, cp) {
  return cp === 0x200D
    || (cp >= 0x1F3FB && cp <= 0x1F3FF)
    || (cp >= 0xE0020 && cp <= 0xE007F)
    || MARK.test(ch);
}

/* At most `max` emoji, the rest dropped tidily.  An emoji is a pictograph
   (counted one by one, as the plan says -- a family of three is three: a run
   of fifty pictographs joined by joiners is drawn as fifty on most phones, so
   counting a joined run as one would let a wall through), a flag (two
   regional letters, one emoji), a keycap (the digit stays as itself) or a skin
   tone on its own (drawn as a colour swatch; after a pictograph it is part of
   that one). */
function capEmoji(s, max) {
  const out = [];
  let n = 0;
  let dropping = false;   // inside an emoji that was dropped: what is attached to it goes too
  let flagHalf = 0;       // a flag's first letter was just kept (1) or dropped (-1)
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (dropping && attachedToEmoji(ch, cp)) continue;
    if (cp >= 0x1F1E6 && cp <= 0x1F1FF) {
      if (flagHalf !== 0) {   // the second letter follows the first
        if (flagHalf > 0) out.push(ch);
        dropping = flagHalf < 0;
        flagHalf = 0;
        continue;
      }
      if (n < max) { n++; out.push(ch); flagHalf = 1; dropping = false; }
      else { while (out.length && out[out.length - 1] === ZWJ) out.pop(); flagHalf = -1; dropping = true; }
      continue;
    }
    flagHalf = 0;
    const tone = cp >= 0x1F3FB && cp <= 0x1F3FF;
    if (PICT.test(ch) || (tone && !(out.length && PICT.test(out[out.length - 1])))) {
      if (n < max) { n++; out.push(ch); dropping = false; }
      else {
        /* a joiner left at the end of the kept part would join it to nothing */
        while (out.length && out[out.length - 1] === ZWJ) out.pop();
        dropping = true;
      }
      continue;
    }
    if (cp === KEYCAP) {
      if (n < max) { n++; out.push(ch); }
      else if (out.length && out[out.length - 1] === VS16) out.pop();   /* the digit stays plain */
      continue;
    }
    dropping = false;
    out.push(ch);
  }
  return out.join('');
}

/* A chat line, cleaned (the pure half: chat-guard.test.mjs runs it alone).
   Called AFTER each lane's own clamp, strip and trim, so it never sees more
   than one line's 200 characters, and it only ever takes characters away.
   THE ORDER MATTERS: whatever takes characters OUT (the invisible ones, the
   emoji past the cap, a joiner left joining nothing) goes before what
   MEASURES runs (the marks, the repeated key), or the removal could join two
   short runs into one too long -- "aaa😀aaaa" with the 😀 past the cap, or
   accents either side of a dropped emoji.  Cleaning a cleaned line changes
   nothing (the suite holds that over thousands of random lines). */
export function cleanChatText(text) {
  if (typeof text !== 'string' || !text) return '';
  let s = text.replace(LONE_SURROGATE, '').replace(INVISIBLE, '');
  s = capEmoji(s, CHAT_GUARD.EMOJI_MAX);
  s = s.replace(LOOSE_JOINER, '');
  s = s.replace(STACKED_MARKS, '$1');
  s = s.replace(LONG_RUN, (run, ch) => ch.repeat(CHAT_GUARD.RUN_MAX));
  s = s.replace(/\s+/g, ' ').trim();
  return VISIBLE.test(s) ? s : '';
}

/* What the repeat filter compares: the cleaned line, lower case, its spaces
   collapsed and trimmed -- and without the invisible characters the cleaning
   KEEPS (a joiner, a variation selector, the grapheme joiner U+034F, a format
   character): between two letters each changes nothing you can see, so
   "h<joiner>i" is the same line as "hi" and must not pass for a new one. */
const KEY_UNSEEN = /[\p{Cf}\u034F\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu;
export function chatRepeatKey(text) {
  if (typeof text !== 'string') return '';
  return text.replace(KEY_UNSEEN, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export const chatGuardMethods = {
  /* `chatguard: false` in the live flags: all three guards off */
  _chatGuardOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'chatguard') && !f.chatguard);
  },

  /* A lane's text, cleaned -- or untouched under the kill switch. */
  _chatGuardClean(text) {
    if (this._chatGuardOff()) return text;
    return cleanChatText(text);
  },

  /* This connection's allowance and repeat memory, made on first use. */
  _chatGuardOf(session, now) {
    let g = session.chatGuard;
    if (!g) g = session.chatGuard = { tokens: SOCIAL.BURST, at: now, said: [], dropped: 0, repeats: 0 };
    return g;
  },

  /* Does this relay type spend the social allowance (and not the relay
     bucket)?  Chat and emotes, unless the guard is off. */
  _socialLane(type) {
    return SOCIAL.TYPES.has(type) && !this._chatGuardOff();
  },

  /* Spend one from the social allowance; false when it is empty (the relay is
     dropped).  Fractional, as the relay bucket is, so it is exactly one every
     REFILL_MS however the lines are spaced. */
  _socialAllow(session, now) {
    const g = this._chatGuardOf(session, now);
    g.tokens = Math.min(SOCIAL.BURST, g.tokens + Math.max(0, now - g.at) / SOCIAL.REFILL_MS);
    g.at = now;
    if (g.tokens < 1) { g.dropped++; return false; }
    g.tokens -= 1;
    return true;
  },

  /* Has this player said this line in this lane ('room' or 'area') inside
     REPEAT_MS?  True drops it.  False remembers it as said now, so it is the
     last thing a lane asks before the line goes out.  A dropped repeat does
     not restart the window: the same line can go out once every REPEAT_MS. */
  _chatRepeated(session, lane, text) {
    if (this._chatGuardOff() || !session) return false;
    const now = Date.now();
    const g = this._chatGuardOf(session, now);
    const key = chatRepeatKey(text);
    const said = g.said;
    let keep = 0;
    for (const e of said) if (now - e.at < CHAT_GUARD.REPEAT_MS) said[keep++] = e;
    said.length = keep;
    for (const e of said) {
      if (e.lane === lane && e.key === key) { g.repeats++; return true; }
    }
    said.push({ lane, key, at: now });
    if (said.length > CHAT_GUARD.REPEAT_KEEP) said.splice(0, said.length - CHAT_GUARD.REPEAT_KEEP);
    return false;
  },
};
