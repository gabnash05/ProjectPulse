import User from './Users.js';
import Project from './Projects.js';

// Define associations here
Project.belongsTo(User, { foreignKey: 'project_head_id', as: 'head_id' });
Project.belongsToMany(User, { through: 'project_members', as: 'members' });
User.belongsToMany(Project, { through: 'project_members', as: 'projects' });

export { User, Project };
