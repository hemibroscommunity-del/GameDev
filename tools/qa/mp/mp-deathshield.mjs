/* What is still drawn on the corpse? (v2.3.1887)
   Owner: "When I died my shield stayed visible while the death animation
   played. Also hide the shield when this death animation plays."
   Lists every visible child of the player display during the death hold, so
   the answer is the full set rather than the one layer that was noticed. */
import * as H from './harness.mjs';

/* What a corpse is allowed to keep. */
const KEEP = ['_spriteBody', '_namePill', '_comboText', '_handCapMask', '_handArmMask',
    '_hudHpBarFrame', '_hudHpBarFill', '_hudHpRing', '_hudHpText', '_hudHpMaxText',
    '_hudMpEmpty', '_hudMpSprite', '_hudMpTextEmpty', '_hudMpTextFull',
    '_hudStamEmpty', '_hudStamSprite', '_hudStamTextEmpty', '_hudStamTextFull'];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Ghost', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* Shield equipped and RAISED, which is how you tend to die. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.shield = { name: 'Pine Shield', type: 'shield' };
    S.rpg.weapon = { type: 'sword', name: 'Copper Sword', gearBase: 'copper', dmg: 3 };
    S.rpg.activeSlot = 'melee';
  });
  await P.page.waitForTimeout(900);
  const alive = await P.page.evaluate(() => window.__btBackShield || null);
  rec.ok('the slung shield is drawn while alive (guard)', !!(alive && alive.on), alive);

  /* Die. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.hp = 0; S._dying = true; S._deathStart = Date.now();
  });
  await P.page.waitForTimeout(700);

  const dead = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const r = window._pixiRenderer;
    const g = r && r.blockGeomProbe ? r.blockGeomProbe() : null;
    return {
      dying: !!S._dying, hp: S.rpg.hp,
      backShield: window.__btBackShield || null,
      geomShield: g && g.shield,
      geomWeapon: g && g.weapon,
    };
  });
  console.log('    during death: ' + JSON.stringify(dead));

  /* Every child of the player display, with EFFECTIVE visibility (a hidden
     parent hides its children, which is why the weapon reads visible above
     while being off screen). Named by matching against the display's own
     _-prefixed fields, since Pixi objects carry no name. */
  const kids = await P.page.evaluate(() => {
    const r = window._pixiRenderer;
    const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
    if (!pd) return '(no raw display accessor)';
    const byRef = new Map();
    for (const k of Object.keys(pd)) { const v = pd[k]; if (v && v.visible !== undefined) byRef.set(v, k); }
    const eff = (o) => { let n = o; while (n) { if (!n.visible) return false; n = n.parent; } return true; };
    return pd.children.map((c, i) => ({
      i, name: byRef.get(c) || c.constructor.name,
      own: !!c.visible, effective: eff(c),
    })).filter((x) => x.own);
  });
  console.log('    visible children on the corpse: ' + JSON.stringify(kids));
  const strays = Array.isArray(kids)
    ? kids.filter((k) => k.effective && KEEP.indexOf(k.name) < 0).map((k) => k.name)
    : ['(probe unavailable: ' + kids + ')'];
  rec.ok('nothing but the corpse, its plate and its vitals is drawn on the body',
    strays.length === 0, { strays, all: kids });
  rec.ok('the slung shield is HIDDEN on the corpse',
    !(dead.backShield && dead.backShield.on), dead.backShield);
  rec.ok('no held shield on the corpse either', !dead.geomShield, dead.geomShield);
  /* NOT asserted off blockGeomProbe's weapon field: that reports the SPRITE's
     own flag, and the weapon lives in a container the death branch hides — so
     it read "visible" while being off screen.  Effective visibility (walking
     the parent chain) is the only honest question, and the child sweep below
     is what answers it. */

  /* THE REAL ASSERTION: nothing but the permitted set is drawn on the corpse.
     Named layers would go stale exactly the way the code's own hide-list did
     (the back shield was added 300 versions after it and never added to it),
     so this asserts the COMPLEMENT — anything visible that is not in the keep
     set is a regression, including a layer that does not exist yet. */
  await P.ctx.close().catch(() => {});
}
