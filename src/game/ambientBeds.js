/* ═══ v2.3.3457: THE SEA, BROTOWN'S CROWD AND A FIRE, HEARD ═══
 *
 * The owner, 2026-10-18: "I have the rest of the sounds" -- among them three
 * beds for docs/SOUND-GAPS.md's list: sea surf ("the open sea and the
 * shallows: rivers and ponds are done"), a town crowd ("BroTown") and fire
 * crackling ("a building on fire, campfires").  Each is a seamless loop of
 * the owner's recording (tools/audio/cut_owner_sounds.py), played in the
 * Wheel the way the river is (game/waterAmbience.js): its own source on the
 * music bus, rising as you near what makes it and fading as you go --
 *
 *   sea    the nearest water drawn round you that is not a river or a pond
 *          (wheelTrial.wheelWaterAt on rings out to SEA_FAR, each hit asked
 *          waterAmbience.waterDistance), full within SEA_NEAR of it;
 *   crowd  BroTown's middle (the Wheel's map, hub.town): full within
 *          CROWD_NEAR, nothing past CROWD_FAR -- the town's gates stand about
 *          1,330-1,450 game px out, so the murmur thins along the streets and
 *          is gone on the commons;
 *   fire   the nearest fire burning -- a building (rendering/buildingFire.js
 *          burningNow, by its heat), your campfire, another player's -- full
 *          within FIRE_NEAR.
 *
 * Each share falls as the square between its near and far (the river's
 * curve).  The loudness is set against the river's at its bank (RIVER_VOL on
 * river-water.mp3's RMS, ownerSoundClips.js LOOP_REFS), BED_K of it.
 *
 * MEMORY (CLAUDE.md, "Memory is budgeted"): never in SFX_MANIFEST.  A bed's
 * loop is loaded the first time its share rises (BT_AUDIO.loadSample `amb-`,
 * decoded at 24 kHz mono: 0.6-0.9 MB each), stopped STOP_AFTER_MS after it
 * falls silent, and its buffer let go FREE_AFTER_MS after that, or at once
 * when you leave the Wheel.  `?nobeds` is the Wheel as it was.
 * window.__btBeds is the tests' probe. */
import { BT_AUDIO } from '@/data/index.js';
import { OWNER_LOOPS, LOOP_REFS } from '@/data/ownerSoundClips.js';
import { wheelMapInfo, wheelWaterAt } from '@/game/wheelTrial.js';
import { waterDistance, noteWaterMap, RIVER_VOL } from '@/game/waterAmbience.js';
import { burningNow } from '@/rendering/buildingFire.js';

export const SEA_NEAR = 180;
export const SEA_FAR = 900;
export const CROWD_NEAR = 650;
export const CROWD_FAR = 1500;
export const FIRE_NEAR = 140;
export const FIRE_FAR = 700;
/* water within this of a river's line or a pond's edge is that river's or
   pond's (the river has its own sound), not the sea's */
export const FRESH_PX = 140;
/* each bed's loudness at full share, as a share of the river at its bank */
export const BED_K = { sea: 1.15, crowd: 0.7, fire: 0.85 };
/* a campfire's crackle is a small fire's: this much of a burning building's */
export const CAMPFIRE_HEAT = 0.6;
const EVERY_MS = 250;
const STOP_AFTER_MS = 3000;
const FREE_AFTER_MS = 15000;
/* the sea is looked for on these rings round you, this many looks a ring */
const RINGS = [0, 70, 150, 250, 370, 510, 680, 880];
const RING_LOOKS = 16;

const BEDS = {
  sea: { clip: 'sea-surf' },
  crowd: { clip: 'town-crowd' },
  fire: { clip: 'fire-crackle' },
};
const st = { at: 0, off: null, seaD: null, crowdD: null, fireD: null, beds: Object.create(null) };
for (const id in BEDS) st.beds[id] = { k: 0, src: null, gain: null, ctx: null, quietSince: 0, stoppedAt: 0, loading: false };

function off() {
  if (st.off === null) {
    try { st.off = typeof location !== 'undefined' && /[?&]nobeds(?:[&=]|$)/.test(location.search); } catch (e) { st.off = false; }
  }
  return st.off;
}

const keyOf = (id) => 'amb-' + BEDS[id].clip;

/** A bed's volume at full share: BED_K of the river's loudness at its bank. */
export function bedVol(id) {
  const c = OWNER_LOOPS[BEDS[id].clip];
  return RIVER_VOL * BED_K[id] * Math.pow(10, (LOOP_REFS.river - c.rms) / 20);
}

function shareAt(d, near, far) {
  if (!(d < far)) return 0;
  if (d <= near) return 1;
  const k = 1 - (d - near) / (far - near);
  return k * k;
}

/** How far the nearest sea drawn round (x, y) is, game px (Infinity: none
 *  within SEA_FAR, or nothing laid there yet). */
export function seaDistance(x, y) {
  for (let r = 0; r < RINGS.length; r++) {
    const rad = RINGS[r];
    const n = rad === 0 ? 1 : RING_LOOKS;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r * 0.37;
      const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (wheelWaterAt(px, py) !== true) continue;
      if (waterDistance(px, py) < FRESH_PX) continue;
      return rad;
    }
  }
  return Infinity;
}

function nearestFire(S, x, y) {
  let best = Infinity, heat = 0;
  const look = (fx, fy, h) => {
    const d = Math.hypot(fx - x, fy - y);
    const eff = d / Math.max(0.15, h);   /* a hotter fire reaches further */
    if (eff < best) { best = eff; heat = h; }
  };
  try { for (const f of burningNow()) look(f.x, f.y, f.heat); } catch (e) { /* no fires module yet */ }
  const now = Date.now();
  const cf = S._campfire;
  if (cf && cf.zone === S.currentZone && !(cf.expiresAt < now)) look(cf.x, cf.y, CAMPFIRE_HEAT);
  if (S._peerCampfires && typeof S._peerCampfires.forEach === 'function') {
    S._peerCampfires.forEach((p) => { if (p && p.zone === S.currentZone && !(p.expiresAt < now)) look(p.x, p.y, CAMPFIRE_HEAT); });
  }
  return { d: best, heat };
}

function drop(b) {
  const s = b.src, g = b.gain;
  b.src = null; b.gain = null; b.ctx = null;
  try { if (s) s.stop(); } catch (e) { /* already stopped */ }
  try { if (s) s.disconnect(); } catch (e) { /* gone */ }
  try { if (g) g.disconnect(); } catch (e) { /* gone */ }
}

function free(id) {
  const b = st.beds[id];
  drop(b);
  b.stoppedAt = 0;
  try { delete BT_AUDIO._samples[keyOf(id)]; } catch (e) { /* nothing held */ }
}

function ensure(B, id) {
  const b = st.beds[id];
  if (b.src && b.ctx === B.ctx) return true;
  drop(b);
  const key = keyOf(id);
  const buf = B._samples && B._samples[key];
  if (!buf) {
    if (!b.loading && B.ctx) {
      b.loading = true;
      Promise.resolve(B.loadSample(key, OWNER_LOOPS[BEDS[id].clip].url)).then(() => { b.loading = false; }, () => { b.loading = false; });
    }
    return false;
  }
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
    b.src = src; b.gain = g; b.ctx = B.ctx; b.stoppedAt = 0;
    return true;
  } catch (e) { drop(b); return false; }
}

/** Once a frame from the game loop (it looks four times a second). */
export function tickAmbientBeds(S, now) {
  const t = now || Date.now();
  if (t - st.at < EVERY_MS) return;
  st.at = t;
  try {
    const B = BT_AUDIO;
    const want = { sea: 0, crowd: 0, fire: 0 };
    const live = !off() && S && S.player && S.currentZone === 'wheel' && !S._zoneLoading && B.ctx && !B.muted;
    if (live) {
      const P = S.player;
      const map = wheelMapInfo();
      if (map) noteWaterMap(map);
      st.seaD = seaDistance(P.x, P.y);
      want.sea = shareAt(st.seaD, SEA_NEAR, SEA_FAR);
      const T = map && map.hub && map.hub.town;
      st.crowdD = T ? Math.hypot(P.x - T.x, P.y - T.y) : null;
      want.crowd = T ? shareAt(st.crowdD, CROWD_NEAR, CROWD_FAR) : 0;
      const f = nearestFire(S, P.x, P.y);
      st.fireD = Number.isFinite(f.d) ? Math.round(f.d) : null;
      want.fire = Number.isFinite(f.d) ? shareAt(f.d, FIRE_NEAR, FIRE_FAR) * Math.min(1, 0.4 + f.heat) : 0;
    }
    for (const id in BEDS) {
      const b = st.beds[id];
      const k = want[id];
      b.k = k;
      if (!live) {
        /* out of the Wheel (or muted, or loading): let it all go at once */
        if (b.src || (B._samples && B._samples[keyOf(id)])) free(id);
        continue;
      }
      if (k <= 0.01) {
        if (b.src) {
          if (!b.quietSince) b.quietSince = t;
          try { b.gain.gain.setTargetAtTime(0, B.ctx.currentTime, 0.4); } catch (e) { /* the stop below */ }
          if (t - b.quietSince > STOP_AFTER_MS || b.ctx !== B.ctx) { drop(b); b.stoppedAt = t; }
        } else if (b.stoppedAt && t - b.stoppedAt > FREE_AFTER_MS) {
          free(id);
        }
        continue;
      }
      b.quietSince = 0;
      if (!ensure(B, id)) continue;
      b.gain.gain.setTargetAtTime(bedVol(id) * k, B.ctx.currentTime, 0.5);
    }
  } catch (e) { /* sound only: never into the game loop */ }
}

/* QA probe, house style (waterAmbience's __btWater). */
if (typeof window !== 'undefined') {
  window.__btBeds = {
    state: () => {
      const out = { seaD: st.seaD, crowdD: st.crowdD, fireD: st.fireD };
      for (const id in BEDS) {
        const b = st.beds[id];
        out[id] = { k: +b.k.toFixed(3), playing: !!b.src, held: !!(BT_AUDIO._samples && BT_AUDIO._samples[keyOf(id)]), vol: +bedVol(id).toFixed(4) };
      }
      return out;
    },
    seaDistance: (x, y) => seaDistance(x, y),
    consts: { SEA_NEAR, SEA_FAR, CROWD_NEAR, CROWD_FAR, FIRE_NEAR, FIRE_FAR, FRESH_PX, BED_K, STOP_AFTER_MS, FREE_AFTER_MS },
  };
}
