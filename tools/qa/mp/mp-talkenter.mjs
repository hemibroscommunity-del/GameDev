/* ═══ TALKING AND ENTERING ARE ALWAYS TWO DIFFERENT THINGS (v2.3.4085) ═══
 *
 * The owner, 2026-11-03: "Make talking to a npc player and entering a
 * building always two different things."  TALK is a tap (a phone) or a click
 * (a computer) ON the townsperson; ENTER is the door's own control -- its
 * Enter button, E, the right stick's tap -- whoever stands beside the door
 * (desktopControls.js: v2.3.3583-v2.3.3868's orders, which flipped one
 * control between the two by who stood where, are retired).
 *
 * In the world's BroTown, at a door with a townsperson beside it -- both in
 * reach at once, found at runtime (__btWheelTownDoors, never a coordinate:
 * the General Store and Diego first, any open door and anyone near it else,
 * never a keeper at his own door, whose talk opens that same building) --
 * and beside Mayor Bro on the Town Hall's steps (its door opens nothing since
 * v2.3.3899):
 *   1. a computer (wide): the door's Enter button is up (never "Talk to");
 *      E ENTERS the building, opening no dialogue, shop or flip; a click on
 *      the townsperson TALKS (the game's tap scan answers for him) and opens
 *      no building; beside the Mayor, E opens nothing and says how to talk
 *      ("Click Mayor Bro to talk"), and a click on him opens his dialogue;
 *   2. a phone (touch, upright 390 x 844): at the same spot the right stick
 *      wears the DOOR and its tap enters; a tap on the townsperson talks;
 *      beside the Mayor the stick's tap opens nothing, a tap on him talks;
 *   3. on the phone the right stick's picture, read every 100 ms the whole
 *      way, is never the speech bubble ('talk');
 *   4. no page errors.
 * Pictures: tools/qa/mp/out/talkenter-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const WIDE = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `talkenter-${name}.png`) }); } catch (e) { /* a picture only */ } };

async function into(browser, wsPort, webPort, name, opts) {
  const P = await H.newPlayer(browser, Object.assign({ name, wsPort, webPort, world: 'wheel' }, opts));
  P.errors = [];
  P.page.on('pageerror', (e) => P.errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
    { timeout: 150000, label: name + ' into the world' }).catch(() => null);
  await H.closeNpcDialogue(P).catch(() => {});
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  return P;
}

/* what is on screen: the door's button, a building's window, a townsperson's
   dialogue, Diego's shop, Ace's flip, and who the game says you stand with */
const here = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const b = document.querySelector('.bt-interact-prompt');
  const card = document.querySelector('[data-building-panel]');
  return {
    npc: S._nearNpc ? S._nearNpc.id : null,
    door: window.__btWheelTownDoors ? window.__btWheelTownDoors.at() : null,
    prompt: b ? b.innerText.replace(/\s+/g, ' ').trim() : null,
    talkPrompt: !!document.querySelector('[data-talk-prompt]'),
    building: card ? card.getAttribute('data-building-panel') || 'a window' : null,
    dialogue: !!document.querySelector('.bt-npcdlg, .bt-qoffer'),
    shop: !!(window.__broShopBus && window.__broShopBus.open),
    flip: !!(window.__btAceFlipBus && window.__btAceFlipBus.open),
    ricon: (document.querySelector('.bt-rjoy-base') || { getAttribute: () => null }).getAttribute('data-ricon'),
  };
});
const settled = async (P, want, ms = 5000) => {
  let h = await here(P);
  for (const t0 = Date.now(); Date.now() - t0 < ms && !want(h);) { await P.page.waitForTimeout(250); h = await here(P); }
  return h;
};
const put = (P, x, y) => P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; }, { x, y });
/* every window a talk or a door could have opened, put away */
const closeAll = async (P) => {
  await P.page.evaluate(() => {
    try { if (window.__broShopBus) window.__broShopBus.setOpen(false); } catch (e) { /* closed anyway */ }
    try { if (window.__btAceFlipBus) window.__btAceFlipBus.setOpen(false); } catch (e) { /* closed anyway */ }
    if (window.__btBuildingWindow) window.__btBuildingWindow.open(null);
  });
  await H.closeNpcDialogue(P).catch(() => {});
  await P.page.waitForTimeout(600);
};
/* a real finger's tap on the right stick's zone (mp-tapact's) */
const tapStick = (P, id) => P.page.evaluate((tid) => {
  const z = document.querySelector('[data-joyzone="R"]');
  if (!z) return null;
  const b = z.getBoundingClientRect();
  const x = b.left + b.width * 0.7, y = b.top + b.height * 0.3;
  const el = document.elementFromPoint(x, y) || z;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: tid, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: tid, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart')); el.dispatchEvent(mk('touchend'));
  return el.tagName;
}, id);
const lastTap = (P, t0) => P.page.evaluate((t) => { const r = window.__btNpcTap; return r && r.ts >= t - 50 ? { npc: r.npc, result: r.result } : null; }, t0);

/* A spot in a door's reach AND a townsperson's talk range at once: each open
   door, the people near it (the General Store and Diego first), offsets round
   him tried until the game says both. */
async function findPair(P) {
  return P.page.evaluate(async () => {
    const S = window._gameState.current;
    const doors = window.__btWheelTownDoors.doors().filter((d) => d.index >= 0 || d.hall);
    doors.sort((a, b) => (b.id === 'store') - (a.id === 'store'));
    const offs = [[0, 34], [-34, 20], [34, 20], [0, 60], [-50, 40], [50, 40], [-60, 0], [60, 0], [0, -30], [-30, -30], [30, -30]];
    for (const d of doors) {
      const folk = (S.npcs || []).filter((n) => n && n.alive !== false && n.keeperOf !== d.id && Math.hypot(n.x - d.x, n.y - 52 - d.y) < 230);
      folk.sort((a, b) => (b.id === 'shopkeeper_bro') - (a.id === 'shopkeeper_bro'));
      for (const n of folk) {
        for (const [ox, oy] of offs) {
          S.player.x = n.x + ox; S.player.y = n.y + oy;
          await new Promise((r) => setTimeout(r, 300));
          if (window.__btWheelTownDoors.at() === d.id && S._nearNpc && S._nearNpc.id === n.id) {
            return { door: d.id, npc: n.id, name: n.name, x: Math.round(S.player.x), y: Math.round(S.player.y), ox, oy };
          }
        }
      }
    }
    return null;
  });
}
/* the same spot again (the townsfolk walk their days, game/townsfolkWalk.js):
   back to it, or to his offset if he has moved, until both are in reach */
async function backToPair(P, pair) {
  for (let k = 0; k < 6; k++) {
    if (k === 0) await put(P, pair.x, pair.y);
    else await P.page.evaluate(({ id, ox, oy }) => { const S = window._gameState.current, n = (S.npcs || []).find((q) => q.id === id); if (n) { S.player.x = n.x + ox; S.player.y = n.y + oy; } }, { id: pair.npc, ox: pair.ox, oy: pair.oy });
    const h = await settled(P, (x) => x.door === pair.door && x.npc === pair.npc, 2000);
    if (h.door === pair.door && h.npc === pair.npc) return h;
  }
  return here(P);
}
/* beside Mayor Bro, out of every door's reach (the noticeboard's too) */
async function besideMayor(P) {
  for (const [dx, dy] of [[0, 34], [-30, 30], [30, 30], [0, 60], [-40, 0], [40, 0]]) {
    await P.page.evaluate(({ ox, oy }) => { const S = window._gameState.current, n = (S.npcs || []).find((q) => q.id === 'mayor_bro'); if (n) { S.player.x = n.x + ox; S.player.y = n.y + oy; } }, { ox: dx, oy: dy });
    const h = await settled(P, (x) => x.npc === 'mayor_bro' && !x.door, 1500);
    if (h.npc === 'mayor_bro' && !h.door) return h;
  }
  return null;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await into(browser, wsPort, webPort, 'Talkdesk', { viewport: WIDE, wide: true });
  const C = await into(browser, wsPort, webPort, 'Talkphone', { viewport: PHONE, touch: true });
  try {
    /* the phone's stick picture, read every 100 ms from here on */
    await C.page.evaluate(() => {
      window.__tkRicons = Object.create(null);
      setInterval(() => {
        const S = window._gameState && window._gameState.current;
        if (S) S._isDesktop = false;   /* a phone, not a keyboard (mp-tapact's habit) */
        const d = document.querySelector('.bt-rjoy-base'), v = d ? d.getAttribute('data-ricon') : null;
        window.__tkRicons[v] = (window.__tkRicons[v] || 0) + 1;
      }, 100);
    });

    /* ── 1. a computer ── */
    const pair = await findPair(A);
    rec.ok(`a door with a townsperson beside it, both in reach at one spot: ${pair ? pair.door + ' and ' + pair.name : 'NONE'} (guard)`, !!pair, pair);
    if (pair) {
      const h0 = await settled(A, (x) => x.door === pair.door && x.npc === pair.npc && !!x.prompt && /enter/i.test(x.prompt));
      await shot(A, '1-door-with-folk');
      rec.ok(`1. computer, at the ${pair.door}'s door beside ${pair.name}: the button is the door's ("${h0.prompt}"), never "Talk to"`,
        h0.npc === pair.npc && h0.door === pair.door && !!h0.prompt && /enter/i.test(h0.prompt) && !/talk/i.test(h0.prompt) && !h0.talkPrompt, h0);
      await A.page.keyboard.press('e');
      const h1 = await settled(A, (x) => !!x.building || x.dialogue || x.shop || x.flip, 4000);
      await shot(A, '1-e-enters');
      rec.ok(`1. ...E ENTERS: the building's window (${h1.building}) and no dialogue, shop or flip`,
        !!h1.building && !h1.dialogue && !h1.shop && !h1.flip, h1);
      await A.page.keyboard.press('Escape');
      await closeAll(A);
      await backToPair(A, pair);
      const t0 = await A.page.evaluate(() => Date.now());
      const talked = await H.talkToNpc(A, pair.npc, { touch: false });
      const h2 = await settled(A, (x) => x.dialogue || x.shop || x.flip, 2000);
      const tap = await lastTap(A, t0);
      await shot(A, '1-click-talks');
      rec.ok(`1. ...a click on ${pair.name} TALKS (the scan: ${tap ? tap.result : 'nothing'}) and opens no building (${h2.building})`,
        talked && !!tap && tap.npc === pair.name && tap.result !== 'opens' && !h2.building, { talked, tap, h2 });
      await closeAll(A);
    }
    const m0 = await besideMayor(A);
    const hints0 = await H.readState(A, (S) => S._eTalkHints || 0);
    await A.page.keyboard.press('e');
    const m1 = await settled(A, (x) => x.dialogue || !!x.building, 1800);
    const hints1 = await H.readState(A, (S) => S._eTalkHints || 0);
    await shot(A, '1-e-beside-mayor');
    rec.ok(`1. computer, beside Mayor Bro: E opens NOTHING (no dialogue, no window) and says how to talk to him (${hints0} -> ${hints1})`,
      !!m0 && !m1.dialogue && !m1.building && hints1 === hints0 + 1, { m0, m1, hints0, hints1 });
    const mTalk = await H.talkToNpc(A, 'mayor_bro', { touch: false });
    const m2 = await settled(A, (x) => x.dialogue, 3000);
    await shot(A, '1-click-mayor');
    rec.ok('1. ...a click on him opens his dialogue', mTalk && m2.dialogue && !m2.building, { mTalk, m2 });
    await closeAll(A);

    /* ── 2. a phone ── */
    if (pair) {
      const p0 = await backToPair(C, pair);
      const p0b = await settled(C, (x) => x.ricon === 'door', 5000);
      await shot(C, '2-door-with-folk');
      rec.ok(`2. phone, at the ${pair.door}'s door beside ${pair.name}: the right stick wears the DOOR (${p0b.ricon})`,
        p0.npc === pair.npc && p0.door === pair.door && p0b.ricon === 'door', { p0, p0b });
      await tapStick(C, 71);
      const p1 = await settled(C, (x) => !!x.building || x.dialogue || x.shop || x.flip, 4000);
      await shot(C, '2-stick-enters');
      rec.ok(`2. ...the stick's tap ENTERS: the building's window (${p1.building}) and no dialogue, shop or flip`,
        !!p1.building && !p1.dialogue && !p1.shop && !p1.flip, p1);
      await closeAll(C);
      await backToPair(C, pair);
      const t0 = await C.page.evaluate(() => Date.now());
      const talked = await H.talkToNpc(C, pair.npc, { touch: true });
      const p2 = await settled(C, (x) => x.dialogue || x.shop || x.flip, 2000);
      const tap = await lastTap(C, t0);
      rec.ok(`2. ...a tap on ${pair.name} TALKS (the scan: ${tap ? tap.result : 'nothing'}) and opens no building`,
        talked && !!tap && tap.npc === pair.name && tap.result !== 'opens' && !p2.building, { talked, tap, p2 });
      await closeAll(C);
    }
    const c0 = await besideMayor(C);
    await C.page.waitForTimeout(600);
    await tapStick(C, 72);
    const c1 = await settled(C, (x) => x.dialogue || !!x.building, 2000);
    rec.ok(`2. phone, beside Mayor Bro: the stick wears ${c0 && c0.ricon}, and its tap opens NOTHING`,
      !!c0 && c0.ricon !== 'talk' && !c1.dialogue && !c1.building, { c0, c1 });
    const cTalk = await H.talkToNpc(C, 'mayor_bro', { touch: true });
    const c2 = await settled(C, (x) => x.dialogue, 3000);
    await shot(C, '2-tap-mayor');
    rec.ok('2. ...a tap on him opens his dialogue', cTalk && c2.dialogue, { cTalk, c2 });
    await closeAll(C);

    /* ── 3. the stick never wore the bubble ── */
    const ricons = await C.page.evaluate(() => Object.assign({}, window.__tkRicons));
    rec.ok(`3. the right stick's picture, read every 100 ms throughout (${Object.keys(ricons).join(', ')}), was never the speech bubble`,
      Object.keys(ricons).length > 0 && !ricons.talk && (ricons.door || 0) > 0, ricons);

    const errs = [].concat(A.errors, C.errors);
    rec.ok('4. no page errors', errs.length === 0, errs.slice(0, 3));
  } finally {
    for (const P of [A, C]) await P.ctx.close().catch(() => {});
  }
}
