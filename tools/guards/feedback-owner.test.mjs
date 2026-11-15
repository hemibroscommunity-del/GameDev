/* ═══ v2.3.5603: THE TEST PANEL'S FEEDBACK ROWS (card OPS PR 4) ═══
 *
 * src/game/feedbackOwner.js is what the Test panel's feedback rows
 * (src/ui/panels/FeedbackOwnerRows.jsx) say and where they go.  This holds:
 *
 *   1. the routes are the Feedback object's (index.js sends /api/feedback/*
 *      to it): the list is the public one, newest first; the takedown and the
 *      sweep are DELETEs, and where the object already tests their paths
 *      (red team RT-3's #1878) the row's are the same;
 *   2. a post's line says who, about what and the start of it, cut short,
 *      never the whole of a long post, and survives a post with nothing;
 *   3. the sweep's numbers are said in words, every number, a known one by
 *      its name and an unknown one by its own, never dropped; `ok` is not a
 *      number said;
 *   4. a 404 says which it was (no route on this worker, or the key);
 *   5. the panel mounts the rows with its callOwner (the admin key outside
 *      /api/admin), after the Set a switch row.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-15:
 *   1. TICKET '/api/feedback/tickets?id='              -> FAIL 1 (with #1878's object)
 *   2. postLine without its clip of the text            -> FAIL 2
 *   3. sweepWords skipping a number it does not know     -> FAIL 3
 *      (and its names: `tickets` as removed, not left      -> FAIL 3)
 *   4. the `<FeedbackOwnerRows` line out of DevPanel.jsx  -> FAIL 5
 *
 * Run from the repository's root: node tools/guards/feedback-owner.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { FEEDBACK_ROUTES, postLine, sweepWords, notYetWords } from '../../src/game/feedbackOwner.js';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* ── 1. the routes ── */
{
  const idx = readFileSync(join(ROOT, 'server/src/index.js'), 'utf8');
  const fb = readFileSync(join(ROOT, 'server/src/feedback.js'), 'utf8');
  check('1: every route is under /api/feedback, which the worker sends to the Feedback object',
    Object.values(FEEDBACK_ROUTES).every((p) => p.startsWith('/api/feedback/')) && idx.includes("url.pathname.startsWith('/api/feedback')"), FEEDBACK_ROUTES);
  check('1: the list is the public one, newest first, at most the 20 the row shows', /^\/api\/feedback\/list\?sort=new&limit=20$/.test(FEEDBACK_ROUTES.LIST) && fb.includes("path.startsWith('/list')"));
  const has = (p) => fb.includes("path.startsWith('" + p + "')");
  const tick = FEEDBACK_ROUTES.TICKET.replace('/api/feedback', '').replace(/\?.*$/, '');
  const sweep = FEEDBACK_ROUTES.SWEEP.replace('/api/feedback', '');
  check(`1: where the object tests the takedown's path, it is the row's (${tick}: ${has(tick) ? 'on this worker' : 'not on this worker yet, #1878'})`,
    has(tick) || !/DELETE' && path\.startsWith\('\/ticket/.test(fb), tick);
  check(`1: ...and the sweep's (${sweep}: ${has(sweep) ? 'on this worker' : 'not on this worker yet, #1878'})`, has(sweep) || !/\/sweep/.test(fb), sweep);
}

/* ── 2. a post's line ── */
{
  const long = postLine({ playerName: 'Ann', topic: 'Bugs', text: 'x'.repeat(500) });
  check('2: who, about what, and the start of it, cut short', long.startsWith('Ann on Bugs: ') && long.length < 120 && long.endsWith('…'), long);
  check('2: a post with nothing still reads', postLine({}) === 'Bro: ' && postLine(null) === '' && postLine({ playerName: 'B', text: 'hi' }) === 'B: hi', [postLine({}), postLine(null)]);
  check('2: line breaks and runs of spaces read as one space', postLine({ playerName: 'A', text: 'one\n\n two   three' }) === 'A: one two three');
}

/* ── 3. the sweep in words ── */
{
  const w = sweepWords({ ok: true, big: 3, paces: 12, tickets: 40 });
  check('3: the sweep\'s own reply ({ ok, big, paces, tickets }: #1878) in words', w === 'Swept the feedback board: 3 oversized posts removed, 12 old pace rows removed, 40 posts left on the board.', w);
  const u = sweepWords({ ok: true, big: 0, rebuilt: 1 });
  check('3: an unknown number is said by its own name, never dropped', u === 'Swept the feedback board: 0 oversized posts removed, 1 rebuilt.', u);
  check('3: no numbers, still a sentence', sweepWords({ ok: true }) === 'Swept the feedback board.' && sweepWords(null) === 'Swept the feedback board.');
}

/* ── 4. a 404 in words ── */
check('4: a 404 says which (no route on this worker, or the key)', /can't take a post down yet/.test(notYetWords(true, 'take a post down')) && /admin key/.test(notYetWords(false, 'x')));

/* ── 5. the panel mounts them ── */
{
  const panel = readFileSync(join(ROOT, 'src/ui/panels/DevPanel.jsx'), 'utf8');
  const at = panel.indexOf('<FeedbackOwnerRows ');
  const sw = panel.indexOf('<SetSwitchRow ');
  check('5: the Test panel mounts the feedback rows, after Set a switch', at > 0 && sw > 0 && at > sw, { at, sw });
  check('5: ...with callOwner (the admin key outside /api/admin) and call (to tell a 404 apart)', /<FeedbackOwnerRows [^>]*call=\{call\}[^>]*callOwner=\{callOwner\}/.test(panel) && /const callOwner = useCallback/.test(panel));
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
