/* v2.3.3067: THE REST OF TOWN'S CAST, IN THE WHEEL'S BROTOWN -- on a phone.
 *
 * Asked to "keep going with pragmatic enhancements": Ace, Blacksmith Bro and
 * Lil Bro had stayed in today's town, which nobody walks any more, and Ace's
 * coin flip (the owner's v2.3.2618 "triple your money or lose 3x") opens only
 * on a tap on Ace -- so it could not be played at all.  Now they stand in the
 * Wheel's Brotown (src/data/wheelBuildingDoors.js WHEEL_TOWNSFOLK).
 *
 *   1. the cast is all there: Mayor Bro, Diego, Ace, Blacksmith Bro and Lil
 *      Bro, each where WHEEL_TOWNSFOLK puts him, standing still;
 *   2. their pictures came in behind the loading screen: none of the five
 *      fetched after you arrive (the preload law), and what they hold;
 *   3. Lil Bro is on your screen where you arrive;
 *   4. each is drawn, the size Diego is, facing the street;
 *   5. a TAP on Ace opens his coin flip, and a flip there is settled by the
 *      worker (the coins move by three times the stake, either way);
 *   6. E beside him opens it too (it said "has nothing for you");
 *   7. a tap on Lil Bro answers ("has nothing for you right now"), so he is a
 *      man in the street and not a picture;
 *   8. no page errors.
 * Pictures: tools/qa/mp/out/wheelfolk-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const { WHEEL_TOWNSFOLK } = await import(H.REPO + '/src/data/wheelBuildingDoors.js');
  const { NPC_DATA } = await import(H.REPO + '/src/data/gameDisplay.js');

  const P = await H.newPlayer(browser, { name: 'Folkbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `wheelfolk-${name}.png`) }).catch(() => {});
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  /* every NPC picture the page asks for, and when: the five figures' files
     (a dialogue's head portrait is a page <img>, not a texture -- left out) */
  const figureFiles = new Set();
  for (const n of NPC_DATA) {
    if (n.sprite) figureFiles.add(n.sprite.replace(/^.*\/sprites\/npc\//, ''));
    if (n.walk && n.walk.base) for (const d of n.walk.dirs || []) figureFiles.add(n.walk.base.replace(/^.*\/sprites\/npc\//, '') + d + '.webp');
  }
  const npcReqs = [];
  P.page.on('request', (r) => {
    const f = r.url().split('?')[0].replace(/^.*\/sprites\/npc\//, '');
    if (/\/sprites\/npc\//.test(r.url()) && figureFiles.has(f)) npcReqs.push({ f, t: Date.now() });
  });
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();

  try {
    await H.enterWorld(P);
    const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    const arrivedAt = Date.now();
    rec.ok('in the Wheel (guard)', !!inWheel, inWheel);
    if (!inWheel) return;
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    await P.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    await A11yHide(P);

    /* ── 1. the cast ── */
    const cast = await H.waitFor(P, (S) => ({
      npcs: (S.npcs || []).map((n) => ({ name: n.name, x: n.x, y: n.y, r: n.pathRadius, flip: !!n.flip })),
      doors: window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : [],
    }), (v) => v.npcs.length >= 5 && v.doors.length > 0, { timeout: 20000, label: 'the cast' }).catch(() => null);
    const byDoor = Object.fromEntries(((cast && cast.doors) || []).map((d) => [d.id, d]));
    const where = (name) => {
      const f = WHEEL_TOWNSFOLK.find((q) => q.name === name), d = f && byDoor[f.door];
      return d ? { x: d.x + f.dx, y: d.y + f.dy } : null;
    };
    const npc = (name) => ((cast && cast.npcs) || []).find((n) => n.name === name);
    const names = ((cast && cast.npcs) || []).map((n) => n.name).sort().join(', ');
    const placedRight = WHEEL_TOWNSFOLK.every((f) => { const n = npc(f.name), w = where(f.name); return n && w && Math.abs(n.x - w.x) < 1 && Math.abs(n.y - w.y) < 1 && n.r === 0; });
    rec.ok(`the Wheel's Brotown has its whole cast (${names}), each where WHEEL_TOWNSFOLK puts him, standing still`,
      names === 'Ace, Blacksmith Bro, Diego, Lil Bro, Mayor Bro' && placedRight && !!npc('Ace').flip,
      { names, placed: WHEEL_TOWNSFOLK.map((f) => [f.name, npc(f.name), where(f.name)]) });

    /* ── 2. their pictures, behind the loading screen ── */
    await P.page.waitForTimeout(1500);
    const late = npcReqs.filter((q) => q.t > arrivedAt);
    const art = await P.page.evaluate(() => (window.__btWheelNpcArt ? window.__btWheelNpcArt() : null));
    rec.ok(`their pictures came in behind the loading screen -- none fetched after arriving -- and the five hold ${art ? art.mb : '?'} MB (walkers' south strips ${art ? art.cropMb : '?'} MB cropped, pictures ${art ? art.picMb : '?'} MB)`,
      late.length === 0 && !!art && art.loaded && art.walkers.sort().join() === ['card_sharp', 'lil_bro', 'shopkeeper_bro'].sort().join()
        && art.pictures.length === 2 && art.mb < 3,
      { late, art, asked: npcReqs.map((q) => [q.f, q.t - arrivedAt]) });

    /* ── 3. Lil Bro on screen where you arrive ── */
    const lilOnArrival = await P.page.evaluate(() => {
      const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
      const n = (S.npcs || []).find((q) => q.name === 'Lil Bro');
      if (!n || !S.camera) return null;
      const x = r.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y = r.top + (n.y - S.camera.y) * (S._worldScaleY || 1);
      return { x: Math.round(x), y: Math.round(y), vw: window.innerWidth, vh: window.innerHeight, me: [Math.round(S.player.x), Math.round(S.player.y)] };
    });
    await shot('arrival');
    rec.ok(`Lil Bro is on your screen where you arrive (${lilOnArrival ? lilOnArrival.x + ', ' + lilOnArrival.y : '?'} on a ${PHONE.width} x ${PHONE.height} phone)`,
      !!lilOnArrival && lilOnArrival.x > 8 && lilOnArrival.x < lilOnArrival.vw - 8 && lilOnArrival.y > 60 && lilOnArrival.y < lilOnArrival.vh - 60, lilOnArrival);

    /* ── 4. each one drawn, as Diego is ── */
    const standNear = async (name, dx, dy) => {
      const w = where(name);
      if (!w) return false;
      await H.hopTo(P, w.x + dx, w.y + dy, { step: 100, gap: 260, tries: 90 });
      await P.page.waitForTimeout(900);
      return true;
    };
    const drawnOf = (name) => P.page.evaluate((nm) => {
      const d = (window.__btNpcSprites ? window.__btNpcSprites() : []).find((n) => n.name === nm);
      return d ? { h: Math.round(d.height), w: Math.round(d.width), x: Math.round(d.x), y: Math.round(d.y), dir: d.walkDir, src: d.src } : null;
    }, name);
    const drawn = {};
    for (const f of WHEEL_TOWNSFOLK) {
      await standNear(f.name, 40, 70);
      drawn[f.name] = await drawnOf(f.name);
      /* Diego's drawer opens as you walk up to him and stays while you shop
         (as in today's town): shut it, or it sits over the next pictures */
      await P.page.evaluate(() => { const b = document.querySelector('[data-shop-close]'); if (b) b.click(); });
      await P.page.waitForTimeout(300);
      await shot(f.name.toLowerCase().replace(/\s+/g, '-'));
    }
    const dh = drawn.Diego && drawn.Diego.h;
    rec.ok(`each is drawn where he stands, a man's height (${WHEEL_TOWNSFOLK.map((f) => f.name + ' ' + (drawn[f.name] ? drawn[f.name].h + ' px' : 'NOT DRAWN')).join(', ')}), the walkers facing the street`,
      WHEEL_TOWNSFOLK.every((f) => { const d = drawn[f.name], w = where(f.name); return d && w && Math.abs(d.x - w.x) < 1 && Math.abs(d.y - w.y) < 1 && d.h > 60 && d.h < 240; })
        && ['Ace', 'Lil Bro', 'Diego'].every((n) => /-walk-south\.webp$/.test(drawn[n].src || '')) && dh > 100,
      drawn);

    /* ── 5. a tap on Ace opens his coin flip, and a flip is settled ── */
    await H.grant(wsPort, id, 'gold', { amount: 600 });
    await P.page.waitForTimeout(1500);
    await standNear('Ace', 36, 30);
    const aceCss = async () => {
      let prev = null;
      for (let i = 0; i < 40; i++) {
        const cur = await P.page.evaluate(() => {
          const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
          const n = (S.npcs || []).find((q) => q.name === 'Ace');
          return n && S.camera ? { x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) - 26 } : null;
        });
        if (cur && prev && Math.abs(cur.x - prev.x) < 1.5 && Math.abs(cur.y - prev.y) < 1.5) return cur;
        prev = cur;
        await P.page.waitForTimeout(80);
      }
      return prev;
    };
    const at = await aceCss();
    if (at) await P.page.touchscreen.tap(at.x, at.y);
    const opened = await H.waitFor(P, () => ({ open: !!(window.__btAceFlipBus && window.__btAceFlipBus.open), tap: window.__btNpcTap || null,
      text: /Gambler/.test(document.body.textContent || '') && /Your stake/.test(document.body.textContent || '') }),
    (v) => v.open && v.text, { timeout: 6000, label: 'the flip open' }).catch(() => null);
    await shot('flip-open');
    rec.ok('a tap on Ace opens his coin flip (it could not be reached since the Wheel became the world)',
      !!opened && opened.tap && opened.tap.npc === 'Ace' && opened.tap.result === 'flip', { at, opened });

    const coinsNow = () => H.adminPlayer(wsPort, id).then((a) => (a && a.rpg ? a.rpg.coins : null)).catch(() => null);
    const coins0 = await coinsNow();
    const chip = await P.page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((q) => (q.textContent || '').trim() === '10');
      if (!b) return null;
      b.click();
      return true;
    });
    await P.page.waitForTimeout(400);
    const flipped = await P.page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((q) => /^Flip for \d+g$/.test((q.textContent || '').trim()));
      if (!b || b.disabled) return null;
      const t = b.textContent.trim();
      b.click();
      return t;
    });
    const result = await H.waitFor(P, () => (window.__btAceFlipBus && window.__btAceFlipBus.result) || null, (v) => !!v,
      { timeout: 8000, label: 'the flip result' }).catch(() => null);
    let coins1 = await coinsNow();
    for (let i = 0; i < 20 && coins1 === coins0; i++) { await P.page.waitForTimeout(250); coins1 = await coinsNow(); }
    await shot('flip-result');
    rec.ok(`...and a flip there is the worker's: "${flipped}" ${result ? (result.won ? 'won' : 'lost') : '?'}, the coins ${coins0} -> ${coins1}`,
      !!chip && flipped === 'Flip for 30g' && !!result && typeof result.won === 'boolean'
        && coins1 - coins0 === (result.won ? 30 : -30) && result.delta === coins1 - coins0,
      { chip, flipped, result, coins0, coins1 });
    await P.page.evaluate(() => { if (window.__btAceFlipBus) window.__btAceFlipBus.setOpen(false); });
    await P.page.waitForTimeout(500);

    /* ── 6. E beside him opens it too ──
       From his WEST side: on the den's side your boots are within its door's
       reach, and E is the Enter button's key first (desktopControls.js: a
       door before a person), as it is at Diego's store. */
    await standNear('Ace', -60, 16);
    const nearE = await H.waitFor(P, (S) => ({ npc: S._nearNpc ? S._nearNpc.name : null, door: S._nearWheelBuilding ? S._nearWheelBuilding.id : null }),
      (v) => v.npc === 'Ace' && !v.door, { timeout: 4000, label: 'near Ace, no door' }).catch((e) => String(e.message).slice(-120));
    await P.page.keyboard.press('e');
    const eOpen = await H.waitFor(P, () => !!(window.__btAceFlipBus && window.__btAceFlipBus.open), (v) => v, { timeout: 4000, label: 'E opens the flip' }).catch(() => false);
    const eElse = await P.page.evaluate(() => { const c = document.querySelector('.bt-inspect-card'); return c ? c.getAttribute('data-building-panel') || 'a panel' : null; });
    rec.ok('E beside him opens it too (it said "Ace has nothing for you right now")', !!nearE && nearE.npc === 'Ace' && eOpen === true, { nearE, eOpen, eElse });
    await P.page.evaluate(() => {
      if (window.__btAceFlipBus) window.__btAceFlipBus.setOpen(false);
      const b = document.querySelector('.bt-inspect-close'); if (b) b.click();
    });
    await P.page.waitForTimeout(500);

    /* ── 7. a tap on Lil Bro answers ── */
    await standNear('Lil Bro', 30, 24);
    const lil = await (async () => {
      let prev = null;
      for (let i = 0; i < 40; i++) {
        const cur = await P.page.evaluate(() => {
          const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
          const n = (S.npcs || []).find((q) => q.name === 'Lil Bro');
          return n && S.camera ? { x: r.left + (n.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (n.y - S.camera.y) * (S._worldScaleY || 1) - 26 } : null;
        });
        if (cur && prev && Math.abs(cur.x - prev.x) < 1.5 && Math.abs(cur.y - prev.y) < 1.5) return cur;
        prev = cur;
        await P.page.waitForTimeout(80);
      }
      return prev;
    })();
    const tappedAt = Date.now();
    if (lil) await P.page.touchscreen.tap(lil.x, lil.y);
    await P.page.waitForTimeout(500);
    const lilTap = await P.page.evaluate((t0) => { const r = window.__btNpcTap; return r && r.ts >= t0 - 50 ? r : { stale: r || null }; }, tappedAt);
    rec.ok('a tap on Lil Bro answers ("has nothing for you right now"): a man in the street, not a picture',
      !!lilTap && lilTap.npc === 'Lil Bro' && lilTap.result === 'nothing', lilTap);

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 6));
  } finally {
    stopAlive = true;
    await P.ctx.close().catch(() => {});
  }
}

/* the quest's banner and plate sit over the street on a phone */
async function A11yHide(P) {
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
}
