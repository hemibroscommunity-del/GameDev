/* SOAK: does anything GROW while you play? (v2.3.1741)
 *
 * Owner: "during a full playtest the game slowed down significantly towards
 * the end (as if framerate drop was slowly accumulating)."  That shape —
 * fine at first, worse the longer you play — is a leak, not a cost.  A
 * per-frame cost is bad from second one; a leak gets worse because something
 * is being added and never removed, and every frame walks it.
 *
 * One of exactly this kind was found and fixed at v2.3.1735 (_impactRings
 * skipped finished rings with `continue` instead of splicing, so the array
 * grew for the whole session and every frame re-walked every ring ever
 * spawned).  That it existed at all says the pattern is worth sweeping for
 * rather than reasoning about.
 *
 * This drives sustained combat in a real browser and samples, at intervals:
 *   - the length of every array hanging off the game state
 *   - the size of every Map/Set on the renderers
 *   - the Pixi scene-graph child counts
 *   - JS heap, when the browser exposes it
 *
 * and reports what GREW between the first and last sample.  It deliberately
 * does not assert against a hand-picked list of suspects — the point is to
 * find the one nobody thought of.
 *
 * Run: node tools/qa/mp/run.mjs soak     (or soak-only via this file)
 */
import * as H from './harness.mjs';

/* Long enough for a slow leak to separate from start-up noise, short enough
   to sit in CI's 15-minute job budget. */
const SOAK_MS = Number(process.env.BT_SOAK_MS || 90000);
const SAMPLE_EVERY_MS = 15000;

/* Counting probe.  Runs in the page; returns a flat {name: count} map. */
const PROBE = () => {
  const S = window._gameState && window._gameState.current;
  const out = {};
  if (!S) return out;
  for (const k of Object.keys(S)) {
    const v = S[k];
    if (Array.isArray(v)) out['S.' + k] = v.length;
    else if (v instanceof Map || v instanceof Set) out['S.' + k] = v.size;
    else if (v && typeof v === 'object' && !v.nodeType) {
      /* plain id-keyed maps (others, monsters-by-id caches, cooldowns) */
      const n = Object.keys(v).length;
      if (n > 0 && n < 100000) out['S.' + k + '{}'] = n;
    }
  }
  const R = window._pixiRenderer;
  if (R) {
    /* KNOWN COVERAGE LIMIT, stated rather than papered over: the pools most
       likely to leak per-entity display objects (monsterDisplays,
       otherPlayerDisplays, the remote-swing sprite maps) live on the
       entity/effects sub-renderers, which initPixiRenderer keeps in CLOSURE
       and never exposes — window._pixiRenderer is a facade of functions.  So
       this probe cannot count them, and a leak confined to those maps would
       pass here.  What DOES cover them indirectly is the scene-graph walk
       below: an orphaned display object still shows up as a child somewhere.
       If a leak is ever traced to one of those maps, expose them on the
       facade behind the existing autotest surface rather than widening this. */
    for (const k of Object.keys(R)) {
      const v = R[k];
      if (v instanceof Map || v instanceof Set) out['R.' + k] = v.size;
      else if (Array.isArray(v) && v.length) out['R.' + k] = v.length;
    }
    /* Scene graph: a pooled sprite that is created and never destroyed shows
       up here even when the pool that owns it looks stable. */
    const walk = (c, label, depth) => {
      if (!c || !c.children || depth > 2) return;
      out['gfx.' + label] = c.children.length;
      if (depth < 2) {
        c.children.forEach((ch, i) => {
          if (ch && ch.children && ch.children.length > 8) walk(ch, label + '/' + i, depth + 1);
        });
      }
    };
    try { if (R.app && R.app.stage) walk(R.app.stage, 'stage', 0); } catch (e) {}
  }
  if (window.performance && performance.memory) out['heapMB'] = Math.round(performance.memory.usedJSHeapSize / 1048576);
  return out;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Soaker', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* Sustained local combat: monsters are injected and kept alive so the hit
     effects, popups, particles and death/respawn paths all run continuously.
     Local AI (not a server zone) so the load is deterministic and does not
     depend on where the worker happens to spawn things. */
  /* ═══ v2.3.1741b: MAXIMISE KILLS, which is what the owner was doing ═══
     Owner: "about 15-20 minutes of gameplay but LOTS of monster killing."

     The first cut of this soak was wrong twice over.  It joined in TOWN,
     which has no monsters, and on the server path it never injected any — so
     "90s of sustained combat" was 90s of swinging at nothing.  And where it
     did inject, it kept reviving the same three monsters, so there were
     almost no DEATHS.  Both flaws hid exactly the thing being hunted: a leak
     that accrues per KILL.

     This drives the client's own kill path — local AI with 1 HP monsters that
     die on contact and are immediately replaced.  Local rather than server
     monsters ON PURPOSE: the accumulation is client-side (the owner's reload
     cleared it), and this is the client's death/loot/effect path at a kill
     rate no real session could reach, which is how 20 minutes of play gets
     compressed into a few. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return;
    S._serverMonsters = false;
    S.autoAttack = true;
    window.__kills = 0;
    /* COUNT THE POPUPS, not just the kills.  The leak this harness found is
       driven by damage NUMBERS, i.e. by HITS — and in a server zone the local
       tick runs with applyHp:false, so injected monsters take predicted
       damage (and mint popups) without ever dying.  Asserting on kills alone
       therefore failed a run that was exercising the bug perfectly.  Hook the
       push so the guard measures what actually drives the accumulation. */
    window.__popupCount = 0;
    if (S.dmgNumbers && !S.dmgNumbers.__hooked) {
      const _push = S.dmgNumbers.push.bind(S.dmgNumbers);
      S.dmgNumbers.push = function (...a) { window.__popupCount += a.length; return _push(...a); };
      S.dmgNumbers.__hooked = true;
    }
    let seq = 0;
    const mk = () => {
      seq++;
      return {
        id: 'soak_' + seq, arch: 'fodder', archetype: 'fodder', type: 'fodder',
        x: S.player.x + 26 + (seq % 3) * 6, y: S.player.y + ((seq % 2) ? 10 : -10),
        renderX: S.player.x + 26, renderY: S.player.y,
        spawnX: S.player.x + 26, spawnY: S.player.y,
        hp: 1, curHp: 1, maxHp: 1, dmg: 0, level: 1, gold: 1,
        alive: true, statuses: {}, _stuckArrows: [], respawnAt: 0, moveTimer: 0,
        _atkCd: 0, _stunUntil: 0,
      };
    };
    S.monsters = [mk(), mk(), mk()];
    clearInterval(window.__soakPin);
    window.__soakPin = setInterval(() => {
      if (!S.rpg) return;
      S.rpg.hp = S.rpg.maxHp; S.rpg.mana = S.rpg.maxMana; S.rpg.stamina = S.rpg.maxStamina;
      S.autoAttack = true;
      /* Retire the dead and replace them with NEW ids, so each one is a
         genuine death + spawn rather than the same object revived. */
      for (let i = S.monsters.length - 1; i >= 0; i--) {
        const m = S.monsters[i];
        if (!m.alive || m.curHp <= 0) { S.monsters.splice(i, 1); window.__kills++; }
      }
      while (S.monsters.length < 3) S.monsters.push(mk());
    }, 250);
  });

  /* FRAME TIME is the symptom the owner reported, so measure it directly
     rather than inferring it from collection sizes.  A rolling rAF probe
     records the mean and the 95th percentile over each sample window; a leak
     that costs per-frame work shows here even when nothing obvious is
     growing. */
  await P.page.evaluate(() => {
    window.__ft = [];
    let last = performance.now();
    const tick = (now) => {
      const d = now - last; last = now;
      if (d > 0 && d < 500) window.__ft.push(d);
      if (window.__ft.length > 4000) window.__ft.shift();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.__ftDrain = () => {
      const a = window.__ft.slice().sort((x, y) => x - y);
      window.__ft = [];
      if (!a.length) return null;
      const mean = a.reduce((s2, v) => s2 + v, 0) / a.length;
      return { n: a.length, mean: +mean.toFixed(2), p95: +a[Math.floor(a.length * 0.95)].toFixed(2) };
    };
  });

  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < SOAK_MS) {
    await P.page.waitForTimeout(SAMPLE_EVERY_MS);
    const s = await P.page.evaluate(PROBE);
    const ft = await P.page.evaluate(() => window.__ftDrain && window.__ftDrain());
    samples.push({ t: Math.round((Date.now() - t0) / 1000), s, ft });
    const cur = samples[samples.length - 1];
    const act = await P.page.evaluate(() => ({ kills: window.__kills || 0, popups: window.__popupCount || 0 }));
    cur.kills = act.kills; cur.popups = act.popups;
    console.log(`      soak t=${cur.t}s  hits=${act.popups} kills=${act.kills}  keys=${Object.keys(s).length}`
      + (ft ? `  frame mean=${ft.mean}ms p95=${ft.p95}ms` : ''));
  }
  await P.page.evaluate(() => clearInterval(window.__soakPin));

  console.log('      watched: ' + Object.keys(samples[0].s).sort().join(' '));
  rec.ok('the soak collected enough samples to compare', samples.length >= 3, samples.length);
  /* A soak that produced no combat proves nothing — the first version of
     this file passed clean while swinging at empty air.  The bar is DAMAGE
     POPUPS, because that is what drives the accumulation this harness exists
     to catch; kills are reported alongside but are not the gate (a server
     zone runs the local tick with applyHp:false, so a perfectly valid soak
     can hit constantly and kill nothing). */
  const totalPopups = samples.length ? (samples[samples.length - 1].popups || 0) : 0;
  /* Scaled to the run length rather than a flat number: the harness is run at
     90s locally and longer on demand (BT_SOAK_MS), and a fixed bar sized for
     one duration fails the other for no reason.  Observed rate is ~1
     popup/sec; half that is a floor that a real fight clears easily and an
     empty room cannot. */
  const popupFloor = Math.round((SOAK_MS / 1000) * 0.5);
  rec.ok('the soak actually fought something (a zero-hit run proves nothing)',
    totalPopups > popupFloor,
    { popups: totalPopups, floor: popupFloor, kills: samples.length ? samples[samples.length - 1].kills : 0 });
  if (samples.length < 3) { await P.ctx.close().catch(() => {}); return; }

  /* Compare the SECOND sample to the last: the first is start-up (assets
     resolving, pools filling) and would flag growth that is really warm-up. */
  const base = samples[1].s, last = samples[samples.length - 1].s;
  const spanS = samples[samples.length - 1].t - samples[1].t;
  const grew = [];
  for (const k of Object.keys(last)) {
    const a = base[k] || 0, b = last[k];
    if (typeof b !== 'number') continue;
    const delta = b - a;
    /* Growth that matters: meaningfully bigger AND not a rounding wobble.
       heapMB is reported but never failed on — GC timing makes it noisy. */
    if (k === 'heapMB') continue;
    if (delta > 20 && b > a * 1.5) grew.push({ what: k, from: a, to: b, perMin: +(delta / (spanS / 60)).toFixed(1) });
  }
  grew.sort((x, y) => y.perMin - x.perMin);

  console.log('      heap: ' + (base.heapMB || '?') + 'MB -> ' + (last.heapMB || '?') + 'MB');
  if (grew.length) for (const g of grew) console.log(`      GREW ${g.what}: ${g.from} -> ${g.to}  (+${g.perMin}/min)`);

  /* THE ASSERTION.  Nothing the player never sees should keep growing for the
     length of a session.  A real leak reports hundreds-to-thousands per
     minute here; a busy-but-bounded list does not move at all. */
  rec.ok('nothing grows without bound while you play',
    grew.length === 0, grew.slice(0, 6));

  /* THE SYMPTOM ITSELF.  Compare the second window to the last: if the frame
     cost is climbing, the game is getting slower the longer it runs, which is
     exactly what the owner described — and it is true whether or not the
     cause is one of the collections above. */
  const ftA = samples[1].ft, ftB = samples[samples.length - 1].ft;
  if (!ftA || !ftB) {
    rec.skip('frame time stays flat', 'no frame samples (headless rAF unavailable)');
  } else {
    console.log(`      frame mean ${ftA.mean}ms -> ${ftB.mean}ms   p95 ${ftA.p95}ms -> ${ftB.p95}ms`);
    rec.ok('the frame cost is not climbing over a session',
      ftB.mean <= ftA.mean * 1.35 + 1.5, { first: ftA, last: ftB });
  }

  await P.ctx.close().catch(() => {});
}
