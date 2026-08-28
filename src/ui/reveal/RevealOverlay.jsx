import React from 'react';
import { revealBus } from './revealBus.js';
import { QUALITY_COLOR, QUALITY_LABEL } from '../mobile/dash/common.js';
import { armorIconFor } from '@/rendering/gearVariants.js';
import { metalIconPath } from '@/rendering/traits/materialTints.js';

/* ═══ v2.3.1925: THE MYSTERY REVEAL ═══
 *
 * Owner: "the item becomes a silhouette with a question mark. You get to roll
 * again to see if it reaches the next tier. Once the roll is complete it's a
 * short celebration message. The item is identified in font color of its
 * rarity tier."
 *
 * GDD §4.6b.ii specifies this in detail and this follows its SHAPE — a
 * staged spin between the current floor and the escalation, decelerating to
 * discrete ticks — with two deliberate departures, both the owner's call:
 *
 *   TIMING.  The spec asks for ~9 seconds per stage (18s for an Elite).  The
 *   owner asked for "a short celebration", and this is a phone game whose
 *   loop is kill-loot-move: STAGE_MS is 2000, of which 1500 is the fast spin
 *   (~18 visible ticks at 12/sec, the spec's own tick rate) and 500 is the
 *   deceleration showing the spec's three discrete ticks.  The escalation
 *   still reads; nobody stands still for a third of a minute.
 *
 *   COLOURS.  The spec says silver / gold / prismatic.  The CODE already has
 *   a quality palette — QUALITY_COLOR, v2.3.1845 — and the bag and the equip
 *   card already draw rare in blue, elite in purple and godly in gold.  Two
 *   palettes for one ladder means the reveal and the inventory disagree about
 *   what an item is thirty seconds apart, so the code's wins.  (CLAUDE.md:
 *   the GDD is early thinking; code is the source of truth.)
 *
 * WHAT THIS IS NOT: a roll.  The grade was committed by the worker when the
 * item was minted and is already sitting in the loot pile — `ladder` is the
 * sequence the server tells this component to PLAY, and the last entry is the
 * answer.  §4.6b.ii makes the same point: an animation calibrated to land on
 * a pre-committed result and one showing live rolls are mathematically
 * indistinguishable, and only the first is safe to let a client draw.
 */

const STAGE_MS = 2000;      /* whole stage */
const SPIN_MS = 1500;       /* fast spin before the deceleration */
const TICK_MS = 1000 / 12;  /* §4.6b.ii's own 12 ticks/second */
const HOLD_MS = 1700;       /* the celebration, after the last tick lands */

/* Each stage cycles between the floor it has already reached and the grade it
   might escalate to.  Read off the ladder rather than hard-coded, so a future
   grade slots in without touching the animation. */
const NEXT_UP = { rare: 'elite', elite: 'godly', godly: 'godly' };

const CELEBRATION = {
  rare: 'A rare find!',
  elite: 'ELITE!',
  godly: 'GODLY.',
};

/* The item's own picture, silhouetted during the spin.  Armour resolves
   through the one armour art table; a weapon through the same metal rule its
   icon everywhere else uses.  Anything unmapped simply has no picture and the
   question mark stands alone — better than borrowing something else's art. */
function iconFor(r) {
  try {
    if (!r) return null;
    if (r.kind === 'armor') return armorIconFor('chest', r.mat);
    if (r.kind === 'legs') return armorIconFor('legs', r.mat);
    if (r.kind === 'weapon') {
      const base = r.itemType === 'greatsword' ? '/icons/items/great-sword.webp'
        : r.itemType === 'sword' ? '/icons/items/sword.webp'
          : r.itemType === 'bow' ? '/icons/items/bow.webp'
            : r.itemType === 'staff' ? '/icons/items/staff.webp' : null;
      return base ? metalIconPath(base, r.mat) : null;
    }
  } catch (e) { /* a missing picture is never worth breaking the ceremony */ }
  return null;
}

export const RevealOverlay = () => {
  const [item, setItem] = React.useState(null);
  /* stage index, the colour currently showing, and whether we have landed */
  const [stage, setStage] = React.useState(0);
  const [flash, setFlash] = React.useState('rare');
  const [done, setDone] = React.useState(false);

  /* Pull the next reveal whenever one arrives and nothing is playing. */
  React.useEffect(() => {
    const pump = () => {
      setItem((cur) => {
        if (cur) return cur;
        const next = revealBus.take();
        if (next) { setStage(0); setDone(false); setFlash('rare'); }
        return next || null;
      });
    };
    pump();
    return revealBus.subscribe(pump);
  }, []);

  /* One effect per STAGE: spin, decelerate, then either escalate or land. */
  React.useEffect(() => {
    if (!item || done) return undefined;
    const ladder = item.ladder || [];
    const target = ladder[stage];
    if (!target) return undefined;
    const floor = stage === 0 ? 'rare' : ladder[stage - 1];
    const up = NEXT_UP[floor] || 'godly';

    let alive = true;
    const t0 = Date.now();
    let timer = null;
    const step = () => {
      if (!alive) return;
      const t = Date.now() - t0;
      if (t >= STAGE_MS) {
        /* The stage lands on its target.  If the ladder continues, the next
           effect run picks it up; if not, this is the answer. */
        setFlash(target);
        if (stage + 1 < ladder.length) setStage(stage + 1);
        else setDone(true);
        return;
      }
      /* During the spin the flash is honest noise between the two grades in
         play; during the deceleration the ticks are discrete and slow. */
      setFlash(Math.random() < 0.5 ? floor : up);
      const decel = t > SPIN_MS ? 1 + ((t - SPIN_MS) / (STAGE_MS - SPIN_MS)) * 6 : 1;
      /* Clamped to the stage's own end, and this is not a nicety: the last
         decelerated tick is ~7x the base interval, so an unclamped schedule
         overshoots STAGE_MS by up to ~580ms PER STAGE.  A godly (two stages)
         then runs ~5.2s against the 4s this file documents — measured in
         mp-drops, which read the overlay at 4.4s and found it still
         spinning.  A duration constant the animation does not actually honour
         is worse than a slower one. */
      timer = setTimeout(step, Math.max(16, Math.min(TICK_MS * decel, STAGE_MS - t)));
    };
    timer = setTimeout(step, TICK_MS);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [item, stage, done]);

  /* Hold the result, then clear and let the queue advance. */
  React.useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => {
      setItem(null);
      setDone(false);
      setStage(0);
      /* Nudge the pump: another reveal may be waiting behind this one. */
      const next = revealBus.take();
      if (next) { setItem(next); setFlash('rare'); }
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [done]);

  if (!item) return null;
  const grade = done ? item.quality : flash;
  const hue = QUALITY_COLOR[grade] || '#B6C1BE';
  const icon = iconFor(item);

  return (
    <div
      data-tut="reveal-overlay"
      data-reveal-grade={done ? item.quality : ''}
      style={{
        position: 'fixed', inset: 0, zIndex: 9800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        /* Deliberately NOT a full scrim: the world keeps playing behind this
           and the player keeps moving.  A modal here would turn a 2-second
           flourish into 2 seconds of being unable to dodge. */
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '18px 26px',
        background: 'rgba(9, 14, 17, 0.82)',
        border: `2px solid ${hue}`,
        borderRadius: 14,
        boxShadow: `0 0 26px ${hue}66, 0 14px 30px rgba(4,7,9,.5)`,
        fontFamily: 'Source Sans 3, sans-serif',
        transition: 'border-color .08s linear, box-shadow .08s linear',
      }}>
        <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon && (
            <img
              src={icon} alt="" draggable={false}
              style={{
                width: 72, height: 72, objectFit: 'contain',
                /* The silhouette the owner asked for: the shape is legible,
                   the item is not.  Lifted at the reveal so the piece
                   arrives in its real colours on the same frame the grade
                   does. */
                filter: done ? 'none' : 'brightness(0) opacity(.55)',
                transition: 'filter .12s linear',
              }}
            />
          )}
          {!done && (
            <span style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 44, fontWeight: 900, color: hue,
              textShadow: '0 2px 6px rgba(0,0,0,.9)',
            }}>?</span>
          )}
        </div>

        <div style={{
          fontSize: done ? 17 : 15, fontWeight: 900, letterSpacing: '.04em',
          color: hue, textAlign: 'center', whiteSpace: 'nowrap',
          textShadow: '0 2px 6px rgba(0,0,0,.9)',
        }}>
          {done ? (CELEBRATION[item.quality] || 'A rare find!') : '? ? ?'}
        </div>

        {/* The item, named in its grade's colour — the owner's ask, and the
            only line that survives the animation. */}
        {done && (
          <div style={{ fontSize: 14, fontWeight: 800, color: hue, textAlign: 'center' }}>
            {QUALITY_LABEL[item.quality]} {item.name}
          </div>
        )}
      </div>
    </div>
  );
};
