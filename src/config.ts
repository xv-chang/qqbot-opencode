import fs from "fs";
import path from "path";
import os from "os";
import yaml from "js-yaml";
import prompts from "prompts";
import type { Config } from "./types.js";

const CONFIG_DIR = path.join(os.homedir(), ".qqbot");
const CONFIG_FILE = "config.yaml";
const CONFIG_PATH = path.join(CONFIG_DIR, CONFIG_FILE);

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function findDefaultConfig(): string | null {
  const searchPaths = [path.join(process.cwd(), CONFIG_FILE), CONFIG_PATH];

  for (const configPath of searchPaths) {
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

export function loadConfig(configPath: string): Config {
  const absolutePath = path.resolve(configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  const rawContent = fs.readFileSync(absolutePath, "utf-8");
  const config = yaml.load(rawContent) as Config;

  validateConfig(config);

  return config;
}

function validateConfig(config: Config): void {
  if (!config.qq?.appId) {
    throw new Error("Missing required field: qq.appId");
  }
  if (!config.qq?.clientSecret) {
    throw new Error("Missing required field: qq.clientSecret");
  }
  if (!config.opencode?.port) {
    config.opencode.port = 4097;
  }
  if (!config.opencode?.hostname) {
    config.opencode.hostname = "127.0.0.1";
  }
  if (!config.app?.workingDir) {
    config.app.workingDir = process.cwd();
  }
}

export function expandEnvVariables(obj: unknown): unknown {
  if (typeof obj === "string") {
    const envVarPattern = /\$\{([^}]+)\}/g;
    return obj.replace(envVarPattern, (_, envName) => {
      return process.env[envName] || "";
    });
  }
  if (Array.isArray(obj)) {
    return obj.map(expandEnvVariables);
  }
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandEnvVariables(value);
    }
    return result;
  }
  return obj;
}

export function saveConfig(config: Config, destPath?: string): void {
  const savePath = destPath || CONFIG_PATH;

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  fs.writeFileSync(savePath, yamlContent, "utf-8");
}

export async function runInitWizard(): Promise<void> {
  console.log("\n欢迎使用 qqbot-opencode 配置向导！\n");

  const answers = await prompts([
    {
      type: "text",
      name: "appId",
      message: "请输入 QQ Bot AppID:",
      validate: (value) => value.length > 0 || "AppID 不能为空",
    },
    {
      type: "text",
      name: "clientSecret",
      message: "请输入 QQ Bot ClientSecret:",
      validate: (value) => value.length > 0 || "ClientSecret 不能为空",
    },
    {
      type: "confirm",
      name: "markdownSupport",
      message: "是否启用 Markdown 渲染? (y/N):",
      initial: false,
    },
    {
      type: "number",
      name: "opencodePort",
      message: "opencode 服务端口 (默认: 4097):",
      initial: 4097,
    },
    {
      type: "select",
      name: "providerType",
      message: "AI Provider 类型:",
      choices: [
        { title: "1. Anthropic 兼容 (MiniMax)", value: "anthropic" },
        { title: "2. OpenAI 兼容", value: "openai" },
      ],
      initial: 0,
    },
    {
      type: "text",
      name: "providerName",
      message: "请输入 Provider 名称 (默认: minimax):",
      initial: "minimax",
    },
    {
      type: "text",
      name: "modelName",
      message: "AI 模型名称 (默认: MiniMax-M2.7):",
      initial: "MiniMax-M2.7",
    },
    {
      type: "text",
      name: "apiKey",
      message: "API Key:",
      validate: (value) => value.length > 0 || "API Key 不能为空",
    },
  ]);

  const providerType = answers.providerType;
  const providerName = answers.providerName || "minimax";
  const modelName = answers.modelName || "MiniMax-M2.7";

  let baseURL: string;
  if (providerType === "anthropic") {
    baseURL = "https://api.minimaxi.com/anthropic/v1";
  } else {
    baseURL = "https://api.openai.com/v1";
  }

  const config: Config = {
    qq: {
      appId: answers.appId,
      clientSecret: answers.clientSecret,
      markdownSupport: answers.markdownSupport,
    },
    opencode: {
      port: answers.opencodePort || 4097,
      hostname: "127.0.0.1",
      config: {
        model: `${providerName}/${modelName}`,
        provider: {
          [providerName]: {
            options: {
              baseURL,
              apiKey: answers.apiKey,
            },
            models: {
              [modelName]: {
                name: `${providerName}/${modelName}`,
              },
            },
          },
        },
      },
    },
    app: {
      workingDir: "./",
    },
  };

  saveConfig(config);

  console.log("\n配置已保存到 ~/.qqbot/config.yaml");
  console.log("运行 'qqbot' 启动 Bot\n");
}
