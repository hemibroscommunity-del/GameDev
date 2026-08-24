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
  /* window._uiPanels is the app's own panel registry (BroTown.jsx) — drive it
     rather than hunting for an emoji, which found the wrong node and made the
     info-panel assertions read the STAT screen's text instead. */
  await P.page.evaluate(() => window._uiPanels.stats(true));
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
  await P.page.evaluate(() => { window._uiPanels.stats(false); window._uiPanels.info(true); });
  await P.page.waitForTimeout(700);
  const diag = await P.page.evaluate(() => {
    /* Scope to the info panel, so this cannot pass or fail on some other
       panel's text — the bug this very assertion had a moment ago. */
    const host = Array.from(document.querySelectorAll('div')).filter((el) =>
      /online/.test(el.textContent || '') && /build /.test(el.textContent || ''));
    const t = (host.length ? host[host.length - 1] : document.body).innerText || '';
    const m = t.match(/link (ok|off) · rules (ok|off) · skills (ok|off)/);
    const b = t.match(/build \S+ \([^)]*\)/);
    return { warned: /Combat numbers may read low/.test(t), triple: m ? m[0] : null, build: b ? b[0] : null };
  });
  console.log('    info panel: ' + JSON.stringify(diag));
  rec.ok('a healthy session shows NO combat-diagnostic warning',
    diag.warned === false && diag.triple === null, diag);
  /* v2.3.1903: the build id is ALWAYS there — a "still broken" report is not
     actionable without knowing which bundle produced it. */
  rec.ok('...but the build id is always shown',
    !!diag.build && /^build \S+ \(\S+\)$/.test(diag.build), diag.build);

  /* ── AN INVESTED CHARACTER (v2.3.1904) ──
     Everything above runs on a FRESH character, where the legacy fields and
     the prog3 allocations are both 0 — so Defense/HP/Endurance agreed for
     the wrong reason and the bug hid behind the fixture. v2.3.1901 even
     recorded "those legitimately start at 0" as a reason NOT to touch them.

     Allocate real prog3 body points and require the rows to show them. With
     the legacy read this renders "Defense 0 · HP 0 · Endurance 0" against
     def:40 hp:25 stam:30 — which on the owner's real character is every
     combat row reading zero at once. */
  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    R.prog3 = R.prog3 || {};
    R.prog3.alloc = Object.assign({}, R.prog3.alloc, { def: 40, hp: 25, stam: 30 });
  });
  await P.page.evaluate(() => { window._uiPanels.info(false); window._uiPanels.stats(false); });
  await P.page.waitForTimeout(300);
  await P.page.evaluate(() => window._uiPanels.stats(true));
  await P.page.waitForTimeout(900);
  const inv = await P.page.evaluate(() => {
    const card = document.querySelector('.bt-inspect-card');
    if (!card) return null;
    const out = {};
    for (const label of ['Melee', 'Defense', 'HP', 'Endurance']) {
      const c = Array.from(card.querySelectorAll('*')).filter((el) => {
        const t = (el.textContent || '').trim();
        return t.startsWith(label) && !Array.from(el.children).some(
          (k) => (k.textContent || '').trim().startsWith(label));
      });
      out[label] = c.length ? (c[c.length - 1].textContent || '').trim().slice(0, 30) : null;
    }
    return out;
  });
  console.log('    invested rows: ' + JSON.stringify(inv));
  rec.ok('an INVESTED character shows its allocated Defense, not 0',
    !!inv && /\b40\b/.test(inv.Defense || ''), inv);
  rec.ok('...its allocated HP', !!inv && /\b25\b/.test(inv.HP || ''), inv);
  rec.ok('...and its allocated Endurance', !!inv && /\b30\b/.test(inv.Endurance || ''), inv);
  rec.ok('...while the weapon skills still read their trained level',
    !!inv && /\b1\b/.test(inv.Melee || ''), inv);

  await P.ctx.close().catch(() => {});
}
