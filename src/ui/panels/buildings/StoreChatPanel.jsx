import React, { useEffect, useRef, useState } from 'react';
import { storeChatBus } from '@/ui/mobile/storeChatBus.js';
import { PlayerIcon } from '@/ui/PlayerIcon.jsx';
import { thumbFor, iconFor } from '@/ui/mobile/dash/InventoryPanel.jsx';

/* === StoreChatPanel — "CHAT WITH MARVIN" ========================= v2.3.2621
 *
 * The owner's second mockup, drawn as it is drawn: the item as a header with
 * its price and the listing's own expiry, the bubbles, three canned replies,
 * and a composer that counts to 200.
 *
 * IT COMPUTES NOTHING IT COULD BE WRONG ABOUT, the same posture StorePanel
 * takes: the item, the price, the expiry, every name and every line of text
 * come out of the worker's `store_dm_thread`. The panel does not keep its own
 * copy of the listing and cannot disagree with the shelf about what is being
 * haggled over.
 *
 * THE MOCKUP SHOWS ONE THREAD; A SELLER HAS N. One listing can be asked about
 * by several buyers, so when the reader IS the seller this grows a row of
 * name chips and shows one conversation at a time. A buyer never sees that
 * row -- they have exactly one conversation and it is theirs.
 *
 * The 200 is enforced on the SERVER (storechat.js `_scText`); `maxLength`
 * here is a courtesy so the counter and the button agree with what will
 * actually be accepted.
 */

const LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)', onBrass: '#172126',
  mine: '#2B4C7E', bad: '#D95C54',
};
const WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };

export const TEXT_MAX = 200;
/* The three the mockup draws. Mirrored from STORE_CHAT_QUICK
   (server/src/storechat.js) — they travel as ordinary text through the same
   clamp and the same moderation as anything typed. */
export const QUICK = ['Still available?', 'Would you take less?', 'I have a question'];

function timeLeft(expiresAt) {
  const ms = (Number(expiresAt) || 0) - Date.now();
  if (!(ms > 0)) return 'expired';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return 'in ' + mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return 'in ' + hrs + 'h';
  return 'in ' + Math.floor(hrs / 24) + 'd';
}

function clock(ts) {
  try {
    const d = new Date(Number(ts) || 0);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  } catch (e) { return ''; }
}

function itemArt(item) {
  const key = (item && item.invKey) || '';
  const src = thumbFor(key);
  if (src) return <img src={src} alt="" draggable={false} style={{ width: 30, height: 30, objectFit: 'contain' }} />;
  return <span style={{ fontSize: 20 }}>{iconFor(key)}</span>;
}

export function StoreChatPanel({ send, myId }) {
  const [, bump] = useState(0);
  const [text, setText] = useState('');
  const endRef = useRef(null);
  useEffect(() => storeChatBus.subscribe(() => bump((n) => n + 1)), []);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ block: 'end' }); });

  const b = storeChatBus;
  if (!b.open) return null;
  const head = b.head || {};
  const item = head.item || {};
  const amSeller = !!head.amSeller;
  const thread = b.threads.find((t) => t.buyerId === b.activeBuyer) || b.threads[0] || null;
  const msgs = (thread && thread.msgs) || [];

  const post = (t) => {
    const clean = String(t || '').slice(0, TEXT_MAX).trim();
    if (!clean) return;
    send('store_dm', amSeller
      ? { listingId: b.listingId, to: b.activeBuyer, text: clean }
      : { listingId: b.listingId, text: clean });
    setText('');
  };

  return (
    <div style={WRAP} data-store-chat>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border }}>
        <span style={{ fontSize: 20 }} aria-hidden="true">{'\u{1F4AC}'}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: LS.txt1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {amSeller ? 'Your listing' : 'Chat with ' + (head.sellerName || 'the seller')}
          </div>
          <div style={{ fontSize: 11, color: LS.txt3, marginTop: 1 }}>Discuss this item directly</div>
        </div>
      </div>

      <div style={{ padding: '10px 12px 12px' }}>
        {/* the item, with its price and its own clock — the mockup's card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', background: LS.raised, border: '1px solid ' + LS.border, borderRadius: 10, marginBottom: 8 }}>
          <div style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 8, background: LS.well, border: '1px solid ' + LS.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {itemArt(item)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: LS.txt1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {/* v2.3.2621: the same prettifying StorePanel's row does, so the
                  header and the shelf call the item by one name. */}
              {(item.name || 'Item').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </div>
            <div style={{ fontSize: 11, color: LS.txt3, marginTop: 1 }}>
              {'\u{1F551} Listing expires ' + timeLeft(head.expiresAt)}
            </div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: LS.brass, fontVariantNumeric: 'tabular-nums' }}>{head.askPrice}g</span>
        </div>

        {/* a seller with several interested buyers picks one */}
        {amSeller && b.threads.length > 1 && (
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 6, marginBottom: 6 }}>
            {b.threads.map((t) => (
              <button key={t.buyerId} type="button" onClick={() => storeChatBus.setActive(t.buyerId)}
                style={{
                  flex: '0 0 auto', minHeight: 32, padding: '0 10px', fontSize: 11, fontWeight: 700,
                  borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                  border: '1px solid ' + (b.activeBuyer === t.buyerId ? LS.brass : LS.border),
                  background: b.activeBuyer === t.buyerId ? LS.brassFill : LS.raised,
                  color: b.activeBuyer === t.buyerId ? LS.brass : LS.txt2,
                  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                }}>{t.buyerName}</button>
            ))}
          </div>
        )}

        {/* bubbles */}
        <div data-chat-log style={{ maxHeight: 190, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {b.loading && <div style={{ fontSize: 12, color: LS.txt3 }}>Opening…</div>}
          {!b.loading && msgs.length === 0 && (
            <div style={{ fontSize: 12, color: LS.txt3, lineHeight: 1.45, padding: '6px 2px' }}>
              {amSeller
                ? 'Nobody has asked about this listing yet.'
                : 'Say hello — the seller sees this next time they are online.'}
            </div>
          )}
          {msgs.map((m, i) => {
            const mine = m.from === myId;
            return (
              <div key={m.ts + ':' + i} style={{ display: 'flex', gap: 7, flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                {/* v2.3.2622: the other side's real bro on their bubbles.
                    `head.sellerLook` is the only look this panel is given, so
                    it is used for the seller's lines and the disc stands in
                    for the buyer's -- a buyer's look is not on this wire and
                    inventing a second lookup for it would be a bigger change
                    than the mockup asks for. */}
                <PlayerIcon
                  name={m.fromName}
                  color={mine ? LS.brass : '#8D9B98'}
                  look={(!mine && m.from === head.sellerId) ? head.sellerLook : null}
                  size={26} />
                <div style={{ minWidth: 0, maxWidth: '76%' }}>
                  <div style={{ fontSize: 10, color: LS.txt3, marginBottom: 2, textAlign: mine ? 'right' : 'left' }}>
                    {mine ? 'You' : m.fromName}
                  </div>
                  <div style={{
                    padding: '7px 10px', borderRadius: 10, fontSize: 12.5, lineHeight: 1.35,
                    color: LS.txt1, background: mine ? LS.mine : LS.raised,
                    border: '1px solid ' + (mine ? 'transparent' : LS.border),
                    wordBreak: 'break-word',
                  }}>{m.text}</div>
                  <div style={{ fontSize: 10, color: LS.txt3, marginTop: 2, textAlign: mine ? 'right' : 'left' }}>{clock(m.ts)}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {b.err && <div style={{ fontSize: 11, fontWeight: 600, color: LS.bad, marginBottom: 6 }}>{b.err}</div>}

        {/* the three canned replies */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 6, marginBottom: 6 }}>
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => post(q)}
              style={{
                flex: '0 0 auto', minHeight: 34, padding: '0 10px', fontSize: 11, fontWeight: 600,
                borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                border: '1px solid ' + LS.borderStrong, background: LS.raised, color: LS.txt2,
                WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              }}>{q}</button>
          ))}
        </div>

        {/* composer */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="text" value={text} maxLength={TEXT_MAX} placeholder="Type a message..."
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); post(text); } }}
            style={{
              flex: 1, minWidth: 0, minHeight: 40, padding: '0 10px', fontSize: 13,
              fontFamily: 'inherit', color: LS.txt1, background: LS.well,
              border: '1px solid ' + LS.borderStrong, borderRadius: 9,
            }} />
          <button type="button" onClick={() => post(text)} disabled={!text.trim()}
            style={{
              minHeight: 40, padding: '0 14px', fontSize: 12, fontWeight: 700, borderRadius: 9,
              border: 'none', background: LS.brass, color: LS.onBrass, fontFamily: 'inherit',
              opacity: text.trim() ? 1 : 0.45, cursor: text.trim() ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
            }}>Send</button>
        </div>
        <div data-chat-count style={{ fontSize: 10, color: LS.txt3, textAlign: 'right', marginTop: 3 }}>
          {text.length}/{TEXT_MAX}
        </div>
      </div>
    </div>
  );
}
