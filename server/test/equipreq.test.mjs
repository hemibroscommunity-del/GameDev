/* ═══ THE EQUIP GATE AND THE EQUIP BADGE MUST AGREE (v2.3.2132) ═══
 *
 * Excalibur, on the demo: "select a weapon and nothing happens."
 *
 * Two functions in src/data/gameSystems.js answer the same question and
 * answered it differently:
 *
 *   canEquipItem(rpg, item, slot)      -- may this go on?  (the GATE)
 *   getEquipReqLabel(item, slot, rpg)  -- what does it need?  (the BADGE
 *                                         InventoryPanel paints red)
 *
 * They drifted twice, in the same direction, both times making the game tell
 * a player they could not use a weapon it was perfectly willing to equip:
 *
 *   v2.3.1765 made copper rung zero inside the GATE -- subtracting
 *   BLACKSMITH_TIERS.copper.statReq, after an auto-unequip report -- and the
 *   badge never learned it.  So the copper sword tut_1 hands out in the first
 *   five minutes passed the gate at trained level 0 while its card read
 *   "Melee Lv 1/5 X", in red, on a brand-new character.
 *
 *   v2.3.2124/2125 exempted iron from every requirement (owner: "Allow iron
 *   weapons to be equipped at any level").  That went into the GATE only, so
 *   iron gear kept advertising a requirement nothing enforced.
 *
 * v2.3.2132 moved the arithmetic into one function, prog3EquipReq, that both
 * callers use.  This suite is what stops them drifting a third time: it does
 * not check either answer against a hard-coded table, it checks them against
 * EACH OTHER, across every tier and a spread of levels.  A future change to
 * the ladder is free to move both; it cannot move one.
 *
 * Runs in the server suite because that is the runner this repo has, and
 * because these client data modules are plain-node importable (the same
 * reason mirror-audit and display-dps live here).
 */
import { setProg3Enabled } from '../../src/data/prog3.js';
import {
  canEquipItem, getEquipReqLabel, prog3EquipReq,
  BLACKSMITH_TIERS, WOODWORKING_TIERS, isIronGear,
} from '../../src/data/gameSystems.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* prog3 is the live progression on every worker that advertises it, and the
   path both demo reports came from.  The legacy branch is exercised below by
   simply not enabling it. */
setProg3Enabled(true);

const rpgAt = (lvl, defPts) => ({
  level: lvl,
  prog3: {
    sk: { sword: { level: lvl, xp: 0 }, bow: { level: lvl, xp: 0 }, staff: { level: lvl, xp: 0 } },
    pts: { def: defPts || 0 },
    def: defPts || 0,
  },
});

/* Every metal and wood tier the tables actually carry, rather than a list
   written here -- a rung added later is covered without touching this file. */
const METAL = Object.keys(BLACKSMITH_TIERS);
const WOOD = Object.keys(WOODWORKING_TIERS);

/* ── 1. THE AGREEMENT, WHICH IS THE WHOLE POINT ── */
let disagreements = [];
for (const lvl of [1, 2, 3, 5, 10, 15, 30, 60]) {
  for (const slot of ['weapon', 'armor', 'shield']) {
    const type = slot === 'weapon' ? 'sword' : slot;
    for (const base of METAL) {
      const item = { gearBase: base, type, tier: 1 };
      const rpg = rpgAt(lvl, lvl);
      const gate = canEquipItem(rpg, item, slot);
      const lab = getEquipReqLabel(item, slot, rpg);
      /* No badge means "nothing to meet", which has to mean the gate lets it
         through -- that is what a player reads off an unmarked item. */
      const badgeSaysOk = !lab || lab.met !== false;
      if (gate !== badgeSaysOk) {
        disagreements.push({ lvl, slot, base, gate, badge: lab });
      }
    }
  }
}
check('the gate and the badge agree on every metal tier, slot and level',
  disagreements.length === 0, disagreements.slice(0, 6));

let woodDis = [];
for (const lvl of [1, 5, 15, 40]) {
  for (const wood of WOOD) {
    for (const type of ['bow', 'staff']) {
      const item = { gearBase: 'ww_' + wood, type, tier: 1 };
      const rpg = rpgAt(lvl, lvl);
      const gate = canEquipItem(rpg, item, 'weapon');
      const lab = getEquipReqLabel(item, 'weapon', rpg);
      const badgeSaysOk = !lab || lab.met !== false;
      if (gate !== badgeSaysOk) woodDis.push({ lvl, wood, type, gate, badge: lab });
    }
  }
}
check('...and on every woodworking tier too', woodDis.length === 0, woodDis.slice(0, 6));

/* ── 2. THE TWO REPORTS, NAMED ──
   Regression pins, so the general agreement check above cannot be satisfied
   by making BOTH sides wrong in the same way. */
const fresh = rpgAt(1, 0);
const copper = { gearBase: 'copper', type: 'sword', tier: 1 };
check('a brand-new character can equip the copper sword tut_1 gives them',
  canEquipItem(fresh, copper, 'weapon') === true);
const copperLab = getEquipReqLabel(copper, 'weapon', fresh);
check('...and its card does NOT show an unmet requirement (the v2.3.1765 drift)',
  !copperLab || copperLab.met === true, copperLab);

const iron = { gearBase: 'iron', type: 'sword', tier: 2 };
check('iron is free in every slot (owner, v2.3.2125) — guard',
  isIronGear(iron) && canEquipItem(fresh, iron, 'weapon') === true);
check('...so iron advertises no requirement at all',
  getEquipReqLabel(iron, 'weapon', fresh) === null,
  getEquipReqLabel(iron, 'weapon', fresh));

/* ── 3. THE GATE STILL GATES ──
   The fixes above all LOOSEN things, so the real risk is having quietly
   deleted the ladder.  Something high must still be refused low. */
const highTiers = METAL.filter((k) => (BLACKSMITH_TIERS[k].statReq || 0) >= 40 && !isIronGear({ gearBase: k }));
check('there are still tiers a level-1 character cannot equip (the ladder survives)',
  highTiers.length > 0 && highTiers.every((k) =>
    canEquipItem(fresh, { gearBase: k, type: 'sword', tier: 1 }, 'weapon') === false),
  highTiers);

/* ── 4. THE SHARED HELPER MEANS WHAT BOTH SIDES THINK IT MEANS ── */
check('copper is rung zero (v2.3.1765)',
  prog3EquipReq(BLACKSMITH_TIERS.copper, 'weapon', false) === 0);
check('...and pine is rung zero on the wood ladder (v2.3.1763)',
  prog3EquipReq(WOODWORKING_TIERS.pine, 'weapon', true) === 0);
check('...and the rungs above copper still climb',
  prog3EquipReq(BLACKSMITH_TIERS.steel, 'weapon', false)
    > prog3EquipReq(BLACKSMITH_TIERS.copper, 'weapon', false),
  { steel: prog3EquipReq(BLACKSMITH_TIERS.steel, 'weapon', false) });

/* ── 5. THE LEGACY (non-prog3) BRANCH AGREES TOO ──
   Old workers do not advertise caps.prog3 and both functions fall through to
   the stat ladder.  It has its own copy of the comparison, so it gets its own
   check. */
setProg3Enabled(false);
let legacyDis = [];
for (const power of [0, 10, 50]) {
  for (const base of METAL) {
    const item = { gearBase: base, type: 'sword', tier: 1 };
    const rpg = { level: 1, power, agility: power, mind: power, defense: power };
    const gate = canEquipItem(rpg, item, 'weapon');
    const lab = getEquipReqLabel(item, 'weapon', rpg);
    const badgeSaysOk = !lab || (rpg[lab.stat] || 0) >= lab.req;
    if (gate !== badgeSaysOk) legacyDis.push({ power, base, gate, badge: lab });
  }
}
check('the legacy stat ladder agrees with its own badge as well',
  legacyDis.length === 0, legacyDis.slice(0, 6));
setProg3Enabled(true);

console.log(failures === 0 ? '\nequipreq: all passed' : `\nequipreq: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
