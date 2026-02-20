# Copilot Image Reader

> A VS Code extension that provides GitHub Copilot with native image input tools — read images from local files, base64 strings, or remote URLs, and pass them directly to vision-capable models via the `LanguageModelDataPart` API.

> 一个 VS Code 扩展，为 GitHub Copilot 提供原生图像输入能力。支持从本地文件、Base64 字符串或远程 URL 读取图像，并通过 `LanguageModelDataPart` 接口直接传递给视觉语言模型（VLM）。

---

## Features / 功能

| Tool | Description |
|------|-------------|
| `readImageFromPath` | Read a local image file and pass binary image data to Copilot / 读取本地图片文件，以二进制图像数据传递给 Copilot |
| `imgFromBase64` | Decode a base64-encoded image and pass it to Copilot / 解码 Base64 图片并传递给 Copilot |
| `imgFromUrl` | Fetch an image from an HTTP(S) URL and pass it to Copilot / 从 HTTP(S) 地址下载图片并传递给 Copilot |

All three tools return a metadata text part (JSON) alongside a binary `LanguageModelDataPart.image` — no base64-in-text workarounds.

三个工具均返回一个 JSON 元数据文本 part 与一个二进制 `LanguageModelDataPart.image`，直接走图像数据通道，不走文本 base64 绕行方案。

---

## Requirements / 环境要求

- VS Code `>= 1.109.0`
- Node.js `>= 18`
- GitHub Copilot with a vision-capable model (e.g. GPT-4o)

---

## Installation / 安装

Build and install the extension from a local VSIX:

从本地构建并安装 VSIX：

```bash
npm ci
npm run build
npm run package:vsix
```

Then in VS Code: **Extensions › Install from VSIX…** and select the generated `.vsix` file.

然后在 VS Code 中：**Extensions › Install from VSIX…**，选择生成的 `.vsix` 文件。

---

## Usage / 使用方式

Open Copilot Chat and reference a tool directly, or simply describe what you need — Copilot will call the appropriate tool automatically.

打开 Copilot Chat，直接引用工具，或描述需求即可——Copilot 会自动调用合适的工具。

```
@workspace Analyse this screenshot: #readImageFromPath /path/to/image.png
@workspace What's in this image? #imgFromUrl https://example.com/photo.jpg
```

### Supported formats / 支持的图像格式

PNG, JPEG, GIF, WebP, BMP, SVG

---

## Security / 安全说明

- **`imgFromUrl`** blocks requests to `localhost`, loopback addresses, and all RFC-1918 private IP ranges (including IPv6 link-local). SSRF 防护：拦截 localhost、回环地址及所有 RFC-1918 私有 IP 段（含 IPv6 link-local）。
- Maximum image size: **50 MB**. 单张图像最大 50 MB。
- Redirect limit: **5 hops**, with loop detection and 30-second timeout. 最多跟随 5 次重定向，包含环路检测和 30 秒超时。

---

## Development / 开发

```bash
npm ci          # install dependencies / 安装依赖
npm run build   # compile TypeScript / 编译
npm test        # run tests / 运行测试
npm run lint    # check lint / 代码检查
```

See [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md) for debugging the extension in VS Code.

调试扩展详见 [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md)。

---

## License / 许可证

[MIT](LICENSE)
