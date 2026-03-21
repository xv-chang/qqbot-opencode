import { loadConfig, expandEnvVariables, findDefaultConfig, runInitWizard } from './config.js';
import type { Config } from './types.js';
import {
  startQQConnection,
  sendC2CMessage,
  parseMessage,
  chunkText,
  clearTokenCache,
} from './qq/index.js';
import { initOpencodeClient, closeOpencodeClient, createSession } from './opencode/client.js';
import { handleMessage } from './handlers/message.js';

const TEXT_CHUNK_LIMIT = 500;

interface CLIArgs {
  config?: string;
  init?: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && i + 1 < args.length) {
      result.config = args[i + 1];
      i++;
    } else if (args[i] === '--init' || args[i] === 'init') {
      result.init = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
QQ Bot with OpenCode AI

Usage:
  qqbot              启动 Bot（使用默认配置）
  qqbot --config <path>  使用指定配置文件
  qqbot init         交互式创建配置文件
  qqbot --help       显示帮助

配置搜索顺序:
  1. --config 指定路径
  2. ./config.yaml（当前工作目录）
  3. ~/.qqbot/config.yaml（用户家目录）

示例:
  qqbot
  qqbot --config ./my-config.yaml
  qqbot init
  `);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.init) {
    await runInitWizard();
    return;
  }

  let configPath: string | null = args.config ?? null;

  if (configPath === null) {
    configPath = findDefaultConfig();
    if (configPath !== null) {
      console.log(`[App] Using default config: ${configPath}`);
    }
  }

  if (configPath === null) {
    console.error('Error: No config file found.');
    console.error("\n请先运行 'qqbot init' 创建配置文件，或使用 --config 指定配置文件路径。");
    console.error("\n运行 'qqbot --help' 查看更多信息。");
    process.exit(1);
  }

  console.log('[App] Loading configuration...');
  let config: Config;

  try {
    config = loadConfig(configPath);
  } catch (err) {
    console.error(
      `[App] Failed to load config: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }

  const expandedConfig = expandEnvVariables(config) as Config;

  console.log('[App] Initializing OpenCode client...');
  try {
    await initOpencodeClient(expandedConfig.opencode);
    console.log('[App] OpenCode client initialized');
  } catch (err) {
    console.error(
      `[App] Failed to initialize OpenCode: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }

  try {
    await createSession();
  } catch (err) {
    console.error(
      `[App] Failed to create initial session: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  console.log('[App] Starting QQ connection...');
  try {
    await startQQConnection({
      qq: expandedConfig.qq,
      onMessage: async (event) => {
        console.log(
          `[App] Received message from ${event.author.user_openid}: ${event.content.slice(0, 50)}...`
        );

        try {
          const parsed = parseMessage(event as any);
          const result = await handleMessage(parsed.content, parsed);

          const chunks = chunkText(result.text, TEXT_CHUNK_LIMIT);
          for (const chunk of chunks) {
            await sendC2CMessage(expandedConfig.qq, {
              toOpenid: event.author.user_openid,
              content: chunk,
              messageId: event.id,
            });
          }

          console.log(`[App] Sent response to ${event.author.user_openid}`);
        } catch (err) {
          console.error(
            `[App] Error handling message: ${err instanceof Error ? err.message : String(err)}`
          );

          const errorText = `处理消息时出错: ${err instanceof Error ? err.message : String(err)}`;
          try {
            await sendC2CMessage(expandedConfig.qq, {
              toOpenid: event.author.user_openid,
              content: errorText,
              messageId: event.id,
            });
          } catch (sendErr) {
            console.error(`[App] Failed to send error message: ${sendErr}`);
          }
        }
      },
      onReady: () => {
        console.log('[App] QQ Bot is ready!');
      },
      onError: (err) => {
        console.error(`[App] QQ connection error: ${err.message}`);
      },
      onDisconnect: () => {
        console.log('[App] QQ disconnected, will attempt to reconnect...');
      },
    });
  } catch (err) {
    console.error(
      `[App] Failed to start QQ connection: ${err instanceof Error ? err.message : String(err)}`
    );
    await closeOpencodeClient();
    process.exit(1);
  }

  console.log('[App] Bot is running. Press Ctrl+C to stop.');

  const shutdown = async () => {
    console.log('\n[App] Shutting down...');
    clearTokenCache();
    await closeOpencodeClient();
    console.log('[App] Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(`[App] Fatal error: ${err}`);
  process.exit(1);
});
