// https://github.com/withastro/astro/blob/85060cda7949dd65820d511b021ab294c0e2c009/packages/astro/src/assets/services/sharp.ts
import type { ImageQualityPreset, LocalImageService } from 'astro';
import { baseService } from 'astro/assets';
import { AstroError } from 'astro/errors';
import type { FitEnum, FormatEnum, SharpOptions } from 'sharp';

type ImageFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down' | (string & {});
type ImageOutputFormat = 'avif' | 'png' | 'webp' | 'jpeg' | 'jpg' | 'svg' | (string & {});

type BaseServiceTransform = {
  src: string;
  width?: number;
  height?: number;
  format: string;
  quality?: string | null;
  fit?: ImageFit;
  position?: string;
};

function parseQuality(quality: string): string | number {
  let result = Number.parseInt(quality);
  if (Number.isNaN(result)) {
    return quality;
  }

  return result;
}

interface SharpImageServiceConfig {
  /**
   * The `limitInputPixels` option passed to Sharp. See https://sharp.pixelplumbing.com/api-constructor for more information
   */
  limitInputPixels?: SharpOptions['limitInputPixels'];
  /**
   * Maximum output image width. Defaults to 1920 when omitted.
   */
  maxWidth?: number;
}

let sharp: typeof import('sharp');

const qualityTable: Record<ImageQualityPreset, number> = {
  low: 25,
  mid: 50,
  high: 80,
  max: 100,
};

const DEFAULT_MAX_IMAGE_WIDTH = 1920;

async function loadSharp() {
  let sharpImport: typeof import('sharp');
  try {
    sharpImport = (await import('sharp')).default;
  } catch {
    throw new AstroError('MissingSharp');
  }

  // Disable the `sharp` `libvips` cache as it errors when the file is too small and operations are happening too fast (runs into a race condition) https://github.com/lovell/sharp/issues/3935#issuecomment-1881866341
  sharpImport.cache(false);

  return sharpImport;
}

const fitMap: Record<ImageFit, keyof FitEnum> = {
  fill: 'fill',
  contain: 'inside',
  cover: 'cover',
  none: 'outside',
  'scale-down': 'inside',
  outside: 'outside',
  inside: 'inside',
};

const sharpService: LocalImageService<SharpImageServiceConfig> = {
  validateOptions: baseService.validateOptions,
  getURL: baseService.getURL,
  parseURL: baseService.parseURL,
  getHTMLAttributes: baseService.getHTMLAttributes,
  getSrcSet: baseService.getSrcSet,

  async transform(
    inputBuffer,
    transformOptions,
    config,
  ): Promise<{
    data: Uint8Array;
    format: ImageOutputFormat;
  }> {
    if (!sharp) sharp = await loadSharp();
    const transform: BaseServiceTransform = transformOptions as BaseServiceTransform;

    // Return SVGs as-is
    if (transform.format === 'svg') return { data: inputBuffer, format: 'svg' };

    const result = sharp(inputBuffer, {
      failOnError: false,
      pages: -1,
      limitInputPixels: config.service.config.limitInputPixels,
    });

    // always call rotate to adjust for EXIF data orientation
    result.rotate();

    // get some information about the input
    const { format } = await result.metadata();
    const configuredMaxWidth = config.service.config.maxWidth;
    const maxWidth =
      typeof configuredMaxWidth === 'number' && Number.isFinite(configuredMaxWidth)
        ? Math.round(configuredMaxWidth)
        : DEFAULT_MAX_IMAGE_WIDTH;

    const requestedWidth = transform.width ? Math.round(transform.width) : undefined;
    const clampedWidth = requestedWidth && maxWidth > 0 ? Math.min(requestedWidth, maxWidth) : requestedWidth;

    // If `fit` isn't set then use old behavior:
    // - Do not use both width and height for resizing, and prioritize width over height
    // - Allow enlarging images

    if (transform.width && transform.height) {
      const fit: keyof FitEnum | undefined = transform.fit
        ? transform.fit in fitMap
          ? fitMap[transform.fit]
          : 'inside'
        : undefined;

      result.resize({
        width: clampedWidth,
        height: Math.round(transform.height),
        fit,
        position: transform.position,
        withoutEnlargement: true,
      });
    } else if (transform.height && !transform.width) {
      result.resize({
        height: Math.round(transform.height),
        withoutEnlargement: true,
      });
    } else if (transform.width) {
      result.resize({
        width: clampedWidth,
        withoutEnlargement: true,
      });
    } else if (maxWidth > 0) {
      // When width is not explicitly requested, cap output width to avoid oversized assets.
      result.resize({
        width: maxWidth,
        withoutEnlargement: true,
      });
    }
    if (transform.format) {
      let quality: number | string | undefined = undefined;
      if (transform.quality) {
        const parsedQuality = parseQuality(transform.quality);
        if (typeof parsedQuality === 'number') {
          quality = parsedQuality;
        } else {
          quality = transform.quality in qualityTable ? qualityTable[transform.quality] : undefined;
        }
      }

      if (transform.format === 'webp' && format === 'gif') {
        // Convert animated GIF to animated WebP with loop=0 (infinite)
        result.webp({ quality: typeof quality === 'number' ? quality : undefined, loop: 0 });
      } else {
        result.toFormat(transform.format as keyof FormatEnum, { quality });
      }
    }

    const { data, info } = await result.toBuffer({ resolveWithObject: true });

    return {
      data: new Uint8Array(data),
      format: info.format,
    };
  },
};

export default sharpService;
