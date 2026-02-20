# copilot-read-image

A VS Code extension that provides GitHub Copilot with image reading and analysis capabilities through registered Language Model Tools.

## Features

- **`readImageFromPath`** – Read an image from a local file path and pass it to Copilot for analysis
- **`imgFromBase64`** – Decode a base64-encoded image string and pass it to Copilot
- **`imgFromUrl`** – Fetch an image from a remote URL and pass it to Copilot

All tools return image data in a format compatible with Vision Language Models (VLMs).

## Requirements

- VS Code >= 1.95.0
- Node.js >= 18
- GitHub Copilot with vision support

## Development

```bash
# Install dependencies
npm ci

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## Debugging the Extension

Press **F5** in VS Code to launch the Extension Development Host. Then open Copilot Chat and use the tools directly.

See [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md) for detailed debugging instructions.

## Project Structure

```
copilot-read-image/
├── src/
│   ├── extension.ts      # VS Code extension entry point (activate/deactivate)
│   ├── tools/
│   │   └── index.ts      # Three language model tool implementations
│   └── index.ts          # Legacy image utility (readImage, detectFormat)
├── tests/
│   └── index.test.ts     # Unit tests
├── .github/
│   ├── workflows/        # GitHub Actions CI
│   └── PULL_REQUEST_TEMPLATE.md
├── scripts/
│   ├── pr-manager.sh     # PR monitoring script
│   └── version-bump.sh   # Version management script
└── package.json          # Extension manifest + dependencies
```

## Development Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | VS Code extension architecture | ✅ Complete |
| Phase 2 | Tool implementations (readImageFromPath, imgFromBase64, imgFromUrl) | 🟡 In Progress |
| Phase 3 | VLM integration & validation | ⏳ Blocked on Phase 2 |

See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for the full roadmap.

## License

MIT
