/* ═══ LEAVING IN THE MIDDLE OF A FIGHT, ON TWO SCREENS (v2.3.3260) ═══
 * (server/src/linger.js, docs/specs/pvp-fights.md "Leaving in the middle of
 * a fight")
 *
 * Owner: "Also what happens if a player leaves mid-game while they are
 * attacked?" -- closing the game took the body out of the world at once, a
 * free escape from a fight in No man's land.  Two real players against a
 * real worker, out on a Lv 6-10 ring:
 *   1. the raider's swing lands on the wanderer;
 *   2. the wanderer closes the game: the worker keeps the body (in the room,
 *      not disconnected), and the raider still sees it -- no player_leave;
 *   3. the raider swings again and it lands on the body left behind;
 *   4. the wanderer launches the game again: the join is refused while the
 *      body stands -- "Your bro is still in that fight" with its countdown;
 *   5. then they come in, once the body has gone; the worker saved the HP
 *      the body had (the relaunch's stop in today's town then heals it, as
 *      it always has); the raider was told the body left when its time was
 *      up;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/linger-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEW = { width: 1000, height: 780 };
const LINGER_MS = 20000;   /* server/src/linger.js LINGER.MS */

const peerOnScreen = (P, id) => P.page.evaluate((pid) => {
  const S = window._gameState.current;
  const o = S.others && S.others[pid];
  const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
  if (!o || !S.camera || !cv) return null;
  const r = cv.getBoundingClientRect();
  const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
  return { x: r.left + (ox - S.camera.x) * (S._worldScaleX || 1), y: r.top + (oy - S.camera.y) * (S._worldScaleY || 1) };
}, id);

async function swingAt(A, id) {
  const pt = await peerOnScreen(A, id);
  if (!pt) return false;
  await A.page.mouse.move(pt.x, pt.y - 4);
  await A.page.waitForTimeout(60);
  await A.page.mouse.down();
  await A.page.waitForTimeout(220);
  await A.page.mouse.up();
  await A.page.waitForTimeout(450);
  return true;
}

/* walk the raider until the worker has the two within reach (mp-duel's) */
async function closeIn(A, wsPort, aId, bId, want = 34) {
  for (let i = 0; i < 16; i++) {
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
    if (!pa || !pb) return { ok: false, why: 'no server state' };
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const d = Math.hypot(dx, dy);
    if (d <= want) return { ok: true, d: Math.round(d) };
    const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : (dy > 0 ? 's' : 'w');
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(Math.min(500, Math.max(90, (d - want) * 2.2)));
    await A.page.keyboard.up(key);
    await A.page.waitForTimeout(320);
  }
  return { ok: false };
}

const inWheel = async (P) => {
  for (let i = 0; i < 120; i++) {
    const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone)).catch(() => null);
    if (z === 'wheel') return true;
    await P.page.waitForTimeout(500);
  }
  return false;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `linger-${name}.png`) }).catch(() => {});
  const A = await H.newPlayer(browser, { name: 'Raider', wsPort, webPort, world: 'wheel', viewport: VIEW });
  const B = await H.newPlayer(browser, { name: 'Wanderer', wsPort, webPort, world: 'wheel', viewport: VIEW });
  await H.enterWorld(A);
  await H.enterWorld(B);
  const okA = await inWheel(A), okB = await inWheel(B);
  await A.page.waitForTimeout(2500);
  const idA = await H.readState(A, (S) => S.myId);
  const idB = await H.readState(B, (S) => S.myId);
  const phraseB = await B.page.evaluate(() => { try { return localStorage.getItem('bt_passphrase'); } catch (e) { return null; } });
  /* v2.3.3343: and its device -- the relaunch below is the same player on the
     same phone (a character's key works only on its devices: devicelock.js) */
  const { device: deviceB } = await H.keyAndDevice(B);
  rec.ok('setup: both in the Wheel, the wanderer\'s Login Key known (guard)', okA && okB && !!phraseB, { okA, okB, phrase: !!phraseB });
  if (!(okA && okB && phraseB)) { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }

  /* real input on a loop on both: a page logs itself out after two minutes
     without any (Control does nothing in the game); B's stops when it closes */
  let stopAlive = false;
  for (const P of [A, B]) {
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }
  const errorsA = A.logs, errorsBefore = A.logs.length;

  /* armed the game's way (mp-nomansland): tut_1 pays a greatsword */
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await A.page.waitForTimeout(1800);
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg; if (!R || !S.channel) return;
    const i = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
    if (i < 0) return;
    R.weapon = R.weaponStash[i]; R.weaponStash.splice(i, 1); R.activeSlot = 'melee';
    S.channel.send({ type: 'equip_request', payload: { stashIdx: i, slot: 'weapon' } });
  });
  await A.page.waitForTimeout(1500);
  await H.devOp(wsPort, 'quests', idA);
  await H.devOp(wsPort, 'quests', idB);

  /* ── out to a quiet spot on a Lv 6-10 ring, untouchable on the way ── */
  for (const id of [idA, idB]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 6 });
  /* v2.3.3315: the Wheel the worker plays, and No man's land's rings as wide
     as its stretches (TRAPS §196; mp-nomansland's) */
  const LONG = (await H.wheelGeom()).long;
  const { WHEEL_SPAWNS, WHEEL_CENTRE } = await import(H.REPO + '/server/src/wheelspawns.js');
  const { NML } = await import(H.REPO + '/src/data/noMansLandRings.js');
  const T = NML.TIER * LONG;
  const monsterPts = [];
  for (const k of Object.keys(WHEEL_SPAWNS)) {
    for (const p of WHEEL_SPAWNS[k].points) monsterPts.push(p);
    for (const d of Object.values(WHEEL_SPAWNS[k].deeper || {})) for (const p of d.points) monsterPts.push(p);
  }
  const cands = [];
  for (const land of Object.keys(WHEEL_SPAWNS)) {
    const a = WHEEL_SPAWNS[land].anchor;
    const L = Math.hypot(a[0] - WHEEL_CENTRE[0], a[1] - WHEEL_CENTRE[1]);
    const ux = (a[0] - WHEEL_CENTRE[0]) / L, uy = (a[1] - WHEEL_CENTRE[1]) / L;
    for (let r = NML.HUB + T + 160; r <= NML.HUB + 2 * T - 160; r += 50 * LONG) {
      for (let lat = -600; lat <= 600; lat += 50) {
        const x = WHEEL_CENTRE[0] + ux * r - uy * lat, y = WHEEL_CENTRE[1] + uy * r + ux * lat;
        let md = Infinity;
        for (const p of monsterPts) md = Math.min(md, Math.hypot(p[0] - x, p[1] - y));
        cands.push({ land, x: Math.round(x), y: Math.round(y), md: Math.round(md) });
      }
    }
  }
  cands.sort((p, q) => q.md - p.md);
  const perLand = Object.create(null), tryList = [];
  for (const c of cands) { perLand[c.land] = (perLand[c.land] || 0) + 1; if (perLand[c.land] <= 2) tryList.push(c); }
  let spot = null;
  for (const c of tryList.slice(0, 12)) {
    await H.hopTo(A, c.x, c.y, { tries: 90 });
    await A.page.waitForTimeout(1500);
    const ok = await A.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      const dry = (px, py) => !(window.__btIsSolid && window.__btIsSolid(px, py)) && !(window.__btSwimAt && window.__btSwimAt(px, py).swim);
      const near = (S.monsters || []).filter((m) => m && m.alive !== false && Math.hypot(m.x - x, m.y - y) < 300).length;
      return { dry: dry(x, y) && dry(x + 50, y) && dry(x + 25, y), near };
    }, c);
    if (ok.dry && ok.near === 0) { spot = c; break; }
  }
  rec.ok(`setup: a dry, quiet spot on a Lv 6-10 ring (${spot ? spot.land : 'none'})`, !!spot, spot);
  if (!spot) { stopAlive = true; await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }
  await H.hopTo(B, spot.x + 50, spot.y, { tries: 90 });
  await B.page.waitForTimeout(2500);

  /* ── 1. a swing lands ── */
  await closeIn(A, wsPort, idA, idB, 60);
  await A.page.evaluate(() => { if (window.__btNmlAsk) window.__btNmlAsk.setMs(30000); });
  let asked = null;
  for (let i = 0; i < 4 && !asked; i++) {
    const at = await peerOnScreen(A, idB);
    if (at) await A.page.mouse.click(at.x, at.y - 4);
    await A.page.waitForTimeout(500);
    asked = await A.page.evaluate(() => {
      const el = document.querySelector('[data-nml-ask-attack]');
      if (!el) return null;
      const q = el.getBoundingClientRect();
      return { x: q.left + q.width / 2, y: q.top + q.height / 2 };
    });
  }
  if (asked) await A.page.mouse.click(asked.x, asked.y);
  await A.page.waitForTimeout(500);
  await closeIn(A, wsPort, idA, idB, 34);
  await H.devOp(wsPort, 'vitals', idB, { heal: true, god: false });
  const hp0 = ((await H.serverPlayer(wsPort, idB)) || {}).hp;
  let hp1 = hp0;
  for (let i = 0; i < 8 && !(hp1 < hp0); i++) { await swingAt(A, idB); hp1 = ((await H.serverPlayer(wsPort, idB)) || {}).hp; }
  rec.ok(`1. the raider's swing lands: the wanderer's HP ${hp0} -> ${hp1}`, typeof hp0 === 'number' && hp1 < hp0, { asked: !!asked, hp0, hp1 });

  /* the raider's screen, from here: does it ever hear the wanderer left? */
  await A.page.evaluate((pid) => {
    const S = window._gameState.current;
    window.__lgSeen = [];
    const t = setInterval(() => { window.__lgSeen.push({ at: Date.now(), there: !!(S.others && S.others[pid]) }); }, 250);
    window.__lgStop = () => clearInterval(t);
  }, idB);

  /* low enough that the body's out-of-fight healing cannot refill it before
     it goes: a rejoin that came back at full health would be plain to see */
  await H.devOp(wsPort, 'vitals', idB, { heal: false, hp: 20 });
  await B.page.waitForTimeout(400);
  const maxB = ((await H.adminPlayer(wsPort, idB)).rpg || {}).maxHp || 0;

  /* ── 2. the wanderer closes the game ── */
  const leftAt = Date.now();
  await B.ctx.close().catch(() => {});
  await A.page.waitForTimeout(2500);
  const body = await H.adminPlayer(wsPort, idB);
  const seen2 = await A.page.evaluate((pid) => { const S = window._gameState.current; return !!(S.others && S.others[pid]); }, idB);
  rec.ok('2. the wanderer closes the game: the worker keeps the body in the world (not disconnected)',
    !!body.live && body.live.disconnected === false, body.live);
  rec.ok('2. ...and the raider still sees it (no player_leave)', seen2);
  await shot(A, '2-body');

  /* ── 3. the body can still be hit ── */
  await closeIn(A, wsPort, idA, idB, 34);
  const hp2 = ((await H.serverPlayer(wsPort, idB)) || {}).hp;
  let hp3 = hp2;
  for (let i = 0; i < 6 && !(hp3 < hp2); i++) { await swingAt(A, idB); hp3 = ((await H.serverPlayer(wsPort, idB)) || {}).hp; }
  rec.ok(`3. the raider's swing lands on the body left behind: ${hp2} -> ${hp3} (${Math.round((Date.now() - leftAt) / 1000)} s after leaving)`,
    typeof hp2 === 'number' && hp3 < hp2, { hp2, hp3 });

  /* ── 4. the wanderer launches the game again ── */
  /* the body's HP as the worker holds it, to its last moment in the world:
     an unhit body heals out of a fight like anyone (6 s after a hit), so the
     HP a rejoin must carry is the body's LAST, not the one after the hit */
  /* ...and what the worker SAVED the moment the body went (the record's HP,
     between the body leaving and the relaunch coming in -- a relaunch then
     stops in today's town, whose hub healing refills 10% of the bar every
     ~0.7 s, so the HP after it is no evidence either way) */
  let bodyHp = hp3, savedHp = null, watching = true;
  const watch = (async () => {
    while (watching) {
      const a = await H.adminPlayer(wsPort, idB).catch(() => ({}));
      if (a.live && a.live.disconnected === false && Date.now() - leftAt < LINGER_MS) bodyHp = a.live.hp;
      if (!a.live && savedHp == null && Date.now() - leftAt > 5000 && a.rpg) savedHp = a.rpg.hp;
      await new Promise((r) => setTimeout(r, 100));
    }
  })();
  const B2 = await H.newPlayer(browser, { name: 'Wanderer', wsPort, webPort, world: 'wheel', viewport: VIEW, phrase: phraseB, device: deviceB });
  const entering = H.enterWorld(B2, 120000).then(() => true).catch((e) => String(e));
  let screen = null;
  for (let i = 0; i < 80 && !screen; i++) {
    await B2.page.waitForTimeout(250);
    screen = await B2.page.evaluate(() => {
      const el = document.getElementById('bt-linger-wait');
      if (!el) return null;
      return { text: el.textContent, probe: window.__btLingerWait || null };
    }).catch(() => null);
  }
  rec.ok(`4. a fresh launch while the body stands is held: "${screen ? screen.text.slice(0, 40) : ''}..."`,
    !!screen && /still in that fight/.test(screen.text) && /Back in \d+s/.test(screen.text), screen);
  await shot(B2, '4-wait');

  /* ── 5. in, once the body has gone ── */
  const inAgain = await entering;
  const arrivedAt = Date.now();
  watching = false;
  await watch;
  const inW = inAgain === true ? await inWheel(B2) : false;
  const back = await H.adminPlayer(wsPort, idB);
  const seen = await A.page.evaluate(() => { window.__lgStop && window.__lgStop(); return window.__lgSeen || []; });
  const goneAt = (() => { const g = seen.find((s) => !s.there); return g ? g.at : null; })();
  rec.ok(`5. the wanderer comes in once the body has gone (${Math.round((arrivedAt - leftAt) / 1000)} s after leaving), in the Wheel`,
    inAgain === true && inW && arrivedAt - leftAt >= 19000, { inAgain, inW, s: (arrivedAt - leftAt) / 1000 });
  /* within one regen tick (1% of the bar) of its last reading, and nowhere
     near full: the body's HP, carried */
  rec.ok(`5. ...and the worker saved the HP the body had when it went (${bodyHp} of ${maxB}, ${hp3} after the hit): ${savedHp}`,
    savedHp != null && maxB > 0 && Math.abs(savedHp - bodyHp) <= Math.ceil(maxB * 0.02) && savedHp < maxB * 0.8,
    { hp3, bodyHp, savedHp, maxB, afterTown: back.live && back.live.hp });
  rec.ok(`5. ...and the raider was told it left when its time was up (${goneAt ? Math.round((goneAt - leftAt) / 1000) : '-'} s)`,
    !!goneAt && goneAt - leftAt >= 19000 && goneAt - leftAt <= 26000, { goneAt: goneAt && goneAt - leftAt });
  await shot(B2, '5-back');

  const errs = errorsA.slice(errorsBefore).filter((l) => /pageerror/.test(l)).concat(B2.logs.filter((l) => /pageerror/.test(l)));
  rec.ok('6. no page errors', errs.length === 0, errs);
  stopAlive = true;
  await A.ctx.close().catch(() => {});
  await B2.ctx.close().catch(() => {});
}
