/* ═══ THE BANK'S VAULT, ON A PHONE AND A COMPUTER (v2.3.3785, docs/specs/bank-vault.md) ═══
 *
 * The owner: "Oh yeah make it so you can actually deposit and retrieve items
 * and gold from the bank".  One real player against a real worker, in the
 * Wheel's Brotown, twice: a phone upright (390 x 844, touch) and a computer
 * playing wide (1280 x 800, a mouse):
 *   1. the worker keeps vaults (caps.bank); at the Bank's steps "Enter BANK"
 *      opens the vault: an empty vault, your gold, your bag;
 *   2. a stack of 10 oak: a tap on it asks how many, 4 typed and OK puts 4 in
 *      -- the WORKER's bag says 6, the vault shows 4, the line says so;
 *   3. gold: the 100 chip puts 100 in, the worker's purse 100 lower;
 *   4. out again: a tap on the vault's oak, 2 typed, OK -- the worker's bag 8,
 *      the vault 2; the 10 chip takes 10 gold out;
 *   5. a reload keeps it: back at the door, the vault still holds 2 oak and
 *      90 gold;
 *   6. on the computer the words say "Click", never "Tap";
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/bank-<view>-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1280, height: 800 };

async function pass(view, { browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `bank-${view}-${name}.png`) }).catch(() => {});
  const phone = view === 'phone';
  const A = await H.newPlayer(browser, phone
    ? { name: 'Bankbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true }
    : { name: 'Bankdesk', wsPort, webPort, world: 'wheel', viewport: WIDE, wide: true });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let alive = true;
  const keep = (async () => { while (alive) { await A.page.keyboard.press('Control').catch(() => {}); await A.page.waitForTimeout(20000); } })();
  const tag = (s) => `${view}: ${s}`;
  try {
    const inWheel = async () => H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    await H.enterWorld(A);
    const wa = await inWheel();
    rec.ok(tag('the player is in the Wheel (guard)'), !!wa, wa);
    if (!wa) return;
    const id = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    if (phone) await A.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.bank));
    rec.ok(tag('the worker keeps vaults (caps.bank)'), caps === true, caps);
    await H.grant(wsPort, id, 'item', { invKey: 'wood_oak', count: 10 }).catch(() => {});
    await H.grant(wsPort, id, 'gold', { amount: 500 }).catch(() => {});
    await A.page.waitForTimeout(1200);

    /* ── 1. the Bank's door ── */
    const findBank = async () => {
      let doors = [];
      for (let i = 0; i < 40 && !doors.some((d) => d.id === 'bank'); i++) {
        doors = await A.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
        if (!doors.some((d) => d.id === 'bank')) await A.page.waitForTimeout(500);
      }
      return doors.find((d) => d.id === 'bank') || null;
    };
    const standAt = async (x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await A.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(A, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await A.page.waitForTimeout(800);
        const g = await A.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
      }
      return false;
    };
    const openBank = async () => {
      const bank = await findBank();
      if (!bank) return null;
      await standAt(bank.x, bank.y + 30);
      let btn = null;
      for (let i = 0; i < 16; i++) {
        btn = await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); return b ? (b.textContent || '').replace(/\s+/g, ' ').trim() : null; });
        if (btn) break;
        await A.page.waitForTimeout(250);
      }
      await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
      for (let i = 0; i < 30; i++) {
        const st = await A.page.evaluate(() => { const v = document.querySelector('[data-building-panel="bank"] [data-bank-vault]'); return v ? v.getAttribute('data-bank-vault') : null; });
        if (st === 'open') return { btn };
        await A.page.waitForTimeout(250);
      }
      return { btn, failed: true };
    };
    const look = () => A.page.evaluate(() => {
      const w = document.querySelector('[data-building-panel="bank"]');
      if (!w) return null;
      const tiles = (side) => Array.from(w.querySelectorAll(`[data-bank-tile="${side}"]`)).map((t) => ({ key: t.getAttribute('data-bank-key'), title: t.getAttribute('title') }));
      const last = w.querySelector('[data-bank-last]');
      const gold = w.querySelector('[data-bank-gold]');
      return { vault: tiles('vault'), bag: tiles('bag'), gold: gold ? gold.getAttribute('data-bank-gold') : null,
        last: last ? (last.textContent || '').trim() : null, text: (w.innerText || '').replace(/\s+/g, ' ') };
    });
    const click = (sel) => A.page.evaluate((s) => { const b = document.querySelector(s); if (b && !b.disabled) { b.click(); return true; } return false; }, sel);
    const typeIn = async (row, n) => {
      const sel = `[data-bank-typed="${row}"]`;
      await A.page.click(sel).catch(() => {});
      await A.page.fill(sel, String(n)).catch(() => {});
      await A.page.waitForTimeout(150);
      return click(`[data-bank-go="${row}"]`);
    };
    const waitLast = async (re) => {
      for (let i = 0; i < 30; i++) {
        const l = await look();
        if (l && l.last && re.test(l.last)) return l;
        await A.page.waitForTimeout(200);
      }
      return look();
    };
    const server = async () => { const p = await H.adminPlayer(wsPort, id); return { inv: (p.rpg && p.rpg.inventory) || {}, coins: p.rpg ? p.rpg.coins : null }; };

    const o1 = await openBank();
    await A.page.waitForTimeout(600);
    const l1 = await look();
    await shot(A, 'open');
    rec.ok(tag(`at its steps "${o1 && o1.btn}" opens the vault: empty, your gold, your oak in the bag`),
      !!o1 && !o1.failed && /Enter\s*BANK/i.test(o1.btn || '') && !!l1 && l1.vault.length === 0 && l1.gold === '0' && l1.bag.some((t) => t.key === 'wood_oak'), { o1, l1 });
    const s0 = await server();

    /* ── 2. 4 oak in ── */
    await click('[data-bank-tile="bag"][data-bank-key="wood_oak"]');
    await A.page.waitForTimeout(300);
    const picked = await A.page.evaluate(() => !!document.querySelector('[data-bank-pick="bag"]'));
    rec.ok(tag('a tap on a stack asks how many'), picked, picked);
    await typeIn('item-bag', 4);
    const l2 = await waitLast(/Put 4 /);
    await A.page.waitForTimeout(600);
    const s2 = await server();
    await shot(A, 'oak-in');
    rec.ok(tag(`4 typed and OK: "${l2 && l2.last}", the worker's bag ${s0.inv.wood_oak} -> ${s2.inv.wood_oak}, the vault's oak tile there`),
      !!l2 && /Put 4 Oak in the vault/.test(l2.last || '') && s2.inv.wood_oak === (s0.inv.wood_oak || 0) - 4 && l2.vault.some((t) => t.key === 'wood_oak' && /x4$/.test(t.title)), { l2, s0: s0.inv.wood_oak, s2: s2.inv.wood_oak });

    /* ── 3. 100 gold in ── */
    await click('[data-bank-row="gold-in"] [data-bank-chip="100"]');
    const l3 = await waitLast(/Put 100 gold/);
    await A.page.waitForTimeout(600);
    const s3 = await server();
    rec.ok(tag(`the 100 chip: "${l3 && l3.last}", the vault 100, the worker's purse ${s2.coins} -> ${s3.coins}`),
      !!l3 && l3.gold === '100' && s3.coins === s2.coins - 100, { l3, s2: s2.coins, s3: s3.coins });

    /* ── 4. out again ── */
    await click('[data-bank-tile="vault"][data-bank-key="wood_oak"]');
    await A.page.waitForTimeout(300);
    await typeIn('item-vault', 2);
    const l4 = await waitLast(/Took 2 /);
    await A.page.waitForTimeout(600);
    const s4 = await server();
    rec.ok(tag(`2 out: "${l4 && l4.last}", the worker's bag ${s3.inv.wood_oak} -> ${s4.inv.wood_oak}, the vault 2`),
      !!l4 && s4.inv.wood_oak === s3.inv.wood_oak + 2 && l4.vault.some((t) => t.key === 'wood_oak' && /x2$/.test(t.title)), { l4, s4: s4.inv.wood_oak });
    await click('[data-bank-row="gold-out"] [data-bank-chip="10"]');
    const l5 = await waitLast(/Took 10 gold/);
    await A.page.waitForTimeout(600);
    const s5 = await server();
    await shot(A, 'out');
    rec.ok(tag(`the 10 chip takes 10 gold out: the vault 90, the worker's purse ${s4.coins} -> ${s5.coins}`),
      !!l5 && l5.gold === '90' && s5.coins === s4.coins + 10, { l5, s5: s5.coins });

    /* ── 6. the words ── */
    const words = (l5 && l5.text) || '';
    rec.ok(tag(phone ? 'the words say "Tap" on a phone' : 'the words say "Click", never "Tap", on a computer'),
      phone ? /Tap an item/.test(words) : (/Click an item/.test(words) && !/\bTap\b/.test(words)), words.slice(0, 160));
    rec.ok(tag('the window says what goes in and why: "Safe from death", materials, food and gold in, weapons, armour and tools not'),
      /Safe from death/.test(words) && /Materials, food and gold go in/.test(words) && /weapons, armour and tools stay with you/.test(words), words.slice(0, 200));

    /* ── 5. a reload keeps it ── */
    await A.page.reload();
    await H.enterWorld(A);
    await inWheel();
    await A.page.waitForTimeout(2000);
    const o6 = await openBank();
    await A.page.waitForTimeout(800);
    const l6 = await look();
    await shot(A, 'reload');
    rec.ok(tag('a reload keeps it: the vault still holds 2 oak and 90 gold'),
      !!o6 && !o6.failed && !!l6 && l6.gold === '90' && l6.vault.some((t) => t.key === 'wood_oak' && /x2$/.test(t.title)), { o6, l6 });

    rec.ok(tag('no page errors'), errors.length === 0, errors.slice(0, 3));
  } finally {
    alive = false;
    await keep.catch(() => {});
    await A.ctx.close().catch(() => {});
  }
}

export async function run(ctx) {
  await pass('phone', ctx);
  await pass('desk', ctx);
}
