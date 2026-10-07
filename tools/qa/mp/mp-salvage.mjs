/* SALVAGE AND ESSENCES AT THE BLACKSMITH (v2.3.3141)
 *
 * Owner: "all items like iron armor, bronze armor, etc should be salvageable
 * at the blacksmith for 50% of the bars it took to make them ... chest, legs,
 * and sword each take 4 bars to make ... If you salvage them you get 2 bars
 * back", and a Rare, Elite or Godly piece's "essence ... use it on whatever
 * same tier armor or weapon you want".
 *
 * A real client against a real worker, through the Blacksmith's real door, on
 * a phone:
 *   1. caps.salvage, and a Salvage tab; with nothing carried it says what to
 *      carry;
 *   2. four copper bars make a torso and four the greaves (the Armor tab);
 *   3. Salvage lists both, each "+2" bars; ONE tap only asks "Sure?", the
 *      second salvages: the torso leaves the bag, two copper bars come back,
 *      and the top line says so;
 *   4. an essence (an operator grant here; in the game, salvaging a Rare
 *      piece) shows under Essences with the greaves as its target; Use, Sure?
 *      -> the greaves are Rare and the essence is spent;
 *   5. salvaging the now-Rare greaves pays two bars AND the Rare Copper
 *      Essence back;
 *   6. a copper greatsword in the weapon bag salvages too: two more bars;
 *   7. the essence has its bag name and its picture; no page errors.
 * Pictures: tools/qa/mp/out/salvage-*.png.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const shot = (P, name) => P.page.screenshot({ path: `tools/qa/mp/out/salvage-${name}.png` }).catch(() => {});
const put = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState.current;
  S.player.x = px; S.player.y = py; S.player.vx = 0; S.player.vy = 0;
}, { px: x, py: y });
const state = (P) => H.readState(P, (S) => {
  const R = S.rpg || {};
  const inv = R.inventory || {};
  const pick = (p) => (p ? { name: p.name, gid: p.gid || null, mat: p.mat || null, quality: p.quality || 'normal' } : null);
  return {
    bars: inv.bar_copper || 0,
    ess: Object.fromEntries(Object.keys(inv).filter((k) => /^essence_/.test(k)).map((k) => [k, inv[k]])),
    torsos: (R.armorStash || []).filter((p) => p && p.mat === 'copper').map(pick),
    greaves: (R.legsStash || []).filter((p) => p && p.mat === 'copper').map(pick),
    weapons: (R.weaponStash || []).map((w) => w && { gearBase: w.gearBase || null, type: w.type, quality: w.quality || 'normal' }),
    hand: R.weapon ? { gearBase: R.weapon.gearBase || null, type: R.weapon.type } : null,
  };
});
const rows = (P, sel) => P.page.$$eval(sel, (els) => els.map((el) => ({
  key: el.getAttribute('data-salvage-row') || el.getAttribute('data-essence-row'), text: el.innerText.replace(/\s+/g, ' '),
})));
const said = (P) => P.page.evaluate(() => { const e = document.querySelector('[data-salvage-said]'); return e ? { ok: e.getAttribute('data-salvage-said'), text: e.textContent } : null; });
const lastLog = (P) => P.page.evaluate(() => { const l = window.__btSalvageLog || []; return l.length ? l[l.length - 1] : null; });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Salvager', wsPort, webPort, viewport: PHONE, touch: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(1500);
    const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.salvage));
    rec.ok('the worker advertises caps.salvage', caps);
    if (!caps) return;
    const me = await H.readState(P, (S) => S.myId);
    await P.page.waitForFunction(() => !document.body.innerText.includes('WELCOME'), null, { timeout: 15000 }).catch(() => {});

    /* ── 1. the door, the tab ── */
    const forge = await P.page.evaluate(() => (window.__btWorldProps ? window.__btWorldProps() : []).find((p) => p.action === 'forge') || null);
    if (!forge) { rec.ok('the Blacksmith building is in town (guard)', false); return; }
    const openSmithy = async () => {
      await put(P, forge.x, forge.y + 55);
      await P.page.waitForTimeout(500);
      await P.page.keyboard.press('e');
      return P.page.waitForSelector('[data-smithy-tab="salvage"]', { timeout: 5000 }).then(() => true).catch(() => false);
    };
    const tab = async (id) => { await P.page.click(`[data-smithy-tab="${id}"]`).catch(() => {}); await P.page.waitForTimeout(350); };
    const opened = await openSmithy();
    rec.ok('the Blacksmith has a Salvage tab', opened);
    if (!opened) { await shot(P, 'no-tab'); return; }
    await tab('salvage');
    const empty = await P.page.$eval('[data-salvage-empty]', (e) => e.textContent).catch(() => null);
    await shot(P, 'empty');
    rec.ok(`with nothing carried, it says what to carry ("${empty}")`, !!empty && /copper, iron or black steel/.test(empty), empty);

    /* ── 2. four bars a piece ── */
    await H.grant(wsPort, me, 'item', { invKey: 'bar_copper', count: 8 });
    await P.page.waitForFunction(() => ((window._gameState.current.rpg || {}).inventory || {}).bar_copper === 8, null, { timeout: 6000 }).catch(() => {});
    await tab('armor');
    await P.page.click('[data-armor-go="copper_torso"]').catch(() => {});
    await P.page.waitForFunction(() => ((window._gameState.current.rpg || {}).inventory || {}).bar_copper === 4, null, { timeout: 6000 }).catch(() => {});
    await P.page.waitForFunction(() => { const b = document.querySelector('[data-armor-go="copper_greaves"]'); return b && !b.disabled; }, null, { timeout: 5000 }).catch(() => {});
    await P.page.click('[data-armor-go="copper_greaves"]').catch(() => {});
    let s0 = null;
    for (let i = 0; i < 20; i++) { s0 = await state(P); if (s0.bars === 0 && s0.torsos.length && s0.greaves.length) break; await P.page.waitForTimeout(300); }
    rec.ok('four copper bars made a torso and four the greaves (8 -> 0)', s0.bars === 0 && s0.torsos.length === 1 && s0.greaves.length === 1
      && !!s0.torsos[0].gid && !!s0.greaves[0].gid, s0);

    /* The forge rolls every piece's grade (9% Rare, 0.9% Elite): this test
       reads what it got rather than assuming Normal. */
    const tGrade = s0.torsos[0] && s0.torsos[0].quality;
    const gGrade = s0.greaves[0] && s0.greaves[0].quality;
    const NEXT = { normal: 'rare', rare: 'elite', elite: 'godly' };
    const eGrade = NEXT[gGrade] || 'godly';
    const eKey = 'essence_' + eGrade + '_copper';
    const essOf = (st, k) => (st.ess && st.ess[k]) || 0;

    /* ── 3. salvage the torso ── */
    await tab('salvage');
    let list = await rows(P, '[data-salvage-row]');
    await shot(P, 'tab');
    const torsoRow = list.find((r) => /Copper Torso/.test(r.text));
    rec.ok(`Salvage lists both pieces, each "+2" (${list.map((r) => r.text).join(' | ')})`, list.length === 2 && !!torsoRow
      && list.every((r) => /\+2/.test(r.text)), list);
    /* v2.3.3141: `force` -- straight to the button.  A "Sure?" stays armed
       3 s (SmithyPanel SalvageTab), and this box draws the game at ~7 frames
       a second: Playwright's click first waits for the button to sit still
       over two frames (~2 s here), which with the pause between the taps put
       the second one past the 3 s and it only armed "Sure?" again -- the
       torso was never salvaged and every check after it failed.  A player
       taps the second time well inside the window. */
    const go = (key) => P.page.click(`[data-salvage-go="${key}"]`, { force: true });
    await go(torsoRow.key);
    await P.page.waitForTimeout(400);
    const sure = await P.page.$eval(`[data-salvage-go="${torsoRow.key}"]`, (b) => b.textContent).catch(() => null);
    const sMid = await state(P);
    rec.ok(`one tap only asks ("${sure}"), nothing is salvaged yet`, sure === 'Sure?' && sMid.torsos.length === 1 && sMid.bars === 0, { sure, sMid });
    await go(torsoRow.key);
    let s1 = null;
    for (let i = 0; i < 20; i++) { s1 = await state(P); if (s1.bars === 2 && !s1.torsos.length) break; await P.page.waitForTimeout(250); }
    const line1 = await said(P);
    await shot(P, 'salvaged');
    const tEss = tGrade !== 'normal' ? 'essence_' + tGrade + '_copper' : null;
    rec.ok(`the second tap salvages: the torso leaves the bag, two copper bars come back ("${line1 && line1.text}")`,
      s1.bars === 2 && s1.torsos.length === 0 && !!line1 && line1.ok === 'ok' && /\+2 Copper Bars/.test(line1.text)
        && (tEss ? essOf(s1, tEss) === 1 && /Essence/.test(line1.text) : !/Essence/.test(line1.text)), { s1, line1, tGrade });

    /* ── 4. an essence, used: one grade above the greaves' own ── */
    const e0 = essOf(s1, eKey);
    await H.grant(wsPort, me, 'item', { invKey: eKey, count: 1 });
    await P.page.waitForFunction((a) => ((window._gameState.current.rpg || {}).inventory || {})[a.k] === a.n, { k: eKey, n: e0 + 1 }, { timeout: 6000 }).catch(() => {});
    await P.page.waitForTimeout(500);
    const ess = (await rows(P, '[data-essence-row]')).filter((r) => r.key.indexOf(eKey + '>') === 0);
    const head = await P.page.$eval(`[data-essence="${eKey}"]`, (e) => e.innerText.replace(/\s+/g, ' ')).catch(() => null);
    const EN = { rare: 'Rare', elite: 'Elite', godly: 'Godly' }[eGrade];
    await P.page.evaluate(() => { const e = document.querySelector('[data-essence]'); if (e) e.scrollIntoView({ block: 'center' }); });
    await P.page.waitForTimeout(200);
    await shot(P, 'essence');
    rec.ok(`the essence shows under Essences, the ${gGrade} greaves its target ("${head}")`, !!head && new RegExp(EN + ' Copper Essence').test(head)
      && ess.length === 1 && /Copper Greaves/.test(ess[0].text) && new RegExp(EN).test(ess[0].text), { head, ess });
    const useKey = ess[0] && ess[0].key;
    await P.page.click(`[data-essence-go="${useKey}"]`, { force: true }).catch(() => {});   /* v2.3.3141: force, as `go` above */
    await P.page.waitForTimeout(300);
    await P.page.click(`[data-essence-go="${useKey}"]`, { force: true }).catch(() => {});   /* v2.3.3141: force, as `go` above */
    let s2 = null;
    for (let i = 0; i < 20; i++) { s2 = await state(P); if (s2.greaves[0] && s2.greaves[0].quality === eGrade && essOf(s2, eKey) === e0) break; await P.page.waitForTimeout(250); }
    const log2 = await lastLog(P);
    rec.ok(`Use, Sure? -> the greaves are ${EN} and the essence is spent (the worker's answer)`, !!s2.greaves[0] && s2.greaves[0].quality === eGrade && essOf(s2, eKey) === e0
      && !!log2 && log2.kind === 'essence' && log2.ok && log2.grade === eGrade, { s2, log2 });
    await P.page.evaluate(() => { const e = document.querySelector('[data-salvage-row]'); if (e) e.scrollIntoView({ block: 'center' }); });
    await P.page.waitForTimeout(200);
    await shot(P, 'rare');

    /* ── 5. salvage the Rare greaves: the essence comes back ── */
    list = await rows(P, '[data-salvage-row]');
    const gRow = list.find((r) => /Copper Greaves/.test(r.text));
    rec.ok(`the ${EN} greaves offer two bars AND an essence ("${gRow && gRow.text}")`, !!gRow && new RegExp(EN).test(gRow.text) && (gRow.text.match(/\+2/g) || []).length === 1 && /\+1/.test(gRow.text), gRow);
    if (gRow) { await go(gRow.key); await P.page.waitForTimeout(300); await go(gRow.key); }
    let s3 = null;
    for (let i = 0; i < 20; i++) { s3 = await state(P); if (s3.bars === 4 && essOf(s3, eKey) === e0 + 1 && !s3.greaves.length) break; await P.page.waitForTimeout(250); }
    const line3 = await said(P);
    await shot(P, 'essence-back');
    rec.ok(`salvaged: two bars and the ${EN} Copper Essence back ("${line3 && line3.text}")`, s3.bars === 4 && essOf(s3, eKey) === e0 + 1 && s3.greaves.length === 0
      && !!line3 && new RegExp(EN + ' Copper Essence').test(line3.text), { s3, line3 });

    /* ── 6. a weapon from the weapon bag ── */
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' });
    await P.page.waitForFunction(() => { const R = window._gameState.current.rpg || {}; return [R.weapon].concat(R.weaponStash || []).some((w) => w && w.gearBase === 'copper' && w.type === 'greatsword'); }, null, { timeout: 6000 }).catch(() => {});
    let sw = await state(P);
    if (sw.hand && sw.hand.gearBase === 'copper') {
      /* in the hand: put it in the weapon bag, as a player would before salvaging it */
      await P.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'unequip_request', payload: { slot: 'weapon' } }); });
      await P.page.waitForFunction(() => (window._gameState.current.rpg.weaponStash || []).some((w) => w && w.gearBase === 'copper'), null, { timeout: 6000 }).catch(() => {});
    }
    await P.page.waitForTimeout(500);
    list = await rows(P, '[data-salvage-row]');
    const wRow = list.find((r) => /Copper Greatsword/.test(r.text));
    rec.ok(`the copper greatsword in the weapon bag is listed ("${wRow && wRow.text}")`, !!wRow && /\+2/.test(wRow.text), list);
    if (wRow) { await go(wRow.key); await P.page.waitForTimeout(300); await go(wRow.key); }
    let s4 = null;
    for (let i = 0; i < 20; i++) { s4 = await state(P); if (s4.bars === 6) break; await P.page.waitForTimeout(250); }
    rec.ok('...and salvages for two more bars, out of the weapon bag', s4.bars === 6 && !s4.weapons.some((w) => w && w.gearBase === 'copper' && w.type === 'greatsword'), s4);
    await shot(P, 'weapon');

    /* ── 7. the essence in the bag ── */
    const art = await P.page.evaluate(async () => {
      const one = async (u) => { const r = await fetch(u).catch(() => null); return !!(r && r.ok && /image/.test(r.headers.get('content-type') || '')); };
      const out = {};
      for (const g of ['rare', 'elite', 'godly']) for (const m of ['copper', 'iron', 'blacksteel']) out[g + '-' + m] = await one(`/icons/items/essence-${g}-${m}.webp`);
      return out;
    });
    rec.ok('all nine essence pictures ship with the build', Object.values(art).every(Boolean), art);
    const named = await P.page.evaluate(() => {
      const head = document.querySelector('[data-essence^="essence_"]');
      const img = head && head.querySelector('img');
      return { text: head ? head.innerText : '', img: !!(img && img.complete && img.naturalWidth > 0) };
    });
    rec.ok('the essence is named by its grade and metal ("... Copper Essence") with its picture drawn', /(Rare|Elite|Godly) Copper Essence/.test(named.text) && named.img, named);
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
