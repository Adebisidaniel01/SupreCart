import { describe, expect, it } from "vitest";

import {
  AVATAR_MAX_BYTES,
  avatarErrorMessage,
  sellerAvatarStoragePath,
  sniffImageMimeType,
  validateAvatarFile,
} from "@/lib/avatar";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const notAnImage = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e, 0x0a]);

function fakeFile(bytes: Uint8Array, overrideSize?: number): File {
  return {
    size: overrideSize ?? bytes.length,
    slice: () => ({ arrayBuffer: async () => bytes.buffer }),
  } as unknown as File;
}

describe("sniffImageMimeType", () => {
  it("detects real image signatures", () => {
    expect(sniffImageMimeType(jpeg)).toBe("image/jpeg");
    expect(sniffImageMimeType(png)).toBe("image/png");
    expect(sniffImageMimeType(webp)).toBe("image/webp");
  });

  it("rejects non-image content", () => {
    expect(sniffImageMimeType(notAnImage)).toBeNull();
    expect(sniffImageMimeType(new Uint8Array([]))).toBeNull();
  });
});

describe("validateAvatarFile", () => {
  it("rejects an empty file", async () => {
    await expect(validateAvatarFile(fakeFile(new Uint8Array([])))).resolves.toEqual({
      ok: false,
      code: "empty",
    });
  });

  it("rejects files larger than 2 MB", async () => {
    await expect(validateAvatarFile(fakeFile(jpeg, AVATAR_MAX_BYTES + 1))).resolves.toEqual({
      ok: false,
      code: "size",
    });
  });

  it("rejects content that only pretends to be an image", async () => {
    // The file name / MIME type would say image/png, but the bytes say HTML.
    await expect(validateAvatarFile(fakeFile(notAnImage))).resolves.toEqual({
      ok: false,
      code: "content",
    });
  });

  it("accepts genuine images and reports the sniffed type", async () => {
    await expect(validateAvatarFile(fakeFile(png))).resolves.toEqual({
      ok: true,
      mimeType: "image/png",
    });
  });
});

describe("sellerAvatarStoragePath", () => {
  it("scopes the object key to the seller id", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    expect(sellerAvatarStoragePath(id, "image/webp")).toBe(`${id}/avatar.webp`);
    expect(sellerAvatarStoragePath(id, "image/png")).toBe(`${id}/avatar.png`);
    expect(sellerAvatarStoragePath(id, "image/jpeg")).toBe(`${id}/avatar.jpg`);
  });
});

describe("avatarErrorMessage", () => {
  it("returns a helpful message for every error code", () => {
    for (const code of ["type", "size", "empty", "content", "decode"] as const) {
      expect(avatarErrorMessage(code).length).toBeGreaterThan(0);
    }
  });
});
