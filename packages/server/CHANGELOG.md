## [0.23.1] - 2026-02-11

### Documentation

- add @vue/devtools-api install instruction to DevTools section (6a0b4fe)
- comprehensive README update with guides, screenshots, and troubleshooting (eeb9803)
- address PR review comments (7a3d0c5)
- address second round of PR review comments (0c43c03)
- add 'Built with AI — Responsibly' section to README (514d68a)


### Other Changes

- sync changeset for feature/vite-open-api-server-03j.2-documentation (9bca96b)
- sync changeset for feature/vite-open-api-server-03j.2-documentation (e8d8e15)
- sync changeset for feature/vite-open-api-server-03j.2-documentation (c74cb94)
- sync changeset for feature/vite-open-api-server-03j.2-documentation (1e22f14)
- add trailing newlines to package.json files (biome format) (94a08e2)
- sync changeset for feature/vite-open-api-server-03j.2-documentation (dac1724)



## [0.23.0] - 2026-02-11

### Features

- implement OpenAPI security scheme handling (411b894)
- re-export SecurityContext type from core (ebe630a)


### Bug Fixes

- address code review findings from deep analysis (7c7fc57)


### Documentation

- add security handling docs and playground auth headers (c8c62b3)


### Code Refactoring

- reuse PUBLIC_ENDPOINT_CONTEXT for failed validation (ccae165)
- address PR review comments (70880f8)
- address PR review comments (4bef91d)
- address second round of PR review comments (abad4f7)


### Other Changes

- sync changeset for feature/vite-open-api-server-c9v.4-security-handling (fea2139)
- sync changeset for feature/vite-open-api-server-c9v.4-security-handling (4b792ab)
- sync changeset for feature/vite-open-api-server-c9v.4-security-handling (c0d8545)
- sync changeset for feature/vite-open-api-server-c9v.4-security-handling (868eaca)
- sync changeset for feature/vite-open-api-server-c9v.4-security-handling (12a5704)
- sync changeset for feature/vite-open-api-server-c9v.4-security-handling (c5bedd3)



## [0.22.4] - 2026-02-11

### Bug Fixes

- move 'types' condition before 'import' and 'require' in package.json exports (f3a60f9)
- fix JsonEditor dual scrollbar and textarea not filling panel width (3ca323d)
- force JsonEditor textarea to fill full panel width (4f2af14)
- add width: 100% to JsonEditor root so it fills panel width (28d9bbd)
- replace inline minHeight with CSS custom property on textarea (e7b5746)
- sync line numbers scroll position with textarea in JsonEditor (561e011)
- fix Models page panel margins, full-width layout, and duplicate scrollbars (c505895)


### Other Changes

- bump @websublime/vite-plugin-open-api-devtools to 0.8.4 (3fb986f)
- sync changeset for fix/vite-19u-models-panel-ui-fixes (5116960)
- sync changeset for fix/vite-19u-models-panel-ui-fixes (04052ce)
- sync changeset for fix/vite-19u-models-panel-ui-fixes (a045731)
- sync changeset for fix/vite-19u-models-panel-ui-fixes (55647ad)
- sync changeset for fix/vite-19u-models-panel-ui-fixes (911b8ec)



## [0.22.3] - 2026-02-10

### Bug Fixes

- add spacing between Models page split panels and make content full width (77378b8)
- use height: 100% instead of 100vh for iframe-safe layout (636a53a)
- constrain viewport height to prevent timeline list from growing unbounded (ef963b6)


### Other Changes

- sync changeset for fix/vite-r81-models-panel-spacing (c307297)
- bump @websublime/vite-plugin-open-api-devtools to 0.8.2 (c2f4eab)
- add missing trailing newlines to package.json files (fd0ce68)
- sync changeset for fix/vite-um1-timeline-layout (5dc6463)
- sync changeset for fix/vite-um1-timeline-layout (25d215a)
- sync changeset for fix/vite-um1-timeline-layout (13b1915)



## [0.22.2] - 2026-02-09

### Bug Fixes

- add min-height to stacked panels in responsive layout (27f3cd8)
- split Models page into side-by-side JSON editor and data table (437a07d)
- address PR review comments for Models page (372594e)
- address code review findings for DataTable component (625dd94)
- use item identity check for selection reset watcher (546ae2b)
- extract shared .models-panel CSS class to remove duplication (d568636)


### Other Changes

- sync changeset for fix/vite-pjl-models-page-split-layout (57cc66f)
- fix missing trailing newlines in package.json files (2bb9543)
- sync changeset for fix/vite-pjl-models-page-split-layout (bb06385)
- sync changeset for fix/vite-pjl-models-page-split-layout (fd1718d)
- sync changeset for fix/vite-pjl-models-page-split-layout (1bc2395)
- sync changeset for fix/vite-pjl-models-page-split-layout (b83b1c7)
- sync changeset for fix/vite-pjl-models-page-split-layout (c6a6c68)
- sync changeset for fix/vite-pjl-models-page-split-layout (24e4f50)



## [0.22.1] - 2026-02-09

### Features

- implement WebSocket upgrade handler for /_ws endpoint (4df47f2)


### Bug Fixes

- use method:path key for simulation lookup in route builder (15b6282)
- delay-only simulations now pass through to normal handler (f197a79)
- re-fetch simulations on SimulatorPage mount and reconnect (14765a5)
- wrap simulation:active data in object with simulations property (c8066cf)
- address code review findings for WebSocket command handler (459cfc8) (#1, #3, #7, #6, #2, #4, #8)
- address PR review comments for WebSocket command handler (c685d5d)
- address second round of PR review comments (b1847d9)
- address PR review comments for WebSocket command handler (4a67a50)


### Code Refactoring

- wrap fake timers test in try/finally for safe cleanup (478c8bf)
- address PR review comments (4eb8286)


### Tests

- add simulation variant tests and fix loading state on disconnect (bf0f533)


### Other Changes

- sync changeset for fix/vite-bzb-simulation-path-mismatch (06ba5cf)
- sync changeset for fix/vite-bzb-simulation-path-mismatch (0025469)
- sync changeset for fix/vite-bzb-simulation-path-mismatch (2ae48c6)
- sync changeset for fix/vite-bzb-simulation-path-mismatch (b13be68)
- fix trailing newline in package.json files (644d113)
- sync changeset for fix/vite-bzb-simulation-path-mismatch (5ac9b5e)
- sync changeset for fix/vite-bzb-simulation-path-mismatch (82e16a3)
- sync changeset for fix/vite-bzb-simulation-path-mismatch (14c119d)
- sync changeset for fix/vite-bzb-simulation-path-mismatch (afba3e7)
- add server package to changeset and fix trailing newline (8a027b9)
- bump versions (18058eb)
- sync changeset for feature/vite-open-api-server-6nr-websocket-upgrade (ea81da2)
- sync changeset for feature/vite-open-api-server-6nr-websocket-upgrade (a53cb5a)
- sync changeset for feature/vite-open-api-server-6nr-websocket-upgrade (3c101aa)
- sync changeset for feature/vite-open-api-server-6nr-websocket-upgrade (97755dd)



## [0.22.0] - 2026-02-06

### Features

- register custom tab in Vue DevTools via virtual module (0e6509e)
- integrate DevTools client SPA into server package (1781f7a)
- add petstore demo application (7a2fe70)


### Bug Fixes

- address third round of PR review comments (cc487d2)
- address PR review comments for devtools integration (8e80311)
- address second round of PR review comments (6384871)
- add Vue SFC type declarations (3a145ce)
- address all PR review comments (7bcc7b5)
- rename files to match plugin patterns and fix deprecation (2f5f93e)
- add type annotation for updatedPet in handler (edfd954)


### Other Changes

- sync changeset for feature/vite-open-api-server-03j.4-devtools-integration (f001668)
- sync changeset for feature/vite-open-api-server-03j.4-devtools-integration (104676a)
- sync changeset for feature/vite-open-api-server-03j.4-devtools-integration (1dca1ee)
- reformat claude local settings (20be19f)
- bump petstore-app to 0.1.0 (37b5c77)
- sync changeset for feature/vite-open-api-server-03j.1-playground-app (6ef3af2)
- add changeset for playground app (5a3f2eb)
- add biome configuration (bc22e86)
- sync changeset for feature/vite-open-api-server-03j.1-playground-app (cc5dedd)
- sync changeset for feature/vite-open-api-server-03j.1-playground-app (767b341)
- apply biome formatting fixes (659e6b8)
- sync changeset for feature/vite-open-api-server-03j.1-playground-app (85e04d4)



## [0.21.1] - 2026-02-05

### Features

- implement simulator page with simulation store (a2004a6)


### Bug Fixes

- strengthen delay validation to reject NaN and Infinity (bed9972)
- strengthen status code validation (68fe05a)
- address critical bugs in simulator implementation (d4ca0f7)
- add missing vi import for console.log spy in simulation tests (caa7a3d)
- address PR feedback on simulator implementation (8fe2cff)


### Code Refactoring

- apply code review recommendations (6a5515c)
- improve lifecycle and error handling in simulator (9250436)


### Other Changes

- sync changeset for feature/simulation-manager (25d283a)
- complete simulation manager implementation (f7d7180)
- sync changeset for feature/simulation-manager (12df4ed)
- sync changeset for feature/simulation-manager (e879095)
- sync changeset for feature/simulation-manager (7cdf8b2)
- bump @websublime/vite-plugin-open-api-devtools to 0.6.0 (bb64bff)
- sync changeset for feature/vite-open-api-server-c9v.2-simulator-page (b948641)
- sync changeset for feature/vite-open-api-server-c9v.2-simulator-page (87b312e)
- update pnpm-lock.yaml to fix CI (dfde646)
- fix formatting (add newlines to package.json files) (72665b3)
- sync changeset for feature/vite-open-api-server-c9v.2-simulator-page (1c69be1)
- sync changeset for feature/vite-open-api-server-c9v.2-simulator-page (3c93210)



## [0.21.0] - 2026-02-05

### Features

- implement Models Page with JSON editor and store management (54d8564)


### Bug Fixes

- add explicit type annotation to ModelPage value parameter (26c78c9)
- apply PR review feedback (1ea57c9)
- apply second round of PR review feedback (ffb639f)
- address all PR review comments (1cf85d9)
- use public API in isDirty test instead of accessing private originalItems (d17753f)
- replace structuredClone with JSON parse/stringify for CI compatibility (a006014)
- address PR review comments (82388dc)


### Code Refactoring

- address code review feedback for Models Page (0805a58)
- apply code review recommendations (dc05494)


### Tests

- add unit tests for useNotifications and models store (25951e1)


### Other Changes

- update pnpm-lock.yaml (c3aa7ac)
- add changeset for Models Page feature (e7c79b5)
- sync changeset for feature/vite-open-api-server-c9v.1-models-page (d554535)
- sync changeset for feature/vite-open-api-server-c9v.1-models-page (efb74c3)
- sync changeset for feature/vite-open-api-server-c9v.1-models-page (ce46074)
- update package dependencies (254c940)
- sync changeset for feature/vite-open-api-server-c9v.1-models-page (3dc2465)
- sync changeset for feature/vite-open-api-server-c9v.1-models-page (cebe01b)
- sync changeset for feature/vite-open-api-server-c9v.1-models-page (a62831f)
- sync changeset for feature/vite-open-api-server-c9v.1-models-page (e4c9ac1)
- sync changeset for feature/vite-open-api-server-c9v.1-models-page (0440d1c)
- sync changeset for feature/vite-open-api-server-c9v.1-models-page (fe27808)
- sync changeset for feature/vite-open-api-server-c9v.1-models-page (f9e6a5c)



## [0.20.0] - 2026-02-04

### Breaking Changes

- rename packages to follow vite-plugin prefix convention (8955d38)


### Features

- Add Vue DevTools integration (e2b6f51)
- implement Timeline Page with real-time request/response tracking (d63d240)
- implement Routes Page with endpoint listing and detail view (28682f9)
- add WebSocket composable for DevTools SPA (b161f43)
- initialize DevTools SPA package (f6569cf)
- implement WebSocket hub for bidirectional communication (8eb4228)


### Bug Fixes

- Apply code review recommendations (135b6de)
- Apply PR review feedback (f9720f6)
- align @types/node with Node.js engine and update DevTools default port to 3000 (e64596f)
- Use addCustomTab instead of inspector/timeline (92fc204)
- address PR review comments for timeline components (b23890a)
- correct exports field order - types before import/require (a0758c1)
- add ARIA attributes to collapsible sections in TimelineDetail (9e2c5c7)
- prevent memory leak in timeline responseBuffer (b4819d3)
- create stub entries for orphaned responses to prevent data loss (6a2ec22)
- address code review findings for Routes Page (0043983)
- remove extra blank lines in registry store (f96b19b)
- correct exports order - types before import/require (757f241)
- address code review findings for WebSocket composable (d13e1b0)
- correct exports condition order in package.json (39af292)
- address PR review comments (65df2d4)
- address code review recommendations (2b378e3)
- apply code review recommendations (65314aa)
- simplify npm auth in release workflow (7a9812b)
- address PR review comments for devtools-client (0b2b911)
- update MockWebSocketHub to include new interface methods (ac85b75)
- address code review findings - logger default and payload validation (53a6f18)


### Documentation

- fix playground location to packages/playground/ (3e8f754)
- fix inconsistencies in README files and documentation (0afdb4d)


### Code Refactoring

- Address PR feedback (a09e245)
- Apply code review recommendations (2f023b7)
- address PR review comments for WebSocket composable (c5bb365)
- address code review findings (8840464)


### Continuous Integration

- add PROD environment and npm auth debugging (d982d0b)
- remove pull_request trigger from release workflow (6f4520c)
- add pull_request closed trigger to release workflow (c1127dd)


### Tests

- Update DevTools tests for new behavior (87163a3)


### Other Changes

- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (d280a03)
- update pnpm-lock.yaml for @vue/devtools-api ^8.0.6 (d54d873)
- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (bd3b105)
- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (26f49e1)
- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (04bd8b9)
- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (122af9a)
- Update dependencies to latest versions (e1a729d)
- Fix lint errors (aaa57f3)
- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (730e61c)
- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (919b166)
- Update pnpm-lock.yaml (b0b0e7e)
- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (b74d15e)
- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (566ee48)
- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (206b9c6)
- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (f720d5a)
- sync changeset for feature/vite-open-api-server-c5f.6-vue-devtools-integration (3c8feb0)
- bump @websublime/vite-plugin-open-api-devtools to 0.4.0 (050474b)
- sync changeset for feature/vite-open-api-server-c5f.5-timeline-page (8a25855)
- disable useShorthandFunctionType Biome rule (3955a53)
- sync changeset for feature/vite-open-api-server-c5f.5-timeline-page (904a737)
- sync changeset for feature/vite-open-api-server-c5f.5-timeline-page (2edab8e)
- sync changeset for feature/vite-open-api-server-c5f.5-timeline-page (f210a35)
- sync changeset for feature/vite-open-api-server-c5f.5-timeline-page (dd95bfb)
- sync changeset for feature/vite-open-api-server-c5f.5-timeline-page (fc7cdf3)
- fix trailing newline in devtools-client package.json (1c90e64)
- bump @websublime/vite-plugin-open-api-devtools to 0.3.0 (9eadd3b)
- sync changeset for feature/vite-open-api-server-c5f.4-routes-page (bc9766f)
- sync changeset for feature/vite-open-api-server-c5f.4-routes-page (57c2882)
- sync changeset for feature/vite-open-api-server-c5f.4-routes-page (7cf5ba7)
- bump @websublime/vite-plugin-open-api-devtools to 0.2.0 (6e70249)
- sync changeset for feature/vite-open-api-server-c5f.3-websocket-composable (de5fda9)
- sync changeset for feature/vite-open-api-server-c5f.3-websocket-composable (ddf1098)
- sync changeset for feature/vite-open-api-server-c5f.3-websocket-composable (bfc3ab7)
- sync changeset for feature/vite-open-api-server-c5f.3-websocket-composable (3a98107)
- fix lint (aecd9a7)
- bump versions (51a8505)
- sync changeset for feature/vite-open-api-server-c5f.2-devtools-spa-setup (03f6464)
- sync changeset for feature/vite-open-api-server-c5f.2-devtools-spa-setup (07001e2)
- update dependencies and sync changeset (56bfc4f)
- sync changeset for feature/vite-open-api-server-c5f.2-devtools-spa-setup (d7770dd)
- sync changeset for feature/vite-open-api-server-c5f.2-devtools-spa-setup (8e5dee1)
- sync changeset for feature/vite-open-api-server-c5f.2-devtools-spa-setup (585701f)
- disable noConsole rule for development logging (3cca2b1)
- sync changeset for code review fixes (3a5a68e)
- sync changeset for code review fixes (f2b6f6a)
- sync changeset for feature/vite-open-api-server-c5f.2-devtools-spa-setup (9c1c23b)
- bump @websublime/vite-open-api-core to 0.8.0 (ea00901)
- sync changeset for feature/vite-open-api-server-c5f.1-websocket-hub (f427abb)
- fix import indentation in test-utils.ts (b694033)
- sync changeset for feature/vite-open-api-server-c5f.1-websocket-hub (bd29119)
- sync changeset for feature/vite-open-api-server-c5f.1-websocket-hub (b253c2c)
- sync changeset for feature/vite-open-api-server-c5f.1-websocket-hub (9cf16b7)



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


