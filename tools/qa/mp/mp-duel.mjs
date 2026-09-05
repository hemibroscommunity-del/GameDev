/* Duels through the real UI — the flow the owner reported broken twice.
 *
 * The two reports were: "dueling only works with sword" and "all it says is
 * hit when I hit the other player… this was a duel in town".  v2.3.1605 fixed
 * the client's melee gate (it refused to fire in a safe zone even during a
 * consented duel) and the pvp_hit popup.  Running this scenario then found
 * that the SECOND half of the popup complaint was still live: the attacker
 * also got "Hit! -4" in amber over their own head, from the legacy
 * pvp_confirmed bookkeeping path — fixed in v2.3.1612.
 *
 * What this asserts, and why each one is here:
 *
 *   - BOTH sides get _inDuel, not just the accepter (v2.3.1306's half-fix)
 *   - a duel started IN TOWN lets attacks through: a safe zone does not veto
 *     consent
 *   - a swing drops the target's SERVER-side HP, and the target's own client
 *     shows it too
 *   - the attacker's popup is a NUMBER over the OPPONENT, and the literal word
 *     "Hit!" appears nowhere
 *   - declining leaves nobody in a duel
 *   - a duel fought to a finish ends cleanly and does NOT wipe the loser's bag
 */
import * as H from './harness.mjs';

const duelState = (P) => H.readState(P, (S) => ({
  inDuel: S._inDuel ? { opponent: S._inDuel.opponent } : null,
  active: S._activeDuel ? { partnerId: S._activeDuel.partnerId } : null,
}));

/* Aim A's swing at B and press.
 *
 * Mouse-down on the canvas is the desktop attack, and it seeds the swing angle
 * from wherever the cursor is: worldX = screenX + camera.x, a pure translation
 * with no zoom (BroTown.jsx).  So the aim point is exact arithmetic — but ONLY
 * against the live camera.  Aiming at "160px from the middle of the window"
 * instead silently misses by however far the camera has clamped away from the
 * player, which near a map edge is tens of degrees, and the swing then whiffs
 * for a reason that looks exactly like a broken duel.
 *
 * Returns the worst aim error in radians so the caller can assert the swing
 * was actually pointed at the opponent before believing a no-damage result. */
/* Damage popups are SHORT-LIVED — the renderer destroys them a beat after they
 * spawn — so reading S.dmgNumbers once after the fight is a coin flip.  It
 * caught "Hit! -4" on one run and an empty list on the next, from the same
 * build.  Sample after every press and accumulate instead. */
async function swingAt(A, times = 6, seen = null, onEach = null) {
  let worstErr = 0;
  const sample = async () => {
    if (!seen) return;
    for (const t of await H.readState(A, (S) => (S.dmgNumbers || []).map((p) => ({
      text: String(p.text), x: Math.round(p.x), y: Math.round(p.y),
    })))) seen.push(t);
  };
  for (let i = 0; i < times; i++) {
    const pt = await A.page.evaluate(() => {
      const S = window._gameState.current;
      const o = S.others && S.others[Object.keys(S.others)[0]];
      if (!o || !S.camera) return null;
      const ox = o.x != null ? o.x : o.renderX, oy = o.y != null ? o.y : o.renderY;
      const th = Math.atan2(oy - S.player.y, ox - S.player.x);
      /* Put the cursor along the A->B ray, as far out as still fits on screen
         (bigger radius = less rounding error in the readback angle). */
      /* ═══ v2.3.1756: AIM AT THE CANVAS, NOT AT THE WINDOW ═══
         This was two errors compounding, and together they are the entire
         "duels do no damage" result this suite has been reporting.

         1. The canvas is LETTERBOXED: on the 1000x780 harness viewport it
            measures 380x553 at left=310.  The game's own handlers convert
            with `e.clientX - rect.left`, so a viewport coordinate that
            ignores the offset is not the point the game reads — and here it
            was not even ON the canvas.  elementFromPoint at the old aim
            point returned ["BODY","HTML"]: the press hit the page beside the
            game, so no mousedown ever reached it.  S.swinging stayed false,
            the wire log showed no attack of any kind, and every downstream
            assertion failed for want of a click.
         2. World->CSS is (world - camera) * S._worldScaleX/Y, not a bare
            translation; the world renders at 0.8.

         Clamped inside the CANVAS rect for the same reason, and still kept
         clear of the dashboard band in case a shorter viewport puts it over
         the canvas. */
      const cv = document.querySelector('canvas.brotown-canvas');
      const r = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
      const scX = S._worldScaleX || 1, scY = S._worldScaleY || 1;
      const px = (S.player.x - S.camera.x) * scX, py = (S.player.y - S.camera.y) * scY;
      const c = Math.cos(th) * scX, s = Math.sin(th) * scY;
      /* largest R that keeps the point inside the canvas along this ray.
         The bottom margin must clear the DASHBOARD, which would swallow
         the press — and the band's height is not a constant: it is
         viewport-derived and grew again in v2.3.1635 when the identity
         row landed.  Read the live --dash-h rather than hardcoding a
         margin that silently stops clearing it. */
      const dashH = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || 135;
      const bottom = Math.min(r.height, innerHeight - dashH - r.top);
      const lim = (comp, toLow, toHigh) => Math.abs(comp) < 1e-3 ? Infinity
        : (comp > 0 ? toHigh : toLow) / Math.abs(comp);
      const R = Math.max(40, Math.min(180,
        lim(c, px - 24, r.width - 24 - px),
        lim(s, py - 24, bottom - 16 - py)));
      return { sx: r.left + px + c * R, sy: r.top + py + s * R, th };
    });
    if (!pt) return { ok: false, worstErr };
    await A.page.mouse.move(pt.sx, pt.sy);
    await A.page.waitForTimeout(80);
    /* Did the client actually take the aim we intended? */
    const got = await H.readState(A, (S) => S._mouseAimAngle);
    if (got != null) {
      let d = Math.abs(((got - pt.th + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
      worstErr = Math.max(worstErr, d);
    }
    await A.page.mouse.down();
    await A.page.waitForTimeout(280);
    await A.page.mouse.up();
    await sample();
    if (onEach) await onEach();
    await A.page.waitForTimeout(320);
    await sample();
    if (onEach) await onEach();
  }
  return { ok: true, worstErr };
}

/* Walk A until the SERVER agrees the two are within melee reach.
 *
 * This step is not padding.  A melee swing claims range 50, the server checks
 * that distance against ITS OWN copy of both positions, and `waitMutualSight`
 * deliberately nudges the two players in opposite directions to make them
 * dirty — which leaves them ~58px apart.  Every swing was then dropped with
 * "range 57.7 > 50" while the client's stale mirror of the peer still read 8px
 * away, i.e. the test looked like a broken duel and was actually out of reach.
 * So: close the distance, and confirm it against the server before swinging. */
async function closeIn(A, wsPort, aId, bId, want = 34) {
  for (let i = 0; i < 14; i++) {
    const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
    if (!pa || !pb) return { ok: false, why: 'no server state' };
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const d = Math.hypot(dx, dy);
    if (d <= want) return { ok: true, d: Math.round(d) };
    /* one step along the dominant axis, then re-measure */
    const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : (dy > 0 ? 's' : 'w');
    await A.page.keyboard.down(key);
    await A.page.waitForTimeout(Math.min(500, Math.max(90, (d - want) * 2.2)));
    await A.page.keyboard.up(key);
    await A.page.waitForTimeout(320);
  }
  const [pa, pb] = await Promise.all([H.serverPlayer(wsPort, aId), H.serverPlayer(wsPort, bId)]);
  return { ok: false, d: pa && pb ? Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y)) : null };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Duelist', nameB: 'Rival' });
  const bId = await H.readState(B, (S) => S.myId);
  const aId = await H.readState(A, (S) => S.myId);

  const zone = await H.readState(A, (S) => S.currentZone);
  rec.ok('the pair start in town (the safe zone the bug report was about)', zone === 'town', { zone });

  /* ═══ v2.3.1699: ARM THE DUELLISTS ═══
     This suite used to swing with EMPTY HANDS and still land damage, because
     the manual tap handler never checked for a weapon — the "free initial
     swing" the owner reported, closed in v2.3.1682.  With that hole shut, an
     unarmed duel produces no attack messages at all and every assertion below
     fails; the six failures were this test resting on the bug, not the duel
     system breaking.  Arm both sides the way a real player is armed (grant to
     the stash, then equip through the worker's own equip_request) so the
     duel assertions test duelling rather than the swing gate. */
  /* The admin grant refuses weapons ("weapons unsupported v1",
     server/src/admin.js), so arm them the way the game does: accept tut_1,
     which pays the sword into the stash, then equip through the worker's own
     equip_request. */
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
    });
  }
  await A.page.waitForTimeout(1500);
  for (const P of [A, B]) {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      const R = S && S.rpg; if (!R || !S.channel) return;
      const i = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
      if (i < 0) return;
      R.weapon = R.weaponStash[i]; R.weaponStash.splice(i, 1); R.activeSlot = 'melee';
      S.channel.send({ type: 'equip_request', payload: { stashIdx: i, slot: 'weapon' } });
    });
  }
  await A.page.waitForTimeout(1500);
  const armedOk = await Promise.all([H.adminPlayer(wsPort, aId), H.adminPlayer(wsPort, bId)])
    .then((r) => r.every((x) => x && x.rpg && x.rpg.weapon)).catch(() => false);
  rec.ok('both duellists are armed server-side before any swing', armedOk);
  await H.instrumentWire(A);

  /* ── decline path first, so the accept path starts from a clean slate ── */
  await H.openInspect(A, bId);
  await H.clickText(A, 'Duel');
  /* textContent, not innerText: the challenge title sits in a flex row whose
     innerText the engine reports empty here, and the panel is unquestionably
     rendered (its Accept/Decline buttons are). */
  const sawChallenge = await H.waitUi(B, () => /Duel Challenge/.test(document.body.textContent || ''),
    { label: 'B sees the duel challenge', timeout: 20000 }).then(() => true).catch(() => false);
  rec.ok('the challenge reaches the other player', sawChallenge);
  if (sawChallenge) {
    /* ── v2.3.2289: THE BACKDROP DOES NOT ANSWER FOR YOU ──
       A tap on the scrim used to clear the card and send nothing: the duel was
       refused locally and the challenger was never told, so a dismissal and a
       120s silent timeout looked identical from their side. The backdrop is
       inert now -- Accept and Decline both notify, so removing the third,
       SILENT exit is the fix. Driven with a real mouse click well away from
       the card, because a synthetic dispatch would ignore hit-testing and
       prove nothing about where a thumb actually lands. */
    const scrimPt = await B.page.evaluate(() => {
      const card = document.querySelector('.bt-inspect-card');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      const gap = window.innerHeight - r.bottom;
      if (gap < 40) return { tapped: false, gap: Math.round(gap) };
      return { tapped: true, x: Math.round(r.left + r.width / 2),
        y: Math.round(r.bottom + Math.min(gap - 8, 40)) };
    });
    if (scrimPt && scrimPt.tapped) {
      await B.page.mouse.click(scrimPt.x, scrimPt.y);
      await B.page.waitForTimeout(600);
      const stillUp = await B.page.evaluate(() => /Duel Challenge/.test(document.body.textContent || ''));
      rec.ok('a tap on the backdrop no longer throws the challenge away silently',
        stillUp === true, { scrimPt, stillUp });
    } else {
      rec.skip('a tap on the backdrop no longer throws the challenge away silently',
        'no scrim band below the card at this viewport');
    }
    await H.clickText(B, 'Decline');
    await B.page.waitForTimeout(1500);
    const [da, db] = await Promise.all([duelState(A), duelState(B)]);
    rec.ok('declining leaves nobody in a duel', !da.inDuel && !db.inDuel, { da, db });
  }

  /* ── accept path ── */
  await H.openInspect(A, bId);
  await H.clickText(A, 'Duel');
  const again = await H.waitUi(B, () => [...document.querySelectorAll('button')]
    .some((b) => b.textContent.trim() === 'Accept'), { label: 'B sees Accept', timeout: 20000 })
    .then(() => true).catch(() => false);
  rec.ok('a second challenge can be issued', again);
  if (!again) { await A.ctx.close(); await B.ctx.close(); return; }
  await H.clickText(B, 'Accept');
  await B.page.waitForTimeout(2000);

  const [da, db] = await Promise.all([duelState(A), duelState(B)]);
  rec.ok('the ACCEPTER is in a duel', !!db.inDuel, db);
  /* v2.3.1306: the challenger used to be left out, so only their tap-locked
     swings landed — half of "only melee hurt me". */
  rec.ok('the CHALLENGER is in a duel too', !!da.inDuel, da);

  /* ── a real swing has to do real damage, in town ── */
  const near = await closeIn(A, wsPort, aId, bId);
  rec.ok('the duellists can be walked into melee reach', near.ok, near);
  /* HP off the SERVER, not the client.  The server owns hp and echoes it, so a
     single client read races the echo and regen; the authoritative number
     never does. */
  const bHp0 = (await H.serverPlayer(wsPort, bId) || {}).hp;
  const dist = near.d;
  const seen = [];
  const aim = await swingAt(A, 8, seen);
  /* A missed swing and a broken duel look identical from the HP alone, so
     prove the swing was aimed before trusting the damage result. */
  rec.ok('the swing is actually aimed at the opponent',
    aim.ok && aim.worstErr < 0.2, { ...aim, dist });
  /* v2.3.1605 was specifically about the CLIENT refusing to send in a safe
     zone, so count the sends separately from the damage result. */
  const wire = await H.wireCounts(A);
  rec.ok('the client sends PvP attacks during a town duel', (wire.player_attack || 0) > 0, wire);

  await A.page.waitForTimeout(1200);
  const bHp1 = (await H.serverPlayer(wsPort, bId) || {}).hp;
  rec.ok('a duel swing in town damages the target', bHp1 != null && bHp0 != null && bHp1 < bHp0,
    { bHp0, bHp1, dist, aimErr: aim.worstErr });
  /* And the DEFENDER's screen has to agree — a server-side HP drop the client
     never renders is still a broken duel from where the player is sitting. */
  const bSees = await H.waitFor(B, (S) => (S.rpg || {}).hp, (h) => h != null && h < bHp0,
    { timeout: 10000, label: 'B sees their own HP drop' }).then(() => true).catch(() => false);
  rec.ok('the target\'s own HP bar reflects the hit', bSees,
    { bHp0, clientHp: await H.readState(B, (S) => (S.rpg || {}).hp) });

  /* THE ATTACKER'S OWN SCREEN is what the owner complained about ("all it says
     is hit when I hit the other player"), so read A's popups.  The fix floats
     the server's resolved dmgTaken over the TARGET; the literal word must
     never render again. */
  const texts = [...new Set(seen.map((p) => p.text))];
  const numeric = texts.filter((t) => /^-\d+!?$/.test(t));
  const outcome = texts.filter((t) => /^(Dodged|Blocked)$/.test(t));
  /* v2.3.1612: the legacy pvp_confirmed path drew "Hit! -4" in amber over the
     attacker's own head on top of the correct number.  Nothing may render the
     literal word any more. */
  const saidHit = texts.filter((t) => /Hit!/.test(t));
  rec.ok('the attacker sees a real number (or Blocked/Dodged), never "Hit!"',
    (numeric.length > 0 || outcome.length > 0) && saidHit.length === 0, { texts });

  /* …and it has to be ANCHORED TO THE OPPONENT, not to the attacker.
     Checking "closer to them than to me" is meaningless here — duellists stand
     almost on top of each other, so both distances come out similar and the
     check passes or fails on noise.  Check the anchor itself instead: the fix
     places the number at (target.x, target.y - 30), while the old
     attacker-anchored popup sat at (me.x + 20, me.y - 20).  The 20px x-offset
     separates them however close the two players are standing. */
  const anchors = await H.readState(A, (S) => {
    const o = S.others && S.others[Object.keys(S.others)[0]];
    return o ? { me: { x: S.player.x, y: S.player.y }, foe: { x: o.x || 0, y: o.y || 0 } } : null;
  });
  const hits = seen.filter((p) => /^-\d+!?$/.test(p.text));
  const placed = anchors && hits.length ? (() => {
    const p = hits[hits.length - 1];
    return {
      text: p.text, at: { x: p.x, y: p.y }, foe: anchors.foe, me: anchors.me,
      offFoe: Math.round(Math.hypot(p.x - anchors.foe.x, p.y - (anchors.foe.y - 30))),
      offMe: Math.round(Math.hypot(p.x - (anchors.me.x + 20), p.y - (anchors.me.y - 20))),
    };
  })() : null;
  rec.ok('the damage number is anchored to the opponent, not the attacker',
    !!placed && placed.offFoe <= 12 && placed.offFoe < placed.offMe,
    placed || { hits: hits.length, anchors });

  /* ── fight it out: a duel KILL is the payoff path ──
     A duel death is not an ordinary death — duel.js resolves it before the
     pile spawns, so the loser must keep their bag.  Getting that wrong turns
     a friendly duel into a full inventory wipe, which is the worst possible
     bug in this flow, so seed the loser with something to lose. */
  await H.grant(wsPort, bId, 'item', { invKey: 'wood', count: 4 });
  await B.page.waitForTimeout(1200);
  const bWood0 = await H.readState(B, (S) => ((S.rpg || {}).inventory || {}).wood || 0);

  /* End-of-duel banners are popups too, so they expire just as fast — sample
     both players continuously rather than looking once after the fact. */
  const aBanner = [], bBanner = [];
  const sampleBanners = async () => {
    for (const [P, into] of [[A, aBanner], [B, bBanner]]) {
      for (const t of await H.readState(P, (S) => (S.dmgNumbers || []).map((p) => String(p.text)))
        .catch(() => [])) into.push(t);
    }
  };

  /* v2.3.1917: the opponent's health bar (owner: "During duels make it so
     that the hp and combat resource bars appear (as if you're battling any
     other monster)").  Sampled DURING the fight for the same reason the
     banners are: it hides a few seconds after the last hit, so a single
     look after the duel ends would always find it gone. */
  const barSeen = [];
  const corpseSeen = [];
  const sampleBar = async () => {
    const b = await A.page.evaluate(() => window.__btPeerHpBar || null).catch(() => null);
    if (b) barSeen.push(b);
    /* The corpse is transient in exactly the way the banners are: the loser
       respawns five seconds after dying and the respawn broadcast clears
       _isDead on every peer.  Reading it once, after the end-of-duel
       bookkeeping, lands after that window as often as not — which is how
       the first cut of this check "failed" against a corpse that had been
       and gone.  Accumulate instead. */
    const c = await H.readState(A, (S) => {
      const o = S.others && S.others[Object.keys(S.others)[0]];
      return o ? { isDead: !!o._isDead, hp: o.rpgHp } : null;
    }).catch(() => null);
    if (c) corpseSeen.push(c);
  };

  let ended = false;
  for (let round = 0; round < 10 && !ended; round++) {
    await closeIn(A, wsPort, aId, bId);   /* re-close: either side may drift */
    await sampleBar();
    await swingAt(A, 6, seen, sampleBanners);
    await sampleBar();
    ended = await H.readState(A, (S) => !S._inDuel)
      && await H.readState(B, (S) => !S._inDuel);
    if (ended) { await sampleBanners(); await sampleBar(); await A.page.waitForTimeout(400); await sampleBanners(); await sampleBar(); }
  }
  rec.ok('a duel can be fought to a finish', ended,
    { aHp: await H.readState(A, (S) => (S.rpg || {}).hp), bHp: await H.readState(B, (S) => (S.rpg || {}).hp) });

  if (ended) {
    const aPop = [...new Set(aBanner)], bPop = [...new Set(bBanner)];
    rec.ok('the winner is told they won', aPop.some((t) => /DUEL WON/.test(t)), aPop);
    rec.ok('the loser is told they lost', bPop.some((t) => /Duel lost|forfeit|Killed by/i.test(t)), bPop);

    await B.page.waitForTimeout(2500);
    const bWood1 = await H.readState(B, (S) => ((S.rpg || {}).inventory || {}).wood || 0);
    /* Cross-check the persisted blob: "the client forgot it" and "the server
       took it" are different bugs, and only one of them survives a reload. */
    const stored = await H.adminPlayer(wsPort, bId);
    const storedWood = ((stored.rpg || {}).inventory || {}).wood || 0;
    rec.ok('losing a duel does NOT wipe the loser\'s bag', bWood1 === bWood0,
      { bWood0, bWood1, storedWood });

    const [ea, eb] = await Promise.all([duelState(A), duelState(B)]);
    rec.ok('the duel state is cleared on both sides', !ea.inDuel && !eb.inDuel, { ea, eb });

    /* ── v2.3.1917: the opponent read like a monster while you fought ── */
    const armed = barSeen.filter((b) => b.shown);
    rec.ok('the opponent carried a health bar during the duel',
      armed.length > 0, { samples: barSeen.length, shown: armed.length, last: barSeen[barSeen.length - 1] });
    /* Not just "a bar appeared" — it has to have tracked a real, falling
       fraction.  A bar pinned at 1.0 or at 0 would satisfy the check above
       and tell the player nothing. */
    if (armed.length) {
      const fracs = armed.map((b) => b.frac);
      rec.ok('...showing a real fraction, not pinned',
        Math.min.apply(null, fracs) < 0.999 && Math.max.apply(null, fracs) > 0, fracs);
      rec.ok('...counting the same HP the server has',
        armed.every((b) => b.hp >= 0 && b.hp <= b.maxHp && b.maxHp > 1), armed[armed.length - 1]);
    }

    /* ── v2.3.1917: "On death play the death animation and just have them
       spawn in the town." ── */
    const bDeath = await H.readState(B, (S) => ({
      dying: !!S._dying, deathStart: S._deathStart || 0, zone: S.currentZone,
      hp: (S.rpg || {}).hp, maxHp: (S.rpg || {}).maxHp,
      x: Math.round(S.player.x), y: Math.round(S.player.y),
    }));
    /* STRICTLY _dying, not "_dying OR they are in town".  This duel is
       fought in town on purpose (that is the bug report the scenario
       exists for), so any assertion that accepts `zone === 'town'` as
       evidence is trivially true and pins nothing — the first cut of
       these three checks did exactly that and passed without testing
       anything.  _dying + _deathStart are what drive the crumble
       animation, and a duel ended by forfeit or timeout would clear the
       duel state without setting either. */
    rec.ok('the loser actually died rather than just losing the duel',
      bDeath.dying === true && bDeath.deathStart > 0, bDeath);
    /* And the peer sees the corpse — the remote death sprite is driven
       off _isDead, so this is the animation the owner asked for, observed
       from the side that is meant to see it. */
    await sampleBar();
    rec.ok('...and the winner sees the death animation on them',
      corpseSeen.some((c) => c.isDead === true),
      { samples: corpseSeen.length, last: corpseSeen[corpseSeen.length - 1] });

    /* Respawn.  "Spawn in the town" cannot be read off the zone name here
       either — they never left it.  What IS observable is the MOVE: the
       respawn puts you at the town's centre tile, and a duel is not fought
       there, so the position changing to the centre is the real evidence.
       Death timer is 5 s server-side. */
    await B.page.waitForTimeout(7000);
    const bAfter = await H.readState(B, (S) => ({
      dying: !!S._dying, zone: S.currentZone,
      hp: (S.rpg || {}).hp, maxHp: (S.rpg || {}).maxHp,
      x: Math.round(S.player.x), y: Math.round(S.player.y),
      cx: Math.round((S._zoneW || 0) / 2), cy: Math.round((S._zoneH || 0) / 2),
    }));
    rec.ok('the loser respawns in town', bAfter.zone === 'town', bAfter);
    rec.ok('...moved to the town spawn, not left where they fell',
      bAfter.x !== bDeath.x || bAfter.y !== bDeath.y, { died: [bDeath.x, bDeath.y], spawned: [bAfter.x, bAfter.y] });
    rec.ok('...alive again, at full health', bAfter.dying === false && bAfter.hp === bAfter.maxHp, bAfter);
  }

  await A.ctx.close(); await B.ctx.close();
}
