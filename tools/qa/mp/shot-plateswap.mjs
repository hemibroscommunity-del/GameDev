/* v2.3.2571: photograph the plate/HP-bar swap, and MEASURE it for strobe.
 *
 * Owner: "I want them to be above the head and disappear (change to hp bar)
 * when taking damage ... This makes it way less distracting."
 *
 * Two jobs, and the second is the one an assertion suite cannot do.
 *
 * 1. THE PICTURE.  mp-monsterplate proves the coordinates agree; it cannot
 *    show what a plate looks like over a real scene at phone size, which is
 *    the only question the owner is actually asking.  Shot at 390x844 dpr 3 --
 *    an iPhone, because that is the primary platform and a desktop capture of
 *    a 15 CSS px plate proves nothing about it.
 *
 * 2. THE STROBE.  A plate that becomes a bar and back on every landed hit
 *    would flicker through a fast fight, and that is a claim about a RATE --
 *    invisible in a screenshot and invisible in a pass/fail assertion, both of
 *    which sample one moment.  So the band's occupant is sampled every frame
 *    through a simulated fight at three cadences and the TRANSITIONS are
 *    counted.  The design's answer is PLATE_ENGAGED_MS (3 s, reused from D4):
 *    a swing lands inside that window, so the band must swap ONCE on the first
 *    hit and once more when the fight ends -- two transitions per fight, at
 *    any swing rate. Anything more than that is the strobe, in numbers.
 *
 * Run: node tools/qa/mp/shot-plateswap.mjs [outDir]
 */
import { mkdirSync } from 'node:fs';
import * as H from './harness.mjs';

const OUT = process.argv[2] || 'tools/qa/out/plateswap';

/* Spaced far enough apart that the plates do not overlap each other -- the
   mp-monsterplate fixture deliberately crowds them 60px apart to test naming,
   which makes it useless as a photograph of the design. */
const CAST = [
  { arch: 'fodder', level: 1 },
  { arch: 'brute', level: 7 },
  { arch: 'snowman', level: 9 },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const wsPort = await H.freePort(), webPort = await H.freePort();
  const worker = await H.startWorker(wsPort);
  const srv = await H.serveDist(webPort);
  const browser = await H.launch();
  const done = async () => {
    await browser.close().catch(() => {});
    try { srv.close(); } catch { /* best effort */ }
    await H.stopWorker(worker).catch(() => {});
  };
  try {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
    await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
    const P = { ctx, page, logs: [], name: 'Hunter' };
    await H.enterWorld(P);
    await page.waitForTimeout(2500);

    await page.evaluate(async (cast) => {
      const S = window._gameState.current;
      S._serverMonsters = false;
      S.monsters = cast.map((c, i) => {
        const x = S.player.x - 150 + i * 150, y = S.player.y - 150;
        return {
          id: 'shot_' + i, arch: c.arch, archetype: c.arch, type: c.arch,
          x, y, renderX: x, renderY: y, spawnX: x, spawnY: y, targetX: x, targetY: y,
          hp: 500, curHp: 500, maxHp: 500, dmg: 0, level: c.level, gold: 0,
          alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
          respawnAt: 0, moveTimer: 0, _stuckArrows: [],
        };
      });
      await new Promise((r) => setTimeout(r, 2500));
    }, CAST);

    /* ── A. AT REST: the band is plates, on the player and on every monster. */
    await page.screenshot({ path: `${OUT}/rest.png` });

    /* ── B. MID-FIGHT: the nearest monster is engaged and the player is hurt,
       so both bands show a bar instead -- the same spot, the other occupant. */
    await page.evaluate(async () => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x.level === 7);
      m.curHp = Math.round(m.maxHp * 0.42);
      m._hitByMeAt = Date.now();
      S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap', at: Date.now() };
      if (S.rpg) S.rpg.hp = Math.round((S.rpg.maxHp || 100) * 0.55);
      await new Promise((r) => setTimeout(r, 700));
    });
    await page.screenshot({ path: `${OUT}/fight.png` });

    /* ── C. THE STROBE COUNT ───────────────────────────────────────────────
       Sampled on rAF, which is the frame the user actually sees, not on a
       timer that could alias with the render loop.  "Occupant" is read off the
       renderer's own per-frame probe so the count is of what was DRAWN. */
    const flicker = await page.evaluate(async () => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x.level === 7);
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const runFight = async (swingMs, totalMs) => {
        S.lockedTarget = null;
        m._hitByMeAt = 0;
        /* v2.3.2573: and the LOCK latch, or the previous case's 3 s hold is
           still running when this one starts and the first case measured
           reports a swap it did not cause (TRAPS §38 -- a sub-test injecting
           over the previous one's live state).  Caught exactly that way: the
           900ms case came back "bar -> plate" on a run where the tapping case
           had just held the band. */
        m._bandEngagedAt = 0;
        m.curHp = m.maxHp;
        await sleep(1200);                    /* settle back to the plate */
        let transitions = 0, last = null, frames = 0;
        const seq = [];
        const started = performance.now();
        let nextSwing = started;
        let stop = false;
        const tick = () => {
          const now = performance.now();
          if (now - started < totalMs && now >= nextSwing) {
            m._hitByMeAt = Date.now();        /* a landed hit */
            m.curHp = Math.max(1, m.curHp - 8);
            nextSwing = now + swingMs;
          }
          const p = ((window.__btMonsterPlates || {}).plates || [])
            .find((x) => x.id === m.id);
          if (p) {
            frames++;
            /* the band's occupant, as drawn: 'bar' or 'plate' */
            const occ = (p.hpBar && p.hpBar.vis && p.hpBar.alpha > 0) ? 'bar'
              : (p.hidden ? 'none' : 'plate');
            if (last !== null && occ !== last) { transitions++; seq.push(occ); }
            if (last === null) seq.push(occ);
            last = occ;
          }
          if (now - started < totalMs + 5000) requestAnimationFrame(tick);
          else stop = true;
        };
        requestAnimationFrame(tick);
        while (!stop) await sleep(120);
        return { swingMs, totalMs, frames, transitions, ended: last, seq };
      };
      /* ═══ v2.3.2573: THE HALF runFight DOES NOT REACH ═══
         `_bandBar` is `_bandLocked || _bandHitByMe`, and everything above only
         ever moves `_hitByMeAt` -- so the suite measured one of its two inputs
         and reported "no strobe" for the whole band.  `_bandLocked` is
         `engagedStance(S)`, which is `autoAttack || the lock was a tap`, and
         that flips the instant a thumb goes down or comes up.
         This is the real situation it models: you walk up to something, your
         thumb is working the Attack button, and NOTHING IS LANDING yet --
         auto-lock grabs anything inside 220px but melee reach is ~72px, so
         there is a real window of swinging at air before the first hit starts
         the 3s hold.  Blocked and dodged swings do the same. */
      const runTapping = async (tapMs, totalMs) => {
        S.lockedTarget = null;
        m._hitByMeAt = 0;
        m._bandEngagedAt = 0;
        m.curHp = m.maxHp;
        await sleep(1200);
        let transitions = 0, last = null, frames = 0;
        const seq = [];
        const started = performance.now();
        let nextTap = started, down = false, stop = false;
        const tick = () => {
          const now = performance.now();
          if (now - started < totalMs && now >= nextTap) {
            down = !down;
            /* thumb down = a tap lock on this monster; thumb up = released.
               No hit ever lands: _hitByMeAt stays 0 throughout. */
            S.lockedTarget = down
              ? { type: 'monster', id: m.id, ref: m, src: 'tap', at: Date.now() }
              : null;
            nextTap = now + tapMs;
          }
          const p = ((window.__btMonsterPlates || {}).plates || [])
            .find((x) => x.id === m.id);
          if (p) {
            frames++;
            const occ = (p.hpBar && p.hpBar.vis && p.hpBar.alpha > 0) ? 'bar'
              : (p.hidden ? 'none' : 'plate');
            if (last !== null && occ !== last) { transitions++; seq.push(occ); }
            if (last === null) seq.push(occ);
            last = occ;
          }
          if (now - started < totalMs + 3000) requestAnimationFrame(tick);
          else stop = true;
        };
        requestAnimationFrame(tick);
        while (!stop) await sleep(120);
        S.lockedTarget = null;
        return { tapMs, totalMs, frames, transitions, ended: last, seq, tapping: true };
      };

      const out = [];
      /* a slow trade, a normal one, and a mashing-the-button one */
      out.push(await runFight(900, 9000));
      out.push(await runFight(450, 9000));
      out.push(await runFight(160, 9000));
      /* and the same thumb, with nothing connecting */
      out.push(await runTapping(600, 9000));
      return out;
    });

    console.log('\n── band swaps per fight (2 is the floor: one in, one out) ──');
    for (const f of flicker) {
      if (f.tapping) {
        console.log(`  TAPPING attack every ${f.tapMs}ms for ${f.totalMs / 1000}s with NO hits landing `
          + `(${f.frames} frames sampled): ${f.transitions} transition(s): ${f.seq.join(' -> ')}`);
        continue;
      }
      const swingsLanded = Math.ceil(f.totalMs / f.swingMs);
      console.log(`  swing every ${String(f.swingMs).padStart(4)}ms over ${f.totalMs / 1000}s `
        + `(~${swingsLanded} hits, ${f.frames} frames sampled): `
        + `${f.transitions} transition(s): ${f.seq.join(' -> ')}`);
    }
    const worst = Math.max(...flicker.map((f) => f.transitions));
    console.log(worst <= 2
      ? `\n  OK — worst case ${worst} transitions. The band swaps once into the fight `
        + 'and once out of it, at every swing rate. No strobe.'
      : `\n  STROBE — ${worst} transitions in one fight. PLATE_ENGAGED_MS is not `
        + 'holding the band down between swings.');
    console.log(`\n  shots: ${OUT}/rest.png, ${OUT}/fight.png`);
  } finally {
    await done();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
