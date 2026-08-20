import React from 'react';
/* v2.3.1797: the special lesson has to know whether the ACTIVE slot holds a
   weapon, which is not "does the player own one" — specialAttack() refuses
   with "No weapon equipped!" when the active slot is empty, and a coach mark
   asking for a gesture the game will refuse is worse than no mark.  Imported
   rather than reimplemented: it is four lines, but they encode the
   ranged/staff fallback to `weapon` and a copy here would drift. */
import { getActiveWeapon } from '@/data/gameSystems.js';

/* ═══════════════════════════════════════════════════════════════════
   QUEST COACH — the controls are taught by the questline (v2.3.1796)
   ═══════════════════════════════════════════════════════════════════
   Owner: "the controls need to be taught in the quest line by
   highlighting (flashing) the sequence you should be learning for
   equipping items, double tap the left joystick for swapping weapons,
   double tap and hold (maybe text above the right joystick and hold
   for a certain number of seconds while you rotate in a 360 degree
   circle)."
   ...and then (v2.3.1797): "I think mayor bro ought to require you to
   perform your special attack too during the tutorial."

   FIVE lessons, in the order they become usable: gear up, special attack,
   raise the shield, then — once the turn-in pays the bow and the staff —
   three weapons, and cycling between them.

   WHY THIS IS NOT ControlsTutorial.jsx.  That one already exists and is
   a good thing: a five-step guided tour, opened on demand, that dims the
   world and walks you through the HUD with Back/Next.  It is a MANUAL,
   and a manual is read once, before you have anything to use it on — the
   sword and shield are handed over by tut_1, minutes after that tour is
   over.  What the owner is describing is the opposite shape: no dim, no
   buttons, nothing to dismiss, one lesson at a time, appearing at the
   moment the questline has just given you the thing the lesson is about.
   So this overlay never blocks (pointerEvents:'none' throughout, and it
   never covers the control it points at), and it teaches at most one
   gesture at a time.

   HOW A LESSON KNOWS IT IS DONE.  By WATCHING GAME STATE, not by having
   hooks pushed into the gesture handlers.  The double-tap classifier in
   BroTown is 80 lines of tap-vs-drag timing that three separate features
   already read from; threading a "and also tell the coach" callback
   through it would put the tutorial inside the load-bearing path of the
   control itself.  Every lesson here has a state fact that is true only
   after the gesture worked — every weapon slot has been active, S._shieldUp
   went true, S._hasUsedSwipe went true — so the coach polls, and a player who finds
   the gesture some other way (the desktop keys, say) gets credit for it
   just the same.

   Lessons are ordered and shown ONE at a time; a lesson whose target is
   not on screen (the joysticks are display:none on desktop) is SKIPPED
   rather than blocking the ones behind it.  Completion is remembered in
   localStorage — per BROWSER, not per character, which is the right grain:
   the thing being learned is a thumb gesture, and a player who already knows
   how to raise a shield does not need telling again on their second bro.

   z-index 31 puts it above the dashboard and the joystick discs (30).  It
   sits OUTSIDE .brotown-wrap (see the mount site in BroTown.jsx for why it
   has to), which also puts it above the in-wrap modals — so "don't cover the
   quest dialogue" is enforced by the reachability rule below rather than by
   the z-ladder.  */

const LS_KEY = 'bt_coach_v1';

/* Lantern Slate: brass is focus/selection, and a coach mark IS focus. */
const BRASS = '#D8AA58';
const INK = 'rgba(13,21,26,.92)';

/* The block lesson's two conditions, both of which the owner named. */
const BLOCK_HOLD_MS = 2000;
const BLOCK_SECTORS = 8;
const FULL_CIRCLE = (1 << BLOCK_SECTORS) - 1;

function loadDone() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const o = raw ? JSON.parse(raw) : null;
    /* Object.create(null): keys are lesson ids and the file is
       player-writable, so a '__proto__' key must not reach a plain {}
       (CLAUDE.md rule 4). */
    const out = Object.create(null);
    if (o && typeof o === 'object') for (const k of Object.keys(o)) out[k] = !!o[k];
    return out;
  } catch (_e) { return Object.create(null); }
}
function saveDone(done) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(Object.assign({}, done))); } catch (_e) {}
}

/* Measure a live control.  A zero-size or missing element yields null and
   its lesson is skipped for this tick — the same degrade-to-fewer-callouts
   rule ControlsTutorial has used since v2.3.1205, and the reason the
   joystick lessons simply do not appear on a desktop pointer. */
function measure(anchors) {
  for (const a of anchors) {
    let el = null;
    try { el = document.querySelector(a.sel); } catch (_e) {}
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (!r || r.width < 8 || r.height < 8) continue;
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    if (!reachable(el, r, a.reach)) continue;
    return { left: r.left, top: r.top, width: r.width, height: r.height, body: a.body };
  }
  return null;
}

/* ── CAN A FINGER ACTUALLY REACH IT? ──
   This is the one rule that keeps the coach from covering the game, and it
   replaces what would otherwise be a list of every modal class in the repo
   (a list that goes stale the first time someone adds a panel).

   Since v2.3.1796 the overlay sits OUTSIDE .brotown-wrap, which is what
   makes it visible over the dashboard at all — but that same move puts it
   above the in-wrap modals, and a coach mark stamped across an open quest
   dialogue would be a straight downgrade.  So instead of asking "is a modal
   open", ask the question that actually matters: hit-test the middle of the
   control, and only draw if what answers is the control itself.  Every
   overlay in this UI puts a scrim over the screen (the .bt-inspect panels
   and ItemDetailPopup both do), so every one of them takes the mark down
   automatically, including ones not written yet.

   `reach` exists for the joysticks.  Their discs are pointerEvents:'none'
   by design — the visual is a picture and the touch is caught by the
   full-height [data-joyzone] layer underneath (TouchControls) — so the
   honest answer to "what would a finger hit here" is the zone, not the
   disc, and that still means the control is reachable. */
function reachable(el, r, reach) {
  let top = null;
  try { top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); } catch (_e) {}
  if (!top) return false;
  if (top === el || el.contains(top)) return true;
  if (reach) { try { if (top.closest(reach)) return true; } catch (_e) {} }
  return false;
}

/* ── The questline gate ──
   Only while Mayor Bro's tutorial chain is underway.  Once tut_4 is
   turned in the chain is over ("That's the tour. Everything past here is
   yours to find.") and the coach retires with it. */
function inTutorial(rpg) {
  const q = (rpg && rpg._quests) || null;
  if (!q) return false;
  if (q.tut_4 === 'turnedIn') return false;
  for (const id of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
    if (q[id] === 'active' || q[id] === 'turnedIn') return true;
  }
  return false;
}

/* ── The lessons ──
   `live(rpg)`  — is there anything to teach right now?
   `done(rpg)`  — has the player done it? (checked before `live`, so a
                  player who already knows the gesture is never nagged)
   `anchors`    — live-DOM targets, first REACHABLE one wins, each with the
                  wording that fits what it is pointing at. */
const LESSONS = [
  {
    id: 'equip',
    shape: 'rect',
    /* Two anchors, and the copy follows whichever one is on screen — on a
       phone the bag grid is already sitting on the dashboard, so the usual
       answer is the ITEM, and telling a player to "open your bag" while the
       item is visible in front of them is worse than saying nothing.
       (Note for anyone here next: ControlsTutorial's own bag step still
       lists [data-tut="dash-bag"] and .bt-dashboard-nav-button, and NEITHER
       is in the DOM any more — nothing passes the `tut` prop, and the nav
       moved to .bt-navrail.  That step has been silently dropping itself;
       it is not this PR's to fix, but do not copy those selectors.) */
    anchors: [
      { sel: '[data-tut="coach-gear"]', body: 'Tap it, then Equip.' },
      { sel: '.bt-navrail [aria-label="Bag"]', body: 'Open your bag and equip your gear.' },
    ],
    label: 'Gear up',
    /* tut_1 hands over a Copper Great Sword and a Pine Shield.  They land
       in the STASHES, not in your hands — which is the whole reason this
       lesson exists: a player who never opens the bag fights the starting
       quest bare-handed and has no idea why. */
    live: function (rpg) {
      return (rpg.weaponStash || []).length > 0 || (rpg.shieldStash || []).length > 0;
    },
    done: function (rpg) {
      return !!rpg.shield && !!(rpg.weapon || rpg.rangedWeapon || rpg.staffWeapon);
    },
  },
  {
    /* ═══ v2.3.1801: THE TURN-IN HANDS YOU TWO MORE WEAPONS ═══
       Owner: "When player turns in quest and receives bow and staff there
       should be a tutorial requiring you equip them all and double tap the
       left joystick to swap through the weapons and just a little message to
       use what you like best."
       Two lessons, because it is two things: put them ON, then learn the
       gesture that moves between them.  This is the first half. */
    id: 'equipAll',
    shape: 'rect',
    anchors: [
      { sel: '[data-tut="coach-gear"]', body: 'Equip the bow and the staff too.' },
      { sel: '.bt-navrail [aria-label="Bag"]', body: 'Open your bag — equip the bow and the staff.' },
    ],
    label: 'Three weapons',
    /* Only after the turn-in that pays them.  Before that a leftover in the
       stash is just a spare, and "equip them all" would be nonsense. */
    live: function (rpg) {
      const q = rpg._quests || {};
      if (q.tut_1 !== 'turnedIn') return false;
      return (rpg.weaponStash || []).length > 0;
    },
    done: function (rpg) {
      return !!rpg.weapon && !!rpg.rangedWeapon && !!rpg.staffWeapon;
    },
  },
  {
    /* The second half: the gesture, and the point of it.
       This REPLACES v2.3.1796's `swap`, which finished on a single change of
       slot.  One swap teaches that the gesture exists; the owner is asking for
       something else — that the player go round all three and pick.  So it is
       not done until every slot has been active, and the copy says why you
       would bother. */
    id: 'cycle',
    shape: 'circle',
    anchors: [{ sel: '.bt-joystick-zone', reach: '[data-joyzone="L"]',
                body: 'Double-tap to cycle. Use whichever you like best.' }],
    label: 'Swap weapons',
    /* Nothing to cycle BETWEEN until the second weapon is in hand — and this
       is exactly where Mayor Bro's completion line already says "Double-tap
       the LEFT joystick to switch weapons".  The mark lands on the same beat
       as the sentence. */
    live: function (rpg) {
      return !!rpg.weapon && !!(rpg.rangedWeapon || rpg.staffWeapon);
    },
    done: null,     /* watched live — see the activeSlot tracker below */
  },
  {
    id: 'special',
    shape: 'circle',
    anchors: [{ sel: '.bt-rjoy-base', reach: '[data-joyzone="R"]',
                body: 'A quick swipe on the right joystick.' },
              { sel: '.bt-rjoy-zone', reach: '[data-joyzone="R"]',
                body: 'A quick swipe on the right joystick.' }],
    label: 'Special attack',
    /* ═══ v2.3.1797: THE SPECIAL IS PART OF THE TUTORIAL ═══
       Owner: "I think mayor bro ought to require you to perform your special
       attack too during the tutorial."
       It belongs here for the same reason the block does: Mayor Bro's tut_1
       dialogue already teaches it in words ("A quick swipe on the right
       joystick triggers a special attack"), and the words were not enough.
       Ordered BEFORE the block to match the order he says them in, which is
       also the order they become usable — the swipe needs only a weapon in
       hand, so it is available the moment the gear lesson is finished.
       WORDING IS FIXED BY INCIDENT.  v2.3.1681 corrected the dialogue from
       "flick it and let go" after the owner reported it as wrong: the handler
       measures release SPEED, so "a quick swipe" is the gesture.  This line
       says the same thing in the same words on purpose — one string, one
       meaning, in the two places a player meets it. */
    live: function (rpg) { return !!getActiveWeapon(rpg); },
    done: null,     /* watched live — see the _hasUsedSwipe tracker below */
  },
  {
    id: 'block',
    shape: 'circle',
    anchors: [{ sel: '.bt-rjoy-base', reach: '[data-joyzone="R"]',
                body: 'Double-tap and HOLD — then turn all the way around.' },
              { sel: '.bt-rjoy-zone', reach: '[data-joyzone="R"]',
                body: 'Double-tap and HOLD — then turn all the way around.' }],
    label: 'Raise the shield',
    /* v2.3.1681b's dialogue line taught this in words and the owner still
       asked for it again here, which is the tell: the double-tap-and-HOLD
       is the least discoverable gesture in the game, and the fact that
       dragging DURING the hold aims the shield is invisible until someone
       shows you.  So the lesson is not "you pressed it" — it is the full
       gesture, held, and swept through every direction. */
    live: function (rpg) { return !!rpg.shield; },
    done: null,     /* watched live — see the block tracker below */
  },
];

export function QuestCoach(props) {
  const stateRef = props.stateRef;
  const [view, setView] = React.useState(null);
  /* A ref MIRROR of `view`.  The rAF loop is mounted once and must stay
     mounted, so it cannot read the state variable — its closure would
     hold the first render's `null` forever and re-set the same mark
     twelve times a second. */
  const viewRef = React.useRef(null);
  const doneRef = React.useRef(loadDone());
  const ringRef = React.useRef(null);
  const arcRef = React.useRef(null);
  /* Gesture trackers.  Refs, not state: they tick every frame and only
     their CROSSING of the finish line is worth a render. */
  /* Object.create(null): keyed by slot name, which is player-influenced data
     (CLAUDE.md rule 4). */
  const seenSlots = React.useRef(Object.create(null));
  const blockRef = React.useRef({ ms: 0, sectors: 0, last: 0 });

  React.useEffect(function () {
    let raf = 0, tick = 0, stop = false;
    /* The mark's own pulse is time-driven rather than a CSS animation so
       the ring and the progress arc stay in step with one frame's read of
       the game state — see the arc write below. */
    const step = function () {
      if (stop) return;
      raf = requestAnimationFrame(step);
      const S = stateRef && stateRef.current;
      const rpg = (S && S.rpg) || null;
      const now = Date.now();
      const done = doneRef.current;

      /* ── watch for the gestures, every frame, regardless of what is on
         screen: credit is for DOING it, not for doing it while being
         asked to. ── */
      if (rpg) {
        /* v2.3.1801: every slot the player has been in, not "has it changed".
           The owner asked for a cycle THROUGH the weapons, so the lesson is
           not finished until all of the ones they own have been active.
           Counted against what they OWN rather than a flat three: a player
           who somehow reaches this with two weapons can still finish it, and
           nobody is asked to select a slot that is empty. */
        const slot = rpg.activeSlot || 'melee';
        seenSlots.current[slot] = true;
        if (!done.cycle) {
          const need = ['melee'];
          if (rpg.rangedWeapon) need.push('ranged');
          if (rpg.staffWeapon) need.push('staff');
          if (need.length > 1 && need.every((k) => seenSlots.current[k])) {
            done.cycle = true; saveDone(done);
          }
        }
      }
      /* The special sets a permanent flag the moment one actually FIRES —
         specialAttack() writes it only after every refusal gate (dead,
         mid-harvest, cooldown, no weapon, no mana) has passed, so it cannot
         credit a swipe the game turned down. */
      if (S && S._hasUsedSwipe && !done.special) { done.special = true; saveDone(done); }
      if (S) {
        const b = blockRef.current;
        if (S._shieldUp) {
          if (b.last) b.ms += Math.min(120, now - b.last);
          b.last = now;
          if (typeof S._shieldAngle === 'number') {
            const sec = ((Math.round(S._shieldAngle / (Math.PI * 2) * BLOCK_SECTORS) % BLOCK_SECTORS) + BLOCK_SECTORS) % BLOCK_SECTORS;
            b.sectors |= (1 << sec);
          }
        } else {
          b.last = 0;
        }
        /* Both conditions, as asked: held long enough AND swept the whole
           circle.  A bitmask of 8 sectors is "360 degrees" in the only form
           a gesture can actually be checked against.
           Evaluated OUTSIDE the shield-is-up branch on purpose: the last
           sector of the sweep is very often recorded on the same frame the
           player lets go, and a check that only ran while the shield was up
           would leave the lesson one frame short of finished, on screen,
           after the player had done exactly what it asked. */
        if (!done.block && b.ms >= BLOCK_HOLD_MS && b.sectors === FULL_CIRCLE) {
          done.block = true; saveDone(done);
        }
      }

      /* ── pick and place the mark, ~12x a second ── */
      if ((tick++ % 5) !== 0) { paint(now); return; }
      if (!rpg || !inTutorial(rpg)) {
        if (viewRef.current) { viewRef.current = null; setView(null); }
        return;
      }
      let next = null;
      for (const L of LESSONS) {
        if (done[L.id]) continue;
        if (L.done && L.done(rpg)) { done[L.id] = true; saveDone(done); continue; }
        if (!L.live(rpg)) continue;
        const rect = measure(L.anchors);
        if (!rect) continue;          /* off screen / covered / desktop — skip, don't block */
        next = { id: L.id, label: L.label, body: rect.body, shape: L.shape, rect: rect };
        break;
      }
      const cur = viewRef.current;
      const same = (!next && !cur) || (next && cur && next.id === cur.id
        && next.body === cur.body
        && Math.abs(next.rect.left - cur.rect.left) < 2
        && Math.abs(next.rect.top - cur.rect.top) < 2
        && Math.abs(next.rect.width - cur.rect.width) < 2
        && Math.abs(next.rect.height - cur.rect.height) < 2);
      if (!same) { viewRef.current = next; setView(next); }
      paint(now);
    };
    /* The flash, written straight to the node.  Re-rendering React 60
       times a second to animate an opacity is the kind of thing that
       shows up as jank on the primary platform, and this overlay is on
       screen while the player is fighting. */
    const paint = function (now) {
      const el = ringRef.current;
      if (el) el.style.opacity = String(0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now / 300)));
      const arc = arcRef.current;
      if (arc) {
        const b = blockRef.current;
        let bits = 0;
        for (let i = 0; i < BLOCK_SECTORS; i++) if (b.sectors & (1 << i)) bits++;
        /* CLAMP EACH HALF SEPARATELY.  Clamping only the sum let a long
           hold in one direction fill the whole bar — the bar read "done"
           while the lesson correctly refused to finish, which is the worst
           thing a progress bar can do. */
        const p = Math.min(1, b.ms / BLOCK_HOLD_MS) * 0.5
                + (bits / BLOCK_SECTORS) * 0.5;
        arc.style.width = Math.round(p * 100) + '%';
      }
    };
    /* Dev probe, in the house style (__btWorldProps, __btStandInSkin): the
       two halves of the block gesture are invisible from the outside, and a
       test that could only see "the mark is gone" could not tell a lesson
       that completed from one that was never shown. */
    try {
      window.__btCoach = function () {
        const b = blockRef.current;
        let bits = 0;
        for (let i = 0; i < BLOCK_SECTORS; i++) if (b.sectors & (1 << i)) bits++;
        return { done: Object.assign({}, doneRef.current), heldMs: Math.round(b.ms),
                 sectors: bits, needMs: BLOCK_HOLD_MS, needSectors: BLOCK_SECTORS,
                 slots: Object.assign({}, seenSlots.current) };
      };
    } catch (_e) {}
    raf = requestAnimationFrame(step);
    return function () { stop = true; cancelAnimationFrame(raf); };
  }, [stateRef]);

  if (!view) return null;
  const r = view.rect;
  const pad = view.shape === 'circle' ? 6 : 5;
  const round = view.shape === 'circle' ? '50%' : 12;
  /* The card goes ABOVE the target when there is room and below when
     there is not — the right joystick sits at the bottom of the screen,
     which is precisely the "text above the right joystick" the owner
     asked for, and the bag button is down there too. */
  const above = r.top > 108;
  return React.createElement('div', {
    'data-coach': view.id,
    style: {
      position: 'fixed', inset: 0, zIndex: 31, pointerEvents: 'none',
    },
  },
    /* the flashing ring */
    React.createElement('div', {
      ref: ringRef,
      'data-coach-ring': view.id,
      style: {
        position: 'absolute',
        left: r.left - pad, top: r.top - pad,
        width: r.width + pad * 2, height: r.height + pad * 2,
        border: '3px solid ' + BRASS,
        borderRadius: round,
        /* DARK ON BOTH SIDES OF THE BRASS.  A plain brass ring was nearly
           invisible in the first screenshots: the left joystick's disc art
           is tan and the town ground it sits on is sand, so brass-on-brass
           for most of the circle.  The two 2px near-black rings (one inset,
           one outset) give the ring its own edge whatever it lands on,
           which is the same reason the joystick sprites carry their own rim.
           No CSS `filter` here — a filter compositing over the WebGL canvas
           is the documented cause of the iOS "static" (CLAUDE.md), and this
           overlay sits on top of the world by definition. */
        boxShadow: '0 0 0 2px rgba(5,10,13,.55), inset 0 0 0 2px rgba(5,10,13,.45),'
          + ' 0 0 22px rgba(216,170,88,.55)',
        pointerEvents: 'none',
      },
    }),
    /* the line that says what to do with it */
    React.createElement('div', {
      'data-coach-card': view.id,
      style: {
        position: 'absolute',
        left: Math.min(Math.max(8, r.left + r.width / 2 - 110), Math.max(8, window.innerWidth - 228)),
        /* Anchored by its BOTTOM when it sits above the control, because the
           card's height is not knowable here — it is one, two or three lines
           of wrapped copy plus an optional progress bar.  The first cut used
           a guessed 62px top offset and the three-line block card overlapped
           the very joystick it was pointing at. */
        top: above ? undefined : r.top + r.height + pad + 10,
        bottom: above ? Math.max(6, window.innerHeight - (r.top - pad - 10)) : undefined,
        width: 220,
        background: INK,
        border: '1px solid rgba(216,170,88,.45)',
        borderRadius: 12,
        padding: '7px 10px 8px',
        boxShadow: '0 10px 24px rgba(3,8,10,.45)',
        pointerEvents: 'none',
        fontFamily: 'Source Sans 3,sans-serif',
      },
    },
      React.createElement('div', {
        style: {
          fontSize: 10, fontWeight: 800, letterSpacing: '.1em',
          textTransform: 'uppercase', color: BRASS, marginBottom: 2,
        },
      }, view.label),
      React.createElement('div', {
        style: { fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: '#F4F0E7' },
      }, view.body),
      /* Only the block lesson has something to fill: the other two are a
         single action, and a progress bar that jumps 0 -> 100 tells the
         player nothing they did not already see happen. */
      view.id === 'block' && React.createElement('div', {
        style: {
          marginTop: 6, height: 4, borderRadius: 2,
          background: 'rgba(244,240,231,.14)', overflow: 'hidden',
        },
      }, React.createElement('div', {
        ref: arcRef,
        'data-coach-progress': '1',
        style: { width: '0%', height: '100%', background: BRASS, borderRadius: 2 },
      }))
    )
  );
}

export default QuestCoach;
