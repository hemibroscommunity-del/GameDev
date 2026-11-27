/* ═══ v2.3.6684: CHARACTER, THE PASSPORT, AND ITS TITLES (card UI2-bro, the build's step 3, PR 2) ═══
 *
 * The owner, 2026-11-25: "Character: RPG passport; large portrait and
 * adjacent combat level, name/title, supporting summaries. Not a combat-stat
 * dump."  The master specification's 4.1: "Prominent portrait, name, equipped
 * title and combat level. Supporting content: Sword, Bow, Staff levels; clan
 * and guild affiliations; achievement points; quest completion count; titles
 * ... Link to the detailed destinations rather than duplicating all their
 * content."  Reference 01 is the feel and the hierarchy, NOT its thick gold
 * rim, heavy shadows, every panel raised, or its numbers.
 *
 * What it shows is src/game/broHub.js broPassport's word; this file reads the
 * game's values with the game's own readers (readPassport) and draws them
 * from the kit, in the screen's zones (src/ui/kit/Zones.jsx):
 *   identity  the still face LARGE (characterPortrait.js, through
 *             portraitStore), the combat level beside it (prog3.js
 *             prog3CharLevel: the game's reader), the name, the title;
 *   summary   Sword, Bow, Staff: each a door to today's Combat page on that
 *             weapon (step 4 replaces it), its points glowing while they wait;
 *   doors     Clan, Guilds, AP, Quests done: each a door where the game has a
 *             page; Titles and Journey (lifetime records, moved here from the
 *             Settings hub).
 * Raised only what opens something; the identity (a fact) is recessed.
 *
 * THE ROOM (the master notes' part 3): 172 px of content upright at 390 x 844
 * (168 at 375 x 667), 63 sideways (58 at 667 x 375).  Upright: the identity
 * row takes what the two 44 px rows leave, the portrait as tall as it.
 * Sideways: one row; on a phone narrower than 760 px of page the Clan,
 * Guilds, Titles and Journey lines become their pictures' doors (each
 * still 44 px, its word its label for a screen reader): the card's rule, "the
 * line becomes a door, never smaller text".
 *
 * TitlesPage: the titles you have earned (a title is the NAME of an
 * achievement you have earned: server achievements.js:241; there is no list
 * of titles apart from them), Equip and Remove title in the row of actions
 * (src/ui/kit/ActionRow.jsx, each in its place, off with its rule's reason),
 * the pressed one marked pending until the worker's achv_state answers
 * (src/game/pending.js: a second press never goes out while the first is
 * out; no answer in its window reads "Not confirmed yet", never success).
 *
 * The game's state is handed in (`S`, from BroCard: open-hand.test). */
import React, { startTransition, useEffect, useRef, useState } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { winVh } from '../playViewport.js';
import { TITLE_FAMILIES, inTitleFamily, wornHow } from '@/game/feats.js';   /* v2.3.6695 (card UI2-feats): the family, the worn title's how */
import { TitleFamily } from './TitleFamily.jsx';
import { frameTap } from '../dash/DashHeader.jsx';
import { portraitSrc } from './portraitStore.js';
import { BRO_WEAPONS } from './broStats.js';
import { combatSkillState, WEAPON_SKILLS } from '../dash/combatSkill.js';
import { prog3Live, prog3CharLevel } from '../../../data/prog3.js';
import { achvLive, sendAchvTitle } from '@/game/achievements.js';
import { ACHIEVEMENTS, achvById, ACHV_MEDAL_SRC } from '@/data/achievements.js';
import { clanPartyOn } from '@/game/alliance.js';
import { broPassport, broHubOpen, titleActions, TITLE_HOLDS } from '@/game/broHub.js';
import { combatPools } from '@/game/combatHub.js';   /* v2.3.6686: the passport's weapon counts, the hub's one rule */
import { pendingInit, pendingStep, pendingMark, pendingHolds } from '@/game/pending.js';
import { Ui2Group, Ui2Zones, Ui2Actions, Ui2Empty, Ui2Badge, ui2RootClass } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/charPage.js';
import { SAY as SAY_DF } from '@/data/say/dashFrame.js';
/* v2.3.6692 (card UI2-ranks): another player's page, read only from what the game holds of them */
import { passportFromRow } from '@/game/ranksPage.js';
import { broHubWhose } from '@/game/broHub.js';
import { useBoardFaces, BoardFace } from '../dash/BoardRow.jsx';
import { CharacterOtherView } from '../dash/rankViews.jsx';
import { rankWord } from '../dash/rankWords.js';
import { say } from '@/game/say.js';
import './characterPage.css';

const ART = Object.freeze({
  face: '/icons/ui/panel-self.webp',
  clan: '/icons/ui/panel-clan.webp',
  guilds: '/icons/ui/panel-guild.webp',
  ap: ACHV_MEDAL_SRC,
  quests: '/icons/ui/panel-quests.webp',
  titles: ACHV_MEDAL_SRC,
  journey: '/icons/ui/journey.webp',
});

const has = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);

/** The combat level the game shows everywhere (v2.3.3538): its reader, prog3CharLevel (the best
 *  weapon's while `onelevel` is on); an old blob's own level before prog3 is live. */
export function broCombatLevel(R) {
  try { if (prog3Live(R)) return prog3CharLevel(R); } catch (e) { /* the old blob */ }
  return Math.max(1, Number(R && R.level) || 1);
}

/** The passport's readings, with the game's own readers (broHub.js broPassport's `r`). */
export function readPassport(S) {
  const R = (S && S.rpg) || {};
  const a = S && S._achv;
  const weapons = Object.create(null);
  const pools = combatPools(R, !!(S && S._serverCaps && S._serverCaps.prog3Chan));
  WEAPON_SKILLS.forEach((sk, i) => {
    let k = null;
    try { k = combatSkillState(R, sk); } catch (e) { k = null; }
    /* v2.3.6686 (card UI2-combat PR 2, PR 1's flag): the count is Combat's hub's, one rule
       (combatHub.js combatPools: a weapon's pool + the free remainder, in every lane), so the
       passport and the hub never disagree; combatSkillState put the remainder in ONE lane */
    weapons[BRO_WEAPONS[i].cat] = k ? { lvl: k.lvl, unspent: Number(pools[BRO_WEAPONS[i].cat]) || 0 } : {};
  });
  let party = false;
  try { party = clanPartyOn(S); } catch (e) { party = false; }
  const cs = R._compStats;
  /* the worker's total: its last achv_state or player_state echo, else the record it sent; neither
     yet: null (the placeholder, never a 0) */
  const ap = a && typeof a.ap === 'number' ? a.ap : (S && S.rpg && R.achievementPoints != null ? R.achievementPoints : null);
  return {
    name: (S && S.myName) || '',
    combat: S && S.rpg ? broCombatLevel(R) : null,
    weapons,
    titleId: a && typeof a.t === 'string' ? a.t : null,
    earned: (id) => !!(a && has(a.got, id)),
    titleText: (id) => { const d = achvById(id); return d ? d.name : null; },
    clanParty: party,
    party: S ? S._party : null,
    oldClan: S && S._clanData && S._clanData.tag ? { tag: S._clanData.tag, name: S._clanData.name || null } : null,
    ap,
    /* the phone's own count: no counter yet on a record that has played no quest is 0, not "on its way" */
    quests: S && S.rpg ? ((cs && typeof cs === 'object' && Number(cs.questsCompleted)) || 0) : null,
  };
}

/* what the clock compares: a redraw only when a shown value moved */
function passportKey(S) {
  const r = readPassport(S);
  const w = r.weapons;
  const p = r.party;
  return [r.name, r.combat, r.titleId, r.titleId && r.earned(r.titleId) ? 1 : 0, r.ap, r.quests,
    ['sword', 'bow', 'staff'].map((c) => (w[c] ? w[c].lvl + ':' + w[c].unspent : '-')).join(','),
    r.clanParty ? 1 : 0, p && p.state, p && Array.isArray(p.members) ? p.members.length : 0, p && p.ally ? p.ally.tag : '',
    r.oldClan ? r.oldClan.tag : '', S && S._achv ? S._achv.rev : -1].join('|');
}

/* a page's clock: a redraw (a transition: never ahead of a frame) when `key()` moves */
export function useClock(key, ms) {
  const [, force] = useState(0);
  useEffect(() => {
    let last = '';
    const id = setInterval(() => {
      let k = '';
      try { k = key(); } catch (e) { k = ''; }
      if (k !== last) { last = k; startTransition(() => force((v) => (v + 1) % 1e9)); }
    }, ms);
    return () => clearInterval(id);
  }, []);
}

/* the page's box: short (a phone on its side) and narrow, from its own ResizeObserver
   (docs/specs/layout-reads.md); the first guess from the kept window size */
const shortGuess = () => { try { return winVh() < 500; } catch (e) { return false; } };
export function useRoom() {
  const ref = useRef(null);
  const [room, setRoom] = useState(() => ({ short: shortGuess(), w: 0, h: 0 }));
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let ro = null;
    try {
      ro = new ResizeObserver((entries) => {
        const e = entries && entries[0];
        const r = e && e.contentRect;
        if (!r || !(r.height > 0)) return;
        const next = { short: r.height < 110, w: Math.round(r.width), h: Math.round(r.height) };
        setRoom((o) => (o.short === next.short && o.w === next.w && o.h === next.h ? o : next));
      });
      ro.observe(el);
    } catch (e) { ro = null; }
    return () => { try { if (ro) ro.disconnect(); } catch (e) { /* gone */ } };
  }, []);
  return [ref, room];
}

/* the words, each key written out (say.test rule 7) */
function word(key, n) {
  switch (key) {
    case 'charPage.sword': return say(SAY, 'charPage.sword');
    case 'charPage.bow': return say(SAY, 'charPage.bow');
    case 'charPage.staff': return say(SAY, 'charPage.staff');
    case 'charPage.clan': return say(SAY, 'charPage.clan');
    case 'charPage.noClan': return say(SAY, 'charPage.noClan');
    case 'charPage.inParty': return say(SAY, 'charPage.inParty', { n });
    case 'charPage.guilds': return say(SAY, 'charPage.guilds');
    case 'charPage.skillGuilds': return say(SAY, 'charPage.skillGuilds');
    case 'charPage.ap': return say(SAY, 'charPage.ap');
    case 'charPage.quests': return say(SAY, 'charPage.quests');
    case 'charPage.notShared': return say(SAY, 'charPage.notShared');
    case 'charPage.titles': return say(SAY, 'charPage.titles');
    case 'charPage.journey': return say(SAY, 'charPage.journey');
    case 'charPage.pickTitle': return say(SAY, 'charPage.pickTitle');
    case 'charPage.notEarned': return say(SAY, 'charPage.notEarned');
    case 'charPage.alreadyWorn': return say(SAY, 'charPage.alreadyWorn');
    case 'charPage.noTitleWorn': return say(SAY, 'charPage.noTitleWorn');
    default: return String(key || '');
  }
}

const fmt = (v) => Number(v).toLocaleString('en-US');

/* a door of the passport: raised, its picture, its label and its value (or the label alone) */
function PassDoor({ id, art, k, v, none, loading, onOpen, points, aria, iconOnly, style }) {
  const value = loading ? <span className="u2-pass-wait" data-u2-loading="" aria-hidden="true" /> : v;
  return (
    <button type="button" className={'u2-raised u2-pass-door' + (points > 0 ? ' is-glow' : '') + (iconOnly ? ' is-icon' : '')}
      data-char-door={id} data-char-loading={loading ? 1 : undefined} aria-label={aria} aria-busy={loading ? 'true' : undefined}
      style={style} {...frameTap(onOpen)}>
      {art ? <img className="u2-pass-art" src={art} alt="" draggable={false} /> : null}
      {iconOnly ? null : (
        <span className="u2-pass-words">
          <span className="u2-pass-k">{k}</span>
          {v != null || loading ? <span className={'u2-pass-v' + (none ? ' is-none' : '')} data-char-v={id}>{value}</span> : null}
        </span>
      )}
      {points > 0 ? <Ui2Badge count={points} /> : null}
    </button>
  );
}

/**
 * S         the game's state (handed by BroCard)
 * who       whose page (null: yours; step 9 sets another's)
 * onWeapon  (cat) => void: today's Combat page on that weapon (BroCard)
 */
export function CharacterPage({ S, who, onWeapon }) {
  /* v2.3.6692 (card UI2-ranks; UI3-bro's finding 2): ANOTHER player's page never reads your state (readPassport
     reads only yours: handed their `who`, it showed YOUR name, title, levels and AP under their label).  It is
     drawn from the readings its caller handed (`who.passport`, a board's row: ranksPage.js passportFromRow), or,
     handed none, from `who` itself: their name and "Not shared" lines, never one of your values. */
  if (who != null) return <OtherCharacter who={who} />;
  return <OwnCharacter S={S} onWeapon={onWeapon} />;
}

/** Another player's Character: read-only, their name, face and what the row carried; nothing to press. */
function OtherCharacter({ who }) {
  const [ref, room] = useRoom();
  const P = who && typeof who === 'object' && who.passport && Array.isArray(who.passport.facts)
    ? who.passport : passportFromRow(who && typeof who === 'object' ? who : { id: String(who), name: '' });
  const faces = useBoardFaces(P.look ? [{ look: P.look }] : []);
  const w = broHubWhose(who);
  const whose = w && w.key === 'dashFrame.whose' ? say(SAY_DF, 'dashFrame.whose', { name: w.name }) : say(SAY_DF, 'dashFrame.whoseUnknown');
  const combatWord = say(SAY, 'charPage.combatLv') + ' ' + (P.combat == null ? rankWord(P.notShared) : P.combat);
  return (
    <div ref={ref} style={{ flex: '1 1 auto', height: '100%', minHeight: 0, minWidth: 0, display: 'flex' }}>
      <CharacterOtherView P={{ ...P, name: P.name || whose }} face={faces[0] || null} Face={BoardFace} whose={whose} word={rankWord}
        combatWord={combatWord} short={room.short} />
    </div>
  );
}

/* your own passport (today's Character page; UI3-bro made your own the one Bro page) */
function OwnCharacter({ S, onWeapon }) {
  const who = null;
  useClock(() => passportKey(S), 500);
  const [ref, room] = useRoom();
  const P = broPassport(readPassport(S), who == null ? null : who);
  const short = room.short;
  const narrow = short && room.w > 0 && room.w < 760;
  const go = (opens) => {
    const o = broHubOpen(opens);
    if (o && o.kind === 'page') dashboardPanelBus.go({ type: 'push', id: o.page, who: who == null ? undefined : who });
  };
  const portrait = (who && who.portrait) || (P.self ? portraitSrc(S) : null) || ART.face;
  const name = P.name || say(SAY, 'charPage.noName');
  const nmSize = name.length <= 10 ? 17 : name.length <= 13 ? 15 : 13;
  const titleWords = P.title ? P.title.text : say(SAY, 'charPage.noTitle');
  const lvl = P.combat == null ? null : P.combat;

  const face = (
    <span className="u2-group u2-pass-face" data-char-portrait="" style={short ? { width: Math.max(44, room.h || 56), height: '100%' } : undefined}>
      <img src={portrait} alt="" draggable={false} />
    </span>
  );
  const combat = (
    <Ui2Group className="u2-group u2-pass-combat" data-char-combat={lvl == null ? '' : lvl} aria-label={say(SAY, 'charPage.combatAria', { n: lvl == null ? '' : lvl })}>
      <span className="u2-group-k">{say(SAY, 'charPage.combatLv')}</span>
      <span className="u2-pass-lv">{lvl == null ? <span className="u2-pass-wait" data-u2-loading="" aria-hidden="true" /> : lvl}</span>
    </Ui2Group>
  );
  /* on the narrowest sideways page the title line is the Titles door's (its picture) */
  const nameBlock = (
    <span className="u2-pass-id">
      <span className="u2-pass-name" data-char-name="" style={{ fontSize: short ? Math.min(15, nmSize) : nmSize }}>{name}</span>
      {narrow ? null : <span className={'u2-pass-title' + (P.title ? '' : ' is-none')} data-char-title={P.title ? P.title.id : ''} aria-label={say(SAY, 'charPage.titleAria', { t: titleWords })}>{titleWords}</span>}
    </span>
  );
  const whose = P.whose ? (
    <Ui2Group data-bro-whose="" style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <span className="u2-group-k" style={{ whiteSpace: 'normal' }}>{P.whose.name || ''}</span>
    </Ui2Group>
  ) : null;

  const weapons = P.weapons.map((w) => (
    <PassDoor key={w.cat} id={'weapon-' + w.cat} art={w.art} k={short ? null : word(w.word)} v={w.lvl == null ? null : (short ? fmt(w.lvl) : say(SAY, 'charPage.lv') + ' ' + fmt(w.lvl))}
      loading={w.lvl == null} points={w.points}
      aria={say(SAY, 'charPage.weaponAria', { w: word(w.word), n: w.lvl == null ? '' : w.lvl }) + (w.points > 0 ? '. ' + say(SAY, 'charPage.pointsAria', { n: w.points }) : '')}
      onOpen={() => { if (onWeapon) onWeapon(w.cat); }} />
  ));
  const line = (s) => (s.v != null ? (s.id === 'ap' ? fmt(s.v) : s.id === 'quests' ? fmt(s.v) : String(s.v)) : s.key ? word(s.key, s.n) : null);
  /* sideways the lines that cannot hold their words become their pictures' doors (never smaller text) */
  const iconFor = (id) => narrow && (id === 'clan' || id === 'guilds' || id === 'quests');
  const summary = P.summary.map((s) => (s.opens ? (
    <PassDoor key={s.id} id={s.id} art={short ? ART[s.id] : null} k={word(s.k)} v={line(s)} none={s.none} loading={s.loading}
      iconOnly={iconFor(s.id)} aria={(s.id === 'ap' ? say(SAY, 'charPage.apAria') : word(s.k)) + ': ' + (s.loading ? '…' : line(s))}
      onOpen={() => go(s.opens)} />
  ) : (
    <Ui2Group key={s.id} k={word(s.k)} data-char-fact={s.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <span className={'u2-group-v' + (s.none ? ' is-none' : '')} data-char-v={s.id}>{line(s)}</span>
    </Ui2Group>
  )));
  const doors = P.doors.map((d) => (
    <PassDoor key={d.id} id={d.id} art={ART[d.id]} k={word(d.k)} iconOnly={short} aria={word(d.k)} onOpen={() => go(d.opens)} />
  ));

  if (short) {
    return (
      <div ref={ref} className={ui2RootClass() + ' u2-pass is-short'} data-char-page={P.self ? 'self' : 'other'} data-char-shape={narrow ? 'narrow' : 'short'}>
        <Ui2Zones style={{ flexDirection: 'row', gap: 4 }}
          identity={<div className="u2-pass-row">{face}<span className="u2-pass-idcol">{nameBlock}{combat}</span></div>}
          summary={<div className="u2-pass-row">{weapons}</div>}
          doors={<div className="u2-pass-row">{summary}{doors}{whose}</div>} />
      </div>
    );
  }
  /* upright: the identity row takes what the two 44 px rows below leave (the zones' 6 px gaps) */
  const idH = room.h > 0 ? Math.max(56, room.h - 44 - 44 - 12) : 72;
  return (
    <div ref={ref} className={ui2RootClass() + ' u2-pass'} data-char-page={P.self ? 'self' : 'other'} data-char-shape="upright">
      <Ui2Zones
        identity={(
          <div className="u2-pass-row" style={{ height: idH }}>
            <span className="u2-group u2-pass-face" data-char-portrait="" style={{ width: idH, height: idH }}><img src={portrait} alt="" draggable={false} /></span>
            <span className="u2-pass-idcol">{nameBlock}{combat}</span>
            {doors}{whose}
          </div>
        )}
        summary={<div className="u2-pass-row is-44">{weapons}</div>}
        doors={<div className="u2-pass-row is-44 is-sum">{summary}</div>} />
    </div>
  );
}

/* ═══ THE TITLES PAGE: what you have earned, Equip, its pending mark ═══ */

/* the titles you have earned, newest first: { id, text, clue, art } */
function earnedTitles(S) {
  const a = S && S._achv;
  if (!a || !a.got) return [];
  const out = [];
  for (const def of ACHIEVEMENTS) if (has(a.got, def.id)) out.push({ id: def.id, text: def.name, clue: def.clue, art: def.icon, at: Number(a.got[def.id]) || 0 });
  out.sort((x, y) => y.at - x.at);
  return out;
}

/* a request's id: the title ask's own time (achievements.js sendAchvTitle stamps it) */
const askId = (ask) => (ask ? 'title:' + ask.at : null);

export function TitlesPage({ S, who }) {
  const a = S && S._achv;
  const self = who == null;
  const worn = a && typeof a.t === 'string' && has(a.got, a.t) ? a.t : null;
  const [picked, setPicked] = useState(() => worn);
  /* the one pending state (src/game/pending.js); a title ask already out when the page opens
     (sent, then the page left and came back) holds the controls from the start */
  const [pend, setPend] = useState(() => {
    const ask = a && a.titleAsk;
    return ask ? pendingStep(pendingInit(), { type: 'send', id: askId(ask), holds: TITLE_HOLDS, now: ask.at }) : pendingInit();
  });
  const [ref, room] = useRoom();
  const [now, setNow] = useState(() => Date.now());
  /* the clock: the worker's answer (its achv_state clears the ask: onAchvState) SETTLES the request;
     out past its window it reads unknown, its controls still held */
  useEffect(() => {
    const id = setInterval(() => {
      const A = S && S._achv;
      const ask = A && A.titleAsk;
      setPend((p) => {
        let next = p;
        for (const rid of Object.keys(p)) if (rid !== askId(ask)) next = pendingStep(next, { type: 'settle', id: rid });
        return next;
      });
      startTransition(() => setNow(Date.now()));
    }, 250);
    return () => clearInterval(id);
  }, []);
  useClock(() => [S && S._achv ? S._achv.rev : -1, achvLive(S) ? 1 : 0].join('|'), 500);
  useEffect(() => { if (picked == null && worn) setPicked(worn); }, [worn]);
  /* QA: the page's pending state (window.__btTitles), and every mark the Equip button has worn (`seen`) */
  const seen = useRef([]);
  useEffect(() => {
    const m = pendingMark(pend, 'title:equip', now);
    if (seen.current[seen.current.length - 1] !== m) seen.current.push(m);
    try { window.__btTitles = { picked, worn, mark: m, out: Object.keys(pend).length, seen: seen.current.slice() }; } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btTitles = null; } catch (e) { /* no window */ } }, []);

  const list = earnedTitles(S);
  /* v2.3.6695 (card UI2-feats): the one family (Blooded, Veteran, Centurion) drawn as one row, the rest single */
  const fams = TITLE_FAMILIES.filter((f) => f.ids.some((id) => list.some((t) => t.id === id)));
  const singles = list.filter((t) => !inTitleFamily(t.id));
  const earned = (id) => !!(a && has(a.got, id));
  const send = (want) => {
    if (pendingHolds(pend, 'title:equip')) return;   /* a second press never goes out while the first is out */
    if (!sendAchvTitle(S, want)) return;
    const ask = S._achv && S._achv.titleAsk;
    if (ask) setPend((p) => pendingStep(p, { type: 'send', id: askId(ask), holds: TITLE_HOLDS, now: ask.at }));
  };
  const acts = titleActions(self ? null : who, picked, worn, earned).map((x) => (x.id === 'equip'
    ? { ...x, label: say(SAY, 'charPage.equip'), c: 'gold', onPress: () => send(picked) }
    : { ...x, label: say(SAY, 'charPage.remove'), c: 'silver', onPress: () => send(null) }));
  const marks = { equip: pendingMark(pend, 'title:equip', now), remove: pendingMark(pend, 'title:remove', now) };

  const wornDef = worn ? achvById(worn) : null;
  const head = (
    <Ui2Group data-titles-head="" style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '2px 8px', minWidth: 0 }}>
      <span className="u2-group-k">{say(SAY, 'charPage.yourTitle')}</span>
      <span className={'u2-group-v' + (wornDef ? '' : ' is-none')} data-titles-worn={worn || ''} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{wornDef ? wornDef.name : say(SAY, 'charPage.noTitle')}</span>
      {self && a && a.known ? <span className="u2-group-k" style={{ marginLeft: 'auto' }}>{say(SAY, 'charPage.earnedOf', { n: list.length, total: ACHIEVEMENTS.length })}</span> : null}
    </Ui2Group>
  );
  /* v2.3.6695 (card UI2-feats): how the worn title was earned, under it (its requirement, word for word) */
  const how = self && wornDef ? wornHow(S) : '';
  const identity = how ? <>{head}<span className="u2-titles-how" data-titles-how="">{how}</span></> : head;
  let body;
  if (!achvLive(S)) body = <Ui2Empty kind="locked" title={say(SAY, 'charPage.titlesShut')} />;
  else if (!self) body = <Ui2Empty kind="absent" title={say(SAY, 'charPage.titlesOther')} />;
  else if (!a || !a.known) body = <Ui2Empty kind="loading" rows={2} />;
  else if (!list.length) body = <Ui2Empty kind="absent" art={ACHV_MEDAL_SRC} title={say(SAY, 'charPage.noTitles')} why={say(SAY, 'charPage.noTitlesWhy')} how={say(SAY, 'charPage.noTitlesHow')} />;
  else {
    body = (
      <div className={'u2-titles' + (room.short ? ' is-short' : '')} data-titles-list={list.length}>
        {fams.map((f) => <TitleFamily key={f.id} S={S} fam={f} picked={picked} worn={worn} onPick={setPicked} wearingWord={say(SAY, 'charPage.wearing')} />)}
        {singles.map((t) => (
          <button key={t.id} type="button" className="u2-raised u2-title-row" aria-pressed={picked === t.id ? 'true' : 'false'}
            data-title-row={t.id} data-title-worn={t.id === worn ? 1 : 0} {...frameTap(() => setPicked(t.id))}>
            {t.art ? <img src={t.art} alt="" draggable={false} /> : null}
            <span className="u2-pass-words">
              <span className="u2-pass-v">{t.text}</span>
              <span className="u2-pass-k">{t.id === worn ? say(SAY, 'charPage.wearing') : t.clue}</span>
            </span>
          </button>
        ))}
      </div>
    );
  }
  const actions = self && achvLive(S) && a && a.known && list.length
    ? <Ui2Actions actions={acts} marks={marks} whyWord={(k) => word(k)} /> : null;
  return (
    <div ref={ref} className={ui2RootClass() + ' u2-pass' + (room.short ? ' is-short' : '')} data-titles-page={self ? 'self' : 'other'}>
      <Ui2Zones style={room.short ? { flexDirection: 'row', gap: 4 } : undefined} identity={identity} summary={body} actions={actions} />
    </div>
  );
}

export default CharacterPage;
