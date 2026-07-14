import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';

/* v2.3.1288: Friends compact (nav-system PR B) — who's online at a
   glance: a count line + up to three presence rows, online friends
   first.  Managing friends and the blocked list stays in the expanded
   Social panel.  Same S.friends/S.players reads and 1s refresh the
   expanded panel uses; presence dots keep the v2.3.1235 tokens
   (#55B98A / #667875). */

const ROW_CAP = 3;

export const FriendsCompact = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const friends = S?.friends || S?._friends || [];
  const onlinePlayers = S?.players || {};

  const all = friends
    .map(f => {
      const fid = f.id || f;
      return { fid, name: f.name || fid, online: !!onlinePlayers[fid] };
    })
    .sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
  const onlineCount = all.filter(r => r.online).length;
  /* v2.3.1291 (ChatGPT round-3 §4): the glance question is "who's on
     RIGHT NOW" — with nobody online, three offline names are noise;
     show the answer as a sentence instead.  With people online, only
     online rows earn glance space. */
  const rows = onlineCount > 0 ? all.filter(r => r.online) : [];
  const overflow = rows.length - ROW_CAP;

  if (rows.length === 0) {
    return (
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        fontFamily: 'Source Sans 3, sans-serif',
      }}>
        <img src="/icons/ui/nav-friends.webp" alt="" draggable={false}
          style={{ width: 32, height: 32, objectFit: 'contain', opacity: 0.4 }}
          onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('👥')); }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2 }}>No friends added yet.</div>
      </div>
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
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, color: COL.text2,
        }}>No friends online right now — expand for your full list.</div>
      )}
      {rows.slice(0, ROW_CAP).map(r => (
        <div key={r.fid} style={{
          flex: '1 1 0', minHeight: 0,
          display: 'flex', alignItems: 'center', gap: 8,
          borderTop: `1px solid ${COL.divider}`,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: r.online ? '#55B98A' : '#667875',
            flex: '0 0 auto',
          }} />
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{r.name}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: COL.muted }}>
            {r.online ? 'online' : 'offline'}
          </span>
        </div>
      ))}
      {overflow > 0 && (
        <div style={{
          flex: '0 0 auto',
          fontSize: 11, fontWeight: 600, color: COL.muted,
          padding: '2px 0 4px',
        }}>+{overflow} more — expand for everyone</div>
      )}
    </div>
  );
};
