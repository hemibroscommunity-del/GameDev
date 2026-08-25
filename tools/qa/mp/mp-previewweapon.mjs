/* THE CHARACTER PREVIEW FOLLOWS THE WEAPON YOU ARE HOLDING (v2.3.1914).
 *
 * Owner: "When different weapons are equipped like pine bow and staff the
 * character preview doesn't update on the character dashboard."
 *
 * There are THREE weapon slots — weapon (melee), rangedWeapon and staffWeapon,
 * chosen by rpg.activeSlot — and the preview was wired to the melee one, so a
 * bow or a staff changed a field it does not read.
 *
 * Asserted on the CANVAS PIXELS, not on the prop: passing getActiveWeapon(R)
 * is only the mechanism, and a test that checked the prop would pass even if
 * the canvas never redrew (CharacterView redraws on a keyed effect, so "the
 * value changed" and "the picture changed" are genuinely separate claims).
 */
import * as H from './harness.mjs';

const SWORD = { type: 'greatsword', name: 'Copper Great Sword', gearBase: 'copper', tierMult: 1.12, dmg: 6 };
const BOW   = { type: 'bow',        name: 'Pine Bow',           gearBase: 'ww_pine', tierMult: 1, dmg: 5 };
const STAFF = { type: 'staff',      name: 'Pine Staff',         gearBase: 'ww_pine', tierMult: 1, dmg: 5 };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Poser', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const equip = (slot, wpn) => P.page.evaluate(({ s, w }) => {
    const S = window._gameState.current;
    if (s === 'melee') { S.rpg.weapon = w; S.rpg.activeSlot = 'melee'; }
    if (s === 'ranged') { S.rpg.rangedWeapon = w; S.rpg.activeSlot = 'ranged'; }
    if (s === 'staff')  { S.rpg.staffWeapon = w;  S.rpg.activeSlot = 'staff'; }
  }, { s: slot, w: wpn });

  await equip('melee', SWORD);
  await P.page.evaluate(() => { window.__broDashPanelBus.open('hero'); });
  await P.page.waitForTimeout(1500);

  /* A fingerprint of the drawn figure. Reading the canvas back is the only way
     to tell "the preview changed" from "the prop changed" — the whole failure
     was a value moving while the picture did not. */
  const shot = async () => {
    await P.page.waitForTimeout(1100);
    return P.page.evaluate(() => {
      const cvs = Array.from(document.querySelectorAll('canvas'))
        .filter((c) => c.width > 40 && c.height > 40 && c.getContext('2d'));
      if (!cvs.length) return null;
      /* The portrait canvas is the one inside the hero sheet, not the world. */
      const c = cvs[cvs.length - 1];
      let d;
      try { d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; } catch (e) { return null; }
      let sum = 0, opaque = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 8) { opaque++; sum = (sum * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0; }
      }
      return { sig: sum, opaque, w: c.width, h: c.height };
    });
  };

  const withSword = await shot();
  rec.ok('the preview canvas is readable and has a figure on it (guard)',
    !!withSword && withSword.opaque > 200, withSword);
  if (!withSword) { await P.ctx.close().catch(() => {}); return; }

  await equip('ranged', BOW);
  const withBow = await shot();
  console.log(`    sword sig=${withSword.sig} bow sig=${withBow && withBow.sig}`);
  rec.ok('equipping the PINE BOW redraws the preview',
    !!withBow && withBow.sig !== withSword.sig, { withSword, withBow });

  await equip('staff', STAFF);
  const withStaff = await shot();
  console.log(`    staff sig=${withStaff && withStaff.sig}`);
  rec.ok('...and the STAFF redraws it again',
    !!withStaff && withStaff.sig !== withBow.sig, { withBow, withStaff });

  /* Back to the sword: the picture must return to what it was, or "it
     changed" could be satisfied by a preview that merely churns. */
  await equip('melee', SWORD);
  const backToSword = await shot();
  rec.ok('...and swapping back to the sword restores the original figure',
    !!backToSword && backToSword.sig === withSword.sig, { withSword, backToSword });

  await P.ctx.close().catch(() => {});
}
