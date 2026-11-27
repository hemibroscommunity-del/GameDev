/* ═══ v2.3.6781: THE CHARACTER HUD, TOP LEFT -- ITS RULES (card UI3, PR 2) ═══
 *
 * The owner, 2026-11-26 (docs/design/UI_FEEDBACK_2026-11-26.md part 1): "I
 * strongly agree with moving the character portrait into the top-left
 * corner. It gives players a persistent sense of identity and progression,
 * regardless of which menu they have open."  "Portrait: Always visible and
 * tappable. Name and combat level: Immediately adjacent to the portrait. XP
 * bar: Persistent gold progression bar. Quest: Smaller, single-line tracker
 * underneath."  "I would display the XP progress of whichever weapon is
 * closest to increasing the overall combat level. Label the XP bar with that
 * weapon so players understand the relationship."  "Tapping the portrait
 * should immediately open the character dashboard."
 *
 * The drawing is src/ui/hud/CharacterHud.jsx (and charHud.css); this file is
 * what it shows, with no React, so tools/guards/char-hud.test.mjs runs it in
 * node.  It shows the face, the name, "Lv N" and ONE weapon's XP bar, no more:
 * health and energy stay off the top left (the owner took the old frame out
 * on 2026-11-03, v2.3.4163; their later word lists these four, no more).
 *
 * WHICH WEAPON.  The combat level is the game's (combatHub.js combatLevel:
 * the best weapon's under one level, the three added up before it), and its
 * next level comes from heroModel.js combatLevelProgress's rule: under one
 * level only a weapon AT the top level brings it (a weapon below the top
 * levels up without raising yours), the one with the largest share of its
 * next level; without one level any weapon below the cap.  That function
 * answers HOW FAR, never WHICH, so the rule is restated here and keeps the
 * weapon (the suite holds the two equal on every blob it tries).  NOT
 * bestWeaponProgress, which is the weapon closest to ITS OWN next level: a
 * Sword at 90% of level 10 beside a Bow at 10% of level 12 is the Sword
 * there, and the Bow here (only the Bow can make you level 13).
 *
 * BEFORE THE WORKER'S RECORD (prog3Live false) the HUD has the face and the
 * name only: never a guessed "Lv 1".
 */
import { PROG3, prog3Live, prog3SkillLevel, prog3XpRequired, prog3CharLevel } from '../data/prog3.js';
import { isOneLevelEnabled } from '../data/oneFormula.js';
import { readerFor, pageAddress, swValue } from './switches.js';
import { xpShowMs } from './xpBar.js';
import { say } from '../game/say.js';   /* (written so the words guard reads it: say.test 7) */
import { SAY as HUD } from '../data/say/charHud.js';
import { SAY as CH } from '../data/say/combatHub.js';

/* the weapons, in the game's order (ties go to the first) */
const CATS = PROG3.SKILLS;

/* ═══ THE SIZES (the CSS in src/ui/hud/charHud.css draws these; the coach's
   avoidance reads them here, never off the page) ═══
   Upright and on a computer 184 x 52 (the face 44); sideways 176 x 48 (the
   face drawn 40 in a 44 hit box).  `gap` is between the HUD and the quest
   line; the line is 30 drawn in a 44 hit box (UI-BIBLE part 2: 44 pt).
   `stack` is how far the quest line moves down: the HUD and its gap
   (game.css --bt-charhud-h). */
export const CHAR_HUD = Object.freeze({
  left: 8,
  w: 184, h: 52, face: 44,
  sideW: 176, sideH: 48, sideFace: 40,
  gap: 4,
  line: 30, lineHit: 44,
  stack: 56, sideStack: 52,
});

/* the switch's memory on this device (`?hud=0` remembered; `?hud=1` forgets) */
export const CHAR_HUD_KEY = 'bt_charhud';

/** Is the HUD wanted on this device?  `?hud=0` turns it off and is
 *  remembered under CHAR_HUD_KEY ('0'), `?hud=1` forgets; on otherwise (a
 *  trial the owner likes is everyone's default, with its switch).  The
 *  address is read through the page's one reader (switches.js); `search`
 *  and `store` are for tests. */
export function charHudWanted(search, store) {
  const v = search == null ? swValue('hud') : readerFor(search).swValue('hud');
  let ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  if (v === '0' || v === '1') {
    try { if (ls) { if (v === '0') ls.setItem(CHAR_HUD_KEY, '0'); else ls.removeItem(CHAR_HUD_KEY); } } catch (e) { /* the address still decides this visit */ }
    return v === '1';
  }
  try { return !(ls && ls.getItem(CHAR_HUD_KEY) === '0'); } catch (e) { return true; }
}

/* the page's answer, asked again only when its address changes */
let _onFor = null;
let _on = null;
/** The page's: is the HUD on?  (QuestCard's one-line form, ZoneHeader's
 *  quiet XP slot and the coach's span all ask this one.) */
export function charHudOn() {
  const s = pageAddress();
  if (_onFor !== s) { _onFor = s; _on = charHudWanted(s); }
  return _on;
}

const whole = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);

/** The weapon whose next level raises the combat level soonest:
 *  { cat, max }.  `one`: the one-level rule (isOneLevelEnabled).  None can
 *  (the cap): max, and the weapon the first at the top level. */
export function charHudWeapon(rpg, one) {
  const lv = {};
  let top = 1;
  for (const c of CATS) { lv[c] = prog3SkillLevel(rpg, c); top = Math.max(top, lv[c]); }
  let best = null;
  let bestShare = -1;
  for (const c of CATS) {
    if (lv[c] >= PROG3.LEVEL_CAP) continue;
    if (one && lv[c] < top) continue;
    const sk = (rpg && rpg.prog3 && rpg.prog3.sk && rpg.prog3.sk[c]) || {};
    const need = Math.max(1, prog3XpRequired(lv[c]));
    const share = Math.min(whole(sk.xp), need) / need;
    if (share > bestShare) { best = c; bestShare = share; }
  }
  if (best) return Object.freeze({ cat: best, max: false });
  const first = CATS.find((c) => lv[c] === top);
  return Object.freeze({ cat: first, max: true });
}

/** What the HUD shows:
 *  { ready, name, level, cat, word, max, wLevel, xpNow, xpNeed, frac }.
 *  `one` defaults to the game's switch; `name` is S.myName. */
export function charHudModel(rpg, opts) {
  const o = opts || {};
  const name = typeof o.name === 'string' ? o.name : '';
  if (!prog3Live(rpg)) {
    return Object.freeze({ ready: false, name, level: null, cat: null, word: '', max: false, wLevel: null, xpNow: null, xpNeed: null, frac: 0 });
  }
  const one = o.one == null ? isOneLevelEnabled() : !!o.one;
  const w = charHudWeapon(rpg, one);
  const level = prog3CharLevel(rpg);
  const wLevel = prog3SkillLevel(rpg, w.cat);
  if (w.max) {
    return Object.freeze({ ready: true, name, level, cat: w.cat, word: say(HUD, 'charHud.max'), max: true, wLevel, xpNow: null, xpNeed: null, frac: 1 });
  }
  const sk = rpg.prog3.sk[w.cat] || {};
  const xpNeed = Math.max(1, prog3XpRequired(wLevel));
  const xpNow = Math.min(whole(sk.xp), xpNeed);
  const word = say(CH, w.cat === 'bow' ? 'combatHub.bow' : w.cat === 'staff' ? 'combatHub.staff' : 'combatHub.sword');
  return Object.freeze({ ready: true, name, level, cat: w.cat, word, max: false, wLevel, xpNow, xpNeed, frac: xpNow / xpNeed });
}

/** What XpTrack takes for the HUD's bar, and the pop beside it.
 *  `xb` is the last gain (S._xpBar, game/xpBar.js noteProg3Xp).
 *   - the bar MOVES only for its own weapon: a gain on it (same weapon,
 *     level and XP as the record) is handed over whole, so XpTrack draws its
 *     white and counts its number as the top bar's did;
 *   - otherwise the bar stands still at the record's numbers (`at` 0: no
 *     gain to grow from);
 *   - a gain on ANOTHER weapon is only its "+N XP", with that weapon's small
 *     picture, for its show (xpShowMs): { cat, gain, seq }.
 *  { bar: null } before the record.  At the cap the bar is full, no count. */
export function charHudBar(model, xb, now) {
  if (!model || !model.ready) return { bar: null, pop: null, live: false };
  const t = Number(now);
  let pop = null;
  if (xb && xb.cat !== model.cat && whole(xb.gain) > 0 && t - Number(xb.at) < xpShowMs(xb)) {
    pop = { cat: xb.cat, gain: whole(xb.gain), seq: xb.seq };
  }
  if (model.max) {
    /* drawn full, with no track to count (CharacterHud.jsx) */
    return { bar: { cat: model.cat, level: model.wLevel, frac: 1, max: true }, pop, live: false };
  }
  if (xb && xb.cat === model.cat && Number(xb.level) === model.wLevel && Math.min(whole(xb.xp), model.xpNeed) === model.xpNow) {
    return { bar: xb, pop, live: true };
  }
  return {
    bar: { cat: model.cat, level: model.wLevel, xp: model.xpNow, need: model.xpNeed, frac: model.frac, at: 0, up: false,
      fromLevel: model.wLevel, fromFrac: model.frac, fromXp: model.xpNow, fromNeed: model.xpNeed },
    pop,
    live: false,
  };
}

const oneLine = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

/** The quest tracker's ONE line under the HUD: the owner's own "[Into the
 *  Wild · 3/5 · Defeat 5 monsters]" (title · count · objective, from
 *  questCard.js questCardWords), or between quests "Next: <quest> · Talk to
 *  <giver>" (`tour`: { next, talk }, already worded).  Never a newline. */
export function charHudQuestLine(words, tour) {
  const parts = words
    ? [words.title, words.count, words.line]
    : (tour ? [tour.next, tour.talk] : []);
  return parts.map(oneLine).filter(Boolean).join(' · ');
}

/** The coach keeps its cards off the quest card by its measured box; with
 *  the HUD on, the HUD and the line are one box: the card's rect stretched up
 *  over the HUD (to the top bar) and out to the HUD's width.  From this
 *  file's numbers, never a new read of the page.  `on` is for tests. */
export function charHudSpan(rect, on) {
  if (!rect) return rect;
  if (!(on == null ? charHudOn() : on)) return rect;
  /* the HUD and the card share their left (both `left: 8` in one layer) */
  const top = rect.top - CHAR_HUD.stack;
  const left = rect.left;
  const right = Math.max(rect.right, left + CHAR_HUD.w);
  return { left, top, right, bottom: rect.bottom, width: right - left, height: rect.bottom - top };
}
