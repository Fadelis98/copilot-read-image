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

## [0.1.0] - Initial Release

### Added
- `readImage` utility to read image files from local paths
- `detectFormat` utility to detect image format from magic bytes
