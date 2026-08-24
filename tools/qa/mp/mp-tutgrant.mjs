/* THE FIRST QUEST'S SWORD AND SHIELD (v2.3.1901).
 *
 * Owner: "I just tried to accept the quest from mayor bro and no items were
 * received ... For the first quest receiving sword and shield".
 *
 * Accepts tut_1 the way the game does and reports EXACTLY what landed where,
 * on a genuinely fresh character.  The server pays these on ACCEPT, not
 * turn-in (v2.3.1676), through _grantQuestItem — which returns false and
 * grants nothing, silently, on several paths (unknown tier key, a shield when
 * ps.shield is already set, a full stash).  Nothing in the server suite
 * covered grantOnAccept at all before this.
 */
import * as H from './harness.mjs';

const bag = (P) => P.page.evaluate(() => {
  const R = (window._gameState.current || {}).rpg || {};
  return {
    quests: R._quests || null,
    weaponStash: (R.weaponStash || []).map((w) => w && ({ type: w.type, name: w.name, gearBase: w.gearBase })),
    shieldStash: (R.shieldStash || []).map((s) => s && ({ name: s.name, gearBase: s.gearBase })),
    shield: R.shield ? { name: R.shield.name, gearBase: R.shield.gearBase } : null,
    weapon: R.weapon ? { type: R.weapon.type, name: R.weapon.name } : null,
    sk: R.prog3 && R.prog3.sk
      ? Object.fromEntries(Object.entries(R.prog3.sk).map(([k, v]) => [k, v && v.level]))
      : null,
    weaponSkills: R.weaponSkills || null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Rookie', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* ── CONTROL: a fresh character owns nothing yet ── */
  const before = await bag(P);
  console.log('    BEFORE: ' + JSON.stringify(before));
  rec.ok('a fresh character starts with an empty weapon stash (control)',
    (before.weaponStash || []).length === 0, before);
  rec.ok('...and owns no shield yet (control)', !before.shield, before);
  rec.ok('...and has not accepted tut_1 yet (control)',
    !before.quests || !before.quests.tut_1, before);

  /* ── THE SKILLS QUESTION, on the same fresh character ──
     Owner: "all my combat skills were lvl 0, I thought they started at 1?" */
  rec.ok('the server hands a fresh character prog3 skills at level 1',
    !!before.sk && Object.values(before.sk).every((l) => l === 1), before.sk);
  /* THE MECHANISM, pinned.  The legacy track is not absent — it is PRESENT
     and all zeros, sitting next to a prog3 blob that says 1.  That is the
     whole bug: a panel reading weaponSkills reports 0 for every combat skill
     on a character the server considers level 1 in all three.  Asserting the
     coexistence (rather than just "prog3 is 1") is what keeps a future
     "simplification" from deleting the prog3 read and looking fine. */
  rec.ok('...while the LEGACY weaponSkills track sits beside it at ZERO',
    !!before.weaponSkills && ['sword', 'bow', 'staff'].every(
      (k) => before.weaponSkills[k] && (before.weaponSkills[k].level || 0) === 0),
    before.weaponSkills);

  /* ── ACCEPT ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(3000);

  const after = await bag(P);
  console.log('    AFTER:  ' + JSON.stringify(after));
  rec.ok('accepting tut_1 marks it active', !!(after.quests && after.quests.tut_1), after.quests);
  rec.ok('the SWORD lands in the weapon stash',
    (after.weaponStash || []).some((w) => w && w.type === 'greatsword'), after.weaponStash);
  rec.ok('the SHIELD is granted',
    !!after.shield || (after.shieldStash || []).length > 0,
    { shield: after.shield, shieldStash: after.shieldStash });

  /* ── RE-ACCEPT must not re-pay (and must not be how the owner lost them) ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(2000);
  const again = await bag(P);
  rec.ok('re-accepting pays nothing further (no farming)',
    (again.weaponStash || []).length === (after.weaponStash || []).length, again.weaponStash);

  /* ── THE STAT SCREEN ITSELF (v2.3.1901) ──
     The data checks above prove the server is right and the legacy map is
     zeroed; they do NOT prove the screen the owner was looking at reads the
     right one. Open it and read the rendered numbers. */
  await P.page.evaluate(() => {
    /* The MenuBar's stat-screen toggle is the crossed-swords glyph
       (MenuBar.jsx: { e: '\u2694\uFE0F', fn: tog(showStatScreen, ...) }).
       Click the INNERMOST element carrying it, or the click lands on a
       wrapper that has no handler and the panel never opens. */
    const all = Array.from(document.querySelectorAll('*'));
    const hits = all.filter((el) => {
      const t = (el.textContent || '').trim();
      return t.includes('\u2694') && !Array.from(el.children).some(
        (c) => (c.textContent || '').includes('\u2694'));
    });
    const hit = hits[hits.length - 1];
    if (hit) { hit.click(); (hit.parentElement || hit).click(); }
  });
  await P.page.waitForTimeout(900);
  const rows = await P.page.evaluate(() => {
    const card = document.querySelector('.bt-inspect-card');
    if (!card) return null;
    const out = {};
    for (const label of ['Melee', 'Bow', 'Magic']) {
      /* The innermost element whose text starts with the label, so this
         cannot match the whole column and report a number it never read. */
      const cands = Array.from(card.querySelectorAll('*')).filter((el) => {
        const t = (el.textContent || '').trim();
        return t.startsWith(label) && !Array.from(el.children).some(
          (c) => (c.textContent || '').trim().startsWith(label));
      });
      const el = cands[cands.length - 1];
      out[label] = el ? (el.textContent || '').trim().slice(0, 40) : null;
    }
    return out;
  });
  console.log('    stat screen rows: ' + JSON.stringify(rows));
  rec.ok('the stat screen opened', !!rows, rows);
  rec.ok('...and Melee / Bow / Magic each read Lv 1, not Lv 0',
    !!rows && ['Melee', 'Bow', 'Magic'].every(
      (k) => rows[k] && /\b1\b/.test(rows[k]) && !/\b0\b/.test(rows[k].replace(/\/\s*\d+/g, ''))),
    rows);

  /* ── THE INFO PANEL'S DIAGNOSTIC LINE (v2.3.1902) ──
     A healthy session must NOT show the warning — a row that is always
     present is a row nobody reads, and this panel belongs to the owner
     rather than to a developer console. */
  await P.page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const hits = all.filter((el) => {
      const t = (el.textContent || '').trim();
      return t.includes('\u2139') && !Array.from(el.children).some(
        (c) => (c.textContent || '').includes('\u2139'));
    });
    const hit = hits[hits.length - 1];
    if (hit) { hit.click(); (hit.parentElement || hit).click(); }
  });
  await P.page.waitForTimeout(700);
  const diag = await P.page.evaluate(() => {
    const t = document.body.innerText || '';
    const m = t.match(/link (ok|off) · rules (ok|off) · skills (ok|off)/);
    return { warned: /Combat numbers may read low/.test(t), triple: m ? m[0] : null };
  });
  console.log('    info panel: ' + JSON.stringify(diag));
  rec.ok('a healthy session shows NO combat-diagnostic warning',
    diag.warned === false && diag.triple === null, diag);

  await P.ctx.close().catch(() => {});
}
