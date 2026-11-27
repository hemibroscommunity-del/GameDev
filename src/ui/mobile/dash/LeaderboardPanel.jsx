import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { FishBoard } from './FishBoard.jsx';   /* v2.3.4036: the Biggest fish board (server fishlog.js) */
import { takeFishBoardWant, subscribeFishWeigh, fishWeighLive } from '@/game/fishWeigh.js';
import { BoardRow, BoardEmpty, useBoardFaces, TableRow, BarBack, LB_ART, LB_PIECES, BoardFace, LvPill } from './BoardRow.jsx';   /* v2.3.4393: the face, the level, the record; v2.3.5501: the table, the bars, the pieces */
import { askSpinBoard, subscribeSpinBoard, spinBoardLive, spinRowLine } from '@/game/spinBoard.js';
import { aceFlipBus } from '../aceFlipBus.js';
import { PROG3_BODY_META, PROG3_ATK_META } from '@/data/prog3.js';   /* v2.3.5502: the stat boards' labels and icons, the Bro tab's */
import { useBoxSize, railHeading, FOOT_FADE } from './railKit.js';   /* v2.3.4394: the measuring and the headings this page and the Quests page share */
import { act } from '@/game/actions.js';   /* v2.3.5191: the page's requests leave through the action door (card K PR 7) */
import { SAY } from '@/data/say/leaderboard.js';   /* v2.3.6327: its words, in the one table (docs/specs/player-words.md, W1) */
import { say } from '@/game/say.js';
import { sw } from '@/game/switches.js';   /* v2.3.5503: `?rankstyle=0`, the page before the Ranks page */
import { RanksPage } from './RanksPage.jsx';   /* v2.3.5503: the Ranks page in the owner's new style (card LB, part 2) */

/* v2.3.1671: a TRADITIONAL HISCORES BOARD — one ranking per skill.
   Owner: "a traditional high scores system that ranks each skill... I want
   all of the lifeskills to be added on the high scores too."

   Two things were wrong before this.

   1. THIS PANEL NEVER FETCHED ANYTHING.  It read `S._leaderboard[cat]`, and
      nothing in the entire client ever wrote `S._leaderboard`.  So the panel
      the player actually sees (BottomDashboard mounts THIS one; the desktop
      panel in ui/panels is behind the legacy menu) has been rendering its
      "No leaderboard data yet." empty state permanently.  It now fetches
      /api/leaderboard/top itself, per category, like the old panel did.
   2. THE COLUMNS WERE CLIENT-REPORTED.  Kills, Skills and Gold came out of
      the rpgData blob the client sends, so they were claims, not facts.  The
      categories below read the server's `series` — combat levels from prog3,
      life-skill levels from ps.lifeSkills, kills from svKills — which is the
      same object the on-chain attestation signs.  `gold` is gone from the
      list for exactly that reason; the legacy endpoints still serve it for
      the old desktop panel. */

/* ═══ v2.3.4393: THE LEADERBOARDS, EASIER TO GET AROUND, WITH FACES ═══
   The owner, 2026-11-09: "the leaderboards should be expanded and easier to
   navigate from mobile and include the character profile pic and level next
   to each record.  Also I want to have the 'daily spin' biggest wins and
   losses records."  And a button of its own on the dashboard's row (it was a
   tile under More: BottomDashboard RAIL_ORDER).

   WHAT WAS HARD.  Seventeen boards were one row of chips scrolled sideways:
   six showed on a phone, and nothing said there were eleven more, or that
   the fish were at the far end.  A row was a name and a number.

   NOW.  The boards are a LIST down the page's left edge, under three
   headings -- Ranks (your level, the three weapons, kills, achievement
   points), Records (the daily spin, Ace's coin flip, the biggest fish) and
   Skills (the ten life skills) -- scrolled with a thumb like any list, one
   tap to change board, the one showing lit.  Each is a pill with its own
   picture (below).  The board fills the rest and
   scrolls by itself, so the list never leaves the screen.  Where the page is
   too narrow or too short for the two side by side (the old side column's
   ~214 px; a phone on its side, whose band is ~80 px tall) the list is the
   row of chips it was, the headings small between them.  Each row is BoardRow: rank, face, name, the name plate's level, the
   record; a deleted character's row grey with DELETED across the face.

   The Records boards have a WINS / LOSSES switch (the spin, the flip) or the
   species chips (the fish) on the board's own first line, never in the list:
   the list stays three rows long there.

   AP (v2.3.3527) is the worker's own number against a worker that says
   caps.achievements; its rows carry `ap`, not `value`, and a 0 is left off,
   as the per-skill boards leave off a skill nobody trained. */
/* ═══ v2.3.4393: EVERY BOARD A PILL WITH ITS OWN PICTURE ═══
   The owner: "Also make each record category a pill shaped button and add
   icons that represent each category on them."  Each board in the list is a
   pill (the dashboard's own button: a quiet well, a brass rim and brass word
   when it is the one showing) with a picture the game already uses for that
   thing, so nothing new is drawn or loaded: the level-up star, the three
   weapons' own icons (the combat cards'), the sword and skull of the kills
   record, the achievements' medal, the owner's prize wheel, a gold coin, a
   trout, and each life skill's own icon (the Life Skills page's).
   `icon`: [src, the file's width, then its opaque box x0 y0 x1 y1] -- the
   pictures are drawn with a wide empty margin, so each is scaled by its
   opaque box to fill its 20 px (NavRail's NAV_TRIM way).
   "Smithing", not "Blacksmithing": the Life Skills page's own word for the
   skill (skillsModel META), and thirteen letters do not fit a pill. */
/* ═══ v2.3.5501: THE NEW LOOK, AFTER THE OWNER'S MOCKUPS (card LB) ═══
   The owner, 2026-11-14: "I'd also like something more like this for
   leaderboards (mockup and art assets attached)", and of the second
   mockup, "This pic is better mock representation" (assets/ui/leaderboard/;
   the planning session's reading of it, the same day: the LAYOUT is the
   second mockup's, the art the sheet's).  docs/specs/leaderboard-look.md.

   THE PAGE, in the dashboard's band as every page is (the world stays above):
   - down the left, "RANKS" between two laurels, then the boards as pills on
     the sheet's pill bars (the lit one gold): Overall, Melee, Bow, Magic
     first (the sheet's crown, sword, bow and staff tiles), then Level, the
     sheet's gold divider, and every board there was before under it (Kills,
     AP; Records; Skills): nothing is dropped;
   - beside them a PODIUM of the first three on the sheet's shields (2 left,
     1 in the middle and raised, 3 right), each with the face, the name on the
     ribbon and "Lv N" under it -- where the band is tall enough for it
     (PODIUM_MIN_H); a phone on its side has no room and shows the table;
   - under it the TABLE: #, Player, Lv, Power (Total before the index) and
     the sword, bow and staff columns on the weapons' boards and Level; #, Player, Lv and the record on the
     others.  Rows 1-3 on the gold, silver and bronze bars with the laurel
     medals, a crown by the first name; your own row on the plain bar.
   - NO PAGES: the board scrolls inside the band (fifty rows, the server's
     limit), as every board did.  The first mockup's "Page 1 / 10" would add
     a row of buttons to a band that has room for four rows: the scroll is
     the band's own way.

   OVERALL AND THE POWER WAIT FOR CARD PW (the power index, built beside
   this; the worker's half #1776): until the worker says `caps.power`,
   Overall is not in the list and the Power column is today's number, the
   three weapons' levels added up, headed "Total".  With it, Overall ranks by
   Power (`?category=power`), and Power and its three columns are the row's
   own `powerIndex` (powerCells below).  The first mockup's five stat boards
   (Might, Fortitude, Vitality, Agility, Mind) are HELD (the planning
   session, 2026-11-14: retired stat names the worker no longer has; the
   second mockup shows none): none is built. */
/* the pieces the window draws, asked for as this script (the Leaderboards'
   own piece) loads, so the first board does not pop them in; never in
   BoardRow.jsx, which the Test panel imports for its faces */
try {
  if (typeof Image !== 'undefined') for (const n of LB_PIECES) { const im = new Image(); im.decoding = 'async'; im.src = LB_ART(n); }
} catch (_e) { /* each <img> loads its own */ }

/* v2.3.6743: each icon a whole written-out address (U + 'x.webp' was built,
   so the build could not give it its version; card KEEP PR 3b) */
/* the boards the worker answers from `series` (leaderboard.js
   SERIES_CATEGORIES): the weapons' boards draw the power table */
const BATTLE = [
  { id: 'power', label: say(SAY, 'leaderboard.overallBoard'), full: say(SAY, 'leaderboard.overallFull'), art: 'tile-crown', table: 'power', needs: 'power' },
  { id: 'melee', label: say(SAY, 'leaderboard.meleeBoard'), art: 'tile-sword', table: 'power', rank: 'melee' },
  { id: 'bow', label: say(SAY, 'leaderboard.bowBoard'), art: 'tile-bow', table: 'power', rank: 'bow' },
  { id: 'magic', label: say(SAY, 'leaderboard.magicBoard'), art: 'tile-staff', table: 'power', rank: 'magic' },
  /* 'combat' is the level on the name plate: the highest of the three
     weapons (leaderboard.js seriesValue, v2.3.3538's one level) */
  { id: 'combat', label: say(SAY, 'leaderboard.levelBoard'), icon: ['/icons/ui/hero/rec-xp.webp', 256, 30, 40, 226, 215], table: 'power', rank: 'lv' },
];
/* v2.3.5502: THE STAT BOARDS (card PW, #1781: server/src/statboards.js
   STAT_BOARD_IDS, in its order), each the points a player put in one shared
   stat, and `pts_dmg` the weapons' damage points summed.  The label and the
   icon are the Bro tab's own (src/data/prog3.js), so the board reads as the
   stat it ranks; the damage points' board says "Damage", never "Power" (the
   planning session, 2026-11-14: "Power" is Overall's), under a "Stats"
   heading. */
const STAT_ORDER = ['def', 'hp', 'dodge', 'stam', 'eres', 'mana', 'move', 'dmg'];
const STAT_BOARDS = STAT_ORDER.map((k) => {
  const m = k === 'dmg' ? PROG3_ATK_META.find((r) => r.key === 'dmg') : PROG3_BODY_META.find((r) => r.key === k);
  return { id: 'pts_' + k, label: k === 'dmg' ? say(SAY, 'leaderboard.damageBoard') : (m && m.label) || k, full: say(SAY, 'leaderboard.statFull', { stat: k === 'dmg' ? say(SAY, 'leaderboard.damageBoard') : (m && m.label) || k }), icon: m && m.iconSrc, table: 'stat' };
});
const KILLS = { id: 'kills', label: say(SAY, 'leaderboard.killsBoard'), icon: ['/icons/ui/hero/rec-kills.webp', 256, 0, 9, 256, 246] };
const AP_CAT = { id: 'ap', label: say(SAY, 'leaderboard.apBoard'), full: say(SAY, 'leaderboard.apFull'), icon: ['/icons/achievements/achievements.webp', 150, 37, 21, 113, 129] };
const SKILLS = [
  { id: 'woodcutting',  label: say(SAY, 'leaderboard.woodcuttingBoard'), icon: ['/icons/ui/skill-woodcutting.webp?v=2.3.1224', 256, 52, 32, 204, 221] },
  { id: 'fishing',      label: say(SAY, 'leaderboard.fishingBoard'), icon: ['/icons/ui/skill-fishing.webp?v=2.3.1224', 256, 55, 40, 200, 216] },
  { id: 'mining',       label: say(SAY, 'leaderboard.miningBoard'), icon: ['/icons/ui/skill-mining.webp?v=2.3.1224', 256, 48, 52, 208, 223] },
  { id: 'farming',      label: say(SAY, 'leaderboard.farmingBoard'), icon: ['/icons/ui/skill-farming.webp?v=2.3.1224', 256, 65, 73, 190, 223] },
  { id: 'cooking',      label: say(SAY, 'leaderboard.cookingBoard'), icon: ['/icons/ui/skill-cooking.webp?v=2.3.1224', 256, 41, 39, 215, 215] },
  { id: 'blacksmithing', label: say(SAY, 'leaderboard.smithingBoard'), full: say(SAY, 'leaderboard.smithingFull'), icon: ['/icons/ui/skill-blacksmithing.webp?v=2.3.1224', 256, 37, 33, 215, 221] },
  { id: 'woodworking',  label: say(SAY, 'leaderboard.woodworkingBoard'), icon: ['/icons/ui/skill-woodworking.webp?v=2.3.1224', 256, 33, 66, 223, 222] },
  { id: 'gemCutting',   label: say(SAY, 'leaderboard.gemCuttingBoard'), icon: ['/icons/ui/skill-gemcutting.webp?v=2.3.1224', 256, 48, 57, 207, 209] },
  { id: 'enchanting',   label: say(SAY, 'leaderboard.enchantingBoard'), icon: ['/icons/ui/skill-enchanting.webp?v=2.3.1224', 256, 55, 42, 201, 204] },
  { id: 'trapping',     label: say(SAY, 'leaderboard.trappingBoard'), icon: ['/icons/ui/skill-trapping.webp?v=2.3.3331', 256, 43, 64, 213, 215] },
];
/* the records: each asked of the room, not this page's fetch */
const SPIN_CAT = { id: 'spin', label: say(SAY, 'leaderboard.spinBoard'), kind: 'spin', icon: ['/icons/ui/prize-wheel.webp?v=2.3.3481', 102, 0, 0, 102, 110] };
const FLIP_CAT = { id: 'flip', label: say(SAY, 'leaderboard.flipBoard'), kind: 'flip', icon: ['/icons/ui/cur-gold.webp', 256, 34, 32, 221, 223] };
const FISH_CAT = { id: 'fish', label: say(SAY, 'leaderboard.fishBoard'), kind: 'fish', icon: ['/icons/items/fish-trout.webp', 128, 1, 25, 127, 102] };

/** A board's picture in a `px` box: the file scaled so its opaque box fills
 *  the box, centred.  v2.3.5501: a board with `art` wears its tile from the
 *  owner's sheet (the crown, the sword, the bow, the staff) instead. */
export function CatIcon({ icon, art, px, dim }) {
  /* a picture drawn to its own frame (the stats' icons, the Bro tab's): whole, contained */
  if (typeof icon === 'string') {
    return (
      <span data-lb-icon="" aria-hidden="true" style={{ position: 'relative', flex: 'none', width: px, height: px, display: 'block' }}>
        <img src={icon} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', opacity: dim ? 0.92 : 1 }} />
      </span>
    );
  }
  if (art) {
    return (
      <span data-lb-icon="" aria-hidden="true" style={{ position: 'relative', flex: 'none', width: px, height: px, display: 'block' }}>
        <img src={LB_ART(art)} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', opacity: dim ? 0.9 : 1 }} />
      </span>
    );
  }
  if (!icon) return null;
  const [src, size, x0, y0, x1, y1] = icon;
  const k = px / Math.max(x1 - x0, y1 - y0);
  return (
    <span data-lb-icon="" aria-hidden="true" style={{ position: 'relative', flex: 'none', width: px, height: px, overflow: 'hidden', display: 'block', opacity: dim ? 0.92 : 1 }}>
      <img src={src} alt="" draggable={false} style={{
        position: 'absolute', maxWidth: 'none', width: size * k, height: 'auto',
        left: px / 2 - ((x0 + x1) / 2) * k, top: px / 2 - ((y0 + y1) / 2) * k,
      }} />
    </span>
  );
}

/** The list: `[{title}, {id, label, ...}, {divider}, {sec}, ...]`, by what
 *  this worker says it keeps (each cap read directly: caps-audit). */
export function boardList(S) {
  const caps = (S && S._serverCaps) || {};
  const power = powerVersion(S) > 0;
  /* v2.3.5502: THE STATS GROUP (card PW's stat boards, #1781): as many as
     the worker ranks, `caps.statboards` a count (TRAPS §9), in its order */
  const stats = STAT_BOARDS.slice(0, Math.max(0, Math.floor(Number(S && S._serverCaps && S._serverCaps.statboards) || 0)));
  const records = [
    ...(spinBoardLive(S) ? [SPIN_CAT] : []),
    ...(caps.aceItems ? [FLIP_CAT] : []),
    ...(fishWeighLive(S) ? [FISH_CAT] : []),
  ];
  return [
    { title: 'Ranks' },
    ...BATTLE.filter((b) => !b.needs || power),
    ...(stats.length ? [{ sec: say(SAY, 'leaderboard.statsHeading') }, ...stats] : []),
    { divider: 'more' },
    KILLS, ...(caps.achievements ? [AP_CAT] : []),
    ...(records.length ? [{ sec: say(SAY, 'leaderboard.recordsHeading') }, ...records] : []),
    { sec: say(SAY, 'leaderboard.skillsHeading') }, ...SKILLS,
  ];
}

const num = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US');
/** a number in at most four figures and a letter, the FALLBACK: the Power
 *  is a rating (the owner, 2026-11-14, through the planning session: the
 *  control 3,000, about 200 at level 1 to 4,700 at level 40), whole numbers
 *  up to about 5,000, shown in full ("4,712"); a number past 9,999 (a scale
 *  that changes again) still fits its column -- 12.3k, 123k, 1.23M */
export function compact(v) {
  const n = Math.max(0, Math.floor(Number(v) || 0));
  if (n < 10000) return n.toLocaleString('en-US');
  const [d, u] = n >= 1e9 ? [1e9, 'B'] : n >= 1e6 ? [1e6, 'M'] : [1e3, 'k'];
  const x = n / d;
  return (x >= 100 ? Math.floor(x) : x >= 10 ? Math.floor(x * 10) / 10 : Math.floor(x * 100) / 100) + u;
}
const series = (r) => (r && r.series && typeof r.series === 'object' ? r.series : {});
/** The power index's version the worker sends (card PW: `caps.power`, a
 *  number, 2 since the rating), or 0.  v2.3.5502 (card LB, PR 3): read now
 *  that card PW's #1776 advertises it (v2.3.5501 held it at 0: caps-audit
 *  refuses a cap the phone reads before join.js sends it). */
function powerVersion(S) {
  const v = Number(S && S._serverCaps && S._serverCaps.power);
  return v > 0 ? v : 0;
}
/** a weapon's score in a 24 px column: in full to 999, then one decimal and
 *  a k ("2.7k": a rating's style column runs to the thousands) */
export function short(v) {
  const n = Math.max(0, Math.floor(Number(v) || 0));
  return n < 1000 ? String(n) : n < 10000 ? (Math.floor(n / 100) / 10) + 'k' : compact(n);
}
/** the Power cell and the three weapons' cells of a row.  With caps.power
 *  (the index's version, card PW) the row's own `powerIndex` {power, melee,
 *  bow, magic, v} -- only where its `v` is the worker's: any other row is
 *  "not yet ranked", a dash, never a 0 -- and without it today's three levels
 *  and their sum. */
function powerCells(r, power) {
  if (power) {
    const pi = r && r.powerIndex;
    if (!pi || typeof pi !== 'object' || pi.v !== power) return null;
    return { total: Number(pi.power) || 0, melee: Number(pi.melee) || 0, bow: Number(pi.bow) || 0, magic: Number(pi.magic) || 0 };
  }
  const s = series(r);
  const melee = Number(s.melee) || 0, bow = Number(s.bow) || 0, magic = Number(s.magic) || 0;
  return { total: melee + bow + magic, melee, bow, magic };
}

/* the table's columns: [key, head, width] -- the head a word or a weapon's icon */
const WEAPON_ICON = { melee: '/icons/ui/hero/melee.webp?v=2.3.1311', bow: '/icons/ui/hero/bow.webp?v=2.3.1311', magic: '/icons/ui/hero/magic.webp?v=2.3.1311' };
/* WHOLE NAMES ON AN UPRIGHT PHONE (the gatekeeper's sitting 10: "Bee...",
   "Chunk..." at 390 px, worse at 375).  A board narrower than WIDE_TABLE (an
   upright phone's, ~250-265 px beside the list) shows its Total (or Power)
   OR the three weapons' columns, never both: the head's last cell is a button
   that swaps them (the weapons' boards open on the weapons, the board they
   rank among them; Level and Overall on the total).  The name has ~105 px
   then, and takes two lines before it is cut.  A wider board (a computer, a
   phone on its side) shows them all.  With the power index the Power is a
   rating in full ("4,712") and each weapon's score short ("2.7k"). */
const WIDE_TABLE = 330;
const tableOf = (board, power, narrow, view) => {
  if (board.table !== 'power') {
    /* a skill's record is its level, a plain number under the skill's name:
       the row's "Lv" is the name plate's, never a second "Lv" (v2.3.4393's
       rule, BoardRow.jsx) */
    return [['lv', say(SAY, 'leaderboard.lvHead'), 32], ['record', board.id === 'ap' ? say(SAY, 'leaderboard.apHead') : board.id === 'kills' ? say(SAY, 'leaderboard.killsHead') : board.label, board.id === 'ap' || board.id === 'kills' ? 54 : 66]];
  }
  const total = ['total', power ? 'Power' : 'Total', power ? 40 : 36];
  const styles = [['melee', 'melee', power ? 26 : 24], ['bow', 'bow', power ? 26 : 24], ['magic', 'magic', power ? 26 : 24]];
  if (!narrow) return [['lv', say(SAY, 'leaderboard.lvHead'), 32], total, ...styles];
  return view === 'styles' ? [['lv', say(SAY, 'leaderboard.lvHead'), 32], ...styles] : [['lv', say(SAY, 'leaderboard.lvHead'), 32], total];
};
/* the narrow table's first view: the weapons' boards rank one of the three */
const firstView = (board) => (board.rank === 'melee' || board.rank === 'bow' || board.rank === 'magic' ? 'styles' : 'total');
const RANK_COL = 28;
const colsOf = (table) => RANK_COL + 'px minmax(0, 1fr) ' + table.map((c) => c[2] + 'px').join(' ');
/** the cells of a row on `board` (the one it ranks by marked `value`) */
function cellsOf(board, table, r, power) {
  const p = powerCells(r, power);
  const lv = Math.floor(Number(r && r.lv) || 0);
  const ranked = board.rank || (board.id === 'power' ? 'total' : 'record');
  return table.map(([key]) => {
    if (key === 'lv') return { key, lv, value: ranked === 'lv' };
    /* with the index: the Power in full (compact only past 9,999), each
       style short, a dash for a row not yet ranked; without it, the levels */
    const text = key === 'record' ? (board.id === 'ap' ? num(r.ap) : num(r.value ?? r.score))
      : !p ? '-'
      : !power ? num(p[key])
      : key === 'total' ? compact(p[key]) : short(p[key]);
    return { key, text, strong: key === 'total', value: ranked === key };
  });
}

/* the side list's width (108: "Woodworking", the longest word, whole in its
   pill beside a 20 px picture at 11.5 px -- 14 px narrower than v2.3.4393's
   122, for the table's columns), and the smallest page it stands beside the
   board on: that + a board of ~220 wide, and tall enough to show three boards
   of the list at once -- a phone on its side has a band ~80 px tall, where a
   list would be one row and a half and the chips show five */
const RAIL_W = 108;
const SIDE_BY_SIDE = 328;
const LIST_MIN_H = 140;
/* the podium: the three shields side by side at their full CSS size (89 +
   112 + 86, the sheet's own sizes to each other), scaled to the board's
   width; shown only where the band is tall enough for it AND four rows */
const PODIUM_W = 287 + 8;
const PODIUM_H = 88 + 12;
/* the podium is scaled to the board's width AND its height: it leaves the
   table's head and three rows (32 px each) in sight under it (the second
   mockup's four rows, the first three on their bars), or it is not drawn
   (a scale under 0.6: a phone on its side) */
const PODIUM_ROWS_H = 22 + 3 * 32 + 6;
const podiumScale = (w, h) => Math.min(1.15, w / PODIUM_W, h ? (h - PODIUM_ROWS_H) / PODIUM_H : 1);
const SHIELD = { 1: ['shield-gold', 112, 88], 2: ['shield-silver', 89, 80], 3: ['shield-bronze', 86, 76] };

/* the board you last looked at, kept while the game is open: closing the
   page to fight and coming back lands where you were (null: the list's first) */
let lastCat = null;

/** The first three on their shields: 2, 1 (raised), 3.  Each shield's field
 *  holds the face, its ribbon the name, the board's value under it (the shields' boxes,
 *  measured on the pieces: the field 22-78% across and 27-62% down, the
 *  ribbon 17-83% across and 64-84% down). */
/** what the ribbon says under the name: the board's own value -- the level on
 *  Level, the weapon's level (or score) on its board, the Power on Overall,
 *  the kills, the AP, the skill's level -- so the shields read in the board's
 *  order (the gatekeeper's sitting 10: the name plate's level could read out
 *  of order on Melee, Kills, AP or a skill) */
function podiumValue(board, r, power) {
  if (board.rank === 'lv') return { lv: Math.floor(Number(r.lv) || 0) };
  if (board.table === 'power') {
    const p = powerCells(r, power);
    const key = board.rank || 'total';
    if (!p) return { text: '-' };
    if (power) return { text: key === 'total' ? compact(p[key]) : num(p[key]) };
    /* the gatekeeper's sitting 11: a plain number, as the row prints it --
       only the Level board's ribbon says "Lv" (the rule: one "Lv", the
       name plate's) */
    return { text: num(p[key]) };
  }
  const v = Math.floor(Number(board.id === 'ap' ? r.ap : (r.value ?? r.score)) || 0);
  return board.id === 'ap' ? { text: say(SAY, 'leaderboard.apValue', { v: num(v) }) } : board.id === 'kills' ? { text: v === 1 ? say(SAY, 'leaderboard.killValue', { v: num(v) }) : say(SAY, 'leaderboard.killsValue', { v: num(v) }) }
    : board.table === 'stat' ? { text: v === 1 ? say(SAY, 'leaderboard.ptValue', { v: num(v) }) : say(SAY, 'leaderboard.ptsValue', { v: num(v) }) } : { text: num(v) };
}

/* a podium name's size: its own width measured once (a canvas's measureText
   at 100 px in the page's font, no layout read), scaled to fit `maxW`, never
   over `base` nor under 11 px (the notes' text floor; the gatekeeper's
   sitting 11: it fell to 7 at 375 px) -- past that it ends in "..." -- kept
   by name and size (a cap of 64) */
const NAME_FIT = new Map();
const NAME_FLOOR = 11;
let _fitCtx = null;
function fitName(name, maxW, base) {
  const key = name + '|' + Math.round(maxW) + '|' + base;
  if (NAME_FIT.has(key)) return NAME_FIT.get(key);
  let px = base;
  try {
    if (!_fitCtx) {
      /* the page's font read once (the first podium), never again */
      _fitCtx = document.createElement('canvas').getContext('2d');
      _fitCtx.font = '800 100px ' + ((document.body && getComputedStyle(document.body).fontFamily) || 'sans-serif');
    }
    const w100 = _fitCtx.measureText(name).width;
    if (w100 > 0) px = Math.max(NAME_FLOOR, Math.min(base, Math.floor((maxW * 100 / w100) * 10) / 10));
  } catch (_e) { /* the base size, cut if it must be */ }
  NAME_FIT.set(key, px);
  if (NAME_FIT.size > 64) NAME_FIT.delete(NAME_FIT.keys().next().value);
  return px;
}

function Podium({ rows, faces, k, meId, board, power }) {
  return (
    <div data-lb-podium="" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 4 * k, padding: `${4 * k}px 0 ${6 * k}px` }}>
      {[2, 1, 3].map((place) => {
        const r = rows[place - 1];
        const [art, sw, sh] = SHIELD[place];
        const W = Math.round(sw * k), Hh = Math.round(sh * k);
        if (!r) return <span key={place} aria-hidden="true" style={{ width: W, height: Hh, flex: 'none' }} />;
        const gone = !!r.gone;
        const name = r.name || r.id || say(SAY, 'leaderboard.unnamed');
        const pv = podiumValue(board, r, power);
        const facePx = Math.round(Hh * 0.33);
        return (
          <div key={place} data-lb-podium-place={place} data-lb-podium-mine={meId && r.id === meId ? '1' : undefined}
            role="img" aria-label={say(SAY, 'leaderboard.podiumLabel', { place, name, value: pv.text || say(SAY, 'leaderboard.podiumLevel', { lv: pv.lv }), gone: gone ? say(SAY, 'leaderboard.podiumGone') : '' })}
            style={{ position: 'relative', flex: 'none', width: W, height: Hh, marginBottom: place === 1 ? 0 : 6 * k }}>
            <img src={LB_ART(art)} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', filter: gone ? 'grayscale(1)' : 'none' }} />
            <span style={{ position: 'absolute', left: '50%', top: '29%', transform: 'translateX(-50%)' }}>
              <BoardFace src={faces[place - 1]} name={name} gone={gone} px={facePx} />
            </span>
            {/* the whole name on the ribbon and its tails: a long one's
                letters shrink to fit (measured, to 11 px, then it ends in
                "..."), as the mockup shows "Chunky Waffle" whole where the
                shields are big enough (the gatekeeper's sittings 10 and 11);
                the table's row always has the whole name */}
            <span data-lb-podium-name="" style={{
              position: 'absolute', left: '6%', right: '6%', top: '64%', height: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: fitName(name, W * 0.86, Math.max(NAME_FLOOR, 12 * k)), fontWeight: 800, color: '#FFF6E0', textShadow: '0 1px 2px rgba(0,0,0,.85)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1,
            }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span></span>
            {pv.text || pv.lv > 0 ? (
              <span data-lb-podium-value="" style={{ position: 'absolute', left: 0, right: 0, top: '79%', display: 'flex', justifyContent: 'center', transform: `scale(${Math.min(1, 0.85 * k + 0.1)})` }}>
                <LvPill lv={pv.lv} text={pv.text} gone={gone} />
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* the owner's own reading of the rating (2026-11-14, through the planning
   session): what a tap on the Power head says, one line */
const POWER_HINT = say(SAY, 'leaderboard.powerHint');

/** one head cell: a weapon's icon, or its word */
function HeadCell({ k, head, hint, setHint }) {
  if (WEAPON_ICON[head]) {
    return (
      <span data-lb-head-col={k} title={head === 'melee' ? say(SAY, 'leaderboard.meleeTitle') : head === 'bow' ? say(SAY, 'leaderboard.bowTitle') : say(SAY, 'leaderboard.magicTitle')} style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <img src={WEAPON_ICON[head]} alt={head} draggable={false} style={{ width: 15, height: 15, objectFit: 'contain', display: 'block' }} />
      </span>
    );
  }
  if (head === 'Power' && setHint) {
    return (
      <button type="button" data-lb-head-col={k} data-lb-power-head="" aria-expanded={!!hint} title={POWER_HINT}
        onClick={() => setHint(!hint)} style={{
          position: 'relative', textAlign: 'right', whiteSpace: 'nowrap', padding: 0, margin: 0, border: 'none', background: 'transparent',
          fontFamily: 'inherit', fontSize: 10.5, fontWeight: 800, color: hint ? COL.accent : COL.text2, cursor: 'pointer', touchAction: 'manipulation',
        }}>
        {head}<span aria-hidden="true" style={{ marginLeft: 2, opacity: 0.8 }}>?</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: -4, right: -4, top: -4, height: 44 }} />
      </button>
    );
  }
  return (
    <span data-lb-head-col={k} title={k === 'total' && head === 'Total' ? say(SAY, 'leaderboard.totalTitle') : undefined}
      style={{ textAlign: k === 'lv' ? 'center' : 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{head}</span>
  );
}

/** the table's head: #, Player, then each column's word or weapon.  "Power"
 *  (on a wide table) is a button: a tap shows the rating's one-line reading
 *  under the head (`hint`), a second tap hides it; a computer's pointer reads
 *  it as the head's tooltip too.  On a NARROW table (`swap`) the columns after
 *  Lv are one button that swaps the total for the three weapons and back
 *  (WIDE_TABLE above).  A head button's target reaches 44 px down over the
 *  first row, which takes no tap of its own. */
function TableHead({ table, hint, setHint, swap, hintHere }) {
  const [lv, ...rest] = table;
  return (
    <>
    <div data-lb-head="" style={{
      position: 'sticky', top: 0, zIndex: 2, display: 'grid', gridTemplateColumns: colsOf(table), columnGap: 3, alignItems: 'center',
      height: 22, padding: '0 9px 0 1px', background: COL.well, borderBottom: `1px solid ${COL.divider}`,
      fontSize: 10.5, fontWeight: 800, color: COL.text2, letterSpacing: '.02em',
    }}>
      <span style={{ textAlign: 'center' }}>#</span>
      {/* v2.3.5502: on a narrow table the swap button holds the Power
          column, so the rating's reading is a small "?" at the end of the
          Player head (`hintHere`), its target 44 px tall */}
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
        <span>{say(SAY, 'leaderboard.playerHead')}</span>
        {hintHere ? (
          <button type="button" data-lb-power-head="" aria-expanded={!!hint} aria-label={say(SAY, 'leaderboard.powerHintButton')} title={POWER_HINT}
            onClick={() => setHint(!hint)} style={{
              position: 'relative', width: 16, height: 16, padding: 0, margin: '0 2px 0 0', borderRadius: 8, boxSizing: 'border-box',
              border: `1px solid ${hint ? COL.accent : COL.edgeWarm}`, background: 'transparent', color: hint ? COL.accent : COL.text2,
              fontFamily: 'inherit', fontSize: 10, fontWeight: 900, lineHeight: '14px', cursor: 'pointer', touchAction: 'manipulation',
            }}>?
            <span aria-hidden="true" style={{ position: 'absolute', left: -14, right: -14, top: -14, height: 44 }} />
          </button>
        ) : null}
      </span>
      <HeadCell k={lv[0]} head={lv[1]} />
      {swap ? (
        <button type="button" data-lb-swap={swap.view} aria-label={swap.view === 'styles' ? say(SAY, 'leaderboard.showTotal') : say(SAY, 'leaderboard.showStyles')}
          onClick={swap.onSwap} style={{
            position: 'relative', gridColumn: '4 / -1', display: 'grid', gridTemplateColumns: rest.map((c) => c[2] + 'px').join(' '), columnGap: 3,
            alignItems: 'center', height: 20, margin: '0 -5px 0 0', padding: '0 4px 0 0', boxSizing: 'border-box',
            border: `1px solid ${COL.edgeWarm}`, borderRadius: 10, background: 'rgba(216, 170, 88, 0.08)',
            fontFamily: 'inherit', fontSize: 10.5, fontWeight: 800, color: COL.text2, cursor: 'pointer', touchAction: 'manipulation',
          }}>
          {rest.map(([key, head]) => <HeadCell key={key} k={key} head={head} />)}
          <span aria-hidden="true" style={{ position: 'absolute', left: -4, right: -4, top: -4, height: 44 }} />
        </button>
      ) : rest.map(([key, head]) => <HeadCell key={key} k={key} head={head} hint={hint} setHint={setHint} />)}
    </div>
    {hint ? (
      <div data-lb-power-hint="" role="note" style={{
        padding: '4px 8px', fontSize: 11.5, fontWeight: 700, color: COL.text, background: COL.well,
        borderBottom: `1px solid ${COL.divider}`, textAlign: 'right',
      }}>{say(SAY, 'leaderboard.powerHintLine', { hint: POWER_HINT })}</div>
    ) : null}
    </>
  );
}

/* ── a ranks board's rows: fetched from the Leaderboard object ──
   v2.3.5503: one hook, the old page's RankBoard's and the Ranks page's
   (RanksPage.jsx) table's: `{ rows, loading }`, the AP board's 0s left off */
function useRankRows(cat) {
  const [boards, setBoards] = useState(() => Object.create(null));
  const [loading, setLoading] = useState(true);
  /* Fetch per category, cache per category, refresh on a slow timer.  A
     hiscores page is not a live readout — the server's own report throttle
     means a row changes at most once a minute — so 20s is generous.
     `boards` is Object.create(null): the keys are category ids that ride in
     from a fetch response, and a plain {} silently no-ops on '__proto__'
     (CLAUDE.md — three incidents in one day). */
  useEffect(() => {
    let alive = true;
    const load = () => {
      act('http:/api/leaderboard/top', {}, { query: 'category=' + encodeURIComponent(cat) + '&limit=50' })   /* v2.3.5191: through the action door (actions.js) */
        .then(r => r.json())
        .then(d => {
          if (!alive || !d || !d.ok) return;
          setBoards(prev => { const next = Object.create(null); Object.assign(next, prev); next[cat] = d.results || []; return next; });
        })
        .catch(() => {})
        .finally(() => { if (alive) setLoading(false); });
    };
    setLoading(!boards[cat]);
    load();
    const id = setInterval(load, 20000);
    return () => { alive = false; clearInterval(id); };
  }, [cat]);
  /* v2.3.3527: the AP board leaves off everyone at 0 */
  const rows = (boards[cat] || []).filter((r) => cat !== 'ap' || Math.floor(Number(r && r.ap) || 0) > 0);
  return { rows, loading };
}

/** the line a board with nobody on it says */
const emptyOf = (board, loading) => (loading ? say(SAY, 'leaderboard.loading') : board.id === 'ap' ? say(SAY, 'leaderboard.emptyAp') : board.id === 'kills' ? say(SAY, 'leaderboard.emptyKills')
  : board.table === 'stat' ? say(SAY, 'leaderboard.emptyStat') : say(SAY, 'leaderboard.emptySkill'));

/* ── a ranks board ── */
function RankBoard({ board, podium, w }) {
  const cat = board.id;
  const [view, setView] = useState(() => firstView(board));
  const [hint, setHint] = useState(false);
  const { rows, loading } = useRankRows(cat);
  const S = getState();
  const meId = S && S.myId;
  /* the index's version (card PW: a number, 1 today), or 0 */
  /* v2.3.5502: the Power and its three styles' scores are OVERALL's
     columns.  The weapons' boards rank by the weapon's LEVEL and Level by the
     level (leaderboard.js SERIES_CATEGORIES), so they keep the levels: every
     board shows the numbers it is ranked by */
  const power = board.id === 'power' ? powerVersion(S) : 0;
  const faces = useBoardFaces(rows);
  if (rows.length === 0) return <BoardEmpty text={emptyOf(board, loading)} />;
  const narrow = board.table === 'power' && w > 0 && w < WIDE_TABLE;
  const table = tableOf(board, power, narrow, view);
  const cols = colsOf(table);
  return (
    <>
      {podium ? <Podium rows={rows.slice(0, 3)} faces={[faces[0], faces[1], faces[2]]} k={podium} meId={meId} board={board} power={power} /> : null}
      <TableHead table={table} hint={hint} setHint={setHint} hintHere={narrow && power > 0 && view !== 'styles'}
        swap={narrow ? { view, onSwap: () => setView(view === 'styles' ? 'total' : 'styles') } : null} />
      <div data-lb-rows="" style={{ paddingTop: 3 }}>
        {rows.map((r, i) => (
          <TableRow key={r.id || i} rank={i + 1} row={r} face={faces[i]} mine={!!meId && r.id === meId}
            cols={cols} cells={cellsOf(board, table, r, power)} />
        ))}
      </div>
    </>
  );
}

/* v2.3.1235: every interactive element is 44 px tall at least; the chip's
   pill is the 32 px visual inside a transparent 44 px hit box. */
const chipHit = {
  flex: '0 0 auto', minHeight: 44, padding: 0, margin: 0, background: 'transparent', border: 'none',
  display: 'inline-flex', alignItems: 'center', cursor: 'pointer', touchAction: 'manipulation',
};
const chip = (active) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px',
  background: active ? COL.accentFill : 'transparent',
  color: active ? COL.accent : COL.text2,
  border: `1px solid ${active ? COL.accent : COL.border}`,
  borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
});

/* ── a wins / losses board (the daily spin, Ace's flip) ── */
function WinLossBoard({ id, wins, losses, side, setSide, amountOf, lineOf, state, emptyWin, emptyLoss }) {
  const S = getState();
  const meId = S && S.myId;
  const rows = (side === 'losses' ? losses : wins) || [];
  const faces = useBoardFaces(rows);
  return (
    <div data-winloss-board={id} data-winloss-side={side}>
      <div role="tablist" style={{ display: 'flex', gap: 6, padding: '0 4px 2px' }}>
        {[['wins', say(SAY, 'leaderboard.winsTab')], ['losses', say(SAY, 'leaderboard.lossesTab')]].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={side === k} data-winloss-tab={k} onClick={() => setSide(k)} style={{ ...chipHit, flex: '1 1 0', justifyContent: 'center' }}>
            <span style={{ ...chip(side === k), width: '100%', justifyContent: 'center', boxSizing: 'border-box' }}>{label}</span>
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <BoardEmpty text={state || (side === 'losses' ? emptyLoss : emptyWin)} />
      ) : rows.map((r, i) => (
        <BoardRow key={(r.pid || i) + ':' + side} rank={i + 1} row={r} face={faces[i]} mine={!!meId && r.pid === meId}
          line={lineOf ? lineOf(r, side === 'wins') : null}
          value={Math.max(0, Math.floor(Number(amountOf(r)) || 0)).toLocaleString('en-US')} unit="gold" />
      ))}
    </div>
  );
}
const REFRESH_MS = 30000;

function SpinBoard({ side, setSide }) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeSpinBoard(() => setTick((x) => (x + 1) % 1000000)), []);
  useEffect(() => {
    const ask = () => askSpinBoard(getState());
    ask();
    const id = setInterval(ask, REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  const S = getState();
  const sb = S && S._spinBoard;
  const state = !sb ? say(SAY, 'leaderboard.loading') : sb.off ? say(SAY, 'leaderboard.spinClosed') : sb.unavailable ? say(SAY, 'leaderboard.spinUnreadable') : null;
  return (
    <WinLossBoard id="spin" side={side} setSide={setSide} wins={sb && sb.wins} losses={sb && sb.losses} state={state}
      amountOf={(r) => r.n} lineOf={spinRowLine}
      emptyWin={say(SAY, 'leaderboard.spinEmptyWin')}
      emptyLoss={say(SAY, 'leaderboard.spinEmptyLoss')} />
  );
}

function FlipBoard({ side, setSide }) {
  const [, setTick] = useState(0);
  useEffect(() => aceFlipBus.subscribe(() => setTick((x) => (x + 1) % 1000000)), []);
  useEffect(() => {
    const ask = () => {
      const S = getState();
      /* gamble.js _handleAceBoardRequest: the room answers `ace_board` */
      try { if (S && S.channel) act('ace_board_request', {}); } catch (_e) { /* the next tick asks */ }   /* v2.3.5191: through the action door (actions.js) */
    };
    ask();
    const id = setInterval(ask, REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  const b = aceFlipBus.board || {};
  return (
    <WinLossBoard id="flip" side={side} setSide={setSide} wins={(b.wins || []).filter(Boolean)} losses={(b.losses || []).filter(Boolean)}
      amountOf={(r) => r.amount} lineOf={(r, won) => (won ? say(SAY, 'leaderboard.flipWonLine') : say(SAY, 'leaderboard.flipLostLine'))}
      emptyWin={say(SAY, 'leaderboard.flipEmptyWin')}
      emptyLoss={say(SAY, 'leaderboard.flipEmptyLoss')} />
  );
}

/* ═══ v2.3.5503: WHAT THE RANKS PAGE ASKS OF A BOARD (RanksPage.jsx) ═══
   The new page draws ONE value column, the board's own number, as the
   mockup does: the Power on Overall, the weapon's level on its board, the
   level on Level (whose rows show no second "Lv"), a stat's points, the
   kills, the AP, a skill's level.  The records (the spin, the flip, the
   fish) are today's boards in its scrolled part, your row pinned under the
   spin's and the flip's (the fish board keeps its species inside it). */
const valueOfRow = (board, r, power) => {
  if (board.id === 'power') { const p = powerCells(r, power); return p ? compact(p.total) : '-'; }
  if (board.rank === 'lv') return num(r && r.lv);
  if (board.rank) return num(series(r)[board.rank]);
  return board.id === 'ap' ? num(r && r.ap) : num(r && (r.value ?? r.score));
};
const headOfBoard = (board) => (board.id === 'power' ? say(SAY, 'leaderboard.powerHead') : board.id === 'ap' ? say(SAY, 'leaderboard.apHead')
  : board.id === 'kills' ? say(SAY, 'leaderboard.killsHead') : board.label);
/* `S` the state this panel was handed: the page itself reads none */
function ranksParts(S, side, setSide, fishWant) {
  return {
    me: { id: (S && S.myId) || '', name: (S && S.myName) || '' },
    Icon: CatIcon,
    useRows: useRankRows,
    hasLv: (board) => board.rank !== 'lv',
    /* the value column: wide enough for its head word at 11 px */
    valueW: (board) => Math.max(52, Math.min(84, Math.round(headOfBoard(board).length * 6.6) + 6)),
    headOf: headOfBoard,
    hintOf: (board) => (board.id === 'power' && powerVersion(S) > 0 ? POWER_HINT : null),
    valueOf: (board, r) => valueOfRow(board, r, powerVersion(S)),
    emptyOf,
    record: (board) => (board.kind === 'fish' ? <FishBoard key={fishWant || 'fish'} initial={fishWant} />
      : board.kind === 'spin' ? <SpinBoard side={side} setSide={setSide} /> : <FlipBoard side={side} setSide={setSide} />),
    recordRows: (board) => {
      const amount = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US');
      if (board.kind === 'spin') { const sb = S && S._spinBoard; return { rows: (sb && (side === 'losses' ? sb.losses : sb.wins)) || [], valueOf: (r) => amount(r.n) }; }
      if (board.kind === 'flip') { const b = aceFlipBus.board || {}; return { rows: ((side === 'losses' ? b.losses : b.wins) || []).filter(Boolean), valueOf: (r) => amount(r.amount) }; }
      return null;
    },
  };
}

/** a board's pill: the sheet's pill bar (the gold one when it is the board
 *  showing), its picture and its word; `row` in the narrow page's row of chips */
function Pill({ b, on, row }) {
  return (
    <span data-lb-pill="" data-lb-pill-on={on ? '1' : undefined} style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: row ? 5 : 4, width: row ? 'auto' : '100%', height: row ? 34 : 36,
      padding: row ? '0 14px 0 9px' : '0 6px 0 6px', boxSizing: 'border-box', borderRadius: 999,
      /* 11 px for the eleven-letter words ("Woodworking", whose W's are the
         widest), so each is whole in the 108 px list */
      color: on ? '#FFE7A6' : COL.text, fontSize: row ? 13 : b.label.length >= 11 ? 11 : 11.5, fontWeight: 800, textAlign: 'left',
      textShadow: '0 1px 2px rgba(0,0,0,.75)',
    }}>
      <BarBack name={on ? 'pill-gold' : 'pill-plain'} />
      <span style={{ position: 'relative', display: 'flex' }}><CatIcon icon={b.icon} art={b.art} px={b.art ? 22 : 18} dim={!on} /></span>
      <span style={{ position: 'relative', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</span>
    </span>
  );
}

/** "RANKS" between the two laurels (the second mockup's title) */
function Title() {
  return (
    <div data-lb-title="" role="heading" aria-level={2} aria-label={say(SAY, 'leaderboard.ranksLabel')} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 34, flex: 'none',
    }}>
      <img src={LB_ART('laurel-left')} alt="" aria-hidden="true" draggable={false} style={{ width: 15, height: 'auto', display: 'block' }} />
      <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: '.08em', color: '#F2C462', textShadow: '0 1px 2px rgba(0,0,0,.8)' }}>{say(SAY, 'leaderboard.ranksTitle')}</span>
      <img src={LB_ART('laurel-right')} alt="" aria-hidden="true" draggable={false} style={{ width: 15, height: 'auto', display: 'block' }} />
    </div>
  );
}

const Divider = ({ row }) => (
  <span data-lb-divider="" aria-hidden="true" style={row
    ? { flex: 'none', width: 2, height: 26, margin: '0 4px', background: 'linear-gradient(180deg, transparent, #D8AA58, transparent)', display: 'block' }
    : { display: 'block', margin: '5px 2px 3px' }}>
    {row ? null : <img src={LB_ART('divider-gold')} alt="" draggable={false} style={{ width: '100%', height: 'auto', display: 'block' }} />}
  </span>
);

export const LeaderboardPanel = () => {
  const S = getState();
  const list = boardList(S);
  const boardsIn = list.filter((b) => b.id);
  const ids = boardsIn.map((b) => b.id);
  /* v2.3.4036: the weigh-in card's Records opens this on the fish board */
  const [fishWant, setFishWant] = useState(() => takeFishBoardWant());
  const [catRaw, setCatRaw] = useState(() => (fishWant ? 'fish' : lastCat));
  /* ...and when it is already open (a Records tap with the page up) */
  useEffect(() => subscribeFishWeigh(() => { const w = takeFishBoardWant(); if (w) { setFishWant(w); setCatRaw('fish'); } }), []);
  /* a board this worker does not keep (a switch thrown while it showed), or
     none chosen yet: the list's first (Overall, or Melee before caps.power) */
  const cat = ids.includes(catRaw) ? catRaw : ids[0];
  const setCat = (id) => { lastCat = id; setCatRaw(id); };
  const cur = boardsIn.find((b) => b.id === cat) || boardsIn[0];
  const [side, setSide] = useState('wins');
  const [boxRef, boxW, boxH] = useBoxSize();
  /* until the box is measured, the shape an upright phone gets */
  const sideBySide = boxW === 0 || (boxW >= SIDE_BY_SIDE && boxH >= LIST_MIN_H);
  const boardW = sideBySide ? Math.max(0, (boxW || 390) - RAIL_W - 12) : (boxW || 390);
  /* the podium's scale, or 0: not drawn (the narrow page, or too short) */
  const pk = sideBySide ? podiumScale(boardW, boxH) : 0;
  const podium = pk >= 0.6 ? pk : 0;
  /* the board showing is on screen in the list or the chips: the page opens
     on the one you last looked at, which may be far down */
  const navRef = useRef(null);
  useEffect(() => {
    const nav = navRef.current;
    const on = nav && nav.querySelector('[data-lb-cat="' + cat + '"]');
    try { if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_e) { /* an old browser: the list is still a list */ }
  }, [cat, sideBySide]);

  /* v2.3.5503: the Ranks page in the owner's new style; `?rankstyle=0` the page below */
  if (!sw('rankstyle')) return <RanksPage boards={boardsIn} want={catRaw} onBoard={setCat} parts={ranksParts(S, side, setSide, fishWant)} />;

  const board = cur.kind === 'fish' ? <FishBoard key={fishWant || 'fish'} initial={fishWant} />
    : cur.kind === 'spin' ? <SpinBoard side={side} setSide={setSide} />
    : cur.kind === 'flip' ? <FlipBoard side={side} setSide={setSide} />
    : <RankBoard key={cat} board={cur} podium={podium} w={boardW} />;

  if (!sideBySide) {
    /* the narrow page (a phone on its side): the pills in one row over the
       board, the headings small between them; the table without its podium */
    return (
      <div ref={boxRef} data-lb-page="chips" data-lb-open={cat} style={panelStyle}>
        <div ref={navRef} data-lb-chips="" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, overflowX: 'auto', padding: '2px 0' }}>
          {list.map((b) => (b.title ? null : b.divider ? <Divider key="div" row /> : b.sec ? (
            <span key={'s:' + b.sec} aria-hidden="true" style={railHeading(true)}>{b.sec}</span>
          ) : (
            <button key={b.id} type="button" data-lb-cat={b.id} aria-pressed={b.id === cat} title={b.full || b.label} onClick={() => setCat(b.id)} style={chipHit}>
              <Pill b={b} on={b.id === cat} row />
            </button>
          )))}
        </div>
        <div data-lb-board={cat}>{board}</div>
      </div>
    );
  }

  return (
    <div ref={boxRef} data-lb-page="list" data-lb-open={cat} style={{
      ...panelStyle, overflow: 'hidden', display: 'flex', padding: '2px 4px 0',
      /* each side fades at its own foot (below): the page itself does not scroll */
      WebkitMaskImage: 'none', maskImage: 'none',
    }}>
      <div ref={navRef} data-lb-rail="" role="tablist" aria-label={say(SAY, 'leaderboard.listLabel')} aria-orientation="vertical" style={{
        flex: 'none', width: RAIL_W, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y',
        padding: '0 4px 18px 0', boxSizing: 'border-box', borderRight: `1px solid ${COL.divider}`,
        WebkitMaskImage: FOOT_FADE, maskImage: FOOT_FADE,
      }}>
        {list.map((b, bi) => (b.title ? <Title key="title" /> : b.divider ? <Divider key="div" /> : b.sec ? (
          /* v2.3.4394: a heading headlines its section (railKit railHeading) */
          <div key={'s:' + b.sec} data-lb-sec={b.sec} role="presentation" style={railHeading(false, bi === 0)}>{b.sec}</div>
        ) : (
          /* the button is the 44 px target; the pill inside it is what is seen
             (the chips' rule, v2.3.1235) */
          <button key={b.id} type="button" role="tab" aria-selected={b.id === cat} data-lb-cat={b.id}
            title={b.full || b.label} onClick={() => setCat(b.id)}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', minHeight: 44, margin: 0, padding: 0,
              background: 'transparent', border: 'none', fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
            }}>
            <Pill b={b} on={b.id === cat} />
          </button>
        )))}
      </div>
      <div data-lb-board={cat} role="tabpanel" aria-label={cur.full || cur.label} style={{
        flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y',
        padding: '0 0 18px 6px', boxSizing: 'border-box',
        WebkitMaskImage: FOOT_FADE, maskImage: FOOT_FADE,
      }}>
        {board}
      </div>
    </div>
  );
};
