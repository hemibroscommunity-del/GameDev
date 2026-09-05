/* ═══ THE THREE MONSTER COMBAT CUES (v2.3.2295) ═══
 *
 * Owner, three asks in one message:
 *   1. "on the monsters when they notice you put a brief exclamation point
 *      over their head to cue you in that you're being targeted"
 *   2. "change the monster name plate to a red background when they're
 *      actively attacking you"
 *   3. (the target chip -- asserted in mp-lockrings, which already owns the
 *      question of how many marks a target wears)
 *
 * THIS RUNS AGAINST REAL SERVER MONSTERS, and that is the whole point. Both
 * cues are the far end of a chain that starts in the worker: the notice is the
 * worker's own `m.targetId` arriving as the tick field `tg` and the client
 * spotting the edge; the red plate is the worker's `monster_attack` naming you
 * as the victim. A scenario that injected local monsters and set the two
 * fields by hand would assert the renderer and prove nothing about the chain
 * -- and the chain is exactly where this was broken: `_aggroTs` and the flash
 * it drives have existed since the local-AI days and have never once fired for
 * a real player, because monsterCombat.js skips all local AI when the server
 * owns the monsters. The cue was in the code and not in the game.
 *
 * So: walk out to a spoke zone, stand next to a live server monster, and watch.
 */
import * as H from './harness.mjs';

const TILE = 32;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

/* Sample the renderer's own per-frame plate probe, plus the wire field the two
   cues are supposed to be reading. Both together, so a failure says which half
   of the chain broke rather than only that the screen is wrong. */
const sample = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  const pl = window.__btMonsterPlates;
  const plates = (pl && pl.plates) ? pl.plates.slice() : [];
  const mons = (S && S.monsters) ? S.monsters.filter((m) => m.alive !== false).map((m) => ({
    id: m.id, tg: m.tg === undefined ? '(absent)' : m.tg, tgPrev: m._tgPrev === undefined ? '(absent)' : m._tgPrev,
    aggroTs: m._aggroTs || 0, atkMeUntil: m._atkMeUntil || 0,
    dist: Math.round(Math.hypot((m.x || 0) - S.player.x, (m.y || 0) - S.player.y)),
  })) : [];
  return { myId: S && S.myId, serverMonsters: !!(S && S._serverMonsters), plates, mons,
    hp: (S && S.rpg) ? S.rpg.hp : null, zone: S && S.currentZone };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const out = `${H.REPO}/tools/qa/mp/out`;
  const P = await H.newPlayer(browser, {
    name: 'Cue', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* Out to a spoke zone, the mp-lockrings / mp-dashhit route. Town has no
     monsters, and the tutorial quests are what unlock the exits. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1800);
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'verdant')
        || (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId !== 'town') || null,
    };
  });
  if (!marks.townOut || !marks.spoke) {
    rec.skip('the monster cues can be watched in a combat zone', 'no exit tables');
    await P.ctx.close().catch(() => {}); return;
  }
  await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'World View' }).catch(() => {});
  await P.page.waitForTimeout(800);
  await stand(P, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z !== 'worldview' && z !== 'town',
    { timeout: 30000, label: 'a monster zone' }).catch(() => {});
  await P.page.waitForTimeout(2500);

  const arrived = await sample(P);
  rec.ok('we are in a zone the WORKER owns the monsters of (guard)',
    arrived.serverMonsters === true && arrived.mons.length > 0,
    { serverMonsters: arrived.serverMonsters, monsters: arrived.mons.length });
  if (!arrived.serverMonsters || !arrived.mons.length) {
    await P.ctx.close().catch(() => {}); return;
  }

  /* ═══ PICK A MONSTER THAT IS NOT ALREADY ON US ═══
     Two earlier cuts of this got the baseline wrong in opposite directions.
     The first asserted "on arrival nothing is cued" and stepped in: where the
     zone gate drops you decides whether a slime is already chasing, and a
     monster that has been chasing since the snapshot has no EDGE left to show
     -- correct behaviour, reported as a missing cue. The second walked away
     from the pack to make a clean baseline and walked out of the map: the run
     came back standing in the World View with no monsters and a plate probe
     frozen on its last combat frame, which then read as "the cues never
     cleared". A scenario that leaves the place it is testing measures a stale
     array, not a cooldown.

     So neither: CHOOSE. Take the nearest monster that the worker is not
     already chasing us with, assert that this one is uncued, and provoke that
     one. The control is now about the specific monster under test rather than
     about the whole zone, which is the stronger claim anyway -- and nothing
     has to move except the one short step into its aggro range. */
  const clean = arrived.mons
    .filter((m) => m.tg !== arrived.myId)
    .filter((m) => {
      const pl = arrived.plates.find((p) => p.id === m.id);
      return !pl || (!pl.notice && !pl.alarm);
    })
    .sort((a, b) => a.dist - b.dist)[0] || null;
  rec.ok('there is a monster in the zone that is minding its own business '
    + '(guard)', !!clean, { clean, mons: arrived.mons });
  if (!clean) { await P.ctx.close().catch(() => {}); return; }
  rec.ok('...and it is cued in neither way while it is: no notice over its '
    + 'head, no red on its plate',
    (() => { const pl = arrived.plates.find((p) => p.id === clean.id);
      return !!pl && !pl.notice && !pl.alarm; })(),
    { plate: arrived.plates.find((p) => p.id === clean.id) });

  /* Step into its aggro range. The worker's own acquisition does the rest --
     deliberately, rather than writing targetId ourselves, since the field
     under test is the one the worker chooses. */
  await P.page.evaluate((id) => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.id === id);
    if (m) { S.player.x = (m.x || 0) - 34; S.player.y = m.y || 0; }
  }, clean.id);

  /* ── watch ──
     12s, not 25. Both cues are supposed to land within a beat of standing on
     something, and the only thing a longer window buys is more chances for a
     level-3 player to be killed by the monster under test -- which empties
     the zone, freezes the plate probe on its last frame, and turns every
     assertion after it into a reading of stale data. */
  const seen = { notice: null, alarm: null, alarmPlates: null };
  const t0 = Date.now();
  while (Date.now() - t0 < 12000 && !(seen.notice && seen.alarm)) {
    const s = await sample(P);
    if (!seen.notice) {
      /* Only while it is YOUNG. The cue holds full opacity for its first two
         thirds and then fades, and a headless screenshot costs a couple of
         hundred ms -- so a shot fired at any old point in the window comes
         back showing the mark on its way out, which reads as a mark that is
         not drawing properly. Photograph it at full strength or not at all. */
      const n = s.plates.find((p) => p.notice && p.id === clean.id && p.noticeAge < 260);
      if (n) {
        seen.notice = { plate: n, mon: s.mons.find((m) => m.id === n.id) || null, ms: Date.now() - t0 };
        /* CLIPPED, and that is not a cosmetic choice. A full-page shot of a
           780x1688 canvas at dpr 2 takes several hundred ms in headless, and
           the cue lives 1100ms with its last third fading -- so the first
           version of this photographed the mark at ~15% opacity every time and
           read, in the crop, as a fill that was not working. The mark was
           fine; the camera was slow.
           Framed on the MONSTER, converted through the same camera the
           renderer uses (mp-lockrings' boxFor). A fixed rectangle was the
           second try and it put the subject in the corner: the player is
           centred horizontally but not vertically, because the dashboard owns
           the bottom third. */
        const _clip = await P.page.evaluate((mid) => {
          const S = window._gameState.current;
          const m = (S.monsters || []).find((x) => x.id === mid);
          const cv = document.querySelector('canvas');
          if (!m || !cv || !S.camera) return null;
          const r = cv.getBoundingClientRect();
          const cx = r.left + ((m.renderX != null ? m.renderX : m.x) - S.camera.x) * (S._worldScaleX || 1);
          const cy = r.top + ((m.renderY != null ? m.renderY : m.y) - S.camera.y) * (S._worldScaleY || 1);
          /* taller than wide, and biased UPWARD: everything being framed --
             the chip, the HP bar, the "!" -- is above the monster. */
          const x = Math.max(0, Math.round(cx - 110)), y = Math.max(0, Math.round(cy - 200));
          return { x: x, y: y,
            width: Math.min(innerWidth - x, 220), height: Math.min(innerHeight - y, 280) };
        }, clean.id);
        /* RE-ARM FOR THE CAMERA, and be plain about what that is. Every
           assertion in this file reads the cue as the worker produced it --
           this line does not feed any of them. It exists because a headless
           screenshot takes long enough (evaluate, clip maths, capture) that
           the shot lands in the cue's fade however early it is fired, and a
           photograph of a mark at 8% opacity is what sent two rounds of this
           work chasing a fill that was never broken. Re-stamping _aggroTs
           restarts the SAME cue, so what is photographed is the real mark at
           the strength a player sees on its first frame. */
        await P.page.evaluate((id) => {
          const S = window._gameState.current;
          const m = (S.monsters || []).find((x) => x.id === id);
          if (m) m._aggroTs = Date.now();
        }, clean.id);
        await P.page.waitForTimeout(70);
        await P.page.screenshot(Object.assign({ path: `${out}/moncue-notice.png` },
          _clip && _clip.width > 60 ? { clip: _clip } : {})).catch(() => {});
      }
    }
    if (!seen.alarm) {
      const a = s.plates.find((p) => p.alarm && p.id === clean.id);
      if (a) {
        seen.alarm = { plate: a, mon: s.mons.find((m) => m.id === a.id) || null, ms: Date.now() - t0 };
        seen.alarmPlates = s.plates.map((p) => ({ id: p.id, alarm: p.alarm, levelFill: p.levelFill, pillKey: p.pillKey }));
        await P.page.screenshot({ path: `${out}/moncue-alarm.png` }).catch(() => {});
      }
    }
    /* Poll fast. The cue lives 1100ms and holds full opacity for the first
       two thirds of it, so a slow loop lands the screenshot in the fade and
       photographs a mark on its way out -- which is what the first crop of
       this showed, and it is not what the player sees. */
    await P.page.waitForTimeout(55);
  }

  /* ═══ 1. IT NOTICED YOU ═══ */
  rec.ok('a monster put the notice cue up once we stood next to it',
    !!seen.notice, { seen: seen.notice, after: seen.notice && seen.notice.ms });
  /* ...on the monster the WORKER says is chasing us, not on some other one.
     This is the assertion that makes the cue mean what it says: without it a
     renderer that flashed every monster in the zone would pass the one above. */
  rec.ok('...on the monster the worker says is chasing US, and no other',
    !!(seen.notice && seen.notice.mon && seen.notice.mon.tg === arrived.myId),
    { mon: seen.notice && seen.notice.mon, myId: arrived.myId });

  /* ═══ 2. IT IS ATTACKING YOU ═══ */
  rec.ok('...and its name plate turns red once it starts hitting us',
    !!seen.alarm, { seen: seen.alarm, after: seen.alarm && seen.alarm.ms });
  /* The control for the red, at the same instant: the other monsters in the
     zone are not hitting us and must not be wearing it. A plate that went red
     for everything would satisfy the assertion above. */
  rec.ok('...while the monsters that are NOT hitting us keep their normal plate',
    !!seen.alarmPlates && seen.alarmPlates.length > 1
      && seen.alarmPlates.filter((p) => p.alarm).length < seen.alarmPlates.length,
    { plates: seen.alarmPlates });
  /* The LEVEL line has to move with the fill -- the same light-fill-keeps-the-
     dark-ink trap TRAPS §48 records for the trade lanes. #D8AA58 measures
     4.85:1 on the alarm red and the danger #ef4444 only 1.9:1, so the ramp
     travels with the ground or the plate says "LV 1" in a colour you cannot
     read at the exact moment you want to read it. */
  rec.ok('...and the LV line takes the alarm ramp with it, not the brass one',
    !!(seen.alarm && /ffd9d9/i.test(String(seen.alarm.plate.levelFill || ''))),
    { levelFill: seen.alarm && seen.alarm.plate.levelFill });
  /* ...and the plate was actually REPAINTED for it. The rounded rect behind
     the text is rebuilt only when the plate's cache key changes, and for a
     monster the name and level never change after the first frame -- so an
     alarm state left out of that key would set the flag, satisfy every
     assertion above, and leave the plate dark for the life of the monster.
     The key is the only thing that can tell those two apart from outside. */
  rec.ok('...and the plate was rebuilt for the alarm, not merely flagged for it',
    !!(seen.alarm && /\|!$/.test(String(seen.alarm.plate.pillKey || ''))),
    { pillKey: seen.alarm && seen.alarm.plate.pillKey });

  /* ═══ THE TWO ABOVE-HEAD MARKS DO NOT SIT ON EACH OTHER ═══
     The notice "!" and the target chip are drawn by different renderers into
     different coordinate spaces -- container-local in entityRenderer, world
     overlay in effectsRenderer -- so where one is relative to the other is a
     question neither file can answer and the eye answers badly. It was
     answered badly: a screenshot in which the "!" could not be found was read
     as the chip covering it, the mark was raised to clear a collision that was
     not happening, and the raise put it in the sky over the monster -- which
     produced the same screenshot and would have shipped.
     So it is a number now. Both marks report the world y they were drawn at,
     and the order between them is asserted rather than looked at. */
  const stack = await P.page.evaluate((id) => {
    const S = window._gameState.current;
    const pl = window.__btMonsterPlates;
    const p0 = (pl && pl.plates || []).find((x) => x.id === id) || null;
    const mk = ((window.__btAtkMark ? window.__btAtkMark() : []) || []).find((x) => x && x.id === id) || null;
    return { plate: p0, mark: mk, locked: !!(S.lockedTarget && S.lockedTarget.ref && S.lockedTarget.ref.id === id) };
  }, clean.id);
  console.log('    above-head stack (world y, smaller = higher): monster '
    + (stack.plate && stack.plate.my) + ', chip ' + (stack.mark && Math.round(stack.mark.y))
    + ', notice ' + (stack.plate && stack.plate.noticeY));
  rec.ok('the notice mark and the target chip are both reported for the same '
    + 'monster (guard)', !!(stack.plate && stack.plate.noticeY != null && stack.mark), stack);
  rec.ok('...and the "!" sits clear ABOVE the chip, not behind it',
    !!(stack.plate && stack.mark) && stack.plate.noticeY < stack.mark.y - 4, stack);

  /* ═══ AND BOTH CUES END ═══
     A cue that never clears is a decoration. Walk out of reach and the red has
     to lapse on its own -- there is no "stopped attacking" message, so this is
     the client's own window expiring, which is the half most likely to be
     written and never checked. */
  /* Walked, not flung. A single 2400px jump is what the first cut did and the
     worker simply refused it -- the anti-cheat clamps a step to what a player
     could have covered, so the client's own x/y snapped back and the monster
     never stopped swinging. Six hops of ~150px with a beat between each is
     inside the speed the server allows, and it clears the 120px aggro range
     several times over. */
  const zoneNow = arrived.zone;
  /* ═══ WALK SOMEWHERE THAT IS STILL IN THE ZONE ═══
     Two cuts of this walked a fixed direction for a fixed distance and both
     ended up in the World View -- a zone change empties S.monsters, the
     monster update loop stops, and the plate probe then holds its last combat
     frame forever, so the cooldown was being read off a photograph. Checking
     the zone between hops does not help: by the time currentZone changes you
     have already left.
     So the destination is chosen from inside the playable area rather than
     guessed. The monsters' own SPAWN points bound it -- the worker places them
     across the walkable region -- and the quietest corner of that box is the
     point in it farthest from every live monster. No map data needed, and it
     cannot walk off the edge because the edge is not in the box. */
  const dest = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const ms = (S.monsters || []).filter((m) => m.alive !== false);
    if (!ms.length) return null;
    const xs = ms.map((m) => m.spawnX != null ? m.spawnX : m.x);
    const ys = ms.map((m) => m.spawnY != null ? m.spawnY : m.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    let best = null;
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        const px = x0 + (x1 - x0) * (i / 4), py = y0 + (y1 - y0) * (j / 4);
        const d = Math.min(...ms.map((m) => Math.hypot((m.x || 0) - px, (m.y || 0) - py)));
        if (!best || d > best.d) best = { x: px, y: py, d: d };
      }
    }
    return best;
  });
  for (let hop = 0; hop < 12 && dest; hop++) {
    const done = await P.page.evaluate((t) => {
      const S = window._gameState.current;
      const dx = t.x - S.player.x, dy = t.y - S.player.y;
      const d = Math.hypot(dx, dy);
      if (d < 20) return true;
      const step = Math.min(120, d);
      S.player.x += (dx / d) * step;
      S.player.y += (dy / d) * step;
      return false;
    }, dest);
    if (done) break;
    await P.page.waitForTimeout(300);
  }
  let cooled = null, lastCold = null;
  const t1 = Date.now();
  while (Date.now() - t1 < 20000) {
    const s = await sample(P);
    lastCold = { zone: s.zone, hp: s.hp, monsters: s.mons.length,
      plates: s.plates.map((p) => ({ id: p.id, alarm: p.alarm, notice: p.notice })),
      nearest: s.mons.length ? Math.min(...s.mons.map((m) => m.dist)) : null,
      chasing: s.mons.filter((m) => m.tg === s.myId).map((m) => m.id) };
    /* `s.mons.length` in the condition, not just `s.plates.length`. The plate
       probe is rebuilt inside the monster update loop, so when that loop stops
       running -- no monsters in the zone, because the player died and
       respawned in town -- the LAST frame's plates sit in it unchanged, red
       state and all. The first cut of this walked far enough (and stood there
       long enough) to do exactly that, and then read a 20-second-old snapshot
       as a live one. A cooldown asserted against a frozen probe is not a
       cooldown. */
    if (s.zone === zoneNow && s.mons.length && s.plates.length
      && s.plates.every((p) => !p.alarm && !p.notice)) { cooled = { ms: Date.now() - t1 }; break; }
    await P.page.waitForTimeout(150);
  }
  rec.ok('both cues lapse once the monster stops attacking -- neither is a '
    + 'sticker', !!cooled, { cooled, lastCold });

  await P.page.screenshot({ path: `${out}/moncue-cold.png` }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
