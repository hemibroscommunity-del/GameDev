/* ═══ v2.3.3456: THE REVIEW, IN CHATGPT-SIZED PACKETS ═══
 *
 * The owner, with the design notes in the bundle: "walk me through the most
 * efficient way for chatGPT to review all of these menus with the rationale
 * and any other notes you want included".
 *
 * Seventy screens and ~37,000 words of notes in one chat make ChatGPT skim,
 * and a picture inside a zip is not a picture it sees.  So capture.mjs writes
 * chatgpt/ -- START-HERE.md and a folder a PACKET: about half a dozen screens
 * that belong together, each as ONE picture with its views side by side, and
 * brief.md: what each screen is for, what the automatic check found on it in
 * each view, the design notes that apply (in full, the ones every screen
 * follows included), how the pictures were taken, and the task with the
 * shape of the answer.  At most MAX_PICTURES pictures, so a packet is one
 * message (ChatGPT takes ten files at a time: nine pictures and the brief).
 *
 * The words are built here, with no imports, so they read the same in a test
 * and in the tool; capture.mjs draws the pictures (makeKit).
 */

export const MAX_PICTURES = 9;

/* in the review's order; a screen states.mjs adds and no packet names lands
   in "Other screens" (packetsFor) until it is placed in one here */
export const PACKETS = [
  { slug: 'door-and-creator', title: 'The door and the character creator',
    screens: ['login-door', 'creator', 'creator-tab-hat', 'creator-tab-skin', 'creator-tab-eyes'] },
  { slug: 'creator-tabs', title: 'The creator\'s other tabs and the drawing editor',
    screens: ['creator-tab-eyewear', 'creator-tab-beard', 'creator-tab-shirt', 'creator-tab-pants', 'creator-tab-shoes', 'creator-paint'] },
  { slug: 'arriving-and-the-world', title: 'Arriving, the world screen and talking to Mayor Bro',
    screens: ['welcome', 'desktop-window', 'hud', 'hud-band', 'hud-controls', 'near-mayor', 'mayor-dialogue', 'quest-offer', 'quest-accepted'] },
  { slug: 'dashboard-character-bag', title: 'Dashboard: your character, your quests and the bag',
    screens: ['dash-hero', 'dash-hero-points', 'dash-quests', 'dash-quest-detail', 'dash-bag', 'item-card'] },
  { slug: 'dashboard-skills-codex', title: 'Dashboard: life skills, the Codex and More',
    screens: ['dash-skills', 'dash-skill-detail', 'dash-encyclopedia', 'dash-codex-monster', 'dash-more'] },
  { slug: 'dashboard-more-pages', title: 'Dashboard: More\'s pages',
    screens: ['more-settings', 'more-pets', 'more-leaderboard', 'more-social', 'more-journey', 'more-account', 'more-about', 'more-feedback'] },
  { slug: 'doors-and-crafts', title: 'Building doors and the craft buildings',
    screens: ['near-door', 'building-forge', 'building-woodwork', 'building-gemcut', 'building-enchant', 'building-cook'] },
  { slug: 'games-farm-money', title: 'The Gambling Den, the farm and the money buildings',
    screens: ['building-gamble', 'daily-rewards', 'building-farm', 'building-farmhome', 'building-bank', 'building-exchange', 'building-auctionhouse'] },
  { slug: 'townsfolk-and-halls', title: 'Diego, Ace and the halls',
    screens: ['shop-diego', 'ace-flip', 'building-party', 'building-post', 'building-sheriff', 'building-guildhall', 'building-townhall', 'building-arena'] },
  { slug: 'maps-chat-players', title: 'The maps, chat and other players',
    screens: ['world-map', 'chat', 'player-list', 'player-card', 'inspect-self', 'trade-request', 'duel-request'] },
  { slug: 'harvesting-and-fighting', title: 'Harvesting and fighting',
    screens: ['harvest-near', 'harvest-windup', 'harvest-ready', 'spar-fight'] },
];

/* the views as the briefs name them, in the order a picture shows them */
export const VIEW_NAMES = {
  portrait: 'Phone, upright',
  desktop: 'Computer',
  laptop: 'Laptop',
  tablet: 'Tablet',
  landscape: 'Phone, sideways',
};

/* what is pasted with every packet: the brief carries the rest */
export const PROMPT = 'Please review these screens exactly as brief.md describes.';

/* the packets with the screens this run has, in order, and any screen no
   packet names in "Other screens" packets of MAX_PICTURES; numbered 01.. */
export function packetsFor(ids) {
  const have = new Set(ids);
  const placed = new Set();
  const out = [];
  for (const p of PACKETS) {
    const screens = p.screens.filter((id) => have.has(id));
    for (const id of screens) placed.add(id);
    if (screens.length) out.push({ ...p, screens });
  }
  const rest = ids.filter((id) => !placed.has(id));
  for (let i = 0; i < rest.length; i += MAX_PICTURES) {
    out.push({ slug: 'other-screens', title: 'Other screens', screens: rest.slice(i, i + MAX_PICTURES) });
  }
  return out.map((p, i) => ({ ...p, n: i + 1, dir: `${String(i + 1).padStart(2, '0')}-${p.slug}` }));
}

/* a `## ` section of the notes by its title, heading included */
export function sectionOf(notesText, title) {
  const lines = String(notesText || '').split('\n');
  const start = lines.findIndex((l) => l.trim() === '## ' + title);
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^## /.test(lines[i])) { end = i; break; }
  return lines.slice(start, end).join('\n').trim();
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* one view's check, in a line or a few: the controls with something found
   ('tight' -- merely close to a neighbour -- left out, as FINDINGS does) */
function checkLines(row) {
  if (!row) return ['not taken in this view'];
  if (row.skipped) return ['not taken in this view: ' + row.skipped];
  const cs = row.controls || [];
  const bad = cs.filter((c) => (c.issues || []).some((i) => i.kind !== 'tight'));
  if (!cs.length) return ['no page controls (everything here is drawn in the game world)'];
  if (!bad.length) return [`${plural(cs.length, 'control', 'controls')}, nothing found`];
  const shown = bad.slice(0, 8).map((c) => {
    const what = c.issues.filter((i) => i.kind !== 'tight').map((i) => i.text).join('; ');
    return `"${c.name}" (${c.w}x${c.h}): ${what}`;
  });
  if (bad.length > shown.length) shown.push(`and ${bad.length - shown.length} more`);
  return [`${plural(cs.length, 'control', 'controls')}, ${bad.length} with something found:`, ...shown.map((t) => '  - ' + t)];
}

/* brief.md for one packet.
   rowsById: id -> { view -> row } (a row as manifest.json has it, with
   `notes`, the titles of its design-notes sections); views: the run's views
   in order; notes: { text, topics } (notes.mjs readNotes); general: the
   titles of the sections every screen follows; pics: id -> picture file. */
export function briefFor(packet, { rowsById, views, notes, general, meta, pics }) {
  const B = [];
  const first = (id) => views.map((v) => rowsById[id] && rowsById[id][v]).find(Boolean);
  B.push(`# BroTown UI review, packet ${packet.n}: ${packet.title}`, '');
  B.push(`${plural(packet.screens.length, 'screen', 'screens')}, each in one picture with its views side by side. `
    + `Pictures taken ${meta.made} from game version ${meta.game}.`, '');

  B.push('## Your task', '');
  B.push('You are reviewing the user interface of BroTown, a multiplayer action RPG played in the browser, mostly on iPhones held upright. '
    + 'Its owner is a solo developer who is new to coding; an AI builds the game from the owner\'s decisions. '
    + 'Be concrete and practical: every suggestion should be something that can be changed tomorrow.', '');
  B.push('For each screen in this packet:', '');
  B.push('1. Read its design notes first (in this file, below the screens). They are the owner\'s decisions and the reasons for them. '
    + 'Do not suggest anything a note\'s "Please don\'t suggest" rules out, or undo a decision it records. '
    + 'If you think a decision is wrong, say so under "Disagreements" at the end, with your reason, not among the findings.');
  B.push('2. Anything a note lists under "Still open" is known already: don\'t report it as new (you may say how you would solve it, under "Still open, my take").');
  B.push('3. Look for: (a) anything hard to read, find or tap; (b) controls too small, crowded, cut off or overlapping -- '
    + 'the automatic check\'s results are listed per view below: confirm or dismiss them, don\'t just repeat them; '
    + '(c) unclear hierarchy: is the main action obvious, does the eye go to the right place first; '
    + '(d) words: labels or messages that are unclear, too long, inconsistent with other screens, or jargon a new player won\'t know; '
    + '(e) differences between the views that look like mistakes; (f) anything that looks broken.');
  B.push('4. Open a picture up close when you need to read small text: each view is in it at full size.');
  B.push('5. Don\'t suggest new features, a new art style or theme, redrawn art, or general advice ("add tooltips", "improve contrast") '
    + 'without the exact place and the exact change.', '');
  B.push('Answer in this shape:', '');
  B.push('```');
  B.push('### <screen title> (`<screen id>`)');
  B.push('Verdict: <one line>');
  B.push('1. [High|Medium|Low] <view or views> -- <what is wrong> -> <the fix: what, where, how big>');
  B.push('   (at most 6 a screen; "No changes" when nothing is worth changing)');
  B.push('');
  B.push('### Disagreements with the design notes');
  B.push('- <note> -- <the decision> -- <why you would change it>');
  B.push('');
  B.push('### Still open, my take');
  B.push('- <note> -- <the open question> -- <your suggestion>');
  B.push('');
  B.push('### Top 3 for this packet');
  B.push('1. ...');
  B.push('```', '');
  B.push('High: a player cannot do something, or will likely make a mistake. Medium: slows a player down or confuses. Low: polish.', '');

  B.push('## How the pictures were taken', '');
  B.push('- A brand-new test character named **Reviewer**, on a private copy of the game\'s server, with the tutorial skipped. '
    + 'The test setup gave it the gathering tools, 2,500 gold, some goods and a set of armour so the menus have something in them: '
    + 'the bag, the gold and the bell\'s count come from that, not from normal play.');
  B.push('- Other players are stand-ins: a "Rival Bro" who exists only on that screen (a trade request, a duel challenge), '
    + 'or a sparring clone of Reviewer from the owner\'s test panel.');
  B.push('- The views (each picture labels them):');
  for (const v of views) {
    const about = (meta.viewAbout && meta.viewAbout[v]) || '';
    B.push(`  - **${VIEW_NAMES[v] || v}**${about ? ': ' + about : ''}`);
  }
  B.push('- A view a screen does not exist in is missing from its picture (the touch controls have no computer view).', '');

  B.push('## The screens', '');
  packet.screens.forEach((id, i) => {
    const r = first(id);
    if (!r) return;
    B.push(`### ${i + 1}. ${r.title} (\`${id}\`)`, '');
    if (pics && pics[id]) B.push(`Picture: \`${pics[id]}\``, '');
    if (r.about) B.push(r.about, '');
    const own = (r.notes || []).filter((t) => !general.includes(t));
    if (own.length) B.push(`Design notes: ${own.map((t) => `"${t}"`).join(', ')} (below), and the ones every screen follows.`, '');
    B.push('What the automatic check found (it flags controls under 32 px on a touch screen, cut off by the edge, or covered by something else):', '');
    for (const v of views) {
      const lines = checkLines(rowsById[id] && rowsById[id][v]);
      B.push(`- ${VIEW_NAMES[v] || v}: ${lines[0]}`);
      for (const l of lines.slice(1)) B.push(l);
    }
    B.push('');
  });

  /* the notes: the short version, each section of this packet's screens
     once, then the ones every screen follows (long, and the same in every
     brief: last, so the screens' own come first) */
  B.push('## The design notes', '');
  B.push('The owner\'s decisions and their reasons, from the game\'s own records. Quoted words are the owner\'s own.', '');
  const shortVersion = sectionOf(notes.text, 'The short version');
  if (shortVersion) B.push(shortVersion.replace(/^## /, '### '), '');
  const seen = new Set(general);
  for (const id of packet.screens) {
    const r = first(id);
    for (const t of (r && r.notes) || []) {
      if (seen.has(t)) continue;
      seen.add(t);
      const s = sectionOf(notes.text, t);
      if (s) B.push(s.replace(/^## /, '### '), '');
    }
  }
  for (const t of general) {
    const s = sectionOf(notes.text, t);
    if (s) B.push(s.replace(/^## /, '### '), '');
  }
  return B.join('\n').replace(/\n{3,}/g, '\n\n');
}

/* START-HERE.md: the owner's steps */
export function startHere(packets, meta) {
  const S = [];
  S.push('# Reviewing BroTown\'s screens with ChatGPT', '');
  S.push(`${plural(packets.length, 'folder', 'folders')}, one chat each. Each folder has **brief.md** (what every screen in it is for, what the automatic check found, `
    + 'the design notes behind it, and the task) and **one picture a screen**, its views side by side. About 3 minutes of your time a folder.', '');
  S.push(`Pictures taken ${meta.made}, game version ${meta.game}.`, '');
  S.push('## Once', '');
  S.push('1. Unzip this file. (On an iPhone: tap it in the Files app.)');
  S.push('2. In ChatGPT, choose the model that thinks before it answers (the strongest your plan offers): it can open a picture up close to read small text.');
  S.push('3. Optional: make a Project called "BroTown UI review" and start every chat inside it, so they stay together.', '');
  S.push('## For each folder, in order', '');
  S.push('1. Start a NEW chat (one folder a chat: mixing folders makes ChatGPT skim).');
  S.push('2. Attach every file in the folder: brief.md and all its pictures (10 files at most).');
  S.push('3. Paste this and send:', '');
  S.push('   > ' + PROMPT, '');
  S.push('4. Copy the whole answer into one running note, under the folder\'s name.', '');
  S.push('The folders:', '');
  for (const p of packets) S.push(`- \`${p.dir}\`: ${p.title} (${plural(p.screens.length, 'screen', 'screens')})`);
  S.push('', '## Then', '');
  S.push('Paste the answers back to Claude in the session this came from. Claude checks each finding against the game\'s code and these notes, '
    + 'drops repeats and anything that goes against your decisions (unless you want to change one), and turns the rest into fixes.', '');
  S.push('## If something goes wrong', '');
  S.push('- ChatGPT says it cannot read something small: reply "Open the picture up close and read it."');
  S.push('- It suggests something a note rules out: reply "That goes against the design notes; leave it out."');
  S.push('- ChatGPT\'s free plan limits how many pictures you can upload a day: if it stops you, carry on the next day (a paid plan does all of them in one sitting).');
  S.push('- Everything else (each view at full size, the numbered versions, every note in one file) is in ui-review-all.zip.');
  return S.join('\n');
}
