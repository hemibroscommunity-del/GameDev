/* ═══ v2.3.6695: FEATS (card UI2-feats, the build's step 6) ═══
 *
 * The owner, 2026-11-25: "Feats is the approved replacement for
 * Accomplishments."  The master specification 4.5: "AP (Achievement Points)
 * is the dominant headline of Feats, with a drill-down into its actual
 * sources."  2026-11-26: "Titles could live within Feats."
 *
 * The landing (the page id stays `achievements`, so every road in lands
 * here: Bro's Feats tile, the strip's AP, More's road, the world's title
 * chip): your AP LARGE, the kit's STAT (sunk, a large number), the worker's
 * total, a door to where it came from (StatTree.jsx ApTree) when the game
 * knows; under it four equal RAISED doors: Achievements ("n of 33"), Titles
 * (Character's ONE TitlesPage), Quest History, Lifetime Records (the ONE
 * Journey page).  No Discoveries door: the worker keeps none.
 *
 * FeatsPages draws the pages past the landing (BottomDashboard PANELS rows,
 * src/game/feats.js FEATS_PAGES), each reading its frame entry's `sel`
 * (dashNav.js keeps it on every entry, as the stat tree's layers read theirs).
 *
 * THE ROOM: 172 px upright at 390 x 844 (AP over the four, two by two);
 * sideways 63 px, one row, AP the first cell.  No scroll, no smaller text.
 * The rules: src/game/feats.js; the words: src/data/say/feats.js. */
import React from 'react';
import { frameTap } from '../dash/DashHeader.jsx';
import { useClock, useRoom, readPassport } from './CharacterPage.jsx';
import { MedalTiers, MedalGallery } from './MedalTiers.jsx';
import { MedalPage } from './MedalPage.jsx';
import { QuestHistory } from './QuestHistory.jsx';
import { ApTree } from './StatTree.jsx';
import { featsGo, featsTop } from './featsGo.js';
import { featsLanding, FEATS_PAGES, FEATS_AP_PAGES, tierOfPage } from '@/game/feats.js';
import { Ui2Tile, Ui2Stat, Ui2Facts, Ui2Fact, Ui2Loading, ui2RootClass } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/feats.js';
import { say } from '@/game/say.js';
import './feats.css';

const fmt = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US');

/* a door's word (literal keys: tools/guards/say.test) */
function doorLabel(id) {
  switch (id) {
    case 'achievements': return say(SAY, 'feats.achievements');
    case 'titles': return say(SAY, 'feats.titles');
    case 'quests': return say(SAY, 'feats.quests');
    default: return say(SAY, 'feats.records');
  }
}

/**
 * The landing.  S the game's state; who null (yours) or another player's entry ({ name, passport }).
 */
export function FeatsPage({ S, who }) {
  useClock(() => [S && S._achv ? S._achv.rev : -1, S && S._achv ? S._achv.ap : '-', S && S._achv && S._achv.known ? 1 : 0].join('|'), 500);
  const [ref, room] = useRoom();
  const self = who == null;
  const L = featsLanding(S, self ? null : who, self ? readPassport(S) : ((who && typeof who === 'object' && who.passport) || {}));
  const ap = L.ap;
  const openTree = self && !ap.loading && ap.known ? () => featsGo('page:' + FEATS_AP_PAGES[0], null, { path: [] }) : undefined;
  let head;
  if (ap.loading) {
    head = <div className="u2-stat" data-feats-ap="loading"><Ui2Loading rows={1} /></div>;
  } else if (!self && ap.total == null) {
    head = <Ui2Stat v={say(SAY, 'feats.apNotShared')} k={say(SAY, 'feats.ap')} data-feats-ap="" />;
  } else {
    head = (
      <Ui2Stat v={fmt(ap.total)} k={say(SAY, 'feats.ap')} data-feats-ap={ap.total} data-feats-ap-known={ap.known ? 1 : 0}
        aria-label={openTree ? say(SAY, 'feats.apAria', { v: fmt(ap.total) }) : undefined} onClick={openTree} />
    );
  }
  /* the parts do not add up (a row the test lever lit pays nothing): no split, and the honest line */
  const unknown = self && !ap.loading && !ap.known
    ? <span className="u2-feats-note" data-feats-ap-unknown="">{say(SAY, 'feats.apUnknown')}</span> : null;
  const doors = L.doors.map((d) => {
    if (!d.shared) {
      return (
        <Ui2Facts key={d.id} data-feats-door={d.id} data-feats-shared="0">
          <Ui2Fact k={doorLabel(d.id)} v={say(SAY, 'feats.notShared')} none />
        </Ui2Facts>
      );
    }
    const sub = d.id === 'achievements'
      ? (d.sub ? say(SAY, 'feats.achvSub', { n: d.sub.n, total: d.sub.total }) : null)
      : d.id === 'titles' ? (d.worn ? say(SAY, 'feats.wearing', { name: d.worn }) : say(SAY, 'feats.noTitle')) : null;
    return (
      <Ui2Tile key={d.id} size="compact" art={d.art || undefined} label={doorLabel(d.id)} sub={sub || undefined}
        data-feats-door={d.id} data-dest={d.id} {...frameTap(() => featsGo(d.opens, null))} />
    );
  });
  return (
    <div ref={ref} className={ui2RootClass() + ' u2-feats' + (room.short ? ' is-short' : '')} data-feats-page={self ? 'self' : 'other'}>
      <div className="u2-feats-ap">{head}{unknown}</div>
      <div className="u2-feats-grid" data-feats-doors={L.doors.length}>{doors}</div>
    </div>
  );
}

/**
 * The pages past the landing (BottomDashboard PANELS rows: feats.js FEATS_PAGES), each from its
 * frame entry: its id, its `sel` (a tier's gallery none, a medal its id, AP's tree its path) and
 * its `who`.  `S` the game's state, HANDED (dash/AchievementsPanel.jsx's FeatsPanels, a reader of it
 * already: grand plan 5.7, tools/guards/open-hand.test).
 */
export function FeatsPages({ S }) {
  const top = featsTop();
  const id = top ? String(top.id) : '';
  const who = top && top.who != null ? top.who : null;
  const kind = Object.prototype.hasOwnProperty.call(FEATS_PAGES, id) ? FEATS_PAGES[id] : null;
  if (kind === 'medals') return <MedalTiers S={S} who={who} />;
  if (kind === 'tier') return <MedalGallery S={S} tier={tierOfPage(id)} who={who} />;
  if (kind === 'medal') return <MedalPage S={S} id={top && typeof top.sel === 'string' ? top.sel : null} who={who} />;
  if (kind === 'ap') return <ApTree S={S} page={id} />;
  if (kind === 'quests') return <QuestHistory S={S} who={who} />;
  return <FeatsPage S={S} who={who} />;
}

export default FeatsPage;
