## [0.19.2] - 2026-02-03

### Features

- complete hot reload implementation with WebSocket events (4fb3147)


### Tests

- add WebSocket event broadcast tests (05c882c)


### Other Changes

- sync changeset for feature/vite-open-api-server-c4l.3-hot-reload (7de37d7)



## [0.19.1] - 2026-02-03

### Features

- implement Vite plugin core with proxy configuration (820c4bc)
- implement seed system with context injection (5d7ed33)
- implement handler execution system with error handling (4505a77)
- implement createOpenApiServer factory function (d2f195f)
- implement data generator with OpenAPI schema-based fake data generation (ac832e8)
- implement Hono router with dynamic route generation (2efa0b7)
- implement in-memory store with CRUD operations (45d56e3)
- implement OpenAPI processor pipeline (b11a770)
- initialize @voas/core package structure (0b819f6)


### Bug Fixes

- make MockLogger extend Logger interface for type compatibility (3f7cc27)
- use Vite ssrLoadModule for TypeScript handler/seed files (64953c8)
- revert composite mode and build before typecheck (9608b7c)
- use tsc --build for typecheck with project references (46e9739)
- add project reference to core for typecheck in CI (a65a30b)
- address code review findings (21e2e70)
- address review comments for types, hot-reload, and docs (d6c67f4)
- add missing has and count methods to simulationManager mock (9ad8d9d)
- empty seed arrays now fall through to example response (c6f6712)
- address PR review comments for seed system tests (4410c7a)
- make Logger debug/info methods optional for consistency (805ec8a)
- add status code validation and improve executor robustness (43e7432)
- add context parameter to test handler signatures (7b1b3d2)
- address PR review comments (567f90c)
- import version from package.json instead of hardcoding (2ae788c)
- address code review findings from /coder analysis (23a119b)
- address edge cases in schema data generation (5946179)
- address code review findings (e88e283)
- prevent mutation in create() and restrict setIdField usage (7d9e401)
- address PR review comments for in-memory store (3d93497)
- address PR review comments for processor (586bc51)
- address PR review feedback (846644e)
- add DATE_FORMAT_POST_PROCESSING for RFC3339 date formatting (56eabcb)
- rename package to @websublime/vite-plugin-open-api-core (1f4f87b)
- address 4 PR review comments (3e34b5a)
- add missing type exports and externalize dependencies (58c11ee)


### Documentation

- update developer workflow - remove close commands from subtask flow (06c6545)
- update developer workflow documentation (693608f)
- update CLAUDE.md for v2.0 (dea29d3)
- update README for v2.0 (d342311)
- add development plan for v2.0 (6571b28)
- add technical specification for v2.0 (0426e7c)
- rename PRD-v2.md to PRODUCT-REQUIREMENTS-DOC.md (96f3051)
- rewrite coder as code-challenger and clarify review pipeline (80bb26e)


### Code Refactoring

- extract shared test utilities for handler and seed tests (ee29f4c)
- unify Logger type and remove deprecated exports (741e63b)
- address code review findings (38cac49) (#1, #2, #3, #4, #5)
- reduce processor complexity and improve test coverage (1045591)


### Continuous Integration

- enable npm publishing for packages (05c31f3)
- enable npm publishing for packages (3367273)


### Tests

- add unit tests for handler and seed file loading (c39e8d2)
- add integration tests for response priority chain (324d123)


### Other Changes

- sync changeset for feature/vite-open-api-server-c4l-2-file-loading-tests (9162c0f)
- sync changeset for feature/vite-open-api-server-c4l-2-file-loading-tests (70c117e)
- sync changeset for feature/vite-open-api-server-c4l-2-file-loading-tests (f3dd1b8)
- update plugin server version (30378c0)
- sync changeset for feature/vite-open-api-server-c4l.1-plugin-core (aed8463)
- sync changeset for feature/vite-open-api-server-c4l.1-plugin-core (d2fb8f3)
- sync changeset for feature/vite-open-api-server-c4l.1-plugin-core (cae309a)
- sync changeset for feature/vite-open-api-server-c4l.1-plugin-core (bfb74da)
- sync changeset for feature/vite-open-api-server-c4l.1-plugin-core (e6f3b5c)
- sync changeset for code review fixes (85a8384)
- sync changeset for feature/vite-open-api-server-c4l.1-plugin-core (483343e)
- sync changeset for feature/vite-open-api-server-c4l.1-plugin-core (0acaa63)
- bump @websublime/vite-plugin-open-api-core to 0.7.1 (2f79486)
- sync changeset for feature/vite-open-api-server-det.3-response-priority (b372c1f)
- sync changeset for feature/vite-open-api-server-det.3-response-priority (caa9b28)
- bump @websublime/vite-plugin-open-api-core to 0.7.0 (49f3079)
- sync changeset for feature/vite-open-api-server-det.2-seed-system (745d70a)
- sync changeset for feature/vite-open-api-server-det.2-seed-system (9b8b2e7)
- sync changeset for feature/vite-open-api-server-det.2-seed-system (d515e81)
- bump @websublime/vite-plugin-open-api-core to 0.6.0 (3eef34a)
- sync changeset for feature/task-2.1-handler-system (15ebe7e)
- sync changeset for feature/task-2.1-handler-system (d0c1877)
- bump @websublime/vite-plugin-open-api-core to 0.5.0 (c79d889)
- sync changeset for feature/vite-open-api-server-z5y.6-server-factory (47f6b7e)
- sync changeset for feature/vite-open-api-server-z5y.6-server-factory (bd71095)
- sync changeset for feature/vite-open-api-server-z5y.6-server-factory (329d03e)
- sync changeset for feature/vite-open-api-server-z5y.6-server-factory (870cba3)
- remove obsolete TODO comments from completed tasks (7702489)
- bump @websublime/vite-plugin-open-api-core to 0.4.0 (703df1d)
- sync changeset for feature/vite-open-api-server-z5y.5-data-generator (a4f0eca)
- sync changeset for feature/vite-open-api-server-z5y.5-data-generator (153612c)
- bump @websublime/vite-plugin-open-api-core to 0.3.0 (8446e46)
- sync changeset for feature/vite-open-api-server-z5y.4-hono-router (8aadcd8)
- fix formatting in test file (db60a45)
- sync changeset for feature/vite-open-api-server-z5y.4-hono-router (8cd2acd)
- bump @websublime/vite-plugin-open-api-core to 0.2.0 (404544a)
- sync changeset for feature/vite-open-api-server-z5y-3-in-memory-store (5261e2c)
- sync changeset for feature/vite-open-api-server-z5y-3-in-memory-store (c264e19)
- bump @websublime/vite-plugin-open-api-core to 0.1.1 (a065310)
- sync changeset for feature/task-1-2-openapi-processor (29a157c)
- sync changeset for feature/task-1-2-openapi-processor (e7a9966)
- update changeset for refactoring changes (8aa34d7)
- bump @websublime/vite-plugin-open-api-core to 0.1.0 (725bb15)
- sync changeset for feature/vite-open-api-server-z5y.1-project-setup (a6eff77)
- sync changeset for feature/vite-open-api-server-z5y.1-project-setup (83f7f20)
- sync changeset for feature/vite-open-api-server-z5y.1-project-setup (2dc9e9a)
- sync changeset for feature/vite-open-api-server-z5y.1-project-setup (a669c8f)
- sync changeset for feature/vite-open-api-server-z5y.1-project-setup (d4cda68)
- remove pnpm-lock.yaml (2bd6801)
- update gitignore (c6cc5b5)
- update claude command files (7d5673d)
- remove v0.19.0 playground (ffb04d7)
- remove v0.19.0 plugin package (0da34bd)


