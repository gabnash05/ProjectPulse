// Dependecies
import express from 'express';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import projectsRoutes from './routes/projectsRoutes.js';
import tasksRoutes from './routes/tasksRoutes.js';

import { connectDB, sequelize } from './config/database.js';

const app = express();
dotenv.config();
const port = process.env.PORT;

// Database
const initializeDatabase = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully!'); // Use `force: true` for development
  } catch (error) {
    console.error('Error syncing to database:', error);
  }
};

initializeDatabase();

// Middleware
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/projects', projectsRoutes);
app.use('/tasks', tasksRoutes);

// Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});