import type { QQMessageEvent, ParsedMessage } from '../types.js';

const FACE_TAG_REGEX = /<face name="([^"]+)"[^/]*\/>/gi;

export function parseMessage(event: QQMessageEvent): ParsedMessage {
  let content = event.content;

  content = parseFaceTags(content);
  content = content.trim();

  const imageUrls = extractImageUrls(content);
  content = removeImageUrls(content);

  const { quoteRef, quoteId } = parseQuoteRef(event);

  return {
    content,
    imageUrls,
    quoteRef,
    quoteId,
  };
}

function parseFaceTags(content: string): string {
  let result = content;
  let match;

  FACE_TAG_REGEX.lastIndex = 0;
  while ((match = FACE_TAG_REGEX.exec(content)) !== null) {
    const faceName = match[1];
    result = result.replace(match[0], `[表情:${faceName}]`);
  }

  return result;
}

function extractImageUrls(content: string): string[] {
  const urls: string[] = [];
  let match;

  const regex = /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s"'<>]*)?/gi;
  while ((match = regex.exec(content)) !== null) {
    urls.push(match[0]);
  }

  return urls;
}

function removeImageUrls(content: string): string {
  return content
    .replace(/https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s"'<>]*)?/gi, '')
    .trim();
}

function parseQuoteRef(event: QQMessageEvent): {
  quoteRef?: string;
  quoteId?: string;
} {
  const ext = event.message_scene?.ext;
  if (!ext) {
    return {};
  }

  try {
    const scene = JSON.parse(ext);
    if (scene?.refMsgIdx) {
      return {
        quoteRef: String(scene.refMsgIdx),
        quoteId: scene.refMsgIdx,
      };
    }
  } catch {
    // ignore parse errors
  }

  return {};
}

export function chunkText(text: string, limit: number): string[] {
  if (!text || text.length === 0) {
    return [];
  }

  if (text.length <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  const lines = text.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 <= limit) {
      currentChunk += (currentChunk ? '\n' : '') + line;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      if (line.length <= limit) {
        currentChunk = line;
      } else {
        const subChunks = splitLongLine(line, limit);
        chunks.push(...subChunks.slice(0, -1));
        currentChunk = subChunks[subChunks.length - 1] || '';
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function splitLongLine(line: string, limit: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += limit) {
    chunks.push(line.slice(i, i + limit));
  }
  return chunks;
}
