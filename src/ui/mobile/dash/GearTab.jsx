import React from 'react';
import { COL, getState, qualityInk, QUALITY_LABEL, QUALITY_COLOR } from './common.js';
import { getBagEntries } from './bagModel.js';
import { BagTile, GEAR_SEL_RING, GEAR_SEL_BLUE, GEAR_SEL_TINT } from './InventoryPanel.jsx';
import { GEAR_FILTER_GROUPS, GEAR_FILTERS, GEAR_CELLS, gearCell } from './itemCategory.js';
import { gearTabBus } from './gearTabBus.js';
import { itemActionList, runItemAction, entryTarget } from './itemActions.js';
import { resolveItemCard } from './ItemDetailPopup.jsx';
import { itemDetailBus } from './itemDetailBus.js';
import { weaponSlotFor, unequipWeaponSlot, unequipShieldDirect, unequipArmorDirect, unequipLegsDirect, unequipGearDirect } from './equipActions.js';
import { weaponRows, shieldRows, armourRows, gainRows, charLevel } from './gearStats.js';
import { getEquippedSlots, getEquipContribs, wpnIconSrc, weaponDisplayName, GHOST_SRC } from '../sheet/equipModel.js';
import { CharacterView } from '../sheet/CharacterView.jsx';   /* v2.3.4191: the overview's full-body bro */
import { HERO_PILL_ICON } from '../sheet/heroStatPills.js';   /* v2.3.4191: the item card's stat pictures, the Points window's own */
import { VitalBar, VITAL_ICONS, VITAL_LABEL } from '../sheet/VitalBar.jsx';   /* v2.3.4151: the overview's bars, the Character page's own */
import { shopBus } from '../shopBus.js';
import { getEquip } from '../../../rendering/gearCatalog.js';
import { WEAPON_STASH_MAX, toDisplayHp } from '../../../data/gameSystems.js';
import { gemCutKey, gemIcon, gemElementName } from '@/data/gems.js';
import { coinArtFor } from '@/game/coinArt.js';   /* v2.3.4151: the coins beside the filter */
import { barNumber } from '@/game/barNumbers.js';   /* v2.3.4151: the coins' badge says a big purse short, as the top bar does */
import { UnrevealedMark } from '@/ui/reveal/UnrevealedMark.jsx';   /* v2.3.4151: a "?" piece's mark, as on its card */

/* ═══ v2.3.4151: THE GEAR TAB -- YOUR BAG, ONE CARD, YOUR GEAR ═══
 *
 * The owner's design (2026-11-02): three panels, "inventory on left with
 * filter on top ... the furthest right tab has all the equipped items
 * (tapping on an item highlights it in blue to show active press but
 * highlighted yellow shows what's 'on')".  It is the resting dashboard -- what
 * the bag button opens -- in all three of its homes: the upright phone's
 * band, the sideways phone's column, the computer's column.
 *
 * AS THE OWNER'S SECOND MOCKUP DRAWS IT (2026-11-03: "Inventory slots too
 * cramped. Changed to 9 visible slots"; "The middle panel should function as
 * one contextual information card, without tabs or a character portrait"),
 * with the owner's notes on it the same day:
 *   LEFT    "All Items" (a funnel, the words, a chevron) and the coins (the
 *           coin picture, the amount a count badge as on a bag slot), over a
 *           bag of THREE square slots a row, three rows in view, the rest by
 *           scrolling;
 *   MIDDLE  ONE card.  v2.3.4191 (A4): nothing picked, the full-body bro
 *           wearing what is equipped (CharacterView), "<name> Lv N" above
 *           him and the HP, MP and EN bars below (the owner's arrangement 1;
 *           the three skill tiles moved to the Bro page).  Something picked:
 *           its framed picture, its name in its grade's colour, the grade's
 *           STARS under it (no "Copper · Greatsword" subtitle), "Hardness
 *           N/5" for a weapon, "Qty N" for a stack; then up to four large stat
 *           pills (each its picture, its word, its number and the change
 *           against what you wear) or two lines of what it is for; ONE gold
 *           button at the foot (Equip / Unequip / Use / Reveal...), and the
 *           rest (Drop, Pin, Inspect) behind a "⋯" top-right.  No Sell here
 *           (the item window keeps its own);
 *   RIGHT   "Equipped" over Sword Bow Staff / Chest Legs Cape / Shield Amulet
 *           Gem.
 * v2.3.4151, the owner: "Make equipped slots as big as the slots you're using
 * for inventory" -- one size `t` for both grids; "connect the middle panel
 * ... to whatever the active attention item is (blue outline)" -- the card
 * wears the pick's blue (GEAR_SEL_BLUE, the ring's own colour) while
 * something is picked; "fit data in middle panel compact ... without needing
 * to do any scrolling" -- every state of the card fits its box (nothing in it
 * under 11 px), so it never scrolls (mp-geartab measures it).
 *
 * LAID OUT FROM ITS OWN BOX, NOT THE DEVICE.  The root measures itself
 * (ResizeObserver).  Wide enough (WIDE_AT): the bag | the card | the gear,
 * the two grids' squares one size `t` (as big as the card's MID_MIN allows,
 * never under 34 px), the card the rest.  Narrower (the sideways ~238 px
 * column): the bag and the gear side by side on top, the card the full width
 * under them.  A taller or wider band (Lane B's ?oneband=1) makes `t` bigger.
 *
 * WHAT A TAP DOES (gearTabBus.js holds the state and the rules):
 *   a cell    blue ring; the bag filters to its kind ("Swords" and its ×);
 *             the card shows that item with ONE gold button, Unequip -- tapped
 *             again, both go;
 *   a bag piece  blue ring; the card shows it, its numbers against what is
 *             in its slot, its main action from the one action list
 *             (itemActions.js) gold at the foot, the others behind "⋯";
 *   the bag's empty space, or the picked piece again: back to the overview;
 *   Equip / Unequip  the automatic filter goes back to "All Items".
 * The weapon in your hand wears GOLD (its edge and a glow); the cell you
 * tapped the BLUE ring outside it; both can show.  v2.3.4151: the weapon
 * cells are plain (their level and XP: the Bro page's skill tiles, v2.3.4191).
 * Across a wide band it fills the band's centred assembly (840 px, PR #1424).
 *
 * This retires, for the bag, the notes "a Bag button", "Worn gear back on the
 * band" and "an item card that pushes the character or vitals around"
 * (docs/UI-DESIGN-NOTES.md, "The Gear tab").
 */

const PAD = 3;      /* the panels' own padding (both grids' panels: one size) */
const GAP = 3;      /* between the panels */
const G = 3;        /* between the squares, in both grids */
const SQ_MIN = 34;  /* the floor for a square, bag or gear */
const BAG_COLS = 3;    /* the owner's "9 visible slots": three by three */
const BAG_ROWS = 3;
const MID_MIN = 130;   /* the card wants this much before the squares grow */
const MID_HARD = 110;  /* ...and below this it goes under them (stacked) */
const WIDE_AT = 2 * (3 * SQ_MIN + 2 * G + 2 * PAD + 2) + MID_HARD + 2 * PAD + 2 * GAP;   /* two grid panels (their 1 px borders), the card, the gaps */
const HDR_H = 34;      /* the bag's filter-and-coins row (its controls 32 px: the UI review's floor for a finger) */
const EQ_HEAD = 18;    /* "Equipped" */
const FONT_MIN = 11;   /* the owner's floor for anything in the card */
/* v2.3.4151 capped the tab at 560 px across a wide band (the owner: "The
   stretched middle panel looks silly on computer").  v2.3.4191: Lane B's one
   centred dashboard assembly (PR #1424: sheetGeometry BAND_ASSEMBLY_MAX_W,
   840 px on a computer or a tablet, the button row spanning it) holds every
   tab now, so the Gear tab fills that block as the Bro tab does and has no
   cap of its own.  (Against #1386's 1056 px box the card had stretched to
   ~740 px: the 840 px block is what makes dropping the cap right.) */

const HAND_FIELD = { melee: 'weapon', ranged: 'rangedWeapon', staff: 'staffWeapon' };

/* what each slot is, in one plain sentence */
const SLOT_SENTENCE = {
  sword: 'A melee weapon: swing it up close.',
  bow: 'Shoots arrows from a distance.',
  staff: 'Casts magic orbs that fly at your target.',
  shield: 'Raise it to block a hit.',
  chest: 'Cuts the damage of every hit you take.',
  legs: 'Cuts the damage of every hit you take.',
  cape: 'A contest prize, worn on your back.',
  amulet: 'Adds its gem’s power to your fighting.',
};

const rarityEdge = (q) => (q === 'rare' ? { c: '#5B99DE', w: 2, cls: 'ls-slot--rare' }
  : q === 'elite' ? { c: '#E8893A', w: 2, cls: 'ls-slot--legendary' }
  : q === 'godly' ? { c: 'transparent', w: 2, cls: 'ls-slot--godly' }
  : { c: 'rgba(139, 150, 149, 0.55)', w: 1, cls: '' });

function useMeasure() {
  const ref = React.useRef(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
    };
    read();
    let ro = null;
    try { ro = new ResizeObserver(read); ro.observe(el); } catch (e) { /* an old browser: the first read stands */ }
    return () => { try { ro && ro.disconnect(); } catch (e) { /* gone */ } };
  }, []);
  return [ref, box];
}

/* The equipped piece in a cell, as { item, icon, quality, name, target, rows }.
   `target` is what the cell's Unequip acts on (null: no button). */
function cellContent(R, id, slots) {
  const c = gearCell(id);
  if (c.field) {
    const wpn = R[c.field] || null;
    return {
      item: wpn, icon: wpn ? wpnIconSrc(R, wpn) : null, quality: wpn && wpn.quality,
      name: wpn ? weaponDisplayName(wpn) : '',
      unequip: wpn ? () => unequipWeaponSlot(c.active === 'melee' ? 'weapon' : c.active) : null,
      rows: wpn ? weaponRows(R, wpn) : [],
    };
  }
  const sl = slots.find((x) => x.slot === id);
  if (id === 'shield') {
    return { item: R.shield || null, icon: sl && sl.iconSrc, quality: R.shield && R.shield.quality,
      name: (R.shield && R.shield.name) || 'Shield', unequip: R.shield ? () => unequipShieldDirect() : null,
      rows: shieldRows(R.shield) };
  }
  if (id === 'chest' || id === 'legs') {
    const piece = id === 'chest' ? R.armor : R.legsArmor;
    const gearId = getEquip(id);
    const worn = !!(sl && sl.item);
    const unequip = piece ? () => (id === 'chest' ? unequipArmorDirect() : unequipLegsDirect())
      : (gearId && gearId !== 'none') ? () => unequipGearDirect(id) : null;
    return { item: worn ? (piece || sl.item) : null, icon: sl && sl.iconSrc, quality: piece && piece.quality,
      name: (piece && piece.name) || (id === 'chest' ? 'Chest' : 'Legs'), unequip,
      rows: piece ? armourRows(piece, id) : [] };
  }
  if (id === 'cape') {
    const it = sl && sl.item;
    return { item: it || null, icon: sl && sl.iconSrc, quality: null, name: it ? it.name : 'Cape',
      unequip: it ? () => {
        const S = getState();
        try { if (S && S.channel) S.channel.send({ type: 'cape_equip', payload: { worn: false } }); } catch (e) { /* offline */ }
      } : null,
      rows: [] };
  }
  if (id === 'amulet') {
    /* v2.3.4151: NO Unequip -- the worker's unequip_request for the amulet
       slot nulls it with no bag to put it in (gear.js _handleUnequipRequest:
       "armor/shield/amulet just null out"), so the button would destroy it */
    const card = getEquipContribs(R).cards.amulet;
    return { item: R.amulet || null, icon: sl && sl.iconSrc, quality: null,
      name: (R.amulet && R.amulet.name) || 'Amulet', unequip: null,
      rows: card ? card.rows.map((r) => ({ k: r.k, v: r.v })) : [] };
  }
  /* gem: the gems set in the weapon in your hand */
  const hand = R[HAND_FIELD[R.activeSlot || 'melee']] || null;
  const els = hand ? [hand.element1, hand.element2].filter(Boolean) : [];
  return { item: els.length ? { els, hand } : null, icon: null, els, hand, quality: null,
    name: els.length ? els.map((e) => gemElementName(e) + ' Gem').join(' + ') : 'Gem', unequip: null, rows: [] };
}

const actBtn = (tone, off) => ({
  width: '100%', minHeight: 32, padding: '4px 4px', boxSizing: 'border-box',
  fontSize: 12, fontWeight: 800, fontFamily: 'inherit', borderRadius: 8, cursor: off ? 'default' : 'pointer',
  border: `1px solid ${tone === 'primary' ? COL.accent : tone === 'danger' ? '#C7655F' : COL.borderStrong}`,
  background: tone === 'primary' ? COL.accentFill : tone === 'danger' ? 'rgba(124,52,49,.55)' : COL.raised,
  color: tone === 'danger' ? '#FFF1EE' : COL.text, opacity: off ? 0.45 : 1,
  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
});

/* v2.3.4151: the mockup's small pictures, drawn inline (no new picture files:
   the memory law) -- the filter's funnel and its chevron */
const Funnel = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ flex: 'none', display: 'block' }}>
    <path d="M2 2.5h12l-4.6 5.6v4.6l-2.8 1.3V8.1z" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
const Chevron = ({ size, color, up }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ flex: 'none', display: 'block', transform: up ? 'rotate(180deg)' : undefined }}>
    <path d="M3 6l5 5 5-5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ═══ v2.3.4191: THE ITEM CARD'S PILLS, STARS AND HARDNESS ═══
 * The owner (2026-11-03): "I want the item selection menu to look more like
 * this (larger pills) ... Remove the 'greatsword common' type subtitles ...
 * a simple star system in the place of the item subtitles (one star - white
 * for common), (two star, blue for rare, etc) ... a basic number line
 * hardness 0/5 ... each large cell 'damage' 'DPS' was accompanied by icons.
 * There should already be icons made for all of these stats."
 *   PILLS  a stat a pill, two to a row: its picture (the Points window's and
 *          the hero sheet's own files, HERO_PILL_ICON), its word, its number,
 *          and -- when it would replace something you wear -- the change in
 *          the pill: a green ▲ +N, a red ▼ -N, or "--" for the same;
 *   STARS  the game's own grades (common.js QUALITY_COLOR / QUALITY_LABEL,
 *          server QUALITY_GRADES): normal 1 white, rare 2 blue, elite 3
 *          orange (the game's elite colour), godly 4 in the godly gold --
 *          the name already wears the same colour;
 *   HARDNESS  a weapon's hardness, 0 to 5 (gameSystems weaponEffBase; the
 *          worker's hardening.js ladder), as "Hardness N/5". */
const PILL_ICON = {
  Damage: '/icons/ui/stat/dmg.png?v=2.3.2642', DPS: HERO_PILL_ICON.dps, Speed: HERO_PILL_ICON.aspd, Range: HERO_PILL_ICON.range,
  Block: HERO_PILL_ICON.def, Stamina: HERO_PILL_ICON.stam, Defence: HERO_PILL_ICON.def, 'Damage cut': HERO_PILL_ICON.armor,
};
const PILL_WORD = { Damage: 'DAMAGE', DPS: 'DPS', Speed: 'SPEED', Range: 'RANGE', Block: 'BLOCK', Stamina: 'ENERGY', Defence: 'DEFENCE', 'Damage cut': 'ARMOR' };   /* v2.3.4191: the owner, of 'CUT': "ARMOR" (42% = you take 42% less damage) */
/* a narrow pill (the 390 phone's ~58 px): three letters, the picture beside them says the rest */
const PILL_SHORT = { Damage: 'DMG', DPS: 'DPS', Speed: 'SPD', Range: 'RNG', Block: 'BLK', Stamina: 'EN', Defence: 'DEF', 'Damage cut': 'ARMOR' };
const STAR_COUNT = { normal: 1, rare: 2, elite: 3, godly: 4 };
const GEAR_MORE_ONLY = { drop: 1, lock: 1, inspect: 1 };   /* never the gold button: always behind "⋯" */
const HARDNESS_MAX = 5;   /* weapon.hardness is an int 0-5 (hardening.js) */
const Stars = ({ q }) => {
  const g = STAR_COUNT[q] ? q : 'normal';
  const c = QUALITY_COLOR[g] || COL.text;
  return (
    <span data-gear-stars={STAR_COUNT[g]} data-grade={g} title={QUALITY_LABEL[g] || 'Normal'} aria-label={(QUALITY_LABEL[g] || 'Normal') + ', ' + STAR_COUNT[g] + ' star' + (STAR_COUNT[g] > 1 ? 's' : '')}
      style={{ flex: 'none', fontSize: 12, lineHeight: 1, letterSpacing: 1, color: c, whiteSpace: 'nowrap' }}>{'★'.repeat(STAR_COUNT[g])}</span>
  );
};
/* the stat pills: `rows` gearStats rows ({k, v}) or compareRows ({k, now,
   diff, tone, old}); `cmp` true when the change is shown (a bag piece:
   against what you wear, a missing stat or an empty slot as 0, v2.3.4191);
   `w` the card's inner width, for the words */
const StatPills = ({ rows, cmp, w, line }) => {
  const pw = Math.floor(((w || 120) - 4) / 2);
  const words = pw >= 78 ? PILL_WORD : PILL_SHORT;
  if (line) {
    /* the short band: the first three on one line, "WORD value change" */
    return (
      <div data-gear-grid="" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', columnGap: 4 }}>
        {rows.slice(0, 3).map((r) => (
          <div key={r.k} {...(cmp ? { 'data-gear-cmp': r.k, 'data-tone': r.tone } : { 'data-gear-stat': r.key || r.k })}
            style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 3, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: FONT_MIN, fontWeight: 800, color: COL.muted }}>{PILL_SHORT[r.k] || r.k}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>{r.now != null ? r.now : r.v}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div data-gear-grid="" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
      {rows.slice(0, 4).map((r, i, all) => {
        const up = cmp && r.tone > 0, down = cmp && r.tone < 0;
        /* v2.3.4191, the owner: no "--" -- equal, or nothing to compare, shows nothing under the value */
        const change = !cmp ? null : r.old == null || r.old === '—' ? null : (r.diff === '=' || !r.diff) ? null : (up ? '▲ ' : down ? '▼ ' : '') + r.diff;
        return (
          <div key={r.k} {...(cmp ? { 'data-gear-cmp': r.k, 'data-tone': r.tone } : { 'data-gear-stat': r.key || r.k })}
            title={cmp && r.old != null ? `${r.k}: ${r.old} → ${r.now}` : r.k}
            style={{
              /* v2.3.4191: a lone pill (armour's one ARMOR) spans the row, so its word is whole */
              ...(all.length === 1 ? { gridColumn: '1 / -1' } : null),
              minWidth: 0, boxSizing: 'border-box', padding: '1px 5px', borderRadius: 8,
              background: COL.wellSoft, border: `1px solid ${COL.border}`,
              display: 'flex', flexDirection: 'column', gap: 0, lineHeight: 1.1, overflow: 'hidden',
            }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
              {PILL_ICON[r.k] && <img src={PILL_ICON[r.k]} alt="" draggable={false} style={{ width: 12, height: 12, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />}
              <span style={{ fontSize: FONT_MIN, fontWeight: 800, color: COL.muted, letterSpacing: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{words[r.k] || r.k}</span>
            </span>
            {/* v2.3.4191: the number and its change side by side where they
                fit, the change under the number where they do not -- never
                "2.. ▲ +27" (a gain beside a number cut it short) */}
            <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 3, rowGap: 0, minWidth: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              <span data-gear-val="" style={{ flex: 'none', maxWidth: '100%', fontSize: 13, fontWeight: 800, color: COL.text, overflow: 'hidden' }}>{r.now != null ? r.now : r.v}</span>
              {change && (
                <span data-gear-diff={up ? 'up' : down ? 'down' : 'same'} style={{ flex: 'none', fontSize: FONT_MIN, fontWeight: 800, lineHeight: 1, color: up ? COL.xp : down ? COL.danger : COL.muted }}>{change}</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* v2.3.4191: THE NAME IS NEVER CUT.  The owner dropped the type subtitle
   because "the type of sword is already in the name", so a name cut to
   "Copper Grea..." loses the type.  It takes the head row's whole width (the
   "⋯" moved to the foot, beside the gold button) and two lines (one in the
   short band); a name that still needs more is set smaller, half a px at a
   time, down to NAME_FLOOR (10 px -- the name alone; everything else keeps
   the 11 px floor), before anything is clipped.  Words never break inside
   (the longest in the game: "Worldbreaker Greatsword", "Black Steel
   Greaves"; mp-geartab sets those on a real card and reads them whole). */
const NAME_FLOOR = 10;
const NAME_LH = 1.12;
const FitName = ({ name, quality, size, lines }) => {
  const ref = React.useRef(null);
  const [fit, setFit] = React.useState({ fs: size, clamp: false });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* measured as a plain block (a line clamp reports its own heights) */
    const prev = el.style.cssText;
    el.style.display = 'block'; el.style.webkitLineClamp = 'unset'; el.style.maxHeight = 'none';
    let f = size, ok = false;
    for (; f >= NAME_FLOOR; f -= 0.5) {
      el.style.fontSize = f + 'px';
      /* its lines by its own height (offsetHeight: a glyph's overhang does
         not count), its widest word by scrollWidth */
      if (el.offsetHeight - 2 <= lines * f * NAME_LH + 1 && el.scrollWidth <= el.clientWidth + 0.5) { ok = true; break; }
    }
    if (!ok) f = NAME_FLOOR;
    el.style.cssText = prev;
    if (f !== fit.fs || !ok !== fit.clamp) setFit({ fs: f, clamp: !ok });
  });
  /* a plain block that fits (1 px above and below: the bold face's
     overhang inside its box, so nothing is clipped); only past the floor
     (nothing in the game's data today) the line clamp's ellipsis */
  return (
    <div ref={ref} data-gear-name={name} data-fs={fit.fs} data-clamped={fit.clamp ? '1' : undefined} style={{
      fontSize: fit.fs, fontWeight: 800, lineHeight: NAME_LH, padding: '1px 0', color: COL.text, ...(qualityInk(quality) || null), overflowWrap: 'normal', wordBreak: 'normal',
      ...(fit.clamp ? { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical' } : { display: 'block' }), overflow: 'hidden',
    }}>{name}</div>
  );
};

export const GearTab = ({ R: Rin, desk }) => {
  const R = Rin || {};
  const [rootRef, box] = useMeasure();
  const [, tick] = React.useReducer((n) => (n + 1) % 1000000, 0);
  React.useEffect(() => gearTabBus.subscribe(() => tick()), []);
  React.useEffect(() => shopBus.subscribe(() => tick()), []);   /* v2.3.2059: the bag is half the shop */
  React.useEffect(() => itemDetailBus.subscribe(() => tick()), []);
  /* v2.3.4191: no XP count-up here any more (the skills' tiles left for the
     Bro page), so no frame loop either */
  const bro = React.useRef(null);

  const st = gearTabBus.state;
  const allEntries = getBagEntries(Rin);
  const fid = st.filter.id;
  const entries = fid === 'all' ? allEntries : allEntries.filter((e) => e.gcat === fid);
  const counts = Object.create(null);
  for (const e of allEntries) counts[e.gcat] = (counts[e.gcat] || 0) + 1;
  const weaponsHeld = (R.weaponStash || []).filter(Boolean).length;
  const slots = Rin ? getEquippedSlots(R) : [];

  /* the bag pick, resolved against the bag as it is now (a stash object by
     identity, an item by its key) -- a pick the bag no longer holds is none */
  let selEntry = null;
  if (st.sel && st.sel.bag) {
    selEntry = allEntries.find((e) => (st.sel.obj ? e.obj === st.sel.obj : (e.kind === 'item' && 'i-' + e.key === st.sel.bag))) || null;
  }
  const selCell = st.sel && st.sel.cell ? st.sel.cell : null;
  const view = selCell || selEntry ? 'item' : 'overview';

  /* ── geometry: one square size `t` for both grids ── */
  const wide = box.w >= WIDE_AT;
  const W = Math.max(0, box.w), H = Math.max(0, box.h);
  /* v2.3.4191: the computer's weapon bar under the three is retired: since
     #1405 the weapon pill at the foot of the world (keys 1 2 3) is the one
     weapon switcher on every layout, the owner's choice */
  const footH = 0;
  let t, sideH, broW, broH;
  let padX = 0;   /* v2.3.4191: the two grid panels' extra side padding in a wide block (below) */
  /* v2.3.4151: SHORT -- a box too short for three rows of 34 px squares (the
     one band open on a sideways phone, Lane B's ~78 px row: PR #1410).  Both
     grids lie in ONE row of nine (the bag's nine in view, the nine cells in
     their order), and the card goes compact (shortCard below), so nothing is
     cut off, nothing scrolls, and the squares keep their one size. */
  const short = wide && (H - 2 * PAD - footH - 2 * PAD - 2 - HDR_H - 3 * G) / 3 < SQ_MIN;
  /* the grids' gutters and their panels' padding: 3 px, 2 px in the
     sideways column and the short band, where every pixel is wanted */
  const gg = wide && !short ? G : 2, pp = wide && !short ? PAD : 2;
  const rp = wide ? PAD : 1, rg = wide ? GAP : 2;   /* the root's padding and gaps, likewise */
  const cols = short ? 9 : BAG_COLS, rows = short ? 1 : BAG_ROWS;
  const hdr = short ? 28 : HDR_H;   /* the filter row: 26 px controls in the short band */
  const side = (x) => cols * x + (cols - 1) * gg + 2 * pp + 2;
  if (short) {
    const inner = W - 2 * PAD - 2 * GAP;
    sideH = H - 2 * PAD - footH;
    const tW = Math.floor((inner - 170 - 2 * (8 * gg + 2 * pp + 2)) / 18);
    const tH = sideH - 2 * pp - 2 - hdr - gg;
    t = Math.max(24, Math.min(tW, tH, 44));
    broW = inner - 2 * side(t);
    broH = sideH;
  } else if (wide) {
    /* the bag | the card | the gear: the squares as big as the card's
       MID_MIN and the height allow (never under 34 px; a 360 px phone pays
       for its 34 px squares out of the card), the card the rest */
    const inner = W - 2 * PAD - 2 * GAP;
    sideH = H - 2 * PAD - footH;
    const tW = Math.floor((inner - MID_MIN - 2 * (2 * gg + 2 * pp + 2)) / 6);
    const tH = Math.min(Math.floor((sideH - 2 * pp - 2 - hdr - gg - 2 * gg) / 3), Math.floor((sideH - 2 * pp - 2 - EQ_HEAD - 2 * gg) / 3));
    t = Math.max(SQ_MIN, Math.min(tW, tH, 64));
    broW = inner - 2 * side(t);
    broH = sideH;
    /* v2.3.4191: THREE EQUAL PANELS IN A WIDE BLOCK.  The squares are held by
       the row's height (three rows: ~45 px in the band's 191 px), so in Lane
       B's 840 px assembly (PR #1424) the card alone took the rest -- 530 px
       beside two 149 px panels, the bro small in a long box, the bars long
       strips.  Once the card would be more than twice a grid panel, the
       three share the width equally (the Bro tab's own thirds, ~276 px each),
       each grid centred in its panel at its own size; a phone (the card
       ~134 px) is untouched. */
    if (broW > 2 * side(t)) {
      padX = Math.max(0, Math.floor((Math.floor(inner / 3) - side(t)) / 2));
      broW = inner - 2 * (side(t) + 2 * padX);
    }
  } else {
    /* the sideways column: the bag and the gear side by side on top, the
       card the full width under them */
    const inner = W - 2 * rp;
    t = Math.max(28, Math.min(56, Math.floor((inner - rg - 2 * (2 * gg + 2 * pp + 2)) / 6)));
    sideH = 2 * pp + 2 + hdr + gg + 3 * t + 2 * gg;
    broW = inner;
    broH = H > 0 ? Math.max(120, H - 2 * rp - footH - sideH - rg) : 160;
  }
  const sideW = side(t) + 2 * padX;
  const gridH = sideH - 2 * pp - 2 - hdr - gg;
  const rowsIn = Math.max(1, Math.min(rows, Math.floor((gridH + gg) / (t + gg))));
  const viewH = rowsIn * t + (rowsIn - 1) * gg;
  const fillTo = Math.max(Math.ceil(entries.length / cols), rows) * cols;

  const panel = (extra) => ({
    background: COL.well, border: `1px solid ${COL.borderStrong}`, borderRadius: 10,
    boxSizing: 'border-box', padding: PAD, minWidth: 0, minHeight: 0, position: 'relative',
    display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(extra || null),
  });

  /* ═════ INVENTORY ═════ */
  const filterWord = fid === 'all' ? 'All Items' : ((GEAR_FILTERS[fid] || {}).pill || 'Filter');
  const hdrW = side(t) - 2 * pp - 2;   /* the grid's own width: the head lines up with the squares */
  const coins = Number(R.coins || 0);
  const roomy = hdrW >= 128;   /* room for the chevron beside the coins */
  const inventory = (
    <div data-gear-pane="inv" style={panel({ width: sideW, height: sideH, flex: 'none', padding: `${pp}px ${pp + padX}px` })}>
      {/* the mockup's head -- "All Items" (or the filter on, with its ×) and
          the coins beside it */}
      <div style={{ height: hdr, flex: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
        <button type="button" data-gear-filter={fid} aria-expanded={st.menu} aria-label={'Filter: ' + filterWord}
          onClick={(e) => { e.stopPropagation(); gearTabBus.setMenu(!st.menu); }}
          style={{
            flex: '1 1 auto', minWidth: 0, height: hdr - 2, padding: '0 5px', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            border: `1px solid ${fid === 'all' ? COL.borderStrong : COL.accent}`,
            background: fid === 'all' ? COL.wellSoft : COL.accentFill, color: COL.text,
            fontFamily: 'inherit', fontSize: 11, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}>
          {/* with a filter on, its word needs the room: the gold edge says "filtered" */}
          {(fid === 'all' || hdrW >= 150) && <Funnel size={12} color={fid === 'all' ? COL.text2 : COL.accent} />}
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{filterWord}</span>
          {fid === 'all' && roomy && <Chevron size={11} color={COL.text2} up={st.menu} />}
        </button>
        {fid !== 'all' && (
          <button type="button" data-gear-filter-clear="" aria-label="Clear the filter"
            onClick={(e) => { e.stopPropagation(); gearTabBus.clearFilter(); }}
            style={{
              flex: 'none', width: 26, height: hdr - 2, borderRadius: 8, padding: 0,
              border: `1px solid ${COL.accent}`, background: COL.accentFill, color: COL.text,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
            }}>{'×'}</button>
        )}
        {/* v2.3.4151, the owner: "Make gold icon as big as it can fit in that
            space and just put a badge over the number of gold (or whatever
            you currently do for item quantities)" -- the coins as a bag slot
            is: the picture filling its box, the amount the slots' own count
            badge (.bt-item-qty), a big purse said short as the top bar says
            it (barNumber: "12.4K") */}
        <span data-gear-gold={coins} title={coins.toLocaleString() + ' coins'} aria-label={coins.toLocaleString() + ' coins'} style={{
          flex: 'none', width: hdr, height: hdr - 2, boxSizing: 'border-box', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: `1px solid ${COL.border}`, background: COL.wellSoft,
        }}>
          <img src={coinArtFor(coins)} alt="" draggable={false} style={{ width: '88%', height: '88%', objectFit: 'contain', pointerEvents: 'none' }} />
          <span className="bt-item-qty" data-gear-gold-badge="">{barNumber(coins, true, 10000)}</span>
        </span>
      </div>
      {/* the bag */}
      {entries.length === 0 && fid !== 'all' ? (
        <div data-gear-empty={fid} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 6, textAlign: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: COL.text2 }}>No {(GEAR_FILTERS[fid] || {}).none || 'items'} in your bag</span>
          <button type="button" data-gear-showall=""
            onClick={(e) => { e.stopPropagation(); gearTabBus.clearFilter(); }}
            style={{ ...actBtn(undefined, false), width: 'auto', padding: '4px 14px' }}>Show all</button>
        </div>
      ) : (
        /* nine in view, the rest by scrolling; a tap on an empty square (or
           the space round them) puts the pick down */
        <div data-gear-bag=""
          onClick={(e) => { if (!(e.target && e.target.closest && e.target.closest('[data-bag-key]'))) gearTabBus.deselect(); }}
          style={{
            flex: 'none', height: viewH, marginTop: gg, overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${t}px)`, gridAutoRows: `${t}px`, gap: gg, justifyContent: 'center' }}>
            {Array.from({ length: fillTo }, (_, i) => {
              const e = entries[i];
              if (!e) return <div key={'w' + i} data-gear-slot-empty="" aria-hidden="true" style={{ background: COL.wellSoft, border: `1px solid ${COL.border}`, borderRadius: 8 }} />;
              const bagKey = e.kind === 'item' ? 'i-' + e.key : `${e.kind}-${e.index}`;
              const on = !!(selEntry && selEntry === e);
              return (
                <BagTile key={bagKey + ':' + i} entry={e} selected={on}
                  onSelect={() => gearTabBus.tapBag(bagKey, e.kind === 'item' ? null : e.obj)}
                  style={{ aspectRatio: 'auto', height: '100%' }} />
              );
            })}
          </div>
        </div>
      )}
      {/* the menu: down over the bag panel only */}
      {st.menu && (
        <div data-gear-menu="" style={{
          position: 'absolute', left: pp + padX, right: pp + padX, top: pp + hdr, bottom: pp, zIndex: 6,
          background: COL.bg, border: `1px solid ${COL.borderStrong}`, borderRadius: 8,
          boxShadow: '0 8px 18px rgba(4,7,9,.45)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px 2px 8px', borderBottom: `1px solid ${COL.divider}` }}>
            <span style={{ flex: 'none', fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: COL.muted }}>Show</span>
            {/* the weapon bag's fill -- no cap on the bag (only the weapon bag has one) */}
            <span data-gear-fill="" style={{ flex: 1, minWidth: 0, textAlign: 'right', fontSize: 10, fontWeight: 700, color: COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
              weapons {weaponsHeld}/{WEAPON_STASH_MAX}
            </span>
            <button type="button" data-esc="" data-key="Esc" data-key-at="hang" aria-label="Close the filter menu"
              onClick={(e) => { e.stopPropagation(); gearTabBus.setMenu(false); }}
              style={{ position: 'relative', flex: 'none', width: 34, height: 32, padding: 0, border: 'none', background: 'transparent', color: COL.text, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation' }}>{'✕'}</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', padding: 3 }}>
            {[{ id: 'all', label: 'All items', rows: ['all'] }].concat(GEAR_FILTER_GROUPS).map((g) => {
              const n = g.rows.reduce((a, id) => a + (id === 'all' ? allEntries.length : (counts[id] || 0)), 0);
              const multi = g.rows.length > 1;
              return (
                <div key={g.id} data-gear-group={g.id} style={{ opacity: n ? 1 : 0.42 }}>
                  {multi && <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.muted, padding: '5px 6px 2px' }}>{g.label}</div>}
                  {g.rows.map((id) => {
                    const c = id === 'all' ? allEntries.length : (counts[id] || 0);
                    const word = id === 'all' ? 'All items' : multi ? GEAR_FILTERS[id].pill : g.label;
                    const cur = fid === id;
                    return (
                      <button type="button" key={id} data-gear-filter-row={id} data-count={c}
                        onClick={(e) => { e.stopPropagation(); gearTabBus.pickFilter(id); }}
                        style={{
                          width: '100%', minHeight: 34, display: 'flex', alignItems: 'center', gap: 6,
                          padding: multi ? '0 8px 0 14px' : '0 8px', boxSizing: 'border-box', borderRadius: 6,
                          border: `1px solid ${cur ? COL.accent : 'transparent'}`, background: cur ? COL.accentFill : 'transparent',
                          color: c ? COL.text : COL.disabled, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                          textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation',
                        }}>
                        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{word}</span>
                        <span style={{ flex: 'none', fontSize: 11, fontWeight: 800, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>{c}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /* ═════ EQUIPMENT ═════ */
  const hand = R.activeSlot || 'melee';
  const cellEl = (c) => {
    const ct = cellContent(R, c.id, slots);
    const filled = !!ct.item;
    const blue = selCell === c.id;
    const gold = !!(c.active && c.active === hand && filled);
    const edge = rarityEdge(ct.quality);
    /* the weapon in hand gold-edged and glowing, as the mockups draw it (a
       ring inside, so a rarity edge and the blue pick ring outside can both
       still show) */
    const ring = [gold ? `inset 0 0 0 2px ${COL.focus}` : null, gold && !blue ? '0 0 9px rgba(234, 198, 117, 0.55)' : null, blue ? GEAR_SEL_RING : null].filter(Boolean).join(', ');
    /* v2.3.4151, the owner: "remove the points badges and thin xp lines from
       those" -- a weapon cell is its picture (and the hand's gold) only; the
       level and the XP live on the Bro page's skill tiles (v2.3.4191) */
    const pic = c.id === 'gem'
      ? null
      : (ct.icon || GHOST_SRC[c.id === 'sword' || c.id === 'bow' || c.id === 'staff' ? 'weapon' : c.id]);
    return (
      <div key={c.id} data-eqslot={c.id} data-gear-cell={c.id}
        data-gear-sel={blue ? '1' : undefined} data-gear-active={gold ? '1' : undefined}
        data-gear-filled={filled ? '1' : '0'}
        className={edge.cls || undefined}
        role="button" aria-pressed={blue} aria-label={c.label + (filled ? ': ' + ct.name : ', empty')}
        title={c.label + (filled ? ' — ' + ct.name : '')}
        onPointerUp={(e) => { e.stopPropagation(); gearTabBus.tapCell(c.id); }}
        style={{
          width: t, height: t, boxSizing: 'border-box', position: 'relative', flex: 'none',
          background: filled ? COL.slot : COL.wellSoft,
          border: `${filled ? edge.w : 1}px solid ${gold ? COL.accent : filled ? edge.c : COL.border}`, borderRadius: 8,
          boxShadow: ring || undefined,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation',
        }}>
        {c.id === 'gem' ? (
          ct.els && ct.els.length ? (
            <span style={{ display: 'flex', gap: 1, pointerEvents: 'none' }}>
              {ct.els.map((el, i) => <img key={el + i} src={gemIcon(gemCutKey(el))} alt="" draggable={false} style={{ width: ct.els.length > 1 ? t * 0.42 : t * 0.66, height: ct.els.length > 1 ? t * 0.42 : t * 0.66, objectFit: 'contain' }} />)}
            </span>
          ) : (
            <span aria-hidden="true" style={{ fontSize: t * 0.46, lineHeight: 1, opacity: 0.25, filter: 'grayscale(1)', pointerEvents: 'none' }}>{'💎'}</span>
          )
        ) : (
          <img src={pic} alt="" draggable={false} style={{ width: '78%', height: '78%', objectFit: 'contain', opacity: filled ? 1 : 0.3, pointerEvents: 'none' }} />
        )}
      </div>
    );
  };
  const equipment = (
    <div data-gear-pane="equip" style={panel({ width: sideW, height: sideH, flex: 'none', padding: `${pp}px ${pp + padX}px`, alignItems: 'center', justifyContent: 'flex-start' })}>
      {/* the mockup's "Equipped" head */}
      <div data-gear-eqhead="" style={{ height: EQ_HEAD, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800, color: COL.text, letterSpacing: '.02em' }}>Equipped</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${t}px)`, gridAutoRows: `${t}px`, gap: gg, marginTop: Math.max(0, Math.min(hdr + gg - EQ_HEAD, Math.floor((sideH - 2 * pp - 2 - EQ_HEAD - 3 * t - 2 * gg) / 2))) }}>
        {GEAR_CELLS.map(cellEl)}
      </div>
    </div>
  );

  /* ═════ THE CARD ═════ */
  const nameEl = (name, quality) => <FitName name={name} quality={quality} size={short ? 12 : 13} lines={short ? 1 : 2} />;
  /* one or two lines of plain words, never more (the card never scrolls) */
  const sentence = (txt, color, lines) => txt ? (
    <div data-gear-info="" style={{
      fontSize: FONT_MIN, color: color || COL.text2, lineHeight: 1.3,
      display: '-webkit-box', WebkitLineClamp: lines || 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
    }}>{txt}</div>
  ) : null;
  /* the pick's picture in its frame */
  /* v2.3.4191: 30 px on a narrow card (a 360 px phone's ~104 px inside),
     so the name beside it keeps "Worldbreaker" on one line */
  const iw = Math.max(60, broW - 2 * (short ? 2 : PAD) - 2 - (short ? 2 : 4));   /* the card's inner width */
  const artPx = short ? 24 : (iw < 116 ? 30 : 38);
  const art = (thumb, glyph, hidden) => (
    <div data-gear-art="" style={{
      width: artPx, height: artPx, flex: 'none', position: 'relative', boxSizing: 'border-box', borderRadius: 8,
      background: '#121B20', border: `1.5px solid ${COL.edgeWarm}`,
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: short ? 15 : 20,
    }}>
      {thumb
        ? <img src={thumb} alt="" draggable={false} style={{ width: '84%', height: '84%', objectFit: 'contain', pointerEvents: 'none', ...(hidden ? { filter: 'brightness(0) opacity(.55)' } : null) }} />
        : glyph ? <span aria-hidden="true">{glyph}</span> : null}
      {hidden && <UnrevealedMark size={short ? 16 : 22} />}
    </div>
  );
  /* v2.3.4191: the "⋯" -- at the card's foot beside the gold button (it
     sat top-right and ate the name's room) -- the card's other actions (Drop, Pin,
     Inspect...), never Sell (the owner: "Just remove the 'sell' option for
     now. I don't think this is a good feature to have next to equip button") */
  const moreBtn = (has) => (has ? (
    <button type="button" data-gear-act="more" aria-label="More actions" aria-expanded={st.more}
      onClick={(e) => { e.stopPropagation(); gearTabBus.setMore(!st.more); }}
      style={{
        flex: 'none', width: short ? 30 : 40, minHeight: short ? 22 : 32, padding: 0, borderRadius: 9,
        border: `1px solid ${COL.borderStrong}`, background: st.more ? COL.raised : COL.wellSoft, color: COL.text,
        fontFamily: 'inherit', fontSize: 16, fontWeight: 900, lineHeight: 1, cursor: 'pointer', touchAction: 'manipulation',
      }}>{'⋯'}</button>
  ) : null);
  /* the head: the frame, the name in its grade's colour, and under it the
     stars (or a "?" piece's "Rare or better"), "Hardness N/5" for a weapon,
     the count of a stack -- no "Copper · Greatsword" subtitle */
  const head = (pic, name, quality, opts) => {
    const o = opts || {};
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', minWidth: 0, flex: 'none' }}>
        {pic}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nameEl(name, quality)}
          <div data-gear-kind="" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 1, minWidth: 0, whiteSpace: 'nowrap', fontSize: FONT_MIN, fontWeight: 700, color: COL.muted, lineHeight: 1.2 }}>
            {/* v2.3.4191: it wraps, never clips -- "Qty 12" beside the star was cut to "Qty 1" in a 390 phone's card */}
            {o.hidden ? <span style={{ color: o.infoColor || COL.text2 }}>{o.info}</span> : o.noStars ? null : <Stars q={quality} />}
            {o.qty > 1 && <span data-gear-qty={o.qty} style={{ color: COL.text, flex: 'none' }}>Qty {o.qty}</span>}
            {o.extra && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.extra}</span>}
          </div>
        </div>
      </div>
    );
  };
  /* v2.3.4191: the owner's "basic number line hardness 0/5" -- the word,
     five marks (the hardened ones gold) and "N/5", a row of its own under the
     head (beside the stars it was cut to "Hard..." on a 390 phone); the
     short band (one row, ~66 px) has no room for it */
  const hardLine = (n) => (n == null ? null : (
    <div data-gear-hardness={n} aria-label={`Hardness ${n} of ${HARDNESS_MAX}`}
      style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, whiteSpace: 'nowrap', fontSize: FONT_MIN, fontWeight: 800, color: COL.muted, lineHeight: 1 }}>
      <span>Hardness</span>
      <span aria-hidden="true" style={{ flex: 1, minWidth: 20, display: 'flex', gap: 2 }}>
        {Array.from({ length: HARDNESS_MAX }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < n ? COL.accent : COL.border }} />
        ))}
      </span>
      <span data-gear-hardness-num="" style={{ color: COL.text, fontVariantNumeric: 'tabular-nums' }}>{n}/{HARDNESS_MAX}</span>
    </div>
  ));
  const hardOf = (w) => (w && typeof w === 'object' ? Math.max(0, Math.min(HARDNESS_MAX, Math.floor(Number(w.hardness) || 0))) : null);
  /* the ONE main button, gold, at the card's foot */
  const goldBtn = (id, label, onClick, attrs) => (
    <button type="button" data-gear-act={id} {...(attrs || {})}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        flex: 1, minWidth: 0, minHeight: short ? 22 : 32, boxSizing: 'border-box', padding: short ? '0 6px' : '3px 6px', borderRadius: 9,
        border: `1px solid ${COL.focus}`, background: `linear-gradient(180deg, ${COL.focus}, ${COL.accent})`, color: COL.onAccent,
        fontFamily: 'inherit', fontSize: short ? 12 : 13.5, fontWeight: 900, letterSpacing: '.02em', cursor: 'pointer',
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', boxShadow: '0 2px 6px rgba(0,0,0,.25)',
      }}>{label}</button>
  );

  let footer = null;
  let body;
  let moreList = [];
  let morePress = null;
  if (selCell) {
    const c = gearCell(selCell);
    const ct = cellContent(R, selCell, slots);
    if (ct.item && ct.unequip) footer = goldBtn('unequip', 'Unequip', () => { ct.unequip(); gearTabBus.afterChange(); });
    const word = c.label.toLowerCase();
    const cellPic = selCell === 'gem'
      ? art(ct.els && ct.els.length ? gemIcon(gemCutKey(ct.els[0])) : null, ct.els && ct.els.length ? null : '💎', false)
      : art(ct.item ? ct.icon : null, null, false);
    body = (
      <div data-gear-stats="cell" data-gear-stats-for={selCell} style={{ display: 'flex', flexDirection: 'column', gap: short ? 2 : 3 }}>
        {selCell === 'gem' ? (
          <>
            {head(cellPic, ct.els && ct.els.length ? ct.name : 'No gem yet', null, { noStars: true })}
            {sentence(ct.hand
              ? (ct.els && ct.els.length ? 'Set in your ' + weaponDisplayName(ct.hand) + '. Gems are set at the Gem Works.' : 'Your ' + weaponDisplayName(ct.hand) + ' has no gem in it. Gems are set at the Gem Works.')
              : 'Nothing in your hand.', null, short ? 1 : 2)}
          </>
        ) : ct.item ? (
          <>
            {head(cellPic, ct.name, ct.quality)}
            {!short && hardLine(c.field ? hardOf(ct.item) : null)}
            {ct.rows.length > 0 ? <StatPills rows={ct.rows} w={iw} line={short} /> : sentence(SLOT_SENTENCE[selCell], null, short ? 1 : 2)}
          </>
        ) : (
          <>
            {head(art(null, null, false), c.label, null, { noStars: true, extra: 'Empty' })}
            {sentence(`No ${word} yet. Pick one from your bag.`, null, short ? 1 : 2)}
          </>
        )}
      </div>
    );
  } else if (selEntry) {
    const target = entryTarget(selEntry);
    const card = (() => { try { return resolveItemCard(target); } catch (e) { return null; } })() || {};
    const o = selEntry.obj || null;
    /* v2.3.4191: the change is always shown, against what you wear; a stat
       the worn piece lacks, or an empty slot, reads as 0 -- a real gain, the
       green "▲ +N" (gearStats gainRows); the same number stays "--" */
    let rows = null;
    if (selEntry.kind === 'stashWeapon' && o) {
      const cur = R[weaponSlotFor(o.type)] || null;
      rows = gainRows(cur ? weaponRows(R, cur) : [], weaponRows(R, o));
    } else if (selEntry.kind === 'stashShield' && o) {
      rows = gainRows(shieldRows(R.shield), shieldRows(o));
    } else if ((selEntry.kind === 'stashArmor' || selEntry.kind === 'stashLegs') && o) {
      const slot = selEntry.kind === 'stashArmor' ? 'chest' : 'legs';
      const cur = slot === 'chest' ? R.armor : R.legsArmor;
      rows = gainRows(armourRows(cur, slot), armourRows(o, slot));
    }
    /* a "?" piece (v2.3.4012's mystery reveal) shows its card's name, "Rare
       or better" and no numbers -- they would give its grade away */
    const hidden = !!card.unrevealed;
    if (hidden) rows = null;
    if (rows) rows = rows.filter((r) => r.now !== '—');   /* a stat the new piece lacks is not its pill */
    const name = !hidden && selEntry.kind === 'stashWeapon' && o ? weaponDisplayName(o) : (card.name || '');
    /* the one action list (itemActions.js), Sell left out here */
    const list = itemActionList(target, card).filter((x) => x.id !== 'sell');
    const anchorOf = () => {
      try { const r = bro.current.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; } catch (e) { return null; }
    };
    const ui = {
      close: () => gearTabBus.deselect(),
      sell: () => {},
      drop: () => { gearTabBus.setMore(false); itemDetailBus.open({ ...target, anchor: anchorOf(), flow: 'drop' }); },
    };
    const press = (x) => {
      if (x.off) return;
      const changes = x.id === 'equip' || x.id === 'unequip' || x.id === 'capeOn' || x.id === 'capeOff';
      runItemAction(x.id, target, card, changes ? { ...ui, close: () => gearTabBus.afterChange() } : ui, { equip: { activate: false } });
    };
    /* the gold one: the list's own primary (Equip, Reveal, Drink, Eat,
       Light fire...), else the first that is not Drop, Pin or Inspect -- those
       three are the "⋯"'s (the owner's brief); a stack with nothing to do
       (an ore) has no gold button, only its "⋯" */
    const lead = list.find((x) => !x.off && x.tone === 'primary')
      || list.find((x) => !x.off && !GEAR_MORE_ONLY[x.id]) || null;
    moreList = list.filter((x) => x !== lead);
    morePress = press;
    /* the foot: the gold button and, beside it, "⋯" (alone when there is no
       main action) */
    /* v2.3.4191, the owner: a piece you can wear (a weapon, a shield, armour)
       has NO "⋯" -- its gold Equip alone, the full width; "⋯" stays on what
       has more to do (materials, potions...) and on a "?" piece, whose Equip
       sits behind it beside the gold Reveal */
    const wearable = /^stash(Weapon|Shield|Armor|Legs|Gear)$/.test(selEntry.kind) && !hidden;
    if (wearable) moreList = [];
    if (lead || moreList.length) footer = (<>{lead ? goldBtn(lead.id, lead.label, () => press(lead), lead.attrs) : <span style={{ flex: 1 }} />}{moreBtn(moreList.length > 0)}</>);
    const q = !hidden && o ? o.quality : null;
    body = (
      <div data-gear-stats="bag" data-gear-stats-for={selEntry.kind === 'item' ? 'i-' + selEntry.key : selEntry.kind} style={{ display: 'flex', flexDirection: 'column', gap: short ? 2 : 3 }}>
        {head(art(card.thumb, card.glyph, hidden), name, q, {
          hidden, info: card.info, infoColor: card.infoColor,
          qty: selEntry.kind === 'item' ? (selEntry.count || 0) : 0,
        })}
        {!short && hardLine(!hidden && selEntry.kind === 'stashWeapon' ? hardOf(o) : null)}
        {rows && rows.length > 0
          ? <StatPills rows={rows} cmp w={iw} line={short} />
          : hidden ? null : sentence(/^Quantity:/.test(card.info || '') ? null : card.info, card.infoColor, short ? 1 : 2)}
      </div>
    );
  } else {
    /* v2.3.4191: THE OVERVIEW IS YOUR BRO.  The owner (2026-11-03): "Move
       the 3 primary combat skills out of the gear menu and put them into the
       bro menu", then "I want the character preview in the middle panel by
       default (actually showing what he's equipped) like how I had it in the
       previous character layout ... Keep the profile picture in the bro tab.
       This one just put the character preview in middle".  So the card at
       rest is the full-body bro (CharacterView: the Character page's own
       compositor, wearing exactly what is equipped, facing southwest as the
       owner chose), his name and "Lv N", and the HP, MP and EN bars -- no
       headshot.  Of three arrangements the owner picked the first: the name
       and Lv above, the figure centred and as large as fits, the bars below.
       The short band (the sideways one band, ~66 px) lays it sideways: the
       figure at the left, the name and bars beside it.  HP on the
       display scale (toDisplayHp); EN and MP as they are -- stamina IS the
       game's energy (VitalBar's "EN"), one resource, one bar.  The skills'
       tiles and their XP bars leave for the Bro page (Lane B, PR #1386); the
       XP that flies in after a kill floats and fades while no card is on
       screen (xpLanding xpCardPoint). */
    const S = getState();
    const who = (S && S.myName) || 'You';
    const lvl = charLevel(R);
    const handWpn = R[HAND_FIELD[R.activeSlot || 'melee']] || null;
    /* the card's inner box, the figure's room is measured from */
    const cardPad = short ? 2 : PAD;
    const cw = Math.max(40, broW - 2 * cardPad - 2 - (short ? 2 : 4));
    const ch = Math.max(30, broH - 2 * cardPad - 2 - (short ? 0 : 5));
    /* a bar: its picture and word where there is room, the numbers always */
    const bar = (kind, cur, max, thick, w) => {
      const roomy = w == null || w >= 96, wordy = w == null || w >= 74;
      return (
        <div key={kind} data-vital={kind} title={VITAL_LABEL[kind]} style={{ display: 'flex' }}>
          <VitalBar kind={kind} cur={cur} max={max} thick={thick}
            inset={(
              <div style={{
                width: '100%', minWidth: 0, display: 'flex', alignItems: 'center', gap: 3, padding: '0 5px 0 3px', boxSizing: 'border-box',
                color: '#FFFFFF', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.7)',
              }}>
                {roomy && <img src={VITAL_ICONS[kind]} alt="" draggable={false} style={{ width: 12, height: 12, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />}
                {wordy && <span style={{ fontSize: FONT_MIN, fontWeight: 800, letterSpacing: '.02em' }}>{VITAL_LABEL[kind]}</span>}
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: FONT_MIN, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{Math.ceil(cur)}/{Math.ceil(max)}</span>
              </div>
            )} />
        </div>
      );
    };
    const vitals = [
      ['hp', toDisplayHp(R.hp || 0), toDisplayHp(R.maxHp || 100)],
      ['mana', R.mana || 0, R.maxMana || 100],
      ['stamina', R.stamina || 0, R.maxStamina || 100],
    ];
    const bars = (thick, w, gap) => (
      <div data-gear-bars="" style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap }}>
        {vitals.map(([k, c, m]) => bar(k, c, m, thick, w))}
      </div>
    );
    const nameLine = (center) => (
      <div data-gear-level={lvl} style={{ flex: 'none', display: 'flex', alignItems: 'baseline', justifyContent: center ? 'center' : 'flex-start', gap: 5, minWidth: 0 }}>
        <span data-gear-who="" style={{ minWidth: 0, fontSize: 13, fontWeight: 800, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{who}</span>
        <span style={{ flex: 'none', fontSize: 12, fontWeight: 800, color: COL.accent, fontVariantNumeric: 'tabular-nums' }}>Lv {lvl}</span>
      </div>
    );
    /* the figure: CharacterView's compact crop (its window 52% of the size),
       as large as `bw` x `bh` allows */
    const figure = (bw, bh) => {
      const size = Math.max(24, Math.floor(Math.min(bh, bw / 0.52)));
      return (
        <div data-gear-figure="" data-size={size} style={{ flex: 'none', width: bw, height: bh, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
          <CharacterView size={size} weapon={handWpn} shield={R.shield} dir="southwest" crop />
        </div>
      );
    };
    let inner;
    if (short) {
      const fw = Math.max(28, Math.round(ch * 0.52) + 4);
      inner = (
        <div style={{ display: 'flex', gap: 6, height: '100%', alignItems: 'stretch' }}>
          {figure(fw, ch)}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
            {nameLine(false)}
            {bars(13, cw - fw - 6, 2)}
          </div>
        </div>
      );
    } else {
      const nh = 16, bh = 3 * 16 + 2 * 3;
      inner = (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {nameLine(true)}
          {figure(cw, ch - nh - bh - 6)}
          {bars(16, cw, 3)}
        </div>
      );
    }
    body = (
      <div data-gear-stats="mine" data-gear-arrangement={short ? 'short' : 'centred'} style={{ height: '100%', boxSizing: 'border-box' }}>
        {inner}
      </div>
    );
  }

  /* the card: data-gear-pane="bro" since v2.3.4151's first layout (mp-revealbag
     reads a "?" piece's Reveal in it).  While something is picked it wears
     the pick's own blue (GEAR_SEL_BLUE, the ring's colour) and a faint blue
     wash -- the owner's link between the blue outline and the card. */
  const linked = view === 'item';
  const broPane = (
    <div ref={bro} data-gear-pane="bro" data-gear-view={view} data-gear-linked={linked ? '1' : undefined}
      style={panel({
        width: broW, height: broH, flex: 'none', padding: short ? 2 : PAD,
        border: `1px solid ${linked ? GEAR_SEL_BLUE : COL.edgeWarm}`,
        background: COL.wellDeep,
        ...(linked ? { backgroundImage: `linear-gradient(${GEAR_SEL_TINT}, ${GEAR_SEL_TINT})`, boxShadow: `inset 0 0 0 1px ${GEAR_SEL_BLUE}, 0 0 12px 1px rgba(140, 196, 255, 0.45)` } : null),
      })}>
      {/* never scrolls: every state is laid out to fit (mp-geartab measures
          scrollHeight against clientHeight at 390 and 360 px) */}
      <div data-gear-scroll="" style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: short ? '0 1px' : '1px 2px 0' }}>
        {body}
      </div>
      {footer && <div data-gear-foot="" style={{ flex: 'none', paddingTop: short ? 1 : 2, display: 'flex', gap: 4, alignItems: 'stretch' }}>{footer}</div>}
      {/* v2.3.4191: the "⋯" list -- over the card, never beside it (the card
          never scrolls and keeps its size); its ✕ is the window's (data-esc) */}
      {st.more && moreList.length > 0 && morePress && (
        <div data-gear-more-menu="" role="menu"
          onPointerUp={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', inset: 0, zIndex: 3, boxSizing: 'border-box', padding: short ? 3 : 6,
            background: COL.wellDeep, borderRadius: 10, border: `1px solid ${GEAR_SEL_BLUE}`,
            display: 'flex', flexDirection: short ? 'row' : 'column', alignItems: short ? 'center' : 'stretch', gap: short ? 4 : 5,
          }}>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, ...(short ? { order: 9 } : null) }}>
            {!short && <span style={{ fontSize: FONT_MIN, fontWeight: 800, color: COL.muted, letterSpacing: '.04em' }}>MORE</span>}
            <button type="button" data-esc="" data-gear-act="more-close" aria-label="Close"
              onClick={(e) => { e.stopPropagation(); gearTabBus.setMore(false); }}
              style={{
                flex: 'none', width: short ? 24 : 28, height: short ? 22 : 26, padding: 0, borderRadius: 7,
                border: `1px solid ${COL.borderStrong}`, background: COL.wellSoft, color: COL.text,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 900, lineHeight: 1, cursor: 'pointer', touchAction: 'manipulation',
              }}>{'✕'}</button>
          </div>
          {moreList.map((a) => (
            <button key={a.id} type="button" role="menuitem" data-gear-act={a.id} disabled={!!a.off} {...(a.attrs || {})}
              title={a.off && a.why ? a.why : undefined}
              onClick={(e) => { e.stopPropagation(); if (a.off) return; gearTabBus.setMore(false); morePress(a); }}
              style={{
                flex: short ? 1 : 'none', minWidth: 0, minHeight: short ? 22 : 30, boxSizing: 'border-box', padding: '0 8px', borderRadius: 8,
                border: `1px solid ${a.tone === 'danger' ? COL.danger : COL.borderStrong}`, background: COL.wellSoft,
                color: a.off ? COL.muted : a.tone === 'danger' ? COL.danger : COL.text, opacity: a.off ? 0.6 : 1,
                fontFamily: 'inherit', fontSize: short ? 12 : 13, fontWeight: 800, textAlign: short ? 'center' : 'left',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                cursor: a.off ? 'default' : 'pointer', touchAction: 'manipulation',
              }}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="bt-dashcols" data-gear-tab="" data-gear-layout={wide ? 'wide' : 'stack'}
      {...(desk ? { 'data-dash-desk': '' } : null)}
      style={{
        height: '100%', minHeight: 0, width: '100%', boxSizing: 'border-box', padding: rp,
        display: 'flex', flexDirection: 'column', gap: rg,
      }}>
      {box.w === 0 ? null : (
        <>
          {wide ? (
            <div style={{ flex: 'none', display: 'flex', gap: GAP, justifyContent: 'center', alignItems: 'flex-start' }}>
              {inventory}{broPane}{equipment}
            </div>
          ) : (
            <>
              <div style={{ flex: 'none', display: 'flex', gap: rg, justifyContent: 'center' }}>{inventory}{equipment}</div>
              {broPane}
            </>
          )}
        </>
      )}
    </div>
  );
};
