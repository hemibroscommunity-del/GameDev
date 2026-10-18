/* ═══ SPARRING CLONES ON A REAL PHONE (v2.3.3265) ═══
 *
 * Owner, 2026-10-15: "I wish I could test PvP somehow. Can you make a special
 * environment where I can go to attack clones of myself using different
 * weapons and you just have them attack me using AI? Purely for testing
 * purposes. Maybe this is better to add to the admin window".
 *
 * The worker's half (server/src/spar.js) has its own suite
 * (server/test/spar.test.mjs).  This checks the owner's half, on a phone in
 * the Wheel, through the real test panel:
 *   1. the panel shows its Sparring section (caps.spar), and "All three"
 *      brings a sword, a bow and a staff clone -- the panel closes;
 *   2. the page knows them (spar_state) and draws them as players beside you,
 *      named, each with its weapon and your look;
 *   3. as dummies they stand still and never attack;
 *   4. a tap on one AIMS at it (no card), and your sword lands on it: the
 *      worker's pvp_hit, its health bar, your number over it;
 *   5. as fighters they attack you: their hits arrive from the worker, their
 *      swings and shots are drawn on your screen, and a bolt chases you;
 *   6. a knockout by a clone is not a death: no death screen, healed where you
 *      stand, "Knocked out! Healed", the score;
 *   7. Clear sends them home on your screen too;
 *   8. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

const holdTitle = async (P, ms) => {
  const at = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-zone-header__title');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (!at) return false;
  await P.page.mouse.move(at.x, at.y);
  await P.page.mouse.down();
  await P.page.waitForTimeout(ms);
  await P.page.mouse.up();
  return true;
};
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
async function openPanel(P) {
  for (let i = 0; i < 3; i++) {
    if (await panelUp(P)) return true;
    await holdTitle(P, 2200);
    for (const t0 = Date.now(); Date.now() - t0 < 8000;) {
      if (await panelUp(P)) return true;
      await P.page.waitForTimeout(250);
    }
  }
  return panelUp(P);
}
const clickSel = (P, sel) => P.page.evaluate((s) => {
  const b = document.querySelector(s);
  if (!b || b.disabled) return false;
  b.click();
  return true;
}, sel);
const spar = (P) => P.page.evaluate(() => (window.__btSpar ? JSON.parse(JSON.stringify(window.__btSpar)) : null));
async function waitSpar(P, pred, ms = 15000) {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    const s = await spar(P);
    if (s && pred(s)) return s;
    await P.page.waitForTimeout(300);
  }
  return spar(P);
}
const peerOnScreen = (P, id) => P.page.evaluate((pid) => {
  const S = window._gameState.current;
  const o = S.others && S.others[pid];
  const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
  if (!o || !S.camera || !cv) return null;
  const r = cv.getBoundingClientRect();
  const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
  return { x: r.left + (ox - S.camera.x) * (S._worldScaleX || 1), y: r.top + (oy - S.camera.y) * (S._worldScaleY || 1) };
}, id);
/* every popup a page draws, kept as it appears (mp-pvpextras's recorder) */
const recordPops = (P) => P.page.evaluate(() => {
  if (window.__btPopRec) return;
  const seen = new WeakSet();
  window.__btPopLog = [];
  window.__btPopRec = setInterval(() => {
    const S = window._gameState && window._gameState.current;
    for (const d of (S && S.dmgNumbers) || []) {
      if (!d || seen.has(d)) continue;
      seen.add(d);
      window.__btPopLog.push({ at: Date.now(), text: String(d.text), color: d.color });
      if (window.__btPopLog.length > 500) window.__btPopLog.splice(0, 100);
    }
  }, 60);
});
const popsSince = (P, t0) => P.page.evaluate((t0) => (window.__btPopLog || []).filter((d) => d.at >= t0 - 50), t0);
/* the worker's hits to and from me (gameEvents.js pvp_hit, the fight-food probe) */
const hitsSince = (P, t0) => P.page.evaluate((t0) => ((window.__btFightFood && window.__btFightFood.hits) || []).filter((h) => h.at >= t0), t0);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, {
    name: 'Sparrer', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel',
    /* the admin key, as the owner saved it on their phone (DevPanel's KEY_LS) */
    init: 'try { localStorage.setItem("bt_dev_key", ' + JSON.stringify(H.ADMIN_KEY) + '); } catch (e) {}',
  });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2500);
  const myId = await H.readState(P, (S) => S.myId);
  /* a sword in hand (the kit's, equipped as the bag equips it) */
  await H.devOp(wsPort, 'kit', myId, { what: 'weapons' });
  await P.page.waitForTimeout(1800);
  const eq = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
  await P.page.waitForTimeout(1500);
  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.spar));
  rec.ok('setup: in the Wheel with a sword, and the worker says it spars (caps.spar)', zone === 'wheel' && eq.ok && caps, { zone, eq, caps });
  await recordPops(P);

  /* ── 1. the panel, its section, and All three ── */
  const opened = await openPanel(P);
  const section = await P.page.evaluate(() => !!document.querySelector('[data-dev-spar-add="all"]') && !document.querySelector('[data-spar-off]'));
  await P.page.evaluate(() => { const b = document.querySelector('[data-dev-spar-add="all"]'); if (b) b.scrollIntoView({ block: 'center' }); });
  await P.page.waitForTimeout(400);
  await P.page.screenshot({ path: join(OUT, 'spar-panel.png') });
  rec.ok('1a the test panel opens and shows its Sparring section', opened && section, { opened, section });
  await clickSel(P, '[data-dev-spar-skill="dummy"]');
  await P.page.waitForTimeout(1500);
  await clickSel(P, '[data-dev-spar-add="all"]');
  const s1 = await waitSpar(P, (s) => s.state && s.state.clones && s.state.clones.length === 3);
  await P.page.waitForTimeout(1200);
  rec.ok('1b "All three" brings a sword, a bow and a staff clone (spar_state)', !!s1 && s1.state && s1.state.clones.length === 3
    && ['sword', 'bow', 'staff'].every((w) => s1.state.clones.some((c) => c.weapon === w)), s1 && s1.state);
  rec.ok('1c ...and the panel closes so you can fight', !(await panelUp(P)));
  const ids = s1 && s1.state ? s1.state.clones.map((c) => c.id) : [];
  const idOf = (w) => { const c = s1 && s1.state && s1.state.clones.find((q) => q.weapon === w); return c ? c.id : null; };

  /* ── 2. drawn as players beside you ── */
  const seen = await P.page.evaluate((ids) => {
    const S = window._gameState.current;
    return ids.map((id) => {
      const o = S.others && S.others[id];
      return o ? { id, name: o.name, wpn: o.wpnType, skin: o.skin, hair: o.hair, zone: o.zone,
        d: Math.round(Math.hypot((o.renderX != null ? o.renderX : o.x) - S.player.x, (o.renderY != null ? o.renderY : o.y) - S.player.y)) } : { id, none: true };
    });
  }, ids);
  rec.ok('2a each clone is a player on your screen, named for its weapon', seen.length === 3 && seen.every((o) => !o.none && /Clone$/.test(o.name)), seen);
  rec.ok('2b ...holding its weapon (greatsword, bow, staff)', ['greatsword', 'bow', 'staff'].every((w) => seen.some((o) => o.wpn === w)), seen.map((o) => o.wpn));
  rec.ok('2c ...wearing one look, yours (skin and hair alike)', seen.every((o) => o.skin === seen[0].skin && o.hair === seen[0].hair), seen.map((o) => [o.skin, o.hair]));
  rec.ok('2d ...standing beside you in the Wheel', seen.every((o) => o.zone === 'wheel' && o.d < 400), seen.map((o) => o.d));
  await P.page.screenshot({ path: join(OUT, 'spar-clones.png') });

  /* ── 3. dummies stand still and never attack ── */
  const t3 = Date.now();
  const where0 = await P.page.evaluate((ids) => ids.map((id) => { const o = window._gameState.current.others[id]; return o ? [o.x, o.y] : null; }), ids);
  await P.page.waitForTimeout(4000);
  const where1 = await P.page.evaluate((ids) => ids.map((id) => { const o = window._gameState.current.others[id]; return o ? [o.x, o.y] : null; }), ids);
  const h3 = (await hitsSince(P, t3)).filter((h) => ids.includes(h.attacker));
  rec.ok('3 dummies stand still and never attack', h3.length === 0 && where0.every((w, i) => w && where1[i] && Math.hypot(w[0] - where1[i][0], w[1] - where1[i][1]) < 2), { hits: h3.length, where0, where1 });

  /* ── 4. a tap aims at one, and your sword lands ── */
  const swId = idOf('sword');
  /* v2.3.3266: the clones stand on a ring at a random angle, so the sword
     clone can stand at the screen's edge, under a control or a card (found:
     x 62 of 390, where the tap never reached the world).  A thumb taps a
     player out in the open: step so it stands above you, mid-screen, first */
  const under = (q) => P.page.evaluate((q) => {
    const el = document.elementFromPoint(q.x, q.y - 4);
    return el ? (el.tagName === 'CANVAS' ? 'canvas' : (el.className && String(el.className).slice(0, 60)) || el.tagName) : null;
  }, q);
  {
    const q0 = swId ? await peerOnScreen(P, swId) : null;
    const vw = PHONE.width;
    if (q0 && (q0.x < 90 || q0.x > vw - 90 || (await under(q0)) !== 'canvas')) {
      const at = await P.page.evaluate((id) => { const o = window._gameState.current.others[id]; return o ? { x: o.x, y: o.y } : null; }, swId);
      if (at) { await H.hopTo(P, at.x, at.y + 160); await P.page.waitForTimeout(1500); }
    }
  }
  const sp = await H.adminPlayer(wsPort, myId);
  const me = sp && sp.live;
  let pt = swId ? await peerOnScreen(P, swId) : null;
  const ptUnder = pt ? await under(pt) : null;
  if (pt) {
    await P.page.touchscreen.tap(pt.x, pt.y - 4);
    await P.page.waitForTimeout(700);
  }
  let lock = await H.readState(P, (S) => (S.lockedTarget ? { type: S.lockedTarget.type, id: S.lockedTarget.id, spar: !!S.lockedTarget.spar } : null));
  if (!(lock && lock.id === swId)) {
    /* a slow box can miss a moving frame: once more, from where it is drawn now */
    pt = await peerOnScreen(P, swId);
    if (pt) { await P.page.touchscreen.tap(pt.x, pt.y - 4); await P.page.waitForTimeout(700); }
    lock = await H.readState(P, (S) => (S.lockedTarget ? { type: S.lockedTarget.type, id: S.lockedTarget.id, spar: !!S.lockedTarget.spar } : null));
  }
  const card = await P.page.evaluate(() => !!document.querySelector('.bt-inspect'));
  rec.ok('4a a tap on a clone aims at it (no card)', !!lock && lock.id === swId && lock.spar && !card, { lock, card, pt, under: ptUnder, me: me && { x: me.x, y: me.y } });
  /* stand beside it, then swing */
  const cl = await P.page.evaluate((id) => { const o = window._gameState.current.others[id]; return o ? { x: o.x, y: o.y } : null; }, swId);
  if (cl) await H.hopTo(P, cl.x - 30, cl.y, { step: 60, gap: 300, tries: 30 });
  await P.page.waitForTimeout(800);
  const t4 = Date.now();
  await P.page.evaluate((id) => {
    const S = window._gameState.current;
    const o = S.others[id];
    if (o) S.lockedTarget = { type: 'player', id, ref: o, spar: true };
    S.autoAttack = true;
  }, swId);
  let h4 = [];
  for (const t0 = Date.now(); Date.now() - t0 < 12000 && !h4.length;) {
    await P.page.waitForTimeout(600);
    h4 = (await hitsSince(P, t4)).filter((h) => h.attacker === myId && h.target === swId && h.dmgTaken > 0);
  }
  await P.page.evaluate(() => { window._gameState.current.autoAttack = false; });
  const bar = await P.page.evaluate((id) => { const o = window._gameState.current.others[id]; return o ? { hp: o.rpgHp, max: o.rpgMaxHp, seen: !!o._hpSeenAt } : null; }, swId);
  const pops4 = await popsSince(P, t4);
  rec.ok('4b your sword lands on it: the worker\'s pvp_hit', h4.length > 0, (await hitsSince(P, t4)).slice(0, 4));
  rec.ok('4c ...its health bar is fed (hp under max)', !!bar && bar.seen && bar.hp < bar.max, bar);
  rec.ok('4d ...and your number floats over it', pops4.some((p) => /^-\d/.test(p.text)), pops4.slice(0, 6));

  /* ── 5. fighters attack you ── */
  await P.page.evaluate(() => { window.__btRemoteSeen = []; const S = window._gameState.current;
    window.__btRemoteTap = setInterval(() => { for (const rp of S._remoteProjectiles || []) { if (!rp.__seen) { rp.__seen = 1; window.__btRemoteSeen.push({ owner: rp.ownerId, staff: !!rp.isStaff, tg: rp.tg || null }); } } }, 50); });
  await H.devOp(wsPort, 'vitals', myId, { heal: true });
  const r5 = await H.devOp(wsPort, 'spar', myId, { skill: 'normal' });
  const t5 = Date.now();
  let h5 = [];
  for (const t0 = Date.now(); Date.now() - t0 < 25000;) {
    await P.page.waitForTimeout(800);
    h5 = (await hitsSince(P, t5)).filter((h) => ids.includes(h.attacker) && h.target === myId);
    if (new Set(h5.map((h) => h.attacker)).size >= 2) break;
  }
  await P.page.screenshot({ path: join(OUT, 'spar-fight.png') });
  const remote = await P.page.evaluate(() => (window.__btRemoteSeen || []).slice());
  const swings = await P.page.evaluate((ids) => ids.map((id) => { const o = window._gameState.current.others[id]; return o ? (o._swingTs || 0) : 0; }), ids);
  rec.ok('5a the clones fight you: their hits arrive from the worker', r5 && r5.ok && h5.length > 0, { r5: r5 && r5.skill, hits: h5.length, by: [...new Set(h5.map((h) => h.attacker))] });
  rec.ok('5b ...from more than one weapon', new Set(h5.map((h) => h.attacker)).size >= 2, [...new Set(h5.map((h) => h.attacker))]);
  rec.ok('5c ...their shots are drawn on your screen', remote.some((r) => ids.includes(r.owner)), remote.slice(0, 6));
  rec.ok('5d ...a staff clone\'s bolt chases you (tg)', !remote.some((r) => r.owner === idOf('staff') && r.staff) || remote.some((r) => r.owner === idOf('staff') && r.tg === myId), remote.filter((r) => r.staff).slice(0, 3));
  rec.ok('5e ...and the sword clone\'s swing is drawn (its swing stamp)', swings[ids.indexOf(swId)] > t5, { swings, t5 });

  /* ── 6. a knockout is not a death ── */
  /* v2.3.3425: the page's own record, every 50 ms: when the knockout's note
     came and what the bar read after it.  The check read the bar 1.5 s after
     this script saw the note, and the script polls a page that draws a few
     frames a second -- seen a second late, its read fell past the clones'
     SPAR.PAUSE_MS stand-off, and Hard clones had the healed bar down to 7 of
     250 by then (TRAPS §200).  The heal is what is asked: the bar during the
     stand-off, from the note on. */
  const { SPAR } = await import(H.REPO + '/server/src/spar.js');
  await P.page.evaluate(() => {
    const S = window._gameState.current, log = window.__btKoLog = { koAt: 0, n0: ((window.__btSpar || {}).notes || []).length, samples: [] };
    window.__btKoRec = setInterval(() => {
      const notes = (window.__btSpar || {}).notes || [];
      if (!log.koAt && notes.slice(log.n0).includes('ko')) log.koAt = Date.now();
      log.samples.push({ at: Date.now(), hp: S.rpg ? S.rpg.hp : null, max: S.rpg ? S.rpg.maxHp : null, dying: !!S._dying });
      if (log.samples.length > 2000) log.samples.splice(0, 500);
    }, 50);
  });
  await H.devOp(wsPort, 'vitals', myId, { hp: 1, heal: false });
  await H.devOp(wsPort, 'spar', myId, { skill: 'hard' });
  const t6 = Date.now();
  const s6 = await waitSpar(P, (s) => s.notes && s.notes.includes('ko'), 30000);
  await P.page.waitForTimeout(1500);
  const after = await P.page.evaluate((pauseMs) => {
    clearInterval(window.__btKoRec);
    const log = window.__btKoLog || { samples: [] };
    const win = log.koAt ? log.samples.filter((s) => s.at >= log.koAt && s.at <= log.koAt + pauseMs) : [];
    const best = win.reduce((b, s) => (s.hp > (b ? b.hp : -1) ? s : b), null);
    return { koSeen: !!log.koAt, samples: win.length, hp: best ? best.hp : null, max: best ? best.max : null,
      dying: win.some((s) => s.dying), dead: !best || !(best.hp > 0) };
  }, SPAR.PAUSE_MS);
  const pops6 = await popsSince(P, t6);
  const died = (await popsSince(P, t6)).some((p) => /YOU DIED|Respawning/.test(p.text));
  rec.ok('6a a clone knocks you out (ko)', !!s6 && s6.notes.includes('ko'), s6 && s6.notes);
  rec.ok('6b ...no death: healed where you stand (the bar while the clones stand back)', after.koSeen && after.samples > 0 && !after.dying && after.hp > 0 && after.hp >= after.max * 0.5, after);
  rec.ok('6c ...no death on the page (no "YOU DIED")', !died);
  rec.ok('6d ..."Knocked out! Healed" over you', pops6.some((p) => /Knocked out/.test(p.text)), pops6.slice(0, 8));
  rec.ok('6e ...and the score counts it', !!s6 && s6.state && s6.state.rounds && s6.state.rounds.clones >= 1, s6 && s6.state && s6.state.rounds);

  /* ── 7. Clear ── */
  await H.devOp(wsPort, 'spar', myId, { skill: 'dummy' });
  const opened7 = await openPanel(P);
  await clickSel(P, '[data-dev-spar-clear="1"]');
  const s7 = await waitSpar(P, (s) => s.state && s.state.clones && s.state.clones.length === 0, 10000);
  await P.page.waitForTimeout(1500);
  const left = await P.page.evaluate((ids) => ids.filter((id) => !!window._gameState.current.others[id]), ids);
  rec.ok('7 Clear sends them home: gone from your screen (player_leave)', opened7 && !!s7 && s7.state.clones.length === 0 && left.length === 0, { left, s7: s7 && s7.state });

  rec.ok('8 no page errors', errors.length === 0, errors.slice(0, 5));
  await P.page.evaluate(() => { if (window.__btRemoteTap) clearInterval(window.__btRemoteTap); if (window.__btPopRec) clearInterval(window.__btPopRec); });
  await P.ctx.close().catch(() => {});
}
