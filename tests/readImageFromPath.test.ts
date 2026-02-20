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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ReadImageFromPathTool } from '../src/tools';

describe('ReadImageFromPathTool', () => {
  const tool = new ReadImageFromPathTool();
  const fakeToken = {} as Parameters<typeof tool.invoke>[1];
  let tmpPng: string;

  beforeEach(() => {
    tmpPng = path.join(os.tmpdir(), `test-image-${Date.now()}.png`);
    fs.writeFileSync(tmpPng, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]));
  });

  afterEach(() => {
    if (fs.existsSync(tmpPng)) {
      fs.unlinkSync(tmpPng);
    }
  });

  it('returns text metadata and image data for a valid PNG file', async () => {
    const result = await tool.invoke({ input: { imagePath: tmpPng } } as Parameters<typeof tool.invoke>[0], fakeToken);

    expect(result.content).toHaveLength(2);

    const textPart = result.content[0] as { value: string };
    const parsed = JSON.parse(textPart.value);
    expect(parsed.name).toBe(path.basename(tmpPng));
    expect(parsed.format).toBe('png');
    expect(parsed.size).toBe(6);
    expect(parsed.source).toBe(tmpPng);

    const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
    expect(dataPart.mimeType).toBe('image/png');
    expect(dataPart.data).toBeInstanceOf(Uint8Array);
  });

  it('throws when the file does not exist', async () => {
    await expect(
      tool.invoke(
        { input: { imagePath: '/nonexistent/path/image.png' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Image file not found');
  });

  it('throws for an unsupported image format', async () => {
    const unknownFile = path.join(os.tmpdir(), `test-${Date.now()}.bin`);
    fs.writeFileSync(unknownFile, Buffer.from([0x00, 0x01, 0x02, 0x03]));
    try {
      await expect(
        tool.invoke(
          { input: { imagePath: unknownFile } } as Parameters<typeof tool.invoke>[0],
          fakeToken
        )
      ).rejects.toThrow('Unsupported image format');
    } finally {
      fs.unlinkSync(unknownFile);
    }
  });

  it('blocks a relative path traversal attempt', async () => {
    await expect(
      tool.invoke(
        { input: { imagePath: '../../../../etc/passwd' } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      )
    ).rejects.toThrow('Path traversal detected');
  });

  it('detects correct MIME type for JPEG files', async () => {
    const jpegFile = path.join(os.tmpdir(), `test-${Date.now()}.jpg`);
    fs.writeFileSync(jpegFile, Buffer.from([0xff, 0xd8, 0xff, 0x00]));
    try {
      const result = await tool.invoke(
        { input: { imagePath: jpegFile } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      );
      const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
      expect(dataPart.mimeType).toBe('image/jpeg');
    } finally {
      fs.unlinkSync(jpegFile);
    }
  });

  it('detects correct MIME type for GIF files', async () => {
    const gifFile = path.join(os.tmpdir(), `test-${Date.now()}.gif`);
    fs.writeFileSync(gifFile, Buffer.from([0x47, 0x49, 0x46, 0x00]));
    try {
      const result = await tool.invoke(
        { input: { imagePath: gifFile } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      );
      const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
      expect(dataPart.mimeType).toBe('image/gif');
    } finally {
      fs.unlinkSync(gifFile);
    }
  });

  it('detects correct MIME type for WebP files', async () => {
    const webpFile = path.join(os.tmpdir(), `test-${Date.now()}.webp`);
    fs.writeFileSync(webpFile, Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00]));
    try {
      const result = await tool.invoke(
        { input: { imagePath: webpFile } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      );
      const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
      expect(dataPart.mimeType).toBe('image/webp');
    } finally {
      fs.unlinkSync(webpFile);
    }
  });

  it('detects correct MIME type for BMP files', async () => {
    const bmpFile = path.join(os.tmpdir(), `test-${Date.now()}.bmp`);
    fs.writeFileSync(bmpFile, Buffer.from([0x42, 0x4d, 0x00]));
    try {
      const result = await tool.invoke(
        { input: { imagePath: bmpFile } } as Parameters<typeof tool.invoke>[0],
        fakeToken
      );
      const dataPart = result.content[1] as { data: Uint8Array; mimeType: string };
      expect(dataPart.mimeType).toBe('image/bmp');
    } finally {
      fs.unlinkSync(bmpFile);
    }
  });
});
