/* ═══ v2.3.6864: PEOPLE · ROSTER AND THE PLAYER PAGE IN THE NEW PANEL (card MN step 10) ═══
 *
 * The owner's Roster (docs/design/menus3/SPEC.md "Other Players"; the
 * wireframe v4.4's party row, its rail Nearby | Friends | Requests | Blocked,
 * its rows a name and one action): the party bar pinned at the top (playing
 * alone ONE slim "No party" line with Create: the card's "Decided" 8), the
 * Alliance line under it only when the party is one (or wears its former
 * clan's tag), the four segments with their real counts, and a row's name
 * opening the ONE Player page in the panel with the one Back
 * (src/game/menus3Nav.js).  The rules are node's (src/game/menus3Roster.js).
 *
 * NOTHING NEW IS ASKED OF THE WORKER.  Every button sends the request today's
 * screen for it sends, as it sends it: the party chip's leave and kick
 * (PartyHUD.jsx), the player card's invite, trade, duel, add friend, mute,
 * block and report (InspectPlayerPanel.jsx), the Friends page's accept,
 * decline and remove (dash/SocialPanel.jsx), all through the action door
 * (actions.js act).  "Message" opens People · Chat in the panel on Whispers,
 * aimed at the player (v2.3.6870, card MN step 11; before it today's chat box);
 * Back returns to the player's page.  "Player card" opens today's
 * card, whose portrait opens the Inspect card (the gear, the points, the
 * kills: what the phone is sent about a player in the world).
 *
 * THE PLAYER PAGE IS SHARED: any section opens it by one call,
 * menus3OpenPlayer(id) (the Chat and Ranks steps); it reads only what the
 * phone already has (menus3Roster.js playerFacts).
 *
 * No art loads because it opened: a player is a drawn disc in their own
 * colour with their initial (the old list's icon and the card's portrait are
 * built from the look sheets; neither is drawn here). */
import React, { useEffect, useRef, useState } from 'react';
import { getFriendRows, lastSeenText, getBlocked, removeFriend, setBlock, unblockPlayer, addFriend } from '@/ui/mobile/sheet/friendsModel.js';
import { friendsSrv } from '@/ui/mobile/sheet/friendsSync.js';
import { shareInvite } from '@/ui/mobile/dash/SocialPanel.jsx';
import { useClock } from '@/ui/mobile/sheet/CharacterPage.jsx';
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';
import { setMuted, reportPlayer, readMutedIds, isBlockedId } from '@/game/chatMute.js';
import { allyCapsOn, allyTagShown } from '@/game/alliance.js';
import { act } from '@/game/actions.js';
import { ZONES } from '@/data/index.js';
import { MENUS3_ROSTER_SEGS, MENUS3_REPORT_REASONS, rosterSeg, partyBar, allianceLine, nearbyRows, rosterCounts, playerActs, playerFacts, armTap } from '@/game/menus3Roster.js';
import { deskWords } from '@/game/deskWords.js';
import { Ui2Empty } from '@/ui/kit/EmptyState.jsx';
import { Ui2Action } from '@/ui/kit/Action.jsx';
import { menus3Bus, menus3Away } from './menus3Wire.js';
import { SAY } from '@/data/say/menus3Roster.js';
import { SAY as SAY_S } from '@/data/say/socialDash.js';
import { say } from '@/game/say.js';

/* the words, each key written out (the say guard reads them) */
const ACT_WORD = {
  message: () => say(SAY, 'menus3Roster.actMessage'),
  invite: () => say(SAY, 'menus3Roster.actInvite'),
  kick: () => say(SAY, 'menus3Roster.actKick'),
  trade: () => say(SAY, 'menus3Roster.actTrade'),
  duel: () => say(SAY, 'menus3Roster.actDuel'),
  friend: () => say(SAY, 'menus3Roster.actFriend'),
  unfriend: () => say(SAY, 'menus3Roster.actUnfriend'),
  card: () => say(SAY, 'menus3Roster.actCard'),
  mute: () => say(SAY, 'menus3Roster.actMute'),
  unmute: () => say(SAY, 'menus3Roster.actUnmute'),
  block: () => say(SAY, 'menus3Roster.actBlock'),
  unblock: () => say(SAY, 'menus3Roster.actUnblock'),
  report: () => say(SAY, 'menus3Roster.actReport'),
};
const SENT_WORD = {
  invite: () => say(SAY, 'menus3Roster.sentInvite'),
  kick: () => say(SAY, 'menus3Roster.sentKick'),
  duel: () => say(SAY, 'menus3Roster.sentDuel'),
  friend: () => say(SAY, 'menus3Roster.sentFriend'),
  unfriend: () => say(SAY, 'menus3Roster.sentUnfriend'),
  mute: () => say(SAY, 'menus3Roster.sentMute'),
  unmute: () => say(SAY, 'menus3Roster.sentUnmute'),
  block: () => say(SAY, 'menus3Roster.sentBlock'),
  unblock: () => say(SAY, 'menus3Roster.sentUnblock'),
  report: () => say(SAY, 'menus3Roster.sentReport'),
};
const WHY_WORD = {
  spam: () => say(SAY, 'menus3Roster.whySpam'),
  abuse: () => say(SAY, 'menus3Roster.whyAbuse'),
  harassment: () => say(SAY, 'menus3Roster.whyHarassment'),
  cheating: () => say(SAY, 'menus3Roster.whyCheating'),
};
const wordOf = (t, k) => (Object.prototype.hasOwnProperty.call(t, k) ? t[k]() : '');

const caps = (S) => (S && S._serverCaps) || {};
const sendIf = (S, ev, payload) => { try { if (S && S.channel) return act(ev, payload || {}); } catch (e) { /* no channel */ } return false; };
const idSet = (list, f) => { const o = Object.create(null); for (const x of list || []) { const k = f(x); if (k != null) o[String(k)] = 1; } return o; };
const blockedSet = (S) => idSet(getBlocked(S), (b) => (b && typeof b === 'object' ? b.id : b));

/* the player's disc: drawn (CLAUDE.md: no text glyph, and no art loads because a menu opened) */
function Face({ name, color, size = 32 }) {
  const c = typeof color === 'string' && /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#8D9B98';
  const ch = String(name || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 1).toUpperCase() || '?';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="m3-face">
      <circle cx="16" cy="16" r="14.5" fill={c} fillOpacity=".35" stroke={c} strokeWidth="2" />
      <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="800" fill="currentColor">{ch}</text>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 2 V12 M2 7 H12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function ChevIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true" className="m3-chev">
      <path d="M3 2 L8 7 L3 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Open the Player page on `id`, from any section (the Chat and Ranks steps
    call this): over the page showing when the panel is open, else People ·
    Roster with the player's page on it (its Back the Roster). */
export function menus3OpenPlayer(id, hint) {
  if (id == null || id === '') return false;
  menus3PlayerHint(id, hint);   /* v2.3.6870: what a chat line or a ranks row knows of them */
  const st = menus3Bus.state;
  if (!st.open) menus3Bus.open('people', 'roster');
  menus3Bus.push('player', String(id));
  return true;
}

/* ═══ v2.3.6870 (card MN step 11): WHAT A CHAT LINE OR A RANKS ROW KNOWS OF A PLAYER ═══
   A player the phone does not hold (not near, no friend, no party) is only
   an id to the page's facts: the line's or the row's name is kept here, and
   a ranks row's own card (today's Character page, fed only by the row:
   ranksPage.js ranksOpens `who`), which the page's "Player card" opens when
   they are not here.  A few kept (a Map, the oldest first out). */
const _hints = new Map();
export function menus3PlayerHint(id, hint) {
  const k = String(id == null ? '' : id);
  if (!k || !hint || typeof hint !== 'object') return;
  const name = typeof hint.name === 'string' ? hint.name.slice(0, 48) : '';
  const who = hint.who && typeof hint.who === 'object' ? hint.who : null;
  const was = _hints.get(k) || null;
  _hints.delete(k);
  _hints.set(k, { name: name || (was && was.name) || '', who: who || (was && was.who) || null });
  while (_hints.size > 40) _hints.delete(_hints.keys().next().value);
}

function segWord(id, n) {
  if (id === 'friends') return say(SAY, 'menus3Roster.friends', { n: n.friends });
  if (id === 'requests') return say(SAY, 'menus3Roster.requests', { n: n.requests });
  if (id === 'blocked') return say(SAY, 'menus3Roster.blocked', { n: n.blocked });
  return say(SAY, 'menus3Roster.nearby', { n: n.nearby });
}
function brosWord(n) { return n === 1 ? say(SAY, 'menus3Roster.bro') : say(SAY, 'menus3Roster.bros', { n }); }

/* ── the party bar (pinned) ── */
function PartyBar({ S, bar, ally, onCreate, onPlayer }) {
  const [armed, setArmed] = useState(null);
  const [how, setHow] = useState(false);
  if (bar.kind === 'none') {
    return (
      <div className="m3-partybar" data-m3-party="none">
        <div className="m3-party-line">
          <span className="m3-party-words"><b>{say(SAY, 'menus3Roster.noParty')}</b><span className="m3-muted">{' · ' + say(SAY, 'menus3Roster.playTogether')}</span></span>
          {caps(S).party ? <Ui2Action intent="commit" label={say(SAY, 'menus3Roster.create')} data-m3-party-create="" style={{ flex: 'none' }}
            onClick={() => { setHow(true); onCreate(); }} /> : null}
        </div>
        {how ? <p className="m3-why" data-m3-party-how="">{say(SAY, 'menus3Roster.createHow')}</p> : null}
      </div>
    );
  }
  const lead = bar.members.find((m) => m.leader);
  const leave = () => {
    const r = armTap(armed, 'leave', Date.now());
    setArmed(r.armed);
    if (r.fire) sendIf(S, 'party_leave');
  };
  const leaveArmed = armed && armed.id === 'leave';
  return (
    <div className="m3-partybar" data-m3-party="party" data-m3-party-n={bar.n}>
      <div className="m3-party-line">
        <span className="m3-party-words"><b>{say(SAY, 'menus3Roster.party', { n: bar.n, max: bar.max })}</b>
          {lead ? <span className="m3-muted">{' · ' + say(SAY, 'menus3Roster.leader', { name: lead.me ? say(SAY, 'menus3Roster.you') : lead.name })}</span> : null}</span>
      </div>
      <div className="m3-party-members">
        {bar.members.map((m) => (
          <button key={m.id} type="button" className={'u2-raised u2-ctl m3-member' + (m.me ? ' is-me' : '')} data-m3-member={m.id} data-m3-member-lead={m.leader ? '1' : '0'}
            disabled={m.me || undefined} onClick={() => { if (!m.me) onPlayer(m.id); }}>
            <span className="m3-row-name">{m.me ? say(SAY, 'menus3Roster.you') : m.name}</span>
            {m.level != null ? <span className="m3-muted">{say(SAY, 'menus3Roster.lv', { lv: m.level })}</span> : null}
          </button>
        ))}
        {!bar.full && caps(S).party ? (
          <button type="button" className="u2-raised u2-ctl m3-member" data-m3-party-invite="" onClick={onCreate}><PlusIcon /><span>{say(SAY, 'menus3Roster.inviteMore')}</span></button>
        ) : null}
        <Ui2Action intent="danger" label={say(SAY, leaveArmed ? 'menus3Roster.leaveSure' : 'menus3Roster.leave')} data-m3-party-leave={leaveArmed ? 'armed' : ''}
          style={{ flex: 'none' }} onClick={leave} />
      </div>
      {ally ? (
        <div className="m3-ally" data-m3-ally={ally.kind}>
          {ally.kind === 'alliance'
            ? say(SAY, 'menus3Roster.alliance', { tag: allyTagShown(ally.tag) || ally.tag, name: ally.name, active: ally.active })
            : say(SAY, 'menus3Roster.formerClan', { tag: allyTagShown(ally.tag) || ally.tag, name: ally.name })}
        </div>
      ) : null}
    </div>
  );
}

/* ── a row: the name opens the page; one action beside it ── */
function Row({ id, name, color, sub, children, hooks }) {
  return (
    <div className="m3-prow" {...(hooks || {})}>
      <button type="button" className="u2-raised u2-ctl m3-row" data-m3-player-row={id} onClick={() => menus3Bus.push('player', id)}>
        <Face name={name} color={color} />
        <span className="m3-prow-words"><span className="m3-row-name">{name}</span>{sub ? <span className="m3-muted m3-row-name">{sub}</span> : null}</span>
        <ChevIcon />
      </button>
      {children}
    </div>
  );
}

function friendSub(r) {
  if (r.online) {
    return (r.level != null ? say(SAY, 'menus3Roster.lv', { lv: r.level }) + ' · ' : '')
      + say(SAY_S, r.away ? 'socialDash.away' : 'socialDash.online')
      + (r.zoneName ? say(SAY_S, 'socialDash.inZone', { zone: r.zoneName }) : '')
      + (r.sameZone ? say(SAY_S, 'socialDash.withYou') : '');
  }
  const seen = lastSeenText(r.lastSeen);
  return seen ? say(SAY_S, 'socialDash.offlineSeen', { seen }) : say(SAY_S, 'socialDash.offline');
}
const canWhisper = (S, name) => !!caps(S).whisper && !!name && !/\s/.test(String(name).trim());
/* v2.3.6870 (card MN step 11): "Message" opens People · Chat in the panel, on Whispers with the whisper
   aimed at them (decided 7), over the page it came from: Back returns there (src/game/menus3Chat.js) */
function whisper(name) {
  if (!menus3Bus.state.open) return false;
  menus3Bus.push('whisper', String(name).trim());
  return true;
}

function rosterOf(S) {
  const party = S && S._party;
  const bar = partyBar(party, S && S.myId);
  const blocked = blockedSet(S);
  const friends = getFriendRows(S);
  const mates = idSet(bar.kind === 'party' ? bar.members : [], (m) => m.id);
  const near = nearbyRows((S && S.others) || null, { myId: S && S.myId, party: mates, friends: idSet(friends, (r) => r.fid), blocked });
  const doc = caps(S).friends ? friendsSrv.doc() : null;
  const reqIn = doc ? friendsSrv.requestsIn() : [];
  const reqOut = doc ? Object.keys(doc.reqOut || {}) : [];
  const blockList = getBlocked(S).map((b) => (b && typeof b === 'object' ? { id: String(b.id), name: b.name || String(b.id) } : { id: String(b), name: String(b) }));
  const n = rosterCounts({ nearby: near, friends, requests: reqIn, blocked: blockList });
  return { bar, ally: allianceLine(party, allyCapsOn(S)), near, friends, doc, reqIn, reqOut, blockList, n, mates };
}
const rosterKey = (r) => [r.bar.kind, r.bar.n || 0, r.bar.leader || '', (r.bar.members || []).map((m) => m.id + (m.off ? '-' : '')).join(','),
  r.ally ? r.ally.tag + r.ally.active : '', r.near.map((x) => x.id + ':' + (x.level || '') + (x.party ? 'p' : '') + (x.friend ? 'f' : '')).join(','),
  r.friends.map((x) => x.fid + (x.online ? 'o' : '') + (x.away ? 'a' : '') + (x.zoneName || '')).join(','), r.reqIn.join(','), r.reqOut.join(','), r.blockList.map((b) => b.id).join(',')].join('|');

function RosterRoot({ getS, top }) {
  const [, force] = useState(0);
  useEffect(() => friendsSrv.subscribe(() => force((v) => (v + 1) % 1e9)), []);
  useClock(() => rosterKey(rosterOf(getS())), 1000);
  const [showAdd, setShowAdd] = useState(false);
  const [shared, setShared] = useState('');
  const [query, setQuery] = useState('');
  const S = getS();
  const r = rosterOf(S);
  const seg = rosterSeg(top.rail);
  const pick = (id) => { menus3Bus.keep({ rail: id, scroll: 0 }); menus3Bus.bump(); };
  const c = caps(S);
  const full = r.bar.kind === 'party' && r.bar.full;
  useEffect(() => {
    try {
      window.__btMenus3Roster = { seg, party: r.bar.kind, n: r.bar.n || 0, members: (r.bar.members || []).map((m) => m.id), ally: r.ally ? r.ally.kind : null,
        counts: r.n, nearby: r.near.map((x) => x.id), friends: r.friends.map((x) => x.fid), requests: r.reqIn.slice(), sent: r.reqOut.slice(), blocked: r.blockList.map((b) => b.id) };
    } catch (e) { /* no window */ }
  });
  let body;
  if (seg === 'friends') {
    const searchable = r.friends.length > 8;
    const q = query.trim().toLowerCase();
    const rows = searchable && q ? r.friends.filter((x) => x.name.toLowerCase().includes(q)) : r.friends;
    body = (
      <>
        <div className="m3-acts">
          <button type="button" className={'u2-raised u2-ctl m3-door' + (showAdd ? ' is-selected' : '')} aria-pressed={showAdd} data-m3-add-friend=""
            onClick={() => setShowAdd((v) => !v)}><PlusIcon /><span>{say(SAY, 'menus3Roster.addFriend')}</span></button>
        </div>
        {showAdd ? (
          <div className="m3-today-words is-col" data-m3-add-how="">
            <span>{deskWords('Tap another player anywhere in BroTown to view their profile and add them as a friend.')}</span>
            <button type="button" className="u2-raised u2-ctl m3-door" data-m3-invite-link=""
              onClick={async () => { const x = await shareInvite(); setShared(x === 'copied' ? say(SAY_S, 'socialDash.linkCopied') : ''); }}>
              {shared || say(SAY_S, 'socialDash.share')}</button>
          </div>
        ) : null}
        {searchable ? <input className="m3-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={say(SAY_S, 'socialDash.search')} data-m3-friend-search="" /> : null}
        {rows.length ? rows.map((x) => (
          <Row key={x.fid} id={String(x.fid)} name={x.name} color={x.peer && x.peer.color} sub={friendSub(x)} hooks={{ 'data-m3-friend': x.fid, 'data-m3-friend-online': x.online ? '1' : '0' }}>
            {canWhisper(S, x.name) ? <Ui2Action intent="go" label={say(SAY, 'menus3Roster.message')} data-m3-row-act="message" style={{ flex: 'none' }} onClick={() => whisper(x.name)} /> : null}
          </Row>
        )) : <Ui2Empty kind="absent" title={say(SAY_S, r.friends.length ? 'socialDash.noMatches' : 'socialDash.noFriends')} />}
      </>
    );
  } else if (seg === 'requests') {
    body = r.reqIn.length || r.reqOut.length ? (
      <>
        {r.reqIn.map((fid) => {
          const nm = (r.doc && r.doc.reqIn && r.doc.reqIn[fid] && r.doc.reqIn[fid].name) || fid;
          return (
            <div key={fid} className="m3-req" data-m3-request={fid}>
              <span className="m3-row-name"><b>{nm}</b><span className="m3-muted">{say(SAY_S, 'socialDash.wantsBros')}</span></span>
              <div className="m3-acts">
                <Ui2Action intent="commit" c="green" label={say(SAY_S, 'socialDash.accept')} data-m3-req-act="accept" style={{ flex: '1 1 0' }} onClick={() => sendIf(S, 'friend_accept', { from: fid })} />
                <Ui2Action intent="adjust" label={say(SAY_S, 'socialDash.decline')} data-m3-req-act="decline" style={{ flex: '1 1 0' }} onClick={() => sendIf(S, 'friend_decline', { from: fid })} />
              </div>
            </div>
          );
        })}
        {r.reqOut.length ? <span className="m3-counters-head">{say(SAY_S, 'socialDash.sent')}</span> : null}
        {r.reqOut.map((fid) => (
          <div key={fid} className="m3-line m3-sent" data-m3-sent={fid}>
            <span className="m3-row-name">{(r.doc && r.doc.reqOut && r.doc.reqOut[fid] && r.doc.reqOut[fid].name) || fid}</span>
            <span className="m3-muted">{say(SAY_S, 'socialDash.pending')}</span>
          </div>
        ))}
      </>
    ) : <Ui2Empty kind="absent" title={say(SAY_S, 'socialDash.noRequests')} />;
  } else if (seg === 'blocked') {
    body = r.blockList.length ? r.blockList.map((b) => (
      <Row key={b.id} id={b.id} name={b.name} hooks={{ 'data-m3-blocked': b.id }}>
        <Ui2Action intent="commit" label={say(SAY, 'menus3Roster.unblock')} data-m3-row-act="unblock" style={{ flex: 'none' }}
          onClick={() => { unblockPlayer(S, b.id); force((v) => (v + 1) % 1e9); }} />
      </Row>
    )) : <Ui2Empty kind="absent" title={say(SAY, 'menus3Roster.noneBlocked')} />;
  } else {
    body = r.near.length ? r.near.map((x) => {
      const sub = [x.level != null ? say(SAY, 'menus3Roster.lv', { lv: x.level }) : '', x.party ? say(SAY, 'menus3Roster.inParty') : x.friend ? say(SAY, 'menus3Roster.friend') : '', x.bros ? brosWord(x.bros) : ''].filter(Boolean).join(' · ');
      return (
        <Row key={x.id} id={x.id} name={x.name} color={x.color} sub={sub} hooks={{ 'data-m3-near': x.id }}>
          {c.party && !x.party && !full ? <Ui2Action intent="commit" label={say(SAY, 'menus3Roster.invite')} data-m3-row-act="invite" style={{ flex: 'none' }}
            onClick={() => sendIf(S, 'party_invite', { target: x.id })} /> : null}
        </Row>
      );
    }) : <Ui2Empty kind="absent" title={say(SAY, 'menus3Roster.noneNearby')} />;
  }
  return (
    <div className="m3-roster" data-m3-roster={seg}>
      <PartyBar S={S} bar={r.bar} ally={r.ally} onCreate={() => pick('nearby')} onPlayer={(id) => menus3Bus.push('player', id, { rail: seg })} />
      <div className="m3-rail" role="group" aria-label={say(SAY, 'menus3Roster.segAria')}>
        {MENUS3_ROSTER_SEGS.map((id) => (
          <button key={id} type="button" className={'u2-raised u2-ctl m3-pill' + (id === seg ? ' is-selected' : '')} data-m3-seg={id} aria-pressed={id === seg}
            onClick={() => pick(id)}>
            {id === 'requests' && r.n.requests > 0 && seg !== 'requests' ? <span className="m3-chip-dot" aria-hidden="true" /> : null}
            {segWord(id, r.n)}
          </button>
        ))}
      </div>
      <div className="m3-plist" data-m3-plist={seg}>{body}</div>
      {/* today's Social page keeps what this step does not carry yet: a friend's message thread
          (friend_dm) and the Guilds door (card MN steps 6 and 11) */}
      <button type="button" className="u2-raised u2-ctl m3-qlink m3-door" data-m3-old-social=""
        onClick={() => menus3Away(() => dashboardPanelBus.open('socialHub'))}>
        <span className="m3-row-name">{say(SAY, 'menus3Roster.oldSocial')}</span><ChevIcon />
      </button>
    </div>
  );
}

/* ── THE PLAYER PAGE ── */
function factsOf(S, id) {
  const names = Object.create(null);
  const doc = caps(S).friends ? friendsSrv.doc() : null;
  if (doc) {
    for (const k of Object.keys(doc.reqIn || {})) if (doc.reqIn[k] && doc.reqIn[k].name) names[k] = doc.reqIn[k].name;
    for (const k of Object.keys(doc.reqOut || {})) if (doc.reqOut[k] && doc.reqOut[k].name) names[k] = doc.reqOut[k].name;
  }
  for (const b of getBlocked(S)) if (b && typeof b === 'object' && b.id != null && b.name) names[String(b.id)] = b.name;
  const h = _hints.get(String(id));   /* v2.3.6870: a chat line's or a ranks row's name, last */
  if (h && h.name && !(String(id) in names)) names[String(id)] = h.name;
  return playerFacts(id, { others: (S && S.others) || null, party: S && S._party && S._party.state === 'open' ? S._party : null, friends: getFriendRows(S), names });
}
function factsSub(f) {
  const parts = [];
  if (f.level != null) parts.push(say(SAY, 'menus3Roster.lv', { lv: f.level }));
  if (f.where === 'here') parts.push(say(SAY, 'menus3Roster.here'));
  else if (f.zoneName && f.online) parts.push(say(SAY_S, 'socialDash.online') + say(SAY_S, 'socialDash.inZone', { zone: f.zoneName }));
  else if (f.lastSeen) parts.push(say(SAY_S, 'socialDash.offlineSeen', { seen: lastSeenText(f.lastSeen) }));
  else parts.push(say(SAY, 'menus3Roster.away'));
  return parts.join(' · ');
}

export function Menus3Player({ getS, id }) {
  const [, force] = useState(0);
  const [armed, setArmed] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState('');
  const noteT = useRef(0);
  useEffect(() => friendsSrv.subscribe(() => force((v) => (v + 1) % 1e9)), []);
  useEffect(() => () => clearTimeout(noteT.current), []);
  const S = getS();
  const f = factsOf(S, id);
  const c = caps(S);
  const bar = partyBar(S && S._party, S && S.myId);
  const inMyParty = bar.kind === 'party' && bar.members.some((m) => m.id === f.id);
  const friendRow = getFriendRows(S).find((r) => String(r.fid) === f.id) || null;
  const blocked = isBlockedId(f.id);
  const muted = readMutedIds().indexOf(f.id) >= 0;
  const lawless = !!(ZONES[S && S.currentZone] && ZONES[S && S.currentZone].lawless);
  const acts = playerActs({ me: !!S && String(S.myId) === f.id, here: f.where === 'here', caps: c, name: f.name, inMyParty, iLead: bar.kind === 'party' && bar.iLead,
    friend: !!friendRow, friendSrv: !!(friendRow && friendRow.srv), muted, blocked, lawless,
    rowCard: !!(_hints.get(f.id) && _hints.get(f.id).who) });   /* v2.3.6870: a ranks row's card */
  useClock(() => [f.where, f.level, f.name, inMyParty ? 1 : 0, friendRow ? 1 : 0, blocked ? 1 : 0, muted ? 1 : 0, acts.map((a) => a.id).join(',')].join('|'), 1000);
  useEffect(() => {
    try { window.__btMenus3Player = { id: f.id, name: f.name, level: f.level, where: f.where, acts: acts.map((a) => a.id), note }; } catch (e) { /* no window */ }
  });
  const tell = (k) => {
    setNote(typeof k === 'function' ? k() : '');
    clearTimeout(noteT.current);
    noteT.current = setTimeout(() => setNote(''), 4000);
    force((v) => (v + 1) % 1e9);
  };
  const hint = _hints.get(f.id) || null;
  const openCard = () => {
    /* v2.3.6870: a player not here, from a ranks row: today's Character page fed by the row, its Back the panel */
    if (f.where !== 'here' && hint && hint.who) { menus3Away(() => dashboardPanelBus.push('broCharacter', { who: hint.who })); return; }
    menus3Bus.close();
    try { if (window.__broInspectPlayer) window.__broInspectPlayer(f.id); } catch (e) { /* no card */ }
  };
  const run = (a) => {
    if (a.two && a.id !== 'report') {
      const r = armTap(armed, a.id, Date.now());
      setArmed(r.armed);
      if (!r.fire) return;
    }
    switch (a.id) {
      case 'message': whisper(f.name); return;
      case 'invite': sendIf(S, 'party_invite', { target: f.id }); tell(SENT_WORD.invite); return;
      case 'kick': sendIf(S, 'party_kick', { target: f.id }); tell(SENT_WORD.kick); return;
      case 'trade':
        /* the card's: the two-sided window where the worker has it (its drawer joins the bag, so the
           panel goes); else the old one-way gift, which only the card opens */
        if (c.trade2 && S && S.channel) { menus3Bus.close(); sendIf(S, 'trade2_open', { target: f.id }); } else openCard();
        return;
      case 'duel': sendIf(S, 'duel_wager_request', { target: f.id, from: S.myId, fromName: S.myName, wager: 0 }); tell(SENT_WORD.duel); return;
      case 'friend':
        addFriend(S, f.id, f.name, (S && S.others && S.others[f.id] && S.others[f.id].color) || undefined);
        if (c.friends) sendIf(S, 'friend_request', { target: f.id, name: f.name });
        tell(SENT_WORD.friend); return;
      case 'unfriend':
        if (friendRow && friendRow.srv && c.friends) sendIf(S, 'friend_remove', { fid: f.id });
        removeFriend(S, f.id); tell(SENT_WORD.unfriend); return;
      case 'card': openCard(); return;
      case 'mute': setMuted(S, f.id, true, f.name); tell(SENT_WORD.mute); return;
      case 'unmute': setMuted(S, f.id, false, f.name); tell(SENT_WORD.unmute); return;
      case 'block': setBlock(S, f.id, true, f.name); tell(SENT_WORD.block); return;
      case 'unblock': unblockPlayer(S, f.id); tell(SENT_WORD.unblock); return;
      case 'report': setReporting((v) => !v); return;
      default:
    }
  };
  const label = (a) => {
    if (a.id === 'kick' && armed && armed.id === 'kick') return say(SAY, 'menus3Roster.actKickSure');
    return wordOf(ACT_WORD, a.id);
  };
  return (
    <div className="m3-page m3-player" data-m3-player={f.id} data-m3-player-where={f.where}>
      <div className="m3-item-id">
        <Face name={f.name} color={S && S.others && S.others[f.id] && S.others[f.id].color} size={48} />
        <div className="m3-item-words">
          <span className="m3-item-name" data-m3-player-name="">{f.tag ? '[' + (allyTagShown(f.tag) || f.tag) + '] ' : ''}{f.name}</span>
          <span className="m3-item-sub" data-m3-player-sub="">{factsSub(f)}</span>
          <span className="m3-item-sub">{[inMyParty ? say(SAY, 'menus3Roster.inParty') : '', friendRow ? say(SAY, 'menus3Roster.friend') : '', f.bros ? brosWord(f.bros) : ''].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <div className="m3-pacts" data-m3-player-acts={acts.map((a) => a.id).join(' ')}>
        {acts.map((a) => (
          <Ui2Action key={a.id} intent={a.face} label={label(a)} data-m3-pact={a.id}
            data-m3-pact-armed={armed && armed.id === a.id ? '1' : undefined} aria-pressed={a.id === 'report' ? reporting : undefined} onClick={() => run(a)} />
        ))}
      </div>
      {reporting ? (
        <div className="m3-today-words is-col" data-m3-report="">
          <span>{say(SAY, 'menus3Roster.reportWhy')}</span>
          <div className="m3-pacts">
            {MENUS3_REPORT_REASONS.map((w) => (
              <Ui2Action key={w} intent="danger" label={wordOf(WHY_WORD, w)} data-m3-report-why={w}
                onClick={() => { reportPlayer(S, f.id, w); setReporting(false); tell(SENT_WORD.report); }} />
            ))}
          </div>
        </div>
      ) : null}
      {note ? <p className="m3-why" data-m3-player-note="" role="status">{note}</p> : null}
    </div>
  );
}

/** The header's title over a player's page: their name (the wireframe's). */
export function menus3PlayerTitle(getS, id) {
  try { return factsOf(getS(), id).name; } catch (e) { return say(SAY, 'menus3Roster.player'); }
}

/** People · Roster: the panel's body for the section (Menus3Panel.jsx). */
export function Menus3Roster({ getS, top }) {
  if (!top) return null;
  if (top.page === 'player') return <Menus3Player key={'p' + top.arg} getS={getS} id={top.arg} />;
  if (top.page === 'whisper') return null;   /* v2.3.6870: a Message's whisper is Chat's (Menus3Panel.jsx) */
  return <RosterRoot getS={getS} top={top} />;
}
