import { User, Project, Task } from '../models/index.js';
import { setCache, getCache } from '../utils/redisUtils.js';

export const getUserProfile = async (req, res) => {
  const { userId } = req;

  const cacheKey = `users:${userId}:profile`;
  try {
    // Check cache
    const cachedUserProfile = await getCache(cacheKey);
    if (cachedUserProfile) {
      return res.status(200).json(cachedUserProfile);
    }

    // Fetch from DB
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User Not Found' });
    }

    // Set cache
    await setCache(cacheKey, user);

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error Getting User Profile' });
  }
}

export const getUserProjects = async (req, res) => {
  const { userId } = req;

  const cacheKey = `users:${userId}:projects`;
  try {
    // Check Cache
    const cachedUserProjects = await getCache(cacheKey);
    if (cachedUserProjects) {
      console.log("cache hit");
      return res.status(200).json(cachedUserProjects);
    }

    // Fetch from DB
    const userWithProjects = await User.findByPk(userId, {
      include: [
        {
          model: Project,
          as: 'projects',
          include: [
            {
              model: User, 
              as: 'project_members', 
              attributes: ['id', 'username', 'email'], 
              through: {
                attributes: []
              }
            }
          ],
          through: {
            attributes: []
          },
          attributes: ['id', 'name', 'description', 'project_head_id']
        }
      ],
      attributes: [] 
    });
    if (!userWithProjects) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (!userWithProjects.projects || userWithProjects.projects.length === 0) {
      return res.status(404).json({ message: 'No projects found for this user.' });
    }

    // Set Cache
    await setCache(cacheKey, userWithProjects.projects);
    console.log("cache miss");

    return res.status(200).json(userWithProjects.projects);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error Getting User Projects' });
  }
}

export const getUserTasks = async (req, res) => {
  const { userId } = req;

  const cacheKey = `users:${userId}:tasks`;
  try {
    // Check Cache
    const cacheUserTasks = await getCache(cacheKey);
    if (cacheUserTasks) {
      console.log("cache hit");
      return res.status(200).json(cacheUserTasks);
    }

    // Fetch from DB
    const tasks = await Task.findAll({
      where: { assigned_to: userId },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'description'],
        },
      ],
    });
    if (!tasks || tasks.length === 0) {
      return res.status(404).json({ message: 'No tasks found for this user.' });
    }

    // Set Cache
    await setCache(cacheKey, tasks);
    console.log("cache miss");

    return res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error Getting User Tasks' });
  }
}