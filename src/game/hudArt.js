/* ═══ v2.3.6787: THE CHARACTER HUD IN THE OWNER'S PICTURES -- ITS RULES (card UI3, PR 8) ═══
 *
 * The owner, 2026-11-26 (20:3x UTC), with one picture
 * (assets/icons-source/owner-2026-11-26-hud/sheet.png): "Use these art assets
 * for a new compact hud in top left and weapon xp bar".  And (20:4x UTC):
 * "The tiny pill on the right of weapon xp bar should have weapon level.
 * Inside character badge goes combat lvl".  And, asked "the weapon in your
 * hand, or whichever is closest to raising your combat level?" (20:5x UTC):
 * "Weapon in hand".
 *
 * So UI3-hud's HUD (src/game/charHud.js, src/ui/hud/CharacterHud.jsx) is
 * dressed in the owner's pieces (tools/art/cut-hud.mjs cuts them into
 * public/ui/hud/): the player's own face in a steel ring, the COMBAT level in
 * the gold badge under it, and to its right one steel bar: the weapon IN HAND
 * in its small ring, the green fill its progress to its next level, the pill
 * at the bar's right end its LEVEL.  The drawing is src/ui/hud/HudArt.jsx
 * (and hudArt.css); this file is what it shows and where, with no React, so
 * tools/guards/hud-art.test.mjs runs it in node.
 *
 * TWO NUMBERS, NEVER SWAPPED.  The badge: the combat level, UI3-hud's model's
 * (prog3CharLevel: the best weapon's under one level, the three added up
 * before it; the worker's own rpg.level, dash/gearStats.js charLevel).  The
 * pill: the weapon in hand's own level (prog3SkillLevel, capped at 100).
 * Before the worker's record (prog3Live false) both are EMPTY, never "1".
 *
 * THE WEAPON IN HAND is prog3ActiveCat (rpg.activeSlot: 'ranged' the bow,
 * 'staff' the staff, else the sword): the owner's later word over UI3-hud's
 * "closest to raising the combat level" (charHudWeapon), which `?hudart=0`
 * keeps with UI3-hud's whole drawn HUD.
 *
 * THE SIZES are the sheet's top row (the HUD assembled), measured by the
 * cutter (src/data/hudArt.js HUD_ART_ROW: the face ring 48 CSS px and the
 * rest to it), fitted to UI3-hud's own box (charHud.js CHAR_HUD: 184 x 52),
 * so the quest line, the status column and the party chip under it stand
 * where they stood.  The sheet's bar is 162 px at that scale: it is drawn 134
 * here (its middle stretches; its ends never), so the group keeps UI3-hud's
 * gap to the minimap at 375 px wide.  Sideways (a short screen) all of it at
 * 92 % (hudArt.css: one variable).
 */
import { prog3Live, prog3ActiveCat, prog3CharLevel } from '../data/prog3.js';
import { weaponProgress } from './progression.js';
import { readerFor, pageAddress, swValue } from './switches.js';
import { HUD_ART_PIECES as P, HUD_ART_ROW as ROW } from '../data/hudArt.js';
import { CHAR_HUD } from './charHud.js';
import { XP_BAR_ICONS } from '../ui/mobile/xpBarArt.js';

/* ═══ THE PICTURES' ADDRESSES ═══
   /ui/ is not one of the build's stamped families (tools/assets/versions.mjs
   PAGE_FAMILIES), so the `?v=` is by hand: bumped when a picture changes
   (as controlSkin.jsx PAD_ART_VER). */
export const HUD_ART_VER = '2.3.6787';
export const HUD_ART_NAMES = Object.freeze(Object.keys(P));
export function hudArtUrl(name) { return '/ui/hud/' + name + '.png?v=' + HUD_ART_VER; }
/* warmed behind the loading screen (rendering/controlsPreload.js) */
export const HUD_ART_URLS = Object.freeze(HUD_ART_NAMES.map(hudArtUrl));

/* ═══ THE LAYOUT, in CSS px upright (and on a computer); sideways K_SIDE times ═══ */
const half = (v) => Math.round(v * 2) / 2;
const css = (filePx) => filePx / 2;   /* 2 file px a CSS px (the art law) */
function layout() {
  const W = CHAR_HUD.w, H = CHAR_HUD.h;
  const face = ROW.face;
  const gap = Math.max(2, Math.round(ROW.gap));
  const barX = face + gap;
  const wring = css(P.wring.w);
  const trackH = css(P.track.h);
  const mid = face / 2;   /* the bar is centred on the ring's middle (the sheet) */
  const track = { x: barX + 3, y: half(mid - trackH / 2), w: W - (barX + 3), h: trackH, cap: css(P.track.slice) };
  const pill = { w: css(P.pill.w), h: css(P.pill.h) };
  pill.x = half(W - (trackH - pill.h) / 2 - pill.w);
  pill.y = half(mid - pill.h / 2);
  const fillH = css(P.fill.h);
  const fill = { x: barX + wring - 1, y: half(mid - fillH / 2), h: fillH, cap: css(P.fill.slice) };
  fill.w = half(pill.x - 1 - fill.x);   /* the inner width: from the small ring to the pill */
  const badge = { w: css(P.badge.w), h: css(P.badge.h) };
  badge.x = half((face - badge.w) / 2);
  badge.y = half(Math.min(H - badge.h, face - ROW.badgeOver));
  const hole = css(P['face-ring'].hole) * 2;   /* the ring's hole, across */
  return Object.freeze({
    w: W, h: H,
    face: Object.freeze({ x: 0, y: 0, size: face, img: half(hole + 2) }),
    badge: Object.freeze(badge),
    bar: Object.freeze({ x: barX, w: W - barX }),
    wring: Object.freeze({ x: barX, y: half(mid - wring / 2), size: wring, icon: 18 }),
    track: Object.freeze(track),
    fill: Object.freeze(fill),
    pill: Object.freeze(pill),
    /* the name: one line over the track, from the small ring to the bar's end */
    name: Object.freeze({ x: barX + wring + 1, y: 0, w: W - (barX + wring + 1), h: track.y, size: 11 }),
    count: 10,
  });
}
export const K_SIDE = 0.92;
export const HUD_ART = layout();

/* ═══ THE SWITCH: `?hudart=0` gives UI3-hud's drawn HUD back (remembered under
   HUD_ART_KEY; `?hudart=1` forgets); on otherwise.  `?hud=0` hides the HUD
   whatever this says (CharacterHud.jsx asks charHudOn first). ═══ */
export const HUD_ART_KEY = 'bt_hudart';

/** Is the owner's look wanted on this device?  `search`, `store` for tests. */
export function hudArtWanted(search, store) {
  const v = search == null ? swValue('hudart') : readerFor(search).swValue('hudart');
  let ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  if (v === '0' || v === '1') {
    try { if (ls) { if (v === '0') ls.setItem(HUD_ART_KEY, '0'); else ls.removeItem(HUD_ART_KEY); } } catch (e) { /* the address still decides this visit */ }
    return v === '1';
  }
  try { return !(ls && ls.getItem(HUD_ART_KEY) === '0'); } catch (e) { return true; }
}

/* the page's answer, asked again only when its address changes */
const _art = { at: null, on: null };
/** The page's: the owner's look on? */
export function hudArtOn() {
  const s = pageAddress();
  if (_art.at !== s) { _art.at = s; _art.on = hudArtWanted(s); }
  return _art.on;
}

/** The weapon in hand: 'sword', 'bow' or 'staff' (prog3ActiveCat). */
export function hudArtWeapon(rpg) {
  return prog3ActiveCat(rpg);
}

const EMPTY = Object.freeze({ ready: false, level: null, cat: null, weaponLevel: null, frac: 0, max: false, icon: null, xpNow: null, xpNeed: null });

/** What the owner's HUD shows:
 *  { ready, level, cat, weaponLevel, frac, max, icon, xpNow, xpNeed }.
 *  `hud` is UI3-hud's model (charHudModel): its `ready` and its `level` (the
 *  combat level) are the badge's; the rest is the weapon in hand's. */
export function hudArtModel(rpg, hud) {
  const ready = hud ? !!hud.ready : prog3Live(rpg);
  if (!ready || !rpg) return EMPTY;
  const cat = hudArtWeapon(rpg);
  const p = weaponProgress(rpg, cat);
  const level = hud && Number.isFinite(Number(hud.level)) && hud.level != null ? Number(hud.level) : prog3CharLevel(rpg);
  return Object.freeze({
    ready: true,
    level,
    cat,
    weaponLevel: p.level,
    frac: p.max ? 1 : Math.max(0, Math.min(1, Number(p.frac) || 0)),
    max: !!p.max,
    icon: cat === 'sword' ? hudArtUrl('wicon-sword') : XP_BAR_ICONS[cat],
    xpNow: p.max ? null : p.xpNow,
    xpNeed: p.max ? null : p.xpNeed,
  });
}

/** The green fill's drawn width and its clip, in CSS px (upright):
 *  { width, clip }.  Its two round ends never squash: from 0 to the two ends'
 *  width it is drawn at the two ends' width and clipped on its right to the
 *  fraction; above, it is the fraction of the inner width.  0 (or nothing
 *  known): nothing drawn; 1: the whole inner width.  Never wider than
 *  `innerW`, never negative. */
export function hudArtFill(frac, innerW, capW) {
  const W = Number(innerW), cap = Number(capW);
  const f = Number(frac);
  if (!(W > 0) || !Number.isFinite(f) || f <= 0) return Object.freeze({ width: 0, clip: 0 });
  const want = W * Math.min(1, f);
  const ends = Math.min(W, Math.max(0, Number.isFinite(cap) ? cap * 2 : 0));
  const r = (v) => Math.round(v * 100) / 100;
  if (want >= ends) return Object.freeze({ width: r(want), clip: 0 });
  return Object.freeze({ width: r(ends), clip: r(ends - want) });
}

/** UI3-hud's bar model (charHud.js charHudBar takes it) for the weapon in
 *  hand, so the bar moves only for it and a gain on another weapon pops. */
export function hudArtBarModel(art) {
  if (!art || !art.ready) return Object.freeze({ ready: false });
  return Object.freeze({ ready: true, cat: art.cat, max: art.max, wLevel: art.weaponLevel, xpNow: art.xpNow, xpNeed: art.xpNeed, frac: art.frac });
}
