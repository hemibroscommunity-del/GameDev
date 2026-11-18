/* ═══ v2.3.6200: social's leaves from entityRenderer.js (card EN, grand plan 5.5, M's line 8) ═══
 *
 * Top-level functions of src/rendering/systems/entityRenderer.js that read
 * no `this` and reach no module state, moved VERBATIM (only `export` and
 * the imports are new), with the constants they read; imported back by the
 * same names.  A leaf imports nothing from the renderers (four-lines'
 * IMPORT_CYCLE_FILES has no room).  The census: part 5 of
 * docs/plan/census/M-tables.md (tools/dev/render-code-census.mjs).
 */

/* ── v2.3.6200: level 0 ── */
export const CHAT_BUBBLE_MS = 5000;
export function _chatBubbleUp(S, pid, now) {
  const b = S && S.chatBubbles && pid != null ? S.chatBubbles[pid] : null;
  return !!(b && b.text && (now - (b.ts || 0)) < CHAT_BUBBLE_MS);
}
