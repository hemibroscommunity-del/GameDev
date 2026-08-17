/* The material recolor pipeline (v2.3.1757).
 *
 * Owner: "recolor the iron torso and iron legs to make it copper ... architect
 * it the way it would work best performance wise."  The performance claim IS
 * the design — one art set, tinted — so these assertions are about the claim
 * and not only about the colour:
 *
 *   - a copper piece is drawn with the copper tint, read off the live sprite
 *   - it loads NO new sheet: the copper textures are the steel textures
 *   - steel stays on the native no-op white (the recolor cannot regress it)
 *   - the tint clears on unequip, so a sprite recycled from a copper wearer
 *     does not leave the next pose in copper
 *
 * Read through __btGearTints, which walks the sprites the renderer is holding
 * rather than the state we asked it for — the difference matters, because a
 * tint clobbered later in the frame would still satisfy a state check.
 */
import * as H from './harness.mjs';

const COPPER = 0xFF9E58; /* materialTints copper at full brightness (v2.3.1761) */
const NATIVE = 0xFFFFFF;

const gearTints = (P) => P.page.evaluate(() => (window.__btGearTints ? window.__btGearTints() : null));
const sheetKeys = (P) => P.page.evaluate(() => (window.__btGearSheets ? window.__btGearSheets() : null));
const setGear = (P, slot, id) => P.page.evaluate(({ s, i }) => {
  if (!window.__btSetGear) return 'missing';
  window.__btSetGear(s, i);
  return 'ok';
}, { s: slot, i: id });

/* The armour slots only — the shirt carries the player's shirt colour on the
   same tint channel by design, so including it would make "everything is
   native white" false for reasons that have nothing to do with metals. */
const armour = (t) => (t && t.slots ? t.slots.filter((s) => s.slot === 'chest' || s.slot === 'legs') : []);

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Smith', nameB: 'Onlooker' });

  const table = await A.page.evaluate(() => (window.__btMaterials ? window.__btMaterials() : null));
  rec.ok('the metals table derives copper from the owner-picked swatch',
    !!table && !!table.copper && table.copper.tint === COPPER
    && !!table.steel && table.steel.tint === NATIVE, table);

  /* ── steel: the control ── */
  rec.ok('the test can drive the equip store', (await setGear(A, 'chest', 'steelplate')) === 'ok');
  await setGear(A, 'legs', 'steelgreaves');
  await A.page.waitForTimeout(2000);
  const steel = await gearTints(A);
  const steelWorn = armour(steel).filter((s) => s.visible);
  rec.ok('the steel set is actually on screen (guard: nothing below means anything otherwise)',
    steelWorn.length === 2, steel);
  rec.ok('steel draws on the native no-op tint',
    steelWorn.length > 0 && steelWorn.every((s) => s.tint === NATIVE), steel);
  const steelSheets = await sheetKeys(A);
  const steelSrc = steelWorn.map((s) => s.src).join(',');

  /* ── copper ── */
  await setGear(A, 'chest', 'copperplate');
  await setGear(A, 'legs', 'coppergreaves');
  await A.page.waitForTimeout(2000);
  const copper = await gearTints(A);
  const copperWorn = armour(copper).filter((s) => s.visible);
  rec.ok('the copper set is on screen', copperWorn.length === 2, copper);
  rec.ok('copper draws with the copper tint',
    copperWorn.length > 0 && copperWorn.every((s) => s.tint === COPPER), copper);

  /* THE PERFORMANCE CLAIM, stated two ways.  Baked art would show up as extra
     sheets AND as different texture sources; sharing the source is the property
     that makes a metal free. */
  const copperSheets = await sheetKeys(A);
  /* Compare the KEYS, not the count: the count also grows when the player
     simply turns and a new direction's steel sheet builds, which would make a
     count check fail for a reason that has nothing to do with the recolor.
     What must be true is that no key names a copper piece. */
  const copperKeys = (copperSheets || []).filter((k) => /copper/i.test(k));
  const added = (copperSheets || []).filter((k) => !(steelSheets || []).includes(k));
  rec.ok('...without building a single sheet for the copper set',
    copperKeys.length === 0, { copperKeys, added });
  rec.ok('...off the very same texture the steel set draws from',
    copperWorn.length > 0 && copperWorn.map((s) => s.src).join(',') === steelSrc,
    { steelSrc, copperSrc: copperWorn.map((s) => s.src).join(',') });

  /* ── v2.3.1759: MIXED SETS ──
     Owner: "it's possible to wear different combination of armor like copper
     legs with iron torso right?"  Yes, and it falls out of the design rather
     than needing support: chest and legs are separate slots, each carrying its
     own material, and the tint is per SPRITE.  Proven here with copper legs
     under a steel torso — two metals on one character at the same time. */
  await setGear(A, 'chest', 'steelplate');
  await setGear(A, 'legs', 'coppergreaves');
  await A.page.waitForTimeout(2000);
  const mixed = armour(await gearTints(A)).filter((x) => x.visible);
  const mChest = mixed.find((x) => x.slot === 'chest');
  const mLegs = mixed.find((x) => x.slot === 'legs');
  rec.ok('two different metals can be worn at once',
    !!mChest && !!mLegs && mChest.tint === NATIVE && mLegs.tint === COPPER, mixed);

  /* ── and it comes back off ── */
  await setGear(A, 'chest', 'steelplate');
  await setGear(A, 'legs', 'steelgreaves');
  await A.page.waitForTimeout(2000);
  const back = armour(await gearTints(A)).filter((s) => s.visible);
  rec.ok('unequipping the copper returns the sprite to native steel',
    back.length > 0 && back.every((s) => s.tint === NATIVE), back);

  /* ═══ v2.3.1758: COPPER AS A REAL TIER, NOT A DEV COMMAND ═══
     Everything above drives the equip store directly, which proves the
     RENDERER.  It says nothing about whether a player can ever obtain the
     stuff.  This half walks the actual reward: the worker grants the tier-one
     piece, it lands in the bag carrying its material, wearing it puts copper
     art on the character, and — the part no single-client test can see — the
     OTHER player's screen shows copper too. */
  await setGear(A, 'chest', 'none');
  await setGear(A, 'legs', 'none');
  await A.page.waitForTimeout(600);

  const aId = await H.readState(A, (S) => S.myId);
  const send = (P, msg) => P.page.evaluate((m) => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send(m);
  }, msg);
  /* life_2 pays the tier-one TORSO for five ore — the copper-ore quest the
     owner named ("you mine copper ore"). */
  await send(A, { type: 'quest_accept', payload: { questId: 'life_1' } });
  await A.page.waitForTimeout(900);
  await H.grant(wsPort, aId, 'item', { invKey: 'cooked_fish_trout', count: 2 });
  await A.page.waitForTimeout(1000);
  await send(A, { type: 'quest_turn_in', payload: { questId: 'life_1', xpCat: 'sword' } });
  await A.page.waitForTimeout(1400);
  await send(A, { type: 'quest_accept', payload: { questId: 'life_2' } });
  await A.page.waitForTimeout(900);
  await H.grant(wsPort, aId, 'item', { invKey: 'ore_copper_ore', count: 5 });
  await A.page.waitForTimeout(1000);
  await send(A, { type: 'quest_turn_in', payload: { questId: 'life_2', xpCat: 'sword' } });
  await A.page.waitForTimeout(2000);

  const stash = await H.readState(A, (S) => (S.rpg.armorStash || [])
    .map((a) => ({ name: a && a.name, mat: a && a.mat })));
  rec.ok('the mining quest pays a COPPER torso',
    stash.some((a) => a.name === 'Copper Torso'), stash);
  rec.ok('...and the piece carries its material into the bag (the art depends on it)',
    stash.some((a) => a.name === 'Copper Torso' && a.mat === 'copper'), stash);

  /* Wear it the way the player does — through the equip action, not by poking
     the cosmetic store. */
  const wore = await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (!R || !Array.isArray(R.armorStash) || !R.armorStash.length) return 'no piece';
    const i = R.armorStash.findIndex((a) => a && a.name === 'Copper Torso');
    if (i < 0) return 'not found';
    R.armor = R.armorStash.splice(i, 1)[0];
    if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
    return 'worn';
  });
  rec.ok('the quest piece can be worn', wore === 'worn', wore);
  await A.page.waitForTimeout(1800);
  const wornTint = armour(await gearTints(A)).find((x) => x.slot === 'chest');
  rec.ok('a worn quest torso renders in COPPER, from its material alone',
    !!wornTint && wornTint.visible && wornTint.tint === COPPER, wornTint);

  /* ── and the other player sees it ──
     The equip id is what crosses the wire, so this is the whole remote story:
     if B's copy of A's equipment says copperplate, B's renderer resolves the
     same art and the same tint A's does. */
  const seen = await H.waitFor(B, (S) => {
    const o = S.others && S.others[Object.keys(S.others || {})[0]];
    return o && o.equip ? o.equip.chest : null;
  }, (v) => v === 'copperplate', { timeout: 15000, label: 'B sees copper on A' })
    .then(() => true).catch(() => false);
  rec.ok('the other player sees the copper piece, not the steel one', seen,
    await H.readState(B, (S) => {
      const o = S.others && S.others[Object.keys(S.others || {})[0]];
      return o ? o.equip : null;
    }));

  /* ═══ v2.3.1760: WEAPONS TAKE THE SAME METALS ═══
     Owner: "I do want copper and iron weapons also.  First weapon should be
     copper.  Make sure weapons get the full treatment armor is getting.  Only
     for metals though not staff or bow."

     The starter sword is minted at the copper tier, so this needs no dev hook:
     accept tut_1 the way a player does and read what the renderer draws. */
  await send(A, { type: 'quest_accept', payload: { questId: 'tut_1' } });
  await A.page.waitForTimeout(2000);
  const starter = await H.readState(A, (S) => {
    const w = (S.rpg.weaponStash || []).find((x) => x && /Bro's Sword/.test(x.name || ''));
    return w ? { type: w.type, gearBase: w.gearBase, mult: w.tierMult } : null;
  });
  rec.ok('the first weapon in the game is copper', !!starter && starter.gearBase === 'copper', starter);

  /* Hold it, and read the tint off the weapon sprite the renderer is drawing. */
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg; if (!R) return;
    const i = (R.weaponStash || []).findIndex((w) => w && /Bro's Sword/.test(w.name || ''));
    if (i < 0) return;
    R.weapon = R.weaponStash.splice(i, 1)[0];
    R.activeSlot = 'melee';
  });
  await A.page.waitForTimeout(2000);
  const wpn = await A.page.evaluate(() => (window.__btWeaponTint ? window.__btWeaponTint() : null));
  rec.ok('a copper sword is drawn in copper', !!wpn && wpn.local === COPPER, wpn);

  /* ...and the peer sees the same metal — the gap v2.3.1757 left open. */
  const peerSaw = await H.waitFor(B, (S) => {
    const o = S.others && S.others[Object.keys(S.others || {})[0]];
    return o ? o.wpnMat : null;
  }, (v) => v === 'copper', { timeout: 15000, label: 'B sees the copper sword' })
    .then(() => true).catch(() => false);
  rec.ok('the other player sees the weapon metal too', peerSaw,
    await H.readState(B, (S) => {
      const o = S.others && S.others[Object.keys(S.others || {})[0]];
      return o ? { wpnType: o.wpnType, wpnMat: o.wpnMat } : null;
    }));

  /* Owner: metals only.  A staff is minted 'ww_wood', so it must stay native
     however the tint pipeline grows. */
  const staffNative = await A.page.evaluate(() => {
    const M = window.__btWeaponMaterial;
    return M ? { staff: M('staff', 'ww_wood'), bow: M('bow', 'ww_hardwood'),
      sword: M('sword', 'copper'), woodSword: M('sword', 'wood') } : null;
  });
  rec.ok('a bow and a staff never take a metal', !!staffNative
    && staffNative.staff === null && staffNative.bow === null
    && staffNative.sword === 'copper', staffNative);

  /* ═══ v2.3.1761: A MIXED PAIR, IN EVERY DIRECTION ═══
     Owner: "it didn't display consistently when I was wearing a combo of
     different armor pieces jogging in each direction.  Some directions it
     changed the armor to match the full copper set and other directions it
     correctly showed the iron greaves I was wearing."

     The painted fullset figure is ONE sheet carrying both pieces, so it can
     only be one colour, and it was taking the chest's — repainting mismatched
     legs, but only on the jog dirs that ship a figure.  Hence "some
     directions".  Walked through EVERY direction here: a per-direction bug
     that is only checked facing south passes while the player watches their
     armour change colour as they turn. */
  await setGear(A, 'chest', 'copperplate');
  await setGear(A, 'legs', 'steelgreaves');
  await A.page.waitForTimeout(1500);
  const DIRS = ['down', 'up', 'left', 'right', 'downleft', 'downright', 'upleft', 'upright'];
  const perDir = [];
  for (const d of DIRS) {
    /* jog, because the figure only ever replaces the JOG frames */
    await A.page.evaluate((dir) => {
      const S = window._gameState.current;
      const k = { down: 's', up: 'w', left: 'a', right: 'd' };
      S.keys = {};
      if (dir.includes('down')) S.keys[k.down] = true;
      if (dir.includes('up')) S.keys[k.up] = true;
      if (dir.includes('left')) S.keys[k.left] = true;
      if (dir.includes('right')) S.keys[k.right] = true;
    }, d);
    await A.page.waitForTimeout(900);
    const t = await gearTints(A);
    const ch = (t && t.slots || []).find((x) => x.slot === 'chest');
    const lg = (t && t.slots || []).find((x) => x.slot === 'legs');
    perDir.push({ dir: d, chest: ch && ch.visible ? ch.tint : null,
      legs: lg && lg.visible ? lg.tint : null, body: t && t.bodyTint });
  }
  await A.page.evaluate(() => { window._gameState.current.keys = {}; });
  await A.page.waitForTimeout(600);
  /* The legs must never come out copper, and the BODY must never be tinted —
     a body carrying the metal means the figure took over and repainted both. */
  const legsRepainted = perDir.filter((r) => r.legs === COPPER);
  const bodyPainted = perDir.filter((r) => r.body != null && r.body !== NATIVE);
  rec.ok('a mixed pair keeps each piece its own metal in every direction',
    legsRepainted.length === 0 && bodyPainted.length === 0, perDir);
  rec.ok('...and the copper torso is still copper throughout (guard: not simply unrendered)',
    perDir.some((r) => r.chest === COPPER), perDir);

  /* ═══ v2.3.1761: THE CHARACTER EQUIP MENU ═══
     Owner: "Also test the character equip menu works correctly.  It was
     showing iron greaves thumbnail in legs when I had nothing equipped."

     Two claims, and they need separate checks: an EMPTY legs slot must draw no
     armour art at all, and the picker must offer only tiers that exist in the
     game — the steel set is out until the owner adds it back, and it was
     reaching players through the ownership fallback (own any piece for a slot
     -> be offered every catalogued id for it). */
  await setGear(A, 'chest', 'none');
  await setGear(A, 'legs', 'none');
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg) return;
    /* nothing WORN, but a piece owned — the state the owner was in */
    S.rpg.armor = null; S.rpg.legsArmor = null;
    S.rpg.legsStash = [{ name: 'Copper Greaves', tierMult: 1, slot: 'legsArmor', mat: 'copper' }];
    if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(S.rpg);
  });
  await A.page.waitForTimeout(1200);
  await H.openDest(A, 'Character').catch(() => {});
  await A.page.waitForTimeout(1200);

  /* The cell ALWAYS draws an image — either the piece's art or the slot
     silhouette — so "no art" means the GHOST, not a missing img. */
  const legsCell = async () => A.page.evaluate(() => {
    const cell = document.querySelector('[aria-label="Legs"][role="button"]')
      || document.querySelector('[aria-label="Legs"]');
    if (!cell) return { err: 'no Legs cell' };
    const img = cell.querySelector('img');
    const src = img ? img.getAttribute('src') || '' : '';
    return { src, ghost: /slot-legs/.test(src), armour: /greaves/i.test(src) };
  });
  const emptyCell = await legsCell();
  rec.ok('an empty legs slot shows the silhouette, not armour art',
    !emptyCell.err && emptyCell.ghost && !emptyCell.armour, emptyCell);

  /* The owner's exact symptom is a cell drawing greaves with nothing worn, and
     the way to get there is a STALE cosmetic layer: the equip store persists to
     localStorage, so an id left over from a piece since removed outlives the
     stat piece it was derived from.  Forced here rather than hoped for. */
  await setGear(A, 'legs', 'coppergreaves');
  await A.page.waitForTimeout(1200);
  const staleCell = await legsCell();
  const staleWorn = await H.readState(A, (S) => !!(S.rpg && S.rpg.legsArmor));
  rec.ok('a legs layer left set with no piece owned is a real hazard (guard)',
    !staleCell.err && staleCell.armour && !staleWorn, { staleCell, staleWorn });

  const offered = await A.page.evaluate(() => {
    const ids = window.__btGearCatalog ? window.__btGearCatalog() : null;
    return ids;
  });
  rec.ok('the steel set is no longer offered anywhere in the game',
    !!offered && !offered.legs.includes('steelgreaves') && !offered.chest.includes('steelplate'),
    offered);
  rec.ok('...and copper is', !!offered && offered.legs.includes('coppergreaves')
    && offered.chest.includes('copperplate'), offered);

  /* ═══ v2.3.1761: A RETURNING PLAYER'S SAVE, THROUGH THE REAL LOAD ═══
     Owner: "[the steel/iron armor is] appearing in player inventories who now
     also have the copper."

     Their save was written before copper existed, so it holds "Iron Greaves"
     with no material.  The migration renames it — but the WORN LAYER is derived
     during load by reconcileGearStash, and the migration used to run after
     that, so the character came up in steel art while the bag said copper.

     Driven by writing the old save shape into localStorage and RELOADING, so
     the load ordering itself is what is under test.  Poking the migration
     directly would pass with the bug still in place, since the bug is WHEN it
     runs, not what it does. */
  /* The legacy record has to live on the WORKER, not just in localStorage:
     the worker owns these two slots and re-sends them on every snapshot, so a
     client-only seed is overwritten within a second and would test nothing.
     stats_update is the shipped path a client uses to tell the worker what it
     is wearing, so this writes the pre-copper shape the way a v2.3.1757 client
     would have. */
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'stats_update', payload: {
      legsArmor: { name: 'Iron Greaves', tierMult: 1 },
      armor: { name: 'Iron Torso', tierMult: 1 },
    } });
  });
  await A.page.waitForTimeout(2500);
  await A.page.evaluate(() => {
    /* a cosmetic layer left on steel — what the old load order wrote */
    localStorage.setItem('bt-gear-v3-legs', 'steelgreaves');
    localStorage.setItem('bt-gear-v3-chest', 'steelplate');
  });
  await A.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(A).catch(() => {});
  await A.page.waitForTimeout(4000);

  const migrated = await H.readState(A, (S) => ({
    legs: S.rpg && S.rpg.legsArmor ? { name: S.rpg.legsArmor.name, mat: S.rpg.legsArmor.mat } : null,
    chest: S.rpg && S.rpg.armor ? { name: S.rpg.armor.name, mat: S.rpg.armor.mat } : null,
  }));
  rec.ok('an old save is renamed to the copper tier on load',
    !!migrated.legs && migrated.legs.name === 'Copper Greaves' && migrated.legs.mat === 'copper'
    && !!migrated.chest && migrated.chest.name === 'Copper Torso', migrated);

  const layers = await A.page.evaluate(() => {
    const g = window._gameFns && window._gameFns.getEquip;
    return g ? { legs: g('legs'), chest: g('chest') } : null;
  });
  rec.ok('...and the character comes up in COPPER, not the steel the old order left',
    !!layers && layers.legs === 'coppergreaves' && layers.chest === 'copperplate', layers);

  /* ── the body sprite is not left wearing the metal ──
     The fullset knight figure is armour art assigned onto the BODY sprite, so
     its colour has to be cleared the moment the figure is not in play or an
     unarmoured player jogs around copper. */
  await setGear(A, 'chest', 'none');
  await setGear(A, 'legs', 'none');
  await A.page.waitForTimeout(2000);
  const bare = await gearTints(A);
  rec.ok('a bare body is never left tinted', !!bare && bare.bodyTint === NATIVE, bare);

  await A.ctx.close(); await B.ctx.close();
}
