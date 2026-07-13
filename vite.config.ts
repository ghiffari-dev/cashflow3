// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Service worker is hand-written at public/sw.js so Vercel serves it reliably
// at /sw.js. vite-plugin-pwa was removed because Nitro on Vercel did not always
// emit its generated sw.js into the static assets folder → 404 in production.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
