#!/usr/bin/env node
/**
 * OpenAPI Mock Server Runner
 *
 * Standalone HTTP server that generates mock responses from OpenAPI specs.
 * Runs as a child process, communicates with Vite plugin via IPC.
 *
 * ## What
 * This module serves as the entry point for the mock server child process.
 * It reads configuration from environment variables, loads an OpenAPI spec,
 * creates a Scalar mock server, and starts an HTTP server using Hono.
 *
 * ## How
 * 1. Parse environment variables for configuration (PORT, OPENAPI_SPEC_PATH, etc.)
 * 2. Load and validate OpenAPI specification using the parser module
 * 3. Create Scalar mock server instance with the parsed spec
 * 4. Add request logging middleware (conditional on VERBOSE)
 * 5. Start HTTP server with @hono/node-server
 * 6. Send ready IPC message to parent process
 * 7. Handle graceful shutdown on SIGTERM/SIGINT/IPC messages
 *
 * ## Why
 * Running the mock server in a separate child process provides:
 * - Process isolation (crashes don't affect Vite)
 * - Independent restart capability
 * - Clear IPC protocol for parent-child communication
 * - Resource management and cleanup
 *
 * Configuration via environment variables:
 * - PORT: HTTP server port (default: 3001)
 * - OPENAPI_SPEC_PATH: Path to OpenAPI spec file (required)
 * - VERBOSE: Enable verbose logging (default: false)
 * - HANDLERS_DIR: Custom handlers directory (optional)
 * - SEEDS_DIR: Seed data directory (optional)
 *
 * @module runner/openapi-server-runner
 */

import { type ServerType, serve } from '@hono/node-server';
import { createMockServer } from '@scalar/mock-server';
import { Hono } from 'hono';
import type { OpenAPIV3_1 } from 'openapi-types';

import { loadOpenApiSpec } from '../core/parser/index.js';
import { buildRegistry, serializeRegistry } from '../registry/index.js';
import type { OpenApiServerMessage } from '../types/ipc-messages.js';

/**
 * Configuration object parsed from environment variables.
 */
interface RunnerConfig {
  /** HTTP server port */
  port: number;
  /** Path to OpenAPI specification file */
  specPath: string;
  /** Enable verbose request logging */
  verbose: boolean;
  /** Custom handlers directory (optional) */
  handlersDir?: string;
  /** Seed data directory (optional) */
  seedsDir?: string;
}

/**
 * Reads and validates configuration from environment variables.
 *
 * @returns Parsed configuration object
 * @throws {Error} If OPENAPI_SPEC_PATH is not provided
 */
function readConfig(): RunnerConfig {
  const specPath = process.env.OPENAPI_SPEC_PATH;

  if (!specPath) {
    console.error('[mock-server] ERROR: OPENAPI_SPEC_PATH environment variable is required');
    process.exit(1);
  }

  return {
    port: Number.parseInt(process.env.PORT || '3001', 10),
    specPath,
    verbose: process.env.VERBOSE === 'true',
    handlersDir: process.env.HANDLERS_DIR || undefined,
    seedsDir: process.env.SEEDS_DIR || undefined,
  };
}

/**
 * Counts the total number of endpoints in an OpenAPI paths object.
 *
 * @param paths - The paths object from the OpenAPI spec
 * @returns Total number of endpoint operations
 */
function countEndpoints(paths: Record<string, unknown> | undefined): number {
  if (!paths) {
    return 0;
  }

  const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
  let count = 0;

  for (const pathItem of Object.values(paths)) {
    if (typeof pathItem === 'object' && pathItem !== null) {
      for (const method of methods) {
        if (method in pathItem) {
          count++;
        }
      }
    }
  }

  return count;
}

/**
 * Sends an IPC message to the parent process if available.
 *
 * @param message - The message to send
 */
function sendIpcMessage(message: OpenApiServerMessage): void {
  if (process.send) {
    process.send(message);
  }
}

/**
 * Server instance reference for graceful shutdown.
 */
let server: ServerType | null = null;

/**
 * Flag to prevent multiple shutdown attempts.
 */
let isShuttingDown = false;

/**
 * Performs graceful shutdown of the HTTP server.
 */
async function shutdown(): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log('[mock-server] Shutting down...');

  // Set a timeout for force exit
  const forceExitTimeout = setTimeout(() => {
    console.error('[mock-server] Shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, 5000);

  try {
    if (server) {
      server.close();
    }

    clearTimeout(forceExitTimeout);
    console.log('[mock-server] Shutdown complete');
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimeout);
    console.error('[mock-server] Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Main entry point for the mock server runner.
 */
async function main(): Promise<void> {
  // Read configuration from environment variables
  const config = readConfig();

  if (config.verbose) {
    console.log('[mock-server] Starting with configuration:');
    console.log(`  PORT: ${config.port}`);
    console.log(`  OPENAPI_SPEC_PATH: ${config.specPath}`);
    console.log(`  VERBOSE: ${config.verbose}`);
    if (config.handlersDir) {
      console.log(`  HANDLERS_DIR: ${config.handlersDir}`);
    }
    if (config.seedsDir) {
      console.log(`  SEEDS_DIR: ${config.seedsDir}`);
    }
  }

  // Load and parse OpenAPI specification
  if (config.verbose) {
    console.log(`[mock-server] Loading OpenAPI spec from: ${config.specPath}`);
  }

  const spec = await loadOpenApiSpec(config.specPath);
  const endpointCount = countEndpoints(spec.paths);

  if (config.verbose) {
    console.log(
      `[mock-server] Parsed ${endpointCount} endpoints from spec: ${spec.info.title} v${spec.info.version}`,
    );
  }

  // Build endpoint registry for inspection endpoint
  // We create a simple logger adapter since we're in a child process without Vite
  const consoleLogger = {
    info: (msg: string) => config.verbose && console.log(msg),
    warn: (msg: string) => console.warn(msg),
    error: (msg: string) => console.error(msg),
    warnOnce: (msg: string) => console.warn(msg),
    clearScreen: () => {},
    hasWarned: false,
    hasErrorLogged: () => false,
  };

  // Cast spec to OpenAPIV3_1.Document for registry functions
  // The types are structurally compatible but differ in some edge cases (e.g., enum tuples)
  const specAsOpenAPI = spec as unknown as OpenAPIV3_1.Document;

  const { registry } = buildRegistry(
    specAsOpenAPI,
    consoleLogger as Parameters<typeof buildRegistry>[1],
  );

  if (config.verbose) {
    console.log(
      `[mock-server] Built registry: ${registry.endpoints.size} endpoints, ${registry.schemas.size} schemas, ${registry.securitySchemes.size} security schemes`,
    );
  }

  // Create Hono app with logging middleware
  const app = new Hono();

  // Add request logging middleware (before Scalar routes)
  if (config.verbose) {
    app.use('*', async (c, next) => {
      const start = Date.now();
      const method = c.req.method;
      const path = c.req.path;
      const query = c.req.query();
      const queryString =
        Object.keys(query).length > 0 ? `?${new URLSearchParams(query).toString()}` : '';

      await next();

      const duration = Date.now() - start;
      const status = c.res.status;
      const timestamp = new Date().toISOString();

      console.log(
        `[mock-server] ${timestamp} ${method} ${path}${queryString} - ${status} (${duration}ms)`,
      );
    });
  }

  /**
   * Registry Inspection Endpoint
   *
   * GET /_openapiserver/registry
   *
   * Returns the complete endpoint registry as JSON for debugging and introspection.
   * This endpoint allows developers to inspect which endpoints are mocked,
   * which have custom handlers, schema definitions, and statistics.
   *
   * @returns JSON response with registry metadata, endpoints, schemas, security schemes, and statistics
   */
  app.get('/_openapiserver/registry', (c) => {
    const serialized = serializeRegistry(registry, {
      spec: specAsOpenAPI,
      port: config.port,
      version: '1.0.0',
    });

    return c.json(serialized, 200);
  });

  // Create Scalar mock server (returns a Hono app with all routes configured)
  const mockServer = await createMockServer({
    document: spec,
  });

  // Mount the mock server routes on our Hono app
  // We use type assertion because Scalar's Hono instance is compatible
  app.route('/', mockServer as unknown as Hono);

  // Start HTTP server
  server = serve({
    fetch: app.fetch,
    port: config.port,
  });

  console.log(`[mock-server] Server listening on http://localhost:${config.port}`);
  console.log(`[mock-server] Special endpoints: /_openapiserver/registry (inspection)`);

  // Send ready IPC message to parent process
  sendIpcMessage({
    type: 'ready',
    port: config.port,
    endpointCount,
  });

  // Register shutdown handlers
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Listen for IPC shutdown message from parent
  process.on('message', (msg: unknown) => {
    if (typeof msg === 'object' && msg !== null && 'type' in msg) {
      const message = msg as OpenApiServerMessage;
      if (message.type === 'shutdown') {
        shutdown();
      }
    }
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[mock-server] Unhandled rejection at:', promise, 'reason:', reason);

  sendIpcMessage({
    type: 'error',
    message: `Unhandled rejection: ${reason}`,
    stack: reason instanceof Error ? reason.stack : undefined,
  });

  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[mock-server] Uncaught exception:', error);

  sendIpcMessage({
    type: 'error',
    message: error.message,
    stack: error.stack,
  });

  process.exit(1);
});

// Run main function with error handling
main().catch((error) => {
  const err = error as Error;
  console.error('[mock-server] Fatal error:', err.message);

  if (err.stack) {
    console.error(err.stack);
  }

  sendIpcMessage({
    type: 'error',
    message: err.message,
    stack: err.stack,
  });

  process.exit(1);
});
