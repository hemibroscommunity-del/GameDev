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
