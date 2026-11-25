import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';   /* your row into the top line on a phone on its side */
import { COL, panelStyle } from './common.js';
import { BoardEmpty, useBoardFaces, BarBack, LB_ART, BoardFace, LvPill, RankMark, Crown, rowBar, mineRing } from './BoardRow.jsx';   /* the faces, the bars, the medals: BoardRow.jsx's own, unchanged */
import { useBoxSize } from './railKit.js';
import { ranksStart, ranksStep, ranksTabs, ranksFit, youRow, rankMark, medalOf } from '@/game/ranksPage.js';   /* v2.3.5503: the page's rules */
import { SAY } from '@/data/say/leaderboard.js';
import { say } from '@/game/say.js';
/* your own face, for your pinned row when no board's row carries it: the
   look the join sends (wsClient.js's join `data`), the short ids a bust is
   made of (server boards.js FACE_KEYS) */
import { getHeadwear } from '@/rendering/traits/headwearCatalog.js';
import { getFacialHair } from '@/rendering/traits/facialHairCatalog.js';
import { getEyewear } from '@/rendering/traits/eyewearCatalog.js';
import { getHair } from '@/rendering/traits/hairCatalog.js';
import { getSkin } from '@/rendering/playerSkins.js';
import { getHairColor } from '@/rendering/traits/hairColorCatalog.js';
import { getHatColor } from '@/rendering/traits/hatColorCatalog.js';
import { getEyewearColor } from '@/rendering/traits/eyewearColorCatalog.js';
import { getEyeStyle } from '@/rendering/traits/eyeStyleCatalog.js';
import { getSpecies } from '@/rendering/traits/speciesCatalog.js';
import { getFacialHairColor } from '@/rendering/traits/facialHairColorCatalog.js';
import { getShirt } from '@/rendering/traits/shirtCatalog.js';
import { getShirtColor } from '@/rendering/traits/shirtColorCatalog.js';
import { getEyeColor } from '@/rendering/traits/eyeColorCatalog.js';

/* ═══ v2.3.5503: THE RANKS PAGE, IN THE OWNER'S NEW STYLE (card LB, part 2) ═══
   The owner, 2026-11-25, with one mockup: "Also I prefer changing the
   leaderboard style to something like this" (right after asking for the Bro
   and Quests tabs in pages: "all related information is shown at once ...
   Players see the big picture first and can investigate the details
   whenever they want").  docs/UI-DESIGN-NOTES.md "The Leaderboards".

   THE PAGE reads as ONE board at a glance, top to bottom:
   - FOUR TABS across the top, each its picture and word, the open one gold:
     Power (the sheet's sword), Stats (the Bro tab's shield), Records (the
     sheet's gold trophy), Skills (Mining's pickaxe).  Every board today's
     list has sits under one (src/game/ranksPage.js ranksTabs): none dropped;
   - ONE ROW: the picker (the open board's picture, its word and an arrow:
     a tap opens the list of the tab's boards), "RANKS" between the laurels,
     and the board's span, a quiet tag ("All-time leaderboard": no board is a
     daily one; the Daily spin's records are its biggest pots ever);
   - THE HEADS: #, Player, a "?" where today's page has words for the
     board's number (Overall's rating), Lv, and the board's own value word;
   - THE ROWS, the only part that scrolls: 1-3 on the gold, silver and
     bronze bars with the laurel medals, a crown by the leader; 4 and below
     the plain number; each the face, the name, an "Lv N" chip and the value
     in the big numerals;
   - YOUR ROW pinned at the foot, framed in gold: your face, "<name> · You",
     "Rank #N", your Lv and your value -- off the board, the mockup's dashes.
   Every row and number is what the worker sends for the board; the faces
   are the rows' own looks (yours drawn from your own look when no row
   carries it).
   `?rankstyle=0` gives back the page before it (LeaderboardPanel.jsx). */

/* the tabs' pictures and words: the game's own (no new art file)
   (drawn by the boards' own CatIcon: `art` a piece of the sheet, `icon` a
   picture whole or [src, width, its opaque box] trimmed to fill the box --
   Mining's pickaxe is drawn with a wide margin, as the board's pill has it) */
const TAB_LOOK = {
  power: { art: 'tile-sword', word: say(SAY, 'leaderboard.tabPower') },
  stats: { icon: '/icons/ui/stat/def.png?v=2.3.2642', word: say(SAY, 'leaderboard.tabStats') },
  records: { art: 'trophy-gold', word: say(SAY, 'leaderboard.tabRecords') },
  skills: { icon: ['/icons/ui/skill-mining.webp?v=2.3.1224', 256, 48, 52, 208, 223], word: say(SAY, 'leaderboard.tabSkills') },
};
/* the trophy is asked for with the rest of the pieces as LeaderboardPanel.jsx
   loads (BoardRow.jsx LB_PIECES) */

const GOLD = '#F2C462';
const GOLD_LIT = '#FFE7A6';
const GOLD_RIM = '#D8AA58';
const SHADOW = '0 1px 2px rgba(0,0,0,.75)';

/* the sizes come from the band's height (ranksPage.js ranksFit: the first
   three rows always in sight; a short band packs the tabs and the picker
   into one row) */
/* the table's columns: #, Player, the "?" (the head only), Lv, the value */
const colsOf = (lv, valueW) => '30px minmax(0, 1fr) 18px ' + (lv ? '44px ' : '') + valueW + 'px';

/** Your look, as a board's row carries one (server boards.js FACE_KEYS). */
function ownLook() {
  try {
    return { sk: getSkin(), hr: getHair(), hc: getHairColor(), hw: getHeadwear(), htc: getHatColor(), fh: getFacialHair(), fhc: getFacialHairColor(),
      ew: getEyewear(), ewc: getEyewearColor(), es: getEyeStyle(), ec: getEyeColor(), sc: getSpecies(), st: getShirt(), stc: getShirtColor() };
  } catch (_e) { return null; }
}

/** one tab: its picture beside its word; the open one on the gold bar */
function Tab({ id, on, onTap, fit, Icon }) {
  const t = TAB_LOOK[id];
  return (
    <button type="button" role="tab" aria-selected={on} data-lb-tab={id} onClick={onTap} style={{
      position: 'relative', flex: '1 1 0', minWidth: 0, height: fit.tabH, margin: 0, padding: '0 4px', border: 'none', background: 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
      color: on ? GOLD_LIT : COL.text, fontSize: fit.tight ? 12.5 : 13.5, fontWeight: 800, textShadow: SHADOW,
    }}>
      <BarBack name={on ? 'pill-gold' : 'pill-plain'} />
      <span style={{ position: 'relative', display: 'flex' }}><Icon icon={t.icon} art={t.art} px={fit.tight ? 19 : 22} /></span>
      <span data-lb-tab-word="" style={{ position: 'relative', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.word}</span>
      {/* the 44 px target, over the gaps round the bar */}
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: (fit.tabH - 44) / 2, height: 44 }} />
    </button>
  );
}

/** "RANKS" between the two laurels */
function Title({ small }) {
  return (
    <div data-lb-title="" role="heading" aria-level={2} aria-label={say(SAY, 'leaderboard.ranksLabel')} style={{
      flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
    }}>
      <img src={LB_ART('laurel-left')} alt="" aria-hidden="true" draggable={false} style={{ width: small ? 11 : 14, height: 'auto', display: 'block' }} />
      <span style={{ fontSize: small ? 13 : 15, fontWeight: 900, letterSpacing: '.08em', color: GOLD, textShadow: SHADOW }}>{say(SAY, 'leaderboard.ranksTitle')}</span>
      <img src={LB_ART('laurel-right')} alt="" aria-hidden="true" draggable={false} style={{ width: small ? 11 : 14, height: 'auto', display: 'block' }} />
    </div>
  );
}

/** the picker: the open board's picture and word, and the arrow */
function Picker({ b, Icon, open, onTap, fit }) {
  return (
    <button type="button" data-lb-picker={b.id} aria-expanded={open} aria-haspopup="listbox" aria-label={say(SAY, 'leaderboard.pickerLabel', { board: b.full || b.label })}
      onClick={onTap} style={{
        position: 'relative', flex: fit.oneRow ? '1 1 auto' : '0 1 150px', minWidth: 96, height: fit.oneRow ? fit.tabH : fit.pickH, margin: 0, padding: '0 8px 0 6px', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 5, borderRadius: 15, border: `1.5px solid ${GOLD_RIM}`,
        background: open ? 'rgba(216, 170, 88, 0.22)' : 'rgba(11, 22, 27, 0.72)', fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
        color: GOLD_LIT, fontSize: fit.tight ? 12.5 : 13.5, fontWeight: 800, textShadow: SHADOW,
      }}>
      <Icon icon={b.icon} art={b.art} px={fit.tight ? 18 : 20} />
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</span>
      <span aria-hidden="true" style={{ flex: 'none', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
        borderTop: open ? 'none' : `6px solid ${GOLD}`, borderBottom: open ? `6px solid ${GOLD}` : 'none' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: ((fit.oneRow ? fit.tabH : fit.pickH) - 44) / 2, height: 44 }} />
    </button>
  );
}

/** the picker's list: the tab's boards, 44 px each, the open one lit; its ✕
 *  (Escape on a computer) shuts it */
function Menu({ boards, on, Icon, onPick, onClose, line }) {
  /* over the whole page (the band is too short for it under the tabs); on
     a phone on its side one line of boards, scrolled sideways, its ✕ first */
  const close = (
    <button type="button" data-esc="" data-lb-menu-close="" aria-label={say(SAY, 'leaderboard.pickerClose')} onClick={onClose} style={{
      flex: 'none', width: 44, height: line ? 44 : 36, padding: 0, border: 'none', background: 'transparent', color: COL.text,
      fontSize: 15, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
    }}>{'✕'}</button>
  );
  return (
    <div data-lb-menu="" role="listbox" aria-label={say(SAY, 'leaderboard.listLabel')} style={{
      position: 'absolute', left: 4, right: 4, top: 2, bottom: 2, zIndex: 6, display: 'flex', flexDirection: line ? 'row' : 'column', alignItems: line ? 'center' : 'stretch',
      background: COL.bgStrong, border: `1px solid ${GOLD_RIM}`, borderRadius: 10, boxShadow: '0 8px 18px rgba(4,7,9,.45)', overflow: 'hidden',
    }}>
      {line ? close : (
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', padding: '0 2px 0 10px', borderBottom: `1px solid ${COL.divider}` }}>
          <span style={{ flex: 1, fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: COL.text2 }}>{say(SAY, 'leaderboard.pickerHead')}</span>
          {close}
        </div>
      )}
      <div style={line
        ? { flex: 1, minWidth: 0, overflowX: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-x', padding: 3, display: 'flex', alignItems: 'center', gap: 4 }
        : { flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y', padding: 3,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', alignContent: 'start', gap: 2 }}>
        {boards.map((b) => (
          <button key={b.id} type="button" role="option" aria-selected={b.id === on} data-lb-cat={b.id} title={b.full || b.label}
            onClick={() => onPick(b.id)} style={{
              position: 'relative', flex: line ? 'none' : undefined, display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, margin: 0, padding: '0 12px 0 8px',
              border: 'none', background: 'transparent', fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
              color: b.id === on ? GOLD_LIT : COL.text, fontSize: 13, fontWeight: 800, textAlign: 'left', textShadow: SHADOW,
            }}>
            <BarBack name={b.id === on ? 'pill-gold' : 'pill-plain'} />
            <span style={{ position: 'relative', display: 'flex' }}><Icon icon={b.icon} art={b.art} px={b.art ? 22 : 18} /></span>
            <span style={{ position: 'relative', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** the heads: #, Player, the "?" (where the board has words), Lv, the value */
function Head({ cols, lv, word, hint, hintOn, setHintOn, fit }) {
  return (
    <div data-lb-head="" style={{
      flex: 'none', display: 'grid', gridTemplateColumns: cols, columnGap: 3, alignItems: 'center', height: fit.headH, margin: `0 2px ${fit.gap}px`, boxSizing: 'border-box',
      padding: '0 10px 0 2px', borderRadius: 11, background: 'rgba(11, 22, 27, 0.6)', border: `1px solid ${COL.divider}`,
      fontSize: 11, fontWeight: 800, color: COL.text2, letterSpacing: '.02em',
    }}>
      <span data-lb-head-col="rank" style={{ textAlign: 'center' }}>#</span>
      <span data-lb-head-col="player">{say(SAY, 'leaderboard.playerHead')}</span>
      <span style={{ display: 'flex', justifyContent: 'center' }}>
        {hint ? (
          <button type="button" data-lb-power-head="" aria-expanded={!!hintOn} aria-label={say(SAY, 'leaderboard.powerHintButton')} title={hint}
            onClick={() => setHintOn(!hintOn)} style={{
              position: 'relative', width: 17, height: 17, padding: 0, margin: 0, borderRadius: 9, boxSizing: 'border-box',
              border: `1px solid ${hintOn ? COL.accent : COL.edgeWarm}`, background: 'transparent', color: hintOn ? COL.accent : COL.text2,
              fontFamily: 'inherit', fontSize: 11, fontWeight: 900, lineHeight: '15px', cursor: 'pointer', touchAction: 'manipulation',
            }}>?
            <span aria-hidden="true" style={{ position: 'absolute', left: -14, right: -14, top: -14, height: 44 }} />
          </button>
        ) : null}
      </span>
      {lv ? <span data-lb-head-col="lv" style={{ textAlign: 'center' }}>{say(SAY, 'leaderboard.lvHead')}</span> : null}
      <span data-lb-head-col="value" style={{ textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{word}</span>
    </div>
  );
}

/** one row: the medal or number, the face, the name (a crown by the
 *  leader), the Lv chip, the value in the big numerals */
function Row({ rank, row, face, mine, cols, lv, value, fit }) {
  const gone = !!(row && row.gone);
  const name = (row && (row.name || row.id || row.pid)) || say(SAY, 'leaderboard.unnamed');
  const bar = gone ? null : rowBar(rank, mine);
  const medal = medalOf(rank);
  const ring = mineRing(mine, rank);
  return (
    <div data-board-row={rank} data-lb-medal={medal || undefined} data-board-gone={gone ? '1' : undefined} data-board-mine={mine ? '1' : undefined}
      aria-label={gone ? say(SAY, 'leaderboard.deletedRow', { name }) : mine ? say(SAY, 'leaderboard.youRow', { name }) : undefined}
      style={{
        position: 'relative', display: 'grid', gridTemplateColumns: cols, columnGap: 3, alignItems: 'center',
        minHeight: fit.rowH, padding: '0 10px 0 2px', margin: `0 2px ${fit.gap}px`, borderRadius: 999,
        background: bar ? 'transparent' : mine ? COL.accentFill : 'rgba(11, 22, 27, 0.45)',
        border: bar ? 'none' : `1px solid ${COL.divider}`, boxSizing: 'border-box',
        outline: ring ? ring.outline : undefined, outlineOffset: ring ? ring.outlineOffset : undefined,
      }}>
      {bar ? <BarBack name={bar} /> : null}
      <RankMark rank={rank} gone={gone} w={30} />
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
        <BoardFace src={face} name={name} gone={gone} px={Math.min(26, fit.rowH - 2)} />
        {/* the whole name: one line where the row is a tight one, two where it has the room */}
        <span data-board-name="" style={{
          minWidth: 0, fontSize: fit.tight ? 12.5 : 13, fontWeight: 800, lineHeight: '14px', color: gone ? COL.muted : COL.text,
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: fit.rowH >= 30 ? 2 : 1, overflow: 'hidden', overflowWrap: 'anywhere', textShadow: SHADOW,
        }}>{name}</span>
        {rank === 1 && !gone ? <Crown /> : null}
      </span>
      <span />
      {lv ? <span style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}><LvPill lv={Math.floor(Number(row && row.lv) || 0)} gone={gone} small /></span> : null}
      <span data-lb-value="" style={{
        position: 'relative', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
        fontSize: fit.tight ? (rank <= 3 ? 14.5 : 14) : (rank <= 3 ? 16 : 15), fontWeight: 900, color: gone ? COL.muted : rank <= 3 ? GOLD_LIT : GOLD, textShadow: SHADOW,
      }}>{value}</span>
    </div>
  );
}

/** your row, pinned at the foot, framed in gold */
function You({ rank, row, lv, value, face, fit, slot, myName }) {
  if (slot) return createPortal(<YouLine rank={rank} row={row} lv={lv} value={value} face={face} fit={fit} myName={myName} />, slot);
  return <YouLine rank={rank} row={row} lv={lv} value={value} face={face} fit={fit} myName={myName} />;
}
function YouLine({ rank, row, lv, value, face, fit, myName }) {
  /* on its side your row shares the tabs' line: no name, no Lv (it is you) */
  const line = fit.oneRow;
  const name = (row && row.name) || myName || say(SAY, 'leaderboard.unnamed');
  const dash = '—';
  const lvN = Math.floor(Number(row && row.lv) || 0);
  return (
    <div data-lb-you={rank || 0} style={{
      flex: 'none', position: 'relative', display: 'flex', alignItems: 'center', gap: 6, height: line ? fit.tabH : fit.youH, margin: line ? 0 : `${fit.gap}px 2px 0`,
      padding: '0 12px 0 6px', boxSizing: 'border-box', borderRadius: 12, border: `2px solid ${GOLD_RIM}`,
      background: 'linear-gradient(180deg, rgba(216,170,88,.16), rgba(11,22,27,.85))', boxShadow: '0 0 8px rgba(216,170,88,.25)',
    }}>
      <BoardFace src={face} name={name} px={(line ? fit.tabH : fit.youH) - 8} />
      {line ? null : <span data-lb-you-name="" style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: fit.tight ? 12.5 : 13.5, fontWeight: 800, color: COL.text, textShadow: SHADOW }}>
        {name}<span style={{ color: COL.text2, fontWeight: 700 }}>{' · ' + say(SAY, 'leaderboard.youWord')}</span>
      </span>}
      {line ? null : <span aria-hidden="true" style={{ flex: 'none', width: 1, alignSelf: 'stretch', margin: '5px 0', background: 'rgba(216,170,88,.45)' }} />}
      <span data-lb-you-rank="" style={{ flex: 'none', fontSize: fit.tight ? 12.5 : 13.5, fontWeight: 900, color: GOLD, textShadow: SHADOW, whiteSpace: 'nowrap' }}>
        {say(SAY, 'leaderboard.youRank', { rank: rankMark(rank) })}
      </span>
      {lv && !line ? (
        <>
          <span aria-hidden="true" style={{ flex: 'none', width: 1, alignSelf: 'stretch', margin: '5px 0', background: 'rgba(216,170,88,.45)' }} />
          <LvPill lv={rank ? lvN : 0} text={rank && lvN > 0 ? undefined : say(SAY, 'leaderboard.lvHead') + ' ' + dash} small />
        </>
      ) : null}
      <span data-lb-you-value="" style={{ flex: 'none', minWidth: 34, textAlign: 'right', fontSize: fit.tight ? 14 : 15, fontWeight: 900, color: GOLD_LIT, textShadow: SHADOW, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {rank ? value : dash}
      </span>
    </div>
  );
}

/* the faces of the board's rows, and yours (your row's look, or your own) */
function useFaces(rows, me) {
  const mineLook = me.row && me.row.look ? null : ownLook();
  const all = mineLook ? rows.concat([{ look: mineLook }]) : rows;
  const faces = useBoardFaces(all);
  return [faces, mineLook ? faces[rows.length] : faces[me.rank - 1]];
}

/** a ranks board: the heads fixed, the rows scrolled, your row pinned */
function RankTable({ board, parts, fit, slot }) {
  const { rows, loading } = parts.useRows(board.id);
  const [hintOn, setHintOn] = useState(false);
  const meId = parts.me.id;
  const me = youRow(rows, meId);
  const [faces, myFace] = useFaces(rows, me);
  const lv = parts.hasLv(board);
  const cols = colsOf(lv, parts.valueW(board));
  const hint = parts.hintOf(board);
  return (
    <>
      {fit.headH ? <Head cols={cols} lv={lv} word={parts.headOf(board)} hint={hint} hintOn={hintOn} setHintOn={setHintOn} fit={fit} /> : null}
      {fit.headH && hint && hintOn ? (
        <div data-lb-power-hint="" role="note" style={{ flex: 'none', padding: '3px 10px', fontSize: 11.5, fontWeight: 700, color: COL.text, textAlign: 'right' }}>
          {say(SAY, 'leaderboard.powerHintLine', { hint })}
        </div>
      ) : null}
      <div data-lb-rows="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
        {rows.length === 0 ? <BoardEmpty text={parts.emptyOf(board, loading)} /> : rows.map((r, i) => (
          <Row key={r.id || i} rank={i + 1} row={r} face={faces[i]} mine={!!meId && r.id === meId} cols={cols} lv={lv} value={parts.valueOf(board, r)} fit={fit} />
        ))}
      </div>
      <You rank={me.rank} row={me.row} lv={lv} value={me.row ? parts.valueOf(board, me.row) : ''} face={myFace} fit={fit} slot={slot} myName={parts.me.name} />
    </>
  );
}

/** a records board (the spin, the flip, the fish): today's board in the
 *  scrolled part, your row pinned under it where its rows are the page's */
function RecordBoard({ board, parts, fit, slot }) {
  const got = parts.recordRows(board);
  const rows = got ? got.rows : [];
  const me = youRow(rows, parts.me.id, 'pid');
  /* the rows' faces are asked for once: the board below asks the same looks */
  const [, myFace] = useFaces(rows, me);
  return (
    <>
      <div data-lb-rows="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y', paddingTop: 2 }}>
        {parts.record(board)}
      </div>
      {got ? <You rank={me.rank} row={me.row} lv={false} value={me.row ? got.valueOf(me.row) : ''} face={myFace} fit={fit} slot={slot} myName={parts.me.name} /> : null}
    </>
  );
}

/** THE PAGE.  `boards` today's list's boards ({id, label, icon|art, ...});
 *  `want` the board to open on (the one last looked at, or the fish);
 *  `onBoard` told each board opened (LeaderboardPanel keeps the last);
 *  `parts` the board's numbers and records, LeaderboardPanel.jsx's own. */
export function RanksPage({ boards, want, onBoard, parts }) {
  const ids = boards.map((b) => b.id);
  const sig = ids.join(',');
  const [st, setSt] = useState(() => ranksStart(ids, want));
  const step = (ev) => setSt((s) => ranksStep(s, ev, ids));
  /* the worker's boards changed (a switch thrown): settle on what it keeps */
  useEffect(() => { step({ type: 'fit' }); }, [sig]);
  /* the weigh-in card's Records asks for the fish board with the page up */
  useEffect(() => { if (want && want !== st.board) step({ type: 'board', board: want }); }, [want]);
  useEffect(() => { if (st.board) onBoard(st.board); }, [st.board]);
  const [boxRef, , boxH] = useBoxSize();
  const fit = ranksFit(boxH);
  const short = fit.oneRow;
  /* on its side your row is drawn into the top line, beside the picker */
  const [slot, setSlot] = useState(null);
  const tabs = ranksTabs(ids);
  const cur = boards.find((b) => b.id === st.board) || boards[0];
  const inTab = (tabs.find((t) => t.id === st.tab) || { boards: [] }).boards.map((id) => boards.find((b) => b.id === id)).filter(Boolean);
  if (!cur) return <div ref={boxRef} data-lb-page="ranks" style={panelStyle}><BoardEmpty text={say(SAY, 'leaderboard.loading')} /></div>;
  const tabRow = (
    <div data-lb-tabs="" role="tablist" aria-label={say(SAY, 'leaderboard.tabsLabel')} style={{ flex: short ? '1 1 0' : 'none', minWidth: 0, display: 'flex', gap: 4, margin: short ? 0 : `3px 2px ${fit.gap}px` }}>
      {tabs.map((t) => <Tab key={t.id} id={t.id} on={t.id === st.tab} fit={fit} Icon={parts.Icon} onTap={() => step({ type: 'tab', tab: t.id })} />)}
    </div>
  );
  const picker = <Picker b={cur} Icon={parts.Icon} open={st.menu} fit={fit} onTap={() => step({ type: 'menu' })} />;
  return (
    <div ref={boxRef} data-lb-page="ranks" data-lb-open={cur.id} data-lb-tab-open={st.tab} data-lb-short={short ? '1' : undefined} style={{
      ...panelStyle, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 4px 3px',
      WebkitMaskImage: 'none', maskImage: 'none',
    }}>
      {short ? (
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, margin: `3px 2px ${fit.gap}px` }}>
          {tabRow}
          <div style={{ flex: '0 1 170px', minWidth: 110, display: 'flex' }}>{picker}</div>
          <span ref={setSlot} data-lb-you-slot="" style={{ flex: 'none', display: 'flex' }} />
        </div>
      ) : (
        <>
          {tabRow}
          <div data-lb-pickrow="" style={{ flex: 'none', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', gap: 6, height: fit.pickH, margin: `0 2px ${fit.gap}px` }}>
            <div style={{ minWidth: 0, display: 'flex' }}>{picker}</div>
            <Title small={fit.tight} />
            <div style={{ minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
              <span data-lb-span="" style={{
                minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', height: fit.pickH - 4, padding: '0 7px', borderRadius: 6, border: `1px solid ${COL.border}`,
                fontSize: 11, fontWeight: 700, fontStyle: 'italic', lineHeight: (fit.pickH - 6) + 'px', color: COL.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{say(SAY, 'leaderboard.spanAllTime')}</span>
            </div>
          </div>
        </>
      )}
      <div data-lb-board={cur.id} role="tabpanel" aria-label={cur.full || cur.label} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {cur.kind ? <RecordBoard key={cur.id} board={cur} parts={parts} fit={fit} slot={short ? slot : null} /> : <RankTable key={cur.id} board={cur} parts={parts} fit={fit} slot={short ? slot : null} />}
      </div>
      {st.menu ? <Menu boards={inTab} on={cur.id} Icon={parts.Icon} line={short} onPick={(id) => step({ type: 'board', board: id })} onClose={() => step({ type: 'close' })} /> : null}
    </div>
  );
}
