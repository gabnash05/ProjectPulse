import { User, Project, Task } from '../models/index.js';

export const getTask = async (req, res) =>{
  const { taskId } = req.params;
  const { userId } = req;

  try {
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

    return res.status(200).json(task);
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
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.status = status;
    await task.save();

    return res.status(200).json(task);
  } catch (error) {
    return res.status(500).json({ message: "Error updating task status" });
  }
}

export const deleteTask = async (req, res) => {
  const { projectId, taskId } = req.params;

  try {
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const task = await Task.findOne({ where: { id: taskId, project_id: projectId } });

    await task.destroy();

    return res.status(200).json({ message: "Task deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting task" });
  }
}