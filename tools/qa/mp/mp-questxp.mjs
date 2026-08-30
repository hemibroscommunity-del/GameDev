/* THE QUEST PAYOUT'S SKILL CHOOSER, AND THE PLATE OVER YOUR HEAD (v2.3.2154).
 *
 * Owner, in one message: "Make the 'choose where to train it' font size and
 * icon labels larger when adding quest completion xp for bow, melee, and
 * magic." and "Make the character name plate, level, and monster nameplate and
 * level a bit larger font."
 *
 * Both are claims about rendered pixels, and both have a way of being true in
 * the source and false on the phone:
 *   - the chooser is three buttons across a 390px column. Bigger type is
 *     exactly how a label starts wrapping (v2.3.2036 shipped that once, and
 *     v2.3.2151 nearly did it again), so the size and the LINE COUNT have to be
 *     asserted together or the fix breaks the label it was meant to help.
 *   - the plate sizes are a factory argument three files from anything a
 *     reader would think to check, and a Pixi Text is a texture: the wrong way
 *     to make it bigger is to scale the container, which resamples glyphs
 *     rasterised at the old size and buys size at the cost of sharpness. This
 *     reads the RASTERISED style, so a container-scale "fix" would not pass it.
 *
 * The monster half is asserted in mp-monsterplate, which already stands in
 * front of a monster; duplicating that setup here to re-measure the same
 * factory would be a second scenario for one number.
 */
import * as H from './harness.mjs';

const pin = (quests, items) => `(() => {
  const q = ${JSON.stringify(quests)}, it = ${JSON.stringify(items)};
  const set = () => {
    const s = window._gameState.current;
    if (s && s.rpg) {
      s.rpg._quests = Object.assign({}, s.rpg._quests, q);
      s.rpg.inventory = Object.assign({}, s.rpg.inventory, it);
    }
    window.__qRaf = requestAnimationFrame(set);
  };
  try { cancelAnimationFrame(window.__qRaf); } catch (e) {}
  set();
})()`;

const box = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return { font: parseFloat(cs.fontSize), w: r.width, h: r.height,
    lineH: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2,
    text: (el.textContent || '').trim() };
}, sel);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Trainee', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  /* ── 1. THE PLATE OVER YOUR OWN HEAD ──
     Read off the Pixi Text's own style, not off the container's scale: see
     the header. */
  const plate = await P.page.evaluate(() => {
    const r = window._pixiRenderer;
    const pd = r && r.playerDisplayRaw ? r.playerDisplayRaw() : null;
    if (!pd || !pd._pillName) return null;
    return {
      nameSize: Number(pd._pillName.style.fontSize),
      lvlSize: Number(pd._pillLevel ? pd._pillLevel.style.fontSize : 0),
      pillH: pd._pillH || null,
      name: pd._pillName.text, level: pd._pillLevel ? pd._pillLevel.text : null,
    };
  });
  rec.ok('your own name plate reported its sizes (guard)', !!plate, plate);
  rec.ok(`your name is at least 15px (${plate && plate.nameSize})`,
    !!plate && plate.nameSize >= 15, plate);
  rec.ok(`...and the LV line under it tracks one down (${plate && plate.lvlSize})`,
    !!plate && plate.lvlSize >= plate.nameSize - 1, plate);
  /* The pill is drawn from _pillH, which is derived from the font size. If the
     two ever stop agreeing the text spills out of its own background, which is
     the failure mode of raising a font by hand and forgetting the box. */
  rec.ok('the pill grew with the type rather than the type outgrowing the pill',
    !!plate && plate.pillH >= plate.nameSize * 2, plate);

  /* ── 2. THE XP CHOOSER ──
     Reached the way a player reaches it: a finished quest, and Mayor Bro.
     Quest state is pinned every frame because S.rpg is replaced wholesale on
     every server delta, so a single write is gone within a tick (the same
     reason mp-questclaim pins rather than sets). */
  const place = (dx, dy) => P.page.evaluate(({ ox, oy }) => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (!S || !npc || !S.player) return null;
    S.player.x = npc.x + ox; S.player.y = npc.y + oy;
    return true;
  }, { ox: dx, oy: dy });

  /* AWAY FIRST, then in. The dialogue is opened by an APPROACH, and the
     proximity latch (v2.3.1701) stays armed until you leave a 110px radius --
     so teleporting straight onto him from a spawn that is already inside it
     opens nothing at all. That is what the first cut of this did, and it read
     as "the chooser is gone" rather than as "nobody knocked". */
  await place(420, 0);
  await H.closeNpcDialogue(P);
  await P.page.waitForTimeout(700);
  await P.page.evaluate((src) => { eval(src); }, pin({ tut_1: 'turnedIn', tut_2: 'active' }, { 'slime-remnants': 6 }));   // eslint-disable-line no-eval
  await P.page.waitForTimeout(700);
  await place(0, 34);
  await P.page.waitForTimeout(1600);
  rec.ok('walking up to Mayor Bro opened a dialogue (guard)',
    await H.npcDialogueOpen(P), null);

  /* The chooser is on the CLAIM screen, one press past the dialogue: Mayor Bro
     talks first and offers a "Claim reward" button, and the payout card with
     the skill buttons is what that opens. The first cut of this measured the
     dialogue and reported the chooser missing. */
  const claimed = await H.clickText(P, 'Claim reward').catch(() => false);
  rec.ok('the dialogue offers Claim reward, and it could be pressed (guard)',
    claimed !== false, { claimed });
  await P.page.waitForTimeout(1400);

  await P.page.screenshot({ path: 'tools/qa/mp/out/questxp.png' });
  const caption = await box(P, '[data-xp-caption]');
  rec.ok('the claim screen offers the skill chooser (guard: without it the '
       + 'sizes below are measurements of nothing)', !!caption, caption);
  if (!caption) return;

  rec.ok(`"choose where to train it" is at least 13px (${caption.font})`,
    caption.font >= 13, caption);
  /* Bigger type in a fixed row is how a line starts ellipsising, and this one
     is the INSTRUCTION for the only decision on the screen -- "CHOOSE WHERE TO
     TRAIN I…" would be a worse outcome than the small type it replaced. */
  const clipped = await P.page.evaluate(() => {
    const el = document.querySelector('[data-xp-caption]');
    if (!el) return null;
    return { scroll: el.scrollWidth, client: el.clientWidth, text: el.textContent };
  });
  rec.ok('...and it is not cut off by its own ellipsis',
    !!clipped && clipped.scroll <= clipped.client + 1, clipped);

  for (const key of ['sword', 'bow', 'staff']) {
    const b = await box(P, `[data-xp-skill="${key}"]`);
    rec.ok(`the ${key} button is on screen (guard)`, !!b, { key, b });
    if (!b) continue;
    rec.ok(`...its label is at least 14px (${b.font})`, b.font >= 14, b);
    /* A 44px minimum is the touch floor this panel already sets; bigger type
       must not have pushed the row past what the card can hold either. */
    rec.ok(`...and it is still a tappable row, not a grown one (${Math.round(b.h)}px)`,
      b.h >= 44 && b.h <= 64, b);
    const icon = await P.page.evaluate((k) => {
      const el = document.querySelector(`[data-xp-skill="${k}"] img`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }, key);
    rec.ok(`...with an icon of at least 22px (${icon && icon.w})`,
      !!icon && icon.w >= 22, icon);
    /* THE LINE COUNT, not just the size. "Melee" at 14px in a third of a
       390px column is exactly the shape that wrapped in v2.3.2036. */
    const lines = await P.page.evaluate((k) => {
      const el = document.querySelector(`[data-xp-skill="${k}"]`);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      /* The button is a flex row: measure the TEXT node's own box by wrapping
         a range around it, so the icon's height does not stand in for a
         second line. */
      const t = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (!t) return null;
      const rg = document.createRange();
      rg.selectNodeContents(t);
      const rects = rg.getClientRects();
      return { rects: rects.length, lh, text: t.textContent.trim() };
    }, key);
    rec.ok(`...and its label is on ONE line (${lines && lines.rects} rect(s))`,
      !!lines && lines.rects === 1, lines);
  }
}
