/* ═══ mp-brocard (v2.3.4172): THE BRO PAGE, AS THE OWNER DREW IT ═══
 *
 * The owner, of the first cut (your own Inspect card): "it reads like an old
 * PC menu".  Then a drawing (D474F679-...png in the repo root) and: "One
 * different thing is the xp bar near profile portrait (no general combat
 * xp)".  And: "Keep the 5 buttons".  "No don't change todays dashboard
 * height".  So the page is three panels -- you, the weapon's combat stats, the
 * doors -- laid out from the page's own width (sheet/BroCard.jsx), and the
 * button row is CLOSE then the five, each with its word where it fits.
 *
 * In the world (world: 'wheel'), upright at 390x844 with a finger:
 *   1. the row: CLOSE at its left, the five buttons with their words (none
 *      cut), every button at least 44 x 44 and touch-action: manipulation; the
 *      grip still on the band's edge;
 *   2. Bro opens the card (two columns at 390: you | the doors, the stats
 *      under them): your portrait (a picture that loaded), your name, "Lv N",
 *      NO XP bar, "No title" plainly, "No clan", the AP, the Achievements and
 *      Lifetime Kills tiles; the doors: Achievements (where granted), Life
 *      Skills, Points, Equipment, Homestead, Pet, Titles, Clan;
 *   3. the stats: v2.3.4172, the owner on #1386, "Move the 3 primary combat
 *      skills out of the gear menu and put them into the bro menu" -- the
 *      Melee / Bow / Magic tiles over them (the Gear tab's pictures, "Lv N"
 *      ABOVE each, at least 44 px, touch-action: manipulation), the one for
 *      the weapon out gold-edged; thirteen rows in the drawing's order; a tap
 *      on Bow picks the bow's rows (Bow's tile gold, the others not) AND turns
 *      Bow's tile into its XP bar, "N / M XP" (its numbers the game's), for
 *      ~4 s, then its picture again, still picked;
 *   4. a real level-up: the Points row reads the points waiting, glows, and
 *      is on screen without a scroll (the guide arrow aims at it);
 *   5. each door opens its page and comes back: the Points window (its
 *      close), Equipment the Gear tab (the Bro button back), Life Skills, Achievements, Titles, Pet, Clan (pages
 *      under Bro, the back chip); Homestead says where the farm is; the left
 *      panel's clan, AP and title open theirs; an old road (More, then
 *      Achievements) lands under Bro;
 *   6. CLOSE folds the page and the band, and reads OPEN; OPEN unfolds;
 *   7. a 320 px phone: the pictures alone, every button still 44 tall;
 *      a tablet upright (820 px): the three panels side by side, as drawn;
 *      a phone on its side: the card in the one band (#1410) laid out from
 *      its width, no word cut, CLOSE first in the row;
 *   8. a computer playing wide (wide: true): P opens the card, the row's words
 *      show, a click on Points opens the window, Esc closes it, L opens Life
 *      Skills and L again closes it; a mouse click on a skill tile picks it
 *      and shows its XP.
 * Pictures: tools/qa/mp/out/bro-tab-v2.png (points waiting),
 * bro-tab-v2-bow.png (Bow's tile picked, its stats), bro-tab-v2-desk.png, bro-tab-v2-tablet.png
 * (docs/shots/ has them on 256 colours).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `${name}.png`) }); } catch (e) { /* a picture only */ } };

/* a finger: brought into its own scroller's view first, then a real touch */
async function touch(P, sel) {
  const r = await P.page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    let p = e.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) {
        const er = e.getBoundingClientRect(), pr = p.getBoundingClientRect();
        if (er.top < pr.top || er.bottom > pr.bottom) p.scrollTop += er.top - pr.top - 6;
        break;
      }
      p = p.parentElement;
    }
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
const backToCard = async (P) => {
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b.state.stack.length > 1) b.pop(); });
  await P.page.waitForTimeout(800);
};

/* the button row, read off the page */
const row = (P) => P.page.evaluate(() => {
  const close = document.querySelector('[data-dash-close]');
  const grip = document.querySelector('[data-dash-fold]');
  const rail = [...document.querySelectorAll('.bt-navrail')].find((e) => e.getBoundingClientRect().width > 0);
  const btns = rail ? [...rail.querySelectorAll('[data-nav]')] : [];
  const box = (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; };
  return {
    close: close && close.getBoundingClientRect().width > 0 ? { ...box(close), text: (close.textContent || '').trim(), state: close.getAttribute('data-dash-close'), ta: getComputedStyle(close).touchAction } : null,
    grip: grip ? grip.getAttribute('data-dash-fold') : null,
    words: rail ? rail.getAttribute('data-nav-words') : null,
    vw: innerWidth,
    btns: btns.map((e) => {
      const w = e.querySelector('[data-nav-word]');
      return { id: e.getAttribute('data-nav'), ...box(e), ta: getComputedStyle(e).touchAction,
        word: w ? (w.textContent || '').trim() : null, cut: w ? w.scrollWidth > w.clientWidth + 1 : false,
        wordPx: w ? parseFloat(getComputedStyle(w).fontSize) : null, on: e.getAttribute('aria-pressed') === 'true',
        border: getComputedStyle(e).borderTopColor };
    }),
  };
});

/* what the card shows */
const card = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-bro-page="Card"] [data-bro-card="v2"]');
  const S = window._gameState && window._gameState.current;
  if (!c) return { there: false };
  const q = (s) => c.querySelector(s);
  const txt = (e) => (e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : null);
  const cr = c.getBoundingClientRect();
  const face = q('.bt-bro2-face img');
  const pts = q('[data-bro-row="points"]');
  const pr = pts && pts.getBoundingClientRect();
  const panel = (k) => { const e = q(`[data-bro-panel="${k}"]`); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width) }; };
  const idText = txt(q('[data-bro-panel="id"]')) || '';
  return {
    there: true,
    cols: Number(c.getAttribute('data-bro-cols')),
    w: Math.round(cr.width), h: Math.round(cr.height),
    panels: { id: panel('id'), stats: panel('stats'), rows: panel('rows') },
    face: face ? { w: face.naturalWidth } : null,
    name: txt(q('[data-bro-name]')), myName: S && S.myName,
    lv: txt(q('[data-bro-level]')),
    xpBar: !!q('[data-bro-panel="id"] progress, [data-bro-panel="id"] [data-xp]') || /\bXP\b/.test(idText),
    title: q('[data-bro-title]') ? { id: q('[data-bro-title]').getAttribute('data-bro-title'), text: txt(q('[data-bro-title]')) } : null,
    clan: q('[data-bro-clan]') ? { tag: q('[data-bro-clan]').getAttribute('data-bro-clan'), text: txt(q('[data-bro-clan]')) } : null,
    ap: q('[data-bro-ap]') ? { n: Number(q('[data-bro-ap]').getAttribute('data-bro-ap')), text: txt(q('[data-bro-ap]')) } : null,
    tiles: { achv: q('[data-bro-tile="achievements"]') ? txt(q('[data-bro-tile="achievements"] b')) : null,
      kills: q('[data-bro-tile="kills"]') ? txt(q('[data-bro-tile="kills"] b')) : null },
    weapon: q('[data-bro-panel="stats"]') ? q('[data-bro-panel="stats"]').getAttribute('data-bro-weapon') : null,
    has: q('[data-bro-panel="stats"]') ? q('[data-bro-panel="stats"]').getAttribute('data-bro-has') : null,
    /* v2.3.4172: the three combat-skill tiles (SkillTiles.jsx) */
    skills: [...c.querySelectorAll('[data-bro-skill]')].map((e) => {
      const r = e.getBoundingClientRect(); const img = e.querySelector('img'); const ir = img ? img.getBoundingClientRect() : null;
      const lv = [...e.querySelectorAll('span')].find((x) => /^Lv \d+$/.test((x.textContent || '').trim()));
      const lr = lv ? lv.getBoundingClientRect() : null;
      const num = e.querySelector('[data-skill-xpnum]');
      return { k: e.getAttribute('data-bro-skill'), on: e.getAttribute('aria-pressed') === 'true', lvl: Number(e.getAttribute('data-lvl')),
        lv: lv ? lv.textContent.trim() : null, lvAbove: !!lr && !!ir && lr.bottom <= ir.top + 1,
        src: img ? img.getAttribute('src') : null, iw: ir ? Math.round(ir.width) : 0,
        xpOpen: e.hasAttribute('data-bro-xpopen'), xpData: e.getAttribute('data-bro-xpnum'), xpText: num ? (num.textContent || '').replace(/\s+/g, ' ').trim() : null,
        w: Math.round(r.width), h: Math.round(r.height), ta: getComputedStyle(e).touchAction, border: getComputedStyle(e).borderTopColor };
    }),
    xpKey: window.__btBroCard ? window.__btBroCard.xp : undefined,
    stats: [...c.querySelectorAll('[data-bro-stat]')].map((e) => ({ k: e.getAttribute('data-bro-stat'), label: txt(e.querySelector('.bt-bro2-statl')), v: e.getAttribute('data-v') })),
    rows: [...c.querySelectorAll('[data-bro-row]')].map((e) => e.getAttribute('data-bro-row')),
    caps: !!(S && S._serverCaps && S._serverCaps.achievements),
    active: S && S.rpg ? S.rpg.activeSlot : null,
    pts: pts ? { n: Number(pts.getAttribute('data-bro-row-n')), live: pts.classList.contains('is-live'), sub: txt(pts.querySelector('.bt-bro2-rowt span')),
      sec: pts.getAttribute('data-section'),
      glow: pts.querySelector('[data-pts-glow="tab"]') ? getComputedStyle(pts.querySelector('[data-pts-glow="tab"]')).animationName : null,
      top: Math.round(pr.top), bottom: Math.round(pr.bottom), vh: innerHeight, ctop: Math.round(cr.top), cbottom: Math.round(cr.bottom),
      hit: (() => { const t = document.elementFromPoint(pr.left + pr.width / 2, pr.top + pr.height / 2); return !!t && (t === pts || pts.contains(t)); })() } : null,
    cut: (() => {
      const out = [];
      for (const el of c.querySelectorAll('*')) {
        if (el.children.length || !(el.textContent || '').trim() || el.clientWidth <= 0) continue;
        if (el.scrollWidth > el.clientWidth + 1) out.push((el.textContent || '').trim().slice(0, 24));
      }
      return out;
    })(),
    past: [...c.querySelectorAll('*')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 4 && (r.right > cr.right + 2 || r.left < cr.left - 2); }).length,
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
  };
});

const ORDER = ['damage', 'dps', 'aspd', 'range', 'crit', 'critDmg', 'special', 'elem', 'def', 'armor', 'dodge', 'eres', 'move'];
/* v2.3.4381: six -- the Leaderboards' button ("Ranks") between Quests and the Codex */
const FIVE = ['dashboard', 'hero', 'quests', 'leaderboard', 'encyclopedia', 'more'];
const WORDS = { dashboard: 'Gear', hero: 'Bro', quests: 'Quests', leaderboard: 'Ranks', encyclopedia: 'Codex', more: 'More' };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Cardbro', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2, world: 'wheel' });
  const errs = [];
  let stopP = () => {};
  P.page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  try {
    await H.enterWorld(P);
    /* v2.3.4172: a real keystroke every 20 s -- two quiet minutes log the
       page out (wsClient idleLogout), and most of this walk is evaluate */
    stopP = H.keepAlive(P);
    await P.page.waitForTimeout(2500);
    await H.closeNpcDialogue(P).catch(() => {});
    const zone = await H.readState(P, (S) => S.currentZone);
    rec.ok(`in the world (zone ${zone}) (guard)`, zone === 'wheel', { zone });

    /* ── 1. the row ── */
    const r1 = await row(P);
    rec.ok(`the row: CLOSE at its left ("${r1.close && r1.close.text}"), then the five`,
      !!r1.close && r1.close.text === 'CLOSE' && r1.btns.length === 6 && r1.btns.map((b) => b.id).join() === FIVE.join() && r1.close.r <= r1.btns[0].l, r1);
    rec.ok(`...each with its word, none cut, at 11 px or more (mode ${r1.words}: ${r1.btns.map((b) => b.word).join(' ')})`,
      r1.words !== 'icon' && r1.btns.every((b) => b.word === WORDS[b.id] && !b.cut && b.wordPx >= 11), r1.btns);
    rec.ok(`...every button at least 44 x 44 (${r1.btns.map((b) => b.w + 'x' + b.h).join(' ')}; CLOSE ${r1.close && r1.close.w}x${r1.close && r1.close.h}), touch-action: manipulation`,
      !!r1.close && r1.btns.every((b) => b.w >= 44 && b.h >= 44 && b.ta === 'manipulation') && r1.close.w >= 44 && r1.close.h >= 44 && r1.close.ta === 'manipulation', r1);
    rec.ok('...and the grip still on the band\'s edge ([data-dash-fold])', r1.grip === 'open', r1.grip);

    /* ── 2. the card ── */
    await touch(P, '[data-nav="hero"]');
    await P.page.waitForTimeout(1500);
    const b1 = await bus(P);
    rec.ok('the Bro button opens Bro', !!b1 && b1.mode === 'expanded' && b1.stack[0] === 'hero', b1);
    const r2 = await row(P);
    const bro = r2.btns.find((b) => b.id === 'hero');
    rec.ok('...the open one lit (a gold border)', !!bro && bro.on && /216, 170, 88|226, 184, 102/.test(bro.border), bro);
    const c1 = await card(P);
    rec.ok(`the card: ${c1.cols} columns at ${c1.w} px (you | the doors, the stats under them)`,
      c1.there && c1.cols === 2 && !!c1.panels.id && !!c1.panels.rows && !!c1.panels.stats
      && c1.panels.rows.l > c1.panels.id.l && c1.panels.stats.t > c1.panels.id.t, c1.panels);
    rec.ok('...your portrait (a picture that loaded), your name, "Lv N", and NO XP bar',
      !!c1.face && c1.face.w > 0 && c1.name === c1.myName && /^Lv \d+$/.test(c1.lv || '') && !c1.xpBar, { face: c1.face, name: c1.name, my: c1.myName, lv: c1.lv, xp: c1.xpBar });
    rec.ok(`...the title ("${c1.title && c1.title.text}"), the clan ("${c1.clan && c1.clan.text}") and the AP ("${c1.ap && c1.ap.text}")`,
      !!c1.title && c1.title.id === 'none' && c1.title.text === 'No title' && !!c1.clan && c1.clan.tag === 'none' && /^No (clan|party)$/.test(c1.clan.text)
      && !!c1.ap && /^★ ?\d[\d.,KM]* AP$/.test(c1.ap.text), { title: c1.title, clan: c1.clan, ap: c1.ap });
    rec.ok(`...the two tiles: Achievements "${c1.tiles.achv}", Lifetime Kills "${c1.tiles.kills}"`,
      (c1.caps ? /^\d+ \/ \d+$/.test(c1.tiles.achv || '') : c1.tiles.achv === '–') && /^\d/.test(c1.tiles.kills || ''), c1.tiles);
    const wantRows = (c1.caps ? ['achievements'] : []).concat(['skills', 'points', 'equipment', 'homestead', 'pet'], c1.caps ? ['titles'] : [], ['clan']);
    rec.ok(`...the doors: ${c1.rows.join(', ')}`, c1.rows.join() === wantRows.join(), { rows: c1.rows, want: wantRows });
    rec.ok('...nothing cut, nothing past the card\'s edge', c1.cut.length === 0 && c1.past === 0, { cut: c1.cut, past: c1.past });

    /* ── 3. the stats ── */
    const startCat = { melee: 'sword', ranged: 'bow', staff: 'staff' }[c1.active] || 'sword';
    rec.ok(`the stats start on the weapon out (${c1.weapon}; activeSlot ${c1.active}), its tile of Melee | Bow | Magic picked`,
      c1.weapon === startCat && c1.skills.map((w) => w.k).join('|') === 'sword|bow|staff' && c1.skills.filter((w) => w.on).map((w) => w.k).join() === startCat, c1.skills);
    rec.ok(`...each tile the Gear tab's big picture with "Lv N" ABOVE it (${c1.skills.map((w) => `${w.lv} ${w.iw}px`).join(', ')}), none showing XP yet`,
      c1.skills.length === 3 && c1.skills.every((w) => /\/icons\/ui\/hero\/(melee|bow|magic)\.webp/.test(w.src || '') && w.iw >= 36 && w.lvAbove && w.lv === `Lv ${w.lvl}` && !w.xpOpen), c1.skills);
    rec.ok(`...each at least 44 x 44 (${c1.skills.map((w) => w.w + 'x' + w.h).join(' ')}), touch-action: manipulation; the picked one gold-edged`,
      c1.skills.every((w) => w.w >= 44 && w.h >= 44 && w.ta === 'manipulation')
      && c1.skills.every((w) => /226, 184, 102/.test(w.border) === w.on), c1.skills.map((w) => ({ k: w.k, w: w.w, h: w.h, ta: w.ta, border: w.border })));
    rec.ok(`...thirteen rows in the drawing's order (${c1.stats.map((s) => s.label + ' ' + s.v).join(', ')})`,
      c1.stats.map((s) => s.k).join() === ORDER.join() && c1.stats.every((s) => s.v && !/NaN|undefined/.test(s.v)), c1.stats);

    /* a bow to look at: the dev kit's weapons (a quest's road), then Bow */
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'kit', myId, { what: 'weapons' }).catch(() => null);
    await P.page.waitForTimeout(1500);
    const eq1 = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
    await P.page.waitForTimeout(1200);
    const eq2 = await H.equipWeapon(P, 'bow', 'rangedWeapon', 'melee');
    await P.page.waitForTimeout(1500);
    const cs = await card(P);
    rec.ok(`with a sword worn, the Sword column reads it (${cs.stats.slice(0, 4).map((s) => s.label + ' ' + s.v).join(', ')}) (equip: ${eq1 && eq1.ok}, ${eq2 && eq2.ok})`,
      cs.weapon === 'sword' && cs.has === '1' && cs.stats.slice(0, 4).every((s) => s.v !== '\u2014'), { eq1, eq2, stats: cs.stats });
    await touch(P, '[data-bro-skill="bow"]');
    await P.page.waitForTimeout(700);
    const c2 = await card(P);
    const diff = c2.stats.filter((s, i) => cs.stats[i] && s.v !== cs.stats[i].v).map((s) => s.k);
    rec.ok(`a tap on Bow's tile shows the bow's stats (a bow worn: ${c2.has === '1'}; changed: ${diff.join(', ')}), Bow's tile the gold one`,
      c2.weapon === 'bow' && c2.skills.filter((w) => w.on).map((w) => w.k).join() === 'bow' && c2.has === '1' && diff.length > 0
      && /226, 184, 102/.test((c2.skills.find((w) => w.k === 'bow') || {}).border || ''), { weapon: c2.weapon, has: c2.has, stats: c2.stats, skills: c2.skills });
    /* the XP the game holds for the bow, as the top bar reads it */
    const bowXp = await H.readState(P, (S) => { const sk = S.rpg && S.rpg.prog3 && S.rpg.prog3.sk && S.rpg.prog3.sk.bow; return sk ? Math.floor(sk.xp || 0) : null; });
    const bw = c2.skills.find((w) => w.k === 'bow') || {};
    const [xpP, xpT] = String(bw.xpData || '').split('/').map(Number);
    rec.ok(`...and the tile turns into its XP bar: "${bw.xpText}" (the bow's XP ${bowXp}), the others their pictures`,
      bw.xpOpen && c2.xpKey === 'bow' && /^[\d,.K]+ \/ [\d,.K]+ XP$/.test(bw.xpText || '') && xpT > 0 && (bowXp == null || xpP === Math.min(bowXp, xpT))
      && bw.xpText === `${xpP.toLocaleString('en-US')} / ${xpT.toLocaleString('en-US')} XP`
      && c2.skills.filter((w) => w.k !== 'bow').every((w) => !w.xpOpen && w.iw > 0), { bow: bw, bowXp, xpKey: c2.xpKey });
    await P.page.waitForTimeout(4200);
    const c2b = await card(P);
    const bw2 = c2b.skills.find((w) => w.k === 'bow') || {};
    rec.ok(`...about 4 s later its picture again ("${bw2.lv}" over it), still picked`,
      !bw2.xpOpen && bw2.iw >= 36 && bw2.lvAbove && bw2.on && c2b.weapon === 'bow' && !c2b.xpKey, { bow: bw2, xpKey: c2b.xpKey });

    /* ── 4. points to spend ── */
    const kit = await H.devOp(wsPort, 'kit', myId, { what: 'levels' });
    rec.ok('the worker levelled the bro up through its own XP path (guard)', !!(kit && kit.ok !== false), kit);
    let c3 = null;
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(300);
      c3 = await card(P);
      if (c3.pts && c3.pts.n > 0) break;
    }
    const pool = await H.readState(P, (S) => { const p = S.rpg && S.rpg.prog3; return p ? (p.pool || 0) + (p.shared || 0) : null; });
    rec.ok(`the Points row reads the points waiting ("${c3.pts && c3.pts.sub}", ${pool}) and glows`,
      !!c3.pts && c3.pts.n > 0 && c3.pts.n === pool && c3.pts.live && c3.pts.glow === 'bt-pts-glow' && /to spend$/.test(c3.pts.sub || '') && c3.pts.sec === 'Build', { pts: c3.pts, pool });
    await P.page.evaluate(() => { const c = document.querySelector('[data-bro-card="v2"]'); if (c) c.scrollTop = 0; });
    await P.page.waitForTimeout(300);
    const c3b = await card(P);
    rec.ok('...on screen without a scroll, inside the page, and a finger there reaches it',
      !!c3b.pts && c3b.pts.top >= c3b.pts.ctop && c3b.pts.bottom <= c3b.pts.cbottom && c3b.pts.hit, c3b.pts);
    await P.page.waitForTimeout(4500);   /* the level-up medallion fades */
    await P.page.evaluate(() => { const c = document.querySelector('[data-bro-card="v2"]'); if (c) c.scrollTop = 0; });
    await shot(P, 'bro-tab-v2');
    /* the Bow's stats, scrolled to (the picture of the selector working) */
    await P.page.evaluate(() => {
      const c = document.querySelector('[data-bro-card="v2"]');
      const s = c && c.querySelector('[data-bro-panel="stats"]');
      if (c && s) c.scrollTop += s.getBoundingClientRect().top - c.getBoundingClientRect().top - 4;
    });
    await P.page.waitForTimeout(400);
    await shot(P, 'bro-tab-v2-bow');
    await P.page.evaluate(() => { const c = document.querySelector('[data-bro-card="v2"]'); if (c) c.scrollTop = 0; });

    /* ── 5. the doors ── */
    await touch(P, '[data-bro-row="points"]');
    await P.page.waitForTimeout(1200);
    const w1 = await popup(P);
    rec.ok('Points opens the Points window over the card (its title, a close)', !!w1 && w1.id === 'Build' && !w1.card && /^Points/.test(w1.head || '') && w1.close, w1);
    await touch(P, '[data-bro-popup-close]');
    await P.page.waitForTimeout(900);
    const c4 = await card(P);
    rec.ok('...its close comes back to the card, the Bow still picked', c4.there && !(await popup(P)) && c4.weapon === 'bow', { there: c4.there, weapon: c4.weapon });

    /* v2.3.4172: since the Gear tab (v2.3.4151) the Equipment door opens
       Gear -- the band at rest, unfolded, its three panels */
    await touch(P, '[data-bro-row="equipment"]');
    await P.page.waitForTimeout(1500);
    const g1 = { bus: await bus(P), gear: await P.page.evaluate(() => { const g = document.querySelector('[data-gear-pane="inv"]'); return !!g && g.getBoundingClientRect().height > 0; }), popup: await popup(P) };
    rec.ok('Equipment opens the Gear tab (the band at rest, unfolded: your bag, your bro and your gear)',
      g1.bus.mode === 'bar' && g1.gear && !g1.popup, g1);
    await touch(P, '[data-nav="hero"]');
    await P.page.waitForTimeout(1200);
    rec.ok('...and the Bro button brings the card back', (await card(P)).there);

    const pages = [['skills', 'hero/skills', 'Life Skills'], ['pet', 'hero/pets', 'Pet'], ['clan', 'hero/clan', 'Clan']];
    if (c1.caps) pages.unshift(['achievements', 'hero/achievements', 'Achievements'], ['titles', 'hero/achievements', 'Titles']);
    for (const [id, stack, name] of pages) {
      await touch(P, `[data-bro-row="${id}"]`);
      await P.page.waitForTimeout(1100);
      const b = await bus(P);
      rec.ok(`${name} opens its page under Bro (${b && b.stack.join('/')})`, !!b && b.stack.join('/') === stack, b);
      await backToCard(P);
      rec.ok('...and back comes to the card', (await card(P)).there && (await bus(P)).stack.join('/') === 'hero');
    }
    await touch(P, '[data-bro-row="homestead"]');
    await P.page.waitForTimeout(700);
    const farm = await P.page.evaluate(() => { const c = window.__btInfoPopup && window.__btInfoPopup.current(); return c ? { title: c.title, body: c.body } : null; });
    rec.ok('Homestead (no farm window away from the farm) says where the farm is', !!farm && farm.title === 'Homestead' && /Feed & Seed/.test(farm.body), farm);
    await P.page.evaluate(() => window.__btInfoPopup && window.__btInfoPopup.close());
    await P.page.waitForTimeout(400);
    for (const [sel, stack, name] of [['[data-bro-clan]', 'hero/clan', 'the clan line'], ['[data-bro-ap]', 'hero/achievements', 'the AP'], ['[data-bro-title]', 'hero/achievements', 'the title']]) {
      if (!c1.caps && stack === 'hero/achievements') continue;
      await touch(P, sel);
      await P.page.waitForTimeout(1000);
      const b = await bus(P);
      rec.ok(`the left panel: ${name} opens ${stack}`, !!b && b.stack.join('/') === stack, b);
      await backToCard(P);
    }
    /* the old road: the top bar's medal asked More, then Achievements */
    await P.page.evaluate(() => { window.__broDashPanelBus.open('more'); window.__broDashPanelBus.push('achievements'); });
    await P.page.waitForTimeout(500);
    const b7 = await bus(P);
    rec.ok('an old road (open More, push Achievements) lands under Bro', !!b7 && b7.stack.join('/') === 'hero/achievements', b7);
    await P.page.evaluate(() => window.__broDashPanelBus.open('hero'));
    await P.page.waitForTimeout(900);

    /* ── 6. CLOSE ── */
    await touch(P, '[data-dash-close]');
    await P.page.waitForTimeout(900);
    const f1 = { bus: await bus(P), row: await row(P) };
    rec.ok(`CLOSE closes the page and folds the band, and reads ${f1.row.close && f1.row.close.text}`,
      f1.bus.mode === 'bar' && !!f1.row.close && f1.row.close.text === 'OPEN' && f1.row.close.state === 'min' && f1.row.grip === 'min', f1);
    await touch(P, '[data-dash-close]');
    await P.page.waitForTimeout(900);
    const f2 = await row(P);
    rec.ok('...OPEN unfolds it, and reads CLOSE again', !!f2.close && f2.close.text === 'CLOSE' && f2.grip === 'open', f2.close);

    /* ── 7. other screens ── */
    await P.page.setViewportSize({ width: 320, height: 640 });
    await P.page.waitForTimeout(1500);
    const r320 = await row(P);
    rec.ok(`a 320 x 640 phone: the pictures alone (${r320.words}), each button ${r320.btns.map((b) => b.w + 'x' + b.h).join(' ')}, CLOSE ${r320.close && r320.close.w}`,
      /* 40 tall on a screen 720 or shorter: identityRowHeight's own rule
         (sheetGeometry, "HEIGHT IS NOT 44 EVERYWHERE"), not this change's */
      /* v2.3.4381: six buttons are 38 px wide here -- the one screen where
         six cannot be 44 (sheetGeometry RAIL_COUNT's note); no iPhone since
         2016 is 320 wide */
      r320.words === 'icon' && r320.btns.length === 6 && r320.btns.every((b) => b.h >= 40 && b.w >= 38 && b.r <= r320.vw) && !!r320.close && r320.close.h >= 40 && r320.close.r <= r320.btns[0].l, r320);

    await P.page.setViewportSize({ width: 820, height: 1180 });
    await P.page.waitForTimeout(1500);
    await P.page.evaluate(() => { window.__btHeroSection.request('Card'); window.__broDashPanelBus.open('hero'); });
    await P.page.waitForTimeout(1500);
    const tab = await card(P);
    rec.ok(`a tablet upright: the three panels side by side, as drawn (${tab.cols} columns at ${tab.w} px)`,
      tab.there && tab.cols === 3 && tab.panels.id.l < tab.panels.stats.l && tab.panels.stats.l < tab.panels.rows.l
      && Math.abs(tab.panels.id.t - tab.panels.rows.t) < 4 && tab.cut.length === 0 && tab.past === 0, tab);
    const rTab = await row(P);
    rec.ok(`...the row's words beside their pictures (${rTab.words})`, rTab.words === 'beside' && rTab.btns.every((b) => !b.cut), rTab.btns);
    await shot(P, 'bro-tab-v2-tablet');

    await P.page.setViewportSize({ width: 844, height: 390 });
    await P.page.waitForTimeout(1500);
    await P.page.evaluate(() => { window.__btHeroSection.request('Card'); window.__broDashPanelBus.open('hero'); });
    await P.page.waitForTimeout(1500);
    /* v2.3.4172: the one band is the default (#1410): on its side the band
       stays at the bottom, the card laid out from its width; the old side
       column (?oneband=0) is one column at ~220 px, its chip CLOSE / OPEN */
    const side = await card(P);
    const rSide = await row(P);
    rec.ok(`a phone on its side: the card in the band (${side.w} px, ${side.cols} columns from its width), no word cut, nothing past its edge`,
      side.there && side.cols === (side.w >= 600 ? 3 : side.w >= 340 ? 2 : 1) && side.cut.length === 0 && side.past === 0, { cols: side.cols, w: side.w, cut: side.cut, past: side.past });
    rec.ok(`...and CLOSE first in its row ("${rSide.close && rSide.close.text}")`, !!rSide.close && rSide.close.text === 'CLOSE' && rSide.btns.length === 6 && rSide.close.r <= rSide.btns[0].l, rSide);
  } finally {
    rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
    stopP();
    await P.page.context().close().catch(() => {});
  }

  /* ── 8. a computer playing wide ── */
  let stopD = () => {};
  const D = await H.newPlayer(browser, { name: 'Deskcard', wsPort, webPort, viewport: { width: 1440, height: 900 }, world: 'wheel', wide: true });
  try {
    await H.enterWorld(D);
    stopD = H.keepAlive(D);
    await D.page.waitForTimeout(2500);
    await H.closeNpcDialogue(D).catch(() => {});
    await D.page.mouse.click(720, 300).catch(() => {});
    await D.page.keyboard.press('p');
    await D.page.waitForTimeout(1500);
    const d1 = await card(D);
    rec.ok(`a computer: P opens Bro, the card in the column (${d1.cols} columns at ${d1.w} px), nothing cut`,
      d1.there && d1.cols >= 2 && d1.cut.length === 0 && d1.past === 0, { cols: d1.cols, w: d1.w, cut: d1.cut });
    const rd = await row(D);
    /* v2.3.4172: CLOSE in the row (the one band), or the old column's chip */
    const chipD = (rd.close && rd.close.text) || await D.page.evaluate(() => { const c = document.querySelector('[data-land-fold]'); return c ? (c.textContent || '').trim() : null; });
    rec.ok(`...the row: CLOSE (${chipD}), the five with their words (${rd.words}: ${rd.btns.map((b) => b.word).join(' ')})`,
      chipD === 'CLOSE' && rd.words !== 'icon' && rd.btns.length === 6 && rd.btns.every((b) => b.word === WORDS[b.id] && !b.cut), rd.btns);
    const myId = await H.readState(D, (S) => S.myId);
    await H.devOp(wsPort, 'kit', myId, { what: 'levels' }).catch(() => null);
    await D.page.waitForTimeout(6000);
    await shot(D, 'bro-tab-v2-desk');
    await D.page.click('[data-bro-row="points"]').catch(() => {});
    await D.page.waitForTimeout(1000);
    const d2 = await popup(D);
    rec.ok('...a click on Points opens the Points window', !!d2 && d2.id === 'Build', d2);
    await D.page.keyboard.press('Escape');
    await D.page.waitForTimeout(800);
    rec.ok('...and Esc closes it, back to the card', !(await popup(D)) && (await card(D)).there);
    /* v2.3.4172: a mouse on the skill tiles: a click picks the weapon and
       shows its XP; a second click puts the picture back */
    await D.page.click('[data-bro-skill="staff"]').catch(() => {});
    await D.page.waitForTimeout(600);
    const dm = await card(D);
    const st = dm.skills.find((w) => w.k === 'staff') || {};
    rec.ok(`...a click on Magic's tile picks the staff's stats and shows its XP ("${st.xpText}")`,
      dm.weapon === 'staff' && st.on && st.xpOpen && /XP$|^Fully levelled$/.test(st.xpText || ''), { weapon: dm.weapon, staff: st });
    /* the second click: straight at the tile's centre (page.click waits for
       the element to hold still, and on this box that wait can outlast the
       4 s, the tile closing by itself first: TRAPS §200).  The tile's state
       AT the click is read in the capture phase, before React's handler: an
       open tile closes, a closed one (it timed out first) opens again */
    const tb = await D.page.evaluate(() => {
      const e = document.querySelector('[data-bro-skill="staff"]');
      if (!e) return null;
      window.__qaSkillAtClick = null;
      e.addEventListener('click', () => { window.__qaSkillAtClick = e.hasAttribute('data-bro-xpopen') ? 'open' : 'shut'; }, { capture: true, once: true });
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (tb) await D.page.mouse.click(tb.x, tb.y).catch(() => {});
    await D.page.waitForTimeout(600);
    const atClick = await D.page.evaluate(() => window.__qaSkillAtClick);
    const dm2 = await card(D);
    const st2 = dm2.skills.find((w) => w.k === 'staff') || {};
    rec.ok(`...and a second click (on the tile ${atClick}) ${atClick === 'shut' ? 'opens it again (it had timed out first)' : 'puts its picture back'}, the staff still picked`,
      (atClick === 'open' ? (!st2.xpOpen && st2.iw > 0) : (atClick === 'shut' && st2.xpOpen)) && st2.on && dm2.weapon === 'staff', { atClick, staff: st2 });
    await D.page.keyboard.press('l');
    await D.page.waitForTimeout(900);
    const l1 = await bus(D);
    rec.ok('L opens Life Skills under Bro', !!l1 && l1.mode === 'expanded' && l1.stack.join('/') === 'hero/skills', l1);
    await D.page.keyboard.press('l');
    await D.page.waitForTimeout(900);
    const l2 = await bus(D);
    rec.ok('...and L again closes it', !!l2 && l2.mode === 'bar', l2);
  } finally {
    stopD();
    await D.page.context().close().catch(() => {});
  }
}
