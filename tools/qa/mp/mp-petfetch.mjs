/* ═══ THE PET'S FETCH, ON A PHONE (v2.3.3806) ═══
 *
 * The owner: "Also make pets run towards loot drops and pick them up for you".
 * Spec: docs/specs/pet-fetch.md.  game/petFetch.js runs the pet; the worker's
 * reach for it is server/src/pets.js PETS.FETCH_RANGE (server/test/
 * petfetch.test.mjs holds its numbers).
 *
 * A phone held upright, then a computer (the sideways layout, wide: true), in
 * the world (Frost Ridge's first snowmen), each with a pet out:
 *   1. the worker says it reaches (caps.petfetch);
 *   2. a snowman ~350 px away is killed for you (/dev/killroll, the real kill
 *      path): its pile lands there;
 *   3. the pet leaves your heels and RUNS to it -- faster than the follow's
 *      120 px a second -- while you stand still;
 *   4. the pile goes into the bag (its coins land, the pile is taken, by the
 *      pet: a loot_credit with viaPet) and you never walked to it;
 *   5. the pet comes back to your heels;
 *   6. no page error.
 * Pictures: tools/qa/mp/out/petfetch-run-{phone,wide}.png, the run drawn over
 * the screen (pathPicture says why not a strip of screenshots).
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1366, height: 768 };

/* THE RUN IN ONE PICTURE.  This box draws a few frames a second and takes
   seconds over a screenshot, so a strip of screenshots catches one or two
   frames of a one-second run.  Instead every frame's pet place (the tracker
   below) is drawn over the screen once it is back: orange going out, blue
   coming home, a ring on the pile, a dot where it started. */
async function pathPicture(P, track, pile, path) {
  const shot = (await P.page.screenshot()).toString('base64');
  const url = await P.page.evaluate(async ({ b64, pts, pl }) => {
    const r = window._pixiRenderer;
    const cv = document.querySelector('canvas');
    if (!r || !r.petScreen || !cv) return null;
    const box = cv.getBoundingClientRect();
    const scr = r.petScreen(pts.map((q) => [q.x, q.y]).concat([[pl.x, pl.y]]));
    if (!scr) return null;
    const im = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + b64; });
    const k = im.width / window.innerWidth;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    const at = (i) => [(box.left + scr[i][0]) * k, (box.top + scr[i][1]) * k];
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = at(i);
      g.fillStyle = pts[i].phase === 'go' ? 'rgba(255,140,0,0.95)' : pts[i].phase === 'back' ? 'rgba(60,160,255,0.95)' : 'rgba(255,255,255,0.0)';
      g.beginPath(); g.arc(x, y, 4 * k, 0, Math.PI * 2); g.fill();
    }
    const first = pts.findIndex((q) => q.phase === 'go');
    if (first > 0) { const [x, y] = at(first - 1); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 7 * k, 0, Math.PI * 2); g.fill(); }
    const [px, py] = at(pts.length);
    g.strokeStyle = '#ffd54a'; g.lineWidth = 3 * k; g.beginPath(); g.arc(px, py, 18 * k, 0, Math.PI * 2); g.stroke();
    g.font = `${14 * k}px sans-serif`; g.fillStyle = '#ffd54a'; g.fillText('the pile', px + 22 * k, py + 5 * k);
    return c.toDataURL('image/png');
  }, { b64: shot, pts: track.filter((q) => q.phase || q === track[0]), pl: pile });
  if (url) writeFileSync(path, Buffer.from(url.split(',')[1], 'base64'));
  return !!url;
}

async function onePhone({ browser, wsPort, webPort, rec, OUT, label, opts }) {
  const P = await H.newPlayer(browser, Object.assign({ name: 'Fetch' + label, wsPort, webPort, world: 'wheel', query: 'droplines=0' }, opts));
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the world' }).catch(() => null);
    rec.ok(`[${label}] in the world, "BroTown" on the top bar (guard)`, !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);

    /* ── 1 ── */
    const caps = await H.readState(P, (S) => ({ fetch: !!(S._serverCaps && S._serverCaps.petfetch), loot: !!(S._serverCaps && S._serverCaps.petLoot) }));
    rec.ok(`[${label}] the worker reaches for a fetch (caps.petfetch, and the vacuum's caps.petLoot)`, caps.fetch && caps.loot, caps);

    /* a pet out with you (mp-petdraw's way), untouchable, the quests done */
    await H.devOp(wsPort, 'vitals', me, { god: true, godMinutes: 30 }).catch(() => {});
    await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
    const made = await H.devOp(wsPort, 'trapping', me, { level: 5, pet: { home: 'frost', level: 1 } }).catch(() => null);
    const outWith = !!(made && made.pet) && await P.page.waitForFunction((id) => {
      const b = window._gameState.current._petBook;
      return !!(b && b.active === id);
    }, made.pet, { timeout: 8000 }).then(() => true).catch(() => false);
    rec.ok(`[${label}] a pet out with you (guard)`, outWith, made);
    if (!outWith) return;

    /* to Frost Ridge's first snowmen (mp-killroll's way) */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
    await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
    await P.page.waitForTimeout(1500);
    const near = () => P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      return (S.monsters || []).filter((m) => m && m.alive !== false && m.home === 'frost' && !m.tier)
        .map((m) => ({ id: m.id, x: Math.round(m.x), y: Math.round(m.y), d: Math.round(Math.hypot(m.x - p.x, m.y - p.y)) }))
        .sort((a, b) => a.d - b.d);
    });
    const list = await near();
    rec.ok(`[${label}] at Frost Ridge's snowmen (${list.length} in sight) (guard)`, list.length >= 1, list.slice(0, 3));
    if (!list.length) return;

    /* stand ~350 px south of one, on open snow: a few tries for a clear line */
    let target = null, stand = null;
    for (const m of list.slice(0, 6)) {
      for (const [ox, oy] of [[0, 350], [0, -350], [330, 120], [-330, 120]]) {
        await H.hopTo(P, m.x + ox, m.y + oy, { tries: 30 });
        await P.page.waitForTimeout(500);
        const s = await P.page.evaluate((mm) => {
          const S = window._gameState.current, p = S.player;
          const live = (S.monsters || []).find((q) => q && q.id === mm.id && q.alive !== false);
          const d = live ? Math.hypot(live.x - p.x, live.y - p.y) : -1;
          return { x: p.x, y: p.y, d: Math.round(d), mx: live ? live.x : null, my: live ? live.y : null };
        }, m);
        /* the pet's own rule: no water or wall on its line (game/petFetch.js) */
        const clear = s.d > 0 && await P.page.evaluate(([x0, y0, x1, y1]) => {
          const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 16);
          for (let i = 1; i <= n; i++) if (window.__btPetBlockedAt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
          return true;
        }, [s.x - 30, s.y + 20, s.mx, s.my]);
        if (s.d >= 280 && s.d <= 420 && clear) { target = m; stand = s; break; }
      }
      if (target) break;
    }
    rec.ok(`[${label}] standing ${stand && stand.d} px from a live snowman (guard: 280-420)`, !!target, stand);
    if (!target) return;
    /* the pet settles at your heels (after a hop it walks back at the follow's pace) */
    const heel = await H.waitFor(P, (S) => Math.round(Math.hypot(S._petX - S.player.x, S._petY - S.player.y)), (v) => v < 80, { timeout: 30000, label: 'the pet at your heels' }).catch(() => null);
    rec.ok(`[${label}] the pet at your heels before the kill (${heel} px) (guard)`, heel != null, heel);
    await P.page.waitForTimeout(500);
    const before = await H.readState(P, (S) => ({ coins: (S.rpg && S.rpg.coins) || 0, piles: (S.groundLoot || []).map((l) => l.lootId) }));

    /* every frame from the kill: where the pet is, where you are, the fetch */
    await P.page.evaluate(() => {
      const out = []; let on = true;
      window.__pfTrack = out; window.__pfStop = () => { on = false; };
      const look = () => {
        if (!on) return;
        const f = window.__btPetFetch ? window.__btPetFetch() : null;
        if (f) {
          const id = window.__pfPileId, S = window._gameState.current;
          const l = id && (S.groundLoot || []).find((q) => q && q.lootId === id);
          out.push(Object.assign({ t: performance.now(), lx: l ? l.x : null, ly: l ? l.y : null }, f));
        }
        requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    });

    await P.page.evaluate((ids) => { window.__pfBefore = ids; }, before.piles);
    /* ── 2 ── the kill: a "nothing" roll, so the pile is the coins */
    const kill = await H.devOp(wsPort, 'killroll', me, { next: 7431, kill: target.id }).catch((e) => ({ error: String(e) }));
    const pile = await H.waitFor(P, (S) => {
      const p = S.player;
      const l = (S.groundLoot || []).find((q) => q && q._serverLoot && Array.isArray(q.recipients) && q.recipients.includes(S.myId) && !q.isDeathDrop && (window.__pfBefore || []).indexOf(q.lootId) < 0);
      return l ? { id: l.lootId, x: Math.round(l.x), y: Math.round(l.y), d: Math.round(Math.hypot(l.x - p.x, l.y - p.y)), coins: l.coins } : null;
    }, (v) => !!v, { timeout: 8000, label: 'the pile' }).catch(() => null);
    rec.ok(`[${label}] the snowman killed for you, its pile ${pile && pile.d} px away`, !!kill && kill.killed === target.id && !!pile && pile.d > 200, { kill, pile });
    if (!pile) return;
    await P.page.evaluate((id) => { window.__pfPileId = id; }, pile.id);

    /* ── 4 ── in the bag */
    const taken = await H.waitFor(P, (S) => {
      const f = window.__btPetFetch ? window.__btPetFetch() : null;
      return f && f.credited.indexOf(window.__pfPileId) >= 0 ? { coins: (S.rpg && S.rpg.coins) || 0 } : null;
    }, (v) => !!v, { timeout: 10000, label: 'the credit' }).catch(() => null);
    const mePos = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
    await P.page.waitForTimeout(800);   /* the player_state after the credit */
    const bag = await H.readState(P, (S) => ((S.rpg && S.rpg.coins) || 0));
    rec.ok(`[${label}] the pile went into the bag by the pet (a loot_credit with viaPet; coins ${before.coins} -> ${bag})`,
      !!taken && bag > before.coins, { taken, bag, before, pile });
    rec.ok(`[${label}] ...and you never walked to it (${Math.round(Math.hypot(mePos.x - stand.x, mePos.y - stand.y))} px moved)`, Math.hypot(mePos.x - stand.x, mePos.y - stand.y) < 40, { mePos, stand });

    /* ── 3, 5 ── the run and the way back, from the frames.  This box draws
       a few frames a second, so a pace is per frame of the game's own clock
       (S._dtScale: 1 a 60 Hz frame; TRAPS §200), never per second */
    await H.waitFor(P, () => { const f = window.__btPetFetch(); return f.phase; }, (v) => !v, { timeout: 20000, label: 'the run done' }).catch(() => null);
    await P.page.waitForTimeout(600);
    const track = await P.page.evaluate(() => { window.__pfStop && window.__pfStop(); return window.__pfTrack || []; });
    let maxNear = Infinity, goDist = 0, goDt = 0, goFrames = 0;
    for (let i = 0; i < track.length; i++) {
      const f = track[i];
      if (f.lootId === pile.id) maxNear = Math.min(maxNear, Math.hypot(f.x - pile.x, f.y - pile.y));
      if (i > 0 && track[i - 1].phase === 'go' && f.phase === 'go') {
        const d = Math.hypot(f.x - track[i - 1].x, f.y - track[i - 1].y);
        if (d > 0.01) { goDist += d; goDt += f.dt; goFrames++; }
      }
    }
    const fin = await P.page.evaluate(() => window.__btPetFetch());
    const pace = Math.round((fin.pace || 0) * 100) / 100;
    const closest = fin.closest != null ? fin.closest : maxNear;
    if (!fin.goSteps) {
      const pl = await P.page.evaluate((id) => { const l = (window._gameState.current.groundLoot || []).find((q) => q && q.lootId === id); return l ? { e: !!l._expired, c: !!l._collected, r: l.recipients, s: !!l._serverLoot, d: !!l.isDeathDrop } : 'gone'; }, pile.id);
      console.log(`   [${label}] no run: ${JSON.stringify({ why: fin.why, skip: fin.skip, pile: pl })}`);
    }
    rec.ok(`[${label}] the pet LEFT your heels and RAN to the pile (${fin.goSteps} steps running, ${Math.round(closest)} px from it at its closest: on it, or as near as the ground lets it, 70; ${pace} px a 60 Hz frame; the follow is 2, your walk 2.5)`,
      fin.goSteps >= 2 && closest <= 70 && pace > 3, { fin, maxNear, goFrames });
    const last = track[track.length - 1] || null;
    rec.ok(`[${label}] ...and came back to your heels (${last && Math.round(Math.hypot(last.x - last.px, last.y - last.py))} px from you, the fetch done, ${last && last.got} fetched)`,
      !!last && !last.phase && Math.hypot(last.x - last.px, last.y - last.py) < 90 && last.got >= 1, last);

    const pic = await pathPicture(P, track, pile, join(OUT, `petfetch-run-${label}.png`)).catch(() => false);
    rec.ok(`[${label}] the run drawn over the screen: tools/qa/mp/out/petfetch-run-${label}.png`, pic, pic);

    /* ── 6 ── */
    rec.ok(`[${label}] no page error`, errors.length === 0, errors);
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  await onePhone({ browser, wsPort, webPort, rec, OUT, label: 'phone', opts: { viewport: PHONE, touch: true } });
  await onePhone({ browser, wsPort, webPort, rec, OUT, label: 'wide', opts: { viewport: WIDE, wide: true } });
}
