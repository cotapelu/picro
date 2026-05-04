/**
 * Terminal Image Support
 * Provides image rendering capabilities for Kitty and iTerm2 protocols
 */

export type ImageProtocol = 'kitty' | 'iterm2' | 'sixel' | null;

export interface TerminalCapabilities {
  images: ImageProtocol;
  trueColor: boolean;
  hyperlinks: boolean;
}

export interface CellDimensions {
  widthPx: number;
  heightPx: number;
}

export interface ImageDimensions {
  widthPx: number;
  heightPx: number;
}

export interface ImageRenderOptions {
  maxWidthCells?: number;
  maxHeightCells?: number;
  preserveAspectRatio?: boolean;
  imageId?: number;
  sixelPayload?: string;
  /** Scaling behavior: fit/contain (preserve aspect, fit within), fill/cover (fill, may crop), stretch (ignore aspect) */
  scaleMode?: ScaleMode;
}

export enum ScaleMode {
  Fit = 'fit',
  Fill = 'fill',
  Stretch = 'stretch',
  Contain = 'contain', // alias for Fit
  Cover = 'cover',   // alias for Fill
}

// Cache
let cachedCapabilities: TerminalCapabilities | null = null;
let cellDimensions: CellDimensions = { widthPx: 9, heightPx: 18 };

// Custom image loader (optional)
let customImageLoader: ((url: string) => Promise<{ base64: string; mimeType: string; dimensions: ImageDimensions }>) | null = null;

export function setCustomImageLoader(loader: (url: string) => Promise<{ base64: string; mimeType: string; dimensions: ImageDimensions }>): void {
	customImageLoader = loader;
}

// Protocol prefixes
export const KITTY_PREFIX = '\x1b_G';
export const ITERM2_PREFIX = '\x1b]1337;File=';
const SIXEL_PREFIX = '\x1bP';
const SIXEL_SUFFIX = '\x1b\\';

// Cache for rendered image sequences (Kitty/iTerm2)
const renderCache = new Map<string, { sequence: string; rows: number; imageId?: number }>();

export function clearRenderCache(): void {
  renderCache.clear();
}

export function getCellDimensions(): CellDimensions {
  return { ...cellDimensions };
}

export function setCellDimensions(dims: CellDimensions): void {
  cellDimensions = { ...dims };
  // Invalidate render cache because rows depend on cell dimensions
  clearRenderCache();
}

export function detectCapabilities(): TerminalCapabilities {
  const termProgram = process.env.TERM_PROGRAM?.toLowerCase() || '';
  const term = process.env.TERM?.toLowerCase() || '';
  const colorTerm = process.env.COLORTERM?.toLowerCase() || '';

  if (process.env.KITTY_WINDOW_ID || termProgram === 'kitty') {
    return { images: 'kitty', trueColor: true, hyperlinks: true };
  }

  if (termProgram === 'ghostty' || term.includes('ghostty') || process.env.GHOSTTY_RESOURCES_DIR) {
    return { images: 'kitty', trueColor: true, hyperlinks: true };
  }

  if (process.env.WEZTERM_PANE || termProgram === 'wezterm') {
    return { images: 'kitty', trueColor: true, hyperlinks: true };
  }

  if (process.env.ITERM_SESSION_ID || termProgram === 'iterm.app') {
    return { images: 'iterm2', trueColor: true, hyperlinks: true };
  }

  // Sixel support detection (e.g., mlterm, konsole with sixel)
  if (term.includes('sixel') || process.env.COLORTERM?.includes('sixel')) {
    return { images: 'sixel', trueColor: true, hyperlinks: true };
  }

  if (termProgram === 'vscode') {
    return { images: null, trueColor: true, hyperlinks: true };
  }

  if (termProgram === 'alacritty') {
    return { images: null, trueColor: true, hyperlinks: true };
  }

  const trueColor = colorTerm === 'truecolor' || colorTerm === '24bit';
  return { images: null, trueColor, hyperlinks: true };
}

export function getCapabilities(): TerminalCapabilities {
  if (!cachedCapabilities) {
    cachedCapabilities = detectCapabilities();
  }
  return { ...cachedCapabilities };
}

export function resetCapabilitiesCache(): void {
  cachedCapabilities = null;
}

/** Override the cached capabilities. Useful in tests to exercise both code paths. */
export function setCapabilities(caps: TerminalCapabilities): void {
  cachedCapabilities = caps;
}

export function isImageLine(line: string): boolean {
  if (line.startsWith(KITTY_PREFIX) || line.startsWith(ITERM2_PREFIX)) {
    return true;
  }
  return line.includes(KITTY_PREFIX) || line.includes(ITERM2_PREFIX) || line.startsWith(SIXEL_PREFIX);
}

export function allocateImageId(): number {
  return Math.floor(Math.random() * 0xfffffffe) + 1;
}

export function encodeKitty(
  base64Data: string,
  options: { columns?: number; rows?: number; imageId?: number } = {}
): string {
  const CHUNK_SIZE = 4096;
  const params: string[] = ['a=T', 'f=100', 'q=2'];
  
  if (options.columns) params.push(`c=${options.columns}`);
  if (options.rows) params.push(`r=${options.rows}`);
  if (options.imageId) params.push(`i=${options.imageId}`);

  if (base64Data.length <= CHUNK_SIZE) {
    return `\x1b_G${params.join(',')};${base64Data}\x1b\\`;
  }

  const chunks: string[] = [];
  let offset = 0;
  let isFirst = true;

  while (offset < base64Data.length) {
    const chunk = base64Data.slice(offset, offset + CHUNK_SIZE);
    const isLast = offset + CHUNK_SIZE >= base64Data.length;

    if (isFirst) {
      chunks.push(`\x1b_G${params.join(',')},m=1;${chunk}\x1b\\`);
      isFirst = false;
    } else if (isLast) {
      chunks.push(`\x1b_Gm=0;${chunk}\x1b\\`);
    } else {
      chunks.push(`\x1b_Gm=1;${chunk}\x1b\\`);
    }
    offset += CHUNK_SIZE;
  }

  return chunks.join('');
}

export function deleteKittyImage(imageId: number): string {
  return `\x1b_Ga=d,d=I,i=${imageId}\x1b\\`;
}

export function deleteAllKittyImages(): string {
  return `\x1b_Ga=d,d=A\x1b\\`;
}

export function encodeITerm2(
  base64Data: string,
  options: {
    width?: number | string;
    height?: number | string;
    name?: string;
    preserveAspectRatio?: boolean;
    inline?: boolean;
  } = {}
): string {
  const params: string[] = [`inline=${options.inline !== false ? 1 : 0}`];
  
  if (options.width !== undefined) params.push(`width=${options.width}`);
  if (options.height !== undefined) params.push(`height=${options.height}`);
  if (options.name) {
    const nameBase64 = Buffer.from(options.name).toString('base64');
    params.push(`name=${nameBase64}`);
  }
  if (options.preserveAspectRatio === false) {
    params.push('preserveAspectRatio=0');
  }

  return `\x1b]1337;File=${params.join(';')}:${base64Data}\x07`;
}

/**
 * Encode Sixel image data.
 * @param sixelData - Raw sixel payload (already in sixel format, without prefix/suffix)
 * @param options - rows and cols in cells
 */
export function encodeSixel(
  sixelData: string,
  options: { rows?: number; cols?: number; imageId?: number } = {}
): string {
  const params: string[] = [];
  if (options.cols) params.push(`c=${options.cols}`);
  if (options.rows) params.push(`r=${options.rows}`);
  if (options.imageId) params.push(`i=${options.imageId}`);
  const paramString = params.length > 0 ? params.join(';') + ';' : '';
  return `${SIXEL_PREFIX}${paramString}${sixelData}${SIXEL_SUFFIX}`;
}

export function calculateImageRows(
  imageDimensions: ImageDimensions,
  targetWidthCells: number,
  cellDims?: CellDimensions
): number {
  const dims = cellDims ?? cellDimensions;
  const targetWidthPx = targetWidthCells * dims.widthPx;
  const scale = targetWidthPx / imageDimensions.widthPx;
  const scaledHeightPx = imageDimensions.heightPx * scale;
  const rows = Math.ceil(scaledHeightPx / dims.heightPx);
  return Math.max(1, rows);
}

// Image format parsers

export function getPngDimensions(base64Data: string): ImageDimensions | null {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length < 24) return null;
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
      return null;
    }
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { widthPx: width, heightPx: height };
  } catch {
    return null;
  }
}

export function getJpegDimensions(base64Data: string): ImageDimensions | null {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length < 2) return null;
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
    
    let offset = 2;
    while (offset < buffer.length - 9) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1]!;
      if (marker >= 0xc0 && marker <= 0xc2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { widthPx: width, heightPx: height };
      }
      if (offset + 3 >= buffer.length) return null;
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) return null;
      offset += 2 + length;
    }
    return null;
  } catch {
    return null;
  }
}

export function getGifDimensions(base64Data: string): ImageDimensions | null {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length < 10) return null;
    const sig = buffer.slice(0, 6).toString('ascii');
    if (sig !== 'GIF87a' && sig !== 'GIF89a') return null;
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    return { widthPx: width, heightPx: height };
  } catch {
    return null;
  }
}

export function getWebpDimensions(base64Data: string): ImageDimensions | null {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length < 30) return null;
    const riff = buffer.slice(0, 4).toString('ascii');
    const webp = buffer.slice(8, 12).toString('ascii');
    if (riff !== 'RIFF' || webp !== 'WEBP') return null;
    const chunk = buffer.slice(12, 16).toString('ascii');
    if (chunk === 'VP8 ') {
      if (buffer.length < 30) return null;
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { widthPx: width, heightPx: height };
    }
    if (chunk === 'VP8L') {
      if (buffer.length < 25) return null;
      const bits = buffer.readUInt32LE(21);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >> 14) & 0x3fff) + 1;
      return { widthPx: width, heightPx: height };
    }
    if (chunk === 'VP8X') {
      if (buffer.length < 30) return null;
      const width = ((buffer[24] ?? 0) | ((buffer[25] ?? 0) << 8) | ((buffer[26] ?? 0) << 16)) + 1;
      const height = ((buffer[27] ?? 0) | ((buffer[28] ?? 0) << 8) | ((buffer[29] ?? 0) << 16)) + 1;
      return { widthPx: width, heightPx: height };
    }
    return null;
  } catch {
    return null;
  }
}

export function getBmpDimensions(base64Data: string): ImageDimensions | null {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    // BMP header: 14 bytes, DIB header starts at 14. We expect BITMAPINFOHEADER (40 bytes) for dimensions.
    if (buffer.length < 26) return null; // at least 14+12? actually need up to offset 22 for width/height.
    // Check signature 'BM'
    if (buffer[0] !== 0x42 || buffer[1] !== 0x4D) return null;
    // Width at offset 18, height at offset 22 (both int32, little-endian)
    const width = buffer.readInt32LE(18);
    const height = Math.abs(buffer.readInt32LE(22)); // height can be negative for top-down
    return { widthPx: width, heightPx: height };
  } catch {
    return null;
  }
}

export function getTiffDimensions(base64Data: string): ImageDimensions | null {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length < 8) return null;
    const byteOrder = buffer.toString('ascii', 0, 2);
    const isLittle = byteOrder === 'II';
    const isBig = byteOrder === 'MM';
    if (!isLittle && !isBig) return null;
    const magic = isLittle ? buffer.readUInt16LE(2) : buffer.readUInt16BE(2);
    if (magic !== 0x002A) return null;
    const ifdOffset = isLittle ? buffer.readUInt32LE(4) : buffer.readUInt32BE(4);
    if (ifdOffset < 8 || ifdOffset + 2 > buffer.length) return null;
    const numEntries = isLittle ? buffer.readUInt16LE(ifdOffset) : buffer.readUInt16BE(ifdOffset);
    let width: number | null = null;
    let height: number | null = null;
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      if (entryOffset + 12 > buffer.length) break;
      const tag = isLittle ? buffer.readUInt16LE(entryOffset) : buffer.readUInt16BE(entryOffset);
      const type = isLittle ? buffer.readUInt16LE(entryOffset + 2) : buffer.readUInt16BE(entryOffset + 2);
      const count = isLittle ? buffer.readUInt32LE(entryOffset + 4) : buffer.readUInt32BE(entryOffset + 4);
      const valueOffset = isLittle ? buffer.readUInt32LE(entryOffset + 8) : buffer.readUInt32BE(entryOffset + 8);
      if (count < 1) continue;
      let val: number;
      if (type === 3 && count === 1) { // SHORT
        val = valueOffset & 0xffff;
      } else if (type === 4 && count === 1) { // LONG
        val = valueOffset;
      } else if (type === 3 && count > 1) {
        // multiple SHORTs, value is offset if valueOffset > 4 otherwise inline? For simplicity, assume inline if offset <=4? Not robust.
        // We'll only handle single-value cases for brevity.
        continue;
      } else {
        continue;
      }
      if (tag === 256) width = val; // ImageWidth
      else if (tag === 257) height = val; // ImageLength
      if (width !== null && height !== null) break;
    }
    if (width !== null && height !== null) {
      return { widthPx: width, heightPx: height };
    }
    return null;
  } catch {
    return null;
  }
}



export function getImageDimensions(base64Data: string, mimeType: string): ImageDimensions | null {
  if (mimeType === 'image/png') return getPngDimensions(base64Data);
  if (mimeType === 'image/jpeg') return getJpegDimensions(base64Data);
  if (mimeType === 'image/gif') return getGifDimensions(base64Data);
  if (mimeType === 'image/webp') return getWebpDimensions(base64Data);
  if (mimeType === 'image/bmp') return getBmpDimensions(base64Data);
  if (mimeType === 'image/tiff') return getTiffDimensions(base64Data);
  return null;
}

/**
 * Compute target cell dimensions (widthCells, heightCells) for an image
 * based on terminal cell size and scaling options.
 */
function computeImageCellSize(
  imageDimensions: ImageDimensions,
  options: ImageRenderOptions
): { widthCells: number; heightCells: number } {
  const maxWidthCells = options.maxWidthCells ?? 80;
  const maxHeightCells = options.maxHeightCells;
  const scaleMode = options.scaleMode ?? ScaleMode.Fit;

  const cellDims = getCellDimensions();
  const maxWidthPx = maxWidthCells * cellDims.widthPx;
  const maxHeightPx = maxHeightCells !== undefined ? maxHeightCells * cellDims.heightPx : Infinity;

  const imgW = imageDimensions.widthPx;
  const imgH = imageDimensions.heightPx;

  let renderWidthPx: number;
  let renderHeightPx: number;

  if (scaleMode === ScaleMode.Stretch) {
    renderWidthPx = maxWidthPx;
    if (maxHeightCells !== undefined) {
      renderHeightPx = maxHeightPx;
    } else {
      // Keep aspect ratio for height based on width
      renderHeightPx = imgH * (maxWidthPx / imgW);
    }
  } else if (scaleMode === ScaleMode.Fill || scaleMode === ScaleMode.Cover) {
    // Cover: scale to fill, may crop
    const scaleW = maxWidthPx / imgW;
    const scaleH = maxHeightCells !== undefined ? maxHeightPx / imgH : scaleW;
    const scale = Math.max(scaleW, scaleH);
    renderWidthPx = imgW * scale;
    renderHeightPx = imgH * scale;
  } else {
    // Fit / Contain: preserve aspect, fit within box
    const scaleW = maxWidthPx / imgW;
    const scaleH = maxHeightCells !== undefined ? maxHeightPx / imgH : scaleW;
    const scale = Math.min(scaleW, scaleH);
    renderWidthPx = imgW * scale;
    renderHeightPx = imgH * scale;
  }

  const widthCells = Math.max(1, Math.round(renderWidthPx / cellDims.widthPx));
  const heightCells = Math.max(1, Math.round(renderHeightPx / cellDims.heightPx));
  return { widthCells, heightCells };
}

export function renderImage(
  base64Data: string,
  imageDimensions: ImageDimensions,
  options: ImageRenderOptions = {}
): { sequence: string; rows: number; imageId?: number } | null {
  const caps = getCapabilities();
  if (!caps.images) return null;

  const maxWidthCells = options.maxWidthCells ?? 80;
  const maxHeightCells = options.maxHeightCells;
  const scaleMode = options.scaleMode ?? ScaleMode.Fit;

  // Compute layout (width in cells, height in rows)
  const { widthCells, heightCells } = computeImageCellSize(imageDimensions, {
    maxWidthCells,
    maxHeightCells,
    scaleMode,
    preserveAspectRatio: options.preserveAspectRatio,
    imageId: options.imageId,
    sixelPayload: options.sixelPayload,
  }) as { widthCells: number; heightCells: number };

  // Cache for Kitty and iTerm2
  if (caps.images === 'kitty' || caps.images === 'iterm2') {
    const cacheKey = `${caps.images}:${base64Data}:${maxWidthCells}:${maxHeightCells ?? ''}:${scaleMode}:${options.preserveAspectRatio ?? ''}:${options.imageId ?? ''}`;
    const cached = renderCache.get(cacheKey);
    if (cached) return cached;

    let result: { sequence: string; rows: number; imageId?: number };
    if (caps.images === 'kitty') {
      const imageId = options.imageId ?? allocateImageId();
      const sequence = encodeKitty(base64Data, { columns: widthCells, rows: heightCells, imageId });
      result = { sequence, rows: heightCells, imageId };
    } else {
      // iTerm2: width in pixels
      const cellDims = getCellDimensions();
      const widthPx = widthCells * cellDims.widthPx;
      const sequence = encodeITerm2(base64Data, {
        width: widthPx,
        height: 'auto',
        preserveAspectRatio: options.preserveAspectRatio ?? true,
      });
      result = { sequence, rows: heightCells };
    }
    renderCache.set(cacheKey, result);
    return result;
  }

  if (caps.images === 'sixel') {
    const sixelPayload = options.sixelPayload;
    if (!sixelPayload) return null;
    const sequence = encodeSixel(sixelPayload, { rows: heightCells, cols: widthCells });
    return { sequence, rows: heightCells };
  }

  return null;
}

/**
 * Fetch an image from a URL and convert it to base64 with dimensions.
 * Supports progress callback and abort signal.
 */
export async function fetchImageAsBase64(
  url: string,
  options?: {
    signal?: AbortSignal;
    onProgress?: (percent: number) => void;
  }
): Promise<{ base64: string; mimeType: string; dimensions: ImageDimensions }> {
  if (customImageLoader) {
    return customImageLoader(url);
  }
  const response = await fetch(url, { signal: options?.signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : null;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (total && options?.onProgress) {
        options.onProgress(Math.floor((received * 100) / total));
      }
    }
  }

  const buffer = Buffer.concat(chunks);
  const base64 = buffer.toString('base64');

  // Determine mime type from magic numbers
  const mimeType = detectMimeType(buffer);
  if (!mimeType) {
    throw new Error('Unsupported image format');
  }

  const dimensions = getImageDimensions(base64, mimeType);
  if (!dimensions) {
    throw new Error('Failed to extract image dimensions');
  }

  return { base64, mimeType, dimensions };
}

function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 4) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) return 'image/bmp'; // BM
    // TIFF: 'II' or 'MM' followed by 0x2A
    if ((buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4D && buffer[1] === 0x4D)) {
      if (buffer.length >= 4 && buffer[2] === (buffer[0] === 0x49 ? 0x2A : 0x00) && buffer[3] === (buffer[0] === 0x49 ? 0x00 : 0x2A)) {
        return 'image/tiff';
      }
    }
  }
  if (buffer.length >= 12) {
    const riff = buffer.slice(0, 4).toString('ascii');
    const webp = buffer.slice(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  }
  return null;
}

/**
 * Preload an image from a URL into the render cache.
 * This fetches and decodes the image, then renders it with default max width to cache the sequence.
 */
export async function preloadImage(
  url: string,
  options?: { maxWidthCells?: number }
): Promise<void> {
  const { base64, dimensions } = await fetchImageAsBase64(url);
  const caps = getCapabilities();
  if (!caps.images) return;
  // Call renderImage to cache the result (but don't use the sequence)
  renderImage(base64, dimensions, { maxWidthCells: options?.maxWidthCells ?? 80 });
}

/**
 * Render an animated GIF as a sequence of frames.
 * @param frames - Array of frames, each with base64 data and optional duration (ms)
 * @returns Array of render results with sequence and duration for each frame
 */
export function renderAnimatedGif(
	frames: Array<{ base64: string; duration?: number }>,
	options: ImageRenderOptions = {}
): Array<{ sequence: string; rows: number; imageId?: number; duration: number }> {
	const results: Array<{ sequence: string; rows: number; imageId?: number; duration: number }> = [];
	for (const frame of frames) {
		const dims = getImageDimensions(frame.base64, 'image/gif');
		if (!dims) continue;
		const render = renderImage(frame.base64, dims, options);
		if (render) {
			results.push({ ...render, duration: frame.duration ?? 100 });
		}
	}
	return results;
}

export function imageFallback(mimeType: string, dimensions?: ImageDimensions, filename?: string): string {
  const parts: string[] = [];
  if (filename) parts.push(filename);
  parts.push(`[${mimeType}]`);
  if (dimensions) parts.push(`${dimensions.widthPx}x${dimensions.heightPx}`);
  return `[Image: ${parts.join(' ')}]`;
}

/** Check if running in Termux session */
export function isTermuxSession(): boolean {
  return Boolean(process.env.TERMUX_VERSION);
}