/* WALKING UP TO MAYOR BRO OPENS HIS QUEST AT THE DISTANCE THAT LOOKS LIKE
 * "WALKING UP" (v2.3.1886).
 *
 * Owner: "Created a new character and first quest didn't trigger by walking up
 * to mayor bro.  It should activate by proximity."
 *
 * This is v2.3.1717's incident in the place that pass did not reach.  That one
 * raised the NPC DETECTION radius 60 -> 90 because "standing what LOOKS like
 * next to him was out of range, and the refusal is silent, so it reads as a
 * broken NPC rather than 'step closer'."  The proximity opener was written
 * later (v2.3.1701) with its own 56, and inherited the same bug: measured by
 * sweeping, the dialogue opened at 40 and 56px and was dead from 64px out.
 *
 * So this asserts the SWEEP, not a single happy distance.  A test that only
 * stood him at 34px passed on the broken build — mp-questprox and
 * mp-questclaim both did, which is why the report reached the owner instead of
 * a suite.  The band 64-90 is the whole defect, and it is what is pinned here.
 */
import * as H from './harness.mjs';

/* Inside _nearNpc's 90px radius the mayor IS "the NPC you are standing with",
   so every one of these must open.  200 is the control: far enough that a
   build which simply opened the panel unconditionally would fail. */
const MUST_OPEN = [40, 56, 64, 72, 80, 88];
const MUST_NOT_OPEN = [200];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Newbie', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const at = async (d) => {
    await H.closeNpcDialogue(P);
    /* Park well outside the release radius so the latch lets go between
       samples — otherwise every reading after the first is the latch, not the
       distance under test. */
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      const n = (S.npcs || []).find((x) => x && x.id === 'mayor_bro');
      if (n && S.player) { S.player.x = n.x + 400; S.player.y = n.y; }
    });
    await P.page.waitForTimeout(500);
    await P.page.evaluate((dd) => {
      const S = window._gameState.current;
      const n = (S.npcs || []).find((x) => x && x.id === 'mayor_bro');
      if (n && S.player) { S.player.x = n.x; S.player.y = n.y + dd; }
    }, d);
    await P.page.waitForTimeout(900);
    return P.page.evaluate(() => !!document.querySelector('.bt-npcdlg, .bt-qoffer'));
  };

  /* GUARD: a brand-new character really is being offered a quest at all, so a
     sweep of falses cannot be blamed on distance when the cause is an empty
     quest table. */
  const q0 = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const fns = window._gameFns || {};
    const r = fns.getNpcQuest ? fns.getNpcQuest(S.rpg, 'Mayor Bro') : null;
    return r && r.quest ? { id: r.quest.id, status: r.status } : r;
  });
  rec.ok('a fresh character has a quest waiting from Mayor Bro (guard)',
    !!(q0 && q0.id === 'tut_1' && q0.status === 'available'), q0);

  const opened = [];
  for (const d of MUST_OPEN) opened.push([d, await at(d)]);
  for (const d of MUST_NOT_OPEN) opened.push([d, await at(d)]);
  console.log('    sweep -> ' + opened.map(([d, o]) => `${d}px:${o ? 'OPEN' : 'no'}`).join('  '));

  for (const d of MUST_OPEN) {
    const got = opened.find(([x]) => x === d)[1];
    rec.ok(`walking up at ${d}px opens his quest`, got, { dist: d, sweep: opened });
  }
  for (const d of MUST_NOT_OPEN) {
    const got = opened.find(([x]) => x === d)[1];
    rec.ok(`...and standing ${d}px away does NOT (control)`, !got, { dist: d, sweep: opened });
  }
  await H.closeNpcDialogue(P);
  await P.ctx.close().catch(() => {});
}
