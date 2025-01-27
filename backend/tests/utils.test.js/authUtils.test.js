import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken, hashPassword, comparePasswords } from '../../src/utils/authUtils.js';

beforeEach(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_EXPIRATION = '1h';
});

describe('Auth Utils', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = '12345';
      const token = generateToken(userId);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('id', userId);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const userId = '12345';
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });

      const decoded = verifyToken(token);
      expect(decoded).toHaveProperty('id', userId);
    });

    it('should throw an error for an invalid token', () => {
      const invalidToken = 'invalid.token.here';
      expect(() => verifyToken(invalidToken)).toThrow(jwt.JsonWebTokenError);
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'password123';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toEqual(password);
    });
  });

  describe('comparePasswords', () => {
    it('should return true for matching passwords', async () => {
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      const isMatch = await comparePasswords(password, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'password123';
      const hashedPassword = await hashPassword(password);

      const isMatch = await comparePasswords('wrongpassword', hashedPassword);
      expect(isMatch).toBe(false);
    });
  });
});