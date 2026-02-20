# Copilot Image Reader / Copilot 图像读取器

English: A VS Code extension that gives GitHub Copilot image input tools for local files, base64 strings, and remote URLs.

中文：一个 VS Code 扩展，为 GitHub Copilot 提供图片输入能力，支持本地文件、Base64 字符串和远程 URL。

## Features / 功能

- `readImageFromPath`: Read a local image file for Copilot analysis / 读取本地图片供 Copilot 分析
- `imgFromBase64`: Decode base64 image input / 解码 base64 图片数据
- `imgFromUrl`: Fetch an image from an HTTP(S) URL / 从 HTTP(S) 地址拉取图片
- VLM-compatible data output / 输出兼容视觉模型（VLM）的数据格式

## Requirements / 环境要求

- VS Code `>= 1.95.0`
- Node.js `>= 18`
- GitHub Copilot (vision-capable plan/model recommended)

## Install / 安装

### From VSIX / 通过 VSIX 安装

```bash
npm ci
npm run build
npm run package:vsix
```

Then in VS Code: **Extensions: Install from VSIX...**

然后在 VS Code 中执行：**Extensions: Install from VSIX...**

## Usage / 使用方式

In Copilot Chat, ask for image analysis and provide one of these inputs:

在 Copilot Chat 中让 Copilot 分析图片，并提供以下任一输入：

- File path / 文件路径: `readImageFromPath`
- Base64 image / Base64 图片: `imgFromBase64`
- URL / 图片链接: `imgFromUrl`

## Security Notes / 安全说明

- `imgFromUrl` blocks localhost and private network ranges / 会阻止 localhost 与私网地址
- Download size limit is enforced / 有下载大小限制
- Redirect loops and timeout are handled / 包含重定向与超时保护

## For Developers / 开发者

```bash
npm ci
npm run build
npm test
npm run lint
```

## License / 许可证

MIT
