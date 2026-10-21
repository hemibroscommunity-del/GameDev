/* mp-achvtitle (v2.3.3527): your title and your rarest achievement, as another
 * player sees them on your card.  The achievements plan's last part (the
 * owner: "Go recommended on everything"): the card's title and "rarest drop"
 * were placeholders on everyone's card ("Fishing Master", "Ancient Ember
 * Crown").  The title is now an achievement you chose, the rarest the one the
 * worker counts rarest, both stamped on the card's blob by the WORKER
 * (server/src/achievements.js _achvStamp).
 *
 * Two phones in the world's BroTown (H.joinPair, `world: 'wheel'`: the old map
 * is retired): Titled and Viewer.
 *   1. guard: Viewer's card on Titled shows no title and "None yet" for the
 *      rarest -- never the old placeholders;
 *   2. Titled earns Storyteller (the owner's lever, /dev/achv) and picks it as
 *      its title through the game's own channel (`achv_title`, channelShim's
 *      passthrough): the worker's achv_state says `t` and `rarest`;
 *   3. Viewer's copy of Titled carries both (the look relay), and Viewer's
 *      card on Titled shows "Storyteller" as the title and in the rarest box;
 *   4. a page claiming what it never earned (Titled's own S._achv set to
 *      Godly, its look changed so a relay is due) relays none of it: the
 *      worker's stamp keeps Storyteller;
 *   5. the title taken off (null): Viewer's card shows none, the rarest stays;
 *   6. Titled's own card (window.__broInspectSelf) shows the title and rarest.
 */
import * as H from './harness.mjs';

const ID = 'story_done', NAME = 'Storyteller';

export async function run({ browser, wsPort, webPort, rec }) {
  const { A: V, B: T } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Viewer', nameB: 'Titled', world: 'wheel' });
  const errs = [];
  for (const P of [V, T]) P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  const stopV = H.keepAlive(V, 15000), stopT = H.keepAlive(T, 15000);
  try {
    const tId = await H.readState(T, (S) => S.myId);
    const caps = await H.readState(T, (S) => !!(S._serverCaps && S._serverCaps.achievements));
    const zone = await H.readState(T, (S) => S.currentZone);
    rec.ok(`two phones in the world's BroTown (zone "${zone}"), the worker grants achievements (guard)`, !!tId && caps && zone === 'wheel', { tId, caps, zone });

    /* Viewer's copy of Titled's card blob */
    const peerRd = () => V.page.evaluate((id) => {
      const S = window._gameState && window._gameState.current;
      const o = S && S.others && S.others[id];
      return o && o.rpgData ? { title: o.rpgData.title || null, rarest: o.rpgData.rarest || null, pvpDeaths: o.rpgData.pvpDeaths } : null;
    }, tId);
    const waitPeer = (pred, label, timeout = 20000) => (async () => {
      const t0 = Date.now();
      let last = null;
      while (Date.now() - t0 < timeout) {
        last = await peerRd().catch(() => null);
        if (last && pred(last)) return last;
        await V.page.waitForTimeout(400);
      }
      return { __timeout: label, last };
    })();
    /* the card's title chip and rarest box, as drawn -- on the Inspect card
       (PlayerProfilePanel), which a player reaches from the player card by its
       portrait (`[data-act="profile"]`, InspectPlayerPanel) */
    const cardOf = (P) => P.page.evaluate(() => {
      const card = document.querySelector('.bt-inspect-card') || document;
      const t = document.querySelector('.bt-pin-title');
      const r = document.querySelector('.bt-pin-drop');
      const text = (card.textContent || '');
      return {
        title: t ? { achv: t.getAttribute('data-achv'), text: (t.textContent || '').trim(), img: (t.querySelector('img') || {}).src || null } : null,
        rarest: r ? { id: r.getAttribute('data-rarest'), tier: r.getAttribute('data-tier'), text: (r.textContent || '').trim(), img: (r.querySelector('img') || {}).src || null } : null,
        placeholders: /Fishing Master|Ember Crown/.test(text),
      };
    });
    const closeCards = (P) => P.page.evaluate(() => { for (const b of document.querySelectorAll('.bt-inspect-close')) b.click(); }).catch(() => {});
    const openCard = async () => {
      await closeCards(V);
      await V.page.waitForTimeout(300);
      await H.openInspect(V, tId);
      /* the player card first, as a tap opens it; its portrait opens the
         Inspect card, where the title and the rarest are */
      await H.clickAct(V, 'profile').catch(() => null);
      /* the card draws the rarest box once their blob is in */
      for (let i = 0; i < 20; i++) {
        const c = await cardOf(V);
        if (c.rarest) return c;
        await V.page.waitForTimeout(300);
      }
      return cardOf(V);
    };

    /* ── 1. before anything: no title, "None yet", no placeholders ── */
    const landed = await waitPeer((r) => r !== null, 'their blob');
    const c1 = await openCard();
    rec.ok('1. a player with no achievements: no title, the rarest box says "None yet", and never the old placeholders',
      !landed.__timeout && !c1.title && c1.rarest && c1.rarest.id === 'none' && /None yet/.test(c1.rarest.text) && !c1.placeholders, { landed, c1 });
    await closeCards(V);

    /* ── 2. earned, then picked as the title through the game's channel ── */
    const lever = await H.devOp(wsPort, 'achv', tId, { id: ID });
    await H.waitFor(T, (S) => !!(S._achv && S._achv.got && S._achv.got.story_done), (v) => v, { timeout: 15000, label: 'Titled told it has Storyteller' }).catch(() => null);
    const sent = await T.page.evaluate((id) => {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.channel) return 'no-channel';
      S.channel.send({ type: 'achv_title', payload: { id } });
      return 'sent';
    }, ID);
    const st = await H.waitFor(T, (S) => ({ t: S._achv && S._achv.t, rarest: S._achv && S._achv.rarest }),
      (v) => v.t === 'story_done' && v.rarest === 'story_done', { timeout: 15000, label: 'the worker says the title' }).catch((e) => ({ __err: String(e).slice(0, 300) }));
    rec.ok('2. Storyteller earned (the lever) and picked through the game\'s own channel: the worker says t and rarest',
      lever && lever.ok && sent === 'sent' && st.t === ID && st.rarest === ID, { lever, sent, st });

    /* ── 3. Viewer sees them ── */
    const r3 = await waitPeer((r) => r.title === ID && r.rarest === ID, 'the title relayed');
    const c3 = await openCard();
    rec.ok('3. Viewer\'s copy of Titled carries the title and the rarest (the look relay)', !r3.__timeout, r3);
    rec.ok('...and Viewer\'s card on Titled shows "Storyteller" as the title and as the rarest, a rare one, its badge on both',
      c3.title && c3.title.achv === ID && c3.title.text.indexOf(NAME) >= 0
      && c3.rarest && c3.rarest.id === ID && c3.rarest.tier === 'rare' && c3.rarest.text.indexOf(NAME) >= 0 && !c3.placeholders
      && [c3.title.img, c3.rarest.img].every((u) => new RegExp('/icons/achievements/' + ID + '\\.webp').test(u || '')), c3);
    await closeCards(V);

    /* ── 4. a claim the page makes is never relayed ── */
    const deaths = await T.page.evaluate(() => {
      const S = window._gameState.current;
      S._achv.t = 'godly';
      S._achv.rarest = 'godly';
      /* a look that is news, so the relay goes with the worker's stamp on it */
      if (!S.rpg._compStats) S.rpg._compStats = {};
      S.rpg._compStats.pvpDeaths = (S.rpg._compStats.pvpDeaths || 0) + 7;
      return S.rpg._compStats.pvpDeaths;
    });
    const r4 = await waitPeer((r) => r.pvpDeaths === deaths, 'the forged look relayed', 25000);
    rec.ok('4. Titled\'s page claims Godly: its look is relayed (guard), with the worker\'s Storyteller on it, never Godly',
      !r4.__timeout && r4.title === ID && r4.rarest === ID, { deaths, r4 });
    /* put Titled's page right: the worker answers every achv_title with what stands */
    await T.page.evaluate((id) => { window._gameState.current.channel.send({ type: 'achv_title', payload: { id } }); }, ID);
    await H.waitFor(T, (S) => S._achv && S._achv.t, (v) => v === ID, { timeout: 15000, label: 'the page put right' }).catch(() => null);

    /* ── 5. taken off ── */
    await T.page.evaluate(() => { window._gameState.current.channel.send({ type: 'achv_title', payload: { id: null } }); });
    const st5 = await H.waitFor(T, (S) => ({ t: (S._achv && S._achv.t) || null, rarest: S._achv && S._achv.rarest }),
      (v) => v.t === null && v.rarest === ID, { timeout: 15000, label: 'the title off' }).catch((e) => ({ __err: String(e).slice(0, 300) }));
    const r5 = await waitPeer((r) => r.title === null && r.rarest === ID, 'the title off, relayed');
    const c5 = await openCard();
    rec.ok('5. the title taken off: the worker says none, Viewer\'s card shows no title, the rarest box still Storyteller',
      st5.t === null && !r5.__timeout && !c5.title && c5.rarest && c5.rarest.id === ID, { st5, r5, c5 });
    await closeCards(V);

    /* ── 6. your own card ── */
    await T.page.evaluate((id) => { window._gameState.current.channel.send({ type: 'achv_title', payload: { id } }); }, ID);
    await H.waitFor(T, (S) => S._achv && S._achv.t, (v) => v === ID, { timeout: 15000, label: 'the title back' }).catch(() => null);
    const opened = await T.page.evaluate(() => (window.__broInspectSelf ? window.__broInspectSelf() : 'no-hook'));
    let c6 = null;
    for (let i = 0; i < 20; i++) {
      c6 = await cardOf(T);
      if (c6.title || c6.rarest) break;
      await T.page.waitForTimeout(300);
    }
    rec.ok('6. Titled\'s own card shows its title and its rarest',
      opened === true && c6 && c6.title && c6.title.achv === ID && c6.rarest && c6.rarest.id === ID && !c6.placeholders, { opened, c6 });
    await closeCards(T);

    rec.ok('no page errors', errs.length === 0, errs);
  } finally {
    stopV();
    stopT();
    await V.ctx.close().catch(() => {});
    await T.ctx.close().catch(() => {});
  }
}
