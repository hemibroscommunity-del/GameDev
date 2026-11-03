/* ═══ v2.3.4032: RARE FISH, ON A PHONE, IN THE WHEEL ═══
 *
 * The owner, 2026-11-02: "Add a 1% chance of catching an albino version of
 * whatever fish you're trying to catch. Consuming adds a one time 5
 * achievement point bonus. ... Doing an 'inspect' will roll for finding the
 * weight of the fish. Include leaderboards for largest caught types of fish
 * (triggered by inspection)."  The worker rolls, weighs and ranks
 * (server/src/fishlog.js; server/test/fish-variants.test.mjs holds the dice).
 * This walks the phone's half with a real worker, an upright phone in the
 * Wheel (docs/specs/fish-variants.md):
 *
 *   1. the worker says it rolls and weighs (caps.fishvariants, fishweigh);
 *   2. THE CATCH: the owner's lever (/dev/fish next albino) makes the next
 *      fish albino; the player walks to a minnow spot on the commons and the
 *      strike goes to the worker (node_strike through the real channel shim,
 *      a startless strike the worker takes as a recovery -- the gesture
 *      itself is mp-gatherhits' and mp-harvestbar's), which pays an ALBINO
 *      MINNOW, says so on harvest_credit, and the popup reads "An albino
 *      Minnow!";
 *   3. THE BAG: its own tile, named "Albino Minnow", drawn pale (the bag
 *      tile's filter); a large pike from the lever wears its "L";
 *   4. INSPECT: the item card offers Inspect; the worker weighs the catch:
 *      the weigh-in card, "This albino Minnow weighs 0.xx kg", inside the
 *      screen; Inspect again -- "You've weighed all your Minnow";
 *   5. RECORDS: the card's Records opens More -> Ranks on the Biggest fish
 *      tab, on the minnow, with this player's row, tagged Albino;
 *   6. EATEN: the minnow cooked (the cook's own message, cook_request) is
 *      cooked_fish_minnow_albino; Eat on its card: Albino Minnow, +5 AP, the
 *      chat's line "Achievement: Albino Minnow (+5 AP)", no banner (a common
 *      one);
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/fishvariants-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const STAND = [52, -43];   /* a fish spot's stand (mp-harvestbar) */

/* every harvest_credit and fish_weight the page receives (a watch on the
   socket, the platform's API: nothing in the game is replaced) */
const WATCH = () => {
  const Native = window.WebSocket;
  const seen = window.__fishSeen = [];
  const Wrapped = function (url, protocols) {
    const ws = protocols === undefined ? new Native(url) : new Native(url, protocols);
    ws.addEventListener('message', (ev) => {
      const d = ev.data;
      if (typeof d !== 'string' || (d.indexOf('"harvest_credit"') < 0 && d.indexOf('"fish_weight"') < 0)) return;
      try {
        const m = JSON.parse(d);
        for (const x of Array.isArray(m) ? m : [m]) if (x && (x.type === 'harvest_credit' || x.type === 'fish_weight') && seen.length < 100) seen.push({ type: x.type, p: x.payload });
      } catch (e) { /* not ours to judge */ }
    });
    /* the popups, as the game pushes them (S.dmgNumbers), every 50 ms */
    return ws;
  };
  Wrapped.prototype = Native.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Wrapped[k] = Native[k];
  window.WebSocket = Wrapped;
  window.__fishPopups = [];
  window.__fishAllPops = [];
  window.__fishOut = [];
  const send0 = Native.prototype.send;
  Native.prototype.send = function (d) {
    try { if (typeof d === 'string' && /eat_request/.test(d) && window.__fishOut.length < 20) window.__fishOut.push(d.slice(0, 300)); } catch (e) { /* */ }
    return send0.call(this, d);
  };
  setInterval(() => {
    const S = window._gameState && window._gameState.current;
    for (const p of (S && S.dmgNumbers) || []) if (p && typeof p.text === 'string' && /albino|LARGE/.test(p.text) && !window.__fishPopups.includes(p.text)) window.__fishPopups.push(p.text);
    for (const p of (S && S.dmgNumbers) || []) if (p && typeof p.text === 'string' && !window.__fishAllPops.includes(p.text) && window.__fishAllPops.length < 60) window.__fishAllPops.push(p.text);
  }, 50);
};

/* a real tap: the element at its own centre must be it */
async function tap(P, sel, timeout = 8000) {
  const loc = P.page.locator(sel).first();
  await loc.waitFor({ state: 'visible', timeout });
  const verdict = await loc.evaluate((el) => {
    el.scrollIntoView({ block: 'nearest' });
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    if (!top) return 'nothing at its centre';
    return el === top || el.contains(top) ? 'ok' : 'covered by <' + top.tagName.toLowerCase() + ' class="' + (top.className || '') + '">';
  });
  if (verdict !== 'ok') throw new Error(sel + ' is not tappable: ' + verdict);
  await loc.click({ force: true });
}

const inv = (P) => H.readState(P, (S) => Object.assign({}, (S.rpg && S.rpg.inventory) || {}));

async function nearestSpot(P) {
  return P.page.evaluate(() => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== 'fishSpot' || !n.alive || (n.gatherLvl || 1) !== 1) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y }; }
    }
    return best;
  });
}

/* the bag's tile for `key`, its card opened by a real tap */
async function openCard(P, key) {
  await H.unfoldBand(P).catch(() => {});
  await P.page.waitForSelector(`[data-bag-key="i-${key}"]`, { timeout: 10000 });
  await tap(P, `[data-bag-key="i-${key}"]`);
  await P.page.waitForTimeout(500);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errs = [];
  const A = await H.newPlayer(browser, { name: 'Angler', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: '(' + WATCH.toString() + ')();' });
  A.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  let stop = () => {};
  try {
    await H.enterWorld(A);
    const inW = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 150000, label: 'into the Wheel, its nodes in' }).catch(() => null);
    rec.ok('in the Wheel, its nodes in (guard)', !!inW, inW);
    if (!inW) return;
    stop = H.keepAlive(A);
    const me = await H.readState(A, (S) => S.myId);
    await H.grant(wsPort, me, 'item', { invKey: 'fishing_pole', count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', me, { heal: true }).catch(() => {});   /* no god mode: it keeps HP full, and a full bar refuses the Eat */
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    /* ── 1 ── */
    const caps = await H.readState(A, (S) => ({ v: !!(S._serverCaps && S._serverCaps.fishvariants), w: !!(S._serverCaps && S._serverCaps.fishweigh) }));
    rec.ok('1 the worker rolls rare fish and weighs them (caps.fishvariants, caps.fishweigh)', caps.v && caps.w, caps);

    /* ── 2 ── */
    const spot = await nearestSpot(A);
    rec.ok('2a a first-tier fish spot on the commons (guard)', !!spot, spot);
    if (!spot) return;
    await H.hopTo(A, spot.x + STAND[0], spot.y + STAND[1]);
    await A.page.waitForTimeout(800);
    await H.closeNpcDialogue(A).catch(() => {});
    const lever = await H.devOp(wsPort, 'fish', me, { next: 'albino' }).catch((e) => ({ ok: false, error: String(e) }));
    rec.ok('2b the lever: the next fish is albino', !!lever && lever.ok && lever.next === 'albino', lever);
    let caught = null;
    for (let i = 0; i < 4 && !caught; i++) {
      await A.page.evaluate((id) => {
        const S = window._gameState.current;
        S.channel.send({ type: 'node_strike', payload: { id, zone: 'wheel', accuracy: 'good' } });
      }, spot.id);
      caught = await H.waitFor(A, (S) => ((S.rpg && S.rpg.inventory) || {}).fish_minnow_albino || 0, (n) => n >= 1, { timeout: 8000, label: 'the albino minnow' }).catch(() => null);
      if (!caught) await A.page.waitForTimeout(4000);   /* a recovery strike is one a RECOVER_MS */
    }
    const credit = await A.page.evaluate(() => (window.__fishSeen || []).filter((m) => m.type === 'harvest_credit').map((m) => m.p.fish).filter(Boolean).pop() || null);
    rec.ok('2c the worker paid an ALBINO MINNOW, its own bag key, and said so on harvest_credit',
      !!caught && !!credit && credit.key === 'fish_minnow_albino' && credit.v === 'albino', { caught, credit });
    const pops = await H.waitFor(A, () => window.__fishPopups || [], (l) => l.length > 0, { timeout: 4000, label: 'the popup' }).catch(() => []);
    rec.ok(`2d the popup reads "${pops[0] || ''}"`, Array.isArray(pops) && pops.includes('An albino Minnow!'), pops);

    /* ── 3 ── */
    await H.devOp(wsPort, 'fish', me, { give: 'fish_pike_large', n: 1 }).catch(() => {});
    await H.waitFor(A, (S) => ((S.rpg && S.rpg.inventory) || {}).fish_pike_large || 0, (n) => n >= 1, { timeout: 10000, label: 'the large pike' }).catch(() => {});
    await H.unfoldBand(A).catch(() => {});
    await A.page.waitForSelector('[data-bag-key="i-fish_minnow_albino"]', { timeout: 10000 }).catch(() => {});
    const tiles = await A.page.evaluate(() => {
      const t = document.querySelector('[data-bag-key="i-fish_minnow_albino"]');
      const L = document.querySelector('[data-bag-key="i-fish_pike_large"]');
      const img = t && t.querySelector('img');
      return {
        albino: !!t, pale: img ? getComputedStyle(img).filter : null, src: img ? img.getAttribute('src') : null,
        plainSrc: null,
        large: !!L, badge: !!(L && L.querySelector('[data-fish-large]')), badgeText: L && L.querySelector('[data-fish-large]') ? L.querySelector('[data-fish-large]').textContent : null,
      };
    });
    rec.ok('3a the bag: an albino minnow tile, the minnow\'s own picture washed pale (a filter on the tile\'s picture)',
      tiles.albino && /grayscale/.test(tiles.pale || '') && /fish-minnow\.webp/.test(tiles.src || ''), tiles);
    rec.ok('3b ...and the large pike wears its "L"', tiles.large && tiles.badge && tiles.badgeText === 'L', tiles);
    await A.page.screenshot({ path: join(OUT, 'fishvariants-1-bag.png') });

    /* ── 4 ── */
    await openCard(A, 'fish_minnow_albino');
    const card = await A.page.evaluate(() => {
      const b = document.querySelector('[data-fish-inspect]');
      return { inspect: !!b, words: document.body.innerText.includes('Albino Minnow') };
    });
    rec.ok('4a the item card names it "Albino Minnow" and offers Inspect', card.inspect && card.words, card);
    if (card.inspect) await tap(A, '[data-fish-inspect]');
    const w1 = await A.page.waitForSelector('[data-fish-weigh="weighed"]', { timeout: 10000 }).then(() => A.page.evaluate(() => {
      const el = document.querySelector('[data-fish-weigh]');
      const r = el.getBoundingClientRect();
      return { words: (el.querySelector('[data-fish-weigh-words]') || {}).textContent || '', best: (el.querySelector('[data-fish-weigh-best]') || {}).textContent || '',
        x: Math.round(r.left), r: Math.round(r.right), y: Math.round(r.top), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight,
        last: window.__btFishWeigh ? window.__btFishWeigh.last : null };
    })).catch(() => null);
    rec.ok(`4b Inspect weighs the catch: "${w1 && w1.words}" (${w1 && w1.best})`,
      !!w1 && /^This albino Minnow weighs 0\.\d\d kg\.$/.test(w1.words) && w1.last && w1.last.g >= 50 && w1.last.g <= 200 && w1.last.rank === 1, w1);
    rec.ok('4c ...the weigh-in card inside the screen', !!w1 && w1.x >= 0 && w1.r <= w1.vw && w1.y >= 0 && w1.b <= w1.vh, w1);
    await A.page.screenshot({ path: join(OUT, 'fishvariants-2-weighin.png') });

    /* ── 5 ── */
    await tap(A, '[data-fish-records]').catch(() => {});
    const board = await A.page.waitForSelector('[data-fish-board="minnow"] [data-fish-board-row]', { timeout: 10000 }).then(() => A.page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-fish-board="minnow"] [data-fish-board-row]')];
      return rows.map((r) => ({ text: r.textContent.replace(/\s+/g, ' ').trim(), tag: (r.querySelector('[data-fish-board-tag]') || { dataset: {} }).dataset.fishBoardTag || null }));
    })).catch(() => null);
    rec.ok(`5 Records opens Ranks on Biggest fish, the minnow: ${board && board[0] && board[0].text}`,
      !!board && board.length >= 1 && /Angler/.test(board[0].text) && board[0].tag === 'albino' && / kg$/.test(board[0].text), board);
    await A.page.screenshot({ path: join(OUT, 'fishvariants-3-board.png') });
    await H.closeDest(A).catch(() => {});

    /* Inspect again: nothing left to weigh */
    await openCard(A, 'fish_minnow_albino');
    if (await A.page.$('[data-fish-inspect]')) await tap(A, '[data-fish-inspect]').catch(() => {});
    const w2 = await A.page.waitForSelector('[data-fish-weigh="none"]', { timeout: 8000 }).then(() => A.page.evaluate(() => (document.querySelector('[data-fish-weigh-words]') || {}).textContent || '')).catch(() => null);
    rec.ok(`4d Inspect again: "${w2}"`, w2 === "You've weighed all your Minnow.", w2);
    await A.page.evaluate(() => { const b = document.querySelector('[data-fish-weigh-close]'); if (b) b.click(); });

    /* ── 6 ── */
    const ap0 = await H.readState(A, (S) => (S._achv && S._achv.ap) || 0);
    await A.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'cook_request', payload: { fishKey: 'fish_minnow_albino', kind: 'cooked' } }); });
    const cooked = await H.waitFor(A, (S) => ((S.rpg && S.rpg.inventory) || {}).cooked_fish_minnow_albino || 0, (n) => n >= 1, { timeout: 10000, label: 'cooked' }).catch(() => 0);
    rec.ok('6a cooked, it is cooked_fish_minnow_albino', cooked >= 1, { cooked });
    await H.devOp(wsPort, 'vitals', me, { hp: 10 }).catch(() => {});
    const hurt = await H.waitFor(A, (S) => S.rpg && S.rpg.hp, (h) => h > 0 && h <= 10, { timeout: 6000, label: 'hurt' }).catch(() => null);
    /* the lever's HP is the worker's; a page that has not heard it yet would
       answer the Eat with "HP full" -- the worker's number, put on the page */
    if (!hurt) await A.page.evaluate(() => { const S = window._gameState.current; if (S.rpg) S.rpg.hp = 10; });
    await openCard(A, 'cooked_fish_minnow_albino');
    /* the card's own Eat (a button whose words are exactly "Eat"), pressed
       for real; the HP the page holds as it is pressed, for the record */
    const eatAt = await A.page.evaluate(() => {
      const S = window._gameState.current;
      if (S.rpg && S.rpg.hp >= (S.rpg.maxHp || 100)) S.rpg.hp = 10;   /* the worker's lever said 10; the regen echo may not have */
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Eat' && x.getBoundingClientRect().width > 0);
      if (!b) return null;
      b.setAttribute('data-qa-eat', '1');
      return { hp: S.rpg && S.rpg.hp };
    });
    rec.ok('6b the cooked albino minnow\'s card offers Eat', !!eatAt, eatAt);
    if (eatAt) await tap(A, '[data-qa-eat="1"]').catch((e) => rec.ok('6b (guard) Eat pressed', false, String(e)));
    const s1 = await H.waitFor(A, (S) => !!(S._achv && S._achv.got && S._achv.got.albino_minnow), (v) => v, { timeout: 12000, label: 'Albino Minnow' })
      .then(() => H.readState(A, (S) => ({ ap: S._achv.ap, rpgAp: S.rpg.achievementPoints }))).catch(() => null);
    const srv = s1 ? null : await H.adminPlayer(wsPort, me).catch(() => null);
    const why = s1 ? null : await H.readState(A, (S) => ({ out: window.__fishOut, allPops: window.__fishAllPops.slice(-10), hp: S.rpg && S.rpg.hp, maxHp: S.rpg && S.rpg.maxHp, inv: Object.keys((S.rpg && S.rpg.inventory) || {}).filter((k) => /fish/.test(k)),
      achv: S._achv ? Object.keys(S._achv.got || {}) : null, pops: (S.dmgNumbers || []).map((p) => p.text).slice(-6) }));
    rec.ok(`6c eating it: Albino Minnow, +5 AP (${ap0} -> ${s1 && s1.ap})`, !!s1 && s1.ap === ap0 + 5 && s1.rpgAp === s1.ap, { ap0, s1, why, srv: srv && srv.live ? { hp: srv.live.hp, inv: Object.keys(srv.live.inventory || {}).filter((k) => /fish/.test(k)) } : srv && Object.keys(srv) });
    const line = await H.readState(A, (S) => (S.chatLog || []).map((l) => l && l.text).filter((t) => /Achievement: Albino Minnow/.test(t || '')));
    rec.ok(`6d ...said in the chat: "${line[0] || ''}"`, line.length === 1 && /\(\+5 AP\)/.test(line[0]), line);
    await A.page.waitForTimeout(1200);
    const q = await A.page.evaluate(() => (window.__btAchvBanner ? window.__btAchvBanner.ids.slice() : []));
    rec.ok('6e ...and no banner (a common one)', !q.includes('albino_minnow'), q);

    /* ── 7 ── */
    rec.ok('7 no page errors', errs.length === 0, errs);
  } finally {
    stop();
    await A.ctx.close().catch(() => {});
  }
}
