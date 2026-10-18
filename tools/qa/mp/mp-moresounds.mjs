/* ═══ v2.3.3398: THE SECOND ROUND OF SOUNDS, HEARD ON A PHONE ═══
 *
 * The owner, 2026-10-18, after the first round (mp-soundcues): "Look for more
 * too".  These moments still called collect() or beep(), both silent since
 * v2.3.1103, or nothing; each now plays a cue made from recordings already in
 * the game (data/eventSounds.js; the table and every call site are held by
 * server/test/sound-cues.test.mjs §9).  This plays them through the game's
 * own handlers -- window.__btDispatch for the room's events, window.__btWsEvent
 * for whole socket messages -- on a page in the Wheel's BroTown:
 *
 *   0. the sound is up and the new cues' samples were decoded on the loading
 *      screen;
 *   1. the Gambling Den: the dice won and lost, coins into the weekly pot, the
 *      pot drawn for you -- and nothing when it is someone else's;
 *   2. the arena: a stake put down, paid, lost;
 *   3. a guild's quest turned in: the turn-in chime;
 *   4. a duel challenge and a trade invite (a second challenge at once held
 *      back by its gap);
 *   5. an alliance war won and lost (a draw in words only);
 *   6. pets: a Gobling taken out (the pop, then the goblin's own voice, small),
 *      put away, a Pebbling taken out (the pop, no voice of its own yet),
 *      released;
 *   7. the farm: a crop pulled from its bed;
 *   8. the forge: near the Blacksmith's door its anvil strikes, by distance;
 *      across the town it does not;
 *   9. no page errors.
 *
 *   node tools/qa/mp/run.mjs moresounds
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Earful', wsPort, webPort, viewport: VIEW, world: 'wheel' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const done = async () => { stopAlive = true; await P.ctx.close().catch(() => {}); };
  const myId = await H.readState(P, (S) => S.myId);
  /* past the Mayor gate, and out of harm's way */
  await H.devOp(wsPort, 'quests', myId);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
  await P.page.waitForTimeout(1500);

  /* ── 0. the sound is up, the new cues' samples decoded ── */
  const NEW = ['farmHarvest', 'betIn', 'betWon', 'betLost', 'jackpotWin', 'guildQuest', 'warWon', 'warLost', 'arenaJoin',
    'petOut', 'petAway', 'petFree', 'rested', 'duelAsk', 'tradeAsk', 'anvil'];
  const audio = await P.page.evaluate(async (NEW) => {
    const A = window.BT_AUDIO, C = window.__btCues;
    if (!A || !C) return { probe: !!C, audio: !!A };
    if (!A.ctx) { try { A.unlock(); } catch (e) { /* reported below */ } }
    if (A.ctx && A.ctx.state !== 'running') { try { await A.ctx.resume(); } catch (e) { /* reported below */ } }
    const keys = C.keys();
    const t0 = Date.now();
    while (Date.now() - t0 < 25000 && !keys.every((k) => A._samples && A._samples[k])) await new Promise((r) => setTimeout(r, 250));
    const names = C.names();
    C.reset();
    const silent = NEW.filter((n) => names.indexOf(n) < 0 || !C.play(n, 0.05));
    return { probe: true, ctx: !!A.ctx, state: A.ctx && A.ctx.state, muted: !!A.muted, missing: keys.filter((k) => !(A._samples && A._samples[k])),
      silent, forge: !!window.__btForge, trap: typeof window.__btTrap === 'function', ws: typeof window.__btWsEvent === 'function', dispatch: typeof window.__btDispatch === 'function' };
  }, NEW);
  rec.ok(`setup: in the Wheel (${zone}), the sound up (${audio.state}), and every one of the ${NEW.length} new cues starts (its samples decoded on the loading screen)`,
    zone === 'wheel' && audio.probe && audio.ctx && !audio.muted && (audio.missing || []).length === 0 && (audio.silent || []).length === 0
    && audio.forge && audio.trap && audio.ws && audio.dispatch, audio);
  if (!audio.ctx || audio.muted) { await done(); return; }

  /* things done on the page, and the cues they played */
  const cues = (fn, arg) => P.page.evaluate(async ({ src, arg }) => {
    const C = window.__btCues;
    C.reset();
    const f = new Function('arg', 'return (' + src + ')(arg)');
    const out = await f(arg);
    return { out, cues: C.stats.log.map((c) => ({ name: c.name, k: Math.round(c.k * 1000) / 1000, played: c.played })) };
  }, { src: fn.toString(), arg });
  const names = (r) => r.cues.map((c) => c.name).join('+') || 'nothing';
  const only = (r, ...want) => r.cues.length === want.length && want.every((n, i) => r.cues[i].name === n && r.cues[i].played);
  const ev = (type, payload) => cues((a) => { window.__btDispatch({ type: a.type, payload: a.payload }); return true; }, { type, payload });
  const ws = (type, payload) => cues((a) => window.__btWsEvent({ type: a.type, payload: a.payload }), { type, payload });

  /* ── 1. the Gambling Den ── */
  const diceWon = await ev('gamble_result', { won: true, wager: 100, payout: 200 });
  const diceLost = await ev('gamble_result', { won: false, wager: 100 });
  rec.ok(`1a. the dice: won (${names(diceWon)}), lost (${names(diceLost)})`, only(diceWon, 'betWon') && only(diceLost, 'betLost'), { diceWon, diceLost });
  const potIn = await ev('jackpot_state', { pool: 900, yourTickets: 2, deposited: 100 });
  const potMine = await ev('jackpot_result', { period: 'qa', amount: 900, winnerId: myId, winnerName: 'Earful' });
  const potTheirs = await ev('jackpot_result', { period: 'qa', amount: 900, winnerId: 'bp_someoneelse', winnerName: 'Someone' });
  rec.ok(`1b. the weekly pot: coins in (${names(potIn)}), drawn for you (${names(potMine)}), drawn for someone else (${names(potTheirs)})`,
    only(potIn, 'betIn') && only(potMine, 'jackpotWin') && potTheirs.cues.length === 0, { potIn, potMine, potTheirs });

  /* ── 2. the arena's stakes ── */
  const stIn = await ev('arena_stake_placed', { amount: 50, targetName: 'Bob' });
  const stWon = await ev('arena_stake_result', { won: true, payout: 150, amount: 50 });
  const stLost = await ev('arena_stake_result', { won: false, amount: 50 });
  rec.ok(`2. a stake on a gladiator: put down (${names(stIn)}), paid (${names(stWon)}), lost (${names(stLost)})`,
    only(stIn, 'betIn') && only(stWon, 'betWon') && only(stLost, 'betLost'), { stIn, stWon, stLost });

  /* ── 3. a guild's quest ── */
  const gq = await ev('guild_quest_result', { skill: 'mining', index: 0, gold: 100, ap: 5 });
  rec.ok(`3. a guild's quest turned in: the turn-in chime (${names(gq)})`, only(gq, 'guildQuest'), gq);

  /* ── 4. invites ── */
  const duel = await cues((a) => {
    window.__btDispatch({ type: 'duel_request', payload: { target: a.me, from: 'bp_qaduel', fromName: 'Duelist' } });
    window.__btDispatch({ type: 'duel_request', payload: { target: a.me, from: 'bp_qaduel', fromName: 'Duelist' } });
    return window.__btCues.stats.gapped;
  }, { me: myId });
  const notMe = await ev('duel_request', { target: 'bp_someoneelse', from: 'bp_qaduel', fromName: 'Duelist' });
  const trade = await ev('trade2_invite', { from: 'bp_qatrade', fromName: 'Trader' });
  rec.ok(`4. a duel challenge (${names(duel)}, a second at once held back: ${duel.out > 0}), one meant for someone else (${names(notMe)}), a trade invite (${names(trade)})`,
    only(duel, 'duelAsk') && duel.out > 0 && notMe.cues.length === 0 && only(trade, 'tradeAsk'), { duel, notMe, trade });

  /* ── 5. an alliance war's end ── */
  const warW = await ws('alliance_war_end', { won: true, us: 3, them: 1, vs: 'QAZ', paid: 500 });
  const warL = await ws('alliance_war_end', { won: false, us: 1, them: 3, vs: 'QAZ', paid: 0 });
  const warD = await ws('alliance_war_end', { won: null, us: 0, them: 0, vs: 'QAZ', paid: 0 });
  rec.ok(`5. an alliance war: won (${names(warW)}), lost (${names(warL)}), drawn (${names(warD)}: words only)`,
    only(warW, 'warWon') && only(warL, 'warLost') && warD.cues.length === 0, { warW, warL, warD });

  /* ── 6. pets ── */
  const book0 = await H.readState(P, (S) => (S._petBook ? JSON.parse(JSON.stringify(S._petBook)) : null));
  const pets = [{ id: 'qa-gob', kind: 'gobling', name: 'Gob', lv: 1, xp: 0 }, { id: 'qa-peb', kind: 'pebbling', name: 'Peb', lv: 1, xp: 0 }];
  const book = (active, op, list) => ({ v: 1, cap: 10, active, list: list || pets, journal: {}, op });
  const gobOut = await ws('pets_state', book('qa-gob', 'active'));
  const gobVoice = await P.page.evaluate(() => window.__btTrap().petVoice);
  await P.page.waitForTimeout(350);   /* past petOut's gap */
  const away = await ws('pets_state', book(null, 'active'));
  await P.page.waitForTimeout(350);
  const pebOut = await ws('pets_state', book('qa-peb', 'active'));
  const pebVoice = await P.page.evaluate(() => window.__btTrap().petVoice);
  const freed = await ws('pets_state', book(null, 'release', [pets[0]]));
  rec.ok(`6a. a Gobling taken out: the pop (${names(gobOut)}), then the goblin's own voice, small (${gobVoice})`, only(gobOut, 'petOut') && gobVoice === 'goblin-rawr', { gobOut, gobVoice });
  rec.ok(`6b. put away (${names(away)}); a Pebbling out (${names(pebOut)}, its own voice: ${pebVoice}); one released (${names(freed)})`,
    only(away, 'petAway') && only(pebOut, 'petOut') && pebVoice === 'none' && only(freed, 'petFree'), { away, pebOut, pebVoice, freed });
  /* the page's own pets back as they were */
  if (book0 && !book0.unavailable) await P.page.evaluate((b) => window.__btWsEvent({ type: 'pets_state', payload: Object.assign({}, b, { op: undefined }) }), book0);

  /* ── 7. the farm ── */
  const crop = await ws('farm_state', { plots: [], now: Date.now(), did: { op: 'harvest', n: 1, items: { crop_carrot: 1 } } });
  rec.ok(`7. a crop pulled from its bed: the soil and a pop (${names(crop)})`, only(crop, 'farmHarvest'), crop);

  /* ── 8. the forge ── */
  let doors = [];
  for (let i = 0; i < 40 && !doors.some((d) => d.id === 'blacksmith'); i++) {
    doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
    if (!doors.some((d) => d.id === 'blacksmith')) await P.page.waitForTimeout(500);
  }
  const forge = doors.find((d) => d.id === 'blacksmith');
  rec.ok(`8. setup: the forge's door is known (${forge ? Math.round(forge.x) + ',' + Math.round(forge.y) : 'none'})`, !!forge, doors.map((d) => d.id));
  if (forge) {
    const R = await P.page.evaluate(() => window.__btForge.consts.ANVIL_R);
    /* in front of its steps */
    await H.hopTo(P, forge.x, forge.y + 70);
    const near = await cues(async () => {
      const F = window.__btForge;
      const n0 = F.st.played;
      F.soon();
      const t0 = Date.now();
      while (Date.now() - t0 < 4000 && F.st.played === n0) await new Promise((r) => setTimeout(r, 100));
      return { last: F.st.last, played: F.st.played - n0 };
    });
    const anvil = near.cues.filter((c) => c.name === 'anvil');
    rec.ok(`8a. at the forge's door its anvil strikes (${anvil.length ? 'share ' + anvil[0].k : 'nothing'}, ${near.out.last && near.out.last.d} px from it)`,
      anvil.length === 1 && anvil[0].played && anvil[0].k > 0.3 && anvil[0].k <= 0.6, near);
    /* across the town: past its reach */
    await H.hopTo(P, forge.x, forge.y + R + 400);
    const far = await cues(async () => {
      const F = window.__btForge;
      const n0 = F.st.played;
      F.soon();
      await new Promise((r) => setTimeout(r, 2500));
      return { played: F.st.played - n0 };
    });
    rec.ok(`8b. ${R + 400} px away it is not heard (${names(far)})`, far.out.played === 0 && far.cues.length === 0, far);
  }

  rec.ok('9. no page errors', errs.length === 0, errs.slice(0, 4));
  await done();
}
