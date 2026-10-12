import React, { useEffect, useState } from 'react';
import { COL, getState } from './common.js';
import { PetPortrait } from '@/ui/petPortrait.jsx';
import { CODEX_KINDS, CODEX_ENTRIES, CODEX_ELEMENTS, CODEX_TIERS, CODEX_STAGE2_AT, codexFactsAt, codexNextFact, CODEX_FACT_WORDS } from '@/data/monsterCodex.js';
import { codexCounts, codexFresh, codexSeen, codexLive } from '@/game/monsterCodex.js';
import { landLook } from '@/data/wheelLands.js';
import { ZONES } from '@/data/zones.js';
import { landLevelsText } from '@/data/wheelSignposts.js';
import { CodexStage } from './CodexStage.jsx';
import { codexDropsFor, CODEX_GRADE_ODDS, codexOneIn } from '@/data/codexDrops.js';   /* v2.3.3153: its drop table */

/* ═══ v2.3.3153: THE CODEX'S MONSTERS ═══
 *
 * Owner, 2026-10-12: "Begin working on the monster section of the codex.
 * After you kill a monster you learn more about it, what it does, where it's
 * from, elemental type, special attack, (make up a backstory) etc. it'll be
 * another dashboard section that just displays information."
 *
 * More -> Codex -> Monsters (the tab that was "Bestiary", which read a list
 * nothing wrote).  A card for each of the Wheel's nine kinds, its shape alone
 * until you have killed one; a tap opens its page, where each fact opens at a
 * number of kills (data/monsterCodex.js CODEX_TIERS) the worker counted
 * (server/src/codex.js, game/monsterCodex.js), and its stage plays it
 * (CodexStage.jsx).  It only displays: nothing here sends anything. */

const STAGE_WORDS = { page: 'what it does', element: 'its element', special: 'its special attack', story: 'its story' };

function landName(home) {
  return (ZONES[home] && ZONES[home].name) || home;
}

function Bar({ frac, color }) {
  return (
    <div style={{ height: 5, borderRadius: 3, background: COL.well, overflow: 'hidden' }}>
      <div style={{ width: Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%', height: '100%', borderRadius: 3, background: color || COL.accent }} />
    </div>
  );
}

/* how far to the next fact: { words, frac } */
function nextWords(n) {
  const nx = codexNextFact(n);
  if (!nx) return { words: 'All learned', frac: 1 };
  const prevAt = Object.values(CODEX_TIERS).filter((t) => t < nx.at).pop() || 0;
  const frac = (n - prevAt) / Math.max(1, nx.at - prevAt);
  return { words: nx.left + ' more for ' + STAGE_WORDS[nx.fact], frac };
}

function Card({ kind, n, n2, fresh, onOpen }) {
  const e = CODEX_ENTRIES[kind];
  const known = n >= CODEX_TIERS.page;
  const look = landLook(e.home);
  const nx = nextWords(n);
  return (
    <button onClick={() => onOpen(kind)} data-cx-card={kind} data-cx-known={known ? 1 : 0} data-cx-fresh={fresh ? 1 : 0}
      style={{ position: 'relative', background: known ? COL.slot : COL.well, border: '1px solid ' + COL.border,
        borderTop: '3px solid ' + ((look && look.color) || COL.border), borderRadius: 10, padding: '6px 5px 7px',
        textAlign: 'center', minWidth: 0, minHeight: 44, fontFamily: 'inherit', color: COL.text, cursor: 'pointer', touchAction: 'manipulation' }}>
      {fresh ? <span style={{ position: 'absolute', top: 4, right: 4, padding: '0 5px', borderRadius: 999, background: '#2E7D6F', color: '#E9FFF8', fontSize: 9, fontWeight: 900, letterSpacing: '.06em' }}>NEW</span> : null}
      <div style={{ display: 'grid', placeItems: 'center', height: 44 }}>
        <PetPortrait pet={{ kind, stage: 1 }} size={44} shadow={!known} />
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.15, marginTop: 2, color: known ? COL.text : COL.text2, minHeight: 27,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{known ? e.name : '???'}</div>
      <div style={{ fontSize: 9.5, color: COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{landName(e.home)}</div>
      <div style={{ fontSize: 10.5, fontWeight: 800, margin: '3px 0 3px', color: known ? '#7EE0A8' : COL.muted, fontVariantNumeric: 'tabular-nums' }}>
        {known ? n + ' defeated' : 'Not met yet'}
      </div>
      <Bar frac={nx.frac} color={look && look.color} />
      {n2 >= CODEX_STAGE2_AT ? <div style={{ fontSize: 9.5, fontWeight: 800, color: '#EAC675', marginTop: 3 }}>Elder form seen</div> : null}
    </button>
  );
}

function Fact({ fact, open, n, title, children }) {
  const left = Math.max(0, CODEX_TIERS[fact] - n);
  return (
    <div data-cx-fact={fact} data-cx-open={open ? 1 : 0}
      style={{ background: open ? COL.raised : COL.well, border: '1px solid ' + COL.border, borderRadius: 10, padding: '8px 10px', marginTop: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase', color: open ? COL.accent : COL.muted, marginBottom: open ? 4 : 0 }}>
        {open ? title : '🔒 ' + title}
      </div>
      {open ? children : (
        <div style={{ fontSize: 12, color: COL.muted, marginTop: 2 }}>Defeat {left} more to learn {CODEX_FACT_WORDS[fact]}.</div>
      )}
    </div>
  );
}

/* ═══ v2.3.3153: ITS DROP TABLE ═══
   Owner, 2026-10-12: "Also include drop tables for all items that monster can
   drop."  Every row the worker's own roll (data/codexDrops.js, held to it by
   mirror-audit), most often first, with its page at the first kill -- what
   it drops is part of what it is. */
function DropTable({ kind }) {
  const rows = codexDropsFor(kind) || [];
  return (
    <div data-cx-drops={kind} data-cx-drop-count={rows.length}
      style={{ background: COL.raised, border: '1px solid ' + COL.border, borderRadius: 10, padding: '8px 10px 6px', marginTop: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase', color: COL.accent, marginBottom: 2 }}>Drops</div>
      {rows.map((r, i) => (
        <div key={r.id} data-cx-drop={r.id} data-cx-who={r.who}
          style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 40, padding: '5px 0', borderTop: i ? '1px solid ' + COL.divider : 'none' }}>
          <img src={r.icon} alt="" draggable={false} style={{ width: 28, height: 28, objectFit: 'contain', flex: 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: r.color || COL.text }}>
              {r.name}{r.graded ? <span style={{ color: '#EAC675', marginLeft: 4 }} aria-label="rolls a grade">★</span> : null}
            </div>
            {r.note ? <div style={{ fontSize: 11, lineHeight: 1.35, color: COL.text2, marginTop: 1 }}>{r.note}</div> : null}
          </div>
          <div style={{ flex: 'none', textAlign: 'right', maxWidth: 104 }}>
            <div data-cx-odds style={{ fontSize: 13, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.odds}</div>
            {r.sub ? <div style={{ fontSize: 10.5, color: COL.muted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.sub}</div> : null}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11, lineHeight: 1.4, color: COL.muted, borderTop: '1px solid ' + COL.divider, paddingTop: 6, marginTop: 2 }}>
        <span style={{ color: '#EAC675' }}>★</span> Rolls its grade as it drops: Rare {codexOneIn(CODEX_GRADE_ODDS.rare)}, Elite {codexOneIn(CODEX_GRADE_ODDS.elite)},
        Godly {codexOneIn(CODEX_GRADE_ODDS.godly)}. Only players who did at least 5% of its damage can loot the pile: they split the gold by damage,
        and everything else on it goes to whoever picks it up first.
      </div>
    </div>
  );
}

function Page({ kind, S, onBack }) {
  const e = CODEX_ENTRIES[kind];
  const [n, n2] = codexCounts(S, kind);
  const facts = codexFactsAt(n, n2);
  const elderOpen = facts.includes('elder');
  const [elder, setElder] = useState(false);
  const look = landLook(e.home);
  const el = CODEX_ELEMENTS[e.element];
  const nx = nextWords(n);
  useEffect(() => { codexSeen(S, kind); }, [kind]);
  const known = n >= CODEX_TIERS.page;
  return (
    <div data-cx-page={kind} data-cx-kills={n}>
      <button onClick={onBack} style={{ minHeight: 40, padding: '0 10px 0 4px', background: 'transparent', border: 'none', color: COL.accent,
        fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation' }}>‹ All monsters</button>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, margin: '2px 2px 6px' }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: known ? COL.text : COL.text2 }} data-cx-name>{known ? (elder && e.elder ? e.elder.name : e.name) : '???'}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#7EE0A8', fontVariantNumeric: 'tabular-nums' }}>{n} defeated</div>
      </div>
      {known ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COL.text2, margin: '0 2px 8px' }}>
            {look && look.icon ? <img src={look.icon} alt="" draggable={false} style={{ width: 18, height: 18, objectFit: 'contain' }} /> : null}
            <span style={{ color: (look && look.color) || COL.text2, fontWeight: 800 }}>{landName(e.home)}</span>
            <span>· {landLevelsText()}</span>
            {e.dungeon ? <span>· also in {e.dungeon}</span> : null}
          </div>
          {elderOpen && e.elder && (
            <div style={{ display: 'flex', gap: 6, margin: '0 2px 8px' }}>
              {[[false, e.name], [true, e.elder.name]].map(([on, nm]) => (
                <button key={String(on)} onClick={() => setElder(on)} data-cx-elder-toggle={on ? 1 : 0}
                  style={{ minHeight: 32, padding: '0 10px', borderRadius: 999, border: '1px solid ' + (elder === on ? COL.accent : COL.border),
                    background: elder === on ? COL.accentFill : 'transparent', color: elder === on ? COL.accent : COL.text2,
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation' }}>{nm}</button>
              ))}
            </div>
          )}
          <CodexStage kind={kind} facts={facts} elder={elder} S={S} />
          <div style={{ margin: '8px 2px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COL.text2, marginBottom: 3 }}>
              <span>{nx.words}</span>
            </div>
            <Bar frac={nx.frac} color={look && look.color} />
          </div>
          <Fact fact="page" open={facts.includes('page')} n={n} title="What it does">
            <div style={{ fontSize: 13, lineHeight: 1.45, color: COL.text }}>{e.what}</div>
          </Fact>
          <DropTable kind={kind} />
          <Fact fact="element" open={facts.includes('element')} n={n} title={'Element · ' + (el ? el.name : '')}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              {el ? <img src={el.icon} alt="" draggable={false} style={{ width: 30, height: 30, objectFit: 'contain', flex: 'none' }} /> : null}
              <div style={{ fontSize: 13, lineHeight: 1.45, color: COL.text }}>
                <b style={{ color: (look && look.color) || COL.text }}>{el ? el.status : ''}.</b> {el ? el.effect : ''}
                <div style={{ fontSize: 11.5, color: COL.text2, marginTop: 4 }}>A pet from {landName(e.home)}, out with you, softens it.</div>
              </div>
            </div>
          </Fact>
          <Fact fact="special" open={facts.includes('special')} n={n} title={'Special attack · ' + e.special.name}>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: COL.text }}>{e.special.text}</div>
            <div style={{ fontSize: 12, lineHeight: 1.4, color: '#B9E4C9', marginTop: 5 }}><b>Tip:</b> {e.special.tip}</div>
          </Fact>
          <Fact fact="story" open={facts.includes('story')} n={n} title="Its story">
            {e.story.map((para, i) => <p key={i} style={{ fontSize: 13, lineHeight: 1.5, color: COL.text, margin: i ? '6px 0 0' : 0 }}>{para}</p>)}
          </Fact>
          {e.elder && (
            <div data-cx-fact="elder" data-cx-open={elderOpen ? 1 : 0}
              style={{ background: elderOpen ? COL.raised : COL.well, border: '1px solid ' + (elderOpen ? 'rgba(234,198,117,.35)' : COL.border), borderRadius: 10, padding: '8px 10px', marginTop: 8 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase', color: elderOpen ? '#EAC675' : COL.muted, marginBottom: elderOpen ? 4 : 0 }}>
                {elderOpen ? 'Elder form · ' + e.elder.name : '🔒 Elder form'}
              </div>
              <div style={{ fontSize: elderOpen ? 13 : 12, lineHeight: 1.45, color: elderOpen ? COL.text : COL.muted }}>
                {elderOpen ? e.elder.text : 'Defeat one past level 20 to see its elder form.'}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
          <div style={{ display: 'grid', placeItems: 'center' }}><PetPortrait pet={{ kind, stage: 1 }} size={96} shadow /></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2, marginTop: 8 }}>Defeat one to start its page.</div>
          <div style={{ fontSize: 12, color: COL.muted, marginTop: 3 }}>It lives in {landName(e.home)}.</div>
        </div>
      )}
    </div>
  );
}

export function MonsterCodex() {
  const [open, setOpen] = useState(null);
  const [, force] = useState(0);
  useEffect(() => {
    let rev = -1;
    const id = setInterval(() => {
      const c = getState()._codex;
      const r = c ? c.rev : -1;
      if (r !== rev) { rev = r; force((v) => v + 1); }
    }, 500);
    return () => clearInterval(id);
  }, []);
  const S = getState();
  const c = S._codex;
  if (open) return <Page kind={open} S={S} onBack={() => setOpen(null)} />;
  const rows = CODEX_KINDS.map((k) => ({ k, counts: codexCounts(S, k), fresh: codexFresh(S, k).length > 0 }));
  const met = rows.filter((r) => r.counts[0] >= CODEX_TIERS.page).length;
  return (
    <div data-cx-grid={met}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '2px 2px 6px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase', color: COL.muted }}>Monsters of the Wheel</div>
        <div style={{ fontSize: 11, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>{met} of {CODEX_KINDS.length} met</div>
      </div>
      {!(c && c.known) && !codexLive(S) ? (
        <div data-cx-note="old" style={{ fontSize: 12, color: COL.muted, margin: '0 2px 8px' }}>The codex starts counting your kills after the next game update.</div>
      ) : null}
      {c && c.unavailable ? (
        <div data-cx-note="unavailable" style={{ fontSize: 12, color: COL.muted, margin: '0 2px 8px' }}>Your codex can't be read right now. It will be back.</div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 5 }}>
        {rows.map((r) => <Card key={r.k} kind={r.k} n={r.counts[0]} n2={r.counts[1]} fresh={r.fresh} onOpen={setOpen} />)}
      </div>
      <div style={{ fontSize: 11, color: COL.muted, lineHeight: 1.4, marginTop: 8 }}>
        Every kill teaches you more: its page at {CODEX_TIERS.page}, its element at {CODEX_TIERS.element}, its special attack at {CODEX_TIERS.special} and its story at {CODEX_TIERS.story}. Kills in a party count for everyone in it.
      </div>
    </div>
  );
}

export default MonsterCodex;
