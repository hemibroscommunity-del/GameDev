/* ═══ v2.3.3944: ONE QUEST'S JOURNAL PAGE ═══
 *
 * The owner: "Make it a place that makes it clear which quest they are on,
 * what's required, where to go, who was talked to and what to do next, etc.
 * show rewards preview, what was handed during the quest too."  The words come
 * from game/questJournal.js (journalPage); this draws them, top to bottom:
 * NOW, WHERE (with "Show on map"), WHO, GIVEN TO YOU, REWARD, NEXT.
 *
 * Readable on a phone: body text 15-16 px on the sheet's own high-contrast
 * ink, no tiny chips.  Laid out from the box it is given, measured (the
 * dashboard may give this page a skinny sideways column or a wide band: never
 * the window's size): two columns once it is wide enough for two.
 *
 * Drawn by the quest list (dash/QuestsPanel.jsx, the quest it opens on) and by
 * a quest's own page (dash/QuestDetailPanel.jsx).
 *
 * ═══ v2.3.4356: `brief`, THE QUESTS PAGE'S OWN LAYOUT ═══
 * The owner, 2026-11-09: "The quests page actually needs to be reorganized as
 * a useful menu interface.  Right now everything scrolls too long ... It
 * needs to be able to help you navigate active quests, next steps, locations,
 * etc easily on a mobile device."  The six parts above were each a block with
 * a heading, a full-width Show on map button in the second and Track at the
 * very foot: on a phone's band (about 190 px tall) you saw the title and half
 * of NOW, and scrolled for where to go.
 *
 * `brief` is the same page drawn for the pane beside the Quests page's list
 * (QuestsPanel.jsx), so that what you need to carry on is on screen at once:
 *   - one head row: the title and its status, then MAP and TRACK as two 44 px
 *     buttons (the two things you do with a quest), always at the top;
 *   - NOW straight under it, no heading: the step, then its count and bar on
 *     one line;
 *   - WHERE as one line with a pin;
 *   - then, a scroll away, the rest as before, tighter: WHO and the steps,
 *     GIVEN TO YOU, REWARD, NEXT.
 * The words, the hooks (data-journal-*) and the rules are the same ones;
 * nothing under 13 px (quest-journal.test, mp-questjournal).
 */
import React, { useEffect, useState } from 'react';
import { COL } from './common.js';
import { NPC_DATA } from '../../../data/gameDisplay.js';
import { npcArtUrl } from '@/rendering/npcSprites.js';
import { coinArtFor } from '@/game/coinArt.js';
import { deskWords } from '@/game/deskWords.js';
import { moreLine } from '@/game/questJournal.js';
import { trackedQuestId, setTrackedQuest } from '@/game/trackedQuest.js';
import { openWorldMap } from '../../WorldMapOverlay.jsx';
import { useScrollTap } from '../sheet/scrollTap.js';
import { swallowTapClick } from '../../swallowTapClick.js';

/* the giver's face, by the NAME the quest stores (as the old page found it) */
export function npcPortrait(name) {
  const npc = (NPC_DATA || []).find((n) => n && n.name === name);
  return (npc && npc.portrait) ? npcArtUrl(npc.portrait) : null;
}

/** The width of a box, measured, and kept up to date (a ResizeObserver; the
 *  sheet's width changes when a phone turns or the dashboard folds). */
export function useBoxWidth() {
  /* a callback ref: the box can come and go (a page with no quest draws none) */
  const [el, ref] = useState(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!el) return undefined;
    const read = () => { const r = el.getBoundingClientRect(); setW((old) => (Math.abs(old - r.width) < 1 ? old : Math.round(r.width))); };
    read();
    let ro = null;
    try { ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : null; } catch (_e) { ro = null; }
    if (ro) ro.observe(el);
    else window.addEventListener('resize', read);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', read); };
  }, [el]);
  return [ref, w];
}

/** A tap that survives the sheet's scroller (scrollTap.js) and, because what
 *  it opens replaces what is under the finger, swallows the click that
 *  follows (TRAPS §247).  A click with no pointer (Enter on a computer, a
 *  test's element.click()) runs it too. */
export function useJournalTap() {
  const scrollTap = useScrollTap();
  return (fn) => {
    const st = scrollTap(fn);
    return {
      ...st,
      onPointerUp: (e) => { swallowTapClick(e); st.onPointerUp(e); },
      onClick: (e) => { if (e.detail === 0) fn(); },
    };
  };
}

/** "Show on map": the world map, with the gold road on this quest.  The road
 *  follows the quest you track (game/trackedQuest.js), so a quest in hand is
 *  tracked first; an offer's road is the tour's own (it leads to its giver). */
export function showQuestOnMap(page) {
  if (!page) return false;
  if ((page.status === 'active' || page.status === 'ready') && trackedQuestId() !== page.id) setTrackedQuest(page.id);
  return openWorldMap();
}

const STATUS_TONE = { ready: COL.accent, active: '#7FB0EC', available: COL.text2, done: '#59BF91', locked: COL.muted };

const Label = ({ children }) => (
  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.accent, margin: '0 0 4px' }}>
    {children}
  </div>
);

const Section = ({ name, children, label }) => (
  <section data-journal={name} style={{ padding: '10px 2px 10px', borderTop: `1px solid ${COL.divider}` }}>
    <Label>{label}</Label>
    {children}
  </section>
);

/* an item, pictured: the picture in a well, its name beside it */
const ItemRow = ({ item }) => (
  <div data-journal-item={item.label || ''} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44 }}>
    {item.icon ? (
      <img src={item.icon} alt="" draggable={false}
        style={{ width: 40, height: 40, flex: 'none', objectFit: 'contain', borderRadius: 8, background: COL.well, padding: 3, boxSizing: 'border-box' }}
        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
    ) : null}
    <span style={{ fontSize: 15.5, fontWeight: 600, color: COL.text, lineHeight: 1.3, minWidth: 0 }}>{item.label}</span>
  </div>
);

const Bar = ({ frac, flat }) => (
  <div aria-hidden="true" style={{ height: 10, borderRadius: 5, background: COL.well, overflow: 'hidden', marginTop: flat ? 0 : 6 }}>
    {/* brass while you work on it, green once it is all there (green means
        done here: UI-DESIGN-NOTES, "green for in progress" is out) */}
    <div style={{ width: `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`, height: '100%',
      background: frac >= 1 ? '#59BF91' : COL.accent, borderRadius: 5 }} />
  </div>
);

export function QuestJournalPage({ page, header = true, kicker = '', brief = false, track = null }) {
  const [ref, w] = useBoxWidth();
  const tap = useJournalTap();
  if (!page) return null;
  const wide = !brief && w >= 560;
  const { now, where, who, given, reward, next } = page;
  const face = npcPortrait(page.npc);
  const tone = STATUS_TONE[page.status] || COL.text2;
  const tracked = trackedQuestId() === page.id;

  const nowPart = now && (
    <Section name="now" label="Now">
      <div data-journal-now="" style={{ fontSize: 16.5, fontWeight: 700, lineHeight: 1.35, color: COL.text }}>{deskWords(now.text)}</div>
      {now.goal ? (
        <div style={{ fontSize: 15, lineHeight: 1.4, color: COL.text2, marginTop: 3 }}>{deskWords(now.goal)}</div>
      ) : null}
      {now.count ? (
        <div data-journal-count={now.count.have + '/' + now.count.n} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: now.count.have >= now.count.n ? '#7FD6AC' : COL.text, fontVariantNumeric: 'tabular-nums' }}>
            {now.count.text}
          </div>
          <Bar frac={now.count.have / now.count.n} />
        </div>
      ) : null}
    </Section>
  );

  /* ── v2.3.4356: the brief page's head, NOW and WHERE (the note above) ── */
  const inHand = page.status === 'active' || page.status === 'ready';
  const headBtn = (on) => ({
    flex: 'none', width: 50, minHeight: 44, padding: '2px 0', boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
    background: on ? COL.accentFill : COL.wellSoft, border: `1px solid ${on ? COL.accent : COL.borderStrong}`, borderRadius: 11,
    color: on ? COL.accent : COL.text, fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
  });
  const briefHead = brief && (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 0 6px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div data-journal-title="" style={{
          fontSize: 16, fontWeight: 800, color: COL.text, lineHeight: 1.2,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{page.title}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: tone, marginTop: 2, letterSpacing: '.04em', textTransform: 'uppercase' }}>
          {/* no "★ Tracked" here: the lit TRACK button beside it says so, and the line stays one line */}
          {page.statusLabel}
        </div>
      </div>
      {where && where.map ? (
        <button type="button" data-journal-map={page.id} aria-label="Show on map" title="Show on map"
          {...tap(() => showQuestOnMap(page))} style={headBtn(false)}>
          {/* a map pin, drawn: nothing to load */}
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M10 1.8a5.6 5.6 0 0 0-5.6 5.6c0 4.1 5.6 10.8 5.6 10.8s5.6-6.7 5.6-10.8A5.6 5.6 0 0 0 10 1.8Z" fill="#D8AA58" stroke="#172126" strokeWidth="1" />
            <circle cx="10" cy="7.4" r="2.1" fill="#172126" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.1 }}>Map</span>
        </button>
      ) : null}
      {track && inHand ? (
        <button type="button" data-quest-track={tracked ? 'on' : 'off'} aria-pressed={tracked}
          aria-label={tracked ? 'Tracked: stop tracking this quest' : 'Track this quest'} title={tracked ? 'Stop tracking' : 'Track this quest'}
          {...tap(() => track.onToggle(page.id))} style={headBtn(tracked)}>
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>{tracked ? '★' : '☆'}</span>
          <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.1 }}>Track</span>
        </button>
      ) : null}
    </div>
  );
  const briefNow = brief && now && (
    <section data-journal="now" style={{ padding: '0 0 6px' }}>
      <div data-journal-now="" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: COL.text }}>{deskWords(now.text)}</div>
      {now.goal ? <div style={{ fontSize: 14, lineHeight: 1.35, color: COL.text2, marginTop: 2 }}>{deskWords(now.goal)}</div> : null}
      {now.count ? (
        <div data-journal-count={now.count.have + '/' + now.count.n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <span style={{ flex: 'none', fontSize: 14, fontWeight: 800, color: now.count.have >= now.count.n ? '#7FD6AC' : COL.text, fontVariantNumeric: 'tabular-nums' }}>
            {now.count.text}
          </span>
          <span style={{ flex: 1, minWidth: 24 }}><Bar frac={now.count.have / now.count.n} flat /></span>
        </div>
      ) : null}
    </section>
  );
  const briefWhere = brief && where && (
    <section data-journal="where" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 0', borderTop: `1px solid ${COL.divider}` }}>
      <span aria-hidden="true" style={{ flex: 'none', fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.accent, lineHeight: '19px' }}>Where</span>
      <span style={{ minWidth: 0 }}>
        <span data-journal-where="" style={{ display: 'block', fontSize: 14.5, lineHeight: 1.3, color: COL.text }}>{deskWords(where.text)}</span>
        {/* v2.3.3522: what tracking does, said once it is on */}
        {track && inHand && tracked ? (
          <span data-quest-track-note="" style={{ display: 'block', fontSize: 13, color: COL.text2, marginTop: 2 }}>Your map's gold star follows this quest.</span>
        ) : null}
      </span>
    </section>
  );

  const wherePart = where && (
    <Section name="where" label="Where">
      <div data-journal-where="" style={{ fontSize: 16, lineHeight: 1.35, color: COL.text }}>{deskWords(where.text)}</div>
      {where.map ? (
        <button type="button" data-journal-map={page.id}
          {...tap(() => showQuestOnMap(page))}
          style={{
            marginTop: 8, minHeight: 44, padding: '0 16px', width: wide ? 'auto' : '100%',
            background: COL.accentFill, border: `1px solid ${COL.accent}`, borderRadius: 10,
            color: COL.text, fontFamily: 'inherit', fontSize: 15.5, fontWeight: 700,
            cursor: 'pointer', touchAction: 'manipulation',
          }}>Show on map</button>
      ) : null}
    </Section>
  );

  const whoPart = who && (
    <Section name="who" label="Who">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {face ? (
          <img src={face} alt="" draggable={false}
            style={{ width: 52, height: 52, flex: 'none', objectFit: 'contain', imageRendering: 'pixelated',
              borderRadius: 8, background: COL.well, border: `1px solid ${COL.tileBor}` }} />
        ) : null}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 800, color: COL.text }}>{who.npc}</div>
          {who.talked ? <div data-journal-talked="" style={{ fontSize: 15, color: '#7FD6AC', marginTop: 2 }}>{who.talked}</div> : null}
          {who.todo ? <div style={{ fontSize: 15, color: COL.text2, marginTop: 2 }}>{who.todo}</div> : null}
          {who.handIn ? <div style={{ fontSize: 15, color: page.status === 'done' ? '#7FD6AC' : COL.accent, marginTop: 2, fontWeight: 700 }}>{who.handIn}</div> : null}
        </div>
      </div>
      {who.steps.length ? (
        <div data-quest-steps={page.id} style={{ marginTop: 8 }}>
          {who.steps.map((st, i) => (
            <div key={i} data-step-state={st.done ? 'done' : st.current ? 'current' : 'todo'} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 8px', marginBottom: 3,
              borderRadius: 8,
              background: st.current ? COL.accentFill : 'transparent',
              border: `1px solid ${st.current ? COL.accent : 'transparent'}`,
            }}>
              <span aria-hidden="true" style={{ flex: '0 0 18px', fontWeight: 800, fontSize: 15, color: st.done ? '#7FD6AC' : st.current ? COL.accent : COL.muted }}>
                {st.done ? '✓' : st.current ? '▶' : '•'}
              </span>
              <span style={{ fontSize: 15, lineHeight: 1.4, color: st.done ? COL.text2 : COL.text }}>{deskWords(st.label)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Section>
  );

  const givenPart = given && (
    <Section name="given" label="Given to you">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
        {given.items.map((it, i) => <ItemRow key={(it.icon || it.label) + i} item={it} />)}
      </div>
      <div style={{ fontSize: 14, color: COL.text2, marginTop: 4 }}>{given.note}</div>
    </Section>
  );

  const rewardPart = reward && (
    <Section name="reward" label={page.status === 'done' ? 'You got' : 'Reward'}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 16px' }}>
        {reward.gold > 0 ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 800, color: COL.gold, fontVariantNumeric: 'tabular-nums' }}>
            <img src={coinArtFor(reward.gold)} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
            {reward.gold} gold
          </span>
        ) : null}
        {reward.xp > 0 ? <span style={{ fontSize: 16, fontWeight: 800, color: '#9DB8FA' }}>+{reward.xp} XP</span> : null}
        {reward.apText ? <span data-journal-ap-reward={reward.ap} style={{ fontSize: 16, fontWeight: 800, color: COL.text }}>★ {reward.apText}</span> : null}
        {reward.itemText ? <span style={{ fontSize: 16, fontWeight: 700, color: COL.text }}>{reward.itemText}</span> : null}
      </div>
      {reward.items.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6, marginTop: 6 }}>
          {reward.items.map((it, i) => <ItemRow key={(it.icon || it.label) + i} item={it} />)}
        </div>
      ) : null}
      <div style={{ fontSize: 14, color: COL.text2, marginTop: 4 }}>{reward.note}</div>
    </Section>
  );

  const nextPart = next && (
    <Section name="next" label="Next">
      <div data-journal-next="" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4, color: COL.text }}>{deskWords(next.text)}</div>
      {next.more ? <div style={{ fontSize: 14.5, color: COL.text2, marginTop: 3 }}>{moreLine(next.more)}</div> : null}
    </Section>
  );

  if (brief) {
    return (
      <div ref={ref} data-journal-page={page.id} data-journal-status={page.status} data-journal-brief="">
        {briefHead}{briefNow}{briefWhere}
        {whoPart}{givenPart}{rewardPart}{nextPart}
      </div>
    );
  }
  return (
    <div ref={ref} data-journal-page={page.id} data-journal-status={page.status}>
      {header ? (
        <div style={{ padding: '6px 2px 8px' }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: COL.text, lineHeight: 1.25 }}>{page.title}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: tone, marginTop: 3, letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {/* v2.3.3944: "Your quest · In progress" -- one line, not two, on a short upright sheet */}
            {kicker ? kicker + ' · ' : ''}{page.statusLabel}{tracked && (page.status === 'active' || page.status === 'ready') ? ' · ★ Tracked' : ''}
          </div>
        </div>
      ) : null}
      {wide ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20 }}>
          <div style={{ minWidth: 0 }}>{nowPart}{wherePart}{whoPart}</div>
          <div style={{ minWidth: 0 }}>{givenPart}{rewardPart}{nextPart}</div>
        </div>
      ) : (
        <>{nowPart}{wherePart}{whoPart}{givenPart}{rewardPart}{nextPart}</>
      )}
    </div>
  );
}
