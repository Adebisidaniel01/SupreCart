import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const portalDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: portalDirectory,
  envDir: resolve(portalDirectory, ".."),
  plugins: [react()],
  publicDir: resolve(portalDirectory, "../public"),
  server: { port: 8082 },
  build: { outDir: "dist", emptyOutDir: true },
});
