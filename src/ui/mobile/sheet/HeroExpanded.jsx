import React, { useEffect, useRef, useState } from 'react';
/* v2.3.2131: the stat rows below became tappable explainers -- see the
   note on sheetRow.  The words live in infoGlossary so the hero sheet and
   anywhere else that ever shows these rows read from one copy. */
import { infoPopupBus } from '../infoPopupBus.js';
import { statInfo, skillInfo } from '../infoGlossary.js'; /* v2.3.2592: skillInfo — the column headers explain their lane */
import { COL, QUALITY_COLOR, panelStyle, getState } from '../dash/common.js';
import { buildSkillUnspent, STAT_TO_WEAPON_CAT, getActiveWeapon, weaponForCat, swingCooldownMultFor, toDisplayDamage, toDisplayHp, DISPLAY_SCALE_K, calcDisplayDmgRange /* v2.3.2592: each lane's own damage range */ } from '../../../data/gameSystems.js'; /* v2.3.1914: getActiveWeapon; v2.3.2231: weaponForCat; v2.3.2441: swingCooldownMultFor; v2.3.2521: DISPLAY_SCALE_K for the "does not change damage" cut-off */
import { requestT2Category } from '../dash/T2Panel.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { CharacterView, FIGURE_W_FRAC } from './CharacterView.jsx'; /* v2.3.1815: the equip screen's own figure */
import { portraitStore, PORTRAIT_FALLBACK_SRC } from './portraitStore.js'; /* v2.3.2592: the Shared column wears the character's portrait */
import { COMBAT_SKILLS, skillLevel, skillProgressPct, skillProgress, deriveHeroStats, unspentPointsTotal } from './heroModel.js';
/* v2.3.1660: trained-skill rebuild — the Build section becomes the
   seven-stat allocation menu when the worker owns prog3. */
import {
  prog3Live, prog3HasSkills, prog3Pts, prog3AtkPts, prog3StatCap, prog3SkillLevel,
  prog3ActiveCat, prog3AtkMeta, prog3BodyMeta, PROG3_SKILL_META, prog3PoolFor,
  prog3CritMult, prog3CritPct /* v2.3.2441 */,
  PROG3, prog3ElemPower /* v2.3.2512: elem per weapon, elem resist, max mana */,
  prog3CharLevel, prog3PoolShared, prog3SharedSpendCat, isProg3SharedEnabled /* v2.3.2592: the shared pool */ } from '../../../data/prog3.js';
import { VitalBar, VITAL_ICONS, VITAL_LABEL, VITAL_TINT } from './VitalBar.jsx'; /* v2.3.1311; VITAL_LABEL v2.3.1883 */
import { getEquippedSlots, getEquipContribs, GHOST_SRC } from './equipModel.js'; /* v2.3.1653 */
import { previewStatPoint, overallDps } from './statPreview.js';                 /* v2.3.1766 */
import { StatDemo, STAT_DEMO_KEYS } from './StatDemo.jsx';                      /* v2.3.2222: the ℹ️ window's scene; v2.3.2592: only stats that HAVE one */
import { useScrollTap } from './scrollTap.js';                                  /* v2.3.2326: a tap the scroller confiscated is still a tap */
import { itemDetailBus } from '../dash/itemDetailBus.js';                        /* v2.3.1653 */
import { heroSectionBus } from './heroSectionBus.js';                            /* v2.3.1668 */
import { DASH_GAP, HERO_TAB_H } from './sheetGeometry.js';                      /* v2.3.1653; v2.3.1657 tabs */
import { playIsLandscape, panelVw } from '../playViewport.js';                    /* v2.3.2171: the sideways pane stacks; panelVw v2.3.2382 */

/* v2.3.1286: Hero expanded — the detailed character sheet.
   v2.3.1295 (ChatGPT round-4, owner-approved): no longer one long
   vertical feed — Overview, Build and Records are different TASKS, so
   a sticky segmented control under the identity strip gives each a
   focused half-screen view.
   v2.3.1311 (owner spec): Build goes 3x2 with a "BUILD POINTS · N
   AVAILABLE" header and Build·N on the segment when actionable;
   Overview renames DR to Block (the number is shield block, not
   general mitigation) and tightens the stat cards; Records grows
   Lifetime XP + Duels Won cards (Lifetime XP moved here from the
   identity strip, which now shows normalized next-level progress);
   vitals unified on VitalBar; the selected section resets to Overview
   when the sheet fully closes to the bar (it still survives compact
   dips and destination switches).
   v2.3.1653 (owner: "move the equipped view to be merged with the
   character overview so the equipped slots are grouped on the left and
   the player stats are shown on the right (aggregate of stats) and
   contextually changes if you are selecting an equipped item").  The
   line below — "equipment management intentionally lives in Bag, not
   here" — is RETIRED, and by the owner's own instruction.  It was true
   when the Bag had an Equipped tab; that tab went at v2.3.1639 and the
   band's EQUIPPED column went at v2.3.1653, so Overview is now the only
   place the worn six exist.

   WHAT THIS SCREEN GAINS THAT THE BAND NEVER HAD: the right-hand column.
   getEquipContribs (v2.3.1328) has always produced both an equipment
   TOTALS readout and a per-item contribution card, and neither has
   rendered anywhere since v2.3.1639 — the band showed slots without
   numbers because a 142px column had no room for them.  Selecting a slot
   here swaps the aggregate for that item's card, which is the
   "contextually changes" half of the ask, and it is wiring rather than
   new maths. */

const SECTIONS = ['Overview', 'Build', 'Records'];
/* ═══ v2.3.1847: THE TABS SAY WHAT THEY ARE ═══
 * Owner: "for the 3 tabs on the character menu I think I'd prefer text.  So
 * just equipment, build, and journey."
 *
 * That reverses v2.3.1657, which made them icon-only ("without any text") —
 * and the reversal is the owner's call to make, so it is made here without
 * argument.  Worth recording WHY it is safe: the icons were introduced to
 * buy vertical space, and they did not buy any.  The row is HERO_TAB_H (28)
 * tall either way; a 24px picture and an 11px word both sit inside it.  What
 * the pictures cost was legibility — a knight bust, a point tree and a tally
 * ledger have to be learned, while "Equipment" does not.
 *
 * The SECTION KEYS are unchanged.  'Overview' and 'Records' are the section
 * ids that `_lastSection` persists and that every `section === ...` branch in
 * this file tests; renaming them to match the labels would have been a
 * rename across the whole component to change three words on screen.  The
 * label is a display concern and lives in a display table.
 *
 * The old icons stay on disk — nothing else references them, but they are the
 * owner's art, and deleting art on a text change is not this commit's call.
 */
const SECTION_LABEL = {
  Overview: 'Equipment',   /* what the section actually shows: the worn six */
  /* v2.3.1849 (owner: "instead of build name it points").  The tab already
     carries a count badge of unspent POINTS, and "Build" named the activity
     while "Points" names the thing you have waiting — which is what makes
     the badge and the word say one thing instead of two. */
  Build: 'Points',
  Records: 'Journey',
};
/* Round-3 §6 state preservation: the selected section survives leaving
   the destination (module-scoped, session-only).  v2.3.1311: reset to
   Overview when Hero is closed all the way to the toolbar — a NEXT
   open is a fresh visit (owner spec); a dip to compact keeps it. */
let _lastSection = 'Overview';
dashboardPanelBus.subscribe(() => {
  if (dashboardPanelBus.state.mode === 'bar') _lastSection = 'Overview';
});

/* ═══ v2.3.2592: THE FOUR COLUMNS OF THE POINTS SCREEN ═══
   Owner's order — "melee, staff, bow, and shared" — which is NOT
   PROG3_SKILL_META's (sword, bow, staff), so it is spelled out here, at the
   display site, rather than by reordering a table three other screens map.
   The lane LABELS are the skills' own (Melee / Magic / Bow): every other
   screen names the staff skill Magic, and mp-prog3 pins that a lane is named
   the way the dashboard names it.  The fourth column is the character:
   `shared: true` is what catGrid / catCard / catRow branch on, and it has no
   iconSrc because its picture is the portrait (read at render). */
const SHARED_LANE = { key: 'shared', label: 'Shared', shared: true };
const POINT_LANES = ['sword', 'staff', 'bow']
  .map((k) => PROG3_SKILL_META.find((m) => m.key === k))
  .filter(Boolean)
  .concat([SHARED_LANE]);
/* The portrait's fallback when the bust has not been drawn yet (first
   render after a cold load): the sheet's own knight-bust art. */
/* v2.3.2615: one definition, in portraitStore.js — the level-up medallion reads
   the same chain for a character level-up and a second copy would drift. */
const SHARED_ICON_FALLBACK = PORTRAIT_FALLBACK_SRC;

/* v2.3.1657: the v2.3.1332 chiseled text segments (segCls/seg) are retired
   with the text — see the icon chip row in the render. */

export const HeroExpanded = () => {
  const [, force] = useState(0);
  const [eqSel, setEqSel] = useState(null);
  const [section, setSectionState] = useState(_lastSection);
  /* v2.3.1668: which combat type the Build grid is allocating into.
     Defaults to whatever you are actually holding, so opening Build
     mid-fight lands on the weapon you were just swinging. */
  const [buildCatState, setBuildCat] = useState(null);
  /* ═══ v2.3.2315: AN ACCORDION THAT CLOSES ═══
     Owner: "the stat allocation accordion menu doesn't collapse when I tap
     on it."  It did not, and the header said why: it called
     setBuildCat(sk.key) -- a SET, not a toggle -- so tapping the open lane
     re-selected the lane it was already on and nothing moved.

     A closed state could not be expressed in buildCat alone, either:
     `buildCatState || prog3ActiveCat(R)` falls back to the lane for the
     weapon you are holding, so clearing it re-opens that one rather than
     closing everything. Hence a separate flag -- which also keeps buildCat
     a valid category at all times, so the seven stat controls, the point
     pools and the prog3_allocate payload need no null handling. */
  /* v2.3.2593 (owner): "the default view should also to have them all
     closed" — sideways too, where the lanes have always been a vertical
     accordion.  v2.3.2597: both orientations now use `selCat` below. */
  const [laneClosed, setLaneClosed] = useState(true);
  /* ═══ v2.3.2593: THE COLUMNS OPEN AND CLOSE SIDEWAYS ═══
     Owner: "I do want the columns to close accordion style (opening and
     closing horizontally) ... the default view should also to have them all
     closed."

     So a column is a HORIZONTAL accordion panel: closed it is a narrow strip
     carrying its icon, its waiting points and its name; open it takes the
     width the closed ones give up and shows its stats.

     ═══ v2.3.2594: ONE WEAPON, PLUS SHARED ═══
     Owner: "You can only have one combat skill open at a time but you can
     have one combat skill and the shared column open at the same time."

     Which is the pairing the screen is FOR — the question a player is
     actually answering is "this weapon, or my character?", and those are the
     two things that need to be side by side to answer it.  Two weapons open
     at once would be a comparison nobody makes with a point in hand, and it
     costs both of them the width that makes their stats readable.

     So the three weapons behave as a radio group and Shared is an
     independent toggle.  Held as a LIST rather than as two pieces of state
     (`openWeapon` + `sharedOpen`) because every reader asks the same
     question of every column — "are you open" — and splitting it would make
     the Shared column answer differently from the other three at every one
     of those sites.
     An array, not a Set: it is React state, and a Set mutated in place does
     not re-render.  Order does not matter; membership does. */
  /* ═══ v2.3.2597: WHICH CATEGORY IS OPEN, OR NONE ═══
     The owner sent reference shots of the screen they want: a 2x2 grid of four
     category buttons, and tapping one drills into a card of that category's
     stats.  One category at a time, so the whole screen is `selCat` — a lane
     key, or null for the grid.
     This REPLACES the `openCols` array of v2.3.2593/2594.  That array existed
     to express "one weapon plus Shared open together", and a
     one-category-at-a-time card cannot express it; see the render for why that
     loss is deliberate rather than overlooked. */
  const [selCat, setSelCat] = useState(null);
  /* v2.3.2326: the lane headers live inside the sheet's scroller, which eats
     any tap that drifts more than ~15px. See scrollTap.js. */
  const scrollTap = useScrollTap();
  /* v2.3.1766: which stat the allocation tooltip is describing, or null for
     its resting state (the character's overall DPS).  Cleared when the sheet
     changes section so the strip never describes a stat that is off screen. */
  /* v2.3.2222: the press-to-peek strip state is gone -- what a point buys
     now opens in the ℹ️ window (openStatInfo below), and a resting readout
     has no state to hold. */
  const setSection = (s) => { _lastSection = s; setSectionState(s); };
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 400);
    return () => clearInterval(id);
  }, []);

  /* v2.3.1668: consume a pending "open Hero on this section" request
     from the band's COMBAT pills.  One-shot (take() clears it), so a
     later manual visit to Hero isn't dragged back to Build. */
  const _req = heroSectionBus.take();
  if (_req) {
    if (_req.section && _req.section !== _lastSection) { _lastSection = _req.section; setSectionState(_req.section); }
    /* v2.3.2315: and re-open, or a COMBAT pill would deep-link you to a lane
       that stays collapsed -- the request means "show me this", and honouring
       half of it is worse than ignoring it. */
    if (_req.cat) {
      setBuildCat(_req.cat); setLaneClosed(false);
      /* v2.3.2593: ...and OPEN that column, or a COMBAT pill would deep-link
         you to a closed strip.  v2.3.2594: through the same one-weapon rule
         the header taps take, so arriving from the dashboard leaves the
         screen in a state a tap could also have produced.  Guarded so this
         render-phase update cannot loop: it returns `prev` UNCHANGED when
         the column is already open. */
      /* v2.3.2597: the dashboard's combat pills deep-link to a lane.  With one
         category on screen that is simply "select it" — no merge rule left to
         apply, which is the same simplification the card makes everywhere. */
      setSelCat(_req.cat);
    }
  }

  const S = getState();
  const R = (S && S.rpg) || {};
  const d = deriveHeroStats(R);
  const cs = R._compStats || {};

  const labeledBar = (kind, label, cur, max) => (
    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
      <img src={VITAL_ICONS[kind]} alt="" draggable={false}
        style={{ width: 15, height: 15, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
      <span style={{ flex: 'none', width: 52, fontSize: 11, fontWeight: 700, color: COL.text2 }}>{label}</span>
      <VitalBar kind={kind} cur={cur} max={max} thick={kind === 'hp' ? 12 : 10} />
      <span style={{ flex: 'none', minWidth: 74, textAlign: 'right', fontSize: 12, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
        {Math.ceil(cur)} / {Math.ceil(max)}
      </span>
    </div>
  );

  /* v2.3.1653: the COMPACT vitals row — the same three bars, side by side
     instead of stacked, at 22px total instead of 60.  Overview's body is
     181px and the equipped + stats block the owner asked for needs 140 of
     them; three full-width labelled rows would have pushed that block below
     the fold, which is the one thing this screen must not do.
     Nothing is lost that the world HUD does not already show live — the
     exact numbers stay, under the bar rather than beside it. */
  /* ═══ v2.3.1888: NO BAR — AN ICON AND THE NUMBERS ═══
     Owner: "get rid of the bars and just use icons to represent combat
     resources and the numbers (e.g. in 100/100 format)."

     So the icon IS the label now: the HP/EN/MP word goes with the bar it used
     to sit beside, because an icon that has to be captioned is not doing its
     job. What is left is small enough that the three fit on ONE row instead of
     three stacked ones, and that is the whole point — it hands ~28px back to
     the combat stats above, which is the room the owner asked them to have
     ("the combat stats and resources extend a little farther down"). The sheet
     itself has none to give: measured, its body is 191px tall with 191px of
     content in it.

     `title` carries the full word for a long-press, since the icon no longer
     spells it out. */
  /* ═══ v2.3.1891: ONE RESOURCE PER ROW, ABOVE THE STATS ═══
     Owner: "Try putting the combat resources on their own rows above the
     offense and defense section.  Right now the numbers run together too
     much."

     They did, and the cause is arithmetic rather than taste: three groups
     sharing one row get an even third of ~180px, and "118/118" is seven
     tabular glyphs plus a 12px icon.  That very nearly fills a third, so
     whatever gap is left between them reads as smaller than the gap INSIDE
     each group — and the eye then groups the wrong things.  v2.3.1888 and
     v2.3.1890 both answered it by widening the gap (4 -> 10 -> 12), which
     treats the symptom; a row each removes the competition entirely.

     Shaped like a stat row on purpose — icon left, number right, the same
     baseline and the same right edge as Damage/DPS/Crit below. The icon is
     doing the job the label does down there, so the two blocks read as one
     sheet rather than as a widget stacked on a list. */
  /* ═══ v2.3.1892: HP / EN / MP, CENTRED, ONE PER ROW ═══
     Owner: "Try aligning combat resources to the center of that top section
     and instead of icons just use the letter abbreviations.  Then make them
     larger.  Try a couple different styles to see what works best."

     Five were built and photographed side by side rather than argued about,
     and two of the obvious ones were broken in ways only a render shows:

       A  letter + number, all three on one centred row, large
          — overflowed the column HORIZONTALLY.  The vertical overflow check
            cannot see that, which is why it was shot rather than measured.
       B  three centred rows at 14px — the most readable of the lot, but 16px
          too tall: "Crit Dmg" fell off the bottom.
       C  letter over value, three columns — the numbers collided into
          "118/118100/100102/102".  Each column is a third of ~180px and a
          seven-glyph number does not fit in it.
       D  tinted letter chips over the values — fits, and the chips read well,
          but the NUMBERS underneath still nearly touch: the same complaint
          that started this ("the numbers run together too much"), because it
          is still three numbers sharing one row.
       E  B, tuned until it fits.  Kept.

     So the letter carries the colour the icon used to (VITAL_TINT, taken off
     the top stop of that resource's own bar gradient) — without it the three
     are three identical grey numbers and the glance is gone. */
  const compactVital = (kind, cur, max) => (
    /* ═══ v2.3.1922: THE NUMBER MOVES INSIDE THE BAR ═══
       Owner: "Those numbers for the combat resources are too large: the
       resource bars also need to be fatter.  Actually I think having the
       numbers inside each resource bar would look better and save space."

       All three asks are the same ask, and it is a good one: the row's width
       was being split between a number and a bar that each wanted to be big,
       so both were small.  Stacked in depth instead of side by side, the bar
       gets the whole width AND the number stops competing for it — which is
       what lets 7px of bar become 18px of bar in a row that did not grow.

       WHY THE ROW DOES NOT GROW.  The height here is max(icon, bar, line
       box), and the previous version's tallest member was the 19px number:
       at the v2.3.1916 leading of 0.95 that is an 18.05px line box, against
       an 18px icon.  So 18 was already the row's height, and an 18px bar is
       exactly the largest one that is free.  The number inside it drops to
       12px — smaller as asked, and about as large as an 18px trough can hold
       with any air above and below.

       THE COUPLING, restated because it has moved twice now (v2.3.1894 sized
       the icon to the number, v2.3.1916 sized the leading to the icon): the
       row height is now set by the ICON and the BAR together, both at 18, and
       the number no longer participates.  That is the more stable of the two
       arrangements — the number is the thing the owner keeps resizing.  Push
       either 18 up and the three rows grow together and Crit Dmg goes off the
       bottom of the sheet; mp-charfit is the gate that catches it. */
    <div key={kind} title={VITAL_LABEL[kind]} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
      /* v2.3.1893: 1.12 -> 1.30 (owner: "increase the vertical padding just a
         bit, looks like there's a little room above the divider").  There is,
         and it is the ONLY room: measured, the column is 146px with 146px of
         content in it and no slack below the stats — the single piece of air
         is a 12px gap between the last resource row and the rule.  This
         spends about eight of those twelve across the three rows and leaves
         the rest, because a rule sitting flush against the text above it
         reads as a mistake rather than as a divider. */
      gap: 5, lineHeight: 1.30,
    }}>
      <span style={{
        fontSize: 11.5, fontWeight: 800, color: VITAL_TINT[kind],
        letterSpacing: '.06em',
      }}>{VITAL_LABEL[kind]}</span>
      {/* v2.3.1893: the icon comes back, AFTER the letter (owner).  It is the
          colour cue at a glance; the letter is what you read.
          v2.3.1894 took it 12 -> 18; v2.3.1922 leaves it there and makes the
          bar match, so the two tallest things in the row are the same height
          and the row reads as one band rather than as an icon beside a line.
          v2.3.1922 also changed WHICH heart this is — see VITAL_ICONS. */}
      <img src={VITAL_ICONS[kind]} alt="" draggable={false}
        style={{ width: 18, height: 18, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
      {/* v2.3.1922: the bar takes the rest of the row and carries the numbers.
          VitalBar is flex:1, so no width is guessed here — it shrinks rather
          than overflowing when a max HP reaches four digits. */}
      <VitalBar
        kind={kind} cur={cur} max={max} thick={18}
        inset={(
          <span style={{
            /* 19 -> 12 (owner: "too large").  It is also no longer the thing
               that sets the row height, so this number is now free to move
               without the layout arguing back — see the note at the top.
               No fontFamily, per v2.3.1922's earlier pass: it inherits the
               same face as the offense/defense table below, because two
               typefaces in one column read as two designs. */
            fontSize: 12, fontWeight: 800, lineHeight: 1,
            color: '#FFFFFF',
            fontVariantNumeric: 'tabular-nums',
            /* The halo, not a background plate: a plate would cover the fill
               it sits on and undo the point of putting the number there. */
            textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.7)',
            display: 'flex', alignItems: 'center',
          }}>
            {Math.ceil(cur)}
            {/* v2.3.1893: the slash gets air on both sides (owner: "increase
                the space between the first and second number").  Rendered as
                its own span rather than as spaces in the string: the numbers
                are tabular and a literal space is not, so padding is the only
                way to move the two apart without the gap jittering as the
                values change.  The separator is dimmed — it is punctuation,
                not data. */}
            <span style={{ padding: '0 4px', opacity: 0.6, fontWeight: 700 }}>/</span>
            {Math.ceil(max)}
          </span>
        )}
      />
    </div>
  );

  /* Overview derived pills — v2.3.1311b (owner): ALL SIX on ONE ROW,
     no scrolling anywhere in the subtab.  ~55px per pill at 390w:
     centered 8.5px label over a 13px value.  Values stay neutral
     (round-4: green is reserved for deltas/bonuses). */
  /* One decimal below 10%, whole numbers above — a 0.4%/point stat needs
     the decimal to show any movement at all, and a 38.4% doesn't. */
  const pct1 = (v) => {
    const n = (v || 0) * 100;
    return n > 0 && n < 10 ? n.toFixed(1) : Math.round(n);
  };
  /* v2.3.1883b: NO ICON.  Owner: "Don't use any icons to represent the stats
     to save room."  The tile carried one from v2.3.1878 until now, beside the
     value, and it cost ~14px of a ~46px cell (11px of art plus its 3px gap) —
     which is why that version had to abbreviate four of the seven labels to
     fit them.  Spent on the text instead, the words fit: DEFENSE is back to
     its full spelling in the same pass.
     `span` went with it.  It existed so DAMAGE could take two columns for a
     wide range like "120-160" (v2.3.1697); its row now holds four cells
     rather than eight and the grid gives that column 1.25fr, so every caller
     was passing 0 and a parameter nothing sets is just a thing to get wrong.
     `title` stays: it is the untruncated label for a long-press, and it costs
     no pixels. */
  /* ═══ v2.3.1890: A LIST ROW, NOT A CARD ═══
     Owner: "The bigger problem isn't rows vs. columns — it's that every stat
     is being treated as its own card.  The borders, padding, headers, and
     gaps are eating most of your space.  I'd switch to a character-sheet/list
     format and get rid of the individual stat boxes entirely."

     Right, and it is measurable: seven tiles were spending 2 borders + 7px of
     padding + a 4px grid gap EACH on chrome, in a column 146px tall.  A row
     spends none of it — label left, value right, and the eye reads down the
     values in one column instead of hopping between boxes.

     The labels get their words back in the same move.  DEF / C.DMG were
     abbreviations forced by a ~46px tile (v2.3.1878); a list row is as wide
     as its half of the column, so "Crit Dmg" and "Defense" simply fit. */
  /* `sheetRow`, not `statRow`: that name is already taken by the item card's
     own row renderer further down (v2.3.1846), and the two are different
     shapes — this one takes (label, value), that one takes a { k, v }. */
  /* ═══ v2.3.2131: A ROW YOU CAN ASK ABOUT ═══
     Owner: "more pop ups for things users want to learn more about on the
     character equip menu (labels tapped on and such)."

     Demo reviewers met seven stat rows -- Damage, DPS, Crit, Crit Dmg,
     Defense, Dodge, Armor -- with no way to find out what any of them did.
     Tapping one now opens the explainer.

     ONLY rows the glossary actually has words for become interactive.  A row
     that looks tappable and answers nothing is worse than a plain one, so
     `info` being null is what decides: no role, no cursor, no handler, and
     the row renders exactly as it did before.  That also means adding a stat
     later cannot silently ship a dead affordance -- it just is not tappable
     until somebody writes its sentence. */
  const sheetRow = (label, value) => {
    const info = statInfo(label);
    return (
    <div key={label}
      data-statrow={info ? label : undefined}
      role={info ? 'button' : undefined}
      tabIndex={info ? 0 : undefined}
      aria-label={info ? `${label} — what is this?` : undefined}
      onPointerUp={info ? ((e) => {
        e.stopPropagation();
        infoPopupBus.open({ title: info.title, body: info.body, note: info.note, stat: String(value) });
      }) : undefined}
      style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      /* v2.3.1890b: the list left real vertical air where the boxes' chrome
         used to be — spent on legibility, which is the point of dropping
         them.  charfit is the ceiling. */
      /* v2.3.1891: 1.5 -> 1.34.  Moving the resources onto rows of their
         own (owner) needed 21px; the resources found most of it and this
         is the rest.  Still well above the boxed layout it replaced. */
      /* v2.3.1892: 1.34 -> 1.18.  Three centred resource rows at 14px are
         what the owner asked for and they do not fit at 1.34 — this is the
         6px they were short, and it is taken here rather than from the
         resources because the resources are the thing being made larger. */
      gap: 6, minWidth: 0, lineHeight: 1.18,
      /* v2.3.2131: the only chrome a tappable row gets.  No underline, no
         chevron -- seven of them down a narrow column would read as clutter,
         and charfit is already the ceiling on this list's height. */
      cursor: info ? 'pointer' : undefined,
      touchAction: info ? 'manipulation' : undefined,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 600, color: COL.muted,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 800, color: COL.text,
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flex: 'none',
      }}>{value}</span>
    </div>
    );
  };

  /* v2.3.1883: the same seven, split into the two groups the owner drew.
     Nothing is added or dropped — OFFENSE is the four that decide what you
     hit for and DEFENSE the three that decide what reaches you, which is the
     reading the flat 4x2 grid gave no way to see.  Still ONE list per group
     and no second copy anywhere, for the reason the v2.3.1878 note gives. */
  const offenseCells = () => [
    sheetRow('Damage', d.dmgText),
    /* v2.3.2525: 2 dp, matching the ℹ️ explainer and the resting strip — the
       same DPS shown three places must read the same in all three, and at
       k = 5 one decimal could not tell two different weapons apart. */
    sheetRow('DPS', d.dps.toFixed(2)),
    sheetRow('Crit', `${pct1(d.crit)}%`),
    /* v2.3.2199: % on a prog3x worker.  v2.3.2520: which is exactly why the
       display scale is applied to the FLAT form only -- a percentage is not a
       damage number and dividing it by k would be wrong. */
    sheetRow('Crit Dmg', p3
      ? `+${d.critDmgPct ? Math.round(d.critDmg) : toDisplayDamage(d.critDmg)}${d.critDmgPct ? '%' : ''}`
      : '—'),
  ];
  const defenseCells = () => [
    sheetRow('Defense', p3 ? `${pct1(d.defPct)}%` : '—'),
    sheetRow('Dodge', `${pct1(d.dodge)}%`),
    sheetRow('Armor', `${pct1(d.armorDr)}%`),
  ];
  /* Module header, 10/700 uppercase .12em — the Lantern Slate step for this
     (11/600 uppercase .12em) taken one notch down, because these two sit
     inside a 146px column rather than at the head of a panel and every pixel
     here was already spoken for. */
  const groupHead = (text) => (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
      textTransform: 'uppercase', color: COL.muted,
      lineHeight: 1, flex: 'none',
    }}>{text}</div>
  );

  /* ═══ v2.3.2171: THE SIDEWAYS PANE STACKS ═══
     Owner, inspecting the landscape screenshots: "You'll need to align
     some of the panes vertically.  Like hero has his preview and slots
     but you need to put stats beneath that."
     In portrait the OFFENSE/DEFENSE lists share the third column with the
     vitals because vertical room is the scarce thing there (the whole
     v2.3.1878 story).  The landscape pane has the opposite shape — a full
     390-tall column with empty floor under the figure row — so the two
     lists move BENEATH the row, full width, and the third column keeps
     the vitals (and the item card) alone.  Read per render: rotation
     closes the sheet (v2.3.2157), so this cannot flip under an open pane. */
  const landPane = playIsLandscape();
  /* ═══ v2.3.2382: THE POINT ROWS GO TWO ABREAST ═══
     Owner: "On the stat point application menu make it so that whatever
     primary combat skill you're on it's divided into two columns: on the left
     is the attack (offensive) points and on the right are the global (mostly
     defensive) points.  Right now it Seems like each row has a lot of room and
     could be split into two."

     They are right, and the split they describe is already the data: four
     PROG3_ATK_META rows against five PROG3_BODY_META ones, rendered as two
     consecutive GROUPS a few hundred lines below.  Turning consecutive into
     side-by-side is a flex direction; the work is making the row survive half
     the width.

     MEASURED, in a real browser at the live font, not eyeballed.  The body is
     panelVw - 12 (the panel's own 6px padding), so 378px at 390.  Today's row
     spends 122px of that on chrome (icon 26 + info 34 + plus 38 + three 8px
     gaps) and gives the label column the other 240 -- against ELEM POWER, the
     longest label, at 97.33px.  That is the 142.67px per row the owner can see.

     Halved, the arithmetic stops being generous.  A column is (378-4)/2 = 187,
     and the row needs border 2 + padding 11 + two 6px gaps + icon 22 + info 30
     = 77 of it, leaving 110 for a label that wants 97.33.  It fits -- but only
     with the [+] gone: at 30px wide plus its gap it costs 36, and 110-36 = 74
     is under ELEM POWER by 23px.  So the [+] is dropped in this mode and
     nothing else is.  Defensible on this file's own terms, and only barely:
     the span is marked `aria-hidden` and commented "Decorative: the ROW is the
     button", and COL.accentFill on the row is the real spendable cue.  It is
     still the visible affordance, so it goes in front of the owner with a shot
     rather than quietly.

     THE 375px FLOOR IS WHERE THE LABEL RUNS OUT, computed rather than picked:
     label = (panelVw - 16)/2 - 77 >= 97.33 gives panelVw >= 364.7.  375 is the
     narrowest iPhone (SE) and leaves 5.2px of slack there; below it -- 320x568,
     which this repo tests -- the label column drops to 75px and all three long
     labels clip, so that width keeps the single column it has today.  A layout
     that only fits the big phone is not shipped (the same rule the creator's
     390x664 case just taught).

     Landscape is untouched: landPane already stacks these full-width beneath
     the figure row for its own reasons (v2.3.2171). */
  const prog3TwoCol = !landPane && panelVw() >= 375;
  /* v2.3.1660: one definition (heroModel) — under prog3 this is THE
     pool, so the tab badge and the points chip both show it. */
  const totalUnspent = unspentPointsTotal(R);
  const p3 = prog3Live(R);
  const buildCat = buildCatState || prog3ActiveCat(R);
  /* ═══ v2.3.2512: OPENING A SECTION BRINGS ITS STATS INTO VIEW ═══
     The owner's Points accordion stacks three 44px headers above the open
     section's stats, and the sheet's scrolling window is ~191px on a phone
     (measured, 390x844) — so the THIRD section's first stat row starts below
     the fold by construction.  That is the v2.3.1660 incident exactly ("a
     player who could not know a stat existed"), and v2.3.2441's side-by-side
     selector row existed to dodge it.

     The accordion cannot dodge it by geometry, so it answers it by MOVING:
     opening a section scrolls that section's header to the top of the
     scroller, which puts its stats in the middle of the window whichever of
     the three you picked.  Cheaper and more honest than shrinking the header
     below the 44px thumb target, which is the only other way the three would
     fit — and mp-prog3 pins that target at three viewports.
     Guarded end to end: this runs inside the sheet, on a browser that may
     have no smooth-scroll and an element that may not be mounted yet. */
  useEffect(() => {
    if (laneClosed) return;
    /* v2.3.2592: portrait has no lane to bring into view any more — the four
       columns are always on screen and their header row is sticky — so this
       is the landscape accordion's convenience only. */
    if (!playIsLandscape()) return;
    let raf = 0;
    raf = requestAnimationFrame(() => {
      try {
        const head = document.querySelector(`[data-prog3-lane="${buildCat}"]`);
        if (!head) return;
        let sc = head.parentElement;
        while (sc && !/auto|scroll/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
        if (!sc || sc.scrollHeight - sc.clientHeight <= 4) return;
        /* The header's offset inside the scroller, minus whatever is pinned
           above it (the section tab bank is sticky at top 0). */
        const top = head.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
        const want = Math.max(0, top - HERO_TAB_H - 4);
        if (Math.abs(sc.scrollTop - want) > 2) sc.scrollTop = want;
      } catch (e) { /* a convenience scroll must never take the panel down */ }
    });
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [buildCat, laneClosed]);


  /* ── the worn six, and what they are worth ── */
  const equipped = getEquippedSlots(R);
  const contribs = getEquipContribs(R);
  const selSlot = eqSel ? equipped.find(sl => sl.slot === eqSel) : null;
  const selCard = selSlot ? contribs.cards[selSlot.slot] : null;
  /* v2.3.1845: the selected item's QUALITY roll (normal / rare / elite /
     godly — see QUALITY_COLOR in dash/common.js for why this is a different
     ladder from the material tier the card is NAMED by).  Read from the item
     itself with the slot's own field as a fallback, because getEquippedSlots
     lifts `quality` to the top level for the weapon only.  Everything minted
     today is 'normal', so today this changes nothing on screen — which is
     the point: the card is ready for the ladder the owner is adding, and a
     rare drop will not look identical to a plain one. */
  const quality = (selSlot && ((selSlot.item && selSlot.item.quality) || selSlot.quality)) || 'normal';
  /* ═══ v2.3.1847: RARITY IS THE NAME'S COLOUR ═══
     Owner: "instead of communicating the item rarity with literal text I
     think I'd rather have the font color of the name of the item represent
     rarity.  For normal items it will just be white."

     So the word is gone and the NAME carries it.  That is the convention
     every ARPG uses, and it costs nothing: the name is already on the frame,
     already the biggest text on the card, and a colour needs no line of its
     own — which gives the picture and the stat list back the height the
     rarity line was taking.

     The FRAME goes back to brass and stays there.  Colouring the rim as well
     would say the same thing twice, and the second saying is the one that
     fights the panel: at rare the whole card changed hue, which reads as the
     card being in a different state rather than the item being better.
     QUALITY_COLOR maps 'normal' to null, which is exactly "no rarity hue" —
     so a normal item's name falls back to the panel's warm white, the
     owner's "just white". */
  const nameCol = QUALITY_COLOR[quality] || COL.text;
  const rimCol = COL.accent;
  const rimFill = COL.accentFill;
  /* The item picture inside that card.  62 measured against the row: the
     card column is ~183px wide at 390, and once the frame and the interior
     well have taken their padding there are ~160 left — so 62 gives the art
     a real presence and still leaves the DMG/DPS tiles ~90px, which is more
     than "9–14" needs. */
  const ART_W = 62;
  /* v2.3.1846: the card's stat LIST and its bonus strip.  `rows` falls back
     to the primary/secondary pair the card has always carried, so a card
     added later that does not define rows still renders its two stats rather
     than an empty list. */
  const rows = selCard
    ? (selCard.rows && selCard.rows.length
      ? selCard.rows
      : [selCard.primary, selCard.secondary].filter(Boolean))
    : [];
  const bonuses = (selCard && selCard.bonuses) || [];
  /* THREE across, TWO down.  Two-by-three was the shape the band's EQUIPPED
     panel settled on at v2.3.1648 and the obvious reading of "grouped on
     the left", but measured it did not fit: three rows of 46 is 146px, and
     Overview's body has 106 to give once the tabs and vitals are paid for —
     the Cape slot landed 35px BELOW the band, invisible.  The only way to
     keep 2x3 was 32px slots, which is the size this whole pass exists to
     move away from.  Three across keeps the cells big and the group still
     reads as one block on the left; it is simply a wider block. */
  const EQ_W = 46;
  const eqCell = (slotName) => {
    const sl = equipped.find(e => e.slot === slotName);
    if (!sl) return <div key={slotName} style={{ width: EQ_W, height: EQ_W }} />;
    const on = eqSel === slotName;
    return (
      <div key={slotName}
        role="button" aria-label={sl.label} aria-pressed={on} title={sl.label}
        onPointerUp={(e) => { e.stopPropagation(); setEqSel(on ? null : slotName); }}
        style={{
          width: EQ_W, height: EQ_W, flex: 'none', position: 'relative',
          background: on ? COL.accentFill : COL.wellSoft,
          border: `1px solid ${on ? COL.accent : COL.tileBor}`,
          borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', touchAction: 'manipulation',
        }}>
        <img src={sl.iconSrc || GHOST_SRC[slotName]} alt="" draggable={false}
          style={{
            width: '80%', height: '80%', objectFit: 'contain',
            opacity: sl.ghost ? 0.3 : 1, pointerEvents: 'none',
          }} />
      </div>
    );
  };
  /* v2.3.1846: ONE STAT, as a row inside the item card — label left, value
     right, per the owner's mockup.  Replaces v2.3.1844's centred tile, which
     spent a border and 8px of padding per stat; at four stats those tiles did
     not fit the card at all, and the two that did fit were mostly padding.
     A row is also easier to READ down a column: the labels line up on the
     left and the numbers on the right, instead of every value sitting in the
     middle of its own box at its own x. */
  const statRow = ({ k, v }) => (
    <div key={k} style={{
      display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0,
    }}>
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
        textTransform: 'uppercase', color: COL.muted,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{k}</span>
      <span style={{
        flex: 'none',
        fontSize: 12.5, fontWeight: 800, color: COL.text,
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
      }}>{v}</span>
    </div>
  );

  return (
    <div style={{
      ...panelStyle, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: 10,
      /* v2.3.1311d (owner: "the last row is faded at the bottom"): the
         panelStyle bottom scroll-edge fade exists to signal MORE
         content below the fold — Hero's subtabs are designed no-scroll,
         so the mask only dimmed the flush last row.  Off here. */
      /* v2.3.1815: Overview scrolls now (the character view took the row the
         stats used to share), so it keeps the fade that tells you so; the
         other sections are still no-scroll and still turn it off. */
      ...(section === 'Overview' ? null : { WebkitMaskImage: 'none', maskImage: 'none' }),
    }}>
      {/* v2.3.1653: Hero's OWN identity strip is gone.  Since v2.3.1652 the
          band's top row carries name, level, XP, gold and DPS on every
          screen including this one, so rendering the strip again inside the
          panel put the same five numbers on screen twice — the band's
          one-count rule — and spent ~50px of a 181px body doing it.  That
          50px is exactly what Overview needed to show the equipped block
          above the fold. */}

      {/* v2.3.1657 (owner: "condense it into a navigation similar to the
          dashboard navigation buttons without any text but still below
          those main buttons"): ICON-ONLY section chips, the BagFilterChips
          recipe — same fills, same borders, same 24px icon, labels carried
          by aria-label/title.  Sitting as the panel's first child they are
          already directly below the band's nav row (the panel body's
          marginTop reserves that row), which is the "below" the owner
          asked for; the band's top row itself is spoken for (v2.3.1652).

          28px against the old control's 40 (36 chip + well lips) returns
          ~12px to the body — see the budget notes in Overview below.
          Sticky so a scrolling section keeps its navigation.

          The "Build · N" TEXT becomes the nav-rail count pill INSIDE the
          chip at top/right 2 — NavRail hangs its badge at -3, but this row
          tops an overflow:auto panel where a negative overhang clips.  The
          count also rides the Build chip's aria-label, so nothing the text
          carried is lost to a screen reader. */}
      <div style={{
        /* ═══ v2.3.2600: THE 4px BAND ABOVE THIS ROW ═══
           Owner: "make sure the cells don't slide above the headers."  A sticky
           offset is measured from the scrollport's PADDING box, and panelStyle
           gives every panel `padding: 4px 6px 4px`.  So `top: 0` pinned this
           row 4px BELOW the scroller's own top edge, and the stat cells scrolled
           visibly through that 4px strip — measured: scroller top 653, row top
           657.  Small, and exactly the thing being complained about.
           `top: -4` pins the row's border box over the strip and `paddingTop: 4`
           puts its contents back where they were, so nothing moves and the
           background now covers the band.  `marginTop: -4` keeps the flow
           height unchanged, because the padding would otherwise push every row
           below it down by 4.
           The panelStyle padding itself is NOT touched — every panel in the
           dashboard shares it.
           HEIGHT + 4, not height: this app is box-sizing: border-box, so adding
           padding to a fixed height SHRINKS the tabs instead of growing the row
           — measured, the row ended at 681 and opened a 4px strip between it
           and the card header, i.e. the same bug moved rather than fixed. */
        position: 'sticky', top: -4, zIndex: 2,
        marginTop: -4, paddingTop: 4,
        display: 'flex', gap: DASH_GAP,
        height: HERO_TAB_H + 4, flex: '0 0 auto',
        /* v2.3.2214: 4 -> 2. Every pixel above the open lane pushes its last
           stat toward the bottom of the phone; the lane headers' sticky
           offset below must move with this or they pin in the wrong place. */
        marginBottom: 2,
        background: COL.bg, /* sticky: keep opaque so content scrolls UNDER */
      }}>
        {SECTIONS.map(s => {
          const on = section === s;
          const badge = s === 'Build' && totalUnspent > 0 ? totalUnspent : 0;
          return (
            <div key={s}
              role="button"
              aria-label={badge ? `Build — ${badge} points` : (SECTION_LABEL[s] || s)}
              aria-pressed={on} title={SECTION_LABEL[s] || s}
              /* v2.3.2013: the section's ID, which does not move.  `title` and
                 `aria-label` both carry the LABEL, and the label is display
                 copy the owner renames -- v2.3.1849 turned Build into
                 "Points", which silently broke mp-statpeek's
                 `[title="Build"]` and took five assertions with it: the
                 section never opened, so every reading below it came back
                 empty.  Same contract as bt-quest-turnin on the claim button,
                 and for the same reason. */
              data-section={s}
              /* v2.3.2326: through scrollTap, like everything else in this
                 scroller -- a tab tap that drifts 16px was being confiscated
                 for a scroll that never happened.  See scrollTap.js. */
              {...scrollTap(() => setSection(s))}
              style={{
                position: 'relative',
                /* v2.3.2173: sideways the tabs share by CONTENT — equal
                   thirds starved the longest word and "Equipment" rendered
                   "Equipm…" in the skinny column; Points and Journey cede
                   what they don't need.  Portrait keeps equal thirds. */
                flex: landPane ? '1 1 auto' : '1 1 0', minWidth: 0, height: '100%',
                /* v2.3.2176b: 4px, not 5.  Measured sideways, the three
                   words plus 5px cheeks come to 192 in a 191px strip -- so
                   the strip was one pixel from ellipsising all three even
                   with no badge on it.  A 6px margin is the difference
                   between a layout that fits and one that happens to. */
                padding: landPane ? '0 4px' : 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? COL.accentFill : COL.wellSoft,
                border: `1px solid ${on ? COL.accent : COL.tileBor}`,
                borderRadius: 7,
                cursor: 'pointer', touchAction: 'manipulation',
                boxSizing: 'border-box',
              }}>
              <span style={{
                /* v2.3.2172: one point down in the skinny landscape column —
                   "Equipment" ellipsised to "Equip…" at 11px in a 65px tab. */
                fontSize: landPane ? 10 : 11, fontWeight: 800, letterSpacing: '.03em',
                color: on ? COL.accent : COL.text2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                pointerEvents: 'none',
                /* The Build tab carries a count badge at top/right 2 — keep
                   the word clear of it so "Build" and "3" never overlap. */
                /* v2.3.2176b: sideways the badge costs the WORD nothing.
                   Owner, twice: "labels that are still cut off".  This
                   reserve is why -- 12px off a 50px tab pushed the row over
                   its 191, every tab shrank, and all three ellipsised
                   ("Equipm…", "Poi…", "Journ…") the moment the player had a
                   point to spend.  Sideways the count becomes a dot (below)
                   and the reserve goes with it. */
                paddingRight: badge > 0 && !landPane ? 12 : 0,
              }}>{SECTION_LABEL[s] || s}</span>
              {badge > 0 && (landPane ? (
                /* v2.3.2176b: sideways, a DOT.  The digits need a 13px pill
                   and 12px of clearance in a column that has neither, and
                   the number is not lost -- it rides this tab's aria-label,
                   the hero nav button's own badge two rows down, and each
                   weapon lane's "N PTS" chip inside the screen.  What the
                   tab has to say here is "there is something to spend",
                   and a dot says it in 6px. */
                <span aria-hidden="true" style={{
                  position: 'absolute', top: 3, right: 3,
                  width: 6, height: 6, borderRadius: 999,
                  background: COL.accent, pointerEvents: 'none',
                }} />
              ) : (
                <span aria-hidden="true" style={{
                  position: 'absolute', top: 2, right: 2,
                  minWidth: 13, height: 13, padding: '0 3px',
                  borderRadius: 7, background: COL.accent, color: COL.onAccent,
                  fontSize: 11, fontWeight: 900, lineHeight: '13px', textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
                }}>{badge > 9 ? '9+' : badge}</span>
              ))}
            </div>
          );
        })}
      </div>

      {section === 'Overview' && (
        <>
          {/* v2.3.1842: the three vitals MOVED — they now stand beside the
              figure (below), stacked, in the width the compact crop freed.
              Removing this strip also hands ~26px of height back, which is
              most of what the taller equip row cost at v2.3.1841. */}

          {/* v2.3.1653: EQUIPPED LEFT, STATS RIGHT — the owner's layout,
              literally.  The left column is fixed at what two cells need so
              the right column gets every remaining pixel; the numbers are
              the thing that was missing, so the numbers get the space. */}
          {/* ═══ v2.3.1815: YOUR CHARACTER, BESIDE YOUR GEAR ═══
              Owner: "On the character equip menu find space to put as large
              view of the character as possible to fit inside the space.
              Should show armor worn etc if player is wearing it."  Pose, on
              a follow-up: "Southwest idle view."

              THERE WAS NO SPARE SPACE — that is measured, not assumed.  At
              390px the row ran equipped 146 + gap 8 + stats 224 = 378 of 378
              available, exactly full, so a figure could only come out of the
              slots (46px, and v2.3.1653 shrank them from 32 specifically to
              stop them being small) or out of the stat cells (56px, where
              CRIT DMG already ellipsises).  Both are worse than the thing
              being added.

              So the stats move DOWN to their own full-width row instead of
              sharing this one.  They get MORE width there (378 vs 224), the
              slots keep their size, and the figure gets the whole 224px the
              stats vacated at the row's full 101px height — the largest it
              can be without taking anything away from what was already here.

              THE COST, stated: Overview now scrolls by roughly a stat row.
              v2.3.1311d turned this panel's scroll-edge fade off because the
              subtabs were designed no-scroll, so the fade is turned back on
              for Overview only — a panel that scrolls with no cue that it
              scrolls is how the last row goes unnoticed. */}
          {/* ═══ v2.3.1841: THE CHARACTER FIRST, AND BIGGER ═══
              Owner: "I want the character on the character menu to display
              larger and be in the left side.  I just scroll down to see the
              whole character."

              Two changes, and the second is what buys the size.  The figure
              moves to the LEFT, and the six gear slots re-flow from three
              columns to TWO — so the slot block becomes 2 wide x 3 tall
              instead of 3 wide x 2 tall.  That hands the figure a taller box:
              3*EQ_W + 2*GAP instead of 2*EQ_W + GAP, 146px against 96px, a
              52% bigger character, with the same six slots at the same tile
              size beside it.

              THE COST, stated rather than glossed: the row is 50px TALLER
              (96 -> 146), because the slot block grew along with the figure.
              A square canvas is sized by its height, so no arrangement makes
              the figure half again as tall without spending half again as
              much height — an earlier draft of this comment claimed the row
              height was unchanged, and that was simply wrong.  The re-flow is
              still what makes it cheap: leaving the slots 3 wide would have
              cost the same height AND stranded them in a 2-row strip half the
              figure's height. */}
          {/* v2.3.1842: three columns, in the owner's order — CHARACTER,
              then the gear slots, then the vitals.  ("I actually have slots to
              the right and vitals to the right of that.") */}
          {/* v2.3.2172 (owner: one skinny column for every destination):
              sideways the row WRAPS — figure and slots share the first
              line (they just fit the ~204px column at a 6px gap), and the
              vitals/item-card column breaks below them at full width
              instead of squeezing beside them. */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: landPane ? 6 : 8, flexWrap: landPane ? 'wrap' : undefined, rowGap: landPane ? 8 : undefined }}>
            {/* HARD LEFT, and cropped to a rectangle around him.  `crop`
                narrows the WELL over the canvas rather than shrinking the
                canvas — the character stays the size the owner asked to keep,
                and the ~70px of empty frame it was reserving is what pays for
                the vitals column. */}
            <div style={{
              flex: 'none',
              width: Math.round((3 * EQ_W + 2 * DASH_GAP) * FIGURE_W_FRAC),
              height: 3 * EQ_W + 2 * DASH_GAP,
              background: COL.wellSoft, border: `1px solid ${COL.tileBor}`,
              borderRadius: 8, overflow: 'hidden',
            }}>
              {/* ═══ v2.3.1914: THE ACTIVE WEAPON, NOT THE MELEE SLOT ═══
                  Owner: "When different weapons are equipped like pine bow and
                  staff the character preview doesn't update on the character
                  dashboard."

                  It never could. There are THREE weapon slots — weapon (melee),
                  rangedWeapon and staffWeapon, chosen by rpg.activeSlot — and
                  this was wired to the melee one, so equipping or swapping to a
                  bow or a staff changed a field the preview does not read.
                  getActiveWeapon is what the world figure draws and what
                  playerActions fires, so the preview now shows the thing you are
                  actually holding rather than a fourth opinion about it. */}
              <CharacterView
                size={3 * EQ_W + 2 * DASH_GAP}
                weapon={getActiveWeapon(R)}
                shield={R.shield}
                crop
              />
            </div>

            <div style={{
              flex: 'none', width: 2 * EQ_W + DASH_GAP,
              display: 'flex', flexWrap: 'wrap', gap: DASH_GAP,
            }}>
              {['weapon', 'shield', 'chest', 'legs', 'amulet', 'cape'].map(eqCell)}
            </div>

            {/* ═══ v2.3.1843: THE CARD OPENS OVER THE VITALS ═══
                Owner: "It's fine if the card opens over where the vitals are."

                v2.3.1842 tried to solve the same problem by SCROLLING the card
                into view, and the screenshot showed why that was wrong: the
                scroll pushed the top of this row up behind the subtab bar and
                cut off the character's head and the HP bar to reveal a card at
                the bottom.  Taking the owner's suggestion instead — the
                selected item's card simply takes this column — means nothing
                moves, nothing is cut off, and the card is on screen the
                instant you tap a slot.

                The vitals come back the moment you tap the slot closed.  The
                whole-character stats below are unchanged. */}
            <div style={{
              /* v2.3.2172: sideways this whole column wraps to its own
                 full-width line under the figure (flex-basis 100%), auto
                 height — the card and the vitals size to their content
                 there instead of to the gear grid beside them. */
              ...(landPane
                ? { flex: '1 1 100%', minWidth: 0 }
                : { flex: 1, minWidth: 0, height: 3 * EQ_W + 2 * DASH_GAP }),
              display: 'flex', flexDirection: 'column',
              /* v2.3.1893: 10 -> 6 on the stats branch.  That flex gap is
                 where the "room above the divider" actually lives — it sits
                 between EVERY child, so 10px above the rule and 10px below it
                 again, while the three resource rows were squeezed to 1.12
                 leading.  Moving four of those ten into the rows' line-height
                 spends the same pixels on the thing being read instead of on
                 the space around a 1px line.  Column height is unchanged; the
                 item-card branch still gets 0. */
              justifyContent: 'center', gap: selSlot ? 0 : 6,
            }}>
              {selSlot ? (
                /* ═══ v2.3.1844: THE ITEM CARD IS A CARD ═══
                   Owner: "put it on its own card.  Like the GREATSWORD and
                   CHANGE are the thick border of the card.  The inside of it
                   is where it lists the stats."

                   So the name and the CHANGE button are not floating text
                   above some tiles any more — they sit ON the frame, in the
                   brass-tinted band that IS the card's border, and the stats
                   live in a sunken well inside it.  That is the whole shape:
                   a lit rim around a dark interior.

                   The tiles inside switch from `wellSoft` to `raised`,
                   because the interior they now sit in is darker than the row
                   behind them was — wellSoft on well is the same colour twice
                   and the tiles vanished into the floor.  Depth order, from
                   docs/LANTERN-SLATE-SPEC.md: frame (accentFill) > well
                   (COL.well) > tile (COL.raised). */
                <div style={{
                  flex: 1, minWidth: 0,
                  display: 'flex', flexDirection: 'column', gap: 4,
                  borderRadius: 11,
                  border: `1px solid ${rimCol}`,
                  background: rimFill,
                  padding: 5,
                  overflow: 'hidden',
                }}>
                  {/* ═══ v2.3.1846/1847: THE FRAME CARRIES THE NAME ═══
                      The mockup put a second line under the title; the owner
                      first cut it to the rarity alone ("you can ignore the
                      redundant name of the greatsword"), then to nothing at
                      all — the name's own COLOUR is the rarity now.  Both
                      moves went the same direction, which is why the line is
                      gone rather than shortened again: the second row was
                      never carrying information the first could not. */}
                  <div style={{
                    flex: 'none', display: 'flex', alignItems: 'center',
                    gap: 6, minHeight: 18, padding: '0 2px',
                  }}>
                    {/* v2.3.1845: the title WRAPS rather than ellipsising.
                        Naming the metal made it longer — "COPPER GREATSWORD"
                        instead of "GREATSWORD" — and at the old size it came
                        out "COPPER GREAT…", which loses the half that says
                        what the thing is.  Smaller and tighter fits the
                        starter kit on one line; anything longer (SOFTWOOD
                        GREATSWORD) takes a second line, which the frame has
                        room for.  Truncation is the one outcome to avoid:
                        mp-itemcard asserts the text is not clipped. */}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        display: 'block',
                        fontSize: 11, fontWeight: 800, letterSpacing: '.03em',
                        lineHeight: 1.1,
                        textTransform: 'uppercase', color: nameCol,
                        overflowWrap: 'anywhere',
                      }}>{selCard ? selCard.title : selSlot.label}</span>
                    </span>
                    {selSlot.pickerSlot && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          let anchor = null;
                          try {
                            const r = e.currentTarget.getBoundingClientRect();
                            anchor = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
                          } catch (_e) {}
                          itemDetailBus.open({ kind: 'loadout', slot: selSlot.pickerSlot, anchor, panel: null });
                        }}
                        style={{
                          /* On the frame the button no longer needs a fill to
                             separate it from the row — the frame IS the fill,
                             so it reads as a control cut into the rim. */
                          flex: 'none', padding: '2px 8px', borderRadius: 999,
                          background: 'transparent', border: `1px solid ${rimCol}`,
                          color: rimCol, fontFamily: 'inherit',
                          fontSize: 11, fontWeight: 800, letterSpacing: '.04em',
                          cursor: 'pointer',
                        }}>CHANGE</button>
                    )}
                    {/* ═══ v2.3.2143: TAKE THE CAPE OFF FROM ITS OWN SLOT ═══
                        Owner: "the bug of it not disappearing from bag after
                        equipping ... still isn't working".  Hiding the worn
                        cape from the bag (bagModel.js, same version) removes
                        the ONLY unequip control the cape ever had -- tapping
                        that bag item is what opened the wear/remove popup --
                        so the control has to reappear somewhere, and the slot
                        you are already looking at is where every other game
                        puts it.

                        Same shape as CHANGE, different verb, because it is a
                        different act: CHANGE opens a picker over a list you
                        may choose from; a cape is a PRIZE with a list of one,
                        so the only thing you can do to it is stop wearing it.
                        Sending `worn: false` leaves the server's ownership
                        ledger alone (_capeOwnedBy) and only sets ps.capeOff,
                        so the cape returns to the bag and the slot ghosts --
                        and putting it back on is a tap on that bag item. */}
                    {selSlot.unequipCape && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            const St = getState();
                            if (St && St.channel) St.channel.send({ type: 'cape_equip', payload: { worn: false } });
                          } catch (_e) { /* offline: the next player_state is the truth anyway */ }
                        }}
                        style={{
                          flex: 'none', padding: '2px 8px', borderRadius: 999,
                          background: 'transparent', border: `1px solid ${rimCol}`,
                          color: rimCol, fontFamily: 'inherit',
                          fontSize: 11, fontWeight: 800, letterSpacing: '.04em',
                          cursor: 'pointer',
                        }}>REMOVE</button>
                    )}
                  </div>
                  {/* ═══ v2.3.1845: THE ITEM, THEN ITS STATS ═══
                      Owner: "put a larger view of the item selected before
                      you list its stats to the right of it inside the card."

                      Same idea as the character on the left of this row, one
                      level down: the thing itself gets a well of its own, and
                      the numbers about it sit beside it rather than filling
                      the card on their own.

                      `sl.iconSrc` rather than a second art lookup: that is
                      the exact URL the gear cell to the left is showing, so
                      the big view and the little one cannot disagree.  It is
                      also where v2.3.1845's bow bug lived — this card would
                      have shown the same wrong art at four times the size.

                      v2.3.1846: the stats are a LABEL/VALUE LIST, per the
                      owner's mockup, rather than the two centred tiles that
                      were here.  Tiles cost a border and 8px of padding EACH
                      to say two words; a list fits four rows in the height
                      two tiles took, which is what makes room for SPEED and
                      RANGE to exist at all. */}
                  <div style={{
                    flex: 1, minHeight: 0, borderRadius: 8,
                    background: COL.well,
                    padding: 5,
                    display: 'flex', alignItems: 'stretch', gap: 7,
                  }}>
                    {!selSlot.ghost && selSlot.iconSrc && (
                      <div style={{
                        flex: 'none', width: ART_W, minHeight: 0,
                        borderRadius: 7,
                        background: COL.raised, border: `1px solid ${COL.tileBor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        <img src={selSlot.iconSrc} alt="" draggable={false}
                          style={{ width: '90%', height: '90%', objectFit: 'contain',
                            pointerEvents: 'none' }} />
                      </div>
                    )}
                    <div style={{
                      flex: 1, minWidth: 0, minHeight: 0,
                      display: 'flex', flexDirection: 'column',
                      justifyContent: 'center', gap: 2,
                    }}>
                      {rows.length ? rows.map(statRow) : (
                        <div style={{
                          fontSize: 11, fontWeight: 600, color: COL.muted,
                          textAlign: 'center',
                        }}>{selSlot.ghost ? 'Nothing equipped here.' : 'No stat bonuses.'}</div>
                      )}
                    </div>
                  </div>
                  {/* The strip along the bottom of the mockup: what this ONE
                      item adds on top of its base numbers — a forge reforge,
                      a harden, an element, a socketed gem.  Nothing in the
                      starter kit has any, so it is absent far more often than
                      it is present, and it is omitted rather than drawn empty:
                      a blank band reads as a stat whose value failed to load. */}
                  {bonuses.length > 0 && (
                    <div style={{
                      flex: 'none', display: 'flex', flexWrap: 'wrap',
                      justifyContent: 'space-between', gap: 4, padding: '0 2px',
                    }}>
                      {bonuses.map((b) => (
                        <span key={b} style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: '.02em',
                          color: COL.text2, whiteSpace: 'nowrap',
                        }}>{b}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ═══ v2.3.1878: THE STATS MOVED UP HERE ═══
                    Owner: "Do a layout design change to make room for the
                    stats you have to scroll to see on the char menu",
                    with a reference shot showing them beside the gear.

                    They were in a block BELOW this row, and measured on a
                    390x844 iPhone that block was entirely past the fold: the
                    sheet body is 191px tall, the Equipment tab wanted 299,
                    and all seven stats sat in the 108px that did not fit.
                    Nothing cued that they were there — this panel's
                    scroll-edge fade is deliberately off (see the v2.3.1697
                    note on the grid) — so the tab read as though the game
                    simply had no stat readout.

                    The room was already in this column and being wasted.  It
                    is 3*EQ_W + 2*DASH_GAP = 146px tall because it matches the
                    gear grid beside it, and it was spending all of that on
                    three ~14px bars centred in it: ~85px of empty column, in
                    a tab that was 108px short.  So the bars go to the TOP and
                    the stats take the space under them, which is very nearly
                    the whole deficit and is why the tab now fits with no
                    scroll at all rather than merely scrolling less.

                    The item card still takes this whole column when a slot is
                    selected (v2.3.1843, the owner's own suggestion) — that is
                    the branch above, and it is unchanged.  Tapping a slot now
                    covers the stats as well as the vitals, which is the same
                    trade the owner already accepted for the vitals: both come
                    straight back when the slot is tapped closed. */
                <>
                  {/* Centred in its section, as asked. */}
                  {/* v2.3.1922: STRETCH, not centre.  The rows carry a
                      flex:1 bar now, and a column that shrink-wraps its
                      children gives that bar nothing to fill — the bars came
                      out hairlines on the first attempt.  The rows are
                      left-aligned internally, so stretching is also what puts
                      the three letters in a column. */}
                  <div style={{
                    flex: 'none', display: 'flex', flexDirection: 'column',
                    alignItems: 'stretch', justifyContent: 'center',
                  }}>
                    {/* v2.3.2520: HP is scaled (§5.8 D2); EN and MP below are NOT. */}
                    {compactVital('hp', toDisplayHp(R.hp || 0), toDisplayHp(R.maxHp || 100))}
                    {compactVital('stamina', R.stamina || 0, R.maxStamina || 100)}
                    {compactVital('mana', R.mana || 0, R.maxMana || 100)}
                  </div>
                  {/* v2.3.2171: sideways the lists live BELOW the row (the
                      owner's "put stats beneath that"), so the divider and
                      the in-column copy render in portrait only — one copy
                      of the numbers on screen, ever. */}
                  {!landPane && <div style={{ height: 1, background: COL.tileBor, flex: 'none', margin: '2px 0' }} />}
                  {/* ═══ v2.3.1890: TWO COLUMNS, NOT A GRID OF BOXES ═══
                      Owner: "every stat is being treated as its own card...
                      I'd switch to a character-sheet/list format".

                      Side by side rather than stacked because offense has four
                      rows and defense three: stacked they cost 7 rows plus two
                      headings, and beside each other they cost 4 plus one. In
                      a 146px column that difference is most of the budget. */}
                  {!landPane && (
                  <div style={{
                    flex: 1, minHeight: 0, display: 'flex',
                    alignItems: 'flex-start', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {groupHead('Offense')}
                      <div style={{ marginTop: 2 }}>{offenseCells()}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {groupHead('Defense')}
                      <div style={{ marginTop: 2 }}>{defenseCells()}</div>
                    </div>
                  </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* v2.3.2171 (owner: "put stats beneath that"): the landscape
              pane's stat block — the same two lists, under the figure row
              at the pane's full width, in the vertical room the sideways
              column actually has.  Always rendered sideways, item card open
              or not: down here the card no longer needs their space. */}
          {landPane && (
            <div style={{ flex: 'none', display: 'flex', alignItems: 'flex-start', gap: 14, paddingTop: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {groupHead('Offense')}
                <div style={{ marginTop: 3 }}>{offenseCells()}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {groupHead('Defense')}
                <div style={{ marginTop: 3 }}>{defenseCells()}</div>
              </div>
            </div>
          )}

          {/* v2.3.1878: the "Your stats" block that stood here is GONE — the
              seven cells moved into the vitals column above, where there was
              already ~85px of unused height.  It is not merely relocated: the
              block had a header, its own 6px top margin and a full-width
              4-column grid, and all of it sat past the fold on a 390x844
              phone.  Dropping the header with it is deliberate — the tiles
              are self-labelling and the column they now live in is plainly
              the character's, so a heading spends height to say what the
              content already says.

              v2.3.1843's note, kept because the reasoning still binds: the
              scrollIntoView v2.3.1842 added here was removed because the
              scroll pushed this row up behind the subtab bar and cut off the
              character's head and the HP bar.  The card moves into the row
              instead.  Nothing in this tab scrolls now. */}
        </>
      )}

      {/* ═══ v2.3.1668: PROG3 BUILD — one screen, no scrolling ═══
          Owner: "all stats allocable within the active primary combat
          stat can be seen all at once without scrolling."

          The v2.3.1660 version was a vertical list of 7 rows plus a
          points chip plus 3 skill cards — measured at 352px against a
          145px body (≈111px once a real iPhone's home-indicator inset is
          paid), so FIVE of the seven stats sat below a fold that has no
          scroll cue (the panel's edge-fade mask is deliberately off).
          A list cannot be made to fit; this is a grid.

          Layout: one 28px row carrying the combat-type selector AND the
          point count, then a 3-column grid. The first row of cells is
          the SELECTED TYPE's offense (accented); the rest are the shared
          body stats. Whole cells are the tap target — a separate [+]
          button costs width three columns cannot spare, and a 120x30
          cell is a better thumb target than a 30px button anyway. */}
      {/* ═══ v2.3.2176: THE POINTS SCREEN IS AN ACCORDION ═══
          Owner, with a mockup and the reasoning behind it: "The core thing
          the player is doing is not 'editing Bow stats' or 'editing global
          stats.' They are doing: I earned a point.  Where do I want to spend
          it?  So I would organize the whole screen around the source of the
          point."  Three weapon lanes, one open at a time, and everything
          those points can buy lives physically inside the open lane.

          WHAT REPLACES WHAT.  The v2.3.1703/1710 run of seven identical
          pills under a separate combat-type selector row is gone; `buildCat`
          — which has always meant "whose offense am I looking at" — is now
          the accordion's open lane, so the selector and the section header
          are the same control.  Nothing underneath changed: the same
          prog3_allocate send, the same prog3StatCap gate; the press-to-peek
          preview became the ℹ️ window in v2.3.2222.

          THE POOL IS ONE POOL, and that is why the mockup's per-lane
          numbers are not here.  The owner, asked directly: "There is a
          points per weapon number IF you're allocating to offensive
          capabilities specific to that weapon.  Otherwise you can allocate
          to global defense numbers (hp, defense, dodge, etc) that's the way
          it works now."  So the ALLOCATION is per weapon (crit is Bow's
          crit) while the pool is shared — server/src/prog3.js: "points spent
          on Melee's crit are points not spent on Magic's."  Printing "2
          POINTS" on Bow and "1 POINT" on Melee would describe a game this
          is not.  The pool prints ONCE, above the lanes; each lane's own
          right-hand number is its trained LEVEL, which really is per weapon.

          CHARACTER, not "global" (owner): "'Global' is developer/system
          language.  'Character' immediately tells the player: this upgrades
          me, not my bow."

          THE SEVEN CONTROLS ARE STILL SEVEN, all one size, all on screen at
          once — mp-prog3 has asserted exactly that since v2.3.1710 (the
          owner's "should all be the same size") and the two columns are
          1fr/1fr so uniformity is structural rather than tuned.  The [+] is
          DECORATIVE: the whole row is the tap target, which is the v2.3.1668
          reasoning ("a 120x30 cell is a better thumb target than a 30px
          button") and also keeps the count at seven. */}
      {section === 'Build' && p3 && (
        <>
          {(() => {
            /* v2.3.1766: what the tooltip strip below is currently describing.
               Held on the component (not a ref) so the strip re-renders when
               it changes; null = resting, which shows overall DPS instead. */
            const n1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
            /* ═══ v2.3.2525: DPS KEEPS THE RESOLUTION THE SCALE TOOK (owner) ═══
               Owner: "Decimals are fine for tuning combat skills."  DPS is a
               tuning number, not a damage number, and v2.3.2520 divided it by
               DISPLAY_SCALE_K without widening the format — so a real gain of
               +0.08 real DPS printed "+0.0" and a point that genuinely helped
               looked like it did nothing.  One more decimal restores exactly
               what the k = 5 divide removed (1 dp at 5x = 2 dp here). */
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
            const openStatInfo = (st, cat, spend) => {
              try {
                /* v2.3.2592: the row says WHICH lane it belongs to now (four are
                   on screen at once); a shared row belongs to none and takes
                   the weapon in hand for its numbers, as before. */
                const laneCat = st.atk ? (cat || buildCat) : prog3ActiveCat(R);
                /* v2.3.2597: infoKey first — a shortened label may collide with
                   another stat's glossary entry (see prog3.js). */
                const info = statInfo(st.infoKey || st.label) || { title: st.label, body: st.perText + ' per point.' };
                const pv = R ? previewStatPoint(R, st.key, laneCat) : null;
                /* The row carries the NUMBER and, for a percentage, its sign
                   ("0.8% -> 1.2%", "40.0 -> 48.0"): the row's full unit is
                   prose ("% less damage", " power") and it ran the Defense
                   and Elemental rows off the card's right edge (390px
                   captures).  The label names the stat and the rate line
                   above the scene says the words, so the row need not. */
                const fmt = (v) => (st.pct ? n1(v * 100) + '%' : n1(v));
                const rows = [];
                if (pv) {
                  rows.push({ label: st.key === 'luck' ? 'Crit chance' : info.title, now: fmt(pv.statNow), after: pv.capped ? null : fmt(pv.statAfter) });
                  /* v2.3.2592: LUCK buys two things per point; the second half
                     gets its own row so "what will my crit damage BE" is
                     answered beside "what will my crit chance BE". */
                  if (typeof pv.statNow2 === 'number') {
                    rows.push({ label: 'Crit damage', now: '+' + n1(pv.statNow2 * 100) + '%',
                      after: pv.capped ? null : '+' + n1(pv.statAfter2 * 100) + '%' });
                  }
                  if (typeof pv.dpsDelta === 'number') {
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
                      ? { label: 'DPS', now: n2(pv.dpsNow), after: n2(pv.dpsAfter), delta: '+' + n2(pv.dpsDelta) }
                      : { label: 'DPS', now: n2(pv.dpsNow), after: null, delta: st.dpsNote || 'does not change damage' });
                  } else {
                    rows.push({ label: 'DPS', now: '—', after: null, delta: 'equip a weapon to see' });
                  }
                }
                infoPopupBus.open({
                  title: info.title + (st.atk
                    ? ' · ' + ((PROG3_SKILL_META.find((k) => k.key === laneCat) || {}).label || '')
                    : ' · Shared'),
                  body: info.body, note: info.note,
                  perText: 'Each point: ' + st.perText,
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
                  demo: STAT_DEMO_KEYS.includes(st.key)
                    ? <StatDemo stat={st.key} iconSrc={st.iconSrc}
                        weapon={R ? (st.atk ? weaponForCat(R, laneCat) : getActiveWeapon(R)) : null}
                        shield={!!(R && R.shield)} />
                    : null,
                  rows, capped: !!(pv && pv.capped),
                  /* The spend lives at the bottom of the explainer now.  When
                     there is nothing to buy the button STAYS and refuses with
                     the reason — the owner's "grayed out with that
                     explanation" — because explaining is this window's first
                     job and it must open on a capped stat too. */
                  action: spend ? {
                    label: 'Spend point',
                    blocked: spend.blocked,
                    run: spend.run,
                  } : undefined,
                });
              } catch (e) { /* an explainer must never block a spend */ }
            };
            /* Short forms for the collapsed lane summary only — the mockup's
               "CRIT 2/4  DMG 1/4  SPD 0/4".  The rows themselves keep the
               full labels.  v2.3.2199: the new flat-damage stat takes DMG;
               critDmg (which had borrowed it) becomes CRIT+. */
            /* v2.3.2592: the collapsed-lane recap those short forms fed is gone
               with the accordion — every lane is open, always. */
            /* v2.3.2176: does this worker channel points?  Without the cap
               there is no breakdown to read, so everything falls back to the
               single shared pool the old worker enforces (rule 19). */
            const chanCaps = !!(S && S._serverCaps && S._serverCaps.prog3Chan);
            /* What the OPEN lane can spend.  An offense row is buyable only
               from its own lane's points -- the owner's rule -- and a body
               row spends from the lane you are standing in, so both read the
               same number. */
            /* ═══ v2.3.2592: TWO POOLS, FOUR COLUMNS ═══
               Owner: "for every point earned through one of the 3 combat
               channels, you earn one 'shared' point too.  You get both points
               but only the point earned in the combat channel can be spent
               there (the point for shared can be allocated to any in that
               shared pool)."
               laneAvail(cat) is what a weapon column can spend — its own
               channel plus the legacy unchannelled remainder — and sharedAvail
               what the Shared column can.  Against a worker WITHOUT the shared
               pool (no caps.prog3shared) prog3PoolShared answers with the
               lane total that worker still lets a body spend draw on, so the
               column is honest in either deploy order (rule 19). */
            const sharedCaps = isProg3SharedEnabled();
            const laneAvail = (cat) => (chanCaps ? prog3PoolFor(R, cat) : totalUnspent);
            const sharedAvail = sharedCaps ? prog3PoolShared(R) : (chanCaps ? prog3PoolShared(R) : totalUnspent);
            /* The Shared column's picture: the character's own bust, drawn by
               BottomDashboard into portraitStore; the sheet's knight art
               until it has been. */
            const sharedIcon = portraitStore.get() || (S && S.myAvatar) || SHARED_ICON_FALLBACK;
            /* v2.3.2597: the open category, resolved from the key.  A stale key
               (a lane that stopped existing between renders) falls back to the
               grid rather than to a blank card. */
            const selLane = selCat ? (POINT_LANES.find((c) => c.key === selCat) || null) : null;
            /* What a column HEADER says when tapped: the skill it belongs to,
               its level, and what its points may buy.  The dashboard's combat
               pills open the same explainer (DashColumns), so the two screens
               say one thing about one skill. */
            const openLaneInfo = (col) => {
              try {
                if (col.shared) {
                  const n = sharedAvail;
                  infoPopupBus.open({
                    title: `Shared — Level ${prog3CharLevel(R)}`,
                    body: sharedCaps
                      ? 'Every level-up in any combat skill also earns shared points. They buy the stats that belong to your character rather than to one weapon: HP, Defense, Mana, Stamina, Dodge, Speed and Resist.'
                      : 'The stats that belong to your character rather than to one weapon: HP, Defense, Mana, Stamina, Dodge and Resist. Any combat point can be spent here.',
                    note: n > 0 ? `You have ${n} shared point${n === 1 ? '' : 's'} to spend.` : 'Level up any combat skill to earn more.',
                  });
                  return;
                }
                const info = skillInfo(col.key);
                const lvl = prog3SkillLevel(R, col.key);
                const n = laneAvail(col.key);
                infoPopupBus.open({
                  title: `${info ? info.title : col.label} — Level ${lvl}`,
                  body: (info ? info.body + ' ' : '') + `Its points buy only this weapon's six stats: Range, Power, Speed, Luck, Special and Elemental.`,
                  note: n > 0 ? `You have ${n} ${col.label} point${n === 1 ? '' : 's'} to spend.` : `Fight with a ${col.label.toLowerCase()} weapon to earn more.`,
                });
              } catch (e) { /* an explainer must never block a spend */ }
            };
            /* v2.3.2525: n2 moved up beside n1 (the DPS readouts above need it
               too) — one copy, per the no-second-copy rule cited just above. */
            /* The stat's own live value, in its own unit.  Falls back to the
               allocated total for the stats that have no separate readout, so
               a cell never renders blank. */
            const statValueText = (st, cat) => {
              try {
                if (st.atk) {
                  /* v2.3.2592: POWER prints the lane's OWN weapon's range (four
                     lanes are on screen; the active weapon's number in all
                     three would be a lie in two of them), and the allocated
                     bonus alone for a lane with nothing in its slot. */
                  if (st.key === 'dmg') {
                    const w = R ? weaponForCat(R, cat) : null;
                    const r = w ? calcDisplayDmgRange(R, w) : null;
                    if (r && r.text) return String(r.text);
                    return '+' + toDisplayDamage(prog3AtkPts(R, cat, 'dmg') * PROG3.ATK.dmg.per);
                  }
                  if (st.key === 'luck') return pct1(prog3CritPct(R, cat)) + '%';
                  if (st.key === 'range') return '+' + Math.round(prog3AtkPts(R, cat, 'range') * PROG3.ATK.range.per * 100) + '%';
                  if (st.key === 'special') return '+' + Math.round(prog3AtkPts(R, cat, 'special') * PROG3.ATK.special.per * 100) + '%';
                  if (st.key === 'crit') return pct1(prog3CritPct(R, cat)) + '%';
                  if (st.key === 'critDmg') return Math.round(prog3CritMult(R, cat) * 100) + '%';
                  /* v2.3.2512: elemental power, per weapon — the effective
                     "power" the burn/root/collision formulas read, through the
                     one shared reader rather than a fourth inline copy. */
                  if (st.key === 'elem') return String(Math.round(prog3ElemPower(R, cat)));
                  if (st.key === 'aspd') {
                    /* swingCooldownMultFor is a PERIOD multiplier (1 at rest,
                       0.50 at cap).  Players read attack speed, not swing
                       period, so it is inverted -- 1.00 rising to 2.00. */
                    /* cat is already 'sword'|'bow'|'staff' and prog3CatFor
                       maps each of those to itself, so the lane id is a valid
                       weaponType for this call. */
                    const mult = swingCooldownMultFor(R, cat);
                    return n2(mult > 0 ? 1 / mult : 1);
                  }
                }
                if (st.key === 'move') return '+' + Math.round(prog3Pts(R, 'move') * PROG3.BODY.move.per * 100) + '%'; /* v2.3.2592 */
                if (st.key === 'hp') return String(toDisplayHp((R && R.maxHp) || 0));   /* v2.3.2520: display scale */
                if (st.key === 'stam') return String(Math.round((R && R.maxStamina) || 0));
                if (st.key === 'def') return pct1(d ? d.defPct : 0) + '%';
                if (st.key === 'dodge') return pct1(d ? d.dodge : 0) + '%';
                /* v2.3.2512: elem is an ATK stat now and is answered in the
                   st.atk block above; what lands here is the two body stats
                   that arrived with it.  MAX MANA reads the live pool (the
                   same field the mana bar draws from, so the two screens
                   cannot disagree); ELEM RESIST reads its own percentage. */
                if (st.key === 'mana') return String(Math.round((R && R.maxMana) || 0));
                if (st.key === 'eres') return pct1(prog3Pts(R, 'eres') * (PROG3.BODY.eres ? PROG3.BODY.eres.per : 0)) + '%';
              } catch (e) { /* a readout must never take the screen down */ }
              return '—';
            };
            /* ═══ v2.3.2597: SIDEWAYS THE CARD IS ~191px, NOT ~370 ═══
               The landscape pane is a fixed dashboard column whatever the
               viewport width — measured, the overflow at 844x390 and 800x360 is
               identical to the pixel.  At that width "Elemental" + icon +
               value + [+] overflowed by 47.8px.  So sideways the card takes
               SHORT NAMES, which is what this file did for narrow columns
               before (the retired NARROW_TITLE map) rather than a new
               invention.  The aria-label keeps the full stat name, so nothing a
               screen reader or a scenario reads is shortened. */
            /* ═══ v2.3.2597: THE STAT'S COLOUR, AT FULL STRENGTH ═══
               `?p3colour=0` turns it off, for the side-by-side the owner asked
               for ("show the owner coloured and uncoloured versions").  On by
               default because they asked to see it.
               Why a 4px spine and not the cell's background: a pastel
               composited over this dark cell loses all but `alpha` of its
               separation — at the 0.15 accentFill already uses, 70 of the 78
               pairs fall under the CIEDE2000 floor — and the alpha that would
               keep them apart fails the title's contrast.  Full strength on a
               small area is the only place both survive.  See prog3.js. */
            const colourOn = (() => {
              try { return !/[?&]p3colour=0\b/.test(window.location.search); } catch (e) { return true; }
            })();
            const CELL_BORDER = '#9AA7AC';
            const CARD_ROW_H = landPane ? 42 : 46;
            /* ═══ SIDEWAYS, MEASURED RATHER THAN GUESSED ═══
               The landscape card is 191px and its row 177px. The first cut
               spent 26 (icon) + 40 (value) + 7 (orb) + 52 ([+]) + 20 of gaps +
               11 of padding of that, leaving the LABEL 19px — which is why
               even "Luck" ellipsised. Each of these is trimmed just enough to
               hand the label ~43px, which fits "Resist", the longest short
               name, at 11.5px. */
            /* ═══ v2.3.2597: WHAT TWO COLUMNS COST, MEASURED ═══
               The owner asked to TRY two columns and then paid for them by
               moving the stat values out to the confirm. Measured after both
               changes, at 360 with the [+] still at its reference width:

                 cell 163px = icon 30 + orb 7 + [+] 60 + gaps 21 + padding 14
                 leaves the LABEL 29px, and "Element" needs 61.81.

               So two columns do NOT fit at 360 with the [+] as the reference
               draws it. Something has to give and it is the [+] and the icon:
               44 and 24 leave the label 66px at 360, which clears "Element"
               with 4px to spare and "Special" with 13.
               That is the honest trade and the owner should see it: two columns
               cost a [+] about a quarter narrower than the shot, and an icon a
               fifth smaller. `?p3cols=1` renders the same card in ONE column
               with the [+] at its full 60 for the comparison. */
            const forceOneCol = (() => {
              try { return /[?&]p3cols=1\b/.test(window.location.search); } catch (e) { return false; }
            })();
            /* ═══ AND TWO COLUMNS NEED A FLOOR ═══
               Measured at 360 and 390 and shipped; mp-statcols then swept 320,
               which this repo tests, and found every label clipped — "Element"
               wanting 62px of a 44px box, "Special" 55, even "Range" 47.  The
               cell there is 143px and, once the icon, orb, [+], gaps and
               padding have taken theirs, 46px is all the label can have.
               There is nothing left to trim: the [+] is already down to 44 from
               the reference's 60 to buy two columns at all.
               So two columns have a floor, the way prog3TwoCol did at 375
               before this screen was rebuilt — "a layout that only fits the big
               phone is not shipped".  Below it the card is one column, which
               fits every label at every width and costs only scrolling.
               360, not 375: at 360 the label box is 64px and "Element" needs
               61.81, measured, so the boundary is set where the widest label
               actually stops fitting rather than at a round number. */
            const twoCol = !landPane && !forceOneCol && panelVw() >= 360;
            const CARD_SHORT = { dmg: 'Power', range: 'Range', aspd: 'Speed', luck: 'Luck',
              special: 'Spec', elem: 'Elem', hp: 'HP', def: 'Def', mana: 'MP', stam: 'Stam',
              dodge: 'Dodge', move: 'Move', eres: 'Resist' };
            /* ═══ v2.3.2611: ONE LABEL DOES NOT FIT TWO COLUMNS ═══
               Found while measuring the [+]'s clearance, and it pre-dates this
               branch: at 360 in two columns a cell leaves 67px for the label,
               and "Max Mana" needs 76.4 at 13px/800 — so it has been rendering
               as an ellipsis. (On main it had 63px, 13.4 short; taking the
               right padding off the row gave 4 of that back and no more.)
               Nothing caught it because the sub-pixel clip check only ran on
               the first card opened, which is a weapon, and every weapon label
               is short. The shared card was never measured. It is now.
               Every other label fits with room: Stamina 62.2, Defense 61.7,
               Max HP 56.6. So this shortens the ONE that does not, and only
               where the squeeze exists — "Max MP" reads as the pair of "Max HP"
               sitting next to it, which is the whole reason "Max Mana" was
               spelled out in the first place.
               Shrinking the type instead would have taken every label to 11px,
               the readability floor, to fit one of them; shrinking the icon or
               the [+] undoes what the owner asked for in v2.3.2599 and here. */
            const CARD_TIGHT = { mana: 'Max MP' };
            const cardLabel = (st) => (landPane ? (CARD_SHORT[st.key] || st.label)
              : (twoCol ? (CARD_TIGHT[st.key] || st.label) : st.label));
            /* ═══ v2.3.2599: THE STAT ICON, AS LARGE AS THE CELL HOLDS ═══
               Owner: "make the stat icons larger."  The pressure that made this
               hard is gone on three counts — the VALUES left the cell
               (v2.3.2597), the labels became single words, and now the ORB has
               gone too, which hands back its 7px plus its gap.
               The budget at 360, the tight case: cell 163, less 2 of border, 10
               of padding, 8 of gaps and the 44px [+] leaves 99 for the label and
               the icon together, and "Element" — the longest label — wants
               61.81 of it.  So 36 is what fits with room to spare, and a full-
               width row (one column, or landscape) can take 44.
               AGAINST THE ORIGINAL ASK: the cell icon was 13px when the owner
               asked for "about 3x".  36 is 2.8x at 360 and the one-column row's
               44 is 3.4x — so 3x is reachable now, which it was not when the
               question was first asked. */
            const CARD_ICON = twoCol ? 36 : 44;
            const CARD_GAP = twoCol ? 4 : 7;
            const CARD_PLUS_W = twoCol ? 44 : 60;
            /* ═══ THE [+] IS THE WHOLE THUMB TARGET NOW ═══
               The reference draws it 28.5px tall in a 46.6px row, and that was
               fine while the row itself was also tappable. The owner has since
               made the row body inert — "Make the cell body not launch any
               window anymore ... (points or not)" — so the [+] is the ONLY
               control in the row, and a 26px-tall one is well under the 44pt
               iOS floor mp-prog3 pins. It takes the row's full height instead:
               visually still the shot's wide gold button, but a target a thumb
               can actually land on. This is a deliberate departure from the
               shot and the reason is the owner's own later instruction. */
            const CARD_PLUS_H = CARD_ROW_H - 2;
            const CAT_ICON = landPane ? 28 : 40;
            const GRID_H = landPane ? 44 : 52;

            /* ═══ THE 2x2 GRID ═══
               Icon left, name over point count right, exactly as the shot.
               The gold ring marks the weapon you are actually HOLDING: in the
               shot MELEE is ringed while BOW has more points, so the ring is
               not "most points" — and "the weapon you were just swinging" is
               the reading this file already used for buildCat since v2.3.1668.
               Shared never carries it; it belongs to no weapon.

               CONTRACTS KEPT FROM THE COLUMN HEADERS, because four scenarios
               resolve through them: `[data-prog3-lane]` with a `, level N`
               aria-label, and exactly ONE `[aria-label*="points to spend"]`
               per lane (hidden at zero — "points allocable (if any)"). */
            const catGrid = () => (
              <div data-prog3-grid style={{
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, minWidth: 0,
              }}>
                {POINT_LANES.map((col) => {
                  const shared = !!col.shared;
                  const pts = shared ? sharedAvail : laneAvail(col.key);
                  const lvl = shared ? prog3CharLevel(R) : prog3SkillLevel(R, col.key);
                  const held = !shared && prog3ActiveCat(R) === col.key;
                  return (
                    <div key={col.key} role="button"
                      data-prog3-lane={col.key}
                      aria-label={`${col.label}, level ${lvl}`}
                      title={`${col.label} — level ${lvl} — ${pts} point${pts === 1 ? '' : 's'} to spend`}
                      {...scrollTap(() => setSelCat(col.key))}
                      style={{
                        height: GRID_H, boxSizing: 'border-box', minWidth: 0,
                        display: 'flex', alignItems: 'center', gap: 7, padding: '0 8px',
                        border: `${held ? 2 : 1}px solid ${held ? COL.accent : pts > 0 ? COL.accent : COL.tileBor}`,
                        borderRadius: 10,
                        background: pts > 0 ? COL.accentFill : COL.wellSoft,
                        boxShadow: held ? 'none' : 'inset 0 1px 3px rgba(0,0,0,.28)',
                        cursor: 'pointer', touchAction: 'manipulation', overflow: 'hidden',
                      }}>
                      <img src={shared ? sharedIcon : col.iconSrc} alt="" draggable={false}
                        onError={shared ? (e) => { if (e.currentTarget.src.indexOf(SHARED_ICON_FALLBACK) < 0) e.currentTarget.src = SHARED_ICON_FALLBACK; } : undefined}
                        style={{
                          width: CAT_ICON, height: CAT_ICON, flex: 'none', pointerEvents: 'none',
                          objectFit: shared ? 'cover' : 'contain',
                          borderRadius: shared ? 6 : 0, imageRendering: shared ? 'pixelated' : undefined,
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.45))',
                        }} />
                      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                        <span style={{
                          fontSize: landPane ? 12 : 13, fontWeight: 800, letterSpacing: '.04em',
                          textTransform: 'uppercase', lineHeight: 1,
                          color: pts > 0 ? COL.accent : COL.text,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                        }}>{col.label}</span>
                        <span aria-label={`${pts} points to spend on ${col.label}`}
                          style={{
                            fontSize: 11.5, fontWeight: 700, lineHeight: 1.1, color: COL.text2,
                            fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                            visibility: pts > 0 ? 'visible' : 'hidden',
                          }}>{pts} PT{pts === 1 ? '' : 'S'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );

            /* ═══ ONE STAT ROW ═══
               Label left, icon, live value, and the wide [+] down the right
               edge — the shot's arrangement.

               THE ROW BODY DOES NOTHING.  Owner: "Make the cell body not launch
               any window anymore ... (points or not)".  That REVERSES
               v2.3.2595, which had deliberately moved the explainer onto the
               cell body, and the reversal is the owner's on a design they drew.
               So `data-stat-info` moves again — onto the [+] — because what
               mp-statdemo and mp-statpeek mean by that handle is "the thing you
               press to be told about this stat", and that is now the [+]. The
               selector and its meaning survive; only the element moved.

               THE [+] IS GREY BUT ALIVE when there is nothing to spend: it
               still opens the window, which still explains the stat, and the
               commit button inside it is what refuses, with the reason. So it
               carries no `disabled` attribute and no `pointer-events: none` —
               either would make it look right and be broken. */
            const catRow = (st, cat) => {
              const pts = st.atk ? prog3AtkPts(R, cat, st.key) : prog3Pts(R, st.key);
              const cap = prog3StatCap(R, st.key);
              const canSpend = (st.atk ? laneAvail(cat) : sharedAvail) > 0 && pts < cap;
              /* The v2.3.2329 land-flare memory, unchanged — same key, same
                 1300ms window. */
              const lk = (st.atk ? cat + ':' : 'shared:') + st.key;
              return (
                /* ═══ v2.3.2597: THE ROW IS NO LONGER THE BUTTON ═══
                   It was, from v2.3.1668 to v2.3.2595 — the whole cell spent,
                   and `[role="button"][aria-label*=" of "]` found the ROW.  The
                   owner has since made the body inert and the [+] the only
                   control, so that contract selector now legitimately finds the
                   [+] (44px) and not the row (163px), which is what broke
                   mp-ptorb's orb check and mp-statcols' width measurement:
                   both were measuring a button while believing it was a row.
                   The row keeps a handle of its own so "the row" stays
                   addressable for what is genuinely about the row — its orb,
                   its width, its height. */
                <div key={lk} data-prog3-row={lk} style={{
                  flex: 'none', width: '100%', minWidth: 0, height: CARD_ROW_H, boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', gap: CARD_GAP,
                  /* ═══ v2.3.2611: NO RIGHT PADDING — THE [+] IS FLUSH ═══
                     Owner: "Move plus sign to the very edge of the cell there's
                     some space showing."  Measured before touching anything:
                     the [+]'s gaps to the cell's border box were top 1, bottom
                     1, right 5, and the 5 is 1px border + 4px RIGHT PADDING.
                     The [+] is the last flex child, so the row's right padding
                     lands entirely on it — that is the space, not a stray
                     margin or the radius. Padding goes to 0 on the right only;
                     the top/bottom 1 stays because that IS the grey border, and
                     the [+] belongs inside it.
                     Two things fall out of it: the [+] gains those 4px of
                     width, and so does the label — the 360 two-column row that
                     had exactly 0px of leftover (v2.3.2602) now has 4. */
                  padding: twoCol ? '0 0 0 6px' : (landPane ? '0 0 0 6px' : '0 0 0 9px'),
                  /* ═══ v2.3.2598: THE WHOLE CELL CARRIES THE STAT'S COLOUR ═══
                     Owner: "Don't make just the edge of the cell the different
                     colors make the whole background those different colors for
                     each stat."  So the 4px spine of v2.3.2597 becomes a full
                     opaque fill.
                     An OPAQUE fill is a different problem from the tint that
                     was rejected earlier: that one collapsed because
                     compositing keeps only `alpha` of the distance between two
                     colours, and at alpha 1 the separation is whatever the
                     palette has — 2 of 78 pairs under the floor, both the
                     owner's own.  What a fill breaks instead is TEXT, and the
                     answer is to flip it: measured, #20170D on these thirteen
                     runs 6.79:1 (Element, the darkest fill) to 15.52:1 (Power),
                     all clear of AA 4.5.  See tools/qa/mp/palette-fill.mjs. */
                  background: (colourOn && st.tint) ? st.tint
                    : (canSpend ? COL.accentFill : COL.wellSoft),
                  /* ═══ v2.3.2600: A GRAY BORDER AROUND EVERY CELL ═══
                     Owner's ask, and it does a job the fill cannot: thirteen
                     deep colours butted against each other and against the dark
                     sheet need an edge, or a cell's boundary is wherever its
                     colour happens to stop.
                     #9AA7AC is chosen for the worst case rather than the easy
                     one — measured against all thirteen fills AND the
                     uncoloured cell it runs 2.6:1 (Special, the closest) to
                     6.3:1, so the outline reads on every stat.  The darker
                     grays tried first sat at 1.4:1 against Special and Move and
                     simply disappeared on them. */
                  border: `1px solid ${CELL_BORDER}`,
                  borderRadius: 9, overflow: 'hidden',
                }}>
                  <span style={{
                    /* ═══ v2.3.2602: THE LABEL NO LONGER EATS THE ROW ═══
                       Owner: "center the icon between the label and the plus
                       sign on each cell."  The label was `flex: 1`, so it grew
                       to fill everything the icon and [+] did not use and the
                       icon ended up jammed against the [+] with no gap to be
                       centred in.  `0 1 auto` makes it its own width and STILL
                       shrinks with an ellipsis when the cell is too narrow —
                       what changes is only that the slack now lives between the
                       label and the [+], where the icon can sit in the middle
                       of it (see the auto margins on the <img> below). */
                    flex: '0 1 auto', minWidth: 0,
                    fontSize: landPane ? 11.5 : 13, fontWeight: 800, letterSpacing: '.02em',
                    /* v2.3.2599: LIGHT again.  The dark flip existed because the
                       fill was a light pastel; the deep fills measure 5.68:1 to
                       11.29:1 against COL.text, so the label matches the rest of
                       the panel instead of inverting inside it. */
                    color: COL.text, lineHeight: 1,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{cardLabel(st)}</span>
                  {/* v2.3.2602: auto margins, not two flex spacers.  A spacer
                      either side would centre the icon just as well but adds two
                      more `gap: CARD_GAP` to the row — 8px at 360, off a cell
                      that only has 163 — and the gap is what the icon needs to
                      sit in.  Auto margins split the leftover space evenly with
                      no extra children, so the row keeps its two gaps.
                      The centring is PER ROW, against that row's own label, so
                      the icons do not line up vertically down a column (Power
                      is narrower than Stamina).  That is what "centred between
                      the label and the plus" means; a fixed icon column would
                      align them but is a different design. */}
                  <img src={st.iconSrc} alt="" draggable={false}
                    style={{ width: CARD_ICON, height: CARD_ICON, objectFit: 'contain',
                      flex: 'none', pointerEvents: 'none',
                      marginLeft: 'auto', marginRight: 'auto',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.45))' }} />
                  {/* ═══ v2.3.2597: THE VALUE IS NOT HERE ANY MORE ═══
                      Owner, solving the two-column squeeze themselves: "You can
                      move the values to the second confirmation screen."  So a
                      half-width cell carries the label, the icon and the [+],
                      and nothing else — which is what lets the [+] keep the
                      prominence the reference shot gives it at half width.
                      The confirm already showed it: openSpendConfirm passes
                      nowText/afterText from previewStatPoint and v2.3.2595
                      renders them as a now -> after pair, so this is a removal,
                      not new plumbing.
                      WHAT IT COSTS, and the owner should see it named: the
                      category panel stops saying what you HAVE and becomes a
                      list of what you can BUY.  Reading a current value now
                      takes a tap.  That is a real loss of at-a-glance
                      information; nothing is built here to compensate for it. */}
                  {/* ═══ v2.3.2599: THE ORB IS GONE ═══
                      Owner: "Remove the small circle icon to the left of the
                      plus sign."  That is the v2.3.2329 point-landed orb — the
                      7px dot and its `+1` flare — not the stat's own icon,
                      which is the <img> above and which they want BIGGER.

                      WORTH SAYING OUT LOUD: the orb existed because the owner
                      reported "when you spend combat points it's kind of
                      ambiguous whether it took effect or not".  With the VALUES
                      also off the cell (v2.3.2597), a spent point now changes
                      NOTHING visible on the row — the only confirmation is the
                      now -> after line inside the window, before you commit.
                      That is a real loss of after-the-fact feedback and it is
                      flagged rather than quietly accepted. */}
                  <button type="button"
                    /* ═══ v2.3.2597: THE EXPLICIT role, WHICH IS A CONTRACT ═══
                       "Every spend control is [role="button"][aria-label*=" of "]"
                       — mp-prog3's own words, and mp-ptorb and mp-statcols both
                       find rows with exactly that selector.  A <button> has an
                       IMPLICIT button role, but `[role="button"]` is an
                       attribute selector and matches only an explicit one, so
                       dropping it silently took this control out of three
                       scenarios' reach while the screen looked perfect.
                       Redundant for a screen reader; load-bearing for the
                       contract. */
                    role="button"
                    data-prog3-plus={lk}
                    data-stat-info={st.key}
                    aria-label={`${st.label}${st.atk ? ' for ' + cat : ''}, ${pts} of ${cap}. ${st.perText} per point.`}
                    aria-disabled={!canSpend}
                    title={`${st.label} — ${pts} of ${cap} points — ${st.perText} per point`}
                    {...scrollTap(() => openStatInfo(st, cat, {
                      blocked: (st.atk ? laneAvail(cat) : sharedAvail) <= 0
                        ? `No ${st.atk ? ((PROG3_SKILL_META.find((k) => k.key === cat) || {}).label || 'lane') : 'shared'} points to spend.`
                        : pts >= cap ? `${st.label} is already at its cap.` : null,
                      run: () => {
                        const S2 = getState();
                        const R2 = S2 && S2.rpg;
                        if (!S2 || !S2.channel) return;
                        S2.channel.send({
                          type: 'prog3_allocate',
                          payload: { stat: st.key, cat: st.atk ? cat : prog3SharedSpendCat(R2) },
                        });
                      },
                    }), { inner: true })}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 'none', width: CARD_PLUS_W, height: CARD_PLUS_H,
                      boxSizing: 'border-box', padding: 0, borderRadius: 8,
                      /* v2.3.2599: the dark outline v2.3.2598 needed is gone with
                         the pastel that needed it.  Gold measured 1.10:1 to
                         1.88:1 against the light fills — under the floor on all
                         thirteen — and measures 3.02:1 to 6.00:1 against the
                         deep ones, so the button holds its own edge again. */
                      border: `1px solid ${canSpend ? COL.accent : COL.tileBor}`,
                      background: canSpend ? COL.accent : 'transparent',
                      color: canSpend ? '#20170D' : COL.muted,
                      fontSize: landPane ? 19 : 22, fontWeight: 900, lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', touchAction: 'manipulation',
                    }}>+</button>
                </div>
              );
            };

            /* ═══ THE CATEGORY CARD ═══
               Back, the big icon, the name, the points, and the [i] — then the
               rows.  Two details are the owner's own words:
                 - "points remaining to the right of the large category icon",
                   so the count sits BESIDE the icon, not under the title;
                 - the [i] is per-CATEGORY at the card header.  It is NOT the
                   per-stat glyph v2.3.2595 retired from every cell, and it is
                   not resurrected here: it opens the LANE explainer
                   (openLaneInfo), the same one the dashboard's combat pills
                   open, so the two screens say one thing about one skill. */
            const catCard = (col) => {
              const shared = !!col.shared;
              const pts = shared ? sharedAvail : laneAvail(col.key);
              const lvl = shared ? prog3CharLevel(R) : prog3SkillLevel(R, col.key);
              const metas = shared ? prog3BodyMeta() : prog3AtkMeta();
              return (
                <div data-prog3-card={col.key} style={{
                  display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0,
                  border: `2px solid ${COL.accent}`, borderRadius: 12,
                  /* ═══ v2.3.2600: NO `overflow: hidden` ON THE CARD ═══
                     This is what actually stopped the header sticking, and it
                     is invisible in the numbers — the computed position stayed
                     `sticky` and zIndex 1 the whole time, so every check said
                     it was fine while the screenshot showed the header sliding
                     up under the tab row with the cells behind it.
                     `overflow: hidden` makes an element a SCROLL CONTAINER, and
                     a sticky child sticks within its nearest scrolling
                     ancestor.  So the header was dutifully sticking to the
                     CARD, which never scrolls, instead of to the sheet's
                     scroller — i.e. not sticking at all.
                     It was only ever here to clip the 12px radius, and nothing
                     reaches those corners: the rows sit inside the card's own
                     padding and clip themselves. */
                  background: COL.bg,
                }}>
                  {/* STICKY, for the reason in the geometry note above: the card
                      is about twice the scrolling window, and the one thing that
                      must never scroll away is which category you are spending
                      in. */}
                  <div style={{
                    /* ═══ v2.3.2600: THE HEADER WAS TRANSPARENT, AND STUCK TOO HIGH ═══
                       Owner: "make sure the cells don't slide above the headers."
                       Two real faults, both mine from v2.3.2597, and neither was
                       a z-order problem — elementFromPoint at the header's own
                       centre correctly returned the header the whole time:

                       1. `background: COL.panel` — THERE IS NO `panel` KEY in
                          the palette (it is bg / raised / well / wellSoft).  So
                          it resolved to undefined and the computed background
                          was rgba(0,0,0,0): a fully TRANSPARENT sticky bar with
                          the stat rows scrolling visibly through it, which is
                          exactly what "sliding above the header" looks like.
                          An unknown key fails silently in an inline style —
                          nothing warns, and it renders.
                       2. `top: 0` sticks it to the top of the SHEET's scroller,
                          which is where the Equipment/Points/Journey tab row
                          already sits (sticky, top 0, zIndex 2).  So the card
                          header slid up UNDER the tabs instead of halting
                          beneath them.  HERO_TAB_H + 2 is what the four-column
                          header row used for this same reason (v2.3.2592). */
                    /* HERO_TAB_H, not +2: the +2 was the tab row's own
                       marginBottom, and pinning the card header 2px lower left
                       a 2px strip of scrolling cells between the two headers
                       (measured: tabs end 685, header pinned 687).  Flush. */
                    position: 'sticky', top: HERO_TAB_H, zIndex: 1, flex: 'none',
                    display: 'flex', alignItems: 'center', gap: landPane ? 5 : 8,
                    padding: landPane ? '5px 6px' : '6px 8px',
                    background: COL.bg, borderBottom: `1px solid ${COL.tileBor}`,
                  }}>
                    <button type="button"
                      data-prog3-back
                      aria-label="Back to categories"
                      {...scrollTap(() => setSelCat(null), { inner: true })}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 'none', height: 30, padding: landPane ? '0 7px' : '0 9px', borderRadius: 8,
                        border: `1px solid ${COL.borderStrong}`, background: 'transparent',
                        color: COL.text, fontSize: 12, fontWeight: 800, lineHeight: 1,
                        display: 'flex', alignItems: 'center', gap: 4,
                        cursor: 'pointer', touchAction: 'manipulation',
                      }}>{'\u2190'}{landPane ? '' : ' Back'}</button>
                    <img src={shared ? sharedIcon : col.iconSrc} alt="" draggable={false}
                      onError={shared ? (e) => { if (e.currentTarget.src.indexOf(SHARED_ICON_FALLBACK) < 0) e.currentTarget.src = SHARED_ICON_FALLBACK; } : undefined}
                      style={{
                        width: CAT_ICON, height: CAT_ICON, flex: 'none', pointerEvents: 'none',
                        objectFit: shared ? 'cover' : 'contain',
                        borderRadius: shared ? 6 : 0, imageRendering: shared ? 'pixelated' : undefined,
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.45))',
                      }} />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span data-prog3-lane={col.key}
                        aria-label={`${col.label}, level ${lvl}`}
                        style={{
                          fontSize: landPane ? 13 : 15, fontWeight: 900, letterSpacing: '.04em',
                          textTransform: 'uppercase', color: COL.accent, lineHeight: 1,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{col.label}</span>
                      {/* The owner's one change from the shots: the points sit
                          beside the icon rather than under the title. */}
                      <span aria-label={`${pts} points to spend on ${col.label}`}
                        style={{
                          fontSize: 11.5, fontWeight: 700, lineHeight: 1.1,
                          color: pts > 0 ? COL.accent : COL.text2,
                          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{pts} PT{pts === 1 ? '' : 'S'}{landPane ? '' : ' AVAILABLE'}</span>
                    </div>
                    <button type="button"
                      data-lane-info={col.key}
                      aria-label={`About ${col.label}`}
                      {...scrollTap(() => openLaneInfo(col), { inner: true })}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 'none', width: 28, height: 28, borderRadius: 999, padding: 0,
                        background: 'transparent', border: `1px solid ${COL.borderStrong}`,
                        color: COL.text2, fontSize: 13, fontWeight: 900,
                        fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic',
                        lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', touchAction: 'manipulation',
                      }}>i</button>
                  </div>
                  {/* ═══ v2.3.2597: TWO COLUMNS INSIDE THE CARD ═══
                      Owner: "Once inside the category panel try doing two
                      columns to make the 6 fit efficiently."  A weapon's six
                      become 3 x 2.
                      SHARED HAS SEVEN.  v2.3.2597 gave the odd last one
                      (Resist) both columns so it would not read as a missing
                      cell beside a hole.  v2.3.2601 reverses that on the
                      owner's word — "display resist as one column length not
                      two" — so EVERY cell is the same width and the seventh
                      simply sits in the left column with the right one empty.
                      Nothing special-cases Resist by key: the rule is just
                      "no spanning", which holds for any future odd count.
                      Sideways the pane is ~191px, where two columns would be
                      ~90px each — narrower than the single-column card already
                      measured as tight — so landscape keeps ONE column. */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: twoCol ? 'repeat(2, 1fr)' : '1fr',
                    gap: twoCol ? 6 : 5,
                    padding: landPane ? '5px 5px 6px' : '6px 6px 7px', minWidth: 0,
                  }}>
                    {metas.map((m) => (
                      <div key={m.key} style={{ minWidth: 0 }}>
                        {catRow({ ...m, atk: !shared }, col.key)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            };

            const restDps = R ? overallDps(R) : null;
            return (
              <>
              {/* v2.3.2176: the pool has NO line of its own.  The portrait
                  band gives this section 191px (measured), and a standalone
                  row cost 22 of them for a number the Points TAB already
                  carries as a +N badge -- and which now also rides the open
                  lane's header, where the spending happens. */}
              {/* THE THREE LANES.  Every lane's header is always mounted, so
                  the three combat types are always reachable — and each is
                  still `[role="button"][aria-label*="level"]`, the hook
                  mp-prog3 has used to find the type selector since v2.3.1668. */}
              {/* ═══ v2.3.2326: A CAPTION, NOT A PLATE ═══
                  This was a bordered, filled, rounded well 24px tall with 3px
                  of padding -- 38.25px of a 191px section, spent on one line
                  of grey text that is a hint, not a control.  The plate also
                  hid a silent cost: it wrapped, so a long weapon name bought a
                  second line and took 13px off the stat rows without anyone
                  choosing that.
                  One 14px line now, ellipsised rather than wrapping, no
                  border, no fill, no radius: 18px all in.  The 20.25px that
                  buys is exactly what keeps a 48px stat row peeking below the
                  fold on a 320px phone once the lanes become columns -- the
                  cue that there is more, which this screen has instead of a
                  scroll-edge fade (the fade was removed at v2.3.2288 because
                  the owner said "the last row is faded at the bottom"). */}
              <div aria-live="polite" className="bt-stat-peek" style={{
                marginBottom: 4, height: 14, lineHeight: '14px', padding: '0 2px',
                fontSize: 11, color: COL.text2,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {/* v2.3.2222: the strip is the RESTING readout only now (what a
                    point buys moved into the ℹ️ window), and it sits ABOVE the
                    lanes rather than below.  Measured: with Melee open, the two
                    collapsed lanes plus this strip under the last stat row
                    were more than a scroll-to-the-end could fit beneath the
                    pinned tabs + header, so ELEM POWER slid under them at max
                    scroll.  Up here it costs ~30px of rows at rest and buys
                    the last row fully visible at the end on every phone -- and
                    a new player reads the "tap the i" hint before the rows,
                    which is where a hint belongs. */}
                {restDps
                  ? <>Overall <span style={{ color: COL.text, fontWeight: 700 }}>DPS {n2(restDps.dps)}</span> with your {restDps.weaponName}. Tap the <b style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>i</b> on a stat to see what a point buys.</>
                  : 'Equip a weapon to see your DPS.'}
              </div>
              {/* ═══ v2.3.2326: THREE COLUMNS, NOT THREE STACKED ROWS ═══
                  Owner: "I think 3 accordion columns rather than 3 accordion
                  rows per combat primary combat skill might work better."

                  He is right, and the reason is stronger than taste.  Stacked,
                  each lane's header pushed the next one down, so the open
                  lane's FIRST STAT ROW started 29px lower for each step down
                  the list.  Measured at the harness viewport:

                      Melee open   first row top 685   48 of 48px visible
                      Bow   open   first row top 714   48 of 48px visible
                      Magic open   first row top 743   37 of 48px visible

                  ...and at 320x568 the Magic case is ZERO -- the first stat
                  you can spend a point on is entirely below the fold, on a
                  screen whose scroll-edge fade is deliberately off (v2.3.2288,
                  owner: "the last row is faded at the bottom").  That is the
                  v2.3.1660 incident -- "a player who could not know a stat
                  existed" -- alive in production.  No assertion could see it
                  because every one of them measured whichever lane
                  prog3ActiveCat happened to hand the test character, which is
                  always Melee, the one lane that was fine.

                  Side by side, the selector is ONE 44px row instead of three
                  stacked 24-28px ones, so the body starts at the same y
                  whichever weapon you picked -- the lane-index dependence is
                  gone by construction, not by tuning.  It also finally makes
                  true the thing v2.3.2176's note already claimed: all three
                  combat types on screen at once.  They were not; sticky
                  resolves inside each lane's own div, and a collapsed lane IS
                  its header, so it had no travel to stick through -- measured,
                  the other two sat 413px below the panel.

                  LANDSCAPE KEEPS THE STACKED ROWS.  Sideways this column is
                  190px wide, so three of them are 60px each, and v2.3.2176
                  already records that width ellipsising lane labels to single
                  letters.  One layout does not fit both, and the owner's ask
                  was about his phone. */}
              {/* ═══════════════════════════════════════════════════════════
                  v2.3.2597: FOUR CATEGORY BUTTONS, THEN ONE CATEGORY AT A TIME
                  ═══════════════════════════════════════════════════════════
                  The owner sent two reference shots of the screen they want
                  (docs/triage-2026-09-16/assets/points-target-*): a 2x2 grid of
                  MELEE / BOW / MAGIC / SHARED, each with its icon and its point
                  count, and — once one is tapped — a gold-bordered card with
                  Back, the category's big icon, its name, its points, an [i],
                  and one row per stat with a wide [+] down the right edge.

                  WHAT THIS REPLACES, deliberately and on the owner's word after
                  they saw both: the four side-by-side columns of v2.3.2592, the
                  horizontal open/close of v2.3.2593, and — the one worth
                  calling out — the PAIRING RULE of v2.3.2594, "one combat skill
                  open at a time but you can have one combat skill and the
                  shared column open at the same time".  That rule's whole
                  purpose was letting you see a weapon's stats and the shared
                  stats together, and a one-category-at-a-time card cannot do
                  it.  It is a real loss, not an oversight; the owner has seen
                  both shapes and chosen this one.

                  WHAT IT FIXES.  A full-width row is ~358px of card for a
                  weapon's six stats where a quarter-width column had 91.5px of
                  cell, so: every stat can carry its own [+] (the half-width
                  rows of v2.3.2382 could not, and under an [+]-only design
                  that would have stranded them), the icon is comfortably 3x its
                  old size, and "spending in the wrong lane" is answered by
                  construction — only one lane is on screen.

                  ONE LAYOUT FOR BOTH ORIENTATIONS.  v2.3.2592 kept a separate
                  stacked accordion sideways because four columns of ~45px could
                  not hold a stat name.  A single full-width list has no such
                  problem in a ~220px landscape pane, so the split is gone and
                  both orientations render this.  That deletes the landscape
                  branch, statRow, and the lane-header accordion with it. */}
              <div data-prog3-points style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* The reference's own instruction line.  A hint, not a control
                    (the v2.3.2326 caption rule), and it says what the two-step
                    shape needs a first-time player to know.
                    ═══ v2.3.2611: GRID ONLY ═══
                    Owner: "Remove 'tap + to spend a point' row on points menu."
                    It was the SECOND instruction in two screens — the grid
                    already says "Tap a category, then spend its points here",
                    and by the time you are inside a card the [+] is the only
                    control on the row and needs no caption.  Only the card's
                    line goes; the grid's stays, because that one is telling a
                    first-time player the two-step shape.
                    It buys the card 19px (15 tall + 4 margin) of the ~191px
                    scrolling window, which is where the card was overflowing. */}
                {selLane ? null : (
                  <div style={{
                    height: 15, lineHeight: '15px', textAlign: 'center', marginBottom: 4,
                    fontSize: 11, color: COL.text2, flex: 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>Tap a category, then spend its points here.</div>
                )}
                {selLane ? catCard(selLane) : catGrid()}
              </div>
              </>
            );
          })()}
        </>
      )}

      {section === 'Build' && !p3 && (
        <>
          {/* v2.3.1311c: single-line points chip — the two-cell header
              banner cost ~14px the no-scroll budget doesn't have on a
              real iPhone Safari viewport (~715px innerHeight). */}
          <div style={{
            margin: '5px 0 4px',
            padding: '3px 10px',
            borderRadius: 7,
            background: totalUnspent > 0 ? COL.accentFill : COL.wellSoft,
            border: `1px solid ${totalUnspent > 0 ? COL.accent : COL.tileBor}`,
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
            color: totalUnspent > 0 ? COL.accent : COL.text2,
          }}>
            <span>BUILD POINTS</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{totalUnspent} AVAILABLE</span>
          </div>
          {/* v2.3.1311d (owner): the six parents are LAUNCHERS — every
              tile is ALWAYS tappable and opens that parent's five-
              category spend screen (T2Panel), points or not.  With the
              detail living one tap away, the tiles drop the XP text
              line for breathing room: icon + name + Lv + the parent's
              family line + level-progress bar + drill chevron; the +N
              chip marks waiting points.  3x2, sized to the real device
              budget. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, flex: 1, minHeight: 0, alignContent: 'stretch' }}>
            {COMBAT_SKILLS.map(s => {
              /* ═══ v2.3.2414: THE LEVEL READS THE BLOB, NOT THE CAP ═══
                 THE FOURTH SCREEN.  v2.3.1901 (StatScreenPanel), v2.3.1902
                 (T2Panel) and v2.3.1922 (DashColumns) each moved one readout
                 off prog3Live and onto prog3HasSkills.  This one was missed
                 all three times, and it is the screen the owner has been
                 reviewing commit after commit (v2.3.2214, v2.3.2229, v2.3.2326,
                 v2.3.2382) -- so when it finally rendered for him it read as
                 "the level 0 bug is back" when in truth it had never been in
                 the fixed set.

                 prog3Live is cap AND blob.  With the cap absent this whole
                 branch renders, and skillLevel() is `R[key] || 0` for
                 power/agility/mind -- the three legacy T1 stats v2.3.1659
                 FROZE AT 0 for every prog3 character.  So the legacy grid
                 cannot print anything but Lv 0 for the three weapon tiles,
                 while the server has that character at 1 or better.
                 prog3SkillLevel floors at Math.max(1, ...) and cannot return
                 0, so a rendered 0 could only ever have come from here.

                 Photographed both ways in a real client before this changed:
                 cap on -> 3 prog3 lanes, 0 legacy tiles; cap stripped out of
                 state_sync -> 0 lanes and SIX legacy tiles reading Lv 0, with
                 the server-owned blob present and correct ({sword:1,bow:1,
                 staff:1}) the whole time.

                 WHAT DELIBERATELY DOES NOT CHANGE: the branch itself still
                 swaps on prog3Live.  This grid is an ALLOCATION surface -- its
                 tiles open T2Panel, which spends into the legacy channels --
                 and allocation must match the worker that will settle it
                 (handoff rule 19).  Against a cap-less worker the legacy
                 SPEND path is the correct one; only the LEVEL it was labelling
                 the tiles with was a lie.  Readouts read the blob, sends read
                 the cap: that is the whole distinction, and conflating them is
                 what produced four bugs.

                 Vitality / Defense / Stamina keep skillLevel deliberately:
                 STAT_TO_WEAPON_CAT has no entry for them, so `_p3cat` is
                 undefined and they stay on the legacy read -- which is right,
                 because those are allocated body stats that legitimately start
                 at 0 (the same call v2.3.1901 made). */
              const _p3cat = STAT_TO_WEAPON_CAT[s.key];
              const lvl = (prog3HasSkills(R) && _p3cat)
                ? prog3SkillLevel(R, _p3cat)
                : skillLevel(R, s.key);
              const pct = skillProgressPct(R, s.key);
              const prog = skillProgress(R, s.key);
              const unspent = buildSkillUnspent(R, s.key);
              /* v2.3.1313 (owner): Vitality and Stamina were DEAD buttons — the
                 map only knew defense + the weapon cats, so openT2Cat came back
                 undefined and the tap no-oped.  Their T2 tabs are 'hp' and
                 'endurance'. */
              const openT2Cat = s.key === 'defense' ? 'defense'
                : s.key === 'vitality' ? 'hp'
                : s.key === 'endurance' ? 'endurance'
                : STAT_TO_WEAPON_CAT[s.key];
              return (
                <div key={s.key}
                  className={unspent > 0 ? 'bt-build-flash' : undefined}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (openT2Cat) { requestT2Category(openT2Cat); dashboardPanelBus.push('t2'); }
                  }}
                  style={{
                    position: 'relative',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    gap: 2,
                    padding: '5px 7px 9px',
                    background: unspent > 0 ? COL.accentFill : COL.wellSoft,
                    border: `1px solid ${unspent > 0 ? COL.accent : COL.tileBor}`,
                    borderRadius: 7,
                    cursor: 'pointer',
                    touchAction: 'none',
                    minWidth: 0,
                  }}>
                  {unspent > 0 && (
                    <span aria-hidden="true" style={{
                      position: 'absolute', top: 2, right: 2,
                      background: COL.accent, color: '#20170D',
                      fontSize: 11, fontWeight: 900,
                      borderRadius: 6, padding: '0 3px', lineHeight: 1.4,
                      pointerEvents: 'none',
                    }}>+{unspent}</span>
                  )}
                  {/* v2.3.1311f (owner): bigger icon + text; the
                      "5 x skills" line is gone to pay for it — the
                      drill chevron alone marks the tap-through. */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <img src={s.iconSrc} alt="" draggable={false}
                      style={{ width: 26, height: 26, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.15 }}>{s.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: COL.text2, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>Lv {lvl}</div>
                    </div>
                    <span aria-hidden="true" style={{ flex: 'none', fontSize: 13, fontWeight: 800, color: COL.text2, lineHeight: 1 }}>›</span>
                  </div>
                  {prog && (
                    <div style={{ position: 'absolute', left: 7, right: 7, bottom: 4, height: 3, borderRadius: 999, overflow: 'hidden', background: '#0B1216', pointerEvents: 'none' }}>
                      <div style={{ width: pct + '%', height: '100%', background: '#D8A85F' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {section === 'Records' && (
        <>
        {/* v2.3.1311c: 3x2 (was 2x3) — two card rows fit the real device
            budget without scrolling; three didn't. */}
        {/* v2.3.2176 (owner, of the landscape Journey tab: "labels that are
            still cut off and need to have a different layout to display
            correctly"): three cards across a ~204px column left ~63px each,
            so every label ellipsised to a single letter -- "K...", "D...",
            "L...".  Sideways this becomes ONE column of wide rows, which is
            the only arrangement in which "Lifetime Gold" and "Deepest Zone"
            fit whole.  Portrait keeps the 3x2 grid v2.3.1311c measured
            against its own no-scroll budget. */}
        <div style={{ display: 'grid', gridTemplateColumns: landPane ? '1fr' : 'repeat(3, 1fr)', gap: 5, paddingTop: 6 }}>
          {[
            /* v2.3.1323 (owner icon sheet): each record card gets its
               icon — same magenta-key pipeline as the stat sheet.
               v2.3.1341 (owner art drop): rec-kills replaced with the
               new sword-and-skull art (green-screen sheet, chroma
               knocked out); shared ?v bumped to bust the old cache. */
            /* v2.3.1664: prefer the SERVER-verified kill count when the
               worker sends it (svKills, counted in _resolveMonsterKill).
               The client's own _compStats tally stays the fallback for old
               workers.  This is the number the on-chain attestation
               carries, so the two must not disagree on screen. */
            ['Kills', R.svKills ?? cs.monstersKilled ?? cs.kills ?? 0, 'rec-kills'],
            ['Deaths', cs.deaths ?? 0, 'rec-deaths'],
            /* Renamed from "Gold Earned" so it can't be confused with
               the current balance in the identity strip (round-4). */
            ['Lifetime Gold', Number(cs.totalGoldEarned ?? cs.goldEarnedTotal ?? 0).toLocaleString(), 'rec-gold'],
            /* v2.3.1311: lifetime cumulative XP lives HERE now — the
               identity strip shows normalized next-level progress. */
            ['Lifetime XP', Number(R.xp || 0).toLocaleString(), 'rec-xp'],
            ['Duels Won', cs.duelsWon ?? 0, 'rec-duels'],
            ['Deepest Zone', cs.deepestZone ?? '—', 'rec-zone'],
          ].map(([label, value, icon]) => {
            /* v2.3.2176b: ONE rule for how big a record's value is printed,
               shared by both layouts.  Five of the six are short numbers,
               but Deepest Zone is a zone NAME and lifetime gold reaches
               seven figures -- and at a fixed 14px those two overflowed in
               both orientations (portrait ellipsised "Frost Holl…";
               sideways the nowrap row simply pushed past the panel's right
               edge, which the landdash overflow sweep caught).  The point
               size steps down with the string rather than the reader losing
               the end of it. */
            const valueFs = String(value).length <= 6 ? 14 : String(value).length <= 9 ? 12 : 10;
            return (
            <div key={label} style={{
              background: COL.wellSoft,
              border: `1px solid ${COL.tileBor}`,
              borderRadius: 7,
              padding: '5px 7px 6px',
              minWidth: 0,
              /* v2.3.2176b: 5px of gap and a 22px icon in the PORTRAIT
                 grid.  Measured: a 117px card less 14 of padding, a 26px
                 icon and 6 of gap left 71px for a label that needs 73, so
                 "LIFETIME GOLD" and "DEEPEST ZONE" ellipsised to
                 "LIFETIME GO…" / "DEEPEST ZO…" -- the owner's complaint,
                 in the orientation the landscape fix did not touch.  Four
                 pixels off an icon buys the whole word; the icon is
                 decoration and the word is the data. */
              display: 'flex', alignItems: 'center', gap: landPane ? 6 : 5,
            }}>
              <img src={`/icons/ui/hero/${icon}.webp?v=2.3.1341`} alt="" draggable={false}
                style={{ width: landPane ? 26 : 22, height: landPane ? 26 : 22, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
              {/* v2.3.2176: stacked (value over label) in the portrait grid,
                  where the cell is short and wide-ish; a single ROW sideways
                  -- label left, value right -- which is the house list
                  pattern and gives the label the whole width it needs. */}
              {landPane ? (
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                  {/* v2.3.2176b: 10px, not 11.  "LIFETIME GOLD" whole plus a
                      seven-figure number is more than this row has at 11 --
                      and neither half may be clipped, so the type gives. */}
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: COL.muted, whiteSpace: 'nowrap' }}>{label}</div>
                  <div style={{ fontSize: valueFs, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flex: 'none' }}>{value}</div>
                </div>
              ) : (
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* v2.3.2176b: the VALUE line sizes itself.  Five of the
                      six records are short numbers, but Deepest Zone is a
                      zone NAME -- "Frost Hollow" wanted 99px in an 80px
                      cell and ellipsised to "Frost Holl…", which is the
                      same clipping the labels above were just fixed for,
                      one line down.  Seven-figure gold hits it too.  So the
                      point size steps down with the string's length rather
                      than the reader losing the end of it. */}
                  <div style={{ fontSize: valueFs, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
                  {/* v2.3.2176b: .02em, not .04 -- thirteen characters of
                      tracking is another 2px this cell does not have. */}
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.02em', textTransform: 'uppercase', color: COL.muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                </div>
              )}
            </div>
          );})}
        </div>
        {/* v2.3.1664: the on-chain receipt.  Appears only once a milestone
            has actually been written to Hemi, so it is never a promise the
            game hasn't kept — and it is a real link, because a claim of
            "verified on-chain" that you cannot go and check is just a
            badge.  The popup at the moment of writing fades; this stays. */}
        {R._chainScore && R._chainScore.explorer && (
          <a
            href={R._chainScore.explorer}
            target="_blank"
            rel="noopener noreferrer"
            onPointerUp={(e) => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginTop: 6, padding: '7px 9px',
              background: COL.accentFill,
              border: `1px solid ${COL.accent}`,
              borderRadius: 7,
              textDecoration: 'none',
              touchAction: 'manipulation',
            }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 800, color: COL.accent,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Level {R._chainScore.level} recorded on Hemi
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
                textTransform: 'uppercase', color: COL.muted, marginTop: 1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Tap to view the transaction
              </div>
            </div>
            <span aria-hidden="true" style={{
              flex: 'none', fontSize: 13, fontWeight: 800, color: COL.accent, lineHeight: 1,
            }}>↗</span>
          </a>
        )}
        </>
      )}
    </div>
  );
};
