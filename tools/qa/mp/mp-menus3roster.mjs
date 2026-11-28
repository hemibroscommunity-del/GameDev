/* ═══ v2.3.6864: PEOPLE · ROSTER AND THE PLAYER PAGE, PLAYED BY TWO (card MN step 10) ═══
 *
 * The owner's Roster (docs/design/menus3/; the card's step "People ·
 * Roster"): the People button opens the new panel on Roster, always; the
 * party bar pinned at the top (alone, ONE slim "No party" line with Create);
 * the segments Nearby | Friends | Requests | Blocked from the game's real
 * lists; a row's name opens the one Player page with Back; its actions send
 * today's requests.
 *
 *   1. UPRIGHT (390 x 844, touch), two players (H.joinPair, both on the new
 *      menus): People opens the panel on Roster (tabs Roster, Chat, Ranks);
 *      alone, the slim "No party" line with Create, which lights Nearby;
 *      Nearby lists the other player; every tappable thing 44 x 44 or more;
 *      the row's Invite reaches the other (party_invited) and their yes makes
 *      a party of two on both bars, the leader first; the party chip opens
 *      Roster; a member opens the Player page (the leader's Remove there);
 *      Back to the Roster; Add friend on the page reaches the other's
 *      Requests (their count, the row with Accept); Message opens today's
 *      chat box aimed at them (the whisper lane, their name) and its shutting
 *      brings the panel back on the player's page; Leave takes two taps and
 *      the party is gone on both bars; the old top-left list's door
 *      (playersOpen: the Saloon's, the Sheriff's) opens Roster on Nearby and
 *      the old list never shows;
 *   2. SIDEWAYS (844 x 390): the drawer 40% on the right on Roster; the
 *      first player in Nearby; their page inside it; 44+;
 *   3. A COMPUTER (1280 x 800, `wide: true`): the drawer; People opens it on
 *      Roster; a player's page; Esc closes it.
 *
 * Measured from OUTSIDE the game (this test's evaluate).  Pictures
 * (deviceScaleFactor 1): tools/qa/out/menus3roster-*.png. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');

const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const attrs = (P, sel, a) => P.page.evaluate(([s, n]) => Array.from(document.querySelectorAll(s)).map((el) => el.getAttribute(n)), [sel, a]);
const pstate = (P) => P.page.evaluate(() => { const s = window.__btMenus3.panelState(); const t = window.__btMenus3.top(); return { open: s.open, menu: s.menu, section: s.section, depth: s.nav ? s.nav.length : 0, page: t ? t.page : null, rail: t ? t.rail : null, arg: t ? t.arg : null }; });
const roster = (P) => P.page.evaluate(() => window.__btMenus3Roster || null);
const player = (P) => P.page.evaluate(() => window.__btMenus3Player || null);
const small = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-menus3-panel] button, [data-menus3-panel] input')).map((el) => { const r = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((b) => b.w > 0 && (b.w < 44 || b.h < 44)));

async function tap(P, sel, touch) {
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(600);
  return true;
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3roster-' + name + '.png') }); } catch (e) { /* a picture only */ }
}
async function ready(P) {
  await P.page.waitForFunction(() => !!(window.__btMenus3 && window.__btMenus3.on()), null, { timeout: 30000 }).catch(() => {});
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
  await P.page.waitForTimeout(1500);
}
async function openPeople(P, touch) {
  await tap(P, '[data-menus3-dock="people"]', touch);
  await P.page.waitForTimeout(700);
  return pstate(P);
}
const myId = (P) => H.readState(P, (S) => S.myId);

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright, two players ── */
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Rosta', nameB: 'Rostb', world: 'wheel', touch: true, viewport: { width: 390, height: 844 }, query: 'menus3=1' });
  let aId = null;
  try {
    await ready(A); await ready(B);
    aId = await myId(A);
    const bId = await myId(B);
    rec.ok('upright: both on the new menus', (await A.page.evaluate(() => window.__btMenus3.on())) && (await B.page.evaluate(() => window.__btMenus3.on())), null);
    let ps = await openPeople(A, true);
    rec.ok('upright: People opens the new panel on Roster', ps.open && ps.menu === 'people' && ps.section === 'roster' && ps.page === 'root', ps);
    const tabs = await attrs(A, '[data-menus3-tab]', 'data-menus3-tab');
    rec.ok('upright: its tabs Roster, Chat, Ranks and the X', tabs.join() === 'roster,chat,ranks' && !!(await box(A, '[data-menus3-x]')), tabs);
    const segs = await attrs(A, '[data-m3-seg]', 'data-m3-seg');
    rec.ok('upright: the segments Nearby, Friends, Requests, Blocked', segs.join() === 'nearby,friends,requests,blocked', segs);
    let R = await roster(A);
    rec.ok('upright: alone, the one slim "No party" line with Create', !!R && R.party === 'none' && !!(await box(A, '[data-m3-party-create]')), R);
    rec.ok('upright: Nearby lists the other player', !!R && R.seg === 'nearby' && R.nearby.includes(bId) && !R.nearby.includes(aId), R && R.nearby);
    let sm = await small(A);
    rec.ok('upright: every tappable thing 44 x 44 or more', sm.length === 0, sm);
    await shot(A, 'upright-alone');
    await tap(A, '[data-m3-seg="friends"]', true);
    await tap(A, '[data-m3-party-create]', true);
    R = await roster(A);
    rec.ok('upright: Create lights Nearby, and says how a party starts', !!R && R.seg === 'nearby' && !!(await box(A, '[data-m3-party-how]')), R && R.seg);

    /* the invite, and the other's yes */
    await tap(A, `[data-m3-near="${bId}"] [data-m3-row-act="invite"]`, true);
    await B.page.waitForTimeout(1500);
    /* the other's yes, as the invite card's Join sends it (PartyHUD.jsx; the frame as mp-charhud sends one) */
    const invited = await B.page.evaluate(() => !!document.querySelector('[data-party-invite]'));
    rec.ok('upright: the other gets the invite card', invited, null);
    await B.page.evaluate((id) => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'broadcast', event: 'party_accept', payload: { target: id } }); }, aId);
    const pa = await H.waitFor(A, (S) => (S._party && S._party.state === 'open' ? S._party.members.length : 0), (n) => n === 2, { timeout: 15000, label: 'a party of two' }).catch(() => null);
    rec.ok('upright: the row\'s Invite and the other\'s yes make a party of two', pa === 2, { pa });
    await A.page.waitForTimeout(1500);
    R = await roster(A);
    rec.ok('upright: the party bar lists both, the leader (you) first', !!R && R.party === 'party' && R.n === 2 && R.members[0] === aId && R.members.includes(bId), R);
    await shot(A, 'upright-party');
    /* the chip opens Roster */
    await tap(A, '[data-menus3-x]', true);
    const chip = await box(A, '[data-party-chip]');
    if (chip) {
      await tap(A, '[data-party-chip]', true);
      ps = await pstate(A);
      rec.ok('upright: the party chip opens Roster', ps.open && ps.section === 'roster' && ps.page === 'root', ps);
    } else {
      rec.ok('upright: the party chip is on screen', false, null);
      await openPeople(A, true);
    }
    /* a member's page, the leader's Remove, Back */
    await tap(A, `[data-m3-member="${bId}"]`, true);
    ps = await pstate(A);
    let PL = await player(A);
    rec.ok('upright: a member opens the Player page in the panel', ps.page === 'player' && ps.arg === bId && !!PL && PL.id === bId, { ps, PL });
    rec.ok('upright: its actions are today\'s (Message, Remove from party, Trade, Duel, Add friend, the card, Block...)', !!PL && ['kick', 'trade', 'duel', 'friend', 'card', 'block'].every((a) => PL.acts.includes(a)) && !PL.acts.includes('invite'), PL && PL.acts);
    rec.ok('upright: its header has Back and the player\'s name', !!(await box(A, '[data-menus3-back]')) && /Rostb/.test(await A.page.evaluate(() => (document.querySelector('[data-menus3-title]') || {}).textContent || '')), null);
    sm = await small(A);
    rec.ok('upright: the page\'s tappable things 44 x 44 or more', sm.length === 0, sm);
    await shot(A, 'upright-player');
    /* Add friend: the other's Requests */
    await tap(A, '[data-m3-pact="friend"]', true);
    PL = await player(A);
    rec.ok('upright: Add friend is sent (the page says so)', !!PL && /Friend request sent/.test(PL.note || ''), PL && PL.note);
    await openPeople(B, true);
    await tap(B, '[data-m3-seg="requests"]', true);
    await B.page.waitForTimeout(1500);
    const RB = await roster(B);
    rec.ok('upright: the other sees the request (its count, the row with Accept)', !!RB && RB.counts.requests >= 1 && RB.requests.includes(aId) && !!(await box(B, `[data-m3-request="${aId}"] [data-m3-req-act="accept"]`)), RB);
    await shot(B, 'upright-requests');
    /* Message: v2.3.6870 (card MN step 11) People · Chat in the panel, on Whispers aimed at them; Back is their page */
    const hasMsg = !!PL && PL.acts.includes('message');
    if (hasMsg) {
      await tap(A, '[data-m3-pact="message"]', true);
      await A.page.waitForTimeout(900);
      ps = await pstate(A);
      const ch = await A.page.evaluate(() => window.__btMenus3Chat || null);
      rec.ok('upright: Message opens People · Chat on Whispers, aimed at them', ps.open && ps.page === 'whisper' && ps.arg === 'Rostb' && !!ch && ch.tab === 'whispers' && ch.to === 'Rostb', { ps, ch });
      await tap(A, '[data-menus3-back]', true);
      ps = await pstate(A);
      rec.ok('upright: Back from the whisper is their page', ps.open && ps.page === 'player' && ps.arg === bId, ps);
    } else {
      rec.ok('upright: Message (the worker\'s whisper lane)', false, PL && PL.acts);
    }
    await tap(A, '[data-menus3-back]', true);
    ps = await pstate(A);
    rec.ok('upright: Back is the Roster', ps.page === 'root' && ps.section === 'roster', ps);
    /* Leave: two taps; gone on both */
    /* the two taps inside the chip's three seconds (MENUS3_ROSTER_ARM_MS): one quick read between */
    await tap(A, '[data-m3-party-leave]', true);
    const armedNow = await A.page.evaluate(() => { const b = document.querySelector('[data-m3-party-leave]'); const a = b ? b.getAttribute('data-m3-party-leave') : null; if (b) b.click(); return a; });
    rec.ok('upright: Leave\'s first tap only asks', armedNow === 'armed', armedNow);
    /* the one who left has no party; the other is alone in theirs or has none (parties last: partykeep) */
    const left = await H.waitFor(A, (S) => (S._party && S._party.state === 'open' ? S._party.members.length : 0), (n) => n === 0, { timeout: 15000, label: 'left' }).catch(() => null);
    const other = await H.waitFor(B, (S) => (S._party && S._party.state === 'open' ? S._party.members.length : 0), (n) => n < 2, { timeout: 15000, label: 'the other alone' }).catch(() => null);
    await A.page.waitForTimeout(1200);
    R = await roster(A);
    rec.ok('upright: the second tap leaves; your bar is the slim line again, the other is no longer with you', left === 0 && other !== null && other < 2 && !!R && R.party === 'none', { left, other, R: R && R.party });
    /* the old list's doors */
    await tap(A, '[data-menus3-x]', true);
    await A.page.evaluate(() => { try { window.__broLegacyUI.playersOpen(); } catch (e) { /* no door */ } });
    await A.page.waitForTimeout(800);
    ps = await pstate(A);
    R = await roster(A);
    rec.ok('upright: the old player list\'s door opens Roster on Nearby, the old list never shows', ps.open && ps.section === 'roster' && !!R && R.seg === 'nearby' && !(await box(A, '.bt-plist')), { ps, plist: !!(await box(A, '.bt-plist')) });
    const tw = await A.page.evaluate(() => { const S = window._gameState.current; return !!(S && S._serverCaps && S._serverCaps.whisper); });
    rec.ok('upright: the worker carries whispers (the page\'s Message rides on it)', tw, null);
  } catch (e) { rec.ok('upright: ran', false, String(e).slice(0, 200)); }

  /* ── 2. sideways: a third player; the first in Nearby ── */
  const S2 = await H.newPlayer(browser, { name: 'Rostside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    await H.enterWorld(S2);
    await ready(S2);
    await H.waitMutualSight(A, S2).catch(() => null);   /* a newcomer sees a player once both move (joinPair's way) */
    const ps = await openPeople(S2, true);
    const pb = await box(S2, '[data-menus3-panel]');
    rec.ok('sideways: People opens the drawer, 40% wide on the right, on Roster', ps.open && ps.section === 'roster' && !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, { ps, pb });
    const R = await roster(S2);
    rec.ok('sideways: Nearby lists the first player', !!R && R.nearby.includes(aId), R && R.nearby);
    let sm = await small(S2);
    rec.ok('sideways: every tappable thing 44 x 44 or more', sm.length === 0, sm);
    await shot(S2, 'sideways-roster');
    await tap(S2, `[data-m3-player-row="${aId}"]`, true);
    const PL = await player(S2);
    rec.ok('sideways: their page inside the drawer, with Invite', !!PL && PL.id === aId && PL.acts.includes('invite') && !!(await box(S2, '[data-menus3-panel] [data-m3-player]')), PL);
    sm = await small(S2);
    rec.ok('sideways: its tappable things 44 x 44 or more', sm.length === 0, sm);
    await shot(S2, 'sideways-player');
  } finally { await S2.page.context().close().catch(() => {}); }

  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Rostdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    await H.enterWorld(D);
    await ready(D);
    await H.waitMutualSight(A, D).catch(() => null);
    let ps = await openPeople(D, false);
    await D.page.waitForFunction(() => !!document.querySelector('[data-m3-player-row]'), null, { timeout: 60000 }).catch(() => {});
    const first = (await attrs(D, '[data-m3-player-row]', 'data-m3-player-row'))[0] || null;
    rec.ok('computer: People opens the drawer on Roster', ps.open && ps.section === 'roster' && (await D.page.evaluate(() => window.__btMenus3.shape())) === 'drawer', ps);
    await tap(D, `[data-m3-player-row="${first}"]`, false);
    ps = await pstate(D);
    rec.ok('computer: a row opens that player\'s page', !!first && ps.page === 'player' && ps.arg === first, { ps, first });
    await shot(D, 'computer-player');
    await D.page.keyboard.press('Escape');
    await D.page.waitForTimeout(600);
    ps = await pstate(D);
    rec.ok('computer: Esc closes it', !ps.open, ps);
  } finally { await D.page.context().close().catch(() => {}); }
  await B.page.context().close().catch(() => {});
  await A.page.context().close().catch(() => {});
}
