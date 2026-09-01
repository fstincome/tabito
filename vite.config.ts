// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // TABITO ships as a static SPA shell (client-side only): the build's
  // dist/client folder can be uploaded to any cPanel host (see build:static).
  // nitro stays enabled — the published Lovable deployment needs the worker build.
  tanstackStart: {
    // Single-page-app mode: one prerendered shell, everything else client-side.
    spa: { enabled: true },
    server: { entry: "server" },
  },
});
