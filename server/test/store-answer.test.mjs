/* ═══ v2.3.4412: THE AUCTION HOUSE'S ANSWER, OR "NOT SURE" ═══
 *
 * The state-machine sweep (2026-11-03, V8a M2-3): the Auction House's post()
 * had no time limit, a lost answer read as a refusal (which unlocks "Put it
 * up": the player lists twice, the v2.3.2507 double listing), and a late
 * answer acted on whichever item card was open by then.
 *
 * The real rules (src/game/storeAnswer.js), run in node:
 *   1. a request that never answers ends after the limit as `unsure`, not a
 *      refusal, and its fetch is aborted;
 *   2. a fetch that throws is `unsure` too (it may have reached the store);
 *   3. the worker's own answers pass through as before (ok, a refusal);
 *   4. cardAnswer: unsure / listed / refused, and `mine` only on the card
 *      that sent it;
 *   5. the item card (src/ui/mobile/dash/ItemDetailPopup.jsx) reads it: an
 *      unsure answer returns BEFORE the lock is released, a late answer
 *      releases nothing on another card, and the words go through deskWords;
 *   6. storeApi.js's post() goes through postWithin.
 */
import { readFileSync } from 'node:fs';
import * as A from '../../src/game/storeAnswer.js';
import { deskWords } from '../../src/game/deskWords.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const fn = (n) => typeof A[n] === 'function';

// ── 1. no answer ends as "not sure" ──
{
  let aborted = false;
  const hang = (u, init) => new Promise((res, rej) => {
    if (init && init.signal) init.signal.addEventListener('abort', () => { aborted = true; rej(new Error('aborted')); });
  });
  const t0 = Date.now();
  const r = fn('postWithin') ? await Promise.race([
    A.postWithin(hang, 'http://x/api/store/list', { method: 'POST' }, 40),
    new Promise((res) => setTimeout(() => res('still waiting'), 1000)),
  ]) : null;
  check('1. a request with no answer ends within its limit', r && r !== 'still waiting' && Date.now() - t0 < 900, r);
  check('1. ...as not sure, never a plain refusal', !!(r && r.ok === false && r.unsure === true), r);
  check('1. ...and the fetch is aborted', aborted);
  /* a fetch that ignores its signal still ends the wait */
  const deaf = () => new Promise(() => {});
  const r2 = fn('postWithin') ? await Promise.race([
    A.postWithin(deaf, 'u', {}, 40), new Promise((res) => setTimeout(() => res('still waiting'), 1000)),
  ]) : null;
  check('1. a fetch deaf to its signal still ends as not sure', !!(r2 && r2.unsure === true), r2);
  check('1. the default limit is set and sane (5-60 s)', A.STORE_POST_LIMIT_MS >= 5000 && A.STORE_POST_LIMIT_MS <= 60000, A.STORE_POST_LIMIT_MS);
}

// ── 2. a fetch that fails is not sure either ──
{
  const boom = async () => { throw new Error('network'); };
  const r = fn('postWithin') ? await A.postWithin(boom, 'u', {}, 1000) : null;
  check('2. a failed fetch is not sure (it may have reached the store)', !!(r && r.ok === false && r.unsure === true), r);
  const badJson = async () => ({ json: async () => { throw new Error('cut off'); } });
  const r2 = fn('postWithin') ? await A.postWithin(badJson, 'u', {}, 1000) : null;
  check('2. an answer cut off mid-way is not sure', !!(r2 && r2.unsure === true), r2);
}

// ── 3. the worker's own answers pass through ──
{
  const say = (body) => async () => ({ json: async () => body });
  const ok = fn('postWithin') ? await A.postWithin(say({ ok: true, listing: { id: 'L1' } }), 'u', {}, 1000) : null;
  check('3. an ok passes through', !!(ok && ok.ok === true && ok.listing.id === 'L1' && !ok.unsure), ok);
  const no = fn('postWithin') ? await A.postWithin(say({ ok: false, error: 'Max 10 listings' }), 'u', {}, 1000) : null;
  check('3. a refusal passes through as a refusal', !!(no && no.ok === false && !no.unsure && no.error === 'Max 10 listings'), no);
}

// ── 4. what the answer does to its card ──
{
  const c = (r, s, n) => (fn('cardAnswer') ? A.cardAnswer(r, s, n) : {});
  check('4. no answer on its own card: unsure, mine', c({ ok: false, unsure: true }, 3, 3).kind === 'unsure' && c({ ok: false, unsure: true }, 3, 3).mine === true);
  check('4. an ok on its own card: listed', c({ ok: true }, 3, 3).kind === 'listed');
  check('4. a refusal: refused', c({ ok: false, error: 'x' }, 3, 3).kind === 'refused');
  check('4. a null answer is a refusal, not an ok', c(null, 3, 3).kind === 'refused');
  check('4. an answer after the card changed is not mine', c({ ok: true }, 3, 4).mine === false && c({ ok: false }, 3, 4).mine === false);
  const words = A.STORE_UNSURE_WORDS || '';
  check('4. the words say not sure and name My Listings', /not sure/i.test(words) && /My Listings/.test(words), words);
  check('4. ...and read "click" on a computer', /\bclick\b/.test(deskWords(words, true)) && !/\btap\b/i.test(deskWords(words, true)), deskWords(words, true));
}

// ── 5. the item card reads it ──
{
  const src = readFileSync(new URL('../../src/ui/mobile/dash/ItemDetailPopup.jsx', import.meta.url), 'utf8');
  const start = src.indexOf('const onSellConfirm');
  const body = src.slice(start, src.indexOf('const onClose', start));
  const iList = body.indexOf('await storeList(');
  const iAns = body.indexOf('cardAnswer(', iList);
  const iUnsure = body.indexOf("'unsure'", iAns);
  const iReturn = body.indexOf('return;', iUnsure);
  const iRelease = body.indexOf('sellInFlight.current = false', iList);
  check('5. the card reads the answer through cardAnswer', iList > 0 && iAns > iList, { iList, iAns });
  check('5. not sure returns BEFORE the lock is released (the card stays locked)', iUnsure > 0 && iReturn > iUnsure && iRelease > iReturn, { iUnsure, iReturn, iRelease });
  const relLine = body.slice(body.lastIndexOf('\n', iRelease - 1), iRelease);
  const guarded = body.slice(iAns, iRelease).includes('if (ans.mine)');
  check('5. the lock is released only on its own card', guarded, relLine);
  check('5. the unsure words go through deskWords', /deskWords\(STORE_UNSURE_WORDS\)/.test(body));
  check('5. the card counts its generations in the reset effect', /sellCard\.current \+= 1/.test(src));
  check('5. the close on success is its own card\'s only', /if \(!ans\.mine\) return;[^\n]*\n[^\n]*\n\s*itemDetailBus\.close\(\)/.test(body));
}

// ── 6. the store's post() has the limit ──
{
  const api = readFileSync(new URL('../../src/ui/storeApi.js', import.meta.url), 'utf8');
  const p = api.slice(api.indexOf('async function post('), api.indexOf('export async function storeBrowse'));
  check('6. storeApi post() goes through postWithin', /postWithin\(/.test(p) && !/catch \(e\) \{\s*return \{ ok: false, error/.test(p), p.slice(0, 200));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
