/* ═══ SPARRING AS THE OWNER PLAYED IT: NOTHING TAPPED (v2.3.3267) ═══
 *
 * The owner, after the first spar (v2.3.3265, mp-spar):
 *   "attacks need to hit the clone even when you aren't locked on target.
 *    Also the block shield button needs to appear while in combat for any of
 *    the 3 combat types. It was not there.  Also the enemy Hp bar was too small
 *    (the numbers were tiny in their hp bar) should be the same size as mine
 *    though.  The bot was tough to be beat even on easy."
 *
 * mp-spar taps a clone first (and sets the lock by hand to swing).  This one
 * never taps, on a phone in the Wheel:
 *   0. with no clone near, no shield button (nothing to fight);
 *   1. a dummy sword clone beside you: the shield button is up before any blow;
 *      the sword finds the clone by itself, as it finds a monster (the auto
 *      target, a player lock it owns); held, the attack lands (the worker's
 *      pvp_hit), each swing's claim naming the clone;
 *   2. the clone's HP bar is your bar's size, its number your number's;
 *   3. the bow, nothing locked (a bow locks only by a tap): the shield button
 *      is still up, aimed at the clone it looses, and its arrows land;
 *   4. the staff, the same, its bolts land;
 *   5. Easy clones (a sword, a bow, a staff) fight you -- their blows arrive --
 *      and throw no special and never lunge;
 *   6. cleared, and the fight over, the shield button goes;
 *   7. no page errors. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

const spar = (P) => P.page.evaluate(() => (window.__btSpar ? JSON.parse(JSON.stringify(window.__btSpar)) : null));
async function waitSpar(P, pred, ms = 15000) {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    const s = await spar(P);
    if (s && pred(s)) return s;
    await P.page.waitForTimeout(300);
  }
  return spar(P);
}
/* the worker's hits to and from me (gameEvents.js pvp_hit, the fight-food probe) */
const hitsSince = (P, t0) => P.page.evaluate((t0) => ((window.__btFightFood && window.__btFightFood.hits) || []).filter((h) => h.at >= t0), t0);
const shieldUi = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-shield]');
  const q = typeof window.__btShieldBtn === 'function' ? window.__btShieldBtn() : null;
  if (!el) return { found: false, probe: q };
  const r = el.getBoundingClientRect();
  return { found: true, onScreen: r.width > 20 && r.height > 20 && r.bottom > 0 && r.top < innerHeight, probe: q };
});
const lockOf = (P) => H.readState(P, (S) => (S.lockedTarget
  ? { type: S.lockedTarget.type, id: S.lockedTarget.id != null ? String(S.lockedTarget.id) : null, spar: !!S.lockedTarget.spar, src: S.lockedTarget.src || null }
  : null));
const cloneAt = (P, id) => P.page.evaluate((id) => {
  const o = window._gameState.current.others[id];
  return o ? { x: o.renderX != null ? o.renderX : o.x, y: o.renderY != null ? o.renderY : o.y } : null;
}, id);
/* hold the attack aimed at a clone, nothing locked: the right stick dragged
   toward it, as a thumb aims a bow or staff (the aim the fire chain reads) */
const aimAt = (P, id, on) => P.page.evaluate(({ id, on }) => {
  const S = window._gameState.current;
  const o = S.others[id];
  if (!on) { S.autoAttack = false; S._aiming = false; return true; }
  if (!o) return false;
  const x = o.renderX != null ? o.renderX : o.x, y = o.renderY != null ? o.renderY : o.y;
  S._aimAngle = Math.atan2(y - S.player.y, x - S.player.x);
  S._aimSrc = 'stick';
  S._aiming = true;
  S.autoAttack = true;
  return true;
}, { id, on });

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Sparrer', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
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
  await H.devOp(wsPort, 'kit', myId, { what: 'weapons' });
  await H.devOp(wsPort, 'kit', myId, { what: 'shield' });
  await P.page.waitForTimeout(1800);
  /* the shield on your arm, as the bag wears one (mp-pvpshield's line) */
  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    if (R && !R.shield && (R.shieldStash || []).length) R.shield = R.shieldStash[0];
    if (R && R._quests) R._quests.tut_4 = 'turnedIn';   /* the onboarding coach covers the band */
  });
  const eq = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
  await P.page.waitForTimeout(1500);
  const setup = await H.readState(P, (S) => ({ caps: !!(S._serverCaps && S._serverCaps.spar), shield: !!(S.rpg && S.rpg.shield), slot: S.rpg && S.rpg.activeSlot }));
  rec.ok('setup: in the Wheel with a sword and a shield, the worker spars', zone === 'wheel' && eq.ok && setup.caps && setup.shield, { zone, eq, setup });

  /* ── 0. nothing near: no shield button ── */
  await P.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; S.lastDamageTaken = 0; S._shieldThreat = null; });
  await H.waitUi(P, () => !document.querySelector('[data-shield]'), { label: 'no button', timeout: 5000 }).catch(() => {});
  const b0 = await shieldUi(P);
  rec.ok('0 with no clone near, no shield button (nothing to fight)', !b0.found, b0);

  /* ── 1. a dummy sword clone; nothing tapped ── */
  /* out on the open square first: a clone arrives on a ring 220 px round you,
     and from the Town Hall's steps that ring can stand inside the hall */
  {
    const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    await H.hopTo(P, me.x, me.y + 280, { step: 70, gap: 300, tries: 20 });
    await P.page.waitForTimeout(800);
  }
  await H.devOp(wsPort, 'spar', myId, { skill: 'dummy', add: 'sword' });
  const s1 = await waitSpar(P, (s) => s.state && s.state.clones && s.state.clones.length === 1);
  const swId = s1 && s1.state && s1.state.clones[0] ? s1.state.clones[0].id : null;
  await P.page.waitForTimeout(1200);
  await H.waitUi(P, () => !!document.querySelector('[data-shield]'), { label: 'the shield button', timeout: 5000 }).catch(() => {});
  const b1 = await shieldUi(P);
  const hurt1 = await H.readState(P, (S) => S.lastDamageTaken || 0);
  rec.ok('1a a dummy clone beside you: the shield button is up before any blow', !!swId && b1.found && b1.onScreen && !hurt1, { b1, hurt1, swId });
  /* stand beside it (a sword's reach), and let the sword find it */
  const c1 = swId ? await cloneAt(P, swId) : null;
  if (c1) await H.hopTo(P, c1.x - 40, c1.y, { step: 60, gap: 300, tries: 30 });
  let lock1 = null;
  for (const t0 = Date.now(); Date.now() - t0 < 6000;) {
    lock1 = await lockOf(P);
    if (lock1 && lock1.id === swId) break;
    await P.page.waitForTimeout(300);
  }
  rec.ok('1b the sword finds the clone by itself, as a monster (an auto lock, no tap)', !!lock1 && lock1.id === swId && lock1.type === 'player' && lock1.spar && lock1.src === 'auto', lock1);
  const t1 = Date.now();
  await P.page.evaluate(() => { window.__btSparClaims = []; window._gameState.current.autoAttack = true; });
  let h1 = [];
  for (const t0 = Date.now(); Date.now() - t0 < 14000;) {
    await P.page.waitForTimeout(600);
    h1 = (await hitsSince(P, t1)).filter((h) => h.attacker === myId && h.target === swId && h.dmgTaken > 0);
    if (h1.length >= 2) break;
  }
  await P.page.evaluate(() => { window._gameState.current.autoAttack = false; });
  const claims1 = await P.page.evaluate(() => (window.__btSparClaims || []).slice());
  rec.ok('1c held, the attack lands on it (the worker\'s pvp_hit)', h1.length > 0, (await hitsSince(P, t1)).slice(0, 4));
  rec.ok('1d ...each swing\'s claim naming the clone, at most 3 a swing', claims1.length > 0 && claims1.every((c) => c.id === swId)
    && Object.values(claims1.reduce((m, c) => { m[c.sw] = (m[c.sw] || 0) + 1; return m; }, {})).every((n) => n <= 3), claims1.slice(0, 6));

  /* ── 2. its HP bar: your bar's size ── */
  await H.devOp(wsPort, 'vitals', myId, { hp: 70 });
  {
    /* side by side, for the picture: you 70 px west of it */
    const c2 = swId ? await cloneAt(P, swId) : null;
    if (c2) await H.hopTo(P, c2.x - 70, c2.y, { step: 40, gap: 300, tries: 12 });
  }
  await P.page.waitForTimeout(1400);
  const bar = await P.page.evaluate(() => window.__btPeerHpBar ? JSON.parse(JSON.stringify(window.__btPeerHpBar)) : null);
  await P.page.screenshot({ path: join(OUT, 'sparfight-bars.png') });
  rec.ok('2 the clone\'s HP bar is up, your bar\'s size (76 x 22) and your number\'s size (18 px)',
    !!bar && bar.shown && bar.size && bar.mine && bar.size.w === bar.mine.w && bar.size.h === bar.mine.h && bar.size.font === bar.mine.font
      && bar.mine.w === 76 && bar.mine.h === 22 && bar.mine.font === 18, bar);

  /* ── 3. the bow, nothing locked ── */
  const eqB = await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged');
  await P.page.waitForTimeout(1500);
  const c3 = swId ? await cloneAt(P, swId) : null;
  if (c3) await H.hopTo(P, c3.x - 220, c3.y, { step: 80, gap: 300, tries: 30 });
  await P.page.waitForTimeout(1200);
  const lock3 = await lockOf(P);
  const b3 = await shieldUi(P);
  rec.ok('3a with the bow nothing is locked (a bow locks by a tap) -- and the shield button is still up', eqB.ok && !lock3 && b3.found, { eqB, lock3, b3 });
  const t3 = Date.now();
  let h3 = [];
  for (const t0 = Date.now(); Date.now() - t0 < 15000;) {
    await aimAt(P, swId, true);
    await P.page.waitForTimeout(500);
    h3 = (await hitsSince(P, t3)).filter((h) => h.attacker === myId && h.target === swId && h.dmgTaken > 0);
    if (h3.length >= 2) break;
  }
  const lock3b = await lockOf(P);
  await aimAt(P, swId, false);
  rec.ok('3b aimed at the clone, the bow looses and its arrows land -- still nothing locked', h3.length > 0 && !lock3b, { hits: h3.length, lock3b, sample: (await hitsSince(P, t3)).slice(0, 3) });

  /* ── 4. the staff, nothing locked ── */
  const eqS = await H.equipWeapon(P, 'staff', 'staffWeapon', 'staff');
  await P.page.waitForTimeout(1500);
  const b4 = await shieldUi(P);
  const t4 = Date.now();
  let h4 = [];
  for (const t0 = Date.now(); Date.now() - t0 < 15000;) {
    await aimAt(P, swId, true);
    await P.page.waitForTimeout(500);
    h4 = (await hitsSince(P, t4)).filter((h) => h.attacker === myId && h.target === swId && h.dmgTaken > 0);
    if (h4.length >= 2) break;
  }
  const lock4 = await lockOf(P);
  await aimAt(P, swId, false);
  rec.ok('4a with the staff the shield button is still up', eqS.ok && b4.found, { eqS, b4 });
  rec.ok('4b aimed at the clone, its bolts land -- nothing locked', h4.length > 0 && !lock4, { hits: h4.length, lock4 });
  await P.page.screenshot({ path: join(OUT, 'sparfight-staff.png') });

  /* ── 5. Easy clones fight you: no special, no lunge ── */
  await H.devOp(wsPort, 'vitals', myId, { heal: true });
  await H.devOp(wsPort, 'spar', myId, { clear: true });
  await P.page.waitForTimeout(1200);
  await H.devOp(wsPort, 'spar', myId, { skill: 'easy', add: 'all' });
  const s5 = await waitSpar(P, (s) => s.state && s.state.clones && s.state.clones.length === 3 && s.state.skill === 'easy');
  const ids5 = s5 && s5.state ? s5.state.clones.map((c) => c.id) : [];
  await P.page.evaluate((ids) => {
    const S = window._gameState.current;
    window.__btEasySeen = { specials: 0, dashes: 0, shots: 0, swings: 0 };
    const seenP = new WeakSet(), last = Object.create(null);
    window.__btEasyTap = setInterval(() => {
      for (const rp of S._remoteProjectiles || []) {
        if (!rp || seenP.has(rp) || !ids.includes(rp.ownerId)) continue;
        seenP.add(rp);
        window.__btEasySeen.shots++;
        if (rp.isSpecial) window.__btEasySeen.specials++;
      }
      for (const id of ids) {
        const o = S.others[id];
        if (!o) continue;
        if (o._swingTs && o._swingTs !== last['s' + id]) {
          last['s' + id] = o._swingTs; window.__btEasySeen.swings++;
          if (o._swingSpecial) window.__btEasySeen.specials++;
        }
        const d = o._dodgeRoll;
        if (d && d.startTime !== last['d' + id]) { last['d' + id] = d.startTime; if (d.kind === 'sworddash') window.__btEasySeen.dashes++; }
      }
    }, 50);
  }, ids5);
  const t5 = Date.now();
  for (const t0 = Date.now(); Date.now() - t0 < 22000;) {
    await P.page.waitForTimeout(2000);
    await H.devOp(wsPort, 'vitals', myId, { heal: true });   /* a long look: never knocked out */
  }
  const easy = await P.page.evaluate(() => { clearInterval(window.__btEasyTap); return window.__btEasySeen; });
  const h5 = (await hitsSince(P, t5)).filter((h) => ids5.includes(h.attacker) && h.target === myId);
  rec.ok('5a Easy clones (sword, bow, staff) still fight you: their blows arrive', ids5.length === 3 && h5.length > 0, { clones: ids5.length, hits: h5.length });
  rec.ok('5b ...and in 22 s throw no special and never lunge', (easy.swings + easy.shots) > 0 && easy.specials === 0 && easy.dashes === 0, easy);

  /* ── 6. cleared, and the fight over: the button goes ── */
  await H.devOp(wsPort, 'spar', myId, { clear: true });
  await waitSpar(P, (s) => s.state && s.state.clones && s.state.clones.length === 0, 10000);
  await P.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; S.lastDamageTaken = 0; S._shieldThreat = null; S._shieldUp = false; });
  await H.waitUi(P, () => !document.querySelector('[data-shield]'), { label: 'the button gone', timeout: 6000 }).catch(() => {});
  const b6 = await shieldUi(P);
  rec.ok('6 cleared, and the fight over, the shield button goes', !b6.found, b6);

  rec.ok('7 no page errors', errors.length === 0, errors.slice(0, 5));
  await P.ctx.close().catch(() => {});
}
