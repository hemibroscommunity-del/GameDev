import React from 'react';

/* ═══ v2.3.3839: A BANNER THAT KEEPS ITS OWN CLOCK ═══
 *
 * The owner, on a laptop with a new character: "On desktop it doesn't force
 * you off the skateboard. It just has an invisible wall up if you're on
 * skateboard and try to go into no man's land."  The wall is the Mayor gate
 * (game/wheelHome.js wheelCommonsGate: until you have spoken to Mayor Bro you
 * stay inside the safe ground), and it DOES say so -- "Speak to Mayor Bro
 * first" in BroTown's warning banner -- but the banner was never seen.
 *
 * Its fade is worked out from Date.now() at render, and BroTown re-renders
 * only when something else changes: the banner was drawn ONCE per message, a
 * few ms after it was set, at its fade-in's first frame -- opacity ~0.04 on a
 * quick computer -- and stayed so, frozen, until the next message (mp-
 * skateboard's gate step measured it frozen between pushes on this box too).
 * The level-up burst met the same mistake in v2.3.2615 and drives itself off
 * its own animation frame (LevelUpBurstStack); this does the same for the
 * banner: while `msg` is younger than `ms`, it re-renders itself each frame
 * and calls `render`, which reads Date.now() as before; after, nothing.  (The
 * Mayor gate itself says why on its own card now, MayorGateCard.jsx; the
 * banner still carries the other warnings and the stat ticks.) */
export default function TimedBanner({ msg, ms, render }) {
  const [, setTick] = React.useState(0);
  const ts = msg && msg.ts;
  React.useEffect(() => {
    if (typeof ts !== 'number' || typeof requestAnimationFrame !== 'function') return undefined;
    let raf = 0;
    const step = () => {
      setTick((n) => n + 1);
      if (Date.now() - ts < ms) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ts, ms]);
  if (typeof ts !== 'number' || Date.now() - ts >= ms) return null;
  return render();
}
