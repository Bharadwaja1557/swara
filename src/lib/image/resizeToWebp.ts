/**
 * src/lib/image/resizeToWebp.ts
 *
 * Resize an image file to 512×512 and convert to WebP.
 *
 * WHY WEBP:
 *   Smaller files (~30–50% vs JPEG), predictable format, good browser support,
 *   faster loading, better CDN caching.
 *
 * WHY 512×512:
 *   Playlist covers render at max ~280px on desktop hero — 512px gives 2x
 *   resolution on retina displays without bloating the upload.
 *
 * PIPELINE:
 *   File → <img> element → Canvas (512×512, object-cover crop) → Blob (webp, q=0.82)
 *
 * OBJECT-COVER CROP:
 *   Centres and crops the source image to fill 512×512 regardless of aspect
 *   ratio. Matches how the UI renders covers (object-cover).
 *
 * FALLBACK:
 *   If the browser doesn't support webp output (canvasBlob returns null),
 *   falls back to jpeg at the same quality.
 */

const TARGET_SIZE  = 512;
const WEBP_QUALITY = 0.82;

/**
 * Load a File/Blob into an HTMLImageElement.
 * Returns a promise that resolves with the loaded image.
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img  = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

/**
 * Crop + resize an image to TARGET_SIZE × TARGET_SIZE using object-cover logic.
 * Returns a canvas with the result drawn.
 */
function cropToSquareCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas  = document.createElement('canvas');
  canvas.width  = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Object-cover: scale so the shorter dimension fills TARGET_SIZE, then centre
  const scale  = Math.max(TARGET_SIZE / img.naturalWidth, TARGET_SIZE / img.naturalHeight);
  const sw     = img.naturalWidth  * scale;
  const sh     = img.naturalHeight * scale;
  const sx     = (TARGET_SIZE - sw) / 2;
  const sy     = (TARGET_SIZE - sh) / 2;

  ctx.drawImage(img, sx, sy, sw, sh);
  return canvas;
}

/**
 * Convert a canvas to a Blob.
 * Tries webp first; falls back to jpeg if unsupported.
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Try webp
    canvas.toBlob((blob) => {
      if (blob) return resolve(blob);
      // Fallback to jpeg
      canvas.toBlob((fallback) => {
        if (fallback) return resolve(fallback);
        reject(new Error('Canvas.toBlob returned null'));
      }, 'image/jpeg', WEBP_QUALITY);
    }, 'image/webp', WEBP_QUALITY);
  });
}

/**
 * Result of a resize operation.
 */
export interface ResizeResult {
  blob:        Blob;
  /** MIME type of the output ('image/webp' or 'image/jpeg'). */
  mimeType:    string;
  /** Suggested file extension. */
  extension:   'webp' | 'jpg';
  /** Size in bytes. */
  sizeBytes:   number;
}

/**
 * Resize a user-selected image to 512×512 WebP.
 * Input: any image File the user selected via <input type="file">.
 * Output: a ResizeResult ready for upload to Supabase Storage.
 *
 * @throws if the image cannot be decoded or the canvas API is unavailable.
 */
export async function resizeToWebp(file: File): Promise<ResizeResult> {
  const img    = await loadImage(file);
  const canvas = cropToSquareCanvas(img);
  const blob   = await canvasToBlob(canvas);
  const isWebp = blob.type === 'image/webp';

  return {
    blob,
    mimeType:  blob.type,
    extension: isWebp ? 'webp' : 'jpg',
    sizeBytes: blob.size,
  };
}
