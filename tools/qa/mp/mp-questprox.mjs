/* A TOWNSPERSON TALKS WHEN YOU TAP HIM, NEVER BY WALKING UP (v2.3.3583).
 *
 * The owner, 2026-10-23: "I think I want to change the npc dialog behavior to
 * be tap only instead of proximity based. I keep opening dialog by accident.
 * Like racing lil bro past the mayor the mayor window talking to me opened
 * up."  Until then this file proved the opposite -- v2.3.1701's walk-up opener
 * (the owner then: "make the quest dialog with mayor bro pop up when you get
 * in close proximity to him instead of needing to tap him") and its latch --
 * which is put away now behind `?npcprox` (BroTown NPC_PROX_OPENS).
 *
 * In the world's BroTown, on a phone:
 *   1. standing right beside Mayor Bro, his quest waiting, opens nothing;
 *   2. walking through him and on past opens nothing;
 *   3. a tap on him, where a thumb lands, opens his window;
 *   4. closed while standing there, it stays closed;
 *   5. the right stick's tap opens it;
 *   6. E on a keyboard opens it, his quest coming before a door (desktopControls
 *      questWaits) -- v2.3.3834: except where the door's prompt is up, where E
 *      does what that prompt says (the judge pass: "E ENTER TOWN HALL" talked
 *      to the Mayor); so 6 finds a spot beside him with no door prompt (E
 *      talks) and, where there is one, a spot with it up (E opens the door);
 *   7. beside Diego no shop opens, and a tap on him opens it;
 *   8. a READY quest: beside him nothing opens, and a tap opens the turn-in;
 *   9. with `?npcprox` walking up opens him again (the switch works);
 *  10. with Diego's quest under way (fish_1), his line carries "Open the
 *      shop": walking up opened his shop then, and a tap is his quest's line.
 *
 * Moved to the world (it was on the old map's frozen list) as it was touched.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* Put the player at an offset from a townsperson; returns where, so a failure
   says how far away he was. */
const place = (P, id, dx, dy) => P.page.evaluate(({ who, ox, oy }) => {
  const S = window._gameState && window._gameState.current;
  const npc = ((S && S.npcs) || []).find((n) => n && n.id === who);
  if (!S || !npc || !S.player) return null;
  S.player.x = npc.x + ox; S.player.y = npc.y + oy;
  return { dist: Math.round(Math.hypot(ox, oy)), npc: { x: npc.x, y: npc.y } };
}, { who: id, ox: dx, oy: dy });

/* His torso in CSS px, where a thumb lands (the tap scan raises to y - 26). */
const torsoCss = (P, id) => P.page.evaluate((who) => {
  const S = window._gameState && window._gameState.current;
  const c = document.querySelector('canvas');
  const npc = ((S && S.npcs) || []).find((n) => n && n.id === who);
  if (!S || !c || !npc || !S.camera) return null;
  const r = c.getBoundingClientRect();
  return {
    x: Math.round(r.left + (npc.x - S.camera.x) * (S._worldScaleX || 1)),
    y: Math.round(r.top + (npc.y - S.camera.y) * (S._worldScaleY || 1) - 26),
  };
}, id);

/* The camera slides after the player (it was teleported beside him): wait
   until it stands still, or the place measured is not where he is drawn by
   the time the finger lands (the first run's tap at x 95 found nobody). */
const settle = async (P, ms = 6000) => {
  const end = Date.now() + ms;
  let last = null;
  while (Date.now() < end) {
    const c = await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      return S && S.camera ? { x: S.camera.x, y: S.camera.y } : null;
    });
    if (c && last && Math.hypot(c.x - last.x, c.y - last.y) < 0.5) return true;
    last = c;
    await P.page.waitForTimeout(250);
  }
  return false;
};
/* A thumb on his torso, once the camera has stopped; returns what the tap
   scan decided (window.__btNpcTap). */
const tapOn = async (P, id) => {
  await settle(P);
  const at = await torsoCss(P, id);
  /* who else stands near that point, as the tap scan sees them (a failure
     names them) */
  const around = at ? await P.page.evaluate(({ x, y }) => {
    const S = window._gameState && window._gameState.current;
    const c = document.querySelector('canvas');
    if (!S || !c || !S.camera) return null;
    const r = c.getBoundingClientRect();
    return (S.npcs || []).map((n) => ({
      id: n.id, alive: !!n.alive,
      cx: Math.round(r.left + (n.x - S.camera.x) * (S._worldScaleX || 1)),
      cy: Math.round(r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) - 26),
    })).filter((n) => Math.hypot(n.cx - x, n.cy - y) < 160);
  }, at) : null;
  if (at) await P.page.touchscreen.tap(at.x, at.y);
  await P.page.waitForTimeout(900);
  return { at, around, tap: await P.page.evaluate(() => window.__btNpcTap || null) };
};

const shopOpen = (P) => P.page.evaluate(() => !!(window.__broShopBus && window.__broShopBus.open));
const near = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  return {
    npc: S && S._nearNpc ? S._nearNpc.id : null,
    hall: !!(S && S._nearWheelBuilding && S._nearWheelBuilding.hall),
    door: !!(S && (S.nearBuilding != null || S._nearWheelBuilding)),
  };
});

/* A sample every 150 ms for `ms`: was any townsperson's window ever up? */
const everOpen = async (P, ms) => {
  const end = Date.now() + ms;
  let seen = false;
  while (Date.now() < end) {
    if (await H.npcDialogueOpen(P) || await shopOpen(P)) seen = true;
    await P.page.waitForTimeout(150);
  }
  return seen;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tapper', wsPort, webPort, world: 'wheel',
    viewport: PHONE, touch: true });
  await H.enterWorld(P);
  const stopAlive = [H.keepAlive(P)];
  await P.page.waitForTimeout(1500);
  const open = () => H.npcDialogueOpen(P);
  const close = () => H.closeNpcDialogue(P);

  /* ── start out of reach, with nothing on screen ── */
  const far = await place(P, 'mayor_bro', 420, 0);
  rec.ok('Mayor Bro stands in the world\'s BroTown', !!far, far);
  await close();
  await P.page.waitForTimeout(600);
  rec.ok('standing well away from him, no window is open', !(await open()));

  /* ── 1. standing right beside him, his first quest waiting, opens nothing ── */
  await place(P, 'mayor_bro', 0, 34);
  const opened1 = await everOpen(P, 3000);
  const n1 = await near(P);   /* after the wait: the game's own "who you stand with" */
  rec.ok('1: standing right beside him, his quest waiting, opens NOTHING (3 s)',
    !opened1 && n1.npc === 'mayor_bro', { opened: opened1, near: n1 });

  /* ── 2. walking through him and on past ── */
  let opened2 = false;
  for (let dx = -300; dx <= 300; dx += 30) {
    await place(P, 'mayor_bro', dx, 20);
    await P.page.waitForTimeout(150);
    if (await open()) opened2 = true;
  }
  rec.ok('2: walking through him and on past opens nothing', !opened2);

  /* ── 3. a tap on him, where a thumb lands ── */
  await place(P, 'mayor_bro', 0, 34);
  const t3 = await tapOn(P, 'mayor_bro');
  rec.ok('3: a tap on him opens his window', await open() && !!t3.tap && t3.tap.result === 'quest', t3);

  /* ── 4. closed while standing there, it stays closed ── */
  await close();
  const opened4 = await everOpen(P, 2500);
  rec.ok('4: closed while standing beside him, it stays closed', !opened4);

  /* ── 5. the right stick's tap ── */
  const talked5 = await H.talkToNpc(P, 'mayor_bro');
  await P.page.waitForTimeout(800);
  rec.ok('5: the right stick\'s tap opens his window', talked5 && await open(), { talked5 });
  await close();
  await P.page.waitForTimeout(400);

  /* ── 6. E on a keyboard: his quest before a door, but never over the
        door's own prompt (v2.3.3834) ── */
  /* the door's prompt is up where desktopControls' doorPromptUp says so */
  const promptUp = () => P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    return !!(S && (S.nearBuilding != null || (S._nearWheelBuilding && S._nearWheelBuilding.hall)));
  });
  const SPOTS = [[0, 34], [70, 10], [-70, 10], [60, 50], [-60, 50], [0, 70], [40, -30], [-40, -30], [0, -40]];
  let talkAt = null, doorAt = null;
  for (const [dx, dy] of SPOTS) {
    await place(P, 'mayor_bro', dx, dy);
    await P.page.waitForTimeout(350);
    const n = await near(P), up = await promptUp();
    if (n.npc === 'mayor_bro' && !up && !talkAt) talkAt = [dx, dy];
    if (n.npc === 'mayor_bro' && up && !doorAt) doorAt = [dx, dy];
    if (talkAt && doorAt) break;
  }
  if (talkAt) await place(P, 'mayor_bro', talkAt[0], talkAt[1]);
  await P.page.waitForTimeout(400);
  const n6 = await near(P);
  await P.page.keyboard.press('e');
  await P.page.waitForTimeout(900);
  const t6 = await P.page.evaluate(() => {
    const n = document.querySelector('.bt-npcdlg-name');
    return n ? (n.innerText || '').trim() : null;
  });
  rec.ok(`6: beside him with no door prompt up (${JSON.stringify(talkAt)}), E opens his window (his quest before a door)`,
    !!talkAt && await open() && (t6 === null || /mayor/i.test(t6)), { talkAt, near: n6, dialogue: t6 });
  await close();
  await P.page.waitForTimeout(400);
  if (doorAt) {
    await place(P, 'mayor_bro', doorAt[0], doorAt[1]);
    await P.page.waitForTimeout(500);
    const prompt6 = await P.page.evaluate(() => { const b = document.querySelector('.bt-interact-prompt'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : null; });
    await P.page.keyboard.press('e');
    await P.page.waitForTimeout(1200);
    const b6 = await P.page.evaluate(() => ({ building: !!document.querySelector('[data-building-panel]'), dialogue: !!document.querySelector('.bt-npcdlg-name') }));
    rec.ok(`6: ...and beside him with the door's prompt up ("${prompt6}"), E does what it says: the door opens, not his window`,
      b6.building && !b6.dialogue, { doorAt, prompt6, b6 });
    /* the Town Hall's window shut again, wholly, before Diego's taps */
    await P.page.evaluate(() => { if (window._uiPanels && window._uiPanels.building) window._uiPanels.building(null); });
    await P.page.waitForTimeout(800);
    const shut6 = await P.page.evaluate(() => !document.querySelector('[data-building-panel]'));
    rec.ok('6: ...and the Town Hall shut again (guard)', shut6, shut6);
  } else {
    rec.ok('6: (no spot beside him puts the door\'s prompt up: nothing to choose between)', true, { tried: SPOTS });
  }

  /* ── 7. Diego: beside him no shop; a tap opens it ── */
  const dFar = await place(P, 'shopkeeper_bro', 420, 0);
  await P.page.waitForTimeout(500);
  await place(P, 'shopkeeper_bro', 0, 34);
  const opened7 = await everOpen(P, 2500);
  rec.ok('7: standing beside Diego opens no shop', !!dFar && !opened7, { dFar, opened: opened7 });
  const t7 = await tapOn(P, 'shopkeeper_bro');
  rec.ok('7: ...and a tap on him opens his shop', await shopOpen(P) && !!t7.tap && t7.tap.result === 'shop', t7);
  await P.page.evaluate(() => window.__broShopBus.setOpen(false));
  const opened7b = await everOpen(P, 2000);
  rec.ok('7: ...closed beside him, it stays closed', !opened7b);

  /* ── 8. a READY quest: beside him nothing; a tap opens the turn-in ── */
  await place(P, 'mayor_bro', 420, 0);
  await P.page.waitForTimeout(500);
  const myId = await H.readState(P, (S) => S.myId);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(1500);
  await H.grant(wsPort, myId, 'item', { invKey: 'slime-remnants', count: 4 });
  await P.page.waitForTimeout(2200);
  await close();
  await place(P, 'mayor_bro', 0, 34);
  const opened8 = await everOpen(P, 2500);
  rec.ok('8: with his quest READY, standing beside him still opens nothing', !opened8);
  const talked8 = await H.talkToNpc(P, 'mayor_bro');
  await P.page.waitForTimeout(800);
  const reached = talked8 && await H.claimOnLastLine(P, { press: false });
  const text8 = await P.page.evaluate(() => {
    const c = document.querySelector('.bt-qoffer') || document.querySelector('.bt-npcdlg');
    return c ? (c.innerText || '') : '';
  });
  rec.ok('8: ...and a tap opens the turn-in (his last line\'s Claim reward)',
    !!reached && /Claim reward/i.test(text8), { talked8, reached, text: text8.slice(0, 300) });

  /* ── 10. Diego's quest under way: his line carries his shop ── */
  /* (walking up opened his shop while fish_1 ran, and a tap gave his quest;
     a tap is all there is now, so the line holds the way: game/tour.js) */
  await close();
  const jumped = await H.devOp(wsPort, 'tour', myId, { at: 'fish_1' });
  await P.page.waitForTimeout(1500);
  await place(P, 'shopkeeper_bro', 420, 0);
  await P.page.waitForTimeout(400);
  await place(P, 'shopkeeper_bro', 0, 34);
  const offer10 = await H.talkToNpc(P, 'shopkeeper_bro') ? await H.advanceNpcDialogue(P) : null;
  const took10 = offer10 === 'offer' && await H.confirmQuestOffer(P);
  await P.page.waitForTimeout(1200);
  await close();
  await P.page.waitForTimeout(400);
  const talked10 = await H.talkToNpc(P, 'shopkeeper_bro');
  await P.page.waitForTimeout(800);
  for (let i = 0; i < 6; i++) {
    if (await P.page.evaluate(() => !!document.querySelector('[data-qa="quest-open"]'))) break;
    await P.page.evaluate(() => { const b = document.querySelector('.bt-npcdlg-next'); if (b) b.click(); });
    await P.page.waitForTimeout(250);
  }
  const btn10 = await P.page.evaluate(() => { const b = document.querySelector('[data-qa="quest-open"]'); return b ? b.innerText.trim() : null; });
  rec.ok('10: with Diego\'s quest under way, his line carries "Open the shop"',
    !!jumped && took10 && talked10 && btn10 === 'Open the shop', { jumped, offer10, took10, talked10, btn10 });
  if (btn10) await H.clickSel(P, '[data-qa="quest-open"]').catch(() => {});
  await P.page.waitForTimeout(900);
  rec.ok('10: ...and it opens his shop', await shopOpen(P) && !(await open()));
  await P.page.evaluate(() => window.__broShopBus.setOpen(false));

  /* ── 9. ?npcprox brings the walk-up opener back ── */
  const Q = await H.newPlayer(browser, { name: 'Walker', wsPort, webPort, world: 'wheel',
    viewport: PHONE, touch: true, query: 'npcprox' });
  await H.enterWorld(Q);
  stopAlive.push(H.keepAlive(Q));
  await Q.page.waitForTimeout(1500);
  await place(Q, 'mayor_bro', 420, 0);
  await Q.page.waitForTimeout(600);
  await H.closeNpcDialogue(Q);
  await place(Q, 'mayor_bro', 0, 34);
  await Q.page.waitForTimeout(1500);
  rec.ok('9: with ?npcprox, walking up to him opens his window again', await H.npcDialogueOpen(Q));

  stopAlive.forEach((stop) => stop());
  await Q.ctx.close().catch(() => {});
  await P.ctx.close().catch(() => {});
}
