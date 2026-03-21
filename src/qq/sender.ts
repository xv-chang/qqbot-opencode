import crypto from 'crypto';

interface AccessTokenResult {
  token: string;
  expiresAt: number;
}

interface SendMessageOptions {
  toOpenid: string;
  content: string;
  messageId: string;
  quoteRef?: string;
  markdown?: boolean;
}

interface QQAccount {
  appId: string;
  clientSecret: string;
  markdownSupport?: boolean;
}

const API_BASE = 'https://api.sgroup.qq.com';
const TOKEN_URL = 'https://bots.qq.com/app/getAppAccessToken';

let tokenCache: AccessTokenResult | null = null;

async function getAccessToken(appId: string, clientSecret: string): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }

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

  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
  };

  return tokenCache.token;
}

function getNextMsgSeq(msgId: string): number {
  const hash = crypto.createHash('md5').update(msgId).digest('hex');
  return (parseInt(hash.substring(0, 8), 16) % 9007199254740990) + 1;
}

async function apiRequest(
  accessToken: string,
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `QQBot ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error [${path}]: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function sendC2CMessage(
  account: QQAccount,
  options: SendMessageOptions
): Promise<void> {
  const token = await getAccessToken(account.appId, account.clientSecret);
  const msgSeq = getNextMsgSeq(options.messageId);
  const useMarkdown = options.markdown ?? account.markdownSupport ?? false;

  let body: Record<string, unknown>;

  if (useMarkdown) {
    body = {
      markdown: { content: options.content },
      msg_type: 2,
      msg_seq: msgSeq,
      msg_id: options.messageId,
    };
  } else {
    body = {
      content: options.content,
      msg_type: 0,
      msg_seq: msgSeq,
      msg_id: options.messageId,
    };
  }

  if (options.quoteRef && !useMarkdown) {
    body.message_reference = { message_id: options.quoteRef };
  }

  await apiRequest(token, 'POST', `/v2/users/${options.toOpenid}/messages`, body);
}

export async function sendC2CImageMessage(
  account: QQAccount,
  options: {
    toOpenid: string;
    imageUrl: string;
    messageId: string;
  }
): Promise<void> {
  const token = await getAccessToken(account.appId, account.clientSecret);
  const msgSeq = getNextMsgSeq(options.messageId);

  let imageData = options.imageUrl;

  if (!imageData.startsWith('http://') && !imageData.startsWith('https://')) {
    const fs = await import('fs');
    const buffer = fs.readFileSync(imageData);
    const base64 = buffer.toString('base64');
    const ext = imageData.split('.').pop()?.toLowerCase() || 'png';
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    const mimeType = mimeTypes[ext] || 'image/png';
    imageData = `data:${mimeType};base64,${base64}`;
  }

  const body = {
    content: imageData,
    msg_type: 7,
    msg_seq: msgSeq,
    msg_id: options.messageId,
  };

  await apiRequest(token, 'POST', `/v2/users/${options.toOpenid}/messages`, body);
}

export async function sendC2CFileMessage(
  account: QQAccount,
  options: {
    toOpenid: string;
    fileData?: string;
    fileUrl?: string;
    fileName: string;
    messageId: string;
  }
): Promise<void> {
  const token = await getAccessToken(account.appId, account.clientSecret);
  const msgSeq = getNextMsgSeq(options.messageId);

  const body: Record<string, unknown> = {
    file_name: options.fileName,
    msg_type: 6,
    msg_seq: msgSeq,
    msg_id: options.messageId,
  };

  if (options.fileData) {
    body.file_data = options.fileData;
  } else if (options.fileUrl) {
    body.file_url = options.fileUrl;
  }

  await apiRequest(token, 'POST', `/v2/users/${options.toOpenid}/messages`, body);
}

export function clearTokenCache(): void {
  tokenCache = null;
}
