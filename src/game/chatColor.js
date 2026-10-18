/* ═══ v2.3.3391: A NAME'S COLOUR YOU CAN READ (docs/FUN-SOCIAL-PLAN.md) ═══
 *
 * A room chat line carries its sender's colour, drawn as their name's colour
 * in everyone's chat feed (WorldChatFeed.jsx: `color: m.color`).  The worker
 * relayed any string up to 32 characters there, so "transparent" made a name
 * invisible -- found by the fun & social plan's check of the code, Phase 0.
 * The worker keeps only a #rgb or #rrggbb now (index.js CHAT_COLOR_RE); this
 * side draws only one too (an older worker still relays anything), and lifts
 * a hex too dark for the feed toward white until it reads.
 *
 * Every colour an honest phone sends is one of PLAYER_COLORS
 * (data/constants.js), all of which already read: they are drawn unchanged.
 * No imports, so it can be read in node. */

export const CHAT_NAME_DEFAULT = '#8FB8C9';
/* the feed's own surface, rgba(13,22,27,.72): its darkest, over a dark world */
const FEED_BG = [13, 22, 27];
/* WCAG's 3:1, the floor for bold text: a name is bold */
export const NAME_CONTRAST_MIN = 3;

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function lin(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function lum(r, g, b) { return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); }
const BG_LUM = lum(FEED_BG[0], FEED_BG[1], FEED_BG[2]);

/* the contrast of r,g,b against the feed */
export function feedContrast(r, g, b) {
  const l = lum(r, g, b);
  return (Math.max(l, BG_LUM) + 0.05) / (Math.min(l, BG_LUM) + 0.05);
}

const hex2 = (n) => (n < 16 ? '0' : '') + n.toString(16);

/* The colour to draw a sender's name in: their own when it is a hex that
   reads, lifted toward white when it is too dark, the feed's default for
   anything that is not a hex. */
export function chatNameColor(c) {
  if (typeof c !== 'string' || !HEX.test(c)) return CHAT_NAME_DEFAULT;
  let h = c.slice(1).toLowerCase();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  if (feedContrast(r, g, b) >= NAME_CONTRAST_MIN) return '#' + h;
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const rr = Math.round(r + (255 - r) * t), gg = Math.round(g + (255 - g) * t), bb = Math.round(b + (255 - b) * t);
    if (feedContrast(rr, gg, bb) >= NAME_CONTRAST_MIN) return '#' + hex2(rr) + hex2(gg) + hex2(bb);
  }
  return '#ffffff';
}
