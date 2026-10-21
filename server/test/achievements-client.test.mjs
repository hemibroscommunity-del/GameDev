/* ═══ v2.3.3527: ACHIEVEMENTS, THE PHONE'S HALF (src/game/achievements.js) ═══
 *
 * The worker decides every achievement (server/src/achievements.js, its own
 * suite achievements.test.mjs).  This holds the phone to what it is told:
 *
 *   1. normalizeAchvState: only the table's own ids reach a map (a '__proto__'
 *      own key, an unknown id, a count on a row that does not count, a
 *      dungeon land the phone does not know are all left out); the title and
 *      the rarest only as ids it knows and you have; `new` and `retro` only
 *      known ids, once each;
 *   2. onAchvState: a COMMON one is a chat line, a RARE / ARENA / SUPER-RARE
 *      one a banner moment (never both, never twice), the join's quiet grants
 *      ONE line and no banner; {unavailable} says so and drops the title;
 *   3. the moments: shown only when `ready`, `started` once, gone after
 *      BANNER_MS, let go quietly after MOMENT_GIVE_UP_MS, never more than
 *      MOMENT_MAX waiting;
 *   4. the page's numbers: the worker's AP (the player_state echo's too,
 *      never the phone's own), "N of 23", what the achievements are worth and
 *      the rest never below 0; the filters (the arena's row under All and
 *      Rare); the date; each row's progress from what the worker said;
 *   5. the mail: an `achv` delivery is "Gladiator achievement", never "?";
 *   6. the title: asked only for one you have, against a worker that grants
 *      them, in the shape the worker's router reads; the page waits for the
 *      answer and stops waiting after TITLE_ASK_MS;
 *   7. the wiring, read from the source: wsClient's direct switch (never a
 *      relayed copy) and the channel's passthrough, the echo, More's tile,
 *      the dashboard's PANELS, the mail's line, the worker's PRIVILEGED list,
 *      and BT_ACHIEVEMENTS / the fake rare-drop AP gone for good;
 *   8. the page after the owner's ChatGPT review (the header's summary, one
 *      line a row, a row that opens, the card's way in under More);
 *   9. the owner's painted badges: every row its own picture, 150 px square,
 *      the medal on More's tile and the empty page, the cutter's names the
 *      table's ids in the sheets' order, and every file as the cutter wrote
 *      it (tools/ui/achievement-badges.sha256).
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const A = await import('../../src/game/achievements.js');
const D = await import('../../src/data/achievements.js');
const PO = await import('../../src/game/postOffice.js');
const keys = (o) => Object.keys(o || {}).sort().join(',');
const freshS = (extra) => Object.assign({ chatLog: [] }, extra || {});

/* ── 1. normalizeAchvState ── */
{
  /* JSON.parse makes '__proto__' an OWN key, as a hostile wire would */
  const p = JSON.parse('{"v":1,"got":{"first_blood":1700000000000,"gladiator":1700000001000,"__proto__":5,"bogus":3,"godly":-4,"tempered":"x"},'
    + '"n":{"gladiator":2,"first_blood":9,"bogus":4},"dg":{"hollows":1,"constructor":1,"__proto__":1,"atlantis":1},'
    + '"t":"gladiator","rarest":"gladiator","ap":1234.9,"new":["first_blood","nope","first_blood"],"retro":["combat_10",5,"combat_10"]}');
  const s = A.normalizeAchvState(p);
  check('1a only the table\'s ids are kept as earned (an own __proto__, an unknown id, a bad time left out)', keys(s.got) === 'first_blood,gladiator', s.got);
  check('1b every map is null-prototype', Object.getPrototypeOf(s.got) === null && Object.getPrototypeOf(s.n) === null && Object.getPrototypeOf(s.dg) === null);
  check('1c a count only on a row that counts', keys(s.n) === 'gladiator' && s.n.gladiator === 2, s.n);
  check('1d a cleared dungeon only on a land the phone knows has one', keys(s.dg) === 'hollows', s.dg);
  check('1e the title and the rarest kept: known ids you have', s.t === 'gladiator' && s.rarest === 'gladiator');
  check('1f the worker\'s AP, whole', s.ap === 1234);
  check('1g `new` and `retro`: known ids, once each', s.fresh.join() === 'first_blood' && s.retro.join() === 'combat_10', { fresh: s.fresh, retro: s.retro });
  const t2 = A.normalizeAchvState({ got: { first_blood: 1 }, t: 'godly', rarest: 'not_a_thing' });
  check('1h a title you do not have, or an id the phone does not know, is no title and no rarest', t2.t === null && t2.rarest === null, t2);
  check('1i {unavailable} is that and nothing else', A.normalizeAchvState({ unavailable: true }).unavailable === true && keys(A.normalizeAchvState({ unavailable: true }).got) === '');
  check('1j nothing at all is an empty record, never a throw', keys(A.normalizeAchvState(null).got) === '' && A.normalizeAchvState('x').ap === null);
}

/* ── 2. onAchvState ── */
{
  const S = freshS();
  const r = A.onAchvState(S, { got: { first_blood: 1, gladiator: 2 }, ap: 510, new: ['first_blood'] }, 1000);
  check('2a a COMMON one is a chat line, "Achievement: First Blood (+10 AP)", and no banner',
    r.lines.length === 1 && /Achievement: First Blood \(\+10 AP\)/.test(r.lines[0]) && r.big.length === 0 && S._achv.moments.length === 0
    && S.chatLog.length === 1 && S.chatLog[0].system === true && S.chatLog[0].name === '', { r, log: S.chatLog });
  const r2 = A.onAchvState(S, { got: { first_blood: 1, gladiator: 2 }, ap: 510, new: ['gladiator'] }, 2000);
  check('2b a big one (the arena\'s) is a banner moment and no chat line', r2.big.join() === 'gladiator' && r2.lines.length === 0 && S.chatLog.length === 1 && S._achv.moments.length === 1, r2);
  A.onAchvState(S, { got: { first_blood: 1, gladiator: 2 }, new: ['gladiator'] }, 2500);
  check('2c the same big one twice waits once', S._achv.moments.length === 1, S._achv.moments);
  const S2 = freshS();
  const r3 = A.onAchvState(S2, { got: { first_blood: 1, combat_10: 2, golden_pet: 3 }, retro: ['first_blood', 'combat_10', 'golden_pet'] }, 3000);
  check('2d the join\'s quiet grants: ONE line with their names and points, no banner even for a rare one',
    r3.lines.length === 1 && r3.big.length === 0 && (S2._achv.moments || []).length === 0
    && /Achievements for what you'd already done: First Blood, Blooded, Golden Catch \(\+120 AP\)/.test(r3.lines[0]), r3);
  check('2e ...one alone reads "An achievement for what you\'d already done"', /^An achievement for what you'd already done: Blooded \(\+10 AP\)$/.test(A.achvRetroLine(['combat_10'])));
  const S3 = freshS();
  A.onAchvState(S3, { got: { gladiator: 1 }, t: 'gladiator', rarest: 'gladiator' });
  A.onAchvState(S3, { unavailable: true });
  check('2f {unavailable}: said, and no title or rarest shown from before', S3._achv.unavailable === true && S3._achv.t === null && S3._achv.rarest === null && S3._achv.known === true);
  const S4 = freshS();
  A.onAchvState(S4, { got: {}, new: ['not_a_thing'] });
  check('2g an id the phone does not know says nothing', S4.chatLog.length === 0 && S4._achv.moments.length === 0);
  check('2h a payload of nothing is ignored', A.onAchvState(S4, null).lines.length === 0 && A.onAchvState(null, {}).lines.length === 0);
  check('2i the big ones are exactly rare, the arena and super-rare', D.ACHIEVEMENTS.every((a) => D.achvBig(a.id) === (a.tier !== 'common')));
}

/* ── 3. the moments ── */
{
  const S = freshS();
  A.onAchvState(S, { got: { gladiator: 1, tempered: 2 }, new: ['gladiator'] }, 10000);
  A.onAchvState(S, { got: { gladiator: 1, tempered: 2 }, new: ['tempered'] }, 10050);
  check('3a not ready: nothing shows, nothing is lost', A.achvMoment(S, 10100, () => false) === null && S._achv.moments.length === 2);
  let asked = null;
  const m1 = A.achvMoment(S, 10500, (id, at) => { asked = [id, at]; return true; });
  check('3b ready is asked with the moment\'s id and when it came; it starts once, first in first out',
    !!m1 && m1.started === true && m1.id === 'gladiator' && asked && asked[0] === 'gladiator' && asked[1] === 10000 && m1.until === 10500 + A.BANNER_MS, { m1, asked });
  const m1b = A.achvMoment(S, 11000, () => true);
  check('3c while it is up: the same banner, not started again, the next one waits', !!m1b && m1b.id === 'gladiator' && m1b.started === false && S._achv.moments.length === 1);
  const m2 = A.achvMoment(S, 10500 + A.BANNER_MS + 1, () => true);
  check('3d after BANNER_MS: the next one starts', !!m2 && m2.id === 'tempered' && m2.started === true, m2);
  check('3e after that one too: nothing', A.achvMoment(S, 10500 + 2 * A.BANNER_MS + 10, () => true) === null && S._achv.showing === null);
  const S2 = freshS();
  A.onAchvState(S2, { got: { gladiator: 1 }, new: ['gladiator'] }, 0);
  check('3f a moment that waited past MOMENT_GIVE_UP_MS (the world never came into view) goes quietly',
    A.achvMoment(S2, A.MOMENT_GIVE_UP_MS + 1, () => true) === null && S2._achv.moments.length === 0);
  const S3 = freshS();
  const bigs = D.ACHIEVEMENTS.filter((a) => a.tier !== 'common').map((a) => a.id);
  const got = Object.fromEntries(bigs.map((id) => [id, 1]));
  for (const id of bigs) A.onAchvState(S3, { got, new: [id] }, 5);
  check('3g never more than MOMENT_MAX waiting, the newest kept', S3._achv.moments.length === A.MOMENT_MAX && S3._achv.moments[A.MOMENT_MAX - 1].id === bigs[bigs.length - 1]);
  check('3h the world in view is the intro lifted with no zone or connection veil (the daily toast\'s test)',
    A.achvWorldShown({ __introLiftedAt: 1 }) && !A.achvWorldShown({ __introLiftedAt: 1, _zoneLoading: 'x' }) && !A.achvWorldShown({ __introLiftedAt: 1, _netHold: true }) && !A.achvWorldShown({}));
}

/* ── 4. the page's numbers ── */
{
  const S = freshS({ rpg: { achievementPoints: 99999 } });
  check('4a before the worker says anything: the rpg blob\'s AP', A.achvApTotal(S) === 99999);
  A.onAchvState(S, { got: { first_blood: 1, gladiator: 2, godly: 3 }, ap: 1600 });
  check('4b the worker\'s AP wins over the phone\'s own number', A.achvApTotal(S) === 1600);
  A.noteServerAp(S, 1605);
  check('4c the player_state echo moves it (a quest\'s +5 with no achv_state)', A.achvApTotal(S) === 1605);
  A.noteServerAp(S, 'x'); A.noteServerAp(S, -3);
  check('4d an echo that is not a number does not', A.achvApTotal(S) === 1605);
  const sum = A.achvSummary(S);
  check('4e "3 of 23", the achievements worth 1,510, the rest 95', sum.earned === 3 && sum.total === 23 && sum.achvPts === 1510 && sum.otherPts === 95 && sum.maxPts === D.ACHV_TOTAL_AP, sum);
  const S2 = freshS();
  A.onAchvState(S2, { got: { godly: 1 }, ap: 0 });
  check('4f a row the owner\'s lever lit pays nothing: the rest reads 0, never below', A.achvSummary(S2).otherPts === 0);
  const ids = (f) => A.achvRows(S, f).map((r) => r.def.id);
  check('4g All is the whole table in its order', ids('all').join() === D.ACHIEVEMENTS.map((a) => a.id).join() && ids('nonsense').length === 23);
  check('4h Common 7, Rare 10 with the arena\'s row, Super-rare 6', ids('common').length === 7 && ids('rare').length === 10 && ids('rare').includes('gladiator') && ids('superrare').length === 6,
    { c: ids('common').length, r: ids('rare').length, s: ids('superrare').length });
  check('4i the filters cover every tier', D.ACHIEVEMENTS.every((a) => A.ACHV_FILTERS.some((f) => f.tiers && f.tiers.includes(a.tier))));
  const g = A.achvRows(S, 'rare').find((r) => r.def.id === 'gladiator');
  check('4j a row says earned and when', g.got === true && g.at === 2 && A.achvRows(S, 'common').find((r) => r.def.id === 'nml_kill').got === false);
  const oct19 = new Date(2026, 9, 19, 12).getTime();
  check('4k the day earned: "Oct 19", the year only when it is not this one',
    A.achvDateWords(oct19, oct19 + 3600e3) === 'Oct 19' && A.achvDateWords(new Date(2025, 0, 2, 12).getTime(), oct19) === 'Jan 2, 2025' && A.achvDateWords(0) === '');
  const P = freshS({ rpg: { prog3: { sk: { sword: { level: 7 }, bow: { level: 12 }, staff: { level: 3 } } } },
    _codex: { k: { snowling: [3, 1], gobling: [1, 0], wisplet: [0, 0] } } });
  A.onAchvState(P, { got: {}, dg: { hollows: 1, sky: 1 } });
  check('4l progress from what the worker said: your best combat level, the codex\'s kinds, the dungeons cleared',
    A.achvProgress(P, 'combat_50') === 'Your best: Lv 12' && A.achvProgress(P, 'codex_all') === '2 of 9 kinds'
    && A.achvProgress(P, 'elder_all') === '1 of 9 kinds' && A.achvProgress(P, 'dungeons_all') === '2 of 4 cleared' && A.achvProgress(P, 'first_blood') === '',
    { c: A.achvProgress(P, 'combat_50'), k: A.achvProgress(P, 'codex_all'), e: A.achvProgress(P, 'elder_all'), d: A.achvProgress(P, 'dungeons_all') });
  check('4m no codex yet: no guess', A.achvProgress(freshS(), 'codex_all') === '' && A.achvProgress(freshS(), 'combat_10') === '');
}

/* ── 5. the mail ── */
{
  check('5a an `achv` delivery in the Post Office: "Gladiator achievement"',
    PO.mailLine({ kind: 'achv', source: 'arena', note: 'Gladiator Arena champion', payload: { id: 'gladiator' } }).what === 'Gladiator achievement');
  check('5b ...one the phone does not know, or none: "An achievement", never "?" or blank',
    PO.mailLine({ kind: 'achv', payload: { id: 'zzz' } }).what === 'An achievement' && PO.mailLine({ kind: 'achv' }).what === 'An achievement');
  check('5c in the chat\'s line: "the Gladiator achievement" / "an achievement"',
    A.achvMailPhrase({ id: 'gladiator' }) === 'the Gladiator achievement' && A.achvMailPhrase({ id: 'zzz' }) === 'an achievement' && A.achvMailPhrase(null) === 'an achievement');
  check('5d the banner\'s words: "Gladiator · +500 AP"', A.achvBannerWords('gladiator') === 'Gladiator · +500 AP' && A.achvBannerWords('godly') === 'Godly · +1,000 AP');
}

/* ── 6. the title ── */
{
  const sent = [];
  const S = freshS({ _serverCaps: { achievements: true }, channel: { send: (m) => sent.push(m) } });
  A.onAchvState(S, { got: { first_blood: 1, gladiator: 2 } });
  check('6a never for one you have not earned', A.sendAchvTitle(S, 'godly', 100) === false && sent.length === 0);
  check('6b one you have: sent in the shape the worker\'s router reads, {type, payload: {id}}',
    A.sendAchvTitle(S, 'gladiator', 100) === true && sent.length === 1 && sent[0].type === 'achv_title' && sent[0].payload.id === 'gladiator', sent);
  check('6c ...and the page waits for the answer', !!A.achvTitleWaiting(S, 200) && A.achvTitleWaiting(S, 200).id === 'gladiator');
  A.onAchvState(S, { got: { first_blood: 1, gladiator: 2 }, t: 'gladiator' });
  check('6d the worker\'s achv_state is the answer: the title, nothing waiting', S._achv.t === 'gladiator' && A.achvTitleWaiting(S, 300) === null);
  check('6e null takes it off', A.sendAchvTitle(S, null, 400) === true && sent[1].payload.id === null && A.achvTitleWaiting(S, 400).id === null);
  check('6f a lost answer stops being waited for after TITLE_ASK_MS', A.achvTitleWaiting(S, 400 + A.TITLE_ASK_MS + 1) === null);
  const off = freshS({ _serverCaps: {}, channel: { send: (m) => sent.push(m) } });
  A.onAchvState(off, { got: { gladiator: 1 } });
  check('6g a worker without achievements is never asked', A.sendAchvTitle(off, 'gladiator') === false && sent.length === 2);
  check('6h nor with no connection', A.sendAchvTitle(freshS({ _serverCaps: { achievements: true } }), null) === false);
}

/* ── 7. the wiring ── */
{
  const ws = src('src/networking/wsClient.js');
  check('7a wsClient takes achv_state in its direct switch, never a relayed copy',
    /case 'achv_state':\s*\{\s*if \(msg\.from\) break;\s*try \{ onAchvState\(S, msg\.payload\); \}/.test(ws));
  const shimFrom = ws.indexOf('var channelShim = {'), shimTo = ws.indexOf('track: function track(', shimFrom);
  check('7b the channel lets achv_title through to the worker (TRAPS #18)',
    shimFrom > 0 && /if \(msg\.type === 'achv_title'\) \{\s*wsOut\(msg\);\s*return;\s*\}/.test(ws.slice(shimFrom, shimTo)));
  check('7c the player_state echo of achievementPoints feeds the page\'s total', /noteServerAp\(S, msg\.payload\.achievementPoints\)/.test(ws));
  const more = src('src/ui/mobile/dash/MorePanel.jsx');
  check('7d More: the Journey tile is Achievements against a worker that grants them (the owner\'s medal its picture), Journey otherwise',
    /achvLive\(S\) \? 'achievements' : 'journey'/.test(more) && /id: 'achievements', src: ACHV_MEDAL_SRC, +label: 'Achievements'[^\n]*iconScale: 1 \}/.test(more)
      && /id: 'journey', +src: '\/icons\/ui\/journey\.webp/.test(more));
  check('7e the dashboard knows the page, with its Head', /achievements: \{ title: 'Achievements', Component: AchievementsPanel, Head: AchievementsHead \}/.test(src('src/ui/mobile/BottomDashboard.jsx')));
  check('7f the chat\'s mail line names an achievement', /_e\.kind === 'achv' \? achvMailPhrase\(_ep\)/.test(src('src/networking/gameEvents.js')));
  const idx = src('server/src/index.js');
  const priv = idx.slice(idx.indexOf('export const PRIVILEGED_EVENTS'), idx.indexOf(']);', idx.indexOf('export const PRIVILEGED_EVENTS')));
  check('7g the worker lists achv_state as privileged (a forged one is never relayed)', /'achv_state'/.test(priv));
  check('7h the worker\'s router reads the title as the phone sends it', /case 'achv_title':\s*if \(session\.id\) this\._achvTitle\(session, msg\.payload \|\| msg\);/.test(idx));
  check('7i BT_ACHIEVEMENTS and its silent checker are gone', !/export const BT_ACHIEVEMENTS/.test(src('src/data/gameDisplay.js')) && !/BT_ACHIEVEMENTS\.forEach|setMyBadges/.test(src('src/ui/BroTown.jsx')));
  check('7j the fake rare-drop AP is gone', !/RARE_DROP_(CHANCE|ITEMS)\s*=/.test(src('src/data/items.js')) && !/RARE_DROP_ITEMS\[/.test(src('src/game/monsterCombat.js')));
  const dev = src('src/ui/panels/DevPanel.jsx');
  check('7k the Test panel lists the cap (precheck\'s cap-registry) and has the lever', /'achievements' \/\*/.test(dev) && /call\('\/dev\/achv'/.test(dev));
  check('7l the banner is drawn outside the world\'s wrap, beside QuestCoach',
    /React\.createElement\(QuestCoach, \{ stateRef: stateRef \}\),[\s\S]{0,400}React\.createElement\(AchievementBanner, \{ stateRef: stateRef \}\)/.test(src('src/ui/BroTown.jsx')));
}

/* ── 8. after the owner's ChatGPT review (2026-10-19): the page compacted ── */
{
  check('8a every row has a one-line clue (40 characters at most, no full stop) and keeps its whole `how`',
    D.ACHIEVEMENTS.every((a) => typeof a.clue === 'string' && a.clue.length > 0 && a.clue.length <= 40 && !/\.$/.test(a.clue)
      && typeof a.how === 'string' && a.how.length >= a.clue.length - 4),
    D.ACHIEVEMENTS.filter((a) => !a.clue || a.clue.length > 40).map((a) => a.id));
  const P = freshS({ rpg: { prog3: { sk: { sword: { level: 7 }, bow: { level: 12 }, staff: { level: 3 } } } },
    _codex: { k: { snowling: [3, 1], gobling: [1, 0], wisplet: [0, 0] } } });
  A.onAchvState(P, { got: {}, dg: { hollows: 1, sky: 1 } });
  const sh = (id) => A.achvProgressShort(P, id);
  check('8b a row\'s short progress: "best Lv 12", "2/9", "1/9", "2/4", and nothing on a row of chance',
    sh('combat_10') === 'best Lv 12' && sh('combat_100') === 'best Lv 12' && sh('codex_all') === '2/9' && sh('elder_all') === '1/9'
      && sh('dungeons_all') === '2/4' && sh('natural_one') === '' && sh('godly') === '',
    { c: sh('combat_10'), k: sh('codex_all'), e: sh('elder_all'), d: sh('dungeons_all') });
  check('8c ...and no guess before the worker said: no codex, no combat level',
    A.achvProgressShort(freshS(), 'codex_all') === '' && A.achvProgressShort(freshS(), 'combat_10') === '' && A.achvProgressShort(freshS(), 'dungeons_all') === '0/4');
  check('8d the total\'s two parts in one sentence (the page\'s last line and the total\'s tooltip)',
    A.achvSplitWords({ apTotal: 1850, achvPts: 1840, otherPts: 10 }) === 'Your 1,850 AP: 1,840 from achievements, 10 from quests, guilds and more.'
      && A.achvSplitWords({ apTotal: -3, achvPts: 0, otherPts: 0 }) === 'Your 0 AP: 0 from achievements, 0 from quests, guilds and more.');
  const dash = src('src/ui/mobile/BottomDashboard.jsx');
  check('8e the dashboard draws a page\'s Head on its drilled header, upright beside the back button and sideways under the title',
    /const Head = active\?\.Head \|\| null;/.test(dash) && /data-dash-head-row=""[\s\S]{0,200}\{back\}[\s\S]{0,240}<Head \/>/.test(dash)
      && /\{Head \? <div data-dash-head="" style=\{\{ flex: '1 1 100%'[\s\S]{0,80}<Head side \/><\/div> : null\}/.test(dash));
  const page = src('src/ui/mobile/dash/AchievementsPanel.jsx');
  check('8f the page: a row is a button that opens in place (aria-expanded), one open at a time, its title buttons only when open',
    /role="button" tabIndex=\{0\} aria-expanded=\{open\}/.test(page) && /setOpen\(\(cur\) => \(cur === id \? null : id\)\)/.test(page)
      && /\{open && got \? <div data-achv-detail=""><TitleLine /.test(page) && (page.match(/<TitleLine /g) || []).length === 1
      && /\{open \? \([\s\S]{0,400}data-achv-how=""[\s\S]{0,900}\) : \([\s\S]{0,300}data-achv-clue=""/.test(page));
  check('8g ...one line under the name (the clue, cut with an ellipsis), the summary on the page only with no header to ride',
    /data-achv-clue=""[^>]*whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'/.test(page.replace(/\s+/g, ' '))
      && /\{drilled\(\) \? null : <div style=\{\{ marginBottom: 2 \}\}><Summary S=\{S\} \/><\/div>\}/.test(page)
      && /export const AchievementsHead = /.test(page));
  const ins = src('src/ui/panels/InspectPlayerPanel.jsx');
  check('8h a card\'s title chip and rarest box open Achievements UNDER More (its header, and a way back)',
    /function openFromCard\(id\) \{\s*if \(id === 'achievements'\) \{\s*dashboardPanelBus\.open\('more'\);\s*dashboardPanelBus\.push\('achievements'\);/.test(ins)
      && (ins.match(/openFromCard\(id\);/g) || []).length === 2 && !/dashboardPanelBus\.open\(id\);\s*setInspectPlayer/.test(ins));
  const css = src('src/styles/game.css');
  const sr = css.slice(css.indexOf('.bt-pin-drop[data-tier="superrare"]{'), css.indexOf('.bt-pin-drop[data-tier="superrare"]{') + 400);
  check('8i the super-rare box is the rainbow EDGE on the card\'s slate (no purple fill), the title chip bounded',
    /border:1\.5px solid transparent/.test(sr) && /border-box/.test(sr) && !/#46295F/.test(css) && /\.bt-pin-title\[data-achv\]\{max-width:60%\}/.test(css));
}

/* ── 9. the owner's painted badges (tools/ui/cut-achievement-badges.py) ── */
{
  const { createHash } = await import('node:crypto');
  const { existsSync } = await import('node:fs');
  const bin = (p) => readFileSync(new URL(p, root));
  /* a WebP's canvas: VP8X (lossy with alpha) or a plain VP8 frame */
  const webpSize = (b) => {
    if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    return null;
  };
  const ids = D.ACHIEVEMENTS.map((a) => a.id);
  check('9a every achievement wears its own badge, /icons/achievements/<id>.webp at the badges\' cache key',
    D.ACHIEVEMENTS.every((a) => a.icon === '/icons/achievements/' + a.id + '.webp?v=' + D.ACHV_BADGE_V && a.icon === D.achvBadgeSrc(a.id))
      && /^\d+\.\d+\.\d+$/.test(D.ACHV_BADGE_V) && D.ACHV_MEDAL_SRC === D.achvBadgeSrc('achievements'),
    D.ACHIEVEMENTS.filter((a) => a.icon !== D.achvBadgeSrc(a.id)).map((a) => a.id));
  const files = [...ids, 'achievements'].map((id) => 'public/icons/achievements/' + id + '.webp');
  const sizes = files.map((f) => (existsSync(new URL(f, root)) ? webpSize(bin(f)) : null));
  check('9b ...each file there, a WebP 150 px square (3x the card\'s 50 CSS px rarest box, the biggest place one is drawn), the medal too',
    sizes.every((s) => s && s[0] === 150 && s[1] === 150), files.filter((f, i) => !sizes[i] || sizes[i][0] !== 150 || sizes[i][1] !== 150));
  const tool = src('tools/ui/cut-achievement-badges.py');
  const named = [...tool.slice(tool.indexOf('SHEETS = ['), tool.indexOf(']),\n]', tool.indexOf('SHEETS = [')) + 4).matchAll(/'([a-z0-9_]+)'/g)]
    .map((m) => m[1]).filter((n) => !/^badges-sheet/.test(n));
  check('9c the cutter names the sheets\' 24 cells the table\'s ids in order, then the medal (a row added to the table needs its badge)',
    named.join(',') === ids.join(',') && /'godly', MEDAL\]\),\n\]/.test(tool) && /^MEDAL = 'achievements'$/m.test(tool),
    { named: named.length, ids: ids.length });
  const rec = src('tools/ui/achievement-badges.sha256').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(/\s+/));
  const recMap = new Map(rec.map(([h, f]) => [f, h]));
  const drift = files.filter((f) => !existsSync(new URL(f, root)) || recMap.get(f) !== createHash('sha256').update(bin(f)).digest('hex'));
  check('9d every badge is the cutter\'s, unchanged since (another tool writing over one fails here)',
    rec.length === files.length && drift.length === 0, { recorded: rec.length, drift });
  const more = src('src/ui/mobile/dash/MorePanel.jsx'), page = src('src/ui/mobile/dash/AchievementsPanel.jsx');
  check('9e the medal is More\'s tile and the empty page\'s picture; no achievement borrows another picture',
    /import \{ ACHV_MEDAL_SRC \} from '@\/data\/achievements\.js'/.test(more) && /<img src=\{ACHV_MEDAL_SRC\}/.test(page)
      && !/journey\.webp/.test(page) && !/icon: '\//.test(src('src/data/achievements.js')));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
