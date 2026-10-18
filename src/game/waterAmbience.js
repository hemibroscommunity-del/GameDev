/* ═══ v2.3.3343: THE RIVER HEARD ON ITS BANKS ═══
 *
 * Owner, 2026-10-18: "Start adding the have ones" (docs/SOUND-GAPS.md:
 * "rivers, ponds and the sea make no sound").  river-water.mp3, a loop of
 * flowing water already decoded for fishing (SFX_MANIFEST), played only while
 * you fished.  Now in the Wheel it rises as you near the river or a pond and
 * fades as you walk away: full within RIVER_NEAR game px of the water's line,
 * nothing past RIVER_FAR, falling as the square in between (the hits' own
 * curve, hitSounds.earVol, a little wider: water is a big thing).
 *
 * WHERE THE WATER IS: the Wheel's map (wheelTrial.wheelMapInfo, built by the
 * ground worker): its `routes` of kind 'river' (the river's line, simplified)
 * and its `places` of kind 'pond' and 'falls'.  Not the ground under you --
 * the game lays all water as ONE material (WORLD-MAP-PIPELINE "The water's
 * own pictures"), so the sea and a river cannot be told apart there, and the
 * open sea's surf is a recording the game does not have yet.
 *
 * ITS OWN LOOP, not BT_AUDIO.startSfxLoop: that keys a loop by its sample,
 * and the fishing loop of this same sample is stopped every frame nobody
 * fishes (effectsRenderer), which would stop this one too.  While you fish,
 * this one is silent -- the fishing loop is the water then.  On the music
 * bus, as the Wind Dunes' wind is (the zone ambience's bus), so the Settings
 * music slider sets the world's ambience as one.  A loop that has been silent
 * a while is stopped, and one left on a context that was rebuilt is made
 * again on the new one.  window.__btWater is the tests' probe. */
import { BT_AUDIO } from '@/data/index.js';
import { wheelMapInfo } from '@/game/wheelTrial.js';

export const RIVER_NEAR = 140;
export const RIVER_FAR = 760;
/* at the water's edge: the fishing loop's 0.35, a touch under */
export const RIVER_VOL = 0.32;
/* a pond or falls is a point on the map: its water reaches this far round it
   -- Bro Pond is r 200 art px in plan.js `ponds` (300 game px), the falls'
   pool about half that */
const POND_R = { pond: 300, falls: 150 };
const EVERY_MS = 250;
const STOP_AFTER_MS = 3000;
const KEY = 'river-water';

const st = {
  src: null, gain: null, ctx: null,
  map: null, lines: [], ponds: [],
  at: 0, k: 0, d: null, quietSince: 0,
};

function geom(map) {
  if (st.map === map) return;
  st.map = map;
  st.lines = [];
  st.ponds = [];
  for (const r of (map && map.routes) || []) {
    if (r && r.kind === 'river' && Array.isArray(r.pts) && r.pts.length >= 4) st.lines.push(r.pts);
  }
  for (const p of (map && map.places) || []) {
    if (p && (p.kind === 'pond' || p.kind === 'falls') && Number.isFinite(p.x) && Number.isFinite(p.y)) st.ponds.push({ x: p.x, y: p.y, r: POND_R[p.kind] });
  }
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** How far (x, y) is from the nearest river or pond, game px (Infinity: none). */
export function waterDistance(x, y) {
  let d = Infinity;
  for (const pts of st.lines) {
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const s = segDist(x, y, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
      if (s < d) d = s;
    }
  }
  for (const p of st.ponds) {
    const s = Math.max(0, Math.hypot(x - p.x, y - p.y) - p.r);
    if (s < d) d = s;
  }
  return d;
}

function shareAt(d) {
  if (!(d < RIVER_FAR)) return 0;
  if (d <= RIVER_NEAR) return 1;
  const k = 1 - (d - RIVER_NEAR) / (RIVER_FAR - RIVER_NEAR);
  return k * k;
}

function drop() {
  const s = st.src, g = st.gain;
  st.src = null; st.gain = null; st.ctx = null;
  try { if (s) s.stop(); } catch (e) { /* already stopped */ }
  try { if (s) s.disconnect(); } catch (e) { /* gone */ }
  try { if (g) g.disconnect(); } catch (e) { /* gone */ }
}

function ensure(B) {
  if (st.src && st.ctx === B.ctx) return true;
  drop();
  const buf = B._samples && B._samples[KEY];
  if (!buf || !B.ctx) return false;
  try {
    const src = B.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = B.ctx.createGain();
    g.gain.value = 0;
    src.connect(g);
    g.connect(B._out('music'));
    src.start(0);
    st.src = src; st.gain = g; st.ctx = B.ctx;
    return true;
  } catch (e) { drop(); return false; }
}

/** Once a frame from the game loop (it looks four times a second). */
export function tickWaterAmbience(S, now) {
  const t = now || Date.now();
  if (t - st.at < EVERY_MS) return;
  st.at = t;
  try {
    const B = BT_AUDIO;
    let want = 0;
    const ex = S && S._extraction;
    const fishing = !!(ex && ex.skill === 'fishing');
    if (S && S.player && S.currentZone === 'wheel' && !S._zoneLoading && !fishing && B.ctx && !B.muted) {
      const map = wheelMapInfo();
      if (map) {
        geom(map);
        st.d = waterDistance(S.player.x, S.player.y);
        want = shareAt(st.d);
      }
    }
    st.k = want;
    if (want <= 0.01) {
      if (!st.src) return;
      if (!st.quietSince) st.quietSince = t;
      try { st.gain.gain.setTargetAtTime(0, B.ctx.currentTime, 0.25); } catch (e) { /* the stop below */ }
      if (t - st.quietSince > STOP_AFTER_MS || st.ctx !== B.ctx || B.muted) drop();
      return;
    }
    st.quietSince = 0;
    if (!ensure(B)) return;
    st.gain.gain.setTargetAtTime(RIVER_VOL * want, B.ctx.currentTime, 0.35);
  } catch (e) { /* sound only: never into the game loop */ }
}

/* QA probe, house style (hitSounds' __btHitSounds). */
if (typeof window !== 'undefined') {
  window.__btWater = {
    state: () => ({ playing: !!st.src, k: st.k, d: st.d, lines: st.lines.length, ponds: st.ponds.length }),
    distance: (x, y) => waterDistance(x, y),
    consts: { RIVER_NEAR, RIVER_FAR, RIVER_VOL },
  };
}
