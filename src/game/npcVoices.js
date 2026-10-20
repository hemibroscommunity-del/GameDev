/* ═══ v2.3.3462: THE TOWNSFOLK'S VOICES ═══
 *
 * The owner, 2026-10-18: "I have the rest of the sounds" -- among them a
 * recording of a man humming "hmm" and "ahh", for docs/SOUND-GAPS.md's "NPC
 * voice blips: speech bubbles, opening a conversation".  Five of its hums are
 * cut into one file (tools/audio/cut_owner_sounds.py, data/eventSounds.js
 * npcVoice0-4); each townsperson keeps one of them at a pitch of his own
 * (VOICE_OF), so Mayor Bro always sounds like Mayor Bro and Lil Bro like a
 * little bro:
 *
 *   npcSpeaks(S, npc)   you talk to him -- his quest opens (QuestPanel), or
 *                       his window (Ace's flip, Diego's shop, the Pets page),
 *                       or he has nothing for you: his hum, in full;
 *   npcChatter(S, npc)  a line of his pops up over him (BroTown's townsfolk
 *                       loop, where BT_AUDIO.npcChat() was a beep(), silent
 *                       since v2.3.1103): his hum at CHATTER_K by distance
 *                       (hitSounds.earVol), none past CHATTER_R, and no two
 *                       townsfolk within CHATTER_GAP_MS -- the square is
 *                       alive, never a choir.
 *
 * Sound only: nothing here may throw into its caller.  window.__btNpcVoices is
 * the tests' probe. */
import { cue } from '@/game/eventSounds.js';
import { earVol } from '@/game/hitSounds.js';

export const VOICE_CUES = ['npcVoice0', 'npcVoice1', 'npcVoice2', 'npcVoice3', 'npcVoice4'];
/* name -> [hum, pitch]: the hums by their own pitch (the cutter's notes:
   224, 169, 147, 207 and 273 Hz), each bro moved to suit him */
export const VOICE_OF = Object.freeze({
  'Mayor Bro': [2, 0.84],
  'Blacksmith Bro': [1, 0.8],
  'Diego': [3, 0.98],
  'Ace': [0, 1.06],
  'Lil Bro': [4, 1.32],
  'Beastmaster Bro': [2, 0.94],
  'Woodworker Bro': [1, 0.92],   /* v2.3.3510: the tour's two new townsfolk */
  'Farmer Bro': [3, 0.88],
});
export const CHATTER_K = 0.4;
export const CHATTER_R = 900;
export const CHATTER_GAP_MS = 2500;
/* the same bro is not heard twice in this long however you reach him */
const SPEAK_GAP_MS = 600;

const st = { speaks: 0, chatters: 0, chatterAt: 0, speakAt: Object.create(null), last: null };

/** His hum and pitch: the table's, else one picked from his name. */
export function voiceOf(name) {
  const n = typeof name === 'string' ? name : '';
  if (Object.prototype.hasOwnProperty.call(VOICE_OF, n)) return VOICE_OF[n];
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return [h % VOICE_CUES.length, 0.86 + ((h >> 3) % 7) * 0.05];
}

function say(name, k) {
  const v = voiceOf(name);
  return cue(VOICE_CUES[v[0]], k, v[1]);
}

/** You talk to `npc` (an npc or his name). */
export function npcSpeaks(S, npc) {
  try {
    const name = npc && typeof npc === 'object' ? npc.name : npc;
    if (!name) return false;
    const now = Date.now();
    if (now - (st.speakAt[name] || 0) < SPEAK_GAP_MS) return false;
    st.speakAt[name] = now;
    st.speaks++;
    st.last = { kind: 'speak', name, at: now };
    return say(name, 1);
  } catch (e) { return false; /* sound only */ }
}

/** A line of his popped up over him. */
export function npcChatter(S, npc) {
  try {
    if (!S || !S.player || !npc || !Number.isFinite(npc.x) || !Number.isFinite(npc.y)) return false;
    const now = Date.now();
    if (now - st.chatterAt < CHATTER_GAP_MS) return false;
    const dx = npc.x - S.player.x, dy = npc.y - S.player.y;
    if (dx * dx + dy * dy > CHATTER_R * CHATTER_R) return false;
    const ev = earVol(S, npc.x, npc.y);
    if (!(ev > 0.05)) return false;
    st.chatterAt = now;
    st.chatters++;
    st.last = { kind: 'chatter', name: npc.name, k: CHATTER_K * ev, at: now };
    return say(npc.name, CHATTER_K * ev);
  } catch (e) { return false; /* sound only */ }
}

/* QA probe, house style */
if (typeof window !== 'undefined') {
  window.__btNpcVoices = {
    st,
    voiceOf,
    consts: { VOICE_CUES, CHATTER_K, CHATTER_R, CHATTER_GAP_MS },
    reset: () => { st.speaks = 0; st.chatters = 0; st.chatterAt = 0; st.speakAt = Object.create(null); st.last = null; },
  };
}
