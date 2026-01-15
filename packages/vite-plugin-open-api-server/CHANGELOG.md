## [0.17.0] - 2026-01-15

### Features

- create devtools-plugin.ts with setupOpenApiDevTools function (ef10d8a)
- add client script injection via transformIndexHtml (949eb72)
- implement global state exposure with helper methods (P5-04) (4e214e1)


### Bug Fixes

- address code review feedback (f2d9aef)


### Documentation

- add Phase 6 - Advanced DevTools Simulation (2e1159a)


### Code Refactoring

- create Vue Plugin pattern with createOpenApiDevTools (780922d)


### Tests

- add comprehensive tests for DevTools plugin (31683f0)


### Other Changes

- sync changeset for feature/p5-03-devtools-plugin (e217653)
- add changeset for DevTools integration feature (ad8c12f)
- sync changeset for feature/p5-03-devtools-plugin (47ba11e)



## [0.16.0] - 2026-01-15

### Features

- implement handleFileChange function and hot reload module (a821e77)
- integrate hot reload handler with file watcher (aa66bce)


### Bug Fixes

- use correct async assertion .resolves.toBeUndefined() (3c954e3)
- add afterEach hook to restore globalThis.require in clearModuleCache tests (e7b3006)


### Tests

- add comprehensive unit tests for hot reload handler (57a38c0)


### Other Changes

- format package.json (cfda611)
- add changeset for hot reload feature (ac3914d)
- sync changeset for feature/p5-02-hot-reload (eb211fb)
- sync changeset for feature/p5-02-hot-reload (a4d46dc)



## [0.15.0] - 2026-01-15

### Features

- create file-watcher module with chokidar integration (4e3d25a)
- integrate file watcher into Vite plugin (e693671)


### Bug Fixes

- address code review feedback (d339228)


### Other Changes

- sync changeset for feature/p5-01-file-watcher (a039f03)
- add changeset for file watcher feature (65a02ea)
- sync changeset for feature/p5-01-file-watcher (f8e82fe)



## [0.14.0] - 2026-01-15

### Features

- implement process manager with fork, IPC, and graceful shutdown (787cf24)
- implement IPC message handler with type-safe dispatch (628a5c2)
- implement startup coordinator with ready-wait and timeout handling (09ecc0d)
- integrate process management into plugin lifecycle hooks (5e78e20)


### Bug Fixes

- correct runner path resolution for bundled output (a02c312)


### Code Refactoring

- address code review feedback (2a74c3e)
- address second round of code review feedback (dbd647a)
- add payload validation for critical IPC message types (f6491ab)


### Other Changes

- sync changeset for feature/phase-4-process-management (f36f19d)
- fix lint errors and add changeset (a99cff0)
- sync changeset for feature/phase-4-process-management (b8f8439)
- sync changeset for feature/phase-4-process-management (528a3e6)
- sync changeset for feature/phase-4-process-management (e39db9c)
- sync changeset for feature/phase-4-process-management (2111f78)



## [0.13.2] - 2026-01-15

### Features

- update delete-pet handler to demonstrate SecurityContext access (ae0a222)
- add security scheme logging on startup (315986d)


### Bug Fixes

- fix pathToRegex to handle OpenAPI path parameters correctly (69e58a2)


### Documentation

- add Security Schemes documentation to README (dc69cc3)



## [0.13.1] - 2026-01-14

### Features

- create example error simulation handler (e2b9421)
- update add-pet handler with error simulation (264b2bd)
- update get-pet-by-id handler with error simulation (d01c61a)
- add error simulation test UI to playground (01c3f9c)


### Documentation

- add error simulation pattern documentation (3ae84bf)
- add delay simulation patterns and timeout testing (a59d1db)
- document error response body format (75a97fd)


### Other Changes

- sync changeset for feature/p3-03-error-simulation (573d6a4)
- add trailing newline to package.json (c1920ac)
- add changeset for error simulation feature (6b016c2)



## [0.13.0] - 2026-01-14

### Features

- add IPC log message handler in parent process (244e7ac)
- add request logging middleware with IPC support (02263ae)



## [0.12.0] - 2026-01-14

### Features

- implement Vite proxy configuration for mock server routing (c0fae58)


### Tests

- add API proxy test functionality to demonstrate request proxying (523dd9a)


### Other Changes

- sync changeset for feature/p3-01-request-proxying (2521cf3)



## [0.11.1] - 2026-01-14

### Features

- add formatted registry table display for startup (2b7ed32)



## [0.11.0] - 2026-01-14

### Features

- add /_openapiserver/registry inspection endpoint (a3b28af)


### Tests

- add registry endpoint integration tests (485190d)


### Other Changes

- sync changeset for feature/p2-07-registry-inspection-endpoint (85e18d0)
- add changeset for registry inspection endpoint feature (9ed9ac0)



## [0.10.0] - 2026-01-14

### Features

- implement OpenAPI document enhancer with x-handler and x-seed injection (1b505cc)
- implement registry builder with endpoint and schema tracking (e6f86e7)
- add registry serializer for inspection endpoint (9a90594)


### Other Changes

- fix package.json trailing newline for biome format (3320d04)
- sync changeset for feature/p2-03-document-enhancer (cd086de)



## [0.9.0] - 2026-01-14

### Features

- implement seed file loader with schema validation (da7eec0)


### Other Changes

- add trailing newline to package.json (2121173)
- sync changeset for feature/p2-02-seed-loader (60050e9)



## [0.8.0] - 2026-01-14

### Features

- create handler-loader.ts module skeleton (72db5d1)


### Tests

- add comprehensive unit tests for handler-loader (c2f2eed)


### Other Changes

- fix lint errors in test fixtures and scripts (5be15d9)
- sync changeset for feature/p2-01-handler-loader (0244ddf)



## [0.7.0] - 2026-01-14

### Features

- create logging/startup-banner.ts module (b8ece35)
- integrate startup banners with plugin hooks (214a81b)


### Tests

- add banner visual verification script and fixes (f774f0b)


### Other Changes

- add changeset for startup banner feature (b596be8)



## [0.6.0] - 2026-01-14

### Features

- implement mock server with Scalar and Hono integration (3013c0d)



## [0.5.0] - 2026-01-14

### Features

- implement plugin factory with option validation (d162f2b)
- update index.ts exports and verify build (d4d7bfc)


### Other Changes

- sync changeset for feature/p1-04-vite-plugin-skeleton (d90974d)
- add changeset for P1-04 vite plugin skeleton (2d4222e)



## [0.4.0] - 2026-01-14

### Features

- create plugin-options.ts with OpenApiServerPluginOptions (ec91466)
- create registry.ts with OpenAPI registry structures (4a9a279)
- create security.ts with normalized security scheme types (ebb43ec)
- create handlers.ts with handler API types (cce16bd)
- create seeds.ts with seed data generator types (3181d42)
- create ipc-messages.ts with IPC protocol types (abbbb39)
- export all public types from types/index.ts (ad2ed24)


### Tests

- add comprehensive type tests with vitest typecheck (42f7848)


### Other Changes

- update changeset (5c68e06)



## [0.3.0] - 2026-01-14

### Features

- implement security scheme normalizer (70a1133)
- integrate security normalizer into OpenAPI loading flow (084b50a)


### Tests

- add comprehensive unit tests for security-normalizer (e0d167e)


### Other Changes

- add changeset for security-normalizer feature (de7cd92)



## [0.2.0] - 2026-01-14

### Features

- create parser directory structure (9b53244)


### Bug Fixes

- use path.relative for cross-environment cwd compatibility (d00250b)


### Documentation

- create comprehensive project documentation (162dca0)


### Tests

- create unit tests for OpenAPI parser (2778344)


### Other Changes

- sync changeset for feature/p1-01-openapi-parser (647816c)
- sync changeset for feature/p1-01-openapi-parser (7f2e28b)
- move completed changeset to history (957f8c3)
- sync changeset for feature/p0-14-create-documentation (0fdd494)
- sync changeset for feature/p0-14-create-documentation (ea6073a)
- update changeset history (a6a12af)
- update beads (2e75662)



## [0.1.1] - 2026-01-09

### Features

- add Swagger Petstore OpenAPI 3.0 spec with placeholder handlers and seeds (c14fe7f)
- create Vue playground app with workspace:* dependency (f5669c0)


### Bug Fixes

- fix module resolution and add local biome config (ec810f2)
- add --git-commit to workspace bump to close changeset (b520de6)


### Other Changes

- update changeset (b2fd309)
- move consumed changeset to history (d7ee147)
- update playground (2910b52)
- update repo config (c4f1795)
- move consumed changeset to history (9fa26aa)
- sync changeset for feature/p0-12-create-playground-application (c7ece31)
- configure tsdown bundler for ESM builds with declarations (4c623cc)
- sync changeset for feature/p0-11-configure-tsdown-for-build (3ac8d46)
- bump version to 0.1.0 and archive P0-10 changeset (5df123b)


