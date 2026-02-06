# Plan: Integrate DevTools Client in Vue.js DevTools

**Task:** `vite-open-api-server-03j.4` - Task 6.2: Integrate devtools client in Vue.js DevTools

## Summary

Three things are broken/missing:
1. The Hono server at `/_devtools/` serves a **placeholder HTML** instead of the real devtools-client SPA
2. The Vue DevTools custom tab is **never registered** (no `addCustomTab()` call reaches the browser)
3. The devtools-client SPA build to `dist/spa/` is **not reproducible** (no build script)

## Key Design Decision: SPA Assets Shipped Inside the Server Package

When a consumer installs `@websublime/vite-plugin-open-api-server` from npm, the SPA assets must be **inside that package's `dist/`** — we cannot rely on resolving another package in `node_modules` at runtime.

**Approach:** During the server package build, copy the devtools-client's `dist/spa/` into the server package's `dist/devtools-spa/`. At runtime, resolve the path relative to `__dirname` (the server package's own dist). This ensures the SPA is always available regardless of how the package was installed.

## Architecture

```text
Build time:
  devtools-client builds → dist/spa/ (with base: '/_devtools/')
  server builds → tsup bundles src/ → dist/
               → post-build copies devtools-client/dist/spa/ → dist/devtools-spa/

Runtime (consumer installs plugin from npm):
  server plugin (configureServer)
    ├─ resolves dist/devtools-spa/ relative to its own __dirname
    ├─ passes absolute path to core via `devtoolsSpaDir` config
    ├─ injects <script> via transformIndexHtml to register Vue DevTools tab
    └─ adds proxy rules for /_devtools, /_api, /_ws

  core (Hono server)
    └─ devtools-server.ts serves static files from spaDir
       (falls back to placeholder if spaDir not provided)
```

## Implementation Steps

### Step 1: Add reproducible SPA build to devtools-client

**CREATE** `packages/devtools-client/vite.config.spa.ts`
- `base: '/_devtools/'`
- `outDir: 'dist/spa'`, `emptyOutDir: true`
- Full app build (NO externals — bundles Vue/Pinia/Vue Router)
- `manualChunks` to split vue-vendor for caching
- Same `@` alias and vue plugin as existing config

**MODIFY** `packages/devtools-client/package.json`
- Add `"build:spa": "vite build --config vite.config.spa.ts"`
- Chain into existing build: `"build": "vue-tsc --noEmit && vite build && pnpm run build:spa"`

### Step 2: Create static file serving module in core

**CREATE** `packages/core/src/devtools-server.ts`
- `mountDevToolsRoutes(app, { spaDir?, logger? })` function
- If `spaDir` provided: serve `/_devtools/assets/*` with correct MIME types + immutable cache headers, serve `/_devtools/*` as SPA fallback (index.html with no-cache)
- If `spaDir` not provided: fallback to existing placeholder from `devtools-template.ts`
- Path traversal protection (ensure resolved path stays within spaDir)

**MODIFY** `packages/core/src/server.ts`
- Add `devtoolsSpaDir?: string` to `OpenApiServerConfig`
- Replace inline `/_devtools` route handlers with `mountDevToolsRoutes()` call

**MODIFY** `packages/core/src/index.ts`
- Export `mountDevToolsRoutes` from `devtools-server.ts`

### Step 3: Wire up server package — copy SPA at build time, resolve at runtime

**MODIFY** `packages/server/package.json`
- Add `"@websublime/vite-plugin-open-api-devtools": "0.6.1"` to **devDependencies** (build-time only, not runtime)
- Update build script: `"build": "tsup && pnpm run copy:devtools-spa"`
- Add `"copy:devtools-spa": "node -e \"const{cpSync}=require('fs');const{join}=require('path');cpSync(join(__dirname,'../devtools-client/dist/spa'),join(__dirname,'dist/devtools-spa'),{recursive:true})\""`
  - (Or a small shell script / node script in `scripts/`)
- Add `"dist"` already in `"files"` — `dist/devtools-spa/` is automatically included

**MODIFY** `packages/server/src/plugin.ts`
- In `configureServer`: resolve SPA path as `path.join(path.dirname(fileURLToPath(import.meta.url)), 'devtools-spa')` (relative to the plugin's own dist/)
- Pass as `devtoolsSpaDir` to `createOpenApiServer()`
- Add `transformIndexHtml` hook: inject `<script type="module">` that imports `addCustomTab` from `@vue/devtools-api` and registers the iframe tab pointing to `http://{hostname}:{port}/_devtools/`
- In `configureProxy`: add proxy rules for `/_devtools`, `/_api`, `/_ws` so they work through Vite's dev server port too

**Note:** `tsup.config.ts` does NOT need changes for devtools-client — it's a devDependency used only at build time for copying, not bundled.

### Step 4: Playground — no changes needed

- The `/_devtools` link in `App.vue` will work via the new Vite proxy rule
- `registerDevTools()` is no longer needed manually — the `transformIndexHtml` hook handles it automatically
- `main.ts` stays unchanged

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `packages/devtools-client/vite.config.spa.ts` | CREATE | SPA-specific Vite config |
| `packages/devtools-client/package.json` | MODIFY | Add `build:spa` script, chain into `build` |
| `packages/core/src/devtools-server.ts` | CREATE | Static file serving module |
| `packages/core/src/server.ts` | MODIFY | Add `devtoolsSpaDir` config, use new module |
| `packages/core/src/index.ts` | MODIFY | Export `mountDevToolsRoutes` |
| `packages/server/package.json` | MODIFY | Add devtools-client as devDep, add copy script |
| `packages/server/src/plugin.ts` | MODIFY | Resolve SPA dir from __dirname, transformIndexHtml, proxy rules |

## Build Order (pnpm topological sort)

1. `core` builds first (no workspace deps)
2. `devtools-client` builds second (no workspace deps) — library + SPA builds
3. `server` builds third — tsup bundles src/, then copies `devtools-client/dist/spa/` → `dist/devtools-spa/`
4. `playground` is private, dev only

## Verification

1. `pnpm build` — all packages build, `packages/server/dist/devtools-spa/` exists with index.html + assets/
2. `pnpm lint` — passes
3. `pnpm typecheck` — passes
4. `pnpm test` — passes
5. `pnpm playground` — verify:
   - `http://localhost:4000/_devtools/` serves the real SPA (not placeholder)
   - `http://localhost:5173/_devtools/` works through Vite proxy
   - Vue DevTools extension shows "OpenAPI Server" custom tab with working iframe
   - SPA pages load, WebSocket connects to `ws://localhost:4000/_ws`
