/* ═══ E DOES WHAT THE PROMPT SAYS; THE BOARD'S BUTTON; A CLICK ON A PLAYER (v2.3.3834) ═══
 *
 * From the judge pass of 2026-10-29 (a judge's first twenty minutes, on a
 * computer), the three items the orchestrator gave lane A:
 *   1. at the Town Hall's door with Mayor Bro beside it, his quest under way,
 *      the prompt reads "E  ENTER TOWN HALL" -- and E talked to him.  Now E
 *      does what the prompt says (desktopControls.js doorPromptUp): the Town
 *      Hall opens; a step away from the door, the prompt gone, E talks to him
 *      (his quest before a door, v2.3.3583, everywhere else);
 *   2. the skateboard's button (Z on a computer) is drawn on the safe ground,
 *      where the board rides, and nowhere past it: in the Earth Forest no
 *      button -- on a computer (wide) and on an upright phone;
 *   3. re-check of #1259 (v2.3.3763) and the judge pass's "a click on another
 *      player locked a slime": you in No man's land, the other bro beside you
 *      -- at the river, on the commons' safe ground, where the judge pass's
 *      second bro stood too -- a slime about; a real click on his body finds
 *      him (his card there; "Attack?" where you may fight him) and takes no
 *      monster as the click's pick.  The lock the pass saw was the game's own
 *      (`src: 'auto'`, the swing's nearest), not the click's;
 *   4. no page errors.
 * Pictures: tools/qa/mp/out/mayordoor-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const WIDE = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `mayordoor-${name}.png`) }); } catch (e) { /* a picture only */ } };

async function into(browser, wsPort, webPort, name, opts) {
  const P = await H.newPlayer(browser, Object.assign({ name, wsPort, webPort, world: 'wheel' }, opts));
  P.errors = [];
  P.page.on('pageerror', (e) => P.errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
    { timeout: 150000, label: name + ' into the world' }).catch(() => null);
  await H.closeNpcDialogue(P).catch(() => {});
  await P.page.addStyleTag({ content: '*:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  return P;
}
/* put the bro at an offset from a townsperson (mp-questprox's place) */
const place = (P, id, dx, dy) => P.page.evaluate(({ who, ox, oy }) => {
  const S = window._gameState && window._gameState.current;
  const npc = ((S && S.npcs) || []).find((n) => n && n.id === who);
  if (!S || !npc || !S.player) return null;
  S.player.x = npc.x + ox; S.player.y = npc.y + oy;
  return true;
}, { who: id, ox: dx, oy: dy });
const here = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  const b = document.querySelector('.bt-interact-prompt');
  return {
    npc: S && S._nearNpc ? S._nearNpc.id : null,
    up: !!(S && (S.nearBuilding != null || (S._nearWheelBuilding && S._nearWheelBuilding.hall))),
    prompt: b ? b.innerText.replace(/\s+/g, ' ').trim() : null,
    building: !!document.querySelector('[data-building-panel]'),
    dialogue: !!document.querySelector('.bt-npcdlg-name'),
  };
});
const rideBtn = (P) => P.page.evaluate(() => (window.__btRideBtn ? window.__btRideBtn() : null));

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await into(browser, wsPort, webPort, 'Doorbro', { viewport: WIDE, wide: true });
  const C = await into(browser, wsPort, webPort, 'Doorphone', { viewport: PHONE, touch: true });
  try {
    /* ── 1. E at the Town Hall's door, the Mayor's quest under way ── */
    await A.page.evaluate(() => { const S = window._gameState.current; if (S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    await H.waitFor(A, (S) => (S.rpg && S.rpg._quests && S.rpg._quests.tut_1) || null, (v) => v === 'active', { timeout: 10000, label: 'tut_1 taken' }).catch(() => null);
    await A.page.waitForTimeout(800);
    const SPOTS = [[0, 34], [-40, -30], [40, -30], [0, -40], [-60, 10], [60, 10], [70, 40], [-70, 40], [0, 70]];
    let doorAt = null, talkAt = null;
    for (const [dx, dy] of SPOTS) {
      await place(A, 'mayor_bro', dx, dy);
      await A.page.waitForTimeout(400);
      const h = await here(A);
      if (h.npc === 'mayor_bro' && h.up && !doorAt) doorAt = [dx, dy];
      if (h.npc === 'mayor_bro' && !h.up && !talkAt) talkAt = [dx, dy];
      if (doorAt && talkAt) break;
    }
    rec.ok(`1. beside the Mayor, a spot with the Town Hall's prompt up (${JSON.stringify(doorAt)}) and one without (${JSON.stringify(talkAt)}) (guard)`, !!doorAt && !!talkAt, { doorAt, talkAt });
    if (doorAt) {
      await place(A, 'mayor_bro', doorAt[0], doorAt[1]);
      await A.page.waitForTimeout(600);
      const h0 = await here(A);
      await shot(A, '1-door-prompt');
      await A.page.keyboard.press('e');
      await A.page.waitForTimeout(1500);
      const h1 = await here(A);
      await shot(A, '1-door-opened');
      rec.ok(`1. the prompt reads "${h0.prompt}", the Mayor beside it with his quest: E does what it says, the Town Hall opens, not his window`,
        !!h0.prompt && /town hall/i.test(h0.prompt) && h1.building && !h1.dialogue, { h0, h1 });
      await A.page.keyboard.press('Escape');
      await A.page.waitForTimeout(800);
    }
    if (talkAt) {
      await place(A, 'mayor_bro', talkAt[0], talkAt[1]);
      await A.page.waitForTimeout(600);
      const h2 = await here(A);
      await A.page.keyboard.press('e');
      await A.page.waitForTimeout(1300);
      const h3 = await here(A);
      await shot(A, '1-talk');
      rec.ok('1. a step from the door, no prompt up: E talks to him (his quest before a door, as since v2.3.3583)', !h2.prompt && h3.dialogue && !h3.building, { h2, h3 });
      await H.closeNpcDialogue(A).catch(() => {});
      await A.page.waitForTimeout(500);
    }

    /* ── 2. the board's button: on the safe ground, and not past it ── */
    const town = { A: await rideBtn(A), C: await rideBtn(C) };
    rec.ok(`2. in BroTown the board's button is drawn (computer ${!!(town.A && town.A.shown)}, phone ${!!(town.C && town.C.shown)})`,
      !!(town.A && town.A.shown) && !!(town.C && town.C.shown), town);
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const pt = WHEEL_SPAWNS.verdant.points[0];
    for (const P of [A, C]) {
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
    }
    await H.hopTo(A, pt[0] + 200, pt[1] + 150, { tries: 260 });
    await H.hopTo(C, pt[0] + 260, pt[1] + 150, { tries: 260 });
    await A.page.waitForTimeout(2000);
    const forest = { A: await rideBtn(A), C: await rideBtn(C) };
    const btnEl = async (P) => P.page.evaluate(() => { const b = document.querySelector('.bt-ride-btn'); return b ? { shown: getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().width > 0 } : null; });
    const elA = await btnEl(A), elC = await btnEl(C);
    await shot(A, '2-forest-computer');
    await shot(C, '2-forest-phone');
    rec.ok('2. in the Earth Forest no board button, on the computer nor on the phone',
      !(forest.A && forest.A.shown) && !(forest.C && forest.C.shown) && !(elA && elA.shown) && !(elC && elC.shown), { forest, elA, elC });

    /* ── 3. #1259's re-check: a click on a bro beside you in No man's land ── */
    const B = await into(browser, wsPort, webPort, 'Clickee', { viewport: { width: 900, height: 700 }, wide: true });
    try {
      const bId = await H.readState(B, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', bId, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
      const a = await A.page.evaluate(() => { const p = window._gameState.current.player; return [p.x, p.y]; });
      await H.hopTo(B, a[0] + 90, a[1] + 10, { tries: 260 });
      /* the other bro's walk stops at the river short of you: go to them */
      const b = await B.page.evaluate(() => { const p = window._gameState.current.player; return [p.x, p.y]; });
      await H.hopTo(A, b[0] - 90, b[1] + 10, { tries: 260 });
      /* a step each, so each is heard where they are */
      for (let i = 0; i < 2; i++) {
        await B.page.keyboard.down('a'); await B.page.waitForTimeout(200); await B.page.keyboard.up('a');
        await A.page.keyboard.down('d'); await A.page.waitForTimeout(200); await A.page.keyboard.up('d');
      }
      await A.page.waitForTimeout(3000);
      const at = await A.page.evaluate((bid) => {
        const S = window._gameState.current, o = (S.others || {})[bid], p = S.player;
        if (!o) return null;
        const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
        const ms = (S.monsters || []).filter((m) => m && m.alive !== false).map((m) => Math.round(Math.hypot(m.x - o.x, m.y - o.y))).sort((x, y) => x - y);
        return { x: cv.left + (o.x - S.camera.x) * S._worldScaleX, y: cv.top + (o.y - 30 - S.camera.y) * S._worldScaleY, d: Math.round(Math.hypot(o.x - p.x, o.y - p.y)), monster: ms[0] == null ? null : ms[0], pill: !!document.querySelector('[data-nml-badge]') };
      }, bId);
      /* where the other bro stands decides what a click on him should do:
         may you fight him there (No man's land's rule, from your side:
         nmlAsk's `about`) -- the "Attack?" window; else his card */
      const can = await A.page.evaluate((bid) => !!(window.__btNmlAsk && window.__btNmlAsk.about(bid) && window.__btNmlAsk.about(bid).can), bId);
      rec.ok(`3. two bros ${at && at.d} px apart, you in No man's land (pill ${at && at.pill}); the other ${can ? 'one you may fight' : 'on safe ground'} (guard)`, !!at && at.pill && at.d < 250, { at, can });
      await A.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; window.__btProbe = true; window.__btDeskPress = null; });
      /* on his BODY, 30 game px over his feet, where a player clicks */
      if (at) await A.page.mouse.click(at.x, at.y, { delay: 60 });
      await A.page.waitForTimeout(1500);
      const r3 = await A.page.evaluate(() => {
        const S = window._gameState.current, lt = S.lockedTarget, ask = document.querySelector('[data-nml-ask]');
        return { ask: ask ? (ask.querySelector('[data-nml-ask-name]') || ask).innerText.replace(/\s+/g, ' ').trim() : null,
          card: !!document.querySelector('.bt-inspect-card'),
          lock: lt ? { type: lt.type, id: String(lt.id), src: lt.src || null } : null, press: window.__btDeskPress ? window.__btDeskPress.kind : null };
      });
      await shot(A, '3-click-player');
      rec.ok(`3. a real click on the other bro's BODY finds him: ${can ? `"${r3.ask}" (Attack?)` : `his card (${r3.card})`}, no monster taken as the click's pick (${JSON.stringify(r3.lock)})`,
        (can ? !!r3.ask && /clickee/i.test(r3.ask) : r3.card) && !(r3.lock && r3.lock.type === 'monster' && r3.lock.src === 'tap'), { can, r3 });
      B.errors.length && rec.ok('3. ...no page errors on the other bro\'s page', false, B.errors.slice(0, 3));
    } finally {
      await B.ctx.close().catch(() => {});
    }
    const errs = [].concat(A.errors, C.errors);
    rec.ok('4. no page errors', errs.length === 0, errs.slice(0, 3));
  } finally {
    for (const P of [A, C]) await P.ctx.close().catch(() => {});
  }
}
