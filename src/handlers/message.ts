import { sendPrompt } from '../opencode/client.js';
import {
  parseSessionCommand,
  handleSessionNew,
  handleSessionSwitch,
  handleSessionList,
  handleSessionCurrent,
} from './session.js';
import type { ParsedMessage } from '../qq/index.js';

export interface MessageHandlerResult {
  text: string;
  success: boolean;
  isSessionCommand?: boolean;
}

export async function handleMessage(
  content: string,
  parsedMessage: ParsedMessage
): Promise<MessageHandlerResult> {
  const sessionCmd = parseSessionCommand(content);

  if (sessionCmd) {
    return handleSessionCommand(sessionCmd.command, sessionCmd.args);
  }

  return handleAIMessage(content, parsedMessage);
}

async function handleSessionCommand(command: string, args: string): Promise<MessageHandlerResult> {
  let result;

  switch (command) {
    case 'new':
      result = await handleSessionNew();
      break;
    case 'switch':
      result = await handleSessionSwitch(args);
      break;
    case 'list':
      result = await handleSessionList();
      break;
    case 'current':
      result = await handleSessionCurrent();
      break;
    default:
      result = {
        text: '未知的 session 命令',
        success: false,
      };
  }

  return {
    ...result,
    isSessionCommand: true,
  };
}

async function handleAIMessage(
  content: string,
  parsedMessage: ParsedMessage
): Promise<MessageHandlerResult> {
  try {
    const result = await sendPrompt(content, parsedMessage.imageUrls);

    if (!result.text || result.text.trim() === '') {
      return {
        text: 'AI 返回了空响应',
        success: true,
      };
    }

    return {
      text: result.text,
      success: true,
    };
  } catch (err) {
    return {
      text: `处理消息失败: ${err instanceof Error ? err.message : String(err)}`,
      success: false,
    };
  }
}
