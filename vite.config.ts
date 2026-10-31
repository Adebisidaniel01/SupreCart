// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "suprecart-admin-env",
      config(_config, { mode }) {
        if (mode !== "development") return;
        const localEnv = loadEnv(mode, process.cwd(), "");
        for (const name of [
          "ADMIN_USERNAME",
          "ADMIN_PASSWORD",
          "ADMIN_PASSWORD_HASH",
          "ADMIN_SESSION_SECRET",
        ] as const) {
          const value = localEnv[name];
          if (value && !process.env[name]) process.env[name] = value;
        }
      },
    },
  ],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      tsconfigPaths: true,
    },
    // Override the Lovable default dev server (host "::", port 8080) so local
    // development uses Vite's standard port. `host: true` binds all network
    // interfaces so the dev server is reachable from other devices on the LAN.
    // Ignored inside the Lovable sandbox, which always binds 8080.
    server: {
      host: "127.0.0.1",
      port: 5180,
    },
  },
});
