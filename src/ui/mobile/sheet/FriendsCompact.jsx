import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';
import { getFriendRows, lastSeenText } from './friendsModel.js';
import { friendPortrait } from './friendPortraits.js';

/* v2.3.1288: Friends compact (nav-system PR B).
   v2.3.1297 (round-5): real store + honest reconnect state.
   v2.3.1323 (ChatGPT Friends round): "both views feel too passive" —
   the compact view now ALWAYS shows a useful person when you have any
   friends: up to 3 online rows (same presence model as expanded, via
   friendsModel.getFriendRows — which also fixes presence reading the
   never-assigned S.players); when nobody is online, the most recently
   active OFFLINE friend fills the panel instead of an empty message,
   with a last-seen line.  Rows carry a portrait (initial fallback) and
   one quick action: Profile (online only — inspect needs live peer
   data).  The interface-explaining "expand for the full list" copy is
   gone.  The centered empty state survives only for ZERO friends, now
   with the two actions the spec asks for: Add a Bro (teaches the real
   world-tap flow — there is no add-by-name API) and Share Invite
   (native share sheet, clipboard fallback). */

const ROW_CAP = 3;

const shareInvite = async () => {
  const url = (typeof location !== 'undefined' && location.origin) || 'https://brotown.pages.dev';
  try {
    if (navigator.share) { await navigator.share({ title: 'Bro Town', url }); return true; }
  } catch (_e) { return false; }
  try { await navigator.clipboard.writeText(url); return 'copied'; } catch (_e) {}
  return false;
};

export const FriendsCompact = () => {
  const [, force] = useState(0);
  const [addTip, setAddTip] = useState(false);
  const [shared, setShared] = useState('');
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  /* Fail-OPEN: only an explicit failure state gates the list — an
     unset flag (mid-boot) must not masquerade as a lost connection,
     just as a lost connection must not masquerade as no friends. */
  const connected = !(S && ['disconnected', 'frozen', 'rejected', 'superseded'].includes(S._realtimeStatus));
  const all = getFriendRows(S);
  const onlineCount = all.filter(r => r.online).length;
  /* Online rows first; nobody online -> the most recently active
     offline friend (getFriendRows already sorts recency). */
  const rows = onlineCount > 0 ? all.filter(r => r.online).slice(0, ROW_CAP) : all.slice(0, 1);
  const overflow = all.length - rows.length;

  const openProfile = (r) => {
    try {
      if (window.__broInspectPlayer && window.__broInspectPlayer(r.fid)) {
        window.__broDashPanelBus && window.__broDashPanelBus.toBar();
      }
    } catch (_e) {}
  };

  if (!connected) {
    return (
      <Center icon="/icons/ui/nav-friends.webp" line="Reconnecting…"
        sub="Friend presence returns when the connection is back." />
    );
  }

  if (all.length === 0) {
    return (
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        fontFamily: 'Source Sans 3, sans-serif',
        padding: '0 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2 }}>No friends yet</div>
        {addTip && (
          <div style={{ fontSize: 11, lineHeight: 1.3, color: COL.muted }}>
            Tap another player in the world to view their profile and add them.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onPointerUp={(e) => { e.stopPropagation(); setAddTip(v => !v); }}
            className="bt-chisel bt-chisel--chip bt-chisel--on"
            style={{
              minHeight: 38, padding: '0 10px',
              color: COL.text,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
            }}>Add a Bro</button>
          <button
            onPointerUp={async (e) => {
              e.stopPropagation();
              const r = await shareInvite();
              setShared(r === 'copied' ? 'Link copied!' : '');
            }}
            className="bt-chisel bt-chisel--chip"
            style={{
              minHeight: 38, padding: '0 10px',
              color: COL.text2,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
            }}>{shared || 'Share Invite'}</button>
        </div>
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
        textTransform: 'uppercase', color: COL.text2,
        padding: '2px 0 2px',
        flex: '0 0 auto',
        display: 'flex',
      }}>
        <span style={{ flex: 1 }}>
          {onlineCount} online · {all.length} friend{all.length === 1 ? '' : 's'}
        </span>
        {overflow > 0 && <span style={{ color: COL.muted }}>+{overflow} more</span>}
      </div>
      {rows.map(r => {
        const portrait = friendPortrait(r.fid, r.peer, () => force(v => v + 1));
        const seenLine = !r.online ? lastSeenText(r.lastSeen) : null;
        return (
          <div key={r.fid} style={{
            flex: '1 1 0', minHeight: 0,
            display: 'flex', alignItems: 'center', gap: 8,
            borderTop: `1px solid ${COL.divider}`,
          }}>
            <span style={{
              width: 30, height: 30, borderRadius: '50%',
              background: COL.raised,
              /* v2.3.1324: amber = away (idle >2min, aw track flag). */
              border: `2px solid ${r.online ? (r.away ? '#DFAE4E' : '#55B98A') : '#8D9B98'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              fontSize: 13, fontWeight: 800, color: COL.text2,
              flex: '0 0 auto',
            }}>
              {portrait
                ? <img src={portrait} alt="" draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
                : (r.name || '?').slice(0, 1).toUpperCase()}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'block', fontSize: 13, fontWeight: 700, color: COL.text,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                lineHeight: 1.2,
              }}>{r.name}</span>
              <span style={{
                display: 'block', fontSize: 11, lineHeight: 1.2,
                color: r.online ? (r.away ? '#DFAE4E' : '#55B98A') : COL.text2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {r.online
                  ? `${r.away ? 'Away' : 'Online'}${r.zoneName ? ' · ' + r.zoneName : ''}`
                  : `Offline${seenLine ? ' · ' + seenLine.replace('Last seen ', '') : ''}`}
              </span>
            </span>
            {r.online && (
              <button
                onPointerUp={(e) => { e.stopPropagation(); openProfile(r); }}
                className="bt-chisel bt-chisel--chip"
                style={{
                  flex: 'none', minHeight: 32, padding: '0 6px',
                  color: COL.text2,
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                }}>Profile</button>
            )}
          </div>
        );
      })}
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
