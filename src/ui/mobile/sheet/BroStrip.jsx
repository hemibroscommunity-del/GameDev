/* ═══ v2.3.6782: THE BRO PAGE'S STRIP, WHAT YOU HAVE (card UI3-bro) ═══
 *
 * The owner, 2026-11-26 (docs/design/UI_FEEDBACK_2026-11-26.md part 2): "AP
 * 415 / Quests 0 / Clan: Party of 3 / Guilds: View ›", and part 3:
 * "Supporting information ... Flat, aligned within shared containers. No
 * individual heavy borders."  ONE kit facts container (src/ui/kit/Facts.jsx,
 * `dir="row"`) under the six tiles: AP, Quests done, Clan (or Party),
 * Guilds, your title.  Each entry its label over its value, and a door where
 * the game has a page (the kit's flat door: its chevron, its tap, 44 px
 * tall, no face or border of its own).  What it says is
 * src/game/broHub.js broStrip's word; the readings are handed in (`read`,
 * BroCard's readPassport: open-hand.test).
 *
 * A value on its way is the passport's placeholder, never a 0.  On the
 * narrowest page on its side (a page under 760 px wide and short) the Clan,
 * Guilds, Quests and title entries become their pictures' doors, each still
 * 44 px, its words its label for a screen reader (the passport's rule:
 * "the line becomes a door, never smaller text"); AP keeps its words. */
import React from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { frameTap } from '../dash/DashHeader.jsx';
import { ACHV_MEDAL_SRC } from '@/data/achievements.js';
import { broStrip, broHubOpen } from '@/game/broHub.js';
import { Ui2Facts, Ui2Fact } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/charPage.js';
import { say } from '@/game/say.js';
import { useClock } from './CharacterPage.jsx';   /* the passport's clock: a redraw only when a shown value moved */
import './characterPage.css';   /* the passport's placeholder (u2-pass-wait) */
import './broStrip.css';

/* the pictures an entry wears when it is only its picture (the passport's own) */
const ART = Object.freeze({
  clan: '/icons/ui/panel-clan.webp',
  guilds: '/icons/ui/panel-guild.webp',
  quests: '/icons/ui/panel-quests.webp',
  title: ACHV_MEDAL_SRC,
});

/* the words, each key written out (say.test rule 7) */
function word(key, n) {
  switch (key) {
    case 'charPage.ap': return say(SAY, 'charPage.ap');
    case 'charPage.quests': return say(SAY, 'charPage.quests');
    case 'charPage.notShared': return say(SAY, 'charPage.notShared');
    case 'charPage.clan': return say(SAY, 'charPage.clan');
    case 'charPage.noClan': return say(SAY, 'charPage.noClan');
    case 'charPage.inParty': return say(SAY, 'charPage.inParty', { n });
    case 'charPage.guilds': return say(SAY, 'charPage.guilds');
    case 'charPage.skillGuilds': return say(SAY, 'charPage.skillGuilds');
    case 'charPage.title': return say(SAY, 'charPage.title');
    case 'charPage.noTitle': return say(SAY, 'charPage.noTitle');
    default: return String(key || '');
  }
}

const fmt = (v) => Number(v).toLocaleString('en-US');
const valueOf = (s) => (s.v != null ? (s.id === 'ap' || s.id === 'quests' ? fmt(s.v) : String(s.v)) : s.key ? word(s.key, s.n) : '');
const readOf = (read) => { try { return (typeof read === 'function' ? read() : null) || {}; } catch (e) { return {}; } };
/* what the clock compares: the strip's own values */
const stripKey = (read, who) => broStrip(readOf(read), who).map((s) => s.id + ':' + (s.loading ? '~' : valueOf(s)) + (s.opens ? '>' : '')).join('|');

/**
 * read    () => the passport's readings (BroCard: readPassport(S))
 * who     whose page (null: yours)
 * side    a page on its side: the strip beside the tiles, as tall as they are
 * narrow  the narrowest page on its side: entries become their pictures' doors
 */
export function BroStrip({ read, who, side, narrow }) {
  const whose = who == null ? null : who;
  useClock(() => stripKey(read, whose), 500);
  const strip = broStrip(readOf(read), whose);
  const go = (opens) => {
    const o = broHubOpen(opens);
    if (o && o.kind === 'page') dashboardPanelBus.go({ type: 'push', id: o.page, who: who == null ? undefined : who });
  };
  return (
    <Ui2Facts dir="row" className={'u2-bro-strip' + (side ? ' is-side' : '')} data-bro-strip={who == null ? 'self' : 'other'} role="group" aria-label={say(SAY, 'charPage.stripAria')}>
      {strip.map((s) => {
        const icon = !!(narrow && ART[s.id]);
        const words = valueOf(s);
        const aria = say(SAY, 'charPage.factAria', { k: s.id === 'ap' ? say(SAY, 'charPage.apAria') : word(s.k), v: s.loading ? '…' : words });
        const v = s.loading ? <span className="u2-pass-wait" data-u2-loading="" aria-hidden="true" /> : (icon ? null : words);
        const tap = s.opens ? frameTap(() => go(s.opens)) : {};
        return (
          <Ui2Fact key={s.id} k={icon ? null : word(s.k)} v={v} none={s.none} art={icon ? ART[s.id] : undefined}
            className={icon ? 'is-icon' : undefined}
            data-bro-fact={s.id} data-bro-v={s.loading ? '' : words} data-bro-loading={s.loading ? 1 : undefined}
            aria-label={aria} aria-busy={s.loading ? 'true' : undefined}
            {...tap} />
        );
      })}
    </Ui2Facts>
  );
}

export default BroStrip;
