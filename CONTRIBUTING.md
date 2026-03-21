# 贡献指南

感谢你愿意为 qqbot-opencode 贡献代码！

## 开发环境

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 设置开发环境

1. Fork 本仓库
2. 克隆你的 Fork
   ```bash
   git clone https://github.com/your-username/qqbot-opencode.git
   cd qqbot-opencode
   ```
3. 安装依赖
   ```bash
   npm install
   ```
4. 链接全局命令
   ```bash
   npm link
   ```

## 开发流程

### 开发模式

```bash
npm run dev
```

修改代码后会自动重新加载。

### 代码规范

- 使用 TypeScript
- 遵循现有的代码风格
- 所有公共函数需要有 JSDoc 注释
- 提交前运行 TypeScript 检查
  ```bash
  npm run build
  ```

### Git 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

示例：
```
feat: 添加群聊支持
fix: 修复消息发送失败问题
docs: 更新 README
```

## 分支策略

- `main` - 稳定版本
- `develop` - 开发分支
- `feature/*` - 新功能
- `fix/*` - 修复

## Pull Request

1. 创建新分支
   ```bash
   git checkout -b feature/your-feature
   ```
2. 开发并测试
3. 提交代码
   ```bash
   git add .
   git commit -m "feat: your feature"
   ```
4. Push 到你的 Fork
   ```bash
   git push origin feature/your-feature
   ```
5. 创建 Pull Request

## 报告问题

请使用 GitHub Issues 报告问题，包含以下信息：

- Node.js 版本
- 操作系统
- 复现步骤
- 预期行为
- 实际行为
- 相关日志

## 代码测试

```bash
npm test
```

## 问题解答

如有问题，可以在 GitHub Discussions 中提问。
