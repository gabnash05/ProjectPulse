import redisClient from "../config/redisClient.js";

export const rateLimiter = (limit, windowSeconds, message) => async (req, res, next) => {
  const key = `rate-limit:${req.ip}`;

  try {
    const requests = await redisClient.incr(key);

    if (requests === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    if (requests > limit) {
      return res.status(429).json({ message: message || "Too many requests, please try again later." });
    }

    return next();
  } catch (error) {
    console.error('Rate limiter error:', err);
    return res.status(500).json({ message: "Error processing request" });
  }
};

export const loginRateLimiter = (maxRetries, windowSeconds) => async (req, res, next) => {
  const { email } = req.body;
  const key = `login-attempts:${email}`;

  try {
    const attempts = await redisClient.incr(key);

    if (attempts === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    if (attempts > maxRetries) {
      return res.status(429).json({ 
        message: 'Too many login attempts. Please try again later.' 
      });
    }

    return next();
  } catch (err) {
    console.error('Login rate limiter error:', err);
    return res.status(500).json({ message: 'Error processing request' });
  }
};

export const registrationRateLimiter = (maxRetries, windowSeconds) => async (req, res, next) => {
  const { email } = req.body; // Using email as a unique identifier for registration
  const key = `registration-attempts:${email}`;
  
  try {
    const attempts = await redisClient.incr(key);
    
    if (attempts === 1) {
      await redisClient.expire(key, windowSeconds); // Set TTL on first attempt
    }
    
    if (attempts > maxRetries) {
      return res.status(429).json({
        message: 'Too many registration attempts. Please try again later.',
      });
    }

    return next();
  } catch (err) {
    console.error('Registration rate limiter error:', err);
    return res.status(500).json({ message: 'Error processing registration' });
  }
};

export const resetLoginCounter = async (username) => {
  const key = `login-attempts:${username}`;
  await redisClient.del(key);
};