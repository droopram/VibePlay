/**
 * Available log levels
 */
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4
}

/**
 * Structured logging for the engine
 */
export class Logger {
  private _level: LogLevel;
  
  constructor(level: LogLevel = LogLevel.INFO) {
    this._level = level;
  }
  
  /**
   * Set the current log level
   */
  public setLevel(level: LogLevel): void {
    this._level = level;
  }
  
  /**
   * Get the current log level
   */
  public getLevel(): LogLevel {
    return this._level;
  }
  
  /**
   * Log a debug message
   */
  public debug(message: string, data?: any): void {
    if (this._level >= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, data !== undefined ? data : '');
    }
  }
  
  /**
   * Log an info message
   */
  public info(message: string, data?: any): void {
    if (this._level >= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, data !== undefined ? data : '');
    }
  }
  
  /**
   * Log a warning message
   */
  public warn(message: string, data?: any): void {
    if (this._level >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
    }
  }
  
  /**
   * Log an error message
   */
  public error(message: string, error?: any): void {
    if (this._level >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error !== undefined ? error : '');
    }
  }
  
  /**
   * Log a message for performance tracking
   */
  public perf(label: string, data?: any): void {
    if (this._level >= LogLevel.DEBUG) {
      console.info(`[PERF] ${label}`, data !== undefined ? data : '');
    }
  }
  
  /**
   * Create a group in the console
   */
  public group(label: string): void {
    if (this._level >= LogLevel.DEBUG) {
      console.group(label);
    }
  }
  
  /**
   * End a group in the console
   */
  public groupEnd(): void {
    if (this._level >= LogLevel.DEBUG) {
      console.groupEnd();
    }
  }
}