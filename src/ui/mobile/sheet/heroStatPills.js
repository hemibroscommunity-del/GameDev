/* ═══ v2.3.3053: THE HERO SHEET'S STATS, AS PILLS ═══
 *
 * Owner, 2026-10-05: "Add pill design for hero equipment menu stats.  See
 * screenshot" -- a mockup of the Equipment tab with every stat in its own
 * rounded pill: an icon, the stat's name, its value; OFFENSE in gold with the
 * DPS pill beside the heading, PLAYER in blue, and the three vitals as
 * coloured pills of their own.
 *
 * The mockup also names more stats than the tab showed (seven): Range, Attack
 * Speed, Special Dmg and Element on the offense side, Stamina, Move and Resist
 * on the player's.  All seven are real -- each is a Points stat the worker
 * already settles -- and each is read here through the SAME reader the Points
 * tab prints it with (prog3.js, gameSystems.js), so the two tabs cannot show
 * two numbers for one stat.  Two spellings differ on purpose:
 *   - Attack Speed reads "+25%" where the Points cell reads "1.25" -- one
 *     number, swingCooldownMultFor, the pill saying it the mockup's way;
 *   - the mockup's "Element Dmg" is ELEMENTAL POWER, a power number and not a
 *     percent, so its pill says "Elem Power" and "+12", not "+12%".
 *
 * Pure (no React, no DOM): the sheet draws these rows, and a node test can
 * read them.  `info` is the explainer key (infoGlossary.js statInfo) a tap on
 * the pill opens -- every pill has one.
 */
import { prog3Live, prog3ActiveCat, prog3RangeMult, prog3SpecialMult, prog3ElemPower,
  prog3EresPct, prog3MoveMult, prog3CharLevel, prog3Pts, prog3SkillLevel, PROG3 } from '../../../data/prog3.js';
import { swingCooldownMultFor, toDisplayDamage, toDisplayHp } from '../../../data/gameSystems.js';
import { healthAt, healthPerPoint, isOneFormulaEnabled } from '../../../data/oneFormula.js';

/* Each stat's picture: the Points tab's own where the stat is a Points stat
   (PROG3_ATK_META / PROG3_BODY_META iconSrc, same ?v= so the browser shares
   the file), the hero sheet's set for the rest, and the bag's armour piece for
   Armor (the mockup drew a chest plate). */
export const HERO_PILL_ICON = {
  dps:     '/icons/ui/hero/dps.webp?v=2.3.1323',
  damage:  '/icons/ui/hero/damage.webp?v=2.3.1694',
  range:   '/icons/ui/stat/range.png?v=2.3.2642',
  aspd:    '/icons/ui/stat/aspd.png?v=2.3.2642',
  crit:    '/icons/ui/stat/luck.png?v=2.3.2642',
  critDmg: '/icons/ui/hero/crit.webp?v=2.3.1694',
  special: '/icons/ui/stat/special.png?v=2.3.2642',
  elem:    '/icons/ui/stat/elem.png?v=2.3.2642',
  def:     '/icons/ui/stat/def.png?v=2.3.2642',
  armor:   '/icons/bag/bag-armor.webp?v=2.3.1312',
  stam:    '/icons/ui/stat/stam.png?v=2.3.2642',
  dodge:   '/icons/ui/stat/dodge.png?v=2.3.2642',
  move:    '/icons/ui/stat/move.png?v=2.3.2642',
  eres:    '/icons/ui/stat/eres.png?v=2.3.2642',
  hp:      '/icons/ui/stat/hp.png?v=2.3.2642',     /* v2.3.3605: the Health family */
  mana:    '/icons/ui/stat/mana.png?v=2.3.2642',
};

/* The two groups' colours: the mockup's gold and blue.  Gold is the lantern
   brass (COL.accent) and blue the mana/info blue -- no new hue (LANTERN-SLATE
   "no new accent colors"); a border at full strength is the documented
   exception (docs/LANTERN-SLATE-SPEC.md, the eighth). */
export const HERO_PILL_TONE = {
  offense: { head: '#E2B866', edge: 'rgba(216, 170, 88, 0.78)' },
  player:  { head: '#7DB2EE', edge: 'rgba(91, 153, 222, 0.80)' },
};

/* The hero sheet's percent: one decimal under 10, whole above (HeroExpanded
   pct1 -- the same rule, so "1.0%" reads the same on both). */
export function pillPct(v) {
  const n = (v || 0) * 100;
  return String(n > 0 && n < 10 ? n.toFixed(1) : Math.round(n));
}
const plusPct = (mult) => '+' + Math.round(((mult || 1) - 1) * 100) + '%';

/** The pills, from the rpg blob and the sheet's deriveHeroStats() result:
 *  { dps, offense: [7], player: [6] }, each { key, label, value, icon, info }.
 *  Never throws: a value that cannot be read is '—'. */
export function heroStatPills(R, d) {
  R = R || {};
  d = d || {};
  const p3 = prog3Live(R);
  const cat = prog3ActiveCat(R);
  const wpn = d.wpn || null;
  const safe = (fn) => { try { const v = fn(); return v == null || v === '' ? '—' : String(v); } catch (e) { return '—'; } };
  const row = (key, label, info, fn) => ({ key, label, info, icon: HERO_PILL_ICON[key], value: safe(fn) });
  return {
    dps: row('dps', 'DPS', 'DPS', () => (Number(d.dps) || 0).toFixed(2)),
    offense: [
      row('damage', 'Damage', 'Damage', () => d.dmgText || '0'),
      row('range', 'Range', 'Range', () => plusPct(prog3RangeMult(R, cat))),
      /* the swing PERIOD multiplier, inverted to a rate: 0.80 -> +25% */
      row('aspd', 'Attack Speed', 'Atk Speed', () => {
        const m = swingCooldownMultFor(R, wpn && wpn.type ? wpn.type : cat);
        return '+' + Math.round(((m > 0 ? 1 / m : 1) - 1) * 100) + '%';
      }),
      row('crit', 'Crit Chance', 'Crit', () => pillPct(d.crit) + '%'),
      /* v2.3.2199's two units, exactly as the sheet printed them: a percent
         against a prog3x worker, the old worker's flat damage otherwise */
      row('critDmg', 'Crit Dmg', 'Crit Dmg', () => (p3
        ? '+' + (d.critDmgPct ? Math.round(d.critDmg || 0) : toDisplayDamage(d.critDmg || 0)) + (d.critDmgPct ? '%' : '')
        : '—')),
      row('special', 'Special Dmg', 'Special', () => plusPct(prog3SpecialMult(R, cat))),
      row('elem', 'Elem Power', 'Elemental', () => '+' + Math.round(prog3ElemPower(R, cat) || 0)),
    ],
    player: [
      row('def', 'Defense', 'Defense', () => (p3 ? pillPct(d.defPct) + '%' : '—')),
      row('armor', 'Armor', 'Armor', () => pillPct(d.armorDr) + '%'),
      /* what the Stamina points add to the 100 every bar starts at -- the
         pool itself is the EN pill above */
      row('stam', 'Stamina', 'Stamina', () => '+' + Math.max(0, Math.round((Number(R.maxStamina) || 100) - 100))),
      row('dodge', 'Dodge', 'Dodge', () => pillPct(d.dodge) + '%'),
      row('move', 'Move', 'Move Speed', () => plusPct(prog3MoveMult(R))),
      row('eres', 'Resist', 'Elem Resist', () => pillPct(prog3EresPct(R)) + '%'),
    ],
  };
}

/* ═══ v2.3.3605: THE STATS IN FAMILIES, EACH SHOWING WHAT IT IS MADE OF ═══
 * The owner: "in char stat menu on inventory I want each major combat resource
 * grouped under families (damage could encompass damage range, DPS, crit,
 * crit chance, etc) even HP to show what's contributing (item, natural lvl, hp
 * stat allocation points, etc). Accordion style family pills so it can all
 * display without scrolling down".
 *
 * Four families, each a pill with its headline number that opens (one at a
 * time, HeroExpanded) on its members -- the pills above, unchanged, so every
 * number is still read by the Points tab's own reader:
 *   Damage   (DPS)       damage, attack speed, crit chance, crit damage,
 *                        special, elemental power, range;
 *   Defense  (Defense %) defense, armor, dodge, resist;
 *   Health   (max HP)    what the bar is made of: the base every bar starts
 *                        at, your level, your Max HP points, gear (armour
 *                        blocks damage instead of adding health: v2.3.1697)
 *                        and anything else the worker's bar holds;
 *   Energy   (stamina)   stamina's base and points, mana's base, Magic level
 *                        and points, move speed.
 * The parts are worked out with the very formula the bar is (oneFormula.js
 * healthAt, gameSystems.js recomputeStats); a part the worker's own number
 * holds and the formula does not explain is shown as "Other", so the parts
 * always add up to the bar. */
export const HERO_FAMILIES = Object.freeze(['damage', 'defense', 'health', 'energy']);

export function heroStatFamilies(R, d) {
  R = R || {};
  const pills = heroStatPills(R, d);
  const by = Object.create(null);
  for (const p of pills.offense.concat(pills.player)) by[p.key] = p;
  const part = (key, label, value, icon, info) => ({ key, label, value: String(value), icon: icon || HERO_PILL_ICON[key], info: info || null });
  const plus = (n) => (n >= 0 ? '+' : '') + n;
  const p3 = (() => { try { return prog3Live(R); } catch (e) { return false; } })();

  /* Health: base + level + points (+ other), in the bar's display units */
  const maxHp = Number(R.maxHp) || 100;
  const health = [];
  if (p3) {
    try {
      const on = isOneFormulaEnabled();
      const L = prog3CharLevel(R), P = prog3Pts(R, 'hp');
      const base = healthAt(0, 0, on), lvl = healthAt(L, 0, on) - base, pts = P * healthPerPoint(on);
      const other = maxHp - (base + lvl + pts);
      health.push(part('hpBase', 'Base', toDisplayHp(base), HERO_PILL_ICON.hp, 'HP'));
      health.push(part('hpLevel', 'Level ' + L, plus(toDisplayHp(lvl)), HERO_PILL_ICON.hp, 'HP'));
      health.push(part('hpPoints', 'Max HP points (' + P + ')', plus(toDisplayHp(pts)), HERO_PILL_ICON.hp, 'HP'));
      health.push(part('hpGear', 'Gear', '+0', HERO_PILL_ICON.armor, 'Armor'));
      if (Math.abs(other) >= 1) health.push(part('hpOther', 'Other', plus(toDisplayHp(other)), HERO_PILL_ICON.hp, 'HP'));
    } catch (e) { /* a part that cannot be read: the total alone */ }
  }
  if (!health.length) health.push(part('hpTotal', 'Max HP', toDisplayHp(maxHp), HERO_PILL_ICON.hp, 'HP'));

  /* Energy: stamina and mana, each its base and what adds to it */
  const energy = [];
  const maxSt = Number(R.maxStamina) || 100, maxMp = Number(R.maxMana) || 100;
  if (p3) {
    try {
      const stPts = prog3Pts(R, 'stam'), stPer = (PROG3.BODY && PROG3.BODY.stam && PROG3.BODY.stam.per) || 0;
      energy.push(part('stBase', 'Stamina base', 100, HERO_PILL_ICON.stam, 'Stamina'));
      energy.push(part('stPoints', 'Stamina points (' + stPts + ')', plus(Math.round(stPts * stPer)), HERO_PILL_ICON.stam, 'Stamina'));
      const stOther = Math.round(maxSt - 100 - stPts * stPer);
      if (Math.abs(stOther) >= 1) energy.push(part('stOther', 'Stamina, other', plus(stOther), HERO_PILL_ICON.stam, 'Stamina'));
      const ml = prog3SkillLevel(R, 'staff'), mPts = prog3Pts(R, 'mana');
      const mPer = (PROG3.BODY && PROG3.BODY.mana && PROG3.BODY.mana.per) || 0;
      const fromMagic = Math.floor(ml * (PROG3.MANA_PER_MAGIC_LEVEL || 0));
      energy.push(part('mpBase', 'Mana base', 100, HERO_PILL_ICON.mana, null));
      energy.push(part('mpMagic', 'Magic level ' + ml, plus(fromMagic), HERO_PILL_ICON.mana, null));
      energy.push(part('mpPoints', 'Mana points (' + mPts + ')', plus(Math.round(maxMp - 100 - fromMagic)), HERO_PILL_ICON.mana, null));
    } catch (e) { energy.length = 0; }
  }
  if (!energy.length) {
    energy.push(part('stTotal', 'Max stamina', Math.round(maxSt), HERO_PILL_ICON.stam, 'Stamina'));
    energy.push(part('mpTotal', 'Max mana', Math.round(maxMp), HERO_PILL_ICON.mana, null));
  }
  if (by.move) energy.push(by.move);

  return [
    { key: 'damage', label: 'Damage', tone: 'offense', icon: HERO_PILL_ICON.dps, head: pills.dps.value + ' DPS',
      rows: ['damage', 'aspd', 'crit', 'critDmg', 'special', 'elem', 'range'].map((k) => by[k]).filter(Boolean) },
    { key: 'defense', label: 'Defense', tone: 'player', icon: HERO_PILL_ICON.def, head: by.def ? by.def.value : '—',
      rows: ['def', 'armor', 'dodge', 'eres'].map((k) => by[k]).filter(Boolean) },
    { key: 'health', label: 'Health', tone: 'player', icon: HERO_PILL_ICON.hp, head: toDisplayHp(maxHp) + ' HP', rows: health },
    { key: 'energy', label: 'Energy', tone: 'player', icon: HERO_PILL_ICON.stam, head: Math.round(maxSt) + ' / ' + Math.round(maxMp), rows: energy },
  ];
}
