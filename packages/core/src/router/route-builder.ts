/**
 * Route Builder
 *
 * What: Generates Hono routes from OpenAPI document
 * How: Iterates over paths and creates handlers for each operation
 * Why: Enables automatic route generation from spec
 *
 * @see Task 1.4: Hono Router (vite-open-api-server-z5y.4)
 */

import { faker } from '@faker-js/faker';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { Hono, type Context as HonoContext } from 'hono';

import type { HandlerContext, HandlerFn, Logger } from '../handlers/context.js';
import type { HandlerResponse } from '../handlers/executor.js';
import { resolveSecuritySchemes } from '../security/resolver.js';
import type { ResolvedSecurityScheme } from '../security/types.js';
import { validateSecurity } from '../security/validator.js';
import type { SimulationManager } from '../simulation/simulator.js';
import type { Store } from '../store/store.js';
import type { RequestLogEntry, ResponseLogEntry } from '../websocket/protocol.js';
import { convertOpenApiPath } from './path-converter.js';
import { buildRegistry, type RegistryBuilderOptions } from './registry-builder.js';
import type { EndpointEntry, EndpointRegistry, HttpMethod } from './types.js';
import { createEndpointKey } from './types.js';

/**
 * Options for building routes
 */
export interface RouteBuilderOptions {
  /**
   * In-memory store for data operations
   */
  store: Store;

  /**
   * Map of operationId to handler function
   */
  handlers?: Map<string, HandlerFn>;

  /**
   * Map of schema name to seed data arrays
   */
  seeds?: Map<string, unknown[]>;

  /**
   * Simulation manager for error/delay simulation
   */
  simulationManager?: SimulationManager;

  /**
   * Callback for request logging
   */
  onRequest?: (entry: RequestLogEntry) => void;

  /**
   * Callback for response logging
   */
  onResponse?: (entry: ResponseLogEntry) => void;

  /**
   * Custom logger instance (defaults to console)
   */
  logger?: Logger;
}

/**
 * Result of building routes
 */
export interface RouteBuilderResult {
  /**
   * Hono app instance with routes configured
   */
  app: Hono;

  /**
   * Endpoint registry for DevTools access
   */
  registry: EndpointRegistry;

  /**
   * Resolved security schemes from the OpenAPI document
   * Useful for startup logging and DevTools display
   */
  securitySchemes: Map<string, ResolvedSecurityScheme>;
}

/**
 * HTTP methods supported by the router
 */
const HTTP_METHODS: readonly HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
] as const;

/**
 * Build Hono routes from OpenAPI document
 *
 * Creates a Hono application with routes for all operations defined in the
 * OpenAPI document. Each route is configured with appropriate handlers for
 * request validation, response generation, and custom handler execution.
 *
 * Response priority:
 * 1. Custom handler (if registered for operationId)
 * 2. Simulation response (if active simulation for path)
 * 3. Seed data (if available for response schema)
 * 4. OpenAPI example (if defined in spec)
 * 5. Generated data (using Faker.js)
 *
 * @param document - Processed OpenAPI document (dereferenced, upgraded to 3.1)
 * @param options - Route builder options
 * @returns Hono app instance and endpoint registry
 *
 * @example
 * ```typescript
 * const doc = await processOpenApiDocument('./petstore.yaml');
 * const store = createStore();
 * const { app, registry } = buildRoutes(doc, { store });
 *
 * // Mount on existing Hono app
 * mainApp.route('/api', app);
 * ```
 */
export function buildRoutes(
  document: OpenAPIV3_1.Document,
  options: RouteBuilderOptions,
): RouteBuilderResult {
  const {
    store,
    handlers = new Map(),
    seeds = new Map(),
    simulationManager,
    onRequest,
    onResponse,
    logger = console,
  } = options;

  // Build registry with handler/seed information
  const registryOptions: RegistryBuilderOptions = {
    handlerOperationIds: new Set(handlers.keys()),
    seedSchemaNames: new Set(seeds.keys()),
  };
  const registry = buildRegistry(document, registryOptions);

  // Resolve security schemes from document for credential validation
  const securitySchemes = resolveSecuritySchemes(document);

  // Create Hono app
  const app = new Hono();

  // Get paths from document
  const paths = document.paths ?? {};

  // Iterate over all paths and methods
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as OpenAPIV3_1.OperationObject | undefined;
      if (!operation) continue;

      // Get endpoint entry from registry
      const key = createEndpointKey(method, path);
      const endpoint = registry.endpoints.get(key);
      if (!endpoint) continue;

      // Convert OpenAPI path to Hono format
      const honoPath = convertOpenApiPath(path);

      // Register route on Hono app using explicit method call
      // We need to use a type-safe approach since dynamic indexing doesn't work with Hono
      const registerRoute = (
        app: Hono,
        method: HttpMethod,
        path: string,
        handler: (c: HonoContext) => Promise<Response>,
      ) => {
        switch (method) {
          case 'get':
            return app.get(path, handler);
          case 'post':
            return app.post(path, handler);
          case 'put':
            return app.put(path, handler);
          case 'patch':
            return app.patch(path, handler);
          case 'delete':
            return app.delete(path, handler);
          case 'options':
            return app.options(path, handler);
          case 'head':
            return app.get(path, handler); // Hono doesn't have head, use get
          case 'trace':
            return app.get(path, handler); // Hono doesn't have trace, use get
        }
      };

      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Route handler requires processing multiple response paths
      registerRoute(app, method, honoPath, async (c: HonoContext) => {
        const startTime = Date.now();
        const requestId = crypto.randomUUID();

        // Parse request data
        const url = new URL(c.req.url);
        const queryParams = parseQueryParams(url.searchParams);
        const requestHeaders = Object.fromEntries(c.req.raw.headers);
        const requestBody = await safeParseBody(c);

        // Build request log entry
        const requestLogEntry: RequestLogEntry = {
          id: requestId,
          method: method.toUpperCase(),
          path: c.req.path,
          operationId: endpoint.operationId,
          timestamp: startTime,
          headers: requestHeaders,
          query: queryParams,
          body: requestBody,
        };

        // Emit request event
        onRequest?.(requestLogEntry);

        // Pre-normalize headers to lowercase keys for efficient case-insensitive lookup
        const normalizedHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(requestHeaders)) {
          normalizedHeaders[key.toLowerCase()] = value;
        }

        // Validate security requirements (before any handler/simulation logic)
        const securityResult = validateSecurity(
          endpoint.security,
          securitySchemes,
          {
            headers: normalizedHeaders,
            query: queryParams,
          },
          { logger },
        );

        if (!securityResult.ok) {
          return sendResponse(
            c,
            {
              status: 401,
              data: { error: 'Unauthorized', message: securityResult.error },
              headers: { 'WWW-Authenticate': buildWwwAuthenticate(endpoint, securitySchemes) },
            },
            {
              requestId,
              duration: Date.now() - startTime,
              simulated: false,
              onResponse,
            },
          );
        }

        let response: HandlerResponse;
        let simulated = false;

        // Check for active simulation first (use method:path key to match DevTools format)
        const simulation = simulationManager?.get(createEndpointKey(method, path));

        // Apply simulation delay if configured (applies to both delay-only and full override)
        if (simulation?.delay && simulation.delay > 0) {
          simulated = true;
          await delay(simulation.delay);
        }

        if (simulation?.body !== undefined) {
          // Full override: use simulation status + body
          simulated = true;
          response = {
            status: simulation.status,
            data: simulation.body,
            headers: simulation.headers,
          };
        } else if (simulation && !simulation.body && simulation.status !== 200) {
          // Status-only override (no body, non-200): return error placeholder
          simulated = true;
          response = {
            status: simulation.status,
            data: { error: 'Simulated error', status: simulation.status },
            headers: simulation.headers,
          };
        } else {
          // Build handler context
          const context: HandlerContext = {
            req: {
              method: method.toUpperCase(),
              path: c.req.path,
              params: c.req.param() as Record<string, string>,
              query: queryParams,
              body: requestBody,
              headers: requestHeaders,
            },
            res: {
              status: 200,
              headers: {},
            },
            store,
            faker,
            logger,
            security: securityResult.context,
          };

          // Response priority: Handler > Seed > Example > Generated
          const handler = handlers.get(endpoint.operationId);

          if (handler) {
            // 1. Custom handler
            try {
              response = await executeHandlerSafe(handler, context);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              logger.error(`Handler error for ${endpoint.operationId}:`, error);
              response = {
                status: 500,
                data: { error: 'Handler execution failed', message: errorMessage },
              };
            }
          } else if (
            endpoint.responseSchema &&
            seeds.has(endpoint.responseSchema) &&
            (seeds.get(endpoint.responseSchema)?.length ?? 0) > 0
          ) {
            // 2. Seed data (only if seed array is not empty)
            response = getSeedResponse(endpoint, operation, seeds, context, store);
          } else {
            // 3. Example or 4. Generated
            response = getExampleOrGeneratedResponse(endpoint, operation, document);
          }
        }

        // Send response (log, set headers, return JSON)
        return sendResponse(c, response, {
          requestId,
          duration: Date.now() - startTime,
          simulated,
          onResponse,
        });
      });
    }
  }

  return { app, registry, securitySchemes };
}

/**
 * Send a JSON response, log it, and set headers in a single call.
 *
 * Centralizes the response-construction pattern used by both the security
 * rejection branch and the normal response path so header setting, timeline
 * logging, and `c.json()` are not duplicated.
 */
function sendResponse(
  c: HonoContext,
  response: HandlerResponse,
  opts: {
    requestId: string;
    duration: number;
    simulated: boolean;
    onResponse?: (entry: ResponseLogEntry) => void;
  },
) {
  const responseLogEntry: ResponseLogEntry = {
    id: crypto.randomUUID(),
    requestId: opts.requestId,
    status: response.status,
    duration: opts.duration,
    headers: response.headers ?? {},
    body: response.data,
    simulated: opts.simulated,
  };
  opts.onResponse?.(responseLogEntry);

  if (response.headers) {
    for (const [headerName, headerValue] of Object.entries(response.headers)) {
      c.header(headerName, headerValue);
    }
  }

  return c.json(response.data, response.status as 200);
}

/**
 * Parse query parameters from URLSearchParams
 *
 * Handles multi-value parameters by returning arrays
 *
 * @param searchParams - URL search params
 * @returns Parsed query object
 */
function parseQueryParams(searchParams: URLSearchParams): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const key of searchParams.keys()) {
    const values = searchParams.getAll(key);
    result[key] = values.length === 1 ? values[0] : values;
  }

  return result;
}

/**
 * Safely parse request body
 *
 * Attempts to parse JSON body, returns undefined on failure
 *
 * @param c - Hono context
 * @returns Parsed body or undefined
 */
async function safeParseBody(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

/**
 * Delay utility for simulation
 *
 * @param ms - Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute handler with safe response normalization
 *
 * @param handler - Handler function
 * @param context - Handler context
 * @returns Normalized response
 */
async function executeHandlerSafe(
  handler: HandlerFn,
  context: HandlerContext,
): Promise<HandlerResponse> {
  const result = await handler(context);

  // Normalize the response based on type discriminant
  switch (result.type) {
    case 'raw':
      return {
        status: 200,
        data: result.data,
      };
    case 'status':
      return {
        status: result.status,
        data: result.data,
      };
    case 'full':
      return {
        status: result.status,
        data: result.data,
        headers: result.headers,
      };
    default:
      // Fallback for unknown types
      return {
        status: 200,
        data: result,
      };
  }
}

/**
 * Get response from seed data
 *
 * @param endpoint - Endpoint entry
 * @param operation - OpenAPI operation
 * @param seeds - Seed data map
 * @param context - Handler context
 * @param store - Store instance for ID field configuration
 * @returns Response with seed data
 */
function getSeedResponse(
  endpoint: EndpointEntry,
  operation: OpenAPIV3_1.OperationObject,
  seeds: Map<string, unknown[]>,
  context: HandlerContext,
  store: Store,
): HandlerResponse {
  const schemaName = endpoint.responseSchema;
  if (!schemaName) {
    return { status: 200, data: null };
  }

  const seedData = seeds.get(schemaName);
  if (!seedData || seedData.length === 0) {
    return { status: 200, data: null };
  }

  // Determine if this is a list or single item response
  const isListResponse = isArrayResponse(operation);

  if (isListResponse) {
    // Return all seed data for list endpoints
    return { status: 200, data: seedData };
  }

  // For single item, try to find by ID from params
  // Use store's configured ID field for this schema
  const idField = store.getIdField(schemaName);
  const idParam =
    context.req.params.id ??
    context.req.params[`${schemaName.toLowerCase()}Id`] ??
    context.req.params[idField];

  if (idParam) {
    // Try to find matching item using the configured ID field
    const item = seedData.find((item) => {
      if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>;
        // Check the configured ID field, plus common fallbacks
        return (
          String(record[idField]) === idParam ||
          String(record.id) === idParam ||
          String(record.ID) === idParam
        );
      }
      return false;
    });

    if (item) {
      return { status: 200, data: item };
    }

    // Not found
    return { status: 404, data: { error: 'Not found', message: `${schemaName} not found` } };
  }

  // Return first item as default
  return { status: 200, data: seedData[0] };
}

/**
 * Check if operation returns an array response
 *
 * @param operation - OpenAPI operation
 * @returns True if response is an array
 */
function isArrayResponse(operation: OpenAPIV3_1.OperationObject): boolean {
  const responses = operation.responses;
  if (!responses) return false;

  const response =
    (responses['200'] as OpenAPIV3_1.ResponseObject) ??
    (responses['201'] as OpenAPIV3_1.ResponseObject) ??
    (responses.default as OpenAPIV3_1.ResponseObject);
  if (!response) return false;

  const content = response.content;
  if (!content) return false;

  const jsonContent = content['application/json'] ?? content['*/*'];
  if (!jsonContent) return false;

  const schema = jsonContent.schema as OpenAPIV3_1.SchemaObject | undefined;
  return schema?.type === 'array';
}

/**
 * Get response from OpenAPI example or generate data
 *
 * @param endpoint - Endpoint entry
 * @param operation - OpenAPI operation
 * @param document - OpenAPI document
 * @returns Response with example or generated data
 */
function getExampleOrGeneratedResponse(
  _endpoint: EndpointEntry,
  operation: OpenAPIV3_1.OperationObject,
  _document: OpenAPIV3_1.Document,
): HandlerResponse {
  // Try to get example from response
  const example = extractExample(operation);
  if (example !== undefined) {
    return { status: 200, data: example };
  }

  // Generate placeholder response
  const schema = extractResponseSchema(operation);
  if (schema) {
    const generated = generatePlaceholderData(schema);
    return { status: 200, data: generated };
  }

  // No schema - return empty object
  return { status: 200, data: {} };
}

/**
 * Extract example from operation response
 *
 * @param operation - OpenAPI operation
 * @returns Example value or undefined
 */
function extractExample(operation: OpenAPIV3_1.OperationObject): unknown {
  const responses = operation.responses;
  if (!responses) return undefined;

  const response =
    (responses['200'] as OpenAPIV3_1.ResponseObject) ??
    (responses['201'] as OpenAPIV3_1.ResponseObject) ??
    (responses.default as OpenAPIV3_1.ResponseObject);
  if (!response) return undefined;

  const content = response.content;
  if (!content) return undefined;

  const jsonContent = content['application/json'] ?? content['*/*'];
  if (!jsonContent) return undefined;

  // Check for example at media type level
  if (jsonContent.example !== undefined) {
    return jsonContent.example;
  }

  // Check for examples (plural)
  if (jsonContent.examples) {
    const firstExample = Object.values(jsonContent.examples)[0] as
      | OpenAPIV3_1.ExampleObject
      | undefined;
    if (firstExample?.value !== undefined) {
      return firstExample.value;
    }
  }

  // Check for example in schema
  const schema = jsonContent.schema as OpenAPIV3_1.SchemaObject | undefined;
  if (schema?.example !== undefined) {
    return schema.example;
  }

  return undefined;
}

/**
 * Extract response schema from operation
 *
 * @param operation - OpenAPI operation
 * @returns Schema object or undefined
 */
function extractResponseSchema(
  operation: OpenAPIV3_1.OperationObject,
): OpenAPIV3_1.SchemaObject | undefined {
  const responses = operation.responses;
  if (!responses) return undefined;

  const response =
    (responses['200'] as OpenAPIV3_1.ResponseObject) ??
    (responses['201'] as OpenAPIV3_1.ResponseObject) ??
    (responses.default as OpenAPIV3_1.ResponseObject);
  if (!response) return undefined;

  const content = response.content;
  if (!content) return undefined;

  const jsonContent = content['application/json'] ?? content['*/*'];
  if (!jsonContent) return undefined;

  return jsonContent.schema as OpenAPIV3_1.SchemaObject | undefined;
}

/**
 * Generate placeholder data from schema
 *
 * This is a simplified generator - Task 1.5 will implement the full version.
 *
 * @param schema - OpenAPI schema
 * @returns Generated data
 */
function generatePlaceholderData(schema: OpenAPIV3_1.SchemaObject): unknown {
  // Handle array type
  if (schema.type === 'array' && schema.items) {
    const itemSchema = schema.items as OpenAPIV3_1.SchemaObject;
    return [generatePlaceholderData(itemSchema)];
  }

  // Handle object type
  if (schema.type === 'object' || schema.properties) {
    const result: Record<string, unknown> = {};
    const properties = schema.properties ?? {};

    for (const [propName, propSchema] of Object.entries(properties)) {
      result[propName] = generatePlaceholderValue(propName, propSchema as OpenAPIV3_1.SchemaObject);
    }

    return result;
  }

  // Primitive types
  return generatePlaceholderValue('', schema);
}

/**
 * Generate a placeholder value for a property
 *
 * @param propName - Property name (for smart detection)
 * @param schema - Property schema
 * @returns Generated value
 */
function generatePlaceholderValue(propName: string, schema: OpenAPIV3_1.SchemaObject): unknown {
  const type = schema.type;
  const format = schema.format;

  // Use schema default if available
  if (schema.default !== undefined) {
    return schema.default;
  }

  // Use enum first value if available
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }

  // Handle by type
  switch (type) {
    case 'string':
      return generateStringValue(propName, format);
    case 'integer':
    case 'number':
      return generateNumberValue(propName, type, schema);
    case 'boolean':
      return true;
    case 'array':
      if (schema.items) {
        return [generatePlaceholderValue('item', schema.items as OpenAPIV3_1.SchemaObject)];
      }
      return [];
    case 'object':
      return generatePlaceholderData(schema);
    default:
      return null;
  }
}

/**
 * Generate a string value based on format and property name
 *
 * @param propName - Property name
 * @param format - OpenAPI format
 * @returns Generated string
 */
function generateStringValue(propName: string, format?: string): string {
  // Handle format-based generation
  switch (format) {
    case 'date':
      return faker.date.recent().toISOString().split('T')[0];
    case 'date-time':
      return faker.date.recent().toISOString();
    case 'email':
      return faker.internet.email();
    case 'uri':
    case 'url':
      return faker.internet.url();
    case 'uuid':
      return faker.string.uuid();
    case 'hostname':
      return faker.internet.domainName();
    case 'ipv4':
      return faker.internet.ipv4();
    case 'ipv6':
      return faker.internet.ipv6();
    case 'password':
      return faker.internet.password();
    default:
      break;
  }

  // Handle property name-based generation
  const lowerName = propName.toLowerCase();
  if (lowerName.includes('name')) return faker.person.fullName();
  if (lowerName.includes('email')) return faker.internet.email();
  if (lowerName.includes('phone')) return faker.phone.number();
  if (lowerName.includes('address')) return faker.location.streetAddress();
  if (lowerName.includes('city')) return faker.location.city();
  if (lowerName.includes('country')) return faker.location.country();
  if (lowerName.includes('description')) return faker.lorem.sentence();
  if (lowerName.includes('title')) return faker.lorem.words(3);
  if (lowerName.includes('url') || lowerName.includes('link')) return faker.internet.url();
  if (lowerName.includes('image') || lowerName.includes('photo') || lowerName.includes('avatar'))
    return faker.image.url();

  // Default: lorem words
  return faker.lorem.words(2);
}

/**
 * Generate a number value
 *
 * @param propName - Property name
 * @param type - 'integer' or 'number'
 * @param schema - Schema for min/max
 * @returns Generated number
 */
function generateNumberValue(
  propName: string,
  type: string,
  schema: OpenAPIV3_1.SchemaObject,
): number {
  const min = typeof schema.minimum === 'number' ? schema.minimum : 1;
  const max = typeof schema.maximum === 'number' ? schema.maximum : 1000;

  const lowerName = propName.toLowerCase();

  // Handle common property names
  if (lowerName.includes('id')) {
    return faker.number.int({ min: 1, max: 999999 });
  }
  if (lowerName.includes('price') || lowerName.includes('amount')) {
    return Number.parseFloat(faker.commerce.price({ min: 1, max: 1000 }));
  }
  if (lowerName.includes('quantity') || lowerName.includes('count')) {
    return faker.number.int({ min: 1, max: 100 });
  }
  if (lowerName.includes('age')) {
    return faker.number.int({ min: 1, max: 100 });
  }

  if (type === 'integer') {
    return faker.number.int({ min, max });
  }

  return faker.number.float({ min, max, fractionDigits: 2 });
}

/**
 * Build a WWW-Authenticate header value for 401 responses
 *
 * Uses the endpoint's security requirements to determine the appropriate
 * authentication challenge(s).
 *
 * @param endpoint - Endpoint entry with security requirements
 * @param schemes - Resolved security schemes
 * @returns WWW-Authenticate header value
 */
function buildWwwAuthenticate(
  endpoint: EndpointEntry,
  schemes: Map<string, ResolvedSecurityScheme>,
): string {
  const challenges: string[] = [];

  for (const req of endpoint.security) {
    const scheme = schemes.get(req.name);
    if (!scheme) continue;

    if (scheme.type === 'http' || scheme.type === 'oauth2') {
      // Non-basic HTTP auth schemes (e.g., digest, hoba) are collapsed to "Bearer"
      // as a pragmatic simplification for the mock server. API key is handled
      // separately below with its own challenge format. Adjust here if more
      // precise scheme handling is needed in the future.
      const schemeName = scheme.scheme === 'basic' ? 'Basic' : 'Bearer';
      challenges.push(`${schemeName} realm="OpenAPI Mock Server"`);
    } else if (scheme.type === 'apiKey') {
      // Sanitize paramName to prevent header injection from malicious specs
      const safeParamName = scheme.paramName.replace(/[\r\n"]/g, '');
      challenges.push(`ApiKey realm="OpenAPI Mock Server", param="${safeParamName}"`);
    }
  }

  return challenges.length > 0 ? challenges.join(', ') : 'Bearer realm="OpenAPI Mock Server"';
}

// Re-export types for convenience
export type { EndpointRegistry } from './types.js';
