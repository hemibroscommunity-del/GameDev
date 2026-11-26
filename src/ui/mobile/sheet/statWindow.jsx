/* ═══ v2.3.6685: THE ATTRIBUTE PREVIEW, HOSTED BY EVERY PAGE THAT OPENS IT (card UI2-combat, step 4, PR 1) ═══
 *
 * The master specification's 4.2: "Preserve the existing attribute allocation
 * preview system. Selecting an attribute opens the existing preview rather
 * than replacing it with a new simple increment control."  This is that
 * preview, MOVED here whole from the Points window of sheet/HeroExpanded.jsx
 * (its Build section: spendFor, openStatInfo and the check that puts the
 * window up again after a Spend), so the Points window (`?ui2=0`, and the
 * Shared column until PR 2) and a weapon's page (sheet/WeaponPage.jsx) open
 * the SAME window: the stepper opening at 0, the before and after rows
 * (statPreview.js previewStatPoint), the DPS row, the replayed fight
 * (StatDemo), the lane tabs with each pool's count, Spend sending
 * prog3_allocate once a point, the window staying after it.  Not a line of
 * what it does is changed; what was the Build section's own (the character,
 * the open lane, the pools' counts, the stay ref) is handed in as `ctx`.
 *
 * ctx.readOnly (for step 9: another player's page): the window reads, with
 * no stepper, no Spend and no lane to pick (InfoPopup's `readOnly`). */
import React from 'react';
import { infoPopupBus } from '../infoPopupBus.js';
import { statInfo } from '../infoGlossary.js';
import { previewStatPoint } from './statPreview.js';
import { StatDemo, STAT_DEMO_KEYS } from './StatDemo.jsx';
import { act } from '@/game/actions.js';
import { DISPLAY_SCALE_K, getActiveWeapon, weaponForCat } from '../../../data/gameSystems.js';
import {
  PROG3_FADE_NOTE, PROG3_SKILL_META, prog3ActiveCat, prog3AtkPts, prog3Pts, prog3SharedSpendCat, prog3StatCap, prog3StatFrac,
} from '../../../data/prog3.js';
import { POINTS_ART_DIR, POINTS_ART_V } from '../../../data/pointsHeadArt.js';
import { firstSpendHint } from '../../../game/pointsTips.js';
import { pointsResetOn } from '../../../game/pointsReset.js';
import { SAY } from '@/data/say/heroExpanded.js';
import { say } from '@/game/say.js';

/* the Points window's lanes and their pictures (moved with the window: both read them) */
export const SHARED_LANE = { key: 'shared', label: say(SAY, 'heroExpanded.sharedLane'), shared: true };
export const POINT_LANES = ['sword', 'staff', 'bow']
  .map((k) => PROG3_SKILL_META.find((m) => m.key === k))
  .filter(Boolean)
  .concat([SHARED_LANE]);
export const POINTS_ICONS = Object.freeze({
  sword: `${POINTS_ART_DIR}sword.png?v=${POINTS_ART_V}`,
  staff: `${POINTS_ART_DIR}staff.png?v=${POINTS_ART_V}`,
  bow: `${POINTS_ART_DIR}bow.png?v=${POINTS_ART_V}`,
  shared: `${POINTS_ART_DIR}character.png?v=${POINTS_ART_V}`,
});

/* v2.3.3522: the points a stat holds -- a weapon stat in its lane, a shared
   stat in the shared pool -- as the Points window's spend reads them (the
   window that stays after Spend counts what landed by it) */
export function statPtsIn(R, st, laneCat) {
  if (!R || !st) return 0;
  return Number(st.atk ? prog3AtkPts(R, laneCat, st.key) : prog3Pts(R, st.key)) || 0;
}
/* v2.3.3522: how long the window that stays waits for the worker to spend
   every point sent before it is put up again with what did land (InfoPopup
   gives its button back a beat after, STAY_FALLBACK_MS) */
export const STAY_WAIT_MS = 3000;

/**
 * ctx  { R, buildCat, laneAvail(cat), sharedAvail, stayRef, readOnly, live() (the game's state now) }
 * Returns { spendFor(st, cat), openStatInfo(st, cat, spend, extra), stayCheck() }.
 */
export function statWindow(ctx) {
  const { R, buildCat, laneAvail, sharedAvail, stayRef } = ctx;
  const readOnly = !!ctx.readOnly;
  /* the game's state now, as the host hands it (never reached for here: the open hand, grand plan 5.7) */
  const live = typeof ctx.live === 'function' ? ctx.live : () => null;
  const n1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const n2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  /* ═══ v2.3.2222: THE ℹ️ WINDOW ═══
     Owner: "Small information ℹ️ next to the name.  Tapping it
     launches into a new window that describes its effect.  It
     also has a preview of what the effect does (exaggerated)."
     Replaces v2.3.1766's press-to-peek strip: the SAME
     previewStatPoint supplies the numbers (this stat now -> after
     one point, and the DPS that point buys), the glossary supplies
     the words, and StatDemo supplies the picture.  One popup for
     all of it, through the bus the Overview labels already use. */
  /* ═══ v2.3.2597: THE INFORMATION WINDOW *IS* THE CONFIRM ═══
     Owner: "having the confirmation window be the same as the
     informational window would be better.  It tells you what it does
     and asks you to confirm point at the bottom."

     The first cut of this merged the other way round — it bolted the
     glossary's body onto Prog3SpendConfirm — and that quietly LOST
     everything this window already had: the StatDemo scene, the
     crit-chance / crit-damage pair Luck buys, and the DPS now -> after
     row with the v2.3.2521 threshold and the `dpsNote` fallback.
     mp-statdemo and mp-statpeek caught it; they assert the scene and
     the DPS line, and neither survives a text-only confirm.
     Merging in the owner's own direction keeps all of it: InfoPopup
     already had an `action` slot rendering a gold button beside "Got
     it", which is precisely "asks you to confirm at the bottom". */
  /* ═══ v2.3.2684: ONE DEFINITION OF "SPEND THIS POINT" ═══
     The confirm window can now CHANGE which weapon the point goes
     to (the tab row the owner drew), which means the window has to
     be able to rebuild its own spend for the lane you picked --
     it can no longer just carry the one the cell handed it.  So the
     spend moves here, beside the window that uses it, and the cells
     call it too: one rule for what is blocked and what gets sent,
     instead of a copy per caller that can drift. */
  const spendFor = (st, cat) => {
    const pts = st.atk ? prog3AtkPts(R, cat, st.key) : prog3Pts(R, st.key);
    const cap = prog3StatCap(R, st.key);
    const avail = st.atk ? laneAvail(cat) : sharedAvail;
    /* ═══ v2.3.3034: NOT WHILE THE WORKER CANNOT HEAR YOU ═══
       Owner: "points in point stat allocation menu weren't getting
       allocated" -- the session's socket was gone (an idle logout,
       a dead pipe) and Spend closed this window and sent each point
       to nothing.  Asked when the window opens (a tap, so the
       reconnect it starts is the player's): the button stays and
       says why, as it does for a capped stat, and the session is
       brought back so the next tap spends. */
    const S0 = live();
    const ch0 = S0 && S0.channel;
    const offline = !!(ch0 && typeof ch0.isLive === 'function' && !ch0.isLive());
    let offlineWhy = null;
    if (offline) { try { offlineWhy = ch0.reconnectNow ? ch0.reconnectNow() : 'reconnecting'; } catch (_e) { offlineWhy = 'reconnecting'; } }
    return {
      blocked: offline
        ? say(SAY, offlineWhy === 'elsewhere' ? 'heroExpanded.spendElsewhere' : 'heroExpanded.spendReconnecting')
        : avail <= 0
        ? say(SAY, 'heroExpanded.spendNoPoints', { pool: st.atk ? ((PROG3_SKILL_META.find((k) => k.key === cat) || {}).label || say(SAY, 'heroExpanded.spendPoolLane')) : say(SAY, 'heroExpanded.spendPoolUnspent') })
        : pts >= cap ? say(SAY, 'heroExpanded.spendAtCap', { stat: st.label }) : null,
      /* ═══ v2.3.2695: SPEND SEVERAL AT ONCE ═══
         Owner: "Instead of one button for 'spend point' make it so
         you can add points more quickly using +/- buttons then
         confirm spend button to the right of it."
         The ceiling is whichever runs out first -- the points you
         have, or the room left under the stat's cap -- so the
         stepper can never offer a point the worker would refuse.
         The worker still spends ONE point per prog3_allocate
         (prog3.js _handleProg3Allocate) and still judges each one,
         so a batch is n ordinary spends sent back to back: no new
         wire type, nothing an older worker would not settle
         (rule 19), and a pool that drained mid-batch simply has
         its extra spends refused, exactly as a double tap was. */
      max: Math.max(0, Math.min(avail, cap - pts)),
      run: (n) => {
        const S2 = live();
        const R2 = S2 && S2.rpg;
        if (!S2 || !S2.channel) return;
        /* v2.3.3034: gone since the window opened -- send nothing
           into nothing; bring the session back instead */
        if (typeof S2.channel.isLive === 'function' && !S2.channel.isLive()) {
          try { if (S2.channel.reconnectNow) S2.channel.reconnectNow(); } catch (_e) { /* best effort */ }
          return;
        }
        const count = Math.max(1, Math.floor(Number(n) || 1));
        for (let i = 0; i < count; i++) {
          act('prog3_allocate', { stat: st.key, cat: st.atk ? cat : prog3SharedSpendCat(R2) });   /* v2.3.5191: through the action door (actions.js) */
        }
      },
    };
  };
  /* v2.3.3522: `extra.spent` -- the points the last Spend bought, for
     the window put up again after it (stayRef, above) */
  const openStatInfo = (st, cat, spend, extra) => {
    try {
      /* v2.3.2592: the row says WHICH lane it belongs to now (four are
         on screen at once); a shared row belongs to none and takes
         the weapon in hand for its numbers, as before. */
      const laneCat = st.atk ? (cat || buildCat) : prog3ActiveCat(R);
      /* v2.3.2597: infoKey first — a shortened label may collide with
         another stat's glossary entry (see prog3.js). */
      const info = statInfo(st.infoKey || st.label) || { title: st.label, body: say(SAY, 'heroExpanded.perPointBody', { perText: st.perText }) };
      /* v2.3.2695: the numbers follow the stepper -- rowsFor(n) is
         what n points buy, and the window asks again each time the
         count changes.  One point is what it opens on. */
      const rowsFor = (n) => {
        const pv = R ? previewStatPoint(R, st.key, laneCat, n) : null;
        /* The row carries the NUMBER and, for a percentage, its sign
           ("0.8% -> 1.2%", "40.0 -> 48.0"): the row's full unit is
           prose ("% less damage", " power") and it ran the Defense
           and Elemental rows off the card's right edge (390px
           captures).  The label names the stat and the rate line
           above the scene says the words, so the row need not. */
        /* v2.3.3050: a pool stat's pair is the pool's whole total in
           the units its bar shows (statPreview POOL_STAT) -- "28 -> 37",
           not the points' raw bonus "0.0 -> 48.0" */
        const fmt = (v) => (pv && pv.pool ? String(Math.round(v)) : st.pct ? n1(v * 100) + '%' : n1(v));
        const rows = [];
        if (pv) {
          rows.push({ label: st.key === 'luck' ? say(SAY, 'heroExpanded.rowCritChance') : info.title, now: fmt(pv.statNow), after: pv.capped ? null : fmt(pv.statAfter) });
          /* v2.3.2592: LUCK buys two things per point; the second half
             gets its own row so "what will my crit damage BE" is
             answered beside "what will my crit chance BE". */
          if (typeof pv.statNow2 === 'number') {
            rows.push({ label: say(SAY, 'heroExpanded.rowCritDamage'), now: '+' + n1(pv.statNow2 * 100) + '%',
              after: pv.capped ? null : '+' + n1(pv.statAfter2 * 100) + '%' });
          }
          /* v2.3.2695: a SHARED stat drops the DPS line (owner: "Remove
             the line about DPS on this window for all shared
             points") -- its point is not bought for any one weapon,
             so a DPS figure read off whatever you happen to hold was
             answering a question the window is not asking.  The
             three weapon lanes keep it; there it is the point. */
          if (!st.atk) { /* no DPS row */ } else if (typeof pv.dpsDelta === 'number') {
            /* ═══ v2.3.2521: TEST THE REAL FIGURE, NOT THE SHRUNK ONE ═══
               This 0.049 asks "is the gain smaller than the +0.1 this
               row would print" — a question about the UNSCALED DPS.
               v2.3.2520 divided calcDisplayDps by DISPLAY_SCALE_K and
               left the cut-off where it was, so it silently became
               "smaller than +0.5 real DPS" and four measured gains
               (sword/bow/staff Crit, bow Attack Speed: +0.07..+0.15)
               started reading "does not change damage" — the sheet
               telling the player a stat is worthless when it is not,
               about points they cannot take back.  Multiply back out
               so the threshold keeps its meaning at any k; the printed
               numbers stay scaled. */
            /* v2.3.2592: a stat whose JOB is not sustained damage
               (Range, Special, Move Speed) says what it does instead
               of "does not change damage" — beside RANGE that line is
               a bug report, not an answer.  The note rides the row's
               own metadata (dpsNote). */
            rows.push(pv.dpsDelta * DISPLAY_SCALE_K > 0.049
              ? { label: say(SAY, 'heroExpanded.rowDps'), now: n2(pv.dpsNow), after: n2(pv.dpsAfter), delta: '+' + n2(pv.dpsDelta) }
              : { label: say(SAY, 'heroExpanded.rowDps'), now: n2(pv.dpsNow), after: null, delta: st.dpsNote || say(SAY, 'heroExpanded.dpsNoChange') });
          } else {
            rows.push({ label: say(SAY, 'heroExpanded.rowDps'), now: '—', after: null, delta: say(SAY, 'heroExpanded.dpsNoWeapon') });
          }
        }
        return { rows, capped: !!(pv && pv.capped) };
      };
      const first = rowsFor(1);
      /* v2.3.2685: the same two words the title has always said, as
         parts, so each can be followed by its own icon (owner).
         v2.3.2695: ...and now only the FIRST of them.  Owner: "You
         can remove the 'shared' and profile picture after the name
         and icon of the stat" -- and the same for the three
         weapons.  The highlighted tab directly beneath already
         names the pool and draws its picture, so the title was
         saying it twice.  The plain `title` keeps the lane: it is
         the data-infopopup key three QA scenarios match on, and
         it is never drawn while titleParts is set. */
      const laneMeta = st.atk ? (PROG3_SKILL_META.find((k) => k.key === laneCat) || {}) : null;
      /* v2.3.3522: held in a name, so the Spend that stays knows its
         own window (stayRef) */
      const spentN = extra && extra.spent > 0 ? Math.floor(extra.spent) : 0;
      const payload = {
        title: info.title + (st.atk
          ? ' · ' + (laneMeta.label || '')
          : say(SAY, 'heroExpanded.titleSharedTail')),
        titleParts: [{ label: info.title, icon: st.iconSrc }],
        /* v2.3.2680: a stat that fades against stronger monsters says
           so, once, under its explainer. */
        body: info.body, note: st.fades ? (info.note ? info.note + ' ' : '') + PROG3_FADE_NOTE : info.note,
        perText: say(SAY, 'heroExpanded.eachPoint', { perText: st.perText }),
        /* ═══ v2.3.2696: LESS TO READ ═══
           Owner: "It's a lot of words but good information.  What's
           a better solution to make the user understand without
           reading a manual?"  A `hook` switches InfoPopup to the
           short layout: this six-word line where the paragraph was,
           the numbers big under it, a bar for the curve, and the
           paragraph + the fade rule folded into two chips.  Nothing
           is deleted -- body/note above are what the chips open. */
        hook: st.hook || info.body,
        chips: [
          ...(st.fades ? [{ key: 'fade', icon: '⚠\uFE0E', warn: true,
            label: say(SAY, 'heroExpanded.chipFades'), text: PROG3_FADE_NOTE }] : []),
          { key: 'how', icon: 'ⓘ', label: say(SAY, 'heroExpanded.chipDetails'),
            text: info.body + (info.note ? ' ' + info.note : '') },
        ],
        /* the curve, drawn: how far along its maximum the stat is now,
           and where n more points take it.  Each + fills a smaller
           slice than the last, which is "the first points count
           most" without the sentence.  Null (no bar) for a linear
           stat, which has no maximum to be a fraction of. */
        meterFor: (n) => {
          const p0 = st.atk ? prog3AtkPts(R, laneCat, st.key) : prog3Pts(R, st.key);
          const f0 = prog3StatFrac(st.key, p0);
          return f0 == null ? null : { now: f0, after: prog3StatFrac(st.key, p0 + Math.max(1, n || 1)) };
        },
        /* ═══ v2.3.2231: THE FIGURE HOLDS THE LANE'S WEAPON ═══
           Owner: "Maybe the combat primary skill they are viewing
           the stat demo through?"

           It used to hold getActiveWeapon(R) -- v2.3.1914's rule,
           which is right for the Equipment screen because that
           screen IS about what you have equipped.  This window is
           not: you open a lane by tapping its header (setBuildCat),
           independently of which weapon is in your hand, so a
           sword-carrying player reading the Bow lane got a scene
           captioned "· Bow" with a sword in it -- the picture
           contradicting its own heading.

           An ATTACK row belongs to a lane and takes that lane's
           weapon.  A BODY row (HP/Defense/Dodge/Stamina/Elem
           Power) belongs to no lane -- its points apply whatever
           you are holding -- so it keeps the active weapon and
           behaves exactly as before.

           Empty-handed when the lane's slot is empty, deliberately:
           you do not own a bow, and lending you the sword you DO
           own is the contradiction this fixes.  Bare hands is a
           state the scene already draws (a character before the
           tutorial sword). */
        /* v2.3.2592: only when a scene exists for the stat — StatDemo
           returns null otherwise, and the popup would still reserve
           the scene's margin around nothing. */
        /* v2.3.2979: the scene SIMULATES the fight now (owner: "real
           simulation of the hits against a slime monster"), so it
           needs the character and the lane, not just the picture of
           them -- statSim.js fights the slime with exactly the build
           the rows above describe, and the stepper's n. */
        demo: STAT_DEMO_KEYS.includes(st.key)
          ? <StatDemo stat={st.key} iconSrc={st.iconSrc}
              weapon={R ? (st.atk ? weaponForCat(R, laneCat) : getActiveWeapon(R)) : null}
              shield={!!(R && R.shield)}
              rpg={R} cat={st.atk ? laneCat : null} />
          : null,
        rows: first.rows, capped: first.capped,
        rowsFor: (n) => rowsFor(n).rows,
        /* The spend lives at the bottom of the explainer now.  When
           there is nothing to buy the button STAYS and refuses with
           the reason — the owner's "grayed out with that
           explanation" — because explaining is this window's first
           job and it must open on a capped stat too. */
        /* v2.3.2695: `stepMax` turns the button into the owner's
           [-] n [+] [Spend] row (InfoPopup); run(n) sends n. */
        action: spend ? {
          label: say(SAY, 'heroExpanded.spendButton'),
          blocked: spend.blocked,
          stepMax: spend.max,
          /* ═══ v2.3.3522: SPEND, AND STAY ═══
             The owner: "keep it on the menu confirmation window
             instead of closing it".  `stay` keeps the window up
             (InfoPopup); this records what was sent, from the
             live character, and this sheet's check puts the
             window up again with the new numbers (stayRef). */
          stay: true,
          run: (n) => {
            const count = Math.max(1, Math.floor(Number(n) || 1));
            const R0 = (live() || {}).rpg || R;
            stayRef.current = { st, cat, laneCat, n: count, at: Date.now(), was: statPtsIn(R0, st, laneCat), payload };
            spend.run(count);
          },
        } : undefined,
        /* v2.3.3522: what the last Spend bought ("✓ 2 points spent") */
        spentNote: spentN > 0 ? say(SAY, 'heroExpanded.spentNote', { n: spentN }) : null,
        /* v2.3.3551: and on a first spend -- everything placed is what
           this window just spent -- that the free reset gives them
           back (game/pointsTips.js), so trying a stat is safe */
        spentHint: spentN > 0 ? firstSpendHint(((live() || {}).rpg || R).prog3, spentN, pointsResetOn(live())) : null,
        /* ═══ v2.3.2684: THE LANE IS CHOSEN HERE NOW ═══
           Owner: "The button to change which of the 3 combat skills
           it's applied to ... is a tab in the confirm window.  This
           should be for every allocable stat."
           The grid's weapon cell stopped being a control in the same
           change, so this row is the ONLY way to aim a point at a
           weapon -- it has to appear whenever there is a point to
           aim, which is why it is built for a capped or broke stat
           too (you can tab off a lane with nothing left in it).
           Each tab carries that lane's spendable count, so the choice
           and the reason for it are the same glance.
           A BODY stat has no such choice -- its point comes out of
           the shared pool whatever you are holding -- so it gets the
           one Shared tab rather than three that would all do the
           same thing.  Keeping the row present for it is the "every
           allocable stat" half: the window always says which pool is
           paying. */
        lanes: {
          active: st.atk ? laneCat : 'shared',
          options: st.atk
            /* v2.3.3559: each tab wears the Points tab's own
               picture of its pool (the owner's art), so the window
               and the grid behind it show one sword, one staff,
               one bow and one character */
            ? POINT_LANES.filter((c) => !c.shared).map((c) => ({
                key: c.key, label: c.label, icon: POINTS_ICONS[c.key] || c.iconSrc, pts: laneAvail(c.key),
              }))
            /* v2.3.2695: owner -- "on the highlighted button instead
               of 'shared' just say 'Unspent Points'". */
            : [{ key: 'shared', label: say(SAY, 'heroExpanded.lanePickShared'), icon: POINTS_ICONS.shared, pts: sharedAvail }],
          onPick: st.atk ? ((k) => {
            /* v2.3.3051: the tab aims the WINDOW only; the grid behind
               it stays on the weapon in your hand (the owner's "show
               the point distribution based on your active equipped
               weapon").  It used to follow the tab -- and then sat on
               that lane until the sheet was closed. */
            openStatInfo(st, k, spend ? spendFor(st, k) : null);
          }) : null,
        },
        /* v2.3.2695: the "Melee points available: 2" line is gone
           (owner: "Remove the redundant 'shared points available'")
           -- the highlighted tab above carries the same number. */
      };
      /* v2.3.6685: another player's page reads the window, never spends from it (step 9) */
      if (readOnly) { payload.readOnly = true; payload.action = undefined; if (payload.lanes) payload.lanes = { ...payload.lanes, onPick: null }; }
      infoPopupBus.open(payload);
    } catch (e) { /* an explainer must never block a spend */ }
  };
  /* ═══ v2.3.3522: THE WINDOW AGAIN, AFTER THE WORKER ANSWERS ═══
     This render's check for a Spend that stayed (stayRef, at the
     top): run after the render, with this render's character.  Once
     the stat holds every point sent -- or after STAY_WAIT_MS, with
     whatever did land -- the window goes up again through the same
     openStatInfo, so it shows the new value, the next point's
     preview and the stepper at 1, plus "✓ n points spent".  The
     player closing it (or a lane tab replacing it) drops the wait. */
  const stayCheck = () => {
    const p = stayRef.current;
    if (!p) return;
    if (infoPopupBus.current() !== p.payload) { stayRef.current = null; return; }
    const got = Math.max(0, statPtsIn(R, p.st, p.laneCat) - p.was);
    if (got < p.n && Date.now() - p.at < STAY_WAIT_MS) return;
    stayRef.current = null;
    openStatInfo(p.st, p.cat, spendFor(p.st, p.cat), { spent: got });
  };
  return { spendFor, openStatInfo, stayCheck };
}
