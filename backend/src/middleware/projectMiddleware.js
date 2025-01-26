import { Project, Task } from "../models/index.js";
import { deleteCache, deleteCacheByPattern } from "../utils/redisUtils.js";

export const isProjectHead = async (req, res, next) => {
  const { userId } = req;
  const projectId = req.params.projectId;

  try {
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.project_head_id !== userId) {
      return res.status(403).json({ message: 'You are not authorized to perform this action' });
    }
    
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while verifying project head' });
  }
};

export const unassignAllTaskFromMember = async (req, res, next) => {
  const { projectId, memberId } = req.params;

  try {
    // Fetch from DB
    const project = await Project.findByPk(projectId, {
      include: [{
        model: Task,
        as: 'tasks',
        where: { assigned_to: memberId },
        attributes: ['id', 'assigned_to']
      }]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!project.tasks || project.tasks.length === 0) {
      return next();
    }

    for (const task of project.tasks) {
      task.assigned_to = null;
      await task.save();
    }

    // Invalidate cache
    await deleteCacheByPattern(`projects:${projectId}:user:*`);
    await deleteCache(`users:${memberId}:tasks`);
    
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error unassigning tasks' });
  }
};