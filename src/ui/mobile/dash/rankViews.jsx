/* ═══ v2.3.6692: RANKS' DRAWING UNDER THE NEW DASHBOARD (card UI2-ranks, the build's step 6) ═══
 *
 * The owner's master specification, 2026-11-25, part 7: "Specific leaderboard
 * is a simple aligned standings list: Rank | Player (portrait/name) | metric
 * for this leaderboard ... Consistent layout across leaderboards; subdued
 * rows, consistent spacing, avoid competing gradients and outlines. Prestige
 * accents should not obscure legibility."  And 2026-11-26 (UI_FEEDBACK part
 * 4): "Reduce the metallic gradients across the first three rows while
 * retaining the gold, silver and bronze medals. Highlight the player's own row
 * regardless of rank."
 *
 * Hook-free (node draws it: tools/guards/ranks-ui2.test.mjs, through
 * tools/guards/lib/jsxText.mjs); the pages (RanksLanding.jsx,
 * RankStandings.jsx) read the game and hand it over.  The three weights (card
 * UI3, the kit): a tile (a group, a board, Points placed, a choice) and a
 * player's row are DOORS, the kit's raised face; the value inside a row is a
 * fact, flat; nothing here is a stat.  Rows 1 to 3 are the same surface as
 * every other row: the place is told by the game's own medal ONLY (handed in
 * as `Medal`), never a bar, a tint, a metal edge or a glow.  Your own row
 * wears ONE mark wherever it stands (the kit's brass edge, `is-mine`) and the
 * word "You", never colour alone.  The words arrive as text (rankWords.js). */
import React from 'react';
import '@/ui/kit/ui2.css';
import { ui2RootClass } from '@/ui/kit/shine.js';   /* the pieces by their files: node draws this (the kit's index reaches the page) */
import { Ui2Tile } from '@/ui/kit/Tile.jsx';
import { Ui2Loading } from '@/ui/kit/Loading.jsx';
import './ranksUi2.css';

/** A row of doors: the landing's three groups, a group's boards, the stat
 *  boards.  `tiles` [{ id, label, art }]; `kind` 'landing' | 'group' |
 *  'points'; `cols` how many across (the page's shape). */
export function RankTilesView({ kind, group, tiles, cols, short, onTile }) {
  return (
    <div className={ui2RootClass() + ' u2-rk-tiles' + (short ? ' is-short' : '')} data-ranks-ui2={kind} data-rank-group={group || undefined}
      style={{ gridTemplateColumns: 'repeat(' + Math.max(1, cols | 0) + ', minmax(0, 1fr))' }}>
      {tiles.map((t) => (
        <Ui2Tile key={t.id} size={short ? 'compact' : 'primary'} art={t.art} label={t.label} className="u2-rk-tile"
          data-rank-tile={t.id} onClick={() => onTile(t)} />
      ))}
    </div>
  );
}

/** One row of a board.  `r` { rank, name, face, value, mine, gone, door, key, tag }: `tag` a record's own
 *  word (the fish's albino or large), { id, word }. */
function RankRowView({ r, words, Medal, Face, onRow, i }) {
  const inner = (
    <>
      <span className="u2-rk-place">{Medal ? <Medal rank={r.rank} gone={r.gone} w={32} /> : r.rank}</span>
      {/* a deleted character's face without the bust's own 9 px DELETED stamp (under the 11 px floor): the row says "Deleted character" */}
      <span className="u2-rk-face">{Face ? <Face src={r.face} name={r.name} gone={false} px={28} /> : null}</span>
      <span className="u2-rk-who">
        <span className="u2-rk-name">{r.name}</span>
        {r.mine ? <span className="u2-rk-you" data-rank-you="">{words.you}</span> : null}
        {r.tag ? <span className="u2-rk-tag" data-rank-tag={r.tag.id}>{r.tag.word}</span> : null}
        {r.gone ? <span className="u2-rk-gone">{words.deleted}</span> : null}
      </span>
      <span className="u2-fact-v u2-rk-v" data-rank-v="">{r.value}</span>
    </>
  );
  const cls = 'u2-rk-row' + (r.mine ? ' is-mine' : '');
  const marks = { 'data-rank-row': r.rank, 'data-rank-medal': r.rank <= 3 ? r.rank : undefined, 'data-rank-mine': r.mine ? '1' : undefined, 'data-rank-gone': r.gone ? '1' : undefined };
  if (!r.door) return <div className={cls + ' is-flat'} aria-label={r.aria} {...marks}>{inner}</div>;
  return (
    <button type="button" className={'u2-raised ' + cls} aria-label={r.aria} {...marks} onClick={() => onRow(i)}>{inner}</button>
  );
}

/** A board's standings.  `heads` { rank, player, metric }; `rows` the rows as
 *  drawn; `pinned` your row's copy (only while the real one is out of view:
 *  ranksPage.js youPinned) or null; `notRanked` you are not on this board (a
 *  quiet line at the foot); `loading` the kit's placeholder (never "nobody"
 *  before the answer); `empty` the words for a board with nobody on it;
 *  `choice` the board's own choice (the spin's sides, the fish's kinds), in
 *  its top zone; `listRef` the scroller's ref, `zoneRef` its zone's (the
 *  list's kept size, from its ResizeObserver); `pitch` a row's height with
 *  its gap (the rule's, so the pinned copy lies exactly over the list's foot). */
export function StandingsView({ board, heads, rows, pinned, notRanked, loading, empty, choice, words, Medal, Face, onRow, onPinned, listRef, zoneRef, pitch, short }) {
  const pin = pinned ? (
    <div className="u2-rk-pin" data-rank-pinned="" style={{ height: pitch }}>
      <RankRowView r={pinned} words={words} Medal={Medal} Face={Face} onRow={onPinned} i={-1} />
    </div>
  ) : null;
  return (
    <div className={ui2RootClass() + ' u2-rk-board' + (short ? ' is-short' : '')} data-rank-board={board}>
      {choice ? <div className="u2-rk-choice" data-rank-choice="">{choice}</div> : null}
      <div className="u2-rk-heads" data-rank-heads="" aria-hidden="true">
        <span className="u2-rk-place">{heads.rank}</span>
        <span className="u2-rk-face" />
        <span className="u2-rk-who">{heads.player}</span>
        <span className="u2-rk-v" data-rank-metric="">{heads.metric}</span>
      </div>
      <div className="u2-rk-zone" ref={zoneRef}>
        {loading ? (
          <div className="u2-rk-wait" data-rank-loading=""><Ui2Loading rows={3} /></div>
        ) : rows.length === 0 ? (
          <div className="u2-rk-empty" data-rank-empty="">{empty}</div>
        ) : (
          <div className="u2-rk-list" ref={listRef} data-rank-list="" style={{ paddingBottom: pinned ? pitch : 0 }}>
            {rows.map((r, i) => <RankRowView key={r.key || i} r={r} words={words} Medal={Medal} Face={Face} onRow={onRow} i={i} />)}
          </div>
        )}
        {pin}
      </div>
      {notRanked && !loading ? <div className="u2-rk-foot" data-rank-unranked="">{words.notRanked}</div> : null}
    </div>
  );
}

/** Another player's Character page, read-only (card UI2-ranks reading 5):
 *  `P` ranksPage.js passportFromRow's readings, `face` their bust (or null),
 *  `whose` the words naming whose page it is, `word` a fact key as words.
 *  Every line a fact; nothing to press (no door whose page reads only your
 *  state: the weapons, Titles, Journey are step 9's). */
export function CharacterOtherView({ P, face, Face, whose, word, combatWord, short }) {
  const facts = P.facts.map((f) => (
    <div key={f.id} className="u2-fact" data-char-fact={f.id}>
      <span className="u2-fact-k">{f.label || word(f.k)}</span>
      <span className="u2-fact-end"><span className={'u2-fact-v' + (f.none ? ' is-none' : '')} data-char-v={f.id}>{f.none ? word(P.notShared) : f.v}</span></span>
    </div>
  ));
  return (
    <div className={ui2RootClass() + ' u2-rk-other' + (short ? ' is-short' : '')} data-char-page="other" data-char-other={P.id}>
      <div className="u2-rk-other-id">
        <span className="u2-rk-other-face" data-char-portrait="">{Face ? <Face src={face} name={P.name} gone={P.gone} px={short ? 40 : 52} /> : null}</span>
        <span className="u2-rk-other-words">
          <span className="u2-rk-other-name" data-char-name="">{P.name}</span>
          <span className="u2-rk-other-whose" data-bro-whose="">{whose}</span>
          <span className="u2-rk-other-lv" data-char-combat={P.combat == null ? '' : P.combat}>{combatWord}</span>
        </span>
      </div>
      <div className="u2-facts u2-rk-other-facts">{facts}</div>
    </div>
  );
}
