/* ═══ v2.3.6847: THE ATTACK BUTTON AND THE HUD, BIGGER, IN THE WORLD (card UI4; `?bighud=0` today's) ═══
 *
 * The owner, about 07:05 UTC 2026-11-28, on their iPhone: "Attack button and
 * HUD need to be about twice as big."  The rule is src/game/bigHud.js (its
 * suite tools/guards/big-hud.test.mjs); this plays it on a real worker, IN
 * THE WORLD (`world: 'wheel'`), two phones side by side: one as the game
 * starts (bigger) and one with `?bighud=0` (today's), at 390 x 844, 375 x
 * 667 and 320 x 568 upright and 844 x 390 sideways:
 *   1. the numbers, before and after: the HUD's drawn box and its scale, the
 *      Attack disc's face and touch box (printed, for the PR);
 *   2. bigger: the HUD at least today's and never over the minimap, the top
 *      bar or a control; Attack at least today's, its box never over another
 *      control's box or the stick's well; every control's box at least 44;
 *      upright at 390 both larger than today's;
 *   3. `?bighud=0`: today's exactly (the HUD 184 x 52, 169 x 48 sideways; the
 *      disc padLayout's own face), and remembered after a reload without it;
 *   4. no page errors.
 * Pictures (deviceScaleFactor 2): the system's temp folder, bighud-raw/ (each
 * size, before and after); tools/qa/mp/bighud-shots.py puts 390 x 844 and
 * 844 x 390 side by side in docs/shots/bighud-before-after.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
export const lane = 'full';

/* the raw pictures stay out of the repository (eight full screens): only the pair is kept */
const RAW = process.env.BT_BIGHUD_RAW || join(tmpdir(), 'bighud-raw');
const SIZES = [
  { id: '390x844', vp: { width: 390, height: 844 } },
  { id: '375x667', vp: { width: 375, height: 667 } },
  { id: '320x568', vp: { width: 320, height: 568 } },
  { id: '844x390', vp: { width: 844, height: 390 }, side: true },
];
const SEL = {
  jump: '[data-jump]', skate: '[data-ride]', block: '[data-shield]', special: '[data-special]', charge: '[data-charge]',
  w1: '[data-pad-well="w1"]', w2: '[data-pad-well="w2"]', w3: '[data-pad-well="w3"]',
};

const look = (P) => P.page.evaluate((sel) => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 ? { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height } : null; };
  const vis = (el) => { let e = el; while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; e = e.parentElement; } return !!el; };
  const g = document.querySelector('[data-hudart]');
  const k = g ? Number(getComputedStyle(g).getPropertyValue('--ha-k')) || 1 : null;
  const mini = window.__btWheelMini;
  const disc = document.querySelector('.bt-rjoy-base');
  const face = disc && disc.querySelector('.bt-pad-face');
  const ctl = {};
  for (const n of Object.keys(sel)) { const e = document.querySelector(sel[n]); ctl[n] = e && vis(e) ? r(e) : null; }
  const stick = document.querySelector('[data-well-pic="stick"]');
  const cs = getComputedStyle(document.documentElement);
  const band = parseFloat(cs.getPropertyValue('--sheet-h')) || parseFloat(cs.getPropertyValue('--dash-h')) || 0;
  return {
    vw: window.innerWidth, vh: window.innerHeight,
    hud: r(g), k, face: r(g && g.querySelector('[data-hudart-face]')), name: r(g && g.querySelector('[data-charhud-name]')),
    nameSize: g && g.querySelector('[data-charhud-name]') ? parseFloat(getComputedStyle(g.querySelector('[data-charhud-name]')).fontSize) : null,
    mini: mini ? { l: mini.left, t: mini.top, r: mini.left + mini.w, b: mini.top + mini.h, w: mini.w, h: mini.h } : null,
    header: r(document.querySelector('.bt-zone-header')),
    attack: r(disc), attackFace: r(face),
    ctl, stick: r(stick), shell: r(document.querySelector('[data-padhousing="shell"]')),
    canvas: r(document.querySelector('canvas')),
    bandTop: window.innerHeight - band,
    status: (() => { const c = document.querySelector('[data-elem-chips]'); let col = c; while (col && col.parentElement && getComputedStyle(col).position !== 'absolute') col = col.parentElement; return c ? r(col) : null; })(),
    probe: window.__btBigHud ? window.__btBigHud() : null,
    stack: cs.getPropertyValue('--bt-charhud-h').trim() || null,
  };
}, SEL);

const cross = (a, b) => !!a && !!b && a.l < b.r - 0.5 && a.r > b.l + 0.5 && a.t < b.b - 0.5 && a.b > b.t + 0.5;
const n1 = (v) => (v == null ? '-' : Math.round(v * 10) / 10);
const dims = (b) => (b ? n1(b.w) + ' x ' + n1(b.h) : 'none');

async function settle(P) {
  let s = null;
  for (let i = 0; i < 30; i++) { s = await look(P); if (s.hud && s.attack) break; await P.page.waitForTimeout(300); }
  await P.page.waitForTimeout(400);
  return look(P);
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(RAW, { recursive: true });
  const PS = await import(H.REPO + '/src/game/padSkin.js');
  const errors = [];
  const watch = (P, id) => P.page.on('pageerror', (e) => errors.push(id + ': ' + String(e && e.message || e).slice(0, 200)));

  const A = await H.newPlayer(browser, { name: 'Bigbro', wsPort, webPort, viewport: SIZES[0].vp, touch: true, dpr: 2, world: 'wheel' });
  watch(A, 'big');
  await H.enterWorld(A);
  await H.pastWelcome(A);
  const B = await H.newPlayer(browser, { name: 'Todaybro', wsPort, webPort, viewport: SIZES[0].vp, touch: true, dpr: 2, world: 'wheel', query: 'bighud=0' });
  watch(B, 'today');
  await H.enterWorld(B);
  await H.pastWelcome(B);
  const hide = '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }';
  for (const P of [A, B]) await P.page.addStyleTag({ content: hide }).catch(() => {});

  const table = [];
  for (const Z of SIZES) {
    for (const P of [A, B]) await P.page.setViewportSize(Z.vp);
    await A.page.waitForTimeout(1500);
    const a = await settle(A), b = await settle(B);
    for (const [P, who] of [[A, 'after'], [B, 'before']]) await P.page.screenshot({ path: join(RAW, Z.id + '-' + who + '.png') }).catch(() => {});
    /* 1. the numbers */
    const row = { size: Z.id,
      hudBefore: dims(b.hud), hudAfter: dims(a.hud), kBefore: b.k, kAfter: a.k, nameBefore: b.nameSize, nameAfter: a.nameSize,
      attackBefore: dims(b.attackFace || b.attack), attackAfter: dims(a.attackFace || a.attack), boxBefore: dims(b.attack), boxAfter: dims(a.attack),
      grow: a.probe && a.probe.grow, room: a.probe && a.probe.hud,
      hudL: a.hud && n1(a.hud.l), hudB: a.hud && n1(a.hud.b), miniL: a.mini && n1(a.mini.l), canvas: a.canvas && [n1(a.canvas.l), n1(a.canvas.w), n1(a.canvas.h)],
      bandTop: n1(a.bandTop), stickTop: a.stick && n1(a.stick.t), shellTop: a.shell && n1(a.shell.t), statusTop: a.status && n1(a.status.t) };
    table.push(row);
    rec.ok(`1. ${Z.id}: the HUD ${row.hudBefore} -> ${row.hudAfter} (scale ${b.k} -> ${a.k}, the name ${n1(b.nameSize)} -> ${n1(a.nameSize)} px); Attack's face ${row.attackBefore} -> ${row.attackAfter}, its touch box ${row.boxBefore} -> ${row.boxAfter}`,
      !!a.hud && !!b.hud && !!a.attack && !!b.attack, row);
    /* 2. bigger, and nothing covered */
    const others = Object.keys(a.ctl).filter((n) => a.ctl[n]);
    /* at 320 wide today's HUD (8 + 184) already reaches 4 px over the minimap (132 at 188): kept, never worse (flagged) */
    const same = !!a.hud && !!b.hud && Math.abs(a.hud.w - b.hud.w) < 0.5 && Math.abs(a.hud.h - b.hud.h) < 0.5;
    const hudHits = ['mini', 'header'].filter((n) => cross(a.hud, a[n]) && !(same && n === 'mini' && cross(b.hud, b.mini))).concat(others.filter((n) => cross(a.hud, a.ctl[n])))
      .concat(cross(a.hud, a.stick) ? ['stick'] : []).concat(cross(a.hud, a.shell) ? ['the controller'] : []);
    rec.ok(`2. ${Z.id}: the HUD at least today's (${dims(a.hud)} >= ${dims(b.hud)}) and over nothing (minimap ${a.mini ? n1(a.mini.l) : '-'} from the left; the HUD's right ${a.hud ? n1(a.hud.r) : '-'})${hudHits.length ? ': OVER ' + hudHits.join(', ') : ''}`,
      !!a.hud && !!b.hud && a.hud.w >= b.hud.w - 0.5 && a.hud.h >= b.hud.h - 0.5 && hudHits.length === 0, { hud: a.hud, mini: a.mini, header: a.header, hits: hudHits });
    const atkHits = others.filter((n) => cross(a.attack, a.ctl[n])).concat(cross(a.attack, a.stick) ? ['stick'] : []).concat(cross(a.attack, a.hud) ? ['hud'] : []);
    rec.ok(`2. ${Z.id}: Attack at least today's (${dims(a.attack)} >= ${dims(b.attack)}), over no control (${others.join(', ')}, the stick)${atkHits.length ? ': OVER ' + atkHits.join(', ') : ''}, inside the screen and above the band (bottom ${a.attack ? n1(a.attack.b) : '-'} <= ${n1(a.bandTop)})`,
      !!a.attack && a.attack.w >= b.attack.w - 0.5 && atkHits.length === 0 && a.attack.r <= a.vw + 0.5 && a.attack.b <= a.bandTop + 0.5, { attack: a.attack, ctl: a.ctl, hits: atkHits });
    const small = [['attack', a.attack]].concat(others.map((n) => [n, a.ctl[n]])).filter(([, x]) => x && (x.w < 43.5 || x.h < 43.5)).map(([n, x]) => n + ' ' + dims(x));
    rec.ok(`2. ${Z.id}: every control's box at least 44 x 44${small.length ? ': ' + small.join(', ') : ''}`, small.length === 0, small);
    if (Z.id === '390x844') {
      rec.ok(`2. 390x844: both larger than today's (the HUD ${n1(b.hud && b.hud.w)} -> ${n1(a.hud && a.hud.w)} wide, Attack ${n1(b.attack && b.attack.w)} -> ${n1(a.attack && a.attack.w)})`,
        !!a.hud && !!b.hud && a.hud.w > b.hud.w + 1 && a.attack.w > b.attack.w + 1, null);
    }
    /* 3. ?bighud=0: today's exactly */
    const L = PS.padLayout(!!Z.side, b.canvas ? Math.round(b.canvas.w) : Z.vp.width);
    const todayD = Math.round(L.wells.attack.d);
    const wantHud = Z.side ? [169.28, 47.84] : [184, 52];
    rec.ok(`3. ${Z.id}: ?bighud=0 draws today's: the HUD ${dims(b.hud)} (${wantHud.join(' x ')}), Attack's face ${dims(b.attackFace)} (padLayout ${todayD}), no stack override (${b.stack})`,
      !!b.hud && Math.abs(b.hud.w - wantHud[0]) <= 1 && Math.abs(b.hud.h - wantHud[1]) <= 1 && !!b.attackFace && Math.abs(b.attackFace.w - todayD) <= 1.5, { hud: b.hud, face: b.attackFace, todayD });
  }
  console.log('BIGHUD TABLE ' + JSON.stringify(table));

  /* 3. remembered: a reload without the switch keeps today's; ?bighud=1 forgets */
  await B.page.setViewportSize(SIZES[0].vp);
  const bare = B.page.url().replace(/([?&])bighud=0(&|$)/, (m0, a1, a2) => (a2 ? a1 : '')).replace(/[?&]$/, '');
  await B.page.goto(bare);
  await H.enterWorld(B);
  const kept = await settle(B);
  rec.ok(`3. remembered: a reload without ?bighud=0 still draws today's HUD (${dims(kept.hud)})`, !!kept.hud && Math.abs(kept.hud.w - 184) <= 1, kept.hud);
  await B.page.goto(bare + (bare.indexOf('?') >= 0 ? '&' : '?') + 'bighud=1');
  await H.enterWorld(B);
  const back = await settle(B);
  rec.ok(`3. ?bighud=1 forgets: the bigger HUD again (${dims(back.hud)})`, !!back.hud && back.hud.w > 185, back.hud);

  rec.ok(`4. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
}
