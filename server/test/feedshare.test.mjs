/* ═══ v2.3.5706: THE FEEDBACK BOARD KEEPS ITS HOUR FOR HONEST POSTS (card SEC PR 7) ═══
 * (server/src/feedback.js "THE HOUR, SHARED"; docs/specs/feedback-guard.md)
 *
 *   1. Each kind has its SHARE of the hour (posts 30, votes 45, crash reports
 *      60: 300 rows): a flood of votes from many addresses stops at the vote
 *      share, and an honest crash report and a bug report still land beside
 *      it (the one shared budget let one kind shut out the others).
 *   2. One address cannot use more than its kind's share: it is held to
 *      SHARE_ADDR, well under it (votes, crash reports: the sitting 38
 *      review's probe, one address's 30 votes or 30 crash reports shut the
 *      kind for everyone), and an honest one from another address lands.
 *      Its count is in the hour's row: a new object over the same storage (a
 *      wake, a deploy) still refuses it.  No new row.
 *   3. A vote on a ticket that does not exist counts nothing (it was counted
 *      before the ticket was looked for).
 *   4. The crash feed: 200 junk reports from 200 addresses leave a real one
 *      readable; the feed is cut by its bytes (a full one drops its oldest
 *      half); the owner's sweep with `?trim=1` clears it, and a plain sweep
 *      (the Test panel's, whose words say posts and pace rows) keeps it.
 *   5. The list: its answer kept 30 s (a second ask reads nothing), a write
 *      here clears it at once; only the newest 500 tickets served; the
 *      owner's sweep with `?trim=1` takes away the ones older than those (a
 *      plain sweep keeps them).
 *   6. The text goes through the name's cleaner: no direction or zero-width
 *      characters kept or served.
 *   7. `feedbackshare: false` (the room's flags): the old way -- and thrown
 *      while a share is FULL it releases it (the switch is read before the
 *      share, not only after a write the share let through).
 *
 * BREAK PROOF (rule 8), tried by hand: main's feedback.js -> FAIL 1 to 6.
 * Not a phone test: node, the object on a storage in memory. */
import { Feedback, FEEDBACK_PACE } from '../src/feedback.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
let NOW = Date.UTC(2026, 10, 17, 12, 0, 0);
Date.now = () => NOW;
const SHARE = FEEDBACK_PACE.SHARE || { posts: 60, votes: 30, crash: 30 };
const SHARE_ADDR = FEEDBACK_PACE.SHARE_ADDR || { posts: 5, votes: 60, crash: 30 };
const LIST_NEWEST = FEEDBACK_PACE.LIST_NEWEST || 500;

function makeState() {
  const store = new Map();
  const st = {
    _store: store, lists: 0,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        if (opts && opts.prefix === 'ticket:') st.lists++;
        const out = new Map();
        const keys = [...store.keys()].filter((k) => (!opts?.prefix || k.startsWith(opts.prefix)) && (opts?.startAfter === undefined || k > opts.startAfter)).sort();
        for (const k of keys) { if (opts?.limit && out.size >= opts.limit) break; out.set(k, store.get(k)); }
        return out;
      },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) store.delete(x); },
    },
  };
  return st;
}
const owner = (flags) => ({ ADMIN_KEY: 'kfs', GAME_ROOM: { idFromName: (x) => x, get: () => ({ fetch: async (r) => {
  const ok = r.headers.get('Authorization') === 'Bearer kfs';
  return new Response(JSON.stringify(ok ? { ok: true, flags: flags || {} } : { ok: false }), { status: ok ? 200 : 404 });
} }) } });
function board(st, env) {
  const fb = new Feedback(st, env || {});
  const H = (ip) => (ip ? { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip } : { 'Content-Type': 'application/json' });
  const call = (path, init) => fb.fetch(new Request('https://x/api/feedback' + path, init)).then((r) => r.json());
  let n = 0;
  return {
    fb,
    post: (ip, extra) => call('/submit', { method: 'POST', headers: H(ip), body: JSON.stringify({ playerId: 'bp_fs' + (n++), playerName: 'Pat', category: 'bug', topic: 'ui', text: 'the bank door is stuck', ...(extra || {}) }) }),
    vote: (ip, ticketId, id) => call('/vote', { method: 'POST', headers: H(ip), body: JSON.stringify({ ticketId, playerId: id || ('bp_v' + (n++)), vote: 'up' }) }),
    crash: (ip, extra) => call('/crash', { method: 'POST', headers: H(ip), body: JSON.stringify({ sid: 's' + (n++), log: [{ kind: 'x', msg: 'junk' }], ...(extra || {}) }) }),
    list: (q) => call('/list?' + (q || 'sort=new&limit=50'), {}),
    sweep: (q) => fb.fetch(new Request('https://x/api/feedback/sweep' + (q || ''), { method: 'DELETE', headers: { Authorization: 'Bearer kfs' } })).then((r) => r.json()),
  };
}
const ip = (i) => '198.51.100.' + (i % 250) + '.' + i;

/* 1. the shares */
{
  const st = makeState();
  const B = board(st);
  const t = await B.post('203.0.113.1');
  let votes = 0;
  for (let i = 0; i < 200; i++) { const r = await B.vote(ip(i), t.ticket.id); if (r.ok) votes++; }
  check('1. a flood of votes from 200 addresses stops at the vote share (' + SHARE.votes + ')', votes === SHARE.votes, votes);
  const crash = await B.crash('203.0.113.2');
  const bug = await B.post('203.0.113.3');
  check('1. ...and an honest crash report and a bug report still land beside it', crash.ok === true && bug.ok === true, { crash, bug });
  let posts = 2;
  for (let i = 0; i < 100; i++) { const r = await B.post(ip(1000 + i)); if (r.ok) posts++; }
  check('1. posts stop at their share (' + SHARE.posts + ')', posts === SHARE.posts, posts);
  let crashes = 1;
  for (let i = 0; i < 100; i++) { const r = await B.crash(ip(2000 + i)); if (r.ok) crashes++; }
  check('1. crash reports stop at theirs (' + SHARE.crash + ')', crashes === SHARE.crash, crashes);
  const row = await st.storage.get(FEEDBACK_PACE.ROWS_KEY);
  check('1. the shares are counted in the hour\'s own row (no new row), at most ' + FEEDBACK_PACE.ROWS_HOUR + ' rows', !!row && row.k && row.k.votes === SHARE.votes && row.n <= FEEDBACK_PACE.ROWS_HOUR
    && ![...st._store.keys()].some((k) => /^(rate|crashrate|addr|share):/.test(k)), row && { n: row.n, k: row.k });
}

/* 2. an address's count survives a wake */
{
  const st = makeState();
  const A = board(st);
  const mine = [];
  for (let i = 0; i < FEEDBACK_PACE.POSTS_ADDR + 2; i++) mine.push(await A.post('203.0.113.50'));
  check('2. one address posts ' + FEEDBACK_PACE.POSTS_ADDR + ' an hour', mine.filter((r) => r.ok).length === FEEDBACK_PACE.POSTS_ADDR, mine.map((r) => r.ok));
  const woken = board(st);   /* the object rebuilt over the same storage */
  const again = await woken.post('203.0.113.50');
  const other = await woken.post('203.0.113.51');
  check('2. ...and a new object (a wake, a deploy) still refuses it; another address is not refused', again.ok === false && other.ok === true, { again, other });
  NOW += FEEDBACK_PACE.HOUR_MS + 1;
  const later = await woken.post('203.0.113.50');
  check('2. ...until the hour is over', later.ok === true, later);
}
/* 2b. the sitting 38 review's probe: one address against the vote and crash shares */
{
  const st = makeState();
  const B = board(st);
  const t = await B.post('203.0.113.52');
  const one = [];
  for (let i = 0; i < 30; i++) one.push(await B.vote('203.0.113.53', t.ticket.id, 'bp_toggler'));   /* its own vote, toggled */
  check('2. one address toggling its own vote stops at its own ' + SHARE_ADDR.votes + ', well under the share (' + SHARE.votes + ')', one.filter((r) => r.ok).length === SHARE_ADDR.votes && SHARE_ADDR.votes < SHARE.votes, one.map((r) => r.ok));
  const honest = await B.vote('203.0.113.54', t.ticket.id);
  check('2. ...and the next honest vote from another address lands', honest.ok === true, honest);
  const crashes = [];
  for (let i = 0; i < 30; i++) crashes.push(await B.crash('203.0.113.55'));
  check('2. one address\'s crash reports (fresh sids) stop at its own ' + SHARE_ADDR.crash + ', well under the share (' + SHARE.crash + ')', crashes.filter((r) => r.ok).length === SHARE_ADDR.crash && SHARE_ADDR.crash < SHARE.crash, crashes.map((r) => r.ok));
  const real = await B.crash('203.0.113.56', { sid: 'real' });
  check('2. ...and the next real crash report from another address lands', real.ok === true, real);
}

/* 3. a vote on no ticket counts nothing */
{
  const st = makeState();
  const B = board(st);
  await B.post('203.0.113.60');
  const before = await st.storage.get(FEEDBACK_PACE.ROWS_KEY);
  const n0 = before ? before.n : 0;
  const r = [];
  for (let i = 0; i < 40; i++) r.push(await B.vote(ip(3000 + i), 'no-such-ticket-' + i));
  const after = await st.storage.get(FEEDBACK_PACE.ROWS_KEY);
  check('3. 40 votes on tickets that do not exist: each refused, and not one counted (the budget as it was)', r.every((x) => x.ok === false) && after.n === n0 && !(after.k && after.k.votes), { n0, after });
}

/* 4. the crash feed */
{
  const st = makeState();
  const B = board(st, owner());
  const real = await B.crash('203.0.113.70', { sid: 'real', log: [{ kind: 'error', msg: 'TypeError: the real one' }] });
  for (let i = 0; i < 200; i++) await B.crash(ip(4000 + i));
  const feed = JSON.parse(st._store.get('_crashlog'));
  check('4. 200 junk reports from 200 addresses leave the real one readable', real.ok && feed.some((r) => r.sid === 'real'), feed.length);
  /* the bytes: big reports, an hour at a time (the share), the feed stays under its bytes */
  const big = { log: Array.from({ length: 16 }, () => ({ t: 't'.repeat(24), kind: 'k'.repeat(24), msg: 'm'.repeat(300) })), ua: 'u'.repeat(160) };
  for (let h = 0; h < 12; h++) { NOW += FEEDBACK_PACE.HOUR_MS + 1; for (let i = 0; i < SHARE.crash; i++) await B.crash(ip(5000 + h * 100 + i), big); }
  const raw = st._store.get('_crashlog');
  const kept = JSON.parse(raw);
  check('4. the feed is cut by its bytes (' + (FEEDBACK_PACE.CRASH_BYTES || 131072) + '): a full one drops its oldest half, the newest kept', raw.length <= (FEEDBACK_PACE.CRASH_BYTES || 131072) && kept.length > 0 && kept[kept.length - 1].ts === NOW, { bytes: raw.length, n: kept.length });
  const plain = await B.sweep();
  check('4. a plain sweep (the Test panel\'s) keeps the crash feed', plain.ok === true && st._store.has('_crashlog'), plain);
  const sw = await B.sweep('?trim=1');
  check('4. the owner\'s sweep with ?trim=1 clears it', sw.ok === true && !st._store.has('_crashlog'), sw);
}

/* 5. the list */
{
  const st = makeState();
  const B = board(st, owner());
  for (let i = 0; i < 5; i++) await B.post(ip(6000 + i));
  st.lists = 0;
  const a = await B.list();
  const reads = st.lists;
  const b = await B.list();
  check('5. a second ask inside 30 s reads no ticket, and answers the same', reads > 0 && st.lists === reads && a.ok && b.ok && JSON.stringify(a.tickets) === JSON.stringify(b.tickets), { reads, now: st.lists });
  await B.list();
  check('5. ...(a third ask reads nothing either)', st.lists === reads, st.lists);
  const mine = await B.post(ip(6100), { text: 'my own new report' });
  const c = await B.list();
  check('5. a post clears it: the poster sees the post at once', c.tickets.some((x) => x.id === mine.ticket.id), c.total);
  NOW += 30001;
  const before = st.lists;
  await B.list();
  check('5. past 30 s the board is read again', st.lists > before);
  /* the newest LIST_NEWEST */
  const st2 = makeState();
  for (let i = 0; i < LIST_NEWEST + 25; i++) st2._store.set('ticket:t' + String(i).padStart(4, '0'), JSON.stringify({ id: 't' + i, playerName: 'P', category: 'bug', topic: 'ui', text: 'r' + i, up: 0, down: 0, voters: {}, ts: 1000 + i }));
  const B2 = board(st2, owner());
  const l2 = await B2.list('sort=new&limit=50&offset=0');
  check('5. only the newest ' + LIST_NEWEST + ' tickets are served (the oldest 25 not)', l2.total === LIST_NEWEST && l2.tickets[0].text === 'r' + (LIST_NEWEST + 24), { total: l2.total, first: l2.tickets[0] && l2.tickets[0].text });
  const plain2 = await B2.sweep();
  check('5. a plain sweep keeps every ticket', plain2.ok && [...st2._store.keys()].filter((k) => k.startsWith('ticket:')).length === LIST_NEWEST + 25, plain2);
  const sw = await B2.sweep('?trim=1');
  const leftT = [...st2._store.keys()].filter((k) => k.startsWith('ticket:'));
  check('5. the owner\'s sweep with ?trim=1 takes away the tickets older than those (25), and only those', sw.ok && sw.old === 25 && leftT.length === LIST_NEWEST && !st2._store.has('ticket:t0000') && st2._store.has('ticket:t' + String(LIST_NEWEST + 24).padStart(4, '0')), { old: sw.old, left: leftT.length });
}

/* 6. the text */
{
  const st = makeState();
  const B = board(st);
  const r = await B.post('203.0.113.80', { text: 'the ‮bank‬ door​ is ⁦stuck⁩' });
  const kept = JSON.parse(st._store.get('ticket:' + r.ticket.id));
  check('6. no direction or zero-width character is kept', r.ok && !/[​‪-‮⁦-⁩]/.test(kept.text) && kept.text === 'the bank door is stuck', kept.text);
  st._store.set('ticket:old', JSON.stringify({ id: 'old', playerName: 'O', category: 'bug', topic: 'ui', text: 'old‮report', up: 0, down: 0, voters: {}, ts: NOW }));
  B.fb._listKept = null;
  const l = await B.list();
  check('6. ...nor served from a ticket kept before', l.tickets.every((x) => !/[​‪-‮⁦-⁩]/.test(x.text)), l.tickets.map((x) => x.text));
}

/* 7. the switch */
{
  const st = makeState();
  const B = board(st, owner({ feedbackshare: false }));
  await B.fb._boardOpen();
  const t = await B.post('203.0.113.90');
  let votes = 0;
  for (let i = 0; i < 100; i++) { const r = await B.vote(ip(7000 + i), t.ticket.id); if (r.ok) votes++; }
  check('7. feedbackshare: false: votes are not held to a share (the old way: ' + votes + ' taken)', votes > SHARE.votes, votes);
  const ghost = await B.vote('203.0.113.91', 'no-such');
  const row = await st.storage.get(FEEDBACK_PACE.ROWS_KEY);
  check('7. ...a vote on no ticket is counted before the look, as before', ghost.ok === false && row && !row.k, row);
}

/* 7b. the switch releases a full share */
{
  const st = makeState();
  const flags = {};
  const B = board(st, owner(flags));
  const t = await B.post('203.0.113.92');
  for (let i = 0; i < SHARE.votes + 10; i++) await B.vote(ip(7500 + i), t.ticket.id);
  const full = await B.vote('203.0.113.93', t.ticket.id);
  check('7. the vote share full: an honest vote is refused (guard)', full.ok === false, full);
  flags.feedbackshare = false;
  NOW += FEEDBACK_PACE.FLAG_TTL_MS + 1;
  const freed = await B.vote('203.0.113.94', t.ticket.id);
  check('7. feedbackshare: false thrown while it is full: the next vote lands (the switch read before the share)', freed.ok === true && B.fb._shareFlag === false, { freed, flag: B.fb._shareFlag });
  const woken = board(st, owner(flags));
  const again = await woken.vote('203.0.113.95', t.ticket.id);
  check('7. ...and a woken object over the stored counts too', again.ok === true, again);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
