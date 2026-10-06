/* ═══ THE WHEEL'S HALLS, ON A PHONE (v2.3.3066) ═══
 *
 * Asked to "keep going with pragmatic enhancements": three of the plan's new
 * buildings open onto systems the game already has (data/wheelBuildingDoors.js
 * WHEEL_HALL_DOORS), and a clan invite can be taken up at last.  (v2.3.3125: and
 * the Town Hall, a fourth, section 7.)
 *
 * Two real players against a real worker, in the Wheel's Brotown, on phones:
 *   1. the client knows the halls -- the Guild Hall, the Post Office, the
 *      Sheriff's Office, the Town Hall -- and only the Hotel is still shut;
 *   2. the Guild Hall: "Enter GUILD HALL" at its steps; inside, Clans and
 *      Skill guilds; each opens its panel (the clan and guild panels nothing
 *      in play opened before); a clan FOUNDED there (500 gold), the worker
 *      echoing it;
 *   2b. the dashboard's Clan page (no code on screen; Make a clan opens the
 *      clan window), its Guild page (your rank in each skill guild, and the
 *      guild window) and the More page's guild line (your rank, not "Not
 *      joined");
 *   3. a clan invite: the leader invites the other player, whose screen
 *      raises the invite card wherever they are; Accept, and the worker puts
 *      them in the clan;
 *   4. the Sheriff's Office: "Duel a player" opens the player list (the other
 *      player in it), "The arena" the arena's sign-up;
 *   5. the Hotel still says "Shut for now";
 *   6. the Post Office: your mail -- the gold granted this visit, as the
 *      worker's mail delivered it -- and "Messages from friends" opens the
 *      Social panel;
 *   7. the Town Hall (v2.3.3125, the fourth hall: the owner chose "a Town Hall
 *      window"): a new character, arriving 108 px south of its door, does not
 *      start with its Enter button showing; at its steps it says "Enter TOWN
 *      HALL" and opens your picture of its inside over two rows -- the
 *      Leaderboard (the dashboard's Ranks page, More -> Leaderboard) and the
 *      World map (the Wheel's labelled map); each closes the hall;
 *   8. no page errors.
 * Pictures: tools/qa/mp/out/wheelhalls-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `wheelhalls-${name}.png`) }).catch(() => {});
  const { WHEEL_HALL_DOORS, WHEEL_SHUT_DOORS } = await import(H.REPO + '/src/data/wheelBuildingDoors.js');

  const A = await H.newPlayer(browser, { name: 'Hallbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const B = await H.newPlayer(browser, { name: 'Joinbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errors = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errors.push(`${P.name}: ${String((e && e.message) || e).slice(0, 200)}`));
  let stopAlive = false;
  for (const P of [A, B]) {
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }
  try {
    await H.enterWorld(A);
    await H.enterWorld(B);
    const inWheel = async (P) => H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: `${P.name} in the Wheel` }).catch(() => null);
    const wa = await inWheel(A), wb = await inWheel(B);
    rec.ok('both players in the Wheel (guard)', !!wa && !!wb, { wa, wb });
    if (!wa || !wb) return;
    const aId = await H.readState(A, (S) => S.myId), bId = await H.readState(B, (S) => S.myId);
    for (const id of [aId, bId]) {
      await H.devOp(wsPort, 'quests', id);
      await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    }
    /* a phone has no keyboard (mp-wheeldoors' note): no "E" hint */
    for (const P of [A, B]) await P.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    /* the boots at (x, bootsY): S.player is the body's middle (mp-wheeldoors) */
    const standAt = async (P, x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await P.page.waitForTimeout(800);
        const g = await P.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
      }
      return false;
    };
    const enterBtn = (P) => P.page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || ''));
      const shut = document.querySelector('[data-wheel-shut-door]');
      return { btn: b ? (b.textContent || '').trim() : null, hall: b ? b.getAttribute('data-enter-hall') : null, shut: shut ? (shut.textContent || '').trim() : null };
    });
    const tapEnter = (P) => P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
    const waitSel = async (P, sel, ms = 4000) => {
      for (let t0 = Date.now(); Date.now() - t0 < ms;) {
        const ok = await P.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 20; }, sel);
        if (ok) return true;
        await P.page.waitForTimeout(200);
      }
      return false;
    };
    const tap = (P, sel) => P.page.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
    const closeCard = async (P) => { await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); }); await P.page.waitForTimeout(400); };
    const atDoor = async (P, d) => {
      await standAt(P, d.x, d.y + 30);
      let r = null;
      for (let i = 0; i < 16; i++) { r = await enterBtn(P); if (r.btn || r.shut) break; await P.page.waitForTimeout(250); }
      return r;
    };
    const enterHall = async (P, d) => {
      const r = await atDoor(P, d);
      await tapEnter(P);
      const open = await waitSel(P, `[data-wheel-hall="${d.hall}"]`);
      return { r, open };
    };

    /* ── 1. the halls ── */
    let doors = [];
    for (let i = 0; i < 40 && doors.length < 17; i++) {
      doors = await A.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (doors.length < 17) await A.page.waitForTimeout(500);
    }
    const byId = Object.fromEntries(doors.map((d) => [d.id, d]));
    const halls = doors.filter((d) => d.hall), shut = doors.filter((d) => d.closed);
    rec.ok(`the client knows the halls -- ${halls.map((d) => d.name).join(', ')} -- and only ${shut.map((d) => d.name).join(', ')} is still shut`,
      halls.length === 4 && Object.keys(WHEEL_HALL_DOORS).every((k) => byId[k] && byId[k].hall === WHEEL_HALL_DOORS[k] && byId[k].index < 0 && !byId[k].closed)
        && shut.length === 1 && WHEEL_SHUT_DOORS.every((k) => byId[k] && byId[k].closed), doors.map((d) => [d.id, d.index, d.hall, d.closed]));

    /* ── 2. the Guild Hall ── */
    const gh = byId.guildhall;
    const g1 = await enterHall(A, gh);
    const rows = await A.page.evaluate(() => Array.from(document.querySelectorAll('[data-wheel-hall] [data-hall-row]')).map((b) => b.getAttribute('data-hall-row')));
    await shot(A, 'guildhall');
    rec.ok(`the Guild Hall: "${g1.r && g1.r.btn}" at its steps, and inside, ${rows.join(' and ')}`,
      !!g1.r && /Enter\s*GUILD HALL/.test(g1.r.btn || '') && g1.r.hall === 'guildhall' && g1.open && rows.join() === 'clan,guild', { g1, rows });
    await tap(A, '[data-hall-row="clan"]');
    const clanOpen = await waitSel(A, '[data-panel="clan"]');
    const hallGone = await A.page.evaluate(() => !document.querySelector('[data-wheel-hall]'));
    await shot(A, 'clan');
    rec.ok('...Clans opens the clan panel (the hall closing behind it) -- a panel nothing in play opened before', clanOpen && hallGone, { clanOpen, hallGone });
    /* found a clan there: 500 gold, through the panel's own form */
    await H.grant(wsPort, aId, 'gold', { amount: 600 });
    await A.page.waitForTimeout(1500);
    await tap(A, '[data-panel="clan"] button.button-primary');   /* Create Clan (500g) */
    await A.page.waitForTimeout(400);
    await A.page.fill('[data-panel="clan"] input[placeholder="My Awesome Clan"]', 'Hall Bros').catch(() => {});
    await A.page.fill('[data-panel="clan"] input[placeholder="CLAN"]', 'HALL').catch(() => {});
    await tap(A, '[data-panel="clan"] button.button-primary');   /* found it */
    const founded = await H.waitFor(A, (S) => (S._clanData ? { tag: S._clanData.tag, name: S._clanData.name } : null), (v) => !!v && v.tag === 'HALL', { timeout: 15000, label: 'the clan founded' }).catch(() => null);
    rec.ok(`...and a clan founded there, the worker's echo naming it [${founded && founded.tag}] ${founded && founded.name}`, !!founded, founded);
    await closeCard(A);
    const g2 = await enterHall(A, gh);
    const clanRow = await A.page.evaluate(() => { const r = document.querySelector('[data-hall-row="clan"]'); return r ? (r.textContent || '').trim() : null; });
    await tap(A, '[data-hall-row="guild"]');
    const guildOpen = await waitSel(A, '[data-panel="guild"]');
    await shot(A, 'guild');
    rec.ok(`...the hall now names your clan ("${clanRow}"), and Skill guilds opens the guild panel`, g2.open && /\[HALL\]/.test(clanRow || '') && guildOpen, { clanRow, guildOpen });
    await closeCard(A);

    /* ── 2b. the dashboard's Clan and Guild pages (B, in no clan yet) ──
       The Clan page told a player with no clan to call
       `window.__broLegacyUI?.clan?.()`; the Guild page read a field nothing
       sets and said "You haven't joined a guild yet" to everyone. */
    const dashText = (P, sel) => P.page.evaluate((q) => { const e = document.querySelector(q); return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : null; }, sel);
    const dashMode = (P) => P.page.evaluate(() => (window.__broDashPanelBus ? window.__broDashPanelBus.state.mode : null));
    await B.page.evaluate(() => window.__broDashPanelBus.open('clan'));
    const dClan = await waitSel(B, '[data-dash-clan="none"]');
    const dClanText = await dashText(B, '[data-dash-clan]');
    await shot(B, 'dash-clan');
    await tap(B, '[data-dash-open-clan]');
    const dClanWin = await waitSel(B, '[data-panel="clan"]');
    const dClanMode = await dashMode(B);
    rec.ok(`the dashboard's Clan page, in no clan: "${dClanText}" -- no code on screen, and Make a clan opens the clan window (the sheet put down: ${dClanMode})`,
      dClan && !/__broLegacyUI|window\./.test(dClanText || '') && /Make a clan/.test(dClanText || '') && dClanWin && dClanMode === 'bar',
      { dClan, dClanText, dClanWin, dClanMode });
    await closeCard(B);
    await B.page.evaluate(() => window.__broDashPanelBus.open('guild'));
    const dGuild = await waitSel(B, '[data-dash-guild]');
    const ranks = await B.page.evaluate(() => Array.from(document.querySelectorAll('[data-dash-guild] [data-guild-rank]')).map((r) => (r.textContent || '').replace(/\s+/g, ' ').trim()));
    const dGuildText = await dashText(B, '[data-dash-guild]');
    await shot(B, 'dash-guild');
    await tap(B, '[data-dash-open-guild]');
    const dGuildWin = await waitSel(B, '[data-panel="guild"]');
    rec.ok(`the dashboard's Guild page lists your rank in each of the ${ranks.length} skill guilds (${ranks.slice(0, 2).join('; ')}...), not "You haven't joined a guild yet", and opens the guild window`,
      dGuild && ranks.length === 10 && ranks.every((t) => /(Novice|Apprentice|Journeyman|Adept|Expert|Master|Legendary|Transcendent)\s*Lv \d+$/.test(t))
        && !/haven't joined/.test(dGuildText || '') && dGuildWin,
      { dGuild, ranks, dGuildWin });
    await closeCard(B);
    await B.page.evaluate(() => window.__broDashPanelBus.open('more'));
    await waitSel(B, '[data-more-tile="guild"]');
    /* the tile's live line is its title (MorePanel statusFor) */
    const moreGuild = await B.page.evaluate(() => { const e = document.querySelector('[data-more-tile="guild"]'); return e ? e.getAttribute('title') : null; });
    rec.ok(`...and the More page's Guild line says your rank ("${moreGuild}"), not "Not joined"`,
      !!moreGuild && !/Not joined/.test(moreGuild) && /(skill guild|Novice|Apprentice|Journeyman|Adept|Expert|Master)/.test(moreGuild), moreGuild);
    await B.page.evaluate(() => window.__broDashPanelBus.toBar());
    await B.page.waitForTimeout(400);

    /* ── 3. a clan invite, taken up ── */
    await A.page.evaluate((target) => {
      const S = window._gameState.current;
      S.channel.send({ type: 'broadcast', event: 'clan_invite', payload: { target, from: S.myId, fromName: S.myName, clanName: S._clanData.name, clanTag: S._clanData.tag } });
    }, bId);
    const card = await waitSel(B, '[data-clan-invite] .bt-inspect-card', 8000);
    const cardText = await B.page.evaluate(() => { const c = document.querySelector('[data-clan-invite] .bt-inspect-card'); return c ? (c.textContent || '').replace(/\s+/g, ' ').trim() : null; });
    await shot(B, 'invite');
    rec.ok(`the invited player's screen raises the invite card wherever they are: "${cardText}"`, card && /\[HALL\] Hall Bros/.test(cardText || '') && /Hallbro/.test(cardText || ''), cardText);
    await tap(B, '[data-clan-invite-accept]');
    const joined = await H.waitFor(B, (S) => (S._clanData ? S._clanData.tag : null), (v) => v === 'HALL', { timeout: 15000, label: 'joined the clan' }).catch(() => null);
    const cardGone = await B.page.evaluate(() => !document.querySelector('[data-clan-invite]'));
    rec.ok('...Accept, and the worker puts them in the clan (its echo on their screen), the card gone', joined === 'HALL' && cardGone, { joined, cardGone });
    await B.page.evaluate(() => window.__broDashPanelBus.open('clan'));
    const dClan2 = await waitSel(B, '[data-dash-clan="HALL"] [data-dash-open-clan]');
    rec.ok('...and their dashboard\'s Clan page shows the clan, with a way into the clan window', dClan2, { dClan2 });
    await B.page.evaluate(() => window.__broDashPanelBus.toBar());
    await B.page.waitForTimeout(400);

    /* ── 4. the Sheriff's Office ── */
    const sh = byId.sheriff;
    const s1 = await enterHall(A, sh);
    await shot(A, 'sheriff');
    await tap(A, '[data-hall-row="duel"]');
    const plist = await waitSel(A, '.bt-plist');
    let names = [];
    for (let i = 0; i < 12; i++) {
      names = await A.page.evaluate(() => Array.from(document.querySelectorAll('.bt-plist-name')).map((n) => (n.textContent || '').trim()));
      if (names.some((n) => /Joinbro/.test(n))) break;
      await A.page.waitForTimeout(400);
    }
    await shot(A, 'players');
    rec.ok(`the Sheriff's Office: "${s1.r && s1.r.btn}", and Duel a player opens the player list, the other player in it (${names.join(', ')})`,
      !!s1.r && /Enter\s*SHERIFF'S OFFICE/.test(s1.r.btn || '') && s1.open && plist && names.some((n) => /Joinbro/.test(n)), { s1, names });
    /* the list's own close is BroTown's setter (window._uiPanels, its QA hook) */
    await A.page.evaluate(() => { if (window._uiPanels && window._uiPanels.playerList) window._uiPanels.playerList(false); });
    await A.page.waitForTimeout(400);
    await enterHall(A, sh);
    await tap(A, '[data-hall-row="arena"]');
    let arenaKey = null;
    for (let i = 0; i < 12 && arenaKey !== 'party'; i++) { await A.page.waitForTimeout(250); arenaKey = await A.page.evaluate(() => { const c = document.querySelector('.bt-inspect-card[data-building-panel]'); return c ? c.getAttribute('data-building-panel') : null; }); }
    rec.ok('...and The arena opens the arena\'s sign-up (the Saloon\'s panel)', arenaKey === 'party', { arenaKey });
    await closeCard(A);

    /* ── 5. the Hotel ── */
    const ho = await atDoor(A, byId.hotel);
    rec.ok(`the Hotel still says so: "${ho && ho.shut}", and no Enter`, !!ho && /Hotel/.test(ho.shut || '') && /Shut for now/.test(ho.shut || '') && !ho.btn, ho);

    /* ── 6. the Post Office ── */
    const po = byId.post;
    const p1 = await enterHall(A, po);
    const mail = await A.page.evaluate(() => {
      const S = window._gameState.current;
      const box = document.querySelector('[data-hall-mail]');
      return { kept: (S._mail || []).length, shown: box ? +box.getAttribute('data-hall-mail') : -1,
        lines: Array.from(document.querySelectorAll('[data-mail-line]')).map((l) => (l.textContent || '').replace(/\s+/g, ' ').trim()) };
    });
    await shot(A, 'post');
    rec.ok(`the Post Office: "${p1.r && p1.r.btn}", and your mail -- ${mail.lines.slice(0, 3).join(' | ')}`,
      !!p1.r && /Enter\s*POST OFFICE/.test(p1.r.btn || '') && p1.open && mail.kept >= 1 && mail.shown === Math.min(12, mail.kept)
        && mail.lines.some((l) => /\+600 gold/.test(l) && /headless qa seed/.test(l)), mail);
    await tap(A, '[data-hall-row="messages"]');
    const social = await waitSel(A, '[data-dash-social]', 5000);
    await shot(A, 'messages');
    rec.ok('...and Messages from friends opens the Social panel (friends, and messages that wait for them)', social, { social });

    /* ── 7. the Town Hall (v2.3.3125) ── */
    const th = byId.townhall;
    /* where a new character arrives: the body's middle 108 px south of the door's foot (the boots ~52 px lower, past the 140 px reach) */
    await H.hopTo(A, th.x, th.y + 108, { step: 100, gap: 260, tries: 90 });
    await A.page.waitForTimeout(1200);
    const atArrival = await enterBtn(A);
    rec.ok('a new character does not start with the Town Hall\'s Enter button showing: arriving 108 px south of its door, there is none', !atArrival.btn && !atArrival.shut, atArrival);
    const t1 = await enterHall(A, th);
    const trows = await A.page.evaluate(() => Array.from(document.querySelectorAll('[data-wheel-hall="townhall"] [data-hall-row]')).map((b) => b.getAttribute('data-hall-row')));
    let troom = null;
    for (let i = 0; i < 20; i++) {
      troom = await A.page.evaluate(() => { const r = document.querySelector('.bt-inspect-card > .bt-room'); return r ? { id: r.getAttribute('data-room'), state: r.getAttribute('data-room-state') } : null; });
      if (troom && troom.state === 'ready') break;
      await A.page.waitForTimeout(250);
    }
    await shot(A, 'townhall');
    rec.ok(`the Town Hall: "${t1.r && t1.r.btn}" at its steps, your picture of its inside on top, and ${trows.join(' and ')} under it`,
      !!t1.r && /Enter\s*TOWN HALL/.test(t1.r.btn || '') && t1.r.hall === 'townhall' && t1.open && trows.join() === 'leaderboard,map'
        && !!troom && troom.id === 'townhall' && troom.state === 'ready', { t1, trows, troom });
    await tap(A, '[data-hall-row="leaderboard"]');
    await A.page.waitForTimeout(900);
    const lb = await A.page.evaluate(() => {
      const b = window.__broDashPanelBus;
      return { hallGone: !document.querySelector('[data-wheel-hall]'), stack: b ? b.state.stack.slice() : null, mode: b ? b.state.mode : null };
    });
    await shot(A, 'leaderboard');
    rec.ok('...Leaderboard closes the hall and opens the dashboard\'s Ranks page (More, then Leaderboard)', lb.hallGone && lb.mode === 'expanded' && lb.stack && lb.stack.join() === 'more,leaderboard', lb);
    await A.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) { /* bare */ } });
    await A.page.waitForTimeout(500);
    const t2 = await enterHall(A, th);
    await tap(A, '[data-hall-row="map"]');
    const mapOpen = await waitSel(A, '[data-world-map]', 4000);
    const hallGone2 = await A.page.evaluate(() => !document.querySelector('[data-wheel-hall]'));
    await shot(A, 'worldmap');
    rec.ok('...and World map closes the hall and opens the Wheel\'s world map', t2.open && mapOpen && hallGone2, { t2: t2.open, mapOpen, hallGone2 });
    await A.page.evaluate(() => { const b = document.querySelector('[data-world-map-close]'); if (b) b.click(); });
    await A.page.waitForTimeout(500);

    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
