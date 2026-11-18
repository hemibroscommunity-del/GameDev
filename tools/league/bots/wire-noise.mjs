/* ═══ v2.3.6121: THE LEAGUE'S RUNG 2 -- THE SAME SCRIPT, WITH A PERSON'S NOISE (GRAND-PLAN 10.7; card LG PR 2) ═══
 *
 * Rung 1 (wire-script.mjs) with the noise a careful script author adds once
 * rung 1 is caught: every wait stretched by a random factor (a log-normal,
 * about +-15%), a breath now and then; the walk wobbling a pixel or two and
 * aimed somewhere on the vein, not its centre; a new gesture fingerprint
 * every strike, inside a phone's range; a grade mix of a good player (60%
 * perfect); the guard raised 180-420 ms after a wind-up; and a shuffle of
 * the feet every few swings.  It is still a script: it reads the worker's
 * messages and never a screen.
 *
 * Its dice are the wire's (`w.rand`), so a seeded run is the same every time. */
import { SESSIONS as ONE } from './wire-script.mjs';

export const RUNG = 2;
export const NAME = 'wire-noise';

export function personNoise(w) {
  const u = (a, b) => a + w.rand() * (b - a);
  const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += w.rand(); return (s - 3) / Math.sqrt(0.5); };
  return {
    time: () => Math.exp(0.15 * gauss()),
    aimOff: () => { const a = u(0, Math.PI * 2), r = u(4, 22); return { x: Math.cos(a) * r, y: Math.sin(a) * r }; },
    wobble: () => u(-1.6, 1.6),
    fp: () => ({ len: Math.round(u(300, 1400)), n: Math.round(u(40, 140)), dur: Math.round(u(1200, 2200)), ent: +u(0.06, 0.32).toFixed(3), tv: +u(2, 40).toFixed(2), vc: +u(0.06, 0.6).toFixed(3), h: Math.floor(w.rand() * 4294967296) >>> 0 }),
    grade: () => { const r = w.rand(); return r < 0.6 ? 'perfect' : r < 0.92 ? 'good' : 'ok'; },
    react: () => u(180, 420),
    shuffle: (n) => n % (3 + Math.floor(w.rand() * 4)) === 0,
    pause: () => (w.rand() < 0.08 ? u(800, 4000) : 0),
  };
}

const withNoise = (fn) => (w, opts = {}) => fn(w, { ...opts, noise: personNoise(w) });
export const SESSIONS = { harvest: withNoise(ONE.harvest), fight: withNoise(ONE.fight), cook: withNoise(ONE.cook) };
