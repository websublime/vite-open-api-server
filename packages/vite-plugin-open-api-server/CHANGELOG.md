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


