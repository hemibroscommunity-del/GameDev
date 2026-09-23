/* ═══ v2.3.2712: TIME OF DAY ═══
 *
 * Owner: "Can you make time of day by adding certain effects for that?
 * Maybe also subtle atmospheric effects."
 *
 * ONE CLOCK FOR EVERYONE, AND NO SERVER.  The phase is a pure function of
 * wall-clock time, so every client in the room computes the same dusk at the
 * same moment without a message on the wire -- a player who sees night while
 * their friend beside them sees noon would be a bug report, and a synced
 * value would be a new server field, a new cap and a deploy-order question
 * (CLAUDE.md "Deploy-order safety") for something that is purely a picture.
 * Phones keep their clocks within a second or two of each other; on a
 * forty-minute day that is invisible.
 *
 * It is DISPLAY ONLY.  Nothing in combat, spawning or the economy reads it,
 * so it can never be the reason two clients disagree about a fight.
 *
 * `S._dayNightCache` in effectsRenderer is an older, never-wired attempt at
 * this (nothing ever assigned it); it is left alone rather than revived --
 * a full-screen flat fill cannot light a lantern, which is most of what makes
 * a night read as night rather than as a dim screen.
 */

/* Forty minutes, dawn to dawn.  Long enough that a session sees one change
   rather than a strobe, short enough that someone who plays for an evening
   sees the whole cycle. */
export const DAY_CYCLE_MS = 40 * 60 * 1000;

/* Zones under the open sky.  The caves, the foundry, the sanctum and every
   dungeon have their own light and keep it: a dungeon that goes dark because
   it is night on the surface is a dungeon that got harder for no reason the
   player can see.
   v2.3.2716: + worldview.  The first cut left the world map out as "a map",
   and the owner walked out of a night-time town into broad daylight and back
   into night at Frost Ridge -- the one screen between every two outdoor zones
   is the one place a sun that jumps is impossible to miss.  It is outdoors;
   it takes the hour. */
const OUTDOOR = Object.create(null);
for (const z of ['town', 'worldview', 'meadow', 'ember', 'mist', 'verdant', 'frost', 'sky', 'radiant', 'farm_home']) OUTDOOR[z] = true;

export function zoneHasSky(zoneId, S) {
  if (S && S._inDungeon) return false;
  return !!(zoneId && OUTDOOR[zoneId]);
}

/* ── the day, as keyframes ──
   `mul` multiplies the whole world (1 = untouched); `lamp` is how strongly
   lanterns and fireflies show (0 by day).  Phase 0 is the first grey before
   sunrise.  Night is deliberately NOT black: this is played on a phone, often
   outdoors, and a monster you cannot see is not atmosphere, it is a bug.  The
   lantern round each player does the rest. */
const KEYS = [
  { p: 0.000, name: 'dawn',   mul: [0.62, 0.60, 0.76], lamp: 0.70 },
  { p: 0.050, name: 'dawn',   mul: [0.90, 0.80, 0.80], lamp: 0.25 },
  { p: 0.100, name: 'day',    mul: [1.00, 0.97, 0.93], lamp: 0.00 },
  { p: 0.160, name: 'day',    mul: [1.00, 1.00, 1.00], lamp: 0.00 },
  { p: 0.540, name: 'day',    mul: [1.00, 1.00, 1.00], lamp: 0.00 },
  { p: 0.610, name: 'golden', mul: [1.00, 0.90, 0.76], lamp: 0.00 },
  { p: 0.660, name: 'dusk',   mul: [0.80, 0.64, 0.72], lamp: 0.35 },
  { p: 0.710, name: 'night',  mul: [0.50, 0.54, 0.78], lamp: 1.00 },
  { p: 0.950, name: 'night',  mul: [0.50, 0.54, 0.78], lamp: 1.00 },
  { p: 1.000, name: 'dawn',   mul: [0.62, 0.60, 0.76], lamp: 0.70 },
];

/* Named phases for the preview override and QA -- the middle of each. */
export const NAMED_PHASES = { dawn: 0.03, morning: 0.2, day: 0.35, golden: 0.61, dusk: 0.665, night: 0.82 };

/* A manual phase for previews and QA: `?tod=night` (or dawn/day/golden/dusk,
   or a number 0..1) in the URL, or window.__btTod = 0.8 from the console.
   Read once per frame; a bad value is ignored, never thrown. */
function overridePhase() {
  if (typeof window === 'undefined') return null;
  const v = window.__btTod;
  if (typeof v === 'number' && isFinite(v)) return ((v % 1) + 1) % 1;
  if (typeof v === 'string' && Object.prototype.hasOwnProperty.call(NAMED_PHASES, v)) return NAMED_PHASES[v];
  if (overridePhase._url === undefined) {
    overridePhase._url = null;
    try {
      const m = /[?&]tod=([a-z0-9.]+)/i.exec(window.location.search);
      if (m) {
        const s = m[1].toLowerCase();
        if (Object.prototype.hasOwnProperty.call(NAMED_PHASES, s)) overridePhase._url = NAMED_PHASES[s];
        else if (isFinite(parseFloat(s))) overridePhase._url = ((parseFloat(s) % 1) + 1) % 1;
      }
    } catch (e) { /* no location */ }
  }
  return overridePhase._url;
}

export function dayPhase(nowMs) {
  const o = overridePhase();
  if (o != null) return o;
  return (((nowMs || Date.now()) % DAY_CYCLE_MS) + DAY_CYCLE_MS) % DAY_CYCLE_MS / DAY_CYCLE_MS;
}

const smooth = (t) => t * t * (3 - 2 * t);

/** The light at a phase: {mul:[r,g,b], lamp, name, phase}. */
export function lightingAt(phase) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (phase >= KEYS[i].p && phase <= KEYS[i + 1].p) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  }
  const span = b.p - a.p;
  const t = span > 0 ? smooth((phase - a.p) / span) : 0;
  return {
    mul: [0, 1, 2].map((k) => a.mul[k] + (b.mul[k] - a.mul[k]) * t),
    lamp: a.lamp + (b.lamp - a.lamp) * t,
    name: t < 0.5 ? a.name : b.name,
    phase,
  };
}

/* ── the breeze ──
   One slow wind for the whole world, shared by everything that drifts: the
   dust your feet kick up, the motes in the sun, the clouds' shadows.  Things
   that blow the same way read as weather; things that each pick their own
   direction read as noise.  Also a pure function of the clock, so it agrees
   across clients for free. */
export function windAt(nowMs) {
  const t = (nowMs || Date.now()) / 1000;
  const ang = 0.35 + Math.sin(t / 97) * 0.55 + Math.sin(t / 23) * 0.12;   /* mostly east-south-east, wandering */
  const speed = 14 + Math.sin(t / 41) * 5;                               /* world px per second: a breeze, not a gale */
  return { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed * 0.6, ang, speed };
}

/* Dev probe, house style. */
if (typeof window !== 'undefined') {
  window.__btTimeOfDay = () => {
    const ph = dayPhase(Date.now());
    const L = lightingAt(ph);
    return { phase: +ph.toFixed(4), name: L.name, lamp: +L.lamp.toFixed(2), mul: L.mul.map((v) => +v.toFixed(3)) };
  };
}
