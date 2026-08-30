import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle } from './common.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { controlsTutorialBus } from '../controlsTutorialBus.js';
import { installHintBus } from '../installHintBus.js'; /* v2.3.2154 */
import { TRAIL_STYLES, getTrailStyle, setTrailStyle } from '@/game/questTrailStyle.js';

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — 44px
   setting rows, and the switch grows to a 46×26 touchable pill: track
   is the #121B20 well when off, brass when on (brass = active state,
   the one accent in this region).  Toggle handlers and localStorage
   keys are unchanged. */
/* v2.3.1235: batch-1 rollout — two corrections against the locked
   token sheet: (1) the real hit target was the 46×26 pill (<44px
   tall), so the <button> is now an invisible 56×44 target and the
   pill is a nested visual span; (2) toggle states follow the contract
   exactly — ON = brass-soft fill + brass border + brass knob (a full
   brass fill would compete with the surface's single gold action),
   OFF = raised/neutral with a muted knob.  Click handler unchanged. */
const Toggle = ({ label, value, onChange }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    padding: '0 8px',
    borderBottom: `1px solid ${COL.divider}`,
  }}>
    <span style={{ fontSize: 13.5, color: COL.text }}>{label}</span>
    <button
      onClick={onChange}
      style={{
        width: 56, height: 44,
        flex: '0 0 auto',
        background: 'transparent',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        cursor: 'pointer',
        padding: 0,
        touchAction: 'manipulation',
      }}
    >
      <span style={{
        display: 'block',
        width: 46, height: 26,
        borderRadius: 999,
        background: value ? COL.accentFill : COL.raised,
        border: `1px solid ${value ? COL.accent : COL.borderStrong}`,
        boxSizing: 'border-box',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute',
          top: 2, left: value ? 22 : 2,
          width: 20, height: 20,
          borderRadius: '50%',
          background: value ? COL.accent : COL.muted,
          boxShadow: '0 1px 2px rgba(0,0,0,.35)',
          transition: 'left .15s',
        }} />
      </span>
    </button>
  </div>
);

export const SettingsPanel = () => {
  const [, force] = useState(0);
  const [audio, setAudio] = useState(() => {
    try { return localStorage.getItem('brotown_audio_off') !== '1'; } catch { return true; }
  });
  const [debug, setDebug] = useState(() => {
    try { return localStorage.getItem('brotown_debug') === '1'; } catch { return false; }
  });
  /* v2.3.2141: the quest path guide -- shape, or off.  The module owns the
     value and the storage; this row only names it, the same way the audio
     toggle owns nothing but the label. */
  const [trail, setTrail] = useState(() => getTrailStyle());
  /* v2.3.1347: self-service character restart (owner playtest).
     'idle' -> confirm overlay -> 'sending' (waiting on the server's
     character_reset_done, which wipes + reloads in wsClient.js) or
     'offline' (no live connection -- the reset MUST settle server-side,
     a local-only wipe would just restore from the server blob on the
     next join). */
  const [resetStage, setResetStage] = useState('idle');
  /* v2.3.1424: retry-loop timer for the reconnect-then-reset flow;
     cleared on unmount so closing the panel cancels the restart. */
  const retryTimerRef = useRef(null);
  const clearRetry = () => {
    if (retryTimerRef.current) { clearInterval(retryTimerRef.current); retryTimerRef.current = null; }
  };
  useEffect(() => clearRetry, []);

  const toggleAudio = () => {
    const next = !audio;
    setAudio(next);
    try { localStorage.setItem('brotown_audio_off', next ? '0' : '1'); } catch {}
    try { window.BT_AUDIO && (window.BT_AUDIO.muted = !next); } catch {}
  };
  const toggleDebug = () => {
    const next = !debug;
    setDebug(next);
    try {
      if (next) window.debug?.enable?.();
      else window.debug?.disable?.();
    } catch {}
  };

  const confirmReset = () => {
    /* v2.3.1424 (owner: "restart button never works — says it can't
       right now"): the gate used to trust S._realtimeStatus, a shadow
       of the socket state that can be stale on device (a zombie
       socket's late onclose/onerror stamps 'disconnected' after a
       newer socket already opened; a 'superseded' session never
       auto-reconnects while the game keeps playing locally).  Now:
       ask the socket itself via channel.isLive(), and when it truly
       is down, kick an immediate reconnect and keep trying for ~6 s
       ("Connecting…") before giving up — iOS routinely kills the
       socket on backgrounding and the auto-reconnect may still be in
       its backoff window at tap time. */
    const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
    if (!S || !S.channel) {
      setResetStage('offline');
      return;
    }
    const isLive = () => {
      try { if (S.channel && S.channel.isLive) return S.channel.isLive(); } catch (e) {}
      return S._realtimeStatus === 'connected';
    };
    const sendReset = () => {
      setResetStage('sending');
      try { S.channel.send({ type: 'character_reset', payload: { confirm: true } }); } catch (e) {}
      /* Fallback: if the ack (or the reload it triggers) never lands --
         dropped socket mid-flight -- reload anyway after 8s.  Whether the
         server processed the reset decides what the rejoin loads; the
         player is never left staring at a dead "Restarting…" screen. */
      setTimeout(() => { try { window.location.reload(); } catch (e) {} }, 8000);
    };
    if (isLive()) { sendReset(); return; }
    setResetStage('connecting');
    try { S.channel.forceReconnect && S.channel.forceReconnect(); } catch (e) {}
    const t0 = Date.now();
    clearRetry();
    retryTimerRef.current = setInterval(() => {
      if (isLive()) {
        clearRetry();
        sendReset();
      } else if (Date.now() - t0 > 6000) {
        clearRetry();
        setResetStage('offline');
      } else {
        try { S.channel.forceReconnect && S.channel.forceReconnect(); } catch (e) {}
      }
    }, 400);
  };

  if (resetStage === 'confirm' || resetStage === 'sending' || resetStage === 'connecting' || resetStage === 'offline') {
    return (
      <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 12px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: COL.danger }}>Restart Character?</div>
        {resetStage === 'sending' ? (
          <div style={{ fontSize: 13.5, color: COL.text, lineHeight: 1.5 }}>Restarting…</div>
        ) : resetStage === 'connecting' ? (
          <div style={{ fontSize: 13.5, color: COL.text, lineHeight: 1.5 }}>Connecting to the game server…</div>
        ) : resetStage === 'offline' ? (
          <div style={{ fontSize: 13.5, color: COL.text, lineHeight: 1.5 }}>
            Can&apos;t restart right now — no connection to the game server. Try again in a moment.
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: COL.text, lineHeight: 1.5 }}>
            Your character starts over at <b>Level 1</b>. All items, gold, skills and
            quest progress are <b style={{ color: COL.danger }}>deleted forever</b>.
            Your name, login key and friends are kept.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onPointerUp={(e) => { e.stopPropagation(); if (resetStage !== 'sending') { clearRetry(); setResetStage('idle'); } }}
            style={{
              flex: 1, minHeight: 44, borderRadius: 8, cursor: 'pointer',
              background: COL.raised, color: COL.text,
              border: `1px solid ${COL.borderStrong}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              opacity: resetStage === 'sending' ? 0.5 : 1,
            }}
          >Keep playing</button>
          <button
            onPointerUp={(e) => { e.stopPropagation(); if (resetStage === 'confirm') confirmReset(); }}
            style={{
              flex: 1, minHeight: 44, borderRadius: 8, cursor: 'pointer',
              background: resetStage === 'confirm' ? COL.danger : COL.raised,
              color: resetStage === 'confirm' ? '#fff' : COL.muted,
              border: `1px solid ${COL.danger}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
            }}
          >{resetStage === 'sending' ? 'Restarting…' : resetStage === 'connecting' ? 'Connecting…' : 'Restart at Lv 1'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <Toggle label="Audio" value={audio} onChange={toggleAudio} />
      <Toggle label="Debug overlay (D)" value={debug} onChange={toggleDebug} />
      {/* ═══ v2.3.2141: THE QUEST PATH ═══
          Owner: "Add an option to turn off the path guide for the quest.
          Also explore different options than the bead snake."
          ONE row, not a toggle plus a picker: a player who wants it gone and
          a player who wants it different are reaching for the same control,
          and Off as a fourth chip is one tap from either. */}
      <ChoiceRow
        label="Quest path"
        options={TRAIL_STYLES}
        value={trail}
        onChange={(id) => { setTrail(setTrailStyle(id)); }}
      />
      {/* v2.3.1291 (ChatGPT round-3 §1): Account, Controls and Feedback
          fold in here as drill rows — they left the More launcher.  The
          panels themselves are unchanged (PANELS registry push). */}
      {/* v2.3.2038: renamed with the tile and the panel header. This row stays
          -- it is where the path has lived since v2.3.1291 and anyone who
          learned it here should still find it. */}
      <LinkRow label="Login Key — save it, or continue a character"
        onTap={() => dashboardPanelBus.push('account')} />
      <LinkRow label="Controls — replay the tutorial"
        onTap={() => controlsTutorialBus.open()} />
      {/* v2.3.2154: the way back to a dismissed install hint — everything
          cut is one tap away.  iOS Safari in the browser only: launched
          from the home screen there is nothing to teach, and elsewhere the
          instruction would be wrong. */}
      {(() => {
        try {
          const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
          const standalone = window.navigator.standalone === true
            || window.matchMedia('(display-mode: standalone)').matches;
          if (!ios || standalone) return null;
        } catch (e) { return null; }
        return (
          <LinkRow label="Play full screen — hide the browser bar"
            onTap={() => { installHintBus.open(); dashboardPanelBus.toBar(); }} />
        );
      })()}
      <LinkRow label="Feedback — message the developers"
        onTap={() => dashboardPanelBus.push('feedback')} />
      {/* v2.3.1347: destructive row — red label, drills into the
          in-panel confirmation screen above (owner playtest request). */}
      <LinkRow label="Restart character — start over at Level 1"
        danger
        onTap={() => setResetStage('confirm')} />
      <div style={{ marginTop: 10, padding: '0 8px', fontSize: 13, color: COL.muted, lineHeight: 1.4 }}>
        Tap the floating <b>D</b> button for the full devtools console.
      </div>
    </div>
  );
};

/* ═══ v2.3.2141: A SETTING WITH MORE THAN TWO STATES ═══
 * The panel had exactly one control shape -- the on/off Toggle -- and "which
 * shape should the quest path be" is not a yes/no.  A dropdown was the other
 * option and is the wrong one on a phone: it hides every value but the current
 * one behind a tap, so a player who does not already know what "Ribbon" looks
 * like cannot discover it, and discovery is most of what this row is for.
 *
 * So: chips, all values visible, with the selected one carrying the brass
 * fill the Toggle's ON state uses (LANTERN-SLATE-SPEC: brass is the active
 * state, and this row's chips are the only active thing in it).  The hint line
 * under them describes the SELECTED value, because that is the one the player
 * is deciding whether to keep.
 *
 * 44px chips, deliberately, unlike the 32px chat lane chips (v2.3.2139, sized
 * down to keep a composer clear of the iOS keyboard).  A settings row has no
 * keyboard to make room for, so there is no reason to spend the touch floor
 * here. */
const ChoiceRow = ({ label, options, value, onChange }) => {
  const sel = options.find((o) => o.id === value) || null;
  return (
    <div style={{ padding: '10px 8px', borderBottom: `1px solid ${COL.divider}` }}>
      <div style={{ fontSize: 13.5, color: COL.text, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              data-trailstyle={o.id}
              aria-pressed={on}
              onPointerUp={(e) => { e.stopPropagation(); onChange(o.id); }}
              style={{
                flex: '1 1 0',
                minWidth: 68,
                minHeight: 44,
                borderRadius: 8,
                cursor: 'pointer',
                background: on ? COL.accentFill : COL.raised,
                border: `1px solid ${on ? COL.accent : COL.borderStrong}`,
                color: on ? COL.accent : COL.text,
                fontFamily: 'inherit',
                fontSize: 13.5,
                fontWeight: on ? 700 : 500,
                touchAction: 'manipulation',
              }}
            >{o.label}</button>
          );
        })}
      </div>
      {sel && sel.hint ? (
        <div style={{ marginTop: 8, fontSize: 12.5, color: COL.muted, lineHeight: 1.4 }}>
          {sel.hint}
        </div>
      ) : null}
    </div>
  );
};

/* v2.3.1291: 44px drill row — label left, ▸ affordance right.
   v2.3.1347: `danger` tints the label for destructive rows. */
const LinkRow = ({ label, onTap, danger }) => (
  <button
    onPointerUp={(e) => { e.stopPropagation(); onTap(); }}
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      minHeight: 44,
      padding: '0 8px',
      background: 'transparent',
      border: 'none',
      borderBottom: `1px solid ${COL.divider}`,
      color: danger ? COL.danger : COL.text,
      fontFamily: 'inherit',
      fontSize: 13.5,
      textAlign: 'left',
      cursor: 'pointer',
      touchAction: 'manipulation',
    }}
  >
    <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
    <span aria-hidden="true" style={{ color: COL.muted, fontSize: 15 }}>▸</span>
  </button>
);
