/* ═══ v2.3.3462: THE TOWNSFOLK'S VOICES ═══
 *
 * The owner, 2026-10-18: "I have the rest of the sounds" -- among them a
 * recording of a man humming "hmm" and "ahh", for docs/SOUND-GAPS.md's "NPC
 * voice blips: speech bubbles, opening a conversation".  Five of its hums are
 * cut into one file (tools/audio/cut_owner_sounds.py, data/eventSounds.js
 * npcVoice0-4); each townsperson keeps one of them at a pitch of his own
 * (VOICE_OF), so Mayor Bro always sounds like Mayor Bro:
 *
 *   npcSpeaks(S, npc)   you talk to him -- his quest opens (QuestPanel), or
 *                       his window (Ace's flip, Diego's shop, the Pets page,
 *                       a keeper's building), or he has nothing for you --
 *                       and you take his quest (QuestPanel again: the offer
 *                       becoming the quest taken is a new subject): his hum,
 *                       in full.
 *
 * ═══ v2.3.3653: A TALK AND A QUEST TAKEN, NOTHING ELSE; LIL BRO HIS OWN ═══
 * The owner: "the "hmmm" sounds you have for NPCs should play when you begin
 * talking to someone or taking a quest (other than the lil bro). I'll get a
 * sound effect for him", and then his "hmm".  Until now a townsperson also
 * hummed whenever a line of his popped up over him as you walked past
 * (npcChatter, at 0.4 by distance): in town, with eight of them, one every few
 * seconds -- the hums the owner was hearing at no moment of theirs.  That is
 * gone; the lines still pop up, quietly.  Lil Bro speaks in the owner's
 * boy's "hmm" (LIL_BRO, the cue lilBroHmm), where he had the man's highest
 * hum pitched up 1.32x; a keeper opening his building now answers too.
 *
 * Sound only: nothing here may throw into its caller.  window.__btNpcVoices is
 * the tests' probe. */
import { cue } from '@/game/eventSounds.js';

export const VOICE_CUES = ['npcVoice0', 'npcVoice1', 'npcVoice2', 'npcVoice3', 'npcVoice4'];
/* name -> [hum, pitch]: the hums by their own pitch (the cutter's notes:
   224, 169, 147, 207 and 273 Hz), each bro moved to suit him */
export const VOICE_OF = Object.freeze({
  'Mayor Bro': [2, 0.84],
  'Blacksmith Bro': [1, 0.8],
  'Diego': [3, 0.98],
  'Ace': [0, 1.06],
  /* 'Lil Bro' was [4, 1.32], the high hum pitched up: his own since
     v2.3.3653 (LIL_BRO) */
  'Beastmaster Bro': [2, 0.94],
  'Woodworker Bro': [1, 0.92],   /* v2.3.3525: the tour's two new townsfolk */
  'Farmer Bro': [3, 0.88],
});
/* v2.3.3653: whose voice is his own recording, not one of the hums */
export const LIL_BRO = 'Lil Bro';
/* the same bro is not heard twice in this long however you reach him */
const SPEAK_GAP_MS = 600;

const st = { speaks: 0, speakAt: Object.create(null), last: null };

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
  if (name === LIL_BRO) return cue('lilBroHmm', k);   /* v2.3.3653: his own "hmm" */
  const v = voiceOf(name);
  return cue(VOICE_CUES[v[0]], k, v[1]);
}

/** You talk to `npc` (an npc or his name), or take his quest. */
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

/* QA probe, house style */
if (typeof window !== 'undefined') {
  window.__btNpcVoices = {
    st,
    voiceOf,
    consts: { VOICE_CUES, LIL_BRO, SPEAK_GAP_MS },
    reset: () => { st.speaks = 0; st.speakAt = Object.create(null); st.last = null; },
  };
}
