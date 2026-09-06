/* ═══ DOES A PEER WEAR THEIR CLOTHES WHILE COOKING AND CHOPPING? (v2.3.2303) ═══
 *
 * Owner (#47): "make sure that other players (and you) have all of their
 * animations, worn items, etc. broadcasted to everyone so it's visible.
 * Sometimes I catch items missing on other characters during certain
 * animations that don't appear missing on your own screen."
 * Owner (#29): "Make sure cooking animation works correctly with gear and
 * traits showing."
 *
 * Both are the same defect. The remote gathering stand-in composited gear
 * behind `if (code === 'fire')`, so a peer COOKING or CHOPPING was drawn
 * bare-chested while their own client drew shirt, plate and greaves. Head
 * traits followed them the whole time (that call sits outside the gate), which
 * is why the owner saw a correctly-headed, correctly-caped, undressed cook.
 *
 * WHY THIS IS A SEPARATE FILE FROM mp-firepeer:
 * firepeer proves the FIRE pose draws its gear and photographs it. It passes
 * today and would keep passing with cook and chop broken -- it never enters
 * either state. That is exactly the blind spot this repo keeps shipping.
 *
 * WHY `hasTex` AND NOT JUST `visible`:
 * a recoloured set (copperplate) resolves to its donor art, and a loader that
 * builds a URL from the raw equip id 404s SILENTLY and draws nothing -- while a
 * tint applied to that empty sprite still reports the right colour. That is the
 * v2.3.1772 trap, where a passing test measured colour on an invisible strip.
 */
import * as H from './harness.mjs';

const look = (P, id) => P.page.evaluate((pid) => {
  const R = window._pixiRenderer;
  const S = window._gameState && window._gameState.current;
  const o = S && S.others ? S.others[pid] : null;
  return {
    probe: (R && R.remoteSkillProbe) ? R.remoteSkillProbe(pid) : 'no-probe',
    ex: o ? (o._ex || null) : null,
    seen: !!o,
  };
}, id);

/* Drive the peer into a gathering state and sample the watcher until the relay
   lands. An early single sample reads before the peer's _ex has crossed the
   wire and would fail open. */
async function sampleWhile(A, bId, code, tries = 26) {
  let best = null;
  for (let i = 0; i < tries; i++) {
    await A.page.waitForTimeout(110);
    const s = await look(A, bId);
    if (s.ex === code && s.probe && s.probe !== 'no-probe' && s.probe.code === code) {
      if (!best || (s.probe.gear && !best.probe.gear)) best = s;
      if (best && best.probe.gear) break;
    }
  }
  return best;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Cook' });
  const bId = await H.readState(B, (S) => S.myId);
  await H.waitMutualSight(A, B);

  /* Dress the peer. __btSetGear is the client's own equip seam (gearCatalog),
     so this is the same path the equip screen drives -- and the ids reach the
     watcher over the wire as eqc/eql/eqst exactly as they would in play. */
  await B.page.evaluate(() => {
    if (window.__btSetGear) {
      window.__btSetGear('chest', 'steelplate');
      window.__btSetGear('legs', 'steelgreaves');
      window.__btSetGear('shirt', 'tshirt');
    }
    const S = window._gameState && window._gameState.current;
    if (S && S.player) S.player.x += 70;   /* stand clear of the watcher */
  });
  /* ═══ WHY THIS HELPER EXISTS ═══
     The game tick cancels _extraction on the very next frame unless it points
     at a LIVE node it can still reach (BroTown.jsx: `if (!_exNode ||
     !_exNode.alive) S._extraction = null`). The first cut of this test wrote
     the state object directly and watched it vanish before the relay ran --
     the watcher simply never saw an `ex`, and the failure looked like a
     rendering bug rather than a fixture bug. So: park a live node on the
     player and hold the extraction in 'waiting' with a far-future window. */
  await B.page.evaluate(() => {
    window.__qaHarvest = (skill) => {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.player) return false;
      if (!Array.isArray(S.gatherNodes)) S.gatherNodes = [];
      const node = {
        id: 'qa_node_' + skill,
        nodeType: skill === 'woodcutting' ? 'tree' : (skill === 'mining' ? 'rock' : 'fire'),
        x: S.player.x, y: S.player.y, alive: true, hp: 999, maxHp: 999, r: 40,
      };
      S.gatherNodes = S.gatherNodes.filter((n) => n && !String(n.id || '').startsWith('qa_node_'));
      S.gatherNodes.push(node);
      S._campfire = skill === 'cooking' ? node : null;
      S._extraction = {
        skill, status: 'waiting', nodeRef: node, nodeId: node.id,
        startedAt: Date.now(), windowOpensAt: Date.now() + 600000,
      };
      return true;
    };
  });
  await A.page.waitForTimeout(1800);

  const dressed = await A.page.evaluate((pid) => {
    const S = window._gameState && window._gameState.current;
    const o = S && S.others ? S.others[pid] : null;
    return o ? (o.equip || null) : null;
  }, bId);
  rec.ok('positive control: the watcher knows the peer is wearing armour',
    !!dressed && dressed.chest === 'steelplate' && dressed.legs === 'steelgreaves', dressed);

  /* ── COOKING ── */
  await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return;
    window.__qaHarvest('cooking');
  });
  const cook = await sampleWhile(A, bId, 'cook');
  rec.ok('the watcher sees the peer enter the cooking animation', !!cook, cook);
  if (cook) {
    const g = cook.probe.gear;
    rec.ok('a cooking peer is DRAWN wearing their chest plate',
      !!g && g.chest.visible && g.chest.hasTex, g);
    rec.ok('...and their greaves', !!g && g.legs.visible && g.legs.hasTex, g);
    /* The shirt is hidden UNDER a chest plate by the shared shirt rule
       (_placeSwingShirt), so "visible" is the wrong assertion for it -- the
       honest one is that the sprite resolved art at all. */
    rec.ok('...and the shirt layer resolved its art (hidden under the plate, by rule)',
      !!g && g.shirt.hasTex, g);
    rec.ok('...and the stand-in is still actually on screen (a peer that fails '
      + 'to draw VANISHES, it does not degrade)', !!cook.probe.visible, cook.probe);
  }

  /* ── CHOPPING ── */
  await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return;
    window.__qaHarvest('woodcutting');
  });
  const chop = await sampleWhile(A, bId, 'chop');
  rec.ok('the watcher sees the peer enter the chopping animation', !!chop, chop);
  if (chop) {
    const g = chop.probe.gear;
    rec.ok('a chopping peer is DRAWN wearing their chest plate',
      !!g && g.chest.visible && g.chest.hasTex, g);
    rec.ok('...and their greaves', !!g && g.legs.visible && g.legs.hasTex, g);
    /* The chop strip is 12 frames while the BODY index runs 12..23 (the row
       carries `from: 12`). Handing the body index to the gear loader clamps it
       and freezes the armour on its last frame for the whole swing. The frame
       index being inside the strip is what says the split was kept. */
    /* Asserting on `frame` alone would be VACUOUS here: the body index is
       12..23 whatever gets handed to the gear loader. `gearIx` is the number
       actually passed, and 0..11 is the only range that means the split was
       kept. */
    rec.ok('...and the gear indexes its own 12-frame strip, not the body\'s 12..23',
      chop.probe.base === 12 && typeof chop.probe.gearIx === 'number'
        && chop.probe.gearIx >= 0 && chop.probe.gearIx <= 11
        && chop.probe.gearIx === chop.probe.frame - 12,
      { frame: chop.probe.frame, base: chop.probe.base, gearIx: chop.probe.gearIx });
    rec.ok('...and the chopper is still on screen', !!chop.probe.visible, chop.probe);
  }

  /* ══ v2.3.2304: THE SLUNG SHIELD'S GATE WAS DEAD ══
     It tested other._extraction / other._firemaking, neither of which is
     written ANYWHERE in the tree -- both were always undefined, so the gate
     never fired and a peer wore their shield on their back through every
     harvest.
     TESTED ON MINING, NOT COOKING, and that distinction is the whole reason
     the first cut of this assertion was vacuous: cook/chop/fire hide the
     peer's entire container anyway, so the shield block never runs and the
     probe writes nothing -- an assertion phrased as "no shield" then passes
     against the broken build for the wrong reason. Mining leaves the body up,
     so it is the state where this gate is the only thing holding the line. */
  await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.rpg) S.rpg.shield = { name: 'Pine Shield', type: 'shield', gearBase: 'pine' };
    if (S) S._extraction = null;
  });
  /* Two full presence cycles: the shield rides the ~2s broadcast, not the
     high-rate position packet. 1.5s was not enough and the positive control
     said so. */
  await A.page.waitForTimeout(4200);
  const shieldIdle = await A.page.evaluate((pid) => (window.__btPeerShield || {})[pid] || null, bId);
  rec.ok('positive control: an idle peer with a shield DOES wear it slung',
    !!shieldIdle && shieldIdle.hasShield && shieldIdle.on, shieldIdle);

  await B.page.evaluate(() => { window.__qaHarvest('mining'); });
  await A.page.waitForTimeout(2600);
  const shieldMining = await A.page.evaluate((pid) => (window.__btPeerShield || {})[pid] || null, bId);
  rec.ok('...and takes it off to mine', !!shieldMining && shieldMining.hasShield && !shieldMining.on,
    shieldMining);

  /* ══ v2.3.2304: THE JOIN-FRAME COSMETIC HOLE ══
     state_sync built its peer literal by hand and Object.assigned only the
     RENAMED wire keys, so every same-named cosmetic (rpgData, cape, wpnType,
     ...) was discarded and did not arrive until the first ~2s relay. Three of
     them are read by the renderer immediately, so a peer already in the room
     appeared for up to two seconds with no cape, no slung shield and the wrong
     weapon.

     CATCHING IT NEEDS A PRE-LOAD HOOK, and the first cut of this assertion was
     vacuous without one: polling after enterWorld() resolves is far too late --
     relays have already landed by then, so the field is present either way. An
     init script runs before the bundle, so its 10ms poll catches the very
     first frame in which the peer exists at all, which IS the state_sync
     frame. B already has a shield equipped from the block above, so rpgData is
     the field under test. */
  const C = await H.newPlayer(browser, {
    name: 'Latecomer', wsPort, webPort, guest: true,
    init: () => {
      window.__firstPeer = null;
      const _t = setInterval(() => {
        const S = window._gameState && window._gameState.current;
        const ids = (S && S.others) ? Object.keys(S.others) : [];
        if (!ids.length) return;
        const o = S.others[ids[0]];
        window.__firstPeer = {
          id: ids[0],
          hasRpgData: !!o.rpgData,
          hasShield: !!(o.rpgData && o.rpgData.shield),
        };
        clearInterval(_t);
      }, 10);
    },
  });
  await H.enterWorld(C);
  const firstPeer = await C.page.evaluate(() => window.__firstPeer || null);
  rec.ok('a peer already in the room arrives WITH their rpgData on the very '
    + 'first frame they exist, not two seconds later',
    !!firstPeer && firstPeer.hasRpgData, firstPeer);
  await C.ctx.close();

  /* v2.3.2303: and a picture, because the numbers above cannot see the failure
     mode that matters most. entityRenderer HIDES the peer's whole body
     container while a stand-in is active, so a stand-in that fails to draw
     does not degrade to a standing character -- the other player VANISHES.
     Shoot the watcher's screen, framed on the peer. */
  await B.page.evaluate(() => { window.__qaHarvest('cooking'); });
  await A.page.waitForTimeout(900);
  const box = await A.page.evaluate((pid) => {
    const S = window._gameState && window._gameState.current;
    const o = S && S.others ? S.others[pid] : null;
    const c = document.querySelector('canvas');
    if (!o || !c || !S.camera) return null;
    const r = c.getBoundingClientRect();
    const sx = r.left + (((o.renderX != null ? o.renderX : o.x) || 0) - S.camera.x) * (S._worldScaleX || 1);
    const sy = r.top + (((o.renderY != null ? o.renderY : o.y) || 0) - S.camera.y) * (S._worldScaleY || 1);
    const W = 190, Hh = 200;
    const x = Math.round(Math.min(Math.max(0, sx - W / 2), innerWidth - W));
    const y = Math.round(Math.min(Math.max(0, sy - Hh + 45), innerHeight - Hh));
    return { x, y, width: W, height: Hh };
  }, bId);
  if (box) {
    await A.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/cookpeer-dressed.png`, clip: box }).catch(() => {});
    console.log('    picture: out/cookpeer-dressed.png (the watcher\'s view of a dressed cook)');
  }

  await A.ctx.close(); await B.ctx.close();
}
