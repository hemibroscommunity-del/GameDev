/* ═══ v2.3.3791: THE SKATEBOARD, HEARD ═══
 *
 * The owner's "Drive Over Border" (freesound_community, Pixabay 82185; kept in
 * assets/sfx-source/2026-10-29/), cut by tools/audio/cut_owner_sounds.py into
 * public/audio/ambient/skate-roll.mp3: a SEAMLESS LOOP of the wheels rolling,
 * 4.65 s, its knocks over the cracks inside it (they come every 0.2-0.7 s
 * through the whole recording -- the board rolling on the town's stones), so
 * there is no separate "clack" for a push: the push is a foot, and the knocks
 * are already in the roll.
 *
 * WHEN: YOUR board only, while the worker has you on it (game/ride.js
 * isRiding) and you roll -- it rises as you move and falls as you stand still
 * on it; the instant the ride ends, for any reason (off the safe ground, a hit,
 * a swing, death, a zone change, the kill switch, a tap), it falls to nothing
 * in a tenth of a second and its source is stopped.  Other riders are not
 * heard: in a busy town a loop for every board would be a pile of noise, and
 * each one more decoded audio held.
 *
 * WHERE IT PLAYS: its own source on the music bus, as the ambient beds'
 * (game/ambientBeds.js) -- the Settings music slider sets it with the world's
 * other loops -- low under the music: ROLL_K of the river at its bank, by the
 * two files' measured loudness (ownerSoundClips.js OWNER_LOOPS, LOOP_REFS).
 *
 * MEMORY (CLAUDE.md, "Memory is budgeted"): never in SFX_MANIFEST.  Decoded at
 * 24 kHz mono (`amb-` keys, BT_AUDIO._lowRate: ~0.45 MB) when a board could
 * be ridden -- the board button's own rule, BroTown's safe ground with a
 * worker that carries boards -- so it is in before the first tap; let go
 * FREE_AFTER_MS after you leave that ground on foot, or at once out of the
 * world.  window.__btRideSound is the tests' probe. */
import { BT_AUDIO } from '@/data/index.js';
import { OWNER_LOOPS, LOOP_REFS } from '@/data/ownerSoundClips.js';
import { RIVER_VOL } from '@/game/waterAmbience.js';
import { isRiding, rideButtonWanted } from '@/game/ride.js';
import { rideGround } from '@/game/rideGround.js';

export const ROLL_CLIP = 'skate-roll';
export const ROLL_KEY = 'amb-' + ROLL_CLIP;
/* at full roll, as a share of the river at its bank: low under the music */
export const ROLL_K = 0.9;
/* how fast it rises and falls (Web Audio's time constants, s) */
const RISE_S = 0.15;
const FALL_S = 0.35;
const END_S = 0.04;
const EVERY_MS = 100;
const STOP_AFTER_MS = 1500;
const FREE_AFTER_MS = 20000;

const st = { at: 0, src: null, gain: null, ctx: null, loading: false, k: 0, riding: false, quietSince: 0, offSince: 0, plays: 0 };

/** The loop's volume at full roll. */
export function rollVol() {
  const c = OWNER_LOOPS[ROLL_CLIP];
  return RIVER_VOL * ROLL_K * Math.pow(10, (LOOP_REFS.river - c.rms) / 20);
}

function drop() {
  const s = st.src, g = st.gain;
  st.src = null; st.gain = null; st.ctx = null;
  try { if (s) s.stop(); } catch (e) { /* already stopped */ }
  try { if (s) s.disconnect(); } catch (e) { /* gone */ }
  try { if (g) g.disconnect(); } catch (e) { /* gone */ }
}

function free() {
  drop();
  st.offSince = 0;
  try { delete BT_AUDIO._samples[ROLL_KEY]; } catch (e) { /* nothing held */ }
}

function load(B) {
  if (st.loading || !B.ctx || (B._samples && B._samples[ROLL_KEY])) return;
  st.loading = true;
  Promise.resolve(B.loadSample(ROLL_KEY, OWNER_LOOPS[ROLL_CLIP].url)).then(() => { st.loading = false; }, () => { st.loading = false; });
}

function ensure(B) {
  if (st.src && st.ctx === B.ctx) return true;
  drop();
  const buf = B._samples && B._samples[ROLL_KEY];
  if (!buf) { load(B); return false; }
  try {
    const src = B.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    B._loopOverEdges(src, buf);
    const g = B.ctx.createGain();
    g.gain.value = 0;
    src.connect(g);
    g.connect(B._out('music'));
    src.start(0);
    st.src = src; st.gain = g; st.ctx = B.ctx; st.plays++;
    return true;
  } catch (e) { drop(); return false; }
}

/** Every frame from the game loop (it looks ten times a second; a ride's end
    is heard on the frame it happens). */
export function tickRideSound(S, now) {
  const t = now || Date.now();
  try {
    const B = BT_AUDIO;
    const riding = isRiding(S) && !!(S && S.player) && S.currentZone === 'wheel';
    /* the ride ended: down at once, whatever ended it */
    if (st.riding && !riding && st.gain && B.ctx) {
      try { st.gain.gain.setTargetAtTime(0, B.ctx.currentTime, END_S); } catch (e) { /* the stop below */ }
      st.quietSince = st.quietSince || t;
    }
    st.riding = riding;
    if (!riding && t - st.at < EVERY_MS) return;
    st.at = t;
    const inWorld = !!(S && S.player && S.currentZone === 'wheel' && !S._zoneLoading && B.ctx && !B.muted);
    if (!inWorld) { if (st.src || (B._samples && B._samples[ROLL_KEY])) free(); st.k = 0; return; }
    /* where a board could be ridden, the loop is decoded and waiting */
    const could = riding || rideButtonWanted(S, rideGround(S));
    if (could) { st.offSince = 0; load(B); } else if (!st.offSince) st.offSince = t;
    if (!riding) {
      st.k = 0;
      if (st.src && t - (st.quietSince || t) > STOP_AFTER_MS) drop();
      if (st.offSince && t - st.offSince > FREE_AFTER_MS && (B._samples && B._samples[ROLL_KEY])) free();
      return;
    }
    const P = S.player;
    const moving = Math.abs(P.vx || 0) > 0.05 || Math.abs(P.vy || 0) > 0.05;
    st.k = moving ? 1 : 0;
    if (!ensure(B)) return;
    st.quietSince = 0;
    st.gain.gain.setTargetAtTime(rollVol() * st.k, B.ctx.currentTime, moving ? RISE_S : FALL_S);
  } catch (e) { /* sound only: never into the game loop */ }
}

/* QA probe, house style (ambientBeds' __btBeds). */
if (typeof window !== 'undefined') {
  window.__btRideSound = {
    state: () => ({
      playing: !!st.src, k: st.k, riding: st.riding, plays: st.plays,
      gain: st.gain ? +st.gain.gain.value.toFixed(4) : 0,
      held: !!(BT_AUDIO._samples && BT_AUDIO._samples[ROLL_KEY]), vol: +rollVol().toFixed(4),
    }),
    consts: { ROLL_K, STOP_AFTER_MS, FREE_AFTER_MS },
  };
}
