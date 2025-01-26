import { User } from '../models/index.js';
import { generateToken, hashPassword, comparePasswords } from '../utils/authUtils.js';
import { resetLoginCounter } from '../middleware/rateLimiter.js';

export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({where: { email }});
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({ username, email, password: hashedPassword });

    const token = generateToken(user.id);
    return res.status(201).json({ token }); 
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error in Registering User' });
  }
}

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid Password' });
    }

    // Reset login counter
    resetLoginCounter(user.username);

    // Log in user
    const token = generateToken(user.id);

    return res.status(200).json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, username: user.username, token },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error in Logging In User' });
  }
}