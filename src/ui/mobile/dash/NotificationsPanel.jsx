import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { chatLogBus } from '../chatLogBus.js';
import { notifBus, notifLines, notifNewestTs } from '../notifBus.js';
import { chatLaneOf, CHAT_LANE_ICON } from '../../../data/smallIcons.js';
import { chatNameColor } from '../../../game/chatColor.js';
import { deskWords } from '@/game/deskWords.js';

/* ═══ v2.3.4071: MORE -> NOTIFICATIONS, WHERE THE BELL WENT ═══
 * The owner, adopting the review of his dashboard: "The notification bell
 * could also move to More, retaining an unread badge."  The bell in the
 * world's lower-left corner (WorldChatFeed's shut state, v2.3.2155: "collapse
 * all notifications (chat, special events, etc, into a little notification
 * bell") is gone from the play screen; this page is what it held:
 *   - the same lines, the chat log's last 40 (notifBus notifLines), newest at
 *     the TOP here -- a page you open to catch up reads from the latest, and
 *     unlike the feed this list is inside the dashboard, never over the
 *     movement stick, so it scrolls (the v2.3.2123 reason for an inert list
 *     does not reach in here);
 *   - the unread count: on the More button and this page's tile while the
 *     feed is shut; opening this page marks everything here seen;
 *   - "Show on screen": the World Chat feed in the corner again, as a tap on
 *     the bell used to open it.  A tap on the feed folds it back (v2.3.2325).
 * Muting stays in Settings ("Notifications — silence all of them",
 * v2.3.2147); this page only says where. */
export const NotificationsPanel = () => {
  const [, force] = useState(0);
  useEffect(() => chatLogBus.subscribe(() => force((n) => n + 1)), []);
  useEffect(() => notifBus.subscribe(() => force((n) => n + 1)), []);
  const S = getState();
  const lines = notifLines(S);
  const newest = notifNewestTs(S);
  /* the page shows them all, so all of them are seen -- including the ones
     that arrive while it is open */
  useEffect(() => { if (newest) notifBus.markSeen(newest); }, [newest]);
  const shown = !notifBus.shut;
  const rows = lines.slice().reverse();
  return (
    <div data-notif-panel={lines.length} style={{ ...panelStyle, overflowY: 'auto', padding: '4px 8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 6px' }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: COL.text2, lineHeight: 1.3 }}>
          World chat and news from the game{shown ? ', also on screen' : ''}.
        </div>
        <button type="button" data-notif-onscreen={shown ? 'on' : 'off'}
          aria-pressed={shown}
          onClick={(e) => { e.stopPropagation(); notifBus.setShut(shown); }}
          className="bt-chisel bt-chisel--chip"
          style={{ flex: 'none', minHeight: 36, padding: '0 10px', fontSize: 12, fontWeight: 800, color: COL.text, touchAction: 'manipulation', cursor: 'pointer' }}>
          {shown ? 'Hide from screen' : 'Show on screen'}
        </button>
      </div>
      {rows.length ? (
        <div data-notif-lines={rows.length} style={{ fontSize: 13, lineHeight: 1.35 }}>
          {rows.map((m, i) => {
            const lane = m.name ? chatLaneOf(m.name) : null;
            return (
              <div key={(m.ts || 0) + '-' + i} style={{ padding: '4px 2px', borderBottom: `1px solid ${COL.divider}`, wordBreak: 'break-word' }}>
                {m.name ? (
                  <span style={{ color: chatNameColor(m.color), fontWeight: 700 }}>
                    {lane ? (
                      <img src={CHAT_LANE_ICON[lane.lane]} alt={lane.lane} draggable={false} width={16} height={16}
                        style={{ display: 'inline-block', width: 16, height: 16, verticalAlign: '-4px', marginRight: 3, pointerEvents: 'none' }} />
                    ) : null}
                    {lane ? lane.rest : m.name}:{' '}
                  </span>
                ) : null}
                <span style={{ color: m.muted ? COL.muted : (m.name ? COL.text : '#EAC675') }}>{m.text}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div data-notif-empty="" style={{ fontSize: 13, color: COL.text2, padding: '14px 2px' }}>
          Nothing yet. Chat and news from the game show up here.
        </div>
      )}
      <div style={{ fontSize: 11.5, color: COL.muted, marginTop: 8, lineHeight: 1.35 }}>
        {deskWords('To silence them all, tap Settings, then Notifications.')}
      </div>
    </div>
  );
};

export default NotificationsPanel;
