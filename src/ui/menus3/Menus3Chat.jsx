/* ═══ v2.3.6870: PEOPLE · CHAT IN THE NEW PANEL (card MN step 11) ═══
 *
 * The owner's ONE chat box, the same on a phone and a computer (SPEC
 * "unified single chat box across mobile & desktop"), drawn as the
 * wireframe v4.4 draws it: the channels' rail, the log, the composer (the
 * Emotes smiley at its left, the box, Send at its right).  Everything it
 * shows or sends is today's:
 *   - THE LOG is the HUD's own (S.chatLog, chatLogBus), each tab its lane
 *     (src/game/menus3Chat.js chatLines); a player's name opens their Player
 *     page (Menus3Roster.jsx menus3OpenPlayer), with the line's name kept for
 *     a player the phone does not hold.  The newest at the foot: the list is
 *     drawn bottom up (column-reverse), so nothing measures the page to keep
 *     it there (docs/specs/layout-reads.md);
 *   - A LINE leaves through sendChatMessage (game/chat.js), the one sender
 *     both of today's composers use: the tab sets the lane (chatChannel.js
 *     setMode, setTo) and the sender spells it and sends the game's own
 *     request by act() (chat, area_chat, party_chat, whisper);
 *   - WHISPERS: the whisper lane's lines, a "to" box (a whisper goes to one
 *     name: chatChannel.js compose's rule; the wireframe draws none, the game
 *     needs one), and the friends' threads (friend_dm, moved here from the
 *     Social page: SocialPanel.jsx's thread, its send, its unread counts:
 *     friendsSync.js), a thread its own page over Chat;
 *   - NEWS: the game's own lines, read only; opening it marks them seen (the
 *     mark the Notifications page and the HUD's feed share, notifBus.js),
 *     and the Notifications page's "Show on screen" for the HUD's feed;
 *   - THE SMILEY opens today's picker (EmotePanel.jsx): the panel steps aside
 *     for it and comes back on Chat when it shuts (menus3Wire.js
 *     menus3AwayChat, the Roster's way);
 *   - THE MICROPHONE: today's chat box's (ChatBubble.jsx), where the browser
 *     has speech to text, never drawn where it has not.
 * No chat rule, mute, block or moderation is here: those are the sender's
 * and the handlers' (chat.js, chatMute.js), unchanged. */
import React, { useEffect, useRef, useState } from 'react';
import { chatLogBus } from '@/ui/mobile/chatLogBus.js';
import { notifBus } from '@/ui/mobile/notifBus.js';
import { friendsSrv } from '@/ui/mobile/sheet/friendsSync.js';
import { getFriendRows } from '@/ui/mobile/sheet/friendsModel.js';
import { chatChannelBus } from '@/game/chatChannel.js';
import { sendChatMessage } from '@/game/chat.js';
import { chatLaneOf, CHAT_LANE_ICON } from '@/data/smallIcons.js';
import { chatNameColor } from '@/game/chatColor.js';
import { emotesLive } from '@/game/emotes.js';
import { dictationClose, dictationOwns } from '@/game/dictation.js';
import { act } from '@/game/actions.js';
import { deskWords } from '@/game/deskWords.js';
import { chatTabs, chatTab, chatLines, lineDoor, lineKind, newsUnread, newsNewest, dmRows, whisperTo, MENUS3_CHAT_SENDS } from '@/game/menus3Chat.js';
import { Ui2Action } from '@/ui/kit/Action.jsx';
import { menus3Bus, menus3AwayChat } from './menus3Wire.js';
import { menus3OpenPlayer } from './Menus3Roster.jsx';
import { SAY } from '@/data/say/menus3Chat.js';
import { SAY as SAY_S } from '@/data/say/socialDash.js';
import { say } from '@/game/say.js';

/* the words, each key written out (the say guard reads them) */
const TAB_WORD = {
  all: () => say(SAY, 'menus3Chat.all'), area: () => say(SAY, 'menus3Chat.area'), party: () => say(SAY, 'menus3Chat.party'),
  whispers: () => say(SAY, 'menus3Chat.whispers'), news: () => say(SAY, 'menus3Chat.news'),
};
const tabWord = (t) => (Object.prototype.hasOwnProperty.call(TAB_WORD, t) ? TAB_WORD[t]() : '');
function placeholder(tab, to) {
  if (tab === 'area') return say(SAY, 'menus3Chat.toArea');
  if (tab === 'party') return say(SAY, 'menus3Chat.toParty');
  if (tab === 'whispers') return to ? say(SAY, 'menus3Chat.toWhisper', { name: to }) : say(SAY, 'menus3Chat.toWhisperNone');
  return say(SAY, 'menus3Chat.toAll');
}

const inParty = (S) => !!(S && S._party && Array.isArray(S._party.members) && S._party.members.length > 0);
const SpeechRec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition || null) : null;

/* a redraw on any of today's chat stores changing (no clock) */
function useChatStores() {
  const [, force] = useState(0);
  useEffect(() => {
    const bump = () => force((v) => (v + 1) % 1e9);
    const offs = [chatLogBus.subscribe(bump), notifBus.subscribe(bump), friendsSrv.subscribe(bump), chatChannelBus.subscribe(bump)];
    return () => { for (const off of offs) { try { off(); } catch (e) { /* gone */ } } };
  }, []);
}

/* the icons, drawn (CLAUDE.md: no text glyph) */
function SmileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="8" cy="9" r="1.3" fill="currentColor" /><circle cx="14" cy="9" r="1.3" fill="currentColor" />
      <path d="M7 13.2 Q11 16.6 15 13.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function MicIcon({ on }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="7" y="2" width="6" height="10" rx="3" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 9.5 Q4.5 15 10 15 Q15.5 15 15.5 9.5 M10 15 V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* today's chat box's microphone (ChatBubble.jsx dictate: append, never replace; closed with the box) */
function useMic(setVal) {
  const [mic, setMic] = useState('idle');
  const recRef = useRef(null);
  useEffect(() => () => { dictationClose(recRef); }, []);
  const toggle = () => {
    if (!SpeechRec) return;
    if (mic !== 'idle') { try { recRef.current && recRef.current.stop(); } catch (e) { /* gone */ } return; }
    let rec;
    try { rec = new SpeechRec(); } catch (e) { return; }
    recRef.current = rec;
    rec.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      if (!dictationOwns(recRef, rec)) return;
      let said = '';
      try { said = ((ev.results[0] || [])[0] || {}).transcript || ''; } catch (e) { said = ''; }
      said = said.trim();
      if (said) setVal((cur) => (cur ? cur.replace(/\s+$/, '') + ' ' + said : said).slice(0, 200));
    };
    rec.onspeechend = () => { if (dictationOwns(recRef, rec)) setMic((m) => (m === 'listening' ? 'thinking' : m)); };
    rec.onaudioend = () => { if (dictationOwns(recRef, rec)) setMic((m) => (m === 'listening' ? 'thinking' : m)); };
    rec.onend = () => { if (!dictationOwns(recRef, rec)) return; setMic('idle'); recRef.current = null; };
    rec.onerror = () => { if (dictationOwns(recRef, rec)) setMic('idle'); };
    try { rec.start(); setMic('listening'); } catch (e) { setMic('idle'); }
  };
  return [mic, toggle];
}

/* one line of the log: the lane's picture, the name (a door to the player), the words */
function Line({ m, myId }) {
  const lane = m.name ? chatLaneOf(m.name) : null;
  const name = lane ? lane.rest : m.name;
  const door = lineDoor(m, myId);
  const kind = lineKind(m, chatLaneOf);
  return (
    <div className="m3-cline" data-m3-cline={kind}>
      {m.name ? (
        door ? (
          <button type="button" className="m3-cname" data-m3-cname={door} style={{ color: chatNameColor(m.color) }}
            onClick={() => menus3OpenPlayer(door, { name })}>
            {lane ? <img src={CHAT_LANE_ICON[lane.lane]} alt={lane.lane} width={16} height={16} draggable={false} className="m3-clane" /> : null}
            {name}:
          </button>
        ) : (
          <b className="m3-cname is-plain" style={{ color: chatNameColor(m.color) }}>
            {lane ? <img src={CHAT_LANE_ICON[lane.lane]} alt={lane.lane} width={16} height={16} draggable={false} className="m3-clane" /> : null}
            {name}:
          </b>
        )
      ) : null}
      <span className={m.name ? (m.muted ? 'm3-ctext is-muted' : 'm3-ctext') : 'm3-ctext is-news'}>{m.text}</span>
    </div>
  );
}

/* the log, newest at the foot (drawn bottom up: column-reverse keeps the foot in view, no measuring) */
function Log({ lines, myId, empty }) {
  const rows = lines.slice().reverse();
  return (
    <div className="m3-clog" data-m3-clog={lines.length} role="log" aria-live="polite">
      {rows.length ? rows.map((m, i) => <Line key={(m.ts || 0) + '-' + (rows.length - i)} m={m} myId={myId} />)
        : <p className="m3-why" data-m3-cempty="">{empty}</p>}
    </div>
  );
}

/* the composer: the smiley, the box, the microphone, Send */
function Composer({ S, tab, to, onSend, value, setValue }) {
  const [mic, toggleMic] = useMic(setValue);
  const emotesOn = emotesLive(S);
  const send = () => { if (onSend(value)) setValue(''); };
  return (
    <div className="m3-composer" data-m3-composer={tab}>
      {emotesOn ? (
        <button type="button" className="u2-raised u2-ctl m3-cicon" data-m3-emotes="" aria-label={say(SAY, 'menus3Chat.emotes')}
          onClick={() => menus3AwayChat(() => {
            const ui = typeof window !== 'undefined' ? window.__broLegacyUI : null;
            if (!ui || typeof ui.emotesOpen !== 'function') return false;
            ui.emotesOpen();
            return true;
          })}>
          <SmileIcon />
        </button>
      ) : null}
      <input className="m3-search m3-cinput" data-chat-input="" data-m3-cinput="" value={value} maxLength={200}
        placeholder={placeholder(tab, to)} enterKeyHint="send" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); send(); }
          else if (e.key === 'Escape') { e.currentTarget.blur(); }
        }} />
      {SpeechRec ? (
        <button type="button" className={'u2-raised u2-ctl m3-cicon' + (mic !== 'idle' ? ' is-selected' : '')} data-m3-mic={mic}
          aria-label={mic === 'idle' ? say(SAY, 'menus3Chat.mic') : say(SAY, 'menus3Chat.micOn')} aria-pressed={mic !== 'idle'} onClick={toggleMic}>
          <MicIcon on={mic !== 'idle'} />
        </button>
      ) : null}
      <Ui2Action intent="commit" label={say(SAY, 'menus3Chat.send')} data-m3-csend="" disabled={!value.trim()} style={{ flex: 'none' }} onClick={send} />
    </div>
  );
}

/* the friends' threads under Whispers: a rail of names, each its unread count */
function Friends({ S }) {
  const caps = (S && S._serverCaps) || {};
  if (!caps.friends) return null;
  const rows = dmRows(getFriendRows(S), (fid) => friendsSrv.unreadOf(fid));
  return (
    <div className="m3-cfriends" data-m3-cfriends={rows.length}>
      <span className="m3-counters-head">{say(SAY, 'menus3Chat.friends')}</span>
      {rows.length ? (
        <div className="m3-rail">
          {rows.map((r) => (
            <button key={r.fid} type="button" className="u2-raised u2-ctl m3-pill" data-m3-dm={r.fid}
              onClick={() => menus3Bus.push('dm', r.fid, { rail: 'whispers' })}>
              {r.unread > 0 ? <span className="m3-chip-dot" aria-hidden="true" /> : null}
              {r.name}{r.unread > 0 ? ' · ' + say(SAY, 'menus3Chat.unread', { n: r.unread }) : ''}
            </button>
          ))}
        </div>
      ) : <span className="m3-muted">{say(SAY, 'menus3Chat.friendsNone')}</span>}
    </div>
  );
}

/* a friend's thread (today's Social page's, moved): the archive, newest at the foot, and its send */
function Thread({ fid, getS }) {
  useChatStores();
  const [draft, setDraft] = useState('');
  useEffect(() => { friendsSrv.setOpenThread(fid); return () => friendsSrv.setOpenThread(null); }, [fid]);
  const S = getS();
  const row = getFriendRows(S).find((r) => String(r.fid) === String(fid)) || null;
  const name = row ? row.name : String(fid);
  const thread = friendsSrv.thread(fid);
  const send = () => {
    const text = draft.trim();
    if (!text || !S || !S.channel) return;
    try { act('friend_dm', { to: fid, text }); } catch (e) { return; }   /* today's request (SocialPanel.jsx sendDm) */
    friendsSrv.appendDm(fid, { from: 'me', fromName: 'You', text, ts: Date.now() }, true);   /* the worker never echoes to the sender */
    setDraft('');
  };
  const rows = thread.slice().reverse();
  return (
    <div className="m3-chat" data-m3-thread={fid}>
      <div className="m3-clog" data-m3-clog={thread.length}>
        {rows.length ? rows.map((m, i) => (
          <div key={i} className={'m3-dmline' + (m.mine ? ' is-mine' : '')} data-m3-dmline={m.mine ? 'mine' : 'theirs'}><span>{m.text}</span></div>
        )) : <p className="m3-why">{say(SAY_S, 'socialDash.sayHi', { name })}</p>}
      </div>
      <div className="m3-composer">
        <input className="m3-search m3-cinput" data-m3-dminput="" value={draft} maxLength={280} placeholder={say(SAY_S, 'socialDash.draft')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); send(); } }} />
        <Ui2Action intent="commit" label={say(SAY, 'menus3Chat.send')} data-m3-dmsend="" disabled={!draft.trim()} style={{ flex: 'none' }} onClick={send} />
      </div>
    </div>
  );
}

/* the page: the channels, the tab's log, its composer */
function ChatRoot({ top, getS }) {
  useChatStores();
  const S = getS();
  const caps = (S && S._serverCaps) || {};
  const tabs = chatTabs({ caps, inParty: inParty(S) });
  const aimed = top && top.page === 'whisper' ? String(top.arg || '') : null;
  const tab = chatTab(top && top.rail ? top.rail : aimed != null ? 'whispers' : 'all', tabs);
  const [to, setTo] = useState(() => (aimed != null ? aimed : chatChannelBus.mode() === 'whisper' ? chatChannelBus.to() : ''));
  const [drafts, setDrafts] = useState({});
  const value = drafts[tab] || '';
  const setValue = (v) => setDrafts((d) => Object.assign({}, d, { [tab]: typeof v === 'function' ? v(d[tab] || '') : v }));
  const log = (S && S.chatLog) || [];
  const lines = chatLines(log, tab, chatLaneOf);
  /* News open: its lines are seen (the shared mark) */
  const newest = tab === 'news' ? newsNewest(log) : 0;
  useEffect(() => { if (newest) notifBus.markSeen(newest); }, [newest]);
  const news = newsUnread(log, notifBus.seen, !notifBus.shut);
  const dms = caps.friends ? friendsSrv.unreadTotal() : 0;
  useEffect(() => {
    try { window.__btMenus3Chat = { tab, tabs: tabs.slice(), lines: lines.length, to, news, dms, mode: chatChannelBus.mode() }; } catch (e) { /* no window */ }
  });
  const pick = (t) => { menus3Bus.keep({ rail: t }); menus3Bus.bump(); };   /* kept on the page: Back to it finds it */
  const onSend = (raw) => {
    const text = String(raw || '').trim();
    if (!text || !S) return false;
    const lane = MENUS3_CHAT_SENDS[tab];
    if (!lane) return false;
    chatChannelBus.setMode(lane);
    if (lane === 'whisper') {
      const w = whisperTo(to);
      chatChannelBus.setTo(w.to);
    }
    try { sendChatMessage(S, text, { setChatLog: () => chatLogBus.bump() }); } catch (e) { return false; }
    return true;
  };
  return (
    <div className="m3-chat" data-m3-chat={tab}>
      <div className="m3-rail" role="tablist" aria-label={say(SAY, 'menus3Chat.tabsAria')}>
        {tabs.map((t) => (
          <button key={t} type="button" role="tab" className={'u2-raised u2-ctl m3-pill' + (t === tab ? ' is-selected' : '')} data-m3-ctab={t}
            aria-selected={t === tab} onClick={() => pick(t)}>
            {(t === 'news' && news > 0 && tab !== 'news') || (t === 'whispers' && dms > 0 && tab !== 'whispers') ? <span className="m3-chip-dot" data-m3-ctab-dot={t} aria-hidden="true" /> : null}
            {tabWord(t)}
          </button>
        ))}
      </div>
      {tab === 'whispers' ? <Friends S={S} /> : null}
      <Log lines={lines} myId={S && S.myId} empty={tab === 'news' ? say(SAY, 'menus3Chat.newsEmpty') : say(SAY, 'menus3Chat.empty')} />
      {tab === 'whispers' && caps.whisper ? (
        <input className="m3-search m3-cto" data-m3-cto="" value={to} maxLength={24} placeholder={say(SAY, 'menus3Chat.whisperTo')}
          aria-label={say(SAY, 'menus3Chat.whisperToAria')} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
          onChange={(e) => setTo(e.target.value)} />
      ) : null}
      {S && !S.channel ? <p className="m3-why">{say(SAY, 'menus3Chat.offline')}</p> : null}
      {tab === 'news' ? (
        <div className="m3-cnews">
          <span className="m3-muted">{say(SAY, 'menus3Chat.newsRead')} {deskWords(say(SAY, 'menus3Chat.newsHow'))}</span>
          <Ui2Action intent="go" data-m3-onscreen={notifBus.shut ? 'off' : 'on'} aria-pressed={!notifBus.shut} style={{ flex: 'none' }}
            label={notifBus.shut ? say(SAY, 'menus3Chat.onScreen') : say(SAY, 'menus3Chat.offScreen')}
            onClick={() => notifBus.setShut(!notifBus.shut)} />
        </div>
      ) : (tab !== 'whispers' || caps.whisper) ? (
        <Composer S={S} tab={tab} to={whisperTo(to).to} value={value} setValue={setValue} onSend={onSend} />
      ) : null}
    </div>
  );
}

/** People · Chat: the panel's body for the section, and for a Message's whisper from any section. */
export function Menus3Chat({ top, getS }) {
  if (!top) return null;
  if (top.page === 'player') return null;   /* the Player page is the panel's (Menus3Panel.jsx) */
  if (top.page === 'dm') return <Thread key={'dm' + top.arg} fid={String(top.arg)} getS={getS} />;
  return <ChatRoot key={top.page === 'whisper' ? 'w' + top.arg : 'root'} top={top} getS={getS} />;
}

export default Menus3Chat;
