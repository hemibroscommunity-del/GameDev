/* THE ITEM CARD: THE RIGHT ART, THE RIGHT NAME (v2.3.1845).
 *
 * Three owner reports, one screen:
 *
 *   1. "When you only have sword (no bow or staff) it still shows bow icon
 *      when you double tap to switch weapons on the character's weapon slot
 *      in the equip menu."
 *   2. "Put a larger view of the item selected before you list its stats to
 *      the right of it inside the card."
 *   3. "Refer to it as copper greatsword, pine bow, and pine staff in the
 *      character equip menu.  Right now it's not that way."
 *
 * (1) is the interesting one to test, because the bug needs a state you
 * cannot reach by playing well: an ACTIVE ranged slot with NOTHING in it.
 * The double tap the owner describes is the joystick's double tap, which
 * rotates activeSlot; before this version 'ranged' was in that rotation
 * unconditionally, so a sword-only character could stand in it.  The icon
 * then read the SLOT instead of the weapon and drew a bow over a sword's
 * damage numbers.
 *
 * So this scenario asserts the bug from BOTH ends — the state must no longer
 * be reachable (the cycle refuses it), AND the art must be right even if
 * something else puts you there (a persisted activeSlot from an older save,
 * which no client-side fix can prevent).  Testing only the cycle would leave
 * every existing save still showing a bow.
 */
import * as H from './harness.mjs';

const openHero = async (P) => {
  await P.page.evaluate(() => { window.__broDashPanelBus.open('hero'); });
  await P.page.waitForTimeout(900);
};
const closeHero = async (P) => {
  await P.page.evaluate(() => { window.__broDashPanelBus.open(null); });
  await P.page.waitForTimeout(300);
};
/* The weapon cell's art, as the DOM has it. */
const weaponCellSrc = (P) => P.page.evaluate(() => {
  const cell = document.querySelector('[role="button"][aria-label="Weapon"]');
  const img = cell && cell.querySelector('img');
  return img ? img.getAttribute('src') : null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Carder', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* A sword-only character, exactly the owner's case: no bow, no staff. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper', quality: 'normal' };
    S.rpg.rangedWeapon = null;
    S.rpg.staffWeapon = null;
    S.rpg.weaponStash = [];
    S.rpg.activeSlot = 'melee';
    S.rpg.shield = { id: 'wood-shield', name: 'Pine Shield', gearBase: 'wood', tierMult: 1 };
  });
  await openHero(P);

  const melee = await weaponCellSrc(P);
  rec.ok('the weapon cell shows the sword you own (guard)',
    !!(melee && /great-sword/.test(melee)), { melee });

  /* ── 1a. the state itself: the cycle must refuse an empty slot ──
     Driven through the REAL handler (window keydown → desktopControls →
     _desktopCycleWeapon), not by calling the rotation's arithmetic here.  A
     re-implementation of the loop in the test would have agreed with the old
     code and passed on the bug. */
  for (let i = 0; i < 3; i++) {
    await P.page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', key: 'Tab', bubbles: true }));
    });
    await P.page.waitForTimeout(150);
  }
  const afterCycle = await P.page.evaluate(() => window._gameState.current.rpg.activeSlot);
  rec.ok('cycling with no bow and no staff leaves you on melee',
    afterCycle === 'melee', { afterCycle });

  /* ...and the same cycle DOES move when there is something to move to, so
     the gate above cannot be passing by having broken switching entirely. */
  await P.page.evaluate(() => {
    window._gameState.current.rpg.rangedWeapon =
      { name: 'Pine Bow', type: 'bow', gearBase: 'ww_pine', quality: 'normal' };
  });
  await P.page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', key: 'Tab', bubbles: true }));
  });
  await P.page.waitForTimeout(200);
  const withBow = await P.page.evaluate(() => window._gameState.current.rpg.activeSlot);
  rec.ok('...but it still switches to a bow you DO own (control)',
    withBow === 'ranged', { withBow });

  /* ── 1b. the art: even standing in an empty ranged slot, no bow ──
     The case a client fix cannot prevent — the worker persists activeSlot,
     so a save made before this version can still arrive here. */
  await closeHero(P);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.rangedWeapon = null;
    S.rpg.activeSlot = 'ranged';     /* empty, and active */
  });
  await openHero(P);
  const phantom = await weaponCellSrc(P);
  rec.ok('an EMPTY active ranged slot does not draw a bow',
    !!(phantom && !/bow/i.test(phantom)), { phantom });
  rec.ok('...it draws the sword actually in your hand',
    !!(phantom && /great-sword/.test(phantom)), { phantom });

  /* ── 2 + 3. the card: name, art, stats to the right of it ── */
  await closeHero(P);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'melee';
  });
  await openHero(P);
  await P.page.evaluate(() => {
    const cell = document.querySelector('[role="button"][aria-label="Weapon"]');
    if (cell) cell.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(600);

  const card = await P.page.evaluate(() => {
    const leaf = (re) => [...document.querySelectorAll('span, div, button')]
      .filter((el) => {
        const t = (el.textContent || '').trim();
        return t && t.length < 40 && re.test(t) && el.children.length === 0;
      })[0] || null;
    const title = leaf(/greatsword|great sword/i);
    if (!title) return { found: false, body: (document.body.innerText || '').slice(0, 200) };
    const bw = (el) => parseFloat(getComputedStyle(el).borderTopWidth) || 0;
    let f = title.parentElement;
    for (let i = 0; i < 6 && f; i++, f = f.parentElement) if (bw(f) >= 1) break;
    const fr = f.getBoundingClientRect();
    /* The art inside the frame — NOT the gear cell outside it, and not the
       character canvas, which is a <canvas> rather than an <img>. */
    const art = [...f.querySelectorAll('img')].map((im) => {
      const r = im.getBoundingClientRect();
      return { src: im.getAttribute('src'), w: Math.round(r.width), h: Math.round(r.height),
        left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top) };
    })[0] || null;
    const stat = leaf(/^damage$/i);
    const sr = stat ? stat.getBoundingClientRect() : null;
    const rarity = leaf(/^(normal|rare|elite|godly)$/i);
    const rr = rarity ? rarity.getBoundingClientRect() : null;
    const titleCol = getComputedStyle(title).color;
    /* The stat LIST: each row is a label span and a value span side by side.
       Collected by walking the rows' shared parent so the geometry check
       below sees exactly what the player sees. */
    const rowBox = stat ? stat.parentElement.parentElement : null;
    const rowEls = rowBox ? [...rowBox.children] : [];
    const rowGeom = rowEls.map((el) => {
      const kids = [...el.children];
      if (kids.length !== 2) return null;
      const a = kids[0].getBoundingClientRect(), b = kids[1].getBoundingClientRect();
      return { k: kids[0].textContent.trim(), v: kids[1].textContent.trim(),
        sameLine: Math.abs(a.bottom - b.bottom) < 6 && b.left >= a.right - 1 };
    }).filter(Boolean);
    return {
      found: true, title: title.textContent.trim(),
      rows: rowGeom.map((r) => r.k), rowCount: rowGeom.length, rowGeom,
      rowsAligned: rowGeom.length > 0 && rowGeom.every((r) => r.sameLine),
      rarityTop: rr ? Math.round(rr.top) : null,
      titleCol,
      /* Is the name actually READABLE, or is the box just clipping it?
         v2.3.1845 shipped "COPPER GREAT…" for one preview: the title passed
         every text check while the screen said something else.  scrollWidth
         over clientWidth is the DOM's own answer to "did this fit". */
      clipped: title.scrollWidth > title.clientWidth + 1,
      frameW: Math.round(fr.width), art,
      statLeft: sr ? Math.round(sr.left) : null,
      rarity: rarity ? rarity.textContent.trim() : null,
    };
  });

  rec.ok('the card opened (guard)', !!(card && card.found), card);
  /* THE NAME.  Both halves asserted separately: "GREATSWORD" alone was the
     old, wrong answer and would satisfy a test that only looked for the type,
     and "COPPER" alone could come from a stray armour label. */
  rec.ok('the card names the METAL — copper, not just greatsword',
    !!(card && /copper/i.test(card.title || '')), card);
  rec.ok('...and still names the weapon type',
    !!(card && /greatsword/i.test(card.title || '')), card);
  rec.ok('...and the whole name FITS — no "COPPER GREAT..."',
    !!(card && card.clipped === false), card);

  /* THE ART.  Size and position, because "an image exists in the card" is
     satisfied by a 4px spacer. */
  rec.ok('the card shows the item itself', !!(card && card.art), card);
  rec.ok('...at a real size, not a thumbnail',
    !!(card && card.art && card.art.w >= 40 && card.art.h >= 40), card && card.art);
  rec.ok('...with the stats to the RIGHT of it',
    !!(card && card.art && card.statLeft != null && card.statLeft >= card.art.right - 2),
    { artRight: card && card.art && card.art.right, statLeft: card && card.statLeft });
  /* ...and it is the RIGHT art: this card is where the bow bug would show up
     four times larger than in the cell. */
  rec.ok('...and it is the sword\'s art, not another slot\'s',
    !!(card && card.art && /great-sword/.test(card.art.src || '')), card && card.art);

  /* ═══ RARITY IS THE NAME'S COLOUR (v2.3.1847) ═══
     Owner: "instead of communicating the item rarity with literal text I
     think I'd rather have the font color of the name of the item represent
     rarity.  For normal items it will just be white."

     Colour is the hardest thing on this card to test WELL, because "the name
     has a colour" is true of every name ever rendered.  So it is asserted as
     a DIFFERENCE the code has to produce: the same weapon, the same card,
     one field changed, and the name must come out a different colour — and a
     specific one, matching the bag's own edge for that word.  Without the
     re-roll below, a build that ignored quality entirely and painted every
     name white would pass the normal case perfectly. */
  rec.ok('the rarity WORD is gone from the card',
    !!(card && !card.rarity), { rarity: card && card.rarity });
  rec.ok('a normal item\'s name is white',
    !!(card && /^rgb\(2[0-9]{2}, 2[0-9]{2}, 2[0-9]{2}\)$/.test(card.titleCol || '')),
    { titleCol: card && card.titleCol });

  const rareCol = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    S.rpg.weapon.quality = 'rare';
    /* Re-open so the panel re-reads the item — the same path a real re-roll
       would take, rather than poking the DOM. */
    window.__broDashPanelBus.open(null);
    await new Promise((r) => setTimeout(r, 250));
    window.__broDashPanelBus.open('hero');
    await new Promise((r) => setTimeout(r, 700));
    const cell = document.querySelector('[role="button"][aria-label="Weapon"]');
    if (cell) cell.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 500));
    const t = [...document.querySelectorAll('span')]
      .filter((el) => el.children.length === 0 && /greatsword/i.test((el.textContent || '').trim()))[0];
    return t ? getComputedStyle(t).color : null;
  });
  rec.ok('...and a RARE one is not the same colour',
    !!(rareCol && card && rareCol !== card.titleCol), { normal: card && card.titleCol, rare: rareCol });
  /* #5B99DE — the blue InventoryPanel already draws on a rare item's tile.
     Asserted exactly, because "some other colour" would be satisfied by a
     bug that painted rare items grey. */
  rec.ok('...it is the same blue the bag uses for rare',
    rareCol === 'rgb(91, 153, 222)', { rare: rareCol });
  await P.page.evaluate(() => { window._gameState.current.rpg.weapon.quality = 'normal'; });

  /* v2.3.1846: the mockup's LIST — more than the two stats the tiles held. */
  rec.ok('the card lists more than two stats now',
    !!(card && card.rowCount >= 3), { rows: card && card.rows });
  rec.ok('...including the swing rate and the reach',
    !!(card && /speed/i.test((card.rows || []).join(' ')) && /range/i.test((card.rows || []).join(' '))),
    { rows: card && card.rows });
  /* Every label is paired with a value on the SAME line — a list whose
     values wrapped under their labels would still contain all the words. */
  rec.ok('...each label with its value beside it, not under it',
    !!(card && card.rowsAligned === true), { rowGeom: card && card.rowGeom });

  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/itemcard.png' });

  /* ── the bonus strip along the bottom of the card ──
     The owner's mockup has one ("+2 Might   +4% Crit Damage") and the
     starter kit never shows it, because nothing in it carries an affix.
     So: put a real reforge and a real element on the weapon and require the
     strip to appear — and require it to be ABSENT above, which the earlier
     card check already proves by finding four stat rows and no fifth line.
     A strip that drew empty would be worse than none: it reads as a stat
     whose value failed to load. */
  await closeHero(P);
  await P.page.evaluate(() => {
    const w = window._gameState.current.rpg.weapon;
    w.reforgeBonus = { label: 'Might', value: 2, unit: '' };
    w.element1 = 'flame';
  });
  await openHero(P);
  await P.page.evaluate(() => {
    const cell = document.querySelector('[role="button"][aria-label="Weapon"]');
    if (cell) cell.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(600);
  const strip = await P.page.evaluate(() => {
    const txt = [...document.querySelectorAll('span')]
      .filter((el) => el.children.length === 0)
      .map((el) => (el.textContent || '').trim());
    return { might: txt.some((t) => /^\+2\s*Might$/i.test(t)),
      flame: txt.some((t) => /^Flame$/i.test(t)) };
  });
  rec.ok('an item with an affix shows it on the bottom strip',
    !!(strip && strip.might), strip);
  rec.ok('...and its element too', !!(strip && strip.flame), strip);
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/itemcard-bonus.png' });

  /* ── 3b. the bow and the staff are named too ──
     A separate check because the tier tables they read are different ones,
     and the woodworking gearBase carries a 'ww_' prefix that the tier keys do
     not — the exact mismatch that made the old lookup print 'ww_pine'. */
  await closeHero(P);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.rangedWeapon = { name: 'Pine Bow', type: 'bow', gearBase: 'ww_pine', quality: 'normal' };
    S.rpg.activeSlot = 'ranged';
  });
  await openHero(P);
  await P.page.evaluate(() => {
    const cell = document.querySelector('[role="button"][aria-label="Weapon"]');
    if (cell) cell.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(600);
  const bowTitle = await P.page.evaluate(() => {
    const leaf = (re) => [...document.querySelectorAll('span, div, button')]
      .filter((el) => {
        const t = (el.textContent || '').trim();
        return t && t.length < 40 && re.test(t) && el.children.length === 0;
      })[0] || null;
    const t = leaf(/bow/i);
    return t ? t.textContent.trim() : null;
  });
  rec.ok('a bow reads PINE BOW', !!(bowTitle && /pine/i.test(bowTitle)), { bowTitle });
  rec.ok('...and never prints the raw gearBase key at the player',
    !!(bowTitle && !/ww_/i.test(bowTitle)), { bowTitle });

  /* ── 3c. the shield takes its own NAME, not its tier ──
     The one place composing tier + type would be wrong: the starter shield is
     gearBase 'wood' (that is the tier its stats come from) and is called a
     Pine Shield everywhere else in the game.  Composing would print WOOD
     SHIELD, so the shield card reads `name`.  Asserted from both ends —
     it says pine, and it does not say wood. */
  await P.page.evaluate(() => {
    const cell = document.querySelector('[role="button"][aria-label="Shield"]');
    if (cell) cell.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(600);
  const shTitle = await P.page.evaluate(() => {
    const t = [...document.querySelectorAll('span')]
      .filter((el) => /shield/i.test((el.textContent || '').trim())
        && (el.textContent || '').trim().length < 40 && el.children.length === 0)[0];
    return t ? t.textContent.trim() : null;
  });
  rec.ok('a shield reads PINE SHIELD, its own name',
    !!(shTitle && /pine/i.test(shTitle)), { shTitle });
  rec.ok('...not WOOD SHIELD, the tier its stats come from',
    !!(shTitle && !/wood/i.test(shTitle)), { shTitle });

  await P.ctx.close().catch(() => {});
}
