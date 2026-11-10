/* ═══ v2.3.4364: THE WORKER'S CLOCK, READ ON THIS PHONE ═══
   The worker stamps a loot pile with ITS clock (the pile's `ts`, a death
   pile's `ownerOnlyUntil` and `expiry`), and the phone judged those stamps
   with its OWN Date.now().  A phone clock a fraction of a second fast asked
   for a death pile just before its minute opened, was told 'not-recipient'
   and hid the pile -- in No man's land that is the player's own bag -- and a
   phone two minutes fast cut its own death pile on its first frame (sweep
   2026-11-03, V22; review R2 W1.8: one root cause).

   The worker already puts its clock on every ping (server/src/tick.js
   _tickPingAndAfk, `{type:'ping', ts}`, every ~3 s), so this reads the
   difference from that: no wire change, no cap.  A ping's `ts` is the
   worker's time when it SENT, so `ts - phoneNow` on arrival is the true
   difference less the trip -- never more.  Every sample is a lower bound,
   and the largest of the last few is the one with the shortest trip: that
   is the estimate.  Erring on the low side reads the worker's clock a trip
   EARLY, i.e. the phone asks a little late, never early -- the safe side.

   No imports, so node tests it (server/test/loot-clock.test.mjs).  The farm
   keeps its own (farmBus.js `offset`, from farm_state's `now`); the trade
   countdown and the buffs may adopt this one later. */

export const WORKER_CLOCK = {
  /* samples kept: 5 pings is ~15 s, so a phone clock that is corrected
     forward is forgotten within that */
  KEEP: 5,
  /* a pile built on an estimate this far from the current one is moved */
  REBASE_MS: 250,
};

export function makeWorkerClock() {
  const samples = [];
  let off = 0;
  let known = false;
  return {
    /* a worker time `workerTs` arriving at this phone's `phoneNow` */
    sample(workerTs, phoneNow) {
      const w = Number(workerTs), p = Number(phoneNow);
      if (!Number.isFinite(w) || !Number.isFinite(p) || w <= 0) return false;
      samples.push(w - p);
      if (samples.length > WORKER_CLOCK.KEEP) samples.shift();
      let m = -Infinity;
      for (const s of samples) if (s > m) m = s;
      off = m;
      known = true;
      return true;
    },
    known() { return known; },
    /* worker minus phone, in ms (0 until a ping has come) */
    offset() { return known ? off : 0; },
    /* a worker time as a time on this phone's clock; null for none */
    toPhone(workerMs) {
      const n = Number(workerMs);
      if (!workerMs || !Number.isFinite(n)) return null;
      return n - (known ? off : 0);
    },
    /* the worker's time now, by this phone's clock */
    now(phoneNow) { return (phoneNow == null ? Date.now() : phoneNow) + (known ? off : 0); },
  };
}

/* A pile built before the first ping (a join's state_sync comes first), or
   on an estimate since bettered, is moved onto the current one.  Only the
   worker's own times move: a pile marks the estimate it was built on in
   `_wOff` (wsClient.js _buildServerPile), and a dropped item's windows came
   as time LEFT, already on this phone's clock (v2.3.3473), so only its `ts`
   moves. */
export function rebasePiles(piles, clock) {
  if (!Array.isArray(piles) || !clock || !clock.known()) return 0;
  const off = clock.offset();
  let n = 0;
  for (const l of piles) {
    if (!l || typeof l._wOff !== 'number') continue;
    const d = off - l._wOff;
    if (Math.abs(d) < WORKER_CLOCK.REBASE_MS) continue;
    if (l.ts) l.ts -= d;
    if (!l.dropped && !l._leftWire) {   /* v2.3.4383: windows sent as time left are already this phone's */
      if (l.expiry) l.expiry -= d;
      if (l.ownerOnlyUntil) l.ownerOnlyUntil -= d;
      if (l._askAgainAt) l._askAgainAt -= d;
    }
    l._wOff = off;
    n++;
  }
  return n;
}

/* The one clock every pile is read on. */
export const workerClock = makeWorkerClock();
