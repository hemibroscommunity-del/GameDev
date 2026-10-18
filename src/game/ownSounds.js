/* ═══ v2.3.3445: YOUR BODY, HEARD ═══
 *
 * The owner, 2026-10-18: "I have the rest of the sounds" -- among them three
 * grunts and a heartbeat, for two rows of docs/SOUND-GAPS.md's list of what
 * still needed new recordings (the third grunt is the sprint's push-off, the
 * owner's own ask to another session: BT_AUDIO.SPRINT_PUSH):
 *
 *   hurtGrunt(S, dmg)   a blow that lands on you (the worker's, gameEvents.js
 *                       monster_attack and pvp_hit) is heard as YOU, not only
 *                       as the armour's clang or the bare thud: one of the
 *                       two grunts, never the same one twice running, at
 *                       most one in HURT_GAP_MS (a pack's blows are one
 *                       grunt), and none for a scratch under HURT_MIN_SHARE
 *                       of your health, a tick of a burn or poison, a blocked
 *                       or dodged blow (the callers' rule) -- so it means
 *                       something when it comes.
 *   tickHeartbeat(S,t)  under a quarter of your health your heart beats, one
 *                       lub-dub every HEART_MS, every HEART_FAST_MS under a
 *                       tenth.  It replaces monsterCombat.js's frame-counted
 *                       timer (every 40 frames, 25 under a tenth: a third
 *                       slower on a phone drawing 40 frames a second), whose
 *                       two beep()s played nothing since v2.3.1103.  Not
 *                       while dead, dying, loading or muted.
 *
 * Sound only: nothing here may throw into its caller.  window.__btOwnSounds
 * is the tests' probe. */
import { cue } from '@/game/eventSounds.js';

export const HURT_CUES = ['hurtA', 'hurtB'];
export const HURT_GAP_MS = 700;
export const HURT_MIN_SHARE = 0.02;
export const HEART_AT = 0.25;
export const HEART_FAST_AT = 0.10;
export const HEART_MS = 1000;
export const HEART_FAST_MS = 640;

const st = { hurtAt: 0, hurtLast: -1, hurts: 0, beatAt: 0, beats: 0, last: null };

/** A blow of `dmg` (game HP) landed on you.  The callers skip blocked,
 *  dodged and ticking blows. */
export function hurtGrunt(S, dmg) {
  try {
    const R = S && S.rpg;
    const now = Date.now();
    if (!R || now - st.hurtAt < HURT_GAP_MS) return false;
    const max = Number(R.maxHp) || 100;
    if (!(Number(dmg) >= max * HURT_MIN_SHARE)) return false;
    let i = Math.floor(Math.random() * HURT_CUES.length);
    if (i === st.hurtLast) i = (i + 1) % HURT_CUES.length;
    st.hurtLast = i;
    st.hurtAt = now;
    st.hurts++;
    st.last = { kind: 'hurt', cue: HURT_CUES[i], at: now };
    return cue(HURT_CUES[i]);
  } catch (e) { return false; /* sound only */ }
}

/** Once a frame from the game loop (BroTown, beside the river's). */
export function tickHeartbeat(S, now) {
  try {
    const R = S && S.rpg;
    const t = now || Date.now();
    if (!R || !S.player || S._dying || S._zoneLoading) return;
    const hp = Number(R.hp) || 0, max = Number(R.maxHp) || 0;
    if (!(hp > 0 && max > 0 && hp < max * HEART_AT)) { st.beatAt = 0; return; }
    const every = hp < max * HEART_FAST_AT ? HEART_FAST_MS : HEART_MS;
    /* the first beat a moment after you drop under the line, not on the
       frame of the blow (its own clang and grunt have that) */
    if (!st.beatAt) { st.beatAt = t + 350; return; }
    if (t < st.beatAt) return;
    /* the next beat from when this one was DUE, not from this frame: a phone
       drawing a few frames a second plays each on the frame after it is due,
       and the beat keeps its tempo instead of slowing by a frame a beat */
    st.beatAt = Math.max(st.beatAt + every, t + every / 2);
    st.beats++;
    st.last = { kind: 'beat', fast: every === HEART_FAST_MS, at: t };
    cue('heartbeat');
  } catch (e) { /* sound only */ }
}

/* QA probe, house style */
if (typeof window !== 'undefined') {
  window.__btOwnSounds = {
    st,
    consts: { HURT_CUES, HURT_GAP_MS, HURT_MIN_SHARE, HEART_AT, HEART_FAST_AT, HEART_MS, HEART_FAST_MS },
    reset: () => { st.hurtAt = 0; st.hurtLast = -1; st.hurts = 0; st.beatAt = 0; st.beats = 0; st.last = null; },
  };
}
