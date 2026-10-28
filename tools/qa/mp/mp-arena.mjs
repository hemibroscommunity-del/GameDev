/* ═══ THE ARENA IN THE WORLD: A WHOLE TOURNAMENT ON PHONES (v2.3.3713) ═══
 *
 * The owner: "Also interested in bringing the arena to Brotown (the wheel map
 * only). Let me know how to start that."  The first step is to prove the
 * arena the worker already runs (server/src/gladiator.js, docs/specs/arena.md)
 * works end to end in today's world, on phones, and fix what breaks.  This
 * scenario played the RETIRED old map until v2.3.3713 (it was on the frozen
 * list in oldMap.mjs) and never ran a tournament at all: it poked the queue's
 * HTTP surface and skipped the panel as "unreachable".  Now it plays one.
 *
 * Five real players against a real worker, in the world's BroTown, on 390 px
 * touch phones: four gladiators and a spectator.
 *   1. SIGN-UP AT THE SHERIFF'S OFFICE: each walks to its steps, "Enter
 *      SHERIFF'S OFFICE", The arena, and the arena's window says "Enter Arena
 *      · 100G"; a real tap on it, and the WORKER takes the 100 gold and puts
 *      them in the queue, in the order they tapped.  The window then says "In
 *      Queue" and KEEPS saying it across its own polls (v2.3.3713: the
 *      worker's /status had no word on the asking player, so 3 s after
 *      joining the window showed "Enter Arena" again -- gladiator.js
 *      _arenaStatusFor).
 *   2. THE BRACKET: 60 s after the first entry the worker starts a bracket of
 *      four, two first-round matches in tap order; each fighter's phone is IN
 *      THE DUEL with its opponent (S._inDuel, its arena match named) and locked
 *      onto them -- v2.3.3713: arena_match_start set nothing, so in BroTown
 *      (safe ground) the phone sent no attack at a player at all and a match
 *      could only end on its 3-minute clock (gameEvents.js).  The window shows
 *      the fight card and the bracket.
 *   3. EVERY MATCH FOUGHT TO ITS END BY DAMAGE, through the real fight path: a
 *      real touch held on the attack disc, the game's own swing, player_attack,
 *      the worker's _resolvePvPAttack.  The loser hits back first (damage both
 *      ways), then falls; the worker records the win as 'kill', the loser's
 *      phone hears "Eliminated" and keeps its bag, and both phones leave the
 *      duel with one message, not two (v2.3.3713: "DUEL WON!" over "Arena
 *      win!").
 *   4. THE FINAL forms from the two winners, and two people back it on their
 *      phones through the arena window's Spectator Betting: the spectator, who
 *      never entered, on one finalist, and the first match's loser, now a
 *      spectator, on the other.  The worker escrows both stakes.
 *   5. THE CROWN: the final fought to a kill, the worker crowns the champion,
 *      pays the bracket's prize (250 a gladiator) and the 10% fighter's cut of
 *      the losing stake, and the Gladiator achievement's 500 AP once; the
 *      winning backer is paid their stake back and 90% of the losing one, the
 *      losing backer loses theirs; every phone hears the champion.
 *   6. No page errors.
 * Pictures: tools/qa/mp/out/arena-*.png.
 *
 * Run it as mp-crowdbots is run:
 *   BT_NO_TRACE=1 node tools/qa/mp/run.mjs arena
 * Five phones on this box's four cores with wrangler's own local tracing on
 * (harness.mjs startWorker; TRAPS §168) dropped sockets again and again: a
 * sign-up refused between a drop and the new session's token, a match's end
 * lost.  Without it a knockout takes ~25 s and the whole run ~8 minutes.
 *
 * Not here (the server suite's, arena.test.mjs): the shot clock's tiebreak,
 * walkovers, overflow refunds, the restart sweep, the house's hourly cap.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const ENTRY_FEE = 100;
const PRIZE_PER = 250;     /* server/src/gladiator.js ARENA.PRIZE_PER_ENTRANT */
const CHAMP_AP = 500;      /* the Gladiator achievement */
const BET_SPEC = 200, BET_LOSER = 100;

const api = async (wsPort, path) => {
  const r = await fetch(`http://127.0.0.1:${wsPort}/api/arena${path}`);
  return r.json().catch(() => null);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `arena-${name}.png`) }).catch(() => {});

  const NAMES = ['Gladius', 'Murmillo', 'Retiarius', 'Secutor'];
  /* one at a time, each in the world before the next opens (joinPair's note) */
  /* each kept awake from the moment it is in: the page hangs up after two
     idle minutes (mp-afk), and opening five takes longer than that -- the
     first one opened was gone by the sign-up (its tap joined nothing, its
     sword was never put in its hand) */
  let stopAlive = false;
  const keepAwake = (P) => {
    (async () => {
      while (!stopAlive && !P.page.isClosed()) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 30 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  };
  /* what reaches each phone's socket about the arena and its duels, in order
     (the arena's events and a duel's end ride a tick's batch; a match's start
     is sent at once) */
  const wireLog = () => {
    const W0 = window.WebSocket;
    window.__arenaWire = [];
    const Wrapped = function (u, p) {
      const ws = p === undefined ? new W0(u) : new W0(u, p);
      const t0 = Date.now() % 100000;
      window.__arenaWire.push('open@' + t0);
      ws.addEventListener('close', (e) => { window.__arenaWire.push('close:' + e.code + ':' + (e.reason || '') + '@' + (Date.now() % 100000)); });
      ws.addEventListener('message', (e) => {
        if (typeof e.data === 'string' && e.data.indexOf('"httpToken"') >= 0) window.__arenaWire.push('token@' + (Date.now() % 100000));
        if (typeof e.data !== 'string' || !/duel_end|arena_match_|arena_tournament_complete/.test(e.data)) return;
        const m = e.data.match(/"type":"(duel_end|arena_match_start|arena_match_result|arena_tournament_complete)"/g);
        window.__arenaWire.push((m || ['?']).join(',').replace(/"type":/g, '') + '@' + (Date.now() % 100000));
        if (window.__arenaWire.length > 60) window.__arenaWire.shift();
      });
      return ws;
    };
    Wrapped.prototype = W0.prototype;
    for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Wrapped[k] = W0[k];
    window.WebSocket = Wrapped;
  };
  /* at one device pixel a CSS pixel: five phones drawing at 2x on this box's
     four cores dropped their sockets again and again (a sign-up refused "Not
     authorized" between a drop and the new session's token, a match's end
     lost in one) -- the game is the same, a quarter of the pixels */
  const open = async (name) => { const P = await H.newPlayer(browser, { name, wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, init: wireLog }); keepAwake(P); await H.enterWorld(P); return P; };
  const G = [];
  for (const n of NAMES) G.push(await open(n));
  const SP = await open('Cheerbro');
  const ALL = [...G, SP];
  const errors = [];
  for (const P of ALL) P.page.on('pageerror', (e) => errors.push(`${P.name}: ${String((e && e.message) || e).slice(0, 200)}`));
  try {
    const inWheel = async (P) => H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: `${P.name} in the world` }).catch(() => null);
    const w = [];
    for (const P of ALL) w.push(await inWheel(P));
    rec.ok('all five players in the world\'s BroTown (guard)', w.every(Boolean), w);
    if (!w.every(Boolean)) return;
    const ids = [];
    for (const P of G) ids.push(await H.readState(P, (S) => S.myId));
    const spId = await H.readState(SP, (S) => S.myId);
    /* every popup a phone shows, kept (they live a second), from the start:
       a match that ends before the scenario looks still leaves its words */
    for (const P of ALL) {
      await P.page.evaluate(() => {
        window.__arenaWords = [];
        const S = window._gameState.current;
        let seen = new Set();
        setInterval(() => {
          for (const d of (S.dmgNumbers || [])) {
            if (seen.has(d)) continue;
            seen.add(d);
            const tx = String(d.text || '');
            if (/arena|duel|gladiator|eliminated|stake|sponsor|champion|not in game|failed|authori|tournament/i.test(tx)) window.__arenaWords.push(tx);
          }
          if (seen.size > 400) seen = new Set();
          /* and the socket's state as it changes (a page that dropped and
             came back is a different story from one that was refused) */
          const net = String(S._realtimeStatus || '');
          if (net !== window.__arenaNet) { window.__arenaNet = net; window.__arenaWords.push('NET:' + net); }
        }, 60);
      });
    }
    for (const P of ALL) {
      await P.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
      await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    }

    /* ── arm the gladiators the game's way (the dev kit's copper great sword
       into the bag, then the worker's own equip_request) and give every
       player gold for the entry and the bets ── */
    /* (armWorker's way, for a sword: wait for the kit in the bag, take the
       phone's own sword out of its hand, ask, and read the WORKER's answer;
       one in four asked before the bag had synced and the worker said no) */
    const swordOnWorker = async (id) => { const a = await H.adminPlayer(wsPort, id); return !!(a && a.rpg && a.rpg.weapon && /great/i.test(a.rpg.weapon.type || '')); };
    for (let i = 0; i < G.length; i++) {
      await H.devOp(wsPort, 'kit', ids[i], { what: 'weapons' });
      /* (in hand on the phone after the phone's own was taken out = the
         worker's player_state put it there) */
      const held = () => G[i].page.evaluate(() => { const R = window._gameState.current.rpg || {}; return !!(R.weapon && R.weapon.type === 'greatsword'); });
      for (let k = 0; k < 4 && !(k > 0 && await held()); k++) {
        for (let j = 0; j < 40; j++) {
          const inBag = await G[i].page.evaluate(() => { const R = window._gameState.current.rpg || {}; return (R.weaponStash || []).some((w) => w && w.type === 'greatsword'); });
          if (inBag) break;
          await G[i].page.waitForTimeout(250);
        }
        await G[i].page.evaluate(() => { const R = window._gameState.current.rpg; if (R) R.weapon = null; });
        await H.equipWeapon(G[i], 'greatsword', 'weapon', 'melee');
        for (let j = 0; j < 16 && !(await held()); j++) await G[i].page.waitForTimeout(250);
      }
    }
    for (const id of [...ids, spId]) await H.grant(wsPort, id, 'gold', { amount: 600 });
    await G[0].page.waitForTimeout(2000);
    const armed = [];
    /* (the record on file trails the worker's own by its paced save) */
    for (const id of ids) { let ok = await swordOnWorker(id); for (let k = 0; k < 60 && !ok; k++) { await G[0].page.waitForTimeout(500); ok = await swordOnWorker(id); } armed.push(ok); }
    rec.ok('the four gladiators hold a great sword on the worker, and everyone has gold (guard)', armed.every(Boolean), armed);
    /* the operator view's `live` is now and then missing for a read (a
       player's state between two of the worker's writes): read again */
    const liveOf = async (id) => { for (let k = 0; k < 6; k++) { const v = await H.serverPlayer(wsPort, id); if (v) return v; await G[0].page.waitForTimeout(150); } return null; };
    const coinsOf = async (id) => ((await liveOf(id)) || {}).coins;
    const apOf = async (id) => { const a = await H.adminPlayer(wsPort, id); return Math.floor(Number(a && a.rpg && a.rpg.achievementPoints) || 0); };

    /* ── where things are: the Sheriff's Office's steps (the town's doors) ── */
    let doors = [];
    for (let i = 0; i < 40 && !doors.some((d) => d.id === 'sheriff'); i++) {
      doors = await G[0].page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (!doors.some((d) => d.id === 'sheriff')) await G[0].page.waitForTimeout(500);
    }
    const sh = doors.find((d) => d.id === 'sheriff');
    rec.ok('the Sheriff\'s Office is a hall of the world\'s BroTown (guard)', !!sh && sh.hall === 'sheriff', sh);
    if (!sh) return;

    /* the boots at (x, bootsY): S.player is the body's middle (mp-wheelhalls) */
    const standAt = async (P, x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await P.page.waitForTimeout(700);
        const g = await P.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
      }
      return false;
    };
    const waitSel = async (P, sel, ms = 5000) => {
      for (let t0 = Date.now(); Date.now() - t0 < ms;) {
        const ok = await P.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 20; }, sel);
        if (ok) return true;
        await P.page.waitForTimeout(200);
      }
      return false;
    };
    /* a real touch on the middle of what `sel` (and an optional text) finds */
    const touch = async (P, sel, text = null) => {
      const at = await P.page.evaluate(({ s, t }) => {
        const all = Array.from(document.querySelectorAll(s)).filter((e) => !t || (e.textContent || '').indexOf(t) >= 0);
        const e = all[0];
        if (!e) return null;
        e.scrollIntoView({ block: 'center' });
        const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, dis: !!e.disabled };
      }, { s: sel, t: text });
      if (!at) return null;
      await P.page.waitForTimeout(150);
      await P.page.touchscreen.tap(at.x, at.y);
      return at;
    };
    const closeCard = async (P) => { await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); }); await P.page.waitForTimeout(400); };
    const arenaCard = '.bt-inspect-card[data-building-panel="arena"]';
    const arenaText = (P) => P.page.evaluate((c) => { const e = document.querySelector(c); return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : null; }, arenaCard);
    const arenaState = (P) => P.page.evaluate((c) => { const e = document.querySelector(c + ' [data-arena-state]'); return e ? e.getAttribute('data-arena-state') : null; }, arenaCard);
    /* the Sheriff's Office's window, then its arena row: the arena's sign-up */
    const openArena = async (P, ox = 0) => {
      await closeCard(P);
      await standAt(P, sh.x + ox, sh.y + 30);
      let btn = null;
      for (let i = 0; i < 20 && !btn; i++) {
        btn = await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); return b ? (b.textContent || '').trim() : null; });
        if (!btn) await P.page.waitForTimeout(250);
      }
      await touch(P, 'button.bt-interact-prompt', 'Enter');
      const hall = await waitSel(P, '[data-wheel-hall="sheriff"]');
      await touch(P, '[data-hall-row="arena"]');
      const open = await waitSel(P, arenaCard);
      return { btn, hall, open };
    };

    /* ── 1. sign-up at the Sheriff's Office ── */
    const offs = [-60, -20, 20, 60];
    const opened = [];
    for (let i = 0; i < G.length; i++) opened.push(await openArena(G[i], offs[i]));
    const enterTexts = [];
    for (const P of G) enterTexts.push(await arenaText(P));
    await shot(G[0], '1-signup');
    rec.ok(`1. each gladiator at the Sheriff's Office's steps: "${opened[0].btn}", The arena, and the arena's window offering "Enter Arena · 100G"`,
      opened.every((o) => /SHERIFF'S OFFICE/.test(o.btn || '') && o.hall && o.open) && enterTexts.every((t) => /Enter Arena · 100G/.test(t || '')),
      { opened, enterTexts: enterTexts.map((t) => (t || '').slice(0, 120)) });
    const coins0 = [];
    for (const id of ids) coins0.push(await coinsOf(id));
    const tapped = [], retapped = [];
    for (let i = 0; i < G.length; i++) {
      tapped.push(!!(await touch(G[i], arenaCard + ' button', 'Enter Arena')));
      const inQ = async () => { for (let k = 0; k < 20; k++) { const st = await api(wsPort, '/status'); if (st && (st.queue || []).some((q) => q.playerId === ids[i])) return true; await G[i].page.waitForTimeout(250); } return false; };
      /* a phone the worker refused (its answer is in the words below) taps
         again, as a player would, before the next one taps */
      if (!(await inQ())) {
        retapped.push(NAMES[i]);
        await G[i].page.waitForTimeout(1500);
        await touch(G[i], arenaCard + ' button', 'Enter Arena');
        await inQ();
      }
    }
    const signWords = [];
    for (const P of G) signWords.push(await P.page.evaluate(() => (window.__arenaWords || []).slice(-6).concat((window.__arenaWire || []).slice(-6))));
    await G[0].page.waitForTimeout(1500);
    const st1 = await api(wsPort, '/status');
    const coins1 = [];
    for (const id of ids) coins1.push(await coinsOf(id));
    rec.ok('...a real tap on it, and the WORKER takes the 100 gold from each and queues all four, in the order they tapped',
      tapped.every(Boolean) && coins1.every((c, i) => c === coins0[i] - ENTRY_FEE)
        && st1 && (st1.queue || []).map((q) => q.playerId).join() === ids.join(),
      { tapped, retapped, coins0, coins1, queue: st1 && (st1.queue || []).map((q) => q.playerName), signWords });
    /* the window keeps saying "In Queue" through its own polls (every 3 s) */
    await G[0].page.waitForTimeout(7000);
    const queued = [];
    for (const P of G) queued.push({ state: await arenaState(P), text: ((await arenaText(P)) || '').slice(0, 160) });
    await shot(G[0], '1-queued');
    rec.ok('...and each window says "In Queue" (not "Enter Arena" again) after its polls, with when the bracket starts',
      queued.every((q) => q.state === 'queued' && /In Queue/.test(q.text) && !/Enter Arena · 100G/.test(q.text)), queued);

    /* the two pairs to their corners of the square below the steps, apart */
    /* (well apart: a fighter is locked onto its opponent the moment the
       bracket starts, and nobody should be in reach until the fight) */
    const spot = [{ x: sh.x - 220, y: sh.y + 170 }, { x: sh.x - 80, y: sh.y + 170 }, { x: sh.x + 80, y: sh.y + 170 }, { x: sh.x + 220, y: sh.y + 170 }];
    for (const P of G) await closeCard(P);
    await Promise.all(G.map((P, i) => standAt(P, spot[i].x, spot[i].y)));
    const tPlaced = Date.now();

    /* ── 2. the bracket ── */
    let t = null;
    for (let k = 0; k < 120; k++) {
      const s = await api(wsPort, '/status');
      t = s && s.tournament;
      if (t && t.status === 'active') break;
      await G[0].page.waitForTimeout(1000);
    }
    const r1 = t ? (t.matches || []).filter((m) => m.round === 1).map((m) => [m.p1, m.p2].join('|')) : [];
    rec.ok('2. a minute after the first entry the worker starts a bracket of four: two first-round matches, in tap order',
      !!t && t.status === 'active' && t.playerCount === 4 && t.round === 1 && t.maxRounds === 2
        && r1.join() === [ids[0] + '|' + ids[1], ids[2] + '|' + ids[3]].join() && !(t.recentMatches || []).length,
      t ? { status: t.status, players: t.playerCount, round: t.round, matches: r1.length, open: t.currentMatches.length, done: t.recentMatches, placedS: Math.round((Date.now() - tPlaced) / 1000) } : null);
    if (!t || t.status !== 'active') return;
    const opp = [ids[1], ids[0], ids[3], ids[2]];
    const duel = [];
    for (let i = 0; i < G.length; i++) {
      duel.push(await H.waitFor(G[i], (S) => ({
        inDuel: S._inDuel ? String(S._inDuel.opponent) : null, arena: !!(S._inDuel && S._inDuel.arena),
        lock: S.lockedTarget && S.lockedTarget.type === 'player' ? String(S.lockedTarget.id) : null,
      }), (v) => v.inDuel === opp[i] && v.lock === opp[i], { timeout: 8000, label: 'in the duel' }).catch(() => null)
        || await H.readState(G[i], (S) => ({ inDuel: S._inDuel ? String(S._inDuel.opponent) : null, lock: S.lockedTarget ? S.lockedTarget.id : null })));
    }
    rec.ok('...and each fighter\'s phone is in the duel with its opponent, the arena match named, and locked onto them',
      duel.every((d, i) => d && d.inDuel === opp[i] && d.arena && d.lock === opp[i]), duel);
    const fightCard = await openArena(G[0], -60);
    /* (the window's first draw is its last answer; the next poll says 'fighting') */
    for (let k = 0; k < 25 && (await arenaState(G[0])) !== 'fighting'; k++) await G[0].page.waitForTimeout(200);
    const fc = { state: await arenaState(G[0]), text: ((await arenaText(G[0])) || '') };
    await shot(G[0], '2-bracket');
    rec.ok('...the arena window shows the fight ("FIGHT! Round 1", Gladius vs Murmillo) and the bracket ("Tournament — Round 1/2")',
      fightCard.open && fc.state === 'fighting' && /FIGHT! Round 1/.test(fc.text) && /Murmillo/.test(fc.text) && /Round 1\/2/.test(fc.text),
      { state: fc.state, text: fc.text.slice(0, 260) });
    await closeCard(G[0]);
    await standAt(G[0], spot[0].x, spot[0].y);

    /* ── 3. the matches, fought ── */
    const hpOf = async (id) => ((await liveOf(id)) || {}).hp;
    const deadOf = async (id) => { const s = await H.serverPlayer(wsPort, id); return !!(s && (s.dead || s.hp <= 0)); };
    /* a real touch held on the attack disc; the game's own hold if the disc is
       not in the page (it fades out of the DOM after a while unused) */
    const holdAttack = async (P, on) => P.page.evaluate((down) => {
      const el = document.querySelector('.bt-rjoy-base');
      const S = window._gameState.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const x = r.x + r.width / 2, y = r.y + r.height / 2;
        const tch = new Touch({ identifier: 77, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent(down ? 'touchstart' : 'touchend', { bubbles: true, cancelable: true,
          touches: down ? [tch] : [], targetTouches: down ? [tch] : [], changedTouches: [tch] }));
        return 'disc';
      }
      S.autoAttack = !!down;
      return 'held';
    }, on);
    /* the challenger walks up beside the one it fights, until the worker has
       them within a sword's reach */
    const closeIn = async (P, me, them) => {
      for (let k = 0; k < 8; k++) {
        const [a, b] = await Promise.all([H.serverPlayer(wsPort, me), H.serverPlayer(wsPort, them)]);
        if (!a || !b) return null;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d <= 44) return Math.round(d);
        await H.hopTo(P, b.x + 34, b.y, { step: 90, gap: 260, tries: 30 });
        await P.page.waitForTimeout(700);
      }
      const [a, b] = await Promise.all([H.serverPlayer(wsPort, me), H.serverPlayer(wsPort, them)]);
      return a && b ? Math.round(Math.hypot(a.x - b.x, a.y - b.y)) : null;
    };
    /* `win` (an index into G) beats `lose`; the loser lands a few blows first */
    const fight = async (label, win, lose, { round }) => {
      const W = G[win], L = G[lose];
      const reach = await closeIn(L, ids[lose], ids[win]);
      const hpW0 = await hpOf(ids[win]), hpL0 = await hpOf(ids[lose]);
      /* the loser hits back first: damage both ways */
      const howL = await holdAttack(L, true);
      for (let k = 0; k < 12 && (await hpOf(ids[win])) >= hpW0; k++) await L.page.waitForTimeout(500);
      await holdAttack(L, false);
      const hpW1 = await hpOf(ids[win]);
      /* then the winner, until the worker has the loser down */
      const t0 = Date.now();
      /* what the winner's phone does: its lock (and whether it is the peer
         drawn now), and the attacks it sends at a player */
      await W.page.evaluate(() => {
        const S = window._gameState.current;
        window.__pvpSent = 0;
        if (!S.channel.__arenaWrapped) {
          const send = S.channel.send.bind(S.channel);
          S.channel.send = (m) => { if (m && m.event === 'player_attack') window.__pvpSent++; return send(m); };
          S.channel.__arenaWrapped = true;
        }
      });
      const howW = await holdAttack(W, true);
      let down = false, hpTrail = [hpL0];
      while (Date.now() - t0 < 90000) {
        if (await deadOf(ids[lose])) { down = true; break; }
        await W.page.waitForTimeout(600);
        const h = await hpOf(ids[lose]);
        if (h !== hpTrail[hpTrail.length - 1]) hpTrail.push(h);
        if (Date.now() - t0 > 8000 && hpTrail.length < 2) {
          /* nothing landed in 8 s: step back in (a hit's shove, a stray walk) */
          await closeIn(L, ids[lose], ids[win]);
        }
      }
      const wSide = await W.page.evaluate(() => {
        const S = window._gameState.current, lt = S.lockedTarget;
        return { sent: window.__pvpSent, lock: lt ? String(lt.id) : null, fresh: !!(lt && S.others && S.others[lt.id] === lt.ref), inDuel: !!S._inDuel };
      });
      await holdAttack(W, false);
      const secs = Math.round((Date.now() - t0) / 1000);
      let res = null;
      for (let k = 0; k < 20 && !res; k++) {
        const s = await api(wsPort, '/tournament');
        const tt = s && s.tournament;
        const m = tt && (tt.recentMatches || []).find((x) => x.round === round && (x.p1 === ids[win] || x.p2 === ids[win]));
        if (m) res = { winner: m.winnerId, loser: m.loserId, status: tt.status, round: tt.round };
        else await W.page.waitForTimeout(500);
      }
      await shot(W, `3-${label}`);
      rec.ok(`3. ${label}: ${NAMES[lose]} hits back first (${hpW0} -> ${hpW1} HP on the worker, ${howL}), then ${NAMES[win]}'s blows take ${NAMES[lose]} ${hpTrail.join(' -> ')} and down in ${secs} s (${howW}, the real swing, player_attack, the worker's roll)`,
        reach != null && reach <= 44 && hpW1 < hpW0 && down && hpTrail.length >= 3, { reach, hpW0, hpW1, hpTrail, down, secs, howL, howW, wSide });
      rec.ok(`...and the worker records the match: ${NAMES[win]} beat ${NAMES[lose]}`,
        !!res && res.winner === ids[win] && res.loser === ids[lose], res);
      /* both phones out of the duel, by duel_end, with one word: the arena's */
      /* (out of THIS match: the round's last winner is straight into the
         final's duel, with someone else) */
      const loserId = String(ids[lose]);
      const outW = await H.waitFor(W, (S) => ({ inDuel: S._inDuel ? String(S._inDuel.opponent) : null, lock: S.lockedTarget && S.lockedTarget.type === 'player' ? String(S.lockedTarget.id) : null }),
        (v) => v.inDuel !== loserId && v.lock !== loserId, { timeout: 8000, label: 'out of the duel' }).catch(() => null);
      const outL = await H.waitFor(L, (S) => ({ inDuel: !!S._inDuel }), (v) => !v.inDuel, { timeout: 8000, label: 'out of the duel' }).catch(() => null);
      const words = await W.page.evaluate(() => (window.__arenaWords || []).slice());
      const lwords = await L.page.evaluate(() => (window.__arenaWords || []).slice());
      const wire = await W.page.evaluate(() => (window.__arenaWire || []).slice(-8));
      const lwire = await L.page.evaluate(() => (window.__arenaWire || []).slice(-8));
      /* the knocked-out phone is falling and getting up as the word comes; on
         this busy box its page can sit out the second the popup lives, so the
         result having reached it counts as heard (the words checked are the
         wrong ones: never "Duel lost") */
      const lHeard = lwords.some((x) => /Eliminated/.test(x)) || lwire.some((x) => /arena_match_result/.test(x));
      rec.ok(`...both phones leave the duel; the winner hears "Arena win!" and not also "DUEL WON!", the loser "Eliminated" and not also "Duel lost"`,
        !!outW && !!outL && words.some((x) => /Arena win/.test(x)) && !words.some((x) => /DUEL WON/.test(x))
          && lHeard && !lwords.some((x) => /Duel lost/.test(x)),
        { outW, outL, words: words.slice(-6), lwords: lwords.slice(-6), wire, lwire });
      return { res, down };
    };
    const bag0 = await H.adminPlayer(wsPort, ids[1]);
    /* both first-round matches at once, as players fight them: each runs on
       its own 3-minute clock from the bracket's start, and one fought after
       the other ran out the second's clock (the health tiebreak decided it) */
    /* ...and meanwhile the two who will back the final go to the Sheriff's
       Office and open the arena's window: the spectator now, Murmillo once
       he is knocked out and back on his feet.  The final starts the moment
       the first round ends, on its own 3-minute clock, so a backer who only
       then walked over ran the final out (the tiebreak decided it). */
    let bag1 = null;
    const [m1, m2] = await Promise.all([
      fight('Gladius v Murmillo', 0, 1, { round: 1 }).then(async (r) => {
        if (!r.down) return r;
        /* the loser's bag: a duel's death keeps it (duel.js _duelOnDeath) */
        await G[1].page.waitForTimeout(6000);
        bag1 = await H.adminPlayer(wsPort, ids[1]);
        await inWheel(G[1]);
        await openArena(G[1], 40);
        return r;
      }),
      G[2].page.waitForTimeout(1500).then(() => fight('Retiarius v Secutor', 2, 3, { round: 1 })),
      openArena(SP, 0),
    ]);
    if (!m1.down || !m2.down) return;
    /* (a bag on file is a list or a keyed record, by its shape number) */
    const countOf = (x) => (Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.values(x) : [])).filter(Boolean).length;
    const invN = (a) => countOf(a && a.rpg && a.rpg.inventory);
    const stashN = (a) => countOf(a && a.rpg && a.rpg.weaponStash) + (a && a.rpg && a.rpg.weapon ? 1 : 0);
    rec.ok('...and Murmillo, knocked out, keeps his bag and his sword (no death pile)',
      invN(bag1) >= invN(bag0) && stashN(bag1) >= stashN(bag0), { inv: [invN(bag0), invN(bag1)], weapons: [stashN(bag0), stashN(bag1)] });

    /* ── 4. the final, and the bets on it ── */
    let tf = null;
    for (let k = 0; k < 20; k++) {
      tf = ((await api(wsPort, '/tournament')) || {}).tournament;
      if (tf && tf.round === 2) break;
      await G[0].page.waitForTimeout(500);
    }
    const fin = tf && tf.currentMatches && tf.currentMatches[0];
    rec.ok('4. the final forms from the two winners: Gladius v Retiarius',
      !!tf && tf.round === 2 && !!fin && [fin.p1, fin.p2].join() === [ids[0], ids[2]].join(), tf ? { round: tf.round, cur: tf.currentMatches } : null);
    if (!fin) return;
    /* v2.3.3713: the round's last match ends and the final starts in one
       call on the worker; the final's start reached the phone BEFORE the
       semifinal's duel_end, which then cleared the final's duel */
    const finDuel = [];
    for (const [i, o] of [[0, ids[2]], [2, ids[0]]]) {
      finDuel.push(await H.waitFor(G[i], (S) => ({ inDuel: S._inDuel ? String(S._inDuel.opponent) : null, round: S._inDuel ? S._inDuel.round : null }),
        (v) => v.inDuel === o && v.round === 2, { timeout: 8000, label: 'in the final' }).catch(() => null));
    }
    await G[0].page.waitForTimeout(3000);
    for (const [k, [i, o]] of [[0, ids[2]], [2, ids[0]]].entries()) {
      if (finDuel[k]) finDuel[k] = await H.readState(G[i], (S) => ({ inDuel: S._inDuel ? String(S._inDuel.opponent) : null, round: S._inDuel ? S._inDuel.round : null }));
      if (finDuel[k] && finDuel[k].inDuel !== o) finDuel[k].lost = true;
    }
    rec.ok('...and both finalists\' phones are in the final\'s duel, and stay in it (the semifinal\'s late end does not clear it)',
      finDuel.every((d) => d && !d.lost && d.round === 2), finDuel);
    /* a backer's bet through the arena window's Spectator Betting */
    const bet = async (P, pid, targetId, amount, ox) => {
      /* (the window is open already, from the first round; walked to if not) */
      const o = (await waitSel(P, arenaCard, 500)) ? { open: true } : await openArena(P, ox);
      const well = await waitSel(P, arenaCard + ' [data-arena-bet]', 8000);
      const picked = !!(await touch(P, `${arenaCard} [data-arena-bet-target="${targetId}"]`));
      await P.page.fill(`${arenaCard} [data-arena-bet-amount]`, String(amount)).catch(() => {});
      await P.page.waitForTimeout(300);
      const placed = !!(await touch(P, `${arenaCard} [data-arena-bet-place]`));
      await P.page.waitForTimeout(1500);
      await shot(P, `4-bet-${P.name}`);
      const txt = ((await arenaText(P)) || '');
      await closeCard(P);
      const words = await P.page.evaluate(() => (window.__arenaWords || []).slice(-4).concat((window.__arenaWire || []).slice(-4)));
      return { open: o.open, well, picked, placed, betPlaced: /Bet placed/.test(txt), txt: txt.slice(-160), words };
    };
    const spC0 = await coinsOf(spId), lC0 = await coinsOf(ids[1]);
    /* the two at once (the final's clock is running); Murmillo came back to
       BroTown after his knock-out (the world's respawn) */
    const [bS, bL] = await Promise.all([
      bet(SP, spId, ids[0], BET_SPEC, 0),
      inWheel(G[1]).then(() => bet(G[1], ids[1], ids[2], BET_LOSER, 40)),
    ]);
    await G[0].page.waitForTimeout(1500);
    const spC1 = await coinsOf(spId), lC1 = await coinsOf(ids[1]);
    rec.ok(`...the spectator, who never entered, backs Gladius with ${BET_SPEC} on their phone, and Murmillo, knocked out (a spectator now), backs Retiarius with ${BET_LOSER}: the worker escrows both`,
      bS.well && bS.picked && bS.placed && bL.well && bL.picked && bL.placed
        && spC1 === spC0 - BET_SPEC && lC1 === lC0 - BET_LOSER && bS.betPlaced && bL.betPlaced,
      { bS, bL, spC: [spC0, spC1], lC: [lC0, lC1] });

    /* ── 5. the crown ── */
    for (const i of [0, 2]) await standAt(G[i], spot[i].x, spot[i].y);
    const champC0 = await coinsOf(ids[0]), champAp0 = await apOf(ids[0]);
    const fF = await fight('the final, Gladius v Retiarius', 0, 2, { round: 2 });
    if (!fF.down) return;
    let tc = null;
    for (let k = 0; k < 20; k++) {
      tc = ((await api(wsPort, '/tournament')) || {}).tournament;
      if (tc && tc.status === 'complete') break;
      await G[0].page.waitForTimeout(500);
    }
    const prize = tc && tc.champion ? tc.champion.prize : null;
    rec.ok(`5. the worker crowns Gladius the champion, a prize of ${prize} for a bracket of four`,
      !!tc && tc.status === 'complete' && !!tc.champion && tc.champion.id === ids[0] && prize === 4 * PRIZE_PER,
      tc ? { status: tc.status, champion: tc.champion } : null);
    /* the window names the champion while the worker keeps the finished
       bracket (a minute, gladiator.js _arenaCrown) -- read at once, the
       spectator being at the steps from the bet */
    const champBox = await openArena(SP, 0);
    let cbText = '';
    for (let k = 0; k < 30; k++) {
      cbText = ((await arenaText(SP)) || '');
      if (/Gladius/.test(cbText) && /champion/i.test(cbText)) break;
      await SP.page.waitForTimeout(200);
    }
    await shot(SP, '5-champion-box');
    rec.ok('...and the arena window names the champion ("GLADIATOR CHAMPION", Gladius)', champBox.open && /Gladius/.test(cbText) && /champion/i.test(cbText), cbText.slice(-240));
    await closeCard(SP);
    /* the stakes: the losing 100's 10% to the champion, 90% to the winning backer */
    const cut = Math.floor(BET_LOSER * 0.1);
    const spWin = BET_SPEC + (BET_LOSER - cut);
    let champC1 = null, champAp1 = null, spC2 = null, lC2 = null;
    for (let k = 0; k < 30; k++) {
      champC1 = await coinsOf(ids[0]); champAp1 = await apOf(ids[0]); spC2 = await coinsOf(spId); lC2 = await coinsOf(ids[1]);
      if (champC1 === champC0 + prize + cut && champAp1 >= champAp0 + CHAMP_AP && spC2 === spC1 + spWin) break;
      await G[0].page.waitForTimeout(500);
    }
    rec.ok(`...pays Gladius the prize and the fighter's 10% of the losing stake (+${prize + cut} gold) and the Gladiator achievement's ${CHAMP_AP} AP`,
      champC1 === champC0 + (prize || 0) + cut && champAp1 >= champAp0 + CHAMP_AP, { champC0, champC1, champAp0, champAp1, want: (prize || 0) + cut });
    rec.ok(`...the spectator's backing pays ${spWin} (the ${BET_SPEC} back and 90% of the losing ${BET_LOSER}), and Murmillo's stake on Retiarius is gone`,
      spC2 === spC1 + spWin && lC2 === lC1, { spC1, spC2, lC1, lC2 });
    const champPhone = await H.waitFor(G[0], (S) => ({ titles: ((S.rpg && S.rpg._titles) || []).slice(), words: (window.__arenaWords || []).slice(-8) }),
      (v) => v.titles.includes('Gladiator') && v.words.some((x) => /GLADIATOR CHAMPION/.test(x)), { timeout: 10000, label: 'the champion' }).catch(() => null);
    const spPhone = await H.waitFor(SP, () => (window.__arenaWords || []).slice(-8), (v) => v.some((x) => /SPONSORSHIP PAID/.test(x)) && v.some((x) => /Gladius is the Gladiator champion/.test(x)), { timeout: 10000, label: 'the spectator' }).catch(() => null);
    const lPhone = await H.waitFor(G[1], () => (window.__arenaWords || []).slice(-8), (v) => v.some((x) => /Stake lost/.test(x)), { timeout: 10000, label: 'the losing backer' }).catch(() => null);
    await shot(G[0], '5-champion');
    await shot(SP, '5-spectator');
    rec.ok('...and the phones hear it: "GLADIATOR CHAMPION!" and the title on the champion\'s, "SPONSORSHIP PAID!" and the champion\'s name on the spectator\'s, "Stake lost" on Murmillo\'s',
      !!champPhone && !!spPhone && !!lPhone, { champPhone, spPhone, lPhone });

    rec.ok(`6. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    for (const P of ALL) await P.ctx.close().catch(() => {});
  }
}
