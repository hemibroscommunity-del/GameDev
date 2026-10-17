/* ═══ v2.3.3284: WHICH PARTY MEMBERS THE STRIP SHOWS ═══
 *
 * A party lasts and holds up to 50 now (server/src/party.js PARTY.KEEP_MAX),
 * and the owner chose: "The party window shows about 6 members: online ones
 * first, then nearest."  Twenty HP bars would cover a phone.
 *
 * The order: you; then the members online in your zone, nearest first; then
 * those online elsewhere, as the roster has them; then the offline ones, the
 * most recently seen first.  At most PARTY_ROWS rows, and how many more.
 *
 * No imports: PartyHUD.jsx calls it and server/test/party-keep runs it in node.
 */

export const PARTY_ROWS = 6;

/* Offline in the worker's words: `off` (a party that lasts) or `away` (an
   older worker's reconnect grace) -- either way not playing now. */
export const memberOffline = (m) => !!(m && (m.off || m.away));

/**
 * @param {Array} members  party_state members ({id, zone, off, away, seen})
 * @param {string} myId    your id
 * @param {{x:number, y:number, zone:string}|null} me  where you are
 * @param {(id: string) => ({x:number, y:number}|null)} posOf  where another
 *        player is drawn, or null (not known to this phone)
 * @param {number} [cap]   rows at most (PARTY_ROWS)
 * @returns {{rows: Array, more: number, online: number}}
 */
export function partyRows(members, myId, me, posOf, cap) {
  const n = cap > 0 ? cap : PARTY_ROWS;
  const list = Array.isArray(members) ? members : [];
  const mine = [], near = [], far = [], off = [];
  list.forEach((m, i) => {
    if (!m) return;
    if (m.id === myId) { mine.push(m); return; }
    if (memberOffline(m)) { off.push(m); return; }
    if (me && m.zone === me.zone) {
      const p = posOf ? posOf(m.id) : null;
      const d = p && Number.isFinite(p.x) && Number.isFinite(p.y) ? Math.hypot(p.x - me.x, p.y - me.y) : Infinity;
      near.push({ m, d, i });
    } else far.push(m);
  });
  near.sort((a, b) => (a.d - b.d) || (a.i - b.i));
  /* seen: seconds ago, smaller is more recent; never seen goes last */
  const seenOf = (m) => (typeof m.seen === 'number' && m.seen >= 0 ? m.seen : Infinity);
  off.sort((a, b) => seenOf(a) - seenOf(b));
  const ordered = mine.concat(near.map((x) => x.m), far, off);
  const online = list.filter((m) => m && !memberOffline(m)).length;
  return { rows: ordered.slice(0, n), more: Math.max(0, ordered.length - n), online };
}

/** "2h ago" from seconds ago; '' when unknown. */
export function seenAgo(sec) {
  if (!(typeof sec === 'number' && sec >= 0)) return '';
  if (sec < 90) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return min + 'm ago';
  const h = Math.round(min / 60);
  if (h < 48) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}
