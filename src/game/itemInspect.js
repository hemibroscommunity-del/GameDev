/* ═══ v2.3.6687: THE ONE ITEM PAGE'S MODEL (card UI2-gear PR 1, the build's step 5) ═══
 *
 * The owner, 2026-11-25, with the master specification (part 5): "Full
 * Details opens the shared item inspector (also used from Codex, equipment,
 * loot, stat breakdowns). Context and permissions govern available actions;
 * read-only inspection for others. Do not duplicate the data model."  Part 8:
 * "The same entity should use the same canonical inspection screen across the
 * Codex and contextual entry points."  Part 14 (Q83): "retain the relevant
 * action in its predictable location in a visibly disabled state, with a
 * short adjacent explanation. Example: `Equip Sword` disabled; `Sword level
 * 18 — requires level 25.`"
 *
 * ONE function, inspectItem(input), turns what an opener knows of an item
 * into what the one page draws: who it is (picture, name, the GAME's grade
 * and its stars), whose it is and where ("In your bag", "Worn", "Diego's",
 * another player's name), the facts that matter for its kind, the doors to
 * deeper facts, and the actions its context allows.  It decides nothing the
 * game has not: the item's facts are the item card's own (ItemDetailPopup's
 * resolveItemCard, the data model) and Gear's own rows (dash/gearStats.js);
 * the actions are the ONE list (dash/itemActions.js itemActionList), which
 * this narrows by context and never widens:
 *   - another player's item (and a Codex entry) is read-only: no action;
 *   - Sell only in a shop (the bag while a shop is open);
 *   - an action you cannot take stays, OFF, with its reason beside it (the
 *     requirement the worker's equip gate asks: getEquipReqLabel's answer).
 * The same item opened from two places has the same identity and facts: only
 * `where` and the actions differ (tools/guards/item-inspect.test.mjs).
 *
 * The grades are the game's (Normal, Rare, Elite, Godly; one to four stars;
 * dash/common.js QUALITY_LABEL, which imports nothing): a grade the game does
 * not have reads as Normal, never as a word of a mockup.
 *
 * No React and no game state here (node tests it): the opener hands in what
 * it read from its parent (open-hand.test: no new reach into the game). */
import { say } from '../game/say.js';   /* spelt by its folder (guards/say.test reads the path) */
import { SAY } from '../data/say/itemInspect.js';
import { QUALITY_LABEL } from '../ui/mobile/dash/common.js';

/** The game's grades and their stars (dash/GearTab.jsx STAR_COUNT). */
export const ITEM_GRADES = Object.freeze({ normal: 1, rare: 2, elite: 3, godly: 4 });

/** Where an item is looked at from.  `readOnly`: no action at all. */
export const ITEM_PLACES = Object.freeze({
  bag: Object.freeze({ readOnly: false }),
  worn: Object.freeze({ readOnly: false }),
  shop: Object.freeze({ readOnly: true }),    /* a shop's goods: buying is the shop's own window (step 8) */
  other: Object.freeze({ readOnly: true }),   /* another player's */
  codex: Object.freeze({ readOnly: true }),
});

/** The header's word for the item's kind (a slot's name in the game's words). */
export function kindWord(kind) {
  switch (kind) {
    case 'sword': return say(SAY, 'itemInspect.kindSword');
    case 'bow': return say(SAY, 'itemInspect.kindBow');
    case 'staff': return say(SAY, 'itemInspect.kindStaff');
    case 'shield': return say(SAY, 'itemInspect.kindShield');
    case 'chest': return say(SAY, 'itemInspect.kindChest');
    case 'legs': return say(SAY, 'itemInspect.kindLegs');
    case 'cape': return say(SAY, 'itemInspect.kindCape');
    case 'amulet': return say(SAY, 'itemInspect.kindAmulet');
    default: return say(SAY, 'itemInspect.kindItem');
  }
}

/** The weapon a requirement's stat names, in the ONE vocabulary of the new
    screens (Sword, Bow, Staff: the master notes, table 1 line 9). */
const REQ_WEAPON = Object.freeze({ sword: 1, bow: 1, staff: 1 });

/** Each action's face in the kit's five colours (the specification's part 2:
    gold routine, green accept or claim, blue guide, red destroy, silver
    neutral).  Drop is the one that loses the item; Unequip puts it in the bag
    (routine), so it is gold, not red. */
export const ACTION_FACE = Object.freeze({
  equip: 'gold', unequip: 'gold', capeOn: 'gold', capeOff: 'gold', reveal: 'gold',
  eat: 'gold', drink: 'gold', light: 'gold', sell: 'gold',
  open: 'green', openChest: 'green',
  inspect: 'silver', lock: 'silver',
  drop: 'red',
});

/** The actions a requirement can stop (putting the item on). */
const WEARS = Object.freeze({ equip: 1, capeOn: 1 });

/** A row's label in the new screens' words (the master notes, table 1 line
    10: "Attack speed" where two Speeds could be read). */
function factLabel(k) {
  return k === 'Speed' ? say(SAY, 'itemInspect.attackSpeed') : String(k);
}

/** The game's grade id for a stored quality, and its word.  Anything the
    game does not grade (undefined, a mockup's word) is Normal. */
export function itemGrade(q) {
  const g = typeof q === 'string' && Object.prototype.hasOwnProperty.call(ITEM_GRADES, q) ? q : 'normal';
  return { grade: g, word: QUALITY_LABEL[g], stars: ITEM_GRADES[g] };
}

/** A requirement (getEquipReqLabel's answer: { stat, label, req, have, met })
    as two lines: what it asks ("Sword level 25") and, when it is not met,
    why the action is off ("Sword level 18, requires 25"). */
export function reqWords(req) {
  if (!req || !(Number(req.req) > 0)) return { asks: '', why: '' };
  const r = Number(req.req);
  const have = Number(req.have) || 0;
  let asks;
  let why;
  if (REQ_WEAPON[req.stat]) {
    const weapon = kindWord(req.stat);
    asks = say(SAY, 'itemInspect.reqWeapon', { weapon, req: r });
    why = say(SAY, 'itemInspect.whyWeapon', { weapon, have, req: r });
  } else if (req.stat === 'level') {
    asks = say(SAY, 'itemInspect.reqLevel', { req: r });
    why = say(SAY, 'itemInspect.whyLevel', { have, req: r });
  } else {
    const label = String(req.label || req.stat || '');
    asks = say(SAY, 'itemInspect.reqStat', { label, req: r });
    why = say(SAY, 'itemInspect.whyStat', { label, have, req: r });
  }
  /* `met` false is the gate's own "no"; anything else (an older worker that
     does not say) leaves the action on: the worker still judges it */
  return { asks, why: req.met === false ? why : '' };
}

/** Whose and where, in words. */
export function whereWords(place, owner) {
  if (place === 'shop' || place === 'other') return owner ? say(SAY, 'itemInspect.whose', { name: String(owner) }) : '';
  if (place === 'codex') return say(SAY, 'itemInspect.inCodex');
  return place === 'worn' ? say(SAY, 'itemInspect.worn') : say(SAY, 'itemInspect.inBag');
}

/**
 * The page's model.  `input`:
 *   place    'bag' | 'worn' | 'shop' | 'other' | 'codex';
 *   owner    the shop's keeper or the other player, by name ('shop', 'other');
 *   atShop   a shop is open (the bag's Sell);
 *   kind     'sword' | 'bow' | 'staff' | 'shield' | 'chest' | 'legs' | 'cape' | 'amulet' | 'item';
 *   name, art, glyph, quality, hidden (a "?" piece: no grade, no numbers);
 *   rows     the item's own stat rows ({ k, v }: gearStats' weaponRows ...);
 *   line     the card's sentence (what it heals, what it is for);
 *   count    how many you hold (a stack);
 *   hardness a weapon's 0-5, or null; gems: the gems set in it (names);
 *   req      the equip gate's requirement (getEquipReqLabel), or null;
 *   actions  the ONE list (itemActionList: { id, label, tone, off, why, attrs });
 *   doors    deeper pages ({ id, label }); none is invented.
 * Returns { title, name, art, glyph, grade, gradeWord, stars, hidden, where,
 * readOnly, facts: [{ k, v }], line, doors, actions: [{ id, label, face, off,
 * why, attrs, lead }] } with the lead action first.
 */
export function inspectItem(input) {
  const i = input || {};
  const place = Object.prototype.hasOwnProperty.call(ITEM_PLACES, i.place) ? i.place : 'bag';
  const P = ITEM_PLACES[place];
  const hidden = !!i.hidden;
  const g = itemGrade(hidden ? null : i.quality);
  const req = reqWords(i.req);

  /* the facts: the item's own rows, then what the game knows of it beside
     them; at most six, so the page never needs a scroll for its first facts */
  const facts = [];
  if (!hidden) {
    for (const r of Array.isArray(i.rows) ? i.rows : []) {
      if (r && r.k != null && r.v != null && r.v !== '' && r.v !== '—') facts.push({ k: factLabel(r.k), v: String(r.v) });
    }
    if (Number.isFinite(i.hardness) && i.hardness != null) facts.push({ k: say(SAY, 'itemInspect.hardness'), v: Math.max(0, Math.min(5, Math.floor(i.hardness))) + '/5' });
    if (Array.isArray(i.gems) && i.gems.length) facts.push({ k: say(SAY, 'itemInspect.gems'), v: i.gems.join(', ') });
    if (req.asks) facts.push({ k: say(SAY, 'itemInspect.requires'), v: req.asks });
  }
  if (Number(i.count) > 1) facts.push({ k: say(SAY, 'itemInspect.youHold'), v: String(Math.floor(Number(i.count))) });

  /* the actions: the one list, narrowed by where you stand */
  let actions = [];
  if (!P.readOnly) {
    for (const a of Array.isArray(i.actions) ? i.actions : []) {
      if (!a || !a.id) continue;
      if (a.id === 'sell' && !(place === 'bag' && i.atShop)) continue;   /* Sell only in a shop */
      let off = !!a.off;
      let why = off ? String(a.why || '') : '';
      if (WEARS[a.id] && req.why) { off = true; why = req.why; }
      if (off && !why) why = say(SAY, 'itemInspect.whyNotNow');   /* never off without a reason */
      actions.push({ id: a.id, label: a.label, face: ACTION_FACE[a.id] || 'silver', off, why, attrs: a.attrs || null, lead: false });
    }
    /* the lead: the list's own primary (Equip, Eat, Drink, Reveal...) even
       when it is off -- an action keeps its place (Q83) -- else the first */
    const src = Array.isArray(i.actions) ? i.actions : [];
    const primary = src.find((a) => a && a.tone === 'primary' && actions.some((x) => x.id === a.id));
    const lead = primary ? actions.find((x) => x.id === primary.id) : actions[0];
    if (lead) {
      lead.lead = true;
      actions = [lead, ...actions.filter((x) => x !== lead)];
    }
  }

  return Object.freeze({
    title: kindWord(i.kind),
    name: String(i.name || ''),
    art: i.art || null,
    glyph: i.glyph || null,
    grade: g.grade,
    gradeWord: hidden ? '' : g.word,
    stars: hidden ? 0 : g.stars,
    hidden,
    where: whereWords(place, i.owner),
    readOnly: P.readOnly,
    facts: Object.freeze(facts.slice(0, 6)),
    line: i.line ? String(i.line) : '',
    doors: Object.freeze((Array.isArray(i.doors) ? i.doors : []).filter((d) => d && d.id && d.label)),
    actions: Object.freeze(actions),
  });
}
