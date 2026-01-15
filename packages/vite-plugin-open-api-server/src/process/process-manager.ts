/**
 * Process Manager Module
 *
 * ## What
 * This module manages the lifecycle of the mock server child process,
 * including spawning, environment variable passing, IPC setup, stdout/stderr
 * forwarding, and graceful shutdown.
 *
 * ## How
 * Uses Node.js `fork()` to spawn a child process running the mock server.
 * The child process is configured with:
 * - Environment variables for configuration (PORT, OPENAPI_SPEC_PATH, etc.)
 * - IPC channel for communication (automatic with fork)
 * - Piped stdout/stderr for log forwarding
 *
 * ## Why
 * Running the mock server in a separate child process provides:
 * - Process isolation: crashes don't affect Vite
 * - Independent restart capability
 * - Clear IPC protocol for parent-child communication
 * - Resource management and cleanup
 *
 * @module process/process-manager
 */

import { type ChildProcess, fork } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Logger } from 'vite';
import type { ResolvedPluginOptions } from '../types/plugin-options.js';

/**
 * Log prefix for process manager messages.
 * @internal
 */
const LOG_PREFIX = '[process-manager]';

/**
 * Resolves the path to the mock server runner script.
 *
 * The runner is compiled to dist/runner/openapi-server-runner.mjs
 * and needs to be resolved relative to this module's location.
 *
 * @returns Absolute path to the runner script
 * @internal
 */
function resolveRunnerPath(): string {
  // Get the directory of this module
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // In development (src), the runner is at ../runner/openapi-server-runner.mts
  // In production (dist), it's at ../runner/openapi-server-runner.mjs
  // Since this file will be compiled to dist/process/process-manager.mjs,
  // the runner will be at ../runner/openapi-server-runner.mjs
  return path.resolve(__dirname, '../runner/openapi-server-runner.mjs');
}

/**
 * Builds the environment object for the child process.
 *
 * Inherits the parent environment and adds plugin-specific
 * configuration variables.
 *
 * @param options - Resolved plugin options
 * @returns Environment object for child process
 * @internal
 */
function buildChildEnvironment(options: ResolvedPluginOptions): NodeJS.ProcessEnv {
  return {
    // Inherit parent environment
    ...process.env,
    // Plugin-specific configuration
    PORT: String(options.port),
    OPENAPI_SPEC_PATH: options.openApiPath,
    VERBOSE: String(options.verbose),
    // Optional directories (only set if provided)
    ...(options.handlersDir ? { HANDLERS_DIR: options.handlersDir } : {}),
    ...(options.seedsDir ? { SEEDS_DIR: options.seedsDir } : {}),
  };
}

/**
 * Spawns the mock server as a child process using Node.js fork().
 *
 * The child process runs the openapi-server-runner script with configuration
 * passed via environment variables. IPC is automatically set up by fork().
 *
 * Features:
 * - Environment variable configuration (PORT, OPENAPI_SPEC_PATH, etc.)
 * - Piped stdout/stderr for log forwarding
 * - Exit event handling for crash recovery
 * - Error recovery (returns null on failure instead of crashing)
 *
 * @param options - Resolved plugin options containing configuration
 * @param logger - Vite logger for output
 * @returns The spawned ChildProcess, or null if spawning failed
 *
 * @example
 * ```typescript
 * const process = await spawnMockServer(resolvedOptions, logger);
 * if (process) {
 *   // Mock server is starting
 *   process.on('message', handleIpcMessage);
 * } else {
 *   // Failed to spawn, Vite continues without mock server
 * }
 * ```
 */
export async function spawnMockServer(
  options: ResolvedPluginOptions,
  logger: Logger,
): Promise<ChildProcess | null> {
  const runnerPath = resolveRunnerPath();
  const env = buildChildEnvironment(options);

  if (options.verbose) {
    logger.info(`${LOG_PREFIX} Spawning mock server...`);
    logger.info(`${LOG_PREFIX} Runner path: ${runnerPath}`);
    logger.info(`${LOG_PREFIX} Port: ${options.port}`);
    logger.info(`${LOG_PREFIX} Spec: ${options.openApiPath}`);
  }

  try {
    const child = fork(runnerPath, [], {
      // Pass configuration via environment variables
      env,
      // Pipe stdout/stderr for log forwarding
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      // Use current working directory
      cwd: process.cwd(),
      // Ensure child can be detached on shutdown
      detached: false,
    });

    // Forward stdout to Vite logger (info level)
    child.stdout?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        // Split by newlines in case multiple log lines come at once
        for (const line of message.split('\n')) {
          if (line.trim()) {
            logger.info(line);
          }
        }
      }
    });

    // Forward stderr to Vite logger (error level)
    child.stderr?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        // Split by newlines in case multiple log lines come at once
        for (const line of message.split('\n')) {
          if (line.trim()) {
            logger.error(line);
          }
        }
      }
    });

    // Handle child process exit
    child.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        logger.error(`${LOG_PREFIX} Mock server exited with code ${code}`);
      } else if (signal) {
        logger.warn(`${LOG_PREFIX} Mock server killed by signal ${signal}`);
      } else if (options.verbose) {
        logger.info(`${LOG_PREFIX} Mock server exited normally`);
      }
    });

    // Handle spawn errors
    child.on('error', (error) => {
      logger.error(`${LOG_PREFIX} Mock server process error: ${error.message}`);
    });

    return child;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;

    // Handle specific error codes with helpful messages
    if (err.code === 'ENOENT') {
      logger.error(`${LOG_PREFIX} Failed to spawn mock server: runner script not found`);
      logger.error(`${LOG_PREFIX} Expected at: ${runnerPath}`);
      logger.error(`${LOG_PREFIX} Ensure the plugin is built correctly (pnpm build)`);
    } else if (err.code === 'EACCES') {
      logger.error(`${LOG_PREFIX} Failed to spawn mock server: permission denied`);
      logger.error(`${LOG_PREFIX} Check file permissions for: ${runnerPath}`);
    } else {
      logger.error(`${LOG_PREFIX} Failed to spawn mock server: ${err.message}`);
    }

    // Return null to allow Vite to continue without mock server
    return null;
  }
}

/**
 * Options for shutdownMockServer function.
 */
export interface ShutdownOptions {
  /**
   * Timeout in milliseconds to wait for graceful shutdown.
   * After this, SIGTERM is sent.
   * @default 5000
   */
  gracefulTimeout?: number;

  /**
   * Additional timeout after SIGTERM before SIGKILL.
   * @default 2000
   */
  forceTimeout?: number;
}

/**
 * Shuts down the mock server child process gracefully.
 *
 * Shutdown sequence:
 * 1. Send IPC shutdown message (graceful)
 * 2. Wait for gracefulTimeout (default 5s)
 * 3. If still running, send SIGTERM
 * 4. Wait for forceTimeout (default 2s)
 * 5. If still running, send SIGKILL
 *
 * @param child - The child process to shut down
 * @param logger - Vite logger for output
 * @param options - Shutdown configuration options
 * @returns Promise that resolves when the child has exited
 *
 * @example
 * ```typescript
 * await shutdownMockServer(mockServerProcess, logger);
 * // Process is now terminated
 * ```
 */
export async function shutdownMockServer(
  child: ChildProcess,
  logger: Logger,
  options: ShutdownOptions = {},
): Promise<void> {
  const { gracefulTimeout = 5000, forceTimeout = 2000 } = options;

  // If process already exited, nothing to do
  if (child.exitCode !== null || child.signalCode !== null) {
    logger.info(`${LOG_PREFIX} Mock server already stopped`);
    return;
  }

  return new Promise<void>((resolve) => {
    let resolved = false;

    // Cleanup function to ensure we only resolve once
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // Set up force kill timer (last resort)
    const forceKillTimer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        logger.warn(`${LOG_PREFIX} Force killing mock server (SIGKILL)`);
        child.kill('SIGKILL');
        cleanup();
      }
    }, gracefulTimeout + forceTimeout);

    // Set up SIGTERM timer (escalation after graceful timeout)
    const sigtermTimer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        logger.warn(`${LOG_PREFIX} Sending SIGTERM to mock server`);
        child.kill('SIGTERM');
      }
    }, gracefulTimeout);

    // Listen for exit event to clean up timers
    child.once('exit', () => {
      clearTimeout(sigtermTimer);
      clearTimeout(forceKillTimer);
      logger.info(`${LOG_PREFIX} Mock server stopped`);
      cleanup();
    });

    // Try graceful shutdown via IPC first
    if (child.connected && child.send) {
      logger.info(`${LOG_PREFIX} Sending shutdown message to mock server`);
      child.send({ type: 'shutdown' }, (error) => {
        if (error) {
          // IPC failed, try SIGTERM immediately
          logger.warn(`${LOG_PREFIX} IPC send failed, sending SIGTERM`);
          child.kill('SIGTERM');
        }
      });
    } else {
      // No IPC connection, go straight to SIGTERM
      logger.warn(`${LOG_PREFIX} No IPC connection, sending SIGTERM`);
      child.kill('SIGTERM');
    }
  });
}
