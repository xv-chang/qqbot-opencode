import { createOpencode } from "@opencode-ai/sdk";
import type { OpencodeConfig } from "../types.js";

interface OpencodeClientInstance {
  client: Awaited<ReturnType<typeof createOpencode>>["client"];
  server: Awaited<ReturnType<typeof createOpencode>>["server"];
  currentSessionId: string | null;
}

interface SessionInfo {
  id: string;
  title?: string;
}

let instance: OpencodeClientInstance | null = null;

export async function initOpencodeClient(
  config: OpencodeConfig,
): Promise<OpencodeClientInstance> {
  const opencodeConfig = config.config || {};

  const { client, server } = await createOpencode({
    hostname: config.hostname,
    port: config.port,
    config: opencodeConfig,
  });

  instance = {
    client,
    server,
    currentSessionId: null,
  };

  const sessionsResponse = await client.session.list();
  const sessions = sessionsResponse.data;
  if (sessions && sessions.length > 0) {
    instance.currentSessionId = sessions[0].id;
    console.log(`[Opencode] Resumed session: ${sessions[0].id}`);
  }

  return instance;
}

export async function createSession(): Promise<SessionInfo> {
  if (!instance) {
    throw new Error("Opencode client not initialized");
  }

  const sessionResponse = await instance.client.session.create({
    body: {},
  });

  const session = sessionResponse.data;
  if (!session) {
    throw new Error("Failed to create session");
  }

  instance.currentSessionId = session.id;
  console.log(`[Opencode] Created new session: ${session.id}`);

  return {
    id: session.id,
    title: session.title,
  };
}

export async function switchSession(sessionId: string): Promise<SessionInfo> {
  if (!instance) {
    throw new Error("Opencode client not initialized");
  }

  const sessionResponse = await instance.client.session.get({
    path: { id: sessionId },
  });

  const session = sessionResponse.data;
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  instance.currentSessionId = sessionId;
  console.log(`[Opencode] Switched to session: ${sessionId}`);

  return {
    id: session.id,
    title: session.title,
  };
}

export async function listSessions(): Promise<SessionInfo[]> {
  if (!instance) {
    throw new Error("Opencode client not initialized");
  }

  const sessionsResponse = await instance.client.session.list();
  const sessions = sessionsResponse.data;

  if (!sessions) {
    return [];
  }

  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
  }));
}

export async function getCurrentSession(): Promise<SessionInfo | null> {
  if (!instance || !instance.currentSessionId) {
    return null;
  }

  const sessionResponse = await instance.client.session.get({
    path: { id: instance.currentSessionId },
  });

  const session = sessionResponse.data;
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    title: session.title,
  };
}

export interface PromptResult {
  text: string;
}

export async function sendPrompt(
  message: string,
  imageUrls: string[] = [],
): Promise<PromptResult> {
  if (!instance || !instance.currentSessionId) {
    throw new Error("Opencode client not initialized or no active session");
  }

  console.log(
    `[Opencode] Sending prompt to session ${instance.currentSessionId}: "${message.slice(0, 50)}..."`,
  );

  const parts: Array<
    { type: "text"; text: string } | { type: "image_url"; url: string }
  > = [{ type: "text", text: message }];

  for (const imageUrl of imageUrls) {
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      parts.push({ type: "image_url", url: imageUrl });
    }
  }

  try {
    const resultResponse = await instance.client.session.prompt({
      path: { id: instance.currentSessionId },
      body: {
        parts: parts as any,
      },
    });

    console.log(
      `[Opencode] Prompt response:`,
      JSON.stringify(resultResponse, null, 2).slice(0, 500),
    );

    const result = resultResponse.data;
    let text = "";

    if (result?.parts && Array.isArray(result.parts)) {
      for (const part of result.parts) {
        console.log(`[Opencode] Part type: ${part.type}`, part);
        if (part.type === "text" && part.text) {
          text += part.text;
        }
      }
    } else {
      console.log(`[Opencode] No parts in response or unexpected format`);
    }

    if (!text) {
      console.log(`[Opencode] Empty response text, checking info...`);
      if (result?.info) {
        console.log(
          `[Opencode] Response info:`,
          JSON.stringify(result.info).slice(0, 500),
        );
      }
    }

    return { text };
  } catch (err) {
    console.error(`[Opencode] Prompt error:`, err);
    throw err;
  }
}

export async function closeOpencodeClient(): Promise<void> {
  if (instance) {
    instance.server.close();
    instance = null;
    console.log("[Opencode] Client closed");
  }
}
