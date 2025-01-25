import { User, Project, Task } from '../models/index.js';
import { getCache, setCache, deleteCache, deleteCacheByPattern } from '../utils/redisUtils.js';

export const getTask = async (req, res) =>{
  const { taskId } = req.params;
  const { userId } = req;

  const cacheKey = `tasks:${taskId}:user:${userId}`;
  try {
    // Check cache
    const cachedTask = await getCache(cacheKey);
    if (cachedTask) {
      return res.status(200).json(cachedTask);
    }

    // Fetch from DB
    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'email'],
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name'],
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isMember = await task.project.hasProject_member(userId);
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of the project this task belongs to" });
    }

    // Set cache
    await setCache(cacheKey, task);

    return res.status(200).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error fetching task" });
  }
}

export const createTask = async (req, res) => {
  const { title, description, assigneeId, priority, deadline } = req.body;
  const { projectId } = req.params;
  const { userId } = req;

  if (!title || !projectId) {
    return res.status(400).json({ message: "Task name and project ID are required to create task" });
  }

  try {
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isProjectHead = project.project_head_id === userId;
    if (!isProjectHead && (assigneeId || deadline)) {
      return res.status(403).json({ message: "Only the project head can assign tasks to users and create deadlines to tasks" });
    }

    if (assigneeId) {
      const assignee = await User.findByPk(assigneeId);
      if (!assignee) {
        return res.status(404).json({ message: "Assignee not found" });
      }

      const isMember = await project.hasProject_member(assigneeId);
      if (!isMember) {
        return res.status(403).json({ message: "Assignee is not a member of the project" });
      }
    }

    const task = await Task.create({
      title,
      description,
      assigned_to: isProjectHead ? assigneeId : null,
      project_id: projectId,
      priority,
      deadline: isProjectHead ? deadline : null,
    });

    // Invalidate cache
    await deleteCache(`users:${assigneeId}:tasks`);

    const members = await project.getProject_members();
    for (const member of members) {
      await deleteCache(`projects:${projectId}:user:${member.id}:tasks`);
    }

    return res.status(201).json(task);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error creating task" });
  }
}
// ADD CHECK DEADLINE FORMAT AND PRIORITY FORMAT
export const updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, description, assignee, priority, deadline } = req.body;
  const { userId } = req;

  try {
    // Fetch from DB
    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'project_head_id'],
        }
      ]
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Updating fields
    const updatedFields = {};

    if (title) updatedFields.title = title;
    if (description) updatedFields.description = description;
    if (priority) updatedFields.priority = priority;
    if (deadline) updatedFields.deadline = deadline;

    const isProjectHead = task.project.project_head_id === userId;
    if (!isProjectHead && (assignee || deadline)) {
      return res.status(403).json({ message: "Only the project head can update task assignment and deadlines" });
    }

    if (assignee) {
      const assignee = await User.findByPk(assignee);
      if (!assignee) {
        return res.status(404).json({ message: "Assignee not found" });
      }
  
      const isMember = await task.project.hasProject_member(assignee);
      if (!isMember) {
        return res.status(403).json({ message: "Assignee is not a member of the project" });
      }
      updatedFields.assignee = assignee;
    }

    await task.update(updatedFields);

    // Invalidate cache
    await deleteCacheByPattern(`tasks:${taskId}:user:*`);

    const members = await task.project.getProject_members();
    for (const member of members) {
      await deleteCacheByPattern(`users:${member.id}:*`);
      await deleteCache(`projects:${task.project.id}:user:${member.id}:tasks`);
    }

    return res.status(200).json({message: "Task updated", task});
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error updating task" });
  }
}

export const updateTaskStatus = async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Task status is required" });
  }

  try {
    // Fetch from DB
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.status = status;
    await task.save();

    // Invalidate cache
    await deleteCacheByPattern(`tasks:${taskId}:user:*`);

    const members = await task.project.getProject_members();
    for (const member of members) {
      await deleteCacheByPattern(`users:${member.id}:*`);
      await deleteCache(`projects:${task.project.id}:user:${member.id}:tasks`);
    }

    return res.status(200).json(task);
  } catch (error) {
    return res.status(500).json({ message: "Error updating task status" });
  }
}

export const deleteTask = async (req, res) => {
  const { projectId, taskId } = req.params;

  try {
    const project = await Project.findByPk(projectId, {
      include: [{ 
        model: User, 
        as: 'project_members', 
        attributes: ['id'] }]
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const task = await Task.findOne({ where: { id: taskId, project_id: projectId } });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    await task.destroy();

    // Invalidate cache
    const members = project.project_members;

    await deleteCacheByPattern(`tasks:${taskId}:user:*`);

    for (const member of members) {
      await deleteCacheByPattern(`users:${member.id}:tasks`);
      await deleteCache(`projects:${projectId}:user:${member.id}:tasks`);
    }

    return res.status(200).json({ message: "Task deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting task" });
  }
}