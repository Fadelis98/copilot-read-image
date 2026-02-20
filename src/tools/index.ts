import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
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

    const dataUrl = `data:${mimeType};base64,${data.toString('base64')}`;

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(metadata),
      new vscode.LanguageModelTextPart(dataUrl),
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

    const dataUrl = `data:${mimeType};base64,${data.toString('base64')}`;

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(metadata),
      new vscode.LanguageModelTextPart(dataUrl),
    ]);
  }
}

export class ImgFromUrlTool implements vscode.LanguageModelTool<ImgFromUrlInput> {
  private static readonly MAX_REDIRECTS = 5;
  private static readonly TIMEOUT_MS = 30000; // 30 seconds
  private static readonly MAX_SIZE = MAX_FILE_SIZE; // 50 MB

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ImgFromUrlInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { imageUrl } = options.input;

    if (!imageUrl || imageUrl.trim() === '') {
      throw new Error('imageUrl must not be empty');
    }

    const url = new URL(imageUrl); // Validates URL format

    // SSRF protection: block private IP ranges and localhost
    this.validateUrlSecurity(url);

    const { data, contentType } = await this.fetchWithRedirects(url, new Set<string>(), 0);

    // MIME type detection: Content-Type header → auto-detect from magic bytes
    const format = detectFormat(data);
    const autoMimeType = format !== 'unknown' ? MIME_TYPE_MAP[format] : undefined;
    const headerMimeType = contentType && SUPPORTED_MIME_TYPES.has(contentType) ? contentType : undefined;
    const mimeType = headerMimeType ?? autoMimeType ?? 'image/png';

    if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
      throw new Error(
        `Unsupported MIME type: "${mimeType}" (supported: ${[...SUPPORTED_MIME_TYPES].join(', ')})`
      );
    }

    const metadata = JSON.stringify({
      url: imageUrl,
      size: data.length,
      mimeType,
      source: 'url',
    });

    const dataUrl = `data:${mimeType};base64,${data.toString('base64')}`;

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(metadata),
      new vscode.LanguageModelTextPart(dataUrl),
    ]);
  }

  private validateUrlSecurity(url: URL): void {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${url.protocol} (only http and https allowed)`);
    }

    const hostname = url.hostname.toLowerCase();

    // Block localhost
    if (hostname === 'localhost') {
      throw new Error('Access to localhost is not allowed');
    }

    if (net.isIPv4(hostname)) {
      const [a, b] = hostname.split('.').map((part) => Number(part));
      if (
        a === 127 || // loopback
        a === 0 || // 0.0.0.0/8
        a === 10 || // 10.0.0.0/8
        (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
        (a === 192 && b === 168) || // 192.168.0.0/16
        (a === 169 && b === 254) || // 169.254.0.0/16 (link-local)
        (a === 100 && b >= 64 && b <= 127) // 100.64.0.0/10
      ) {
        throw new Error('Access to private IP ranges is not allowed');
      }
    }

    if (net.isIPv6(hostname)) {
      const lower = hostname.toLowerCase();
      if (
        lower === '::1' ||
        lower.startsWith('fc') || // fc00::/7
        lower.startsWith('fd') || // fc00::/7
        lower.startsWith('fe8') || // fe80::/10
        lower.startsWith('fe9') ||
        lower.startsWith('fea') ||
        lower.startsWith('feb')
      ) {
        throw new Error('Access to private IP ranges is not allowed');
      }
    }
  }

  private async fetchWithRedirects(
    url: URL,
    visitedUrls: Set<string>,
    redirectCount: number
  ): Promise<{ data: Buffer; contentType?: string }> {
    const urlKey = url.toString();
    if (visitedUrls.has(urlKey)) {
      throw new Error('Redirect loop detected');
    }
    visitedUrls.add(urlKey);

    return new Promise((resolve, reject) => {
      const protocol = url.protocol === 'https:' ? https : http;
      let settled = false;

      const settle = (error?: Error, result?: { data: Buffer; contentType?: string }) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        if (error) {
          reject(error);
          return;
        }
        resolve(result as { data: Buffer; contentType?: string });
      };

      const req = protocol.get(url.toString(), (res) => {
        // Handle redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
          if (redirectCount >= ImgFromUrlTool.MAX_REDIRECTS) {
            res.resume();
            settle(new Error(`Too many redirects (max ${ImgFromUrlTool.MAX_REDIRECTS})`));
            return;
          }

          if (!res.headers.location) {
            res.resume();
            settle(new Error('Redirect response missing Location header'));
            return;
          }

          try {
            const redirectUrl = new URL(res.headers.location, url);
            this.validateUrlSecurity(redirectUrl);
            res.resume();
            this.fetchWithRedirects(redirectUrl, visitedUrls, redirectCount + 1)
              .then((result) => settle(undefined, result))
              .catch((error: Error) => settle(error));
          } catch (error) {
            settle(error instanceof Error ? error : new Error('Invalid redirect URL'));
          }
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          settle(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;

        res.on('data', (chunk: Buffer | string) => {
          const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          totalSize += bufferChunk.length;
          if (totalSize > ImgFromUrlTool.MAX_SIZE) {
            req.destroy();
            settle(
              new Error(
                `Response too large: ${totalSize} bytes (maximum allowed is ${ImgFromUrlTool.MAX_SIZE} bytes)`
              )
            );
            return;
          }
          chunks.push(bufferChunk);
        });

        res.on('end', () => {
          const data = Buffer.concat(chunks);
          const contentTypeHeader = res.headers['content-type'];
          const contentType = typeof contentTypeHeader === 'string'
            ? contentTypeHeader.split(';')[0].trim().toLowerCase()
            : undefined;
          settle(undefined, { data, contentType });
        });

        res.on('error', (error: Error) => {
          settle(error);
        });
      });

      const timeoutId = setTimeout(() => {
        req.destroy();
        settle(new Error(`Request timeout after ${ImgFromUrlTool.TIMEOUT_MS}ms`));
      }, ImgFromUrlTool.TIMEOUT_MS);

      req.on('error', (error: Error) => {
        settle(error);
      });
    });
  }
}
