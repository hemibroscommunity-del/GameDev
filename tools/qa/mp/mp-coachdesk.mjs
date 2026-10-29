/* ═══ GEAR UP ON A COMPUTER, CLEAR OF THE QUEST CARD (v2.3.3782) ═══
 *
 * The QA play-through of the judges' path (2026-10-28): on a computer playing
 * wide, the GEAR UP coach card hung below the fold chip ("OPEN", the top-left
 * corner) right across the pinned quest card's body line.  The card now steps
 * right of the quest card when it would cross it (QuestCoach.jsx).
 *
 * A computer playing wide (1280 x 800), in the world:
 *   1. Mayor Bro's first quest taken (the pinned quest card shows);
 *   2. the dev kit's weapons in the stash bring GEAR UP;
 *   3. the card is clear of the quest card, inside the world's span, and on
 *      the screen;
 *   4. no page errors.
 * Picture: tools/qa/mp/out/coachdesk-gearup.png. */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Coachdesk', wsPort, webPort, viewport: { width: 1280, height: 800 }, dpr: 2, world: 'wheel', wide: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'world' });
    const me = await H.readState(P, (S) => S.myId);

    /* 1. the first quest, so the quest card is pinned */
    await H.approachNpc(P, 'mayor_bro');
    await H.acceptQuestFromGiver(P).catch(() => null);
    await H.leaveNpc(P, 'mayor_bro').catch(() => {});
    await P.page.waitForTimeout(1500);
    const hud = await P.page.evaluate(() => {
      const q = document.querySelector('[data-quest-hud]');
      if (!q) return null;
      const b = q.getBoundingClientRect();
      return { l: b.left, r: b.right, t: b.top, b: b.bottom };
    });
    rec.ok(`1. the pinned quest card shows (${hud ? `${Math.round(hud.l)}-${Math.round(hud.r)}, ${Math.round(hud.t)}-${Math.round(hud.b)}` : 'none'})`, !!hud, hud);

    /* 2. weapons in the stash: GEAR UP */
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => {});
    let card = null;
    for (let i = 0; i < 60 && !card; i++) {
      await P.page.waitForTimeout(500);
      card = await P.page.evaluate(() => {
        const c = document.querySelector('[data-coach-card]');
        if (!c) return null;
        const b = c.getBoundingClientRect();
        if (!(b.width > 0)) return null;
        const q = document.querySelector('[data-quest-hud]');
        const qb = q ? q.getBoundingClientRect() : null;
        const cs = getComputedStyle(document.documentElement);
        const wx = parseFloat(cs.getPropertyValue('--world-x')) || 0;
        const pw = parseFloat(cs.getPropertyValue('--play-w')) || innerWidth;
        return { id: c.getAttribute('data-coach-card'), text: (c.textContent || '').slice(0, 80),
          l: b.left, r: b.right, t: b.top, b: b.bottom,
          q: qb ? { l: qb.left, r: qb.right, t: qb.top, b: qb.bottom } : null, wx, pw, vw: innerWidth, vh: innerHeight };
      });
      if (card && !/gear/i.test(card.text)) card = null;
    }
    await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/coachdesk-gearup.png', clip: { x: 0, y: 0, width: 960, height: 240 } }).catch(() => {});
    rec.ok(`2. GEAR UP shows ("${card && card.text}")`, !!card, card);
    if (!card) return;

    /* 3. clear of the quest card, inside the world's span, on the screen */
    const q = card.q;
    const crosses = !!q && card.l < q.r && card.r > q.l && card.t < q.b && card.b > q.t;
    rec.ok(`3. the card (${Math.round(card.l)}-${Math.round(card.r)}, ${Math.round(card.t)}-${Math.round(card.b)}) is clear of the quest card (${q ? `${Math.round(q.l)}-${Math.round(q.r)}, ${Math.round(q.t)}-${Math.round(q.b)}` : 'none'})`,
      !crosses, card);
    rec.ok('3. ...inside the world\'s span and on the screen',
      card.l >= card.wx - 0.5 && card.r <= card.wx + card.pw + 0.5 && card.t >= 0 && card.b <= card.vh, card);

    rec.ok('4. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
