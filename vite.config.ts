// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // TABITO ships as a 100% static site (no server runtime): the build produces a
  // plain folder of HTML/JS/CSS that can be uploaded to any cPanel host.
  nitro: false,
  tanstackStart: {
    // Single-page-app mode: one prerendered shell, everything else client-side.
    spa: { enabled: true },
    server: { entry: "server" },
  },
});
