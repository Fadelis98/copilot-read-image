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
    LanguageModelDataPart: class {
      data: Uint8Array;
      mimeType: string;
      constructor(data: Uint8Array, mimeType: string) {
        this.data = data;
        this.mimeType = mimeType;
      }
      static image(data: Uint8Array, mimeType: string) {
        return new this(data, mimeType);
      }
    },
  }),
  { virtual: true }
);

jest.mock('https', () => ({ get: jest.fn() }));
jest.mock('http', () => ({ get: jest.fn() }));

import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';
import { ImgFromUrlTool } from '../src/tools';

function createMockReq() {
  const req = new EventEmitter() as EventEmitter & {
    destroy: jest.Mock;
  };

  req.destroy = jest.fn((error?: Error) => {
    if (error) {
      process.nextTick(() => req.emit('error', error));
    }
  });

  return req;
}

function createMockRes(statusCode: number, headers: Record<string, string>) {
  const res = new EventEmitter() as EventEmitter & {
    statusCode: number;
    headers: Record<string, string>;
    statusMessage?: string;
    resume: jest.Mock;
  };

  res.statusCode = statusCode;
  res.statusMessage = statusCode === 404 ? 'Not Found' : 'OK';
  res.headers = headers;
  res.resume = jest.fn();

  return res;
}

interface MockGetOptions {
  statusCode: number;
  headers?: Record<string, string>;
  body?: Buffer[];
  networkError?: Error;
}

function setupGet(mockFn: jest.Mock, options: MockGetOptions) {
  const req = createMockReq();

  mockFn.mockImplementationOnce(
    (_url: string, callback: (res: ReturnType<typeof createMockRes>) => void) => {
      if (options.networkError) {
        process.nextTick(() => req.emit('error', options.networkError));
        return req;
      }

      const res = createMockRes(options.statusCode, options.headers ?? {});
      process.nextTick(() => {
        callback(res);
        process.nextTick(() => {
          for (const chunk of options.body ?? []) {
            res.emit('data', chunk);
          }
          res.emit('end');
        });
      });

      return req;
    }
  );

  return req;
}

describe('ImgFromUrlTool', () => {
  const tool = new ImgFromUrlTool();
  const fakeToken = {} as Parameters<typeof tool.invoke>[1];

  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fetches PNG image and returns metadata + image data part', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'image/png' },
      body: [pngBytes],
    });

    const result = await tool.invoke(
      { input: { imageUrl: 'https://example.com/image.png' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    expect(result.content).toHaveLength(2);

    const meta = JSON.parse((result.content[0] as { value: string }).value);
    expect(meta.url).toBe('https://example.com/image.png');
    expect(meta.mimeType).toBe('image/png');
    expect(meta.size).toBe(pngBytes.length);
    expect(meta.source).toBe('url');

    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/png');
    expect(Buffer.from(dataPart.data)).toEqual(pngBytes);
  });

  it('uses Content-Type header MIME when supported', async () => {
    setupGet(http.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'image/jpeg; charset=utf-8' },
      body: [jpegBytes],
    });

    const result = await tool.invoke(
      { input: { imageUrl: 'http://example.com/photo.jpg' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/jpeg');
  });

  it('falls back to magic-byte detection when Content-Type is absent', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: {},
      body: [pngBytes],
    });

    const result = await tool.invoke(
      { input: { imageUrl: 'https://example.com/image' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/png');
  });

  it('falls back to magic-byte detection when Content-Type is unsupported', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'application/octet-stream' },
      body: [jpegBytes],
    });

    const result = await tool.invoke(
      { input: { imageUrl: 'https://example.com/image' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/jpeg');
  });

  it('follows redirect and returns final image', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 301,
      headers: { location: 'https://cdn.example.com/final.png' },
    });
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      headers: { 'content-type': 'image/png' },
      body: [pngBytes],
    });

    const result = await tool.invoke(
      { input: { imageUrl: 'https://example.com/redirect' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/png');
  });

  it('rejects when redirect count exceeds max', async () => {
    for (let index = 0; index <= 5; index += 1) {
      setupGet(https.get as jest.Mock, {
        statusCode: 302,
        headers: { location: `https://example.com/r${index + 1}` },
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
    setupGet(https.get as jest.Mock, {
      statusCode: 302,
      headers: { location: 'https://example.com/loop' },
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/loop' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Redirect loop detected');
  });

  it('rejects redirect without location header', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 302,
      headers: {},
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/redirect' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Redirect response missing Location header');
  });

  it('rejects non-200 HTTP status', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 404,
      headers: { 'content-type': 'text/plain' },
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/missing' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('HTTP 404');
  });

  it('rejects network errors', async () => {
    setupGet(https.get as jest.Mock, {
      statusCode: 200,
      networkError: new Error('socket hang up'),
    });

    await expect(
      tool.invoke(
        { input: { imageUrl: 'https://example.com/image.png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('socket hang up');
  });

  it('rejects empty imageUrl', async () => {
    await expect(
      tool.invoke({ input: { imageUrl: '' } } as Parameters<typeof tool.invoke>[0], fakeToken)
    ).rejects.toThrow('imageUrl must not be empty');
  });

  it('rejects invalid URL', async () => {
    await expect(
      tool.invoke(
        { input: { imageUrl: 'not-a-valid-url' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow();
  });

  it('blocks localhost', async () => {
    await expect(
      tool.invoke(
        { input: { imageUrl: 'http://localhost:8080/test.png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Access to localhost is not allowed');
  });

  it('blocks loopback/private IPv4', async () => {
    await expect(
      tool.invoke(
        { input: { imageUrl: 'http://127.0.0.1/test.png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Access to private IP ranges is not allowed');

    await expect(
      tool.invoke(
        { input: { imageUrl: 'http://10.0.0.1/test.png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Access to private IP ranges is not allowed');

    await expect(
      tool.invoke(
        { input: { imageUrl: 'http://192.168.1.1/test.png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Access to private IP ranges is not allowed');
  });

  it('blocks unsupported protocols', async () => {
    await expect(
      tool.invoke(
        { input: { imageUrl: 'ftp://example.com/image.png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Unsupported protocol');
  });
});
