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
    LanguageModelPromptTsxPart: class {},
  }),
  { virtual: true }
);

import { ImgFromBase64Tool } from '../src/tools';

describe('ImgFromBase64Tool', () => {
  const tool = new ImgFromBase64Tool();
  const fakeToken = {} as Parameters<typeof tool.invoke>[1];

  // Minimal valid PNG bytes (magic bytes only)
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]);
  const pngBase64 = pngBytes.toString('base64');

  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  const jpegBase64 = jpegBytes.toString('base64');

  it('decodes a plain base64-encoded PNG and returns metadata + image data', async () => {
    const result = await tool.invoke(
      { input: { base64Data: pngBase64 } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    expect(result.content).toHaveLength(2);

    const textPart = result.content[0] as { value: string };
    const parsed = JSON.parse(textPart.value);
    expect(parsed.mimeType).toBe('image/png');
    expect(parsed.decodedSize).toBe(pngBytes.length);
    expect(parsed.source).toBe('base64');
    expect(parsed.originalSize).toBe(pngBase64.length);

    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/png');
    expect(dataPart.data).toBeInstanceOf(Uint8Array);
    expect(dataPart.data.length).toBe(pngBytes.length);
  });

  it('strips data URI prefix and extracts MIME type', async () => {
    const dataUri = `data:image/jpeg;base64,${jpegBase64}`;
    const result = await tool.invoke(
      { input: { base64Data: dataUri } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/jpeg');
    expect(Buffer.from(dataPart.data).slice(0, 3)).toEqual(jpegBytes.slice(0, 3));
  });

  it('prefers data URI MIME type over explicit mimeType param', async () => {
    const dataUri = `data:image/png;base64,${pngBase64}`;
    const result = await tool.invoke(
      { input: { base64Data: dataUri, mimeType: 'image/jpeg' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/png');
  });

  it('uses explicit mimeType param when no data URI prefix', async () => {
    // Use JPEG bytes but pass explicitly as image/jpeg (auto-detect would also work)
    const result = await tool.invoke(
      { input: { base64Data: jpegBase64, mimeType: 'image/jpeg' } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/jpeg');
  });

  it('handles URL-safe base64 encoding (- and _ characters)', async () => {
    // Encode bytes to standard base64, then convert to URL-safe
    const standard = pngBase64;
    const urlSafe = standard.replace(/\+/g, '-').replace(/\//g, '_');
    const result = await tool.invoke(
      { input: { base64Data: urlSafe } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );

    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.data.length).toBe(pngBytes.length);
  });

  it('throws for empty base64Data', async () => {
    await expect(
      tool.invoke(
        { input: { base64Data: '' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('base64Data must not be empty');
  });

  it('throws for whitespace-only base64Data', async () => {
    await expect(
      tool.invoke(
        { input: { base64Data: '   ' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('base64Data must not be empty');
  });

  it('throws for invalid base64 characters', async () => {
    await expect(
      tool.invoke(
        { input: { base64Data: 'not-valid-base64!!!' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Invalid base64 encoding');
  });

  it('throws for unsupported MIME type from data URI', async () => {
    const dataUri = `data:image/tiff;base64,${pngBase64}`;
    await expect(
      tool.invoke(
        { input: { base64Data: dataUri } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Unsupported MIME type');
  });

  it('throws for unsupported explicit MIME type', async () => {
    // Use bytes that won't auto-detect to a known format
    const unknownBytes = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    await expect(
      tool.invoke(
        {
          input: {
            base64Data: unknownBytes.toString('base64'),
            mimeType: 'image/tiff',
          },
        } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Unsupported MIME type');
  });

  it('throws when decoded data exceeds 50 MB', async () => {
    // Create a base64 string that decodes to >50MB by mocking Buffer.from
    const bigBuf = Buffer.alloc(51 * 1024 * 1024, 0x89); // 51MB of 0x89
    const bigBase64 = bigBuf.toString('base64');
    await expect(
      tool.invoke(
        { input: { base64Data: bigBase64, mimeType: 'image/png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Decoded image too large');
  });

  it('accepts image/gif MIME type from data URI', async () => {
    const gifBytes = Buffer.from([0x47, 0x49, 0x46, 0x00]);
    const dataUri = `data:image/gif;base64,${gifBytes.toString('base64')}`;
    const result = await tool.invoke(
      { input: { base64Data: dataUri } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );
    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/gif');
  });

  it('accepts image/webp MIME type from data URI', async () => {
    const webpBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00]);
    const dataUri = `data:image/webp;base64,${webpBytes.toString('base64')}`;
    const result = await tool.invoke(
      { input: { base64Data: dataUri } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );
    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/webp');
  });

  it('accepts image/bmp MIME type from data URI', async () => {
    const bmpBytes = Buffer.from([0x42, 0x4d, 0x00]);
    const dataUri = `data:image/bmp;base64,${bmpBytes.toString('base64')}`;
    const result = await tool.invoke(
      { input: { base64Data: dataUri } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );
    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/bmp');
  });

  it('accepts image/svg+xml MIME type from data URI', async () => {
    const svgBytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
    const dataUri = `data:image/svg+xml;base64,${svgBytes.toString('base64')}`;
    const result = await tool.invoke(
      { input: { base64Data: dataUri } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );
    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/svg+xml');
  });

  it('defaults to image/png when no MIME type can be determined', async () => {
    // Unknown magic bytes, no explicit mimeType, no data URI
    const unknownBytes = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const result = await tool.invoke(
      { input: { base64Data: unknownBytes.toString('base64') } } as Parameters<typeof tool.invoke>[0],
      fakeToken
    );
    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/png');
  });
});
