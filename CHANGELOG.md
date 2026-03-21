# 更新日志

所有重要更新都会记录在此文件中。

## [1.0.0] - 2024-03-21

### 首次发布

#### 功能

- QQ 私聊消息接收和发送
- WebSocket 连接 QQ 开放平台 API
- OpenCode AI 集成
- Markdown 渲染支持
- 会话管理命令
  - `/session-new` - 创建新会话
  - `/session-switch <id>` - 切换会话
  - `/session-list` - 列出所有会话
  - `/session-current` - 显示当前会话
- 交互式配置向导 (`qqbot init`)
- 配置文件自动搜索
  - `./config.yaml`
  - `~/.qqbot/config.yaml`
- 自动重连机制
- Token 自动刷新

#### 技术特性

- TypeScript + Node.js
- 支持 Windows、macOS、Linux
- 全局 CLI 命令安装
- 环境变量支持

#### 依赖

- `@opencode-ai/sdk` - OpenCode AI SDK
- `ws` - WebSocket 客户端
- `js-yaml` - YAML 配置解析
- `prompts` - 交互式命令行提示
