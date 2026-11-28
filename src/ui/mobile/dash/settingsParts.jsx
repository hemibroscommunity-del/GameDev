/* ═══ v2.3.6869: TODAY'S SETTINGS, THEIR ONE WRITER (card MN step 12, Settings) ═══
 *
 * The owner's Settings (docs/design/menus3/DECISIONS.md, decided 9: the rail
 * of five, Sound, Screen, Alerts, Account, Help) holds every control today's
 * Settings page holds, each doing exactly what today's does (the same stored
 * value, the same request).  So the controls that write something -- the
 * sound's switch and its two levels, the debug overlay, the character's
 * restart with its confirm screen -- moved here VERBATIM from
 * SettingsPanel.jsx, and both pages call them: today's page under
 * `?menus3=0` and the new one (menus3/Menus3Settings.jsx) can never write two
 * different things.  The rows' looks stay each page's own.
 *
 * Imported by the two lazy pages only (lazyPanels.js: nothing in the main
 * script), so it rides in their shared chunk. */
import React, { useEffect, useRef, useState } from 'react';
import { SAY } from '@/data/say/settingsPanel.js';
import { say, sayPieces } from '@/game/say.js';
import { COL, panelStyle } from './common.js';
import { BT_AUDIO } from '@/data/index.js';   /* v2.3.2820: see toggleAudio */
import { act } from '@/game/actions.js';   /* v2.3.5191: the page's requests leave through the action door (card K PR 7) */
import { sw } from '@/game/switches.js';   /* v2.3.5741: the page's one reader (card T2) */

const readLevel = (key) => {
  try {
    const v = localStorage.getItem(key);
    if (v == null) return 1;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
  } catch { return 1; }
};
/* v2.3.2820: the Debug switch only means something with ?dev=1 in the URL
   (GameApp mounts the overlay behind the same test), so a normal player was
   shown a switch that did nothing -- and a line about a "floating D button"
   that is not there. */
export const DEV_MODE = sw('dev');   /* v2.3.5741: the page's one reader (card T2) */


/** The sound: the switch and its two levels (brotown_audio_off, brotown_vol_music, brotown_vol_sfx). */
export function useSoundSettings() {
  const [musicVol, setMusicVol] = useState(() => readLevel('brotown_vol_music'));
  const [sfxVol, setSfxVol] = useState(() => readLevel('brotown_vol_sfx'));
  const setVol = (which, v) => {
    if (which === 'music') setMusicVol(v); else setSfxVol(v);
    try { localStorage.setItem(which === 'music' ? 'brotown_vol_music' : 'brotown_vol_sfx', String(v)); } catch {}
    try {
      const A = BT_AUDIO;
      if (A && A.setLevels) A.setLevels(which === 'music' ? v : A.musicLevel, which === 'music' ? A.sfxLevel : v);
    } catch {}
  };
  const [audio, setAudio] = useState(() => {
    try { return localStorage.getItem('brotown_audio_off') !== '1'; } catch { return true; }
  });
  const toggleAudio = () => {
    const next = !audio;
    setAudio(next);
    try { localStorage.setItem('brotown_audio_off', next ? '0' : '1'); } catch {}
    /* v2.3.2820: BT_AUDIO directly.  This read `window.BT_AUDIO`, which
       nothing ever assigns, so the switch only saved the choice and the
       sound kept playing until the next reload (GameApp applies the saved
       mute at boot).  Found while wiring the volume sliders beside it. */
    try {
      const S = window._gameState && window._gameState.current;
      BT_AUDIO.setMuted(!next, S && S.currentZone);
    } catch {}
  };
  return { musicVol, sfxVol, setVol, audio, toggleAudio };
}

/** The debug overlay (?dev=1 only: DEV_MODE). */
export function useDebugSetting() {
  const [debug, setDebug] = useState(() => {
    try { return localStorage.getItem('brotown_debug') === '1'; } catch { return false; }
  });
  const toggleDebug = () => {
    const next = !debug;
    setDebug(next);
    try {
      if (next) window.debug?.enable?.();
      else window.debug?.disable?.();
    } catch {}
  };

  return { debug, toggleDebug };
}

/** The character's restart: its stage, the request, the reconnect.  `showing` while its screen
    replaces the page (confirm, sending, connecting, offline, refused). */
export function useRestart() {
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
  /* v2.3.4627: the restart can be REFUSED now -- not during a fight with a player in
     No man's land, where the wipe would leave the killer nothing (server
     fightlock.js `fightlockreset`; wsClient's `character_reset_refused`).  The
     8 s fallback reload is cancelled and the screen says why. */
  const reloadTimerRef = useRef(null);
  const [refusedWords, setRefusedWords] = useState('');
  useEffect(() => {
    const onRefused = (e) => {
      if (reloadTimerRef.current) { clearTimeout(reloadTimerRef.current); reloadTimerRef.current = null; }
      setRefusedWords((e && e.detail && e.detail.message) || say(SAY, 'settingsPanel.refusedWhy'));
      setResetStage('refused');
    };
    window.addEventListener('bt-reset-refused', onRefused);
    return () => {
      window.removeEventListener('bt-reset-refused', onRefused);
      if (reloadTimerRef.current) { clearTimeout(reloadTimerRef.current); reloadTimerRef.current = null; }
    };
  }, []);

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
      try { act('character_reset', { confirm: true }); } catch (e) {}   /* v2.3.5191: through the action door (actions.js) */
      /* Fallback: if the ack (or the reload it triggers) never lands --
         dropped socket mid-flight -- reload anyway after 8s.  Whether the
         server processed the reset decides what the rejoin loads; the
         player is never left staring at a dead "Restarting…" screen. */
      reloadTimerRef.current = setTimeout(() => { try { window.location.reload(); } catch (e) {} }, 8000);
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

  const showing = resetStage === 'confirm' || resetStage === 'sending' || resetStage === 'connecting' || resetStage === 'offline' || resetStage === 'refused';
  return { resetStage, setResetStage, refusedWords, clearRetry, confirmReset, showing };
}

/** The restart's own screen, as today's page drew it (`r` from useRestart). */
export function RestartScreen({ r }) {
  const { resetStage, setResetStage, refusedWords, clearRetry, confirmReset } = r;
  return (
    <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 12px' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: COL.danger }}>{say(SAY, 'settingsPanel.restartTitle')}</div>
      {resetStage === 'sending' ? (
        <div style={{ fontSize: 13.5, color: COL.text, lineHeight: 1.5 }}>{say(SAY, 'settingsPanel.restarting')}</div>
      ) : resetStage === 'connecting' ? (
        <div style={{ fontSize: 13.5, color: COL.text, lineHeight: 1.5 }}>{say(SAY, 'settingsPanel.connectingServer')}</div>
      ) : resetStage === 'refused' ? (
        <div data-qa="reset-refused" style={{ fontSize: 13.5, color: COL.text, lineHeight: 1.5 }}>
          {say(SAY, 'settingsPanel.refused', { why: refusedWords })}
        </div>
      ) : resetStage === 'offline' ? (
        <div style={{ fontSize: 13.5, color: COL.text, lineHeight: 1.5 }}>
          {say(SAY, 'settingsPanel.offline')}
        </div>
      ) : (
        <div style={{ fontSize: 13.5, color: COL.text, lineHeight: 1.5 }}>
          {sayPieces(SAY, 'settingsPanel.confirmBody', { level: <b key="level">{say(SAY, 'settingsPanel.confirmLevel')}</b>,
            gone: <b key="gone" style={{ color: COL.danger }}>{say(SAY, 'settingsPanel.confirmGone')}</b> })}
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
        >{say(SAY, 'settingsPanel.keepPlaying')}</button>
        <button
          onPointerUp={(e) => { e.stopPropagation(); if (resetStage === 'confirm') confirmReset(); else if (resetStage === 'refused') setResetStage('confirm'); }}
          style={{
            flex: 1, minHeight: 44, borderRadius: 8, cursor: 'pointer',
            background: resetStage === 'confirm' ? COL.danger : COL.raised,
            color: resetStage === 'confirm' ? '#fff' : COL.muted,
            border: `1px solid ${COL.danger}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
          }}
        >{say(SAY, resetStage === 'sending' ? 'settingsPanel.restarting' : resetStage === 'connecting' ? 'settingsPanel.connecting' : 'settingsPanel.restartGo')}</button>
      </div>
    </div>
  );
}
