import React, { useCallback, useEffect, useState } from 'react';
import { COL, panelStyle } from './common.js';
import { BT_API_BASE } from '@/networking/index.js';
import { FEEDBACK_CATEGORIES, FEEDBACK_TOPICS } from '@/data/index.js';

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — tabs
   become the spec segmented control (36px on the #121B20 well track,
   active = raised + 2px brass bottom edge), the textarea becomes a
   spec input well (#121B20, 16px font so iOS Safari doesn't auto-zoom
   on focus — same floor as AccountLoginForm), and Send becomes the
   panel's one primary brass button (44px min, #20170D text).

   ═══ v2.3.2820: FEEDBACK THAT ARRIVES ═══
   Every report typed here was LOST.  Send went out as a WebSocket
   `broadcast` event called `feedback`, which the worker has no case for,
   so it fell through to the default branch and was rebroadcast to every
   connected player -- and never reached the Feedback Durable Object
   (server/src/feedback.js).  The one panel that did post to
   /api/feedback/submit was the legacy panel behind the hidden MenuBar, so
   the board the owner could read stayed empty while players believed
   they had reported bugs.  Found by the 2026-09-24 demo audit.
   Now this panel posts to the same /api/feedback/submit the legacy one
   did, with the two fields that route requires (a category and a topic),
   says honestly whether it landed, and the Browse tab -- "coming soon"
   since v2.3.1232 -- lists the board with up-votes.  The worker drops the
   old `feedback` socket event (index.js) so a cached client cannot keep
   shouting reports into everyone's socket. */

/* Labels without their leading emoji: the Lantern Slate chips are text. */
const plain = (label) => String(label || '').replace(/^[^A-Za-z0-9]+\s*/, '');
const SUBMIT_MAX = 500;   /* mirrors server/src/feedback.js FEEDBACK_TEXT_MAX */

export const FeedbackPanel = () => {
  const [tab, setTab] = useState('submit');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('bug');
  const [topic, setTopic] = useState('other');
  /* idle | sending | sent | error -- the honest version of the old
     1.5s "Sent" flash, which showed whether or not anything happened. */
  const [status, setStatus] = useState('idle');
  const [err, setErr] = useState('');

  const submit = async () => {
    const t = text.trim();
    const S = window._gameState && window._gameState.current;
    if (!t || !S || !S.myId || status === 'sending') return;
    setStatus('sending'); setErr('');
    try {
      const res = await fetch(BT_API_BASE + '/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: S.myId, playerName: S.myName || 'Bro', category, topic, text: t }),
      });
      const d = await res.json().catch(() => ({}));
      if (!d || !d.ok) {
        setStatus('error'); setErr((d && d.error) || 'Could not send. Try again.');
        return;
      }
      setText('');
      setStatus('sent');
      setTimeout(() => setStatus((s) => (s === 'sent' ? 'idle' : s)), 2500);
    } catch (e) {
      setStatus('error'); setErr('Could not reach the server. Try again.');
    }
  };

  return (
    <div style={panelStyle}>
      {/* v2.3.1235: batch-1 rollout — track border was COL.tileBor
          (rgba .08), an off-token line; only line (.11) / line-strong
          (.20) are approved. */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 8,
        background: COL.well, borderRadius: 10, padding: 2,
        border: `1px solid ${COL.border}`,
      }}>
        <button onClick={() => setTab('submit')} style={tabBtn(tab === 'submit')}>Submit</button>
        <button onClick={() => setTab('browse')} style={tabBtn(tab === 'browse')}>Browse</button>
      </div>
      {tab === 'submit' ? (
        <>
          <div style={labelStyle}>What kind?</div>
          <div style={chipRow}>
            {FEEDBACK_CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)} style={chip(category === c.id)}
                data-fb-cat={c.id}>{plain(c.label)}</button>
            ))}
          </div>
          <div style={labelStyle}>About</div>
          <div style={chipRow}>
            {FEEDBACK_TOPICS.map((t) => (
              <button key={t.id} onClick={() => setTopic(t.id)} style={chip(topic === t.id)}
                data-fb-topic={t.id}>{plain(t.label)}</button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); if (status === 'error') setStatus('idle'); }}
            placeholder="Tell us what's working or broken…"
            maxLength={SUBMIT_MAX}
            data-fb-text=""
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minHeight: 72,
              padding: '10px 10px',
              background: COL.well,
              border: `1px solid ${COL.border}`,
              borderRadius: 8,
              color: COL.text,
              caretColor: COL.focus,
              fontFamily: 'inherit',
              fontSize: 16,
              lineHeight: 1.4,
              resize: 'none',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: status === 'error' ? COL.danger : COL.muted, fontVariantNumeric: 'tabular-nums' }}
              data-fb-status={status}>
              {status === 'error' ? err
                : status === 'sent' ? 'Thanks — it’s on the board.'
                : `${text.length}/${SUBMIT_MAX}`}
            </span>
            {/* v2.3.1235: batch-1 rollout — Send is this surface's one
                filled-gold action; moved from a flat-brass radius-11
                one-off onto the shared button-primary class (gold
                gradient, #EAC675 border, radius 10, #172126 text). */}
            <button onClick={submit} className="button-primary" disabled={!text.trim() || status === 'sending'}
              data-fb-send=""
              style={{
                minHeight: 44,
                padding: '0 20px',
                fontSize: 13,
                touchAction: 'manipulation',
                opacity: !text.trim() ? 0.55 : 1,
              }}>{status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent' : 'Send'}</button>
          </div>
        </>
      ) : (
        <FeedbackBoard />
      )}
    </div>
  );
};

/* The board: newest or most-liked reports, with an up-vote.  Voting
   toggles (a second tap takes the vote back), which is the worker's own
   rule in feedback.js vote(). */
const FeedbackBoard = () => {
  const [sort, setSort] = useState('new');
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [mine, setMine] = useState(() => Object.create(null));   /* ticketId -> 'up' | null, this session */

  const load = useCallback(() => {
    setFailed(false);
    fetch(BT_API_BASE + '/api/feedback/list?sort=' + sort + '&limit=30&offset=0')
      .then((r) => r.json())
      .then((d) => { if (d && d.ok) setRows(d.tickets || []); else setFailed(true); })
      .catch(() => setFailed(true));
  }, [sort]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const vote = (id) => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.myId) return;
    fetch(BT_API_BASE + '/api/feedback/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: id, playerId: S.myId, vote: 'up' }),
    }).then((r) => r.json()).then((d) => {
      if (!d || !d.ok) return;
      setRows((rs) => (rs || []).map((t) => (t.id === id ? { ...t, up: d.up, down: d.down } : t)));
      setMine((m) => { const n = Object.assign(Object.create(null), m); n[id] = d.myVote; return n; });
    }).catch(() => {});
  };

  const catLabel = (id) => { const c = FEEDBACK_CATEGORIES.find((x) => x.id === id); return c ? plain(c.label) : id; };
  const catColor = (id) => { const c = FEEDBACK_CATEGORIES.find((x) => x.id === id); return (c && c.color) || COL.text2; };

  return (
    <div data-fb-board="">
      <div style={{ ...chipRow, marginBottom: 8 }}>
        <button onClick={() => setSort('new')} style={chip(sort === 'new')}>Newest</button>
        <button onClick={() => setSort('top')} style={chip(sort === 'top')}>Most liked</button>
      </div>
      {failed ? (
        <div style={emptyStyle}>Couldn’t load the board. <button onClick={load} style={linkBtn}>Retry</button></div>
      ) : rows == null ? (
        <div style={emptyStyle}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={emptyStyle}>No feedback yet — be the first.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((t) => (
            <div key={t.id} data-fb-row={t.id} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              background: COL.well, border: `1px solid ${COL.border}`, borderRadius: 8, padding: '8px 8px 8px 10px',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: catColor(t.category), marginBottom: 2 }}>
                  {catLabel(t.category)}
                  <span style={{ color: COL.muted, fontWeight: 600 }}> · {t.playerName || 'Bro'}</span>
                </div>
                <div style={{ fontSize: 13, color: COL.text, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{t.text}</div>
              </div>
              <button onClick={() => vote(t.id)} aria-label="Up-vote" style={{
                minWidth: 44, minHeight: 44, borderRadius: 8, cursor: 'pointer', touchAction: 'manipulation',
                border: `1px solid ${mine[t.id] === 'up' ? COL.accent : COL.border}`,
                background: mine[t.id] === 'up' ? COL.accentFill : COL.raised,
                color: mine[t.id] === 'up' ? COL.accent : COL.text2,
                fontFamily: 'inherit', fontSize: 12, fontWeight: 800, lineHeight: 1.1,
              }}>▲<br />{t.up || 0}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* Spec segmented control segment — see comment at top of file.
   v2.3.1235: batch-1 rollout — segments are tappable, so they carry the
   ≥44px hitbox contract themselves (was height 36). */
const tabBtn = (active) => ({
  flex: 1,
  minHeight: 44,
  background: active ? COL.raised : 'transparent',
  color: active ? COL.text : COL.text2,
  border: 'none',
  borderBottom: `2px solid ${active ? COL.accent : 'transparent'}`,
  borderRadius: 8,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  touchAction: 'manipulation',
});

const labelStyle = { fontSize: 11, fontWeight: 700, color: COL.text2, margin: '2px 0 4px' };
const chipRow = { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 };
/* LANTERN-SLATE-SPEC §12: chips 32px / fully round, selected = brass fill
   #3B3427 + brass label. */
const chip = (active) => ({
  minHeight: 32,
  padding: '0 10px',
  borderRadius: 999,
  border: `1px solid ${active ? COL.accent : COL.border}`,
  background: active ? '#3B3427' : COL.raised,
  color: active ? COL.accent : COL.text2,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  touchAction: 'manipulation',
});
const emptyStyle = { fontSize: 13, color: COL.text2, textAlign: 'center', padding: '16px 0' };
const linkBtn = { background: 'none', border: 'none', color: COL.accent, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 };
