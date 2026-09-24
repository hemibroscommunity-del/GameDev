/* ═══ v2.3.2827: THE SMITH AT WORK ═══
 *
 * Owner: "is there an existing animation that I can repurpose for the act of
 * smelting ore into armor?  Maybe you can add code effects for the flame part
 * too."
 *
 * There is no hammer or anvil animation in the game.  The closest is the
 * mining swing (`mine` pose: a two-handed overhead strike, 14 frames), which
 * plays on the player's own body so gear, skin and head all come with it.
 * `S._smithing` borrows it: while it is live the renderer draws the mining
 * pose facing south (entityRenderer `mining`), an anvil over the rock that is
 * painted under the pose's boots, a glowing bar on the anvil, sparks on each
 * strike, and the forge's furnace flares (worldLife).  Nothing here touches
 * the extraction system -- S._extraction drives node claims, the gesture UI
 * and server messages, none of which a smelt has.
 *
 * Purely visual.  The smelt/forge itself is settled by the worker; this only
 * decides how long the smith is seen working.  Walking away ends it (the
 * joystick check in tickSmithing), exactly as it ends a harvest. */

export const SMITH_STRIKE_MS = 650;     /* one mining-swing cycle (playerSprites MINE_DURATION_MS) */
/* The mine sheet's contact frame (0-3 raised, 4-5 strike). */
export const SMITH_STRIKE_FRAME = 4;
/* Where the anvil sits relative to the player's origin (the body's middle):
   over the rock painted under the mine pose's boots, which is where the pick
   lands.  Measured off the render (mp-smithy's close-up), not guessed. */
export const SMITH_ANVIL_DX = 7;
export const SMITH_ANVIL_DY = 50;
/* ...and the forge fire, to the smith's right. */
export const SMITH_FIRE_DX = 44;
/* The anvil and fire are drawn at this size (world px per unit): big enough
   that the anvil covers the painted rock (~49px wide). */
export const SMITH_SCALE = 1.4;

/** Work for `ms` (at least one full swing).  Re-pressing extends it. */
export function startSmithing(S, ms, kind) {
  if (!S || !S.player) return;
  const now = Date.now();
  const len = Math.max(SMITH_STRIKE_MS * 2, Math.min(6000, ms || 0));
  const cur = S._smithing;
  const until = Math.max(cur && cur.until > now ? cur.until : 0, now + len);
  S._smithing = { t0: cur && cur.until > now ? cur.t0 : now, until, kind: kind || 'smelt', x: S.player.x, y: S.player.y };
}

/** Per-frame: ends the work when time is up, when the player moves off the
 *  spot, or dies.  Returns whether the smith is working this frame. */
export function tickSmithing(S, now) {
  const s = S && S._smithing;
  if (!s) return false;
  if (now >= s.until || !S.player || (S.rpg && S.rpg.hp <= 0)) { S._smithing = null; return false; }
  const dx = S.player.x - s.x, dy = S.player.y - s.y;
  if (dx * dx + dy * dy > 12 * 12) { S._smithing = null; return false; }
  return true;
}

export function isSmithing(S, now) {
  const s = S && S._smithing;
  return !!(s && (now || Date.now()) < s.until);
}
