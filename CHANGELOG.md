# Changelog

All notable changes to the "copilot-read-image" extension will be documented in this file.

## [0.2.0] - 2026-02-20

### Added
- VS Code extension structure with `activate` and `deactivate` entry points
- Three language model tools registered via `contributes.languageModelTools`:
  - `readImageFromPath` – reads an image from a local file path
  - `imgFromBase64` – decodes a base64-encoded image string
  - `imgFromUrl` – fetches an image from a remote URL
- Extension manifest metadata (displayName, publisher, activationEvents)
- `.vscodeignore` for packaging
- `.vscode/launch.json` for extension debugging
- Full implementation of `readImageFromPath` tool:
  - Reads local image files (PNG, JPEG, GIF, WebP, BMP) and returns metadata + binary data
  - Auto-detects MIME type from magic bytes via `detectFormat`
  - Path traversal protection: relative paths are validated against the working directory
  - File size limit: rejects files larger than 50 MB
  - Graceful error handling for missing files, unsupported formats, and permission errors
- Full implementation of `imgFromBase64` tool:
  - Decodes base64-encoded image strings (standard and URL-safe encoding)
  - Strips `data:image/...;base64,` URI prefix and extracts MIME type automatically
  - MIME type priority: data URI > explicit parameter > magic-byte auto-detection > `image/png` default
  - Supports PNG, JPEG, GIF, WebP, BMP, SVG+XML
  - Size limit: rejects decoded data larger than 50 MB
  - Graceful error handling for invalid base64, unsupported MIME types, and empty input
- Full implementation of `imgFromUrl` tool:
  - Fetches remote images over HTTP/HTTPS with redirect support (max 5 hops)
  - SSRF protection blocks localhost, loopback, and private IP ranges
  - MIME type handling uses Content-Type header with magic-byte fallback
  - Response size limit: rejects payloads larger than 50 MB
  - Timeout handling: rejects requests that exceed 30 seconds
  - Returns metadata and image payload as text parts (data URL format)
- Tool result compatibility hardening:
  - Replaced non-standard tool result parts with standard `LanguageModelTextPart`
  - Fixed runtime error: `Unknown LanguageModelToolResult part type`
  - Added namespaced tool IDs in manifest/registration for reliable discovery

## [0.1.0] - Initial Release

### Added
- `readImage` utility to read image files from local paths
- `detectFormat` utility to detect image format from magic bytes
