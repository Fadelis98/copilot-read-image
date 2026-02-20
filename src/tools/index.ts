import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { detectFormat, ImageFormat } from '../index';

export interface ReadImageFromPathInput {
  imagePath: string;
}

export interface ImgFromBase64Input {
  base64Data: string;
  mimeType?: string;
}

export interface ImgFromUrlInput {
  imageUrl: string;
}

/** Represents a binary image data part returned in the tool result. */
interface ImageDataPart {
  data: Buffer;
  mimeType: string;
}

const MIME_TYPE_MAP: Record<Exclude<ImageFormat, 'unknown'>, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export class ReadImageFromPathTool
  implements vscode.LanguageModelTool<ReadImageFromPathInput>
{
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ReadImageFromPathInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { imagePath } = options.input;

    const resolvedPath = path.resolve(imagePath);

    // Security: prevent relative path traversal outside working directory
    if (!path.isAbsolute(imagePath)) {
      const cwd = process.cwd();
      if (!resolvedPath.startsWith(cwd + path.sep)) {
        throw new Error(
          `Path traversal detected: "${imagePath}" resolves outside the working directory`
        );
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Image file not found: ${resolvedPath}`);
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      throw new Error(`Not a file: ${resolvedPath}`);
    }

    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(
        `File too large: ${stats.size} bytes (maximum allowed is ${MAX_FILE_SIZE} bytes)`
      );
    }

    const data = await fs.promises.readFile(resolvedPath);
    const format = detectFormat(data);

    if (format === 'unknown') {
      throw new Error(
        `Unsupported image format: "${resolvedPath}" (supported: PNG, JPEG, GIF, WebP, BMP)`
      );
    }

    const mimeType = MIME_TYPE_MAP[format];
    const metadata = JSON.stringify({
      name: path.basename(resolvedPath),
      size: stats.size,
      format,
      source: resolvedPath,
    });

    const imagePart: ImageDataPart = { data, mimeType };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(metadata),
      imagePart as unknown as vscode.LanguageModelPromptTsxPart,
    ]);
  }
}

const SUPPORTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
]);

export class ImgFromBase64Tool
  implements vscode.LanguageModelTool<ImgFromBase64Input>
{
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ImgFromBase64Input>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { base64Data, mimeType: explicitMimeType } = options.input;

    if (!base64Data || base64Data.trim() === '') {
      throw new Error('base64Data must not be empty');
    }

    let raw = base64Data.trim();
    let detectedMimeType: string | undefined;

    // Strip data URI prefix and extract MIME type
    const dataUriMatch = raw.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataUriMatch) {
      detectedMimeType = dataUriMatch[1];
      raw = dataUriMatch[2];
    }

    // Normalize URL-safe base64 (- → +, _ → /) and strip whitespace
    raw = raw.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');

    // Validate base64 character set
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(raw)) {
      throw new Error('Invalid base64 encoding: contains invalid characters');
    }

    const data = Buffer.from(raw, 'base64');

    if (data.length === 0 && raw.length > 0) {
      throw new Error('Invalid base64 encoding: decoded to empty buffer');
    }

    if (data.length > MAX_FILE_SIZE) {
      throw new Error(
        `Decoded image too large: ${data.length} bytes (maximum allowed is ${MAX_FILE_SIZE} bytes)`
      );
    }

    // MIME type priority: data URI > explicit param > auto-detect > default
    const format = detectFormat(data);
    const autoMimeType = format !== 'unknown' ? MIME_TYPE_MAP[format] : undefined;
    const mimeType = detectedMimeType ?? explicitMimeType ?? autoMimeType ?? 'image/png';

    if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
      throw new Error(
        `Unsupported MIME type: "${mimeType}" (supported: ${[...SUPPORTED_MIME_TYPES].join(', ')})`
      );
    }

    const metadata = JSON.stringify({
      originalSize: base64Data.length,
      decodedSize: data.length,
      mimeType,
      source: 'base64',
    });

    const imagePart: ImageDataPart = { data, mimeType };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(metadata),
      imagePart as unknown as vscode.LanguageModelPromptTsxPart,
    ]);
  }
}

export class ImgFromUrlTool implements vscode.LanguageModelTool<ImgFromUrlInput> {
  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<ImgFromUrlInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    // TODO: Phase 2 – implement actual image fetching from URL
    return new vscode.LanguageModelToolResult([]);
  }
}
