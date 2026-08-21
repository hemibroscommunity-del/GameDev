import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';
import { combatLevelProgress, unspentPointsTotal, bestWeaponProgress } from './heroModel.js';
import { getActiveWeapon, calcDisplayDmgRange, calcDisplayDps } from '../../../data/gameSystems.js';
import { portraitStore } from './portraitStore.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { DASH_GAP } from './sheetGeometry.js'; /* v2.3.1649 */
import { playVw } from '../playViewport.js';

/* v2.3.1294 (ChatGPT round-4): the identity strip — one compact row
   that replaces the retired top-right world card.  Portrait (with the
   presence dot), name, level, a thin XP strip WITH exact progress, and
   gold aligned right.  Shared by Hero compact and Hero expanded so the
   "who am I" row is pixel-identical in both.
   Canonical name source: S.myName (the world card's source) — the old
   HeroExpanded read S.player.name and fell back to 'Bro' while the
   card said 'Anon'; one record now.

   v2.3.1311 (owner: "1097 / 500 XP is invalid while Lv 1"): the strip
   used to pair LIFETIME rpg.xp against the single-level xpRequired
   cost — two unrelated scales (level derives from skill points, not
   xp).  It now renders combatLevelProgress (heroModel): exact progress
   toward the next combat level from the same _buildProg machinery that
   actually grants levels; the numerator can never exceed the
   denominator.  Lifetime XP lives in Hero > Records.  Also this pass:
   40x40 portrait, wider name/level spacing, brighter XP text, coin +
   number as one unit (spec items). */
/* v2.3.1635 (owner: "option C" — a persistent sense of identity and
   progress): `band` opts INTO two extra chips for the persistent
   dashboard row.  A prop rather than a second component because the
   header rule above still holds — Hero compact and Hero expanded must
   stay pixel-identical, and they simply don't pass it, so their row is
   byte-for-byte what it was.
   The two chips are the ones that carry the feeling the owner asked
   for, and nothing else earned the width:
     - unspent build points: the only "you have progress waiting" signal
       on the band.  Hidden at zero, so it can only ever appear as good
       news and a fresh character sees a quiet row.
     - active weapon: the one piece of the retired LOADOUT column worth
       carrying full-time.
   Vitals are deliberately absent: HP/stamina/mana already live on the
   world HUD, which is where they matter during a fight.

   v2.3.1637 (owner: "put the dmg and DPS up on the character row above
   the dashboard columns"): DMG/DPS moves here off the EQUIPPED column,
   which frees that column's whole body for its six slots.  It takes the
   WEAPON CHIP's place rather than adding width: the chip named the
   weapon in text while the EQUIPPED column right below now shows that
   same weapon as art, and of the two the numbers are the thing you
   cannot get anywhere else at a glance.

   v2.3.1637 (owner: the rail "doesn't need its own button" for Hero):
   the PORTRAIT is the Hero button now.  It is the same v2.3.1294
   reasoning the ribbon's Hero icon used — nothing says "my character"
   better than the character — so the rail drops from seven buttons to
   six and each of the survivors gets more height.  Band mode only: in
   Hero's own sheet the portrait would open the screen you are on. */
export const IdentityStrip = ({ band = false, gutter = 0, trackW = null }) => {
  const [, force] = useState(0);
  useEffect(() => portraitStore.subscribe(() => force(v => v + 1)), []);

  const S = getState();
  const R = (S && S.rpg) || {};
  const level = R.level || 1;
  const lp = combatLevelProgress(R);
  /* v2.3.1311: CURRENT balance, not lifetime earned — the old fallback
     chain preferred _compStats.totalGoldEarned, which is the Records
     number ("Lifetime Gold"); showing it here is exactly the confusion
     the spec's naming rule exists to prevent. */
  const gold = R.coins || R.gold || 0;
  const portrait = portraitStore.get();
  /* v2.3.1635: band-only extras. */
  const unspent = band ? unspentPointsTotal(R) : 0;
  const wpn = band ? getActiveWeapon(R) : null;
  /* v2.3.1637: the numbers the EQUIPPED column used to carry.
     v2.3.1655: band mode no longer renders them — see the note by the
     retired chip below.  Kept for the non-band caller. */
  const dmgRange = wpn ? calcDisplayDmgRange(R, wpn) : null;
  const dps = dmgRange ? Math.round(calcDisplayDps(R, wpn) * 10) / 10 : 0;
  const vwNow = playVw();   /* v2.3.1715: the shell, not the window */

  /* v2.3.1649 (owner: "shift the player HUD data to the left and have the
     coin amount above the inventory preview slots ... shift the DPS number
     data to be aligned above the weapon").  In the BAND the strip stops
     being a flex row of chips and becomes TWO GRID ITEMS placed on the
     columns row's own tracks — track 1 over BAG, track 2 over EQUIPPED.
     The parent (BottomDashboard's top row) owns the track definition and
     puts the nav group in track 3.

     ALIGNMENT IS STRUCTURAL, NOT EYEBALLED.  "Above the bag" and "above the
     weapon" are promises about two different columns at every viewport
     width, and the only way to keep them is to share the geometry that
     places those columns (dashPanelWidths / weaponAnchorWidth).  A tuned
     left-offset would have been right at 390 and wrong at 360 and 430.

     Hero compact/expanded do NOT pass `band` and fall through to the
     unchanged flex row below — the pixel-identical rule at the top of this
     file is why this is a branch and not an edit. */
  if (band) {
    /* ═══ v2.3.1848: THE BAND IS A SUMMARY, NOT A HEAD ═══
     * Owner: "in the top dashboard where it shows the character head preview
     * I want to replace it with a compact summary like this" — a mockup of
     * three lines: NAME · LV n, an XP bar with a percentage, and a row of
     * DPS / DEF / HP / coins.  Then: "the XP bar will need to be shown based
     * on whatever weapon is closest to the next level with a little weapon
     * icon preceding it.  The coins amount can find a different area within
     * that space — whatever fits best."
     *
     * THE PORTRAIT PAYS FOR THE SECOND LINE.  40px of picture plus its gap
     * is 46px of a row with ~174 to give once the nav group has taken its
     * share, and the summary does not fit without them.
     *
     * WHAT THE PORTRAIT WAS DOING, and where each job went — this is the
     * part that breaks quietly if it is not enumerated:
     *   - it was the HERO BUTTON (v2.3.1637).  The whole summary block is
     *     that button now, which is a bigger target, not a smaller one.
     *   - it carried the UNSPENT-POINTS badge (v2.3.1649).  That moves onto
     *     the name line, right after the level, where it still reads as
     *     "progress waiting" and still shows the GLOBAL total.
     *   - it carried the PRESENCE DOT (connection status).  It becomes the
     *     dot before the name — same colour rule, same meaning, and it is
     *     the only place on the resting screen that says you are connected.
     * Drop any of the three and the band looks fine and is worse.
     *
     * ═══ v2.3.1849/1850: WHAT WAS CUT ═══
     * The first build followed the mockup exactly — three lines, with DPS /
     * DEF / HP / coins across the bottom — and the owner's read was "way too
     * busy", asking what gives the most useful information without overload.
     * Four labelled units at 8-11px inside 174px is the busyness; the fix is
     * fewer things, not smaller type.  DEF and HP came off first, then the
     * owner took the rest: "best might just be to remove the bottom row (all
     * the DPS, def, and hp data)".
     *
     * All three are gone, and the reasons run the same way:
     *
     *   HP could only ever be MAX hp here — live HP is on the world HUD an
     *   inch away, during the only moments it matters — and max hp changes a
     *   few times a level and never during play.  Permanent width for rare
     *   news.
     *
     *   DEF reads 0% for every character until their first armour, and it
     *   only moves on the Equipment screen, where the aggregate grid shows
     *   it beside everything it should be compared with.
     *
     *   DPS survived one round on the argument that it is the one combat
     *   number nowhere else at a glance.  True, and still not enough: it is
     *   a number you consult when CHANGING something, and changing something
     *   happens on the screen this whole block opens.  A stat you read on
     *   purpose does not need to be on screen always.
     *
     * What is left is two lines that are each about a thing that MOVES while
     * you play: who you are and what you can spend, and how close the
     * nearest weapon is to its next level.  Everything cut is one tap away.
     */
    const wp = bestWeaponProgress(R);

    return (
      <div
        role="button" aria-label="Hero" title="Hero"
        onPointerUp={(e) => { e.stopPropagation(); dashboardPanelBus.open('hero'); }}
        style={{
          flex: '1 1 auto', minWidth: 0, marginRight: gutter,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          cursor: 'pointer', touchAction: 'manipulation',
          fontFamily: 'Source Sans 3, sans-serif',
        }}>
        {/* ═══ v2.3.1851: ONE LINE — XP AND GOLD ═══
            Owner: "actually just put the gold and xp there.  You already see
            the name and level below the actual character."

            They do: the Hero panel's own header carries the name and the
            level beside the character, so the band was printing them a
            second time a few pixels away.  This is the same one-count rule
            that retired the world card into this strip at v2.3.1294 — the
            rule simply points the other way now that Hero shows what it
            shows.

            With two things left, the row is one line rather than two, and
            the freed height goes into making both READABLE at a glance
            instead of leaving a gap.

            The 6px presence dot stays.  It is not a readout — it is the only
            thing on the resting screen that says whether a 100%-server game
            is still talking to its server. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span aria-label={(S && S._realtimeStatus === 'connected') ? 'Connected' : 'Offline'}
            style={{
              flex: 'none', width: 7, height: 7, borderRadius: '50%',
              background: (S && S._realtimeStatus === 'connected') ? '#55B98A' : '#D95C54',
            }} />
          {/* v2.3.1852: THE NUMBERS, NOT A BAR.
              Owner: "instead of an xp bar just show the number over the
              number like 324/500."

              A bar answers "roughly how far", which is the same answer at
              320/500 and 340/500; the pair answers "how much more", which is
              the question you ask when you are deciding whether to do one
              more lap.  It is also cheaper: no track, no fill, no width to
              flex, so the row holds two readouts at a size worth reading.

              `prog` is clamped to `thresh` upstream in bestWeaponProgress —
              this can never print 540/500. */}
          {wp && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}
              title={`${wp.label} — ${wp.prog} / ${wp.thresh} XP to level ${wp.level + 1}`}>
              <img src={wp.iconSrc} alt="" draggable={false} style={{
                width: 15, height: 15, objectFit: 'contain', flex: 'none',
                pointerEvents: 'none',
              }} />
              <span style={{
                fontSize: 13.5, fontWeight: 800, color: COL.text,
                fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
              }}>{wp.prog.toLocaleString()}<span style={{
                fontWeight: 700, color: COL.muted,
              }}>/{wp.thresh.toLocaleString()}</span></span>
            </span>
          )}
          <span style={{
            flex: 'none', marginLeft: 'auto', display: 'inline-flex',
            alignItems: 'center', gap: 3,
          }}>
            <img src="/icons/popups/gold.webp" alt="" draggable={false} style={{
              width: 15, height: 15, imageRendering: 'pixelated', display: 'block',
              pointerEvents: 'none',
            }} />
            <span className="bt-coin-glimmer" style={{
              fontSize: 13.5, fontWeight: 800, color: COL.gold,
              fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
            }}>{Number(gold).toLocaleString()}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      /* v2.3.1642: gap 8 -> 6.  The nav group took ~103px off this row's
         left, and measured end-to-end the strip's content ran to 413px in
         a 390px viewport — gold, the last element, fell off the screen
         entirely.  Six pixels x3 gaps plus the tighter chip below buys it
         back without dropping anything the owner asked to see. */
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '2px 0 4px',
      /* v2.3.1643: in the BAND the strip must fill the width its row
         gives it — measured, stacking DMG/DPS freed ~50px and the row
         simply left it empty on the right, because this root is
         flex:0 0 auto and the wrapper is a flex container.  Hero's own
         sheet keeps the content-sized behaviour it has always had. */
      /* v2.3.1644 (owner: "make the xp bar half as wide and make the
         buttons fill in the extra space"): the strip is CONTENT-SIZED
         again in the band, not flex:1.  Growing to fill was right at
         v2.3.1643 when it was the only thing that could use the width;
         now the nav buttons take a deliberate share first (navButtonSize)
         and the strip fills what is left — which keeps the name and XP
         bar from being crushed the way a mutual flex fight crushed them
         on the first attempt at this. */
      flex: band ? '1 1 auto' : '0 0 auto',
      minWidth: 0,
      fontFamily: 'Source Sans 3, sans-serif',
    }}>
      {/* Portrait + presence dot (connection status — lived on the old
          world card; the identity strip keeps it).
          v2.3.1637: in the band it is also the Hero button. */}
      <div
        role={band ? 'button' : undefined}
        aria-label={band ? 'Hero' : undefined}
        title={band ? 'Hero' : undefined}
        onPointerUp={band ? (e) => { e.stopPropagation(); dashboardPanelBus.open('hero'); } : undefined}
        style={{
          position: 'relative', width: 40, height: 40, flexShrink: 0,
          cursor: band ? 'pointer' : 'default', touchAction: band ? 'manipulation' : undefined,
        }}>
        <img
          src={portrait || (S && S.myAvatar) || '/icons/ui/profile.webp?v=2.3.128'}
          alt="Portrait"
          draggable={false}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', imageRendering: 'pixelated',
            borderRadius: 8, userSelect: 'none', pointerEvents: 'none',
          }}
        />
        <span style={{
          position: 'absolute', right: -2, bottom: -2,
          width: 7, height: 7, borderRadius: '50%',
          background: (S && S._realtimeStatus === 'connected') ? '#55B98A' : '#D95C54',
          border: '2px solid #202C32',
        }} />
      </div>
      {/* Name · Lv + XP strip with exact progress. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, minWidth: 0 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            minWidth: 0,
          }}>{(S && S.myName) || 'Anon'}</span>
          {/* v2.3.1648 (owner: "the slots and info displayed currently don't
              meet a minimum size where users who can't see at smaller sizes
              struggle with it"): every band-mode readout goes up a step.
              BAND ONLY — Hero compact/expanded must stay pixel-identical to
              each other (the header rule at the top of this file), and they
              pass no `band`, so their row is unchanged. */}
          <span style={{ flex: 'none', fontSize: band ? 12 : 11, fontWeight: 600, color: COL.text2 }}>Lv {level}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <div style={{
            /* v2.3.1644 (owner): half its old width.  It was flex:1 and
               ate ~90px of the row for a 4px-tall progress hint; 44 still
               reads as a bar and the exact numbers sit right beside it. */
            flex: 'none', width: 40, height: 4, borderRadius: 2,
            background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.08)',
            overflow: 'hidden',
          }}>
            <div style={{ width: `${Math.min(100, (lp.prog / lp.thresh) * 100)}%`, height: '100%', background: '#8AA9F9' }} />
          </div>
          {/* v2.3.1644: the " XP" suffix is dropped.  With the bar
              halved and the nav buttons taking their share, this column
              is ~86px and "0 / 455 XP" needed ~105 — it rendered clipped
              as "0 / 455 X".  The bar immediately to its left already
              says what the number counts, so the unit was the cheapest
              thing in the row to lose. */}
          <span style={{ flex: 'none', fontSize: band ? 11 : 10, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
            {lp.prog} / {lp.thresh}
          </span>
        </div>
      </div>
      {/* v2.3.1635: unspent build points — the progress nag.  Brass on
          brass-fill is the band's one accent (Lantern Slate), and it is
          the only element here allowed to draw the eye.  Rendered only
          when there is something to spend. */}
      {band && unspent > 0 && (
        <span
          aria-label={unspent + ' unspent build points'}
          style={{
            flex: 'none', display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: 999,
            background: COL.accentFill, border: '1px solid ' + COL.accent,
            color: COL.accent, fontSize: 11, fontWeight: 800,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1.4,
          }}
        >+{unspent}</span>
      )}
      {/* v2.3.1637: the numbers, in the retired weapon chip's slot.
          v2.3.1643 stacked DMG over DPS to halve the chip's width.
          v2.3.1644 (owner: "remove dmg range and just put DPS"): DMG is
          gone entirely, so the chip is one short line again — DPS is the
          single figure that folds swing speed and crit into the damage
          range, and the range itself is still on every weapon's own item
          card.  Back to ~46px wide, and that width goes to the buttons. */}
      {band && dmgRange && (
        <span style={{
          flex: 'none',
          display: 'inline-flex', alignItems: 'center',
          padding: '2px 6px', borderRadius: 8,
          background: COL.slot, border: '1px solid ' + COL.tileBor,
          /* v2.3.1648: 9px -> 11.  A 9px chip was the single least legible
             thing in the band, and it carries the one number here that a
             player checks mid-fight. */
          color: COL.muted, fontSize: 11, fontWeight: 700, lineHeight: 1.25,
          whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
        }}>
          <span>DPS <b style={{ color: COL.text }}>{dps}</b></span>
        </span>
      )}
      {/* Gold — coin icon + number as one compact unit, right-aligned. */}
      <span style={{
        /* v2.3.1644 (owner: "add a bit more padding to the right of the
           gold amount"): it was flush against the row's own 4px frame
           padding, which reads as clipped on a rounded band edge. */
        flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 3,
        paddingRight: 6,
        color: COL.gold, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
      }}>
        <img src="/icons/popups/gold.webp" alt=""
          style={{ width: 13, height: 13, imageRendering: 'pixelated', display: 'block' }} />
        <span className="bt-coin-glimmer">{Number(gold).toLocaleString()}</span>
      </span>
    </div>
  );
};
