import { BT_AUDIO } from '@/data/index.js';

/* === slimeAudio — slime proximity-audio loop ===
   v2.3.901: extracted verbatim from a BroTown.jsx mount useEffect (empty
   deps). Ticks every 80ms: finds the nearest alive fodder monster within
   SLIME_AUDIO_RANGE and scales a single looping BufferSource's gain by
   inverse distance (closer = louder). Routed through BT_AUDIO's master
   bus (the previous HTMLAudio path stuttered between RAFs). Behavior-
   frozen; returns the interval-clear + source-stop cleanup. The slime
   idle audio slot ref passes in; call from a useEffect with empty deps. */
export function wireSlimeAudio(stateRef, slimeIdleAudioRef) {
    var SLIME_AUDIO_RANGE = 250;
    var SLIME_AUDIO_VOL_MAX = 0.5;
    var URL = '/audio/slime-idle.mp3';
    var slot = slimeIdleAudioRef.current;
    var loadBuffer = function () {
      if (slot.buffer || slot._loading || !BT_AUDIO.ctx) return;
      slot._loading = true;
      fetch(URL)
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (ab) { return BT_AUDIO.ctx.decodeAudioData(ab); })
        .then(function (buf) { slot.buffer = buf; slot._loading = false; })
        .catch(function () { slot._loading = false; });
    };
    /* v2.3.4422: an audio rebuild (an iPhone app switch of 2 s or more, then
       a tap: BT_AUDIO._rebuildContext) closes the context this loop's source
       and gain were made in, and nothing tells this slot: the source stayed
       set, so ensureSource never made another and the hum was gone until a
       reload (sweep VB-2, U1-28).  Nodes of a context that is not the live
       one are let go, with the buffer decoded in it (the rebuild drops its
       own decodes the same way), so ONE source and ONE decode are held. */
    var forgetDeadCtx = function () {
      if (!slot.ctx || slot.ctx === BT_AUDIO.ctx) return;
      try { if (slot.source) slot.source.stop(); } catch (e) {}
      try { if (slot.source) slot.source.disconnect(); } catch (e) {}
      try { if (slot.gain) slot.gain.disconnect(); } catch (e) {}
      slot.source = null;
      slot.gain = null;
      slot.buffer = null;
      slot.ctx = null;
    };
    var ensureSource = function () {
      forgetDeadCtx();
      if (slot.source || !slot.buffer || !BT_AUDIO.ctx) return;
      try {
        var src = BT_AUDIO.ctx.createBufferSource();
        var gain = BT_AUDIO.ctx.createGain();
        src.buffer = slot.buffer;
        src.loop = true;
        gain.gain.value = 0;
        src.connect(gain);
        gain.connect(BT_AUDIO._out()); /* v2.3.786: through the master bus */
        src.start(0);
        slot.source = src;
        slot.gain = gain;
        slot.ctx = BT_AUDIO.ctx;
      } catch (e) {}
    };
    loadBuffer();
    var id = setInterval(function () {
      var S = stateRef.current;
      if (!S || !S.player || !S.monsters || BT_AUDIO.muted) return;
      if (!BT_AUDIO.ctx) return;
      forgetDeadCtx();
      var nearest = Infinity;
      for (var i = 0; i < S.monsters.length; i++) {
        var m = S.monsters[i];
        if (!m.alive) continue;
        var arch = m.archetype || m.type || 'fodder';
        if (arch !== 'fodder') continue;
        var dx = m.x - S.player.x, dy = m.y - S.player.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearest) nearest = d;
      }
      if (nearest <= SLIME_AUDIO_RANGE) {
        if (!slot.buffer) { loadBuffer(); return; }
        ensureSource();
        if (slot.gain) {
          var vol = SLIME_AUDIO_VOL_MAX * (1 - nearest / SLIME_AUDIO_RANGE);
          slot.gain.gain.value = Math.max(0, Math.min(SLIME_AUDIO_VOL_MAX, vol));
        }
      } else if (slot.gain) {
        slot.gain.gain.value = 0;
      }
    }, 80);
    return function () {
      clearInterval(id);
      try { if (slot.source) slot.source.stop(); } catch (e) {}
      slot.source = null;
      slot.gain = null;
      slot.ctx = null;
    };
}
