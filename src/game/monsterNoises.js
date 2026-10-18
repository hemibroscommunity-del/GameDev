/* ═══ v2.3.3337: THE MONSTERS' OWN NOISES ═══
 *
 * The owner, 2026-10-18, with four recordings:
 *   "You can use part of this 'growl and rawr' sound effect for the fire
 *    goblins."  "Use this 'rattling bones' sound effect for the skeleton form
 *    of the mummy as that monster noise."  "Use this sound for the slime
 *    monster noise."  "Use this sound for the snowman noise."
 * (cut by tools/audio/cut_monster_noises.py into public/sfx/monster/noise-*.mp3,
 * their levels in src/data/monsterNoiseClips.js.)
 *
 * The game had no monster noises -- a monster was heard only when it was hit
 * or died.  Now each of those four makes its noise:
 *   - WHEN IT NOTICES YOU: the moment it starts chasing you -- the edge the
 *     "!" over its head already marks (wsClient's `tg` transition to you,
 *     v2.3.2295), so the sound and the mark agree;
 *   - NOW AND THEN WHILE IT CHASES YOU: every CHASE_MIN_MS-CHASE_MAX_MS, at
 *     random, so a pack does not chant in time;
 *   - and the skeleton's rattle as a mummy SHEDS into one (monster_transform):
 *     its bones are what you hear coming apart.
 * A monster's noise is never more often than PER_MONSTER_MS, any two
 * monsters' never closer than GAP_MS (a pack that notices you at once is one
 * or two calls, not five), and each is heard by distance on the hits' own
 * curve (hitSounds earVol: full within 220 px, nothing past 1,150) -- the far
 * death, slam and blast rule, v2.3.3248.  Nothing is sent: what a monster is
 * doing is already on the wire.
 *
 * The other kinds have no recording yet; NOISE_OF is the one table to add one. */
import { earVol } from '@/game/hitSounds.js';
import { BT_AUDIO } from '@/data/index.js';

/** archetype -> its clip in MONSTER_NOISE_CLIPS.  Every name spelled out, and
    NEVER a variant's base archetype: the mummy, its skeleton, the fire goblin
    and the mire wisp are all `fodder` underneath (monsterVariants.js
    baseArchetype), and a fallback to fodder's slime bounce gave the mummy and
    the wisp the slime's noise. */
export const NOISE_OF = Object.freeze({
  fireGoblin: 'goblin-rawr',
  skeleton: 'skeleton-rattle',   /* the mummy's form below half health (monster_transform) */
  fodder: 'slime-bounce',        /* the plain slime (the Storm Peaks', the meadow's) */
  blueSlime: 'slime-bounce',     /* the Verdant Wilds' */
  mossSlime: 'slime-bounce',
  snowman: 'snowman-snarl',
});
export const PER_MONSTER_MS = 6000;
export const GAP_MS = 900;
export const CHASE_MIN_MS = 7000;
export const CHASE_MAX_MS = 14000;
const MIN_K = 0.04;   /* quieter than this is not worth a voice */

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/** The clip a monster calls with, or null. */
export function noiseOf(m) {
  const a = m && (m.archetype || m.type);
  if (!a || typeof a !== 'string') return null;
  return has(NOISE_OF, a) ? NOISE_OF[a] : null;
}

function alive(m) {
  return !!m && m.alive !== false && !(typeof m.curHp === 'number' && m.curHp <= 0);
}

/* Play one, if the limits allow: true when it played. */
function call(S, m, now, why) {
  const clip = noiseOf(m);
  if (!clip || !S || !alive(m)) return false;
  if (m._noiseAt && now - m._noiseAt < PER_MONSTER_MS) return false;
  if (S._monNoiseAt && now - S._monNoiseAt < GAP_MS) return false;
  const k = earVol(S, m.x, m.y);
  if (!(k >= MIN_K)) return false;
  m._noiseAt = now;
  S._monNoiseAt = now;
  m._noiseNext = now + CHASE_MIN_MS + Math.random() * (CHASE_MAX_MS - CHASE_MIN_MS);
  let played = false;
  try { played = !!BT_AUDIO.monsterNoise(clip, k); } catch (e) { /* sound only */ }
  noteNoise(S, { id: m.id, clip, why, k: Math.round(k * 100) / 100, at: now, played });
  return true;
}

/** The monster just started chasing you (wsClient's `tg` edge). */
export function monsterNoticed(S, m, now) {
  return call(S, m, now || Date.now(), 'notice');
}

/** A mummy just shed into its skeleton (monster_transform): its bones rattle
    whatever its last call was -- the change is the event. */
export function monsterShed(S, m, now) {
  const t = now || Date.now();
  if (m) m._noiseAt = 0;
  return call(S, m, t, 'shed');
}

/** Once a frame: the monsters chasing you call now and then. */
export function updateMonsterNoises(S, now) {
  const list = S && S.monsters;
  if (!list || !S.myId || !S.player) return;
  if (S._monNoiseAt && now - S._monNoiseAt < GAP_MS) return;
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (!m || m.tg !== S.myId || !alive(m)) continue;
    if (!m._noiseNext) { m._noiseNext = now + CHASE_MIN_MS * Math.random(); continue; }
    if (now < m._noiseNext) continue;
    if (call(S, m, now, 'chase')) return;
    m._noiseNext = now + 1000;   /* refused (too far, too soon): look again in a second */
  }
}

/* QA (mp-monsternoise): every call, the last 24 */
function noteNoise(S, e) {
  try {
    if (typeof window === 'undefined' || !window.__btProbe) return;
    const q = window.__btMonsterNoises || (window.__btMonsterNoises = []);
    q.push(e);
    if (q.length > 24) q.shift();
  } catch (err) { /* probe only */ }
}

/* QA (mp-monsternoise): the table and the two one-off calls, on a monster the
   scenario describes (a far one, a skeleton that just shed) */
if (typeof window !== 'undefined') {
  window.__btMonsterNoiseQA = {
    noiseOf,
    consts: { PER_MONSTER_MS, GAP_MS, CHASE_MIN_MS, CHASE_MAX_MS },
    notice: (m) => { const S = window._gameState && window._gameState.current; return S ? monsterNoticed(S, m) : null; },
    shed: (m) => { const S = window._gameState && window._gameState.current; return S ? monsterShed(S, m) : null; },
  };
}
