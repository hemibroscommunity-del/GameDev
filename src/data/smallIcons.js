/* ═══ v2.3.3279: THE OWNER'S SMALL ICONS ═══
 *
 * The owner, 2026-10-16, on the list of emoji and code-drawn pictures the game
 * still wore: "I want chatGPT to draw custom art for that stuff", and then four
 * sheets of it -- "Here's the art assets for the 'small icons'".  They are cut
 * by tools/ui/cut-small-icons.py from assets/icons-source/sheet-small-*.png,
 * and this is where the game finds them:
 *   - the party: on a party member's name plate (was 🎉), and the party
 *     window's marks (🎟️ the header, 👑 the leader, 💀 a member down, 📍 a
 *     member elsewhere);
 *   - the threat skull over a head (was 💀) and the talk bubble over a
 *     townsperson (was a tiny ★);
 *   - the chat's party, area and whisper lines (were 🛡, 📍 and ✉);
 *   - the HUD's buff badges (were 🔮 🩸 ⚔️ 💠 💚 🛡️ 🥧 💨);
 *   - "Defense Lv N" (was 🛡️), a popup mark in effectsRenderer;
 *   - the five ability buttons and the right stick's talk, door, sleep and
 *     farm steps, in controlSkin.jsx (their own URLs there).
 * The DOM ones are warmed on the loading screen (controlsPreload.js), the
 * canvas ones loaded there too (preloadAnimations.js): never on first use.
 *
 * No imports: node-tested (server/test/small-icons.test.mjs).
 */
const V = '?v=2.3.3279';
const ui = (name) => '/icons/ui/' + name + '.webp' + V;

export const SMALL_ICON = Object.freeze({
  partyMember: ui('party-member'),
  partyLeader: ui('party-leader'),
  partyDown: ui('party-down'),
  partyAway: ui('party-away'),
  threatSkull: ui('threat-skull'),
  npcTalk: ui('npc-talk'),
  chatParty: ui('chat-party'),
  chatArea: ui('chat-area'),
  chatWhisper: ui('chat-whisper'),
});

export const BUFF_ICON = Object.freeze({
  cursed: ui('buff-cursed'),
  bleed: ui('buff-bleed'),
  damage: ui('buff-damage'),
  mana: ui('buff-mana'),
  regen: ui('buff-regen'),
  resist: ui('buff-resist'),
  xp: ui('buff-xp'),
  speed: ui('buff-speed'),
});

/* The canvas's three (the plate's party badge, the threat skull, the talk
   bubble): the same 64 px files -- every small mark is cut at the size it is
   drawn (tools/ui/cut-small-icons.py size_of), and a bigger texture drawn at
   14-28 world px would only shimmer as the view slides. */
export const SMALL_TEX = Object.freeze({
  partyMember: SMALL_ICON.partyMember,
  threatSkull: SMALL_ICON.threatSkull,
  npcTalk: SMALL_ICON.npcTalk,
});

/* The popup mark's key and file (effectsRenderer POPUP_ICON_SRC) */
export const DEFENSE_POPUP_KEY = 'defense';
export const DEFENSE_POPUP_SRC = '/icons/popups/defense-up.webp';

/* What the page shows as <img>: warmed on the loading screen
   (controlsPreload.js).  The skull and the talk bubble are the canvas's only. */
export function smallIconDomUrls() {
  const canvasOnly = new Set([SMALL_ICON.threatSkull, SMALL_ICON.npcTalk]);
  return Object.values(SMALL_ICON).filter((u) => !canvasOnly.has(u)).concat(Object.values(BUFF_ICON));
}

/* ═══ THE CHAT'S LANES ═══
 * A chat line's name carries its lane as a leading mark (game/chat.js: '🛡 '
 * party, '📍 ' area, '✉ ' whisper, on the lines it makes and the ones the
 * worker relays).  The feed draws the owner's picture for it and the rest of
 * the name as text.  Returns { lane, rest } or null for an ordinary name. */
const LANES = [['\u{1F6E1}', 'party'], ['\u{1F4CD}', 'area'], ['✉', 'whisper']];
export function chatLaneOf(name) {
  if (typeof name !== 'string' || !name) return null;
  for (const [mark, lane] of LANES) {
    if (name.startsWith(mark)) {
      let rest = name.slice(mark.length);
      if (rest.charCodeAt(0) === 0xFE0F) rest = rest.slice(1);   /* a variation selector */
      return { lane, rest: rest.replace(/^\s+/, '') };
    }
  }
  return null;
}
/* ═══ v2.3.3361: A NAME CANNOT WEAR A LANE'S MARK ═══
 * The lane is read off the front of the name above, so a player NAMED
 * "✉ Mayor" -- names are free text, 2-20 characters -- had every ordinary
 * room line drawn as a whisper, "📍 ..." as area chat, "🛡 ..." as party chat.
 * Found by the fun & social plan's check of the code (docs/FUN-SOCIAL-PLAN.md).
 * The room handler takes the marks off a sender's name before it is logged
 * (game/chat.js), and the worker off the name it stamps (index.js
 * _sanitizeChatRelay); the lanes' own lines add theirs after.  Every mark at
 * the front goes, with its variation selector and the spaces after it. */
export function stripLaneMarks(name) {
  if (typeof name !== 'string') return '';
  let s = name;
  for (let guard = 0; guard < 16; guard++) {
    let hit = false;
    for (const [mark] of LANES) {
      if (s.startsWith(mark)) {
        s = s.slice(mark.length);
        if (s.charCodeAt(0) === 0xFE0F) s = s.slice(1);
        s = s.replace(/^\s+/, '');
        hit = true;
      }
    }
    if (!hit) break;
  }
  return s;
}
export const CHAT_LANE_ICON = Object.freeze({
  party: SMALL_ICON.chatParty,
  area: SMALL_ICON.chatArea,
  whisper: SMALL_ICON.chatWhisper,
});
