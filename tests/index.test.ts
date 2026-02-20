import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectFormat, readImage } from '../src/index';

describe('detectFormat', () => {
  it('detects PNG from magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]);
    expect(detectFormat(buf)).toBe('png');
  });

  it('detects JPEG from magic bytes', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    expect(detectFormat(buf)).toBe('jpeg');
  });

  it('detects GIF from magic bytes', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x00]);
    expect(detectFormat(buf)).toBe('gif');
  });

  it('detects WebP from magic bytes', () => {
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00]);
    expect(detectFormat(buf)).toBe('webp');
  });

  it('detects BMP from magic bytes', () => {
    const buf = Buffer.from([0x42, 0x4d, 0x00]);
    expect(detectFormat(buf)).toBe('bmp');
  });

  it('returns unknown for unrecognised bytes', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02]);
    expect(detectFormat(buf)).toBe('unknown');
  });
});

describe('readImage', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `test-image-${Date.now()}.png`);
    // Write a minimal PNG-like header
    fs.writeFileSync(tmpFile, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]));
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  });

  it('reads an existing image file and returns metadata', async () => {
    const result = await readImage(tmpFile);
    expect(result.filePath).toBe(path.resolve(tmpFile));
    expect(result.sizeBytes).toBe(6);
    expect(result.format).toBe('png');
    expect(result.data).toBeInstanceOf(Buffer);
  });

  it('throws when the file does not exist', async () => {
    await expect(readImage('/nonexistent/image.png')).rejects.toThrow('Image file not found');
  });
});
