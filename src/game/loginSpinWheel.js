/* ═══ v2.3.4295: THE LOGIN WHEEL -- the client's half (server/src/loginspin.js) ═══
 * No imports: node tests it.  The segments are the picture's own, measured
 * off assets/ui/daily-spin/wheel-bulbs.png (degrees clockwise from the top);
 * the worker rolls with exactly these spans and sends only the segment, the
 * client turns the wheel to land inside it.  MIRROR of LOGIN_SPIN.SEGS in the
 * worker (server/test/mirror-audit.test.mjs): change both together. */
export const LOGIN_SPIN_SEGS = Object.freeze([
  Object.freeze({ coins: 100, from: 4.2, to: 180.6 }),
  Object.freeze({ coins: 200, from: 180.6, to: 263.4 }),
  Object.freeze({ coins: 300, from: 263.4, to: 313.4 }),
  Object.freeze({ coins: 500, from: 313.4, to: 339.2 }),
  Object.freeze({ coins: 1000, from: 339.2, to: 355.3 }),
  Object.freeze({ coins: 10000, from: 355.3, to: 364.2 }),
]);
/* where the pointer's tip points, clockwise from the top (it sits a hair right of the hub in the art) */
export const LOGIN_SPIN_POINTER_DEG = 1.5;
export const LOGIN_SPIN_MS = 4400;     /* the launch to the stop; with the wind-up and the settle it is the sound's 4.15 s and a little: the clicks slow with the wheel */
export const LOGIN_SPIN_TURNS = 7;
export const LOGIN_SPIN_WINDUP_MS = 300, LOGIN_SPIN_WINDUP_DEG = 10, LOGIN_SPIN_OVER_DEG = 2.4, LOGIN_SPIN_SETTLE_MS = 280;
/** How many coins the win throws: scales with the prize; a hard cap (a phone's frame). */
export function loginSpinParty(coins) { return coins >= 10000 ? 56 : coins >= 1000 ? 26 : coins >= 300 ? 16 : 10; }

/** The wheel's total clockwise turn (degrees) that lands segment `idx` under
    the pointer, at a random spot inside it (`r` in [0,1)), after `turns` turns. */
export function loginSpinTarget(idx, r, turns) {
  const i = Math.max(0, Math.min(LOGIN_SPIN_SEGS.length - 1, Math.floor(Number(idx) || 0)));
  const s = LOGIN_SPIN_SEGS[i];
  const span = s.to - s.from;
  const a = s.from + span * (0.14 + 0.72 * Math.max(0, Math.min(1, Number(r) || 0)));
  const t = Math.max(0, Math.floor(turns === undefined ? LOGIN_SPIN_TURNS : turns));
  return 360 * t + (((LOGIN_SPIN_POINTER_DEG - a) % 360) + 360) % 360;
}
/** Which segment sits under the pointer when the wheel has turned `deg`. */
export function loginSpinSegAt(deg) {
  const a = (((LOGIN_SPIN_POINTER_DEG - deg) % 360) + 360) % 360;
  for (let i = 0; i < LOGIN_SPIN_SEGS.length; i++) {
    const s = LOGIN_SPIN_SEGS[i];
    if ((a >= s.from && a < s.to) || (a + 360 >= s.from && a + 360 < s.to)) return i;
  }
  return 0;
}
/** Eased stop: fast at once, slowing to nothing (1 - (1-t)^4). */
export function loginSpinEase(t) { const u = 1 - Math.max(0, Math.min(1, t)); return 1 - u * u * u * u; }

/* ── the double-or-nothing wheel (assets/ui/daily-spin/double-wheel.png) ──
   The coins half is the right half (0-180 deg clockwise from the top), the
   skull the left (180-360); the pointer's tip sits 1.3 deg right of the hub. */
export const LOGIN_DOUBLE_POINTER_DEG = 1.3;
export const LOGIN_DOUBLE_MS = 2800;
export const LOGIN_DOUBLE_TURNS = 4;
/** Total clockwise turn that lands the coins half (`win`) or the skull half
    under the pointer, at a spot `r` in [0,1) a margin away from the divider. */
export function loginDoubleTarget(win, r, turns) {
  const a = (win ? 12 : 192) + 156 * Math.max(0, Math.min(1, Number(r) || 0));
  const t = Math.max(0, Math.floor(turns === undefined ? LOGIN_DOUBLE_TURNS : turns));
  return 360 * t + (((LOGIN_DOUBLE_POINTER_DEG - a) % 360) + 360) % 360;
}
/** Which half sits under the pointer after `deg` turned: true = coins. */
export function loginDoubleWinAt(deg) {
  const a = (((LOGIN_DOUBLE_POINTER_DEG - deg) % 360) + 360) % 360;
  return a >= 0 && a < 180;
}

/* ── the window's bus ── */
const listeners = new Set();
let _st = { open: false, result: null, round: null, avail: false, known: false, note: null, refused: 0, seq: 0 };
const emit = () => { for (const fn of listeners) { try { fn(_st); } catch (e) { /* a dead listener must not eat the prize */ } } };
export const loginSpinBus = {
  get() { return _st; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  /** loginspin_state: may the account spin today? */
  state(p) { _st = { ..._st, known: true, avail: !!(p && p.avail), refused: p && p.safe === false ? Date.now() : _st.refused }; emit(); },
  /** The window opens (the host decided it is time). */
  open() { if (_st.open) return; _st = { ..._st, open: true, result: null, round: null, seq: _st.seq + 1 }; emit(); },
  close() { _st = { ..._st, open: false, avail: false }; emit(); },
  /** A short note on the bar (the greyed button's "Next free spin in 5h 12m"): held HERE, not in a
      component, so a re-mount of the bar cannot lose it; it clears itself. */
  note(text, ms) {
    const until = Date.now() + (ms || 3200);
    _st = { ..._st, note: { text, until } }; emit();
    setTimeout(() => { if (_st.note && _st.note.until <= Date.now() + 50) { _st = { ..._st, note: null }; emit(); } }, (ms || 3200) + 80);
  },
  /** loginspin_result: the spin landed; the worker HOLDS `pot` (`base` the prize, `can` a double is offered). */
  result(p) {
    if (!p || typeof p.idx !== 'number') return;
    _st = { ..._st, result: { idx: p.idx, base: Math.floor(Number(p.base) || 0), pot: Math.floor(Number(p.pot) || 0), k: Math.floor(Number(p.k) || 0), open: !!p.open, can: !!p.can, at: Date.now() }, avail: false };
    try { if (typeof window !== 'undefined') window.__btLoginSpin = _st.result; } catch (e) { /* probe only */ }
    emit();
  },
  /** loginspin_round: a double's outcome (win / lost), or the collect. */
  round(p) {
    if (!p || typeof p.pot !== 'number') return;
    _st = { ..._st, round: { win: !!p.win, lost: !!p.lost, collected: !!p.collected, replay: !!p.replay, pot: Math.floor(p.pot), k: Math.floor(Number(p.k) || 0), open: !!p.open, can: !!p.can, at: Date.now() } };
    try { if (typeof window !== 'undefined') window.__btLoginRound = _st.round; } catch (e) { /* probe only */ }
    emit();
  },
};
/* QA handle (states.mjs, mp-loginspin): the very call the host makes. */
try { if (typeof window !== 'undefined') window.__btLoginSpinBus = loginSpinBus; } catch (e) { /* probe only */ }

/** The words under a disabled SPIN / YES: the wheel only turns on safe ground. */
export const LOGIN_SPIN_UNSAFE_WORDS = 'Spin in a safe area';

/** "Next free spin in 5h 12m": the time to the worker's day boundary (the UTC day, dailyrewards.js dayOf). */
export function loginSpinNextWords(now) {
  const DAY = 86400000, t = typeof now === 'number' ? now : Date.now();
  const left = Math.max(60000, (Math.floor(t / DAY) + 1) * DAY - t);
  const h = Math.floor(left / 3600000), m = Math.ceil((left % 3600000) / 60000);
  const hh = m === 60 ? h + 1 : h, mm = m === 60 ? 0 : m;
  return 'Next free spin in ' + (hh > 0 ? hh + 'h ' : '') + mm + 'm';
}
