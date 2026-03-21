import WebSocket from 'ws';
import type { QQConfig } from '../types.js';

interface WSPayload {
  op: number;
  d: unknown;
  s?: number;
  t?: string;
}

interface C2CMessageEvent {
  id: string;
  content: string;
  timestamp: number;
  author: {
    user_openid: string;
    username?: string;
  };
  message_scene?: {
    ext?: string;
  };
}

interface ConnectionOptions {
  qq: QQConfig;
  onMessage: (event: C2CMessageEvent) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onDisconnect?: () => void;
}

const INTENTS = {
  GUILDS: 1 << 0,
  GUILD_MEMBERS: 1 << 1,
  PUBLIC_GUILD_MESSAGES: 1 << 30,
  DIRECT_MESSAGE: 1 << 12,
  GROUP_AND_C2C: 1 << 25,
};

const FULL_INTENTS = INTENTS.PUBLIC_GUILD_MESSAGES | INTENTS.DIRECT_MESSAGE | INTENTS.GROUP_AND_C2C;
const API_BASE = 'https://api.sgroup.qq.com';
const TOKEN_URL = 'https://bots.qq.com/app/getAppAccessToken';

let accessToken: string | null = null;
let sessionId: string | null = null;
let lastSeq: number | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000;

async function getAccessToken(appId: string, clientSecret: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appId, clientSecret }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function getGatewayUrl(token: string): Promise<string> {
  const response = await fetch(`${API_BASE}/gateway`, {
    method: 'GET',
    headers: {
      Authorization: `QQBot ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get gateway URL: ${response.status}`);
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

export async function startQQConnection(options: ConnectionOptions): Promise<void> {
  const { qq, onMessage, onReady, onError, onDisconnect } = options;

  accessToken = await getAccessToken(qq.appId, qq.clientSecret);

  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let isReconnecting = false;

    async function connect(): Promise<void> {
      const gatewayUrl = await getGatewayUrl(accessToken!);
      console.log(`[QQ] Connecting to gateway: ${gatewayUrl}`);
      ws = new WebSocket(gatewayUrl);

      ws.on('open', () => {
        console.log('[QQ] WebSocket connected');
        reconnectAttempts = 0;
      });

      ws.on('message', async (data) => {
        try {
          const rawData = data.toString();
          const payload = JSON.parse(rawData) as WSPayload;
          const { op, d, s, t } = payload;

          if (s) {
            lastSeq = s;
          }

          if (op === 10) {
            console.log('[QQ] Hello received');

            if (sessionId && lastSeq !== null) {
              console.log('[QQ] Attempting to resume session');
              ws?.send(
                JSON.stringify({
                  op: 6,
                  d: {
                    token: `QQBot ${accessToken}`,
                    session_id: sessionId,
                    seq: lastSeq,
                  },
                })
              );
            } else {
              console.log('[QQ] Sending identify with intents:', FULL_INTENTS);
              ws?.send(
                JSON.stringify({
                  op: 2,
                  d: {
                    token: `QQBot ${accessToken}`,
                    intents: FULL_INTENTS,
                    shard: [0, 1],
                  },
                })
              );
            }

            const interval = (d as { heartbeat_interval: number }).heartbeat_interval;
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            heartbeatInterval = setInterval(() => {
              if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ op: 1, d: lastSeq }));
              }
            }, interval);
          } else if (op === 0) {
            if (t === 'READY') {
              const readyData = d as { session_id: string };
              sessionId = readyData.session_id;
              console.log('[QQ] Ready, session:', sessionId);
              onReady?.();
            } else if (t === 'C2C_MESSAGE_CREATE') {
              const event = d as C2CMessageEvent;
              if (event.author?.user_openid) {
                onMessage(event);
              }
            }
          } else if (op === 7) {
            console.log('[QQ] Server requested reconnect');
            cleanup();
            scheduleReconnect();
          } else if (op === 9) {
            const canResume = d as boolean;
            console.log('[QQ] Invalid session, can resume:', canResume);
            if (!canResume) {
              sessionId = null;
              lastSeq = null;
            }
            cleanup();
            scheduleReconnect();
          }
        } catch (err) {
          console.error('[QQ] Message parse error:', err);
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`[QQ] WebSocket closed: ${code} ${reason.toString()}`);
        cleanup();
        if (!isReconnecting) {
          onDisconnect?.();
          scheduleReconnect();
        }
      });

      ws.on('error', (err) => {
        console.error('[QQ] WebSocket error:', err.message);
        onError?.(new Error(err.message));
      });
    }

    function cleanup(): void {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    }

    function scheduleReconnect(): void {
      if (isReconnecting) return;
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[QQ] Max reconnect attempts reached');
        reject(new Error('Max reconnect attempts reached'));
        return;
      }

      isReconnecting = true;
      reconnectAttempts++;
      const delay = RECONNECT_DELAY * reconnectAttempts;
      console.log(`[QQ] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

      setTimeout(async () => {
        isReconnecting = false;
        try {
          accessToken = await getAccessToken(qq.appId, qq.clientSecret);
          await connect();
        } catch (err) {
          console.error('[QQ] Reconnect failed:', err);
          scheduleReconnect();
        }
      }, delay);
    }

    connect().catch(reject);
  });
}
