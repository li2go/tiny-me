# 贡献指南

非常感谢您对 TinyMe 项目的关注！我们欢迎各种形式的贡献，包括但不限于提交错误报告、功能建议、改进文档或提交代码等。

## 开发环境设置

1. 确保您的系统已安装以下依赖：
   - [Node.js](https://nodejs.org/) (v14+)
   - [Rust](https://www.rust-lang.org/) (最新稳定版)
   - [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

2. 克隆代码库并安装依赖：
   ```bash
   git clone https://github.com/li2go/tiny-me.git
   cd tiny-me
   npm install
   ```

3. 启动开发环境：
   ```bash
   npm run tauri dev
   ```

## 提交错误报告

1. 使用 [GitHub Issues](https://github.com/li2go/tiny-me/issues) 提交错误报告。
2. 请尽可能详细地描述问题，包括：
   - 问题的具体表现
   - 复现步骤
   - 期望的行为
   - 您的操作系统和版本信息
   - 如果可能，请附上屏幕截图

## 提交功能建议

1. 使用 [GitHub Issues](https://github.com/li2go/tiny-me/issues) 提交功能建议。
2. 清晰地描述您希望看到的功能，以及它为何对用户有价值。
3. 如果可能，提供相关的截图或设计草图。

## 代码贡献流程

1. 在 GitHub 上 Fork 本项目。
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)。
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)。
4. 确保您的代码通过测试。
5. 推送到您的分支 (`git push origin feature/amazing-feature`)。
6. 创建一个 Pull Request。

## 代码风格

我们遵循以下代码风格指南：

- **TypeScript/React**：遵循 [Airbnb JavaScript 风格指南](https://github.com/airbnb/javascript)
- **Rust**：遵循 [Rust API 指南](https://rust-lang.github.io/api-guidelines/)
- 请确保在提交代码前运行 `npm run lint` 检查代码风格

## Pull Request 指南

1. PR 应该尽可能小且集中于单一功能或修复。
2. 请在 PR 描述中清晰地说明您的更改内容和目的。
3. 如果 PR 关联到某个 Issue，请在描述中使用关键字（如 `fixes #123`）链接到它。
4. 确保所有测试都通过。
5. 更新相关文档。

## 文档贡献

文档改进非常重要！如果您发现文档中有任何错误或不清楚的地方，欢迎您提交改进。

## 行为准则

参与本项目即表示您同意遵守我们的行为准则：尊重所有贡献者，保持专业和友好的交流环境。

## 感谢

再次感谢您对 TinyMe 的贡献！您的参与对我们非常重要。 