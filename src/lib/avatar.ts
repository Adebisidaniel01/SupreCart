export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_SIZE = 400;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
export const AVATAR_OUTPUT_TYPE = "image/webp";

export const avatarMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarMimeType = (typeof avatarMimeTypes)[number];

export type AvatarErrorCode = "type" | "size" | "empty" | "content" | "decode";

export type AvatarValidation =
  { ok: true; mimeType: AvatarMimeType } | { ok: false; code: AvatarErrorCode };

export type ProcessedAvatar =
  | {
      ok: true;
      dataUrl: string;
      blob: Blob;
      mimeType: AvatarMimeType;
      width: number;
      height: number;
    }
  | { ok: false; code: AvatarErrorCode };

export function avatarErrorMessage(code: AvatarErrorCode): string {
  switch (code) {
    case "type":
      return "Choose a JPG, PNG, or WebP image.";
    case "size":
      return "Choose an image that is 2 MB or smaller.";
    case "empty":
      return "That file is empty. Choose another image.";
    case "content":
      return "That file is not a real JPG, PNG, or WebP image — only the file name looked right.";
    default:
      return "We could not read that image. Re-export it and try again.";
  }
}

/**
 * Reads the leading bytes of a file and returns the image type based on its
 * real signature, ignoring the file extension and the browser-reported MIME
 * type (both of which a user can forge).
 */
export function sniffImageMimeType(bytes: Uint8Array): AvatarMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function validateAvatarFile(file: File): Promise<AvatarValidation> {
  if (file.size === 0) return { ok: false, code: "empty" };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, code: "size" };
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const mimeType = sniffImageMimeType(header);
  if (!mimeType) return { ok: false, code: "content" };
  return { ok: true, mimeType };
}

type DecodedImage = {
  width: number;
  height: number;
  source: CanvasImageSource;
  release: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      release: () => bitmap.close(),
    };
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("decode"));
      element.src = objectUrl;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      source: image,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (cause) {
    URL.revokeObjectURL(objectUrl);
    throw cause;
  }
}

/**
 * Validates the real contents of a file and returns a centre-cropped,
 * square AVATAR_SIZE image as both a data URL and a Blob.
 */
export async function processAvatarFile(file: File): Promise<ProcessedAvatar> {
  const validation = await validateAvatarFile(file);
  if (!validation.ok) return validation;

  let decoded: DecodedImage;
  try {
    decoded = await decodeImage(file);
  } catch {
    return { ok: false, code: "decode" };
  }

  try {
    const side = Math.min(decoded.width, decoded.height);
    if (!side || !Number.isFinite(side)) return { ok: false, code: "decode" };
    const sourceX = (decoded.width - side) / 2;
    const sourceY = (decoded.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return { ok: false, code: "decode" };
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(decoded.source, sourceX, sourceY, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, AVATAR_OUTPUT_TYPE, 0.9),
    );
    if (!blob) return { ok: false, code: "decode" };
    return {
      ok: true,
      dataUrl: canvas.toDataURL(AVATAR_OUTPUT_TYPE, 0.9),
      blob,
      mimeType: AVATAR_OUTPUT_TYPE,
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
    };
  } finally {
    decoded.release();
  }
}

const avatarExtensions: Record<AvatarMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Object-storage key for a seller avatar. The leading folder is the seller id,
 * which the storage RLS policies use to scope writes to the owner.
 */
export function sellerAvatarStoragePath(sellerId: string, mimeType: AvatarMimeType): string {
  return `${sellerId}/avatar.${avatarExtensions[mimeType]}`;
}
