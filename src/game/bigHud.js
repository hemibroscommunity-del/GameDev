/* ═══ v2.3.6847: THE ATTACK BUTTON AND THE HUD, ABOUT TWICE AS BIG (card UI4; `?bighud=0` today's) ═══
 *
 * The owner, about 07:05 UTC 2026-11-28, after playing the new menus on
 * their iPhone: "Attack button and HUD need to be about twice as big."
 * And, with the menu design, 2026-11-27: "Do not compromise readability,
 * available screen space, gameplay visibility or device fairness to
 * accommodate a design. Flag unresolved requirements rather than inventing
 * solutions."
 *
 * So each grows TOWARDS twice, as far as the screen holds it, and never over
 * a neighbour; what gives way is said (docs/UI-DESIGN-NOTES.md "The Attack
 * button and the HUD, bigger"):
 *   - THE HUD (the owner's pictures, src/ui/hud/HudArt.jsx: the face ring,
 *     the badge, the weapon's bar, the name) is drawn at one scale, its
 *     --ha-k (today 1, sideways .92): up to twice that, as wide as the room
 *     left of the minimap allows (the minimap is the world's top right,
 *     132 px a side on a phone: wheelMiniSize.js), and sideways as tall as
 *     the room above the controller's stick lobe allows.  Never under
 *     today's.  The stack under it (the status chips, the party chip) moves
 *     down with it (--bt-charhud-h), sideways the party chip beside it.
 *   - ATTACK (the controller's well, src/game/padSkin.js padLayout) grows
 *     towards twice its face, from today's centre, as far as it stays clear
 *     of the big left button's box (Jump, or Block in a fight), the top
 *     row's art (Mobility, the middle well, Special: their boxes rise off it
 *     as padLayout already lifts them off the big buttons), the column's
 *     right edge and the band's top.  Its touch box is its face (as today:
 *     padSpot's box is the face, 44 at least).  The other controls do not
 *     move; the stick's lobe is far to the left.
 * Neither changes how a press is read: the disc is the touch target, only
 * bigger.  The band's heights, the camera and the world's scale are untouched.
 * A computer (a mouse: no controller, the wide window) keeps today's sizes:
 * the owner played a phone, and a computer's HUD has the whole window.
 *
 * No DOM here (node tests it: tools/guards/big-hud.test.mjs).
 */
import { readerFor, pageAddress, swValue } from './switches.js';

export const BIG_HUD = Object.freeze({
  /* the owner's "about twice" */
  WANT: 2,
  /* the HUD's drawn box at scale 1 (charHud.js CHAR_HUD, hudArt.js HUD_ART) and its left */
  HUD_W: 184, HUD_H: 52, LEFT: 8,
  /* the minimap's side on a phone (wheelMiniSize.js WHEEL_MINI_PX): its left is the world's right less this */
  MINI: 132,
  /* air between the HUD and the minimap, and over the stick's lobe (px) */
  AIR: 8,
  /* the HUD's top under the top bar (game.css --bt-hud-base's 56, the notch aside) */
  BASE: 56,
  /* the stack under the HUD: its height plus the 4 px gap (CHAR_HUD stack 56 = 52 + 4) */
  GAP: 4,
  /* Attack's least air to the column's edge and the band's top (px) */
  EDGE: 2,
  /* the stick's lobe's top in the controller's 280 reference (tutorClear.js: 27.8) */
  LOBE_TOP: 27.8, REF_H: 280, REF_W: 920, REF_VW: 430,
  /* sideways today the HUD is drawn at .92 (hudArt.js K_SIDE) */
  SIDE_K: 0.92,
});

/* ═══ THE SWITCH: on unless `?bighud=0` (remembered under BIG_HUD_KEY; `?bighud=1` forgets) ═══ */
export const BIG_HUD_KEY = 'bt_bighud';

/** Are the bigger Attack and HUD wanted on this device?  `search`, `store` for tests. */
export function bigHudWanted(search, store) {
  const v = search == null ? swValue('bighud') : readerFor(search).swValue('bighud');
  let ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  if (v === '0' || v === '1') {
    try { if (ls) { if (v === '0') ls.setItem(BIG_HUD_KEY, '0'); else ls.removeItem(BIG_HUD_KEY); } } catch (e) { /* the address still decides this visit */ }
    return v === '1';
  }
  try { return !(ls && ls.getItem(BIG_HUD_KEY) === '0'); } catch (e) { return true; }
}

/* the page's answer, asked again only when its address changes */
const _big = { at: null, on: null };
/** The page's: bigger on? */
export function bigHudOn() {
  const s = pageAddress();
  if (_big.at !== s) { _big.at = s; _big.on = bigHudWanted(s); }
  return _big.on;
}

const r2 = (v) => Math.round(v * 100) / 100;

/** THE HUD'S SCALE (its --ha-k).  `worldW` the world's width (the canvas's,
 *  told: renderRes canvasCssW, else the column's), `worldL` the world's left
 *  in the HUD's own box (sideways under the one band the world sits between
 *  two bars and the HUD stands in the window: 46; upright 0), `short` a short
 *  screen (sideways: the HUD's own media query, max-height 480), `worldH` the
 *  world's height (the canvas's, told), `on` the switch.  Off: today's (1, or
 *  .92 sideways).  On: twice that at most, as wide as the room left of the
 *  minimap (and, sideways, as tall as the room above the stick's lobe), never
 *  under today's.  { k, w, h, today, want, wide, tall }: the scale, the drawn
 *  box (px), today's scale, the asked scale, and the room each way allows. */
export function hudScale({ worldW, worldL = 0, short = false, worldH = 0, on = true } = {}) {
  const B = BIG_HUD;
  const today = short ? B.SIDE_K : 1;
  const want = today * B.WANT;
  let k = today, wide = Infinity, tall = Infinity;
  if (on) {
    if (worldW > 0) wide = (worldL + worldW - B.MINI - B.AIR - B.LEFT) / B.HUD_W;
    if (short && worldH > 0) {
      const s = Math.min(worldW > 0 ? worldW : B.REF_VW, B.REF_VW) / B.REF_W;
      const lobe = (B.REF_H - B.LOBE_TOP) * s;   /* the stick lobe's top over the band */
      tall = (worldH - lobe - B.AIR - B.BASE) / B.HUD_H;
    }
    k = Math.max(today, Math.min(want, wide, tall));
  }
  k = Math.floor(k * 100 + 1e-9) / 100;   /* down, never past the room */
  return { k, w: r2(B.HUD_W * k), h: r2(B.HUD_H * k), today, want, wide: r2(wide), tall: r2(tall) };
}

/** The stack under the HUD (game.css --bt-charhud-h) at scale `k`: today's
 *  56 upright (52 + 4), 52 sideways (48 + 4). */
export function hudStack(k) {
  return Math.round(BIG_HUD.HUD_H * k + BIG_HUD.GAP);
}

/** ATTACK'S WELL, bigger.  `L` a padLayout() (padSkin.js), `want` the asked
 *  factor (2).  A new layout (L is never changed): the attack well's face
 *  `d` grown towards want x today's, from today's centre as far as it stays
 *  clear of the big button's box, the top row's art (each of whose boxes
 *  rises off it, padLayout's own rule: never past its art's foot), the
 *  column's edge and the band's top; its box the face (44 at least).  Every
 *  other well as it was.  `grow` on the result: { from, to, want, room }. */
export function bigAttack(L, want) {
  if (!L || !L.wells || !L.wells.attack || !L.wells.big) return L;
  const B = BIG_HUD;
  const a = L.wells.attack, big = L.wells.big;
  const target = a.d * (want > 0 ? want : B.WANT);
  const right = L.shell.w - B.EDGE;
  const left = big.box.x + big.box.size / 2 + 1;   /* a pixel of air past the big button's box */
  let top = Infinity;
  for (const n of ['mobility', 'mid', 'special']) {
    const w = L.wells[n];
    if (!w) continue;
    const half = Math.max(w.d, w.box.size) / 2;
    if (w.x + half <= left || w.x - half >= right) continue;   /* not over Attack's span */
    top = Math.min(top, w.y - w.d / 2 - 1);   /* under its art's foot, a pixel of air */
  }
  const room = Math.min(right - left, top - B.EDGE);
  const d = Math.max(a.d, Math.min(target, room));
  const cx = Math.min(Math.max(a.x, left + d / 2), right - d / 2);
  const cy = Math.min(Math.max(a.y, B.EDGE + d / 2), top - d / 2);
  const wells = Object.create(null);
  for (const n of Object.keys(L.wells)) {
    const w = L.wells[n];
    wells[n] = { x: w.x, y: w.y, d: w.d, box: { x: w.box.x, y: w.box.y, size: w.box.size } };
  }
  const size = Math.max(44, d);
  wells.attack = { x: cx, y: cy, d, box: { x: cx, y: cy, size } };
  /* a top-row box over Attack's new span rises off it (padLayout's own rule
     for the big buttons: never past its art's foot); the others stay put */
  const aTop = cy + size / 2;
  for (const n of ['mobility', 'mid', 'special']) {
    const w = wells[n];
    if (!w) continue;
    const half = w.box.size / 2;
    if (w.box.x + half <= cx - size / 2 || w.box.x - half >= cx + size / 2) continue;
    const low = w.box.y - half;
    if (low < aTop + 1) w.box.y = Math.min(aTop + 1 + half, w.y - w.d / 2 + half);
  }
  return { ...L, wells, grow: { from: r2(a.d), to: r2(d), want: r2(target), room: r2(room) } };
}
