/* ═══ v2.3.6700: mp-idlecensus -- WHAT THE PAGE DOES WHEN NOTHING HAPPENS (card PRT) ═══
 *
 * The owner, 2026-11-26: "Pretend you're a red team but mission is
 * performance enhancements."  The first thing the red team's counters found
 * was not a slow job but a small one that never stopped: standing at the
 * town's arrival point, the page asked its ground worker "where am I" on
 * EVERY frame (game/hereCells.js has why), and one control drew itself again
 * on every frame while drawing nothing (game/drawOnChange.js).  Neither is
 * ever 12 ms, so the held sweep cannot name them; both ran for as long as
 * you stood there.
 *
 * So this stands ONE phone page in the Wheel's BroTown, at the arrival point,
 * touching nothing, and counts for BT_IC_MS (default 8 s):
 *   - every message to and from a worker, by its type;
 *   - React's commits, and the components that ran in each;
 *   - every timer and animation-frame callback, by where it was set;
 *   - every socket frame in and out, by type and size;
 * and holds the counts to the lines in idle-census.mjs (IDLE_LINES: lowered
 * as idle work is cut, never raised silently).
 *
 * THE BREAK PROOF IS IN THE RUN.  A second page plays the game as it was
 * (`?herecells=0&burstidle=0`): the same counters must SEE both faults there
 * (the worker asked at every look at two cells; the button drawn every
 * frame), or the census is blind and its green means nothing.  The two-cell
 * question is asked by the test itself (window.__btWorldTrial.here, your
 * place and one 200 px east of it), so it does not lean on which way the
 * camera's rounding happens to fall on this box.
 *
 *   node tools/qa/mp/run.mjs idlecensus
 *   QA_DIST=dist-prof ...        # the unminified build: components by name
 *   BT_IC_MS=20000 ...           # a longer look
 *   BT_IC_TIMERS=1 ...           # print every timer and frame callback, by where it was set
 *
 * dpr 0.5: this box draws in software, and at a phone's own pixels (dpr 3) it
 * draws 2 frames a second -- everything counted "a frame" would hold half a
 * second of play.  A quarter of the pixels a side draws about 11.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { IDLE_LINES, CORNER_FRAMES, censusInit, censusArm, censusRead, judgeIdle } from './idle-census.mjs';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const MS = Number(process.env.BT_IC_MS || 8000);

/* one page: into the Wheel, stand, count */
async function census({ browser, wsPort, webPort, rec, query, label }) {
  const P = await H.newPlayer(browser, { name: 'idle', wsPort, webPort, viewport: PHONE, touch: true, dpr: 0.5, world: 'wheel', query, init: censusInit() });
  let stopAlive = null;
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok(`${label}: in the Wheel's BroTown (guard)`, !!ok, ok);
    if (!ok) return null;
    const myId = await H.readState(P, (S) => S.myId);
    await P.page.evaluate(() => { const S = window._gameState.current; const R = S.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; });
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 }).catch(() => null);
    stopAlive = H.keepAlive(P, 15000);
    await P.page.waitForTimeout(8000);

    /* the socket's frames, as the page reads them (unzipped) */
    const cdp = await P.page.context().newCDPSession(P.page);
    await cdp.send('Network.enable');
    const ws = { on: false, in: Object.create(null), out: Object.create(null), inBytes: 0, outBytes: 0 };
    const tally = (dir, payload) => {
      if (!ws.on) return;
      let t = '(not json)';
      try { t = String(JSON.parse(payload).type || '(no type)'); } catch (e) { /* a bundle or a binary frame */ }
      ws[dir][t] = (ws[dir][t] || 0) + 1;
      ws[dir + 'Bytes'] += payload.length;
    };
    cdp.on('Network.webSocketFrameReceived', (e) => tally('in', (e.response && e.response.payloadData) || ''));
    cdp.on('Network.webSocketFrameSent', (e) => tally('out', (e.response && e.response.payloadData) || ''));

    /* ── standing still ── */
    await P.page.evaluate(censusArm);
    ws.on = true;
    const t0 = Date.now();
    await P.page.waitForTimeout(MS);
    ws.on = false;
    const secs = (Date.now() - t0) / 1000;
    const pg = await P.page.evaluate(censusRead);
    Object.assign(pg, await P.page.evaluate(() => { const S = window._gameState.current; return { at: [S.player.x, S.player.y], others: Object.keys(S.others || {}).length }; }));

    /* ── two places in two cells, asked in turn ──
       Your own place and one 200 game px east of it: two cells whatever the cell's size (a walk cell is 24 game px
       today).  Asked through the game's own probe, a frame apart, as the renderer's two askers are -- so the check
       does not lean on which way the camera's rounding happens to fall on this box. */
    await P.page.evaluate(censusArm);
    const corner = await P.page.evaluate(async (frames) => {
      const T = window.__btWorldTrial;
      const S = window._gameState.current;
      if (!T || !T.here) return { ok: false, why: 'no probe' };
      const x = S.player.x, y = S.player.y;
      for (let i = 0; i < frames; i++) {
        T.here(x + 200, y);
        await new Promise((res) => requestAnimationFrame(() => res()));
        T.here(x, y);
        await new Promise((res) => requestAnimationFrame(() => res()));
      }
      return { ok: true, places: [[Math.round(x), Math.round(y)], [Math.round(x + 200), Math.round(y)]] };
    }, CORNER_FRAMES / 2);
    corner.asks = (await P.page.evaluate(censusRead)).toWorker.where || 0;

    /* ── the Element Burst button's whole job, drawn only when it must be (the page as it is) ──
       A weapon from the dev kit and a flame gem set the way a player sets one, through the worker (H.weaponGem:
       TRAPS §240, never an element written on the page's copy), the pools filled.  The button's display gate reads
       the phone's state, which no React state follows: the look every frame is what brings it up. */
    let burst = null;
    if (!query) {
      const renders = async (ms) => {
        await P.page.evaluate(censusArm);
        await P.page.waitForTimeout(ms);
        const r = await P.page.evaluate(censusRead);
        const f = r.frames || 1, n = r.by.ElementBurstButton || 0;
        return { n, frames: f, perFrame: +(n / f).toFixed(2) };
      };
      const attr = () => P.page.evaluate(() => { const el = document.querySelector('.bt-burst-btn'); if (!el) return null; const fl = el.querySelector('[data-flash="1"]'); return { ready: el.getAttribute('data-ready'), flash: !!fl }; });
      /* the dev kit's greatsword, into the hand on the worker's word, then the gem (mp-gemweight's way) */
      await H.devOp(wsPort, 'kit', myId, { what: 'weapons' }).catch(() => null);
      for (let i = 0; i < 40; i++) {
        const has = await H.readState(P, (S) => !!((S.rpg && S.rpg.weapon && S.rpg.weapon.type === 'greatsword') || ((S.rpg && S.rpg.weaponStash) || []).some((w) => w && w.type === 'greatsword')));
        if (has) break;
        await P.page.waitForTimeout(250);
      }
      await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
      for (let i = 0; i < 40; i++) {
        if (await H.readState(P, (S) => !!(S.rpg && S.rpg.weapon && S.rpg.weapon.type === 'greatsword'))) break;
        await P.page.waitForTimeout(250);
      }
      const gem = (await H.weaponGem(P, wsPort, myId, 'weapon', 'flame'))
        || (await P.page.waitForTimeout(1000), await H.weaponGem(P, wsPort, myId, 'weapon', 'flame'));
      await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 }).catch(() => null);
      await P.page.evaluate(() => { const S = window._gameState.current; S.rpg.activeSlot = 'melee'; S.channel.send({ type: 'set_active_slot', payload: { slot: 'melee' } }); });
      const shown = await P.page.waitForSelector('.bt-burst-btn', { timeout: 5000 }).then(() => true).catch(() => false);
      burst = { shown, gem };
      if (shown) {
        burst.readyAttr = await attr();
        burst.idleBefore = await renders(2000);
        const box = await P.page.locator('.bt-burst-btn').boundingBox();
        await P.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await P.page.waitForTimeout(350);
        burst.afterTap = await P.page.evaluate(() => { const S = window._gameState.current; return { stamped: Date.now() - (S._lastBurstAt || 0) < 2500 }; });
        burst.coolAttr = await attr();
        burst.cooling = await renders(1500);
        /* the arc closes (3 s after the tap): the flash is seen, then gone */
        let sawFlash = false, readyAgain = false;
        for (let i = 0; i < 40; i++) {
          const a = await attr();
          if (a && a.ready === '1') readyAgain = true;
          if (a && a.flash) sawFlash = true;
          if (readyAgain && sawFlash) break;
          await P.page.waitForTimeout(100);
        }
        burst.readyAgain = readyAgain; burst.sawFlash = sawFlash;
        await P.page.waitForTimeout(1300);   /* past the flash's 700 ms */
        burst.endAttr = await attr();
        burst.idleAfter = await renders(2000);
      }
    }

    const read = { label, query: query || '', secs: +secs.toFixed(1), frames: pg.frames, at: pg.at, others: pg.others, burst,
      whereAsks: pg.toWorker.where || 0, burstRenders: pg.by.ElementBurstButton || 0, commits: pg.commits,
      cornerAsks: corner && corner.ok ? corner.asks : null, corner,
      toWorker: pg.toWorker, fromWorker: pg.fromWorker, renders: pg.by, timers: pg.timers, socket: ws, reactErr: pg.err };
    const per = (o, d) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${(n / d).toFixed(1)} ${k}`);
    const timerCalls = Object.values(pg.timers).reduce((a, b) => a + b, 0);
    console.log(`\n  ══ ${label}${query ? ` (?${query})` : ''}: ${read.secs} s, ${pg.frames} frames (${(pg.frames / secs).toFixed(1)} a second), at ${pg.at.map((v) => Math.round(v)).join(', ')}, ${pg.others} others near`);
    console.log(`     to workers, a second:    ${per(pg.toWorker, secs).join(' | ') || 'none'}`);
    console.log(`     from workers, a second:  ${per(pg.fromWorker, secs).join(' | ') || 'none'}`);
    console.log(`     socket in:  ${(Object.values(ws.in).reduce((a, b) => a + b, 0) / secs).toFixed(1)} frames a second, ${(ws.inBytes / secs / 1024).toFixed(2)} KB a second unzipped (${per(ws.in, secs).slice(0, 8).join(' | ')})`);
    console.log(`     socket out: ${(Object.values(ws.out).reduce((a, b) => a + b, 0) / secs).toFixed(1)} frames a second, ${(ws.outBytes / secs / 1024).toFixed(2)} KB a second (${per(ws.out, secs).slice(0, 8).join(' | ')})`);
    console.log(`     React: ${(pg.commits / secs).toFixed(1)} commits a second; renders a second by component: ${per(pg.by, secs).slice(0, 30).join(' | ')}`);
    console.log(`     timer and animation-frame callbacks: ${(timerCalls / secs).toFixed(0)} a second in all (${Object.keys(pg.timers).filter((k) => k.startsWith('frame')).length} frame loops, ${Object.keys(pg.timers).filter((k) => k.startsWith('every')).length} repeating timers seen)`);
    if (process.env.BT_IC_TIMERS === '1') for (const [k, n] of Object.entries(pg.timers).sort((a, b) => b[1] - a[1]).slice(0, 60)) console.log(`       ${(n / secs).toFixed(1).padStart(7)} a second  ${k}`);
    if (corner && corner.ok) console.log(`     two cells asked in turn for ${CORNER_FRAMES} frames (${corner.places.map((p) => p.join(', ')).join(' and ')}): ${corner.asks} questions to the worker`);
    return read;
  } finally {
    if (stopAlive) stopAlive();
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });

  /* ── the game as it is: held to the lines ── */
  const now = await census({ browser, wsPort, webPort, rec, query: '', label: 'as it is' });
  if (now) {
    rec.ok('the census counted (frames drawn, React\'s hook heard, the two-cell question asked)', now.frames >= 20 && now.commits >= 1 && !now.reactErr && now.corner && now.corner.ok,
      { frames: now.frames, commits: now.commits, reactErr: now.reactErr, corner: now.corner });
    for (const row of judgeIdle(now, IDLE_LINES)) rec.ok(row.name, row.ok, row.detail);
    /* the button's whole job, with the new way of drawing it */
    const b = now.burst || {};
    rec.ok('the Element Burst button comes up when the weapon in hand takes a gem (the phone\'s state changed, no React state: the look saw it)', b.gem === true && b.shown === true && b.readyAttr && b.readyAttr.ready === '1', { gem: b.gem, shown: b.shown, attr: b.readyAttr });
    if (b.shown) {
      rec.ok(`...ready and untouched, it is not drawn again (${b.idleBefore.perFrame} a frame, ${b.idleBefore.n} in ${b.idleBefore.frames} frames; at most ${IDLE_LINES.burstRendersPerFrame})`, b.idleBefore.perFrame <= IDLE_LINES.burstRendersPerFrame, b.idleBefore);
      rec.ok('...a tap casts: the cooldown is stamped and the button reads not ready', b.afterTap && b.afterTap.stamped === true && b.coolAttr && b.coolAttr.ready === '0', { afterTap: b.afterTap, attr: b.coolAttr });
      rec.ok(`...while the cooldown's arc closes it is drawn every frame (${b.cooling.perFrame} a frame; over 0.7)`, b.cooling.perFrame > 0.7, b.cooling);
      rec.ok('...the arc closed: ready again, and the flash was seen', b.readyAgain === true && b.sawFlash === true, { readyAgain: b.readyAgain, sawFlash: b.sawFlash });
      rec.ok(`...the flash over, it is at rest again: not flashing, not drawn again (${b.idleAfter.perFrame} a frame)`, b.endAttr && b.endAttr.ready === '1' && b.endAttr.flash === false && b.idleAfter.perFrame <= IDLE_LINES.burstRendersPerFrame, { attr: b.endAttr, idle: b.idleAfter });
    }
  }

  /* ── the game as it was: the same counters must see both faults (the break proof) ── */
  const was = await census({ browser, wsPort, webPort, rec, query: 'herecells=0&burstidle=0', label: 'as it was' });
  if (was) {
    rec.ok(`BREAK PROOF: with one answer kept (?herecells=0), two cells asked in turn are a question to the worker at nearly every look (${was.cornerAsks} in ${CORNER_FRAMES} frames; over ${CORNER_FRAMES / 3})`,
      was.cornerAsks != null && was.cornerAsks > CORNER_FRAMES / 3, { asks: was.cornerAsks });
    const perFrame = was.frames ? was.burstRenders / was.frames : 0;
    rec.ok(`BREAK PROOF: drawn every frame again (?burstidle=0), the Element Burst button renders about once a frame (${perFrame.toFixed(2)}; over 0.7)`,
      perFrame > 0.7, { renders: was.burstRenders, frames: was.frames });
  }

  writeFileSync(join(OUT, 'idlecensus.json'), JSON.stringify({ lines: IDLE_LINES, now, was }, null, 1));
  console.log(`\n  wrote ${join(OUT, 'idlecensus.json')}`);
}
