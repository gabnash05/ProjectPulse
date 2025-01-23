import { verifyToken } from '../utils/authUtils.js';

export const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    res.sendStatus(401).json({ message: 'Authorization token is missing' });
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.sendStatus(403).json({ message: 'Invalid or Expired token' });
  }
};