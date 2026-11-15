/* ═══ v2.3.5560: THE CHAIN BELT'S STAND-IN (beltHold.js) ═══
 *
 * The owner (2026-11-14, by the planning session): "a piece first put on
 * mid-play draws its stand-in until its sheet is ready, never nothing".  The
 * one sheet first asked for in play when armour goes on is the chain belt's
 * (its five jog sheets, packed on the body bake's worker); the stand-in the
 * planning session chose is the idle frame: while a facing's belt sheet is on
 * its way, a figure that would jog in a masked bake stands.
 *
 *   A  a phone in the Wheel, bare at login; a copper torso and copper greaves
 *      put on the real way (the kit, then worn from the bag); then a run
 *      north-east and back, the north-east jog being the masked bake's
 *      facing for a matched pair.  Until the north-east belt sheet is in:
 *      the figure stood (frames held), and NO jog frame of the plain body was
 *      drawn north-east; after it, the figure jogs.
 *   B  the same with `?beltstandin=0`: as before, the plain body's jog frames
 *      north-east while the sheet packs (a measure, not held to a line: the
 *      box's worker speed decides how many).
 *   C  page A again (the armour worn at login): the belt is in behind the
 *      loading screen, and the run north-east never stands.
 *   No page errors on either page.
 */
import * as H from './harness.mjs';

export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const NE = 'northeast';

/* the copper pair, worn the real way (as mp-armourflash) */
async function wearCopper(P, wsPort, me) {
  await H.devOp(wsPort, 'kit', me, { what: 'armor' });
  let pieces = null;
  for (let i = 0; i < 40 && !pieces; i++) {
    pieces = await P.page.evaluate(() => {
      const R = window._gameState.current.rpg || {};
      const t = (R.armorStash || []).find((x) => x && x.mat === 'copper' && x.gid);
      const l = (R.legsStash || []).find((x) => x && x.mat === 'copper' && x.gid);
      return t && l ? { t: t.gid, l: l.gid } : null;
    });
    if (!pieces) await P.page.waitForTimeout(300);
  }
  if (!pieces) return null;
  return P.page.evaluate((p) => {
    const S = window._gameState.current;
    const R = S.rpg;
    const ti = (R.armorStash || []).findIndex((x) => x && x.gid === p.t);
    const li = (R.legsStash || []).findIndex((x) => x && x.gid === p.l);
    if (ti >= 0) { R.armor = R.armorStash[ti]; R.armorStash.splice(ti, 1); }
    if (li >= 0) { R.legsArmor = R.legsStash[li]; R.legsStash.splice(li, 1); }
    if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
    S.channel.send({ type: 'stats_update', payload: { armorRef: p.t, legsArmorRef: p.l } });
    return window.__btGearCatalog().worn;
  }, pieces);
}

/* a run north-east and back for `ms`, sampled every 200 ms: the belt sheet's
   state, the frames held, whether the figure jogs, and the plain frames drawn
   (the local misses, each once) */
async function runNE(P, ms) {
  const seen = new Set();
  const plain = [];
  const samples = [];
  const t0 = Date.now();
  let leg = 0;
  while (Date.now() - t0 < ms) {
    const keys = leg % 2 ? ['s', 'a'] : ['w', 'd'];
    for (const k of keys) await P.page.keyboard.down(k);
    const tLeg = Date.now();
    while (Date.now() - tLeg < 1600) {
      await P.page.waitForTimeout(200);
      const s = await P.page.evaluate((dir) => {
        const S = window._gameState.current;
        const b = window.__btBeltHold ? window.__btBeltHold(dir) : null;
        const m = window.__btLocalMisses ? window.__btLocalMisses().misses : [];
        return { at: Date.now(), b, jog: !!S._bodyMoving, dir: S._bodyAnimDir, misses: m };
      }, NE).catch(() => null);
      if (!s) continue;
      for (const x of s.misses) {
        const k = x.at + '|' + x.pose + '|' + x.dir + '|' + x.f;
        if (!seen.has(k)) { seen.add(k); plain.push(x); }
      }
      samples.push({ at: s.at, sheet: s.b && s.b.sheet, held: s.b ? s.b.held : null, jog: s.jog, dir: s.dir, ne: !(leg % 2) });
    }
    for (const k of keys) await P.page.keyboard.up(k);
    leg++;
  }
  const tIn = (samples.find((x) => x.sheet === 'in') || {}).at || null;
  const before = (x) => tIn == null || x.at < tIn;
  return {
    tIn, samples,
    plainJogNE: plain.filter((x) => x.pose === 'jog' && x.dir === NE && before(x)).length,
    plainJogNEAfter: plain.filter((x) => x.pose === 'jog' && x.dir === NE && !before(x)).length,
    stoodNE: samples.filter((x) => x.ne && before(x) && !x.jog).length,
    jogNEAfter: samples.filter((x) => x.ne && !before(x) && x.jog).length,
    held: samples.length ? samples[samples.length - 1].held : null,
  };
}

async function phone(browser, wsPort, webPort, name, query) {
  const P = await H.newPlayer(browser, { name, wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query: 'manual=0' + (query ? '&' + query : '') });
  P.errors = [];
  P.page.on('pageerror', (e) => P.errors.push(String((e && e.message) || e).slice(0, 200)));
  P.stopAlive = H.keepAlive(P, 20000);
  await H.enterWorld(P);
  await H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'wheel', { timeout: 60000, label: name + ' in the world' });
  await P.page.waitForTimeout(3000);
  P.me = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'vitals', P.me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
  return P;
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* A: the stand-in */
  const A = await phone(browser, wsPort, webPort, 'Belty');
  try {
    const before = await A.page.evaluate((dir) => window.__btBeltHold(dir), NE);
    const worn = await wearCopper(A, wsPort, A.me);
    rec.ok('A. the copper torso and greaves worn the real way, in play (guard)', !!worn && worn.chest === 'copperplate' && worn.legs === 'coppergreaves', { worn, before });
    const a = await runNE(A, 26000);
    console.log('    A:', JSON.stringify({ tIn: a.tIn, plainJogNE: a.plainJogNE, plainJogNEAfter: a.plainJogNEAfter, stoodNE: a.stoodNE, jogNEAfter: a.jogNEAfter, held: a.held, sheet0: before.sheet }));
    rec.ok(`A. bare at login, the north-east belt sheet was not in (${before.sheet}), and came in during the run (${a.tIn ? 'yes' : 'no'})`, before.sheet !== 'in' && !!a.tIn, { before });
    rec.ok(`A. while it packed, the figure stood running north-east (${a.held} frames held, ${a.stoodNE} samples standing) and NO jog frame of the plain body was drawn there (${a.plainJogNE})`, a.held > 0 && a.stoodNE > 0 && a.plainJogNE === 0, a.samples.slice(0, 40));
    rec.ok(`A. once it was in, the figure jogs north-east again (${a.jogNEAfter} samples)`, a.jogNEAfter > 0);
    console.log(`    A: after the sheet came in, ${a.plainJogNEAfter} jog frames north-east drawn plain while the worker baked them (worn-first.md's flash, as for any armour put on)`);
    /* B: as before */
    const B = await phone(browser, wsPort, webPort, 'Beltoff', 'beltstandin=0');
    try {
      const wornB = await wearCopper(B, wsPort, B.me);
      rec.ok('B. ?beltstandin=0: the same armour worn (guard)', !!wornB && wornB.chest === 'copperplate');
      const b = await runNE(B, 26000);
      console.log('    B:', JSON.stringify({ tIn: b.tIn, plainJogNE: b.plainJogNE, plainJogNEAfter: b.plainJogNEAfter, stoodNE: b.stoodNE, held: b.held }));
      rec.ok(`B. ?beltstandin=0 is the game as it was: nothing held (${b.held}); the north-east jog drawn plain while the belt packed: ${b.plainJogNE} frames (measured)`, b.held === 0);
      rec.ok('B. no page errors', B.errors.length === 0, B.errors);
    } finally { B.stopAlive && B.stopAlive(); await B.ctx.close().catch(() => {}); }
    /* C: worn at login */
    await A.page.reload();
    await H.enterWorld(A).catch(() => {});
    await H.waitFor(A, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'wheel', { timeout: 60000, label: 'A in the world again' });
    await A.page.waitForTimeout(3000);
    const c0 = await A.page.evaluate((dir) => ({ ...window.__btBeltHold(dir), worn: window.__btGearCatalog().worn }), NE);
    const c = await runNE(A, 8000);
    rec.ok(`C. worn at login: the north-east belt sheet in behind the loading screen (${c0.sheet}), and the run north-east never stood (${c.held} frames held)`, c0.worn.chest === 'copperplate' && c0.sheet === 'in' && c.held === 0, { c0, held: c.held });
    rec.ok('A, C. no page errors', A.errors.length === 0, A.errors);
  } finally { A.stopAlive && A.stopAlive(); await A.ctx.close().catch(() => {}); }
}
