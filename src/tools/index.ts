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
  timeout?: number;
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

// ---------------------------------------------------------------------------
// ImgFromUrlTool helpers
// ---------------------------------------------------------------------------

const MAX_REDIRECT_HOPS = 5;
const MAX_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 30_000;

interface FetchResult {
  data: Buffer;
  mimeType: string;
  contentLength: number;
  fetchTimeMs: number;
}

function isPrivateIpv4(parts: number[]): boolean {
  const [a, b] = parts;
  return (
    a === 127 || // 127.0.0.0/8 loopback
    a === 10 || // 10.0.0.0/8 private
    a === 0 || // 0.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 168) || // 192.168.0.0/16 private
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local
    (a === 100 && b >= 64 && b <= 127) // 100.64.0.0/10 shared address space
  );
}

function isPrivateIpv6(addr: string): boolean {
  const lower = addr.toLowerCase();

  // Loopback (::1); WHATWG URL spec normalises IPv6 to compressed form
  if (lower === '::1') return true;

  // For range checks, parse the first 16-bit group as a number so we
  // handle compressed notation like 'fc0::1' (= 0x0fc0, not ULA) correctly.
  const firstColon = lower.indexOf(':');
  if (firstColon <= 0) return false; // starts with '::' → already handled above

  const groupHex = lower.slice(0, firstColon).padStart(4, '0');
  const groupVal = parseInt(groupHex, 16);
  if (isNaN(groupVal)) return false;

  const highByte = (groupVal >> 8) & 0xff;
  const lowByte = groupVal & 0xff;

  // fc00::/7  – Unique Local Address (first byte 0xfc or 0xfd)
  if (highByte === 0xfc || highByte === 0xfd) return true;

  // fe80::/10 – Link-Local (first byte 0xfe, second byte 0x80–0xbf)
  if (highByte === 0xfe && lowByte >= 0x80 && lowByte <= 0xbf) return true;

  return false;
}

/** Validate URL protocol and reject private/loopback targets (SSRF). */
function validateImageUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: "${rawUrl}"`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Unsupported protocol: "${parsed.protocol.replace(':', '')}" (only http and https are allowed)`
    );
  }

  // Strip IPv6 brackets for analysis
  const hostname = parsed.hostname;
  const host = hostname.startsWith('[') ? hostname.slice(1, -1) : hostname;

  if (host.toLowerCase() === 'localhost') {
    throw new Error(`SSRF protection: requests to "${hostname}" are not allowed`);
  }

  if (net.isIPv4(host)) {
    const parts = host.split('.').map(Number);
    if (isPrivateIpv4(parts)) {
      throw new Error(`SSRF protection: requests to "${hostname}" are not allowed`);
    }
  }

  if (net.isIPv6(host)) {
    if (isPrivateIpv6(host)) {
      throw new Error(`SSRF protection: requests to "${hostname}" are not allowed`);
    }
  }

  return parsed;
}

/** Fetch a URL, following redirects. Enforces size and timeout limits. */
function fetchUrl(
  urlString: string,
  timeoutMs: number,
  redirectsLeft: number,
  visitedUrls: Set<string>
): Promise<FetchResult> {
  return new Promise((resolve, reject) => {
    if (visitedUrls.has(urlString)) {
      reject(new Error('Redirect loop detected'));
      return;
    }
    visitedUrls.add(urlString);

    const startTime = Date.now();
    const parsedUrl = new URL(urlString);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    let settled = false;
    const settle = (err: Error | null, result?: FetchResult): void => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(result!);
    };

    const req = client.get(urlString, { timeout: timeoutMs }, (res) => {
      const statusCode = res.statusCode ?? 0;
      const { headers } = res;

      // Handle redirects
      if (statusCode >= 300 && statusCode < 400) {
        res.resume();
        if (redirectsLeft <= 0) {
          settle(new Error(`Too many redirects (max ${MAX_REDIRECT_HOPS})`));
          return;
        }
        const location = headers.location;
        if (!location) {
          settle(new Error('Redirect response missing Location header'));
          return;
        }
        let redirectUrl: string;
        try {
          redirectUrl = new URL(location, urlString).toString();
        } catch {
          settle(new Error(`Invalid redirect URL: "${location}"`));
          return;
        }
        try {
          validateImageUrl(redirectUrl);
        } catch (validationErr) {
          settle(validationErr as Error);
          return;
        }
        fetchUrl(redirectUrl, timeoutMs, redirectsLeft - 1, visitedUrls)
          .then((result) => settle(null, result))
          .catch((fetchErr) => settle(fetchErr));
        return;
      }

      // Non-2xx status
      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        settle(new Error(`HTTP error: ${statusCode}`));
        return;
      }

      // Check Content-Length before downloading
      const contentLengthHeader = headers['content-length'];
      if (contentLengthHeader) {
        const declared = parseInt(contentLengthHeader, 10);
        if (!isNaN(declared) && declared > MAX_FILE_SIZE) {
          res.resume();
          settle(
            new Error(
              `Response too large: ${declared} bytes (maximum allowed is ${MAX_FILE_SIZE} bytes)`
            )
          );
          return;
        }
      }

      // Extract MIME type from Content-Type header
      const rawContentType = headers['content-type'] ?? '';
      const mimeType = rawContentType.split(';')[0].trim().toLowerCase();

      // Stream body with running size limit
      const chunks: Buffer[] = [];
      let totalSize = 0;
      let oversized = false;

      res.on('data', (chunk: Buffer) => {
        if (oversized) return;
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          oversized = true;
          req.destroy(new Error(`Response too large: exceeded ${MAX_FILE_SIZE} bytes`));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        if (oversized) return;
        const data = Buffer.concat(chunks);
        settle(null, {
          data,
          mimeType,
          contentLength: data.length,
          fetchTimeMs: Date.now() - startTime,
        });
      });

      res.on('error', (err) => settle(err));
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => settle(err));
  });
}

export class ImgFromUrlTool implements vscode.LanguageModelTool<ImgFromUrlInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ImgFromUrlInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { imageUrl, timeout: timeoutInput } = options.input;

    // Clamp timeout: use input if valid, otherwise default; never exceed max
    const timeoutMs = Math.min(
      typeof timeoutInput === 'number' && timeoutInput > 0 ? timeoutInput : DEFAULT_TIMEOUT_MS,
      MAX_TIMEOUT_MS
    );

    // Validate URL (throws on invalid format, unsupported protocol, SSRF)
    validateImageUrl(imageUrl);

    // Fetch image
    const { data, mimeType: rawMimeType, contentLength, fetchTimeMs } = await fetchUrl(
      imageUrl,
      timeoutMs,
      MAX_REDIRECT_HOPS,
      new Set()
    );

    // Determine MIME type: Content-Type header first, then magic-byte fallback
    let mimeType = rawMimeType;
    if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
      const format = detectFormat(data);
      if (format !== 'unknown') {
        mimeType = MIME_TYPE_MAP[format];
      }
    }

    if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
      throw new Error(
        `Unsupported Content-Type: "${rawMimeType}" (supported: ${[...SUPPORTED_MIME_TYPES].join(', ')})`
      );
    }

    const metadata = JSON.stringify({
      sourceUrl: imageUrl,
      size: contentLength,
      mimeType,
      fetchTimeMs,
    });

    const imagePart: ImageDataPart = { data, mimeType };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(metadata),
      imagePart as unknown as vscode.LanguageModelPromptTsxPart,
    ]);
  }
}
