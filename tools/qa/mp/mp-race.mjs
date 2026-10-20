/* LIL BRO'S RACE, ON A PHONE -- v2.3.3510.
 *
 * The owner: "a quest racing an npc (like a clone of you) where you have to
 * sprint around a simple course."  The tour's race_1 (src/game/race.js on the
 * phone, server/src/race.js on the worker, which judges it).
 *
 *   1. The tour jumped to Lil Bro (the operator's /dev/tour), his offer taken
 *      by walking up to him, as a player does.
 *   2. Walking back up, his line carries a Race! button (the brass one) and
 *      the line's own Close goes quiet beside it.
 *   3. Race!: the worker's course comes back -- five flags in the world, the
 *      countdown in the middle of the screen, the bro held on the line through
 *      it (a thumb on the stick moves nothing), Lil Bro on his mark.
 *   4. From the gun: Lil Bro runs the worker's path at its speed (he leaves
 *      his spot), the gold road on the minimap leads to the next flag, each
 *      flag touched turns green as the worker says so, and the lap -- run at
 *      the pace the worker allows, faster than his -- is a WIN: the result
 *      card, the worker's count for race_1, and his claim when you walk up.
 *   5. A false start: walked off the line in the countdown (past the hold), the
 *      worker calls it, and the card says so with "Race again".
 *
 * The lap is run by moving the bro along the flags in steps the worker's move
 * budget takes (H.hopTo, ~385 px a second, past Lil Bro's 165): this checks
 * the race, not a thumb.  The judging's every rule is the `tour` suite's.
 */
import * as H from './harness.mjs';
import { RACE } from '../../../server/src/race.js';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Speedy', wsPort, webPort, world: 'wheel' });
  await H.enterWorld(P);
  const there = await H.waitFor(P, (S) => ({ z: S.currentZone, loading: !!S._zoneLoading, lil: !!(S.npcs || []).find((n) => n && n.name === 'Lil Bro') }),
    (v) => v.z === 'wheel' && !v.loading && v.lil, { timeout: 120000, label: 'the Wheel, Lil Bro on the square' }).catch(() => null);
  rec.ok('in the Wheel\'s BroTown, Lil Bro on the square', !!there, there);
  await P.page.waitForTimeout(1200);
  const myId = await H.readState(P, (S) => S.myId);
  const caps = await H.readState(P, (S) => ({ race: !!(S._serverCaps && S._serverCaps.race), tour: !!(S._serverCaps && S._serverCaps.tour) }));
  rec.ok('the worker runs the race and the tour (caps.race, caps.tour)', caps.race && caps.tour, caps);

  /* ── 1. at Lil Bro's step of the tour ── */
  const jumped = await H.devOp(wsPort, 'tour', myId, { at: 'race_1' });
  rec.ok('the tour jumped to Lil Bro\'s race (race_1 on offer)', !!jumped && jumped.ok === true, jumped);
  await P.page.waitForTimeout(1500);
  rec.ok('walking up to Lil Bro opens his offer', await H.approachNpc(P, 'lil_bro'));
  const landed = await H.advanceNpcDialogue(P);
  const offerText = await P.page.evaluate(() => { const c = document.querySelector('.bt-qoffer'); return c ? c.innerText : ''; });
  rec.ok('...his lines lead to the offer: Race Day', landed === 'offer' && /Race Day/.test(offerText), { landed, offerText: offerText.slice(0, 120) });
  rec.ok('...accepted', await H.confirmQuestOffer(P));
  await P.page.waitForTimeout(1500);

  /* ── 2. his "how's it going" line carries Race! ── */
  rec.ok('walking back up opens his line again', await H.approachNpc(P, 'lil_bro'));
  for (let i = 0; i < 8; i++) {
    const lastLine = await P.page.evaluate(() => !!document.querySelector('[data-qa="race-go"]'));
    if (lastLine) break;
    await P.page.evaluate(() => { const b = document.querySelector('.bt-npcdlg-next'); if (b) b.click(); });
    await P.page.waitForTimeout(250);
  }
  const btns = await P.page.evaluate(() => {
    const go = document.querySelector('[data-qa="race-go"]'), close = document.querySelector('.bt-npcdlg-next');
    return { go: go ? go.innerText.trim() : null, goPrimary: !!go && go.classList.contains('button-primary'),
      close: close ? close.innerText.trim() : null, closeQuiet: !!close && close.classList.contains('bt-npcdlg-next--quiet') };
  });
  rec.ok('...his last line has the brass Race! button, its Close quiet beside it',
    btns.go === 'Race!' && btns.goPrimary && btns.close === 'Close' && btns.closeQuiet, btns);

  /* ── 3. Race!: the course, the countdown, the hold ── */
  const pressed = await H.clickSel(P, '[data-qa="race-go"]').then(() => true).catch(() => false);
  rec.ok('Race! can be pressed', pressed);
  const course = await H.waitFor(P, (S) => {
    const r = S._race;
    return r && r.phase === 'count' ? { flags: r.flags.length, next: r.next, drawn: (window.__btRaceFlags || []).length,
      count: document.querySelector('[data-race="count"]') ? document.querySelector('[data-race="count"]').getAttribute('data-race-count') : null,
      held: window.__btRace ? window.__btRace().held : null } : null;
  }, (v) => !!v && v.drawn === RACE.FLAGS.length && v.count != null, { timeout: 6000, label: 'the countdown' }).catch(() => null);
  rec.ok(`the worker's course comes back: ${RACE.FLAGS.length} flags drawn in the world and the countdown on screen, the bro held`,
    !!course && course.flags === RACE.FLAGS.length && course.held === true, course);
  const p0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  await P.page.keyboard.down('ArrowLeft');
  await P.page.waitForTimeout(700);
  await P.page.keyboard.up('ArrowLeft');
  const p1 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, phase: S._race && S._race.phase }));
  rec.ok('...a walk during the countdown goes nowhere (held on the line)',
    p1.phase !== 'count' || Math.hypot(p1.x - p0.x, p1.y - p0.y) < 4, { p0, p1 });
  const lil0 = await H.readState(P, (S) => { const n = (S.npcs || []).find((o) => o && o.name === 'Lil Bro'); return n ? { x: n.x, y: n.y } : null; });

  /* ── 4. the gun, and the lap ── */
  const gun = await H.waitFor(P, (S) => S._race && S._race.phase, (ph) => ph === 'run', { timeout: 6000, label: 'the gun' }).catch(() => null);
  rec.ok('the gun goes (the race is running)', gun === 'run', gun);
  const flags = await H.readState(P, (S) => S._race.flags.map((f) => [f[0], f[1]]));
  let roadOk = 0, greens = 0;
  for (let i = 0; i < flags.length; i++) {
    const road = await H.readState(P, () => (window.__btMinimap && window.__btMinimap.quest) || null);
    if (road && Math.abs(road.x - flags[i][0]) < 2 && Math.abs(road.y - flags[i][1]) < 2) roadOk++;
    await H.hopTo(P, flags[i][0], flags[i][1], { step: 95, gap: 250 });
    await P.page.waitForTimeout(350);
    if (i < flags.length - 1) {
      const st = await H.readState(P, () => (window.__btRaceFlags || []).map((f) => f.state));
      if (st[i] === 'done') greens++;
    }
  }
  const lilRan = await H.readState(P, (S) => { const n = (S.npcs || []).find((o) => o && o.name === 'Lil Bro'); return n ? { x: n.x, y: n.y } : null; });
  rec.ok('Lil Bro ran the course from the gun (he left his spot)', !!lil0 && !!lilRan && Math.hypot(lilRan.x - lil0.x, lilRan.y - lil0.y) > 200, { lil0, lilRan });
  rec.ok(`the gold road led to each flag in turn (${roadOk} of ${flags.length})`, roadOk >= flags.length - 1, roadOk);
  rec.ok(`each corner flag turned green as the worker counted it (${greens} of ${flags.length - 1})`, greens === flags.length - 1, greens);
  const result = await H.waitFor(P, () => {
    const c = document.querySelector('[data-race="done"]');
    return c ? { won: c.getAttribute('data-race-won'), text: (c.innerText || '').replace(/\s+/g, ' ').trim() } : null;
  }, (v) => !!v, { timeout: 8000, label: 'the result card' }).catch(() => null);
  rec.ok('the finish: the result card says you beat Lil Bro, with both times', !!result && result.won === '1' && /You beat Lil Bro/.test(result.text) && /Lil Bro \d/.test(result.text), result);
  const srv = await H.adminPlayer(wsPort, myId);
  const qk = srv && srv.rpg && srv.rpg._questKills;
  rec.ok('...the WORKER counted the win for race_1', !!qk && qk.race_1 >= 1, qk);

  /* his claim, when you walk up (he has finished his lap and is home) */
  await P.page.waitForTimeout(16000);
  rec.ok('walking up to Lil Bro now opens the claim', await H.approachNpc(P, 'lil_bro'));
  const claimed = await H.claimOnLastLine(P);
  rec.ok('...and his last line\'s "Claim reward" pays it', claimed);
  await P.page.waitForTimeout(2200);
  const done = await H.adminPlayer(wsPort, myId);
  rec.ok('the WORKER marks race_1 turned in',
    !!done && done.rpg && done.rpg._quests.race_1 === 'turnedIn', done && done.rpg && done.rpg._quests);
  /* v2.3.3510: the town opens all at once after the Mayor's first quest, so
     nothing is handed on by `next`; the road and the pinned card suggest the
     tour's next step (QUEST_TOUR: the Beastmaster's traps) */
  await H.leaveNpc(P, 'lil_bro').catch(() => {});
  const nextCard = await H.waitFor(P, () => {
    const c = document.querySelector('[data-quest-hud-next]');
    return c ? c.getAttribute('data-quest-hud-next') : null;
  }, (v) => v === 'beast_1', { timeout: 12000, label: 'the card\'s next step' }).catch(() => null);
  rec.ok('...and the quest card suggests the Beastmaster\'s traps next', nextCard === 'beast_1', nextCard);

  /* ── 5. a false start ── */
  await H.devOp(wsPort, 'tour', myId, { at: 'race_1' });
  await P.page.waitForTimeout(1200);
  await H.approachNpc(P, 'lil_bro');
  await H.advanceNpcDialogue(P);
  await H.confirmQuestOffer(P);
  await P.page.waitForTimeout(1200);
  await H.approachNpc(P, 'lil_bro');
  for (let i = 0; i < 8; i++) {
    if (await P.page.evaluate(() => !!document.querySelector('[data-qa="race-go"]'))) break;
    await P.page.evaluate(() => { const b = document.querySelector('.bt-npcdlg-next'); if (b) b.click(); });
    await P.page.waitForTimeout(250);
  }
  await H.clickSel(P, '[data-qa="race-go"]').catch(() => {});
  await H.waitFor(P, (S) => S._race && S._race.phase, (ph) => ph === 'count', { timeout: 5000, label: 'the countdown' }).catch(() => null);
  /* off the line past the hold (a script, not a thumb), then the gun, and a
     step after it -- the first step the worker judges is from off the line */
  await P.page.evaluate(() => { const S = window._gameState.current; S.player.x -= 260; });
  await H.waitFor(P, (S) => S._race && S._race.phase, (ph) => ph === 'run' || ph === 'done', { timeout: 6000, label: 'the gun' }).catch(() => null);
  await P.page.evaluate(() => { const S = window._gameState.current; S.player.x -= 30; });
  const early = await H.waitFor(P, () => {
    const c = document.querySelector('[data-race="done"]');
    return c ? { err: c.getAttribute('data-race-err'), again: !!c.querySelector('[data-race-again]'), text: (c.innerText || '').replace(/\s+/g, ' ').trim() } : null;
  }, (v) => !!v, { timeout: 12000, label: 'the false start' }).catch(() => null);
  rec.ok('walked off the line before the gun: the worker calls a false start, and the card offers Race again',
    !!early && early.err === 'early' && early.again && /False start/.test(early.text), early);

  await P.ctx.close().catch(() => {});
}
