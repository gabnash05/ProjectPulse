import { User, Project, Task } from './index.js';

// Define associations here
Project.belongsTo(User, { foreignKey: 'project_head_id', as: 'project_head' });
Project.belongsToMany(User, { through: 'project_members', as: 'members' });
Project.hasMany(Task, { foreignKey: 'project_id', as: 'tasks' });
User.belongsToMany(Project, { through: 'project_members', as: 'projects' });
Task.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
Task.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

export { User, Project, Task };
