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
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'ability', payload: { kind: 'bash' } });
  });
  await P.page.waitForTimeout(1500);

  const wire = await H.wireCounts(P);
  rec.ok('the client tried to send `ability`', (wire.ability || 0) >= 1, wire);

  const popups = await P.page.evaluate(() => (window.__popups || []).slice());
  /* ONLY the worker knows the unlock level — the client-side refusal path
     never produces this string, so seeing it proves the round trip. */
  rec.ok('the worker refused it and the client SAID SO (ability_rejected has a handler now)',
    popups.some((t) => typeof t === 'string' && /unlocks at level 4/i.test(t)), popups);

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
  const fakeButtons = await P.page.evaluate(() => document.querySelectorAll('[data-ability]').length);
  rec.ok('with the level present, BOTH ability buttons render', fakeButtons === 2, fakeButtons);
  await P.page.evaluate(() => {
    const el = document.querySelector('[data-ability="bash"]');
    if (el) el.click();
  });
  await P.page.waitForTimeout(1500);
  const fakePopups = await P.page.evaluate(() => (window.__popups || []).slice());
  rec.ok('...but the worker still refuses it (the level it checks is its own)',
    fakePopups.some((t) => typeof t === 'string' && /unlocks at level 4/i.test(t)), fakePopups);
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
    if (!url) return { inManifest: false };
    try { A.unlock && A.unlock(); } catch (e) {}
    try { A.loadSfxManifest && A.loadSfxManifest(); } catch (e) {}
    /* the fetch+decode is async; give it a moment */
    for (let i = 0; i < 40; i++) {
      if (A._samples && A._samples['shield-bash']) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const buf = A._samples && A._samples['shield-bash'];
    const handle = buf ? A.play('shield-bash', { vol: 0.001 }) : null;
    return {
      inManifest: true, url,
      decoded: !!buf,
      seconds: buf ? +buf.duration.toFixed(2) : null,
      played: !!handle,
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
  }

  await P.ctx.close().catch(() => {});
}
