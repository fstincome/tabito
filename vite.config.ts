// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Static export for cPanel (bun run build:static sets STATIC_EXPORT=1):
  // SPA shell + no worker runtime, so dist/client is a plain HTML/JS/CSS folder.
  // The default build (Lovable hosting) keeps the worker runtime.
  ...(process.env["STATIC_EXPORT"] === "1" ? { nitro: false } : {}),
  tanstackStart: {
    ...(process.env["STATIC_EXPORT"] === "1" ? { spa: { enabled: true } } : {}),
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
});
