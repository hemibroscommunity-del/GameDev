/* ═══ v2.3.6790: THE TOP-LEFT CORNER HOLDS THE CHARACTER HUD, AND NOTHING ELSE ALWAYS THERE (card UI3, PR 10) ═══
 *
 * The owner, 2026-11-27 (about 04:36 UTC), in the orchestrator's session:
 * "When is the character hud going in top left? Also move stuff out of the
 * way. Maybe just keep quests in quest area for now. Leave only character
 * hud in top left corner."
 *
 * So, in play, with the character HUD up (charHud.js charHudOn):
 *   - THE QUEST LINE LEAVES THE WORLD.  QuestCard.jsx draws nothing: the
 *     tracked quest, its steps and its "ready" live on the Quests page.  The
 *     Quests button's own dot (BottomDashboard.jsx `dots.quests`,
 *     readyQuestCount: a quest ready to hand in, or a reward waiting) was
 *     already there, so no new mark was needed.  The world's markers, the
 *     minimap's, the coach's lessons and the turn-in are untouched.
 *   - `?questline=1` brings the one line back (remembered on this device
 *     under QUEST_LINE_KEY; `?questline=0` forgets).  Under `?hud=0` the
 *     quest card is main's full card, whatever this says.
 *   - THE THINGS THAT SHOW ONLY AT TIMES (the status column: the element
 *     chips, the buffs, the trap's button; the party chip) take the line's
 *     place: the status column right under the HUD's gap, the party chip
 *     under the column's two rows (sideways BESIDE the HUD, as before).
 *   - The coach keeps its cards off the HUD alone (cornerBox, cornerSpan):
 *     never off a line that is not there, and never off nothing.
 *
 * hudCorner() is the answer in numbers (px under the top bar's line,
 * --bt-hud-base); src/styles/game.css draws them (html[data-charhud="1"], and
 * html[data-questline="1"] that QuestCard.jsx writes while the line is
 * drawn), and tools/guards/hud-corner.test.mjs holds the two equal.  No
 * React here, and no read of the page's layout: node tests it.
 */
import { readerFor, pageAddress, swValue } from './switches.js';
import { CHAR_HUD, charHudOn, charHudSpan } from './charHud.js';

/* the switch's memory on this device (`?questline=1` remembered; `=0` forgets) */
export const QUEST_LINE_KEY = 'bt_questline';

/* the status column's two rows (a chip row and the buff row): where the
   party chip stands under it upright (game.css, as UI3-hud's +48) */
export const STATUS_ROWS = 48;

/** Is the quest line wanted under the HUD on this device?  Off unless
 *  `?questline=1` (remembered under QUEST_LINE_KEY, '1'); `?questline=0`
 *  forgets.  The address through the page's one reader (switches.js);
 *  `search` and `store` are for tests. */
export function questLineWanted(search, store) {
  const v = search == null ? swValue('questline') : readerFor(search).swValue('questline');
  let ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  if (v === '0' || v === '1') {
    try { if (ls) { if (v === '1') ls.setItem(QUEST_LINE_KEY, '1'); else ls.removeItem(QUEST_LINE_KEY); } } catch (e) { /* the address still decides this visit */ }
    return v === '1';
  }
  try { return !!(ls && ls.getItem(QUEST_LINE_KEY) === '1'); } catch (e) { return false; }
}

/* the page's answer, asked again only when its address changes */
let _forAddr = null;
let _want = false;
function questLineNow() {
  const s = pageAddress();
  if (_forAddr !== s) { _forAddr = s; _want = questLineWanted(s); }
  return _want;
}

/** What the corner holds, and where the things that show at times stand.
 *  `st`: { hud, questline, sideways } (booleans).  Returns
 *   { quest: 'card' | 'line' | 'none',   the quest tracker drawn in play
 *     keep:  'quest' | 'hud',            the box the coach keeps clear of
 *     stack, status, partyTop, partyLeft }
 *  the numbers in px under the top bar's line (--bt-hud-base): where the
 *  stack under the HUD starts (--bt-hud-top), the status column's top, the
 *  party chip's top and left.  HUD off: null numbers (game.css's
 *  fallbacks, main's places, untouched). */
export function hudCorner(st) {
  const s = st || {};
  if (!s.hud) return Object.freeze({ quest: 'card', keep: 'quest', stack: null, status: null, partyTop: null, partyLeft: null });
  const side = !!s.sideways;
  const line = !!s.questline;
  const stack = side ? CHAR_HUD.sideStack : CHAR_HUD.stack;
  /* the line's band: its 44 px hit box upright; sideways the line as drawn
     and the gap (the room above the controller is short there) */
  const band = line ? (side ? CHAR_HUD.line + CHAR_HUD.gap : CHAR_HUD.lineHit) : 0;
  const status = stack + band;
  return Object.freeze({
    quest: line ? 'line' : 'none',
    keep: line ? 'quest' : 'hud',
    stack,
    status,
    partyTop: side ? 0 : status + STATUS_ROWS,
    partyLeft: side ? CHAR_HUD.left + CHAR_HUD.sideW + 8 : CHAR_HUD.left,
  });
}

/** The page's: 'card' (no HUD: main's quest card), 'line' (`?questline=1`)
 *  or 'none' (the default with the HUD: nothing drawn).  Sideways moves only
 *  numbers (game.css's media query), never this. */
export function cornerQuest() {
  return hudCorner({ hud: charHudOn(), questline: charHudOn() && questLineNow() }).quest;
}

/* the boxes the coach can measure (its one read, QuestCoach.jsx) */
export const CORNER_BOX = Object.freeze({ quest: '[data-quest-hud]', hud: '[data-charhud-box]' });

/** The selector of the box the coach keeps its cards clear of: the quest
 *  card (no HUD) or the line (stretched over the HUD by cornerSpan), else the
 *  HUD itself.  `quest` is for tests. */
export function cornerBox(quest) {
  const q = quest == null ? cornerQuest() : quest;
  return q === 'none' ? CORNER_BOX.hud : CORNER_BOX.quest;
}

/** The box to keep clear of, from the rect cornerBox measured: the line's
 *  stretched up over the HUD (charHudSpan), the HUD's and the card's as they
 *  are.  `quest` is for tests. */
export function cornerSpan(rect, quest) {
  const q = quest == null ? cornerQuest() : quest;
  return q === 'line' ? charHudSpan(rect, true) : rect;
}
