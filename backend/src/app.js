// Dependecies
import express from 'express';

import authRoutes from './routes/authRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import projectsRoutes from './routes/projectsRoutes.js';
import tasksRoutes from './routes/tasksRoutes.js';

const app = express();
const port = process.env.PORT

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