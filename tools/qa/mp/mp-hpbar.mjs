/* The in-world player HP bar is CONTEXTUAL (v2.3.1682).
 *
 * Owner: "the character hp bar is supposed to contextually display (only when
 * damage is taken or healing occurs)."
 *
 * The old rule in _updatePlayerHud was "visible while BELOW max, hold 2.5s
 * once refilled, fade out" — which is not contextual at all: the first hit of
 * the session parked the bar over the character's head and nothing but a
 * top-off back to full ever took it down again.  The bar now reveals on the
 * EVENT (any change in current HP, down or up) and always fades out after the
 * hold, however empty it is.
 *
 * This is a fade played out over time against state that lives on the Pixi
 * display object, so it is checked through the renderer's hudHpProbe rather
 * than by reading window._gameState — the assertion is about what actually
 * reached the screen.  HP is moved directly on S.rpg because the rule under
 * test belongs to the RENDERER: how the bar reacts to an HP change is the
 * same whether a slime or a test wrote the number.
 */
import * as H from './harness.mjs';

const HOLD_MS = 2500;   /* matches _updatePlayerHud */

const probe = (P) => P.page.evaluate(
  () => (window._pixiRenderer && window._pixiRenderer.hudHpProbe
    ? window._pixiRenderer.hudHpProbe() : { __missing: true }));

/* The fade is FADE_STEP per RENDERED FRAME, not per millisecond, so a
   headless page that runs under 60fps takes proportionally longer to reach
   the target alpha — a fixed sleep read the bar mid-fade at 0.89 and called
   it hidden.  Poll instead, with a budget short enough that "it got there
   eventually" can't quietly mean "it took ten seconds". */
async function until(P, pred, budgetMs) {
  const t0 = Date.now();
  let last;
  for (;;) {
    last = await probe(P);
    if (last && !last.__missing && pred(last)) return last;
    if (Date.now() - t0 >= budgetMs) return last;
    await P.page.waitForTimeout(120);
  }
}
const SHOWN = (p) => p.alpha > 0.9;
const HIDDEN = (p) => p.alpha < 0.05;
const REVEAL_BUDGET = 2000;                 /* well inside the 2.5s hold */
const FADE_BUDGET = HOLD_MS + 2500;

/* Move current HP without touching maxHp — the shape of a hit or a heal. */
const setHp = (P, hp) => P.page.evaluate((v) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.rpg) return null;
  S.rpg.hp = v === 'max' ? S.rpg.maxHp : Math.max(1, Math.round(S.rpg.maxHp * v));
  return { hp: S.rpg.hp, maxHp: S.rpg.maxHp };
}, hp);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Bruiser', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);

  const idle = await probe(P);
  rec.ok('the renderer exposes the HP bar probe', idle && !idle.__missing, idle);
  rec.ok('an undamaged character shows no HP bar', idle && HIDDEN(idle), idle);

  /* ── damage ───────────────────────────────────────────────────────────── */
  const hurt = await setHp(P, 0.6);
  rec.ok('HP could be moved down', !!hurt, hurt);
  const onDamage = await until(P, SHOWN, REVEAL_BUDGET);
  rec.ok('taking damage reveals the bar', SHOWN(onDamage), onDamage);
  rec.ok('...and the bar art comes with it', onDamage.barAlpha > 0.9, onDamage);

  /* THE REGRESSION: still below max, but the event is over.  Under the old
     "visible while below max" rule this stayed pinned at alpha 1 forever. */
  const settled = await until(P, HIDDEN, FADE_BUDGET);
  const stillHurt = await H.readState(P, (S) => ({ hp: S.rpg.hp, max: S.rpg.maxHp }));
  rec.ok('the bar fades out again even though HP is still below max',
    HIDDEN(settled), { probe: settled, hp: stillHurt });
  rec.ok('...and HP really was still below max (the fade is not a heal)',
    stillHurt.hp < stillHurt.max, stillHurt);

  /* ── a SECOND hit re-reveals it (the reveal is per event, not once) ───── */
  await setHp(P, 0.3);
  rec.ok('a later hit reveals the bar again', SHOWN(await until(P, SHOWN, REVEAL_BUDGET)));
  rec.ok('...and it fades out after that one too',
    HIDDEN(await until(P, HIDDEN, FADE_BUDGET)));

  /* ── healing ─────────────────────────────────────────────────────────── */
  await setHp(P, 'max');
  rec.ok('healing reveals the bar too', SHOWN(await until(P, SHOWN, REVEAL_BUDGET)));
  rec.ok('...and a full, quiet character ends up with no bar again',
    HIDDEN(await until(P, HIDDEN, FADE_BUDGET)));

  /* ── v2.3.1703: A HEAL THAT IS STILL CLIMBING KEEPS THE BAR UP ──────────
     Owner: "while out of combat the healing in the zones is a nice touch,
     keep the hp bar visible while healing."  Out-of-combat regen arrives as a
     server tick every SPOKE_REGEN_OOC_MS (6s), which is longer than the 2.5s
     hold — so under the v2.3.1682 rule alone the bar blinked on for 2.5s out
     of every 6, which reads as a fault rather than as healing.

     HP IS TAKEN AWAY FROM THE SERVER FOR THIS SECTION, deliberately.  The
     first cut just wrote S.rpg.hp every few seconds like the assertions above
     do, and it failed — in TOWN, hubs top HP off at 10% per regen tick
     (v2.3.1414), so the worker's echo parked the character at 106/106 partway
     through the sample and the bar correctly faded on a full, quiet
     character.  That is the product being right and the test being wrong.
     The rule under test belongs to the RENDERER (how the bar reacts to a
     rising number), so the number is pinned behind an accessor the echo
     cannot move, and the renderer is then asked what it drew.  Restored
     afterwards so nothing downstream inherits a frozen pool. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__hp = Math.round(S.rpg.maxHp * 0.4);
    Object.defineProperty(S.rpg, 'hp', {
      configurable: true,
      get() { return window.__hp; },
      set() { /* the worker's echo is not the authority on a renderer test */ },
    });
  });
  await until(P, HIDDEN, FADE_BUDGET);            /* start from a quiet, faded bar */
  let heldThroughGap = true, wentDark = null;
  for (let tick = 0; tick < 3; tick++) {
    await P.page.evaluate(() => { window.__hp += 3; });   /* one regen tick's worth */
    await P.page.waitForTimeout(4200);            /* well past HOLD_MS, inside HEAL_STALL_MS */
    const mid = await probe(P);
    if (!SHOWN(mid)) { heldThroughGap = false; wentDark = { tick, mid }; break; }
  }
  const stillBelow = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { hp: S.rpg.hp, max: S.rpg.maxHp };
  });
  rec.ok('the climbing heal really did stay below max (the premise holds)',
    stillBelow.hp < stillBelow.max, stillBelow);
  rec.ok('a climbing heal keeps the bar up between regen ticks',
    heldThroughGap, wentDark);
  /* And it still lets go — the stall window is what stops "keep it visible
     while healing" turning back into the v2.3.1682 parked-forever bar. */
  rec.ok('...and it fades once the healing actually stops',
    HIDDEN(await until(P, HIDDEN, 14000)));
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const v = window.__hp;
    delete S.rpg.hp;
    S.rpg.hp = v;
  });

  await P.ctx.close().catch(() => {});
}
