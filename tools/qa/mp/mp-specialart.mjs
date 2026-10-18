/* ═══ mp-specialart (v2.3.3331): THE OWNER'S SPECIAL ATTACKS ON THE BUTTON ═══
 *
 * The owner, with a sheet of three round pictures: "Also use these icons
 * instead for the special attacks (bow, staff, sword)".
 * (assets/icons-source/sheet-small-5-specials.png, cut by
 * tools/ui/cut-small-icons.py into public/ui/controls/abil-special-<kind>.webp
 * and a -grey copy each; drawn by controlSkin SpecialFace.)
 *
 * On a phone, with each weapon of the test kit in hand -- the great sword, the
 * bow, the staff -- the Special button:
 *   1. shows THAT weapon's picture, decoded, and not the winged star;
 *   2. the picture fills the face inside the game's own ring, centred (the
 *      ring is the game's: it carries the cooldown arc and the states);
 *   3. cooling down: Cooldown, the blue arc round it, the picture's grey copy;
 *   4. no mana: Disabled, the grey copy;
 *   5. pressed (the sword): the press's shade is drawn over the picture.
 * The button is kept up by its own rule (a hit in the last 5 s,
 * SpecialButton.jsx specialButtonLive).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const WEAPONS = [
  { kind: 'sword', type: 'greatsword', stash: 'weapon', slot: 'melee' },
  { kind: 'bow', type: 'bow', stash: 'rangedWeapon', slot: 'ranged' },
  { kind: 'staff', type: 'staff', stash: 'staffWeapon', slot: 'staff' },
];

const look = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-special]');
  if (!el) return null;
  const art = el.querySelector('[data-special-art]');
  const img = art && art.querySelector('img');
  const skin = el.querySelector('.bt-skin');
  const ring = skin ? parseFloat(getComputedStyle(skin).getPropertyValue('--ring')) : null;
  const r = el.getBoundingClientRect();
  const ir = img ? img.getBoundingClientRect() : null;
  return {
    kind: art ? art.getAttribute('data-special-art') : null,
    src: img ? img.getAttribute('src') : null,
    ok: !!img && img.complete && img.naturalWidth > 0,
    star: !!el.querySelector('[data-icon="special"]'),
    state: skin ? skin.getAttribute('data-state') : null,
    arc: !!el.querySelector('[data-skin-arc]'),
    size: Math.round(r.width), imgW: ir ? Math.round(ir.width) : null, ring,
    centred: !!ir && Math.abs((ir.left + ir.width / 2) - (r.left + r.width / 2)) < 1.5
      && Math.abs((ir.top + ir.height / 2) - (r.top + r.height / 2)) < 1.5,
  };
});

async function until(P, pred, ms = 6000) {
  const t0 = Date.now();
  let v = await look(P);
  while (Date.now() - t0 < ms && !pred(v)) {
    await P.page.waitForTimeout(200);
    v = await look(P);
  }
  return v;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Specials', wsPort, webPort, viewport: PHONE, touch: true });
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(2000);
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'kit', id, { what: 'weapons' });
    await H.devOp(wsPort, 'vitals', id, { heal: true });
    await P.page.waitForTimeout(1500);
    /* the button's own rule keeps it up: a hit in the last 5 s */
    await P.page.evaluate(() => {
      window.__saKeep = setInterval(() => {
        const S = window._gameState && window._gameState.current;
        if (S) { S.lastDamageTaken = Date.now(); S._shieldUp = false; }
      }, 300);
    });
    for (const w of WEAPONS) {
      const eq = await H.equipWeapon(P, w.type, w.stash, w.slot);
      await P.page.waitForTimeout(1200);
      await P.page.evaluate(() => {
        const S = window._gameState.current;
        S._lastSwipe = 0;
        if (S.rpg) S.rpg.mana = S.rpg.maxMana || 100;
      });
      const A = await until(P, (v) => !!v && v.kind === w.kind && v.ok && v.state === 'normal');
      console.log(`    SPECIALART ${w.kind}: ${JSON.stringify(A)}`);
      rec.ok(`${w.kind} in hand: the Special button shows the owner's ${w.kind} special, decoded, not the winged star`,
        !!A && A.kind === w.kind && A.ok && !A.star && new RegExp(`abil-special-${w.kind}\\.webp`).test(A.src || ''), { eq, A });
      rec.ok(`...filling the face inside the game's ring, centred (${A && A.imgW} px in a ${A && A.size} px button, ring ${A && A.ring} px)`,
        !!A && A.ring > 0 && Math.abs(A.imgW - (A.size - 2 * A.ring)) <= 1 && A.centred, A);

      await P.page.evaluate(() => { window._gameState.current._lastSwipe = Date.now(); });
      const B = await until(P, (v) => !!v && v.state === 'cooldown', 1200);
      rec.ok(`...cooling down: Cooldown, the blue arc round it, the picture grey`,
        !!B && B.state === 'cooldown' && B.arc && new RegExp(`abil-special-${w.kind}-grey\\.webp`).test(B.src || ''), B);

      await P.page.evaluate(() => {
        const S = window._gameState.current;
        S._lastSwipe = 0;
        if (S.rpg) S.rpg.mana = 0;
      });
      const C = await until(P, (v) => !!v && v.state === 'disabled', 2000);
      rec.ok(`...no mana: Disabled, the picture grey`,
        !!C && C.state === 'disabled' && new RegExp(`abil-special-${w.kind}-grey\\.webp`).test(C.src || ''), C);
      await P.page.evaluate(() => { const S = window._gameState.current; if (S.rpg) S.rpg.mana = S.rpg.maxMana || 100; });

      if (w.kind === 'sword') {
        /* the press's shade: the attribute the button's own touch handler
           writes, read on the picture's ::after once its 90 ms fade is done */
        const shade = await P.page.evaluate(async () => {
          const el = document.querySelector('[data-special]');
          const art = el && el.querySelector('[data-special-art]');
          if (!art) return null;
          const before = Number(getComputedStyle(art, '::after').opacity);
          el.setAttribute('data-pressed', '1');
          await new Promise((r) => setTimeout(r, 300));
          const down = Number(getComputedStyle(art, '::after').opacity);
          el.removeAttribute('data-pressed');
          return { before, down };
        });
        rec.ok('...pressed: the press\'s shade is drawn over the picture', !!shade && shade.before === 0 && shade.down === 1, shade);
      }
    }
    await P.page.evaluate(() => clearInterval(window.__saKeep));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
