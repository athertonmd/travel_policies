import { describe, it, expect, vi } from 'vitest';
import { createLogger } from '../logger';

describe('Structured logger', () => {
  it('should create a logger instance', () => {
    const logger = createLogger({ service: 'test-service' });
    expect(logger).toBeDefined();
    expect(logger.info).toBeTypeOf('function');
    expect(logger.error).toBeTypeOf('function');
    expect(logger.warn).toBeTypeOf('function');
    expect(logger.debug).toBeTypeOf('function');
  });

  it('should output structured JSON', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger({ service: 'test-service' });
    logger.info('test message', { key: 'value' });
    expect(spy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.level).toBe('info');
    expect(output.message).toBe('test message');
    expect(output.service).toBe('test-service');
    expect(output.metadata).toEqual({ key: 'value' });
    expect(output.timestamp).toBeDefined();
    spy.mockRestore();
  });

  it('should respect log level filtering', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger({ service: 'test', level: 'warn' });
    logger.debug('should not appear');
    logger.info('should not appear');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should create child loggers with additional bindings', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger({ service: 'parent' });
    const child = logger.child({ correlation_id: 'test-corr-id' });
    child.info('child message');
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.correlation_id).toBe('test-corr-id');
    spy.mockRestore();
  });
});
