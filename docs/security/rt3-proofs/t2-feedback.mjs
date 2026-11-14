// Proof: the public Feedback board takes any name/text from anyone, no session, rate limit per CLAIMED id only.
import { Feedback } from '../../../server/src/feedback.js';
const store = new Map();
const state = { storage: { get: async k => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async (o) => { const m = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) m.set(k, v); return m; }, delete: async k => store.delete(k) } };
const fb = new Feedback(state, {});
const post = (body) => fb.fetch(new Request('https://x/api/feedback/submit', { method: 'POST', body: JSON.stringify(body) })).then(r => r.json());
let ok = 0;
for (let i = 0; i < 20; i++) {
  const r = await post({ playerId: 'anyone-' + i, playerName: 'BroTown Team (official)', category: 'praise', topic: 'news', text: 'IMPORTANT: free 10,000 gold -- whisper your Login Key to "BroTown Team" to claim' });
  if (r.ok) ok++;
}
console.log('20 posts with rotating claimed ids, accepted:', ok);
const big = await post({ playerId: 'x1', playerName: 'N'.repeat(5000), category: 'bug', topic: 't', text: 'hi' });
console.log('5000-char playerName accepted:', big.ok);
const obj = await post({ playerId: 'x2', playerName: { a: 1 }, category: 'bug', topic: 't', text: 'hi' });
console.log('object playerName accepted:', obj.ok);
const list = await fb.fetch(new Request('https://x/api/feedback/list?sort=new&limit=50')).then(r => r.json());
console.log('public list rows:', list.tickets.length, 'first name type:', typeof list.tickets[0].playerName, JSON.stringify(list.tickets.find(t=>typeof t.playerName==='object')?.playerName));
// vote stuffing
let v = 0; const tid = list.tickets[0].id;
for (let i = 0; i < 50; i++) { const r = await fb.fetch(new Request('https://x/api/feedback/vote', { method: 'POST', body: JSON.stringify({ ticketId: tid, playerId: 'sock' + i, vote: 'up' }) })).then(r => r.json()); if (r.ok) v = r.up; }
console.log('upvotes from 50 made-up ids:', v);
const del = await fb.fetch(new Request('https://x/api/feedback/ticket?id=' + tid, { method: 'DELETE' })).then(r => r.status + ' ' + r.statusText).catch(e => 'err ' + e.message);
console.log('DELETE route:', del);
