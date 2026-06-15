import { BT_AUDIO } from '@/data/index.js';

/* === townMusic — the in-town background melody loop ===
   v2.3.899: extracted verbatim from a BroTown.jsx useEffect (effect-pass).
   Once past the splash/login, plays a looping chiptune melody note every
   1.8s through BT_AUDIO (skipped while muted or before the audio ctx
   exists). Behavior-frozen; returns the clearInterval cleanup. Call from a
   useEffect with [showNameModal, showLogin]; early-returns (no cleanup)
   while either gate is up, exactly as before. */
export function wireTownMusic(showNameModal, showLogin) {
  if (showNameModal || showLogin) return;
  var melody = [262, 294, 330, 294, 262, 330, 392, 330, 262, 294, 330, 392, 440, 392, 330, 294];
  var noteIdx = 0;
  var interval = setInterval(function () {
    if (!BT_AUDIO.muted && BT_AUDIO.ctx) {
      BT_AUDIO.bgNote(melody[noteIdx % melody.length], 0.6);
    }
    noteIdx++;
  }, 1800);
  return function () {
    return clearInterval(interval);
  };
}
