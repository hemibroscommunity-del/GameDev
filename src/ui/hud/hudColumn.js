/* ═══ v2.3.6781: THE STATUS COLUMN'S PLACE, TOP LEFT (card UI3, PR 2) ═══
 *
 * The column BroTown.jsx draws under the quest card (ElemStatusChips: the
 * snowflake, the flame, the slime; the buff chips; the trap's pop-up): its
 * wrapper's style moved here out of BroTown.jsx (its style object was there,
 * v2.3.4163), so the big file gains one call and loses its lines, and the
 * place of the stack at the top left is the HUD's files' to know.
 *
 * Today's place is the fallback: `calc(var(--bt-hud-top, 56px) - 12px)` (as
 * before the player frame, 44 under a 1x bar, following the bar as it
 * grows; v2.3.3974-v2.3.4093 put them under the frame).  While the character
 * HUD is up (html[data-charhud="1"]) game.css sets --bt-status-top, under
 * the quest line's 44 px hit box, so `?hud=0` moves nothing.
 */
const COLUMN = Object.freeze({
  position: 'absolute',
  top: 'var(--bt-status-top, calc(var(--bt-hud-top, 56px) - 12px))',
  left: 8,
  zIndex: 18,
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,.6)',
});

/** The status column's wrapper style (one object, never rebuilt). */
export function hudColumnStyle() {
  return COLUMN;
}
