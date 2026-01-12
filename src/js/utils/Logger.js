/**
 * Tactical Logger Utility
 * Handles application logging with strict environment discipline.
 * Output is suppressed in production to prevent intel leaks.
 */
export class Logger {
  static log(...args) {
    if (this._isDev()) {
      console.log('[SITREP]', ...args);
    }
  }

  static warn(...args) {
    if (this._isDev()) {
      console.warn('[WARNING]', ...args);
    }
  }

  static error(...args) {
    console.error('[CRITICAL]', ...args);
  }

  static _isDev() {
    // Check if we are in a Vite environment
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env.DEV;
    }
    // Fallback for non-Vite environments (like Jest without specific transforms)
    // In Jest, process.env.NODE_ENV is usually 'test'
    if (typeof process !== 'undefined' && process.env) {
        return process.env.NODE_ENV !== 'production';
    }
    return false;
  }
}
