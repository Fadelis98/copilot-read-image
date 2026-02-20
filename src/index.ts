import * as fs from 'fs';
import * as path from 'path';

/**
 * Supported image formats.
 */
export type ImageFormat = 'png' | 'jpeg' | 'gif' | 'webp' | 'bmp' | 'unknown';

/**
 * Result returned by readImage.
 */
export interface ImageResult {
  /** Resolved absolute path to the image file. */
  filePath: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** Detected image format. */
  format: ImageFormat;
  /** Raw file contents as a Buffer. */
  data: Buffer;
}

/** Magic-byte signatures for common image formats. */
const FORMAT_SIGNATURES: Array<{ format: ImageFormat; bytes: number[] }> = [
  { format: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { format: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { format: 'gif', bytes: [0x47, 0x49, 0x46] },
  { format: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] },
  { format: 'bmp', bytes: [0x42, 0x4d] },
];

/**
 * Detect the image format from the first bytes of the file buffer.
 */
export function detectFormat(data: Buffer): ImageFormat {
  for (const { format, bytes } of FORMAT_SIGNATURES) {
    if (bytes.every((byte, i) => data[i] === byte)) {
      return format;
    }
  }
  return 'unknown';
}

/**
 * Read an image from a local file path and return its metadata and raw data.
 *
 * @param imagePath - Absolute or relative path to the image file.
 * @returns ImageResult containing file metadata and raw buffer.
 * @throws If the file does not exist or cannot be read.
 */
export async function readImage(imagePath: string): Promise<ImageResult> {
  const filePath = path.resolve(imagePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Image file not found: ${filePath}`);
  }

  const data = await fs.promises.readFile(filePath);
  const sizeBytes = data.byteLength;
  const format = detectFormat(data);

  return { filePath, sizeBytes, format, data };
}
