/* ═══ v2.3.3221: THE CROWD CAP -- AT MOST K OTHER PLAYERS DRAWN IN FULL ═══
 *
 * The owner, on the server split plan (docs/SERVER-SPLIT-PLAN.md, Phase 0a):
 * "Go recommended" -- the nearest 50 other players drawn in full, and always
 * your party, your target, whoever is fighting you and your duel; the rest not
 * drawn (they stay on the minimap); `?crowd=K` to try another number.
 *
 * WHY.  A phone's frame grows with every other player it draws: each is 43
 * display objects posed, dressed and handed to Pixi every frame
 * (mp-crowdbots: the QA box's frame 5.4 ms alone, 14.7 with 50 players on
 * screen, 35 with 146).  BroTown's square is where everyone arrives, after a
 * login and after a death, so a full room's crowd stands there.  Far off
 * screen they are not drawn at all (PEER_FAR_MARGIN, entityRenderer); this is
 * for the crowd ON the screen.
 *
 * No imports: the renderer calls it every frame and server/test/crowd-cap
 * runs it in node.
 */

/* the owner's number */
export const CROWD_K = 50;

/* A player drawn last frame keeps their place until CROWD_HOLD more players
   are nearer than the nearest K, so the edge of the crowd does not flicker as
   people walk across it: at most K + CROWD_HOLD are drawn. */
export const CROWD_HOLD = 8;

/** `?crowd=K` from an address's search string: K (1-500) a cap of K,
 *  `?crowd=0` or `?crowd=all` no cap (Infinity); null when not given. */
export function crowdFromSearch(search) {
  const m = /[?&]crowd=([^&]*)/.exec(String(search || ''));
  if (!m) return null;
  let v = '';
  try { v = decodeURIComponent(m[1] || '').trim().toLowerCase(); } catch (e) { return null; }
  if (v === 'all' || v === '0' || v === 'off') return Infinity;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(500, n) : null;
}

/**
 * Which players to draw in full.
 *
 * @param {Array<{id: string, d2: number, prio: boolean}>} cands
 *        the other players near enough to be drawn: id, squared distance from
 *        you, and whether they are always drawn (party, target, fighting you,
 *        your duel)
 * @param {number} k            how many at most (Infinity: everyone)
 * @param {Set<string>|null} shownBefore  who was drawn last frame
 * @returns {Set<string>|null}  the ids to draw, or null for everyone
 */
export function crowdPick(cands, k, shownBefore) {
  if (!(k > 0) || !Number.isFinite(k) || cands.length <= k) return null;
  const keep = new Set();
  const rest = [];
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    if (c.prio) keep.add(c.id); else rest.push(c);
  }
  const room = k - keep.size;
  if (room <= 0) return keep;
  if (rest.length <= room) { for (const c of rest) keep.add(c.id); return keep; }
  /* nearest first; equal distances in id order, so the pick does not depend
     on the order the players happen to be listed in */
  rest.sort((a, b) => (a.d2 - b.d2) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const held = Math.min(rest.length, room + CROWD_HOLD);
  for (let i = 0; i < held; i++) {
    const c = rest[i];
    if (i < room || (shownBefore && shownBefore.has(c.id))) keep.add(c.id);
  }
  return keep;
}
