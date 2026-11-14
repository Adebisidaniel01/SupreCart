const isDev = import.meta.env.DEV;

const analyticsOrigins = [
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://www.googletagmanager.com",
  "https://*.googletagmanager.com",
  "https://stats.g.doubleclick.net",
];

function buildContentSecurityPolicy() {
  const scriptSources = ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"];
  const connectSources = ["'self'", ...analyticsOrigins];

  if (isDev) {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("ws:", "wss:", "http://127.0.0.1:*");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectSources.join(" ")}`,
    "media-src 'self' data: blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'self' https://www.googletagmanager.com https://td.doubleclick.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function securityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "content-security-policy": buildContentSecurityPolicy(),
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "x-dns-prefetch-control": "off",
  };

  if (!isDev) {
    headers["strict-transport-security"] = "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}

function copyHeaders(source: Headers): Headers {
  const target = new Headers();
  source.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    target.set(key, value);
  });

  const cookieSource = source as Headers & { getSetCookie?: () => string[] };
  const setCookies =
    typeof cookieSource.getSetCookie === "function" ? cookieSource.getSetCookie() : [];
  for (const cookie of setCookies) target.append("set-cookie", cookie);

  return target;
}

/**
 * Adds the app-wide security headers to a response. Mutates the response in
 * place when the runtime allows it, otherwise rebuilds the response with a
 * copied header list so multiple Set-Cookie headers are preserved.
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = securityHeaders();

  try {
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
    return response;
  } catch {
    const copied = copyHeaders(response.headers);
    for (const [name, value] of Object.entries(headers)) copied.set(name, value);
    const body =
      response.status === 204 || response.status === 205 || response.status === 304
        ? null
        : response.body;
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: copied,
    });
  }
}
