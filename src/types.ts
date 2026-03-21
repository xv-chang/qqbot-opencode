export interface QQConfig {
  appId: string;
  clientSecret: string;
  markdownSupport?: boolean;
}

export interface OpencodeConfig {
  port: number;
  hostname: string;
  config?: Record<string, unknown>;
}

export interface AppConfig {
  workingDir: string;
}

export interface Config {
  qq: QQConfig;
  opencode: OpencodeConfig;
  app: AppConfig;
}

export interface QQMessageEvent {
  id: string;
  content: string;
  timestamp: number;
  author: {
    user_openid: string;
    username?: string;
  };
  attachments?: Array<{
    url?: string;
    file_type?: number;
    name?: string;
  }>;
  message_scene?: {
    ext?: string;
  };
}

export interface ParsedMessage {
  content: string;
  imageUrls: string[];
  quoteRef?: string;
  quoteId?: string;
}

export interface SessionInfo {
  id: string;
  title?: string;
  createdAt: Date;
}
