import React from 'react';
import LevelUpBurst from './LevelUpBurst.jsx';
import {
  liveLevelUpBursts, subscribeLevelUpBursts, pushLevelUpBurst, retireLevelUpBurst,
  LEVELUP_MAX_SLOTS,
} from './levelUpBursts.js';

/* ═══ v2.3.2615: SIDE BY SIDE ═══
 *
 * Owner: "It's possible it just overwrote the new combat skill level up
 * notification but I'd rather them both play side by side."
 *
 * It did overwrite it, and not because of anything about the art.  Every
 * level-up in the game lands in BroTown's one `levelUpMsg` useState — the
 * funnel v2.3.2591 deliberately branched on at the render so no trigger site
 * could be missed — and a single state cell written twice in one tick keeps
 * only the second write.  A prog3 level-up is exactly that: a trained skill
 * levelled AND the character level moved with it, in the same message, in the
 * same tick.  One of the two was always going to be lost.
 *
 * So this component is the render site now, and it holds SLOTS rather than a
 * message.  It takes work from two directions and that is on purpose:
 *
 *   `msg` (the prop)  — BroTown's levelUpMsg, still the catch-all.  Anything
 *                       that reaches the funnel and means "you levelled" gets
 *                       a slot here without its trigger site having to know
 *                       this file exists.  That property is what v2.3.2591 was
 *                       built around and losing it would be a step backwards.
 *
 *   the bus           — levelUpBursts.js, for the one case a single state cell
 *                       structurally cannot express: two notifications for one
 *                       event.  wsClient's prog3_level handler pushes the skill
 *                       and the character level through it.
 *
 * Dedup lives in the bus (by ts + kind + skill), so a message arriving down
 * BOTH paths mounts once.
 *
 * ═══ LAYOUT ═══
 *
 * One live burst renders exactly as it did before — full width, centred.  Two
 * split the viewport into two columns and each burst solves its own fit
 * against its column.  The column count is deliberately NOT recomputed down
 * to 1 the instant one of the two finishes: a burst that jumped back to
 * centre with 1.5s of its hold still to run would read as a glitch, so the
 * stack stays at two columns until it is completely empty.  It widens
 * immediately when a second arrives (that reads as making room) and narrows
 * only between celebrations.
 */
export default function LevelUpBurstStack({ msg }) {
  const [slots, setSlots] = React.useState(liveLevelUpBursts);
  React.useEffect(() => subscribeLevelUpBursts(() => setSlots(liveLevelUpBursts())), []);

  /* The funnel.  An effect rather than a render-time push because pushing
     notifies subscribers, and notifying during a render is a setState during
     a render of another component. */
  React.useEffect(() => {
    if (!msg) return;
    pushLevelUpBurst(msg);
  }, [msg && msg.ts, msg && msg.kind, msg && msg.skill]);

  /* Sticky column count — see the header.  Reset to 1 only on empty. */
  const colsRef = React.useRef(1);
  if (slots.length === 0) colsRef.current = 1;
  else if (slots.length > colsRef.current) colsRef.current = Math.min(LEVELUP_MAX_SLOTS, slots.length);
  const cols = Math.max(1, colsRef.current);

  if (slots.length === 0) return null;

  return (
    <>
      {slots.map((s) => (
        <LevelUpBurst
          key={s.seq}
          msg={s.msg}
          /* The column the bus assigned, not this list's index: the list
             compacts when the other slot retires and an index would move a
             still-playing burst across the screen. */
          col={s.col}
          cols={cols}
          onDone={() => retireLevelUpBurst(s.seq)}
        />
      ))}
    </>
  );
}
