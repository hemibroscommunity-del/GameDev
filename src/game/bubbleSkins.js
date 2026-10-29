/* ═══ v2.3.3522: WHOSE BUBBLE IS WHOSE (effectsRenderer _renderChatBubble) ═══
 *
 * The owner, playtesting in Halloween week: "Make Npc dialog boxes white. Keep
 * players the darker color to differentiate."
 *
 * Since v2.3.3395 every speech bubble wore one skin a day: the everyday white,
 * or -- 18 October to 1 November (game/season.js) -- Halloween's night purple,
 * for a townsperson's line and a player's alike.  So in Halloween week the
 * townsfolk's chatter and a player's chat looked the same, purple, and out of
 * it both were white.  Now the bubble says WHO is speaking:
 *
 *   - a townsperson (key 'npc:<id>', the renderer's own key for an NPC's line)
 *     is ALWAYS the white bubble, black words (`plain`);
 *   - a player is ALWAYS a dark one: Halloween's purple in its week
 *     (`halloween`), and the rest of the year a dark Lantern Slate bubble
 *     (`player`: the raised slate #2B3940 down to the panel's #202C32, the
 *     warm-white words #F7F2E7, a faint light edge so it reads on dark ground)
 *     -- "keep players the darker color" holds all year, so the difference is
 *     never only a season's.
 *
 * v2.3.3858: the owner, the morning of the showing: "Make chat bubble
 * background white and the chat font black" -- every bubble is `plain` now
 * (bubbleSkinFor), a player's as a townsperson's.
 *
 * Colours as data, no imports, so node reads it (server/test/season.test.mjs);
 * the renderer makes each skin's FillGradient once from `stops`. */

export const BUBBLE_SKINS = Object.freeze({
  /* the everyday white (v2.3.2823's gradient and grey edge) -- the townsfolk's */
  plain: Object.freeze({
    stops: Object.freeze(['#FFFFFF', '#F6F7F8', '#DCE2E5']),
    stroke: 0x8a949a, strokeAlpha: 1, text: '#000000',
  }),
  /* v2.3.3395's night purple ringed in pumpkin, cream words -- a player's, in
     Halloween week */
  halloween: Object.freeze({
    stops: Object.freeze(['#4A2C66', '#3A2152', '#26153A']),
    stroke: 0xFF8A1F, strokeAlpha: 1, text: '#FFE7C2',
  }),
  /* v2.3.3522: a player's the rest of the year -- Lantern Slate's raised card
     (#2B3940) into its panel (#202C32), text-1 words, border-strong's light
     edge a touch firmer (it sits on the world, not on a panel) */
  player: Object.freeze({
    stops: Object.freeze(['#2B3940', '#26343B', '#202C32']),
    stroke: 0xEEF2EB, strokeAlpha: 0.34, text: '#F7F2E7',
  }),
});

/** The skin for a bubble keyed `key` (a player's id, or 'npc:<id>' for a
 *  townsperson), with Halloween week on or off (`spooky`). */
export function bubbleSkinFor(key, spooky) {
  /* ═══ v2.3.3858: EVERY BUBBLE WHITE, BLACK WORDS ═══
     The owner: "Make chat bubble background white and the chat font black"
     -- a player's line too, now, in Halloween week and out of it, so the
     townsfolk's and a player's match again (v2.3.3522's "keep players the
     darker color" is replaced).  The dark skins stay in the table, unused,
     for the owner to bring back. */
  void key; void spooky;
  return 'plain';
}
