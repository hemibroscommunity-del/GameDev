/* ═══ mp-brocard (v2.3.4062): THE BRO PAGE IS YOUR OWN INSPECT CARD ═══
 *
 * The owner, 2026-11-03: "I wanted the bro tab to be like what it looks like
 * when you inspect another player.  PFP clan, achievements, all the base
 * character stats, primary combat skills, place where you can tap to open
 * points spend window, etc".
 *
 * In the world (world: 'wheel'), upright at 390x844 with a finger:
 *   1. the Bro button opens ONE card, the Inspect card's own (PlayerProfilePanel
 *      .bt-pin, data-profile="self"), with no tab row: your portrait (a picture
 *      that loaded), name, LV, AP, your clan line ("No Clan" for a new bro),
 *      the three combat skills each with a level and a bar, the stats
 *      (HP / stamina / mana, offense, defense), the Life Skills row and, where
 *      the worker grants them, the Achievements row;
 *   2. a real level-up (the dev kit, the worker's own XP path) gives points:
 *      "Spend points (N)" reads N and glows, and it is on screen without a
 *      scroll (the guide arrow and the points bubbles aim at it);
 *   3. a tap on it opens the Points window over the tab (the card goes), its
 *      title row says Points, and its close comes back to the card;
 *   4. the six equipment slots open the Equipment window, and its close comes
 *      back;
 *   5. the Life Skills row opens the Life Skills page under Bro (stack
 *      ['hero', 'skills']), and the back chip comes back to the card; the
 *      Achievements row the same;
 *   6. the clan box opens the clan's page under Bro;
 *   7. a computer playing wide (wide: true): Bro opens the same card in the
 *      column, P opens it, the Spend button opens the window, Esc closes it.
 * Pictures for the PR: tools/qa/mp/out/bro-tab.png, bro-tab-points.png,
 * bro-tab-full.png (the whole card, stood up for the picture), bro-tab-desk.png
 * (docs/shots/ has them on 256 colours).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `${name}.png`) }); } catch (e) { /* a picture only */ } };

async function touch(P, sel) {
  const r = await P.page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    e.scrollIntoView({ block: 'nearest' });   /* the body's scroll-padding keeps it above the dock */
    const b = e.getBoundingClientRect();
    const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, reach: !!t && (t === e || e.contains(t)) };
  }, sel);
  if (!r) return false;
  if (!r.reach) console.log(`    (the finger's spot for ${sel} is covered)`);
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
  await new Promise((res) => setTimeout(res, 60));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  return true;
}

const bus = (P) => P.page.evaluate(() => {
  const b = window.__broDashPanelBus;
  return b ? { mode: b.state.mode, stack: b.state.stack.slice() } : null;
});

/* what the card shows, read off the page */
const card = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-bro-page="Card"] .bt-pin.is-embedded');
  const S = window._gameState && window._gameState.current;
  if (!c) return { there: false, popup: (document.querySelector('[data-bro-popup]') || {}).getAttribute ? document.querySelector('[data-bro-popup]').getAttribute('data-bro-popup') : null };
  const q = (s) => c.querySelector(s);
  const txt = (e) => (e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : null);
  const face = q('.bt-pin-face img');
  const spend = q('[data-section="Build"]');
  const sr = spend && spend.getBoundingClientRect();
  const glow = spend && spend.querySelector('[data-pts-glow="tab"]');
  const stats = [...c.querySelectorAll('[data-bro-stat]')].map((e) => e.getAttribute('data-bro-stat'));
  return {
    there: true,
    self: c.getAttribute('data-profile'),
    tabRow: document.querySelectorAll('[data-section="Me"], [data-section="Skills"], [data-section="Achievements"]').length,
    close: !!q('.bt-inspect-close'),
    face: face ? { w: face.naturalWidth, src: (face.getAttribute('src') || '').slice(0, 30) } : null,
    name: txt(q('.bt-pin-nm')), myName: S && S.myName,
    lv: txt(q('.bt-pcard-lv')),
    ap: txt(q('[data-stat="ap"]')), apBtn: !!q('button[data-stat="ap"]'),
    clan: txt(q('[data-stat="clan"]')), clanBtn: !!q('button[data-stat="clan"]'),
    combat: [...c.querySelectorAll('.bt-pin-cb')].map((e) => ({ k: e.getAttribute('data-skill'), lv: e.getAttribute('data-level'),
      bar: e.querySelector('.bt-pin-cbbar') ? Number(e.querySelector('.bt-pin-cbbar').getAttribute('data-pct')) : null })),
    stats,
    life: !!q('[data-bro-life]'), achv: !!q('[data-bro-achv]'),
    caps: !!(S && S._serverCaps && S._serverCaps.achievements),
    equip: !!q('.bt-pin-equip[data-section="Overview"]'),
    spend: spend ? { text: txt(spend), label: spend.getAttribute('aria-label'), dock: !!spend.closest('.bt-pin-dock.is-own'), n: Number(spend.getAttribute('data-bro-spend')), live: spend.classList.contains('is-live'),
      glow: glow ? getComputedStyle(glow).animationName : null,
      top: Math.round(sr.top), bottom: Math.round(sr.bottom), vh: innerHeight,
      hit: (() => { const t = document.elementFromPoint(sr.left + sr.width / 2, sr.top + sr.height / 2); return !!t && (t === spend || spend.contains(t)); })() } : null,
  };
});

const popup = (P) => P.page.evaluate(() => {
  const w = document.querySelector('[data-bro-popup]');
  if (!w) return null;
  const head = w.querySelector('[data-bro-popup-head]');
  return {
    id: w.getAttribute('data-bro-popup'),
    head: head ? (head.textContent || '').replace(/\s+/g, ' ').trim() : null,
    close: !!w.querySelector('[data-bro-popup-close][data-esc]'),
    card: !!document.querySelector('[data-bro-page="Card"]'),
    shown: window.__btHeroSection ? window.__btHeroSection.shown : null,
    grid: !!w.querySelector('[data-prog3-grid], [data-prog3-card], [data-prog3-lane]'),
    figure: !!w.querySelector('canvas[aria-label="Your character"]'),
  };
});

const want = ['hp', 'stamina', 'mana', 'dps', 'damage', 'range', 'aspd', 'crit', 'critDmg', 'special', 'elem', 'def', 'armor', 'dodge', 'move', 'eres'];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Cardbro', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2, world: 'wheel' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(2500);
    await H.closeNpcDialogue(P).catch(() => {});
    const zone = await H.readState(P, (S) => S.currentZone);
    rec.ok(`in the world (zone ${zone}) (guard)`, zone === 'wheel', { zone });

    /* ── 1. the card ── */
    await touch(P, '[data-nav="hero"]');
    await P.page.waitForTimeout(1500);
    const b1 = await bus(P);
    rec.ok('the Bro button opens Bro', !!b1 && b1.mode === 'expanded' && b1.stack[0] === 'hero', b1);
    const c1 = await card(P);
    rec.ok('Bro is ONE card: the Inspect card\'s own (.bt-pin, your profile), no tab row, no ✕',
      c1.there && c1.self === 'self' && c1.tabRow === 0 && !c1.close, c1);
    rec.ok('...your portrait (a picture that loaded), your name and your LV',
      !!c1.face && c1.face.w > 0 && c1.name === c1.myName && /^LV \d+$/.test(c1.lv || ''), { face: c1.face, name: c1.name, my: c1.myName, lv: c1.lv });
    rec.ok(`...your clan line (a new bro: "${c1.clan}"), a door`, c1.clan === 'No Clan' && c1.clanBtn, { clan: c1.clan });
    rec.ok(`...your Achievement Points ("${c1.ap}")${c1.caps ? ', a door to the page' : ''}`, /\d+ AP$/.test(c1.ap || '') && c1.apBtn === c1.caps, { ap: c1.ap, btn: c1.apBtn, caps: c1.caps });
    rec.ok(`...the three combat skills, each a level and a bar (${c1.combat.map((x) => `${x.k} ${x.lv} ${x.bar}%`).join(', ')})`,
      c1.combat.length === 3 && ['melee', 'bow', 'staff'].every((k, i) => c1.combat[i] && c1.combat[i].k === k && Number(c1.combat[i].lv) >= 1 && c1.combat[i].bar !== null), c1.combat);
    rec.ok(`...the stats: HP, stamina, mana, offense and defense (${c1.stats.length} pills)`,
      want.every((k) => c1.stats.includes(k)), { stats: c1.stats });
    rec.ok('...the Life Skills row, the six slots as a door, and the Achievements row where the worker grants them',
      c1.life && c1.equip && c1.achv === c1.caps, { life: c1.life, equip: c1.equip, achv: c1.achv, caps: c1.caps });
    rec.ok(`...and "Spend points" (${c1.spend && c1.spend.text}) with nothing to spend: not lit`,
      !!c1.spend && c1.spend.n === 0 && !c1.spend.live && !c1.spend.glow && /^Spend points ?\(0\)$/.test(c1.spend.text) && c1.spend.label === 'Spend points (0)', c1.spend);
    rec.ok('...standing in the dock\'s place (another player\'s Party / Trade / Duel), stuck to the card\'s bottom edge', !!c1.spend && c1.spend.dock, c1.spend);

    /* ── 2. points to spend ── */
    const myId = await H.readState(P, (S) => S.myId);
    const kit = await H.devOp(wsPort, 'kit', myId, { what: 'levels' });
    rec.ok('the worker levelled the bro up through its own XP path (guard)', !!(kit && kit.ok !== false), kit);
    let c2 = null;
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(300);
      c2 = await card(P);
      if (c2.spend && c2.spend.n > 0) break;
    }
    const pool = await H.readState(P, (S) => { const p = S.rpg && S.rpg.prog3; return p ? (p.pool || 0) + (p.shared || 0) : null; });
    rec.ok(`"Spend points (${c2.spend && c2.spend.n})" reads the points waiting (${pool}) and glows`,
      !!c2.spend && c2.spend.n > 0 && c2.spend.live && c2.spend.glow === 'bt-pts-glow' && c2.spend.label === `Spend points (${c2.spend.n})` && c2.spend.n === pool, { spend: c2.spend, pool });
    rec.ok('...on screen without a scroll, and a finger there reaches it',
      !!c2.spend && c2.spend.top >= 0 && c2.spend.bottom <= c2.spend.vh && c2.spend.hit, c2.spend);
    /* let any level-up medallion fade before the picture */
    await P.page.waitForTimeout(5000);
    await P.page.evaluate(() => { const b = document.querySelector('[data-bro-page="Card"] .bt-pin-body'); if (b) b.scrollTop = 0; });
    await shot(P, 'bro-tab');

    /* ── 3. the Points window ── */
    await touch(P, '[data-section="Build"]');
    await P.page.waitForTimeout(1200);
    const w1 = await popup(P);
    rec.ok('a tap on it opens the Points window over the tab (the card goes, the title says Points)',
      !!w1 && w1.id === 'Build' && !w1.card && /^Points/.test(w1.head || '') && w1.shown === 'Build' && w1.close && w1.grid, w1);
    await shot(P, 'bro-tab-points');
    await touch(P, '[data-bro-popup-close]');
    await P.page.waitForTimeout(900);
    const c3 = await card(P);
    rec.ok('...and its close comes back to the card', c3.there && !(await popup(P)), { there: c3.there });

    /* ── 4. the Equipment window ── */
    await touch(P, '.bt-pin-equip[data-section="Overview"]');
    await P.page.waitForTimeout(1500);
    const w2 = await popup(P);
    rec.ok('the six equipment slots open the Equipment window (your figure in it)',
      !!w2 && w2.id === 'Overview' && /^Equipment/.test(w2.head || '') && w2.figure, w2);
    await touch(P, '[data-bro-popup-close]');
    await P.page.waitForTimeout(900);
    rec.ok('...and its close comes back to the card', (await card(P)).there);

    /* ── 5. Life Skills and Achievements, pages under Bro ── */
    await touch(P, '[data-bro-life]');
    await P.page.waitForTimeout(1200);
    const b5 = await bus(P);
    rec.ok('the Life Skills row opens the Life Skills page under Bro', !!b5 && b5.stack.join('/') === 'hero/skills', b5);
    await P.page.evaluate(() => window.__broDashPanelBus.pop());
    await P.page.waitForTimeout(900);
    rec.ok('...and back comes to the card', (await card(P)).there && (await bus(P)).stack.join('/') === 'hero');
    if (c1.caps) {
      await touch(P, '[data-bro-achv]');
      await P.page.waitForTimeout(1200);
      const b6 = await bus(P);
      rec.ok('the Achievements row opens the Achievements page under Bro', !!b6 && b6.stack.join('/') === 'hero/achievements', b6);
      await P.page.evaluate(() => window.__broDashPanelBus.pop());
      await P.page.waitForTimeout(900);
    }
    /* the old road: the top bar's medal asked More, then Achievements */
    await P.page.evaluate(() => { window.__broDashPanelBus.open('more'); window.__broDashPanelBus.push('achievements'); });
    await P.page.waitForTimeout(500);
    const b7 = await bus(P);
    rec.ok('an old road (open More, push Achievements) lands under Bro too', !!b7 && b7.stack.join('/') === 'hero/achievements', b7);
    await P.page.evaluate(() => window.__broDashPanelBus.open('hero'));
    await P.page.waitForTimeout(900);

    /* ── 6. the clan ── */
    await touch(P, 'button[data-stat="clan"]');
    await P.page.waitForTimeout(1000);
    const b8 = await bus(P);
    rec.ok('the clan box opens the clan\'s page under Bro', !!b8 && b8.stack.join('/') === 'hero/clan', b8);

    /* ── sideways: the card in the ~220 px side column, no word cut ── */
    await P.page.setViewportSize({ width: 844, height: 390 });
    await P.page.waitForTimeout(1500);
    await P.page.evaluate(() => { window.__btHeroSection.request('Card'); window.__broDashPanelBus.open('hero'); });
    await P.page.waitForTimeout(1500);
    const side = await P.page.evaluate(() => {
      const c = document.querySelector('.bt-land-sheet [data-bro-page="Card"] .bt-pin');
      if (!c) return null;
      const cr = c.getBoundingClientRect();
      const cut = [];
      for (const el of c.querySelectorAll('*')) {
        if (el.children.length || !(el.textContent || '').trim() || el.clientWidth <= 0) continue;
        if (el.scrollWidth > el.clientWidth + 1) cut.push((el.textContent || '').trim().slice(0, 20));
      }
      const past = [...c.querySelectorAll('*')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.right > cr.right + 2; }).length;
      return { w: Math.round(cr.width), cut, past };
    });
    rec.ok(`sideways: the card in the side column (${side && side.w} px), no word cut, nothing past its edge`,
      !!side && side.cut.length === 0 && side.past === 0, side);
    await shot(P, 'bro-tab-side');
    await P.page.setViewportSize({ width: 390, height: 844 });
    await P.page.waitForTimeout(1500);

    /* a picture of the whole card for the PR: the page is ~190 px tall
       upright, so the card is stood up over the screen, a tall one, for it */
    await P.page.evaluate(() => window.__broDashPanelBus.open('hero'));
    await P.page.waitForTimeout(900);
    await P.page.setViewportSize({ width: 390, height: 1500 });
    await P.page.waitForTimeout(900);
    await P.page.evaluate(() => {
      const c = document.querySelector('[data-bro-page="Card"]');
      if (c) Object.assign(c.style, { position: 'fixed', left: '0', right: '0', top: '0', bottom: '0', zIndex: '60', background: '#0E1A20' });
    });
    await P.page.waitForTimeout(600);
    await shot(P, 'bro-tab-full');
  } finally {
    rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
    await P.page.context().close().catch(() => {});
  }

  /* ── 7. a computer playing wide ── */
  const D = await H.newPlayer(browser, { name: 'Deskcard', wsPort, webPort, viewport: { width: 1440, height: 900 }, world: 'wheel', wide: true });
  try {
    await H.enterWorld(D);
    await D.page.waitForTimeout(2500);
    await H.closeNpcDialogue(D).catch(() => {});
    await D.page.mouse.click(720, 300).catch(() => {});
    await D.page.keyboard.press('p');
    await D.page.waitForTimeout(1500);
    const d1 = await card(D);
    rec.ok('a computer: P opens Bro, the same card in the column', d1.there && d1.self === 'self' && d1.tabRow === 0, d1);
    const myId = await H.readState(D, (S) => S.myId);
    await H.devOp(wsPort, 'kit', myId, { what: 'levels' }).catch(() => null);
    await D.page.waitForTimeout(6000);
    await shot(D, 'bro-tab-desk');
    await D.page.click('[data-section="Build"]').catch(() => {});
    await D.page.waitForTimeout(1000);
    const d2 = await popup(D);
    rec.ok('...a click on Spend points opens the Points window', !!d2 && d2.id === 'Build', d2);
    await D.page.keyboard.press('Escape');
    await D.page.waitForTimeout(800);
    rec.ok('...and Esc closes it, back to the card', !(await popup(D)) && (await card(D)).there);
  } finally {
    await D.page.context().close().catch(() => {});
  }
}
