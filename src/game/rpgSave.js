/* ═══ v2.3.1356: debounced bt_rpg persistence for HOT combat paths ═══
 *
 * localStorage.setItem is a SYNCHRONOUS main-thread disk write and the
 * rpg blob is large (inventory + quests + skills + grids).  The kill /
 * loot paths used to write it inline, once per event — fine for single
 * kills, catastrophic under AoE: a bow special is an unlimited-pierce
 * arrow with a 3x hit radius, so one arrow can hit (and one-shot) an
 * entire snowman pack in ONE frame.  Server mode then delivers N
 * monster_kill events back-to-back, each doing a full JSON.stringify +
 * setItem — N blocking writes in a row IS the owner's frozen screen
 * (2026-07-18, bow specials vs snowmen; same risk for the 360° melee
 * cleave).
 *
 * Callers just say "the rpg changed" (saveRpgSoon).  ONE write lands,
 * at least MIN_GAP_MS after the previous one, reading the CURRENT
 * S.rpg at flush time so it always persists the latest state no matter
 * how many events piled up.  Durability is unchanged: the worker blob
 * is authoritative (stored-wins on join, ARCHITECTURE-HANDOFF), so
 * bt_rpg is a warm-start cache — an 800ms window costs nothing.
 *
 * Deliberately NOT used by rare / user-paced sites (equip, shop,
 * settings, respawn): those are one-off writes where inline is fine
 * and immediate persistence is the least surprising behavior. */

const MIN_GAP_MS = 800;
let _timer = null;
let _lastWrite = 0;

export function saveRpgSoon() {
  if (_timer) return; /* a flush is already scheduled — it will read the latest state */
  const wait = Math.max(50, MIN_GAP_MS - (Date.now() - _lastWrite));
  _timer = setTimeout(() => {
    _timer = null;
    _lastWrite = Date.now();
    try {
      const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
      if (S && S.rpg) localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
    } catch (e) { /* quota/privacy-mode: cache write is best-effort */ }
  }, wait);
}
