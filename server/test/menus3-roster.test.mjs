/* ═══ v2.3.6864: PEOPLE · ROSTER AND THE PLAYER PAGE, THEIR RULES (card MN step 10; src/game/menus3Roster.js) ═══
 *
 * The owner's Roster in the new panel, its rules played on the module
 * itself.  This suite imports nothing from server/src: it tests the page's
 * own rules (as menus3-quests.test does) and does not deploy.
 *
 *   1. THE SEGMENTS: Nearby, Friends, Requests, Blocked in the owner's order;
 *      a forged one is Nearby; the Roster opens on Nearby;
 *   2. THE PARTY BAR: alone (no party, a closed one, an empty one) is the one
 *      slim "No party"; a party lists its members, the leader first, then
 *      you; its size from the worker (four when it names none), full at it;
 *      you lead only when the worker says so;
 *   3. THE ALLIANCE LINE: none unless alliances are on AND the party is an
 *      alliance or wears its former clan's tag (what the chip shows today);
 *   4. NEARBY: every other player the phone holds, as the old list; not you,
 *      not a blocked player; your party first, then friends, then by name;
 *      the level and the Hemi Bro count where the peer carries them; a
 *      '__proto__' id is a row like any other, never the prototype;
 *   5. THE PLAYER PAGE'S ACTIONS: the card's, under the card's gates -- a
 *      whisper only with the worker's whisper lane and a name with no
 *      spaces; the card, trade, duel and an invite only for a player the
 *      phone holds; no invite for your own party's member, the leader's
 *      Remove (two taps); Add or Remove friend; Mute and Report only where
 *      the worker keeps mutes; Block refused where the land is lawless,
 *      Unblock always; a blocked player offers no message, invite, trade or
 *      duel; none for you; nothing outside the known list;
 *   6. A TWO-TAP: arms, fires on the second tap in time, re-arms late or on
 *      another thing;
 *   7. THE PAGE'S FACTS: only what the phone holds -- the peer first, then
 *      your party's member, the friend's row, a request's name; an unknown
 *      id is its own id, "unknown";
 *   8. THE ROAD: People opens the panel on Roster (built), the party chip
 *      too, and every door of the old player list on Nearby; Chat and Ranks
 *      still today's; a row's page is pushed over the Roster and Back
 *      returns to it with its segment. */
import { MENUS3_ROSTER_SEGS, MENUS3_ROSTER_PAGES, MENUS3_PLAYER_ACTS, MENUS3_REPORT_REASONS, MENUS3_ROSTER_ARM_MS, rosterSeg, rosterStart, partyBar, allianceLine, nearbyRows, rosterCounts, playerActs, armTap, playerFacts } from '../../src/game/menus3Roster.js';
import { MENUS3_BUILT, menus3Route } from '../../src/game/menus3Router.js';
import { navStart, navPush, navBack, navTop } from '../../src/game/menus3Nav.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; return; }
  failures++;
  console.log('FAIL ' + name + (detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''));
}

/* ── 1. the segments ── */
{
  check('1a the segments in the owner\'s order', MENUS3_ROSTER_SEGS.join() === 'nearby,friends,requests,blocked');
  check('1b a forged segment is Nearby', rosterSeg('clans') === 'nearby' && rosterSeg('__proto__') === 'nearby' && rosterSeg(null) === 'nearby' && rosterSeg('blocked') === 'blocked');
  check('1c the Roster opens on Nearby', rosterStart() === 'nearby' && rosterStart('friends') === 'friends');
  check('1d a row opens the player page', MENUS3_ROSTER_PAGES.join() === 'player');
  check('1e the counts', JSON.stringify(rosterCounts({ nearby: [1, 2], friends: 3, requests: [], blocked: -2 })) === JSON.stringify({ nearby: 2, friends: 3, requests: 0, blocked: 0 }));
}

/* ── 2. the party bar ── */
{
  check('2a alone: the one slim line', partyBar(null, 'me').kind === 'none' && partyBar({ state: 'closed', members: [{ id: 'me' }] }, 'me').kind === 'none' && partyBar({ state: 'open', members: [] }, 'me').kind === 'none');
  const p = { state: 'open', leader: 'b', members: [{ id: 'c', name: 'Cee', level: 3 }, { id: 'me', name: 'Me', level: 9 }, { id: 'b', name: 'Bee', level: 5, off: true }] };
  const bar = partyBar(p, 'me');
  check('2b the leader first, then you, then the rest', bar.kind === 'party' && bar.members.map((m) => m.id).join() === 'b,me,c', bar.members.map((m) => m.id));
  check('2c four when the worker names no size', bar.n === 3 && bar.max === 4 && !bar.full);
  check('2d you lead only when the worker says so', !bar.iLead && partyBar(Object.assign({}, p, { leader: 'me' }), 'me').iLead);
  check('2e the marks', bar.members[0].leader && bar.members[0].off && bar.members[1].me && bar.members[2].level === 3);
  check('2f the worker\'s size, full at it', partyBar(Object.assign({}, p, { max: 3 }), 'me').full && partyBar(Object.assign({}, p, { max: 6 }), 'me').max === 6);
}

/* ── 3. the alliance line ── */
{
  const p = (ally) => ({ state: 'open', members: [{ id: 'a' }, { id: 'b' }], ally });
  check('3a off: no line', allianceLine(p({ on: true, tag: 'ABC', name: 'Abc', active: 21 }), false) === null);
  check('3b a plain party: no line', allianceLine(p(null), true) === null && allianceLine(p({ on: false, clan: false, tag: 'ABC' }), true) === null);
  const a = allianceLine(p({ on: true, tag: 'ABC', name: 'Abc', active: 21 }), true);
  check('3c an alliance', !!a && a.kind === 'alliance' && a.tag === 'ABC' && a.active === 21 && a.n === 2, a);
  const c = allianceLine(p({ clan: true, tag: 'OLD', name: 'Old' }), true);
  check('3d a former clan\'s tag', !!c && c.kind === 'clan' && c.tag === 'OLD', c);
  check('3e no tag: no line', allianceLine(p({ on: true, tag: '' }), true) === null);
}

/* ── 4. nearby ── */
{
  const others = Object.create(null);
  others.z = { name: 'Zed', rpgLv: 7, brn: 2, color: '#123456' };
  others.a = { name: 'Amy' };
  others.f = { name: 'Fay', rpgLv: 'x' };
  others.p = { name: 'Pat' };
  others.k = { name: 'Kim' };
  others.me = { name: 'Me' };
  others['__proto__'] = { name: 'Proto' };
  const blocked = Object.create(null); blocked.k = 1;
  const party = Object.create(null); party.p = 1;
  const friends = Object.create(null); friends.f = 1;
  const rows = nearbyRows(others, { myId: 'me', party, friends, blocked });
  check('4a your party, friends, then by name; not you, not a blocked player', rows.map((r) => r.id).join() === 'p,f,a,__proto__,z', rows.map((r) => r.id));
  const z = rows.find((r) => r.id === 'z');
  check('4b the level and the Hemi Bros where the peer has them', z.level === 7 && z.bros === 2 && z.color === '#123456' && rows.find((r) => r.id === 'f').level === null);
  check('4c the marks', rows[0].party && !rows[0].friend && rows[1].friend);
  check('4d nobody held: none', nearbyRows(null, {}).length === 0);
}

/* ── 5. the player page's actions ── */
{
  const caps = { party: true, trade2: true, friends: true, whisper: true, chatMute: true };
  const ids = (f) => playerActs(f).map((a) => a.id).join();
  check('5a a stranger here: the card\'s whole set', ids({ here: true, caps, name: 'Zed' }) === 'message,invite,trade,duel,friend,card,mute,block,report', ids({ here: true, caps, name: 'Zed' }));
  check('5b no whisper lane, or a name with a space: no Message', ids({ here: true, caps: Object.assign({}, caps, { whisper: false }), name: 'Zed' }).indexOf('message') < 0 && ids({ here: true, caps, name: 'Zed Two' }).indexOf('message') < 0);
  check('5c not held by the phone: no card, trade, duel or invite', ids({ here: false, caps, name: 'Zed', friend: true }) === 'message,unfriend,mute,block,report', ids({ here: false, caps, name: 'Zed', friend: true }));
  check('5d your party\'s member: no invite; the leader\'s Remove takes two taps', ids({ here: true, caps, name: 'Zed', inMyParty: true }).indexOf('invite') < 0
    && playerActs({ here: true, caps, name: 'Zed', inMyParty: true, iLead: true }).some((a) => a.id === 'kick' && a.two && a.face === 'danger')
    && ids({ here: true, caps, name: 'Zed', inMyParty: true, iLead: false }).indexOf('kick') < 0);
  check('5e no party lane: no invite', ids({ here: true, caps: Object.assign({}, caps, { party: false }), name: 'Zed' }).indexOf('invite') < 0);
  check('5f no mutes kept: no Mute, no Report', !/mute|report/.test(ids({ here: true, caps: Object.assign({}, caps, { chatMute: false }), name: 'Zed' })));
  check('5g muted: Unmute', ids({ here: true, caps, name: 'Zed', muted: true }).indexOf('unmute') >= 0);
  check('5h lawless: no Block; Unblock always', ids({ here: true, caps, name: 'Zed', lawless: true }).indexOf('block') < 0 && ids({ here: true, caps, name: 'Zed', lawless: true, blocked: true }).indexOf('unblock') >= 0);
  check('5i blocked: no message, invite, trade, duel or add friend', ids({ here: true, caps, name: 'Zed', blocked: true }) === 'card,mute,unblock,report', ids({ here: true, caps, name: 'Zed', blocked: true }));
  check('5j you: none', playerActs({ me: true, here: true, caps, name: 'Me' }).length === 0);
  check('5k every action is a known one', playerActs({ here: true, caps, name: 'Zed', inMyParty: true, iLead: true, friend: true }).every((a) => MENUS3_PLAYER_ACTS.indexOf(a.id) >= 0));
  check('5l Report takes its reason (the card\'s four)', MENUS3_REPORT_REASONS.join() === 'spam,abuse,harassment,cheating' && playerActs({ here: true, caps, name: 'Zed' }).find((a) => a.id === 'report').two);
}

/* ── 6. a two-tap ── */
{
  const a = armTap(null, 'leave', 1000);
  check('6a the first tap arms', !a.fire && a.armed.id === 'leave');
  check('6b the second in time fires', armTap(a.armed, 'leave', 1000 + MENUS3_ROSTER_ARM_MS).fire);
  check('6c late: arms again', !armTap(a.armed, 'leave', 1001 + MENUS3_ROSTER_ARM_MS).fire);
  check('6d another thing: arms that', armTap(a.armed, 'kick', 1100).armed.id === 'kick' && !armTap(a.armed, 'kick', 1100).fire);
}

/* ── 7. the page's facts ── */
{
  const others = Object.create(null); others.z = { name: 'Zed', rpgLv: 7, allyTag: 'ABC', brn: 1 };
  const f = playerFacts('z', { others });
  check('7a the peer first', f.name === 'Zed' && f.level === 7 && f.tag === 'ABC' && f.bros === 1 && f.where === 'here' && f.online, f);
  const pm = playerFacts('m', { party: { members: [{ id: 'm', name: 'Mo', level: 4, off: true }] } });
  check('7b your party\'s member', pm.name === 'Mo' && pm.level === 4 && pm.where === 'party' && !pm.online, pm);
  const fr = playerFacts('q', { friends: [{ fid: 'q', name: 'Quin', online: false, lastSeen: 5 }] });
  check('7c the friend\'s row', fr.name === 'Quin' && fr.where === 'away' && fr.lastSeen === 5, fr);
  const names = Object.create(null); names.r = 'Ria';
  check('7d a request\'s name', playerFacts('r', { names }).name === 'Ria');
  const u = playerFacts('__proto__', {});
  check('7e an unknown id is its own, unknown', u.name === '__proto__' && u.where === 'unknown' && u.level === null, u);
}

/* ── 8. the road ── */
{
  check('8a Roster is built', MENUS3_BUILT.indexOf('roster') >= 0);   /* v2.3.6870: Chat and Ranks too (menus3-chat.test) */
  const ctx = { built: MENUS3_BUILT };
  const p = menus3Route('dock.people', ctx);
  check('8b People opens the panel on Roster', p.road === 'panel' && p.menu === 'people' && p.section === 'roster', p);
  const c = menus3Route('hud.partyChip', ctx);
  check('8c the party chip opens Roster', c.road === 'panel' && c.section === 'roster', c);
  const l = menus3Route('game.players', ctx);
  check('8d the old player list\'s doors: Roster on Nearby', l.road === 'panel' && l.section === 'roster' && l.seg === 'nearby', l);
  check('8e the chat lines open People · Chat (v2.3.6870)', menus3Route('hud.chatLines', ctx).road === 'panel' && menus3Route('hud.chatLines', ctx).section === 'chat');
  let h = navStart('roster', 'friends');
  h = navPush(h, 'player', 'z', { rail: 'friends', scroll: 30 });
  check('8f a row\'s page over the Roster', navTop(h).page === 'player' && navTop(h).arg === 'z');
  h = navBack(h);
  check('8g Back: the Roster on its segment, its scroll', navTop(h).page === 'root' && navTop(h).rail === 'friends' && navTop(h).scroll === 30, navTop(h));
}

console.log(`menus3-roster: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
