/* YOUR BRO MOVES (v2.3.3362, docs/specs/emote-moves.md)
 *
 * The fun & social plan's Phase 1 (docs/FUN-SOCIAL-PLAN.md): a wave, a sit,
 * a dance -- the whole drawn bro moved in code (rendering/emoteFx.js), about
 * its feet, its name plate held still.  A moment is the `emote` relay's
 * `{move}`; a held pose is STATE on the worker (poses.js, the tick's `po`),
 * so a phone that comes near later still sees it (TRAPS §176).  Three phones:
 *
 *   1. the picker opens on a Moves tab of twelve tiles;
 *   2. a real finger on Wave sends ONE emote relay and closes the picker;
 *      your bro tilts, his feet and his name plate exactly where they were,
 *      and the other phone draws him waving; then he is upright again;
 *   3. a finger on Sit sends ONE pose; the bro is drawn 70% tall, feet and
 *      plate still; the worker keeps `po`, and the other phone draws him
 *      sitting for as long as he sits;
 *   4. a third phone that joins while he sits sees him sitting;
 *   5. a step stands him up, on his phone, on the worker and on the others;
 *   6. "/dance" in the chat is the dance, and says nothing in the chat; the
 *      other phone pops its notes; "/sleep" lays him down, plate still;
 *   7. against a worker without caps.emotemoves the picker has no Moves tab.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* a real finger (CDP), on the middle of the first element matching `sel`,
   only if nothing covers it there */
async function fingerTap(P, sel) {
  const at = await P.page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { err: 'no ' + sel };
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === el || el.contains(hit))) return { err: sel + ' is covered by ' + (hit ? hit.outerHTML.slice(0, 80) : 'nothing') };
    return { x, y };
  }, sel);
  if (at.err) return at;
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y }] });
  await new Promise((r) => setTimeout(r, 60));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  return at;
}
const fig = (P, id) => P.page.evaluate((id) => (window.__btEmoteFigure ? window.__btEmoteFigure(id) : null), id);
async function waitFig(P, id, pred, timeout = 4000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeout) {
    last = await fig(P, id);
    if (last && pred(last)) return { ok: true, f: last };
    await P.page.waitForTimeout(80);
  }
  return { ok: false, f: last };
}
const peerPo = (P, id) => P.page.evaluate((id) => {
  const o = window._gameState.current.others && window._gameState.current.others[id];
  return o ? (o._po || null) : undefined;
}, id);
async function waitPeerPo(P, id, want, timeout = 6000) {
  const t0 = Date.now();
  let v;
  while (Date.now() - t0 < timeout) {
    v = await peerPo(P, id);
    if (v === want) return true;
    await P.page.waitForTimeout(120);
  }
  return false;
}
/* the HUD's whole transform, and the feet, the same as at rest */
const near = (a, b, eps) => Math.abs(a - b) <= eps;
/* untilted and unsquashed, where it was -- only `hudDrop` lower (a sitter's
   and a sleeper's plate comes down with the top of him) */
function sameHud(a, b, eps = 0.05) {
  if (!a || !b || !a.plate || !b.plate) return false;
  return ['a', 'b', 'c', 'd', 'tx'].every((k) => near(a.plate[k], b.plate[k], eps))
    && near(a.plate.ty - (a.hudDrop || 0), b.plate.ty, eps);
}
/* the same, measured from the feet: another phone's copy of a player can
   settle a pixel or two between two looks (it is drawn from their speed) */
function sameHudFromFeet(a, b, eps = 0.05) {
  if (!a || !b || !a.plate || !b.plate) return false;
  return ['a', 'b', 'c', 'd'].every((k) => near(a.plate[k], b.plate[k], eps))
    && near(a.plate.tx - a.feetX, b.plate.tx - b.feetX, eps) && near(a.plate.ty - (a.hudDrop || 0) - a.feetY, b.plate.ty - b.feetY, eps);
}
const sameFeet = (a, b, eps = 0.05) => !!a && !!b && near(a.feetX, b.feetX, eps) && near(a.feetY, b.feetY, eps);
async function openMoves(P) {
  await P.page.evaluate(() => window.__broLegacyUI.emotesOpen());
  await P.page.waitForSelector('[data-emote-picker]', { timeout: 5000 });
  if (!(await P.page.evaluate(() => !!document.querySelector('[data-emote-moves]')))) {
    await P.page.locator('[data-emote-tab="moves"]').first().click().catch(() => {});
    await P.page.waitForSelector('[data-emote-moves]', { timeout: 3000 }).catch(() => {});
  }
}

/* a picture of the watcher's screen, the coach's first tip put away first
   (it lies over the town's middle; its X takes a real finger) */
async function picture(P, name) {
  if (await P.page.evaluate(() => !!document.querySelector('[data-coach-dismiss]'))) {
    await fingerTap(P, '[data-coach-dismiss]');
    await P.page.waitForTimeout(150);
  }
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/emotemoves-${name}.png` }).catch(() => {});
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* v2.3.3368: out of Halloween week, whatever today is (game/season.js): the
     Zombie Shuffle's tile is mp-halloween's */
  const A = await H.newPlayer(browser, { name: 'Mover', wsPort, webPort, viewport: PHONE, touch: true, query: 'halloween=0' });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(B);
  await H.waitMutualSight(A, B);
  const aId = await H.readState(A, (S) => S.myId);
  /* the watcher steps north, so the mover is not behind him in his pictures */
  const bAt = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y }));
  await H.hopTo(B, bAt.x + 60, bAt.y - 330);
  await A.page.waitForTimeout(1500);
  await H.instrumentWire(A);
  const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.emotemoves));
  rec.ok('the worker says caps.emotemoves', caps);
  const rest = await fig(A, 'self');
  const restB = await fig(B, aId);
  console.log('    at rest: ' + JSON.stringify(rest));
  rec.ok('both phones draw the mover upright, not emoting', !!rest && !rest.emoting && rest.rot === 0 && !!restB && !restB.emoting, { rest, restB });

  /* ── 1. A MOVES TAB OF TWELVE ── */
  await openMoves(A);
  const pick = await A.page.evaluate(() => ({
    tabs: document.querySelectorAll('[data-emote-tab]').length,
    moves: document.querySelectorAll('[data-emote-move]').length,
  }));
  rec.ok('the picker opens on a Moves tab of twelve tiles', pick.tabs === 2 && pick.moves === 12, pick);
  await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/emotemoves-picker.png` });

  /* ── 2. ONE FINGER, ONE WAVE ── */
  const w0 = await H.wireCounts(A);
  /* the other phone is watched from the tap: the wave lasts 1.3 s and this
     box can spend that long on one evaluate */
  const peerWave = waitFig(B, aId, (f) => f.emoting && Math.abs(f.rot) > 0.02, 4000);
  const t2 = await fingerTap(A, '[data-emote-move="wave"]');
  const own = await waitFig(A, 'self', (f) => f.emoting && Math.abs(f.rot) > 0.02, 3000);
  rec.ok('a real finger reaches the Wave tile', !t2.err, t2);
  const w1 = await H.wireCounts(A);
  rec.ok('...and sends exactly ONE emote relay', (w1.emote || 0) - (w0.emote || 0) === 1, { sent: (w1.emote || 0) - (w0.emote || 0) });
  rec.ok('...and the picker closes', !(await A.page.evaluate(() => !!document.querySelector('[data-emote-picker]'))));
  console.log('    waving: ' + JSON.stringify(own.f));
  rec.ok('your bro tilts as he waves', own.ok, own.f);
  rec.ok('...his feet where they were', own.ok && sameFeet(own.f, rest), { rest, now: own.f });
  rec.ok('...and his name plate exactly where it was (not tilted)', own.ok && sameHud(own.f, rest), { rest: rest && rest.plate, now: own.f && own.f.plate });
  const pw = await peerWave;
  rec.ok('the other phone draws him waving', pw.ok, pw.f);
  rec.ok('...his plate still over his feet, untilted', pw.ok && sameHudFromFeet(pw.f, restB), { rest: restB, now: pw.f });
  const after = await waitFig(A, 'self', (f) => !f.emoting && f.rot === 0, 3000);
  rec.ok('...and when it is over he is upright again, as he was', after.ok && sameHud(after.f, rest) && near(after.f.sy, rest.sy, 1e-3), after.f);

  /* ── 3. SIT: HELD, KEPT BY THE WORKER ── */
  await A.page.waitForTimeout(1100);   /* past the one-a-second allowance */
  await openMoves(A);
  const p0 = (await H.wireCounts(A)).pose || 0;
  const t3 = await fingerTap(A, '[data-emote-move="sit"]');
  rec.ok('a real finger reaches the Sit tile', !t3.err, t3);
  await A.page.waitForTimeout(450);    /* the settle-in is 220 ms */
  const p1 = (await H.wireCounts(A)).pose || 0;
  rec.ok('...and sends exactly ONE pose', p1 - p0 === 1, { sent: p1 - p0 });
  const sit = await waitFig(A, 'self', (f) => f.emoting && near(f.sy / rest.sy, 0.7, 0.02), 3000);
  console.log('    sitting: ' + JSON.stringify(sit.f));
  rec.ok('he is drawn sitting, 70% of his height', sit.ok, sit.f);
  rec.ok('...feet where they were, plate untilted and unsquashed', sit.ok && sameFeet(sit.f, rest) && sameHud(sit.f, rest), { rest, now: sit.f });
  rec.ok('...his body lower', sit.ok && sit.f.body && rest.body && sit.f.body.y > rest.body.y + 2, { rest: rest.body, now: sit.f && sit.f.body });
  rec.ok('...and his plate lower by as much as his head (30% of his height)', sit.ok && near(sit.f.hudDrop, 0.3 * rest.h, 1), { drop: sit.f && sit.f.hudDrop, h: rest.h });
  let srvPo;
  for (let i = 0; i < 20 && srvPo !== 'sit'; i++) {
    const live = await H.serverPlayer(wsPort, aId);
    srvPo = live ? live.po : undefined;
    if (srvPo !== 'sit') await new Promise((r) => setTimeout(r, 150));
  }
  rec.ok('the worker keeps the pose on his player (po "sit")', srvPo === 'sit', srvPo);
  rec.ok('the other phone hears he sits (the tick\'s po)', await waitPeerPo(B, aId, 'sit'), await peerPo(B, aId));
  const sitB = await waitFig(B, aId, (f) => f.emoting && near(f.sy / restB.sy, 0.7, 0.03), 4000);
  rec.ok('...and draws him sitting', sitB.ok, sitB.f);
  await B.page.waitForTimeout(2500);
  const still = await fig(B, aId);
  rec.ok('...still sitting 2.5 s later (held, not a moment)', !!still && still.emoting && near(still.sy / restB.sy, 0.7, 0.03), still);
  await picture(B, 'sit-peer');

  /* ── 4. A PHONE THAT COMES LATER SEES HIM SITTING ── */
  const C = await H.newPlayer(browser, { name: 'Latecomer', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(C);
  const lateSaw = await waitPeerPo(C, aId, 'sit', 15000);
  rec.ok('a phone that joins while he sits sees him sitting (state, not an event: TRAPS §176)', lateSaw, await peerPo(C, aId));
  const sitC = await waitFig(C, aId, (f) => f.emoting && f.sy < f.sx, 6000);
  rec.ok('...and draws it', sitC.ok, sitC.f);

  /* ── 5. A STEP STANDS HIM UP, EVERYWHERE ── */
  await H.nudge(A, 'd', 450);
  const up = await H.readState(A, (S) => S._pose || null);
  rec.ok('a step stands him up on his phone', up === null, up);
  rec.ok('...on the other phone', await waitPeerPo(B, aId, null, 6000), await peerPo(B, aId));
  rec.ok('...and on the late one', await waitPeerPo(C, aId, null, 6000), await peerPo(C, aId));
  const upFig = await waitFig(A, 'self', (f) => !f.emoting && f.rot === 0, 3000);
  rec.ok('...drawn upright again', upFig.ok, upFig.f);
  await C.page.close().catch(() => {});

  /* ── 6. "/dance" AND "/sleep" FROM THE CHAT ── */
  await A.page.waitForTimeout(1100);
  /* where he stands now, facing the way he walked (the boots' row is the
     facing's own) */
  const rest2 = await fig(A, 'self');
  const rest2B = await fig(B, aId);
  const log0 = await H.readState(A, (S) => (S.chatLog || []).length);
  await A.page.evaluate(() => window.__btSendChat('/dance'));
  await A.page.waitForTimeout(300);
  const danced = await H.readState(A, (S) => ({ pose: S._pose && S._pose.id, log: (S.chatLog || []).length, said: (S.chatLog || []).some((l) => /\/dance/.test(String(l.text || ''))) }));
  rec.ok('"/dance" is the dance (the Bro Bounce)', danced.pose === 'bounce', danced);
  rec.ok('...and says nothing in the chat', !danced.said && danced.log === log0, danced);
  rec.ok('the other phone hears the dance', await waitPeerPo(B, aId, 'bounce'), await peerPo(B, aId));
  let notes = null;
  for (let i = 0; i < 30 && !notes; i++) {
    notes = await B.page.evaluate((id) => { const p = window.__btEmotePops && window.__btEmotePops.get(id); return p && p.emoji === '🎵' ? Object.assign({}, p) : null; }, aId);
    if (!notes) await B.page.waitForTimeout(120);
  }
  rec.ok('...and pops its music notes over him', !!notes, notes);
  await picture(B, 'dance-peer');
  await A.page.waitForTimeout(1100);
  await A.page.evaluate(() => window.__btSendChat('/sleep'));
  const lying = await waitFig(A, 'self', (f) => f.emoting && Math.abs(Math.abs(f.rot) - Math.PI / 2) < 0.02, 3000);
  console.log('    asleep: ' + JSON.stringify(lying.f));
  rec.ok('"/sleep" lays him down flat', lying.ok, lying.f);
  rec.ok('...feet where they were, name plate not lying down with him', lying.ok && sameFeet(lying.f, rest2) && sameHud(lying.f, rest2), { rest: rest2, now: lying.f });
  rec.ok('...his body beside his feet, on the ground', lying.ok && lying.f.body && Math.abs(lying.f.body.x - rest2.body.x) > 30 && Math.abs(lying.f.body.y - rest2.feetY) < 8, { rest: rest2.body, now: lying.f && lying.f.body });
  rec.ok('...and his plate down to just over him (about 60% of his height lower)', lying.ok && lying.f.hudDrop > 0.5 * rest2.h && lying.f.hudDrop < 0.7 * rest2.h, { drop: lying.f && lying.f.hudDrop, h: rest2.h });
  const lyingB = await waitFig(B, aId, (f) => f.emoting && Math.abs(Math.abs(f.rot) - Math.PI / 2) < 0.05, 5000);
  rec.ok('the other phone draws him asleep', lyingB.ok, lyingB.f);
  rec.ok('...his plate still over his feet, untilted', lyingB.ok && sameHudFromFeet(lyingB.f, rest2B), { rest: rest2B, now: lyingB.f });
  await picture(B, 'sleep-peer');
  await picture(A, 'sleep-own');
  await H.nudge(A, 'a', 450);

  /* ── 7. NO caps.emotemoves: NO MOVES TAB ── */
  await A.page.evaluate(() => { const S = window._gameState.current; S._serverCaps = Object.assign({}, S._serverCaps, { emotemoves: false }); });
  await A.page.evaluate(() => window.__broLegacyUI.emotesOpen());
  await A.page.waitForSelector('[data-emote-picker]', { timeout: 5000 });
  const off = await A.page.evaluate(() => ({
    tabs: document.querySelectorAll('[data-emote-tab]').length,
    moves: document.querySelectorAll('[data-emote-move]').length,
    emoji: document.querySelectorAll('[data-emote-picker] [data-emote]').length,
  }));
  rec.ok('against a worker without caps.emotemoves the picker is the emoji and lines only', off.tabs === 0 && off.moves === 0 && off.emoji === 42, off);
  const refused = await A.page.evaluate(() => window.__broLegacyUI.moveSend('cheer'));
  rec.ok('...and a move is not sent', refused === false, refused);
}
