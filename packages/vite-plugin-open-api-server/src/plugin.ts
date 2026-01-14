/**
 * Vite Plugin Implementation
 *
 * ## What
 * This module contains the main Vite plugin factory function that creates
 * a plugin instance for integrating OpenAPI mock servers into Vite's
 * development workflow.
 *
 * ## How
 * The plugin implements Vite's plugin interface with lifecycle hooks:
 * - `config`: Merges Vite config (proxy setup placeholder)
 * - `configResolved`: Stores resolved Vite config reference
 * - `configureServer`: Sets up the mock server when Vite's dev server starts
 * - `buildStart`: Performs initialization tasks at build start
 * - `closeBundle`: Performs cleanup tasks when bundle closes
 *
 * ## Why
 * Vite plugins follow a specific interface pattern. By implementing these
 * hooks, we can integrate seamlessly with Vite's development server and
 * build process, providing automatic mock server management.
 *
 * @module
 */

import type { ChildProcess } from 'node:child_process';
import type { Logger, Plugin, ProxyOptions, ResolvedConfig, ViteDevServer } from 'vite';

import {
  GREEN,
  printErrorBanner,
  printLoadingBanner,
  RED,
  RESET,
  YELLOW,
} from './logging/index.js';
import type { LogMessage, OpenApiServerMessage } from './types/ipc-messages.js';
import type { InputPluginOptions, ResolvedPluginOptions } from './types/plugin-options.js';

/**
 * Internal plugin state managed in closure.
 *
 * This interface tracks all mutable state needed by the plugin
 * across lifecycle hooks. State is initialized when the plugin
 * factory is called and updated throughout the plugin lifecycle.
 *
 * @internal
 */
interface PluginState {
  /** Resolved Vite configuration (set in configResolved) */
  resolvedConfig: ResolvedConfig | null;
  /** Vite dev server instance (set in configureServer) */
  devServer: ViteDevServer | null;
  /** Mock server child process (set in buildStart, Phase 4) */
  mockServerProcess: ChildProcess | null;
  /** Port the mock server is running on (set in buildStart, Phase 4) */
  mockServerPort: number | null;
  /** Whether mock server is ready to receive requests (set via IPC, Phase 4) */
  isReady: boolean;
  /** Timestamp when loading started (for timing banner) */
  startTime: number | null;
}

/**
 * Creates initial plugin state with all values reset.
 *
 * @returns Fresh plugin state object
 * @internal
 */
function createInitialState(): PluginState {
  return {
    resolvedConfig: null,
    devServer: null,
    mockServerProcess: null,
    mockServerPort: null,
    isReady: false,
    startTime: null,
  };
}

/**
 * Creates a fallback logger for use when Vite's logger is not available.
 *
 * This is used in buildStart() before configResolved() has been called,
 * or as a safety fallback if the resolved config is somehow unavailable.
 *
 * @returns A logger compatible with Vite's Logger interface
 * @internal
 */
function createFallbackLogger() {
  return {
    // biome-ignore lint/suspicious/noConsole: Fallback logger requires console for output
    info: (msg: string) => console.log(msg),
    // biome-ignore lint/suspicious/noConsole: Fallback logger requires console for output
    error: (msg: string) => console.error(msg),
    // biome-ignore lint/suspicious/noConsole: Fallback logger requires console for output
    warn: (msg: string) => console.warn(msg),
    // biome-ignore lint/suspicious/noConsole: Fallback logger requires console for output
    warnOnce: (msg: string) => console.warn(msg),
    clearScreen: () => {},
    hasWarned: false,
    hasErrorLogged: () => false,
  };
}

/**
 * Applies color to a log message based on its level.
 *
 * Uses ANSI color codes for terminal output:
 * - info: green
 * - warn: yellow
 * - error: red
 * - debug: no color (dim could be added later)
 *
 * @param message - The log message
 * @param level - The log level
 * @returns Colorized message string
 * @internal
 */
function colorizeLogMessage(message: string, level: LogMessage['level']): string {
  switch (level) {
    case 'info':
      return `${GREEN}${message}${RESET}`;
    case 'warn':
      return `${YELLOW}${message}${RESET}`;
    case 'error':
      return `${RED}${message}${RESET}`;
    case 'debug':
      return message;
    default:
      return message;
  }
}

/**
 * Sets up IPC message handling for the mock server child process.
 *
 * Listens for messages from the child process and routes them appropriately:
 * - 'log' messages are forwarded to Vite's logger with proper level and coloring
 * - Other message types can be handled as needed
 *
 * @param process - The mock server child process
 * @param logger - Vite's logger instance for output
 * @param pluginName - Plugin name for log prefixing
 * @internal
 */
export function setupIpcMessageHandler(
  process: ChildProcess,
  logger: Logger,
  pluginName: string,
): void {
  process.on('message', (msg: unknown) => {
    // Type guard for IPC messages
    if (typeof msg !== 'object' || msg === null || !('type' in msg)) {
      return;
    }

    const message = msg as OpenApiServerMessage;

    switch (message.type) {
      case 'log': {
        const logMessage = message as LogMessage;
        const colorizedMessage = colorizeLogMessage(logMessage.message, logMessage.level);
        const prefix = `[${pluginName}]`;

        // Route to appropriate logger method based on level
        switch (logMessage.level) {
          case 'error':
            logger.error(`${prefix} ${colorizedMessage}`);
            break;
          case 'warn':
            logger.warn(`${prefix} ${colorizedMessage}`);
            break;
          default:
            // info, debug, and any other levels use info
            logger.info(`${prefix} ${colorizedMessage}`);
            break;
        }
        break;
      }

      // Other message types (ready, error, response, etc.) will be handled
      // in Phase 4 when child process spawning is implemented
      default:
        // Silently ignore unhandled message types for now
        break;
    }
  });
}

/**
 * The unique name identifier for this Vite plugin.
 *
 * This name is used by Vite for plugin identification, logging, and
 * deduplication. It should be unique across all plugins in a project.
 *
 * @internal
 */
export const PLUGIN_NAME = 'vite-plugin-open-api-server';

/**
 * Default plugin options.
 *
 * These values are merged with user-provided options. Only optional
 * properties have defaults; required properties must be provided.
 *
 * @internal
 */
const DEFAULT_OPTIONS = {
  /** Port for mock server child process */
  port: 3001,
  /** Base path to proxy to mock server */
  proxyPath: '/api',
  /** Enable/disable plugin */
  enabled: true,
  /** Timeout (ms) to wait for mock server startup */
  startupTimeout: 5000,
  /** Enable verbose logging */
  verbose: false,
} as const;

/**
 * Creates a Vite plugin instance for OpenAPI mock server integration.
 *
 * This function is the main entry point for the plugin. It accepts
 * configuration options and returns a Vite plugin object that integrates
 * with Vite's development server lifecycle.
 *
 * @param options - Configuration for the plugin behavior. `openApiPath` is required.
 * @returns A Vite plugin object implementing the required lifecycle hooks
 * @throws {Error} When `openApiPath` is missing or not a string
 *
 * @example
 * ```typescript
 * import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';
 * import { defineConfig } from 'vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     openApiServerPlugin({
 *       openApiPath: './api/openapi.yaml',
 *       port: 3456,
 *     }),
 *   ],
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using with all options
 * openApiServerPlugin({
 *   openApiPath: './src/apis/petstore/petstore.openapi.yaml',
 *   port: 3456,
 *   proxyPath: '/api',
 *   handlersDir: './src/apis/petstore/handlers',
 *   seedsDir: './src/apis/petstore/seeds',
 *   verbose: true,
 * });
 * ```
 */
export function openApiServerPlugin(options: InputPluginOptions): Plugin {
  // Validate required options (fail fast)
  if (!options?.openApiPath) {
    throw new Error(`[${PLUGIN_NAME}] Missing required option: openApiPath`);
  }

  if (typeof options.openApiPath !== 'string') {
    throw new Error(`[${PLUGIN_NAME}] openApiPath must be a string`);
  }

  // Merge user options with defaults
  const resolvedOptions: ResolvedPluginOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    openApiPath: options.openApiPath, // Required, explicitly set
  };

  // Plugin state (managed in closure)
  const state = createInitialState();

  return {
    /**
     * Unique plugin name for identification.
     */
    name: PLUGIN_NAME,

    /**
     * Run before other plugins to set up proxy configuration.
     */
    enforce: 'pre',

    /**
     * Only run in development mode (serve), not in production builds.
     */
    apply: 'serve',

    /**
     * Modify Vite config before it's resolved.
     * Used to add proxy configuration for mock server.
     *
     * Configures Vite's built-in proxy to forward requests matching
     * `proxyPath` (e.g., `/api`) to the mock server running on
     * `http://localhost:${port}`. Path rewriting strips the proxy
     * prefix so `/api/pets` becomes `/pets` when forwarded.
     *
     * @returns Partial Vite config to merge with proxy configuration
     */
    config() {
      if (!resolvedOptions.enabled) {
        return {};
      }

      if (resolvedOptions.verbose) {
        // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
        console.log(`[${PLUGIN_NAME}] config() called`);
      }

      const { proxyPath, port, verbose } = resolvedOptions;
      const targetUrl = `http://localhost:${port}`;

      // Escape special regex characters in proxyPath for safe regex construction
      const escapedProxyPath = proxyPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Build proxy configuration for mock server routing
      const proxyConfig: ProxyOptions = {
        // Target mock server URL
        target: targetUrl,
        // Adjust Host header to match target (required for virtual hosting)
        changeOrigin: true,
        // Enable WebSocket proxying for future SSE/WebSocket mock support
        ws: true,
        // Skip SSL certificate verification in dev mode
        secure: false,
        // Strip proxy path prefix: /api/pets → /pets
        rewrite: (path: string) => path.replace(new RegExp(`^${escapedProxyPath}`), ''),
        // Configure proxy event handlers for logging
        configure: verbose
          ? (proxy) => {
              proxy.on('proxyReq', (proxyReq, req) => {
                // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for proxy debugging
                console.log(
                  `[${PLUGIN_NAME}] Proxy: ${req.method} ${req.url} → ${targetUrl}${proxyReq.path}`,
                );
              });
              proxy.on('proxyRes', (proxyRes, req) => {
                // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for proxy debugging
                console.log(
                  `[${PLUGIN_NAME}] Proxy response: ${req.method} ${req.url} ← ${proxyRes.statusCode}`,
                );
              });
              proxy.on('error', (err, req) => {
                // biome-ignore lint/suspicious/noConsole: Intentional error logging for proxy failures
                console.error(
                  `[${PLUGIN_NAME}] Proxy error: ${req.method} ${req.url} - ${err.message}`,
                );
              });
            }
          : undefined,
      };

      if (verbose) {
        // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
        console.log(`[${PLUGIN_NAME}] Configuring proxy: ${proxyPath} → ${targetUrl}`);
      }

      return {
        server: {
          proxy: {
            [proxyPath]: proxyConfig,
          },
        },
      };
    },

    /**
     * Store resolved Vite config for later use.
     *
     * @param config - The resolved Vite configuration
     */
    configResolved(config: ResolvedConfig) {
      state.resolvedConfig = config;

      if (resolvedOptions.verbose) {
        // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
        console.log(`[${PLUGIN_NAME}] configResolved() - root: ${config.root}`);
      }
    },

    /**
     * Configures the Vite development server.
     *
     * This hook is called when the dev server is being configured.
     * It is used to set up the mock server integration, including:
     * - Starting the mock server process
     * - Setting up proxy middleware
     * - Registering file watchers for hot-reload
     *
     * @param server - The Vite development server instance
     */
    configureServer(server: ViteDevServer): void {
      state.devServer = server;

      if (resolvedOptions.verbose) {
        // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
        console.log(`[${PLUGIN_NAME}] configureServer() called`);
      }

      // Phase 3: P3-02 - Register request interception middleware
      // server.middlewares.use((req, res, next) => {
      //   // Intercept requests matching proxyPath
      //   // Forward to mock server child process via IPC
      // });
    },

    /**
     * Called at the start of the build process.
     *
     * This hook is invoked when Vite starts building the project.
     * It triggers mock server startup in development mode.
     * Displays loading banner and handles success/error banners.
     */
    async buildStart(): Promise<void> {
      if (!resolvedOptions.enabled) {
        if (resolvedOptions.verbose) {
          // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
          console.log(`[${PLUGIN_NAME}] Plugin disabled via options`);
        }
        return;
      }

      // Get logger from resolved config (fallback to console-based logger)
      const logger = state.resolvedConfig?.logger ?? createFallbackLogger();

      // Record start time for timing banner
      state.startTime = performance.now();

      // Print loading banner
      printLoadingBanner(resolvedOptions.openApiPath, logger);

      if (resolvedOptions.verbose) {
        // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
        console.log(`[${PLUGIN_NAME}] buildStart() - Mock server start triggered`);
      }

      // Phase 4: P4-01 - Spawn child process
      // mockServerProcess = spawn('node', ['./dist/mock-server.mjs'], { ... });
      // mockServerProcess.on('message', (msg: OpenApiServerMessage) => { ... });
      // Wait for ReadyMessage with timeout
      //
      // Phase 4: When ready IPC message is received, call:
      // import { printSuccessBanner } from "./logging/index.js";
      // printSuccessBanner(
      //   resolvedOptions.port,
      //   endpointCount,  // From ready message
      //   resolvedOptions.openApiPath,
      //   state.startTime!,
      //   logger,
      //   methodCounts    // Optional, from ready message
      // );
      //
      // Phase 4: On error, call:
      // printErrorBanner(error, resolvedOptions.openApiPath, logger);

      // Placeholder: printErrorBanner is imported and ready for Phase 4 error handling
      void printErrorBanner;
    },

    /**
     * Called when the bundle is closed.
     *
     * This hook is invoked when Vite finishes and closes.
     * It triggers graceful shutdown of the mock server.
     */
    async closeBundle(): Promise<void> {
      if (resolvedOptions.verbose) {
        // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
        console.log(`[${PLUGIN_NAME}] closeBundle() - Mock server shutdown triggered`);
      }

      // Phase 4: P4-03 - Graceful shutdown
      // if (mockServerProcess) {
      //   mockServerProcess.send({ type: 'shutdown' });
      //   await waitForExit(mockServerProcess, 5000);
      //   mockServerProcess = null;
      // }

      // Reset state
      state.mockServerProcess = null;
      state.mockServerPort = null;
      state.isReady = false;
      state.startTime = null;
    },
  };
}
