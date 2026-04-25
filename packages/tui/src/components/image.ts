/**
 * Image Component
 * Renders images in terminal using Kitty or iTerm2 graphics protocol
 */
import type { UIElement, RenderContext } from '../tui.js';
import {
  getCapabilities,
  getImageDimensions,
  renderImage,
  imageFallback,
  type ImageDimensions,
} from '../terminal-image.js';

export interface ImageTheme {
  /** Function to color fallback text */
  fallbackColor: (str: string) => string;
}

export interface ImageOptions {
  /** Base64 encoded image data */
  base64Data: string;
  /** MIME type of the image */
  mimeType: string;
  /** Theme for styling fallback text */
  theme: ImageTheme;
  /** Maximum width in cells */
  maxWidthCells?: number;
  /** Maximum height in cells */
  maxHeightCells?: number;
  /** Filename for display in fallback */
  filename?: string;
  /** Kitty image ID for animations/updates */
  imageId?: number;
}

/**
 * Image component that renders inline images in supported terminals.
 * Falls back to text representation in unsupported terminals.
 * 
 * @example
 * const image = new Image({
 *   base64Data: imageData,
 *   mimeType: 'image/png',
 *   theme: { fallbackColor: (s) => `\x1b[90m${s}\x1b[0m` },
 *   maxWidthCells: 40,
 *   filename: 'screenshot.png'
 * });
 */
export class Image implements UIElement {
  private base64Data: string;
  private mimeType: string;
  private dimensions: ImageDimensions;
  private theme: ImageTheme;
  private maxWidthCells: number;
  private maxHeightCells?: number;
  private filename?: string;
  private imageId?: number;
  private cachedLines?: string[];
  private cachedContext?: RenderContext;

  constructor(options: ImageOptions) {
    this.base64Data = options.base64Data;
    this.mimeType = options.mimeType;
    this.theme = options.theme;
    this.maxWidthCells = options.maxWidthCells ?? 60;
    this.maxHeightCells = options.maxHeightCells;
    this.filename = options.filename;
    this.imageId = options.imageId;
    
    // Parse dimensions from image data or use defaults
    this.dimensions =
      getImageDimensions(options.base64Data, options.mimeType) ??
      { widthPx: 800, heightPx: 600 };
  }

  /**
   * Get the Kitty image ID used by this component
   */
  getImageId(): number | undefined {
    return this.imageId;
  }

  /**
   * Update image data (useful for animations)
   */
  setImageData(base64Data: string, mimeType: string, dimensions?: ImageDimensions): void {
    this.base64Data = base64Data;
    this.mimeType = mimeType;
    this.dimensions =
      dimensions ??
      getImageDimensions(base64Data, mimeType) ??
      this.dimensions;
    this.clearCache();
  }

  draw(context: RenderContext): string[] {
    // Cache hit
    if (this.cachedLines && this.isSameContext(context)) {
      return this.cachedLines;
    }

    const width = context.width;
    const maxWidth = Math.min(width - 2, this.maxWidthCells);
    const caps = getCapabilities();
    let lines: string[];

    if (caps.images) {
      const result = renderImage(this.base64Data, this.dimensions, {
        maxWidthCells: maxWidth,
        maxHeightCells: this.maxHeightCells,
        imageId: this.imageId,
      });

      if (result) {
        // Store image ID for cleanup
        if (result.imageId) {
          this.imageId = result.imageId;
        }

        // Return `rows` empty lines so TUI accounts for image height
        // Last line contains cursor-up + image sequence
        lines = [];
        for (let i = 0; i < result.rows - 1; i++) {
          lines.push('');
        }

        // Move cursor up to first row, then output image
        const moveUp = result.rows > 1 ? `\x1b[${result.rows - 1}A` : '';
        lines.push(moveUp + result.sequence);
      } else {
        // Render failed, show fallback
        lines = this.renderFallback();
      }
    } else {
      // Terminal doesn't support images
      lines = this.renderFallback();
    }

    this.cachedLines = lines;
    this.cachedContext = { ...context };
    return lines;
  }

  /**
   * Render fallback text when images aren't supported
   */
  private renderFallback(): string[] {
    const fallback = imageFallback(
      this.mimeType,
      this.dimensions,
      this.filename
    );
    return [this.theme.fallbackColor(fallback)];
  }

  /**
   * Check if context matches cached context
   */
  private isSameContext(context: RenderContext): boolean {
    if (!this.cachedContext) return false;
    return this.cachedContext.width === context.width &&
           this.cachedContext.height === context.height;
  }

  clearCache(): void {
    this.cachedLines = undefined;
    this.cachedContext = undefined;
  }
}
