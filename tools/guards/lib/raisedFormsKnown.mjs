/* ═══ v2.3.6780: THE RAISED FORMS STILL ON THINGS THAT ARE NOT DOORS (card UI3-kit) ═══
 *
 * tools/guards/ui3-weights.test.mjs fails a raised face on a thing that cannot
 * be pressed, and a stat drawn raised or a door drawn as a stat.  These are the
 * ones on main when the guard came, each in a file another card holds; the
 * guard allows a file no more than its count here, and the count ONLY FALLS
 * (`node tools/guards/ui3-weights.test.mjs --write` lowers a count that fell;
 * it never raises one, and the suite holds the total under its ceiling).
 *
 *   WeaponPage.jsx, SharedPage.jsx: the DPS and Max HP stats keep `u2-raised`
 *     through their className (card UI3-combat's page rebuilds them);
 *   (ItemPage.jsx's doors, `<Ui2Stat k="">` with a handler, became the kit's
 *   compact tile in tag 6784, card UI3-menus: its row fell.)
 */
export const RAISED_KNOWN = Object.freeze({
  'src/ui/mobile/sheet/SharedPage.jsx': 1,
  'src/ui/mobile/sheet/WeaponPage.jsx': 1,
});
