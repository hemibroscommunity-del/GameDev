/* ═══ v2.3.6781: THE CHARACTER HUD, TOP LEFT, IN THE WORLD (card UI3, PR 2) ═══
 *
 * The owner, 2026-11-26: "Portrait: Always visible and tappable. Name and
 * combat level: Immediately adjacent to the portrait. XP bar: Persistent
 * gold progression bar. Quest: Smaller, single-line tracker underneath."
 * "I would display the XP progress of whichever weapon is closest to
 * increasing the overall combat level. Label the XP bar with that weapon."
 * "Tapping the portrait should immediately open the character dashboard."
 *
 * Real players against a real worker, IN THE WORLD (`world: 'wheel'`): a
 * phone (390 x 844, then 375 x 667 and 667 x 375) and a computer playing wide
 * (1280 x 720), in one party:
 *   1. the HUD says your name, "Lv N" and which weapon's XP it shows, each
 *      equal to the rule (src/game/charHud.js) on the worker's own blob;
 *   2. weapon XP earned on that weapon at Frost Ridge's snowmen (as mp-xpbar
 *      earns it) moves the HUD's bar, while the top bar's slot stays
 *      `data-xp-shown="0"`; a kill's flight lands on the HUD's number;
 *   3. a tap on the HUD opens Bro (`[data-dash-title="hero"]`); on the
 *      computer a click on it opens Bro and does not swing (`__btDeskPress`
 *      not an attack, no autoAttack);
 *   4. (v2.3.6790, card UI3 PR 10: the owner, 2026-11-27, "Leave only
 *      character hud in top left corner") with a quest in hand NO quest line
 *      is drawn in the world (no [data-quest-hud], no data-questline mark, the
 *      quest's title nowhere in the top left); `?questline=1` (flipped on the
 *      page's address) brings the line back, ONE line (30 px at most with the
 *      longest quest title in it) whose tap opens that quest's page, the
 *      status column under it; remembered; `?questline=0` forgets;
 *   5. at 375 x 667, 390 x 844, 667 x 375 and 1280 x 720, in a party with an
 *      element chip up: the HUD, the line, the status row, the party chip,
 *      the minimap, the stick and the controller never cross (sideways the
 *      party chip stands beside the HUD); the HUD's top
 *      within 16 px of the top bar; the WELCOME plate's Skip over it;
 *      (v2.3.6790) the status column right under the HUD's gap and the party
 *      chip under its two rows (no empty band where the line was), sideways
 *      the chip beside the HUD; at 375 x 667 and 667 x 375 the pictures before
 *      (`?questline=1`, the corner as UI3-hud left it) and after;
 *   6. `?hud=0`, and after a reload without it (remembered): today's top left
 *      (no HUD, --bt-hud-top the bar's line, the top bar's XP back); `?hud=1`
 *      forgets;
 *   7. no page errors.
 * Pictures (deviceScaleFactor 2): docs/shots/ui3-hud-*.png, ui3-corner-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const SHOTS = join(H.REPO, 'docs/shots');

/* the rule, in node, on the worker's blob the page holds */
async function rule(blob, one, name) {
  const P3 = await import(H.REPO + '/src/data/prog3.js');
  const ONE = await import(H.REPO + '/src/data/oneFormula.js');
  const CH = await import(H.REPO + '/src/game/charHud.js');
  P3.setProg3Enabled(true);
  ONE.setOneLevelEnabled(!!one);
  return CH.charHudModel(blob, { name });
}

const look = (P) => P.page.evaluate(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 ? { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height } : null; };
  const S = window._gameState && window._gameState.current;
  const hud = document.querySelector('[data-charhud-box]');
  const line = document.querySelector('[data-quest-hud]');
  const drawn = line && line.hasAttribute('data-quest-hud-oneline') ? line.firstElementChild : line;
  const chips = document.querySelector('[data-elem-chips]');
  let col = chips;
  while (col && col.parentElement && getComputedStyle(col).position !== 'absolute') col = col.parentElement;
  const top = document.querySelector('.bt-zone-header [data-xp-bar]');
  const flyTo = document.querySelector('[data-xp-bar][data-xp-shown="1"] [data-xp-num]');
  const mini = window.__btWheelMini;
  const housings = Array.from(document.querySelectorAll('[data-padhousing]')).map(r).filter(Boolean);
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:var(--bt-hud-top);left:0;width:1px;height:1px;pointer-events:none';
  document.body.appendChild(probe);
  const hudTop = Math.round(probe.getBoundingClientRect().top);
  probe.style.top = 'var(--bt-hud-base)';
  const hudBase = Math.round(probe.getBoundingClientRect().top);
  probe.style.top = 'var(--bt-status-top, -999px)';
  const statusTop = Math.round(probe.getBoundingClientRect().top);
  probe.remove();
  /* v2.3.6790: any quest words drawn in the top left (a line hidden by a
     changed mark, or drawn with no mark): the quest in hand's title */
  const title = 'Into the Wild';
  const words = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length || !(el.textContent || '').includes(title)) continue;
    const b = el.getBoundingClientRect();
    if (b.width > 0 && b.height > 0 && b.top < innerHeight / 2 && b.left < innerWidth / 2) words.push({ tag: el.tagName, t: Math.round(b.top), l: Math.round(b.left) });
  }
  return {
    model: window.__btCharHud ? window.__btCharHud() : null,
    blob: S && S.rpg && S.rpg.prog3 ? JSON.parse(JSON.stringify(S.rpg.prog3)) : null,
    one: !!(S && S._serverCaps && S._serverCaps.onelevel),
    myName: S && S.myName,
    hud: r(hud), mark: document.documentElement.getAttribute('data-charhud'),
    name: hud ? (hud.querySelector('[data-charhud-name]') || {}).textContent : null,
    lv: hud ? (hud.querySelector('[data-charhud-lv]') || {}).textContent || null : null,
    word: hud ? (hud.querySelector('[data-charhud-word]') || {}).textContent || null : null,
    cat: hud ? hud.getAttribute('data-charhud-cat') : null,
    hudBar: hud && hud.querySelector('[data-xp-bar]') ? { cat: hud.querySelector('[data-xp-bar]').getAttribute('data-xp-bar'), shown: hud.querySelector('[data-xp-bar]').getAttribute('data-xp-shown'),
      white: Number((hud.querySelector('.bt-xp-bar__track') || { getAttribute: () => null }).getAttribute('data-xp-white')),
      num: (hud.querySelector('[data-xp-num]') || {}).textContent || null } : null,
    topBar: top ? { cat: top.getAttribute('data-xp-bar'), shown: top.getAttribute('data-xp-shown') } : null,
    flyToHud: !!(flyTo && flyTo.closest('[data-charhud-box]')),
    line: r(drawn), lineHit: r(line), oneline: !!(line && line.hasAttribute('data-quest-hud-oneline')),
    lineText: line ? (line.textContent || '').replace(/\s+/g, ' ').trim() : null,
    col: chips ? r(col) : null, chips: r(chips),
    party: r(document.querySelector('[data-party-chip]')),
    mini: mini ? { l: mini.left, t: mini.top, r: mini.left + mini.w, b: mini.top + mini.h, w: mini.w, h: mini.h } : null,
    stick: r(document.querySelector('[data-disc="L"]')),
    housings,
    header: r(document.querySelector('.bt-zone-header')),
    hudTop, hudBase, statusTop, qmark: document.documentElement.getAttribute('data-questline'), words,
    title: (document.querySelector('[data-dash-title]') || { getAttribute: () => null }).getAttribute('data-dash-title'),
    vw: innerWidth, vh: innerHeight,
  };
});
const cross = (a, b) => !!a && !!b && a.l < b.r - 0.5 && a.r > b.l + 0.5 && a.t < b.b - 0.5 && a.b > b.t + 0.5;

async function tapCentre(P, sel, { mouse = false } = {}) {
  const c = await P.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + Math.min(b.height / 2, 15) }; }, sel);
  if (!c) return false;
  if (mouse) await P.page.mouse.click(c.x, c.y, { delay: 60 });
  else await P.page.touchscreen.tap(c.x, c.y);
  return true;
}
async function titleIs(P, want, ms = 6000) {
  let t = null;
  for (let i = 0; i < ms / 200; i++) {
    t = await P.page.evaluate(() => (document.querySelector('[data-dash-title]') || { getAttribute: () => null }).getAttribute('data-dash-title'));
    if (want(t)) return t;
    await P.page.waitForTimeout(200);
  }
  return t;
}

/* Frost Ridge's snowmen and a real hit (mp-xpbar's way) */
const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, p = S.player;
  return (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0) && m.home === 'frost')
    .map((m) => ({ x: m.x, y: m.y, d: Math.hypot(m.x - p.x, m.y - p.y) })).sort((a, b) => a.d - b.d);
});
const tapR = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-joyzone="R"]');
  if (!el) return false;
  const b = el.getBoundingClientRect(), x = b.left + b.width * 0.5, y = b.top + b.height * 0.4;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: 61, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: 61, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart'));
  el.dispatchEvent(mk('touchend'));
  return true;
});

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(SHOTS, { recursive: true });
  const errors = [];
  const watch = (P, id) => P.page.on('pageerror', (e) => errors.push(id + ': ' + String(e && e.message || e).slice(0, 200)));

  /* ── the phone, upright ── */
  const A = await H.newPlayer(browser, { name: 'Hudbro', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2, world: 'wheel' });
  watch(A, 'phone');
  await H.enterWorld(A);
  await A.page.waitForTimeout(1200);
  /* 5. (the WELCOME plate) its Skip is over the HUD wherever they meet */
  const skip = await A.page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /Skip tutorial/.test(x.textContent || ''));
    if (!b) return null;
    const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const at = document.elementFromPoint(x, y);
    return { top: !!at && (at === b || b.contains(at)), y: Math.round(r.top) };
  });
  rec.ok(`5. the WELCOME plate's Skip is on top where it is drawn (${skip ? 'at y ' + skip.y : 'not shown on this start'})`, !skip || skip.top, skip);
  await H.pastWelcome(A);
  const me = await H.readState(A, (S) => S.myId);
  /* a quest in hand, taken as a player takes it (quest_accept; out of the
     givers' order, which test mode allows: mp-trackquest's way) -- the
     owner's own example, "Into the Wild" */
  const takeQuest = async (P, id) => {
    await H.devOp(wsPort, 'testmode', id, { on: true }).catch(() => null);
    await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'mayor_2' } }); });
    return H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).mayor_2 || null, (v) => v === 'active', { timeout: 15000, label: 'Into the Wild' }).catch(() => null);
  };
  rec.ok('setup: "Into the Wild" in hand (guard)', (await takeQuest(A, me)) === 'active', null);
  /* v2.3.6790: the later phones take their first quest as a player does,
     from Mayor Bro (H.approachNpc: a tap; mp-coachdesk's way) */
  const giverQuest = async (P) => {
    await H.approachNpc(P, 'mayor_bro').catch(() => null);
    await H.acceptQuestFromGiver(P).catch(() => null);
    await H.leaveNpc(P, 'mayor_bro').catch(() => {});
    return !!(await H.waitFor(P, (S) => Object.values((S.rpg && S.rpg._quests) || {}).some((v) => v === 'active'), (v) => v, { timeout: 15000, label: 'a quest in hand' }).catch(() => null));
  };

  /* ── 1. who you are, by the rule ── */
  let a = null;
  for (let i = 0; i < 40; i++) { a = await look(A); if (a.model && a.model.ready && a.hud) break; await A.page.waitForTimeout(250); }
  const want = a && a.blob ? await rule({ prog3: a.blob }, a.one, a.myName || '') : null;
  rec.ok(`1. the HUD says "${a && a.name}" and "${a && a.lv}", and shows the ${a && a.word}'s XP: the rule on the worker's blob says ${want && want.name} / Lv ${want && want.level} / ${want && want.word}`,
    !!a && !!want && a.name === a.myName && a.lv === 'Lv ' + want.level && a.cat === want.cat && a.word === want.word && !!a.hudBar && a.hudBar.cat === want.cat, { a: a && { name: a.name, lv: a.lv, cat: a.cat, word: a.word, bar: a.hudBar }, want });
  rec.ok(`1. the HUD is ${a && a.hud && Math.round(a.hud.w)} x ${a && a.hud && Math.round(a.hud.h)} upright (184 x 52)`, !!a && !!a.hud && Math.round(a.hud.w) === 184 && Math.round(a.hud.h) === 52, a && a.hud);
  await A.page.screenshot({ path: join(SHOTS, 'ui3-hud-upright.png') }).catch(() => {});

  /* ── 3. a tap on the HUD opens Bro ── */
  await tapCentre(A, '[data-charhud-box]');
  const t3 = await titleIs(A, (t) => t === 'hero');
  rec.ok(`3. a tap on the HUD opens Bro (the band's page "${t3}")`, t3 === 'hero', t3);
  await A.page.screenshot({ path: join(SHOTS, 'ui3-hud-upright-bro.png') }).catch(() => {});
  await H.closeDest(A).catch(() => {});
  await A.page.waitForTimeout(600);

  /* ── 4. the quest line: gone from the world (v2.3.6790), back with ?questline=1 ── */
  let q0 = null;
  for (let i = 0; i < 10; i++) { q0 = await look(A); if (q0.hud) break; await A.page.waitForTimeout(300); }
  rec.ok(`4. with "Into the Wild" in hand no quest line is drawn in the world (no [data-quest-hud]: ${!!(q0 && q0.lineHit)}; mark "${q0 && q0.qmark}"; its words in the top left ${JSON.stringify(q0 && q0.words)})`,
    !!q0 && !!q0.hud && !q0.lineHit && !q0.qmark && q0.words.length === 0, q0 && { line: q0.lineHit, mark: q0.qmark, words: q0.words });
  rec.ok(`4. ...the status column's place right under the HUD (${q0 && q0.statusTop} = the HUD's ${q0 && q0.hud && Math.round(q0.hud.b)} + its 4 px gap)`,
    !!q0 && !!q0.hud && Math.abs(q0.statusTop - (q0.hud.b + 4)) <= 1, q0 && { status: q0.statusTop, hud: q0.hud });

  /* ── 2. weapon XP moves in the HUD, the top bar quiet ── */
  await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
  await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => {});
  await A.page.waitForTimeout(1500);
  await H.equipWeapon(A, 'greatsword', 'weapon', 'melee').catch(() => null);
  await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const fz = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
  await H.hopTo(A, fz[0] + 150, fz[1] + 220, { tries: 260 });
  await A.page.waitForTimeout(1500);
  const b0 = await look(A);
  let b1 = null;
  for (let tries = 0; tries < 18 && !b1; tries++) {
    const m = (await near(A))[0];
    if (!m) break;
    if (m.d > 70) await H.hopTo(A, m.x, m.y + 50, { tries: 20 });
    await A.page.waitForTimeout(300);
    await tapR(A);
    for (let i = 0; i < 40; i++) {
      await A.page.waitForTimeout(60);
      const b = await look(A);
      if (b.hudBar && b0.hudBar && b.hudBar.white !== b0.hudBar.white) { b1 = b; break; }
    }
  }
  rec.ok(`2. a real hit on a snowman moves the HUD's ${b1 && b1.word} bar (white ${b0.hudBar && b0.hudBar.white} -> ${b1 && b1.hudBar && b1.hudBar.white}), its weapon the rule's`,
    !!b1 && b1.cat === 'sword' && b1.hudBar.white > b0.hudBar.white, { b0: b0.hudBar, b1: b1 && b1.hudBar });
  rec.ok(`2. ...the top bar's XP slot stays quiet (data-xp-shown "${b1 && b1.topBar && b1.topBar.shown}"), and a kill's flight lands on the HUD's number`,
    !!b1 && (!b1.topBar || b1.topBar.shown === '0') && b1.flyToHud, b1 && { top: b1.topBar, fly: b1.flyToHud });
  /* the count runs on the gold's clock (XpTrack): polled until it settles (TRAPS §200) */
  const req = (await import(H.REPO + '/src/data/prog3.js')).prog3XpRequired;
  const numOf = (b) => (b && b.blob ? `${Math.floor(b.blob.sk.sword.xp)} / ${req(b.blob.sk.sword.level)}` : null);
  let b2 = b1, wantNum = numOf(b1);
  for (let i = 0; b1 && i < 60; i++) { await A.page.waitForTimeout(200); b2 = await look(A); wantNum = numOf(b2); if (b2.hudBar && b2.hudBar.num === wantNum) break; }
  rec.ok(`2. ...and it counts to the worker's numbers ("${b2 && b2.hudBar && b2.hudBar.num}" = ${wantNum})`, !!b2 && !!b2.hudBar && b2.hudBar.num === wantNum, { num: b2 && b2.hudBar && b2.hudBar.num, wantNum });

  /* ── the computer, and the party ── */
  const D = await H.newPlayer(browser, { name: 'Hudesk', wsPort, webPort, viewport: { width: 1280, height: 720 }, dpr: 2, world: 'wheel', wide: true });
  watch(D, 'computer');
  await H.enterWorld(D);
  await H.pastWelcome(D);
  const dId = await H.readState(D, (S) => S.myId);
  rec.ok('setup: the computer\'s "Into the Wild" in hand too (guard)', (await takeQuest(D, dId)) === 'active', null);
  for (let round = 0; round < 3; round++) {
    const inParty = await H.readState(A, (S) => (S._party && S._party.members ? S._party.members.map((m) => m.id) : []));
    if (inParty.includes(dId)) break;
    await A.page.evaluate((t) => window._gameState.current.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: t } }), dId);
    await H.waitFor(D, (S) => (S.dmgNumbers || []).some((d) => /invites you to a party/.test(d.text || '')), (v) => v, { timeout: 8000, label: 'the invite' }).catch(() => null);
    await D.page.evaluate((t) => window._gameState.current.channel.send({ type: 'broadcast', event: 'party_accept', payload: { target: t } }), me);
    await A.page.waitForTimeout(1500);
  }
  const formed = await H.waitFor(A, (S) => (S._party && S._party.members ? S._party.members.length : 0), (n) => n === 2, { timeout: 15000, label: 'a party of two' }).catch(() => null);
  rec.ok(`5. a party of two, a phone and a computer (guard): ${formed}`, formed === 2, formed);

  /* ── 4b. ?questline=1 brings the line back (v2.3.6790): a phone that joins
     with it, in the party too (the "before" pictures in 5) ── */
  const L = await H.newPlayer(browser, { name: 'Hudline', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2, world: 'wheel', query: 'questline=1' });
  watch(L, 'questline=1');
  await H.enterWorld(L);
  await H.pastWelcome(L);
  const lId = await H.readState(L, (S) => S.myId);
  rec.ok('setup: the line phone\'s first quest in hand, from Mayor Bro (guard)', await giverQuest(L), null);
  let q = null;
  for (let i = 0; i < 30; i++) { q = await look(L); if (q.line) break; await L.page.waitForTimeout(300); }
  const longest = await L.page.evaluate(async () => {
    const line = document.querySelector('[data-quest-hud-oneline] [data-quest-hud-line], [data-quest-hud-oneline] span');
    if (!line) return null;
    const was = line.textContent;
    line.textContent = 'The Longest Quest Title In The Whole Wide World Of BroTown · 10/10 · Go back and talk to the Mayor of BroTown right now';
    await new Promise((r) => requestAnimationFrame(() => r()));
    const h = Math.round(line.closest('[data-quest-hud-oneline]').firstElementChild.getBoundingClientRect().height);
    line.textContent = was;
    return h;
  });
  rec.ok(`4. ?questline=1: the quest line under the HUD, one line (${q && q.line && Math.round(q.line.h)} px; ${longest} px with the longest title): "${q && q.lineText}"`,
    !!q && !!q.hud && q.oneline && !!q.line && q.line.h <= 30.5 && longest != null && longest <= 30, { line: q && q.line, longest });
  rec.ok(`4. ...the mark up ("${q && q.qmark}") and the status column under the line's 44 px (${q && q.statusTop} = ${q && q.hudTop} + 44)`,
    !!q && q.qmark === '1' && q.statusTop === q.hudTop + 44, q && { mark: q.qmark, status: q.statusTop, hudTop: q.hudTop });
  const hasQuest = await L.page.evaluate(() => !!document.querySelector('[data-quest-hud-oneline][data-quest-hud-quest]'));
  if (hasQuest) {
    await tapCentre(L, '[data-quest-hud-oneline]');
    const t4 = await titleIs(L, (t) => !!t && /quest/i.test(t));
    rec.ok(`4. its tap opens that quest's page ("${t4}")`, !!t4 && /quest/i.test(t4), t4);
    await H.closeDest(L).catch(() => {});
    await L.page.waitForTimeout(600);
  } else rec.ok('4. its tap opens that quest\'s page (a quest in hand, guard)', false, null);
  /* remembered: a reload without it keeps the line; ?questline=0 forgets */
  const lBare = L.page.url().replace(/([?&])questline=1(&|$)/, (m0, a1, a2) => (a2 ? a1 : '')).replace(/[?&]$/, '');
  const lineAfter = async (addr) => {
    await L.page.goto(addr);
    await H.enterWorld(L);
    let v = null;
    for (let i = 0; i < 20; i++) { v = await look(L); if (v.hud && (v.lineHit || i >= 10)) break; await L.page.waitForTimeout(300); }
    return v;
  };
  const qk = await lineAfter(lBare);
  rec.ok(`4. ...remembered: a reload without it still draws the line (${!!qk.lineHit})`, !!qk.lineHit && qk.qmark === '1', { line: qk.lineHit, mark: qk.qmark });
  const qf = await lineAfter(lBare + (lBare.indexOf('?') >= 0 ? '&' : '?') + 'questline=0');
  const qg = await lineAfter(lBare);
  rec.ok(`4. ?questline=0 forgets: the line gone, and still gone after a reload without it (${!!qf.lineHit}, ${!!qg.lineHit}; mark "${qg.qmark}")`,
    !!qf.hud && !qf.lineHit && !qg.lineHit && !qg.qmark, { a: qf.lineHit, b: qg.lineHit, mark: qg.qmark });
  /* and back on, for the pictures before */
  await lineAfter(lBare + (lBare.indexOf('?') >= 0 ? '&' : '?') + 'questline=1');
  for (let round = 0; round < 3; round++) {
    const inParty = await H.readState(A, (S) => (S._party && S._party.members ? S._party.members.map((m) => m.id) : []));
    if (inParty.includes(lId)) break;
    await A.page.evaluate((t) => window._gameState.current.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: t } }), lId);
    await H.waitFor(L, (S) => (S.dmgNumbers || []).some((d) => /invites you to a party/.test(d.text || '')), (v) => v, { timeout: 8000, label: 'the invite' }).catch(() => null);
    await L.page.evaluate((t) => window._gameState.current.channel.send({ type: 'broadcast', event: 'party_accept', payload: { target: t } }), me);
    await A.page.waitForTimeout(1500);
  }

  /* 3. on the computer a click on the HUD opens Bro and does not swing */
  await D.page.evaluate(() => { window.__btProbe = true; window.__btDeskPress = null; const S = window._gameState.current; S.autoAttack = false; });
  await tapCentre(D, '[data-charhud-box]', { mouse: true });
  const t3d = await titleIs(D, (t) => t === 'hero');
  const press = await D.page.evaluate(() => ({ press: window.__btDeskPress, auto: !!window._gameState.current.autoAttack }));
  rec.ok(`3. on the computer a click on the HUD opens Bro ("${t3d}") and does not swing (press ${JSON.stringify(press.press)}, autoAttack ${press.auto})`,
    t3d === 'hero' && (!press.press || !/attack|bash/.test(press.press.kind || '')) && !press.auto, press);
  await H.closeDest(D).catch(() => {});
  await D.page.waitForTimeout(600);

  /* ── 5. the stack, at four sizes, a party chip and an element chip up ── */
  const chill = (P) => P.page.evaluate(() => { const S = window._gameState.current; S._chillUntil = Date.now() + 120000; });
  const SIZES = [
    { P: A, id: '390x844', vp: { width: 390, height: 844 } },
    { P: A, id: '375x667', vp: { width: 375, height: 667 }, corner: 'upright' },
    { P: A, id: '667x375', vp: { width: 667, height: 375 }, side: true, shot: 'ui3-hud-sideways.png', corner: 'sideways' },
    { P: D, id: '1280x720', vp: null, shot: 'ui3-hud-computer.png' },
  ];
  /* the phone sat idle while the computer played: back from away, so the pictures show the world */
  const back = (P) => P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /I.m back/.test(x.textContent || '')); if (b) b.click(); }).catch(() => {});
  for (const Z of SIZES) {
    if (Z.vp) await Z.P.page.setViewportSize(Z.vp);
    await back(Z.P);
    await chill(Z.P);
    await Z.P.page.waitForTimeout(1800);
    let s = null;
    for (let i = 0; i < 20; i++) { s = await look(Z.P); if (s.hud && s.chips && s.party) break; await chill(Z.P); await Z.P.page.waitForTimeout(300); }
    /* the stack at the top left (the line as drawn) against each other and
       everything else; the controller's own parts sit inside each other by
       design, so they are not paired among themselves */
    const boxes = { hud: s.hud, line: s.line, status: s.chips, party: s.party, minimap: s.mini, stick: s.stick };
    s.housings.forEach((h, i) => { boxes['controller' + i] = h; });
    const names = Object.keys(boxes).filter((k) => boxes[k]);
    const STACK = new Set(['hud', 'line', 'status', 'party']);
    const hits = [];
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      if (!STACK.has(names[i]) && !STACK.has(names[j])) continue;
      if (cross(boxes[names[i]], boxes[names[j]])) hits.push(names[i] + '/' + names[j]);
    }
    rec.ok(`5. [${Z.id}] the HUD, the status row, the party chip, the minimap, the stick and the controller never cross, and no quest line (${names.join(', ')})`,
      !!s.hud && !s.lineHit && !!s.chips && !!s.party && hits.length === 0, { hits, boxes });
    /* v2.3.6790: the things that show only at times take the line's place:
       the status column 4 px under the HUD, the party chip under its two rows
       (upright) or beside the HUD (sideways): never the line's band empty */
    const colGap = s.col && s.hud ? Math.round(s.col.t - s.hud.b) : null;
    rec.ok(`5. [${Z.id}] the status column right under the HUD (${colGap} px; the line's band was 44 upright, 34 sideways)`,
      colGap != null && colGap >= 2 && colGap <= 6, { col: s.col, hud: s.hud });
    if (Z.side) {
      rec.ok(`5. [${Z.id}] the party chip beside the HUD, under the bar (its left ${s.party && Math.round(s.party.l)}, the HUD's right ${s.hud && Math.round(s.hud.r)}; top ${s.party && Math.round(s.party.t)} = ${s.hud && Math.round(s.hud.t)})`,
        !!s.party && !!s.hud && s.party.l >= s.hud.r && Math.abs(s.party.t - s.hud.t) <= 2, { party: s.party, hud: s.hud });
    } else {
      rec.ok(`5. [${Z.id}] the party chip under the status column's two rows (${s.party && s.col && Math.round(s.party.t - s.col.t)} px under its top, 48), the same left edge`,
        !!s.party && !!s.col && Math.abs(s.party.t - s.col.t - 48) <= 1 && Math.abs(s.party.l - s.hud.l) <= 1, { party: s.party, col: s.col });
    }
    if (Z.corner) {
      /* the owner's pictures: after (the HUD alone, the status chip and the
         party chip up), and before (the line phone, ?questline=1: the corner
         as UI3-hud left it, its status chip up; its party chip when the
         invite took, which is not asked) */
      await Z.P.page.screenshot({ path: join(SHOTS, `ui3-corner-after-${Z.corner}.png`) }).catch(() => {});
      await L.page.setViewportSize(Z.vp);
      await back(L);
      await chill(L);
      await L.page.waitForTimeout(1800);
      let b = null;
      for (let i = 0; i < 20; i++) { b = await look(L); if (b.line && b.chips) break; await chill(L); await L.page.waitForTimeout(300); }
      const bb = { hud: b.hud, line: b.line, status: b.chips, party: b.party, minimap: b.mini, stick: b.stick };
      const bn = Object.keys(bb).filter((k) => bb[k]);
      const bh = [];
      for (let i = 0; i < bn.length; i++) for (let j = i + 1; j < bn.length; j++) if (cross(bb[bn[i]], bb[bn[j]])) bh.push(bn[i] + '/' + bn[j]);
      rec.ok(`5. [${Z.id}] ?questline=1: the line, and the status row under it as before, nothing crossing (${bn.join(', ')})`,
        !!b.line && !!b.chips && bh.length === 0 && !!b.col && b.col.t >= b.line.b, { hits: bh, bb });
      await L.page.screenshot({ path: join(SHOTS, `ui3-corner-before-${Z.corner}.png`) }).catch(() => {});
    }
    if (Z.shot) await Z.P.page.screenshot({ path: join(SHOTS, Z.shot) }).catch(() => {});
  }
  await A.page.setViewportSize({ width: 390, height: 844 });

  /* the cap: the Sword at the last level (a picture, and the word) */
  await H.devOp(wsPort, 'combat', dId, { skill: 'sword', level: 100 }).catch(() => {});
  let c = null;
  for (let i = 0; i < 30; i++) { c = await look(D); if (c.model && c.model.max) break; await D.page.waitForTimeout(300); }
  rec.ok(`1. at the cap the bar is full and says "${c && c.word}" (Lv ${c && c.model && c.model.level})`, !!c && !!c.model && c.model.max && c.word === 'Max' && c.lv === 'Lv 100', c && c.model);
  await D.page.screenshot({ path: join(SHOTS, 'ui3-hud-cap.png') }).catch(() => {});

  /* ── 6. ?hud=0, remembered; ?hud=1 forgets ── */
  const O = await H.newPlayer(browser, { name: 'Hudoff', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2, world: 'wheel', query: 'hud=0' });
  watch(O, 'hud=0');
  await H.enterWorld(O);
  await H.pastWelcome(O);
  /* v2.3.6790: a quest in hand, so main's full card has its quest to show */
  const oId = await H.readState(O, (S) => S.myId);
  void oId;
  const oq = (await giverQuest(O)) ? 'active' : null;
  for (let i = 0; i < 20; i++) { if (await O.page.evaluate(() => !!document.querySelector('[data-quest-hud]'))) break; await O.page.waitForTimeout(300); }
  await O.page.waitForTimeout(600);
  /* the top bar's slot, given a gain to show (staged: mp-xpbar plays a real one under ?hud=0) */
  const stage = (P) => P.page.evaluate(() => {
    const S = window._gameState.current;
    S._xpBar = { cat: 'sword', level: 1, xp: 5, need: 280, frac: 5 / 280, gain: 5, gainAt: Date.now(), seq: 99, at: Date.now(), up: false, fromLevel: 1, fromFrac: 0, fromXp: 0, fromNeed: 280 };
    window.__btXpHold = true;
  });
  await stage(O);
  await O.page.waitForTimeout(1200);
  const o = await look(O);
  await O.page.screenshot({ path: join(SHOTS, 'ui3-hud-off.png') }).catch(() => {});
  rec.ok('setup: ?hud=0\'s first quest in hand, from Mayor Bro (guard)', oq === 'active', oq);
  rec.ok(`6. ?hud=0: no HUD, no mark, the quest card as before (${o.oneline ? 'one line' : 'the full card'}), --bt-hud-top the bar's line (${o.hudTop} = ${o.hudBase}), the top bar's XP back ("${o.topBar && o.topBar.shown}")`,
    !o.hud && !o.mark && !!o.lineHit && !o.oneline && o.hudTop === o.hudBase && !!o.topBar && o.topBar.shown === '1', { hud: o.hud, mark: o.mark, card: o.lineHit, one: o.oneline, top: o.topBar, hudTop: o.hudTop, base: o.hudBase });
  const bare = O.page.url().replace(/([?&])hud=0(&|$)/, (m0, a1, a2) => (a2 ? a1 : '')).replace(/[?&]$/, '');
  await O.page.goto(bare);
  await H.enterWorld(O);
  await O.page.waitForTimeout(1500);
  const o2 = await look(O);
  rec.ok(`6. after a reload without it: still no HUD (remembered)`, !o2.hud && !o2.mark, { hud: o2.hud });
  await O.page.goto(bare + (bare.indexOf('?') >= 0 ? '&' : '?') + 'hud=1');
  await H.enterWorld(O);
  await O.page.waitForTimeout(1500);
  await O.page.goto(bare);
  await H.enterWorld(O);
  let o3 = null;
  for (let i = 0; i < 20; i++) { o3 = await look(O); if (o3.hud) break; await O.page.waitForTimeout(300); }
  await stage(O);
  await O.page.waitForTimeout(1200);
  o3 = await look(O);
  rec.ok(`6. ?hud=1 forgets: the HUD back after a reload without it, the top bar's slot quiet again ("${o3.topBar && o3.topBar.shown}")`,
    !!o3.hud && o3.mark === '1' && (!o3.topBar || o3.topBar.shown === '0'), { hud: o3.hud, top: o3.topBar });

  /* ── 7. ── */
  rec.ok(`7. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
}
