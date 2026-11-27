/* ═══ v2.3.6695: A MEDAL'S PAGE (card UI2-feats) ═══
 *
 * The master specification 4.5: "unearned medals are muted but inspectable";
 * "Do not silently alter achievement requirements or AP values."  The page of
 * one achievement, its id the frame entry's `sel`: the badge large and its
 * name beside the kit's FACTS in one container: its tier, its AP (each row's
 * own, src/data/achievements.js achvAp), the day it was earned
 * (achvDateWords) or "Not earned yet", its requirement (the table's `how`,
 * word for word), how far along you are where the game has a hint
 * (achvProgress: the three combat rows, the two codex rows, the dungeons;
 * nothing where it has none, never "0 of 1"), and, earned and yours,
 * "Title: <name>", a door to Titles (Character's ONE TitlesPage), where it is
 * worn. */
import React from 'react';
import { useClock, useRoom } from './CharacterPage.jsx';
import { featsGo } from './featsGo.js';
import { featsMedal, featsWord } from '@/game/feats.js';
import { PASSPORT_DOORS } from '@/game/broHub.js';
import { Ui2Facts, Ui2Fact, Ui2Empty, ui2RootClass } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/feats.js';
import { say } from '@/game/say.js';
import './feats.css';

export function MedalPage({ S, id, who }) {
  useClock(() => (S && S._achv ? S._achv.rev + ':' + (S._achv.known ? 1 : 0) : '-') + '|' + String(id), 500);
  const [ref, room] = useRoom();
  const m = id ? featsMedal(S, id, who == null ? null : who, Date.now()) : null;
  if (!m) {
    return (
      <div ref={ref} className={ui2RootClass() + ' u2-feats'} data-feats-medal="">
        <Ui2Empty kind="absent" title={say(SAY, 'feats.unknownMedal')} />
      </div>
    );
  }
  const a = S && S._achv;
  const ready = who != null || !!(a && a.known);
  const facts = [
    <Ui2Fact key="tier" k={say(SAY, 'feats.fTier')} v={featsWord(m.tier)} data-medal-fact="tier" />,
    <Ui2Fact key="ap" k={say(SAY, 'feats.fAp')} v={String(m.ap)} gold data-medal-fact="ap" data-medal-ap={m.ap} />,
    !m.shared ? <Ui2Fact key="on" k={say(SAY, 'feats.fEarned')} v={say(SAY, 'feats.notShared')} none data-medal-fact="on" />
      : <Ui2Fact key="on" k={say(SAY, 'feats.fEarned')} v={m.got ? m.on : say(SAY, 'feats.notYet')} none={!m.got} data-medal-fact="on" data-medal-got={m.got ? 1 : 0} />,
    <Ui2Fact key="how" k={say(SAY, 'feats.fHow')} v={m.how} className="is-wrap" data-medal-fact="how" />,
    m.progress ? <Ui2Fact key="prog" k={say(SAY, 'feats.fSoFar')} v={m.progress} data-medal-fact="progress" /> : null,
    m.title && who == null ? (
      <Ui2Fact key="title" k={say(SAY, 'feats.fTitle')} v={m.title.worn ? say(SAY, 'feats.titleWorn', { name: m.title.name }) : m.title.name}
        data-medal-fact="title" data-medal-title-worn={m.title.worn ? 1 : 0} onClick={() => featsGo(PASSPORT_DOORS.titles, null)} />
    ) : null,
  ];
  return (
    <div ref={ref} className={ui2RootClass() + ' u2-medal' + (room.short ? ' is-short' : '')} data-feats-medal={m.id} data-feats-medal-got={m.got ? 1 : 0}>
      <div className="u2-medal-id">
        <img className={'u2-medal-art' + (m.got ? '' : ' is-locked')} src={m.art} alt="" draggable={false} />
        <span className="u2-medal-name">{m.name}</span>
        {m.got || !m.shared ? null : <span className="u2-medal-lock" data-medal-lock=""><span aria-hidden="true">{'🔒 '}</span>{say(SAY, 'feats.notEarned')}</span>}
      </div>
      {ready ? <Ui2Facts dir={room.short ? 'row' : undefined}>{facts}</Ui2Facts> : <Ui2Empty kind="loading" rows={3} />}
    </div>
  );
}

export default MedalPage;
