/**
 * Browser Environment Type Declarations for DevTools Module
 *
 * ## What
 * This module provides TypeScript declarations for browser-specific globals
 * that are used by the DevTools plugin module.
 *
 * ## How
 * Declares the minimal Window interface and related types needed for DevTools
 * integration without requiring the full DOM lib.
 *
 * ## Why
 * The main package is configured for Node.js types only, but the DevTools
 * module runs in the browser. These declarations bridge the gap without
 * changing the package-wide tsconfig.
 *
 * @module
 * @internal
 */

// Declare window as a global when in browser context
declare const window: Window & typeof globalThis;

// Minimal Window interface for DevTools integration
declare interface Window {
  /**
   * Vue DevTools global hook installed by the Vue DevTools browser extension.
   * Present when Vue DevTools is installed and active.
   */
  __VUE_DEVTOOLS_GLOBAL_HOOK__?: {
    enabled?: boolean;
    emit?: (event: string, ...args: unknown[]) => void;
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    off?: (event: string, handler: (...args: unknown[]) => void) => void;
  };
}

// Augment ImportMeta for Vite's environment variables
declare interface ImportMeta {
  env?: {
    DEV?: boolean;
    PROD?: boolean;
    MODE?: string;
    SSR?: boolean;
    BASE_URL?: string;
    [key: string]: unknown;
  };
}

// ============================================================================
// Fetch API Types for Browser Compatibility
// ============================================================================

/**
 * RequestInfo type for fetch API
 */
declare type RequestInfo = Request | string;

/**
 * HeadersInit type for fetch API
 */
declare type HeadersInit = Headers | string[][] | Record<string, string>;

/**
 * Headers interface for fetch API
 */
declare interface Headers {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: unknown): void;
}

/**
 * Request interface for fetch API
 */
declare interface Request {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  readonly body: ReadableStream<Uint8Array> | null;
  clone(): Request;
}

/**
 * Response interface for fetch API
 */
declare interface Response {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly body: ReadableStream<Uint8Array> | null;
  readonly url: string;
  clone(): Response;
  json(): Promise<unknown>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
}

/**
 * RequestInit interface for fetch options
 */
declare interface RequestInit {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  mode?: RequestMode;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  integrity?: string;
  keepalive?: boolean;
  signal?: AbortSignal | null;
}

/**
 * BodyInit type
 */
declare type BodyInit = Blob | BufferSource | FormData | URLSearchParams | ReadableStream<Uint8Array> | string;

/**
 * Global fetch function
 */
declare function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;

/**
 * Performance API for timing
 */
declare const performance: {
  now(): number;
};

/**
 * Augment Window with location
 */
declare interface Window {
  location: {
    origin: string;
    href: string;
    pathname: string;
    search: string;
    hash: string;
  };
  fetch: typeof fetch;
}
