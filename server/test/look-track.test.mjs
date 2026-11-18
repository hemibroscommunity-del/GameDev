/* ═══ v2.3.5819 (card RV, S2's `track` half and S3): THE LOOK A `track` SETS,
 * IN THE GAME'S OWN FORMS ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md):
 *
 *   S2 (`track`'s half; PR 7 held the board and the page).  `track` let a
 *   player set `avatar` and `color` to any text, drawn as a picture and a CSS
 *   background on other screens.
 *
 *   S3.  The look's `rpgData` (the inspect card's blob, relayed to every
 *   phone and read by the board) carried the phone's own clan tag and name,
 *   never the registry's, and its free words past the cleaner and the
 *   staff-name rule.
 *
 *   1. a beacon colour and avatar are dropped; honest ones kept;
 *   2. `rpgData.clanTag` / `clanName` with no clan: none; in a clan: the
 *      registry's tag and name, whatever the phone said;
 *   3. a staff-reading pet name and a blank one: none; an honest pet name
 *      kept (the title is the record's already: achievements.js);
 *   4. the board's report reads the stamped look (session.data);
 *   5. `lookform: false`: as before.
 *
 * Red on main before this change: checks 1a, 2a, 2b, 3a and 4 fail.
 */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 500) : ''); }
}
const settleN = async (n) => { for (let i = 0; i < n; i++) await settle(); };
const A = 'bp_rvlook0001', B = 'bp_rvlook0002';
const wsrv = 'https://wsrv.nl/?url=' + encodeURIComponent('https://ipfs.io/ipfs/Qm1/1.png') + '&w=64&h=64&fit=cover&output=png';

async function track(flags, inClan, data) {
  const st = makeStorage();
  const room = await openRoom(st, flags);
  const wa = fakeWs('a');
  await join(room, wa, A, { loginTaken: true });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  await settleN(2);
  /* the clan registry, loaded (clans.js _clanOf) */
  room._clans = new Map(); room._clanByPlayer = new Map();
  if (inClan) { room._clans.set('c1', { id: 'c1', tag: 'RIV', name: 'River Wolves', color1: '#123456', members: [A] }); room._clanByPlayer.set(A, 'c1'); }
  await room.webSocketMessage(wa, JSON.stringify({ type: 'track', data }));
  await settleN(2);
  const sd = room.sessions.get(wa).data;
  return { sd, rd: sd.rpgData || {} };
}

{
  const bad = await track(null, false, { color: 'url(//e.co/x)', avatar: 'https://e.example/beacon.png', rpgData: { clanTag: 'FAKE', clanName: 'Admins', petInfo: { name: '⠀⠀⠀', level: 2 } } });
  const staffPet = await track(null, false, { rpgData: { petInfo: { name: 'Admin Team', level: 2 } } });
  check('1a. a beacon colour and avatar are dropped', bad.sd.color !== 'url(//e.co/x)' && bad.sd.avatar !== 'https://e.example/beacon.png', { color: bad.sd.color, avatar: bad.sd.avatar });
  const ok = await track(null, false, { color: '#5b52ff', avatar: wsrv, rpgData: { petInfo: { name: 'Biscuit', level: 2 } } });
  check('1b. ...honest ones kept', ok.sd.color === '#5b52ff' && ok.sd.avatar === wsrv && ok.rd.petInfo.name === 'Biscuit', { color: ok.sd.color, avatar: ok.sd.avatar, pet: ok.rd.petInfo });
  check('2a. no clan: the phone\'s clan tag and name are none', !bad.rd.clanTag && !bad.rd.clanName, bad.rd);
  const inC = await track(null, true, { rpgData: { clanTag: 'FAKE', clanName: 'Admins' } });
  check('2b. in a clan: the registry\'s tag and name, whatever the phone said', inC.rd.clanTag === 'RIV' && inC.rd.clanName === 'River Wolves', inC.rd);
  check('3a. a blank pet name and a staff-reading one: none', !(bad.rd.petInfo && bad.rd.petInfo.name) && !(staffPet.rd.petInfo && staffPet.rd.petInfo.name), { bad: bad.rd, staffPet: staffPet.rd });
  check('4. the board\'s report reads the stamped look (session.data.rpgData.clanTag)', inC.sd.rpgData.clanTag === 'RIV' && !bad.sd.rpgData.clanTag, { inC: inC.sd.rpgData, bad: bad.sd.rpgData });
}
{
  const off = await track({ lookform: false }, false, { color: 'url(//e.co/x)', rpgData: { clanTag: 'FAKE', petInfo: { name: 'Admin Team' } } });
  check('5. `lookform: false`: as before (the colour, the phone\'s tag and the pet name kept)', off.sd.color === 'url(//e.co/x)' && off.rd.clanTag === 'FAKE' && off.rd.petInfo && off.rd.petInfo.name === 'Admin Team', { color: off.sd.color, rd: off.rd });
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
