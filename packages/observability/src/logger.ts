/**
 * Structured logging interface for TPIP services.
 * No AWS integration — foundation only.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlation_id?: string;
  tenant_id?: string;
  service?: string;
  metadata?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface LoggerOptions {
  service: string;
  level?: LogLevel;
  correlation_id?: string;
  tenant_id?: string;
}

/** Create a structured logger instance */
export function createLogger(options: LoggerOptions): Logger {
  const { service, level = 'info', correlation_id, tenant_id } = options;

  const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[level];

  function shouldLog(msgLevel: LogLevel): boolean {
    return levels[msgLevel] >= currentLevel;
  }

  function formatEntry(msgLevel: LogLevel, message: string, metadata?: Record<string, unknown>): LogEntry {
    return {
      level: msgLevel,
      message,
      timestamp: new Date().toISOString(),
      correlation_id,
      tenant_id,
      service,
      metadata,
    };
  }

  function log(msgLevel: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog(msgLevel)) return;
    const entry = formatEntry(msgLevel, message, metadata);
    const output = JSON.stringify(entry);
    if (msgLevel === 'error') {
      console.error(output);
    } else if (msgLevel === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  const logger: Logger = {
    debug: (message, metadata) => log('debug', message, metadata),
    info: (message, metadata) => log('info', message, metadata),
    warn: (message, metadata) => log('warn', message, metadata),
    error: (message, metadata) => log('error', message, metadata),
    child: (bindings) =>
      createLogger({
        service,
        level,
        correlation_id: (bindings.correlation_id as string) ?? correlation_id,
        tenant_id: (bindings.tenant_id as string) ?? tenant_id,
      }),
  };

  return logger;
}
