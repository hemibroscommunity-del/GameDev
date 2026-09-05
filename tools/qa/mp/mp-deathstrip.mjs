/* NOTHING BUT THE DEATH ANIMATION (v2.3.2281)
 *
 * Owner: "Sometimes the death animation still shows character wearing items as
 * it dies (like frozen in place). I think the cape does this. Maybe other items
 * too. Make sure during death animation only that plays and character doesn't
 * have any items frozen in place around it."
 *
 * ── WHY THIS IS NOT mp-deathshield ──
 * mp-deathshield answers the same-sounding question and cannot answer this one.
 * It enumerates the CHILDREN OF THE PLAYER DISPLAY, which is exactly the set
 * the death path already sweeps by exception (v2.3.1887).  A layer drawn for
 * the player from anywhere ELSE in the scene graph -- the gathering and attack
 * stand-ins and their trait sprites live in the effects renderer's own layers,
 * not under the display -- is outside both the sweep and that test, so the two
 * of them would agree the corpse was clean while the screen showed a floating
 * cape.  "Maybe other items too" is precisely the case a hide-list, and a test
 * shaped like one, cannot cover.
 *
 * So this asks from the SCREEN's side: walk the whole stage, take every
 * visible textured node whose bounds land on the corpse, and name it by its
 * texture URL.  Whatever container it came from, if it is painted on the
 * corpse it is in the answer.
 *
 * ── AND IT DIES THREE WAYS ──
 * Standing, mid-swing, and mid-harvest, because the stand-ins only exist in
 * the last two and they are the ones outside the sweep.  You die while doing
 * something far more often than you die standing still.
 */
import * as H from './harness.mjs';

/* What may legitimately still be drawn on a corpse: the death sheet itself,
   and the world it is lying on.  Everything else near the body is a worn
   layer that outlived it. */
const ALLOWED = [
  /death-v1/,                      /* the corpse animation -- the point */
  /\/maps\//, /tiles/, /tileset/,  /* the ground */
  /grass|dirt|stone|water|road|path/i,
  /* The floating vitals are a DELIBERATE keep (v2.3.1887's keep set names
     them): the bar reads empty over the corpse, which is information, not a
     worn item left hanging.  Allowed by name rather than by dropping the whole
     /ui/ tree, so a genuine UI-art layer landing on the corpse still fails. */
  /\/ui\/bars\/hp-(frame|full|empty)/,
  /* A burst already IN FLIGHT when you died is a world particle, not a worn
     layer left hanging: the chips were thrown by the last swing that landed,
     and they fade in a few hundred ms on their own.  What matters is that no
     NEW ones are queued once the corpse is up, which the chopper's own gate
     now guarantees by never reaching the push. */
  /effects\/woodchips-burst/,
];
const _allowed = (label) => ALLOWED.some((re) => re.test(label));

/* ═══ SOMEONE ELSE WALKING PAST IS NOT A WORN ITEM ═══
   Town has wandering NPCs, and one of them strolled through the 70px box on a
   later run and reported Lil Bro as gear left on the corpse.  Excluded by
   ANCESTRY as well as by art path: each NPC gets its own labelled container
   (`npc_lil_bro`), which also catches a baked recolour whose texture has no
   URL to match on.  It cannot hide the defect: every stand-in this file is
   about is drawn into the effects renderer's nodeLayer / gestureLayer. */
const _isNpc = (n) => (n.path || []).some((p) => /^npc_/.test(p))
  || /\/sprites\/npc\//.test(n.label);
const _leftovers = (list) => (list || []).filter((n) => !_isNpc(n) && !_allowed(n.label));

/* On the WATCHER's screen `localPlayer` is a bystander -- their own living,
   correctly dressed character, standing where the corpse is because both
   players join on the same tile.  On the DYING player's own screen it is the
   subject, and half the defect lives under it, so this exclusion is strictly
   the watcher's and the two filters must not be merged (they were, once: the
   "there is something to strip" guard promptly went red, because the worn art
   it looks for is under `localPlayer`). */
const _peerLeftovers = (list) => _leftovers(list)
  .filter((n) => !(n.path || []).includes('localPlayer'));

/* Everything visible ON the character, alive or dead, named by art file.
   Absolute centres come back from a (0,0) origin with an unbounded radius and
   are re-filtered around the BODY SPRITE's own centre -- so there is no camera
   arithmetic in this file and nothing to drift when the zoom changes, and the
   same reading works in both states (the body sprite is the corpse sheet once
   you are dead). */
const nearBody = (P) => P.page.evaluate(() => {
  if (!window.__btCorpse) return { probe: false };
  const r = window._pixiRenderer;
  const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
  const sb = pd && pd._spriteBody;
  let ox = null, oy = null;
  if (sb) { const b = sb.getBounds(); ox = b.x + b.width / 2; oy = b.y + b.height / 2; }
  const all = window.__btCorpse(0, 0, 1e9);
  const corpse = all.find((n) => /death-v1/.test(n.label));
  /* Fall back to the corpse frame's own centre when the body sprite is not
     reachable, so a probe failure cannot masquerade as a clean corpse. */
  if (ox == null && corpse) { ox = corpse.dx; oy = corpse.dy; }
  if (ox == null) return { probe: true, origin: null, corpse: null, near: [], all: all.length };
  const near = all.filter((n) => n !== corpse
    && Math.abs(n.dx - ox) <= 70 && Math.abs(n.dy - oy) <= 70);
  return { probe: true, origin: true, corpse, near, all: all.length };
});

const die = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  S.rpg.hp = 0; S._dying = true; S._deathStart = Date.now();
});
const revive = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  S.rpg.hp = S.rpg.maxHp || 50; S._dying = false; S._deathStart = 0;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Corpse', wsPort, webPort,
    init: () => { try { localStorage.setItem('bt_cape', 'crimson'); } catch (e) {} },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* The cape is the server's to give -- seeding bt_cape alone leaves the
     character bare.  Same path mp-cape / mp-capeattack walk. */
  const pid = await H.readState(P, (S) => S.myId);
  rec.ok('the player has an id to grant against (guard)', !!pid, { pid });
  await H.grant(wsPort, pid, 'item', { invKey: 'goldticket_crimson', count: 1 }).catch(() => null);
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'cape_redeem',
      payload: { invKey: 'goldticket_crimson', opId: 'mp-deathstrip-' + Date.now() } });
  });
  await P.page.waitForTimeout(2200);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'cape_equip', payload: { worn: true } });
  });
  await P.page.waitForTimeout(1500);

  /* Gear on every slot the body can wear, plus an axe, so the corpse has
     something to still be wearing on each of them. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.weapon = { type: 'sword', name: 'Copper Sword', gearBase: 'copper', dmg: 3 };
    S.rpg.shield = { name: 'Pine Shield', type: 'shield' };
    S.rpg.activeSlot = 'melee';
    S.rpg.gear = S.rpg.gear || {};
    S.rpg.gear.chest = { name: 'Copper Chestplate', gearBase: 'copper', slot: 'chest' };
    S.rpg.gear.legs = { name: 'Copper Greaves', gearBase: 'copper', slot: 'legs' };
  });
  await P.page.keyboard.down('s'); await P.page.waitForTimeout(300);
  await P.page.keyboard.up('s'); await P.page.waitForTimeout(1200);

  const alive = await nearBody(P);
  rec.ok('the corpse probe exists and can find the body (guard)',
    alive.probe === true && alive.origin === true, { probe: alive.probe, origin: alive.origin });
  /* THE GUARD THAT MAKES THE REST MEAN ANYTHING.  Every assertion below is an
     absence, and an absence is free if there was never anything there: a
     character wearing nothing passes "a corpse wears nothing" perfectly.  So
     the living frame has to be shown carrying worn art first. */
  const wornAlive = _leftovers(alive.near);
  rec.ok('the living character is carrying worn art, so an empty corpse is not '
    + 'free (guard)', wornAlive.length > 0, wornAlive.map((n) => n.label).slice(0, 8));
  const capeAlive = await P.page.evaluate(() => {
    const r = window._pixiRenderer;
    const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
    const b = pd && pd._capeBackSprite, f = pd && pd._capeSprite;
    return { back: !!(b && b.visible), front: !!(f && f.visible) };
  }).catch(() => null);
  rec.ok('the character is wearing the cape while alive, so there is something '
    + 'to strip (guard)', !!(capeAlive && (capeAlive.back || capeAlive.front)), capeAlive);

  /* ── 1. dying while standing ── */
  await die(P);
  await P.page.waitForTimeout(700);
  const standing = await nearBody(P);
  rec.ok('the death animation is playing (guard)', !!standing.corpse, standing.corpse);
  const sBad = _leftovers(standing.near);
  rec.ok('a corpse that died standing wears nothing',
    sBad.length === 0, sBad.slice(0, 8));
  await revive(P);
  await P.page.waitForTimeout(1400);

  /* ── 2. dying mid-swing ── */
  /* The attack stand-in is a whole second figure, drawn from the effects
     renderer's layers with its own copies of the gear and the cape. */
  /* ARMED AND KILLED FROM INSIDE THE PAGE.  The swing window is ~300ms, which
     is shorter than a round trip from node: arming it here and dying in a
     second evaluate lands the death after the swing has already ended, and the
     case silently degrades to "died standing".  Same reason mp-capeattack
     re-arms from a rAF loop. */
  const swingUp = await P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState.current;
    S._facingAngle = 0; S._aimAngle = 0; S._mouseAimAngle = 0;
    S.lockedTarget = null;
    if (S.player) { S.player.vx = 0; S.player.vy = 0; }
    S.isSwinging = true; S.swingTimer = Date.now(); S._swingAng = 0;
    setTimeout(() => {
      const t = window.__btSwingTints ? window.__btSwingTints() : null;
      const seen = { tints: !!t, any: !!(t && Object.keys(t).length) };
      /* die WITH the swing still latched -- what "frozen in place" describes */
      S.rpg.hp = 0; S._dying = true; S._deathStart = Date.now();
      res(seen);
    }, 130);
  }));
  /* Proof the stand-in was actually up at the moment of death.  Without it,
     "died mid-swing" is just "died", and this case would pass for the wrong
     reason forever. */
  rec.ok('the swing stand-in is on screen at the moment of death (guard)',
    swingUp.any === true, swingUp);
  await P.page.waitForTimeout(500);
  const swinging = await nearBody(P);
  const wBad = _leftovers(swinging.near);
  rec.ok('...and neither does one that died mid-swing',
    !!swinging.corpse && wBad.length === 0, { corpse: !!swinging.corpse, bad: wBad.slice(0, 8) });
  await revive(P);
  await P.page.waitForTimeout(1400);

  /* ── 3. dying mid-harvest ── */
  /* The gathering stand-in replaces the body outright and HIDES the display
     container, which is the one case where the death path's own sweep has
     nothing left to sweep. */
  /* The chopper is gated on a status of 'waiting'/'ready' AND a live node
     (_updateExtractionCue), so a bare `_extraction = {skill}` draws nothing --
     which is exactly how the first cut of this case passed while measuring a
     character standing still.  nodeRef is the shipped path for a node with no
     id (v2.3.253), so this needs no server-side tree. */
  const chopUp = await P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState.current;
    const px = (S.player && S.player.x) || 0, py = (S.player && S.player.y) || 0;
    S._extraction = {
      skill: 'woodcutting', status: 'waiting', startedAt: Date.now(),
      nodeRef: { alive: true, x: px + 44, y: py, type: 'tree', tier: 1, hp: 5 },
    };
    setTimeout(() => {
      const f = window.__btChopFigure ? window.__btChopFigure() : null;
      const r = window._pixiRenderer;
      const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
      const seen = { fig: f, displayHidden: !!(pd && pd.visible === false) };
      S.rpg.hp = 0; S._dying = true; S._deathStart = Date.now();
      res(seen);
    }, 450);
  }));
  /* The gathering stand-in REPLACES the body: it hides the display container
     outright, which is the one case where the death path's own by-exception
     sweep has nothing left in front of it to sweep. */
  rec.ok('the harvest stand-in is on screen at the moment of death (guard)',
    !!(chopUp.fig && chopUp.fig.visible), chopUp);
  await P.page.waitForTimeout(600);
  const harvest = await nearBody(P);
  const hBad = _leftovers(harvest.near);
  rec.ok('...nor one that died mid-harvest',
    !!harvest.corpse && hBad.length === 0, { corpse: !!harvest.corpse, bad: hBad.slice(0, 8) });

  /* ═══ THE OTHER HALF: WHAT A PEER'S CORPSE LOOKS LIKE FROM OUTSIDE ═══
     Owner, separately: "make sure that other players (and you) have all of
     their animations, worn items, etc. broadcasted to everyone so it's
     visible."  The stand-ins have TWO implementations -- yours and the pooled
     remote ones -- and they did not agree about death: the remote HARVEST
     figure has skipped dead peers since it was written, the remote SWING and
     BOW figures never did.  So the fix above, on your own screen, would leave
     everyone ELSE still watching a corpse in a cape mid-swing.
     Driven from the watcher's screen, which is the only place the difference
     exists. */
  const W = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort });
  await H.enterWorld(W);
  await W.page.waitForTimeout(2500);
  await revive(P);
  await P.page.waitForTimeout(1500);

  const pidSeen = await W.page.evaluate((id) => {
    const S = window._gameState.current;
    return !!(S && S.others && S.others[id]);
  }, pid);
  rec.ok('the watcher can see the other player at all (guard)', pidSeen, { pid, pidSeen });

  /* ═══ SAMPLE EVERY FRAME, NOT ONCE ═══
     The remote swing stand-in expires on its own after SWORD_SWING_MS (~300ms),
     so a single read taken a second after the death finds a clean corpse
     whether or not the gate exists -- which is exactly what the first cut of
     this did, and it passed with the fix reverted.  The defect is a real but
     BRIEF one: the ~170ms between the death landing and the swing window
     closing, during which the watcher draws a cape, a hood and a swing shirt
     on a corpse.  So the watcher records every frame for 700ms and keeps the
     worst one that had a corpse in it. */
  await W.page.evaluate(() => {
    window.__dsWorst = null; window.__dsFrames = 0; window.__dsCorpseFrames = 0;
    const t0 = Date.now();
    const tick = () => {
      window.__dsFrames++;
      if (window.__btCorpse) {
        const all = window.__btCorpse(0, 0, 1e9);
        const corpse = all.find((n) => /death-v1/.test(n.label));
        if (corpse) {
          window.__dsCorpseFrames++;
          const near = all.filter((n) => n !== corpse
            && Math.abs(n.dx - corpse.dx) <= 70 && Math.abs(n.dy - corpse.dy) <= 70);
          if (!window.__dsWorst || near.length > window.__dsWorst.length) window.__dsWorst = near;
        }
      }
      if (Date.now() - t0 < 700) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* Swing, then die, both from inside the dying player's page so the death
     lands inside the ~300ms swing window. */
  await P.page.evaluate(() => new Promise((res) => {
    const S = window._gameState.current;
    S._facingAngle = 0; S._aimAngle = 0; S.lockedTarget = null;
    if (S.player) { S.player.vx = 0; S.player.vy = 0; }
    S.isSwinging = true; S.swingTimer = Date.now(); S._swingAng = 0;
    /* THE WATCHER ONLY KNOWS ABOUT A SWING IT WAS TOLD ABOUT.  `isSwinging` is
       local; the peer stand-in is driven by `_swingTs`, which gameEvents sets
       from a `player_swing` broadcast.  Without this the watcher had no swing
       to draw at all, and the peer assertion passed with the fix reverted --
       which is how it was caught. */
    try {
      S.channel.send({ type: 'broadcast', event: 'player_swing',
        payload: { id: S.myId, ang: 0, wpn: 'sword' } });
    } catch (e) { /* the corpse guard reports it */ }
    setTimeout(() => {
      S.rpg.hp = 0; S._dying = true; S._deathStart = Date.now();
      /* THE BROADCAST IS THE POINT ON THIS HALF.  A peer's corpse only exists
         on the watcher's screen because `player_died_to_monster` set
         `_isDead` there (gameEvents.js); setting hp locally is invisible to
         everyone else, and without this the watcher sees a healthy player and
         the whole phase measures nothing.  Same message and shape the real
         death path sends (BroTown.jsx / monsterCombat.js). */
      try {
        S.channel.send({ type: 'broadcast', event: 'player_died_to_monster',
          payload: { id: S.myId, x: S.player.x, y: S.player.y } });
      } catch (e) { /* the guard below reports it */ }
      res(true);
    }, 130);
  }));
  await W.page.waitForTimeout(1100);

  /* The worst frame the sampler saw, around the corpse itself.  The watcher is
     alive, so the one death frame on their screen IS the peer -- no
     world-to-screen arithmetic and no peer-display handle needed. */
  const peerNear = await W.page.evaluate(() => ({
    probe: !!window.__btCorpse,
    corpse: window.__dsCorpseFrames > 0,
    frames: window.__dsFrames, corpseFrames: window.__dsCorpseFrames,
    near: window.__dsWorst || [],
  }));
  rec.ok("the peer's death animation is drawn on the watcher's screen (guard)",
    peerNear.corpse === true && peerNear.corpseFrames >= 3, peerNear);
  const pBad = _peerLeftovers(peerNear.near);
  rec.ok('a peer who died mid-swing is not left wearing anything on the '
    + "watcher's screen either", peerNear.corpse === true && pBad.length === 0,
    pBad.slice(0, 8));
  console.log('    peer swing: ' + JSON.stringify(pBad.map((n) => n.label + ' @' + (n.path || []).join('/') + ' ' + n.w + 'x' + n.h)));

  console.log('    standing: ' + JSON.stringify(sBad.map((n) => n.label)));
  console.log('    swing:    ' + JSON.stringify(wBad.map((n) => n.label)));
  console.log('    harvest:  ' + JSON.stringify(hBad.map((n) => n.label)));
}
