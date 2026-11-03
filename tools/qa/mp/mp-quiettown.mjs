/* ═══ THE TOWNSFOLK CHATTER LESS, AND ONLY IN TOWN (v2.3.4040) ═══
 *
 * The owner, 2026-11-02: "Way too much town chatter idle while exploring the
 * world."  Before, each of the 21 townsfolk said an idle line every 8-23 s,
 * everywhere in the Wheel (about 1.4 a second town-wide).
 *
 * A phone (upright), in the Wheel:
 *   1. in BroTown beside a townsperson, every townsperson's timer made due at
 *      once: ONE idle line comes of it, not 21 (one town-wide every 20 s);
 *   2. 60 s standing there: at most 4 idle lines (game/townChatter.js: a line
 *      every 20 s at most), by the bubbles' own stamps;
 *   3. out in a land, every timer due again and 60 s more: NO idle line.
 * The quest lines (isQuest) are not counted: they are not idle chatter.
 */
import * as H from './harness.mjs';

/* the idle bubbles shown since `since` (their own stamps), by townsperson */
const idleSince = (P, since) => P.page.evaluate((t0) => {
  const S = window._gameState.current;
  const seen = window.__qtSeen || (window.__qtSeen = new Map());
  for (const n of S.npcs || []) {
    const b = n.chatBubble;
    if (b && !b.isQuest && b.ts >= t0) seen.set((n.id || n.name) + ':' + b.ts, n.name);
  }
  return [...seen.entries()].filter(([k]) => +k.split(':').pop() >= t0).map(([, v]) => v);
}, since);

const watch = async (P, ms, from) => {
  const t0 = from != null ? from : await P.page.evaluate(() => Date.now());
  const end = Date.now() + ms;
  let got = [];
  while (Date.now() < end) { got = await idleSince(P, t0); await P.page.waitForTimeout(500); }
  return idleSince(P, t0);
};

const allDue = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  S._idleChatAt = null;
  for (const n of S.npcs || []) { n.chatTimer = 0; n.chatBubble = null; }
  return { n: (S.npcs || []).length, at: Date.now() };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const G = await H.wheelGeom();
  const P = await H.newPlayer(browser, { name: 'Quietbro', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stop = H.keepAlive(P, 15000);
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, n: (S.npcs || []).length }), (v) => v.zone === 'wheel' && v.n > 5,
      { timeout: 150000, label: 'into the Wheel, the townsfolk out' }).catch(() => null);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    rec.ok('a phone is in BroTown with its townsfolk (guard)', !!inW, inW);

    /* beside the townsperson nearest the way in who has no quest to offer */
    const npc = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      let best = null, d = Infinity;
      for (const n of S.npcs || []) {
        if (n._questMarker || !n.phrases || !n.phrases.length) continue;
        const dd = Math.hypot(n.x - p.x, n.y - p.y);
        if (dd < d) { d = dd; best = { name: n.name, x: n.x, y: n.y }; }
      }
      return best;
    });
    await H.hopTo(P, npc.x, npc.y + 120);
    await P.page.waitForTimeout(1000);
    await H.closeNpcDialogue(P).catch(() => {});
    const { n: n0, at: due } = await allDue(P);
    const burst = await watch(P, 4000, due);
    rec.ok(`1. beside ${npc.name}, all ${n0} townsfolk's timers due at once: one idle line, not ${n0}`, burst.length === 1, burst);
    const minute = await watch(P, 60000, due + 4000);
    rec.ok(`2. 60 s standing in town: ${minute.length} idle line(s), at most 4 (one every 20 s)`, minute.length <= 4, minute);

    /* out in a land */
    const land = Object.keys(G.W.byId)[0];
    const out = G.along(land, 2);
    await H.hopTo(P, out.x, out.y);
    await P.page.waitForTimeout(1500);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    const { at: due2 } = await allDue(P);
    const away = await watch(P, 60000, due2);
    rec.ok(`3. out in a land (${land}), every timer due and 60 s more: no idle line`, away.length === 0, away);
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    stop();
    await P.ctx.close().catch(() => {});
  }
}
