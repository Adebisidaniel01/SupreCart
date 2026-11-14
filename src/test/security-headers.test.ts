import { describe, expect, it } from "vitest";

import { applySecurityHeaders, securityHeaders } from "@/lib/security-headers";

describe("securityHeaders", () => {
  it("locks down framing, sniffing, and plugin content", () => {
    const headers = securityHeaders();

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["permissions-policy"]).toContain("geolocation=()");
  });

  it("sets a restrictive content security policy", () => {
    const policy = securityHeaders()["content-security-policy"];

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(policy).toContain("font-src 'self' data: https://fonts.gstatic.com");
    expect(policy).not.toContain("img-src *");
    expect(policy).not.toContain("script-src *");
  });
});

describe("applySecurityHeaders", () => {
  it("adds the security headers while keeping existing response headers", () => {
    const response = new Response("ok", {
      status: 200,
      headers: { "content-type": "text/plain", "x-custom": "kept" },
    });

    const secured = applySecurityHeaders(response);

    expect(secured.headers.get("content-type")).toBe("text/plain");
    expect(secured.headers.get("x-custom")).toBe("kept");
    expect(secured.headers.get("x-frame-options")).toBe("DENY");
    expect(secured.headers.get("content-security-policy")).toContain("default-src 'self'");
  });
});
