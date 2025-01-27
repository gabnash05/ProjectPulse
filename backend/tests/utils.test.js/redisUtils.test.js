// cache.test.js
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { setCache, getCache, deleteCache, deleteCacheByPattern } from '../../src/utils/redisUtils.js';
import redisClient from '../../src/config/redisClient.js';

vi.mock('../../src/config/redisClient.js', () => {
  const mockRedisClient = {
    set: vi.fn(() => Promise.resolve('OK')),
    get: vi.fn(() => Promise.resolve()),
    del: vi.fn(() => Promise.resolve()),
    scan: vi.fn(() => Promise.resolve(['0', []])),
    unlink: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
  };

  return {
    default: mockRedisClient,
  };
});

describe('Redis Utils', () => {
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleError.mockClear();
  });

  describe('setCache', () => {
    it('should set value in cache with TTL', async () => {
      const mockValue = { data: 'test' };
      await setCache('testKey', mockValue, 60);

      // Access methods directly on the mock instance
      expect(redisClient.set).toHaveBeenCalledWith(
        'testKey',
        JSON.stringify(mockValue),
        'EX',
        60
      );
    });

    it('should handle set errors', async () => {
      const testError = new Error('Set failed');
      redisClient.set.mockRejectedValueOnce(testError);

      await setCache('testKey', {});
      expect(console.error).toHaveBeenCalledWith('Error setting cache:', testError);
    });
  });

  describe('getCache', () => {
    it('should return parsed value from cache', async () => {
      const mockValue = JSON.stringify({ data: 'test' });
      redisClient.get.mockResolvedValueOnce(mockValue);

      const result = await getCache('testKey');
      expect(redisClient.get).toHaveBeenCalledWith('testKey');
      expect(result).toEqual(JSON.parse(mockValue));
    });

    it('should return null when key not found', async () => {
      redisClient.get.mockResolvedValueOnce(null);
      const result = await getCache('testKey');
      expect(result).toBeNull();
    });

    it('should handle get errors', async () => {
      const testError = new Error('Get failed');
      redisClient.get.mockRejectedValueOnce(testError);

      const result = await getCache('testKey');
      expect(console.error).toHaveBeenCalledWith('Error getting cache:', testError);
      expect(result).toBeUndefined();
    });
  });

  describe('deleteCache', () => {
    it('should delete key from cache', async () => {
      await deleteCache('testKey');
      expect(redisClient.del).toHaveBeenCalledWith('testKey');
    });

    it('should handle delete errors', async () => {
      const testError = new Error('Delete failed');
      redisClient.del.mockRejectedValueOnce(testError);

      await deleteCache('testKey');
      expect(console.error).toHaveBeenCalledWith('Error deleting cache:', testError);
    });
  });

  describe('deleteCacheByPattern', () => {
    it('should delete keys matching pattern', async () => {
      redisClient.scan
        .mockResolvedValueOnce(['10', ['key:1', 'key:2']])
        .mockResolvedValueOnce(['0', ['key:3']]);

      await deleteCacheByPattern('key:*');

      expect(redisClient.scan.mock.calls).toEqual([
        ['0', 'MATCH', 'key:*', 'COUNT', 100],
        ['10', 'MATCH', 'key:*', 'COUNT', 100],
      ]);

      expect(redisClient.unlink.mock.calls).toEqual([
        ['key:1', 'key:2'],
        ['key:3']
      ]);
    });

    it('should handle empty keys', async () => {
      redisClient.scan.mockResolvedValueOnce(['0', []]);
      await deleteCacheByPattern('empty:*');
      expect(redisClient.scan).toHaveBeenCalled();
      expect(redisClient.unlink).not.toHaveBeenCalled();
    });

    it('should handle scan errors', async () => {
      const testError = new Error('Scan failed');
      redisClient.scan.mockRejectedValueOnce(testError);

      await deleteCacheByPattern('error:*');
      expect(console.error).toHaveBeenCalledWith('Error deleting cache by pattern:', testError);
    });
  });
});