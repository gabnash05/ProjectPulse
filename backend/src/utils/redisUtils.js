import redisClient from "../config/redisClient.js";

export const setCache = async (key, value, ttl = 3600) => {
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

export const getCache = async (key) => {
  try {
    const cache = await redisClient.get(key);
    return cache ? JSON.parse(cache) : null;
  } catch (error) {
    console.error('Error getting cache:', error);
  }
}

export const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Error deleting cache:', error);
  }
}

export const deleteCacheByPattern = async (pattern) => {
  let cursor = '0';
  try {
    do {
      const [newCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      console.log(keys);
      if (keys.length > 0) {
        await redisClient.unlink(...keys);
      }
      cursor = newCursor;
    } while (cursor !== '0'); 
  } catch (error) {
    console.error('Error deleting cache by pattern:', error);
  }
};