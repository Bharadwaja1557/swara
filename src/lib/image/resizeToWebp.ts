/**
 * src/lib/image/resizeToWebp.ts
 *
 * Resize a user-selected image to 512×512 and convert to WebP.
 *
 * PIPELINE:
 *   File → MIME validation → objectURL → <img> → Canvas (512×512 crop) → Blob (webp q=0.82)
 *
 * KEY FIXES vs previous version:
 *   1. objectURL is NOT revoked inside onload — it must stay alive until
 *      drawImage() completes. Revoke happens after canvas.toBlob() resolves.
 *   2. img.crossOrigin = 'anonymous' prevents Safari tainted-canvas errors.
 *   3. MIME validation rejects unsupported types before attempting decode.
 *   4. HEIC (iPhone) detected early with a clear user-facing error.
 *
 * SUPPORTED INPUT FORMATS:
 *   jpg, jpeg, png, webp, gif, avif
 *
 * REJECTED INPUT FORMATS (with user-friendly messages):
 *   heic, heif  — unreliable canvas decode on most browsers
 *   svg         — not raster, decode behavior undefined
 *   bmp, tiff   — rarely used, skip for now
 */

const TARGET_SIZE  = 512;
const WEBP_QUALITY = 0.82;

// ── MIME gating ───────────────────────────────────────────────────────────────

const SUPPORTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const HEIC_TYPES = new Set([
  'image/heic',
  'image/heif',
]);

/**
 * Validate a file's MIME type before attempting resize.
 * Throws a human-readable error string (not an Error object) so callers
 * can display it directly in a toast / UI message.
 */
export function validateImageMime(file: File): void {
  const type = file.type.toLowerCase();

  if (HEIC_TYPES.has(type) || file.name.toLowerCase().match(/\.(heic|heif)$/)) {
    throw 'HEIC images from iPhone are not supported yet. Please use JPG or PNG.';
  }

  if (type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    throw 'SVG files cannot be used as playlist covers. Please upload a JPG or PNG.';
  }

  if (!type.startsWith('image/') || !SUPPORTED_TYPES.has(type)) {
    throw `Unsupported format "${type || file.name.split('.').pop()}". Please use JPG, PNG, or WebP.`;
  }
}

// ── Image loading ─────────────────────────────────────────────────────────────

/**
 * Load a File into an HTMLImageElement via objectURL.
 *
 * IMPORTANT: The objectURL is NOT revoked here — it must stay alive
 * until drawImage() has consumed the decoded pixels. The caller is
 * responsible for calling URL.revokeObjectURL(url) after canvas work.
 */
function loadImageFromFile(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    // crossOrigin prevents Safari from marking the canvas as tainted,
    // which would make toBlob() return null with no error.
    img.crossOrigin = 'anonymous';

    img.onload  = () => resolve({ img, url }); // do NOT revoke here
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject('Could not decode the image. Please try a different file.');
    };

    img.src = url;
  });
}

// ── Canvas crop ───────────────────────────────────────────────────────────────

/**
 * Draw the image onto a TARGET_SIZE × TARGET_SIZE canvas using object-cover logic
 * (scale so the shorter side fills the canvas, then centre-crop).
 */
function cropToSquareCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas  = document.createElement('canvas');
  canvas.width  = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d')!;

  const scale = Math.max(TARGET_SIZE / img.naturalWidth, TARGET_SIZE / img.naturalHeight);
  const sw    = img.naturalWidth  * scale;
  const sh    = img.naturalHeight * scale;
  const sx    = (TARGET_SIZE - sw) / 2;
  const sy    = (TARGET_SIZE - sh) / 2;

  ctx.drawImage(img, sx, sy, sw, sh);
  return canvas;
}

// ── Blob export ───────────────────────────────────────────────────────────────

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) return resolve(blob);
      // WebP not supported (very rare) — fall back to JPEG
      canvas.toBlob((fallback) => {
        if (fallback) return resolve(fallback);
        reject('Canvas could not produce an image blob. Please try again.');
      }, 'image/jpeg', WEBP_QUALITY);
    }, 'image/webp', WEBP_QUALITY);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ResizeResult {
  blob:       Blob;
  mimeType:   string;
  extension:  'webp' | 'jpg';
  sizeBytes:  number;
}

/**
 * Resize a user-selected image file to 512×512 WebP.
 *
 * Call validateImageMime(file) before this if you want early MIME rejection
 * with a user-facing message, or call this directly (it validates internally).
 *
 * @throws string  — human-readable error suitable for toast display.
 */
export async function resizeToWebp(file: File): Promise<ResizeResult> {
  // Validate MIME before any async work
  validateImageMime(file);

  // Load image — objectURL kept alive until after drawImage
  const { img, url } = await loadImageFromFile(file);

  let canvas: HTMLCanvasElement;
  try {
    canvas = cropToSquareCanvas(img);
  } finally {
    // Safe to revoke now — drawImage() has consumed the pixels
    URL.revokeObjectURL(url);
  }

  const blob   = await canvasToBlob(canvas);
  const isWebp = blob.type === 'image/webp';

  return {
    blob,
    mimeType:  blob.type,
    extension: isWebp ? 'webp' : 'jpg',
    sizeBytes: blob.size,
  };
}
