/* ═══ v2.3.3902: A KILL'S "+N XP" STARTS SMALL AND POPS ═══
   The owner, 2026-11-02: "Make the plus xp without the dark container
   background.  Make the text small then pop up before fading and the numbers
   do a jump to bag effect but just to the number on the xp bar".

   The flight's first stage (ui/XpFlyOverlay.jsx, the lift over the monster):
   `k` its share of the lift, 0..1.  Scale 0.6 to 1.15 over the first 30%,
   back to 1 by 55%, then held for the drop into the bar's number; it fades in
   over the first 15%.  The bar's own "+N" makes the same pop in CSS
   (game.css @keyframes bt-xp-gain).  No imports: node tests it. */

export const XP_POP_FROM = 0.6;
export const XP_POP_PEAK = 1.15;
export const XP_POP_PEAK_AT = 0.3;
export const XP_POP_SETTLE_AT = 0.55;

/* the words' flat dark outline (game.css .bt-xp-bar__num's ink) */
export const XP_POP_INK = '-1px 0 0 #10171B, 1px 0 0 #10171B, 0 -1px 0 #10171B, 0 1px 0 #10171B, 0 1px 2px rgba(0,0,0,.6)';

export function xpPopAt(k) {
  const q = Math.max(0, Math.min(1, Number(k) || 0));
  let scale;
  if (q < XP_POP_PEAK_AT) {
    const p = q / XP_POP_PEAK_AT;
    scale = XP_POP_FROM + (XP_POP_PEAK - XP_POP_FROM) * (1 - (1 - p) * (1 - p));
  } else if (q < XP_POP_SETTLE_AT) {
    const p = (q - XP_POP_PEAK_AT) / (XP_POP_SETTLE_AT - XP_POP_PEAK_AT);
    scale = XP_POP_PEAK + (1 - XP_POP_PEAK) * p;
  } else scale = 1;
  return { scale, opacity: Math.min(1, q / 0.15) };
}
