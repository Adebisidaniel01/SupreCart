const MAX_DATA_IMAGE_CHARS = 4_000_000;
const dataImagePattern = /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/]+={0,2}$/i;

/**
 * Accepts only base64 PNG, JPEG, or WebP data URLs. Anything else, including
 * SVG or HTML payloads disguised as an image, is dropped before it reaches an
 * <img> element.
 */
export function sanitizeImageDataUrl(value: unknown, maxChars = MAX_DATA_IMAGE_CHARS): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxChars) return "";
  return dataImagePattern.test(trimmed) ? trimmed : "";
}

/**
 * Allows same-origin paths, absolute HTTPS URLs, and safe raster image data
 * URLs. Rejects javascript:, blob:, protocol-relative, and non-HTTPS URLs.
 */
export function sanitizeImageSource(value: unknown, maxUrlLength = 2_048): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) return sanitizeImageDataUrl(trimmed);
  if (trimmed.length > maxUrlLength) return "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}
