/* ═══ v2.3.6694: HOW A LIFE SKILL WORKS, ONE PIECE TWO PAGES CALL (card UI2-life, reading 6) ═══
 *
 * The detail lines of today's Life Skills page (dash/SkillsPanel.jsx, the in-panel detail, v2.3.1312
 * on), moved here WHOLE: what one hit can be at this level and the next (the hit ladder, v2.3.3229,
 * `data-hit-odds`), which resources pay full XP and the nearest that pay less (the XP fade,
 * v2.3.3251, `data-xp-fade`), the benefit, where it is found, and how it is earned.  Today's page
 * (under `?ui2=0`) and the new frame's "How it works" page (sheet/LifeSkillPage.jsx) each draw it
 * with their own row: `row(label, value)` a row, `hint(text)` the earn line.  `children` sits where
 * today's page has its unlock rows (between the XP fade and the benefit), so its order is unchanged.
 *
 * "Found at" is skillsModel.js META's `where`, moved unchanged ("Frost Ridge", "Starting Meadow",
 * "Stone Hollows": NOT VERIFIED that each is where that resource grows on the Wheel; the card's flag). */
import React from 'react';
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3615: "tap" reads "click" on a computer */
import { gatherHitOddsText } from '../../../data/lifeSkills.js';   /* v2.3.3229: the hit ladder's odds */
import { xpDecayOn } from '../../../data/xpDecay.js';   /* v2.3.3251: the XP fade's lines */
import { skillXpFade, xpShareText } from './skillsModel.js';
import { SAY } from '@/data/say/skills.js';
import { say } from '@/game/say.js';

/**
 * S      the game's state (its caps: gatherhits, hitladder; the XP fade's switch)
 * sd     the skill's roster row (skillsModel.js SKILL_ROSTER)
 * lvl    its level (1 or more)
 */
export function SkillHow({ S, sd, lvl, row, hint, children }) {
  /* v2.3.3229: THE HIT LADDER.  A harvest or a cook is a run of hits the
     worker rolls (caps.gatherhits), each one a ten-sided die read down from
     this skill's level -- so print what one hit can be now and at the next
     level, the owner's "10% chance of hitting 1 number higher" per level.
     The odds are the ones THIS worker rolls: the ladder's with
     caps.hitladder, the even 1..level without it (an older worker, or the
     kill switch). */
  const hitsOn = !!(sd.hits && S && S._serverCaps && S._serverCaps.gatherhits);
  const fade = xpDecayOn(S) ? skillXpFade(sd, lvl) : null;   /* v2.3.3251 */
  const ladder = !!(S && S._serverCaps && S._serverCaps.hitladder);
  return (
    <>
      {hitsOn && <div data-hit-odds={lvl} style={{ display: 'contents' }}>
        {row(say(SAY, 'skills.eachHit'), gatherHitOddsText(lvl, ladder))}
        {row(say(SAY, 'skills.nextLevelHit', { lvl: lvl + 1 }), gatherHitOddsText(lvl + 1, ladder))}
      </div>}
      {/* v2.3.3251: which resources pay full XP at this level, and the
          nearest that pay less (xpDecay.js) -- only against a worker that
          fades it (caps.xpdecay) */}
      {fade && <div data-xp-fade={lvl} style={{ display: 'contents' }}>
        {row(say(SAY, 'skills.fullXp'), fade.full.length ? fade.full.join(', ') : say(SAY, 'skills.fullXpNone'))}
        {fade.less.length > 0 && row(say(SAY, 'skills.lessXp'), fade.less.slice(0, 2).map(x => `${x.name} ${xpShareText(x.share)}`).join(' · ') + (fade.less.length > 2 ? ' …' : ''))}
      </div>}
      {children}
      {sd.passive && row(say(SAY, 'skills.benefit'), sd.passive(lvl))}
      {sd.timerPassive && !hitsOn && row(say(SAY, 'skills.benefit'), sd.timerPassive(lvl))}
      {sd.where && row(say(SAY, 'skills.foundAt'), sd.where)}
      {hint(deskWords(sd.earnHint))}
    </>
  );
}

export default SkillHow;
