/* ═══ v2.3.3451: THE DESIGN NOTES, SCREEN BY SCREEN ═══
 *
 * The owner, 2026-10-18, sending the UI review to ChatGPT: "I'd also like it
 * if you had included all of the design rationale behind the iterations I've
 * made in each menu", then "Yes go ahead, and add it to the screenshot tool".
 * A reviewer shown only the pictures suggests what was tried and turned down
 * (a gold road on the ground, the back arrow in the dashboard's button row,
 * potions on Diego's shelf...).
 *
 * docs/UI-DESIGN-NOTES.md holds the reasons, a section ("topic") a part of
 * the game.  A topic is a `## ` heading with a `Screens:` line under it:
 *
 *   ## The bag
 *   Screens: dash-bag, item-card
 *
 * naming the screen ids of states.mjs it covers -- `dash-*` any id starting
 * so, `all` every screen (the look, the views).  A `## ` heading with no
 * Screens line is a general section (the intro, what is decided everywhere).
 * capture.mjs copies the file into every bundle as DESIGN-NOTES.md and names,
 * under each screen, the topics that are about it.  No imports past node's
 * own, so it reads the same in a test, the tool and a session's one-liner.
 */
import { readFileSync, existsSync } from 'node:fs';

export const NOTES_PATH = 'docs/UI-DESIGN-NOTES.md';

/* GitHub's own heading anchor: what `DESIGN-NOTES.md#the-bag` jumps to on
   github.com and in most Markdown viewers (lower case, punctuation gone,
   each space a hyphen) */
export function slugOf(title) {
  return String(title).trim().toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/* every topic of the notes' text: { title, slug, screens: [patterns] } in
   the order written.  The Screens line is looked for in the few lines under
   its heading, before anything else is said. */
export function parseNotes(text) {
  const lines = String(text || '').split('\n');
  const topics = [];
  for (let i = 0; i < lines.length; i++) {
    const h = /^##\s+(.+?)\s*$/.exec(lines[i]);
    if (!h) continue;
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      if (/^#/.test(lines[j])) break;
      const s = /^Screens:\s*(.+?)\s*$/.exec(lines[j]);
      if (!s) continue;
      const screens = s[1].split(',').map((x) => x.trim().replace(/^`|`$/g, '')).filter(Boolean);
      topics.push({ title: h[1], slug: slugOf(h[1]), screens });
      break;
    }
  }
  return topics;
}

const matches = (pat, id) => pat === 'all'
  || (pat.endsWith('*') ? id.startsWith(pat.slice(0, -1)) : pat === id);

/* the topics about one screen: its own first, `all` topics only when asked
   (they are named once, at the top of the README, not under 70 screens) */
export function topicsFor(topics, id, { general = false } = {}) {
  return topics.filter((t) => t.screens.some((p) => (p === 'all' ? general : matches(p, id))));
}

export const generalTopics = (topics) => topics.filter((t) => t.screens.includes('all'));

/* coverage against the screens the review visits: screens no topic names,
   and patterns that name no screen (a screen renamed or gone) */
export function notesCoverage(topics, ids) {
  const bare = ids.filter((id) => !topicsFor(topics, id).length);
  const stale = [];
  for (const t of topics) {
    for (const p of t.screens) {
      if (p !== 'all' && !ids.some((id) => matches(p, id))) stale.push(`${t.title}: ${p}`);
    }
  }
  return { bare, stale };
}

export function readNotes(repo) {
  const file = repo ? `${repo}/${NOTES_PATH}` : NOTES_PATH;
  if (!existsSync(file)) return { file, text: null, topics: [] };
  const text = readFileSync(file, 'utf8');
  return { file, text, topics: parseNotes(text) };
}
