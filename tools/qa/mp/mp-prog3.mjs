/* Prog3: the trained-skill combat rebuild, end to end through the real UI
 * (v2.3.1660; server core v2.3.1659; design docs/PROGRESSION-REDESIGN.md).
 *
 * What only THIS harness can prove (the server suite pins the math with a
 * mocked DO; here a real browser talks to the real worker):
 *
 *  - the respec actually reaches a fresh browser: caps.prog3 advertised,
 *    rpg.prog3 adopted from player_state, level/pools re-derived to the
 *    new formulas without the echo fighting the local recalc
 *  - the Character sheet's Build tab renders the allocation screen (three
 *    trained skills + seven stat rows) instead of the legacy launchers
 *  - a spend with an empty pool is refused end to end: the [+] buttons are
 *    disabled in the DOM, AND a forged raw prog3_allocate leaves the
 *    server's blob untouched (the deny is the server's, not just the UI's)
 *  - the persisted blob is stamped _v ≥ 10 with the respecced shape
 */
import * as H from './harness.mjs';
/* v2.3.1727: the retune moved HP_PER_LEVEL — read the constant rather than
   re-typing its value into an assertion (see the maxHp check below). */
import { PROG3 } from '../../../src/data/prog3.js';

/* v2.3.2199: the open lane's control count, derived from the constant
   tables the UI itself maps (4 ATK + 5 BODY = 9 against a prog3x worker;
   this harness always runs against the local worker, which advertises
   it) — a hand-typed 7 here went stale the day the dmg/elem stats
   shipped, which is exactly the trap the v2.3.1727 note above names. */
/* v2.3.2592: four columns — six stats per weapon, seven shared.
   v2.3.2594: and at most ONE WEAPON plus SHARED open at a time (owner), so
   the most a screen can ever hold is 6 + 7.  Derived from the tables the UI
   itself maps, never hand-typed: a 9 here went stale the day the dmg/elem
   stats shipped, which is the trap this file's v2.3.1727 note names. */
const STAT_ROWS = Object.keys(PROG3.ATK).length + Object.keys(PROG3.BODY).length;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Respec', wsPort, webPort });
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);

  /* ── the respec reaches the client ── */
  const adopted = await H.waitFor(P, (S) => {
    const R = S && S.rpg;
    return {
      caps: !!(S && S._serverCaps && S._serverCaps.prog3),
      p3: !!(R && R.prog3 && R.prog3.sk),
      level: R && R.level,
      maxHp: R && R.maxHp,
      pool: (R && R.prog3 && R.prog3.pool) || 0,
      sword: (R && R.prog3 && R.prog3.sk && R.prog3.sk.sword && R.prog3.sk.sword.level) || 0,
    };
  }, (v) => v.caps && v.p3, { timeout: 20000, label: 'prog3 adoption' }).catch(() => null);
  rec.ok('worker advertises caps.prog3 and the client adopts rpg.prog3', !!adopted, adopted);
  rec.ok('fresh character is level 3 (Σ of three level-1 trained skills)', adopted && adopted.level === 3, adopted);
  /* v2.3.1727: derived from the CLIENT mirror rather than the literal 106
     that was here.  The point of this assertion is that the client's
     recalcDerived agrees with the worker's _prog3Recompute — a hand-typed
     total silently stops testing that the moment either side is retuned,
     and re-typing the new number would just re-arm the same trap. */
  const expectHp = 100 + 3 * PROG3.HP_PER_LEVEL;
  rec.ok(`maxHp re-derives to the prog3 formula (100 + level×${PROG3.HP_PER_LEVEL})`,
    adopted && adopted.maxHp === expectHp, { ...adopted, expectHp });
  rec.ok('the allocation pool starts empty', adopted && adopted.pool === 0 && adopted.sword === 1, adopted);

  /* ── v2.3.1697: the aggregate stat readout (Character opens here) ──
     Armour became a SEVENTH cell in a grid that had six, and the fix for
     "seven into a 3-wide grid" was a fourth COLUMN rather than a third row
     — this panel's body is measured in single pixels and its scroll-edge
     fade is deliberately off, so anything below the fold is invisible with
     no cue.  Narrower columns move the risk from vertical to HORIZONTAL,
     so both are measured here: the block must not overflow its column, and
     no cell's own text may overflow the cell.

     ═══ v2.3.1972: THIS WAS FAILING ON THE SPELLING AND ON THE SHAPE ═══
     Both halves went red against a perfectly working screen, and both were
     this file being stale rather than the panel being broken:
       - the cell is labelled "Armor", not "Armour", and always has been
         (HeroExpanded's defenseCells);
       - it is a <span> inside a two-span row, so a `querySelectorAll('div')`
         search for a childless div could never have matched it under EITHER
         spelling;
       - and the flat 4x2 grid became two COLUMNS at v2.3.1890 (owner:
         "every stat is being treated as its own card... I'd switch to a
         character-sheet/list format"), Offense 4 + Defense 3, so
         `grid.children.length === 7` was asking about a container that no
         longer exists.
     Rewritten to find the ROW by its label span and count the seven rows
     inside the two-column block that holds them — which keeps the two things
     the assertions were actually for (the number is real, nothing is
     clipped) while letting the layout be whatever the owner last drew. */
  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(700);
  const armourCell = await P.page.evaluate(() => {
    /* A stat row is a div of exactly two spans: label, then value. */
    const rows = [...document.querySelectorAll('div')].filter((d) =>
      d.children.length === 2 && d.children[0].tagName === 'SPAN' && d.children[1].tagName === 'SPAN');
    const row = rows.find((d) => (d.children[0].textContent || '').trim() === 'Armor');
    if (!row) return { err: 'no ARMOR row on the character sheet',
      sawRows: rows.map((d) => (d.children[0].textContent || '').trim()).slice(0, 20) };
    /* row -> the group's list wrapper -> the group column -> the two-column
       block that holds Offense and Defense together. */
    const block = row.parentElement.parentElement.parentElement;
    const statRows = rows.filter((d) => block.contains(d));
    const over = statRows
      .flatMap((d) => [...d.children])
      .filter((t) => t.scrollWidth > t.clientWidth + 1)
      .map((t) => t.textContent.trim());
    return {
      value: (row.children[1].textContent || '').trim(),
      cells: statRows.length,
      gridOverflowX: block.scrollWidth - block.clientWidth,
      clipped: over,
    };
  });
  rec.ok('the character sheet shows an ARMOR row with a real percentage',
    !armourCell.err && /^\d+(\.\d)?%$/.test(String(armourCell.value || '')), armourCell);
  rec.ok('...and all seven stats still fit their column, uncropped',
    !armourCell.err && armourCell.cells === 7
    && armourCell.gridOverflowX <= 1 && armourCell.clipped.length === 0, armourCell);

  /* ── the Build tab renders the allocation screen ──
     v2.3.1972: "Points" is in the selector because v2.3.1849 renamed the tab
     (owner: "instead of build name it points") and the aria-label only falls
     back to "Build — N points" when there IS a badge.  This scenario's
     character has an EMPTY pool by design (asserted above), so the badge is
     absent and the label reads "Points" — which is why every Build assertion
     below it went red at once while the screen was fine.  All three spellings
     are listed rather than swapped, so the file survives the rename going
     either way. */
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]').first()
    .click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(500);
  /* ═══════════════════════════════════════════════════════════
     v2.3.2597: THE LAYOUT HALF OF THIS FILE IS GONE
     ═══════════════════════════════════════════════════════════
     Everything between the setup above and the forged-spend guard below used to
     measure the FOUR-COLUMN Points screen — headers at one height, thirteen
     stats mounted at once, tap-to-collapse, a weapon and Shared open together,
     and the same again swept across four narrow phones.  The owner replaced
     that screen with a 2x2 category grid you drill into (v2.3.2597), so those
     assertions do not describe a screen that exists.

     Their subject moved rather than vanished: mp-catgrid measures the thumb
     targets, the first cell in view, the type floor, sub-pixel clipping, the
     [+] geometry, the spend round trip and the category [i] — at FOUR
     viewports, portrait and landscape, where this file managed one each.

     WHAT STAYS HERE is what was never about layout, and is the reason this
     file is not retired the way mp-statgrid and mp-buildcols were:
       - the client adopts the worker's blob, and the level and maxHp maths;
       - a FORGED empty-pool allocate leaves the server blob untouched;
       - the transient XP bar reads the TRAINED skill, named as every other
         screen names it;
       - and the cap-off contract: a client whose worker does not advertise
         prog3 is never shown a world at all (v2.3.2439).
     That last one is deploy-order safety and the most expensive thing in this
     file to lose. */

  /* ── an empty-pool spend is refused SERVER-side, not just greyed out ── */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'prog3_allocate', payload: { stat: 'hp' } });
  });
  await P.page.waitForTimeout(1200);
  const admin = await H.adminPlayer(wsPort, myId);
  const blob = admin && admin.rpg;
  rec.ok('forged empty-pool spend leaves the server blob untouched',
    blob && blob.prog3 && (blob.prog3.alloc.hp || 0) === 0 && (blob.prog3.pool || 0) === 0,
    blob && blob.prog3);
  rec.ok('the persisted blob is respecced and stamped (_v ≥ 10)',
    blob && typeof blob._v === 'number' && blob._v >= 10 && blob.prog3.sk.staff.level === 1,
    blob && { _v: blob._v });

  /* ── v2.3.1686: the transient XP bar reads the TRAINED skill ──
     Owner: "I see an XP bar appear after killing monsters which would be
     fine if it represented one of the three active combat skills you're
     actually earning xp in."
     It was reading the LEGACY `weaponSkills` map, which prog3 retired — so
     it showed a level and a fill that no kill was feeding.
     The two tracks are seeded with deliberately different levels here, so
     the assertion can only pass by reading the right one: if the bar says
     Lv 40 it is still on the dead map, Lv 5 means prog3. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg; if (!R) return;
    R.weaponSkills = R.weaponSkills || {};
    R.weaponSkills.sword = { level: 40, xp: 999 };      /* the retired track */
    if (R.prog3 && R.prog3.sk) R.prog3.sk.sword = { level: 5, xp: 7 };
    S._hudPopups = S._hudPopups || [];
    S._hudPopups.push({ id: 'qa-xp', target: 'xpBar', text: '+12 XP',
      color: '#60a5fa', ts: Date.now() });
  });
  /* ═══ v2.3.1874: THE READOUT MOVED, THE QUESTION DID NOT ═══
     The transient top-centre bar this used to read is retired — a kill's XP
     now flies from the character into the combat CARD for its skill (see
     XpFlyOverlay / mp-xpfly).  The owner report behind these assertions is
     unchanged though ("an XP bar ... which would be fine if it represented
     one of the three active combat skills you're actually earning xp in"), so
     they are re-pointed at the card rather than deleted: the two tracks are
     still seeded with different levels above, and the card can still only
     show the right one by reading prog3. */
  /* Back to the resting dashboard first: the cards live there, and this
     scenario has been sitting on the Build screen.  The bar these assertions
     used to read floated over everything, so it needed no such step — the
     card is part of the dashboard and only exists when the dashboard does. */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) {} });
  await P.page.waitForTimeout(700);
  const cardText = await P.page.evaluate(() => {
    const el = [...document.querySelectorAll('[role="button"][aria-label*="level"]')]
      .find((e) => /Melee level/i.test(e.getAttribute('aria-label') || ''));
    if (!el) return null;
    return { aria: el.getAttribute('aria-label'), title: el.getAttribute('title') || '' };
  });
  rec.ok('the melee combat card is on screen to receive the XP', !!cardText, cardText);
  rec.ok('...showing the prog3 trained level, not the retired weapon-skill one',
    !!cardText && /level 5\b/i.test(cardText.aria) && !/level 40\b/i.test(cardText.aria), cardText);
  rec.ok('...named the way every other screen names it (Melee, not Sword)',
    !!cardText && /Melee/i.test(cardText.aria), cardText);

  await P.ctx.close().catch(() => {});

  /* ── THE POINTS SCREEN WITH THE CAP ABSENT (v2.3.2414, rewritten v2.3.2441) ──
     Owner, on production: combat levels reading 0 while the panel one tap
     behind them read Lv 1 for the same character in the same second.

     prog3Live is cap AND blob; prog3HasSkills is blob only.  v2.3.1901,
     v2.3.1902 and v2.3.1922 each moved ONE readout onto the blob-only gate.
     HeroExpanded's Build tab was missed all three times, and it did not
     merely print a wrong number -- it swapped the WHOLE SCREEN to a legacy
     six-tile grid whose levels come from R[key] || 0.  v2.3.2414 fixed the
     readout and pinned it here by stripping caps.prog3 out of state_sync
     and photographing the tiles.

     v2.3.2441: there are no tiles to photograph any more, and that is the
     point.  Since the entry gate (v2.3.2439, serverReady.js) a client that
     receives state_sync WITHOUT caps.prog3 is not shown a world at all: the
     loading screen holds, says the server is not ready, and the client
     re-joins.  The v2.3.2414 assertion ("no tile reads Lv 0") would now be
     true vacuously, so this section pins the contract that replaced it --
     the cap-off player never reaches the screen -- and keeps the blob guard,
     because a hold caused by a MISSING blob would be the wrong reason.  The
     full gate pin, all four roads, is mp-joingate. */
  const OLD = await H.newPlayer(browser, {
    name: 'CapOff', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
    init: () => {
      const RealWS = window.WebSocket;
      window.WebSocket = function (...a) {
        const ws = new RealWS(...a);
        ws.addEventListener('message', (e) => {
          try {
            const m = JSON.parse(e.data);
            if (m && m.type === 'state_sync' && m.caps) delete m.caps.prog3;
            else return;
            Object.defineProperty(e, 'data', { value: JSON.stringify(m) });
          } catch (err) { /* not ours */ }
        }, true);
        return ws;
      };
      window.WebSocket.prototype = RealWS.prototype;
      /* AND THE STATICS.  Not decoration: wsClient guards every send with
         `ws.readyState !== WebSocket.OPEN`, eight sites, and OPEN is a static
         on the CONSTRUCTOR -- which this wrapper replaces.  Omit it and the
         guard reads `undefined`, is true forever, and EVERY client->server
         message is dropped in silence while incoming traffic carries on, so
         the page joins and paints and looks perfectly healthy.  Cost a round
         in mp-dashreal before it was spotted; see TRAPS 69. */
      for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) {
        window.WebSocket[k] = RealWS[k];
      }
    },
  });
  /* enterWorld returns once the client has an id and a zone (state_sync
     still applies under the hold); its video wait times out and is caught. */
  await H.enterWorld(OLD);
  await OLD.page.waitForTimeout(3000);

  const capOff = await H.readState(OLD, (S) => ({
    cap: !!((S._serverCaps || {}).prog3),
    sk: (S.rpg && S.rpg.prog3 && S.rpg.prog3.sk && S.rpg.prog3.sk.sword && S.rpg.prog3.sk.sword.level) || null,
  }));
  rec.ok('cap-off client: the worker capability really is absent (guard)', capOff.cap === false, capOff);
  rec.ok('cap-off client: ...while the BLOB still carries the trained level (guard: '
       + 'a hold for a missing blob would be the wrong reason)', capOff.sk === 1, capOff);

  const held = await OLD.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    return {
      introUp: !!document.querySelector('.bt-intro'),
      lifted: !!(S && S.__introLiftedAt),
      status: ((document.querySelector('[data-intro-status]') || {}).textContent) || '',
      pointsScreen: !!document.querySelector('[aria-label="Points"]'),
    };
  });
  console.log('    cap-off hold: ' + JSON.stringify(held));
  rec.ok('cap-off: the loading screen HOLDS -- a world without prog3 is never shown (v2.3.2439)',
    held.introUp === true && held.lifted === false, held);
  rec.ok('cap-off: ...and says the server is not ready', /not fully up|retrying/i.test(held.status), held);
  rec.ok('cap-off: so there is no Points screen to read Lv 0 from', held.pointsScreen === false, held);

  await OLD.ctx.close().catch(() => {});
}
