/* ═══ v2.3.3313: THE ALLIANCE, ON THE PHONE (server alliance.js) ═══
 *
 * docs/specs/alliance.md.  A party of 20 active members (played in the last
 * 7 days, level 5 or more) is an alliance until it falls below 15: its leader
 * names it and gives it a tag, it fights 30-minute wars in No man's land, and
 * a board ranks every alliance by active members, then levels.
 *
 * NOTHING HERE DECIDES ANYTHING.  Whether your party is an alliance, its
 * name, its war and the board are the worker's (party_state's `ally`,
 * alliance_rows); this file only keeps the worker's last answers for the
 * Saloon to draw (the farmBus shape: written by a WebSocket handler, read by a
 * window that may not be open), sends the three requests, and words the
 * refusals.  The requests go only against caps.alliance (an older worker
 * would relay them to the room). */
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

const TAG_RE = /^[A-Z0-9]{1,4}$/;

/* a tag fit to draw: the worker's own shape, or nothing */
export function allyTagShown(tag) {
  return typeof tag === 'string' && TAG_RE.test(tag) ? tag : null;
}

/* a name plate's text: "[TAG] Name" while the player is in an alliance */
export function plateNameWithTag(name, tag) {
  const t = allyTagShown(tag);
  return t ? '[' + t + '] ' + name : name;
}

/* your party's alliance block, as the worker last sent it, or null */
export function allyOf(S) {
  const p = S && S._party;
  return p && p.state === 'open' && p.ally && typeof p.ally === 'object' ? p.ally : null;
}

export function allyCapsOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.alliance && S._serverCaps.partykeep);
}

/* v2.3.3320: clans are parties now (server clanparty.js) -- the clan windows
   point to the Saloon only against a worker that says so */
export function clanPartyOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.clanparty && S._serverCaps.partykeep);
}

/* the tag on your own plate: an alliance's, or (v2.3.3320) a former clan's,
   which its members wear below 20 too -- the worker's own rule (_allyTagOf) */
export function myAllyTag(S) {
  const a = allyOf(S);
  return a && (a.on || a.clan) ? allyTagShown(a.tag) : null;
}

/* "5 h", "12 min", "40 s" */
export function waitWords(ms) {
  const s = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  if (s >= 3600) return Math.ceil(s / 3600) + ' h';
  if (s >= 60) return Math.ceil(s / 60) + ' min';
  return s + ' s';
}

const ERR = {
  'off': () => 'Alliances are switched off right now',
  'no-party': () => "You're not in a party",
  'not-leader': () => 'Only the party leader can do that',
  'not-alliance': (e) => 'Your party needs ' + (e.at || 20) + ' active members to be an alliance' + (e.active >= 0 ? ' (' + e.active + ' now)' : ''),
  'bad-name': () => 'A name is 3 to 16 characters',
  'bad-tag': () => 'A tag is 1 to 4 letters or numbers',
  'rename-wait': (e) => 'You can rename it again in ' + waitWords(e.ms),
  'not-loaded': () => 'Try again in a moment',
  'tag-taken': (e) => 'The tag [' + (allyTagShown(e.tag) || '?') + '] is taken',
  'name-taken': (e) => (typeof e.name === 'string' ? '"' + e.name.slice(0, 16) + '"' : 'That name') + ' is taken',
  'no-name': () => 'Name your alliance first',
  'self': () => "That's your own alliance",
  'no-such': (e) => 'No alliance has the tag [' + (allyTagShown(e.tag) || '?') + ']',
  'not-alliance-them': (e) => '[' + (allyTagShown(e.tag) || '?') + "] isn't an alliance right now",
  'at-war': () => 'Your alliance is already at war',
  'them-at-war': (e) => '[' + (allyTagShown(e.tag) || '?') + '] is already at war',
  'rest': (e) => 'Your alliance fought a war less than an hour ago (' + waitWords(e.ms) + ' to go)',
  'rest-them': (e) => '[' + (allyTagShown(e.tag) || '?') + '] fought a war less than an hour ago (' + waitWords(e.ms) + ' to go)',
};

export function allyErrorText(p) {
  const e = p && typeof p === 'object' ? p : {};
  const f = Object.prototype.hasOwnProperty.call(ERR, e.reason) ? ERR[e.reason] : null;
  return f ? f(e) : 'That did not work';
}

/* alliance_war_end: what the war ended as, and what it paid you */
export function allyWarEndText(p) {
  if (!p || typeof p !== 'object') return '';
  const vs = '[' + (allyTagShown(p.vs) || '?') + ']';
  const score = (p.us | 0) + '–' + (p.them | 0);
  const head = p.won === true ? 'Victory over ' + vs : p.won === false ? 'Defeat by ' + vs : 'Draw with ' + vs;
  return head + ' ' + score + (p.paid > 0 ? ' · +' + (p.paid | 0) + 'G' : '');
}

/* party_state's moments: `became`, `war`, `renamed` -> a line, or null */
export function allyMomentText(payload) {
  if (!payload || typeof payload !== 'object' || !payload.ally) return null;
  const a = payload.ally;
  const tag = allyTagShown(a.tag);
  /* v2.3.3320: the moment a clan became this party (clanparty.js) */
  if (payload.fromClan) return 'Your clan' + (tag ? ' [' + tag + ']' : '') + ' is a party now: ' + (a.at || 20) + ' active members make it an alliance';
  if (payload.became === 'alliance') return 'Your party is an ALLIANCE now!' + (tag ? ' [' + tag + ']' : '');
  if (payload.became === 'party') return 'Your alliance is a party again (under ' + (a.drop || 15) + ' active)';
  if (payload.renamed && tag) return 'Your alliance is [' + tag + '] ' + (a.name || '');
  const w = a.war;
  if (payload.war === 'start' && w && w.them) return 'WAR with [' + (allyTagShown(w.them.tag) || '?') + '] for 30 minutes, in No man\'s land';
  if (payload.war === 'kill' && w && w.them) return 'War: ' + (w.us | 0) + '–' + (w.them.score | 0) + ' vs [' + (allyTagShown(w.them.tag) || '?') + ']';
  return null;
}

export const allyBus = {
  /* {rows: [{name, tag, active, total, members}], n, mine, at} or null */
  board: null,
  /* the last refusal: {reason, text, at} */
  error: null,
  /* the last war's end: {text, at, won, paid} */
  warEnd: null,
  /* bumped on every change: the window's useSyncExternalStore snapshot */
  rev: 0,

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  getSnapshot() { return allyBus.rev; },

  /* the three answers, from wsClient's direct switch */
  apply(type, payload) {
    const now = Date.now();
    if (type === 'alliance_rows') {
      const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];
      this.board = { rows, n: (payload && payload.n) | 0, mine: (payload && payload.mine) || null, at: now };
    } else if (type === 'alliance_error') {
      this.error = { reason: payload && payload.reason, text: allyErrorText(payload), at: now };
    } else if (type === 'alliance_war_end') {
      this.warEnd = { text: allyWarEndText(payload), won: payload ? payload.won : null, paid: (payload && payload.paid) | 0, at: now };
    } else return;
    this.rev += 1;
    emit();
  },

  /* the three requests, each a literal send so precheck's shim-allowlist
     check sees every type; false when there is nothing to send on */
  name(S, name, tag) {
    if (!S || !S.channel || !allyCapsOn(S)) return false;
    this.error = null; this.rev += 1; emit();
    try { S.channel.send({ type: 'alliance_name', payload: { name: String(name || ''), tag: String(tag || '') } }); } catch (e) { return false; }
    return true;
  },
  war(S, tag) {
    if (!S || !S.channel || !allyCapsOn(S)) return false;
    this.error = null; this.rev += 1; emit();
    try { S.channel.send({ type: 'alliance_war', payload: { tag: String(tag || '') } }); } catch (e) { return false; }
    return true;
  },
  askBoard(S) {
    if (!S || !S.channel || !allyCapsOn(S)) return false;
    try { S.channel.send({ type: 'alliance_board', payload: {} }); } catch (e) { return false; }
    return true;
  },
};
