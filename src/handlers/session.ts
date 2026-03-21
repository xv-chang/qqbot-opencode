import {
  createSession,
  switchSession,
  listSessions,
  getCurrentSession,
} from "../opencode/client.js";

export interface SessionCommandResult {
  text: string;
  success: boolean;
}

export async function handleSessionNew(): Promise<SessionCommandResult> {
  try {
    const session = await createSession();
    return {
      text: `已创建新会话: ${session.id}\n标题: ${session.title || "无"}`,
      success: true,
    };
  } catch (err) {
    return {
      text: `创建会话失败: ${err instanceof Error ? err.message : String(err)}`,
      success: false,
    };
  }
}

export async function handleSessionSwitch(
  sessionId: string,
): Promise<SessionCommandResult> {
  if (!sessionId || sessionId.trim() === "") {
    return {
      text: "请提供会话 ID，例如: /session-switch <id>",
      success: false,
    };
  }

  try {
    const session = await switchSession(sessionId.trim());
    return {
      text: `已切换到会话: ${session.id}\n标题: ${session.title || "无"}`,
      success: true,
    };
  } catch (err) {
    return {
      text: `切换会话失败: ${err instanceof Error ? err.message : String(err)}`,
      success: false,
    };
  }
}

export async function handleSessionList(): Promise<SessionCommandResult> {
  try {
    const sessions = await listSessions();

    if (sessions.length === 0) {
      return {
        text: "暂无会话",
        success: true,
      };
    }

    const currentSession = await getCurrentSession();
    const currentId = currentSession?.id;

    const lines = sessions.map((s, i) => {
      const marker = s.id === currentId ? " [当前]" : "";
      const title = s.title ? ` - ${s.title}` : "";
      return `${i + 1}. ${s.id}${title}${marker}`;
    });

    return {
      text: `会话列表:\n${lines.join("\n")}`,
      success: true,
    };
  } catch (err) {
    return {
      text: `获取会话列表失败: ${err instanceof Error ? err.message : String(err)}`,
      success: false,
    };
  }
}

export async function handleSessionCurrent(): Promise<SessionCommandResult> {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return {
        text: "当前没有活跃的会话",
        success: true,
      };
    }

    return {
      text: `当前会话:\nID: ${session.id}\n标题: ${session.title || "无"}`,
      success: true,
    };
  } catch (err) {
    return {
      text: `获取当前会话失败: ${err instanceof Error ? err.message : String(err)}`,
      success: false,
    };
  }
}

export function parseSessionCommand(
  content: string,
): { command: string; args: string } | null {
  const trimmed = content.trim();

  if (trimmed === "/session-new") {
    return { command: "new", args: "" };
  }

  if (trimmed.startsWith("/session-switch ")) {
    const args = trimmed.slice("/session-switch ".length).trim();
    return { command: "switch", args };
  }

  if (trimmed === "/session-list") {
    return { command: "list", args: "" };
  }

  if (trimmed === "/session-current") {
    return { command: "current", args: "" };
  }

  return null;
}
