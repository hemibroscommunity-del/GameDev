/* ═══ v2.3.2610: TWO LEVEL-UPS CAN LAND AT ONCE, SO TWO CAN PLAY AT ONCE ═══
 *
 * Owner: "I'd rather them both play side by side and if it's combat level just
 * show the character portrait in the center of the new level up animation."
 *
 * ═══ WHY THIS IS A BUS AND NOT A SECOND useState ═══
 *
 * Every level-up in the game funnels into BroTown's single `levelUpMsg`
 * useState, and v2.3.2591 branched on `kind` at the render so no trigger site
 * could be missed.  That funnel is kept — it is still what catches a path
 * nobody remembered.  But it is a SINGLE slot written through a React setter,
 * and two writes in one tick are batched: the second msg wins and the first is
 * never rendered at all.  That is not a styling limit, it is the exact
 * "overwrote the new combat skill level up notification" the owner described,
 * and no amount of layout work fixes it from inside one state cell.
 *
 * A prog3 level-up is genuinely two events — a trained skill went up AND the
 * character level went up, because character level is the sum of the three
 * skill levels (src/data/prog3.js prog3CharLevel).  They arrive in the same
 * `prog3_level` message, in the same tick, and the owner wants to see both.
 * So the sites that raise two push them HERE, where a push is an append and
 * not an assignment, and the funnel keeps carrying everything else.
 *
 * ═══ WHY THE CAP IS TWO ═══
 *
 * 360px is the narrowest screen the game supports and the burst's own fit
 * solves against 86% of the viewport width.  Two columns already take the art
 * down to roughly half size; a third would either overlap the other two or
 * shrink all three past the point where the medallion's icon — the thing that
 * says WHICH skill — is readable.  The owner's constraint was explicit:
 * nothing pushed off-screen and nothing overlapping unreadably.  Two is what
 * 360 can hold with both captions intact.
 *
 * A third arriving while two play REPLACES the older slot rather than queueing
 * behind it.  Queueing was already rejected in v2.3.2591 for a good reason: a
 * ten-point Build spend would owe the player half a minute of overlay.  The
 * newest level is the truest state, and the slot that has been on screen
 * longest is the one that has already been read.
 */

/* Objects keyed by ids use Object.create(null) or Map (CLAUDE.md).  These are
   ARRAY slots keyed by position, so no id-keyed map is involved — but the
   dedup set below IS keyed by a timestamp that can arrive from the wire, so it
   is a Set rather than an object. */

export const LEVELUP_MAX_SLOTS = 2;

/* ═══ A SLOT IS A POSITION, NOT A QUEUE ENTRY ═══
 * `slots` is a FIXED-LENGTH array with holes, never a list that compacts.  A
 * burst's column is its index here, and if retiring the left one shifted the
 * right one down, a burst that still had 1.5s of hold left would hop across
 * the screen the moment its neighbour finished — the same glitch class as a
 * live re-centre, arriving by a different route.  A hole is refilled in place
 * by the next arrival instead. */
let slots = [null, null];
let seq = 0;
const listeners = new Set();
const seen = new Set();    /* msg keys already ingested, so the render-site
                              funnel and a direct push cannot double-mount one */

function emit() { for (const fn of Array.from(listeners)) { try { fn(); } catch (e) { void e; } } }

/* A msg is the same EVENT if it carries the same ts and the same medallion.
   prog3_level pushes two msgs built in the same tick, so they share a ts by
   construction — the kind is what separates them. */
function keyOf(msg) { return String(msg && msg.ts) + '|' + String(msg && msg.kind) + '|' + String((msg && msg.skill) || ''); }

export function pushLevelUpBurst(msg, nowMs) {
  if (!msg || (msg.kind !== 'combat' && msg.kind !== 'life' && msg.kind !== 'char')) return false;
  const k = keyOf(msg);
  if (seen.has(k)) return false;
  seen.add(k);
  /* Bounded: the game can run for hours and every level-up adds one. */
  if (seen.size > 64) {
    const it = seen.values();
    for (let i = 0; i < 32; i++) { const v = it.next(); if (v.done) break; seen.delete(v.value); }
  }

  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  /* ═══ THE SAME THING LEVELLING TWICE IS NOT TWO THINGS ═══
     Side by side is for a skill level and the character level that arrived
     WITH it — two different facts about one moment.  Woodcutting levelling
     again four seconds later is the same fact again, and v2.3.2591's answer to
     that was replace-and-restart: the newest level is the truest state.  It
     still is.  Without this a player gathering quickly would end up watching
     their own Woodcutting burst next to their own Woodcutting burst, which
     says nothing the one burst did not. */
  let at = slots.findIndex((s) => s && s.msg && s.msg.kind === msg.kind
    && (s.msg.skill || null) === (msg.skill || null));
  if (at < 0) at = slots.indexOf(null);
  if (at < 0) {
    /* Full: replace the burst that has been on screen longest — see the
       header.  It is the one that has already been read. */
    at = 0;
    for (let i = 1; i < slots.length; i++) if (slots[i].startedAt < slots[at].startedAt) at = i;
  }
  const next = slots.slice();
  next[at] = { msg: msg, startedAt: now, seq: ++seq, col: at };
  slots = next;
  emit();
  return true;
}

/* Called by the stack when a slot's animation has finished.  Cleared by `seq`
   rather than by index: the array can have been rewritten by a push between
   the burst ending and this landing, and clearing a position that now holds a
   DIFFERENT burst would blank a celebration mid-play. */
export function retireLevelUpBurst(slotSeq) {
  const at = slots.findIndex((s) => s && s.seq === slotSeq);
  if (at < 0) return;
  const next = slots.slice();
  next[at] = null;
  slots = next;
  emit();
}

/* The live bursts, in column order.  Holes are dropped; each entry carries the
   `col` it must render in. */
export function getLevelUpBursts() { return slots; }
export function liveLevelUpBursts() { return slots.filter(Boolean); }

export function subscribeLevelUpBursts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* Rigs only: start from a known-empty stack between cases. */
export function _resetLevelUpBursts() { slots = [null, null]; seen.clear(); emit(); }
