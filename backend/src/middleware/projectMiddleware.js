import User from "../models/Users.js";
import Project from "../models/Projects.js";

export const isProjectHead = async (req, res, next) => {
  const { userId } = req;
  const projectId = req.params.projectId;

  try {
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.head === userId) {
      return next();
    }

    return res.status(403).json({ message: 'You are not authorized to perform this action' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while verifying project head' });
  }
    
};