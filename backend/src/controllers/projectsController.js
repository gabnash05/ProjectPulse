import { User, Project } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { setCache, getCache, deleteCache, deleteCacheByPattern } from '../utils/redisUtils.js';

export const getProject = async (req, res) => {
  const { userId } = req;
  const { projectId } = req.params;

  const cacheKey = `projects:${projectId}:user:${userId}`;
  try {
    // Check cache
    const cachedProject = await getCache(cacheKey);
    if (cachedProject) {
      console.log("cache hit");
      return res.status(200).json(cachedProject);
    }

    // Fetch from DB
    const project = await Project.findByPk(projectId, {
      include: [{ 
        model: User,
        as: 'project_members', 
        attributes: ['id', 'username', 'email'] 
      }]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isAuthorized = project.project_head_id === userId || project.project_members.some(member => member.id === userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'You are not authorized to access tasks for this project' });
    }

    // Set cache
    await setCache(cacheKey, project);
    console.log("cache miss");

    return res.status(200).json(project);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching project' });
  }
}

export const getAllProjectTasks = async (req, res) => {
  const { userId } = req;
  const { projectId } = req.params;

  const cacheKey = `projects:${projectId}:user:${userId}:tasks`;
  try {
    // Check cache
    const cachedProjectTasks = await getCache(cacheKey);
    if (cachedProjectTasks) {
      console.log("cache hit");
      return res.status(200).json(cachedProjectTasks);
    }

    // Fetch from DB
    const project = await Project.findByPk(projectId, {
      include: [{ 
        model: User,
        as: 'project_members', 
        attributes: ['id', 'username', 'email'] 
      }]
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isAuthorized = project.project_head_id === userId || project.project_members.some(member => member.id === userId);
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

    // Set cache
    await setCache(cacheKey, tasks);
    console.log("cache miss");

    return res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching tasks' });
  }
}

export const getAllProjectMembers = async (req, res) => {
  const { userId } = req;
  const { projectId } = req.params;
  
  const cacheKey = `projects:${projectId}:user:${userId}:members`;
  try {
    // Get cache
    const cachedProjectMembers = await getCache(cacheKey);
    if (cachedProjectMembers) {
      console.log("cache hit");
      return res.status(200).json(cachedProjectMembers);
    }

    // Fetch from DB
    const project = await Project.findByPk(projectId, {
      include: [{
        model: User,
        as: 'project_members',
        attributes: ['id', 'username', 'email'],
        through: { attributes: [] },
      }],
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isAuthorized = project.project_head_id === userId || project.project_members.some(member => member.id === userId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'You are not authorized to access members for this project' });
    }

    // Set cache
    await setCache(cacheKey, project.project_members);
    console.log("cache miss");

    return res.status(200).json(project.project_members);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching tasks' });
  }
}

export const createProject = async (req, res) => {
  const { name, description } = req.body;
  const { userId } = req;

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

      // Invalidate cache
      await deleteCache(`users:${userId}:projects`);

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
    // Fetch from DB
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

    // Invalidate cache
    await deleteCacheByPattern(`projects:${projectId}:user:*`);

    const members = await project.getProject_members();
    for (const member of members) {
      await deleteCache(`users:${member.id}:projects`);
    }

    return res.status(200).json({
      message: "Project member added successfully",
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
    // Fetch from DB
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

    // Invalidate cache
    await deleteCacheByPattern(`projects:${projectId}:user:*`);

    const members = await project.getProject_members();
    for (const member of members) {
      await deleteCache(`users:${member.id}:projects`);
    }

    return res.status(200).json({ message: 'Project updated successfully', updatedProject });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error updating project' });
  }
}

export const deleteProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    // Fetch the project
    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: User,
          as: 'project_members',
          attributes: ['id'],
          through: {
            attributes: []
          }
        }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const members = project.project_members || [];

    await project.destroy();

    // Invalidate cache
    await deleteCacheByPattern(`projects:${projectId}:user:*`);

    for (const member of members) {
      await deleteCache(`users:${member.id}:projects`);
    }

    return res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting project' });
  }
};

export const removeProjectMember = async (req, res) => {
  const { projectId } = req.params;
  const { memberId } = req.params;

  try {
    // Fetch from DB
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

    // Invalidate cache
    await deleteCacheByPattern(`projects:${projectId}:user:*`);

    const members = await project.getProject_members();
    for (const member of members) {
      await deleteCache(`users:${member.id}:projects`);
    }

    return res.status(200).json({ message: 'Project member removed successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error removing project member' });
  }
}
