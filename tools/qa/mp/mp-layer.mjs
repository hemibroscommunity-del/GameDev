/* Three owner reports from one playtest (v2.3.1764).
 *
 *   1. "Layer the hair on top of headphones."
 *   2. "A swung sword still has the iron showing it needs to be copper color."
 *   3. "When you turn in a quest it needs to be more obvious that you're
 *       redeeming a reward.  And the choose a skill to train button is all
 *       faded like you can barely see it."
 *
 * Each is checked where it actually goes wrong: the DRAW ORDER for the hair,
 * the SWING sprites for the metal (a separate stand-in with its own strips —
 * which is exactly why the held-weapon tint never reached it), and the rendered
 * contrast for the button, because "faded" is a measurement, not an opinion.
 */
import * as H from './harness.mjs';

const COPPER = 0xFF9E58;
const NATIVE = 0xFFFFFF;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Looker', wsPort, webPort });
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);
  await P.page.waitForTimeout(1500);

  /* ── 1. hair over headphones ──
     Read the DRAW ORDER off the live container: which sprite is later in its
     parent's child list is what decides who covers whom. */
  const order = async (hat) => {
    await P.page.evaluate((h) => { if (window.__btSetHeadwear) window.__btSetHeadwear(h); }, hat);
    await P.page.waitForTimeout(1200);
    return P.page.evaluate(() => (window.__btHairOrder ? window.__btHairOrder() : null));
  };
  const phones = await order('headphones');
  rec.ok('hair draws OVER headphones', !!phones && phones.hairOverHat === true, phones);
  const hat = await order('wizard-hat');
  rec.ok('...and still UNDER a hat, which is supposed to cover it',
    !!hat && hat.hairOverHat === false, hat);
  await order('none');

  /* ── 2. the swung sword takes the metal ── */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg;
    const i = (R.weaponStash || []).findIndex((w) => w && /Copper Great Sword/.test(w.name || ''));
    if (i >= 0) { R.weapon = R.weaponStash.splice(i, 1)[0]; R.activeSlot = 'melee'; }
  });
  await P.page.waitForTimeout(1200);
  const wornBase = await H.readState(P, (S) => (S.rpg && S.rpg.weapon ? S.rpg.weapon.gearBase : null));
  rec.ok('the starter sword is the copper tier (guard: nothing below means anything otherwise)',
    wornBase === 'copper', { wornBase });

  /* Swing, and sample the stand-in's own sprites while it plays. */
  const swing = await P.page.evaluate(async () => {
    const cv = document.querySelector('canvas.brotown-canvas');
    const r = cv.getBoundingClientRect();
    const S = window._gameState.current;
    const k = S._worldScaleX || 1;
    const x = r.left + (S.player.x - S.camera.x) * k;
    const y = r.top + (S.player.y - S.camera.y) * k;
    const ev = (t) => cv.dispatchEvent(new MouseEvent(t, { clientX: x + 40, clientY: y + 10, bubbles: true, button: 0 }));
    ev('mousemove'); ev('mousedown');
    let best = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((res) => setTimeout(res, 40));
      const t = window.__btSwingTints ? window.__btSwingTints() : null;
      if (t && t.weaponVisible) { best = t; break; }
    }
    ev('mouseup');
    return best;
  });
  rec.ok('the swing stand-in actually played (guard)', !!swing && swing.weaponVisible, swing);
  rec.ok('the swung blade is COPPER, not the native steel',
    !!swing && swing.weapon === COPPER, swing);

  /* ── 2b. EVERY stand-in pose wears the metal, not just the swing ──
     Owner: "Woodcutting character doesn't show copper legs" / "Cooking doesn't
     show copper legs."  Each life-skill and combat stand-in draws its own gear
     strips, so each is its own chance to forget.  Drive the poses and read the
     sprites the renderer actually tinted: a pose that was never routed through
     the tint helper does not appear in the probe at all. */
  await P.page.evaluate(() => {
    if (window.__btSetGear) { window.__btSetGear('chest', 'copperplate'); window.__btSetGear('legs', 'coppergreaves'); }
  });
  await P.page.waitForTimeout(1500);
  /* Drive the poses that have their own strips: a swing (already played above),
     then chopping and cooking, which are the two the owner named. */
  /* The stand-ins are driven by S._extraction (lifeSkillRewards), so set the
     real shape rather than an invented one — the first attempt poked fields
     that do not exist and the guard below caught the vacuum. */
  const pose = async (skill) => {
    await P.page.evaluate((sk) => {
      const S = window._gameState && window._gameState.current;
      if (!S) return;
      const now = Date.now();
      S._extraction = { nodeId: 'qa', nodeRef: { id: 'qa', x: S.player.x + 20, y: S.player.y,
        gatherLvl: 1, alive: true, nodeType: sk === 'woodcutting' ? 'tree' : 'campfire' },
      skill: sk, startedAt: now, windowOpensAt: now + 4000, windowClosesAt: now + 6000,
      status: 'waiting', swipeSamples: [] };
    }, skill);
    await P.page.waitForTimeout(1400);
  };
  await pose('woodcutting');
  await pose('cooking');
  await P.page.evaluate(() => { const S = window._gameState.current; if (S) S._extraction = null; });
  await P.page.waitForTimeout(500);
  const standIns = await P.page.evaluate(() => (window.__btStandInTints ? window.__btStandInTints() : null));
  const wrong = standIns ? Object.entries(standIns)
    .filter(([n, v]) => !/Weapon/.test(n) && v.tint !== 0xFF9E58) : null;
  /* Naming the poses that MUST have been recorded is what stops this being
     vacuous: "everything I drew is copper" is trivially true when nothing drew. */
  const NEEDED = ['swingChest', 'swingLegs', 'chopChest', 'chopLegs', 'cookChest', 'cookLegs'];
  const missing = standIns ? NEEDED.filter((n) => !(n in standIns)) : NEEDED;
  rec.ok('the chop, cook and swing stand-ins all drew their gear (guard)',
    missing.length === 0, { missing, recorded: standIns && Object.keys(standIns) });
  rec.ok('every stand-in gear sprite the renderer has drawn is in the player\'s metal',
    !!standIns && Object.keys(standIns).length > 0 && wrong.length === 0,
    { standIns, wrong });

  /* ── 3. the quest card's turn-in moment ──
     tut_1 is already accepted above (it is where the sword came from), and the
     giver's dialogue shows HIS active quest — so complete that one rather than
     opening a second and wondering why the card shows the first. */
  await H.grant(wsPort, myId, 'item', { invKey: 'snowman', count: 4 });
  await P.page.waitForTimeout(1800);
  /* The turn-in lives ONLY in the in-world dialogue: the dash list page had its
     Turn In button deliberately removed (QuestDetailPanel, v2.3.1685 incident),
     so the door a player uses is Mayor Bro himself.  Walk up to him. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (S && npc && S.player) { S.player.x = npc.x + 30; S.player.y = npc.y + 10; }
  });
  await P.page.waitForTimeout(2000);
  const opened = await P.page.evaluate(() => !!document.querySelector('.bt-inspect-card'));
  rec.ok('walking up to the giver opens his dialogue', opened,
    await P.page.evaluate(() => {
      const c = document.querySelector('.bt-inspect-card');
      return { card: c ? (c.innerText || '').slice(0, 200) : null,
        buttons: [...document.querySelectorAll('button')].filter((b) => b.offsetParent)
          .map((b) => (b.textContent || '').trim()).slice(0, 12) };
    }));

  /* The not-ready state first: a prog3 character must pick a skill, and the
     complaint was that this prompt is the hardest thing on the card to read. */
  const readBtn = () => P.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent
      && /Redeem Reward|Choose a skill to train/.test(x.textContent || ''));
    if (!b) return { err: 'no turn-in button',
      buttons: [...document.querySelectorAll('button')].filter((x) => x.offsetParent)
        .map((x) => (x.textContent || '').trim()).slice(0, 14),
      card: (document.querySelector('.bt-inspect-card') || {}).innerText };
    const cs = getComputedStyle(b);
    /* Contrast is the whole complaint: a control at half opacity over a dark
       card is what "you can barely see it" means.  Measured, not eyeballed. */
    const lum = (c) => {
      const m = c.match(/\d+/g) || [0, 0, 0];
      const f = m.slice(0, 3).map((n) => {
        const v = Number(n) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
    };
    const L1 = lum(cs.color), L2 = lum(cs.backgroundColor);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    return { text: b.textContent.trim(), opacity: Number(cs.opacity),
      contrast: Math.round(ratio * 10) / 10 };
  });
  const prompt = await readBtn();
  rec.ok('the skill prompt is legible, not faded out (full opacity, ≥4.5:1)',
    !prompt.err && prompt.opacity === 1 && prompt.contrast >= 4.5, prompt);

  /* Pick a skill, which is what turns the prompt into the redeem action. */
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent
      && /^(Sword|Bow|Staff)$/i.test((x.textContent || '').trim()));
    if (b) b.click();
  });
  await P.page.waitForTimeout(900);
  const btn = await readBtn();
  rec.ok('the turn-in control names REDEEMING a reward, and says what it pays',
    !btn.err && /Redeem Reward/.test(btn.text) && /\d+g|\bXP\b/.test(btn.text), btn);
  rec.ok('...and the redeem state is legible too',
    !btn.err && btn.opacity === 1 && btn.contrast >= 4.5, btn);

  await P.ctx.close().catch(() => {});
}
