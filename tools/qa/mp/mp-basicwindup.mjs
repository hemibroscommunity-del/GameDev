/* EVERY MONSTER TELLS YOU BEFORE IT HITS YOU (v2.3.2215).
 *
 * Owner: combat feels "floaty".  Half of that was the player's own hits
 * landing before the blade reached the target (fixed in v2.3.2200); this is
 * the other half — a monster's ordinary swing used to decide AND land inside
 * a single 22ms server tick, so damage arrived with nothing in front of it.
 *
 * Driven against a REAL worker in a REAL spoke zone, because the property
 * under test is a timing relationship between two server ticks: a mocked
 * room can prove the state machine (server/test/combat-lifecycle does), but
 * only a live one proves the cue actually reaches a browser before the
 * damage does.
 *
 * Sampled from CLIENT STATE rather than by wrapping the wire: window.
 * __btDispatch is a test-injection helper, and real inbound messages go
 * through wsClient's own switch without touching it — wrapping it looks
 * like it works and silently observes nothing.  Reading the monster's
 * rendered tell state also covers the failure that actually bit this
 * codebase before: the shipped kit telegraphs were authoritative and
 * INVISIBLE for versions, because the client drops ability strings it has
 * no table entry for.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Winder', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* Town monsters are client-driven (TRAPS #32: S._serverMonsters is FALSE
     in town), so the server-side wind-up would never run there.  Move to a
     spoke and tell the server about it, the mp-potions way. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.currentZone = 'meadow';
    if (S.channel) S.channel.send({ type: 'move', x: 500, y: 500, z: 'meadow' });
  });
  await P.page.waitForTimeout(2000);
  const zone = await P.page.evaluate(() => window._gameState.current.currentZone);
  rec.ok('the player is in a server-driven spoke zone (town monsters are client-side)',
    zone === 'meadow', { zone });

  /* Install a per-frame sampler: first moment a monster shows its tell, and
     first moment our HP actually drops.  Recording both in the page keeps
     the timestamps honest — polling from Node would measure round-trips. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const probe = { cueAt: 0, hitAt: 0, hp0: null, cueMonster: null };
    window.__bwProbe = probe;
    const step = () => {
      try {
        const hp = S.rpg && S.rpg.hp;
        if (probe.hp0 == null && typeof hp === 'number') probe.hp0 = hp;
        if (!probe.cueAt) {
          const m = (S.monsters || []).find((x) => x && x._tgUntil && Date.now() < x._tgUntil);
          if (m) { probe.cueAt = Date.now(); probe.cueMonster = m.id; }
        }
        if (!probe.hitAt && typeof hp === 'number' && probe.hp0 != null && hp < probe.hp0) {
          probe.hitAt = Date.now();
        }
      } catch (e) {}
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  /* WALK to a monster — do not teleport.  movement.js caps a single update
     at 500px/s plus an 80px burst, so a one-shot jump across the zone is
     rejected outright: the client would show the player next to a monster
     while the SERVER still had them where they started, and nothing would
     ever swing at them.  Stepping keeps client and server agreed. */
  await P.page.evaluate(async () => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.alive);
    if (!m || !S.player) return;
    const tx = m.x - 18, ty = m.y;
    for (let i = 0; i < 60; i++) {
      const dx = tx - S.player.x, dy = ty - S.player.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 20) break;
      const step = Math.min(55, d);            /* under the per-update cap */
      S.player.x += (dx / d) * step;
      S.player.y += (dy / d) * step;
      if (S.channel) S.channel.send({ type: 'move', x: S.player.x, y: S.player.y, z: S.currentZone });
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await P.page.waitForTimeout(600);
  /* Prove the SERVER agrees before waiting on it to swing — a desynced
     position is the failure this scenario would otherwise blame on the
     wind-up. */
  const myId = await P.page.evaluate(() => window._gameState.current.myId);
  const srv = await H.serverPlayer(wsPort, myId).catch(() => null);
  const cli = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { x: S.player.x, y: S.player.y };
  });
  const drift = srv ? Math.hypot(srv.x - cli.x, srv.y - cli.y) : -1;
  rec.ok('the server agrees where the player is standing (no teleport rejection)',
    drift >= 0 && drift < 120, { drift, srv: srv && { x: Math.round(srv.x), y: Math.round(srv.y) }, cli: { x: Math.round(cli.x), y: Math.round(cli.y) } });

  await H.waitFor(P,
    () => window.__bwProbe && window.__bwProbe.hitAt,
    (v) => !!v,
    { timeout: 40000, label: 'a monster lands a hit on us' });

  const probe = await P.page.evaluate(() => window.__bwProbe);
  rec.ok('the monster showed its tell BEFORE the damage arrived',
    probe.cueAt > 0 && probe.cueAt < probe.hitAt,
    probe);
  /* The gap is the whole feature.  Loose lower bound (the shortest wind-up
     in the table is 350ms and a frame sampler plus wire jitter eat into it),
     but far outside "same tick", which is what this replaces. */
  const gap = probe.hitAt - probe.cueAt;
  rec.ok('...and the gap is a readable window, not a same-tick pair',
    gap >= 150, { gap, cueAt: probe.cueAt, hitAt: probe.hitAt });

  await P.ctx.close().catch(() => {});
}
