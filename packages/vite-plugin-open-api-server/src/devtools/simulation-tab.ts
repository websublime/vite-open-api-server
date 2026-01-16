/**
 * Simulation Tab Registration for Vue DevTools
 *
 * ## What
 * Registers the Simulation Panel as a custom tab in Vue DevTools using
 * the `addCustomTab` API from @vue/devtools-api.
 *
 * ## How
 * Uses the Vue DevTools custom tab API to add an SFC-based tab that provides
 * an interactive UI for configuring API simulation parameters.
 *
 * ## Why
 * Provides a dedicated tab in Vue DevTools for simulation controls, separate
 * from the inspector and timeline, giving developers easy access to mock
 * server configuration during development.
 *
 * @module
 */

import { generateSimulationPanelSfc } from './simulation-panel.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Unique identifier for the simulation tab
 */
export const SIMULATION_TAB_ID = 'openapi-simulation';

/**
 * Display title for the simulation tab
 */
export const SIMULATION_TAB_TITLE = 'Simulation';

/**
 * Icon for the simulation tab (Material Design Icons name)
 */
export const SIMULATION_TAB_ICON = 'science';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for registering the simulation tab
 */
export interface SimulationTabOptions {
  /**
   * Proxy path for the API (e.g., '/api/v3')
   * This is passed to the SFC to generate correct URLs.
   * @default '/api/v3'
   */
  proxyPath?: string;

  /**
   * Whether to enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

/**
 * Minimal interface for addCustomTab function
 * Matches the @vue/devtools-api signature
 */
interface CustomTabOptions {
  /** Unique identifier for the tab */
  name: string;
  /** Display title */
  title: string;
  /** Icon (Material Design Icons name or URL) */
  icon: string;
  /** Tab view configuration */
  view: {
    /** Type of view */
    type: 'iframe' | 'sfc';
    /** SFC code (for type: 'sfc') */
    sfc?: string;
    /** URL (for type: 'iframe') */
    src?: string;
  };
  /** Category for the tab */
  category: 'app' | 'modules' | 'advanced';
}

// ============================================================================
// Tab Registration State
// ============================================================================

/**
 * Whether the simulation tab has been registered
 * Used to prevent duplicate registration on HMR
 */
let tabRegistered = false;

/**
 * Store the registered tab options for potential updates
 */
let registeredOptions: SimulationTabOptions | null = null;

// ============================================================================
// Registration Functions
// ============================================================================

/**
 * Registers the Simulation tab in Vue DevTools.
 *
 * This function should be called once during DevTools initialization.
 * It uses the `addCustomTab` API from @vue/devtools-api to add an
 * interactive SFC-based tab for simulation configuration.
 *
 * @param options - Configuration options for the simulation tab
 *
 * @example
 * ```ts
 * import { registerSimulationTab } from './simulation-tab'
 *
 * // Register with default options
 * registerSimulationTab()
 *
 * // Register with custom proxy path
 * registerSimulationTab({ proxyPath: '/api/v2' })
 * ```
 */
export function registerSimulationTab(options: SimulationTabOptions = {}): void {
  const { proxyPath = '/api/v3', verbose = false } = options;

  // Guard against duplicate registration (e.g., on HMR)
  if (tabRegistered) {
    if (verbose) {
      log('Simulation tab already registered, skipping duplicate registration');
    }
    return;
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    if (verbose) {
      log('Not in browser environment, skipping simulation tab registration');
    }
    return;
  }

  // Dynamic import to avoid bundling issues and check for availability
  importDevToolsApi()
    .then(({ addCustomTab }) => {
      if (!addCustomTab) {
        if (verbose) {
          log('addCustomTab not available from @vue/devtools-api');
        }
        return;
      }

      // Generate the SFC with the configured proxy path
      const sfcCode = generateSimulationPanelSfc(proxyPath);

      // Register the tab
      const tabOptions: CustomTabOptions = {
        name: SIMULATION_TAB_ID,
        title: SIMULATION_TAB_TITLE,
        icon: SIMULATION_TAB_ICON,
        view: {
          type: 'sfc',
          sfc: sfcCode,
        },
        category: 'app',
      };

      addCustomTab(tabOptions);

      tabRegistered = true;
      registeredOptions = options;

      if (verbose) {
        log(`Simulation tab registered with proxyPath: ${proxyPath}`);
      }
    })
    .catch((error) => {
      if (verbose) {
        log(`Failed to register simulation tab: ${error.message}`);
      }
    });
}

/**
 * Checks if the simulation tab is registered.
 *
 * @returns true if the tab has been registered
 */
export function isSimulationTabRegistered(): boolean {
  return tabRegistered;
}

/**
 * Gets the current registration options.
 *
 * @returns The options used for registration, or null if not registered
 */
export function getRegisteredOptions(): SimulationTabOptions | null {
  return registeredOptions;
}

/**
 * Resets the registration state.
 * Useful for testing or when DevTools connection is lost.
 */
export function resetSimulationTab(): void {
  tabRegistered = false;
  registeredOptions = null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Dynamically imports the DevTools API.
 * This allows the module to be loaded without requiring @vue/devtools-api
 * to be installed, which is useful for production builds.
 *
 * @returns Promise resolving to the addCustomTab function or null
 */
async function importDevToolsApi(): Promise<{
  addCustomTab: ((options: CustomTabOptions) => void) | null;
}> {
  try {
    // Dynamic import to allow tree-shaking in production
    const devtoolsApi = await import('@vue/devtools-api');
    return {
      addCustomTab: devtoolsApi.addCustomTab as (options: CustomTabOptions) => void,
    };
  } catch {
    // @vue/devtools-api not available
    return { addCustomTab: null };
  }
}

/**
 * Internal logging helper.
 *
 * @param message - Message to log
 */
function log(message: string): void {
  // biome-ignore lint/suspicious/noConsole: DevTools logging is intentional
  console.log(`[OpenAPI DevTools] ${message}`);
}

// ============================================================================
// Auto-registration Support
// ============================================================================

/**
 * Registers the simulation tab when the DevTools client is connected.
 *
 * This provides automatic registration that waits for the DevTools
 * connection to be established before attempting registration.
 *
 * @param options - Configuration options for the simulation tab
 */
export function registerSimulationTabOnConnect(options: SimulationTabOptions = {}): void {
  const { verbose = false } = options;

  // Check for browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Try to use onDevToolsClientConnected if available
  importOnDevToolsClientConnected()
    .then(({ onDevToolsClientConnected }) => {
      if (onDevToolsClientConnected) {
        onDevToolsClientConnected(() => {
          if (verbose) {
            log('DevTools client connected, registering simulation tab');
          }
          registerSimulationTab(options);
        });
      } else {
        // Fallback: register immediately
        registerSimulationTab(options);
      }
    })
    .catch(() => {
      // Fallback: register immediately
      registerSimulationTab(options);
    });
}

/**
 * Dynamically imports the onDevToolsClientConnected function.
 *
 * @returns Promise resolving to the function or null
 */
async function importOnDevToolsClientConnected(): Promise<{
  onDevToolsClientConnected: ((callback: () => void) => void) | null;
}> {
  try {
    const devtoolsApi = await import('@vue/devtools-api');
    return {
      onDevToolsClientConnected: devtoolsApi.onDevToolsClientConnected as (
        callback: () => void,
      ) => void,
    };
  } catch {
    return { onDevToolsClientConnected: null };
  }
}
