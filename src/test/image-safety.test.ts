import { describe, expect, it } from "vitest";

import { sanitizeImageDataUrl, sanitizeImageSource } from "@/lib/image-safety";

const pngDataUrl = "data:image/png;base64,iVBORw0KGgo=";
const jpegDataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const webpDataUrl = "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBg=";

describe("sanitizeImageDataUrl", () => {
  it("accepts genuine raster data URLs", () => {
    expect(sanitizeImageDataUrl(pngDataUrl)).toBe(pngDataUrl);
    expect(sanitizeImageDataUrl(jpegDataUrl)).toBe(jpegDataUrl);
    expect(sanitizeImageDataUrl(webpDataUrl)).toBe(webpDataUrl);
  });

  it("rejects SVG and other non-raster data URLs", () => {
    expect(sanitizeImageDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe("");
    expect(sanitizeImageDataUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe("");
    expect(sanitizeImageDataUrl("data:image/png,notbase64")).toBe("");
  });

  it("rejects values that are not strings, are empty, or exceed the limit", () => {
    expect(sanitizeImageDataUrl(null)).toBe("");
    expect(sanitizeImageDataUrl(42)).toBe("");
    expect(sanitizeImageDataUrl("   ")).toBe("");
    expect(sanitizeImageDataUrl(pngDataUrl, 10)).toBe("");
  });
});

describe("sanitizeImageSource", () => {
  it("accepts same-origin paths, HTTPS URLs, and safe data URLs", () => {
    expect(sanitizeImageSource("/images/product.png")).toBe("/images/product.png");
    expect(sanitizeImageSource("https://example.com/product.png")).toBe(
      "https://example.com/product.png",
    );
    expect(sanitizeImageSource(pngDataUrl)).toBe(pngDataUrl);
  });

  it("rejects script, blob, protocol-relative, and plain HTTP sources", () => {
    expect(sanitizeImageSource("javascript:alert(1)")).toBe("");
    expect(sanitizeImageSource("blob:https://example.com/123")).toBe("");
    expect(sanitizeImageSource("//evil.example.com/image.png")).toBe("");
    expect(sanitizeImageSource("http://example.com/image.png")).toBe("");
  });

  it("rejects values that are not strings, are empty, or too long", () => {
    expect(sanitizeImageSource(undefined)).toBe("");
    expect(sanitizeImageSource("")).toBe("");
    expect(sanitizeImageSource(`https://example.com/${"a".repeat(3_000)}`)).toBe("");
  });
});
