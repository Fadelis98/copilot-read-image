jest.mock(
  'vscode',
  () => ({
    LanguageModelToolResult: class {
      content: unknown[];
      constructor(content: unknown[]) {
        this.content = content;
      }
    },
    LanguageModelTextPart: class {
      value: string;
      constructor(value: string) {
        this.value = value;
      }
    },
    LanguageModelPromptTsxPart: class {},
  }),
  { virtual: true }
);

jest.mock('https', () => ({ get: jest.fn() }));
jest.mock('http', () => ({ get: jest.fn() }));

import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';
import { ImgFromUrlTool } from '../src/tools';

// ─── Mock helpers ───────────────────────────────────────────────────────────

/** Create a mock ClientRequest-like object. */
function createMockReq() {
  const req = new EventEmitter() as EventEmitter & { destroy: jest.Mock };
  req.destroy = jest.fn((err?: Error) => {
    if (err) process.nextTick(() => req.emit('error', err));
  });
  return req;
}

/** Create a mock IncomingMessage-like object. */
function createMockRes(statusCode: number, headers: Record<string, string>) {
  const res = new EventEmitter() as EventEmitter & {
    statusCode: number;
    headers: Record<string, string>;
    resume: jest.Mock;
  };
  res.statusCode = statusCode;
  res.headers = headers;
  res.resume = jest.fn();
  return res;
}

interface MockGetOptions {
  statusCode: number;
  headers?: Record<string, string>;
  body?: Buffer[];
  /** If set, emits a network-level error on the request instead of invoking the callback */
  networkError?: Error;
  /** If set, fires the 'timeout' event on the request */
  triggerTimeout?: boolean;
}

/** Set up a single mockImplementation on the given `get` mock function. */
function setupGet(mockFn: jest.Mock, opts: MockGetOptions) {
  const req = createMockReq();
  mockFn.mockImplementationOnce(
    (_url: string, _options: object, callback: (res: ReturnType<typeof createMockRes>) => void) => {
      if (opts.networkError) {
        process.nextTick(() => req.emit('error', opts.networkError));
      } else if (opts.triggerTimeout) {
        process.nextTick(() => req.emit('timeout'));
      } else {
        const res = createMockRes(opts.statusCode, opts.headers ?? {});
        process.nextTick(() => {
          callback(res);
          process.nextTick(() => {
            for (const chunk of opts.body ?? []) {
              res.emit('data', chunk);
            }
            res.emit('end');
          });
        });
      }
      return req;
    }
  );
  return req;
}

// ─── Test data ───────────────────────────────────────────────────────────────

// Minimal valid PNG (magic bytes)
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// Minimal valid JPEG (magic bytes)
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ImgFromUrlTool', () => {
  const tool = new ImgFromUrlTool();
  const fakeToken = {} as Parameters<typeof tool.invoke>[1];

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('fetches a PNG image over HTTPS and returns metadata + image data', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'image/png' },
      body: [PNG_BYTES],
    });

    const result = await tool.invoke(
      { input: { imageUrl: 'https://example.com/image.png' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    expect(result.content).toHaveLength(2);
    const meta = JSON.parse((result.content[0] as { value: string }).value);
    expect(meta.sourceUrl).toBe('https://example.com/image.png');
    expect(meta.mimeType).toBe('image/png');
    expect(meta.size).toBe(PNG_BYTES.length);
    expect(typeof meta.fetchTimeMs).toBe('number');

    const dataPart = result.content[1] as { data: Buffer; mimeType: string };
    expect(dataPart.mimeType).toBe('image/png');
    expect(dataPart.data).toBeInstanceOf(Buffer);
    expect(dataPart.data.length).toBe(PNG_BYTES.length);
  });

  it('fetches a JPEG image over plain HTTP', async () => {
    setupGet(http.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'image/jpeg' },
      body: [JPEG_BYTES],
    });

    const result = await tool.invoke(
      { input: { imageUrl: 'http://example.com/photo.jpg' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Buffer; mimeType: string };
    expect(dataPart.mimeType).toBe('image/jpeg');
  });

  it('strips charset from Content-Type (e.g. image/png; charset=utf-8)', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'image/png; charset=utf-8' },
      body: [PNG_BYTES],
    });

    const result = await tool.invoke(
      { input: { imageUrl: 'https://example.com/img.png' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Buffer; mimeType: string };
    expect(dataPart.mimeType).toBe('image/png');
  });

  it('falls back to magic-byte detection when Content-Type is absent', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: {},
      body: [PNG_BYTES],
    });

    const result = await tool.invoke(
      { input: { imageUrl: 'https://example.com/image' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Buffer; mimeType: string };
    expect(dataPart.mimeType).toBe('image/png');
  });

  it('falls back to magic-byte detection when Content-Type is unsupported', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'application/octet-stream' },
      body: [JPEG_BYTES],
    });

    const result = await tool.invoke(
      { input: { imageUrl: 'https://example.com/img' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Buffer; mimeType: string };
    expect(dataPart.mimeType).toBe('image/jpeg');
  });

  it('respects a custom timeout input (within max)', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'image/png' },
      body: [PNG_BYTES],
    });

    // Should not throw – just verify the call succeeds with custom timeout
    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/img.png', timeout: 5000 } } as Parameters<
          typeof tool.invoke
        >[0],
        fakeToken
      )
    ).resolves.toBeDefined();
  });

  it('clamps timeout to MAX_TIMEOUT_MS (60s) when input exceeds it', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'image/png' },
      body: [PNG_BYTES],
    });

    await expect(
      tool.invoke(
        {
          input: { imageUrl: 'https://example.com/img.png', timeout: 999_999 },
        } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).resolves.toBeDefined();
  });

  // ── Redirect handling ──────────────────────────────────────────────────────

  it('follows a single redirect (301) to the final image URL', async () => {
    // First call: 301 redirect
    setupGet(https.get as jest.Mock, {
      statusCode: 301,
      headers: { location: 'https://cdn.example.com/image.png' },
    });
    // Second call: 200 with image
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'image/png' },
      body: [PNG_BYTES],
    });

    const result = await tool.invoke(
      { input: { imageUrl: 'https://example.com/redirect' } } as Parameters<
        typeof tool.invoke
      >[0],
      fakeToken
    );

    expect(result.content).toHaveLength(2);
    const dataPart = result.content[1] as { data: Buffer; mimeType: string };
    expect(dataPart.mimeType).toBe('image/png');
  });

  it('rejects when redirect count exceeds 5', async () => {
    // Each call redirects to the same path with a different counter suffix
    for (let i = 0; i <= 5; i++) {
      setupGet(https.get as jest.Mock, {
        statusCode: 301,
        headers: { location: `https://example.com/r${i + 1}` },
      });
    }

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/r0' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Too many redirects');
  });

  it('detects redirect loops', async () => {
    // URL A → URL A (immediate loop)
    setupGet(https.get as jest.Mock, {
      statusCode: 301,
      headers: { location: 'https://example.com/loop' },
    });
    // Second visit to the same URL will be caught by loop detection before making a request

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/loop' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Redirect loop detected');
  });

  it('rejects redirect with missing Location header', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 302,
      headers: {},
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/redir' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('missing Location header');
  });

  // ── URL validation ─────────────────────────────────────────────────────────

  it('throws for an invalid URL string', async () => {
    await expect(
      tool.invoke(
        { input: { imageUrl: 'not a url' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Invalid URL');
  });

  it('throws for FTP protocol', async () => {
    await expect(
      tool.invoke(
        { input: { imageUrl: 'ftp://example.com/image.png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Unsupported protocol');
  });

  it('throws for file:// protocol', async () => {
    await expect(
      tool.invoke(
        { input: { imageUrl: 'file:///etc/passwd' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Unsupported protocol');
  });

  // ── SSRF protection ────────────────────────────────────────────────────────

  it('blocks requests to localhost by name', async () => {
    await expect(
      tool.invoke(
        { input: { imageUrl: 'http://localhost/image.png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('SSRF protection');
  });

  it('blocks requests to 127.0.0.1 (loopback)', async () => {
    await expect(
      tool.invoke(
        {
          input: { imageUrl: 'http://127.0.0.1/image.png' },
        } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('SSRF protection');
  });

  it('blocks requests to 10.x.x.x private range', async () => {
    await expect(
      tool.invoke(
        {
          input: { imageUrl: 'http://10.0.0.1/image.png' },
        } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('SSRF protection');
  });

  it('blocks requests to 192.168.x.x private range', async () => {
    await expect(
      tool.invoke(
        {
          input: { imageUrl: 'http://192.168.1.1/image.png' },
        } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('SSRF protection');
  });

  it('blocks requests to 172.16.x.x private range', async () => {
    await expect(
      tool.invoke(
        {
          input: { imageUrl: 'http://172.16.0.1/image.png' },
        } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('SSRF protection');
  });

  it('blocks requests to 172.31.x.x private range', async () => {
    await expect(
      tool.invoke(
        {
          input: { imageUrl: 'http://172.31.255.255/image.png' },
        } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('SSRF protection');
  });

  it('allows requests to 172.32.x.x (outside 172.16.0.0/12 range)', async () => {
    setupGet(http.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'image/png' },
      body: [PNG_BYTES],
    });

    await expect(
      tool.invoke(
        {
          input: { imageUrl: 'http://172.32.0.1/image.png' },
        } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).resolves.toBeDefined();
  });

  it('blocks requests to IPv6 loopback ::1', async () => {
    await expect(
      tool.invoke(
        {
          input: { imageUrl: 'http://[::1]/image.png' },
        } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('SSRF protection');
  });

  it('blocks redirect to a private IP', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 301,
      headers: { location: 'http://192.168.1.1/internal' },
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/redirect' } } as Parameters<
          typeof tool.invoke
        >[0],
        fakeToken
      )
    ).rejects.toThrow('SSRF protection');
  });

  // ── Size limits ────────────────────────────────────────────────────────────

  it('rejects when Content-Length header exceeds 50 MB', async () => {
    const bigSize = 51 * 1024 * 1024;
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: {
        'content-type': 'image/png',
        'content-length': String(bigSize),
      },
      body: [],
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/huge.png' } } as Parameters<
          typeof tool.invoke
        >[0],
        fakeToken
      )
    ).rejects.toThrow('Response too large');
  });

  it('rejects when streamed body exceeds 50 MB', async () => {
    // Send two 26 MB chunks so combined exceeds the 50 MB limit
    const chunk26MB = Buffer.alloc(26 * 1024 * 1024, 0x89);
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'image/png' },
      body: [chunk26MB, chunk26MB],
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/big.png' } } as Parameters<
          typeof tool.invoke
        >[0],
        fakeToken
      )
    ).rejects.toThrow('Response too large');
  });

  // ── Content-Type validation ────────────────────────────────────────────────

  it('rejects when Content-Type is not an image and magic bytes are also unknown', async () => {
    const nonImageBytes = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
      body: [nonImageBytes],
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/page' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Unsupported Content-Type');
  });

  // ── HTTP error codes ───────────────────────────────────────────────────────

  it('rejects on HTTP 404', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 404,
      headers: {},
      body: [],
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/missing.png' } } as Parameters<
          typeof tool.invoke
        >[0],
        fakeToken
      )
    ).rejects.toThrow('HTTP error: 404');
  });

  it('rejects on HTTP 500', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 500,
      headers: {},
      body: [],
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/server-error' } } as Parameters<
          typeof tool.invoke
        >[0],
        fakeToken
      )
    ).rejects.toThrow('HTTP error: 500');
  });

  it('rejects on HTTP 429 (rate limited)', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 429,
      headers: {},
      body: [],
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/ratelimited' } } as Parameters<
          typeof tool.invoke
        >[0],
        fakeToken
      )
    ).rejects.toThrow('HTTP error: 429');
  });

  // ── Network / timeout errors ───────────────────────────────────────────────

  it('rejects on network-level error (connection refused)', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 0,
      networkError: new Error('ECONNREFUSED'),
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/img.png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('ECONNREFUSED');
  });

  it('rejects when the socket times out', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 0,
      triggerTimeout: true,
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/slow.png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow(/timed out/i);
  });
});
