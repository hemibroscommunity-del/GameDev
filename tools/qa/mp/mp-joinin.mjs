/* YOUR PET AND THE TOWNSFOLK JOIN IN (v2.3.3394, docs/specs/emote-moves.md)
 *
 * The fun & social plan's Phase 1 (docs/FUN-SOCIAL-PLAN.md): your pet copies
 * your sit, sleep, flop and dances, and the townsfolk answer the moves near
 * them (src/game/townsfolkReact.js), drawn by rendering/emoteFx.js on their
 * one picture each.  Two phones in the Wheel's BroTown:
 *
 *   1. a pet out with the mover sits when he sits (its picture 70% tall),
 *      on his phone and on the other;
 *   2. it stands when he stands;
 *   3. by Lil Bro, a sit: Lil Bro sits a beat later and says so;
 *   4. by Diego, a dance: "No dancing in my store!";
 *   5. by Blacksmith Bro, a flex: he flexes back.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const sprite = (P, kind, id) => P.page.evaluate(({ kind, id }) => (window.__btEmoteSprite ? window.__btEmoteSprite(kind, id) : null), { kind, id });
async function waitSprite(P, kind, id, pred, timeout = 5000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeout) {
    last = await sprite(P, kind, id);
    if (last && pred(last)) return { ok: true, s: last };
    await P.page.waitForTimeout(100);
  }
  return { ok: false, s: last };
}
const npcBy = (P, name) => P.page.evaluate((name) => {
  const n = (window._gameState.current.npcs || []).find((x) => x && x.name === name);
  /* `said`: his last answer (townsfolkReact.js keeps it; the bubble itself is
     let go after 5 s, which this box can spend on two checks) */
  return n ? { id: n.id, x: n.x, y: n.y, bubble: n.chatBubble ? n.chatBubble.text : null, said: n._reactSaid || null } : null;
}, name);
async function waitBubble(P, name, want, timeout = 5000) {
  const t0 = Date.now();
  let n = null;
  while (Date.now() - t0 < timeout) {
    n = await npcBy(P, name);
    if (n && n.said && (!want || want.test(n.said))) return n;
    await P.page.waitForTimeout(120);
  }
  return n;
}
const move = (P, id) => P.page.evaluate((id) => window.__broLegacyUI.moveSend(id), id);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Mover', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  await H.enterWorld(A);
  await H.enterWorld(B);
  await H.waitMutualSight(A, B);
  const aId = await H.readState(A, (S) => S.myId);
  const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.emotemoves && S._serverCaps.petshow && S._serverCaps.petbook));
  rec.ok('the worker says emotemoves, petbook and petshow', caps);
  if (!caps) return;
  for (const P of [A, B]) await H.devOp(wsPort, 'quests', await H.readState(P, (S) => S.myId));

  /* ── 1-2. A PET SITS WITH YOU ── */
  const made = await H.devOp(wsPort, 'trapping', aId, { level: 30, pet: { home: 'frost', level: 20 } });
  await A.page.waitForFunction((id) => { const b = window._gameState.current._petBook; return b && b.active === id; }, made.pet, { timeout: 8000 }).catch(() => {});
  /* away from Lil Bro (260 px west of the arrival), who would copy this sit
     and spend his line on it */
  const a0 = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
  await H.hopTo(A, a0.x + 300, a0.y, { tries: 30 });
  const aPos = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
  const lil0 = await npcBy(A, 'Lil Bro');
  rec.ok('setup: the pet\'s sit is out of Lil Bro\'s sight (guard)', !lil0 || Math.hypot(lil0.x - aPos.x, lil0.y - aPos.y) > 420, { lil0, aPos });
  await H.hopTo(B, aPos.x + 140, aPos.y + 40, { tries: 40 });
  const petUp = await waitSprite(A, 'pet', null, (s) => s.visible, 8000);
  rec.ok('setup: the mover\'s pet is out and drawn (guard)', petUp.ok, petUp.s);
  await A.page.waitForTimeout(1100);
  await move(A, 'sit');
  const petSit = await waitSprite(A, 'pet', null, (s) => s.emoting && Math.abs(s.ky - 0.7) < 0.03, 4000);
  rec.ok('his pet sits when he sits (its picture 70% tall)', petSit.ok, petSit.s);
  const peerSit = await waitSprite(B, 'peerPet', aId, (s) => s.emoting && Math.abs(s.ky - 0.7) < 0.04, 6000);
  rec.ok('...on the other phone too', peerSit.ok, peerSit.s);
  await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/joinin-pet-sit.png` }).catch(() => {});
  await H.nudge(A, 'd', 400);
  const petUp2 = await waitSprite(A, 'pet', null, (s) => !s.emoting && s.rot === 0, 3000);
  rec.ok('...and stands when he stands', petUp2.ok, petUp2.s);
  await A.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'pet_active', payload: { id: null } }); });

  /* ── 3. LIL BRO COPIES ── */
  const lil = await npcBy(A, 'Lil Bro');
  rec.ok('setup: Lil Bro stands in the Wheel\'s BroTown (guard)', !!lil, lil);
  if (lil) {
    await H.hopTo(A, lil.x + 110, lil.y + 30, { tries: 60 });
    await A.page.waitForTimeout(1100);
    await move(A, 'sit');
    const lilSit = await waitSprite(A, 'npc', lil.id, (s) => s.emoting && Math.abs(s.ky - 0.7) < 0.03, 4000);
    rec.ok('by Lil Bro, a sit: he sits too', lilSit.ok, lilSit.s);
    const lilSaid = await waitBubble(A, 'Lil Bro', /I can do it too|Teach me|Like this/);
    rec.ok('...and says so', !!lilSaid && !!lilSaid.said, lilSaid);
    await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/joinin-lilbro.png` }).catch(() => {});
    await H.nudge(A, 'a', 300);
    const lilUp = await waitSprite(A, 'npc', lil.id, (s) => !s.emoting, 3000);
    rec.ok('...and stands when you stand', lilUp.ok, lilUp.s);
  }

  /* ── 4. DIEGO ── */
  const dg = await npcBy(A, 'Diego');
  rec.ok('setup: Diego stands by the General Store (guard)', !!dg, dg);
  if (dg) {
    await H.hopTo(A, dg.x + 120, dg.y + 20, { tries: 80 });
    await A.page.waitForTimeout(1100);
    await move(A, 'robot');
    const said = await waitBubble(A, 'Diego', /No dancing in my store!/);
    rec.ok('by Diego, a dance: "No dancing in my store!"', !!said && /No dancing/.test(said.said || ''), said);
    await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/joinin-diego.png` }).catch(() => {});
    await H.nudge(A, 'd', 300);
  }

  /* ── 5. BLACKSMITH BRO ── */
  const sm = await npcBy(A, 'Blacksmith Bro');
  rec.ok('setup: Blacksmith Bro stands by the forge (guard)', !!sm, sm);
  if (sm) {
    await H.hopTo(A, sm.x - 120, sm.y + 20, { tries: 80 });
    await A.page.waitForTimeout(1100);
    await move(A, 'flex');
    const flexBack = await waitSprite(A, 'npc', sm.id, (s) => s.emoting && s.ky > 1.05, 4000);
    rec.ok('by Blacksmith Bro, a flex: he flexes back', flexBack.ok, flexBack.s);
    const said = await waitBubble(A, 'Blacksmith Bro', /Not bad|anvil|Forge-made/);
    rec.ok('...with a word', !!said && !!said.said, said);
  }
}
