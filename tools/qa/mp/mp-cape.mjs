/* THE CAPE IS ON THE PLAYER, AND OFF HIM DURING A SWING (v2.3.2023).
 *
 * The cape is five stills registered into full 256 frames against the real
 * body (tools/import_cape_green.py), so its transform is the BODY SPRITE'S
 * transform and there is no anchor to get wrong.  That is exactly why this
 * file checks the transform rather than a screenshot: if the two ever stop
 * agreeing, the cape drifts off the character and every pixel test still
 * passes because the cape is drawn perfectly, somewhere else.
 *
 * WHY THE CAPE IS DRIVEN THROUGH localStorage.  These scenarios serve dist/,
 * a built bundle with no module URLs to import (the same limit
 * qa-hairmask-look.mjs documents), so the catalog cannot be called directly.
 * It reads `bt_cape` at module init, so setting the key and reloading is the
 * supported route in, not a trick.
 *
 * THE SWING ASSERTION IS THE ONE THAT MATTERS.  During an attack the real body
 * is hidden and the figure is redrawn by a stand-in in another layer while
 * `pose` still reads 'stand' — which is how the back shield ended up hanging
 * in the air beside a swing (v2.3.1784).  v1 hides the cape instead of drawing
 * it twice.  If that gate ever breaks, this is what says so.
 */
import * as H from './harness.mjs';

const raw = (P) => P.page.evaluate(() => {
  const r = window._pixiRenderer;
  const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
  if (!pd) return null;
  const c = pd._capeSprite, b = pd._spriteBody;
  return {
    /* EFFECTIVE size, not raw scale.  The body draws from a DOWNSCALED display
       texture and the cape from a raw 256 PNG, so their scale NUMBERS differ by
       exactly that factor while the drawn sizes agree — measured 0.4476 against
       0.8952, both landing on 114.6px.  Comparing the numbers would fail on a
       correct build, which is the wrong way round for a test. */
    pose: pd._animPose || null,
    /* CENTRES, not raw x/y.  v2.3.2024 moved the cape's anchor to the
       shoulders so it can pivot there while running, which means its `y` is no
       longer its middle.  Comparing raw y would fail on a correct build — the
       same trap as comparing raw scale when the two sprites draw from
       differently-sized textures.  centre = pos + (0.5 - anchor) * drawn. */
    cape: c ? { visible: !!c.visible, tex: !!(c.texture && c.texture.frame),
                x: Math.round(c.x + (0.5 - c.anchor.x) * Math.abs(c.scale.x * ((c.texture && c.texture.frame && c.texture.frame.width) || 0))),
                y: Math.round(c.y + (0.5 - c.anchor.y) * Math.abs(c.scale.y * ((c.texture && c.texture.frame && c.texture.frame.height) || 0))),
                rot: +Number(c.rotation || 0).toFixed(3),
                w: +Math.abs(Number(c.scale.x) * ((c.texture && c.texture.frame && c.texture.frame.width) || 0)).toFixed(2),
                h: +Math.abs(Number(c.scale.y) * ((c.texture && c.texture.frame && c.texture.frame.height) || 0)).toFixed(2),
                mirror: Number(c.scale.x) < 0 } : null,
    body: b ? { visible: !!b.visible,
                x: Math.round(b.x + (0.5 - b.anchor.x) * Math.abs(b.scale.x * ((b.texture && b.texture.frame && b.texture.frame.width) || 0))),
                y: Math.round(b.y + (0.5 - b.anchor.y) * Math.abs(b.scale.y * ((b.texture && b.texture.frame && b.texture.frame.height) || 0))),
                w: +Math.abs(Number(b.scale.x) * ((b.texture && b.texture.frame && b.texture.frame.width) || 0)).toFixed(2),
                h: +Math.abs(Number(b.scale.y) * ((b.texture && b.texture.frame && b.texture.frame.height) || 0)).toFixed(2),
                mirror: Number(b.scale.x) < 0 } : null,
  };
});


/* ═══ v2.3.2129: THE POSES THAT DRAW A REAL BODY ═══
 * Owner: "Add it to all the animations as well" -> "yes do the free 8".
 *
 * Five, not eight -- chop, cook and fire replace the whole figure with a
 * stand-in sprite and hide the body container, so they were never free and
 * stay hidden along with swing and bowshot (entityRenderer _CAPE_HIDDEN_POSES).
 *
 * Each is reached by setting the SAME state flag the game itself sets
 * (entityRenderer's `pose` ladder reads exactly these), rather than by trying
 * to arrange a monster, a loot drop and an ore vein in one run. The flag is
 * the input to the thing under test; staging the world around it would test
 * the world.
 */
const POSES = [
  { tag: 'hit', label: 'taking a hit',
    set: () => { const S = window._gameState.current; S._hitFlash = Date.now(); } },
  { tag: 'pickup', label: 'bending for loot',
    set: () => { const S = window._gameState.current; S._lootFreezeUntil = Date.now() + 4000; } },
  /* mine/fish need a NODE, not just a skill name: the extraction tick drops
     `_extraction` on the very next frame if its nodeRef is missing or dead
     (BroTown.jsx ~5020), which is why a bare { skill } reached neither pose.
     A node standing at the player's own feet satisfies both that and the
     walk-away reach test. */
  { tag: 'mine', label: 'mining',
    set: () => {
      const S = window._gameState.current;
      const P2 = S.player;
      S._extraction = { skill: 'mining', nodeId: 'qa-node', status: 'waiting',
        nodeRef: { id: 'qa-node', alive: true, type: 'oreVein', x: P2.x, y: P2.y, r: 20 },
        startedAt: Date.now(), windowOpensAt: Date.now() + 600000,
        windowClosesAt: Date.now() + 900000, swipeSamples: [] };
    } },
  { tag: 'fish', label: 'fishing',
    set: () => {
      const S = window._gameState.current;
      const P2 = S.player;
      S._extraction = { skill: 'fishing', nodeId: 'qa-node', status: 'waiting',
        nodeRef: { id: 'qa-node', alive: true, type: 'fishSpot', x: P2.x, y: P2.y, r: 20 },
        startedAt: Date.now(), windowOpensAt: Date.now() + 600000,
        windowClosesAt: Date.now() + 900000, swipeSamples: [] };
    } },
  { tag: 'dodge', label: 'dodge roll',
    set: () => { const S = window._gameState.current; S._dodgeRoll = { angle: 0, startTime: Date.now() }; } },
];

/* Walk WEST before shooting.  The tilt sweep holds 'd' through five passes and
   runs the character into the town's eastern edge -- and the camera clamps at
   a map edge, so he ends up pinned against the right of the viewport with the
   space a cape hangs into off-screen.  Every preview came back half black
   before this, which reads as a broken crop rather than as a character
   standing in the wrong place. */
async function _recentre(P, at) {
  if (at) {
    /* Second pass: stand exactly where the first one did.  The two rows of the
       preview are read side by side, and a character photographed against a
       different patch of town in each row makes the comparison harder for no
       reason -- the difference the picture is FOR is the cape. */
    await P.page.evaluate((a) => {
      const S = window._gameState.current;
      if (S && S.player) { S.player.x = a.x; S.player.y = a.y; }
    }, at);
    await P.page.waitForTimeout(800);
  } else {
    await P.page.keyboard.down('a');
    await P.page.waitForTimeout(2200);
    await P.page.keyboard.up('a');
    await P.page.waitForTimeout(700);
  }
  return P.page.evaluate(() => {
    const S = window._gameState.current;
    return S && S.player ? { x: S.player.x, y: S.player.y } : null;
  });
}

/* Photograph every pose once, into `prefix`.  Returns one record per pose it
   actually reached, carrying the frame path and the character's drawn position
   for the offline crop (tools/qa/cape-pose-sheet.mjs). */
async function _shootPoses(P, raw, prefix) {
  const out = [];
  for (const pz of POSES) {
    let got = null;
    for (let i = 0; i < 10 && !got; i++) {
      /* Re-armed every sample: _hitFlash lapses after 250ms and _dodgeRoll is
         cleared by the roll's own timer, so a single set would be gone by the
         time the frame is grabbed. */
      await P.page.evaluate(pz.set);
      await P.page.waitForTimeout(120);
      const s2 = await raw(P);
      if (s2 && s2.pose === pz.tag) got = s2;
    }
    if (got) {
      /* FULL frame plus the character's drawn position, cropped offline.  A
         clip computed here has to be clamped into the viewport, and clamping
         is what put the character in the corner of the first five previews
         with the interesting side of him -- the side a cape hangs off --
         outside the picture.  Offline the crop can run past the edge and pad.
         (A colour search was tried before that and was worse: "reddish" found
         the BANK's brown door in all five pictures.) */
      const f = `/home/user/GameDev/tools/qa/mp/out/${prefix}-${pz.tag}.png`;
      const at = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const r = document.querySelector('canvas').getBoundingClientRect();
        const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
        const wx = d ? d.x : S.player.x, wy = d ? d.footY : S.player.y;
        return {
          cx: r.left + (wx - S.camera.x) * (S._worldScaleX || 1),
          cy: r.top + (wy - S.camera.y) * (S._worldScaleY || 1),
          dpr: window.devicePixelRatio || 1, drawn: !!d,
        };
      }).catch(() => null);
      await P.page.screenshot({ path: f });
      out.push({ tag: pz.tag, label: pz.label, shot: f, at: at || null,
        capeOn: !!(got.cape && got.cape.visible),
        bodyOn: !!(got.body && got.body.visible),
        dx: got.cape && got.body ? got.cape.x - got.body.x : null,
        dy: got.cape && got.body ? got.cape.y - got.body.y : null,
        w: got.cape && got.body ? +(got.cape.w - got.body.w).toFixed(2) : null });
    }
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      S._extraction = null; S._dodgeRoll = null; S._lootFreezeUntil = 0; S._hitFlash = 0;
    });
    await P.page.waitForTimeout(350);
  }
  return out;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Caped', wsPort, webPort, guest: true,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const bare = await raw(P);
  rec.ok('the player display exposes a cape sprite (guard)', !!(bare && bare.cape), bare);
  rec.ok('with no cape owned, nothing is drawn', !!bare && bare.cape && bare.cape.visible === false,
    bare && bare.cape);

  /* ── THE BARE ROW OF THE PREVIEW, SHOT WHILE THERE IS NO CAPE TO HIDE ──
     v2.3.2129. Same five poses, same crop, taken here because no cape is owned
     yet -- which is a stronger guarantee of "no cape in this picture" than any
     amount of hiding it, and the only one that works (see the note beside the
     caped pass below). */
  const spot = await _recentre(P, null);
  const bareShots = await _shootPoses(P, raw, 'cape-bare');
  rec.ok('the five poses are reachable before a cape exists (guard: the bare '
    + 'half of the preview, and proof the pose flags work at all)',
    bareShots.length === POSES.length, bareShots.map((x) => x.tag));
  rec.ok('...and none of them draws a cape, because none is owned yet',
    bareShots.every((x) => x.capeOn === false), bareShots.map((x) => [x.tag, x.capeOn]));

  /* ═══ v2.3.2027: THE CAPE IS GRANTED BY THE WORKER NOW ═══
   * The first version of this file set localStorage and reloaded, which was
   * right when the cape was a client-side choice and is wrong now: the worker
   * echoes the cape its LEDGER says you own, null included, so a locally-set
   * cape is taken straight back off. That is the point of the change (a
   * cosmetic you can choose for yourself is one anyone can choose, and this one
   * is a contest prize), so the test follows the real path instead of the
   * convenient one.
   *
   * v2.3.2029: no flag is set here at all any more. This scenario seeds the
   * TICKET and tests everything after it, so the drop rate never mattered --
   * the `event_cape_rate` write this used to do was vestigial from an earlier
   * draft that took the drop. Worth stating rather than deleting quietly: the
   * event now ships CLOSED (EVENT_LIVE, eventcapes.js) and this file passes
   * anyway, which is itself the proof of the never-expires property -- a
   * ticket redeems, and its cape renders, with the contest shut. */

  /* The TICKET is seeded through POST /api/admin/grant -- the shipped operator
     surface the harness already uses for gold, not a test backdoor. The drop
     roll, the cap of three and the one-per-account refusal are covered
     exhaustively by server/test/eventcapes.test.mjs, where they can be driven
     deterministically; what only a real browser can answer is the half after
     the ticket exists: does the Open button appear, does the worker grant on
     it, and does the cape then RENDER on the character. */
  const pid = await P.page.evaluate(() => (window._gameState && window._gameState.current && window._gameState.current.myId) || null);
  rec.ok('the player has an id to grant against (guard)', !!pid, { pid });
  const granted = await H.grant(wsPort, pid, 'item', { invKey: 'goldticket_crimson', count: 1 })
    .then((r) => r).catch((e) => ({ ok: false, error: String(e) }));
  rec.ok('a golden ticket could be granted through the operator API (guard)',
    !!granted && granted.ok !== false, granted);
  await P.page.waitForTimeout(1800);
  const heldTicket = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    return (S && S.rpg && S.rpg.inventory && S.rpg.inventory.goldticket_crimson) || 0;
  });
  rec.ok('the ticket reached the player\'s bag (guard: the Open button needs one to exist)',
    heldTicket > 0, { heldTicket });

  /* REDEEM through the channel, with the exact message the Open button sends.
     WHAT THIS DOES NOT COVER, said plainly rather than implied: the button's
     own wiring. Reaching it means opening the bag panel and finding a control
     by its label, which is the brittleness that killed five scenarios this
     week (TRAPS §29). What is covered is everything after the tap — the
     worker consuming the ticket, the ledger granting, the echo, and the cape
     appearing on the character — which is where the interesting failures are.
     The button's gate is separately pinned by the caps-audit suite, which
     fails if _serverCaps.eventCapes is advertised and never read. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) {
      S.channel.send({ type: 'cape_redeem',
        payload: { invKey: 'goldticket_crimson', opId: 'mp-cape-' + Date.now() } });
    }
  });
  await P.page.waitForTimeout(2500);
  const spent = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    return (S && S.rpg && S.rpg.inventory && S.rpg.inventory.goldticket_crimson) || 0;
  });
  rec.ok('the worker consumed the ticket on redeem (the client never touches it)',
    spent === 0, { left: spent });

  const worn = await raw(P);
  rec.ok('the cape is drawn once it is worn', !!(worn && worn.cape && worn.cape.visible && worn.cape.tex), worn && worn.cape);

  /* ═══ v2.3.2142: AND IT SURVIVES THE NEXT player_state ═══
     Owner: "the cape disappeared entirely after a while... the cape isn't
     showing up in the cape slot in character equip menu... jogging while
     wearing cape doesn't work, shows nothing."

     One cause under all three. wsClient read a MISSING `cape` field as 'none',
     which is right for a v1 full snapshot and wrong for the v2 DELTA every
     current client asks for: the delta carries only fields whose JSON changed,
     and `cape` is a stable string once you own one, so it is emitted once and
     never again. The next player_state -- a coin, a regen tick, anything --
     arrived without it and took the cape off. The character sheet's cape slot
     reads getCape(), so it emptied with it, and there was nothing left to draw
     on a jog.

     Everything above this line passed throughout, because it reads the cape
     immediately after the redeem -- on the ONE echo that does carry the field.
     That is the shape of the hole: the assertion has to outlive that echo.

     So: force a player_state that changes something ELSE, and check the cape
     is still on. Coins through the shipped operator API, which is a real
     server-side mutation and therefore a real delta. */
  const beforeDelta = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    return { coins: (S && S.rpg && S.rpg.coins) || 0 };
  });
  /* `gold`, not `coins`. The admin grant endpoint accepts exactly two kinds,
     gold and item (admin.js: `kind !== 'gold' && kind !== 'item'`), and
     anything else is refused. The first cut here sent 'coins' and the guard
     below caught it -- coins went 75 -> 75, so the survival assertion beside
     it would have passed on a delta that never happened. (mp-rehearsal sends
     'coins' too, with the rejection swallowed by a .catch; that is its own
     silent no-op, noted here rather than fixed from this file.) */
  await H.grant(wsPort, pid, 'gold', { amount: 250 }).catch(() => null);
  await P.page.waitForTimeout(2500);
  /* `_capeWorn` is the mirror wsClient keeps on S.rpg for exactly this reason
     -- the catalog is a lazy split chunk with no importable URL in dist (this
     file's own header says so), so the flag is the readable answer. */
  const afterDelta = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    return {
      coins: (S && S.rpg && S.rpg.coins) || 0,
      capeWorn: !!(S && S.rpg && S.rpg._capeWorn),
    };
  });
  rec.ok('a coin grant really did land (guard: no delta, nothing is proven)',
    afterDelta.coins > beforeDelta.coins, { before: beforeDelta, after: afterDelta });
  rec.ok('the cape SURVIVES a player_state that does not mention it '
    + '(v2.3.2142: absent is "unchanged", not "took it off")',
    afterDelta.capeWorn === true, afterDelta);

  const still = await raw(P);
  rec.ok('...and it is still drawn on the character after that delta',
    !!(still && still.cape && still.cape.visible && still.cape.tex), still && still.cape);
  rec.ok('...and the body is drawn under it (guard: otherwise "visible" means nothing)',
    !!(worn && worn.body && worn.body.visible), worn && worn.body);
  /* THE REGISTRATION. Same origin, same scale — a full-frame sticker on a
     256 frame, so any divergence is the cape coming off the character. */
  rec.ok('the cape sits exactly on the body sprite, not near it',
    !!(worn && worn.cape && worn.body
       && Math.abs(worn.cape.x - worn.body.x) <= 1 && Math.abs(worn.cape.y - worn.body.y) <= 1),
    { cape: worn && worn.cape, body: worn && worn.body });
  rec.ok('...and is DRAWN the same size as the body, mirror included',
    !!(worn && worn.cape && worn.body && worn.body.w > 0
       && Math.abs(worn.cape.w - worn.body.w) < 1.5
       && Math.abs(worn.cape.h - worn.body.h) < 1.5
       && worn.cape.mirror === worn.body.mirror),
    { cape: worn && worn.cape, body: worn && worn.body });

  /* ── JOGGING ── owner: "Does it work while jogging too?"
   * It did not, and nothing here would have said so.  The art is a STANDING
   * still, and the standing figure is not where the figure is on a jog frame:
   * body-tops.json puts the crown +18x +21y in 256-space between stand-east-0
   * and jog-east.  Pinned to the frame origin the hood stayed over the
   * standing head while the real head ran out from under it — the face poking
   * out in front of the hood, plainly visible in a screenshot and invisible to
   * every assertion above, because position and scale still agreed with the
   * body exactly as they were asked to.
   *
   * So the cape is offset by this frame's crown against the standing crown.
   * The test is that the offset EXISTS while jogging and is ZERO while
   * standing: re-pinning the cape to the body origin is the regression, and it
   * is the one a later "simplification" would reach for. */
  await P.page.keyboard.down('d');
  const jog = [];
  const shots = [];
  for (let i = 0; i < 14 && jog.length < 3; i++) {
    await P.page.waitForTimeout(160);
    const s = await raw(P);
    if (s && s.pose === 'jog' && s.cape && s.body) {
      jog.push(s);
      /* v2.3.2125: capture the jog as PIXELS as well as numbers.  Everything
         below reads the transform, which is the right test for "does it follow
         the crown" and is silent on "does it look right" -- the owner's actual
         question.  A crop around the figure, one per sample, so a hood that has
         slid off the head is visible rather than inferred. */
      /* v2.3.2126: full frame, like the sweep below and for the same reason --
         every attempt at computing a clip from the sprite's position produced
         either an empty rect or a picture with no character in it. */
      const f = `/home/user/GameDev/tools/qa/mp/out/cape-jog-${jog.length}.png`;
      await P.page.screenshot({ path: f });
      shots.push(f);
    }
  }
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(600);
  rec.ok('the player actually jogged (guard: without this the offset check below proves nothing)',
    jog.length > 0, { samples: jog.length });
  if (jog.length) {
    const off = jog.map((s) => [s.cape.x - s.body.x, s.cape.y - s.body.y]);
    rec.ok('while jogging the cape follows the frame\'s crown, not the frame origin',
      off.some(([dx, dy]) => dx !== 0 || dy !== 0), { offsets: off });
    rec.ok('...and it is TILTED while running, so the back is covered '
      + '(owner: "the back of the character doesn\'t stick out while running")',
      jog.some((s) => Math.abs(s.cape.rot) > 0.01), { rots: jog.map((s) => s.cape.rot), dir: jog[0].dir });
    rec.ok('...and it is still drawn at the body\'s size while it does so',
      jog.every((s) => Math.abs(s.cape.w - s.body.w) < 1.5), jog.map((s) => [s.cape.w, s.body.w]));
  }
  rec.ok('the jog was photographed, not only measured', shots.length > 0, { shots });

  /* ═══ v2.3.2125: THE TILT SWEEP ═══
     Owner: "It looks like the cape is hanging off the side of his head and the
     side of his body. It needs to be angled more aggressively so that the back
     of his body doesn't show behind it."

     Two numbers decide that and neither can be measured -- see _capeTune in
     entityRenderer.  So this photographs the SAME jog frame at a spread of
     them, in one run, and the choice is made by looking.  Setting the handle
     is what makes that possible; the assertion is only that the sweep actually
     ran (a silent no-op would leave four identical pictures and a confident
     wrong conclusion). */
  /* v2.3.2126: the owner picked the hardest angle off the v2.3.2125 ladder and
     asked for it slid back ("needs to nudge left to fit").  So the angle is now
     FIXED at their pick and the sweep moves the slide instead -- one variable at
     a time, or the picture cannot say which knob did what. */
  /* The scale is against whatever the TABLE currently holds, and the table
     moved in v2.3.2125 (east 0.30 -> 0.45).  So "2.5x", the label on the frame
     the owner picked, no longer means the angle they were looking at -- it now
     lands at 1.125 rad against the 0.75 they chose.  Pinned by the ABSOLUTE
     rotation instead: 0.75 / 0.45 = 1.667.  A ladder rung is only a rung while
     the thing underneath it holds still. */
  const PICKED = 1.667;
  const SWEEP = [
    { tiltScale: PICKED, pivotY: 0.33, jogDx: 0, tag: 'a-dx0' },
    { tiltScale: PICKED, pivotY: 0.33, jogDx: -8, tag: 'b-dx8' },
    { tiltScale: PICKED, pivotY: 0.33, jogDx: -14, tag: 'c-dx14' },
    { tiltScale: PICKED, pivotY: 0.33, jogDx: -20, tag: 'd-dx20' },
    { tiltScale: PICKED, pivotY: 0.33, jogDx: -28, tag: 'e-dx28' },
  ];
  const swept = [];
  for (const cfg of SWEEP) {
    await P.page.evaluate((c) => { window.__btCapeTune = { tiltScale: c.tiltScale, pivotY: c.pivotY, jogDx: c.jogDx }; }, cfg);
    await P.page.keyboard.down('d');
    let got = null;
    for (let i = 0; i < 12 && !got; i++) {
      await P.page.waitForTimeout(140);
      const s2 = await raw(P);
      if (s2 && s2.pose === 'jog' && s2.cape && s2.cape.visible) got = s2;
    }
    if (got) {
      /* FULL frame, cropped afterwards by finding the cape's own crimson.
         Two attempts at computing the crop from the sprite's position came
         back with no character in the picture -- once because the camera does
         not hold the player at the canvas centre, once because stage
         coordinates are not CSS pixels. A picture with nothing in it is worse
         than no picture: it looks like an answer. The colour is on the screen
         by definition, so locating it cannot drift. */
      await P.page.screenshot({ path: `/home/user/GameDev/tools/qa/mp/out/cape-tilt-${cfg.tag}.png` });
      swept.push({ ...cfg, rot: got.cape.rot, capeX: got.cape.x - got.body.x });
    }
    await P.page.keyboard.up('d');
    await P.page.waitForTimeout(400);
  }
  await P.page.evaluate(() => { try { delete window.__btCapeTune; } catch (e) {} });
  console.log('    TILT SWEEP: ' + JSON.stringify(swept));
  /* The rotation is deliberately CONSTANT across this sweep now, so the old
     "did the rotation vary" guard would fail on a correct run.  What has to
     vary is the cape's X -- that is the knob under test, and a sweep where it
     did not move is five identical pictures and a confident wrong answer. */
  rec.ok('the slide sweep actually moved the cape (guard: identical frames prove nothing)',
    swept.length >= 3 && new Set(swept.map((x) => x.capeX)).size >= 3, swept);

  const back = await raw(P);
  rec.ok('...and standing again there is no offset — the art is fitted to THIS pose',
    !!(back && back.cape && back.body && back.pose === 'stand'
       && Math.abs(back.cape.x - back.body.x) <= 1 && Math.abs(back.cape.y - back.body.y) <= 1
       && Math.abs(back.cape.rot) < 0.001),
    back);

  /* ═══ v2.3.2129: THE CAPE ON EVERY POSE THAT DRAWS A REAL BODY ═══
     Owner: "Add it to all the animations as well" -> "yes do the free 8".

     Five, not eight -- chop, cook and fire replace the whole figure with a
     stand-in sprite and hide the body container, so they were never free and
     stay hidden along with swing and bowshot (see _CAPE_HIDDEN_POSES).

     Every pose here is reached by setting the SAME state flag the game itself
     sets (entityRenderer's `pose` ladder reads exactly these), rather than by
     trying to arrange a monster, a loot drop and an ore vein in one run. The
     flag is the input to the thing under test; staging the world around it
     would test the world.

     Photographed AND measured. The numbers say the cape is on the body; only
     the picture says whether it looks right on a crouch or a roll, which is
     what the owner asked to see. */
  await _recentre(P, spot);
  const posed = await _shootPoses(P, raw, 'cape-pose');
  /* Pair each caped frame with the BARE one shot before the ticket was ever
     redeemed.  A cape-on picture cannot answer the owner's actual question --
     whether the cape looks right ON these poses -- because it cannot show what
     the cape is covering.
     The bare row is shot EARLY rather than by hiding the sprite mid-run, and
     that is not a stylistic choice: pinning `_capeSprite.visible` false does
     nothing in Pixi v8. Visibility is a setter that updates an internal render
     bitmask, so a shadowing property fools JS and not the renderer -- the
     first "without" row came back wearing the cape. (The same pin DOES work on
     `_spriteBody.visible` at the foot of this file, for the opposite reason:
     there it exists to fool `_placeCape`'s own JS read, not the GPU.) */
  for (const b of bareShots) {
    const m = posed.find((x) => x.tag === b.tag);
    if (m) { m.bare = b.shot; m.bareAt = b.at; }
  }
  rec.ok('...and each pose was shot BARE as well, so the preview shows what the '
    + 'cape is covering rather than only that it is there',
    posed.length > 0 && posed.every((x) => !!x.bare), posed.map((x) => x.bare || null));

  console.log('    POSES: ' + JSON.stringify(posed));
  /* An index beside the frames, so building the contact sheet is not a second
     place that has to re-derive where the character was. */
  try {
    const fs = await import('node:fs');
    fs.writeFileSync('/home/user/GameDev/tools/qa/mp/out/cape-poses.json',
      JSON.stringify(posed, null, 2));
  } catch (e) { /* the pictures are the deliverable; the index is a convenience */ }
  rec.ok('all five real-body poses were actually reached (guard: an unreached '
    + 'pose would let every claim below pass on nothing)',
    posed.length === POSES.length, posed.map((x) => x.tag));
  rec.ok('the cape is drawn on every one of them -- it no longer vanishes when '
    + 'you take a hit or bend down for loot',
    posed.length > 0 && posed.every((x) => x.capeOn && x.bodyOn),
    posed.map((x) => ({ tag: x.tag, cape: x.capeOn, body: x.bodyOn })));
  /* A BOUND, not zero. The first cut of this asserted dx == dy == 0 and failed
     on a correct build: the cape deliberately follows each frame's own crown
     (v2.3.2023b), so 'hit' reads +6,+6 and that is the feature working. What a
     broken cape looks like is a LARGE offset -- the sprite left behind beside
     the figure -- so the claim is that it stays within a head's width of the
     body while it tracks. Size still has to match exactly: the cape is a
     full-frame sticker on the body's own transform, and a width that drifts
     means it stopped being one. */
  const OFFSET_CAP = 24;
  rec.ok(`...and on each one it stays ON the character (within ${OFFSET_CAP}px) `
    + 'and is drawn at the body\'s exact size',
    posed.length > 0 && posed.every((x) => Math.abs(x.dx) <= OFFSET_CAP
      && Math.abs(x.dy) <= OFFSET_CAP && Math.abs(x.w) < 1.5),
    posed.map((x) => ({ tag: x.tag, dx: x.dx, dy: x.dy, dw: x.w })));
  rec.ok('every pose was photographed, not only measured -- the numbers cannot '
    + 'say whether a cape looks right on a roll',
    posed.length === POSES.length && posed.every((x) => !!x.shot),
    posed.map((x) => x.shot));

  /* ── THE INVARIANT THAT MATTERS ──
   * Not "click and hope a monster was in range".  The first cut did that and
   * the pose never left 'stand' across six clicks, so the assertion was
   * reporting on an attack that never happened — a test that would have gone
   * green on a broken build the moment a monster wandered close.
   *
   * The property is: THE CAPE NEVER DRAWS AGAINST A HIDDEN BODY.  That is the
   * exact condition an attack creates (the body is hidden and redrawn by a
   * stand-in), and it is what the back shield got wrong by hanging in the air
   * beside the swing.  Hiding the body sprite reproduces it deterministically,
   * in every build, without needing a monster to cooperate. */
  const pinned = await P.page.evaluate(() => {
    const r = window._pixiRenderer;
    const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
    if (!pd || !pd._spriteBody) return false;
    /* PIN it, do not just set it: the renderer re-shows the body every frame,
       so a plain assignment is reverted before the next sample and the check
       reads a body that is visible again.  Last assertion in the file, so the
       sprite does not need to come back. */
    let v = false;
    try {
      Object.defineProperty(pd._spriteBody, 'visible', {
        configurable: true, get() { return v; }, set() { v = false; },
      });
    } catch (e) { return false; }
    return true;
  });
  rec.ok('the body sprite could be pinned hidden (guard: otherwise the check below is vacuous)', pinned === true, { pinned });
  await P.page.waitForTimeout(500);
  const hidden = await raw(P);
  rec.ok('the cape does not draw against a hidden body — the swing case '
    + '(v2.3.1784: the back shield hung in mid-air beside the swing)',
    !!(hidden && hidden.body && hidden.body.visible === false
       && hidden.cape && hidden.cape.visible === false),
    hidden);
}
