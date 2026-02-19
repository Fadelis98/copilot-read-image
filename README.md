# copilot-read-image

A GitHub Copilot plugin that enables reading and analysing images directly within your Copilot workflow.

## Features

- Read and decode images from local paths or URLs
- Extract metadata (dimensions, format, colour depth) from images
- Pass image context to GitHub Copilot for AI-assisted analysis

## Requirements

- Node.js >= 18
- npm >= 9

## Installation

```bash
npm install
```

## Usage

```typescript
import { readImage } from './src/index';

const result = await readImage('./path/to/image.png');
console.log(result);
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## Project Structure

```
copilot-read-image/
├── src/
│   └── index.ts      # Plugin main entry point
├── tests/
│   └── index.test.ts # Unit tests
├── eslint.config.mjs # ESLint configuration
├── .prettierrc       # Prettier configuration
├── jest.config.js    # Jest configuration
├── tsconfig.json     # TypeScript configuration
└── package.json
```

## License

MIT
