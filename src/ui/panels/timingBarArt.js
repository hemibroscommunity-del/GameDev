/* ═══ v2.3.4625: THE TIMING BAR'S WEAPONS -- THE OWNER'S OWN SHEET ═══
 *
 * The owner, 2026-11-10: "I just added a sprite sheet for you to use for
 * filling up the weapons.  I'd like it to actually lay vertically in the
 * space above the left joystick and try it that way."
 *
 * One picture, public/sprites/timingbar/weapons.png: the owner's sheet at its
 * own pixel size (it came drawn at 3x; cut by nearest pixel, every pixel and
 * all 53 colours kept, an indexed PNG of 2.4 KB, about 100 KB decoded).  Left
 * half the EMPTY weapons (dark iron), right half the FULL ones (gold), the
 * full one exactly HALF_X to the right of its empty one, so one box shows
 * either by moving the picture.  Each weapon lies on its side, its grip at the
 * left and its point at the right -- the bar fills from the grip.
 *
 * The staff is in the sheet as the owner drew it; the bar does not show it
 * (manualCombat.js mcBarWeapon: no perfect strike for magic yet).
 *
 * No imports: the preloader (rendering/timingBarPreload.js) and the bar
 * (TimingBar.jsx) both read it.  Memory: docs/MEMORY-MAP.md, "UI icon". */
export const TB_ART_V = 1;
export const TB_ART = `/sprites/timingbar/weapons.png?v=${TB_ART_V}`;
export const TB_SHEET = Object.freeze({ w: 256, h: 96 });
export const TB_HALF_X = 128;
/* each weapon's EMPTY picture in the sheet, in its own pixels */
export const TB_RECT = Object.freeze({
  sword: Object.freeze({ x: 3, y: 4, w: 117, h: 25 }),
  bow: Object.freeze({ x: 3, y: 37, w: 119, h: 23 }),      /* the arrow */
  staff: Object.freeze({ x: 3, y: 66, w: 120, h: 29 }),
});
