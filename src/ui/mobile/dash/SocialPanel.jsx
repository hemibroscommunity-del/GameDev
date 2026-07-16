import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { getFriendRows, lastSeenText, getBlocked, removeFriend as modelRemove, blockPlayer as modelBlock } from '../sheet/friendsModel.js';
import { friendPortrait } from '../sheet/friendPortraits.js';
import { friendsSrv } from '../sheet/friendsSync.js';            /* v2.3.1324 */

/* v2.3.1232: Lantern Slate pass.  v2.3.1297 (round-5): Blocked behind
   overflow, inline action strip, honest empty/reconnect states.
   v2.3.1323 (ChatGPT Friends round): the complete social surface —
   - presence FIXED: rows come from friendsModel.getFriendRows (the old
     S.players read was never assigned; peers live in S.others), with a
     20s disconnect grace so a suspended Safari tab doesn't flap a
     friend to Offline.
   - Header: person-plus ADD FRIEND button (opens the real add flow —
     world-tap guidance + Share Invite; there is no add-by-name API);
     the ••• overflow keeps Blocked.
   - Count reduced to "N online" (the list itself shows the total; the
     old "1 FRIENDS" grammar bug dies with it).
   - Search appears once the list passes 8 friends.
   - Rows: real portrait (initial fallback), presence dot, level + zone
     when online, last-seen when offline, and a row-level ••• menu
     (Profile / Invite to Party / Remove / Block) replacing the ▾
     chevron that read as another panel-size control.
   - Each row sits on its own subtle surface; the list gets bottom
     padding so the final row clears the pinned toolbar.
   Deferred (no server support, unchanged from round-5): friend
   REQUESTS tab, direct messages.  No away state exists either, so the
   dot is green/gray only. */

const Empty = ({ line, sub, children }) => (
  <div style={{ textAlign: 'center', padding: '22px 18px' }}>
    <img src="/icons/ui/nav-friends.webp" alt="" draggable={false}
      style={{ width: 40, height: 40, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* v2.3.1233: img{display:block} in game.css defeats textAlign centering */ }}
      onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('👥')); }} />
    <div style={{ fontSize: 14, fontWeight: 700, color: COL.text, marginTop: 8 }}>{line}</div>
    {sub && <div style={{ fontSize: 12, lineHeight: 1.4, color: COL.text2, marginTop: 4, maxWidth: 250, marginLeft: 'auto', marginRight: 'auto' }}>{sub}</div>}
    {children}
  </div>
);

/* v2.3.1332 (owner: chiseled frames everywhere): colors come from the
   .bt-chisel classes; the factory keeps layout only. */
const actionCls = (danger) => 'bt-chisel bt-chisel--chip' + (danger ? ' bt-chisel--danger' : '');
const actionBtn = (_danger) => ({
  flex: 1,
  minHeight: 40,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 700,
});

const shareInvite = async () => {
  const url = (typeof location !== 'undefined' && location.origin) || 'https://brotown.pages.dev';
  try {
    if (navigator.share) { await navigator.share({ title: 'Bro Town', url }); return true; }
  } catch (_e) { return false; }
  try { await navigator.clipboard.writeText(url); return 'copied'; } catch (_e) {}
  return false;
};

/* Person-plus glyph (inline SVG — no asset for this yet). */
const PersonPlus = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
    <circle cx="6.2" cy="5" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M1.8 13.4 C1.8 10.8 3.7 9.4 6.2 9.4 C7.4 9.4 8.5 9.7 9.3 10.3"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12.4 8.4 V13 M10.1 10.7 H14.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const SocialPanel = () => {
  const [, force] = useState(0);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [openRow, setOpenRow] = useState(null);
  const [tab, setTab] = useState('friends');       /* v2.3.1324 */
  const [openThread, setOpenThreadRow] = useState(null);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [shared, setShared] = useState('');
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => friendsSrv.subscribe(() => force(v => v + 1)), []);
  /* Thread-open bookkeeping (unread suppression) — cleared on unmount. */
  useEffect(() => () => friendsSrv.setOpenThread(null), []);

  const S = getState();
  /* Fail-OPEN: only an explicit failure state gates the list. */
  const connected = !(S && ['disconnected', 'frozen', 'rejected', 'superseded'].includes(S._realtimeStatus));
  const blocked = getBlocked(S);
  const partyCaps = !!(S && S._serverCaps && S._serverCaps.party);
  /* v2.3.1324: server friends — requests, DMs, mutual removes. */
  const capsFriends = !!(S && S._serverCaps && S._serverCaps.friends);
  const doc = capsFriends ? friendsSrv.doc() : null;
  const reqIn = doc ? Object.keys(doc.reqIn) : [];
  const reqOut = doc ? Object.keys(doc.reqOut) : [];

  const sendFriend = (event, payload) => {
    try { if (S && S.channel) S.channel.send({ type: 'broadcast', event, payload }); } catch (_e) {}
  };

  const allRows = getFriendRows(S);
  const onlineCount = allRows.filter(r => r.online).length;
  const searchable = allRows.length > 8;
  const rows = searchable && query.trim()
    ? allRows.filter(r => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    : allRows;

  const toggleThread = (fid) => {
    const next = openThread === fid ? null : fid;
    setOpenThreadRow(next);
    friendsSrv.setOpenThread(next);
    setDraft('');
    setOpenRow(null);
  };
  const sendDm = (fid) => {
    const text = draft.trim();
    if (!text) return;
    sendFriend('friend_dm', { to: fid, text });
    /* Optimistic local append (the server never echoes to the sender). */
    friendsSrv.appendDm(fid, { from: 'me', fromName: 'You', text, ts: Date.now() }, true);
    setDraft('');
  };

  const openProfile = (r) => {
    try {
      if (window.__broInspectPlayer && window.__broInspectPlayer(r.fid)) {
        window.__broDashPanelBus && window.__broDashPanelBus.toBar();
      }
    } catch (_e) {}
    setOpenRow(null);
  };
  const invite = (fid) => {
    try {
      if (S && S.channel) {
        S.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: fid } });
      }
    } catch (_e) {}
    setOpenRow(null);
  };
  const removeFriend = (fid, srv) => {
    /* v2.3.1324: server friendships remove BOTH edge halves via the
       server; the legacy localStorage copy is cleared either way. */
    if (srv && capsFriends) sendFriend('friend_remove', { fid });
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
    <div style={{ ...panelStyle, paddingBottom: 24 }}>
      {/* Header: online count · Add Friend · ••• (Blocked overflow). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.text2 }}>
          {showBlocked ? `Blocked (${blocked.length})` : `${onlineCount} online`}
        </span>
        {!showBlocked && (
          <button
            onPointerUp={(e) => { e.stopPropagation(); setShowAdd(v => !v); setOpenRow(null); }}
            aria-label="Add friend"
            className={'bt-chisel bt-chisel--chip' + (showAdd ? ' bt-chisel--on' : '')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              minHeight: 38, padding: '0 6px',
              color: showAdd ? COL.text : COL.text2,
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
            }}
          ><PersonPlus />Add Friend</button>
        )}
        <button
          onPointerUp={(e) => { e.stopPropagation(); setShowBlocked(v => !v); setOpenRow(null); setShowAdd(false); }}
          aria-label={showBlocked ? 'Back to friends' : 'Blocked players'}
          className="bt-chisel bt-chisel--chip"
          style={{
            width: 44, height: 38,
            color: COL.text2,
            fontSize: showBlocked ? 13 : 17,
            fontWeight: 700,
            fontFamily: 'inherit',
          }}
        >{showBlocked ? '◂' : '•••'}</button>
      </div>

      {/* Add-friend flow: the honest one — players are added by tapping
          them in the world; Share Invite brings a friend INTO the world. */}
      {showAdd && !showBlocked && (
        <div style={{
          background: COL.wellSoft,
          border: `1px solid ${COL.tileBor}`,
          borderRadius: 10,
          padding: '10px 12px',
          marginBottom: 8,
          fontSize: 12, lineHeight: 1.4, color: COL.text2,
        }}>
          Tap another player anywhere in Bro Town to view their profile and add them as a friend.
          <button
            onPointerUp={async (e) => {
              e.stopPropagation();
              const r = await shareInvite();
              setShared(r === 'copied' ? 'Link copied!' : '');
            }}
            className="bt-chisel bt-chisel--chip"
            style={{
              display: 'block', marginTop: 8, minHeight: 38, padding: '0 10px',
              color: COL.text,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
            }}>{shared || 'Share Invite Link'}</button>
        </div>
      )}

      {/* v2.3.1324: Friends / Requests segmented tabs — REAL now that
          requests are a server system.  Rendered only when the server
          claims caps.friends (an old worker has no request flow). */}
      {capsFriends && !showBlocked && (
        <div style={{
          display: 'flex', gap: 2, marginBottom: 8,
          background: COL.well, border: `1px solid ${COL.tileBor}`,
          borderRadius: 8, padding: 3,
        }}>
          {[
            { id: 'friends', label: `Friends (${allRows.length})` },
            { id: 'requests', label: `Requests (${reqIn.length})` },
          ].map(t => (
            <button key={t.id}
              onPointerUp={(e) => { e.stopPropagation(); setTab(t.id); setOpenRow(null); }}
              aria-pressed={tab === t.id}
              className="bt-chisel bt-chisel--chip"
              style={{
                flex: 1, minHeight: 34,
                color: tab === t.id ? COL.text : COL.text2,
                fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                position: 'relative',
              }}>
              {t.label}
              {t.id === 'requests' && reqIn.length > 0 && tab !== 'requests' && (
                <span aria-hidden="true" style={{
                  position: 'absolute', top: 3, right: 6,
                  width: 7, height: 7, borderRadius: '50%',
                  background: COL.accent,
                }} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Requests tab body. */}
      {capsFriends && !showBlocked && tab === 'requests' && (
        reqIn.length === 0 && reqOut.length === 0 ? (
          <Empty line="No requests"
            sub="Requests you receive — and ones you've sent — show up here." />
        ) : (
          <div>
            {reqIn.map(fid => (
              <div key={fid} style={{
                background: COL.wellSoft, border: `1px solid ${COL.tileBor}`,
                borderRadius: 10, marginBottom: 6, padding: '8px 10px',
              }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: COL.text, marginBottom: 6 }}>
                  {(doc.reqIn[fid] && doc.reqIn[fid].name) || fid}
                  <span style={{ fontWeight: 600, color: COL.text2 }}> wants to be Bros</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className={actionCls(false) + ' bt-chisel--on'} style={actionBtn(false)}
                    onPointerUp={(e) => { e.stopPropagation(); sendFriend('friend_accept', { from: fid }); }}>Accept</button>
                  <button className={actionCls(false)} style={actionBtn(false)}
                    onPointerUp={(e) => { e.stopPropagation(); sendFriend('friend_decline', { from: fid }); }}>Decline</button>
                </div>
              </div>
            ))}
            {reqOut.length > 0 && (
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.muted, margin: '8px 0 4px' }}>
                Sent
              </div>
            )}
            {reqOut.map(fid => (
              <div key={fid} style={{
                display: 'flex', alignItems: 'center', minHeight: 40,
                padding: '0 10px', borderRadius: 10, marginBottom: 4,
                background: COL.wellSoft, border: `1px solid ${COL.tileBor}`,
                fontSize: 13, color: COL.text2,
              }}>
                <span style={{ flex: 1 }}>{(doc.reqOut[fid] && doc.reqOut[fid].name) || fid}</span>
                <span style={{ fontSize: 11, color: COL.muted }}>Pending</span>
              </div>
            ))}
          </div>
        )
      )}

      {/* Search — only once the list is big enough to need it. */}
      {searchable && !showBlocked && tab === 'friends' && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search friends"
          style={{
            width: '100%', boxSizing: 'border-box',
            minHeight: 36, padding: '0 10px', marginBottom: 8,
            background: COL.well, color: COL.text,
            border: `1px solid ${COL.tileBor}`, borderRadius: 8,
            fontFamily: 'inherit', fontSize: 13,
          }} />
      )}

      {!connected ? (
        <Empty line="Reconnecting…" sub="Friend presence returns when the connection is back." />
      ) : !showBlocked && (!capsFriends || tab === 'friends') ? (
        rows.length === 0 ? (
          allRows.length === 0 ? (
            <Empty line="No friends yet"
              sub="Tap another player anywhere in Bro Town to view their profile and add them as a friend." />
          ) : (
            <Empty line="No matches" sub="Try a different name." />
          )
        ) : rows.map((r) => {
          const portrait = friendPortrait(r.fid, r.peer, () => force(v => v + 1));
          const seenLine = !r.online ? lastSeenText(r.lastSeen) : null;
          return (
          <div key={r.fid} style={{
            background: COL.wellSoft,
            border: `1px solid ${COL.tileBor}`,
            borderRadius: 10,
            marginBottom: 6,
            padding: '0 8px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%',
              minHeight: 54,
            }}>
              {/* Portrait disc + presence ring: green online, amber
                  AWAY (v2.3.1324 — idle >2min via the aw track flag),
                  gray offline. */}
              <span style={{
                position: 'relative',
                width: 36, height: 36, borderRadius: '50%',
                background: COL.raised,
                border: `2px solid ${r.online ? (r.away ? '#DFAE4E' : '#55B98A') : '#8D9B98'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                fontSize: 15, fontWeight: 800, color: COL.text2,
                flex: '0 0 auto',
              }}>
                {portrait
                  ? <img src={portrait} alt="" draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
                  : (r.name || '?').slice(0, 1).toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: 'block', fontSize: 13.5, fontWeight: 700, color: COL.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {r.name}
                  {r.online && r.level != null && (
                    <span style={{ fontWeight: 600, color: COL.text2 }}>{` · Lv ${r.level}`}</span>
                  )}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: r.online ? (r.away ? '#DFAE4E' : '#55B98A') : COL.text2 }}>
                  {r.online
                    ? `${r.away ? 'Away' : 'Online'}${r.zoneName ? ' · ' + r.zoneName : ''}${r.sameZone ? ' · with you' : ''}`
                    : `Offline${seenLine ? ' · ' + seenLine : ''}`}
                </span>
              </span>
              {/* v2.3.1324: per-thread unread count. */}
              {capsFriends && friendsSrv.unreadOf(r.fid) > 0 && (
                <span aria-hidden="true" style={{
                  flex: 'none',
                  background: COL.accent, color: '#20170D',
                  fontSize: 10, fontWeight: 900,
                  borderRadius: 7, padding: '1px 5px', lineHeight: 1.4,
                }}>{friendsSrv.unreadOf(r.fid)}</span>
              )}
              {/* Row overflow menu toggle — replaces the ▾ chevron that
                  read as another panel-size control (v2.3.1323). */}
              <button
                onPointerUp={(e) => { e.stopPropagation(); setOpenRow(openRow === r.fid ? null : r.fid); }}
                aria-label={`Actions for ${r.name}`}
                style={{
                  flex: 'none', width: 38, height: 34,
                  background: openRow === r.fid ? COL.accentFill : 'transparent',
                  border: `1px solid ${openRow === r.fid ? COL.accent : COL.border}`,
                  borderRadius: 7,
                  color: COL.text2, fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', touchAction: 'manipulation', fontFamily: 'inherit',
                }}
              >•••</button>
            </div>
            {openRow === r.fid && (
              <div style={{ display: 'flex', gap: 6, padding: '0 0 8px' }}>
                {r.online && (
                  <button className={actionCls(false)} style={actionBtn(false)}
                    onPointerUp={(e) => { e.stopPropagation(); openProfile(r); }}>Profile</button>
                )}
                {/* v2.3.1324: DMs need a MUTUAL (server) friendship —
                    legacy one-way follows can't message. */}
                {capsFriends && r.srv && (
                  <button className={actionCls(false)} style={actionBtn(false)}
                    onPointerUp={(e) => { e.stopPropagation(); toggleThread(r.fid); }}>Message</button>
                )}
                {partyCaps && r.online && (
                  <button className={actionCls(false)} style={{ ...actionBtn(false), color: '#D8A94D' }}
                    onPointerUp={(e) => { e.stopPropagation(); invite(r.fid); }}>Invite</button>
                )}
                <button className={actionCls(false)} style={actionBtn(false)}
                  onPointerUp={(e) => { e.stopPropagation(); removeFriend(r.fid, r.srv); }}>Remove</button>
                <button className={actionCls(true)} style={actionBtn(true)}
                  onPointerUp={(e) => { e.stopPropagation(); blockPlayer(r.fid, r.name); }}>Block</button>
              </div>
            )}
            {/* v2.3.1324: inline DM thread — local archive (the server
                backlog is delivered-once), newest at the bottom. */}
            {openThread === r.fid && (
              <div style={{ padding: '0 0 8px' }}>
                <div style={{
                  maxHeight: 150, overflowY: 'auto', touchAction: 'pan-y',
                  WebkitOverflowScrolling: 'touch',
                  background: COL.well, border: `1px solid ${COL.tileBor}`,
                  borderRadius: 8, padding: '6px 8px', marginBottom: 6,
                }}>
                  {friendsSrv.thread(r.fid).length === 0 && (
                    <div style={{ fontSize: 11.5, color: COL.muted, textAlign: 'center', padding: '8px 0' }}>
                      Say hi — messages reach {r.name} even while they're offline.
                    </div>
                  )}
                  {friendsSrv.thread(r.fid).map((m, mi) => (
                    <div key={mi} style={{
                      display: 'flex',
                      justifyContent: m.mine ? 'flex-end' : 'flex-start',
                      marginBottom: 3,
                    }}>
                      <span style={{
                        maxWidth: '80%',
                        background: m.mine ? COL.accentFill : COL.wellSoft,
                        border: `1px solid ${m.mine ? 'rgba(216,170,88,.4)' : COL.tileBor}`,
                        borderRadius: 8, padding: '4px 8px',
                        fontSize: 12.5, color: COL.text, lineHeight: 1.3,
                        wordBreak: 'break-word',
                      }}>{m.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendDm(r.fid); }}
                    placeholder="Message…"
                    maxLength={280}
                    style={{
                      flex: 1, minWidth: 0, minHeight: 36, padding: '0 10px',
                      background: COL.well, color: COL.text,
                      border: `1px solid ${COL.tileBor}`, borderRadius: 8,
                      fontFamily: 'inherit', fontSize: 13,
                    }} />
                  <button
                    onPointerUp={(e) => { e.stopPropagation(); sendDm(r.fid); }}
                    disabled={!draft.trim()}
                    className={'bt-chisel bt-chisel--chip' + (draft.trim() ? ' bt-chisel--brass' : '')}
                    style={{
                      flex: 'none', minHeight: 38, padding: '0 10px',
                      color: draft.trim() ? undefined : COL.muted,
                      fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                    }}>Send</button>
                </div>
              </div>
            )}
          </div>
          );
        })
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
