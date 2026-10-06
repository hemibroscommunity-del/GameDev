/* ═══ PET TRAPPING ON A PHONE (v2.3.3120) ═══
 *
 * The owner: "your trapping level governs what level monster you can capture.
 * Catching a pet is a rare activity with very little success rate. The best
 * success rate for the lowest tier monster should be about 1%. And each trap
 * should cost at least 1 wood to make." (docs/PET-TRAPPING-PLAN.md)
 *
 * A real phone client against a real worker, in the Wheel:
 *   1. the worker advertises caps.trapping / trapcraft / petbook, and the
 *      pets record arrives at join (pets_state), empty;
 *   2. THE WOODWORKER, through its real door: a Traps choice beside Bow and
 *      Staff; a pine log row; Make takes one log for one box trap, All the
 *      rest, Woodworking XP paid; the bag names it "Box Trap";
 *   3. THE TRAP POP-UP over a targeted monster of the lands: your TRUE odds
 *      (the table's, the worker's) and your traps; grey "No box traps" with
 *      none, "Requires Trapping N" above your level -- and a grey tap sends
 *      nothing;
 *   4. a tap ARMS: the worker's mark, drawn over the monster;
 *   5. the kill (the test kit's forced catch, through the real kill path):
 *      the trap springs -- the shakes drawn, one trap used, the card for the
 *      new pet once it snaps, Trapping XP;
 *   6. naming it on the card: the worker's record carries the name;
 *   7. THE PET, drawn from the pet sheet, follows you, its name over it;
 *   8. THE PETS PAGE (More -> Pets): the row, its portrait, Put away / Take
 *      out (the pet leaves the ground and comes back), Release asks first;
 *   9. a forced MISS: the trap breaks, no card, one more try counted;
 *  10. no page errors.
 * Pictures: tools/qa/mp/out/trapping-*.png.
 */
import * as H from './harness.mjs';
import { trapChance, fmtTrapChance, TRAPPING } from '../../../src/data/trapping.js';

const PHONE = { width: 390, height: 844 };
const HOME = process.env.TRAP_HOME || 'frost';
/* the kind each land's first monsters become (server petbook.js) */
const KIND = { frost: 'snowling', ember: 'gobling', thunder: 'sparklet', verdant: 'dewdrop', tidal: 'finling', hollows: 'pebbling', sky: 'mumling', mist: 'wisplet' };
const KIND_NAME = { frost: 'Snowling', ember: 'Gobling', thunder: 'Sparklet', verdant: 'Dewdrop', tidal: 'Finling', hollows: 'Pebbling', sky: 'Mumling', mist: 'Wisplet|Lurkling' };
const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/trapping-${name}.png` }).catch(() => {});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Trapper', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
  try {
    await body({ P, wsPort, rec, errors });
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

async function body({ P, wsPort, rec, errors }) {
  await H.enterWorld(P);
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
  rec.ok('in the Wheel (guard)', !!inWheel, inWheel);
  if (!inWheel) return;
  if (await P.page.$('[data-chest-window]')) { await P.page.click('text=Later').catch(() => {}); await P.page.waitForTimeout(300); }
  const me = await H.readState(P, (S) => S.myId);
  /* the QA keep-alive (mp-wheeldoors): an idle page logs out after 2 minutes */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await steps({ P, wsPort, rec, errors, me });
  } finally {
    stopAlive = true;
  }
}

async function steps({ P, wsPort, rec, errors, me }) {
  /* ── 1. caps and the record ── */
  const caps = await H.readState(P, (S) => ({ t: !!(S._serverCaps && S._serverCaps.trapping), c: !!(S._serverCaps && S._serverCaps.trapcraft),
    p: !!(S._serverCaps && S._serverCaps.petbook), book: S._petBook ? { n: (S._petBook.list || []).length, cap: S._petBook.cap } : null }));
  rec.ok('the worker advertises caps.trapping, trapcraft and petbook, and the pets record came at join (empty, 30 places)',
    caps.t && caps.c && caps.p && caps.book && caps.book.n === 0 && caps.book.cap === 30, caps);
  if (!(caps.t && caps.c && caps.p)) return;
  await H.devOp(wsPort, 'quests', me);
  await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 15 });
  await H.devOp(wsPort, 'trapping', me, { logs: 12, level: 1, traps: 0 });
  await P.page.waitForFunction(() => ((window._gameState.current.rpg || {}).inventory || {}).wood_pine_log === 12, null, { timeout: 8000 }).catch(() => {});

  /* ── 2. the Woodworker ── */
  let doors = [];
  for (let i = 0; i < 40 && !doors.length; i++) {
    doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
    if (!doors.length) await P.page.waitForTimeout(500);
  }
  const ww = doors.find((d) => d.id === 'woodworker');
  rec.ok('the Woodworker has a door in the Wheel\'s town (guard)', !!ww, doors.map((d) => d.id));
  if (!ww) return;
  const standAt = async (x, bootsY) => {
    for (let k = 0; k < 4; k++) {
      const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
      await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
      await P.page.waitForTimeout(800);
      const g = await P.page.evaluate(() => window.__btPlayerGround());
      if (Math.hypot(g.x - x, g.y - bootsY) < 14) return true;
    }
    return false;
  };
  await standAt(ww.x, ww.y + 30);
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
  const opened = await P.page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((b) => /^Traps/.test((b.textContent || '').trim())), null, { timeout: 6000 }).then(() => true).catch(() => false);
  rec.ok('the Woodworker opens through its door, with a Traps choice beside Bow and Staff', opened);
  if (!opened) { await shot(P, 'no-woodworker'); return; }
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((q) => /^Traps/.test((q.textContent || '').trim())); if (b) b.click(); });
  const row = await P.page.waitForSelector('[data-traps-row="wood_pine_log"]', { timeout: 4000 }).then(() => true).catch(() => false);
  const rowText = row ? await P.page.$eval('[data-traps-row="wood_pine_log"]', (el) => el.innerText.replace(/\s+/g, ' ')) : '';
  rec.ok(`the Traps tab lists the pine logs you hold ("${rowText}")`, row && /Pine Log/.test(rowText) && /×12/.test(rowText) && /\+40 XP each/.test(rowText), rowText);
  await shot(P, 'traps-tab');
  const ww0 = await H.readState(P, (S) => ((S.rpg.lifeSkills || {}).woodworking || {}));
  await P.page.click('[data-traps-make="wood_pine_log"]');
  await P.page.waitForFunction(() => ((window._gameState.current.rpg || {}).inventory || {}).trap_box === 1, null, { timeout: 6000 }).catch(() => {});
  const one = await H.readState(P, (S) => ({ traps: (S.rpg.inventory || {}).trap_box || 0, logs: (S.rpg.inventory || {}).wood_pine_log || 0 }));
  rec.ok('Make: one log for one box trap', one.traps === 1 && one.logs === 11, one);
  await P.page.waitForTimeout(400);
  await P.page.click('[data-traps-all="wood_pine_log"]').catch(() => {});
  await P.page.waitForFunction(() => ((window._gameState.current.rpg || {}).inventory || {}).trap_box === 12, null, { timeout: 6000 }).catch(() => {});
  const all = await H.readState(P, (S) => ({ traps: (S.rpg.inventory || {}).trap_box || 0, logs: (S.rpg.inventory || {}).wood_pine_log || 0,
    ww: ((S.rpg.lifeSkills || {}).woodworking || {}) }));
  const wwGain = (all.ww.level > (ww0.level || 1)) ? true : ((all.ww.xp || 0) - (ww0.xp || 0) === 12 * TRAPPING.MAKE_XP);
  rec.ok('All: the other eleven logs into traps, Woodworking XP paid for each', all.traps === 12 && all.logs === 0 && wwGain, { all, ww0 });
  await shot(P, 'traps-made');
  await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
  await P.page.waitForTimeout(400);

  /* ── 3. out to the land's monsters, a target ── */
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const at = WHEEL_SPAWNS[HOME] && WHEEL_SPAWNS[HOME].points[0];
  await H.hopTo(P, at[0] + 160, at[1] + 160, { tries: 260 });
  await P.page.waitForTimeout(1500);
  const target = async () => P.page.evaluate((home) => {
    const S = window._gameState.current;
    const ms = (S.monsters || []).filter((m) => m && m.home === home && m.alive && m.curHp > 0);
    ms.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const m = ms[0];
    if (!m) return null;
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
    return { id: m.id, level: m.level, d: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)), x: m.x, y: m.y };
  }, HOME);
  let m = await target();
  rec.ok(`a monster of the ${HOME} land within reach to target (guard)`, !!m && m.d < 400, m);
  if (!m) return;
  if (m.d > 200) { await H.hopTo(P, m.x + 90, m.y + 40, { tries: 40 }); await P.page.waitForTimeout(500); m = await target(); }
  await H.devOp(wsPort, 'trapping', me, { level: Math.max(1, m.level) + 4 });
  await P.page.waitForFunction((L) => ((window._gameState.current.rpg.lifeSkills || {}).trapping || {}).level === L, Math.max(1, m.level) + 4, { timeout: 6000 }).catch(() => {});
  const T = Math.max(1, m.level) + 4;
  await P.page.waitForSelector('[data-trap-button="ready"]', { timeout: 4000 }).catch(() => {});
  const view = await P.page.evaluate(() => {
    const b = document.querySelector('[data-trap-button]');
    const r = b ? b.getBoundingClientRect() : null;
    return b ? { kind: b.getAttribute('data-trap-button'), text: b.innerText.replace(/\s+/g, ' '), box: { l: r.left, r: r.right, t: r.top, b: r.bottom }, vw: innerWidth } : null;
  });
  const want = fmtTrapChance(trapChance(T, m.level));
  rec.ok(`TRAP pops up over a targeted monster with the true odds (${want} at Trapping ${T} on a level ${m.level}) and your traps ("${view && view.text}")`,
    !!view && view.kind === 'ready' && view.text.indexOf(want) >= 0 && /×12/.test(view.text) && view.box.l >= 4 && view.box.r <= view.vw - 4, view);
  await shot(P, 'trap-button');

  /* grey: no traps, then a level above */
  await H.devOp(wsPort, 'trapping', me, { traps: 0 });
  await P.page.waitForSelector('[data-trap-button="grey"]', { timeout: 4000 }).catch(() => {});
  const greyNone = await P.page.evaluate(() => { const b = document.querySelector('[data-trap-button]'); return b ? b.innerText.replace(/\s+/g, ' ') : null; });
  const wired0 = await H.readState(P, (S) => S._trapArms || 0);
  await P.page.evaluate(() => { const b = document.querySelector('[data-trap-button]'); if (b) b.click(); });
  await P.page.waitForTimeout(400);
  const wired1 = await H.readState(P, (S) => S._trapArms || 0);
  rec.ok(`with no traps the button is grey, "No box traps", and a tap sends nothing ("${greyNone}")`, /No box traps/.test(greyNone || '') && wired1 === wired0, { greyNone, wired0, wired1 });
  /* above your level: a level-2 monster of the land, at Trapping 1 */
  const m2 = await P.page.evaluate((home) => {
    const S = window._gameState.current;
    const ms = (S.monsters || []).filter((q) => q && q.home === home && q.alive && q.curHp > 0 && q.level >= 2);
    ms.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const q = ms[0];
    if (!q) return null;
    S.lockedTarget = { type: 'monster', id: q.id, ref: q, src: 'tap' };
    return { id: q.id, level: q.level };
  }, HOME);
  await H.devOp(wsPort, 'trapping', me, { traps: 12, level: 1 });
  if (m2) {
    await P.page.waitForFunction(() => /Requires Trapping/.test((document.querySelector('[data-trap-button]') || {}).innerText || ''), null, { timeout: 4000 }).catch(() => {});
    const greyLvl = await P.page.evaluate(() => { const b = document.querySelector('[data-trap-button]'); return b ? b.innerText.replace(/\s+/g, ' ') : null; });
    rec.ok(`above your Trapping level it says what it takes ("${greyLvl}")`, new RegExp('Requires Trapping ' + m2.level).test(greyLvl || ''), greyLvl);
    await shot(P, 'trap-grey');
  }
  m = await target();   /* back to the nearest, for the arm */
  await H.devOp(wsPort, 'trapping', me, { level: T, traps: 12 });
  await P.page.waitForSelector('[data-trap-button="ready"]', { timeout: 4000 }).catch(() => {});

  /* ── 4. arm ── */
  await P.page.evaluate(() => { const b = document.querySelector('[data-trap-button="ready"]'); if (b) b.click(); });
  await P.page.waitForFunction(() => { const t = window.__btTrap && window.__btTrap(); return t && t.mark; }, null, { timeout: 5000 }).catch(() => {});
  const armed = await P.page.evaluate(() => window.__btTrap && window.__btTrap());
  rec.ok(`a tap arms it: the worker's mark on that monster for ${TRAPPING.MARK_MS / 1000} s, its button counting down`,
    !!armed && armed.mark && armed.mark.monsterId === m.id && armed.mark.leftMs > 10000 && armed.view && armed.view.kind === 'armed', armed);
  await P.page.waitForTimeout(500);
  await shot(P, 'armed');

  /* ── 5. the kill: a forced catch through the real kill path ── */
  const xp0 = await H.readState(P, (S) => ((S.rpg.lifeSkills || {}).trapping || {}).xp || 0);
  await H.devOp(wsPort, 'trapping', me, { next: 'catch', kill: m.id });
  await P.page.waitForFunction(() => { const t = window.__btTrap && window.__btTrap(); return t && t.rolls > 0; }, null, { timeout: 5000 }).catch(() => {});
  /* v2.3.3121: what sprang, read AT ONCE -- the spring is drawn for ~2.6 s,
     and on a slow run the screenshots below outlast it (springs back to 0) */
  const sprung = await P.page.evaluate(() => window.__btTrap && window.__btTrap());
  await P.page.waitForTimeout(400);
  const hidden = await P.page.evaluate(() => ({ d: window._pixiRenderer.petDrawn(), t: window.__btTrap() }));
  rec.ok('while the trap shakes, the new pet is still in it (not yet beside you)', !hidden.d || hidden.d.visible === false, hidden);
  await P.page.waitForTimeout(500);
  await shot(P, 'shaking');
  rec.ok('the trap springs where it fell: drawn, three shakes, a catch, one trap used',
    !!sprung && sprung.springs === 1 && sprung.last && sprung.last.caught === true && sprung.last.shakes === 3 && sprung.traps === 11, sprung);
  const card = await P.page.waitForSelector('[data-trap-card]', { timeout: 5000 }).then(() => true).catch(() => false);
  const cardText = card ? await P.page.$eval('[data-trap-card]', (el) => el.innerText.replace(/\s+/g, ' ')) : '';
  const port = card ? await P.page.$eval('[data-trap-card] canvas', (c) => { const g = c.getContext('2d').getImageData(0, 0, 64, 64).data; let n = 0; for (let i = 3; i < g.length; i += 4) if (g[i] > 40) n++; return n; }) : 0;
  rec.ok(`once it snaps, a card for the new pet: "${cardText}", its picture drawn (${port} px)`, card && /Caught!/i.test(cardText) && new RegExp(KIND_NAME[HOME]).test(cardText) && /Lv \d+/.test(cardText) && port > 200, { cardText, port });
  const xp1 = await H.readState(P, (S) => ((S.rpg.lifeSkills || {}).trapping || {}));
  rec.ok('Trapping XP paid for the roll and the catch', (xp1.level > T) || (xp1.xp > xp0), { xp0, xp1 });
  await shot(P, 'card');

  /* ── 6. name it ── */
  await P.page.fill('[data-trap-card-name]', 'Sparky');
  await P.page.click('[data-trap-card-give]');
  await P.page.waitForFunction(() => { const b = window._gameState.current._petBook; return b && b.list && b.list[0] && b.list[0].name === 'Sparky'; }, null, { timeout: 5000 }).catch(() => {});
  const named = await H.readState(P, (S) => (S._petBook && S._petBook.list[0]) || null);
  rec.ok('named on the card: the worker\'s record carries "Sparky", the pet out with you', !!named && named.name === 'Sparky' && named.kind === KIND[HOME], named);
  const srv = await H.adminPlayer(wsPort, me).catch(() => null);
  void srv;

  /* ── 7. it follows ── */
  await H.hopTo(P, m.x + 180, m.y + 60, { tries: 20 });
  await P.page.waitForTimeout(1200);
  const drawn = await P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.petDrawn) ? window._pixiRenderer.petDrawn() : null);
  rec.ok(`the pet is drawn from the pet sheet beside you, its name over it (${JSON.stringify(drawn)})`,
    !!drawn && drawn.visible && drawn.kind === KIND[HOME] && drawn.tex && drawn.name === 'Sparky', drawn);
  await shot(P, 'pet-follows');

  /* ── 8. the Pets page ── */
  await H.openDest(P, 'More').catch(() => {});
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = document.querySelector('[data-more-tile="pets"]'); if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
  const page = await P.page.waitForSelector('[data-pets-panel]', { timeout: 5000 }).then(() => true).catch(() => false);
  const rowP = page ? await P.page.$$eval('[data-pet-row]', (els) => els.map((el) => ({ id: el.getAttribute('data-pet-row'), text: el.innerText.replace(/\s+/g, ' ') }))) : [];
  rec.ok(`More -> Pets opens the Pets page, a row for Sparky ("${rowP[0] && rowP[0].text}")`, page && rowP.length === 1 && /Sparky/.test(rowP[0].text) && /With you/.test(rowP[0].text), rowP);
  await shot(P, 'pets-page');
  if (page && rowP.length) {
    await P.page.click(`[data-pet-row="${rowP[0].id}"]`);
    await P.page.waitForTimeout(300);
    await P.page.click(`[data-pet-active="${rowP[0].id}"]`).catch(() => {});
    await P.page.waitForFunction(() => { const b = window._gameState.current._petBook; return b && b.active === null; }, null, { timeout: 5000 }).catch(() => {});
    await P.page.waitForTimeout(300);
    const away = await P.page.evaluate(() => window._pixiRenderer.petDrawn());
    rec.ok('Put away: the pet leaves the ground', !!away && away.visible === false, away);
    await P.page.click(`[data-pet-active="${rowP[0].id}"]`).catch(() => {});
    await P.page.waitForFunction(() => { const b = window._gameState.current._petBook; return b && b.active; }, null, { timeout: 5000 }).catch(() => {});
    await P.page.waitForTimeout(300);
    const back = await P.page.evaluate(() => window._pixiRenderer.petDrawn());
    rec.ok('Take out: it is back', !!back && back.visible === true, back);
    await P.page.click(`[data-pet-release="${rowP[0].id}"]`).catch(() => {});
    await P.page.waitForTimeout(300);
    const ask = await P.page.$(`[data-pet-release-yes="${rowP[0].id}"]`);
    rec.ok('Release asks first ("Release ... for good?")', !!ask);
    await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-pets-panel] button')).find((q) => (q.textContent || '').trim() === 'Keep'); if (b) b.click(); });
  }
  await H.closeDest(P).catch(() => {});
  await P.page.waitForTimeout(400);

  /* ── 9. a forced miss ── */
  m = await target();
  if (m) {
    if (m.d > 300) { await H.hopTo(P, m.x + 90, m.y + 40, { tries: 40 }); await P.page.waitForTimeout(500); m = await target(); }
    await H.devOp(wsPort, 'trapping', me, { level: Math.max(T, m.level) });
    await P.page.waitForSelector('[data-trap-button="ready"]', { timeout: 4000 }).catch(() => {});
    await P.page.evaluate(() => { const b = document.querySelector('[data-trap-button="ready"]'); if (b) b.click(); });
    await P.page.waitForFunction((id) => { const t = window.__btTrap && window.__btTrap(); return t && t.mark && t.mark.monsterId === id; }, m.id, { timeout: 5000 }).catch(() => {});
    const before = await P.page.evaluate(() => window.__btTrap());
    await H.devOp(wsPort, 'trapping', me, { next: 'miss', kill: m.id });
    await P.page.waitForFunction((n) => { const t = window.__btTrap && window.__btTrap(); return t && t.rolls > n; }, before.rolls, { timeout: 5000 }).catch(() => {});
    await P.page.waitForTimeout(1500);
    const after = await P.page.evaluate(() => window.__btTrap());
    const cardUp = await P.page.$('[data-trap-card]');
    rec.ok('a forced miss: the trap breaks at once (0 shakes), no card, one more trap used',
      after.last && after.last.caught === false && after.last.shakes === 0 && !cardUp && after.traps === before.traps - 1, { before, after });
  }
  rec.ok('no page errors through all of it', errors.length === 0, errors.slice(0, 5));
}
