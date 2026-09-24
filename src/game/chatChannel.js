/* ═══ WHICH LANE AM I TALKING IN? (v2.3.2139) ═══
 *
 * v2.3.2136 added the lanes -- /a to your zone, /w to one player -- and
 * docs/specs/chat-lanes.md said in as many words what was deliberately left
 * out: "No channel picker UI.  The lanes are slash commands, matching /p...
 * A channel selector is a reasonable follow-up and is a pure client change --
 * the wire surface does not need to move for it."  This is that follow-up.
 * Not one byte of the protocol changes: the picker composes the same line a
 * player could have typed.
 *
 * Same 13-line bus shape as controlsTutorialBus / infoPopupBus, but it lives
 * in game/ rather than ui/mobile/ ON PURPOSE -- see below.
 *
 * ═══ ONE CALL SITE, WHICH IS WHY THIS IS NOT A UI MODULE ═══
 * There are TWO composers -- the legacy ChatPanel and the mobile ChatBubble
 * textarea -- and chat.js's own neighbours record what happens when they
 * drift: ChatBubble used to send on its own instead of through
 * sendChatMessage, and "/p" went out over the ROOM relay to every player in
 * the world instead of to the party.  That note states the rule this module
 * is built to obey: "a private lane that silently isn't private is worse than
 * not having one."
 *
 * A picker in ui/mobile/ would have had to be applied by each composer, which
 * is two call sites and the same drift waiting to happen again.  Living in
 * game/ instead, sendChatMessage -- the ONE function both composers already
 * route through -- applies it itself.  Neither composer knows how a lane is
 * spelled; they only set the mode.  The chips in ui/mobile/ import from here,
 * which is the direction the layering already runs.
 *
 * ═══ WHISPER IS NEVER REMEMBERED ═══
 * The channel persists across a reload -- except whisper, which always falls
 * back to All.  The two mistakes are not symmetric.  Believing you are in All
 * when you are in Whisper costs you nothing: the line goes to one person.
 * Believing you are in Whisper when you are in All publishes to the entire
 * world something you chose to say privately.  Only one of those is worth
 * defending against, so the persisted value is deliberately lossy in the safe
 * direction.
 */

const LS_KEY = 'bt_chat_lane';

export const CHAT_LANES_UI = [
  { id: 'all',     label: 'All',     cap: null,       color: '#F4F0E7', hint: 'Everyone in the world' },
  { id: 'area',    label: 'Area',    cap: 'areaChat', color: '#7FB2FF', hint: 'Everyone in this zone' },
  { id: 'whisper', label: 'Whisper', cap: 'whisper',  color: '#C79BFF', hint: 'One player, by name' },
  /* v2.3.2820 (demo audit: "no party chat chip -- /p must be typed"): the
     same /p line chat.js has routed to the party since v2.3.1212, offered
     as a chip -- and ONLY while you are in a party (inParty below), so the
     chip cannot exist when the lane has nobody in it. */
  { id: 'party',   label: 'Party',   cap: 'partyChat', color: '#6FD49A', hint: 'Only your party', needsParty: true },
];

/* v2.3.2820: the same test chat.js applies before it will send a /p line. */
const inParty = () => {
  try {
    const S = window._gameState && window._gameState.current;
    return !!(S && S._party && Array.isArray(S._party.members) && S._party.members.length > 0);
  } catch (e) { return false; }
};

const load = () => {
  try {
    const v = localStorage.getItem(LS_KEY);
    /* 'whisper' is never restored -- see the header. */
    return (v === 'area') ? 'area' : 'all';
  } catch (e) { return 'all'; }
};

let _mode = load();
let _to = '';
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const chatChannelBus = {
  mode() { return _mode; },
  to() { return _to; },
  setMode(m) {
    _mode = (m === 'area' || m === 'whisper' || m === 'party') ? m : 'all';
    if (_mode !== 'whisper') _to = '';
    try { localStorage.setItem(LS_KEY, _mode === 'area' ? 'area' : 'all'); } catch (e) {}
    emit();
  },
  setTo(v) { _to = typeof v === 'string' ? v.slice(0, 24) : ''; emit(); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** Which lanes this worker can actually carry.  A lane whose cap is absent
   *  is not offered AT ALL rather than offered and refused: an un-upgraded
   *  worker has no case for the type, so it would fall through to the default
   *  branch and rebroadcast the line to the whole room (rule 19 / TRAPS #9).
   *  A picker that can select a lane the server would shout is the bug this
   *  whole module is shaped to avoid. */
  available() {
    let caps = null;
    try {
      const S = window._gameState && window._gameState.current;
      caps = (S && S._serverCaps) || null;
    } catch (e) { caps = null; }
    return CHAT_LANES_UI.filter((l) => (!l.cap || !!(caps && caps[l.cap])) && (!l.needsParty || inParty()));
  },

  /** Turn what the player typed into the line to send, or null to refuse.
   *
   *  Returns { text } to send, or { refuse } with a reason to show.  Never
   *  returns a room-wide line for a private lane -- refusing is the correct
   *  failure and the one the party-chat leak taught. */
  compose(raw) {
    const t = (typeof raw === 'string' ? raw : '').trim();
    if (!t) return { refuse: null };            /* nothing typed; say nothing */
    /* An explicit prefix the player typed WINS.  Someone who knows /p or /w
       should not have it doubled up by the picker's state. */
    if (/^\/(p|a|w)\s/i.test(t)) return { text: t };
    const ok = this.available().some((l) => l.id === _mode);
    /* v2.3.2820: a PARTY line whose party has gone is refused, not sent to
       the room -- the header's rule: a private lane that silently isn't
       private is worse than not having one.  (Area falling back to the room
       is the old, deliberate behaviour: an area line is public anyway.) */
    if (!ok && _mode === 'party') {
      /* ...and drop back to All, so the chips (which no longer draw a Party
         chip) and the next send agree about where a line goes. */
      this.setMode('all');
      return { refuse: 'You are no longer in a party — not sent. Switched to All.' };
    }
    if (!ok) return { text: t };                /* lane vanished: room is the honest fallback */
    if (_mode === 'party') return { text: '/p ' + t };
    if (_mode === 'area') return { text: '/a ' + t };
    if (_mode === 'whisper') {
      const to = _to.trim();
      if (!to) return { refuse: 'Pick who to whisper to first — not sent.' };
      if (/\s/.test(to)) return { refuse: 'A whisper goes to one name, with no spaces — not sent.' };
      return { text: '/w ' + to + ' ' + t };
    }
    return { text: t };
  },
};

/* QA handle, same house pattern as __btCtlTut / __btInfoPopup: the picker is
   inside a React tree with no URL, and a scenario has to be able to select a
   lane and read back what compose() would send. */
try {
  if (typeof window !== 'undefined') window.__btChatLane = chatChannelBus;
} catch (e) {}
