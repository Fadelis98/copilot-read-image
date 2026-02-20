# copilot-read-image - Development Plan

## 📋 Project Overview

Transform `copilot-read-image` from a TypeScript library into a **VS Code Extension** that provides GitHub Copilot with direct access to image reading tools. These tools will feed image data into Vision Language Models (VLMs) through Copilot's vision-capable API.

### Key Objective
Enable Copilot to analyze images directly within chat workflows through registered language model tools.

---

## 🎯 Phase 1: Transform Project Structure (Migrate to VS Code Extension)

### Phase 1.1: Extension Manifest & Configuration
- **Files to create/modify:**
  - `package.json` → Add VS Code extension metadata and dependencies
  - `extension.ts` → Main extension entry point (activate/deactivate)
  - `CHANGELOG.md` → Track version changes
  - `.vscodeignore` → Files to exclude from packaging
  - `tsconfig.json` → Update for extension development

- **Key Changes:**
  - Add `vscode` as peerDependency
  - Configure `activationEvents` (e.g., `onLanguageModel`)
  - Define `contributes.languageModelTools` in manifest

### Phase 1.2: Extension Entry Point Architecture
- Create extension lifecycle management:
  - `activate(context: ExtensionContext)` - Register all tools on startup
  - `deactivate()` - Cleanup if needed
- Set up proper error handling and logging
- Implement telemetry/diagnostics infrastructure

### Phase 1.3: VS Code Extension Development Dependencies
- Add `@types/vscode`
- Add `vscode` as peerDependency
- Update eslint/prettier configs for extension environment

---

## 📸 Phase 2: Image Reading Tools Implementation

### Tool 1: Read Image from Local File Path
**Tool Name:** `readImageFromPath`

**Manifest Config (package.json):**
```json
{
  "name": "readImageFromPath",
  "tags": ["image", "file"],
  "displayName": "Read Image from File",
  "modelDescription": "Reads an image file from local disk and provides it as image data to analyze",
  "inputSchema": {
    "type": "object",
    "properties": {
      "filePath": {
        "type": "string",
        "description": "Absolute or relative path to image file (PNG, JPEG, GIF, WebP, BMP)"
      }
    },
    "required": ["filePath"]
  }
}
```

**Implementation:**
- Validate file path (security: prevent path traversal)
- Read file using Node.js fs APIs
- Detect MIME type from magic bytes or extension
- Return as `LanguageModelDataPart.image(buffer, mimeType)`
- Error handling: file not found, unsupported format, read errors

### Tool 2: Convert Base64 String to Image
**Tool Name:** `imgFromBase64`

**Manifest Config:**
```json
{
  "name": "imgFromBase64",
  "tags": ["image", "encoding"],
  "displayName": "Image from Base64",
  "modelDescription": "Decodes a base64-encoded image string and provides it as image data",
  "inputSchema": {
    "type": "object",
    "properties": {
      "base64String": {
        "type": "string",
        "description": "Base64-encoded image data (with or without data URI prefix)"
      },
      "mimeType": {
        "type": "string",
        "description": "MIME type (e.g., 'image/png', 'image/jpeg'). Auto-detected if omitted.",
        "default": "image/png"
      }
    },
    "required": ["base64String"]
  }
}
```

**Implementation:**
- Parse base64 input (handle `data:image/...;base64,` prefix)
- Decode to Uint8Array
- Support MIME type inference from data URI or explicit parameter
- Return as `LanguageModelDataPart.image(buffer, mimeType)`
- Error handling: invalid base64, unsupported MIME type

### Tool 3: Fetch Image from URL
**Tool Name:** `imgFromUrl`

**Manifest Config:**
```json
{
  "name": "imgFromUrl",
  "tags": ["image", "network"],
  "displayName": "Image from URL",
  "modelDescription": "Fetches an image from a URL and provides it as image data for analysis",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "description": "HTTP(S) URL pointing to an image file"
      },
      "timeout": {
        "type": "number",
        "description": "Request timeout in milliseconds",
        "default": 30000
      }
    },
    "required": ["url"]
  }
}
```

**Implementation:**
- Validate URL (security: prevent SSRF, only allow http/https)
- Use `node-fetch` or native HTTP to download image
- Extract MIME type from Content-Type header
- Implement timeout and size limits (e.g., max 50MB)
- Return as `LanguageModelDataPart.image(buffer, mimeType)`
- Error handling: invalid URL, network errors, timeout, too large

---

## 🔗 Phase 3: Integration with VLM Image API

### Phase 3.1: Tool Return Format Standardization
- All three tools must return consistent format:
  ```typescript
  interface ImageToolResult {
    content: Array<
      LanguageModelTextPart | LanguageModelDataPart
    >;
  }
  ```
- Text part: Metadata summary (file size, format, source)
- Data part: Actual image buffer in VLM-compatible format

### Phase 3.2: Extended Metadata (Future Enhancement)
- Return additional metadata:
  - Image dimensions (width, height)
  - Color depth / number of channels
  - File format details
  - File size in bytes

### Phase 3.3: Error Handling & User Feedback
- Graceful error messages for:
  - Unsupported formats
  - File access errors
  - Network issues
  - Size/dimension violations
- Provide actionable error suggestions

---

## 🧪 Phase 4: Testing & Validation

### Phase 4.1: Unit Tests
- Test each tool's `invoke()` method
- Mock file system and network requests
- Validate input validation logic
- Test error scenarios

### Phase 4.2: Integration Tests
- Test tool registration in VS Code extension context
- Test tool discovery via `vscode.lm.tools`
- Test tool invocation through LM API

### Phase 4.3: Manual Testing
- Test with real VS Code extension host
- Test with actual Copilot chat interface
- Verify image data is correctly passed to VLM
- Test with sample images (PNG, JPEG, GIF, WebP, BMP)

---

## 📦 Phase 5: Packaging & Distribution

### Phase 5.1: Extension Metadata
- Update README with:
  - Installation instructions
  - Usage examples in Copilot chat
  - Supported image formats
  - Prerequisites (VS Code version, Copilot availability)

### Phase 5.2: Build & Pack
- Create `vsce` build pipeline
- Generate `.vsix` package
- Test package installation

### Phase 5.3: VS Code Marketplace (Optional)
- Prepare marketplace publisher account
- Create marketplace-ready documentation
- Publish extension

---

## 🏗️ Technical Architecture

### Extension Structure
```
copilot-read-image/
├── src/
│   ├── extension.ts              # Extension entry point
│   ├── tools/
│   │   ├── index.ts              # Tool registration
│   │   ├── readImageFromPath.ts  # Local file tool
│   │   ├── imgFromBase64.ts      # Base64 decoding tool
│   │   └── imgFromUrl.ts         # URL fetching tool
│   ├── utils/
│   │   ├── imageFormat.ts        # Existing magic-byte detection
│   │   ├── mimeType.ts           # MIME type utilities
│   │   └── validation.ts         # Input validation
│   └── types/
│       └── index.ts              # TypeScript interfaces
├── tests/
│   ├── readImageFromPath.test.ts
│   ├── imgFromBase64.test.ts
│   └── imgFromUrl.test.ts
├── package.json                  # VS Code extension manifest
├── tsconfig.json
└── README.md
```

### Key Dependencies
- `vscode` - VS Code API (peerDependency)
- `node-fetch` or built-in HTTP - URL downloading
- Existing: `TypeScript`, `ESLint`, `Prettier`, `Jest`

### Tool Implementation Pattern
```typescript
class ImageTool implements vscode.LanguageModelTool<InputType> {
  invoke(
    options: vscode.LanguageModelToolInvocationOptions<InputType>,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.LanguageModelToolResult> {
    // 1. Validate input
    // 2. Process image
    // 3. Return LanguageModelToolResult with:
    //    - LanguageModelTextPart (description)
    //    - LanguageModelDataPart.image() (binary data)
  }
}
```

---

## 📅 Implementation Roadmap

| Phase | Status | Priority | Effort |
|-------|--------|----------|--------|
| **Phase 1: VS Code Extension Migration** | Not Started | HIGH | 2-3 days |
| Phase 1.1: Extension Manifest | - | HIGH | 0.5 days |
| Phase 1.2: Entry Point & Registration | - | HIGH | 1 day |
| Phase 1.3: Dependencies & Config | - | MEDIUM | 0.5 days |
| **Phase 2: Image Tools Implementation** | Not Started | HIGH | 3-4 days |
| Phase 2.1: Local File Tool | - | HIGH | 1 day |
| Phase 2.2: Base64 Tool | - | HIGH | 0.5 days |
| Phase 2.3: URL Fetching Tool | - | HIGH | 1.5 days |
| **Phase 3: VLM Integration** | Not Started | MEDIUM | 1-2 days |
| **Phase 4: Testing & Validation** | Not Started | HIGH | 2-3 days |
| **Phase 5: Packaging & Distribution** | Not Started | MEDIUM | 1 day |

---

## ✅ Definition of Done

- [ ] Extension activates and registers all 3 tools
- [ ] Tools appear in Copilot chat as available options
- [ ] All tools can be invoked and return proper image data
- [ ] Image data is VLM-compatible and can be processed
- [ ] All unit and integration tests pass
- [ ] README includes usage examples
- [ ] Extension can be packaged and installed

---

## 🚀 Next Steps

1. **Phase 1:** Convert project structure to VS Code extension
2. **Phase 2:** Implement the three image reading tools
3. **Phase 3:** Validate VLM image integration
4. **Phase 4:** Comprehensive testing
5. **Phase 5:** Package for distribution

