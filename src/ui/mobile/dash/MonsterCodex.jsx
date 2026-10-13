import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { COL, getState, QUALITY_COLOR, QUALITY_LABEL, QUALITY_PRISM, qualityInk } from './common.js';
import { PetPortrait } from '@/ui/petPortrait.jsx';
import { CODEX_KINDS, CODEX_ENTRIES, CODEX_ELEMENTS, CODEX_OPEN_AT, CODEX_ROADS, codexFactsAt } from '@/data/monsterCodex.js';
import { codexCounts, codexFresh, codexSeen, codexLive } from '@/game/monsterCodex.js';
import { landLook } from '@/data/wheelLands.js';
import { ZONES } from '@/data/zones.js';
import { landLevelsText, WHEEL_LAND_LEVELS, WHEEL_GATE_ROADS } from '@/data/wheelSignposts.js';
import { RARITY_TIERS } from '@/data/gameSystems.js';
import { CodexStage } from './CodexStage.jsx';
import { codexDropsFor, codexGrades, codexGradePercent, codexRollText, codexRollFreeFrom, CODEX_ROLL_SIDES } from '@/data/codexDrops.js';
import { killRollLive } from '@/game/killRoll.js';   /* v2.3.3207: does the worker roll once a kill (caps.killroll) */

/* ═══ v2.3.3207: THE CODEX'S MONSTERS ═══
 *
 * Owner, 2026-10-12: "Begin working on the monster section of the codex.
 * After you kill a monster you learn more about it, what it does, where it's
 * from, elemental type, special attack, (make up a backstory) etc. it'll be
 * another dashboard section that just displays information."  Then, with a
 * mockup: "I want all the facts revealed after just 1 kill.  I also want to
 * change the structure of each monster entry to look like this."
 *
 * More -> Codex -> Monsters (the tab that was "Bestiary", which read a list
 * nothing wrote).  A card for each of the Wheel's nine kinds, its shape alone
 * until you have killed one; a tap opens its page, all of it open from the
 * first kill the worker counted (server/src/codex.js, game/monsterCodex.js),
 * laid out as the owner's mockup:
 *
 *   the header   its portrait, its name, and three badges: its levels, its
 *                element, its kind of creature;
 *   Drops        ITEM / TYPE / CHANCE, every item a kill can drop, most often
 *                first, a bar for each chance out of 100% and its dice
 *                (data/codexDrops.js, the worker's own rolls); a tap on a
 *                row opens its CARD -- the
 *                item, what it is, FOUND FROM, BASE DROP CHANCE, and for a
 *                weapon or armour piece the POSSIBLE RARITY it rolls after it
 *                drops -- whose X comes back to the list, that row marked;
 *   Info         its stage (CodexStage.jsx: it plays its attack, its
 *                element and its special beside your own character) and what
 *                it does, its element, its special attack, its story and its
 *                elder form;
 *   Locations    its land and levels, its elder form's stretch, the road from
 *                BroTown, and its dungeon.
 *
 * It only displays: nothing here sends anything.  Its pictures are the
 * bag's and the world's own (the stage's load only while the Info tab is
 * open).
 *
 * It lives on the dashboard's own sheet, at the height every other page has,
 * and scrolls in it -- asked whether it should grow tall as the mockup draws
 * it, the owner: "Stay short and scroll".  So what a tap brings up is put
 * where it can be seen (`reveal`): a page and an item's card from their top,
 * a tab's content at the top of the sheet (Info's stage first: it is 150 of
 * the ~167 px a phone's sheet shows), the list again at the row, and the
 * monsters at the card, you came from. */

function landName(home) {
  return (ZONES[home] && ZONES[home].name) || home;
}
function oneLevels(levels) {
  return levels[0] === levels[1] ? 'Lv ' + levels[0] : 'Lv ' + levels[0] + '–' + levels[1];
}
/* the first stage's levels and the elder form's, from the Wheel's own range
   (petStageOf: 20 levels a stage) */
function stageBands() {
  const [lo, hi] = WHEEL_LAND_LEVELS;
  const cut = Math.min(hi, 20);
  return { first: [lo, cut], elder: hi > cut ? [cut + 1, hi] : null };
}
/* how to get there from BroTown, by the signposts' own table */
function wayThere(home) {
  for (const gate of Object.keys(WHEEL_GATE_ROADS)) {
    const [straight, fork] = WHEEL_GATE_ROADS[gate];
    if (home === straight) return 'Leave BroTown by its ' + gate + ' gate and follow ' + CODEX_ROADS[home] + ' straight on.';
    if (home === fork) return 'Leave BroTown by its ' + gate + ' gate on ' + CODEX_ROADS[straight] + ', then take ' + CODEX_ROADS[home] + ' where it forks off.';
  }
  return null;
}

/* the scrolling box a page sits in (EncyclopediaPanel's, common.js
   panelStyle), and putting something in its view: its top at the box's top
   ('top'), or as little scrolling as shows all of it ('near') -- clear of the
   box's bottom fade (panelStyle's 18 px mask) */
const FADE = 18;
function scrollBox(el) {
  for (let p = el ? el.parentElement : null; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === 'auto' || oy === 'scroll') return p;
  }
  return null;
}
function reveal(el, how) {
  const box = scrollBox(el);
  if (!box) return;
  const br = box.getBoundingClientRect(), er = el.getBoundingClientRect();
  const at = er.top - br.top + box.scrollTop;
  if (how === 'top' || er.top < br.top) box.scrollTop = Math.max(0, at - 4);
  else if (er.bottom > br.bottom - FADE) box.scrollTop = Math.max(0, Math.min(at - 4, at + er.height + FADE - box.clientHeight));
}

/* ── small drawn glyphs: the TYPE line's, and the card's info mark ── */
const GLYPH = {
  Weapon: 'M3 3l10 10M13 3L3 13M2.5 10.5l3 3M10.5 13.5l3-3',
  Armor: 'M8 1.8l5.2 2.1v4c0 3.2-2.2 5.3-5.2 6.3-3-1-5.2-3.1-5.2-6.3v-4z',
  Currency: 'M8 2.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11zM8 5.2a2.8 2.8 0 1 0 0 5.6a2.8 2.8 0 1 0 0-5.6z',
  Gem: 'M4.2 3h7.6l2.7 3.4L8 14 1.5 6.4zM1.5 6.4h13M6.3 3L5 6.4 8 14l3-7.6L9.7 3',
  Material: 'M2.5 5L8 2l5.5 3v6L8 14l-5.5-3zM2.5 5L8 8l5.5-3M8 8v6',
  Craft: 'M9.2 1.8l5 5-2.1 2.1-5-5zM7.6 5.4L2 13.6',
  Road: 'M8 1.5v13M8 3h4.6l1.6 1.6-1.6 1.6H8M8 8.2H3.4L1.8 9.8l1.6 1.6H8',
};
function Glyph({ type, size = 16, color }) {
  const d = GLYPH[type];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ flex: 'none', display: 'block' }}>
      <path d={d} fill="none" stroke={color || 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function InfoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" style={{ flex: 'none', display: 'block' }}>
      <circle cx="11" cy="11" r="9.2" fill="none" stroke={COL.text2} strokeWidth="1.6" />
      <circle cx="11" cy="6.6" r="1.25" fill={COL.text2} />
      <path d="M11 9.6v6.2" stroke={COL.text2} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const GOLD_EDGE = 'rgba(216, 170, 88, 0.55)';
const BAR = '#4FA3E8';
const SECTION = { fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color: COL.text2 };

/* a framed square, the mockup's portrait and item boxes */
function Frame({ size, children, edge }) {
  return (
    <div style={{ width: size, height: size, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 9,
      background: 'linear-gradient(#1B2C32, #0F1C21)', border: '1px solid ' + (edge || 'rgba(229,237,233,.22)'),
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)', overflow: 'hidden' }}>{children}</div>
  );
}
function Pill({ children, attr }) {
  return (
    <span data-cx-pill={attr} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 24, padding: '0 9px', borderRadius: 7,
      border: '1px solid rgba(229,237,233,.28)', background: 'rgba(11,22,27,.55)', color: COL.text, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>
  );
}

function Card({ kind, n, fresh, onOpen }) {
  const e = CODEX_ENTRIES[kind];
  const known = n >= CODEX_OPEN_AT;
  const look = landLook(e.home);
  return (
    <button onClick={() => onOpen(kind)} data-cx-card={kind} data-cx-known={known ? 1 : 0} data-cx-fresh={fresh ? 1 : 0}
      style={{ position: 'relative', background: known ? COL.slot : COL.well, border: '1px solid ' + COL.border,
        borderTop: '3px solid ' + ((look && look.color) || COL.border), borderRadius: 10, padding: '6px 5px 7px',
        textAlign: 'center', minWidth: 0, minHeight: 44, fontFamily: 'inherit', color: COL.text, cursor: 'pointer', touchAction: 'manipulation' }}>
      {fresh ? <span style={{ position: 'absolute', top: 4, right: 4, padding: '0 5px', borderRadius: 999, background: '#2E7D6F', color: '#E9FFF8', fontSize: 9, fontWeight: 900, letterSpacing: '.06em' }}>NEW</span> : null}
      <div style={{ display: 'grid', placeItems: 'center', height: 44 }}>
        <PetPortrait pet={{ kind, stage: 1 }} size={44} shadow={!known} />
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.15, marginTop: 2, color: known ? COL.text : COL.text2, minHeight: 27,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{known ? e.name : '???'}</div>
      <div style={{ fontSize: 9.5, color: COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{landName(e.home)}</div>
      <div style={{ fontSize: 10.5, fontWeight: 800, marginTop: 3, color: known ? '#7EE0A8' : COL.muted, fontVariantNumeric: 'tabular-nums' }}>
        {known ? n + ' defeated' : 'Not met yet'}
      </div>
    </button>
  );
}

/* ═══ THE HEADER: portrait, name, and its three badges ═══ */
function Header({ kind, e, n, n2, elder }) {
  const el = CODEX_ELEMENTS[e.element];
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '2px 2px 8px' }}>
      <Frame size={60} edge={GOLD_EDGE}><PetPortrait pet={{ kind, stage: elder ? 2 : 1 }} size={56} /></Frame>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div data-cx-name style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1, color: COL.text }}>{elder && e.elder ? e.elder.name : e.name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
          <Pill attr="level">{landLevelsText()}</Pill>
          {el ? <Pill attr="element">{el.name}<img src={el.icon} alt="" draggable={false} style={{ width: 15, height: 15, objectFit: 'contain' }} /></Pill> : null}
          <Pill attr="type">{e.type}</Pill>
        </div>
        <div style={{ fontSize: 11, color: COL.muted, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
          {n} defeated{n2 ? ' · ' + n2 + ' past Lv 20' : ''}
        </div>
      </div>
    </div>
  );
}

const TABS = [['drops', 'Drops'], ['info', 'Info'], ['locations', 'Locations']];
function Tabs({ tab, setTab }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, margin: '0 0 8px' }}>
      {TABS.map(([id, label]) => {
        const on = tab === id;
        return (
          <button key={id} onClick={() => setTab(id)} data-cx-tab={id} data-cx-on={on ? 1 : 0}
            style={{ minHeight: 40, borderRadius: 9, fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
              border: '1px solid ' + (on ? COL.accent : 'rgba(229,237,233,.18)'), color: on ? COL.focus : COL.text,
              background: on ? 'linear-gradient(rgba(216,170,88,.30), rgba(216,170,88,.12))' : 'rgba(11,22,27,.45)',
              boxShadow: on ? 'inset 0 0 0 1px rgba(234,198,117,.25)' : 'none' }}>{label}</button>
        );
      })}
    </div>
  );
}

/* ═══ DROPS: ITEM / TYPE / CHANCE ═══
   On a near-black panel of its own -- the owner: "The drops table needs a
   different background so the information can stand out more from the
   dashboard background. Maybe black?" -- the stage's own black (game.css
   bt-cx-stage), so the page's two wells match.  Then: "Make the codex section
   that has the table more readable with the background" -- so on that black:
     - every other row a shade lighter, no lines: the eye runs from a name
       across to its chance without slipping a row;
     - the headings on a band of their own, brighter;
     - names a size up and never cut short ("Fire Goblin Remnants" was
       "Fire Goblin Re..."): a long one takes two lines;
     - the type and the chance brighter and a size up;
     - the bar says HOW COMMON over the chance's powers of ten (`barWidth`):
       on a straight scale every drop rarer than the shard was the same
       sliver, so the bars said nothing; the number beside it is exact.
   v2.3.3207: and then: "Wrap text for the item name and increase the usable
   area for the bar size. Looks like the chance column reserves too much
   space" -- the chance column was 76 px for the one long chance, the random
   weapon's "0.05–0.24%", so every other number sat far from its bar.  It was
   one number wide (40 px; the ROLL column below took its place); the type column is its longest word's
   ("Currency"); and the name and the bar share the rest, the bar the bigger
   part (44 -> ~115 px on a 390 px phone), a long name taking two lines.
   And then: "Remove 'a random weapon' drop.  All drop chances should be a
   single value.  Also make the percentage bars out of 100%.  The 10% bar
   almost looks as long as the 100%" -- the random weapon is out of the game
   (data/codexDrops.js), every chance one number, and the bar the chance OUT
   OF 100% (`barWidth`; the powers-of-ten scale drew 10% at 77%), a drop
   rarer than a pixel's worth a 2 px nub so no bar reads "never".  And the
   owner's dice, "a 'roll-based system' where you see dice and number", each
   drop's own roll (their pick): the numbers of a kill's roll of 1 to 10,000
   that drop it (then `r.roll`, the top one), the rarest 1.  Then: "Actually 'roll'
   column with a number range and drop chance percentage in parentheses might
   be better" -- so the chance column is a ROLL column, its range ("1–1,000")
   over its chance in parentheses ("(10%)"), "Always" for an every-kill drop
   (nothing to roll), the dice in its heading; the bar stays the chance out of
   100%, and the range is the widest thing in the column (`ROLL_W`).
   And then: "Shouldn't these numbers not overlap each other? Getting a roll
   of 1 implies you'd get all the loot with 1, but it's really just the gold
   nugget. I think these should be number ranges" -- so the worker rolls ONCE
   a kill and each drop owns its own run of the numbers (server killroll.js,
   data/codexDrops.js `from`-`to`): "612–1,611" down to the nugget's "1", the
   numbers that drop nothing more said under the table.  Against a worker that
   rolls each drop on its own (`shared` false: no caps.killroll) the column
   still says 1 to each drop's own number.  The widest is a shard's
   "612–1,611": 64 px. */
const ROLL_W = 64;
const COLS = `26px minmax(0, 1fr) 52px minmax(0, 1.2fr) ${ROLL_W}px`;
const TABLE_BG = '#05090B';
const STRIPE = 'rgba(229,237,233,.055)';
const HEAD_BG = '#101A1F';
const DICE = '/icons/ui/bldg-gamble.webp';
/* a chance (0..1) as the bar's width: its share of 100%, to 0.01 */
function barWidth(p) {
  const x = Math.max(0, Math.min(1, Number(p) || 0));
  return Math.round(x * 10000) / 100;
}
const n0 = (n) => Number(n).toLocaleString('en-US');
/* the numbers of the roll that drop it: "612–1,611", "1"; null for an
   every-kill drop (v2.3.3207: its own run of them, data/codexDrops.js) */
const rollRange = (r) => (r && r.from ? codexRollText(r.from, r.to) : null);
/* the Gambling Den's two dice (the card's own picture), cut to the dice
   themselves: they stand at 50-206 x 90-216 of its 256 px */
function Dice({ h = 12 }) {
  const k = h / 126;
  return <span aria-hidden="true" style={{ display: 'inline-block', flex: 'none', width: Math.round(156 * k), height: h,
    backgroundImage: `url(${DICE})`, backgroundRepeat: 'no-repeat', backgroundSize: `${256 * k}px ${256 * k}px`,
    backgroundPosition: `${-50 * k}px ${-90 * k}px` }} />;
}
function DropsTab({ rows, sel, onPick, shared }) {
  const free = codexRollFreeFrom(rows, shared);
  return (
    <div data-cx-drops={rows.length}>
      <div data-cx-drops-panel style={{ background: TABLE_BG, border: '1px solid rgba(229,237,233,.18)', borderRadius: 10, overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)' }}>
      <div data-cx-drops-head style={{ display: 'grid', gridTemplateColumns: COLS, gap: 6, alignItems: 'center', padding: '7px 9px 6px', background: HEAD_BG,
        borderBottom: '1px solid rgba(229,237,233,.14)', ...SECTION, fontSize: 11, color: '#CBD5D2' }}>
        <span style={{ gridColumn: '1 / span 2' }}>Item</span>
        <span>Type</span>
        <span data-cx-roll-head style={{ gridColumn: '4 / span 2', justifySelf: 'end', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Dice h={12} />Roll</span>
      </div>
      <div style={{ padding: 3 }}>
        {rows.map((r, i) => {
          const on = sel === r.id;
          const w = barWidth(r.chance);
          return (
            <button key={r.id} onClick={() => onPick(r.id)} data-cx-drop={r.id} data-cx-sel={on ? 1 : 0} data-cx-who={r.who} data-cx-bar={w}
              style={{ display: 'grid', gridTemplateColumns: COLS, gap: 6, alignItems: 'center', width: '100%', minHeight: 42, padding: '4px 6px',
                fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation', color: COL.text, borderRadius: 7,
                background: on ? 'rgba(216,170,88,.16)' : i % 2 ? STRIPE : 'transparent',
                border: '1px solid ' + (on ? COL.accent : 'transparent') }}>
              <img src={r.icon} alt="" draggable={false} style={{ width: 26, height: 26, objectFit: 'contain' }} />
              <span data-cx-name-cell style={{ minWidth: 0, fontSize: 13.5, fontWeight: 700, lineHeight: 1.15, color: r.color || COL.text, overflowWrap: 'anywhere' }}>
                {r.name}{r.amount ? <span style={{ color: '#B3BEBB', fontWeight: 600 }}> {r.amount}</span> : null}
              </span>
              <span data-cx-type style={{ fontSize: 12.5, color: '#CBD3D0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.type}</span>
              <span data-cx-bar-track style={{ height: 8, borderRadius: 4, background: 'rgba(229,237,233,.18)', overflow: 'hidden' }}>
                <span data-cx-bar-fill style={{ display: 'block', width: w + '%', minWidth: w > 0 ? 2 : 0, height: '100%', borderRadius: 4, background: BAR }} />
              </span>
              <span data-cx-roll-cell style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                <span data-cx-roll={r.from ? r.from + '-' + r.to : 'always'} style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.15, color: '#FFFFFF' }}>{rollRange(r) || 'Always'}</span>
                <span data-cx-pct style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.15, color: '#B3BEBB' }}>({r.pct})</span>
              </span>
            </button>
          );
        })}
      </div>
      </div>
      <div style={{ fontSize: 11.5, color: COL.text2, lineHeight: 1.4, margin: '7px 4px 0' }}>
        <div data-cx-dice-key={shared ? 'shared' : 'own'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Dice h={13} />
          {shared
            ? <span>Each kill rolls once, 1–{n0(CODEX_ROLL_SIDES)}. The item whose numbers it lands on drops{free ? <>; <span data-cx-free={free} style={{ whiteSpace: 'nowrap' }}>{n0(free)}–{n0(CODEX_ROLL_SIDES)}</span> drops nothing more</> : null}.</span>
            : <span>Each kill rolls 1–{n0(CODEX_ROLL_SIDES)} for every item. A roll in its range drops it.</span>}
        </div>
        <div style={{ marginTop: 3 }}>Tap an item to see what it is and the grades it can roll.</div>
      </div>
    </div>
  );
}

/* ═══ AN ITEM'S CARD (a tap on a drop) ═══ */
function GradeTile({ q, p, icon }) {
  const edge = q === 'normal' ? 'rgba(229,237,233,.32)' : q === 'godly' ? 'transparent' : QUALITY_COLOR[q];
  return (
    <div data-cx-grade={q} style={{ minWidth: 0, textAlign: 'center' }}>
      <div className={q === 'godly' ? 'ls-slot--godly' : undefined}
        style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 9, border: '2px solid ' + edge, display: 'grid', placeItems: 'center',
          background: q === 'normal' ? 'linear-gradient(#1B2C32, #0F1C21)' : 'radial-gradient(circle at 50% 55%, ' + (q === 'godly' ? 'rgba(199,125,255,.20)' : (QUALITY_COLOR[q] || '#000') + '33') + ', #0F1C21 72%)' }}>
        <img src={icon} alt="" draggable={false} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 900, marginTop: 5, color: COL.text, ...(qualityInk(q) || {}) }}>{QUALITY_LABEL[q]}</div>
      <div data-cx-grade-pct style={{ fontSize: 12, fontWeight: 800, marginTop: 1, fontVariantNumeric: 'tabular-nums', color: QUALITY_COLOR[q] || COL.text,
        ...(q === 'godly' ? { color: 'transparent', backgroundImage: QUALITY_PRISM, WebkitBackgroundClip: 'text', backgroundClip: 'text' } : {}) }}>{codexGradePercent(p)}</div>
    </div>
  );
}

function ItemCard({ kind, e, r, onClose }) {
  const el = CODEX_ELEMENTS[e.element];
  const tier = r.tier && RARITY_TIERS[r.tier];
  return (
    <div data-cx-item={r.id}
      style={{ position: 'relative', border: '1px solid ' + GOLD_EDGE, borderRadius: 12, padding: '10px 10px 10px', background: 'linear-gradient(#1A2B31, #13232A)' }}>
      <button onClick={onClose} data-cx-item-close aria-label="Close"
        style={{ position: 'absolute', top: 6, right: 6, width: 40, height: 40, borderRadius: 9, border: '1px solid rgba(229,237,233,.28)',
          background: 'rgba(11,22,27,.6)', color: COL.text, fontFamily: 'inherit', fontSize: 20, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>✕</button>
      <div style={{ display: 'flex', gap: 11, alignItems: 'center', paddingRight: 44 }}>
        <Frame size={70}><img src={r.icon} alt="" draggable={false} style={{ width: 56, height: 56, objectFit: 'contain' }} /></Frame>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.15, color: r.color || COL.text }}>{r.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, color: COL.text2 }}>
            <Glyph type={r.type} size={17} />
            <span style={{ fontSize: 14, color: COL.text }}>{r.type}</span>
            {tier ? (
              <span data-cx-tier={r.tier} style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 7, border: '1px solid rgba(229,237,233,.32)',
                fontSize: 12.5, fontWeight: 800, color: COL.text, background: 'rgba(11,22,27,.55)' }}>{tier.label}</span>
            ) : null}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.45, color: COL.text, margin: '10px 0 0', paddingBottom: 9, borderBottom: '1px solid ' + COL.divider }}>{r.desc}</div>

      <div data-cx-found style={{ padding: '8px 0 9px', borderBottom: '1px solid ' + COL.divider }}>
        <div style={SECTION}>Found from</div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 6 }}>
          <Frame size={44}><PetPortrait pet={{ kind, stage: 1 }} size={40} /></Frame>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: COL.text }}>{e.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: 12.5, color: COL.text2, marginTop: 2 }}>
              <span>{landLevelsText()}</span><span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>{el ? el.name : ''}{el ? <img src={el.icon} alt="" draggable={false} style={{ width: 14, height: 14, objectFit: 'contain' }} /> : null}</span>
              <span>•</span><span>{e.type}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 0 9px', borderBottom: r.graded ? '1px solid ' + COL.divider : 'none' }}>
        <div style={SECTION}>Base drop chance</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
          <img src="/icons/ui/bldg-gamble.webp" alt="" draggable={false} style={{ width: 40, height: 40, objectFit: 'contain', flex: 'none' }} />
          <div data-cx-base style={{ fontSize: 28, fontWeight: 900, color: COL.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{r.pct}</div>
          <div style={{ fontSize: 12, lineHeight: 1.35, color: COL.text2, minWidth: 0 }}>
            (chance for this item to drop)<br /><span style={{ color: COL.muted }}>{r.chanceNote}</span>
            {/* v2.3.3207: its dice, as the table shows them */}
            {r.from ? <><br /><span data-cx-card-roll={r.from + '-' + r.to} style={{ color: COL.muted }}>
              drops on a roll of {rollRange(r)} out of {n0(CODEX_ROLL_SIDES)}</span></> : null}
          </div>
        </div>
      </div>

      {r.graded ? (
        <div data-cx-rarity style={{ padding: '8px 0 4px' }}>
          <div style={SECTION}>Possible rarity <span style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 600, color: COL.muted }}>(rolls after drop)</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 7, marginTop: 7 }}>
            {codexGrades().map((g) => <GradeTile key={g.q} q={g.q} p={g.p} icon={r.icon} />)}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 9, padding: '8px 9px', borderRadius: 9, border: '1px solid rgba(229,237,233,.14)', background: 'rgba(11,22,27,.4)' }}>
        <InfoMark />
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.45, color: COL.text2 }}>
          {r.info.map((t, i) => <li key={i} style={{ marginTop: i ? 3 : 0 }}>{t}</li>)}
        </ul>
      </div>
    </div>
  );
}

/* ═══ INFO: its stage, and everything it does ═══ */
function Fact({ fact, title, children, gold }) {
  return (
    <div data-cx-fact={fact} data-cx-open={1}
      style={{ background: COL.raised, border: '1px solid ' + (gold ? 'rgba(234,198,117,.35)' : COL.border), borderRadius: 10, padding: '8px 10px', marginTop: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase', color: gold ? '#EAC675' : COL.accent, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}
function InfoTab({ kind, e, S, elder, setElder }) {
  const look = landLook(e.home);
  const el = CODEX_ELEMENTS[e.element];
  return (
    <div data-cx-info={kind}>
      <CodexStage kind={kind} facts={codexFactsAt(CODEX_OPEN_AT)} elder={elder} S={S} />
      {e.elder && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '8px 2px 0' }}>
          {[[false, e.name], [true, e.elder.name]].map(([on, nm]) => (
            <button key={String(on)} onClick={() => setElder(on)} data-cx-elder-toggle={on ? 1 : 0}
              style={{ minHeight: 32, padding: '0 10px', borderRadius: 999, border: '1px solid ' + (elder === on ? COL.accent : COL.border),
                background: elder === on ? COL.accentFill : 'transparent', color: elder === on ? COL.accent : COL.text2,
                fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation' }}>{nm}</button>
          ))}
        </div>
      )}
      <Fact fact="page" title="What it does">
        <div style={{ fontSize: 13, lineHeight: 1.45, color: COL.text }}>{e.what}</div>
      </Fact>
      <Fact fact="element" title={'Element · ' + (el ? el.name : '')}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          {el ? <img src={el.icon} alt="" draggable={false} style={{ width: 30, height: 30, objectFit: 'contain', flex: 'none' }} /> : null}
          <div style={{ fontSize: 13, lineHeight: 1.45, color: COL.text }}>
            <b style={{ color: (look && look.color) || COL.text }}>{el ? el.status : ''}.</b> {el ? el.effect : ''}
            <div style={{ fontSize: 11.5, color: COL.text2, marginTop: 4 }}>A pet from {landName(e.home)}, out with you, softens it.</div>
          </div>
        </div>
      </Fact>
      <Fact fact="special" title={'Special attack · ' + e.special.name}>
        <div style={{ fontSize: 13, lineHeight: 1.45, color: COL.text }}>{e.special.text}</div>
        <div style={{ fontSize: 12, lineHeight: 1.4, color: '#B9E4C9', marginTop: 5 }}><b>Tip:</b> {e.special.tip}</div>
      </Fact>
      <Fact fact="story" title="Its story">
        {e.story.map((para, i) => <p key={i} style={{ fontSize: 13, lineHeight: 1.5, color: COL.text, margin: i ? '6px 0 0' : 0 }}>{para}</p>)}
      </Fact>
      {e.elder && (
        <Fact fact="elder" title={'Elder form · ' + e.elder.name} gold>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: COL.text }}>{e.elder.text}</div>
        </Fact>
      )}
    </div>
  );
}

/* ═══ LOCATIONS: where it lives, and the way there ═══ */
function LocRow({ attr, icon, title, children }) {
  return (
    <div data-cx-loc={attr} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 4px', borderBottom: '1px solid ' + COL.divider }}>
      <div style={{ width: 30, flex: 'none', display: 'grid', placeItems: 'center' }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...SECTION, fontSize: 10.5 }}>{title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.45, color: COL.text, marginTop: 2 }}>{children}</div>
      </div>
    </div>
  );
}
function LocationsTab({ kind, e }) {
  const look = landLook(e.home);
  const bands = stageBands();
  const road = wayThere(e.home);
  return (
    <div data-cx-locations={kind}>
      <LocRow attr="land" title="Its land"
        icon={look && look.icon ? <img src={look.icon} alt="" draggable={false} style={{ width: 28, height: 28, objectFit: 'contain' }} /> : null}>
        <b style={{ color: (look && look.color) || COL.text }}>{landName(e.home)}</b>, {landLevelsText()}: the weakest at the land's near end by BroTown, stronger the further out you go.
      </LocRow>
      <LocRow attr="levels" title="Before the first pass" icon={<Frame size={30}><PetPortrait pet={{ kind, stage: 1 }} size={28} /></Frame>}>
        {e.name}, {oneLevels(bands.first)}.
      </LocRow>
      {bands.elder && e.elder ? (
        <LocRow attr="elder" title="Past the first pass" icon={<Frame size={30} edge="rgba(234,198,117,.5)"><PetPortrait pet={{ kind, stage: 2 }} size={28} /></Frame>}>
          {e.elder.name}, its elder form, {oneLevels(bands.elder)}.
        </LocRow>
      ) : null}
      {road ? (
        <LocRow attr="road" title="The way there" icon={<span style={{ color: COL.accent }}><Glyph type="Road" size={24} /></span>}>
          {road}
        </LocRow>
      ) : null}
      {e.dungeon ? (
        <LocRow attr="dungeon" title="Dungeon" icon={<span style={{ color: COL.accent }}><Glyph type="Weapon" size={24} /></span>}>
          {e.dungeon.charAt(0).toUpperCase() + e.dungeon.slice(1)}, in {landName(e.home)}: {oneLevels(e.dungeonLevels)}, in waves, its land's monsters with a boss at the end.
        </LocRow>
      ) : null}
    </div>
  );
}

function Page({ kind, S, onBack }) {
  const e = CODEX_ENTRIES[kind];
  const [n, n2] = codexCounts(S, kind);
  const [elder, setElder] = useState(false);
  const [tab, setTab] = useState('drops');
  const [tabTap, setTabTap] = useState(0);    /* every tap on a tab, the open one's too */
  const [sel, setSel] = useState(null);       /* the drop row last tapped */
  const [card, setCard] = useState(null);     /* ...whose card is open */
  const root = useRef(null);
  const body = useRef(null);
  useEffect(() => { codexSeen(S, kind); }, [kind]);
  /* the page opens at its top, a card too (it takes the list's place); its
     X brings the list back with the row it came from in view */
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const row = !card && sel ? el.querySelector(`[data-cx-drop="${sel}"]`) : null;
    if (row) reveal(row, 'near');
    else reveal(el, 'top');
  }, [card]);
  /* a tap on a tab shows what it opened, at the top of the sheet */
  useLayoutEffect(() => { if (tabTap && body.current) reveal(body.current, 'top'); }, [tabTap]);
  const known = n >= CODEX_OPEN_AT;
  const shared = killRollLive(S);   /* v2.3.3207: one roll a kill, each drop its own numbers */
  const rows = known ? (codexDropsFor(kind, { shared }) || []) : [];
  const open = card ? rows.find((r) => r.id === card) : null;
  return (
    <div ref={root} data-cx-page={kind} data-cx-kills={n} data-cx-tabbed={known ? tab : ''}>
      <button onClick={onBack} style={{ minHeight: 40, padding: '0 10px 0 4px', background: 'transparent', border: 'none', color: COL.accent,
        fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation' }}>‹ All monsters</button>
      {!known ? (
        <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
          <div style={{ display: 'grid', placeItems: 'center' }}><PetPortrait pet={{ kind, stage: 1 }} size={96} shadow /></div>
          <div data-cx-name style={{ fontSize: 18, fontWeight: 900, color: COL.text2, marginTop: 6 }}>???</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2, marginTop: 6 }}>Defeat one to open its page.</div>
          <div style={{ fontSize: 12, color: COL.muted, marginTop: 3 }}>It lives in {landName(e.home)}.</div>
        </div>
      ) : open ? (
        <ItemCard kind={kind} e={e} r={open} onClose={() => setCard(null)} />
      ) : (
        <>
          <Header kind={kind} e={e} n={n} n2={n2} elder={elder} />
          <Tabs tab={tab} setTab={(id) => { setTab(id); setTabTap((v) => v + 1); }} />
          <div ref={body}>
            {tab === 'drops' ? <DropsTab rows={rows} sel={sel} shared={shared} onPick={(id) => { setSel(id); setCard(id); }} />
              : tab === 'info' ? <InfoTab kind={kind} e={e} S={S} elder={elder} setElder={setElder} />
                : <LocationsTab kind={kind} e={e} />}
          </div>
        </>
      )}
    </div>
  );
}

/* `open` / `setOpen`: the page open, held by EncyclopediaPanel, which puts
   the Codex's own tabs away in the same render while one is */
export function MonsterCodex({ open = null, setOpen = () => {} } = {}) {
  const [, force] = useState(0);
  const grid = useRef(null);
  const from = useRef(null);
  /* back on the monsters, the card you came from is in view */
  useLayoutEffect(() => {
    if (open) { from.current = open; return; }
    const c = from.current && grid.current ? grid.current.querySelector(`[data-cx-card="${from.current}"]`) : null;
    if (c) reveal(c, 'near');
  }, [open]);
  useEffect(() => {
    let rev = -1;
    const id = setInterval(() => {
      const c = getState()._codex;
      const r = c ? c.rev : -1;
      if (r !== rev) { rev = r; force((v) => v + 1); }
    }, 500);
    return () => clearInterval(id);
  }, []);
  const S = getState();
  const c = S._codex;
  if (open) return <Page kind={open} S={S} onBack={() => setOpen(null)} />;
  const rows = CODEX_KINDS.map((k) => ({ k, counts: codexCounts(S, k), fresh: codexFresh(S, k).length > 0 }));
  const met = rows.filter((r) => r.counts[0] >= CODEX_OPEN_AT).length;
  return (
    <div ref={grid} data-cx-grid={met}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2px 2px 6px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase', color: COL.muted }}>Monsters of the Wheel</div>
        <div style={{ fontSize: 11, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>{met} of {CODEX_KINDS.length} met</div>
      </div>
      {!(c && c.known) && !codexLive(S) ? (
        <div data-cx-note="old" style={{ fontSize: 12, color: COL.muted, margin: '0 2px 8px' }}>The codex starts counting your kills after the next game update.</div>
      ) : null}
      {c && c.unavailable ? (
        <div data-cx-note="unavailable" style={{ fontSize: 12, color: COL.muted, margin: '0 2px 8px' }}>Your codex can't be read right now. It will be back.</div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 5 }}>
        {rows.map((r) => <Card key={r.k} kind={r.k} n={r.counts[0]} fresh={r.fresh} onOpen={setOpen} />)}
      </div>
      <div style={{ fontSize: 11, color: COL.muted, lineHeight: 1.4, marginTop: 8 }}>
        Defeat one of a kind to open its whole page: everything it drops, what it does, its story and where it lives. Kills in a party count for everyone in it.
      </div>
    </div>
  );
}

export default MonsterCodex;
