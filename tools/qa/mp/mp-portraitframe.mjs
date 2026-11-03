/* v2.3.3915: THE PORTRAIT STAYS PUT -- one frame for every message and
 * every townsperson.
 *
 * The owner: "Fix all the portrait pics from slightly moving around from one
 * NPC message to the next.  Right now they're inconsistent."  The portrait's
 * frame stretched to the card's height, and the card (centred on the screen)
 * grew with each message's words, so the head was cropped, zoomed and moved
 * afresh on every message (game.css .bt-npcdlg-art).
 *
 * On an upright phone and on a computer, Mayor Bro talked to with a tap
 * (H.approachNpc: only a quest giver opens the card on a new character),
 * each of his messages read, then on his open card a far longer message and
 * the heads of Farmer Bro, Gavel Greg and Lil Bro; on each:
 *   1. the portrait's frame square and the SAME box (the card's top is
 *      pinned: long words grow it downward);
 *   2. the picture inside it the same box too (nothing cropped or moved);
 *   3. words of different lengths AND heights were read (the guard: words
 *      that never grow the card prove nothing);
 *   4. no page errors.
 * Pictures: tools/qa/mp/out/portraitframe-<kind>-<n>-<what>.png.
 * Run after `npm run build`.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/* the heads the card is also shown with (a keeper's tap opens his window,
   and a local answers with a bubble, so only a quest giver opens the card on
   a new character): Farmer Bro, Gavel Greg, Lil Bro */
const OTHER_HEADS = ['/sprites/npc/farmer-bro-head.webp', '/sprites/npc/gavel-greg-head.webp', '/sprites/npc/lil-bro-head.webp'];
/* a message as long as any townsperson's, so the card grows */
const LONG = 'Listen close, because I will only say this once and it is a long one: '.repeat(10).trim();
const same = (a, b) => a && b && ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) < 0.6);

async function enter(P) {
  await H.enterWorld(P);
  return H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
    (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
}

const measure = (P) => P.page.evaluate(() => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const t = document.querySelector('.bt-npcdlg-text');
  return { frame: box(document.querySelector('.bt-npcdlg-art')), img: box(document.querySelector('.bt-npcdlg-img')),
    text: t ? (t.innerText || '') : null, textH: (document.querySelector('.bt-npcdlg') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height };   /* the CARD's height */
});

async function talkAll(P, kind, OUT, rec) {
  const seen = [];
  const snap = async (label) => {
    await P.page.waitForTimeout(350);   /* the line's 180 ms fade, the head's load */
    const m = await measure(P);
    if (m.text == null) return false;
    seen.push({ label, ...m });
    await P.page.screenshot({ path: join(OUT, `portraitframe-${kind}-${seen.length - 1}-${label}.png`) }).catch(() => {});
    return true;
  };
  const open = await H.approachNpc(P, 'mayor_bro').catch(() => false);
  rec.ok(`${kind}: Mayor Bro talked to with a tap (guard)`, open);
  if (!open) return;
  /* 1. his own messages, as a player reads them */
  for (let i = 0; i < 12; i++) {
    if (!(await snap('mayor-' + i))) break;
    const next = await P.page.evaluate(() => {
      const b = document.querySelector('.bt-npcdlg-next');
      const dots = document.querySelectorAll('.bt-npcdlg-dot');
      const last = dots.length && dots[dots.length - 1].classList.contains('on');
      if (!b || last || !dots.length) return false;
      b.click(); return true;
    });
    if (!next) break;
  }
  /* 2. on his card as it stands: a far longer message, then other townsfolk's
     heads (the card is the same window for everyone: NpcDialogue) */
  await P.page.evaluate((t) => { const el = document.querySelector('.bt-npcdlg-text'); if (el) el.textContent = t; }, LONG);
  await snap('long');
  for (const src of OTHER_HEADS) {
    await P.page.evaluate((u) => { const im = document.querySelector('.bt-npcdlg-img'); if (im) im.src = u; }, src);
    await snap(src.split('/').pop().replace('-head.webp', ''));
  }
  await H.closeNpcDialogue(P).catch(() => {});
  await H.leaveNpc(P, 'mayor_bro').catch(() => {});

  const f0 = seen[0] && seen[0].frame;
  const lens = [...new Set(seen.map((m) => m.text.length))];
  const hs = [...new Set(seen.map((m) => Math.round(m.textH)))];
  rec.ok(`${kind}: ${seen.length} cards read, ${lens.length} lengths of words, ${hs.length} heights (guard: the card grew)`,
    seen.length >= 5 && lens.length >= 2 && hs.length >= 2, seen.map((m) => [m.label, m.text.length, Math.round(m.textH)]));
  rec.ok(`${kind}: the portrait's frame is square, and one box on every card`,
    !!f0 && Math.abs(f0.w - f0.h) < 0.6 && seen.every((m) => same(m.frame, f0)),
    [...new Set(seen.map((m) => JSON.stringify(m.frame)))]);
  rec.ok(`${kind}: the picture in it is one box on every card (nothing cropped or moved)`,
    !!seen[0].img && seen.every((m) => same(m.img, seen[0].img)), [...new Set(seen.map((m) => JSON.stringify(m.img)))]);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  const kinds = [
    ['phone', { name: 'Framephone', viewport: { width: 390, height: 844 }, dpr: 3, touch: true }],
    ['computer', { name: 'Framedesk', wide: true, viewport: { width: 1440, height: 900 } }],
  ];
  for (const [kind, opts] of kinds) {
    const P = await H.newPlayer(browser, { wsPort, webPort, world: 'wheel', ...opts });
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      const inW = await enter(P);
      rec.ok(`${kind}: in the Wheel (guard)`, !!inW, inW);
      if (inW) {
        const id = await H.readState(P, (S) => S.myId);
        await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
        /* a real keystroke every 20 s: two idle minutes log the page out */
        const stopAlive = H.keepAlive(P);
        try { await talkAll(P, kind, OUT, rec); } finally { stopAlive(); }
      }
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
  rec.ok('no page errors', errors.length === 0, errors.slice(0, 6));
}
