/* v2.3.1297 (round-5 Friends): the canonical friend store, shared by
   FriendsCompact and the expanded SocialPanel.

   BUG FIX riding along: friends are persisted in localStorage
   'bt_friends' (written by InspectPlayerPanel's Add Friend) and
   mirrored only into BroTown's React state — NEVER onto the S object.
   The dash Friends views were reading S.friends, which is always
   undefined, so real friends never appeared in the new nav system at
   all.  This model reads the localStorage truth (S fields kept as a
   fallback for tests that inject them).

   Entries: { id, name, color, addedAt } (InspectPlayerPanel shape).
   NOTE: BroTown's legacy friendsList React state re-reads localStorage
   only on boot, so a Remove/Block here reaches the legacy inspect
   panel after the next reload — same one-way lag the legacy panels
   already had toward each other. */

const read = (key) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(v)) return v;
  } catch (_e) {}
  return null;
};

/* v2.3.1323 (ChatGPT Friends round): PRESENCE moved here so both views
   share one truth — and fixed while moving: both views read S.players,
   which is NEVER assigned anywhere in the client (grep: zero writes) —
   so every friend has shown Offline since the nav system shipped.  The
   real peer map is S.others (wsClient state_sync/tick), keyed by peer
   id, carrying name/zone/rpgLv/cosmetics for the WHOLE room at >= 1Hz.

   Grace period (spec: 15-30s): iOS Safari suspends background tabs, so
   a peer vanishing from S.others for a beat must not flap to Offline.
   A friend counts online while seen in S.others within GRACE_MS.

   Last-seen: stamped to localStorage 'bt_friendSeen' ({fid: ms}) at
   most once per 30s per friend while online — survives reloads so an
   offline row can honestly say "Last seen 2h ago". */
import { ZONES } from '../../../data/zones.js';

const GRACE_MS = 20000;
const liveAt = Object.create(null); /* fid -> last S.others sighting (ms) */

const readSeen = () => {
  try {
    const v = JSON.parse(localStorage.getItem('bt_friendSeen'));
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  } catch (_e) {}
  return {};
};

export function lastSeenText(ts) {
  if (!ts) return null;
  const d = Date.now() - ts;
  if (d < 90 * 1000) return 'Last seen just now';
  if (d < 60 * 60 * 1000) return `Last seen ${Math.round(d / 60000)}m ago`;
  if (d < 24 * 60 * 60 * 1000) return `Last seen ${Math.round(d / 3600000)}h ago`;
  const days = Math.round(d / 86400000);
  return days <= 14 ? `Last seen ${days}d ago` : null;
}

/* The one row builder.  Sort (spec): 1. online in MY zone, 2. other
   online, 3. offline seen within 7 days (most recent first),
   4. the rest alphabetically. */
export function getFriendRows(S) {
  const friends = getFriends(S);
  const others = (S && S.others) || {};
  const myZone = (S && (S.currentZone || S.zone || (S.player && S.player.zone))) || 'town';
  const now = Date.now();
  const seen = readSeen();
  let dirty = false;

  const rows = friends.map(f => {
    const fid = f.id || f;
    const p = others[fid];
    if (p) {
      liveAt[fid] = now;
      if (!seen[fid] || now - seen[fid] > 30000) { seen[fid] = now; dirty = true; }
    }
    const online = !!p || (liveAt[fid] != null && now - liveAt[fid] < GRACE_MS);
    return {
      fid,
      name: f.name || String(fid),
      online,
      sameZone: !!(p && (p.zone || 'town') === myZone),
      level: p ? (p.rpgLv || null) : null,
      zoneName: p ? (ZONES[p.zone]?.name || 'Nearby') : null,
      lastSeen: seen[fid] || f.addedAt || null,
      peer: p || null,
    };
  });
  if (dirty) { try { localStorage.setItem('bt_friendSeen', JSON.stringify(seen)); } catch (_e) {} }

  const RECENT_MS = 7 * 86400000;
  const rank = (r) => r.online ? (r.sameZone ? 0 : 1)
    : (r.lastSeen && now - r.lastSeen < RECENT_MS) ? 2 : 3;
  rows.sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 2) return (b.lastSeen || 0) - (a.lastSeen || 0);
    return a.name.localeCompare(b.name);
  });
  return rows;
}

export function getFriends(S) {
  return read('bt_friends') || S?.friends || S?._friends || [];
}

export function getBlocked(S) {
  return read('bt_blocked') || S?.blocked || S?._blocked || [];
}

export function removeFriend(S, fid) {
  const next = getFriends(S).filter(f => (f.id || f) !== fid);
  try { localStorage.setItem('bt_friends', JSON.stringify(next)); } catch (_e) {}
  if (S) { if (S.friends) S.friends = next; if (S._friends) S._friends = next; }
  return next;
}

export function blockPlayer(S, fid, name) {
  const list = getBlocked(S);
  if (!list.some(b => (b.id || b) === fid)) {
    const next = [...list, { id: fid, name }];
    try { localStorage.setItem('bt_blocked', JSON.stringify(next)); } catch (_e) {}
    if (S) { if (S.blocked) S.blocked = next; if (S._blocked) S._blocked = next; }
  }
  removeFriend(S, fid);
}
