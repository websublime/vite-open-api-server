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

// ============================================================================
// Basic Types and Interfaces
// ============================================================================

/**
 * AbortSignal interface for fetch cancellation
 */
declare interface AbortSignal {
  readonly aborted: boolean;
  readonly reason: unknown;
  onabort: ((this: AbortSignal, ev: Event) => unknown) | null;
  throwIfAborted(): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

/**
 * Minimal Event interface
 */
declare interface Event {
  readonly type: string;
  readonly target: EventTarget | null;
  preventDefault(): void;
  stopPropagation(): void;
}

/**
 * Minimal EventTarget interface
 */
declare interface EventTarget {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

/**
 * EventListener type
 */
declare type EventListener = (evt: Event) => void;

/**
 * Blob interface for binary data
 */
declare interface Blob {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  slice(start?: number, end?: number, contentType?: string): Blob;
  stream(): ReadableStream<Uint8Array>;
  text(): Promise<string>;
}

/**
 * BufferSource type alias
 */
declare type BufferSource = ArrayBufferView | ArrayBuffer;

/**
 * FormData interface for form submissions
 */
declare interface FormData {
  append(name: string, value: string | Blob, fileName?: string): void;
  delete(name: string): void;
  get(name: string): string | Blob | null;
  getAll(name: string): Array<string | Blob>;
  has(name: string): boolean;
  set(name: string, value: string | Blob, fileName?: string): void;
  forEach(
    callbackfn: (value: string | Blob, key: string, parent: FormData) => void,
    thisArg?: unknown,
  ): void;
  entries(): IterableIterator<[string, string | Blob]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string | Blob>;
}

/**
 * URLSearchParams interface for query strings
 */
declare interface URLSearchParams {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  getAll(name: string): string[];
  has(name: string): boolean;
  set(name: string, value: string): void;
  sort(): void;
  toString(): string;
  forEach(
    callbackfn: (value: string, key: string, parent: URLSearchParams) => void,
    thisArg?: unknown,
  ): void;
  entries(): IterableIterator<[string, string]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
}

/**
 * ReadableStream interface for streaming data
 */
declare interface ReadableStream<R = Uint8Array> {
  readonly locked: boolean;
  cancel(reason?: unknown): Promise<void>;
  getReader(): ReadableStreamDefaultReader<R>;
  pipeThrough<T>(
    transform: { writable: WritableStream<R>; readable: ReadableStream<T> },
    options?: StreamPipeOptions,
  ): ReadableStream<T>;
  pipeTo(destination: WritableStream<R>, options?: StreamPipeOptions): Promise<void>;
  tee(): [ReadableStream<R>, ReadableStream<R>];
}

/**
 * ReadableStreamDefaultReader interface
 */
declare interface ReadableStreamDefaultReader<R> {
  readonly closed: Promise<undefined>;
  cancel(reason?: unknown): Promise<void>;
  read(): Promise<ReadableStreamReadResult<R>>;
  releaseLock(): void;
}

/**
 * ReadableStreamReadResult type
 */
declare type ReadableStreamReadResult<T> =
  | { done: false; value: T }
  | { done: true; value?: undefined };

/**
 * WritableStream interface
 */
declare interface WritableStream<W = Uint8Array> {
  readonly locked: boolean;
  abort(reason?: unknown): Promise<void>;
  close(): Promise<void>;
  getWriter(): WritableStreamDefaultWriter<W>;
}

/**
 * WritableStreamDefaultWriter interface
 */
declare interface WritableStreamDefaultWriter<W> {
  readonly closed: Promise<undefined>;
  readonly desiredSize: number | null;
  readonly ready: Promise<undefined>;
  abort(reason?: unknown): Promise<void>;
  close(): Promise<void>;
  releaseLock(): void;
  write(chunk?: W): Promise<void>;
}

/**
 * StreamPipeOptions interface
 */
declare interface StreamPipeOptions {
  preventClose?: boolean;
  preventAbort?: boolean;
  preventCancel?: boolean;
  signal?: AbortSignal;
}

// ============================================================================
// Request Mode, Credentials, Cache, Redirect, ReferrerPolicy Types
// ============================================================================

/**
 * RequestMode type
 */
declare type RequestMode = 'cors' | 'navigate' | 'no-cors' | 'same-origin';

/**
 * RequestCredentials type
 */
declare type RequestCredentials = 'include' | 'omit' | 'same-origin';

/**
 * RequestCache type
 */
declare type RequestCache =
  | 'default'
  | 'force-cache'
  | 'no-cache'
  | 'no-store'
  | 'only-if-cached'
  | 'reload';

/**
 * RequestRedirect type
 */
declare type RequestRedirect = 'error' | 'follow' | 'manual';

/**
 * ReferrerPolicy type
 */
declare type ReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

// ============================================================================
// Fetch API Types
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
 * BodyInit type for fetch API
 */
declare type BodyInit =
  | Blob
  | BufferSource
  | FormData
  | URLSearchParams
  | ReadableStream<Uint8Array>
  | string
  | null;

/**
 * Headers interface for fetch API
 */
declare interface Headers {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(
    callbackfn: (value: string, key: string, parent: Headers) => void,
    thisArg?: unknown,
  ): void;
  entries(): IterableIterator<[string, string]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
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
  body?: BodyInit;
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
 * Global fetch function
 */
declare function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;

// ============================================================================
// Performance API
// ============================================================================

/**
 * Performance API for timing
 */
declare const performance: {
  now(): number;
};

// ============================================================================
// Window and Global Types (Consolidated)
// ============================================================================

/**
 * Minimal Window interface for DevTools integration
 * Consolidated to avoid duplicate declarations
 */
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

  /**
   * Window location object
   */
  location: {
    origin: string;
    href: string;
    pathname: string;
    search: string;
    hash: string;
  };

  /**
   * Global fetch function
   */
  fetch: typeof fetch;
}

// Declare window as a global when in browser context
declare const window: Window & typeof globalThis;

// ============================================================================
// ImportMeta Augmentation
// ============================================================================

/**
 * Augment ImportMeta for Vite's environment variables
 */
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
