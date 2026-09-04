/* THE STAMINA ABILITIES REACH THE WORKER — and stay locked until they don't
 * (v2.3.1733, PR 5 of docs/COMBAT-OVERHAUL-PLAN.md).
 *
 * The ability RULES are pinned by server/test/abilities.test.mjs, which drives
 * the handler and the monster tick directly.  What a unit suite structurally
 * cannot see is the join between the two halves, and this scenario is only
 * about that join:
 *
 *   1. Does the worker ADVERTISE caps.abil, and does the client store it?
 *      Without the flag the buttons never render against any worker.
 *   2. Does the milestone gate hide the BUTTONS?  A fresh character is level
 *      3 and must see neither ability.  The owner asked for levels that
 *      unlock things; a button visible before its level is the feature
 *      failing quietly in the direction nobody notices.
 *   3. Does an `ability` message actually LEAVE THE BROWSER and get answered?
 *      This is TRAPS #18 in its exact shape: a new client->server type needs
 *      a server case, a handler AND a channelShim passthrough, and the
 *      failure mode of a missing third leg is silence in both directions.
 *      The tell used here is the one the trap entry recommends — count what
 *      the client tried to send (H.instrumentWire), then look for something
 *      only the WORKER could have produced.
 *   4. Does ability_rejected finally have a client handler?  It has existed
 *      server-side for many versions with nothing listening (a refused cast
 *      did nothing and said nothing — the v2.3.1716 failure).  The popup is
 *      the proof, and it is also proof of leg 3: the client cannot invent a
 *      "unlocks at level 4" message it was never sent.
 *
 * A SUCCESSFUL cast is deliberately not attempted here.  It needs character
 * level 4, i.e. a real trained level-up, and there is no operator grant for
 * XP — faking it client-side would prove nothing (prog3 is server-owned, so
 * the worker would still refuse).  The successful path, the damage, the stun
 * and the AoE all live in the server suite where they can be driven exactly.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Basher', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  const myId = await H.readState(P, (S) => S.myId);
  await H.instrumentWire(P);

  /* ── 1. the capability flag ── */
  const caps = await H.readState(P, (S) => (S._serverCaps && S._serverCaps.abil) === true);
  rec.ok('the worker advertises caps.abil and the client stored it', caps === true, caps);

  /* ── 2. the milestone gate hides the buttons ── */
  const level = await H.readState(P, (S) => (S.rpg && S.rpg.level) || null);
  rec.ok('a fresh character is character level 3 (the ungated floor)', level === 3, level);
  const status = await P.page.evaluate(() => {
    const F = window._gameFns || {};
    if (!F.abilityStatus) return { __noBridge: true };
    return { bash: F.abilityStatus('bash'), whirl: F.abilityStatus('whirl') };
  });
  rec.ok('the client agrees both abilities are still locked at level 3',
    !!status.bash && status.bash.visible === false && status.whirl.visible === false, status);
  const buttons = await P.page.evaluate(() => document.querySelectorAll('[data-ability]').length);
  rec.ok('...so no ability button is on screen', buttons === 0, buttons);

  /* ── 3 + 4. the message leaves the browser, the worker answers, the client
        finally listens ── */
  const stam0 = await H.adminPlayer(wsPort, myId).then((a) => a?.live?.stamina ?? null).catch(() => null);
  rec.ok('the operator view can read this player\'s stamina', typeof stam0 === 'number', stam0);

  /* Sent raw rather than through castAbility(): the client-side gate would
     (correctly) refuse a locked cast before it reached the wire, and the
     thing under test here is the WIRE. */
  /* The popup is captured by a HOOK rather than read out of S.dmgNumbers
     afterwards: floating numbers are short-lived by design (the renderer
     ages them out), so a fixed sleep-then-read races the animation and the
     first draft of this check failed for that reason alone. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.dmgNumbers) return;
    window.__popups = [];
    const list = S.dmgNumbers;
    const push = list.push.bind(list);
    list.push = (p) => { try { window.__popups.push(p && p.text); } catch (e) {} return push(p); };
  });
  /* ═══ v2.3.2252: PROVE THE ROUND TRIP ON WHIRLWIND, NOT BASH ═══
     Shield Bash is ungated now (owner: "an ability for any level (no gates)"),
     so it can no longer be refused for being locked -- and the reject it DOES
     get, 'no-shield', is a string the client produces verbatim on its own
     refusal path (game/abilities.js).  Seeing it would prove nothing about the
     wire, which is the whole job of this section (TRAPS #18, leg 3: only the
     worker could have said this).
     Whirlwind is still gated at 8, so it keeps a reason the client cannot
     invent at this level, and the proof keeps its shape. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'ability', payload: { kind: 'whirl' } });
  });
  await P.page.waitForTimeout(1500);

  const wire = await H.wireCounts(P);
  rec.ok('the client tried to send `ability`', (wire.ability || 0) >= 1, wire);

  const popups = await P.page.evaluate(() => (window.__popups || []).slice());
  /* ONLY the worker knows the unlock level — the client-side refusal path
     never produces this string, so seeing it proves the round trip. */
  rec.ok('the worker refused it and the client SAID SO (ability_rejected has a handler now)',
    popups.some((t) => typeof t === 'string' && /unlocks at level 8/i.test(t)), popups);

  const stam1 = await H.adminPlayer(wsPort, myId).then((a) => a?.live?.stamina ?? null).catch(() => null);
  rec.ok('a locked cast spends no stamina on the worker', stam1 === stam0, { before: stam0, after: stam1 });

  /* ── 5. a client that FAKES its level still gets nothing ──
     The button's visibility is derived from the client's own copy of the
     prog3 blob, so forging that copy is the cheapest possible cheat: edit
     one number and the ability appears.  Doing exactly that here proves two
     things at once — that the button really is level-driven (it appears the
     moment the number changes, which is what a real level-up will do), and
     that appearing buys nothing, because the worker computes the level from
     ITS OWN blob and refuses anyway. */
  /* A shield first: the CLIENT-side gate refuses a bash without one before
     anything reaches the wire (correctly — that refusal is instant feedback,
     not a rule).  The mayor's first quest is what hands one out (v2.3.1676),
     the same route mp-block takes. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await H.waitFor(P, (S) => (S.rpg?.shieldStash || []).length, (n) => n > 0,
    { timeout: 20000, label: 'the quest shield arrives' }).catch(() => {});
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg || !S.rpg.prog3) return;
    if (!S.rpg.shield && (S.rpg.shieldStash || []).length) S.rpg.shield = S.rpg.shieldStash.shift();
    S.rpg.prog3.sk.sword.level = 8;   /* char level = 8 + 1 + 1 = 10 locally */
    window.__popups = [];
  });
  await P.page.waitForTimeout(700);
  /* v2.3.2252: WHIRLWIND is the forged-level subject now.  Bash is ungated, so
     forging a level cannot conjure its button -- and its real requirement, a
     RAISED shield, is a stance the client owns by design rather than a cheat
     the worker must refuse.  Whirl still gates at 8, so it is the one that
     still proves "appearing buys nothing".
     The count is 1, not 2: whirl renders on the forged level, and bash is
     absent because the shield is equipped but not RAISED. */
  const fakeButtons = await P.page.evaluate(() => document.querySelectorAll('[data-ability]').length);
  rec.ok('with the forged level present, the gated ability button renders', fakeButtons === 1, fakeButtons);
  rec.ok('...and it is WHIRL — bash is absent because the shield is not raised',
    (await P.page.evaluate(() => !!document.querySelector('[data-ability="whirl"]')
      && !document.querySelector('[data-ability="bash"]'))) === true);
  /* Sent RAW rather than by clicking the button, and the reason matters: the
     client's own gate refuses a whirlwind with no weapon ("No weapon
     equipped!") before anything reaches the wire, and that string is one the
     client can produce by itself -- so a click would prove nothing about the
     worker, which is this section's whole claim.  The raw send skips the local
     prediction and lands on the worker's own level check, which is the thing
     under test.  (The section above already proved the BUTTON renders on a
     forged level; this proves that renders buy nothing.) */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'ability', payload: { kind: 'whirl' } });
  });
  await P.page.waitForTimeout(1500);
  const fakePopups = await P.page.evaluate(() => (window.__popups || []).slice());
  rec.ok('...but the worker still refuses it (the level it checks is its own)',
    fakePopups.some((t) => typeof t === 'string' && /unlocks at level 8/i.test(t)), fakePopups);
  const stamFake = await H.adminPlayer(wsPort, myId).then((a) => a?.live?.stamina ?? null).catch(() => null);
  rec.ok('...and the forged level costs the worker nothing', stamFake === stam0,
    { before: stam0, after: stamFake });

  /* An unknown kind must be inert on the same path — the handler indexes its
     table with a wire string. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    window.__popups = [];
    if (S && S.channel) S.channel.send({ type: 'ability', payload: { kind: '__proto__' } });
  });
  await P.page.waitForTimeout(1200);
  const stam2 = await H.adminPlayer(wsPort, myId).then((a) => a?.live?.stamina ?? null).catch(() => null);
  const alive = await H.readState(P, (S) => !!(S.rpg && S.channel));
  rec.ok('a junk ability kind changes nothing and does not break the session',
    stam2 === stam0 && alive === true, { stam2, alive });

  /* ═══ v2.3.1735: WHICH WAY THE CAST POINTS ═══
     Owner: "right now the effect is east.  Make it apply in whatever
     direction the effect is actually triggered."

     v2.3.1733 resolved the angle as `_aimAngle ?? (_lastAimAngle || 0)`.
     `_lastAimAngle` is written ONLY by the right-stick aim handler, so a
     player who taps the ability BUTTON without aiming since load has it
     undefined — and `|| 0` is zero radians, due east.  Every bash fired
     from the button pointed east regardless of which way the player faced.

     Pinned HERE rather than in the server suite because the rule is client
     input resolution the worker never sees, and pinned through the autotest
     surface rather than a real cast because a cast needs character level 4
     and a fresh character is 3 (see this file's header).  Each case sets
     exactly one source and clears the rest, so a regression names the
     branch that broke instead of just "the angle moved". */
  const EAST = 0;
  const dirs = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const fns = window._gameFns;
    if (!S || !fns || !fns.resolveCastAngle) return null;
    const set = (o) => {
      S._aimAngle = null; S._shieldUp = false; S._shieldAngle = null;
      S._lastAimAngle = null; S._facingAngle = null; S._facing = null;
      Object.assign(S, o);
      return fns.resolveCastAngle();
    };
    return {
      /* the reported bug: nothing but the body's 4-way facing */
      faceUp: set({ _facing: 'up' }),
      faceLeft: set({ _facing: 'left' }),
      faceDown: set({ _facing: 'down' }),
      faceRight: set({ _facing: 'right' }),
      /* the ladder, most deliberate first */
      aiming: set({ _aimAngle: -Math.PI / 2, _facing: 'right' }),
      shield: set({ _shieldUp: true, _shieldAngle: Math.PI, _facing: 'right' }),
      lastAim: set({ _lastAimAngle: -Math.PI / 2, _facing: 'right' }),
      smoothed: set({ _facingAngle: Math.PI, _facing: 'right' }),
      /* nothing at all — must NOT be east */
      empty: set({}),
    };
  });
  if (!dirs) {
    rec.skip('cast direction', 'the autotest surface is missing resolveCastAngle');
  } else {
    /* THE REGRESSION. Facing up/left/down must not resolve to east. */
    rec.ok('facing UP casts north, not east', Math.abs(dirs.faceUp - (-Math.PI / 2)) < 1e-6, dirs);
    rec.ok('facing LEFT casts west, not east', Math.abs(dirs.faceLeft - Math.PI) < 1e-6, dirs);
    rec.ok('facing DOWN casts south, not east', Math.abs(dirs.faceDown - Math.PI / 2) < 1e-6, dirs);
    /* Facing right SHOULD be east — proof the assertions above are reading a
       real value and not just anything-but-zero. */
    rec.ok('...and facing RIGHT still casts east', Math.abs(dirs.faceRight - EAST) < 1e-6, dirs);
    /* The ladder: each source wins over the ones below it. Every case sets
       _facing:'right' (east) as the loser, so a branch that silently stopped
       being consulted would fall through to east and fail here. */
    rec.ok('an active aim beats the body facing', Math.abs(dirs.aiming - (-Math.PI / 2)) < 1e-6, dirs);
    rec.ok('a raised shield beats the body facing', Math.abs(dirs.shield - Math.PI) < 1e-6, dirs);
    rec.ok('the last aim beats the body facing', Math.abs(dirs.lastAim - (-Math.PI / 2)) < 1e-6, dirs);
    rec.ok('the smoothed movement facing beats the 4-way', Math.abs(dirs.smoothed - Math.PI) < 1e-6, dirs);
    /* With NOTHING set the floor is south (the renderer's own default,
       visualSystems.js), never east — an east default is the bug itself. */
    rec.ok('with no direction at all the cast falls to south, never east',
      Math.abs(dirs.empty - Math.PI / 2) < 1e-6 && dirs.empty !== EAST, dirs);
  }

  /* ═══ v2.3.1736: A STUNNED MONSTER STILL TRACKS THE SERVER ═══
     Owner: "right now it stuns them and then bounces them back which looks
     awkward."  Shield Bash's knockback and its stun land in the SAME instant
     server-side, but the client's stun early-return sat above the position
     interpolator, so a stunned monster's renderX/renderY froze at the
     pre-shove spot for the whole stun and only caught up when it expired.
     The player saw the daze, then the shove.

     Pinned in a real browser because this is a render-loop ordering bug: no
     server test can see it (the server is already correct), and the symptom
     is purely that renderX stops following x.  Driven directly rather than by
     casting — a cast needs character level 4 (see this file's header). */
  const interp = await P.page.evaluate(async () => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return { __no: true };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    S._serverMonsters = true;   /* the MP path, where the server owns position */
    const m = {
      id: 'qa_interp_1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: S.player.x + 60, y: S.player.y, renderX: S.player.x + 60, renderY: S.player.y,
      hp: 500, curHp: 500, maxHp: 500, dmg: 0, level: 1, alive: true,
      statuses: {}, _stuckArrows: [], respawnAt: 0, _atkCd: 0, _stunUntil: 0,
    };
    S.monsters = [m];
    await sleep(250);
    /* Stun it and shove it 90px in the same breath — exactly what the worker
       does for a bash. */
    m._stunUntil = Date.now() + 1600;
    m.x = m.x + 90;
    const target = m.x;
    await sleep(400);            /* well inside the stun */
    const during = m.renderX;
    m._stunUntil = 0;
    await sleep(400);
    const after = m.renderX;
    S.monsters = [];
    return { target, during, after, movedDuringStun: Math.abs(during - target) < 1 };
  });
  if (interp.__no) {
    rec.skip('stunned-monster interpolation', 'no player state');
  } else {
    /* THE REGRESSION.  With the old ordering `during` stays at the pre-shove
       position for the whole stun and only reaches `target` afterwards. */
    rec.ok('a stunned monster still moves to where the server shoved it',
      interp.movedDuringStun, interp);
    rec.ok('...and does not wait for the stun to expire to get there',
      Math.abs(interp.during - interp.after) < 1, interp);
  }

  /* ═══ v2.3.1737: THE SHIELD BASH SOUND ACTUALLY EXISTS AND PLAYS ═══
     Owner supplied a shield-impact sample for the ability.  Two things can
     go wrong and neither is visible in play: the manifest entry can 404
     (BT_AUDIO logs nothing a player would see), or the container can refuse
     to decode — which is exactly how 19 sfx shipped SILENT on every
     Chromium browser for months (v2.3.1610, the m4a trap).  audio-formats.mjs
     pins decodability for the whole manifest; this pins that THIS key is in
     it, resolves, and returns a real playback handle. */
  const sfx = await P.page.evaluate(async () => {
    const S = window._gameState && window._gameState.current;
    const A = S && S.BT_AUDIO ? S.BT_AUDIO : (window.BT_AUDIO || null);
    if (!A) return { __no: true };
    const url = A.SFX_MANIFEST && A.SFX_MANIFEST['shield-bash'];
    const whirlUrl = A.SFX_MANIFEST && A.SFX_MANIFEST['whirlwind'];
    const ambUrl = A.ZONE_AMBIENT && A.ZONE_AMBIENT.sky;
    if (!url) return { inManifest: false };
    try { A.unlock && A.unlock(); } catch (e) {}
    try { A.loadSfxManifest && A.loadSfxManifest(); } catch (e) {}
    /* the fetch+decode is async; give it a moment */
    for (let i = 0; i < 40; i++) {
      if (A._samples && A._samples['shield-bash']) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    for (let i = 0; i < 40; i++) {
      if (A._samples && A._samples['whirlwind']) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const buf = A._samples && A._samples['shield-bash'];
    const wbuf = A._samples && A._samples['whirlwind'];
    const handle = buf ? A.play('shield-bash', { vol: 0.001 }) : null;
    const whandle = wbuf ? A.play('whirlwind', { vol: 0.001 }) : null;
    /* The zone ambience is loaded ON ENTRY to its zone, not by the manifest —
       so it must NOT be in SFX_MANIFEST (which is fetched in full at unlock
       for every player), and it must resolve when asked for directly. */
    let ambDecoded = false, ambSeconds = null;
    if (ambUrl) {
      await A.loadSample('zoneamb-sky', ambUrl).catch(() => {});
      const ab = A._samples && A._samples['zoneamb-sky'];
      ambDecoded = !!ab;
      ambSeconds = ab ? +ab.duration.toFixed(1) : null;
    }
    return {
      inManifest: true, url,
      decoded: !!buf,
      seconds: buf ? +buf.duration.toFixed(2) : null,
      played: !!handle,
      whirlInManifest: !!whirlUrl,
      whirlDecoded: !!wbuf,
      whirlSeconds: wbuf ? +wbuf.duration.toFixed(2) : null,
      whirlPlayed: !!whandle,
      ambUrl: ambUrl || null,
      ambInSfxManifest: !!(A.SFX_MANIFEST && A.SFX_MANIFEST['zoneamb-sky']),
      ambDecoded, ambSeconds,
    };
  });
  if (sfx.__no) {
    rec.skip('shield bash sfx', 'BT_AUDIO not reachable from the page');
  } else {
    rec.ok('the shield-bash sound is in the SFX manifest', sfx.inManifest === true, sfx);
    rec.ok('...and decodes in a Chromium-class browser (the v2.3.1610 m4a trap)',
      sfx.decoded === true, sfx);
    /* The upload was 8.04s of which 7.6s was silence; it is trimmed to the
       impact.  A regression that re-imported the raw file would pass the two
       checks above and quietly ship 257KB of dead air. */
    rec.ok('...and is trimmed to the impact, not the 8s upload',
      typeof sfx.seconds === 'number' && sfx.seconds > 0.2 && sfx.seconds < 1.5, sfx);
    rec.ok('...and play() returns a real handle', sfx.played === true, sfx);
    /* v2.3.1738: the whirlwind cast sound. */
    rec.ok('the whirlwind sound is in the manifest and decodes',
      sfx.whirlInManifest === true && sfx.whirlDecoded === true, sfx);
    rec.ok('...is trimmed to the swell, not the 4.7s upload',
      typeof sfx.whirlSeconds === 'number' && sfx.whirlSeconds > 1 && sfx.whirlSeconds < 3.2, sfx);
    rec.ok('...and play() returns a real handle', sfx.whirlPlayed === true, sfx);
    /* v2.3.1738: the Wind Dunes ambience.  The important half is the SECOND
       assertion — a 900KB loop in SFX_MANIFEST would be fetched by every
       player at unlock, in every zone, which is the cost the owner cut ~40MB
       of music to avoid. */
    rec.ok('Wind Dunes has a zone ambience registered', !!sfx.ambUrl, sfx);
    rec.ok('...loaded per-zone, NOT eagerly with every other sfx',
      sfx.ambInSfxManifest === false, sfx);
    rec.ok('...and it decodes as a long loop', sfx.ambDecoded === true
      && typeof sfx.ambSeconds === 'number' && sfx.ambSeconds > 10, sfx);
  }

  /* The WIRING, which is the half that can rot silently: startZoneAmbient is
     the one choke point every zone change funnels through, and the ambience
     has to start there and stop again on the way out.  Loading the sample
     (above) proves the file; this proves the hook. */
  const amb = await P.page.evaluate(async () => {
    const A = window.BT_AUDIO;
    if (!A || !A.ZONE_AMBIENT) return { __no: true };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    try { A.unlock && A.unlock(); } catch (e) {}
    A._currentZoneAmbient = null;          /* force the change to be seen */
    A.startZoneAmbient('sky');
    for (let i = 0; i < 40; i++) {
      if (A._sfxLoops && A._sfxLoops['zoneamb-sky']) break;
      await sleep(100);
    }
    const inSky = !!(A._sfxLoops && A._sfxLoops['zoneamb-sky']);
    A.startZoneAmbient('town');            /* walk out */
    await sleep(300);
    const inTown = !!(A._sfxLoops && A._sfxLoops['zoneamb-sky']);
    return { inSky, inTown, key: A._zoneAmbientKey || null };
  });
  if (amb.__no) {
    rec.skip('zone ambience wiring', 'BT_AUDIO.ZONE_AMBIENT not reachable');
  } else {
    rec.ok('entering Wind Dunes starts the wind loop', amb.inSky === true, amb);
    /* Without this the loop would follow you into every other zone for the
       rest of the session — the failure mode of a start with no stop. */
    rec.ok('...and leaving it stops the loop', amb.inTown === false, amb);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     v2.3.1765: A CAST DOES NOT OVERTAKE THE POSITION IT IS AIMED FROM
     Owner: "Shield bash always seems to miss if I activate it while I'm
     moving while I hit the monster with it."

     abilities.js picks its target within cfg.radius (70px) of ps.x/ps.y — the
     WORKER's copy of where you are.  The move rate drops to 198ms when nobody
     shares your zone (wsClient's adaptive gap, justified on the grounds that
     your own movement is client-predicted so the rate "changes nothing you can
     feel"), and the `ability` frame is sent immediately while the freshest
     move sits held in the batcher.  Running, alone, that copy is ~40px behind
     a 70px reach with no slack in it — so the bash whiffs, and only while
     moving.  The fix flushes the held move first.

     ASKED OF THE WORKER, not of the browser.  Two other framings were tried
     and are worth recording as dead ends:
       - "read the worker's position after the cast" is VACUOUS.  The batch
         timer keeps running, so the position catches up within a frame or two
         and the read agrees whether or not the cast was aimed correctly.
       - "watch the frame order on the socket" cannot be instrumented from
         HERE.  A prototype wrap installed mid-scenario records nothing at all
         (verified — zero frames, keepalive included), because the socket code
         has already captured its own reference to send by then.  It CAN be
         done, but only from a script that runs before the page does:
         tools/qa/qa-move-rate.mjs hooks WebSocket.prototype.send at document
         start and reads every outgoing move successfully.
     What settles it is the position the SERVER measured the cast from, which
     it now records (ps._abilFrom, surfaced as live.abilFrom).  That is a
     single instant and no later move can rewrite it.

     The cast is sent directly rather than through castAbility because the
     ability is level-gated (see the header) and the worker will refuse it —
     which does not matter to this check twice over: the flush lives in the
     channel shim keyed on message type, and the stamp is taken before the
     gates. ═════════════════════════════════════════════════════════════════ */
  /* v2.3.2081: SOUTH, not north.  This held 'w' and ran the player straight
     into the FOUNTAIN: TOWN_SPAWN is (910, 1130) and the basin's footprint
     stamps the prop grid solid up to y 1088, so 800ms of north travel ended
     pressed against it and the 500ms after the cast moved 0.05px — which
     failed the guard below rather than the thing under test, because there is
     nothing stale about a player who is standing still.  South of the spawn
     is 250px of open plaza (tools/dev/town-lanes.mjs 910 1380) and the
     direction is nothing to this check; only the running is. */
  await P.page.keyboard.down('s');
  await P.page.waitForTimeout(800);
  const cast = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.channel || !S.player) return null;
    const x0 = S.player.x, y0 = S.player.y;
    S.channel.send({ type: 'ability', payload: { kind: 'bash' } });
    return { x: Math.round(x0 * 10) / 10, y: Math.round(y0 * 10) / 10 };
  });
  /* v2.3.2083: 500 -> 1400ms.  The guard below needs 30px of travel after the
     cast, and a solo player moves about 40px/s here (the adaptive 198ms move
     gap when nobody shares your zone), so 500ms could only ever produce ~20 --
     the guard was unreachable at this speed whatever the client did.  The
     CAST's timing is untouched; this only lengthens the run after it. */
  await P.page.waitForTimeout(1400);
  await P.page.keyboard.up('s');
  await P.page.waitForTimeout(400);
  rec.ok('the cast could be dispatched while running', !!cast, cast);

  const live = (await H.adminPlayer(wsPort, myId).catch(() => ({}))).live || {};
  const from = live.abilFrom || null;
  rec.ok('the WORKER recorded where it measured the cast from', !!from, live);
  if (from && cast) {
    /* GUARD: the whole check turns on the player having been genuinely in
       motion.  Standing still there is nothing to be stale about, and a fixed
       and an unfixed client would agree to the pixel. */
    const moved = await P.page.evaluate((c) => {
      const S = window._gameState.current;
      return Math.hypot(S.player.x - c.x, S.player.y - c.y);
    }, cast);
    rec.ok('...and the player really was running (guard: staleness needs motion)',
      moved > 30, { movedAfterCast: moved, cast, from });
    /* THE ASSERTION.  1.5px, not a generous band: the flushed move carries the
       position rounded to 0.1, so a correct client lands at ~0 and the only
       tolerance needed is that rounding.
       BE HONEST ABOUT THE MAGNITUDE HERE.  Measured on this machine the
       unfixed client aimed 2.8px behind — real, and reliably red against the
       threshold below, but nowhere near enough on its own to explain "always
       misses".  The gap is (held-move age + network hop) x speed, and all
       three are at their smallest in a headless run on loopback: no cellular
       RTT, and a peer-free room does not necessarily sit on the 198ms solo
       gate for the whole window.  What this pins is the ORDERING defect, which
       is real at any scale; what it cannot pin is the owner's phone. */
    rec.ok('the cast was measured from where the player ACTUALLY was',
      Math.hypot(from.x - cast.x, from.y - cast.y) <= 1.5,
      { from, cast, drift: +Math.hypot(from.x - cast.x, from.y - cast.y).toFixed(2) });
  }

  /* ═══ v2.3.2258: THE SWORD'S OPENING LUNGE ═══
     Owner: "For ONLY melee (sword) ... the default first attack will be very
     similar to 'shield bash' (you can even re-use the mechanic but for sword)
     and keep the stun enemy effect.  I've been feeling like melee is a little
     underpowered so this should help.  Also make the cost of sword dash 10%
     stamina."

     Three claims, and the third is the one that would ship broken quietly: it
     must NOT fire for a bow, because "ONLY melee (sword)" is the whole first
     clause of the sentence and a ranged lunge would be invisible in play until
     someone noticed their stamina draining at range. */
  const dashSetup = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'melee';
    /* A sword in hand: abilityStatus gates `equipped` on R.weapon for a
       needs:'weapon' ability, and this fixture's character starts bare-handed. */
    if (!S.rpg.weapon) S.rpg.weapon = { name: 'QA Sword', type: 'sword', gearBase: 'ws_iron', quality: 'normal', tierMult: 1 };
    S.rpg.stamina = S.rpg.maxStamina || 100;
    S._shieldUp = false;
    S._abilCd = null;
    S._serverMonsters = false;
    S.monsters = [{
      id: 'qa_dash_1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: S.player.x + 150, y: S.player.y, renderX: S.player.x + 150, renderY: S.player.y,
      hp: 9000, curHp: 9000, maxHp: 9000, dmg: 0, level: 1, gold: 0, spd: 0, vx: 0, vy: 0,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [],
    }];
    S.lockedTarget = { type: 'monster', id: 'qa_dash_1', ref: S.monsters[0], src: 'tap' };
    const _st = window.__btAbilityStatus ? window.__btAbilityStatus('sworddash') : null;
    return { stam: S.rpg.stamina, max: S.rpg.maxStamina || 100, slot: S.rpg.activeSlot, status: _st };
  });
  rec.ok('guard: a melee character, full stamina, locked on a monster 150px away',
    dashSetup.slot === 'melee' && dashSetup.stam === dashSetup.max, dashSetup);

  const dashed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const before = S.rpg.stamina;
    const ok = window.__btMaybeSwordDash ? window.__btMaybeSwordDash() : null;
    return { ok, before, after: S.rpg.stamina, dash: S._bashDash ? { id: S._bashDash.targetId } : null };
  });
  rec.ok('pressing attack on a locked monster fires the lunge', dashed.ok === true, dashed);
  rec.ok(`...and it costs 10% of the bar (${dashed.before} -> ${dashed.after} of ${dashSetup.max})`,
    Math.abs((dashed.before - dashed.after) - Math.ceil(dashSetup.max * 0.10)) <= 1, dashed);
  rec.ok('...and it names the monster it is closing on, so the dash has a destination',
    !!dashed.dash && dashed.dash.id === 'qa_dash_1', dashed);

  /* The cooldown is what makes it "the FIRST attack" -- see maybeSwordDash. */
  const twice = await P.page.evaluate(() => (window.__btMaybeSwordDash ? window.__btMaybeSwordDash() : null));
  rec.ok('...and the very next press does NOT lunge again (it is the first attack, not every attack)',
    twice === false, { second: twice });

  /* ── and never with a bow ── */
  const bowDash = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'ranged';
    S.rpg.rangedWeapon = S.rpg.rangedWeapon || { name: 'Pine Bow', type: 'bow', gearBase: 'ww_pine', quality: 'normal', tierMult: 1 };
    S.rpg.stamina = S.rpg.maxStamina || 100;
    S._abilCd = null;
    const before = S.rpg.stamina;
    const ok = window.__btMaybeSwordDash ? window.__btMaybeSwordDash() : null;
    return { ok, before, after: S.rpg.stamina };
  });
  rec.ok('a BOW never lunges -- "For ONLY melee (sword)"', bowDash.ok === false, bowDash);
  rec.ok('...and it costs a ranged character nothing', bowDash.after === bowDash.before, bowDash);

  await P.ctx.close().catch(() => {});
}
