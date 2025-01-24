import { User, Project, Task } from '../models/index.js';
import { sequelize } from '../config/database.js';

export const getProject = async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const project = await Project.findByPk(projectId, {
      include: [{ 
        model: User,
        as: 'members', 
        attributes: ['id', 'username', 'email'] 
      }]
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.status(200).json(project);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching project' });
  }
}

export const getAllProjectTasks = async (req, res) => {
  const userId = req.userId;
  const projectId = req.params.projectId;

  try {
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isAuthorized = project.project_head_id === userId || await project.hasProject_member(userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'You are not authorized to access tasks for this project' });
    }

    const tasks = await project.getTasks({
      include: [{ 
        model: User,
        as: 'assignee', 
        attributes: ['id', 'username', 'email'] 
      }]
    });

    return res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching tasks' });
  }
}

export const getAllProjectMembers = async (req, res) => {
  const userId = req.userId;
  const { projectId } = req.params;

  try {
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isAuthorized = project.project_head_id === userId || await project.hasProject_member(userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'You are not authorized to access members for this project' });
    }

    const members = await project.getProject_members({
      attributes: ['id', 'username', 'email'],
      joinTableAttributes: [],
    });

    return res.status(200).json(members);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching tasks' });
  }
}

export const createProject = async (req, res) => {
  const { name, description } = req.body;
  const userId = req.userId;

  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  try { 
    const project = await sequelize.transaction(async (t) => {
      const newProject = await Project.create(
        { name, description, project_head_id: userId },
        { transaction: t }
      );

      await newProject.addProject_member(userId, { transaction: t }); 

      return newProject;
    });

    return res.status(201).json(project);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating project' });
  }
}

export const addProjectMember = async (req, res) => {
  const { projectId } = req.params;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'User email is required' });
  }

  try {
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not Found'});
    }

    const member = await User.findOne({where : { email }});

    if (!member) {
      return res.status(404).json({ message: 'User not Found'});
    }

    const isMember = await project.hasProject_member(member);
    if (isMember) {
      return res.status(400).json({ message: 'User is already a member of the project' });
    }

    await project.addProject_member(member);
    return res.status(200).json({
      projectId,
      member,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error adding project member' });
  }
}

export const updateProject = async (req, res) => { 
  const { projectId } = req.params;
  const { name, description } = req.body;

  try {
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (name) {
      project.name = name;
    }

    if (description) { 
      project.description = description;
    }

    const updatedProject = await project.save();

    return res.status(200).json(updatedProject);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error updating project' });
  }
}

export const deleteProject = async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await project.destroy();

    return res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting project' });
  }
}

export const removeProjectMember = async (req, res) => {
  const projectId = req.params.projectId;
  const { memberId } = req.params;

  try {
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const member = await User.findByPk(memberId);

    if (!member) {
      return res.status(404).json({ message: 'Project member not found' });
    }

    if (project.project_head_id === member.id) {
      return res.status(403).json({ message: 'Project head cannot be removed from project members' });
    }

    const isMember = await project.hasProject_member(member);
    if (!isMember) {
      return res.status(400).json({ message: 'User is not a member of the project' });
    }

    await project.removeProject_member(member);

    return res.status(200).json({ message: 'Project member removed successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error removing project member' });
  }
} 