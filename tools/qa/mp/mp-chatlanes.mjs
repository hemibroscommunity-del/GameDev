/* TWO REAL CLIENTS, THREE LANES (v2.3.2136)
 *
 * Owner, from the demo feedback: per-channel chat, @user / @area / @all.
 *
 * server/test/chatlanes.test.mjs proves the WORKER's half against a mocked
 * socket.  It cannot prove the half that actually broke features in this repo
 * before: the client's send path.  A chat lane needs three legs -- a server
 * case, a handler, and the shim passthrough that carries the type (TRAPS #18,
 * the ability incident) -- plus a caps gate that must let the send through
 * against a CURRENT worker while blocking it against an old one.  Every one
 * of those is invisible to a mocked test and fatal in play.
 *
 * So: two real browsers, a real worker, and the assertions are about what
 * lands in the other player's chat log.
 *
 *  1. @all still reaches across zones -- the lane that already existed, and
 *     the control for everything below.
 *  2. @area reaches someone in the same zone...
 *  3. ...and NOT someone in a different one, which is the entire feature.
 *  4. @user reaches the named player.
 *  5. A whisper to nobody comes back as a refusal rather than vanishing --
 *     silence here would be the "select a weapon and nothing happens" shape
 *     of bug in a different costume.
 */
import * as H from './harness.mjs';

const TILE = 32;

/* Driven through __btSendChat -- the seam game/chat.js exposes for exactly
   this.  BroTown's own sendChat useCallback takes no argument (it reads the
   composer ref), so there is no way to ask it for a particular string. */
const say = (P, line) => P.page.evaluate((t) => (
  window.__btSendChat ? window.__btSendChat(t) : null
), line);

const log = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  return ((S && S.chatLog) || []).map((l) => ({
    name: l.name || '', text: l.text || '',
    area: !!l.area, whisper: !!l.whisper, lane: !!l.lane,
  }));
});

const sawText = (rows, t) => rows.some((r) => (r.text || '').indexOf(t) >= 0);

async function waitFor(P, pred, ms = 8000) {
  const t0 = Date.now();
  for (;;) {
    const rows = await log(P);
    if (pred(rows)) return rows;
    if (Date.now() - t0 > ms) return rows;
    await P.page.waitForTimeout(200);
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Lane', nameB: 'Ear' });
  await A.page.waitForTimeout(2000);

  /* The caps must be advertised or every send below is correctly suppressed
     and the whole file would pass by doing nothing. */
  const caps = await H.readState(A, (S) => ({
    areaChat: !!(S._serverCaps && S._serverCaps.areaChat),
    whisper: !!(S._serverCaps && S._serverCaps.whisper),
  }));
  rec.ok('the worker advertises both lanes (guard — without this nothing is sent)',
    caps.areaChat && caps.whisper, caps);

  const sendable = await say(A, '/a probe');
  if (!sendable) {
    rec.skip('the chat lanes carry a line between two real clients',
      'no client-side send handle to drive');
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
    return;
  }

  /* ── 1. @all, the control ── */
  await say(A, 'hello everyone');
  let rows = await waitFor(B, (r) => sawText(r, 'hello everyone'));
  rec.ok('room chat still reaches the other player', sawText(rows, 'hello everyone'),
    rows.slice(-4));

  /* ── 2. @area, same zone ── */
  const zones = await Promise.all([H.readState(A, (S) => S.currentZone), H.readState(B, (S) => S.currentZone)]);
  rec.ok('both players are in the same zone to start (guard)', zones[0] === zones[1], zones);
  await say(A, '/a anyone by the fountain');
  rows = await waitFor(B, (r) => sawText(r, 'anyone by the fountain'));
  rec.ok('an area line reaches a player in the same zone',
    sawText(rows, 'anyone by the fountain'), rows.slice(-4));
  rec.ok('...and is tagged as an area line, not folded into room chat',
    rows.some((r) => r.area && r.text.indexOf('anyone by the fountain') >= 0), rows.slice(-4));

  /* ── 3. @area, and NOT across a zone boundary ── */
  const marks = await A.page.evaluate(() => {
    const f = window._gameFns || {};
    return (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null;
  });
  if (!marks) {
    rec.skip('an area line does NOT cross a zone boundary', 'no town exit table');
  } else {
    /* THE PORTALS ARE QUEST-GATED (v2.3.1817), so standing on a trail-head
       does nothing until a quest has opened it.  The first cut of this file
       skipped its most important assertion for exactly that reason -- B stood
       on the town exit and stayed put, and the zone-scoping claim, which IS
       the feature, went untested. */
    await B.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S && S.channel) {
        for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
          S.channel.send({ type: 'quest_accept', payload: { questId: q } });
        }
      }
    });
    await B.page.waitForTimeout(2200);
    await B.page.evaluate(({ px, py }) => {
      const S = window._gameState && window._gameState.current;
      if (S && S.player) { S.player.x = px; S.player.y = py; }
    }, { px: marks.tx * TILE + 16, py: marks.ty * TILE + 16 });
    await H.waitFor(B, (S) => S.currentZone, (z) => z === 'worldview',
      { timeout: 30000, label: 'World View' }).catch(() => {});
    await B.page.waitForTimeout(1500);
    const bZone = await H.readState(B, (S) => S.currentZone);
    if (bZone === 'worldview') {
      const before = (await log(B)).length;
      await say(A, '/a still in town though');
      await A.page.waitForTimeout(2500);
      const after = await log(B);
      rec.ok('an area line does NOT cross a zone boundary',
        !sawText(after, 'still in town though'),
        { bZone, added: after.slice(before) });
      /* ...and room chat still does, so the difference is the LANE and not a
         socket that quietly stopped delivering. */
      await say(A, 'but this should carry');
      const carried = await waitFor(B, (r) => sawText(r, 'but this should carry'));
      rec.ok('...while room chat still crosses it (so the socket is fine)',
        sawText(carried, 'but this should carry'), carried.slice(-4));
    } else {
      rec.skip('an area line does NOT cross a zone boundary', 'B never left town');
    }
  }

  /* ── 4. @user ── */
  await say(A, '/w Ear meet me by the forge');
  rows = await waitFor(B, (r) => sawText(r, 'meet me by the forge'));
  rec.ok('a whisper reaches the player it names',
    sawText(rows, 'meet me by the forge'), rows.slice(-4));
  rec.ok('...tagged as a whisper',
    rows.some((r) => r.whisper && r.text.indexOf('meet me by the forge') >= 0), rows.slice(-4));

  /* ── 5. a whisper to nobody says so ── */
  await say(A, '/w Nobodyhere are you there');
  const mine = await waitFor(A, (r) => r.some((x) => x.lane && /Nobodyhere/i.test(x.text)));
  rec.ok('a whisper to a name nobody has comes back as a refusal, not silence',
    mine.some((x) => x.lane && /Nobodyhere/i.test(x.text)), mine.slice(-4));

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
