/* ═══ v2.3.6761: THE BAKES ARE KEPT (card LOAD, PR 2) ═══
 *
 * The owner's Loading times (2026-11-26, their iPhone): the loading screen
 * up 21.3 s, its 20 s limit and the fade, while the pictures were ready at
 * 11.9 s and the world at 13.1 s.  It waited for the armour's masked body
 * frames (pixiRenderer preloadPlayerAssets: `masks`), which the bake worker
 * made again at every login.  Now the worker keeps what it makes on the
 * phone's disk (src/game/bakeKeep.js) and answers a job it has kept from
 * there (docs/specs/bake-keep.md).
 *
 * A phone in the Wheel's BroTown wearing the owner's set (a copper torso and
 * copper greaves, worn as mp-armourflash wears them, the trousers drawn so
 * the three flipped facings bake too: 177 frames), then:
 *   1. a FIRST login in the set (reloaded): what the screen waited for,
 *      measured, not held (nothing of this set kept yet: its limit);
 *   2. the masks of that login all made, so the worker has kept them;
 *   3. a SECOND login in the same set: every frame of the worn set ready at
 *      the lift (__btMaskedCoverage have === want), `masks` within 3 s of
 *      `loads`, the screen lifted on "ready" (the bro's pictures done before
 *      it finished, and before its 20 s limit);
 *   4. a kept frame is the baked one byte for byte: with
 *      window.__btBakeKeepVerify set, the worker bakes every job it answers
 *      from the store again and compares (window.__btBakeKeep(): `same`,
 *      `differ`);
 *   5. `?bakekeep=0`: a third login with the switch: nothing answered from
 *      the store (today's behaviour).
 *
 *   node tools/qa/mp/run.mjs bakekeep
 *
 * It reads only what exists without part 1 (window.__btPreloadSteps,
 * __btMaskedCoverage, __btIntro), and the keep's own probe. */
import * as H from './harness.mjs';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };

/* the drawn trousers (mp-armourflash's SEED_INK): the flipped facings */
const SEED_INK = () => {
  try {
    if (!localStorage.getItem('qa-bk-ink')) {
      localStorage.setItem('bt-pantspat', 'check:3');
      localStorage.setItem('qa-bk-ink', '1');
    }
  } catch (e) { /* reported below */ }
};

/* every page load: the moment the loading screen finishes, what was ready
   (read in the page, at the event, not after a round trip) */
const WATCH_LIFT = () => {
  try {
    if (/[?&]qakeepverify=1/.test(location.search)) window.__btBakeKeepVerify = true;
    const t = setInterval(() => {
      const ev = window.__btIntro || [];
      const fin = ev.find((e) => e && e.ev === 'finish');
      if (!fin) return;
      clearInterval(t);
      const mount = ev.find((e) => e && e.ev === 'mount');
      const s = Object.assign({}, window.__btPreloadSteps || {});
      const c = window.__btMaskedCoverage ? window.__btMaskedCoverage() : null;
      window.__qaLift = { at: Date.now(), finish: fin.at, mount: mount ? mount.at : 0, steps: s, have: c && c.have, want: c && c.want, missing: c ? c.missing.slice(0, 8) : null };
    }, 25);
    /* ...and the moment the worn set's masks are made (the step the screen
       waits for): what is ready then */
    const m = setInterval(() => {
      const s = window.__btPreloadSteps || {};
      if (!s.masks) return;
      clearInterval(m);
      const c = window.__btMaskedCoverage ? window.__btMaskedCoverage() : null;
      window.__qaMasks = { at: Date.now(), loads: s.loads || 0, masks: s.masks, start: s.start || 0, have: c && c.have, want: c && c.want, missing: c ? c.missing.slice(0, 8) : null };
    }, 25);
  } catch (e) { /* reported below */ }
};

async function inWheel(P) {
  for (let i = 0; i < 160; i++) {
    if ((await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel') return true;
    await P.page.waitForTimeout(500);
  }
  return false;
}

/* one login's reading: at the lift, and the steps as they stand */
async function readLogin(P) {
  const lift = await H.waitFor(P, () => window.__qaLift || null, (v) => !!v, { timeout: 120000, label: 'the loading screen lifted' }).catch(() => null);
  if (!lift) return null;
  const s = lift.steps || {};
  const t0 = s.start || lift.mount;
  const rel = (k) => (s[k] ? s[k] - t0 : null);
  /* the screen lifted on "ready" when the bro's pictures were all made before
     it finished; its 20 s limit (from the mount) "fired" when it came before
     they were.  On this box the loads alone can outlast the limit (a world
     gate then holds the screen past it): both are said */
  const upMs = lift.finish - lift.mount;
  const ready = !!s.done && s.done <= lift.finish;
  const limitFired = !s.done || s.done > lift.mount + 20000;
  return {
    upMs, ready, limitFired, loads: rel('loads'), masks: rel('masks'), done: rel('done'),
    masksAfterLoads: s.masks && s.loads ? s.masks - s.loads : null,
    have: lift.have, want: lift.want, missing: lift.missing,
  };
}
/* the moment `masks` came: how long after the loads, and what was ready */
async function readMasks(P, timeout) {
  const m = await H.waitFor(P, () => window.__qaMasks || null, (v) => !!v, { timeout, label: "the worn set's masks" }).catch(() => null);
  return m && { afterLoads: m.loads ? m.masks - m.loads : null, loads: m.loads ? m.loads - m.start : null, have: m.have, want: m.want, missing: m.missing };
}
const say = (n, r) => `login ${n}: the screen up ${r.upMs} ms, the bro ${r.ready ? 'ready when it lifted' : 'NOT ready when it lifted'}, its 20 s limit ${r.limitFired ? 'fired first' : 'not reached'}; loads +${r.loads} ms, masks ${r.masks == null ? 'not yet' : '+' + r.masks + ' ms'} (${r.masksAfterLoads == null ? '-' : r.masksAfterLoads + ' ms after loads'}); frames ready at the lift ${r.have} of ${r.want}`;

/* the keep's own probe (the worker's counts over its port) */
const keepStats = (P) => P.page.evaluate(() => (window.__btBakeKeep ? window.__btBakeKeep() : null)).catch(() => null);
/* ...and each job the store did not have, said as its pose and its inputs' sources (to a file) */
async function keepMissed(P, n) {
  const st = await P.page.evaluate(() => (window.__btBakeKeep ? window.__btBakeKeep({ missed: true }) : null)).catch(() => null);
  const list = (st && st.missedList) || [];
  try {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync('tools/qa/mp/out', { recursive: true });
    writeFileSync(`tools/qa/mp/out/bakekeep-missed-${n}.txt`, list.join('\n') + '\n');
  } catch (e) { /* a note only */ }
  console.log(`    login ${n}: ${list.length} jobs not kept (tools/qa/mp/out/bakekeep-missed-${n}.txt)` + (n > 1 && list.length ? ': ' + list.slice(0, 4).join(' | ') : ''));
}

async function relogin(P, query) {
  if (query != null) {
    const u = new URL(P.page.url());
    for (const k of ['bakekeep', 'qakeepverify']) u.searchParams.delete(k);
    for (const [k, v] of new URLSearchParams(query)) u.searchParams.set(k, v);
    await P.page.goto(u.toString(), { waitUntil: 'domcontentloaded' });
  } else await P.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(P);
  return inWheel(P);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Keepbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: SEED_INK });
  await P.page.addInitScript(WATCH_LIFT);
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  let stopAlive = false;
  (async () => { while (!stopAlive) { await P.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {}); } })();
  try {
    await H.enterWorld(P);
    rec.ok('setup: in the world (guard)', await inWheel(P));
    await P.page.waitForTimeout(1500);
    const myId = await H.readState(P, (S) => S.myId);

    /* the owner's set, worn the real way (mp-armourflash) */
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' });
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
    if (pieces) {
      await P.page.evaluate((p) => {
        const S = window._gameState.current;
        const R = S.rpg;
        const ti = (R.armorStash || []).findIndex((x) => x && x.gid === p.t);
        const li = (R.legsStash || []).findIndex((x) => x && x.gid === p.l);
        if (ti >= 0) { R.armor = R.armorStash[ti]; R.armorStash.splice(ti, 1); }
        if (li >= 0) { R.legsArmor = R.legsStash[li]; R.legsStash.splice(li, 1); }
        if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
        S.channel.send({ type: 'stats_update', payload: { armorRef: p.t, legsArmorRef: p.l } });
      }, pieces);
    }
    const worn = await H.waitFor(P, () => ({
      chest: window.__btGetGear ? window.__btGetGear('chest') : null, legs: window.__btGetGear ? window.__btGetGear('legs') : null,
    }), (v) => v && v.chest === 'copperplate' && v.legs === 'coppergreaves', { timeout: 15000, label: 'the armour worn' }).catch((e) => ({ err: String(e.message || e).slice(0, 160) }));
    rec.ok('setup: the copper torso and copper greaves are worn (guard)', !!worn && !worn.err, worn);
    await P.page.waitForTimeout(3000);   /* the server's save of what is worn */

    /* ── 1. the first login in the set ── */
    rec.ok('setup: back in the world, first login in the set (guard)', await relogin(P, null));
    const a = await readLogin(P);
    console.log('    ' + (a ? say(1, a) : 'login 1: no reading'));
    rec.ok(`(measure) the first login in the set: ${a ? (a.ready ? 'the bro ready at the lift' : 'the bro not ready at the lift') + ', ' + a.have + ' of ' + a.want + ' frames ready' : '?'}`, true, a);

    /* ── 2. that login's masks all made (and so kept) ── */
    const masked = await H.waitFor(P, () => (window.__btPreloadSteps && window.__btPreloadSteps.masks) || 0, (v) => v > 0,
      { timeout: 1500000, label: "the worn set's masks made" }).catch(() => 0);
    const cov1 = await P.page.evaluate(() => (window.__btMaskedCoverage ? window.__btMaskedCoverage() : null));
    const k1 = await keepStats(P);
    console.log(`    login 1, masks made: ${masked ? 'yes' : 'NO'}; frames ${cov1 && cov1.have} of ${cov1 && cov1.want}; the keep: ${JSON.stringify(k1)}`);
    rec.ok('setup: the first login made every frame of the worn set (guard)', !!masked && !!cov1 && cov1.want > 100 && cov1.have === cov1.want, cov1);
    rec.ok(`the first login kept what it made (${k1 && k1.stored} stored)`, !!k1 && k1.on === true && k1.stored > 0, k1);
    await keepMissed(P, 1);
    /* the spare sets and the uploads after `masks`, and the store's writes */
    await H.waitFor(P, () => (window.__btPreloadSteps && window.__btPreloadSteps.done) || 0, (v) => v > 0, { timeout: 300000, label: 'the bro done' }).catch(() => 0);
    await P.page.waitForTimeout(3000);

    /* ── 3. the second login in the same set ── */
    rec.ok('setup: back in the world, second login in the set (guard)', await relogin(P, ''));
    const b = await readLogin(P);
    console.log('    ' + (b ? say(2, b) : 'login 2: no reading'));
    const bm = await readMasks(P, 300000);
    console.log(`    login 2: masks ${bm && bm.afterLoads} ms after the loads (the loads +${bm && bm.loads} ms); frames ready then ${bm && bm.have} of ${bm && bm.want}`);
    rec.ok(`second login: \`masks\` within 3 s of \`loads\` (${bm && bm.afterLoads} ms)`, !!bm && bm.afterLoads != null && bm.afterLoads <= 3000, bm);
    rec.ok(`second login: every frame of the worn set ready when \`masks\` came (${bm && bm.have} of ${bm && bm.want})`, !!bm && bm.want > 100 && bm.have === bm.want, bm);
    /* at the lift: held only where the loads end inside the screen's limit
       (the owner's phone: the pictures at 18.0 s); on this box the loads alone
       outlast it, and the screen lifts before the bake can begin */
    const inLimit = !!b && b.loads != null && b.loads < 20000;
    rec.ok(`${inLimit ? '' : '(measure) '}second login: every frame ready at the lift (${b && b.have} of ${b && b.want}${inLimit ? '' : '; the loads outlast the 20 s limit here: +' + (bm && bm.loads) + ' ms'})`, !inLimit || (b.want > 100 && b.have === b.want), b);
    rec.ok(`${inLimit ? '' : '(measure) '}second login: the bro's pictures all made when the screen lifted (the screen up ${b && b.upMs} ms)`, !inLimit || b.ready, b);
    await H.waitFor(P, () => (window.__btPreloadSteps && window.__btPreloadSteps.done) || 0, (v) => v > 0, { timeout: 120000, label: 'the bro done' }).catch(() => 0);
    const k2 = await keepStats(P);
    console.log('    login 2, the keep: ' + JSON.stringify(k2));
    await keepMissed(P, 2);
    rec.ok(`second login: the worn set answered from the store (${k2 && k2.hits} kept answers, ${k2 && k2.misses} baked)`, !!k2 && k2.hits >= (b ? b.want : 1) * 0.5, k2);

    /* ── 3b. a third login in the set: measured as the second (no line: the
       second's is the card's; this says whether what the second still baked
       was the second's alone) ── */
    rec.ok('setup: back in the world, third login in the set (guard)', await relogin(P, ''));
    await readLogin(P);
    const cm = await readMasks(P, 300000);
    const k3b = await keepStats(P);
    console.log(`    login 3: masks ${cm && cm.afterLoads} ms after the loads; frames ready then ${cm && cm.have} of ${cm && cm.want}; the keep: ${k3b && k3b.hits} kept, ${k3b && k3b.misses} baked`);
    await keepMissed(P, 3);
    rec.ok(`(measure) third login: \`masks\` ${cm && cm.afterLoads} ms after \`loads\`, ${k3b && k3b.misses} baked`, true, cm);

    /* ── 4. a fourth login, every kept answer baked again beside it ── */
    rec.ok('setup: back in the world, a login that checks every kept frame (guard)', await relogin(P, 'qakeepverify=1'));
    await readLogin(P);
    await H.waitFor(P, () => (window.__btPreloadSteps && window.__btPreloadSteps.masks) || 0, (v) => v > 0, { timeout: 1500000, label: 'the masks, each checked' }).catch(() => 0);
    const kv = await keepStats(P);
    console.log('    login 4 (each kept frame baked again), the keep: ' + JSON.stringify(kv));
    rec.ok(`a kept frame is the baked one byte for byte (${kv && kv.same} the same, ${kv && kv.differ} different)`, !!kv && kv.same >= 100 && kv.differ === 0, kv);

    /* ── 5. ?bakekeep=0: today's behaviour ── */
    rec.ok('setup: back in the world with ?bakekeep=0 (guard)', await relogin(P, 'bakekeep=0'));
    const c = await readLogin(P);
    console.log('    ' + (c ? say(5, c) + ' (?bakekeep=0)' : 'login 5: no reading'));
    /* the keep is told at the prewarm's start, right after the loads */
    await H.waitFor(P, () => (window.__btPreloadSteps && window.__btPreloadSteps.loads) || 0, (v) => v > 0, { timeout: 180000, label: 'the loads' }).catch(() => 0);
    await P.page.waitForTimeout(20000);
    const k3 = await keepStats(P);
    console.log('    login 5 (?bakekeep=0), the keep: ' + JSON.stringify(k3));
    rec.ok(`?bakekeep=0: nothing answered from the store and nothing stored (${JSON.stringify(k3)})`, !!k3 && k3.on === false && !k3.hits && !k3.stored, k3);
    rec.ok('no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    stopAlive = true;
  }
}
