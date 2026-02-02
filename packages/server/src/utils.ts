/**
 * Filesystem Utilities
 *
 * What: Shared utility functions for filesystem operations
 * How: Uses Node.js fs/promises module with error handling
 * Why: Provides reusable utilities for handler and seed loading
 *
 * @module utils
 */

/**
 * Check if a directory exists
 *
 * @param dirPath - Path to check
 * @returns Promise resolving to true if directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const fs = await import('node:fs/promises');
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
