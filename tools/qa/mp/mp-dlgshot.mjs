/* A picture of Mayor Bro's dialogue window, at phone size (v2.3.1828). */
import * as H from './harness.mjs';
import fs from 'fs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Shot', wsPort, webPort, touch: true,
    viewport: { width: 393, height: 852 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  const place = (dx, dy) => P.page.evaluate(({ ox, oy }) => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (!S || !npc || !S.player) return null;
    S.player.x = npc.x + ox; S.player.y = npc.y + oy;
    return true;
  }, { ox: dx, oy: dy });
  await place(420, 0); await P.page.waitForTimeout(600);
  await H.closeNpcDialogue(P);
  await place(0, 34);  await P.page.waitForTimeout(1600);
  try { fs.mkdirSync('tools/qa/mp/out', { recursive: true }); } catch (e) {}
  await P.page.screenshot({ path: 'tools/qa/mp/out/dlg-head.png' });
  rec.ok('the dialogue window was captured', await H.npcDialogueOpen(P));
  await P.ctx.close().catch(() => {});
}
