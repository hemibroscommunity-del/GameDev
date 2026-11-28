/* ═══ v2.3.6868: WORLD · FEATS IN THE NEW PANEL -- THE AP LINE, MEDALS | TITLES | RECORDS, A MEDAL'S PAGE (card MN step 9) ═══
 *
 * The owner's Feats (docs/design/menus3/SPEC.md: medals by tier and AP, the
 * AP's breakdown on its header line, the equipped title, the lifetime
 * records; the wireframe v4.4: the AP bar with Ranks, a rail Medals | Titles
 * | Records over the rows, Equip on a title's row).  The rules are node's
 * (src/game/menus3Feats.js, reading today's Feats' own readers,
 * src/game/feats.js); the history and the one Back are the panel's
 * (menus3Wire.js, src/game/menus3Nav.js).
 *
 * WHAT IT HOLDS (everything today's Feats lets a player read or do):
 *   - the AP line: the worker's total, its split where the parts add up, how
 *     many medals of how many; a press opens where the AP came from (today's
 *     AP tree, its layers on one page: by tier, then the rest); Ranks opens
 *     today's leaderboards (People · Ranks is not rebuilt yet) and their
 *     Back brings the panel back (menus3Away);
 *   - Medals: the four tiers (the game's own: Common, Rare, Arena,
 *     Super-rare), each its count and AP, every medal a row (Earned, its
 *     short progress, or Not yet: a word and a drawn mark, never colour
 *     alone); a row opens the medal's page (its picture, tier, AP, the day it
 *     was earned, how, so far) with Equip on an earned one;
 *   - Titles: the one you wear, every earned title with Equip (Remove on the
 *     worn one), the family's next and locked rungs as words -- today's
 *     request (`achv_title`, sendAchvTitle, the action door), every button
 *     held while an ask is out;
 *   - Records: the counters the game keeps, the accuracy of your three
 *     weapons (today's Journey page's, asked as it asks: `acc_request` as the
 *     page opens and every 15 s), your record on Hemi when there is one, and
 *     the quests you finished (today's Quest History door: World · Quests'
 *     own Done rail).
 *
 * NO ART LOADS BECAUSE IT OPENED: a medal on a row is DRAWN (an SVG ring in
 * its tier's colour, filled when earned); only a medal's own page shows its
 * picture, one file, as today's medal page does.  No claim and no dot: the
 * game has no feat reward to claim (src/game/menus3Feats.js). */
import React, { useEffect } from 'react';
import { useClock } from '@/ui/mobile/sheet/CharacterPage.jsx';
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';
import { achvLive, sendAchvTitle, achvTitleWaiting } from '@/game/achievements.js';
import { featsMedal, featsWord } from '@/game/feats.js';
import { questJournalList, journalCtx } from '@/ui/mobile/sheet/questJournalModel.js';
import { ACC_SLOTS, ACC_NAMES, accLive, accPct, askAccuracy, subscribeAccuracy } from '@/game/accuracy.js';
import { MENUS3_FEATS_RAIL, featsRailId, featsHead, featsMedalGroups, featsTitleRows, titleButton, medalButton, featsRecords } from '@/game/menus3Feats.js';
import { Ui2Empty } from '@/ui/kit/EmptyState.jsx';
import { Ui2Facts, Ui2Fact } from '@/ui/kit/Facts.jsx';
import { menus3Bus, menus3Away } from './menus3Wire.js';
import { SAY } from '@/data/say/menus3Feats.js';
import { SAY as SAY_F } from '@/data/say/feats.js';
import { SAY as SAY_J } from '@/data/say/journey.js';
import { say } from '@/game/say.js';

const fmt = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US');
const rev = (S) => (S && S._achv ? [S._achv.rev, S._achv.known ? 1 : 0, S._achv.ap, S._achv.t || '', S._achv.titleAsk ? 1 : 0].join(':') : '-');

/* ── drawn marks (CLAUDE.md: never a text glyph) ── */
function MedalMark({ ring, got }) {
  const c = ring && ring !== 'prismatic' ? ring : '#E4BA68';
  return (
    <svg className="m3f-mark" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 2 L11 9 M16 2 L13 9" stroke={c} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity={got ? 1 : 0.5} />
      <circle cx="12" cy="15" r="6.5" stroke={c} strokeWidth="2.2" fill={got ? c : 'none'} strokeDasharray={got ? undefined : '3 2.4'} opacity={got ? 1 : 0.6} />
      {got ? <path d="M9.2 15.2 L11.2 17.2 L14.9 13.2" stroke="#1b2a36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
    </svg>
  );
}
function LockMark() {
  return (
    <svg className="m3f-lock" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" fill="currentColor" />
      <path d="M4.5 6 V4.5 a2.5 2.5 0 0 1 5 0 V6" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  );
}
function Chev() {
  return (
    <svg className="m3f-chev" width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
      <path d="M3 2 L8 7 L3 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/* a rail's words (literal keys: tools/guards/say.test) */
function railWord(id, head) {
  if (id === 'titles') return say(SAY, 'menus3Feats.railTitles');
  if (id === 'records') return say(SAY, 'menus3Feats.railRecords');
  return head.earned != null ? say(SAY, 'menus3Feats.railMedals', { n: head.earned, of: head.of }) : say(SAY, 'menus3Feats.railMedalsShort');
}

/* ── the AP line ── */
function ApLine({ head }) {
  const openAp = head.kind === 'split' || head.kind === 'total' ? () => menus3Bus.push('ap', null) : undefined;
  const sub = head.kind === 'split' ? say(SAY, 'menus3Feats.apSplit', { achv: fmt(head.achv), rest: fmt(head.rest) })
    : head.kind === 'total' ? say(SAY, 'menus3Feats.apTotal') : '';
  const count = head.earned != null ? say(SAY, 'menus3Feats.apEarned', { n: head.earned, of: head.of }) : '';
  const ranks = () => menus3Away(() => dashboardPanelBus.open('leaderboard'));
  return (
    <div className="m3f-ap" data-m3f-ap={head.kind} data-m3f-ap-total={head.total == null ? '' : head.total}>
      {head.kind === 'loading' ? <div className="m3f-ap-main"><Ui2Empty kind="loading" rows={1} /></div> : (
        <button type="button" className="u2-raised u2-ctl m3f-ap-main" data-m3f-ap-open="" aria-label={say(SAY, 'menus3Feats.apOpen')} onClick={openAp}>
          <span className="m3f-ap-words">
            <span className="m3f-ap-v">{say(SAY, 'menus3Feats.ap', { n: fmt(head.total) })}</span>
            {count ? <span className="m3f-ap-sub" data-m3f-ap-count={head.earned}>{count}</span> : null}
            {sub ? <span className="m3f-ap-sub" data-m3f-ap-split={head.kind}>{sub}</span> : null}
          </span>
          <Chev />
        </button>
      )}
      <button type="button" className="u2-raised u2-ctl m3f-ranks" data-m3f-ranks="" aria-label={say(SAY, 'menus3Feats.ranksAria')} onClick={ranks}>
        {say(SAY, 'menus3Feats.ranks')}<Chev />
      </button>
    </div>
  );
}

/* ── Medals ── */
function Medals({ S, rail }) {
  const groups = featsMedalGroups(S);
  if (groups.some((g) => g.n == null)) return <Ui2Empty kind="loading" rows={3} />;
  const open = (id) => menus3Bus.push('medal', id, { rail });
  return (
    <div className="m3f-list" data-m3f-medals={groups.reduce((n, g) => n + g.rows.length, 0)}>
      {groups.map((g) => (
        <div key={g.tier} className="m3f-group" data-m3f-tier={g.tier} data-m3f-tier-n={g.n}>
          <span className="m3-counters-head">{say(SAY, 'menus3Feats.tierLine', { tier: featsWord(g.tier), n: g.n, of: g.of, pts: fmt(g.pts), max: fmt(g.max) })}</span>
          {g.rows.map((r) => {
            const state = r.got ? say(SAY, 'menus3Feats.earned') : r.progress || say(SAY, 'menus3Feats.notYet');
            return (
              <button key={r.id} type="button" className="u2-raised u2-ctl m3f-row" data-m3f-medal={r.id} data-m3f-got={r.got ? 1 : 0}
                aria-label={say(SAY, 'menus3Feats.medalAria', { name: r.name, state })} onClick={() => open(r.id)}>
                <MedalMark ring={g.ring} got={r.got} />
                <span className="m3-row-name">{r.name}</span>
                <span className={'m3f-state' + (r.got ? ' is-good' : r.progress ? '' : ' is-muted')}>{state}</span>
                <Chev />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── Titles: the one request, every button held while it is out ── */
function TitleAct({ S, b }) {
  if (!b) return null;
  const word = b.held ? say(SAY, 'menus3Feats.saving') : b.kind === 'remove' ? say(SAY, 'menus3Feats.remove') : say(SAY, 'menus3Feats.equip');
  return (
    <button type="button" className={'u2-raised u2-ctl m3f-act' + (b.kind === 'equip' ? ' is-gold' : '')} disabled={b.held}
      data-m3f-title-act={b.kind} data-m3f-title-held={b.held ? 1 : 0} onClick={() => { if (!b.held) sendAchvTitle(S, b.id); menus3Bus.bump(); }}>
      {word}
    </button>
  );
}
function Titles({ S }) {
  const rows = featsTitleRows(S);
  const a = S && S._achv;
  if (!a || !a.known) return <Ui2Empty kind="loading" rows={2} />;
  const ask = achvTitleWaiting(S);
  const worn = rows.find((r) => r.worn);
  return (
    <div className="m3f-list" data-m3f-titles={rows.length}>
      <div className="m3-line" data-m3f-worn={worn ? worn.id : ''}>{worn ? say(SAY, 'menus3Feats.yourTitle', { name: worn.name }) : say(SAY, 'menus3Feats.noTitle')}</div>
      {!rows.length ? <Ui2Empty kind="absent" title={say(SAY, 'menus3Feats.noTitles')} /> : rows.map((r) => (
        <div key={r.id} className={'m3f-trow is-' + r.state} data-m3f-title={r.id} data-m3f-title-state={r.state} data-m3f-title-worn={r.worn ? 1 : 0}>
          <span className="m3f-twords">
            <span className="m3-row-name">{r.name}</span>
            <span className="m3f-tsub">
              {r.state === 'locked' ? <LockMark /> : null}
              {r.worn ? say(SAY, 'menus3Feats.wearing') : r.state === 'next' ? say(SAY, 'menus3Feats.next') + ' · ' + r.clue
                : r.state === 'locked' ? say(SAY, 'menus3Feats.locked') + ' · ' + r.clue : r.clue}
            </span>
          </span>
          <TitleAct S={S} b={titleButton(r, ask)} />
        </div>
      ))}
    </div>
  );
}

/* ── Records ── */
function recordWord(k) {
  switch (k) {
    case 'journey.kills': return say(SAY_J, 'journey.kills');
    case 'journey.deaths': return say(SAY_J, 'journey.deaths');
    case 'journey.lifetimeGold': return say(SAY_J, 'journey.lifetimeGold');
    default: return say(SAY_J, 'journey.lifetimeXp');
  }
}
function Records({ R, S }) {
  const accOn = accLive(S);
  /* the accuracy, asked as today's Journey page asks: as it opens, and every 15 s it stays */
  useEffect(() => {
    if (!accOn) return undefined;
    askAccuracy(S);
    const id = setInterval(() => askAccuracy(S), 15000);
    const un = subscribeAccuracy(() => menus3Bus.bump());
    return () => { clearInterval(id); un(); };
  }, [accOn]);
  const acc = accOn && S && S._accState && !S._accState.off ? S._accState.w : null;
  const rows = featsRecords(R);
  let done = 0;
  try { done = questJournalList(S, journalCtx(S)).done.length; } catch (e) { done = 0; }
  const toDone = () => { menus3Bus.section('quests'); menus3Bus.keep({ rail: 'done', scroll: 0 }); menus3Bus.bump(); };
  const chain = R && R._chainScore && R._chainScore.explorer ? R._chainScore : null;
  return (
    <div className="m3f-list" data-m3f-records={rows.length}>
      {rows.map((r) => (
        <div key={r.id} className="m3f-rec" data-m3f-record={r.id}>
          <span className="m3-row-name">{recordWord(r.k)}</span>
          <b className={'m3f-rec-v' + (r.id === 'gold' ? ' is-gold' : '')}>{String(r.v)}</b>
        </div>
      ))}
      {acc ? (
        <>
          <span className="m3-counters-head">{say(SAY_J, 'journey.accuracy')}</span>
          {ACC_SLOTS.map((slot) => {
            const x = acc[slot];
            return (
              <div key={slot} className="m3f-rec" data-m3f-acc={slot}>
                <span className="m3-row-name">{ACC_NAMES[slot]}</span>
                <span className="m3f-tsub">{x.s > 0 ? say(SAY_J, 'journey.shots', { n: x.s, count: x.s.toLocaleString() }) : say(SAY_J, 'journey.noShots')}</span>
                <b className="m3f-rec-v">{accPct(x.s, x.h)}</b>
              </div>
            );
          })}
          <div className="m3-line">{say(SAY_J, 'journey.accNote')}</div>
        </>
      ) : null}
      {chain ? (
        <a className="u2-raised u2-ctl m3f-row" href={chain.explorer} target="_blank" rel="noopener noreferrer" data-m3f-chain="">
          <span className="m3-row-name">{say(SAY_J, 'journey.chainLevel', { level: chain.level })}</span><Chev />
        </a>
      ) : null}
      <button type="button" className="u2-raised u2-ctl m3f-row" data-m3f-quests-done={done} onClick={toDone}>
        <span className="m3-row-name">{say(SAY, 'menus3Feats.questsDone', { n: done })}</span><Chev />
      </button>
    </div>
  );
}

function FeatsRoot({ R, getS, top }) {
  const S = getS();
  const live = achvLive(S);
  const rail = featsRailId(top.rail);
  useClock(() => rev(getS()) + '|' + (achvLive(getS()) ? 1 : 0), 500);
  const head = featsHead(S, live);
  const pick = (id) => { menus3Bus.keep({ rail: id, scroll: 0 }); menus3Bus.bump(); };
  useEffect(() => {
    try { window.__btMenus3Feats = { rail, ap: head.kind, total: head.total, earned: head.earned, of: head.of, worn: (S && S._achv && S._achv.t) || null }; } catch (e) { /* no window */ }
  });
  if (!live) return <div className="m3f" data-m3f="off"><Ui2Empty kind="locked" title={say(SAY, 'menus3Feats.off')} /></div>;
  return (
    <div className="m3f" data-m3f={rail}>
      <ApLine head={head} />
      <div className="m3-rail" role="group" aria-label={say(SAY, 'menus3Feats.railAria')}>
        {MENUS3_FEATS_RAIL.map((id) => (
          <button key={id} type="button" className={'u2-raised u2-ctl m3-pill' + (id === rail ? ' is-selected' : '')} data-m3f-rail={id}
            aria-pressed={id === rail} onClick={() => pick(id)}>{railWord(id, head)}</button>
        ))}
      </div>
      {rail === 'titles' ? <Titles S={S} /> : rail === 'records' ? <Records R={R || (S && S.rpg) || {}} S={S} /> : <Medals S={S} rail={rail} />}
    </div>
  );
}

/* ── where the AP came from (today's AP tree, its layers on one page) ── */
function ApPage({ getS }) {
  useClock(() => rev(getS()), 500);
  const S = getS();
  const head = featsHead(S, achvLive(S));
  const groups = featsMedalGroups(S).filter((g) => g.n);
  return (
    <div className="m3f m3-page" data-m3f-page="ap" data-m3f-ap={head.kind}>
      <div className="m3f-rec"><span className="m3-row-name">{say(SAY, 'menus3Feats.apHead')}</span><b className="m3f-rec-v is-gold" data-m3f-ap-total={head.total == null ? '' : head.total}>{fmt(head.total)}</b></div>
      {head.kind !== 'split' ? <div className="m3-line" data-m3f-ap-unknown="">{say(SAY, 'menus3Feats.apTotal')}</div> : (
        <>
          <div className="m3f-rec" data-m3f-from="medals"><span className="m3-row-name">{say(SAY, 'menus3Feats.fromMedals')}</span><b className="m3f-rec-v">{fmt(head.achv)}</b></div>
          {groups.map((g) => (
            <div key={g.tier} className="m3f-rec is-sub" data-m3f-from={g.tier}>
              <MedalMark ring={g.ring} got />
              <span className="m3-row-name">{featsWord(g.tier)}</span><b className="m3f-rec-v">{fmt(g.pts)}</b>
            </div>
          ))}
          <div className="m3f-rec" data-m3f-from="rest"><span className="m3-row-name">{say(SAY, 'menus3Feats.fromRest')}</span><b className="m3f-rec-v">{fmt(head.rest)}</b></div>
          <div className="m3-line">{say(SAY, 'menus3Feats.restWhy')}</div>
        </>
      )}
    </div>
  );
}

/* ── a medal's page ── */
function MedalOne({ getS, id }) {
  useClock(() => rev(getS()) + '|' + id, 500);
  const S = getS();
  const m = featsMedal(S, id, null, Date.now());
  if (!m) return <div className="m3f m3-page" data-m3f-page="medal"><Ui2Empty kind="absent" title={say(SAY_F, 'feats.unknownMedal')} /></div>;
  const b = medalButton(S, id, achvTitleWaiting(S));
  return (
    <div className="m3f m3-page" data-m3f-page="medal" data-m3f-medal-page={m.id} data-m3f-got={m.got ? 1 : 0}>
      <div className="m3-item-id">
        <img className={'m3f-medal-art' + (m.got ? '' : ' is-locked')} src={m.art} alt="" draggable={false} width="56" height="56" />
        <span className="m3-item-words">
          <span className="m3-item-name">{m.name}</span>
          <span className="m3-item-sub">{m.got ? say(SAY, 'menus3Feats.earned') : <><LockMark /> {say(SAY_F, 'feats.notEarned')}</>}</span>
        </span>
      </div>
      <Ui2Facts>
        <Ui2Fact k={say(SAY_F, 'feats.fTier')} v={featsWord(m.tier)} />
        <Ui2Fact k={say(SAY_F, 'feats.fAp')} v={String(m.ap)} gold />
        <Ui2Fact k={say(SAY_F, 'feats.fEarned')} v={m.got ? m.on : say(SAY_F, 'feats.notYet')} none={!m.got} />
        <Ui2Fact k={say(SAY_F, 'feats.fHow')} v={m.how} className="is-wrap" />
        {m.progress ? <Ui2Fact k={say(SAY_F, 'feats.fSoFar')} v={m.progress} /> : null}
      </Ui2Facts>
      {b ? (
        <div className="m3-foot">
          {m.title && m.title.worn ? <div className="m3-line">{say(SAY, 'menus3Feats.wearing')}</div> : null}
          <TitleAct S={S} b={b} />
        </div>
      ) : null}
    </div>
  );
}

/** World · Feats: the panel's body for the section (Menus3Panel.jsx). */
export function Menus3Feats({ R, getS, top }) {
  if (!top) return null;
  if (top.page === 'ap') return <ApPage getS={getS} />;
  if (top.page === 'medal') return <MedalOne key={'m' + top.arg} getS={getS} id={top.arg} />;
  return <FeatsRoot R={R} getS={getS} top={top} />;
}
