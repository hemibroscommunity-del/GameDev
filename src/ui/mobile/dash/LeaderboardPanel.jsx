import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { BT_API_BASE } from '@/networking/index.js';

/* v2.3.1671: a TRADITIONAL HISCORES BOARD — one ranking per skill.
   Owner: "a traditional high scores system that ranks each skill... I want
   all of the lifeskills to be added on the high scores too."

   Two things were wrong before this.

   1. THIS PANEL NEVER FETCHED ANYTHING.  It read `S._leaderboard[cat]`, and
      nothing in the entire client ever wrote `S._leaderboard`.  So the panel
      the player actually sees (BottomDashboard mounts THIS one; the desktop
      panel in ui/panels is behind the legacy menu) has been rendering its
      "No leaderboard data yet." empty state permanently.  It now fetches
      /api/leaderboard/top itself, per category, like the old panel did.
   2. THE COLUMNS WERE CLIENT-REPORTED.  Kills, Skills and Gold came out of
      the rpgData blob the client sends, so they were claims, not facts.  The
      categories below read the server's `series` — combat levels from prog3,
      life-skill levels from ps.lifeSkills, kills from svKills — which is the
      same object the on-chain attestation signs.  `ap` and `gold` are gone
      from the chip row for exactly that reason; the legacy endpoints still
      serve them for the old desktop panel. */
const CATS = [
  { id: 'combat',       label: 'Combat' },
  { id: 'melee',        label: 'Melee' },
  { id: 'bow',          label: 'Bow' },
  { id: 'magic',        label: 'Magic' },
  { id: 'kills',        label: 'Kills' },
  { id: 'woodcutting',  label: 'Woodcutting' },
  { id: 'fishing',      label: 'Fishing' },
  { id: 'mining',       label: 'Mining' },
  { id: 'farming',      label: 'Farming' },
  { id: 'cooking',      label: 'Cooking' },
  { id: 'blacksmithing', label: 'Blacksmithing' },
  { id: 'woodworking',  label: 'Woodworking' },
  { id: 'gemCutting',   label: 'Gem Cutting' },
  { id: 'enchanting',   label: 'Enchanting' },
  { id: 'trapping',     label: 'Trapping' },
];

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — category
   buttons become spec chips (32px / pill radius; selected = brass-fill
   #3B3427 + brass label, NOT solid brass: brass is an accent, never a
   slab), rows go to 44px with tabular rank/value columns, and the empty
   state gets the icon-at-.4 treatment.  Category switching and the
   1.5s refresh interval are unchanged. */
/* v2.3.1235: batch-1 rollout — the tappable chip button is now a
   transparent 44px-tall hitbox (contract: every interactive element
   ≥44×44) wrapping the 32px visual pill, so the approved chip look
   survives without an undersized touch target. */
const chipHit = {
  flex: '0 0 auto',
  minHeight: 44,
  padding: 0,
  margin: 0,
  background: 'transparent',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer',
  touchAction: 'manipulation',
};
const chip = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  height: 32,
  padding: '0 12px',
  background: active ? COL.accentFill : 'transparent',
  color: active ? COL.accent : COL.text2,
  border: `1px solid ${active ? COL.accent : COL.border}`,
  borderRadius: 999,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap',
});

export const LeaderboardPanel = () => {
  const [cat, setCat] = useState('combat');
  const [boards, setBoards] = useState(() => Object.create(null));
  const [loading, setLoading] = useState(true);

  /* Fetch per category, cache per category, refresh on a slow timer.  A
     hiscores page is not a live readout — the server's own report throttle
     means a row changes at most once a minute — so 20s is generous and 1.5s
     (what the old force-rerender interval used) would have been fifteen
     wasted requests per minute per open panel.
     `boards` is Object.create(null): the keys are category ids that ride in
     from a fetch response, and a plain {} silently no-ops on '__proto__'
     (CLAUDE.md — three incidents in one day). */
  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(BT_API_BASE + '/api/leaderboard/top?category=' + encodeURIComponent(cat) + '&limit=50')
        .then(r => r.json())
        .then(d => {
          if (!alive || !d || !d.ok) return;
          setBoards(prev => { const next = Object.create(null); Object.assign(next, prev); next[cat] = d.results || []; return next; });
        })
        .catch(() => {})
        .finally(() => { if (alive) setLoading(false); });
    };
    setLoading(!boards[cat]);
    load();
    const id = setInterval(load, 20000);
    return () => { alive = false; clearInterval(id); };
  }, [cat]);

  const S = getState();
  const meId = S && S.myId;
  const board = boards[cat] || [];

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, overflowX: 'auto', padding: '2px 0' }}>
        {CATS.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)} style={chipHit}>
            <span style={chip(c.id === cat)}>{c.label}</span>
          </button>
        ))}
      </div>
      {board.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          {/* v2.3.1235: batch-1 rollout — empty-state contract: icon ≤40px,
              message 13/700 secondary (was 44px icon + 13/400 muted). */}
          <img src="/icons/ui/leaderboard.webp" alt="" draggable={false}
            style={{ width: 40, height: 40, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* v2.3.1233: img{display:block} in game.css defeats textAlign centering */ }}
            onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('🏆')); }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2, marginTop: 6 }}>
            {loading ? 'Loading…' : 'Nobody has trained this yet.'}
          </div>
        </div>
      ) : board.slice(0, 30).map((r, i) => (
        <div key={r.id || i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          padding: '0 8px',
          borderBottom: `1px solid ${COL.divider}`,
          /* Finding yourself on a fifty-row board is the whole reason to open
             it; without this you scan every name. */
          background: (meId && r.id === meId) ? COL.accentFill : 'transparent',
        }}>
          {/* v2.3.1235: batch-1 rollout — contract allows rank as a key
              number (16/700 tabular, brass text for top-3 only — never a
              filled gold row); name drops to body 13, value goes to the
              16/700 key-number size (was 12/600 rank + 13.5 name + 14 value). */}
          <span style={{
            width: 36, flex: '0 0 auto', fontSize: 16, fontWeight: 700,
            color: i < 3 ? COL.accent : COL.muted, fontVariantNumeric: 'tabular-nums',
          }}>#{i + 1}</span>
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13, color: COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{r.name || r.id}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>
            {r.value ?? r.score ?? '-'}
          </span>
        </div>
      ))}
    </div>
  );
};
