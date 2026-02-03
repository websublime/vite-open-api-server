/**
 * Startup Banner
 *
 * What: Prints a colorful startup banner with server information
 * How: Uses picocolors for ANSI color output
 * Why: Provides clear feedback about server status and configuration
 *
 * @module banner
 */

import type { EndpointRegistry } from '@websublime/vite-plugin-open-api-core';
import pc from 'picocolors';
import type { ResolvedOptions } from './types.js';

/**
 * Banner configuration
 */
export interface BannerInfo {
  /** Server port */
  port: number;
  /** Proxy path in Vite */
  proxyPath: string;
  /** OpenAPI spec title */
  title: string;
  /** OpenAPI spec version */
  version: string;
  /** Number of endpoints */
  endpointCount: number;
  /** Number of loaded handlers */
  handlerCount: number;
  /** Number of loaded seeds */
  seedCount: number;
  /** DevTools enabled */
  devtools: boolean;
}

/**
 * Print the startup banner
 *
 * @param info - Banner information
 * @param options - Resolved plugin options
 */
export function printBanner(info: BannerInfo, options: ResolvedOptions): void {
  if (options.silent) {
    return;
  }

  const logger = options.logger ?? console;
  const log = (msg: string) => logger.info(msg);

  // Box drawing characters
  const BOX = {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
  };

  const width = 56;
  const horizontalLine = BOX.horizontal.repeat(width - 2);

  log('');
  log(pc.cyan(`${BOX.topLeft}${horizontalLine}${BOX.topRight}`));
  log(
    pc.cyan(BOX.vertical) + centerText('🚀 OpenAPI Mock Server', width - 2) + pc.cyan(BOX.vertical),
  );
  log(pc.cyan(`${BOX.bottomLeft}${horizontalLine}${BOX.bottomRight}`));
  log('');

  // API Info
  log(
    `  ${pc.bold(pc.white('API:'))}        ${pc.green(info.title)} ${pc.dim(`v${info.version}`)}`,
  );
  log(`  ${pc.bold(pc.white('Server:'))}     ${pc.cyan(`http://localhost:${info.port}`)}`);
  log(
    `  ${pc.bold(pc.white('Proxy:'))}      ${pc.yellow(info.proxyPath)} ${pc.dim('→')} ${pc.dim(`localhost:${info.port}`)}`,
  );
  log('');

  // Stats
  const stats = [
    { label: 'Endpoints', value: info.endpointCount, color: pc.blue },
    { label: 'Handlers', value: info.handlerCount, color: pc.green },
    { label: 'Seeds', value: info.seedCount, color: pc.magenta },
  ];

  const statsLine = stats
    .map((s) => `${pc.dim(`${s.label}:`)} ${s.color(String(s.value))}`)
    .join(pc.dim('  │  '));
  log(`  ${statsLine}`);
  log('');

  // DevTools
  if (info.devtools) {
    log(
      `  ${pc.bold(pc.white('DevTools:'))}   ${pc.cyan(`http://localhost:${info.port}/_devtools`)}`,
    );
    log(`  ${pc.bold(pc.white('API Info:'))}   ${pc.cyan(`http://localhost:${info.port}/_api`)}`);
    log('');
  }

  // Footer
  log(pc.dim('  Press Ctrl+C to stop the server'));
  log('');
}

/**
 * Center text within a given width
 *
 * @param text - Text to center
 * @param width - Total width
 * @returns Centered text with padding
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes require control characters
const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*m/g;

function centerText(text: string, width: number): string {
  // Account for ANSI codes - get visible length
  const visibleLength = text.replace(ANSI_ESCAPE_REGEX, '').length;
  const padding = Math.max(0, width - visibleLength);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

/**
 * Extract banner info from server registry and document
 *
 * @param registry - Endpoint registry
 * @param document - OpenAPI document
 * @param handlerCount - Number of loaded handlers
 * @param seedCount - Number of loaded seed schemas
 * @param options - Resolved options
 * @returns Banner info
 */
export function extractBannerInfo(
  registry: EndpointRegistry,
  document: { info: { title: string; version: string } },
  handlerCount: number,
  seedCount: number,
  options: ResolvedOptions,
): BannerInfo {
  return {
    port: options.port,
    proxyPath: options.proxyPath,
    title: document.info.title,
    version: document.info.version,
    endpointCount: registry.endpoints.size,
    handlerCount,
    seedCount,
    devtools: options.devtools,
  };
}

/**
 * Print a hot reload notification
 *
 * @param type - Type of reload ('handlers' | 'seeds')
 * @param count - Number of reloaded items
 * @param options - Resolved options
 */
export function printReloadNotification(
  type: 'handlers' | 'seeds',
  count: number,
  options: ResolvedOptions,
): void {
  if (options.silent) {
    return;
  }

  const logger = options.logger ?? console;
  const icon = type === 'handlers' ? '🔄' : '🌱';
  const label = type === 'handlers' ? 'Handlers' : 'Seeds';
  const color = type === 'handlers' ? pc.green : pc.magenta;

  logger.info(`  ${icon} ${color(label)} reloaded: ${pc.bold(String(count))} ${type}`);
}

/**
 * Print an error message
 *
 * @param message - Error message
 * @param error - Optional error object
 * @param options - Resolved options
 */
export function printError(message: string, error: unknown, options: ResolvedOptions): void {
  const logger = options.logger ?? console;
  logger.error(`${pc.red('✖')} ${pc.bold(pc.red('Error:'))} ${message}`);
  if (error instanceof Error) {
    logger.error(pc.dim(`  ${error.message}`));
  }
}

/**
 * Print a warning message
 *
 * @param message - Warning message
 * @param options - Resolved options
 */
export function printWarning(message: string, options: ResolvedOptions): void {
  if (options.silent) {
    return;
  }

  const logger = options.logger ?? console;
  logger.warn(`${pc.yellow('⚠')} ${pc.yellow('Warning:')} ${message}`);
}
