import { User, Project, Task } from '../models/index.js';

export const getUserProfile = async (req, res) => {
  const { userId } = req;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User Not Found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error Getting User Profile' });
  }
}

export const getUserProjects = async (req, res) => {
  const { userId } = req;

  try {
    const userWithProjects = await User.findByPk(userId, {
      include: {
        model: Project,
        as: 'projects',
        through: {
          attributes: ['createdAt', 'updatedAt']
        }
      },
      attributes: [],
    });

    if (!userWithProjects) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (!userWithProjects.projects || userWithProjects.projects.length === 0) {
      return res.status(404).json({ message: 'No projects found for this user.' });
    }

    return res.status(200).json(userWithProjects.projects);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error Getting User Projects' });
  }
}

export const getUserTasks = async (req, res) => {
  const { userId } = req;

  try {
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

    return res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error Getting User Tasks' });
  }
}