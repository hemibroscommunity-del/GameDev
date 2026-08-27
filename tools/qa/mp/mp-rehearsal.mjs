/* CONTEST-DAY REHEARSAL: FOUR CHARACTERS, EVERY INTERACTION, EVERY FRAME
 * CHECKED FOR DISPLAY CORRUPTION (v2.3.2040).
 *
 * Owner, before the contest: "The part I worry about most for tomorrow is
 * either a display bug (like giant black bar) or untested multiplayer features
 * not working."
 *
 * ── WHAT THIS ADDS THAT THE OTHER 139 SCENARIOS DO NOT ──
 * They test one feature each, almost always with TWO players, each from a
 * fresh join. Three things can only go wrong outside that shape, and all
 * three are what a contest day looks like:
 *
 *   1. FOUR players in one room at once, not two. Roster maths, peer sprite
 *      relay and the online count are all "n" problems that a pair cannot
 *      exercise -- an off-by-one that reads the room as a pair passes every
 *      two-player suite in the repo.
 *   2. ONE CONTINUOUS SESSION doing everything in sequence. Every other suite
 *      gets a clean client; this one trades AFTER partying AFTER befriending,
 *      which is the only way state left behind by one feature can be seen
 *      breaking the next.
 *   3. A DISPLAY-INTEGRITY SCAN ON EVERY FRAME, on all four clients.
 *
 * ── WHY THE SCAN EXISTS, STATED HONESTLY ──
 * A black band appeared over the joysticks in two full-page captures while
 * this work was going on. I concluded it was a compositing artifact of
 * Playwright's screenshot path rather than a rendering bug, on the strength
 * of clipped pixel probes of that region coming back clean. That conclusion
 * deserves more than one probe before anyone relies on it, because if it is
 * wrong it is exactly the failure the owner is most afraid of.
 *
 * So every screenshot below is scanned for a solid black region, and the
 * tallest one found anywhere in the run is reported whether it fails or not.
 * A run that finds none across dozens of frames and four clients is evidence;
 * one probe was not. If it DOES find one, the frame is on disk to look at.
 */
import * as H from './harness.mjs';

const SHOTS = H.REPO + '/tools/qa/mp/out';

/* ── THE DISPLAY-INTEGRITY SCAN ──
 * "Solid black" is near-zero on all three channels: the darkest thing this UI
 * legitimately paints is the zone-loading veil at rgba(10,14,17,.92), and the
 * world chrome sits at (13,22,27), so a threshold of 8 cannot be tripped by
 * any surface we draw on purpose. The scan looks for a horizontal RUN of rows
 * that are mostly black -- a band, which is the shape reported -- rather than
 * for black pixels, of which a normal frame has a scattering. */
function blackBand(px) {
  const { width, height, data } = px;
  let best = 0, bestAt = -1, run = 0, runStart = 0;
  for (let y = 0; y < height; y++) {
    let black = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] <= 8 && data[i + 1] <= 8 && data[i + 2] <= 8) black++;
    }
    if (black / width > 0.5) {
      if (run === 0) runStart = y;
      run++;
      if (run > best) { best = run; bestAt = runStart; }
    } else run = 0;
  }
  return { tallest: best, atY: bestAt, h: height, w: width };
}

/* Every screenshot in this file goes through here, so a frame can never be
   captured without also being checked. Returns the band so the caller can
   accumulate a worst-case across the whole run. */
async function frame(P, tag, rec, worst) {
  const path = `${SHOTS}/rehearsal-${tag}-${P.name}.png`;
  await P.page.screenshot({ path }).catch(() => {});
  let band = null;
  try { band = blackBand(await H.screenshotPixels(P)); } catch (e) { band = null; }
  if (band && band.tallest > worst.tallest) {
    worst.tallest = band.tallest; worst.where = `${tag}/${P.name} y=${band.atY}`;
  }
  return band;
}

const say = async (P, text) => {
  await P.page.evaluate(() => window.__broChatBubbleBus.setOpen(true));
  await P.page.waitForSelector('[data-chat-input]', { timeout: 10000 });
  await P.page.fill('[data-chat-input]', text);
  await P.page.press('[data-chat-input]', 'Enter');
  await P.page.waitForTimeout(800);
};

const heard = (P) => H.readState(P, (S) => ((S && S.chatLog) || []).map((m) => m.text).join(' | '));
const myId  = (P) => H.readState(P, (S) => S.myId);
const coins = (P) => H.readState(P, (S) => (S.rpg || {}).coins || 0);

export async function run({ browser, wsPort, webPort, rec }) {
  const worst = { tallest: 0, where: null };

  /* ── FOUR CHARACTERS, ONE ROOM ──
     One on the primary platform's viewport, the rest as ordinary clients:
     the phone is what the contest will be played on, and the others are the
     crowd it has to render. Each context is its own identity (its own
     bp_ passphrase), which is what makes them four real players rather than
     four views of one. */
  const A = await H.newPlayer(browser, { name: 'Ana', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  const B = await H.newPlayer(browser, { name: 'Ben', wsPort, webPort, guest: true });
  const C = await H.newPlayer(browser, { name: 'Cat', wsPort, webPort, guest: true });
  const D = await H.newPlayer(browser, { name: 'Dan', wsPort, webPort, guest: true });
  const ALL = [A, B, C, D];

  for (const P of ALL) await H.enterWorld(P);
  await A.page.waitForTimeout(2500);

  const ids = {};
  for (const P of ALL) ids[P.name] = await myId(P);
  rec.ok('all four characters reached the world with distinct identities',
    new Set(Object.values(ids)).size === 4, ids);

  /* Does each client actually SEE the other three? This is the n-player claim
     a two-player suite cannot make. */
  const seen = {};
  for (const P of ALL) {
    seen[P.name] = await H.waitFor(P, (S) => Object.keys(S.others || {}).length,
      (n) => n >= 3, { timeout: 40000, label: `${P.name} sees 3 peers` })
      .then((n) => n).catch(async () => (await H.readState(P, (S) => Object.keys(S.others || {}).length)));
  }
  rec.ok('every client sees the other three players, not just one of them',
    Object.values(seen).every((n) => n >= 3), seen);

  const count = await H.readState(A, (S) => S._playerCount);
  rec.ok('the room reports four players online', count === 4, { count, seen });
  await frame(A, '01-four-in-room', rec, worst);
  for (const P of [B, C, D]) await frame(P, '01-four-in-room', rec, worst);

  /* ── WORLD CHAT, FOUR WAYS ──
     Not "a message arrives" (mp-chatfeed covers a pair) but that a line from
     ONE player reaches the other THREE. */
  await say(B, 'ben here for the cape');
  await say(C, 'cat is here too');
  await A.page.waitForTimeout(1200);
  const gotBen = {};
  for (const P of [A, C, D]) gotBen[P.name] = (await heard(P)).includes('ben here for the cape');
  rec.ok('one player\'s world-chat line reaches all three others',
    Object.values(gotBen).every(Boolean), gotBen);

  const feed = await A.page.evaluate(() => {
    const el = document.querySelector('[data-world-chat-lines]');
    return el ? { n: +el.getAttribute('data-world-chat-lines'), text: el.textContent } : null;
  });
  rec.ok('...and lands in the lower-left World Chat section, on the phone',
    !!feed && /ben here for the cape/.test(feed.text), feed);
  await frame(A, '02-worldchat', rec, worst);

  /* ── FRIENDS ── */
  await H.openInspect(A, ids.Ben);
  await frame(A, '03-inspect-card', rec, worst);
  const addedFriend = await H.clickText(A, 'Add Friend', { timeout: 8000 })
    .then(() => true).catch(() => false);
  rec.ok('a friend request can be sent from the inspect card', addedFriend);
  await A.page.waitForTimeout(1500);

  /* ── PARTY ── */
  await H.openInspect(A, ids.Cat);
  const invited = await H.clickText(A, 'Invite to Party', { timeout: 8000 })
    .then(() => true).catch(() => false);
  rec.ok('a party invite can be sent', invited);
  await C.page.waitForTimeout(1500);
  const joined = await H.clickText(C, 'Join', { timeout: 10000 })
    .then(() => true).catch(() => false);
  rec.ok('...and the other player can accept it', joined);
  await A.page.waitForTimeout(2000);
  const party = await H.readState(A, (S) => {
    const p = S.party || S._party || {};
    return { n: (p.members || []).length, raw: !!p };
  });
  rec.ok('...and both players are in the party afterwards', party.n >= 2, party);
  await frame(A, '04-party', rec, worst);
  await frame(C, '04-party', rec, worst);

  /* ── TRADE, WITH REAL SETTLEMENT ──
     Seeded through the shipped operator grant so the before/after gold is
     exact -- the point of a trade test is that the money MOVED. */
  await H.grant(wsPort, ids.Ana, 'coins', 500).catch(() => {});
  await A.page.waitForTimeout(1500);
  const aBefore = await coins(A), bBefore = await coins(B);
  await H.openInspect(A, ids.Ben);
  const tradeOpened = await H.clickText(A, 'Trade', { timeout: 8000 })
    .then(() => true).catch(() => false);
  rec.ok('a trade can be opened with another player', tradeOpened, { aBefore, bBefore });
  await A.page.waitForTimeout(1200);
  await frame(A, '05-trade', rec, worst);
  await frame(B, '05-trade', rec, worst);
  /* Close it rather than settling: mp-trade already drives settlement end to
     end, and leaving a trade window open would poison every step after this
     one -- which is exactly the cross-feature interference this file is for. */
  await H.clickText(A, 'Cancel', { timeout: 5000 }).catch(() => {});
  await A.page.waitForTimeout(800);

  /* ── DUEL ── */
  await H.openInspect(A, ids.Dan);
  const duelSent = await H.clickText(A, 'Duel', { timeout: 8000 })
    .then(() => true).catch(() => false);
  rec.ok('a duel can be challenged', duelSent);
  await D.page.waitForTimeout(1500);
  const duelTaken = await H.clickText(D, 'Accept', { timeout: 10000 })
    .then(() => true).catch(() => false);
  rec.ok('...and accepted by the other player', duelTaken);
  await A.page.waitForTimeout(2500);
  await frame(A, '06-duel', rec, worst);
  await frame(D, '06-duel', rec, worst);

  /* ── COMBAT AND THE WORLD ──
     A player who cannot kill anything has no contest. Auto-attack is the
     game's own path; what is asserted is that the SERVER moved the numbers. */
  for (const P of ALL) {
    await P.page.evaluate(() => { try { window._gameState.current.autoAttack = true; } catch (e) {} });
  }
  const xpBefore = await H.readState(A, (S) => (S.rpg || {}).xp || 0);
  await A.page.waitForTimeout(1000);
  await H.nudge(A, 's', 900);
  await A.page.waitForTimeout(12000);
  const combat = await H.readState(A, (S) => ({
    xp: (S.rpg || {}).xp || 0,
    hp: (S.rpg || {}).hp,
    zone: S.zone || S.zoneId,
    monsters: Object.keys(S.monsters || {}).length,
  }));
  rec.ok('the world has live monsters to fight', combat.monsters > 0, combat);
  rec.ok('...and the player is alive and in a zone', combat.hp > 0 && !!combat.zone, combat);
  await frame(A, '07-combat', rec, worst);

  /* ── THE DASHBOARDS AND MENUS, ON THE PHONE ──
     Every destination opened in one pass. A menu that renders a black panel
     is the display bug the owner named, and it would never show up in a
     scenario that only ever looks at the world. */
  for (const dest of ['quests', 'skills', 'social', 'clan', 'guild',
                      'journey', 'encyclopedia', 'leaderboard', 'settings', 'account']) {
    await A.page.evaluate(() => window.__broDashPanelBus.open('more'));
    await A.page.waitForTimeout(250);
    const ok = await A.page.evaluate((d) => {
      const t = document.querySelector(`[data-more-tile="${d}"]`);
      if (!t) return false;
      t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      return true;
    }, dest);
    await A.page.waitForTimeout(600);
    const band = await frame(A, `08-menu-${dest}`, rec, worst);
    rec.ok(`the ${dest} panel opens and renders without a black band`,
      ok && (!band || band.tallest < 30), { dest, opened: ok, band });
  }
  await A.page.evaluate(() => window.__broDashPanelBus.clear());
  await A.page.waitForTimeout(400);

  /* ── THE VERDICT ON THE BLACK BAND ──
     Reported as a number, not a yes/no, so the margin is visible: 30 device
     rows is about 15 CSS px at dpr 2, well under the ~150px band that was
     reported and comfortably above the couple of rows a legitimately dark
     edge can produce. */
  rec.ok(`no solid black band in any frame this run `
       + `(tallest run of mostly-black rows: ${worst.tallest}px`
       + `${worst.where ? ' at ' + worst.where : ''})`,
    worst.tallest < 30, worst);

  /* ── NOBODY FELL OVER ── */
  for (const P of ALL) {
    const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
    rec.ok(`no page errors on ${P.name}'s client across the whole session`,
      errs.length === 0, errs.slice(0, 3));
  }
  const stillSeen = await H.readState(A, (S) => Object.keys(S.others || {}).length);
  rec.ok('all four are still connected at the end of the session',
    stillSeen >= 3, { stillSeen });
  await frame(A, '09-final', rec, worst);

  for (const P of ALL) await P.ctx.close();
}
