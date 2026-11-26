/* ═══ v2.3.6691: THE FRAME'S QUESTS PAGES AS DRAWN (card UI2-quests, the build's step 6) ═══
 * The drawing of the landing (QuestsLanding.jsx) and of a quest's page and
 * its Rewards (QuestPage.jsx), apart from their readers of the game, so node
 * renders them from what the rules give (tools/guards/quests-ui2.test.mjs:
 * what a player sees, and the dodges planted in this file's own lines).
 * Every choice of what is shown is src/game/questPages.js's (questLanding,
 * journeyToNow, questActions); this file draws what they give and nothing
 * else.  Light imports only: the kit, the words, the map pin and a reward's
 * tile (shared with today's pages, QuestPages.jsx). */
import React from 'react';
import { COL } from './common.js';
import { deskWords } from '@/game/deskWords.js';
import { coinArtFor } from '@/game/coinArt.js';
import { folkDisplayName } from '@/data/folkNames.js';
import { rewardTiles } from '@/game/questPages.js';
/* the kit's pieces from their own files (its index brings the item slot, which brings the renderer) */
import '@/ui/kit/ui2.css';
import { ui2RootClass } from '@/ui/kit/shine.js';
import { Ui2Empty } from '@/ui/kit/EmptyState.jsx';
import { Ui2Action, Ui2ActionRow } from '@/ui/kit/Action.jsx';
import { SAY } from '@/data/say/questPages.js';
import { SAY as SAY_J } from '@/data/say/questJournal.js';
import { SAY as SAY_Q } from '@/data/say/questsPanel.js';
import { say } from '@/game/say.js';
import './questsUi2.css';

/* v2.3.6691: moved here from QuestPages.jsx, which draws them too */
const ONE_LINE = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 };
/* the map pin (drawn: nothing to load), as the old page's WHERE card */
export const pin = (px) => (
  <svg width={px} height={px} viewBox="0 0 20 20" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
    <path d="M10 1.8a5.6 5.6 0 0 0-5.6 5.6c0 4.1 5.6 10.8 5.6 10.8s5.6-6.7 5.6-10.8A5.6 5.6 0 0 0 10 1.8Z" fill="#D8AA58" stroke="#172126" strokeWidth="1" />
    <circle cx="10" cy="7.4" r="2.1" fill="#172126" />
  </svg>
);
/* a reward as a tile: its picture over its name (gold, the points, an item) */
export const tileInner = (t, big) => {
  const px = big ? 24 : 18;
  let pic = null, word = '';
  if (t.kind === 'gold') { pic = <img src={coinArtFor(t.n)} alt="" draggable={false} style={{ width: px, height: px, objectFit: 'contain' }} />; word = say(SAY_J, 'questJournal.gold', { gold: t.n }); }
  else if (t.kind === 'ap') { pic = <span aria-hidden="true" style={{ fontSize: px - 2, lineHeight: `${px}px`, color: COL.accent }}>★</span>; word = say(SAY, 'questPages.ap', { ap: t.n }); }
  else if (t.kind === 'xp') { pic = <span aria-hidden="true" style={{ fontSize: 15, fontWeight: 800, lineHeight: `${px}px`, color: '#9DB8FA' }}>XP</span>; word = say(SAY_J, 'questJournal.xp', { xp: t.n }); }
  else { pic = t.icon ? <img src={t.icon} alt="" draggable={false} style={{ width: px, height: px, objectFit: 'contain', imageRendering: 'pixelated' }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : null; word = t.label; }
  return (
    <span key={t.kind + (t.label || t.n)} data-quest-tile={t.kind} title={word} style={{
      flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
      height: big ? 46 : 34, padding: '0 3px', boxSizing: 'border-box', borderRadius: 8, background: COL.wellSoft, border: `1px solid ${COL.tileBor}`,
    }}>
      <span style={{ height: px, display: 'flex', alignItems: 'center' }}>{pic}</span>
      <span style={{ ...ONE_LINE, maxWidth: '100%', fontSize: 13, fontWeight: 700, lineHeight: '15px', color: COL.text }}>{word}</span>
    </span>
  );
};

/* the words of a door, each key written out (say.test rule 7) */
export function doorWord(d) {
  if (!d) return '';
  if (d.id === 'daily') return say(SAY, 'questPages.doorDaily');
  if (d.id === 'done') return say(SAY, 'questPages.doorDone', { n: d.n || 0 });
  if (d.id === 'offers') return say(SAY, 'questPages.doorOffers', { n: d.n || 0 });
  return '';
}

/** A quest's row: the giver's face, the name, its count, ready, the star. */
export function QuestRow({ r, face, onOpen, hooks }) {
  return (
    <button type="button" className="u2-raised u2-ql-row" {...hooks}
      aria-label={say(SAY, 'questPages.rowAria', { title: r.title })} onClick={() => onOpen(r)}>
      {face ? <img className="u2-ql-face" data-journal-face={r.npc || ''} src={face} alt="" draggable={false} /> : <span className="u2-ql-face is-none" aria-hidden="true" />}
      <span className="u2-ql-words">
        <span className="u2-ql-title" data-quest-row-title="">{r.title}</span>
        {r.sub ? <span className="u2-ql-sub">{r.sub}</span> : null}
      </span>
      {r.count ? <span className={'u2-ql-count' + (r.count.have >= r.count.n ? ' is-full' : '')} data-quest-row-count={r.count.have + '/' + r.count.n}>{r.count.have + '/' + r.count.n}</span> : null}
      {r.ready ? <span className="u2-ql-ready" data-quest-row-ready-mark="">{'✓ ' + say(SAY, 'questPages.ready')}</span> : null}
      {r.tracked ? <span className="u2-ql-star" data-quest-row-star="" aria-hidden="true">★</span> : null}
      <span className="u2-chev" aria-hidden="true">›</span>
    </button>
  );
}

/**
 * The landing as drawn (no reading of the game: node renders it in
 * tools/guards/quests-ui2.test.mjs).
 * land    questLanding's answer
 * faceOf  (npc) => the giver's picture or null
 * onRow   (row) => open the quest's page;  onDoor (door) => open the door's page
 */
export function QuestsLandingView({ land, short, faceOf, onRow, onDoor, boxRef }) {
  const face = faceOf || (() => null);
  const doors = land.doors.length ? (
    <div className="u2-ql-doors" data-quest-doors={land.doors.map((d) => d.id).join(' ')}>
      {land.doors.map((d) => (
        <button key={d.id} type="button" className="u2-raised u2-ql-door" data-quest-door={d.id} data-quest-nav={d.id}
          onClick={() => onDoor(d)}>
          <span className="u2-ql-door-word">{doorWord(d)}</span>
          <span className="u2-chev" aria-hidden="true">›</span>
        </button>
      ))}
    </div>
  ) : null;
  let body;
  if (land.kind === 'loading') body = <div className="u2-ql-list is-loading"><Ui2Empty kind="loading" rows={2} /></div>;
  else if (land.kind === 'empty') body = <div className="u2-ql-list is-empty"><Ui2Empty kind="absent" title={say(SAY_Q, 'questsPanel.none')} /></div>;
  else {
    body = (
      <div className="u2-ql-list" role="list" aria-label={say(SAY, 'questPages.landAria')} data-quest-rows={land.rows.length}>
        {land.rows.map((r) => (
          <QuestRow key={r.id} r={r} face={face(r.npc)} onOpen={onRow}
            hooks={{ role: 'listitem', 'data-quest-row': r.id, 'data-quest-row-ready': r.ready ? '1' : '0', 'data-quest-row-track': r.tracked ? 'on' : 'off' }} />
        ))}
      </div>
    );
  }
  return (
    <div ref={boxRef} className={ui2RootClass() + ' u2-ql' + (short ? ' is-short' : '')} data-quests-ui2="landing" data-quests-kind={land.kind}>
      {body}
      {doors}
    </div>
  );
}

/* a step behind you: a tick, its words, what the giver handed over */
export const Step = ({ s }) => (
  <div className="u2-qp-step" data-step-state="done" data-step-kind={s.kind}>
    <span className="u2-qp-tick" aria-hidden="true">✓</span>
    {/* the journal's words end in their own tick ("Talked to Mayor Bro ✓"): the row's tick is enough */}
    <span className="u2-qp-step-text" data-step-text="" title={s.sub || undefined}>{deskWords(String(s.text || '').replace(/\s*\u2713\s*$/, ''))}</span>
    {s.items && s.items.length ? s.items.map((it, k) => (it && it.icon ? <img key={k} className="u2-qp-step-item" src={it.icon} alt={it.label || ''} title={it.label || ''} draggable={false} /> : null)) : null}
  </div>
);

/**
 * The page as drawn (no reading of the game: node renders it in
 * tools/guards/quests-ui2.test.mjs).
 * page     the journal's page (questJournal.js journalPage)
 * j        journeyToNow(page, desc);  acts  questActions(page, tracked)
 * face     the giver's picture;  pic  the thing's picture (NOW)
 * note     what Track does, for a moment after it is turned on (or null)
 * short    a band on its side (63 px): NOW and its actions beside the steps
 * tight    an upright band shorter than about 180 px (375 x 667): what to do on one line
 */
export function QuestPageView({ page, j, acts, face, pic, short, tight, note, onTrack, onMap, onRewards, boxRef, stepsRef }) {
  if (!page) {
    return (
      <div ref={boxRef} className={ui2RootClass() + ' u2-qp'} data-quest-ui2-page="" data-quest-ui2-status="gone">
        <Ui2Empty kind="absent" title={say(SAY, 'questPages.gone')} />
      </div>
    );
  }
  const giver = folkDisplayName(page.npc) || '';
  const track = acts.actions.find((a) => a.id === 'track');
  const map = acts.actions.find((a) => a.id === 'map');
  const rewards = acts.doors.find((d) => d.id === 'rewards');
  const now = j.now;
  const identity = (
    <div className="u2-qp-id" data-quest-ui2-id="">
      {face ? <img className="u2-qp-face" data-journal-face={page.npc || ''} src={face} alt={giver} draggable={false} /> : null}
      {/* one line: the name, then its state and giver (the band has no room for two) */}
      <span className="u2-qp-title" data-journal-title="">{page.title}</span>
      <span className="u2-qp-state">
        <span className={'u2-qp-status is-' + page.status} data-journal-status-word="">{page.statusLabel}</span>
        {giver ? <span className="u2-qp-giver">{' · ' + giver}</span> : null}
      </span>
    </div>
  );
  const steps = j.done.length ? (
    <div ref={stepsRef} className="u2-group u2-qp-steps" data-quest-steps={page.id} data-quest-history={j.history ? '1' : '0'}>
      {j.done.map((s, i) => <Step key={i} s={s} />)}
    </div>
  ) : null;
  const nowBox = now ? (
    <div className="u2-group u2-qp-now" data-journal="now" data-quest-now={now.kind}>
      {pic ? <img className="u2-qp-now-pic" data-quest-now-pic={pic.key} src={pic.src} alt="" draggable={false} /> : null}
      <span className="u2-qp-now-words">
        <span className="u2-qp-now-top">
          <span className="u2-qp-now-k">{say(SAY, 'questPages.now')}</span>
          <span className="u2-qp-now-text" data-journal-now="" title={deskWords(now.text)}>{deskWords(now.text)}</span>
        </span>
        {/* the place, then the bar and the count, on one line */}
        {now.where || now.count ? (
          <span className="u2-qp-now-low">
            {now.where ? <span className="u2-qp-where" data-journal-where="">{pin(13)}<span className="u2-qp-where-text">{deskWords(now.where)}</span></span> : <span className="u2-qp-where" />}
            {now.count ? <span className="u2-track u2-qp-bar" aria-hidden="true"><span className="u2-fill" style={{ width: (Math.max(0, Math.min(1, now.count.have / now.count.n)) * 100).toFixed(1) + '%' }} /></span> : null}
            {now.count ? <span className={'u2-qp-now-count' + (now.count.have >= now.count.n ? ' is-full' : '')} data-journal-count={now.count.have + '/' + now.count.n} title={now.count.text || undefined}>{now.count.have + '/' + now.count.n}</span> : null}
          </span>
        ) : null}
      </span>
    </div>
  ) : null;
  /* what Track does, said for a moment once it is turned on (v2.3.3522's note), in the quiet line's place */
  const more = note ? <div className="u2-qp-more is-note" data-quest-track-note="">{note}</div>
    : j.continues ? <div className="u2-qp-more" data-quest-continues="">{say(SAY, 'questPages.continues')}</div>
    : j.next ? <div className="u2-qp-more is-next" data-quest-next-line="">{deskWords(j.next)}</div> : null;
  const actions = track || map || rewards ? (
    <div className="u2-qp-acts" data-quest-acts={acts.actions.map((a) => a.id).concat(acts.doors.map((d) => d.id)).join(' ')}>
      <Ui2ActionRow>
        {track ? (
          <Ui2Action c="gold" label={track.pressed ? '★ ' + say(SAY, 'questPages.tracked') : '☆ ' + say(SAY, 'questPages.track')}
            aria-pressed={track.pressed} data-quest-track={track.pressed ? 'on' : 'off'} onClick={onTrack} />
        ) : null}
        {map ? <Ui2Action c="blue" label={short ? say(SAY, 'questPages.showOnMapShort') : say(SAY, 'questPages.showOnMap')} aria-label={say(SAY, 'questPages.showOnMap')} data-journal-map={page.id} onClick={onMap} /> : null}
        {rewards ? (
          <button type="button" className="u2-raised u2-qp-door" data-quest-door="rewards" onClick={onRewards}>
            <span>{say(SAY, 'questPages.rewardsDoor')}</span><span className="u2-chev" aria-hidden="true">›</span>
          </button>
        ) : null}
      </Ui2ActionRow>
    </div>
  ) : null;
  const hooks = { 'data-quest-ui2-page': page.id, 'data-quest-ui2-status': page.status, 'data-journal-status': page.status };
  if (short) {
    return (
      <div ref={boxRef} className={ui2RootClass() + ' u2-qp is-short'} {...hooks}>
        <div className="u2-qp-side">{identity}{steps}{more}</div>
        <div className="u2-qp-main">{nowBox}{actions}</div>
      </div>
    );
  }
  return (
    <div ref={boxRef} className={ui2RootClass() + ' u2-qp' + (tight ? ' is-tight' : '')} {...hooks}>
      {identity}
      {steps}
      {nowBox}
      {more}
      {actions}
    </div>
  );
}

/** Rewards as drawn: the completion rewards as the game's tiles. */
export function QuestRewardsView({ page, boxRef }) {
  const tiles = page ? rewardTiles(page.reward) : [];
  return (
    <div ref={boxRef} className={ui2RootClass() + ' u2-qp u2-qr'} data-quest-ui2-rewards={page ? page.id : ''}>
      {page ? <div className="u2-qr-title" data-journal-title="">{page.title}</div> : null}
      {tiles.length ? (
        <div className="u2-group u2-qr-tiles" data-journal="reward-all" title={page.reward && page.reward.note ? page.reward.note : undefined}>
          {tiles.map((t) => tileInner(t, true))}
        </div>
      ) : <Ui2Empty kind="absent" title={say(SAY, page ? 'questPages.noRewards' : 'questPages.gone')} />}
    </div>
  );
}
