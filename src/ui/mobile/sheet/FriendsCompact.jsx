import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';
import { ZONES } from '../../../data/zones.js';
import { getFriends } from './friendsModel.js';

/* v2.3.1288: Friends compact (nav-system PR B) — who's online at a
   glance, online rows only.
   v2.3.1297 (ChatGPT round-5): no more dead-end empty states —
   - fresh account: guidance + the REAL add flow (players are added by
     tapping them in the world; there is no add-by-name API, so no
     fake Add Friend button).
   - friends but nobody online: say that, with the count.
   - connection lost: say THAT — a network failure must never read as
     "no friends" (round-5 §technical).
   Rows gain a location line when the friend is in your zone's player
   list (the only presence detail the client has). */

const ROW_CAP = 3;

export const FriendsCompact = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  /* Fail-OPEN: only an explicit failure state gates the list — an
     unset flag (mid-boot) must not masquerade as a lost connection,
     just as a lost connection must not masquerade as no friends. */
  const connected = !(S && ['disconnected', 'frozen', 'rejected', 'superseded'].includes(S._realtimeStatus));
  /* v2.3.1297 bug fix: read the real localStorage store (friendsModel). */
  const friends = getFriends(S);
  const onlinePlayers = S?.players || {};

  const all = friends
    .map(f => {
      const fid = f.id || f;
      const p = onlinePlayers[fid];
      return {
        fid,
        name: f.name || fid,
        online: !!p,
        /* Location line: zone name when the player entry carries one,
           else 'Nearby' (the client only sees same-zone players). */
        where: p ? (ZONES[p.zoneId || p.zone]?.name || 'Nearby') : null,
      };
    })
    .sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
  const onlineCount = all.filter(r => r.online).length;
  const rows = onlineCount > 0 ? all.filter(r => r.online) : [];
  const overflow = all.length - rows.length;

  /* Connection failure state — distinct from "no friends". */
  if (!connected) {
    return (
      <Center icon="/icons/ui/nav-friends.webp" line="Reconnecting…"
        sub="Friend presence returns when the connection is back." />
    );
  }

  if (all.length === 0) {
    return (
      <Center icon="/icons/ui/nav-friends.webp" line="No friends yet"
        sub="Tap another player in the world to view their profile and add them." />
    );
  }

  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'flex', flexDirection: 'column',
      padding: '6px 12px 2px',
      fontFamily: 'Source Sans 3, sans-serif',
      overflow: 'hidden',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.10em',
        textTransform: 'uppercase', color: COL.muted,
        padding: '2px 0 2px',
        flex: '0 0 auto',
      }}>
        {onlineCount} online · {all.length} friend{all.length === 1 ? '' : 's'}
      </div>
      {onlineCount === 0 && (
        <div style={{
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2 }}>No friends online</div>
          <div style={{ fontSize: 11, color: COL.muted }}>{all.length} friend{all.length === 1 ? '' : 's'} — expand for the full list</div>
        </div>
      )}
      {rows.slice(0, ROW_CAP).map(r => (
        <div key={r.fid} style={{
          flex: '1 1 0', minHeight: 0,
          display: 'flex', alignItems: 'center', gap: 8,
          borderTop: `1px solid ${COL.divider}`,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#55B98A',
            flex: '0 0 auto',
          }} />
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{r.name}</span>
          {r.where && (
            <span style={{ flex: 'none', fontSize: 11, color: COL.text2, whiteSpace: 'nowrap' }}>{r.where}</span>
          )}
          <span style={{ flex: 'none', fontSize: 11, fontWeight: 600, color: COL.muted }}>online</span>
        </div>
      ))}
      {onlineCount > 0 && overflow > 0 && (
        <div style={{
          flex: '0 0 auto',
          fontSize: 11, fontWeight: 600, color: COL.muted,
          padding: '2px 0 4px',
        }}>+{overflow} more — expand for everyone</div>
      )}
    </div>
  );
};

const Center = ({ icon, line, sub }) => (
  <div style={{
    flex: 1, minHeight: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 5,
    fontFamily: 'Source Sans 3, sans-serif',
    padding: '0 24px', textAlign: 'center',
  }}>
    <img src={icon} alt="" draggable={false}
      style={{ width: 36, height: 36, objectFit: 'contain', opacity: 0.45 }}
      onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('👥')); }} />
    <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2 }}>{line}</div>
    <div style={{ fontSize: 11.5, lineHeight: 1.35, color: COL.muted }}>{sub}</div>
  </div>
);
