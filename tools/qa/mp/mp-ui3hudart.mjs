/* ═══ v2.3.6787: THE CHARACTER HUD IN THE OWNER'S PICTURES, IN THE WORLD (card UI3, PR 8) ═══
 *
 * The owner, 2026-11-26: "Use these art assets for a new compact hud in top
 * left and weapon xp bar".  "The tiny pill on the right of weapon xp bar
 * should have weapon level. Inside character badge goes combat lvl".
 * "Weapon in hand".
 *
 * Real players against a real worker, IN THE WORLD (`world: 'wheel'`): a
 * phone (390 x 844, then 375 x 667 and 667 x 375) and a computer playing wide
 * (1280 x 720), in one party:
 *   1. the group's drawn box at the top left, 184 x 52 upright and on the
 *      computer, 169 x 48 sideways (92 %): never over the top bar's name, the
 *      minimap, the status row or the party chip, and no quest line (out of
 *      the world since tag 6790, card UI3 PR 10: mp-charhud's step 5 the same);
 *   2. the badge's number is the combat level of the worker's blob (UI3-hud's
 *      rule, dash/gearStats.js charLevel), the pill's the weapon in hand's
 *      level, on a blob where the two differ;
 *   3. the fill follows the weapon's XP: 0 nothing drawn; a part (the dev
 *      kit's XP, then a real hit) drawn within 2 px of its share of the inner
 *      width; at the cap full and the pill 100;
 *   4. a swap of weapons: the ring's icon, the pill and the fill follow;
 *   5. weapon XP earned on the weapon in hand at Frost Ridge's snowmen (as
 *      mp-xpbar earns it) moves the fill, and a kill's flight lands on the bar;
 *   6. a tap on the face opens Bro; a tap on the bar the weapon's page (Back:
 *      Combat); on a computer neither click swings;
 *   7. every picture loaded before play (no request for /ui/hud/ after the
 *      loading screen);
 *   8. `?hudart=0` (and after a reload without it: remembered): UI3-hud's drawn
 *      panel, "Lv N" and 184 x 52; `?hudart=1` forgets;
 *   9. no page errors.
 * Pictures (deviceScaleFactor 2): docs/shots/ui3-hudart-*.png (the corner of
 * each state; tools/art/hud-shots.py puts each beside the owner's sheet).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const SHOTS = join(H.REPO, 'docs/shots');
const RAW = join(SHOTS, 'ui3-hudart-raw');

async function rules() {
  const P3 = await import(H.REPO + '/src/data/prog3.js');
  const ONE = await import(H.REPO + '/src/data/oneFormula.js');
  const CH = await import(H.REPO + '/src/game/charHud.js');
  const HA = await import(H.REPO + '/src/game/hudArt.js');
  P3.setProg3Enabled(true);
  return { P3, ONE, CH, HA };
}

const look = (P) => P.page.evaluate(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 ? { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height } : null; };
  const S = window._gameState && window._gameState.current;
  const g = document.querySelector('[data-hudart]');
  const q = (s) => (g ? g.querySelector(s) : null);
  const line = document.querySelector('[data-quest-hud]');
  const drawn = line && line.hasAttribute('data-quest-hud-oneline') ? line.firstElementChild : line;
  const chips = document.querySelector('[data-elem-chips]');
  let col = chips;
  while (col && col.parentElement && getComputedStyle(col).position !== 'absolute') col = col.parentElement;
  const flyTo = document.querySelector('[data-xp-bar][data-xp-shown="1"] [data-xp-num]');
  const mini = window.__btWheelMini;
  const fill = q('[data-hudart-fill]');
  const k = g ? Number(getComputedStyle(g).getPropertyValue('--ha-k')) || 1 : 1;
  const clip = g ? parseFloat(g.style.getPropertyValue('--hudart-clip')) || 0 : 0;
  return {
    art: window.__btHudArt ? window.__btHudArt() : null,
    blob: S && S.rpg && S.rpg.prog3 ? JSON.parse(JSON.stringify(S.rpg.prog3)) : null,
    rpgLevel: S && S.rpg ? S.rpg.level : null, slot: S && S.rpg ? S.rpg.activeSlot : null,
    one: !!(S && S._serverCaps && S._serverCaps.onelevel),
    myName: S && S.myName,
    group: r(g), k,
    panel: !!document.querySelector('.bt-charhud[data-charhud-box]'),
    panelLv: (document.querySelector('.bt-charhud [data-charhud-lv]') || {}).textContent || null,
    panelBox: r(document.querySelector('.bt-charhud[data-charhud-box]')),
    name: (q('[data-charhud-name]') || {}).textContent || null,
    badge: q('[data-charhud-lv]') ? q('[data-charhud-lv]').textContent : null,
    pill: q('[data-hudart-pill]') ? q('[data-hudart-pill]').textContent : null,
    icon: q('[data-hudart-icon]') ? q('[data-hudart-icon]').getAttribute('data-hudart-icon') : null,
    iconSrc: q('[data-hudart-icon]') ? q('[data-hudart-icon]').getAttribute('src') : null,
    fill: r(fill), clip,
    num: (q('[data-xp-num]') || {}).textContent || null,
    face: r(q('[data-hudart-face]')), bar: r(q('[data-hudart-bar]')),
    flyToHud: !!(flyTo && flyTo.closest('[data-hudart]')),
    title: r(document.querySelector('[data-zone-title]')),
    line: r(drawn),
    col: chips ? r(col) : null,
    party: r(document.querySelector('[data-party-chip]')),
    mini: mini ? { l: mini.left, t: mini.top, r: mini.left + mini.w, b: mini.top + mini.h, w: mini.w, h: mini.h } : null,
    header: r(document.querySelector('.bt-zone-header')),
    dash: (document.querySelector('[data-dash-title]') || { getAttribute: () => null }).getAttribute('data-dash-title'),
  };
});
const cross = (a, b) => !!a && !!b && a.l < b.r - 0.5 && a.r > b.l + 0.5 && a.t < b.b - 0.5 && a.b > b.t + 0.5;

async function tapCentre(P, sel, { mouse = false } = {}) {
  const c = await P.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  if (!c) return false;
  if (mouse) await P.page.mouse.click(c.x, c.y, { delay: 60 });
  else await P.page.touchscreen.tap(c.x, c.y);
  return true;
}
async function dashIs(P, want, ms = 6000) {
  let t = null;
  for (let i = 0; i < ms / 200; i++) {
    t = await P.page.evaluate(() => (document.querySelector('[data-dash-title]') || { getAttribute: () => null }).getAttribute('data-dash-title'));
    if (want(t)) return t;
    await P.page.waitForTimeout(200);
  }
  return t;
}
async function until(P, pred, ms = 9000) {
  let s = null;
  for (let i = 0; i < ms / 250; i++) { s = await look(P); if (pred(s)) return s; await P.page.waitForTimeout(250); }
  return s;
}
/* the fill drawn: its visible width (its box less its clip) against its share of the inner width */
const fillOk = (s) => {
  if (!s || !s.art || !s.art.ready) return false;
  const want = s.art.frac * s.art.innerW * s.k;
  if (s.art.frac <= 0) return !s.fill;
  if (!s.fill) return false;
  return Math.abs((s.fill.w - s.clip * s.k) - want) <= 2;
};
const corner = async (P, name, side) => {
  const clip = side ? { x: 0, y: 0, width: 300, height: 130 } : { x: 0, y: 0, width: 300, height: 150 };
  await P.page.screenshot({ path: join(RAW, name + '.png'), clip }).catch(() => {});
};

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
  mkdirSync(RAW, { recursive: true });
  const R = await rules();
  const errors = [];
  const watch = (P, id) => P.page.on('pageerror', (e) => errors.push(id + ': ' + String(e && e.message || e).slice(0, 200)));
  /* 7. every request for the HUD's pictures, and when */
  const hudReqs = [];
  const listen = (P, id) => P.page.on('request', (q) => { if (q.url().indexOf('/ui/hud/') >= 0) hudReqs.push({ id, at: Date.now(), url: q.url() }); });

  /* ── the phone, upright ── */
  const A = await H.newPlayer(browser, { name: 'Artbro', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2, world: 'wheel', query: 'bighud=0' });   /* tag 6847: the pictures at their own size (the bigger HUD: mp-bighud) */
  watch(A, 'phone');
  listen(A, 'phone');
  await H.enterWorld(A);
  const playAt = Date.now();
  await H.pastWelcome(A);
  const me = await H.readState(A, (S) => S.myId);
  await H.devOp(wsPort, 'testmode', me, { on: true }).catch(() => null);
  /* a quest in hand, so the one-line tracker stands under the group
     (mp-charhud's way: "Into the Wild", out of the givers' order in test mode) */
  const takeQuest = async (P, id) => {
    await H.devOp(wsPort, 'testmode', id, { on: true }).catch(() => null);
    await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'mayor_2' } }); });
    return H.waitFor(P, (S) => ((S.rpg && S.rpg._quests) || {}).mayor_2 || null, (v) => v === 'active', { timeout: 15000, label: 'Into the Wild' }).catch(() => null);
  };
  rec.ok('setup: "Into the Wild" in hand (guard)', (await takeQuest(A, me)) === 'active', null);
  await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

  /* ── 2 and 3 at the start: a new character, the sword in hand at 0 XP ── */
  let s = await until(A, (x) => x.art && x.art.ready && x.group);
  const wantOf = (x) => {
    R.ONE.setOneLevelEnabled(!!x.one);
    const blob = { prog3: x.blob, activeSlot: x.slot, level: x.rpgLevel };
    const hud = R.CH.charHudModel(blob, { name: x.myName || '' });
    const cat = R.HA.hudArtWeapon(blob);
    return { level: hud.level, own: Math.floor(Number(x.rpgLevel) || 0), cat, wl: R.P3.prog3SkillLevel(blob, cat) };
  };
  let w = s && s.blob ? wantOf(s) : null;
  rec.ok(`2. a new character: the badge "${s && s.badge}" (the combat level ${w && w.level}), the pill "${s && s.pill}" (the ${w && w.cat}'s ${w && w.wl}), the ${s && s.icon} in the ring`,
    !!w && s.badge === String(w.level) && s.pill === String(w.wl) && s.icon === w.cat && w.cat === 'sword', { s: s && { badge: s.badge, pill: s.pill, icon: s.icon }, w });
  rec.ok(`3. at 0 XP nothing of the fill is drawn (frac ${s && s.art && s.art.frac})`, !!s && !!s.art && s.art.frac === 0 && !s.fill, s && { fill: s.fill, frac: s.art && s.art.frac });
  rec.ok(`1. the group is ${s && s.group && Math.round(s.group.w)} x ${s && s.group && Math.round(s.group.h)} upright (184 x 52), the face's hit ${s && s.face && Math.round(s.face.h)} and the bar's ${s && s.bar && Math.round(s.bar.h)} tall (44 at least)`,
    !!s && !!s.group && Math.round(s.group.w) === 184 && Math.round(s.group.h) === 52 && s.face.h >= 44 && s.bar.h >= 44, s && { group: s.group, face: s.face, bar: s.bar });
  rec.ok(`1. the name "${s && s.name}" is the player's`, !!s && s.name === s.myName, s && s.name);
  await corner(A, 'up-xp0', false);

  /* ── 5. weapon XP earned on the sword at Frost Ridge moves the fill ── */
  await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
  await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => {});
  await A.page.waitForTimeout(1500);
  await H.equipWeapon(A, 'greatsword', 'weapon', 'melee').catch(() => null);
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const fz = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
  await H.hopTo(A, fz[0] + 150, fz[1] + 220, { tries: 260 });
  await A.page.waitForTimeout(1500);
  const f0 = await look(A);
  let f1 = null, flew = false;
  for (let tries = 0; tries < 18 && !f1; tries++) {
    const m = (await near(A))[0];
    if (!m) break;
    if (m.d > 70) await H.hopTo(A, m.x, m.y + 50, { tries: 20 });
    await A.page.waitForTimeout(300);
    await tapR(A);
    for (let i = 0; i < 40; i++) {
      await A.page.waitForTimeout(60);
      const b = await look(A);
      if (b.flyToHud) flew = true;
      if (b.art && f0.art && b.art.cat === 'sword' && (b.art.frac > f0.art.frac || b.art.weaponLevel > f0.art.weaponLevel)) { f1 = b; break; }
    }
  }
  rec.ok(`5. a real hit on a snowman moves the sword's fill (frac ${f0.art && f0.art.frac} -> ${f1 && f1.art && f1.art.frac.toFixed(3)}, level ${f1 && f1.art && f1.art.weaponLevel})`, !!f1, { f0: f0.art, f1: f1 && f1.art });
  rec.ok('5. ...and a kill\'s flight lands on the bar (the count in it is the one shown)', flew || !!(f1 && f1.flyToHud), { flew });
  const f2 = await until(A, (x) => fillOk(x), 6000);
  rec.ok(`3. the fill drawn ${f2 && f2.fill ? (f2.fill.w - f2.clip).toFixed(1) : 0} px for ${f2 && f2.art && (f2.art.frac * f2.art.innerW).toFixed(1)} (its share of ${f2 && f2.art && f2.art.innerW})`, fillOk(f2), f2 && { fill: f2.fill, clip: f2.clip, art: f2.art });
  await corner(A, 'up-xp-hit', false);

  /* ── 2, 3 and 4: levels where the two numbers differ; a swap of weapons ── */
  await H.devOp(wsPort, 'kit', me, { what: 'levels' }).catch(() => null);
  await H.devOp(wsPort, 'combat', me, { skill: 'bow', level: 60 }).catch(() => null);
  s = await until(A, (x) => x.art && x.blob && x.blob.sk.bow && x.blob.sk.bow.level === 60 && x.badge === String(wantOf(x).level));
  w = s && s.blob ? wantOf(s) : null;
  rec.ok(`2. the badge "${s && s.badge}" is the combat level (${w && w.level}; the worker's own rpg.level ${w && w.own}), the pill "${s && s.pill}" the sword's own level (${w && w.wl}): never swapped`,
    !!w && s.badge === String(w.level) && w.level === w.own && s.pill === String(w.wl) && w.level !== w.wl && s.icon === 'sword', { badge: s && s.badge, pill: s && s.pill, w });
  const h3 = await until(A, (x) => fillOk(x) && x.art.frac > 0 && x.art.frac < 1, 4000);
  rec.ok(`3. a part of a level (the dev kit's XP): the fill ${h3 && h3.fill ? (h3.fill.w - h3.clip).toFixed(1) : 0} px for ${h3 && h3.art && (h3.art.frac * h3.art.innerW).toFixed(1)}`, fillOk(h3) && h3.art.frac > 0, h3 && { fill: h3.fill, clip: h3.clip, art: h3.art });
  await corner(A, 'up-xp-part', false);
  const swap = async (type, stash, slot, cat) => {
    await H.equipWeapon(A, type, stash, slot).catch(() => null);
    const x = await until(A, (y) => y.art && y.art.cat === cat && y.icon === cat);
    const wx = x && x.blob ? wantOf(x) : null;
    rec.ok(`4. ${type} in hand: the ring's icon "${x && x.icon}", the pill "${x && x.pill}" (its level ${wx && wx.wl}), the fill its own (frac ${x && x.art && x.art.frac.toFixed(3)}), the badge still "${x && x.badge}"`,
      !!wx && x.icon === cat && x.pill === String(wx.wl) && x.badge === String(wx.level) && fillOk(x), x && { art: x.art, pill: x.pill, badge: x.badge, fill: x.fill, w: wx });
    return x;
  };
  await swap('bow', 'rangedWeapon', 'ranged', 'bow');
  await corner(A, 'up-bow', false);
  await swap('staff', 'staffWeapon', 'staff', 'staff');
  await corner(A, 'up-staff', false);
  await swap('greatsword', 'weapon', 'melee', 'sword');

  /* ── 6. the face opens Bro; the bar the weapon's page, and Back goes to Combat ── */
  await tapCentre(A, '[data-hudart-face]');
  const t6 = await dashIs(A, (t) => t === 'hero');
  rec.ok(`6. a tap on the face opens Bro ("${t6}")`, t6 === 'hero', t6);
  await H.closeDest(A).catch(() => {});
  await A.page.waitForTimeout(600);
  await tapCentre(A, '[data-hudart-bar]');
  const t6b = await dashIs(A, (t) => t === 'broSword');
  rec.ok(`6. a tap on the bar opens the sword's page ("${t6b}")`, t6b === 'broSword', t6b);
  await A.page.evaluate(() => { const b = window.__broDashPanelBus; if (b) b.pop(); }).catch(() => {});
  const t6c = await dashIs(A, (t) => t === 'broCombat', 3000);
  rec.ok(`6. ...and Back goes to Combat ("${t6c}")`, t6c === 'broCombat', t6c);
  await H.closeDest(A).catch(() => {});
  await A.page.waitForTimeout(600);

  /* ── the computer, and the party ── */
  const D = await H.newPlayer(browser, { name: 'Artdesk', wsPort, webPort, viewport: { width: 1280, height: 720 }, dpr: 2, world: 'wheel', wide: true });
  watch(D, 'computer');
  listen(D, 'computer');
  await H.enterWorld(D);
  const playAtD = Date.now();
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
  rec.ok(`1. a party of two, a phone and a computer (guard): ${formed}`, formed === 2, formed);
  /* 6. on the computer neither click swings */
  for (const [sel, want] of [['[data-hudart-face]', 'hero'], ['[data-hudart-bar]', 'broSword']]) {
    await D.page.evaluate(() => { window.__btProbe = true; window.__btDeskPress = null; const S = window._gameState.current; S.autoAttack = false; });
    await tapCentre(D, sel, { mouse: true });
    const t = await dashIs(D, (x) => x === want);
    const press = await D.page.evaluate(() => ({ press: window.__btDeskPress, auto: !!window._gameState.current.autoAttack }));
    rec.ok(`6. on the computer a click on ${sel} opens "${t}" and does not swing (press ${JSON.stringify(press.press)}, autoAttack ${press.auto})`,
      t === want && (!press.press || !/attack|bash/.test(press.press.kind || '')) && !press.auto, press);
    await H.closeDest(D).catch(() => {});
    await D.page.waitForTimeout(600);
  }

  /* ── 1. the group at four sizes, against everything at the top ── */
  const chill = (P) => P.page.evaluate(() => { const S = window._gameState.current; S._chillUntil = Date.now() + 120000; });
  const back = (P) => P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /I.m back/.test(x.textContent || '')); if (b) b.click(); }).catch(() => {});
  const SIZES = [
    { P: A, id: '390x844', vp: { width: 390, height: 844 } },
    { P: A, id: '375x667', vp: { width: 375, height: 667 }, shot: 'ui3-hudart-upright.png' },
    { P: A, id: '667x375', vp: { width: 667, height: 375 }, side: true, shot: 'ui3-hudart-sideways.png' },
    { P: A, id: '844x390', vp: { width: 844, height: 390 }, side: true, corner: 'side-part' },
    { P: D, id: '1280x720', vp: null, shot: 'ui3-hudart-computer.png' },
  ];
  for (const Z of SIZES) {
    if (Z.vp) await Z.P.page.setViewportSize(Z.vp);
    await back(Z.P);
    await chill(Z.P);
    await Z.P.page.waitForTimeout(1800);
    let z = null;
    for (let i = 0; i < 20; i++) { z = await look(Z.P); if (z.group && z.party) break; await chill(Z.P); await Z.P.page.waitForTimeout(300); }
    const boxes = { hud: z.group, title: z.title, line: z.line, status: z.col, party: z.party, minimap: z.mini };
    const names = Object.keys(boxes).filter((k) => boxes[k]);
    const hits = names.filter((n) => n !== 'hud' && cross(z.group, boxes[n]));
    const wantW = Z.side ? 169 : 184, wantH = Z.side ? 48 : 52;
    rec.ok(`1. [${Z.id}] the group ${z.group && Math.round(z.group.w)} x ${z.group && Math.round(z.group.h)} (${wantW} x ${wantH}) crosses nothing, no quest line (${names.join(', ')}); its top ${z.group && Math.round(z.group.t)} under the bar's ${z.header && Math.round(z.header.b)}`,
      !!z.group && !z.line && !!z.party && hits.length === 0 && Math.round(z.group.w) === wantW && Math.round(z.group.h) === wantH
        && !!z.header && z.group.t >= z.header.b - 0.5 && z.group.t - z.header.b <= 16, { hits, boxes });
    if (z.mini && z.group) console.log(`    [${Z.id}] HUD to minimap: ${Math.round(z.mini.l - z.group.r)} px`);
    if (Z.shot) await Z.P.page.screenshot({ path: join(SHOTS, Z.shot) }).catch(() => {});
    if (Z.corner) await corner(Z.P, Z.corner, true);
  }
  await A.page.setViewportSize({ width: 390, height: 844 });

  /* ── 3. the cap: the sword at 100, full and "100" ── */
  await back(A);
  await A.page.waitForTimeout(800);
  const capSet = await H.devOp(wsPort, 'combat', me, { skill: 'sword', level: 100 }).catch((e) => ({ ok: false, error: String(e) }));
  const c = await until(A, (x) => x.art && x.art.max && x.pill === '100', 12000);
  rec.ok(`setup: the sword set to 100 by the dev lever (guard): ${JSON.stringify(capSet).slice(0, 120)}`, !!capSet && capSet.ok === true, capSet);
  const cw = c && c.group ? c.art.innerW * c.k : 0;
  rec.ok(`3. at the cap the fill is the whole inner width (${c && c.fill && c.fill.w.toFixed(1)} of ${cw.toFixed(1)}), the pill "${c && c.pill}", the badge "${c && c.badge}"`,
    !!c && !!c.fill && Math.abs(c.fill.w - cw) <= 1 && c.clip === 0 && c.pill === '100' && c.badge === String(wantOf(c).level), c && { fill: c.fill, art: c.art, badge: c.badge });
  await corner(A, 'up-cap', false);
  await A.page.setViewportSize({ width: 844, height: 390 });
  await A.page.waitForTimeout(1200);
  await corner(A, 'side-cap', true);
  await A.page.setViewportSize({ width: 390, height: 844 });

  /* ── 7. no picture of the HUD fetched after the loading screen ── */
  const late = hudReqs.filter((x) => (x.id === 'phone' && x.at > playAt) || (x.id === 'computer' && x.at > playAtD));
  rec.ok(`7. the HUD's pictures load behind the loading screen (${hudReqs.length} requests before play, ${late.length} after)`, hudReqs.length > 0 && late.length === 0, late.slice(0, 5));

  /* ── 8. ?hudart=0, remembered; ?hudart=1 forgets ── */
  const O = await H.newPlayer(browser, { name: 'Artoff', wsPort, webPort, viewport: { width: 375, height: 667 }, touch: true, dpr: 2, world: 'wheel', query: 'hudart=0' });
  watch(O, 'hudart=0');
  await H.enterWorld(O);
  await H.pastWelcome(O);
  await O.page.waitForTimeout(1500);
  let o = await until(O, (x) => x.panel, 9000);
  rec.ok(`8. ?hudart=0: UI3-hud's drawn panel ("${o && o.panelLv}", ${o && o.panelBox && Math.round(o.panelBox.w)} x ${o && o.panelBox && Math.round(o.panelBox.h)}), none of the owner's pictures`,
    !!o && o.panel && !o.group && /^Lv \d+$/.test(o.panelLv || '') && Math.round(o.panelBox.w) === 184 && Math.round(o.panelBox.h) === 52, o && { panel: o.panel, lv: o.panelLv, box: o.panelBox });
  await O.page.screenshot({ path: join(SHOTS, 'ui3-hudart-off.png') }).catch(() => {});
  await corner(O, 'off', false);
  const bare = O.page.url().replace(/([?&])hudart=0(&|$)/, (m0, a1, a2) => (a2 ? a1 : '')).replace(/[?&]$/, '');
  await O.page.goto(bare);
  await H.enterWorld(O).catch(() => {});
  o = await until(O, (x) => x.panel || x.group, 12000);
  rec.ok('8. ...remembered after a reload without it (the panel, no pictures)', !!o && o.panel && !o.group, o && { panel: o.panel, group: o.group });
  await O.page.goto(bare + (bare.indexOf('?') >= 0 ? '&' : '?') + 'hudart=1');
  await H.enterWorld(O).catch(() => {});
  await O.page.goto(bare);
  await H.enterWorld(O).catch(() => {});
  o = await until(O, (x) => x.group, 12000);
  rec.ok('8. ?hudart=1 forgets: the owner\'s pictures back after a reload without it', !!o && !!o.group && !o.panel, o && { panel: o.panel, group: o.group });

  rec.ok(`9. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
}
