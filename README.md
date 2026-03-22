# qqbot-opencode

QQ Bot powered by OpenCode AI - 一个基于 OpenCode AI 的 QQ 机器人。

## 功能特性

- **QQ 私聊支持** - 接收和发送私聊消息
- **AI 对话** - 集成 OpenCode AI，支持代码编写、数据分析等功能
- **Markdown 渲染** - 支持 QQ 消息的 Markdown 格式渲染
- **会话管理** - 支持多会话切换 (`/session-new`, `/session-switch`, etc.)
- **图片支持** - 接收和发送图片消息
- **交互式配置** - `qqbot init` 向导式配置生成
- **跨平台** - 支持 Windows、macOS、Linux

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm 或 yarn
- opencode（请参考 [OpenCode AI](https://opencode.ai) 进行安装）
- QQ 机器人账号（需要在 [QQ 开放平台](https://q.qq.com) 创建应用）
- OpenCode AI API Key

### 安装

```bash
# 从 npm 安装（全局命令）
npm install -g qqbot-opencode

# 或者从源码安装
git clone <repository-url>
cd qqbot-opencode
npm install
npm link
```

### 配置

运行交互式配置向导：

```bash
qqbot init
```

按提示填写：

- QQ Bot AppID 和 ClientSecret
- 是否启用 Markdown
- opencode 服务端口
- AI Provider 类型（Anthropic 兼容 / OpenAI 兼容）
- API Key

### 运行

```bash
qqbot
```

## 使用命令

| 命令                   | 说明           |
| ---------------------- | -------------- |
| `/session-new`         | 创建新会话     |
| `/session-switch <id>` | 切换到指定会话 |
| `/session-list`        | 列出所有会话   |
| `/session-current`     | 显示当前会话   |
| `任意文字消息`         | 发送给 AI 处理 |

## 配置说明

配置文件位于 `~/.qqbot/config.yaml`，也可以使用 `--config` 指定其他路径：

```yaml
qq:
  appId: 'your-app-id'
  clientSecret: 'your-client-secret'
  markdownSupport: true

opencode:
  port: 4097
  hostname: '127.0.0.1'
  config:
    model: 'provider/model-name'
    provider:
      your-provider:
        options:
          baseURL: 'https://api.example.com/v1'
          apiKey: 'your-api-key'
        models:
          model-name:
            name: 'provider/model-name'

app:
  workingDir: './'
```

### AI Provider 配置

#### Anthropic API 兼容（如 MiniMax）

```yaml
opencode:
  config:
    model: 'minimax/MiniMax-M2.7'
    provider:
      minimax:
        options:
          baseURL: 'https://api.minimaxi.com/anthropic/v1'
          apiKey: 'your-api-key'
        models:
          MiniMax-M2.7:
            name: 'minimax/MiniMax-M2.7'
```

#### OpenAI API 兼容

```yaml
opencode:
  config:
    model: 'openai/gpt-4o'
    provider:
      openai:
        options:
          baseURL: 'https://api.openai.com/v1'
          apiKey: 'your-api-key'
        models:
          gpt-4o:
            name: 'openai/gpt-4o'
```

## CLI 选项

```bash
qqbot              # 使用默认配置启动
qqbot --config <path>  # 使用指定配置文件
qqbot init         # 交互式创建配置
qqbot --help       # 显示帮助
```

## 开发

### 项目结构

```
qqbot-opencode/
├── src/
│   ├── app.ts              # 主入口
│   ├── config.ts           # 配置加载和初始化向导
│   ├── types.ts            # 类型定义
│   ├── qq/
│   │   ├── connection.ts   # WebSocket 连接
│   │   ├── sender.ts       # 消息发送
│   │   └── parser.ts       # 消息解析
│   ├── opencode/
│   │   └── client.ts       # OpenCode SDK 封装
│   └── handlers/
│       ├── message.ts      # 消息处理
│       └── session.ts      # 会话指令
├── bin/
│   └── qqbot.js            # CLI 入口
├── package.json
├── tsconfig.json
└── config.yaml.example
```

### 开发命令

```bash
npm run dev      # 开发模式运行
npm run build    # 编译 TypeScript
npm run start    # 运行编译后的代码
npm test         # 运行测试
```

### 构建

```bash
npm run build    # TypeScript 编译
npm run pkg      # 打包成 Windows exe
npm run pkg:linux # 打包成 Linux
npm run pkg:mac   # 打包成 macOS
```

## 注意事项

1. **Token 刷新** - QQ Access Token 会自动刷新
2. **重连机制** - WebSocket 断开后会自动重连
3. **配置优先级** - `--config` > `./config.yaml` > `~/.qqbot/config.yaml`
4. **敏感信息** - 请勿将 API Key 等敏感信息提交到代码仓库

## License

MIT License

## 致谢

- [OpenCode AI](https://opencode.ai) - AI 能力支持
- [QQ 开放平台](https://q.qq.com) - QQ Bot 接口
