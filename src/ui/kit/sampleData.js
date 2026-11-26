/* ═══ v2.3.6680: THE SAMPLES' DATA, READ WITH THE GAME'S OWN READERS (card UI2) ═══
 * The fixture's two samples (the Bro landing, the Character page) show the
 * player's REAL data where the page has a player: read here with the same
 * readers today's Bro card uses (sheet/BroCard.jsx), never a number of the
 * kit's own.  Where the game has nothing (a guild), the honest empty line;
 * where the page has no player, `null`, and the sample says so.
 *
 * THE STATE IS HANDED IN, never taken: the page's global (`window._gameState`)
 * is closed to a new reader (tools/guards/open-hand.test.mjs; grand plan step
 * 5.7), and the fixture lies outside the game's tree, so nothing hands it the
 * state today.  On a QA page the harness hands it (`window.__btUiKitHand(S)`,
 * mp-uikit); the live screens that replace today's Bro tab will be handed it
 * by their parent, as BroCard is.  No layout, no write. */
import { profileFromSelf } from '../panels/playerProfile.js';
import { portraitSrc } from '../mobile/sheet/portraitStore.js';
import { BRO_WEAPONS } from '../mobile/sheet/broStats.js';
import { combatSkillState, WEAPON_SKILLS } from '../mobile/dash/combatSkill.js';
import { hasUnseenLevelUps } from '../mobile/sheet/skillsModel.js';
import { prog3Live, prog3CharLevel } from '../../data/prog3.js';
import { achvApTotal } from '@/game/achievements.js';

/* the game's pictures, by door (the audit's "Pictures, by door"; nothing new) */
export const KIT_ART = Object.freeze({
  character: '/icons/ui/panel-self.webp',
  combat: '/icons/ui/panel-weapons.webp',
  equipment: '/icons/ui/panel-loadout.webp',
  life: '/icons/ui/nav-lifeskills.webp',
  feats: '/icons/achievements/achievements.webp',
  pets: '/icons/ui/pets-paw.webp',
  sword: '/icons/ui/combat-melee.webp',
  bow: '/icons/ui/combat-bow.webp',
  staff: '/icons/ui/combat-magic.webp',
  clan: '/icons/ui/panel-clan.webp',
  guild: '/icons/ui/panel-guild.webp',
  quests: '/icons/ui/panel-quests.webp',
  gold: '/icons/ui/cur-gold.webp',
});
const WEAPON_ART = Object.freeze({ sword: KIT_ART.sword, bow: KIT_ART.bow, staff: KIT_ART.staff });

/** The player as the samples show them, from the state handed in, or null. */
export function readKitPlayer(S) {
  if (!S || !S.myId || !S.rpg) return null;
  const R = S.rpg;
  let p = null;
  try { p = profileFromSelf(S); } catch (e) { p = null; }
  let level = Math.max(1, Number(R.level) || 1);
  try { if (prog3Live(R)) level = prog3CharLevel(R); } catch (e) { /* the old blob */ }
  const weapons = WEAPON_SKILLS.map((sk, i) => {
    let k = null;
    try { k = combatSkillState(R, sk); } catch (e) { k = null; }
    const w = BRO_WEAPONS[i];
    return { cat: w.cat, label: w.label, art: WEAPON_ART[w.cat], lvl: k ? k.lvl : 0, unspent: k ? k.unspent : 0 };
  });
  let lifeNew = false;
  try { lifeNew = hasUnseenLevelUps(R); } catch (e) { lifeNew = false; }
  const clan = p && p.clan;
  return {
    name: (p && p.name) || 'You',
    portrait: portraitSrc(S),
    title: p && p.equippedTitle ? p.equippedTitle.text : null,
    level,
    weapons,
    points: weapons.reduce((n, w) => n + (w.unspent || 0), 0),
    lifeNew,
    clan: clan ? (clan.name || clan.tag) : null,
    ap: achvApTotal(S),
    quests: p ? p.questsCompleted : 0,
  };
}
