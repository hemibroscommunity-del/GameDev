/* ═══ WHAT HOLDS YOUR PAGE WHEN ANOTHER PLAYER RIDES UP (v2.3.4355) ═══
 *
 * The owner's iPhone 14 Pro Max, the townsfolk's bakes already behind the
 * loading screen: "Still performance issues", the frame strip reading "worst
 * 378.0 = game 16.0 + outside 362.0" with no job named past 13 ms, and
 * another player ("Rad Tsunami 1", level 1, on a skateboard, sword in hand)
 * newly on the screen.  A measuring tool first: a phone stands in the
 * Wheel's BroTown; another player in a look of their own joins, rides up on
 * the board, circles and swings.  On the watcher's page, Chrome's CPU
 * profiler names every stretch the main thread was held OUTSIDE the game's
 * frame (a promise, a timer, a message), and window.__btMade lists the jobs
 * that name themselves.
 *
 *   QA_DIST=dist-prof node tools/qa/mp/run.mjs peerarrive
 * (an unminified build, or every function reads as a letter:
 *  NODE_OPTIONS=--max-old-space-size=8192 npx vite build --minify false --outDir dist-prof; mv src/dist-prof dist-prof)
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 430, height: 932 };
const LOOK = { skin: 'pale', pants: 'teal', shoes: 'white', hair: 'afro', haircolor: 'blonde', headwear: 'beanie' };
const dress = (who) => `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', ${JSON.stringify(who.skin)});
  localStorage.setItem('bt-pants', ${JSON.stringify(who.pants)});
  localStorage.setItem('bt-shoes', ${JSON.stringify(who.shoes)});
  localStorage.setItem('bt-hair', ${JSON.stringify(who.hair)});
  localStorage.setItem('bt-haircolor', ${JSON.stringify(who.haircolor)});
  localStorage.setItem('bt-headwear', ${JSON.stringify(who.headwear)});
} catch (e) {}`;

async function circle(P, ms) {
  const ways = [['w'], ['w', 'd'], ['d'], ['s', 'd'], ['s'], ['s', 'a'], ['a'], ['w', 'a']];
  for (const keys of ways) {
    for (const k of keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(ms);
    for (const k of keys) await P.page.keyboard.up(k);
  }
}

/* the profile: every sample's stack, in the game's frame (a `gameLoop` on it) or outside it; outside and not idle, runs
   of samples are STRETCHES the page was held, each named by the functions it spent most in */
function analyse(profile) {
  const byId = new Map();
  for (const n of profile.nodes) byId.set(n.id, n);
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const nameOf = (n) => {
    const f = n.callFrame;
    const file = (f.url || '').replace(/^.*\//, '').replace(/\?.*$/, '');
    return (f.functionName || '(anonymous)') + (file ? ' @' + file + ':' + (f.lineNumber + 1) : '');
  };
  const info = new Map();
  const infoOf = (id) => {
    let v = info.get(id);
    if (v) return v;
    const stack = [];
    for (let i = id; i != null; i = parent.get(i)) stack.push(byId.get(i));
    const names = stack.map((n) => n.callFrame.functionName || '');
    const top = byId.get(id).callFrame.functionName || '';
    v = { idle: top === '(idle)', gc: top === '(garbage collector)', program: top === '(program)', inLoop: names.includes('gameLoop'),
      self: nameOf(byId.get(id)),
      /* the outermost named frames below the root: what STARTED this work */
      from: stack.slice(0, -1).reverse().map(nameOf).filter((s) => !/^\(anonymous\)$|^\(root\)/.test(s)).slice(0, 3).join(' > ') };
    info.set(id, v);
    return v;
  };
  const dt = profile.timeDeltas || [];
  let total = 0, loop = 0, outside = 0, idle = 0;
  const selfOut = new Map(), fromOut = new Map();
  const stretches = [];
  let cur = null;
  for (let i = 0; i < profile.samples.length; i++) {
    const ms = (dt[i] || 0) / 1000;
    const v = infoOf(profile.samples[i]);
    total += ms;
    const held = !v.idle && !v.inLoop && !v.program;
    if (v.idle || v.program) idle += ms; else if (v.inLoop) loop += ms; else outside += ms;
    if (held) {
      selfOut.set(v.self, (selfOut.get(v.self) || 0) + ms);
      fromOut.set(v.from, (fromOut.get(v.from) || 0) + ms);
      if (!cur) { cur = { ms: 0, by: new Map(), from: new Map() }; stretches.push(cur); }
      cur.ms += ms;
      cur.by.set(v.self, (cur.by.get(v.self) || 0) + ms);
      cur.from.set(v.from, (cur.from.get(v.from) || 0) + ms);
    } else if (!v.program) cur = null;   /* a sample in the browser's own code does not end a stretch */
  }
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, ms]) => `${ms.toFixed(0)} ms  ${k}`);
  stretches.sort((a, b) => b.ms - a.ms);
  return { total: Math.round(total), loop: Math.round(loop), outside: Math.round(outside), idle: Math.round(idle),
    self: top(selfOut, 24), from: top(fromOut, 24),
    stretches: stretches.slice(0, 12).map((s) => ({ ms: Math.round(s.ms), from: top(s.from, 2), by: top(s.by, 4) })) };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', query: process.env.BT_PA_QUERY || '' });
  let B = null;
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      for (const Q of [A, B]) if (Q) await Q.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 4 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(A);
    const ok = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the world' }).then(() => true).catch(() => false);
    rec.ok('the watcher is in BroTown (guard)', ok);
    if (!ok) return;
    await A.page.waitForTimeout(6000);
    const here = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
    const cdp = await A.page.context().newCDPSession(A.page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
    /* alone, for the same length: what the page does outside its frame with nobody new */
    await A.page.evaluate(() => { window.__btMade = []; });
    await cdp.send('Profiler.start');
    await A.page.waitForTimeout(20000);
    const alone = analyse((await cdp.send('Profiler.stop')).profile);
    console.log(`    alone, 20 s: in the frame ${alone.loop} ms, outside it ${alone.outside} ms, idle ${alone.idle} ms; the longest stretches outside: ${alone.stretches.slice(0, 5).map((s) => s.ms).join(', ')} ms`);
    for (const s of alone.stretches.slice(0, 3)) console.log(`      ${s.ms} ms  from ${s.from[0] || '?'}  |  ${s.by.slice(0, 2).join('; ')}`);

    /* the peer comes in off the screen's side first (their page's own load is not the watcher's) */
    B = await H.newPlayer(browser, { name: 'Rider', wsPort, webPort, viewport: { width: 390, height: 600 }, touch: false, world: 'wheel', init: dress(LOOK) });
    await H.enterWorld(B);
    await H.waitFor(B, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'peer into the world' }).catch(() => null);
    await H.glideTo(B, here.x + 1400, here.y, { speed: 600, timeoutMs: 30000 });
    await A.page.waitForTimeout(3000);
    await A.page.evaluate(() => { window.__btMade = []; });
    await cdp.send('Profiler.start');
    const t0 = Date.now();
    await B.page.mouse.click(195, 300).catch(() => {});
    await B.page.keyboard.press('Escape').catch(() => {});
    await B.page.keyboard.press('z');
    await H.glideTo(B, here.x + 70, here.y - 40, { speed: 300, timeoutMs: 30000 });
    await circle(B, 900);
    await B.page.keyboard.press('z');
    await circle(B, 600);
    /* a few swings beside you (a computer's click on the ground swings) */
    for (let i = 0; i < 4; i++) { await B.page.mouse.click(120 + i * 40, 420).catch(() => {}); await B.page.waitForTimeout(700); }
    await A.page.waitForTimeout(2000);
    const prof = (await cdp.send('Profiler.stop')).profile;
    const secs = Math.round((Date.now() - t0) / 1000);
    writeFileSync(join(OUT, 'peerarrive.cpuprofile'), JSON.stringify(prof));
    const an = analyse(prof);
    const made = await A.page.evaluate(() => window.__btMade.slice());
    const jobs = [];
    for (let i = 0; i < made.length; i += 2) jobs.push({ name: made[i], ms: Math.round(made[i + 1]) });
    jobs.sort((a, b) => b.ms - a.ms);
    const seen = await A.page.evaluate(() => Object.keys((window._gameState.current.others) || {}).length);
    console.log(`    a rider arrives, ${secs} s (the watcher sees ${seen} other): in the frame ${an.loop} ms, outside it ${an.outside} ms, idle ${an.idle} ms`);
    console.log(`    jobs that named themselves (${jobs.length}): ${jobs.slice(0, 12).map((j) => `${j.name.slice(0, 60)} ${j.ms}`).join(' | ')}`);
    console.log('    the longest stretches the page was held outside its frame:');
    for (const s of an.stretches) console.log(`      ${s.ms} ms  from ${s.from.join(' ; ') || '?'}\n          in ${s.by.join(' ; ')}`);
    console.log('    outside the frame, by what started it:');
    for (const l of an.from) console.log('      ' + l);
    console.log('    outside the frame, by where the time was spent:');
    for (const l of an.self) console.log('      ' + l);
    writeFileSync(join(OUT, 'peerarrive.json'), JSON.stringify({ alone, arrive: an, jobs }, null, 1));
    rec.ok(`measured: the longest stretch outside the frame as a rider arrives ${an.stretches[0] ? an.stretches[0].ms : 0} ms (alone ${alone.stretches[0] ? alone.stretches[0].ms : 0} ms)`, seen >= 1, { seen });
  } finally {
    stopAlive = true;
    await A.ctx.close().catch(() => {});
    if (B) await B.ctx.close().catch(() => {});
  }
}
