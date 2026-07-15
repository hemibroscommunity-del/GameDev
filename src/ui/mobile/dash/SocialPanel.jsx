import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { ZONES } from '../../../data/zones.js';
import { getFriends, getBlocked, removeFriend as modelRemove, blockPlayer as modelBlock } from '../sheet/friendsModel.js';

/* v2.3.1232: Lantern Slate pass.  v2.3.1235: 44px rows + presence
   tokens (#55B98A / #667875).
   v2.3.1297 (ChatGPT round-5, owner-approved): the Friends/Blocked
   segmented control gave an administrative edge case equal billing
   with the main social list — Blocked moves behind a ••• overflow
   toggle.  Rows grow to ~54px (avatar-initial disc, name, presence +
   location line) and tapping a row reveals an inline action strip:
   Invite to Party (online + party-caps servers only — the same
   channel event InspectPlayerPanel sends), Remove, Block.  There is
   no direct-message or friend-request system on the server yet, so
   neither appears here (round-5's Requests segment is server work,
   deferred).  Empty state teaches the real add flow: tapping players
   in the world.  Connection loss shows as reconnecting, never as an
   empty friends list. */

const Empty = ({ line, sub }) => (
  <div style={{ textAlign: 'center', padding: '22px 18px' }}>
    <img src="/icons/ui/nav-friends.webp" alt="" draggable={false}
      style={{ width: 40, height: 40, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* v2.3.1233: img{display:block} in game.css defeats textAlign centering */ }}
      onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('👥')); }} />
    <div style={{ fontSize: 14, fontWeight: 700, color: COL.text, marginTop: 8 }}>{line}</div>
    {sub && <div style={{ fontSize: 12, lineHeight: 1.4, color: COL.muted, marginTop: 4, maxWidth: 250, marginLeft: 'auto', marginRight: 'auto' }}>{sub}</div>}
  </div>
);

const actionBtn = (danger) => ({
  flex: 1,
  minHeight: 40,
  background: 'transparent',
  border: `1px solid ${danger ? '#C7655F' : COL.border}`,
  borderRadius: 8,
  color: danger ? '#E8938D' : COL.text,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  touchAction: 'manipulation',
});

export const SocialPanel = () => {
  const [, force] = useState(0);
  const [showBlocked, setShowBlocked] = useState(false);
  const [openRow, setOpenRow] = useState(null);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  /* Fail-OPEN: only an explicit failure state gates the list — an
     unset flag (mid-boot) must not masquerade as a lost connection,
     just as a lost connection must not masquerade as no friends. */
  const connected = !(S && ['disconnected', 'frozen', 'rejected', 'superseded'].includes(S._realtimeStatus));
  /* v2.3.1297 bug fix: localStorage 'bt_friends' is the real store —
     S.friends was never populated (see friendsModel.js). */
  const friends = getFriends(S);
  const blocked = getBlocked(S);
  const onlinePlayers = S?.players || {};
  const partyCaps = !!(S && S._serverCaps && S._serverCaps.party);

  const rows = friends
    .map(f => {
      const fid = f.id || f;
      const p = onlinePlayers[fid];
      return {
        fid, name: f.name || fid, online: !!p,
        where: p ? (ZONES[p.zoneId || p.zone]?.name || 'Nearby') : null,
      };
    })
    .sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));

  const invite = (fid) => {
    try {
      if (S && S.channel) {
        S.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: fid } });
      }
    } catch (_e) {}
    setOpenRow(null);
  };
  const removeFriend = (fid) => {
    try { modelRemove(S, fid); } catch (_e) {}
    setOpenRow(null);
    force(v => v + 1);
  };
  const blockPlayer = (fid, name) => {
    try { modelBlock(S, fid, name); } catch (_e) {}
    setOpenRow(null);
    force(v => v + 1);
  };

  return (
    <div style={panelStyle}>
      {/* Header row: count left, ••• (Blocked) right — the segmented
          control is gone; Blocked is the overflow view now. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.muted }}>
          {showBlocked ? `Blocked (${blocked.length})` : `${rows.filter(r => r.online).length} online · ${rows.length} friends`}
        </span>
        <button
          onPointerUp={(e) => { e.stopPropagation(); setShowBlocked(v => !v); setOpenRow(null); }}
          aria-label={showBlocked ? 'Back to friends' : 'Blocked players'}
          style={{
            width: 44, height: 36,
            background: 'transparent',
            border: `1px solid ${COL.border}`,
            borderRadius: 8,
            color: COL.text2,
            fontSize: showBlocked ? 13 : 17,
            fontWeight: 700,
            cursor: 'pointer',
            touchAction: 'manipulation',
            fontFamily: 'inherit',
          }}
        >{showBlocked ? '◂' : '•••'}</button>
      </div>

      {!connected ? (
        <Empty line="Reconnecting…" sub="Friend presence returns when the connection is back." />
      ) : !showBlocked ? (
        rows.length === 0 ? (
          <Empty line="Build your crew"
            sub="Tap another player anywhere in Bro Town to view their profile and add them as a friend." />
        ) : rows.map((r, i) => (
          <div key={r.fid} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${COL.divider}` : 'none' }}>
            <button
              onPointerUp={(e) => { e.stopPropagation(); setOpenRow(openRow === r.fid ? null : r.fid); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%',
                minHeight: 54,
                padding: '0 4px',
                background: 'transparent',
                border: 'none',
                color: COL.text,
                fontFamily: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}>
              {/* Avatar disc: initial + presence ring. */}
              <span style={{
                position: 'relative',
                width: 36, height: 36, borderRadius: '50%',
                background: COL.raised,
                border: `2px solid ${r.online ? '#55B98A' : '#667875'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800, color: COL.text2,
                flex: '0 0 auto',
              }}>{(r.name || '?').slice(0, 1).toUpperCase()}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: 'block', fontSize: 13.5, fontWeight: 700, color: COL.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{r.name}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: r.online ? '#55B98A' : COL.muted }}>
                  {r.online ? `Online${r.where ? ' · ' + r.where : ''}` : 'Offline'}
                </span>
              </span>
              <span aria-hidden="true" style={{ flex: 'none', fontSize: 13, color: COL.muted }}>
                {openRow === r.fid ? '▴' : '▾'}
              </span>
            </button>
            {openRow === r.fid && (
              <div style={{ display: 'flex', gap: 6, padding: '0 4px 10px' }}>
                {partyCaps && r.online && (
                  <button style={{ ...actionBtn(false), color: '#D8A94D', borderColor: 'rgba(216,169,77,.5)' }}
                    onPointerUp={(e) => { e.stopPropagation(); invite(r.fid); }}>Invite to Party</button>
                )}
                <button style={actionBtn(false)}
                  onPointerUp={(e) => { e.stopPropagation(); removeFriend(r.fid); }}>Remove</button>
                <button style={actionBtn(true)}
                  onPointerUp={(e) => { e.stopPropagation(); blockPlayer(r.fid, r.name); }}>Block</button>
              </div>
            )}
          </div>
        ))
      ) : (
        blocked.length === 0 ? (
          <Empty line="Nobody blocked." />
        ) : blocked.map((b, i) => (
          <div key={b.id || b} style={{
            display: 'flex', alignItems: 'center',
            minHeight: 44,
            padding: '0 8px',
            fontSize: 13, color: COL.text,
            borderBottom: i < blocked.length - 1 ? `1px solid ${COL.divider}` : 'none',
          }}>{b.name || b}</div>
        ))
      )}
    </div>
  );
};
