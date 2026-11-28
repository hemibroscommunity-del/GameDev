/* ═══ v2.3.6693: A MONSTER'S SHOWCASE AND ITS DOORS (card UI2-codex, the build's step 6) ═══
 *
 * The owner (the master specification, Q74): "the actual animated monster
 * sprite, name, short description, level/element and essential combat stats
 * are visible on the first screen. Subject destinations summarize their own
 * contents and expand into dedicated detail views"; Q75: "Show item artwork,
 * explicit item name, rarity and exact drop probability together. Selecting
 * an item opens universal item inspection. No dice-roll numbers, probability
 * progress bars or unnecessary drill-down by rarity."
 *
 * One component for the Codex's frame pages (dash/codexPageOpen.js
 * CODEX_PAGES: a PANELS row each, all drawn by CodexDoorPage, which reads
 * which page it is and its monster from its own visit on the frame):
 *   codexMonster  the kit's Ui2Showcase: the monster large in its idle strip
 *                 (CodexStage.jsx CodexIdle), its four doors with their
 *                 summaries, its essentials (src/game/entityInspect.js);
 *                 not met, today's locked page and no doors;
 *   codexCombat   what it does, its element's effect, its special and the
 *                 tip, with today's stage (CodexStage: your figure, its
 *                 attack, its special);
 *   codexLoot     its drops as plain rows (src/game/lootRows.js): picture,
 *                 name, type, ONE chance; a row opens the one item page
 *                 (dash/itemPageOpen.js, place 'codex'); the roll's words and
 *                 the grades once, under the rows;
 *   codexHabitat  its land, both stages' levels, the way there, its dungeon;
 *   codexStory    its tale and its elder form;
 *   codexFound    the item page's Found from: every monster that drops it.
 *
 * ITS ART LOADS WHEN ITS PAGE OPENS AND IS FREED ON LEAVING (the plan's step
 * 6; the owner, of today's Info tab: "I think loading only when you open the
 * info tab"): the showcase and Combat each hold useStageStrips while drawn,
 * and the frame draws only its top page, so going to a door or Back lets the
 * strips go (their baked copies revoked).  One monster's strips at a time:
 * at most about 8 MB decoded (CodexStage.jsx's header). */
import React, { useEffect } from 'react';
import { Ui2Showcase, Ui2Facts, Ui2Fact, Ui2Empty, ui2RootClass } from '@/ui/kit/index.js';
import { PetPortrait } from '@/ui/petPortrait.jsx';
import { CodexIdle, CodexStage } from './CodexStage.jsx';
import { codexFactsAt, CODEX_OPEN_AT } from '@/data/monsterCodex.js';
import { codexCounts, codexSeen } from '@/game/monsterCodex.js';
import { killRollLive } from '@/game/killRoll.js';
import { codexMet } from '@/game/codexView.js';
import { monsterShowcase, monsterCombat, monsterHabitat, monsterStory } from '@/game/entityInspect.js';
import { lootPage, lootSources } from '@/game/lootRows.js';
import { SAY } from '@/data/say/codexPages.js';
import { SAY as SAY_CX } from '@/data/say/monsterCodex.js';
import { say } from '@/game/say.js';
import { useClock, useRoom } from '../sheet/CharacterPage.jsx';
import { codexTop, codexS, openCodexDoor, openCodexMonster, keepCodexRow, codexFoundKey } from './codexPageOpen.js';
import { openItemPage, codexItemName } from './itemPageOpen.js';
import './codexUi2.css';

const revOf = (S) => String(S && S._codex ? S._codex.rev : -1);
const dropOpts = (S) => ({ shared: killRollLive(S), crack: !!(S && S._serverCaps && S._serverCaps.shardcrack) });

/** A monster's Loot page (its rows, the roll's words), as its Loot page and
 *  its door's count read them.  v2.3.6693: ONE call of the rule, the worker's
 *  caps and the one item page's namer in it, so the rows and the words come
 *  from one input (loot-rows.test L8, L10 read this call). */
function lootOf(S, kind) {
  return lootPage(kind, { ...dropOpts(S), nameOf: codexItemName });
}
/* v2.3.6867 (card MN step 8): the same call for the new panel's Codex (menus3/Menus3Codex.jsx) */
export { lootOf as codexLoot };

/* ── the showcase ── */
function Showcase({ kind, onDoor }) {
  const S = codexS();
  const counts = codexCounts(S, kind);
  const met = codexMet(counts[0]);
  const [ref, room] = useRoom();
  useEffect(() => { if (met) codexSeen(codexS(), kind); }, [kind, met]);
  const m = monsterShowcase(kind, { counts, loot: met ? lootOf(S, kind).rows : [] });
  if (!m) return null;
  const short = room.short;
  const fh = short ? Math.max(40, Math.min(60, room.h - 2)) : Math.max(72, Math.min(150, room.h - 4));
  const fw = short ? 64 : Math.max(84, Math.round((room.w || 300) * 0.3));
  const figure = m.met ? <CodexIdle kind={kind} h={fh} w={fw} />
    : <PetPortrait pet={{ kind, stage: 1 }} size={Math.min(fh, 96)} shadow />;
  return (
    <div ref={ref} className={ui2RootClass('u2-cxs')} data-codex-show={kind} data-cx-known={m.met ? 1 : 0}>
      <Ui2Showcase short={short} figure={figure}
        locked={m.met ? null : <Ui2Empty kind="locked" title={m.title} why={m.why} how={m.home} />}
        doors={m.met ? m.doors.map((d) => ({ id: d.id, label: d.label, summary: d.summary, onClick: () => (onDoor ? onDoor(d.page) : openCodexDoor(d.page, kind)), attrs: { 'data-cx-door': d.id } })) : []}
        facts={m.met ? m.essentials : []} />
    </div>
  );
}

/* a titled block of words on a door's page: flat, no face */
function Words({ id, title, children }) {
  return (
    <section className="u2-cxw" data-cx-words={id}>
      <h4 className="u2-cxw-title">{title}</h4>
      {children}
    </section>
  );
}

/* ── Combat: the stage and its words ── */
const STAGE_W = 300, STAGE_H = 150;
function Combat({ kind }) {
  const S = codexS();
  const [ref, room] = useRoom();
  const c = monsterCombat(kind);
  if (!c || !codexMet(codexCounts(S, kind)[0])) return null;
  const wide = room.w >= 560;
  /* the stage as large as its box lets it be, never larger than it is (one CSS scale: nothing in it moves against anything else) */
  const k = Math.max(0.3, Math.min(1, (wide || room.short ? room.h - 2 : STAGE_H) / STAGE_H, (wide ? room.w * 0.45 : room.w - 4) / STAGE_W));
  return (
    <div ref={ref} className={ui2RootClass('u2-cxc' + (wide ? ' is-wide' : ''))} data-codex-combat={kind}>
      <div className="u2-cxc-stage" data-cx-stage-fit={k.toFixed(3)} style={{ width: Math.round(STAGE_W * k), height: Math.round(STAGE_H * k) }}>
        <div style={{ width: STAGE_W, height: STAGE_H, transformOrigin: '0 0', transform: k < 1 ? `scale(${k})` : 'none' }}>
          <CodexStage kind={kind} facts={codexFactsAt(CODEX_OPEN_AT)} elder={false} S={S} />
        </div>
      </div>
      <div className="u2-cxc-words">
        <Words id="what" title={say(SAY_CX, 'monsterCodex.factWhat')}><p>{c.what}</p></Words>
        {c.element ? (
          <Words id="element" title={say(SAY_CX, 'monsterCodex.factElement', { name: c.element.name })}>
            <p><img className="u2-cxw-icon" src={c.element.icon} alt="" draggable={false} /><b>{c.element.status}.</b> {c.element.effect}</p>
            <p className="u2-cxw-sub">{c.element.pet}</p>
          </Words>
        ) : null}
        <Words id="special" title={say(SAY_CX, 'monsterCodex.factSpecial', { name: c.special.name })}>
          <p>{c.special.text}</p>
          <p className="u2-cxw-tip"><b>{say(SAY_CX, 'monsterCodex.factTip')}</b> {c.special.tip}</p>
        </Words>
      </div>
    </div>
  );
}

/* ── Loot: plain rows, one chance each ── */
function Loot({ top, onRow }) {
  const kind = top.kind;
  const S = codexS();
  const [n] = codexCounts(S, kind);
  if (!codexMet(n)) return null;
  const page = lootOf(S, kind);
  const rows = page.rows;
  const name = monsterShowcase(kind, { counts: [n, 0] }).title;
  const open = (r) => {
    if (onRow) { onRow(r, name); return; }   /* v2.3.6867: the new panel's own page */
    keepCodexRow(top, r.id);
    openItemPage({ from: 'codex', R: (S && S.rpg) || {}, key: r.key, kind, monster: name, drop: r });
  };
  return (
    <div className={ui2RootClass('u2-cxl')} data-codex-loot={kind} data-cx-rows={rows.length}>
      <Ui2Facts className="u2-cxl-rows">
        {rows.map((r) => (
          <Ui2Fact key={r.id} data-cx-drop={r.id} data-cx-chance={r.chance} aria-current={top.row === r.id ? 'true' : undefined}
            className={top.row === r.id ? 'is-sel' : undefined}
            k={(
              <span className="u2-cxl-id">
                {r.art ? <img className="u2-cxl-art" src={r.art} alt="" draggable={false} /> : <span className="u2-cxl-art" />}
                <span className="u2-cxl-words">
                  <span className="u2-cxl-name">{r.name}</span>
                  <span className="u2-cxl-type">{r.type}{r.note ? ' · ' + r.note : ''}</span>
                </span>
              </span>
            )}
            v={r.chance} gold={r.every} onClick={() => open(r)} />
        ))}
      </Ui2Facts>
      <p className="u2-cxl-roll" data-cx-roll={page.mark}>{page.roll}</p>
      {page.grades.length ? (
        <>
          <h4 className="u2-cxw-title">{say(SAY, 'codexPages.gradesHead')}</h4>
          <Ui2Facts dir="row" className="u2-cxl-grades" data-cx-grades="">
            {page.grades.map((g) => <Ui2Fact key={g.q} k={g.word} v={g.pct} data-cx-grade={g.q} />)}
          </Ui2Facts>
        </>
      ) : null}
    </div>
  );
}

/* ── Habitat and Story: words ── */
function Habitat({ kind }) {
  const h = monsterHabitat(kind);
  if (!h || !codexMet(codexCounts(codexS(), kind)[0])) return null;
  return (
    <div className={ui2RootClass('u2-cxp')} data-codex-habitat={kind}>
      {h.rows.map((r) => (
        <Words key={r.id} id={r.id} title={r.title}>
          <p>{r.stage ? <span className="u2-cxw-face"><PetPortrait pet={{ kind, stage: r.stage }} size={28} /></span> : null}{r.text}</p>
        </Words>
      ))}
    </div>
  );
}
function Story({ kind }) {
  const s = monsterStory(kind);
  if (!s || !codexMet(codexCounts(codexS(), kind)[0])) return null;
  return (
    <div className={ui2RootClass('u2-cxp')} data-codex-story={kind}>
      <Words id="story" title={say(SAY_CX, 'monsterCodex.factStory')}>{s.story.map((p, i) => <p key={i}>{p}</p>)}</Words>
      {s.elder ? <Words id="elder" title={say(SAY_CX, 'monsterCodex.factElder', { name: s.elder.name })}><p>{s.elder.text}</p></Words> : null}
    </div>
  );
}

/* ── Found from: every monster that drops the item on the page under it ── */
function Found({ itemKey, onSource }) {
  const key = itemKey !== undefined ? itemKey : codexFoundKey();
  const S = codexS();
  const rows = key ? lootSources(key, { ...dropOpts(S), metOf: (k) => codexMet(codexCounts(S, k)[0]) }) : [];
  return (
    <div className={ui2RootClass('u2-cxp')} data-codex-found={key || ''} data-cx-rows={rows.length}>
      <Ui2Facts>
        {rows.map((r) => (
          <Ui2Fact key={r.kind} data-cx-source={r.kind} k={r.name + ' · ' + r.land} v={r.chance}
            onClick={r.met ? () => (onSource ? onSource(r.kind) : openCodexMonster(r.kind)) : undefined} />
        ))}
      </Ui2Facts>
    </div>
  );
}

/* v2.3.6867 (card MN step 8): the same pages for the new menus' panel (menus3/Menus3Codex.jsx), which
   hands each its monster and its own openers (a door, a row, a source: pages of the panel, its one
   Back); without them each is today's frame page, unchanged */
export { Showcase as CodexShowcase, Combat as CodexCombat, Loot as CodexLoot, Habitat as CodexHabitat, Story as CodexStory, Found as CodexFound };

/** The Codex's frame pages (PANELS codexMonster ... codexFound). */
export function CodexDoorPage() {
  /* one component draws all six rows, and the dashboard draws the top's
     component in one place: so the page is read from the top each draw, and
     each visit (its entry's own key) is a page of its own -- a door's page
     never keeps the showcase's state, nor the showcase's strips */
  const top = codexTop();
  useClock(() => revOf(codexS()), 500);
  if (!top || (top.id !== 'codexFound' && !top.kind)) {
    return <div className={ui2RootClass('u2-cxp')} data-codex-gone=""><Ui2Empty title={say(SAY, 'codexPages.emptyTitle')} /></div>;
  }
  const k = top.key;
  switch (top.id) {
    case 'codexMonster': return <Showcase key={k} kind={top.kind} />;
    case 'codexCombat': return <Combat key={k} kind={top.kind} />;
    case 'codexLoot': return <Loot key={k} top={top} />;
    case 'codexHabitat': return <Habitat key={k} kind={top.kind} />;
    case 'codexStory': return <Story key={k} kind={top.kind} />;
    default: return <Found key={k} />;
  }
}
