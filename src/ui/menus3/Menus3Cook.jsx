/* ═══ v2.3.6873: THE COUNTER'S MAKE -- THE COOKHOUSE (card MN step 13b) ═══
 *
 * Today's Cookhouse (panels/buildings/CookPanel.jsx) as a bench of the one
 * Make (Menus3Bench.jsx): its one list of recipes, the rows the worker cooks
 * (src/game/menus3Counter.js cookShown: with caps.meals the first
 * `caps.cookRows`), each with today's words -- its name and tier, what the
 * dish does, how many you carry, its herbs have / need (today's reading of
 * the bag, cookHave), its level lock -- and today's request, cook_recipe
 * { recipeIdx, carry: true } with the SAME payload.  The line on where raw
 * fish are cooked (a campfire) stays at the top, as today.
 *
 * A number over one is that request one after another, each waiting for the
 * dish to come into the bag (the worker's player_state: cooking.js).  Today's
 * window put the dish in the bag on the phone before the worker answered;
 * the Counter only asks and waits, so a refusal is seen (the Blacksmith's
 * rule, and the server's authority), and when one lands it says today's
 * "+1 Herb Bread", plays today's sound, sets the flag today's sets and tells
 * a Cooking level as today did.  Against a worker that cooks the old instant
 * buff (no caps.meals) a recipe is one at a time.
 *
 * GONE, the owner's document (Decided 11): the "Cooked -- Ready to Eat"
 * list.  A cooked fish is eaten from the bag (Bro · Bag, its page's Eat:
 * itemActions.js, the same request to eat), so nothing is lost. */
import React from 'react';
import { COOKING_RECIPES } from '@/data/index.js';
import { dishFor } from '@/data/dishes.js';
import { thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { deskWords } from '@/game/deskWords.js';
import { SMITH_STRIKE_MS } from '@/game/smithing.js';
import { C, Chip } from '../panels/buildings/BenchParts.jsx';
import { act } from '@/game/actions.js';
import { SAY } from '@/data/say/menus3Counter.js';
import { say } from '@/game/say.js';
import { cookShown, cookCarries, cookHave } from '@/game/menus3Counter.js';
import { Menus3Bench } from './Menus3Bench.jsx';


/* what a recipe says it does: today's line (CookPanel.jsx buffDesc) */
function cookDesc(recipe, carry, dish) {
  if (carry) return (dish && dish.desc) || recipe.desc || '';
  if (recipe.desc) return recipe.desc;
  const pct = Math.round((recipe.power || 0) * 100);
  if (recipe.buff === 'heal') return say(SAY, 'menus3Counter.cookHeals', { n: recipe.power });
  if (recipe.buff === 'all') return say(SAY, 'menus3Counter.cookAll', { pct });
  return say(SAY, 'menus3Counter.cookBuff', { pct, buff: recipe.buff });
}

function cookRows(S, R, lvl) {
  const caps = S._serverCaps;
  const carry = cookCarries(caps);
  const I = R.inventory || {};
  return cookShown(COOKING_RECIPES, caps).map((ri) => {
    const recipe = COOKING_RECIPES[ri];
    const dish = dishFor(recipe.makes);
    const canCook = lvl >= recipe.cookLvl;
    const carried = carry ? Math.floor(Number(I[recipe.makes]) || 0) : 0;
    let sub = cookDesc(recipe, carry, dish);
    if (!carry && recipe.duration) sub += ' · ' + say(SAY, 'menus3Counter.cookMin', { n: Math.round(recipe.duration / 60) });
    if (carry && carried > 0) sub += ' · ' + say(SAY, 'menus3Counter.cookCarry', { n: carried });
    const herbs = Object.keys(recipe.ingredients);
    return {
      key: 'r' + ri, icon: (carry && recipe.makes && thumbFor(recipe.makes)) || thumbFor(herbs[0]), fallback: thumbFor(herbs[0]),
      title: <>{recipe.name} <span style={{ fontSize: 11, fontWeight: 600, color: C.mute }}>{say(SAY, 'menus3Counter.cookTier', { t: recipe.tier })}</span></>,
      name: recipe.name, sub,
      /* each herb have / need, today's reading (any bag key that names it) */
      costs: herbs.map((type) => ({ icon: thumbFor(type), have: cookHave(I, type), need: recipe.ingredients[type] })),
      ok: canCook, lock: canCook ? null : say(SAY, 'menus3Counter.cookLock', { lvl: recipe.cookLvl }), chips: [],
      multi: carry, per: 1, verb: say(SAY, 'menus3Counter.cook'),
      send: () => act('cook_recipe', carry ? { recipeIdx: ri, carry: true } : { recipeIdx: ri }),
      /* the dish in the bag (carried), else the herbs it takes (an old worker's instant cook) */
      sig: () => {
        const inv = (S.rpg && S.rpg.inventory) || {};
        return carry ? String(Math.floor(Number(inv[recipe.makes]) || 0)) : herbs.map((t) => cookHave(inv, t)).join(':');
      },
      kind: 'cook', workMs: () => SMITH_STRIKE_MS * 2,
      done: carry ? '+1 ' + recipe.name : recipe.name + '!', fail: say(SAY, 'menus3Counter.cookFail'),
      /* today's window sets it as it cooks (a quest's "Learn a Trade" reads the bag) */
      landed: () => { const RR = S.rpg; if (RR) { if (!RR._questFlags) RR._questFlags = {}; RR._questFlags.cookedRecipe = true; } },
    };
  });
}

const COOKHOUSE = Object.freeze({
  id: 'cookhouse',
  skill: 'cooking',
  skillIcon: '/icons/ui/skill-cooking.webp?v=2.3.1224',
  level: (lvl) => say(SAY, 'menus3Counter.cookLevel', { lvl }),
  levelProps: (lvl) => ({ 'data-cook-level': lvl }),
  rootProps: { 'data-cook': 'menus3' },
  tabProp: 'data-cook-tab',
  tabs: () => ['recipes'],
  look: () => ({ label: say(SAY, 'menus3Counter.cookHerbs'), icon: '/icons/ui/bldg-cook.webp' }),
  rows: (tab, S, R, lvl) => cookRows(S, R, lvl),
  above: (tab, S) => {
    const carry = cookCarries(S._serverCaps);
    return (
      <>
        <div className="m3-line">{say(SAY, 'menus3Counter.cookIntro')}</div>
        <div className="m3-line" data-cook-fish-note="1">{deskWords(say(SAY, 'menus3Counter.cookFish'))}</div>
        <div className="m3-line"><b>{say(SAY, carry ? 'menus3Counter.cookMealsHead' : 'menus3Counter.cookBuffsHead')}</b> · {say(SAY, carry ? 'menus3Counter.cookMealsHow' : 'menus3Counter.cookBuffsHow')}</div>
      </>
    );
  },
  /* today's window told a Cooking level as it cooked; here when the cook lands */
  celebrates: () => true,
  ring: () => 'cookDone',
  fail: say(SAY, 'menus3Counter.cookFail'),
});

export function Menus3Cook({ R, getS }) {
  return <Menus3Bench R={R} getS={getS} bench={COOKHOUSE} />;
}
