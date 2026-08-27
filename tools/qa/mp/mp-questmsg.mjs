/* "QUEST COMPLETE!" HAS TO STILL BE THERE WHEN YOU LOOK UP (v2.3.1985).
 *
 * Owner: "Make the quest complete message (like actually right after getting
 * the 4th snowman remains) stay longer on screen. It's there for half a second
 * or less."
 *
 * That message is not the screen-space QUEST COMPLETED! banner (which the
 * owner has already had lengthened twice and sits at 5.2s). It is the pair of
 * world floaters game/questComplete.js pushes the instant the last required
 * item lands — and they were pushed with no ttl at all, which cost them twice:
 *
 *   - the default life is 1.5s and the renderer fades a popup to nothing over
 *     ttl * 0.8, so the readable window was nearer one second; and
 *   - the live-popup budget (MAX_LIVE_POPUPS = 24) ages out the oldest popup
 *     WITHOUT a custom ttl when it overflows, specifically to protect the
 *     long-lived ones. Killing the fourth snowman is exactly when the buffer
 *     is full of damage numbers, XP and gold, so the message was first in line
 *     to be thrown away. That is the "half a second or less".
 *
 * ── WHY THIS TESTS THE POPUP CONTRACT AND NOT A REAL QUEST ──
 * Driving a real character to a real fourth remnant is a long, flaky path
 * through loot RNG, and it would prove one quest rather than the rule. What
 * actually broke is the contract between the push site and the renderer: a
 * message meant to be READ has to name a ttl, and a popup that names one has
 * to survive the buffer. Both halves are asserted here against the real
 * renderer, with the same numbers questComplete.js passes.
 */
import * as H from './harness.mjs';

const QC_TTL = 4.5;    /* mirrors _qcTtl in src/game/questComplete.js */
const QC_RISE = 12;    /* mirrors _qcRise */

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Questor', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);

  /* The two floaters exactly as questComplete.js pushes them, then a flood of
     ordinary combat popups on top — the situation the message is born into. */
  await P.page.evaluate(({ ttl, rise }) => {
    const S = window._gameState.current;
    S.dmgNumbers = [];
    window.__qcMark = 'Quest Complete!';
    S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 70, text: 'Quest Complete!',
      color: '#f5c542', ts: Date.now(), ttl, rise });
    S.dmgNumbers.push({ x: S.player.x, y: S.player.y - 55, text: 'Return to Mayor Bro',
      color: '#ffe9bd', ts: Date.now(), ttl, rise });
    /* 30 > MAX_LIVE_POPUPS (24), so the buffer definitely overflows. */
    for (let i = 0; i < 30; i++) {
      S.dmgNumbers.push({ x: S.player.x + (i % 7) * 6, y: S.player.y - 20, text: String(10 + i),
        color: '#ffffff', ts: Date.now() });
    }
  }, { ttl: QC_TTL, rise: QC_RISE });

  const live = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    const l = (S.dmgNumbers || []);
    const q = l.find((d) => d.text === 'Quest Complete!');
    return {
      total: l.length,
      quest: !!q,
      questAged: q ? q.ts === 0 : null,
      y: q ? Math.round(q.y) : null,
      renderY: q && q._pixiText && !q._pixiText.destroyed ? Math.round(q._pixiText.y) : null,
      alpha: q && q._pixiText && !q._pixiText.destroyed ? +q._pixiText.alpha.toFixed(2) : null,
      plain: l.filter((d) => !d.ttl && d.ts !== 0).length,
    };
  });

  await P.page.waitForTimeout(250);
  let s = await live();
  rec.ok('the quest message is live alongside a screenful of combat popups',
    s.quest === true && s.questAged === false, s);

  /* THE OWNER'S COMPLAINT, AS A CLOCK. The game loop used to delete EVERY
     popup at a flat 1200ms whatever ttl it carried, so 1.75s is past the point
     where this message used to be gone — and the ordinary damage numbers
     beside it should be gone by now, which is what says the ttl is being read
     per popup rather than the window simply being widened for everything. */
  await P.page.waitForTimeout(1500);
  s = await live();
  rec.ok('still on screen after 1.75s (the flat 1200ms prune had deleted it by now)',
    s.quest === true && s.renderY !== null, s);
  rec.ok('...while the ordinary damage numbers around it have expired on their own 1.5s',
    s.plain === 0, s);
  rec.ok('...and still readable, not faded to a ghost',
    s.alpha !== null && s.alpha > 0.45, s);

  const at1750 = s;
  await P.page.waitForTimeout(1800);
  s = await live();
  rec.ok('still on screen after 3.5s', s.quest === true && s.renderY !== null, s);

  /* THE RISE. At the default 40px/s it would have climbed ~140px by now and
     left the character behind; the point of the slower climb is that the
     message stays where the thing that earned it is. */
  if (at1750.renderY !== null && s.renderY !== null) {
    const climbed = at1750.renderY - s.renderY;
    rec.ok(`it drifts up gently rather than flying off (${climbed}px in 1.8s, vs ~72px at the default rate)`,
      climbed >= 0 && climbed < 45, { climbed, then: at1750.renderY, now: s.renderY });
  }

  /* ...and it does eventually go. A message that never leaves is its own bug. */
  await P.page.waitForTimeout(2200);
  s = await live();
  rec.ok('and it is gone by ~5.7s, not stuck on screen', s.quest === false, s);

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
