/* ═══ BEASTMASTER BRO, PET LEVELS AND THE JOURNAL, ON A PHONE (v2.3.3121) ═══
 *
 * docs/PET-TRAPPING-PLAN.md, Phase 2: "Pets earn XP while out with you, up to
 * your Trapping level, and grow a little.  A journal of every kind: your
 * tries, your catches, your biggest.  A Beastmaster beside the Woodworker with
 * a short quest line the server checks."
 *
 * A real phone client against a real worker, in the Wheel:
 *   1. the worker advertises caps.beastmaster and caps.petlevels;
 *   2. BEASTMASTER BRO stands east of the Woodworker's steps, drawn, his
 *      picture loaded behind the loading screen, an offer's badge over him
 *      once the Mayor's first quest is done;
 *   3. walking up opens his talk, then "Box Traps": the three pine logs it
 *      hands over (the worker's grant) and its reward;
 *   4. walking past him to the Woodworker's door does not stop you for his
 *      progress line; the Woodworker makes the three traps; back to him, the claim is the
 *      auto reward (no XP to place): 40 gold and 2 box traps, the worker's,
 *      and his next quest, "Set and Spring", offered;
 *   5. a pet caught (the test kit's forced catch through the real kill path),
 *      then a kill worth 300 combat XP: the pet's XP from the worker
 *      (combat_credit), a level-up said over it;
 *   6. THE PETS PAGE: the XP bar, and the journal -- 18 kinds, the one caught
 *      in colour, the rest their shapes alone;
 *   7. his line done, a tap on him opens the Pets page;
 *   8. no page errors.
 * Pictures: tools/qa/mp/out/beastmaster-*.png.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const HOME = 'frost';
const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/beastmaster-${name}.png` }).catch(() => {});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Beastie', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
  const npcReqs = [];
  P.page.on('request', (r) => { if (/\/sprites\/npc\/beastmaster-bro\.webp/.test(r.url())) npcReqs.push(Date.now()); });
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await body({ P, wsPort, rec, errors, npcReqs });
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}

async function body({ P, wsPort, rec, errors, npcReqs }) {
  await H.enterWorld(P);
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
  const arrivedAt = Date.now();
  rec.ok('in the Wheel (guard)', !!inWheel, inWheel);
  if (!inWheel) return;
  if (await P.page.$('[data-chest-window]')) { await P.page.click('text=Later').catch(() => {}); await P.page.waitForTimeout(300); }
  const me = await H.readState(P, (S) => S.myId);

  /* ── 1. caps ── */
  const caps = await H.readState(P, (S) => ({ b: !!(S._serverCaps && S._serverCaps.beastmaster), l: !!(S._serverCaps && S._serverCaps.petlevels),
    p: !!(S._serverCaps && S._serverCaps.petbook) }));
  rec.ok('the worker advertises caps.beastmaster and caps.petlevels (and petbook)', caps.b && caps.l && caps.p, caps);
  if (!(caps.b && caps.l && caps.p)) return;
  /* every quest handed in but his line: the Mayor's first is what opens it */
  const fin = await H.devOp(wsPort, 'quests', me, { except: 'beast_' });
  await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 20 });
  await P.page.waitForFunction(() => { const q = (window._gameState.current.rpg || {})._quests || {}; return q.tut_1 === 'turnedIn'; }, null, { timeout: 8000 }).catch(() => {});
  rec.ok('setup: every quest handed in but Beastmaster Bro\'s (guard)', fin && fin.ok && !(fin.quests || []).some((q) => /^beast_/.test(q)), fin);

  /* ── 2. where he stands ── */
  const cast = await H.waitFor(P, (S) => ({
    bm: (S.npcs || []).filter((n) => n.name === 'Beastmaster Bro').map((n) => ({ id: n.id, x: n.x, y: n.y, mark: n._questMarker || null }))[0] || null,
    doors: window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : [],
  }), (v) => !!v.bm && v.doors.length > 0 && v.bm.mark === '❗', { timeout: 20000, label: 'Beastmaster Bro' }).catch(() => null);
  const ww = cast && cast.doors.find((d) => d.id === 'woodworker');
  const bm = cast && cast.bm;
  rec.ok('Beastmaster Bro stands east of the Woodworker\'s steps (105, 34 from its door), an offer\'s badge over him',
    !!bm && !!ww && Math.abs(bm.x - (ww.x + 105)) < 1 && Math.abs(bm.y - (ww.y + 34)) < 1 && bm.mark === '❗', { bm, ww });
  if (!bm || !ww) return;
  await H.hopTo(P, bm.x - 40, bm.y + 150, { step: 100, gap: 260, tries: 120 });
  await P.page.waitForTimeout(1200);
  const drawn = await P.page.evaluate(() => (window.__btNpcSprites ? window.__btNpcSprites() : []).find((n) => n.name === 'Beastmaster Bro') || null);
  const art = await P.page.evaluate(() => (window.__btWheelNpcArt ? window.__btWheelNpcArt() : null));
  rec.ok(`he is drawn, a man's height (${drawn ? Math.round(drawn.height) : '?'} px), his picture loaded behind the loading screen (${npcReqs.filter((t) => t > arrivedAt).length} fetched after arriving)`,
    !!drawn && drawn.height > 60 && drawn.height < 260 && /beastmaster-bro\.webp/.test(drawn.src || '') && npcReqs.filter((t) => t > arrivedAt).length === 0
      && !!art && art.pictures.some((p) => /beastmaster-bro/.test(p)), { drawn, art, reqs: npcReqs.map((t) => t - arrivedAt) });
  await shot(P, 'by-the-woodworker');

  /* ── 3. his first quest ── */
  const open1 = await H.approachNpc(P, 'beastmaster_bro');
  const said = [];
  const where1 = open1 ? await H.advanceNpcDialogue(P, { onChunk: (t) => said.push(t) }) : null;
  const offer = where1 === 'offer' ? await P.page.evaluate(() => ({
    title: (document.querySelector('.bt-qoffer-title') || {}).innerText || '',
    now: Array.from(document.querySelectorAll('[data-gives="accept"]')).map((g) => g.innerText.replace(/\s+/g, ' ')).join(' | '),
    end: Array.from(document.querySelectorAll('[data-gives="complete"]')).map((g) => g.innerText.replace(/\s+/g, ' ')).join(' | '),
  })) : null;
  rec.ok(`walking up opens his talk ("${(said[0] || '').slice(0, 60)}..."), then "Box Traps": ${offer ? offer.now + ' / ' + offer.end : '?'}`,
    open1 && /box/i.test(said.join(' ')) && !!offer && offer.title === 'Box Traps' && /3 Pine Logs/.test(offer.now) && /2 Box Traps/.test(offer.end), { said, offer });
  await shot(P, 'offer');
  const ok1 = where1 === 'offer' ? await H.confirmQuestOffer(P) : false;
  await P.page.waitForFunction(() => { const R = window._gameState.current.rpg || {}; return (R._quests || {}).beast_1 === 'active' && ((R.inventory || {}).wood_pine_log || 0) >= 3; }, null, { timeout: 8000 }).catch(() => {});
  const acc = await H.adminPlayer(wsPort, me).catch(() => null);
  const srvInv = (acc && acc.rpg && acc.rpg.inventory) || {};
  rec.ok('accepted: the worker has "Box Traps" active and handed over the three pine logs',
    ok1 && acc && acc.rpg && acc.rpg._quests && acc.rpg._quests.beast_1 === 'active' && (srvInv.wood_pine_log || 0) >= 3, { ok1, quests: acc && acc.rpg && acc.rpg._quests && acc.rpg._quests.beast_1, logs: srvInv.wood_pine_log });
  await H.leaveNpc(P, 'beastmaster_bro');

  /* ── 4. the Woodworker, then back to him ── */
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
  /* walking past him with his quest in hand did not stop us (quietProgress) */
  const stopped = await P.page.evaluate(() => !!document.querySelector('.bt-npcdlg, .bt-qoffer'));
  rec.ok('walking past him to the Woodworker\'s door with his quest in hand, he does not stop you to say how it is going', !stopped);
  await shot(P, 'at-woodworker');
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
  await P.page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((b) => /^Traps/.test((b.textContent || '').trim())), null, { timeout: 6000 }).catch(() => {});
  await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((q) => /^Traps/.test((q.textContent || '').trim())); if (b) b.click(); });
  await P.page.waitForSelector('[data-traps-all="wood_pine_log"]', { timeout: 4000 }).catch(() => {});
  const traps0 = await H.readState(P, (S) => ((S.rpg.inventory || {}).trap_box || 0));
  await P.page.click('[data-traps-all="wood_pine_log"]').catch(() => {});
  await P.page.waitForFunction((n) => ((window._gameState.current.rpg || {}).inventory || {}).trap_box >= n + 3, traps0, { timeout: 6000 }).catch(() => {});
  const made = await H.readState(P, (S) => ({ traps: (S.rpg.inventory || {}).trap_box || 0, n: (S.rpg._questKills || {}).beast_1 || 0 }));
  rec.ok(`the Woodworker makes the three traps, and the worker counts them for the quest (${made.n}/3)`, made.traps >= traps0 + 3 && made.n >= 3, { traps0, made });
  await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
  await P.page.waitForTimeout(500);

  const coins0 = (await H.adminPlayer(wsPort, me).catch(() => null) || {}).rpg?.coins || 0;
  const bag0 = await H.readState(P, (S) => ((S.rpg.inventory || {}).trap_box || 0));
  const open2 = await H.approachNpc(P, 'beastmaster_bro');
  const where2 = open2 ? await H.advanceNpcDialogue(P) : null;
  await P.page.waitForFunction(() => ((window._gameState.current.rpg || {})._quests || {}).beast_1 === 'turnedIn', null, { timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(800);
  const after = await H.adminPlayer(wsPort, me).catch(() => null);
  const R2 = (after && after.rpg) || {};
  const nextTitle = await P.page.evaluate(() => (document.querySelector('.bt-qoffer-title') || {}).innerText || '');
  rec.ok(`back to him, the claim is paid by the worker -- +${(R2.coins || 0) - coins0} gold, +${((R2.inventory || {}).trap_box || 0) - bag0} box traps -- and he offers "${nextTitle}"`,
    open2 && R2._quests && R2._quests.beast_1 === 'turnedIn' && (R2.coins || 0) - coins0 === 40 && ((R2.inventory || {}).trap_box || 0) - bag0 === 2
      && R2._quests.beast_2 === 'available' && (where2 !== 'offer' || nextTitle === 'Set and Spring'), { where2, nextTitle, coins: [coins0, R2.coins], q: R2._quests && [R2._quests.beast_1, R2._quests.beast_2] });
  await shot(P, 'claimed');
  await H.leaveNpc(P, 'beastmaster_bro');

  /* ── 5. a pet, and its XP ── */
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
  if (m && m.d > 200) { await H.hopTo(P, m.x + 90, m.y + 40, { tries: 40 }); await P.page.waitForTimeout(500); m = await target(); }
  rec.ok('a monster of the frost land to trap (guard)', !!m, m);
  if (!m) return;
  const T = Math.max(1, m.level) + 6;
  await H.devOp(wsPort, 'trapping', me, { level: T, traps: 10 });
  await P.page.waitForSelector('[data-trap-button="ready"]', { timeout: 6000 }).catch(() => {});
  await P.page.evaluate(() => { const b = document.querySelector('[data-trap-button="ready"]'); if (b) b.click(); });
  await P.page.waitForFunction((id) => { const t = window.__btTrap && window.__btTrap(); return t && t.mark && t.mark.monsterId === id; }, m.id, { timeout: 5000 }).catch(() => {});
  await H.devOp(wsPort, 'trapping', me, { next: 'catch', kill: m.id });
  await P.page.waitForFunction(() => { const b = window._gameState.current._petBook; return b && b.list && b.list.length === 1 && b.active; }, null, { timeout: 8000 }).catch(() => {});
  /* the card comes up once the trap has snapped (its shakes play first) */
  await P.page.waitForSelector('[data-trap-card-done]', { timeout: 8000 }).catch(() => {});
  await P.page.evaluate(() => { const b = document.querySelector('[data-trap-card-done]'); if (b) b.click(); });
  await P.page.waitForTimeout(300);
  const pet0 = await H.readState(P, (S) => (S._petBook && S._petBook.list[0]) || null);
  rec.ok(`a pet caught and out with you (Lv ${pet0 && pet0.lv}, ${pet0 && pet0.xp} XP) (guard)`, !!pet0 && pet0.lv < T, pet0);
  if (!pet0) return;

  let m2 = await target();
  if (m2 && m2.d > 300) { await H.hopTo(P, m2.x + 90, m2.y + 40, { tries: 40 }); await P.page.waitForTimeout(500); m2 = await target(); }
  const ups0 = await H.readState(P, (S) => S._petLevelUps || 0);
  await H.devOp(wsPort, 'trapping', me, { kill: m2.id, xp: 300 });
  await P.page.waitForFunction((n) => (window._gameState.current._petLevelUps || 0) > n, ups0, { timeout: 6000 }).catch(() => {});
  const pet1 = await H.readState(P, (S) => ({ pet: (S._petBook && S._petBook.list[0]) || null, ups: S._petLevelUps || 0, gained: S._petXpGained || 0,
    said: [S._petLevelSaid || ''].filter((t) => /is Lv \d+!/.test(t)),
    popup: (S.dmgNumbers || []).some((d) => d && /is Lv \d+!/.test(String(d.text || ''))) }));
  const srvPets = await H.adminPlayer(wsPort, me).catch(() => null);
  rec.ok(`a kill worth 300 combat XP pays the pet 30: Lv ${pet0.lv} -> ${pet1.pet && pet1.pet.lv}, said over it ("${pet1.said[0] || '?'}")`,
    !!pet1.pet && pet1.pet.lv > pet0.lv && pet1.gained >= 30 && pet1.ups > ups0 && pet1.said.length > 0, { pet0, pet1, srv: srvPets && srvPets.pets });
  await P.page.waitForTimeout(300);
  await shot(P, 'pet-levelled');

  /* ── 6. the Pets page: the XP bar and the journal ── */
  await H.openDest(P, 'More').catch(() => {});
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = document.querySelector('[data-more-tile="pets"]'); if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
  const page = await P.page.waitForSelector('[data-pets-panel]', { timeout: 5000 }).then(() => true).catch(() => false);
  const bar = page ? await P.page.$eval('[data-pet-xp]', (el) => ({ v: el.getAttribute('data-pet-xp'), text: el.innerText.replace(/\s+/g, ' ') })).catch(() => null) : null;
  const pv = await H.readState(P, (S) => (S._petBook && S._petBook.list[0]) || null);
  rec.ok(`the Pets page shows its XP bar ("${bar && bar.text}"), the worker's numbers`, !!bar && bar.v === pv.xp + '/' + Math.ceil(25 * Math.pow(1.08, pv.lv - 1)), { bar, pv });
  await shot(P, 'pets-xp');
  const journal = page ? await P.page.evaluate(() => {
    const j = document.querySelector('[data-pets-journal]');
    if (!j) return null;
    j.scrollIntoView({ block: 'start' });
    const cells = Array.from(j.querySelectorAll('[data-journal-cell]')).map((c) => ({ k: c.getAttribute('data-journal-cell'), caught: c.getAttribute('data-journal-caught') === '1',
      shadow: !!c.querySelector('[data-pet-shadow]'), text: c.innerText.replace(/\s+/g, ' ') }));
    return { n: j.getAttribute('data-pets-journal'), cells };
  }) : null;
  await P.page.waitForTimeout(500);
  const snow = journal && journal.cells.find((c) => c.k === 'snowling.1');
  rec.ok(`the journal: every kind at both stages (${journal ? journal.cells.length : 0}), "1 of 18 caught", the Snowling in colour ("${snow && snow.text}"), the rest their shapes`,
    !!journal && journal.cells.length === 18 && journal.n === '1' && !!snow && snow.caught && !snow.shadow && /1 caught/.test(snow.text) && /1 tries/.test(snow.text)
      && journal.cells.filter((c) => c.k !== 'snowling.1').every((c) => !c.caught && c.shadow), journal);
  await shot(P, 'journal');
  await H.closeDest(P).catch(() => {});
  await P.page.waitForTimeout(400);

  /* ── 7. his line done: a tap opens the Pets page ── */
  await H.devOp(wsPort, 'quests', me);
  await P.page.waitForFunction(() => ((window._gameState.current.rpg || {})._quests || {}).beast_4 === 'turnedIn', null, { timeout: 8000 }).catch(() => {});
  await H.hopTo(P, bm.x + 30, bm.y + 50, { step: 100, gap: 260, tries: 160 });
  await P.page.waitForTimeout(1200);
  const css = await P.page.evaluate(() => {
    const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
    const n = (S.npcs || []).find((q) => q.name === 'Beastmaster Bro');
    return n && S.camera ? { x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) - 26 } : null;
  });
  if (css) await P.page.touchscreen.tap(css.x, css.y);
  const tapped = await H.waitFor(P, () => ({ tap: window.__btNpcTap || null, page: !!document.querySelector('[data-pets-panel]') }),
    (v) => v.page, { timeout: 5000, label: 'the Pets page' }).catch(() => null);
  rec.ok('his line done, a tap on him opens the Pets page', !!tapped && tapped.tap && tapped.tap.npc === 'Beastmaster Bro' && tapped.tap.result === 'pets', { css, tapped });
  await H.closeDest(P).catch(() => {});

  rec.ok('no page errors through all of it', errors.length === 0, errors.slice(0, 5));
}
