import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from '../dash/common.js';
import { buildSkillUnspent, STAT_TO_WEAPON_CAT } from '../../../data/gameSystems.js';
import { requestT2Category } from '../dash/T2Panel.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { COMBAT_SKILLS, skillLevel, skillProgressPct, skillProgress, deriveHeroStats, unspentPointsTotal } from './heroModel.js';
/* v2.3.1660: trained-skill rebuild — the Build section becomes the
   seven-stat allocation menu when the worker owns prog3. */
import {
  prog3Live, prog3Pts, prog3AtkPts, prog3StatCap, prog3SkillLevel,
  prog3ActiveCat, PROG3_ATK_META, PROG3_BODY_META, PROG3_SKILL_META,
} from '../../../data/prog3.js';
import { VitalBar, VITAL_ICONS } from './VitalBar.jsx'; /* v2.3.1311 */
import { getEquippedSlots, getEquipContribs, GHOST_SRC } from './equipModel.js'; /* v2.3.1653 */
import { previewStatPoint, overallDps } from './statPreview.js';                 /* v2.3.1766 */
import { itemDetailBus } from '../dash/itemDetailBus.js';                        /* v2.3.1653 */
import { heroSectionBus } from './heroSectionBus.js';                            /* v2.3.1668 */
import { DASH_GAP, HERO_TAB_H } from './sheetGeometry.js';                      /* v2.3.1653; v2.3.1657 tabs */

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
/* v2.3.1323 (owner icon sheet): each section tab gets its art —
   knight bust / point tree / tally ledger. */
const SECTION_ICONS = {
  Overview: '/icons/ui/hero/tab-overview.webp?v=2.3.1323',
  Build: '/icons/ui/hero/tab-build.webp?v=2.3.1323',
  Records: '/icons/ui/hero/tab-records.webp?v=2.3.1323',
};
/* Round-3 §6 state preservation: the selected section survives leaving
   the destination (module-scoped, session-only).  v2.3.1311: reset to
   Overview when Hero is closed all the way to the toolbar — a NEXT
   open is a fresh visit (owner spec); a dip to compact keeps it. */
let _lastSection = 'Overview';
dashboardPanelBus.subscribe(() => {
  if (dashboardPanelBus.state.mode === 'bar') _lastSection = 'Overview';
});

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
  /* v2.3.1766: which stat the allocation tooltip is describing, or null for
     its resting state (the character's overall DPS).  Cleared when the sheet
     changes section so the strip never describes a stat that is off screen. */
  const [statPeek, setStatPeek] = useState(null);
  const setSection = (s) => { _lastSection = s; setStatPeek(null); setSectionState(s); };
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
    if (_req.cat) setBuildCat(_req.cat);
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
  const compactVital = (kind, cur, max) => (
    <div key={kind} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
      <img src={VITAL_ICONS[kind]} alt="" draggable={false}
        style={{ width: 13, height: 13, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
      <VitalBar kind={kind} cur={cur} max={max} thick={9} />
      <span style={{
        flex: 'none', fontSize: 10, fontWeight: 700, color: COL.text2,
        fontVariantNumeric: 'tabular-nums',
      }}>{Math.ceil(cur)}</span>
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
  /* v2.3.1697: `span` lets one cell take two of the grid's columns —
     see the aggregate grid below, where DAMAGE keeps its old width while
     the rest halve to make room for the armour readout. */
  const cell = (label, value, span) => (
    <div key={label} style={{
      background: COL.wellSoft,
      border: `1px solid ${COL.tileBor}`,
      borderRadius: 8,
      padding: '4px 2px 5px',
      minWidth: 0,
      textAlign: 'center',
      gridColumn: span ? `span ${span}` : undefined,
    }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', marginTop: 1, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );

  /* v2.3.1660: one definition (heroModel) — under prog3 this is THE
     pool, so the tab badge and the points chip both show it. */
  const totalUnspent = unspentPointsTotal(R);
  const p3 = prog3Live(R);
  const buildCat = buildCatState || prog3ActiveCat(R);

  /* ── the worn six, and what they are worth ── */
  const equipped = getEquippedSlots(R);
  const contribs = getEquipContribs(R);
  const selSlot = eqSel ? equipped.find(sl => sl.slot === eqSel) : null;
  const selCard = selSlot ? contribs.cards[selSlot.slot] : null;
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
  const kv = (k, v, big) => (
    <div key={k} style={{
      background: COL.wellSoft, border: `1px solid ${COL.tileBor}`, borderRadius: 8,
      padding: '4px 2px 5px', minWidth: 0, textAlign: 'center',
    }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k}</div>
      <div style={{ fontSize: big ? 15 : 13, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', marginTop: 1, whiteSpace: 'nowrap' }}>{v}</div>
    </div>
  );

  return (
    <div style={{
      ...panelStyle, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: 10,
      /* v2.3.1311d (owner: "the last row is faded at the bottom"): the
         panelStyle bottom scroll-edge fade exists to signal MORE
         content below the fold — Hero's subtabs are designed no-scroll,
         so the mask only dimmed the flush last row.  Off here. */
      WebkitMaskImage: 'none', maskImage: 'none',
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
        position: 'sticky', top: 0, zIndex: 2,
        display: 'flex', gap: DASH_GAP,
        height: HERO_TAB_H, flex: '0 0 auto',
        marginBottom: 4,
        background: COL.bg, /* sticky: keep opaque so content scrolls UNDER */
      }}>
        {SECTIONS.map(s => {
          const on = section === s;
          const badge = s === 'Build' && totalUnspent > 0 ? totalUnspent : 0;
          return (
            <div key={s}
              role="button"
              aria-label={badge ? `Build — ${badge} points` : s}
              aria-pressed={on} title={s}
              onPointerUp={(e) => { e.stopPropagation(); setSection(s); }}
              style={{
                position: 'relative',
                flex: '1 1 0', minWidth: 0, height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? COL.accentFill : COL.wellSoft,
                border: `1px solid ${on ? COL.accent : COL.tileBor}`,
                borderRadius: 7,
                cursor: 'pointer', touchAction: 'manipulation',
              }}>
              <img src={SECTION_ICONS[s]} alt="" draggable={false}
                style={{
                  width: 24, height: 24, objectFit: 'contain',
                  opacity: on ? 1 : 0.7, pointerEvents: 'none',
                }} />
              {badge > 0 && (
                <span aria-hidden="true" style={{
                  position: 'absolute', top: 2, right: 2,
                  minWidth: 13, height: 13, padding: '0 3px',
                  borderRadius: 7, background: COL.accent, color: COL.onAccent,
                  fontSize: 9, fontWeight: 900, lineHeight: '13px', textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
                }}>{badge > 9 ? '9+' : badge}</span>
              )}
            </div>
          );
        })}
      </div>

      {section === 'Overview' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0 6px' }}>
            {compactVital('hp', R.hp || 0, R.maxHp || 100)}
            {compactVital('stamina', R.stamina || 0, R.maxStamina || 100)}
            {compactVital('mana', R.mana || 0, R.maxMana || 100)}
          </div>

          {/* v2.3.1653: EQUIPPED LEFT, STATS RIGHT — the owner's layout,
              literally.  The left column is fixed at what two cells need so
              the right column gets every remaining pixel; the numbers are
              the thing that was missing, so the numbers get the space. */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{
              flex: 'none', width: 3 * EQ_W + 2 * DASH_GAP,
              display: 'flex', flexWrap: 'wrap', gap: DASH_GAP,
            }}>
              {['weapon', 'shield', 'chest', 'legs', 'amulet', 'cape'].map(eqCell)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* The header names what the numbers below are ABOUT, which is
                  the whole point of a contextual panel: without it, a card
                  that changes when you tap a slot reads as the screen
                  glitching rather than as an answer to the tap. */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 6, marginBottom: 4, minHeight: 18,
              }}>
                <span style={{
                  fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: selCard ? COL.accent : COL.muted,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{selSlot ? (selCard ? selCard.title : selSlot.label) : 'Your stats'}</span>
                {selSlot && selSlot.pickerSlot && (
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
                      flex: 'none', padding: '2px 8px', borderRadius: 999,
                      background: COL.accentFill, border: `1px solid ${COL.accent}`,
                      color: COL.accent, fontFamily: 'inherit',
                      fontSize: 10, fontWeight: 800, letterSpacing: '.04em',
                      cursor: 'pointer',
                    }}>CHANGE</button>
                )}
              </div>

              {selSlot ? (
                /* CONTEXTUAL — this one item's contribution.  An equipped
                   slot with no stat data (legs and cape carry none, by
                   v2.3.1328's own note) says so rather than showing an
                   empty frame that looks broken. */
                selCard ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
                    {kv(selCard.primary.k, selCard.primary.v, true)}
                    {selCard.secondary ? kv(selCard.secondary.k, selCard.secondary.v, true) : <div />}
                  </div>
                ) : (
                  <div style={{
                    padding: '10px 8px', borderRadius: 8,
                    background: COL.wellSoft, border: `1px solid ${COL.tileBor}`,
                    fontSize: 11, fontWeight: 600, color: COL.muted, textAlign: 'center',
                  }}>{selSlot.ghost ? 'Nothing equipped here.' : 'No stat bonuses.'}</div>
                )
              ) : (
                /* AGGREGATE — the whole character, which is what you see
                   when nothing is selected. */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                  {/* v2.3.1668: every cell here now moves when you spend
                      a point.  Block and Speed were removed — Speed was
                      the constant 5.0 and Block read a fixed 25% from a
                      `return 0` stub while describing a mechanic that is
                      actually full invulnerability (see heroModel).
                      Defense and Crit Dmg take their places: both are
                      real allocated stats, and Defense had no readout
                      anywhere in the game before this.
                      One decimal on the percentages, because the caps are
                      30-40% and whole numbers made a 1-point investment
                      render as "0%" — which reads as "that did nothing".

                      v2.3.1697: ARMOUR joins them — worn armour has cut
                      incoming damage for real since v2.3.1679 and no
                      screen in the game said so, which is the same
                      invisible-stat problem Defense had.
                      THREE columns became FOUR rather than three columns
                      becoming three ROWS, deliberately: this panel's body
                      is measured in single pixels (v2.3.1653 note above),
                      its scroll-edge fade is off, and a third row would
                      have pushed the last cells below a fold with no cue
                      that they exist.  DAMAGE spans two columns so a
                      wide range ("120–160") keeps the width it had; every
                      other value is five characters or fewer. */}
                  {cell('Damage', d.dmgText, 2)}
                  {cell('DPS', d.dps.toFixed(1))}
                  {cell('Crit', `${pct1(d.crit)}%`)}
                  {cell('Crit Dmg', p3 ? `+${Math.round(d.critDmg)}` : '—')}
                  {cell('Defense', p3 ? `${pct1(d.defPct)}%` : '—')}
                  {cell('Dodge', `${pct1(d.dodge)}%`)}
                  {/* Not prog3-gated and never '—': armour mitigation
                      applies to every player the server damages, and 0%
                      is the honest reading when nothing is worn. */}
                  {cell('Armour', `${pct1(d.armorDr)}%`)}
                </div>
              )}
            </div>
          </div>
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
      {section === 'Build' && p3 && (
        <>
          <div style={{
            display: 'flex', gap: DASH_GAP, height: HERO_TAB_H,
            flex: 'none', marginBottom: 4,
          }}>
            {PROG3_SKILL_META.map(sk => {
              const on = buildCat === sk.key;
              const lvl = prog3SkillLevel(R, sk.key);
              return (
                <div key={sk.key}
                  role="button" aria-label={`${sk.label}, level ${lvl}`} aria-pressed={on} title={sk.label}
                  onPointerUp={(e) => { e.stopPropagation(); setBuildCat(sk.key); }}
                  style={{
                    flex: '1 1 0', minWidth: 0, height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    background: on ? COL.accentFill : COL.wellSoft,
                    border: `1px solid ${on ? COL.accent : COL.tileBor}`,
                    borderRadius: 7, cursor: 'pointer', touchAction: 'manipulation',
                  }}>
                  <img src={sk.iconSrc} alt="" draggable={false}
                    style={{ width: 18, height: 18, objectFit: 'contain', flex: 'none', opacity: on ? 1 : 0.7, pointerEvents: 'none' }} />
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: on ? COL.accent : COL.text2,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{lvl}</span>
                </div>
              );
            })}
            {/* The pool sits in the selector row rather than owning a
                line of its own — 30px of the budget for one number. */}
            <div style={{
              flex: 'none', minWidth: 46, padding: '0 8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: totalUnspent > 0 ? COL.accentFill : COL.wellSoft,
              border: `1px solid ${totalUnspent > 0 ? COL.accent : COL.tileBor}`,
              borderRadius: 7,
              fontSize: 12, fontWeight: 900,
              color: totalUnspent > 0 ? COL.accent : COL.muted,
              fontVariantNumeric: 'tabular-nums',
            }} aria-label={`${totalUnspent} points available`}>+{totalUnspent}</div>
          </div>

          {/* ═══ v2.3.1703: PILLS ═══
              Owner: "the character star point allocation menu is hard to
              see (tiny font small thumbnails) maybe you can make it a pill
              shape or something easier on the eyes."

              The v2.3.1668 cells were text-only with an 8px label — below
              this project's own 10px font floor (v2.3.1239).  A pill with a
              20px icon, a 10px label and a 15px value replaced them.
              Fully-rounded (the owner's "pill"), which also reads as
              "tap me" next to the square read-only cells on Overview.

              ═══ v2.3.1710: ONE GRID AGAIN, SO EVERY PILL IS ONE SIZE ═══
              Owner: "Character build stat allocation pills should all be
              the same size."

              v2.3.1703 had split the run into TWO grids by what the stats
              ARE — the three offense stats 3-wide, the four body stats
              2-wide underneath — to buy the body stats width.  It bought
              them too much: a 187px body pill beside a 123px attack pill,
              which is the mismatch the owner is looking at.  Both grids
              collapse back into ONE `repeat(3, 1fr)` run, so all seven
              pills are literally the same grid track and cannot drift.

              WHY 3-WIDE and not 2- or 4-.  The height budget here is not a
              preference, it is the v2.3.1660 incident: five of seven stats
              once sat below a fold with no scroll cue, and mp-prog3 has
              measured the Build screen against its own scroll viewport ever
              since — 191px of content into a 191px body on a 390x844
              iPhone, i.e. no headroom at all.
                • 2-wide needs FOUR rows for seven pills. That is a new row
                  the budget does not have.
                • 4-wide fits in two rows but leaves ~91px per pill, which
                  cannot hold a 20px icon AND "ATK SPEED" at the 10px floor
                  on one line; it only works as a stacked icon-over-text
                  cell, which is taller per row and lands back over budget.
                • 3-wide is 3 rows x 34px + 2 gaps = 110px — to the pixel
                  what the two grids cost (34 + 4 + 72) — and 123px per
                  pill, the width the attack pills already prove legible.
              Seven into three leaves the last row ragged (STAMINA alone,
              two empty cells after it).  That is the price of a uniform
              size with a prime number of stats, and it is paid at the END
              of the reading order where a short last line is ordinary.
              The order still groups: offense triplet fills row 1, the four
              body stats follow. */}
          {(() => {
            /* v2.3.1766: what the tooltip strip below is currently describing.
               Held on the component (not a ref) so the strip re-renders when
               it changes; null = resting, which shows overall DPS instead. */
            const showPreview = (st) => {
              try { setStatPeek({ key: st.key, atk: !!st.atk, label: st.label, cat: buildCat }); }
              catch (e) { /* a tooltip must never block a spend */ }
            };
            const pill = (st) => {
              const pts = st.atk ? prog3AtkPts(R, buildCat, st.key) : prog3Pts(R, st.key);
              const cap = prog3StatCap(R, st.key);
              const canSpend = totalUnspent > 0 && pts < cap;
              return (
                <div key={(st.atk ? buildCat + ':' : '') + st.key}
                  role="button"
                  aria-label={`${st.label}${st.atk ? ' for ' + buildCat : ''}, ${pts} of ${cap}. ${st.perText} per point.`}
                  aria-disabled={!canSpend}
                  title={`${st.label} — ${st.perText} per point`}
                  /* v2.3.1766: the tooltip fills on PRESS, before the spend
                     that rides pointer-up.  A stat you cannot afford is still
                     previewable — pills go non-spendable at 0 points or at the
                     cap, and pressing one then is pure inspection. */
                  onPointerDown={(e) => { e.stopPropagation(); showPreview(st); }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (!canSpend || !S || !S.channel) return;
                    /* An offense stat MUST name its category — the server
                       rejects a category-less offense spend rather than
                       guessing which weapon you meant. */
                    S.channel.send({
                      type: 'prog3_allocate',
                      payload: st.atk ? { stat: st.key, cat: buildCat } : { stat: st.key },
                    });
                  }}
                  style={{
                    minWidth: 0, minHeight: 34, padding: '2px 8px',
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: canSpend ? COL.accentFill : COL.wellSoft,
                    border: `1px solid ${canSpend ? COL.accent : COL.tileBor}`,
                    borderRadius: 999,
                    cursor: canSpend ? 'pointer' : 'default',
                    opacity: canSpend ? 1 : 0.75,
                    touchAction: 'manipulation',
                  }}>
                  {/* v2.3.1694 (owner: "add little thumbnails that represent
                      each thing … they were stripped out at some point").
                      v2.3.1703: 16 -> 20px, and left-aligned with the text
                      rather than the pair centred, so the icons line up
                      down the column instead of drifting with label
                      length. */}
                  {st.iconSrc && (
                    <img src={st.iconSrc} alt="" draggable={false}
                      style={{
                        width: 20, height: 20, objectFit: 'contain', flex: 'none',
                        opacity: canSpend ? 1 : 0.8, pointerEvents: 'none',
                      }} />
                  )}
                  <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '.03em',
                      textTransform: 'uppercase', lineHeight: 1.1,
                      color: st.atk ? (canSpend ? COL.accent : COL.text2) : COL.text2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{st.label}</div>
                    <div style={{
                      fontSize: 15, fontWeight: 800, color: COL.text,
                      fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
                      whiteSpace: 'nowrap',
                    }}>{pts}<span style={{ color: COL.muted, fontWeight: 700, fontSize: 10 }}>/{cap}</span></div>
                  </div>
                </div>
              );
            };
            /* v2.3.1710: ONE grid — see the note above.  Every pill is a
               cell of the same `1fr` track, which is the only way "all the
               same size" can be true by construction rather than by two
               layouts happening to agree. */
            /* ═══ v2.3.1766: WHAT A POINT HERE BUYS ═══
               Owner: "a tooltip on the stat allocation screen ... include the
               overall change to crit from baseline and the '+#DPS' changes it
               effects."
               A strip rather than a hover tooltip, because the primary
               platform is iPhone Safari and `title=` never appears on a touch
               device — the pills have carried one since v2.3.1694 and nobody
               on a phone has ever seen it.
               ALWAYS RENDERED, never conditionally, so the grid above cannot
               jump when the text appears; at rest it carries the overall DPS,
               which is the other half of what was asked for. */
            const peekMeta = statPeek
              ? (statPeek.atk ? PROG3_ATK_META : PROG3_BODY_META).find(m => m.key === statPeek.key)
              : null;
            const peek = (statPeek && R)
              ? previewStatPoint(R, statPeek.key, statPeek.cat || buildCat) : null;
            const restDps = (!peek && R) ? overallDps(R) : null;
            const n1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
            const statTxt = (v) => (peekMeta && peekMeta.pct ? n1(v * 100) : n1(v)) + ((peekMeta && peekMeta.unit) || '');
            return (
              <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {PROG3_ATK_META.map(m => pill({ ...m, atk: true }))}
                {PROG3_BODY_META.map(m => pill({ ...m, atk: false }))}
              </div>
              <div aria-live="polite" className="bt-stat-peek" style={{
                marginTop: 5, minHeight: 30, padding: '4px 9px', borderRadius: 8,
                background: COL.wellSoft, border: `1px solid ${COL.tileBor}`,
                fontSize: 10.5, lineHeight: 1.3, color: COL.text2,
                fontVariantNumeric: 'tabular-nums',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                {peek ? (
                  <>
                    <div style={{ color: COL.text, fontWeight: 700 }}>
                      {(statPeek.label || '').toUpperCase()}
                      {statPeek.atk ? ' · ' + String(buildCat).toUpperCase() : ''}
                      {'  '}{statTxt(peek.statNow)} → <span style={{ color: '#59BF91' }}>{statTxt(peek.statAfter)}</span>
                      {peek.capped ? ' (at cap)' : ''}
                    </div>
                    <div>
                      {typeof peek.dpsDelta !== 'number'
                        ? 'Equip a weapon to see what this is worth in damage.'
                        : peek.dpsDelta > 0.049
                          ? <>DPS {n1(peek.dpsNow)} → <span style={{ color: '#59BF91', fontWeight: 700 }}>{n1(peek.dpsAfter)}</span> {'(+' + n1(peek.dpsDelta) + ')'}</>
                          : <>DPS {n1(peek.dpsNow)} — this stat does not change damage</>}
                    </div>
                  </>
                ) : (
                  <div>
                    {restDps
                      ? <>Overall <span style={{ color: COL.text, fontWeight: 700 }}>DPS {n1(restDps.dps)}</span> with your {restDps.weaponName}. Press a stat to see what a point buys.</>
                      : 'Equip a weapon to see your DPS.'}
                  </div>
                )}
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
            fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em',
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
              const lvl = skillLevel(R, s.key);
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
                      fontSize: 9, fontWeight: 900,
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, paddingTop: 6 }}>
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
          ].map(([label, value, icon]) => (
            <div key={label} style={{
              background: COL.wellSoft,
              border: `1px solid ${COL.tileBor}`,
              borderRadius: 7,
              padding: '5px 7px 6px',
              minWidth: 0,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <img src={`/icons/ui/hero/${icon}.webp?v=2.3.1341`} alt="" draggable={false}
                style={{ width: 26, height: 26, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
                <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: COL.muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
              </div>
            </div>
          ))}
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
                fontSize: 8.5, fontWeight: 700, letterSpacing: '.04em',
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
