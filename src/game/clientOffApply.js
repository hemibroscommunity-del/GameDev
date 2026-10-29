/* ═══ v2.3.3755: THE SOUND SAVERS, OFF FROM THE TEST PANEL ═══
 * game/clientOff.js has the why.  The two savers that live in BT_AUDIO are
 * switched here, so their own files keep only their own `?x=0`:
 *   - the sound cache (BT_AUDIO.SFX_CACHE) is read as the loading screen
 *     decodes the sounds, so "off" holds from the next load (clientOffAtLoad);
 *   - the voice cap (BT_AUDIO.VOICE_CAP) is read at every start, so "off"
 *     holds at once, and "on" again puts back what this page had;
 *   - v2.3.3800: the sound gate (BT_AUDIO.SOUND_GATE) too, live: "off" opens
 *     a gate that is closed at once (a gate stuck shut is a silent game). */
import { BT_AUDIO } from '@/data/index.js';
import { clientOff, clientOffAtLoad, onClientOff } from '@/game/clientOff.js';

const _voiceAsLoaded = BT_AUDIO.VOICE_CAP;   /* the page's own (its address may have said ?voicecap=0) */

function applyVoice() {
  try { BT_AUDIO.VOICE_CAP = clientOff('voicecap') ? null : _voiceAsLoaded; } catch (e) { /* the cap's own trouble */ }
}

const _gateAsLoaded = BT_AUDIO.SOUND_GATE;   /* the page's own (?soundgate=0) */

function applyGate() {
  try {
    BT_AUDIO.SOUND_GATE = clientOff('soundgate') ? false : _gateAsLoaded;
    if (BT_AUDIO._gateEval) BT_AUDIO._gateEval();
  } catch (e) { /* the gate's own trouble */ }
}

try { if (clientOffAtLoad('sfxcache')) BT_AUDIO.SFX_CACHE = false; } catch (e) { /* as it was */ }
applyVoice();
applyGate();
onClientOff(function () { applyVoice(); applyGate(); });
