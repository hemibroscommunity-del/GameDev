/* ═══ v2.3.6695: FEATS, ON A PHONE AND A COMPUTER (card UI2-feats, the build's step 6) ═══
 * The owner, 2026-11-25: "Feats is the approved replacement for
 * Accomplishments."  2026-11-26: "Titles could live within Feats."  A real
 * worker and Chromium, in the world (BroTown, never the retired map):
 *   0. a first kill earns First Blood for real (+10 AP, the worker's);
 *   1. Feats at 390 x 844, 375 x 667, 430 x 932 upright and 844 x 390,
 *      667 x 375 sideways, and on a computer: AP over four doors (two by two
 *      upright, one row sideways), nothing clipped, every tap 44 px or more,
 *      no scroll, no text under 11 px, inside the band;
 *   2. AP is the worker's total;
 *   3. with only First Blood, AP's tree: each layer's rows add to its
 *      headline, down to the medal, whose leaf opens its page; then Gladiator
 *      and Blooded lit by the owner's lever (they pay nothing): "Where these
 *      came from is not known", and no tree;
 *   4. the acceptance task: the highest tier you hold (Arena: Gladiator), an
 *      unearned medal's requirement, how a title was earned, Equip a title,
 *      a lifetime record (no Duels Won, no Deepest Zone under the frame);
 *   5. Quest History lists the quests handed in as the Quests pages'
 *      Completed list draws them (after /dev/quests, which pays nothing);
 *   6. Back walks every layer home;
 *   7. `?ui2=0`: today's Achievements page, no Feats.
 * Pictures for the owner: docs/shots/ui2-feats-*.png (deviceScaleFactor 2).
 *   node tools/qa/mp/run.mjs ui2feats */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');
const LANDS = ['frost', 'ember', 'sky', 'verdant', 'hollows', 'thunder', 'tidal', 'mist'];
const DOORS = ['achievements', 'titles', 'quests', 'records'];
const ROOTS = '[data-feats-page], [data-feats-tiers], [data-feats-tier-page], [data-feats-medal], [data-ap-tree], [data-feats-quests], [data-titles-page], [data-journey-page]';

/* the page in the band, as drawn: its root, its taps, what is clipped, scroll, the smallest text */
function look(ROOTS) {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const root = document.querySelector(ROOTS);
  const t = document.querySelector('[data-dash-title]');
  const back = document.querySelector('[data-dash-frame] [data-dash-ctl="back"]');
  if (!root) return { title: t ? t.getAttribute('data-dash-title') : null, root: null };
  const out = (r) => !!B && (r.left < B.left - 0.5 || r.right > B.right + 0.5 || r.top < B.top - 0.5 || r.bottom > B.bottom + 0.5);
  const taps = Array.from(root.querySelectorAll('button')).map((e) => {
    const r = e.getBoundingClientRect();
    return { k: e.getAttribute('data-feats-door') || e.getAttribute('data-feats-tier') || e.getAttribute('data-feats-medal-cell') || e.getAttribute('data-ap-tree-row') || e.getAttribute('data-medal-fact') || e.getAttribute('data-title-row') || e.getAttribute('data-u2-action') || e.className, w: Math.round(r.width), h: Math.round(r.height), out: out(r) };
  });
  const clipped = [];
  for (const e of root.querySelectorAll('.u2-tile-label, .u2-tile-sub, .u2-fact-k, .u2-fact-v, .u2-stat-v, .u2-stat-k, .u2-st-rk, .u2-st-rv, .u2-medal-name, .u2-feats-note, .u2-fam-name, .u2-fam-state')) {
    if (e.closest('.u2-feats-gallery')) continue;   /* the gallery's names are for a screen reader */
    if (e.scrollWidth > e.clientWidth + 1) clipped.push((e.className || '') + ':' + e.textContent.trim().slice(0, 30));
  }
  let scroll = false;
  for (const e of [root, ...root.querySelectorAll('*')]) {
    const cs = getComputedStyle(e);
    if ((cs.overflowY !== 'visible' && cs.overflowY !== 'hidden' && e.scrollHeight > e.clientHeight + 1) || (cs.overflowX !== 'visible' && cs.overflowX !== 'hidden' && e.scrollWidth > e.clientWidth + 1)) { scroll = true; break; }
  }
  let minFont = 99;
  for (const e of root.querySelectorAll('*')) {
    if (!Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (e.closest('.u2-feats-gallery .u2-tile-words')) continue;
    minFont = Math.min(minFont, parseFloat(getComputedStyle(e).fontSize) || 99);
  }
  const rr = root.getBoundingClientRect();
  const ap = root.querySelector('[data-feats-ap]');
  return {
    title: t ? t.getAttribute('data-dash-title') : null, back: back ? back.textContent.trim() : null,
    root: Object.keys(root.dataset).join(','), short: root.classList.contains('is-short'),
    taps, clipped, scroll, minFont, out: out(rr),
    ap: ap ? ap.getAttribute('data-feats-ap') : null, apKnown: ap ? ap.getAttribute('data-feats-ap-known') : null, apDoor: ap ? ap.tagName === 'BUTTON' : null,
    unknown: !!root.querySelector('[data-feats-ap-unknown]'),
    doors: Array.from(root.querySelectorAll('[data-feats-door]')).map((e) => { const r = e.getBoundingClientRect(); return { id: e.getAttribute('data-feats-door'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), sub: ((e.querySelector('.u2-tile-sub') || {}).textContent || '').trim(), raised: e.classList.contains('u2-raised') }; }),
    apBox: ap ? (() => { const r = ap.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })() : null,
    tree: window.__btApTree || null,
    tiers: Array.from(root.querySelectorAll('[data-feats-tier]')).map((e) => ({ id: e.getAttribute('data-feats-tier'), n: e.getAttribute('data-feats-tier-n'), pts: e.getAttribute('data-feats-tier-pts'), muted: e.getAttribute('data-feats-tier-muted'), word: ((e.querySelector('.u2-tile-label') || {}).textContent || '').trim(), sub: ((e.querySelector('.u2-tile-sub') || {}).textContent || '').trim() })),
    cells: Array.from(root.querySelectorAll('[data-feats-medal-cell]')).map((e) => ({ id: e.getAttribute('data-feats-medal-cell'), got: e.getAttribute('data-feats-got'), off: e.classList.contains('is-off'), lock: e.classList.contains('is-locked'), aria: e.getAttribute('aria-label') })),
    medal: root.hasAttribute('data-feats-medal') ? { id: root.getAttribute('data-feats-medal'), got: root.getAttribute('data-feats-medal-got'),
      facts: Object.fromEntries(Array.from(root.querySelectorAll('[data-medal-fact]')).map((e) => [e.getAttribute('data-medal-fact'), ((e.querySelector('.u2-fact-v') || {}).textContent || '').trim()])),
      lock: !!root.querySelector('[data-medal-lock]'), titleDoor: !!root.querySelector('button[data-medal-fact="title"]') } : null,
    quests: root.hasAttribute('data-feats-quests') ? { n: root.getAttribute('data-feats-quests'), rows: root.querySelectorAll('[data-quest-done-row]').length, ap: (root.querySelector('[data-journal-ap]') || { getAttribute: () => null }).getAttribute('data-journal-ap'), plus: Array.from(root.querySelectorAll('[data-quest-done-ap]')).map((e) => e.getAttribute('data-quest-done-ap')) } : null,
    cards: Array.from(root.querySelectorAll('[data-journey-card]')).map((e) => e.getAttribute('data-journey-card')),
    how: ((root.querySelector('[data-titles-how]') || {}).textContent || '').trim(),
    worn: (root.querySelector('[data-titles-worn]') || { getAttribute: () => null }).getAttribute('data-titles-worn'),
    fam: Array.from(root.querySelectorAll('[data-title-family] [data-fam-state]')).map((e) => (e.getAttribute('data-title-row') || e.getAttribute('data-fam-cell')) + ':' + e.getAttribute('data-fam-state')),
    stack: (() => { const b = window.__broDashPanelBus; const n = b && b.nav ? b.nav() : null; const s = n && n[n.ws]; return Array.isArray(s) ? s.map((e) => e.id) : null; })(),
  };
}
const read = (P) => P.page.evaluate(look, ROOTS);
const tap = async (P, sel, ms = 700) => { await P.page.locator(sel).first().tap({ timeout: 15000 }); await P.page.waitForTimeout(ms); };
const back = async (P, ms = 700) => { await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', ms); };
async function waitRoot(P, sel, ms = 15000) { return P.page.waitForSelector(sel, { timeout: ms }).then(() => true).catch(() => false); }
async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: Math.min(innerHeight, b.bottom) - b.top }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    return file;
  } catch (e) { return null; }
}
async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world (guard)`, !!w, w);
  await P.page.waitForTimeout(1500);
  return !!w;
}
/* the test kit's kill of the first live monster it finds at a land's town end (mp-achievements' realKill) */
async function realKill(wsPort, me) {
  for (const land of LANDS) {
    for (let k = 0; k < 3; k++) {
      const j = await H.devOp(wsPort, 'trapping', me, { kill: 'wm-' + land + '-' + k }).catch((e) => ({ ok: false, error: String(e) }));
      if (j && j.ok && j.killed) return j;
    }
  }
  return null;
}
/* every tap 44 x 44 or more inside the band, nothing clipped, no scroll, no text under 11 px */
/* the Titles page's list scrolls as it always has when the titles are many (CharacterPage.jsx's own) */
const listOk = (L) => !!L.root && !L.out && L.taps.every((x) => x.w >= 44 && x.h >= 44 && !x.out) && !L.clipped.length && L.minFont >= 11;
const roomOk = (L) => !!L.root && !L.out && L.taps.every((x) => x.w >= 44 && x.h >= 44 && !x.out) && !L.clipped.length && !L.scroll && L.minFont >= 11;
const brief = (L) => (!L.root ? { title: L.title, root: null } : { title: L.title, root: L.root, short: L.short, taps: L.taps.filter((x) => x.w < 44 || x.h < 44 || x.out).map((x) => `${x.k}:${x.w}x${x.h}${x.out ? ' out' : ''}`), clipped: L.clipped, scroll: L.scroll, minFont: L.minFont, out: L.out, doors: L.doors.map((d) => `${d.id}@${d.x},${d.y} ${d.w}x${d.h}`), ap: L.apBox });
/* the landing's shape: AP over the four (two by two) upright, one row with AP first sideways */
function shapeOk(L, side) {
  if (L.doors.map((d) => d.id).join(',') !== DOORS.join(',') || !L.apBox || !L.doors.every((d) => d.raised)) return false;
  const ys = new Set(L.doors.map((d) => d.y)), xs = new Set(L.doors.map((d) => d.x));
  if (side) return ys.size === 1 && L.doors.every((d) => d.x >= L.apBox.x + L.apBox.w - 1);
  return ys.size === 2 && xs.size === 2 && L.doors.every((d) => d.y >= L.apBox.y + L.apBox.h - 1);
}

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Featbro', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    if (!(await inWorld(P, rec, 'phone'))) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    /* 0. First Blood, earned for real */
    const kill = await realKill(wsPort, myId);
    const s0 = await H.waitFor(P, (S) => ({ got: S._achv && S._achv.got ? Object.keys(S._achv.got) : [], ap: S._achv ? S._achv.ap : null }), (v) => v.got.indexOf('first_blood') >= 0 && v.ap === 10, { timeout: 30000, label: 'First Blood' }).catch(() => null);
    rec.ok('0. a first kill earns First Blood for real: +10 AP, the worker\'s', !!kill && !!s0, { kill: kill && kill.killed, s0 });
    await P.page.waitForTimeout(800);

    /* 1, 2. Feats at 390 x 844 */
    await H.dashOpen(P, 'achievements');
    await waitRoot(P, '[data-feats-page="self"] [data-feats-ap="10"]');
    let L = await read(P);
    await bandShot(P, 'ui2-feats-landing-390.png');
    rec.ok('1a. 390 x 844: Feats (header "achievements"), AP over the four doors two by two, every tap 44 px or more, nothing clipped, no scroll, no text under 11 px',
      L.title === 'achievements' && shapeOk(L, false) && roomOk(L), brief(L));
    rec.ok('2. AP is the worker\'s total (10), the stat a door to its sources; Achievements "1 of 33"; no Discoveries door',
      L.ap === '10' && L.apKnown === '1' && L.apDoor && (L.doors[0] || {}).sub === '1 of 33' && L.doors.length === 4, { ap: L.ap, known: L.apKnown, door: L.apDoor, doors: L.doors });
    for (const sh of [{ w: 375, h: 667, side: false, tag: '375-667' }, { w: 430, h: 932, side: false, tag: '430-932' }, { w: 844, h: 390, side: true, tag: '844-390' }, { w: 667, h: 375, side: true, tag: '667-375' }]) {
      await P.page.setViewportSize({ width: sh.w, height: sh.h });
      await P.page.waitForTimeout(1500);
      await H.dashOpen(P, 'achievements');   /* a turn of the phone folds the band: opened again, as a player would */
      await waitRoot(P, '[data-feats-page="self"] [data-feats-ap]');
      await P.page.waitForTimeout(900);
      const M = await read(P);
      if (sh.tag === '375-667' || sh.tag === '844-390') await bandShot(P, 'ui2-feats-landing-' + sh.tag + '.png');
      rec.ok(`1b. ${sh.w} x ${sh.h}: ${sh.side ? 'one row, AP the first cell' : 'AP over the four, two by two'}; every tap 44 px or more, nothing clipped, no scroll, no text under 11 px`,
        M.title === 'achievements' && shapeOk(M, sh.side) && roomOk(M), brief(M));
    }
    await P.page.setViewportSize({ width: 390, height: 844 });
    await P.page.waitForTimeout(1500);
    await H.dashOpen(P, 'achievements');
    await waitRoot(P, '[data-feats-page="self"] [data-feats-ap]');

    /* 3. AP's tree with only First Blood */
    await tap(P, '[data-feats-page] button[data-feats-ap]');
    await waitRoot(P, '[data-ap-tree][data-ap-tree-depth="0"]');
    const T0 = await read(P);
    await bandShot(P, 'ui2-feats-ap-tree.png');
    const k0 = T0.tree ? T0.tree.kids.map((k) => k.id + '=' + k.value).join(',') : '';
    rec.ok(`3a. AP's tree, layer 0: the worker's 10 = From achievements + From quests, guild rungs and the arena (${k0}); no join misses (${T0.tree && T0.tree.mismatches})`,
      !!T0.tree && T0.tree.root === 10 && T0.tree.mismatches === 0 && k0 === 'fromAchv=10,rest=0' && roomOk(T0), { tree: T0.tree, room: brief(T0) });
    await tap(P, '[data-ap-tree] [data-ap-tree-row="fromAchv"]');
    await waitRoot(P, '[data-ap-tree][data-ap-tree-depth="1"]');
    const T1 = await read(P);
    await tap(P, '[data-ap-tree] [data-ap-tree-row="common"]');
    await waitRoot(P, '[data-ap-tree][data-ap-tree-depth="2"]');
    const T2 = await read(P);
    rec.ok('3b. layer 1: Common 10; layer 2: First Blood 10, a door to its medal',
      !!T1.tree && T1.tree.id === 'fromAchv' && T1.tree.kids.map((k) => k.id + '=' + k.value).join(',') === 'common=10'
        && !!T2.tree && T2.tree.id === 'common' && T2.tree.kids.map((k) => k.id + '=' + k.value + ':' + k.source).join(',') === 'first_blood=10:medal' && roomOk(T2),
      { t1: T1.tree && T1.tree.kids, t2: T2.tree && T2.tree.kids });
    await tap(P, '[data-ap-tree] [data-ap-tree-row="first_blood"]');
    await waitRoot(P, '[data-feats-medal="first_blood"]');
    const M1 = await read(P);
    rec.ok('3c. the leaf opens First Blood\'s page: earned, its AP 10, its requirement, "Title: First Blood"',
      !!M1.medal && M1.medal.got === '1' && M1.medal.facts.ap === '10' && M1.medal.facts.how === 'Defeat your first monster.' && M1.medal.titleDoor && roomOk(M1), { medal: M1.medal, room: brief(M1) });
    /* 6. Back walks every layer home */
    const walk = [];
    for (let i = 0; i < 6; i++) {
      const W = await read(P);
      walk.push(W.title);
      if (W.title === 'hero' || !W.title) break;
      await back(P);
    }
    rec.ok(`6. Back walks every layer home: ${walk.join(' > ')}`, walk.join('>') === 'featsMedal>featsAp2>featsAp1>featsAp0>achievements>hero', walk);

    /* 3d. the owner's lever: Gladiator and Blooded lit, paying nothing: the split is not known */
    const g1 = await H.devOp(wsPort, 'achv', myId, { id: 'gladiator' }).catch(() => null);
    const g2 = await H.devOp(wsPort, 'achv', myId, { id: 'combat_10' }).catch(() => null);
    await H.waitFor(P, (S) => (S._achv && S._achv.got ? Object.keys(S._achv.got).length : 0), (n) => n >= 3, { timeout: 30000, label: 'the lever' }).catch(() => null);
    await H.dashOpen(P, 'achievements');
    await waitRoot(P, '[data-feats-page] [data-feats-ap-unknown]', 10000);
    const U = await read(P);
    await bandShot(P, 'ui2-feats-landing-unknown.png');
    rec.ok('3d. Gladiator and Blooded lit by the lever (no points): AP still the worker\'s 10, "Where these came from is not known", the stat opens nothing',
      !!(g1 && g1.ok !== false && g2 && g2.ok !== false) && U.ap === '10' && U.apKnown === '0' && U.unknown && U.apDoor === false && roomOk(U), { ap: U.ap, known: U.apKnown, unknown: U.unknown, door: U.apDoor, room: brief(U) });

    /* 4. the acceptance task */
    await tap(P, '[data-feats-page] [data-feats-door="achievements"]');
    await waitRoot(P, '[data-feats-tiers="self"] [data-feats-tier]');
    const Tt = await read(P);
    await bandShot(P, 'ui2-feats-tiers.png');
    const held = Tt.tiers.filter((t) => Number(t.n) > 0).map((t) => t.id);
    rec.ok(`4a. the medals by the game's four tiers, each its own (${Tt.tiers.map((t) => t.word + ' ' + t.sub).join(' | ')}); the arena not under Rare; held: ${held.join(', ')}`,
      Tt.tiers.map((t) => t.word).join(',') === 'Common,Rare,Arena,Super-rare' && Tt.tiers.find((t) => t.id === 'arena').n === '1'
        && Tt.tiers.find((t) => t.id === 'rare').n === '0' && Tt.tiers.find((t) => t.id === 'common').pts === '20' && Tt.tiers.find((t) => t.id === 'superrare').muted === '1' && roomOk(Tt),
      { tiers: Tt.tiers, room: brief(Tt) });
    /* the highest tier you hold: Arena (Super-rare none) */
    await tap(P, '[data-feats-tier="arena"]');
    await waitRoot(P, '[data-feats-gallery="arena"]');
    const Ga = await read(P);
    await tap(P, '[data-feats-medal-cell="gladiator"]');
    await waitRoot(P, '[data-feats-medal="gladiator"]');
    const Mg = await read(P);
    await bandShot(P, 'ui2-feats-medal-earned.png');
    rec.ok('4b. the highest tier you hold, Arena: Gladiator earned in full, its page: 500 AP, earned today, its requirement',
      Ga.cells.length === 1 && Ga.cells[0].got === '1' && !Ga.cells[0].off && !!Mg.medal && Mg.medal.got === '1' && Mg.medal.facts.ap === '500' && Mg.medal.facts.tier === 'Arena' && !Mg.medal.lock && roomOk(Mg),
      { cells: Ga.cells, medal: Mg.medal, room: brief(Mg) });
    await back(P); await back(P);
    await tap(P, '[data-feats-tier="superrare"]');
    await waitRoot(P, '[data-feats-gallery="superrare"]');
    const Gs = await read(P);
    await bandShot(P, 'ui2-feats-gallery-superrare.png');
    rec.ok('4c. Super-rare\'s gallery: its six in the table\'s order, each muted with the lock mark and "Not earned" for a screen reader; two rows upright, 44 px each',
      Gs.cells.length === 6 && Gs.cells.every((c) => c.got === '0' && c.off && c.lock && /Not earned/.test(c.aria || '')) && roomOk(Gs), { cells: Gs.cells, room: brief(Gs) });
    await tap(P, '[data-feats-medal-cell="tempered"]');
    await waitRoot(P, '[data-feats-medal="tempered"]');
    const Mt = await read(P);
    await bandShot(P, 'ui2-feats-medal-unearned.png');
    rec.ok('4d. an unearned medal is inspectable: Perfectly Tempered, "Not earned yet", its requirement word for word, 1,000 AP, no progress count (the game has none), no title',
      !!Mt.medal && Mt.medal.got === '0' && Mt.medal.facts.on === 'Not earned yet' && Mt.medal.facts.how === 'Harden a weapon all the way to H5.' && Mt.medal.facts.ap === '1000'
        && !('progress' in Mt.medal.facts) && !Mt.medal.titleDoor && Mt.medal.lock && roomOk(Mt), { medal: Mt.medal, room: brief(Mt) });
    await back(P); await back(P); await back(P);
    /* Titles: Feats' door, Character's one page; Equip Blooded; how it was earned */
    await tap(P, '[data-feats-page] [data-feats-door="titles"]');
    await waitRoot(P, '[data-titles-page="self"]');
    const Ti = await read(P);
    await tap(P, '[data-title-row="combat_10"]', 500);
    await tap(P, '[data-u2-action="equip"] button', 500);
    const worn = await H.waitFor(P, (S) => (S._achv ? S._achv.t : null), (t) => t === 'combat_10', { timeout: 15000, label: 'the worker wears Blooded' }).catch(() => null);
    await P.page.waitForTimeout(900);
    const Tw = await read(P);
    await bandShot(P, 'ui2-feats-titles.png');
    rec.ok(`4e. Feats' Titles door opens the one Titles page (Back "${Ti.back}"); Blooded, Veteran, Centurion one row (${Tw.fam.join(', ')}); Equip Blooded as the owner; how it was earned under it ("${Tw.how}")`,
      Ti.title === 'broTitles' && /Feats/.test(Ti.back || '') && worn === 'combat_10' && Tw.worn === 'combat_10' && Tw.how === 'Raise Melee, Bow or Magic to level 10.'
        && Tw.fam.join(',') === 'combat_10:got,combat_50:next,combat_100:locked' && listOk(Tw), { fam: Tw.fam, how: Tw.how, worn: Tw.worn, room: brief(Tw) });
    await back(P);
    const Lw = await read(P);
    rec.ok('4f. the worn title is shown on Feats: the Titles door says "Wearing: Blooded"', Lw.title === 'achievements' && (Lw.doors.find((d) => d.id === 'titles') || {}).sub === 'Wearing: Blooded', Lw.doors);
    /* a lifetime record */
    await tap(P, '[data-feats-page] [data-feats-door="records"]');
    await waitRoot(P, '[data-journey-page] [data-journey-card]');
    const Jr = await read(P);
    await bandShot(P, 'ui2-feats-records.png');
    rec.ok(`4g. Lifetime Records opens the one Journey page: the counted records only (${Jr.cards.join(', ')}), no Duels Won, no Deepest Zone`,
      Jr.title === 'journey' && Jr.cards.join(',') === 'rec-kills,rec-deaths,rec-gold,rec-xp', Jr.cards);
    await back(P);

    /* 5. Quest History, after /dev/quests (it hands every quest in and pays nothing) */
    const q = await H.devOp(wsPort, 'quests', myId, {}).catch(() => null);
    await P.page.waitForTimeout(2500);
    await H.dashOpen(P, 'featsQuests');
    await waitRoot(P, '[data-feats-quests] [data-quest-done-row]');
    const Q = await read(P);
    await bandShot(P, 'ui2-feats-quests.png');
    const want = await H.readState(P, (S) => {
      const q = S.rpg && S.rpg.questsCompleted;
      return Array.isArray(q) ? q.length : (q && typeof q === 'object' ? Object.keys(q).length : null);
    }).catch(() => null);
    rec.ok(`5. Quest History: the quests handed in as the Quests pages' Completed list draws them (${Q.quests && Q.quests.rows} rows, each +5, the AP of every hand-in added: ${Q.quests && Q.quests.ap})`,
      !!(q && q.ok !== false) && !!Q.quests && Q.quests.rows > 0 && Number(Q.quests.n) === Q.quests.rows && Q.quests.plus.every((x) => x === '5') && Number(Q.quests.ap) >= Q.quests.rows * 5,
      { q: q && { ok: q.ok, n: q.finished && q.finished.length }, quests: Q.quests, want });
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* 1c. a computer */
  const D = await H.newPlayer(browser, { name: 'Featdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, dpr: 2 });
  try {
    if (await inWorld(D, rec, 'computer')) {
      await H.dashOpen(D, 'achievements');
      await waitRoot(D, '[data-feats-page="self"] [data-feats-ap]');
      await D.page.waitForTimeout(1500);
      const M = await read(D);
      await bandShot(D, 'ui2-feats-landing-desk.png');
      rec.ok('1c. a computer: AP over the four doors, every tap 44 px or more, nothing clipped, no scroll, no text under 11 px', M.title === 'achievements' && shapeOk(M, M.short) && roomOk(M), brief(M));
    }
  } finally {
    await D.ctx.close().catch(() => {});
  }

  /* 7. ?ui2=0: today's page */
  const O = await H.newPlayer(browser, { name: 'Featold', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'ui2=0&bropages=0' });
  try {
    if (await inWorld(O, rec, '?ui2=0')) {
      /* today's road (mp-achievements' openPage): Bro, the card's Achievements row */
      await H.unfoldBand(O).catch(() => {});
      await H.openDest(O, 'Bro');
      await O.page.waitForSelector('[data-bro-row="achievements"]', { timeout: 10000 }).catch(() => {});
      await O.page.locator('[data-bro-row="achievements"]').first().click({ force: true }).catch(() => {});
      const old = await waitRoot(O, '[data-achv-panel]', 20000);
      const feats = await O.page.evaluate(() => !!document.querySelector('[data-feats-page]'));
      rec.ok('7. ?ui2=0: today\'s Achievements page, and no Feats', old && !feats, { old, feats });
    }
  } finally {
    await O.ctx.close().catch(() => {});
  }
}
