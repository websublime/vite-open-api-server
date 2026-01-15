/**
 * Vue DevTools Plugin for OpenAPI Server
 *
 * ## What
 * This module provides Vue DevTools integration for the OpenAPI mock server,
 * allowing developers to inspect endpoints, handlers, and request logs
 * directly in Vue DevTools.
 *
 * ## How
 * Uses the `@vue/devtools-api` to register a custom inspector that displays:
 * - Endpoint tree with method, path, and operationId
 * - Handler status badges (custom handlers marked in green)
 * - Detailed endpoint information when selected
 * - Request/response schemas and security requirements
 *
 * ## Why
 * Provides better developer experience by exposing mock server state
 * in a familiar debugging environment. Developers can quickly verify
 * endpoint configuration and troubleshoot API integration issues.
 *
 * @module
 */

import type { EndpointRegistryEntry, OpenApiEndpointRegistry } from '../types/registry.js';

/**
 * Vue App instance type.
 *
 * We use a generic type here instead of importing from 'vue' to avoid
 * requiring vue as a dependency. The actual type is provided by @vue/devtools-api.
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic Vue App type for DevTools compatibility
type VueApp = any;

/**
 * DevTools plugin constants
 */
export const DEVTOOLS_PLUGIN_ID = 'vite-openapi-server';
export const DEVTOOLS_PLUGIN_LABEL = 'OpenAPI Server';
export const DEVTOOLS_INSPECTOR_ID = 'openapi-endpoints';
export const DEVTOOLS_INSPECTOR_LABEL = 'Endpoints';

/**
 * Global state key for exposing plugin state to DevTools
 */
export const GLOBAL_STATE_KEY = '__VITE_OPENAPI_SERVER__';

/**
 * Request log entry for tracking API requests
 */
export interface RequestLogEntry {
  /** Unique request ID */
  id: string;
  /** HTTP method */
  method: string;
  /** Request path */
  path: string;
  /** Request timestamp */
  timestamp: number;
  /** Response status code */
  status?: number;
  /** Response time in milliseconds */
  duration?: number;
  /** Operation ID if matched */
  operationId?: string;
}

/**
 * Global state structure exposed on window object
 */
export interface OpenApiServerGlobalState {
  /** OpenAPI endpoint registry */
  registry: OpenApiEndpointRegistry | null;
  /** Map of operationId to handler status */
  handlers: Map<string, boolean>;
  /** Request log for debugging */
  requestLog: RequestLogEntry[];
  /** Maximum number of log entries to keep */
  maxLogEntries: number;
  /** Plugin version */
  version: string;
}

/**
 * Options for setting up the DevTools plugin
 */
export interface SetupDevToolsOptions {
  /** Vue application instance (from createApp) */
  app: VueApp;
  /** OpenAPI endpoint registry */
  registry: OpenApiEndpointRegistry;
  /** Map of operation IDs to handler presence */
  handlers?: Map<string, boolean>;
  /** Package version for display */
  version?: string;
}

/**
 * Color constants for DevTools badges (ARGB format)
 */
const BADGE_COLORS = {
  /** Green color for custom handlers */
  HANDLER: {
    text: 0xffffff,
    background: 0x42b883,
  },
  /** Blue color for seed data */
  SEED: {
    text: 0xffffff,
    background: 0x3b82f6,
  },
  /** Gray color for default/mock */
  DEFAULT: {
    text: 0xffffff,
    background: 0x6b7280,
  },
  /** Method colors */
  GET: {
    text: 0xffffff,
    background: 0x22c55e,
  },
  POST: {
    text: 0xffffff,
    background: 0xf59e0b,
  },
  PUT: {
    text: 0xffffff,
    background: 0x3b82f6,
  },
  PATCH: {
    text: 0xffffff,
    background: 0x8b5cf6,
  },
  DELETE: {
    text: 0xffffff,
    background: 0xef4444,
  },
} as const;

/**
 * Gets the color configuration for an HTTP method
 */
function getMethodColor(method: string): { text: number; background: number } {
  const upperMethod = method.toUpperCase();
  return BADGE_COLORS[upperMethod as keyof typeof BADGE_COLORS] ?? BADGE_COLORS.DEFAULT;
}

/**
 * Checks if the environment supports DevTools integration
 *
 * @returns Object with check results and overall support status
 */
export function checkDevToolsSupport(): {
  isSupported: boolean;
  isDev: boolean;
  isBrowser: boolean;
  hasDevToolsHook: boolean;
} {
  // Check if we're in development mode
  // Note: This check must be done at runtime in the browser context
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';

  // Check if Vue DevTools is installed
  const hasDevToolsHook =
    // biome-ignore lint/suspicious/noExplicitAny: Window type augmentation for DevTools hook detection
    isBrowser && typeof (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';

  return {
    isSupported: isDev && isBrowser && hasDevToolsHook,
    isDev,
    isBrowser,
    hasDevToolsHook,
  };
}

/**
 * Gets or creates the global state object for OpenAPI Server
 *
 * @returns The global state object
 */
export function getGlobalState(): OpenApiServerGlobalState {
  if (typeof window === 'undefined') {
    // Return a mock state for SSR/non-browser contexts
    return {
      registry: null,
      handlers: new Map(),
      requestLog: [],
      maxLogEntries: 100,
      version: '0.0.0',
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Dynamic window property access for global state
  const win = window as any;

  if (!win[GLOBAL_STATE_KEY]) {
    win[GLOBAL_STATE_KEY] = {
      registry: null,
      handlers: new Map<string, boolean>(),
      requestLog: [] as RequestLogEntry[],
      maxLogEntries: 100,
      version: '0.0.0',
    } satisfies OpenApiServerGlobalState;
  }

  return win[GLOBAL_STATE_KEY];
}

/**
 * Updates the global state with registry and handler information
 *
 * @param registry - OpenAPI endpoint registry
 * @param handlers - Map of operation IDs to handler presence
 * @param version - Plugin version
 */
export function updateGlobalState(
  registry: OpenApiEndpointRegistry,
  handlers?: Map<string, boolean>,
  version?: string,
): void {
  const state = getGlobalState();
  state.registry = registry;

  if (handlers) {
    state.handlers = handlers;
  }

  if (version) {
    state.version = version;
  }
}

/**
 * Logs a request to the global state
 *
 * @param entry - Request log entry
 */
export function logRequest(entry: RequestLogEntry): void {
  const state = getGlobalState();

  state.requestLog.unshift(entry);

  // Trim log if it exceeds max entries
  if (state.requestLog.length > state.maxLogEntries) {
    state.requestLog = state.requestLog.slice(0, state.maxLogEntries);
  }
}

/**
 * Clears the request log
 */
export function clearRequestLog(): void {
  const state = getGlobalState();
  state.requestLog = [];
}

/**
 * Builds the inspector tree structure for DevTools
 *
 * @param registry - OpenAPI endpoint registry
 * @param filter - Optional filter string
 * @returns Tree structure for DevTools inspector
 */
// biome-ignore lint/suspicious/noExplicitAny: DevTools API requires dynamic tree node structure
export function buildInspectorTree(registry: OpenApiEndpointRegistry, filter?: string): any[] {
  const endpoints = Array.from(registry.endpoints.values());

  // Apply filter if provided
  const filteredEndpoints = filter
    ? endpoints.filter(
        (ep) =>
          ep.path.toLowerCase().includes(filter.toLowerCase()) ||
          ep.method.toLowerCase().includes(filter.toLowerCase()) ||
          ep.operationId.toLowerCase().includes(filter.toLowerCase()),
      )
    : endpoints;

  // Group endpoints by tag
  const groupedByTag = new Map<string, EndpointRegistryEntry[]>();

  for (const endpoint of filteredEndpoints) {
    const tag = endpoint.tags?.[0] ?? 'default';
    const existing = groupedByTag.get(tag) ?? [];
    existing.push(endpoint);
    groupedByTag.set(tag, existing);
  }

  // Build tree nodes for each tag group
  const tagNodes = Array.from(groupedByTag.entries()).map(([tag, tagEndpoints]) => ({
    id: `tag:${tag}`,
    label: tag.charAt(0).toUpperCase() + tag.slice(1),
    children: tagEndpoints.map((ep) => {
      const methodColor = getMethodColor(ep.method);
      // biome-ignore lint/suspicious/noExplicitAny: DevTools API tag structure is dynamic
      const tags: any[] = [
        {
          label: ep.method.toUpperCase(),
          textColor: methodColor.text,
          backgroundColor: methodColor.background,
        },
      ];

      if (ep.hasHandler) {
        tags.push({
          label: 'Handler',
          textColor: BADGE_COLORS.HANDLER.text,
          backgroundColor: BADGE_COLORS.HANDLER.background,
          tooltip: 'Custom handler registered',
        });
      }

      if (ep.hasSeed) {
        tags.push({
          label: 'Seed',
          textColor: BADGE_COLORS.SEED.text,
          backgroundColor: BADGE_COLORS.SEED.background,
          tooltip: 'Seed data available',
        });
      }

      return {
        id: ep.operationId,
        label: ep.path,
        tags,
      };
    }),
    tags: [
      {
        label: `${tagEndpoints.length}`,
        textColor: 0x000000,
        backgroundColor: 0xe5e7eb,
      },
    ],
  }));

  // Return root node with all tag groups
  return [
    {
      id: 'root',
      label: `Endpoints (${filteredEndpoints.length})`,
      children: tagNodes,
    },
  ];
}

/**
 * Builds the inspector state for a selected endpoint
 *
 * @param registry - OpenAPI endpoint registry
 * @param nodeId - Selected node ID (operationId or tag ID)
 * @returns State object for DevTools inspector
 */
export function buildInspectorState(
  registry: OpenApiEndpointRegistry,
  nodeId: string,
  // biome-ignore lint/suspicious/noExplicitAny: DevTools API state structure is dynamic
): Record<string, any[]> {
  // Handle root node
  if (nodeId === 'root') {
    const state = getGlobalState();
    return {
      'Registry Info': [
        { key: 'Total Endpoints', value: registry.endpoints.size },
        { key: 'Schemas', value: registry.schemas.size },
        { key: 'Security Schemes', value: registry.securitySchemes.size },
        { key: 'Plugin Version', value: state.version },
      ],
    };
  }

  // Handle tag node
  if (nodeId.startsWith('tag:')) {
    const tag = nodeId.slice(4);
    const tagEndpoints = Array.from(registry.endpoints.values()).filter(
      (ep) => (ep.tags?.[0] ?? 'default') === tag,
    );

    return {
      'Tag Info': [
        { key: 'Name', value: tag },
        { key: 'Endpoints', value: tagEndpoints.length },
        {
          key: 'With Handlers',
          value: tagEndpoints.filter((ep) => ep.hasHandler).length,
        },
        {
          key: 'With Seeds',
          value: tagEndpoints.filter((ep) => ep.hasSeed).length,
        },
      ],
      Endpoints: tagEndpoints.map((ep) => ({
        key: `${ep.method.toUpperCase()} ${ep.path}`,
        value: ep.operationId,
      })),
    };
  }

  // Handle endpoint node
  const endpoint = registry.endpoints.get(nodeId);
  if (!endpoint) {
    // Try to find by operationId
    const found = Array.from(registry.endpoints.values()).find((ep) => ep.operationId === nodeId);
    if (!found) {
      return {
        Error: [{ key: 'Message', value: `Endpoint not found: ${nodeId}` }],
      };
    }
    return buildEndpointState(found, registry);
  }

  return buildEndpointState(endpoint, registry);
}

/**
 * Builds detailed state for an endpoint
 */
function buildEndpointState(
  endpoint: EndpointRegistryEntry,
  registry: OpenApiEndpointRegistry,
  // biome-ignore lint/suspicious/noExplicitAny: DevTools API state structure is dynamic
): Record<string, any[]> {
  // biome-ignore lint/suspicious/noExplicitAny: DevTools API state structure is dynamic
  const result: Record<string, any[]> = {
    'Endpoint Info': [
      { key: 'Method', value: endpoint.method.toUpperCase() },
      { key: 'Path', value: endpoint.path },
      { key: 'Operation ID', value: endpoint.operationId },
      { key: 'Summary', value: endpoint.summary ?? '(none)' },
      { key: 'Has Handler', value: endpoint.hasHandler },
      { key: 'Has Seed', value: endpoint.hasSeed },
    ],
  };

  // Add parameters
  if (endpoint.parameters && endpoint.parameters.length > 0) {
    result.Parameters = endpoint.parameters.map((param) => ({
      key: `${param.name} (${param.in})`,
      value: {
        required: param.required ?? false,
        schema: param.schema,
      },
    }));
  }

  // Add request body
  if (endpoint.requestBody) {
    const content = endpoint.requestBody.content;
    const contentTypes = Object.keys(content ?? {});

    result['Request Body'] = [
      { key: 'Required', value: endpoint.requestBody.required ?? false },
      { key: 'Content Types', value: contentTypes.join(', ') || '(none)' },
    ];

    // Add schema for JSON content type if available
    const jsonContent = content?.['application/json'];
    if (jsonContent?.schema) {
      result['Request Body'].push({
        key: 'Schema',
        value: jsonContent.schema,
      });
    }
  }

  // Add responses
  if (endpoint.responses) {
    result.Responses = Object.entries(endpoint.responses).map(([status, response]) => ({
      key: status,
      value: {
        description: response.description,
        content: response.content ? Object.keys(response.content) : [],
      },
    }));
  }

  // Add security requirements
  if (endpoint.security && endpoint.security.length > 0) {
    result.Security = endpoint.security.map((secReq, index) => ({
      key: `Requirement ${index + 1}`,
      value: Object.entries(secReq).map(([name, scopes]) => ({
        scheme: name,
        scopes: scopes,
        details: registry.securitySchemes.get(name),
      })),
    }));
  }

  // Add tags
  if (endpoint.tags && endpoint.tags.length > 0) {
    result.Tags = endpoint.tags.map((tag) => ({
      key: tag,
      value: '',
    }));
  }

  return result;
}

/**
 * Sets up the Vue DevTools plugin for OpenAPI Server
 *
 * This function should be called from the client-side code when the
 * Vue application is initialized. It registers a custom inspector
 * in Vue DevTools that displays endpoint information.
 *
 * @param options - Setup options including app, registry, and handlers
 *
 * @example
 * ```typescript
 * import { createApp } from 'vue';
 * import { setupOpenApiDevTools } from '@websublime/vite-plugin-open-api-server/devtools';
 *
 * const app = createApp(App);
 *
 * // After getting registry from somewhere...
 * setupOpenApiDevTools({
 *   app,
 *   registry,
 *   handlers: new Map(),
 *   version: '1.0.0',
 * });
 * ```
 */
export async function setupOpenApiDevTools(options: SetupDevToolsOptions): Promise<void> {
  const { app, registry, handlers, version } = options;

  // Check environment support
  const support = checkDevToolsSupport();
  if (!support.isSupported) {
    if (!support.isDev) {
      // Silent in production
      return;
    }
    if (!support.isBrowser) {
      // Silent skip in non-browser environments (SSR)
      return;
    }
    if (!support.hasDevToolsHook) {
      // Silent skip when DevTools not installed
      return;
    }
    return;
  }

  // Update global state
  updateGlobalState(registry, handlers, version);

  // Dynamically import devtools-api to avoid issues in non-browser environments
  const { setupDevToolsPlugin } = await import('@vue/devtools-api');

  // Register the DevTools plugin
  setupDevToolsPlugin(
    {
      id: DEVTOOLS_PLUGIN_ID,
      label: DEVTOOLS_PLUGIN_LABEL,
      app,
      packageName: '@websublime/vite-plugin-open-api-server',
      homepage: 'https://github.com/websublime/vite-open-api-server',
      logo: 'https://raw.githubusercontent.com/websublime/vite-open-api-server/main/docs/logo.svg',
      enableEarlyProxy: true,
    },
    (api) => {
      // Add custom inspector for endpoints
      api.addInspector({
        id: DEVTOOLS_INSPECTOR_ID,
        label: DEVTOOLS_INSPECTOR_LABEL,
        icon: 'api',
        treeFilterPlaceholder: 'Search endpoints...',
        noSelectionText: 'Select an endpoint to view details',
        actions: [
          {
            icon: 'refresh',
            tooltip: 'Refresh endpoint tree',
            action: () => {
              api.sendInspectorTree(DEVTOOLS_INSPECTOR_ID);
              api.sendInspectorState(DEVTOOLS_INSPECTOR_ID);
            },
          },
        ],
      });

      // Handle tree requests
      api.on.getInspectorTree((payload) => {
        if (payload.inspectorId !== DEVTOOLS_INSPECTOR_ID) {
          return;
        }

        const state = getGlobalState();
        if (!state.registry) {
          payload.rootNodes = [
            {
              id: 'no-registry',
              label: 'No registry loaded',
              tags: [
                {
                  label: 'Waiting...',
                  textColor: 0x000000,
                  backgroundColor: 0xfef3c7,
                },
              ],
            },
          ];
          return;
        }

        payload.rootNodes = buildInspectorTree(state.registry, payload.filter);
      });

      // Handle state requests
      api.on.getInspectorState((payload) => {
        if (payload.inspectorId !== DEVTOOLS_INSPECTOR_ID) {
          return;
        }

        const state = getGlobalState();
        if (!state.registry) {
          payload.state = {
            Info: [{ key: 'Status', value: 'Registry not loaded yet' }],
          };
          return;
        }

        payload.state = buildInspectorState(state.registry, payload.nodeId);
      });
    },
  );
}
