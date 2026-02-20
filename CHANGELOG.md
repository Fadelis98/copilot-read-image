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
  - Fetches images from HTTP/HTTPS URLs using Node.js built-in modules (no extra dependencies)
  - Protocol validation: only `http://` and `https://` are permitted
  - SSRF protection: blocks requests to localhost, loopback (127.0.0.0/8), private IPv4 ranges (10.x, 172.16–31.x, 192.168.x), link-local (169.254.x), and IPv6 loopback/unique-local/link-local addresses
  - Redirect following: up to 5 hops with loop detection and per-hop URL re-validation
  - Size limit: rejects responses declaring or streaming more than 50 MB (checked via Content-Length header and incremental streaming)
  - Configurable timeout: default 30 s, capped at 60 s; idle-socket timeout via Node.js `http.get` options
  - MIME type detection: primary source is the `Content-Type` response header; falls back to magic-byte detection via `detectFormat`
  - Returns JSON metadata (sourceUrl, size, mimeType, fetchTimeMs) alongside the binary image data
  - Graceful error handling for invalid URLs, unsupported protocols, SSRF attempts, HTTP errors, timeouts, redirect loops, oversized responses, and unsupported content types

## [0.1.0] - Initial Release

### Added
- `readImage` utility to read image files from local paths
- `detectFormat` utility to detect image format from magic bytes
