/* ═══ v2.3.6864: PEOPLE · ROSTER AND THE PLAYER PAGE -- THEIR RULES (card MN step 10) ═══
 *
 * The owner's Roster (docs/design/menus3/SPEC.md "Other Players": "Friends,
 * requests, blocked, Add friend, invite link", "Players near you" (the
 * top-left mini player list removed), "Party (members, leader, invite,
 * leave): pinned top bar; HUD party chip opens it", "Alliances: 1 line below
 * Party bar"; the wireframe v4.4's party row, its segments Nearby | Friends |
 * Requests | Blocked, a row's name opening the Player page) from the game's
 * REAL lists, and the Player page's actions from TODAY's player card
 * (src/ui/panels/InspectPlayerPanel.jsx) and Friends page
 * (src/ui/mobile/dash/SocialPanel.jsx), gated as they gate them.
 *
 * THE GAME'S TRUTH, NOT THE SAMPLE'S:
 *   - THERE IS NO "CREATE PARTY" REQUEST.  A party starts when someone you
 *     invite says yes (the worker's party.js; dash/ClanPanel.jsx: "pick a
 *     player and tap Invite to Party").  So the slim "No party" line's Create
 *     (the card's "Decided" 8) is today's road: it lights Nearby, where every
 *     row has its Invite.  Nothing new is asked of the worker (flagged);
 *   - NEARBY is every other player the phone holds (S.others), as the old
 *     list was: it never asked how far.  A blocked player is under Blocked;
 *   - THE ALLIANCE LINE shows only what today's party chip and Party page
 *     show: a party that IS an alliance, or carries its former clan's tag.
 *     Alliances are ON in today's worker (caps.alliance), but a party under
 *     twenty active members has no line (the Saloon keeps how to grow one);
 *   - THE PLAYER PAGE shows only what the phone already has (the full remote
 *     page stays off: SPEC "Server-gated features").  Its actions are the
 *     card's, each the card's own request, under the card's own gates.
 *     "Message" is today's chat box aimed at them (a whisper goes to a NAME
 *     with no spaces: chatChannel.js compose), only where the worker carries
 *     whispers (caps.whisper).
 *
 * No imports: node's suite reads it (server/test/menus3-roster.test.mjs). */

export const MENUS3_ROSTER_SEGS = Object.freeze(['nearby', 'friends', 'requests', 'blocked']);
/* the pages a Roster row opens inside the panel (src/game/menus3Nav.js) */
export const MENUS3_ROSTER_PAGES = Object.freeze(['player']);
/* a leave or a kick takes two taps, as the party chip's (PartyHUD.jsx KICK_ARM_MS) */
export const MENUS3_ROSTER_ARM_MS = 3000;
/* the card's party size when the worker names none (PartyHUD.jsx maxN) */
const PARTY_MAX = 4;

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const str = (v) => (v == null ? '' : String(v));

/** A segment's id, or Nearby: a forged one is never a new segment. */
export function rosterSeg(id) {
  return typeof id === 'string' && MENUS3_ROSTER_SEGS.indexOf(id) >= 0 ? id : 'nearby';
}

/** The pinned party bar from the worker's party (S._party, partyDoor.js):
 *  { kind: 'none' } playing alone (the one slim line), or
 *  { kind: 'party', n, max, full, leader, iLead, members: [{ id, name,
 *  level, leader, me, off }] } -- the leader first, then you, then the rest
 *  in the worker's order. */
export function partyBar(party, myId) {
  const p = party && party.state === 'open' && Array.isArray(party.members) && party.members.length ? party : null;
  if (!p) return Object.freeze({ kind: 'none' });
  const me = str(myId);
  const leader = str(p.leader);
  const members = p.members.filter((m) => m && m.id != null).map((m) => Object.freeze({
    id: str(m.id),
    name: str(m.name) || str(m.id),
    level: Number.isFinite(Number(m.level)) && m.level != null ? Number(m.level) : null,
    leader: str(m.id) === leader,
    me: str(m.id) === me,
    off: !!m.off,
  }));
  const rank = (m) => (m.leader ? 0 : m.me ? 1 : 2);
  const order = members.map((m, i) => [m, i]).sort((a, b) => (rank(a[0]) - rank(b[0])) || (a[1] - b[1])).map((x) => x[0]);
  const max = (p.max | 0) > 0 ? (p.max | 0) : PARTY_MAX;
  return Object.freeze({ kind: 'party', n: order.length, max, full: order.length >= max, leader, iLead: !!me && me === leader, members: Object.freeze(order) });
}

/** The Alliance line, or null: only while alliances are on in the worker
 *  (`allyOn`, alliance.js allyCapsOn) AND the party is an alliance or wears
 *  its former clan's tag -- what the party chip's head shows today. */
export function allianceLine(party, allyOn) {
  if (!allyOn || !party || party.state !== 'open') return null;
  const a = party.ally && typeof party.ally === 'object' ? party.ally : null;
  if (!a || !(a.on || a.clan)) return null;
  const tag = str(a.tag);
  if (!tag) return null;
  return Object.freeze({ kind: a.on ? 'alliance' : 'clan', tag, name: str(a.name), active: a.active | 0, n: Array.isArray(party.members) ? party.members.length : 0 });
}

/** Nearby's rows: every other player the phone holds (S.others), as the old
 *  top-left list listed them, with what that list and the card read: the
 *  name, the level (where the peer carries it), the Hemi Bro count, in your
 *  party, a friend.  A blocked player is under Blocked, not here.  Your
 *  party first, then friends, then by name. */
export function nearbyRows(others, ctx) {
  const c = ctx || {};
  const me = str(c.myId);
  const inParty = c.party || {};
  const friend = c.friends || {};
  const blocked = c.blocked || {};
  const out = [];
  if (others && typeof others === 'object') {
    for (const id of Object.keys(others)) {
      const o = others[id];
      if (!o || id === me || has(blocked, id)) continue;
      const lv = Number(o.rpgLv);
      out.push(Object.freeze({
        id,
        name: str(o.name) || id,
        level: Number.isFinite(lv) && lv > 0 ? lv : null,
        bros: Math.max(0, Number(o.brn) | 0),
        color: typeof o.color === 'string' ? o.color : null,
        party: has(inParty, id),
        friend: has(friend, id),
      }));
    }
  }
  const rank = (r) => (r.party ? 0 : r.friend ? 1 : 2);
  out.sort((a, b) => (rank(a) - rank(b)) || a.name.localeCompare(b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return Object.freeze(out);
}

/** The four counts the segments wear. */
export function rosterCounts(n) {
  const k = n || {};
  const c = (v) => Math.max(0, (Array.isArray(v) ? v.length : Number(v)) | 0);
  return Object.freeze({ nearby: c(k.nearby), friends: c(k.friends), requests: c(k.requests), blocked: c(k.blocked) });
}

/** The segment the Roster opens on: Nearby, always (the owner's rule 1),
 *  unless the entry named one (a request waiting is a dot, never a jump). */
export function rosterStart(named) {
  return rosterSeg(named);
}

/* Every action the Player page can carry, in the wireframe's order (its
   two-column grid: Message first, then Invite, Trade, Duel, Add friend, and
   its "Safety": Mute, Block, Report), with the card's own Player card door
   (its portrait's Inspect card: the gear, the points, the kills). */
export const MENUS3_PLAYER_ACTS = Object.freeze(['message', 'invite', 'kick', 'trade', 'duel', 'friend', 'unfriend', 'card', 'mute', 'unmute', 'block', 'unblock', 'report']);

/** The Player page's actions for one player, each today's, under today's
 *  gates (InspectPlayerPanel.jsx; SocialPanel.jsx for an offline friend):
 *    f.me          it is you (no actions)
 *    f.here        the phone holds them (S.others): the card, trade, duel and
 *                  an invite need them here, as the card is only ever opened
 *                  on a player in S.others (BroTown __broInspectPlayer)
 *    f.caps        { party, trade2, friends, whisper, chatMute }
 *    f.name        their name (a whisper is by name, no spaces)
 *    f.inMyParty, f.iLead, f.friend, f.friendSrv, f.muted, f.blocked,
 *    f.lawless     (a block is refused where the land is lawless: the card's)
 *    f.rowCard     v2.3.6870: opened from a ranks row, whose own card (today's
 *                  Character page, fed only by the row) is the Player card
 *  Returns [{ id, face: 'commit' | 'go' | 'danger', two }]: `two` a two-tap. */
export function playerActs(f) {
  const x = f || {};
  if (x.me) return Object.freeze([]);
  const caps = x.caps || {};
  const here = !!x.here;
  const out = [];
  const add = (id, face, two) => out.push(Object.freeze({ id, face, two: !!two }));
  const name = str(x.name).trim();
  if (caps.whisper && name && !/\s/.test(name) && !x.blocked) add('message', 'go');
  if (here && caps.party && !x.inMyParty && !x.blocked) add('invite', 'commit');
  if (x.inMyParty && x.iLead) add('kick', 'danger', true);
  if (here && !x.blocked) add('trade', 'commit');
  if (here && !x.blocked) add('duel', 'commit');
  if (x.friend) add('unfriend', 'danger');
  else if (!x.blocked) add('friend', 'commit');
  if (here || x.rowCard) add('card', 'go');   /* v2.3.6870: or a ranks row's own card (today's Character page) */
  if (caps.chatMute) add(x.muted ? 'unmute' : 'mute', 'danger');
  if (x.blocked) add('unblock', 'commit');
  else if (!x.lawless) add('block', 'danger');
  if (caps.chatMute) add('report', 'danger', true);
  return Object.freeze(out);
}

/* the card's four reasons (InspectPlayerPanel.jsx, chatMute.js reportPlayer) */
export const MENUS3_REPORT_REASONS = Object.freeze(['spam', 'abuse', 'harassment', 'cheating']);

/** A two-tap: the first tap arms it, a second on the same thing within the
 *  time fires it; anything else re-arms.  `armed` { id, at } or null. */
export function armTap(armed, id, now) {
  const t = Number(now) || 0;
  if (armed && armed.id === id && t - (Number(armed.at) || 0) <= MENUS3_ROSTER_ARM_MS) return Object.freeze({ fire: true, armed: null });
  return Object.freeze({ fire: false, armed: Object.freeze({ id, at: t }) });
}

/** What the page shows about a player, from what the phone already holds,
 *  first found wins: the peer (S.others), your party's member, the friend's
 *  row, a request's or the blocked list's name.  { id, name, level, tag,
 *  bros, where: 'here' | 'party' | 'friend' | 'away' | 'unknown', online,
 *  zoneName, lastSeen }. */
export function playerFacts(id, src) {
  const s = src || {};
  const key = str(id);
  const o = s.others && has(s.others, key) ? s.others[key] : null;
  const pm = s.party && Array.isArray(s.party.members) ? s.party.members.find((m) => m && str(m.id) === key) : null;
  const fr = Array.isArray(s.friends) ? s.friends.find((r) => r && str(r.fid) === key) : null;
  const nm = s.names && has(s.names, key) ? str(s.names[key]) : '';
  const lvO = o ? Number(o.rpgLv) : NaN;
  const lvP = pm ? Number(pm.level) : NaN;
  const lvF = fr ? Number(fr.level) : NaN;
  const level = Number.isFinite(lvO) && lvO > 0 ? lvO : Number.isFinite(lvP) && lvP > 0 ? lvP : Number.isFinite(lvF) && lvF > 0 ? lvF : null;
  const name = (o && str(o.name)) || (pm && str(pm.name)) || (fr && str(fr.name)) || nm || key;
  const tag = o ? str(o.allyTag || o.clanTag) : '';
  const where = o ? 'here' : pm ? 'party' : fr ? (fr.online ? 'friend' : 'away') : 'unknown';
  return Object.freeze({
    id: key, name, level, tag, bros: o ? Math.max(0, Number(o.brn) | 0) : 0, where,
    online: !!o || !!(pm && !pm.off) || !!(fr && fr.online),
    zoneName: fr && fr.zoneName ? str(fr.zoneName) : '',
    lastSeen: fr && fr.lastSeen ? Number(fr.lastSeen) : null,
  });
}
