/* ═══ PETS THAT MATTER, ON TWO PHONES (v2.3.3123) ═══
 *
 * docs/PET-TRAPPING-PLAN.md, Phase 4: "The land ward, stronger with level.
 * Golden and Big pets with a reveal. Other players see your pet. More Pet
 * House space."  Two real phone clients against a real worker, in the Wheel:
 *
 *   1. caps.petwards, petshow and pethouse on both;
 *   2. THE PETS PAGE says what the pet out with you wards ("Softens chills
 *      34%" for a Lv 20 Snowling at Trapping 30) and offers more room;
 *   3. THE OTHERS SEE IT: the second phone draws the first player's Snowling
 *      beside them, from the pet sheet, with no name over it; put away, it
 *      goes from the second phone too; out again, it comes back;
 *   4. MORE ROOM: 10 places for 1,000 gold, asked once, the worker's record
 *      40 places and the gold gone;
 *   5. THE WARD IN A REAL FIGHT: a Frost Ridge snowman's chill lands 660 ms
 *      long, not 1,000, the hit saying wd 34; "Ward 34%" over the pet, its
 *      ring drawn;
 *   6. THE REVEAL: a forced golden Big catch -- "Golden!" and "Big one!"
 *      over the trap, the card headed "A big golden one!" with its glow, the
 *      sweep of light across the picture and the swelling Big badge;
 *   7. no page errors on either phone.
 * Pictures: tools/qa/mp/out/petsmatter-*.png.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const shot = (P, name) => P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/petsmatter-${name}.png` }).catch(() => {});

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Keeper', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
  let stopAlive = false;
  try {
    await H.enterWorld(A);
    await H.enterWorld(B);
    const inWheel = async (P) => H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    const okA = await inWheel(A), okB = await inWheel(B);
    rec.ok('both phones in the Wheel (guard)', okA && okB, { okA, okB });
    if (!(okA && okB)) return;
    for (const P of [A, B]) if (await P.page.$('[data-chest-window]')) { await P.page.click('text=Later').catch(() => {}); await P.page.waitForTimeout(300); }
    /* the QA keep-alive (mp-wheeldoors): an idle page logs out after 2 minutes */
    (async () => {
      while (!stopAlive) {
        for (const P of [A, B]) await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {});
      }
    })();
    await steps({ A, B, wsPort, rec, errors });
  } finally {
    stopAlive = true;
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}

const openPets = async (P) => {
  await H.openDest(P, 'More').catch(() => {});
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = document.querySelector('[data-more-tile="pets"]'); if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
  return P.page.waitForSelector('[data-pets-panel]', { timeout: 5000 }).then(() => true).catch(() => false);
};
const peerPets = (P) => P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.peerPetsDrawn ? window._pixiRenderer.peerPetsDrawn() : null));

async function steps({ A, B, wsPort, rec, errors }) {
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);

  /* ── 1. caps ── */
  const caps = await Promise.all([A, B].map((P) => H.readState(P, (S) => {
    const c = S._serverCaps || {};
    return !!(c.petwards && c.petshow && c.pethouse && c.petbook);
  })));
  rec.ok('caps.petwards, petshow and pethouse on both phones', caps[0] && caps[1], caps);
  if (!(caps[0] && caps[1])) return;
  for (const id of [aId, bId]) await H.devOp(wsPort, 'quests', id);

  /* ── setup: a Lv 20 Snowling out with A, Trapping 30 ── */
  const made = await H.devOp(wsPort, 'trapping', aId, { level: 30, pet: { home: 'frost', level: 20 } });
  await A.page.waitForFunction((id) => { const b = window._gameState.current._petBook; return b && b.active === id; }, made.pet, { timeout: 8000 }).catch(() => {});
  const out0 = await H.readState(A, (S) => (S._petBook ? { active: S._petBook.active, n: S._petBook.list.length, cap: S._petBook.cap } : null));
  rec.ok('setup: a Snowling out with the first player (guard)', !!out0 && out0.active === made.pet && out0.cap === 30, { out0, made });

  /* ── 2. the Pets page ── */
  const page = await openPets(A);
  const ward = page ? await A.page.evaluate((id) => {
    const row = document.querySelector(`[data-pet-row="${id}"]`);
    const w = row && row.querySelector('[data-pet-ward]');
    return w ? { pct: w.getAttribute('data-pet-ward'), text: w.innerText.replace(/\s+/g, ' ') } : null;
  }, made.pet) : null;
  rec.ok(`the Pets page says what it wards ("${ward && ward.text}")`, !!ward && ward.pct === '34' && /Softens chills 34%/.test(ward.text), ward);
  const house = page ? await A.page.evaluate(() => { const h = document.querySelector('[data-pet-house]'); return h ? { cap: h.getAttribute('data-pet-house'), text: h.innerText.replace(/\s+/g, ' ') } : null; }) : null;
  rec.ok(`...and offers more room ("${house && house.text}")`, !!house && house.cap === '30' && /10 more places for 1,000 gold/.test(house.text), house);
  await shot(A, 'pets-page');
  await H.closeDest(A).catch(() => {});
  await A.page.waitForTimeout(400);

  /* ── 3. the others see it ── */
  const aPos = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
  await H.hopTo(B, aPos.x + 120, aPos.y + 30, { tries: 40 });
  await H.hopTo(A, aPos.x - 20, aPos.y, { tries: 10 });
  let seen = null;
  for (let i = 0; i < 40; i++) {
    const list = await peerPets(B);
    seen = list && list.find((p) => p.id === aId);
    if (seen && seen.visible && seen.tex) break;
    await B.page.waitForTimeout(250);
  }
  const wire = await B.page.evaluate((id) => { const S = window._gameState.current; return S.others && S.others[id] ? { pet: S.others[id]._pet || null, raw: S.others[id]._pwRaw || null } : null; }, aId).catch(() => null);
  rec.ok(`the second phone draws the first player's Snowling beside them (${JSON.stringify(seen)})`,
    !!seen && seen.visible && seen.kind === 'snowling' && seen.tex, { seen, wire });
  const named = await B.page.evaluate(() => {
    /* no name over another player's pet: no Text child at all on its display */
    const d = window._pixiRenderer && window._pixiRenderer.peerPetsDrawn ? window._pixiRenderer.peerPetsDrawn() : [];
    return d.length;
  });
  rec.ok('...drawn without a name over it (a pet, not a label)', named >= 1 && !!wire && wire.raw && !/name/i.test(wire.raw), wire);
  await shot(B, 'others-see');
  await A.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'pet_active', payload: { id: null } }); });
  let goneOk = false;
  for (let i = 0; i < 40 && !goneOk; i++) {
    const list = await peerPets(B);
    goneOk = !!list && !list.some((p) => p.id === aId);
    if (!goneOk) await B.page.waitForTimeout(250);
  }
  rec.ok('put away on the first phone, it goes from the second', goneOk);
  await A.page.evaluate((id) => { const S = window._gameState.current; S.channel.send({ type: 'pet_active', payload: { id } }); }, made.pet);
  let backOk = false;
  for (let i = 0; i < 40 && !backOk; i++) {
    const list = await peerPets(B);
    backOk = !!list && list.some((p) => p.id === aId && p.visible);
    if (!backOk) await B.page.waitForTimeout(250);
  }
  rec.ok('...and out again, it comes back', backOk);

  /* ── 4. more room ── */
  await H.grant(wsPort, aId, 'gold', { amount: 5000 });
  await A.page.waitForFunction(() => (window._gameState.current.rpg || {}).coins >= 5000, null, { timeout: 8000 }).catch(() => {});
  const coins0 = await H.readState(A, (S) => S.rpg.coins);
  await openPets(A);
  await A.page.click('[data-pet-house-buy="30"]').catch(() => {});
  await A.page.waitForTimeout(300);
  const asked = await A.page.evaluate(() => { const h = document.querySelector('[data-pet-house]'); return h ? h.innerText.replace(/\s+/g, ' ') : ''; });
  rec.ok(`More room asks first ("${asked}")`, /Buy 10 more places for 1,000 gold\?/.test(asked), asked);
  await A.page.click('[data-pet-house-yes="30"]').catch(() => {});
  await A.page.waitForFunction(() => { const b = window._gameState.current._petBook; return b && b.cap === 40; }, null, { timeout: 8000 }).catch(() => {});
  await A.page.waitForFunction((c) => (window._gameState.current.rpg || {}).coins === c - 1000, coins0, { timeout: 8000 }).catch(() => {});
  const after = await H.readState(A, (S) => ({ cap: S._petBook && S._petBook.cap, coins: S.rpg.coins }));
  const countText = await A.page.evaluate(() => { const c = document.querySelector('[data-pets-count]'); return c ? c.innerText : ''; });
  const srv = await H.adminPlayer(wsPort, aId).catch(() => null);
  const srvCoins = srv && srv.live && typeof srv.live.coins === 'number' ? srv.live.coins : (srv && srv.rpg ? srv.rpg.coins : null);
  rec.ok(`Buy: 40 places ("${countText}"), 1,000 gold gone (${coins0} -> ${after.coins}), the worker agreeing`,
    after.cap === 40 && after.coins === coins0 - 1000 && /\/40/.test(countText) && srvCoins === after.coins, { after, countText, srvCoins });
  await shot(A, 'more-room');
  await H.closeDest(A).catch(() => {});
  await A.page.waitForTimeout(400);

  /* ── 5. the ward in a real fight: Frost Ridge's snowmen ── */
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
  await H.devOp(wsPort, 'vitals', aId, { heal: true });
  await H.hopTo(A, at[0] + 120, at[1] + 120, { tries: 260 });
  await A.page.waitForTimeout(1500);
  const t0 = await A.page.evaluate(() => Date.now());
  let got = null;
  for (let i = 0; i < 120 && !got; i++) {
    if (i % 4 === 0) {
      const m = await A.page.evaluate(() => {
        const S = window._gameState.current;
        const ms = (S.monsters || []).filter((x) => x && x.home === 'frost' && x.alive !== false && x.hp > 0);
        ms.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
        return ms[0] ? { x: ms[0].x, y: ms[0].y } : null;
      });
      if (m) await H.hopTo(A, m.x, m.y + 36, { step: 60, gap: 200, tries: 4 });
    }
    if (i % 20 === 19) await H.devOp(wsPort, 'vitals', aId, { heal: true });
    const log = await A.page.evaluate((since) => (window.__btElemLog || []).filter((e) => e.at >= since && e.st === 'chill'), t0);
    got = log.find((e) => e.wd) || null;
    if (!got) await A.page.waitForTimeout(250);
  }
  const wardSaid = await H.readState(A, (S) => ({ said: S._wardSaid || null, hits: S._wardHits || 0, chillLeft: (S._chillUntil || 0) - Date.now() }));
  const ring = await A.page.evaluate(() => window._pixiRenderer.petDrawn());
  rec.ok(`a snowman's chill lands ${got && got.stMs} ms, not 1000, the hit saying wd ${got && got.wd}`, !!got && got.stMs === 660 && got.wd === 34, got);
  rec.ok(`..."${wardSaid.said}" over the pet, and its ring drawn (${ring && ring.wards} time(s))`, wardSaid.said === 'Ward 34%' && !!ring && ring.wards >= 1, { wardSaid, ring });
  await shot(A, 'ward');
  await H.devOp(wsPort, 'vitals', aId, { heal: true, god: true, godMinutes: 10 });

  /* ── 6. the reveal: a golden Big catch ── */
  await H.devOp(wsPort, 'trapping', aId, { traps: 5, look: { gold: true, size: 1.22 } });
  await A.page.waitForFunction(() => ((window._gameState.current.rpg || {}).inventory || {}).trap_box === 5, null, { timeout: 6000 }).catch(() => {});
  const target = async () => A.page.evaluate(() => {
    const S = window._gameState.current;
    const ms = (S.monsters || []).filter((m) => m && m.home === 'frost' && m.alive && m.curHp > 0);
    ms.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const m = ms[0];
    if (!m) return null;
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
    return { id: m.id, level: m.level, d: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)), x: m.x, y: m.y };
  });
  let m = await target();
  if (m && m.d > 200) { await H.hopTo(A, m.x + 90, m.y + 40, { tries: 40 }); await A.page.waitForTimeout(500); m = await target(); }
  rec.ok('a snowman to trap (guard)', !!m, m);
  if (!m) { rec.ok('no page errors on either phone', errors.length === 0, errors.slice(0, 5)); return; }
  await A.page.waitForSelector('[data-trap-button="ready"]', { timeout: 5000 }).catch(() => {});
  await A.page.evaluate(() => { const b = document.querySelector('[data-trap-button="ready"]'); if (b) b.click(); });
  await A.page.waitForFunction((id) => { const t = window.__btTrap && window.__btTrap(); return t && t.mark && t.mark.monsterId === id; }, m.id, { timeout: 5000 }).catch(() => {});
  await A.page.evaluate(() => { window.__btTrapFxDrawn = { gold: 0, big: 0 }; });
  await H.devOp(wsPort, 'trapping', aId, { next: 'catch', kill: m.id });
  /* the snap: the rays and the ring drawn, the words said -- before the card */
  await A.page.waitForFunction(() => { const d = window.__btTrapFxDrawn; return d && d.gold > 0; }, null, { timeout: 8000, polling: 30 }).catch(() => {});
  await shot(A, 'reveal-rays');
  await A.page.waitForFunction(() => { const t = window.__btTrap && window.__btTrap(); return t && t.reveal; }, null, { timeout: 8000 }).catch(() => {});
  const rv = await A.page.evaluate(() => ({ t: window.__btTrap && window.__btTrap(), fx: Object.assign({}, window.__btTrapFxDrawn || {}), card: !!document.querySelector('[data-trap-card]') }));
  const words = (rv.t && rv.t.reveal && rv.t.reveal.words) || [];
  rec.ok(`the catch is golden and Big: at the snap, the rays and the ring drawn (${rv.fx.gold} / ${rv.fx.big} frames) and "${words.join('" and "')}" over the trap`,
    !!rv.t && rv.t.reveal && rv.t.reveal.gold === true && rv.t.reveal.big === true && words.indexOf('Golden!') >= 0 && words.indexOf('Big one!') >= 0
      && rv.fx.gold > 0 && rv.fx.big > 0, rv);
  const card = await A.page.waitForSelector('[data-trap-card]', { timeout: 5000 }).then(() => true).catch(() => false);
  const cardInfo = card ? await A.page.evaluate(() => {
    const c = document.querySelector('[data-trap-card]');
    const sh = c.querySelector('[data-trap-card-shine]');
    return { text: c.innerText.replace(/\s+/g, ' '), glow: !!c.querySelector('[data-trap-card-glow]'), shine: !!sh,
      shineAnim: sh ? getComputedStyle(sh).animationName : null, big: !!c.querySelector('[data-trap-card-big]'),
      bigAnim: c.querySelector('[data-trap-card-big]') ? getComputedStyle(c.querySelector('[data-trap-card-big]')).animationName : null };
  }) : null;
  rec.ok(`the card: "${cardInfo && cardInfo.text.slice(0, 40)}", its glow, the sweep of light and the swelling Big badge`,
    !!cardInfo && /A big golden one!/i.test(cardInfo.text) && cardInfo.glow && cardInfo.shine && cardInfo.shineAnim === 'bt-pet-shine' && cardInfo.big && cardInfo.bigAnim === 'bt-pet-big', cardInfo);
  await A.page.waitForTimeout(500);
  await shot(A, 'reveal-card');
  await A.page.click('[data-trap-card-done]').catch(() => {});

  rec.ok('no page errors on either phone', errors.length === 0, errors.slice(0, 5));
}
