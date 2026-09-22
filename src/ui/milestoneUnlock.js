/* ═══ v2.3.2645: A MILESTONE GETS ITS OWN MOMENT ═══
 *
 * Owner: "Yes give milestone unlocks their own notification."
 *
 * ═══ WHY THIS EXISTS ═══
 *
 * A milestone is a CHARACTER-level rung (abilities.js MILESTONES: 4, 5, 6, 8,
 * 10) and the only thing that ever announced one was a clause at the front of
 * the level-up caption's gains line -- "Element Burst unlocked!" in 12.5px,
 * under a moving burst, for two seconds.  v2.3.2644 removed that line on the
 * owner's word ("way too tiny to read anyway"), which left the loudest thing a
 * level can buy with no announcement at all: a new ability BUTTON would simply
 * appear on the HUD, which is the exact accident v2.3.1733 added the clause to
 * prevent.  This is that announcement, made properly.
 *
 * ═══ AFTER THE BURST, NOT BESIDE IT ═══
 *
 * A milestone always arrives on the same `prog3_level` message as the skill
 * level that crossed it, so the naive wiring puts two celebrations on screen at
 * once -- which is precisely what the owner had removed one version earlier
 * (v2.3.2643, the character burst).  So this one is SEQUENCED: it opens as the
 * burst finishes (LEVELUP_TOTAL_MS) and gets the screen to itself.  Two rare
 * things in a row read as a reward chain; two at once read as clutter.
 *
 * ═══ ONLY THE RUNGS THAT ACTUALLY GIVE SOMETHING ═══
 *
 * Two of the five give NOTHING.  Rung 4 ('Sturdy Arm') and rung 8 ('Storm
 * Footing') are labels with no mechanical effect -- their `kind` was deleted at
 * v2.3.2252 and v2.3.2327 for the same reason both times: the celebration was
 * announcing an ability the player had owned since level 1.  Leaving the labels
 * behind means the wire still carries them, and a bigger, louder notification
 * would re-introduce that bug at higher volume -- "Sturdy Arm!" in 22px, for
 * nothing.  So a rung the ladder says is empty stays silent.
 *
 * The asymmetry when the ladder does NOT have the rung is deliberate and runs
 * the other way: a NEWER worker may add a rung this client's mirror has never
 * heard of, and a client cannot know that one is empty.  Unknown -> announce it
 * with the worker's own label; known-and-empty -> silence.  (Rule 19, in its
 * display costume: never suppress on the strength of a table the other side may
 * have moved past.)
 *
 * ═══ WHAT IT SAYS ═══
 *
 * The name, and WHAT YOU GOT -- read off the ladder rather than written out, so
 * a retune of MILESTONES cannot leave this file lying.  "+25% max stamina" is
 * derived from stamMult, not typed.
 */
import { MILESTONES } from '@/data/index.js';
import { LEVELUP_TOTAL_MS } from '@/data/levelUpBurst.js';

/* How long after the level-up event this opens.  Exactly the burst's own total
   run, IMPORTED and never retyped: a rig or a second copy of a timing constant
   is how v2.3.2591's pin fraction got cropped 17px off the truth (TRAPS §35). */
export const MILESTONE_DELAY_MS = LEVELUP_TOTAL_MS;
export const MILESTONE_HOLD_MS = 3600;   /* read it without hurrying, then go */
export const MILESTONE_FADE_MS = 420;

/* ═══ WHAT A RUNG GIVES YOU, IN WORDS ═══
 * Returns null when the rung is known to give nothing (see the header), which
 * is the signal not to show anything at all.
 *   level  the CHARACTER level just reached (prog3_level's charLevel)
 *   label  the worker's own name for it (prog3_level's milestone)
 *   pts    the worker's own count of points granted (prog3_level's bonusPoints)
 */
export function milestoneReward(level, label, pts) {
  const m = MILESTONES[level];
  const name = label || (m && m.label) || null;
  if (!name) return null;
  /* A rung this client has never heard of: trust the worker and say the name.
     Better a bare announcement than silence about a real unlock. */
  if (!m) return { name, gives: null };

  if (m.burst) {
    return { name, gives: 'A new ability button is live on your HUD' };
  }
  if (m.stamMult && m.stamMult !== 1) {
    /* Derived, not typed: retune the ladder and this sentence follows. */
    const pct = Math.round((m.stamMult - 1) * 100);
    if (pct > 0) return { name, gives: `+${pct}% max stamina` };
  }
  /* The worker's count wins over the mirror's -- it is the side that actually
     granted them (prog3.js _prog3GrantMilestones), and an old worker that
     minted a different number must not be contradicted on screen. */
  const n = (typeof pts === 'number' && pts > 0) ? pts : (m.points || 0);
  if (n > 0) {
    return { name, gives: `+${n} ${n === 1 ? 'point' : 'points'} to spend` };
  }
  /* Known rung, no effect -- rungs 4 and 8.  Say nothing. */
  return null;
}

/* ═══ THE BUS ═══
 * One slot, replace-and-restart, the v2.3.2591 posture: a milestone is rare
 * (five in a character's life) and the newest is the truest state.  No queue --
 * queueing a celebration is how a player ends up owed half a minute of overlay.
 */
let current = null;
const listeners = new Set();
let seq = 0;

function emit() { for (const fn of Array.from(listeners)) { try { fn(); } catch (e) { void e; } } }

/* Deduped by ts, because prog3_level can reach this more than once for one
   event (a reconnect replay, or a future second caller) and one unlock must
   not open two cards.  A Set rather than an object: the key comes off the
   wire (CLAUDE.md rule 4). */
const seen = new Set();

export function pushMilestone(msg) {
  if (!msg) return false;
  const reward = milestoneReward(msg.level, msg.label, msg.bonusPoints);
  if (!reward) return false;                     /* an empty rung -- stay quiet */
  const key = String(msg.ts) + '|' + String(msg.level);
  if (seen.has(key)) return false;
  seen.add(key);
  if (seen.size > 32) { const it = seen.values(); for (let i = 0; i < 16; i++) { const v = it.next(); if (v.done) break; seen.delete(v.value); } }
  current = {
    seq: ++seq,
    name: reward.name,
    gives: reward.gives,
    level: msg.level,
    /* WHEN to open, not when it happened: the component sleeps until the
       burst has finished (see the header). */
    openAt: (typeof msg.nowMs === 'number' ? msg.nowMs : Date.now()) + MILESTONE_DELAY_MS,
  };
  emit();
  return true;
}

export function getMilestone() { return current; }

export function clearMilestone(s) {
  if (!current || (s != null && current.seq !== s)) return;
  current = null;
  emit();
}

export function subscribeMilestone(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* Rigs only: start from a known-empty state between cases. */
export function _resetMilestone() { current = null; seen.clear(); emit(); }

/* ═══ v2.3.2645: THE AUTOTEST SURFACE (the v2.3.2123 idiom) ═══
   tools/qa/mp/mp-milestone.mjs drives REAL socket frames and then needs two
   things it cannot get from the DOM: a way back to a known-empty state between
   cases (six rungs are exercised in one session, and the bus dedups by ts), and
   the delay it should wait out -- read from the game rather than retyped, so a
   rig cannot quietly keep testing a cadence the game has moved past (TRAPS
   §35, the hand-copied pin fraction). */
if (typeof window !== 'undefined') {
  window.__btResetMilestone = _resetMilestone;
  window.__btMilestoneDelayMs = MILESTONE_DELAY_MS;
}
