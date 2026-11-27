/* ═══ v2.3.6695: THE MEDALS, BY THE GAME'S FOUR TIERS (card UI2-feats) ═══
 *
 * The master specification 4.5: "Earned medals have their full appearance;
 * unearned medals are muted but inspectable. Use non-color state cues."  The
 * master notes: "the four achievement tiers as the medals" (an ordinary
 * choice, already made).  So Feats' Achievements door opens four RAISED
 * tiles, Common, Rare, Arena, Super-rare, EACH ITS OWN tier (the arena is not
 * filed under Rare here; never Gold, Silver, Bronze), each with "n of N" and
 * its points earned of its points possible (by each row's own points,
 * src/data/achievements.js achvAp: the ten fish rows pay 5 and 10).  No tier
 * picture exists (the PR lists it as missing art): a tier wears its latest
 * earned badge, or, with none, its first badge muted, ringed in its
 * ACHV_TIERS colour (the arena's orange, Super-rare's prismatic ring).
 *
 * A tier opens its gallery: its badges in the table's order, earned ones
 * full, the rest muted (the kit's is-off) with a lock mark and "Not earned"
 * for a screen reader; every badge opens its medal's page (MedalPage.jsx).
 * Two rows upright, one sideways, each badge 44 px at least. */
import React from 'react';
import { frameTap } from '../dash/DashHeader.jsx';
import { useClock, useRoom } from './CharacterPage.jsx';
import { featsGo } from './featsGo.js';
import { featsTiers, featsGallery, featsWord } from '@/game/feats.js';
import { Ui2Tile, Ui2Empty, ui2RootClass } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/feats.js';
import { say } from '@/game/say.js';
import './feats.css';

const rev = (S) => (S && S._achv ? S._achv.rev + ':' + (S._achv.known ? 1 : 0) : '-');
const ringStyle = (t) => (t.ring && t.ring !== 'prismatic' ? { '--feats-ring': t.ring } : undefined);

/** The four tiers.  `who` another player's: their medals are their phone's ("Not shared"). */
export function MedalTiers({ S, who }) {
  useClock(() => rev(S), 500);
  const [ref, room] = useRoom();
  if (who != null) {
    return <div ref={ref} className={ui2RootClass() + ' u2-feats'} data-feats-tiers="other"><Ui2Empty kind="absent" title={say(SAY, 'feats.notShared')} /></div>;
  }
  const tiers = featsTiers(S);
  const loading = tiers.some((t) => t.n == null);
  return (
    <div ref={ref} className={ui2RootClass() + ' u2-feats' + (room.short ? ' is-short' : '')} data-feats-tiers="self">
      {loading ? <Ui2Empty kind="loading" rows={2} /> : (
        <div className="u2-feats-grid" data-feats-doors={tiers.length}>
          {tiers.map((t) => (
            <Ui2Tile key={t.id} size="compact" art={t.art} label={featsWord(t.id)}
              sub={say(SAY, 'feats.tierOf', { n: t.n, total: t.of }) + ' · ' + say(SAY, 'feats.tierPts', { n: t.pts.toLocaleString('en-US'), max: t.max.toLocaleString('en-US') })}
              className={'u2-feats-ringed u2-feats-cell' + (t.muted ? ' is-locked' : '')} style={ringStyle(t)}
              aria-label={say(SAY, 'feats.tierAria', { tier: featsWord(t.id), n: t.n, total: t.of, pts: t.pts, max: t.max })}
              data-tier={t.id} data-feats-tier={t.id} data-feats-tier-n={t.n} data-feats-tier-pts={t.pts} data-feats-tier-muted={t.muted ? 1 : 0}
              {...frameTap(() => featsGo(t.opens, null))} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A tier's gallery. */
export function MedalGallery({ S, tier, who }) {
  useClock(() => rev(S), 500);
  const [ref, room] = useRoom();
  const rows = tier ? featsGallery(S, tier) : [];
  const a = S && S._achv;
  const cols = room.short ? Math.max(1, rows.length) : Math.max(1, Math.ceil(rows.length / 2));
  const got = rows.filter((r) => r.got).length;
  let body;
  if (who != null) body = <Ui2Empty kind="absent" title={say(SAY, 'feats.notShared')} />;
  else if (!a || !a.known) body = <Ui2Empty kind="loading" rows={2} />;
  else {
    body = (
      <div className="u2-feats-gallery" style={{ gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))' }} data-feats-gallery={tier} data-feats-gallery-n={rows.length}>
        {rows.map((r) => (
          <Ui2Tile key={r.id} size="primary" art={r.art} label={r.name} locked={!r.got || undefined}
            className={'u2-feats-cell' + (r.got ? '' : ' is-locked')}
            aria-label={say(SAY, 'feats.medalAria', { name: r.name, state: r.got ? say(SAY, 'feats.earnedWord') : say(SAY, 'feats.notEarned') })}
            data-feats-medal-cell={r.id} data-feats-got={r.got ? 1 : 0}
            {...frameTap(() => featsGo('page:featsMedal', null, r.id))} />
        ))}
      </div>
    );
  }
  return (
    <div ref={ref} className={ui2RootClass() + ' u2-feats'} data-feats-tier-page={tier || ''}>
      <div className="u2-feats-head">
        <span className="u2-feats-head-v">{featsWord(tier)}</span>
        {who == null && a && a.known ? <span className="u2-feats-head-k">{say(SAY, 'feats.tierOf', { n: got, total: rows.length })}</span> : null}
      </div>
      {body}
    </div>
  );
}

export default MedalTiers;
