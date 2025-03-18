# 屏幕截图和图标

在此文件夹中保存应用的截图和图标，用于 GitHub 仓库展示和文档使用。

## 所需图片

1. **图标文件**
   - `icon.png` - 应用图标，建议尺寸 512x512 像素
   - 复制 `src-tauri/icons/icon.png` 到 `public/` 目录

2. **应用截图**
   - `screenshot-main.png` - 主界面
   - `screenshot-compression.png` - 压缩过程
   - `screenshot-results.png` - 结果展示
   - `screenshot-settings.png` - 设置界面

## 如何获取截图

1. 运行应用（`npm run tauri dev`）
2. 使用操作系统的截图工具（Windows: Win+Shift+S, macOS: Cmd+Shift+4）捕获界面
3. 保存截图到此文件夹
4. 在 README.md 中引用这些截图

## 示例 Markdown 图片引用

```markdown
![TinyMe 主界面](./screenshot/screenshot-main.png)
``` 