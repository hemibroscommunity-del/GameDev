/* The gear stashes move to the server (v2.3.2523)
 *
 * Armour, legs, shields and cosmetic layers a player owns but is not
 * wearing lived only in their browser.  This slice gives the worker its
 * own copy, so that the auction house can escrow them later.  The unit
 * suite (server/test/gearstash.test.mjs) proves the adoption algebra
 * against a mocked storage; what it cannot prove is the half that runs
 * in a browser:
 *
 *   A. the join frame actually CARRIES the four seeds, and stays inside
 *      MAX_INBOUND_BYTES.  An oversized frame is dropped by the worker
 *      silently -- no close code, no error -- so that failure is not a
 *      truncated join, it is a player who never gets in and is never
 *      told why.  That is the one way this change could take the game
 *      away from someone, and no unit test can see it.
 *   B. the worker STORED what it was sent (read back through the admin
 *      rail, i.e. the persisted blob, not the in-memory copy), and
 *      echoes it in player_state.
 *   C. a reconnect does not duplicate anything -- the #615 crash shape,
 *      which here would mean armour multiplying on every login.
 *   D. the player's own bag still shows their gear afterwards.  This is
 *      the owner's phone check, driven here first.
 *
 * `init` seeds localStorage with a wardrobe before first paint.  That is
 * a PRECONDITION, not a stub: it stands in for "a character who already
 * owns gear", exactly as the harness's own `phrase` option stands in for
 * "a device that already has an identity".  No game code is replaced --
 * everything under test runs shipped.
 */
import * as H from './harness.mjs';

/* A believable wardrobe, including a genuine DUPLICATE (armour drops
   repeat) -- the case a naive by-signature merge would silently eat. */
const WARDROBE = {
  armorStash: [
    { name: 'Copper Plate', gearBase: 'copper', tierMult: 2, tier: 't2', def: 7 },
    { name: 'Copper Plate', gearBase: 'copper', tierMult: 2, tier: 't2', def: 7 },
    { name: 'Pine Plate', gearBase: 'wood', tierMult: 1, tier: 't1', def: 3 },
  ],
  legsStash: [{ name: 'Copper Greaves', gearBase: 'copper', tierMult: 2, tier: 't2', def: 4 }],
  shieldStash: [{ name: 'Pine Shield', gearBase: 'wood', tierMult: 1, tier: 't1' }],
  gearStash: [{ slot: 'chest', gearId: 'copperplate', name: 'Copper Plate' }],
};

export async function run({ browser, wsPort, webPort, rec }) {
  /* The init script does two jobs, both before first paint:
       - it TAPS the socket (join frames out, player_state in);
       - on phase 1 it STRIPS the four stash seeds from the join, which
         is a pre-v2.3.2523 client exactly: that is how this scenario
         manufactures a stored record with no capture stamp -- i.e. an
         existing character -- and it doubles as the deploy-order case
         (an old tab must not burn the one-time capture). */
  const tap = `(function () {
    window.__gsJoins = [];
    window.__gsStates = [];
    var strip = true;
    try { strip = localStorage.getItem('bt_gs_phase') !== '2'; } catch (e) {}
    var OS = WebSocket.prototype.send;
    WebSocket.prototype.send = function (d) {
      try {
        if (typeof d === 'string' && d.indexOf('"join"') > 0) {
          var m = JSON.parse(d);
          if (m && m.type === 'join') {
            if (strip && m.data) {
              ['rpgArmorStash', 'rpgLegsStash', 'rpgShieldStash', 'rpgGearStash'].forEach(function (k) { delete m.data[k]; });
              d = JSON.stringify(m);
              arguments[0] = d;
            }
            window.__gsJoins.push({ bytes: d.length, data: m.data, stripped: strip });
          }
        }
      } catch (e) {}
      return OS.apply(this, arguments);
    };
    var OAE = WebSocket.prototype.addEventListener;
    WebSocket.prototype.addEventListener = function (t, f, o) {
      if (t === 'message' && typeof f === 'function') {
        return OAE.call(this, t, function (ev) {
          try {
            var m = JSON.parse(ev.data);
            if (m && m.type === 'player_state') window.__gsStates.push(m.payload);
          } catch (e) {}
          return f.apply(this, arguments);
        }, o);
      }
      return OAE.apply(this, arguments);
    };
  }());`;

  /* ── phase 1: an existing character, made by a client that predates
     the seed.  Its stored blob must therefore carry NO capture stamp. ── */
  const P = await H.newPlayer(browser, { name: 'Wardrobe', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, init: tap });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const id = await H.readState(P, (S) => S && S.myId);
  const pre = (await H.adminPlayer(wsPort, id)).rpg || {};
  rec.ok('an old client (no stash seeds) does NOT burn the one-time capture',
    !pre.gearStashCaptured, pre.gearStashCaptured);
  rec.ok('...and its stored blob still has the five containers, from the migration',
    ['armorStash', 'legsStash', 'shieldStash', 'gearStash', 'amuletStash'].every((k) => Array.isArray(pre[k])),
    Object.keys(pre).filter((k) => /Stash$/.test(k)));

  /* Give that character the wardrobe it has always had in its own
     browser, then come back as the upgraded client. */
  await P.page.evaluate((W) => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg) return;
    Object.assign(S.rpg, W);
    try { localStorage.setItem('bt_rpg', JSON.stringify(S.rpg)); } catch (e) {}
    try { localStorage.setItem('bt_gs_phase', '2'); } catch (e) {}
  }, WARDROBE);

  /* ── phase 2: the same device, the same character, the new client ── */
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await walkIn(P);
  await P.page.waitForTimeout(2500);

  const joins = (await P.page.evaluate('window.__gsJoins')).filter((j) => !j.stripped);
  rec.ok('the join frame carries all four gear-stash seeds',
    joins.length > 0 && ['rpgArmorStash', 'rpgLegsStash', 'rpgShieldStash', 'rpgGearStash']
      .every((k) => Array.isArray(joins[0].data[k])),
    joins.length ? Object.keys(joins[0].data).filter((k) => /Stash$/.test(k)) : 'no join captured');
  /* v2.3.2527 (review finding 1b): a key is present only when it has
     something in it.  This wardrobe fills all four, so all four are
     here -- what is asserted is the converse: nothing arrives as the
     bare `[]` that used to make "I own none" and "this browser does not
     know" the same sentence, and the worker close the capture on it. */
  rec.ok('...and no seed arrives as an empty array',
    joins.length > 0 && !Object.keys(joins[0].data)
      .some((k) => /^rpg.*Stash$/.test(k) && Array.isArray(joins[0].data[k]) && !joins[0].data[k].length),
    joins.length ? Object.keys(joins[0].data).filter((k) => /^rpg.*Stash$/.test(k) && !joins[0].data[k].length) : null);
  /* v2.3.2527 (review finding 3): the amulet list has no client source,
     so an honest client never claims one -- and the worker no longer
     reads the key even if one arrives. */
  rec.ok('...and the client never sends an amulet claim',
    joins.length > 0 && !('rpgAmuletStash' in joins[0].data),
    joins.length ? Object.keys(joins[0].data).filter((k) => /Amulet/.test(k)) : null);
  rec.ok('...carrying the whole wardrobe, duplicate included',
    joins.length > 0 && joins[0].data.rpgArmorStash.length === 3
      && joins[0].data.rpgLegsStash.length === 1
      && joins[0].data.rpgShieldStash.length === 1
      && joins[0].data.rpgGearStash.length === 1,
    joins.length ? joins[0].data.rpgArmorStash : null);
  rec.ok('...and the whole join stays well inside the 16 KB frame gate',
    joins.length > 0 && joins[0].bytes < 16384,
    joins.length ? joins[0].bytes : null);
  if (joins.length) console.log(`      join frame: ${joins[0].bytes} bytes`);

  const blob = (await H.adminPlayer(wsPort, id)).rpg || {};
  rec.ok('the PERSISTED blob carries the adopted armour stash (3, duplicate kept)',
    Array.isArray(blob.armorStash) && blob.armorStash.length === 3, blob.armorStash);
  rec.ok('...legs, shield and cosmetic too',
    blob.legsStash?.length === 1 && blob.shieldStash?.length === 1 && blob.gearStash?.length === 1,
    { legs: blob.legsStash, shield: blob.shieldStash, gear: blob.gearStash });
  rec.ok('...an empty amuletStash (no client amulet stash exists yet)',
    Array.isArray(blob.amuletStash) && blob.amuletStash.length === 0, blob.amuletStash);
  /* v2.3.2527: the stamp records a real, COMPLETE capture -- it took
     something and the cap did not cut it short -- rather than merely
     recording that a claim was heard.  It no longer gates adoption:
     the next join's claim is merged in too (idempotently). */
  rec.ok('...and now the capture stamp, a real capture having landed', blob.gearStashCaptured === true, blob.gearStashCaptured);

  const states = await P.page.evaluate('window.__gsStates');
  const echoed = {};
  for (const s of states) Object.assign(echoed, s);
  rec.ok('player_state echoes the server copy back',
    Array.isArray(echoed.armorStash) && echoed.armorStash.length === 3, echoed.armorStash);

  const bagBefore = await H.readState(P, (S) => ({
    armor: (S.rpg.armorStash || []).length,
    legs: (S.rpg.legsStash || []).length,
    shield: (S.rpg.shieldStash || []).length,
    gear: (S.rpg.gearStash || []).length,
  }));
  rec.ok('the player still holds their own wardrobe (nothing was taken away)',
    bagBefore.armor === 3 && bagBefore.legs === 1 && bagBefore.shield === 1 && bagBefore.gear === 1,
    bagBefore);

  /* ── phase 3: a reconnect adds nothing ── */
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await walkIn(P);
  await P.page.waitForTimeout(2500);
  const blob2 = (await H.adminPlayer(wsPort, id)).rpg || {};
  rec.ok('after a reconnect the stored stash is still exactly 3 (no double-adopt)',
    blob2.armorStash?.length === 3, blob2.armorStash);
  rec.ok('...and the other three lists are unchanged as well',
    blob2.legsStash?.length === 1 && blob2.shieldStash?.length === 1 && blob2.gearStash?.length === 1,
    { legs: blob2.legsStash?.length, shield: blob2.shieldStash?.length, gear: blob2.gearStash?.length });
  const bagAfter = await H.readState(P, (S) => ({
    armor: (S.rpg.armorStash || []).length,
    legs: (S.rpg.legsStash || []).length,
  }));
  rec.ok('...and the bag still shows the same gear after the reload',
    bagAfter.armor === 3 && bagAfter.legs === 1, bagAfter);

  await P.ctx.close();
}

/* A device that already holds a Login Key stops at the door (v2.3.2447):
   Continue, then the character row.  Written to tolerate the older
   walk-straight-in route as well, so this scenario does not become a test
   of the login screen. */
async function walkIn(P) {
  /* Liveness here is "this page has actually joined", i.e. a join frame
     went out on THIS load -- not `S.myId && S.currentZone`, which are
     both set from the key and the default zone while the login door is
     still up (that reads as live and skips the door). */
  const joined = () => P.page.evaluate('(window.__gsJoins || []).length > 0');
  await P.page.waitForTimeout(1500);
  if (!(await joined())) {
    if (await H.openPicker(P.page)) {
      await P.page.waitForSelector('[data-tut="char-row"]', { timeout: 20000 }).catch(() => {});
      const row = await P.page.$('[data-tut="char-row"]');
      if (row) await row.click();
    }
  }
  await P.page.waitForFunction('(window.__gsJoins || []).length > 0', null, { timeout: 90000, polling: 500 }).catch(() => {});
  await P.page.waitForFunction(() => {
    const S = window._gameState && window._gameState.current;
    return !!(S && S.rpg && S._realtimeStatus === 'connected');
  }, null, { timeout: 90000, polling: 500 }).catch(() => {});
}
